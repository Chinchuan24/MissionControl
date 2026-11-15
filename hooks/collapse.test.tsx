import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { liveText, steadyTree } from './smooth'

// "Collapse, then Expand, and the whole pane glitches." A small crew on a skin with
// big cards sat at the pane's size limit: it was measured with every source raw (the
// app gets them compacted, a third shorter), and with no margin, so a few characters
// more or less (a log line, a roamer's visit) flipped the whole pane between layouts
// (cards, slim rows, the short view) redraw after redraw. And on Expand every card came
// back as a new image with a source pinned to the start of the one that had gone.

const T0 = Date.parse('2026-10-19T10:00:00Z')
// A seasoned person's store: the cards a skin with eggs draws are at their fullest.
const SEED: Record<string, unknown> = {
  cred: { xp: 5992, jobs: 314, longJobs: 94, agents: 636, crewJobs: 15, nightJobs: 93, chromed: true, samurai: false, badges: ['choom', 'merc', 'netrunner', 'owl', 'chromed', 'edgerunner', 'legend', 'crewboss'] },
  legends: [45, 27, 60, 60, 60].map((n, i) => ({ task: `A long job number ${i} that took a while to finish properly`.padEnd(n, '.').slice(0, n), costUsd: 20 + i * 7.5, at: T0 - (i + 1) * 3_600_000, ms: 3_000_000 + i * 600_000 })),
  today: { date: '2026-10-19', tasks: 101, agents: 37, tokens: 588_542_875, costUsd: 189.39 },
  allTime: { since: '2026-09-20T06:36:30.675Z', models: { 'claude-opus-5-5': 6_660_303_105, 'claude-sonnet-5-5': 514_351_605, 'claude-haiku-5-5': 8_161_277 } },
  oneShot: 'on',
}

type Node = { type?: string; props?: Record<string, unknown>; children?: unknown[] }

const crew = async ($: Engine, on: On, skin: string) => {
  const clock = mock.clock(on, { now: T0 })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on, structuredClone(SEED))
  on('settings.read', async () => ({ value: {} }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('fs.exists', async (_$, e) => ({ value: /addons[\\/]cyberpunk[\\/]addon\.json$/.test(String((e as { path: string }).path)) }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: 400_000 }, rateLimits: [], cost: { usd: 12 } } }) as never)
  on('ui.toast', async () => ({ value: undefined }) as never)
  on('tool.call', async () => ({ result: 'ok' }) as never)
  on('turn.complete', () => ({ text: '' }) as never)
  on('prompt.submit', async (_$, e) => ({ text: (e as { text: string }).text }) as never)
  let n = 0
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: `a${++n}` }) as never)
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  await $.command.run({ command: 'skin', args: skin } as never)
  await $.prompt.submit({ text: 'Build the new skins and verify them all', cursor: 0, origin: { kind: 'composer' } } as never)
  const names = ['Engineer: Breaking Bad skin cards', 'Designer: Edgerunners 2 skin', 'Researcher: Edgerunners lore']
  for (const [i, type] of ['mc-heavy', 'mc-medium', 'Explore'].entries())
    await $.agent.spawn({ tool_use_id: `t${i}`, prompt: 'p', description: names[i], subagentType: type, provider: 'engine', parentModel: 'claude-opus-5-5', background: false, fork: false } as never)
  return clock
}
// The main desktop pane at about 780 px.
const mount = ($: Engine) =>
  $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: { title: '', isFocused: false, bodyColumns: 97, placement: 'dock', scroll: { offset: 0, bodyRows: 45 }, view: {} } } as never)
const fillLog = async ($: Engine, clock: { advance: (ms: number) => Promise<unknown> }) => {
  for (let i = 0; i < 14; i++) {
    await $.tool.call({ tool: 'Bash', command: `npm test -- --grep step-${i} && echo a long command line to fill the log`, agentId: `a${(i % 3) + 1}` } as never).catch(() => undefined)
    await clock.advance(1_000)
  }
}

