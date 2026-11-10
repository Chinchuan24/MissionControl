// "3D" without 3D: how every turning object in the mod is shown.
//   turntable  an 8-view turnaround (Blender renders, cut to `Sprite`s) played as a rotating prop or bust: a speed, a
//              direction, a still view. Symmetric objects pass 5 views and `mirror`: views 5-7 are 3-1 flipped (37% less).
//   spin       the same views as frame windows for an act's actor (a shield thrown end over end, a bust turning once).
//   voxel      a sprite with extruded depth: its silhouette drawn 3-4 times behind it, 1 px apart, each darker.
//   flip/tilt  a 2D card turning over (scaleX through 0, front to back) or swaying in fake perspective (skew + scale).
// Rect-path frames only (probe: no PNG frames, no CSS 3D). Endless loops are `steps(1)` (idle-safe) and `phased`.
//
//   const bank = new FrameBank('shd', 5); SHIELD.forEach((sp, i) => bank.add(`v${i}`, sp))
//   const t = turntable(bank, { id: 'shdT', views: ['v0','v1','v2','v3','v4'], mirror: true, x, y, period: 2.4, dir: 1, still: 0 })
//   svg = `<style>${t.css}</style><defs>${bank.defs()}</defs>${t.svg}`
import type { FrameBank } from './frames'
import type { Seg } from './timeline'
import { Act, r1, r3 } from './timeline'

/** A view: a pose key, mirrored or not. */
export type View = { key: string; dir: 1 | -1 }
/** The full turn from `keys` (yaw order, 0 = front). `mirror`: keys are 0..180 degrees, the far side is them flipped. */
export const turnViews = (keys: string[], mirror = false): View[] => {
  const v: View[] = keys.map(key => ({ key, dir: 1 }))
  if (!mirror || keys.length < 3) return v
  for (let i = keys.length - 2; i >= 1; i--) v.push({ key: keys[i] as string, dir: -1 })
  return v
}

export type Turntable = { svg: string; css: string; views: View[] }
/**
 * A prop or bust turning in place at (x, y): every view is a <use> toggled by one stepped loop of `period` s per turn.
 * `dir` 1 turns through the views in order, -1 the other way. `still`: the view drawn under reduced motion (and when
 * `period` is 0). `shadow`: a ground ellipse under it, `rx` wide, that narrows as the object turns edge-on (needs `widths`,
 * the relative width of each view, else it holds). Cost: the views' defs once + ~110 chars per view.
 */
export const turntable = (bank: FrameBank, o: { id: string; views: string[] | View[]; mirror?: boolean; x: number; y: number; sc?: number; period?: number; dir?: 1 | -1; still?: number; shadow?: { rx: number; dy: number; color?: string; op?: number; widths?: number[] } }): Turntable => {
  const views = typeof o.views[0] === 'string' ? turnViews(o.views as string[], o.mirror) : (o.views as View[])
  const n = views.length
  const sc = o.sc ?? 1
  const still = Math.max(0, Math.min(n - 1, o.still ?? 0))
  const period = o.period ?? 2.4
  const shadowOf = (k: number): string => {
    const s = o.shadow
    if (!s) return ''
    const w = s.widths?.[k] ?? 1
    return `<ellipse cx="${r1(o.x)}" cy="${r1(o.y + s.dy)}" rx="${r1(s.rx * Math.max(0.25, w))}" ry="${r1(Math.max(1, s.rx * 0.22))}" fill="${s.color ?? '#000000'}" opacity="${s.op ?? 0.3}"/>`
  }
  if (period <= 0 || n < 2) {
    const v = views[still] as View
    return { svg: `${shadowOf(still)}${bank.use(v.key, o.x, o.y, v.dir, sc)}`, css: '', views }
  }
  // The order the loop plays: from the still view, turning `dir`. Drawn first = shown under reduced motion.
  const dir = o.dir ?? 1
  const order = Array.from({ length: n }, (_, i) => (((still + dir * i) % n) + n) % n)
  const hold = period / n
  const cls = o.id
  const css = `@keyframes ${cls}{0%{opacity:1}${r3(100 / n)}%,100%{opacity:0}}@media (prefers-reduced-motion: reduce){.${cls}{animation:none!important}}`
  const svg = order.map((k, i) => {
    const v = views[k] as View
    return `<g class="${cls}" style="animation:${cls} ${r3(period)}s steps(1) infinite ${r3((i - n) * hold)}s"${i ? ' opacity="0"' : ''}>${shadowOf(k)}${bank.use(v.key, o.x, o.y, v.dir, sc)}</g>`
  }).join('')
  return { svg, css, views }
}

