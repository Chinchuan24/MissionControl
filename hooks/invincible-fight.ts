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
// MARK VS CONQUEST (the new suit only, version 3): the elder warrior's fight shares THE FIGHT's slot (the era-2 director plays
// them in turns, never both) and its pane reserve (only one fight is ever drawn). Band: he welcomes the fight, catches the
// punch and SLAMS Mark by the wrist. COVER STORY: Mark swung by the wrist like a club through the blocks, the skid, the goggle
// wipe. GDA WALL: the comeback (BAM), the flurry against his laugh, the spin and the knock-down, Mark hovering, tired.
//
// Cartoon rules: no red in the effects (white / yellow / cyan stars), no blood, no gore, a quiet last act. Under reduced
// motion there is no animation: one still clash frame per surface.
import type { Sprite } from './cast'
import { Camera, SHAKE_CSS } from './stage/camera'
import { Fight } from './stage/choreo'
import type { FightLook } from './stage/choreo'
import { curve } from './stage/ease'
import { parallax } from './stage/parallax'
import * as fx from './stage/fx'
import { rectPaths } from './stage/frames'
import { keepClip } from './stage/keep'
import type { BandStage } from './stage/keep'
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
/** 0-2: THE FIGHT's three band cuts (Omni-Man). 3: MARK VS CONQUEST (the new suit only). */
export type Version = 0 | 1 | 2 | 3
export const CONQUEST = 3 as const
/** The replay name of MARK VS CONQUEST (`/missioncontrol play conquest`). */
export const CONQUEST_PLAY = 'conquest'
export type ActIndex = 0 | 1 | 2
/** MARK VS CONQUEST's timeline: a 4.4 s band cut, then two pane acts (COVER STORY, GDA WALL). */
export const CQ_MS = 12_800
export const CQ_BAND = 4.4
export const CQ_OFF = [3.4, 8.0] as const
export const CQ_LEN = [4.6, 4.8] as const
/** One fight's timeline: its length (ms), the band cut (s), where each pane act starts and how long it is, how many acts. */
export type Timing = { ms: number; band: number; off: readonly number[]; len: readonly number[]; acts: number; hole: number }
const OMNI_T: Timing = { ms: FIGHT_MS, band: BAND_CUT, off: ACT_OFF, len: ACT_LEN, acts: 3, hole: FIGHT_T + 0.6 }
const CQ_T: Timing = { ms: CQ_MS, band: CQ_BAND, off: CQ_OFF, len: CQ_LEN, acts: 2, hole: CQ_MS / 1000 + 0.6 }
/** The timeline of a version: THE FIGHT's for 0-2, MARK VS CONQUEST's for 3. */
export const timing = (v: Version = 0): Timing => (v === CONQUEST ? CQ_T : OMNI_T)
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
/** MARK VS CONQUEST's own frames: the elder warrior's seven, Mark swung by the wrist, the goggle wipe, the tired hover, his spin smear. */
const CQ: Record<string, Sprite> = { CI0: MS.FXC_CUTIN_CONQUEST_BAM, CI1: MS.FX3_CUTIN_MARK_FINALLY, C1: MS.FXC_C1_IDLE, C2: MS.FXC_C2_WINDUP, C3: MS.FXC_C3_CATCH, C4: MS.FXC_C4_STRIKE, C5: MS.FXC_C5_HIT, C6: MS.FXC_C6_KNOCKBACK, C7: MS.FXC_C7_DOWN, M13: MS.FX3_M13_SWUNG, M14: MS.FX3_M14_WIPE, M15: MS.FX3_M15_HOVER, MSP: MS.FX3_M_SMEAR_SPIN }
export const CQ_KEYS = Object.keys(CQ)
/** Where each Conquest-fight frame stands (the cut's pivots: his feet, Mark's grip hand for the swing). */
Object.assign(AX, { C1: 0.5, C2: 0.55, C3: 0.44, C4: 0.38, C5: 0.35, C6: 0.46, C7: 0.54, M13: 0.71, M14: 0.38, M15: 0.36, MSP: 0.44 })
/**
 * The elder warrior's palette, folded to the nine colours that make him HIM at sprite size (ink, the white suit in three greys,
 * the boots, his skin, the bronze arm in two tones, and the scar's red through the white eye). Kept per pose (`CQ_K`): the
 * bank's 4 colours would drop the scar and the arm's shading.
 */
