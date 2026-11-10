// The Boys (fan homage), phase 3: everything that plays by itself. Four parts:
//   1. The EVENT EGGS (E1-E24 of the bible): `onBoysEvent` hooks that answer the engine events register.tsx raises (a failed run,
//      a cancel, a compaction, a plan, a new file, the context, the cost, idle...) with a toast, a BREAKING line and an act.
//   2. THE SCHEDULE, from the clock alone (so a redraw anywhere resumes it): the daily SET PIECES (seeded by the local day, as
//      Invincible's showdown), the 13 rare ROAMERS (one 6-minute slot, 65% of slots), and THE AMBUSH v2 (12 s, both panels, every
//      30-45 min while a job works (the director's `rare` cadence); three choreographies, never the same twice running). `stageAt` picks what is on now.
//   3. THE ACTS those draw (band AND pane), built with theboys-acts' Act: one CSS duration, one pinned delay. Kimiko never speaks:
//      she gets closed captions, `[signs: …]` (M4). PG-13: no hit lands; a scorch line, a smoke puff and flashbulbs are the impacts.
//   4. THIS MEANS NOIR's pieces (the curtain call, the Buster Beaver cheer) and the replays (`/missioncontrol play <name>`).
// No network, no files.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Act, KIT, bub, cap, defineActs, slate } from './theboys-acts'
import type { Geo, Row } from './theboys-acts'
import { BUST, C, CRAWL_Y, PROPS, SP, T, condW, pal, pin, px, r1, sansW, spH, spW, stamp, tape, unit } from './theboys'
import type { Mode } from './theboys'
import { actMs, autoLookAtMe, boysFx, fixedAt, onBoysEvent, registerReplay, setActMs, setApprovalMod, setStageBusy, testFails, toastOk, vnnBreak } from './theboys-eggs'
import type { BoysEventArgs, BoysMode } from './theboys-eggs'
import { cadence } from './stage/director'

const { feet, GROUND, gaugeOf, coverBust, dim, poof, knight, octo, tentacle, beaver, critter, dog, pig, flashbulb, cone, vial, crowd, runner, streak, heart } = KIT
const by = (m: BoysMode, brand: string, book: string, gold: string, noir = brand): string => (m === 'book' ? book : m === 'gold' ? gold : m === 'noir' ? noir : brand)

// ---------------------------------------------------------------- M4 Kimiko's sign subtitles
export const SIGN_INK = '#F4ECD0'
/** A closed-caption strip, cream on black, `[signs: …]`, centred on x with its baseline at y. Kimiko never gets a bubble. */
export const sign = (x: number, y: number, text: string, z = 10): string => {
  const t = `[signs: ${text}]`
  const w = sansW(t, z, 0, false) + 14
  return `<g data-egg="sign"><rect x="${r1(x - w / 2)}" y="${r1(y - z - 3)}" width="${r1(w)}" height="${z + 7}" fill="#050505" opacity=".9"/>${T(x, y, t, z, 500, SIGN_INK, 'text-anchor="middle"')}</g>`
}
/** Frenchie's bubble that translates her, when he is on screen. */
export const translate = (x: number, y: number, said: string, m: Mode): string => bub(x, y, `She says: ${said}`, m)

// ---------------------------------------------------------------- 2. the schedule
/** The LOCAL date's day number (a UTC day would flip mid-evening west of UTC and re-roll the day's times halfway through). */
export const localDay = (at: number): number => {
  const d = new Date(at)
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000)
}
const hourOf = (at: number, h: number): number => {
  const d = new Date(at)
  d.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0)
  return d.getTime()
}
export type Slot = { kind: string; startAt: number; endAt: number; src: 'fx' | 'ambush' | 'piece' | 'roamer'; book?: boolean }
/** The daily set pieces (bible §5.1): each once a day in its window (local hours); THE WALK twice in OFF BOOK; BRAVE MAEVE only in
 *  June; none within 10 s of another; the SOLID GOLD teaser never within 2 min of THE PREMIERE. */
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
export const PIECE_GAP_MS = 10_000
export const TEASER_GAP_MS = 120_000
const DAYS = new Map<number, Slot[]>()
/** The day's set pieces, the same for every moment of the same local day. */
export const dayPlan = (at: number): Slot[] => {
  const day = localDay(at)
  const hit = DAYS.get(day)
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
  if (DAYS.size > 8) DAYS.clear()
  DAYS.set(day, out)
  return out
}
const near = (a: { startAt: number; endAt: number }, b: { startAt: number; endAt: number }, gap: number): boolean => a.startAt < b.endAt + gap && b.startAt < a.endAt + gap
const pieceNear = (s: { startAt: number; endAt: number }): boolean => [s.startAt, s.endAt].some(t => dayPlan(t).some(q => near(s, q, PIECE_GAP_MS)))

// THE AMBUSH v2: rare, through the stage director's `rare` cadence (30-45 min): slots of 37.5 min, each AMBUSH at a seeded
// moment in its slot's first 7.5 min, so two in a row are 30-45 min apart while a job works (about 37 min on average). It was
// every 15-20 min, a 12 s takeover with the scrim over the working numbers: tens a day.
export const AMBUSH_MS = 12_000
export const AMB_SLOT_MS = cadence('rare').slotMs
export const AMB_JITTER_MS = cadence('rare').jitterMs
export const CHOREOS = ['a', 'b', 'c'] as const
/** The slot's AMBUSH: its start and its choreography (the three take turns, so the same one never plays twice running). */
export const ambushOfSlot = (slot: number): Slot => {
  const startAt = slot * AMB_SLOT_MS + Math.floor(unit(`tb-amb|${slot}`) * AMB_JITTER_MS)
  return { kind: `ambush-${CHOREOS[((slot % 3) + 3) % 3]}`, startAt, endAt: startAt + AMBUSH_MS, src: 'ambush' }
}
/** The AMBUSH due at `at` (a job must be working; never within 10 s of a set piece). */
export const ambushAt = (at: number): Slot | undefined => {
  const a = ambushOfSlot(Math.floor(at / AMB_SLOT_MS))
  return at >= a.startAt - 1000 && at < a.endAt && !pieceNear(a) ? a : undefined
}

// The rare roamers: one shared 6-min slot; 65% of slots get one, at a seeded moment in the slot's first 2 min; never inside a set
// piece or an AMBUSH window. Butcher's `Oi.` takeover only in every 8th slot (at most one per 48 min).
export const ROAM_SLOT_MS = 360_000
export const ROAM_JITTER_MS = 120_000
export const ROAM_CHANCE = 0.65
export const ROAMERS: [string, number][] = [
  ['r-hughie', 30], ['r-starlight', 8], ['r-kimiko', 8], ['r-frenchie', 7], ['r-noir', 7], ['r-atrain', 8], ['r-terror', 7],
  ['r-fish', 5], ['r-timothy', 4], ['r-ambrosius', 4], ['r-beaver', 3], ['r-blimp', 5], ['r-oi', 4],
]
const ROAM_SUM = ROAMERS.reduce((n, [, w]) => n + w, 0)
export const roamerOfSlot = (slot: number): Slot | undefined => {
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
  const amb = ambushOfSlot(Math.floor(startAt / AMB_SLOT_MS))
  if (pieceNear(s) || near(s, amb, PIECE_GAP_MS)) return undefined
  return s
}
/** Black Noir's cameo carries the `1979` VHS tag (the clue to THIS MEANS NOIR) one time in five. */
export const noirClue = (startAt: number): boolean => unit(`tb-noir79|${startAt}`) < 0.2
/** How far ahead an idle draw schedules a set piece or a roamer (the band redraws once a minute at rest). */
export const AHEAD_MS = 75_000
export type StageArgs = { working?: boolean; mode: Mode; swapAt?: number }
/** What plays at `at`, one thing at a time: a typed act or an event egg (`fx`), else THE AMBUSH (while a job works), else the day's
 *  set piece, else a roamer. A breath of 10 s after an `fx` keeps the schedule off; a mode swap holds everything. NOIR is quiet:
 *  no set pieces (the roamers and the AMBUSH stay, silently). */
export const stageAt = (at: number, o: StageArgs): Slot | undefined => {
  const fx = boysFx()
  if (fx && at >= fx.at - 1000 && at < fx.at + actMs(fx.kind)) return { kind: fx.kind, startAt: fx.at, endAt: fx.at + actMs(fx.kind), src: 'fx' }
  if (o.swapAt !== undefined && o.swapAt > 0 && at >= o.swapAt - 1000 && at < o.swapAt + 2_700) return undefined
  if (fx && at >= fx.at && at < fx.at + actMs(fx.kind) + 10_000) return undefined
  if (o.working) {
    const a = ambushAt(at)
    if (a) return a
  }
  if (o.mode !== 'noir') {
    const p = dayPlan(at).find(q => (!q.book || o.mode === 'book') && at < q.endAt && q.startAt <= at + AHEAD_MS)
    if (p) return p
  }
  const slot = Math.floor(at / ROAM_SLOT_MS)
  for (const s of [slot, slot + 1]) {
    const r = roamerOfSlot(s)
    if (r && at < r.endAt && r.startAt <= at + AHEAD_MS) return r
  }
  return undefined
}
/** A scheduled act drawn before its start stays hidden until then (its keyframes' first frame would otherwise show early). */
export const ahead = (svg: string, startAt: number): string => `<g style="animation:tqpre 1ms steps(1,end) both;animation-delay:calc(${pin(startAt)} + 0s)"><style>@keyframes tqpre{0%{opacity:0}100%{opacity:1}}</style>${svg}</g>`

