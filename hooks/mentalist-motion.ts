// The Mentalist and its hidden Red John skin, wave 3 motion, built on hooks/stage. Quiet and elegant: tea, cards, a couch, a
// red smiley. Nothing here is a blow or a superhero effect; Red John is menace by implication only (no face, no victims).
//
//   tea ritual     the band's figure (and the COLD READ card's): idle, Jane sips his tea (hold, lift, sip, lower, a 3.8 s
//                  loop with a long hold); working, he thinks (eyes closed, a 1 px sway); done, the knowing smile; failed,
//                  the cup set down. steps(1) swaps of rect-path poses, phased: cheap at rest.
//   THE READ       the stand-off (choreo's stare, step, flinch, backdown): seated across a side table, he fans the cards, the
//                  palm (his close-up, a wink), the other man's tell (a flinch), the reveal (a card flips: seven of hearts),
//                  the smile. Rare: the director's fight lane (one per 30-45 min, working only). `/missioncontrol play the-read`.
//   PARLOUR        the daily set piece: he rises from the couch, turns to the room (the 3-view head turn, a close-up) and
//                  points: "It was the butler." Once a day, seeded by the local day. `/missioncontrol play parlour-reveal`.
//   cheer          a playing card drops, flips to the ace of hearts: "Case closed." (Red John: the smiley paints itself on.)
//   corner         past 95% context (or over a job's budget) the red smiley PAINTS itself on in strokes, holds, fades, again.
//   Red John       "Tyger Tyger" title card on the unlock (and `play tyger-tyger`); the man in the dark coat walks the band,
//                  stops, turns toward you (a silhouette), one close-up of the smile, gone (`play walk-by`); his own cheer.
//
// Band acts play in the band's clear span through its keep-out clip (stage/keep.ts): never over a number, label or chip. Pane
// acts fill the COLD READ card's body under its title. Every act is pinned (`Act`) and has a still frame.
import * as SP from './mentalist-sprites'
import type { Sprite } from './cast'
import { Camera } from './stage/camera'
import { Fight, fightLane } from './stage/choreo'
import { Director, localOffsetMs } from './stage/director'
import type { Slot } from './stage/director'
import { esc } from './stage/budget'
import { FrameBank } from './stage/frames'
import { keepClip } from './stage/keep'
import type { BandStage } from './stage/keep'
import { registerPlay } from './stage/replay'
import { Act, r1, r3 } from './stage/timeline'
import type { SwitchFlavour } from './stage/wipe'

export const SERIF = "'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,'Noto Serif',serif"
const C = { ink: '#070B14', paper: '#E6EBF2', cream: '#F4F0E4', navy: '#1B2A4A', gold: '#C9A227', lamp: '#E8C26A', blue: '#8DB4EA', sub: '#B4C0D3', red: '#E0261F', rjInk: '#050304', rjText: '#F2F2F2', rjSub: '#BBAAAA' }

/** How long each act runs (ms). */
export const MENT_MS = { 'the-read': 10_000, parlour: 9_000, tyger: 4_600, 'walk-by': 6_000, cheer: 3_400, rjcheer: 3_600 } as const
export type MentKind = keyof typeof MENT_MS
/** A panel that redraws seldom draws an act this far ahead (its start is pinned, so it begins on time). */
export const AHEAD_MS = 60_000

// ---------------------------------------------------------------- sprites
/** Empty rows on top so a figure's poses share one height (the feet stay on the floor when the pose swaps). */
const padTo = (sp: Sprite, h: number): Sprite => {
  const w = Math.max(...sp.rows.map(r => r.length))
  return { ...sp, rows: [...Array.from({ length: Math.max(0, h - sp.rows.length) }, () => '.'.repeat(w)), ...sp.rows.map(r => r.padEnd(w, '.'))] }
}
// [key, sprite padded to the pose set's height, where the body stands (the manifest's foot pivot / width)]
const TEA: [string, Sprite, number][] = [['hold', SP.MENT_TEA_HOLD, 8 / 13], ['lift', SP.MENT_TEA_LIFT, 6 / 12], ['sip', SP.MENT_TEA_SIP, 6 / 13], ['lower', padTo(SP.MENT_TEA_LOWER, 47), 8 / 13]]
const THINK = padTo(SP.MENT_THINK, 47)
const SMILE = SP.MENT_SMILE
const CUP_DOWN = padTo(SP.MENT_CUP_DOWN, 47)
// The man in the dark coat, a shade lifted so the silhouette reads on Red John's near-black band (still faceless, still dark).
const lift = (sp: Sprite): Sprite => ({ ...sp, pal: { a: '#1C1A22', b: '#2A2731', c: '#3A3642', d: '#4E4856' } })
const RJ_WALK_A = lift(SP.REDJ_WALK_A)
const RJ_WALK_B = lift(SP.REDJ_WALK_B)
const RJ_STAND = lift(SP.REDJ_STAND)
const RJ_TURN = lift(SP.REDJ_TURN)

// ---------------------------------------------------------------- the director and the replays
/** The Mentalist's rare acts: the Parlour Reveal once a local day (10-19 h), THE READ at most once per 30-45 min while working. */
export const mentDirector = (dayOffsetMs = 0): Director =>
  fightLane(new Director('mentalist', { dayOffsetMs }).lane('piece', { daily: [10, 19] }).add('piece', { id: 'parlour', ms: MENT_MS.parlour, replay: 'parlour-reveal' }), [{ id: 'the-read', ms: MENT_MS['the-read'] }])
/** Red John's: the walk-by, now and then (20-30 min apart, most slots), idle or working. */
export const rjDirector = (dayOffsetMs = 0): Director =>
  new Director('redjohn', { dayOffsetMs }).lane('roam', { gap: [20, 30], chance: 0.8 }).add('roam', { id: 'walk-by', ms: MENT_MS['walk-by'], replay: 'walk-by' })
let M_DIR = mentDirector(localOffsetMs(Date.now()))
let RJ_DIR = rjDirector(localOffsetMs(Date.now()))
/** Tests: rebuild the directors for a time zone. */
export const resetMentDirectors = (dayOffsetMs: number): void => { M_DIR = mentDirector(dayOffsetMs); RJ_DIR = rjDirector(dayOffsetMs) }

