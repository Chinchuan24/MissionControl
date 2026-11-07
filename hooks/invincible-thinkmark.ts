// Invincible: the "THINK, MARK" cutscene. Typing `think, mark` plays a 65 s pixel-art scene that takes over the pane's three cards
// (COVER STORY carries the picture inside letterbox bars, GDA WALL and THE PAGE carry the ambient light, the chapter ticks and a
// playhead); the band shows only a slim "NOW PLAYING" strip with a running clock. Every other act yields for the whole 65 s.
// Same technique as the fight and the showdown: ONE CSS duration (65 s) with keyframes in percent and ONE pinned delay
// (`--q: @@T<start>@@`), so any redraw resumes in place and the Svg carries the whole timeline: the pane may not redraw at all.
// The sprites come from invincible-thinkmark-sprites.ts, are cut once per Svg into <defs> (rectangles, few colours) and are reused
// with transforms (push-ins, pans, shakes). Reduced motion: a still title card for the same 65 s and no animation.
// Fan homage; redrawn original pixel art, at most six short speech bubbles. Cartoon-faithful blood is in the sprites.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Sprite } from './cast'
import { C, COND, MONO, PROPS, clamp, condW, pal, pin, r1, sfx, spH, spW } from './invincible'
import type { Era } from './invincible'
import { rectPaths } from './invincible-fight'
import { TM } from './invincible-thinkmark-sprites'
import type { TmName } from './invincible-thinkmark-sprites'
import type { ExtraArgs } from './themes'

export const TM_MS = 65_000
export const TM_S = TM_MS / 1000
/** The kind of `INV_FX` the typed trigger sets (the 95 % warning keeps kind `think`, the 3 s drop-in). */
export const TM_KIND = 'scene'

type Fx = { kind: string; at: number } | undefined
/** The cutscene is playing at `at` (or starts within a second). */
export const thinkMarkLive = (fx: Fx, at: number): boolean => !!fx && fx.kind === TM_KIND && fx.at > 0 && at >= fx.at - 1000 && at < fx.at + TM_MS
/** The cutscene's window touches [a0, a1): other acts planned in that span must not play. */
export const thinkMarkHolds = (fx: Fx, a0: number, a1: number): boolean => !!fx && fx.kind === TM_KIND && fx.at > 0 && a0 < fx.at + TM_MS && a1 > fx.at - 1000
/** What a hidden replay sets as the effect to play the cutscene at `at`. */
export const thinkMarkFx = (at: number): { kind: string; at: number } => ({ kind: TM_KIND, at })

// ---------------------------------------------------------------- the storyboard
type Shot = { t0: number; t1: number; glow: string }
const INK = '#05060A'
const DUSK = '#3E3550'
const SHOTS: Shot[] = [
  { t0: 0, t1: 5.25, glow: DUSK }, { t0: 5.25, t1: 19.75, glow: '#5AA8F0' }, { t0: 19.75, t1: 24.75, glow: '#8E1C22' }, { t0: 24.75, t1: 26.25, glow: '#C9A227' },
  { t0: 26.25, t1: 32.5, glow: '#5AA8F0' }, { t0: 32.5, t1: 39.75, glow: '#C9A227' }, { t0: 39.75, t1: 47, glow: '#5AA8F0' }, { t0: 47, t1: 52, glow: DUSK },
  { t0: 52, t1: 55.75, glow: '#8E1C22' }, { t0: 55.75, t1: 56.5, glow: '#C9A227' }, { t0: 56.5, t1: 63, glow: DUSK }, { t0: 63, t1: 65, glow: '#5AA8F0' },
]
/** Five short bubbles from the artist's storyboard (a sixth, at the hands, is left silent on purpose). [from, to, text, x, y (fractions), tail side]. */
export const BUBBLES: [number, number, string, number, number, 'l' | 'r'][] = [
  [1, 4.5, 'THINK! USE YOUR HEAD FOR ONCE!', 0.04, 0.07, 'r'],
  [8, 12, 'EVERYONE YOU KNOW WILL BE GONE.', 0.05, 0.07, 'r'],
  [20, 24, 'WHAT WILL YOU HAVE LEFT?', 0.5, 0.07, 'l'],
  [34, 38.5, "...EVEN THEN... I'D HAVE MY DAD.", 0.04, 0.07, 'r'],
  [61, 62.5, '...NO.', 0.5, 0.1, 'l'],
]
export const STILL_LINE = "I'D STILL HAVE YOU."
const BLOOD = '#B0141C'

