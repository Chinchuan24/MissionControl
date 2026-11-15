// The plain skins' motion (Default and Crab Classic): quiet state feedback, never a show. Every piece is pinned to the moment
// it reacts to (`pin` in smooth.ts), so a redraw resumes it and an old moment draws its end state: an entrance plays once.
// Under reduced motion each class stops dead on its resting look (the element's own attributes are the still frame).
//   Default and Crab Classic   the done check draws itself, cards rise in once on open, a failed pill shakes once
//   Crab Classic               a new crab scuttles in sideways (and out, then back dim, when it ends), the boss's claw clack
//                              and bubbles on a job done, and the rare claw-off (choreo, through the director)
import { pin } from './smooth'
import { Act } from './stage/timeline'
import { Fight } from './stage/choreo'
import { Director, localOffsetMs } from './stage/director'
import { fightLane } from './stage/choreo'
import { CRAB_COIN, crabPose } from './cast'
import type { CrabPose } from './cast'
import type { SwitchFlavour } from './stage/wipe'

/** How long after its moment a reaction is still drawn with its animation (after that, the plain resting markup). */
export const FRESH_MS = 1500
export const fresh = (at: number | undefined, now: number): at is number => at !== undefined && now >= at - 1000 && now < at + FRESH_MS
const dl = (at: number, ms = 0): string => `animation-delay:${pin(at + ms)}`

// The keyframes. Each `from` holds the moving state; the element's own attributes are its rest (and the reduced-motion still).
export const CL_CSS = `.cl-chk{stroke-dasharray:14;animation:cl-chk .26s cubic-bezier(.23,1,.32,1) both}@keyframes cl-chk{from{stroke-dashoffset:14}to{stroke-dashoffset:0}}
.cl-rise{animation:cl-rise .22s cubic-bezier(.23,1,.32,1) both}@keyframes cl-rise{from{opacity:0;transform:translateY(4px)}}
.cl-shk{animation:cl-shk .28s linear both}@keyframes cl-shk{16%{transform:translateX(-2px)}33%{transform:translateX(2px)}50%{transform:translateX(-2px)}66%{transform:translateX(2px)}83%{transform:translateX(-1px)}}
.cl-in{animation:cl-in .38s cubic-bezier(.23,1,.32,1) both}@keyframes cl-in{from{opacity:0;transform:translateX(-14px)}}
.cl-out{animation:cl-out .7s both}@keyframes cl-out{0%{transform:none;opacity:1;animation-timing-function:cubic-bezier(.5,0,1,1)}40%{transform:translateX(14px);opacity:0}41%{transform:none;opacity:0;animation-timing-function:ease-out}100%{opacity:1}}
.cl-in .la,.cl-in .lb{animation-duration:.25s!important}
@media (prefers-reduced-motion: reduce){.cl-chk,.cl-rise,.cl-shk,.cl-in,.cl-out{animation:none!important}}`

/** A check mark (a 10 by 8 tick from its left end at x, y) that strokes itself in, pinned to `at`; plain when `at` is stale. */
export const checkMark = (x: number, y: number, color: string, at?: number, now = 0, width = 1.8): string =>
  `<path d="M${x} ${y}l3.5 3.5 6.5-7" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${fresh(at, now) ? ` class="cl-chk" style="${dl(at)}"` : ''}/>`
/** The failed pill's one shake, pinned to the failure. */
export const shake = (svg: string, at: number | undefined, now: number): string => (fresh(at, now) ? `<g class="cl-shk" style="${dl(at)}">${svg}</g>` : svg)
/** A moment that has come and is still fresh (no drawing ahead of it). */
const since = (at: number | undefined, now: number): at is number => at !== undefined && now >= at && now < at + FRESH_MS
/**
 * A crab scuttling in sideways at its spawn (.38 s from 14 px left, its legs at double speed: it reads as a scuttle, and the
 * first frame is the only empty one), or out and back (dim) when it ends; plain otherwise. Never drawn ahead of its moment:
 * a crab's clock a little ahead of the band's would otherwise hold it invisible (the entrance's first frame) until then.
 */
export const scuttle = (svg: string, a: { startedAt?: number; endedAt?: number; running: boolean }, now: number): string =>
  !a.running && since(a.endedAt, now) ? `<g class="cl-out" style="${dl(a.endedAt)}">${svg}</g>` : a.running && since(a.startedAt, now) ? `<g class="cl-in" style="${dl(a.startedAt)}">${svg}</g>` : svg

/**
 * A new crab scuttling in on its agent's pane card: the same entrance as the band's, but kept in the card for as long as the
 * agent runs (a finished, non-repeating animation costs nothing at rest), so the card is not sent again just to drop it (the
 * add-then-drop re-send is what once cost the 60-agent load test 6 k/s). The legs keep their own pace. Never ahead of its moment.
 */
