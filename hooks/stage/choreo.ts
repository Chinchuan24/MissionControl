// The fight choreographer: a fight written as BEATS, compiled to one `Act` (actors with frames and paths), `fx` cues and
// a `Camera`. Lifted from Invincible's THE FIGHT (invincible-fight.ts: `bandCut`/`actCut` wrote every key by hand); here
// the beat says what happens and the compiler writes the keys, the hit-stop, the smears and the impact frames.
//
// Beats run on a cursor `t` (act seconds), in time order. Moves advance the cursor; instants (hit, freeze, impact, sfx)
// happen at it. `at(t)` jumps, `wait(s)` waits, `with()` runs the next move alongside the last one.
//   moves      approach, strike, knockback, throw, orbit, exit              (the fight)
//   stand-off  stare, step, flinch, backdown, say                           (the tension before it)
//   instants   hit (star + flash + shake + hit-stop), freeze, impact, smear, sfx, pose
// PG-13: an impact is a star, a flash, dust; nobody bleeds. Fights are RARE: schedule them with `fightLane` (director.ts).
//
//   const act = new Act({ id: 'boys-f2-band', ms: 6000, at, W, H }); act.cast('bIdle', SP.B1).cast('bPunch', SP.B2) ...
//   const f = new Fight(act, { sc: 2, ink: '#111' })
//   f.fighter('b', 'bIdle', 60, gy).fighter('h', 'hIdle', 300, gy, -1)
//   f.stare('b', 'h', 0.8).approach('b', 220, 0.4, { pose: 'bRun' }).strike('b', 'h', { pose: 'bPunch' })
//    .hit('h', { pose: 'hHit', word: 'POW', freeze: 0.08, shake: 3 }).knockback('h', 90, { pose: 'hFly', land: 'skid' })
//   const layer = act.done(f.body(), f.still())        // and f.cam.wrap(panel) for the camera
import { esc } from './budget'
import { Camera } from './camera'
import type { Ease } from './ease'
import { curve } from './ease'
import * as fx from './fx'
import type { Director, When } from './director'
import { Act, r1, r3 } from './timeline'
import type { Key, Seg } from './timeline'

export type FightLook = {
  /** Pixels per sprite pixel. Default 2. */
  sc?: number
  /** Outline ink (stars, words). */
  ink?: string
  /** The impact star's three frames. */
  star?: { core?: string; star?: string; ring?: string }
  /** Sparks, dust, speed lines, the smear, words (fill), the impact frame's ground and figures. */
  spark?: string
  dust?: string
  lines?: string
  smear?: string
  word?: string
  impactBg?: string
  impactFg?: string
  /** Big flashes: opacity (<= .5). */
  flash?: number
  font?: string
  /** A class for every word and bubble line in place of the font attributes (the skin's CSS sets font-family and weight). */
  textClass?: string
}
type F = { name: string; x: number; y: number; face: 1 | -1; pose: string; from: number; segs: Seg[]; path: Key[]; ghosts?: [number, number]; trail: [number, number, string][]; spin: boolean }

export class Fight {
  /** The cursor: act seconds. */
  t = 0
  readonly cam: Camera
  private fs = new Map<string, F>()
  private out = ''
  private last = 0
  private alongside = false
  /** Every hit (time, place, who): what tests and the still frame read. */
  readonly hits: { t: number; x: number; y: number; who: string }[] = []
  /** The beats as written (name, time): the fight's script, for tests and docs. */
  readonly script: [string, number][] = []
  constructor(readonly act: Act, readonly o: FightLook = {}, cam?: Camera) { this.cam = cam ?? new Camera(act) }
  private get sc(): number { return this.o.sc ?? 2 }
  private get(name: string): F {
    const f = this.fs.get(name)
    if (!f) throw new Error(`stage/choreo: no fighter "${name}"`)
    return f
  }
  private log(beat: string): void { this.script.push([beat, r3(this.t)]) }
  /** The text's font: the look's class when it has one (a few chars), else the font attributes. */
  private fontAttrs(weight: number): string { return this.o.textClass ? `class="${this.o.textClass}"` : `font-family="${this.o.font ?? 'ui-sans-serif,system-ui,sans-serif'}" font-weight="${weight}"` }

