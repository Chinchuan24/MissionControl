import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { BRAIN_SECTION, FABLE_WHY, TIER_PICK, askedEffort, askedModel, asksForFable, baselineModel, brainNote, brainPick } from './staffing-brain'
import type { BrainInput } from './staffing-brain'

// Staffing brain: the Manager picks each worker's model and effort with a why; the
// person's word wins; Fable only when asked; never lowered by role. The pure rules
// first, then the whole path (the Agent call, the spawn, the effort, the pane, /tokens).

const pick = (over: Partial<BrainInput>) => brainPick({ prompt: '', ...over })

// ---- reading the person's prompt ------------------------------------------------

test('brain: a model named in the prompt is read, a poem or a "no" is not', () => {
  expect(askedModel('use opus for this')).toBe('opus')
  expect(askedModel('Run the workers on Sonnet')).toBe('sonnet')
  expect(askedModel('go with claude-haiku-5-5')).toBe('haiku')
  expect(askedModel('mythos please')).toBe('fable')
  expect(askedModel('fable for the planner')).toBe('fable')
  expect(askedModel('write a haiku about crabs')).toBeNull()
  expect(askedModel('compose a sonnet')).toBeNull()
  expect(askedModel('this is my magnum opus')).toBeNull()
  expect(askedModel("don't use opus")).toBeNull()
  expect(askedModel('no opus this time')).toBeNull()
  expect(askedModel('not sonnet, use opus')).toBe('opus')
  // Two families named is no single ask: the Manager splits it per worker.
  expect(askedModel('opus for the engineer, haiku for the researcher')).toBeNull()
  expect(askedModel('read the fables folder')).toBeNull()
  expect(askedModel('')).toBeNull()
})

test('brain: an effort is read only next to the word "effort"', () => {
  expect(askedEffort('max effort on this one')).toBe('max')
  expect(askedEffort('maximum effort')).toBe('max')
  expect(askedEffort('highest effort please')).toBe('max')
  expect(askedEffort('Max-effort review')).toBe('max')
  expect(askedEffort('xhigh effort')).toBe('xhigh')
  expect(askedEffort('extra high effort')).toBe('xhigh')
  expect(askedEffort('high effort')).toBe('high')
  expect(askedEffort('effort: high')).toBe('high')
  expect(askedEffort('--effort low')).toBe('low')
  expect(askedEffort('set effort to medium')).toBe('medium')
  expect(askedEffort('lowest effort is fine')).toBe('low')
  expect(askedEffort('effort level max')).toBe('max')
  // No word "effort", no ask.
  expect(askedEffort('high quality, low risk')).toBeNull()
  expect(askedEffort('do your best')).toBeNull()
  expect(askedEffort('not max effort')).toBeNull()
  // Two levels named: none stands.
  expect(askedEffort('low effort for docs, max effort for the parser')).toBeNull()
})

test('brain: Fable is asked for by name or a Fable model id only', () => {
  expect(asksForFable('use Fable for the planner')).toBe(true)
  expect(asksForFable('run it on claude-fable-5-1 please')).toBe(true)
  expect(asksForFable('FABLE')).toBe(true)
  expect(asksForFable('read the fables folder')).toBe(false)
  expect(asksForFable('use opus')).toBe(false)
})

// ---- the order ------------------------------------------------------------------

test('brain precedence: the person, then the call, then the plan task, then the tier, then staffing', () => {
  const task = { tier: 'light', model: 'sonnet', effort: 'medium', why: 'routine edit' }
  const staff = { model: 'haiku', effort: 'low', why: 'reading' }
  // The person's words win over everything.
  expect(pick({ prompt: 'use opus, max effort', model: 'haiku', effort: 'low', task, staff })).toMatchObject({ model: 'opus', effort: 'max', source: 'you', why: 'you asked for Opus · max effort' })
  // The person may lower it too: their word wins.
  expect(pick({ prompt: 'haiku is enough', model: 'opus', effort: 'high' })).toMatchObject({ model: 'haiku', effort: 'high', why: 'you asked for Haiku' })
  // The call next.
  expect(pick({ model: 'opus', effort: 'high', task, staff })).toMatchObject({ model: 'opus', effort: 'high', source: 'manager', why: 'routine edit' })
  // The plan task next, with its own why.
  expect(pick({ task, staff })).toMatchObject({ model: 'sonnet', effort: 'medium', source: 'plan', why: 'routine edit' })
  // The tier fills in.
  expect(pick({ task: { tier: 'heavy' }, staff })).toMatchObject({ model: 'opus', effort: 'high', source: 'tier', why: 'heavy task in the plan' })
  // Smart staffing's read last.
  expect(pick({ staff })).toMatchObject({ model: 'haiku', effort: 'low', source: 'staffing', why: 'reading' })
  // Nothing at all: nothing picked.
  expect(pick({})).toMatchObject({ model: undefined, effort: undefined, why: '' })
})

