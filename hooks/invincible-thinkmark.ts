// Invincible: the "THINK, MARK" cutscene. Typing `think, mark` plays a 65 s pixel-art scene that takes over the pane's three cards
// (COVER STORY carries the picture inside letterbox bars, GDA WALL and THE PAGE carry the ambient light, the chapter ticks and a
// playhead); the band shows only a slim "NOW PLAYING" strip with a running clock. Every other act yields for the whole 65 s.
// Same technique as the fight and the showdown: ONE CSS duration (65 s) with keyframes in percent and ONE pinned delay
// (`--q: @@T<start>@@`), so any redraw resumes in place and the Svg carries the whole timeline: the pane may not redraw at all.
// The sprites come from invincible-thinkmark-sprites.ts, are cut once per Svg into <defs> (rectangles, few colours) and are reused
// with transforms (push-ins, pans, shakes). Reduced motion: a still title card for the same 65 s and no animation.
// v2: the plan's 24 shots at the plan's cut times; mouth flaps, blinks and head bows are small PATCH sprites toggled over their parent
// by keyframes; push-ins, shakes and the stand-up are CSS transforms; nine short bubbles (two of them the show's own words).
// Fan homage; redrawn original pixel art. Cartoon-faithful blood is in the sprites.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Sprite } from './cast'
import { C, COND, MONO, PROPS, clamp, condW, esc, pal, pin, r1, sfx, spH, spW } from './invincible'
import type { Era } from './invincible'
import { rectPaths } from './invincible-fight'
import { ANIM, BUBBLE_DEFS, HARD_CUTS, PLAN_SIZE, SHOT_TIMES } from './invincible-thinkmark-plan'
import type { BubbleDef } from './invincible-thinkmark-plan'
import { MAXC, PATCH_AT, TM, has } from './invincible-thinkmark-sprites'
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

// ---------------------------------------------------------------- the storyboard (the plan's 24 shots)
type Shot = { t0: number; t1: number; glow: string }
const INK = '#05060A'
const DUSK = '#3E3550'
const BLUE = '#5AA8F0'
const RED = '#8E1C22'
const GOLD = '#C9A227'
/** The ambient light of the two side cards, per shot. */
const GLOW = [DUSK, DUSK, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, RED, GOLD, BLUE, BLUE, BLUE, GOLD, BLUE, BLUE, DUSK, DUSK, RED, GOLD, DUSK, DUSK, DUSK, BLUE]
const SHOTS: Shot[] = SHOT_TIMES.map(([t0, t1], i) => ({ t0, t1, glow: GLOW[i] as string }))
export const SHOT_COUNT = SHOTS.length
/** The nine bubbles, the plan's words exactly (only 4 and 9 are the show's own lines). */
export const BUBBLES: BubbleDef[] = BUBBLE_DEFS
export const STILL_LINE = "I'D STILL HAVE YOU."
const BLOOD = '#B0141C'
const g = <T,>(a: T[], i: number): T => a[i] as T

