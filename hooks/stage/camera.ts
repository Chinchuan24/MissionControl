// The camera: what moves the WHOLE panel during an act. Shake (tiers 1-4), push/zoom about a point, pan, a colour
// grade, and the hit-freeze. `wrap(inner)` puts the panel's content inside three nested groups (grade > move > shake),
// each with its own pinned keyframes, so the three never fight over one `transform`. Self-contained: it carries its own
// <style>, so it works around a whole panel Svg whether or not the act layer is in the same Svg.
//
// Rules (crew): shake 1-4 px only and only inside acts; never shake or zoom the working numbers' panel for more than a
// beat; grades are filters, so they run only inside short acts, never at rest. Reduced motion: the camera does not move.
//
//   const cam = new Camera(act)
//   cam.shake(1.0, 3, 0.22); cam.push(2, 2.4, 1.15, 300, 60, 'snap'); cam.reset(3.6, 4, 'settle'); cam.grade(2, 3, 'grayscale(1)')
//   panelSvg = root + cam.wrap(content) + '</svg>'
import { ease } from './ease'
import type { Ease } from './ease'
import { pin } from '../smooth'
import { r1, r3 } from './timeline'
import type { Act } from './timeline'

/** The four shake tiers, lifted from THE FIGHT: 1 px tap, 2 px knock, 3 px hit, 4 px slam. */
export const SHAKE_CSS = `@keyframes sg-sh1{0%{transform:translate(1px,0)}34%{transform:translate(-1px,1px)}67%{transform:translate(1px,-1px)}100%{transform:none}}
@keyframes sg-sh2{0%{transform:translate(2px,0)}25%{transform:translate(-2px,1px)}50%{transform:translate(1px,-1px)}75%{transform:translate(-1px,0)}100%{transform:none}}
@keyframes sg-sh3{0%{transform:translate(3px,1px)}20%{transform:translate(-3px,-1px)}40%{transform:translate(2px,1px)}60%{transform:translate(-2px,0)}80%{transform:translate(1px,0)}100%{transform:none}}
@keyframes sg-sh4{0%{transform:translate(4px,0)}17%{transform:translate(-4px,2px)}34%{transform:translate(3px,-2px)}51%{transform:translate(-2px,1px)}68%{transform:translate(1px,-1px)}85%{transform:translate(-1px,0)}100%{transform:none}}`

type View = { s: number; cx: number; cy: number; dx: number; dy: number }
const xf = (v: View): string => (v.s === 1 && !v.dx && !v.dy ? 'none' : `translate(${r1(v.cx * (1 - v.s) + v.dx)}px,${r1(v.cy * (1 - v.s) + v.dy)}px) scale(${r3(v.s)})`)

export class Camera {
  private shakes: [number, 1 | 2 | 3 | 4, number][] = []
  private keys: [number, View, string][] = []
  private grades: [number, number, string, number][] = []
  private view: View = { s: 1, cx: 0, cy: 0, dx: 0, dy: 0 }
  constructor(readonly act: Act) {}

