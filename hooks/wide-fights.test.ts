// Wave 4 polish, part 2: the other eight fights drawn large on the main band (Invincible's THE FIGHT x3 and MARK VS CONQUEST,
// The Boys' four, Edgerunners 2's cyberpsycho and CAPRICORN's capri-vs-d), the way part 1 did the classic Cyberpunk three:
// - a minimum drawn height for the tallest fighter at each band-fit width (450 to 1250), from the band's real stages;
// - a wide band gives the Boys and ER2 fights a full-height LANE right of the task title and the Tasks chip: they never
//   cross the title; Invincible's cut is PUSHED IN (scaled to the band's height) and passes behind the title (a hole);
// - every band cut keeps 1 k of headroom under the 32 k fight cap with the real stages (lane or not, every look);
// - on the real band: the Boys and ER2 lanes start right of the Tasks chip at 1250, Invincible's clip holds the title hole.
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { BUDGET, audit, chars } from './stage/budget'
import type { BandStage, Rect } from './stage/keep'
import { allHoles, laneIn, meets } from './stage/keep'
import { bandFighterPx, fightBand, push } from './invincible-fight'
import { actOn } from './theboys-acts'
import { FIGHT_KINDS, LANE_SC, castPx, winOf } from './theboys-fights'
import { bandLane, bandRegion, er2FighterPx, er2Sc, hudAct, psychoAct } from './edgerunners2-motion'

// The main band's stages as register.tsx hands them (a 4-agent job, "GDA HQ incident report", 2/5 tasks), at the band-fit
// widths: Invincible and The Boys (H 134 and 148: the same rows), Edgerunners 2 (its own pill and row widths).
const ST: Record<number, BandStage> = {
  450: { x1: 258, keep: [[211, 39, 84, 22], [12, 88, 102, 21]], wide: { x2: 368, keep: [[368, 34, 452, 50], [289, 79, 452, 31], [257.5, 110, 452, 24]] }, title: [61, 39, 144, 22] },
  600: { x1: 245, keep: [[178, 39, 84, 22], [12, 88, 102, 21]], wide: { x2: 308, keep: [[308, 34, 601, 50], [245, 79, 601, 31], [296.9, 110, 601, 24]] }, title: [61, 39, 111, 22] },
  750: { x1: 296, keep: [[259, 39, 84, 22], [12, 88, 102, 21]], wide: { x2: 458, keep: [[458, 34, 749, 50], [326, 79, 749, 31], [295.9, 110, 749, 24]] }, title: [61, 39, 192, 22] },
  900: { x1: 445, keep: [[259, 39, 84, 22], [12, 88, 102, 21]], wide: { x2: 608, keep: [[608, 34, 898, 50], [475, 79, 898, 31], [444.9, 110, 898, 24]] }, title: [61, 39, 192, 22] },
  1250: { x1: 794, keep: [[259, 39, 84, 22], [12, 88, 102, 21]], wide: { x2: 842, keep: [[842, 34, 1247, 50], [824, 79, 1247, 31], [793.9, 110, 1247, 24]] }, title: [61, 39, 192, 22] },
}
const ER2: Record<number, BandStage> = {
  450: { x1: 193, keep: [[217, 39, 70, 22], [12, 88, 102, 21]], wide: { x2: 368, keep: [[368, 34, 452, 50], [233, 79, 452, 31], [193, 110, 452, 24]] }, title: [61, 39, 150, 22] },
  600: { x1: 246, keep: [[185, 39, 70, 22], [12, 88, 102, 21]], wide: { x2: 308, keep: [[308, 34, 601, 50], [246, 79, 601, 31], [249.7, 110, 601, 24]] }, title: [61, 39, 118, 22] },
  750: { x1: 270, keep: [[217, 39, 70, 22], [12, 88, 102, 21]], wide: { x2: 458, keep: [[458, 34, 749, 50], [394, 79, 749, 31], [270.3, 110, 749, 24]] }, title: [61, 39, 150, 22] },
  900: { x1: 419, keep: [[217, 39, 70, 22], [12, 88, 102, 21]], wide: { x2: 608, keep: [[608, 34, 898, 50], [543, 79, 898, 31], [419.3, 110, 898, 24]] }, title: [61, 39, 150, 22] },
  1250: { x1: 768, keep: [[217, 39, 70, 22], [12, 88, 102, 21]], wide: { x2: 892, keep: [[842, 34, 1247, 50], [892, 79, 1247, 31], [768.3, 110, 1247, 24]] }, title: [61, 39, 150, 22] },
}
const WIDTHS = [450, 600, 750, 900, 1250] as const
const BW: Record<number, number> = { 450: 452, 600: 601, 750: 749, 900: 898, 1250: 1247 }

