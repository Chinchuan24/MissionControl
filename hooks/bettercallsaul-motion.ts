// Better Call Saul / GENE: the typed eggs as real band acts on the shared stage engine (hooks/stage). Each one plays inside the
// band's clear span (stage/keep.ts): a window under the header rule, left of the first readout on the right, minus the
// readouts inside it (the Tasks chip, the step count), over a scrim that dims the prose under it. Pinned (a redraw resumes),
// a still frame under reduced motion, sized to be SEEN (the old namaste was a 3 px ball for 4 s along the bottom edge).
//
//   saul3d     the bust turns all the way round: 8 views of Saul's head under a swinging spotlight, a glint, finger guns;
//              on a wide band Saul himself steps in, arms wide (BCS_SAUL)
//   namaste    a bowling ball rolls along the roof into Howard's car: hit-stop, the crack, a dust puff; Howard comes to look
//   ding       Hector rolls in and rings his bell three times: DING! DING! DING!
//   chicanery  the bar hearing, Jimmy against Chuck (bettercallsaul-court.ts): the trap, the battery, the break, the slump
//   1216       the number flip alone, as a big manila exhibit tag
import { BCS_HECTOR, BCS_HOWARD, BCS_SAUL } from './cast'
import type { Sprite } from './cast'
import { BELL, C, PROPS, S, condW, fingerGuns, grey, pal, prop, serifW, tab } from './bettercallsaul'
import { BCS_SAUL_TURN, GENE_TURN } from './bettercallsaul-sprites'
import { CHIC_MS, chicaneryBand } from './bettercallsaul-court'
import { Act, r1 } from './stage/timeline'
import type { Key, Seg } from './stage/timeline'
import * as fx from './stage/fx'
import * as light from './stage/light'
import { freeRects, keepClip, meets, spanOf } from './stage/keep'
import type { BandStage, Rect } from './stage/keep'

export type EggKind = 'saul3d' | 'namaste' | 'ding' | 'chicanery' | '1216'
/** Each act's length (ms). */
export const EGG_MS: Record<EggKind, number> = { saul3d: 4_000, namaste: 4_800, ding: 3_400, chicanery: CHIC_MS, '1216': 4_000 }
export type EggArgs = { W: number; H: number; at: number; gene: boolean; stage?: BandStage }
/** What an act drew and how big its subject is (the tests hold a minimum drawn size for every egg), and where its pieces stand
 *  (band px), for the tests that keep them off the task title and the readouts. */
export type EggOut = { svg: string; size: Record<string, number>; boxes?: Record<string, Rect> }

/** A sprite in grey for GENE (same rows). */
export const greySp = (sp: Sprite): Sprite => ({ rows: sp.rows, pal: Object.fromEntries(Object.entries(sp.pal).map(([k, v]) => [k, grey(v)])) })
const look = (sp: Sprite, gene: boolean): Sprite => (gene ? greySp(sp) : sp)
const w = (sp: Sprite): number => Math.max(...sp.rows.map(r => r.length))
/** The sprite padded to `h` rows at the top (the turn's 44-row views sit on the same foot as the 45-row ones). */
const padTo = (sp: Sprite, h: number): Sprite => (sp.rows.length >= h ? sp : { rows: [...Array.from({ length: h - sp.rows.length }, () => '.'.repeat(w(sp))), ...sp.rows], pal: sp.pal })

/** The band's floor: the strip-mall roofline (bcsFoot). */
export const floorOf = (H: number): number => H - 7.5
/** The act's window: under the header rule (y 34) to the foot, from the left edge to the clear span's end. */
export const windowOf = (W: number, H: number, stage?: BandStage): Rect => [0, 34, Math.round(Math.max(140, Math.min(W - 14, stage?.x1 ?? W * 0.55))), H - 34]
/** The band's whole clear span as an act window (stage/keep.ts `spanOf`: each row up to its own first readout) and its keep-out
 *  (the span's readouts plus each row's right part, as holes). Without a stage: `windowOf`. For an act that wants room. */
export const wideOf = (W: number, H: number, stage?: BandStage): { win: Rect; keep: BandStage | undefined } => {
  if (!stage) return { win: windowOf(W, H), keep: undefined }
  const sp = spanOf(H, stage)
  return { win: [0, sp.r.y, sp.r.x + sp.r.w, sp.r.h], keep: sp.keep }
}
/** `wideOf` with the task title (BandStage.title) as one more hole: an act that places its pieces in free runs or rectangles keeps
 *  off the title, nothing of it is drawn over the title, and its scrim never dims it. */
