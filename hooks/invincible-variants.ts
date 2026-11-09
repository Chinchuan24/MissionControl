// Invincible (fan homage to Robert Kirkman, Cory Walker, Ryan Ottley, Image Comics, Skybound and Amazon MGM Studios): THE MULTIVERSE.
// Angstrom Levy's rifts drop a flock of other-universe Marks (S3E7), who fall in behind the real one and fly across in a wobbly V
// (after the fans' "all of them flying" edits; no fan art copied). 8 s, one pinned delay, no flip, cartoon only.
// Band and COVER STORY only, in sync: rifts open one by one (teal, a white core, sparkles) and each drops a variant with a white
// pop; on the pane Angstrom peeks out of his own portal. The real Mark streaks in, a "?!", every variant jolts, they gather into
// a V behind him, the V bobs (a ripple down the wings), then crosses right and out; "TOO MANY MARKS." The whole act is ONE 8 s
// CSS duration on a shared class with keyframes in percent; the rifts share a 1 s keyframe, each with its own pinned delay.
// Reduced motion: no rifts, no Angstrom, no bob; the V parks with the end caption for the act's 8 s.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Sprite } from './cast'
import { BASE_CSS, VARIANTS_MS, variantsDue } from './invincible-eggs'
import { STAR4 } from './invincible-cameos'
import { PROPS, SP, caption, pal, px, r1, sfx, speedLines, spW, spriteC, uniq } from './invincible'
import type { Era } from './invincible'
import { VARIANT_CAST, padTop } from './invincible-variants-sprites'
import type { ExtraArgs } from './themes'

/** Percent of the act for a time in seconds. */
export const VR = (t: number): number => (t / (VARIANTS_MS / 1000)) * 100
/** The 21x16 flight sprites on the variants' 21x18 canvas (two empty rows on top), so all centre the same. */
export const padded = padTop
/** The leader: the worn era's own Mark. */
export const realMark = (era: Era): Sprite => padded(era === 2 ? SP.INV_MARK_S3_FLY : SP.INV_MARK_FLY)
/** The pane's tail: Flaxancible in the classic era; in the new one the classic suit itself (in S3 that is the evil one). */
export const tailOf = (era: Era): Sprite => VARIANT_CAST.tail[era] ?? padded(SP.INV_MARK_FLY)

// Static: one copy per Svg. The rift and the pop share 1 s keyframes (each use pins its own delay); the bob loops in phase.
export const VARIANTS_CSS = `.vr-still{display:none}.vr-r{animation:vr-rift 1s ease-out both;animation-delay:var(--d)}.vr-p{animation:vr-pop 1s linear both;animation-delay:var(--d)}.vr-bob{transform-box:fill-box;transform-origin:50% 50%;animation:vr-bob 1.2s ease-in-out infinite}@keyframes vr-rift{0%{transform:scale(.1);opacity:0}25%{transform:scale(1.15);opacity:1}30%{transform:scale(1)}70%{transform:scale(1);opacity:1}100%{transform:scale(0);opacity:0}}@keyframes vr-pop{0%,29%{opacity:0;transform:scale(.4)}30%{opacity:1;transform:scale(1.4)}42%,100%{opacity:0;transform:scale(1.6)}}@keyframes vr-bob{0%,100%{transform:translate(0,0) rotate(0deg)}30%{transform:translate(0,-2px) rotate(-3deg)}70%{transform:translate(0,2px) rotate(2deg)}}@media (prefers-reduced-motion: reduce){.vr-anim{display:none}.vr-still{display:block;opacity:0;animation:vr-stay 8s steps(1) forwards}.vr-bob{animation:none}@keyframes vr-stay{0%,96%{opacity:1}100%{opacity:0;visibility:hidden}}}`

// Percents to 2 decimals: a 0.1 % step must not round onto its neighbour (two frames at one offset: the last wins).
const pc = (n: number): number => +n.toFixed(2)
/** Keyframes with runs of equal frames merged (`0%,6.3%{…}`): the movers hold still for most of the act. */
const kfm = (name: string, frames: [number, string][]): string => {
  const out: [string[], string][] = []
  for (const [p, v] of frames) {
    const last = out[out.length - 1]
    if (last && last[1] === v) last[0].push(`${pc(p)}%`)
    else out.push([[`${pc(p)}%`], v])
  }
  return `@keyframes ${name}{${out.map(([ps, v]) => `${ps.join(',')}{${v}}`).join('')}}`
}
/** Shown (opacity 1) from `a` % to `b` %, hidden before and after. */
const onOff = (name: string, a: number, b: number): string => kfm(name, [[0, 'opacity:0'], [a, 'opacity:0'], [a + 0.1, 'opacity:1'], [b, 'opacity:1'], [b + 0.1, 'opacity:0'], [100, 'opacity:0']])
/** A mover: frames [pct, x, y, op?] translate (and fade) one group. */
const mv = (name: string, frames: (number | undefined)[][]): string => kfm(name, frames.map(([p, x, y, op]) => [p as number, `transform:translate(${r1(x)}px,${r1(y)}px)${op !== undefined ? `;opacity:${op}` : ''}`]))