const svgs = (root: unknown) => {
  const out: { alt: string; source: string }[] = []
  const walk = (x: unknown): void => {
    if (Array.isArray(x)) return x.forEach(walk)
    if (!x || typeof x !== 'object') return
    const n = x as Node
    if (n.type === 'Svg') out.push({ alt: String(n.props?.alt), source: String(n.props?.source ?? '') })
    for (const c of n.children ?? []) walk(c)
  }
  walk(root)
  return out
}
// Which layout is drawn: running cards, slim rows, the hierarchy's drawing, the short view.
const layout = (root: unknown) => {
  const all = svgs(root)
  const agents = all.filter(v => /: (Opus|Sonnet|Haiku)[^,]*, running/.test(v.alt))
  const slim = agents.filter(v => /^<svg[^>]*\sheight="36"/.test(v.source)).length
  const org = all.find(v => v.alt.startsWith('Hierarchy'))?.source.length ?? 0
  const isShort = !all.some(v => v.alt.startsWith('Manager:'))
  return `${isShort ? 'short' : 'full'} cards=${agents.length - slim} slim=${slim} org=${org > 20_000 ? 'rich' : 'light'}`
}
const sentChars = (root: unknown) => svgs(root).reduce((sum, v) => sum + v.source.length + v.alt.length, 0)

for (const skin of ['breaking-bad', 'crab-classic', 'mentalist', 'edgerunners-2'])
  // Ten minutes of redraws on a skin with big cards: slower than the 5-second default on a busy machine.
  test(`${skin}: after Collapse then Expand the pane draws as before and holds its layout as the work goes on`, { timeoutMs: 20_000 }, async ($, on) => {
    const clock = await crew($, on, skin)
    const ui = await mount($)
    await fillLog($, clock)
    const before = layout(await ui.drawn())
    await ui.press({ key: 'compact' })
    expect(layout(await ui.drawn())).toMatch(/^short/)
    await ui.press({ key: 'compact' })
    expect(layout(await ui.drawn())).toBe(before)
    // Ten minutes of work: the layout never flips (to the short view and back, cards to rows).
    const seen: string[] = []
    for (let i = 0; i < 40; i++) {
      if (i % 3 === 0) await $.tool.call({ tool: 'Read', file_path: `/repo/src/file-${i}.ts`, agentId: `a${(i % 3) + 1}` } as never).catch(() => undefined)
      await clock.advance(15_000)
      const root = await ui.drawn()
      const now = layout(root)
      if (seen.at(-1) !== now) seen.push(now)
      expect(sentChars(root)).toBeLessThan(262_144)
    }
    await ui.unmount()
    expect(seen).toEqual([before])
    // Three agents are few: no short view, every one in a row of its own.
    expect(before).toMatch(/^full /)
    expect(Number(/cards=(\d)/.exec(before)?.[1]) + Number(/slim=(\d)/.exec(before)?.[1])).toBe(3)
  })

for (const skin of ['breaking-bad', 'mentalist'])
  test(`${skin}: three agents keep their cards, the pane measured as it is sent`, async ($, on) => {
    const clock = await crew($, on, skin)
    await fillLog($, clock)
    const ui = await mount($)
    const root = await ui.drawn()
    await ui.unmount()
    expect(layout(root)).toBe('full cards=3 slim=0 org=rich')
    expect(sentChars(root)).toBeLessThan(262_144)
  })