// The tallest fighter's drawn height (band px). Before wave 4 (the same stages): Omni-Man 54/54/54/61/68, Conquest 60/60/60/68/75,
// the Boys' cast 52 at every width, ER2's D 61 and the HUD pair 57 at every width (their title-row region).
const MIN = {
  omni: { 450: 56, 600: 54, 750: 64, 900: 72, 1250: 84 },
  conquest: { 450: 62, 600: 59, 750: 71, 900: 78, 1250: 89 },
  boys: { 450: 51, 600: 51, 750: 58, 900: 65, 1250: 84 },
  psycho: { 450: 61, 600: 61, 750: 61, 900: 61, 1250: 88 },
  hud: { 450: 57, 600: 57, 750: 57, 900: 57, 1250: 87 },
} as const

test('wide fights: the tallest fighter of each of the eight is drawn at least its minimum at every band-fit width', () => {
  const got: string[] = []
  for (const W of WIDTHS) {
    const s = ST[W] as BandStage
    const omni = bandFighterPx(134, s.x1)
    const cq = bandFighterPx(134, s.x1, true)
    const boys = castPx(winOf({ W: BW[W] as number, H: 148, m: 'brand', at: 0, on: 'band', stage: s }))
    const e = ER2[W] as BandStage
    const lane = bandLane(132, e)
    const h = (lane ?? bandRegion(BW[W] as number, 132, e)).h
    const psy = er2FighterPx('cyberpsycho', h, Boolean(lane))
    const hud = er2FighterPx('capri-vs-d', h, Boolean(lane))
    got.push(`${W}: omni ${omni} cq ${cq} boys ${boys} psy ${psy} hud ${hud}`)
    expect(omni, `omni ${W}`).toBeGreaterThanOrEqual(MIN.omni[W])
    expect(cq, `conquest ${W}`).toBeGreaterThanOrEqual(MIN.conquest[W])
    expect(boys, `boys ${W}`).toBeGreaterThanOrEqual(MIN.boys[W])
    expect(psy, `psycho ${W}`).toBeGreaterThanOrEqual(MIN.psycho[W])
    expect(hud, `hud ${W}`).toBeGreaterThanOrEqual(MIN.hud[W])
  }
  console.log(got.join('\n'))
})

test('wide fights: a lane is full height, right of the task title and the Tasks chip, clear of every hole; none on a narrow band', () => {
  for (const W of WIDTHS) {
    for (const [s, H] of [[ST[W] as BandStage, 148], [ER2[W] as BandStage, 132]] as const) {
      const holes = allHoles(s)
      const l = laneIn([0, 34, s.x1, H - 37], holes, 300)
      if (!l) continue
      expect(W, 'only a wide band has a lane').toBeGreaterThanOrEqual(1100)
      expect(holes.some(hl => meets(l, hl)), `${W}: lane clear`).toBe(false)
      expect(l[0]).toBeGreaterThanOrEqual((s.keep[0] as Rect)[0] + (s.keep[0] as Rect)[2])
      expect(l[3]).toBeGreaterThanOrEqual(90)
    }
    // ER2: the tall lane at 1250, a LOW lane under the title row at 900 (the title never under the fight), none narrower.
    const el = bandLane(132, ER2[W] as BandStage)
    if (W === 1250) expect(el?.h).toBeGreaterThanOrEqual(90)
    else if (W === 900) { expect(el?.y).toBeGreaterThanOrEqual(62); expect(el?.w).toBeGreaterThanOrEqual(260) }
    else expect(el).toBeUndefined()
    if (el) expect(allHoles(ER2[W] as BandStage).some(hl => meets([el.x, el.y, el.w, el.h], hl)), `${W}: ER2 lane clear`).toBe(false)
    // The Boys' window: the lane at 1250 (from the header rule), else right of the bust, its cast's heads under the title row.
    const w = winOf({ W: BW[W] as number, H: 148, m: 'brand', at: 0, on: 'band', stage: ST[W] as BandStage })
    if (W === 1250) { expect(w.y0).toBe(36); expect(w.sc).toBe(LANE_SC); expect(w.x0).toBeGreaterThanOrEqual(343) }
    else {
      expect(w.x0).toBe(120)
      expect(w.gy - 47 * w.sc, `${W}: heads under the title row`).toBeGreaterThanOrEqual(62)
      expect(w.keep?.some(k => k[0] === 61 && k[1] === 39), `${W}: the title is a hole`).toBe(true)
    }
    // Invincible: pushed in as far as the band's height allows; the head on the header rule, the floor inside the band.
    for (const cq of [false, true]) {
      const p = push(134, (ST[W] as BandStage).x1, cq)
      expect(p.k).toBeGreaterThanOrEqual(1)
      expect(p.k).toBeLessThanOrEqual(1.35)
      expect(118 * p.k + p.ty, `${W} floor`).toBeLessThanOrEqual(137)
    }
  }
})