type Slot = [number, number]
type Layout = { S: number; xL: number; yL: number; slots: Slot[]; rifts: Slot[]; pops: number[]; exit: number; park: Slot; rs: number }
/** Where everyone is, per surface: the leader's spot, the V's slots (U1 D1 U2 D2 …, then the pane's tail), the rifts, the pops. */
export const layout = (W: number, H: number, surface: 'band' | 'pane'): Layout => {
  if (surface === 'band') {
    const xL = 0.36 * W
    const yL = H / 2
    const slots: Slot[] = []
    for (let n = 1; n <= 3; n++) slots.push([xL - n * 34, yL - n * 15], [xL - n * 34, yL + n * 15])
    const rifts: Slot[] = [[0.22 * W, 44], [0.36 * W, 94], [0.5 * W, 40], [0.62 * W, 92], [0.74 * W, 46], [0.86 * W, 90]]
    return { S: 1.5, xL, yL, slots, rifts, pops: rifts.map((_, i) => 0.4 + 0.5 * i), exit: W + 142 - xL, park: [0.5 * W + 51, yL], rs: 0.75 }
  }
  const xL = 0.55 * W
  const yL = 0.5 * H
  const DX = 46
  const DY = Math.min(32, Math.floor((H / 2 - 40) / 4))
  const slots: Slot[] = []
  for (let n = 1; n <= 4; n++) slots.push([xL - n * DX, yL - n * DY], [xL - n * DX, yL + n * DY])
  slots.push([xL - 5 * DX, yL])
  const fr: Slot[] = [[0.18, 0.2], [0.72, 0.16], [0.34, 0.52], [0.86, 0.46], [0.14, 0.78], [0.5, 0.8], [0.62, 0.34], [0.4, 0.3], [0.66, 0.62]]
  const rifts = fr.map(([fx, fy]) => [fx * W, fy * H] as Slot)
  return { S: 2, xL, yL, slots, rifts, pops: rifts.map((_, i) => 0.5 + 0.28 * i), exit: W + 255 - xL, park: [xL, yL], rs: 1 }
}

