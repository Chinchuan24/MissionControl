// The director: ONE scheduler for every rare thing a skin plays (roamers, set pieces, fights, the AMBUSH-style acts).
// It never draws. It answers "what plays at `at`?" as a pure function of the clock, so a redraw asks again and gets the
// same answer: no state, no memory of the last act, every choice seeded.
//
//   lanes     a lane is one stream of seeded slots ("a fight every 30-45 min"). Each slot fires with the lane's `chance`
//             and picks ONE of its bits (by weight, or in turns). Lanes are in priority order: the first added wins.
//   bits      what a lane can play: an id, a length, a weight, an optional `/missioncontrol play <name>` replay name.
//   rules     exclusivity: one act at a time, with a breath (cooldown) between two acts; a lower lane's slot that would
//             land near a higher lane's slot is dropped, never shifted. `held` windows (a typed act, the skin switch) beat
//             every lane. `when` keeps a lane to working (or idle) time. `daily` lanes fire once a day at a seeded time.
//
//   const dir = new Director('boys')
//     .lane('fight', { gap: 'fight', when: 'working', pick: 'turns' })
//     .add('fight', { id: 'offthebooks', ms: 9000, replay: 'offthebooks' })
//     .lane('roam', { gap: [5, 7], chance: 0.65 })
//     .add('roam', { id: 'r-hughie', ms: 6000, weight: 30 }).add('roam', { id: 'r-noir', ms: 5000, weight: 7 })
//   const s = dir.at(now, { working, held: typed ? [typed] : [] }, AHEAD_MS)   // { lane, id, startAt, endAt } | undefined
//
// Cheap helpers for skins whose own scheduler stays (roamer.ts windows, a skin's own slots): `perWindow`, `cadence`.
import { hash } from './frames'

export const MIN = 60_000
export const DAY = 86_400_000
/** Minutes between two hits of one lane: [shortest, longest]. */
export type Gap = [number, number]
/**
 * The rarity words, as gaps in minutes. `fight` is the crew's rule (at most one fight per 30-45 min); `rare` is the AMBUSH's.
 * Pick by how often a person should see it in a working day, not by how good it looks.
 */
export const RARITY = {
  often: [2, 4],
  sometimes: [6, 10],
  uncommon: [12, 20],
  rare: [30, 45],
  fight: [30, 45],
  epic: [60, 120],
} as const satisfies Record<string, Gap>
export type Rarity = keyof typeof RARITY
const gapOf = (g: Rarity | Gap): Gap => (typeof g === 'string' ? [...RARITY[g]] : g)

// ---------------------------------------------------------------- how often the fights play (Chin's setting, wave 4)
/**
 * `/missioncontrol fights often | normal | rare | off` (saved in the store). Every FIGHT lane (`fightLane`, `fight: true`)
 * follows it at query time, in every skin: `often` (the default) a fight every 7-10 min while a job works and every 15-20 min
 * at rest; `normal` 15-20 min, working only; `rare` the old 30-45 min, working only; `off` none by itself (replays still play).
 * Roamers and set pieces keep their own lanes. A fight lane picks its fights in turns, so a skin with several rotates.
 */
export type FightLevel = 'often' | 'normal' | 'rare' | 'off'
export const FIGHT_LEVELS: readonly FightLevel[] = ['often', 'normal', 'rare', 'off']
/** Each level's gaps in minutes: while a job works, and at rest (none: the fights wait for a job). */
export const FIGHT_GAPS: Record<FightLevel, { work?: Gap; idle?: Gap }> = { often: { work: [7, 10], idle: [15, 20] }, normal: { work: [15, 20] }, rare: { work: [30, 45] }, off: {} }
// The engine's own default is the crew's old rule (`rare`): a director asked outside the plugin (a skin's unit test, a tool)
// keeps the 30-45 min cadence. The PLUGIN's default is `often` (Chin's call): register.tsx sets the level at every session start
// from the store, `often` when nothing is saved (`cleanFightLevel`).
let LEVEL: FightLevel = 'rare'
/** The fight level now (module state: the plugin sets it from the store at start and on the command). */
export const fightLevel = (): FightLevel => LEVEL
export const setFightLevel = (l: FightLevel): void => { LEVEL = l }
/** A stored or typed value as a level (anything else: the default, `often`). */
export const cleanFightLevel = (v: unknown): FightLevel => (FIGHT_LEVELS.includes(String(v).toLowerCase() as FightLevel) ? (String(v).toLowerCase() as FightLevel) : 'often')
let JOB_AT: number | undefined
/** A job's first moments belong to its own job-start acts (a slate, the Sandevistan, the dive): at `often` and `normal` no fight
 *  starts from 5 s before a job's start to 90 s after it. The plugin tells the engine when a job starts. */
