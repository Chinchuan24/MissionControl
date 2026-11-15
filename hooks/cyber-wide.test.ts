// Wave 4 polish of the three classic Cyberpunk fights (MaxTac raid, boardroom stand-off, ICE duel), on the REAL band:
// - drawn large: the band hands the classic band's WIDE stage (the title row and the crew row, up to the crew's role chips), the
//   fight takes the widest lane of it free of the Tasks chip; a minimum fighter height at each band-fit width;
// - the boardroom reads: lifted steel against the dark, the window wall, the key light, the TERMINATED ghost frame;
// - MAXTAC's closing title is whole: inside its region, clear of every hole, at every size the band gives it;
// - a busy band never drops a fight: the classic band's "lite" redraw keeps it.
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { BUDGET, audit } from './stage/budget'
import type { Rect } from './stage/keep'
import { FIGHT_MS, MAXTAC_TITLE, SM_STEEL, boardroomAct, fighterPx, fightRegion, iceAct, laneOf, maxtacAct, spanFree, titleW } from './cyber-fights'

const NOW = Date.parse('2026-10-20T10:00:00Z')
const COLS: Record<number, number> = { 450: 66, 600: 86, 750: 106, 900: 126, 1250: 173 }
const base = (on: On, ctx = 120_000) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on)
  on('fs.exists', async (_$, e) => ({ value: /addons[\\/]cyberpunk[\\/]addon\.json$/.test(String((e as { path: string }).path)) }) as never)
  on('settings.read', async () => ({ value: {} }) as never)
  on('tool.register', async () => ({ value: undefined }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
  on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
  on('ui.panes', async () => ({ value: [] }) as never)
  on('ui.toast', async () => ({ value: undefined }) as never)
  on('audio.play', async () => ({ value: undefined }) as never)
  on('tool.call', async () => ({ result: 'ok' }) as never)
  on('turn.complete', async () => ({ text: '' }) as never)
  on('prompt.submit', async (_$, e) => ({ text: (e as { text: string }).text }) as never)
  let n = 0
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: `a${++n}` }) as never)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: ctx }, rateLimits: [], cost: { usd: 12.34 } } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  return clock
}
const band = async ($: Engine, W: number): Promise<string> => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: true, maxRows: 14, bodyColumns: COLS[W] } as never })
  const all = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  await ui.unmount()
  return all
}
const TITLE = 'GDA HQ incident report'
const ROLES = ['Lead: run it', 'Researcher: map the API', 'Engineer: rewrite the parser', 'Tester: break it', 'Writer: the report', 'Reviewer: read the diff']
const work = async ($: Engine, agents = 4) => {
  await $.prompt.submit({ text: TITLE, cursor: 0 } as never)
  await $.tool.call({ tool: 'mcp__crab-progress__progress', title: TITLE, total: 6, done: 2, phase: 'delegate', tasks: ROLES.map((title, i) => ({ title, tier: ['fable', 'medium', 'careful', 'heavy', 'light', 'medium'][i] })) } as never).catch(() => undefined)
  for (const [i, d] of ROLES.slice(0, agents).entries()) await $.agent.spawn({ tool_use_id: `t${i}`, prompt: 'p', description: d, subagentType: 'general-purpose', provider: 'engine', parentModel: 'x', background: false, fork: false } as never)
}
/** The fight's window on the band (its keep-out clip's first box). */
const windowOf = (b: string): Rect | undefined => {
  const m = /<clipPath id="[\w-]+rg"><path clip-rule="evenodd" d="M([-\d.]+) ([-\d.]+)h([-\d.]+)v([-\d.]+)/.exec(b)
  return m ? ([1, 2, 3, 4].map(i => Number(m[i])) as Rect) : undefined
}
const FIGHTS = [['cyberpunk-2077', 'maxtac'], ['arasaka', 'boardroom'], ['lucy-edgerunners', 'ice-duel']] as const
// The tallest fighter's drawn height (band px) at each band-fit width: wave 2 drew them 40 (raid), 41 (stand-off) and 40 (duel)
// px tall in a 46 px title row. Wide bands give the title row AND the crew row; narrow ones keep the title row.
const MIN_PX: Record<number, number> = { 450: 30, 600: 40, 750: 40, 900: 56, 1250: 64 }

