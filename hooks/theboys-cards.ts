// The Boys: the pane cards, each a new component (no other skin's card with new labels).
//   Q-SCORE (the level card): a Vought talent contract with a headshot, the STAR POWER dial and a peg-wall of 9 boxed action
//     figures (the badges: a lit blister pack, COMING SOON, or ??? for the secret).
//   CRISIS DESK (the task card and the closed jobs): SITUATION, the steps as talking points stamped SPUN / SPINNING / PENDING, the
//     Compound V syringe, a HOLDING STATEMENT, and the PRESS RELEASES stack with its CONTAINED stamps.
//   FOCUS GROUP (the log): a dial-test chart, one audience line across the card, one marker per tool call; it rises on a success
//     and dips red where a call failed; the picked call gets a speech-bubble label.
//   THE TABLE (the hierarchy): the Seven's boardroom table seen from above, the manager in the gold head chair.
// OFF BOOK keeps every layout and lays the leak over it: tape corners, a LEAKED stamp, a coffee ring, film grain; the titles turn
// into THE FILE, THE JOB, THE WIRE. SOLID GOLD: GOLD RECORD, THE COUNTDOWN, a shield seal on the desk.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { BUST, C, CSS, FONT, M, PROPS, SP, T, clamp, clip, clipC, condW, esc, hash, pal, px, r1, sansW, spH, spW, stamp, star, svgOpen, syringe, tape, unit } from './theboys'
import type { Mode } from './theboys'
import { drawAt, failedNear, lastApproval } from './theboys-eggs'
import { MONO, monoW } from './invincible'
import { FrameBank, flipbook } from './stage/frames'
import { turntable } from './stage/turntable'
import { parallax } from './stage/parallax'
import { sweep } from './stage/light'
import { TB_BW_NOIR, TB_BW_NOIR_DASH, TB_BW_NOIR_READY, TB_BW_NOIR_SLASH, TB_BW_NOIR_THUMBSUP, TB_PROP_FIGUREBOX_TURN } from './theboys-motion-sprites'
import { SKIN_BADGES, foundOf, levelOf, xpFor } from './extras'
import type { Cred } from './extras'

