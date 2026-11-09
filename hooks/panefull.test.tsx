import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { THEME_KEYS } from './themes'
import type { ThemeKey } from './themes'
import { AHEAD_MS, duelPlan, showdownPlan, variantsPlan } from './invincible-eggs'

// The pane must not fall back to its "short view" because of how long the session has run. A plan, two agents at work
// and a hundred finished ones is the everyday case: it draws in full, within what the desktop app can hold (a whole
// drawing under 262,144 characters, each Svg under 131,072), on every skin. A bigger crew gives up its least
// important parts one section at a time; the short view is the last resort.

const PLUGIN = 'crab-progress'
const MAX_CHARS = 262_144
const MAX_NODES = 2_000
const MAX_SVG = 131_072
const NOW = Date.parse('2026-10-20T10:00:00Z')
const SHORT = 'this is the short view'

/** Every skin the mod can wear, hidden ones included, and what it takes to put each on. */
const WEARS: { label: string; skin: string; theme?: ThemeKey; after?: string }[] = [
  { label: 'default', skin: 'default' },
  { label: 'crab-classic', skin: 'crab-classic' },
  { label: 'mentalist', skin: 'mentalist', theme: 'mentalist' },
  { label: 'red-john', skin: 'red-john', theme: 'redjohn' },
  { label: 'breaking-bad', skin: 'breaking-bad', theme: 'breakingbad' },
  { label: 'heisenberg', skin: 'heisenberg', theme: 'heisenberg' },
  { label: 'better-call-saul', skin: 'better-call-saul', theme: 'bettercallsaul' },
  { label: 'gene', skin: 'gene', theme: 'gene' },
  { label: 'invincible', skin: 'invincible', theme: 'invincible' },
  { label: 'invincible (new suit)', skin: 'invincible', theme: 'invincible2', after: 'new suit' },
  { label: 'the-boys', skin: 'the-boys', theme: 'boys' },
  { label: 'the-boys (off book)', skin: 'the-boys', theme: 'boys2', after: 'shock and awe, my son' },
  { label: 'solidgold', skin: 'solidgold', theme: 'solidgold' },
  { label: 'caliper', skin: 'caliper dark', theme: 'caliper' },
  { label: 'caliper (light)', skin: 'caliper light', theme: 'caliperlight' },
  { label: 'cyberpunk-2077', skin: 'cyberpunk-2077' },
  { label: 'arasaka', skin: 'arasaka' },
  { label: 'lucy-edgerunners', skin: 'lucy-edgerunners' },
  { label: 'samurai', skin: 'samurai' },
  { label: 'edgerunners-2', skin: 'edgerunners-2', theme: 'edgerunners2' },
  { label: 'capricorn', skin: 'capricorn', theme: 'capricorn' },
]

const base = (on: On, at = NOW) => {
  const clock = mock.clock(on, { now: at })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on)
  on('settings.read', async () => ({ value: {} }) as never)
  on('fs.exists', async (_$, e) => ({ value: /addons[\\/]cyberpunk[\\/]addon\.json$/.test(String((e as { path: string }).path)) }) as never)
  on('tool.register', async () => ({ value: undefined }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
  on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
  on('ui.panes', async () => ({ value: [] }) as never)
  on('ui.toast', async () => ({ value: undefined }) as never)
  on('audio.play', async () => ({ value: undefined }) as never)
  on('tool.call', async () => ({ result: 'ok' }) as never)
  on('turn.complete', async () => ({ text: '' }) as never)
  on('prompt.submit', async (_$, e) => ({ text: (e as { text: string }).text }) as never)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: 100_000 }, rateLimits: [], cost: { usd: 6.59 } } }) as never)
  let n = 0
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: `a${++n}` }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  return clock
}

const TYPES = ['Explore', 'general-purpose', 'Plan', 'mc-heavy', 'mc-medium', 'mc-light']
const PLAN = Array.from({ length: 8 }, (_, i) => `Engineer: piece ${i + 1} of the plan`)