// ---------------------------------------------------------------- keyframe helpers (times in seconds of the 65 s)
const pc = (t: number): string => `${+((t / TM_S) * 100).toFixed(3)}%`
const kf = (name: string, frames: [number, string][]): string => {
  const f = [...frames].sort((a, b) => a[0] - b[0])
  return `@keyframes ${name}{${f.map(([t, v]) => `${pc(clamp(t, 0, TM_S))}{${v}}`).join('')}}`
}
const EPS = 0.001
/** Opacity windows [from, to]: 0 elsewhere (a hard cut, 1 ms). */
const win = (name: string, wins: [number, number][]): string => {
  const f: [number, string][] = wins[0] && wins[0][0] <= 0 ? [] : [[0, 'opacity:0']]
  for (const [a, b] of wins) {
    if (a > 0) f.push([a - EPS, 'opacity:0'])
    f.push([a, 'opacity:1'], [b - EPS, 'opacity:1'], [b, 'opacity:0'])
  }
  f.push([TM_S, 'opacity:0'])
  return kf(name, f)
}
const A = (name: string, inner: string, style = ''): string => `<g class="tm-a" style="animation-name:${name}${style ? `;${style}` : ''}">${inner}</g>`
const CSS = `.tm-a{animation-duration:${TM_S}s;animation-timing-function:linear;animation-fill-mode:both;animation-delay:var(--q)}.tm-still{display:none}
@keyframes tm-stay{0%,99%{opacity:1}100%{opacity:0;visibility:hidden}}
@media (prefers-reduced-motion: reduce){.tm-anim{display:none}.tm-still{display:block;animation:tm-stay ${TM_S}s steps(1) both;animation-delay:var(--q)}}`

// ---------------------------------------------------------------- the picture (COVER STORY)
type Cam = { s: number; x?: number; y?: number }
const camT = (c: Cam): string => `transform:translate(${r1(c.x ?? 0)}px,${r1(c.y ?? 0)}px) scale(${+c.s.toFixed(4)})`

class Pic {
  css = ''
  used = new Set<TmName>()
  n = 0
  constructor(readonly id: string, readonly PW: number, readonly PH: number) {}
  name(tag: string): string {
    return `${this.id}${tag}${this.n++}`
  }
  /** A group shown only in `wins`. */
  show(wins: [number, number][], inner: string): string {
    const nm = this.name('o')
    this.css += win(nm, wins)
    return A(nm, inner)
  }
  /** A camera move from t0 to t1 about (ox, oy), holding either side. */
  cam(t0: number, t1: number, from: Cam, to: Cam, ox: number, oy: number, inner: string): string {
    const nm = this.name('c')
    this.css += kf(nm, [[0, camT(from)], [t0, camT(from)], [t1, camT(to)], [TM_S, camT(to)]])
    return A(nm, inner, `transform-origin:${r1(ox)}px ${r1(oy)}px`)
  }
  ref(n: TmName): string {
    this.used.add(n)
    return `#${this.id}${n.slice(3).toLowerCase()}`
  }
  /** A sprite `h` tall, centred on cx, with its feet (bottom) at by. */
  put(n: TmName, cx: number, by: number, h: number, extra = ''): string {
    const sp: Sprite = TM[n]
    const s = h / spH(sp)
    return `<use href="${this.ref(n)}" transform="translate(${r1(cx - (spW(sp) * s) / 2)} ${r1(by - h)}) scale(${+s.toFixed(4)})"${extra}/>`
  }
  /** A backdrop scaled to cover the picture, bottom or middle aligned. */
  cover(n: TmName, align: 'bottom' | 'middle' = 'bottom', over = 1): string {
    const sp: Sprite = TM[n]
    const s = Math.max(this.PW / spW(sp), this.PH / spH(sp)) * over
    return `<use href="${this.ref(n)}" transform="translate(${r1((this.PW - spW(sp) * s) / 2)} ${r1(align === 'bottom' ? this.PH - spH(sp) * s : (this.PH - spH(sp) * s) / 2)}) scale(${+s.toFixed(4)})"/>`
  }
  defs(K: number): string {
    return [...this.used].map(n => `<g id="${this.ref(n).slice(1)}">${cut(n, K)}</g>`).join('')
  }
}

