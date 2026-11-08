import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { asksForFable, baselineModel, guardModel, guardNote, guardRole } from './guardrails'
import type { GuardInput } from './guardrails'

// Model guardrails: an Agent call that names a model is capped by role, never raised.
// The pure rules first, then the whole path (the spawn, the toast, /tokens, the ledger).

const input = (over: Partial<GuardInput>): GuardInput => ({ model: 'opus', type: 'general-purpose', description: 'Planner: map the work', askedFable: false, isHeavy: false, ...over })
const lowered = (over: Partial<GuardInput>) => {
  const g = guardModel(input(over))
  return g ? g.model : null
}

test('guardrails: a role is read from its "<Role>:" name, else its type, else its words', () => {
  expect(guardRole('general-purpose', 'Checker: widths')).toBe('review')
  expect(guardRole('general-purpose', 'Reviewer: the diff')).toBe('review')
  expect(guardRole('general-purpose', 'Researcher: find the config')).toBe('read')
  expect(guardRole('Explore', 'anything')).toBe('read')
  expect(guardRole('superpowers:code-reviewer', 'the auth change')).toBe('review')
  // Review beats reading when a job is both: it keeps the Sonnet floor.
  expect(guardRole('general-purpose', 'Reviewer: find the bugs and research the fix')).toBe('review')
  expect(guardRole('general-purpose', 'Engineer: wire the parser')).toBe('engineer')
  expect(guardRole('general-purpose', 'Planner: map the work')).toBe('other')
  // A named role beats words further along: an Engineer who fixes a review comment is an engineer.
  expect(guardRole('general-purpose', 'Engineer: apply the review notes')).toBe('engineer')
})

test('guardrails: Fable goes to Opus unless the prompt names Fable or a Fable model id', () => {
  expect(lowered({ model: 'fable' })).toBe('opus')
  expect(lowered({ model: 'claude-fable-5-1' })).toBe('opus')
  expect(lowered({ model: 'fable', askedFable: true })).toBeNull()
  expect(asksForFable('use Fable for the planner')).toBe(true)
  expect(asksForFable('run it on claude-fable-5-1 please')).toBe(true)
  expect(asksForFable('fable-5 only')).toBe(true)
  expect(asksForFable('FABLE')).toBe(true)
  expect(asksForFable('tell me a story, a fable about crabs')).toBe(true)
  expect(asksForFable('read the fables folder')).toBe(false)
  expect(asksForFable('use opus for the planner')).toBe(false)
  expect(asksForFable('')).toBe(false)
})

test('guardrails: checkers, reviewers, researchers and explorers are capped at Sonnet', () => {
  for (const description of ['Checker: the widths', 'Reviewer: the diff', 'Researcher: the options']) {
    expect(lowered({ model: 'opus', description })).toBe('sonnet')
    expect(lowered({ model: 'fable', description })).toBe('sonnet')
  }
  expect(lowered({ model: 'opus', type: 'Explore', description: 'the layout', staffModel: 'haiku' })).toBe('haiku')
  // Sonnet already: it stands.
  expect(lowered({ model: 'sonnet', description: 'Reviewer: the diff' })).toBeNull()
})

test('guardrails: reviewers and checkers are never capped below Sonnet, even when staffFor picks Haiku', () => {
  for (const description of ['Reviewer: find the bugs in the diff', 'Checker: scan the widths']) {
    expect(lowered({ model: 'opus', description, staffModel: 'haiku' })).toBe('sonnet')
    expect(lowered({ model: 'fable', description, staffModel: 'haiku' })).toBe('sonnet')
    expect(lowered({ model: 'sonnet', description, staffModel: 'haiku' })).toBeNull()
  }
  expect(lowered({ model: 'opus', type: 'superpowers:code-reviewer', description: 'the auth change', staffModel: 'haiku' })).toBe('sonnet')
})

test('guardrails: Haiku where staffFor picks it for light work', () => {
  expect(lowered({ model: 'opus', description: 'Researcher: find the config', staffModel: 'haiku' })).toBe('haiku')
  expect(lowered({ model: 'sonnet', description: 'Researcher: find the config', staffModel: 'haiku' })).toBe('haiku')
  // No Haiku pick: Sonnet is the cap.
  expect(lowered({ model: 'opus', description: 'Researcher: weigh the options' })).toBe('sonnet')
})

