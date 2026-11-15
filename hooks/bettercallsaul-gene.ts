// GENE, the hidden black-and-white skin: its own moments on the shared stage engine (hooks/stage).
//
//   drain   typing "takavic" in Better Call Saul: the panels are GENE already; a wash of Saul's colour (the wood, the ad's red
//           and yellow) drains off them right to left behind a soft grey edge, the grain swells in, the projector flickers twice
//   flood   "saul goodman" in GENE: the panels are Saul already; GENE's grey drains off left to right behind Saul's red star-wipe
//   NIPPY!  GENE's own job-done cheer: the mall shutter rolls down over the band's clear span (never over a number) with a bounce,
//           NIPPY! stencilled on its slats, one brief flash of colour (the slats in Saul red for three frames, then they drain), and it
//           rolls back up
// Pinned (a redraw resumes), a still frame under reduced motion, no filters: veils, clips and stepped opacity only.
import { burst, PROPS, star } from './bettercallsaul'
import { GENE_NIPPY_STENCIL, GENE_SHUTTER_BOTTOM, GENE_SHUTTER_SLAT, GENE_SHUTTER_SLAT_RED } from './bettercallsaul-sprites'
import { rectPaths } from './stage/frames'
import { freeRects, holesIn, keepClip } from './stage/keep'
import type { BandStage, Rect } from './stage/keep'
import { Act, r1 } from './stage/timeline'
import * as wipe from './stage/wipe'

/** The colour drain / flood after the switch word (ms). */
export const SWAP_MS = 1_800
export const DRAIN = { t0: 0.1, t1: 1.3, flicker: [1.36, 1.5] } as const
const GREY_EDGE = '#9A9A9A'

/**
 * The switch's colour move over one panel (W x H) already drawn in the skin switched TO. `toGene`: the drain (Saul's colour leaves
 * right to left); else the flood (GENE's grey leaves left to right behind Saul's red star-wipe). `surface` and `i` only make the
 * act's id unique per panel.
 */
export const swapLayer = (o: { W: number; H: number; at: number; toGene: boolean; surface: 'band' | 'pane'; i?: string }): string => {
  const { W, H, at, toGene } = o
  const act = new Act({ id: `bcs-swap-${toGene ? 'g' : 's'}-${o.surface}-${o.i ?? ''}-${W}x${H}`, ms: SWAP_MS, at, W, H })
  const { t0, t1 } = DRAIN
  let body = ''
  if (toGene) {
    // The colour that is leaving: the walnut wash, Saul's powder blue at the left, the ad's red at the right, its red and yellow rules.
    const g = `${act.p}w`
    const wash = `<defs><linearGradient id="${g}"><stop offset="0" stop-color="#5B8FD6" stop-opacity=".22"/><stop offset=".3" stop-color="${PROPS.woodLight}" stop-opacity=".45"/><stop offset=".75" stop-color="${PROPS.woodLight}" stop-opacity=".45"/><stop offset="1" stop-color="${PROPS.adRed}" stop-opacity=".28"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${g})"/><rect width="${W}" height="3" fill="${PROPS.adRed}" opacity=".85"/><rect y="${H - 3}" width="${W}" height="3" fill="${PROPS.adYellow}" opacity=".85"/>`
    body += wipe.clip(act, t0, t1, wash, { dir: 'l', mode: 'out', ease: 'ease-in-out' })
    body += wipe.bar(act, t0, t1, { dir: 'l', color: GREY_EDGE, core: '#D2D2D2', glow: 22, ease: 'ease-in-out' })
    // The grain swells in behind the edge (the panel's own tile, bcsgr1), then settles to the film's 7%.
    body += act.kf(`<rect width="${W}" height="${H}" fill="url(#bcsgr1)"/>`, [[0, 'opacity:0'], [t0 + 0.3, 'opacity:0'], [t1, 'opacity:.16'], [SWAP_MS / 1000 - 0.05, 'opacity:0']])
  } else {
    const veil = `<rect width="${W}" height="${H}" fill="#121212" opacity=".62"/><rect width="${W}" height="${H}" fill="#7A7A7A" opacity=".12"/>`
    body += wipe.clip(act, t0, t1, veil, { dir: 'r', mode: 'out', ease: 'ease-in-out' })
    body += wipe.bar(act, t0, t1, { dir: 'r', color: PROPS.adRed, core: PROPS.adRed, glow: 12, ease: 'ease-in-out' })
    // Saul's star rides the edge (the TV ad's star-wipe).
    const r = Math.min(16, H * 0.3)
    const st = `${burst(0, 0, r, PROPS.adYellow)}${star(0, 0, r * 0.55, PROPS.adRed)}`
    body += act.mv(st, [[0, -r * 2, H / 2, 0], [t0, -r * 2, H / 2, 1], [t1, W + r * 2, H / 2, 1], [t1 + 0.05, W + r * 2, H / 2, 0]], { ease: 'ease-in-out' })
  }
  // Two frames of the projector's light as the film catches (both ways).
  for (const t of DRAIN.flicker) body += act.win(t, t + 0.04, `<rect width="${W}" height="${H}" fill="#FFFFFF" opacity=".16"/>`)
  // Reduced motion: a 2 px rule in the arriving look's ink marks the change for the act's life.
  return act.done(body, `<rect width="${W}" height="2" fill="${toGene ? '#BDBDBD' : PROPS.adRed}"/>`)
}