export type MentPlay = { kind: MentKind; at: number }
let PLAY: MentPlay | undefined
/** The act a replay (or the Tyger unlock) started last. */
export const mentPlay = (): MentPlay | undefined => PLAY
export const setMentPlay = (p: MentPlay | undefined): void => { PLAY = p }
const play = (kind: MentKind) => (at: number): void => { PLAY = { kind, at } }
export const MENT_SKINS = ['mentalist']
export const RJ_SKINS = ['red-john']
registerPlay(MENT_SKINS, { name: 'the-read', what: 'THE READ, a card-trick mind duel', run: play('the-read') })
registerPlay(MENT_SKINS, { name: 'parlour-reveal', what: 'the Parlour Reveal (the daily set piece)', run: play('parlour') })
registerPlay(RJ_SKINS, { name: 'tyger-tyger', what: 'the Tyger Tyger title card', run: play('tyger') })
registerPlay(RJ_SKINS, { name: 'walk-by', what: 'the man in the dark coat walks by', run: play('walk-by') })
registerPlay(MENT_SKINS, { name: 'case-closed', what: 'the job-done card trick', run: play('cheer') })
registerPlay(RJ_SKINS, { name: 'still-watching', what: "Red John's job-done smiley", run: play('rjcheer') })

const OWN: Record<MentKind, 'ment' | 'rj'> = { 'the-read': 'ment', parlour: 'ment', tyger: 'rj', 'walk-by': 'rj', cheer: 'ment', rjcheer: 'rj' }
/**
 * The act to draw at `at` on this skin: a replay (or the unlock's title card) first, else the director's. Within `ahead` ms of
 * its start it is drawn already (pinned, so it begins on time). Undefined when nothing is due.
 */
export const mentDue = (at: number, working: boolean, red: boolean, ahead = AHEAD_MS): { kind: MentKind; startAt: number } | undefined => {
  const p = PLAY
  if (p && OWN[p.kind] === (red ? 'rj' : 'ment') && at >= p.at - ahead && at < p.at + MENT_MS[p.kind]) return { kind: p.kind, startAt: p.at }
  const held = p ? [{ startAt: p.at, endAt: p.at + MENT_MS[p.kind] }] : []
  const s: Slot | undefined = (red ? RJ_DIR : M_DIR).at(at, { working, held }, ahead)
  return s ? { kind: s.id as MentKind, startAt: s.startAt } : undefined
}
/** Is one of Jane's acts on screen (he is out of the figure box, in the act)? */
export const janeOut = (at: number, working: boolean): boolean => {
  const d = mentDue(at, working, false, 0)
  return Boolean(d && (d.kind === 'the-read' || d.kind === 'parlour') && at >= d.startAt - 300 && at < d.startAt + MENT_MS[d.kind])
}
/** What the panels redraw for: the due act and its start (a new reading draws it, pinned, ahead of time). */
export const mentTick = (at: number, working: boolean, red: boolean): string => {
  const d = mentDue(at, working, red)
  return d ? `${d.kind}@${d.startAt}` : ''
}

// ---------------------------------------------------------------- small parts
/** The smiley as brush strokes in a box of radius r about (cx, cy): ring (clockwise from the top), eyes, smile, a 2 px drip. */
const strokes = (cx: number, cy: number, r: number): { ring: string; eyes: string; smile: string; drip: string } => ({
  ring: `M${r1(cx)} ${r1(cy - r)}a${r1(r)} ${r1(r)} 0 1 1 -.1 0`,
  eyes: `M${r1(cx - r * 0.36)} ${r1(cy - r * 0.42)}v${r1(r * 0.32)}M${r1(cx + r * 0.36)} ${r1(cy - r * 0.42)}v${r1(r * 0.32)}`,
  smile: `M${r1(cx - r * 0.56)} ${r1(cy + r * 0.12)}Q${r1(cx)} ${r1(cy + r * 0.82)} ${r1(cx + r * 0.56)} ${r1(cy + r * 0.12)}`,
  drip: `M${r1(cx + r * 0.2)} ${r1(cy + r * 0.44)}v${r1(Math.max(2, r * 0.3))}`,
})
const stroke = (d: string, w: number, color: string, extra = ''): string => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${r1(w)}" stroke-linecap="round" pathLength="1" stroke-dasharray="1"${extra}/>`
/** The smiley painting itself on inside an act, from t0 over `d` s (ring, eyes, smile, then the drip runs and fades). */
export const paintSmiley = (act: Act, t0: number, d: number, cx: number, cy: number, r: number, color = C.red): string => {
  const s = strokes(cx, cy, r)
  const w = Math.max(1.4, r * 0.16)
  const brush = (path: string, a: number, b: number, width = w): string =>
    act.kf(stroke(path, width, color), [[0, 'stroke-dashoffset:1'], [t0 + d * a, 'stroke-dashoffset:1'], [t0 + d * b, 'stroke-dashoffset:0']], { ease: 'steps(6,end)' })
  const drip = act.kf(stroke(s.drip, w * 0.7, color), [[0, 'stroke-dashoffset:1;opacity:1'], [t0 + d * 0.95, 'stroke-dashoffset:1;opacity:1'], [t0 + d * 1.25, 'stroke-dashoffset:0;opacity:1'], [t0 + d * 1.9, 'stroke-dashoffset:0;opacity:0']])
  return brush(s.ring, 0, 0.55) + brush(s.eyes, 0.55, 0.68, w * 1.1) + brush(s.smile, 0.68, 0.95) + drip
}
/** The smiley painted, still (reduced motion). */
const smileyStill = (cx: number, cy: number, r: number, color = C.red): string => {
  const s = strokes(cx, cy, r)
  const w = Math.max(1.4, r * 0.16)
  return `<path d="${s.ring}${s.smile}" fill="none" stroke="${color}" stroke-width="${r1(w)}" stroke-linecap="round"/><path d="${s.eyes}" fill="none" stroke="${color}" stroke-width="${r1(w * 1.1)}" stroke-linecap="round"/>`
}
/** A line of serif that types itself on from t0 to t1 (a clip that steps open, one step a letter). */
const typed = (act: Act, t0: number, t1: number, x: number, y: number, text: string, size: number, fill: string, o: { italic?: boolean; ls?: number; weight?: number } = {}): string => {
  const n = Math.max(1, [...text].length)
  const w = r1(n * size * 0.52 + (o.ls ?? 0) * n + 4)
  const t = `<rect x="${r1(x - 1)}" y="${r1(y - size)}" width="${w}" height="${r1(size * 1.35)}" fill="none"/><text x="${r1(x)}" y="${r1(y)}" font-family="${SERIF}" font-size="${size}"${o.italic === false ? '' : ' font-style="italic"'}${o.weight ? ` font-weight="${o.weight}"` : ''}${o.ls ? ` letter-spacing="${o.ls}"` : ''} fill="${fill}">${esc(text)}</text>`
  return act.kf(t, [[0, 'clip-path:inset(0 100% 0 0)'], [t0, 'clip-path:inset(0 100% 0 0)'], [t1, 'clip-path:inset(0 0 0 0)']], { ease: `steps(${n},end)` })
}
const line = (x: number, y: number, text: string, size: number, fill: string, o: { italic?: boolean; anchor?: string; ls?: number; weight?: number } = {}): string =>
  `<text x="${r1(x)}" y="${r1(y)}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''} font-family="${SERIF}" font-size="${size}"${o.italic === false ? '' : ' font-style="italic"'}${o.weight ? ` font-weight="${o.weight}"` : ''}${o.ls ? ` letter-spacing="${o.ls}"` : ''} fill="${fill}">${esc(text)}</text>`
