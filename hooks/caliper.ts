// Caliper: an original Mission Control design (no homage). A precision-instrument skin: graphite and ice, hairlines, tabular
// numerals, one instrument (the dial) and one scale (the ruler), one accent. Two faces (dark, light) and an auto setting that
// follows the app's theme; the face only ever changes colours, never a coordinate (calPal is the one place a mode is read).
// Pure SVG strings and tables, no state, no clock. The cards are in caliper-cards.ts, the theme entry in caliper-theme.ts.
import { sansW } from './invincible'
import { pin as pinAt } from './smooth'

export type CalFace = 'dark' | 'light'
export type CalPal = {
  bg: string; tile: string; tile2: string; track: string; line: string; hair: string
  text: string; subtext: string; muted: string
  accent: string; accentInk: string; meter: string
  done: string; warn: string; alert: string
  roles: string[]
  boss: string[]
}

const DARK: CalPal = {
  bg: '#0E1012', tile: '#15181B', tile2: '#1B1F23', track: '#242930', line: '#2B3138', hair: '#363D45',
  text: '#ECEEF0', subtext: '#AAB2BC', muted: '#8A93A0',
  accent: '#5AA9FF', accentInk: '#0B1220', meter: '#5AA9FF',
  done: '#5FC58F', warn: '#E0B14C', alert: '#F0665A',
  roles: ['#8FB4E8', '#7FC4A5', '#D9B06A', '#C79BD9', '#E09A8E', '#8FC9D6'],
  boss: ['#5AA9FF', '#AAB2BC', '#ECEEF0', '#AAB2BC', '#5AA9FF'],
}
const LIGHT: CalPal = {
  bg: '#F6F6F4', tile: '#FFFFFF', tile2: '#F1F1EF', track: '#E6E7E4', line: '#DADBD7', hair: '#C9CBC6',
  text: '#1A1D21', subtext: '#50575F', muted: '#646C75',
  accent: '#1F6FE0', accentInk: '#FFFFFF', meter: '#1F6FE0',
  done: '#1A7F4D', warn: '#9A6B00', alert: '#C9372C',
  roles: ['#2E64B8', '#1E7F55', '#8A6200', '#7C3FA8', '#B5453A', '#1D7A8C'],
  boss: ['#1F6FE0', '#50575F', '#1A1D21', '#50575F', '#1F6FE0'],
}
/** The palette of a face: colours only. */
export const calPal = (face: CalFace): CalPal => (face === 'light' ? LIGHT : DARK)

export const CAL_FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Ubuntu,Cantarell,'Noto Sans','Liberation Sans',sans-serif"
/** The slim band's height: the mock's 120 px of rows plus the engine's tip and totals row (baseline 123) below them. */
export const calBandH = 132
export { sansW }

// WCAG relative luminance and contrast ratio, for the tests and the preview sheet.
const lin = (c: number): number => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
export const calLum = (hex: string): number => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255) }
export const calRatio = (a: string, b: string): number => { const [x, y] = [calLum(a), calLum(b)].sort((p, q) => q - p) as [number, number]; return (x + 0.05) / (y + 0.05) }

