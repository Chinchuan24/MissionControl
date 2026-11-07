// Invincible: the CAMEOS. Atom Eve, Oliver and Cecil drop in now and then (fan homage; cartoon, no gore, show-safe lines only).
//   Atom Eve  flies across the band or a card trailing a pink energy glow, or lands on a card's lower edge and makes a small
//             pink sparkle burst; now and then "Need a hand, Mark?"
//   Oliver    a small fast dash along the band's foot with a quick zigzag, or pops up from behind a card's lower edge and
//             waves: "Hi, Mark!"
//   Cecil     never flies: he is a monitor feed on the GDA WALL (a screen with his bust) with "We need to talk."; a tiny
//             "GDA REC" tag shows in the band's top corner while the feed is up.
// Schedule: pure functions of the clock (no state). The clock is cut into 6-minute slots; each slot has one cameo at a seeded
// moment in its first 2 minutes, so two are always 4 to 8 minutes apart, and one character per slot (never two in a 30 s window).
// A cameo is skipped when its window would touch THE FIGHT or THE SHOWDOWN (either era's plan), and is never drawn during the
// swap, THINK, MARK, a typed showdown or the job-done celebration. Every piece runs ONE CSS duration with its keyframes in
// percent and the single delay `pin(startAt)`, so a redraw anywhere in the act resumes it and a draw up to AHEAD_MS before it
// schedules it (the delay is then positive): an idle draw still shows it. The cameos do not change with the era; only the band
// tag and Oliver's speed lines wear the era's colours. Reduced motion: nothing moves; some cameos leave one faint still.
// People are only ever the approved pixel sprites (INV_EVE, INV_OLIVER, INV_CECIL); the effects around them are drawn.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { AHEAD_MS, SHOWDOWN_MS, SWAP_MS, THINK_MS, duelPlan, fightDue, kf, mover, showdownDue, showdownPlan } from './invincible-eggs'
import { M, PROPS, SP, T, clamp, pal, pin, px, r1, sansW, speedLines, spH, spW, unit } from './invincible'
import type { Era } from './invincible'
import type { ExtraArgs, PaneCard } from './themes'

export const CAM_SLOT_MS = 360_000
export const CAM_JITTER_MS = 120_000
export const CAM_SEED = 'inv-cam'
export const CAM_GAP_MS = 6_000

export type Who = 'eve' | 'oliver' | 'cecil'
export type Mode = 'fly-band' | 'fly-pane' | 'perch' | 'dash' | 'pop' | 'feed'
export type CamPlan = {
  on: boolean
  slot: number
  who: Who
  mode: Mode
  startAt: number
  endAt: number
  durMs: number
  dir: 1 | -1
  /** Where, as fractions of the width and the height. */
  x: number
  y: number
  /** Which pane card carries the act (Cecil only the GDA WALL). */
  card: PaneCard
  bubble: boolean
  line: string
  /** Under reduced motion, this one leaves a faint still. */
  still: boolean
  /** Cecil: the band's GDA REC tag shows. */
  rec: boolean
}

export const EVE_LINE = 'Need a hand, Mark?'
export const OLIVER_LINE = 'Hi, Mark!'
export const CECIL_LINES = ['We need to talk.', 'Mark. My office.', 'Give us a moment.']
export const DUR_MS: Record<Mode, number> = { 'fly-band': 5200, 'fly-pane': 4200, perch: 7000, dash: 2600, pop: 5000, feed: 6000 }

const overlaps = (a0: number, a1: number, b0: number, b1: number, m: number): boolean => a0 < b1 + m && b0 < a1 + m
/** Would a window touch THE FIGHT or THE SHOWDOWN, in either era (the plan is the same in both, so a swap never changes it)? */
export const camBlocked = (startAt: number, endAt: number): boolean => {
  for (const era of [1, 2] as const) {
    for (const t of [startAt, endAt]) {
      const d = duelPlan(t, era)
      if (d.on && overlaps(startAt, endAt, d.startAt, d.endAt, CAM_GAP_MS)) return true
      const s = showdownPlan(t, era)
      if (overlaps(startAt, endAt, s.startAt, s.endAt, CAM_GAP_MS)) return true
    }
  }
  return false
}

