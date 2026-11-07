import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { CASTS } from './cast'
import { CAL_CSS, calBandH, calChip, calFoot, calGauge, calPal, calPip, calRatio, dial, ruler, vernier } from './caliper'
import { CAL_TOOLS, MARKS, RANKS, bootLine, calRankOf, calToast, calibrationCard, orgCard, readoutCard, traceCard } from './caliper-cards'
import type { CalOrgNode } from './caliper-cards'
import { BADGES } from './extras'
import type { Beat, Cred } from './extras'
import { THEMES } from './themes'

const FACES = ['dark', 'light'] as const
const geometryOf = (svg: string): string => svg.replace(/#[0-9A-Fa-f]{6}/g, '#')
const CRED: Cred = { xp: 1200, jobs: 12, longJobs: 3, agents: 20, crewJobs: 1, nightJobs: 0, chromed: false, samurai: false, badges: ['choom', 'merc', 'owl'] }
const BEATS: Beat[] = Array.from({ length: 9 }, (_, i) => ({ at: Date.parse('2026-10-20T10:00:00Z') + i * 61_000, tool: ['Read', 'Grep', 'Edit', 'Bash', 'Agent'][i % 5] as string, text: `file-${i}.ts`, who: 'Manager' }))
const LEGENDS = Array.from({ length: 6 }, (_, i) => ({ task: `Closed job number ${i}`, costUsd: 0.31 * (i + 1), at: 1_000 * i, ms: 240_000 + i * 60_000 }))
const STEPS = Array.from({ length: 12 }, (_, i) => ({ title: `${i + 1}. Step number ${i + 1}`, state: i < 7 ? 'done' : i === 7 ? 'running' : 'waiting', note: i === 7 ? '0:07' : '' }))
const ORG: CalOrgNode = {
  label: 'Manager', color: '#fff', kind: 'manager', status: 'running',
  children: [
    { label: 'Designer', color: '#8FB4E8', kind: 'role', children: [{ label: 'band mockups', color: '#8FB4E8', kind: 'agent', status: 'running', children: [] }, { label: 'palette', color: '#8FB4E8', kind: 'agent', status: 'done', children: [] }] },
    { label: 'Reviewer', color: '#7FC4A5', kind: 'role', children: [{ label: 'review the diff', color: '#7FC4A5', kind: 'agent', status: 'failed', children: [] }] },
  ],
}
const cardsOf = (face: 'dark' | 'light', W: number): string[] => [
  bootLine(W, face),
  calibrationCard(W, CRED, face, 'dark'),
  readoutCard(W, 'Redesign the Skins gallery grouping', true, 7, 12, LEGENDS, face, STEPS),
  traceCard(W, BEATS, -1, face),
  orgCard(W, ORG, face),
]

// ---------------------------------------------------------------- the drawers
test('palette: every text token reads at 4.5:1 or more on the surface it is drawn on, in both faces', () => {
  for (const face of FACES) {
    const P = calPal(face)
    for (const surface of [P.tile, P.tile2]) for (const t of ['text', 'subtext', 'muted'] as const) expect(calRatio(P[t], surface)).toBeGreaterThanOrEqual(4.5)
    // The accent is text only on the card (the mode link, the live word), never on the raised chip.
    expect(calRatio(P.accent, P.tile)).toBeGreaterThanOrEqual(4.5)
    expect(calRatio(P.accentInk, P.accent)).toBeGreaterThanOrEqual(4.5)
    for (const t of ['done', 'warn', 'alert'] as const) expect(calRatio(P[t], P.tile)).toBeGreaterThanOrEqual(4.5)
    // The hairlines, ticks and role pins are marks, not text: 1.3:1 for a rule, 3:1 for a pin.
    for (const c of P.roles) expect(calRatio(c, P.tile)).toBeGreaterThanOrEqual(3)
    expect(calRatio(P.hair, P.tile)).toBeGreaterThanOrEqual(1.5)
  }
  expect(calPal('dark').accent).toBe('#5AA9FF')
  expect(calPal('light').accent).toBe('#1F6FE0')
  expect(calPal('dark').bg).toBe('#0E1012')
  expect(calPal('light').bg).toBe('#F6F6F4')
})

test('geometry never flips: every card and mark has the same coordinates in both faces, and the same bytes on a redraw', () => {
  for (const W of [420, 560, 1100]) {
    const dark = cardsOf('dark', W)
    const light = cardsOf('light', W)
    dark.forEach((svg, i) => expect(geometryOf(svg)).toBe(geometryOf(light[i] as string)))
    // two draws with the same data are byte-identical (nothing reads the clock)
    expect(cardsOf('dark', W)).toEqual(dark)
  }
  const P = calPal('dark')
  const L = calPal('light')
  const parts = (p: typeof P) => [calFoot(p, 900, calBandH, { ctxPct: 96, overBudget: false, isWorking: true }), ruler(p, 64, 68, 400, 58, true), dial(p, 37, 56, 58, true), calChip(10, 22, 96, p).svg, calGauge(p, 64, 64, 400, 58, { working: true }), calPip(p, 'running', 40, 99)]
  parts(P).forEach((svg, i) => expect(geometryOf(svg)).toBe(geometryOf(parts(L)[i] as string)))
})

test('ruler: a tick every 10 px, the fill in the accent, the pending ticks in the hairline, a pulsing cursor; no cursor without a value', () => {
  const P = calPal('dark')
  const r = ruler(P, 0, 0, 200, 50, true)
  expect((r.match(/<rect x="\d+" y="-?\d+" width="1" height="\d" fill="#363D45"/g) ?? []).length).toBe(21)
  expect(r).toContain(`<rect x="0" y="0" width="100" height="2" fill="${P.accent}"/>`)
  expect(r).toMatch(/class="cal-live"/)
  const none = ruler(P, 0, 0, 200, null, true)
  expect(none).not.toContain('cal-live')
  expect(none).not.toContain(`fill="${P.accent}"`)
  expect(ruler(P, 0, 0, 200, 50, false)).not.toContain('cal-live')
  // the job-done wave pins each tick to the start, the cursor parks at 100 %
  const wave = ruler(P, 0, 0, 200, 100, { wave: { at: 5_000 } })
  expect(wave).toContain('cal-wave')
  expect(wave).toContain('@@T5000@@')
  expect(wave).toContain('width="200" height="2"')
})

test('dial: no accent arc at 0 %, a large arc at 100 %, the needle hunts only while a job runs', () => {
  const P = calPal('dark')
  expect(dial(P, 30, 30, 0, false)).not.toContain(`stroke="${P.accent}"`)
  const full = dial(P, 30, 30, 100, true)
  expect(full).toMatch(/A13 13 0 1 1 /)
  expect(full).toContain(`stroke="${P.accent}"`)
  expect(full).toContain('class="cal-needle"')
  expect(dial(P, 30, 30, 58, false)).not.toContain('cal-needle')
  expect(dial(P, 30, 30, 58, false)).not.toContain(`stroke="${P.accent}"`)
})

test('reduced motion: the stylesheet stops every animated class, and every class a drawer uses is among them', () => {
  const rule = CAL_CSS.split('prefers-reduced-motion')[1] as string
  for (const c of ['cal-live', 'cal-needle', 'cal-sweep', 'cal-wave', 'cal-vern']) expect(rule).toContain(c)
  expect(rule).toContain('animation:none')
  const used = new Set<string>()
  for (const face of FACES) {
    const P = calPal(face)
    const all = [...cardsOf(face, 560), calFoot(P, 900, calBandH, { ctxPct: 96, overBudget: true, isWorking: true }), calGauge(P, 64, 64, 400, 58, { working: true }), calGauge(P, 64, 64, 400, 58, { party: true, partyAt: 1 }), calChip(0, 22, 96, P).svg, calPip(P, 'running', 1, 1)]
    for (const svg of all) for (const m of svg.matchAll(/class="(cal-[a-z]+)"/g)) used.add(m[1] as string)
  }
  for (const c of used) if (c !== 'cal-edge' && c !== 'cal-pill') expect(rule).toContain(c)
  expect(used.size).toBeGreaterThanOrEqual(4)
})

test('corner: the crosshair is drawn only at 95 % context or over budget', () => {
  const P = calPal('dark')
  const cross = (ctxPct: number, overBudget: boolean) => /<g stroke="#363D45" shape-rendering="crispEdges"><line/.test(calFoot(P, 900, calBandH, { ctxPct, overBudget }))
  expect(cross(94, false)).toBe(false)
  expect(cross(95, false)).toBe(true)
  expect(cross(10, true)).toBe(true)
  // the 3 px status edge: accent while working, a hairline idle, done after the job
  expect(calFoot(P, 900, calBandH, { ctxPct: 1, overBudget: false, isWorking: true })).toContain(`class="cal-edge" x=".5" y="14" width="3" height="${calBandH - 28}" rx="1.5" fill="${P.accent}"`)
  expect(calFoot(P, 900, calBandH, { ctxPct: 1, overBudget: false })).toContain(`fill="${P.hair}"/>`)
  expect(calFoot(P, 900, calBandH, { ctxPct: 1, overBudget: false, party: true })).toContain(`fill="${P.done}"/>`)
})

test('chip: quiet below 85 %, OUT OF TOLERANCE to 94 %, OFF THE SCALE from 95 %', () => {
  const P = calPal('light')
  expect(calChip(0, 22, 84, P).w).toBe(0)
  expect(calChip(0, 22, 85, P).svg).toContain('OUT OF TOLERANCE')
  expect(calChip(0, 22, 85, P).svg).toContain(P.warn)
  expect(calChip(0, 22, 95, P).svg).toContain('OFF THE SCALE')
  expect(calChip(0, 22, 95, P).svg).toContain(P.alert)
})

test('CALIBRATION: eleven fine ticks under the cursor, the middle one the accent; ranks, marks and badge ids match the store', () => {
  const P = calPal('dark')
  const card = calibrationCard(560, CRED, 'dark', 'dark')
  expect((card.match(/<rect x="[\d.]+" y="112" width="1" height="\d" fill="#(?:363D45|5AA9FF)"/g) ?? []).length).toBe(11)
  expect((card.match(/y="112" width="1" height="5" fill="#5AA9FF"/g) ?? []).length).toBe(1)
  expect(vernier(P, 100, 112).match(/<rect /g)?.length).toBe(11)
  expect(card).toContain('>07<')
  expect(card).toContain('Fine adjustment')
  expect(card).toContain('1,200')
  expect(card).toContain('/ 1,400')
  expect(card).toContain('DARK')
  expect(calibrationCard(560, CRED, 'dark', 'auto')).toContain('AUTO · DARK')
  expect(calibrationCard(560, CRED, 'light', 'auto')).toContain('AUTO · LIGHT')
  expect(RANKS.length).toBe(10)
  expect(calRankOf(1)).toBe('Zeroed')
  expect(calRankOf(10)).toBe('Master gauge')
  expect(calRankOf(25)).toBe('Master gauge')
  expect(calToast(7)).toBe('LEVEL 07 · FINE ADJUSTMENT')
  // the same nine ids in the same order as the shared badges: the store and the awards are unchanged
  expect(MARKS.map(m => m.id)).toEqual(BADGES.map(b => b.id))
  expect(card.match(/stroke-dasharray="2 2"/g)?.length).toBe(MARKS.length - CRED.badges.length)
  // the secret mark stays veiled until found
  expect(card).toContain('???')
})

test('READOUT and TRACE: a window of six steps with the running one in view; the picked call in the accent; sizes depend on the data, not the face', () => {
  for (const face of FACES) {
    const P = calPal(face)
    const r = readoutCard(560, 'Redesign the Skins gallery grouping', true, 7, 12, LEGENDS, face, STEPS)
    expect(r).toContain('Working · step 8 of 12')
    expect(r).toContain('58%')
    expect(r).toContain('08')
    expect(r).not.toContain('>01<')
    expect(r).toContain('LOG BOOK')
    expect((r.match(/fill="#(?:5FC58F|1A7F4D)" shape-rendering/g) ?? []).length).toBeGreaterThanOrEqual(5)
    expect(r).toContain(P.accent)
    const t = traceCard(560, BEATS, -1, face)
    expect(t).toContain('9 of 9 · live')
    expect(t).toContain('SCAN')
    const older = traceCard(560, BEATS, 2, face)
    expect(older).toContain('3 of 9 · picked')
  }
  expect(readoutCard(560, '', false, 0, 0, [], 'dark')).toContain('No job running')
  expect(traceCard(560, [], -1, 'dark')).toContain('Nothing traced yet')
  expect(Object.keys(CAL_TOOLS)).toContain('Edit')
})

test('budgets: each drawing is far under the engine limit, even at the widest and the fullest', () => {
  for (const face of FACES) {
    const many = Array.from({ length: 40 }, (_, i) => ({ label: `agent number ${i}`, color: '#8FB4E8', kind: 'agent', status: 'running', children: [] }))
    const big = orgCard(1100, { ...ORG, children: many }, face)
    const all = [...cardsOf(face, 1100), big, traceCard(1100, Array.from({ length: 160 }, (_, i) => ({ ...(BEATS[i % 9] as Beat), at: i })), -1, face)]
    for (const svg of all) expect(svg.length).toBeLessThan(131_072)
    expect(cardsOf(face, 1100).reduce((n, s) => n + s.length, 0)).toBeLessThanOrEqual(260_000)
  }
})

test('the theme entry: two faces from one factory, no sprites, a flat classic', () => {
  expect(THEMES.caliper.face).toBe('dark')
  expect(THEMES.caliperlight.face).toBe('light')
  for (const key of ['caliper', 'caliperlight'] as const) {
    const th = THEMES[key]
    expect(th.slimBand).toBe(true)
    expect(th.slim?.h).toBe(calBandH)
    expect(th.slim?.ownEdge).toBe(true)
    expect(th.legends.hidden).toBe(true)
    expect(th.log.hasControls).toBe(true)
    expect(th.roamer).toBeUndefined()
    expect(th.extras).toBeUndefined()
    expect(th.takeover).toBeUndefined()
    expect(th.boot).toEqual(['ZEROING…', 'ZEROED'])
    expect(th.greeting).toBe('Caliper on. Zeroed.')
    expect(th.warning(85)).toBe('Context 85 %: out of tolerance soon. /compact')
    expect(th.warning(96)).toBe('Context 96 %: off the scale. /compact now')
    expect(th.tools.Edit).toBe('Adjust')
    expect(th.words).toContain('Within tolerance')
    expect(CASTS[key]).toBeDefined()
    expect(th.ticker(0)).toBe('')
  }
  expect(THEMES.caliper.slim?.title).toBeUndefined()
})

// ---------------------------------------------------------------- the engine: modes, button, /skin, the stored setting
const pane = { title: '', isFocused: false, bodyColumns: 100, placement: 'dock', scroll: { offset: 0, bodyRows: 60 }, view: {} } as const
const COLS: Record<number, number> = { 750: 106, 900: 126, 1250: 173 }
const NOW = Date.parse('2026-10-20T10:00:00Z')
let appTheme = 'dark'
let themeRow = true
let ctxPct = 10
const kv = new Map<string, unknown>()
const base = (on: On, o: { theme?: string; ctx?: number; keep?: boolean } = {}) => {
  appTheme = o.theme ?? 'dark'
  themeRow = true
  ctxPct = o.ctx ?? 10
  if (!o.keep) kv.clear()
  mock.clock(on, { now: NOW })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  on('store.get', async (_$, e) => ({ value: kv.get(String((e as { key: string }).key)) }) as never)
  on('store.set', async (_$, e) => { kv.set(String((e as { key: string }).key), (e as { value: unknown }).value); return { value: undefined } as never })
  on('fs.exists', async () => ({ value: false }) as never)
  on('settings.read', async () => ({ value: {} }) as never)
  on('tool.register', async () => ({ value: undefined }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
  on('command.run', async () => ({ text: '' }) as never)
  on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
  on('ui.panes', async () => ({ value: [] }) as never)
  on('ui.toast', async () => ({ value: undefined }) as never)
  on('audio.play', async () => ({ value: undefined }) as never)
  on('tool.call', async () => ({ result: 'ok' }) as never)
  on('turn.complete', async () => ({ text: '' }) as never)
  on('prompt.submit', async (_$, e) => ({ text: (e as { text: string }).text }) as never)
  let n = 0
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: `a${++n}` }) as never)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: ctxPct * 10_000 }, rateLimits: [] } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  on('config.list', async () => ({ value: [{ key: 'verbose', label: 'Verbose', kind: 'toggle', value: false }, ...(themeRow ? [{ key: 'theme', label: 'Theme', kind: 'choice', value: appTheme, options: ['dark', 'light'] }] : [])] }) as never)
  on('config.set', async (_$, e) => { appTheme = String((e as { value: unknown }).value); return { value: appTheme } as never })
}
const start = async ($: Engine, skin = 'caliper') => {
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  if (skin) await $.command.run({ command: 'skin', args: skin } as never)
}
const svgs = async ($: Engine, component: 'Pane' | 'AbovePrompt', W = 1250): Promise<string[]> => {
  const ui =
    component === 'Pane'
      ? await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: pane })
      : await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: true, maxRows: 14, bodyColumns: COLS[W] } as never })
  const all = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source))
  await ui.unmount()
  return all
}
const bandOf = async ($: Engine, W = 1250) => (await svgs($, 'AbovePrompt', W)).join('')
const paneOf = async ($: Engine) => (await svgs($, 'Pane')).join('')
const spawn = ($: Engine, i: number) => $.agent.spawn({ tool_use_id: `t${i}`, prompt: 'p', description: `Engineer: piece ${i}`, subagentType: 'general-purpose', provider: 'engine', parentModel: 'x', background: false, fork: false } as never)
const TITLE = 'Redesign the Skins gallery grouping and every card of the pane'
const job = async ($: Engine, title = TITLE) => {
  await $.prompt.submit({ text: title, cursor: 0 } as never)
  const tasks = Array.from({ length: 12 }, (_, i) => ({ title: `Engineer: piece number ${i + 1}`, tier: 'careful' }))
  await $.tool.call({ tool: 'mcp__crab-progress__progress', title, total: 12, done: 7, phase: 'delegate', tasks } as never).catch(() => undefined)
  for (const t of ['Read', 'Edit', 'Bash']) await $.tool.call({ tool: t, file_path: '/repo/parser.ts' } as never).catch(() => undefined)
}
// The coordinates of an engine drawing: no colours, and not the setting's own word in the CALIBRATION header.
const layoutOf = (svg: string): string => geometryOf(svg).replace(/⇄\uFE0E [A-Z ·→]+</g, '⇄<')
const isLight = (s: string) => s.includes(calPal('light').tile) && s.includes(calPal('light').accent) && !s.includes(calPal('dark').tile)
const isDark = (s: string) => s.includes(calPal('dark').tile) && !s.includes(calPal('light').tile)
const say = async ($: Engine, args: string) => String(((await $.command.run({ command: 'skin', args } as never)) as { text?: string }).text)