  // ---------------------------------------------------------------- cast and clock
  /** A fighter standing at (x, y) in `pose` (a key cast on the act), facing `face` (1 right, -1 left), from t = 0. */
  fighter(name: string, pose: string, x: number, y: number, face: 1 | -1 = 1): this {
    this.act.bank.pose(pose)
    this.fs.set(name, { name, x, y, face, pose, from: 0, segs: [], path: [[0, x, y]], trail: [], spin: false })
    return this
  }
  at(t: number): this { this.t = t; this.alongside = false; return this }
  wait(s: number): this { this.t += s; this.alongside = false; return this }
  /** The next move starts with the last one (two fighters moving at once). */
  with(): this { this.t = this.last; this.alongside = true; return this }
  /** Change a fighter's pose (and facing) at the cursor. */
  pose(who: string, pose: string, face?: 1 | -1): this {
    const f = this.get(who)
    this.act.bank.pose(pose)
    if (f.pose === pose && (face === undefined || face === f.face)) return this
    if (this.t > f.from) f.segs.push([r3(f.from), r3(this.t), f.pose, f.face])
    f.pose = pose
    f.from = this.t
    if (face !== undefined) f.face = face
    return this
  }
  /** A key holding the fighter where it stands at act time t (so the next move starts from there, not from the last key). */
  private hold(f: F, t: number): void {
    const prev = f.path[f.path.length - 1] as Key
    if (prev[0] < t) f.path.push([r3(t), f.x, f.y])
  }
  /** A move from the cursor over `d` s, sampled from an ease (so a CSS-linear path still feels eased). */
  private move(f: F, x: number, y: number, d: number, e: Ease | string = 'settle', o: { rot?: number; arc?: number; op?: number; n?: number } = {}): void {
    const t0 = this.t
    const x0 = f.x
    const y0 = f.y
    const c = curve(e)
    const n = o.n ?? (d > 0.25 ? 4 : 2)
    this.hold(f, t0)
    for (let i = 1; i <= n; i++) {
      const u = i / n
      const v = c(u)
      const lift = o.arc ? -o.arc * 4 * u * (1 - u) : 0
      f.path.push([r3(t0 + d * u), r1(x0 + (x - x0) * v), r1(y0 + (y - y0) * v + lift), o.rot !== undefined ? r1(o.rot * u) : undefined, i === n ? o.op : undefined] as Key)
    }
    f.x = x
    f.y = y
    // A turning move lands upright: a stepped spin holds its last angle until the next key, so square it up now.
    if (o.rot !== undefined) f.path.push([r3(t0 + d + 0.01), r1(x), r1(y), 0] as Key)
    this.last = t0
    this.t = t0 + d
  }

  // ---------------------------------------------------------------- stand-off
  /** Two fighters size each other up for `d` s: both hold, the camera creeps in on them, then snaps back. */
  stare(a: string, b: string, d = 0.8, o: { push?: number } = {}): this {
    this.log('stare')
    const A = this.get(a)
    const B = this.get(b)
    this.cam.push(this.t, this.t + d, 1 + (o.push ?? 0.06), (A.x + B.x) / 2, (A.y + B.y) / 2, 'settle').reset(this.t + d, this.t + d + 0.12, 'snap')
    this.last = this.t
    this.t += d
    return this
  }
  /** A small step forward (dx along the fighter's facing) with a 2 px bob. */
  step(who: string, dx = 10, d = 0.3, o: { pose?: string } = {}): this {
    this.log('step')
    const f = this.get(who)
    if (o.pose) this.pose(who, o.pose)
    const t0 = this.t
    const x1 = f.x + dx * f.face
    this.hold(f, t0)
    f.path.push([r3(t0 + d / 2), r1((f.x + x1) / 2), r1(f.y - 2)], [r3(t0 + d), r1(x1), f.y])
    f.x = x1
    this.last = t0
    this.t = t0 + d
    return this
  }
  /** A flinch: a jolt back of `px` and return, in `pose` for `d` s. */
  flinch(who: string, o: { pose?: string; d?: number; px?: number } = {}): this {
    this.log('flinch')
    const f = this.get(who)
    const d = o.d ?? 0.18
    const was = f.pose
    if (o.pose) this.pose(who, o.pose)
    const t0 = this.t
    this.hold(f, t0)
    f.path.push([r3(t0 + 0.04), r1(f.x - (o.px ?? 3) * f.face * this.sc / 2), f.y], [r3(t0 + d), f.x, f.y])
    this.t = t0 + d
    if (o.pose) this.pose(who, was)
    this.t = t0
    return this
  }
  /** Backing down: a slow step back of `dx`, eyes still on the other. */
  backdown(who: string, dx = 16, d = 0.6, o: { pose?: string } = {}): this {
    this.log('backdown')
    const f = this.get(who)
    if (o.pose) this.pose(who, o.pose)
    this.move(f, f.x - dx * f.face, f.y, d, 'settle')
    return this
  }

