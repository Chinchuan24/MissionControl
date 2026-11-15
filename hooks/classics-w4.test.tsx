// The plain skins, wave 4: Crab Classic's new crab scuttles in on its agent's pane card too (cut in wave 3 only for the load
// test's budget: the card was sent twice, once to add the entrance and again to drop it). Now the entrance stays in the card
// for the agent's life: one send, a finished animation that costs nothing at rest, never ahead of its moment.
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { SCUTTLE_CARD_CSS, scuttleCard } from './classics'

const T0 = Date.parse('2026-10-19T10:00:00Z')
const setup = async ($: Engine, on: On, skin: string) => {
  const clock = mock.clock(on, { now: T0 })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on)
  on('settings.read', async () => ({ value: {} }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('fs.exists', async () => ({ value: false }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: 100_000 }, rateLimits: [], cost: { usd: 1 } } }) as never)
  on('ui.toast', async () => ({ value: undefined }) as never)
  on('tool.call', async () => ({ result: 'ok' }) as never)
  on('turn.complete', () => ({ text: '' }) as never)
  on('prompt.submit', async (_$, e) => ({ text: (e as { text: string }).text }) as never)
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: 'a1' }) as never)
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  await $.command.run({ command: 'skin', args: skin } as never)
  await $.prompt.submit({ text: 'Build it', cursor: 0, origin: { kind: 'composer' } } as never)
  await clock.advance(2_000)
  await $.agent.spawn({ tool_use_id: 't0', prompt: 'p', description: 'Engineer: the parser', subagentType: 'mc-heavy', provider: 'engine', parentModel: 'claude-opus-5-5', background: false, fork: false } as never)
  return clock
}
const cardOf = async ($: Engine): Promise<string> => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: { title: '', isFocused: false, bodyColumns: 97, placement: 'dock', scroll: { offset: 0, bodyRows: 45 }, view: {} } } as never)
  const src = (await ui.findAll({ type: 'Svg' })).map(el => ({ alt: String(el.props.alt), source: String(el.props.source) })).find(v => v.alt.startsWith('Engineer: the parser'))?.source ?? ''
  await ui.unmount()
  return src
}

test('crab classic: a new crab scuttles in on its pane card, kept in the card (one send), stopped under reduced motion', async ($, on) => {
  const clock = await setup($, on, 'crab-classic')
  await clock.advance(300)
  const early = await cardOf($)
  expect(early).toContain('class="cl-in"')
  // Long after the entrance the card still carries it unchanged: no second send just to drop it.
  await clock.advance(20_000)
  const late = await cardOf($)
  expect(late).toContain('class="cl-in"')
  // Pinned to the agent's start: a drawing 0.3 s in is 0.3 s into the entrance, one 20.3 s in long past it (no replay).
  const delay = (s: string) => Number(/<g class="cl-in" style="animation-delay:(-?[\d.]+)s">/.exec(s)?.[1])
  expect(Math.abs(delay(early) + 0.3)).toBeLessThan(0.05)
  expect(Math.abs(delay(late) + 20.3)).toBeLessThan(0.05)
  // Cheap at rest: one short, non-repeating animation; still under reduced motion.
  expect(SCUTTLE_CARD_CSS).not.toContain('infinite')
  expect(SCUTTLE_CARD_CSS).toContain('prefers-reduced-motion: reduce')
  expect(SCUTTLE_CARD_CSS.length).toBeLessThan(300)
  // Never drawn ahead of its moment (a card drawn before the agent's start is plain).
  expect(scuttleCard('<g/>', T0 + 5_000, T0)).toBe('<g/>')
})
test('the default skin keeps its cards plain (the scuttle is Crab Classic only)', async ($, on) => {
  const clock = await setup($, on, 'default')
  await clock.advance(300)
  const card = await cardOf($)
  expect(card.length).toBeGreaterThan(0)
  expect(card).not.toContain('cl-in')
})