test('auto (the default) follows the app theme: dark, a dark variant, or light', async ($, on) => {
  base(on, { theme: 'dark-daltonized' })
  await start($)
  await job($)
  expect(isDark(await bandOf($))).toBe(true)
  expect(isDark(await paneOf($))).toBe(true)
  // a restart with the app on light
  appTheme = 'light'
  await start($, '')
  expect(isLight(await bandOf($))).toBe(true)
  expect(isLight(await paneOf($))).toBe(true)
  appTheme = 'light-ansi'
  await start($, '')
  expect(isLight(await bandOf($))).toBe(true)
  appTheme = 'dark-ansi'
  await start($, '')
  expect(isDark(await bandOf($))).toBe(true)
  // Nothing stored but the setting; the resolved face is never written.
  expect(kv.get('calMode')).toBeUndefined()
})

test('auto without a readable theme falls back to dark', async ($, on) => {
  base(on)
  themeRow = false
  await start($)
  await job($)
  expect(isDark(await bandOf($))).toBe(true)
})

test('config.set of the theme redraws Caliper in auto, and only in auto', async ($, on) => {
  base(on, { theme: 'dark' })
  await start($)
  await job($)
  expect(isDark(await bandOf($))).toBe(true)
  await $.config.set({ key: 'theme', value: 'light' } as never)
  expect(isLight(await bandOf($))).toBe(true)
  expect(isLight(await paneOf($))).toBe(true)
  await $.config.set({ key: 'theme', value: 'dark-ansi' } as never)
  expect(isDark(await bandOf($))).toBe(true)
  // pinned to dark: the app going light changes nothing
  await say($, 'caliper dark')
  await $.config.set({ key: 'theme', value: 'light' } as never)
  expect(isDark(await bandOf($))).toBe(true)
  expect(isDark(await paneOf($))).toBe(true)
  // pinned to light: the app going dark changes nothing
  await say($, 'caliper light')
  await $.config.set({ key: 'theme', value: 'dark' } as never)
  expect(isLight(await bandOf($))).toBe(true)
})