/**
 * The views as pose windows for `Act.actor`: one full turn every `period` s from t0 to t1 (`dir` -1 turns back).
 * A thrown shield: `act.actor('shield', spin(views, 1.2, 2.0, 0.4), path)`.
 */
export const spin = (views: View[], t0: number, t1: number, period: number, dir: 1 | -1 = 1, from = 0): Seg[] => {
  const n = views.length
  const hold = period / n
  const out: Seg[] = []
  for (let t = t0, i = 0; t < t1 - 1e-6; t += hold, i++) {
    const v = views[(((from + dir * i) % n) + n) % n] as View
    out.push([r3(t), r3(Math.min(t1, t + hold)), v.key, v.dir])
  }
  return out
}

const hex = (h: string): [number, number, number] => { const m = /^#?([\da-f]{6})$/i.exec(h); const v = m ? (m[1] as string) : '000000'; return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16)) as [number, number, number] }
/** `color` moved toward black by `f` (0..1). */
export const darken = (color: string, f: number): string => `#${hex(color).map(c => Math.round(c * (1 - f)).toString(16).padStart(2, '0')).join('')}`

/**
 * A voxel / extruded sprite: the pose's silhouette drawn `depth` times behind it, each one sprite pixel further along
 * (dx, dy) and darker, then the pose on top. `side` is the extrusion's colour (its front-most layer). Static; for a
 * wobble, put two voxels with opposite dx in a flipbook. Cost: one silhouette def + ~100 chars per layer.
 */
export const voxel = (bank: FrameBank, key: string, x: number, y: number, o: { side: string; depth?: number; dx?: number; dy?: number; shade?: number; dir?: 1 | -1; sc?: number } = { side: '#333333' }): string => {
  const sil = bank.sil(key)
  const depth = Math.max(1, Math.min(6, o.depth ?? 3))
  const sc = o.sc ?? 1
  const dir = o.dir ?? 1
  const place = bank.anchor(key, dir, sc)
  let s = ''
  for (let k = depth; k >= 1; k--) {
    const ox = r3(x + (o.dx ?? 1) * k * sc)
    const oy = r3(y + (o.dy ?? 1) * k * sc)
    s += `<use href="#${sil}" fill="${darken(o.side, (o.shade ?? 0.12) * (k - 1))}" transform="translate(${ox} ${oy}) ${place}"/>`
  }
  return `${s}${bank.use(key, x, y, dir, sc)}`
}

export type Card = { svg: string; css: string }
/**
 * A card flip: `front` turns edge-on (scaleX to 0, darkening), `back` turns in from edge-on. The card is w x h at (x, y)
 * (its top-left). Act-bound (`act`, `t`: once, taking `d` s) or an idle loop (`period`: front, flip, back, flip back).
 * Reduced motion: the front, still.
 */
export const flip = (o: { id: string; x: number; y: number; w: number; h: number; front: string; back: string; d?: number; act?: Act; t?: number; period?: number; shade?: string }): Card => {
  const cx = r1(o.x + o.w / 2)
  const cy = r1(o.y + o.h / 2)
  const d = o.d ?? 0.32
  const dim = `<rect x="${r1(o.x)}" y="${r1(o.y)}" width="${o.w}" height="${o.h}" fill="${o.shade ?? '#000000'}"/>`
  const side = (inner: string, cls: string, style: string): string => `<g class="${cls}" style="transform-origin:${cx}px ${cy}px;${style}">${inner}</g>`
  if (o.act && o.t !== undefined) {
    const a = o.act
    const t = o.t
    const end = a.T - a.off
    const fr = a.kf(`${o.front}${a.kf(dim, [[0, 'opacity:0'], [t, 'opacity:0'], [t + d / 2, 'opacity:.5'], [end, 'opacity:.5']])}`, [[0, 'transform:scaleX(1)'], [t, 'transform:scaleX(1)'], [t + d / 2, 'transform:scaleX(0)'], [end, 'transform:scaleX(0)']], { origin: `${cx}px ${cy}px`, ease: 'cubic-bezier(.5,0,1,1)' })
    const bk = a.kf(`${o.back}${a.kf(dim, [[0, 'opacity:.5'], [t + d / 2, 'opacity:.5'], [t + d, 'opacity:0'], [end, 'opacity:0']])}`, [[0, 'transform:scaleX(0)'], [t + d / 2, 'transform:scaleX(0)'], [t + d, 'transform:scaleX(1)'], [end, 'transform:scaleX(1)']], { origin: `${cx}px ${cy}px`, ease: 'cubic-bezier(0,0,.5,1)' })
    return { svg: `${fr}${bk}`, css: '' }
  }
  // The loop: front for 40%, flip (5% each half), back for 40%, flip back. Stepped at 12 fps through the turn.
  const P = o.period ?? 8
  const q = r3(((d / 2) / P) * 100)
  const css = `@keyframes ${o.id}f{0%,40%{transform:scaleX(1)}${r3(40 + q)}%,${r3(90 - q)}%{transform:scaleX(0)}90%,100%{transform:scaleX(1)}}@keyframes ${o.id}b{0%,${r3(40 + q)}%{transform:scaleX(0)}${r3(40 + 2 * q)}%,${r3(90 - 2 * q)}%{transform:scaleX(1)}${r3(90 - q)}%,100%{transform:scaleX(0)}}.${o.id}f,.${o.id}b{animation:${o.id}f ${P}s steps(${Math.max(4, Math.round(P * 12))}) infinite}.${o.id}b{animation-name:${o.id}b}@media (prefers-reduced-motion: reduce){.${o.id}f,.${o.id}b{animation:none!important}.${o.id}b{display:none}}`
  return { svg: `${side(o.front, `${o.id}f`, '')}${side(o.back, `${o.id}b`, 'transform:scaleX(0)')}`, css }
}

/**
 * A card tilt in fake perspective: the card sways `deg` degrees (skewY with a matching scaleX squeeze, the near edge
 * taller) every `period` s, with an optional glare band crossing it. Idle-safe (steps at <= 12 fps). Reduced motion: flat.
 */
export const tilt = (o: { id: string; x: number; y: number; w: number; h: number; svg: string; deg?: number; period?: number; glare?: string }): Card => {
  const deg = o.deg ?? 4
  const P = o.period ?? 6
  const cx = r1(o.x + o.w / 2)
  const cy = r1(o.y + o.h / 2)
  const sq = r3(Math.cos((deg * 3 * Math.PI) / 180))
  const css = `@keyframes ${o.id}{0%,100%{transform:skewY(${-deg}deg) scaleX(${sq})}50%{transform:skewY(${deg}deg) scaleX(${sq})}}.${o.id}{transform-origin:${cx}px ${cy}px;animation:${o.id} ${P}s steps(${Math.max(4, Math.round(P * 8))}) infinite}@media (prefers-reduced-motion: reduce){.${o.id}{animation:none!important;transform:none}}`
  const glare = o.glare ? `<rect x="${r1(o.x)}" y="${r1(o.y)}" width="${o.w}" height="${o.h}" fill="${o.glare}" opacity=".12"/>` : ''
  return { svg: `<g class="${o.id}">${o.svg}${glare}</g>`, css }
}