// ---------------------------------------------------------------- motion (every class has a reduced-motion rule below)
export const CAL_CSS = `
.cal-live{animation:cal-p 1.6s ease-in-out infinite}@keyframes cal-p{50%{opacity:.35}}
.cal-needle{transform-origin:var(--ox) var(--oy);animation:cal-hunt 2.4s cubic-bezier(.2,0,0,1) infinite alternate}@keyframes cal-hunt{to{transform:rotate(6deg)}}
.cal-sweep{animation:cal-sw 1.8s cubic-bezier(.2,0,0,1) infinite}@keyframes cal-sw{from{transform:translateX(0);opacity:0}15%{opacity:1}85%{opacity:1}to{transform:translateX(var(--sw,0px));opacity:0}}
.cal-wave{animation:cal-wv .6s ease-out both}@keyframes cal-wv{40%{transform:translateY(-2px)}}
.cal-vern{animation:cal-vn .6s cubic-bezier(.2,0,0,1) both}@keyframes cal-vn{from{transform:translateX(var(--vx,0px))}to{transform:none}}
.cal-vt{animation:cal-vt .6s steps(1) both}@keyframes cal-vt{from{transform:scaleY(.6)}}
.cal-fade{animation:cal-fd .15s ease-out both}@keyframes cal-fd{from{fill:var(--from)}}
.cal-set{transform-origin:var(--ox) var(--oy);animation:cal-set .52s cubic-bezier(.2,0,0,1) both}@keyframes cal-set{0%{transform:rotate(var(--a))}58%{transform:rotate(var(--o))}80%{transform:rotate(var(--u))}100%{transform:none}}
.cal-knurl{animation:cal-kn 1s steps(4) infinite}@keyframes cal-kn{to{stroke-dashoffset:-2.5}}
.cal-par{animation:cal-par .45s cubic-bezier(.2,0,0,1) both}@keyframes cal-par{from{transform:translateX(var(--p0))}}
.cal-glint{opacity:0;animation:cal-gl .6s ease-out both}@keyframes cal-gl{0%{opacity:0;transform:translateX(-24px)}30%{opacity:.7}100%{opacity:0;transform:translateX(24px)}}
@media (prefers-reduced-motion: reduce){.cal-live,.cal-needle,.cal-sweep,.cal-wave,.cal-vern,.cal-vt,.cal-fade,.cal-set,.cal-knurl,.cal-par{animation:none}.cal-glint{display:none}.cal-sweep{opacity:1}}`
/** A change worth easing: what it was, and when it changed (wall-clock ms, pinned). */
export type Was<T> = { from: T; at: number }
const dly = (at: number): string => `animation-delay:${pinAt(at)}`

// ---------------------------------------------------------------- text primitives
export const xml = (s: unknown): string => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
export const r2 = (n: number): number => Math.round(n * 100) / 100
/** Section label: 9.5 px caps, tracked, muted. */
export const Lb = (P: CalPal, x: number, y: number, text: string, anchor = 'start', fill: string = P.muted, ls = 1.6): string =>
  `<text x="${r2(x)}" y="${y}"${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''} font-family="${CAL_FONT}" font-size="9.5" font-weight="700" letter-spacing="${ls}" fill="${fill}">${xml(text)}</text>`
/** A value: 13 px bold, tabular numerals. */
export const Vl = (P: CalPal, x: number, y: number, text: string, fill: string = P.text, anchor = 'start', size = 13, weight = 700): string =>
  `<text x="${r2(x)}" y="${y}"${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''} font-family="${CAL_FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" font-variant-numeric="tabular-nums">${xml(text)}</text>`
/** Body text: 11.5 px. */
export const Bd = (P: CalPal, x: number, y: number, text: string, fill: string = P.subtext, anchor = 'start', size = 11.5, extra = ''): string =>
  `<text x="${r2(x)}" y="${y}"${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''} font-family="${CAL_FONT}" font-size="${size}" fill="${fill}" font-variant-numeric="tabular-nums"${extra ? ` ${extra}` : ''}>${xml(text)}</text>`
export const hairH = (x1: number, y: number, x2: number, color: string): string => `<line x1="${r2(x1)}" y1="${y}" x2="${r2(x2)}" y2="${y}" stroke="${color}" shape-rendering="crispEdges"/>`
export const hairV = (x: number, y1: number, y2: number, color: string): string => `<line x1="${r2(x)}" y1="${y1}" x2="${r2(x)}" y2="${y2}" stroke="${color}" shape-rendering="crispEdges"/>`
/** The frame every card has: a 10 px round rect, a 1 px line. No shadow, no gradient. */
export const frame = (P: CalPal, W: number, H: number, r = 10): string => `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="${r}" fill="${P.tile}" stroke="${P.line}"/>`
/** The text clipped to `max` px with an ellipsis. */
export const clip = (s: string, size: number, max: number, bold = false): string => {
  if (sansW(s, size, 0, bold) <= max) return s
  let lo = 0
  let hi = s.length
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (sansW(`${s.slice(0, mid)}…`, size, 0, bold) <= max) lo = mid; else hi = mid - 1 }
  return lo <= 0 ? '' : `${s.slice(0, lo).trimEnd()}…`
}