test('steadyTree: a drawing that comes back after one without it is phased to its new start', () => {
  const strip = liveText(10, 20, T0, 12, 'class="t"', t => String(Math.floor((t - T0) / 1000)))
  const card = { type: 'Box', props: {}, children: [{ type: 'Svg', key: 'card', props: { key: 'card', source: `<svg>${strip}</svg>`, alt: 'card' } }] }
  const none = { type: 'Box', props: {}, children: [{ type: 'Svg', key: 'other', props: { key: 'other', source: '<svg/>', alt: 'other' } }] }
  const sourceOf = (tree: unknown) => String(((tree as Node).children?.[0] as Node).props?.source)
  const delayOf = (src: string) => Number(/animation-delay:(-?[\d.]+)s/.exec(src)?.[1])
  const first = sourceOf(steadyTree(card, 'test:back', T0 + 5_000))
  // Drawn again while it stays: the very same source (no new image, no restart).
  expect(sourceOf(steadyTree(card, 'test:back', T0 + 8_000))).toBe(first)
  expect(delayOf(first)).toBe(-5)
  // Gone for a drawing (the pane collapsed), back 20 s later (expanded): a new image,
  // its strip standing on the second it is drawn at, not the one the old image began at.
  steadyTree(none, 'test:back', T0 + 10_000)
  const back = sourceOf(steadyTree(card, 'test:back', T0 + 25_000))
  expect(delayOf(back)).toBe(-25)
  expect(sourceOf(steadyTree(card, 'test:back', T0 + 26_000))).toBe(back)
})

// --- A running agent's slim row opens to its full card, as a finished row does.