/** The cameo of one slot (`on` is false when it would have touched the fight or the showdown). */
export const camPlanOfSlot = (slot: number): CamPlan => {
  const u = (s: string): number => unit(`${CAM_SEED}|${slot}|${s}`)
  const w = u('who')
  const who: Who = w < 0.4 ? 'eve' : w < 0.74 ? 'oliver' : 'cecil'
  const m = u('mode')
  const mode: Mode = who === 'eve' ? (m < 0.5 ? 'fly-band' : m < 0.75 ? 'fly-pane' : 'perch') : who === 'oliver' ? (m < 0.6 ? 'dash' : 'pop') : 'feed'
  const durMs = DUR_MS[mode]
  // The moment is seeded inside the slot's first 2 minutes; when it would touch the fight or the showdown, the next seeded try is used.
  let startAt = slot * CAM_SLOT_MS
  let free = false
  for (let i = 0; i < 12 && !free; i++) {
    startAt = slot * CAM_SLOT_MS + Math.floor(u(i ? `at${i}` : 'at') * CAM_JITTER_MS)
    free = !camBlocked(startAt, startAt + durMs)
  }
  const c = u('card')
  const card: PaneCard = who === 'cecil' ? 'task' : c < 0.4 ? 'cred' : c < 0.7 ? 'log' : 'task'
  const b = u('bubble')
  const bubble = who === 'cecil' ? true : who === 'eve' ? b < 0.3 : mode === 'pop' ? b < 0.85 : b < 0.35
  const line = who === 'eve' ? EVE_LINE : who === 'oliver' ? OLIVER_LINE : (CECIL_LINES[Math.floor(u('line') * CECIL_LINES.length)] as string)
  const endAt = startAt + durMs
  return { on: free, slot, who, mode, startAt, endAt, durMs, dir: u('dir') < 0.5 ? 1 : -1, x: +(0.2 + 0.6 * u('x')).toFixed(2), y: +u('y').toFixed(2), card, bubble, line, still: u('still') < 0.5, rec: who === 'cecil' && u('rec') < 0.8 }
}
/** The cameo whose slot holds `at`. */
export const camPlan = (at: number): CamPlan => camPlanOfSlot(Math.floor(at / CAM_SLOT_MS))

const liveWin = (since: number | undefined, a0: number, a1: number, ms: number): boolean => since !== undefined && since > 0 && overlaps(a0, a1, since, since + ms, 1000)
/**
 * The cameo a draw at `at` should include: live now or starting within the look-ahead, and not clashing with a typed THINK, MARK
 * or a typed showdown or the era swap (they take the stage). Undefined when none.
 */
export const camDue = (at: number, fx?: { kind: string; at: number }, swapAt?: number): CamPlan | undefined => {
  const k = Math.floor(at / CAM_SLOT_MS)
  for (const slot of [k, k + 1]) {
    const p = camPlanOfSlot(slot)
    if (!p.on || at >= p.endAt || p.startAt > at + AHEAD_MS) continue
    if (liveWin(swapAt, p.startAt, p.endAt, SWAP_MS + 500)) return undefined
    if (fx && (fx.kind === 'think' || fx.kind === 'showdown') && liveWin(fx.at, p.startAt, p.endAt, fx.kind === 'think' ? THINK_MS : SHOWDOWN_MS)) return undefined
    return p
  }
  return undefined
}

