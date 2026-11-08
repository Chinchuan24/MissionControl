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
 * What each worker tier runs on: the one map the pane, the mc-* workers and the brain read.
 * The brain fills a plan task in from it only when neither the person, the Agent call nor
 * the plan task names a model or effort; a Fable tier becomes Opus unless the person names Fable.
 */
export const TIER_PICK: Record<string, { model: Family; effort: Effort }> = {
  fable: { model: 'fable', effort: 'high' },
  heavy: { model: 'opus', effort: 'xhigh' },
  careful: { model: 'opus', effort: 'high' },
  medium: { model: 'opus', effort: 'medium' },
  light: { model: 'opus', effort: 'low' },
}

/** A family as the pane writes it: "Opus". */
export const familyWord = (f: Family): string => WORD[f]

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

// An ask, right before the model's name: "use", "run (it) on", "switch (them) to", "put it on",
// "go with", "on", "--model", "model:". The name must sit next to one to force the workers.
const OBJ = '(?:\\s+(?:it|them|that|this|these|those|everything|all|everyone|the\\s+\\w+|each\\s+\\w+|every\\s+\\w+))?'
const ASK_BEFORE = new RegExp(
  `(?:\\b(?:use|using|uses|run|running|runs|rerun|re-run|try|pick|choose|prefer|assign|want|need|give${OBJ}|redo${OBJ}\\s+(?:on|with|in)|(?:switch|move|change|swap|bump|upgrade|downgrade|put|set|send|staff|do)${OBJ}\\s+(?:to|on|onto|with|in)|with|on|onto|via)|--model|\\bmodel\\s*[:=]?)\\s*(?:the\\s+)?$`,
  'i',
)
// "it ran on haiku", "the trouble with opus": said of what happened, not an ask.
const TOLD = /\b(?:(?:ran|was|were|is|are|been|got|stuck|still|already|currently)\s+(?:on|with)|(?:problem|issue|trouble|thing|wrong|matter)\s+with)\s*(?:the\s+)?$/i
// A question about what happened: "why did the reviewer run on Haiku?" "is opus slower?"
const QUESTION = /^\s*(?:why|how|what|which|who|when|where|did|does|do|was|were|is|are|has|have|had)\b[^]*\?\s*$/i
// A complaint: "Haiku for this was a mistake". Only checked for an ask with no verb ("<model> for …").
const COMPLAINT = /\b(?:dumb|stupid|bad|wrong|broke|broken|failed|fails|slow|slower|mistake|terrible|awful|useless|worse|worst|sucks?|garbage)\b/i

/**
 * The one model family the person's prompt asks for: "use opus", "run it on Sonnet",
 * "switch them to haiku", "go with claude-haiku-5-5", "fable for the planner", "opus, max effort".
 * A name with no ask next to it is no ask: a question ("why did X run on Haiku?"), a complaint
 * ("Haiku is too dumb"), a poem ("a haiku"), "magnum opus" and a negated name ("no opus").
 * Two different families asked for is no single ask either, so the Manager's pick stands.
 */
export const askedModel = (prompt: string): Family | null => {
  const found = new Set<Family>()
  const re = /(?:^|[^a-z0-9])(fable|mythos|opus|sonnet|haiku)(?![a-z])/gi
  for (let m = re.exec(prompt); m; m = re.exec(prompt)) {
    const word = (m[1] ?? '').toLowerCase()
    const at = m.index + m[0].length - word.length
    // The text before the whole token, so "claude-haiku-5-5" reads as one name.
    const before = prompt.slice(0, at).replace(/[\w.:/-]*$/, '')
    const tokenEnd = at + word.length + (/^[\w.:/-]*/.exec(prompt.slice(at + word.length))?.[0].length ?? 0)
    const after = prompt.slice(tokenEnd)
    if (negated(before)) continue
    if ((word === 'haiku' || word === 'sonnet') && /\b(?:a|an|the|this|that|my|your|write|wrote|compose|poem)\s+$/i.test(before) && !/-\d/.test(prompt.slice(at + word.length, at + word.length + 3))) continue
    if (word === 'opus' && /\bmagnum\s+$/i.test(before)) continue
    const from = Math.max(prompt.lastIndexOf('.', at), prompt.lastIndexOf('!', at), prompt.lastIndexOf('?', at), prompt.lastIndexOf('\n', at)) + 1
    const stop = after.search(/[.!?\n]/)
    const sentence = prompt.slice(from, stop < 0 ? prompt.length : tokenEnd + stop + 1)
    if (QUESTION.test(sentence)) continue
    const isVerbAsk = ASK_BEFORE.test(before) && !TOLD.test(before)
    const isBare = /^\s*$/.test(before.slice(from)) && /^\s*[.!]?\s*$/.test(after) // the prompt is just "opus"
    const isDirective = !COMPLAINT.test(sentence) && new RegExp(`^(?:\\s+(?:for|please|pls|only|everywhere|across|throughout)\\b|\\s+(?:is|will be|should be)\\s+(?:enough|fine|ok|okay|plenty)\\b|\\s*[,:]?\\s*${LEVEL}[ -]effort\\b)`, 'i').test(after)
    if (!isVerbAsk && !isBare && !isDirective) continue
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
  // Smart staffing's effort goes with its model: taken only when its model is (or no model is picked at all).
  const effortAt = layers.find(l => l[2] && (l[0] !== 'staffing' || !modelAt || modelAt[0] === 'staffing'))
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
The user has explicitly asked you to set \`model\` and \`effort\` on every Agent call, so the Agent tool's "only when the user asks" note is met.
Use Fable only when the user names it. A model or effort the user names always wins over your pick.`

/** What `/tokens brain` (and the old `/tokens guardrails`) answers. */
export const brainSaid = (isOn: boolean): string =>
  isOn
    ? 'Staffing brain on: the Manager picks each worker\'s model and effort, with a one-line why. Your own words win: name a model (opus, sonnet, haiku, fable) or an effort ("max effort") in your prompt. Fable only when you ask for it. No caps by role: the Manager\'s pick is never lowered. Nothing picked: the plan\'s tier fills it in, else (with Smart staffing on) its read of the job; with neither, the agent runs on its own model and effort.'
    : 'Staffing brain off: Agent calls go through as the Manager wrote them.'

/**
 * The model a saving is counted against. An alias ("opus", "fable") stands for the
 * family's latest release, so the baseline is priced as that model, not an older one.
 */
export const baselineModel = (model: string, latest: Record<string, string>): string => latest[model.trim().toLowerCase()] ?? model