const W97 = Math.max(240, Math.min(1100, Math.round(97 * 10) - 8))
const six = async ($: Engine, on: On, store: Record<string, unknown> = {}) => {
  const clock = mock.clock(on, { now: T0 })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  const kv = new Map<string, unknown>(Object.entries(store))
  const reads = { pane: 0 }
  on('store.get', async (_$, e) => {
    const k = (e as { key: string }).key
    if (k === 'legends') reads.pane++
    return { value: structuredClone(kv.get(k)) } as never
  })
  on('store.set', async (_$, e) => {
    kv.set((e as { key: string }).key, structuredClone((e as { value: unknown }).value))
    return { value: undefined } as never
  })
  on('settings.read', async () => ({ value: {} }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('fs.exists', async () => ({ value: false }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  on('ui.toast', async () => ({ value: undefined }) as never)
  on('tool.call', async () => ({ result: 'ok' }) as never)
  on('turn.complete', () => ({ text: '' }) as never)
  let n = 0
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: `a${++n}` }) as never)
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  await $.command.run({ command: 'skin', args: 'crab-classic' } as never)
  for (let i = 0; i < 6; i++)
    await $.agent.spawn({ tool_use_id: `t${i}`, prompt: 'p', description: `Engineer: piece ${i}`, subagentType: 'mc-heavy', provider: 'engine', parentModel: 'claude-opus-5-5', background: false, fork: false } as never)
  await $.tool.call({ tool: 'Bash', command: 'npm run build', agentId: 'a1' } as never).catch(() => undefined)
  return { clock, kv, reads }
}
type Row = { alt: string; source: string; isSlim: boolean }
const rowsOf = async (ui: Awaited<ReturnType<typeof mount>>) => {
  const root = await ui.drawn()
  const buttons = (await ui.findAll({ type: 'Button' })).map(b => ({ key: String(b.props.key), label: String(b.props.label) }))
  const rows: Row[] = svgs(root)
    .filter(v => /^Engineer: piece \d/.test(v.alt))
    .map(v => ({ alt: v.alt, source: v.source, isSlim: /^<svg[^>]*\sheight="36"/.test(v.source) }))
  return { root, rows, buttons }
}
const slimOpen = (buttons: { key: string; label: string }[]) => buttons.filter(b => b.label === 'Open ▸').map(b => b.key)

test('a running agent past the cards has a slim row with Open ▸; it opens to its full card and closes again', async ($, on) => {
  const { clock, reads } = await six($, on)
  const ui = await mount($)
  const first = await rowsOf(ui)
  // Four cards, two slim live rows, each with its own Open button.
  expect(first.rows.filter(r => r.isSlim).length).toBe(2)
  const opens = slimOpen(first.buttons)
  expect(opens.length).toBe(2)
  const slimAlt = first.rows.find(r => r.isSlim)?.alt ?? ''
  // The slim row shrinks by the button's share: both end at the pane's edge.
  const slimSrc = first.rows.find(r => r.isSlim)?.source ?? ''
  expect(Number(/^<svg[^>]*\swidth="(\d+(?:\.\d+)?)"/.exec(slimSrc)?.[1]) + 80).toBe(W97)
  const pieceN = Number(/piece (\d)/.exec(slimAlt)?.[1])
  const who = `Engineer: piece ${pieceN}:`
  await $.tool.call({ tool: 'Read', file_path: '/repo/src/login.ts', agentId: `a${pieceN + 1}` } as never).catch(() => undefined)
  await ui.press({ key: opens[0] as string })
  const open = await rowsOf(ui)
  // That agent now has its card; the other stays slim.
  expect(open.rows.filter(r => r.isSlim).length).toBe(1)
  const card = open.rows.find(r => r.alt.startsWith(who))
  expect(card?.isSlim).toBe(false)
  // The full card: what it is doing now, the model, effort, context, cost, time, and the Ultra switch.
  expect(card?.alt).toMatch(/Opus 5\.5, running/)
  for (const field of ['reading login.ts', 'Opus 5.5', 'Model', 'Effort', 'Context', 'Cost', 'Time']) expect(card?.source).toContain(field)
  expect(open.buttons.some(b => b.label === '▴ Collapse')).toBe(true)
  expect(open.buttons.filter(b => /Turn Ultra (on|off)/.test(b.label)).length).toBe(5)
  // Opening is one redraw, not a storm; then the live card still moves with its work.
  const n0 = reads.pane
  for (let i = 0; i < 30; i++) await clock.advance(100)
  expect(reads.pane - n0).toBeLessThanOrEqual(1)
  await $.tool.call({ tool: 'mcp__crab-progress__step', done: 2, total: 4, agentId: `a${pieceN + 1}` } as never)
  const moved = (await rowsOf(ui)).rows.find(r => r.alt.startsWith(who))
  expect(moved?.isSlim).toBe(false)
  expect(moved?.source).not.toBe(card?.source)
  // Collapse folds it back to its slim live row (every card has one: this agent's own).
  await ui.press({ key: `close-a${pieceN + 1}` })
  const back = await rowsOf(ui)
  await ui.unmount()
  expect(back.rows.find(r => r.alt.startsWith(who))?.isSlim).toBe(true)
  expect(slimOpen(back.buttons).length).toBe(2)
})

// --- "The whole panel flickers and the card snaps back open" when a card is collapsed while agents work.
// A Collapse only took the agent off the opened list, so a running one fell back on the pane's own rule (the
// first few running agents get a card) and its card came right back. And the pane's size fallback was free to
// change on the click: a card less made room for a richer layout, so every other card, section and picture was
// drawn anew (and other agents' cards snapped open too).

// Agents at work in a seasoned store, `n` of them, on a skin.
const working = async ($: Engine, on: On, skin: string, n: number) => {
  const clock = mock.clock(on, { now: T0 })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on, structuredClone(SEED))
  on('settings.read', async () => ({ value: {} }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('fs.exists', async (_$, e) => ({ value: /addons[\\/]cyberpunk[\\/]addon\.json$/.test(String((e as { path: string }).path)) }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: 400_000 }, rateLimits: [], cost: { usd: 12 } } }) as never)
  on('ui.toast', async () => ({ value: undefined }) as never)
  on('tool.call', async () => ({ result: 'ok' }) as never)
  on('turn.complete', () => ({ text: '' }) as never)
  on('prompt.submit', async (_$, e) => ({ text: (e as { text: string }).text }) as never)
  let k = 0
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: `a${++k}` }) as never)
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  await $.command.run({ command: 'skin', args: skin } as never)
  await $.prompt.submit({ text: 'Build the new skins and verify them all', cursor: 0, origin: { kind: 'composer' } } as never)
  for (let i = 0; i < n; i++)
    await $.agent.spawn({ tool_use_id: `t${i}`, prompt: 'p', description: `Engineer: piece ${i}`, subagentType: 'mc-heavy', provider: 'engine', parentModel: 'claude-opus-5-5', background: false, fork: false } as never)
  // Past the skin switch's wipe (it plays on the first cards for about a second).
  await clock.advance(2_000)
  return clock
}
const finish = ($: Engine, id: string) => $.turn.complete({ agentId: id, reason: 'answer', answer: 'ok' } as never)
// Each agent's row as drawn: `C` its card, `s` its slim row (`a3:s`).
const shapes = (root: unknown) =>
  svgs(root)
    .filter(v => /^Engineer: piece \d/.test(v.alt))
    .map(v => `a${Number(/piece (\d+)/.exec(v.alt)?.[1]) + 1}:${/^<svg[^>]*\sheight="36"/.test(v.source) ? 's' : 'C'}`)