export const JOB_BREATH_MS = 90_000
export const setJobStart = (at: number | undefined): void => { JOB_AT = at }
/** What a cached fight plan depends on besides the clock (the level, the job's start): part of a cache key. */
export const fightKey = (): string => `${LEVEL}|${LEVEL === 'often' || LEVEL === 'normal' ? JOB_AT ?? '' : ''}`
/** The gap a fight lane uses now, working or at rest (undefined: no fight then). */
export const fightGap = (working: boolean, level: FightLevel = LEVEL): Gap | undefined => (working ? FIGHT_GAPS[level].work : FIGHT_GAPS[level].idle)

/**
 * A lane's slot geometry for a gap: slots of the mean length, each hit at a seeded moment in the first `jitter` of its slot.
 * Two hits of one lane are then never closer than the shortest gap, nor further apart than the longest (at chance 1).
 */
export const cadence = (g: Rarity | Gap): { slotMs: number; jitterMs: number } => {
  const [a, b] = gapOf(g)
  return { slotMs: Math.round(((a + b) / 2) * MIN), jitterMs: Math.round(((b - a) / 2) * MIN) }
}
/** The chance per window (a roamer's 30 s window by default) that gives about one hit every `everyMin` minutes. */
export const perWindow = (everyMin: number, windowMs = 30_000): number => Math.round(Math.min(1, Math.max(0, windowMs / (everyMin * MIN))) * 1e4) / 1e4

/**
 * The local time zone's offset from UTC at `at`, in ms, east positive: what `new Director(seed, { dayOffsetMs })` wants so a
 * daily lane's hours are the person's hours. (JS `getTimezoneOffset()` is in minutes and WEST positive: do not pass it raw.)
 */
export const localOffsetMs = (at: number): number => -new Date(at).getTimezoneOffset() * MIN

