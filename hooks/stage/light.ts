// Light passes: the cheapest "3D". A sweep (a glint crossing a shape), a rim light (a lit edge on one side of a
// silhouette), a flicker (a failing tube, a candle) and a god-ray (a cone of light). Built from gradients, clips, masks
// and opacity ONLY: no blend modes (an isolating parent turns a blend into flat colour; probe.md), no filters at rest.
//
// Each one comes two ways: bound to an act (pinned, plays once, part of the act's still/anim pair) or as an idle loop
// (endless, `steps()` at <= 12 fps so a resting panel stays cheap; stopped by reduced motion).
// Everything returns { svg, css }: put the css in the Svg's <style> once (act-bound pieces register theirs on the act).
//
//   const clip = light.clipTo(act.bank, 'M1', 'hero', x, y, 1, 2)          // a clipPath of the pose's silhouette
//   const g = light.sweep({ id: 'gl', x, y, w: 60, h: 80, clip: 'hero', act, t0: 1.2, t1: 1.8 })
//   const r = light.rim(act.bank, 'M1', x, y, { id: 'rm', color: '#9FE8FF', dx: -1, sc: 2 })
import { steps } from './ease'
import type { FrameBank } from './frames'
import { rng } from './fx'
import { r1, r3 } from './timeline'
import type { Act } from './timeline'

export type Lit = { svg: string; css: string }
type Box = { x: number; y: number; w: number; h: number }

/** A clipPath (id `id`) holding a pose's silhouette placed like `bank.use(key, x, y, dir, sc)`. Put it in <defs> or inline. */
export const clipTo = (bank: FrameBank, key: string, id: string, x: number, y: number, dir: 1 | -1 = 1, sc = 1): string =>
  `<clipPath id="${id}"><use href="#${bank.sil(key)}" transform="translate(${r3(x)} ${r3(y)}) ${bank.anchor(key, dir, sc)}"/></clipPath>`

const grad = (id: string, color: string, op: number): string =>
  `<linearGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="0"/><stop offset=".5" stop-color="${color}" stop-opacity="${op}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>`

/**
 * A glint sweeping across `box` (left to right), skewed `skew` deg, `band` px wide, clipped to `clip` (a clipPath id)
 * if given. Act-bound: once from t0 to t1. Loop: every `period` s (the glint takes `pass` of it), at `fps` steps.
 */
export const sweep = (o: Box & { id: string; clip?: string; color?: string; op?: number; band?: number; skew?: number; ease?: string } & ({ act: Act; t0: number; t1: number } | { period: number; pass?: number; fps?: number })): Lit => {
  const band = o.band ?? Math.max(10, o.w * 0.35)
  const from = r1(o.x - band * 1.5)
  const to = r1(o.x + o.w + band * 0.5)
  const g = grad(`${o.id}g`, o.color ?? '#FFFFFF', o.op ?? 0.45)
  const frame = (inner: string): string => `<g${o.clip ? ` clip-path="url(#${o.clip})"` : ''}><g transform="skewX(${o.skew ?? -18})">${inner}</g></g>`
  const shear = Math.tan(((o.skew ?? -18) * Math.PI) / 180) * (o.y + o.h / 2)
  const a = r1(from - shear)
  const b = r1(to - shear)
  if ('act' in o) {
    const rect = `<rect y="${r1(o.y)}" width="${r1(band)}" height="${r1(o.h)}" fill="url(#${o.id}g)"/>`
    const svg = o.act.kf(rect, [[0, `transform:translateX(${a}px)`], [o.t0, `transform:translateX(${a}px)`], [o.t1, `transform:translateX(${b}px)`], [o.act.T - o.act.off, `transform:translateX(${b}px)`]], { ease: o.ease ?? 'linear' })
    return { svg: `<defs>${g}</defs>${frame(svg)}`, css: '' }
  }
  const pass = o.pass ?? 0.35
  const fps = Math.min(12, o.fps ?? 12)
  const n = Math.max(2, Math.round(o.period * pass * fps))
  const css = `.${o.id}{animation:${o.id} ${r3(o.period)}s ${steps(n)} infinite}@keyframes ${o.id}{0%{transform:translateX(${a}px)}${r3(pass * 100)}%,100%{transform:translateX(${b}px)}}@media (prefers-reduced-motion: reduce){.${o.id}{animation:none;display:none}}`
  return { svg: `<defs>${g}</defs>${frame(`<rect class="${o.id}" y="${r1(o.y)}" width="${r1(band)}" height="${r1(o.h)}" fill="url(#${o.id}g)" transform="translate(${a} 0)"/>`)}`, css }
}

