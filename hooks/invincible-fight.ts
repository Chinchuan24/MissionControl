// THE FIGHT v2 (Invincible fan homage): Mark vs Omni-Man as a frame-by-frame flipbook on one timeline across the band and the
// pane, written as BEATS on the shared stage engine (stage/choreo.ts) instead of hand keys. Mark is thrown out of the band's
// avatar slot, trades blows in the band (5.5 s), and is thrown DOWN toward the viewer into the pane, where the fight goes on
// over three cards, one act each: COVER STORY "The Catch", GDA WALL "Every Angle", THE PAGE "Think, Mark" (`ACT_OF`).
//
// v2, what makes the hits land: a HIT-STOP on every hit (the paths hold 30-100 ms, the shake starts after it), eased moves
// (an ease-in dash into contact, an ease-out knock-back), anticipation (Omni-Man's backwind before every backhand, a pull-back
// before Mark's dash), smear frames (Mark's punch smear, Omni-Man's backhand smear), anime impact frames (an ink burst with
// both fighters as white silhouettes, then inverted), a camera that punches in and pans with the knock-back (the act layer
// only: the working numbers never move), the panel shake in 1-4 px tiers, dust, debris, a crater and KO stars.
// The throw toward the viewer: Mark grows S -> M as he leaves the band, then L -> XL as he smashes into COVER STORY.
// Three versions take turns (`VERSIONS`): the band cut changes, the pane acts are the same fight going on.
//
// Cartoon rules: no red in the effects (white / yellow / cyan stars), no blood, no gore, a quiet last act. Under reduced
// motion there is no animation: one still clash frame per surface.
import type { Sprite } from './cast'
import { Camera, SHAKE_CSS } from './stage/camera'
import { Fight } from './stage/choreo'
import type { FightLook } from './stage/choreo'
import { curve } from './stage/ease'
import * as fx from './stage/fx'
import { rectPaths } from './stage/frames'
import { Act, r1, r3 } from './stage/timeline'
import { COND, PROPS, SP, pal, pin } from './invincible'
import type { Era } from './invincible'
import * as MS from './invincible-motion-sprites'

export const FIGHT_MS = 18_400
export const FIGHT_T = FIGHT_MS / 1000
export const BAND_CUT = 5.5
/** Where each pane act starts on the timeline (s), and how long it is. The band cut hands Mark down at about 4.3 s. */
export const ACT_OFF = [4.4, 9.0, 13.8] as const
export const ACT_LEN = [4.6, 4.8, 4.6] as const
export const HOLE_END = FIGHT_T + 0.6
/**
 * What the pane keeps in reserve for THE FIGHT while a job works: the three acts together, at the widest card (the engine counts the
 * drawing without the layers between `<!--dl-->` markers and adds this instead, so the pane never changes layout as a fight comes
 * and goes). Tested against the real sizes.
 */
export const FIGHT_PANE_RESERVE = 100_000
/** The three versions, in the director's turns: `/missioncontrol play <name>` plays one. The band cut is what changes. */
export const VERSIONS = ['the-catch', 'jet-flick', 'every-angle'] as const
export type Version = 0 | 1 | 2
export type ActIndex = 0 | 1 | 2
/** Hit-stop lengths (s): a jab, a punch, a big hit, a slam. */
export const STOP = { jab: 0.03, punch: 0.07, big: 0.09, slam: 0.1 } as const

const EASE_IN = 'cubic-bezier(.55,0,1,.45)'
const EASE_OUT = 'cubic-bezier(0,.55,.45,1)'
const COMBO_NAMES = ['A', 'B', 'C'] as const

// ---------------------------------------------------------------- the frames
const OM: Record<string, string> = { O1: 'O1_IDLE', O2: 'O2_CROSS', O3: 'O3_PITCH', O4: 'O4_CATCH', O6: 'O6_BACKWIND', O7: 'O7_BACKHAND', O8: 'O8_JAB', O9: 'O9_HAMMERUP', O9B: 'O9B_HAMMERDOWN', O10: 'O10_GRAB', O11: 'O11_FLINCH', O12: 'O12_HANDS', O13: 'O13_FLY' }
const MK: Record<string, string> = { M1: 'M1_READY', M2: 'M2_CHARGE', M3: 'M3_PUNCH', M4: 'M4_JABL', M5: 'M5_JABR', M6: 'M6_GRAB', M7: 'M7_BLOCK', M8: 'M8_HIT', M9: 'M9_BALL', M10: 'M10_SKID', M11: 'M11_RECOVER', M12: 'M12_KNEEL' }
/** v2's frames: Omni-Man's backhand smear, Mark's punch smear (per suit), the four throw-toward-the-viewer sizes. */
const V2 = ['OS', 'MS', 'T1', 'T2', 'T3', 'T4'] as const
/** Where the body stands in each frame (a fraction of its width), so a wide frame with an arm out does not shift the body. */
const AX: Record<string, number> = { O1: 0.5, O2: 0.5, O3: 0.5, O4: 0.38, O6: 0.45, O7: 0.42, O8: 0.42, O9: 0.45, O9B: 0.45, O10: 0.4, O11: 0.5, O12: 0.5, O13: 0.55, M1: 0.45, M2: 0.5, M3: 0.4, M4: 0.35, M5: 0.4, M6: 0.45, M7: 0.5, M8: 0.5, M9: 0.5, M10: 0.6, M11: 0.5, M12: 0.5, OS: 0.3, MS: 0.6, T1: 0.5, T2: 0.5, T3: 0.5, T4: 0.5 }
export const FRAME_KEYS = [...Object.keys(OM), ...Object.keys(MK), ...V2]
const ALL = SP as unknown as Record<string, Sprite>