const shapeOf = (root: unknown, id: string) => shapes(root).find(s => s.startsWith(`${id}:`))?.slice(-1)
const firstSlim = (root: unknown) => shapes(root).find(s => s.endsWith(':s'))?.split(':')[0] as string

for (const skin of ['crab-classic', 'the-boys', 'edgerunners-2'])
  test(`${skin}: a collapsed card stays collapsed: ticks, an agent finishing, other toggles, a finish and a resume`, { timeoutMs: 20_000 }, async ($, on) => {
    const clock = await working($, on, skin, 6)
    const ui = await mount($)
    const x = firstSlim(await ui.drawn())
    await ui.press({ key: `open-${x}` })
    expect(shapeOf(await ui.drawn(), x)).toBe('C')
    // The newest agent finishes: x moves up among the first few running, which get a card by default.
    await finish($, x === 'a6' ? 'a5' : 'a6')
    await ui.press({ key: `close-${x}` })
    expect(shapeOf(await ui.drawn(), x)).toBe('s')
    // The work goes on: log lines, the ticks, another agent opened and collapsed.
    for (let i = 0; i < 4; i++) {
      await $.tool.call({ tool: 'Read', file_path: `/repo/src/file-${i}.ts`, agentId: 'a1' } as never).catch(() => undefined)
      await clock.advance(15_000)
      expect(shapeOf(await ui.drawn(), x)).toBe('s')
    }
    const y = shapes(await ui.drawn()).find(s => s.endsWith(':s') && !s.startsWith(`${x}:`))?.split(':')[0]
    if (y) {
      await ui.press({ key: `open-${y}` })
      await ui.press({ key: `close-${y}` })
    }
    expect(shapeOf(await ui.drawn(), x)).toBe('s')
    // It finishes, then is resumed (SendMessage): still collapsed, its slim row and Open ▸.
    await finish($, x)
    await $.agent.spawn({ tool_use_id: 'tr', prompt: 'p', description: 'Engineer: again', subagentType: 'mc-heavy', provider: 'engine', parentModel: 'claude-opus-5-5', background: false, fork: false, resume: { agentId: x } } as never)
    await clock.advance(1_000)
    const root = await ui.drawn()
    const labels = (await ui.findAll({ type: 'Button' })).map(b => `${String(b.props.key)}=${String(b.props.label)}`)
    await ui.unmount()
    expect(shapeOf(root, x)).toBe('s')
    expect(labels).toContain(`open-${x}=Open ▸`)
  })