// THE AMBUSH moves the APPROVAL (-8 while Homelander is on screen, +8 for a while after he flies off) and issues a press release.
let AMB_SEEN = 0
export const noteAmbush = (startAt: number): void => { AMB_SEEN = Math.max(AMB_SEEN, startAt) }
export const ambushSeen = (): number => AMB_SEEN
export const resetShow = (): void => { AMB_SEEN = 0; BUSY_AT = 0; TOOLS.clear(); LAST_WORKING = false }
setApprovalMod(at => {
  if (!AMB_SEEN) return 0
  const t = at - AMB_SEEN
  return t >= 1_500 && t < 9_000 ? -8 : t >= 9_000 && t < 60_000 ? 8 : 0
})

// The live state the overlays read: when the last work was seen (idle), and the tool calls in flight (PREMIERE FACE, M9).
let BUSY_AT = 0
let LAST_WORKING = false
// The look last drawn: OFF BOOK has its second WALK, NOIR has no set pieces, so what is on stage depends on it.
let LAST_MODE: Mode = 'brand'
const TOOLS = new Map<string, number>()
export const noteBusy = (at: number): void => { BUSY_AT = Math.max(BUSY_AT, at) }
export const idleFor = (at: number): number => (BUSY_AT > 0 ? Math.max(0, at - BUSY_AT) : 0)
export const toolStart = (id: string, at: number): void => { TOOLS.set(id, at); if (TOOLS.size > 64) TOOLS.delete(TOOLS.keys().next().value as string) }
export const toolEnd = (id: string): void => { TOOLS.delete(id) }
/** The longest tool call still running at `at` (ms), 0 with none. */
export const longestCall = (at: number): number => Math.max(0, ...[...TOOLS.values()].map(t => at - t))
export const PREMIERE_FACE_MS = 60_000
export const IDLE_NAP_MS = 600_000
export const noteWorking = (w: boolean | undefined, m?: Mode): void => { LAST_WORKING = Boolean(w); if (m) LAST_MODE = m }
export const lastWorking = (): boolean => LAST_WORKING

setStageBusy(at => {
  const s = stageAt(at, { working: LAST_WORKING, mode: LAST_MODE })
  return Boolean(s && (s.src === 'ambush' || s.src === 'piece') && at >= s.startAt - 1000 && at < s.endAt)
})

// ---------------------------------------------------------------- 3. the acts
const W2 = (g: Geo) => g.W / 2
const oneOf = <V>(list: V[], seed: string): V => list[Math.floor(unit(seed) * list.length) % list.length] as V
const beams = (x0: number, y0: number, x1: number, y1: number, c = '#FF2A2A') => `<path d="M${r1(x0)} ${r1(y0)}L${r1(x1)} ${r1(y1)}M${r1(x0 + 5)} ${r1(y0)}L${r1(x1 + 4)} ${r1(y1 + 2)}" stroke="${c}" stroke-width="2"/><path d="M${r1(x0)} ${r1(y0)}L${r1(x1)} ${r1(y1)}" stroke="#FF8A7A" stroke-width="5" opacity=".3"/>`
/** A scorch line that cools red, orange, grey, then fades (`t` its start, s). */
const scorchLine = (a: Act, x: number, y: number, w: number, t: number, end: number) => a.kf(`<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="2" rx="1"/>`, [[0, 'opacity:0;fill:#FF2A2A;transform:scaleX(0)'], [t, 'opacity:1;fill:#FF2A2A;transform:scaleX(0)'], [t + 0.35, 'opacity:1;fill:#FF2A2A;transform:none'], [t + 0.9, 'opacity:1;fill:#FF8A3A;transform:none'], [Math.max(t + 1.2, end - 0.5), 'opacity:.8;fill:#6B6B6B;transform:none'], [end, 'opacity:0;fill:#6B6B6B;transform:none']], { origin: `${r1(x)}px 0`, still: 'opacity="0"' })
const smoke = (a: Act, x: number, y: number, t: number, t1: number, s = 1) => a.kf(`<g transform="translate(${r1(x)} ${r1(y)}) scale(${s})">${[[0, 0, 22], [-24, 6, 15], [24, 5, 16], [-10, -16, 14], [12, -15, 13], [34, -6, 9], [-34, -4, 9]].map(([cx, cy, rr]) => `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="${(cx as number) % 2 ? '#9AA0A8' : '#B6BBC2'}"/>`).join('')}</g>`, [[0, 'opacity:0;transform:scale(.2)'], [t, 'opacity:0;transform:scale(.2)'], [t + 0.3, 'opacity:.95;transform:scale(1.1)'], [t + 0.6, 'opacity:.95;transform:none'], [t1 - 0.5, 'opacity:.8;transform:scale(1.15)'], [t1, 'opacity:0;transform:scale(1.3)']], { c: true, still: 'opacity="0"' })
const dust = (x: number, y: number) => `<g transform="translate(${r1(x)} ${r1(y)})">${[[0, 0, 5], [-6, 2, 3.4], [6, 2, 3.6], [-2, -4, 3]].map(([cx, cy, rr]) => `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="#C9C2B0" opacity=".7"/>`).join('')}</g>`
const flash = (a: Act, g: Geo, t: number, c = '#FFF4C2', op = 0.85) => a.on(`<rect width="${g.W}" height="${g.H}" rx="10" fill="${c}" opacity="${op}"/>`, t, t + 0.14, { still: false })
const slip = (x: number, y: number, line: string, seal: string) => `<g transform="translate(${r1(x)} ${r1(y)}) rotate(-3)"><rect width="250" height="40" fill="${PROPS.paper}" stroke="#C9C2B0"/>${C(8, 13, 'FOR IMMEDIATE RELEASE', 7.5, PROPS.paperInk, 'letter-spacing="1"')}${T(8, 30, line, 11, 700, PROPS.paperInk)}${stamp(214, 22, seal, PROPS.stamp, 9, -10)}</g>`
const slipIn = (a: Act, g: Geo, line: string, seal: string, t: number) => a.mv(slip(0, 0, line, seal), [[0, g.W + 10, 14], [t, g.W + 10, 14], [t + 0.4, g.W - 266, 14], [a.ms / 1000, g.W - 266, 14]], { still: 2, ease: 'cubic-bezier(.2,.9,.3,1)' })
const fish = (x: number, y: number, c = '#7FD3E8', flip = false) => `<g transform="translate(${r1(x)} ${r1(y)})${flip ? ' scale(-1 1)' : ''}"><path d="M0 3C2 0 6 0 8 3C6 6 2 6 0 3zM8 3l3 -3v6z" fill="${c}"/><rect x="2" y="2" width="1" height="1" fill="${PROPS.ink}"/></g>`
const zzz = (x: number, y: number, c: string) => `<g class="tqw">${T(x, y, 'z', 9, 700, c)}${T(x + 6, y - 7, 'z', 11, 700, c)}${T(x + 13, y - 16, 'Z', 13, 700, c)}</g>`
const blimp = (x: number, y: number, text: string) => `<g transform="translate(${r1(x)} ${r1(y)})"><ellipse cx="60" cy="14" rx="60" ry="14" fill="#C9CED6" stroke="#8E9AB8"/><path d="M114 8l14 -8v28l-14 -8z" fill="#9AA6BC"/><rect x="48" y="27" width="24" height="7" rx="2" fill="#5A6680"/><rect x="12" y="7" width="96" height="14" rx="3" fill="#0A1430"/>${C(60, 18, text, 8.5, '#F0D27A', 'text-anchor="middle" letter-spacing=".8"')}</g>`
const shredder = (x: number, y: number) => `<g transform="translate(${r1(x)} ${r1(y)})"><rect width="64" height="22" rx="2" fill="#3A3F45" stroke="#1B1D21"/><rect x="4" y="-2" width="56" height="4" fill="#1B1D21"/><circle cx="56" cy="11" r="2.4" fill="#8FCB8A"/>${C(8, 15, 'SHRED', 8, '#ECE6DA', 'letter-spacing="1"')}</g>`
const ring = (a: Act, x: number, y: number, r: number, c: string, t: number, t1: number) => a.kf(`<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="none" stroke="${c}" stroke-width="3"/>`, [[0, 'opacity:0;transform:scale(.02)'], [t, 'opacity:1;transform:scale(.02)'], [t1, 'opacity:0;transform:none']], { origin: `${r1(x)}px ${r1(y)}px`, still: 'opacity="0"' })
const shakeOf = (hits: number[], len: number): [number, string][] => {
  const fr: [number, string][] = [[0, 'transform:none']]
  for (const t of hits) fr.push([t, 'transform:none'], [t + 0.04, 'transform:translate(3px,-2px)'], [t + 0.1, 'transform:translate(-3px,2px)'], [t + 0.16, 'transform:translate(2px,1px)'], [t + 0.24, 'transform:none'])
  fr.push([len, 'transform:none'])
  return fr
}
const gaugeY = 64

