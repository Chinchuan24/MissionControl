// The Boys (fan homage): THE SCHEDULE on the shared stage director (hooks/stage/director.ts). Everything that plays by itself
// comes from the clock alone, so a redraw anywhere asks again and gets the same answer:
//   lanes, highest priority first:
//     p-<piece>  the daily SET PIECES, each once a day at a seeded time in its local-hour window (the 2nd WALK is OFF BOOK's,
//                BRAVE MAEVE only in June, none drawn in NOIR; the SOLID GOLD teaser keeps 2 min off THE PREMIERE)
//     ambush     THE AMBUSH, 12 s, `rare` (30-45 min apart) and only while a job works; the three choreographies take turns
//                with the look's FIGHT (theboys-fights.ts): one slot in four is a fight, so the two never stack and a fight
//                comes at most once per 30-45 min (in practice every 2-3 h of work)
//     roam       the 12 cameo roamers: 6-min slots, a seeded moment in the first 2 min, 65% of slots, by weight
//     oi         Butcher's `Oi.` takeover: its own very rare lane, never within 4 min of another act
//   A lower lane's slot near a higher one is dropped (never moved). Typed acts and event eggs are `held` windows: nothing
//   scheduled starts within 10 s of one. Every bit with a replay name is offered by `/missioncontrol play` (theboys-show.ts).
// The previous scheduler (one hand-rolled function per stream) is kept below as `V1` for one release: the tests compare the
// hit counts per simulated day.
import { Director, cadence, localOffsetMs } from './stage/director'
import type { Slot as DSlot } from './stage/director'
import { unit } from './theboys'
import type { Mode } from './theboys'
import { actMs, boysFx } from './theboys-eggs'
import { fightFor } from './theboys-fights'

/** The LOCAL date's day number (a UTC day would flip mid-evening west of UTC and re-roll the day's times halfway through). */
export const localDay = (at: number): number => {
  const d = new Date(at)
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000)
}
export type Slot = { kind: string; startAt: number; endAt: number; src: 'fx' | 'ambush' | 'fight' | 'piece' | 'roamer'; book?: boolean }
/** The daily set pieces (bible §5.1): local hours [from, to); THE WALK twice in OFF BOOK; BRAVE MAEVE only in June. */
export const PIECES: { kind: string; from: number; to: number; june?: boolean; book?: boolean }[] = [
  { kind: 'redscare', from: 8, to: 12 },
  { kind: 'ice', from: 9, to: 22 },
  { kind: 'whale', from: 10, to: 21 },
  { kind: 'expo', from: 14, to: 18 },
  { kind: 'premiere', from: 19, to: 22.5 },
  { kind: 'teaser', from: 18, to: 23 },
  { kind: 'walk', from: 11, to: 20 },
  { kind: 'walk', from: 11, to: 20, book: true },
  { kind: 'bravemaeve', from: 10, to: 20, june: true },
]
/** The breath between two acts (the director's default), and the teaser's distance from THE PREMIERE. */
export const PIECE_GAP_MS = 10_000
export const TEASER_GAP_MS = 120_000
export const AMBUSH_MS = 12_000
export const AMB_SLOT_MS = cadence('rare').slotMs
export const AMB_JITTER_MS = cadence('rare').jitterMs
export const CHOREOS = ['a', 'b', 'c'] as const
/** The AMBUSH lane's turns: the three choreographies, then the look's fight (`fight` stands for it until a look draws it). */
export const TAKEOVERS = ['ambush-a', 'ambush-b', 'ambush-c', 'fight'] as const
export const FIGHT_ID = 'fight'
/** Roamers: [4, 8] min gives 6-min slots with the hit in each slot's first 2 min (cadence: slot = mean, jitter = half the spread). */
export const ROAM_GAP: [number, number] = [4, 8]
export const ROAM_SLOT_MS = cadence(ROAM_GAP).slotMs
export const ROAM_JITTER_MS = cadence(ROAM_GAP).jitterMs
export const ROAM_CHANCE = 0.65
export const ROAMERS: [string, number][] = [
  ['r-hughie', 30], ['r-starlight', 8], ['r-kimiko', 8], ['r-frenchie', 7], ['r-noir', 7], ['r-atrain', 8], ['r-terror', 7],
  ['r-fish', 5], ['r-timothy', 4], ['r-ambrosius', 4], ['r-beaver', 3], ['r-blimp', 5], ['r-oi', 4],
]
/** Butcher's `Oi.`: a hit every 2-4 h, kept only when nothing else plays within 4 min (so about one in a long working day). */
export const OI_GAP: [number, number] = [120, 240]
export const OI_BREATH_MS = 240_000
/** The `/missioncontrol play` names of the director's bits (the names phase 3 gave them). */
export const ROAM_PLAY: Record<string, string> = {
  'r-hughie': 'hughie', 'r-starlight': 'starlight', 'r-kimiko': 'kimiko', 'r-frenchie': 'frenchie', 'r-noir': 'noir', 'r-atrain': 'atrain', 'r-terror': 'waddle',
  'r-fish': 'school', 'r-timothy': 'swimby', 'r-ambrosius': 'tentacle', 'r-beaver': 'bounce', 'r-blimp': 'blimp', 'r-oi': 'oi',
}
/** How far ahead an idle draw schedules a set piece or a roamer (the band redraws once a minute at rest). */
export const AHEAD_MS = 75_000
export const SEED = 'boys'

