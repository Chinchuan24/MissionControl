// Transitions: the clip wipe, the slit bar, the iris, the title-card slam, the shard burst, and the generic SKIN SWITCH
// (the band and the pane wipe from the old skin to the new one). Lifted from Edgerunners 2's mode transition
// (edgerunners2-duet.ts `transition`: wipe, flood front, shards) and Invincible's era swap (invincible-eggs.ts `swap`:
// the flash, the title slam, the veil). Tools, not looks: every colour, word and direction is a parameter.
//
// Every piece is bound to an `Act` (pinned, plays once, part of the act's anim/still pair). No blend modes: ER2's hue
// veil needs `mix-blend-mode`, which goes flat inside any act (probe.md); a wipe here uses a plain colour veil instead.
//
//   const act = new Act({ id: 'boys-cut', ms: 900, at, W, H })
//   body += wipe.clip(act, 0, 0.5, veil, { dir: 'r', mode: 'out' })      // the veil wipes away to the right
//   body += wipe.bar(act, 0, 0.5, { dir: 'r', color: ACCENT })            // a hot bar rides the edge
//   body += wipe.iris(act, 0.2, 0.7, { cx: 40, cy: H / 2, mode: 'in', color: '#000' })
//   body += wipe.titleCard(act, 0.3, 1.6, { text: 'ROUND 2', x: W / 2, y: H / 2, size: 28, fill: '#FFE066', ink: '#111' })
//   body += wipe.shards(act, 0.1, { W, H, n: 8, seed: 'cut', colors: [A, B] })
import { esc } from './budget'
import { rng } from './fx'
import { Act, r1, r3 } from './timeline'
import type { Ease } from './ease'

export type Dir = 'l' | 'r' | 'u' | 'd'
/** clip-path inset() for a wipe `dir` at progress p (0 = all shown, 1 = all gone), the edge travelling toward `dir`. */
const inset = (dir: Dir, p: number): string => {
  const v = `${r1(p * 100)}%`
  return dir === 'r' ? `inset(0 0 0 ${v})` : dir === 'l' ? `inset(0 ${v} 0 0)` : dir === 'd' ? `inset(${v} 0 0 0)` : `inset(0 0 ${v} 0)`
}
/** A transparent rect that pins a group's box to the panel (a clip's inset() is measured on the group's box). */
const box = (W: number, H: number): string => `<rect width="${W}" height="${H}" fill="none"/>`

/**
 * A clip wipe: `svg` (drawn over the whole act's W x H) is wiped away (`mode: 'out'`) or wiped on (`'in'`) between t0
 * and t1, its edge travelling toward `dir`. Before t0 it is fully shown ('out') or hidden ('in'); after t1 the other way.
 */
export const clip = (act: Act, t0: number, t1: number, svg: string, o: { dir?: Dir; mode?: 'in' | 'out'; ease?: Ease | string } = {}): string => {
  const dir = o.dir ?? 'r'
  const out = (o.mode ?? 'out') === 'out'
  const a = inset(dir, out ? 0 : 1)
  const b = inset(dir, out ? 1 : 0)
  // 'in' wipes on from the far side: the shown part grows from the edge it starts at.
  const opp: Record<Dir, Dir> = { r: 'l', l: 'r', d: 'u', u: 'd' }
  const A = out ? a : inset(opp[dir], 1)
  const B = out ? b : inset(opp[dir], 0)
  return act.kf(`${box(act.W, act.H)}${svg}`, [[0, `clip-path:${A}`], [t0, `clip-path:${A}`], [t1, `clip-path:${B}`], [act.T - act.off, `clip-path:${B}`]], { ease: o.ease ?? 'whip' })
}

/**
 * The slit bar: a hot line with a soft glow crossing the panel toward `dir` from t0 to t1 (rides a wipe's edge when it
 * has the same times and `ease`; both default to 'whip'). Gradients only, no blur filter.
 */