// --- the event acts (E1-E24)
const EVENT_ROWS: Record<string, Row & { scrim?: boolean; ms: number }> = {
  // E1 a test run fails: the bust's eyes sweep two red beams across the band; the scorch line cools and fades.
  scorch: {
    ms: 1_800,
    band: (a, g) => {
      const x1 = g.W - 60
      let s = ''
      for (const [i, t] of [0.15, 0.45, 0.75].entries()) s += a.on(beams(44, 50, 140 + ((x1 - 140) * (i + 1)) / 3, 93), t, t + 0.2, { still: false })
      return s + scorchLine(a, 140, 92, x1 - 140, 0.2, 1.8) + a.on(cap(W2(g), 30, by(g.m, 'FAIL FOOTAGE: DENIED', 'IT FAILED. OBVIOUSLY.', 'TRACKING ERROR', '…'), g.m, { mid: true }), 0.3, 1.7)
    },
    pane: ['task', (a, g) => scorchLine(a, 24, g.H * 0.55, g.W - 48, 0.1, 1.8) + a.slam(stamp(g.W - 96, 40, by(g.m, 'NOT FAIL. SETBACK.', 'FAILED.', 'RETAKE', '…'), PROPS.stamp, 11, -7), 0.3, 1.7)],
  },
  // E2 tests fail twice: the bust shakes its head; a sour stamp. (OFF BOOK plays T1's Butcher instead.)
  disgusted: {
    ms: 3_000,
    band: (a, g, P) => {
      const sp = BUST[g.m]
      const s = 0.86
      const head = `<g transform="translate(${r1(37 - (spW(sp) * s) / 2)} 39)">${px(sp, 0, 0, s)}<rect x="${r1(14 * s)}" y="${r1(30 * s)}" width="${r1(12 * s)}" height="1.4" fill="#5A2A22" transform="rotate(8 ${r1(20 * s)} ${r1(30 * s)})"/></g>`
      return a.on(coverBust(P), 0, 3) + a.kf(head, [[0, 'transform:none'], [0.3, 'transform:translateX(-2px)'], [0.5, 'transform:translateX(2px)'], [0.7, 'transform:translateX(-2px)'], [0.9, 'transform:none'], [3, 'transform:none']]) + a.on(bub(62, 56, by(g.m, 'Diabolical.', 'Diabolical.', 'Not my finest hour.', '…'), g.m), 0.3, 2.8)
    },
    pane: ['task', (a, g) => a.slam(`<g transform="translate(${r1(g.W - 100)} 42)">${tape(0, -4, 140, 26, -4, 0.9)}${stamp(0, 0, by(g.m, 'NOT ON BRAND.', 'DIABOLICAL.', 'NOT MY FINEST HOUR', '…'), PROPS.marker, 13, -6)}</g>`, 0.2, 2.8)],
  },
  // E3 the failing test passes: Kimiko's regen. The cracked syringe knits back; she signs it.
  regen: {
    ms: 2_600,
    band: (a, g) => {
      const q = gaugeOf(g.W)
      const cracks = `<path d="M${r1(q.x + q.w * 0.25)} ${gaugeY - 2}l5 6 -4 5M${r1(q.x + q.w * 0.55)} ${gaugeY - 2}l-4 5 5 6M${r1(q.x + q.w * 0.8)} ${gaugeY - 1}l4 4 -3 5" fill="none" stroke="#FFFFFF" stroke-width="1.2"/>`
      const glow = `<rect x="${r1(q.x + 12)}" y="${gaugeY - 2}" width="${r1(Math.max(20, q.w - 22))}" height="11" rx="3" fill="${PROPS.vblue}" opacity=".45"/>`
      return a.kf(cracks, [[0, 'opacity:1'], [0.8, 'opacity:1'], [1.5, 'opacity:0'], [2.6, 'opacity:0']], { still: 'opacity="0"' }) + a.on(glow, 1.2, 1.9, { fade: 0.3 }) + a.mv(feet(SP.TB_KIMIKO_STANCE, 0.5), [[0, q.x + q.w * 0.5, 64, 0], [0.3, q.x + q.w * 0.5, 64, 1], [2.3, q.x + q.w * 0.5, 64, 1], [2.6, q.x + q.w * 0.5, 64, 0]], { still: 1 }) + a.on(sign(q.x + q.w * 0.5, 30, 'good as new'), 0.6, 2.4)
    },
    pane: ['task', (a, g) => a.mv(feet(SP.TB_KIMIKO_STANCE, 1), [[0, 60, g.H - 10, 0], [0.3, 60, g.H - 10, 1], [2.3, 60, g.H - 10, 1], [2.6, 60, g.H - 10, 0]], { still: 1 }) + a.on(sign(W2(g), g.H - 18, 'good as new'), 0.4, 2.4) + a.slam(stamp(g.W - 90, 40, 'REGENERATED', '#2F8F5A', 11, -6), 0.5, 2.4)],
  },
  // E4 a job is cancelled: LASER-EYE SWEEP DELETE (M6). Two beams sweep the CRISIS DESK; it burns away in six rows and comes back grey.
  sweep: {
    ms: 2_400,
    band: (a, g) => a.on(beams(44, 50, g.W - 40, 70), 0.1, 0.9, { still: false }) + a.on(cap(W2(g), 30, 'CANCELLED. VOUGHT CALLS IT A SUNSET.', g.m, { mid: true }), 0.3, 2.2),
    pane: ['task', (a, g, P) => {
      let rows = ''
      for (let i = 0; i < 6; i++) rows += a.kf(`<rect x="0" y="${r1((g.H / 6) * i)}" width="${g.W}" height="${r1(g.H / 6 + 0.6)}" fill="${P.tile}"/>`, [[0, 'transform:scaleX(0)'], [0.2 + i * 0.08, 'transform:scaleX(0)'], [0.55 + i * 0.08, 'transform:none'], [1.3, 'transform:none;opacity:1'], [1.6, 'opacity:0'], [2.4, 'opacity:0']], { origin: '0 0', still: 'opacity="0"' })
      const grey = `<rect width="${g.W}" height="${g.H}" fill="#6B6F78" opacity=".35"/><rect x="1" y="1" width="${g.W - 2}" height="${g.H - 2}" fill="none" stroke="#8A4A1E" stroke-width="2.4" stroke-dasharray="7 3 2 3"/>`
      return a.on(beams(10, 10, g.W - 10, g.H * 0.6) + beams(g.W - 10, 10, 10, g.H * 0.7), 0.1, 0.6, { still: false }) + rows + a.on(grey, 1.5, 2.4, { fade: 0.2 }) + a.slam(stamp(W2(g), g.H / 2, 'SUNSET', PROPS.stamp, 16, -6), 1.6, 2.35)
    }],
  },
  // E4 in OFF BOOK (and NOIR): Noir's SILENT SLASH. Everything mutes, one thin white cut, the band parts and closes.
  slash: {
    ms: 1_800,
    band: (a, g, P) => a.on(dim(g.W, g.H, P, 0.6), 0, 1.6, { fade: 0.15 }) + a.kf(`<path d="M${r1(g.W * 0.2)} ${g.H - 10}L${r1(g.W * 0.8)} 10" stroke="#FFFFFF" stroke-width="1.6"/>`, [[0, 'opacity:0;stroke-dasharray:0 2000'], [0.5, 'opacity:1;stroke-dasharray:0 2000'], [0.75, 'opacity:1;stroke-dasharray:2000 0'], [1.4, 'opacity:1'], [1.7, 'opacity:0']], { still: 'opacity="0"' }) + a.on(`<g>${feet(SP.TB_NOIR_SLASH, 0.8)}</g>`.replace('<g>', `<g transform="translate(${r1(g.W * 0.2 - 10)} ${GROUND})">`), 0.4, 1.5) + a.on(T(W2(g), 30, '…', 18, 700, P.text, 'text-anchor="middle"'), 0.9, 1.6),
    pane: ['task', (a, g) => a.kf(`<path d="M20 ${g.H - 20}L${g.W - 20} 20" stroke="#FFFFFF" stroke-width="2"/>`, [[0, 'opacity:0'], [0.5, 'opacity:1'], [1.4, 'opacity:1'], [1.7, 'opacity:0']], { still: 'opacity="0"' })],
    shake: { band: [[0, 'transform:none'], [0.75, 'transform:none'], [0.8, 'transform:translateX(3px)'], [1.0, 'transform:translateX(-2px)'], [1.2, 'transform:none'], [1.8, 'transform:none']] },
  },
  // E4 in SOLID GOLD: the chest glows and blinks twice.
  chestglow: {
    ms: 1_600,
    band: a => a.kf(`<circle cx="37" cy="74" r="7" fill="#FFB347"/>`, [[0, 'opacity:0'], [0.2, 'opacity:.9'], [0.5, 'opacity:0'], [0.8, 'opacity:.9'], [1.1, 'opacity:0'], [1.6, 'opacity:0']], { still: 'opacity="0"' }),
    pane: ['task', (a, g) => ring(a, W2(g), g.H / 2, Math.min(g.W, g.H) / 2.2, '#FFB347', 0.2, 1.4)],
  },
  // E5 the context is compacted: Starlight's BLACKOUT (the band drains dark and relights clean; the milk glass refills, `ting`).
  blackout: {
    ms: 1_800,
    scrim: false,
    band: (a, g) => a.mv(feet(SP.TB_STARLIGHT_RAISE, 0.8), [[0, 120, GROUND, 0], [0.2, 120, GROUND, 1], [1.5, 120, GROUND, 1], [1.8, 120, GROUND, 0]], { still: 1 }) + a.on(`<rect width="${g.W}" height="${g.H}" rx="10" fill="#020203" opacity=".9"/>`, 0.4, 1.0, { fade: 0.15 }) + flash(a, g, 1.0, '#FFFFFF', 0.6) + a.on(T(g.W - 40, 108, 'ting', 9, 700, '#F7F7F2', 'font-style="italic"'), 1.1, 1.7),
    pane: ['all', (a, g) => a.on(`<rect width="${g.W}" height="${g.H}" fill="#020203" opacity=".85"/>`, 0.4, 1.0, { fade: 0.15 }) + flash(a, g, 1.0, '#FFFFFF', 0.4)],
  },
  // E5 in OFF BOOK: the SHREDDER (M13). The press slips feed in; strips fall; the card is clean.
  shredder: {
    ms: 2_600,
    band: (a, g) => a.on(shredder(g.W - 96, GROUND - 26), 0.1, 2.5) + a.on(cap(W2(g), 30, 'SHREDDED. CLEAN SLATE.', g.m, { mid: true }), 0.3, 2.4),
    pane: ['task', (a, g) => {
      const x = g.W - 90
      let s = a.on(shredder(x, g.H - 30), 0, 2.6)
      for (let i = 0; i < 3; i++) s += a.mv(`<rect width="44" height="30" fill="${PROPS.paper}" stroke="#C9C2B0"/><rect x="5" y="6" width="30" height="2" fill="#9A958A"/><rect x="5" y="12" width="24" height="2" fill="#9A958A"/>`, [[0, x + 10, -40], [0.2 + i * 0.4, x + 10, -40], [0.7 + i * 0.4, x + 10, g.H - 52], [1.0 + i * 0.4, x + 10, g.H - 30, 0], [2.6, x + 10, g.H - 30, 0]], { still: 2 })
      for (let i = 0; i < 6; i++) s += a.mv(`<rect width="2" height="12" fill="${PROPS.paper}"/>`, [[0, x + 8 + i * 9, g.H - 8, 0], [0.9 + i * 0.12, x + 8 + i * 9, g.H - 8, 1], [2.4, x + 8 + i * 9, g.H + 10, 0], [2.6, x + 8 + i * 9, g.H + 10, 0]], { still: 1 })
      return s
    }],
  },
  // E5 in SOLID GOLD: the CHEST BLAST ring clears the band.
  chestblast: {
    ms: 1_600,
    band: (a, g) => ring(a, 37, 74, g.W, '#FFB347', 0.15, 1.4) + flash(a, g, 0.2, '#FFE3B0', 0.5),
    pane: ['all', (a, g) => ring(a, W2(g), g.H / 2, g.W, '#FFB347', 0.15, 1.4)],
  },
  // E6 permission denied: a red beam stopped dead by a gold LEGAL SAYS NO (OFF BOOK: a strip of tape, NOT TODAY).
  legalno: {
    ms: 2_200,
    band: (a, g) => {
      const x = g.W * 0.6
      const block = g.m === 'book' ? `${tape(x, 64, 120, 26, -6, 0.95)}${C(x, 69, 'NOT TODAY', 13, PROPS.marker, 'text-anchor="middle" letter-spacing="1.4"')}` : stamp(x, 64, 'LEGAL SAYS NO', '#C9A13B', 14, -6)
      return a.on(`<path d="M${r1(g.W - 20)} 66L${r1(x + 70)} 66" stroke="#FF2A2A" stroke-width="3"/><circle cx="${r1(x + 70)}" cy="66" r="5" fill="#FFFFFF" opacity=".8"/>`, 0.3, 1.2, { still: false }) + a.slam(block, 0.25, 2.1)
    },
    pane: ['task', (a, g) => a.slam(stamp(W2(g), g.H / 2, by(g.m, 'LEGAL SAYS NO', 'NOT TODAY', 'LEGAL SAYS NO', '…'), g.m === 'book' ? PROPS.marker : '#C9A13B', 16, -6), 0.25, 2.1)],
  },
  // E7 a force push: the tape rewinds (three tracking bars climb), HISTORY REWRITTEN.
  rewind: {
    ms: 2_400,
    band: (a, g) => {
      let s = ''
      for (let i = 0; i < 3; i++) s += a.mv(`<rect width="${g.W}" height="${3 + i}" fill="#FFFFFF" opacity="${0.16 + i * 0.06}"/>`, [[0, 0, g.H + 10], [0.1 + i * 0.25, 0, g.H + 10], [1.1 + i * 0.25, 0, -10], [2.4, 0, -10]], { still: 0 })
      return s + a.on(cap(W2(g), 30, by(g.m, '◀◀ HISTORY REWRITTEN', '◀◀ SHOCK AND AWE.', '◀◀ PAYBACK TIME.', '◀◀'), g.m, { mid: true, z: 12 }), 0.2, 2.3)
    },
    pane: ['log', (a, g) => a.on(cap(W2(g), 40, '◀◀ A FRESH START', g.m, { mid: true }), 0.2, 2.3)],
  },
  // E17 a subagent spawns: AMERICAN HERO, NEW RECRUIT (M11). A spotlight finds the crew; THE TABLE's seat gets a sash.
  recruit: {
    ms: 2_400,
    band: (a, g) => a.on(cone(150, 0, 112, 70), 0.1, 2.2, { fade: 0.3 }) + a.on(cap(190, 30, by(g.m, 'AMERICAN HERO · NEW RECRUIT', 'NEW FILE ON THE DIRT', 'A BRASS STAR FOR THE NEW GUY', '…'), g.m), 0.2, 2.3),
    pane: ['table', (a, g) => a.on(cone(g.W - 60, 0, g.H, 90), 0.1, 2.2, { fade: 0.3 }) + a.kf(`<g transform="translate(${r1(g.W - 60)} 40)"><rect x="-22" y="-6" width="44" height="12" rx="2" fill="#B22234"/>${C(0, 3.4, 'RECRUIT', 7.5, '#FFFFFF', 'text-anchor="middle" letter-spacing=".8"')}</g>`, [[0, 'transform:rotate(0)'], [0.2, 'transform:rotate(0)'], [0.9, 'transform:rotate(360deg)'], [2.4, 'transform:rotate(360deg)']], { c: true })],
  },
  // E22 a network error: the fish school scatters. "They only call me when there's trouble at a dock."
  fish: {
    ms: 2_400,
    scrim: true,
    band: (a, g) => {
      let s = ''
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI * 2 * i) / 6
        s += a.mv(fish(0, 0, i % 2 ? '#7FD3E8' : '#F0D27A', Math.cos(ang) < 0), [[0, W2(g), 90, 1], [0.2, W2(g), 90, 1], [1.8, W2(g) + Math.cos(ang) * 260, 90 + Math.sin(ang) * 50, 0], [2.4, W2(g), 90, 0]], { still: 0 })
      }
      return s + a.on(cap(W2(g), 30, by(g.m, 'TROUBLE AT A DOCK', 'LINE’S DEAD, MATE', 'BAD RECEPTION', '…'), g.m, { mid: true }), 0.2, 2.2)
    },
    pane: ['log', (a, g) => {
      let s = ''
      for (let i = 0; i < 6; i++) s += a.mv(fish(0, 0), [[0, W2(g), g.H / 2, 1], [1.8, W2(g) + (i - 2.5) * 70, g.H / 2 + (i % 2 ? -50 : 50), 0], [2.4, W2(g), g.H / 2, 0]], { still: 0 })
      return s
    }],
  },
  // The SOLID GOLD teaser (the clue): a VHS tracking glitch, then a gold marquee, TONIGHT ON SOLID GOLD…
  teaser: {
    ms: 3_200,
    scrim: true,
    band: (a, g) => {
      let s = ''
      for (let i = 0; i < 3; i++) s += a.mv(`<rect width="${g.W}" height="${3 + i}" fill="#FFFFFF" opacity="${0.2 + i * 0.06}"/><rect y="${4 + i}" width="${g.W}" height="1" fill="#E04FA0" opacity=".45"/>`, [[0, 0, -10], [0.1 + i * 0.25, 0, -10], [1.1 + i * 0.25, 0, g.H + 10], [3.2, 0, g.H + 10]], { still: 0 })
      const w = condW('TONIGHT ON SOLID GOLD…', 16, 2) + 40
      const bulbs = Array.from({ length: Math.floor(w / 12) }, (_, i) => `<circle cx="${r1(W2(g) - w / 2 + 6 + i * 12)}" cy="${g.H / 2 - 20}" r="2.2" fill="#FFE9A8"/><circle cx="${r1(W2(g) - w / 2 + 6 + i * 12)}" cy="${g.H / 2 + 14}" r="2.2" fill="#FFE9A8"/>`).join('')
      return s + a.on(`<rect x="${r1(W2(g) - w / 2)}" y="${g.H / 2 - 26}" width="${r1(w)}" height="46" rx="4" fill="#4B5236" stroke="#D4A637" stroke-width="2"/>${bulbs}${C(W2(g), g.H / 2 + 3, 'TONIGHT ON SOLID GOLD…', 16, '#E2C25A', 'text-anchor="middle" letter-spacing="2"')}`, 1.0, 3.1, { fade: 0.2 })
    },
    pane: ['cred', (a, g) => a.on(cap(W2(g), g.H - 16, 'TONIGHT ON SOLID GOLD…', 'gold', { mid: true }), 1.0, 3.1)],
  },
  // THIS MEANS NOIR's way back: the curtain falls, the theatre kid bows.
  curtain: {
    ms: 2_400,
    band: (a, g) => a.kf(`<rect width="${g.W}" height="${g.H}" rx="10" fill="#7E2A33"/>${Array.from({ length: Math.ceil(g.W / 24) }, (_, i) => `<rect x="${i * 24 + 10}" width="3" height="${g.H}" fill="#5E1E26"/>`).join('')}`, [[0, 'transform:translateY(-100%)'], [0.5, 'transform:none'], [1.9, 'transform:none'], [2.4, 'transform:translateY(-100%)']], { still: 'opacity="0"' }) + a.kf(`<g transform="translate(${r1(W2(g))} ${GROUND})">${feet(SP.TB_NOIR_THUMBSUP, 0.8)}</g>`, [[0, 'opacity:0'], [0.6, 'opacity:1;transform:none'], [1.0, 'transform:rotate(18deg)'], [1.4, 'transform:none'], [1.9, 'opacity:1'], [2.0, 'opacity:0']], { origin: `${r1(W2(g))}px ${GROUND}px`, still: 'opacity="0"' }),
    pane: ['task', (a, g) => a.on(cap(W2(g), g.H / 2, 'CURTAIN CALL', 'noir', { mid: true, z: 14 }), 0.4, 2.2)],
  },
}