// ---------------------------------------------------------------- the director
/** The lane of a PIECES row (the 2nd WALK is `p-walk2`, its bit `walk2`). */
const pieceId = (i: number): string => (PIECES[i]?.book ? `${PIECES[i]?.kind}2` : (PIECES[i]?.kind as string))
/** The act kind of a director bit. */
export const kindOf = (id: string): string => (id === 'walk2' ? 'walk' : id)
/** Builds the whole Boys director: set pieces (June adds BRAVE MAEVE), THE AMBUSH, the roamers, Butcher's Oi. */
export const buildDirector = (o: { june?: boolean; dayOffsetMs?: number } = {}): Director => {
  const dir = new Director(SEED, { breathMs: PIECE_GAP_MS, ...(o.dayOffsetMs !== undefined ? { dayOffsetMs: o.dayOffsetMs } : {}) })
  PIECES.forEach((p, i) => {
    if (p.june && !o.june) return
    const id = pieceId(i)
    dir.lane(`p-${id}`, { daily: [p.from, p.to], ...(p.kind === 'teaser' ? { breathMs: TEASER_GAP_MS } : {}) })
    dir.add(`p-${id}`, { id, ms: actMs(p.kind), ...(p.book ? {} : { replay: p.kind }) })
  })
  dir.lane('ambush', { gap: 'rare', when: 'working', pick: 'turns' })
  for (const id of TAKEOVERS) dir.add('ambush', { id, ms: AMBUSH_MS, ...(id === FIGHT_ID ? {} : { replay: id }) })
  dir.lane('roam', { gap: ROAM_GAP, chance: ROAM_CHANCE })
  for (const [id, weight] of ROAMERS) if (id !== 'r-oi') dir.add('roam', { id, ms: actMs(id), weight, replay: ROAM_PLAY[id] as string })
  dir.lane('oi', { gap: OI_GAP, breathMs: OI_BREATH_MS })
  dir.add('oi', { id: 'r-oi', ms: actMs('r-oi'), replay: 'oi' })
  return dir
}
/** The offset of the LOCAL day of `at` (taken at its noon), so every moment of one day shares one schedule. */
const offOf = (at: number): number => {
  const d = new Date(at)
  d.setHours(12, 0, 0, 0)
  return localOffsetMs(d.getTime())
}
const DIRS = new Map<string, Director>()
/** The director for the local day of `at` (its zone offset, June or not). Cached: same answer on every redraw. */
export const directorAt = (at: number): Director => {
  const june = new Date(at).getMonth() === 5
  const off = offOf(at)
  const key = `${off}|${june ? 1 : 0}`
  let d = DIRS.get(key)
  if (!d) {
    if (DIRS.size > 8) DIRS.clear()
    d = buildDirector({ june, dayOffsetMs: off })
    DIRS.set(key, d)
  }
  return d
}
/** THE AMBUSH lane alone (same seed, same lane): its raw slots, whatever beats them. */
let AMB_ONLY: Director | undefined
const ambOnly = (): Director => {
  if (!AMB_ONLY) {
    AMB_ONLY = new Director(SEED, { breathMs: PIECE_GAP_MS }).lane('ambush', { gap: 'rare', when: 'working', pick: 'turns' })
    for (const id of TAKEOVERS) AMB_ONLY.add('ambush', { id, ms: AMBUSH_MS })
  }
  return AMB_ONLY
}
const srcOf = (lane: string, id = ''): Slot['src'] => (lane === 'ambush' ? (id === FIGHT_ID ? 'fight' : 'ambush') : lane.startsWith('p-') ? 'piece' : 'roamer')
/** A director slot as the Boys' `Slot`. */
export const toSlot = (s: DSlot): Slot => ({ kind: kindOf(s.id), startAt: s.startAt, endAt: s.endAt, src: srcOf(s.lane, s.id), ...(s.id === 'walk2' ? { book: true } : {}) })
/** The fight a shared slot plays in a look (theboys-fights `fightFor`; ON BRAND alternates by the fight's number). */
export const fightOf = (startAt: number, mode: Mode): string => fightFor(mode, Math.floor(Math.floor(startAt / AMB_SLOT_MS) / TAKEOVERS.length))
/** A director slot as drawn in a look: a fight slot becomes that look's fight, with its own length. */
const inLook = (s: Slot, mode: Mode): Slot => {
  if (s.src !== 'fight') return s
  const kind = fightOf(s.startAt, mode)
  return { ...s, kind, endAt: s.startAt + actMs(kind) }
}
/** What a look shows of a slot: NOIR draws no set pieces, and only OFF BOOK draws the 2nd WALK. */
const shows = (s: DSlot, mode: Mode): boolean => !s.lane.startsWith('p-') || (mode !== 'noir' && (s.id !== 'walk2' || mode === 'book'))
const LONG = (): number => Math.max(AMBUSH_MS, ...PIECES.map(p => actMs(p.kind)), ...ROAMERS.map(([k]) => actMs(k)))

