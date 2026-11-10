// ONE act runner for every skin: the Boys `Act` (theboys-acts.ts) and the Invincible `Tl` (invincible-fight.ts) merged.
//
// The contract (why a redraw never restarts an act): every piece runs the SAME duration with its keyframes in percent,
// and every delay is the one pinned start, `pin(at)`, which `phased`/`steady` (hooks/smooth.ts) resolve to "seconds
// from this image's start". A redraw in the middle of an act therefore draws the act at the right moment.
//
// Two kinds of motion live on one act:
//   tracks  whole-act percent keyframes, one per piece: `kf`, `mv`, `on`, `slam`, actors (frames + path), the camera.
//   cues    short shared one-shots fired at act time t via `--t` (no keyframes per piece, ~40 chars each): `cue`, `win`,
//           and everything in fx.ts. Use cues for bursts and flashes; they cost a fraction of a track.
//
// Reduced motion: `done(body, still)` draws `body` normally and `still` (one frame of the act) under reduced motion.
// The act's life (it vanishes at its end) still runs, so a reduced act ends on time too.
//
//   const act = new Act({ id: 'boys-t7-band', ms: 6000, at: startAt, W, H })
//   act.cast('M1', SP.M1, 0.45)
//   const body = act.actor('hero', [[0, 1, 'M1'], [1, 2, 'M2']], [[0, 20, 60], [1, 120, 60]]) + fx.star3(act, 1, 120, 50, 14)
//   const layer = act.done(body, act.still('M2', 120, 60))
import type { Sprite } from '../cast'
import { pin } from '../smooth'
import { ease } from './ease'
import type { Ease } from './ease'
import { FrameBank, swapRows, tag } from './frames'
import type { Window } from './frames'
import { pair } from './motion'

export const r1 = (n: number): number => Math.round(n * 10) / 10
export const r3 = (n: number): number => Math.round(n * 1000) / 1000

/**
 * Keyframe rows without the redundant ones: a row whose value equals both neighbours' sits inside a hold (whatever the
 * timing function, the value between equal rows is constant), and a repeat of the same percent and value says nothing.
 */
/**
 * Path keys with no two at the same time: a key at (or before) the time of the one before it moves 10 ms after it. Two keys
 * on one percent collapse (the later wins), so a teleport written as two keys at one time became a slow glide from the key
 * before (Invincible's skid bug); 10 ms apart it is a cut.
 */
export const apart = <K extends (number | undefined)[]>(keys: K[]): K[] => {
  let last = -Infinity
  return [...keys].sort((a, b) => (a[0] as number) - (b[0] as number)).map(k => {
    const t0 = k[0] as number
    const t = t0 > last ? t0 : r3(last + 0.01)
    last = t
    return (t === t0 ? k : [t, ...k.slice(1)]) as K
  })
}
export const slim = (rows: [number, string][]): [number, string][] =>
  rows.filter((r, i) => {
    const a = rows[i - 1]
    const b = rows[i + 1]
    if (a && a[0] === r[0] && a[1] === r[1]) return false
    return !(a && b && a[1] === r[1] && b[1] === r[1])
  })

export type ActOpts = {
  /** Unique per act AND per surface (two acts in one Svg need two ids): it becomes every class and id prefix. */
  id: string
  /** The whole timeline in ms (every surface of the act shares it). */
  ms: number
  /** Wall-clock ms the timeline starts: pinned, so a redraw resumes. */
  at: number
  /** The drawing's size (flashes and grades cover it). */
  W: number
  H: number
  /** Seconds into the timeline where THIS surface's piece starts (a pane card after the band cut). Default 0. */
  off?: number
  /** Colours kept per pose (frames.ts quantise). Default 6. */
  K?: number
}
/** A path key: act time s, x, y, then optional rotation (deg), opacity, y-squash. */
export type Key = [number, number, number, number?, number?, number?]
/** A pose window: from t0 to t1 s the actor shows `pose`, facing `dir` (-1 mirrors). */
export type Seg = [number, number, string, (1 | -1)?]
/** Shared one-shot cue kinds: shown for --d, pop in, burst out, ring out, one frame, smoke rise, debris drop. */
export type Cue = 'show' | 'pop' | 'burst' | 'ring' | 'blink' | 'rise' | 'drop'
export type ActorOpts = {
  /** Pixels per sprite pixel. Default 1. */
  sc?: number
  /** Rotation keys jump (steps(1)), the pixel-art spin of a thrown ball. */
  spin?: boolean
  /** Two afterimages lagging .07 s and .14 s, shown from a to b s. */
  ghosts?: [number, number]
  /** Markup that rides with the actor in a window (speed lines): [t0, t1, markup]. */
  trail?: [number, number, string][]
}