export const bar = (act: Act, t0: number, t1: number, o: { dir?: Dir; color?: string; core?: string; glow?: number; ease?: Ease | string } = {}): string => {
  const dir = o.dir ?? 'r'
  const horiz = dir === 'r' || dir === 'l'
  const L = horiz ? act.W : act.H
  const g = o.glow ?? 14
  const id = `${act.p}bg${act.k()}`
  const col = o.color ?? '#FFFFFF'
  const grad = `<linearGradient id="${id}"${horiz ? '' : ' x2="0" y2="1"'}><stop offset="0" stop-color="${col}" stop-opacity="0"/><stop offset=".5" stop-color="${col}" stop-opacity=".6"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient>`
  const shape = horiz
    ? `<rect x="${-g}" width="${g * 2}" height="${act.H}" fill="url(#${id})"/><rect x="-1" width="2" height="${act.H}" fill="${o.core ?? '#FFFFFF'}"/>`
    : `<rect y="${-g}" width="${act.W}" height="${g * 2}" fill="url(#${id})"/><rect y="-1" width="${act.W}" height="2" fill="${o.core ?? '#FFFFFF'}"/>`
  const from = dir === 'r' || dir === 'd' ? 0 : L
  const to = L - from
  const at = (v: number): string => (horiz ? `translate(${r1(v)}px,0)` : `translate(0,${r1(v)}px)`)
  const end = act.T - act.off
  return `<defs>${grad}</defs>${act.kf(shape, [[0, `opacity:0;transform:${at(from)}`], [t0, `opacity:0;transform:${at(from)}`], [t0 + 0.01, `opacity:1;transform:${at(from)}`], [t1 - 0.01, `opacity:1;transform:${at(to)}`], [t1, `opacity:0;transform:${at(to)}`], [end, `opacity:0;transform:${at(to)}`]], { ease: o.ease ?? 'whip' })}`
}

/**
 * The iris: the panel covered in `color` with a round hole at (cx, cy) that opens ('in': the scene appears) or closes
 * ('out': the scene goes) between t0 and t1. A mask of a scaled circle; `r` defaults to the farthest corner.
 */
export const iris = (act: Act, t0: number, t1: number, o: { cx: number; cy: number; mode?: 'in' | 'out'; color?: string; r?: number }): string => {
  const { W, H } = act
  const R = o.r ?? Math.ceil(Math.max(Math.hypot(o.cx, o.cy), Math.hypot(W - o.cx, o.cy), Math.hypot(o.cx, H - o.cy), Math.hypot(W - o.cx, H - o.cy)))
  const id = `${act.p}ir${act.k()}`
  const opening = (o.mode ?? 'in') === 'in'
  const s0 = opening ? 0.001 : 1
  const s1 = opening ? 1 : 0.001
  const end = act.T - act.off
  const hole = act.kf(`<circle cx="${r1(o.cx)}" cy="${r1(o.cy)}" r="${R}" fill="#000000"/>`, [[0, `transform:scale(${s0})`], [t0, `transform:scale(${s0})`], [t1, `transform:scale(${s1})`], [end, `transform:scale(${s1})`]], { ease: opening ? 'settle' : 'anticipate', origin: `${r1(o.cx)}px ${r1(o.cy)}px` })
  // After it opens, the cover goes (a fully open iris must not keep a ring at the corners).
  const cover = `<rect width="${W}" height="${H}" fill="${o.color ?? '#000000'}" mask="url(#${id})"/>`
  return `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#FFFFFF"/>${hole}</mask></defs>${opening ? act.on(cover, 0, t1) : act.on(cover, t0, end)}`
}

/**
 * A title card that slams down at t (scale 2.4, overshoot, rest) and stays to t1: a plate and one line of text (escaped).
 * `plate: false` draws the words alone. The text is centred on (x, y).
 */