// --- the 13 roamers (bible §5.2)
const ROAM_ROWS: Record<string, Row & { scrim?: boolean; ms: number }> = {
  'r-hughie': {
    ms: 5_000,
    band: (a, g) => a.mv(`<g class="tqb">${feet(SP.TB_HUGHIE_WALK, 0.8, true)}</g>`, [[0, g.W + 20, GROUND], [1.4, g.W - 120, GROUND], [3.6, g.W - 120, GROUND], [5, g.W + 20, GROUND]], { still: 1 }) + a.on(bub(g.W - 120, GROUND - 40, '…sorry, wrong room.', g.m, true), 1.5, 3.6),
    pane: ['log', (a, g) => a.mv(px(SP.TB_HUGHIE_BUST, 0, 0, 0.9, { rows: [0, 24] }), [[0, g.W - 70, -24], [0.8, g.W - 70, -24], [1.3, g.W - 70, 2], [3.6, g.W - 70, 2], [4.2, g.W - 70, -24], [5, g.W - 70, -24]], { still: 2 }) + a.on(bub(g.W - 76, 34, '…sorry, wrong room.', g.m, true), 1.4, 3.6)],
  },
  'r-starlight': {
    ms: 4_000,
    band: () => '',
    pane: ['cred', (a, g) => a.mv(feet(SP.TB_STARLIGHT_FLY, 0.9), [[0, g.W * 0.7, -30], [1.0, g.W * 0.7, 30, 1]], { still: 1 }) + a.on(`<g transform="translate(${r1(g.W * 0.7)} 32)">${feet(SP.TB_STARLIGHT, 0.9)}</g>`, 1.0, 3.8) + a.on(cone(g.W * 0.7, -10, 40, 80, '#FFF4C2', 0.3), 1.0, 3.6, { fade: 0.3 })],
  },
  'r-kimiko': {
    ms: 4_000,
    scrim: true,
    band: (a, g) => a.mv(feet(SP.TB_KIMIKO_LEAP, 0.8), [[0, -30, GROUND], [0.6, g.W * 0.2, GROUND - 26], [1.1, g.W * 0.32, GROUND], [1.7, g.W * 0.48, GROUND - 26], [2.2, g.W * 0.6, GROUND], [3.4, g.W * 0.6, GROUND], [4, g.W + 30, GROUND]], { still: 4 }) + a.on(sign(g.W * 0.6, 30, 'hi'), 2.2, 3.6),
    pane: ['cred', () => ''],
  },
  'r-frenchie': {
    ms: 4_000,
    band: () => '',
    pane: ['task', (a, g) => a.mv(feet(SP.TB_FRENCHIE_VIAL, 1), [[0, g.W - 60, g.H + 70], [0.6, g.W - 60, g.H - 4], [3.2, g.W - 60, g.H - 4], [4, g.W - 60, g.H + 70]], { still: 2 }) + a.on(bub(g.W - 66, g.H - 56, oneOf(['Voilà.', 'Petit Hughie…', 'Mon cœur.'], `fr|${a.at}`), g.m, true), 0.8, 3.2)],
  },
  'r-noir': {
    ms: 3_500,
    band: () => '',
    pane: ['cred', (a, g) => {
      const tag = noirClue(a.at) ? `<g transform="translate(${r1(g.W - 70)} ${g.H - 30})"><rect width="28" height="16" rx="1.5" fill="#1C1C22" stroke="#D9A441"/>${C(14, 11.5, '1979', 8.5, '#D9A441', 'text-anchor="middle" letter-spacing=".8"')}</g>` : ''
      return a.on(`<g transform="translate(${r1(g.W - 30)} ${g.H - 6})">${feet(SP.TB_NOIR_THUMBSUP, 0.9)}</g>${tag}`, 0.2, 3.3, { fade: 0.25 })
    }],
  },
  'r-atrain': {
    ms: 1_600,
    band: (a, g) => a.mv(`<g>${streak(70, '#3DDC84')}${runner(a, 0.8)}</g>`, [[0, -40, GROUND, 1], [1.3, g.W + 100, GROUND, 1], [1.31, g.W + 100, GROUND, 0], [1.6, g.W + 100, GROUND, 0]], { still: 1 }),
    pane: ['log', () => ''],
  },
  'r-terror': {
    ms: 5_000,
    scrim: true,
    band: (a, g) => a.mv(dog(-15, -20, 'walk'), [[0, -40, GROUND], [1.4, g.W * 0.4, GROUND], [3.6, g.W * 0.4, GROUND, 0], [3.61, g.W * 0.4, GROUND, 1], [5, g.W + 40, GROUND]], { still: 1 }) + a.on(`<g transform="translate(${r1(g.W * 0.4)} ${GROUND})">${dog(-15, -20, 'sit')}${pig(14, -10)}</g>`, 1.4, 3.6) + a.on(T(g.W * 0.4 + 26, GROUND - 22, 'squeak', 9, 700, '#F2A6B8', 'font-style="italic"'), 2.2, 2.9),
    pane: ['task', () => ''],
  },
  'r-fish': {
    ms: 5_000,
    band: () => '',
    pane: ['log', (a, g) => {
      let s = ''
      for (let i = 0; i < 6; i++) s += a.mv(fish(0, 0), [[0, -30 - i * 14, 30 + (i % 3) * 12], [5, g.W + 30 - i * 14, 26 + (i % 3) * 12]], { still: 0 })
      return s + a.on(bub(g.W * 0.55, 30, '…', g.m), 2.0, 3.4)
    }],
  },
  'r-timothy': {
    ms: 6_000,
    band: () => '',
    pane: ['task', (a, g) => a.mv(`<g class="tqb">${octo(0, 0, 1.4)}</g>`, [[0, -30, g.H - 30], [6, g.W + 10, g.H - 40]], { still: 0 })],
  },
  'r-ambrosius': {
    ms: 3_500,
    band: () => '',
    pane: ['task', (a, g) => a.kf(`<g transform="translate(${r1(g.W - 34)} ${r1(g.H - 50)})">${tentacle(0, 0, 1.2)}</g>`, [[0, 'transform:translateY(40px)'], [0.6, 'transform:none'], [1.2, 'transform:rotate(-8deg)'], [1.8, 'transform:rotate(6deg)'], [2.8, 'transform:none'], [3.5, 'transform:translateY(40px)']], { origin: `${r1(g.W - 26)}px ${r1(g.H)}px` }) + a.mv(heart(0, 0, 1), [[0, g.W - 40, g.H - 54, 0], [1.4, g.W - 40, g.H - 54, 1], [2.8, g.W - 44, g.H - 80, 0], [3.5, g.W - 44, g.H - 80, 0]], { still: 1 })],
  },
  'r-beaver': {
    ms: 4_000,
    scrim: true,
    band: (a, g) => a.mv(`<g class="tqw">${beaver(-10, -24)}</g>`, [[0, -30, GROUND], [3.4, g.W * 0.8, GROUND], [4, g.W + 30, GROUND]], { still: 1 }) + a.on(T(g.W * 0.5, GROUND - 30, '*waves*', 9, 700, '#C79A6A', 'font-style="italic"'), 1.6, 2.6),
    pane: ['log', () => ''],
  },
  'r-blimp': {
    ms: 8_000,
    band: () => '',
    pane: ['cred', (a, g) => a.mv(blimp(0, 0, new Date(a.at).getHours() < 5 ? 'VNN OVERNIGHT' : 'VOUGHT ON ICE · TONIGHT'), [[0, -140, 10], [8, g.W + 10, 6]], { still: 0 })],
  },
  'r-oi': {
    ms: 4_000,
    band: (a, g) => a.mv(feet(SP.TB_BUTCHER_BUST, 0.7), [[0, g.W - 60, g.H + 40], [0.4, g.W - 60, g.H - 2], [3.4, g.W - 60, g.H - 2], [4, g.W - 60, g.H + 40]], { still: 2 }) + a.on(bub(g.W - 84, g.H - 30, 'Oi.', g.m, true), 0.5, 3.3),
    pane: ['task', (a, g) => a.mv(feet(SP.TB_BUTCHER_BUST, 0.8), [[0, g.W - 40, g.H + 40], [0.4, g.W - 40, g.H], [3.4, g.W - 40, g.H], [4, g.W - 40, g.H + 40]], { still: 2 }) + a.on(bub(g.W - 66, g.H - 34, 'Oi.', g.m, true), 0.5, 3.3)],
  },
}

