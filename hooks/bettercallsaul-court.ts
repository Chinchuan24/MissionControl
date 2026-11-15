// CHICANERY, the bar hearing (S3E5): Jimmy against his elder brother Chuck. A stand-off of WORDS, written as stand-off beats
// on the shared fight choreographer (stage/choreo.ts): the room, the trap, the battery, the break, the gavel, the silence, the
// title card. 9 s. PG-13: nobody touches anybody. Every line is short and paraphrased (the outburst is the one quote the skin
// already uses as a toast). GENE plays it in black and white (the GENE_CT_* recolours, everything else through `grey()`).
//
//   band   inside the band's clear span (stage/keep.ts), over a scrim, the readouts in holes. A span of 380 px or more (a band
//          of 900 px and up) seats both brothers with the judge's bench and the hearing-room rail between them; a narrower
//          span keeps the same beats on Chuck's side alone (the witness stand, the battery, the break, the slump).
//          One close-up a band act (Chuck's, on the break): the byte budget allows one.
//   pane   the LEGAL PAD card: under its title row, between the margin (each line's time) and the date column, the camera
//          pushed in at twice the size, both close-ups and the hearing room's two layers drifting behind.
import type { Sprite } from './cast'
import { COND, FONT, PROPS, SERIF, condW, esc, grey, prop, serifW, tab } from './bettercallsaul'
import {
  BCS_ARENA_MID, BCS_ARENA_NEAR, BCS_CT_CHUCK_COMPOSED, BCS_CT_CHUCK_OUTBURST, BCS_CT_CHUCK_SLUMP, BCS_CT_JIMMY_PHONE, BCS_CT_JIMMY_POINT,
  BCS_CT_JIMMY_STILL, BCS_CUTIN_CHUCK, BCS_CUTIN_JIMMY, BCS_GAVEL_DOWN, BCS_GAVEL_UP, BCS_JUDGE_BENCH, BCS_WITNESS_STAND,
  GENE_CT_CHUCK_COMPOSED, GENE_CT_CHUCK_OUTBURST, GENE_CT_CHUCK_SLUMP, GENE_CT_JIMMY_PHONE, GENE_CT_JIMMY_POINT, GENE_CT_JIMMY_STILL,
} from './bettercallsaul-sprites'
import { Act, r1 } from './stage/timeline'
import { Camera } from './stage/camera'
import { Fight } from './stage/choreo'
import { rectPaths } from './stage/frames'
import { parallax } from './stage/parallax'
import { keepClip } from './stage/keep'
import type { BandStage, Rect } from './stage/keep'

export const CHIC_MS = 9_000
/** The beats (act seconds): what the tests and the previews read. */
export const CHIC = { gavel: 0.55, stare: 1.0, trap: 1.7, cutJ: 2.05, battery: 2.9, press: 3.5, deny: 4.45, brk: 5.0, bangs: [5.95, 6.25], slump: 6.6, drain: 6.7, title: 7.6 } as const
/** The lines (each well under 15 words, paraphrased). */
export const CHIC_LINES = { trap: 'Check your coat pocket, Chuck.', press: 'A battery. All this time.', deny: 'That proves nothing!', brk: 'I AM NOT CRAZY!', title: 'S3E5 · CHICANERY' } as const
/** The brothers' size on the band (59 px tall). */
export const BAND_SC = 1.25
/** Spans narrower than this keep Chuck's side only. */
export const WIDE_SPAN = 380

const greySp = (sp: Sprite): Sprite => ({ rows: sp.rows, pal: Object.fromEntries(Object.entries(sp.pal).map(([k, v]) => [k, grey(v)])) })
const look = (sp: Sprite, gene: boolean): Sprite => (gene ? greySp(sp) : sp)
const wOf = (sp: Sprite): number => Math.max(...sp.rows.map(r => r.length))
/** Padded at the top to `h` rows, so every pose of a brother stands on the same foot. */
const padTo = (sp: Sprite, h: number): Sprite => (sp.rows.length >= h ? sp : { rows: [...Array.from({ length: h - sp.rows.length }, () => '.'.repeat(wOf(sp))), ...sp.rows], pal: sp.pal })

