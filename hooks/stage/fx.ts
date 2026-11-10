// Seeded particles: every burst an act fires. Each piece is a CUE on the act (a shared one-shot class plus `--t`),
// so a particle costs its own shapes and ~40 chars, never a keyframes block. Same seed, same particles: a redraw
// draws the very same burst. Colours are parameters: the kit gives tools, the skin gives the look.
//
//   fx.star3(act, 1.0, x, y, 18, { core: '#FFF', star: '#FFE066', ring: '#9FE8FF', ink: '#111' })
//   fx.confetti(act, 2.3, x, y, { n: 8, seed: 'krak1', colors: ['#FFF', '#FFE066'] })
//   act.win(0.5, 1.0, fx.speedLines(x, y, 26, 4, -1, '#FFF'))   // static markup: ride it in a window or a trail
import { hash } from './frames'
import { r1, r3 } from './timeline'
import type { Act } from './timeline'

/** A deterministic random stream for a seed (mulberry32 over the seed's hash): 0 <= n < 1. */
export const rng = (seed: string): (() => number) => {
  let a = hash(seed) || 1
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pts = (x: number, y: number, n: number, ro: number, ri: number): string =>
  Array.from({ length: n * 2 }, (_, i) => { const a = (Math.PI * i) / n - Math.PI / 2; const rr = i % 2 ? ri : ro; return `${r1(x + Math.cos(a) * rr)},${r1(y + Math.sin(a) * rr)}` }).join(' ')

/** The 3-frame impact star: a 4-point core (1 frame), an 8-point star (1 frame), a ring (1 frame). */
export const star3 = (act: Act, t: number, x: number, y: number, r: number, o: { core?: string; star?: string; ring?: string; ink?: string } = {}): string =>
  act.cue('blink', t, `<polygon points="${pts(x, y, 4, r * 0.5, r * 0.14)}" fill="${o.core ?? '#FFFFFF'}"/>`) +
  act.cue('blink', t + 0.06, `<polygon points="${pts(x, y, 8, r, r * 0.42)}" fill="${o.star ?? '#FFFFFF'}"${o.ink ? ` stroke="${o.ink}"` : ''}/>`) +
  act.cue('show', t + 0.12, `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r * 1.15)}" fill="none" stroke="${o.ring ?? '#FFFFFF'}"/>`, { d: 0.08 })

/** A full-panel flash of one frame (default) or `d` s, at opacity `a`. Keep big flashes rare and at most .35-.5. */
export const flash = (act: Act, t: number, o: { a?: number; color?: string; d?: number } = {}): string =>
  act.cue('show', t, `<rect width="${act.W}" height="${act.H}" fill="${o.color ?? '#FFFFFF'}" opacity="${o.a ?? 0.35}"/>`, { d: o.d ?? 0.06 })

/** A cloud puff that bursts out and fades: three overlapping circles. */
export const puff = (act: Act, t: number, x: number, y: number, o: { s?: number; fill?: string; ink?: string } = {}): string =>
  act.cue('burst', t, `<g transform="scale(${o.s ?? 1})" fill="${o.fill ?? '#D9D4C7'}"${o.ink ? ` stroke="${o.ink}"` : ''}><circle cx="-8" cy="1" r="5"/><circle cy="-3" r="6.5"/><circle cx="8" cy="1" r="4.5"/></g>`, { x, y })

/** Square confetti thrown outward at seeded angles. */
export const confetti = (act: Act, t: number, x: number, y: number, o: { n?: number; seed?: string; colors?: string[]; px?: number } = {}): string => {
  const R = rng(o.seed ?? `cf${t}${x}${y}`)
  const n = o.n ?? 6
  const cols = o.colors ?? ['#FFFFFF']
  const s = o.px ?? 2.5
  const sq = Array.from({ length: n }, (_, i) => { const a = (Math.PI * 2 * i) / n + R(); const r = 7 + R() * 5; return `<rect x="${r1(Math.cos(a) * r - s / 2)}" y="${r1(Math.sin(a) * r - s / 2)}" width="${s}" height="${s}" fill="${cols[i % cols.length]}"/>` }).join('')
  return act.cue('burst', t, sq, { x, y })
}

/** A flat dust donut that spreads from a landing. */
export const ring = (act: Act, t: number, x: number, y: number, o: { rx?: number; color?: string; w?: number } = {}): string => {
  const rx = o.rx ?? 16
  return act.cue('ring', t, `<ellipse rx="${rx}" ry="${r1(rx * 0.3)}" fill="none" stroke="${o.color ?? '#FFFFFF'}" stroke-width="${o.w ?? 2}"/>`, { x, y })
}

/** Speed lines: `n` strokes trailing from (x, y) in `dir` (-1 trails left), `len` long. Static: put it in a window. */
export const speedLines = (x: number, y: number, len: number, n: number, dir: 1 | -1, color: string, o: { gap?: number; op?: number; seed?: string } = {}): string => {
  const R = rng(o.seed ?? `sl${n}${len}`)
  let s = `<g opacity="${o.op ?? 0.8}" stroke="${color}" stroke-linecap="round">`
  for (let i = 0; i < n; i++) { const yy = y + (i - (n - 1) / 2) * (o.gap ?? 4); const l = len * (0.55 + 0.45 * R()); s += `<path d="M${r1(x)} ${r1(yy)}h${r1(-dir * l)}" stroke-width="${i % 2 ? 1 : 1.6}"/>` }
  return `${s}</g>`
}

/** Smoke: `n` grey clouds rising and swelling, staggered from `t` over `spread` s. */
export const smoke = (act: Act, t: number, x: number, y: number, o: { n?: number; seed?: string; colors?: string[]; d?: number; spread?: number; s?: number } = {}): string => {
  const R = rng(o.seed ?? `sm${t}${x}`)
  const n = o.n ?? 4
  const cols = o.colors ?? ['#9AA0A8', '#B6BBC2']
  const s = o.s ?? 1
  let out = ''
  for (let i = 0; i < n; i++) {
    const dx = (R() - 0.5) * 22 * s
    const r = (6 + R() * 6) * s
    out += act.cue('rise', t + (i / Math.max(1, n - 1)) * (o.spread ?? 0.5), `<circle r="${r1(r)}" fill="${cols[i % cols.length]}"/>`, { x: x + dx, y: y - R() * 6, d: o.d ?? 1.2 })
  }
  return out
}

/** Ground dust: small puffs kicked up along a line (a skid, a landing). */
export const dust = (act: Act, t: number, x: number, y: number, o: { n?: number; seed?: string; color?: string; dx?: number; s?: number } = {}): string => {
  const R = rng(o.seed ?? `du${t}${x}`)
  const n = o.n ?? 4
  let out = ''
  for (let i = 0; i < n; i++) out += act.cue('rise', t + i * 0.06, `<circle r="${r1((2.5 + R() * 2.5) * (o.s ?? 1))}" fill="${o.color ?? '#C9C2B0'}"/>`, { x: x + i * (o.dx ?? -8), y, d: 0.6 })
  return out
}

/** Sparks: short streaks thrown out radially (the group bursts, so they fly), `n` at seeded angles. */
export const sparks = (act: Act, t: number, x: number, y: number, o: { n?: number; seed?: string; color?: string; len?: number } = {}): string => {
  const R = rng(o.seed ?? `sp${t}${x}`)
  const n = o.n ?? 7
  const L = o.len ?? 5
  let d = ''
  for (let i = 0; i < n; i++) { const a = (Math.PI * 2 * i) / n + R() * 0.8; const r0 = 3 + R() * 3; d += `M${r1(Math.cos(a) * r0)} ${r1(Math.sin(a) * r0)}l${r1(Math.cos(a) * L)} ${r1(Math.sin(a) * L)}` }
  return act.cue('burst', t, `<path d="${d}" stroke="${o.color ?? '#FFE9A8'}" stroke-width="1.2" stroke-linecap="round"/>`, { x, y, d: 0.35 })
}

/** Debris: chunks that fall and fade (rubble from a wall, glass). */
export const debris = (act: Act, t: number, x: number, y: number, o: { n?: number; seed?: string; colors?: string[]; spread?: number } = {}): string => {
  const R = rng(o.seed ?? `db${t}${x}`)
  const n = o.n ?? 5
  const cols = o.colors ?? ['#8A8F98']
  let out = ''
  for (let i = 0; i < n; i++) { const w = 2 + R() * 3; out += act.cue('drop', t + R() * 0.15, `<rect width="${r1(w)}" height="${r1(w * 0.7)}" fill="${cols[i % cols.length]}" transform="rotate(${Math.round(R() * 90)})"/>`, { x: x + (R() - 0.5) * (o.spread ?? 24), y: y + (R() - 0.5) * 8 }) }
  return out
}

/** KO stars: three stars circling a point from t0 to t1 (a twirl every 1.2 s, in 12 steps). */
export const koStars = (act: Act, t0: number, t1: number, x: number, y: number, o: { color?: string; ink?: string; s?: number } = {}): string => {
  const col = o.color ?? '#FFE066'
  const star = (cx: number, cy: number, r: number): string => `<polygon points="${pts(cx, cy, 5, r, r * 0.45)}" fill="${col}"${o.ink ? ` stroke="${o.ink}" stroke-width=".8"` : ''}/>`
  const turns = Math.max(1, Math.ceil((t1 - t0) / 1.2))
  act.extraCss.add('@keyframes sg-twirl{to{transform:rotate(360deg)}}')
  const spin = `<g class="sg-c" style="animation:sg-twirl 1.2s steps(12) ${turns};animation-delay:calc(var(--s) + ${r3(act.warp(t0))}s)">${star(-11, -1, 3.2)}${star(5, -4, 2.6)}${star(7, 3, 2.2)}</g>`
  return act.win(t0, t1, `<g transform="translate(${r1(x)} ${r1(y)})${o.s && o.s !== 1 ? ` scale(${o.s})` : ''}"><ellipse rx="12" ry="4" fill="none" stroke="${col}" stroke-dasharray="3 3" opacity=".8"/>${spin}</g>`)
}