// ---------------------------------------------------------------- the ruler
export type RulerOpts = {
  /** The cursor pulses (a job is running). */
  live?: boolean
  /** The fill and the cursor (default the accent). */
  tone?: string
  /** The job-done cheer: the ticks rise in a wave from the left; `at` pins the start (wall-clock ms). */
  wave?: { at?: number }
  /** The parallax vernier scale behind the rail (pitch 9 against the main 10): it sits at twice the fill's offset, so as the
   *  cursor moves it shears past the main scale, sliding from where it was (`was`) when the value just changed. */
  fine?: { id: string; was?: Was<number> }
}
/**
 * A hairline rail with a tick every 10 px (every fifth one taller), the filled part in the accent and a cursor at the value.
 * `pct === null` draws the scale alone (no fill, no cursor).
 */
export const ruler = (P: CalPal, x: number, y: number, w: number, pct: number | null, o: RulerOpts | boolean = {}): string => {
  const opt: RulerOpts = typeof o === 'boolean' ? { live: o } : o
  const tone = opt.tone ?? P.accent
  const ticks: string[] = []
  for (let i = 0; i * 10 <= w; i++) {
    const h = i % 5 === 0 ? 5 : 3
    const wave = opt.wave ? ` class="cal-wave" style="animation-delay:${opt.wave.at === undefined ? `${i * 0.025}s` : `@@T${Math.round(opt.wave.at + i * 25)}@@`}"` : ''
    ticks.push(`<rect x="${x + i * 10}" y="${y - h}" width="1" height="${h}" fill="${P.hair}"${wave}/>`)
  }
  const fw = pct === null ? 0 : Math.round((w * Math.max(0, Math.min(100, pct))) / 100)
  const fine = opt.fine ? fineScale(P, x, y + 2, w, fw, opt.fine.id, opt.fine.was) : ''
  return `<g shape-rendering="crispEdges">${fine}${hairH(x, y + 0.5, x + w, P.hair)}${ticks.join('')}${fw > 0 ? `<rect x="${x}" y="${y}" width="${fw}" height="2" fill="${tone}"/>` : ''}${pct !== null ? `<rect x="${r2(x + fw - 0.5)}" y="${y - 7}" width="1.5" height="10" fill="${tone}"${opt.live ? ' class="cal-live"' : ''}/>` : ''}</g>`
}
/** The fine scale's offset for a fill `fw`: twice as far as the cursor, folded into one pitch (9 px). */
export const fineOff = (fw: number): number => (2 * fw) % 9
const fineScale = (P: CalPal, x: number, y: number, w: number, fw: number, id: string, was?: Was<number>): string => {
  const o1 = fineOff(fw)
  // the slide: from the old offset by the real distance (clamped to four pitches), landing on the new one
  const d = was ? Math.max(-36, Math.min(36, 2 * (fw - was.from))) : 0
  const p0 = r2(o1 - d)
  const move = was && d !== 0 ? ` class="cal-par" style="--p0:${p0}px;${dly(was.at)}"` : ''
  return `<defs><pattern id="${id}" width="9" height="3" patternUnits="userSpaceOnUse"><rect width="1" height="3" fill="${P.hair}"/></pattern><clipPath id="${id}c"><rect x="${x}" y="${y}" width="${w}" height="3"/></clipPath></defs><g clip-path="url(#${id}c)" opacity=".4"><g${move}><rect x="${r2(x - 45 + o1)}" y="${y}" width="${w + 90}" height="3" fill="url(#${id})"/></g></g>`
}
/** Eleven fine ticks centred under a cursor at `cx` (the middle one in the accent and taller): the vernier. `aligned` makes them all one height. */
/** `anim`: the "reads zero" moment, pinned to `at` (a job done, a level reached): the vernier slides 5 px into place, its ticks
 *  grow to one height, and one glint runs along the jaw. Without `at` the slide is drawn at rest (never replayed on a redraw). */