test('wide fights: every band cut keeps 1 k of headroom under the 32 k cap on the real stages (every look, lane or not)', () => {
  const worst: string[] = []
  for (const W of WIDTHS) {
    const s = ST[W] as BandStage
    for (const era of [1, 2] as const) for (const v of [0, 1, 2, 3] as const) {
      if (v === 3 && era === 1) continue
      const svg = fightBand({ W: BW[W] as number, H: 134, era, startAt: 0, v, stage: s }).svg
      if (chars(svg) > 31_000) console.log(`OVER inv ${era} ${v} ${W} ${chars(svg)}`)
      expect(chars(svg), `inv e${era} v${v} ${W}`).toBeLessThanOrEqual(BUDGET.fightBand.band - 1_000)
      expect(svg, `inv ${W}: the title is a hole`).toContain(`M61 39h${(s.title as Rect)[2]}v22h`)
    }
    for (const k of FIGHT_KINDS) for (const m of ['brand', 'book', 'gold', 'noir'] as const) {
      const svg = actOn(k, { W: BW[W] as number, H: 148, m, at: 0, on: 'band', task: 'GDA HQ incident report', titleW: 192, stage: s })
      const a = audit(`<svg xmlns="http://www.w3.org/2000/svg">${svg}</svg>`)
      expect(a.dupes, `boys ${k} ${m} ${W}`).toEqual([])
      if (a.chars > 31_000) console.log(`OVER boys ${k} ${m} ${W} ${a.chars}`)
      expect(a.chars, `boys ${k} ${m} ${W}`).toBeLessThanOrEqual(BUDGET.fightBand.band - 1_000)
      if (W === 1250) worst.push(`${k}/${m} ${a.chars}`)
    }
    const e = ER2[W] as BandStage
    const lane = bandLane(132, e)
    const r = lane ?? bandRegion(BW[W] as number, 132, e)
    for (const [n, act] of [['psy', psychoAct], ['hud', hudAct]] as const) {
      const a = act({ at: 0, w: r.w, h: r.h, id: `t-${n}-${W}`, ...(lane ? { sc: er2Sc(n === 'psy' ? 'cyberpsycho' : 'capri-vs-d', lane.h) } : {}) })
      const au = audit(`<svg xmlns="http://www.w3.org/2000/svg">${a.layer}</svg>`)
      expect(au.dupes).toEqual([])
      if (au.chars > 31_000) console.log(`OVER er2 ${n} ${W} ${au.chars}`)
      expect(au.chars, `er2 ${n} ${W}`).toBeLessThanOrEqual(BUDGET.fightBand.band - 1_000)
      if (W === 1250) worst.push(`${n} ${au.chars}`)
    }
  }
  console.log(worst.join(' · '))
})