// --- THE AMBUSH v2: three choreographies, 12 s, band + CRISIS DESK (its shake only there).
const CAPTIONS: Record<BoysMode, string[]> = {
  brand: ['TO BE CONTINUED…', 'THERAPY WAS AN OPTION.', 'ROUTINE TRAINING EXERCISE.'],
  book: ['PROPER PREPARATION, MATE.', 'TO BE CONTINUED…', 'THERAPY WAS AN OPTION.'],
  gold: ['TO BE CONTINUED…', 'TUNE IN NEXT WEEK.', 'THAT IS A WRAP, FOLKS.'],
  noir: ['…', '… …', '(bows)'],
}
export const ambushCaption = (at: number, m: BoysMode): string => oneOf(CAPTIONS[m], `amb-cap|${at}`)
/** Homelander lands at (x, GROUND) at `t`, hovers until `up`, then flies off up and to the right. */
const homelander = (a: Act, x: number, t: number, up: number) =>
  a.mv(feet(SP.TB_HOMELANDER_HOVER, 0.8), [[0, x, -50], [t - 0.45, x, -50], [t, x, GROUND], [up, x, GROUND], [up + 0.01, x, GROUND, 0], [12, x, GROUND, 0]], { still: 3 }) +
  a.mv(feet(SP.TB_HOMELANDER_FLY, 0.8), [[0, x, GROUND - 10, 0], [up, x, GROUND - 10, 0], [up + 0.01, x, GROUND - 10, 1], [up + 0.9, x + 200, -60, 1], [12, x + 200, -60, 1]], { still: 0 })