// ---------------------------------------------------------------- motion
// Every class that animates is named again in the reduced-motion block: the acts (`.cm-anim`) are hidden, a still (`.cm-still`)
// shows for the act's length instead, and the small loops stop.
export const CAMEO_CSS = `.cm-c{transform-box:fill-box;transform-origin:50% 50%}
.cm-still{display:none}
.cm-bob{animation:cm-bob 1.1s ease-in-out infinite}
@keyframes cm-bob{50%{transform:translateY(-3px)}}
.cm-tw{animation:cm-tw .7s steps(1) infinite}
@keyframes cm-tw{50%{opacity:.4}}
.cm-wave{transform-box:fill-box;transform-origin:50% 100%;animation:cm-wave .5s steps(1) infinite}
@keyframes cm-wave{0%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}
.cm-blink{animation:cm-blink 1s steps(1) infinite}
@keyframes cm-blink{50%{opacity:0}}
.cm-scan{animation:cm-scan 1.8s linear infinite}
@keyframes cm-scan{to{transform:translateY(40px)}}
@keyframes cm-stay{0%,92%{opacity:1}100%{opacity:0;visibility:hidden}}
@media (prefers-reduced-motion: reduce){.cm-anim{display:none}.cm-still{display:block;opacity:0;animation-name:cm-stay;animation-timing-function:steps(1);animation-fill-mode:forwards}.cm-bob,.cm-tw,.cm-wave,.cm-blink,.cm-scan{animation:none}}`

const STAR4 = 'M0 -4L1.1 -1.1L4 0L1.1 1.1L0 4L-1.1 1.1L-4 0L-1.1 -1.1Z'

type Ctx = { W: number; H: number; p: CamPlan; era: Era; dly: string; id: string; css: string }
const T_ = (c: Ctx) => (t: number): number => (t / (c.p.durMs / 1000)) * 100
const run = (c: Ctx, name: string, timing = 'linear'): string => `style="animation:${name} ${c.p.durMs / 1000}s ${timing} both;animation-delay:${c.dly}"`
/** A comic speech bubble with its top-left at (x, y); `tail` points from the box to the speaker. */
const bubble = (x: number, y: number, text: string, tail: 'down' | 'up' | 'left' | 'right', o: { dark?: boolean; size?: number; tailAt?: number } = {}): { svg: string; w: number; h: number } => {
  const size = o.size ?? 10.5
  const w = Math.round(sansW(text, size, 0, true) + 16)
  const h = Math.round(size + 9)
  const fill = o.dark ? PROPS.screen : PROPS.paper
  const stroke = o.dark ? PROPS.screenGreen : PROPS.ink
  const ink = o.dark ? PROPS.white : PROPS.ink
  const ta = clamp(o.tailAt ?? w / 2, 8, w - 8)
  const t = tail === 'down' ? `M${r1(x + ta - 4)} ${r1(y + h - 0.5)}l4 6l4 -6z` : tail === 'up' ? `M${r1(x + ta - 4)} ${r1(y + 0.5)}l4 -6l4 6z` : tail === 'left' ? `M${r1(x + 0.5)} ${r1(y + h / 2 - 4)}l-6 4l6 4z` : `M${r1(x + w - 0.5)} ${r1(y + h / 2 - 4)}l6 4l-6 4z`
  const shadow = o.dark ? '' : `<rect x="${r1(x + 2)}" y="${r1(y + 2)}" width="${w}" height="${h}" rx="6" fill="${PROPS.ink}"/>`
  return { svg: `${shadow}<rect x="${r1(x)}" y="${r1(y)}" width="${w}" height="${h}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/><path d="${t}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/><rect x="${r1(x + 1)}" y="${r1(y + 1)}" width="${w - 2}" height="${h - 2}" rx="5" fill="${fill}"/>${T(x + w / 2, y + h - 5.5, text, size, 700, ink, 'text-anchor="middle"')}`, w, h }
}
const shown = (c: Ctx, name: string, from: number, to: number): string => {
  const t = T_(c)
  c.css += kf(name, [[0, 'opacity:0'], [t(from), 'opacity:0'], [t(from) + 0.1, 'opacity:1'], [t(to), 'opacity:1'], [t(to) + 0.1, 'opacity:0'], [100, 'opacity:0']])
  return run(c, name, 'steps(1)')
}
const stillWrap = (c: Ctx, inner: string): string => (c.p.still ? `<g class="cm-still" style="animation-duration:${c.p.durMs / 1000}s;animation-delay:${c.dly}">${inner}</g>` : '')
const frag = (c: Ctx, defs: string, body: string): string => `<g pointer-events="none" data-cam="${c.p.who}"><style>${CAMEO_CSS}${c.css}</style><defs>${defs}</defs>${body}</g>`