export const wideTitled = (W: number, H: number, stage?: BandStage): { win: Rect; keep: BandStage | undefined } => {
  const w = wideOf(W, H, stage)
  return w.keep && stage?.title ? { win: w.win, keep: { x1: w.keep.x1, keep: [...w.keep.keep, stage.title] } } : w
}
/** The widest free run of x in [a, b] for a row band [y0, y1), around the readouts inside the span. */
export const freeRun = (stage: BandStage | undefined, a: number, b: number, y0: number, y1: number): [number, number] => {
  const cuts = (stage?.keep ?? []).filter(([, y, , h]) => y < y1 && y + h > y0).map(([x, , ww]) => [x - 6, x + ww + 6] as [number, number]).sort((p, q) => p[0] - q[0])
  let best: [number, number] = [a, a]
  let x = a
  for (const [c0, c1] of cuts) {
    if (c0 > x && Math.min(c0, b) - x > best[1] - best[0]) best = [x, Math.min(c0, b)]
    x = Math.max(x, c1)
  }
  if (b - x > best[1] - best[0]) best = [x, b]
  return best
}
/** The act's frame: the keep-out clip, the scrim over the window (faded in and out), then the body and the still. */
const frame = (act: Act, win: Rect, stage: BandStage | undefined, body: string, still: string, gene: boolean, o: { scrim?: number } = {}): string => {
  const cid = `${act.p}c`
  const [x, y, ww, hh] = win
  const scrimRect = `<rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="${pal(gene).tile}" opacity="${o.scrim ?? 0.8}"/>`
  // No scrim (saul3d plays in the bust's own corner): one animated layer fewer (headless Chrome drops paint past a busy count).
  const scrim = o.scrim === 0 ? '' : act.on(scrimRect, 0, act.T - 0.05, { fade: 0.25 })
  const clip = (inner: string): string => `<g clip-path="url(#${cid})">${inner}</g>`
  return `<defs>${keepClip(cid, win, stage?.keep ?? [])}</defs>${act.done(clip(`${scrim}${body}`), clip(`${o.scrim === 0 ? '' : scrimRect}${still}`))}`
}
const shout = (x: number, y: number, text: string, size: number, fill: string, ink: string, anchor = 'middle'): string =>
  `${C(x + 1.2, y + 1.4, text, size, ink, `text-anchor="${anchor}" letter-spacing=".8"`)}${C(x, y, text, size, fill, `text-anchor="${anchor}" letter-spacing=".8"`)}`

// ---------------------------------------------------------------- saul3d: the head turns all the way round
/** The turn's beats: the dip, the 8 views (slower at front and back), the snap back to front with an overshoot. */
export const TURN = { dip: 0.3, from: 0.72, holds: [0.14, 0.2, 0.18, 0.2, 0.3, 0.2, 0.18, 0.2], snap: 2.32, out: [0.3, 0.7], back: [3.25, 3.7] } as const
/** Where GENE's glasses catch the light in his turn: view, facing, lens x from the turn axis and y from the head's top (sprite px). */
export const GENE_GLINTS: [string, 1 | -1, number, number][] = [['v1', 1, 2, 14], ['v2', 1, 8, 13], ['v2', -1, 8, 13], ['v1', -1, 2, 14]]
/** The head's place: on the bust's spot in the task row (x 14 to 60), bottom on the row's floor, full size (45 px tall). */
export const HEAD = { x: 37, foot: 82, sc: 1 } as const
/** How small the head shrinks as it vanishes from one place and pops up at the other (it never flies across the band: the task
 *  title is in the way). */
export const TURN_POP = 0.5
/**
 * Where the turn plays big: the band's whole clear span (stage/keep.ts spanOf), in the free rectangle where the head can be
 * largest (up to 2x, 90 px), its foot on that rectangle's floor; the task title is a hole too (on a narrow band the stage goes
 * under it, never over it). Without a stage: the bust's own spot at 1x.
 */