/** NIPPY!: the cheer's length (s) and beats. */
export const NIPPY = { ms: 2_400, down: [0, 0.5], red: 0.95, up: [1.85, 2.3] } as const
/**
 * GENE's own cheer over the band: the mall shutter. Slats (GENE_SHUTTER_SLAT as a pattern) roll down and land with a small
 * bounce, the bottom bar and its lock (GENE_SHUTTER_BOTTOM, its ends stretched), NIPPY! stencilled three times its size; for three
 * frames the slats are Saul red (GENE_SHUTTER_SLAT_RED), then the colour drains; it rolls back up. The shutter comes down over the
 * band's clear span only (`stage`: under the header, left of the first readout, the Tasks chip and the step count showing through
 * its keep-out holes), so every number stays readable; the stencil sits in the span's biggest free rectangle. Without a stage: the
 * band's middle strip. Reduced motion: the shutter down, NIPPY! on it. Without a start time: the shutter drawn down, still.
 */
export const geneCheer = (W: number, H: number, startAt?: number, stage?: BandStage): string => {
  const win: Rect = stage ? [0, 34, Math.round(Math.max(160, Math.min(W, stage.x1))), H - 34] : [0, Math.round(H / 2 - 23), W, 46]
  const [x0, y0, w, h] = win
  const act = new Act({ id: `bcs-nippy-${W}x${H}-${w}`, ms: NIPPY.ms, at: startAt ?? 0, W, H, K: 6 })
  const p = act.p
  const pat = (id: string, sp: typeof GENE_SHUTTER_SLAT): string => `<pattern id="${id}" patternUnits="userSpaceOnUse" width="16" height="6"><g shape-rendering="crispEdges">${rectPaths(sp, 6)}</g></pattern>`
  const bottom = (y: number): string => {
    // The bar's ends are its first and last columns stretched; the lock (the middle 8 columns) sits at the centre.
    const end = `<rect y="${r1(y)}" width="${w}" height="6" fill="#A9A9A4"/><rect y="${r1(y)}" width="${w}" height="1" fill="#D6D6D2"/><rect y="${r1(y + 5)}" width="${w}" height="1" fill="#4A4A47"/>`
    return `${end}<g transform="translate(${r1(w / 2 - 24)} ${r1(y)})" shape-rendering="crispEdges">${rectPaths(GENE_SHUTTER_BOTTOM, 6)}</g>`
  }
  // NIPPY! in the biggest free rectangle of the shutter (clear of the holes), as big as it fits (2 to 4 px a stencil pixel).
  const holes = stage ? holesIn(win, stage.keep).map(([x, y, hw, hh]) => [x - x0, y - y0, hw, hh] as Rect) : []
  const [fx, fy, fw, fh] = freeRects(w, h - 6, holes).sort((a, b) => b[2] * b[3] - a[2] * a[3])[0] ?? [0, 0, w, h - 6]
  const sw = 29
  const s = Math.max(2, Math.min(4, Math.floor(Math.min((fw * 0.8) / sw, (fh - 16) / 5, (h * 0.3) / 5))))
  const cx = fx + fw / 2
  const cy = fy + fh / 2 - 5
  const stencil = `<g transform="translate(${r1(cx - (sw * s) / 2)} ${r1(cy - (5 * s) / 2)}) scale(${s})" shape-rendering="crispEdges">${rectPaths(GENE_NIPPY_STENCIL, 2)}</g>`
  const sub = `<text x="${r1(cx)}" y="${r1(cy + (5 * s) / 2 + 12)}" text-anchor="middle" font-family="'Avenir Next Condensed','Arial Narrow',sans-serif" font-weight="800" font-size="9" letter-spacing="1.6" fill="#2C2C2A">MALL BAKERY · JOB DONE</text>`
  const shutter = (fill: string): string => `<rect width="${w}" height="${h - 6}" fill="url(#${fill})"/>${bottom(h - 6)}`
  const defs = `<defs>${pat(`${p}sl`, GENE_SHUTTER_SLAT)}${pat(`${p}sr`, GENE_SHUTTER_SLAT_RED)}${stage ? keepClip(`${p}w`, win, stage.keep) : `<clipPath id="${p}w"><rect x="${x0}" y="${y0}" width="${w}" height="${h}"/></clipPath>`}</defs>`
  const [d0, d1] = NIPPY.down
  const [u0, u1] = NIPPY.up
  // The roll: down with a bounce at the bottom, held, back up (a translate of the whole shutter, inside the span's clip).
  const red = act.kf(`<rect width="${w}" height="${h - 6}" fill="url(#${p}sr)"/>`, [[0, 'opacity:0'], [NIPPY.red, 'opacity:0'], [NIPPY.red + 0.01, 'opacity:1'], [NIPPY.red + 0.13, 'opacity:1'], [NIPPY.red + 0.45, 'opacity:0']])
  const roll = act.mv(`${shutter(`${p}sl`)}${red}${stencil}${sub}`, [[0, 0, -h], [d0, 0, -h], [d1 - 0.08, 0, 2], [d1, 0, -1.5], [d1 + 0.07, 0, 0], [u0, 0, 0], [u1, 0, -h]], { ease: 'snap' })
  const place = (inner: string): string => `<g clip-path="url(#${p}w)"><g transform="translate(${x0} ${y0})">${inner}</g></g>`
  return `${defs}${act.done(place(roll), place(`${shutter(`${p}sl`)}${stencil}${sub}`))}`
}