/** A soft dark scrim over the act's region, its right edge fading, so the figures read over the title row. */
const scrim = (act: Act, op: number, fill: string): string => {
  const id = `${act.p}sg`
  return `<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${fill}"/><stop offset=".88" stop-color="${fill}"/><stop offset="1" stop-color="${fill}" stop-opacity="0"/></linearGradient></defs><rect width="${act.W}" height="${act.H}" fill="url(#${id})" opacity="${op}"/>`
}
/** The scrim as one flat rect: the still frame's (the gradient lives in the act's body, defined once). */
const scrimFlat = (act: Act, op: number, fill: string): string => `<rect width="${r1(act.W * 0.94)}" height="${act.H}" fill="${fill}" opacity="${op}"/>`
/** A warm lamp's pool of light at (x, y). */
const lampGlow = (act: Act, x: number, y: number, rx: number, ry: number, color = C.lamp, op = 0.28): string => {
  const id = `${act.p}lg${act.k()}`
  return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${op}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(rx)}" ry="${r1(ry)}" fill="url(#${id})"/>`
}
/** A drawing-room layer (160 wide) tiled across the act at `sc`, its foot at `foot`, drifting `drift` px over the act (parallax). */
const roomLayer = (act: Act, key: string, sp: Sprite, foot: number, sc: number, op: number, drift: number): string => {
  act.cast(key, sp, 0, 4)
  const p = act.bank.pose(key)
  const pid = `${act.p}${key}p`
  const h = sp.rows.length
  const tile = `<defs><pattern id="${pid}" width="160" height="${h}" patternUnits="userSpaceOnUse"><use href="#${p.id}"/></pattern></defs>`
  const band = `<g transform="translate(0 ${r1(foot - h * sc)}) scale(${r3(sc)})" opacity="${op}"><rect width="${r1(act.W / sc + 170)}" height="${h}" fill="url(#${pid})"/></g>`
  return tile + act.mv(band, [[0, 0, 0], [act.T, -drift, 0]])
}
/** A playing card w by h at (x, y) top-left: its back (navy lattice) or its face (a value and a heart). */
const cardBack = (x: number, y: number, w: number, h: number): string =>
  `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${r1(w * 0.12)}" fill="${C.navy}" stroke="${C.cream}" stroke-width="${r1(Math.max(0.8, w * 0.06))}"/><path d="M${r1(x + w / 2)} ${r1(y + h * 0.22)}l${r1(w * 0.26)} ${r1(h * 0.28)}l${r1(-w * 0.26)} ${r1(h * 0.28)}l${r1(-w * 0.26)} ${r1(-h * 0.28)}z" fill="none" stroke="${C.gold}" stroke-width="${r1(Math.max(0.6, w * 0.05))}"/>`
const cardFace = (x: number, y: number, w: number, h: number, value: string): string =>
  `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${r1(w * 0.12)}" fill="${C.cream}"/><text x="${r1(x + w * 0.16)}" y="${r1(y + h * 0.3)}" font-family="${SERIF}" font-size="${r1(h * 0.28)}" font-weight="700" fill="${C.red}">${esc(value)}</text><text x="${r1(x + w / 2)}" y="${r1(y + h * 0.78)}" text-anchor="middle" font-family="${SERIF}" font-size="${r1(h * 0.42)}" fill="${C.red}">♥</text>`
/** A card that flips from its back to its face at t (scaleX through 0 about its middle), shown from t0 to t1. */
const flipCard = (act: Act, t0: number, t: number, t1: number, x: number, y: number, w: number, h: number, value: string): string => {
  const flip = act.kf(`${act.on(cardBack(x, y, w, h), t0, t + 0.09)}${act.on(cardFace(x, y, w, h, value), t + 0.09, t1)}`, [[0, 'transform:scale(1,1)'], [t, 'transform:scale(1,1)'], [t + 0.09, 'transform:scale(.06,1)'], [t + 0.2, 'transform:scale(1,1)']], { origin: `${r1(x + w / 2)}px ${r1(y + h / 2)}px` })
  return flip
}
/** An act's whole body, hidden before its start (a panel draws it ahead) and faded in and out. */
const life = (act: Act, body: string, fade = 0.35): string => act.on(body, 0.01, act.T - act.off - 0.02, { fade })

// ---------------------------------------------------------------- THE READ (the stand-off)
/**
 * THE READ in a region w by h (the band's clear span, or the COLD READ card's body), 10 s:
 *   0.6  both seated across a side table under the lamp; the stare (the camera creeps in 3%)
 *   2.0  Jane leans in, the cards fanned
 *   2.4  THE PALM: his close-up in a letterbox (a wink) — the card is gone from the deck
 *   3.2  the other man's TELL: a flinch, "a blink."
 *   4.4  the REVEAL: Jane holds out a card; it flips: seven of hearts. "Seven of hearts."
 *   5.2  the other man backs down; 6.4 Jane's smile. No blows.
 * Reduced motion: the smile, the card face up, the line. Returns the layer (an `Act.done`) in the region's coordinates.
 */
