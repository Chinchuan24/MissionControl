// The Boys (fan homage; credits in skins/README.md): the tokens, type, motion and the slim band's hooks. One skin, two modes and a
// hidden third look: ON BRAND (Vought's polish: navy and gold), OFF BOOK (Butcher's grime: coat-black and marker red), SOLID GOLD
// (Soldier Boy's 80s variety hour: olive, brass and cream). People are only ever the approved pixel sprites (theboys-sprites.ts);
// effects around them are drawn. PG-13: gore is never shown. Pure SVG strings and tables; the live numbers (approval, the
// scoreboard, BREAKING) come from theboys-eggs.ts, which the register feeds. The cards are in theboys-cards.ts.
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as SP from './theboys-sprites'
import { COND, FONT, MONO, clamp, clip, clipC, condW, contrast, esc, hash, monoW, px, r1, sansW, spH, spW, unit } from './invincible'
import { pin } from './smooth'
import { approvalAt, breakingAt, scoreAt, turboAt, vnnLine } from './theboys-eggs'

export { SP, COND, FONT, MONO, clamp, clip, clipC, condW, contrast, esc, hash, monoW, px, r1, sansW, spH, spW, unit, pin }
export type Mode = 'brand' | 'book' | 'gold' | 'noir'

// ON BRAND: Vought's internal broadcast console. Navy panels, gold for what earns attention (epaulets, collar, buckle), cape white
// type. Every text colour reads 4.5:1 or better on tile, tile2 and bg (theboys.test.ts checks it).
export const BRAND = {
  mode: 'brand' as Mode, bg: '#0A1430', tile: '#13214A', tile2: '#0F1B3D', line: '#2C4384', track: '#1C2D5E',
  a: '#C9A13B', aT: '#F0D27A', ink: '#0A1430', text: '#F4F6FB', sub: '#BCC6DE', muted: '#8E9AB8',
  done: '#7FD3A0', warn: '#F0D27A', alert: '#FF8A7A', red: '#B22234', redT: '#E8848C', white: '#EDEDED', laser: '#FF2A2A', v: '#4FC3F7',
  dots: 'rgba(240,210,122,.05)',
  roles: ['#F0D27A', '#7FD3A0', '#4FC3F7', '#E8848C', '#BCC6DE', '#C9B0F2'],
  boss: ['#C9A13B', '#F0D27A', '#B22234', '#EDEDED', '#C9A13B'],
}
// OFF BOOK: the same data, hijacked by the Boys. Coat-black, crowbar steel, red marker, manila and tape.
export const BOOK = {
  mode: 'book' as Mode, bg: '#111214', tile: '#1B1D21', tile2: '#23262B', line: '#3A3F45', track: '#2A2D32',
  a: '#C2362F', aT: '#EE7B70', ink: '#111214', text: '#ECE6DA', sub: '#B9B0A0', muted: '#9C958A',
  done: '#8FCB8A', warn: '#C8B48A', alert: '#F08A7E', red: '#C2362F', redT: '#EE7B70', white: '#ECE6DA', laser: '#FF2A2A', v: '#4FC3F7',
  manila: '#C8B48A', tape: '#D9CFA8', green: '#1F4A36', stripe: '#E07A2E',
  dots: 'rgba(236,230,218,.035)',
  roles: ['#EE7B70', '#8FCB8A', '#C8B48A', '#E07A2E', '#B9B0A0', '#9FB8D8'],
  boss: ['#C2362F', '#C8B48A', '#3A3F45', '#ECE6DA', '#C2362F'],
}
// SOLID GOLD (hidden): an 80s variety stage. Olive and brass with cream type; the VHS fringe only as 2 px offsets.
export const GOLD = {
  mode: 'gold' as Mode, bg: '#14150F', tile: '#1E2018', tile2: '#262920', line: '#4B5236', track: '#33372A',
  a: '#D4A637', aT: '#E2C25A', ink: '#14150F', text: '#EFE3C2', sub: '#C9BE9E', muted: '#A49A7C',
  done: '#A9C77A', warn: '#E2C25A', alert: '#E07A6E', red: '#A8423A', redT: '#D9776C', white: '#EFE3C2', laser: '#FF2A2A', v: '#4FD6E0',
  olive: '#4B5236', oliveHi: '#6E7750', vhsA: '#E04FA0', vhsB: '#4FD6E0',
  dots: 'rgba(212,166,55,.05)',
  roles: ['#E2C25A', '#A9C77A', '#C9BE9E', '#D9776C', '#4FD6E0', '#E0A85E'],
  boss: ['#D4A637', '#E2C25A', '#4B5236', '#EFE3C2', '#D4A637'],
}
// THIS MEANS NOIR (hidden, silent): a dark stage. Near-black, gunmetal lines, the amber of his goggle lenses as the one accent.
export const NOIR = {
  mode: 'noir' as Mode, bg: '#0B0C0E', tile: '#121417', tile2: '#0E1013', line: '#3C4650', track: '#1E2329',
  a: '#D9A441', aT: '#F0C46A', ink: '#0B0C0E', text: '#E4E7EA', sub: '#AAB3BC', muted: '#8C96A0',
  done: '#8FC79A', warn: '#D9A441', alert: '#E8907F', red: '#7E2A33', redT: '#E0908F', white: '#E4E7EA', laser: '#D9A441', v: '#D9A441',
  dots: 'rgba(217,164,65,.035)',
  roles: ['#F0C46A', '#8FC79A', '#AAB3BC', '#E0908F', '#9FB8D8', '#C9B0F2'],
  boss: ['#D9A441', '#3C4650', '#121417', '#E4E7EA', '#D9A441'],
}
export const pal = (m: Mode): Record<string, any> => (m === 'book' ? BOOK : m === 'gold' ? GOLD : m === 'noir' ? NOIR : BRAND)
// Props keep their own colours in every mode.
export const PROPS: Record<string, string> = {
  skin: '#F4B88F', hair: '#EBB34E', milk: '#F7F7F2', milkEdge: '#C9D3E0', glass: '#DDE8F2', vblue: '#4FC3F7', vdeep: '#1E88C8',
  tape: '#D9CFA8', manila: '#C8B48A', marker: '#C2362F', ink: '#0A0B0D', flash: '#FFFFFF', confetti: '#F0D27A', burst: '#FFF4C2',
  paper: '#F4F1E8', paperInk: '#1A1C22', stamp: '#C8202C', hero: '#C81E28',
}