test('brain precedence: model and effort fill in field by field', () => {
  // The call names a model only: its effort comes from the plan task.
  expect(pick({ model: 'opus', task: { tier: 'medium', effort: 'xhigh' } })).toMatchObject({ model: 'opus', effort: 'xhigh' })
  // The person names an effort only: the call's model stands.
  expect(pick({ prompt: 'max effort', model: 'sonnet' })).toMatchObject({ model: 'sonnet', effort: 'max', why: 'you asked for max effort' })
  // A call with no effort and no plan: Smart staffing's effort fills it.
  expect(pick({ model: 'opus', staff: { why: 'a hard call', effort: 'high' } })).toMatchObject({ model: 'opus', effort: 'high' })
  // Without a why from the plan, the call's pick says whose it was.
  expect(pick({ model: 'sonnet', effort: 'low' }).why).toBe("Manager's call")
})

test('brain: the tier map', () => {
  expect(TIER_PICK).toEqual({
    fable: { model: 'opus', effort: 'high' },
    heavy: { model: 'opus', effort: 'high' },
    careful: { model: 'opus', effort: 'medium' },
    medium: { model: 'sonnet', effort: 'medium' },
    light: { model: 'haiku', effort: 'low' },
  })
  expect(pick({ task: { tier: 'fable' } })).toMatchObject({ model: 'opus', effort: 'high', isFableCut: false })
  expect(pick({ task: { tier: 'careful' } })).toMatchObject({ model: 'opus', effort: 'medium' })
  expect(pick({ task: { tier: 'light' } })).toMatchObject({ model: 'haiku', effort: 'low' })
  // An unknown tier fills nothing.
  expect(pick({ task: { tier: '' } }).model).toBeUndefined()
})

test('brain: Fable only when the person asks for it', () => {
  for (const over of [{ model: 'fable' }, { model: 'claude-fable-5-1' }, { task: { model: 'fable' } }]) {
    expect(pick(over)).toMatchObject({ model: 'opus', why: FABLE_WHY, isFableCut: true })
  }
  // A Fable worker type stands as its call's model: also Opus.
  expect(pick({ model: 'fable', effort: 'high' })).toMatchObject({ model: 'opus', effort: 'high', why: FABLE_WHY })
  // Asked by name: it stands, from the person or from the call.
  expect(pick({ prompt: 'use fable for this', model: 'opus' })).toMatchObject({ model: 'fable', isFableCut: false })
  expect(pick({ prompt: 'fable for the planner, opus for the rest', model: 'fable' })).toMatchObject({ model: 'fable', isFableCut: false })
})

test('brain: no role caps, and never lowered', () => {
  for (const model of ['opus', 'sonnet', 'haiku', 'claude-opus-5-5']) {
    for (const effort of ['low', 'high', 'max']) {
      expect(pick({ model, effort, staff: { model: 'haiku', effort: 'low', why: 'reading' } })).toMatchObject({ model, effort })
    }
  }
  // An id with no family is left alone.
  expect(pick({ model: 'arn:aws:bedrock:us-east-1:1:application-inference-profile/x' }).model).toBe('arn:aws:bedrock:us-east-1:1:application-inference-profile/x')
})