export const readAct = (o: { at: number; w: number; h: number; id: string; sc?: number; lite?: boolean }): { layer: string; act: Act; fight: Fight } => {
  const act = new Act({ id: o.id, ms: MENT_MS['the-read'], at: o.at, W: o.w, H: o.h, K: o.lite ? 4 : 6 })
  const sc = o.sc ?? r3(Math.min(1.25, (o.h - 8) / 40, o.w / 200))
  const gy = o.h - 3
  const cyJ = r1(gy - (38 * sc) / 2)
  const cyO = r1(gy - (40 * sc) / 2)
  // Jane keeps 6 colours even in the lite echo (at 4 his suit and shirt fold into one pale blob); the silhouette needs 4.
  act.cast('jFan', SP.MENT_READ_FAN, 16 / 22, 6).cast('jRev', padTo(SP.MENT_READ_REVEAL, 38), 14 / 27, 6).cast('jSmile', SP.MENT_READ_SMILE, 17 / 27, 6).cast('oHold', SP.MENT_READ_OPP_HOLD, 10 / 21, 4).cast('oFlinch', SP.MENT_READ_OPP_FLINCH, 10 / 21, 4)
  const mid = r1(Math.min(o.w * 0.42, 120 * sc + 30))
  const jx = r1(mid - 30 * sc)
  const ox = r1(mid + 34 * sc)
  const cam = new Camera(act)
  const f = new Fight(act, { sc, ink: C.ink, ghosts: false, font: SERIF }, cam)
  f.fighter('j', 'jFan', jx, cyJ).fighter('o', 'oHold', ox, cyO, -1)
  f.at(0.6).stare('j', 'o', 1.3, { push: 0.03 })
  f.at(2.0).step('j', 3, 0.3)
  // The tell: a flinch (the lite echo jolts the same pose: one pose fewer).
  f.at(3.2).flinch('o', o.lite ? { d: 0.45, px: 2 } : { pose: 'oFlinch', d: 0.45, px: 2 })
  f.at(4.4).pose('j', 'jRev')
  f.at(5.2).backdown('o', 5, 0.6)
  f.at(6.4).pose('j', 'jSmile')
  // The room: the drawing room's chairs and lamp, faint, drifting; the lamp's pool of light on the table.
  let room = o.lite ? '' : roomLayer(act, 'mid', SP.MENT_ARENA_MID, gy + 1, Math.min(1.6, (o.h * 0.62) / 25), 0.28, 6)
  room += lampGlow(act, mid + 6 * sc, gy - 22 * sc, 80 * sc, 34 * sc, C.lamp, 0.4)
  // A side table between them, a cup on it.
  const tw = 14 * sc
  const ty = r1(gy - 15 * sc)
  const table = `<path d="M${r1(mid - tw / 2)} ${ty}h${r1(tw)}v${r1(1.6 * sc)}h${r1(-tw)}z" fill="#5A4030"/><path d="M${r1(mid - 0.8 * sc)} ${r1(ty + 1.6 * sc)}h${r1(1.6 * sc)}V${gy}h${r1(-1.6 * sc)}z" fill="#3A2A20"/><path d="M${r1(mid - 4 * sc)} ${gy}h${r1(8 * sc)}v1h${r1(-8 * sc)}z" fill="#3A2A20"/><path d="M${r1(mid + 1 * sc)} ${r1(ty - 2.4 * sc)}h${r1(3.4 * sc)}v${r1(1.6 * sc)}a${r1(1 * sc)} ${r1(0.8 * sc)} 0 0 1 ${r1(-1 * sc)} ${r1(0.8 * sc)}h${r1(-1.4 * sc)}a${r1(1 * sc)} ${r1(0.8 * sc)} 0 0 1 ${r1(-1 * sc)} ${r1(-0.8 * sc)}z" fill="${C.cream}"/>`
  // The tell, and the reveal's card and line.
  const capY = r1(Math.max(13, gy - 42 * sc))
  const fs = r1(Math.max(10, Math.min(14, 10.5 * sc)))
  const tell = act.on(line(ox + 10 * sc, capY, 'a blink.', fs * 0.9, C.sub), 3.2, 4.3, { fade: 0.15 })
  const cw = r1(9 * sc)
  const ch = r1(13 * sc)
  const cx0 = r1(jx + 12 * sc)
  const cy0 = r1(cyJ - 12 * sc)
  const card = flipCard(act, 4.45, 4.6, 8.9, cx0, cy0, cw, ch, '7')
  const reveal = act.on(line(mid, capY, 'Seven of hearts.', fs, C.cream, { anchor: 'middle' }), 4.9, 8.9, { fade: 0.25 })
  // THE PALM: his close-up in a letterbox, slammed in (scale 1.08 to 1), a 2 px tap; the room dims around it. (The pane's lite
  // echo leaves the close-up to the band: a line instead.)
  if (!o.lite) act.cast('cut', SP.MENT_CUTIN_JANE, 0.5, 6)
  const lbH = r1(Math.min(o.h * 0.7, 30 * sc))
  const ksc = r3(lbH / 20)
  const lbY = r1((o.h - lbH) / 2)
  // At the region's right end: the title's Tasks chip (a keep-out hole) sits to the left, never in the strip.
  const ccx = r1(Math.max(mid + 10, o.w - 40 * ksc - 12))
  const strip = o.lite ? '' : `<rect width="${o.w}" height="${o.h}" fill="${C.ink}" opacity=".94"/><rect x="${r1(ccx - 40 * ksc)}" y="${lbY}" width="${r1(80 * ksc)}" height="${lbH}" fill="#000"/>${act.bank.use('cut', ccx, r1(lbY + lbH / 2), 1, ksc)}<rect x="${r1(ccx - 40 * ksc)}" y="${lbY}" width="${r1(80 * ksc)}" height="${lbH}" fill="none" stroke="${C.gold}" stroke-opacity=".6"/>`
  const palm = o.lite ? act.on(line(jx + 14 * sc, capY, 'the palm.', fs * 0.9, C.sub), 2.3, 3.1, { fade: 0.15 })
    : act.win(2.4, 3.0, act.kf(strip, [[0, 'transform:scale(1.08)'], [2.4, 'transform:scale(1.08)'], [2.52, 'transform:scale(1)'], [2.58, 'transform:translateX(2px)'], [2.64, 'transform:none']], { origin: `${ccx}px ${r1(o.h / 2)}px` }))
  const body = life(act, `${scrim(act, 0.96, C.ink)}${room}${cam.wrap(`${table}${f.body()}${card}`)}${tell}${reveal}${palm}`)
  const still = `${scrimFlat(act, 0.96, C.ink)}${table}${act.still('jSmile', jx, cyJ, 1, sc)}${act.still('oHold', ox - 5 * sc, cyO, -1, sc)}${cardFace(cx0, cy0, cw, ch, '7')}${line(mid, capY, 'Seven of hearts.', fs, C.cream, { anchor: 'middle' })}`
  return { layer: act.done(body, still), act, fight: f }
}