// ---------------------------------------------------------------- Atom Eve
const eveDefs = (c: Ctx): string => `<g id="${c.id}e">${px(SP.INV_EVE, -spW(SP.INV_EVE) / 2, -spH(SP.INV_EVE) / 2, 1)}</g><radialGradient id="${c.id}h"><stop offset="0" stop-color="${PROPS.eve}" stop-opacity=".55"/><stop offset="1" stop-color="${PROPS.eve}" stop-opacity="0"/></radialGradient><linearGradient id="${c.id}t" x1="1" x2="0"><stop offset="0" stop-color="${PROPS.eve}" stop-opacity=".7"/><stop offset="1" stop-color="${PROPS.eve}" stop-opacity="0"/></linearGradient><linearGradient id="${c.id}c" x1="1" x2="0"><stop offset="0" stop-color="${PROPS.evePale}" stop-opacity=".95"/><stop offset="1" stop-color="${PROPS.evePale}" stop-opacity="0"/></linearGradient>`
/** Her glow: a halo round her, a tapering pink trail behind (toward -x) with a pale core, and a few twinkling sparkles. */
const eveGlow = (len: number, id: string): string => {
  const sp = [[-0.22, -3, 3.2], [-0.45, 4, 2.6], [-0.68, -5, 3], [-0.9, 2, 2.2]].map(([f, y, s], i) => `<path class="cm-tw" style="animation-delay:${i * 0.17}s" transform="translate(${r1((f as number) * len)} ${y}) scale(${(s as number) / 3})" d="${STAR4}" fill="${i % 2 ? PROPS.evePale : PROPS.eve}"/>`).join('')
  return `<circle r="27" fill="url(#${id}h)"/><rect x="${-len - 10}" y="-9" width="${len}" height="18" rx="9" fill="url(#${id}t)"/><rect x="${-len - 10}" y="-1.6" width="${len}" height="3.2" rx="1.6" fill="url(#${id}c)"/>${sp}`
}
const eveFly = (c: Ctx, surf: 'band' | 'pane'): string => {
  const { W, H, p } = c
  const t = T_(c)
  const D = p.durMs / 1000
  const y = surf === 'band' ? 76 : clamp(H * (0.3 + 0.4 * p.y), 60, Math.max(60, H - 40))
  const xa = p.dir === 1 ? -70 : W + 70
  const xb = p.dir === 1 ? W + 70 : -70
  c.css += mover(`${c.id}m`, [[0, xa, y, 0, 0], [t(0.15), xa, y, 0, 1], [t(D - 0.15), xb, y, 0, 1], [100, xb, y, 0, 0]])
  const len = surf === 'band' ? 150 : 110
  const bub = p.bubble ? bubble(0, 0, p.line, 'down', { tailAt: 20 }) : undefined
  const bx = -20
  const bubSvg = bub ? `<g transform="translate(${bx} ${-30 - bub.h - 6})" ${shown(c, `${c.id}b`, 0.7, D - 0.7)}>${bub.svg}</g>` : ''
  const body = `<g transform="scale(${p.dir} 1)">${eveGlow(len, c.id)}<g transform="rotate(18)"><use href="#${c.id}e"/></g></g>`
  const act = `<g class="cm-anim"><g ${run(c, `${c.id}m`)}><g class="cm-bob">${body}</g>${bubSvg}</g></g>`
  const still = stillWrap(c, `<g opacity=".5" transform="translate(${r1(W * (0.25 + 0.5 * p.x))} ${surf === 'band' ? H - 28 : H - 30})"><circle r="27" fill="url(#${c.id}h)"/><use href="#${c.id}e"/>${bub ? `<g transform="translate(${bx} ${-30 - bub.h - 6})">${bub.svg}</g>` : ''}</g>`)
  return frag(c, eveDefs(c), `${act}${still}`)
}
const evePerch = (c: Ctx): string => {
  const { W, H, p } = c
  const t = T_(c)
  const D = p.durMs / 1000
  const px_ = r1(W * (0.3 + 0.5 * p.x))
  const feet = H - 4
  const cy = r1(feet - spH(SP.INV_EVE) / 2)
  const hi = cy - 60
  const xs = p.dir === 1 ? -40 : W + 40
  const xe = p.dir === 1 ? W + 40 : -40
  c.css += mover(`${c.id}m`, [[0, xs, hi, 18 * p.dir, 0], [t(0.15), xs, hi, 18 * p.dir, 1], [t(1.3), px_, cy, 0, 1], [t(5.4), px_, cy, 0, 1], [t(6.7), xe, hi, 18 * p.dir, 1], [100, xe, hi, 18 * p.dir, 0]])
  c.css += kf(`${c.id}pad`, [[0, 'opacity:0'], [t(1.2), 'opacity:0'], [t(1.4), 'opacity:1'], [t(5.4), 'opacity:1'], [t(5.6), 'opacity:0'], [100, 'opacity:0']])
  // the burst: eight sparkles from her orb at 2.4 s
  const bx = r1(px_ + p.dir * 9)
  const by = r1(cy - 15)
  let burst = ''
  for (let k = 0; k < 8; k++) {
    const a = (Math.PI * 2 * k) / 8
    const r = 20 + (k % 2) * 9
    c.css += mover(`${c.id}s${k}`, [[0, bx, by, undefined, 0], [t(2.4), bx, by, undefined, 0], [t(2.4) + 0.1, bx, by, undefined, 1], [t(3.3), bx + Math.cos(a) * r, by + Math.sin(a) * r, undefined, 0], [100, bx, by, undefined, 0]])
    burst += `<g ${run(c, `${c.id}s${k}`)}><path d="${STAR4}" transform="scale(${k % 2 ? 0.8 : 1.15})" fill="${k % 2 ? PROPS.evePale : PROPS.eve}"/></g>`
  }
  c.css += kf(`${c.id}ring`, [[0, 'opacity:0;transform:scale(.3)'], [t(2.4), 'opacity:0;transform:scale(.3)'], [t(2.4) + 0.1, 'opacity:.8;transform:scale(.6)'], [t(3.0), 'opacity:0;transform:scale(1.6)'], [100, 'opacity:0;transform:scale(1.6)']])
  const ring = `<g transform="translate(${bx} ${by})"><circle class="cm-c" r="10" fill="none" stroke="${PROPS.evePale}" stroke-width="1.5" ${run(c, `${c.id}ring`, 'steps(3)')}/></g>`
  const bub = p.bubble ? bubble(0, 0, p.line, 'down', { tailAt: 20 }) : undefined
  const bubX = clamp(px_ - 20, 4, Math.max(4, W - (bub?.w ?? 0) - 4))
  const bubSvg = bub ? `<g transform="translate(${r1(bubX)} ${r1(cy - 30 - bub.h - 6)})" ${shown(c, `${c.id}b`, 1.6, 5.4)}>${bub.svg}</g>` : ''
  const pad = `<ellipse cx="${px_}" cy="${feet}" rx="22" ry="3.5" fill="${PROPS.eve}" fill-opacity=".5" ${run(c, `${c.id}pad`, 'steps(1)')}/>`
  const body = `<g class="cm-c" ${run(c, `${c.id}mr`)}><g transform="scale(${p.dir} 1)"><use href="#${c.id}e"/></g></g>`
  const act = `<g class="cm-anim">${pad}<g ${run(c, `${c.id}m`)}>${body}</g>${burst}${ring}${bubSvg}</g>`
  const still = stillWrap(c, `<g opacity=".5"><ellipse cx="${px_}" cy="${feet}" rx="22" ry="3.5" fill="${PROPS.eve}" fill-opacity=".5"/><g transform="translate(${px_} ${cy})"><use href="#${c.id}e"/></g>${p.bubble && bub ? `<g transform="translate(${r1(bubX)} ${r1(cy - 30 - bub.h - 6)})">${bub.svg}</g>` : ''}</g>`)
  return frag(c, eveDefs(c), `${act}${still}`)
}

