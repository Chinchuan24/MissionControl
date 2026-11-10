// The Boys (fan homage): the typed acts, T1-T60 of the egg bible. Each act runs ONE CSS duration with its keyframes in percent,
// so one pinned delay (`pin(startAt)`) drives every piece: a redraw anywhere in the act resumes it. Every act draws on the band
// AND on a pane card (or all of them, or THE TABLE). People are only ever the approved TB_ sprites; every prop is drawn here.
// Reduced motion: the movers stop at their still pose, flashes are hidden, and the act still ends on time. PG-13: no hit lands,
// the only "impacts" are scorch dots, a grey-pink splat and stamps. All words are ours, or a short attributed quote.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BandStage } from './stage/keep'
import { BUST, C, CRAWL_Y, M, PROPS, SP, T, clip, condW, crew, esc, faceIcon, pal, pin, px, r1, sansW, spH, spW, stamp, star, tape, unit } from './theboys'
import type { Mode } from './theboys'
import type { PaneCard } from './themes'
import { VNN_BRAND, actMs, scoreAt } from './theboys-eggs'
import { Act as StageAct } from './stage/timeline'
import { FrameBank } from './stage/frames'
import * as fx from './stage/fx'
import { ease } from './stage/ease'
import * as MS from './theboys-motion-sprites'
import type { Sprite } from './cast'

export type ActSurface = PaneCard | 'band' | 'table'
/** Where an act is drawn: the panel's size, the mode, the clock it started at, and (band only) the task title and its width. */
export type Geo = { W: number; H: number; m: Mode; at: number; on: ActSurface; task?: string; titleW?: number; /** The band only: the clear span and the readouts to keep clear (stage/keep.ts). */ stage?: BandStage }

// ---------------------------------------------------------------- the act builder
type Fr = [number, number, number, number?, string?]
export class Act {
  css = ''
  n = 0
  /** The surface this act draws on (actOn sets it): the stage act below takes its size and its id from it. */
  geo?: { W: number; H: number; on: string }
  private stage?: StageAct
  /** Colours per pose on the stage act (rect-path quantise): the fights take 7 to fit the band budget. Set before `sg` is used. */
  sgK = 8
  constructor(readonly kind: string, readonly ms: number, readonly at: number) {}
  /**
   * The shared stage engine's act on this act's clock (same length, same pinned start): its `fx` cues (dust, sparks, speed
   * lines, rings), frame-swap actors (`sg.cast` + `sg.actor`, a pose per beat), wipes and camera pieces all inline anywhere in
   * this act's body. Wrap them in `a.fx()` so reduced motion hides them (the act's own movers keep their still pose).
   */
  get sg(): StageAct {
    this.stage ??= new StageAct({ id: `tb-${this.kind}-${this.geo?.on ?? 'x'}`, ms: this.ms, at: this.at, W: this.geo?.W ?? 600, H: this.geo?.H ?? 148, K: this.sgK })
    return this.stage
  }
  /** A stage piece (fx, a stage actor, a wipe): drawn as is, hidden under reduced motion. */
  fx = (svg: string): string => `<g class="tqh">${svg}</g>`
  pc = (t: number): number => +Math.min(100, Math.max(0, ((t * 1000) / this.ms) * 100)).toFixed(2)
  k = (): string => `x${this.kind.slice(0, 4)}${this.n++}`
  /** Moves `svg` through [t s, x, y, opacity?, extra transform?] frames; held at frame `still` when motion is reduced. */
  mv(svg: string, fr: Fr[], o: { still?: number; ease?: string; c?: boolean } = {}): string {
    const k = this.k()
    this.css += `@keyframes ${k}{${fr.map(([t, x, y, op, ex]) => `${this.pc(t)}%{transform:translate(${r1(x)}px,${r1(y)}px)${ex ? ` ${ex}` : ''}${op !== undefined ? `;opacity:${op}` : ''}}`).join('')}}`
    const s = fr[o.still ?? Math.floor(fr.length / 2)] as Fr
    return `<g class="tq${o.c ? ' tqc' : ''}" style="animation-name:${k}${o.ease ? `;animation-timing-function:${o.ease}` : ''}" transform="translate(${r1(s[1])} ${r1(s[2])})"${s[3] !== undefined ? ` opacity="${s[3]}"` : ''}>${svg}</g>`
  }
  /** Shown from t0 to t1 s (cut, or faded over `fade` s); `still` keeps it in the reduced-motion frame. */
  on(svg: string, t0: number, t1: number, o: { still?: boolean; fade?: number; op?: number } = {}): string {
    const k = this.k()
    const op = o.op ?? 1
    const f = o.fade ?? 0
    const a = this.pc(t0)
    const b = this.pc(t1)
    const fr = f ? `0%{opacity:0}${a}%{opacity:0}${this.pc(t0 + f)}%{opacity:${op}}${this.pc(Math.max(t0 + f, t1 - f))}%{opacity:${op}}${b}%{opacity:0}100%{opacity:0}` : `0%{opacity:${a > 0 ? 0 : op}}${a > 0 ? `${a}%{opacity:${op}}` : ''}${b < 100 ? `${b}%{opacity:0}100%{opacity:0}` : `100%{opacity:${op}}`}`
    this.css += `@keyframes ${k}{${fr}}`
    return `<g class="tq${o.still === false ? ' tqh' : ''}" style="animation-name:${k}${f ? '' : ';animation-timing-function:steps(1,end)'}" opacity="${o.still === false ? 0 : op}">${svg}</g>`
  }
  /** Any keyframes ([t s, declarations]) on a wrapper; `c` turns about its own centre. */
  kf(svg: string, fr: [number, string][], o: { c?: boolean; ease?: string; still?: string; origin?: string } = {}): string {
    const k = this.k()
    this.css += `@keyframes ${k}{${fr.map(([t, v]) => `${this.pc(t)}%{${v}}`).join('')}}`
    return `<g class="tq${o.c ? ' tqc' : ''}" style="animation-name:${k}${o.ease ? `;animation-timing-function:${o.ease}` : ''}${o.origin ? `;transform-origin:${o.origin}` : ''}"${o.still ? ` ${o.still}` : ''}>${svg}</g>`
  }
  /** A stamp that slams down at `t` and stays to `t1`. */
  slam(svg: string, t: number, t1: number): string {
    return this.kf(svg, [[0, 'opacity:0;transform:scale(2.4)'], [t, 'opacity:0;transform:scale(2.4)'], [t + 0.01, 'opacity:1;transform:scale(2.4)'], [t + 0.22, 'opacity:1;transform:scale(.94)'], [t + 0.3, 'opacity:1;transform:none'], [t1, 'opacity:1;transform:none'], [t1 + 0.01, 'opacity:0'], [this.ms / 1000, 'opacity:0']], { c: true, ease: 'cubic-bezier(.2,1.3,.3,1)' })
  }
  /** The act's root: its own CSS (the pinned delay, the life, the reduced-motion rule) and the body. */
  done(body: string, extraCss = ''): string {
    const s = this.ms / 1000
    const css = `.tq,.tql{animation-duration:${s}s;animation-fill-mode:both;animation-delay:calc(${pin(this.at)} + 0s);animation-timing-function:linear}.tql{animation-name:tql;animation-timing-function:steps(1,end)}@keyframes tql{0%,99.4%{opacity:1}100%{opacity:0;visibility:hidden}}.tqc{transform-box:fill-box;transform-origin:50% 50%}.tqb{animation:tqb .36s steps(2) infinite}@keyframes tqb{50%{transform:translateY(-1.6px)}}.tqw{animation:tqw 1.2s ease-in-out infinite}@keyframes tqw{0%,60%,100%{transform:none}30%{transform:translateY(-5px)}}.tqf1{animation:tqf .3s steps(1) infinite}.tqf2{animation:tqf .3s steps(1) infinite;animation-delay:-.15s}@keyframes tqf{50%{opacity:0}}@media (prefers-reduced-motion: reduce){.tq,.tqb,.tqw,.tqf1,.dl-cam{animation:none!important}.tqh,.tqf2{display:none}}${extraCss}${this.css}`
    // The stage act's pieces read --p/--q (tracks) and --s (cues) off the root; its CSS and its pose <defs> ride along.
    const sg = this.stage
    const vars = sg ? ` style="--p:${pin(this.at)};--q:var(--p);--s:calc(${pin(this.at)} + 0s)"` : ''
    return `<g class="tql" pointer-events="none" data-egg="act-${this.kind}"${vars}><style>${css}${sg ? sg.styles() : ''}</style>${sg ? `<defs>${sg.bank.defs()}</defs>` : ''}${body}</g>`
  }
}

// ---------------------------------------------------------------- props and type in each mode's hand
const ink = (m: Mode) => (m === 'book' ? PROPS.paperInk : m === 'gold' ? '#EFE3C2' : '#F0D27A')
/** A caption: a navy pill with a gold rim (ON BRAND), a strip of tape in marker (OFF BOOK), an olive plate with brass (GOLD). */
export const capW = (text: string, z = 10) => condW(text, z, 1) + 16
export const cap = (x: number, y: number, text: string, m: Mode, o: { z?: number; mid?: boolean; red?: boolean } = {}) => {
  const z = o.z ?? 10
  const w = capW(text, z)
  const h = z + 8
  const x0 = o.mid ? x - w / 2 : x
  const P = pal(m)
  let bg = ''
  let fg = ink(m)
  if (o.red) { bg = `<rect x="${r1(x0)}" y="${r1(y - z - 3)}" width="${r1(w)}" height="${h}" rx="2" fill="${PROPS.hero}"/>`; fg = '#FFFFFF' }
  else if (m === 'book') bg = tape(x0 + w / 2, y - z * 0.36, w + 4, h + 2, -1.5, 0.95)
  else if (m === 'gold') bg = `<rect x="${r1(x0)}" y="${r1(y - z - 3)}" width="${r1(w)}" height="${h}" rx="1.5" fill="${P.olive}" stroke="${P.a}"/>`
  else bg = `<rect x="${r1(x0)}" y="${r1(y - z - 3)}" width="${r1(w)}" height="${h}" rx="${h / 2}" fill="${P.ink}" stroke="${P.a}" stroke-width="1.2"/>`
  return `${bg}${C(x0 + 8, y, text, z, fg, 'letter-spacing="1"')}`
}
/** A speech bubble whose tail tip is at (x, y); it opens up and to the right (`left`: up and to the left). */
export const bub = (x: number, y: number, text: string, m: Mode, left = false) => {
  const z = 11
  const w = sansW(text, z, 0, true) + 16
  const h = 20
  const bx = left ? x - w + 10 : x - 10
  const by = y - h - 7
  const fill = m === 'book' ? PROPS.manila : m === 'gold' ? '#EFE3C2' : '#FFFFFF'
  return `<rect x="${r1(bx)}" y="${r1(by)}" width="${r1(w)}" height="${h}" rx="7" fill="${fill}" stroke="${PROPS.ink}" stroke-width="1.2"/><path d="M${r1(x - 3)} ${r1(by + h - 0.6)}L${r1(x)} ${r1(y)}L${r1(x + 5)} ${r1(by + h - 0.6)}z" fill="${fill}" stroke="${PROPS.ink}" stroke-width="1.2" stroke-linejoin="round"/><rect x="${r1(x - 2)}" y="${r1(by + h - 2)}" width="6" height="2.4" fill="${fill}"/>${T(bx + 8, by + 14, text, z, 700, PROPS.paperInk)}`
}
/** A film slate: the striped clapper (it claps at `clap` when animated by the caller) over a black board. */
export const slate = (x: number, y: number, title: string, sub: string, z = 11, wMin = 0, arm = true) => {
  const w = Math.max(wMin, Math.max(condW(title, z, 1), condW(sub, 8.5, 0.8)) + 20)
  let st = ''
  for (let i = 0; i < Math.ceil(w / 10); i++) st += `<path d="M${r1(x + i * 10)} ${y}h5l-4 7h-5z" fill="#F4F1E8"/>`
  if (!arm) st = ''
  return `<rect x="${r1(x)}" y="${y}" width="${r1(w)}" height="7" fill="#15161A"/>${st}<rect x="${r1(x)}" y="${y + 8}" width="${r1(w)}" height="${z + 16}" rx="1.5" fill="#15161A" stroke="#F4F1E8" stroke-width=".8"/>${C(x + 10, y + 9 + z + 1, title, z, '#FFFFFF', 'letter-spacing="1"')}${C(x + 10, y + z + 20, sub, 8.5, '#C9C2B0', 'letter-spacing=".8"')}`
}
export const slateW = (title: string, sub: string, z = 11) => Math.max(condW(title, z, 1), condW(sub, 8.5, 0.8)) + 20
/**
 * The slate that claps: the striped arm sits open on its hinge (left end), opens a little wider (the wind-up) and snaps shut at
 * `clap` s, bounces once, and a chalk puff jumps off the hinge. Reduced motion: the arm drawn shut.
 */