for (const [skin, play] of FIGHTS) {
  test(`cyber wide: ${play} on the real band is drawn large (a minimum fighter height at 450 to 1250) and keeps 1 k headroom`, { timeoutMs: 90_000 }, async ($, on) => {
    const clock = base(on)
    await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
    await $.command.run({ command: 'skin', args: skin } as never)
    await clock.advance(5_000)
    await work($)
    await clock.advance(4_000)
    expect(String(((await $.command.run({ command: 'missioncontrol', args: `play ${play}` } as never)) as { text?: string }).text)).toBe(`▶ ${play}`)
    await clock.advance(400)
    const got: Record<number, number> = {}
    for (const W of Object.keys(COLS).map(Number)) {
      const b = await band($, W)
      const win = windowOf(b)
      expect(win, `${play} ${W}: drawn`).toBeDefined()
      const [, y, w, h] = win as Rect
      expect(y).toBeGreaterThanOrEqual(33)
      got[W] = fighterPx(play, w, h)
      expect(got[W], `${play} ${W}: fighter ${got[W]} px in ${w}x${h}`).toBeGreaterThanOrEqual(MIN_PX[W] as number)
      // the act itself (its own layer, compacted) keeps 1 k under the band cut's 32 k
      const layer = /<defs><clipPath id="[\w-]+rg">[\s\S]*$/.exec(b)?.[0] ?? ''
      expect(audit(`<svg xmlns="http://www.w3.org/2000/svg">${layer.slice(0, layer.lastIndexOf('</svg>'))}</svg>`).chars, `${play} ${W}`).toBeLessThan(BUDGET.fightBand.band)
    }
    // the wide bands draw them about 1.7x as tall as wave 2 did
    expect(got[1250]).toBeGreaterThanOrEqual(64)
  })
}

test('cyber wide: every act keeps 1 k of headroom under the band cut cap at every region the band can hand it', () => {
  for (const [w, h] of [[220, 46], [352, 46], [300, 78], [420, 78], [520, 78], [640, 78]] as const) {
    for (const holes of [[], [[60, 6, 80, 21]]] as Rect[][]) {
      for (const [name, f] of [['maxtac', maxtacAct], ['boardroom', boardroomAct], ['ice-duel', iceAct]] as const) {
        const a = f({ at: NOW, w, h, id: `t-${name}-${w}x${h}-${holes.length}`, holes })
        const svg = `<svg xmlns="http://www.w3.org/2000/svg">${a.layer}</svg>`
        const r = audit(svg)
        expect(r.chars, `${name} ${w}x${h}`).toBeLessThanOrEqual(BUDGET.fightBand.band - 1000)
        expect(r.dupes).toEqual([])
        expect(r.badText).toEqual([])
      }
    }
  }
})

test('cyber wide: the band region takes the wide stage when it is 300 px or more, else the title row as before', () => {
  expect(fightRegion(1596, { x1: 1180, keep: [], wide: { x2: 820, keep: [] } })).toEqual({ x: 84, y: 34, w: 640, h: 78 })
  expect(fightRegion(1150, { x1: 730, keep: [], wide: { x2: 590, keep: [] } })).toEqual({ x: 84, y: 34, w: 506, h: 78 })
  // a narrow band: the crew's chips leave the crew row too short; the title row, as wave 2 drew it
  expect(fightRegion(768, { x1: 505, keep: [], wide: { x2: 289, keep: [] } })).toEqual({ x: 8, y: 34, w: 352, h: 46 })
  // the crew row ends at 112 (the steps row starts at 116): never covered
  expect(fightRegion(1596, { x1: 1180, keep: [], wide: { x2: 820, keep: [] } }).y + 78).toBeLessThanOrEqual(112)
  // the lane: the widest full-height span free of the chip (200 px at least), else the whole region
  expect(laneOf(640, 78, [[126, 6, 80, 21]])).toEqual({ a: 210, w: 430 })
  expect(laneOf(352, 46, [[208, 6, 70, 21]])).toEqual({ a: 0, w: 204 })
  expect(laneOf(300, 46, [[120, 6, 70, 21]])).toEqual({ a: 0, w: 300 })
})

// Relative luminance and contrast (WCAG), for the stand-off's figures against its dark.
const lum = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16)
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * (c[0] as number) + 0.7152 * (c[1] as number) + 0.0722 * (c[2] as number)
}
const contrast = (a: string, b: string): number => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number]; return (x + 0.05) / (y + 0.05) }

