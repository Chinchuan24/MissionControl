// Breaking Bad and its hidden Heisenberg skin, wave 3 motion, built on hooks/stage. Desert light, a blue crystal, a black hat.
// PG-13: menace by implication only; chemistry is a blue crystal prop and nothing else; no weapon is ever drawn or fired.
//
//   SAY MY NAME    the owner's must-have. Typing "say my name" (or "what's my name") on Breaking Bad: the stare under the brim
//                  flashes on, the black hat drops onto him turning as it falls (the hat turntable on a path) and settles, his
//                  head turns to face you (the hat man's head turn), a hit-stop, then YOU'RE GODDAMN RIGHT. slams on with a
//                  camera shake, and the band wipes over to Heisenberg (the green veil pulled off, a crystal-blue bar). 4.9 s,
//                  band and pane. Every time the phrase is typed on Breaking Bad. `/missioncontrol play say-my-name`.
//   STAND-OFF      "The Desert Stand-off": the hat man and the dealer in the desert, the RV parked behind (parallax). Words only:
//                  stare, "Say my name.", a flinch, "Heisenberg.", a step, "You're goddamn right.", the dealer backs down.
//                  The director's fight lane (one per 30-45 min, working only). `/missioncontrol play desert-standoff`.
//   PIZZA          once a local day (17-22 h): Walt throws a pizza, it tumbles (6 views) onto the roof and stays there.
//   cheers         Breaking Bad: Y (yttrium) and Sc (scandium) flip in as element tiles: YEAH, SCIENCE! Heisenberg: three
//                  knocks, then I AM THE ONE WHO KNOCKS. with the hat turning beside it.
//   idle           Walt (and Heisenberg) breathe, blink and glance (pixel patches over the bust); a blue crystal turns by
//                  PURITY while a job works; Heisenberg's hat logo turns once an hour; the episode flips to HEISENBERG now
//                  and then (never the title).
//
// Band acts play in the band's clear span through its keep-out clip (stage/keep.ts): never over a number, label or chip; the
// title card picks the widest span free of the Tasks chip. Pane acts fill the CLASSROOM card's board. Every act is pinned
// (`Act`) and has a still frame.
import * as SP from './breakingbad-sprites'
import { sansW } from './breakingbad-cards'
import { BB_HEIS_BUST, BB_WALT_BUST, spriteDiff } from './cast'
import type { Sprite } from './cast'
import { esc } from './stage/budget'
import { Camera } from './stage/camera'
import { Fight, fightLane } from './stage/choreo'
import { Director, localOffsetMs } from './stage/director'
import type { Slot } from './stage/director'
import { FrameBank } from './stage/frames'
import * as fx from './stage/fx'
import { keepClip } from './stage/keep'
import type { BandStage, Rect } from './stage/keep'
import { registerPlay } from './stage/replay'
import { Act, r1, r3 } from './stage/timeline'
import { spin, turntable, turnViews } from './stage/turntable'
import * as wipe from './stage/wipe'
import type { SwitchFlavour } from './stage/wipe'

export const SANS = "-apple-system,'Helvetica Neue',Arial,sans-serif"
const C = {
  ink: '#050605', night: '#0A0A0B', white: '#F4F4F4', sub: '#BDBDC2', mute: '#8A8A90', blue: '#5EC8F0', ice: '#BFEBFF',
  green: '#4FB37A', greenInk: '#0B1F12', bbGround: '#0F2418', dusk: '#140F09', sand: '#3A2C18', mesa: '#7A4A2A', sun: '#E8B04A', yellow: '#F2C318',
}

/** How long each act runs (ms). */
export const BB_MS = { name: 4_900, standoff: 10_000, pizza: 4_600, cheer: 3_400, heischeer: 3_600 } as const
export type BbKind = keyof typeof BB_MS
/** A panel that redraws seldom draws an act this far ahead (its start is pinned, so it begins on time). */
export const AHEAD_MS = 60_000

// ---------------------------------------------------------------- sprites
/** Empty rows on top so a figure's poses share one height (the feet stay on the floor when the pose swaps). */
const padTo = (sp: Sprite, h: number): Sprite => {
  const w = Math.max(...sp.rows.map(r => r.length))
  return { ...sp, rows: [...Array.from({ length: Math.max(0, h - sp.rows.length) }, () => '.'.repeat(w)), ...sp.rows.map(r => r.padEnd(w, '.'))] }
}
/** The sprite at half size: each 2 x 2 block becomes its commonest colour (when at least two of its pixels are filled). A prop
 *  shown at half scale costs a third as much and draws crisp, one sprite pixel to one band pixel. */
export const half = (sp: Sprite): Sprite => {
  const H = sp.rows.length
  const W = Math.max(...sp.rows.map(r => r.length))
  const rows: string[] = []
  for (let y = 0; y < H; y += 2) {
    let row = ''
    for (let x = 0; x < W; x += 2) {
      const n = new Map<string, number>()
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as [number, number][]) { const ch = sp.rows[y + dy]?.[x + dx]; if (ch && ch !== '.' && sp.pal[ch]) n.set(ch, (n.get(ch) ?? 0) + 1) }
      const filled = [...n.values()].reduce((a, b) => a + b, 0)
      row += filled >= 2 ? ([...n].sort((a, b) => b[1] - a[1])[0] as [string, number])[0] : '.'
    }
    rows.push(row)
  }
  return { ...sp, rows }
}
/** Rows from..to of a sprite (a strip cropped to what reads). */
const crop = (sp: Sprite, from: number, to: number): Sprite => ({ ...sp, rows: sp.rows.slice(from, to) })
/** The hat's greys lifted to a light ramp (the logo and the switch read on Heisenberg's near-black), its band kept dark. */
const lightHat = (sp: Sprite): Sprite => {
  const lum = (h: string): number => { const n = parseInt(h.slice(1), 16); return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11 }
  const keys = Object.keys(sp.pal).sort((a, b) => lum(sp.pal[a] as string) - lum(sp.pal[b] as string))
  const ramp = ['#45454C', '#6E6E77', '#9696A0', '#BDBDC4', '#D8D8DE', '#E8E8EC', '#F4F4F4']
  return { ...sp, pal: Object.fromEntries(keys.map((k, i) => [k, ramp[Math.min(ramp.length - 1, i)] as string])) }
}
/** The four hat views of a half turn (a pork-pie hat looks the same from behind): a full turn every two passes. */
const HATS: Sprite[] = [SP.HEIS_HAT_0, SP.HEIS_HAT_1, SP.HEIS_HAT_2, SP.HEIS_HAT_3]
const HAT_VIEWS = ['hv0', 'hv1', 'hv2', 'hv3']
const castHats = (act: Act, K = 4, tint?: (sp: Sprite) => Sprite, n = 4): Act => { HATS.slice(0, n).forEach((sp, i) => act.cast(`hv${i}`, tint ? tint(sp) : sp, 0.5, K)); return act }
const CRYSTALS: Sprite[] = [SP.BBAD_CRYSTAL_0, SP.BBAD_CRYSTAL_1, SP.BBAD_CRYSTAL_2, SP.BBAD_CRYSTAL_3, SP.BBAD_CRYSTAL_4, SP.BBAD_CRYSTAL_5, SP.BBAD_CRYSTAL_6, SP.BBAD_CRYSTAL_7]
const PIZZAS: Sprite[] = [SP.BBAD_PIZZA_SPIN_0, SP.BBAD_PIZZA_SPIN_1, SP.BBAD_PIZZA_SPIN_2, SP.BBAD_PIZZA_SPIN_3, SP.BBAD_PIZZA_SPIN_4, SP.BBAD_PIZZA_SPIN_5]
// The stand-off's two figures, padded to one height; the foot pivots from the art set's manifest.
const HAT_MAN: [string, Sprite, number][] = [['hS', SP.BBAD_SO_HAT_STANCE, 8 / 17], ['hT', SP.BBAD_SO_HAT_TILT, 8 / 20], ['hP', SP.BBAD_SO_HAT_STEP, 8 / 22], ['hF', SP.BBAD_SO_HAT_FOLD, 8 / 16]]
const DEALER: [string, Sprite, number][] = [['dC', SP.BBAD_SO_DEALER_COCKY, 16 / 28], ['dU', padTo(SP.BBAD_SO_DEALER_UNSURE, 47), 10 / 19], ['dB', padTo(SP.BBAD_SO_DEALER_BACK, 47), 9 / 19]]
// The desert's mesas and horizon (the sand under them is a plain rect: the strip's scrub costs more than it shows).
const MESAS = crop(SP.BBAD_DESERT, 0, 17)

// ---------------------------------------------------------------- the director and the replays
/** Breaking Bad's rare acts: the pizza once a local day (17-22 h), the stand-off at most once per 30-45 min while working. */
export const bbDirector = (dayOffsetMs = 0): Director =>
  fightLane(new Director('breakingbad', { dayOffsetMs }).lane('piece', { daily: [17, 22] }).add('piece', { id: 'pizza', ms: BB_MS.pizza, replay: 'pizza-on-the-roof' }), [{ id: 'standoff', ms: BB_MS.standoff, replay: 'desert-standoff' }])