export const turnStage = (W: number, H: number, stage?: BandStage): { x: number; foot: number; sc: number; rect: Rect } => {
  const { win, keep } = wideTitled(W, H, stage)
  const holes = (keep?.keep ?? []).map(([hx, hy, hw, hh]) => [hx - win[0], hy - win[1], hw, hh] as Rect)
  let best: { x: number; foot: number; sc: number; rect: Rect } = { x: HEAD.x, foot: HEAD.foot, sc: HEAD.sc, rect: [3, 35, 60, 48] }
  if (!stage) return best
  for (const [fx, fy, fw, fh] of freeRects(win[2], win[3], holes, 6)) {
    const sc = Math.round(Math.min(2, (fh - 4) / 45, (fw - 8) / 38) * 20) / 20
    // Not the bust's own corner (the head leaves it for the stage): the rectangle must start right of it.
    if (fx + win[0] < 62 && fx + fw + win[0] < 140) continue
    // The largest head wins; on a tie, the roomier rectangle (the line fits beside the head).
    if (sc > best.sc || (sc === best.sc && fw > best.rect[2] + 20)) {
      const left = Math.max(fx + win[0], 64)
      const right = fx + win[0] + fw
      best = { x: Math.round(left + Math.min((right - left) / 2, 38 * sc * 0.5 + 40)), foot: Math.round(fy + win[1] + fh - 2), sc, rect: [left, fy + win[1], right - left, fh] }
    }
  }
  return best
}
export const saul3d = (o: EggArgs): EggOut => {
  const { W, H, at, gene, stage } = o
  const act = new Act({ id: `bcs-3d-${gene ? 'g' : 's'}-${W}`, ms: EGG_MS.saul3d, at, W, H, K: 7 })
  const turn = gene ? GENE_TURN : BCS_SAUL_TURN
  const keys = ['v0', 'v1', 'v2', 'v3', 'v4']
  const axes = gene ? [17 / 34, 15 / 32, 12 / 24, 15 / 30, 16 / 33] : [19 / 38, 19 / 37, 14 / 29, 17 / 34, 17 / 36]
  keys.forEach((k, i) => act.cast(k, padTo((turn[i] as { sp: Sprite }).sp, 45), axes[i]))
  // The head leaves the bust for the stage (scaling up as it goes), turns all the way round there under the swinging
  // spotlight, snaps back to front, then goes home to the bust.
  const st = turnStage(W, H, stage)
  const { x, foot, sc } = st
  const cy = foot - (45 * sc) / 2
  const segs: Seg[] = [[0, TURN.from, 'v0']]
  let t = TURN.from
  const order: [string, 1 | -1][] = [['v0', 1], ['v1', 1], ['v2', 1], ['v3', 1], ['v4', 1], ['v3', -1], ['v2', -1], ['v1', -1]]
  order.forEach(([k, d], i) => { const h = TURN.holds[i] as number; segs.push([+t.toFixed(3), +(t + h).toFixed(3), k, d]); t += h })
  segs.push([+t.toFixed(3), act.T, 'v0'])
  const path: Key[] = [[0, x, cy], [TURN.from - 0.1, x, cy + 1.2 * sc, 0, undefined, 0.95], [TURN.from, x, cy - 0.8 * sc, 0, undefined, 1.03], [TURN.from + 0.18, x, cy, 0, undefined, 1], [act.T, x, cy, 0, undefined, 1]]
  const head = act.actor('head', segs, path, { sc })
  // The snap back to front: an overshoot about the foot.
  const pop = act.kf(head, [[0, 'transform:none'], [TURN.snap, 'transform:none'], [TURN.snap + 0.1, 'transform:scale(1.12)'], [TURN.snap + 0.3, 'transform:scale(.97)'], [TURN.snap + 0.45, 'transform:none']], { origin: `${x}px ${foot}px` })
  // Out to the stage and home again: the head drawn on the stage, mapped onto the bust (its foot on the bust's foot, 1x) at
  // either end. It never flies across the band (the task title lies between the bust and the stage): it shrinks away where it
  // is, then pops up, growing, at the other place (the jump is made while it is invisible), a sparkle where it lands.
  const homeAt = (k: number): string => `transform:translate(${r1(HEAD.x - x)}px,${r1(HEAD.foot - foot)}px) scale(${r1((HEAD.sc / sc) * k)})`
  const home = homeAt(1)
  const [o0, o1] = TURN.out
  const [b0, b1] = TURN.back
  const gone = 'opacity:0'
  const shown = 'opacity:1'
  const travel = sc > HEAD.sc
    ? act.kf(pop, [[0, `${home};${shown}`], [o0, `${home};${shown}`], [o0 + 0.14, `${homeAt(TURN_POP)};${gone}`], [o0 + 0.15, `transform:scale(${TURN_POP});${gone}`], [o1, `transform:none;${shown}`], [b0, `transform:none;${shown}`], [b0 + 0.2, `transform:scale(${TURN_POP});${gone}`], [b0 + 0.21, `${homeAt(TURN_POP)};${gone}`], [b1, `${home};${shown}`], [act.T, `${home};${shown}`]], { origin: `${x}px ${foot}px`, ease: 'settle' })
    : pop
  const twinkle = (tx: number, ty: number, s: number): string => `<path d="M${r1(tx)} ${r1(ty - s)}L${r1(tx + s * 0.28)} ${r1(ty - s * 0.28)}L${r1(tx + s)} ${r1(ty)}L${r1(tx + s * 0.28)} ${r1(ty + s * 0.28)}L${r1(tx)} ${r1(ty + s)}L${r1(tx - s * 0.28)} ${r1(ty + s * 0.28)}L${r1(tx - s)} ${r1(ty)}L${r1(tx - s * 0.28)} ${r1(ty - s * 0.28)}z" fill="${gene ? '#FFFFFF' : PROPS.adYellow}"/>`
  const sparkles = sc > HEAD.sc ? `${act.cue('pop', o1 - 0.12, twinkle(x + 17 * sc, foot - 40 * sc, 5 * sc), { d: 0.4 })}${act.cue('pop', b1 - 0.12, twinkle(HEAD.x + 17, HEAD.foot - 40, 5), { d: 0.4 })}` : ''
  // The stage: a dark card over the free rectangle, a spotlight that swings with the turn, a lit floor under it.
  const warm = gene ? '#E8E8E8' : '#FFE7A8'
  const [rx, ry, rw0, rh] = st.rect
  // The card is as wide as what stands on it: the head (and Saul's line beside it), not the whole free rectangle.
  const lineEnd = gene ? 0 : x + 12 * sc + 8 * Math.max(1.4, 1.4 * sc) + 8 + condW("S'ALL GOOD, MAN!", sc >= 1.6 ? 17 : 14, 0.8)
  const rw = Math.min(rw0, Math.max(x + 19 * sc + 24, lineEnd <= rx + rw0 - 4 ? lineEnd + 12 : 0) - rx)
  const cardR = `<rect x="${r1(rx)}" y="${r1(ry)}" width="${r1(rw)}" height="${r1(rh)}" rx="4" fill="#0B0806" opacity=".88"/>`
  const card = act.on(cardR, 0.15, b1 + 0.05, { fade: 0.25 })
  const ray = light.godRay({ id: `${act.p}r`, x, y: ry - 4, len: foot - ry + 6, spread: Math.round(46 * sc), color: warm, op: 0.42 })
  const swing = act.kf(ray.svg, [[0, 'transform:rotate(-18deg)'], [TURN.from, 'transform:rotate(-18deg)'], [1.5, 'transform:rotate(16deg)'], [TURN.snap, 'transform:rotate(-6deg)'], [2.9, 'transform:none']], { origin: `${x}px ${ry - 4}px` })
  const floorLit = `<ellipse cx="${x}" cy="${foot - 1}" rx="${r1(22 * sc)}" ry="${r1(3.2 * sc)}" fill="${warm}" opacity=".3"/>`
  const lights = act.on(`${swing}${floorLit}`, o1 - 0.15, b0 + 0.1, { fade: 0.25 })
  // The glint across the face once it is back to front.
  const clipId = `${act.p}h`
  const glint = light.sweep({ id: `${act.p}g`, x: x - 19 * sc, y: cy - 22.5 * sc, w: 38 * sc, h: 45 * sc, clip: clipId, act, t0: TURN.snap + 0.15, t1: TURN.snap + 0.6, color: '#FFF6DA', op: 0.65 })
  const clip = `<defs>${light.clipTo(act.bank, 'v0', clipId, x, cy, 1, sc)}</defs>`
  let body = `${card}${lights}${travel}${clip}${glint.svg}${sparkles}`
  let still = `${cardR}${floorLit}${act.still('v1', x, cy, 1, sc)}`
  const size: Record<string, number> = { head: 45 * sc, bust: 45 * HEAD.sc }
  if (gene) {
    // His glasses catch the light as he turns (the ¾ and profile views, both ways), and once he is round to the front the little
    // ad for Saul shows in his lenses again (the only colour in GENE: two pixels, red and yellow).
    const spark = (gx: number, gy: number): string => `<path d="M${r1(gx)} ${r1(gy - 2.2 * sc)}l${r1(0.6 * sc)} ${r1(1.6 * sc)} ${r1(1.6 * sc)} ${r1(0.6 * sc)} ${r1(-1.6 * sc)} ${r1(0.6 * sc)} ${r1(-0.6 * sc)} ${r1(1.6 * sc)} ${r1(-0.6 * sc)} ${r1(-1.6 * sc)} ${r1(-1.6 * sc)} ${r1(-0.6 * sc)} ${r1(1.6 * sc)} ${r1(-0.6 * sc)}z" fill="#FFFFFF"/>`
    const top = cy - 22.5 * sc
    for (const [k, d, lx, ly] of GENE_GLINTS) {
      const i = order.findIndex(([kk, dd]) => kk === k && dd === d)
      const seg = segs[i + 1]
      if (seg) body += act.win(seg[0] + 0.03, seg[1] - 0.02, spark(x + lx * d * sc, top + ly * sc))
    }
    const px1 = Math.max(1, Math.round(sc))
    body += act.win(TURN.snap + 0.2, b0, `<rect x="${r1(x - 4 * sc)}" y="${r1(top + 14 * sc)}" width="${px1}" height="${px1}" fill="#D7262C"/><rect x="${r1(x + 4 * sc)}" y="${r1(top + 14 * sc)}" width="${px1}" height="${px1}" fill="#FFD23F"/>`)
    size.glints = GENE_GLINTS.length
  }
  if (!gene) {
    // Finger guns at the face once it is round, and (with room on the stage) the line slams down beside the head.
    const gs = Math.max(1.4, 1.4 * sc)
    const gx = x + 12 * sc
    const gy = cy + 4 * sc
    body += act.win(TURN.snap + 0.25, b0, fingerGuns(gx, gy, gs, false))
    still += fingerGuns(gx, gy, gs, false)
    const line = "S'ALL GOOD, MAN!"
    const fs = sc >= 1.6 ? 17 : 14
    const lx = gx + 8 * gs + 8
    if (lx + condW(line, fs, 0.8) <= rx + rw0 - 4) {
      const words = act.slam(shout(lx, cy + 2, line, fs, PROPS.adYellow, PROPS.navy, 'start'), TURN.snap + 0.4, b0)
      body += words
      size.line = fs
    }
  }
  const wt = wideTitled(W, H, stage)
  return { svg: frame(act, wt.win, wt.keep, body, still, gene, { scrim: 0 }), size, boxes: { stage: st.rect, head: [x - 19 * sc, foot - 45 * sc, 38 * sc, 45 * sc], home: [HEAD.x - 19, HEAD.foot - 45, 38, 45] } }
}