// The new suit's throw frames: the classic frames recoloured (yellow top -> black, navy legs -> blue, blue gloves -> light blue).
const rgb = (h: string): [number, number, number] => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
const SUIT2 = new Map<string, Sprite>()
/** A classic-suit sprite in the new suit's colours (cached). */
export const suit2 = (sp: Sprite): Sprite => {
  const hit = SUIT2.get(sp.rows.join(''))
  if (hit) return hit
  const out: Record<string, string> = {}
  for (const [k, c] of Object.entries(sp.pal)) {
    const [r, g, b] = rgb(c)
    const l = 0.3 * r + 0.59 * g + 0.11 * b
    if (g > 140 && b < 90 && r > g) out[k] = l > 180 ? '#3A3F4E' : '#2A2D38' // the yellow top: black, lit
    else if (b > r + 25 && l > 90) out[k] = l > 120 ? '#6FB4F5' : '#4E99C3' // gloves and boots: the light blue
    else if (b > r && l < 70) out[k] = l > 50 ? '#3E73B0' : '#2F5A90' // the navy legs: blue
    else out[k] = c
  }
  const s = { rows: sp.rows, pal: out }
  SUIT2.set(sp.rows.join(''), s)
  return s
}
/** The sprite of a frame key (`O4`, `M3`, `MS`, `T4`) in an era: Omni-Man's are shared, Mark's follow the suit. */
export const frameSprite = (key: string, era: Era): Sprite => {
  const o = OM[key]
  if (o) return ALL[`FX_${o}`] as Sprite
  if (key === 'OS') return MS.FX_O_SMEAR_BACKHAND
  if (key === 'MS') return era === 2 ? MS.FX3_M_SMEAR_PUNCH : MS.FX_M_SMEAR_PUNCH
  const t = ({ T1: MS.FX_M_THROWN_S, T2: MS.FX_M_THROWN_M, T3: MS.FX_M_THROWN_L, T4: MS.FX_M_THROWN_XL } as Record<string, Sprite>)[key]
  if (t) return era === 2 ? suit2(t) : t
  return ALL[`${era === 2 ? 'FX3_' : 'FX_'}${MK[key]}`] as Sprite
}
const info = (key: string): { name: string; ax: number; face: 1 } => ({ name: key, ax: AX[key] ?? 0.5, face: 1 })

// Pixel runs merged into rectangles, the palette reduced to the `K` most used colours: the shared stage engine's cutter.
export { rectPaths }

// ---------------------------------------------------------------- shared CSS (once per Svg that carries a piece of the fight)
/** The panel shake's keyframes (the engine's four tiers) and the camera wrapper stopped under reduced motion. */
export const FIGHT_CSS = `${SHAKE_CSS.replace(/\n/g, '')}.dl-c{transform-box:fill-box;transform-origin:50% 50%}.dl-t{font-family:${COND};font-weight:900}@media (prefers-reduced-motion: reduce){.dl-anim{display:none}.dl-cam{animation:none!important}.dl-still{display:block}}`

// ---------------------------------------------------------------- the cut builder
const STAR = { core: '#FFFFFF', star: '#FFE066', ring: '#9FE8FF' }
const BLOCK = '#1B2236'
const look = (sc: number): FightLook => ({ sc, ink: PROPS.ink, star: STAR, spark: '#FFE9A8', dust: '#FFFFFF', lines: '#FFFFFF', word: '#FFE066', font: COND, textClass: 'dl-t', impactBg: PROPS.ink, impactFg: '#FFFFFF' })
/** Act time at which an eased move reaches progress `v` (0..1). */
const when = (e: string, v: number): number => { const c = curve(e); let lo = 0; let hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (c(m) < v) lo = m; else hi = m } return (lo + hi) / 2 }