/** THE MULTIVERSE for one panel (band, or the COVER STORY card), pinned to `startAt`. */
export const variants = (W: number, H: number, surface: 'band' | 'pane', era: Era, startAt: number): string => {
  const P = pal(era)
  const band = surface === 'band'
  const id = uniq('vr')
  const L = layout(W, H, surface)
  const cast: Sprite[] = band ? VARIANT_CAST.band : [...VARIANT_CAST.pane, tailOf(era)]
  const A = (name: string): string => `class="${id}A" style="animation-name:${id}${name}"`
  const dly = (ms: number): string => `calc(@@T${Math.round(ms)}@@ + 0s)`
  const half = (spW(SP.INV_MARK_FLY) * L.S) / 2
  let css = `${BASE_CSS}${VARIANTS_CSS}.${id}A{animation-duration:8s;animation-timing-function:linear;animation-fill-mode:both;animation-delay:${dly(startAt)}}.${id}H{animation-name:${id}hs}.${id}O{animation-name:${id}so}`
  css += kfm(`${id}cv`, [[0, 'opacity:0'], [0.5, 'opacity:1'], [99.5, 'opacity:1'], [100, 'opacity:0']])
  css += kfm(`${id}vl`, [[0, 'opacity:0'], [3.75, 'opacity:.35'], [96.25, 'opacity:.35'], [100, 'opacity:0']])
  css += onOff(`${id}c1`, 0.6, 20)
  css += onOff(`${id}c2`, 83.75, 96.9)
  css += kfm(`${id}c2s`, [[0, 'transform:scale(1.25)'], [83.75, 'transform:scale(1.25)'], [85.6, 'transform:scale(1)'], [100, 'transform:scale(1)']])
  css += kfm(`${id}hs`, [[0, 'transform:rotate(0deg)'], [45, 'transform:rotate(0deg)'], [45.6, 'transform:rotate(-12deg)'], [47.5, 'transform:rotate(-12deg)'], [48.1, 'transform:rotate(0deg)'], [100, 'transform:rotate(0deg)']])
  css += mv(`${id}m`, [[0, -50, L.yL, 0], [37.5, -50, L.yL, 0], [37.6, -50, L.yL, 1], [43.75, L.xL, L.yL, 1], [44.4, L.xL - 4, L.yL], [46.25, L.xL, L.yL], [100, L.xL, L.yL]])
  css += onOff(`${id}ms`, 37.5, 45)
  css += onOff(`${id}q`, 44.4, 53.75)
  css += onOff(`${id}so`, 66.25, 87.5)
  css += `@keyframes ${id}fl{0%,67.5%{transform:translate(0,0);animation-timing-function:cubic-bezier(.55,0,1,.6)}87.5%,100%{transform:translate(${r1(L.exit)}px,0)}}`
  // the sprites, cut once: s0 the real Mark, s1.. the variants in pop order
  // (crispEdges is inherited: it is set once on the groups that place them, not on every sprite)
  const cut = (sp: Sprite, k: number): string => spriteC(sp, L.S, { id: `${id}s${k}` }).replace(' shape-rendering="crispEdges"', '')
  let defs = cut(realMark(era), 0)
  cast.forEach((sp, i) => { defs += cut(sp, i + 1) })
  const sparkle = (x: number, y: number, col: string, s: number): string => `<path d="${STAR4}" fill="${col}" transform="translate(${x} ${y}) scale(${s})"/>`
  defs += `<g id="${id}rf"><ellipse rx="13" ry="17" fill="${PROPS.ink}" fill-opacity=".85" stroke="#63BCD4" stroke-width="2.5"/><ellipse rx="10" ry="14" fill="none" stroke="#8FDCE7" stroke-width="1.2" stroke-dasharray="3 2"/><ellipse rx="4" ry="6" fill="#FFFFFF" fill-opacity=".9"/>${sparkle(-14, -12, '#8FDCE7', 0.8)}${sparkle(13, -6, '#FFFFFF', 0.6)}${sparkle(-8, 15, '#63BCD4', 0.7)}</g>`
  defs += `<g id="${id}sl">${speedLines(-half - 1, 0, 26, 4, 1, PROPS.white, { gap: 5, op: 0.75 })}</g>`
  // the rifts and their pops
  let rifts = ''
  L.rifts.forEach(([x, y], i) => {
    // one pinned delay per rift, handed to its ring and its pop through --d
    rifts += `<g transform="translate(${r1(x)} ${r1(y)})${L.rs !== 1 ? ` scale(${L.rs})` : ''}" style="--d:${dly(startAt + ((L.pops[i] as number) - 0.3) * 1000)}"><g class="dl-c vr-r"><use href="#${id}rf"/></g><ellipse class="dl-c vr-p" rx="7" ry="9" fill="#FFFFFF"/></g>`
  })
  // Angstrom Levy (pane): his portal at (0.82W, 0.80H); he rises out of it, arms up, and sinks back before it closes
  let levy = ''
  if (!band) {
    const ax = 0.82 * W
    const ay = 0.8 * H
    const AS = 1.6
    const aw = spW(SP.INV_ANGSTROM) * AS
    const ah = 24 * AS
    defs += `<clipPath id="${id}ac"><rect x="${r1(ax - 30)}" y="${r1(ay - 60)}" width="60" height="62"/></clipPath>`
    css += kfm(`${id}ar`, [[0, 'transform:scale(.1);opacity:0'], [2.5, 'transform:scale(1.15);opacity:1'], [3.75, 'transform:scale(1)'], [40, 'transform:scale(1);opacity:1'], [42.5, 'transform:scale(0);opacity:0'], [100, 'transform:scale(0);opacity:0']])
    css += kfm(`${id}an`, [[0, 'transform:translate(0,40px)'], [1.25, 'transform:translate(0,40px)'], [6.25, 'transform:translate(0,0)'], [36.25, 'transform:translate(0,0)'], [40, 'transform:translate(0,40px)'], [100, 'transform:translate(0,40px)']])
    levy = `<g transform="translate(${r1(ax)} ${r1(ay)}) scale(1.6)"><g class="dl-c ${id}A" style="animation-name:${id}ar"><use href="#${id}rf"/></g></g><g clip-path="url(#${id}ac)"><g ${A('an')}>${px(SP.INV_ANGSTROM, ax - aw / 2, ay - ah + 2, AS, { rows: [0, 24] })}</g></g>`
  }
  // the flock: every variant pops at its rift, jolts at the real Mark, glides into its slot; the V bobs, a ripple down the wings
  let flock = ''
  cast.forEach((_, i) => {
    const k = i + 1
    const [xr, yr] = L.rifts[i] as Slot
    const [xs, ys] = L.slots[i] as Slot
    const tp = VR(L.pops[i] as number)
    css += mv(`${id}v${k}`, [[0, xr, yr, 0], [tp, xr, yr, 0], [tp + 0.7, xr, yr - 4, 1], [tp + 2, xr, yr, 1], [52.5, xr, yr, 1], [62.5, xs, ys, 1], [100, xs, ys, 1]])
    flock += `<g ${A(`v${k}`)}><g class="dl-c ${id}A ${id}H"><g class="vr-bob" style="animation-delay:-${(0.15 * k).toFixed(2)}s"><use class="${id}A ${id}O" href="#${id}sl"/><use href="#${id}s${k}"/></g></g></g>`
  })
  flock += `<g ${A('m')}><g class="vr-bob"><use ${A('ms')} href="#${id}sl"/><use class="${id}A ${id}O" href="#${id}sl"/><use href="#${id}s0"/></g></g>`
  const qx = L.xL + (band ? 4 : 6)
  const qy = L.yL - (band ? 18 : 24)
  flock += `<g ${A('q')}>${sfx(qx, qy, '?!', band ? 13 : 16, P.hero, { anchor: 'middle' })}</g>`
  // the captions: the opener (yellow in both eras), the end line in the era's hero colour
  const c1Text = 'MEANWHILE, ACROSS THE MULTIVERSE…'
  const c1w = caption(0, 0, c1Text, 9.5).w
  const c1 = band ? caption(r1((W - c1w) / 2), 6, c1Text, 9.5) : caption(14, 14, c1Text, 9.5)
  const c2Size = band ? 11 : 14
  const c2Text = 'TOO MANY MARKS.'
  const c2m = era === 2 ? caption(0, 0, c2Text, c2Size, P.hero, { ink: P.heroInk }) : caption(0, 0, c2Text, c2Size)
  const c2x = r1((W - c2m.w) / 2)
  const c2y = r1((H - c2m.h) / 2)
  const c2 = era === 2 ? caption(c2x, c2y, c2Text, c2Size, P.hero, { ink: P.heroInk }) : caption(c2x, c2y, c2Text, c2Size)
  const veil = (extra: string): string => `<rect width="${W}" height="${H}" fill="${P.tile}" ${extra}/>`
  const act = `<g class="vr-anim"><g ${A('cv')}>${veil(A('vl'))}${rifts}${levy}<g ${A('fl')} shape-rendering="crispEdges">${flock}</g><g ${A('c1')}>${c1.svg}</g><g ${A('c2')}><g class="dl-c ${id}A" style="animation-name:${id}c2s">${c2.svg}</g></g></g></g>`
  // reduced motion: the V parked (centred on the band), and the end line, for the act's length
  const [px0, py0] = L.park
  const dx = px0 - L.xL
  const dy = py0 - L.yL
  const at = (x: number, y: number, k: number): string => `<g transform="translate(${r1(x + dx)} ${r1(y + dy)})"><use href="#${id}s${k}"/></g>`
  // (the still's caption sits clear of the parked V: ahead of the leader on the band, top left on the card)
  const sx = band ? r1(px0 + 30) : 14
  const sy = band ? c2y : 14
  const c2t = era === 2 ? caption(sx, sy, c2Text, c2Size, P.hero, { ink: P.heroInk }) : caption(sx, sy, c2Text, c2Size)
  const still = `<g class="vr-still" style="animation-delay:${dly(startAt)}" shape-rendering="crispEdges">${veil('opacity=".35"')}${L.slots.slice(0, cast.length).map(([x, y], i) => at(x, y, i + 1)).join('')}${at(L.xL, L.yL, 0)}${c2t.svg}</g>`
  return `<g pointer-events="none" data-egg="variants" data-era="${era}"><style>${css}</style><defs>${defs}</defs>${act}${still}</g>`
}

/** THE MULTIVERSE for a panel: the band, and the COVER STORY card (between the pane's `<!--dl-->` markers), or ''. */
export const variantsExtras = (era: Era) => (o: ExtraArgs): string => {
  if (o.party) return ''
  const v = variantsDue(o.at, o.fx, o.swapAt)
  if (v === undefined) return ''
  if (o.surface === 'band') return variants(o.W, o.H, 'band', era, v)
  if (o.card === 'cred' && o.W >= 200 && o.H >= 200) return `<!--dl-->${variants(o.W, o.H, 'pane', era, v)}<!--/dl-->`
  return ''
}