export const clapSlate = (a: Act, x: number, y: number, title: string, sub: string, clap: number, z = 11, wMin = 0) => {
  const w = Math.max(wMin, slateW(title, sub, z))
  let st = ''
  for (let i = 0; i < Math.ceil(w / 10); i++) st += `<path d="M${r1(x + 2 + i * 10)} ${y}h5l4 7h-5z" fill="#15161A"/>`
  const end = a.ms / 1000
  const arm = a.kf(`<rect x="${r1(x)}" y="${y}" width="${r1(w)}" height="7" fill="#F4F1E8"/>${st}`, [[0, 'transform:translateY(-7px) rotate(-24deg)'], [Math.max(0.01, clap - 0.16), 'transform:translateY(-7px) rotate(-31deg)'], [clap, 'transform:translateY(-7px) rotate(0deg)'], [clap + 0.06, 'transform:translateY(-7px) rotate(-4deg)'], [clap + 0.12, 'transform:translateY(-7px)'], [end, 'transform:translateY(-7px)']], { ease: ease('snap'), origin: `${r1(x)}px ${y + 7}px`, still: 'transform="translate(0 -7)"' })
  return slate(x, y, title, sub, z, wMin) + arm + a.fx(fx.puff(a.sg, clap, x + 8, y - 6, { s: 0.45, fill: '#F4F1E8' }) + fx.sparks(a.sg, clap, x + w * 0.5, y - 2, { n: 5, seed: `clap${x}`, color: '#FFFFFF', len: 4 }))
}
const heart = (x: number, y: number, s = 1, c = '#E8455A') => `<path transform="translate(${r1(x)} ${r1(y)}) scale(${s})" d="M5 9C3 7.4 0 5.6 0 3A2.6 2.6 0 0 1 5 1.6A2.6 2.6 0 0 1 10 3C10 5.6 7 7.4 5 9z" fill="${c}"/>`
const note = (x: number, y: number, c: string) => `<g transform="translate(${r1(x)} ${r1(y)})"><ellipse cx="2.2" cy="8" rx="2.4" ry="1.7" fill="${c}"/><rect x="3.8" y="0" width="1.1" height="8" fill="${c}"/><path d="M4.9 0q3.4 1.4 2.4 4.6" fill="none" stroke="${c}" stroke-width="1.1"/></g>`
const poof = (x: number, y: number) => `<g transform="translate(${r1(x)} ${r1(y)})">${[[0, 0, 7], [-7, 3, 5], [7, 3, 5], [-3, -6, 5], [4, -5, 4]].map(([a, b, r]) => `<circle cx="${a}" cy="${b}" r="${r}" fill="#9FDBFF" opacity=".85"/>`).join('')}<circle r="3" fill="#FFFFFF"/></g>`
const censor = (x: number, y: number, w = 48) => `<rect x="${r1(x)}" y="${r1(y)}" width="${w}" height="12" fill="#050505"/>${C(x + w / 2, y + 9, 'CENSORED', 8, '#FFFFFF', 'text-anchor="middle" letter-spacing="1"')}`
const knight = (x: number, y: number, s = 1.6, c = '#F4F1E8') => `<path transform="translate(${r1(x)} ${r1(y)}) scale(${s})" d="M1 12h8v-2H8C7 8 7 6.6 8.2 5L6.6 1.4 4.4 0 3.6 1.6 1.4 3.4 0 6l1.4.8L3.8 5.4C4.8 7 2.6 8.4 2 10H1z" fill="${c}" stroke="${PROPS.ink}" stroke-width=".7"/>`
const octo = (x: number, y: number, s = 1.6) => `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s})"><ellipse cx="6" cy="4" rx="5" ry="4" fill="#F08A5D"/>${[1, 3.4, 6, 8.6, 11].map(t => `<path d="M${t} 6.6q-.8 2.4 .6 3.4" fill="none" stroke="#F08A5D" stroke-width="1.3" stroke-linecap="round"/>`).join('')}<circle cx="4.2" cy="3.6" r=".9" fill="${PROPS.ink}"/><circle cx="7.8" cy="3.6" r=".9" fill="${PROPS.ink}"/></g>`
const tentacle = (x: number, y: number, s = 1) => `<path transform="translate(${r1(x)} ${r1(y)}) scale(${s})" d="M0 30C2 20 -2 12 6 6C10 3 14 4 13 8C12 11 9 9 9 12C8 18 12 24 10 30z" fill="#8B5BC4"/><g transform="translate(${r1(x)} ${r1(y)}) scale(${s})">${[[7, 14], [9, 20], [10, 25], [6, 9]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="1.1" fill="#E3C8FF"/>`).join('')}</g>`
const dolphin = (x: number, y: number, s = 1.5) => `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s})"><path d="M0 6C4 1 12 0 18 3L22 1 20 5C21 7 20 9 17 9C12 10 6 9 0 6z" fill="#6E93B8"/><path d="M9 2.4L11 -1 12.6 2.4z" fill="#6E93B8"/><path d="M3 6.4C8 8 13 8.4 17 8" fill="none" stroke="#D7E4F0" stroke-width="1.2"/><circle cx="16" cy="4.6" r=".8" fill="${PROPS.ink}"/></g>`
const beaver = (x: number, y: number) => `<g transform="translate(${r1(x)} ${r1(y)})"><ellipse cx="10" cy="15" rx="9" ry="9" fill="#8A5A34"/><ellipse cx="18" cy="21" rx="6" ry="3" fill="#5B3A22"/><circle cx="10" cy="6" r="6" fill="#9B6A40"/><circle cx="6" cy="1.6" r="2" fill="#9B6A40"/><circle cx="14" cy="1.6" r="2" fill="#9B6A40"/><circle cx="8" cy="5" r="1.1" fill="${PROPS.ink}"/><circle cx="12" cy="5" r="1.1" fill="${PROPS.ink}"/><rect x="8.6" y="9" width="2.8" height="3" fill="#FFFFFF"/><ellipse cx="10" cy="15" rx="5" ry="6" fill="#C79A6A"/></g>`
const critter = (x: number, y: number, c: string) => `<g transform="translate(${r1(x)} ${r1(y)})"><ellipse cx="6" cy="9" rx="6" ry="5" fill="${c}"/><circle cx="6" cy="4" r="4" fill="${c}"/><path d="M2.4 1.4L2 -2 4.4 .6zM9.6 1.4L10 -2 7.6 .6z" fill="${c}"/><circle cx="4.6" cy="3.6" r=".9" fill="${PROPS.ink}"/><circle cx="7.4" cy="3.6" r=".9" fill="${PROPS.ink}"/><path d="M4.6 5.8q1.4 1.2 2.8 0" fill="none" stroke="${PROPS.ink}" stroke-width=".7"/></g>`
/** Terror, the bulldog (code-drawn, 18 by 12 at 1x): `sit` folds the back legs, `sleep` lies flat. */
const dog = (x: number, y: number, pose: 'walk' | 'sit' = 'walk', s = 1.6) => {
  const fawn = '#C9A27A'
  const legs = pose === 'sit' ? `<rect x="3" y="8" width="5" height="4" rx="1.5" fill="${fawn}"/><rect x="12" y="8" width="2.2" height="4" fill="#EDE3D3"/><rect x="15" y="8" width="2.2" height="4" fill="#EDE3D3"/>` : `<g class="tqf1"><rect x="3" y="8" width="2.2" height="4" fill="${fawn}"/><rect x="13" y="8" width="2.2" height="4" fill="#EDE3D3"/></g><g class="tqf2"><rect x="5" y="8" width="2.2" height="4" fill="${fawn}"/><rect x="15" y="8" width="2.2" height="4" fill="#EDE3D3"/></g>`
  return `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s})">${legs}<ellipse cx="9" cy="6.6" rx="8" ry="4" fill="${fawn}"/><ellipse cx="11" cy="7.6" rx="4" ry="2.6" fill="#EDE3D3"/><circle cx="16" cy="4" r="3.6" fill="${fawn}"/><path d="M13.6 1.2l-1 -1.8 2.4 1zM18 1l1 -1.8 .4 2z" fill="#7A5A3E"/><ellipse cx="17.6" cy="5.2" rx="2" ry="1.4" fill="#EDE3D3"/><circle cx="18.6" cy="4.6" r=".8" fill="${PROPS.ink}"/><circle cx="15.6" cy="3.2" r=".6" fill="${PROPS.ink}"/><path d="M1 5.6l-1.4 -1" stroke="${fawn}" stroke-width="1.2"/></g>`
}
const pig = (x: number, y: number) => `<g transform="translate(${r1(x)} ${r1(y)}) scale(1.6)"><ellipse cx="3" cy="3" rx="3" ry="2.2" fill="#F2A6B8"/><ellipse cx="5.6" cy="2.8" rx="1" ry=".8" fill="#E07C96"/><path d="M1.4 1l.4 -1 .8 .9" fill="#F2A6B8"/></g>`
const can = (x: number, y: number, s = 1.6) => `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s})"><rect width="6" height="10" rx="1" fill="#2FBF62"/><rect y="1" width="6" height="1" fill="#C8F7D6"/><path d="M1 7l2 -3 2 3z" fill="#F4F1E8"/></g>`
const flashbulb = (x: number, y: number, r = 6) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="#FFFFFF" opacity=".9"/><path d="M${r1(x - r * 2)} ${r1(y)}h${r * 4}M${r1(x)} ${r1(y - r * 2)}v${r * 4}" stroke="#FFFFFF" stroke-width="1.1" opacity=".75"/>`
const cone = (x: number, top: number, bot: number, w: number, c = '#FFF4C2', op = 0.22) => `<path d="M${r1(x - 3)} ${r1(top)}h6L${r1(x + w / 2)} ${r1(bot)}H${r1(x - w / 2)}z" fill="${c}" opacity="${op}"/>`
const glass = (x: number, y: number, s = 1.4, full = 1) => `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s})"><path d="M0 0h9l-1 12h-7z" fill="${PROPS.glass}" fill-opacity=".2" stroke="${PROPS.milkEdge}" stroke-width=".8"/><path d="M${r1(0.6 + (1 - full))} ${r1(1 + 11 * (1 - full))}H${r1(8.4 - (1 - full))}L7.9 11.5h-6.8z" fill="${PROPS.milk}"/></g>`
const vial = (x: number, y: number, s = 1.6) => `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s})"><rect x="1" y="0" width="4" height="2" fill="#B9C3D0"/><rect x="0" y="2" width="6" height="12" rx="1.5" fill="${PROPS.glass}" fill-opacity=".3" stroke="#DDE8F2" stroke-width=".7"/><rect x=".8" y="6" width="4.4" height="7.2" rx="1" fill="${PROPS.vblue}"/></g>`
const bell = (x: number, y: number, c = '#F0D27A') => `<g transform="translate(${r1(x)} ${r1(y)})"><path d="M0 12C2 10 2 4 7 3C12 4 12 10 14 12z" fill="${c}"/><circle cx="7" cy="13.4" r="1.6" fill="${c}"/><rect x="6" y="0" width="2" height="3" fill="${c}"/></g>`
const crowd = (x: number, y: number, w: number, c: string) => {
  let s = `<defs><g id="tqhd"><circle cx="5" cy="-13" r="4"/><path d="M0 0q0 -8 5 -8q5 0 5 8z"/></g></defs><g fill="${c}">`
  const n = Math.floor(w / 14)
  for (let i = 0; i < n; i++) s += `<g class="tqw" style="animation-delay:-${(1.2 - ((i * 0.05) % 1.2)).toFixed(2)}s"><use href="#tqhd" x="${r1(x + i * 14)}" y="${y}"/></g>`
  return `${s}</g>`
}
const ribbon = (x: number, y: number, w: number, text: string, fill: string, fg: string, z = 10) => `<path d="M${r1(x - 10)} ${y - z - 2}h10v${z + 8}h-10l4 ${-(z + 8) / 2}z" fill="${fill}" opacity=".75"/><path d="M${r1(x + w + 10)} ${y - z - 2}h-10v${z + 8}h10l-4 ${-(z + 8) / 2}z" fill="${fill}" opacity=".75"/><rect x="${r1(x)}" y="${y - z - 4}" width="${r1(w)}" height="${z + 9}" fill="${fill}"/>${C(x + w / 2, y + 0.5, text, z, fg, 'text-anchor="middle" letter-spacing="1.4"')}`
const vhs = (x: number, y: number, title: string, year: string, cover: any, s = 2) => `<g transform="translate(${r1(x)} ${r1(y)})"><rect width="${20 * s}" height="${30 * s}" rx="1.5" fill="#1C1C22" stroke="#E04FA0" stroke-width="1"/><rect x="2" y="2" width="${20 * s - 4}" height="${11 * s}" fill="#A8423A"/>${C(4, 8 + 3 * s, title, 6.5, '#FFF3C4', 'letter-spacing=".4"')}${C(4, 9 + 6.5 * s, year, 6.5, '#FFF3C4')}${cover ? px(cover, 4, 13 * s, (20 * s - 8) / spW(cover)) : ''}</g>`
const tv = (x: number, y: number, title: string, s = 2.4) => `<g transform="translate(${r1(x)} ${r1(y)})"><path d="M${8 * s} 0l${4 * s} ${4 * s}l${4 * s} ${-4 * s}" fill="none" stroke="#9A9AA0" stroke-width="1.2"/><rect y="${4 * s}" width="${24 * s}" height="${18 * s}" rx="3" fill="#2A2A30" stroke="#9A9AA0"/><rect x="${2 * s}" y="${6 * s}" width="${17 * s}" height="${13 * s}" rx="2" fill="#B22234"/>${C(2 * s + 8.5 * s, 13.6 * s, title, 8, '#FFFFFF', 'text-anchor="middle" letter-spacing=".6"')}<circle cx="${21.4 * s}" cy="${9 * s}" r="${1.2 * s}" fill="#9A9AA0"/><circle cx="${21.4 * s}" cy="${14 * s}" r="${1.2 * s}" fill="#9A9AA0"/></g>`
const palm = (x: number, y: number) => `<g transform="translate(${r1(x)} ${r1(y)}) scale(1.6)"><path d="M5 22C6 15 5 8 6 3" fill="none" stroke="#8A6A42" stroke-width="2"/><path d="M6 3C2 1 -1 3 -1 6C2 3 4 3 6 3ZM6 3C10 0 13 2 13 5C10 2 8 3 6 3ZM6 3C4 -1 7 -3 9 -2C7 -1 6 1 6 3ZM6 3C3 5 2 8 3 10C4 7 5 5 6 3Z" fill="#3FA35B"/></g>`
const crate = (x: number, y: number, m: Mode) => `<g transform="translate(${r1(x)} ${r1(y)})"><rect width="60" height="40" fill="#7A5A3E" stroke="#4A3524" stroke-width="1.4"/><path d="M0 0L60 40M60 0L0 40" stroke="#4A3524" stroke-width="1.4"/><rect x="6" y="13" width="48" height="14" fill="#DDF3FF"/>${C(30, 21, 'STORAGE', 7.5, '#1A2340', 'text-anchor="middle" letter-spacing=".8"')}${C(30, 26, 'DO NOT THAW', 4.8, '#1A2340', 'text-anchor="middle" letter-spacing=".5"')}<rect x="26" y="31" width="10" height="8" rx="1" fill="${m === 'gold' ? '#D4A637' : '#C9A13B'}"/><path d="M28 31v-3a3 3 0 0 1 6 0v3" fill="none" stroke="#9A9AA0" stroke-width="1.4"/><path d="M0 0h60v5h-60z" fill="#E8F6FF" opacity=".8"/></g>`
const frostEdge = (W: number, H: number, d = 10) => `<g opacity=".8"><rect width="${W}" height="${d}" fill="#DDF3FF" opacity=".45"/><rect y="${H - d}" width="${W}" height="${d}" fill="#DDF3FF" opacity=".45"/><rect width="${d}" height="${H}" fill="#DDF3FF" opacity=".45"/><rect x="${W - d}" width="${d}" height="${H}" fill="#DDF3FF" opacity=".45"/>${Array.from({ length: Math.min(40, Math.floor(W / 24)) }, (_, i) => `<path transform="translate(${r1(unit(`fr${i}`) * W)} ${r1(i % 2 ? H - 4 - unit(`fy${i}`) * 6 : 4 + unit(`fy${i}`) * 6)})" d="M-3 0h6M0 -3v6M-2 -2l4 4M2 -2l-4 4" stroke="#FFFFFF" stroke-width=".8"/>`).join('')}</g>`
/** A silent-film intertitle: black card, a double cream rule, the words in a serif (escaped). */
export const intertitle = (cx: number, cy: number, text: string, z = 18) => {
  const w = Math.max(120, text.length * z * 0.62 + 44)
  const h = z + 22
  return `<g><rect x="${r1(cx - w / 2)}" y="${r1(cy - h / 2)}" width="${r1(w)}" height="${h}" fill="#0B0C0E"/><rect x="${r1(cx - w / 2 + 4)}" y="${r1(cy - h / 2 + 4)}" width="${r1(w - 8)}" height="${h - 8}" fill="none" stroke="#F4F1E8" stroke-width=".8"/><rect x="${r1(cx - w / 2 + 7)}" y="${r1(cy - h / 2 + 7)}" width="${r1(w - 14)}" height="${h - 14}" fill="none" stroke="#F4F1E8" stroke-width=".4" opacity=".6"/><text x="${r1(cx)}" y="${r1(cy + z * 0.36)}" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="${z}" font-style="italic" fill="#F4F1E8" letter-spacing="2">${esc(text)}</text></g>`
}
const pillar = (W: number, H: number, frac = 0.16) => `<rect width="${r1(W * frac)}" height="${H}" fill="#050505"/><rect x="${r1(W * (1 - frac))}" width="${r1(W * frac)}" height="${H}" fill="#050505"/>`
const grainDefs = (id: string) => `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="1" seed="7"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .9 0"/></filter>`
const gid = (g: Geo, s: string) => `tq${s}${g.on === 'band' ? 'b' : g.on[0]}`
const outlineDefs = (id: string, col: string) => `<filter id="${id}"><feMorphology operator="dilate" radius="1" in="SourceAlpha" result="d"/><feComposite in="d" in2="SourceAlpha" operator="out" result="o"/><feFlood flood-color="${col}"/><feComposite in2="o" operator="in"/></filter>`
const deep = (x: number, y: number) => `<g transform="translate(${r1(x)} ${r1(y)}) scale(1.6)"><rect x="2" y="9" width="12" height="7" rx="2" fill="#2E7D6B"/><circle cx="8" cy="6" r="5" fill="${PROPS.skin}"/><path d="M3 5Q3 0 8 .6Q13 0 13 5Q11 2.6 8 3Q5 2.6 3 5z" fill="#5A3B22"/><path d="M3.6 7.6l1.4 .4M3.6 8.8l1.4 .3" stroke="#B5654A" stroke-width=".5"/><rect x="5.6" y="5.6" width="1" height="1" fill="${PROPS.ink}"/><rect x="9.4" y="5.6" width="1" height="1" fill="${PROPS.ink}"/><path d="M6.6 8.6q1.4 -1 2.8 0" fill="none" stroke="#7A3B2A" stroke-width=".5"/></g>`
const baby = (x: number, y: number) => `<g transform="translate(${r1(x)} ${r1(y)}) scale(1.6)"><ellipse cx="6" cy="10" rx="5" ry="3.4" fill="#9FC6F0"/><circle cx="6" cy="5" r="4.4" fill="${PROPS.skin}"/><path d="M5 .8q1 -1.4 2 0" fill="none" stroke="${PROPS.hair}" stroke-width="1"/><rect x="3.8" y="4.4" width="1.2" height="1" fill="#FF2A2A"/><rect x="7" y="4.4" width="1.2" height="1" fill="#FF2A2A"/><path d="M4.6 7q1.4 1.2 2.8 0" fill="none" stroke="#7A3B2A" stroke-width=".5"/></g>`
const rose = (x: number, y: number) => `<g transform="translate(${r1(x)} ${r1(y)}) scale(1.6)"><path d="M3 14C3 10 4 8 5 6" fill="none" stroke="#5B7A3A" stroke-width="1"/><path d="M5 6C2 6 1 3 3 1C4 3 6 2 7 4C8 6 6 7 5 6z" fill="#8E2F3A"/><path d="M4 10l-3 -1" stroke="#5B7A3A" stroke-width="1"/></g>`
/** The seven seat emblems (eagle, star, wave, bolt, mask, flame, eye), 8 by 8. */
const EMB = ['M0 5l4-3 4 3-4-1z', 'M4 0l1.2 2.8 2.8.2-2.2 1.8.8 3-2.6-1.6-2.6 1.6.8-3L0 3l2.8-.2z', 'M0 5q2-3 4 0t4 0v2H0z', 'M5 0L1 5h3l-1 3 4-5H4z', 'M0 2q4-2 8 0v2q-4 3-8 0zM2 3h1v1H2zm3 0h1v1H5z', 'M4 0q3 3 2 6a2 2 0 0 1-4 0q-1-3 2-6z', 'M0 4q4-4 8 0q-4 4-8 0zm4-1.2a1.2 1.2 0 1 0 0 2.4a1.2 1.2 0 1 0 0-2.4z']
const emblem = (i: number, x: number, y: number, c: string, s = 1.4) => `<path transform="translate(${r1(x)} ${r1(y)}) scale(${s})" d="${EMB[i % 7]}" fill="${c}"/>`
/** A sprite with its feet at the origin (centred), at scale `s`; `flip` faces it left. */
const feet = (sp: any, s: number, flip = false) => px(sp, -(spW(sp) * s) / 2, -spH(sp) * s, s, flip ? { flip: true } : {})
const GROUND = CRAWL_Y - 1

// ---------------------------------------------------------------- the band's geometry (the slim band's own layout)
/** The task row's gauge (the syringe): where it starts and how wide (as register.tsx lays it out). */
const gaugeOf = (W: number) => {
  const rw = W < 1100 ? 62 : 100
  const r0 = W >= 520 ? W - 20 - rw * 3 : W - 14
  const segs = Math.max(0, Math.floor(((W >= 520 ? r0 - 18 : W - 14) - 20 - 64 - 44) / 6))
  return { x: 64, y: 64, w: segs * 6 - 2, r0 }
}
/** The bust in the figure slot (34 by 40 at x 20, y 36), as theboys.ts draws it. */
const bustAt = (m: Mode, s = 0.86) => ({ sp: BUST[m], x: 37 - (spW(BUST[m]) * s) / 2, y: 39, s })
const coverBust = (P: any) => `<rect x="16" y="35" width="44" height="46" fill="${P.tile}"/>`
const dim = (W: number, H: number, P: any, op = 0.6) => `<rect width="${W}" height="${H}" rx="10" fill="${P.tile}" opacity="${op}"/>`

// ---------------------------------------------------------------- the acts
export type Draw = (a: Act, g: Geo, P: any) => string
export type Row = { band: Draw; pane: [ActSurface | 'all', Draw]; shake?: Partial<Record<'band' | PaneCard | 'all', [number, string][]>> }

/** A-Train's sprint on all four frames of his run cycle (.36 s a stride, steps); reduced motion: frame 1, still. */
const runner = (a: Act, s: number) => {
  if (!a.css.includes('@keyframes tqr{')) a.css += '.tqr{opacity:0;animation:tqr .36s steps(1,end) infinite}@keyframes tqr{0%{opacity:1}25%,100%{opacity:0}}@media (prefers-reduced-motion: reduce){.tqr{animation:none!important}.tqr0{opacity:1}}'
  return [0, 1, 2, 3].map(i => `<g class="tqr${i ? '' : ' tqr0'}" style="animation-delay:-${r1(((4 - i) % 4) * 0.09)}s">${runFrame(a, i, s)}</g>`).join('')
}
/** One frame of A-Train's run, feet at the origin, cut once per Svg into the act's stage bank (`dir` -1 runs left). */
const RUN = [SP.TB_ATRAIN_RUN1, SP.TB_ATRAIN_RUN2, SP.TB_ATRAIN_RUN3, SP.TB_ATRAIN_RUN4]
const runFrame = (a: Act, i: number, s: number, dir: 1 | -1 = 1): string => {
  const sp = RUN[i] as Sprite
  if (!a.sg.bank.has(`run${i}`)) a.sg.cast(`run${i}`, sp)
  return a.sg.bank.use(`run${i}`, 0, -(sp.rows.length * s) / 2, dir, s)
}
const streak = (w: number, col: string, n = 4) => Array.from({ length: n }, (_, i) => `<rect x="${-w - 14 - i * 6}" y="${-30 + i * 7}" width="${w - i * 8}" height="1.6" rx=".8" fill="${col}" opacity="${0.85 - i * 0.15}"/>`).join('')

// ---------------------------------------------------------------- pose to pose, on the shared stage (a.sg)
/** Every stage pose is padded to PH rows, so the feet share one line whatever the pose (the engine anchors a pose at its middle). */
const PH = 54
const padPose = (sp: Sprite): Sprite => {
  const w = Math.max(...sp.rows.map(r => r.length))
  return { ...sp, rows: [...Array.from({ length: Math.max(0, PH - sp.rows.length) }, () => '.'.repeat(w)), ...sp.rows.map(r => r.padEnd(w, '.'))] }
}
/** Puts poses on the act's stage (each cut once per Svg, then a `<use>`). */
const poses = (a: Act, m: Record<string, any>): Act => {
  for (const [k, sp] of Object.entries(m)) if (!a.sg.bank.has(k)) a.sg.cast(k, padPose(sp))
  return a
}
/** A path key in FEET coordinates: act time, x, the feet's y, and a y-squash (about the feet). */
type FK = [number, number, number, number?]
/**
 * A pose-to-pose actor: `segs` say which pose shows when ([t0, t1, pose, dir]), `keys` move it (feet coordinates; k[3] squashes
 * it about its feet: .9 lands, 1.04 springs). `h` is the landing pose's height in sprite rows. Hidden under reduced motion: pair
 * it with `stillPose` for the reduced-motion frame.
 */
const actor = (a: Act, name: string, segs: [number, number, string, (1 | -1)?][], keys: FK[], sc: number, o: { ghosts?: [number, number]; trail?: [number, number, string][]; h?: number } = {}): string => {
  const half = (PH * sc) / 2
  const sq = keys.some(k => k[3] !== undefined)
  const hv = (o.h ?? 45) * sc
  const path = keys.map(([t, x, y, q]) => (sq ? [t, x, y - half + ((1 - (q ?? 1)) * hv) / 2, 0, undefined, q ?? 1] : [t, x, y - half])) as any
  return a.fx(a.sg.actor(name, segs, path, { sc, ...(o.ghosts ? { ghosts: o.ghosts } : {}), ...(o.trail ? { trail: o.trail } : {}) }))
}
/** The reduced-motion frame of a stage actor: `pose` standing at (x, feet y). Drawn only under reduced motion. */
const stillPose = (a: Act, pose: string, x: number, y: number, sc: number, dir: 1 | -1 = 1): string => `<g class="${a.sg.p}-s">${a.sg.still(pose, x, y - (PH * sc) / 2, dir, sc)}</g>`
/** A jump: keys along a parabola from (x0, y) to (x1, y), `h` px high, in `n` steps between t0 and t1 (rise eases out, fall in). */
const arc = (t0: number, t1: number, x0: number, x1: number, y: number, h: number, n = 6): FK[] =>
  Array.from({ length: n + 1 }, (_, i) => { const u = i / n; return [t0 + (t1 - t0) * u, x0 + (x1 - x0) * u, y - h * 4 * u * (1 - u)] as FK })
/** THE AMBUSH's scrim: it dims the stage strip the cast plays on (the title row, the bar row, the foot) but never the working
 *  numbers: the top row (Total, APPROVAL, ROSTER) stays above it, and the bar's percent, the step count, the right-hand readouts
 *  and the cost line are cut out of it. */
export const stageScrim = (W: number, P: any, op = 0.72): string => {
  const q = gaugeOf(W)
  const right = W >= 520 ? q.r0 - 24 : W
  const hole = (x: number, y: number, w: number, h: number) => `M${r1(x)} ${y}h${r1(w)}v${h}h${r1(-w)}z`
  return `<path fill-rule="evenodd" d="M0 46H${r1(right)}V${CRAWL_Y}H0z${hole(q.x + q.w + 2, 64, 56, 26)}${hole(64, 98, 50, 22)}${hole(W * 0.6, 96, right - W * 0.6 - 2, 38)}" fill="${P.tile}" opacity="${op}"/>`
}