/** One surface of the fight: the act, its fight, its camera, and what the skin adds around the engine's beats. */
class Cut {
  readonly act: Act
  readonly f: Fight
  readonly cam: Camera
  set = ''
  stills = ''
  /** Where each fighter is (kept by the cut's own moves), for impact frames and stills. */
  readonly at: Record<string, { x: number; y: number; pose: string; face: 1 | -1 }> = {}
  private filters = false
  /** The highest a word's baseline may sit (the band keeps its header row clear). */
  get top(): number { return this.box[2] < this.W ? 54 : 30 }
  constructor(id: string, readonly start: number, off: number, readonly era: Era, readonly sc: number, readonly W: number, readonly H: number, readonly box: [number, number, number, number], K = 4) {
    this.act = new Act({ id, ms: FIGHT_MS, at: start, W, H, off, K })
    for (const k of FRAME_KEYS) this.act.cast(k, frameSprite(k, era), info(k).ax)
    this.act.extraCss.add(FIGHT_CSS)
    this.cam = new Camera(this.act)
    this.f = new Fight(this.act, look(sc), this.cam)
  }
  fighter(name: string, pose: string, x: number, y: number, face: 1 | -1): this { this.f.fighter(name, pose, x, y, face); this.at[name] = { x, y, pose, face }; return this }
  /** Keep the cut's own note of where a fighter is (moves through the engine update it there; this mirrors it). */
  note(name: string, x: number, y: number, pose?: string, face?: 1 | -1): void { const p = this.at[name]; if (p) { p.x = x; p.y = y; if (pose) p.pose = pose; if (face) p.face = face } }
  /** A full-box flash (the band keeps it off the readouts on its right). */
  flash(t: number, a = 0.35, cx = 0, cy = 0): void {
    const [x, y, w, h] = this.box
    if (w >= this.W) { this.set += this.act.cue('show', t, `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" fill="#FFFFFF" opacity="${a}"/>`, { d: 0.06 }); return }
    const rx = Math.max(40, Math.min(150, x + w - cx))
    const pts = Array.from({ length: 20 }, (_, i) => { const q = (Math.PI * i) / 10; const k = i % 2 ? 0.55 : 1; return `${Math.round(cx + Math.cos(q) * rx * k)},${Math.round(cy + Math.sin(q) * h * 0.42 * k)}` }).join(' ')
    this.set += this.act.cue('show', t, `<polygon points="${pts}" fill="#FFFFFF" opacity="${a}"/>`, { d: 0.06 })
  }
  /**
   * The anime IMPACT FRAME at `t`: an ink burst round (cx, cy) with both fighters as white silhouettes (40 ms), then the same
   * inverted (40 ms). Local, so the card's text around it never goes dark.
   */
  impact(t: number, cx: number, cy: number, rx: number, ry: number): void {
    const [bx, , bw] = this.box
    const RX = Math.max(30, Math.min(rx, cx - bx, bx + bw - cx))
    const pts = Array.from({ length: 24 }, (_, i) => { const a = (Math.PI * i) / 12; const k = i % 2 ? 0.72 : 1; return `${Math.round(cx + Math.cos(a) * RX * k)},${Math.round(cy + Math.sin(a) * ry * k)}` }).join(' ')
    // The silhouettes are the poses themselves through a flat-colour filter (no second copy of any pose in the defs).
    const p = this.act.p
    if (!this.filters) { this.filters = true; this.set += `<defs><filter id="${p}iw"><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/></filter><filter id="${p}ik"><feColorMatrix values="0 0 0 0 .04 0 0 0 0 .05 0 0 0 0 .08 0 0 0 1 0"/></filter></defs>` }
    const figs = (k: string): string => `<g filter="url(#${p}${k})">${Object.values(this.at).map(q => this.act.bank.use(q.pose, r1(q.x), r1(q.y), q.face, this.sc)).join('')}</g>`
    this.set += this.act.win(t, t + 0.04, `<polygon points="${pts}" fill="${PROPS.ink}" opacity=".92"/>${figs('iw')}`)
    this.set += this.act.win(t + 0.04, t + 0.08, `<polygon points="${pts}" fill="#FFFFFF" opacity=".9"/>${figs('ik')}`)
  }
  /** A hit, the v2 way: the engine's hit (star, sparks, word, HIT-STOP), then the shake AFTER the freeze, and a punch-in. */
  hit(target: string, o: { pose?: string; word?: string; r?: number; stop: number; sparks?: boolean; shake: 1 | 2 | 3 | 4; flash?: number; impact?: [number, number]; push?: number; x?: number; y?: number; wx?: number; wy?: number }): void {
    const t = this.f.t
    const p = this.at[target]
    if (o.pose && p) p.pose = o.pose
    const hx = o.x ?? (p ? p.x + p.face * 8 * this.sc : 0)
    const hy = o.y ?? (p ? p.y - 4 * this.sc : 0)
    if (o.impact) this.impact(t, hx, hy, o.impact[0], o.impact[1])
    this.f.hit(target, { ...(o.pose ? { pose: o.pose } : {}), ...(o.r !== undefined ? { r: o.r } : {}), x: hx, y: hy, flash: false, shake: false, freeze: o.stop, sparks: o.sparks ?? o.shake > 2 })
    if (o.word) this.f.sfx(o.word, o.wx ?? hx + 6 * this.sc, Math.max(this.top, o.wy ?? hy - 14 * this.sc), { size: o.shake > 2 ? 19 : 15, tilt: o.shake % 2 ? -6 : 7 })
    if (o.flash) this.flash(t + (o.impact ? 0.08 : 0), o.flash, hx, hy)
    this.cam.shake(t + 0.001, o.shake, o.shake > 2 ? 0.22 : 0.12)
    if (o.push) this.cam.push(t + 0.001, t + 0.12, o.push, hx, hy, 'snap').reset(t + 0.13, t + 0.5, 'settle')
  }
  /** A jab: one small star blink, an optional word, a short hit-stop and a 1 px tap after it (cheaper than a full hit). */
  jab(x: number, y: number, word?: string, wx = x, wy = y - 20): void {
    const t = this.f.t
    this.set += this.act.cue('blink', t, `<polygon points="${Array.from({ length: 12 }, (_, i) => { const a = (Math.PI * i) / 6; const r = i % 2 ? 2.5 : 7; return `${Math.round(x + Math.cos(a) * r)},${Math.round(y + Math.sin(a) * r)}` }).join(' ')}" fill="#FFE066" stroke="${PROPS.ink}"/>`)
    if (word) this.f.sfx(word, wx, Math.max(this.top, wy), { size: 14, tilt: x % 2 > 1 ? 8 : -8, d: 0.3 })
    this.f.freeze(STOP.jab)
    this.cam.shake(t + 0.001, 1, 0.08)
  }
  /** A skyline block that stands until `t`, then breaks: debris, glass glints, a puff, confetti, KRAK, a short hit-stop. */
  block(t0: number, t: number, bx: number, top: number, bh: number, word = true): void {
    const a = this.act
    this.set += a.win(t0, t, `<rect x="${r1(bx - 13)}" y="${r1(top)}" width="26" height="${r1(bh)}" fill="${BLOCK}" stroke="${PROPS.ink}" stroke-width="1.5"/><rect x="${r1(bx - 8)}" y="${r1(top + 6)}" width="4" height="4" fill="#FFE066" opacity=".7"/><rect x="${r1(bx + 3)}" y="${r1(top + 6)}" width="4" height="4" fill="#9FE8FF" opacity=".7"/>`)
    const gy = top + bh
    this.set += fx.debris(a, t, bx, top + bh * 0.4, { n: 3, seed: `kb${bx}${t}`, colors: [BLOCK, '#2A3350', '#9FE8FF'], spread: 30 })
    if (this.sc > 1.5) this.set += a.win(t, t + 0.12, `<rect x="${r1(bx - 9)}" y="${r1(top + 3)}" width="2" height="5" fill="#9FE8FF"/><rect x="${r1(bx + 7)}" y="${r1(top + 10)}" width="2" height="4" fill="#FFFFFF"/>`)
    this.set += fx.puff(a, t, bx, gy - 8, { s: 1.1, fill: PROPS.paperDark, ink: PROPS.ink })
    this.f.at(t)
    if (word) this.f.sfx('KRAK!', bx, Math.max(this.top, top - 6), { size: 15, tilt: bx % 2 > 1 ? 7 : -7 })
    this.f.freeze(0.04)
    this.cam.shake(t + 0.001, 2, 0.12)
  }
  /** A crater where something slammed down: a dark dish with a lit rim and cracks, from `t` to `t1`. */
  crater(t: number, t1: number, x: number, y: number, rx: number): void {
    this.set += this.act.win(t, t1, `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(rx)}" ry="${r1(rx * 0.28)}" fill="${PROPS.ink}" opacity=".55"/><ellipse cx="${r1(x)}" cy="${r1(y - 1)}" rx="${r1(rx)}" ry="${r1(rx * 0.28)}" fill="none" stroke="${PROPS.paperDark}" stroke-width="1.5"/><path d="M${r1(x - rx)} ${r1(y)}l-8 3m${r1(rx * 2)} -3l9 4m${r1(-rx)} ${r1(rx * 0.28)}l2 6" stroke="${PROPS.ink}" stroke-width="1.2"/>`)
  }
  /** Everything shown from act time 0 to `until` (timeline seconds, freezes included): the cut's own life. */
  life(svg: string, until: number): string {
    const k = this.act.k()
    this.act.rows(k, [[0, 'opacity:1'], [this.act.pcw(until), 'opacity:1'], [Math.min(100, r3(this.act.pcw(until) + 0.01)), 'opacity:0'], [100, 'opacity:0']])
    return `<g class="${this.act.p}k" style="animation-name:${k};animation-timing-function:steps(1,end)">${svg}</g>`
  }
  /** The layer: the camera (zoom and pan only) round the scenery and the fight, the still for reduced motion. */
  done(until: number): string {
    const body = this.life(this.cam.wrap(this.set + this.f.body(), { shake: false }), until)
    return this.act.done(`<g class="dl-anim">${body}</g>`, `<g class="dl-still">${this.stills}</g>`)
  }
  /** The panel shake for this surface (engine longhands: every shake plays, not just the first). */
  shake(): string { return this.cam.shakeStyle() }
  still(key: string, x: number, y: number, face: 1 | -1): void { this.stills += this.act.still(key, x, y, face, this.sc) }
  starStill(x: number, y: number, r = 14): void { this.stills += `<polygon points="${Array.from({ length: 16 }, (_, i) => { const a = (Math.PI * i) / 8 - Math.PI / 2; const rr = i % 2 ? r * 0.43 : r; return `${r1(x + Math.cos(a) * rr)},${r1(y + Math.sin(a) * rr)}` }).join(' ')}" fill="#FFE066" stroke="${PROPS.ink}"/>` }
}