// ---------------------------------------------------------------- namaste: the bowling ball and Howard's car
/**
 * Howard's car, side on and facing right (40 by 14): a silver Jaguar saloon, long and low. A sloping roof and boot, chrome along
 * the windows, a glint in the glass, a red tail lamp and a warm head lamp, and two dark tyres with bright hubcaps, so it reads as
 * a car on the dark band (the old 16 by 8 was a grey lump with its wheels lost in the dark).
 */
export const HCAR: Sprite = {
  rows: [
    '..............hhhhhhhhhhhh..............',
    '............sswwwwwwswwwwwws............',
    '...........sswgwwwwwswgwwwwwss..........',
    '.........ssswwwwwwwwswwwwwwwwsss........',
    '..hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh.',
    '.tssssssssssssssssssssssssssssssssssssll',
    'tsseeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeessl',
    'dssssssssssssssssssssssssssssssssssssssd',
    'sssssdkkkkdsssssssssssssssssdkkkkdssssss',
    'dddddkkuukkdddddddddddddddddkkuukkdddddd',
    'bbbbdkummukbbbbbbbbbbbbbbbbbkummukdbbbbb',
    '.....kummuk.................kummuk......',
    '.....kkuukk.................kkuukk......',
    '......kkkk...................kkkk.......',
  ],
  pal: { h: '#F1F4F7', s: '#B9C3CC', e: '#D9E0E6', d: '#87929C', b: '#56606A', w: '#1C2A38', g: '#7FA0BE', k: '#2A2E34', u: '#D5DBE0', m: '#7A848D', t: '#D8392F', l: '#FFF1B8' },
}
export const NAMASTE = { roll: [0.3, 2.0], hit: 2.0, stop: 0.12 } as const
/** The slim band's step-row floor: its tip line (the bottom info line) starts at y 110 (register.tsx slimBandSvg). namaste stands
 *  on it, so nothing of the act sits on the bottom line. */