  /** A shake of `tier` px for `s` seconds at act time `t` (tiers stack in time, never overlap in one frame). */
  shake(t: number, tier: 1 | 2 | 3 | 4, s = 0.2): this { this.shakes.push([this.act.warp(t), tier, s]); return this }
  private move(t0: number, t1: number, to: Partial<View>, e: Ease | string): this {
    this.keys.push([this.act.warp(t0), { ...this.view }, ease(e)])
    this.view = { ...this.view, ...to }
    this.keys.push([this.act.warp(t1), { ...this.view }, ease(e)])
    return this
  }
  /** Push in (scale > 1) or pull out about (cx, cy), from t0 to t1. */
  push(t0: number, t1: number, scale: number, cx: number, cy: number, e: Ease | string = 'settle'): this { return this.move(t0, t1, { s: scale, cx, cy }, e) }
  /** Pan the view by (dx, dy) px, from t0 to t1 (a whip pan: 'whip'). */
  pan(t0: number, t1: number, dx: number, dy: number, e: Ease | string = 'whip'): this { return this.move(t0, t1, { dx, dy }, e) }
  /** Back to the plain framing. */
  reset(t0: number, t1: number, e: Ease | string = 'settle'): this { return this.move(t0, t1, { s: 1, dx: 0, dy: 0 }, e) }
  /** A colour grade (any CSS filter list: 'grayscale(1)', 'sepia(.8) contrast(1.2)', 'invert(1)') from t0 to t1, faded over `fade` s. */
  grade(t0: number, t1: number, filter: string, fade = 0.15): this { this.grades.push([this.act.warp(t0), this.act.warp(t1), filter, fade]); return this }
  /** The hit-freeze: the act holds for `s` s at `t` (every path pauses; see Act.freeze), with an optional 1-px shake. */
  freeze(t: number, s = 0.07, tap = true): this { this.act.freeze(t, s); if (tap) this.shake(t, 1, s); return this }

  /** Anything to draw? */
  get isEmpty(): boolean { return !this.shakes.length && !this.keys.length && !this.grades.length }

  /** The shake list as animation longhands (for a wrapper the caller already has). */
  shakeStyle(): string {
    if (!this.shakes.length) return ''
    const sh = [...this.shakes].sort((a, b) => a[0] - b[0])
    const at = pin(this.act.at)
    return `animation-name:${sh.map(s => `sg-sh${s[1]}`).join(',')};animation-duration:${sh.map(s => `${r3(s[2])}s`).join(',')};animation-timing-function:steps(1);animation-fill-mode:none;animation-delay:${sh.map(s => `calc(${at} + ${r3(this.act.off + s[0])}s)`).join(',')}`
  }

  /** The panel's content inside the camera. Returns `inner` untouched when the camera does nothing. */
  wrap(inner: string): string {
    if (this.isEmpty) return inner
    const p = `${this.act.p}C`
    const T = r3(this.act.T)
    const at = `calc(${pin(this.act.at)} + 0s)`
    let css = ''
    let open = ''
    let close = ''
    const track = (cls: string, rows: [number, string][]): void => {
      css += `.${cls}{animation:${cls} ${T}s linear both;animation-delay:${at}}@keyframes ${cls}{${rows.map(([q, v]) => `${q}%{${v}}`).join('')}}`
      open += `<g class="${cls}">`
      close = `</g>${close}`
    }
    if (this.grades.length) {
      const rows: [number, string][] = [[0, 'filter:none']]
      for (const [a, b, f, fd] of [...this.grades].sort((x, y) => x[0] - y[0])) rows.push([this.act.pcw(a), 'filter:none'], [this.act.pcw(a + fd), `filter:${f}`], [this.act.pcw(Math.max(a + fd, b - fd)), `filter:${f}`], [this.act.pcw(b), 'filter:none'])
      rows.push([100, 'filter:none'])
      track(`${p}g`, rows)
    }
    if (this.keys.length) {
      const ks = [...this.keys].sort((a, b) => a[0] - b[0])
      const first = ks[0] as [number, View, string]
      const last = ks[ks.length - 1] as [number, View, string]
      const rows: [number, string][] = [[0, `transform:${xf(first[1])}`]]
      for (const [w, v, e] of ks) rows.push([this.act.pcw(w), `transform:${xf(v)};animation-timing-function:${e}`])
      rows.push([100, `transform:${xf(last[1])}`])
      track(`${p}m`, rows)
    }
    if (this.shakes.length) {
      css += SHAKE_CSS.replace(/\n/g, '')
      open += `<g class="${p}s" style="${this.shakeStyle()}">`
      close = `</g>${close}`
    }
    css += `@media (prefers-reduced-motion: reduce){.${p}g,.${p}m,.${p}s{animation:none!important}}`
    return `<style>${css}</style>${open}${inner}${close}`
  }
}