export const SCUTTLE_CARD_CSS = '.cl-in{animation:cl-in .38s cubic-bezier(.23,1,.32,1) both}@keyframes cl-in{from{opacity:0;transform:translateX(-14px)}}@media (prefers-reduced-motion: reduce){.cl-in{animation:none!important}}'
export const scuttleCard = (svg: string, startedAt: number | undefined, now: number): string =>
  startedAt !== undefined && now >= startedAt ? `<style>${SCUTTLE_CARD_CSS}</style><g class="cl-in" style="${dl(startedAt)}">${svg}</g>` : svg

const RISE_CSS = '.cl-rise{animation:cl-rise .22s cubic-bezier(.23,1,.32,1) both}@keyframes cl-rise{from{opacity:0;transform:translateY(4px)}}@media (prefers-reduced-motion: reduce){.cl-rise{animation:none}}'
/** The pane cards that rise in on open: the top of the pane, where the eye is. */
export const RISE_CARDS = 6
export const RISE_STAGGER_MS = 40
/** One card's entrance: the whole card fades up 4 px, `i` cards down the cascade, pinned to the pane's open time. */
export const riseInto = (src: string, openAt: number, i: number, now: number): string => {
  const at = openAt + i * RISE_STAGGER_MS
  if (!fresh(at, now)) return src
  const root = /^<svg\b[^>]*>/.exec(src)?.[0]
  const end = src.lastIndexOf('</svg>')
  if (!root || end < 0) return src
  return `${root}<style>${RISE_CSS}</style><g class="cl-rise" style="${dl(at)}">${src.slice(root.length, end)}</g></svg>`
}

// ---------------------------------------------------------------- Crab Classic's done cheer: claw clack and bubbles
export const CLACK_MS = 1600
/** The raised claws' clack (CSS for the boss's `cka`/`ckb` claws, delayed by `--ck`). */
export const CLACK_CSS = `.cka,.ckb{transform-box:fill-box;transform-origin:50% 100%;animation:cka 1.4s cubic-bezier(.23,1,.32,1) both;animation-delay:var(--ck,0s)}.ckb{animation-name:ckb}
@keyframes cka{0%,100%{transform:none}14%,30%,44%,58%,84%{transform:translateY(-6px)}37%,51%{transform:translate(2px,-6px)}}
@keyframes ckb{0%,100%{transform:none}14%,30%,44%,58%,84%{transform:translateY(-6px)}37%,51%{transform:translate(-2px,-6px)}}
@media (prefers-reduced-motion: reduce){.cka,.ckb{animation:none}}`
/** The `--ck` delay for the boss group (pinned to the done time). */
export const clackVar = (at: number): string => `--ck:${pin(at)}`
/** Six bubbles rising from the boss (its box at x, y, `sc` pixels a crab pixel): an Act of cues, gone after 1.6 s. */
export const bubbles = (W: number, H: number, x: number, y: number, sc: number, at: number): string => {
  const act = new Act({ id: `crab-bubbles|${W}x${H}`, ms: CLACK_MS, at, W, H })
  const spots: [number, number, number][] = [[6, 0.15, 1.6], [24, 0.3, 2.1], [12, 0.45, 1.3], [27, 0.6, 1.8], [3, 0.75, 1.4], [18, 0.9, 1.9]]
  let body = ''
  for (const [dx, t, r] of spots) body += act.cue('rise', t, `<circle r="${r}" fill="#BFE7F2" fill-opacity=".18" stroke="#9FD8E8" stroke-width=".8"/><rect x="${-r * 0.5}" y="${-r * 0.6}" width=".8" height=".8" fill="#FFFFFF"/>`, { x: x + dx * sc, y: y + 4 * sc, d: 1 })
  return act.done(body, '')
}

// ---------------------------------------------------------------- the claw-off (Crab Classic's rare duel, band only)
export const CLAWOFF = 'claw-off'
export const CLAWOFF_MS = 4400
/** The director: one claw-off per 30-45 min, working only, with its replay name. */
export const crabDirector = (now = Date.now()): Director => fightLane(new Director('crab-classic', { dayOffsetMs: localOffsetMs(now) }), [{ id: CLAWOFF, ms: CLAWOFF_MS, replay: CLAWOFF }])
/** Where the duel may play: a strip of the band clear of every text, chip and crab (band coordinates). */
export type ClawRing = { x0: number; x1: number; y0: number; y1: number }
/** The smallest strip worth a duel (two crabs, a coin and the boss between them). */
export const CLAWOFF_MIN_W = 150
const POSES: CrabPose[] = ['idle', 'stepA', 'stepB', 'pinch', 'nip', 'salute', 'boss', 'bossSalute']
/**
 * The claw-off, 4.4 s: two crew crabs sidestep to a dropped token coin, pinch-pinch ("clk!"), one gets nudged and spins
 * once, the crowned boss drops in, both freeze and salute, and the coin pops into the boss's claw. Small (crab-size poses),
 * clipped to `ring`, fading in and out. Reduced motion: the salute, still.
 */