// ---------------------------------------------------------------- the REAL band, a fight replayed
const NOW = Date.parse('2026-10-20T10:00:00Z')
const COLS: Record<number, number> = { 450: 66, 600: 86, 750: 106, 900: 126, 1250: 173 }
const base = (on: On, cyber = false) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on)
  on('fs.exists', async (_$, e) => ({ value: cyber && /addons[\\/]cyberpunk[\\/]addon\.json$/.test(String((e as { path: string }).path)) }) as never)
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
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: 100_000 }, rateLimits: [], cost: { usd: 1.23 } } }) as never)
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
const ROLES = ['Lead: run it', 'Researcher: map the API', 'Engineer: rewrite the parser', 'Tester: break it']
const work = async ($: Engine) => {
  await $.prompt.submit({ text: TITLE, cursor: 0 } as never)
  await $.tool.call({ tool: 'mcp__crab-progress__progress', title: TITLE, total: 5, done: 2, phase: 'delegate', tasks: ROLES.map(title => ({ title, tier: 'medium' })) } as never).catch(() => undefined)
  for (const [i, d] of ROLES.entries()) await $.agent.spawn({ tool_use_id: `t${i}`, prompt: 'p', description: d, subagentType: 'general-purpose', provider: 'engine', parentModel: 'x', background: false, fork: false } as never)
}
/** The Tasks chip's right edge on a band (its pill: y 41, 18 tall, rx 9). */
const chipEnd = (b: string): number => { const m = /<rect x="([\d.]+)" y="41" width="([\d.]+)" height="18" rx="9"/.exec(b); return m ? Number(m[1]) + Number(m[2]) : NaN }
const PLAYS: [string, string[], string, boolean][] = [
  ['invincible', [], 'the-catch', false], ['invincible', ['new suit'], 'conquest', false], ['the-boys', [], 'offthebooks', false],
  ['solidgold', [], 'reunion', false], ['edgerunners-2', [], 'cyberpsycho', true], ['capricorn', [], 'capri-vs-d', true],
]
for (const [skin, pre, play, cyber] of PLAYS) {
  test(`wide fights: ${play} (${skin}) on the real band: right of the title at 1250, the title never under it`, { timeoutMs: 90_000 }, async ($, on) => {
    const clock = base(on, cyber)
    await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
    await $.command.run({ command: 'skin', args: skin } as never)
    await clock.advance(5_000)
    for (const p of pre) { await $.prompt.submit({ text: p, cursor: 0 } as never); await clock.advance(5_000) }
    await work($)
    await clock.advance(4_000)
    expect(String(((await $.command.run({ command: 'missioncontrol', args: `play ${play}` } as never)) as { text?: string }).text)).toBe(`▶ ${play}`)
    await clock.advance(400)
    for (const W of [900, 1250]) {
      const b = await band($, W)
      const clips = [...b.matchAll(/<clipPath id="([\w-]+)"><path clip-rule="evenodd" d="M([-\d.]+) ([-\d.]+)h([-\d.]+)v([-\d.]+)h-[\d.]+z([^"]*)"/g)]
      expect(clips.length, `${play} ${W}: drawn through a keep-out clip`).toBeGreaterThan(0)
      const c = clips[clips.length - 1] as RegExpMatchArray
      const [x, y, , h] = [2, 3, 4, 5].map(i => Number(c[i]))
      if (skin === 'invincible') {
        // Pushed in, the title a hole at every width.
        expect(c[6], `${W}: the title is a hole`).toContain('M61 39h')
        expect(b).toMatch(/kc\)"><g transform="translate\(0 [-\d.]+\) scale\(1\.[1-3]\d*\)">/)
      } else if (cyber && W === 900) {
        // ER2's low lane: under the title row, right of the step count.
        expect(y as number, `${play}: under the title row`).toBeGreaterThanOrEqual(62)
      } else if (W === 1250) {
        // The lane: full height, right of the Tasks chip (so of the title).
        expect(x as number, `${play}: right of the chip`).toBeGreaterThanOrEqual(cyber ? 287 : chipEnd(b))
        expect(h as number, `${play}: full height`).toBeGreaterThanOrEqual(90)
        expect(y as number).toBeGreaterThanOrEqual(33)
      }
    }
  })
}
