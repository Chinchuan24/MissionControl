// The Boys' FIGHTS (theboys-fights.ts): four set pieces on the stage engine's `choreo`, drawn as censored live footage, rare
// (one director slot shared with THE AMBUSH), each with a replay name, inside the band and pane budgets in all four looks.
import { expect, test } from 'claude-code/testing'
import { actOn } from './theboys-acts'
import { CURTAIN_UP_RE, FIGHT_KINDS, FIGHT_PLAYS, PANE_RIGHT, PANE_TOP, fightFor, winOf } from './theboys-fights'
import { FIGHT_GAP_MS, stageAt, resetEvents, resetShow, CURTAIN_RE } from './theboys-show'
import { AMB_SLOT_MS, TAKEOVERS, ambushOfSlot, directorAt, fightOf } from './theboys-director'
import type { Slot } from './theboys-director'
import { REPLAYS, boysEvent, boysFx, boysState, fightDrawn, resetBoys, setBoysFx } from './theboys-eggs'
import { SP, syringe } from './theboys'
import { audit, BUDGET, chars } from './stage/budget'
import { runPlay } from './stage/replay'

const LOOKS = ['brand', 'book', 'gold', 'noir'] as const
const T0 = new Date(2026, 9, 20, 9, 0, 0).getTime()
const MIN = 60_000
const fresh = () => { resetBoys(); resetShow(); resetEvents() }

test('fights: each draws on the band and the CRISIS DESK in all four looks, inside the budgets, with a reduced-motion still', () => {
  for (const k of FIGHT_KINDS) for (const m of LOOKS) {
    for (const W of [750, 900, 1250]) {
      const b = actOn(k, { W, H: 148, m, at: T0, on: 'band', task: 'Vought Tower incident report', titleW: 300 })
      expect(b, `${k} ${m} ${W}`).toContain(`data-egg="act-${k}"`)
      expect(chars(b), `${k} ${m} band ${W}`).toBeLessThanOrEqual(BUDGET.fightBand.band)
      const a = audit(b)
      expect([a.dupes, a.badText, a.dupeIds], `${k} ${m} ${W}`).toEqual([[], [], []])
      expect(b).toContain('prefers-reduced-motion')
      expect(b).toContain('@@T')
      expect(b).not.toContain('NaN')
      expect(b).not.toContain('undefined')
      // The still frame: drawn only under reduced motion (the stage act's `-s` class), inside the same camera window.
      expect(b).toMatch(/<g class="[a-z0-9]+-s">/)
    }
    for (const [W, H] of [[480, 150], [560, 240]] as const) {
      const p = actOn(k, { W, H, m, at: T0, on: 'task' })
      expect(p, `${k} ${m} pane`).toContain(`data-egg="act-${k}"`)
      expect(chars(p), `${k} ${m} pane ${W}x${H}`).toBeLessThanOrEqual(BUDGET.fightAct.card)
      const a = audit(p)
      expect([a.dupes, a.badText, a.dupeIds], `${k} ${m} pane`).toEqual([[], [], []])
    }
    // Only the CRISIS DESK: the other cards stay free (the pane's reserve holds one fight card).
    for (const on of ['cred', 'log', 'table'] as const) expect(actOn(k, { W: 560, H: 240, m, at: T0, on })).not.toContain(`data-egg="act-${k}"`)
  }
})

test('fights: the Boys look, not a comic: LIVE bug, CENSORED on contact, SIGNAL LOST, the PR spin; NOIR gets intertitles', () => {
  const band = (k: string, m: typeof LOOKS[number]) => actOn(k, { W: 900, H: 148, m, at: T0, on: 'band' })
  const f2 = band('offthebooks', 'brand')
  for (const s of ['LIVE', 'CENSORED', 'SIGNAL LOST', 'ROUTINE TRAINING EXERCISE', 'VIEWER DISCRETION ADVISED']) expect(f2, s).toContain(s)
  expect(band('offthebooks', 'book')).toContain('INCIDENT UNDER REVIEW')
  expect(band('offthebooks', 'book')).toContain('THE WIRE')
  const f1 = band('reunion', 'gold')
  for (const s of ['VNN 1983', 'CENSORED', 'SIGNAL LOST', 'A VOUGHT FAMILY EXCLUSIVE']) expect(f1, s).toContain(s)
  const f3 = band('curtainup', 'noir')
  for (const s of ['Act I.', '“Again?”', '…', 'Fin.', '(censored)', 'Georgia']) expect(f3, s).toContain(s)
  expect(f3).not.toContain('LIVE')
  const f4 = band('race', 'brand')
  for (const s of ['PHOTO FINISH', 'A-TRAIN BY A NOSE', 'PROGRESS']) expect(f4, s).toContain(s)
  // PG-13 and our own look: no comic star, no SFX words, no RGB split, no blend modes.
  for (const k of FIGHT_KINDS) for (const m of LOOKS) {
    const s = band(k, m)
    for (const bad of ['mix-blend-mode', 'POW', 'BAM', 'WHAM', 'KRAK', 'feColorMatrix']) expect(s, `${k} ${m} ${bad}`).not.toContain(bad)
  }
})