// ---------------------------------------------------------------- beats shared by the versions
/** Mark's dash into contact: an ease-in run (the M2 charge), one SMEAR frame, the punch frame at `x`. */
const dash = (c: Cut, who: string, x: number, d: number, o: { y?: number; from?: string; lines?: boolean; smear?: boolean } = {}): void => {
  const p = c.at[who] as { x: number; y: number; face: 1 | -1 }
  const pre = x - p.face * 10 * c.sc
  c.f.approach(who, pre, d, { pose: o.from ?? 'M2', ease: EASE_IN, ghosts: false, lines: o.lines ?? false, ...(o.y !== undefined ? { y: o.y } : {}) })
  if (o.smear !== false) c.f.pose(who, 'MS')
  c.f.approach(who, x, 0.06, { ease: 'linear', lines: false, ghosts: false }).pose(who, 'M3')
  c.note(who, x, o.y ?? p.y, 'M3')
}
/** Anticipation: a quick pull-back of `px` against the facing before a move (settles in `d`). */
const pull = (c: Cut, who: string, px: number, d = 0.1): void => {
  const p = c.at[who] as { x: number; y: number; face: 1 | -1 }
  c.f.approach(who, p.x - p.face * px, d, { ease: 'settle', lines: false, ghosts: false })
  c.note(who, p.x - p.face * px, p.y)
}
/** Omni-Man's backhand with its anticipation: backwind (120 ms), the smear (60 ms), the release. The cursor ends on the release. */
const backhand = (c: Cut, who = 'o'): void => {
  c.f.pose(who, 'O6').wait(0.12).pose(who, 'OS').wait(0.06).pose(who, 'O7')
  const p = c.at[who]
  if (p) p.pose = 'O7'
}
/** A knock-back through skyline blocks, ease-out, Mark as a spinning ball; each block breaks as he passes it. */
const throughBlocks = (c: Cut, x1: number, y1: number, d: number, blocks: [number, number, number][], o: { land?: 'skid' | 'none'; pan?: number } = {}): void => {
  const p = c.at['m'] as { x: number; y: number; face: 1 | -1 }
  const t0 = c.f.t
  const x0 = p.x
  // The blocks first: their hit-stops must exist before the knock-back's own cues (the landing dust) are timed.
  blocks.forEach(([bx, top, bh], i) => c.block(Math.max(0, t0 - 0.3), r3(t0 + d * when(EASE_OUT, (x0 - bx) / (x0 - x1))), bx, top, bh, i === 0 || c.sc > 1.5))
  c.f.at(t0)
  c.cam.pan(t0, t0 + d * 0.6, o.pan ?? 16, 0, 'settle')
  c.f.knockback('m', x0 - x1, { d, dy: y1 - p.y, pose: 'M9', rot: 900, arc: 0, ease: EASE_OUT, land: o.land ?? 'skid' })
  c.note('m', x1, y1, 'M9')
  c.cam.reset(c.f.t, c.f.t + 0.15, 'snap')
}
/** The skid to a stop: M10 braced (sliding left), dust kicked along, SKRRT. */
const skid = (c: Cut, dx: number, d: number, gy: number, pose = 'M10'): void => {
  const p = c.at['m'] as { x: number; y: number }
  const t = c.f.t
  c.f.pose('m', pose, -1).approach('m', p.x - dx, d, { ease: 'settle', lines: false, ghosts: false })
  c.note('m', p.x - dx, p.y, pose, -1)
  c.set += fx.dust(c.act, t, p.x + dx, gy, { n: 3, seed: `sk${t}`, color: PROPS.paperDark, dx: -dx / 4, s: c.sc / 1.6 })
  if (c.sc > 1.5) c.f.at(t + 0.04).sfx('SKRRT', p.x, p.y - 26 * (c.sc / 1.45), { size: 12, tilt: 5, d: 0.5 })
  c.f.at(t + d)
}
/** The end of every band cut: Omni-Man flings Mark DOWN toward the viewer: he grows S -> M as he falls out of the band. */
const throwDown = (c: Cut, x: number): void => {
  const t = c.f.t
  c.f.pose('m', 'T1', 1)
  c.f.approach('m', x + 12, 0.2, { y: c.H * 0.78, ease: EASE_IN, lines: false, ghosts: false })
  c.f.pose('m', 'T2').approach('m', x + 22, 0.18, { y: c.H + 46, ease: EASE_IN, lines: false, ghosts: false })
  c.note('m', x + 22, c.H + 46, 'T2')
  c.set += c.act.win(t + 0.05, t + 0.38, `<g opacity=".85" stroke="#FFFFFF" stroke-linecap="round"><path d="M${r1(x - 10)} ${r1(c.H * 0.45)}v-18M${r1(x + 4)} ${r1(c.H * 0.5)}v-24M${r1(x + 18)} ${r1(c.H * 0.42)}v-14"/></g>`)
  c.f.at(t + 0.38)
}
/** Omni-Man folds his arms, hovers, a glint on his cape, then leaves upward (faded). */
const outro = (c: Cut, from: number, pose?: string): void => {
  const p = c.at['o'] as { x: number; y: number }
  c.f.at(from)
  if (pose) c.f.pose('o', pose)
  c.f.approach('o', p.x, 0.3, { y: p.y - 2, ease: 'settle', lines: false, ghosts: false })
  c.set += c.act.cue('blink', from + 0.25, `<path d="M${r1(p.x + 10)} ${r1(p.y - 22)}l1.5 4.5 4.5 1.5 -4.5 1.5 -1.5 4.5 -1.5 -4.5 -4.5 -1.5 4.5 -1.5z" fill="#FFFFFF"/>`)
  c.f.approach('o', p.x + 20, 0.4, { y: -60, ease: EASE_IN, lines: false, ghosts: false })
}

