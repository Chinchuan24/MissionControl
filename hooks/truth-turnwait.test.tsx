import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

// A sub-agent's turn can end while its loop is kept alive: it waits on background
// work it owns (a shell, a monitor, an agent it started) and the engine wakes it for
// another turn. The bars jumped to 100% at that turn's end, then back to the real
// share when the next turn ran. A turn's end is not the agent's end: the engine's own
// agent list says where its loop stands.
const PLUGIN = 'crab-progress'
const pane = { title: '', isFocused: false, bodyColumns: 100, placement: 'dock', scroll: { offset: 0, bodyRows: 80 }, view: {} } as const
const TASK = 'Engineer: deck mentor edits'
const toasts: string[] = []
// The engine's agent list, as `$.agent.list()` reads it: id -> AgentStatus.
const listed = new Map<string, string>()
let listBroken = false
const base = (on: On, addon = false) => {
  toasts.length = 0
  listed.clear()
  listBroken = false
  const clock = mock.clock(on, { now: Date.parse('2026-10-20T10:00:00Z') })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on)
  // The cyber skins need their add-on present.
  on('fs.exists', async (_$, e) => ({ value: addon && /addons[\\/]cyberpunk[\\/]addon\.json$/.test(String((e as { path: string }).path)) }) as never)
  on('command.run', async () => ({ text: '' }) as never)
  on('settings.read', async () => ({ value: {} }) as never)
  on('tool.register', async () => ({ value: undefined }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
  on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
  on('ui.panes', async () => ({ value: [] }) as never)
  on('ui.toast', async (_$, e) => {
    toasts.push(String((e as { text?: string }).text ?? ''))
    return { value: undefined } as never
  })
  on('ui.notify', async () => ({ value: undefined }) as never)
  on('audio.play', async () => ({ value: undefined }) as never)
  on('tool.call', async () => ({ result: 'ok' }) as never)
  on('turn.start', async () => ({}) as never)
  on('turn.complete', async () => ({ text: '' }) as never)
  on('classic.Stop', async () => ({}) as never)
  on('classic.SubagentStop', async () => ({}) as never)
  on('prompt.submit', async (_$, e) => ({ text: (e as { text: string }).text }) as never)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: 100_000 }, rateLimits: [], cost: { usd: 0 } } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  on('turn.step', async function* (_$, e) {
    const ev = e as { turnId: string; index: number }
    return { turnId: ev.turnId, index: ev.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: { model: 'claude-opus-5-5', input_tokens: 10, output_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } as never
  })
  // A new spawn gets a fresh id; a wake or a SendMessage continues under the same one.
  on('agent.spawn', (_$, e) => {
    const r = (e as { resume?: { agentId: string } }).resume
    return { model: 'claude-opus-5-5', agentId: r ? r.agentId : 'a1' } as never
  })
  on('agent.list', async () => {
    if (listBroken) throw new Error('list down')
    return { value: [...listed].map(([id, status]) => ({ id, description: TASK, type: 'general-purpose', status })) } as never
  })
  return clock
}
type Clock = { advance: (ms: number) => Promise<unknown>; settle: () => Promise<unknown> }

const start = ($: Engine) => $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
const ask = ($: Engine) => $.prompt.submit({ text: 'rework the EIP deck', cursor: 0, origin: { kind: 'composer' } } as never)
const plan = ($: Engine) =>
  $.tool.call({ tool: 'mcp__crab-progress__progress', title: 'EIP deck: service-first rework', phase: 'delegate', total: 1, done: 0, tasks: [{ title: TASK, tier: 'medium' }] } as never)
const spawn = async ($: Engine, background = false) => {
  await $.agent.spawn({ tool_use_id: 'tu1', prompt: 'p', description: TASK, subagentType: 'general-purpose', provider: 'engine', parentModel: 'x', background, fork: false } as never)
  listed.set('a1', 'running')
}
const wake = ($: Engine) =>
  $.agent.spawn({ tool_use_id: 'tu2', prompt: '', description: TASK, subagentType: 'general-purpose', provider: 'engine', parentModel: 'x', background: false, fork: false, resume: { agentId: 'a1' } } as never)
const report = ($: Engine, done: number, total: number) => $.tool.call({ tool: 'mcp__crab-progress__step', done, total, agentId: 'a1' } as never)
const request = async ($: Engine) => {
  const s = ($.turn.step as (e: unknown) => AsyncIterable<unknown>)({ turnId: 'sub', index: 1, model: 'claude-opus-5-5', messageCount: 3, agentId: 'a1' })
  for await (const _ of s) void _
}
const turnEnd = ($: Engine, reason = 'answer') =>
  $.turn.complete({ agentId: 'a1', reason, answer: 'ok', isAborted: reason === 'aborted', durationMs: 1000, turnId: 'sub' } as never)
