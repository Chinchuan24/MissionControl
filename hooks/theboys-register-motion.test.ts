// The Boys, motion phase A, register side: THIS MEANS NOIR quiets the app's own toasts too, the TURBO RUSH spinner really runs
// at 2x (its suffix races), and the play list names each act once.
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const toasts: string[] = []
const T0 = new Date(2026, 9, 20, 10, 0, 0).getTime()
const base = (on: On) => {
  toasts.length = 0
  const clock = mock.clock(on, { now: T0 })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on)
  on('fs.exists', async () => ({ value: false }) as never)
  on('settings.read', async () => ({ value: {} }) as never)
  on('tool.register', async () => ({ value: undefined }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
  on('command.run', async () => ({ text: '' }) as never)
  on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
  on('ui.panes', async () => ({ value: [] }) as never)
  on('ui.toast', async (_$, e) => {
    toasts.push(String((e as { text?: string }).text ?? JSON.stringify(e)))
    return { value: undefined } as never
  })
  on('ui.notify', async () => ({ value: undefined }) as never)
  on('audio.play', async () => ({ value: undefined }) as never)
  on('tool.call', async () => ({ result: 'ok' }) as never)
  on('turn.complete', async () => ({ text: '' }) as never)
  on('prompt.submit', async (_$, e) => ({ text: (e as { text: string }).text }) as never)
  let n = 0
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: `a${++n}` }) as never)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: 100_000 }, rateLimits: [], cost: { usd: 0 } } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  return clock
}
const start = async ($: Engine, skin: string) => {
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  await $.command.run({ command: 'skin', args: skin } as never)
}
const ask = ($: Engine, text: string) => $.prompt.submit({ text, cursor: 0, origin: { kind: 'composer' } } as never)
const finish = ($: Engine) => $.turn.complete({ reason: 'answer', answer: 'ok', isAborted: false, durationMs: 1, turnId: 'x' } as never)
const run = async ($: Engine, args: string) => String(((await $.command.run({ command: 'missioncontrol', args } as never)) as { text?: string }).text)

for (const [skin, quiet] of [['noir', true], ['the-boys', false]] as const)
  test(`app toasts: a finished job's Done toast is ${quiet ? 'quiet (… 👍) in THIS MEANS NOIR' : 'readable in The Boys'}`, { timeoutMs: 60_000 }, async ($, on) => {
    const clock = base(on)
    await start($, skin)
    toasts.length = 0
    await ask($, 'Write the incident report')
    await clock.advance(200_000)
    await finish($)
    await clock.advance(2_000)
    const done = toasts.filter(t => t.startsWith('🎉 Done'))
    if (quiet) {
      expect(done).toEqual([])
      expect(toasts.length).toBeGreaterThan(0)
      expect(toasts.every(t => t.startsWith('…'))).toBe(true)
    } else expect(done.length).toBe(1)
  })

test('TURBO RUSH: with 4+ agents in flight the spinner races (its suffix steps 8 times a second), not only its word', { timeoutMs: 60_000 }, async ($, on) => {
  const clock = base(on)
  // The engine's own spinner, beneath the plugins: it draws the word and the suffix it is handed.
  on('ui.render', { component: 'Spinner' } as never, (async (_$: unknown, e: { props: { word: string; suffix: string } }) => ({ type: 'Text', props: {}, children: [`${e.props.word}|${e.props.suffix}`] })) as never)
  await start($, 'the-boys')
  await ask($, 'Vought Tower incident report')
  await $.tool.call({ tool: 'mcp__crab-progress__progress', title: 'Vought Tower incident report', total: 5, done: 2, phase: 'build', tasks: [{ title: 'Lead: run it' }, { title: 'Engineer: fix it' }] } as never).catch(() => undefined)
  for (const [i, d] of ['Lead: run it', 'Engineer: fix it', 'Tester: break it', 'Writer: say it'].entries()) await $.agent.spawn({ tool_use_id: `t${i}`, prompt: 'p', description: d, subagentType: 'general-purpose', provider: 'engine', parentAgentId: undefined } as never).catch(() => undefined)
  // The band counts the crew running (4 = TURBO RUSH) when it draws.
  const band = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: true, maxRows: 14, bodyColumns: 126 } as never })
  await band.unmount()
  const props = { word: 'Working', message: null, suffix: '…', mode: 'thinking' }
  const seen = new Set<string>()
  for (let k = 0; k < 4; k++) {
    const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'Spinner', props } as never)
    const tree = JSON.stringify(await ui.drawn().catch(() => ({})))
    await ui.unmount()
    expect(tree).toContain('2×')
    const m = /2×\|([^"]*)"/.exec(tree)
    if (m) seen.add(m[1] as string)
    await clock.advance(125)
  }
  // Four mounts 125 ms apart inside one 0.5 s word: four different suffixes (the word alone would not change).
  expect(seen.size).toBe(4)
  for (const s of seen) expect(s).toMatch(/^ ·{0,3}»$/)
})

test('play list: each name once; the curtain call only while THIS MEANS NOIR is worn', { timeoutMs: 60_000 }, async ($, on) => {
  base(on)
  await start($, 'the-boys')
  const list = (await run($, 'play')).replace(/^[^:]*:\s*/, '').split(', ')
  expect(new Set(list).size).toBe(list.length)
  expect(list).not.toContain('curtain')
  expect(await run($, 'play')).toContain(`has ${list.length}:`)
  await $.command.run({ command: 'skin', args: 'noir' } as never)
  const noir = (await run($, 'play')).replace(/^[^:]*:\s*/, '').split(', ')
  expect(new Set(noir).size).toBe(noir.length)
  expect(noir).toContain('curtain')
})