// ---------------------------------------------------------------- the band cuts (5.5 s, H about 134, the action left of 0.67 W)
const bandCut = (c: Cut, v: Version): void => {
  const { W, H, sc, f } = c
  const yc = Math.round(H * 0.5) + 4
  const ox = Math.round(W * 0.62)
  const hit = ox - 34 * sc
  const gy = H - 16
  const slot: [number, number] = [37, 62]
  const blocks3: [number, number, number][] = [[W * 0.5, H - 8 - 40, 40], [W * 0.36, H - 8 - 52, 52], [W * 0.22, H - 8 - 34, 34]]
  const burst = (t: number): void => {
    c.set += fx.star3(c.act, t, slot[0], slot[1], 22, STAR)
  }
  if (v === 0) {
    // ---- THE CATCH: the punch caught, the backhand through three blocks, the skid, the flurry, thrown down.
    c.fighter('o', 'O4', ox, -50, -1).fighter('m', 'M2', slot[0], slot[1], 1)
    f.at(0).approach('o', ox, 0.4, { y: yc, ease: 'settle', lines: false, ghosts: false })
    c.note('o', ox, yc)
    burst(0)
    f.at(0)
    dash(c, 'm', hit, 0.45, { y: yc, lines: true, smear: false })
    c.hit('o', { word: 'TAK!', r: 16, stop: STOP.punch, shake: 1 })
    for (const t of [0.62, 0.72, 0.82]) f.at(t).flinch('m', { px: 1, d: 0.06 })
    f.at(0.88).approach('o', ox + 5, 0.12, { ease: 'settle', lines: false, ghosts: false }).pose('o', 'O7')
    f.approach('o', ox - 3, 0.05, { ease: 'snap', lines: false, ghosts: false })
    c.note('o', ox - 3, yc, 'O7')
    c.hit('m', { pose: 'M8', word: 'WHAM!', r: 24, stop: STOP.big, shake: 3, flash: 0.35, impact: [80, 34], push: 1.1, wx: ox - 6, wy: yc - 46 })
    f.wait(0.05)
    throughBlocks(c, W * 0.16, gy - 10, 1.0, [blocks3[0], blocks3[2]] as [number, number, number][], { land: 'none', pan: 16 })
    skid(c, 18, 0.3, gy, 'M8')
    f.wait(0.04).pose('m', 'M2', 1)
    c.note('m', W * 0.16 - 18, gy - 10, 'M2', 1)
    pull(c, 'm', 6, 0.08)
    dash(c, 'm', hit, 0.3, { y: yc, smear: false })
    c.jab(hit + 20 * sc, yc - 8, 'POW', hit + 16, yc - 46)
    f.flinch('o', { px: 2, d: 0.08 }).wait(0.14)
    f.pose('o', 'O7')
    c.note('o', ox, yc, 'O7')
    c.hit('m', { pose: 'M8', word: 'BOOM', r: 14, stop: STOP.punch, shake: 3, flash: 0.3, wx: hit - 26, wy: yc + 24 })
    f.wait(0.06)
    throwDown(c, hit)
    outro(c, f.t + 0.1)
    c.still('M3', hit, yc, 1); c.still('O4', ox, yc, -1); c.starStill(hit + 20 * sc, yc - 8)
  } else if (v === 1) {
    // ---- JET FLICK: Omni-Man flicks a jet away (the pilot's chute pops), then a lazy jab sends Mark through two blocks.
    c.fighter('o', 'O1', ox, yc, -1).fighter('m', 'M2', slot[0], -80, 1)
    const jet = `<g fill="#9AA3AD" stroke="${PROPS.ink}" stroke-width="1"><path d="M0 0l22 -3 6 3 -6 3z"/><path d="M8 -1l-5 -7h4l7 7zM8 1l-5 7h4l7 -7z"/></g>`
    const jy = yc - 16
    // The jet streaks in from the left to his fist, is flicked up-right tumbling; a chute pops and drifts.
    c.set += c.act.mv(jet, [[0, -40, jy], [0.5, ox - 50, jy], [0.53, ox - 46, jy - 4, 1, 'rotate(-40deg)'], [1.1, ox + 120, -40, 1, 'rotate(-400deg)']], { c: true })
    f.at(0.42).pose('o', 'O8')
    c.note('o', ox, yc, 'O8')
    f.at(0.5)
    c.hit('o', { r: 10, stop: STOP.jab, shake: 1, x: ox - 46, y: jy, word: 'FLICK!', wx: ox - 70, wy: jy - 8 })
    c.set += c.act.mv(`<g stroke="${PROPS.ink}" stroke-width="1"><path d="M-12 0q12 -14 24 0z" fill="#FFFFFF"/><path d="M-11 0l11 13M11 0l-11 13" fill="none"/><rect x="-2" y="12" width="4" height="5" fill="${PROPS.ink}"/></g>`, [[0, ox + 40, 14, 0], [0.75, ox + 40, 14, 0], [0.8, ox + 40, 16, 1], [2.6, ox - 20, 50, 1], [2.9, ox - 30, 58, 0]])
    f.at(0.7).pose('o', 'O1')
    c.note('o', ox, yc, 'O1')
    burst(0.95)
    f.at(0.93).approach('m', slot[0], 0.02, { y: slot[1], ease: 'linear', lines: false, ghosts: false })
    c.note('m', slot[0], slot[1])
    dash(c, 'm', hit + 4, 0.45, { y: yc })
    f.at(f.t - 0.08).pose('o', 'O8').wait(0.08)
    c.note('o', ox, yc, 'O8')
    c.hit('m', { pose: 'M8', word: 'TAK!', r: 18, stop: STOP.big, shake: 3, flash: 0.35, impact: [70, 32], push: 1.08, x: hit + 14, y: yc - 4 })
    f.wait(0.05)
    throughBlocks(c, W * 0.2, gy - 10, 0.9, blocks3.slice(1, 2), { land: 'none', pan: 14 })
    f.pose('o', 'O1')
    skid(c, 16, 0.3, gy, 'M8')
    f.wait(0.05).pose('m', 'M2', 1)
    c.note('m', W * 0.2 - 16, gy - 10, 'M2', 1)
    pull(c, 'm', 6, 0.08)
    dash(c, 'm', hit, 0.3, { y: yc })
    c.jab(hit + 20 * sc, yc - 8)
    f.flinch('o', { px: 2, d: 0.08 }).wait(0.1)
    f.pose('o', 'O8')
    c.note('o', ox, yc, 'O8')
    c.hit('m', { pose: 'M8', word: 'BOOM', r: 14, stop: STOP.punch, shake: 3, flash: 0.3, wx: hit - 26, wy: yc + 24 })
    f.wait(0.06)
    throwDown(c, hit)
    f.at(f.t + 0.05).pose('o', 'O1')
    c.f.exit('o', { dir: -1, d: 0.5, fade: true })
    c.still('M8', hit + 4, yc, 1); c.still('O8', ox, yc, -1); c.starStill(hit + 14, yc - 4)
  } else {
    // ---- EVERY ANGLE: Mark lands the first punch, eats the backhand, then comes back from above, below and the side.
    c.fighter('o', 'O2', ox, -50, -1).fighter('m', 'M2', slot[0], slot[1], 1)
    f.at(0).approach('o', ox, 0.35, { y: yc, ease: 'settle', lines: false, ghosts: false })
    c.note('o', ox, yc)
    burst(0)
    f.at(0.05)
    dash(c, 'm', hit + 6, 0.45, { y: yc })
    c.hit('o', { word: 'BAM!', r: 14, stop: STOP.punch, shake: 2, push: 1.06 })
    f.approach('o', ox + 6, 0.12, { ease: EASE_OUT, lines: false, ghosts: false })
    c.note('o', ox + 6, yc)
    f.wait(0.1).approach('o', ox + 11, 0.12, { ease: 'settle', lines: false, ghosts: false }).pose('o', 'O7')
    f.approach('o', ox + 2, 0.05, { ease: 'snap', lines: false, ghosts: false })
    c.note('o', ox + 2, yc, 'O7')
    c.hit('m', { pose: 'M8', word: 'WHAM!', r: 24, stop: STOP.big, shake: 3, flash: 0.35, impact: [80, 34], push: 1.1, wx: ox - 6, wy: yc - 46 })
    f.wait(0.05)
    throughBlocks(c, W * 0.2, gy - 10, 1.0, blocks3.slice(0, 1), { land: 'skid', pan: 16 })
    f.pose('o', 'O2').wait(0.12).pose('m', 'M2', 1)
    c.note('m', W * 0.2, gy - 10, 'M2', 1)
    // From above, from below, from the side: three dives, each a smear and a jab.
    const spots: [number, number, string][] = [[hit - 6, yc - 26, 'POW'], [hit + 2, yc + 18, 'BIFF']]
    for (const [i, [sx, sy, w]] of spots.entries()) {
      dash(c, 'm', sx, i ? 0.18 : 0.3, { y: sy })
      c.jab(sx + 20 * sc, sy - 6, i === 1 ? w : undefined, ox - 30 + i * 14, yc - 48 + (i % 2) * 8)
      f.flinch('o', { px: 2, d: 0.08 })
      if (i < spots.length - 1) { f.wait(0.04).pose('m', 'M2'); pull(c, 'm', 14, 0.08) }
    }
    f.wait(0.08).pose('o', 'O7')
    c.note('o', ox + 6, yc, 'O7')
    c.hit('m', { pose: 'M8', word: 'BOOM', r: 14, stop: STOP.punch, shake: 3, flash: 0.3, wx: hit - 26, wy: yc + 24 })
    f.wait(0.06)
    throwDown(c, hit)
    outro(c, f.t + 0.1, 'O2')
    c.still('M3', hit + 6, yc, 1); c.still('O2', ox, yc, -1); c.starStill(ox - 12, yc - 6)
  }
}