test('guardrails: engineers are capped at Sonnet unless the plan marks the task heavy or Ultra', () => {
  expect(lowered({ model: 'opus', description: 'Engineer: wire the parser' })).toBe('sonnet')
  expect(lowered({ model: 'fable', description: 'Engineer: wire the parser' })).toBe('sonnet')
  expect(lowered({ model: 'opus', description: 'Engineer: wire the parser', isHeavy: true })).toBeNull()
  // Heavy keeps the model but a Fable the person never asked for is still Opus.
  expect(lowered({ model: 'fable', description: 'Engineer: wire the parser', isHeavy: true })).toBe('opus')
  // The person's Fable stands for an engineer too.
  expect(lowered({ model: 'fable', description: 'Engineer: wire the parser', askedFable: true })).toBeNull()
})

test('guardrails: never an upgrade, and an unknown model is left alone', () => {
  expect(lowered({ model: 'haiku', description: 'Engineer: wire the parser' })).toBeNull()
  expect(lowered({ model: 'haiku', description: 'Reviewer: the diff' })).toBeNull()
  expect(lowered({ model: 'claude-haiku-5-5', description: 'Researcher: the options', staffModel: 'haiku' })).toBeNull()
  expect(lowered({ model: 'sonnet', description: 'Planner: map the work' })).toBeNull()
  expect(lowered({ model: 'opus', description: 'Planner: map the work' })).toBeNull()
  expect(lowered({ model: 'arn:aws:bedrock:us-east-1:1:application-inference-profile/x', description: 'Engineer: wire the parser' })).toBeNull()
  expect(guardNote('wire the parser', guardModel(input({ model: 'opus', description: 'Engineer: wire the parser' })) as never)).toBe('Guardrail: "wire the parser" Opus → Sonnet (engineer, not marked heavy in the plan)')
  expect(baselineModel('opus', { opus: 'claude-opus-5-5' })).toBe('claude-opus-5-5')
  expect(baselineModel('claude-opus-4-8', { opus: 'claude-opus-5-5' })).toBe('claude-opus-4-8')
})

// ---- the whole path ---------------------------------------------------------------

type Spawned = { model?: string; prompt: string }
type Usage = { model: string; input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number; cache_creation?: { ephemeral_5m_input_tokens?: number; ephemeral_1h_input_tokens?: number } }
const ONE_M: Usage = { model: 'claude-opus-5-5', input_tokens: 1e6, output_tokens: 1e6, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

const base = (on: On, usage: Usage = ONE_M, store: Record<string, unknown> = {}) => {
  const seen = { spawns: [] as Spawned[], toasts: [] as string[] }
  mock.clock(on, { now: Date.parse('2026-10-20T10:00:00Z') })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on, store)
  on('fs.exists', async () => ({ value: false }) as never)
  on('settings.read', async () => ({ value: {} }) as never)
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
  let n = 0
  on('agent.spawn', async (_$, e) => {
    const ev = e as Spawned
    seen.spawns.push({ model: ev.model, prompt: ev.prompt })
    return { model: ev.model ?? 'claude-opus-5-5', agentId: `a${++n}` } as never
  })
  on('turn.step', async function* () {
    return { turnId: 'turn', index: 0, answer: '', toolUses: [], stopReason: 'end_turn', usage } as never
  })
  return seen
}

const start = ($: Engine) => $.session.start({ source: 'startup', cwd: '/repo', surface: 'terminal', isInteractive: true } as never)
const run = async ($: Engine, command: string, args: string) => String(((await $.command.run({ command, args } as never)) as { text?: string }).text ?? '')
const say = (prompt: string, $: Engine) => $.prompt.submit({ text: prompt, cursor: 0 } as never)
const spawn = ($: Engine, description: string, model?: string, subagentType = 'general-purpose') =>
  $.agent.spawn({ tool_use_id: `t-${description}-${model}`, prompt: 'p', description, subagentType, model, provider: 'engine', parentModel: 'claude-opus-5-5', background: false, fork: false } as never)