export const titleCard = (act: Act, t: number, t1: number, o: { text: string; x: number; y: number; size?: number; fill?: string; ink?: string; plate?: string | false; font?: string; tilt?: number }): string => {
  const size = o.size ?? 22
  const w = Math.round(o.text.length * size * 0.62 + size)
  const h = Math.round(size * 1.5)
  const plate = o.plate === false ? '' : `<rect x="${r1(o.x - w / 2)}" y="${r1(o.y - h / 2)}" width="${w}" height="${h}" fill="${o.plate ?? '#111111'}"${o.ink ? ` stroke="${o.ink}" stroke-width="2"` : ''}/>`
  const text = `<text x="${r1(o.x)}" y="${r1(o.y + size * 0.36)}" text-anchor="middle" font-family="${o.font ?? 'ui-sans-serif,system-ui,sans-serif'}" font-size="${size}" font-weight="900" fill="${o.fill ?? '#FFFFFF'}"${o.ink && o.plate === false ? ` stroke="${o.ink}" stroke-width="3" paint-order="stroke"` : ''}>${esc(o.text)}</text>`
  const card = o.tilt ? `<g transform="rotate(${o.tilt} ${r1(o.x)} ${r1(o.y)})">${plate}${text}</g>` : `${plate}${text}`
  return act.slam(card, t, t1)
}

const SHARD_CSS = '.sg-shard{opacity:0;animation:sg-shard var(--d,.7s) cubic-bezier(.2,.9,.2,1) both;animation-delay:calc(var(--s) + var(--t))}@keyframes sg-shard{0%{opacity:0;transform:translate(var(--dx),var(--dy))}25%,65%{opacity:1;transform:none}100%{opacity:0;transform:none}}.sg-shard-o{animation-name:sg-shard-o}@keyframes sg-shard-o{0%{opacity:0;transform:none}25%,60%{opacity:1;transform:none}100%{opacity:0;transform:translate(var(--dx),var(--dy))}}'
/**
 * The shard burst: `n` seeded chamfered slivers at the four edges, flying in from outside ('in') or out ('out') from t.
 * One shared class: each shard is a path and ~70 chars of custom properties.
 */
export const shards = (act: Act, t: number, o: { n?: number; seed?: string; colors?: string[]; mode?: 'in' | 'out'; d?: number; spread?: number } = {}): string => {
  const { W, H } = act
  const R = rng(o.seed ?? `sh${t}`)
  const n = o.n ?? 8
  const cols = o.colors ?? ['#FFFFFF']
  act.extraCss.add(SHARD_CSS)
  let s = ''
  for (let i = 0; i < n; i++) {
    const edge = i % 4
    const len = 10 + R() * 32
    const th = 2 + R() * 3
    const p = R()
    const [x, y, w, h] = edge === 0 ? [p * (W - len), 1 + R() * 6, len, th] : edge === 1 ? [p * (W - len), H - 7 + R() * 5, len, th] : edge === 2 ? [1 + R() * 6, p * (H - len), th, len] : [W - 7 + R() * 5, p * (H - len), th, len]
    const c = Math.min(w, h) * 0.6
    const d = `M${r1(x + c)} ${r1(y)}H${r1(x + w)}V${r1(y + h - c)}L${r1(x + w - c)} ${r1(y + h)}H${r1(x)}V${r1(y + c)}z`
    const dx = edge === 2 ? -30 : edge === 3 ? 30 : 0
    const dy = edge === 0 ? -30 : edge === 1 ? 30 : 0
    s += `<path class="sg-shard${o.mode === 'out' ? ' sg-shard-o' : ''}" d="${d}" fill="${cols[i % cols.length]}" fill-opacity="${r1(0.6 + R() * 0.4)}" style="--t:${r3(act.warp(t + R() * (o.spread ?? 0.35)))}s;--dx:${dx}px;--dy:${dy}px${o.d ? `;--d:${r3(o.d)}s` : ''}"/>`
  }
  return s
}

// ---------------------------------------------------------------- the skin switch
/** One look of a skin, as the switch needs it. */
export type SwitchLook = { bg: string; accent: string; ink?: string }
/**
 * A skin's own flavour of the switch. Every field is optional: what is left out uses the default. `extra` adds markup on
 * the act (a stamp, the skin's own prop); keep it inside the wipe budget (8 k band, 5 k card).
 */