/**
 * A rim light: a `w`-px lit edge INSIDE the pose's silhouette on the side the light comes from (dx, dy point away from
 * the light: -1, 0 = lit from the left). A mask of the silhouette minus itself shifted. Static; `act` + t0/t1 fades it.
 */
export const rim = (bank: FrameBank, key: string, x: number, y: number, o: { id: string; color?: string; dx?: number; dy?: number; op?: number; dir?: 1 | -1; sc?: number; act?: Act; t0?: number; t1?: number }): Lit => {
  const sil = bank.sil(key)
  const sc = o.sc ?? 1
  const place = `translate(${r3(x)} ${r3(y)}) ${bank.anchor(key, o.dir ?? 1, sc)}`
  const dx = o.dx ?? -1
  const dy = o.dy ?? 0
  // Shift by one sprite pixel away from the light: what stays white is the lit edge.
  const mask = `<mask id="${o.id}" maskUnits="userSpaceOnUse" x="0" y="0" width="100000" height="100000"><g transform="${place}"><use href="#${sil}" fill="#FFFFFF"/><use href="#${sil}" fill="#000000" transform="translate(${-dx} ${-dy})"/></g></mask>`
  const p = bank.pose(key)
  const cover = `<rect x="${r1(x - p.w * sc * 1.5)}" y="${r1(y - p.h * sc)}" width="${r1(p.w * sc * 3)}" height="${r1(p.h * sc * 2)}" fill="${o.color ?? '#FFFFFF'}" opacity="${o.op ?? 0.7}" mask="url(#${o.id})"/>`
  const svg = o.act && o.t0 !== undefined ? o.act.on(cover, o.t0, o.t1 ?? o.act.T - o.act.off, { fade: 0.15 }) : cover
  return { svg: `<defs>${mask}</defs>${svg}`, css: '' }
}

/**
 * A flicker for a light (put `class="<cls>"` on the lit group): an irregular, seeded pattern of dips, in steps, every
 * `period` s. `min` is the darkest dip. Reduced motion: steady at full.
 */
export const flicker = (cls: string, o: { seed?: string; period?: number; min?: number; dips?: number } = {}): string => {
  const R = rng(o.seed ?? cls)
  const n = o.dips ?? 3
  const min = o.min ?? 0.45
  const rows: string[] = ['0%{opacity:1}']
  const at = Array.from({ length: n }, () => R() * 90).sort((a, b) => a - b)
  for (const t of at) rows.push(`${r1(t)}%{opacity:${r3(min + R() * (1 - min) * 0.5)}}`, `${r1(t + 1.5 + R() * 3)}%{opacity:1}`)
  rows.push('100%{opacity:1}')
  return `.${cls}{animation:${cls} ${r3(o.period ?? 2.4)}s steps(1) infinite}@keyframes ${cls}{${rows.join('')}}@media (prefers-reduced-motion: reduce){.${cls}{animation:none}}`
}

/**
 * A god-ray: a cone of light from (x, y), `len` long, `spread` px wide at its foot, turned `angle` deg (0 = straight
 * down), fading along its length. `pulse` s breathes its opacity in steps (idle-safe); omit for a still ray.
 */
export const godRay = (o: { id: string; x: number; y: number; len: number; spread: number; angle?: number; color?: string; op?: number; pulse?: number }): Lit => {
  const g = `<linearGradient id="${o.id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.color ?? '#FFF4C2'}" stop-opacity="${o.op ?? 0.35}"/><stop offset="1" stop-color="${o.color ?? '#FFF4C2'}" stop-opacity="0"/></linearGradient>`
  const cone = `<path d="M-2 0h4L${r1(o.spread / 2)} ${r1(o.len)}H${r1(-o.spread / 2)}z" fill="url(#${o.id}g)"/>`
  const svg = `<defs>${g}</defs><g transform="translate(${r1(o.x)} ${r1(o.y)}) rotate(${o.angle ?? 0})"><g${o.pulse ? ` class="${o.id}"` : ''}>${cone}</g></g>`
  const css = o.pulse ? `.${o.id}{animation:${o.id} ${r3(o.pulse)}s steps(8) infinite}@keyframes ${o.id}{50%{opacity:.6}}@media (prefers-reduced-motion: reduce){.${o.id}{animation:none}}` : ''
  return { svg, css }
}