// ---------------------------------------------------------------- the pane acts (one per card)
const actCut = (c: Cut, act: ActIndex): void => {
  const { W, H, sc, f } = c
  const yc = Math.round(H * (act === 0 ? 0.42 : 0.5))
  const ox = Math.round(W * (act === 2 ? 0.68 : 0.72))
  const mx = Math.round(W * 0.28)
  const hit = ox - 34 * sc
  const gy = Math.min(H - 10, yc + 70)
  if (act === 0) {
    // ---- "The Catch" (COVER STORY): Mark smashes in at full size (L -> XL, a crater), the punch caught, the backhand.
    c.fighter('m', 'T4', mx, -60, 1).fighter('o', 'O4', ox, -60, -1)
    f.at(0).approach('m', mx, 0.26, { y: yc + 12, ease: EASE_IN, lines: false, ghosts: false })
    c.note('m', mx, yc + 12, 'T4')
    c.crater(f.t, 1.5, mx, gy - 30, 34)
    c.set += fx.ring(c.act, f.t, mx, gy - 30, { rx: 26, color: '#FFFFFF' }) + fx.dust(c.act, f.t, mx + 20, gy - 30, { n: 5, seed: 'smash', color: PROPS.paperDark, dx: -10, s: 1.4 }) + fx.debris(c.act, f.t, mx, gy - 36, { n: 4, seed: 'smashd', colors: [PROPS.ink, '#2A3350', PROPS.paperDark], spread: 60 })
    c.hit('m', { word: 'BOOM!', r: 22, stop: STOP.slam, shake: 4, flash: 0.3, x: mx, y: gy - 34, wx: mx + 40, wy: yc - 40 })
    f.wait(0.12).pose('m', 'M2')
    f.approach('m', mx, 0.25, { y: yc, ease: 'settle', lines: false, ghosts: false })
    c.note('m', mx, yc, 'M2')
    f.at(0.3).approach('o', ox, 0.5, { y: yc, ease: 'settle', lines: false, ghosts: false })
    c.note('o', ox, yc)
    f.at(1.0).say('o', 'JOIN ME', 0.6, { fill: '#FFFFFF', ink: PROPS.ink })
    f.at(1.55)
    pull(c, 'm', 8, 0.12)
    f.sfx('FWOOSH', mx + 40, yc - 40, { size: 13 })
    dash(c, 'm', hit, 0.3, { y: yc, smear: false })
    c.hit('o', { word: 'TAK!', r: 12, stop: STOP.punch, shake: 1, wx: hit, wy: yc - 46 })
    for (const t of [0.2, 0.4, 0.6]) f.at(2.12 + t).flinch('m', { px: 1, d: 0.1 })
    f.at(2.75)
    backhand(c)
    c.hit('m', { pose: 'M9', word: 'WHAM!', r: 24, stop: STOP.big, shake: 3, flash: 0.35, impact: [110, 60], push: 1.1, wx: ox - 10, wy: yc - 50 })
    f.wait(0.06)
    throughBlocks(c, W * 0.16, gy - 6, 0.8, [[W * 0.46, gy + 14 - 54, 54], [W * 0.3, gy + 14 - 40, 40]], { land: 'none', pan: 18 })
    f.at(f.t).pose('o', 'O4')
    f.at(f.t).throw('m', W * 0.12, H + 40, { d: 0.25, arc: 10, turns: 1, pose: 'M9' })
    c.still('M3', hit, yc, 1); c.still('O4', ox, yc, -1); c.starStill(hit + 18 * sc, yc - 6, 16)
  } else if (act === 1) {
    // ---- "Every Angle" (GDA WALL): the flurry from every side, Omni-Man's lazy jab, the grab and the slam (a crater, KO stars).
    c.fighter('m', 'M9', mx, -30, 1).fighter('o', 'O1', ox, yc, -1)
    f.at(0).throw('m', mx, yc, { d: 0.3, arc: 0, turns: 0.75 })
    c.note('m', mx, yc, 'M9')
    f.pose('m', 'M2')
    c.set += fx.koStars(c.act, 0.3, 0.75, mx, yc - 36, { color: '#FFE066', ink: PROPS.ink })
    f.at(0.6)
    pull(c, 'm', 8, 0.1)
    f.sfx('FWOOSH', mx + 40, yc - 36, { size: 13 })
    f.approach('m', hit - 10, 0.3, { ease: EASE_IN })
    c.note('m', hit - 10, yc, 'M2')
    const spots: [number, number][] = [[-52, -10], [-34, -40], [-54, 22], [-36, 34], [-56, -26], [-30, 6]]
    const words = ['POW', '', 'BAM', '', 'BIFF', '']
    spots.forEach(([dx, dy], i) => {
      const sx = ox + (dx * sc) / 1.5
      const sy = yc + (dy * sc) / 1.5
      f.pose('m', i % 2 ? 'M5' : 'M4').approach('m', sx, 0.07, { y: sy, ease: EASE_IN, lines: false, ghosts: false })
      c.note('m', sx, sy, i % 2 ? 'M5' : 'M4')
      f.pose('o', 'O11')
      c.note('o', ox, yc, 'O11')
      c.jab(ox - 40 - (i % 3) * 6, yc - 18 + ((i * 17) % 40), words[i] || undefined, ox - 60 + i * 6, yc - 52 + (i % 2) * 8)
      f.wait(0.07).pose('o', 'O1').wait(0.05)
    })
    // The answer: one lazy jab. Mark recoils, comes back for a grab; Omni-Man lifts him and slams him down.
    f.pose('o', 'O8')
    c.note('o', ox, yc, 'O8')
    c.hit('m', { pose: 'M5', word: 'TAK!', r: 12, stop: STOP.punch, shake: 2, push: 1.05 })
    f.approach('m', (c.at['m'] as { x: number }).x - 24, 0.2, { y: yc, ease: EASE_OUT, lines: false, ghosts: false })
    c.note('m', (c.at['m'] as { x: number }).x - 24, yc)
    f.pose('o', 'O1').wait(0.1).pose('m', 'M6')
    f.approach('m', hit, 0.18, { ease: EASE_IN, lines: false, ghosts: false })
    c.note('m', hit, yc, 'M6')
    f.sfx('GRAB', hit + 14, yc - 44, { size: 13, d: 0.4 })
    f.pose('o', 'O8').wait(0.3).pose('o', 'O7')
    const lx = W * 0.26
    f.throw('m', lx, gy - 8, { d: 0.32, arc: -20, turns: 1, pose: 'M9' })
    c.note('m', lx, gy - 8, 'M9')
    c.crater(f.t, f.t + 1.2, lx, gy + 4, 28)
    c.set += fx.ring(c.act, f.t, lx, gy + 6, { rx: 22, color: '#FFFFFF' }) + fx.puff(c.act, f.t, lx, gy + 4, { s: 1.1, fill: PROPS.paperDark, ink: PROPS.ink }) + fx.debris(c.act, f.t, lx, gy - 2, { n: 6, seed: 'slam1', colors: [PROPS.ink, PROPS.paperDark], spread: 40 })
    c.hit('m', { word: 'BOOM!', r: 18, stop: STOP.slam, shake: 4, flash: 0.35, impact: [90, 46], x: lx, y: gy - 6, wx: lx, wy: gy - 34 })
    c.set += fx.koStars(c.act, f.t + 0.1, f.t + 0.7, lx, gy - 30, { color: '#FFE066', ink: PROPS.ink })
    f.wait(0.15).pose('o', 'O1').wait(0.45)
    f.throw('m', lx, H + 30, { d: 0.25, arc: 0, turns: 0.5 })
    c.still('M4', ox - 52 * sc / 1.5, yc - 10 * sc / 1.5, 1); c.still('O11', ox, yc, -1); c.starStill(ox - 40, yc - 18, 10)
  } else {
    // ---- "Think, Mark" (THE PAGE): a quiet beat. One hammer blow on Mark's block, the words, the hands, the flight.
    const kx = mx + 4
    c.fighter('m', 'M9', kx, -30, 1).fighter('o', 'O1', ox, yc - 46, -1)
    f.at(0).throw('m', kx, yc + 6, { d: 0.35, arc: 0, turns: 0.75 })
    c.note('m', kx, yc + 6, 'M9')
    f.pose('m', 'M11').wait(0.25).pose('m', 'M7')
    c.note('m', kx, yc + 6, 'M7')
    f.at(0.3).approach('o', ox, 0.5, { y: yc - 26, ease: 'settle', lines: false, ghosts: false })
    c.note('o', ox, yc - 26)
    f.pose('o', 'O9').wait(0.2).pose('o', 'O9B')
    c.note('o', ox, yc - 26, 'O9B')
    c.crater(f.t, 2.4, kx, yc + 52, 30)
    c.hit('m', { word: 'KRAK!', r: 26, stop: STOP.slam, shake: 4, flash: 0.35, x: kx + 10, y: yc - 4, wx: kx + 30, wy: yc - 44 })
    c.set += fx.ring(c.act, f.t, kx, yc + 52, { rx: 24, color: '#FFFFFF' }) + fx.dust(c.act, f.t, kx + 22, yc + 50, { n: 4, seed: 'hammer', color: PROPS.paperDark, dx: -14, s: 1.2 })
    f.approach('m', kx, 0.06, { y: yc + 9, ease: 'snap', lines: false, ghosts: false }).wait(0.24).approach('m', kx, 0.1, { y: yc + 6, ease: 'settle', lines: false, ghosts: false })
    f.wait(0.05).pose('o', 'O3').pose('m', 'M12')
    c.note('m', kx, yc + 6, 'M12')
    f.say('o', 'THINK, MARK!', 0.65, { fill: '#FFFFFF', ink: PROPS.ink }).wait(0.65)
    f.say('m', "I'D STILL HAVE YOU, DAD.", 0.7, { fill: '#FFFFFF', ink: PROPS.ink }).wait(0.75)
    f.pose('o', 'O12')
    c.set += c.act.win(f.t + 0.2, f.t + 0.7, `<rect x="${r1(ox - 30)}" y="${r1(yc - 52)}" width="2" height="3" fill="#9FE8FF"/>`)
    f.wait(0.8).pose('o', 'O13')
    f.sfx('FWOOSH', ox - 10, yc - 60, { size: 12, d: 0.5 })
    f.approach('o', ox - 70, 0.6, { y: -70, ease: EASE_IN, lines: true, ghosts: false })
    c.still('M12', kx, yc + 6, 1); c.still('O3', ox, yc - 26, -1)
  }
}