const step = async ($: Engine, agentId: string) => {
  const stream = ($.turn.step as (e: unknown) => AsyncIterable<unknown>)({ turnId: 'turn', index: 0, model: 'claude-opus-5-5', messageCount: 1, agentId })
  for await (const _ of stream) void _
}
const PROGRESS = 'mcp__crab-progress__progress'
const plan = ($: Engine, tasks: { title: string; tier: string; ultra?: boolean }[]) => $.tool.call({ tool: PROGRESS, title: 'Ship it', phase: 'delegate', total: tasks.length, tasks } as never)

test('guardrails end to end: Fable to Opus, a note says so, and the explicit ask passes through', async ($, on) => {
  const seen = base(on)
  await start($)
  await say('plan the work, nothing fancy', $)
  await spawn($, 'Planner: map the work', 'fable')
  expect(seen.spawns.at(-1)?.model).toBe('opus')
  expect(seen.toasts.at(-1)).toBe('Guardrail: "Planner: map the work" Fable → Opus (you did not ask for Fable)')
  // The person's latest prompt names Fable: it stands, with no note.
  await say('this one is hard: use fable for the planner', $)
  const notes = seen.toasts.length
  await spawn($, 'Planner: map the hard part', 'fable')
  expect(seen.spawns.at(-1)?.model).toBe('fable')
  expect(seen.toasts.length).toBe(notes)
  // A Fable model id counts the same.
  await say('go with claude-fable-5-1', $)
  await spawn($, 'Planner: map the rest', 'claude-fable-5-1')
  expect(seen.spawns.at(-1)?.model).toBe('claude-fable-5-1')
  // The next prompt that does not name it takes the ask back.
  await say('now the small things', $)
  await spawn($, 'Planner: map the small things', 'fable')
  expect(seen.spawns.at(-1)?.model).toBe('opus')
})

test('guardrails end to end: each role cap, and no upgrade', async ($, on) => {
  const seen = base(on)
  await start($)
  const modelFor = async (description: string, model: string, type?: string) => {
    await spawn($, description, model, type)
    return seen.spawns.at(-1)?.model
  }
  expect(await modelFor('Checker: the widths', 'opus')).toBe('sonnet')
  expect(await modelFor('Reviewer: the diff', 'claude-opus-5-5')).toBe('sonnet')
  expect(await modelFor('Researcher: find the config', 'opus')).toBe('haiku')
  expect(await modelFor('the layout', 'sonnet', 'Explore')).toBe('haiku')
  // staffFor reads "find" as light work, but a reviewer or checker stops at Sonnet.
  expect(await modelFor('Reviewer: find the bugs in the diff', 'opus')).toBe('sonnet')
  expect(await modelFor('Checker: scan the widths', 'opus')).toBe('sonnet')
  expect(await modelFor('Engineer: wire the parser', 'opus')).toBe('sonnet')
  // Not raised: Haiku asked for stays Haiku, Sonnet for a planner stays Sonnet, no model stays none.
  expect(await modelFor('Engineer: wire the parser', 'haiku')).toBe('haiku')
  expect(await modelFor('Reviewer: the diff', 'haiku')).toBe('haiku')
  expect(await modelFor('Planner: map the work', 'sonnet')).toBe('sonnet')
  expect(await modelFor('Planner: map the work', 'opus')).toBe('opus')
  await spawn($, 'Engineer: wire the parser')
  expect(seen.spawns.at(-1)?.model).toBeUndefined()
  expect(seen.toasts.filter(t => t.startsWith('Guardrail:')).length).toBe(7)
})