// ---------------------------------------------------------------- keyframe helpers (times in seconds of the 65 s)
const pc = (t: number): string => `${+((t / TM_S) * 100).toFixed(3)}%`
const kf = (name: string, frames: [number, string][]): string => {
  const f = [...frames].sort((a, b) => a[0] - b[0])
  return `@keyframes ${name}{${f.map(([t, v]) => `${pc(clamp(t, 0, TM_S))}{${v}}`).join('')}}`
}
const EPS = 0.001
/** Opacity windows [from, to]: 0 elsewhere (a hard cut, 1 ms). */
const win = (name: string, raw: [number, number][]): string => {
  // empty or backwards windows are dropped, the rest sorted and merged where they touch or overlap
  const wins: [number, number][] = []
  for (const [a, b] of raw.filter(([a, b]) => a < b).sort((x, y) => x[0] - y[0])) {
    const l = wins[wins.length - 1]
    if (l && a <= l[1] + 1e-6) l[1] = Math.max(l[1], b)
    else wins.push([a, b])
  }
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
const EASE_OUT = 'animation-timing-function:cubic-bezier(.2,.7,.3,1)'
const EASE_IN = 'animation-timing-function:cubic-bezier(.7,0,.8,.3)'
const r3 = (n: number): number => Math.round(n * 1000) / 1000

// ---------------------------------------------------------------- the picture (COVER STORY)
type Cam = { s: number; x?: number; y?: number }
const camT = (c: Cam): string => `transform:translate(${r1(c.x ?? 0)}px,${r1(c.y ?? 0)}px) scale(${+c.s.toFixed(4)})`
/** A sprite, or one slot (`[j, slotWidth]`) of a sheet. */
type Ref = { n: string; slot?: [number, number] }

class Pic {
  css = ''
  used = new Map<string, Ref & { idx: number }>()
  n = 0
  constructor(readonly id: string, readonly PW: number, readonly PH: number) {}
  name(tag: string): string {
    return `${this.id}${tag}${this.n++}`
  }
  /** A group shown only in `wins`. */
  show(wins: [number, number][], inner: string): string {
    if (!wins.length || !inner) return ''
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
  /** Keyframes of any property on a group, with an origin. */
  move(frames: [number, string][], inner: string, origin = ''): string {
    const nm = this.name('m')
    this.css += kf(nm, frames)
    return A(nm, inner, origin ? `transform-origin:${origin}` : '')
  }
  ref(r: Ref): string {
    const key = r.slot ? `${r.n}#${r.slot[0]}` : r.n
    let e = this.used.get(key)
    if (!e) this.used.set(key, (e = { ...r, idx: this.used.size }))
    return `#${this.id}s${e.idx}`
  }
  defs(K: number): string {
    return [...this.used.values()].map(e => `<g id="${this.id}s${e.idx}">${cut(e, K)}</g>`).join('')
  }
}

// The sprites are drawn exactly as the artist made them: full resolution, cut once per draw into <defs> as merged rectangles. What keeps
// a draw small is time, not quality: a draw carries only the CURRENT shot and, when both fit, the NEXT one.
const CUTS = new Map<string, string>()
const cut = (r: Ref, K: number): string => {
  const key = `${r.n}|${r.slot?.join(',') ?? ''}|${K}`
  const hit = CUTS.get(key)
  if (hit !== undefined) return hit
  let sp: Sprite = TM[r.n] as Sprite
  if (r.slot) sp = { ...sp, rows: sp.rows.map(row => row.slice(r.slot![0] * r.slot![1], (r.slot![0] + 1) * r.slot![1])) }
  const out = rectPaths(sp, Math.min(K, MAXC[r.n] ?? K))
  CUTS.set(key, out)
  return out
}

/** Camera shakes [shot number, time, duration, px]: the whole frame jumps +-px (sprite px) every 1/30 s, then snaps back. */
const SHAKES: [number, number, number, number][] = [
  [1, 0.3, 0.15, 2], [1, 1.3, 0.15, 2], [1, 2.1, 0.15, 2], [2, 2.9, 0.15, 2], [2, 4.2, 0.15, 2], [4, 7.2, 0.15, 2], [4, 8.0, 0.2, 3], [6, 14.5, 0.1, 1],
  [9, 19.7, 0.15, 2], [9, 23.3, 0.15, 2], [12, 30.4, 0.1, 1], [24, 64.7, 0.25, 3], [24, 64.95, 0.05, 2],
]
const shakeKf = (name: string, k: number, from: number, to: number): string => {
  const f: [number, string][] = [[0, 'transform:none']]
  for (const [no, t, d, px] of SHAKES) {
    if (no < from || no > to) continue
    f.push([t - EPS, 'transform:none'])
    const n = Math.max(1, Math.round(d * 30))
    for (let i = 0; i < n; i++) {
      const v = `transform:translate(${r1(i % 2 ? -px * k : px * k)}px,${r1(i % 2 ? px * k * 0.5 : -px * k * 0.5)}px)`
      f.push([t + i / 30, v], [t + (i + 1) / 30 - EPS, v])
    }
    f.push([t + n / 30, 'transform:none'])
  }
  return kf(name, f)
}

const burst = (cx: number, cy: number, rx: number, ry: number): string => {
  const pts: string[] = []
  for (let i = 0; i < 32; i++) {
    const a = (Math.PI * 2 * i) / 32
    const rr = i % 2 ? 0.8 : 1.12
    pts.push(`${r1(cx + Math.cos(a) * rx * rr)},${r1(cy + Math.sin(a) * ry * rr)}`)
  }
  return pts.join(' ')
}
/** Bubble spots [x, y (fractions of the picture), tail side], by bubble number. */
const BPOS: Record<number, [number, number, 'l' | 'r']> = {
  1: [0.04, 0.07, 'r'], 2: [0.04, 0.07, 'r'], 3: [0.04, 0.06, 'r'], 4: [0.06, 0.1, 'r'], 5: [0.04, 0.07, 'r'], 6: [0.04, 0.07, 'r'], 7: [0.04, 0.05, 'r'], 8: [0.04, 0.07, 'r'], 9: [0.5, 0.08, 'l'],
}
const bubble = (p: Pic, b: BubbleDef): string => {
  const [fx, fy, tail] = BPOS[b.n] as [number, number, 'l' | 'r']
  const big = b.style === 'big'
  const quiet = b.style === 'quiet'
  let size = clamp(p.PW / 40, 14, 18) * (big ? 1.5 : quiet ? 0.86 : 1)
  const maxW = p.PW - 14
  while (size > 8 && condW(b.text, size, 0.8) + 20 > maxW) size -= 0.5
  const w = condW(b.text, size, 0.8) + 20
  const h = size + 14
  const x = clamp(p.PW * fx, 6, p.PW - w - 6)
  const y = p.PH * fy
  const t0 = b.start
  const t1 = b.end
  const nm = `${p.id}b${b.n}`
  p.css += kf(nm, [[0, 'opacity:0;transform:scale(.85)'], [t0 - EPS, 'opacity:0;transform:scale(.85)'], [t0, 'opacity:1;transform:scale(.85)'], [t0 + 0.1, 'opacity:1;transform:scale(1.06)'], [t0 + 0.2, 'transform:scale(1)'], [t1 - 0.01, 'opacity:1;transform:scale(1)'], [t1 + 0.2, 'opacity:0;transform:scale(1)'], [TM_S, 'opacity:0;transform:scale(1)']])
  const tx = tail === 'r' ? x + w * 0.18 : x + w * 0.82
  const tail_ = `<path d="M${r1(tx)} ${r1(y + h - 1)}l${tail === 'r' ? -6 : 6} 9 ${tail === 'r' ? 13 : -13} -9z" fill="${PROPS.white}" stroke="${PROPS.ink}" stroke-width="1.5" stroke-linejoin="round"/><rect x="${r1(tx - 6)}" y="${r1(y + h - 3)}" width="14" height="3" fill="${PROPS.white}"/>`
  const sw = quiet ? 1 : 1.5
  const shape = big
    ? `<polygon points="${burst(x + w / 2, y + h / 2, w / 2 + 10, h / 2 + 8)}" fill="${PROPS.white}" stroke="${PROPS.ink}" stroke-width="2" stroke-linejoin="round"/>`
    : `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${quiet ? 7 : 3}" fill="${quiet ? '#F4EEDC' : PROPS.white}" stroke="${PROPS.ink}" stroke-width="${sw}"${quiet ? ' stroke-dasharray="3 2"' : ''}/>${tail_}`
  const text = quiet
    ? `<text x="${r1(x + 10)}" y="${r1(y + h - 8)}" font-family="${COND}" font-size="${r1(size)}" font-weight="500" font-style="italic" fill="${PROPS.ink}" letter-spacing=".4">${esc(b.text)}</text>`
    : C(x + 10, y + h - 8, b.text, r1(size), PROPS.ink, 'letter-spacing=".8"')
  return A(nm, `${shape}${text}`, `transform-origin:${r1(x + w / 2)}px ${r1(y + h)}px`)
}

/** The shot playing `sec` seconds in (an index of SHOTS). */
export const shotAt = (sec: number): number => {
  let i = 0
  SHOTS.forEach((sh, k) => { if (sec >= sh.t0) i = k })
  return i
}
/** When the pane must be drawn again: just after every cut (80 ms) and once more just after the end, as epoch ms. A draw carries the shot playing and, when it fits, the next. */
export const thinkMarkRedraws = (start: number): number[] => [...SHOTS.slice(1).map(sh => Math.round(start + sh.t0 * 1000 + 80)), Math.round(start + TM_MS + 80)]

/** The patch windows a shot's plan lists for `patch` (mouth cycles, blinks, patches), in seconds; `end` = where a lone patch lasts to. */
export const patchWindows = (no: number, patch: string): [number, number][] => {
  const out: [number, number][] = []
  const [, end] = g(SHOT_TIMES, no - 1)
  for (const a of ANIM[no] ?? []) {
    if (a.patch !== patch) continue
    if (a.kind === 'blink') out.push([a.t as number, r3((a.t as number) + (a.dur ?? 0.12))])
    else if (Array.isArray(a.t)) {
      // base for `on` s, then the patch for `off` s; it ends on the base
      let t = a.t[0]
      while (t < a.t[1] - 1e-6) {
        t = r3(t + (a.on ?? 0.15))
        if (t >= a.t[1] - 1e-6) break
        const e = Math.min(r3(t + (a.off ?? 0.12)), a.t[1])
        out.push([t, e])
        t = e
      }
    } else {
      const next = (ANIM[no] ?? []).filter(o => o.patch === patch && o.kind !== 'blink').map(o => (Array.isArray(o.t) ? o.t[0] : o.t)).filter(x => x > (a.t as number))
      out.push([a.t, next.length ? Math.min(...next) : end])
    }
  }
  return out
}

/**
 * The picture for COVER STORY's card, for the shots in `which` (one, or two in a row). The art lives on the 160 x 90 canvas (`k`
 * output px per canvas px); shots are laid out in canvas units, the bubbles in output px. The LAST shot of the draw holds its final
 * frame until the next draw replaces it, so a redraw that comes late changes nothing but the moment of the cut.
 */
const picture = (id: string, PW: number, PH: number, px0: number, py: number, K: number, which: number[]): { body: string; defs: string; css: string } => {
  const p = new Pic(id, PW, PH)
  const k = PW / 160
  const CH = PH / k
  const last = which[which.length - 1] as number
  /** End of a window in shot `i`: it holds to the end of the film when the shot is the draw's last. */
  const E = (i: number, t: number): number => (i === last ? TM_S : t)
  /** Windows of shot index `i` with the last-shot hold applied. */
  const hold = (i: number, w: [number, number][]): [number, number][] => w.map(([a, b]) => [a, b >= g(SHOTS, i).t1 - 1e-6 ? E(i, b) : b])
  const ref = (n: string, slot?: [number, number]): string => p.ref({ n, slot })
  const dim = (n: string): [number, number] => [spW(TM[n]), spH(TM[n])]
  const use = (n: string, x = 0, y = 0, s = 1, slot?: [number, number]): string => (has(n) ? `<use href="${ref(n, slot)}" transform="translate(${r1(x)} ${r1(y)}) scale(${+s.toFixed(4)})"/>` : '')
  /** A sprite placed where the plan put it: the real art's size can differ from the plan's, so it sits centred on the planned width and on the planned bottom edge. */
  const fit = (n: string, x: number, y: number, mode: 'b' | 'c' = 'b'): [number, number] => {
    const [pw, ph] = PLAN_SIZE[n] ?? dim(n)
    const [w, h] = dim(n)
    return [x + (pw - w) / 2, y + (mode === 'b' ? ph - h : (ph - h) / 2)]
  }
  /** A figure: its sprite and its patches (each shown in its own windows), in sprite px, placed with a transform. */
  const figure = (n: string, x: number, y: number, s: number, pw: Record<string, [number, number][]>, extra = ''): string => {
    if (!has(n)) return ''
    const pat = Object.entries(pw).map(([pn, w]) => { const at = PATCH_AT[pn]; return has(pn) && at ? p.show(w, use(pn, at.x, at.y)) : '' }).join('')
    return `<g transform="translate(${r1(x)} ${r1(y)}) scale(${+s.toFixed(4)})">${use(n)}${pat}${extra}</g>`
  }
  /** Windows of the plan's patches of shot `no` (index i) for each named patch. */
  const pws = (i: number, ...names: string[]): Record<string, [number, number][]> => Object.fromEntries(names.map(pn => [pn, hold(i, patchWindows(i + 1, pn))]))
  /** Small hops: a group displaced by (dx, dy) in each [t0, t1] (canvas px), still elsewhere. */
  const jig = (evs: [number, number, number, number][], inner: string): string => {
    const f: [number, string][] = [[0, 'transform:none']]
    for (const [a, b, dx, dy] of evs) f.push([a - EPS, 'transform:none'], [a, `transform:translate(${dx}px,${dy}px)`], [b - EPS, `transform:translate(${dx}px,${dy}px)`], [b, 'transform:none'])
    return p.move(f, inner)
  }
  /** An alternating tremble in x (+-dx every `step` s) from t0 to t1. */
  const tremble = (t0: number, t1: number, step: number, dx: number, inner: string): string => {
    const f: [number, string][] = [[0, 'transform:none'], [t0 - EPS, 'transform:none']]
    for (let t = t0, j = 0; t < t1 - 1e-6; t += step, j++) {
      const v = `transform:translate(${j % 2 ? -dx : dx}px,0px)`
      f.push([r3(t), v], [r3(Math.min(t + step, t1)) - EPS, v])
    }
    f.push([t1, 'transform:none'])
    return p.move(f, inner)
  }
  const shot = (i: number, inner: string): string => p.show([[g(SHOTS, i).t0, E(i, g(SHOTS, i).t1)]], inner)
  const fillS = (n: string, s: number, align: 'bottom' | 'middle' = 'bottom'): [number, number] => {
    const [w, h] = dim(n)
    return [(160 - w * s) / 2, align === 'bottom' ? 90 - h * s : (90 - h * s) / 2]
  }
  /** The scale that makes a cut-down backdrop fill the 160-wide frame (the artist drew the sky and the rock wall smaller). */
  const full = (n: string): number => (has(n) ? 160 / dim(n)[0] : 1)
  const bg = (c: string): string => `<rect width="160" height="${r1(CH)}" fill="${c}"/>`
  const sky = (): string => use('TM_BG_SKY')
  const mark = (): string => {
    if (!has('TM2_MARK_DOWN_LITE')) return ''
    const [w, h] = dim('TM2_MARK_DOWN_LITE')
    return `<g transform="rotate(-17 ${70 + w / 2} ${30 + h / 2})">${use('TM2_MARK_DOWN_LITE', 70, 30)}</g>`
  }
  const wideBg = (): string => sky() + use('TM2_ROCKS_LITE') + mark()
  const wide = (i: number, figs: string): string => shot(i, wideBg() + figs)
  /** A kneeling pose placed where the plan put it, shown in [a, b] (the shot's end holds when the shot is the draw's last), with its mouth patch. */
  const kneel = (i: number, n: string, x: number, y: number, a: number, b: number, pn: string, extraW?: Record<string, [number, number][]>): string => {
    const [fx, fy] = fit(n, x, y)
    return p.show(hold(i, [[a, b]]), figure(n, fx, fy, 1, extraW ?? pws(i, pn)))
  }
  const standG = (n: string, cx: number, s: number, pw: Record<string, [number, number][]>, extra = ''): string => {
    const [w, h] = dim(n)
    return figure(n, cx - (w * s) / 2, 90 - h * s, s, pw, extra)
  }
  /** The bloody hands held up in front of the wide medium shot's chest, one over each shoulder, the sleeves running off the bottom edge (so the arms read as his). */
  const HAND_L = (): [number, number] => fit('TM2_OMNI_HAND_L', 10, 44)
  const HAND_R = (): [number, number] => fit('TM2_OMNI_HAND_R', 106, 44)
  const handsDone = (): string => {
    const [lx, ly] = HAND_L()
    const [rx, ry] = HAND_R()
    return use('TM2_OMNI_HAND_L', lx, ly) + use('TM2_OMNI_HAND_R', rx, ry)
  }
  const handsAt = (extra: string, riseFrom?: number): string => {
    const [lx, ly] = HAND_L()
    const [rx, ry] = HAND_R()
    if (riseFrom === undefined) return use('TM2_OMNI_HAND_L', lx, ly) + use('TM2_OMNI_HAND_R', rx, ry) + extra
    const t = riseFrom
    const up = (nm: string, lag: number): [number, string][] => [[0, 'transform:translateY(95px)'], [t + lag, `transform:translateY(95px);${EASE_OUT}`], [t + 0.7 + lag, 'transform:none']]
    return p.move(up('l', 0), use('TM2_OMNI_HAND_L', lx, ly)) + p.move(up('r', 0.08), use('TM2_OMNI_HAND_R', rx, ry)) + extra
  }
  /** A drip from a fingertip (canvas px) from time t: bead, stretch, a falling drop, a splash. */
  const drip = (t: number, fx: number, fy: number, to: number): string => {
    const S = 'TM2_FX_BLOOD_DRIP'
    if (!has(S)) return ''
    const sl = (j: number): [number, number] => [j, 6]
    const x = fx - 3
    const fall = p.move([[0, 'transform:none'], [t + 0.4, 'transform:none'], [t + 0.7, 'transform:translateY(12px)'], [TM_S, 'transform:translateY(12px)']], use(S, x, fy, 1, sl(2)))
    return p.show([[t, Math.min(t + 0.2, to)]], use(S, x, fy, 1, sl(0))) + p.show([[t + 0.2, Math.min(t + 0.4, to)]], use(S, x, fy, 1, sl(1))) + p.show([[t + 0.4, Math.min(t + 0.7, to)]], fall) + p.show([[t + 0.7, Math.min(t + 0.8, to)]], use(S, x, fy + 12, 1, sl(3)))
  }
  /** A tear welling at (ex, ey) in a figure's own px from time t, falling, and leaving a wet track to `to`. */
  const tear = (t: number, ex: number, ey: number, to: number): string => {
    const S = 'TM2_FX_TEAR'
    if (!has(S)) return ''
    const sl = (j: number): [number, number] => [j, 4]
    const fall = p.move([[0, 'transform:none'], [t + 0.3, 'transform:none'], [t + 0.7, 'transform:translateY(8px)'], [TM_S, 'transform:translateY(8px)']], use(S, ex - 2, ey, 1, sl(2)))
    return p.show([[t, t + 0.15]], use(S, ex - 2, ey, 1, sl(0))) + p.show([[t + 0.15, t + 0.3]], use(S, ex - 2, ey, 1, sl(1))) + p.show([[t + 0.3, t + 0.7]], fall) + p.show([[t + 0.7, to]], use(S, ex - 2, ey + 8, 1, sl(3)))
  }
  /** A close-up of Mark on the rock (shots 10, 14, 20), the camera in `cam` (scale about the frame centre). */
  const markShot = (i: number, cam?: [number, number]): string => {
    const [hx, hy] = fit('TM2_MARK_CU_HEAD', 0, 0, 'c')
    const inner = use('TM2_ROCK_CLOSE', 0, 0, full('TM2_ROCK_CLOSE')) + figure('TM2_MARK_CU_HEAD', 24 + hx * 1.25, 14 + hy * 1.25, 1.25, pws(i, 'TM2_P_MARK_BLINK', 'TM2_P_MARK_MOUTH_OPEN'))
    return shot(i, cam ? p.cam(g(SHOTS, i).t0, g(SHOTS, i).t1, { s: cam[0] }, { s: cam[1] }, 80, 45, inner) : inner)
  }
  /** The medium shot's figure on the sky: sprite `n` drawn 1:1 (it is as wide as the frame, shoulders and cape edge to edge), bottom-anchored at the centre. */
  const med = (n: string, pw: Record<string, [number, number][]>, extra = ''): string => standG(n, 80, 1, pw, extra)

  const B: Record<number, () => string> = {}
  // 1-2: the close-ups
  B[0] = () => {
    const [x, y] = fit('TM2_OMNI_CU_PROFILE', 40, 18)
    return shot(0, use('TM2_SKY_CU', 0, 0, full('TM2_SKY_CU')) + figure('TM2_OMNI_CU_PROFILE', x, y, 1, pws(0, 'TM2_P_PROF_MOUTH_CLOSED', 'TM2_P_PROF_BLINK')))
  }
  B[1] = () => {
    const s = 4 / 3
    const [, h] = dim('TM_OMNI_CU_SHOUT')
    // the face centre of the shouting head, in canvas px (about which the camera pushes in)
    return shot(1, use('TM2_SKY_CU', 0, 0, full('TM2_SKY_CU')) + p.cam(g(SHOTS, 1).t0, g(SHOTS, 1).t1, { s: 1 }, { s: 1.04 }, 93, 38, figure('TM_OMNI_CU_SHOUT', 0, 90 - h * s, s, pws(1, 'TM2_P_CU_MOUTH_CLOSED', 'TM2_P_CU_BLINK'))))
  }
  // 3-8: the long wide, one pose set per shot
  B[2] = () => {
    const [x, y] = fit('TM2_OMNI_KNEEL_GRAB', 36, 30)
    return wide(2, jig([[5.6, E(2, 7.2), 0, -1]], figure('TM2_OMNI_KNEEL_GRAB', x, y, 1, pws(2, 'TM2_P_KNEEL_GRAB_MOUTH'))))
  }
  B[3] = () => wide(3, kneel(3, 'TM_OMNI_KNEEL_A', 30, 26, 7.2, 8.0, 'TM2_P_KNEEL_A_MOUTH') + kneel(3, 'TM_OMNI_KNEEL_B', 34, 32, 8.0, 8.75, 'TM2_P_KNEEL_B_MOUTH'))
  B[4] = () => {
    const [x, y] = fit('TM_OMNI_KNEEL_C', 42, 34)
    return wide(4, jig([9.5, 10.5, 11.5, 12.5, 13.5].map(t => [t, t + 0.25, 0, 1] as [number, number, number, number]), figure('TM_OMNI_KNEEL_C', x, y, 1, pws(4, 'TM2_P_KNEEL_C_MOUTH'))))
  }
  B[5] = () => {
    const [x, y] = fit('TM2_OMNI_KNEEL_ARMSUP', 30, 22)
    return wide(5, tremble(14.8, 16.0, 0.2, 1, figure('TM2_OMNI_KNEEL_ARMSUP', x, y, 1, pws(5, 'TM2_P_KNEEL_ARMSUP_MOUTH'))))
  }
  B[6] = () => wide(6, kneel(6, 'TM_OMNI_KNEEL_C', 42, 34, 16.1, 17.2, 'TM2_P_KNEEL_C_MOUTH') + kneel(6, 'TM2_OMNI_KNEEL_GRAB', 36, 28, 17.2, 18.1, 'TM2_P_KNEEL_GRAB_MOUTH'))
  B[7] = () => wide(7, kneel(7, 'TM2_OMNI_KNEEL_LEAN', 40, 32, 18.1, 19.65, 'TM2_P_KNEEL_LEAN_MOUTH'))
  // 9: the big yell
  B[8] = () => {
    const s = 160 / 132
    const [x, y] = fillS('TM2_OMNI_ECU_YELL_12', s, 'middle')
    const mid: [number, number][] = []
    const closed: [number, number][] = []
    for (const [a, b] of [[19.7, 22.6], [23.1, 24.0]] as const) {
      for (let t = a; t < b - 1e-6; t += 0.5) {
        mid.push([r3(t + 0.2), r3(Math.min(t + 0.3, b))], [r3(t + 0.4), r3(Math.min(t + 0.5, b))])
        closed.push([r3(t + 0.3), r3(Math.min(t + 0.4, b))])
      }
    }
    const cl: [number, number][] = [...closed, [22.6, 23.1], ...hold(8, [[24.0, 24.65]])]
    const pw: Record<string, [number, number][]> = { TM2_P_ECU_MOUTH_MID: mid.filter(([a, b]) => a < b), TM2_P_ECU_MOUTH_CLOSED: cl.filter(([a, b]) => a < b), TM2_P_ECU_BLINK: hold(8, patchWindows(9, 'TM2_P_ECU_BLINK')) }
    return shot(8, bg('#4A2530') + p.cam(g(SHOTS, 8).t0, g(SHOTS, 8).t1, { s: 1 }, { s: 1.06 }, 80, 45, figure('TM2_OMNI_ECU_YELL_12', x, y, s, pw)))
  }
  B[9] = () => markShot(9)
  // 11-13: the wide again
  B[10] = () => {
    const [x, y] = fit('TM_OMNI_KNEEL_C', 42, 34)
    return wide(10, jig([[28.0, 28.25, 0, 1], [29.5, 29.75, 0, 1]], figure('TM_OMNI_KNEEL_C', x, y, 1, pws(10, 'TM2_P_KNEEL_C_MOUTH'))))
  }
  B[11] = () => wide(11, kneel(11, 'TM_OMNI_KNEEL_A', 30, 26, 30.4, 31.1, 'TM2_P_KNEEL_A_MOUTH'))
  B[12] = () => wide(12, kneel(12, 'TM2_OMNI_KNEEL_GRAB', 36, 30, 31.1, 32.45, 'TM2_P_KNEEL_GRAB_MOUTH'))
  B[13] = () => markShot(13, [1.1, 1.18])
  // 15-16: the silence, then he stands
  B[14] = () => {
    const [x, y] = fit('TM_OMNI_KNEEL_C', 42, 34)
    return wide(14, jig([[44.5, 45.2, 0, 1]], figure('TM_OMNI_KNEEL_C', x, y, 1, { TM2_P_KNEEL_C_HEADDOWN: hold(14, [[43.7, 45.7]]) })))
  }
  B[15] = () => {
    const [x, y] = fit('TM2_OMNI_STAND_LOW', 38, 10)
    const rise = p.move([[0, 'transform:none'], [45.7, `transform:none;${EASE_OUT}`], [46.0, 'transform:translateY(-58px)'], [TM_S, 'transform:translateY(-58px)']], jig([[46.2, 46.4, 1, 0], [46.6, 46.8, -1, 0]], figure('TM2_OMNI_STAND_LOW', x, y, 1, {})))
    return wide(15, p.show(hold(15, [[45.7, 46.95]]), rise) + p.show(hold(15, [[46.3, 46.95]]), drip(46.3, 38 + 70, 58, 46.95)))
  }
  // 17-18: stunned, then the hands
  B[16] = () => shot(16, sky() + jig([[47.0, 47.5, 0, 1]], med('TM_OMNI_MED', { TM2_P_MED_MOUTH_AGAPE: hold(16, [[46.95, 48.0]]), TM2_P_MED_BLINK: hold(16, [[47.5, 47.62]]) })))
  B[17] = () => {
    // the drips run from the heel of each palm, just above the sleeve
    const [lx, ly] = HAND_L()
    const [rx, ry] = HAND_R()
    const dl: [number, number] = [lx + 16, ly + 34]
    const dr: [number, number] = [rx + 16, ry + 34]
    const d = tremble(48.7, E(17, 52.05), 0.3, 1, handsAt(drip(49.5, ...dl, 52.05) + drip(50.4, ...dr, 52.05) + drip(51.2, ...dl, 52.05), 48.0))
    return shot(17, sky() + med('TM_OMNI_MED', { TM2_P_MED_MOUTH_AGAPE: hold(17, [[48.0, 52.05]]), TM2_P_MED_BLINK: hold(17, [[50.6, 50.72]]) }) + d)
  }
  // 19: the crater
  B[18] = () => {
    const [x, y] = fillS('TM2_CRATER_10', 1.25, 'middle')
    return shot(18, p.cam(g(SHOTS, 18).t0, g(SHOTS, 18).t1, { s: 1.08 }, { s: 1 }, 80, 45, use('TM2_CRATER_10', x, y, 1.25)))
  }
  B[19] = () => markShot(19)
  // 21-23: the hands drop, he cries, he looks up
  B[20] = () => {
    const drop = p.move([[0, 'transform:none'], [56.9, `transform:none;${EASE_IN}`], [57.2, 'transform:translateY(95px)'], [TM_S, 'transform:translateY(95px)']], tremble(56.45, 56.9, 0.3, 1, handsDone()))
    return shot(20, sky() + med('TM_OMNI_MED', { TM2_P_MED_MOUTH_AGAPE: hold(20, [[57.2, 58.6]]), TM2_P_MED_BLINK: hold(20, [[57.8, 57.92]]) }) + drop)
  }
  B[21] = () => {
    const shut = hold(21, [[61.0, 61.6], [61.9, 62.1]])
    const quiver = hold(21, [[61.0, 61.2], [61.4, 61.6], [61.8, 62.0]])
    const eyes = [73, 88]
    const tears = eyes.map(ex => tear(61.0, ex, 19, 62.1) + tear(61.6, ex, 19, 62.1)).join('')
    const sob: [number, string][] = [[0, 'transform:none'], [60.5, 'transform:none'], [61.0, 'transform:translateY(3px)']]
    for (let t = 61.0, j = 0; t < 62.1; t += 1 / 3, j++) sob.push([t, `transform:translateY(${j % 2 ? 3 : 4}px)`])
    return shot(21, sky() + p.move(sob, med('TM_OMNI_CRY', { TM2_P_CRY_EYES_SHUT: shut, TM2_P_CRY_MOUTH_QUIVER: quiver }, tears)))
  }
  B[22] = () => {
    const track = [72, 87].map(x => use('TM2_FX_TEAR', x - 2, 14, 1, [3, 4])).join('')
    return shot(22, sky() + med('TM_OMNI_UP', { TM2_P_UP_MOUTH_OPEN: hold(22, [[62.1, 62.8]]) }, p.show(hold(22, [[62.3, 63.35]]), track)))
  }
  // 24: he leaves
  B[23] = () => {
    const [w, h] = dim('TM_OMNI_STAND')
    const breath: [number, number, number, number][] = []
    for (let t = 63.4, j = 0; t < 64.6; t += 0.6, j++) breath.push([r3(t + 0.3), r3(t + 0.6), 0, 1])
    const gone = p.move([[0, 'transform:none;opacity:1'], [64.6 - EPS, 'transform:none;opacity:1'], [64.6, 'transform:scaleY(.85);opacity:1'], [64.7 - EPS, 'transform:scaleY(.85);opacity:1'], [64.7, 'transform:none;opacity:1'], [64.8, 'transform:translateY(-130px);opacity:1'], [64.8 + EPS, 'transform:translateY(-130px);opacity:0'], [TM_S, 'transform:translateY(-130px);opacity:0']], use('TM_OMNI_STAND', 48, 0), `${48 + w / 2}px ${h}px`)
    const streak = p.move([[0, 'opacity:0'], [64.7 - EPS, 'opacity:0'], [64.7, 'opacity:1'], [64.95, 'opacity:0'], [TM_S, 'opacity:0']], use('TM2_FX_STREAK', 55, 0, 2.5))
    const dust = [1, 2, 3].map(j => p.show([[r3(64.6 + 0.1 * j), j === 3 ? E(23, 65) : r3(64.7 + 0.1 * j)]], use('TM2_FX_DUST', 40, 66, 2, [j - 1, 32]))).join('')
    const bits = [-30, -18, -8, 8, 18, 30].map((dx, j) => p.move([[0, 'opacity:0'], [64.7 - EPS, 'opacity:0;transform:none'], [64.7, 'opacity:1;transform:none'], [64.85, `opacity:1;transform:translate(${dx / 2}px,-20px)`], [65, `opacity:1;transform:translate(${dx}px,4px)`], [TM_S, `opacity:1;transform:translate(${dx}px,4px)`]], use('TM2_FX_DEBRIS', 56, 70, 1, [j, 8]))).join('')
    const flash = p.show([[64.7, 64.75]], `<rect width="160" height="${r1(CH)}" fill="#FFF4E8" opacity=".6"/>`)
    return wide(23, jig(breath, gone) + streak + dust + bits + flash)
  }
  const t0 = g(SHOTS, g(which, 0)).t0
  const t1 = g(SHOTS, last).t1
  const body = which.map(i => (B[i] as () => string)()).join('')
  const shk = `${id}sh`
  p.css += shakeKf(shk, k, g(which, 0) + 1, last + 1)
  const bubbles = BUBBLES.filter(b => b.start < t1 && b.end > t0).map(b => bubble(p, b)).join('')
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
    const wins: [number, number][] = []
    for (const s of SHOTS.filter(s => s.glow === c)) { const l = wins[wins.length - 1]; if (l && Math.abs(l[1] - s.t0) < 1e-6) l[1] = s.t1; else wins.push([s.t0, s.t1]) }
    css += win(`${id}a${i}`, wins)
    body += A(`${id}a${i}`, `<rect width="${W}" height="${H}" fill="url(#${id}g${i})"/>`)
  })
  return { defs, css, body }
}
const playhead = (W: number, H: number, id: string): { css: string; body: string } => {
  const y = H - 16
  const x0 = 14
  const w = W - 28
  const ticks = HARD_CUTS.map(t => `<rect x="${r1(x0 + (t / TM_S) * w)}" y="${y - 3}" width="1.5" height="8" fill="#FFFFFF" opacity=".35"/>`).join('')
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

/**
 * The picture alone, as its own Svg of width `W`: what the pane draws under the movie when the crew is too big for the cards
 * (the short view has no cards to carry it). '' when the cutscene is not playing at `at` or the pane is too narrow.
 */
export const thinkMarkSolo = (fx: Fx, at: number, W: number): string => {
  if (!thinkMarkLive(fx, at) || W < 200) return ''
  const start = (fx as { at: number }).at
  const H = Math.round((W * 9) / 16) + 8
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${thinkMarkPane(W, H, 'cred', start, clamp((at - start) / 1000, 0, TM_S - 0.001))}</svg>`
}