// The shared cue CSS: one rule and one keyframes per kind, emitted only for kinds the act used. `--s` is the act's
// pinned start (on the root), `--t` the cue's own time, `--d` its length.
const CUE_CSS: Record<Cue, string> = {
  show: '.sg-show{opacity:0;animation:sg-show var(--d,.06s) steps(1) forwards;animation-delay:calc(var(--s) + var(--t,0s))}\n@keyframes sg-show{0%,99%{opacity:1}100%{opacity:0}}',
  blink: '.sg-blink{opacity:0;animation:sg-show .06s steps(1) forwards;animation-delay:calc(var(--s) + var(--t,0s))}\n@keyframes sg-show{0%,99%{opacity:1}100%{opacity:0}}',
  pop: '.sg-pop{opacity:0;animation:sg-pop var(--d,.6s) ease-out forwards;animation-delay:calc(var(--s) + var(--t))}\n@keyframes sg-pop{0%{opacity:1;transform:scale(.6)}16%{transform:scale(1.1)}30%{transform:scale(1)}78%{opacity:1}100%{opacity:0;transform:scale(1)}}',
  burst: '.sg-burst{opacity:0;animation:sg-burst var(--d,.45s) ease-out forwards;animation-delay:calc(var(--s) + var(--t))}\n@keyframes sg-burst{0%{opacity:1;transform:scale(.3)}100%{opacity:0;transform:scale(1.8)}}',
  ring: '.sg-ring{opacity:0;animation:sg-ring var(--d,.5s) ease-out forwards;animation-delay:calc(var(--s) + var(--t))}\n@keyframes sg-ring{0%{opacity:.9;transform:scale(.2)}100%{opacity:0;transform:scale(2.6)}}',
  rise: '.sg-rise{opacity:0;animation:sg-rise var(--d,1.2s) ease-out forwards;animation-delay:calc(var(--s) + var(--t))}\n@keyframes sg-rise{0%{opacity:.9;transform:translateY(0) scale(.5)}30%{opacity:.85}100%{opacity:0;transform:translateY(-16px) scale(1.4)}}',
  drop: '.sg-drop{opacity:0;animation:sg-drop var(--d,.7s) cubic-bezier(.5,0,1,1) forwards;animation-delay:calc(var(--s) + var(--t))}\n@keyframes sg-drop{0%{opacity:1;transform:translateY(0)}70%{opacity:1}100%{opacity:0;transform:translateY(12px)}}',
}
/** Centre-origin transforms for cue and track pieces that scale or turn about themselves. */
const C_CSS = '.sg-c{transform-box:fill-box;transform-origin:50% 50%}'

export class Act {
  /** Class and id prefix, from the id: short, letter-first, stable. */
  readonly p: string
  /** Seconds of the whole timeline. */
  readonly T: number
  readonly off: number
  readonly bank: FrameBank
  /** Per-piece keyframes. */
  css = ''
  private cues = new Set<Cue>()
  private n = 0
  private freezes: [number, number][] = []
  /** Extra CSS other modules hand the act (light loops, camera helpers). */
  extraCss = new Set<string>()
  /** Pose keys in time order as actors were built (for tests: what a fight shows). */
  chain: [number, string][] = []

  constructor(readonly o: ActOpts) {
    this.p = tag(o.id)
    this.T = o.ms / 1000
    this.off = o.off ?? 0
    this.bank = new FrameBank(`${this.p}f`, o.K ?? 6)
  }
  get W(): number { return this.o.W }
  get H(): number { return this.o.H }
  get at(): number { return this.o.at }