const butcher = (a: Act, x: number, out: number) =>
  a.mv(`<g class="tqb">${feet(SP.TB_BUTCHER_WALK, 0.8)}</g>`, [[0, -40, GROUND], [1.2, x, GROUND], [out, x, GROUND], [out + 0.7, -50, GROUND], [12, -50, GROUND]], { still: 1 }) + a.on(dust(-30 + 40, GROUND - 2), out, out + 0.5, { still: false })
const starlight = (a: Act, g: Geo, x: number, t: number) => a.on(`<g transform="translate(${r1(x)} ${GROUND})">${feet(SP.TB_STARLIGHT_BLAST, 0.8)}</g>`, t - 0.3, t + 2.6) + flash(a, g, t, '#FFF4C2', 0.85)
const kimiko = (a: Act, g: Geo, t: number, x: number) => a.mv(feet(SP.TB_KIMIKO_LEAP, 0.8), [[0, -30, GROUND, 0], [t - 0.2, g.W * 0.12, GROUND, 1], [t + 0.3, x - 40, GROUND - 32, 1], [t + 0.7, x - 20, GROUND, 1], [t + 1.6, x - 20, GROUND, 1], [t + 2.2, -40, GROUND, 1], [12, -40, GROUND, 0]], { still: 3 }) + a.on(sign(x - 20, 30, 'now'), t, t + 1.4)
const capEnd = (a: Act, g: Geo, t: number) => a.on(cap(W2(g), 30, ambushCaption(a.at, g.m), g.m, { mid: true, z: 12 }), t, 11.9)
const deskPane = (a: Act, g: Geo, seal: string, line: string, hughieOut: number, vialT: number) =>
  a.mv(`<g>${feet(SP.TB_HUGHIE_REMOTE, 1)}</g>`, [[0, 50, g.H - 6, 0], [0.3, 50, g.H - 6, 1], [hughieOut, 50, g.H - 6, 1], [hughieOut + 0.6, -40, g.H - 6, 1], [12, -40, g.H - 6, 0]], { still: 1 }) +
  a.mv(feet(SP.TB_FRENCHIE_VIAL, 1), [[0, g.W - 60, g.H + 70], [vialT - 1.0, g.W - 60, g.H + 70], [vialT - 0.6, g.W - 60, g.H - 4], [vialT + 1.2, g.W - 60, g.H - 4], [vialT + 1.8, g.W - 60, g.H + 70], [12, g.W - 60, g.H + 70]], { still: 2 }) +
  a.mv(vial(0, 0, 1.2), [[0, g.W - 70, g.H - 60, 0], [vialT, g.W - 70, g.H - 60, 1], [vialT + 0.4, W2(g) + 40, 10, 1], [vialT + 0.8, W2(g), -20, 0], [12, W2(g), -20, 0]], { still: 1 }) +
  smoke(a, W2(g), g.H * 0.5, vialT + 0.7, vialT + 2.4, 1.4) + slipIn(a, g, line, seal, 9.8)
const AMBUSH_ROWS: Record<string, Row & { scrim?: boolean; ms: number }> = {
  // A · THE LANDING (the plan's nine beats).
  'ambush-a': {
    ms: AMBUSH_MS,
    scrim: true,
    band: (a, g) => {
      const hx = g.W * 0.56
      const q = gaugeOf(g.W)
      let s = butcher(a, 150, 7.6) + homelander(a, hx, 1.9, 8.7) + a.on(flashbulb(hx, GROUND - 30, 8), 1.9, 2.1, { still: false })
      for (const [i, t] of [3.0, 3.25, 3.5].entries()) s += a.on(beams(hx - 2, GROUND - 38, q.x + 20 + ((q.w - 40) * (i + 1)) / 3, gaugeY + 4), t, t + 0.2, { still: false })
      s += scorchLine(a, q.x + 12, gaugeY + 3, Math.max(20, q.w - 22), 3.05, 7.0) + starlight(a, g, g.W * 0.3, 4.6) + kimiko(a, g, 6.0, hx) + smoke(a, hx, GROUND - 22, 7.4, 9.4) + capEnd(a, g, 10.0)
      if (g.m === 'book') s += a.on(bub(160, GROUND - 46, 'Oi.', g.m), 0.9, 1.8) + a.on(bub(160, GROUND - 46, 'Diabolical.', g.m), 3.2, 4.2) + a.on(bub(160, GROUND - 46, 'Leg it!', g.m), 7.6, 8.4)
      return s
    },
    pane: ['task', (a, g) => scorchLine(a, 24, g.H * 0.4, g.W - 48, 3.1, 7.0) + flash(a, g, 4.6, '#FFF4C2', 0.5) + a.on(sign(W2(g), 24, 'now'), 6.0, 7.4) + a.on(translate(W2(g) + 70, 64, 'now.', g.m), 6.3, 7.4) + deskPane(a, g, 'CONTAINED', 'Routine training exercise.', 7.6, 6.6)],
    shake: { task: shakeOf([1.9, 4.6, 7.4], 12) },
  },
  // B · THE DROP: Noir drops first and slices the smoke, then the landing.
  'ambush-b': {
    ms: AMBUSH_MS,
    scrim: true,
    band: (a, g, P) => {
      const hx = g.W * 0.5
      let s = smoke(a, hx, GROUND - 22, 0, 1.6) + a.mv(feet(SP.TB_NOIR_SLASH, 0.8), [[0, hx - 30, -60], [0.6, hx - 30, -60], [1.0, hx - 30, GROUND], [2.4, hx - 30, GROUND], [3.0, g.W + 40, GROUND], [12, g.W + 40, GROUND]], { still: 2 })
      s += a.kf(`<path d="M${r1(hx - 70)} ${GROUND - 4}L${r1(hx + 70)} ${GROUND - 60}" stroke="#FFFFFF" stroke-width="1.6"/>`, [[0, 'opacity:0'], [1.0, 'opacity:0'], [1.05, 'opacity:1'], [1.5, 'opacity:0'], [12, 'opacity:0']], { still: 'opacity="0"' })
      s += a.on(T(hx + 4, GROUND - 56, '…', 16, 700, P.text), 1.3, 2.4) + homelander(a, hx + 40, 3.4, 9.0) + a.on(flashbulb(hx + 40, GROUND - 30, 8), 3.4, 3.6, { still: false }) + starlight(a, g, g.W * 0.25, 5.0) + kimiko(a, g, 6.5, hx + 40) + smoke(a, hx + 40, GROUND - 22, 8.0, 9.6) + capEnd(a, g, 10.2)
      if (g.m === 'book') s += a.on(bub(140, GROUND - 46, 'Oi.', g.m), 3.6, 4.4) + a.on(bub(140, GROUND - 46, 'Diabolical.', g.m), 5.2, 6.2) + a.on(bub(140, GROUND - 46, 'Leg it!', g.m), 8.0, 8.8)
      return s + butcher(a, 130, 8.0)
    },
    pane: ['task', (a, g) => a.kf(`<path d="M20 ${g.H - 20}L${g.W - 20} 20" stroke="#FFFFFF" stroke-width="2"/>`, [[0, 'opacity:0'], [1.0, 'opacity:0'], [1.05, 'opacity:1'], [1.6, 'opacity:0'], [12, 'opacity:0']], { still: 'opacity="0"' }) + flash(a, g, 5.0, '#FFF4C2', 0.5) + a.on(sign(W2(g), 24, 'now'), 6.5, 7.9) + deskPane(a, g, 'CONTAINED', 'A silent rehearsal.', 8.0, 7.0)],
    shake: { task: shakeOf([1.0, 3.4, 8.0], 12) },
  },
  // C · THE SNATCH: A-Train steals the real progress bar (the slot goes empty with a dust cloud), Hughie gives chase, the bar comes
  // back two seconds later with a `my bad`.
  'ambush-c': {
    ms: AMBUSH_MS,
    scrim: true,
    band: (a, g, P) => {
      const hx = g.W * 0.58
      const q = gaugeOf(g.W)
      const bx = q.x + 12
      const bw = Math.max(20, q.w - 22)
      const hole = `<rect x="${r1(q.x - 2)}" y="${gaugeY - 5}" width="${r1(q.w + 14)}" height="17" fill="${P.tile}"/><rect x="${r1(bx)}" y="${gaugeY - 1}" width="${r1(bw)}" height="9" rx="2" fill="none" stroke="${P.muted}" stroke-dasharray="3 2"/>`
      const mini = `<rect x="-26" y="-30" width="22" height="6" rx="2" fill="${PROPS.vblue}" stroke="#FFFFFF" stroke-width=".6"/><rect x="-4" y="-28.5" width="5" height="3" fill="#DDE8F2"/>`
      let s = butcher(a, 140, 8.6) + homelander(a, hx, 1.6, 9.0)
      s += a.on(hole, 3.2, 6.6) + a.on(dust(bx + 10, gaugeY + 2) + dust(bx + bw * 0.5, gaugeY + 3), 3.2, 4.0, { still: false })
      s += a.mv(`<g>${streak(70, '#3DDC84')}${runner(a, 0.8)}${mini}</g>`, [[0, -40, 86, 0], [3.0, -40, 86, 1], [3.6, g.W + 60, 86, 1], [3.61, g.W + 60, 86, 0], [12, g.W + 60, 86, 0]], { still: 2 })
      s += a.mv(`<g class="tqb">${feet(SP.TB_HUGHIE_WALK, 0.8)}</g>`, [[0, -40, GROUND], [3.7, -40, GROUND], [5.6, g.W + 40, GROUND], [12, g.W + 40, GROUND]], { still: 1 })
      s += a.mv(`<g transform="scale(-1 1)">${streak(70, '#3DDC84')}</g><g>${feet(SP.TB_ATRAIN_RUN1, 0.8, true)}</g>`, [[0, g.W + 60, 86, 0], [5.8, g.W + 60, 86, 1], [6.5, -60, 86, 1], [6.51, -60, 86, 0], [12, -60, 86, 0]], { still: 0 })
      s += a.on(bub(bx + bw * 0.4, gaugeY - 4, 'my bad', g.m), 6.5, 7.8) + starlight(a, g, g.W * 0.32, 7.8) + capEnd(a, g, 10.0)
      if (g.m === 'book') s += a.on(bub(150, GROUND - 46, 'Oi.', g.m), 0.9, 1.8) + a.on(bub(150, GROUND - 46, 'Diabolical.', g.m), 4.0, 5.0) + a.on(bub(150, GROUND - 46, 'Leg it!', g.m), 8.6, 9.4)
      return s
    },
    pane: ['task', (a, g) => a.mv(`<g class="tqb">${feet(SP.TB_HUGHIE_WALK, 1)}</g>`, [[0, -40, g.H - 6], [3.7, -40, g.H - 6], [5.4, g.W + 40, g.H - 6], [12, g.W + 40, g.H - 6]], { still: 1 }) + a.on(dust(40, g.H - 10), 3.7, 4.3, { still: false }) + flash(a, g, 7.8, '#FFF4C2', 0.5) + slipIn(a, g, 'A routine delivery.', 'RETURNED', 9.6)],
    shake: { task: shakeOf([1.6, 3.2, 7.8], 12) },
  },
}