export const vernier = (P: CalPal, cx: number, y: number, aligned = false, anim = false, at?: number): string => {
  const live = anim && at !== undefined
  const ticks = Array.from({ length: 11 }, (_, i) => `<rect x="${r2(cx - 25 + i * 5)}" y="${y}" width="1" height="${i === 5 ? 5 : aligned ? 5 : 3}" fill="${i === 5 ? P.accent : P.hair}"${live && aligned && i !== 5 ? ` class="cal-vt" style="transform-box:fill-box;transform-origin:50% 0;${dly(at)}"` : ''}/>`).join('')
  const glint = live ? `<rect class="cal-glint" x="${r2(cx - 12)}" y="${y - 1}" width="24" height="1" fill="${P.text}" style="${dly(at + 450)}"/>` : ''
  return `<g shape-rendering="crispEdges"${live ? ` class="cal-vern" style="--vx:5px;${dly(at)}"` : ''}>${ticks}${glint}</g>`
}

// ---------------------------------------------------------------- the dial
/** The figure slot's instrument: a 26 px ring, the arc the progress, the needle hunting while a job runs. */
export type DialOpts = { /** The value just changed: the needle swings from it, overshoots and settles (520 ms, pinned). */ was?: Was<number>; /** The knurled bezel around the ring (turning while a job works). */ bezel?: boolean; /** Its gradient's id (one per Svg). */ id?: string }
/** The angle of the needle for a value (the ring runs 270 degrees from -225). */
export const needleAngle = (pct: number): number => -225 + 270 * (Math.max(0, Math.min(100, pct)) / 100)
/**
 * The knurled bezel (fake 3D): a dashed ring outside the dial, a darker ring 1 px under it (its extruded edge) and a FIXED
 * specular arc on its upper left. While a job works the knurl turns (its dashes stepped at 4 fps: idle-cheap) under the
 * still light, which reads as turned metal. At rest it stands.
 */