/** Heisenberg's: the stand-off only (the hat man is him). */
export const heisDirector = (dayOffsetMs = 0): Director => fightLane(new Director('heisenberg', { dayOffsetMs }), [{ id: 'standoff', ms: BB_MS.standoff, replay: 'desert-standoff' }])
let B_DIR = bbDirector(localOffsetMs(Date.now()))
let H_DIR = heisDirector(localOffsetMs(Date.now()))
let DAY_OFF = localOffsetMs(Date.now())
/** Tests: rebuild the directors for a time zone. */
export const resetBbDirectors = (dayOffsetMs: number): void => { B_DIR = bbDirector(dayOffsetMs); H_DIR = heisDirector(dayOffsetMs); DAY_OFF = dayOffsetMs }

export type BbPlay = { kind: BbKind; at: number }
let PLAY: BbPlay | undefined
/** The act a replay (or the "say my name" unlock) started last. */
export const bbPlay = (): BbPlay | undefined => PLAY
export const setBbPlay = (p: BbPlay | undefined): void => { PLAY = p }
const play = (kind: BbKind) => (at: number): void => { PLAY = { kind, at } }
export const BB_SKINS = ['breaking-bad']
export const HEIS_SKINS = ['heisenberg']
registerPlay(HEIS_SKINS, { name: 'say-my-name', what: 'SAY MY NAME: the hat, the turn, "You\'re goddamn right."', run: play('name') })
// On Breaking Bad the moment IS the switch to Heisenberg: the words do it, a replay cannot.
registerPlay(BB_SKINS, { name: 'say-my-name', what: 'SAY MY NAME (type it)', run: () => 'Type "say my name" and see.' })
registerPlay([...BB_SKINS, ...HEIS_SKINS], { name: 'desert-standoff', what: 'The Desert Stand-off', run: play('standoff') })
registerPlay(BB_SKINS, { name: 'pizza-on-the-roof', what: 'the pizza on the roof (the daily set piece)', run: play('pizza') })
registerPlay(BB_SKINS, { name: 'yeah-science', what: 'the job-done cheer', run: play('cheer') })
registerPlay(HEIS_SKINS, { name: 'one-who-knocks', what: "Heisenberg's job-done cheer", run: play('heischeer') })

const OWN: Record<BbKind, 'bb' | 'heis' | 'both'> = { name: 'heis', standoff: 'both', pizza: 'bb', cheer: 'bb', heischeer: 'heis' }
const owns = (k: BbKind, heis: boolean): boolean => OWN[k] === 'both' || OWN[k] === (heis ? 'heis' : 'bb')
/**
 * The act to draw at `at` on this skin: a replay (or the unlock) first, else the director's. Within `ahead` ms of its start it
 * is drawn already (pinned, so it begins on time). Undefined when nothing is due.
 */
export const bbDue = (at: number, working: boolean, heis: boolean, ahead = AHEAD_MS): { kind: BbKind; startAt: number } | undefined => {
  const p = PLAY
  if (p && owns(p.kind, heis) && at >= p.at - ahead && at < p.at + BB_MS[p.kind]) return { kind: p.kind, startAt: p.at }
  const held = p ? [{ startAt: p.at, endAt: p.at + BB_MS[p.kind] }] : []
  const s: Slot | undefined = (heis ? H_DIR : B_DIR).at(at, { working, held }, ahead)
  return s ? { kind: s.id as BbKind, startAt: s.startAt } : undefined
}
/** Is an act on screen now (Jesse keeps away: one act at a time)? Working-only slots count even at rest (the conservative way). */
export const bbBusy = (at: number, heis: boolean): boolean => {
  const d = bbDue(at, true, heis, 0)
  return Boolean(d && at >= d.startAt - 500 && at < d.startAt + BB_MS[d.kind])
}
/** What the panels redraw for: the due act and its start (a new reading draws it, pinned, ahead of time). */
export const bbTick = (at: number, working: boolean, heis: boolean): string => {
  const d = bbDue(at, working, heis)
  return d ? `${d.kind}@${d.startAt}` : ''
}

// ---------------------------------------------------------------- small parts
/** A line of sans with a dark outline (a subtitle): readable on any ground. */
const cap = (x: number, y: number, text: string, size: number, fill: string, o: { anchor?: string; italic?: boolean; weight?: number; ls?: number } = {}): string =>
  `<text x="${r1(x)}" y="${r1(y)}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''} font-size="${r1(size)}"${o.italic ? ' font-style="italic"' : ''} font-weight="${o.weight ?? 700}"${o.ls ? ` letter-spacing="${o.ls}"` : ''} fill="${fill}" stroke="#000" stroke-width="${r1(Math.max(2, size * 0.22))}" stroke-linejoin="round" paint-order="stroke">${esc(text)}</text>`
/** A line that types itself on from t0 to t1 (a clip that steps open, one step a letter). */
const typed = (act: Act, t0: number, t1: number, x: number, y: number, text: string, size: number, fill: string, o: { italic?: boolean; weight?: number } = {}): string => {
  const n = Math.max(1, [...text].length)
  const w = r1(sansW(text, size, 0, true) * 1.1 + 8)
  const t = `<rect x="${r1(x - 3)}" y="${r1(y - size)}" width="${w}" height="${r1(size * 1.45)}" fill="none"/>${cap(x, y, text, size, fill, o)}`
  return act.kf(t, [[0, 'clip-path:inset(0 100% 0 0)'], [t0, 'clip-path:inset(0 100% 0 0)'], [t1, 'clip-path:inset(0 0 0 0)']], { ease: `steps(${n},end)` })
}
/** Width of heavy caps at `size` (the title card's weight 900 runs a touch wider than the measured 700). */
const heavyW = (s: string, size: number, ls = 0): number => sansW(s, size, ls, true) * 1.07
/** An element tile, as on the show's title card: the atomic number top-left, the symbol centred. `s` is its side. */
const tile = (x: number, y: number, s: number, num: string, sym: string, fill = C.green, ink = C.greenInk): string =>
  `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(s)}" height="${r1(s)}" rx="${r1(s * 0.08)}" fill="${fill}"/><text x="${r1(x + s * 0.1)}" y="${r1(y + s * 0.3)}" font-size="${r1(s * 0.26)}" font-weight="700" fill="${ink}" fill-opacity=".8">${num}</text><text x="${r1(x + s / 2)}" y="${r1(y + s * 0.8)}" text-anchor="middle" font-size="${r1(s * 0.56)}" font-weight="800" fill="${ink}">${esc(sym)}</text>`
/** A soft dark scrim over the act's region, its right edge fading. `from`: where it starts (the figure box stays clear). */
const scrim = (act: Act, op: number, fill: string, from = 0): string => {
  const id = `${act.p}sg`
  return `<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${fill}"/><stop offset=".9" stop-color="${fill}"/><stop offset="1" stop-color="${fill}" stop-opacity="0"/></linearGradient></defs><rect x="${r1(from)}" width="${r1(act.W - from)}" height="${act.H}" fill="url(#${id})" opacity="${op}"/>`
}
/** The scrim as one flat rect: the still frame's (the gradient lives in the act's body, defined once). */
const scrimFlat = (act: Act, op: number, fill: string, from = 0): string => `<rect x="${r1(from)}" width="${r1(act.W * 0.95 - from)}" height="${act.H}" fill="${fill}" opacity="${op}"/>`
/** A 4-point glint (the lens catching the light). */
const glint = (x: number, y: number, r: number, fill = C.white): string => `<path d="M${r1(x)} ${r1(y - r)}L${r1(x + r * 0.22)} ${r1(y - r * 0.22)}L${r1(x + r)} ${r1(y)}L${r1(x + r * 0.22)} ${r1(y + r * 0.22)}L${r1(x)} ${r1(y + r)}L${r1(x - r * 0.22)} ${r1(y + r * 0.22)}L${r1(x - r)} ${r1(y)}L${r1(x - r * 0.22)} ${r1(y - r * 0.22)}Z" fill="${fill}"/>`
/** An act's whole body, hidden before its start (a panel draws it ahead) and faded in and out. */
const life = (act: Act, body: string, fade = 0.3): string => act.on(body, 0.01, act.T - act.off - 0.02, { fade })

/** The widest x span inside [x0, w] free of every hole that overlaps rows y0..y1 (region coordinates). */
export const freeSpan = (holes: Rect[], w: number, y0: number, y1: number, x0 = 0): [number, number] => {
  const cuts = holes.filter(([, hy, , hh]) => hy < y1 && hy + hh > y0).map(([hx, , hw]) => [hx - 4, hx + hw + 4] as [number, number]).sort((a, b) => a[0] - b[0])
  let best: [number, number] = [x0, x0]
  let at = x0
  for (const [a, b] of cuts) {
    if (a > at && a - at > best[1] - best[0]) best = [at, Math.min(a, w)]
    at = Math.max(at, b)
  }
  if (w - at > best[1] - best[0]) best = [at, w]
  return best
}