/** The widest free run of x in [a, b] for the rows [y0, y1), around the readouts (the same rule as the other eggs). */
const freeRun = (keep: Rect[], a: number, b: number, y0: number, y1: number): [number, number] => {
  const cuts = keep.filter(([, y, , h]) => y < y1 && y + h > y0).map(([x, , ww]) => [x - 6, x + ww + 6] as [number, number]).sort((p, q) => p[0] - q[0])
  let best: [number, number] = [a, a]
  let x = a
  for (const [c0, c1] of cuts) {
    if (c0 > x && Math.min(c0, b) - x > best[1] - best[0]) best = [x, Math.min(c0, b)]
    x = Math.max(x, c1)
  }
  if (b - x > best[1] - best[0]) best = [x, b]
  return best
}

/** Every free run of x in [a, b] for the rows [y0, y1) (the readouts' holes cut out, 6 px margin). */
const freeRuns = (keep: Rect[], a: number, b: number, y0: number, y1: number): [number, number][] => {
  const cuts = keep.filter(([, y, , h]) => y < y1 && y + h > y0).map(([x, , ww]) => [x - 6, x + ww + 6] as [number, number]).sort((p, q) => p[0] - q[0])
  const out: [number, number][] = []
  let x = a
  for (const [c0, c1] of cuts) { if (Math.min(c0, b) > x) out.push([x, Math.min(c0, b)]); x = Math.max(x, c1) }
  if (b > x) out.push([x, b])
  return out
}
/** The spot for a box `w` wide nearest `want` (its left x) on one of `rows` (top y, height `h`), never over a hole: [x, y]. A
 *  lower row costs 40 px of distance (the first row is preferred). Falls back to the first row's widest run. */
const spot = (keep: Rect[], a: number, b: number, w: number, h: number, want: number, rows: number[]): [number, number] => {
  let best: [number, number, number] | undefined
  rows.forEach((y, i) => {
    for (const [ra, rb] of freeRuns(keep, a, b, y, y + h)) {
      if (rb - ra < w) continue
      const x = Math.max(ra, Math.min(want, rb - w))
      const d = Math.abs(x - want) + i * 40
      if (!best || d < best[2]) best = [x, y, d]
    }
  })
  if (best) return [best[0], best[1]]
  const [ra] = freeRun(keep, a, b, rows[0] as number, (rows[0] as number) + h)
  return [ra, rows[0] as number]
}
/** Where the act plays and how big: the clip window, its holes, the floor, the sprite scale. */
type Room = { surface: 'band' | 'pane'; W: number; H: number; win: Rect; keep: Rect[]; F: number; sc: number; wide: boolean }
export type CourtOut = { svg: string; size: Record<string, number>; beats: [string, number][] }

/** Text in the ad's condensed face (or Georgia), its font set once by the act's class `<p>t` / `<p>u` (a few chars a line). */
const Tc = (act: Act, x: number, y: number, text: string, size: number, fill: string, extra = ''): string => `<text class="${act.p}t" x="${r1(x)}" y="${r1(y)}" font-size="${size}" fill="${fill}" ${extra}>${esc(text)}</text>`
const Ts = (act: Act, x: number, y: number, text: string, size: number, fill: string, extra = ''): string => `<text class="${act.p}u" x="${r1(x)}" y="${r1(y)}" font-size="${size}" fill="${fill}" ${extra}>${esc(text)}</text>`
/** A speech bubble (escaped) with its tail toward `tx`, from t0 to t1. */
const bubble = (act: Act, t0: number, t1: number, text: string, x: number, y: number, size: number, tx: number, gene: boolean): { svg: string; w: number } => {
  const w = Math.round(condW(text, size, 0.3) + 16)
  const h = Math.round(size + 9)
  const tail = tx < x + w / 2 ? `M${r1(x + 12)} ${r1(y + h - 1)}l-6 7l12 -7z` : `M${r1(x + w - 18)} ${r1(y + h - 1)}l12 7l-6 -7z`
  const ink = gene ? '#111111' : PROPS.navy
  const svg = `<rect x="${r1(x)}" y="${r1(y)}" width="${w}" height="${h}" rx="4" fill="${gene ? '#EDEDED' : PROPS.cream}" stroke="${ink}" stroke-width="1.3"/><path d="${tail}" fill="${gene ? '#EDEDED' : PROPS.cream}" stroke="${ink}" stroke-width="1.3" stroke-linejoin="round"/>${Tc(act, x + w / 2, y + h - 5, text, size, ink, 'text-anchor="middle" letter-spacing=".3"')}`
  return { svg: act.win(t0, t1, svg), w }
}