// The ON BRAND crowd for THE PREMIERE is drawn by its typed act; here only the NOIR cheer (Buster Beaver and his pals, "yay").
export const noirCheer = (W: number, H: number, delay?: string): string => {
  const d = delay ?? '0s'
  const hop = (x: number, body: string, i: number) => `<g style="animation:tbnh 2.6s linear both;animation-delay:calc(${d} - ${i * 0.15}s)"><g transform="translate(${r1(x)} ${H - 40})"><g class="tqw">${body}</g></g></g>`
  return `<g class="tb-cheer" pointer-events="none" data-egg="noir-cheer"><style>@keyframes tbnh{0%{transform:translateX(-${W}px)}100%{transform:translateX(${W}px)}}.tqw{animation:tqw 1.2s ease-in-out infinite}@keyframes tqw{0%,60%,100%{transform:none}30%{transform:translateY(-5px)}}@media (prefers-reduced-motion: reduce){[style*="tbnh"],.tqw{animation:none!important}}</style><rect width="${W}" height="${H}" rx="10" fill="#0B0C0E" opacity=".82"/>${hop(W * 0.42, beaver(0, -4), 0)}${hop(W * 0.42 - 34, critter(0, 6, '#E07A9A'), 1)}${hop(W * 0.42 + 30, critter(0, 6, '#7FB8E0'), 2)}${T(W / 2, 40, 'yay', 16, 700, '#D9A441', 'text-anchor="middle" font-style="italic"')}</g>`
}

const ALL_ROWS = { ...EVENT_ROWS, ...ROAM_ROWS, ...AMBUSH_ROWS }
for (const [k, r] of Object.entries(ALL_ROWS)) setActMs(k, r.ms)
defineActs(ALL_ROWS)
/** Every act this file adds (the tests walk them). */
export const SHOW_KINDS = Object.keys(ALL_ROWS)
export const EVENT_KINDS = Object.keys(EVENT_ROWS)
export const ROAM_KINDS = Object.keys(ROAM_ROWS)
export const AMBUSH_KINDS = Object.keys(AMBUSH_ROWS)

// ---------------------------------------------------------------- 1. the event eggs (E1-E24)
// What each answers with, per mode (NOIR's toasts are quieted to `…` by the register). Gaps per the bible.
const ONCE = new Set<string>()
export const resetEvents = (): void => { ONCE.clear() }
const once = (k: string): boolean => (ONCE.has(k) ? false : (ONCE.add(k), true))
const t = (m: BoysMode, brand: string, book: string, gold: string): string => by(m, brand, book, gold, '…')
/** The event, what fires it, and the act it plays (the tests and the README list read this). */
export const EVENT_EGGS: { id: string; ev: string; when: string; act?: string }[] = [
  { id: 'E1', ev: 'test-fail', when: 'a test run fails', act: 'scorch' },
  { id: 'E2', ev: 'test-fail', when: 'tests fail twice in a row', act: 'disgusted' },
  { id: 'E3', ev: 'test-pass', when: 'the failing test passes', act: 'regen' },
  { id: 'E4', ev: 'cancel', when: 'a job is cancelled (Esc)', act: 'sweep' },
  { id: 'E5', ev: 'compact', when: 'the context is compacted or cleared', act: 'blackout' },
  { id: 'E6', ev: 'permission', when: 'a tool is refused permission', act: 'legalno' },
  { id: 'E7', ev: 'force-push', when: '`git push --force`', act: 'rewind' },
  { id: 'E8', ev: 'plan', when: 'a plan is approved (ExitPlanMode)', act: 'knight' },
  { id: 'E9', ev: 'resume', when: 'the first prompt of the day', act: 'wakey' },
  { id: 'E10', ev: 'ctx85', when: 'context passes 85%' },
  { id: 'E11', ev: 'ctx95', when: 'context passes 95% (once a session)', act: 'lookatme' },
  { id: 'E12', ev: 'long-job', when: 'a job of 3+ minutes ends (and a tool call over 60 s shows the PREMIERE FACE)' },
  { id: 'E13', ev: 'turbo', when: '4+ tools at once', act: 'turbo' },
  { id: 'E14', ev: 'midnight', when: 'after midnight (midnight to 5 AM local)' },
  { id: 'E15', ev: 'idle10', when: '10 min idle (20 min: a line once a session)', act: 'terror' },
  { id: 'E16', ev: 'cost1', when: 'the session passes $1, $5, $20' },
  { id: 'E17', ev: 'agent-spawn', when: 'a subagent spawns (the first to finish gets a line)', act: 'recruit' },
  { id: 'E18', ev: 'errors3', when: '3 tool errors in a row', act: 'mirror' },
  { id: 'E19', ev: 'new-file', when: 'a Write creates a new file', act: 'blink' },
  { id: 'E20', ev: 'test-pass', when: 'a test run with 0 failures' },
  { id: 'E21', ev: 'lint-fixed', when: 'lint/typecheck passes after failing' },
  { id: 'E22', ev: 'net-error', when: 'WebFetch / WebSearch fails', act: 'fish' },
  { id: 'E23', ev: 'cap', when: 'the daily cap is hit' },
  { id: 'E24', ev: 'test-start', when: 'a test command starts (the 7SPN scoreboard)' },
]
const fxOf = (m: BoysMode, brand: string, book: string, gold: string, noir = book): string => (m === 'book' ? book : m === 'gold' ? gold : m === 'noir' ? noir : brand)
onBoysEvent('test-fail', a => ({ fx: testFails() >= 2 ? fxOf(a.mode, 'disgusted', 'diabolical', 'disgusted', 'slash') : 'scorch' }))
onBoysEvent('test-pass', a => (fixedAt() === a.at ? { fx: 'regen' } : undefined))
onBoysEvent('cancel', a => ({ fx: fxOf(a.mode, 'sweep', 'slash', 'chestglow', 'slash'), breaking: t(a.mode, 'Vought sunsets a project; "it was never announced"', 'THE WIRE: job pulled. Nobody saw a thing.', 'Tonight’s taping: cancelled') }))
onBoysEvent('compact', a => ({ fx: fxOf(a.mode, 'blackout', 'shredder', 'chestblast', 'blackout'), breaking: t(a.mode, 'Context cleared; Vought calls it "a fresh narrative"', 'THE WIRE: files shredded. Clean slate.', 'Tape wiped. Fresh reel.') }))
onBoysEvent('permission', a => (toastOk('ev:perm', a.at, 60_000) ? { fx: 'legalno' } : undefined))
onBoysEvent('force-push', () => ({ fx: 'rewind' }))
onBoysEvent('plan', a => ({ fx: 'knight', ...(toastOk('ev:plan', a.at, 60_000) ? { toast: t(a.mode, 'Smartest person.', 'Proper planning, mate.', 'Rolling tape.') } : {}) }))
onBoysEvent('resume', a => ({ fx: 'wakey', toast: t(a.mode, 'Wakey-wakey.', 'Daddy’s home.', 'Thawed out and ready to roll.') }))
onBoysEvent('ctx85', a => ({ breaking: t(a.mode, 'Context passes 85%; Vought urges everyone to stay on brand', 'THE WIRE: the dirt’s running out', 'Thawing… 85% of the reel used') }))
onBoysEvent('ctx95', a => {
  autoLookAtMe(95, a.at)
  return { breaking: t(a.mode, 'Context at 95%. LOOK AT ME.', 'THE WIRE: clear the decks, mate', 'Chest glow at 95%') }
})
onBoysEvent('long-job', a => ({ breaking: t(a.mode, 'Statement issued: a long job wraps; Vought takes the credit', 'THE WIRE: off the record, it is done', 'A gold record for the big one') }))
onBoysEvent('midnight', a => ({ breaking: t(a.mode, 'VNN OVERNIGHT: midnight to 5 AM, the night desk is on', 'THE WIRE: past midnight. Kettle’s on.', 'Late show: midnight to 5 AM') }))
onBoysEvent('idle10', () => ({ fx: 'terror' }))
onBoysEvent('idle20', a => (once('idle20') ? { fx: a.mode === 'brand' ? 'memes' : undefined, toast: t(a.mode, 'Have you seen the memes about me?', 'Oi. Kettle’s on.', 'Still frozen?') } : undefined))
onBoysEvent('cost1', a => (once('cost1') ? { toast: t(a.mode, 'Really marketable.', 'That’s a few quid.', 'That’s a lot of residuals.') } : undefined))
onBoysEvent('cost5', a => (once('cost5') ? { toast: t(a.mode, '“What we are, really, is a pharmaceutical company.” — Edgar', 'Who’s paying for this?', 'That’s a lot of residuals.') } : undefined))
onBoysEvent('cost20', a => (once('cost20') ? { toast: t(a.mode, 'Legal has been notified.', 'Mallory wants receipts.', 'That’s a lot of residuals.') } : undefined))
onBoysEvent('agent-spawn', () => ({ fx: 'recruit' }))
onBoysEvent('agent-done', a => (once('agent-done') ? { toast: t(a.mode, 'You guys are the real heroes!', 'Good lad.', 'A brass star for you.') } : undefined))
onBoysEvent('errors3', a => (toastOk('ev:mirror', a.at, 300_000) ? { fx: 'mirror', approval: -5 } : undefined))
onBoysEvent('new-file', a => (toastOk('ev:blink', a.at, 120_000) ? { fx: 'blink' } : undefined))
onBoysEvent('lint-fixed', a => (toastOk('ev:lint', a.at, 600_000) ? { toast: t(a.mode, 'Legal cleared it.', 'Cleaned up nice.', 'Retake approved.') } : undefined))
onBoysEvent('net-error', a => (toastOk('ev:net', a.at, 600_000) ? { fx: 'fish', toast: t(a.mode, '“They only call me when there’s trouble at a dock.” — The Deep', 'Line’s dead, mate.', 'Bad reception tonight.') } : undefined))
onBoysEvent('cap', a => (toastOk('ev:cap', a.at, 20 * 3_600_000) ? { toast: t(a.mode, 'The board has questions.', 'Skint.', 'Show’s over for tonight.'), breaking: t(a.mode, 'Vought announces "efficiency season"', 'THE WIRE: the money’s gone', 'Show’s over for tonight') } : undefined))