test('brain: the note, the section and the baseline', () => {
  expect(brainNote('wire the parser', pick({ model: 'fable', effort: 'high' }))).toBe('🧠 "wire the parser": Opus · high (Fable only when you ask for it)')
  expect(brainNote('look around', pick({ staff: { effort: 'high', why: 'a hard call' } }))).toBe('🧠 "look around": session model · high (a hard call)')
  expect(BRAIN_SECTION).toContain('# Staffing brain (Mission Control)')
  expect(BRAIN_SECTION).toContain('Fable only when the user names it')
  expect(BRAIN_SECTION).toContain('always wins')
  expect(BRAIN_SECTION.split('\n').length).toBeLessThanOrEqual(12)
  expect(baselineModel('opus', { opus: 'claude-opus-5-5' })).toBe('claude-opus-5-5')
  expect(baselineModel('claude-opus-4-8', { opus: 'claude-opus-5-5' })).toBe('claude-opus-4-8')
})

// ---- the whole path ---------------------------------------------------------------

type Spawned = { model?: string; description: string }
type Usage = { model: string; input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number }
const ONE_M: Usage = { model: 'claude-opus-5-5', input_tokens: 1e6, output_tokens: 1e6, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

let calls: Record<string, unknown>[] = []
const base = (on: On, usage: Usage = ONE_M, store: Record<string, unknown> = {}) => {
  calls = []
  const seen = { spawns: [] as Spawned[], calls, toasts: [] as string[], efforts: [] as unknown[], tools: [] as { name: string; inputSchema?: unknown }[] }
  mock.clock(on, { now: Date.parse('2026-10-20T10:00:00Z') })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on, store)
  on('fs.exists', async () => ({ value: false }) as never)
  on('settings.read', async () => ({ value: {} }) as never)
  on('tool.register', async (_$, e) => {
    seen.tools.push(e as never)
    return { value: undefined } as never
  })
  on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
  on('ui.panes', async () => ({ value: [] }) as never)
  on('ui.toast', async (_$, e) => {
    seen.toasts.push(String((e as { text?: string }).text ?? (e as { message?: string }).message ?? ''))
    return { value: undefined } as never
  })
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: 100_000 }, rateLimits: [] } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  on('prompt.submit', async (_$, e) => ({ text: (e as { text: string }).text }) as never)
  on('prompt.compose', async () => ({ sections: [] }) as never)
  on('turn.complete', () => ({ text: '' }) as never)
  // The Agent tool as core takes it: the input it got (the spawn follows, below).
  on('tool.call', async (_$, e) => {
    const ev = e as unknown as Record<string, unknown>
    if (ev.tool === 'Agent') seen.calls.push(ev)
    return { result: 'ok' } as never
  })
  let n = 0
  on('agent.spawn', async (_$, e) => {
    const ev = e as Spawned
    seen.spawns.push({ model: ev.model, description: ev.description })
    return { model: ev.model ?? 'claude-opus-5-5', agentId: `a${++n}` } as never
  })
  on('turn.step', async function* (_$, e) {
    seen.efforts.push((e as { effort?: unknown }).effort)
    return { turnId: 'turn', index: 0, answer: '', toolUses: [], stopReason: 'end_turn', usage } as never
  })
  return seen
}

const start = ($: Engine) => $.session.start({ source: 'startup', cwd: '/repo', surface: 'terminal', isInteractive: true } as never)
const run = async ($: Engine, command: string, args: string) => String(((await $.command.run({ command, args } as never)) as { text?: string }).text ?? '')
const say = (prompt: string, $: Engine) => $.prompt.submit({ text: prompt, cursor: 0 } as never)
let callN = 0
// The Agent tool called, then its spawn as core raises it: same tool_use_id, the model the call ended with.
const agentCall = async ($: Engine, description: string, extra: { model?: string; effort?: string; subagent_type?: string } = {}) => {
  const id = `tu-${++callN}`
  await $.tool.call({ tool: 'Agent', tool_use_id: id, description, prompt: 'p', ...extra } as never)
  const got = calls.at(-1) as { model?: string } | undefined
  return $.agent.spawn({ tool_use_id: id, prompt: 'p', description, subagentType: extra.subagent_type ?? 'general-purpose', model: got?.model, provider: 'engine', parentModel: 'claude-opus-5-5', background: false, fork: false } as never)
}
const spawn = ($: Engine, description: string, model?: string, subagentType = 'general-purpose') =>
  $.agent.spawn({ tool_use_id: `t-${description}-${model}`, prompt: 'p', description, subagentType, model, provider: 'engine', parentModel: 'claude-opus-5-5', background: false, fork: false } as never)