export const STEP_FLOOR = 108
/**
 * namaste on the band's clear span, standing on the step row's floor (above the tip line: the bottom line stays whole and
 * undimmed, and so does the task title, a hole): a bowling ball you cannot miss (up to 28 px) rolls out along the floor into
 * Howard's silver Jaguar parked at the far end of the floor's free run, sized to that run (56-100 px): the hit-stop, a flash, the
 * star, the crack and the dent, glass, a dust cloud; Howard (up to 1.5x, where he stands whole) walks round to look.
 */
export const namaste = (o: EggArgs): EggOut => {
  const { W, H, at, gene, stage } = o
  const act = new Act({ id: `bcs-nm-${gene ? 'g' : 's'}-${W}`, ms: EGG_MS.namaste, at, W, H })
  act.freeze(NAMASTE.hit, NAMASTE.stop) // the hit-stop: everything after the impact waits 0.12 s
  const wide = wideTitled(W, H, stage)
  const keep = wide.keep
  const F = stage ? Math.min(floorOf(H), STEP_FLOOR) : floorOf(H)
  // On the band the act's window stops at its floor: nothing is drawn on (or dims) the tip line under it.
  const win: Rect = stage ? [wide.win[0], wide.win[1], wide.win[2], Math.round(F + 2 - wide.win[1])] : wide.win
  const x1 = win[0] + win[2]
  const holes = keep?.keep ?? []
  const clear = (b: Rect): boolean => b[1] >= win[1] && b[0] >= win[0] && b[0] + b[2] <= x1 && !holes.some(h => meets(b, [h[0] - 2, h[1] - 2, h[2] + 4, h[3] + 4]))
  // The floor's free run, as tall as the biggest car (the readouts in those rows and the title are holes): the car parks at its
  // far end, sized to it.
  const [ra, rb] = freeRun(keep, 8, x1 - 4, F - 14 * 2.5 - 2, F + 1)
  const run = rb - ra
  const csc = Math.round(Math.max(1.4, Math.min(2.5, (run * 0.36) / 40)) * 20) / 20
  const cw = Math.round(40 * csc)
  const ch = 14 * csc
  // Howard stands whole beside the car: as big as he fits (1.5x down to 1x) with no hole over him; else he stays out.
  let hsc = 0
  for (let s = Math.max(1, Math.min(1.5, cw / 53)); s >= 1 - 1e-9 && run >= cw + 14 * s + 70; s -= 0.05) {
    const hx0 = rb - 7 * s - 2
    if (clear([hx0 - 7 * s, F - 47 * s, 14 * s, 47 * s])) { hsc = Math.round(s * 100) / 100; break }
  }
  const howard = hsc > 0
  const carR = rb - (howard ? 14 * hsc + 10 : 4)
  const carX = carR - cw
  act.cast('car', look(HCAR, gene), 0, 12).cast('howard', look(BCS_HOWARD, gene), 0.5)
  // The ball: deep blue with a swirl and three finger holes; it turns as it rolls (drawn at 7, scaled).
  const r = Math.max(9, Math.min(14, csc * 5.6))
  const bs = r / 7
  const ballC = gene ? '#2A2A2A' : '#1B2A5E'
  const swirl = gene ? '#5A5A5A' : '#3D5BB0'
  const ball = `<g transform="scale(${r1(bs)})"><circle r="7" fill="${ballC}" stroke="${gene ? '#BDBDBD' : '#9FC2F0'}" stroke-width=".7"/><path d="M-5 2q3 -6 9 -3" stroke="${swirl}" stroke-width="1.4" fill="none"/><circle cx="-1.6" cy="-2.8" r="1.1" fill="#05070D"/><circle cx="1.6" cy="-3" r="1.1" fill="#05070D"/><circle cx="0" cy="0.2" r="1.2" fill="#05070D"/><ellipse cx="-2.6" cy="-3.8" rx="1.6" ry=".9" fill="#FFFFFF" opacity=".35"/></g>`
  const by = F - r
  const hitX = carX - r + 3
  const roll = (x0: number, x1b: number): number => ((x1b - x0) / r) * (180 / Math.PI)
  const keys: [number, number, number, number?, string?][] = []
  const [t0, t1] = NAMASTE.roll
  // It rolls out from the run's own start (right of the step count, never behind it), fading in as it comes.
  const x0 = Math.min(ra + r, hitX - 2 * r)
  for (let i = 0; i <= 6; i++) {
    const u = i / 6
    const xx = x0 + (hitX - x0) * (0.15 * u + 0.85 * u * u) // gathers pace as it comes (a thrown ball, then the lane)
    keys.push([t0 + (t1 - t0) * u, xx, by, 1, `rotate(${Math.round(roll(x0, xx))}deg)`])
  }
  const back = Math.max(x0 + 4, hitX - 2.5 * r) // it bounces back off the car, never into the step count's hole
  keys.push([NAMASTE.hit + 0.45, back, by, 1, `rotate(${Math.round(roll(x0, hitX) - roll(back, hitX))}deg)`])
  keys.push([NAMASTE.hit + 1.0, back - 4, by, 1, `rotate(${Math.round(roll(x0, hitX) - roll(back - 4, hitX))}deg)`])
  keys.push([act.T, back - 4, by, 1, `rotate(${Math.round(roll(x0, hitX) - roll(back - 4, hitX))}deg)`])
  let body = act.mv(ball, [[0, x0, by, 0, 'rotate(0deg)'], [t0, x0, by, 0, 'rotate(0deg)'], ...keys])
  // The lot under the car: a faint kerb line along the run (the tyres stand on it), and the car's shadow.
  const kerb = `<rect x="${r1(ra)}" y="${r1(F)}" width="${r1(rb - ra)}" height="1.5" fill="${gene ? '#5A5A5A' : PROPS.manilaDark}" opacity=".35"/><ellipse cx="${r1(carX + cw / 2)}" cy="${r1(F)}" rx="${r1(cw * 0.52)}" ry="${r1(1.6 * csc)}" fill="#000000" opacity=".45"/>`
  body += act.on(kerb, 0.05, act.T - 0.05, { fade: 0.2 })
  // The car fades in parked, shakes on the hit (the hit-stop holds it at the dent); the crack and the dent stay. A slow glint runs
  // along it first.
  const car = act.still('car', carX, F - ch / 2, 1, csc)
  body += act.kf(car, [[0, 'transform:none;opacity:0'], [0.3, 'transform:none;opacity:1'], [NAMASTE.hit, 'transform:none'], [NAMASTE.hit + 0.03, 'transform:translate(3px,-2px)'], [NAMASTE.hit + 0.09, 'transform:translate(-3px,0)'], [NAMASTE.hit + 0.15, 'transform:translate(1.5px,0)'], [NAMASTE.hit + 0.21, 'transform:none']])
  const glintClip = `${act.p}cg`
  body += `<defs>${light.clipTo(act.bank, 'car', glintClip, carX, F - ch / 2, 1, csc)}</defs>`
  body += light.sweep({ id: `${act.p}gl`, x: carX, y: F - ch, w: cw, h: ch, clip: glintClip, act, t0: 0.5, t1: 1.6, color: '#FFFFFF', op: 0.55 }).svg
  // The rear window is the car's 9th to 19th column, rows 1 to 3: the ball's crack spiders across it.
  const cx = carX + 15 * csc
  const cy = F - ch + 2.2 * csc
  const k = csc / 2.2
  const crack = `<g stroke="#F4F7FA" stroke-width="${r1(Math.max(1, 0.9 * k))}" fill="none" stroke-linecap="round" transform="translate(${r1(cx)} ${r1(cy)}) scale(${r1(k)})"><path d="M0 0l-4 -2M0 0l3 -2l2 -1M0 0l5 1l2 1M0 0l-1 2M0 0l-5 2"/></g><path d="M${r1(carX + 0.5 * csc)} ${r1(F - 8.5 * csc)}q${r1(1.5 * csc)} ${r1(1.2 * csc)} ${r1(3 * csc)} 0" stroke="#2A2F35" stroke-width="${r1(0.9 * csc)}" fill="none"/>`
  body += act.on(crack, NAMASTE.hit, act.T)
  // The impact: a flash, the star, sparks of glass, a cloud of dust off the lot.
  body += fx.flash(act, NAMASTE.hit, { a: 0.22 })
  body += fx.star3(act, NAMASTE.hit, carX + 1, by - 2, Math.round(10 + r), { core: '#FFFFFF', star: gene ? '#E0E0E0' : PROPS.adYellow, ring: '#FFFFFF', ink: gene ? '#333' : PROPS.navy })
  body += fx.sparks(act, NAMASTE.hit + 0.02, carX + 2, by - 4, { n: 10, seed: 'bcs-nm-glass', color: '#DDEBF5', len: Math.round(6 + r * 0.4) })
  body += fx.puff(act, NAMASTE.hit + 0.05, carX - 4, F - 4, { s: r1(0.6 + r / 20), fill: gene ? '#9A9A9A' : '#CBB89A' })
  body += fx.dust(act, NAMASTE.hit + 0.08, carX - 10, F - 2, { n: 6, seed: 'bcs-nm-dust', color: gene ? '#8A8A8A' : '#B9A688', dx: -12 })
  // Howard comes round the car to look (he faces it), with a "?!" where it stands whole: over his head, else beside it.
  let still = `${kerb}${car}${crack}<g transform="translate(${r1(back - 4)} ${r1(by)})">${ball}</g>`
  const boxes: Record<string, Rect> = { car: [carX, F - ch, cw, ch], ball: [x0 - r, F - 2 * r, hitX - x0 + 2 * r, 2 * r] }
  if (howard) {
    const hx = rb - 7 * hsc - 2
    const hy = F - (47 * hsc) / 2 - 0.5
    const top = F - 47 * hsc
    body += act.actor('howard', [[NAMASTE.hit + 0.5, act.T, 'howard', -1]], [[NAMASTE.hit + 0.5, x1 + 20, hy], [NAMASTE.hit + 1.05, hx, hy], [act.T, hx, hy]], { sc: hsc })
    const qs = Math.round(15 * hsc)
    const qw = qs * 1.05
    const spots: [number, number][] = [[hx, top - 3], [hx - 7 * hsc - 4 - qw / 2, top + qs], [hx + 7 * hsc + 4 + qw / 2, top + qs]]
    const q = spots.find(([qx, qy]) => clear([qx - qw / 2, qy - qs * 0.8, qw, qs]) && qy <= F - ch - 2)
    if (q) {
      body += act.cue('pop', NAMASTE.hit + 1.15, C(q[0], q[1], '?!', qs, gene ? '#F2F2F2' : PROPS.adYellow, 'text-anchor="middle"'), { d: 1.5 })
      boxes.q = [q[0] - qw / 2, q[1] - qs * 0.8, qw, qs]
    }
    still += act.still('howard', hx, hy, -1, hsc)
    boxes.howard = [hx - 7 * hsc, top, 14 * hsc, 47 * hsc]
  }
  // The title: S5E4's name (Howard's plate), stamped on a manila tab in the task row over the car's roof (the car stands lower),
  // where the row has room (20 px where it fits, else 15): left of Howard and his "?!", never over the title (a hole).
  const stampEnd = Math.min(x1 - 4, ...(boxes.howard ? [boxes.howard[0] - 8] : []), ...(boxes.q ? [boxes.q[0] - 8] : []))
  for (const fs of [20, 15]) {
    const tw = condW('NAMASTE.', fs, 1) + 22
    const th = fs + 6
    const [a, b] = freeRun(keep, 12, stampEnd, 38, 40 + th)
    if (b - a < tw + 6 || 40 + th > F - ch - 2) continue
    const sx = a + (b - a - tw) / 2
    const st = `${tab(sx, 40, tw, th, prop('manila', gene))}${C(sx + tw / 2, 40 + th * 0.78, 'NAMASTE.', fs, prop('creamInk', gene), 'text-anchor="middle" letter-spacing="1"')}`
    body += act.slam(st, NAMASTE.hit + 0.7, act.T - 0.2)
    still += st
    boxes.stamp = [sx, 40, tw, th]
    break
  }
  return { svg: frame(act, win, keep, body, still, gene, { scrim: 0.7 }), size: { ball: 2 * r, car: cw, howard: howard ? Math.round(47 * hsc) : 0 }, boxes }
}