// ---------------------------------------------------------------- SAY MY NAME (the owner's must-have)
const LINE = "YOU'RE GODDAMN RIGHT."
const LINE2: [string, string] = ["YOU'RE GODDAMN", 'RIGHT.']
const LINE3: [string, string, string] = ["YOU'RE", 'GODDAMN', 'RIGHT.']
const meets = (a: Rect, b: Rect): boolean => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]
/**
 * The largest empty rectangles of a region w by h around `holes` (each kept `pad` px clear, 2 px above and below): where a
 * piece of an act can stand whole. Brute force over the holes' edges (a band has two holes), the maximal ones only.
 */
export const freeRects = (w: number, h: number, holes: Rect[], pad = 4): Rect[] => {
  const hs = holes.map(([x, y, hw, hh]) => [x - pad, y - 2, hw + pad * 2, hh + 4] as Rect)
  const edges = (v: number[], max: number): number[] => [...new Set([0, max, ...v].map(n => Math.max(0, Math.min(max, n))))].sort((a, b) => a - b)
  const xs = edges(hs.flatMap(([x, , hw]) => [x, x + hw]), w)
  const ys = edges(hs.flatMap(([, y, , hh]) => [y, y + hh]), h)
  const all: Rect[] = []
  xs.forEach((x0, i) => xs.slice(i + 1).forEach(x1 => ys.forEach((y0, k) => ys.slice(k + 1).forEach(y1 => {
    const r: Rect = [x0, y0, x1 - x0, y1 - y0]
    if (!hs.some(q => meets(r, q))) all.push(r)
  }))))
  const inside = (a: Rect, b: Rect): boolean => b[0] <= a[0] && b[1] <= a[1] && b[0] + b[2] >= a[0] + a[2] && b[1] + b[3] >= a[1] + a[3]
  return all.filter((a, i) => !all.some((b, j) => j !== i && inside(a, b)))
}
export type TitleL = { x: number; y: number; size: number; lines: string[]; over: boolean; box: Rect }
/** The title card's plate (x, y, w, h) for a layout. */
export const plateOf = (L: { x: number; y: number; size: number; lines: string[] }): Rect => {
  const tw = Math.max(...L.lines.map(l => heavyW(l, L.size, L.size * 0.04)))
  return [r1(L.x - 7), r1(L.y - L.size * 0.86), r1(tw + 14), r1(L.size * (1.04 * (L.lines.length - 1) + 1.12))]
}
/**
 * The title card's layout in a region w by h: the biggest size it reaches in one, two or three lines, whole, inside a free
 * rectangle (never touching a hole). Clear of `avoid` (his face) unless going over it is much bigger (then the act dims him).
 * `box` is the rectangle it stands in: the slam is clipped to it, so the 2.4x scale never reaches a chip. `most`: the most lines.
 */
export const titleLayout = (w: number, h: number, holes: Rect[], avoid?: Rect, maxS = 44, most = 3): TitleL => {
  const cands: TitleL[] = []
  // Every free rectangle around the holes (over his face allowed), and those clear of his face too.
  for (const box of [...freeRects(w, h, holes, 3), ...(avoid ? freeRects(w, h, [...holes, avoid], 3) : [])]) {
    const [bx, by, bw, bh] = box
    for (const lines of [[LINE], [...LINE2], [...LINE3]].slice(0, most)) {
      const n = lines.length
      const per = Math.max(...lines.map(l => heavyW(l, 10, 0.4))) / 10
      const size = r1(Math.min(maxS, (bh - 4) / (1.04 * (n - 1) + 1.12), (bw - 16) / per))
      if (size < 8) continue
      const plateH = size * (1.04 * (n - 1) + 1.12)
      const L = { x: r1(bx + (bw - per * size) / 2), y: r1(by + (bh - plateH) / 2 + size * 0.86), size, lines, over: false, box }
      cands.push({ ...L, over: Boolean(avoid && meets(plateOf(L), avoid)) })
    }
  }
  // Clear of his face beats over it when nearly as big; fewer lines beat more at the same size.
  const score = (c: TitleL): number => (c.over ? c.size * 0.8 : c.size) - c.lines.length * 0.3
  cands.sort((p, q) => score(q) - score(p))
  return cands[0] ?? { x: 4, y: r1(h / 2 + 4), size: 10, lines: [LINE], over: true, box: [0, 0, w, h] }
}
/** A clip to one rectangle (an act's piece that must stay inside its free rectangle), with a fresh id. */
const boxed = (id: string, [x, y, w, h]: Rect, svg: string): string => `<defs><clipPath id="${id}"><rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}"/></clipPath></defs><g clip-path="url(#${id})">${svg}</g>`
/** The title card at rest: heavy white caps on a black plate with a crystal-blue edge. */
const titleCard = (L: TitleL): string => {
  const [px, py, pw, ph] = plateOf(L)
  const words = L.lines.map((l, i) => `<text x="${r1(L.x)}" y="${r1(L.y + i * L.size * 1.04)}" font-size="${L.size}" font-weight="900" letter-spacing="${r1(L.size * 0.04)}" fill="${C.white}">${esc(l)}</text>`).join('')
  return `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="#000" opacity=".86"/><rect x="${px}" y="${py}" width="3" height="${ph}" fill="${C.blue}"/>${words}`
}
/**
 * SAY MY NAME in a region w by h (the band's whole clear span under the header: the task row, the step row and the tip line,
 * with the Tasks chip and the step count as `holes`), 4.9 s. Every piece stands whole in a free rectangle, as big as it fits.
 * Act times (the hit-stop adds .2 s after 2.55 on the timeline):
 *   0.04  the stare: the close-up under the brim slams on in a letterbox (a flash, a 2 px tap); "Say my name." types on under it
 *   1.0   cut to him, bare-headed, in profile, under a cold light from above; the black hat drops out of the dark toward him
 *         (from the camera: it comes in big and shrinks as it falls), turning, lands (a squash, a ring of air, a 1 px tap)
 *   1.78  the head turns to face you (profile, three-quarter, front: the hat man's turn), the camera pushes in; "Heisenberg."
 *   2.55  HIT-STOP: everything holds .2 s, the lens glints
 *   2.62  YOU'RE GODDAMN RIGHT. slams on (2.4x to rest, inside its own rectangle), a flash, a 3 px camera shake
 *   3.9   the scene wipes away downward on a crystal-blue bar: Heisenberg's own panel underneath
 * Reduced motion: his face under the hat and the line.
 */