test('fights: the camera window never reaches the working numbers (the bar percent, the step count, the cost line, the top row)', () => {
  for (const W of [750, 900, 1250]) {
    const w = winOf({ W, H: 148, m: 'brand', at: T0, on: 'band' })
    expect(w.x0).toBeGreaterThanOrEqual(116) // right of the bust and the step count (64-114)
    expect(w.x1).toBeLessThanOrEqual(W * 0.6) // left of the cost line (the scrim's hole from 0.6 W)
    expect(w.y0).toBeGreaterThanOrEqual(46) // under the top row (Total, APPROVAL, ROSTER)
    const b = actOn('offthebooks', { W, H: 148, m: 'brand', at: T0, on: 'band' })
    expect(b).toContain(`<rect x="${w.x0}" y="${w.y0}" width="${w.x1 - w.x0}"`)
    expect(b).toContain('clip-path="url(#')
  }
})

test('fights: rare, through the director: one AMBUSH slot in four is the look\'s fight, never at rest, never stacked', { timeoutMs: 60_000 }, () => {
  fresh()
  expect(TAKEOVERS).toEqual(['ambush-a', 'ambush-b', 'ambush-c', 'fight'])
  const seen: Slot[] = []
  let last: Slot | undefined
  for (let t = T0; t < T0 + 3 * 86_400_000; t += 5000) {
    const s = stageAt(t, { mode: 'book', working: true })
    if (s && (!last || s.startAt !== last.startAt)) seen.push(s)
    last = s
  }
  const fights = seen.filter(s => s.src === 'fight')
  const amb = seen.filter(s => s.src === 'ambush')
  expect(fights.length).toBeGreaterThanOrEqual(15) // ~9 a day of solid work
  expect(fights.length).toBeLessThanOrEqual(3 * 48 / 4 + 3)
  for (const f of fights) expect(f.kind).toBe('offthebooks')
  // At most one fight per 30-45 min (in practice one every 2-3 h), and no AMBUSH within 30 min of a fight.
  for (let i = 1; i < fights.length; i++) expect((fights[i] as Slot).startAt - (fights[i - 1] as Slot).startAt).toBeGreaterThanOrEqual(30 * MIN)
  for (const f of fights) for (const a of amb) expect(Math.abs(f.startAt - a.startAt), 'fight vs AMBUSH').toBeGreaterThanOrEqual(30 * MIN)
  // Never at rest.
  for (let t = T0; t < T0 + 86_400_000; t += 20_000) expect(stageAt(t, { mode: 'book', working: false })?.src).not.toBe('fight')
  // The slot is the same in every look; the fight is the look's own.
  let slot = Math.floor(T0 / AMB_SLOT_MS)
  while (ambushOfSlot(slot).src !== 'fight') slot++
  const s = ambushOfSlot(slot)
  expect(fightOf(s.startAt, 'gold')).toBe('reunion')
  expect(fightOf(s.startAt, 'noir')).toBe('curtainup')
  expect(fightOf(s.startAt, 'book')).toBe('offthebooks')
  expect([...new Set([0, 1, 2, 3].map(n => fightFor('brand', n)))].sort()).toEqual(['offthebooks', 'race'])
})

test('fights: a replay name each (the 92 older names still play), the typed and event triggers', async () => {
  for (const [name] of FIGHT_PLAYS) {
    expect(REPLAYS.map(r => r.name)).toContain(name)
    fresh()
    expect(await runPlay('the-boys', name, T0)).toBe(`▶ ${name}`)
    expect(boysFx()).toEqual({ kind: name, at: T0 })
  }
  expect(REPLAYS.length).toBeGreaterThanOrEqual(96)
  expect(CURTAIN_UP_RE.test('ok, curtain up')).toBe(true)
  expect(CURTAIN_UP_RE.test('curtain call')).toBe(false)
  expect(CURTAIN_RE.test('curtain up')).toBe(false)
  // TURBO RUSH: A-Train races the bar once a session (when a fight may start, below), then the turbo act.
  const t = clearOfFights(T0)
  fresh()
  boysEvent('turbo', { at: t, mode: 'brand' })
  expect(boysFx()?.kind).toBe('race')
  boysEvent('turbo', { at: t + 60_000, mode: 'brand' })
  expect(boysFx()?.kind).toBe('turbo')
})

/** The first moment from `t` on with no director fight within the fight gap either side (minute steps). */
const clearOfFights = (t: number): number => {
  for (let at = t; at < t + 600 * MIN; at += MIN) if (!directorAt(at).plan(at - FIGHT_GAP_MS, at + FIGHT_GAP_MS, { working: true }).some(s => s.lane === 'ambush' && s.id === 'fight' && Math.abs(s.startAt - at) < FIGHT_GAP_MS)) return at
  throw new Error('no clear time')
}