test('every running card has ▴ Collapse; collapsed, it keeps its slim row while it works', async ($, on) => {
  const clock = await working($, on, 'crab-classic', 3)
  const ui = await mount($)
  expect(shapes(await ui.drawn())).toEqual(['a3:C', 'a2:C', 'a1:C'])
  await ui.press({ key: 'close-a2' })
  for (let i = 0; i < 3; i++) {
    await $.tool.call({ tool: 'Read', file_path: `/repo/src/f${i}.ts`, agentId: 'a2' } as never).catch(() => undefined)
    await clock.advance(20_000)
    expect(shapes(await ui.drawn())).toEqual(['a3:C', 'a2:s', 'a1:C'])
  }
  await ui.press({ key: 'open-a2' })
  expect(shapes(await ui.drawn())).toEqual(['a3:C', 'a2:C', 'a1:C'])
  await ui.unmount()
})

test('two cards collapsed in quick succession both stay collapsed (no lost write)', async ($, on) => {
  await working($, on, 'crab-classic', 3)
  for (const id of ['a1', 'a2']) await finish($, id)
  const ui = await mount($)
  await ui.press({ key: 'open-a1' })
  await ui.press({ key: 'open-a2' })
  await Promise.all([ui.press({ key: 'close-a1' }), ui.press({ key: 'close-a2' })])
  const labels = (await ui.findAll({ type: 'Button' })).map(b => `${String(b.props.key)}=${String(b.props.label)}`)
  await ui.unmount()
  expect(labels).toContain('open-a1=Open ▸')
  expect(labels).toContain('open-a2=Open ▸')
})

// The sources of a drawing by picture: the agent rows by agent, the rest by what they show. Read as sent: Breaking Bad's
// cards once numbered their SVG ids afresh at each drawing (every card drawn anew at every tick); their ids are stable now.
const pictures = (root: unknown) => new Map(svgs(root).map((v, i) => [/^Engineer: piece (\d+)/.exec(v.alt)?.[1] ? `a${Number(/piece (\d+)/.exec(v.alt)?.[1]) + 1}` : `${i}:${v.alt.split(':')[0]}`, v.source]))
for (const skin of ['breaking-bad', 'crab-classic', 'the-boys', 'edgerunners-2'])
  test(`${skin}: a Collapse redraws only the clicked card, and the layout holds while the work goes on`, { timeoutMs: 20_000 }, async ($, on) => {
    const clock = await working($, on, skin, 5)
    const ui = await mount($)
    const x = firstSlim(await ui.drawn())
    await ui.press({ key: `open-${x}` })
    // Some seconds of work, within the same minute: the pane redraws as x reads a file (pictures that
    // move with the time are drawn anew then, whatever the click). Then the click.
    await clock.advance(20_000)
    await $.tool.call({ tool: 'Read', file_path: '/repo/src/a.ts', agentId: x } as never).catch(() => undefined)
    const before = await ui.drawn()
    await ui.press({ key: `close-${x}` })
    const after = await ui.drawn()
    const was = pictures(before)
    const now = pictures(after)
    expect([...now.keys()]).toEqual([...was.keys()])
    const redrawn = [...now].filter(([k, src]) => was.get(k) !== src).map(([k]) => k)
    expect(redrawn).toEqual([x])
    // The ticks that follow keep that layout: no card snaps open, no section comes or goes.
    const layoutNow = shapes(after)
    for (let i = 0; i < 3; i++) {
      await clock.advance(10_000)
      const root = await ui.drawn()
      expect(shapes(root)).toEqual(layoutNow)
      expect(svgs(root).length).toBe(svgs(after).length)
    }
    await ui.unmount()
  })