const durOf = (ms: number) => (ms >= 3_600_000 ? `${Math.floor(ms / 3_600_000)} h ${Math.round((ms % 3_600_000) / 60_000)} min` : ms >= 60_000 ? `${Math.round(ms / 60_000)} min` : `${Math.round(ms / 1000)} s`)
const money = (usd: number) => (usd < 0.005 ? '$0' : `$${usd.toFixed(2)}`)
const hhmm = (at: number) => { const d = new Date(at); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
const share = (n: number, of: number) => clamp(n / of, 0, 1)

export const TITLES: Record<Mode, { cred: string; task: string; log: string; org: string }> = {
  brand: { cred: 'Q-SCORE', task: 'CRISIS DESK', log: 'FOCUS GROUP', org: 'THE TABLE' },
  book: { cred: 'THE FILE', task: 'THE JOB', log: 'THE WIRE', org: 'THE TABLE' },
  gold: { cred: 'GOLD RECORD', task: 'CRISIS DESK', log: 'THE COUNTDOWN', org: 'THE TABLE' },
  noir: { cred: 'TOP BILLING', task: 'THE SCRIPT', log: 'THE STORYBOARD', org: 'THE TABLE' },
}
/** The card's frame: the tile with a gold hairline (ON BRAND), plain steel (OFF BOOK), olive with a brass rule (SOLID GOLD). */
export const frame = (W: number, H: number, m: Mode) => {
  const P = pal(m)
  return `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="10" fill="${P.tile}" stroke="${P.line}"/>${m === 'brand' ? `<rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="8" fill="none" stroke="${P.a}" stroke-opacity=".3" stroke-width=".8"/>` : m === 'gold' ? `<rect x="3" y="3" width="${W - 6}" height="2" fill="${P.a}" opacity=".6"/>` : ''}`
}
/** A card title: a gold bar (a red marker stroke OFF BOOK) and condensed caps 13/800. */
export const cardTitle = (x: number, y: number, text: string, m: Mode) => {
  const P = pal(m)
  return m === 'book' ? `<path d="M${x - 2} ${y - 4}h${r1(condW(text, 13, 1.5) + 14)}" stroke="${P.red}" stroke-width="7" stroke-linecap="round" opacity=".55"/>${C(x + 4, y, text, 13, P.text, 'letter-spacing="1.5"')}` : `<rect x="${x}" y="${y - 11}" width="3" height="13" fill="${P.a}"/>${C(x + 9, y, text, 13, P.text, 'letter-spacing="1.5"')}`
}
/** OFF BOOK's leak over a finished card: tape on two corners, a LEAKED stamp, a coffee ring, a faint grain. Drawn last. */
export const leak = (W: number, H: number, seed: string) => {
  const id = `lk${hash(seed + W + H) % 100000}`
  const rx = 40 + unit(`${seed}r`) * (W - 120)
  let s = `<g pointer-events="none">${tape(26, 8, 44, 12, -18, 0.75)}${tape(W - 26, 8, 44, 12, 16, 0.75)}`
  s += `<circle cx="${r1(rx + 30)}" cy="${r1(H - 34)}" r="15" fill="none" stroke="#8A5A2E" stroke-width="2.4" opacity=".22"/><circle cx="${r1(rx + 32)}" cy="${r1(H - 33)}" r="13" fill="none" stroke="#8A5A2E" stroke-width=".8" opacity=".18"/>`
  s += stamp(W - 58, H - 22, 'LEAKED', '#C2362F', 11, -10)
  s += `<defs><filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="1" seed="${hash(seed) % 50}"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .06 0"/></filter></defs><rect width="${W}" height="${H}" rx="10" filter="url(#${id})"/></g>`
  return s
}

// ---------------------------------------------------------------- Q-SCORE: the ladder, the boxed figures
export const RANKS: [number, string][] = [[12, 'Ageless Icon'], [11, 'Living Legend'], [10, 'Face of Vought'], [9, 'Movie Lead'], [8, 'Member of the Seven'], [7, 'Seven Tryout'], [6, 'Teenage Kix Reserve'], [5, 'Regional Franchise'], [4, 'Mall Appearance'], [3, 'Local Hero'], [2, 'Vought Intern'], [1, 'Civilian']]
// OFF BOOK: Butcher's marker over the same rungs.
export const BOOK_RANKS: [number, string][] = [[12, 'Untouchable, Allegedly'], [11, 'Big Problem'], [10, 'Proper Problem'], [9, 'Headline'], [8, 'Target'], [7, 'Person of Interest'], [6, 'Liability'], [5, 'Useful'], [4, 'Asset'], [3, 'Contact'], [2, 'Tourist'], [1, 'Nobody, Yet']]
export const GOLD_RANKS: [number, string][] = [[12, 'Diamond'], [10, 'Double Platinum'], [8, 'Platinum'], [6, 'Gold'], [4, 'Silver'], [2, 'Opening Act'], [1, 'Demo Tape']]
export const rankOf = (level: number, m: Mode = 'brand') => ((m === 'book' ? BOOK_RANKS : m === 'gold' ? GOLD_RANKS : RANKS).find(([from]) => level >= from) ?? [1, 'Civilian'])[1]
/** The 9 boxed figures: the 7 shared ids (the store is unchanged), then LATE EDITION and the secret SOLID GOLD (SKIN_BADGES). */
const late = SKIN_BADGES[0] as any
const gold = SKIN_BADGES[1] as any
const noir = SKIN_BADGES[2] as any
export const BADGES = [
  { id: 'choom', name: 'ROOKIE CARD', how: 'First job done', icon: '✦', fig: 'TB_HUGHIE', progress: (c: Cred) => share(c.jobs, 1) },
  { id: 'merc', name: 'LIMITED EDITION', how: '10 jobs', icon: '◆', fig: 'TB_STARLIGHT', progress: (c: Cred) => share(c.jobs, 10) },
  { id: 'edgerunner', name: "COLLECTOR'S CHASE", how: '50 jobs', icon: '★', fig: 'TB_ATRAIN', progress: (c: Cred) => share(c.jobs, 50) },
  { id: 'legend', name: 'DAWN OF THE SEVEN', how: '10 long jobs (3+ min)', icon: '♛', fig: 'TB_HOMELANDER', progress: (c: Cred) => share(c.longJobs, 10) },
  { id: 'netrunner', name: 'FULL ROSTER', how: '100 sub-agents', icon: '⚑', fig: 'TB_NOIR', progress: (c: Cred) => share(c.agents, 100) },
  { id: 'crewboss', name: 'THE BOYS', how: 'A job with 5+ sub-agents', icon: '⁂', fig: 'TB_BUTCHER', progress: (c: Cred) => share(c.crewJobs, 1) },
  { id: 'chromed', name: 'COMPOUND V', how: 'Context past 90%', icon: 'V', fig: 'TB_KIMIKO', progress: (c: Cred) => (c.chromed ? 1 : 0) },
  { id: late.id, name: late.name, how: late.how, icon: late.icon, fig: 'TB_FRENCHIE', progress: late.progress as (c: Cred) => number },
  { id: gold.id, name: gold.name, how: gold.how, icon: gold.icon, fig: 'TB_SOLDIERBOY', progress: gold.progress as (c: Cred) => number, secret: true },
  { id: noir.id, name: noir.name, how: noir.how, icon: noir.icon, fig: 'TB_NOIR', progress: noir.progress as (c: Cred) => number, secret: 'noir' },
]
export const SECRET = 'solidgold'
/** Earned: in the store's badges, or the skin's own list. */
export const earnedOf = (c: Cred, id: string) => c.badges.includes(id) || (c.skinBadges ?? []).includes(id)
/** The secret box stays veiled (???, Keep exploring.) until this skin's own flag is set. */
export const veiled = (b: any, c: Cred) => (b.secret && !foundOf(c, typeof b.secret === 'string' ? b.secret : SECRET) ? { ...b, name: '???', icon: '?', how: 'Keep exploring.' } : b)
export const WORDS = { cases: 'JOBS', long: 'LONG JOBS', all: 'THE FULL SET. MINT IN BOX.' }
export const credToast = (level: number, m: Mode = 'brand') => `Q-SCORE ↑ ${level} · ${rankOf(level, m)}`

/** One blister pack (58 by 78): a card back in the box colour, the clear bubble, the figure from the waist up when earned. */
export const BOX_W = 58
export const BOX_H = 80
export const figureBox = (x: number, y: number, b: any, earned: boolean, pct: number, m: Mode, fresh = false, turn = '') => {
  const P = pal(m)
  const back = earned ? (m === 'book' ? '#3A3F45' : m === 'gold' ? P.olive : m === 'noir' ? '#26292E' : '#1E3474') : P.tile2
  let s = `<g${fresh ? ' class="tb-pop"' : ''}><title>${esc(`${b.name} · ${b.how} · ${Math.round(pct * 100)}%`)}</title>`
  s += `<rect x="${r1(x)}" y="${y}" width="${BOX_W}" height="${BOX_H}" rx="3" fill="${back}" stroke="${earned ? P.a : P.line}" stroke-width="${earned ? 1.2 : 1}"/>`
  s += `<circle cx="${r1(x + BOX_W / 2)}" cy="${y + 5}" r="2.4" fill="${P.tile}" stroke="${P.line}" stroke-width=".8"/>`
  // the bubble (the featured box turns in its packaging on a little display stand instead)
  if (!turn) s += `<rect x="${r1(x + 6)}" y="${y + 11}" width="${BOX_W - 12}" height="44" rx="10" fill="#FFFFFF" fill-opacity="${earned ? 0.1 : 0.04}" stroke="#FFFFFF" stroke-opacity="${earned ? 0.45 : 0.18}"/>`
  if (turn) s += turn
  else if (earned) {
    const sp = (SP as any)[b.fig]
    const sc = 1.12
    const rows = 32
    s += px(sp, x + BOX_W / 2 - (spW(sp) * sc) / 2, y + 15, sc, { rows: [0, Math.min(rows, spH(sp))] })
    s += `<path d="M${r1(x + 12)} ${y + 16}q4 -3 8 0" stroke="#FFFFFF" stroke-opacity=".5" fill="none"/>`
  } else if (b.name === '???') {
    s += C(x + BOX_W / 2, y + 40, '???', 16, P.muted, 'text-anchor="middle"')
  } else {
    s += C(x + BOX_W / 2, y + 30, 'COMING', 8, P.muted, 'text-anchor="middle" letter-spacing=".8"')
    s += C(x + BOX_W / 2, y + 40, 'SOON', 8, P.muted, 'text-anchor="middle" letter-spacing=".8"')
    if (pct > 0) s += `<rect x="${r1(x + 12)}" y="${y + 47}" width="${BOX_W - 24}" height="3" fill="${P.track}"/><rect x="${r1(x + 12)}" y="${y + 47}" width="${r1((BOX_W - 24) * pct)}" height="3" fill="${P.a}"/>`
  }
  // the name strip
  const words = String(b.name).split(' ')
  const l1 = words.length > 1 && condW(b.name, 7.5, 0.3) > BOX_W - 6 ? words.slice(0, Math.ceil(words.length / 2)).join(' ') : b.name
  const l2 = l1 === b.name ? '' : words.slice(Math.ceil(words.length / 2)).join(' ')
  const ink = earned ? P.text : P.muted
  s += C(x + BOX_W / 2, y + (l2 ? 64 : 68), clipC(l1, 7.5, BOX_W - 4, 0.3), 7.5, ink, 'text-anchor="middle" letter-spacing=".3"')
  if (l2) s += C(x + BOX_W / 2, y + 73, clipC(l2, 7.5, BOX_W - 4, 0.3), 7.5, ink, 'text-anchor="middle" letter-spacing=".3"')
  if (earned && b.secret) s += `<circle cx="${r1(x + BOX_W - 8)}" cy="${y + 8}" r="4.6" fill="${PROPS.confetti}"/><circle cx="${r1(x + BOX_W - 8)}" cy="${y + 8}" r="1.4" fill="${P.ink}"/>`
  return `${s}</g>`
}
// The featured box turns in its packaging: the Blender turnaround (yaw 0 front .. 4 the printed back; a box is symmetric, so
// 225-315 degrees are 135-45 mirrored: 8 views from 5, ~5.5 k), recoloured per look, one full turn every 8 s, stepped (an idle
// loop: as cheap at rest as a blink). Reduced motion: the front, still.
export const BOX_TURN_S = 8
const BOX_TINT: Record<Mode, Record<string, string>> = {
  brand: {},
  book: { '#3155B1': '#4A5058', '#1B2F66': '#2A2D32', '#E8C25A': '#C8B48A', '#8A6A24': '#7A6A4A' },
  gold: { '#3155B1': '#6E7750', '#1B2F66': '#4B5236', '#E8C25A': '#E2C25A', '#8A6A24': '#86621A', '#2A3453': '#3A3220' },
  noir: { '#3155B1': '#4A4E55', '#1B2F66': '#26292E', '#E8C25A': '#D9A441', '#8A6A24': '#7A5A20', '#A8C8DA': '#B8BCC2', '#ECE8F5': '#E8E8E8', '#2A3453': '#2E2E2E', '#B33530': '#5A5A5A' },
}
const tinted = (sp: any, m: Mode) => ({ ...sp, pal: Object.fromEntries(Object.entries(sp.pal as Record<string, string>).map(([k, v]) => [k, BOX_TINT[m][v] ?? v])) })
/** The featured box: the newest unlock if one just happened, else DAWN OF THE SEVEN (the Homelander figure) once earned, else
 *  the newest earned box. Undefined while the wall is empty. */
export const featuredBox = (c: Cred, fresh?: string): string | undefined => {
  const earned = BADGES.filter(b => earnedOf(c, b.id)).map(b => b.id)
  if (fresh && earned.includes(fresh)) return fresh
  return earned.includes('legend') ? 'legend' : earned[earned.length - 1]
}
/** The turning box for a slot at (x, y): a vitrine light, the stand, the turnaround. Its CSS and its views' defs ride along. */
export const boxTurn = (x: number, y: number, m: Mode): { svg: string; css: string; defs: string } => {
  const bank = new FrameBank('tbfb', 6)
  TB_PROP_FIGUREBOX_TURN.slice(0, 5).forEach((sp, i) => bank.add(`v${i}`, tinted(sp, m)))
  const cx = x + BOX_W / 2
  const t = turntable(bank, { id: 'tbft', views: ['v0', 'v1', 'v2', 'v3', 'v4'], mirror: true, x: cx, y: y + 31, sc: 1, period: BOX_TURN_S, still: 0, shadow: { rx: 13, dy: 22, op: 0.45, widths: [1, 0.8, 0.45, 0.8, 1, 0.8, 0.45, 0.8] } })
  const P = pal(m)
  const glow = `<path d="M${r1(cx - 7)} ${y + 6}h14l12 50h-38z" fill="${m === 'book' ? '#ECE6DA' : P.aT}" opacity=".07"/><ellipse cx="${r1(cx)}" cy="${y + 56}" rx="19" ry="3.2" fill="${P.a}" opacity=".5"/><ellipse cx="${r1(cx)}" cy="${y + 55}" rx="19" ry="3.2" fill="none" stroke="${P.aT}" stroke-opacity=".6" stroke-width=".8"/>`
  return { svg: `<g data-egg="box-turn">${glow}${t.svg}</g>`, css: t.css, defs: bank.defs() }
}
/** The plastic glare: one soft glint crossing the whole peg wall every 20 s, clipped to the bubbles (stepped, idle-cheap). */
const wallGlare = (x: number, y: number, w: number, h: number, bubbles: string) => {
  const g = sweep({ id: 'tbgl', x, y, w, h, clip: 'tbglc', period: 20, pass: 0.16, fps: 8, op: 0.32, band: 26 })
  return { svg: `<defs><clipPath id="tbglc">${bubbles}</clipPath></defs>${g.svg}`, css: g.css }
}
export const perRow = (W: number) => Math.max(3, Math.floor((W - 32 + 8) / (BOX_W + 8)))
export const credHeight = (W: number) => 214 + Math.ceil(BADGES.length / perRow(W)) * (BOX_H + 8) + 30
/** Q-SCORE: the talent contract. */
export const credCard = (W: number, c: Cred, m: Mode, o: { fresh?: string } = {}) => {
  const P = pal(m)
  const H = credHeight(W)
  const level = levelOf(c.xp)
  const rank = rankOf(level, m)
  const have = xpFor(level)
  const need = xpFor(level + 1)
  const pct = share(c.xp - have, need - have)
  const s = [svgOpen(W, H, CSS), frame(W, H, m), cardTitle(16, 26, TITLES[m].cred, m)]
  s.push(T(W - 16, 26, m === 'book' ? 'Asset file · eyes only' : m === 'gold' ? 'Vought Records · 1983' : m === 'noir' ? 'Vought Studios · 1979' : 'Vought International · Talent', 11, 400, P.muted, 'text-anchor="end" font-style="italic"'))
  // the contract sheet
  const cx = 16
  const cy = 40
  const cw = W - 32
  s.push(`<rect x="${cx}" y="${cy}" width="${cw}" height="160" rx="3" fill="${PROPS.paper}"/><rect x="${cx}" y="${cy}" width="${cw}" height="16" rx="3" fill="${m === 'book' ? '#3A3F45' : m === 'gold' ? P.olive : m === 'noir' ? '#26292E' : '#1E3474'}"/>`)
  s.push(M(cx + 8, cy + 11.5, m === 'gold' ? 'RECORDING CONTRACT · SIDE A' : m === 'book' ? 'ASSET FILE · DO NOT COPY' : m === 'noir' ? 'TALENT AGREEMENT · NON-SPEAKING ROLE' : 'TALENT AGREEMENT · EXHIBIT Q', 8, '#FFFFFF', 'letter-spacing="1.1"'))
  s.push(M(cx + cw - 8, cy + 11.5, `No. ${String(level).padStart(3, '0')}-${String(c.jobs).padStart(4, '0')}`, 8, '#FFFFFF', 'text-anchor="end" letter-spacing=".8"'))
  // the headshot with its gold seal
  const hx = cx + 10
  const hy = cy + 24
  const bust = BUST[m]
  s.push(`<rect x="${hx}" y="${hy}" width="84" height="96" fill="${m === 'book' ? '#2A2D32' : m === 'noir' ? '#1A1C20' : '#13214A'}"/><rect x="${hx}" y="${hy}" width="84" height="96" fill="none" stroke="#C9A13B" stroke-width="1.4"/>`)
  s.push(px(bust, hx + 42 - (spW(bust) * 1.9) / 2, hy + 96 - spH(bust) * 1.9 + 1, 1.9, { rows: [0, Math.min(spH(bust), Math.floor(95 / 1.9))] }))
  s.push(`<circle cx="${hx + 76}" cy="${hy + 90}" r="12" fill="#C9A13B"/><circle cx="${hx + 76}" cy="${hy + 90}" r="9.5" fill="none" stroke="#F0D27A" stroke-dasharray="1.5 1.5"/>${C(hx + 76, hy + 94, String(level), 10, m === 'noir' ? P.ink : '#0A1430', 'text-anchor="middle"')}`)
  // the STAR POWER dial: progress to the next level (a half gauge; named apart from the band's live APPROVAL meter)
  const dx = hx + 84 + 24 + 50
  const dy = hy + 64
  const R = 44
  const arc = (from: number, to: number, col: string, wdt: number) => {
    const a0 = Math.PI + from * Math.PI
    const a1 = Math.PI + to * Math.PI
    return `<path d="M${r1(dx + R * Math.cos(a0))} ${r1(dy + R * Math.sin(a0))}A${R} ${R} 0 0 1 ${r1(dx + R * Math.cos(a1))} ${r1(dy + R * Math.sin(a1))}" fill="none" stroke="${col}" stroke-width="${wdt}"/>`
  }
  s.push(arc(0, 1, '#D8D2C2', 9))
  if (pct > 0) s.push(arc(0, Math.max(0.005, pct), m === 'book' ? '#C2362F' : '#C9A13B', 9))
  const na = Math.PI + pct * Math.PI
  s.push(`<path d="M${dx} ${dy}L${r1(dx + (R - 10) * Math.cos(na))} ${r1(dy + (R - 10) * Math.sin(na))}" stroke="${PROPS.paperInk}" stroke-width="2"/><circle cx="${dx}" cy="${dy}" r="3.5" fill="${PROPS.paperInk}"/>`)
  s.push(T(dx, dy + 18, `${Math.round(pct * 100)}%`, 15, 700, PROPS.paperInk, 'text-anchor="middle" font-variant-numeric="tabular-nums"'))
  s.push(M(dx, dy - R - 6, m === 'book' ? 'HEAT ON HIM' : m === 'gold' ? 'CHART CLIMB' : 'STAR POWER', 7.5, '#4A4E5A', 'text-anchor="middle" letter-spacing="1"'))
  // the terms
  const tx = dx + R + 22
  const tw = cx + cw - 10 - tx
  if (tw > 90) {
    s.push(M(tx, hy + 8, 'TALENT', 7.5, '#4A4E5A', 'letter-spacing="1"'))
    s.push(C(tx, hy + 26, clipC(rank.toUpperCase(), 15, tw, 0.4), 15, m === 'book' ? '#A12A24' : m === 'noir' ? '#2A2D32' : '#1E3474', 'letter-spacing=".4"'))
    s.push(M(tx, hy + 44, 'Q POINTS', 7.5, '#4A4E5A', 'letter-spacing="1"'))
    s.push(`<text x="${tx}" y="${hy + 60}" font-family="${FONT}" font-size="11" fill="#3A3E48"><tspan font-size="14" font-weight="700" fill="${PROPS.paperInk}">${c.xp}</tspan> · ${Math.max(0, need - c.xp)} to Q${level + 1}</text>`)
    s.push(M(tx, hy + 78, 'RECORD', 7.5, '#4A4E5A', 'letter-spacing="1"'))
    s.push(T(tx, hy + 93, clip(`${c.jobs} jobs · ${c.longJobs} long · ${c.agents} supes called`, 10.5, tw), 10.5, 400, '#3A3E48'))
  }
  s.push(`<path d="M${cx + 10} ${cy + 148}h${r1(cw * 0.35)}" stroke="#9AA0AA" stroke-width=".8"/>`)
  s.push(`<text x="${cx + 12}" y="${cy + 145}" font-family="'Snell Roundhand','Segoe Script','Brush Script MT',cursive" font-size="13" fill="${m === 'noir' ? '#2A2D32' : '#1E3474'}">${m === 'book' ? 'W. Butcher (witness)' : m === 'gold' ? 'Soldier Boy' : 'M. Stillwell'}</text>`)
  s.push(M(cx + cw - 10, cy + 152, m === 'book' ? 'COPY 2 OF 2 · NOT FOR VOUGHT' : 'SIGNED · SEALED · SPUN', 7, '#7A7E88', 'text-anchor="end" letter-spacing=".6"'))
  // the peg wall
  const py = 210
  const per = perRow(W)
  const earnedN = BADGES.filter(b => earnedOf(c, b.id)).length
  s.push(T(16, py + 4, `THE COLLECTION  ${earnedN} of ${BADGES.length}`, 9.5, 700, P.muted, 'letter-spacing=".8"'))
  s.push(T(W - 16, py + 4, m === 'book' ? 'evidence, bagged' : 'collect them all', 11, 400, P.muted, 'text-anchor="end" font-style="italic"'))
  const gap = per > 1 ? (W - 32 - per * BOX_W) / (per - 1) : 0
  const feat = featuredBox(c, o.fresh)
  let bubbles = ''
  let extraCss = ''
  BADGES.forEach((b0, i) => {
    const b = veiled(b0, c)
    const earned = earnedOf(c, b.id)
    const col = i % per
    const row = Math.floor(i / per)
    const bx = 16 + col * (BOX_W + gap)
    const by = py + 12 + row * (BOX_H + 8)
    let turn = ''
    if (b.id === feat) {
      const t = boxTurn(bx, by, m)
      turn = `<defs>${t.defs}</defs>${t.svg}`
      extraCss += t.css
    } else if (earned) bubbles += `<rect x="${r1(bx + 6)}" y="${by + 11}" width="${BOX_W - 12}" height="44" rx="10"/>`
    s.push(figureBox(bx, by, b, earned, earned ? 1 : b.progress(c), m, o.fresh === b.id, turn))
  })
  if (bubbles) {
    const rows = Math.ceil(BADGES.length / per)
    const g = wallGlare(16, py + 12, W - 32, rows * (BOX_H + 8), bubbles)
    s.push(g.svg)
    extraCss += g.css
  }
  if (extraCss) s.push(`<style>${extraCss}</style>`)
  const next = BADGES.map(b => veiled(b, c)).find(b => !earnedOf(c, b.id) && !b.secret)
  s.push(T(16, H - 10, clip(next ? `Next: ${next.name} · ${next.how} · ${Math.round(next.progress(c) * 100)}%` : WORDS.all, 11, W - 32), 11, 400, P.muted, 'font-style="italic"'))
  if (m === 'book') s.push(leak(W, H, 'cred'))
  return `${s.join('\n')}</svg>`
}
export const credAlt = (c: Cred, m: Mode = 'brand') => `Q-score: level ${levelOf(c.xp)} ${rankOf(levelOf(c.xp), m)}, ${c.xp} Q points, ${BADGES.filter(b => earnedOf(c, b.id)).length} of ${BADGES.length} figures`

// ---------------------------------------------------------------- CRISIS DESK: talking points and the press releases
export const POINT_ROW = 17
export const SLIP_ROW = 22
export const deskHeight = (nSteps: number, nSlips: number) => 120 + Math.min(6, Math.max(1, nSteps)) * POINT_ROW - 4 + 58 + Math.max(1, Math.min(5, nSlips)) * SLIP_ROW + 30
const stampOf = (state: string, m: Mode) => (state === 'done' ? (m === 'book' ? 'DONE' : 'SPUN ✓') : state === 'running' ? (m === 'book' ? 'ON IT' : 'SPINNING…') : state === 'failed' ? (m === 'book' ? 'BOTCHED' : 'NO COMMENT') : state === 'stopped' ? 'SHELVED' : 'PENDING')
export const deskCard = (W: number, task: string, isWorking: boolean, done: number, total: number, legends: any[], m: Mode, steps: { title: string; state: string }[] = []) => {
  const P = pal(m)
  const pts = steps.length ? steps : Array.from({ length: total }, (_, i) => ({ title: `Step ${i + 1}`, state: i < done ? 'done' : i === done && isWorking ? 'running' : 'todo' }))
  if (m === 'noir') return scriptCard(W, task, isWorking, done, total, legends, pts)
  const shownPts = pts.slice(0, 6)
  const nSl = Math.min(5, legends.length)
  const H = deskHeight(shownPts.length, nSl)
  const s = [svgOpen(W, H, CSS), frame(W, H, m), cardTitle(16, 26, TITLES[m].task, m)]
  const status = isWorking ? (m === 'book' ? 'GOING IN' : 'LIVE · ON MESSAGE') : task ? (m === 'book' ? 'DONE AND DUSTED' : 'CONTAINED') : 'ALL QUIET'
  s.push(M(16 + 9 + condW(TITLES[m].task, 13, 1.5) + 12, 26, status, 9, isWorking ? P.aT : P.muted, 'letter-spacing="1.2"'))
  if (m === 'gold') s.push(`<path d="M${W - 30} 14h14v8q0 8 -7 11q-7 -3 -7 -11z" fill="${P.a}" stroke="${P.ink}" stroke-width=".8"/>`)
  else if (W >= 440) s.push(T(W - 16, 26, m === 'book' ? 'off the books' : 'Vought Crisis Management', 11, 400, P.muted, 'text-anchor="end" font-style="italic"'))
  // SITUATION
  s.push(`<rect x="16" y="38" width="${W - 32}" height="44" rx="3" fill="${P.tile2}" stroke="${P.line}"/>`)
  s.push(M(26, 52, 'SITUATION', 8, m === 'book' ? P.aT : P.a, 'letter-spacing="1.4"'))
  s.push(T(26, 72, clip(task || 'Nothing to spin yet.', 14, W - 64, 0, true), 14, 700, task ? P.text : P.muted))
  // talking points
  s.push(T(16, 100, 'TALKING POINTS', 9.5, 700, P.muted, 'letter-spacing=".8"'))
  s.push(T(W - 16, 100, `${done} of ${total} spun`, 11, 400, P.muted, 'text-anchor="end" font-style="italic"'))
  if (!shownPts.length) s.push(T(26, 120, 'No talking points yet. The plan becomes the script.', 11, 400, P.muted, 'font-style="italic"'))
  shownPts.forEach((st, i) => {
    const y = 120 + i * POINT_ROW
    const word = stampOf(st.state, m)
    const tone = st.state === 'done' ? P.done : st.state === 'running' ? P.aT : st.state === 'failed' ? P.alert : P.muted
    const sw = condW(word, 8.5, 1) + 10
    s.push(`<text x="26" y="${y}" font-family="${FONT}" font-size="11.5" fill="${P.muted}">${i + 1}.</text>`)
    s.push(T(42, y, clip(st.title.replace(/^\s*\d+[.)]\s*/, ''), 11.5, W - 42 - sw - 36), 11.5, st.state === 'running' ? 700 : 400, st.state === 'todo' ? P.sub : P.text))
    s.push(`<g${st.state === 'running' ? ' class="tb-pulse"' : ''}><rect x="${r1(W - 26 - sw)}" y="${y - 10}" width="${r1(sw)}" height="13" rx="2" fill="none" stroke="${tone}" stroke-width="1"/>${C(W - 26 - sw + 5, y, word, 8.5, tone, 'letter-spacing="1"')}</g>`)
  })
  // the syringe and the holding statement
  const sy = 120 + Math.max(1, shownPts.length) * POINT_ROW - 4
  const pctDone = total ? (done / total) * 100 : 0
  s.push(syringe(26, sy, W - 110, pctDone, m === 'gold' ? 'gold' : m, { working: isWorking }))
  s.push(T(W - 26, sy + 8, `${Math.round(pctDone)}%`, 13, 700, P.text, 'text-anchor="end" font-variant-numeric="tabular-nums"'))
  const hold = !task ? 'Vought has no comment at this time.' : isWorking ? (m === 'book' ? 'Keep your head down. We are nearly in.' : 'Vought is aware and is handling it.') : m === 'book' ? 'Sorted. Nobody saw a thing.' : 'The situation has been contained.'
  s.push(`<text x="26" y="${sy + 30}" font-family="${FONT}" font-size="11" fill="${P.sub}"><tspan font-weight="700" fill="${P.muted}" letter-spacing=".8" font-size="9">HOLDING STATEMENT  </tspan>${esc(clip(hold, 11, W - 160))}</text>`)
  // PRESS RELEASES
  const ry = sy + 50
  s.push(T(16, ry, m === 'book' ? 'OFF THE RECORD' : 'PRESS RELEASES', 9.5, 700, P.muted, 'letter-spacing=".8"'))
  s.push(T(W - 16, ry, 'jobs of 3+ minutes', 11, 400, P.muted, 'text-anchor="end" font-style="italic"'))
  if (!nSl) {
    s.push(`<rect x="16" y="${ry + 8}" width="${W - 32}" height="20" rx="2" fill="none" stroke="${P.line}" stroke-dasharray="4 3"/>`)
    s.push(T(26, ry + 22, clip('No statements issued yet. A job of 3+ minutes gets one.', 11, W - 52), 11, 400, P.muted, 'font-style="italic"'))
  }
  legends.slice(0, nSl).forEach((l: any, i: number) => {
    const y = ry + 8 + i * SLIP_ROW
    const rot = (unit(`slip${l.at}`) - 0.5) * 1.6
    s.push(`<g transform="rotate(${r1(rot)} ${W / 2} ${y + 9})"><rect x="${18 + (i % 2) * 3}" y="${y}" width="${W - 38}" height="19" rx="1" fill="${PROPS.paper}" stroke="#C9C2B0" stroke-width=".6"/>`)
    s.push(M(26, y + 13, 'FOR IMMEDIATE RELEASE ·', 7.5, '#4A4E5A', 'letter-spacing=".6"'))
    const right = `${durOf(l.ms)} · ${money(l.costUsd)}`
    const rw = sansW(right, 10.5, 0, true)
    const stw = condW('CONTAINED', 8, 1) + 12
    s.push(T(140, y + 13.5, clip(l.task, 11, W - 140 - rw - stw - 46, 0, true), 11, 700, PROPS.paperInk))
    s.push(T(W - 28, y + 13.5, right, 10.5, 400, '#3A3E48', 'text-anchor="end" font-variant-numeric="tabular-nums"'))
    s.push(`<g transform="translate(${r1(W - 36 - rw - stw / 2)} ${y + 9.5}) rotate(-6)"><rect x="${r1(-stw / 2)}" y="-6.5" width="${r1(stw)}" height="13" rx="1.5" fill="none" stroke="${PROPS.stamp}" stroke-width="1.2"/>${C(0, 3, m === 'book' ? 'BURIED' : 'CONTAINED', 8, PROPS.stamp, 'text-anchor="middle" letter-spacing="1"')}</g></g>`)
  })
  if (legends.length >= 10) s.push(`<rect x="${W - 112}" y="${H - 22}" width="96" height="13" rx="2" fill="#C9A13B"/>${C(W - 64, H - 12, 'VOUGHT CLASSIC', 8.5, '#0A1430', 'text-anchor="middle" letter-spacing="1"')}`)
  s.push(T(16, H - 10, nSl ? `${legends.length} statements · newest on top` : m === 'book' ? 'Nothing on the record. Good.' : 'The desk fills as crises close.', 11, 400, P.muted, 'font-style="italic"'))
  if (m === 'book') s.push(leak(W, H, 'task'))
  return `${s.join('\n')}</svg>`
}
export const deskAlt = (isWorking: boolean, done: number, total: number) => `Crisis desk: ${isWorking ? 'live' : 'contained'}, ${done} of ${total} talking points spun`