test('/skin caliper light|dark|auto sets and stores the setting only; /skin caliper keeps it; a restart keeps it', async ($, on) => {
  base(on, { theme: 'dark' })
  await start($, '')
  expect(await say($, 'caliper light')).toBe('Skin: Caliper (light).')
  expect(kv.get('calMode')).toBe('light')
  expect(kv.get('skin')).toBe('caliper')
  expect(isLight(await bandOf($))).toBe(true)
  expect(await say($, 'caliper')).toBe('Skin: Caliper (light).')
  expect(kv.get('calMode')).toBe('light')
  expect(await say($, 'caliper dark')).toBe('Skin: Caliper (dark).')
  expect(kv.get('calMode')).toBe('dark')
  expect(isDark(await bandOf($))).toBe(true)
  expect(await say($, 'Caliper AUTO')).toBe('Skin: Caliper (auto → dark).')
  expect(kv.get('calMode')).toBe('auto')
  expect(JSON.stringify([...kv.entries()])).not.toContain('"caliperlight"')
  // the list says which face is on
  expect(await say($, 'list')).toContain('▸ caliper  Caliper (auto → dark)')
  await say($, 'caliper light')
  expect(await say($, 'list')).toContain('Caliper (light)')
  // restart: the same store, a fresh session
  await start($, '')
  expect(kv.get('calMode')).toBe('light')
  expect(isLight(await bandOf($))).toBe(true)
  // a word that is not a mode is not a skin
  expect(await say($, 'caliper sepia')).toContain('No skin "caliper sepia"')
})