// ---------------------------------------------------------------- THE PARLOUR REVEAL (the daily set piece)
/**
 * The Parlour Reveal in a region w by h, 9 s:
 *   0.4  Jane asleep on the brown leather couch in the drawing room (a "z" or two rises)
 *   2.6  he sits up, rubs his eyes; 3.6 rises, hand on his knee
 *   4.3  CLOSE-UP: he turns to the room, profile, three-quarter, face to face (the 3-view head turn), a 3% push-in
 *   5.6  wide again: he stands and points. "It was the butler." (the camera creeps in)
 * Reduced motion: the point and the line.
 */
export const parlourAct = (o: { at: number; w: number; h: number; id: string; sc?: number; lite?: boolean }): { layer: string; act: Act } => {
  const act = new Act({ id: o.id, ms: MENT_MS.parlour, at: o.at, W: o.w, H: o.h, K: o.lite ? 4 : 6 })
  const sc = o.sc ?? r3(Math.min(1.15, (o.h - 8) / 47, o.w / 190))
  const gy = o.h - 3
  act.cast('couch', SP.MENT_COUCH, 0.5, 4).cast('lie', SP.MENT_COUCH_LIE, 0.5, 6).cast('sit', padTo(SP.MENT_COUCH_SIT, 40), 13 / 20, 6).cast('rise', SP.MENT_COUCH_RISE, 8 / 20, 6).cast('point', SP.MENT_POINT, 8 / 28, 6)
  if (!o.lite) act.cast('h90', SP.MENT_HEAD_090, 12 / 23, 5).cast('h45', SP.MENT_HEAD_045, 14 / 28, 5).cast('h0', SP.MENT_HEAD_000, 16 / 32, 5)
  const cx = r1(Math.min(o.w * 0.3, 32 * sc + 20))
  const cyC = r1(gy - (17 * sc) / 2)
  const cam = new Camera(act)
  let room = o.lite ? '' : roomLayer(act, 'mid', SP.MENT_ARENA_MID, gy + 1, Math.min(1.6, (o.h * 0.66) / 25), 0.26, 8)
  if (!o.lite) room += roomLayer(act, 'near', SP.MENT_ARENA_NEAR, gy + 1, Math.min(1.4, (o.h * 0.4) / 21), 0.3, 16)
  room += lampGlow(act, cx + 40 * sc, gy - 30 * sc, 90 * sc, 34 * sc, C.lamp, 0.22)
  const couch = act.still('couch', cx, cyC, 1, sc)
  // Jane: lying on the seat (head left), sitting up, rising, standing to point (the poses swap where he is; no walk).
  // The lite echo (the pane's) leaves the close-up to the band: he rises a beat longer, then points.
  const segs: [number, number, 'lie' | 'sit' | 'rise' | 'point'][] = o.lite ? [[0, 3.0, 'lie'], [3.0, 5.4, 'rise'], [5.4, 9, 'point']] : [[0, 2.6, 'lie'], [2.6, 3.6, 'sit'], [3.6, 4.3, 'rise'], [4.3, 9, 'point']]
  const seatY = r1(gy - 11 * sc)
  const pos: Record<'lie' | 'sit' | 'rise' | 'point', [number, number]> = { lie: [r1(cx - 2 * sc), r1(seatY - 4 * sc)], sit: [r1(cx + 14 * sc), r1(gy - 20 * sc)], rise: [r1(cx + 30 * sc), r1(gy - 20 * sc)], point: [r1(cx + 36 * sc), r1(gy - 23.5 * sc)] }
  let jane = ''
  for (const [a, b, k] of segs) jane += act.on(act.still(k, pos[k][0], pos[k][1], 1, sc), a, b)
  const zs = act.cue('rise', 1.0, line(0, 0, 'z', r1(9 * sc), C.sub), { x: cx - 18 * sc, y: seatY - 10 * sc, d: 1.2 }) + act.cue('rise', 1.8, line(0, 0, 'z', r1(7 * sc), C.sub), { x: cx - 14 * sc, y: seatY - 14 * sc, d: 1.2 })
  cam.push(5.6, 6.2, 1.03, pos.point[0], gy - 24 * sc, 'settle')
  const fs = r1(Math.max(11, Math.min(15, 12 * sc)))
  const said = act.on(line(pos.point[0] + 30 * sc, r1(gy - 34 * sc), 'It was the butler.', fs, C.lamp), 6.0, 8.6, { fade: 0.3 })
  // The close-up: a dark plate, the bust turning profile -> three-quarter -> face to the room, pushed in 3%.
  const bsc = r3(Math.min(1.6, (o.h - 6) / 40))
  const bx = r1(Math.min(o.w * 0.5, cx + 60 * sc))
  const by = r1(o.h / 2 + 1)
  const plate = o.lite ? "" : `<rect width="${o.w}" height="${o.h}" fill="#05080F" opacity=".96"/>${lampGlow(act, bx, by, 60 * bsc, 26 * bsc, C.lamp, 0.18)}`
  const turn = o.lite ? '' : act.on(act.still('h90', bx, by, 1, bsc), 4.3, 4.72) + act.on(act.still('h45', bx, by, 1, bsc), 4.72, 5.05) + act.on(act.still('h0', bx, by, 1, bsc), 5.05, 5.6)
  const close = o.lite ? '' : act.win(4.3, 5.6, `${plate}${act.kf(turn, [[0, 'transform:scale(1)'], [4.3, 'transform:scale(1)'], [5.6, 'transform:scale(1.03)']], { origin: `${bx}px ${by}px` })}`)
  const body = life(act, `${scrim(act, 0.96, C.ink)}${room}${cam.wrap(`${couch}${jane}`)}${zs}${said}${close}`)
  const still = `${scrimFlat(act, 0.96, C.ink)}${couch}${act.still('point', pos.point[0], pos.point[1], 1, sc)}${line(pos.point[0] + 30 * sc, r1(gy - 34 * sc), 'It was the butler.', fs, C.lamp)}`
  return { layer: act.done(body, still), act }
}