export const clawOff = (W: number, H: number, ring: ClawRing, at: number): string => {
  const act = new Act({ id: `clawoff|${W}x${H}`, ms: CLAWOFF_MS, at, W, H, K: 5 })
  for (const p of POSES) act.cast(p, crabPose(p), 0.5)
  act.cast('coin', CRAB_COIN, 0.5)
  const sc = Math.max(0.5, Math.min(0.8, (ring.y1 - ring.y0) / 30))
  const gy = Math.round((ring.y0 + ring.y1) / 2 + 1)
  const cx = Math.round((ring.x0 + ring.x1) / 2)
  const half = Math.min(70, (ring.x1 - ring.x0) / 2 - 12 * sc)
  const f = new Fight(act, { sc, ink: '#1F1E1D', word: '#F5C542', ghosts: false, font: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" })
  const reach = 22 * sc
  f.fighter('a', 'idle', cx - half, gy).fighter('b', 'idle', cx + half, gy, -1).fighter('k', 'boss', cx, ring.y0 - 20 * sc)
  // 1. the sidestep to the coin, legs in turn
  f.at(0.25).approach('a', cx - reach - 2, 0.9, { pose: 'stepA', ease: 'settle' }).with().approach('b', cx + reach + 2, 0.9, { pose: 'stepA', ease: 'settle' })
  for (const [t, p] of [[0.45, 'stepB'], [0.65, 'stepA'], [0.85, 'stepB'], [1.05, 'idle']] as [number, CrabPose][]) f.at(t).pose('a', p).pose('b', p)
  // 2. pinch-pinch
  f.at(1.3).pose('a', 'pinch').at(1.42).pose('a', 'nip').sfx('clk!', cx, ring.y0 + 8, { size: 8, d: 0.4 })
  f.at(1.62).pose('b', 'pinch').at(1.74).pose('b', 'nip').sfx('clk!', cx, ring.y0 + 8, { size: 8, d: 0.4, tilt: 6 })
  f.at(1.95).pose('a', 'pinch').pose('b', 'idle')
  // 3. a nudge: b spins once, a pixel-art turn
  f.at(2.05).pose('a', 'nip').hit('b', { star: false, flash: false, shake: false, sparks: false, freeze: 0.06 })
  f.knockback('b', 12 * sc + 6, { d: 0.42, rot: 360, land: 'none', arc: 6, pose: 'idle' })
  f.pose('a', 'idle')
  // 4. the boss drops in between them; they freeze and salute
  f.at(2.75).approach('k', cx, 0.28, { y: gy, ease: 'snap' })
  f.at(3.1).pose('a', 'salute').pose('b', 'salute')
  // 5. the coin pops into the boss's claw
  f.at(3.35).pose('k', 'bossSalute')
  const coinIn = act.on(act.mv(act.bank.use('coin', 0, 0, 1, sc * 1.2), [[0.05, cx, ring.y0 - 6], [0.35, cx, gy + 7 * sc], [3.3, cx, gy + 7 * sc], [3.55, cx + 6 * sc, gy - 16 * sc]], { ease: 'settle' }), 0.05, CLAWOFF_MS / 1000 - 0.3)
  const clip = `<clipPath id="${act.p}ring"><rect x="${ring.x0}" y="${ring.y0}" width="${ring.x1 - ring.x0}" height="${ring.y1 - ring.y0}"/></clipPath>`
  const T = CLAWOFF_MS / 1000
  const body = act.on(`<defs>${clip}</defs><g clip-path="url(#${act.p}ring)">${coinIn}${f.body()}</g>`, 0.02, T - 0.02, { fade: 0.25 })
  const still = `<g clip-path="url(#${act.p}ring)">${act.still('salute', cx - reach - 2, gy, 1, sc)}${act.still('salute', cx + reach + 2 + 12 * sc + 6, gy, -1, sc)}${act.still('bossSalute', cx, gy, 1, sc)}</g>`
  // (a clipPath is referable even inside a hidden subtree: the still uses the body's)
  return act.done(body, still)
}

// ---------------------------------------------------------------- the skin-switch flavours (subtle)
/** Default: a plain, soft veil, no bar, no shards. Crab Classic: sideways (the way a crab walks), three bubbles on the band. */
export const DEFAULT_SWITCH: SwitchFlavour = { bar: false, shards: 0, ms: 520, veil: 0.4 }
export const CRAB_SWITCH: SwitchFlavour = {
  dir: 'l', shards: 0, ms: 650, veil: 0.45,
  extra: (act, s) => (s === 'band' ? [[0.1, 40], [0.22, 70], [0.34, 100]].map(([t, x]) => act.cue('rise', t as number, '<circle r="2" fill="none" stroke="#9FD8E8" stroke-width=".8"/>', { x: x as number, y: act.H - 18, d: 0.5 })).join('') : ''),
}