const CQ_PAL = ['#2E2024', '#E6E0E5', '#BEB8C1', '#9A92A0', '#6B6774', '#DF9F7A', '#C88A4E', '#8E5C34', '#A3262A']
export const CQ_K = CQ_PAL.length
const near = (c: string): string => { const a = rgb(c); let best = CQ_PAL[0] as string; let bd = Infinity; for (const t of CQ_PAL) { const b = rgb(t); const d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2; if (d < bd) { bd = d; best = t } } return best }
const CQ_CACHE = new Map<string, Sprite>()
/** A Conquest frame in his folded palette (cached). */
export const conq = (sp: Sprite): Sprite => {
  const k = sp.rows.join('')
  const hit = CQ_CACHE.get(k)
  if (hit) return hit
  const s = { rows: sp.rows, pal: Object.fromEntries(Object.entries(sp.pal).map(([l, c]) => [l, near(c)])) }
  CQ_CACHE.set(k, s)
  return s
}

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
  const q = CQ[key]
  if (q) return /^C\d/.test(key) ? conq(q) : q
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
/** The ink and the dark paper as plain strings (PROPS is a loose record: strict index access reads it as string | undefined). */
const INK_C = PROPS.ink as string
const PAPER_D = PROPS.paperDark as string
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
  /** Drawn over the fighters (the cut-ins). */
  over = ''
  stills = ''
  /** Where each fighter is (kept by the cut's own moves), for impact frames and stills. */
  readonly at: Record<string, { x: number; y: number; pose: string; face: 1 | -1 }> = {}
  private filters = false
  /** The band's readouts inside the window (stage/keep.ts): a word that would sit on one drops under it. */
  keep: [number, number, number, number][] = []
  /** A word's baseline clear of the readouts (a word under a hole would be cut in half). */
  wordY(x: number, y: number, size: number, text = 'WHAM!'): number {
    const w = text.length * size * 0.7
    for (const [kx, ky, kw, kh] of this.keep) if (x + w / 2 > kx && x - w / 2 < kx + kw && y > ky && y - size < ky + kh) return ky + kh + size + 2
    return y
  }
  /** The highest a word's baseline may sit (the band keeps its header row clear). */
  get top(): number { return this.box[2] < this.W ? 54 : 30 }
  constructor(id: string, readonly start: number, off: number, readonly era: Era, readonly sc: number, readonly W: number, readonly H: number, readonly box: [number, number, number, number], K = 4, ms = FIGHT_MS, cq = false, dp?: 2) {
    this.act = new Act({ id, ms, at: start, W, H, off, K, ...(dp ? { dp } : {}) })
    for (const k of FRAME_KEYS) this.act.cast(k, frameSprite(k, era), info(k).ax)
    if (cq) for (const k of CQ_KEYS) this.act.cast(k, frameSprite(k, era), info(k).ax, /^C\d/.test(k) ? CQ_K : /^CI/.test(k) ? 5 : undefined)
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
    if (o.word) { const size = o.shake > 2 ? 19 : 15; const wx = o.wx ?? hx + 6 * this.sc; this.f.sfx(o.word, wx, this.wordY(wx, Math.max(this.top, o.wy ?? hy - 14 * this.sc), size, o.word), { size, tilt: o.shake % 2 ? -6 : 7 }) }
    if (o.flash) this.flash(t + (o.impact ? 0.08 : 0), o.flash, hx, hy)
    this.cam.shake(t + 0.001, o.shake, o.shake > 2 ? 0.22 : 0.12)
    if (o.push) this.cam.push(t + 0.001, t + 0.12, o.push, hx, hy, 'snap').reset(t + 0.13, t + 0.5, 'settle')
  }
  /** A jab: one small star blink, an optional word, a short hit-stop and a 1 px tap after it (cheaper than a full hit). */
  jab(x: number, y: number, word?: string, wx = x, wy = y - 20): void {
    const t = this.f.t
    this.set += this.act.cue('blink', t, `<polygon points="${Array.from({ length: 12 }, (_, i) => { const a = (Math.PI * i) / 6; const r = i % 2 ? 2.5 : 7; return `${Math.round(x + Math.cos(a) * r)},${Math.round(y + Math.sin(a) * r)}` }).join(' ')}" fill="#FFE066" stroke="${PROPS.ink}"/>`)
    if (word) this.f.sfx(word, wx, this.wordY(wx, Math.max(this.top, wy), 14, word), { size: 14, tilt: x % 2 > 1 ? 8 : -8, d: 0.3 })
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
    if (word) this.f.sfx('KRAK!', bx, this.wordY(bx, Math.max(this.top, top - 6), 15, 'KRAK!'), { size: 15, tilt: bx % 2 > 1 ? 7 : -7 })
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
    const body = this.life(this.cam.wrap(this.set + this.f.body() + this.over, { shake: false }), until)
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
const bandCut = (c: Cut, v: 0 | 1 | 2): void => {
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
    c.set += fx.ring(c.act, f.t, mx, gy - 30, { rx: 26, color: '#FFFFFF' }) + fx.dust(c.act, f.t, mx + 20, gy - 30, { n: 5, seed: 'smash', color: PROPS.paperDark, dx: -10, s: 1.4 }) + fx.debris(c.act, f.t, mx, gy - 36, { n: 4, seed: 'smashd', colors: [INK_C, '#2A3350', PAPER_D], spread: 60 })
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
    c.set += fx.ring(c.act, f.t, lx, gy + 6, { rx: 22, color: '#FFFFFF' }) + fx.puff(c.act, f.t, lx, gy + 4, { s: 1.1, fill: PROPS.paperDark, ink: PROPS.ink }) + fx.debris(c.act, f.t, lx, gy - 2, { n: 6, seed: 'slam1', colors: [INK_C, PAPER_D], spread: 40 })
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

// ---------------------------------------------------------------- MARK VS CONQUEST (the new suit only)
/** A laugh: the elder warrior bobs 1.5 px, `n` times, from `t` (the 2-frame laugh, in code). */
const laugh = (c: Cut, who: string, t: number, n = 2, px = 1.5): void => {
  const p = c.at[who] as { x: number; y: number }
  c.f.at(t)
  for (let i = 0; i < n; i++) c.f.approach(who, p.x, 0.11, { y: p.y - px, ease: 'snap', lines: false, ghosts: false }).approach(who, p.x, 0.11, { y: p.y, ease: 'snap', lines: false, ghosts: false })
}
/**
 * The CUT-IN: a close-up strip (80x20, Chin's art) slides in on a letterbox band across the card for `d` s while the fighters
 * hold under it, with an optional line under the strip. One per act (budget).
 */
const cutin = (c: Cut, key: string, t: number, side: 1 | -1, line = '', d = 0.45): void => {
  const s = Math.max(2, Math.min(4, Math.floor((c.W - 32) / 80)))
  const h = 20 * s
  const cy = Math.round(c.H * 0.32)
  const sub = line ? `<text x="${r1(c.W / 2)}" y="${r1(cy + h / 2 + 15)}" text-anchor="middle" class="dl-t" font-size="12" fill="#FFE066">${line}</text>` : ''
  c.over += c.act.win(t, t + d, `<rect x="0" y="${r1(cy - h / 2 - 5)}" width="${c.W}" height="${r1(h + 10 + (line ? 16 : 0))}" fill="${PROPS.ink}" opacity=".92"/><rect x="0" y="${r1(cy - h / 2 - 2)}" width="${c.W}" height="1.5" fill="#FFFFFF"/>${sub}`)
  const off = `transform:translateX(${side * c.W}px)`
  c.over += c.act.kf(c.act.bank.use(key, c.W / 2, cy, 1, s), [[0, `opacity:0;${off}`], [t, `opacity:0;${off}`], [t + 0.01, `opacity:1;${off}`], [t + 0.08, 'opacity:1;transform:translateX(0px)'], [t + d - 0.02, `opacity:1;transform:translateX(${-side * 6}px)`], [t + d, 'opacity:0'], [999, 'opacity:0']])
}
/** Where an orbiting figure's middle is, `r` from the pivot at angle `a` (stage/choreo `orbit`'s rule). */
const orbitAt = (px: number, py: number, r: number, a: number): [number, number] => { const q = (a * Math.PI) / 180; return [px - r * Math.sin(q), py + r * Math.cos(q)] }
/** The catch hand of C3 facing left (his open glove on the left edge, a quarter down), for a fighter standing at (x, y). */
const catchHand = (x: number, y: number, sc: number): [number, number] => [x - Math.round(0.56 * 39 * sc) + 3, y - Math.round(12 * sc)]
/** M13 (swung by the wrist): the grip hand to the middle of the body. */
const swingR = (sc: number): number => Math.round(25 * sc)

/** The band (4.4 s): he drops in laughing, FINALLY.; the punch caught in his open hand; hauled over his head and SLAMMED. */
const conquestBand = (c: Cut): void => {
  const { W, H, sc, f } = c
  const yc = Math.round(H * 0.5) + 4
  const ox = Math.round(W * 0.6)
  const gy = H - 16
  const slot: [number, number] = [37, 62]
  const [hx, hy] = catchHand(ox, yc, sc)
  c.fighter('c', 'C1', ox + 30, -70, -1).fighter('m', 'M2', slot[0], slot[1], 1)
  f.at(0).approach('c', ox, 0.45, { y: yc, ease: 'settle', lines: false, ghosts: false })
  c.note('c', ox, yc)
  c.set += fx.star3(c.act, 0, slot[0], slot[1], 22, STAR)
  laugh(c, 'c', 0.5, 2)
  // His laugh as a word beside him (the band keeps its header row clear: no bubble above his head).
  f.at(0.55).sfx('HA HA!', ox - Math.round(46 * sc), c.wordY(ox - Math.round(46 * sc), Math.max(c.top, yc - 6), 13, 'HA HA!'), { size: 13, tilt: -6, d: 0.6 })
  // The charge: caught. His open hand stops the fist dead (TAK), Mark hangs there for a beat.
  f.at(1.2)
  pull(c, 'm', 6, 0.1)
  const mx = hx - Math.round(0.6 * 29 * sc)
  dash(c, 'm', mx, 0.34, { y: hy, lines: true, smear: false })
  f.pose('c', 'C3')
  c.note('c', ox, yc, 'C3')
  c.hit('c', { word: 'TAK!', r: 12, stop: STOP.punch, shake: 1, x: hx, y: hy, wx: hx + 4, wy: hy - 20 })
  f.wait(0.08).flinch('m', { px: 1, d: 0.06 }).wait(0.06).flinch('m', { px: 1, d: 0.06 })
  // THE SLAM: up by the wrist, over his head, and down into the street in front of him.
  const r = swingR(sc)
  f.pose('m', 'M13', 1)
  f.orbit('m', hx + 6, hy - 6, r, 90, 230, 0.26, { ease: 'settle' })
  f.wait(0.05)
  f.orbit('m', hx - 2, hy + 4, r, 230, 22, 0.15, { ease: EASE_IN })
  const [ex, ey] = orbitAt(hx - 2, hy + 4, r, 22)
  c.note('m', ex, ey, 'M13')
  const sx = Math.round(hx - 2 - 2 * r * Math.sin((22 * Math.PI) / 180))
  c.crater(f.t, f.t + 1.0, sx, gy, 30)
  c.set += fx.ring(c.act, f.t, sx, gy, { rx: 24, color: '#FFFFFF' }) + fx.dust(c.act, f.t, sx + 14, gy - 2, { n: 4, seed: 'cqslam', color: PROPS.paperDark, dx: -10, s: 1.1 }) + fx.debris(c.act, f.t, sx, gy - 8, { n: 4, seed: 'cqslamd', colors: [INK_C, BLOCK, PAPER_D], spread: 40 })
  c.hit('m', { word: 'WHAM!', r: 24, stop: STOP.slam, shake: 4, flash: 0.35, impact: [80, 34], push: 1.1, x: sx, y: gy - 12, wx: sx - 34, wy: gy - 52 })
  // Down he goes, toward the viewer: S -> M out of the band's bottom (COVER STORY catches him at full size).
  f.wait(0.16)
  throwDown(c, sx)
  f.at(f.t - 0.2).pose('c', 'C1')
  c.note('c', ox, yc, 'C1')
  laugh(c, 'c', f.t, 1)
  f.approach('c', ox - 16, 0.4, { y: H + 70, ease: EASE_IN, lines: true, ghosts: false })
  c.still('M3', mx, hy, 1); c.still('C3', ox, yc, -1); c.starStill(hx, hy, 12)
}

/** The pane acts: 0 COVER STORY (swung by the wrist, the skid, the goggle wipe), 1 GDA WALL (the comeback and the knock-down). */
const conquestAct = (c: Cut, act: ActIndex): void => {
  const { W, H, sc, f } = c
  const yc = Math.round(H * (act === 0 ? 0.42 : 0.5))
  const ox = Math.round(W * 0.72)
  const mx = Math.round(W * 0.28)
  const gy = Math.min(H - 10, yc + 70)
  if (act === 0) {
    // ---- COVER STORY: Mark smashes in at full size (L -> XL, a crater); he lands after him, laughing.
    // (He stands in his catch pose all act: one Conquest frame here keeps COVER STORY inside its share of the reserve.)
    c.fighter('m', 'T4', mx, -60, 1).fighter('c', 'C3', ox + 20, -90, -1)
    f.at(0).approach('m', mx, 0.26, { y: yc + 12, ease: EASE_IN, lines: false, ghosts: false })
    c.note('m', mx, yc + 12, 'T4')
    c.crater(f.t, 1.6, mx, gy - 30, 34)
    c.set += fx.ring(c.act, f.t, mx, gy - 30, { rx: 26, color: '#FFFFFF' }) + fx.dust(c.act, f.t, mx + 20, gy - 30, { n: 5, seed: 'cqsmash', color: PROPS.paperDark, dx: -10, s: 1.4 }) + fx.debris(c.act, f.t, mx, gy - 36, { n: 4, seed: 'cqsmashd', colors: [INK_C, '#2A3350', PAPER_D], spread: 60 })
    c.hit('m', { word: 'BOOM!', r: 22, stop: STOP.slam, shake: 4, flash: 0.3, x: mx, y: gy - 34, wx: mx + 40, wy: yc - 40 })
    f.wait(0.12).pose('m', 'M2')
    f.approach('m', mx, 0.25, { y: yc, ease: 'settle', lines: false, ghosts: false })
    c.note('m', mx, yc, 'M2')
    f.at(0.35).approach('c', ox, 0.5, { y: yc, ease: 'settle', lines: false, ghosts: false })
    c.note('c', ox, yc)
    laugh(c, 'c', 0.9, 2)
    // The close-up: his scarred eye, the grin. FINALLY.
    cutin(c, 'CI0', 1.0, -1, 'FINALLY.')
    // The charge again: he catches him by the wrist this time.
    const [hx, hy] = catchHand(ox, yc, sc)
    const r = swingR(sc)
    f.at(1.6)
    pull(c, 'm', 8, 0.12)
    f.sfx('FWOOSH', mx + 40, yc - 40, { size: 13 })
    f.approach('m', hx - r, 0.26, { y: hy, ease: EASE_IN, lines: true, ghosts: false })
    c.note('m', hx - r, hy, 'M2')
    f.pose('c', 'C3')
    c.note('c', ox, yc, 'C3')
    c.hit('c', { word: 'GRAB', r: 10, stop: STOP.punch, shake: 1, x: hx, y: hy, wx: hx + 8, wy: hy - 34 })
    f.wait(0.12)
    // SWUNG BY THE WRIST: a full turn round his fist like a club; Mark's body smashes the two blocks on the way down.
    f.pose('m', 'M13', 1)
    const t0 = f.t
    const d = 0.5
    const blocks: [number, number][] = [[hx - Math.round(1.1 * r), 58], [hx - Math.round(1.75 * r), 44]]
    blocks.forEach(([bx, bh], i) => c.block(0, r3(t0 + d * when('whip', (395 + i * 14 - 90) / 360)), bx, gy + 14 - bh, bh, i === 0))
    f.at(t0).orbit('m', hx, hy, r, 90, 450, d, { ease: 'whip' })
    const [rx, ry] = orbitAt(hx, hy, r, 450)
    c.note('m', rx, ry, 'M13')
    // Let go: WHAM, Mark a spinning ball across the street, the skid, then he wipes his goggles.
    c.hit('m', { pose: 'M9', word: 'WHAM!', r: 22, stop: STOP.big, shake: 3, flash: 0.3, impact: [100, 50], push: 1.08, x: rx, y: ry, wx: rx + 10, wy: ry - 50 })
    f.wait(0.04)
    throughBlocks(c, W * 0.12, gy - 6, 0.55, [], { land: 'skid', pan: 14 })
    laugh(c, 'c', f.t, 1)
    f.wait(0.06).pose('m', 'M14', 1)
    c.note('m', W * 0.12, gy - 6, 'M14', 1)
    f.wait(0.36).pose('m', 'M2', 1)
    // Up and at him again: down out of the card (GDA WALL picks it up), and he follows.
    f.approach('m', mx + 30, 0.26, { y: H + 60, ease: EASE_IN, lines: true, ghosts: false })
    f.with().approach('c', ox - 10, 0.34, { y: H + 80, ease: EASE_IN, lines: false, ghosts: false })
    c.still('M13', hx - r, hy, 1); c.still('C3', ox, yc, -1); c.starStill(hx, hy, 14)
  } else {
    // ---- GDA WALL: the comeback. BAM; four jabs against his laugh; the spin; the slam; Mark hovers, tired.
    c.fighter('m', 'M2', mx - 20, -50, 1).fighter('c', 'C1', ox + 20, -80, -1)
    f.at(0).approach('m', mx, 0.3, { y: yc, ease: EASE_IN, lines: false, ghosts: false })
    c.note('m', mx, yc)
    f.at(0.1).approach('c', ox, 0.45, { y: yc, ease: 'settle', lines: false, ghosts: false })
    c.note('c', ox, yc)
    laugh(c, 'c', 0.6, 2)
    // The close-up before the comeback: Mark's eyes behind the goggles.
    cutin(c, 'CI1', 0.62, 1)
    f.at(1.1)
    pull(c, 'm', 8, 0.12)
    f.sfx('FWOOSH', mx + 40, yc - 36, { size: 13 })
    const hit = Math.round(ox - 36 * sc)
    dash(c, 'm', hit, 0.3, { y: yc - 12 })
    f.pose('c', 'C5')
    c.note('c', ox, yc, 'C5')
    c.hit('c', { word: 'BAM!', r: 22, stop: STOP.big, shake: 3, flash: 0.35, impact: [110, 56], push: 1.1, x: hit + 18 * sc, y: yc - 22, wx: ox - 30, wy: yc - 60 })
    f.approach('c', ox + 14, 0.14, { ease: EASE_OUT, lines: false, ghosts: false })
    c.note('c', ox + 14, yc, 'C5')
    // The trade: four jabs, his laugh between them.
    const words = ['POW', '', 'BIFF', '']
    for (let i = 0; i < 4; i++) {
      const jx = hit + 6 + (i % 2) * 6
      const jy = yc - 18 + ((i * 13) % 26)
      f.pose('m', i % 2 ? 'M3' : 'MS').approach('m', jx, 0.07, { y: jy, ease: EASE_IN, lines: false, ghosts: false }).pose('m', 'M3')
      c.note('m', jx, jy, 'M3')
      f.pose('c', i % 2 ? 'C1' : 'C5')
      c.jab(ox - 16, yc - 24 + ((i * 11) % 30), words[i] || undefined, ox - 48 + i * 8, yc - 58 + (i % 2) * 8)
      f.wait(0.08)
    }
    // THE SPIN: Mark takes his arm and spins him round (the spin smear), then hurls him DOWN into the street.
    const px = hit + Math.round(0.6 * 29 * sc)
    const py = yc - 12
    const rc = Math.max(24, ox + 14 - px)
    f.pose('m', 'MSP', 1).pose('c', 'C6')
    f.orbit('c', px, py, rc, 270, 720, 0.46, { ease: 'whip' })
    f.at(f.t - 0.1).pose('m', 'M3')
    f.at(f.t + 0.1)
    const lx = Math.round(px - 6)
    const ly = Math.round(gy - 5.5 * sc)
    f.approach('c', lx, 0.14, { y: ly, ease: EASE_IN, lines: false, ghosts: false }).pose('c', 'C7')
    c.note('c', lx, ly, 'C7')
    c.note('m', hit, py, 'M3')
    c.crater(f.t, f.t + 1.6, lx, gy + 4, 36)
    c.set += fx.ring(c.act, f.t, lx, gy + 6, { rx: 28, color: '#FFFFFF' }) + fx.puff(c.act, f.t, lx, gy + 2, { s: 1.2, fill: PROPS.paperDark, ink: PROPS.ink }) + fx.debris(c.act, f.t, lx, gy - 2, { n: 6, seed: 'cqdown', colors: [INK_C, PAPER_D, BLOCK], spread: 46 })
    c.hit('c', { word: 'BOOM!', r: 20, stop: STOP.slam, shake: 4, flash: 0.35, impact: [96, 46], x: lx, y: gy - 6, wx: lx + 30, wy: gy - 46 })
    c.set += fx.koStars(c.act, f.t + 0.15, f.t + 1.0, lx - 10, ly - 18, { color: '#FFE066', ink: PROPS.ink })
    // The quiet beat: Mark hovers, tired (a slow breath); from the crater, a grin: NOT DONE.
    f.wait(0.2).pose('m', 'M15', 1)
    const hx2 = Math.round(lx + 70)
    const hy2 = Math.round(yc - 30)
    f.approach('m', hx2, 0.4, { y: hy2, ease: 'settle', lines: false, ghosts: false })
    c.note('m', hx2, hy2, 'M15')
    for (let i = 0; i < 2; i++) f.approach('m', hx2, 0.32, { y: hy2 + 1.5, ease: 'settle', lines: false, ghosts: false }).approach('m', hx2, 0.32, { y: hy2, ease: 'settle', lines: false, ghosts: false })
    f.at(f.t - 0.9).say('c', 'NOT DONE.', 0.8, { fill: '#FFFFFF', ink: PROPS.ink })
    c.still('M15', hx2, hy2, 1); c.still('C7', lx, ly, -1)
  }
}

// ---------------------------------------------------------------- MARK VS CONQUEST's pane framing and arena
/**
 * The downtown arena (the art set's FXC_ARENA_FAR and _MID, 160 px tiles) cut to stepped silhouettes in code: the far towers,
 * the near block with its few lit windows. Two parallax layers for ~1.1 k (the full-colour cut was 6.6 k a layer).
 */
const ARENA_FAR = 'M0 18V9H2V8H5V7H6V8H8V14H9V12H15V17H17V7H22V17H23V15H24V6H25V5H26V4H27V3H28V4H29V5H30V17H31V13H35V12H39V14H40V11H44V12H45V17H47V6H55V17H56V16H57V13H64V14H65V10H66V9H68V10H72V13H73V9H76V6H78V4H83V5H84V17H85V11H89V9H90V10H91V11H92V17H93V14H96V12H102V4H105V2H106V4H108V17H110V7H116V17H118V10H122V9H124V7H125V9H128V17H129V5H130V4H131V3H132V4H133V13H135V12H138V11H139V12H142V13H143V14H144V17H145V9H147V6H148V9H150V10H153V14H154V15H155V17H156V12H160V18z'
const ARENA_MID = 'M0 18V10H4V9H5V8H6V9H8V10H10V9H18V12H21V15H23V14H25V6H26V5H27V3H28V5H37V6H38V5H39V9H40V10H42V6H43V11H44V17H46V13H47V12H49V11H53V13H57V7H59V6H60V7H65V8H68V9H69V10H70V12H73V11H75V10H76V14H77V16H80V6H81V4H82V5H83V3H84V5H86V3H88V2H90V1H91V0H93V17H96V11H97V10H100V9H101V8H103V9H104V10H105V9H107V10H108V12H110V13H112V17H115V15H116V9H118V7H119V6H122V5H123V9H129V14H132V15H133V14H135V13H136V16H137V17H139V8H142V7H144V8H147V6H150V4H151V6H154V5H155V6H156V11H160V18z'
const ARENA_LIT = 'M88 7h1v1h-1zM146 11h4v1h-4zM2 12h2v1h-2zM39 13h1v1h-1zM90 13h2v1h-2zM39 14h1v1h-1zM8 15h2v1h-2zM69 15h4v1h-4zM104 15h4v1h-4zM129 15h1v1h-1zM129 16h1v1h-1z'
/** The arena behind a pane act: two drifting layers along the act's floor, `rows` tall (the tile is 18). */
const arena = (c: Cut, rows: number): string => {
  const s = r3(rows / 18)
  const sky = parallax({ id: `${c.act.p}ar`, W: Math.ceil(c.W / s), H: 18, fps: 6, layers: [{ tile: `<path d="${ARENA_FAR}" fill="#5E6E8A"/>`, w: 160, speed: 1.5, op: 0.5 }, { tile: `<path d="${ARENA_MID}" fill="#1D2A41"/><path d="${ARENA_LIT}" fill="#F2DA74"/>`, w: 160, speed: 4 }] })
  return `<style>${sky.css}</style><g transform="translate(0 ${r1(c.H - rows)}) scale(${s})">${sky.svg}</g>`
}
/**
 * How a Conquest pane act fills its card: drawn on a virtual card of about the act's design size (620 x 236) under the card's
 * title row, then scaled up to the card (a static push-in: the fighters, the words and the cut-in all grow), centred when the
 * card is wider. `k` 1 on a short card (GDA WALL keeps its size; its action is centred instead of spread).
 */
export const cqFrame = (W: number, H: number): { k: number; Wv: number; Hv: number; x: number; top: number } => {
  const top = 24
  const k = r3(Math.max(1, Math.min(1.8, W / 620, (H - top) / 236)))
  const Wv = Math.round(Math.min(W / k, 700))
  return { k, Wv, Hv: Math.round((H - top) / k), x: r1((W - Wv * k) / 2), top }
}

// ---------------------------------------------------------------- surfaces
export type FightArgs = { W: number; H: number; era: Era; startAt: number; /** Colours kept per frame. */ K?: number; big?: boolean; /** Which version (default 0). */ v?: Version; /** The band only: the clear span and the readouts to keep clear (stage/keep.ts). */ stage?: BandStage }
type Built = { svg: string; chain: string[]; frames: number; shake: string; cut: Cut }
const CACHE = new Map<string, Built>()
const build = (a: FightArgs, surface: 'band' | ActIndex): Built => {
  const v = a.v ?? 0
  const T = timing(v)
  const st = surface === 'band' ? a.stage : undefined
  const key = `${surface}|${v}|${a.era}|${a.W}|${a.H}|${a.startAt}|${a.K ?? 4}|${st ? `${st.x1}:${st.keep.join(';')}` : ''}`
  const hit = CACHE.get(key)
  if (hit) return hit
  const band = surface === 'band'
  const off = band ? 0 : (T.off[surface] as number)
  // On the real band the cut is laid out on a virtual width whose action box (0.67 of it) ends at the band's clear span, so
  // it never reaches the crew, the percent, TODAY or the readouts; a narrow span plays it smaller.
  const W = st ? Math.max(360, Math.min(a.W, Math.round((st.x1 - 4) / 0.67))) : a.W
  const box: [number, number, number, number] = band ? [0, 0, Math.round(W * 0.67), a.H] : [0, 0, a.W, a.H]
  const cq = v === CONQUEST
  const sc = band ? (W < 620 ? 1.15 : W < 800 ? 1.3 : 1.45) : 1.9
  const fr = cq && !band ? cqFrame(a.W, a.H) : undefined
  const c = fr
    ? new Cut(`invf-p${surface}-${v}-${a.era}-${a.W}x${a.H}`, a.startAt, off, a.era, sc, fr.Wv, fr.Hv, [0, 0, fr.Wv, fr.Hv], a.K ?? 4, T.ms, cq)
    : new Cut(`invf-${band ? 'b' : `p${surface}`}-${v}-${a.era}-${a.W}x${a.H}`, a.startAt, off, a.era, sc, W, a.H, box, a.K ?? 4, T.ms, cq, st ? 2 : undefined)
  // The card under the fight: a veil (COVER STORY is the fight's own panel; GDA WALL's live feed stays readable through it),
  // and the downtown arena where the card has the room for it (GDA WALL; COVER STORY's card is at its 60 k).
  if (fr) c.set += `<rect x="${r1(-fr.x / fr.k)}" width="${r1(a.W / fr.k)}" height="${fr.Hv}" fill="${PROPS.ink}" opacity="${surface === 0 ? 0.8 : 0.5}"/>${surface === 1 ? arena(c, Math.round(fr.Hv * 0.32)) : ''}`
  if (st) c.keep = st.keep
  if (band) { if (cq) conquestBand(c); else bandCut(c, v as 0 | 1 | 2) }
  else if (cq) conquestAct(c, surface)
  else actCut(c, surface)
  const done0 = c.done(band ? T.band : (T.len[surface] as number))
  const done = fr ? `<g transform="translate(${fr.x} ${fr.top}) scale(${fr.k})">${done0}</g>` : done0
  // The keep-out: the window under the header rule, left of the clear span, minus the Tasks chip and the step count.
  const svg = st ? `${keepClip(`${c.act.p}kc`, [0, 34, st.x1, a.H - 34], st.keep)}<g clip-path="url(#${c.act.p}kc)">${done}</g>` : done
  const chain = c.act.chainKeys()
  const out: Built = { svg, chain, frames: c.act.bank.count(), shake: c.shake(), cut: c }
  if (CACHE.size > 24) CACHE.delete(CACHE.keys().next().value as string)
  CACHE.set(key, out)
  return out
}

/** The band's layer of THE FIGHT (the 5.5 s cut, from `startAt`). */
export const fightBand = (a: FightArgs): { svg: string; chain: string[]; frames: number } => { const b = build(a, 'band'); return { svg: b.svg, chain: b.chain, frames: b.frames } }
/** One pane act (0 COVER STORY, 1 GDA WALL, 2 THE PAGE) as a layer to splice into that card. */
export const fightAct = (a: FightArgs, act: ActIndex): { svg: string; chain: string[]; frames: number } => {
  if (act >= timing(a.v ?? 0).acts) return { svg: '', chain: [], frames: 0 }
  const b = build(a, act)
  return { svg: b.svg, chain: b.chain, frames: b.frames }
}
/**
 * The panel's shake for a surface, as animation LONGHANDS (`animation-name:a,b;...;animation-delay:x,y`): every shake of the
 * cut plays. (v1 glued a delay list to an `animation:` shorthand, so only one shake ever played.)
 */
export const fightShake = (surface: 'band' | 'pane', startAt: number, W: number, H: number, era: Era, act?: ActIndex, v: Version = 0): string => surface === 'pane' && (act ?? 0) >= timing(v).acts ? '' : build({ W, H, era, startAt, v }, surface === 'band' ? 'band' : act ?? 0).shake
/** The cut itself (tests: hits, freezes, the script). */
export const fightCut = (a: FightArgs, surface: 'band' | ActIndex): { act: Act; f: Fight; cam: Camera } => { const c = build(a, surface).cut; return { act: c.act, f: c.f, cam: c.cam } }
/** The chains of poses each act plays, in time order (the three combos). */
export const COMBOS = COMBO_NAMES
export const chainOfAct = (act: ActIndex | 'band', era: Era = 1, v: Version = 0): string[] => (act === 'band' ? fightBand({ W: 900, H: 134, era, startAt: 0, v }).chain : fightAct({ W: 480, H: act === 0 ? 434 : act === 1 ? 236 : 260, era, startAt: 0, v }, act).chain)
/** The slot's hole while Mark is out (the whole fight), sealed by a burst at the end. */
export const fightHole = (era: Era, startAt: number, tile: string, v: Version = 0): string => {
  const P = pal(era)
  const d = (t: number): string => `calc(${pin(startAt)} + ${r3(t)}s)`
  const hole = `<rect x="14" y="34" width="44" height="46" fill="${tile}"/><path d="M36 40l-6 10 5 6-8 9 6 6m4-31l7 8-6 7 9 8" fill="none" stroke="${P.muted}" stroke-width="1.2"/><ellipse cx="36" cy="58" rx="13" ry="15" fill="${PROPS.ink}"/>`
  return `<g pointer-events="none" style="opacity:0;animation:dl-hole ${r3(timing(v).ms / 1000)}s steps(1) forwards;animation-delay:${d(0)}"><style>@keyframes dl-hole{0%,99%{opacity:1}100%{opacity:0}}</style>${hole}</g>`
}
export { info as frameInfo }