// ---------------------------------------------------------------- Red John: the Tyger title card, the walk-by
/** "Tyger Tyger" on the unlock, 4.6 s: the region goes dark, the smiley paints itself on, Blake's two lines type themselves. */
export const tygerAct = (o: { at: number; w: number; h: number; id: string }): { layer: string; act: Act } => {
  const act = new Act({ id: o.id, ms: MENT_MS.tyger, at: o.at, W: o.w, H: o.h })
  const r = r1(Math.min(15, o.h * 0.26))
  const cx = r1(14 + r)
  const cy = r1(o.h / 2)
  const x = r1(cx + r + 14)
  const fs = o.w - x < 230 ? 11 : 14
  const l1 = 'Tyger Tyger, burning bright,'
  const l2 = 'In the forests of the night;'
  const y1 = r1(cy - 3)
  const y2 = r1(cy + fs + 3)
  const body = life(act, `${scrim(act, 0.94, C.rjInk)}${paintSmiley(act, 0.3, 1.2, cx, cy, r)}${typed(act, 0.45, 1.75, x, y1, l1, fs, C.rjText)}${typed(act, 1.85, 3.05, x, y2, l2, fs, C.rjSub)}`, 0.3)
  const still = `${scrimFlat(act, 0.94, C.rjInk)}${smileyStill(cx, cy, r)}${line(x, y1, l1, fs, C.rjText)}${line(x, y2, l2, fs, C.rjSub)}`
  return { layer: act.done(body, still), act }
}

/**
 * The man in the dark coat walks the band, 6 s: in from the left (two-frame walk), stops, turns toward you (a faceless
 * silhouette in a faint red pool of light), one close-up of the shadow's smile, and he is gone on the next blink.
 */
export const walkAct = (o: { at: number; w: number; h: number; id: string; sc?: number }): { layer: string; act: Act } => {
  const act = new Act({ id: o.id, ms: MENT_MS['walk-by'], at: o.at, W: o.w, H: o.h, K: 4 })
  const sc = o.sc ?? r3(Math.min(1.15, (o.h - 6) / 47))
  const gy = o.h - 2
  const cy = r1(gy - (47 * sc) / 2)
  act.cast('wA', RJ_WALK_A, 10 / 23).cast('wB', RJ_WALK_B, 0.5).cast('st', RJ_STAND, 0.5).cast('tn', RJ_TURN, 0.5)
  const x1 = r1(Math.min(o.w * 0.55, 240))
  const segs: [number, number, string][] = []
  for (let t = 0, i = 0; t < 3.3; t += 0.24, i++) segs.push([r3(t), r3(Math.min(3.3, t + 0.24)), i % 2 ? 'wB' : 'wA'])
  segs.push([3.3, 4.1, 'st'], [4.1, 5.65, 'tn'])
  const path: [number, number, number][] = [[0, -16, cy], [3.3, x1, cy], [5.65, x1, cy]]
  const fig = act.actor('rj', segs, path, { sc })
  const pool = act.mv(`<defs><radialGradient id="${act.p}rg"><stop offset="0" stop-color="${C.red}" stop-opacity=".45"/><stop offset="1" stop-color="${C.red}" stop-opacity="0"/></radialGradient></defs><ellipse cx="0" cy="${r1(cy)}" rx="${r1(20 * sc)}" ry="${r1(30 * sc)}" fill="url(#${act.p}rg)"/>`, [[0, -16, 0], [3.3, x1, 0], [5.65, x1, 0]])
  // The one close-up: the shadow's smile in a letterbox (no eyes), 0.45 s, then back to him, then gone.
  act.cast('cut', SP.REDJ_CUTIN_SMILE, 0.5, 6)
  const lbH = r1(Math.min(o.h * 0.6, 36))
  const ksc = r3(lbH / 20)
  const ccx = r1(Math.min(x1 + 30, o.w - 40 * ksc - 4))
  const cut = act.win(4.75, 5.2, `<rect width="${o.w}" height="${o.h}" fill="#000" opacity=".95"/><ellipse cx="${ccx}" cy="${r1(o.h / 2 + 4)}" rx="${r1(46 * ksc)}" ry="${r1(lbH * 0.7)}" fill="url(#${act.p}rg)"/>${act.bank.use('cut', ccx, r1(o.h / 2), 1, ksc)}`)
  const blink = act.win(5.65, 5.72, `<rect width="${o.w}" height="${o.h}" fill="#000" opacity=".6"/>`)
  const veil = `<rect width="${o.w}" height="${o.h}" fill="${C.rjInk}" opacity=".55"/>`
  const body = `${act.on(`${veil}${pool}${fig}`, 0.01, 5.65, { fade: 0.4 })}${cut}${blink}`
  const still = `${veil}${act.still('tn', x1, cy, 1, sc)}`
  return { layer: act.done(body, still), act }
}

// ---------------------------------------------------------------- the cheers
/** The Mentalist's job-done: a card drops, flips to the ace of hearts, "Case closed." types itself, "Tea's on." No blinking. */
export const caseClosedAct = (o: { at: number; w: number; h: number; id: string }): { layer: string; act: Act } => {
  const act = new Act({ id: o.id, ms: MENT_MS.cheer, at: o.at, W: o.w, H: o.h })
  const cw = 20
  const ch = 28
  const x = r1(Math.min(60, o.w * 0.2))
  const y = r1(o.h / 2 - ch / 2)
  const drop = act.mv(flipCard(act, 0.02, 0.55, 3.3, x, y, cw, ch, 'A'), [[0, 0, -16, 0], [0.32, 0, 0, 1]], { ease: 'settle' })
  const tx = r1(x + cw + 12)
  const fs = o.w - tx < 150 ? 13 : 16
  const body = life(act, `${scrim(act, 0.82, C.ink)}${lampGlow(act, x + cw / 2, o.h / 2, 70, 26, C.lamp, 0.2)}${drop}${typed(act, 0.85, 1.45, tx, r1(o.h / 2 + 2), 'Case closed.', fs, C.cream)}${act.on(line(tx, r1(o.h / 2 + 2 + fs), "Tea's on.", r1(fs * 0.72), C.lamp), 1.6, 3.3, { fade: 0.3 })}`, 0.25)
  const still = `${scrimFlat(act, 0.82, C.ink)}${cardFace(x, y, cw, ch, 'A')}${line(tx, r1(o.h / 2 + 2), 'Case closed.', fs, C.cream)}`
  return { layer: act.done(body, still), act }
}
/** Red John's job-done: the smiley paints itself on, slowly; then "He's still watching." fades in. No blinking. */
export const rjCheerAct = (o: { at: number; w: number; h: number; id: string }): { layer: string; act: Act } => {
  const act = new Act({ id: o.id, ms: MENT_MS.rjcheer, at: o.at, W: o.w, H: o.h })
  const r = r1(Math.min(15, o.h * 0.26))
  const cx = r1(Math.min(70, o.w * 0.2))
  const cy = r1(o.h / 2)
  const tx = r1(cx + r + 14)
  const fs = o.w - tx < 190 ? 10 : 12
  const words = "HE'S STILL WATCHING."
  const body = life(act, `${scrim(act, 0.9, C.rjInk)}${paintSmiley(act, 0.15, 1.2, cx, cy, r)}${act.on(line(tx, r1(cy + fs * 0.36), words, fs, C.rjText, { italic: false, ls: 1.6, weight: 700 }), 1.45, 3.5, { fade: 0.45 })}`, 0.2)
  const still = `${scrimFlat(act, 0.9, C.rjInk)}${smileyStill(cx, cy, r)}${line(tx, r1(cy + fs * 0.36), words, fs, C.rjText, { italic: false, ls: 1.6, weight: 700 })}`
  return { layer: act.done(body, still), act }
}