// The sprites are drawn exactly as the artist made them: full resolution, full palette, cut once per draw into <defs> as merged
// rectangles. What keeps a draw small is time, not quality: a draw carries only the CURRENT shot and, when both fit, the NEXT one.
const CUTS = new Map<string, string>()
const cut = (n: TmName, K: number): string => {
  const key = `${n}|${K}`
  const hit = CUTS.get(key)
  if (hit !== undefined) return hit
  const out = rectPaths(TM[n], K)
  CUTS.set(key, out)
  return out
}

/** Camera shake events [time, amplitude in output px at a 480 px picture]: six jolts of 60 ms, decaying. */
const SHAKES: [number, number][] = [[2.75, 2], [6, 2], [8, 2], [14.5, 2], [20, 3], [23.25, 3], [52, 7], [64.5, 4]]
const shakeKf = (name: string, scale: number): string => {
  const f: [number, string][] = [[0, 'transform:none']]
  for (const [t, a] of SHAKES) {
    const amp = a * scale
    f.push([t - EPS, 'transform:none'])
    for (let i = 0; i < 6; i++) {
      const k = amp * (1 - i / 6)
      f.push([t + i * 0.06, `transform:translate(${r1(i % 2 ? -k : k)}px,${r1(i % 2 ? k * 0.5 : -k * 0.5)}px)`])
    }
    f.push([t + 0.36, 'transform:none'])
  }
  return kf(name, f)
}

const pool = (cx: number, cy: number, rx: number, ry: number, cs: number): string => {
  let d = ''
  let hi = ''
  for (let y = -ry; y <= ry; y += cs) {
    for (let x = -rx; x <= rx; x += cs) {
      const e = (x / rx) ** 2 + (y / ry) ** 2
      const wob = 0.12 * Math.sin(x * 0.37 + y * 0.91)
      if (e + wob > 1) continue
      const sq = `M${r1(cx + x)} ${r1(cy + y)}h${cs}v${cs}h-${cs}z`
      if (e < 0.18 && (Math.round(x / cs) + Math.round(y / cs)) % 3 === 0) hi += sq
      else d += sq
    }
  }
  return `<path d="${d}" fill="${BLOOD}"/><path d="${hi}" fill="#D8323A"/>`
}

const bubble = (p: Pic, [t0, t1, text, fx, fy, tail]: (typeof BUBBLES)[number]): string => {
  const size = clamp(p.PW / 40, 14, 18)
  const w = condW(text, size, 0.8) + 20
  const h = size + 14
  const x = clamp(p.PW * fx, 6, p.PW - w - 6)
  const y = p.PH * fy
  const nm = p.name('b')
  p.css += kf(nm, [[0, 'opacity:0;transform:scale(.85)'], [t0 - EPS, 'opacity:0;transform:scale(.85)'], [t0, 'opacity:1;transform:scale(.85)'], [t0 + 0.1, 'opacity:1;transform:scale(1.06)'], [t0 + 0.2, 'transform:scale(1)'], [t1 - 0.01, 'opacity:1;transform:scale(1)'], [t1 + 0.2, 'opacity:0;transform:scale(1)'], [TM_S, 'opacity:0;transform:scale(1)']])
  const tx = tail === 'r' ? x + w * 0.18 : x + w * 0.82
  const tail_ = `<path d="M${r1(tx)} ${r1(y + h - 1)}l${tail === 'r' ? -6 : 6} 9 ${tail === 'r' ? 13 : -13} -9z" fill="${PROPS.white}" stroke="${PROPS.ink}" stroke-width="1.5" stroke-linejoin="round"/><rect x="${r1(tx - 6)}" y="${r1(y + h - 3)}" width="14" height="3" fill="${PROPS.white}"/>`
  return A(nm, `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="3" fill="${PROPS.white}" stroke="${PROPS.ink}" stroke-width="1.5"/>${tail_}${C(x + 10, y + h - 8, text, size, PROPS.ink, 'letter-spacing=".8"')}`, `transform-origin:${r1(x + w / 2)}px ${r1(y + h)}px`)
}

/** The shot playing `sec` seconds in (an index of SHOTS). */
export const shotAt = (sec: number): number => {
  let i = 0
  SHOTS.forEach((sh, k) => { if (sec >= sh.t0) i = k })
  return i
}
/** When the pane must be drawn again: just after every cut (80 ms) and once more just after the end, as epoch ms. A draw carries the shot playing and, when it fits, the next. */
export const thinkMarkRedraws = (start: number): number[] => [...SHOTS.slice(1).map(sh => Math.round(start + sh.t0 * 1000 + 80)), Math.round(start + TM_MS + 80)]

