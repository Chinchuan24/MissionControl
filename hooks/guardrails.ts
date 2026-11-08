// Model guardrails: a cap on the model an Agent call asks for. Smart staffing only picks
// a model for an agent launched with none; the guardrails apply when the call names one.
// Only ever downward: a model is never raised. Pure, so it can be tested without the
// engine; register.tsx reads the person's prompt, the plan and `staffFor`, and wires it.

export type Family = 'haiku' | 'sonnet' | 'opus' | 'fable'
const RANK: Record<Family, number> = { haiku: 1, sonnet: 2, opus: 3, fable: 4 }
const WORD: Record<Family, string> = { haiku: 'Haiku', sonnet: 'Sonnet', opus: 'Opus', fable: 'Fable' }

/** The store key of the switch (on unless the store holds false). */
export const GUARDRAILS_KEY = 'modelGuardrails'

/** The family a model id or alias names; Mythos prices as Fable. null for an id with no family. */
export const familyOf = (id: string): Family | null => {
  const m = /fable|mythos|opus|sonnet|haiku/i.exec(id)
  const f = m?.[0]?.toLowerCase()
  return f === 'mythos' ? 'fable' : f === 'fable' || f === 'opus' || f === 'sonnet' || f === 'haiku' ? f : null
}

/**
 * Whether the person's own prompt asks for Fable: it names Fable (or Mythos) as a word,
 * or a Fable model id such as `claude-fable-5-1` or `fable-5`. "fables" is no ask.
 */
export const asksForFable = (prompt: string): boolean => /(?:^|[^a-z0-9])(?:fable|mythos)(?![a-z])/i.test(prompt)

// 'review' (checkers, reviewers) is never capped below Sonnet; 'read' (researchers, explorers) may go to Haiku.
export type GuardRole = 'review' | 'read' | 'engineer' | 'other'

const REVIEW_ROLE = /\b(?:check|checker|checkers|review|reviewer|reviewers|code-reviewer)\b/
const READ_ROLE = /\b(?:research|researcher|researchers|explore|explorer|explorers)\b/
const ENGINEER_ROLE = /\b(?:engineer|engineers|developer|developers|implementer|coder)\b/
const NAMED = /^([A-Za-z][A-Za-z -]{1,23}):\s+\S/

/**
 * The role an agent is staffed as. A task named "<Role>: <piece>" is that role; else the
 * agent's type ("Explore", "superpowers:code-reviewer"); else role words in its description.
 */
export const guardRole = (type: string, description: string): GuardRole => {
  const named = NAMED.exec(description)?.[1]?.toLowerCase() ?? ''
  const bare = (type.includes(':') ? (type.split(':').at(-1) ?? type) : type).toLowerCase()
  const is = (text: string): GuardRole | null => (REVIEW_ROLE.test(text) ? 'review' : READ_ROLE.test(text) ? 'read' : ENGINEER_ROLE.test(text) ? 'engineer' : null)
  return (named && is(named)) || is(bare) || (named ? null : is(description.toLowerCase())) || 'other'
}

export type GuardInput = {
  /** The model the Agent call asked for. */
  model: string
  type: string
  description: string
  /** What `staffFor` picks for this job: 'haiku' marks light reading work (not for reviewers or checkers). */
  staffModel?: string
  /** The person's latest prompt names Fable. */
  askedFable: boolean
  /** The plan marks the job heavy (tier heavy or fable), or it is Ultra. */
  isHeavy: boolean
}

export type Guard = { model: Exclude<Family, 'fable'>; from: Family; why: string }

/** The model the call is lowered to, or null when it stands (also for an id with no family). */
export const guardModel = (i: GuardInput): Guard | null => {
  const from = familyOf(i.model)
  if (!from) return null
  // The person asked for Fable by name: their word stands, whatever the role.
  if (from === 'fable' && i.askedFable) return null
  let cap: Family = from
  let why = ''
  if (from === 'fable') {
    cap = 'opus'
    why = 'you did not ask for Fable'
  }
  const role = guardRole(i.type, i.description)
  if (role === 'review' || role === 'read') {
    // Checking and reviewing keep Sonnet as the floor, whatever staffFor says; only reading work may go to Haiku.
    const to: Family = role === 'read' && i.staffModel === 'haiku' ? 'haiku' : 'sonnet'
    if (RANK[to] < RANK[cap]) {
      cap = to
      why = to === 'haiku' ? 'light reading work' : 'checking and research need no more'
    }
  } else if (role === 'engineer' && !i.isHeavy && RANK.sonnet < RANK[cap]) {
    cap = 'sonnet'
    why = 'engineer, not marked heavy in the plan'
  }
  if (RANK[cap] >= RANK[from] || cap === 'fable') return null
  return { model: cap, from, why }
}

/** The toast: what changed and why, in the staffing note's voice. */
export const guardNote = (description: string, g: Guard): string => `Guardrail: "${description}" ${WORD[g.from]} → ${WORD[g.model]} (${g.why})`

/**
 * The model a saving is counted against. An alias ("opus", "fable") stands for the
 * family's latest release, so the baseline is priced as that model, not an older one.
 */
export const baselineModel = (model: string, latest: Record<string, string>): string => latest[model.trim().toLowerCase()] ?? model