export type SwitchFlavour = { dir?: Dir; ms?: number; veil?: number; bar?: boolean; shards?: number; extra?: (act: Act, surface: 'band' | 'pane') => string }
/** The default switch length: well under a second. */
export const SWITCH_MS = 700
/** The default veil's opacity: the panel and its numbers show through it. */
export const SWITCH_VEIL = 0.55
/** Pane cards that get the switch (the top of the pane, where the eye is), and the cascade between two cards. */
export const SWITCH_CARDS = 4
export const SWITCH_STAGGER = 0.06

/**
 * The generic skin switch, over a panel ALREADY drawn in the new skin: a veil of the new skin's own ground wipes away
 * ('settle': it moves at once and glides to rest), with a bar in the new accent on its edge and a few shards. The veil is
 * see-through (`veil`, default .55), so the working numbers stay readable through the whole switch; a full cover read as
 * a blank panel for the first 150 ms. Only the NEW skin's colours
 * by default (a skin with a strict palette, like GENE's greys or Caliper's faces, never shows another skin's colour); `from`
 * is there for a flavour that wants the old look. The pane's cards cascade (`i`). Reduced motion: no wipe; a 2 px rule in
 * the new accent marks the change for the act's life. `at` is the switch time (pinned). Returns the layer (an `Act.done`),
 * to splice before `</svg>`. One big act at a time: the caller skips it while a fight or another act is drawn.
 */
export const skinSwitch = (o: { W: number; H: number; at: number; surface: 'band' | 'pane'; from: SwitchLook; to: SwitchLook; i?: number; flavour?: SwitchFlavour }): string => {
  const f = o.flavour ?? {}
  const i = o.i ?? 0
  const band = o.surface === 'band'
  const lag = band ? 0 : i * SWITCH_STAGGER
  const ms = (f.ms ?? SWITCH_MS) + Math.round(lag * 1000)
  const act = new Act({ id: `skin-switch|${o.surface}|${i}|${o.W}x${o.H}`, ms, at: o.at, W: o.W, H: o.H })
  const dir = f.dir ?? 'r'
  const T = ms / 1000
  const t0 = lag + 0.04
  const t1 = T - 0.06
  let body = ''
  // A veil of the new ground pulled off the new panel. See-through: motion never hides the working numbers.
  const ease: Ease = 'settle'
  body += clip(act, t0, t1, `<rect width="${o.W}" height="${o.H}" fill="${o.to.bg}" opacity="${f.veil ?? SWITCH_VEIL}"/><rect y="${o.H - 2}" width="${o.W}" height="2" fill="${o.to.accent}" opacity=".8"/>`, { dir, ease })
  if (f.bar !== false) body += bar(act, t0, t1, { dir, color: o.to.accent, core: o.to.ink ?? o.to.accent, ease })
  const n = f.shards ?? (band ? 6 : i === 0 ? 4 : 0)
  if (n) body += shards(act, t0 + 0.1, { n, seed: `sw${o.surface}${i}`, colors: [o.to.accent, o.to.ink ?? o.to.accent], d: 0.45, spread: 0.2 })
  if (f.extra) body += f.extra(act, o.surface)
  const still = `<rect width="${o.W}" height="2" fill="${o.to.accent}"/>`
  return act.done(body, still)
}
/** Splices a layer into an Svg source, just before its closing tag. */
export const into = (src: string, layer: string): string => {
  const end = src.lastIndexOf('</svg>')
  return end < 0 ? src : `${src.slice(0, end)}${layer}${src.slice(end)}`
}
/** The width and height an Svg source declares on its root (viewBox first), or undefined. */
export const sizeOf = (src: string): { W: number; H: number } | undefined => {
  const root = /<svg\b[^>]*>/.exec(src)?.[0] ?? ''
  const vb = /viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/.exec(root)
  if (vb) return { W: Number(vb[1]), H: Number(vb[2]) }
  const w = /\swidth="([\d.]+)"/.exec(root)
  const h = /\sheight="([\d.]+)"/.exec(root)
  return w && h ? { W: Number(w[1]), H: Number(h[1]) } : undefined
}