/**
 * The picture for COVER STORY's card, for the shots in `which` (one, or two in a row). The art lives on the artist's 160 x 90
 * canvas (`k` output px per canvas px); shots are laid out in canvas units, the bubbles in output px. Wide shots share the
 * backdrop with parallax in the push-ins. The LAST shot of the draw holds its final frame until the next draw replaces it, so a
 * redraw that comes late changes nothing but the moment of the cut.
 */
const picture = (id: string, PW: number, PH: number, px0: number, py: number, K: number, which: number[]): { body: string; defs: string; css: string } => {
  const p = new Pic(id, PW, PH)
  const k = PW / 160
  const CH = PH / k
  const cx = 80
  const last = which[which.length - 1] as number
  /** End of a window in shot `i`: it holds to the end of the film when the shot is the draw's last. */
  const E = (i: number, t: number): number => (i === last ? TM_S : t)
  const at = (n: TmName, x: number, y: number, s = 1): string => `<use href="${p.ref(n)}" transform="translate(${r1(x)} ${r1(y)}) scale(${+s.toFixed(4)})"/>`
  const dim = (n: TmName): [number, number] => [spW(TM[n]), spH(TM[n])]
  const fill = (n: TmName, s?: number, align: 'bottom' | 'middle' = 'bottom'): string => {
    const [w, h] = dim(n)
    const sc = s ?? Math.max(160 / w, 90 / h)
    return at(n, (160 - w * sc) / 2, align === 'bottom' ? 90 - h * sc : (90 - h * sc) / 2, sc)
  }
  const stand = (n: TmName, x: number, s: number): string => {
    const [w, h] = dim(n)
    return at(n, x - (w * s) / 2, 90 - h * s, s)
  }
  /** Frames of shot `i` in turn: the shot's last frame holds when the draw ends on this shot. */
  const frames = (i: number, list: [TmName, number, number][], put: (n: TmName) => string): string => list.map(([n, a, b], j) => p.show([[a, j === list.length - 1 ? E(i, b) : b]], put(n))).join('')
  const markDown = `<g transform="rotate(-17 112 48)">${at('TM_MARK_DOWN', 70, 40)}</g>`
  const bg = (c: string): string => `<rect width="160" height="${r1(CH)}" fill="${c}"/>`
  const wide = (i: number, from: number, to: number, figs: string): string => {
    const { t0, t1 } = SHOTS[i] as Shot
    return p.show([[t0, E(i, t1)]],
      p.cam(t0, t1, { s: from }, { s: 1 + (to - 1) * 0.4 }, cx, 50, fill('TM_BG_SKY')) +
      p.cam(t0, t1, { s: from }, { s: 1 + (to - 1) * 0.8 }, cx, 60, fill('TM_BG_ROCKS')) +
      p.cam(t0, t1, { s: from }, { s: to }, cx, 60, markDown + figs))
  }
  const kneel = (i: number, list: [TmName, number, number][]): string => frames(i, list, n => (n === 'TM_OMNI_KNEEL_A' ? at(n, 30, 26) : n === 'TM_OMNI_KNEEL_B' ? at(n, 34, 32) : at(n, 42, 34)))
  const kid = (n: TmName): string => at(n, 0, (90 - dim(n)[1] * 1.25) / 2, 1.25)
  const B: Record<number, () => string> = {}
  B[0] = () => {
    const { t0, t1 } = SHOTS[0] as Shot
    return p.show([[t0, E(0, t1)]], bg(DUSK) + p.cam(t0, t1, { s: 1 }, { s: 1.05 }, 120, 45, at('TM_OMNI_CU_SHOUT', 0, 90 - dim('TM_OMNI_CU_SHOUT')[1] * (4 / 3), 4 / 3)))
  }
  B[1] = () => wide(1, 1, 1, kneel(1, [['TM_OMNI_KNEEL_C', 5.25, 6], ['TM_OMNI_KNEEL_A', 6, 8], ['TM_OMNI_KNEEL_B', 8, 8.75], ['TM_OMNI_KNEEL_C', 8.75, 14.5], ['TM_OMNI_KNEEL_B', 14.5, 16.25], ['TM_OMNI_KNEEL_C', 16.25, 18], ['TM_OMNI_KNEEL_B', 18, 19.75]]))
  B[2] = () => {
    const { t0, t1 } = SHOTS[2] as Shot
    return p.show([[t0, E(2, t1)]], bg('#4A2530') + p.cam(t0, t1, { s: 1 }, { s: 1.06 }, cx, 45, fill('TM_OMNI_ECU_YELL', 160 / 132, 'middle')))
  }
  const kidShot = (i: number) => (): string => {
    const { t0, t1 } = SHOTS[i] as Shot
    return p.show([[t0, E(i, t1)]], kid('TM_MARK_CU'))
  }
  B[3] = kidShot(3)
  B[4] = () => wide(4, 1, 1, kneel(4, [['TM_OMNI_KNEEL_C', 26.25, 30], ['TM_OMNI_KNEEL_A', 30, 31], ['TM_OMNI_KNEEL_C', 31, 32.5]]))
  B[5] = () => {
    const { t0, t1 } = SHOTS[5] as Shot
    const f: [TmName, number, number][] = []
    for (let t = t0; t < t1 - 1e-6; t += 0.5) f.push([t >= 34 && t < 38.5 && Math.round((t - 34) / 0.5) % 2 === 1 ? 'TM_MARK_CU_TALK' : 'TM_MARK_CU', t, Math.min(t + 0.5, t1)])
    const merged: [TmName, number, number][] = []
    for (const e of f) { const l = merged[merged.length - 1]; if (l && l[0] === e[0] && Math.abs(l[2] - e[1]) < 1e-6) l[2] = e[2]; else merged.push([...e]) }
    const drip = (j: number, x: number): string => {
      const nm = p.name('d')
      const g: [number, string][] = [[0, 'opacity:0']]
      for (let t = 33.4 + j * 0.9; t < 39; t += 2.2) g.push([t - EPS, 'opacity:0;transform:none'], [t, 'opacity:1;transform:none'], [t + 1.5, 'opacity:0;transform:translateY(14px)'])
      p.css += kf(nm, g)
      return A(nm, `<rect x="${x}" y="52" width="1.6" height="3.4" fill="${BLOOD}"/>`)
    }
    return p.show([[t0, E(5, t1)]], p.cam(t0, t1, { s: 1 }, { s: 1.08 }, cx, 45, frames(5, merged, kid) + drip(0, 66) + drip(1, 96)))
  }
  B[6] = () => {
    const nm = p.name('r')
    p.css += kf(nm, [[0, 'transform:none'], [43.75, 'transform:none'], [45.25, 'transform:translateY(2px)'], [45.75, 'transform:translateY(-4px)'], [TM_S, 'transform:translateY(-4px)']])
    return wide(6, 1, 1.04, A(nm, p.show([[39.75, 45.75]], at('TM_OMNI_KNEEL_C', 42, 34)) + p.show([[45.75, E(6, 47)]], at('TM_OMNI_STAND', 48, 0))))
  }
  const med = (n: TmName): string => stand(n, cx, 1.3)
  const hands = (): string => at('TM_OMNI_HANDS', 0, 90 - dim('TM_OMNI_HANDS')[1] * (160 / 140), 160 / 140)
  B[7] = () => {
    const { t0, t1 } = SHOTS[7] as Shot
    const rise = p.name('h')
    p.css += kf(rise, [[0, 'transform:translateY(90px)'], [48.3, 'transform:translateY(90px)'], [48.75, 'transform:none'], [TM_S, 'transform:none']])
    return p.show([[t0, E(7, t1)]], fill('TM_BG_SKY') + p.show([[47, 48.75]], med('TM_OMNI_MED')) + p.show([[48.3, E(7, 52)]], A(rise, hands())))
  }
  B[8] = () => {
    const { t0, t1 } = SHOTS[8] as Shot
    const nm = p.name('p')
    p.css += kf(nm, [[0, 'transform:scale(.15)'], [52.3, 'transform:scale(.15)'], [55.5, 'transform:scale(1)'], [TM_S, 'transform:scale(1)']])
    return p.show([[t0, E(8, t1)]], p.cam(t0, t1, { s: 1.06 }, { s: 1 }, cx, 45, kid('TM_CRATER') + A(nm, pool(cx, 48, 22, 8, 2), `transform-origin:${cx}px 48px`)))
  }
  B[9] = kidShot(9)
  B[10] = () => {
    const { t0, t1 } = SHOTS[10] as Shot
    const nm = p.name('s')
    const f: [number, string][] = [[0, 'transform:none']]
    for (let t = 58.5; t < 62.25; t += 0.5) f.push([t, 'transform:translateY(.6px)'], [t + 0.25, 'transform:none'])
    f.push([60, 'transform:none'], [60.5, 'transform:translateY(3px)'], [61, 'transform:none'])
    p.css += kf(nm, f)
    return p.show([[t0, E(10, t1)]], fill('TM_BG_SKY') + p.show([[56.5, 57]], hands()) + p.show([[57, 58.5]], med('TM_OMNI_MED')) + A(nm, p.show([[58.5, 62.25]], med('TM_OMNI_CRY'))) + p.show([[62.25, E(10, 63)]], med('TM_OMNI_UP')))
  }
  B[11] = () => {
    const cr = p.name('q')
    p.css += kf(cr, [[0, 'transform:none'], [63.8, 'transform:none'], [64.5, 'transform:scale(1,.9)'], [64.52, 'opacity:0'], [TM_S, 'opacity:0']])
    const fl = p.name('u')
    p.css += kf(fl, [[0, 'opacity:0;transform:none'], [64.5, 'opacity:0;transform:none'], [64.52, 'opacity:1;transform:none'], [64.9, 'opacity:1;transform:translateY(-100px)'], [TM_S, 'opacity:0;transform:translateY(-100px)']])
    const st = p.name('v')
    p.css += kf(st, [[0, 'opacity:0'], [64.55, 'opacity:0'], [64.6, 'opacity:.85'], [TM_S, 'opacity:0']])
    const streak = `<rect x="64" y="0" width="2" height="60" fill="#FFFFFF"/><rect x="59" y="12" width="1.2" height="40" fill="#FFFFFF" opacity=".6"/><rect x="70" y="20" width="1.2" height="34" fill="#FFFFFF" opacity=".6"/>`
    const [fw, fh] = dim('TM_OMNI_FLY')
    return wide(11, 1, 1, A(cr, at('TM_OMNI_STAND', 48, 0), 'transform-origin:65px 90px') + A(fl, at('TM_OMNI_FLY', 65 - fw / 2, 90 - fh)) + A(st, streak))
  }
  const t0 = SHOTS[which[0] as number]?.t0 ?? 0
  const t1 = SHOTS[last]?.t1 ?? TM_S
  let body = which.map(i => (B[i] as () => string)()).join('')
  if (which.includes(8)) {
    const nm = p.name('x')
    p.css += kf(nm, [[0, 'opacity:0'], [52 - EPS, 'opacity:0'], [52, 'opacity:.6'], [52.4, 'opacity:0'], [TM_S, 'opacity:0']])
    body += A(nm, `<rect width="160" height="${r1(CH)}" fill="#FFFFFF"/>`)
  }
  const shk = `${id}sh`
  p.css += shakeKf(shk, clamp(PW / 480, 0.8, 1.6))
  const bubbles = BUBBLES.filter(b => b[0] >= t0 && b[0] < t1).map(b => bubble(p, b)).join('')
  const film = `<g clip-path="url(#${id}k)"><g transform="translate(${r1(px0)} ${r1(py)})">${A(shk, `<g transform="scale(${+k.toFixed(5)})" shape-rendering="crispEdges">${body}</g>`)}${bubbles}</g></g>`
  const clip = `<clipPath id="${id}k"><rect x="${r1(px0)}" y="${r1(py)}" width="${PW}" height="${r1(PH)}"/></clipPath>`
  return { body: film, defs: clip + p.defs(K), css: p.css }
}