// ---------------------------------------------------------------- Oliver
const oliverDefs = (c: Ctx, s: number): string => `<g id="${c.id}o">${px(SP.INV_OLIVER, -spW(SP.INV_OLIVER) * s / 2, -spH(SP.INV_OLIVER) * s, s)}</g>`
/** His dash along the band's foot: x runs the width, y zigzags between the floor and 22 px up, the body tilts the other way each leg. */
const oliverDash = (c: Ctx): string => {
  const { W, H, p, era } = c
  const t = T_(c)
  const D = p.durMs / 1000
  const P = pal(era)
  const floor = H - 8
  const xa = p.dir === 1 ? -30 : W + 30
  const xb = p.dir === 1 ? W + 30 : -30
  const legs = 9
  const frames: any[][] = [[0, xa, floor, 0, 0], [t(0.1), xa, floor, 0, 1]]
  for (let i = 0; i <= legs; i++) {
    const f = i / legs
    frames.push([t(0.1) + (t(D - 0.1) - t(0.1)) * f, xa + (xb - xa) * f, floor - (i % 2 ? 22 : 0), (i % 2 ? 1 : -1) * 12 * p.dir, 1])
  }
  frames.push([100, xb, floor, 0, 0])
  c.css += mover(`${c.id}m`, frames)
  const bub = p.bubble ? bubble(0, 0, p.line, 'down', { size: 9.5, tailAt: 14 }) : undefined
  const bubSvg = bub ? `<g transform="translate(${-14} ${-42 - bub.h - 4})" ${shown(c, `${c.id}b`, 0.5, D - 0.5)}>${bub.svg}</g>` : ''
  const body = `<g class="cm-c" ${run(c, `${c.id}mr`)}><circle cy="-21" r="17" fill="${PROPS.skyLight}" fill-opacity=".25"/>${speedLines(-p.dir * 5, -20, 26, 4, p.dir, P.hero as string, { gap: 6, op: 0.85 })}<use href="#${c.id}o"/></g>`
  const act = `<g class="cm-anim"><g ${run(c, `${c.id}m`)}>${body}${bubSvg}</g></g>`
  const still = stillWrap(c, `<g opacity=".5" transform="translate(${r1(W * (0.25 + 0.5 * p.x))} ${H - 8})"><use href="#${c.id}o"/>${bub ? `<g transform="translate(-14 ${-42 - bub.h - 4})">${bub.svg}</g>` : ''}</g>`)
  return frag(c, oliverDefs(c, 1), `${act}${still}`)
}
/** He pops up from behind the card's lower edge, waves (the whole body rocks), says hi, ducks back down. */
const oliverPop = (c: Ctx): string => {
  const { W, H, p } = c
  const t = T_(c)
  const D = p.durMs / 1000
  const s = 1.6
  const x = r1(W * (0.15 + 0.7 * p.x))
  // His feet are the sprite's origin: hidden below the edge, then 46 px of him (head and chest) show above it.
  const bh = spH(SP.INV_OLIVER) * s
  const down = r1(H + bh + 4)
  const up = r1(H + bh - 46)
  const top = H - 46
  c.css += mover(`${c.id}m`, [[0, x, down, undefined, 1], [t(0.2), x, down, undefined, 1], [t(0.65), x, up, undefined, 1], [t(D - 0.7), x, up, undefined, 1], [t(D - 0.25), x, down, undefined, 1], [100, x, down, undefined, 1]])
  const bub = p.bubble ? bubble(0, 0, p.line, x < W / 2 ? 'left' : 'right', { size: 10.5 }) : undefined
  const bubX = bub ? (x < W / 2 ? x + spW(SP.INV_OLIVER) * s * 0.5 + 10 : x - spW(SP.INV_OLIVER) * s * 0.5 - 10 - bub.w) : 0
  const bubSvg = bub ? `<g transform="translate(${r1(bubX)} ${r1(top + 6)})" ${shown(c, `${c.id}b`, 0.9, D - 0.9)}>${bub.svg}</g>` : ''
  const side = x < W / 2 ? -1 : 1
  const waves = `<path d="M${r1(x + side * 15)} ${r1(top + 10)}q${side * 3} -3 ${side * 6} 0M${r1(x + side * 17)} ${r1(top + 18)}q${side * 3} -3 ${side * 6} 0" fill="none" stroke="${PROPS.paper}" stroke-width="1.4" stroke-linecap="round" ${shown(c, `${c.id}w`, 0.9, D - 0.9)}/>`
  // A pale disc behind him: his suit is dark on a dark card.
  const disc = `<circle cy="${r1(-bh + 24)}" r="26" fill="${PROPS.skyLight}" fill-opacity=".3"/>`
  const act = `<g class="cm-anim"><g ${run(c, `${c.id}m`)}>${disc}<g class="cm-wave"><use href="#${c.id}o"/></g></g>${bubSvg}${waves}</g>`
  const still = stillWrap(c, `<g opacity=".5" transform="translate(${x} ${up})">${disc}<use href="#${c.id}o"/></g>${bub ? `<g opacity=".7" transform="translate(${r1(bubX)} ${r1(top + 6)})">${bub.svg}</g>` : ''}`)
  return frag(c, oliverDefs(c, s), `${act}${still}`)
}