// ---------------------------------------------------------------- small drawing helpers
export const T = (x: any, y: any, text: any, size: any, weight: any, fill: any, extra: any = '') => `<text x="${r1(x)}" y="${r1(y)}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" ${extra}>${esc(text)}</text>`
export const C = (x: any, y: any, text: any, size: any, fill: any, extra: any = '') => `<text x="${r1(x)}" y="${r1(y)}" font-family="${COND}" font-size="${size}" font-weight="800" fill="${fill}" ${extra}>${esc(text)}</text>`
export const M = (x: any, y: any, text: any, size: any, fill: any, extra: any = '') => `<text x="${r1(x)}" y="${r1(y)}" font-family="${MONO}" font-size="${size}" font-weight="500" fill="${fill}" ${extra}>${esc(text)}</text>`
export const star = (cx: any, cy: any, r: any, fill: any, extra: any = '') => {
  const pts = []
  for (let i = 0; i < 10; i++) { const a = (Math.PI * 2 * i) / 10 - Math.PI / 2; const rr = i % 2 ? r * 0.45 : r; pts.push(`${r1(cx + Math.cos(a) * rr)},${r1(cy + Math.sin(a) * rr)}`) }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" ${extra}/>`
}
/** A piece of tape (OFF BOOK): a pale strip with ragged ends, rotated `rot` degrees about its centre. */
export const tape = (cx: any, cy: any, w: any, h: any, rot: any = -8, op: any = 0.85) => {
  const x = -w / 2
  const y = -h / 2
  const d = `M${r1(x)} ${r1(y)}l2 1.2 -1.4 1.6 1.6 1.4 -1.2 1.8L${r1(x)} ${r1(y + h)}H${r1(-x)}l-1.6 -1.4 1.2 -1.6 -1.6 -1.4 1.4 -1.6L${r1(-x)} ${r1(y)}z`
  return `<path transform="translate(${r1(cx)} ${r1(cy)}) rotate(${rot})" d="${d}" fill="${PROPS.tape}" opacity="${op}"/>`
}
/** A rubber stamp: a ringed box of condensed caps, rotated. `cls` for the slam. */
export const stamp = (cx: any, cy: any, text: any, col: any, size: any = 11, rot: any = -8, cls: any = '') => {
  const w = condW(text, size, 1.2) + 14
  const h = size + 8
  return `<g transform="translate(${r1(cx)} ${r1(cy)}) rotate(${rot})"${cls ? ` class="${cls}"` : ''}><rect x="${r1(-w / 2)}" y="${r1(-h / 2)}" width="${r1(w)}" height="${h}" rx="2" fill="none" stroke="${col}" stroke-width="1.6"/><rect x="${r1(-w / 2 + 2.5)}" y="${r1(-h / 2 + 2.5)}" width="${r1(w - 5)}" height="${h - 5}" rx="1" fill="none" stroke="${col}" stroke-width=".7" opacity=".7"/>${C(0, size * 0.36, text, size, col, 'text-anchor="middle" letter-spacing="1.2"')}</g>`
}
export const svgOpen = (W: any, H: any, css: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="font-variant-numeric:tabular-nums"><style>${css}</style>`

// ---------------------------------------------------------------- CSS (every animation has a reduced-motion fallback)
export const CSS = `
.tb-pulse{animation:tb-pulse 1.6s ease-in-out infinite}@keyframes tb-pulse{50%{opacity:.55}}
.tb-run{animation:tb-run 1.2s steps(1) infinite}@keyframes tb-run{50%{opacity:.35}}
.tb-glide{animation:tb-glide 3.5s steps(7) infinite}@keyframes tb-glide{to{transform:translateX(63px)}}
.tb-flick{animation:tb-flick .9s steps(2) infinite}@keyframes tb-flick{50%{fill:#F0D27A}}
.tb-puff{transform-box:fill-box;transform-origin:50% 50%;animation:tb-puff 8s steps(1) infinite}@keyframes tb-puff{0%,4%,8%{transform:scale(1.25)}2%,6%,10%,100%{transform:none}}
.tb-glint{animation:tb-glint 2.4s ease-in-out infinite}@keyframes tb-glint{50%{opacity:.35}}
.tb-slosh{animation:tb-slosh .5s steps(2) infinite}@keyframes tb-slosh{50%{transform:translateX(.6px)}}
.tb-crawl{animation:tb-crawl var(--cl,40s) linear both}@keyframes tb-crawl{from{transform:translateX(var(--cs,0px))}to{transform:translateX(var(--cx,-1200px))}}
.tb-break{animation:tb-break 6s steps(1) both}@keyframes tb-break{0%,97%{opacity:1}98%,100%{opacity:0}}
.tb-bslide{animation:tb-bslide 6s cubic-bezier(.2,.9,.2,1) both}@keyframes tb-bslide{0%{transform:translateX(-80px)}6%,94%{transform:none}100%{transform:translateX(-80px)}}
.tb-blink{animation:tb-blink 1s steps(1) infinite}@keyframes tb-blink{50%{opacity:0}}
.tb-cheer{animation:tb-cheer 2.8s steps(1) both}@keyframes tb-cheer{0%,95%{opacity:1}96%,100%{opacity:0}}
.tb-flash{animation:tb-flash 2.8s steps(1) both}@keyframes tb-flash{0%,2%{opacity:.8}3%,9%{opacity:0}10%,11%{opacity:.6}12%,100%{opacity:0}}
.tb-slam{transform-box:fill-box;transform-origin:50% 50%;animation:tb-slam 2.8s cubic-bezier(.2,1.3,.3,1) both}@keyframes tb-slam{0%,10%{transform:scale(2.6) rotate(-8deg);opacity:0}11%{opacity:1}22%{transform:scale(.95) rotate(-8deg)}26%,90%{transform:scale(1) rotate(-8deg);opacity:1}100%{opacity:0;transform:scale(1) rotate(-8deg)}}
.tb-fall{animation:tb-fall 2.8s linear both}@keyframes tb-fall{0%{transform:translateY(-30px)}100%{transform:translateY(150px)}}
.tb-pop{transform-box:fill-box;transform-origin:50% 50%;animation:tb-pop 2.8s steps(1) both}@keyframes tb-pop{0%{opacity:0}var(--pp,5%){opacity:1}100%{opacity:0}}
.tb-score{animation:tb-score 1s steps(1) infinite}@keyframes tb-score{50%{opacity:.6}}
.tb-shut{animation:tb-shut .6s steps(1) 4 both}@keyframes tb-shut{50%{opacity:.25}}
.tb-swap{animation:tb-swap 2.2s steps(1) both}@keyframes tb-swap{0%,95%{opacity:1}96%,100%{opacity:0;visibility:hidden}}
.tb-tear{animation:tb-tear 2.2s steps(1) both}@keyframes tb-tear{0%{transform:translateX(0)}8%{transform:translateX(-14px)}14%{transform:translateX(9px)}20%{transform:translateX(-4px)}26%,100%{transform:none}}
.tb-static{animation:tb-static .18s steps(2) infinite}@keyframes tb-static{50%{transform:translateY(3px)}}
.tb-wipe{animation:tb-wipe 2.2s cubic-bezier(.7,0,.3,1) both}@keyframes tb-wipe{0%{transform:translateX(-110%)}35%,70%{transform:none}100%{transform:translateX(110%)}}
.tb-streak{animation:tb-streak .7s linear infinite}@keyframes tb-streak{to{transform:translateX(-24px)}}
.tb-cheer,.tb-flash,.tb-slam,.tb-fall,.tb-pop{animation-delay:var(--cd,0s)}
@media (prefers-reduced-motion: reduce){
 .tb-pulse,.tb-run,.tb-glide,.tb-flick,.tb-puff,.tb-glint,.tb-slosh,.tb-crawl,.tb-break,.tb-bslide,.tb-blink,.tb-cheer,.tb-flash,.tb-slam,.tb-fall,.tb-pop,.tb-score,.tb-shut,.tb-swap,.tb-tear,.tb-static,.tb-wipe,.tb-streak{animation:none}
 .tb-flash,.tb-fall,.tb-static{opacity:0}.tb-slam{transform:rotate(-8deg)}.tb-crawl{transform:none}.tb-wipe{display:none}
}`

// ---------------------------------------------------------------- band pieces (the ThemeEggs.slim hooks)
/** The band: the usual 134 rows plus a 14 px VNN crawl strip along the foot. */
export const BAND_H = 148
export const CRAWL_Y = 134

/** The Homelander face icon (10 by 10) that follows the approval number: >=70 slow grin, 50-69 smile, 30-49 tight smile with the
 *  cheek puff (every 8 s), under 30 the disgusted frown with red eyes. */
export const faceOf = (n: number): 'grin' | 'smile' | 'tight' | 'disgust' => (n >= 70 ? 'grin' : n >= 50 ? 'smile' : n >= 30 ? 'tight' : 'disgust')
export const faceIcon = (x: number, y: number, n: number, still = false) => {
  const f = faceOf(n)
  const eye = f === 'disgust' ? '#FF2A2A' : '#1A2340'
  let s = `<g transform="translate(${r1(x)} ${r1(y)})"><circle cx="5" cy="5.4" r="4.6" fill="${PROPS.skin}"/><path d="M.8 4.2Q1.2 0 5 .4Q9 .2 9.4 3.4Q7 1.6 4.6 2.6Q2.4 2 .8 4.2z" fill="${PROPS.hair}"/>`
  s += `<rect x="2.8" y="4.4" width="1.3" height="1.2" fill="${eye}"/><rect x="6" y="4.4" width="1.3" height="1.2" fill="${eye}"/>`
  if (f === 'grin') s += `<path d="M2.6 6.8Q5 9.6 7.6 6.8" fill="#FFFFFF" stroke="#7A3B2A" stroke-width=".7"/>`
  else if (f === 'smile') s += `<path d="M3 7Q5 8.6 7.2 7" fill="none" stroke="#7A3B2A" stroke-width=".8"/>`
  else if (f === 'tight') s += `<path d="M3.2 7.4H6.9" stroke="#7A3B2A" stroke-width=".8"/><g${still ? '' : ' class="tb-puff"'}><circle cx="2.2" cy="7" r="1.2" fill="#E9A47B"/><circle cx="7.9" cy="7" r="1.2" fill="#E9A47B"/></g>`
  else s += `<path d="M3 8.2Q5 6.6 7.2 8.2" fill="none" stroke="#7A3B2A" stroke-width=".8"/>`
  return `${s}</g>`
}
/** The APPROVAL RATING meter (M1): the face, a 60 by 10 poll bar split HOMETEAMERS (gold) / STARLIGHTERS (white), the number.
 *  OFF BOOK flips the label to the Boys' side (DIRT ON HIM, the other share); SOLID GOLD reads PAYBACK FANS. `wide` names both camps. */
export const approvalW = (wide: boolean, m: Mode) => (wide ? sansW(m === 'book' ? 'DIRT ON HIM' : m === 'gold' ? 'PAYBACK FANS' : 'HOMETEAMERS', 9.5, 0.8, true) + 6 + 60 + 6 + sansW('100%', 13, 0, true) + (m === 'brand' ? 8 + sansW('· STARLIGHTERS 100%', 9.5, 0.4, true) : 0) : sansW('APPROVAL', 9.5, 0.8, true) + 6 + 60 + 6 + sansW('100%', 13, 0, true)) + 14
export const approval = (x: number, y: number, n: number, m: Mode, wide: boolean) => {
  const P = pal(m)
  const v = Math.round(clamp(n, 0, 100))
  const shown = m === 'book' ? 100 - v : v
  const label = wide ? (m === 'book' ? 'DIRT ON HIM' : m === 'gold' ? 'PAYBACK FANS' : 'HOMETEAMERS') : 'APPROVAL'
  let s = `<g data-egg="approval"><title>${esc(`HomeTeamers ${v}% · Starlighters ${100 - v}%`)}</title>${faceIcon(x, y - 9.5, v)}`
  let cx = x + 14
  s += T(cx, y, label, 9.5, 700, P.muted, 'letter-spacing=".8"')
  cx += sansW(label, 9.5, 0.8, true) + 6
  const fillA = m === 'book' ? P.a : P.a
  const fillB = m === 'gold' ? P.olive : m === 'book' ? P.line : P.white
  s += `<rect x="${r1(cx)}" y="${y - 8}" width="60" height="7" rx="1.5" fill="${fillB}" opacity="${m === 'brand' ? 0.85 : 1}"/><rect x="${r1(cx)}" y="${y - 8}" width="${r1((60 * shown) / 100)}" height="7" rx="1.5" fill="${fillA}"/><rect x="${r1(cx + 29.5)}" y="${y - 10}" width="1" height="11" fill="${P.text}" opacity=".5"/>`
  cx += 66
  s += T(cx, y, `${shown}%`, 13, 700, m === 'book' ? P.aT : P.aT, 'font-variant-numeric="tabular-nums"')
  if (wide && m === 'brand') s += T(cx + sansW(`${shown}%`, 13, 0, true) + 8, y, `· STARLIGHTERS ${100 - v}%`, 9.5, 700, P.muted, 'letter-spacing=".4"')
  return `${s}</g>`
}
/** The session total, "Total $1.23". */
export const total = (x: number, y: number, usd: number, m: Mode) => {
  const P = pal(m)
  const v = `$${(Number.isFinite(usd) && usd > 0 ? usd : 0).toFixed(2)}`
  const w = sansW('Total ', 11.5) + sansW(v, 11.5, 0, true) + 2
  return { svg: `<text x="${r1(x)}" y="${y}" font-family="${FONT}" font-size="11.5" fill="${P.muted}" font-variant-numeric="tabular-nums">Total <tspan font-weight="700" fill="${P.text}">${v}</tspan></text>`, w }
}
/** The name: MISSION CONTROL as a broadcast tag, the Total, the APPROVAL meter, then the network line on wide bands. */
export const name = (x: number, y: number, W: number, m: Mode, usd: number, at: number) => {
  const P = pal(m)
  const label = 'MISSION CONTROL'
  const tw = condW(label, 10, 1.4) + 16
  let s = ''
  if (m === 'brand') s += `<rect x="${x}" y="${y - 12}" width="${r1(tw)}" height="16" rx="8" fill="${P.ink}" stroke="${P.a}" stroke-width="1.2"/>${C(x + 8, y, label, 10, P.aT, 'letter-spacing="1.4"')}`
  else if (m === 'book') s += `${tape(x + tw / 2, y - 4, tw + 4, 15, -1.5, 0.92)}${C(x + 8, y, label, 10, PROPS.paperInk, 'letter-spacing="1.4"')}`
  else s += `<rect x="${x}" y="${y - 12}" width="${r1(tw)}" height="16" rx="2" fill="${P.olive}" stroke="${P.a}" stroke-width="1"/>${bulbs(x + 3, y - 13.5, tw - 6, 'gold', at)}${C(x + 8, y, label, 10, P.text, 'letter-spacing="1.4"')}`
  let w = tw + 2
  const tot = total(x + w + 12, y, usd, m)
  s += tot.svg
  w += 12 + tot.w
  const wide = W >= 1200
  const ap = approval(x + w + 16, y, approvalAt(at), m, wide)
  s += ap
  w += 16 + approvalW(wide, m)
  const firm = W >= 1450 ? (m === 'book' ? 'THE BOYS · OFF THE BOOKS' : m === 'gold' ? 'SOLID GOLD · LIVE' : 'VOUGHT INTERNATIONAL · SUPE OPERATIONS') : W >= 1000 ? (m === 'book' ? 'THE BOYS' : m === 'gold' ? 'SOLID GOLD' : 'VOUGHT INTERNATIONAL') : ''
  if (firm) {
    s += m === 'book' ? C(x + w + 10, y, firm, 10, P.aT, 'letter-spacing="2"') : M(x + w + 10, y, firm, 9, m === 'gold' ? P.aT : P.a, 'letter-spacing="1.2"')
    w += 10 + (m === 'book' ? condW(firm, 10, 2) : monoW(firm, 9) + firm.length * 1.2)
  }
  return { svg: s, w }
}
/** A row of marquee bulbs (SOLID GOLD), every other one lit, the lit ones chasing. */
export const bulbs = (x: number, y: number, w: number, _m: Mode, _at: number) => {
  // Two patterns (every other bulb lit, the lit ones chasing) in place of one circle per bulb: a band-wide row stays small.
  const n = Math.max(2, Math.floor(w / 6))
  const id = `tbb${hash(`${r1(x)}|${r1(y)}|${n}`) % 100000}`
  const ww = r1(n * 6)
  const pat = (k: string, cx: number, fill: string) => `<pattern id="${id}${k}" x="${r1(x)}" y="${r1(y - 2)}" width="12" height="4" patternUnits="userSpaceOnUse"><circle cx="${cx}" cy="2" r="1.1" fill="${fill}"/></pattern>`
  return `<g><defs>${pat('l', 3, '#FFF3C4')}${pat('u', 9, GOLD.a)}</defs><rect x="${r1(x)}" y="${r1(y - 2)}" width="${ww}" height="4" fill="url(#${id}u)"/><rect class="tb-run" x="${r1(x)}" y="${r1(y - 2)}" width="${ww}" height="4" fill="url(#${id}l)"/></g>`
}
/** The context chip: 85-94 STAY ON BRAND with the stressed smile; 95+ LOOK AT ME. in laser red with two eye glints. */
export const CHIP_WORDS: Record<Mode, [string, string]> = { brand: ['STAY ON BRAND', 'LOOK AT ME.'], book: ['DIRT RUNNING OUT', 'CLEAR THE DECKS, MATE'], gold: ['THAWING…', 'CHEST GLOW'], noir: ['…', '… …'] }
export const chip = (x: number, y: number, pct: number, m: Mode) => {
  if (pct < 85) return { svg: '', w: 0 }
  const P = pal(m)
  const hot = pct >= 95
  const label = CHIP_WORDS[m][hot ? 1 : 0]
  const lead = m === 'brand' ? 14 : 0
  const w = Math.round(condW(label, 10, 1) + 16 + lead)
  const fill = hot ? PROPS.hero : m === 'book' ? P.manila : m === 'gold' ? P.olive : P.a
  const ink = hot ? '#FFFFFF' : m === 'gold' ? P.text : P.ink
  let s = `<g${hot ? ' class="tb-pulse"' : ''}><rect x="${x}" y="${y - 12}" width="${w}" height="16" rx="${m === 'book' ? 1 : 8}" fill="${fill}"/>`
  if (m === 'brand' && !hot) s += faceIcon(x + 5, y - 9.5, 40)
  if (m === 'brand' && hot) s += `<g class="tb-glint"><circle cx="${x + 8}" cy="${y - 4}" r="1.6" fill="#FFD0C8"/><circle cx="${x + 13}" cy="${y - 4}" r="1.6" fill="#FFD0C8"/></g>`
  if (m === 'gold' && !hot) s += `<path d="M${x} ${y - 12}h6l-6 6zM${x + w} ${y + 4}h-6l6 -6z" fill="#CFE8F0" opacity=".7"/>`
  s += `${C(x + 8 + lead, y, label, 10, ink, 'letter-spacing="1"')}</g>`
  return { svg: s, w: w + 2 }
}
export const WARNINGS: Record<Mode, (pct: number) => string> = {
  brand: pct => (pct >= 95 ? `Context ${pct}%: legal says compact now.` : `Context ${pct}%: stay on brand. /compact soon.`),
  book: pct => (pct >= 95 ? `Context ${pct}%: clear the decks, mate.` : `Context ${pct}%: the dirt's running out. /compact soon.`),
  gold: pct => (pct >= 95 ? `Context ${pct}%: chest glow. /compact now.` : `Context ${pct}%: thawing out. /compact soon.`),
  noir: pct => `… (context ${pct}%: /compact)`,
}
/** The episode: a broadcast bug (ON BRAND), a duct-tape label (OFF BOOK), a VHS label (SOLID GOLD); the title only when `full`. */
export const epW = (code: string, title: string, full: boolean) => condW(code, 9.5, 0.8) + 16 + (full ? 8 + sansW(title, 11.5) : 0)
export const ep = (xr: number, y: number, code: string, title: string, full: boolean, m: Mode) => {
  const P = pal(m)
  const cw = condW(code, 9.5, 0.8) + 16
  let s = ''
  let x = xr
  if (full) { x -= sansW(title, 11.5); s += T(x, y, title, 11.5, 400, P.sub, 'font-style="italic"'); x -= 8 }
  x -= cw
  if (m === 'brand') s += `<rect x="${r1(x)}" y="${y - 11.5}" width="${r1(cw)}" height="15" rx="7.5" fill="${P.ink}" stroke="${P.a}" stroke-width="1.2"/>${C(x + 8, y, code, 9.5, '#FFFFFF', 'letter-spacing=".8"')}`
  else if (m === 'book') s += `${tape(x + cw / 2, y - 4, cw + 2, 15, 2, 0.95)}${C(x + 8, y, code, 9.5, PROPS.paperInk, 'letter-spacing=".8"')}`
  else s += `<rect x="${r1(x)}" y="${y - 11.5}" width="${r1(cw)}" height="15" fill="${P.text}"/><rect x="${r1(x)}" y="${y - 11.5}" width="${r1(cw)}" height="3" fill="${P.ink}"/>${C(x + 8, y + 0.5, code, 9.5, P.ink, 'letter-spacing=".8"')}`
  return s
}
/** The 7-seat ROSTER (the band's gauge): the Seven's table, one seat lit per finished step (scaled to 7). Working: a gold cursor
 *  glides seat to seat. All lit: FULL ROSTER. Idle with nothing done: SEATS VACANT. OFF BOOK: DIRT with paper-clip ticks.
 *  SOLID GOLD: PAYBACK, seven brass stars. */
export const SEATS = 7
export const litOf = (done: number, total: number) => (total > 0 ? Math.round((clamp(done, 0, total) / total) * SEATS) : 0)
export const gauge = (xr: number, y: number, isWorking: boolean, done: number, total: number, m: Mode) => {
  const P = pal(m)
  const lit = litOf(done, total)
  const full = lit >= SEATS
  const label = full ? (m === 'book' ? 'ALL THE DIRT' : m === 'gold' ? 'FULL PAYBACK' : 'FULL ROSTER') : !isWorking && lit === 0 ? (m === 'book' ? 'NO DIRT YET' : m === 'gold' ? 'PAYBACK' : 'SEATS VACANT') : m === 'book' ? 'DIRT' : m === 'gold' ? 'PAYBACK' : 'ROSTER'
  const count = `${lit}/${SEATS}`
  const lw = sansW(label, 9.5, 0.8, true)
  const cw = sansW(count, 13, 0, true)
  const w = lw + 8 + SEATS * 9 + 7 + cw
  const x = xr - w
  let s = `<g data-egg="roster">${T(x, y, label, 9.5, 700, full ? P.aT : P.muted, 'letter-spacing=".8"')}`
  const sx = x + lw + 8
  for (let i = 0; i < SEATS; i++) {
    const on = i < lit
    const cx = sx + i * 9
    if (m === 'gold') s += star(cx + 3.5, y - 4, 3.6, on ? P.a : 'none', on ? '' : `stroke="${P.muted}" stroke-width=".8"`)
    else if (m === 'book') s += `<rect x="${r1(cx)}" y="${y - 9}" width="7" height="9" fill="${on ? P.manila : 'none'}" stroke="${on ? P.manila : P.muted}" stroke-width=".8"/>${on ? `<path d="M${r1(cx + 1.5)} ${y - 4.5}l1.6 1.8 2.6 -3.6" fill="none" stroke="${P.red}" stroke-width="1.2"/><path d="M${r1(cx + 4.5)} ${y - 10.5}v3" stroke="${P.sub}" stroke-width=".8"/>` : ''}`
    else s += `<path d="M${r1(cx)} ${y - 1}v-6.5a3.5 3 0 0 1 7 0V${y - 1}z" fill="${on ? P.a : 'none'}" stroke="${on ? P.aT : P.muted}" stroke-width=".8"/>${on ? `<circle cx="${r1(cx + 3.5)}" cy="${y - 5}" r="1" fill="${P.ink}"/>` : ''}`
  }
  if (isWorking && !full) s += `<rect class="tb-glide" x="${r1(sx)}" y="${y + 1.5}" width="7" height="1.4" fill="${P.aT}"/>`
  s += T(sx + SEATS * 9 + 7, y, count, 13, 700, P.text, 'font-variant-numeric="tabular-nums"')
  return { svg: `${s}</g>`, w }
}
/** The Compound V syringe (the task row's gauge): a needle at the left, the glass barrel, the blue dose filling to the progress
 *  point with the plunger head riding it, the rod and its flange at the right. At 95%+ context it flickers gold (unstable).
 *  OFF BOOK: scratched glass and a strip of tape. SOLID GOLD: a brass VU meter in its place. */
export const syringe = (x: number, y: number, w: number, pct: number, m: Mode, o: { near?: boolean; working?: boolean; stolen?: boolean } = {}) => {
  const P = pal(m)
  const p = clamp(pct, 0, 100) / 100
  if (m === 'gold') {
    const n = Math.max(4, Math.floor((w - 4) / 4))
    const lit = Math.round(p * n)
    let s = `<g data-egg="vu"><rect x="${r1(x)}" y="${y - 1}" width="${r1(w)}" height="9" rx="1.5" fill="${P.tile2}" stroke="${P.line}"/>`
    for (let i = 0; i < n; i++) s += `<rect x="${r1(x + 2 + i * 4)}" y="${y + 1}" width="2.6" height="5" fill="${i >= n * 0.86 ? P.redT : i < lit ? P.a : P.track}"/>`
    return `${s}</g>`
  }
  const bx = x + 12
  const bw = Math.max(20, w - 22)
  const fx = bx + bw * p
  let s = `<g data-egg="syringe"><path d="M${r1(x)} ${y + 3.5}h11" stroke="${P.sub}" stroke-width="1"/><rect x="${r1(x + 8)}" y="${y + 1}" width="4" height="5" fill="${P.sub}" opacity=".8"/>`
  if (o.stolen) {
    s += `<rect x="${r1(bx)}" y="${y - 1}" width="${r1(bw)}" height="9" rx="2" fill="none" stroke="${P.muted}" stroke-dasharray="3 2"/>`
    return `${s}</g>`
  }
  s += `<rect x="${r1(bx)}" y="${y - 1}" width="${r1(bw)}" height="9" rx="2" fill="${PROPS.glass}" fill-opacity=".1" stroke="${P.sub}" stroke-opacity=".7"/>`
  if (p > 0) s += `<rect x="${r1(bx + 1)}" y="${y}" width="${r1(Math.max(0, fx - bx - 1))}" height="7" rx="1.4" fill="${PROPS.vblue}"${o.near ? ' class="tb-flick"' : ''}/><rect x="${r1(bx + 1)}" y="${y + 0.6}" width="${r1(Math.max(0, fx - bx - 2))}" height="1.4" fill="#BFE9FF" opacity=".75"/>`
  for (let i = 1; i < 10; i++) s += `<rect x="${r1(bx + (bw * i) / 10)}" y="${y - 1}" width=".8" height="${i % 5 ? 2.5 : 4}" fill="${P.sub}" opacity=".6"/>`
  s += `<rect x="${r1(fx - 1)}" y="${y - 0.5}" width="3" height="8" fill="${m === 'book' ? '#2A2D32' : '#1A2340'}"/><path d="M${r1(fx + 2)} ${y + 3.5}H${r1(bx + bw + 6)}" stroke="${P.sub}" stroke-width="1.6"/><rect x="${r1(bx + bw + 6)}" y="${y - 2}" width="2.2" height="11" rx="1" fill="${P.sub}"/>`
  if (m === 'book') s += `<path d="M${r1(bx + bw * 0.2)} ${y + 6}l9 -6M${r1(bx + bw * 0.62)} ${y + 7}l6 -5" stroke="${P.text}" stroke-width=".5" opacity=".45"/>${tape(bx + bw * 0.36, y + 3.5, 16, 12, 12, 0.8)}`
  return `${s}</g>`
}
/** A step pip: ON BRAND gold stars (done) and hollow ones; OFF BOOK marker ticks in boxes; SOLID GOLD brass dots. */
export const pip = (st: string, cx: number, cy: number, m: Mode) => {
  const P = pal(m)
  if (st === 'failed') return `<path d="M${r1(cx - 3)} ${r1(cy - 3)}l6 6M${r1(cx + 3)} ${r1(cy - 3)}l-6 6" stroke="${P.alert}" stroke-width="1.5"/>`
  if (m === 'book') {
    const box = (stroke: string, op = 1) => `<rect x="${r1(cx - 4)}" y="${r1(cy - 4)}" width="8" height="8" fill="none" stroke="${stroke}" stroke-width="1" opacity="${op}"/>`
    if (st === 'done') return `${box(P.sub)}<path d="M${r1(cx - 2.6)} ${r1(cy)}l2 2.4 3.6 -5" fill="none" stroke="${P.aT}" stroke-width="1.6"/>`
    if (st === 'running') return `${box(P.aT)}<rect class="tb-run" x="${r1(cx - 1.5)}" y="${r1(cy - 1.5)}" width="3" height="3" fill="${P.aT}"/>`
    return box(P.muted, st === 'stopped' ? 0.5 : 1)
  }
  if (m === 'gold') {
    if (st === 'done') return `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="3.8" fill="${P.a}"/><circle cx="${r1(cx - 1)}" cy="${r1(cy - 1)}" r="1" fill="#FFF3C4"/>`
    if (st === 'running') return `<circle class="tb-run" cx="${r1(cx)}" cy="${r1(cy)}" r="3.6" fill="none" stroke="${P.a}" stroke-width="1.4"/>`
    return `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="3.4" fill="none" stroke="${P.muted}" stroke-width="1"${st === 'stopped' ? ' opacity=".5"' : ''}/>`
  }
  if (st === 'done') return star(cx, cy, 4.8, P.a)
  if (st === 'running') return `${star(cx, cy, 4.6, 'none', `stroke="${P.aT}" stroke-width="1"`)}<circle class="tb-run" cx="${r1(cx)}" cy="${r1(cy)}" r="1.4" fill="${P.aT}"/>`
  return star(cx, cy, 4.4, 'none', `stroke="${P.muted}" stroke-width=".9"${st === 'stopped' ? ' opacity=".5"' : ''}`)
}
/** One staffer (the crew, 7 by 10 at 1.4x): a Vought suit in the role's tint, a lanyard. OFF BOOK desaturates them. */
export const crew = (x: number, y: number, color: string, m: Mode, live = false) => {
  const op = m === 'book' ? 0.8 : 1
  return `<g transform="translate(${r1(x)} ${r1(y)}) scale(1.4)" opacity="${op}" shape-rendering="crispEdges"><rect x="2" y="0" width="3" height="3" fill="${PROPS.skin}"/><rect x="2" y="0" width="3" height="1" fill="#5A4532"/><rect x="1" y="3" width="5" height="4" fill="${color}"/><rect x="3" y="3" width="1" height="3" fill="${m === 'book' ? '#ECE6DA' : '#F4F6FB'}"/><rect x="1.5" y="7" width="1.6" height="3" fill="#1A1C22"/><rect x="3.9" y="7" width="1.6" height="3" fill="#1A1C22"/>${live ? `<rect class="tb-run" x="6.2" y="1" width="1" height="1" fill="${color}"/>` : ''}</g>`
}
/** The avatar (34 by 40 at x 20, y 36): Homelander smiling (ON BRAND), Butcher (OFF BOOK), Soldier Boy in gold (SOLID GOLD). On ON
 *  BRAND his eyes glow red when the approval drops under 30 (the disgusted frame). */
export const BUST: Record<Mode, any> = { brand: SP.TB_HOMELANDER_BUST, book: SP.TB_BUTCHER_BUST, gold: SP.TB_SOLIDGOLD_BUST, noir: SP.TB_NOIR_BUST }
export const figure = (m: Mode, at: number) => {
  const sp = BUST[m]
  const s = 0.86
  const x = 37 - (spW(sp) * s) / 2
  let out = px(sp, x, 39, s)
  if (m === 'brand' && approvalAt(at) < 30) out += `<g class="tb-glint"><rect x="${r1(x + 21 * s)}" y="${r1(39 + 9 * s)}" width="${r1(2 * s)}" height="${r1(s)}" fill="#FF2A2A"/><rect x="${r1(x + 26 * s)}" y="${r1(39 + 9 * s)}" width="${r1(2 * s)}" height="${r1(s)}" fill="#FF2A2A"/></g>`
  return out
}
/** The idle slot (12 by 16): a VoughtSonic cup (ON BRAND), a chipped mug (OFF BOOK), a gold record (SOLID GOLD). */
export const idle = (x: number, y: number, m: Mode) => {
  const P = pal(m)
  if (m === 'gold') return `<g transform="translate(${r1(x)} ${r1(y)})"><circle cx="6" cy="9" r="6" fill="${P.a}"/><circle cx="6" cy="9" r="4" fill="none" stroke="#86621A" stroke-width=".6"/><circle cx="6" cy="9" r="1.4" fill="${P.ink}"/></g>`
  if (m === 'book') return `<g transform="translate(${r1(x)} ${r1(y)})"><rect x="1" y="5" width="9" height="10" rx="1.5" fill="#E9E4D8"/><path d="M10 7h2.4a2 2 0 0 1 0 4H10" fill="none" stroke="#E9E4D8" stroke-width="1.2"/><path d="M1 5l2 2 1.4 -2z" fill="${P.tile}"/><rect x="2" y="6.5" width="7" height="1.6" fill="#6B4A2E"/></g>`
  return `<g transform="translate(${r1(x)} ${r1(y)})"><path d="M1.5 4h9l-1.2 11h-6.6z" fill="#EDEDED"/><rect x="1" y="3" width="10" height="2" rx="1" fill="${P.a}"/><path d="M7 3l2 -3" stroke="${P.red}" stroke-width="1"/><rect x="3" y="8" width="6" height="2.4" fill="${P.red}"/></g>`
}
/** The milk glass (the corner gauge, M7): full at low context, draining as it climbs, trembling at 95%. No text. OFF BOOK has a
 *  chipped mug in its place (the joke is gone), SOLID GOLD a gold record. */
export const milkGlass = (x: number, y: number, ctxPct: number, m: Mode) => {
  if (m !== 'brand') return idle(x - 1, y - 2, m)
  const level = clamp(1 - ctxPct / 100, 0, 1)
  const h = 12
  const top = y + 1 + (h - 1) * (1 - level)
  const shake = ctxPct >= 95 ? ' class="tb-slosh"' : ''
  return `<g data-egg="milk"${shake}><path d="M${r1(x)} ${y}h9l-1 ${h}h-7z" fill="${PROPS.glass}" fill-opacity=".14" stroke="${PROPS.milkEdge}" stroke-width=".8"/>${level > 0.02 ? `<path d="M${r1(x + 0.6 + (top - y) / h)} ${r1(top)}H${r1(x + 8.4 - (top - y) / h)}L${r1(x + 7.9)} ${y + h - 0.5}h-6.8z" fill="${PROPS.milk}"/>` : ''}</g>`
}
/** The VNN crawl (M3) along the foot: one original headline per 40 s, seeded by the clock, scrolling right to left (pinned, so a
 *  redraw resumes it). A live BREAKING (from theboys-eggs `vnnBreak`) takes the strip over for 6 s. OFF BOOK: THE WIRE in mono
 *  with redaction bars. SOLID GOLD: the marquee. */
export const CRAWL_MS = 40_000
export const crawl = (W: number, H: number, at: number, m: Mode) => {
  const P = pal(m)
  const y = CRAWL_Y
  const h = H - y
  if (m === 'noir') return `<g data-egg="vnn"><rect x="14" y="${y}" width="${W - 28}" height="${h - 2}" rx="2" fill="${P.bg}" stroke="${P.line}" stroke-width=".6"/><rect x="14" y="${y}" width="30" height="${h - 2}" rx="2" fill="${P.a}"/>${C(29, y + h - 4.5, '…', 9.5, P.ink, 'text-anchor="middle"')}${T(56, y + h - 4.5, '…', 10.5, 400, P.muted)}</g>`
  const tag = m === 'book' ? 'THE WIRE' : m === 'gold' ? 'SOLID GOLD' : 'VNN'
  const tagW = condW(tag, 9.5, 1.2) + 14
  const bg = m === 'book' ? '#0C0D0F' : m === 'gold' ? P.olive : P.bg
  let s = `<g data-egg="vnn"><rect x="14" y="${y}" width="${W - 28}" height="${h - 2}" rx="2" fill="${bg}" stroke="${P.line}" stroke-width=".6"/>`
  const id = `tbc${hash(`${m}|${Math.floor(at / CRAWL_MS)}|${W}`) % 100000}`
  s += `<defs><clipPath id="${id}"><rect x="${r1(14 + tagW + 2)}" y="${y}" width="${r1(W - 28 - tagW - 4)}" height="${h - 2}"/></clipPath></defs>`
  const br = breakingAt(at)
  if (br) {
    const bw = condW('BREAKING', 9.5, 1.2) + 14
    s += `<g class="tb-break" style="animation-delay:calc(${pin(br.at)} + 0s)"><rect x="14" y="${y}" width="${W - 28}" height="${h - 2}" rx="2" fill="${m === 'book' ? '#2A1210' : '#3A0E14'}"/><g class="tb-bslide" style="animation-delay:calc(${pin(br.at)} + 0s)"><rect x="14" y="${y}" width="${r1(bw)}" height="${h - 2}" fill="${PROPS.hero}"/>${C(21, y + h - 4.5, 'BREAKING', 9.5, '#FFFFFF', 'letter-spacing="1.2" class="tb-blink"')}</g>${T(14 + bw + 10, y + h - 4.5, clip(br.line, 10.5, W - 28 - bw - 24, 0, true), 10.5, 700, '#FFFFFF')}</g>`
    return `${s}</g>`
  }
  s += `<rect x="14" y="${y}" width="${r1(tagW)}" height="${h - 2}" rx="2" fill="${m === 'book' ? P.red : P.a}"/>${C(21, y + h - 4.5, tag, 9.5, m === 'brand' ? P.ink : m === 'gold' ? P.ink : '#FFFFFF', 'letter-spacing="1.2"')}`
  const line = vnnLine(at, m)
  const slot = Math.floor(at / CRAWL_MS) * CRAWL_MS
  const txtW = (m === 'book' ? monoW(line, 10) : sansW(line, 10.5)) + 40
  const fill = m === 'book' ? P.text : P.text
  const textSvg = m === 'book' ? redacted(0, y + h - 4.5, line, P) : T(0, y + h - 4.5, `${line}  ·`, 10.5, 400, fill)
  s += `<g clip-path="url(#${id})"><g transform="translate(${r1(14 + tagW + 12)} 0)"><g class="tb-crawl" style="--cs:${r1(W * 0.25)}px;--cx:-${r1(txtW)}px;--cl:${CRAWL_MS / 1000}s;animation-delay:calc(${pin(slot)} + 0s)">${textSvg}</g></g></g>`
  return `${s}</g>`
}
/** THE WIRE's mono line with a word or two under a redaction bar (seeded by the line). */
export const redacted = (x: number, y: number, line: string, P: any) => {
  const words = line.split(' ')
  let cx = x
  let s = ''
  words.forEach((w, i) => {
    const ww = monoW(`${w} `, 10)
    const bar = w.length > 3 && unit(`${line}|${i}`) < 0.18
    s += bar ? `<rect x="${r1(cx)}" y="${y - 8}" width="${r1(ww - 5)}" height="9" fill="#000"/>` : M(cx, y, w, 10, P.text)
    cx += ww
  })
  return s
}
/** The foot: the crawl strip, a hairline in the mode's hand, the milk glass in the corner; TURBO RUSH's green streak under the band
 *  while 4+ tools run (M10). */
export const foot = (W: number, H: number, ctx: any, m: Mode) => {
  const P = pal(m)
  const at = ctx?.at ?? 0
  let s = edge(W, H, ctx, m)
  s += crawl(W, H, at, m)
  s += milkGlass(W - 33, 112, ctx?.ctxPct ?? 0, m)
  if (turboAt(at)) s += `<g data-egg="turbo"><rect x="14" y="${CRAWL_Y - 3}" width="${W - 28}" height="2" fill="${m === 'gold' ? P.a : m === 'book' ? P.sub : '#3DDC84'}" opacity=".8"/><g class="tb-streak">${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${r1(30 + i * ((W - 60) / 6))}" y="${CRAWL_Y - 3}" width="10" height="2" fill="#FFFFFF" opacity=".6"/>`).join('')}</g></g>`
  return s
}
/** The band's own edge: the tile with a gold hairline (ON BRAND), a strip of torn tape at the top-left (OFF BOOK), a bulb row (GOLD);
 *  the status edge at the left, gold while working. */
export const edge = (W: number, H: number, ctx: any, m: Mode) => {
  const P = pal(m)
  const live = ctx?.party ? P.done : ctx?.isWorking ? P.a : P.line
  let s = `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="10" fill="${P.tile}" stroke="${P.line}"/>`
  if (m === 'brand') s += `<rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="8" fill="none" stroke="${P.a}" stroke-opacity=".35" stroke-width=".8"/>`
  if (m === 'book') s += `${tape(40, 3, 46, 9, -4, 0.7)}${tape(W - 50, H - 3, 40, 8, 3, 0.55)}`
  if (m === 'gold') s += bulbs(12, 3, W - 24, m, ctx?.at ?? 0)
  s += `<rect x="1" y="14" width="3" height="${H - 28}" rx="1.5" fill="${live}"/>`
  return s
}
/** The 7SPN TEST SCOREBOARD (M5): an 84 by 14 sports bug in the task row while a test runs and for 20 s after. Clean runs flash a
 *  gold SHUTOUT. OFF BOOK chalks the same numbers on a bookie's slate; SOLID GOLD a brass board. */
export const SCORE_W = 96
export const scoreboard = (x: number, y: number, at: number, m: Mode) => {
  const sc = scoreAt(at)
  if (!sc) return ''
  const P = pal(m)
  const bg = m === 'book' ? '#2B2E2A' : m === 'gold' ? P.olive : '#0B1020'
  const shut = !sc.running && sc.fail === 0 && sc.pass > 0
  const tag = m === 'book' ? 'SLATE' : '7SPN'
  let s = `<g data-egg="scoreboard"><rect x="${r1(x)}" y="${y}" width="${SCORE_W}" height="16" rx="2" fill="${bg}" stroke="${m === 'brand' ? P.a : P.line}" stroke-width="1"/>`
  s += `<rect x="${r1(x)}" y="${y}" width="27" height="16" rx="2" fill="${m === 'book' ? '#3A3F45' : PROPS.hero}"/>${C(x + 4, y + 11.5, tag, 8.5, '#FFFFFF', 'letter-spacing=".6"')}`
  if (shut) s += `<g class="tb-shut">${C(x + 32, y + 11.5, 'SHUTOUT', 9.5, m === 'book' ? P.text : P.aT, 'letter-spacing="1.4"')}</g>${C(x + SCORE_W - 5, y + 11.5, String(sc.pass), 9.5, P.text, 'text-anchor="end"')}`
  else {
    s += `${C(x + 32, y + 11.5, `P ${sc.pass}`, 9.5, P.done)}${C(x + 58, y + 11.5, `F ${sc.fail}`, 9.5, sc.fail ? P.alert : P.muted)}`
    s += sc.running ? `<circle class="tb-score" cx="${r1(x + SCORE_W - 7)}" cy="${y + 8}" r="2.4" fill="${PROPS.hero}"/>` : C(x + SCORE_W - 5, y + 11.5, 'FT', 8, P.muted, 'text-anchor="end" letter-spacing=".4"')
  }
  return `${s}<title>${esc(`7SPN: ${sc.pass} passed, ${sc.fail} failed${sc.running ? ', live' : ''}`)}</title></g>`
}

// ---------------------------------------------------------------- the job-done cheer: THE PRESSER
/** Six camera flashes pop across the band, gold confetti falls, and APPROVED ✓ slams onto the band (OFF BOOK: a taped SORTED.;
 *  SOLID GOLD: a SOLID GOLD! marquee). 2.8 s, pinned. */
export const cheer = (W: number, H: number, m: Mode, o: { delay?: string } = {}) => {
  const P = pal(m)
  const word = m === 'book' ? 'SORTED.' : m === 'gold' ? 'SOLID GOLD!' : 'APPROVED ✓'
  const line = m === 'book' ? 'Job done. Off the books.' : m === 'gold' ? 'That is a wrap, folks.' : 'Another win for Vought.'
  const cx = W / 2
  const cy = H / 2
  let s = `<g class="tb-cheer" pointer-events="none"${o.delay ? ` style="--cd:${o.delay}"` : ''}><rect width="${W}" height="${H}" rx="10" fill="${P.tile}" opacity=".8"/><rect class="tb-flash" width="${W}" height="${H}" rx="10" fill="${PROPS.flash}"/>`
  for (let i = 0; i < 6; i++) {
    const fx = 40 + ((W - 80) * (i + 0.5)) / 6 + (unit(`fl${i}`) - 0.5) * 40
    const fy = 18 + unit(`fy${i}`) * (H - 40)
    s += `<g class="tb-pop" style="--cd:${o.delay ?? '0s'};--pp:${8 + i * 9}%"><circle cx="${r1(fx)}" cy="${r1(fy)}" r="7" fill="${PROPS.flash}" opacity=".85"/><path d="M${r1(fx - 12)} ${r1(fy)}h24M${r1(fx)} ${r1(fy - 12)}v24" stroke="${PROPS.flash}" stroke-width="1.2" opacity=".7"/></g>`
  }
  if (m !== 'book') for (let i = 0; i < 26; i++) s += `<rect class="tb-fall" x="${r1(unit(`cf${i}`) * W)}" y="${r1(-10 - unit(`cy${i}`) * 40)}" width="3" height="${i % 3 ? 3 : 5}" fill="${i % 4 ? PROPS.confetti : '#FFFFFF'}" style="--cd:calc(${o.delay ?? '0s'} - ${r1(unit(`cd${i}`) * 0.8)}s)"/>`
  const ink = m === 'book' ? PROPS.marker : m === 'gold' ? P.a : P.aT
  s += `<g class="tb-slam">${m === 'book' ? tape(cx, cy - 6, condW(word, 30, 2) + 40, 40, 0, 0.92) : ''}${stamp(cx, cy - 6, word, ink, 26, 0)}</g>`
  s += T(cx, cy + 30, line, 12, 700, P.text, 'text-anchor="middle"')
  return `${s}</g>`
}

// ---------------------------------------------------------------- the boot strip
export const BOOTS: Record<Mode, [string, string]> = { brand: ['VOUGHT BROADCAST · 3 · 2 · 1', 'ON AIR. SMILE.'], book: ['SAFEHOUSE LINE · SECURE', 'THE BOYS ARE IN.'], gold: ['ROLL TAPE…', 'SOLID GOLD IS LIVE.'], noir: ['…', '(thumbs up)'] }
export const bootLine = (W: number, m: Mode) => {
  const P = pal(m)
  const [a, b] = BOOTS[m]
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="30" viewBox="0 0 ${W} 30"><style>${CSS}</style><rect x=".5" y=".5" width="${W - 1}" height="29" rx="8" fill="${P.tile}" stroke="${P.line}"/>`
  s += `<circle cx="16" cy="15" r="8" fill="none" stroke="${P.a}" stroke-width="1.2"/><path d="M16 15V7A8 8 0 0 1 23.6 12.5z" fill="${P.a}" opacity=".5"/><circle class="tb-run" cx="16" cy="15" r="2" fill="${PROPS.hero}"/>`
  s += T(32, 19.5, `${a}  ·  ${b}`, 11.5, 700, P.text, 'letter-spacing=".4"')
  return `${s}</svg>`
}