// ---------------------------------------------------------------- the three cards and the band
const cover = (W: number, H: number, id: string): { css: string; el: string; keep: string } => {
  const nm = `${id}cv`
  return { css: kf(nm, [[0, 'opacity:0'], [0.25, 'opacity:1'], [64.5, 'opacity:1'], [TM_S, 'opacity:0']]), el: A(nm, `<rect width="${W}" height="${H}" fill="${INK}"/>`), keep: nm }
}
const GLOWS = [...new Set(SHOTS.map(s => s.glow))]
const ambient = (W: number, H: number, id: string): { defs: string; css: string; body: string } => {
  let defs = ''
  let body = ''
  let css = ''
  GLOWS.forEach((c, i) => {
    defs += `<linearGradient id="${id}g${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".5"/><stop offset="1" stop-color="${c}" stop-opacity=".08"/></linearGradient>`
    const wins = SHOTS.filter(s => s.glow === c).map(s => [s.t0, s.t1] as [number, number])
    css += win(`${id}a${i}`, wins)
    body += A(`${id}a${i}`, `<rect width="${W}" height="${H}" fill="url(#${id}g${i})"/>`)
  })
  return { defs, css, body }
}
const playhead = (W: number, H: number, id: string): { css: string; body: string } => {
  const y = H - 16
  const x0 = 14
  const w = W - 28
  const ticks = SHOTS.slice(1).map(s => `<rect x="${r1(x0 + (s.t0 / TM_S) * w)}" y="${y - 3}" width="1.5" height="8" fill="#FFFFFF" opacity=".35"/>`).join('')
  return {
    css: kf(`${id}ph`, [[0, 'transform:scaleX(0)'], [TM_S, 'transform:scaleX(1)']]) + kf(`${id}pf`, [[0, 'opacity:0'], [0.25, 'opacity:1'], [64.5, 'opacity:1'], [TM_S, 'opacity:0']]),
    body: A(`${id}pf`, `<rect x="${x0}" y="${y}" width="${w}" height="2" fill="#FFFFFF" opacity=".18"/>${A(`${id}ph`, `<rect x="${x0}" y="${y - 1}" width="${w}" height="4" fill="${PROPS.red}"/>`, `transform-origin:${x0}px ${y}px`)}${ticks}`),
  }
}
const stillCard = (W: number, H: number, title: boolean): string => {
  const size = clamp(W / 10, 22, 44)
  return `<g class="tm-still"><rect width="${W}" height="${H}" fill="${INK}"/>${title ? `${sfx(W / 2, H / 2, 'THINK, MARK.', size, PROPS.white, { anchor: 'middle', skew: -10, ls: 1.5 })}${C(W / 2, H / 2 + 26, STILL_LINE, 12, PROPS.captionYellow, 'text-anchor="middle" letter-spacing="2"')}` : ''}</g>`
}
const wrap = (W: number, H: number, start: number, css: string, defs: string, anim: string, still: string): string =>
  `<!--dl--><g pointer-events="none" style="--q:${pin(start)}"><style>${CSS}${css}</style><defs>${defs}</defs><g class="tm-anim">${anim}</g>${still}</g><!--/dl-->`