test('fights: the RACE on TURBO RUSH keeps the fight gap (never near a director fight, never over a live act), its replay still plays', async () => {
  let slot = Math.floor(T0 / AMB_SLOT_MS)
  while (ambushOfSlot(slot).src !== 'fight') slot++
  const f = ambushOfSlot(slot)
  // Inside the gap either side of the look's own fight: the plain turbo act, and the session's one race is not spent.
  for (const at of [f.startAt - 10 * MIN, f.startAt - 1000, f.startAt + 5 * MIN, f.startAt + 25 * MIN]) {
    fresh()
    setBoysFx('none', at - 600_000)
    boysEvent('turbo', { at, mode: 'brand' })
    expect(boysFx()?.kind, `${(at - f.startAt) / MIN} min`).toBe('turbo')
    expect(boysState().raced).toBe(false)
  }
  // Clear of every fight: the race, once.
  const t = clearOfFights(f.startAt)
  expect(t - f.startAt).toBeGreaterThanOrEqual(FIGHT_GAP_MS)
  fresh()
  boysEvent('turbo', { at: t, mode: 'noir' })
  expect(boysFx()).toEqual({ kind: 'race', at: t })
  boysEvent('turbo', { at: t + 20 * MIN, mode: 'noir' })
  expect(boysFx()?.kind).toBe('turbo')
  // One big act at a time: a fight already on stage keeps it, and the race waits for a later rush.
  fresh()
  setBoysFx('offthebooks', t)
  boysEvent('turbo', { at: t + 2000, mode: 'brand' })
  expect(boysFx()).toEqual({ kind: 'offthebooks', at: t })
  expect(boysState().raced).toBe(false)
  boysEvent('turbo', { at: t + 60_000, mode: 'brand' })
  expect(boysFx()?.kind).toBe('race')
  // The replay plays whenever it is asked for, even next to a fight.
  fresh()
  expect(await runPlay('the-boys', 'race', f.startAt - 1000)).toBe('▶ race')
  expect(boysFx()?.kind).toBe('race')
  fresh()
})

test('fights: on the CRISIS DESK every fight plays under the title row and left of the right-hand column (no number covered)', () => {
  for (const k of FIGHT_KINDS) for (const m of LOOKS) for (const [W, H] of [[600, 311], [992, 384], [480, 240]] as const) {
    const p = actOn(k, { W, H, m, at: T0, on: 'task' })
    const clip = p.match(/<clipPath id="[a-z0-9-]+w"><rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"\/><\/clipPath>/)
    expect(clip, `${k} ${m} ${W}`).toBeTruthy()
    const [x, y, w, h] = (clip as RegExpMatchArray).slice(1).map(Number) as [number, number, number, number]
    expect(x, `${k} ${m} ${W} x`).toBeGreaterThanOrEqual(8)
    expect(y, `${k} ${m} ${W} y`).toBeGreaterThanOrEqual(PANE_TOP)
    expect(x + w, `${k} ${m} ${W} right`).toBeLessThanOrEqual(W - PANE_RIGHT)
    expect(y + h, `${k} ${m} ${W} foot`).toBeLessThanOrEqual(H - 8)
    // Everything of the fight is inside that window: its layers and its reduced-motion still are clipped groups.
    expect((p.match(/clip-path="url\(#[a-z0-9-]+w\)"/g) ?? []).length, `${k} ${m}`).toBeGreaterThanOrEqual(2)
  }
  // The card's own readouts sit outside: `N of M spun` and the percent end at W - 16 / W - 26, its stamps start past W - 90.
  expect(PANE_RIGHT).toBeGreaterThanOrEqual(120)
})

test('fights: A-Train races in the look\'s own film (NOIR greys, SOLID GOLD gold), his blue only ON BRAND and OFF BOOK', () => {
  const blues = Object.values(SP.TB_ATRAIN_RUN1.pal).filter(c => { const n = parseInt(c.slice(1), 16); const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; return b > r + 40 && b > g + 20 })
  expect(blues.length).toBeGreaterThan(0)
  const has = (s: string) => blues.some(c => s.toUpperCase().includes(c.toUpperCase()))
  for (const on of ['band', 'task'] as const) {
    expect(has(actOn('race', { W: 900, H: on === 'band' ? 148 : 311, m: 'brand', at: T0, on })), `brand ${on}`).toBe(true)
    for (const m of ['noir', 'gold'] as const) {
      const s = actOn('race', { W: 900, H: on === 'band' ? 148 : 311, m, at: T0, on })
      expect(has(s), `${m} ${on}`).toBe(false)
      expect(s, `${m} ${on}`).not.toContain('#4FC3F7')
      if (m === 'noir') expect(s, `${m} ${on}`).not.toContain('#3DDC84')
    }
  }
})

test('fights: SOLID GOLD keeps its band budget during a fight (the shield steps off the meter, the tape roll waits)', () => {
  fresh()
  setBoysFx('reunion', T0)
  expect(fightDrawn(T0 + 2000)).toBe(true)
  expect(fightDrawn(T0 + 60_000)).toBe(false)
  expect(syringe(0, 64, 400, 50, 'gold', { working: true })).toContain('data-egg="shield"')
  expect(syringe(0, 64, 400, 50, 'gold', { working: true, bare: true })).not.toContain('data-egg="shield"')
  fresh()
})