test('an opened running card is kept in the store: a reload keeps it open, a gone agent is dropped', async ($, on) => {
  const { kv } = await six($, on, { paneView: { isCompact: false, isDoneCollapsed: false, expanded: ['ghost'] } })
  const ui = await mount($)
  const key = slimOpen((await rowsOf(ui)).buttons)[0] as string
  await ui.press({ key })
  await ui.unmount()
  const saved = kv.get('paneView') as { expanded?: string[] }
  // The opened agent is saved; the id of one no longer listed is not.
  expect(saved.expanded?.length).toBe(1)
  expect(saved.expanded).not.toContain('ghost')
  // A reload reads the view back from the store: the card is still open.
  await $.session.start({ source: 'resume', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  const again = await mount($)
  const after = await rowsOf(again)
  await again.unmount()
  expect(after.rows.filter(r => r.isSlim).length).toBe(1)
  expect(slimOpen(after.buttons).length).toBe(1)
  expect(after.buttons.some(b => b.label === '▴ Collapse')).toBe(true)
})


// --- "Opening a card on a pane that is already full makes the other cards shrink." The opened card is over and above the
// pane's own cards; on a full pane it did not fit, and the size fallback stepped down to fewer cards: the agents above it lost
// theirs on the click. Now the room comes out of the parts (crabs, the hierarchy's drawing, sections), never other cards.
for (const skin of ['breaking-bad', 'mentalist', 'better-call-saul', 'edgerunners-2', 'crab-classic'])
  test(`${skin}: opening a card on a full pane takes no other agent's card, and the layout holds after`, { timeoutMs: 20_000 }, async ($, on) => {
    const clock = await working($, on, skin, 6)
    const ui = await mount($)
    await clock.advance(20_000)
    const before = await ui.drawn()
    const x = firstSlim(before)
    expect(x, 'a slim row to open').toBeDefined()
    const cards = shapes(before).filter(sh => sh.endsWith(':C')).map(sh => sh.split(':')[0] as string)
    expect(cards.length, `${skin}: cards before`).toBeGreaterThanOrEqual(1)
    await ui.press({ key: `open-${x}` })
    const after = await ui.drawn()
    expect(shapeOf(after, x)).toBe('C')
    // Every card that was there is still a card, drawn as before (the same image: not even redrawn).
    const was = pictures(before)
    const now = pictures(after)
    for (const id of cards) {
      expect(shapeOf(after, id), `${skin}: ${id} keeps its card`).toBe('C')
      expect(now.get(id) === was.get(id), `${skin}: ${id} not redrawn`).toBe(true)
    }
    // No other agent is handed a card either, and the ticks that follow keep that layout.
    const layoutNow = shapes(after)
    expect(layoutNow.filter(sh => sh.endsWith(':C')).length).toBe(cards.length + 1)
    for (let i = 0; i < 3; i++) {
      await clock.advance(10_000)
      expect(shapes(await ui.drawn())).toEqual(layoutNow)
    }
    expect(sentChars(await ui.drawn())).toBeLessThan(262_144)
    await ui.unmount()
  })

// --- "Breaking Bad's cards get new internal ids on every redraw." On air, the Classroom and the band's desert numbered
// their <defs> ids from a counter, so every drawing was a new image (the app redrew the three of them at every tick).
for (const skin of ['breaking-bad', 'heisenberg'])
  test(`${skin}: a card drawn twice for the same moment is the same image (stable def ids), pane and band`, async ($, on) => {
    await working($, on, skin, 3)
    const draw = async () => {
      const ui = await mount($)
      const all = svgs(await ui.drawn())
      await ui.unmount()
      return all
    }
    const a = await draw()
    const b = await draw()
    const byAlt = (all: { alt: string; source: string }[]) => new Map(all.map(v => [v.alt, v.source]))
    const [ma, mb] = [byAlt(a), byAlt(b)]
    const named = [...ma.keys()].filter(k => /^(Classroom|On air)/.test(k))
    expect(named.length, `${skin}: the Classroom and On air cards`).toBe(2)
    for (const k of named) {
      expect(ma.get(k)).toMatch(/id="bb(chalk|scan)\d+"/)
      expect(mb.get(k) === ma.get(k), k).toBe(true)
    }
    const band = async () => {
      const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: true, maxRows: 14, bodyColumns: 126 } } as never)
      const src = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
      await ui.unmount()
      return src
    }
    const [b1, b2] = [await band(), await band()]
    expect(b1).toMatch(/id="bbclip\d+"/)
    expect(b2 === b1).toBe(true)
  })