/** Bytes of sprite markup one draw may carry (the pane keeps 100 kB in reserve for an act; the other two cards take about 17 kB). */
export const DRAW_BUDGET = 76_000
type Drawn = { body: string; defs: string; css: string; which: number[] }
const DRAWS = new Map<string, Drawn>()
/** The picture's rectangle in the cred card: 16:9, as large as the card lets it be, black bars round it. */
export const frameOf = (W: number, H: number): { PW: number; PH: number; x: number; y: number } => {
  const PW = Math.min(W, Math.round(((H - 8) * 16) / 9))
  const PH = Math.round((PW * 9) / 16)
  return { PW, PH, x: Math.round((W - PW) / 2), y: Math.round((H - PH) / 2) }
}
/** The shots a draw during shot `k` carries: this one and the next when the pair fits, else this one (full palette either way;
 *  a single shot too big for the budget is cut to 12 colours, never to a lower resolution). */
export const drawOf = (W: number, H: number, k: number): Drawn => {
  const key = `${W}x${H}|${k}`
  const hit = DRAWS.get(key)
  if (hit) return hit
  const f = frameOf(W, H)
  const build = (which: number[], K: number): Drawn => ({ ...picture('tmc', f.PW, f.PH, f.x, f.y, K, which), which })
  let pick: Drawn | undefined
  if (k + 1 < SHOTS.length) {
    const pair = build([k, k + 1], 999)
    if (pair.defs.length <= DRAW_BUDGET) pick = pair
  }
  if (!pick) {
    pick = build([k], 999)
    if (pick.defs.length > DRAW_BUDGET) pick = build([k], 12)
  }
  DRAWS.set(key, pick)
  return pick
}