// ---------------------------------------------------------------- Cecil
/** His feed on the GDA WALL: a small GDA screen over the main monitor's right end, his bust in it, scanlines, a REC dot, and his line under it. */
export const feedBox = (W: number): { x: number; y: number; w: number; h: number } => {
  const mw = W - 32 - 48
  const w = Math.round(Math.min(96, mw * 0.45))
  return { x: 16 + mw - w - 6, y: 43, w, h: 62 }
}
const cecilFeed = (c: Ctx): string => {
  const { W, p } = c
  const t = T_(c)
  const D = p.durMs / 1000
  const f = feedBox(W)
  const s = 1.55
  const bw = spW(SP.INV_CECIL) * s
  const bh = 28 * s
  const label = f.w >= 80 ? 'INCOMING FEED' : 'FEED'
  const sx = f.x + 3
  const sy = f.y + 3
  const sw = f.w - 6
  const sh = f.h - 6
  c.css += kf(`${c.id}f`, [[0, 'opacity:0'], [t(0.2), 'opacity:0'], [t(0.25), 'opacity:1'], [t(0.4), 'opacity:.35'], [t(0.5), 'opacity:1'], [t(D - 0.5), 'opacity:1'], [t(D - 0.4), 'opacity:.4'], [t(D - 0.3), 'opacity:1'], [t(D - 0.2), 'opacity:0'], [100, 'opacity:0']])
  const bub = bubble(0, 0, p.line, 'up', { dark: true })
  const bubX = clamp(f.x + f.w - bub.w, 8, Math.max(8, W - bub.w - 8))
  const bubY = f.y + f.h + 8
  const screen = (still: boolean): string =>
    `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="3" fill="${PROPS.gdaDark}" stroke="${PROPS.gda}" stroke-width="1.2"/><clipPath id="${c.id}k${still ? 's' : 'a'}"><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}"/></clipPath><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="${PROPS.screen}"/><g clip-path="url(#${c.id}k${still ? 's' : 'a'})"><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="url(#${c.id}n)"/>${still ? '' : `<rect class="cm-scan" x="${sx}" y="${sy - 6}" width="${sw}" height="5" fill="${PROPS.screenGreen}" fill-opacity=".14"/>`}<g ${still ? '' : 'class="cm-bob"'}>${px(SP.INV_CECIL, r1(f.x + f.w / 2 - bw / 2), r1(sy + sh - bh - 1), s, { rows: [0, 28] })}</g></g>${M(sx + 3, sy + 8, label, 6, PROPS.screenGreen, 'letter-spacing=".6"')}<circle ${still ? '' : 'class="cm-blink"'} cx="${r1(sx + sw - 6)}" cy="${r1(sy + 5.5)}" r="2.2" fill="${PROPS.red}"/>`
  const defs = `<pattern id="${c.id}n" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="1" fill="${PROPS.screenGreen}" fill-opacity=".09"/></pattern>`
  const act = `<g class="cm-anim"><g ${run(c, `${c.id}f`, 'steps(1)')}>${screen(false)}</g><g transform="translate(${r1(bubX)} ${r1(bubY)})" ${shown(c, `${c.id}b`, 1.0, D - 0.6)}>${bubble(0, 0, p.line, 'up', { dark: true, tailAt: f.x + f.w / 2 - bubX }).svg}</g></g>`
  const still = stillWrap(c, `<g opacity=".65">${screen(true)}<g transform="translate(${r1(bubX)} ${r1(bubY)})">${bubble(0, 0, p.line, 'up', { dark: true, tailAt: f.x + f.w / 2 - bubX }).svg}</g></g>`)
  return frag(c, defs, `${act}${still}`)
}
/** The band's tiny "GDA REC" tag: hangs from the top frame near the right while Cecil's feed is up. */
const recTag = (c: Ctx): string => {
  const { W, p, era } = c
  const t = T_(c)
  const D = p.durMs / 1000
  const P = pal(era)
  const x = W - 104
  c.css += kf(`${c.id}r`, [[0, 'opacity:0'], [t(0.2), 'opacity:0'], [t(0.25), 'opacity:1'], [t(0.4), 'opacity:.3'], [t(0.5), 'opacity:1'], [t(D - 0.3), 'opacity:1'], [t(D - 0.2), 'opacity:0'], [100, 'opacity:0']])
  const tag = (still: boolean): string => `<rect x="${x}" y="2" width="68" height="12" fill="${P.tile2}" stroke="${PROPS.gda}" stroke-width="1"/>${M(x + 5, 10.8, 'GDA', 7.5, PROPS.screenGreen, 'letter-spacing=".6" font-weight="700"')}<circle ${still ? '' : 'class="cm-blink"'} cx="${x + 35}" cy="8" r="2.4" fill="${P.alert}"/>${M(x + 41, 10.8, 'REC', 7.5, PROPS.screenText, 'letter-spacing=".6"')}<title>GDA feed: recording</title>`
  return frag(c, '', `<g class="cm-anim"><g ${run(c, `${c.id}r`, 'steps(1)')}>${tag(false)}</g></g>${stillWrap(c, `<g opacity=".7">${tag(true)}</g>`)}`)
}