const step = async ($: Engine, agentId: string, effort: string = 'high') => {
  const stream = ($.turn.step as (e: unknown) => AsyncIterable<unknown>)({ turnId: 'turn', index: 0, model: 'claude-opus-5-5', messageCount: 1, agentId, effort })
  for await (const _ of stream) void _
}
const PROGRESS = 'mcp__crab-progress__progress'
const plan = ($: Engine, tasks: { title: string; tier: string; model?: string; effort?: string; why?: string }[]) =>
  $.tool.call({ tool: PROGRESS, title: 'Ship it', phase: 'delegate', total: tasks.length, tasks } as never)
const sections = async ($: Engine) =>
  ((await $.prompt.compose({ model: 'claude-opus-5-5', promptModel: 'claude-opus-5-5', surfaces: [], tools: ['Agent', 'Read'], outputStyle: null, traits: [] } as never)) as unknown as { sections: { id: string; text: string }[] }).sections
const paneText = async ($: Engine) => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'terminal', component: 'Pane', requestId: 'crab-agents', props: { title: '', isFocused: false, bodyColumns: 140, placement: 'dock', scroll: { offset: 0, bodyRows: 80 }, view: {} } } as never)
  const all = (await ui.findAll({ type: 'Text' })).map(t => String((t as { text?: string }).text ?? ''))
  await ui.unmount()
  return all.join('\n')
}

test('brain end to end: the Agent call keeps the Manager\'s model and effort, and the effort rides each request', async ($, on) => {
  const seen = base(on)
  await start($)
  await say('tidy up the parser', $)
  await agentCall($, 'Reviewer: the diff', { model: 'opus', effort: 'xhigh' })
  // No role cap: a reviewer on Opus stays on Opus.
  expect(seen.calls.at(-1)).toMatchObject({ model: 'opus', effort: 'xhigh' })
  expect(seen.spawns.at(-1)?.model).toBe('opus')
  await step($, 'a1', 'high')
  expect(seen.efforts.at(-1)).toBe('xhigh')
  // Nothing changed, so no toast.
  expect(seen.toasts.some(t => t.startsWith('🧠'))).toBe(false)
})

test('brain end to end: the person\'s model and effort win over the Manager and the plan', async ($, on) => {
  const seen = base(on)
  await start($)
  await plan($, [{ title: 'Engineer: wire the parser', tier: 'light', model: 'haiku', effort: 'low', why: 'small edit' }])
  await say('do it with sonnet, max effort', $)
  await agentCall($, 'Engineer: wire the parser', { model: 'opus', effort: 'medium' })
  expect(seen.calls.at(-1)).toMatchObject({ model: 'sonnet', effort: 'max' })
  expect(seen.spawns.at(-1)?.model).toBe('sonnet')
  await step($, 'a1', 'medium')
  expect(seen.efforts.at(-1)).toBe('max')
  expect(seen.toasts.at(-1)).toBe('🧠 "Engineer: wire the parser": Sonnet · max (you asked for Sonnet · max effort)')
  // The next prompt that names nothing takes the ask back: the Manager's pick stands.
  await say('now the docs', $)
  await agentCall($, 'Writer: the docs', { model: 'opus', effort: 'low' })
  expect(seen.calls.at(-1)).toMatchObject({ model: 'opus', effort: 'low' })
})

test('brain end to end: Fable becomes Opus unless the prompt names it', async ($, on) => {
  const seen = base(on)
  await start($)
  await say('plan the work', $)
  await agentCall($, 'Planner: map the work', { model: 'fable', effort: 'high' })
  expect(seen.calls.at(-1)).toMatchObject({ model: 'opus', effort: 'high' })
  expect(seen.toasts.at(-1)).toBe('🧠 "Planner: map the work": Opus · high (Fable only when you ask for it)')
  // A mc-fable worker runs Fable by its definition: Opus too.
  await agentCall($, 'Engineer: the core', { subagent_type: 'mc-fable' })
  expect(seen.spawns.at(-1)?.model).toBe('opus')
  await say('this one is hard: use fable', $)
  await agentCall($, 'Planner: the hard part', { model: 'fable' })
  expect(seen.spawns.at(-1)?.model).toBe('fable')
  // A mc-* worker otherwise keeps its own definition: no model is set on it.
  await say('next', $)
  await agentCall($, 'Engineer: the rest', { subagent_type: 'mc-heavy' })
  expect(seen.spawns.at(-1)?.model).toBeUndefined()
})