// ---------------------------------------------------------------- ding: Hector rings his bell three times
export const DINGS = [0.85, 1.6, 2.35] as const
/** ding on the band's whole clear span: Hector (up to 1.75x, ~66 px) rolls in to a table at the far end of the floor's free run
 *  and rings a bell you can see (up to 4.2x, 38 px); each DING! (20-26 px) keeps off the readouts' holes. */
export const ding = (o: EggArgs): EggOut => {
  const { W, H, at, gene, stage } = o
  const act = new Act({ id: `bcs-dg-${gene ? 'g' : 's'}-${W}`, ms: EGG_MS.ding, at, W, H })
  const { win, keep } = wideOf(W, H, stage)
  const x1 = win[0] + win[2]
  const F = floorOf(H)
  const [ra, rb] = freeRun(keep, 8, x1 - 4, F - 70, F + 1)
  const big = rb - ra >= 120
  act.cast('hector', look(BCS_HECTOR, gene), 0.5)
  const hs = big ? 1.75 : 1.3
  const hw = w(BCS_HECTOR) * hs
  const hh = BCS_HECTOR.rows.length * hs
  const bs = big ? 4.2 : 3.4
  // Hector and his bell on a little table, at the far end of the floor's free run.
  const tw = Math.round(9 * bs + 4)
  const tx = rb - tw / 2 - 4
  const hx = tx - tw / 2 - hw / 2 - 6
  const hy = F - hh / 2
  let body = act.actor('hector', [[0, act.T, 'hector']], [[0, x1 + hw, hy], [0.55, hx, hy], [0.7, hx + 1, hy], [act.T, hx, hy]], { sc: hs })
  const top = F - 15
  const table = `<rect x="${r1(tx - tw / 2)}" y="${r1(top)}" width="${tw}" height="5" fill="${prop('woodLight', gene)}"/><rect x="${r1(tx - tw / 2 + 3)}" y="${r1(top + 5)}" width="3" height="10" fill="${prop('woodDark', gene)}"/><rect x="${r1(tx + tw / 2 - 6)}" y="${r1(top + 5)}" width="3" height="10" fill="${prop('woodDark', gene)}"/>`
  const bellTop = top - 7 * bs
  const bellSvg = `<g transform="translate(${r1(tx - 4.5 * bs)} ${r1(bellTop)}) scale(${bs})" shape-rendering="crispEdges">${Object.entries(BELL.pal).map(([k, c]) => `<path fill="${gene ? grey(c) : c}" d="${BELL.rows.map((row, ry) => [...row].map((ch, rx) => (ch === k ? `M${rx} ${ry}h1v1h-1z` : '')).join('')).join('')}"/>`).join('')}</g>`
  const rows: [number, string][] = [[0, 'transform:none']]
  for (const d of DINGS) rows.push([d, 'transform:none'], [d + 0.05, 'transform:rotate(-12deg)'], [d + 0.12, 'transform:rotate(9deg)'], [d + 0.2, 'transform:rotate(-4deg)'], [d + 0.28, 'transform:none'])
  body += table + act.kf(bellSvg, rows, { origin: `${r1(tx)}px ${r1(top)}px` })
  const gold = prop('bell', gene)
  const q = bs / 3
  const arcs = `<g fill="none" stroke="${gold}" stroke-width="${r1(1.6 * q)}" stroke-linecap="round" transform="scale(${r1(q)})"><path d="M-17 -2q-5 6 0 12"/><path d="M17 -2q5 6 0 12"/><path d="M-23 -6q-7 10 0 20" opacity=".6"/><path d="M23 -6q7 10 0 20" opacity=".6"/></g>`
  // Each DING! above the bell, nudged left until it is clear of every readout's hole (never cut by one).
  const holes = keep?.keep ?? []
  const word = (i: number): string => {
    const fs = (big ? 20 : 16) + i * 3
    const ww = condW('DING!', fs, 0.8) + 4
    let x = tx + [-24, 6, -10][i]!
    const y = bellTop - 6 - i * 7
    while (x - ww / 2 > win[0] + 4 && holes.some(h => meets([x - ww / 2, y - fs * 0.85, ww, fs], [h[0] - 2, h[1] - 2, h[2] + 4, h[3] + 4]))) x -= 6
    return shout(x, y, 'DING!', fs, gene ? '#F2F2F2' : PROPS.adYellow, gene ? '#333333' : PROPS.navy)
  }
  DINGS.forEach((d, i) => {
    body += act.cue('burst', d + 0.04, arcs, { x: tx, y: bellTop + 3.5 * bs, d: 0.45 })
    body += act.cue('pop', d + 0.04, word(i), { d: 0.9 })
  })
  // The third ding stays up to the end.
  body += act.on(word(2), DINGS[2] + 0.5, act.T - 0.1)
  const still = `${act.still('hector', hx, hy, 1, hs)}${table}${bellSvg}${word(2)}`
  return { svg: frame(act, win, keep, body, still, gene), size: { bell: 9 * bs, hector: hh, word: big ? 20 : 16 } }
}