/** The battery Jimmy slipped into Chuck's pocket: a small cell with a copper cap. */
const BATTERY = (gene: boolean, s: number): string => `<g transform="scale(${s})"><rect x="-4" y="-2.2" width="8" height="4.4" rx=".8" fill="${gene ? '#3A3A3A' : '#1E1E1E'}" stroke="${gene ? '#DADADA' : '#E8C26A'}" stroke-width=".6"/><rect x="4" y="-1.1" width="1.4" height="2.2" fill="${gene ? '#BDBDBD' : '#C98A3A'}"/><rect x="-4" y="-2.2" width="3" height="4.4" fill="${gene ? '#8A8A8A' : '#C98A3A'}"/></g>`

/** A close-up strip slammed in letterboxed (0.5 s): the strip pops from flat to full height and back. */
const cutIn = (act: Act, key: string, t0: number, t1: number, cx: number, cy: number, s: number, gene: boolean): string => {
  const p = act.bank.pose(key)
  const w = p.w * s
  const h = p.h * s
  const ink = gene ? '#000000' : '#0B0806'
  const edge = gene ? '#F2F2F2' : PROPS.adYellow
  const strip = `<rect x="${r1(cx - w / 2 - 6)}" y="${r1(cy - h / 2 - 4)}" width="${r1(w + 12)}" height="${r1(h + 8)}" fill="${ink}"/>${act.still(key, cx, cy, 1, s)}<rect x="${r1(cx - w / 2 - 1)}" y="${r1(cy - h / 2 - 1)}" width="${r1(w + 2)}" height="${r1(h + 2)}" fill="none" stroke="${edge}" stroke-width="1.5"/>`
  return act.kf(strip, [[0, 'opacity:0'], [t0, 'opacity:0;transform:scale(1.25,0)'], [t0 + 0.07, 'opacity:1;transform:scale(1.04,1.08)'], [t0 + 0.14, 'opacity:1;transform:none'], [t1 - 0.06, 'opacity:1;transform:none'], [t1, 'opacity:0;transform:scale(1,0)']], { origin: `${r1(cx)}px ${r1(cy)}px` })
}