// ---------------------------------------------------------------- placing an act on the band and in the pane
/** The band's act region: from the figure box to the clear span's right edge (stage/keep.ts), the task row; at most 640 wide. */
export const bandRegion = (W: number, H: number, stage?: BandStage): { x: number; y: number; w: number; h: number } => ({
  x: 8, y: 34, w: Math.round(Math.max(120, Math.min(W * 0.64, W - 300, 640, stage ? stage.x1 - 8 : W))), h: Math.max(48, Math.min(56, H - 76)),
})
const placeBand = (layer: string, p: string, r: { x: number; y: number; w: number; h: number }, stage?: BandStage): string => {
  const id = `${p}rc`
  return `<defs>${stage ? keepClip(id, [r.x, r.y, r.w, r.h], stage.keep) : `<clipPath id="${id}"><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/></clipPath>`}</defs><g clip-path="url(#${id})"><g transform="translate(${r1(r.x)} ${r1(r.y)})">${layer}</g></g>`
}
/** The COLD READ card's body (under its title row): where a pane act plays. */
export const paneRegion = (W: number, H: number): { x: number; y: number; w: number; h: number } => ({ x: 10, y: 34, w: Math.max(100, W - 20), h: Math.max(60, H - 40) })
const placePane = (layer: string, p: string, r: { x: number; y: number; w: number; h: number }): string =>
  `<g transform="translate(${r1(r.x)} ${r1(r.y)})"><defs><clipPath id="${p}rc"><rect width="${r.w}" height="${r.h}" rx="6"/></clipPath></defs><g clip-path="url(#${p}rc)">${layer}</g></g>`

/** The band's act now ('' when none): the job-done cheer while the party draws, else the act the director (or a replay) has due. */
export const mentBand = (o: { W: number; H: number; at: number; working: boolean; red: boolean; party?: boolean; partyAt?: number; stage?: BandStage }): string => {
  const r = bandRegion(o.W, o.H, o.stage)
  if (o.party) {
    const at = o.partyAt ?? o.at
    if (o.at >= at + (o.red ? MENT_MS.rjcheer : MENT_MS.cheer)) return ''
    const a = o.red ? rjCheerAct({ at, w: r.w, h: r.h, id: `rjc-band-${o.W}-${r.w}` }) : caseClosedAct({ at, w: r.w, h: r.h, id: `mcc-band-${o.W}-${r.w}` })
    return placeBand(a.layer, a.act.p, r, o.stage)
  }
  const d = mentDue(o.at, o.working, o.red)
  if (!d || o.at >= d.startAt + MENT_MS[d.kind]) return ''
  const id = `${d.kind}-band-${o.W}-${r.w}`
  const a = d.kind === 'the-read' ? readAct({ at: d.startAt, w: r.w, h: r.h, id }) : d.kind === 'parlour' ? parlourAct({ at: d.startAt, w: r.w, h: r.h, id })
    : d.kind === 'tyger' ? tygerAct({ at: d.startAt, w: r.w, h: r.h, id }) : d.kind === 'walk-by' ? walkAct({ at: d.startAt, w: r.w, h: r.h, id })
    : d.kind === 'cheer' ? caseClosedAct({ at: d.startAt, w: r.w, h: r.h, id }) : rjCheerAct({ at: d.startAt, w: r.w, h: r.h, id })
  return a ? placeBand(a.layer, a.act.p, r, o.stage) : ''
}
/** The COLD READ card's act now: THE READ or the Parlour Reveal filling its body, else '' (the tea figure draws instead). */
export const mentPane = (o: { W: number; H: number; at: number; working: boolean; red: boolean }): string => {
  if (o.red) return ''
  const d = mentDue(o.at, o.working, false)
  if (!d || o.at >= d.startAt + MENT_MS[d.kind] || (d.kind !== 'the-read' && d.kind !== 'parlour')) return ''
  const r = paneRegion(o.W, o.H)
  const id = `${d.kind}-pane-${o.W}`
  // Lite: the pane keeps a 16 k reserve (themes.ts paneReserve) and a busy Mentalist pane is near the drawing's cap.
  const a = d.kind === 'the-read' ? readAct({ at: d.startAt, w: r.w, h: r.h, id, sc: r3(Math.min(1.9, (r.h - 10) / 40)), lite: true }) : parlourAct({ at: d.startAt, w: r.w, h: r.h, id, sc: r3(Math.min(1.6, (r.h - 10) / 47)), lite: true })
  return placePane(a.layer, a.act.p, r)
}

// ---------------------------------------------------------------- the tea ritual (the figure)
const TEA_S = 3.8
// Hold 2.6 s, lift .25 s, sip .7 s, lower .25 s: the long hold keeps it a habit, not a tic.
const TEA_ROWS = ['0%{opacity:1}68.4%,100%{opacity:0}', '0%{opacity:0}68.4%{opacity:1}75%,100%{opacity:0}', '0%{opacity:0}75%{opacity:1}93.4%,100%{opacity:0}', '0%{opacity:0}93.4%,100%{opacity:1}']
/**
 * Jane at (x, foot): idle he sips his tea, working he thinks (a 1 px sway), done he smiles, failed the cup is set down.
 * `p` prefixes every class and id (one per Svg). steps(1) swaps at 3.8 s and a 4 s sway: as cheap at rest as a blink.
 */