// ---------------------------------------------------------------- what the theme's `extras` slot draws for the cameos
/** The cameo for a panel (band, or one pane card), or ''. Nothing during the celebration (`party`). */
export const camExtras = (era: Era) => (o: ExtraArgs): string => {
  if (o.party) return ''
  const p = camDue(o.at, o.fx, o.swapAt)
  if (!p) return ''
  // One that has not started yet waits while THE FIGHT or THE SHOWDOWN is being drawn (it cannot overlap them in time, and the
  // draw stays small); one that is already under way finishes.
  if (o.at < p.startAt && (fightDue(o.at, era, o.working, o.fx, o.swapAt) !== undefined || showdownDue(o.at, era, o.fx) !== undefined)) return ''
  const surf = o.surface === 'band' ? 'b' : 'p'
  const c: Ctx = { W: o.W, H: o.H, p, era, dly: `calc(${pin(p.startAt)} + 0s)`, id: `cm${p.slot}${surf}${o.card ? o.card[0] : ''}`, css: '' }
  if (o.surface === 'band') {
    if (p.mode === 'fly-band') return eveFly(c, 'band')
    if (p.mode === 'dash') return oliverDash(c)
    if (p.mode === 'feed' && p.rec) return recTag(c)
    return ''
  }
  if (o.W < 200 || o.H < 120 || o.card !== p.card) return ''
  if (p.mode === 'fly-pane') return eveFly(c, 'pane')
  if (p.mode === 'perch') return evePerch(c)
  if (p.mode === 'pop') return oliverPop(c)
  if (p.mode === 'feed') return cecilFeed(c)
  return ''
}