test('the pane button cycles dark → light → auto → dark and names the next step', async ($, on) => {
  base(on, { theme: 'dark' })
  await start($, 'caliper dark')
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: pane })
  const label = async () => String((await ui.find({ key: 'cal-mode' }))?.props.label)
  expect(await label()).toBe('⇄︎ LIGHT')
  await ui.press({ key: 'cal-mode' })
  expect(kv.get('calMode')).toBe('light')
  expect(await label()).toBe('⇄︎ AUTO')
  expect(isLight((await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join(''))).toBe(true)
  await ui.press({ key: 'cal-mode' })
  expect(kv.get('calMode')).toBe('auto')
  expect(await label()).toBe('⇄︎ DARK')
  await ui.press({ key: 'cal-mode' })
  expect(kv.get('calMode')).toBe('dark')
  expect(await label()).toBe('⇄︎ LIGHT')
  await ui.unmount()
})

test('pinned to light while the app goes light, ⇄ to auto draws light (the atom follows the app)', async ($, on) => {
  base(on, { theme: 'dark' })
  await start($, 'caliper dark')
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: pane })
  const faceOf = async () => (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  await ui.press({ key: 'cal-mode' }) // light
  await $.config.set({ key: 'theme', value: 'light' } as never)
  await ui.press({ key: 'cal-mode' }) // auto, the app is light
  expect(kv.get('calMode')).toBe('auto')
  expect(isLight(await faceOf())).toBe(true)
  await ui.unmount()
  // the button belongs to Caliper alone
  await say($, 'crab-classic')
  const other = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: pane })
  expect(await other.find({ key: 'cal-mode' })).toBeUndefined()
  await other.unmount()
})