export const bezel = (P: CalPal, cx: number, cy: number, r: number, working: boolean, id: string): string =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${P.text}" stop-opacity=".55"/><stop offset=".5" stop-color="${P.text}" stop-opacity="0"/></linearGradient></defs><circle cx="${cx}" cy="${r2(cy + 1)}" r="${r}" fill="none" stroke="${P.line}" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${P.hair}" stroke-width="2" stroke-dasharray="1 1.5"${working ? ' class="cal-knurl"' : ''}/><path d="M${r2(cx - r * 0.97)} ${r2(cy - r * 0.26)}A${r} ${r} 0 0 1 ${r2(cx + r * 0.26)} ${r2(cy - r * 0.97)}" fill="none" stroke="url(#${id})" stroke-width="2"/>`
export const dial = (P: CalPal, cx: number, cy: number, pct: number, working: boolean, o: DialOpts = {}): string => {
  const r = 13
  const a0 = -225
  const a1 = a0 + 270 * (Math.max(0, Math.min(100, pct)) / 100)
  const rad = (a: number) => (a * Math.PI) / 180
  const pt = (a: number, rr = r): [number, number] => [cx + rr * Math.cos(rad(a)), cy + rr * Math.sin(rad(a))]
  const arc = (from: number, to: number, color: string, wdt: number): string => {
    const [x1, y1] = pt(from)
    const [x2, y2] = pt(to)
    return `<path d="M${r2(x1)} ${r2(y1)} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${r2(x2)} ${r2(y2)}" fill="none" stroke="${color}" stroke-width="${wdt}" stroke-linecap="butt"/>`
  }
  const ticks = [0, 90, 180, 270].map(d => { const [x1, y1] = pt(a0 + d); const [x2, y2] = pt(a0 + d, r - 3); return `<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="${P.hair}" stroke-width="1"/>` }).join('')
  const [nx, ny] = pt(a1, r - 2)
  const line = `<line x1="${cx}" y1="${cy}" x2="${r2(nx)}" y2="${r2(ny)}" stroke="${P.text}" stroke-width="1.5" stroke-linecap="round"${working ? ` class="cal-needle" style="--ox:${cx}px;--oy:${cy}px"` : ''}/>`
  // The settle: an outer group swings from the old angle (the hunt keeps to the line inside it), overshoots 4 degrees, back 1.5.
  const d = o.was ? needleAngle(o.was.from) - a1 : 0
  const s = Math.sign(-d)
  const needle = o.was && Math.abs(d) >= 0.5 ? `<g class="cal-set" style="--ox:${cx}px;--oy:${cy}px;--a:${r2(d)}deg;--o:${4 * s}deg;--u:${-1.5 * s}deg;${dly(o.was.at)}">${line}</g>` : line
  return `${o.bezel ? bezel(P, cx, cy, r + 3.5, working, o.id ?? 'calbz') : ''}${arc(a0, a0 + 270, P.track, 2)}${pct > 0 ? arc(a0, a1, working ? P.accent : P.subtext, 2) : ''}${ticks}${needle}<circle cx="${cx}" cy="${cy}" r="2" fill="${P.text}"/>`
}
/** The idle slot beside the gauge: a resting needle, 12 by 16. */
export const calIdle = (P: CalPal, x: number, y: number): string => {
  const cx = x + 6
  const cy = y + 10
  return `<path d="M${cx - 5} ${cy} A5 5 0 0 1 ${cx + 5} ${cy}" fill="none" stroke="${P.hair}" stroke-width="1.5"/><line x1="${cx}" y1="${cy}" x2="${cx - 4}" y2="${cy - 2.5}" stroke="${P.subtext}" stroke-width="1.2" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="1.4" fill="${P.subtext}"/>`
}

// ---------------------------------------------------------------- marks
/** The jaws beside the name: two hairline jaws and a scale, 14 by 9, drawn from (x, y). */
export const jaws = (P: CalPal, x: number, y: number): string =>
  `<g shape-rendering="crispEdges" fill="${P.subtext}"><rect x="${x}" y="${y}" width="14" height="1"/><rect x="${x}" y="${y}" width="1" height="9"/><rect x="${x + 13}" y="${y}" width="1" height="9"/><rect x="${x + 4}" y="${y}" width="1" height="4"/><rect x="${x + 7}" y="${y}" width="1" height="6"/><rect x="${x + 10}" y="${y}" width="1" height="4"/></g>`
/** A role pin: a ring in the role colour; a filled centre while it is live. */
export const pin = (_P: CalPal, cx: number, cy: number, color: string, live: boolean): string =>
  `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="4" fill="none" stroke="${color}" stroke-width="1.5"${live ? ' class="cal-live"' : ''}/>${live ? `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="1.5" fill="${color}"/>` : ''}`
/** A step: a 3 px tick (done, running), a 1 px hairline tick (to do), a cross (failed), an outline (stopped), centred at (cx, cy), 9 px tall. */
export const calPip = (P: CalPal, st: string, cx: number, cy: number): string => {
  const y = r2(cy - 4.5)
  if (st === 'done') return `<rect x="${r2(cx - 1.5)}" y="${y}" width="3" height="9" fill="${P.accent}" shape-rendering="crispEdges"/>`
  if (st === 'running') return `<rect class="cal-live" x="${r2(cx - 1.5)}" y="${y}" width="3" height="9" fill="${P.accent}" shape-rendering="crispEdges"/>`
  if (st === 'failed') return `<path d="M${r2(cx - 3)} ${r2(cy - 3)}l6 6M${r2(cx + 3)} ${r2(cy - 3)}l-6 6" stroke="${P.alert}" stroke-width="1.5" stroke-linecap="round"/>`
  if (st === 'stopped') return `<rect x="${r2(cx - 1.5)}" y="${y}" width="3" height="9" fill="none" stroke="${P.muted}" shape-rendering="crispEdges"/>`
  return `<rect x="${r2(cx - 0.5)}" y="${y}" width="1" height="9" fill="${P.hair}" shape-rendering="crispEdges"/>`
}

// ---------------------------------------------------------------- the band's hooks
/** The context chip past 85 %: OUT OF TOLERANCE, then OFF THE SCALE at 95 % (the outline pulses). */
export const calChip = (x: number, y: number, ctxPct: number, P: CalPal): { svg: string; w: number } => {
  if (ctxPct < 85) return { svg: '', w: 0 }
  const hot = ctxPct >= 95
  const label = hot ? 'OFF THE SCALE' : 'OUT OF TOLERANCE'
  const tone = hot ? P.alert : P.warn
  const w = Math.round(sansW(label, 9.5, 1.2, true) + 16)
  return { svg: `<g${hot ? ' class="cal-live"' : ''}><rect x="${x}" y="${y - 10.5}" width="${w}" height="14" rx="3" fill="none" stroke="${tone}"/><text x="${r2(x + w / 2)}" y="${y}" text-anchor="middle" font-family="${CAL_FONT}" font-size="9.5" font-weight="700" letter-spacing="1.2" fill="${tone}">${label}</text></g>`, w }
}
/** The context-warning toast text. */
export const calWarning = (pct: number): string => (pct >= 95 ? `Context ${pct} %: off the scale. /compact now` : `Context ${pct} %: out of tolerance soon. /compact`)
/**
 * The tile, the 3 px status edge (accent while a job runs, a hairline when idle, done after it) and, only at 95 % context or over
 * budget, a 7 px hairline crosshair in the bottom-right corner: the instrument is being re-zeroed.
 */
/** The edge's (or pill's) colour change, drawn: from the old colour over 150 ms, pinned to the change (the old CSS transition
 *  could never run: each draw is a new image). */
export const fadeClass = (base: string, was?: Was<string>): string => `class="${base}${was ? ' cal-fade' : ''}"`
const fadeStyle = (was?: Was<string>): string => (was ? ` style="--from:${was.from};${dly(was.at)}"` : '')
export const calFoot = (P: CalPal, W: number, H: number, ctx: { ctxPct: number; overBudget: boolean; isWorking?: boolean; party?: boolean }, was?: Was<string>): string => {
  const edge = ctx.party ? P.done : ctx.isWorking ? P.accent : P.hair
  const cross = ctx.ctxPct >= 95 || ctx.overBudget
    ? `<g stroke="${P.hair}" shape-rendering="crispEdges"><line x1="${W - 14}" y1="${H - 9.5}" x2="${W - 7}" y2="${H - 9.5}"/><line x1="${W - 10.5}" y1="${H - 13}" x2="${W - 10.5}" y2="${H - 6}"/></g>`
    : ''
  return `${frame(P, W, H)}<rect ${fadeClass('cal-edge', was)} x=".5" y="14" width="3" height="${H - 28}" rx="1.5" fill="${edge}"${fadeStyle(was)}/>${cross}`
}
/** The status pill (filled) or, with a `stroke`, a role pill: a hairline outline, the text in the role's colour. */
export const calPill = (x: number, y: number, w: number, h: number, fill: string, opacity: number, stroke?: string, line?: string, was?: Was<string>): string =>
  stroke
    ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="none" stroke="${line ?? stroke}"/>`
    : `<rect ${fadeClass('cal-pill', was)} x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${fill}" fill-opacity="${opacity}"${fadeStyle(was)}/>`