/** A session as it looks after a long afternoon: a plan, `active` agents at work, `done` finished (some nested). */
const session = async ($: Engine, wear: (typeof WEARS)[number], active: number, done: number) => {
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  const said = String(((await $.command.run({ command: 'skin', args: wear.skin } as never)) as { text?: string }).text)
  expect(said, `${wear.label} is worn`).toMatch(/^Skin: /)
  await $.prompt.submit({ text: 'Big job', cursor: 0 } as never)
  if (wear.after) await $.prompt.submit({ text: wear.after, cursor: 0 } as never)
  await $.tool.call({ tool: 'mcp__crab-progress__progress', title: 'Big', total: 8, done: 3, minutes: 60, phase: 'delegate', tasks: PLAN.map(title => ({ title, tier: 'medium', minutes: 5 })) } as never)
  for (let i = 0; i < active + done; i++)
    await $.agent.spawn({
      tool_use_id: `t${i}`,
      prompt: 'p',
      description: `Task number ${i} doing a fairly long description of work`,
      subagentType: TYPES[i % TYPES.length],
      provider: 'engine',
      parentModel: 'claude-opus-5-5',
      parentAgentId: i > 3 && i % 7 === 0 ? `a${i - 1}` : undefined,
      background: false,
      fork: false,
    } as never)
  // The oldest `done` finish, a few at a time (every finish writes the same list).
  for (let c = 0; c < done; c += 3)
    await Promise.all(Array.from({ length: Math.min(3, done - c) }, (_, k) => $.turn.complete({ agentId: `a${c + k + 1}`, reason: 'answer', answer: 'ok' } as never)))
}

type Node = { type?: string; props?: Record<string, unknown>; children?: unknown[] }
const own = (o: Record<string, unknown> | undefined) => Object.entries(o ?? {}).reduce((s, [k, v]) => s + k.length + (typeof v === 'string' ? v.length : 0), 0)
/** The drawing, counted the way the app counts it. */
const measure = (root: unknown) => {
  const r = { chars: 0, nodes: 0, maxSvg: 0, alts: [] as string[], texts: [] as string[], labels: [] as string[], sources: [] as string[] }
  const walk = (x: unknown): void => {
    if (Array.isArray(x)) return x.forEach(walk)
    r.nodes++
    if (typeof x === 'string') {
      r.chars += x.length
      r.texts.push(x)
      return
    }
    if (!x || typeof x !== 'object') return
    const n = x as Node
    const p = n.props ?? {}
    if (n.type === 'Svg') {
      const src = String(p.source ?? '')
      r.chars += src.length + String(p.alt ?? '').length
      r.maxSvg = Math.max(r.maxSvg, src.length)
      r.alts.push(String(p.alt ?? ''))
      r.sources.push(src)
    } else if (n.type === 'Button') {
      r.chars += String(p.key ?? '').length + String(p.label ?? '').length + PLUGIN.length
      r.labels.push(String(p.label ?? ''))
    } else r.chars += own(p)
    for (const c of n.children ?? []) walk(c)
  }
  walk(root)
  return { ...r, isShort: JSON.stringify(root).includes(SHORT) }
}

const look = async ($: Engine, columns: number) => {
  const ui = await $.ui.mount({
    plugin: PLUGIN,
    surface: 'desktop',
    component: 'Pane',
    requestId: 'crab-agents',
    props: { title: '', isFocused: false, bodyColumns: columns, placement: 'dock', scroll: { offset: 0, bodyRows: 45 }, view: {} } as never,
  })
  const m = measure(await ui.drawn())
  await ui.unmount()
  return m
}

/** Within both caps of the desktop app, and something is drawn. */
const underCaps = (m: ReturnType<typeof measure>, label: string) => {
  expect(m.chars, `${label}: whole drawing`).toBeLessThan(MAX_CHARS)
  expect(m.nodes, `${label}: nodes`).toBeLessThan(MAX_NODES)
  expect(m.maxSvg, `${label}: biggest Svg`).toBeLessThanOrEqual(MAX_SVG)
  expect(m.alts.length).toBeGreaterThan(0)
}
/** The long view, not the short one. */
const isFull = (m: ReturnType<typeof measure>, label: string) => {
  expect(m.isShort, `${label}: the short view`).toBe(false)
  expect(m.alts.some(a => a.startsWith('Manager:')), `${label}: the manager card`).toBe(true)
  expect(m.alts.some(a => a.startsWith('Workflow:')), `${label}: the workflow`).toBe(true)
  expect(m.labels.some(l => l.includes('Finished')), `${label}: the finished toggle`).toBe(true)
}

for (const wear of WEARS)
  test(`always full: ${wear.label}: a plan, 2 at work and 100 finished draw the full pane, under both caps`, { timeoutMs: 60_000 }, async ($, on) => {
    base(on)
    await session($, wear, 2, 100)
    for (const columns of [50, 120]) {
      const m = await look($, columns)
      const label = `${wear.label} at ${columns} columns`
      underCaps(m, label)
      isFull(m, label)
      // Both agents at work have a row; the hundred are the newest few (with whatever they started) and one chip for the rest.
      expect(m.alts.filter(a => a.startsWith('Task number') && a.endsWith('running')).length, `${label}: running rows`).toBe(2)
      const chip = m.alts.find(a => /^\+\d+ more agents finished/.test(a))
      expect(chip, `${label}: the +N finished chip`).toBeDefined()
      expect(Number(/^\+(\d+)/.exec(chip ?? '')?.[1])).toBeGreaterThanOrEqual(90)
      expect(m.alts.filter(a => a.startsWith('Task number')).length, `${label}: rows drawn`).toBeLessThan(16)
    }
  })