test('CREW: past 40 rows the rest is one "+N more" row', () => {
  const many = Array.from({ length: 45 }, (_, i) => ({ label: `agent ${i}`, color: '#8FB4E8', kind: 'agent', status: 'done', children: [] }))
  const svg = orgCard(560, { ...ORG, children: many }, 'dark')
  expect(svg).toContain('+5 more')
  expect(svg).not.toContain('agent 40<')
})

test('no layout flip: with four agents the band and the pane have the same coordinates in dark, light and auto, and after a redraw', async ($, on) => {
  base(on, { theme: 'dark' })
  await start($, 'caliper dark')
  await job($)
  for (let i = 1; i <= 4; i++) await spawn($, i)
  const sig = async (W: number) => layoutOf(await bandOf($, W))
  const darkBand = { 750: await sig(750), 900: await sig(900), 1250: await sig(1250) }
  const darkPane = layoutOf(await paneOf($))
  // a redraw of the same state is byte-identical
  expect(await bandOf($, 900)).toBe(await bandOf($, 900))
  await say($, 'caliper light')
  for (const W of [750, 900, 1250]) expect(await sig(W)).toBe(darkBand[W as 750 | 900 | 1250])
  expect(layoutOf(await paneOf($))).toBe(darkPane)
  await say($, 'caliper auto')
  expect(await sig(900)).toBe(darkBand[900])
  // four crew pins on the 900 band
  const band = await bandOf($, 900)
  expect((band.match(/<circle [^>]*r="4" fill="none"/g) ?? []).length).toBe(4)
})