/** Rows other files add (phase 3: the event eggs, the set pieces, the roamers, THE AMBUSH); `scrim` puts the band scrim behind it. */
const XROWS: Record<string, Row & { scrim?: boolean | 'stage' }> = {}
export const defineActs = (rows: Record<string, Row & { scrim?: boolean | 'stage' }>): void => { Object.assign(XROWS, rows) }
const rowOf = (kind: string): (Row & { scrim?: boolean | 'stage' }) | undefined => ROWS[kind] ?? XROWS[kind]
const ROWS: Record<string, Row> = {
  // T1 `oh, diabolical`: Butcher's bust slides in at the left and says it.
  diabolical: {
    band: (a, g, P) => {
      const s = 0.86
      const b = feet(SP.TB_BUTCHER_BUST, s)
      return a.on(coverBust(P), 0.25, 2.2) + a.mv(b, [[0, -40, 80], [0.3, 37, 80], [2.1, 37, 80], [2.5, -40, 80]], { still: 1, ease: 'cubic-bezier(.2,.9,.3,1)' }) + a.on(bub(62, 54, 'Diabolical.', g.m), 0.4, 2.3)
    },
    pane: ['task', (a, g) => a.slam(`<g transform="translate(${r1(g.W - 92)} 40)">${tape(0, -4, 120, 26, -4, 0.9)}${stamp(0, 0, 'DIABOLICAL.', PROPS.marker, 14, -6)}</g>`, 0.2, 2.3)],
  },
  // T2 `ashley, look at me` (and the first pass over 95%): the zoom, the flash, the beat drop.
  lookatme: {
    band: (a, g, P) => {
      const big = 2.1
      const sp = SP.TB_HOMELANDER_BUST
      const x = Math.max(70, g.W / 2 - 150)
      const word = g.m === 'book' ? 'LOOK AT ’IM.' : 'LOOK AT ME!'
      return a.on(dim(g.W, g.H, P, 0.82), 0.15, 2.4) + a.kf(`<g transform="translate(${r1(x)} ${r1(g.H - 8 - spH(sp) * big)})">${px(sp, 0, 0, big)}</g>`, [[0, 'opacity:0;transform:scale(.4)'], [0.2, 'opacity:0;transform:scale(.4)'], [0.55, 'opacity:1;transform:scale(1.04)'], [0.7, 'opacity:1;transform:none'], [2.3, 'opacity:1;transform:none'], [2.4, 'opacity:0']], { c: true, ease: 'cubic-bezier(.2,1.2,.3,1)' }) + a.on(`<g>${C(x + spW(sp) * big + 24, g.H / 2 + 12, word, 34, PROPS.hero, 'letter-spacing="2" stroke="#FFFFFF" stroke-width=".8"')}</g>`, 0.7, 2.35) 
    },
    pane: ['task', (a, g) => a.on(`<rect width="${g.W}" height="${g.H}" fill="${PROPS.hero}" opacity=".12"/>${cap(g.W / 2, g.H / 2 + 6, 'LOOK AT ME.', g.m, { z: 16, mid: true, red: true })}<g class="tqh"><circle cx="${r1(g.W / 2 - 14)}" cy="${r1(g.H / 2 - 22)}" r="3" fill="#FF2A2A"/><circle cx="${r1(g.W / 2 + 14)}" cy="${r1(g.H / 2 - 22)}" r="3" fill="#FF2A2A"/></g>`, 0.6, 2.4)],
    shake: { band: [[0, 'transform:none;filter:none'], [1.24, 'transform:none;filter:none'], [1.25, 'transform:translate(2px,-1px);filter:invert(1) hue-rotate(180deg)'], [1.32, 'transform:translate(-2px,1px);filter:invert(1) hue-rotate(180deg)'], [1.4, 'transform:translate(1px,0);filter:invert(1) hue-rotate(180deg)'], [1.55, 'transform:none;filter:invert(1) hue-rotate(180deg)'], [1.56, 'transform:none;filter:none'], [2.5, 'transform:none;filter:none']], task: [[0, 'transform:none'], [1.25, 'transform:translate(2px,0)'], [1.32, 'transform:translate(-2px,1px)'], [1.45, 'transform:none'], [2.5, 'transform:none']] },
  },
  // T5 `i can do whatever i want`: the band floats up 4 px, hangs, thuds; a cape flutters past.
  whatever: {
    band: (a, g) => a.mv(`<path d="M0 0q14 -6 30 0q-4 10 -2 22q-14 -4 -26 2q4 -12 -2 -24z" fill="${PROPS.hero}"/><path d="M0 0q14 -6 30 0" fill="none" stroke="#F0D27A" stroke-width="2"/>`, [[0, -40, 30, 1, 'rotate(-6deg)'], [0.7, g.W * 0.5, 18, 1, 'rotate(6deg)'], [1.5, g.W + 20, 26, 1, 'rotate(-4deg)']], { c: true }),
    pane: ['cred', (a, g) => a.mv(`<path d="M0 0q14 -6 30 0q-4 10 -2 22q-14 -4 -26 2q4 -12 -2 -24z" fill="${PROPS.hero}"/>`, [[0, -40, 40, 1, 'rotate(-6deg)'], [1.5, g.W + 20, 30, 1, 'rotate(6deg)']], { c: true }) + a.on(cap(g.W - 24 - capW('WHATEVER I WANT.'), 72, 'WHATEVER I WANT.', g.m), 0.1, 1.45)],
    shake: { band: [[0, 'transform:none'], [0.25, 'transform:translateY(-4px)'], [1.15, 'transform:translateY(-4px)'], [1.25, 'transform:translateY(1px)'], [1.32, 'transform:none'], [1.5, 'transform:none']], cred: [[0, 'transform:none'], [0.25, 'transform:translateY(-4px)'], [1.15, 'transform:translateY(-4px)'], [1.25, 'transform:translateY(1px)'], [1.32, 'transform:none'], [1.5, 'transform:none']] },
  },
  // T6 `pinocchio is stayin' put`: THE WHALE. The splat is grey-pink, never red; Hughie is wordless; the line is Butcher's.
  whale: {
    band: (a, g, P) => {
      const wx = g.W * 0.56
      const whale = `<path d="M-80 0C-60 -26 40 -32 80 -4L80 0z" fill="#5C6F86"/><path d="M-50 -14q30 -12 70 -8" fill="none" stroke="#8FA3B8" stroke-width="2"/><circle cx="52" cy="-10" r="2" fill="${PROPS.ink}"/>`
      const boat = `<path d="M-14 0h26l6 -8h-34z" fill="#F4F1E8"/><rect x="-6" y="-14" width="10" height="6" fill="#B9C3D0"/><path d="M-22 -2h-16" stroke="#DDF3FF" stroke-width="1.5"/>`
      const splat = `<g>${[[0, 0, 16], [-16, 4, 9], [16, 3, 10], [-6, -12, 8], [9, -11, 7], [24, -6, 5], [-24, -6, 5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${(x as number) % 2 ? '#C9A7AE' : '#B8969E'}"/>`).join('')}</g>`
      const hughie = `<g>${px(SP.TB_HUGHIE_BUST, -15, -22, 0.9, { rows: [0, 24] })}</g>`
      return a.on(dim(g.W, g.H, P, 0.55), 0.1, 4.4, { fade: 0.3 }) + a.mv(whale, [[0, wx, GROUND + 30], [0.6, wx, GROUND + 30], [1.2, wx, GROUND], [4.5, wx, GROUND]], { still: 3 }) + a.mv(boat, [[0, -40, GROUND - 4], [1.2, -40, GROUND - 4], [2.0, wx - 70, GROUND - 6], [4.5, wx - 70, GROUND - 6]], { still: 2, ease: 'cubic-bezier(.5,0,1,1)' }) + a.kf(`<g transform="translate(${r1(wx - 60)} ${GROUND - 24})">${splat}</g>`, [[0, 'opacity:0;transform:scale(.2)'], [2.0, 'opacity:0;transform:scale(.2)'], [2.15, 'opacity:1;transform:scale(1.15)'], [2.4, 'opacity:1;transform:none'], [3.6, 'opacity:1'], [4.2, 'opacity:0']], { c: true }) + a.on(`<g transform="translate(${r1(wx - 60)} ${GROUND - 30})">${hughie}</g>`, 2.4, 4.4, { still: true }) + a.on(`<g transform="translate(${r1(wx - 60)} ${GROUND - 30})"><rect x="-6" y="-12" width="12" height="2.4" fill="${PROPS.skin}"/></g>`, 3.1, 3.25, { still: false }) + a.mv(feet(SP.TB_BUTCHER_BUST, 0.7), [[0, 30, 160], [2.6, 30, 160], [2.9, 40, 82], [4.5, 40, 82]], { still: 3 }) + a.on(bub(62, 60, 'Pinocchio is stayin’ put.', g.m), 2.95, 4.4)
    },
    pane: ['task', (a, g) => a.mv(`<g transform="rotate(-3)"><rect width="250" height="40" fill="${PROPS.paper}" stroke="#C9C2B0"/>${C(8, 13, 'FOR IMMEDIATE RELEASE', 7.5, PROPS.paperInk, 'letter-spacing="1"')}${T(8, 30, 'A marine misunderstanding.', 11, 700, PROPS.paperInk)}${stamp(212, 22, 'CONTAINED', PROPS.stamp, 9, -10)}</g>`, [[0, g.W + 10, 14], [0.6, g.W + 10, 14], [1.0, g.W - 266, 14], [4.5, g.W - 266, 14]], { still: 2, ease: 'cubic-bezier(.2,.9,.3,1)' })],
  },
  // T7 `timothy the octopus`: In Memoriam. He swims across, then the plaque; the Deep (drawn) wipes a tear.
  timothy: {
    band: (a, g) => a.mv(`<g class="tqb">${octo(0, -16)}</g>`, [[0, -30, GROUND], [3, g.W + 10, GROUND - 6]], { still: 0 }) + a.on(cap(g.W / 2, 124, 'IN MEMORIAM · TIMOTHY', g.m, { mid: true }), 0.8, 2.9),
    pane: ['task', (a, g, P) => {
      const plaque = `<rect x="${r1(g.W / 2 - 110)}" y="${r1(g.H / 2 - 30)}" width="220" height="60" rx="3" fill="#0B0C10" stroke="${P.a}"/>${C(g.W / 2, g.H / 2 - 10, 'IN MEMORIAM', 9.5, '#C9C2B0', 'text-anchor="middle" letter-spacing="2"')}${T(g.W / 2, g.H / 2 + 10, 'Timothy', 16, 700, '#FFFFFF', 'text-anchor="middle" font-style="italic"')}${octo(g.W / 2 - 92, g.H / 2 - 8, 1.4)}`
      const tear = `<circle cx="0" cy="0" r="1.6" fill="#9FDBFF"/>`
      return a.mv(`<g class="tqb">${octo(0, 0)}</g>`, [[0, -30, 40], [1.4, g.W + 10, 30]], { still: 0 }) + a.on(plaque, 1.2, 3) + a.on(deep(g.W / 2 + 120, g.H / 2 - 10), 1.4, 3) + a.mv(tear, [[0, g.W / 2 + 132, g.H / 2 + 2, 0], [1.8, g.W / 2 + 132, g.H / 2 + 2, 1], [2.6, g.W / 2 + 132, g.H / 2 + 12, 0], [3, g.W / 2 + 132, g.H / 2 + 12, 0]], { still: 1 })
    }],
  },
  // T8 `vought on ice`: the band frosts, two skaters glide under spotlights, one spin, the marquee.
  ice: {
    band: (a, g) => {
      const sk = (sp: any, d: number) => a.mv(feet(sp, 0.82), [[0, -30, GROUND, 1], [0.4 + d, -30, GROUND, 1], [2.0 + d, g.W * 0.48 + d * 60, GROUND, 1, 'rotate(-4deg)'], [2.4 + d, g.W * 0.5 + d * 60, GROUND, 1, 'scaleX(-1)'], [2.7 + d, g.W * 0.52 + d * 60, GROUND, 1], [4, g.W + 30, GROUND, 1]], { still: 2, c: true })
      return a.on(`<rect width="${g.W}" height="${g.H}" rx="10" fill="#DDF3FF" opacity=".16"/>${frostEdge(g.W, g.H, 6)}`, 0, 4, { fade: 0.4 }) + a.on(cone(g.W * 0.3, 0, GROUND, 90) + cone(g.W * 0.66, 0, GROUND, 90), 0.4, 3.8, { fade: 0.3 }) + sk(SP.TB_HOMELANDER_HOVER, 0) + sk(SP.TB_STARLIGHT, 0.35) + a.on(cap(g.W / 2, 26, 'VOUGHT ON ICE', g.m, { z: 12, mid: true }), 0.6, 3.9)
    },
    pane: ['cred', (a, g) => a.on(`<rect width="${g.W}" height="${g.H}" fill="#DDF3FF" opacity=".12"/>${frostEdge(g.W, g.H, 8)}${cap(g.W / 2, g.H - 14, 'VOUGHT ON ICE · TONIGHT', g.m, { mid: true })}`, 0, 4, { fade: 0.5 })],
  },
  // T9 `laser baby`: blinks at the band wall; scorch dots cool and fade; a giggle.
  laserbaby: {
    band: (a, g) => {
      const y = GROUND - 12
      let s = a.on(baby(26, GROUND - 22), 0, 2.5)
      for (const [i, t] of [0.4, 1.0, 1.6].entries()) {
        const hx = g.W - 40 - i * 120
        s += a.on(`<path d="M44 ${y - 4}L${hx} ${y - 18 - i * 6}M48 ${y - 4}L${hx} ${y - 16 - i * 6}" stroke="#FF2A2A" stroke-width="2"/><path d="M44 ${y - 4}L${hx} ${y - 18 - i * 6}" stroke="#FF8A7A" stroke-width="4" opacity=".35"/>`, t, t + 0.18, { still: false })
        s += a.kf(`<circle cx="${r1(hx)}" cy="${y - 17 - i * 6}" r="3.4"/>`, [[0, 'opacity:0;fill:#FF2A2A'], [t + 0.15, 'opacity:0;fill:#FF2A2A'], [t + 0.18, 'opacity:1;fill:#FF2A2A'], [t + 0.6, 'opacity:1;fill:#FF8A3A'], [t + 1.2, 'opacity:.7;fill:#6B6B6B'], [2.5, 'opacity:0;fill:#6B6B6B']], { still: 'opacity="0"' })
      }
      return s + a.on(T(52, GROUND - 30, 'hee hee!', 11, 700, '#FFFFFF', 'font-style="italic"'), 1.9, 2.5)
    },
    pane: ['log', (a, g) => {
      let s = ''
      for (let i = 0; i < 5; i++) s += a.kf(`<circle cx="${r1(40 + unit(`lb${i}`) * (g.W - 80))}" cy="${r1(30 + unit(`lby${i}`) * (g.H - 60))}" r="4"/>`, [[0, 'opacity:0;fill:#FF2A2A'], [0.3 + i * 0.25, 'opacity:0;fill:#FF2A2A'], [0.32 + i * 0.25, 'opacity:1;fill:#FF2A2A'], [1 + i * 0.25, 'opacity:1;fill:#FF8A3A'], [2.4, 'opacity:.6;fill:#6B6B6B']], { still: 'opacity="0"' })
      return s + a.slam(stamp(g.W - 100, 36, 'LASER BABY · CONTAINED', PROPS.stamp, 10, -6), 1.2, 2.45)
    }],
  },
  // T10 `mon cœur`: Kimiko and Frenchie tap on the foot, spin, a heart.
  dance: {
    band: (a, g) => {
      const x = g.W * 0.42
      const one = (sp: any, dx: number, flip: boolean) => a.kf(`<g transform="translate(${r1(x + dx)} ${GROUND})"><g class="tqb">${feet(sp, 0.84, flip)}</g></g>`, [[0, 'opacity:0'], [0.2, 'opacity:1;transform:none'], [1.4, 'transform:none'], [1.7, 'transform:scaleX(-1)'], [2.0, 'transform:none'], [3.3, 'opacity:1'], [3.5, 'opacity:0']], { c: true })
      return one(SP.TB_KIMIKO, -14, false) + one(SP.TB_FRENCHIE, 14, true) + a.kf(heart(x - 7, GROUND - 58, 1.4), [[0, 'opacity:0;transform:scale(.2)'], [2.1, 'opacity:0;transform:scale(.2)'], [2.3, 'opacity:1;transform:scale(1.3)'], [2.5, 'opacity:1;transform:none'], [3.4, 'opacity:0;transform:translateY(-8px)']], { c: true }) + a.on(cap(x + 40, GROUND - 40, 'MON CŒUR.', g.m), 2.2, 3.4)
    },
    pane: ['log', (a, g) => {
      const y = g.H * 0.55
      const d = `M16 ${r1(y)}H${r1(g.W * 0.4)}l8 -22 8 40 8 -30 6 12H${r1(g.W - 16)}`
      const L = Math.round(g.W * 1.6)
      return a.kf(`<path d="${d}" fill="none" stroke="#E8455A" stroke-width="2.2" stroke-dasharray="${L}"/>`, [[0, `stroke-dashoffset:${L};opacity:1`], [1.8, 'stroke-dashoffset:0'], [3.3, 'opacity:1'], [3.5, 'opacity:0;stroke-dashoffset:0']], {}) + a.kf(heart(g.W * 0.4 + 10, y - 40, 1.6), [[0, 'opacity:0'], [1.6, 'opacity:0'], [1.8, 'opacity:1'], [3.4, 'opacity:1'], [3.5, 'opacity:0']], { c: true })
    }],
  },
  // T11 `buster beaver`: the band dims, Noir sits in the corner, the beaver and two pals bounce in; a thumbs-up.
  beaver: {
    band: (a, g) => {
      const nx = g.W - 90
      const hop = (svg: string, x: number, d: number) => a.mv(svg, [[0, -40, GROUND - 26], [0.5 + d, -40, GROUND - 26], [1.1 + d, x, GROUND - 26], [1.3 + d, x, GROUND - 40], [1.5 + d, x, GROUND - 26], [1.7 + d, x, GROUND - 38], [1.9 + d, x, GROUND - 26], [3.5, x, GROUND - 26]], { still: 2 })
      return a.on(`<rect width="${g.W}" height="${g.H}" rx="10" fill="#050608" opacity=".72"/>`, 0, 3.5, { fade: 0.3 }) + a.on(`<g transform="translate(${nx} ${GROUND})">${feet(SP.TB_NOIR, 0.82)}</g>`, 0.2, 2.5) + a.on(`<g transform="translate(${nx} ${GROUND})">${feet(SP.TB_NOIR_THUMBSUP, 0.82)}</g>`, 2.5, 3.5) + hop(beaver(0, 0), g.W * 0.4, 0) + hop(critter(0, 10, '#E8A33A'), g.W * 0.4 + 40, 0.15) + hop(critter(0, 10, '#6FB7E8'), g.W * 0.4 - 32, 0.3) + a.on(cap(g.W * 0.4 - 40, 30, 'BUSTER BEAVER’S PALS', g.m), 1.2, 3.4)
    },
    pane: ['task', (a, g) => a.mv(beaver(0, 0), [[0, g.W - 50, g.H + 4], [0.6, g.W - 50, g.H - 30], [2.8, g.W - 50, g.H - 30], [3.5, g.W - 50, g.H + 4]], { still: 1 }) + a.on(`<g transform="translate(${g.W - 84} ${g.H - 6})">${feet(SP.TB_NOIR_THUMBSUP, 0.6)}</g>`, 1.4, 3.3)],
  },
  // T12 `seen the memes`: a 3-tile meme grid of the bust's faces, captioned ME.
  memes: {
    band: (a, g, P) => {
      const tiles = ([70, 40, 15] as const).map((n, i) => `<g transform="translate(${18 + i * 36} 38)"><rect width="33" height="33" fill="#F4F1E8" stroke="${PROPS.ink}"/><g transform="translate(2 2) scale(2.9)">${faceIcon(0, 0, n, true)}</g></g>`).join('')
      return a.kf(`<g>${tiles}${C(70, 84, g.m === 'book' ? 'HIM.' : 'ME.', 11, '#FFFFFF', 'text-anchor="middle" letter-spacing="2" stroke="#000" stroke-width=".4"')}</g>`, [[0, 'opacity:0;transform:scale(.6)'], [0.15, 'opacity:1;transform:scale(1.05)'], [0.3, 'transform:none'], [1.85, 'opacity:1'], [2, 'opacity:0']], { c: true }) + a.on(`<rect x="16" y="76" width="108" height="12" fill="${P.tile}"/>`, 0.15, 1.95)
    },
    pane: ['cred', (a, g) => a.on(`<g transform="translate(${r1(g.W - 140)} 44)">${([70, 40, 15] as const).map((n, i) => `<g transform="translate(${i * 40} 0)"><rect width="36" height="36" fill="#F4F1E8" stroke="${PROPS.ink}"/><g transform="translate(3 3) scale(3)">${faceIcon(0, 0, n, true)}</g></g>`).join('')}</g>${cap(g.W - 140, 100, 'SEEN THE MEMES?', g.m)}`, 0.1, 1.95)],
  },
  // T13 `billy joel`: Hughie walks the foot in headphones; notes, a piano plink. No lyrics.
  joel: {
    band: (a, g) => {
      const phones = `<path d="M-7 -40a7 7 0 0 1 14 0" fill="none" stroke="#1A1C22" stroke-width="2"/><rect x="-9" y="-41" width="3.4" height="5" rx="1" fill="#C2362F"/><rect x="5.6" y="-41" width="3.4" height="5" rx="1" fill="#C2362F"/>`
      let s = a.mv(`<g class="tqb">${feet(SP.TB_HUGHIE_WALK, 0.86)}${phones}</g>`, [[0, -30, GROUND], [4, g.W + 30, GROUND]], { still: 0 })
      for (let i = 0; i < 4; i++) s += a.mv(note(0, 0, i % 2 ? '#F0D27A' : '#FFFFFF'), [[0, 0, 0, 0], [0.4 + i * 0.8, g.W * (0.12 + i * 0.2), GROUND - 46, 0], [0.5 + i * 0.8, g.W * (0.12 + i * 0.2), GROUND - 50, 1], [1.5 + i * 0.8, g.W * (0.12 + i * 0.2) + 10, GROUND - 82, 0], [4, 0, 0, 0]], { still: 2 })
      return s + a.on(T(g.W * 0.5, 30, 'plink.', 11, 700, '#FFFFFF', 'font-style="italic"'), 1.6, 2.2) + a.on(cap(g.W - 200, 30, 'PIANO HOUR', g.m), 0.3, 3.8)
    },
    pane: ['log', (a, g) => {
      let s = ''
      for (let i = 0; i < 5; i++) s += a.mv(note(0, 0, '#F0D27A'), [[0, 0, 0, 0], [0.3 + i * 0.6, 30 + i * ((g.W - 60) / 5), g.H - 20, 0], [0.4 + i * 0.6, 30 + i * ((g.W - 60) / 5), g.H - 24, 1], [1.6 + i * 0.6, 40 + i * ((g.W - 60) / 5), 20, 0], [4, 0, 0, 0]], { still: 2 })
      return s + a.on(cap(44, 60, 'NOW PLAYING · PIANO HOUR', g.m), 0.2, 3.8)
    }],
  },
  // T16 `tall glass of milk`: the bust sips; a milk moustache for 2 s; the corner glass refills.
  milk: {
    band: (a, g, P) => {
      const b = bustAt(g.m)
      return a.mv(glass(0, 0, 1.3), [[0, 30, 100, 0], [0.3, 30, 88, 1], [0.7, 38, 46, 1, 'rotate(-30deg)'], [1.1, 38, 46, 1, 'rotate(-30deg)'], [1.4, 30, 100, 0], [3, 30, 100, 0]], { still: 2, c: true }) + a.on(`<rect x="${r1(b.x + 20 * b.s)}" y="${r1(b.y + 13.5 * b.s)}" width="${r1(10 * b.s)}" height="${r1(2.2 * b.s)}" rx="1" fill="${PROPS.milk}"/>`, 1.0, 3) + a.on(`<rect x="${g.W - 36}" y="110" width="15" height="16" fill="${P.tile}"/>${glass(g.W - 33, 112, 1, 1)}`, 1.2, 3) + a.on(cap(64, 30, 'A TALL GLASS. FOR THE BRAND.', g.m), 0.9, 2.9)
    },
    pane: ['cred', (a, g) => a.mv(glass(0, 0, 3.2), [[0, g.W - 60, g.H + 10], [0.4, g.W - 60, g.H - 70], [2.6, g.W - 60, g.H - 70], [3, g.W - 60, g.H + 10]], { still: 1 }) + a.on(cap(g.W - 230, g.H - 22, 'APPROVED: ONE TALL GLASS', g.m), 0.4, 2.8)],
  },
  // T17 `compound v`: the syringe fills in one push; the bust's eyes glow; the talking points pulse blue.
  compoundv: {
    band: (a, g) => {
      const q = gaugeOf(g.W)
      const bw = Math.max(20, q.w - 22)
      const b = bustAt(g.m)
      return a.kf(`<rect x="${q.x + 13}" y="${q.y}" width="${r1(bw - 2)}" height="7" rx="1.4" fill="${PROPS.vblue}"/>`, [[0, 'opacity:1;transform:scaleX(0)'], [0.1, 'transform:scaleX(0)'], [0.6, 'transform:none'], [1.8, 'opacity:1'], [2, 'opacity:0']], { ease: 'cubic-bezier(.5,0,.2,1)', origin: `${q.x + 13}px 0`, still: 'opacity="0"' }) + a.on(`<g><rect x="${r1(b.x + 21 * b.s - 1)}" y="${r1(b.y + 9 * b.s - 1)}" width="${r1(3 * b.s + 2)}" height="3" fill="#9FE6FF"/><rect x="${r1(b.x + 26 * b.s - 1)}" y="${r1(b.y + 9 * b.s - 1)}" width="${r1(3 * b.s + 2)}" height="3" fill="#9FE6FF"/></g>`, 0.6, 1.6, { still: false }) + a.on(vial(q.x + q.w + 6, 40, 1.2), 0.1, 1.9)
    },
    pane: ['task', (a, g) => a.kf(`<rect x="10" y="40" width="${g.W - 20}" height="${Math.max(20, g.H - 90)}" rx="4" fill="${PROPS.vblue}"/>`, [[0, 'opacity:0'], [0.2, 'opacity:.22'], [0.6, 'opacity:.06'], [1, 'opacity:.22'], [1.4, 'opacity:.06'], [2, 'opacity:0']], { still: 'opacity="0"' }) + a.on(`${vial(g.W - 40, 16, 1.6)}${cap(g.W - 60 - capW('DOSE APPROVED'), 36, 'DOSE APPROVED', g.m)}`, 0.1, 1.9)],
  },
  // T18 `hughie, blink`: a blue poof, gone; he lands on the far side behind a CENSORED bar, hands up; a shoe lands late.
  blink: {
    band: (a, g) => {
      const x1 = g.W - 150
      return a.on(`<g transform="translate(110 ${GROUND})">${feet(SP.TB_HUGHIE, 0.86)}</g>`, 0, 0.42) + a.kf(poof(110, GROUND - 22), [[0, 'opacity:0;transform:scale(.3)'], [0.4, 'opacity:1;transform:scale(1.2)'], [0.7, 'opacity:0;transform:scale(1.6)'], [2.5, 'opacity:0']], { c: true, still: 'opacity="0"' }) + a.kf(poof(x1, GROUND - 22), [[0, 'opacity:0'], [0.85, 'opacity:0;transform:scale(.3)'], [0.95, 'opacity:1;transform:scale(1.2)'], [1.3, 'opacity:0;transform:scale(1.6)'], [2.5, 'opacity:0']], { c: true, still: 'opacity="0"' }) + a.on(`<g transform="translate(${x1} ${GROUND})">${feet(SP.TB_HUGHIE_BLINK, 0.86)}</g>${censor(x1 - 24, GROUND - 26)}`, 0.95, 2.45) + a.mv(`<path d="M0 0h9l2 3h-11z" fill="#3A2A1E"/>`, [[0, x1 + 20, -10], [1.6, x1 + 20, -10], [2.0, x1 + 20, GROUND - 3], [2.5, x1 + 20, GROUND - 3]], { still: 3, ease: 'cubic-bezier(.5,0,1,1)' })
    },
    pane: ['task', (a, g) => a.kf(poof(g.W - 60, g.H - 34), [[0, 'opacity:0'], [0.9, 'opacity:0;transform:scale(.3)'], [1.0, 'opacity:1;transform:scale(1.2)'], [1.3, 'opacity:0'], [2.5, 'opacity:0']], { c: true, still: 'opacity="0"' }) + a.on(`<g transform="translate(${g.W - 60} ${g.H - 6})">${feet(SP.TB_HUGHIE_BLINK, 1)}</g>${censor(g.W - 84, g.H - 34)}`, 1.0, 2.45)],
  },
  // T19 `turbo rush`: A-Train sprints the foot with a green streak; a can rolls; the foot streak runs 10 s (state).
  turbo: {
    band: (a, g) => a.mv(`${streak(70, '#3DDC84')}${runner(a, 0.86)}`, [[0, -40, GROUND], [0.2, -40, GROUND], [1.2, g.W + 60, GROUND], [10, g.W + 60, GROUND]], { still: 1 }) + a.mv(can(-5, -8), [[0, g.W * 0.3, GROUND - 16, 0], [0.6, g.W * 0.3, GROUND - 16, 1, 'rotate(0deg)'], [2.6, g.W * 0.55, GROUND - 16, 1, 'rotate(540deg)'], [9.6, g.W * 0.55, GROUND - 16, 1, 'rotate(540deg)'], [10, g.W * 0.55, GROUND - 16, 0]], { still: 2, c: true, ease: 'cubic-bezier(.2,.8,.3,1)' }) + a.on(cap(g.W * 0.3, 30, 'TURBO RUSH', g.m), 1.0, 4),
    pane: ['log', (a, g) => a.mv(`<rect x="-${g.W}" y="-1" width="${g.W}" height="2" fill="#3DDC84"/>${streak(60, '#3DDC84', 3)}`, [[0, 0, g.H / 2], [0.3, 0, g.H / 2], [1.2, g.W + 20, g.H / 2], [10, g.W + 20, g.H / 2]], { still: 2 }) + a.on(`${can(g.W - 44, 46, 2)}${cap(g.W - 60 - capW('TURBO RUSH'), 64, 'TURBO RUSH', g.m)}`, 0.6, 5)],
  },
  // T20 `training a-train`: the slate (PHASE 7), A-Train jogs in place, a whistle.
  training: {
    band: (a, g) => {
      const x = Math.max(160, g.W * 0.32)
      return a.on(clapSlate(a, x, 34, 'TRAINING A-TRAIN', 'PHASE 7 · TAKE 1', 0.35), 0, 3) + a.mv(`<g class="tqf1">${feet(SP.TB_ATRAIN_RUN3, 0.84)}</g><g class="tqf2">${feet(SP.TB_ATRAIN_RUN4, 0.84)}</g>`, [[0, x - 30, GROUND, 0], [0.2, x - 30, GROUND, 1], [2.8, x - 30, GROUND, 1], [3, x - 30, GROUND, 0]], { still: 1 }) + a.on(T(x + slateW('TRAINING A-TRAIN', 'PHASE 7 · TAKE 1') + 12, 52, 'fweet!', 12, 700, '#FFFFFF', 'font-style="italic"'), 1.4, 2.2)
    },
    pane: ['cred', (a, g) => a.slam(stamp(g.W - 100, 40, 'PHASE 7 · NOW CASTING', g.m === 'book' ? PROPS.marker : '#C9A13B', 11, -6), 0.2, 2.9)],
  },
  // T21 `brave maeve`: the Vought pop-up ad (three boxes on a shelf).
  bravemaeve: {
    band: (a, g) => a.mv(`<rect width="190" height="54" rx="3" fill="#F4F1E8" stroke="#C9A13B"/>${C(8, 13, 'BRAVE MAEVE™ · LIMITED TIME', 8.5, PROPS.paperInk, 'letter-spacing=".8"')}${box(10, 20, '#B22234', 'LASAGNA')}${box(70, 20, '#1E88C8', 'LUNCHBOX')}${box(130, 20, '#C9A13B', 'BAR')}`, [[0, g.W + 10, 40], [0.4, g.W - 210, 40], [4.6, g.W - 210, 40], [5, g.W + 10, 40]], { still: 2, ease: 'cubic-bezier(.2,.9,.3,1)' }),
    pane: ['cred', (a, g) => a.mv(`<rect width="250" height="96" rx="4" fill="#F4F1E8" stroke="#C9A13B" stroke-width="1.4"/><rect y="0" width="250" height="4" fill="url(#tqrb)"/><defs><linearGradient id="tqrb"><stop offset="0" stop-color="#E8455A"/><stop offset=".33" stop-color="#F0D27A"/><stop offset=".66" stop-color="#3FA35B"/><stop offset="1" stop-color="#4F7FE0"/></linearGradient></defs>${C(10, 20, 'BRAVE MAEVE™', 12, PROPS.paperInk, 'letter-spacing="1"')}${box(14, 28, '#B22234', 'LASAGNA', 1.4)}${box(94, 28, '#1E88C8', 'LUNCHBOX', 1.4)}${box(174, 28, '#C9A13B', 'ENERGY BAR', 1.4)}${C(125, 90, 'CORPORATE ALLYSHIP · LIMITED TIME', 8, '#7A3B2A', 'text-anchor="middle" letter-spacing=".8"')}`, [[0, g.W + 10, 30], [0.5, g.W - 266, 30], [4.6, g.W - 266, 30], [5, g.W + 10, 30]], { still: 2, ease: 'cubic-bezier(.2,.9,.3,1)' })],
  },
  // T22 `seven on 7`: the band becomes a VNN desk: lower-third and seven headlines flipping fast.
  sevenon7: {
    band: (a, g) => {
      const x = 14
      const y = 102
      const w = g.W - 28
      const cid = gid(g, 's7')
      // The lower-third whips in from the left, the red tab slams with a spark, a LIVE dot blinks, and seven headlines roll up
      // through the slot (in from below, settle, out above), the way a news desk turns its crawl over.
      let s = a.kf(`<rect x="${x}" y="${y}" width="${r1(w)}" height="26" fill="#0B1020" opacity=".94"/>`, [[0, 'transform:scaleX(0)'], [0.05, 'transform:scaleX(0)'], [0.4, 'transform:none'], [5.6, 'transform:none'], [5.9, 'transform:scaleX(0)'], [6, 'transform:scaleX(0)']], { ease: ease('whip'), origin: `${x}px 0` })
      s += a.slam(`<rect x="${x}" y="${y}" width="98" height="26" fill="${PROPS.hero}"/>${C(x + 8, y + 18, 'SEVEN ON 7', 12, '#FFFFFF', 'letter-spacing="1.2"')}`, 0.3, 5.7)
      s += a.on(`<g class="tqf1"><circle cx="${r1(x + w - 44)}" cy="${y + 13}" r="3" fill="#FF3B3B"/></g>${C(x + w - 36, y + 17, 'LIVE', 9, '#FFFFFF', 'letter-spacing="1"')}`, 0.5, 5.6)
      let lines = ''
      for (let i = 0; i < 7; i++) {
        const t0 = 0.55 + i * 0.72
        lines += a.mv(T(x + 110, y + 17.5, clip(VNN_BRAND[(i * 9) % VNN_BRAND.length] as string, 11, g.W - 220, 0, true), 11, 700, '#FFFFFF'), [[0, 0, 24, 0], [t0, 0, 24, 1], [t0 + 0.2, 0, 0, 1], [t0 + 0.58, 0, 0, 1], [t0 + 0.72, 0, -24, 1], [6, 0, -24, 0]], { still: i === 0 ? 2 : 0, ease: ease('settle') })
      }
      s += `<defs><clipPath id="${cid}"><rect x="${x + 102}" y="${y}" width="${r1(w - 160)}" height="26"/></clipPath></defs><g clip-path="url(#${cid})">${lines}</g>`
      return s + a.fx(fx.sparks(a.sg, 0.52, x + 98, y + 13, { seed: 's7', color: '#F0D27A' }) + fx.ring(a.sg, 0.52, x + 49, y + 26, { rx: 40, color: '#F0D27A', w: 1.4 }))
    },
    pane: ['log', (a, g) => a.slam(`<rect x="44" y="46" width="112" height="18" rx="2" fill="${PROPS.hero}"/>${C(52, 59, 'SEVEN ON 7 · LIVE', 9.5, '#FFFFFF', 'letter-spacing="1"')}`, 0.15, 5.8) + a.on(`<g class="tqf1"><circle cx="164" cy="55" r="3" fill="${PROPS.hero}"/></g>`, 0.4, 5.8) + a.fx(fx.sparks(a.sg, 0.37, 156, 55, { seed: 's7p', color: '#F0D27A' }))],
  },
  // T23 `dawn of the seven`: THE PREMIERE now: the carpet, the flashbulbs, the stare, the marquee.
  premiere: {
    band: (a, g, P) => {
      let s = a.on(dim(g.W, g.H, P, 0.7), 0, 6, { fade: 0.3 }) + a.kf(`<rect x="14" y="${GROUND - 6}" width="${g.W - 28}" height="7" fill="#B22234"/>`, [[0, 'transform:scaleX(0)'], [0.2, 'transform:scaleX(0)'], [1.0, 'transform:none'], [6, 'transform:none']], { origin: '14px 0' })
      for (let i = 0; i < 7; i++) s += `<rect x="${r1(30 + i * ((g.W - 60) / 6))}" y="${GROUND - 20}" width="3" height="14" fill="#C9A13B"/>`
      for (let i = 0; i < 6; i++) s += a.on(flashbulb(60 + unit(`pf${i}`) * (g.W - 120), 20 + unit(`pfy${i}`) * 60), 1 + i * 0.6, 1.15 + i * 0.6, { still: false })
      return s + a.on(`<g transform="translate(${r1(g.W / 2 - 24)} 32)">${px(SP.TB_HOMELANDER_BUST, 0, 0, 1.6)}</g>`, 0.8, 5.8) + a.on(cap(g.W / 2 + 54, 56, 'DAWN OF THE SEVEN · PREMIERE', g.m, { z: 12 }), 0.8, 5.8)
    },
    pane: ['task', (a, g) => {
      let s = a.on(`<rect x="10" y="${g.H - 14}" width="${g.W - 20}" height="6" fill="#B22234"/>${Array.from({ length: 6 }, (_, i) => `<rect x="${r1(20 + i * ((g.W - 40) / 5))}" y="${g.H - 28}" width="3" height="14" fill="#C9A13B"/><path d="M${r1(21.5 + i * ((g.W - 40) / 5))} ${g.H - 26}q${r1((g.W - 40) / 10)} 8 ${r1((g.W - 40) / 5)} 0" fill="none" stroke="#B22234" stroke-width="1.6"/>`).join('')}`, 0, 6)
      for (let i = 0; i < 6; i++) s += a.on(flashbulb(40 + unit(`qf${i}`) * (g.W - 80), 20 + unit(`qfy${i}`) * (g.H - 60)), 0.6 + i * 0.7, 0.75 + i * 0.7, { still: false })
      return s
    }],
  },
  // T24 `fun cut`: 4:3 pillarbox bars, grain, the RE-RE-RELEASE slate; the pane gets the same bars.
  funcut: {
    band: (a, g) => {
      const id = gid(g, 'gr')
      const pw = r1(g.W * 0.16)
      // The 4:3 bars close in from the sides (snap), the grain comes up, the slate drops in (overshoot), CLAPS, and is yanked away.
      const bar = (right: boolean) => a.kf(`<rect x="${right ? r1(g.W - pw) : 0}" width="${pw}" height="${g.H}" fill="#050505"/>`, [[0, `transform:translateX(${right ? '' : '-'}${pw}px)`], [0.05, `transform:translateX(${right ? '' : '-'}${pw}px)`], [0.42, 'transform:none'], [7.6, 'transform:none'], [8, `transform:translateX(${right ? '' : '-'}${pw}px)`]], { ease: ease('snap') })
      const sx = Math.max(16, g.W * 0.16 + 10)
      const sl = clapSlate(a, sx, 38, 'DAWN OF THE SEVEN', 'RE-RE-RELEASE · FUN CUT · +2 HRS', 1.2)
      return bar(false) + bar(true) + a.on(`<defs>${grainDefs(id)}</defs><rect width="${g.W}" height="${g.H}" filter="url(#${id})" opacity=".08"/>`, 0.3, 8) + a.mv(sl, [[0, 0, -96], [0.45, 0, -96], [0.85, 0, 0], [2.9, 0, 0], [3.0, 0, 6], [3.3, 0, -96], [8, 0, -96]], { still: 2, ease: ease('overshoot') })
    },
    pane: ['all', (a, g) => {
      const id = gid(g, 'gr')
      const pw = r1(g.W * 0.1)
      const bar = (right: boolean) => a.kf(`<rect x="${right ? r1(g.W - pw) : 0}" width="${pw}" height="${g.H}" fill="#050505"/>`, [[0, `transform:translateX(${right ? '' : '-'}${pw}px)`], [0.1, `transform:translateX(${right ? '' : '-'}${pw}px)`], [0.5, 'transform:none'], [7.6, 'transform:none'], [8, `transform:translateX(${right ? '' : '-'}${pw}px)`]], { ease: ease('snap') })
      return bar(false) + bar(true) + a.on(`<defs>${grainDefs(id)}</defs><rect width="${g.W}" height="${g.H}" filter="url(#${id})" opacity=".06"/>${g.on === 'task' ? C(g.W / 2, g.H - 10, 'FUN CUT · +2 HRS', 9, '#FFFFFF', 'text-anchor="middle" letter-spacing="2"') : ''}`, 0.4, 8)
    }],
    shake: { band: [[0, 'filter:grayscale(1) contrast(1.15)'], [8, 'filter:grayscale(1) contrast(1.15)']], all: [[0, 'filter:grayscale(1) contrast(1.1)'], [8, 'filter:grayscale(1) contrast(1.1)']] },
  },
  // T25 `invisible force`: the bust fades to a shimmer outline; the poster with its tagline.
  invisible: {
    band: (a, g, P) => {
      const b = bustAt(g.m)
      const id = gid(g, 'ol')
      const tag = '“You can’t kill what you can’t see.”'
      // A light bar wipes down the bust and takes it with it (a shimmer outline is all that is left), the poster drops in, and a
      // line of footprints walks off along the foot: someone nobody can see, kicking up dust.
      let s = a.on(coverBust(P), 0.6, 3.9, { fade: 0.4 }) + a.on(`<defs>${outlineDefs(id, '#DDE8F2')}</defs><g filter="url(#${id})" class="tb-pulse">${px(b.sp, b.x, b.y, b.s)}</g>`, 1.0, 3.9)
      s += a.kf(`<rect x="14" y="34" width="46" height="3" fill="#FFFFFF" opacity=".85"/>`, [[0, 'opacity:0;transform:none'], [0.45, 'opacity:0;transform:none'], [0.5, 'opacity:1;transform:none'], [1.0, 'opacity:1;transform:translateY(46px)'], [1.05, 'opacity:0;transform:translateY(46px)'], [4, 'opacity:0']], { ease: ease('settle'), still: 'opacity="0"' })
      s += a.mv(`<rect width="${sansW(tag, 10.5) + 20}" height="50" rx="2" fill="#0B0C10" stroke="#9AA6B8"/>${C(10, 17, 'TRANSLUCENT: INVISIBLE FORCE 2', 11, '#DDE8F2', 'letter-spacing="1"')}${T(10, 36, tag, 10.5, 400, '#C9D3E0', 'font-style="italic"')}`, [[0, 70, -60, 0], [0.7, 70, -60, 1], [1.05, 70, 30, 1], [3.6, 70, 30, 1], [3.9, 70, 30, 0], [4, 70, 30, 0]], { still: 2, ease: ease('overshoot') })
      let steps = ''
      for (let i = 0; i < 7; i++) {
        const t = 1.3 + i * 0.32
        const x = 92 + i * 34
        const y = GROUND - 2 - (i % 2) * 4
        steps += a.sg.win(t, 3.9, `<ellipse cx="${x}" cy="${y}" rx="3.4" ry="1.6" fill="#C9D3E0" opacity=".55"/>`) + fx.dust(a.sg, t, x, y, { n: 2, seed: `inv${i}`, color: '#C9D3E0', dx: -5, s: 0.7 })
      }
      return s + a.fx(fx.sparks(a.sg, 0.95, 37, 60, { seed: 'invs', color: '#DDE8F2', n: 6 }) + steps)
    },
    pane: ['cred', (a, g) => a.mv(`<rect width="200" height="64" rx="2" fill="#0B0C10" stroke="#9AA6B8" stroke-dasharray="3 3"/>${C(100, 26, 'INVISIBLE FORCE 2', 13, '#DDE8F2', 'text-anchor="middle" letter-spacing="1.4"')}${C(100, 46, 'NOW SHOWING · SORT OF', 8.5, '#9AA6B8', 'text-anchor="middle" letter-spacing="1"')}`, [[0, g.W - 220, -70, 0], [0.3, g.W - 220, -70, 1], [0.7, g.W - 220, 26, 1], [3.5, g.W - 220, 26, 1], [3.9, g.W - 220, 26, 0], [4, g.W - 220, 26, 0]], { still: 2, ease: ease('overshoot') }) + a.kf(`<rect x="${r1(g.W - 220)}" y="26" width="200" height="64" fill="#DDE8F2"/>`, [[0, 'opacity:0'], [1.6, 'opacity:0'], [1.7, 'opacity:.35'], [2.4, 'opacity:0'], [4, 'opacity:0']], { still: 'opacity="0"' }) + a.fx(fx.sparks(a.sg, 1.65, g.W - 120, 58, { seed: 'invp', color: '#DDE8F2', n: 8 }) + fx.dust(a.sg, 2.2, g.W - 150, 92, { n: 3, seed: 'invpd', color: '#9AA6B8' }))],
  },
  // T26 `this means noir` (phase 3 adds the hidden skin): Noir steps in, says nothing; the 1979 tape.
  noirmode: {
    band: (a, g) => a.mv(feet(SP.TB_NOIR, 0.86), [[0, g.W + 30, GROUND], [0.5, g.W - 120, GROUND], [2.6, g.W - 120, GROUND], [3, g.W + 30, GROUND]], { still: 2 }) + a.on(bub(g.W - 116, GROUND - 44, '…', g.m, true), 0.8, 2.5) + a.on(`<g transform="translate(${g.W - 220} 36)"><rect width="34" height="18" rx="1.5" fill="#1C1C22" stroke="#D9A441"/>${C(17, 13, '1979', 10, '#D9A441', 'text-anchor="middle" letter-spacing="1"')}</g>`, 1.0, 2.8),
    pane: ['task', (a, g) => a.on(vhs(g.W - 70, 12, 'THIS MEANS', 'NOIR · 1979', SP.TB_NOIR_BUST, 2.4), 0.3, 2.9, { fade: 0.3 })],
  },
  // T27 `vivant!` / `cirque de vought`: Noir swings across on a trapeze rope; his line, attributed.
  vivant: {
    band: (a, g) => {
      const px0 = g.W * 0.5
      const swing = a.kf(`<path d="M0 0V64" stroke="#C9C2B0" stroke-width="2"/><rect x="-14" y="62" width="28" height="3" fill="#C9A13B"/><g transform="translate(0 66)">${px(SP.TB_NOIR, -(spW(SP.TB_NOIR) * 0.7) / 2, 0, 0.7)}</g>`, [[0, 'transform:rotate(60deg)'], [1, 'transform:rotate(-55deg)'], [2, 'transform:rotate(45deg)'], [3, 'transform:rotate(-35deg)'], [4, 'transform:rotate(0deg)']], { ease: 'ease-in-out', origin: '0 0' })
      return `<g transform="translate(${r1(px0)} 0)">${swing}</g>` + a.on(cap(24, 30, '“They’re gonna let me fly.” — Noir II', g.m), 1.0, 3.9) + a.on(bub(px0 + 30, 72, '…', g.m), 2.2, 3.4)
    },
    pane: ['task', (a, g) => a.on(`<g transform="translate(${r1(g.W - 170)} 18)"><rect width="150" height="64" rx="3" fill="#2A1450" stroke="#F0D27A" stroke-width="1.4"/>${star(20, 18, 7, '#F0D27A')}${star(130, 18, 7, '#F0D27A')}${C(75, 26, 'CIRQUE DE VOUGHT', 10, '#F0D27A', 'text-anchor="middle" letter-spacing="1.2"')}${C(75, 50, 'VIVANT!', 18, '#FFFFFF', 'text-anchor="middle" letter-spacing="3"')}</g>`, 0.2, 3.9, { fade: 0.3 })],
  },
  // T28 `not without my dolphin`: a cartoon dolphin leaps the foot twice; the VHS slate. No truck, ever.
  dolphin: {
    band: (a, g) => {
      const x = g.W * 0.3
      const fr: Fr[] = [[0, x, GROUND + 10, 0], [0.3, x, GROUND + 10, 1, 'rotate(-40deg)'], [0.8, x + 60, GROUND - 50, 1], [1.3, x + 120, GROUND + 10, 1, 'rotate(40deg)'], [1.5, x + 150, GROUND + 10, 0], [1.6, x + 160, GROUND + 10, 1, 'rotate(-40deg)'], [2.1, x + 220, GROUND - 50, 1], [2.6, x + 280, GROUND + 10, 1, 'rotate(40deg)'], [2.8, x + 280, GROUND + 10, 0], [3.5, x + 280, GROUND + 10, 0]]
      return a.mv(dolphin(-16, -8), fr, { still: 2, c: true }) + a.on(clapSlate(a, Math.max(80, x - 220), 34, 'NOT WITHOUT MY DOLPHIN', 'FROM THE MEMOIR “DEEPER”', 0.5), 0.4, 3.4)
    },
    pane: ['log', (a, g) => a.mv(dolphin(-16, -8, 2), [[0, 40, g.H, 0], [0.4, 60, g.H - 20, 1, 'rotate(-40deg)'], [1.6, g.W / 2, 24, 1], [2.8, g.W - 60, g.H - 20, 1, 'rotate(40deg)'], [3.2, g.W - 40, g.H, 0], [3.5, g.W - 40, g.H, 0]], { still: 2, c: true })],
  },
  // T29 `ambrosius`: a purple tentacle waves from behind the CRISIS DESK, a tank glow, one heart.
  ambrosius: {
    band: (a, g) => a.kf(tentacle(g.W - 64, 92, 1.2), [[0, 'transform:translateY(40px)'], [0.4, 'transform:none'], [1.0, 'transform:rotate(-12deg)'], [1.6, 'transform:rotate(8deg)'], [2.4, 'transform:none'], [3, 'transform:translateY(40px)']], { c: true }) + a.kf(heart(g.W - 82, 70, 1.1, '#C9A0FF'), [[0, 'opacity:0'], [1.2, 'opacity:0'], [1.4, 'opacity:1'], [2.6, 'opacity:0;transform:translateY(-12px)'], [3, 'opacity:0']], {}),
    pane: ['task', (a, g) => a.on(`<ellipse cx="${g.W - 50}" cy="${g.H - 10}" rx="70" ry="30" fill="#3FC7C0" opacity=".18"/>`, 0, 3, { fade: 0.4 }) + a.kf(tentacle(g.W - 64, g.H - 66, 2), [[0, 'transform:translateY(60px)'], [0.4, 'transform:none'], [1.0, 'transform:rotate(-12deg)'], [1.6, 'transform:rotate(10deg)'], [2.4, 'transform:none'], [3, 'transform:translateY(60px)']], { c: true }) + a.kf(heart(g.W - 96, g.H - 90, 1.6, '#C9A0FF'), [[0, 'opacity:0'], [1.2, 'opacity:0'], [1.4, 'opacity:1'], [2.6, 'opacity:0;transform:translateY(-14px)'], [3, 'opacity:0']], {})],
  },
  // T30 `american hero`: THE TABLE's open seats get spotlights and a VOTE bar.
  americanhero: {
    band: (a, g) => {
      const fx2 = g.W * 0.65
      // Two spotlights swing down onto the open slots (overshoot), Frenchie hops into the right one and POINTs at the vote.
      poses(a, { fr: SP.TB_FRENCHIE, frp: SP.TB_FRENCHIE_POINT })
      const swing = (x: number, dir: number) => a.kf(cone(x, 0, GROUND, 80), [[0, `opacity:0;transform:rotate(${dir * 38}deg)`], [0.2, `opacity:0;transform:rotate(${dir * 38}deg)`], [0.3, `opacity:1;transform:rotate(${dir * 38}deg)`], [0.85, 'opacity:1;transform:rotate(0deg)'], [4.6, 'opacity:1;transform:rotate(0deg)'], [5, 'opacity:0;transform:rotate(0deg)']], { ease: ease('overshoot'), origin: `${r1(x)}px 0px`, still: 'opacity="1"' })
      const fr = actor(a, 'fr', [[0, 1.6, 'fr', -1], [1.6, 5, 'frp', -1]], [[0, g.W + 30, GROUND], [0.6, g.W + 30, GROUND], [1.2, fx2, GROUND], [1.3, fx2, GROUND, 0.88], [1.45, fx2, GROUND - 10, 1.06], [1.62, fx2, GROUND, 0.9], [1.75, fx2, GROUND, 1], [4.5, fx2, GROUND], [5, g.W + 30, GROUND]], 0.96, { h: 45 })
      return swing(g.W * 0.35, 1) + swing(fx2, -1) + fr + stillPose(a, 'frp', fx2, GROUND, 0.96, -1) + a.fx(fx.dust(a.sg, 1.62, fx2 + 12, GROUND - 2, { n: 3, seed: 'ahd' }) + fx.ring(a.sg, 1.62, fx2, GROUND - 1, { rx: 14, color: '#FFF4C2', w: 1.2 })) + a.on(cap(g.W / 2, 30, 'AMERICAN HERO · 2 OPEN SLOTS · VOTE NOW', g.m, { z: 11, mid: true }), 0.9, 4.8)
    },
    pane: ['table', (a, g) => {
      const swing = (x: number, dir: number) => a.kf(cone(x, 0, g.H - 20, 70), [[0, `opacity:0;transform:rotate(${dir * 30}deg)`], [0.2, `opacity:1;transform:rotate(${dir * 30}deg)`], [0.8, 'opacity:1;transform:rotate(0deg)'], [4.6, 'opacity:1;transform:rotate(0deg)'], [5, 'opacity:0;transform:rotate(0deg)']], { ease: ease('overshoot'), origin: `${r1(x)}px 0px`, still: 'opacity="1"' })
      return swing(g.W * 0.3, 1) + swing(g.W * 0.7, -1) + a.on(cap(g.W / 2, 50, 'AMERICAN HERO · 2 OPEN SLOTS', g.m, { mid: true }), 0.3, 4.8) + vote(a, g.W * 0.3 - 50, g.H - 30) + vote(a, g.W * 0.7 - 50, g.H - 30) + a.fx(fx.ring(a.sg, 0.8, g.W * 0.3, g.H - 22, { rx: 30, color: '#FFF4C2', w: 1.2 }) + fx.ring(a.sg, 0.8, g.W * 0.7, g.H - 22, { rx: 30, color: '#FFF4C2', w: 1.2 }))
    }],
  },
  // T31 `rock my kiss` / `supersonic` / `super-sweet`: a tiny stage, three silhouettes, a heart spotlight, the cassette.
  rockmykiss: {
    band: (a, g) => {
      const x = g.W * 0.4
      let s = a.on(cone(x + 30, 0, GROUND, 120, '#FFB6D0', 0.25) + `<rect x="${r1(x - 40)}" y="${GROUND - 4}" width="140" height="5" fill="#3A2A50"/>`, 0, 3.5, { fade: 0.3 })
      for (let i = 0; i < 3; i++) s += a.on(`<g class="tqb" style="animation-delay:-${i * 0.12}s"><circle cx="${r1(x + i * 30)}" cy="${GROUND - 36}" r="6" fill="#1A1220"/><path d="M${r1(x + i * 30 - 8)} ${GROUND - 4}l2 -24h12l2 24z" fill="#1A1220"/></g>`, 0.2, 3.4)
      return s + a.kf(heart(x + 22, GROUND - 70, 1.6, '#FF6FA8'), [[0, 'opacity:0;transform:scale(.3)'], [1, 'opacity:1;transform:scale(1.2)'], [1.3, 'transform:none'], [3.3, 'opacity:1'], [3.5, 'opacity:0']], { c: true }) + a.on(`<g transform="translate(${r1(x + 120)} 40)"><rect width="56" height="34" rx="3" fill="#2A2A30" stroke="#FF6FA8"/><rect x="6" y="5" width="44" height="12" fill="#FFB6D0"/>${C(28, 14, 'SUPER-SWEET', 6.5, '#1A1220', 'text-anchor="middle"')}<circle cx="18" cy="25" r="4" fill="none" stroke="#C9C2B0"/><circle cx="38" cy="25" r="4" fill="none" stroke="#C9C2B0"/>${C(28, 44, '2008', 8, '#FFB6D0', 'text-anchor="middle"')}</g>`, 0.4, 3.4)
    },
    pane: ['log', (a, g) => {
      let s = ''
      for (let i = 0; i < 6; i++) s += a.mv(heart(0, 0, 1.3, '#FF6FA8'), [[0, 0, 0, 0], [0.2 + i * 0.4, 30 + unit(`hk${i}`) * (g.W - 60), g.H - 16, 0], [0.3 + i * 0.4, 30 + unit(`hk${i}`) * (g.W - 60), g.H - 20, 1], [1.8 + i * 0.4, 40 + unit(`hk${i}`) * (g.W - 80), 20, 0], [3.5, 0, 0, 0]], { still: 2 })
      return s + a.on(cap(44, 60, 'ROCK MY KISS · SUPER-SWEET', g.m), 0.2, 3.4)
    }],
  },
  // T32 `smartest person`: a chess knight slides onto the CRISIS DESK; the points shuffle and snap back solved.
  knight: {
    band: (a, g) => a.mv(knight(0, -20, 1.8), [[0, g.W + 20, 70], [0.5, gaugeOf(g.W).x + gaugeOf(g.W).w * 0.6, 70], [2.6, gaugeOf(g.W).x + gaugeOf(g.W).w * 0.6, 70], [3, g.W + 20, 70]], { still: 2, ease: 'cubic-bezier(.2,.9,.3,1)' }) + a.on(cap(gaugeOf(g.W).x + gaugeOf(g.W).w * 0.6 + 24, 62, 'CHECK.', g.m), 0.6, 2.7),
    pane: ['task', (a, g) => a.mv(knight(0, 0, 2.4), [[0, g.W + 20, 40], [0.5, g.W - 60, 40], [2.6, g.W - 60, 40], [3, g.W + 20, 40]], { still: 2 }) + a.kf(`<rect x="10" y="50" width="${g.W - 90}" height="${Math.max(20, g.H - 110)}" fill="${pal(g.m).tile}" opacity=".5"/>`, [[0, 'opacity:0'], [0.7, 'opacity:.6;transform:translateX(-3px)'], [0.8, 'transform:translateX(3px)'], [0.9, 'transform:translateX(-2px)'], [1.0, 'opacity:0;transform:none'], [3, 'opacity:0']], { still: 'opacity="0"' }) + a.slam(stamp(g.W - 150, 72, 'SOLVED ✓', g.m === 'book' ? PROPS.marker : '#C9A13B', 12, -6), 1.1, 2.9)],
  },
  // T33 `wakey wakey`: the bust's eyes open with a ting (OFF BOOK: the safehouse blinds snap open); the pane brightens.
  wakey: {
    band: (a, g, P) => {
      if (g.m === 'book') {
        let bl = ''
        for (let i = 0; i < 10; i++) bl += `<rect x="0" y="${r1(i * (g.H / 10))}" width="${g.W}" height="${r1(g.H / 10 - 2)}" fill="#C8B48A"/>`
        return a.kf(`<g>${bl}</g>`, [[0, 'transform:none'], [0.45, 'transform:none'], [0.6, `transform:translateY(-${g.H}px)`], [1.5, `transform:translateY(-${g.H}px)`]], { still: `opacity="0"` }) + a.on(T(g.W / 2, 60, 'snap.', 12, 700, '#FFFFFF', 'font-style="italic"'), 0.6, 1.4)
      }
      const b = bustAt(g.m)
      const lid = (c: number) => `<rect x="${r1(b.x + c * b.s - 1.2)}" y="${r1(b.y + 8 * b.s)}" width="${r1(3 * b.s + 2.4)}" height="${r1(2.6 * b.s)}" fill="${PROPS.skin}"/>`
      void P
      return a.on(lid(21) + lid(26), 0, 0.55, { still: false }) + a.on(T(64, 30, 'ting.', 12, 700, '#F0D27A', 'font-style="italic"'), 0.55, 1.4)
    },
    pane: ['cred', (a, g) => a.kf(`<rect width="${g.W}" height="${g.H}" fill="#FFF4C2"/>`, [[0, 'opacity:0'], [0.3, 'opacity:.28'], [1.5, 'opacity:0']], { still: 'opacity="0"' })],
  },
  // T34 `class dismissed` (a prompt that is only that): the step pips snap shut like a book; a school bell.
  dismissed: {
    band: (a, g) => {
      const cover = (x: number, o: string) => a.kf(`<rect x="${x}" y="92" width="44" height="22" rx="2" fill="#7A3B2A" stroke="#4A2418"/>`, [[0, 'transform:scaleX(0)'], [0.2, 'transform:scaleX(0)'], [0.45, 'transform:none'], [2, 'transform:none']], { origin: o })
      return cover(16, '16px 0') + cover(60, '104px 0') + a.kf(bell(112, 88), [[0, 'opacity:0'], [0.45, 'opacity:1;transform:rotate(-14deg)'], [0.6, 'transform:rotate(14deg)'], [0.75, 'transform:rotate(-14deg)'], [0.9, 'transform:rotate(14deg)'], [1.05, 'transform:none'], [2, 'opacity:1']], { c: true }) + a.on(T(134, 104, 'RRRING!', 12, 800, '#FFFFFF'), 0.45, 1.8)
    },
    pane: ['task', (a, g) => a.slam(`<g transform="translate(${r1(g.W - 110)} 44)"><rect x="-76" y="-18" width="152" height="34" rx="2" fill="#1F3A2A" stroke="#7A5A3E" stroke-width="3"/>${T(0, 5, 'Class dismissed.', 13, 700, '#F4F1E8', 'text-anchor="middle" font-style="italic"')}</g>`, 0.2, 1.9)],
  },
  // T35 `the real heroes`: confetti, the line from the bust; THE TABLE's seats glow.
  realheroes: {
    band: (a, g) => {
      let s = ''
      for (let i = 0; i < 22; i++) s += a.mv(`<rect width="3" height="${i % 3 ? 3 : 5}" fill="${i % 4 ? '#F0D27A' : '#FFFFFF'}"/>`, [[0, unit(`rh${i}`) * g.W, -10], [0.2 + unit(`rd${i}`) * 0.6, unit(`rh${i}`) * g.W, -10], [3, unit(`rh${i}`) * g.W + 10, g.H + 10]], { still: 0 })
      return s + a.on(bub(56, 46, 'You guys are the real heroes!', g.m), 0.3, 2.9)
    },
    pane: ['table', (a, g) => a.kf(`<ellipse cx="${g.W / 2}" cy="${r1(g.H * 0.55)}" rx="${r1(g.W * 0.36)}" ry="${r1(g.H * 0.22)}" fill="none" stroke="#F0D27A" stroke-width="6"/>`, [[0, 'opacity:0'], [0.4, 'opacity:.5'], [1.2, 'opacity:.2'], [2, 'opacity:.5'], [3, 'opacity:0']], { still: 'opacity="0"' }) + a.on(cap(g.W / 2, 50, 'THE REAL HEROES', g.m, { mid: true }), 0.3, 2.9)],
  },
  // T36 `you're bad product`: BAD PRODUCT slams on the bust; it winces. The contract's seal cracks.
  badproduct: {
    band: (a, g, P) => {
      const b = bustAt(g.m)
      // The stamp rises and tilts back (the wind-up), slams onto the bust, which squashes and springs back; a sweat drop falls.
      const bust = a.kf(px(b.sp, b.x, b.y, b.s), [[0, 'transform:none'], [0.42, 'transform:none'], [0.47, 'transform:scale(1.1,.84)'], [0.6, 'transform:scale(.96,1.05)'], [0.74, 'transform:none'], [2, 'transform:none']], { origin: '37px 82px' })
      const st = a.kf(stamp(37, 60, 'BAD PRODUCT', PROPS.stamp, 9, -12), [[0, 'opacity:0;transform:translate(10px,-20px) scale(1.5) rotate(-10deg)'], [0.08, 'opacity:1;transform:translate(10px,-20px) scale(1.5) rotate(-10deg)'], [0.32, 'opacity:1;transform:translate(14px,-30px) scale(1.6) rotate(-22deg)'], [0.44, 'opacity:1;transform:none'], [0.52, 'opacity:1;transform:scale(.92)'], [0.6, 'opacity:1;transform:none'], [1.9, 'opacity:1;transform:none'], [1.96, 'opacity:0'], [2, 'opacity:0']], { c: true, ease: ease('snap') })
      return a.on(coverBust(P), 0.02, 1.98) + bust + st + a.mv(`<path d="M0 0q2 4 0 6q-2 -2 0 -6z" fill="#9FDBFF"/>`, [[0, 52, 44, 0], [0.6, 52, 44, 1], [1.5, 52, 58, 1], [1.7, 52, 60, 0], [2, 52, 60, 0]], { still: 1, ease: ease('settle') }) + a.on(T(64, 30, 'wince.', 11, 700, '#FFFFFF', 'font-style="italic"'), 0.55, 1.9) + a.fx(fx.sparks(a.sg, 0.45, 37, 58, { seed: 'bp', color: '#FFE9A8', n: 8 }) + fx.dust(a.sg, 0.46, 50, 82, { n: 3, seed: 'bpd' }))
    },
    pane: ['cred', (a, g) => a.kf(stamp(g.W - 110, 46, 'BAD PRODUCT', PROPS.stamp, 14, -8), [[0, 'opacity:0;transform:translateY(-24px) scale(1.4) rotate(-12deg)'], [0.1, 'opacity:1;transform:translateY(-24px) scale(1.4) rotate(-12deg)'], [0.3, 'opacity:1;transform:translateY(-32px) scale(1.5) rotate(-18deg)'], [0.42, 'opacity:1;transform:none'], [0.5, 'opacity:1;transform:scale(.94)'], [0.58, 'opacity:1;transform:none'], [1.9, 'opacity:1;transform:none'], [2, 'opacity:0']], { c: true, ease: ease('snap') }) + a.kf(`<path d="M${g.W - 60} 20l-8 14 6 6-10 12M${g.W - 60} 20l10 10-4 8" fill="none" stroke="#1A1C22" stroke-width="1.4" stroke-dasharray="60"/>`, [[0, 'stroke-dashoffset:60;opacity:1'], [0.45, 'stroke-dashoffset:60;opacity:1'], [0.75, 'stroke-dashoffset:0;opacity:1'], [1.95, 'stroke-dashoffset:0;opacity:1'], [2, 'opacity:0']], { still: 'stroke-dashoffset="0"' }) + a.fx(fx.sparks(a.sg, 0.43, g.W - 110, 46, { seed: 'bpp', color: '#FFE9A8', n: 8 }))],
  },
  // T37 `…really a pharmaceutical company`: the Q-SCORE watermark for 5 s.
  pharma: {
    band: (a, g) => {
      const q = gaugeOf(g.W)
      const gx = q.x + q.w * 0.5
      // The bust tosses a vial: it flips end over end along an arc, lands upright on the gauge (squash, a blue splash), and the
      // label slides out from it.
      const fr: [number, number, number, number?, string?][] = []
      for (let i = 0; i <= 6; i++) { const u = i / 6; fr.push([0.15 + u * 0.75, 40 + (gx - 40) * u, 40 - 44 * 4 * u * (1 - u), 1, `rotate(${Math.round(u * 720)}deg)`]) }
      fr.unshift([0, 40, 40, 0, 'rotate(0deg)'])
      fr.push([0.98, gx, 40, 1, 'rotate(720deg) scale(1.18,.8)'], [1.08, gx, 40, 1, 'rotate(720deg) scale(.94,1.08)'], [1.18, gx, 40, 1, 'rotate(720deg)'], [4.7, gx, 40, 1, 'rotate(720deg)'], [5, gx, 40, 0, 'rotate(720deg)'])
      return a.mv(vial(-5, -11, 1.3), fr, { still: 9, c: true }) + a.mv(cap(0, 46, 'R&D · VOUGHT PHARMACEUTICALS', g.m), [[0, gx + 6, 0, 0], [1.1, gx + 6, 0, 0], [1.45, gx + 18, 0, 1], [4.8, gx + 18, 0, 1], [5, gx + 18, 0, 0]], { still: 2, ease: ease('settle') }) + a.fx(fx.sparks(a.sg, 0.95, gx, 50, { seed: 'phs', color: PROPS.vblue, n: 7 }) + fx.ring(a.sg, 0.95, gx, 52, { rx: 12, color: '#9FDBFF', w: 1.4 }))
    },
    pane: ['cred', (a, g) => a.kf(`<g transform="translate(${g.W / 2} ${g.H / 2}) rotate(-12)">${C(0, 6, 'A PHARMACEUTICAL COMPANY, REALLY.', Math.min(22, g.W / 22), '#C9A13B', 'text-anchor="middle" letter-spacing="2"')}</g>`, [[0, 'opacity:0;transform:scale(1.6)'], [0.2, 'opacity:0;transform:scale(1.6)'], [0.5, 'opacity:.55;transform:scale(.96)'], [0.62, 'opacity:.55;transform:none'], [4.5, 'opacity:.55;transform:none'], [5, 'opacity:0;transform:none']], { c: true, ease: ease('snap'), still: 'opacity=".55"' })],
  },
  // T38 `storage boy`: a frosted crate slides onto the foot with a padlock; frost creeps 10 px.
  storage: {
    band: (a, g) => a.mv(crate(0, -40, g.m), [[0, g.W + 10, GROUND], [0.6, g.W * 0.58, GROUND], [3.6, g.W * 0.58, GROUND], [4, g.W * 0.58, GROUND, 0]], { still: 2, ease: 'cubic-bezier(.2,.9,.3,1)' }) + a.kf(frostEdge(g.W, g.H, 10), [[0, 'opacity:0'], [0.8, 'opacity:0'], [2, 'opacity:1'], [3.6, 'opacity:1'], [4, 'opacity:0']], { still: 'opacity="0"' }),
    pane: ['task', (a, g) => a.on(`${frostEdge(g.W, g.H, 10)}<g transform="translate(${g.W - 120} 14)">${tape(50, 10, 110, 22, 3, 0.9)}${C(50, 14, 'DO NOT THAW', 11, '#1A2340', 'text-anchor="middle" letter-spacing="1.4"')}</g>`, 0.3, 4, { fade: 0.6 })],
  },
  // T39 `red scare` / `vought rising`: a 1950s newsreel: sepia, the 3·2·1 leader, the title card, a poster frame.
  redscare: {
    band: (a, g) => {
      const cx = g.W / 2
      const cy = g.H / 2
      // A 1950s newsreel: the sepia picture flickers (stepped), the leader counts 3·2·1 with its sweep hand going round, the poster
      // frame swings in on its nail with Soldier Boy SALUTING, the title card rolls in from the right, a scratch runs down the film.
      const flick: [number, string][] = [[0, 'opacity:0']]
      for (let i = 0; i < 24; i++) flick.push([0.3 + i * 0.2, `opacity:${(0.5 + unit(`rsf${i}`) * 0.12).toFixed(2)}`])
      flick.push([5, 'opacity:0'])
      let s = a.kf(`<rect width="${g.W}" height="${g.H}" rx="10" fill="#3A2A18"/>`, flick, { ease: 'steps(1,end)', still: 'opacity=".55"' })
      for (const [i, n] of ['3', '2', '1'].entries()) s += a.on(`<circle cx="${cx}" cy="${cy}" r="30" fill="#E8DCC0" stroke="#3A2A18" stroke-width="2"/><path d="M${cx - 40} ${cy}h80M${cx} ${cy - 40}v80" stroke="#3A2A18"/>${C(cx, cy + 14, n, 38, '#3A2A18', 'text-anchor="middle"')}`, 0.2 + i * 0.5, 0.7 + i * 0.5, { still: i === 2 })
      s += a.kf(`<path d="M${cx} ${cy}V${cy - 30}A30 30 0 0 1 ${r1(cx + 21.2)} ${r1(cy - 21.2)}z" fill="#3A2A18" opacity=".35"/>`, [[0, 'opacity:0;transform:rotate(0deg)'], [0.2, 'opacity:1;transform:rotate(0deg)'], [1.7, 'opacity:1;transform:rotate(1080deg)'], [1.72, 'opacity:0;transform:rotate(1080deg)'], [5, 'opacity:0']], { origin: `${cx}px ${cy}px`, still: 'opacity="0"' })
      const sp = SP.TB_SOLDIERBOY_SALUTE
      const fx0 = cx - 160
      s += a.kf(`<g transform="translate(${r1(fx0)} 30)"><path d="M26 -8L6 0M26 -8L46 0" stroke="#3A2A18" stroke-width="1.2"/><circle cx="26" cy="-8" r="2" fill="#3A2A18"/><rect width="52" height="58" fill="#E8DCC0" stroke="#3A2A18" stroke-width="2"/><g style="filter:brightness(.35) sepia(1)">${px(sp, 26 - (spW(sp) * 1.08) / 2, 3, 1.08)}</g></g>`, [[0, 'opacity:0;transform:rotate(-24deg)'], [1.75, 'opacity:0;transform:rotate(-24deg)'], [1.8, 'opacity:1;transform:rotate(-24deg)'], [2.3, 'opacity:1;transform:rotate(6deg)'], [2.6, 'opacity:1;transform:rotate(-2deg)'], [2.8, 'opacity:1;transform:none'], [5, 'opacity:1;transform:none']], { ease: ease('settle'), origin: `${r1(fx0 + 26)}px 22px`, still: 'opacity="1"' })
      s += a.mv(`${C(0, 0, 'VOUGHT RISING · 2027', 20, '#F4EAD0', 'letter-spacing="2"')}${C(0, 22, '“RED SCARE”', 12, '#E8DCC0', 'letter-spacing="2"')}`, [[0, g.W + 20, 50, 0], [1.9, g.W + 20, 50, 1], [2.4, cx - 96, 50, 1], [5, cx - 96, 50, 1]], { still: 2, ease: ease('settle') })
      return s + a.fx(a.sg.win(2.0, 2.3, `<path d="M${r1(cx + 120)} 0V${g.H}" stroke="#F4EAD0" stroke-width=".8" opacity=".6"/>`) + a.sg.win(3.4, 3.6, `<path d="M${r1(cx - 220)} 0V${g.H}" stroke="#F4EAD0" stroke-width=".8" opacity=".5"/>`) + fx.dust(a.sg, 2.3, fx0 + 26, 90, { n: 3, seed: 'rsd', color: '#E8DCC0' }))
    },
    pane: ['cred', (a, g) => a.on(`<rect width="${g.W}" height="${g.H}" fill="#3A2A18" opacity=".35"/>`, 0.2, 5, { fade: 0.3 }) + a.mv(`<rect x="-120" y="-26" width="240" height="52" fill="#E8DCC0" stroke="#3A2A18" stroke-width="2"/>${C(0, -2, 'VOUGHT RISING', 18, '#3A2A18', 'text-anchor="middle" letter-spacing="2"')}${C(0, 16, '1950s · “RED SCARE”', 9.5, '#3A2A18', 'text-anchor="middle" letter-spacing="1.4"')}`, [[0, g.W / 2, -40, 0], [0.4, g.W / 2, -40, 1], [0.8, g.W / 2, g.H / 2, 1], [4.6, g.W / 2, g.H / 2, 1], [5, g.W / 2, g.H / 2, 0]], { still: 2, ease: ease('overshoot') })],
  },
  // T40 `godolkin`: the GOD U. pennant flutters on the band's corner; #ThinkBrink drifts along the crawl; a crest on THE TABLE.
  godolkin: {
    band: (a, g) => a.kf(`<g transform="translate(${g.W - 100} 6)"><rect x="0" y="0" width="2" height="30" fill="#C9C2B0"/><path d="M2 2L52 12L2 22z" fill="#6B1E2E"/>${C(8, 15.5, 'GOD U.', 9, '#F4F1E8', 'letter-spacing="1"')}</g>`, [[0, 'opacity:0;transform:skewY(0)'], [0.3, 'opacity:1;transform:skewY(-4deg)'], [0.8, 'transform:skewY(4deg)'], [1.3, 'transform:skewY(-4deg)'], [1.8, 'transform:skewY(4deg)'], [2.3, 'transform:skewY(-4deg)'], [3.8, 'opacity:1;transform:none'], [4, 'opacity:0']], {}) + a.mv(T(0, 0, '#ThinkBrink', 11, 700, '#F0D27A'), [[0, -100, CRAWL_Y + 10.5, 0], [0.4, 40, CRAWL_Y + 10.5, 1], [3.6, g.W - 140, CRAWL_Y + 10.5, 1], [4, g.W - 120, CRAWL_Y + 10.5, 0]], { still: 2 }),
    pane: ['table', (a, g) => a.on(`<g transform="translate(${g.W - 70} 24)"><path d="M0 0h44v26q0 16 -22 24q-22 -8 -22 -24z" fill="#6B1E2E" stroke="#C9A13B" stroke-width="1.4"/>${C(22, 22, 'GOD U.', 10, '#F4F1E8', 'text-anchor="middle" letter-spacing="1"')}${star(22, 36, 5, '#C9A13B')}</g>`, 0.2, 4, { fade: 0.3 })],
  },
  // T41 `little cricket`: the figure shrinks to 60% and hops back; every pane card shrinks to 85% and bounces back.
  cricket: {
    band: (a, g, P) => {
      const b = bustAt(g.m)
      return a.on(coverBust(P), 0, 1.5) + a.kf(`<g transform="translate(37 79)">${px(b.sp, -(spW(b.sp) * b.s) / 2, -spH(b.sp) * b.s, b.s)}</g>`, [[0, 'transform:none'], [0.25, 'transform:scale(.6)'], [0.5, 'transform:translateY(-8px) scale(.6)'], [0.75, 'transform:scale(.6)'], [1.0, 'transform:translateY(-6px) scale(.6)'], [1.25, 'transform:none'], [1.5, 'transform:none']], { origin: '37px 79px' })
    },
    pane: ['all', (a, g) => (g.on === 'cred' ? a.on(cap(g.W - 24 - capW('LITTLE CRICKET'), 72, 'LITTLE CRICKET', g.m), 0, 1.4) : '')],
    shake: { all: [[0, 'transform:none'], [0.2, 'transform:scale(.85)'], [1.0, 'transform:scale(.85)'], [1.2, 'transform:scale(1.03)'], [1.35, 'transform:none'], [1.5, 'transform:none']] },
  },
  // T42 `monster club`: the puppet filter: felt texture over everything, googly eyes, confetti (never red).
  puppets: {
    band: (a, g) => {
      const id = gid(g, 'fe')
      const b = bustAt(g.m)
      const eye = (x: number) => `<circle cx="${r1(x)}" cy="${r1(b.y + 10 * b.s)}" r="3.2" fill="#FFFFFF" stroke="${PROPS.ink}" stroke-width=".6"/><circle class="tqb" cx="${r1(x + 0.8)}" cy="${r1(b.y + 10.8 * b.s)}" r="1.5" fill="${PROPS.ink}"/>`
      let s = a.on(`<defs><filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .55 0 0 0 0 .4 0 0 0 0 .3 0 0 0 .5 0"/></filter></defs><rect width="${g.W}" height="${g.H}" rx="10" filter="url(#${id})" opacity=".35"/>${eye(b.x + 22 * b.s)}${eye(b.x + 27.5 * b.s)}`, 0, 4, { fade: 0.3 })
      for (let i = 0; i < 18; i++) s += a.mv(`<rect width="3" height="3" rx="1" fill="${['#6FB7E8', '#E8A33A', '#7FD3A0', '#C9A0FF'][i % 4]}"/>`, [[0, unit(`mc${i}`) * g.W, -10], [0.3 + unit(`md${i}`), unit(`mc${i}`) * g.W, -10], [4, unit(`mc${i}`) * g.W + 8, g.H + 6]], { still: 0 })
      return s + a.on(cap(64, 30, 'MONSTER CLUB', g.m), 0.2, 3.8)
    },
    pane: ['all', (a, g) => {
      const id = gid(g, 'fe')
      return a.on(`<defs><filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .55 0 0 0 0 .4 0 0 0 0 .3 0 0 0 .5 0"/></filter></defs><rect width="${g.W}" height="${g.H}" filter="url(#${id})" opacity=".3"/>${g.on === 'cred' ? `<g transform="translate(${g.W - 60} 54)"><circle r="9" fill="#FFFFFF" stroke="${PROPS.ink}"/><circle class="tqb" cx="2" cy="2" r="4" fill="${PROPS.ink}"/><circle cx="22" r="9" fill="#FFFFFF" stroke="${PROPS.ink}"/><circle class="tqb" cx="24" cy="2" r="4" fill="${PROPS.ink}"/></g>` : ''}`, 0, 4, { fade: 0.3 })
    }],
  },
  // T43 `v52 expo`: the V52 slate reveal: the badge, then the fake Phase 7 titles flip one by one, each with a flashbulb.
  expo: {
    band: (a, g, P) => {
      const x = Math.max(140, g.W * 0.3)
      const longest = EXPO.reduce((l, t) => (t.length > l.length ? t : l), '')
      const sw = slateW(longest, 'PHASE 7 · 8 OF 8')
      let s = a.on(dim(g.W, g.H, P, 0.75), 0, 8, { fade: 0.3 }) + a.on(`<rect x="${r1(x - 74)}" y="38" width="62" height="40" rx="3" fill="${PROPS.hero}"/>${C(x - 43, 64, 'V52', 20, '#FFFFFF', 'text-anchor="middle" letter-spacing="2"')}`, 0.1, 8)
      s += a.on(slate(x, 34, '', '', 11, sw), 0.3, 7.1)
      EXPO.forEach((t, i) => { s += a.on(`${C(x + 10, 54, t, 11, '#FFFFFF', 'letter-spacing="1"')}${C(x + 10, 65, `PHASE 7 · ${i + 1} OF ${EXPO.length}`, 8.5, '#C9C2B0', 'letter-spacing=".8"')}`, 0.4 + i * 0.85, 1.25 + i * 0.85, { still: i === 0 }) + a.on(flashbulb(x + 20, 40), 0.4 + i * 0.85, 0.52 + i * 0.85, { still: false }) })
      return s + a.on(C(x, 70, '…AND MORE', 16, '#FFFFFF', 'letter-spacing="2"'), 7.2, 8)
    },
    pane: ['log', (a, g) => {
      const id = gid(g, 'ex')
      let s = `<defs><clipPath id="${id}"><rect x="0" y="40" width="${g.W}" height="${Math.max(20, g.H - 86)}"/></clipPath></defs><g clip-path="url(#${id})">`
      EXPO.forEach((t, i) => { s += a.mv(`<rect width="${r1(condW(t, 11, 1) + 20)}" height="24" rx="2" fill="#15161A" stroke="#F4F1E8" stroke-width=".8"/><rect width="${r1(condW(t, 11, 1) + 20)}" height="4" fill="${PROPS.hero}"/>${C(10, 18, t, 11, '#FFFFFF', 'letter-spacing="1"')}`, [[0, 44, g.H + 10, 0], [0.4 + i * 0.85, 44, g.H + 10, 0], [0.5 + i * 0.85, 44, g.H - 64, 1], [2.2 + i * 0.85, 44, 36, 1], [2.4 + i * 0.85, 44, 10, 0], [8, 44, 10, 0]], { still: 2 }) })
      s += '</g>'
      return s + a.on(cap(g.W - 24 - capW('…AND MORE'), 62, '…AND MORE', g.m), 7.2, 8) + a.on(cap(g.W - 24 - capW('V52 EXPO · PHASE 7'), 62, 'V52 EXPO · PHASE 7', g.m), 0.2, 7.1)
    }],
  },
  // T44 `good boy, terror`: Terror trots in, sits, the pig toy squeaks; he pants.
  terror: {
    band: (a, g) => {
      const x = g.W * 0.36
      return a.mv(dog(-20, -26, 'walk', 2.2), [[0, -40, GROUND], [1.4, x, GROUND], [1.41, x, GROUND, 0], [4, x, GROUND, 0]], { still: 0 }) + a.on(`<g transform="translate(${r1(x)} ${GROUND})">${dog(-20, -26, 'sit', 2.2)}</g>`, 1.4, 4) + a.on(pig(x + 26, GROUND - 8), 1.5, 4) + a.on(T(x + 34, GROUND - 18, 'squeak!', 11, 700, '#FFFFFF', 'font-style="italic"'), 2.1, 2.8) + a.on(`<rect x="${r1(x + 18)}" y="${GROUND - 12}" width="3" height="4.4" rx="1.2" fill="#E8455A"/>`, 2.8, 4) + a.on(cap(x - 50, 30, 'GOOD BOY, TERROR.', g.m), 1.5, 3.9)
    },
    pane: ['task', (a, g) => a.on(`<g transform="translate(${g.W - 70} ${g.H - 4})">${dog(-15, -20, 'sit', 2)}</g>${pig(g.W - 30, g.H - 16)}${cap(g.W - 90 - capW('GOOD BOY'), g.H - 18, 'GOOD BOY', g.m)}`, 0.3, 4, { fade: 0.3 })],
  },
  // T45 `full roster` (alone): all seven seats light with their emblems, one flash.
  fullroster: {
    band: (a, g) => {
      const x = g.W / 2 - 155
      const y0 = 46
      // All nine on a dolly zoom: the seats and the panel fall back while the nine faces pop in and push forward (vertigo), one
      // flash for the photo, confetti.
      const B = [SP.TB_HOMELANDER_BUST, SP.TB_STARLIGHT_BUST, SP.TB_NOIR_BUST, SP.TB_ATRAIN_BUST, SP.TB_SOLDIERBOY_BUST, SP.TB_BUTCHER_BUST, SP.TB_HUGHIE_BUST, SP.TB_KIMIKO_BUST, SP.TB_FRENCHIE_BUST]
      // The faces at half resolution (every other pixel, drawn twice the size): nine heads in ~5 k, inside the act budget.
      const bank = new FrameBank(`tbfr${g.on[0]}`, 4)
      B.forEach((sp, i) => bank.add(`h${i}`, { ...sp, rows: sp.rows.slice(0, 24).filter((_: string, r: number) => r % 2 === 0).map((r: string) => [...r].filter((_, c) => c % 2 === 0).join('')) }))
      let seats = `<rect x="${x}" y="${y0}" width="310" height="60" rx="6" fill="#0B1020" stroke="#C9A13B" stroke-width="1.4"/>`
      for (let i = 0; i < 7; i++) seats += emblem(i, x + 42.5 + i * 36, y0 + 6, '#C9A13B', 1.2)
      let s = a.kf(seats, [[0, 'opacity:0;transform:scale(.8)'], [0.15, 'opacity:1;transform:none'], [0.8, 'opacity:1;transform:none'], [1.9, 'opacity:1;transform:scale(.95)'], [2, 'opacity:0;transform:scale(.95)']], { origin: `${r1(x + 155)}px ${y0 + 30}px`, ease: ease('settle'), still: 'opacity="1"' })
      let heads = ''
      for (let i = 0; i < 9; i++) heads += a.kf(bank.use(`h${i}`, x + 31 + i * 31, y0 + 34, 1, 1.5), [[0, 'opacity:0;transform:scale(.2)'], [0.12 + i * 0.06, 'opacity:0;transform:scale(.2)'], [0.3 + i * 0.06, 'opacity:1;transform:scale(1.15)'], [0.4 + i * 0.06, 'opacity:1;transform:none'], [2, 'opacity:1;transform:none']], { c: true, ease: ease('overshoot') })
      s += a.kf(heads, [[0, 'transform:none'], [0.8, 'transform:none'], [1.9, 'transform:scale(1.06)'], [2, 'transform:scale(1.06)']], { origin: `${r1(x + 155)}px ${y0 + 34}px`, ease: ease('settle') })
      s += a.kf(C(x + 155, y0 + 56, 'FULL ROSTER', 13, '#F0D27A', 'text-anchor="middle" letter-spacing="3"'), [[0, 'opacity:0;transform:translateY(8px)'], [0.55, 'opacity:0;transform:translateY(8px)'], [0.75, 'opacity:1;transform:none'], [2, 'opacity:1;transform:none']], { ease: ease('settle'), still: 'opacity="1"' })
      return `<defs>${bank.defs()}</defs>` + s + a.on(`<rect width="${g.W}" height="${g.H}" rx="10" fill="#FFFFFF" opacity=".6"/>`, 0.9, 0.98, { still: false }) + a.fx(fx.confetti(a.sg, 0.95, x + 60, y0 + 10, { n: 8, seed: 'frc', colors: ['#F0D27A', '#FFFFFF', PROPS.hero as string] }) + fx.confetti(a.sg, 1.0, x + 250, y0 + 10, { n: 8, seed: 'frd', colors: ['#F0D27A', '#FFFFFF', PROPS.hero as string] }))
    },
    pane: ['table', (a, g) => {
      let s = ''
      for (let i = 0; i < 7; i++) s += a.kf(cone(g.W * (0.14 + i * 0.12), 0, g.H - 20, 40), [[0, 'opacity:0;transform:scaleY(.2)'], [0.05 + i * 0.07, 'opacity:0;transform:scaleY(.2)'], [0.25 + i * 0.07, 'opacity:1;transform:none'], [2, 'opacity:1;transform:none']], { origin: `${r1(g.W * (0.14 + i * 0.12))}px 0px`, ease: ease('overshoot'), still: 'opacity="1"' })
      return s + a.slam(cap(g.W / 2, 50, 'FULL ROSTER', g.m, { mid: true }), 0.6, 1.95)
    }],
  },
  // T46 `hometeamers`: APPROVAL +10 for 5 s; a crowd cheer wave.
  hometeamers: {
    band: (a, g) => a.on(crowd(20, GROUND, g.W - 40, '#1A2340'), 0, 5, { fade: 0.3 }) + a.on(cap(g.W / 2, 30, 'HOMETEAMERS!', g.m, { z: 12, mid: true }), 0.3, 4.8),
    pane: ['log', (a, g) => a.on(crowd(10, g.H - 4, g.W - 20, '#1A2340'), 0, 5, { fade: 0.3 }) + a.kf(`<path d="M${g.W - 80} ${g.H - 40}l20 -50 20 50" fill="none" stroke="#F0D27A" stroke-width="2.4"/>`, [[0, 'opacity:0'], [0.4, 'opacity:1'], [4.6, 'opacity:1'], [5, 'opacity:0']], {})],
  },
  // T47 `starlighters`: APPROVAL -10 for 5 s; Starlight lands on the foot with a soft light pulse.
  starlighters: {
    band: (a, g) => {
      const x = g.W * 0.45
      return a.mv(feet(SP.TB_STARLIGHT_FLY, 0.8), [[0, x - 80, -20], [0.8, x, GROUND - 10], [0.9, x, GROUND - 10, 0], [5, x, GROUND - 10, 0]], { still: 0 }) + a.on(`<g transform="translate(${r1(x)} ${GROUND})">${feet(SP.TB_STARLIGHT, 0.86)}</g>`, 0.9, 4.8) + a.kf(`<circle cx="${r1(x)}" cy="${GROUND - 20}" r="60" fill="#FFF4C2"/>`, [[0, 'opacity:0'], [0.9, 'opacity:0'], [1.0, 'opacity:.55;transform:scale(.5)'], [1.8, 'opacity:0;transform:scale(1.4)'], [5, 'opacity:0']], { c: true, still: 'opacity="0"' }) + a.on(cap(x + 30, 30, 'STARLIGHTERS', g.m), 1, 4.8)
    },
    pane: ['cred', (a, g) => a.kf(`<circle cx="${g.W / 2}" cy="${g.H / 2}" r="${g.W / 2}" fill="#FFF4C2"/>`, [[0, 'opacity:0'], [0.6, 'opacity:.3;transform:scale(.4)'], [1.6, 'opacity:0;transform:scale(1.2)'], [5, 'opacity:0']], { c: true, still: 'opacity="0"' }) + a.on(`<g transform="translate(${g.W - 40} 2)">${feet(SP.TB_STARLIGHT, 0.5)}</g>`, 0.6, 4.8)],
  },
  // T48 `saving america`: a ribbon unfurls across the band; three flag pixels.
  savingamerica: {
    band: (a, g) => unfurl(a, g, 60, 'SAVING AMERICA · A VOUGHT INITIATIVE', 3),
    pane: ['task', (a, g) => unfurl(a, g, 30, 'SAVING AMERICA', 3)],
  },
  // T49 `vought for tots`: three staffers in cape-trainee tints do jumping jacks.
  tots: {
    band: (a, g) => {
      const x = g.W * 0.4
      let s = ''
      for (let i = 0; i < 3; i++) s += a.kf(crew(x + i * 30, GROUND - 30, ['#E8848C', '#F0D27A', '#4FC3F7'][i] as string, g.m).replace('scale(1.4)', 'scale(3)'), [[0, 'transform:none'], ...Array.from({ length: 6 }, (_, k) => [[0.3 + k * 0.4, 'transform:translateY(-6px) scaleX(1.3)'], [0.5 + k * 0.4, 'transform:none']] as [number, string][]).flat(), [3, 'transform:none']], { c: true })
      return s + a.on(cap(x - 10, 30, 'VOUGHT FOR TOTS', g.m, { z: 12 }), 0.2, 2.9)
    },
    pane: ['cred', (a, g) => a.slam(`<g transform="translate(${g.W - 110} 50)"><rect x="-90" y="-26" width="180" height="50" fill="#F4F1E8" stroke="#C9A13B" stroke-width="2"/>${C(0, -8, 'VOUGHT FOR TOTS', 10, '#7A3B2A', 'text-anchor="middle" letter-spacing="1.4"')}${T(0, 12, 'Certified in cape safety', 11, 700, PROPS.paperInk, 'text-anchor="middle" font-style="italic"')}</g>`, 0.2, 2.9)],
  },
  // T50 `planet vought`: a neon PLANET VOUGHT sign flickers on.
  planetvought: {
    band: (a, g) => neon(a, g.W - 230, 14),
    pane: ['log', (a, g) => neon(a, g.W - 224, 46)],
  },
  // T51 `it's what clara would have wanted` (spoilers on only): the chip, a wilted rose, a shrug.
  clara: {
    band: (a, g) => {
      // The rose drops in, holds, then wilts: the bloom droops on its stem, a petal falls; the caption slides in; a little shrug.
      const bloom = (x: number, y: number) => a.kf(`<path transform="translate(${r1(x)} ${r1(y)}) scale(1.6)" d="M5 6C2 6 1 3 3 1C4 3 6 2 7 4C8 6 6 7 5 6z" fill="#8E2F3A"/>`, [[0, 'transform:none'], [1.1, 'transform:none'], [1.7, 'transform:rotate(58deg)'], [1.85, 'transform:rotate(50deg)'], [3, 'transform:rotate(52deg)']], { origin: `${r1(x + 8)}px ${r1(y + 9.6)}px`, ease: ease('settle'), still: `transform="rotate(52 ${r1(x + 8)} ${r1(y + 9.6)})"` })
      const rx = 64
      const ry = 30
      const stem = `<path transform="translate(${rx} ${ry}) scale(1.6)" d="M3 14C3 10 4 8 5 6M4 10l-3 -1" fill="none" stroke="#5B7A3A" stroke-width="1"/>`
      const rose = a.mv(`${stem}${bloom(rx, ry)}`, [[0, 0, -60, 0], [0.1, 0, -60, 1], [0.45, 0, 0, 1], [2.85, 0, 0, 1], [3, 0, 0, 0]], { still: 2, ease: ease('overshoot') })
      const petal = a.mv(`<ellipse rx="2.2" ry="1.2" fill="#8E2F3A"/>`, [[0, rx + 12, ry + 6, 0], [1.6, rx + 12, ry + 6, 1], [2.0, rx + 18, ry + 22, 1, 'rotate(90deg)'], [2.4, rx + 10, ry + 40, 1, 'rotate(200deg)'], [2.8, rx + 16, ry + 56, 0, 'rotate(300deg)'], [3, rx + 16, ry + 56, 0, 'rotate(300deg)']], { still: 0, c: true })
      return rose + petal + a.mv(cap(86, 52, 'IT’S WHAT CLARA WOULD HAVE WANTED.', g.m, { z: 11 }), [[0, -14, 0, 0], [0.3, -14, 0, 0], [0.65, 0, 0, 1], [2.85, 0, 0, 1], [3, 0, 0, 0]], { still: 2, ease: ease('settle') }) + a.kf(T(86, 76, '(shrugs)', 11, 400, '#C9C2B0', 'font-style="italic"'), [[0, 'opacity:0;transform:none'], [1.8, 'opacity:0;transform:none'], [1.85, 'opacity:1;transform:none'], [1.95, 'opacity:1;transform:translateY(-4px)'], [2.08, 'opacity:1;transform:none'], [2.18, 'opacity:1;transform:translateY(-4px)'], [2.3, 'opacity:1;transform:none'], [2.9, 'opacity:1;transform:none'], [3, 'opacity:0']], { still: 'opacity="1"' })
    },
    pane: ['cred', (a, g) => a.mv(`${rose(0, 0)}`, [[0, g.W - 50, -50, 0], [0.1, g.W - 50, -50, 1], [0.45, g.W - 50, 20, 1], [2.85, g.W - 50, 20, 1], [3, g.W - 50, 20, 0]], { still: 2, ease: ease('overshoot') }) + a.on(cap(g.W - 60 - capW('CLARA WOULD HAVE WANTED IT.'), 40, 'CLARA WOULD HAVE WANTED IT.', g.m), 0.3, 2.9, { fade: 0.3 })],
  },
  // T52 `cracked mirror`: the bust sits in a cracked-mirror frame for 8 s (approval -5).
  mirror: {
    band: (a, g) => {
      const fr = `<rect x="15" y="34" width="44" height="50" rx="3" fill="#BFD7E8" fill-opacity=".14" stroke="#C9A13B" stroke-width="2"/><path d="M37 34l-4 14 7 6-9 12 4 18M37 54l12 -6M33 48l-10 4" fill="none" stroke="#FFFFFF" stroke-width="1" opacity=".9"/>`
      return a.kf(fr, [[0, 'opacity:0'], [0.2, 'opacity:1'], [7.6, 'opacity:1'], [8, 'opacity:0']], {}) + a.on(cap(64, 30, 'REFLECTION UNDER REVIEW', g.m), 0.3, 3)
    },
    pane: ['cred', (a, g) => a.kf(`<path d="M${g.W * 0.2} 0l20 ${g.H * 0.3} -14 ${g.H * 0.2} 26 ${g.H * 0.5}M${g.W * 0.2 + 20} ${g.H * 0.3}l60 -10M${g.W * 0.2 + 6} ${g.H * 0.5}l-40 16" fill="none" stroke="#FFFFFF" stroke-width="1.2" opacity=".75"/>`, [[0, 'opacity:0'], [0.2, 'opacity:1'], [7.6, 'opacity:1'], [8, 'opacity:0']], {})],
  },
  // T53 `it's a deepfake`: a censor mosaic pixelates the title (coarse, then fine) under a DEEPFAKE? tag; the CRISIS DESK stamps
  // UNDER REVIEW.
  deepfake: {
    // The mosaic (coarse, then fine) with a scan line combing down the title, as a feed being 'verified'.
    band: (a, g) => deepfakeTear(a, g) + a.kf(`<rect x="62" y="40" width="${r1(Math.min(g.titleW ?? 300, 320))}" height="1.4" fill="#FFFFFF" opacity=".7"/>`, [[0, 'opacity:0;transform:none'], [0.12, 'opacity:1;transform:none'], [0.9, 'opacity:1;transform:translateY(22px)'], [0.98, 'opacity:0;transform:translateY(22px)'], [2.5, 'opacity:0']], { ease: ease('settle'), still: 'opacity="0"' }),
    pane: ['task', (a, g) => {
      // The censor mosaic scans down the CRISIS DESK (a coarse block, then fine), then UNDER REVIEW lifts and slams with sparks.
      const cell = 6
      let tile = ''
      for (let i = 0; i < 12; i++) tile += `<rect x="${(i % 4) * cell}" y="${Math.floor(i / 4) * cell}" width="${cell}" height="${cell}" fill="${['#2A3350', '#3D4A6E', '#56648A', '#1C2440'][Math.floor(unit(`dfp${i}`) * 4) % 4]}"/>`
      const pid = gid(g, 'dfp')
      const block = `<defs><pattern id="${pid}" width="${cell * 4}" height="${cell * 3}" patternUnits="userSpaceOnUse">${tile}</pattern></defs><rect x="10" y="0" width="${g.W - 20}" height="${cell * 3}" fill="url(#${pid})" opacity=".9"/>`
      return a.mv(block, [[0, 0, -20, 0], [0.05, 0, 10, 1], [0.9, 0, g.H - 30, 1], [1.0, 0, g.H - 30, 0], [2.5, 0, g.H - 30, 0]], { still: 0, ease: ease('settle') }) + a.kf(stamp(g.W - 110, 44, 'UNDER REVIEW', PROPS.stamp, 13, -8), [[0, 'opacity:0'], [0.85, 'opacity:0;transform:translateY(-20px) scale(1.4) rotate(-10deg)'], [0.95, 'opacity:1;transform:translateY(-28px) scale(1.5) rotate(-16deg)'], [1.08, 'opacity:1;transform:none'], [1.16, 'opacity:1;transform:scale(.94)'], [1.24, 'opacity:1;transform:none'], [2.4, 'opacity:1;transform:none'], [2.5, 'opacity:0']], { c: true, ease: ease('snap'), still: 'opacity="1"' }) + a.fx(fx.sparks(a.sg, 1.08, g.W - 110, 44, { seed: 'dfs', color: '#FFE9A8', n: 8 }))
    }],
  },
  // T54 `the boys are back in town`: THE WALK: Butcher, Hughie, Frenchie, Kimiko and Terror cross the foot, left to right.
  walk: {
    band: (a, g) => walkLine(a, g, 0.86, GROUND, 6),
    pane: ['task', (a, g) => walkLine(a, g, 1, g.H - 4, 6)],
  },
  // T55 `did i ever tell you about nicaragua`: Soldier Boy asks; a palm tree; nobody answers.
  nicaragua: {
    band: (a, g) => {
      const x = g.W * 0.3
      // Soldier Boy dips (the wind-up) and SALUTES; the palm sways in the heat; a tumbleweed bounces across the foot. Nobody answers.
      poses(a, { sb: SP.TB_SOLDIERBOY, sbs: SP.TB_SOLDIERBOY_SALUTE })
      const sb = actor(a, 'sb', [[0, 0.42, 'sb'], [0.42, 3, 'sbs']], [[0, x, GROUND], [0.2, x, GROUND], [0.32, x, GROUND, 0.93], [0.44, x, GROUND, 1.04], [0.56, x, GROUND, 1], [3, x, GROUND]], 0.96, { h: 48 })
      const palm2 = a.kf(palm(x - 40, GROUND - 36), [[0, 'transform:rotate(-2deg)'], [0.75, 'transform:rotate(3deg)'], [1.5, 'transform:rotate(-2deg)'], [2.25, 'transform:rotate(3deg)'], [3, 'transform:rotate(-2deg)']], { origin: `${r1(x - 32)}px ${GROUND}px`, ease: 'ease-in-out' })
      const weed = `<g><circle r="7" fill="none" stroke="#B08A5A" stroke-width="1.4"/><path d="M-6 -2q6 4 12 0M-4 4q4 -6 8 -1M-2 -6q2 8 3 12" fill="none" stroke="#B08A5A" stroke-width="1"/></g>`
      // It rolls only over the stage strip: in from the cost line's left edge, out before the step count (never over a number).
      const w0 = g.W * 0.6 - 14
      const w1 = 128
      const at = (i: number) => w0 - ((w0 - w1) * (i + 1)) / bounces.length
      const fr: [number, number, number, number?, string?][] = [[0, w0, GROUND - 7, 0, 'rotate(0deg)'], [0.2, w0, GROUND - 7, 1, 'rotate(0deg)']]
      const bounces = [0.5, 0.95, 1.4, 1.85, 2.3, 2.75]
      bounces.forEach((t, i) => { fr.push([t - 0.22, at(i) + (w0 - w1) / 12, GROUND - 22, 1, `rotate(${-(i * 2 + 1) * 90}deg)`], [t, at(i), GROUND - 7, i === bounces.length - 1 ? 0 : 1, `rotate(${-(i * 2 + 2) * 90}deg)`]) })
      fr.push([3, w1, GROUND - 7, 0, 'rotate(-1080deg)'])
      let dust = ''
      bounces.forEach((t, i) => { dust += fx.dust(a.sg, t, at(i), GROUND - 2, { n: 2, seed: `tw${i}`, color: '#C9B08A', dx: 6, s: 0.8 }) })
      return palm2 + sb + stillPose(a, 'sbs', x, GROUND, 0.96) + a.mv(weed, fr, { still: 0, c: true }) + a.fx(dust) + a.on(bub(x + 10, GROUND - 50, 'Did I ever tell you about Nicaragua?', g.m), 0.6, 2.9)
    },
    pane: ['task', (a, g) => a.kf(`<g transform="translate(${g.W - 200} 16) rotate(-3)"><rect width="180" height="64" fill="${PROPS.manila}" stroke="#8A7A5A"/><rect x="0" y="-6" width="60" height="8" fill="${PROPS.manila}"/>${C(10, 18, 'CLASSIFIED · PAYBACK', 9, '#7A3B2A', 'letter-spacing="1.2"')}${C(10, 38, 'NICARAGUA · 1984', 13, PROPS.paperInk, 'letter-spacing="1"')}<rect x="10" y="46" width="120" height="8" fill="#111"/></g>`, [[0, 'opacity:0;transform:translate(30px,-10px) rotate(8deg)'], [0.2, 'opacity:1;transform:translate(30px,-10px) rotate(8deg)'], [0.6, 'opacity:1;transform:none'], [2.8, 'opacity:1;transform:none'], [3, 'opacity:0']], { ease: ease('settle'), still: 'opacity="1"' })],
  },
  // T56 `payback` (alone): the slate PAYBACK · 1984 and seven brass stars light.
  payback: {
    band: (a, g) => {
      const x = Math.max(140, g.W * 0.3)
      let s = a.on(clapSlate(a, x, 34, 'PAYBACK', '1984 · THE TEAM BEFORE THE SEVEN', 0.3), 0, 2.5)
      for (let i = 0; i < 7; i++) s += a.kf(star(x + slateW('PAYBACK', '1984 · THE TEAM BEFORE THE SEVEN') + 20 + i * 18, 56, 7, '#D4A637'), [[0, 'opacity:.2'], [0.4 + i * 0.15, 'opacity:.2'], [0.45 + i * 0.15, 'opacity:1'], [2.5, 'opacity:1']], {})
      return s
    },
    pane: ['cred', (a, g) => {
      let s = ''
      for (let i = 0; i < 7; i++) s += a.kf(star(g.W - 150 + i * 20, 52, 8, '#D4A637'), [[0, 'opacity:0'], [0.2 + i * 0.15, 'opacity:0'], [0.25 + i * 0.15, 'opacity:1'], [2.4, 'opacity:1'], [2.5, 'opacity:0']], { still: 'opacity="1"' })
      return s + a.on(cap(g.W - 150, 82, 'PAYBACK · 1984', g.m), 0.3, 2.4)
    }],
  },
  // T57 `red thunder`: a VHS box slides in, tracking lines, Soldier Boy on the cover.
  redthunder: {
    band: (a, g) => a.mv(vhs(0, 0, 'RED THUNDER', '1983', SP.TB_SOLDIERBOY_BUST, 2.2), [[0, g.W + 10, 26], [0.5, g.W * 0.5, 26], [2.6, g.W * 0.5, 26], [3, g.W + 10, 26]], { still: 2, ease: 'cubic-bezier(.2,.9,.3,1)' }) + tracking(a, g),
    pane: ['log', (a, g) => tracking(a, g) + a.on(cap(44, 60, 'RED THUNDER · 1983 · TRACKING…', g.m), 0.2, 2.9)],
  },
  // T58 `vought classic`: the PRESS RELEASES stack gets the gold VOUGHT CLASSIC ribbon; gone, never forgotten.
  vclassic: {
    band: (a, g) => a.on(`<g transform="translate(14 ${CRAWL_Y})"><rect width="116" height="12" fill="#C9A13B"/>${C(8, 9.5, 'VOUGHT CLASSIC', 9, '#0A1430', 'letter-spacing="1.2"')}</g>`, 0.1, 3.9),
    pane: ['task', (a, g) => a.kf(`<g transform="translate(${g.W / 2} ${g.H - 40}) rotate(-4)">${ribbon(-110, 4, 220, 'VOUGHT CLASSIC', '#C9A13B', '#0A1430', 12)}${T(0, 26, 'gone, never forgotten', 11, 400, '#F4F1E8', 'text-anchor="middle" font-style="italic"')}</g>`, [[0, 'opacity:0;transform:scaleX(.2)'], [0.4, 'opacity:1;transform:none'], [3.6, 'opacity:1'], [4, 'opacity:0']], { c: true })],
  },
  // T59 `truthbomb`: a little TV with the title card; a cartoon bomb's fuse fizzles out. No boom.
  truthbomb: {
    band: (a, g) => {
      const x = g.W * 0.4
      return a.on(tv(x, 26, 'TRUTHBOMB'), 0, 3) + a.on(`<g transform="translate(${r1(x + 76)} 64)"><circle r="10" fill="#1A1C22"/><rect x="-3" y="-14" width="6" height="5" fill="#5A5A60"/><path d="M0 -14q4 -6 10 -4" fill="none" stroke="#C9C2B0" stroke-width="1.4"/></g>`, 0.4, 3) + a.kf(`<circle cx="${r1(x + 86)}" cy="46" r="3" fill="#FFB43A"/>`, [[0, 'opacity:0'], [0.6, 'opacity:1'], [0.8, 'opacity:.5'], [1.0, 'opacity:1'], [1.2, 'opacity:.5'], [1.6, 'opacity:0'], [3, 'opacity:0']], { still: 'opacity="0"' }) + a.on(T(x + 96, 44, 'pfft.', 12, 700, '#FFFFFF', 'font-style="italic"'), 1.6, 2.9)
    },
    pane: ['log', (a, g) => a.on(tv(g.W - 100, 44, 'TRUTHBOMB', 3), 0.2, 2.9, { fade: 0.3 })],
  },
  // T60 `7spn`: the scoreboard chip for 6 s (the band draws the real one when a run is on record); the pane's sports bug.
  scoreboard: {
    band: (a, g) => {
      if (scoreAt(g.at)) return ''
      const rw = g.W < 1100 ? 62 : 100
      const x = (g.W >= 520 ? g.W - 20 - rw * 3 - 18 - 10 : g.W - 14) - 96
      return a.on(`<rect x="${r1(x)}" y="42" width="96" height="16" rx="2" fill="#0B1020" stroke="#C9A13B"/><rect x="${r1(x)}" y="42" width="27" height="16" rx="2" fill="${PROPS.hero}"/>${C(x + 4, 53.5, '7SPN', 8.5, '#FFFFFF', 'letter-spacing=".6"')}${C(x + 32, 53.5, 'NO GAMES YET', 8.5, '#BCC6DE', 'letter-spacing=".6"')}`, 0, 6)
    },
    pane: ['log', (a, g) => a.on(`<rect x="44" y="46" width="92" height="18" rx="2" fill="#0B1020" stroke="#C9A13B"/><rect x="44" y="46" width="30" height="18" rx="2" fill="${PROPS.hero}"/>${C(48, 59, '7SPN', 9, '#FFFFFF', 'letter-spacing=".6"')}${C(80, 59, 'GAME DAY', 9, '#F0D27A', 'letter-spacing="1"')}`, 0, 6)],
  },
}
/** The band acts whose people and props cross the band's text get a soft scrim behind them, so they read. */
const SCRIM = new Set(['diabolical', 'whatever', 'timothy', 'laserbaby', 'dance', 'joel', 'blink', 'turbo', 'training', 'bravemaeve', 'noirmode', 'vivant', 'dolphin', 'ambrosius', 'americanhero', 'rockmykiss', 'knight', 'realheroes', 'storage', 'godolkin', 'terror', 'hometeamers', 'starlighters', 'savingamerica', 'tots', 'planetvought', 'clara', 'walk', 'nicaragua', 'payback', 'redthunder', 'truthbomb', 'pharma', 'ice'])
const TABLE_CAP: Record<string, string> = { americanhero: 'AMERICAN HERO · VOTING OPEN', realheroes: 'YOU GUYS ARE THE REAL HEROES', godolkin: 'GOD U. · #THINKBRINK', fullroster: 'FULL ROSTER · ALL SEVEN SEATS' }
const EXPO = ['TRAINING A-TRAIN', 'A-TRAIN: INTO THE MULTIVERSE', 'THE SEVEN: REBORN', 'G-MEN: WORLD WAR', 'GODS & DOLPHINS', 'THE SEVEN RETURNS', 'SECRETS OF ATLANTIS', 'THE SEVEN FOREVER']
const box = (x: number, y: number, c: string, label: string, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect width="44" height="28" rx="1.5" fill="${c}"/><rect x="3" y="3" width="38" height="8" fill="#F4F1E8"/>${C(22, 9.4, 'MAEVE', 6.5, '#1A1C22', 'text-anchor="middle" letter-spacing=".6"')}${C(22, 22, label, 6.5, '#FFFFFF', 'text-anchor="middle" letter-spacing=".4"')}</g>`
const vote = (a: Act, x: number, y: number) => `<rect x="${r1(x)}" y="${r1(y)}" width="100" height="12" rx="2" fill="#0B1020" stroke="#C9A13B"/>${a.kf(`<rect x="${r1(x + 2)}" y="${r1(y + 2)}" width="96" height="8" rx="1" fill="#F0D27A"/>`, [[0, 'transform:scaleX(0)'], [0.4, 'transform:scaleX(0)'], [3, 'transform:scaleX(.8)'], [5, 'transform:scaleX(.86)']], { origin: `${r1(x + 2)}px 0` })}${C(x + 50, y + 10, 'VOTE', 8, '#0A1430', 'text-anchor="middle" letter-spacing="1.2"')}`
const unfurl = (a: Act, g: Geo, y: number, text: string, t1: number) => {
  const w = Math.min(g.W - 60, condW(text, 12, 1.4) + 70)
  const x = (g.W - w) / 2
  const flag = `<rect x="${r1(x + 10)}" y="${y - 9}" width="4" height="4" fill="#B22234"/><rect x="${r1(x + 15)}" y="${y - 9}" width="4" height="4" fill="#FFFFFF"/><rect x="${r1(x + 20)}" y="${y - 9}" width="4" height="4" fill="#2C4384"/>`
  return a.kf(`${ribbon(x, y, w, text, '#B22234', '#FFFFFF', 12)}${flag}`, [[0, 'transform:scaleX(0)'], [0.1, 'transform:scaleX(0)'], [0.6, 'transform:none'], [t1 - 0.2, 'opacity:1'], [t1, 'opacity:0']], { origin: `${r1(g.W / 2)}px 0` })
}
const neon = (a: Act, x: number, y: number) => a.kf(`<g transform="translate(${r1(x)} ${r1(y)})"><rect width="200" height="34" rx="6" fill="#140A24" stroke="#FF6FD8" stroke-width="2"/>${C(100, 24, 'PLANET VOUGHT', 16, '#FF9BE6', 'text-anchor="middle" letter-spacing="3" stroke="#FF6FD8" stroke-width=".6"')}${T(100, 46, 'Lunch at Planet Vought', 10.5, 400, '#FF9BE6', 'text-anchor="middle" font-style="italic"')}</g>`, [[0, 'opacity:0'], [0.3, 'opacity:1'], [0.4, 'opacity:.1'], [0.55, 'opacity:1'], [0.65, 'opacity:.2'], [0.8, 'opacity:1'], [3.7, 'opacity:1'], [4, 'opacity:0']], {})
const tracking = (a: Act, g: Geo) => {
  let s = ''
  for (let i = 0; i < 3; i++) s += a.mv(`<rect width="${g.W}" height="${3 + i}" fill="#FFFFFF" opacity="${0.18 + i * 0.06}"/><rect y="${4 + i}" width="${g.W}" height="1" fill="#E04FA0" opacity=".4"/>`, [[0, 0, -10], [0.2 + i * 0.3, 0, -10], [1.4 + i * 0.3, 0, g.H + 10], [3, 0, g.H + 10]], { still: 0 })
  return s
}
const walkLine = (a: Act, g: Geo, s: number, y: number, ms: number) => {
  const crew5: [any, boolean][] = [[SP.TB_BUTCHER_WALK, true], [SP.TB_HUGHIE_WALK, true], [SP.TB_FRENCHIE, false], [SP.TB_KIMIKO, false], [null, false]]
  let out = ''
  crew5.forEach(([sp, walks], i) => {
    const dx = -i * 34 * s - (i === 4 ? 6 : 0)
    const sc = (1.6 * s) / 0.86
    const body = sp ? `<g class="tqb">${feet(sp, s)}</g>` : dog(-9 * sc, -12 * sc, 'walk', sc)
    void walks
    out += a.mv(body, [[0, dx - 30, y], [ms, g.W + 200 + dx, y]], { still: 0 })
  })
  return out
}
/** The DEEPFAKE? check on the band's task title: a broadcast censor mosaic pixelates it, coarse, then fine ("enhance"), then the
 *  title reads clean again, under a tiny DEEPFAKE? tag. A TV censor's pixels in the mode's own tones (never an RGB split). */
const deepfakeTear = (a: Act, g: Geo) => {
  const t = clip(g.task ?? '', 15, g.titleW ?? 300, 0, true)
  const tw = Math.min(g.titleW ?? 300, sansW(t, 15, 0, true))
  if (!t) return a.on(cap(64, 54, 'DEEPFAKE?', g.m, { red: true }), 0.1, 2.4)
  const P = pal(g.m)
  const tones = [P.tile, P.track, P.track, P.line, P.muted, P.aT, P.aT, P.sub]
  const id = `tbmz${Math.round(a.at) % 1_000_000}`
  // One tile of `cols` by `rows` cells, each a seeded tone, so the mosaic repeats only every few cells.
  const tile = (n: string, cell: number, cols: number, rows: number) => {
    let s = ''
    for (let i = 0; i < cols * rows; i++) s += `<rect x="${r1((i % cols) * cell)}" y="${r1(Math.floor(i / cols) * cell)}" width="${cell}" height="${cell}" fill="${tones[Math.floor(unit(`${n}|${i}`) * tones.length) % tones.length]}"/>`
    return `<pattern id="${n}" width="${r1(cols * cell)}" height="${r1(rows * cell)}" x="62" y="41" patternUnits="userSpaceOnUse">${s}</pattern>`
  }
  const box = (n: string) => `<rect x="62" y="41" width="${r1(tw + 4)}" height="18" fill="url(#${n})"/>`
  const coarse = a.kf(box(`${id}a`), [[0, 'opacity:0'], [0.15, 'opacity:1'], [0.9, 'opacity:1'], [0.95, 'opacity:0'], [2.5, 'opacity:0']], { still: 'opacity="0"' })
  const fine = a.kf(box(`${id}b`), [[0, 'opacity:0'], [0.9, 'opacity:0'], [0.95, 'opacity:1'], [1.7, 'opacity:1'], [2.0, 'opacity:0'], [2.5, 'opacity:0']], { still: 'opacity="0"' })
  return `<defs>${tile(`${id}a`, 9, 5, 2)}${tile(`${id}b`, 4.5, 6, 4)}</defs>${coarse}${fine}${a.on(cap(64 + tw + 10, 36, 'DEEPFAKE?', g.m, { z: 9, red: true }), 0.2, 2.4)}`
}

// ---------------------------------------------------------------- the PR SPIN title glitch (plan row 11): every ~10 min or on a failed test
export const SPIN_WORDS: [RegExp, string][] = [[/\bbugs?\b/i, 'feature'], [/\bcrash(?:es|ed)?\b/i, 'pause'], [/\berrors?\b/i, 'learning moment'], [/\bfail(?:s|ed|ing|ure)?\b/i, 'setback'], [/\bleaks?\b/i, 'exclusive'], [/\bbroken\b/i, 'evolving'], [/\bdelete[sd]?\b/i, 'sunset']]
export const SPIN_MS = 2_500
/** The title SPIN: the first "bad" word struck through with its PR word written above it; with none, the DEEPFAKE? tear. */
export const titleSpin = (W: number, task: string, titleW: number, m: Mode, at: number): string => {
  const a = new Act('spin', SPIN_MS, at)
  const g: Geo = { W, H: 148, m, at, on: 'band', task, titleW }
  const t = clip(task, 15, titleW, 0, true)
  const hit = SPIN_WORDS.map(([re, w]) => ({ m: re.exec(t), w })).find(h => h.m)
  if (!hit?.m) return a.done(deepfakeTear(a, g)).replace('data-egg="act-spin"', 'data-egg="spin"')
  const x0 = 64 + sansW(t.slice(0, hit.m.index), 15, 0, true)
  const ww = sansW(hit.m[0], 15, 0, true)
  const P = pal(m)
  const body = `<rect x="${r1(x0 - 1)}" y="48.4" width="${r1(ww + 2)}" height="2" fill="${m === 'book' ? PROPS.marker : P.laser}"/>${T(x0, 39, hit.w, 11, 700, m === 'book' ? '#EE7B70' : P.aT, 'font-style="italic"')}`
  return a.done(a.kf(body, [[0, 'opacity:0'], [0.1, 'opacity:1'], [2.3, 'opacity:1'], [2.5, 'opacity:0']], {})).replace('data-egg="act-spin"', 'data-egg="spin"')
}

// ---------------------------------------------------------------- the SPEED SMEAR (plan row 7): one ghost, never a trail of copies
/** While a job works with agents in flight: 3-6 thin speed lines streak left from the bust (more and longer with more in flight)
 *  and exactly ONE soft ghost of the bust about 6 px behind it. OFF BOOK: grey lines and an outline-only shimmer ghost. GOLD: one
 *  tinsel streak, no ghost. */
export const speedSmear = (m: Mode, inFlight: number): string => {
  const n = Math.max(3, Math.min(6, 1 + inFlight))
  const len = 10 + Math.min(4, inFlight) * 3
  if (m === 'gold') return `<g data-egg="smear" pointer-events="none"><rect x="${r1(18 - len)}" y="60" width="${len}" height="1.6" fill="#E2C25A" class="tb-glint"/></g>`
  const b = bustAt(m)
  const col = m === 'book' ? '#B9B0A0' : '#DDF3FF'
  let s = '<g data-egg="smear" pointer-events="none">'
  for (let i = 0; i < n; i++) s += `<rect x="${r1(16 - len - (i % 2) * 4)}" y="${r1(45 + i * (28 / n))}" width="${r1(len - (i % 3) * 3)}" height="1.2" rx=".6" fill="${col}" opacity="${(0.75 - i * 0.06).toFixed(2)}"/>`
  if (m === 'book') s += `<defs>${outlineDefs('tqsg', '#ECE6DA')}</defs><g filter="url(#tqsg)" opacity=".4" class="tb-pulse">${px(b.sp, b.x - 6, b.y, b.s)}</g>`
  else s += `<g opacity=".22">${px(b.sp, b.x - 6, b.y, b.s)}</g>`
  return `${s}</g>`
}

// ---------------------------------------------------------------- what the theme's extras ask for
/** The act `kind` drawn on a surface (the band, a pane card or THE TABLE), or '' when it has nothing there. */
export const actOn = (kind: string, g: Geo): string => {
  const row = rowOf(kind)
  if (!row) return ''
  const a = new Act(kind, actMs(kind), g.at)
  a.geo = { W: g.W, H: g.H, on: g.on }
  const P = pal(g.m)
  let body = ''
  if (g.on === 'band') body = row.band(a, g, P)
  else if (row.pane[0] === g.on || (row.pane[0] === 'all' && g.on !== 'table')) body = row.pane[1](a, g, P)
  // THE TABLE is only drawn with a crew: its acts also caption the FOCUS GROUP, so the pane always shows them.
  else if (row.pane[0] === 'table' && g.on === 'log') body = a.on(cap(44, 60, TABLE_CAP[kind] ?? kind.toUpperCase(), g.m), 0.2, a.ms / 1000 - 0.2)
  if (g.on === 'band' && body && (SCRIM.has(kind) || row.scrim)) body = a.on(row.scrim === 'stage' ? stageScrim(g.W, P) : dim(g.W, g.H, P, 0.72), 0, a.ms / 1000, { fade: 0.25 }) + body
  const sh = row.shake?.[g.on as 'band'] ?? (g.on !== 'band' && g.on !== 'table' ? row.shake?.all : undefined)
  let extra = ''
  if (sh) {
    const k = `xs${kind.slice(0, 4)}`
    extra = `@keyframes ${k}{${sh.map(([t, v]) => `${a.pc(t)}%{${v}}`).join('')}}.dl-cam{transform-box:fill-box;transform-origin:50% 50%}`
  }
  if (!body && !extra) return ''
  return a.done(body, extra)
}
/** The camera move a typed act puts on a whole panel (T2's beat drop, T5's float, T41's shrink): a CSS animation for the
 *  wrapper (see overlay.ts shakeInto), or ''. The keyframes ride in the act's own <style> on the same panel. */
export const actShake = (kind: string, on: 'band' | PaneCard, at: number): string => {
  const row = rowOf(kind)
  const sh = row?.shake?.[on] ?? (on !== 'band' ? row?.shake?.all : undefined)
  if (!sh) return ''
  return `xs${kind.slice(0, 4)} ${actMs(kind) / 1000}s linear both;animation-delay:calc(${pin(at)} + 0s)`
}
/** Every act kind this file draws (the tests walk them). */
export const ACT_KINDS = Object.keys(ROWS)
/** Where each act draws on the pane. */
export const paneOf = (kind: string): ActSurface | 'all' | undefined => rowOf(kind)?.pane[0]
/** Every kind phase 3 added (events, set pieces, roamers, THE AMBUSH). */
export const xKinds = (): string[] => Object.keys(XROWS)
// The props and the band geometry, for theboys-show.ts.
export const KIT = { poses, padPose, intertitle, actor, stillPose, arc, PH, runFrame, feet, GROUND, gaugeOf, bustAt, coverBust, dim, poof, censor, knight, octo, tentacle, dolphin, beaver, critter, dog, pig, can, flashbulb, cone, glass, vial, crowd, ribbon, vhs, tv, palm, frostEdge, runner, streak, heart, note }
void M