// ---------------------------------------------------------------- the ticker: the hour's episode
// Every verified title (S5E1, S5E3 and S3E6 left out), one per hour.
export const EPISODES: [string, string][] = [
  ['S1E1', 'The Name of the Game'], ['S1E2', 'Cherry'], ['S1E3', 'Get Some'], ['S1E4', 'The Female of the Species'], ['S1E5', 'Good for the Soul'], ['S1E6', 'The Innocents'], ['S1E7', 'The Self-Preservation Society'], ['S1E8', 'You Found Me'],
  ['S2E1', 'The Big Ride'], ['S2E2', 'Proper Preparation and Planning'], ['S2E3', 'Over the Hill with the Swords of a Thousand Men'], ['S2E4', 'Nothing Like It in the World'], ['S2E5', 'We Gotta Go Now'], ['S2E6', 'The Bloody Doors Off'], ['S2E7', 'Butcher, Baker, Candlestick Maker'], ['S2E8', 'What I Know'],
  ['S3E1', 'Payback'], ['S3E2', 'The Only Man in the Sky'], ['S3E3', 'Barbary Coast'], ['S3E4', 'Glorious Five-Year Plan'], ['S3E5', 'The Last Time to Look on This World of Lies'], ['S3E7', 'Here Comes a Candle to Light You to Bed'], ['S3E8', 'The Instant White-Hot Wild'],
  ['S4E1', 'Department of Dirty Tricks'], ['S4E2', 'Life Among the Septics'], ['S4E3', "We'll Keep the Red Flag Flying Here"], ['S4E4', 'Wisdom of the Ages'], ['S4E5', 'Beware the Jabberwock, My Son'], ['S4E6', 'Dirty Business'], ['S4E7', 'The Insider'], ['S4E8', 'Season Four Finale'],
  ['S5E2', 'Teenage Kix'], ['S5E4', 'King of Hell'], ['S5E5', 'One-Shots'], ['S5E6', 'Though the Heavens Fall'], ['S5E7', "The Frenchman, the Female, and the Man Called Mother's Milk"], ['S5E8', 'Blood and Bone'],
]
// The tapes on SOLID GOLD's shelf: `EP` and the year (the band's episode slot reads `S1E4` or `EP 83`).
export const GOLD_TAPES: [string, string][] = [['EP 83', 'Red Thunder'], ['EP 84', 'Whiskey Sunrise'], ['EP 88', 'Red Thunder 2'], ['EP 84', 'Payback · Nicaragua Tour'], ['EP 1', 'Solid Gold · Tonight'], ['EP 27', 'Vought Rising']]
export const episodeAt = (at: number, m: Mode): [string, string] => {
  const day = Math.floor(at / 86_400_000)
  // Once a day, for one hour, the bug reads the prequel's year (no date given).
  if (m === 'brand' && unit(`vr|${day}`) * 24 <= 1 && Math.floor(at / 3_600_000) % 24 === Math.floor(unit(`vrh|${day}`) * 24)) return ['EP 1', 'Vought Rising · 2027 · Red Scare']
  const list = m === 'gold' ? GOLD_TAPES : EPISODES
  return list[Math.floor(at / 3_600_000) % list.length] as [string, string]
}