export const nameAct = (o: { at: number; w: number; h: number; id: string; holes?: Rect[] }): { layer: string; act: Act } => {
  const { w, h } = o
  const holes = o.holes ?? []
  const act = new Act({ id: o.id, ms: BB_MS.name, at: o.at, W: w, H: h, K: 5 })
  const cam = new Camera(act)
  // The hit-stop first: every later time on this act shifts by it (stage trap 11).
  cam.freeze(2.55, 0.2)
  const rects = freeRects(w, h, holes)
  const best = (fit: (r: Rect) => number): Rect => [...rects].sort((p, q) => fit(q) - fit(p) || p[0] - q[0])[0] ?? [0, 0, w, h]
  // His head: the close-up as big as a free rectangle holds it (at most 2.2 band px a sprite px), the leftmost of the biggest.
  // The hat drops in a wider shot (the head smaller, standing on the same spot, room above it for the fall); the camera then
  // pushes in about his foot to the close-up as he turns.
  const fitHead = ([, , rw, rh]: Rect): number => Math.min(2.2, (rh - 2) / 40, (rw - 6) / 36)
  const hr = best(fitHead)
  const hsc = r3(Math.max(0.6, fitHead(hr)))
  const hsw = r3(Math.max(0.5, Math.min(hsc * 0.64, (hr[3] * 0.56) / 40)))
  const bx = r1(hr[0] + 3 + 18 * hsc)
  const foot = r1(hr[1] + hr[3] - 1)
  const by = r1(foot - 20 * hsw)
  act.cast('cut', SP.BBAD_CUTIN_HAT, 0.5, 6)
  act.cast('b90', SP.BBAD_HEAD_090, 12 / 24, 5).cast('h90', SP.HEIS_HEAD_090, 13 / 27, 5).cast('h45', SP.HEIS_HEAD_045, 16 / 32, 5).cast('h0', SP.HEIS_HEAD_000, 18 / 36, 6)
  castHats(act, 3)
  // 1. The stare: the close-up in a letterbox as big as a free rectangle takes (4:1, at most 4x), slammed on inside it.
  const cr = best(([, , rw, rh]) => Math.min(4, (rw - 8) / 80, (rh - 4) / 20))
  const ksc = r3(Math.max(0.5, Math.min(4, (cr[2] - 8) / 80, (cr[3] - 4) / 20)))
  const lbW = r1(80 * ksc)
  const lbH = r1(20 * ksc)
  const ccx = r1(cr[0] + cr[2] / 2)
  const lbY = r1(cr[1] + (cr[3] - lbH) / 2)
  const strip = `<rect x="${r1(ccx - lbW / 2)}" y="${lbY}" width="${lbW}" height="${lbH}" fill="#000"/>${act.bank.use('cut', ccx, r1(lbY + lbH / 2), 1, ksc)}<rect x="${r1(ccx - lbW / 2)}" y="${lbY}" width="${lbW}" height="${lbH}" fill="none" stroke="${C.blue}" stroke-opacity=".55"/>`
  const stare = act.win(0.04, 1.0, boxed(`${act.p}sc`, cr, act.kf(strip, [[0, 'transform:scale(1.14)'], [0.04, 'transform:scale(1.14)'], [0.16, 'transform:scale(1)'], [0.2, 'transform:translateX(2px)'], [0.26, 'transform:none']], { origin: `${ccx}px ${r1(lbY + lbH / 2)}px` })))
  // "Say my name." as a subtitle on the letterbox's foot, typed on.
  const capS = r1(Math.max(11, Math.min(17, lbH * 0.17)))
  const sayW = heavyW('Say my name.', capS)
  const say = act.on(typed(act, 0.25, 0.7, r1(ccx - sayW / 2), r1(lbY + lbH - capS * 0.5), 'Say my name.', capS, C.white, { italic: true }), 0.2, 1.0, { fade: 0.1 })
  // 2. The cold light from above (the hat drops through it: a black hat on a lit ground reads), the glow behind his head.
  const light = act.on(`<defs><linearGradient id="${act.p}cn" x1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.ice}" stop-opacity=".2"/><stop offset="1" stop-color="${C.blue}" stop-opacity=".05"/></linearGradient><radialGradient id="${act.p}hz"><stop offset="0" stop-color="${C.ice}" stop-opacity=".38"/><stop offset=".55" stop-color="${C.blue}" stop-opacity=".14"/><stop offset="1" stop-color="${C.blue}" stop-opacity="0"/></radialGradient></defs><path d="M${r1(bx - 9 * hsw)} -12H${r1(bx + 9 * hsw)}L${r1(bx + 30 * hsw)} ${foot}H${r1(bx - 30 * hsw)}Z" fill="url(#${act.p}cn)"/><ellipse cx="${bx}" cy="${r1(by - 11 * hsw)}" rx="${r1(30 * hsw)}" ry="${r1(21 * hsw)}" fill="url(#${act.p}hz)"/>`, 1.0, 4.6, { fade: 0.2 })
  // The hat drops onto the bare head (the hat turntable's views along a falling path), lands with a squash, settles. It comes
  // from the camera: scaled 1.45x about its landing spot, back to 1x as it lands; two streaks of air above it as it falls.
  const hs = r3(0.68 * hsw)
  const brim = r1(by - 10.5 * hsw)
  const hy = r1(brim - 7.5 * hs)
  const hx = r1(bx + 0.5 * hsw)
  const fall: [number, number, number, number?, number?, number?][] = [[1.0, r1(hx - 9 * hsw), r1(6 * hs), -16], [1.3, r1(hx - 3 * hsw), r1(6 * hs + (hy - 6 * hs) * 0.55), -8], [1.55, hx, r1(hy + 0.8 * hsw), 0, 1, 0.8], [1.63, hx, r1(hy - 0.5 * hsw), 0, 1, 1.05], [1.72, hx, hy, 0, 1, 1]]
  const hatSegs = [...spin(turnViews(HAT_VIEWS), 1.0, 1.55, 0.36), [1.55, 1.78, 'hv0']] as [number, number, string][]
  const streaks = `<path d="M${r1(-7 * hs)} ${r1(-9 * hs)}v${r1(-12 * hs)}M${r1(6 * hs)} ${r1(-10 * hs)}v${r1(-8 * hs)}" stroke="${C.ice}" stroke-opacity=".55" stroke-width="1.2" stroke-linecap="round"/>`
  const hat = act.kf(act.actor('hat', hatSegs, [...fall, [1.78, hx, hy, 0, 1, 1], [act.T - 0.21, hx, hy, 0, 1, 1]], { sc: hs, trail: [[1.0, 1.5, streaks]] }), [[0, 'transform:scale(1.45)'], [1.0, 'transform:scale(1.45)'], [1.55, 'transform:none']], { origin: `${hx}px ${hy}px` })
  // The landing: a flat ring of air at the brim and a 1 px tap.
  const dust = fx.ring(act, 1.55, hx, r1(brim + 0.5), { rx: r1(16 * hs), color: C.sub, w: 1 })
  cam.shake(1.55, 1, 0.08)
  // 3. The head turns to face you: bare profile under the falling hat, then the hat man's profile, three-quarter, front.
  const turn = act.on(act.still('b90', bx, by, 1, hsw), 1.0, 1.78) + act.on(act.still('h90', bx, by, 1, hsw), 1.78, 2.08) + act.on(act.still('h45', bx, by, 1, hsw), 2.08, 2.3) + act.on(act.still('h0', bx, by, 1, hsw), 2.3, 4.6)
  cam.push(1.78, 2.4, r3(hsc / hsw), bx, foot, 'settle')
  // The title card's place: the biggest it fits whole, clear of his face (the close-up) when that costs little.
  const face: Rect = [r1(bx - 18 * hsc - 2), r1(foot - 40 * hsc), r1(36 * hsc + 4), r1(40 * hsc)]
  const L = titleLayout(w, h, holes, face)
  // The dealer's answer: centred in the free rectangle clear of his face where it reads biggest, else where the card will be.
  const perAns = heavyW('\u201CHeisenberg.\u201D', 10) / 10
  const ansFit = ([, , rw, rh]: Rect): number => Math.min(22, L.size * 0.6, (rw - 12) / perAns, rh / 1.6)
  const ar = freeRects(w, h, [...holes, face], 3).filter(r => ansFit(r) >= 10.5).sort((p, q) => ansFit(q) - ansFit(p))[0] ?? L.box
  const ansS = r1(Math.max(10.5, ansFit(ar)))
  const answer = act.on(cap(r1(ar[0] + ar[2] / 2), r1(ar[1] + ar[3] / 2 + ansS * 0.36), '\u201CHeisenberg.\u201D', ansS, C.sub, { anchor: 'middle', italic: true, weight: 600 }), 1.9, 2.56, { fade: 0.12 })
  // 4. The hit-stop's glint on the lens (front view: the glasses at row 20 of 40, left of the turn axis).
  const lens = fx.star3(act, 2.56, r1(bx - 5 * hsw), r1(by + 0.5 * hsw), r1(Math.max(2.5, 3.2 * hsw)), { core: C.white, star: C.ice, ring: C.blue })
  // 5. The title card slammed (2.4x to rest) inside its own rectangle, a flash, a shake; his face dimmed when it goes over him.
  const card = titleCard(L)
  const slam = boxed(`${act.p}tc`, L.box, act.slam(card, 2.62, 4.3))
  const dimFace = `<rect width="${w}" height="${h}" fill="#000" opacity=".55"/>`
  const dim = L.over ? act.on(dimFace, 2.62, 4.4) : ''
  const flashes = fx.flash(act, 0.04, { a: 0.3 }) + fx.flash(act, 2.63, { a: 0.24 })
  cam.shake(2.64, 3, 0.26).shake(2.92, 1, 0.12)
  const scene = `${scrim(act, 0.97, C.ink)}${stare}${say}${cam.wrap(`${light}${turn}${hat}${dust}${lens}`)}${answer}${dim}${slam}${flashes}`
  // 6. The wipe: the whole scene pulled away downward on a crystal-blue bar. Its life ends before the hit-stop's .2 s runs past
  // the timeline's end (a later end would clamp and fade the whole act).
  const body = act.on(`${wipe.clip(act, 3.9, 4.45, scene, { dir: 'd', mode: 'out', ease: 'settle' })}${wipe.bar(act, 3.9, 4.45, { dir: 'd', color: C.blue, core: C.ice, ease: 'settle' })}`, 0.01, 4.66, { fade: 0.1 })
  const still = `${scrimFlat(act, 0.97, C.ink)}${act.still('h0', bx, r1(foot - 20 * hsc), 1, hsc)}${L.over ? dimFace : ''}${card}`
  return { layer: act.done(body, still), act }
}
/**
 * SAY MY NAME's pane echo on the CLASSROOM board, 4.9 s, under 5 k (a busy Breaking Bad pane sits near the drawing's cap): his
 * bare head (half resolution, twice the size), "Say my name.", the black hat dropping onto him with a bounce, the hit-stop, the
 * slam, a fade. The close-up, the turn and the camera are the band's.
 */