test('sizes: the band at 750, 900 and 1250 stays under 70 kB, the pane under 260 kB, each drawing under the engine limit', async ($, on) => {
  base(on, { theme: 'light', ctx: 96 })
  await start($, 'caliper light')
  await job($)
  for (let i = 1; i <= 8; i++) await spawn($, i)
  for (const W of [750, 900, 1250]) {
    const parts = await svgs($, 'AbovePrompt', W)
    const band = parts.join('')
    expect(band.length).toBeLessThan(70_000)
    for (const p of parts) expect(p.length).toBeLessThan(131_072)
    expect(band).toContain('OFF THE SCALE')
    expect(band).toMatch(/<line x1="\d+" y1="\d+(?:\.\d)?" x2="\d+" y2="\d+(?:\.\d)?"\/>/)
  }
  const cards = await svgs($, 'Pane')
  for (const p of cards) expect(p.length).toBeLessThan(131_072)
  expect(cards.join('').length).toBeLessThan(260_000)
})

test('the band: breakpoints keep the engine\'s, the title reads in the text colour, the status pill reads at 4.5:1 in both faces', async ($, on) => {
  base(on, { theme: 'dark' })
  await start($, '')
  await job($)
  for (const face of FACES) {
    const P = calPal(face)
    await say($, `caliper ${face}`)
    const w750 = await bandOf($, 750)
    const w1250 = await bandOf($, 1250)
    expect(w750).toContain('>CTX<')
    expect(w750).toContain('>5H<')
    expect(w1250).toContain('>CONTEXT<')
    expect(w1250).toContain('>5-HOUR LIMIT<')
    // the title is the text colour, never the accent
    expect(w1250).toMatch(new RegExp(`font-size="15" font-weight="700" fill="${P.text}"`))
    expect(w750).toContain('…')
    // the pill: accent fill while working, its ink readable on it
    const pill = /class="cal-pill"[^>]*fill="(#[0-9A-Fa-f]{6})"[^>]*\/><text[^>]*fill="(#[0-9A-Fa-f]{6})"/.exec(w1250)
    expect(pill).not.toBeNull()
    expect(calRatio(pill?.[2] as string, pill?.[1] as string)).toBeGreaterThanOrEqual(4.5)
    // the engine's tip and totals row is on the band (below the mock's 120 px)
    expect(w1250).toMatch(new RegExp(`viewBox="0 0 \\d+ ${calBandH}"`))
  }
})

test('leaving Caliper restores the next skin\'s own colours; no face leaks', async ($, on) => {
  base(on, { theme: 'light' })
  await start($, 'caliper light')
  expect(isLight(await bandOf($))).toBe(true)
  await say($, 'crab-classic')
  const crab = await bandOf($)
  expect(crab).not.toContain(calPal('light').tile)
  expect(crab).not.toContain(calPal('light').accent)
  expect(crab).not.toContain(calPal('dark').accent)
  await say($, 'caliper')
  expect(isLight(await bandOf($))).toBe(true)
})