  // ---------------------------------------------------------------- the fight
  /** Close in on x over `d` s (speed lines behind, ghosts when fast). */
  approach(who: string, x: number, d = 0.4, o: { pose?: string; ease?: Ease | string; lines?: boolean; ghosts?: boolean; y?: number } = {}): this {
    this.log('approach')
    const f = this.get(who)
    if (o.pose) this.pose(who, o.pose)
    const t0 = this.t
    const fast = Math.abs(x - f.x) / Math.max(0.05, d) > 300
    if (o.lines ?? fast) f.trail.push([t0, t0 + d, fx.speedLines(-f.face * 10 * this.sc, -4 * this.sc, 14 * this.sc, 4, f.face, this.o.lines ?? '#FFFFFF', { seed: `${who}${t0}` })])
    if (o.ghosts ?? fast) f.ghosts ??= [t0, t0 + d]
    this.move(f, x, o.y ?? f.y, d, o.ease ?? 'snap')
    return this
  }
  /**
   * A strike: `who` lunges to `reach` px short of `target` in `d` s in `pose`, with a one-frame SMEAR (the pose stretched
   * along the lunge) when it travels. The hit comes from `hit()` right after.
   */
  strike(who: string, target: string, o: { pose?: string; d?: number; reach?: number; smear?: boolean } = {}): this {
    this.log('strike')
    const f = this.get(who)
    const g = this.get(target)
    const d = o.d ?? 0.12
    const x = g.x - f.face * (o.reach ?? 16 * this.sc)
    const t0 = this.t
    const x0 = f.x
    if (o.pose) this.pose(who, o.pose)
    if ((o.smear ?? true) && Math.abs(x - x0) > 10) this.smear(who, x0, x, t0 + d * 0.4)
    this.move(f, x, f.y, d, 'snap', { n: 1 })
    return this
  }
  /**
   * The hit, at the cursor: `target` takes it (pose for `d` s), a 3-frame star, sparks, a flash, a shake, a word, then
   * the HIT-STOP (`freeze` s, default 0.07: every path holds while the star plays). `impact` adds an impact frame.
   */
  hit(target: string, o: { pose?: string; d?: number; x?: number; y?: number; r?: number; flash?: number | false; shake?: 1 | 2 | 3 | 4 | false; freeze?: number | false; word?: string; sparks?: boolean; impact?: boolean } = {}): this {
    this.log('hit')
    const g = this.get(target)
    const t = this.t
    // Where the blow lands: on the target's front (it faces its attacker).
    const x = o.x ?? g.x + g.face * 8 * this.sc
    const y = o.y ?? g.y - 4 * this.sc
    const r = o.r ?? 9 * this.sc
    this.hits.push({ t, x, y, who: target })
    if (o.pose) this.pose(target, o.pose)
    if (o.impact) this.impact()
    this.out += fx.star3(this.act, t, x, y, r, { ...this.o.star, ...(this.o.ink ? { ink: this.o.ink } : {}) })
    if (o.sparks ?? true) this.out += fx.sparks(this.act, t + 0.02, x, y, { seed: `hit${t}${target}`, ...(this.o.spark ? { color: this.o.spark } : {}) })
    // With an impact frame the flash follows it (a flash over the ink frame would grey it out).
    if (o.flash !== false && (o.flash ?? 0) > 0) this.out += fx.flash(this.act, o.impact ? t + 0.08 : t, { a: Math.min(0.5, o.flash as number) })
    if (o.word) this.sfx(o.word, x + 6 * this.sc, y - 14 * this.sc, { size: 7 * this.sc })
    if (o.shake !== false) this.cam.shake(t, o.shake ?? 2, 0.2)
    if (o.freeze !== false) this.freeze(o.freeze ?? 0.07)
    return this
  }
  /** Hit-stop: everything holds `s` s at the cursor (Act.freeze), with a 1 px camera tap. A beat of its own. */
  freeze(s = 0.07): this {
    this.log('freeze')
    this.cam.freeze(this.t, s, true)
    return this
  }
  /**
   * An IMPACT FRAME at the cursor: two frames of the whole panel in ink with every fighter as a bright silhouette (the
   * anime hit), `d` s in all. Cheap: one rect and one <use> of each silhouette.
   */
  impact(o: { d?: number; bg?: string; fg?: string } = {}): this {
    this.log('impact')
    let figs = ''
    for (const f of this.fs.values()) figs += `<use href="#${this.act.bank.sil(f.pose)}" fill="${o.fg ?? this.o.impactFg ?? '#FFFFFF'}" transform="translate(${r1(f.x)} ${r1(f.y)}) ${this.act.bank.anchor(f.pose, f.face, this.sc)}"/>`
    this.out += this.act.win(this.t, this.t + (o.d ?? 0.08), `<rect width="${this.act.W}" height="${this.act.H}" fill="${o.bg ?? this.o.impactBg ?? '#111111'}" opacity=".88"/>${figs}`)
    return this
  }
  /** A SMEAR frame at act time t: the fighter's current pose stretched from x0 to x1, half see-through, for one frame. */
  smear(who: string, x0: number, x1: number, t = this.t, d = 0.06): this {
    const f = this.get(who)
    const p = this.act.bank.pose(f.pose)
    const w = Math.max(1, Math.abs(x1 - x0) / (p.w * this.sc) + 1)
    const mid = (x0 + x1) / 2
    this.out += this.act.win(t, t + d, `<g opacity=".55"><use href="#${this.act.bank.sil(f.pose)}" fill="${this.o.smear ?? '#FFFFFF'}" transform="translate(${r1(mid)} ${r1(f.y)}) scale(${r3(w)} 1) ${this.act.bank.anchor(f.pose, f.face, this.sc)}"/></g>`)
    return this
  }
  /** An SFX word that pops at the cursor (escaped). */
  sfx(word: string, x: number, y: number, o: { size?: number; tilt?: number; d?: number; fill?: string } = {}): this {
    const size = o.size ?? 14
    const ink = this.o.ink ?? '#111111'
    this.out += this.act.cue('pop', this.t, `<text text-anchor="middle" ${this.fontAttrs(900)} font-size="${r1(size)}" fill="${o.fill ?? this.o.word ?? '#FFE066'}" stroke="${ink}" stroke-width="${r1(size * 0.18)}" paint-order="stroke" transform="rotate(${o.tilt ?? -6})">${esc(word)}</text>`, { x, y, d: o.d ?? 0.55 })
    return this
  }
  /** A speech bubble over a fighter from the cursor for `d` s (escaped; keep it to a few words). The stand-off's line. */
  say(who: string, text: string, d = 0.6, o: { fill?: string; ink?: string; size?: number } = {}): this {
    this.log('say')
    const f = this.get(who)
    const size = o.size ?? 10
    const w = Math.round(text.length * size * 0.62 + 14)
    const p = this.act.bank.pose(f.pose)
    const y = r1(f.y - (p.h / 2) * this.sc - 8)
    const x = r1(f.face < 0 ? f.x - w + 10 : f.x - 10)
    const tail = f.face < 0 ? `M${r1(x + w - 18)} ${y}l6 7 2-7z` : `M${r1(x + 12)} ${y}l-2 7 8-7z`
    const ink = o.ink ?? this.o.ink ?? '#111111'
    this.out += this.act.win(this.t, this.t + d, `<rect x="${x}" y="${r1(y - 18)}" width="${w}" height="18" rx="3" fill="${o.fill ?? '#FFFFFF'}" stroke="${ink}" stroke-width="1.5"/><path d="${tail}" fill="${o.fill ?? '#FFFFFF'}" stroke="${ink}" stroke-width="1.5" stroke-linejoin="round"/><text x="${r1(x + w / 2)}" y="${r1(y - 5.5)}" text-anchor="middle" ${this.fontAttrs(800)} font-size="${size}" fill="${ink}">${esc(text)}</text>`)
    return this
  }
  /**
   * Knockback: `who` flies `dx` px away from where it faces (dy up) over `d` s, ghosted, turning `rot` deg if given,
   * and lands: 'skid' (dust trail + skid pose), 'crash' (ring, dust, debris), or 'none'.
   */
  knockback(who: string, dx = 60, o: { d?: number; dy?: number; pose?: string; rot?: number; land?: 'skid' | 'crash' | 'none'; landPose?: string; arc?: number; ease?: Ease | string } = {}): this {
    this.log('knockback')
    const f = this.get(who)
    const d = o.d ?? 0.45
    if (o.pose) this.pose(who, o.pose)
    const t0 = this.t
    f.ghosts ??= [t0, t0 + d]
    const x1 = f.x - f.face * dx
    const y1 = f.y + (o.dy ?? 0)
    this.move(f, x1, y1, d, o.ease ?? 'settle', { ...(o.rot !== undefined ? { rot: o.rot } : {}), arc: o.arc ?? 10, n: 5 })
    if (o.rot !== undefined) f.spin = true
    const land = o.land ?? 'skid'
    const gy = y1 + 8 * this.sc
    if (land === 'skid') this.out += fx.dust(this.act, this.t, x1, gy, { seed: `sk${t0}`, n: 4, dx: f.face * 7, ...(this.o.dust ? { color: this.o.dust } : {}) })
    if (land === 'crash') {
      this.out += fx.ring(this.act, this.t, x1, gy, { rx: 10 * this.sc, ...(this.o.dust ? { color: this.o.dust } : {}) }) + fx.dust(this.act, this.t, x1, gy, { seed: `cr${t0}`, n: 5 }) + fx.debris(this.act, this.t, x1, gy - 4, { seed: `db${t0}` })
      this.cam.shake(this.t, 2, 0.16)
    }
    if (o.landPose) this.pose(who, o.landPose)
    return this
  }
  /** A throw: `who` (the one thrown) flies to (x, y) over `d` s on an arc `arc` px high, turning `turns` times. */
  throw(who: string, x: number, y: number, o: { d?: number; arc?: number; turns?: number; pose?: string } = {}): this {
    this.log('throw')
    const f = this.get(who)
    if (o.pose) this.pose(who, o.pose)
    f.ghosts ??= [this.t, this.t + (o.d ?? 0.5)]
    this.move(f, x, y, o.d ?? 0.5, 'linear', { arc: o.arc ?? 30, rot: 360 * (o.turns ?? 1), n: 8 })
    f.spin = true
    return this
  }
  /**
   * A swing round a pivot (a fighter swung by the wrist, a hammer throw): the fighter turns from angle `a0` to `a1` (CSS
   * degrees, clockwise) while its centre circles (cx, cy) at radius `r`, so its top always points at the pivot (0 = hanging
   * straight below it, 90 = held out to its left, 180 = straight above it). Rotation is smooth (a stepped spin from an earlier
   * throw on the same fighter steps it: keep `n` keys at ~20 degrees). `upright` squares it up when the swing ends.
   */
  orbit(who: string, cx: number, cy: number, r: number, a0: number, a1: number, d = 0.5, o: { pose?: string; ease?: Ease | string; n?: number; upright?: boolean } = {}): this {
    this.log('orbit')
    const f = this.get(who)
    if (o.pose) this.pose(who, o.pose)
    const t0 = this.t
    const c = curve(o.ease ?? 'linear')
    const n = o.n ?? Math.max(3, Math.ceil(Math.abs(a1 - a0) / 20))
    const at = (a: number): [number, number] => { const q = (a * Math.PI) / 180; return [r1(cx - r * Math.sin(q)), r1(cy + r * Math.cos(q))] }
    this.hold(f, t0)
    for (let i = 0; i <= n; i++) {
      const u = i / n
      const a = a0 + (a1 - a0) * c(u)
      const [x, y] = at(a)
      f.path.push([r3(t0 + d * u + (i ? 0 : 0.001)), x, y, r1(a)] as Key)
    }
    const [x1, y1] = at(a1)
    f.x = x1
    f.y = y1
    if (o.upright) f.path.push([r3(t0 + d + 0.01), x1, y1, 0] as Key)
    this.last = t0
    this.t = t0 + d
    return this
  }
  /** Exit: off the panel toward `dir` (default: the way it faces) over `d` s, fading if `fade`. */
  exit(who: string, o: { dir?: 1 | -1; d?: number; pose?: string; fade?: boolean } = {}): this {
    this.log('exit')
    const f = this.get(who)
    if (o.pose) this.pose(who, o.pose)
    const dir = o.dir ?? f.face
    const x = dir > 0 ? this.act.W + 40 * this.sc : -40 * this.sc
    this.move(f, x, f.y, o.d ?? 0.5, 'anticipate', o.fade ? { op: 0 } : {})
    return this
  }