  // ---------------------------------------------------------------- time
  /** A hit-freeze: from act time `t` everything waits `s` seconds (paths hold their pose; later times shift). */
  freeze(t: number, s: number): this { this.freezes.push([t, s]); this.freezes.sort((a, b) => a[0] - b[0]); return this }
  /** Act time to timeline time on this surface, freezes included. */
  warp(t: number): number { let w = t; for (const [tf, s] of this.freezes) if (t > tf) w += s; return w }
  /** Percent of the whole timeline at act time `t` (clamped). */
  pc(t: number): number { return r3(Math.min(100, Math.max(0, ((this.off + this.warp(t)) / this.T) * 100))) }
  /** The pinned delay of act time `t` (calc keeps `phased` from shifting it). */
  delay(t = 0): string { return `calc(${pin(this.o.at)} + ${r3(this.off + this.warp(t))}s)` }
  /** A fresh keyframes name under this act's prefix. */
  k(): string { return `${this.p}_${(this.n++).toString(36)}` }
  /** Register a keyframes block. */
  rows(name: string, rows: [number, string][]): void { this.css += `@keyframes ${name}{${slim(rows).map(([p, v]) => `${p}%{${v}}`).join('')}}` }
  /**
   * Rows that end on their last value: a track whose keys stop before 100% would otherwise ease back to the element's own
   * attributes over the rest of the act (a prop thrown off-panel drifted back in, a faded one came back).
   */
  private held(rows: [number, string][]): [number, string][] { const l = rows[rows.length - 1]; return l && l[0] < 100 ? [...rows, [100, l[1]]] : rows }
  /**
   * Numeric keys (index 0 = act time) in timeline order with every freeze turned into a hold: the value at the freeze
   * time is repeated at its end, so the piece stands still through it. Times come back warped (use `pcw` on them).
   */
  hold<K extends (number | undefined)[]>(keys: K[]): K[] {
    const out: K[] = keys.map(k => [this.warp(k[0] as number), ...k.slice(1)] as K)
    for (const [tf, s] of this.freezes) {
      const src = [...keys].sort((a, b) => (a[0] as number) - (b[0] as number))
      const i = src.findIndex(k => (k[0] as number) > tf)
      if (i <= 0) continue
      const a = src[i - 1] as K
      const b = src[i] as K
      const u = ((tf - (a[0] as number)) / ((b[0] as number) - (a[0] as number))) || 0
      const v = a.map((x, j) => (j === 0 ? 0 : x === undefined ? undefined : b[j] === undefined ? x : (x as number) + ((b[j] as number) - (x as number)) * u))
      const R = this.warp(tf)
      out.push([R, ...v.slice(1)] as K, [R + s, ...v.slice(1)] as K)
    }
    return out.sort((x, y) => (x[0] as number) - (y[0] as number))
  }
  /** Percent of an already-warped time. */
  pcw(w: number): number { return r3(Math.min(100, Math.max(0, ((this.off + w) / this.T) * 100))) }

  // ---------------------------------------------------------------- tracks (whole-act keyframes)
  /** Any keyframes ([t s, declarations]) on a wrapper. `c` turns/scales about its own centre; `origin` sets one. */
  kf(svg: string, rows: [number, string][], o: { ease?: Ease | string; c?: boolean; origin?: string; attrs?: string } = {}): string {
    const k = this.k()
    this.rows(k, this.held(rows.map(([t, v]) => [this.pc(t), v])))
    return `<g class="${this.p}k${o.c ? ' sg-c' : ''}" style="animation-name:${k}${o.ease ? `;animation-timing-function:${ease(o.ease)}` : ''}${o.origin ? `;transform-origin:${o.origin}` : ''}"${o.attrs ? ` ${o.attrs}` : ''}>${svg}</g>`
  }
  /** Moves `svg` through [t, x, y, opacity?, extra transform?] keys (freezes hold). */
  mv(svg: string, keys: [number, number, number, number?, string?][], o: { ease?: Ease | string; c?: boolean } = {}): string {
    const k = this.k()
    const num = this.hold(apart(keys.map(([t, x, y, op]) => [t, x, y, op] as [number, number, number, number | undefined])))
    const extra = new Map(keys.map(([t, , , , ex]) => [this.warp(t), ex]))
    const fades = keys.some(q => q[3] !== undefined)
    this.rows(k, this.held(num.map(([w, x, y, op]) => [this.pcw(w), `transform:translate(${r1(x)}px,${r1(y)}px)${extra.get(w) ? ` ${extra.get(w)}` : ''}${fades ? `;opacity:${op ?? 1}` : ''}`])))
    const f = keys[0]
    return `<g class="${this.p}k${o.c ? ' sg-c' : ''}" style="animation-name:${k}${o.ease ? `;animation-timing-function:${ease(o.ease)}` : ''}"${f ? ` transform="translate(${r1(f[1])} ${r1(f[2])})"` : ''}>${svg}</g>`
  }
  /** Shown from t0 to t1 s: a cut, or faded over `fade` s, at opacity `op`. */
  on(svg: string, t0: number, t1: number, o: { fade?: number; op?: number } = {}): string {
    const k = this.k()
    const op = o.op ?? 1
    const f = o.fade ?? 0
    const a = this.pc(t0)
    const b = this.pc(t1)
    const rows: [number, string][] = f
      ? [[0, 'opacity:0'], [a, 'opacity:0'], [this.pc(t0 + f), `opacity:${op}`], [this.pc(Math.max(t0 + f, t1 - f)), `opacity:${op}`], [b, 'opacity:0'], [100, 'opacity:0']]
      : [[0, `opacity:${a > 0 ? 0 : op}`], ...(a > 0 ? [[a, `opacity:${op}`] as [number, string]] : []), ...(b < 100 ? [[b, 'opacity:0'], [100, 'opacity:0']] as [number, string][] : [[100, `opacity:${op}`]] as [number, string][])]
    this.rows(k, rows)
    return `<g class="${this.p}k" style="animation-name:${k}${f ? '' : ';animation-timing-function:steps(1,end)'}" opacity="0">${svg}</g>`
  }
  /** A stamp or title card that slams down at `t` (2.4x, overshoot to rest) and stays to `t1`. */
  slam(svg: string, t: number, t1: number): string {
    return this.kf(svg, [[0, 'opacity:0;transform:scale(2.4)'], [t, 'opacity:0;transform:scale(2.4)'], [t + 0.01, 'opacity:1;transform:scale(2.4)'], [t + 0.22, 'opacity:1;transform:scale(.94)'], [t + 0.3, 'opacity:1;transform:none'], [t1, 'opacity:1;transform:none'], [t1 + 0.01, 'opacity:0'], [this.T - this.off, 'opacity:0']], { c: true, ease: 'cubic-bezier(.2,1.3,.3,1)' })
  }