// Chin's own session (Invincible, 2 at work, nothing like a hundred finished): a long plan, a few finished agents and a
// busy replay. The pane used to hold 100,000 characters back for THE FIGHT all the while a job worked, and had no
// step between "no cards" and the short view, so this tipped it over with only a handful of agents.
for (const wear of WEARS)
  test(`always full: ${wear.label}: a 23-task plan, 2 at work, 6 finished and 40 tool calls draw the full pane`, { timeoutMs: 60_000 }, async ($, on) => {
    base(on)
    await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
    await $.command.run({ command: 'skin', args: wear.skin } as never)
    await $.prompt.submit({ text: 'Big job', cursor: 0 } as never)
    if (wear.after) await $.prompt.submit({ text: wear.after, cursor: 0 } as never)
    await $.tool.call({
      tool: 'mcp__crab-progress__progress',
      title: 'Big',
      total: 23,
      done: 6,
      minutes: 120,
      phase: 'delegate',
      tasks: Array.from({ length: 23 }, (_, i) => ({ title: `${i % 2 ? 'Artist' : 'Designer'}: step number ${i} of the long plan`, tier: 'medium', minutes: 5 })),
    } as never)
    for (let i = 0; i < 8; i++)
      await $.agent.spawn({ tool_use_id: `t${i}`, prompt: 'p', description: i % 2 ? 'Artist: draw the sprite sheet' : 'Designer: pick the palette', subagentType: 'general-purpose', provider: 'engine', parentModel: 'claude-opus-5-5', background: false, fork: false } as never)
    for (let i = 0; i < 6; i++) await $.turn.complete({ agentId: `a${i + 1}`, reason: 'answer', answer: 'ok' } as never)
    for (let i = 0; i < 40; i++) await $.tool.call({ tool: i % 3 ? 'Bash' : 'Edit', input: { command: `npm run thing-${i}`, file_path: `/repo/src/file${i}.ts` } } as never).catch(() => undefined)
    for (const columns of [50, 120]) {
      const m = await look($, columns)
      const label = `${wear.label} at ${columns} columns`
      underCaps(m, label)
      isFull(m, label)
      expect(m.alts.filter(a => a.startsWith('Artist') || a.startsWith('Designer')).filter(a => a.endsWith('running')).length, `${label}: running rows`).toBe(2)
    }
  })

test('always full: every theme and every skin the list offers is covered above', async ($, on) => {
  base(on)
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  const text = String(((await $.command.run({ command: 'skin', args: 'list' } as never)) as { text?: string }).text)
  const listed = [...text.matchAll(/^[▸ ] (\S+) {2}/gm)].map(x => x[1] as string)
  expect(listed.length).toBeGreaterThanOrEqual(8)
  const worn = new Set(WEARS.map(w => w.skin.split(' ')[0]))
  for (const id of listed) expect(worn.has(id), `skin ${id} has a test`).toBe(true)
  const themes = new Set(WEARS.flatMap(w => (w.theme ? [w.theme] : [])))
  for (const key of THEME_KEYS) expect(themes.has(key), `theme ${key} has a test`).toBe(true)
})

// Not an everyday crew: twenty agents at work and a hundred finished. Whatever the skin, the pane keeps all twenty in
// a row each and gives up parts of the decoration before it gives up the full view.
for (const label of ['default', 'invincible', 'heisenberg', 'caliper', 'better-call-saul', 'edgerunners-2', 'mentalist']) {
  const wear = WEARS.find(w => w.label === label) as (typeof WEARS)[number]
  test(`always full: ${label}: 20 at work and 100 finished still draw the full pane (parts dropped one by one if need be)`, { timeoutMs: 60_000 }, async ($, on) => {
    base(on)
    await session($, wear, 20, 100)
    for (const columns of [50, 120]) {
      const m = await look($, columns)
      const at = `${label} at ${columns} columns`
      underCaps(m, at)
      isFull(m, at)
      expect(m.alts.filter(a => a.startsWith('Task number') && a.endsWith('running')).length, `${at}: running rows`).toBe(20)
    }
  })
}

test('always full: a crew too big even for slim rows (250 at work) is the only thing that reaches the short view', async ($, on) => {
  base(on)
  await session($, WEARS[1] as (typeof WEARS)[number], 250, 0)
  const m = await look($, 120)
  underCaps(m, '250 at work')
  expect(m.isShort).toBe(true)
})