  // ---------------------------------------------------------------- compile
  /** Everything the fight draws: the actors (frames + paths, ghosts, trails) and every fx cue. Call once, at the end. */
  body(): string {
    const end = r3(this.act.T - this.act.off)
    let s = ''
    for (const f of this.fs.values()) {
      const segs: Seg[] = [...f.segs, [r3(f.from), end, f.pose, f.face]]
      const last = f.path[f.path.length - 1] as Key
      const path: Key[] = last[0] < end ? [...f.path, [end, last[1], last[2], f.spin ? last[3] : undefined, last[4]] as Key] : [...f.path]
      // A path with any rotation key needs it on every key (an undefined one reads as 0 anyway).
      s += this.act.actor(f.name, segs, path, { sc: this.sc, ...(f.ghosts ? { ghosts: f.ghosts } : {}), ...(f.trail.length ? { trail: f.trail } : {}), ...(f.spin ? { spin: true } : {}) })
    }
    return s + this.out
  }
  /** The reduced-motion still: the biggest clash (the last hit) with every fighter where it stood then, and the star. */
  still(): string {
    let s = ''
    for (const f of this.fs.values()) {
      const seg = f.segs.find(g => this.hits.length && g[0] <= (this.hits[this.hits.length - 1] as { t: number }).t && g[1] > (this.hits[this.hits.length - 1] as { t: number }).t)
      const key = seg ? seg[2] : f.pose
      const dir = (seg ? seg[3] : f.face) ?? 1
      const p = this.posAt(f, this.hits.length ? (this.hits[this.hits.length - 1] as { t: number }).t : 0)
      s += this.act.still(key, p[0], p[1], dir, this.sc)
    }
    const h = this.hits[this.hits.length - 1]
    if (h) s += `<polygon points="${Array.from({ length: 16 }, (_, i) => { const a = (Math.PI * i) / 8 - Math.PI / 2; const r = i % 2 ? 6 : 14; return `${r1(h.x + Math.cos(a) * r)},${r1(h.y + Math.sin(a) * r)}` }).join(' ')}" fill="${this.o.star?.star ?? '#FFE066'}" stroke="${this.o.ink ?? '#111111'}"/>`
    return s
  }
  private posAt(f: F, t: number): [number, number] {
    let p: [number, number] = [f.path[0]?.[1] ?? f.x, f.path[0]?.[2] ?? f.y]
    for (const k of f.path) if (k[0] <= t) p = [k[1], k[2]]
    return p
  }
}

/**
 * The fight lane of a skin's director: at most one fight per 30-45 min (the crew's rule), only while a job works, the
 * fights in turns, each with a `/missioncontrol play <replay>` name. Add the lane where it ranks (lanes added before it
 * beat it). Returns the director.
 */
export const fightLane = (dir: Director, fights: { id: string; ms: number; replay?: string }[], o: { when?: When; lane?: string } = {}): Director => {
  const lane = o.lane ?? 'fight'
  dir.lane(lane, { gap: 'fight', when: o.when ?? 'working', pick: 'turns', breathMs: 20_000 })
  for (const f of fights) dir.add(lane, { id: f.id, ms: f.ms, replay: f.replay ?? f.id })
  return dir
}