/** The cost thresholds (E16), crossed going up. */
export const COST_STEPS: [number, 'cost1' | 'cost5' | 'cost20'][] = [[1, 'cost1'], [5, 'cost5'], [20, 'cost20']]
/** Did the context just drop like a compaction (or a /clear)? From 30%+ down by 25 points or more. */
export const isCompaction = (was: number, now: number): boolean => was >= 30 && now <= was - 25

// ---------------------------------------------------------------- the overlays the band draws from state
/** M9 PREMIERE FACE: one tool call over 60 s turns the bust toward the FOCUS GROUP with the long stare (until the call ends). */
export const premiereFace = (m: Mode, P: any): string => {
  if (m !== 'brand') return ''
  const sp = BUST.brand
  const s = 0.86
  return `<g data-egg="premiere-face" pointer-events="none">${coverBust(P)}<g transform="translate(${r1(37 - (spW(sp) * s) / 2)} 39) rotate(-9 18 34)">${px(sp, 0, 0, s)}<rect x="${r1(18 * s)}" y="${r1(19 * s)}" width="${r1(3 * s)}" height="${r1(s)}" fill="#0A0B0D"/><rect x="${r1(25 * s)}" y="${r1(19 * s)}" width="${r1(3 * s)}" height="${r1(s)}" fill="#0A0B0D"/></g>${C(38, 34, 'NOW SHOWING', 6, '#F0D27A', 'text-anchor="middle" letter-spacing=".6"')}</g>`
}
/** E15 Terror asleep on the band's foot while you are away (10+ min idle). */
export const terrorNap = (W: number, m: Mode): string => `<g data-egg="terror-nap" pointer-events="none"><g transform="translate(${r1(W - 120)} ${CRAWL_Y - 21})">${dog(0, 0, 'sit', 1.4)}</g>${zzz(W - 88, CRAWL_Y - 18, m === 'book' ? '#ECE6DA' : '#BCC6DE')}<style>.tqw{animation:tqw 1.6s ease-in-out infinite}@keyframes tqw{0%,60%,100%{transform:none}30%{transform:translateY(-3px)}}@media (prefers-reduced-motion: reduce){.tqw{animation:none!important}}</style></g>`
/** E14 the moon in the milk glass after midnight (midnight to 5 AM, local). */
export const moon = (W: number): string => `<g data-egg="moon" pointer-events="none"><circle cx="${W - 28}" cy="117" r="2.6" fill="#FFF6D0"/><circle cx="${W - 27}" cy="116.2" r="2.2" fill="#13214A"/></g>`
export const isNight = (at: number): boolean => new Date(at).getHours() < 5

// ---------------------------------------------------------------- 4. the replays (`/missioncontrol play <name>`)
const PLAY: [string, string, string][] = [
  ['ambush-a', 'ambush-a', 'THE AMBUSH · A · THE LANDING'], ['ambush-b', 'ambush-b', 'THE AMBUSH · B · THE DROP'], ['ambush-c', 'ambush-c', 'THE AMBUSH · C · THE SNATCH (A-Train steals the bar)'],
  ['scorch', 'scorch', 'E1 laser scorch'], ['disgusted', 'disgusted', 'E2 the bust shakes its head'], ['regen', 'regen', 'E3 Kimiko’s regen'], ['sweep', 'sweep', 'E4 LASER-EYE SWEEP DELETE'],
  ['slash', 'slash', 'E4 Noir’s silent slash'], ['chestglow', 'chestglow', 'E4 the chest glow'], ['blackout', 'blackout', 'E5 Starlight’s BLACKOUT'], ['shredder', 'shredder', 'E5 the OFF BOOK shredder'],
  ['chestblast', 'chestblast', 'E5 the chest blast'], ['legalno', 'legalno', 'E6 LEGAL SAYS NO'], ['rewind', 'rewind', 'E7 history rewritten'], ['recruit', 'recruit', 'E17 AMERICAN HERO · NEW RECRUIT'],
  ['fish', 'fish', 'E22 the fish scatter'], ['teaser', 'teaser', 'the SOLID GOLD teaser'], ['curtain', 'curtain', 'THIS MEANS NOIR’s curtain call'],
  ['hughie', 'r-hughie', 'roamer: Hughie'], ['starlight', 'r-starlight', 'roamer: Starlight'], ['kimiko', 'r-kimiko', 'roamer: Kimiko, [signs: hi]'], ['frenchie', 'r-frenchie', 'roamer: Frenchie'],
  ['noir', 'r-noir', 'roamer: Black Noir'], ['atrain', 'r-atrain', 'roamer: A-Train'], ['waddle', 'r-terror', 'roamer: Terror'], ['school', 'r-fish', 'roamer: the fish school'],
  ['swimby', 'r-timothy', 'roamer: Timothy swims by'], ['tentacle', 'r-ambrosius', 'roamer: Ambrosius'], ['bounce', 'r-beaver', 'roamer: Buster Beaver'], ['blimp', 'r-blimp', 'roamer: the VNN blimp'], ['oi', 'r-oi', 'roamer: Butcher, Oi.'],
]
for (const [name, fx, what] of PLAY) registerReplay({ name, what, run: () => ({ fx }) })
registerReplay({ name: 'ambush', what: 'THE AMBUSH (the next of the three)', run: at => ({ fx: ambushOfSlot(Math.floor(at / AMB_SLOT_MS) + 1).kind }) })
registerReplay({ name: 'night', what: 'E14 VNN OVERNIGHT on the crawl', run: (at, m) => { vnnBreak(t(m, 'VNN OVERNIGHT: midnight to 5 AM, the night desk is on', 'THE WIRE: past midnight. Kettle’s on.', 'Late show: midnight to 5 AM'), at, 'midnight'); return {} } })
/** The set pieces by their replay names (the plan's): ice, whale, teaser, premiere, expo, redscare, walk, bravemaeve are acts. */
export const PIECE_KINDS = [...new Set(PIECES.map(p => p.kind))]
export type { BoysEventArgs }
/** THIS MEANS NOIR's way back (the theatre kid's bow); typed while wearing it. */
export const CURTAIN_RE = /\bcurtain\s+call\b/i
/** NOIR is a real quiet mode: every toast of the skin's own is `…` and a thumbs-up. */
export const quiet = (text: string, noir: boolean): string => (noir ? '… 👍' : text)