export const nameEcho = (o: { at: number; w: number; h: number; id: string }): { layer: string; act: Act } => {
  const { w, h } = o
  const act = new Act({ id: o.id, ms: BB_MS.name, at: o.at, W: w, H: h, K: 4 })
  act.freeze(2.55, 0.2)
  const hsc = r3(Math.min(3.4, (h - 10) / 40))
  const hw = 18 * hsc
  const bx = r1(Math.max(hw + 10, Math.min(w * 0.2, hw + 40)))
  const by = r1(h - 20 * hsc)
  act.cast('b0', half(SP.BBAD_HEAD_000), 0.5, 4).cast('hv0', half(SP.HEIS_HAT_0), 0.5, 3)
  const hs = r3(1.36 * hsc)
  const brim = r1(by - 10.5 * hsc)
  // The half-size hat's brim (row 9.5 of 11) sits on the forehead, the glasses clear.
  const hy = r1(brim - 4.6 * hs)
  const capS = r1(Math.min(22, h * 0.11))
  const say = act.on(cap(r1(bx + hw + 14), r1(h / 2 + capS * 0.36), 'Say my name.', capS, C.white, { italic: true }), 0.2, 1.75, { fade: 0.12 })
  const hat = act.actor('hat', [[1.0, 4.7, 'hv0']], [[1.0, bx, r1(-6 * hsc)], [1.5, bx, r1(hy + 0.8 * hsc)], [1.6, bx, r1(hy - 0.4 * hsc)], [1.7, bx, hy], [act.T - 0.21, bx, hy]], { sc: hs })
  const L = titleLayout(w, h, [], [0, 0, r1(bx + hw + 6), h], 46, 2)
  const lh = L.size * 1.04
  const tw = Math.max(...L.lines.map(l => heavyW(l, L.size, L.size * 0.04)))
  const top = r1(L.y - L.size * 0.86)
  const plateH = r1(lh * (L.lines.length - 1) + L.size * 1.12)
  const card = `<rect x="${r1(L.x - 7)}" y="${top}" width="${r1(tw + 14)}" height="${plateH}" fill="#000" opacity=".86"/><rect x="${r1(L.x - 7)}" y="${top}" width="3" height="${plateH}" fill="${C.blue}"/>${L.lines.map((l, i) => `<text x="${r1(L.x)}" y="${r1(L.y + i * lh)}" font-size="${L.size}" font-weight="900" fill="${C.white}">${esc(l)}</text>`).join('')}`
  const ground = `<rect width="${w}" height="${h}" fill="${C.ink}" opacity=".96"/>`
  const head = act.still('b0', bx, by, 1, hsc * 2)
  const body = act.on(`${ground}${head}${say}${hat}${act.slam(card, 2.62, 4.3)}`, 0.01, 4.5, { fade: 0.15 })
  return { layer: act.done(body, `${ground}${head}${act.still('hv0', bx, hy, 1, hs)}${L.lines.map((l, i) => `<text x="${r1(L.x)}" y="${r1(L.y + i * lh)}" font-size="${L.size}" font-weight="900" fill="${C.white}">${esc(l)}</text>`).join('')}`), act }
}
/**
 * The band-wide half of the moment: Breaking Bad's green held over the band (see-through: the numbers read through it) until
 * the scene's wipe, then pulled off downward with it on the crystal-blue bar. The skin switch in Heisenberg's own flavour.
 */
export const nameVeil = (o: { at: number; W: number; H: number; id: string }): string => {
  const act = new Act({ id: o.id, ms: BB_MS.name, at: o.at, W: o.W, H: o.H })
  const veil = `<rect width="${o.W}" height="${o.H}" fill="${C.bbGround}" opacity=".5"/><rect y="${o.H - 2}" width="${o.W}" height="2" fill="${C.green}" opacity=".8"/>`
  const body = `${act.on(wipe.clip(act, 4.1, 4.65, veil, { dir: 'd', mode: 'out', ease: 'settle' }), 0.01, 4.7)}${wipe.bar(act, 4.1, 4.65, { dir: 'd', color: C.blue, core: C.ice, ease: 'settle' })}`
  return act.done(body, `<rect width="${o.W}" height="2" fill="${C.blue}"/>`)
}

// ---------------------------------------------------------------- THE DESERT STAND-OFF
/**
 * The stand-off in a region w by h, 10 s. Words only; no weapon drawn, nothing fired.
 *   0.5  the hat man and the dealer face each other in the desert, the RV parked behind; the stare (the camera creeps 3%)
 *   2.0  he tips his hat: "Say my name."   3.4  the dealer flinches: "…Heisenberg." (his close-up, eyes wide)
 *   4.8  a step forward: "You're goddamn right."   6.4  the dealer backs down   7.4  arms folded; the wind
 * Reduced motion: the hat man, arms folded; the dealer backing off; the last line.
 */
export const standoffAct = (o: { at: number; w: number; h: number; id: string; holes?: Rect[]; sc?: number; lite?: boolean }): { layer: string; act: Act; fight: Fight } => {
  const { w, h } = o
  const lite = Boolean(o.lite)
  const act = new Act({ id: o.id, ms: BB_MS.standoff, at: o.at, W: w, H: h, K: lite ? 4 : 6 })
  const sc = o.sc ?? r3(Math.min(1.15, (h - 6) / 47))
  const gy = r1(h - 3)
  const cy = r1(gy - (47 * sc) / 2)
  for (const [k, sp, ax] of HAT_MAN) if (!lite || k === 'hS' || k === 'hP' || k === 'hF') act.cast(k, sp, ax)
  for (const [k, sp, ax] of DEALER) if (!lite || k !== 'dU') act.cast(k, sp, ax)
  // The two stand in the widest span free of the Tasks chip.
  const [a, b] = freeSpan(o.holes ?? [], w, 2, h - 2)
  const mid = r1(Math.min(a + (b - a) * 0.5, a + 70 * sc + 30))
  const hx = r1(mid - 26 * sc)
  const dx = r1(mid + 26 * sc)
  const cam = new Camera(act)
  const f = new Fight(act, { sc, ink: C.ink, ghosts: false, font: SANS }, cam)
  f.fighter('h', 'hS', hx, cy).fighter('d', 'dC', dx, cy, -1)
  f.at(0.5).stare('h', 'd', 1.4, { push: 0.03 })
  if (!lite) f.at(2.0).pose('h', 'hT')
  f.at(3.4).flinch('d', lite ? { d: 0.5, px: 2 } : { pose: 'dU', d: 1.2, px: 2 })
  f.at(4.8).step('h', 4, 0.35, { pose: 'hP' })
  f.at(6.4).backdown('d', 7, 0.7, { pose: 'dB' })
  f.at(7.4).pose('h', 'hF')
  // The desert at dusk: a warm ground, the mesas' strip drifting slowly, the RV parked behind (a nearer layer, drifting more).
  const dsc = r3(Math.min(1.6, (h * 0.42) / MESAS.rows.length))
  let ground = `<defs><linearGradient id="${act.p}dk" x1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.dusk}"/><stop offset=".5" stop-color="#3A2412"/><stop offset=".8" stop-color="#7A4220"/><stop offset="1" stop-color="${C.sand}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#${act.p}dk)" opacity=".96"/>`
  ground += `<rect y="${r1(gy - 1)}" width="${w}" height="${r1(h - gy + 1)}" fill="${C.sand}"/>`
  if (!lite) {
    act.cast('mesa', MESAS, 0, 3)
    const p = act.bank.pose('mesa')
    const tileId = `${act.p}mp`
    ground += `<defs><pattern id="${tileId}" width="192" height="${MESAS.rows.length}" patternUnits="userSpaceOnUse"><use href="#${p.id}"/></pattern></defs>`
    ground += act.mv(`<g transform="translate(0 ${r1(gy - 1 - MESAS.rows.length * dsc)}) scale(${dsc})" opacity=".55"><rect width="${r1(w / dsc + 200)}" height="${MESAS.rows.length}" fill="url(#${tileId})"/></g>`, [[0, 0, 0], [act.T, -8, 0]])
    act.cast('rv', SP.BBAD_RV, 36 / 64, 4)
    const rsc = r3(Math.min(0.7, (h * 0.42) / 30))
    ground += act.mv(`<g opacity=".7">${act.bank.use('rv', r1(Math.min(b - 34 * rsc, dx + 52 * sc)), r1(gy - 15 * rsc - 1), -1, rsc)}</g>`, [[0, 0, 0], [act.T, -14, 0]])
  } else {
    // The pane's echo: the mesas in code (three flat-topped shapes).
    const m = (x: number, mw: number, mh: number): string => `M${r1(x)} ${gy}l${r1(mh * 0.5)} ${r1(-mh)}h${r1(mw - mh)}l${r1(mh * 0.5)} ${r1(mh)}z`
    ground += `<path d="${m(w * 0.06, w * 0.22, h * 0.18)}${m(w * 0.42, w * 0.3, h * 0.13)}${m(w * 0.8, w * 0.16, h * 0.2)}" fill="${C.mesa}" opacity=".45"/>`
  }
  // The low sun behind them.
  ground += `<defs><radialGradient id="${act.p}sn"><stop offset="0" stop-color="${C.sun}" stop-opacity=".6"/><stop offset="1" stop-color="${C.sun}" stop-opacity="0"/></radialGradient></defs><ellipse cx="${mid}" cy="${r1(gy - 22 * sc)}" rx="${r1(84 * sc)}" ry="${r1(34 * sc)}" fill="url(#${act.p}sn)"/>`
  // The lines, as subtitles over the speaker.
  const fs = r1(lite ? Math.min(24, h * 0.1) : Math.max(10, Math.min(13, 11 * sc)))
  const ty = r1(Math.max(fs + 2, cy - 23.5 * sc - 4))
  const lines = act.on(cap(hx - 6 * sc, ty, 'Say my name.', fs, C.white, { italic: true, anchor: 'middle' }), 2.05, 3.3, { fade: 0.15 })
    + act.on(cap(dx + 6 * sc, ty, '…Heisenberg.', fs, C.sub, { italic: true, anchor: 'middle' }), 3.5, 4.7, { fade: 0.15 })
    + act.on(cap(hx, ty, "You're goddamn right.", fs, C.ice, { italic: true, anchor: 'middle', weight: 800 }), 4.9, 6.9, { fade: 0.2 })
  // The dealer's close-up on "Heisenberg." (the band only), at the span's right end.
  let cut = ''
  if (!lite) {
    act.cast('cutD', SP.BBAD_CUTIN_DEALER, 0.5, 6)
    const lbH = r1(Math.min(h * 0.7, 30 * sc, ((b - a - 8) / 80) * 20))
    const k = r3(lbH / 20)
    const ccx = r1(Math.max(a + 40 * k + 4, b - 40 * k - 6))
    const lbY = r1((h - lbH) / 2)
    cut = act.win(3.45, 4.0, act.kf(`<rect width="${w}" height="${h}" fill="${C.ink}" opacity=".9"/><rect x="${r1(ccx - 40 * k)}" y="${lbY}" width="${r1(80 * k)}" height="${lbH}" fill="#000"/>${act.bank.use('cutD', ccx, r1(lbY + lbH / 2), 1, k)}`, [[0, 'transform:scale(1.08)'], [3.45, 'transform:scale(1.08)'], [3.57, 'transform:none']], { origin: `${ccx}px ${r1(h / 2)}px` }))
  }
  const wind = fx.dust(act, 7.6, r1(mid + 20 * sc), r1(gy - 2), { n: 3, seed: 'wind', color: '#8A7A5A', dx: -14, s: 0.7 })
  const body = life(act, `${ground}${cam.wrap(`${f.body()}${wind}`)}${cut}${lines}`, 0.45)
  const still = `<rect width="${w}" height="${h}" fill="${C.dusk}" opacity=".96"/><rect y="${r1(gy - 1)}" width="${w}" height="${r1(h - gy + 1)}" fill="${C.sand}"/>${act.still('hF', hx + 4 * sc, cy, 1, sc)}${act.still('dB', dx + 7 * sc, cy, -1, sc)}${cap(hx, ty, "You're goddamn right.", fs, C.ice, { italic: true, anchor: 'middle', weight: 800 })}`
  return { layer: act.done(body, still), act, fight: f }
}