const mainEnd = ($: Engine) => $.turn.complete({ reason: 'answer', answer: 'Started the engineer; it will report back.', isAborted: false, durationMs: 1000, turnId: 'main' } as never)

// What the desktop pane draws: the Workflow card's row (state and percent) and the
// agent card's own progress, plus the band's line.
const look = async ($: Engine) => {
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: pane } as never)
  const svgs = (await ui.findAll({ type: 'Svg' })).map(s => ({ alt: String(s.props.alt ?? ''), source: String(s.props.source ?? '') }))
  await ui.unmount()
  const wf = svgs.find(s => s.alt.startsWith('Workflow:'))
  const row = /^Workflow: 1\. .* (\w+)$/.exec(wf?.alt ?? '')?.[1] ?? ''
  const rowPct = [...(wf?.source ?? '').matchAll(/>(\d+)%</g)].map(m => Number(m[1])).at(-1) ?? null
  const band = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100 } as never })
  const bandAlt = String((await band.findAll({ type: 'Svg' }))[0]?.props.alt ?? '')
  await band.unmount()
  return { row, rowPct, bandAlt }
}

test('screenshot case: a turn that ends waiting on its own background work holds 50%, never 100%', async ($, on) => {
  const clock = base(on) as unknown as Clock
  await start($)
  await ask($)
  await plan($)
  await spawn($)
  await report($, 0, 2)
  await request($)
  await report($, 1, 2)
  await clock.advance(5_000)
  expect(await look($)).toMatchObject({ row: 'running', rowPct: 50 })

  // It starts a background render and ends its turn: the engine keeps the loop, waiting.
  listed.set('a1', 'waiting')
  await turnEnd($)
  await clock.advance(1_000)
  await clock.settle()
  const held = await look($)
  expect(held).toMatchObject({ row: 'running', rowPct: 50 })
  // Still waiting a while later: the tick that checks the engine changes nothing.
  await clock.advance(30_000)
  await clock.settle()
  expect(await look($)).toMatchObject({ row: 'running', rowPct: 50 })
  expect(toasts.filter(t => t.includes('stuck') || t.includes('Done'))).toEqual([])

  // The render finishes: the engine wakes it for another turn.
  listed.set('a1', 'running')
  await wake($)
  await request($)
  expect(await look($)).toMatchObject({ row: 'running', rowPct: 50 })

  // The real end: last step, the answer, the engine lists it completed. 100% at once.
  await report($, 2, 2)
  listed.set('a1', 'completed')
  await turnEnd($)
  expect(await look($)).toMatchObject({ row: 'done', rowPct: 100 })
})

test('woken without a spawn event: the next request carries on from the held share', async ($, on) => {
  const clock = base(on) as unknown as Clock
  await start($)
  await ask($)
  await plan($)
  await spawn($)
  await report($, 1, 2)
  await request($)
  listed.set('a1', 'waiting')
  await turnEnd($)
  await clock.advance(10_000)
  await clock.settle()
  const seen: number[] = []
  const states: string[] = []
  for (let i = 0; i < 3; i++) {
    listed.set('a1', 'running')
    await request($)
    listed.set('a1', 'waiting')
    await turnEnd($)
    await clock.advance(2_000)
    await clock.settle()
    const l = await look($)
    seen.push(l.rowPct ?? -1)
    states.push(l.row)
  }
  expect(seen).toEqual([50, 50, 50])
  expect(states).toEqual(['running', 'running', 'running'])
})

test('engine still finalizing at the turn end: the end lands on the next tick, at 100%', async ($, on) => {
  const clock = base(on) as unknown as Clock
  await start($)
  await ask($)
  await plan($)
  await spawn($)
  await report($, 1, 2)
  await request($)
  // The hook runs while the engine still reads the loop as running.
  listed.set('a1', 'running')
  await turnEnd($)
  expect(await look($)).toMatchObject({ row: 'running', rowPct: 50 })
  listed.set('a1', 'completed')
  await clock.advance(1_000)
  await clock.settle()
  expect(await look($)).toMatchObject({ row: 'done', rowPct: 100 })
})

test('an agent the engine does not list (a workflow agent) or a broken list ends at its answer, as before', async ($, on) => {
  base(on)
  await start($)
  await ask($)
  await plan($)
  await spawn($)
  listed.clear()
  await report($, 1, 2)
  await turnEnd($)
  expect(await look($)).toMatchObject({ row: 'done', rowPct: 100 })
})

test('a broken agent list fails open: the answer ends the agent', async ($, on) => {
  base(on)
  await start($)
  await ask($)
  await plan($)
  await spawn($)
  await report($, 1, 2)
  listed.set('a1', 'waiting')
  listBroken = true
  await turnEnd($)
  expect(await look($)).toMatchObject({ row: 'done', rowPct: 100 })
})