const DAYS = new Map<string, Slot[]>()
/** The day's set pieces (every look's: the 2nd WALK is marked `book`), the same for every moment of the same local day. */
export const dayPlan = (at: number): Slot[] => {
  const d0 = new Date(at)
  d0.setHours(0, 0, 0, 0)
  const d1 = new Date(d0.getTime())
  d1.setDate(d1.getDate() + 1)
  const key = `${d0.getTime()}`
  const hit = DAYS.get(key)
  if (hit) return hit
  const out = directorAt(at).plan(d0.getTime(), d1.getTime()).filter(s => s.lane.startsWith('p-')).map(toSlot)
  if (DAYS.size > 8) DAYS.clear()
  DAYS.set(key, out)
  return out
}
/** The slot's AMBUSH as the lane draws it (before anything beats it): its start and its choreography. */
export const ambushOfSlot = (slot: number): Slot => {
  const s = ambOnly().plan(slot * AMB_SLOT_MS, (slot + 1) * AMB_SLOT_MS, { working: true })[0] as DSlot
  return toSlot(s)
}
/** The AMBUSH due at `at` (a job must be working; a set piece near it wins). */
export const ambushAt = (at: number): Slot | undefined => {
  const s = directorAt(at).plan(at - AMBUSH_MS - 1000, at + 1001, { working: true }).find(x => x.lane === 'ambush' && x.id !== FIGHT_ID && at >= x.startAt - 1000 && at < x.endAt)
  return s ? toSlot(s) : undefined
}
/** The roamer (or Butcher's Oi.) in 6-min slot `slot`, if one plays there. */
export const roamerOfSlot = (slot: number): Slot | undefined => {
  const t0 = slot * ROAM_SLOT_MS
  const s = directorAt(t0).plan(t0, t0 + ROAM_SLOT_MS).find(x => x.lane === 'roam' || x.lane === 'oi')
  return s ? toSlot(s) : undefined
}
/** Black Noir's cameo carries the `1979` VHS tag (the clue to THIS MEANS NOIR) one time in five. */
export const noirClue = (startAt: number): boolean => unit(`tb-noir79|${startAt}`) < 0.2
export type StageArgs = { working?: boolean; mode: Mode; swapAt?: number }
/** What plays at `at`, one thing at a time: a typed act or an event egg (`fx`), else what the director has on (a set piece, THE
 *  AMBUSH while a job works, a roamer), drawn up to AHEAD_MS before its start. A mode swap holds everything. */
export const stageAt = (at: number, o: StageArgs): Slot | undefined => {
  const fx = boysFx()
  if (fx && at >= fx.at - 1000 && at < fx.at + actMs(fx.kind)) return { kind: fx.kind, startAt: fx.at, endAt: fx.at + actMs(fx.kind), src: 'fx' }
  if (o.swapAt !== undefined && o.swapAt > 0 && at >= o.swapAt - 1000 && at < o.swapAt + 2_700) return undefined
  const held = fx ? [{ startAt: fx.at, endAt: fx.at + actMs(fx.kind), id: fx.kind }] : []
  const s = directorAt(at).plan(at - LONG(), at + AHEAD_MS + 1, { working: o.working === true, held }).find(x => shows(x, o.mode) && at < x.endAt && x.startAt <= at + AHEAD_MS)
  return s ? inLook(toSlot(s), o.mode) : undefined
}