// ---------------------------------------------------------------- THIS MEANS NOIR: THE SCRIPT and THE STORYBOARD
// NOIR is a silent picture, so its task card is the shooting script (the steps are its scenes, typed on the page as they are
// shot, a red pencil through a failed one) and its log is the storyboard (one pencil thumbnail per call; the live one flips
// like a flipbook while the job works). Black, greys, cream paper and the amber of his lenses; no navy.
const PAGE = '#ECE8DC'
const TYPE_INK = '#2A2A2A'
/** Mono type with its own weight (theboys `M` fixes 500: a second font-weight would break the image). */
const MW = (x: number, y: number, text: string, size: number, fill: string, weight = 700, extra = '') => `<text x="${r1(x)}" y="${r1(y)}" font-family="${MONO}" font-size="${size}" font-weight="${weight}" fill="${fill}"${extra ? ` ${extra}` : ''}>${esc(text)}</text>`
const PENCIL = '#B8322A'
const clipM = (s: string, size: number, max: number) => (monoW(s, size) <= max ? s : `${s.slice(0, Math.max(1, Math.floor(max / (size * 0.6)) - 1))}…`)
const strike = (x: number, y: number, w: number, seed: string) => `<path d="M${r1(x - 2)} ${r1(y - 3.6)}q${r1(w / 4)} ${r1(-1.6 - unit(seed) * 1.4)} ${r1(w / 2)} ${r1(0.4)}t${r1(w / 2 + 2)} ${r1(-0.8)}" fill="none" stroke="${PENCIL}" stroke-width="1.5" stroke-linecap="round" opacity=".9"/>`
/** The typing cover: a strip of page over the running line that shrinks away to its right edge in steps, then holds; looped. */
const SCRIPT_CSS = '.tbty{animation:tbty 4.5s steps(1) infinite}\n.tbsb{animation:tbsb .5s steps(1) infinite}@keyframes tbsb{50%{opacity:0}}\n@media (prefers-reduced-motion: reduce){.tbty{display:none}.tbsb,.tbty{animation:none!important}}'
/** The cover (a cursor at its left edge, then page) slides right across the line in `n` steps over 55% of the loop, then holds. */
const typeKf = (n: number, w: number) => `@keyframes tbty{${Array.from({ length: n + 1 }, (_, i) => `${r1((i / n) * 55)}%{transform:translateX(${r1((w * i) / n)}px)}`).join('')}100%{transform:translateX(${r1(w)}px)}}`
export const scriptCard = (W: number, task: string, isWorking: boolean, done: number, total: number, legends: any[], pts: { title: string; state: string }[]) => {
  const m: Mode = 'noir'
  const P = pal(m)
  const shownPts = pts.slice(0, 6)
  const nSl = Math.min(5, legends.length)
  const H = deskHeight(shownPts.length, nSl)
  const s = [svgOpen(W, H, CSS), frame(W, H, m), cardTitle(16, 26, TITLES[m].task, m)]
  s.push(M(16 + 9 + condW(TITLES[m].task, 13, 1.5) + 12, 26, isWorking ? 'ROLLING' : task ? 'IN THE CAN' : 'DARK', 9, isWorking ? P.aT : P.muted, 'letter-spacing="1.2"'))
  if (W >= 440) s.push(T(W - 16, 26, 'Vought Studios · a silent picture', 11, 400, P.muted, 'text-anchor="end" font-style="italic"'))
  // the page: cream, three brads, the margins of a shooting script (scene numbers both sides)
  const top = 38
  const ph = 82 + Math.max(1, shownPts.length) * POINT_ROW
  s.push(`<rect x="16" y="${top}" width="${W - 32}" height="${ph}" rx="2" fill="${PAGE}"/><rect x="16" y="${top}" width="${W - 32}" height="${ph}" rx="2" fill="none" stroke="#000000" stroke-opacity=".25"/>`)
  for (const k of [0.18, 0.5, 0.82]) s.push(`<circle cx="25" cy="${r1(top + ph * k)}" r="2.6" fill="${P.tile}"/>`)
  const tx = 50
  const tw = W - 32 - 70
  s.push(MW(tx, top + 16, 'FADE IN:', 9.5, TYPE_INK))
  s.push(M(W - 30, top + 16, `PAGE ${Math.min(done + 1, Math.max(1, total))}`, 8, '#6A6A6A', 'text-anchor="end"'))
  s.push(MW(tx, top + 34, clipM(`INT. ${(task || 'An empty soundstage').toUpperCase()} - NIGHT`, 10.5, tw), 10.5, TYPE_INK))
  s.push(M(tx, top + 52, clipM(isWorking ? 'BLACK NOIR stands in the doorway. He says nothing.' : task ? 'The set is dark. BLACK NOIR gives a thumbs-up.' : 'Nothing on the page yet. The plan becomes the script.', 10, tw), 10, '#3A3A3A'))
  let css = ''
  if (!shownPts.length) s.push(M(tx, top + 70, '(no scenes yet)', 10, '#8A8A8A'))
  shownPts.forEach((st, i) => {
    const y = top + 72 + i * POINT_ROW
    const line = clipM(st.title.replace(/^\s*\d+[.)]\s*/, ''), 10.5, tw - 50)
    const lw = monoW(line, 10.5)
    const ink = st.state === 'todo' ? '#9A968A' : st.state === 'failed' || st.state === 'stopped' ? '#6A6A6A' : TYPE_INK
    s.push(M(32, y, String(i + 1), 9, '#6A6A6A', 'text-anchor="middle"') + M(W - 32, y, String(i + 1), 9, '#6A6A6A', 'text-anchor="middle"'))
    s.push(MW(tx, y, line, 10.5, ink, st.state === 'running' ? 700 : 500))
    if (st.state === 'running') {
      // typed on: the cover shrinks off the line in steps (2-3 letters a step), the block cursor blinks at its end
      const n = Math.max(4, Math.min(14, Math.ceil(line.length / 2.5)))
      css = typeKf(n, lw + 1)
      // a still clip round the line; inside it the cover moves (the clip itself never moves)
      s.push(`<defs><clipPath id="tbtyc"><rect x="${r1(tx - 1)}" y="${y - 10}" width="${r1(lw + 9)}" height="13"/></clipPath></defs><g clip-path="url(#tbtyc)"><g class="tbty"><rect class="tbsb" x="${r1(tx)}" y="${y - 9}" width="6" height="11" fill="${TYPE_INK}"/><rect x="${r1(tx + 6)}" y="${y - 10}" width="${r1(lw + 4)}" height="13" fill="${PAGE}"/></g></g>`)
    } else if (st.state === 'failed') {
      s.push(strike(tx, y, lw, `cut${i}`))
      s.push(`<g transform="translate(${r1(Math.min(W - 70, tx + lw + 14))} ${y}) rotate(-6)">${C(0, 0, 'CUT', 10, PENCIL, 'letter-spacing="1"')}</g>`)
    } else if (st.state === 'stopped') {
      s.push(strike(tx, y, lw, `shelf${i}`).replace(PENCIL, '#8A8A8A'))
    } else if (st.state === 'done') {
      s.push(`<path d="M${r1(W - 50)} ${y - 9}v12" stroke="#6A6A6A" stroke-width="1"/>`)
    }
  })
  const cutY = top + ph - 8
  s.push(MW(W - 30, cutY, isWorking ? 'CONTINUED:' : 'CUT TO:', 9.5, TYPE_INK, 700, 'text-anchor="end"'))
  // the reel: a film strip with sprocket holes, filled amber as scenes are shot (the % stays plain text beside it)
  const ry = top + ph + 14
  const rw = W - 110
  const pct = total ? (done / total) * 100 : 0
  s.push(`<rect x="26" y="${ry - 6}" width="${rw}" height="12" rx="1.5" fill="#1C1E22" stroke="${P.line}"/><rect x="26" y="${ry - 3}" width="${r1(rw * (pct / 100))}" height="6" fill="${P.a}"/>`)
  s.push(`<path d="M28 ${ry - 5}h${rw - 4}M28 ${ry + 5}h${rw - 4}" stroke="${P.tile}" stroke-width="1.4" stroke-dasharray="2 3"/>`)
  s.push(T(W - 26, ry + 5, `${Math.round(pct)}%`, 13, 700, P.text, 'text-anchor="end" font-variant-numeric="tabular-nums"'))
  s.push(`<text x="26" y="${ry + 26}" font-family="${FONT}" font-size="11" fill="${P.sub}"><tspan font-weight="700" fill="${P.muted}" letter-spacing=".8" font-size="9">DIRECTOR’S NOTE  </tspan>${esc(clip(!task ? 'Nothing to shoot.' : isWorking ? `Keep rolling. ${done} of ${total} scenes shot.` : `That’s a wrap. ${done} of ${total} scenes shot.`, 11, W - 160))}</text>`)
  // DAILIES: the jobs of 3+ minutes as film-can labels
  const dy = ry + 46
  s.push(T(16, dy, 'DAILIES', 9.5, 700, P.muted, 'letter-spacing=".8"'))
  s.push(T(W - 16, dy, 'takes of 3+ minutes', 11, 400, P.muted, 'text-anchor="end" font-style="italic"'))
  if (!nSl) {
    s.push(`<rect x="16" y="${dy + 8}" width="${W - 32}" height="20" rx="2" fill="none" stroke="${P.line}" stroke-dasharray="4 3"/>`)
    s.push(T(26, dy + 22, clip('Nothing in the can yet. A take of 3+ minutes gets a label.', 11, W - 52), 11, 400, P.muted, 'font-style="italic"'))
  }
  legends.slice(0, nSl).forEach((l: any, i: number) => {
    const y = dy + 8 + i * SLIP_ROW
    const right = `${durOf(l.ms)} · ${money(l.costUsd)}`
    const rw2 = sansW(right, 10.5, 0, true)
    s.push(`<rect x="16" y="${y}" width="${W - 32}" height="19" rx="9.5" fill="#1C1E22" stroke="${P.line}"/><circle cx="27" cy="${y + 9.5}" r="5" fill="none" stroke="${P.muted}"/><circle cx="27" cy="${y + 9.5}" r="1.4" fill="${P.muted}"/>`)
    s.push(M(38, y + 13, `TAKE ${legends.length - i}`, 8, P.a, 'letter-spacing=".8"'))
    s.push(T(100, y + 13.5, clip(l.task, 11, W - 100 - rw2 - 90, 0, true), 11, 700, P.text))
    s.push(T(W - 72, y + 13.5, right, 10.5, 400, P.sub, 'text-anchor="end" font-variant-numeric="tabular-nums"'))
    s.push(`<rect x="${W - 64}" y="${y + 3.5}" width="40" height="12" rx="1.5" fill="none" stroke="${P.a}"/>${C(W - 44, y + 13, 'PRINT', 8, P.a, 'text-anchor="middle" letter-spacing="1"')}`)
  })
  s.push(T(16, H - 10, nSl ? `${legends.length} takes in the can · newest on top` : 'The can fills as takes wrap.', 11, 400, P.muted, 'font-style="italic"'))
  s.push(`<style>${SCRIPT_CSS}${css ? `\n${css}` : ''}</style>`)
  return `${s.join('\n')}</svg>`
}
/** A storyboard thumbnail's pencil sketch for a call (code-drawn, ~200 chars): what the shot shows. */
const sketch = (tool: string, x: number, y: number, w: number, h: number): string => {
  const cx = x + w / 2
  const cy = y + h / 2 + 2
  const g = `fill="none" stroke="${TYPE_INK}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"`
  const hz = `<path d="M${r1(x + 4)} ${r1(y + h - 10)}h${r1(w - 8)}" stroke="#8A8A8A" stroke-width=".6"/>`
  if (tool === 'Read') return `${hz}<path d="M${r1(cx)} ${r1(cy - 8)}v16M${r1(cx)} ${r1(cy - 8)}q-8 -3 -14 0v16q6 -3 14 0q8 -3 14 0v-16q-6 -3 -14 0" ${g}/>`
  if (/Edit/.test(tool)) return `${hz}<path d="M${r1(cx - 12)} ${r1(cy + 8)}l3 -7 16 -14 4 4 -16 14zM${r1(cx - 12)} ${r1(cy + 8)}l4 -1" ${g}/>`
  if (tool === 'Write') return `${hz}<rect x="${r1(cx - 9)}" y="${r1(cy - 12)}" width="18" height="22" ${g}/><path d="M${r1(cx - 5)} ${r1(cy - 6)}h10M${r1(cx - 5)} ${r1(cy - 2)}h10M${r1(cx - 5)} ${r1(cy + 2)}h7" ${g}/>`
  if (/Bash|PowerShell/.test(tool)) return `${hz}<rect x="${r1(cx - 12)}" y="${r1(cy - 4)}" width="24" height="13" ${g}/><path d="M${r1(cx - 12)} ${r1(cy - 4)}l24 -6M${r1(cx - 6)} ${r1(cy - 5.5)}l-2 4M${r1(cx + 2)} ${r1(cy - 7.5)}l-2 4" ${g}/>`
  if (/Grep|Glob|LS|ToolSearch/.test(tool)) return `${hz}<circle cx="${r1(cx - 2)}" cy="${r1(cy - 3)}" r="7" ${g}/><path d="M${r1(cx + 3)} ${r1(cy + 2)}l7 7" stroke="${TYPE_INK}" stroke-width="2.2" stroke-linecap="round"/>`
  if (/Web/.test(tool)) return `${hz}<path d="M${r1(cx)} ${r1(cy + 9)}v-18M${r1(cx - 6)} ${r1(cy + 9)}l6 -12 6 12M${r1(cx - 6)} ${r1(cy - 12)}a8 8 0 0 1 12 0M${r1(cx - 9)} ${r1(cy - 15)}a12 12 0 0 1 18 0" ${g}/>`
  if (tool === 'Agent') return `${hz}<circle cx="${r1(cx)}" cy="${r1(cy - 9)}" r="3.4" ${g}/><path d="M${r1(cx)} ${r1(cy - 5)}v9M${r1(cx - 6)} ${r1(cy - 1)}h12M${r1(cx)} ${r1(cy + 4)}l-5 6M${r1(cx)} ${r1(cy + 4)}l5 6" ${g}/>`
  return `${hz}<rect x="${r1(cx - 9)}" y="${r1(cy - 6)}" width="18" height="12" rx="2" ${g}/><circle cx="${r1(cx)}" cy="${r1(cy)}" r="3.4" ${g}/>`
}
export const BOARD_PW = 62
export const BOARD_PH = 46
/** Is the job still shooting? The newest call within 45 s of the newest draw (the card itself has no clock). */
const rolling = (beats: any[]) => beats.length > 0 && drawAt() > 0 && (beats[beats.length - 1] as any).at >= drawAt() - 45_000
export const storyboardCard = (W: number, beats: any[], pick: number) => {
  const m: Mode = 'noir'
  const P = pal(m)
  const H = LOG_H
  const n = beats.length
  const live = pick < 0 || pick >= n - 1
  const sel = live ? n - 1 : pick
  const shooting = live && rolling(beats)
  const s = [svgOpen(W, H, CSS), frame(W, H, m), cardTitle(16, 26, TITLES[m].log, m)]
  const status = !n ? 'no shots yet' : live ? `${n} shots · ${shooting ? 'rolling' : 'wrapped'}` : `${n} shots · shot ${sel + 1}`
  s.push(T(16 + 9 + condW(TITLES[m].log, 13, 1.5) + 12, 26, status, 11, 400, shooting ? P.aT : P.muted, 'font-style="italic"'))
  if (W >= 420) s.push(M(W - 16, 26, 'SILENT · 1.33 : 1', 8, P.muted, 'text-anchor="end" letter-spacing="1"'))
  const per = Math.max(3, Math.floor((W - 32 + 10) / (BOARD_PW + 10)))
  const gap = per > 1 ? (W - 32 - per * BOARD_PW) / (per - 1) : 0
  const showN = per * 2
  let from = Math.max(0, n - showN)
  if (!live && sel < from) from = Math.max(0, sel - per)
  const shown = beats.slice(from, from + showN)
  if (!n) {
    for (let i = 0; i < per; i++) s.push(`<rect x="${r1(16 + i * (BOARD_PW + gap))}" y="40" width="${BOARD_PW}" height="${BOARD_PH}" fill="none" stroke="${P.line}" stroke-dasharray="3 3"/>`)
    s.push(T(W / 2, 120, 'The board is blank.', 11.5, 700, P.text, 'text-anchor="middle"'))
    s.push(T(W / 2, 136, 'Every tool call becomes a panel.', 11, 400, P.muted, 'text-anchor="middle" font-style="italic"'))
  }
  let css = ''
  let defs = ''
  shown.forEach((b: any, i: number) => {
    const idx = from + i
    const x = 16 + (i % per) * (BOARD_PW + gap)
    const y = 40 + Math.floor(i / per) * 66
    const picked = idx === sel
    s.push(`<rect x="${r1(x)}" y="${y}" width="${BOARD_PW}" height="${BOARD_PH}" fill="${PAGE}" stroke="${picked ? P.a : '#000000'}" stroke-width="${picked ? 2 : 0.8}"/>`)
    if (idx === n - 1 && live) {
      // the live panel: Black Noir himself, flipping READY > DASH > SLASH > stand while it shoots; a thumbs-up once it wraps
      const bank = new FrameBank('tbsbn', 6).add('a', TB_BW_NOIR_READY).add('b', TB_BW_NOIR_DASH).add('c', TB_BW_NOIR_SLASH).add('d', TB_BW_NOIR).add('e', TB_BW_NOIR_THUMBSUP)
      const px0 = x + BOARD_PW / 2
      const py0 = y + BOARD_PH / 2 + 1
      if (shooting) {
        const fb = flipbook(bank, 'tbfl', ['a', 'b', 'c', 'd'], px0, py0, 0.35, 1, 0.82)
        s.push(`<g clip-path="url(#tbsbc)">${fb.svg}</g>`)
        css += fb.css
      } else s.push(`<g clip-path="url(#tbsbc)">${bank.use('e', px0, py0, 1, 0.82)}</g>`)
      defs += `${bank.defs()}<clipPath id="tbsbc"><rect x="${r1(x + 1)}" y="${y + 1}" width="${BOARD_PW - 2}" height="${BOARD_PH - 2}"/></clipPath>`
      if (shooting) s.push(`<circle class="tb-run" cx="${r1(x + BOARD_PW - 6)}" cy="${y + 6}" r="2.6" fill="${PENCIL}"/>`)
    } else s.push(sketch(b.tool, x, y, BOARD_PW, BOARD_PH))
    if (failedNear(b.at, 1500)) s.push(`<path d="M${r1(x + 6)} ${y + 6}l${BOARD_PW - 12} ${BOARD_PH - 12}M${r1(x + BOARD_PW - 6)} ${y + 6}l${-(BOARD_PW - 12)} ${BOARD_PH - 12}" stroke="${PENCIL}" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>`)
    s.push(M(x, y + BOARD_PH + 11, clipM(`${idx + 1} ${(failedNear(b.at, 1500) ? 'RESHOOT' : VERBS[b.tool] ?? b.tool).toUpperCase()}`, 7.5, BOARD_PW), 7.5, picked ? P.a : P.muted, 'letter-spacing=".3"'))
  })
  if (n) s.push(M(16, 186, hhmm((shown[0] as any).at), 7.5, P.muted) + M(W - 16, 186, live ? (shooting ? 'ROLLING' : 'WRAPPED') : hhmm((shown[shown.length - 1] as any).at), 7.5, live && shooting ? P.aT : P.muted, 'text-anchor="end"'))
  const b = n ? beats[sel] : null
  s.push(T(16, H - 30, b ? clip(`${hhmm(b.at)} · ${b.who} · ${VERBS[b.tool] ?? b.tool}`, 11, W - 32) : '', 11, 700, P.sub))
  s.push(T(16, H - 12, b ? clip(b.text, 11, W - 32) : 'Each call is sketched, shot by shot.', 11, 400, P.muted, 'font-style="italic"'))
  if (defs) s.push(`<defs>${defs}</defs>`)
  if (css) s.push(`<style>${css}</style>`)
  return `${s.join('\n')}</svg>`
}