// Invincible's big eggs weigh a lot (THE FIGHT ~95,000 characters): while a job works the pane keeps 100,000 free for
// them, so the layout does not change as they come and go, and gives up parts of its decoration to make the room.
const fightAt = (era: 1 | 2 = 1): number => {
  for (let t = NOW; ; t += 60_000) {
    const p = duelPlan(t, era)
    if (p.on && !(showdownPlan(p.startAt, era).startAt < p.endAt + 5000 && showdownPlan(p.startAt, era).endAt > p.startAt - 5000)) return p.startAt
  }
}
const quietAt = (): number => {
  for (let t = NOW; ; t += 61_000) {
    const near = (p: { startAt: number; endAt: number }) => t + 2 * AHEAD_MS > p.startAt && t < p.endAt + 60_000
    if (!near(duelPlan(t, 1)) && !near(duelPlan(t + 120_000, 1)) && !near(showdownPlan(t, 1)) && !near(showdownPlan(t + 120_000, 1)) && !near(variantsPlan(t)) && !near(variantsPlan(t + 120_000))) return t
  }
}
const INVINCIBLE = WEARS.find(w => w.label === 'invincible') as (typeof WEARS)[number]

test('always full: Invincible at work keeps the fight\'s room (100,000 characters) free and still draws the full pane', { timeoutMs: 60_000 }, async ($, on) => {
  base(on, quietAt())
  await session($, INVINCIBLE, 2, 100)
  const m = await look($, 120)
  underCaps(m, 'quiet')
  isFull(m, 'quiet')
  expect(m.sources.some(s => s.includes('<!--dl-->'))).toBe(false)
  // What the app counts without the fight, plus the reserve held for it, is under what the pane aims at (220,000).
  expect(m.chars + 100_000).toBeLessThanOrEqual(220_000)
})

test('always full: Invincible while THE FIGHT plays still draws the full pane, the fight in it, under both caps', { timeoutMs: 60_000 }, async ($, on) => {
  const clock = base(on, fightAt() - 20_000)
  await session($, INVINCIBLE, 2, 100)
  await clock.advance(25_000)
  const m = await look($, 120)
  underCaps(m, 'fight')
  isFull(m, 'fight')
  expect(m.sources.some(s => s.includes('<!--dl-->')), 'the fight is in the drawing').toBe(true)
})

test('always full: Invincible after a typed think, mark still draws the full pane, with 100 finished agents', { timeoutMs: 60_000 }, async ($, on) => {
  const clock = base(on, quietAt())
  await session($, INVINCIBLE, 2, 100)
  await $.prompt.submit({ text: 'think, mark', cursor: 0 } as never)
  await clock.advance(1_000)
  const m = await look($, 120)
  underCaps(m, 'think, mark')
  isFull(m, 'think, mark')
})

for (const era of [1, 2] as const) {
  for (const working of [true, false]) {
    test(`always full: Invincible (era ${era}, ${working ? 'at work' : 'idle'}) while THE MULTIVERSE plays still draws the full pane, under both caps`, { timeoutMs: 60_000 }, async ($, on) => {
      const clock = base(on, quietAt())
      await session($, era === 2 ? (WEARS.find(w => w.label === 'invincible (new suit)') as (typeof WEARS)[number]) : INVINCIBLE, working ? 2 : 0, 100)
      const quiet = await look($, 120)
      expect(quiet.sources.some(s => s.includes('<!--dl-->'))).toBe(false)
      await $.prompt.submit({ text: 'multiverse', cursor: 0 } as never)
      await clock.advance(3_000)
      const m = await look($, 120)
      underCaps(m, 'multiverse')
      isFull(m, 'multiverse')
      expect(m.sources.some(s => s.includes('<!--dl--><g pointer-events="none" data-egg="variants"')), 'the act is in the drawing').toBe(true)
    })
  }
}

test('always full: the finished toggle and each row\'s Open button still work with the chip', { timeoutMs: 60_000 }, async ($, on) => {
  base(on)
  await session($, WEARS[1] as (typeof WEARS)[number], 2, 100)
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: { title: '', isFocused: false, bodyColumns: 120, placement: 'dock', scroll: { offset: 0, bodyRows: 45 }, view: {} } as never })
  const opens = (await ui.findAll({ type: 'Button' })).filter(b => String(b.props.label) === 'Open ▸')
  expect(opens.length).toBeGreaterThanOrEqual(8)
  await ui.press({ key: 'done' })
  const folded = measure(await ui.drawn())
  await ui.unmount()
  expect(folded.alts.filter(a => a.startsWith('Task number')).length).toBe(2)
  expect(folded.alts.some(a => /^\+100 more agents finished/.test(a))).toBe(true)
})