/**
 * The ruler as the band's gauge. In the job-done moment the cursor parks at 100 % with a vernier under it and the ticks rise in
 * a wave from the left (once, 600 ms, pinned to the start so a redraw resumes it). Reduced motion keeps the parked cursor only.
 */
export const calGauge = (P: CalPal, x: number, y: number, w: number, pct: number, o: { working?: boolean; party?: boolean; partyAt?: number; was?: Was<number>; zeroAt?: number } = {}): string => {
  const rw = Math.floor(w / 10) * 10
  if (rw < 10) return ''
  if (o.party) {
    const cx = x + rw
    // the vernier "reads zero": it slides in, its ticks line up, a glint runs along it (pinned to the job's end)
    return `${ruler(P, x, y + 4, rw, 100, { wave: { at: o.partyAt }, tone: P.done })}${vernier(P, Math.min(cx, x + rw - 25), y + 10, true, true, o.partyAt)}`
  }
  // `was` is the old percent: the fine scale slides from the fill it had
  const g = ruler(P, x, y + 4, rw, pct, { live: Boolean(o.working), fine: { id: 'calfn', ...(o.was ? { was: { from: Math.round((rw * Math.max(0, Math.min(100, o.was.from))) / 100), at: o.was.at } } : {}) } })
  // `/missioncontrol play zero`: the same moment under the cursor where it stands
  const cx = x + Math.round((rw * Math.max(0, Math.min(100, pct))) / 100)
  return o.zeroAt !== undefined ? `${g}${vernier(P, Math.max(x + 25, Math.min(cx, x + rw - 25)), y + 10, true, true, o.zeroAt)}` : g
}