test('guardrails end to end: an engineer keeps its model when the plan marks the task heavy, fable-tier or Ultra', async ($, on) => {
  const seen = base(on)
  await start($)
  await plan($, [
    { title: 'Engineer: the heavy part', tier: 'heavy' },
    { title: 'Engineer: the fable part', tier: 'fable' },
    { title: 'Engineer: the ultra part', tier: 'medium', ultra: true },
    { title: 'Engineer: the easy part', tier: 'medium' },
  ])
  await spawn($, 'Engineer: the heavy part', 'opus')
  expect(seen.spawns.at(-1)?.model).toBe('opus')
  await spawn($, 'Engineer: the ultra part', 'opus')
  expect(seen.spawns.at(-1)?.model).toBe('opus')
  await spawn($, 'Engineer: the easy part', 'opus')
  expect(seen.spawns.at(-1)?.model).toBe('sonnet')
  // The fable tier keeps its engineer off the Sonnet cap; the model is still Opus, as Fable was never asked for.
  await spawn($, 'Engineer: the fable part', 'fable')
  expect(seen.spawns.at(-1)?.model).toBe('opus')
  // A role with an Ultra rule counts as marked.
  await run($, 'tokens', 'ultra add Engineer')
  await spawn($, 'Engineer: anything', 'opus')
  expect(seen.spawns.at(-1)?.model).toBe('opus')
})

test('guardrails end to end: the switch is on by default, /tokens says so, and off leaves every model as asked', async ($, on) => {
  const seen = base(on)
  await start($)
  expect(await run($, 'tokens', '')).toContain('Model guardrails on')
  expect(await run($, 'tokens', 'guardrails off')).toBe('Model guardrails off.')
  expect(await run($, 'tokens', '')).toContain('Model guardrails off (/tokens guardrails on)')
  await spawn($, 'Engineer: wire the parser', 'fable')
  expect(seen.spawns.at(-1)?.model).toBe('fable')
  await spawn($, 'Reviewer: the diff', 'opus')
  expect(seen.spawns.at(-1)?.model).toBe('opus')
  expect(seen.toasts.some(t => t.startsWith('Guardrail:'))).toBe(false)
  expect(await run($, 'tokens', 'guardrails maybe')).toContain('Usage')
  expect(await run($, 'tokens', 'guardrails on')).toContain('Model guardrails on')
  await spawn($, 'Reviewer: the diff', 'opus')
  expect(seen.spawns.at(-1)?.model).toBe('sonnet')
})

test('guardrails end to end: off is kept in the store, so a new session starts with it off', async ($, on) => {
  const seen = base(on, ONE_M, { modelGuardrails: false })
  await start($)
  expect(await run($, 'tokens', '')).toContain('Model guardrails off')
  await spawn($, 'Reviewer: the diff', 'opus')
  expect(seen.spawns.at(-1)?.model).toBe('opus')
})

test('guardrails end to end: the saving goes in the staffing ledger, at the right prices for the model asked for', async ($, on) => {
  // 1M in and 1M out on the model it ran on. Opus 5.5 is $4 / $20; Sonnet 5.5 $2 / $10: Opus to Sonnet saves 24 - 12.
  base(on, { ...ONE_M, model: 'claude-sonnet-5-5' })
  await start($)
  await spawn($, 'Engineer: wire the parser', 'opus')
  await step($, 'a1')
  expect(await run($, 'tokens', '')).toMatch(/saved ≈\$12\.0 this session/)
})

test('guardrails end to end: Fable to Opus is counted against Fable 5.1 prices', async ($, on) => {
  // Fable 5.1 is $10 / $50; it ran on Opus 5.5 at $4 / $20: 60 - 24.
  base(on)
  await start($)
  await spawn($, 'Planner: map the work', 'fable')
  await step($, 'a1')
  expect(await run($, 'tokens', '')).toMatch(/saved ≈\$36\.0 this session/)
})

test('guardrails end to end: a mc-* worker keeps what the Manager chose', async ($, on) => {
  const seen = base(on)
  await start($)
  await spawn($, 'Engineer: wire the parser', 'opus', 'mc-heavy')
  expect(seen.spawns.at(-1)?.model).toBe('opus')
})

// ---- the cost of a cache write ----------------------------------------------------

// Cache writes by lifetime: 1.25x input for 5 minutes, 2x for an hour. Opus 5.5 is $4 in, $20 out, $0.20 read.
// 1M in + 1M out + 2M read cost 4 + 20 + 0.4 = 24.4 before the writes.
const shows = async ($: Engine, text: RegExp) => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'terminal', component: 'Pane', requestId: 'crab-agents', props: { title: '', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} } } as never)
  return ui.find({ type: 'Text', text })
}
const costed = async ($: Engine, on: On, usage: Partial<Usage>) => {
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