const build = (o: { at: number; gene: boolean; id: string; room: Room }): CourtOut => {
  const { at, gene, room } = o
  const { W, H, win, keep, F, sc, wide, surface } = room
  const pane = surface === 'pane'
  const act = new Act({ id: o.id, ms: CHIC_MS, at, W, H, K: 5, dp: 2 })
  act.extraCss.add(`.${act.p}t{font-family:${COND};font-weight:800}.${act.p}u{font-family:${SERIF};font-weight:700}`)
  const P = gene ? { tile: '#121212' } : { tile: '#1A1410' }
  const J = gene ? [GENE_CT_JIMMY_STILL, GENE_CT_JIMMY_PHONE, GENE_CT_JIMMY_POINT] : [BCS_CT_JIMMY_STILL, BCS_CT_JIMMY_PHONE, BCS_CT_JIMMY_POINT]
  const K = gene ? [GENE_CT_CHUCK_COMPOSED, GENE_CT_CHUCK_OUTBURST, GENE_CT_CHUCK_SLUMP] : [BCS_CT_CHUCK_COMPOSED, BCS_CT_CHUCK_OUTBURST, BCS_CT_CHUCK_SLUMP]
  // Anchors are the foot pivots (manifest): x / width.
  act.cast('cC', padTo(K[0] as Sprite, 47), 6 / 12).cast('cO', padTo(K[1] as Sprite, 47), 13 / 29).cast('cS', padTo(K[2] as Sprite, 47), 13 / 21)
  act.cast('stand', look(BCS_WITNESS_STAND, gene), 14 / 30).cast('gU', look(BCS_GAVEL_UP, gene), 6 / 14).cast('gD', look(BCS_GAVEL_DOWN, gene), 6 / 14)
  if (!pane) act.cast('cutC', look(BCS_CUTIN_CHUCK, gene), 0.5, gene ? 3 : 4)
  if (wide) act.cast('jP', padTo(J[1] as Sprite, 47), 10 / 22).cast('jT', padTo(J[2] as Sprite, 47), 10 / 30).cast('bench', look(BCS_JUDGE_BENCH, gene), 0.5)
  if (pane) act.cast('cutJ', look(BCS_CUTIN_JIMMY, gene), 0.5)
  const [wx, wy, ww] = win
  const x1 = wx + ww
  // The set: Chuck at the witness stand on the right; Jimmy at the left; the bench back-centre.
  const a = wide ? Math.max(wx + (pane ? 70 : 96), x1 - (pane ? 700 : 440)) : wx
  const cx = x1 - 44 * sc
  const jx = a + 34 * sc
  const bx = wide ? r1((jx + cx) / 2) : cx
  const cyF = F - (4 * sc) - (47 * sc) / 2 // Chuck stands behind the stand (his feet 4 px up)
  const cyJ = F - (47 * sc) / 2
  const cam = new Camera(act)
  const ink = gene ? '#111111' : '#1A1410'
  const f = new Fight(act, { sc, ink, font: FONT, star: { core: '#FFFFFF', star: gene ? '#E0E0E0' : PROPS.adYellow, ring: '#FFFFFF' }, spark: gene ? '#F2F2F2' : '#FFE7A8', word: gene ? '#F2F2F2' : PROPS.adYellow, ghosts: false }, cam)
  f.fighter('c', 'cC', cx, cyF, -1)
  if (wide) f.fighter('j', 'jT', jx, cyJ, 1)
  // --- the room: the scrim (outside the camera), the hearing room behind, the bench and the stand.
  let back = ''
  const lay: { tile: string; w: number; speed: number; y: number; op: number }[] = []
  const tile = (sp: Sprite, s: number): string => `<g transform="scale(${s})" shape-rendering="crispEdges">${rectPaths(look(sp, gene), 4)}</g>`
  if (wide) {
    if (pane) lay.push({ tile: tile(BCS_ARENA_MID, sc), w: 160 * sc, speed: 3, y: F - 20 * sc, op: 0.55 })
    lay.push({ tile: tile(BCS_ARENA_NEAR, sc), w: 160 * sc, speed: 6, y: F - 8 * sc, op: 0.8 })
    const px = parallax({ id: `${act.p}x`, W: x1, H, fps: 8, layers: lay.map(l => ({ tile: l.tile, w: l.w, speed: l.speed, y: l.y, op: l.op })) })
    act.extraCss.add(px.css)
    back += act.on(px.svg, 0.1, act.T - 0.15, { fade: 0.35 })
    const glow = `<radialGradient id="${act.p}gl"><stop offset="0" stop-color="${gene ? '#BDBDBD' : '#E0A050'}" stop-opacity=".3"/><stop offset="1" stop-color="${gene ? '#BDBDBD' : '#E0A050'}" stop-opacity="0"/></radialGradient><ellipse cx="${r1(bx)}" cy="${r1(F - 34 * sc)}" rx="${r1(120 * sc)}" ry="${r1(44 * sc)}" fill="url(#${act.p}gl)"/>`
    back += act.on(`${glow}${act.still('bench', bx, F - 18 * sc, 1, sc)}`, 0.05, act.T - 0.15, { fade: 0.3 })
  }
  // The gavel on the bench (or on the stand's rail when narrow): up, then down on every bang.
  const gx = wide ? bx + 18 * sc : cx - 26 * sc
  const gy = wide ? F - 36 * sc - 5 * sc : F - 22 * sc - 5 * sc
  const bangs = [CHIC.gavel, ...CHIC.bangs]
  const gsegs: [number, number, string][] = [[0, bangs[0] as number - 0.16, 'gD']]
  bangs.forEach((b, i) => { gsegs.push([b - 0.16, b, 'gU'], [b, i + 1 < bangs.length ? (bangs[i + 1] as number) - 0.16 : act.T, 'gD']) })
  back += act.actor('gavel', gsegs, [[0, gx, gy], [act.T, gx, gy]], { sc })
  const arcs = `<g fill="none" stroke="${gene ? '#E6E6E6' : PROPS.bell}" stroke-width="${r1(1.2 * sc)}" stroke-linecap="round"><path d="M${-8 * sc} ${-2 * sc}q${-3 * sc} ${4 * sc} 0 ${8 * sc}"/><path d="M${8 * sc} ${-2 * sc}q${3 * sc} ${4 * sc} 0 ${8 * sc}"/></g>`
  for (const b of bangs) { back += act.cue('burst', b, arcs, { x: gx - 3 * sc, y: gy + 4 * sc, d: 0.35 }); cam.shake(b, b === CHIC.gavel ? 2 : 1, 0.18) }
  // --- the beats
  // Speech rides a row above the heads (the band: 42, else 64 beside the body), never over a readout's hole. On a narrow band
  // Jimmy is off the panel: his lines come in from the left edge.
  const say = (who: 'j' | 'c', t0: number, t1: number, text: string): string => {
    const size = pane ? 15 : 11
    const w = condW(text, size, 0.3) + 16
    const from = who === 'j' ? (wide ? jx - 8 * sc : wx + 4) : cx - w - 10 * sc
    const [x, y] = spot(keep, wx + 4, x1 - 4, w, size + 16, from, pane ? [wy + 34] : [42, 64])
    return bubble(act, t0, t1, text, x, y, size, who === 'j' ? (wide ? jx : wx - 40) : cx, gene).svg
  }
  let lines = ''
  f.at(CHIC.stare)
  if (wide && pane) f.stare('j', 'c', 0.6, { push: 0.05 })
  // The trap: Jimmy holds up his phone and steps in; his close-up on the pane.
  f.at(CHIC.trap)
  if (wide) f.step('j', 8, 0.3, { pose: 'jP' })
  lines += say('j', CHIC.trap, CHIC.trap + 1.1, CHIC_LINES.trap)
  // Jimmy's close-up on the pane: over the bench's side, clear of his own bubble on the left.
  if (pane && wide) lines += cutIn(act, 'cutJ', CHIC.cutJ, CHIC.cutJ + 0.55, Math.min(x1 - 52 * sc * 1.3, (bx + cx) / 2), wy + 40, sc * 1.3, gene)
  // The battery: out of Chuck's coat pocket with a glint, onto the stand's rail. Chuck flinches.
  const bxp = cx - 3 * sc
  const byp = cyF + 2 * sc
  lines += act.mv(BATTERY(gene, sc * 1.3), [[0, bxp, byp, 0], [CHIC.battery, bxp, byp, 0], [CHIC.battery + 0.02, bxp, byp, 1], [CHIC.battery + 0.3, bxp - 7 * sc, byp - 12 * sc, 1], [CHIC.battery + 0.62, bxp - 13 * sc, F - 22 * sc - 2.5 * sc, 1], [act.T - 0.15, bxp - 13 * sc, F - 22 * sc - 2.5 * sc, 1], [act.T - 0.1, bxp - 13 * sc, F - 22 * sc - 2.5 * sc, 0]])
  // One glint as it comes out (a four-point star that bursts).
  const g4 = 6 * sc
  lines += act.cue('burst', CHIC.battery + 0.3, `<path d="M0 ${-g4}L${r1(g4 * 0.22)} ${r1(-g4 * 0.22)}L${g4} 0L${r1(g4 * 0.22)} ${r1(g4 * 0.22)}L0 ${g4}L${r1(-g4 * 0.22)} ${r1(g4 * 0.22)}L${-g4} 0L${r1(-g4 * 0.22)} ${r1(-g4 * 0.22)}z" fill="${gene ? '#F2F2F2' : '#FFF2A8'}"/>`, { x: bxp - 7 * sc, y: byp - 12 * sc, d: 0.4 })
  f.at(CHIC.battery + 0.05).flinch('c', { px: 2 })
  // Pressing: Jimmy points; Chuck denies it.
  f.at(CHIC.press)
  if (wide) f.pose('j', 'jT')
  lines += say('j', CHIC.press, CHIC.press + 0.85, CHIC_LINES.press)
  lines += say('c', CHIC.deny, CHIC.deny + 0.5, CHIC_LINES.deny)
  // The break: Chuck rises, the camera pushes in on him, his close-up, the stamp, one 3 px shake.
  f.at(CHIC.brk).pose('c', 'cO')
  cam.push(CHIC.brk, CHIC.brk + 0.3, pane ? 1.12 : 1.15, cx, cyF, 'snap').reset(CHIC.slump - 0.15, CHIC.slump + 0.25, 'settle')
  cam.shake(CHIC.brk + 0.02, 3, 0.22)
  // Chuck's close-up on the band: as big as the row allows, in the widest free run left of him (never over a readout's hole).
  const cs = wide ? 1.6 : 1.3
  const [ca, cb] = freeRun(keep, wx + 4, cx - 14 * sc, 58 - 10 * cs - 4, 58 + 10 * cs + 4)
  const ccx = Math.max(ca + 40 * cs + 6, Math.min(cb - 40 * cs - 6, wide ? (bx + cx) / 2 : cx - 60 * cs))
  const cutC = pane ? '' : cutIn(act, 'cutC', CHIC.brk + 0.02, CHIC.brk + 0.6, ccx, 58, cs, gene)
  const sTop = pane ? wy + 18 : 42
  const [sa, sb] = freeRun(keep, wx + 6, cx - 18 * sc, sTop, sTop + (pane ? 34 : 27))
  let size = pane ? 28 : wide ? 21 : 18
  while (size > 12 && condW(CHIC_LINES.brk, size, 0.8) + 4 > sb - sa) size -= 1
  const tw = condW(CHIC_LINES.brk, size, 0.8)
  const sx = Math.max(sa + 2, Math.min(sb - tw - 2, cx - 22 * sc - tw))
  const stampY = sTop + size
  const red = gene ? '#F2F2F2' : PROPS.adYellow
  const stamp = `${Tc(act, sx + 1.4, stampY + 1.6, CHIC_LINES.brk, size, gene ? '#000000' : PROPS.adRed, 'letter-spacing=".8"')}${Tc(act, sx, stampY, CHIC_LINES.brk, size, red, 'letter-spacing=".8"')}`
  // The stamp stays off the camera: the push about Chuck would carry it past the window's left edge on a narrow band.
  const stampSlam = act.slam(stamp, CHIC.brk + 0.5, CHIC.slump + 0.1)
  // The silence: Chuck slumps into the chair, Jimmy's head goes down, the colour drains a third (Saul only: GENE is grey).
  f.at(CHIC.slump).pose('c', 'cS')
  if (wide) f.backdown('j', 6, 0.5, { pose: 'jP' })
  if (!gene) cam.grade(CHIC.drain, CHIC.title + 0.6, 'grayscale(.35)', 0.4)
  // The title card: the episode on a manila tab, slammed in the middle of the room.
  const tTop = pane ? wy + 14 : 44
  const [ta, tb] = freeRun(keep, wx + 6, x1 - 6, tTop, tTop + (pane ? 34 : 27))
  let tsz = pane ? 22 : 15
  while (tsz > 9 && serifW(CHIC_LINES.title, tsz, 1.2, true) + 26 > tb - ta) tsz -= 0.5
  const tcw = serifW(CHIC_LINES.title, tsz, 1.2, true) + 26
  const tcx = Math.max(ta, Math.min(tb - tcw, (wide ? bx : (wx + cx) / 2) - tcw / 2))
  const card = `${tab(tcx, tTop, tcw, tsz + 10, prop('manila', gene))}${Ts(act, tcx + tcw / 2, tTop + tsz + 2, CHIC_LINES.title, tsz, prop('creamInk', gene), 'text-anchor="middle" letter-spacing="1.2"')}`
  lines += act.slam(card, CHIC.title, act.T - 0.2)
  const gallery = ''
  // --- assemble: the scrim and the clip stay still; the room, the brothers and the words ride the camera.
  const stand = act.still('stand', cx + 2 * sc, F - 11 * sc, -1, sc)
  const panel = `<pattern id="${act.p}pn" patternUnits="userSpaceOnUse" width="${r1(26 * sc)}" height="${win[3]}"><rect width="1.5" height="${win[3]}" fill="${gene ? '#2E2E2E' : '#3B2D23'}"/></pattern>`
  const scrimRect = `<rect x="${wx}" y="${wy}" width="${ww}" height="${win[3]}" fill="${P.tile}" opacity="${pane ? 0.93 : 0.86}"/><rect x="${wx}" y="${wy}" width="${ww}" height="${win[3]}" fill="url(#${act.p}pn)" opacity=".6"/>`
  const scrim = act.on(scrimRect, 0, act.T - 0.05, { fade: 0.25 })
  const inner = cam.wrap(`${back}${gallery}${f.body()}${stand}${lines}`)
  const cid = `${act.p}c`
  const clip = (s: string): string => `<g clip-path="url(#${cid})">${s}</g>`
  const still = `${scrimRect}${wide ? act.still('bench', bx, F - 18 * sc, 1, sc) : ''}${wide ? act.still('jT', jx + 8 * sc, cyJ, 1, sc) : ''}${act.still('cO', cx, cyF, -1, sc)}${stand}${stamp}`
  const svg = `<defs>${keepClip(cid, win, keep)}${panel}</defs>${act.done(clip(`${scrim}${inner}${cutC}${stampSlam}`), clip(still))}`
  return { svg, size: { chuck: 46 * sc, jimmy: wide ? 47 * sc : 0, words: pane ? 15 : 11, stamp: size }, beats: f.script }
}

