// Parallax: a 2-4 layer backdrop, each layer an endless tile drifting at its own speed (far = slow, near = fast). The
// cheapest real depth there is. Idle-safe: every layer moves in `steps()` at <= `fps` (default 8), so a resting band
// costs about what one stepped loop costs (probe.md); endless, so `phased` keeps it in step across redraws.
// Reduced motion: the layers stand still where they are drawn.
//
//   const sky = parallax({ id: 'cpsky', W, H, layers: [
//     { tile: farTowers, w: 160, speed: 2, op: 0.5 },          // px per second
//     { tile: nearTowers, w: 220, speed: 6, y: 10 },
//     { tile: rain, w: 64, speed: 0, dy: 40, h: 64 },           // a vertical drift: rain falling
//   ] })
//   svg = `<style>${sky.css}</style>${sky.svg}`   (each layer: one <pattern> + one rect, ~250 chars + its tile)
import { r1, r3 } from './timeline'

export type Layer = {
  /** One tile of the layer, drawn at x 0..w (and y 0..h for a vertical drift). It repeats to cover the panel. */
  tile: string
  /** The tile's width in px (the horizontal repeat). */
  w: number
  /** Horizontal drift in px per second (negative drifts right). 0 holds still. */
  speed: number
  /** Vertical drift in px per second (rain, snow, bubbles); needs `h`. */
  dy?: number
  /** The tile's height (the vertical repeat). */
  h?: number
  /** Where the layer sits, and its opacity. */
  y?: number
  op?: number
}
export type Parallax = { svg: string; css: string }

/**
 * The backdrop: each layer is ONE <pattern> of its tile and one rect, so a layer costs its tile plus ~250 chars however
 * wide the panel. The rect is a repeat wider (taller) than the panel and slides one repeat per loop. `fps` caps every
 * layer's step rate.
 */
export const parallax = (o: { id: string; W: number; H: number; layers: Layer[]; fps?: number }): Parallax => {
  const fps = Math.min(12, o.fps ?? 8)
  let defs = ''
  let svg = ''
  let css = ''
  const classes: string[] = []
  o.layers.slice(0, 4).forEach((L, i) => {
    const id = `${o.id}${i}`
    const vert = !!L.dy && !!L.h
    const th = L.h ?? o.H
    defs += `<pattern id="${id}p" patternUnits="userSpaceOnUse" width="${L.w}" height="${th}">${L.tile}</pattern>`
    const moving = L.speed !== 0 || vert
    const rect = (cls: string): string => `<rect${cls ? ` class="${cls}"` : ''} x="${vert ? 0 : -L.w}" y="${vert ? -th : 0}" width="${o.W + (vert ? 0 : 2 * L.w)}" height="${vert ? o.H + 2 * th : th}" fill="url(#${id}p)"/>`
    const g = `<g${L.y ? ` transform="translate(0 ${r1(L.y)})"` : ''}${L.op !== undefined ? ` opacity="${L.op}"` : ''}>`
    if (!moving) { svg += `${g}${rect('')}</g>`; return }
    // One loop: the rect slides one repeat, then jumps back (seamless: the pattern repeats). A vertical layer ignores `speed`.
    const period = vert ? th / Math.abs(L.dy as number) : L.w / Math.abs(L.speed)
    const n = Math.max(2, Math.round(period * fps))
    const to = vert ? `translate(0,${(L.dy as number) > 0 ? th : -th}px)` : `translate(${L.speed > 0 ? -L.w : L.w}px,0)`
    css += `.${id}{animation:${id} ${r3(period)}s steps(${n}) infinite}@keyframes ${id}{from{transform:none}to{transform:${to}}}`
    classes.push(id)
    svg += `${g}${rect(id)}</g>`
  })
  if (classes.length) css += `@media (prefers-reduced-motion: reduce){${classes.map(c => `.${c}`).join(',')}{animation:none!important}}`
  return { svg: `<defs>${defs}</defs><g pointer-events="none">${svg}</g>`, css }
}