test('brain end to end: nothing given, the plan task fills it in, then its tier, then Smart staffing', async ($, on) => {
  const seen = base(on)
  await start($)
  await plan($, [
    { title: 'Engineer: the picked part', tier: 'heavy', model: 'sonnet', effort: 'high', why: 'clear spec, many files' },
    { title: 'Engineer: the heavy part', tier: 'heavy' },
    { title: 'Engineer: the light part', tier: 'light' },
  ])
  await agentCall($, 'Engineer: the picked part')
  expect(seen.calls.at(-1)).toMatchObject({ model: 'sonnet', effort: 'high' })
  await agentCall($, 'Engineer: the heavy part')
  expect(seen.calls.at(-1)).toMatchObject({ model: 'opus', effort: 'high' })
  await agentCall($, 'Engineer: the light part')
  expect(seen.calls.at(-1)).toMatchObject({ model: 'haiku', effort: 'low' })
  // Off the plan: Smart staffing's read of the job, with Smart staffing itself off.
  await agentCall($, 'the layout', { subagent_type: 'Explore' })
  expect(seen.calls.at(-1)).toMatchObject({ model: 'haiku', effort: 'low' })
  // The pane shows each worker's model · effort and the why.
  await step($, 'a1', 'medium')
  const text = await paneText($)
  expect(text).toContain('🧠 clear spec, many files')
  expect(text).toContain('🧠 heavy task in the plan')
  expect(text).toMatch(/effort high/)
})

test('brain end to end: the plan tool takes model, effort and why per task, and planned rows show them', async ($, on) => {
  const seen = base(on)
  await start($)
  const tool = seen.tools.find(t => t.name === 'progress') as { inputSchema: { properties: { tasks: { items: { properties: Record<string, unknown> } } } } }
  expect(Object.keys(tool.inputSchema.properties.tasks.items.properties)).toEqual(expect.arrayContaining(['model', 'effort', 'why']))
  await plan($, [{ title: 'Engineer: later', tier: 'medium', model: 'opus', effort: 'xhigh', why: 'risky migration' }])
  const text = await paneText($)
  expect(text).toContain('Opus · xhigh')
  expect(text).toContain('🧠 risky migration')
})

test('brain end to end: the main session is told to decide, while the brain is on', async ($, on) => {
  base(on)
  await start($)
  expect((await sections($)).find(s => s.id === 'crab-progress:brain')?.text).toBe(BRAIN_SECTION)
  await run($, 'tokens', 'brain off')
  expect((await sections($)).some(s => s.id === 'crab-progress:brain')).toBe(false)
})

test('brain end to end: on by default; off passes the Agent call through untouched', async ($, on) => {
  const seen = base(on)
  await start($)
  expect(await run($, 'tokens', '')).toContain('🧠 Staffing brain on')
  expect(await run($, 'tokens', 'brain off')).toBe('Staffing brain off: Agent calls go through as the Manager wrote them.')
  expect(await run($, 'tokens', '')).toContain('Staffing brain off (/tokens brain on)')
  await say('use opus, max effort', $)
  await agentCall($, 'Planner: map the work', { model: 'fable', effort: 'low' })
  expect(seen.calls.at(-1)).toMatchObject({ model: 'fable', effort: 'low' })
  expect(seen.spawns.at(-1)?.model).toBe('fable')
  await step($, 'a1', 'low')
  expect(seen.efforts.at(-1)).toBe('low')
  await agentCall($, 'the layout', { subagent_type: 'Explore' })
  expect(seen.calls.at(-1)?.model).toBeUndefined()
  expect(seen.spawns.at(-1)?.model).toBeUndefined()
  expect(seen.toasts.some(t => t.startsWith('🧠'))).toBe(false)
  expect(await run($, 'tokens', 'brain maybe')).toContain('Usage')
  expect(await run($, 'tokens', 'brain on')).toContain('Staffing brain on')
  await agentCall($, 'Planner: map the work', { model: 'fable' })
  expect(seen.spawns.at(-1)?.model).toBe('opus')
})