// ---------------------------------------------------------------- THE PIZZA ON THE ROOF (the daily set piece)
/**
 * The pizza in a region w by h, 4.6 s: thrown from Walt's box, it tumbles along an arc (the 6 pre-rendered views) and lands on
 * the roof of the house, slides, and stays. "Skyler is not impressed." The bust's box stays clear of the scrim (he threw it).
 */
export const pizzaAct = (o: { at: number; w: number; h: number; id: string; holes?: Rect[] }): { layer: string; act: Act } => {
  const { w, h } = o
  const act = new Act({ id: o.id, ms: BB_MS.pizza, at: o.at, W: w, H: h, K: 5 })
  const rsc = r3(Math.min(2, (h * 0.58) / 17))
  const [, b] = freeSpan(o.holes ?? [], w, 2, h - 2, 60)
  const roofX = r1(Math.max(140, Math.min(b - 26 * rsc, w * 0.62)))
  act.cast('roof', SP.BBAD_ROOF, 0.5, 5).cast('pl', SP.BBAD_PIZZA_LANDED, 0.5, 5)
  PIZZAS.forEach((sp, i) => act.cast(`p${i}`, sp, 0.5, 5))
  const ps = r3(Math.min(1.3, h / 40))
  const roofY = r1(h - 8.5 * rsc)
  const ridge = r1(h - 15.5 * rsc)
  // The arc: from the bust's box up over the title row and down onto the ridge; sampled, so the path reads as a throw.
  const x0 = 38
  const y0 = r1(h * 0.4)
  const x1 = r1(roofX - 4 * rsc)
  const y1 = r1(ridge - 4 * ps)
  const keys: [number, number, number][] = []
  for (let i = 0; i <= 8; i++) {
    const u = i / 8
    keys.push([r3(0.35 + u * 1.15), r1(x0 + (x1 - x0) * u), r1(y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * h * 0.5)])
  }
  const segs = [...spin(PIZZAS.map((_, i) => ({ key: `p${i}`, dir: 1 as const })), 0.35, 1.5, 0.42), [1.5, 4.6, 'pl']] as [number, number, string][]
  // The last key at the act's end: a path that stops early eases back to its origin (stage: Fight.body does the same).
  const pizza = act.actor('pz', segs, [...keys, [1.6, r1(x1 + 6), r1(y1 + 1)], [1.7, r1(x1 + 5), y1], [act.T, r1(x1 + 5), y1]], { sc: ps })
  const puff = fx.puff(act, 1.52, r1(x1 + 4), r1(y1 + 6), { s: 0.45, fill: '#C9B48A' })
  const fsz = r1(Math.max(10, Math.min(12.5, h * 0.22)))
  const line = act.on(cap(56, r1(h * 0.36), 'Skyler is not impressed.', fsz, C.sub, { italic: true }), 2.0, 4.3, { fade: 0.3 })
  const house = act.still('roof', roofX, roofY, 1, rsc)
  const body = life(act, `${scrim(act, 0.94, C.ink, 52)}${house}${pizza}${puff}${line}`, 0.3)
  const still = `${scrimFlat(act, 0.94, C.ink, 52)}${house}${act.still('pl', r1(x1 + 5), y1, 1, ps)}`
  return { layer: act.done(body, still), act }
}

// ---------------------------------------------------------------- the cheers
/** Breaking Bad's job-done: two element tiles flip in as on the title card, Y and Sc: YEAH, SCIENCE! Then a crystal's glints. */
export const scienceAct = (o: { at: number; w: number; h: number; id: string; holes?: Rect[] }): { layer: string; act: Act } => {
  const { w, h } = o
  const act = new Act({ id: o.id, ms: BB_MS.cheer, at: o.at, W: w, H: h })
  // In the widest span free of the Tasks chip.
  const [a0, b0] = freeSpan(o.holes ?? [], w, 2, h - 2)
  const nat = 30 + 4 + heavyW('EAH,', 22) + 12 + 30 + 4 + heavyW('IENCE!', 22)
  const k = Math.min(1.25, (b0 - a0 - 20) / nat, (h - 10) / 34)
  const s = r1(30 * k)
  const fs = r1(22 * k)
  const x0 = r1(Math.max(a0 + 10, a0 + (Math.min(b0 - a0, 520) - nat * k) / 2))
  let x = x0
  const y = r1((h - s) / 2)
  const base = r1(y + s * 0.8)
  const flipIn = (svg: string, t: number, cx: number): string => act.kf(svg, [[0, 'transform:scale(0,1)'], [t, 'transform:scale(0,1)'], [t + 0.18, 'transform:scale(1,1)']], { origin: `${r1(cx)}px ${r1(y + s / 2)}px`, ease: 'settle' })
  const slide = (svg: string, t: number): string => act.mv(svg, [[0, -10, 0, 0], [t, -10, 0, 0], [t + 0.2, 0, 0, 1]], { ease: 'settle' })
  const word = (wx: number, text: string): string => `<text x="${r1(wx)}" y="${base}" font-size="${fs}" font-weight="900" letter-spacing=".5" fill="${C.white}">${esc(text)}</text>`
  let parts = flipIn(tile(x, y, s, '39', 'Y'), 0.15, x + s / 2)
  x = r1(x + s + 4 * k)
  parts += slide(word(x, 'EAH,'), 0.3)
  x = r1(x + heavyW('EAH,', fs) + 12 * k)
  const tx2 = x
  parts += flipIn(tile(x, y, s, '21', 'Sc'), 0.6, x + s / 2)
  x = r1(x + s + 4 * k)
  parts += slide(word(x, 'IENCE!'), 0.75)
  const end = r1(x + heavyW('IENCE!', fs))
  const glints = fx.sparks(act, 1.1, r1(tx2 + s / 2), r1(y + s / 2), { n: 8, seed: 'sci', color: C.blue, len: 6 }) + fx.star3(act, 1.15, r1(end + 10), r1(y + 4), 6, { core: C.white, star: C.ice, ring: C.blue })
  const body = life(act, `${scrim(act, 0.86, C.ink)}${parts}${glints}`, 0.25)
  let sx = x0
  let still = `${scrimFlat(act, 0.86, C.ink)}${tile(sx, y, s, '39', 'Y')}`
  sx = r1(sx + s + 4 * k)
  still += word(sx, 'EAH,')
  sx = r1(sx + heavyW('EAH,', fs) + 12 * k)
  still += `${tile(sx, y, s, '21', 'Sc')}${word(r1(sx + s + 4 * k), 'IENCE!')}`
  return { layer: act.done(body, still), act }
}
/** Heisenberg's job-done: three knocks (the camera taps), then I AM THE ONE WHO KNOCKS. types on, the hat turning once beside it. */
export const knocksAct = (o: { at: number; w: number; h: number; id: string; holes?: Rect[] }): { layer: string; act: Act } => {
  const { w, h } = o
  const [a0, b0] = freeSpan(o.holes ?? [], w, 2, h - 2)
  const act = new Act({ id: o.id, ms: BB_MS.heischeer, at: o.at, W: w, H: h })
  castHats(act, 3, lightHat)
  const cam = new Camera(act)
  for (const t of [0.2, 0.5, 0.8]) cam.shake(t, 2, 0.1)
  const hs = r3(Math.min(1.1, (h * 0.5) / 22))
  const hx = r1(a0 + 14 + 20 * hs)
  const hy = r1(h / 2 - 2)
  const turn = act.actor('hat', [[0, 1.0, 'hv0'], ...spin(turnViews(HAT_VIEWS), 1.0, 1.72, 0.36), [1.72, 3.6, 'hv0']] as [number, number, string][], [[0, hx, hy], [3.6, hx, hy]], { sc: hs })
  const text = 'I AM THE ONE WHO KNOCKS.'
  const tx = r1(hx + 22 * hs + 10)
  const fs = r1(Math.max(9, Math.min(16, ((b0 - tx - 10) / heavyW(text, 10, 1)) * 10, h * 0.3)))
  const ty = r1(h / 2 + fs * 0.36)
  const knock = (t: number, i: number): string => fx.ring(act, t, r1(tx + 8 + i * 12), r1(h / 2), { rx: 7, color: C.sub, w: 1.2 })
  const words = typed(act, 1.0, 1.9, tx, ty, text, fs, C.white, { weight: 900 })
  const rule = act.kf(`<rect x="${tx}" y="${r1(ty + 5)}" width="${r1(heavyW(text, fs, 1))}" height="2" fill="${C.blue}"/>`, [[0, 'transform:scaleX(0)'], [1.9, 'transform:scaleX(0)'], [2.2, 'transform:scaleX(1)']], { origin: `${tx}px 0px`, ease: 'settle' })
  const body = life(act, `${scrim(act, 0.9, C.night)}${cam.wrap(`${turn}${knock(0.2, 0)}${knock(0.5, 1)}${knock(0.8, 2)}${words}${rule}`)}`, 0.2)
  const still = `${scrimFlat(act, 0.9, C.night)}${act.still('hv0', hx, hy, 1, hs)}${cap(tx, ty, text, fs, C.white, { weight: 900 })}`
  return { layer: act.done(body, still), act }
}