  // ---------------------------------------------------------------- cues (shared one-shots)
  /** A one-shot of `kind` at act time `t` (`d`: its length, s), placed at (x, y). The cheap way to fire anything. */
  cue(kind: Cue, t: number, inner: string, o: { d?: number; x?: number; y?: number } = {}): string {
    this.cues.add(kind)
    const scaled = kind === 'pop' || kind === 'burst' || kind === 'ring' || kind === 'rise'
    const g = `<g class="sg-${kind}${scaled ? ' sg-c' : ''}" style="--t:${r3(this.warp(t))}s${o.d !== undefined ? `;--d:${r3(o.d)}s` : ''}">${inner}</g>`
    return o.x !== undefined || o.y !== undefined ? `<g transform="translate(${r1(o.x ?? 0)} ${r1(o.y ?? 0)})">${g}</g>` : g
  }
  /** Shown from t0 to t1 (a cut both ways). */
  win(t0: number, t1: number, svg: string): string { return this.cue('show', t0, svg, { d: Math.max(0.02, this.warp(t1) - this.warp(t0)) }) }

  // ---------------------------------------------------------------- actors (frames + path)
  /** Register a pose (a `Sprite`) under `key`; `ax` is where the body stands across its width (0..1); `K` its own colour count. */
  cast(key: string, sp: Sprite, ax = 0.5, K?: number): this { this.bank.add(key, sp, ax, K); return this }
  /**
   * A frame-swap actor: its poses toggled by `segs`, moved along `path` (t, x, y, rotation?, opacity?, y-squash?).
   * Each pose is cut once (defs), each window costs a keyframe row, the path one keyframes block.
   */
  actor(name: string, segs: Seg[], path: Key[], o: ActorOpts = {}): string {
    const id = `${this.p}A${name.replace(/[^\w-]/g, '_')}`
    const sc = o.sc ?? 1
    for (const [a, , k] of segs) this.chain.push([a, k])
    const frames = new Map<string, Window[]>()
    for (const [a, b, k, dir = 1] of segs) { const fk = `${k}|${dir}`; (frames.get(fk) ?? frames.set(fk, []).get(fk))?.push([a, b]) }
    const rotates = path.some(k => k[3] !== undefined || k[5] !== undefined)
    let uses = ''
    const usesBy = new Map<string, string>()
    for (const [fk, wins] of frames) {
      const [k, dirS] = fk.split('|') as [string, string]
      const fid = `${id}-${k.replace(/[^\w-]/g, '_')}${dirS === '-1' ? 'l' : 'r'}`
      this.rows(fid, swapRows(wins, t => this.pc(t)))
      const u = `<g class="${this.p}f" style="animation-name:${fid}">${this.bank.use(k, 0, 0, Number(dirS) as 1 | -1, sc)}</g>`
      usesBy.set(fk, u)
      uses += u
    }
    const keys = this.hold(apart(path))
    const fades = path.some(k => k[4] !== undefined)
    this.rows(id, keys.map(([w, x, y, , op]) => [this.pcw(w), `transform:translate(${r1(x)}px,${r1(y)}px)${fades ? `;opacity:${op ?? 1}` : ''}`]))
    if (rotates) this.rows(`${id}r`, keys.map(([w, , , rot, , sy]) => [this.pcw(w), `transform:rotate(${r1(rot ?? 0)}deg)${sy !== undefined && sy !== 1 ? ` scale(1,${sy})` : ''}`]))
    const body = (withTrail: boolean, only?: [number, number]): string => {
      let trail = ''
      if (withTrail) for (const [a, b, m] of o.trail ?? []) trail += this.win(a, b, m)
      // A ghost carries only the poses that show while it does (an afterimage of the run, not every pose of the act).
      const u = only ? [...frames].filter(([, wins]) => wins.some(([a, b]) => a < only[1] && b > only[0] - 0.15)).map(([fk]) => usesBy.get(fk) ?? '').join('') : uses
      const inner = rotates ? `<g class="sg-c ${this.p}${o.spin ? 's' : 'k'}" style="animation-name:${id}r">${u}</g>` : u
      return `${trail}${inner}`
    }
    let out = `<g class="${this.p}k" style="animation-name:${id}">${body(true)}</g>`
    if (o.ghosts) {
      const [a, b] = o.ghosts
      for (const [i, lag] of [0.07, 0.14].entries()) out += this.win(a, b + lag, `<g class="${this.p}k" style="--q:calc(var(--p) + ${lag}s);opacity:${i ? 0.18 : 0.34};animation-name:${id}">${body(false, [a, b + lag])}</g>`)
    }
    return out
  }
  /** One pose standing at (x, y): for the reduced-motion still and for static props. */
  still(key: string, x: number, y: number, dir: 1 | -1 = 1, sc = 1): string { return this.bank.use(key, x, y, dir, sc) }
  /** Pose keys in time order (consecutive repeats once). */
  chainKeys(): string[] { return [...this.chain].sort((a, b) => a[0] - b[0]).map(c => c[1]).filter((k, i, a) => a[i - 1] !== k) }