/** One pane card's layer of the cutscene, as drawn `sec` seconds into it. */
export const thinkMarkPane = (W: number, H: number, card: 'cred' | 'task' | 'log', start: number, sec = 0): string => {
  const id = `tm${card[0]}`
  const cv = cover(W, H, id)
  if (card === 'cred') {
    const pic = drawOf(W, H, shotAt(sec))
    return wrap(W, H, start, cv.css + pic.css, pic.defs, cv.el + pic.body, stillCard(W, H, true))
  }
  const am = ambient(W, H, id)
  const ph = card === 'log' ? playhead(W, H, id) : { css: '', body: '' }
  return wrap(W, H, start, cv.css + am.css + ph.css, am.defs, cv.el + am.body + ph.body, stillCard(W, H, false))
}

const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
/** The band's slim NOW PLAYING strip over a dark cover; the clock is a strip of 66 labels stepping once a second. */
export const thinkMarkBand = (W: number, H: number, era: Era, start: number): string => {
  const P = pal(era)
  const id = 'tmb'
  const size = 13
  const title = 'THINK, MARK'
  const tw = condW(title, size, 1)
  const pitch = Math.round(4 * size * 0.62)
  const sw = Math.round(clamp(46 + tw + 16 + pitch + 26, 230, W - 20))
  const x = Math.round((W - sw) / 2)
  const y = Math.round(H / 2 - 14)
  const sh = 28
  const cx0 = x + 46 + tw + 14
  const cvf = kf(`${id}cv`, [[0, 'opacity:0'], [0.25, 'opacity:1'], [64.5, 'opacity:1'], [TM_S, 'opacity:0']])
  const clock = Array.from({ length: TM_S + 1 }, (_, i) => `<text x="${cx0 + pitch / 2 + i * pitch}" y="${y + 19}" text-anchor="middle" font-family="${MONO}" font-size="${size}" font-weight="600" fill="${P.hero}">${mmss(i)}</text>`).join('')
  const css = cvf + kf(`${id}ck`, [[0, 'transform:translateX(0)'], [TM_S, `transform:translateX(${-TM_S * pitch}px)`]]) + kf(`${id}pg`, [[0, 'transform:scaleX(0)'], [TM_S, 'transform:scaleX(1)']])
  const tri = `<path d="M${x + 14} ${y + 8}l11 6 -11 6z" fill="${P.hero}"/>`
  const label = `<text x="${x + 2}" y="${y - 5}" font-family="${COND}" font-size="8.5" font-weight="800" letter-spacing="2.2" fill="${P.muted}">NOW PLAYING</text>`
  const frame = `<rect x="${x}" y="${y}" width="${sw}" height="${sh}" fill="${P.tile2}" stroke="${P.hero}" stroke-width="1.5"/>${tri}${C(x + 34, y + 19, title, size, P.text, 'letter-spacing="1"')}${C(cx0 - 10, y + 19, '·', size, P.muted)}`
  const bar = `<rect x="${x}" y="${y + sh + 4}" width="${sw}" height="2" fill="${P.line}"/>${A(`${id}pg`, `<rect x="${x}" y="${y + sh + 3}" width="${sw}" height="4" fill="${P.hero}"/>`, `transform-origin:${x}px ${y + sh + 5}px`)}`
  const anim = A(`${id}cv`, `<rect width="${W}" height="${H}" fill="${P.tile}"/>${label}${frame}<clipPath id="${id}k"><rect x="${cx0}" y="${y + 2}" width="${pitch}" height="${sh - 4}"/></clipPath><g clip-path="url(#${id}k)">${A(`${id}ck`, clock, 'animation-timing-function:steps(65,end)')}</g>${bar}`)
  const still = `<g class="tm-still"><rect width="${W}" height="${H}" fill="${P.tile}"/>${label}${frame}</g>`
  return `<g pointer-events="none" style="--q:${pin(start)}"><style>${CSS}${css}</style><g class="tm-anim">${anim}</g>${still}</g>`
}

/**
 * What the theme's `extras` slot draws while the cutscene plays, or undefined when it is not playing (the caller carries on).
 * Everything else yields: when this returns a string (even '') the caller draws nothing else.
 */
export const thinkMarkExtras = (o: ExtraArgs, era: Era): string | undefined => {
  if (o.party || !thinkMarkLive(o.fx, o.at)) return undefined
  const start = (o.fx as { at: number }).at
  if (o.surface === 'band') return thinkMarkBand(o.W, o.H, era, start)
  if (!o.card || o.W < 200 || o.H < 120) return ''
  return thinkMarkPane(o.W, o.H, o.card, start, clamp((o.at - start) / 1000, 0, TM_S - 0.001))
}
