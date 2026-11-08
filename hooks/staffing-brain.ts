// Staffing brain: every worker gets a model AND an effort, with a one-line why.
// The Manager (the main session) decides per task; this module only applies the order:
//   1. The person's word wins: a model or effort named in their latest typed prompt.
//   2. Fable only when the person names it: any other Fable becomes Opus.
//   3. Otherwise the Manager's pick stands: the Agent call's, else the plan task's. Never lowered.
//   4. Nothing given: the plan task's tier fills it in, else Smart staffing's pick (`staffFor`).
// Model and effort are filled field by field: a call that names a model keeps it, and
// its effort comes from the next source that has one. Pure, so it is tested without the
// engine; register.tsx reads the prompt, the plan and `staffFor`, and wires it.

export type Family = 'haiku' | 'sonnet' | 'opus' | 'fable'
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'
export const EFFORTS: readonly Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']
const WORD: Record<Family, string> = { haiku: 'Haiku', sonnet: 'Sonnet', opus: 'Opus', fable: 'Fable' }

/** The store key of the switch (on unless the store holds false). */
export const BRAIN_KEY = 'staffingBrain'

/** The reason given when a Fable the person did not ask for becomes Opus. */
export const FABLE_WHY = 'Fable only when you ask for it'

/**
 * A plan tier's fill-in, used only when neither the person, the Agent call nor the plan
 * task names a model or effort. Fable is Opus here: the person's own "Fable" is rule 1.
 */
export const TIER_PICK: Record<string, { model: Family; effort: Effort }> = {
  fable: { model: 'opus', effort: 'high' },
  heavy: { model: 'opus', effort: 'high' },
  careful: { model: 'opus', effort: 'medium' },
  medium: { model: 'sonnet', effort: 'medium' },
  light: { model: 'haiku', effort: 'low' },
}

/** The family a model id or alias names; Mythos prices as Fable. null for an id with no family. */
export const familyOf = (id: string): Family | null => {
  const m = /fable|mythos|opus|sonnet|haiku/i.exec(id)
  const f = m?.[0]?.toLowerCase()
  return f === 'mythos' ? 'fable' : f === 'fable' || f === 'opus' || f === 'sonnet' || f === 'haiku' ? f : null
}

/** A known effort level, else undefined. */
export const effortOf = (v: unknown): Effort | undefined => (typeof v === 'string' && (EFFORTS as readonly string[]).includes(v.trim().toLowerCase()) ? (v.trim().toLowerCase() as Effort) : undefined)

