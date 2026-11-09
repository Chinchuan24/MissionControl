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
import { failedNear, lastApproval } from './theboys-eggs'
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
  noir: { cred: 'THE SCRIPT', task: 'CRISIS DESK', log: 'THE STORYBOARD', org: 'THE TABLE' },
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
export const figureBox = (x: number, y: number, b: any, earned: boolean, pct: number, m: Mode, fresh = false) => {
  const P = pal(m)
  const back = earned ? (m === 'book' ? '#3A3F45' : m === 'gold' ? P.olive : '#1E3474') : P.tile2
  let s = `<g${fresh ? ' class="tb-pop"' : ''}><title>${esc(`${b.name} · ${b.how} · ${Math.round(pct * 100)}%`)}</title>`
  s += `<rect x="${r1(x)}" y="${y}" width="${BOX_W}" height="${BOX_H}" rx="3" fill="${back}" stroke="${earned ? P.a : P.line}" stroke-width="${earned ? 1.2 : 1}"/>`
  s += `<circle cx="${r1(x + BOX_W / 2)}" cy="${y + 5}" r="2.4" fill="${P.tile}" stroke="${P.line}" stroke-width=".8"/>`
  // the bubble
  s += `<rect x="${r1(x + 6)}" y="${y + 11}" width="${BOX_W - 12}" height="44" rx="10" fill="#FFFFFF" fill-opacity="${earned ? 0.1 : 0.04}" stroke="#FFFFFF" stroke-opacity="${earned ? 0.45 : 0.18}"/>`
  if (earned) {
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
  s.push(T(W - 16, 26, m === 'book' ? 'Asset file · eyes only' : m === 'gold' ? 'Vought Records · 1983' : 'Vought International · Talent', 11, 400, P.muted, 'text-anchor="end" font-style="italic"'))
  // the contract sheet
  const cx = 16
  const cy = 40
  const cw = W - 32
  s.push(`<rect x="${cx}" y="${cy}" width="${cw}" height="160" rx="3" fill="${PROPS.paper}"/><rect x="${cx}" y="${cy}" width="${cw}" height="16" rx="3" fill="${m === 'book' ? '#3A3F45' : m === 'gold' ? P.olive : '#1E3474'}"/>`)
  s.push(M(cx + 8, cy + 11.5, m === 'gold' ? 'RECORDING CONTRACT · SIDE A' : m === 'book' ? 'ASSET FILE · DO NOT COPY' : 'TALENT AGREEMENT · EXHIBIT Q', 8, '#FFFFFF', 'letter-spacing="1.1"'))
  s.push(M(cx + cw - 8, cy + 11.5, `No. ${String(level).padStart(3, '0')}-${String(c.jobs).padStart(4, '0')}`, 8, '#FFFFFF', 'text-anchor="end" letter-spacing=".8"'))
  // the headshot with its gold seal
  const hx = cx + 10
  const hy = cy + 24
  const bust = BUST[m]
  s.push(`<rect x="${hx}" y="${hy}" width="84" height="96" fill="${m === 'book' ? '#2A2D32' : '#13214A'}"/><rect x="${hx}" y="${hy}" width="84" height="96" fill="none" stroke="#C9A13B" stroke-width="1.4"/>`)
  s.push(px(bust, hx + 42 - (spW(bust) * 1.9) / 2, hy + 96 - spH(bust) * 1.9 + 1, 1.9, { rows: [0, Math.min(spH(bust), Math.floor(95 / 1.9))] }))
  s.push(`<circle cx="${hx + 76}" cy="${hy + 90}" r="12" fill="#C9A13B"/><circle cx="${hx + 76}" cy="${hy + 90}" r="9.5" fill="none" stroke="#F0D27A" stroke-dasharray="1.5 1.5"/>${C(hx + 76, hy + 94, String(level), 10, '#0A1430', 'text-anchor="middle"')}`)
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
    s.push(C(tx, hy + 26, clipC(rank.toUpperCase(), 15, tw, 0.4), 15, m === 'book' ? '#A12A24' : '#1E3474', 'letter-spacing=".4"'))
    s.push(M(tx, hy + 44, 'Q POINTS', 7.5, '#4A4E5A', 'letter-spacing="1"'))
    s.push(`<text x="${tx}" y="${hy + 60}" font-family="${FONT}" font-size="11" fill="#3A3E48"><tspan font-size="14" font-weight="700" fill="${PROPS.paperInk}">${c.xp}</tspan> · ${Math.max(0, need - c.xp)} to Q${level + 1}</text>`)
    s.push(M(tx, hy + 78, 'RECORD', 7.5, '#4A4E5A', 'letter-spacing="1"'))
    s.push(T(tx, hy + 93, clip(`${c.jobs} jobs · ${c.longJobs} long · ${c.agents} supes called`, 10.5, tw), 10.5, 400, '#3A3E48'))
  }
  s.push(`<path d="M${cx + 10} ${cy + 148}h${r1(cw * 0.35)}" stroke="#9AA0AA" stroke-width=".8"/>`)
  s.push(`<text x="${cx + 12}" y="${cy + 145}" font-family="'Snell Roundhand','Segoe Script','Brush Script MT',cursive" font-size="13" fill="#1E3474">${m === 'book' ? 'W. Butcher (witness)' : m === 'gold' ? 'Soldier Boy' : 'M. Stillwell'}</text>`)
  s.push(M(cx + cw - 10, cy + 152, m === 'book' ? 'COPY 2 OF 2 · NOT FOR VOUGHT' : 'SIGNED · SEALED · SPUN', 7, '#7A7E88', 'text-anchor="end" letter-spacing=".6"'))
  // the peg wall
  const py = 210
  const per = perRow(W)
  const earnedN = BADGES.filter(b => earnedOf(c, b.id)).length
  s.push(T(16, py + 4, `THE COLLECTION  ${earnedN} of ${BADGES.length}`, 9.5, 700, P.muted, 'letter-spacing=".8"'))
  s.push(T(W - 16, py + 4, m === 'book' ? 'evidence, bagged' : 'collect them all', 11, 400, P.muted, 'text-anchor="end" font-style="italic"'))
  const gap = per > 1 ? (W - 32 - per * BOX_W) / (per - 1) : 0
  BADGES.forEach((b0, i) => {
    const b = veiled(b0, c)
    const earned = earnedOf(c, b.id)
    const col = i % per
    const row = Math.floor(i / per)
    s.push(figureBox(16 + col * (BOX_W + gap), py + 12 + row * (BOX_H + 8), b, earned, earned ? 1 : b.progress(c), m, o.fresh === b.id))
  })
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

// ---------------------------------------------------------------- FOCUS GROUP: the dial test
export const LOG_H = 236
export const VERBS: Record<string, string> = { Read: 'Brief', Grep: 'Track down', Glob: 'Canvass', LS: 'Canvass', Edit: 'Spin', MultiEdit: 'Spin', NotebookEdit: 'Spin', Write: 'Statement', Bash: 'Deploy', PowerShell: 'Deploy', Agent: 'Call in', ToolSearch: 'Roster', WebFetch: 'Footage', WebSearch: 'Polls' }
/** How the audience reacts to a call: a Write spikes gold, an Edit lifts, a read nudges, a failed call dips. */
export const reaction = (b: any): number => (failedNear(b.at, 1500) ? -16 : b.tool === 'Write' ? 14 : /Edit/.test(b.tool) ? 7 : b.tool === 'Agent' ? 9 : /Bash|PowerShell/.test(b.tool) ? 4 : 2)
export const dialCard = (W: number, beats: any[], pick: number, m: Mode) => {
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
  // the skyline strip behind the room: Vought Tower (our own: a lit crown, no logo), two searchlights, the billboard
  const sy = 36
  s.push(`<rect x="16" y="${sy}" width="${W - 32}" height="40" rx="3" fill="${m === 'book' ? '#0C0D0F' : m === 'gold' ? '#2A2618' : '#08102A'}"/>`)
  for (let i = 0; i < 12; i++) { const bx = 20 + unit(`sk${i}`) * (W - 60); const bh = 8 + unit(`skh${i}`) * 18; s.push(`<rect x="${r1(bx)}" y="${r1(sy + 40 - bh)}" width="${r1(10 + unit(`skw${i}`) * 14)}" height="${r1(bh)}" fill="${m === 'brand' ? '#14204A' : '#1E2126'}"/>`) }
  const tx = W * 0.62
  s.push(`<rect x="${r1(tx)}" y="${sy + 6}" width="12" height="34" fill="${m === 'brand' ? '#1E3474' : '#2A2D32'}"/><path d="M${r1(tx - 2)} ${sy + 6}h16l-3 -5h-10z" fill="${m === 'book' ? '#5A5F66' : '#F0D27A'}"${m === 'brand' ? ' class="tb-pulse"' : ''}/>`)
  if (m === 'brand') s.push(`<path d="M${r1(tx + 6)} ${sy + 2}L${r1(tx - 60)} ${sy - 30}" stroke="#F0D27A" stroke-width="6" opacity=".08"/><path d="M${r1(tx + 6)} ${sy + 2}L${r1(tx + 70)} ${sy - 30}" stroke="#F0D27A" stroke-width="6" opacity=".08"/>`)
  const bbW = Math.min(180, W * 0.36)
  s.push(`<rect x="26" y="${sy + 6}" width="${r1(bbW)}" height="24" rx="2" fill="${m === 'book' ? '#ECE6DA' : '#0A1430'}" stroke="${P.a}" stroke-width="1"/>`)
  s.push(C(34, sy + 22, clipC(m === 'book' ? '% CHATTER ' : m === 'gold' ? 'CHART #1' : 'NEVER MEET YOUR HEROES', 9, bbW - 50, 1), 9, m === 'book' ? '#1A1C22' : '#F0D27A', 'letter-spacing="1"'))
  const buzz = clamp(Math.round(lastApproval() * 0.6 + people.length * 4 + working * 6), 0, 99)
  s.push(C(26 + bbW - 8, sy + 22, `${buzz >= 50 ? '▲' : '▼'}${buzz}%`, 9, m === 'book' ? '#A12A24' : buzz >= 50 ? '#F0D27A' : '#8E9AB8', 'text-anchor="end"'))
  // the table
  const cx = W / 2
  const cy = sy + 40 + 82
  const rx = Math.min(W / 2 - 70, 200)
  const ry = 44
  s.push(`<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(rx)}" ry="${ry}" fill="${m === 'book' ? '#2B2620' : m === 'gold' ? '#3A3220' : '#0E1838'}" stroke="${P.a}" stroke-width="1.4"/><ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(rx - 8)}" ry="${ry - 6}" fill="none" stroke="${P.a}" stroke-opacity=".3"/>`)
  s.push(C(cx, cy + 4, m === 'book' ? 'THE BOYS' : m === 'gold' ? 'PAYBACK' : 'THE SEVEN', 12, P.a, 'text-anchor="middle" letter-spacing="4" opacity=".55"'))
  // the head chair: the manager, gold
  const hx = cx - rx - 22
  s.push(`<rect x="${r1(hx - 12)}" y="${r1(cy - 16)}" width="24" height="32" rx="6" fill="#C9A13B" stroke="#F0D27A"/>${star(hx, cy, 5, '#0A1430')}`)
  s.push(T(hx, cy + 30, 'Manager', 10, 700, P.text, 'text-anchor="middle"'))
  if (root.status === 'running') s.push(`<circle class="tb-pulse" cx="${r1(hx)}" cy="${r1(cy)}" r="22" fill="#F0D27A" opacity=".12"/>`)
  // the side seats: up to 12, round the table, clockwise from the head's left
  const shown = people.slice(0, TABLE_SEATS)
  const seats = Math.max(7, shown.length)
  for (let i = 0; i < seats; i++) {
    const a = Math.PI + ((i + 1) / (seats + 1)) * Math.PI * 2
    const sx = cx + Math.cos(a) * (rx + 16)
    const syy = cy + Math.sin(a) * (ry + 16)
    const p = shown[i]
    if (!p) {
      s.push(`<circle cx="${r1(sx)}" cy="${r1(syy)}" r="8" fill="${P.tile2}" stroke="${P.line}"/>`)
      continue
    }
    const live = p.node.status === 'running' && !p.node.isQuiet
    const tone = p.node.status === 'failed' ? P.alert : p.node.status === 'done' ? P.done : p.node.color
    if (live) s.push(`<circle class="tb-pulse" cx="${r1(sx)}" cy="${r1(syy)}" r="15" fill="#FFF4C2" opacity=".14"/>`)
    s.push(`<circle cx="${r1(sx)}" cy="${r1(syy)}" r="9" fill="${tone}" stroke="${P.tile}" stroke-width="1.5"/><circle cx="${r1(sx)}" cy="${r1(syy - 1)}" r="3.4" fill="${PROPS.skin}"/>`)
    const below = syy > cy
    const lab = clip(p.node.label.replace(/^[^:]+:\s*/, ''), 9.5, 92)
    s.push(T(sx, syy + (below ? 21 : -13), lab, 9.5, live ? 700 : 400, live ? P.text : P.sub, 'text-anchor="middle"'))
    s.push(`<title>${esc(`${p.node.label}${p.role ? ` · ${p.role}` : ''} · ${p.node.status ?? 'waiting'}`)}</title>`)
  }
  if (people.length > TABLE_SEATS) s.push(T(W / 2, H - 30, `+${people.length - TABLE_SEATS} more in the gallery`, 11, 400, P.muted, 'text-anchor="middle" font-style="italic"'))
  s.push(T(16, H - 10, people.length ? (m === 'book' ? 'Everyone in the room. Watch the exits.' : 'Live seats get the spotlight.') : 'AMERICAN HERO · OPEN SLOTS', 11, 400, P.muted, 'font-style="italic"'))
  if (m === 'book') s.push(leak(W, H, 'org'))
  return `${s.join('\n')}</svg>`
}
