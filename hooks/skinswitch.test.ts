// The generic skin switch (stage/wipe.ts `skinSwitch`), wired into the band and the pane: `/skin` plays a short wipe from the
// old skin's ground to the new one on both panels, pinned to the switch, and it is gone a moment later. CAPRI keeps its own.
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { audit } from './stage/budget'

const pane = { title: '', isFocused: false, bodyColumns: 80, placement: 'dock', scroll: { offset: 0, bodyRows: 60 }, view: {} } as const
const T0 = Date.parse('2026-10-19T10:00:00Z')
const base = (on: On) => {
  const clock = mock.clock(on, { now: T0 })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on)
  on('settings.read', async () => ({ value: {} }) as never)
  on('tool.register', async () => ({ value: undefined }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
  on('command.run', async () => ({ text: '' }) as never)
  on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
  on('ui.panes', async () => ({ value: [] }) as never)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: 100_000 }, rateLimits: [] } }) as never)
  on('session.cwd', async () => ({ value: '/repo' }) as never)
  on('fs.exists', async (_$, e) => ({ value: /addons[\\/]cyberpunk[\\/]addon\.json$/.test(String((e as { path: string }).path)) }) as never)
  on('fs.list', async () => ({ value: [] }) as never)
  on('fs.read', async () => ({ value: '' }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  return clock
}
const paneSvgs = async ($: Engine): Promise<string[]> => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: pane })
  const all = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source))
  await ui.unmount()
  return all
}
const band = async ($: Engine): Promise<string> => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 140 } as never })
  const all = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('\n')
  await ui.unmount()
  return all
}
const run = async ($: Engine, args: string) => String(((await $.command.run({ command: 'skin', args } as never)) as { text?: string }).text)
// The switch's wipe: the old ground wiping off (clip-path inset) with the shard burst.
const WIPE = 'clip-path:inset(0 0 0 100%)'

test('skin switch: /skin plays the wipe on the band and the top pane cards, cleanly, then it is gone', async ($, on) => {
  const clock = base(on)
  on('ui.toast', async () => ({ value: undefined }) as never)
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  expect(await band($)).not.toContain(WIPE)
  expect(await run($, 'cyberpunk-2077')).toContain('Skin: Cyberpunk Edgerunner')
  const b = await band($)
  expect(b).toContain(WIPE)
  expect(b).toContain('sg-shard')
  for (const src of b.split('\n')) { const a = audit(src); expect(a.dupes).toEqual([]); expect(a.dupeIds).toEqual([]); expect(a.badText).toEqual([]) }
  const cards = await paneSvgs($)
  const swept = cards.filter(s => s.includes(WIPE))
  expect(swept.length).toBeGreaterThan(0)
  expect(swept.length).toBeLessThan(5)
  for (const src of swept) { const a = audit(src); expect(a.dupes).toEqual([]); expect(a.dupeIds).toEqual([]) }
  // The switch is pinned to the moment: a redraw 3 s later draws no wipe at all.
  await clock.advance(3_000)
  expect(await band($)).not.toContain(WIPE)
  expect((await paneSvgs($)).some(s => s.includes(WIPE))).toBe(false)
})

test('skin switch: wearing the same skin again plays nothing; CAPRI keeps its own transition', async ($, on) => {
  const clock = base(on)
  on('ui.toast', async () => ({ value: undefined }) as never)
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  expect(await run($, 'off')).toContain('Skin: Default')
  await clock.advance(3_000)
  expect(await run($, 'off')).toContain('Skin: Default')
  expect(await band($)).not.toContain('sg-shard')
  await clock.advance(3_000)
  expect(await run($, 'capricorn')).toContain('CAPRI')
  expect(await band($)).not.toContain('sg-shard')
})