// ---------------------------------------------------------------- surfaces
export type FightArgs = { W: number; H: number; era: Era; startAt: number; /** Colours kept per frame. */ K?: number; big?: boolean; /** Which version (default 0). */ v?: Version }
type Built = { svg: string; chain: string[]; frames: number; shake: string; cut: Cut }
const CACHE = new Map<string, Built>()
const build = (a: FightArgs, surface: 'band' | ActIndex): Built => {
  const v = a.v ?? 0
  const key = `${surface}|${v}|${a.era}|${a.W}|${a.H}|${a.startAt}|${a.K ?? 4}`
  const hit = CACHE.get(key)
  if (hit) return hit
  const band = surface === 'band'
  const off = band ? 0 : ACT_OFF[surface]
  const box: [number, number, number, number] = band ? [0, 0, Math.round(a.W * 0.67), a.H] : [0, 0, a.W, a.H]
  const c = new Cut(`invf-${band ? 'b' : `p${surface}`}-${v}-${a.era}-${a.W}x${a.H}`, a.startAt, off, a.era, band ? 1.45 : 1.9, a.W, a.H, box, a.K ?? 4)
  if (band) bandCut(c, v)
  else actCut(c, surface)
  const svg = c.done(band ? BAND_CUT : (ACT_LEN[surface] as number))
  const chain = c.act.chainKeys()
  const out: Built = { svg, chain, frames: c.act.bank.count(), shake: c.shake(), cut: c }
  if (CACHE.size > 24) CACHE.delete(CACHE.keys().next().value as string)
  CACHE.set(key, out)
  return out
}