// ---------------------------------------------------------------- placing an act on the band and in the pane
/** The band's act region: from the figure box to the clear span's right edge (stage/keep.ts), the task row; at most 640 wide. */
export const bandRegion = (W: number, H: number, stage?: BandStage): { x: number; y: number; w: number; h: number } => ({
  x: 8, y: 34, w: Math.round(Math.max(120, Math.min(W * 0.64, W - 300, 640, stage ? stage.x1 - 8 : W))), h: Math.max(48, Math.min(56, H - 78)),
})
/** SAY MY NAME's region: the band's whole clear span under the header (the task row, the step row, the tip line), from the
 *  figure box to the band's wide edge (each row up to its own first readout); the Tasks chip, the step count and the rows' right
 *  parts are its holes (`nameKeep`). Without a stage: the task row. */
export const nameRegion = (W: number, H: number, stage?: BandStage): { x: number; y: number; w: number; h: number } =>
  stage ? { x: 8, y: 34, w: Math.round(Math.max(120, (stage.wide?.x2 ?? stage.x1) - 8)), h: Math.max(56, H - 37) } : bandRegion(W, H)
/** SAY MY NAME's keep-out: the span's holes and, in the wide window, the rows' right parts. */
const nameKeep = (stage: BandStage): BandStage => ({ x1: stage.wide?.x2 ?? stage.x1, keep: [...stage.keep, ...(stage.wide?.keep ?? [])] })
/** The keep-out holes in the region's own coordinates. */
const holesIn = (r: { x: number; y: number }, stage?: BandStage): Rect[] => (stage?.keep ?? []).map(([x, y, w, h]) => [x - r.x, y - r.y, w, h] as Rect)
const placeBand = (layer: string, p: string, r: { x: number; y: number; w: number; h: number }, stage?: BandStage): string => {
  const id = `${p}rc`
  return `<defs>${stage ? keepClip(id, [r.x, r.y, r.w, r.h], stage.keep) : `<clipPath id="${id}"><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/></clipPath>`}</defs><g clip-path="url(#${id})" font-family="${SANS}"><g transform="translate(${r1(r.x)} ${r1(r.y)})">${layer}</g></g>`
}
/** The CLASSROOM card's board (inside its wooden frame, under the title row): where a pane act plays. */
export const paneRegion = (W: number, H: number): { x: number; y: number; w: number; h: number } => ({ x: 14, y: 36, w: Math.max(100, W - 28), h: Math.max(60, H - 50) })
const placePane = (layer: string, p: string, r: { x: number; y: number; w: number; h: number }): string =>
  `<g transform="translate(${r1(r.x)} ${r1(r.y)})" font-family="${SANS}"><defs><clipPath id="${p}rc"><rect width="${r.w}" height="${r.h}" rx="3"/></clipPath></defs><g clip-path="url(#${p}rc)">${layer}</g></g>`

/** The band's act now ('' when none): the job-done cheer while the party draws, else the act the director (or a replay) has due. */
export const bbBand = (o: { W: number; H: number; at: number; working: boolean; heis: boolean; party?: boolean; partyAt?: number; stage?: BandStage }): string => {
  const r = bandRegion(o.W, o.H, o.stage)
  const holes = holesIn(r, o.stage)
  const d = bbDue(o.at, o.working, o.heis)
  // The unlock outranks the cheer (a job that ends inside its 4.9 s waits for it).
  if (o.party && !(d?.kind === 'name' && o.at >= d.startAt - 1000)) {
    const at = o.partyAt ?? o.at
    if (o.at >= at + (o.heis ? BB_MS.heischeer : BB_MS.cheer)) return ''
    const a = o.heis ? knocksAct({ at, w: r.w, h: r.h, id: `bbk-band-${o.W}-${r.w}`, holes }) : scienceAct({ at, w: r.w, h: r.h, id: `bbs-band-${o.W}-${r.w}`, holes })
    return placeBand(a.layer, a.act.p, r, o.stage)
  }
  if (!d || o.at >= d.startAt + BB_MS[d.kind]) return ''
  if (d.kind === 'name') {
    const nr = nameRegion(o.W, o.H, o.stage)
    const nk = o.stage ? nameKeep(o.stage) : undefined
    const a = nameAct({ at: d.startAt, w: nr.w, h: nr.h, id: `name-band-${o.W}-${nr.w}x${nr.h}`, holes: holesIn(nr, nk) })
    return `${nameVeil({ at: d.startAt, W: o.W, H: o.H, id: `name-veil-${o.W}x${o.H}` })}${placeBand(a.layer, a.act.p, nr, nk)}`
  }
  const id = `${d.kind}-band-${o.W}-${r.w}`
  const base = { at: d.startAt, w: r.w, h: r.h, id }
  const a = d.kind === 'standoff' ? standoffAct({ ...base, holes }) : d.kind === 'pizza' ? pizzaAct({ ...base, holes })
    : d.kind === 'cheer' ? scienceAct({ ...base, holes }) : knocksAct({ ...base, holes })
  return placeBand(a.layer, a.act.p, r, o.stage)
}
/**
 * The CLASSROOM card's act now: SAY MY NAME filling its board, else ''. Lite: a busy Breaking Bad pane sits near the drawing's
 * cap, so the theme keeps only a 6 k reserve (collapse.test.tsx: three agents keep their cards) and the echo stays under 5 k.
 * The stand-off plays on the band only.
 */
export const bbPane = (o: { W: number; H: number; at: number; working: boolean; heis: boolean }): string => {
  const d = bbDue(o.at, o.working, o.heis)
  if (!d || o.at >= d.startAt + BB_MS[d.kind] || d.kind !== 'name') return ''
  const r = paneRegion(o.W, o.H)
  const id = `${d.kind}-pane-${o.W}`
  const a = nameEcho({ at: d.startAt, w: r.w, h: r.h, id })
  return placePane(a.layer, a.act.p, r)
}