/** The band act: inside the clear span; both brothers when the span has room, else Chuck's side alone. */
export const chicaneryBand = (o: { W: number; H: number; at: number; gene: boolean; stage?: BandStage }): CourtOut => {
  const x1 = Math.round(Math.max(140, Math.min(o.W - 14, o.stage?.x1 ?? o.W * 0.55)))
  const room: Room = { surface: 'band', W: o.W, H: o.H, win: [0, 34, x1, o.H - 34], keep: o.stage?.keep ?? [], F: o.H - 7.5, sc: BAND_SC, wide: x1 >= WIDE_SPAN }
  return build({ at: o.at, gene: o.gene, id: `bcs-cx-${o.gene ? 'g' : 's'}-${o.W}-${x1}`, room })
}
/** The LEGAL PAD's act: under the title row (y 34), between the margin's times (x < 54) and the date column (the last 70 px). */
export const PANE_WIN = { x0: 54, y0: 40, right: 70, bottom: 12 } as const
export const chicaneryPane = (o: { W: number; H: number; at: number; gene: boolean }): CourtOut => {
  const ww = o.W - PANE_WIN.x0 - PANE_WIN.right
  const hh = o.H - PANE_WIN.y0 - PANE_WIN.bottom
  const sc = Math.max(1.4, Math.min(2.2, (hh - 30) / 66))
  const room: Room = { surface: 'pane', W: o.W, H: o.H, win: [PANE_WIN.x0, PANE_WIN.y0, ww, hh], keep: [], F: PANE_WIN.y0 + hh - 4, sc, wide: ww >= 420 }
  return build({ at: o.at, gene: o.gene, id: `bcs-cxp-${o.gene ? 'g' : 's'}-${o.W}-${o.H}`, room })
}