/** The band's layer of THE FIGHT (the 5.5 s cut, from `startAt`). */
export const fightBand = (a: FightArgs): { svg: string; chain: string[]; frames: number } => { const b = build(a, 'band'); return { svg: b.svg, chain: b.chain, frames: b.frames } }
/** One pane act (0 COVER STORY, 1 GDA WALL, 2 THE PAGE) as a layer to splice into that card. */
export const fightAct = (a: FightArgs, act: ActIndex): { svg: string; chain: string[]; frames: number } => { const b = build(a, act); return { svg: b.svg, chain: b.chain, frames: b.frames } }
/**
 * The panel's shake for a surface, as animation LONGHANDS (`animation-name:a,b;...;animation-delay:x,y`): every shake of the
 * cut plays. (v1 glued a delay list to an `animation:` shorthand, so only one shake ever played.)
 */
export const fightShake = (surface: 'band' | 'pane', startAt: number, W: number, H: number, era: Era, act?: ActIndex, v: Version = 0): string => build({ W, H, era, startAt, v }, surface === 'band' ? 'band' : act ?? 0).shake
/** The cut itself (tests: hits, freezes, the script). */
export const fightCut = (a: FightArgs, surface: 'band' | ActIndex): { act: Act; f: Fight; cam: Camera } => { const c = build(a, surface).cut; return { act: c.act, f: c.f, cam: c.cam } }
/** The chains of poses each act plays, in time order (the three combos). */
export const COMBOS = COMBO_NAMES
export const chainOfAct = (act: ActIndex | 'band', era: Era = 1, v: Version = 0): string[] => (act === 'band' ? fightBand({ W: 900, H: 134, era, startAt: 0, v }).chain : fightAct({ W: 480, H: act === 0 ? 434 : act === 1 ? 236 : 260, era, startAt: 0, v }, act).chain)
/** The slot's hole while Mark is out (the whole fight), sealed by a burst at the end. */
export const fightHole = (era: Era, startAt: number, tile: string): string => {
  const P = pal(era)
  const d = (t: number): string => `calc(${pin(startAt)} + ${r3(t)}s)`
  const hole = `<rect x="14" y="34" width="44" height="46" fill="${tile}"/><path d="M36 40l-6 10 5 6-8 9 6 6m4-31l7 8-6 7 9 8" fill="none" stroke="${P.muted}" stroke-width="1.2"/><ellipse cx="36" cy="58" rx="13" ry="15" fill="${PROPS.ink}"/>`
  return `<g pointer-events="none" style="opacity:0;animation:dl-hole ${r3(FIGHT_T)}s steps(1) forwards;animation-delay:${d(0)}"><style>@keyframes dl-hole{0%,99%{opacity:1}100%{opacity:0}}</style>${hole}</g>`
}
export { info as frameInfo }