  // ---------------------------------------------------------------- the layer
  /** This act's own CSS: the track classes, the cues it used, its life and the reduced-motion swap. */
  styles(): string {
    const T = r3(this.T)
    const rm = pair(this.p)
    const base = [
      `.${this.p}k{animation-duration:${T}s;animation-timing-function:linear;animation-fill-mode:both;animation-delay:var(--q)}`,
      `.${this.p}f{opacity:0;animation-duration:${T}s;animation-timing-function:steps(1);animation-fill-mode:both;animation-delay:var(--q)}`,
      `.${this.p}s{animation-duration:${T}s;animation-timing-function:steps(1);animation-fill-mode:both;animation-delay:var(--q)}`,
      `.${this.p}l{animation:${this.p}l ${T}s steps(1) both;animation-delay:var(--p)}`,
      `@keyframes ${this.p}l{0%,99.6%{opacity:1}100%{opacity:0;visibility:hidden}}`,
      C_CSS,
      rm.css,
    ]
    const cues = new Set<string>()
    for (const c of this.cues) for (const line of CUE_CSS[c].split('\n')) cues.add(line)
    return [...base, ...cues, ...this.extraCss, this.css].join('\n')
  }
  /**
   * The act as one layer to splice into a panel's Svg: its <style>, the poses' <defs>, `body` (drawn normally) and
   * `still` (drawn instead under reduced motion). Wrapped in `<!--dl-->` markers so a theme's reserve can count it.
   */
  done(body: string, still: string): string {
    const rm = pair(this.p)
    const P = pin(this.o.at)
    return `<!--dl--><g class="${this.p}l" pointer-events="none" style="--p:${P};--q:var(--p);--s:calc(${P} + ${r3(this.off)}s)"><style>${this.styles()}</style><defs>${this.bank.defs()}</defs>${rm.anim(body)}${rm.still(still)}</g><!--/dl-->`
  }
}