// "no opus", "not Opus", "don't use opus", "without opus", "avoid opus", "instead of opus", "stop using opus".
const NEGATED = /(?:\bno|\bnot|n't|\bnever|\bwithout|\bavoid|\binstead of|\bexcept|\bstop|\bquit)(?:\s+(?:use|using|run|running|on|with|the|a|any))*\s*$/i
const negated = (before: string): boolean => NEGATED.test(before.slice(-40))

/**
 * Whether the person's own prompt asks for Fable: it names Fable (or Mythos) as a word,
 * or a Fable model id such as `claude-fable-5-1` or `fable-5`. "fables" is no ask, and
 * neither is a negated name ("don't use fable", "no fable").
 */
export const asksForFable = (prompt: string): boolean => {
  const re = /(?:^|[^a-z0-9])(fable|mythos)(?![a-z])/gi
  for (let m = re.exec(prompt); m; m = re.exec(prompt)) {
    if (!negated(prompt.slice(0, m.index + m[0].length - (m[1] ?? '').length))) return true
  }
  return false
}

/**
 * The one model family the person's prompt names: "use opus", "on Sonnet", "claude-haiku-5-5".
 * A poem ("a haiku", "sonnets"), "magnum opus" and a negated name ("no opus") are no ask;
 * two different families named is no single ask either, so the Manager's pick stands.
 */
export const askedModel = (prompt: string): Family | null => {
  const found = new Set<Family>()
  const re = /(?:^|[^a-z0-9])(fable|mythos|opus|sonnet|haiku)(?![a-z])/gi
  for (let m = re.exec(prompt); m; m = re.exec(prompt)) {
    const word = (m[1] ?? '').toLowerCase()
    const at = m.index + m[0].length - word.length
    const before = prompt.slice(0, at)
    if (negated(before)) continue
    if ((word === 'haiku' || word === 'sonnet') && /\b(?:a|an|the|this|that|my|your|write|wrote|compose|poem)\s+$/i.test(before) && !/-\d/.test(prompt.slice(at + word.length, at + word.length + 3))) continue
    if (word === 'opus' && /\bmagnum\s+$/i.test(before)) continue
    const f = familyOf(word)
    if (f) found.add(f)
  }
  return found.size === 1 ? ([...found][0] ?? null) : null
}

// A level as people say it, next to the word "effort".
const LEVEL = '(x-?high|extra[ -]high|(?:very|really|super|extremely) high(?:er)?|max(?:imum)?|highest|high|medium|med|moderate|low(?:est)?|min(?:imum)?)'
const levelOf = (word: string): Effort => {
  const w = word.toLowerCase().replace(/[ -]/g, '')
  if (w === 'xhigh' || w === 'extrahigh' || /^(?:very|really|super|extremely)high(?:er)?$/.test(w)) return 'xhigh'
  if (w.startsWith('max') || w === 'highest') return 'max'
  if (w === 'high') return 'high'
  if (w.startsWith('low') || w.startsWith('min')) return 'low'
  return 'medium'
}

/**
 * The one effort level the person's prompt names: "max effort", "highest effort",
 * "effort: high", "--effort low", "xhigh effort". Only next to the word "effort", so
 * "high quality" or "low risk" is no ask. Two different levels named is none.
 */
export const askedEffort = (prompt: string): Effort | null => {
  const found = new Set<Effort>()
  const before = new RegExp(`(?:^|[^a-z])${LEVEL}[ -]effort\\b`, 'gi')
  const after = new RegExp(`\\beffort(?:\\s+level)?\\s*(?:[:=]|\\bto\\b|\\bat\\b|\\bof\\b)?\\s*${LEVEL}(?![a-z])`, 'gi')
  for (const re of [before, after]) {
    for (let m = re.exec(prompt); m; m = re.exec(prompt)) {
      const head = prompt.slice(0, m.index + (m[0].length - m[0].trimStart().length))
      if (negated(head)) continue
      const level = levelOf(m[1] ?? '')
      // "a low effort fix", "that was low effort": a judgment of work, not an ask.
      if (re === before && level === 'low' && /\b(?:a|an|such|so|too|was|were)\s*$/i.test(prompt.slice(0, m.index + 1))) continue
      found.add(level)
    }
  }
  return found.size === 1 ? ([...found][0] ?? null) : null
}

export type PlanPick = { tier?: string; model?: string; effort?: string; why?: string }

export type BrainInput = {
  /** The person's latest typed prompt. */
  prompt: string
  /** The Agent call's `model` (or the model a mc-* worker's own definition runs on). */
  model?: string
  /** The Agent call's `effort`. */
  effort?: string
  /** The plan task this call matches, if any. */
  task?: PlanPick
  /** Smart staffing's read of the job (`staffFor`), the last fill-in. */
  staff?: { model?: string; effort?: string; why: string } | null
}

export type Source = 'you' | 'manager' | 'plan' | 'tier' | 'staffing'

export type BrainPick = {
  /** The model to run on; undefined leaves it to the agent's definition or the session. */
  model?: string
  effort?: Effort
  /** One line: why this model and effort. */
  why: string
  /** Where the model came from (or the effort, when no model was picked). */
  source?: Source
  /** True when a Fable the person did not ask for became Opus. */
  isFableCut: boolean
}

const cap = (s: string): string => (s ? `${s[0]?.toUpperCase()}${s.slice(1)}` : s)

/** The brain's pick for one worker: the order above, field by field. */
export const brainPick = (i: BrainInput): BrainPick => {
  const you = { model: askedModel(i.prompt) ?? undefined, effort: askedEffort(i.prompt) ?? undefined }
  const tier = i.task?.tier ? TIER_PICK[i.task.tier] : undefined
  const layers: [Source, string | undefined, Effort | undefined][] = [
    ['you', you.model, you.effort],
    ['manager', i.model?.trim() || undefined, effortOf(i.effort)],
    ['plan', i.task?.model?.trim() || undefined, effortOf(i.task?.effort)],
    ['tier', tier?.model, tier?.effort],
    ['staffing', i.staff?.model, effortOf(i.staff?.effort)],
  ]
  const modelAt = layers.find(l => l[1])
  const effortAt = layers.find(l => l[2])
  let model = modelAt?.[1]
  const effort = effortAt?.[2]
  const isFableCut = Boolean(model && familyOf(model) === 'fable' && !asksForFable(i.prompt))
  if (isFableCut) model = 'opus'
  const source = modelAt?.[0] ?? effortAt?.[0]
  const why = isFableCut
    ? FABLE_WHY
    : modelAt?.[0] === 'you' || effortAt?.[0] === 'you'
      ? `you asked for ${[modelAt?.[0] === 'you' && model ? WORD[familyOf(model) ?? 'opus'] : '', effortAt?.[0] === 'you' && effort ? `${effort} effort` : ''].filter(Boolean).join(' · ')}`
      : source === 'manager' || source === 'plan'
        ? i.task?.why?.trim() || "Manager's call"
        : source === 'tier'
          ? `${i.task?.tier} task in the plan`
          : source === 'staffing'
            ? (i.staff?.why ?? 'by the job')
            : ''
  return { model, effort, why, source, isFableCut }
}

/** The toast: what the worker runs on and why. */
export const brainNote = (description: string, p: BrainPick): string => {
  const model = p.model ? (familyOf(p.model) ? WORD[familyOf(p.model) as Family] : p.model) : 'session model'
  return `🧠 "${description}": ${model}${p.effort ? ` · ${p.effort}` : ''}${p.why ? ` (${p.why})` : ''}`
}

/** The text the main session reads before it delegates. Kept short: it rides every request. */
export const BRAIN_SECTION = `# Staffing brain (Mission Control)
Before you delegate, decide each worker's model and effort; do not just take the default. For each task weigh:
- workload: how big it is and how long it will take
- difficulty and ambiguity
- risk and blast radius if it goes wrong
- the quality bar ("perfect", "exact", presentation-grade work goes higher)
- what the user asked for
Then pick a model (haiku, sonnet or opus) and an effort (low, medium, high, xhigh or max), with a one-line why.
Pass them on the Agent call (\`model\`, \`effort\`) and on the task in the progress plan (\`model\`, \`effort\`, \`why\`).
Use Fable only when the user names it. A model or effort the user names always wins over your pick.`

/** What `/tokens brain` (and the old `/tokens guardrails`) answers. */
export const brainSaid = (isOn: boolean): string =>
  isOn
    ? 'Staffing brain on: the Manager picks each worker\'s model and effort, with a one-line why. Your own words win: name a model (opus, sonnet, haiku, fable) or an effort ("max effort") in your prompt. Fable only when you ask for it. No caps by role: the Manager\'s pick is never lowered. Nothing picked: the plan\'s tier fills it in, else Smart staffing\'s read of the job.'
    : 'Staffing brain off: Agent calls go through as the Manager wrote them.'

/**
 * The model a saving is counted against. An alias ("opus", "fable") stands for the
 * family's latest release, so the baseline is priced as that model, not an older one.
 */
export const baselineModel = (model: string, latest: Record<string, string>): string => latest[model.trim().toLowerCase()] ?? model