test('killed while it waited: it ends stopped at its share, never 100%', async ($, on) => {
  const clock = base(on) as unknown as Clock
  await start($)
  await ask($)
  await plan($)
  await spawn($)
  await report($, 1, 2)
  await request($)
  listed.set('a1', 'waiting')
  await turnEnd($)
  listed.set('a1', 'killed')
  await clock.advance(1_000)
  await clock.settle()
  expect(await look($)).toMatchObject({ row: 'stopped', rowPct: 50 })
})

// The Manager card's "Overall progress" percent and its status pill.
const manager = async ($: Engine) => {
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: pane } as never)
  const m = (await ui.findAll({ type: 'Svg' })).map(s => ({ alt: String(s.props.alt ?? ''), source: String(s.props.source ?? '') })).find(s => s.alt.startsWith('Manager:'))
  await ui.unmount()
  const pct = /Overall progress<\/text>[\s\S]*?text-anchor="end"[^>]*>([^<]*)<\/text>/.exec(m?.source ?? '')?.[1] ?? ''
  return { alt: m?.alt ?? '', pct }
}

test('a background agent waiting on its own work holds the job open: no early "Done!" on the card or the band', async ($, on) => {
  const clock = base(on) as unknown as Clock
  await start($)
  await ask($)
  await spawn($, true)
  await report($, 1, 2)
  await request($)
  await clock.advance(5_000)
  expect((await manager($)).pct).toBe('50%')
  await mainEnd($)
  listed.set('a1', 'waiting')
  await turnEnd($)
  await clock.advance(5_000)
  await clock.settle()
  const card = await manager($)
  expect(card.pct).toBe('50%')
  expect(card.alt).not.toContain('done')
  const band = (await look($)).bandAlt
  expect(band).not.toContain('Done')
  expect(band).not.toContain('100%')
  expect(toasts.filter(t => t.startsWith('🎉'))).toEqual([])
  // The real end lets the job finish: a background agent's engine row reads idle once it completed.
  listed.set('a1', 'running')
  await wake($)
  await request($)
  await report($, 2, 2)
  listed.set('a1', 'idle')
  await turnEnd($)
  await clock.advance(1_000)
  await clock.settle()
  expect((await look($)).row).toBe('')
  expect((await manager($)).alt).not.toContain('working')
})

test('a running agent that reports every step done shows short of 100% until it ends', async ($, on) => {
  base(on)
  await start($)
  await ask($)
  await plan($)
  await spawn($)
  await report($, 2, 2)
  await request($)
  const l = await look($)
  expect(l.row).toBe('running')
  expect(l.rowPct).toBeLessThan(100)
  listed.set('a1', 'completed')
  await turnEnd($)
  expect(await look($)).toMatchObject({ row: 'done', rowPct: 100 })
})

// The same hold on the band as each skin draws it: the boys' syringe, the cyber skins'
// bars, the others' meters all read the one progress, so none jumps to 100% or "Done!".
for (const skin of ['the-boys', 'edgerunners-2', 'cyberpunk-2077', 'invincible', 'breaking-bad']) {
  test(`band in ${skin}: a held agent keeps its share, then the real end finishes`, async ($, on) => {
    const clock = base(on, true) as unknown as Clock
    await start($)
    const worn = String(((await $.command.run({ command: 'skin', args: skin } as never)) as { text?: string }).text)
    const list = String(((await $.command.run({ command: 'skin', args: 'list' } as never)) as { text?: string }).text)
    expect({ worn: list.includes(`▸ ${skin}`) ? skin : worn }).toEqual({ worn: skin })
    await ask($)
    await spawn($, true)
    await report($, 1, 2)
    await request($)
    await mainEnd($)
    await clock.advance(5_000)
    const bandSrc = async () => {
      const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 14, bodyColumns: 160 } as never })
      const svgs = (await ui.findAll({ type: 'Svg' })).map(s => ({ alt: String(s.props.alt ?? ''), source: String(s.props.source ?? '') }))
      await ui.unmount()
      return { alt: svgs.map(s => s.alt).join(' | '), source: svgs.map(s => s.source).join('') }
    }
    const before = await bandSrc()
    listed.set('a1', 'waiting')
    await turnEnd($)
    await clock.advance(5_000)
    await clock.settle()
    const during = await bandSrc()
    expect(during.alt).toBe(before.alt)
    expect(during.alt).not.toContain('Done')
    expect(during.alt).not.toContain('100%')
    expect(during.source).not.toContain('>100%<')
    expect((await manager($)).pct).toBe('50%')
    // Woken, then the real end.
    listed.set('a1', 'running')
    await wake($)
    await request($)
    listed.set('a1', 'idle')
    await turnEnd($)
    await clock.advance(1_000)
    await clock.settle()
    expect((await manager($)).alt).not.toContain('working')
  })
}