// ---------------------------------------------------------------- Walt comes alive (the band's figure)
const drop1 = (sp: Sprite): Sprite => ({ ...sp, rows: sp.rows.slice(1) })
// The bust's live frames, as pixel patches over cast.ts's bust (the art set's frames are those busts with one empty top row).
const LIVE: Record<'bb' | 'heis', { base: Sprite; blink: Sprite; glance: Sprite; glint: Sprite }> = {
  bb: { base: BB_WALT_BUST, blink: drop1(SP.BBAD_WALT_BLINK), glance: drop1(SP.BBAD_WALT_GLANCE), glint: drop1(SP.BBAD_WALT_GLINT) },
  heis: { base: BB_HEIS_BUST, blink: drop1(SP.HEIS_BUST_BLINK), glance: drop1(SP.HEIS_BUST_GLANCE), glint: drop1(SP.HEIS_BUST_GLINT) },
}
/** Idle: a breath (1 px, 3.4 s), a blink now and then, a glance at the readouts. Working: he glances oftener. Done: the glint. */
const BUST_CSS = (working: boolean, party: boolean): string => {
  const P = party ? 1.6 : working ? 5.2 : 7.4
  const blink = party ? '' : working ? '0%,61%{opacity:0}61.1%,63.4%{opacity:1}63.5%,100%{opacity:0}' : '0%,38%{opacity:0}38.1%,39.7%{opacity:1}39.8%,86%{opacity:0}86.1%,87.7%{opacity:1}87.8%,100%{opacity:0}'
  const glance = party ? '' : working ? '0%,12%{opacity:0}12.1%,30%{opacity:1}30.1%,100%{opacity:0}' : '0%,58%{opacity:0}58.1%,70%{opacity:1}70.1%,100%{opacity:0}'
  const glint = party ? '0%,10%{opacity:1}10.1%,100%{opacity:0}' : '0%,96%{opacity:0}96.1%,97.4%{opacity:1}97.5%,100%{opacity:0}'
  return `.bbbust .bd{animation:bbwbr 3.4s steps(1) infinite}@keyframes bbwbr{50%{transform:translateY(-1px)}}`
    + `.bbwk,.bbwg,.bbwl{opacity:0;animation:bbwk ${P}s steps(1) infinite}.bbwg{animation-name:bbwg}.bbwl{animation-name:bbwl}`
    + `${blink ? `@keyframes bbwk{${blink}}` : ''}${glance ? `@keyframes bbwg{${glance}}` : ''}@keyframes bbwl{${glint}}`
    + '@media (prefers-reduced-motion: reduce){.bbbust .bd,.bbwk,.bbwg,.bbwl{animation:none!important}}'
}
/**
 * The band's figure: the pixel bust (breakingbad-cards `walt`) with its live patches in the same coordinates, so they breathe
 * with it. Party: the lenses glint (the glasses push). A few hundred chars over the bust.
 */
export const liveBust = (bust: (live: string) => string, heis: boolean, ctx: { working?: boolean; party?: boolean }): string => {
  const L = LIVE[heis ? 'heis' : 'bb']
  const cols = Math.max(...L.base.rows.map(r => r.length))
  const nw = cols * 0.5625
  const nh = L.base.rows.length * 0.5625
  const party = Boolean(ctx.party)
  const patch = (alt: Sprite, cls: string): string => spriteDiff(L.base, alt, cls, nw, nh)
  const live = party ? patch(L.glint, 'bbwl') : `${patch(L.blink, 'bbwk')}${patch(L.glance, 'bbwg')}${patch(L.glint, 'bbwl')}`
  return `<g pointer-events="none"><style>${BUST_CSS(Boolean(ctx.working), party)}</style>${bust(live)}</g>`
}

// ---------------------------------------------------------------- the blue crystal (PURITY's prop) and Heisenberg's hat
/**
 * The blue crystal by PURITY: 8 Blender views turning (2.4 s a turn, steps) while a job works, the front view at rest. `x` is
 * its centre, `y` the header's baseline. 18 x 17 px.
 */
export const crystal = (x: number, y: number, working: boolean): string => {
  const bank = new FrameBank('bbcr', 4)
  CRYSTALS.forEach((sp, i) => bank.add(`c${i}`, half(sp), 0.5))
  const t = turntable(bank, { id: 'bbcrt', views: CRYSTALS.map((_, i) => `c${i}`), x, y: r1(y - 6), period: working ? 2.4 : 0, still: 0 })
  return `<g pointer-events="none">${t.css ? `<style>${t.css}</style>` : ''}<defs>${bank.defs()}</defs>${t.svg}</g>`
}
/** The purity gauge with the crystal before its label (a gauge from breakingbad-cards `purityGauge`). */
export const crystalGauge = (g: { svg: string; w: number }, xr: number, y: number, working: boolean): { svg: string; w: number } => ({ svg: `${crystal(r1(xr - g.w - 12), y, working)}${g.svg}`, w: g.w + 22 })
/** A local hour's start long ago: the hat's hourly loop is pinned to it (any hour start keeps the phase; this one never moves). */
export const hatAnchor = (off = DAY_OFF): number => Date.UTC(2024, 0, 1) - (((off % 3_600_000) + 3_600_000) % 3_600_000)
/**
 * Heisenberg's logo: the black hat (the Blender turntable, lifted to a light ink) that turns once at the top of every local
 * hour (2 s, then the still front view for the rest of the hour: an endless 1-hour loop, no redraw needed). `x`, `y`: the
 * logo's left and baseline.
 */
export const hatLogo = (x: number, y: number): { svg: string; w: number } => {
  const bank = new FrameBank('bbhl', 3)
  HATS.forEach((sp, i) => bank.add(`hv${i}`, half(lightHat(sp)), 0.5))
  // A pork-pie hat looks the same from behind: its four views twice are one whole turn.
  const t = turntable(bank, { id: 'bbhlt', views: [...turnViews(HAT_VIEWS), ...turnViews(HAT_VIEWS)], x: r1(x + 11), y: r1(y - 5.5), sc: 1.05, period: 2, still: 0, every: 3600, from: hatAnchor() })
  return { svg: `<g pointer-events="none"><style>${t.css}</style><defs>${bank.defs()}</defs>${t.svg}</g>`, w: 24 }
}

// ---------------------------------------------------------------- HEISENBERG on the episode (never the title)
/**
 * Now and then (300 ms every 90 s) the episode flips to HEISENBERG: one clean horizontal cut, the lower half 2 px off. An
 * overlay on the episode's own text (`ep`, right-anchored), `x` its left edge, `y` its baseline. '' when the word cannot fit.
 */
export const heisFlip = (ep: string, x: number, y: number): string => {
  const right = Number(/\bx="([\d.]+)"/.exec(ep)?.[1])
  if (!Number.isFinite(right)) return ''
  const room = right - x + 18
  const size = [11.5, 10.5, 9.5].find(s => sansW('HEISENBERG', s, 0.8, true) <= room)
  if (size === undefined) return ''
  const ww = r1(sansW('HEISENBERG', size, 0.8, true))
  const left = r1(Math.min(x, right - ww) - 3)
  const word = (dx: number, clip: string): string => `<text x="${r1(right + dx)}" y="${y}" text-anchor="end" font-family="${SANS}" font-size="${size}" font-weight="800" letter-spacing=".8" fill="${C.white}" clip-path="url(#${clip})">HEISENBERG</text>`
  const mid = r1(y - size * 0.38)
  return `<g class="bbhf" data-egg="flip" pointer-events="none" opacity="0"><style>.bbhf{animation:bbhf 90s steps(1) infinite}@keyframes bbhf{0%,41%{opacity:0}41.01%,41.34%{opacity:1}41.35%,100%{opacity:0}}@media (prefers-reduced-motion: reduce){.bbhf{animation:none!important}}</style><defs><clipPath id="bbhfa"><rect x="${left}" y="${r1(y - 14)}" width="${r1(right - left + 4)}" height="${r1(mid - y + 14)}"/></clipPath><clipPath id="bbhfb"><rect x="${r1(left - 3)}" y="${mid}" width="${r1(right - left + 6)}" height="6"/></clipPath></defs><rect x="${left}" y="${r1(y - 12)}" width="${r1(right - left + 3)}" height="15" fill="${C.night}"/>${word(0, 'bbhfa')}${word(-2, 'bbhfb')}<rect x="${left}" y="${r1(mid - 0.5)}" width="${r1(right - left + 3)}" height="1" fill="${C.blue}" opacity=".7"/></g>`
}

// ---------------------------------------------------------------- the skin switch flavours
/** Breaking Bad's switch: the veil wipes right on a green bar; Br and Ba flip in over the figure box as on the title card. */
export const BB_SWITCH: SwitchFlavour = {
  dir: 'r', ms: 800, shards: 0, veil: 0.5,
  extra: (act, s) => {
    if (s !== 'band') return ''
    const y = Math.round(Math.min(46, act.H / 2 - 10))
    const T = act.T
    const one = (x: number, t: number, num: string, sym: string): string => act.kf(tile(x, y, 17, num, sym), [[0, 'opacity:1;transform:scale(0,1)'], [t, 'opacity:1;transform:scale(0,1)'], [t + 0.12, 'opacity:1;transform:scale(1,1)'], [T - 0.12, 'opacity:1;transform:scale(1,1)'], [T - 0.03, 'opacity:0;transform:scale(1,1)']], { origin: `${x + 8.5}px ${y + 8.5}px` })
    return `<g font-family="${SANS}">${one(19, 0.08, '35', 'Br')}${one(38, 0.18, '56', 'Ba')}</g>`
  },
}
/** Heisenberg's switch: the veil drops away on a crystal-blue bar; the black hat drops into the figure box and settles. */
export const HEIS_SWITCH: SwitchFlavour = {
  dir: 'd', ms: 850, shards: 0, veil: 0.55,
  extra: (act, s) => {
    if (s !== 'band') return ''
    act.cast('em', lightHat(SP.HEIS_HAT_0), 0.5, 3)
    const y = Math.round(Math.min(48, act.H / 2 - 6))
    const T = act.T
    return act.mv(act.bank.use('em', 0, 0, 1, 0.8), [[0, 37, -12, 1], [0.22, 37, y + 1, 1], [0.3, 37, y, 1], [T - 0.1, 37, y, 1], [T - 0.02, 37, y, 0]], { ease: 'cubic-bezier(.5,0,1,1)' })
  },
}