// ---------------------------------------------------------------- chicanery / 1216: Chuck at the stand, the number flip
/** 1216 <-> 1261 on a manila exhibit tag, flipping (scaleX through 0) every `every` s from `t0`. */
const flipTag = (act: Act, x: number, y: number, size: number, t0: number, t1: number, every: number, gene: boolean): { svg: string; still: string; w: number } => {
  const P = pal(gene)
  const tw = serifW('1216', size, 1, true) + 22
  const th = size + 12
  const plate = `<rect x="${r1(x - tw / 2)}" y="${r1(y - th / 2)}" width="${r1(tw)}" height="${th}" rx="2" fill="${prop('manila', gene)}"/><rect x="${r1(x - tw / 2 + 2)}" y="${r1(y - th / 2 + 2)}" width="${r1(tw - 4)}" height="${th - 4}" rx="1.5" fill="none" stroke="${prop('manilaDark', gene)}"/>`
  const num = (n: string, fill: string): string => S(x, y + size * 0.36, n, size, 700, fill, 'text-anchor="middle" letter-spacing="1"')
  const ink = gene ? '#1A1A1A' : prop('creamInk', gene)
  const red = gene ? '#555555' : PROPS.adRed
  let a = ''
  let b = ''
  const flips: number[] = []
  for (let t = t0 + every; t < t1 - 0.2; t += every) flips.push(t)
  // Numbers by window: 1216 first, then 1261 in red ("one after Magna Carta" is Chuck's; the joke is the swap).
  let cur = t0
  flips.forEach((f, i) => { (i % 2 ? (b += act.win(cur, f, num('1261', red))) : (a += act.win(cur, f, num('1216', ink)))); cur = f })
  if (flips.length % 2) b += act.win(cur, t1, num('1261', red))
  else a += act.win(cur, t1, num('1216', ink))
  const rows: [number, string][] = [[0, 'transform:none']]
  for (const f of flips) rows.push([f - 0.07, 'transform:none'], [f, 'transform:scaleX(.05)'], [f + 0.07, 'transform:none'])
  const svg = act.kf(`${plate}${a}${b}`, rows, { origin: `${r1(x)}px ${r1(y)}px` })
  void P
  return { svg: act.on(svg, t0, t1, { fade: 0.15 }), still: `${plate}${num('1216', ink)}`, w: tw }
}
/** 1216: the number flip alone, as a big manila exhibit tag in the step row (the bar hearing is bettercallsaul-court.ts). */
export const rant = (o: EggArgs & { kind: '1216' }): EggOut => {
  const { W, H, at, gene, stage, kind } = o
  const act = new Act({ id: `bcs-ch-${kind}-${gene ? 'g' : 's'}-${W}`, ms: EGG_MS[kind], at, W, H })
  const { win, keep } = wideOf(W, H, stage)
  const x1 = win[0] + win[2]
  const F = floorOf(H)
  // As big as the step row and the tip line allow (34 px where there is room, never under 24), between their readouts.
  const [a, b] = freeRun(keep, 12, x1 - 8, 78, 128)
  const size = Math.max(24, Math.min(34, Math.floor((b - a - 30) / 2.6)))
  const tag = flipTag(act, (a + b) / 2, F - size / 2 - 9, size, 0.2, act.T - 0.2, 0.75, gene)
  return { svg: frame(act, win, keep, tag.svg, tag.still, gene), size: { number: size, tag: tag.w } }
}

/** The act for a typed egg at `at` (empty for a kind with no band act). */
export const eggAct = (kind: string, o: EggArgs): string => {
  if (kind === 'saul3d') return saul3d(o).svg
  if (kind === 'namaste') return namaste(o).svg
  if (kind === 'ding') return ding(o).svg
  if (kind === 'chicanery') return chicaneryBand(o).svg
  if (kind === '1216') return rant({ ...o, kind }).svg
  return ''
}