export const janeFigure = (o: { p: string; x: number; foot: number; sc?: number; working?: boolean; party?: boolean; failed?: boolean }): string => {
  const sc = o.sc ?? 1
  const bank = new FrameBank(`${o.p}f`, 6)
  const y = r1(o.foot - (47 * sc) / 2)
  let css = ''
  let svg = ''
  if (o.party) {
    bank.add('smile', SMILE, 9 / 16)
    svg = bank.use('smile', o.x, y, 1, sc)
  } else if (o.working) {
    bank.add('think', THINK, 4 / 15)
    css = `@keyframes ${o.p}w{0%{transform:none}50%{transform:translateX(1px)}}`
    svg = `<g class="${o.p}t" style="animation:${o.p}w 4s steps(1) infinite">${bank.use('think', o.x, y, 1, sc)}</g>`
  } else if (o.failed) {
    bank.add('down', CUP_DOWN, 6 / 14)
    svg = bank.use('down', o.x, y, 1, sc)
  } else {
    TEA.forEach(([k, sp, ax]) => bank.add(k, sp, ax))
    TEA.forEach(([k], i) => {
      css += `@keyframes ${o.p}${i}{${TEA_ROWS[i]}}`
      svg += `<g class="${o.p}t" style="animation:${o.p}${i} ${TEA_S}s steps(1) infinite"${i ? ' opacity="0"' : ''}>${bank.use(k, o.x, y, 1, sc)}</g>`
    })
  }
  const rm = css ? `@media (prefers-reduced-motion: reduce){.${o.p}t{animation:none!important}}` : ''
  return `<g pointer-events="none">${css ? `<style>${css}${rm}</style>` : ''}<defs>${bank.defs()}</defs>${svg}</g>`
}
/** The band's figure slot (the task row's box at x 20-54): Jane, unless he is out in an act. */
export const bandFigure = (ctx: { at: number; working?: boolean; party?: boolean; failed?: boolean }): string =>
  janeOut(ctx.at, Boolean(ctx.working)) && !ctx.party ? '' : janeFigure({ p: 'mjb', x: 32, foot: 83, working: Boolean(ctx.working), party: Boolean(ctx.party), failed: Boolean(ctx.failed) && !ctx.working })
/** The COLD READ card's tea: Jane at the card's right edge, 1.4x, clear of the reading's lines and the eye. */
export const paneFigure = (W: number, H: number, ctx: { working?: boolean; party?: boolean; failed?: boolean }): string =>
  janeFigure({ p: 'mjp', x: W - 34, foot: H - 10, sc: 1.4, working: Boolean(ctx.working), party: Boolean(ctx.party), failed: Boolean(ctx.failed) && !ctx.working })

// ---------------------------------------------------------------- the corner: the smiley paints itself on
const CORNER_S = 16
/**
 * Past 95% context (or over a job's budget): in the band's corner the red smiley paints itself on, stroke by stroke (ring, eyes,
 * smile, a 2 px drip), holds, fades, and paints again, every 16 s. steps(6) brush dabs; reduced motion: painted, still.
 */
export const paintedCorner = (W: number, H: number): string => {
  const cx = r1(W - 16.5)
  const cy = r1(H - 15)
  const s = strokes(cx, cy, 5.5)
  const css = '.mpk{animation:16s steps(6) infinite}@keyframes mpr{0%{stroke-dashoffset:1}6%,100%{stroke-dashoffset:0}}@keyframes mpe{0%,6%{stroke-dashoffset:1}8%,100%{stroke-dashoffset:0}}@keyframes mps{0%,8%{stroke-dashoffset:1}12%,100%{stroke-dashoffset:0}}@keyframes mpd{0%,12%{stroke-dashoffset:1;opacity:1}16%{stroke-dashoffset:0;opacity:1}30%,100%{stroke-dashoffset:0;opacity:0}}@keyframes mpg{0%,84%{opacity:.8}92%,100%{opacity:0}}@media (prefers-reduced-motion: reduce){.mpk{animation:none!important}}'
  const k = (name: string): string => ` class="mpk" style="animation-name:${name}"`
  return `<g pointer-events="none"><style>${css.replace('16s', `${CORNER_S}s`)}</style><g${k('mpg')} opacity=".8">${stroke(s.ring, 1.3, C.red, k('mpr'))}${stroke(s.eyes, 1.4, C.red, k('mpe'))}${stroke(s.smile, 1.3, C.red, k('mps'))}${stroke(s.drip, 0.9, C.red, k('mpd'))}</g></g>`
}

// ---------------------------------------------------------------- the skin switch flavours
/** The Mentalist's switch: the veil lifts like a parlour curtain; a card drops into the figure box and flips to the emblem. */
export const MENT_SWITCH: SwitchFlavour = {
  dir: 'u', ms: 800, shards: 0, veil: 0.5,
  extra: (act, s) => {
    if (s !== 'band') return ''
    act.cast('em', SP.MENT_EMBLEM, 0.5, 6)
    const x = 37
    const y = Math.round(Math.min(62, act.H / 2))
    const T = act.T
    const back = act.on(cardBack(x - 15, y - 19, 30, 38), 0.02, 0.3)
    const face = act.on(act.bank.use('em', x, y, 1, 1.15), 0.3, T - 0.05)
    return act.kf(`${back}${face}`, [[0, 'transform:translate(0,-10px) scale(1,1)'], [0.16, 'transform:translate(0,0) scale(1,1)'], [0.22, 'transform:scale(1,1)'], [0.3, 'transform:scale(.06,1)'], [0.38, 'transform:scale(1,1)'], [T - 0.1, 'opacity:1;transform:scale(1,1)'], [T - 0.03, 'opacity:0;transform:scale(1,1)']], { origin: `${x}px ${y}px` })
  },
}
/** Red John's switch: a dark veil drops; the smiley paints itself on in the figure box. No shards, no bar. */
export const RJ_SWITCH: SwitchFlavour = {
  dir: 'd', ms: 900, shards: 0, bar: false, veil: 0.6,
  extra: (act, s) => (s === 'band' ? act.on(paintSmiley(act, 0.06, 0.6, 37, Math.round(Math.min(60, act.H / 2)), 13), 0, act.T - 0.05) : ''),
}