test('cyber wide: the boardroom reads (its steel against the dark, the window wall and key light, the TERMINATED ghost back)', () => {
  // wave 2's steel (#34343C) on the scrim (#050506) was 1.6:1, black on black; now 3:1 or more
  expect(contrast('#34343C', '#050506')).toBeLessThan(2)
  expect(contrast(SM_STEEL, '#050506')).toBeGreaterThanOrEqual(3)
  const a = boardroomAct({ at: NOW, w: 430, h: 78, id: 't-board-lit' })
  expect(a.layer).toContain(SM_STEEL)
  expect(a.layer).not.toContain('#34343C')
  expect(a.layer).toMatch(/stop-color="#CFE0FF" stop-opacity="\.34"/) // the cold key light
  expect(a.layer).toMatch(/stop-color="#26324C"/) // the night window wall
  expect(a.act.bank.count()).toBe(7) // aim, grab, stomp, ghost, the TERMINATED ghost, the chairman, the cut-in
  // the TERMINATED frame is cut AND drawn (a <use> of it, beside its def)
  const tid = a.act.bank.pose('term').id
  expect(a.layer.split(`href="#${tid}"`).length - 1).toBeGreaterThanOrEqual(1)
  // the stand-off beats, then the one strike, as before
  const beats = a.fight.script.map(s => s[0])
  for (const b of ['stare', 'step', 'flinch', 'backdown']) expect(beats).toContain(b)
  expect(beats.filter(b => b === 'strike').length).toBe(1)
  // a still for reduced motion
  expect(a.layer).toContain('prefers-reduced-motion')
  expect(FIGHT_MS.boardroom).toBe(6500)
})

test('cyber wide: MAXTAC\'s closing title is whole: inside its region and clear of every hole, at every size', () => {
  for (const [w, h] of [[200, 46], [220, 46], [260, 46], [300, 46], [352, 46], [300, 78], [430, 78], [640, 78]] as const) {
    for (const holes of [[], [[w * 0.45, 6, 80, 21]], [[10, 6, 70, 21]]] as Rect[][]) {
      const a = maxtacAct({ at: NOW, w, h, id: `t-mt-${w}-${h}-${holes.length}`, holes })
      const m = new RegExp(`<rect x="([\\d.-]+)" y="([\\d.-]+)" width="([\\d.]+)" height="([\\d.]+)" fill="#050507" stroke="#FCEE0A" stroke-opacity=".6"/><text x="([\\d.]+)" y="[\\d.]+" text-anchor="middle" font-family="[^"]+" font-size="([\\d.]+)"[^>]*>${MAXTAC_TITLE}</text>`).exec(a.layer)
      expect(m, `${w}x${h}`).not.toBeNull()
      const [x, y, bw, bh, , fs] = (m as RegExpExecArray).slice(1).map(Number) as number[]
      // the box holds the words (the generous width estimate) and the box is inside the region
      expect(bw as number).toBeGreaterThanOrEqual(titleW(MAXTAC_TITLE, fs as number))
      expect(x as number, `${w}x${h} left`).toBeGreaterThanOrEqual(0)
      expect((x as number) + (bw as number), `${w}x${h} right`).toBeLessThanOrEqual(w)
      expect(fs as number).toBeGreaterThanOrEqual(7)
      // never behind a hole (the Tasks chip)
      for (const [hx, hy, hw, hh] of holes) expect((x as number) < hx + hw && hx < (x as number) + (bw as number) && (y as number) < hy + hh && hy < (y as number) + (bh as number), `${w}x${h} vs hole`).toBe(false)
    }
  }
  // the widest free span of the title's rows
  expect(spanFree(640, [[126, 6, 80, 21]], 8, 35)).toEqual([209, 637])
})

test('cyber wide: a busy crew band keeps its fight at every moment (lite or not), never starts it and drops it', { timeoutMs: 90_000 }, async ($, on) => {
  // 96% context (the MAXTAC chip, the siren), crew mode, six agents: the busiest classic band.
  const clock = base(on, 960_000)
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  await $.command.run({ command: 'skin', args: 'cyberpunk-2077' } as never)
  await $.command.run({ command: 'autocrew', args: 'always' } as never)
  await clock.advance(5_000)
  await work($, 6)
  await clock.advance(4_000)
  expect(String(((await $.command.run({ command: 'missioncontrol', args: 'play maxtac' } as never)) as { text?: string }).text)).toBe('▶ maxtac')
  let t = 0
  for (const at of [400, 1500, 2900, 4300, 5500]) {
    await clock.advance(at - t)
    t = at
    for (const W of [900, 1250]) {
      const b = await band($, W)
      expect(windowOf(b), `maxtac ${W} at ${at} ms (${b.length} chars)`).toBeDefined()
      expect(b.length).toBeLessThan(131_072)
    }
  }
})