// ---------------------------------------------------------------- V1: the previous scheduler, kept one release for the tests
const hourOf = (at: number, h: number): number => {
  const d = new Date(at)
  d.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0)
  return d.getTime()
}
const near = (a: { startAt: number; endAt: number }, b: { startAt: number; endAt: number }, gap: number): boolean => a.startAt < b.endAt + gap && b.startAt < a.endAt + gap
const V1_DAYS = new Map<number, Slot[]>()
const v1DayPlan = (at: number): Slot[] => {
  const day = localDay(at)
  const hit = V1_DAYS.get(day)
  if (hit) return hit
  const june = new Date(at).getMonth() === 5
  const out: Slot[] = []
  PIECES.forEach((p, i) => {
    if (p.june && !june) return
    const ms = actMs(p.kind)
    const lo = hourOf(at, p.from)
    const span = Math.max(1, hourOf(at, p.to) - ms - lo)
    for (let k = 0; k < 16; k++) {
      const startAt = lo + Math.floor(unit(`tb-day|${day}|${i}|${k}`) * span)
      const endAt = startAt + ms
      const gap = (q: Slot): number => ((p.kind === 'teaser' && q.kind === 'premiere') || (p.kind === 'premiere' && q.kind === 'teaser') ? TEASER_GAP_MS : PIECE_GAP_MS)
      if (out.every(q => startAt >= q.endAt + gap(q) || endAt + gap(q) <= q.startAt)) {
        out.push({ kind: p.kind, startAt, endAt, src: 'piece', ...(p.book ? { book: true } : {}) })
        return
      }
    }
  })
  out.sort((a, b) => a.startAt - b.startAt)
  if (V1_DAYS.size > 8) V1_DAYS.clear()
  V1_DAYS.set(day, out)
  return out
}
const v1PieceNear = (s: { startAt: number; endAt: number }): boolean => [s.startAt, s.endAt].some(t => v1DayPlan(t).some(q => near(s, q, PIECE_GAP_MS)))
const v1AmbushOfSlot = (slot: number): Slot => {
  const startAt = slot * AMB_SLOT_MS + Math.floor(unit(`tb-amb|${slot}`) * AMB_JITTER_MS)
  return { kind: `ambush-${CHOREOS[((slot % 3) + 3) % 3]}`, startAt, endAt: startAt + AMBUSH_MS, src: 'ambush' }
}
const v1AmbushAt = (at: number): Slot | undefined => {
  const a = v1AmbushOfSlot(Math.floor(at / AMB_SLOT_MS))
  return at >= a.startAt - 1000 && at < a.endAt && !v1PieceNear(a) ? a : undefined
}
const ROAM_SUM = ROAMERS.reduce((n, [, w]) => n + w, 0)
const v1RoamerOfSlot = (slot: number): Slot | undefined => {
  if (unit(`tb-roam|on|${slot}`) >= ROAM_CHANCE) return undefined
  let r = unit(`tb-roam|who|${slot}`) * ROAM_SUM
  let kind = 'r-hughie'
  for (const [k, w] of ROAMERS) {
    if (r < w) { kind = k; break }
    r -= w
  }
  if (kind === 'r-oi' && ((slot % 8) + 8) % 8 !== 0) kind = 'r-hughie'
  const startAt = slot * ROAM_SLOT_MS + Math.floor(unit(`tb-roam|t|${slot}`) * ROAM_JITTER_MS)
  const s: Slot = { kind, startAt, endAt: startAt + actMs(kind), src: 'roamer' }
  const amb = v1AmbushOfSlot(Math.floor(startAt / AMB_SLOT_MS))
  if (v1PieceNear(s) || near(s, amb, PIECE_GAP_MS)) return undefined
  return s
}
const v1StageAt = (at: number, o: StageArgs): Slot | undefined => {
  const fx = boysFx()
  if (fx && at >= fx.at - 1000 && at < fx.at + actMs(fx.kind)) return { kind: fx.kind, startAt: fx.at, endAt: fx.at + actMs(fx.kind), src: 'fx' }
  if (o.swapAt !== undefined && o.swapAt > 0 && at >= o.swapAt - 1000 && at < o.swapAt + 2_700) return undefined
  if (fx && at >= fx.at && at < fx.at + actMs(fx.kind) + 10_000) return undefined
  if (o.working) {
    const a = v1AmbushAt(at)
    if (a) return a
  }
  if (o.mode !== 'noir') {
    const p = v1DayPlan(at).find(q => (!q.book || o.mode === 'book') && at < q.endAt && q.startAt <= at + AHEAD_MS)
    if (p) return p
  }
  const slot = Math.floor(at / ROAM_SLOT_MS)
  for (const s of [slot, slot + 1]) {
    const r = v1RoamerOfSlot(s)
    if (r && at < r.endAt && r.startAt <= at + AHEAD_MS) return r
  }
  return undefined
}
/** The previous scheduler, unused by the skin: kept for one release so the tests can compare hit counts per day. */
export const V1 = { dayPlan: v1DayPlan, ambushOfSlot: v1AmbushOfSlot, ambushAt: v1AmbushAt, roamerOfSlot: v1RoamerOfSlot, stageAt: v1StageAt }