// ---------------------------------------------------------------- FOCUS GROUP: the dial test
export const LOG_H = 236
export const VERBS: Record<string, string> = { Read: 'Brief', Grep: 'Track down', Glob: 'Canvass', LS: 'Canvass', Edit: 'Spin', MultiEdit: 'Spin', NotebookEdit: 'Spin', Write: 'Statement', Bash: 'Deploy', PowerShell: 'Deploy', Agent: 'Call in', ToolSearch: 'Roster', WebFetch: 'Footage', WebSearch: 'Polls' }
/** How the audience reacts to a call: a Write spikes gold, an Edit lifts, a read nudges, a failed call dips. */
export const reaction = (b: any): number => (failedNear(b.at, 1500) ? -16 : b.tool === 'Write' ? 14 : /Edit/.test(b.tool) ? 7 : b.tool === 'Agent' ? 9 : /Bash|PowerShell/.test(b.tool) ? 4 : 2)
export const dialCard = (W: number, beats: any[], pick: number, m: Mode) => {
  if (m === 'noir') return storyboardCard(W, beats, pick)
  const P = pal(m)
  const H = LOG_H
  const n = beats.length
  const live = pick < 0 || pick >= n - 1
  const sel = live ? n - 1 : pick
  const s = [svgOpen(W, H, CSS), frame(W, H, m), cardTitle(16, 26, TITLES[m].log, m)]
  const status = !n ? 'no respondents yet' : live ? `${n} calls · live` : `${n} calls · call ${sel + 1}`
  s.push(T(16 + 9 + condW(TITLES[m].log, 13, 1.5) + 12, 26, status, 11, 400, live && n ? P.aT : P.muted, 'font-style="italic"'))
  if (W >= 420) s.push(M(W - 16, 26, m === 'gold' ? 'TOP 10 · THIS WEEK' : m === 'book' ? 'TAPPED LINE · REEL 2' : 'DIAL TEST · 40 RESPONDENTS', 8, P.muted, 'text-anchor="end" letter-spacing="1"'))
  // the chart
  const gx = 40
  const gy = 44
  const gw = W - 56
  const gh = 130
  const paper = m === 'book'
  s.push(`<rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" fill="${paper ? '#ECE6DA' : P.tile2}" stroke="${paper ? '#B9B0A0' : P.line}"/>`)
  for (let i = 1; i < 4; i++) s.push(`<line x1="${gx}" y1="${r1(gy + (gh * i) / 4)}" x2="${gx + gw}" y2="${r1(gy + (gh * i) / 4)}" stroke="${paper ? '#C9C2B0' : P.line}" stroke-dasharray="${i === 2 ? '0' : '2 3'}" opacity=".8"/>`)
  for (const [v, y] of [[100, gy + 4], [50, gy + gh / 2 + 3], [0, gy + gh - 1]] as [number, number][]) s.push(M(gx - 6, y, String(v), 7.5, P.muted, 'text-anchor="end"'))
  if (paper) s.push(`<circle cx="${W - 34}" cy="${gy + gh - 18}" r="11" fill="none" stroke="#3A3F45" stroke-width="2"/><circle cx="${W - 34}" cy="${gy + gh - 18}" r="3" fill="#3A3F45"/><circle cx="${W - 60}" cy="${gy + gh - 18}" r="11" fill="none" stroke="#3A3F45" stroke-width="2"/><circle cx="${W - 60}" cy="${gy + gh - 18}" r="3" fill="#3A3F45"/>`)
  if (!n) {
    s.push(T(gx + gw / 2, gy + gh / 2 - 4, 'The room is waiting.', 11.5, 700, paper ? PROTEXT : P.text, 'text-anchor="middle"'))
    s.push(T(gx + gw / 2, gy + gh / 2 + 12, 'Every tool call is a beat on the dial.', 11, 400, paper ? '#4A4E5A' : P.muted, 'text-anchor="middle" font-style="italic"'))
  } else {
    const showN = Math.min(n, Math.max(8, Math.floor(gw / 14)))
    let from = Math.max(0, n - showN)
    if (!live && sel < from) from = Math.max(0, sel - Math.floor(showN / 2))
    const shown = beats.slice(from, from + showN)
    // the audience line: starts at 50, each call moves it; clamped to 5..95
    let v = 50
    for (let i = 0; i < from; i++) v = clamp(v + reaction(beats[i]) - (v - 50) * 0.18, 5, 95)
    const pts: [number, number, any, number][] = []
    shown.forEach((b: any, i: number) => {
      v = clamp(v + reaction(b) - (v - 50) * 0.18, 5, 95)
      const x = gx + 8 + (shown.length > 1 ? ((gw - 16) * i) / (shown.length - 1) : (gw - 16) / 2)
      pts.push([x, gy + gh - (gh * v) / 100, b, from + i])
    })
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`).join('')
    const ink = paper ? '#1A1C22' : m === 'gold' ? P.a : P.aT
    s.push(`<path d="${line}" fill="none" stroke="${ink}" stroke-width="1.8" stroke-linejoin="round"/>`)
    pts.forEach(([x, y, b, idx]) => {
      const dip = failedNear(b.at, 1500)
      const spike = b.tool === 'Write'
      const col = dip ? (paper ? '#C2362F' : P.alert) : spike ? (m === 'book' ? '#A12A24' : '#F0D27A') : ink
      s.push(`<circle cx="${r1(x)}" cy="${r1(y)}" r="${idx === sel ? 4 : 2.4}" fill="${col}"${idx === sel && live ? ' class="tb-run"' : ''}><title>${esc(`${hhmm(b.at)} ${b.who} ${VERBS[b.tool] ?? b.tool} ${b.text}`)}</title></circle>`)
      if (dip) s.push(`<path d="M${r1(x)} ${r1(y + 5)}v${r1(Math.max(0, gy + gh - y - 8))}" stroke="${col}" stroke-width="1" stroke-dasharray="2 2" opacity=".6"/>`)
    })
    // the picked call's bubble
    const pk = pts.find(p => p[3] === sel)
    if (pk) {
      const [x, y, b] = pk
      const label = clip(`${VERBS[b.tool] ?? b.tool} · ${b.text}`, 10.5, Math.min(260, gw - 20), 0, true)
      const bw = sansW(label, 10.5, 0, true) + 14
      const bx = clamp(x - bw / 2, gx + 4, gx + gw - bw - 4)
      const by = y > gy + 40 ? y - 30 : y + 12
      s.push(`<rect x="${r1(bx)}" y="${r1(by)}" width="${r1(bw)}" height="18" rx="9" fill="${PROPS.paper}" stroke="${PROPS.paperInk}" stroke-width=".8"/><path d="M${r1(clamp(x, bx + 8, bx + bw - 8) - 4)} ${r1(y > gy + 40 ? by + 18 : by)}l4 ${y > gy + 40 ? 5 : -5} 4 ${y > gy + 40 ? -5 : 5}z" fill="${PROPS.paper}"/>${T(bx + 7, by + 12.5, label, 10.5, 700, PROPS.paperInk)}`)
    }
    s.push(M(gx, gy + gh + 13, hhmm((shown[0] as any).at), 7.5, P.muted))
    s.push(M(gx + gw, gy + gh + 13, live ? 'LIVE' : hhmm((shown[shown.length - 1] as any).at), 7.5, live ? P.aT : P.muted, 'text-anchor="end"'))
  }
  const b = n ? beats[sel] : null
  s.push(T(16, H - 30, b ? clip(`${hhmm(b.at)} · ${b.who} · ${VERBS[b.tool] ?? b.tool}`, 11, W - 32) : '', 11, 700, P.sub))
  s.push(T(16, H - 12, b ? clip(b.text, 11, W - 32) : 'Respondents dial up for wins, down for errors.', 11, 400, P.muted, 'font-style="italic"'))
  if (m === 'book') s.push(leak(W, H, 'log'))
  return `${s.join('\n')}</svg>`
}
const PROTEXT = '#1A1C22'
export const dialAlt = (beats: any[], pick: number) => {
  if (!beats.length) return 'Focus group: no respondents yet'
  const b = beats[pick < 0 ? beats.length - 1 : Math.min(pick, beats.length - 1)]
  return `Focus group: call ${pick < 0 ? beats.length : pick + 1} of ${beats.length}, ${b.who} ${VERBS[b.tool] ?? b.tool} ${b.text} at ${hhmm(b.at)}`
}

// ---------------------------------------------------------------- THE TABLE: the Seven's boardroom, from above
export type BoysOrg = { label: string; color: string; kind: string; status?: string; isQuiet?: boolean; children: BoysOrg[] }
export const TABLE_SEATS = 12
export const tableHeight = (n: number) => 84 + 168 + (n > TABLE_SEATS ? 18 : 0) + 22
/** One lap of THE TABLE's orbit, in seconds. */
export const ORBIT_S = 40
const ORBIT_KEYS = 24
const r3 = (n: number) => Math.round(n * 1000) / 1000
/**
 * The orbit's CSS: `tbo` carries a seat round the ring (rx, ry), depth-scaled (.8 at the back, 1.1 at the front, dimmer at the
 * back) and stepped (10 steps per 15 degrees: 6 fps); `tbl` flips a seat's name below it on the front half, above it on the
 * back half; `tbt` sways the table +-1 degree at 2 fps. Shared by every seat: a seat's slot is its delay.
 */
const orbitCss = (cx: number, cy: number, rx: number, ry: number): string => {
  let o = ''
  for (let k = 0; k <= ORBIT_KEYS; k++) {
    const a = Math.PI + (k / ORBIT_KEYS) * Math.PI * 2
    const d = (Math.sin(a) + 1) / 2
    o += `${r1((k / ORBIT_KEYS) * 100)}%{transform:translate(${Math.round(cx + Math.cos(a) * rx)}px,${Math.round(cy + Math.sin(a) * ry)}px) scale(${r3(0.8 + 0.3 * d)});opacity:${r3(0.62 + 0.38 * d)}}`
  }
  return [
    `.tbo{animation:tbo ${ORBIT_S}s steps(10) infinite}@keyframes tbo{${o}}`,
    `.tbl{animation:tbl ${ORBIT_S}s steps(1) infinite}@keyframes tbl{0%{transform:translateY(-13px)}50%,100%{transform:translateY(21px)}}`,
    `.tbt{animation:tbt 24s steps(48) infinite}@keyframes tbt{0%,100%{transform:rotate(-1deg)}50%{transform:rotate(1deg)}}`,
    '@media (prefers-reduced-motion: reduce){.tbo,.tbl,.tbt{animation:none!important}}',
  ].join('\n')
}
export const tableCard = (W: number, root: BoysOrg, m: Mode) => {
  const P = pal(m)
  const people: { node: BoysOrg; role: string }[] = []
  const walk = (nodes: BoysOrg[], role: string): void => {
    for (const nd of nodes) {
      if (people.length > 200) return
      if (nd.kind === 'agent' || nd.kind === 'tokens') people.push({ node: nd, role })
      walk(nd.children, nd.kind === 'agent' ? role : nd.label)
    }
  }
  walk(root.children, '')
  const H = tableHeight(people.length)
  const s = [svgOpen(W, H, CSS), frame(W, H, m), cardTitle(16, 26, TITLES[m].org, m)]
  const working = people.filter(p => p.node.status === 'running' && !p.node.isQuiet).length
  s.push(T(W - 16, 26, people.length ? `${people.length} at the table · ${working} talking` : 'the seats are empty', 11, 400, P.muted, 'text-anchor="end" font-style="italic"'))
  // The room as a set: the skyline strip behind it drifts as a 2-layer parallax (the camera is moving), the table is extruded
  // (a rim under its top), and the seats ride ONE slow orbit (40 s a lap): every seat follows the same stepped keyframes, a
  // seat's slot is its delay, so a lap costs one keyframes block whatever the crew. Back seats shrink to .8 and dim, front
  // ones grow to 1.1. Under reduced motion each seat stands at its slot (its transform attribute), the backdrop holds.
  const sy = 36
  const sw = W - 32
  const sky = m === 'book' ? ['#0C0D0F', '#16181B', '#1E2126', '#C8B48A'] : m === 'gold' ? ['#2A2618', '#262618', '#33372A', '#E2C25A'] : m === 'noir' ? ['#0B0C0E', '#16181B', '#1E2126', '#8C96A0'] : ['#08102A', '#101A3E', '#14204A', '#F0D27A']
  s.push(`<rect x="16" y="${sy}" width="${sw}" height="40" rx="3" fill="${sky[0]}"/>`)
  let far = ''
  for (let i = 0; i < 6; i++) { const bw = 8 + unit(`skf${i}`) * 10; const bh = 6 + unit(`skfh${i}`) * 10; far += `<rect x="${r1(i * 16)}" y="${r1(40 - bh)}" width="${r1(bw)}" height="${r1(bh)}" fill="${sky[1]}"/>` }
  let near = ''
  for (let i = 0; i < 5; i++) {
    const bx = i * 30 + unit(`skn${i}`) * 6
    const bw = 12 + unit(`sknw${i}`) * 12
    const bh = 12 + unit(`sknh${i}`) * 16
    near += `<rect x="${r1(bx)}" y="${r1(40 - bh)}" width="${r1(bw)}" height="${r1(bh)}" fill="${sky[2]}"/>`
    for (let k = 0; k < 2; k++) if (unit(`sknl${i}${k}`) < 0.5) near += `<rect x="${r1(bx + 3 + k * 4)}" y="${r1(40 - bh + 4 + (k % 2) * 5)}" width="1.6" height="1.6" fill="${sky[3]}" opacity=".45"/>`
  }
  const px2 = parallax({ id: 'tbsk', W: sw, H: 40, fps: 4, layers: [{ tile: far, w: 96, speed: 1.6 }, { tile: near, w: 150, speed: 4 }] })
  s.push(`<style>${px2.css}</style><defs><clipPath id="tbskc"><rect x="16" y="${sy}" width="${sw}" height="40" rx="3"/></clipPath></defs><g clip-path="url(#tbskc)"><g transform="translate(16 ${sy})">${px2.svg}</g></g>`)
  const tx = W * 0.62
  s.push(`<rect x="${r1(tx)}" y="${sy + 6}" width="12" height="34" fill="${m === 'brand' ? '#1E3474' : '#2A2D32'}"/><path d="M${r1(tx - 2)} ${sy + 6}h16l-3 -5h-10z" fill="${m === 'book' ? '#5A5F66' : m === 'noir' ? P.a : '#F0D27A'}"${m === 'brand' ? ' class="tb-pulse"' : ''}/>`)
  if (m === 'brand') s.push(`<path d="M${r1(tx + 6)} ${sy + 2}L${r1(tx - 60)} ${sy - 30}" stroke="#F0D27A" stroke-width="6" opacity=".08"/><path d="M${r1(tx + 6)} ${sy + 2}L${r1(tx + 70)} ${sy - 30}" stroke="#F0D27A" stroke-width="6" opacity=".08"/>`)
  const bbW = Math.min(180, W * 0.36)
  s.push(`<rect x="26" y="${sy + 6}" width="${r1(bbW)}" height="24" rx="2" fill="${m === 'book' ? '#ECE6DA' : m === 'noir' ? '#121417' : '#0A1430'}" stroke="${P.a}" stroke-width="1"/>`)
  s.push(C(34, sy + 22, clipC(m === 'book' ? '% CHATTER ' : m === 'gold' ? 'CHART #1' : m === 'noir' ? '…' : 'NEVER MEET YOUR HEROES', 9, bbW - 50, 1), 9, m === 'book' ? '#1A1C22' : m === 'noir' ? P.a : '#F0D27A', 'letter-spacing="1"'))
  const buzz = clamp(Math.round(lastApproval() * 0.6 + people.length * 4 + working * 6), 0, 99)
  s.push(C(26 + bbW - 8, sy + 22, `${buzz >= 50 ? '▲' : '▼'}${buzz}%`, 9, m === 'book' ? '#A12A24' : buzz >= 50 ? (m === 'noir' ? P.a : '#F0D27A') : '#8E9AB8', 'text-anchor="end"'))
  // the table: a shadow, the rim (4 copies, each darker, 2 px apart), the top, a fixed highlight (the light does not orbit)
  const cx = W / 2
  const cy = sy + 40 + 82
  const rx = Math.min(W / 2 - 70, 200)
  const ry = 44
  const top = m === 'book' ? '#2B2620' : m === 'gold' ? '#3A3220' : m === 'noir' ? '#1C1E22' : '#0E1838'
  const rim = m === 'book' ? ['#1E1A16', '#17140F'] : m === 'gold' ? ['#2A2416', '#1F1A10'] : m === 'noir' ? ['#131417', '#0D0E10'] : ['#0A1230', '#070D24']
  let tbl = `<ellipse cx="${r1(cx)}" cy="${r1(cy + 16)}" rx="${r1(rx + 10)}" ry="${ry + 4}" fill="#000000" opacity=".28"/>`
  for (let k = 3; k >= 1; k--) tbl += `<ellipse cx="${r1(cx)}" cy="${r1(cy + k * 2.6)}" rx="${r1(rx)}" ry="${ry}" fill="${rim[k > 1 ? 1 : 0]}"${k === 3 ? ` stroke="${P.a}" stroke-opacity=".5"` : ''}/>`
  tbl += `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(rx)}" ry="${ry}" fill="${top}" stroke="${P.a}" stroke-width="1.4"/><ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(rx - 8)}" ry="${ry - 6}" fill="none" stroke="${P.a}" stroke-opacity=".3"/>`
  tbl += `<path d="M${r1(cx - rx * 0.72)} ${r1(cy - ry * 0.42)}Q${r1(cx - rx * 0.2)} ${r1(cy - ry * 0.95)} ${r1(cx + rx * 0.3)} ${r1(cy - ry * 0.78)}" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity=".06"/>`
  tbl += C(cx, cy + 4, m === 'book' ? 'THE BOYS' : m === 'gold' ? 'PAYBACK' : m === 'noir' ? '…' : 'THE SEVEN', 12, P.a, 'text-anchor="middle" letter-spacing="4" opacity=".55"')
  // A gentle 2D tilt of the table (the camera sways a little), stepped at 2 fps.
  s.push(`<g class="tbt" style="transform-origin:${r1(cx)}px ${r1(cy)}px">${tbl}`)
  // the seats: the head chair (the manager, gold) in slot 0, then up to 12, clockwise from the head's left
  const shown = people.slice(0, TABLE_SEATS)
  const seats = Math.max(7, shown.length)
  const N = seats + 1
  const R = [rx + 16, ry + 16]
  const at = (j: number) => {
    const a = Math.PI + (j / N) * Math.PI * 2
    const d = (Math.sin(a) + 1) / 2
    return { x: Math.round(cx + Math.cos(a) * (R[0] as number)), y: Math.round(cy + Math.sin(a) * (R[1] as number)), s: 0.8 + 0.3 * d, o: 0.62 + 0.38 * d, d }
  }
  const lag = (j: number) => `animation-delay:-${r1((j / N) * ORBIT_S)}s`
  s.push('</g>')
  const order = Array.from({ length: N }, (_, j) => j).sort((u, v) => at(u).y - at(v).y)
  const label = (j: number, text: string, bold: boolean, fill: string) => `<g class="tbl" style="${lag(j)}" transform="translate(0 ${at(j).d >= 0.5 ? 21 : -13})">${T(0, 0, text, 9.5, bold ? 700 : 400, fill, 'text-anchor="middle"')}</g>`
  const seat = (j: number, inner: string) => { const q = at(j); return `<g class="tbo" style="${lag(j)}" transform="translate(${q.x} ${q.y}) scale(${r3(q.s)})" opacity="${r3(q.o)}">${inner}</g>` }
  for (const j of order) {
    if (j === 0) {
      s.push(seat(0, `${root.status === 'running' ? `<circle class="tb-pulse" r="20" fill="#F0D27A" opacity=".12"/>` : ''}<rect x="-11" y="-13" width="22" height="26" rx="6" fill="#C9A13B" stroke="#F0D27A"/>${star(0, 0, 5, m === 'noir' ? P.ink : '#0A1430')}${label(0, 'Manager', true, P.text)}`))
      continue
    }
    const p = shown[j - 1]
    if (!p) { s.push(seat(j, `<circle r="8" fill="${P.tile2}" stroke="${P.line}"/>`)); continue }
    const live = p.node.status === 'running' && !p.node.isQuiet
    const tone = p.node.status === 'failed' ? P.alert : p.node.status === 'done' ? P.done : p.node.color
    const lab = clip(p.node.label.replace(/^[^:]+:\s*/, ''), 9.5, 92)
    s.push(seat(j, `<title>${esc(`${p.node.label}${p.role ? ` · ${p.role}` : ''} · ${p.node.status ?? 'waiting'}`)}</title>${live ? '<circle class="tb-pulse" r="15" fill="#FFF4C2" opacity=".14"/>' : ''}<circle r="9" fill="${tone}" stroke="${P.tile}" stroke-width="1.5"/><circle cy="-1" r="3.4" fill="${PROPS.skin}"/>${label(j, lab, live, live ? P.text : P.sub)}`))
  }
  s.push(`<style>${orbitCss(cx, cy, R[0] as number, R[1] as number)}</style>`)
  if (people.length > TABLE_SEATS) s.push(T(W / 2, H - 30, `+${people.length - TABLE_SEATS} more in the gallery`, 11, 400, P.muted, 'text-anchor="middle" font-style="italic"'))
  s.push(T(16, H - 10, people.length ? (m === 'book' ? 'Everyone in the room. Watch the exits.' : 'Live seats get the spotlight.') : 'AMERICAN HERO · OPEN SLOTS', 11, 400, P.muted, 'font-style="italic"'))
  if (m === 'book') s.push(leak(W, H, 'org'))
  return `${s.join('\n')}</svg>`
}