/** A stable number in [0, 1) for a text (FNV-1a, then a murmur-style mix). */
export const u01 = (s: string): number => {
  let h = hash(s)
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

export type When = 'working' | 'idle' | 'any'
export type Bit = {
  id: string
  /** How long it plays (ms). */
  ms: number
  /** Share of the lane's hits (pick 'weight'). Default 1. */
  weight?: number
  /** `/missioncontrol play <replay>` plays it now. */
  replay?: string
}
export type LaneOpts = {
  /** Minutes between two hits: a rarity word or [shortest, longest]. Ignored by daily lanes. */
  gap?: Rarity | Gap
  /** Share of slots that fire. Default 1. */
  chance?: number
  /** Only while a job works, only at rest, or both (default). */
  when?: When
  /** How a slot picks its bit: seeded by weight (default), or in turns (slot n plays bit n mod count). */
  pick?: 'weight' | 'turns'
  /** Once a day, at a seeded time between these local hours [from, to). */
  daily?: [number, number]
  /** Breath after this lane's act (and before), during which nothing else starts. Default the director's. */
  breathMs?: number
  /** A fight lane: its gap and its hours follow the fight level (`fightGap`), not `gap` / `when`. */
  fight?: boolean
  /** A fight lane that plays only at these levels (The Boys' own lane: at `rare` its AMBUSH turn keeps the old rule). */
  fightLevels?: FightLevel[]
}
export type Slot = { lane: string; id: string; startAt: number; endAt: number; src: 'lane' | 'daily' | 'held' | 'replay' }
export type Ctx = {
  working?: boolean
  /** Windows something else owns (a typed act, the skin switch): nothing scheduled starts near them. */
  held?: { startAt: number; endAt: number; id?: string }[]
  /** Everything off (a mode swap, a quiet skin). */
  quiet?: boolean
}
type Lane = { name: string; o: LaneOpts; bits: Bit[]; slotMs: number; jitterMs: number; breathMs: number }

const near = (a: { startAt: number; endAt: number }, b: { startAt: number; endAt: number }, gap: number): boolean => a.startAt < b.endAt + gap && b.startAt < a.endAt + gap

export class Director {
  private lanes: Lane[] = []
  /**
   * `breathMs`: the default cooldown between two acts (10 s). `dayOffsetMs`: the local time zone's offset from UTC in ms
   * (east positive), so a daily lane's hours are the person's hours. Same seed, same schedule on every redraw.
   */
  constructor(readonly seed: string, readonly o: { breathMs?: number; dayOffsetMs?: number } = {}) {}

  /** A lane, after every lane added before it (which beat it). */
  lane(name: string, o: LaneOpts): this {
    if (this.lanes.some(l => l.name === name)) throw new Error(`stage/director: lane "${name}" twice`)
    const { slotMs, jitterMs } = o.daily ? { slotMs: DAY, jitterMs: 0 } : cadence(o.gap ?? 'uncommon')
    this.lanes.push({ name, o, bits: [], slotMs, jitterMs, breathMs: o.breathMs ?? this.o.breathMs ?? 10_000 })
    return this
  }
  /** A bit (a roamer, a set piece, a fight) in a lane. */
  add(lane: string, bit: Bit): this {
    const l = this.lanes.find(x => x.name === lane)
    if (!l) throw new Error(`stage/director: no lane "${lane}"`)
    if (this.lanes.some(x => x.bits.some(b => b.id === bit.id))) throw new Error(`stage/director: bit "${bit.id}" twice`)
    l.bits.push(bit)
    return this
  }
  /** Lane names, highest priority first. */
  laneNames(): string[] { return this.lanes.map(l => l.name) }
  /** Every replay name (what `/missioncontrol play` offers). */
  replays(): string[] { return this.lanes.flatMap(l => l.bits.filter(b => b.replay).map(b => b.replay as string)) }
  private bitOf(id: string): { lane: Lane; bit: Bit } | undefined {
    for (const lane of this.lanes) for (const bit of lane.bits) if (bit.id === id || bit.replay === id) return { lane, bit }
    return undefined
  }

  /**
   * A lane's slot geometry. A fight lane's follows the fight level and the job: its working and its resting slots are two
   * seeded series (a lane with no gap at rest has no slots then).
   */
  private geo(l: Lane, working: boolean): { slotMs: number; jitterMs: number; tag: string } | undefined {
    if (!l.o.fight) return { slotMs: l.slotMs, jitterMs: l.jitterMs, tag: '' }
    if (l.o.fightLevels && !l.o.fightLevels.includes(LEVEL)) return undefined
    const g = fightGap(working)
    return g ? { ...cadence(g), tag: working ? '' : 'i' } : undefined
  }
  /** The raw candidate of lane `l` in slot `n` (chance and pick applied; no context, no conflicts). */
  private raw(l: Lane, n: number, working = true): Slot | undefined {
    if (!l.bits.length) return undefined
    const g = this.geo(l, working)
    if (!g) return undefined
    const s = `${this.seed}|${l.name}|${g.tag}${n}`
    if (u01(`${s}|on`) >= (l.o.chance ?? 1)) return undefined
    let bit = l.bits[0] as Bit
    if (l.o.pick === 'turns') bit = l.bits[((n % l.bits.length) + l.bits.length) % l.bits.length] as Bit
    else {
      const sum = l.bits.reduce((a, b) => a + (b.weight ?? 1), 0)
      let r = u01(`${s}|who`) * sum
      for (const b of l.bits) { if (r < (b.weight ?? 1)) { bit = b; break } r -= b.weight ?? 1 }
    }
    let startAt: number
    if (l.o.daily) {
      const [h0, h1] = l.o.daily
      const off = this.o.dayOffsetMs ?? 0
      startAt = n * DAY - off + Math.floor((h0 + u01(`${s}|t`) * Math.max(0, h1 - h0)) * 3_600_000)
    } else startAt = n * g.slotMs + Math.floor(u01(`${s}|t`) * g.jitterMs)
    return { lane: l.name, id: bit.id, startAt, endAt: startAt + bit.ms, src: l.o.daily ? 'daily' : 'lane' }
  }
  private slotIndex(l: Lane, t: number, slotMs: number): number { return Math.floor((t + (l.o.daily ? (this.o.dayOffsetMs ?? 0) : 0)) / slotMs) }
  /** Raw candidates of lane `l` whose slot could touch [t0, t1] (a fight lane: in the working or the resting series). */
  private rawIn(l: Lane, t0: number, t1: number, working = true): Slot[] {
    const out: Slot[] = []
    const g = this.geo(l, working)
    if (!g || !l.bits.length) return out
    const pad = Math.max(...l.bits.map(b => b.ms), 0) + l.breathMs + g.slotMs
    for (let n = this.slotIndex(l, t0 - pad, g.slotMs); n <= this.slotIndex(l, t1 + pad, g.slotMs); n++) { const c = this.raw(l, n, working); if (c) out.push(c) }
    return out
  }
  /** Does a higher lane (index < i) or a held window claim the time of `c`? (Raw candidates: stable whatever the context.) */
  private beaten(c: Slot, i: number, ctx: Ctx): boolean {
    const l = this.lanes[i] as Lane
    for (const h of ctx.held ?? []) if (near(c, h, l.breathMs)) return true
    for (let j = 0; j < i; j++) {
      const hi = this.lanes[j] as Lane
      const gap = Math.max(l.breathMs, hi.breathMs)
      if (this.rawIn(hi, c.startAt - gap, c.endAt + gap, ctx.working === true || !hi.o.fight).some(h => near(c, h, gap))) return true
    }
    return false
  }
  private allowed(l: Lane, ctx: Ctx): boolean {
    if (l.o.fight) return fightGap(ctx.working === true) !== undefined && (!l.o.fightLevels || l.o.fightLevels.includes(LEVEL))
    const w = l.o.when ?? 'any'
    return w === 'any' || (w === 'working' ? ctx.working === true : ctx.working !== true)
  }

  /** Every act that starts in [t0, t1), conflicts resolved, in time order. Pure: same arguments, same list. */
  plan(t0: number, t1: number, ctx: Ctx = {}): Slot[] {
    if (ctx.quiet) return []
    const out: Slot[] = []
    // At the frequent levels a fight lane also keeps out of a job's first moments (its job-start act).
    const jobHeld = JOB_AT !== undefined && (LEVEL === 'often' || LEVEL === 'normal') ? { ...ctx, held: [...(ctx.held ?? []), { startAt: JOB_AT - 5_000, endAt: JOB_AT + JOB_BREATH_MS }] } : ctx
    this.lanes.forEach((l, i) => {
      if (!this.allowed(l, ctx)) return
      const c2 = l.o.fight ? jobHeld : ctx
      for (const c of this.rawIn(l, t0, t1, ctx.working === true || !l.o.fight)) if (c.startAt >= t0 && c.startAt < t1 && !this.beaten(c, i, c2)) out.push(c)
    })
    return out.sort((a, b) => a.startAt - b.startAt)
  }
  /**
   * What plays at `at`: the act under way, else (looking `ahead` ms forward, for a panel that redraws once a minute and
   * must draw the next act ahead of time) the next one to start. One thing at a time.
   */
  at(at: number, ctx: Ctx = {}, ahead = 0): Slot | undefined {
    const long = Math.max(0, ...this.lanes.flatMap(l => l.bits.map(b => b.ms)))
    return this.plan(at - long, at + ahead + 1, ctx).find(s => at < s.endAt && s.startAt <= at + ahead)
  }
  /** The next act starting after `t` (within `horizon` ms), optionally of one lane: for tests and "next fight in". */
  next(t: number, ctx: Ctx = {}, lane?: string, horizon = DAY): Slot | undefined {
    const step = 3_600_000
    for (let a = t; a < t + horizon; a += step) {
      const s = this.plan(a, Math.min(a + step, t + horizon), ctx).find(x => x.startAt > t && (!lane || x.lane === lane))
      if (s) return s
    }
    return undefined
  }
  /** `/missioncontrol play <name>`: the bit with that replay name (or id), starting at `at`. Store it as the skin's typed act. */
  play(name: string, at: number): Slot | undefined {
    const hit = this.bitOf(name)
    return hit ? { lane: hit.lane.name, id: hit.bit.id, startAt: at, endAt: at + hit.bit.ms, src: 'replay' } : undefined
  }
}