test('brain end to end: /tokens guardrails is the old name and says what it means now', async ($, on) => {
  base(on)
  await start($)
  const said = await run($, 'tokens', 'guardrails off')
  expect(said).toContain('Model guardrails are now the Staffing brain')
  expect(said).toContain('Staffing brain off')
  expect(await run($, 'tokens', '')).toContain('Staffing brain off')
  expect(await run($, 'tokens', 'guardrails on')).toContain('Staffing brain on')
  expect(await run($, 'tokens', '')).not.toMatch(/guardrail/i)
})

test('brain end to end: off is kept in the store, so a new session starts with it off', async ($, on) => {
  const seen = base(on, ONE_M, { staffingBrain: false })
  await start($)
  expect(await run($, 'tokens', '')).toContain('Staffing brain off')
  await spawn($, 'Planner: map the work', 'fable')
  expect(seen.spawns.at(-1)?.model).toBe('fable')
})

test('brain end to end: a Fable cut is counted in the savings ledger against Fable 5.1 prices', async ($, on) => {
  // Fable 5.1 is $10 / $50; it ran on Opus 5.5 at $4 / $20: 60 - 24.
  base(on)
  await start($)
  await spawn($, 'Planner: map the work', 'fable')
  await step($, 'a1')
  expect(await run($, 'tokens', '')).toMatch(/saved ≈\$36\.0 this session/)
  expect(await run($, 'tokens', '')).toContain('1 agent staffed this session')
})

// ---- the cost of a cache write ----------------------------------------------------

// Cache writes by lifetime: 1.25x input for 5 minutes, 2x for an hour. Opus 5.5 is $4 in, $20 out, $0.20 read.
// 1M in + 1M out + 2M read cost 4 + 20 + 0.4 = 24.4 before the writes.
type CostUsage = Usage & { cache_creation?: { ephemeral_5m_input_tokens?: number; ephemeral_1h_input_tokens?: number } }
const shows = async ($: Engine, text: RegExp) => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'terminal', component: 'Pane', requestId: 'crab-agents', props: { title: '', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} } } as never)
  return ui.find({ type: 'Text', text })
}
const costed = async ($: Engine, on: On, usage: Partial<CostUsage>) => {
  base(on, { ...ONE_M, cache_read_input_tokens: 2e6, ...usage })
  await start($)
  await spawn($, 'Priced work')
  await ($.turn.complete as (e: unknown) => Promise<unknown>)({ agentId: 'a1', reason: 'answer', answer: 'ok', usage: { ...ONE_M, cache_read_input_tokens: 2e6, ...usage } })
}

test('cost: 5-minute cache writes are 1.25x input', async ($, on) => {
  await costed($, on, { cache_creation_input_tokens: 1e6, cache_creation: { ephemeral_5m_input_tokens: 1e6, ephemeral_1h_input_tokens: 0 } })
  expect(await shows($, /≈\$29\.4 /)).toBeDefined() // 24.4 + 1M × 4 × 1.25
})

test('cost: 1-hour cache writes are 2x input', async ($, on) => {
  await costed($, on, { cache_creation_input_tokens: 1e6, cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 1e6 } })
  expect(await shows($, /≈\$32\.4 /)).toBeDefined() // 24.4 + 1M × 8
})

test('cost: a split of both lifetimes is priced at each rate', async ($, on) => {
  await costed($, on, { cache_creation_input_tokens: 1e6, cache_creation: { ephemeral_5m_input_tokens: 5e5, ephemeral_1h_input_tokens: 5e5 } })
  expect(await shows($, /≈\$30\.9 /)).toBeDefined() // 24.4 + 0.5M × 5 + 0.5M × 8
})

test('cost: one lifetime reported alone prices the rest of the aggregate at the 1-hour rate', async ($, on) => {
  await costed($, on, { cache_creation_input_tokens: 1e6, cache_creation: { ephemeral_5m_input_tokens: 5e5 } })
  expect(await shows($, /≈\$30\.9 /)).toBeDefined()
})

test('cost: with only the aggregate count every write is priced at the 1-hour rate, as before', async ($, on) => {
  await costed($, on, { cache_creation_input_tokens: 1e6 })
  expect(await shows($, /≈\$32\.4 /)).toBeDefined()
})
