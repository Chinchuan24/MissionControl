// The Boys (fan homage): the theme entries. One skin, two modes, `boysTheme('brand')` ON BRAND and `boysTheme('book')` OFF BOOK
// (cast keys `boys` and `boys2`, as Invincible picks its era), plus the hidden SOLID GOLD skin, `boysTheme('gold')` (cast
// `solidgold`). The band is the slim band in the theme's own hand with the VNN crawl along its foot; Q-SCORE is the level card,
// CRISIS DESK the task card with the PRESS RELEASES, FOCUS GROUP the log and THE TABLE the hierarchy.
// The live numbers (APPROVAL, 7SPN, BREAKING, TURBO RUSH) are read from theboys-eggs.ts, which the register feeds.
import { BAND_H, BOOTS, CSS, bustTurn, GOLD, PROPS, SCORE_W, WARNINGS, bootLine, chip, cheer, crew, ep, epW, episodeAt, figure, filmLook, foot, gauge, idle, name, pal, pip, sansW, scoreboard, syringe, vhsRoll, C, T, condW, r1 } from './theboys'
import type { Mode } from './theboys'
import { BADGES, TITLES, credCard, credToast, deskAlt, deskCard, dialAlt, dialCard, rankOf, tableCard } from './theboys-cards'
import type { BoysOrg } from './theboys-cards'
import { SPIN_BOOK, SPIN_BRAND, SPIN_GOLD, SPIN_NOIR, fightDrawn, fxFromEvent, TOOLS_BOOK, TOOLS_BRAND, TOOLS_GOLD, actMs, autoLookAtMe, boysFx, drawAt, inFlight, noteDraw, spinDue } from './theboys-eggs'
import { actOn, actShake, intertitle, speedSmear, titleSpin } from './theboys-acts'
import { Act as StageAct } from './stage/timeline'
import * as wipe from './stage/wipe'
import { AMBUSH_KINDS, FIGHT_KINDS, IDLE_NAP_MS, PREMIERE_FACE_MS, ahead, idleFor, isNight, lastWorking, longestCall, moon, noirCheer, noteAmbush, noteBusy, noteWorking, premiereFace, stageAt, terrorNap } from './theboys-show'
import type { ExtraArgs, PaneCard, ThemeEggs } from './themes'
import { pin } from './smooth'

export const GREETINGS: Record<Mode, string> = { brand: 'Welcome back. Smile for the cameras.', book: "Oi. Kettle's on.", gold: 'Thawed out and ready to roll.', noir: '…' }
export const SWAP_MS = 2_200
/** The mode swap over a panel already drawn in the new mode (2.2 s, pinned to the switch). Into OFF BOOK: SIGNAL HIJACKED (the
 *  picture tears, static, then grime). Back ON BRAND: a gold wipe with WE APOLOGISE FOR THE INTERRUPTION. */
export const swapLayer = (W: number, H: number, to: Mode, since: number): string => {
  const d = `animation-delay:calc(${pin(since)} + 0s)`
  if (to === 'book') {
    let bars = ''
    for (let i = 0; i < 9; i++) bars += `<rect x="0" y="${r1((H / 9) * i)}" width="${W}" height="${r1(H / 18)}" fill="${i % 2 ? '#2A2D32' : '#ECE6DA'}" opacity="${i % 2 ? 0.5 : 0.08}"/>`
    const label = 'SIGNAL HIJACKED'
    const w = condW(label, 16, 3) + 26
    return `<g class="tb-swap" pointer-events="none" style="${d}" data-egg="hijack"><rect width="${W}" height="${H}" rx="10" fill="#111214" opacity=".72"/><g class="tb-static" style="${d}">${bars}</g><g class="tb-tear" style="${d}"><rect x="${r1(W / 2 - w / 2)}" y="${r1(H / 2 - 16)}" width="${r1(w)}" height="30" fill="${PROPS.marker}"/>${C(W / 2, H / 2 + 5, label, 16, '#FFFFFF', 'text-anchor="middle" letter-spacing="3"')}</g></g>`
  }
  if (to === 'noir') {
    const lw = condW('THIS MEANS NOIR', 15, 3) + 30
    return `<g class="tb-swap" pointer-events="none" style="${d}" data-egg="noirmode"><g class="tb-wipe" style="${d}"><rect width="${W}" height="${H}" rx="10" fill="#0B0C0E"/><rect x="${r1(W / 2 - lw / 2)}" y="${r1(H / 2 - 15)}" width="${r1(lw)}" height="28" fill="#1C1C22" stroke="#D9A441"/>${C(W / 2, H / 2 + 4, 'THIS MEANS NOIR', 15, '#D9A441', 'text-anchor="middle" letter-spacing="3"')}${C(W / 2, H / 2 + 26, '1979', 9, '#8C96A0', 'text-anchor="middle" letter-spacing="2"')}</g></g>`
  }
  const label = to === 'gold' ? 'ROLL TAPE · SOLID GOLD' : 'WE APOLOGISE FOR THE INTERRUPTION'
  const sz = W < 500 ? 10 : 13
  return `<g class="tb-swap" pointer-events="none" style="${d}" data-egg="onbrand"><g class="tb-wipe" style="${d}"><rect width="${W}" height="${H}" rx="10" fill="#C9A13B"/><rect y="${r1(H / 2 - 14)}" width="${W}" height="28" fill="#0A1430"/>${C(W / 2, H / 2 + sz * 0.35, label, sz, '#F0D27A', 'text-anchor="middle" letter-spacing="2"')}</g></g>`
}
/** Is the swap still playing at `at`? */
export const swapLive = (since: number | undefined, at: number): since is number => since !== undefined && since > 0 && at >= since - 1000 && at < since + SWAP_MS

// Leaving a hidden look, and arriving in NOIR. The register pins a swap to the switch only on the way INTO SOLID GOLD (NOIR's way in
// is its teaser act, and both ways out land on ON BRAND's own clock), so it tells the theme (`noteTurn`) when it puts NOIR on or
// takes SOLID GOLD or NOIR off: that turn plays once, 2.4 s, pinned to the switch.
let LOOK: { m: Mode; at: number } | undefined
let TURN: { from: Mode; to: Mode; at: number } | undefined
export const TURN_MS = 2_400
export const noteLook = (m: Mode, at: number): void => {
  if (LOOK && at < LOOK.at) return
  LOOK = { m, at }
}
/** The register calls this the moment a hidden look is put on or taken off (wearBoys): the turn is pinned to the switch, so it
 *  plays whatever the band's redraw rate (an idle band redraws once a minute). Only turns that involve SOLID GOLD or NOIR. */
export const noteTurn = (from: Mode, to: Mode, at: number): void => {
  if (from !== to && (from === 'gold' || from === 'noir' || to === 'noir')) TURN = { from, to, at }
}
export const turnAt = (at: number): { from: Mode; to: Mode; at: number } | undefined => (TURN && at >= TURN.at - 1000 && at < TURN.at + TURN_MS ? TURN : undefined)
export const resetLooks = (): void => { LOOK = undefined; TURN = undefined }
/**
 * The turn's layer on one surface. Into NOIR: an iris opens from black on the bust (cards: the middle). Out of NOIR: the iris closes,
 * THE END on an intertitle, the black lifts off ON BRAND. Out of SOLID GOLD (`back on ice`): frost creeps in from the corners over a
 * thin gold veil, BACK ON ICE, cracks run, and the ice shatters off. Veils stay see-through (.5); only NOIR's black is a full cut.
 */
export const turnLayer = (W: number, H: number, t: { from: Mode; to: Mode; at: number }, surface: 'band' | 'pane', card = ''): string => {
  const act = new StageAct({ id: `tb-turn-${surface}${card}`, ms: TURN_MS, at: t.at, W, H })
  const cx = surface === 'band' ? 37 : W / 2
  const cy = surface === 'band' ? 58 : H / 2
  let body = ''
  if (t.to === 'noir') body = wipe.iris(act, 0.05, 0.9, { cx, cy, mode: 'in', color: '#000000' })
  else if (t.from === 'noir') {
    const end = act.on(intertitle(W / 2, H / 2, 'The End', surface === 'band' ? 20 : 16), 0.75, 1.75, { fade: 0.12 })
    body = wipe.clip(act, 1.8, 2.3, `${wipe.iris(act, 0, 0.7, { cx, cy, mode: 'out', color: '#000000' })}${end}`, { dir: 'd', ease: 'settle' })
  } else {
    // back on ice: frost from the four corners (radial frost scaling out), the edge rime, the plate, the cracks, the shatter.
    const fr = `${act.p}fr`
    const corner = (x: number, y: number) => act.kf(`<circle cx="${x}" cy="${y}" r="${r1(Math.min(W, 3 * H) * 0.42)}" fill="url(#${fr})"/>`, [[0, 'transform:scale(.05)'], [1.1, 'transform:none']], { ease: 'settle', origin: `${x}px ${y}px` })
    const cracks = [[0.18, 0.1, 0.32, 0.55, 0.27, 0.9], [0.62, 0.05, 0.55, 0.45, 0.7, 0.95], [0.86, 0.2, 0.78, 0.6, 0.9, 0.85]].map(([a, b, c, d, e, f]) => `<path d="M${r1(W * (a as number))} ${r1(H * (b as number))}L${r1(W * (c as number))} ${r1(H * (d as number))}L${r1(W * (e as number))} ${r1(H * (f as number))}" fill="none" stroke="#FFFFFF" stroke-width="1.1" stroke-dasharray="400" opacity=".85"/>`).join('')
    const flakes = surface === 'pane' ? '' : [[0.04, 0.12], [0.09, 0.82], [0.95, 0.15], [0.91, 0.86], [0.2, 0.06], [0.78, 0.92]].map(([a, b]) => `<path transform="translate(${r1(W * (a as number))} ${r1(H * (b as number))})" d="M-3 0h6M0 -3v6M-2 -2l4 4M2 -2l-4 4" stroke="#FFFFFF" stroke-width=".8"/>`).join('')
    const ice = `<defs><radialGradient id="${fr}"><stop offset="0" stop-color="#F4FBFF" stop-opacity=".85"/><stop offset=".35" stop-color="#DDF3FF" stop-opacity=".45"/><stop offset="1" stop-color="#DDF3FF" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" rx="10" fill="${GOLD.tile}" opacity=".5"/>${corner(0, 0)}${corner(W, 0)}${corner(0, H)}${corner(W, H)}${act.on(flakes, 0.5, 1.5)}`
    const plate = wipe.titleCard(act, 0.45, 1.45, { text: 'BACK ON ICE', x: W / 2, y: H / 2, size: surface === 'band' ? 16 : 13, fill: '#DDF3FF', ink: '#86B8D0', plate: '#14150F' })
    const crack = act.kf(cracks, [[0, 'stroke-dashoffset:400'], [1.05, 'stroke-dashoffset:400'], [1.4, 'stroke-dashoffset:0']], { ease: 'snap' })
    body = act.on(`${ice}${plate}${crack}`, 0, 1.5) + wipe.shards(act, 1.45, { n: surface === 'band' ? 10 : 4, seed: 'tb-ice', colors: ['#DDF3FF', '#FFFFFF', GOLD.a], mode: 'out', spread: 0.25 })
  }
  return act.done(body, `<rect y="${H - 2}" width="${W}" height="2" fill="${t.to === 'noir' || t.from === 'noir' ? '#F4F1E8' : '#DDF3FF'}"/>`)
}

/** The typed act playing at `at` (its kind and start), or undefined. */
export const actAt = (at: number): { kind: string; at: number } | undefined => {
  const fx = boysFx()
  return fx && at >= fx.at - 1000 && at < fx.at + actMs(fx.kind) ? fx : undefined
}
/** Characters the pane keeps free while a job works for the typed acts (drawn between `<!--dl-->` markers, so the layout never
 *  flips as they come and go). Phase 3's AMBUSH raises it. */
// 80 k (was 100 k): the biggest pane act now draws ~14 k over all its cards and a hidden look's turn ~6 k a card, while THE TABLE's
// orbit and the turning figure box made the cards ~10 k bigger. Phase B's fights (36 k a card) must re-check this.
export const BOYS_PANE_RESERVE = 80_000
/** The scheduled and live layers: the swap, the 7SPN scoreboard on the band's task row, the SPEED SMEAR and the title SPIN, LOOK
 *  AT ME the first time the context passes 95%, and the typed act now playing (on the band, and on its pane card). */
export const boysExtras = (m: Mode) => (o: ExtraArgs): string => {
  if (o.party) return ''
  noteDraw(o.at)
  noteLook(m, o.at)
  const out: string[] = []
  const swapping = swapLive(o.swapAt, o.at)
  if (swapping) out.push(swapLayer(o.W, o.H, m, o.swapAt))
  // The bust turns with the swap: the old face away, the new one round (theboys.ts bustTurn), over the swap's veil.
  if (swapping && o.surface === 'band' && (m === 'brand' || m === 'book')) out.push(bustTurn(m, o.swapAt))
  if (o.surface === 'band') {
    if (!swapping) autoLookAtMe(o.ctxPct, o.at)
    // The 7SPN bug sits just left of the CONTEXT readouts (or the band's right edge when they are folded away).
    const rw = o.W < 1100 ? 62 : 100
    const xr = o.W >= 520 ? o.W - 20 - rw * 3 - 18 - 10 : o.W - 14
    out.push(scoreboard(xr - SCORE_W, 42, o.at, m))
  }
  // One thing on stage at a time (theboys-show stageAt): a typed act or an event egg, else THE AMBUSH (while a job works), else the
  // day's set piece, else a rare roamer. A scheduled piece may be drawn ahead of its start (an idle band redraws once a minute).
  if (o.surface === 'band') {
    noteWorking(o.working, m)
    if (o.working) noteBusy(o.at)
  }
  const st = swapping ? undefined : stageAt(o.at, { working: o.working, mode: m, ...(o.swapAt !== undefined ? { swapAt: o.swapAt } : {}) })
  const act = st && o.at >= st.startAt - 1000 ? st : undefined
  if (o.surface === 'band') {
    if (o.working && !act && inFlight() >= 2) out.push(speedSmear(m, inFlight()))
    // The title SPIN after a failed run plays over E1's scorch (they are the same moment).
    const sp = act && !(act.src === 'fx' && fxFromEvent()) ? undefined : spinDue(o.at, o.working)
    if (sp !== undefined && o.task) out.push(titleSpin(o.W, o.task, o.titleW ?? 300, m, sp))
    // The states the band wears between acts: the PREMIERE FACE on a call over 60 s, Terror's nap when idle, the night moon.
    if (!act && o.working && m === 'brand' && longestCall(o.at) >= PREMIERE_FACE_MS) out.push(premiereFace(m, pal(m)))
    if (!act && !o.working && idleFor(o.at) >= IDLE_NAP_MS) out.push(terrorNap(o.W, m))
    if (m === 'brand' && isNight(o.at)) out.push(moon(o.W))
  }
  if (st) {
    if (o.surface === 'band' && AMBUSH_KINDS.includes(st.kind) && act) noteAmbush(st.startAt)
    const on = o.surface === 'band' ? 'band' : (o.card ?? 'cred')
    let s = actOn(st.kind, { W: o.W, H: o.H, m, at: st.startAt, on, ...(o.task ? { task: o.task } : {}), ...(o.titleW ? { titleW: o.titleW } : {}), ...(o.stage && on === 'band' ? { stage: o.stage } : {}) })
    // Scheduled pieces are marked `show-` (typed and event acts `act-`), and stay hidden until their start.
    if (s && st.src !== 'fx') s = ahead(s.replace('data-egg="act-', 'data-egg="show-'), st.startAt)
    if (s) out.push(on === 'band' ? s : `<!--dl-->${s}<!--/dl-->`)
  }
  // The look's own film over everything on the band: SOLID GOLD's tracking roll (about every 2 min), NOIR's grain and letterbox.
  if (o.surface === 'band' && m === 'gold' && !swapping && !(st && FIGHT_KINDS.includes(st.kind))) out.push(vhsRoll(o.W, o.H, o.at))
  if (o.surface === 'band' && m === 'noir') out.push(filmLook(o.W, o.H))
  const turn = turnAt(o.at)
  if (turn) out.push(turnLayer(o.W, o.H, turn, o.surface === 'band' ? 'band' : 'pane', o.card ?? ''))
  return out.join('')
}
/** A typed act's camera move on a whole panel (LOOK AT ME's beat drop, the WHATEVER float, LITTLE CRICKET's shrink). */
export const boysShake = (m: Mode) => (o: { surface: 'band' | 'pane'; at: number; card?: PaneCard; working?: boolean; swapAt?: number }): string => {
  const st = stageAt(o.at, { working: o.working, mode: m, ...(o.swapAt !== undefined ? { swapAt: o.swapAt } : {}) })
  return st && o.at >= st.startAt - 1000 ? actShake(st.kind, o.surface === 'band' ? 'band' : (o.card ?? 'cred'), st.startAt) : ''
}
/** THE TABLE with the typed act's layer for it (AMERICAN HERO's spotlights, THE REAL HEROES, GOD U., FULL ROSTER). The org
 *  drawer has no clock: it reads the newest draw's. */
export const withTableAct = (svg: string, m: Mode): string => {
  const at = drawAt()
  const st = stageAt(at, { working: lastWorking(), mode: m })
  const act = st && at >= st.startAt - 1000 ? { kind: st.kind, at: st.startAt } : undefined
  const root = /^<svg\b[^>]*>/.exec(svg)?.[0]
  if (!act || !root) return svg
  const W = Number(/\bwidth="([\d.]+)"/.exec(root)?.[1])
  const H = Number(/\bheight="([\d.]+)"/.exec(root)?.[1])
  if (!Number.isFinite(W) || !Number.isFinite(H)) return svg
  const s = actOn(act.kind, { W, H, m, at: act.at, on: 'table' })
  return s ? `${svg.slice(0, svg.lastIndexOf('</svg>'))}<!--dl-->${s}<!--/dl--></svg>` : svg
}

export const boysTheme = (m: Mode): ThemeEggs => {
  const P = pal(m)
  const ranks = (l: number) => rankOf(l, m)
  const badges = BADGES.map(b => ({ id: b.id, name: b.name, icon: b.icon, how: b.how, progress: b.progress }))
  return {
    ticker: at => episodeAt(at, m).join(' '),
    css: CSS,
    readout: { w: 0, draw: () => '' },
    chip: (x, y, ctxPct) => chip(x, y, ctxPct, m),
    slimBand: true,
    slim: {
      h: BAND_H,
      sw: (s, size, ls = 0, bold = false) => sansW(s, size, ls, bold),
      head: () => ({ svg: '', w: 0 }),
      name: (x, y, W, _t, _f, ctx) => name(x, y, W, m, ctx?.totalUsd ?? 0, ctx?.at ?? 0),
      ownsTotal: true,
      ep: { w: epW, draw: (xr, y, code, title, full) => ep(xr, y, code, title, full, m) },
      // While a fight is drawn, SOLID GOLD's shield steps off the meter (its turn is the fight's budget).
      tear: (x, y, w, pct, _t, ctx) => syringe(x, y, w, pct, m, { near: (ctx?.ctxPct ?? 0) >= 95, working: ctx?.isWorking, bare: m === 'gold' && fightDrawn(ctx?.at) }),
      ownEdge: true,
      cache: { fill: m === 'gold' ? P.a : m === 'book' ? P.manila : m === 'noir' ? P.sub : PROPS.vblue, core: m === 'brand' ? '#BFE9FF' : undefined },
      figure: ctx => figure(m, ctx?.at ?? 0),
      crew: (x, y, color, live) => crew(x, y, color, m, live),
      pip: (st, cx, cy) => pip(st, cx, cy, m),
      gauge: (xr, y, isWorking, done, total) => gauge(xr, y, isWorking, done, total, m),
      foot: (W, H, _t, ctx) => foot(W, H, ctx, m),
    },
    idle: (x, y) => idle(x, y, m),
    warning: WARNINGS[m],
    cheer: (W, H, _font, _t, startAt) => (m === 'noir' ? noirCheer(W, H, startAt === undefined ? undefined : `calc(@@T${Math.round(startAt)}@@ + 0s)`) : cheer(W, H, m, startAt === undefined ? {} : { delay: `calc(@@T${Math.round(startAt)}@@ + 0s)` })),
    cred: { title: TITLES[m].cred, ranks, words: { cases: 'JOBS', long: 'LONG JOBS', all: 'THE FULL SET. MINT IN BOX.', badges }, badges, toast: l => credToast(l, m), card: (W, c) => credCard(W, c, m) },
    card: {
      draw: (W, task, isWorking, done, total, _t, _font, _frame, legends, steps) => deskCard(W, task, isWorking, done, total, legends, m, steps),
      alt: deskAlt,
    },
    legends: { title: m === 'book' ? 'OFF THE RECORD' : m === 'noir' ? 'DAILIES' : 'PRESS RELEASES', empty: m === 'noir' ? 'No dailies printed yet. A job of 3+ minutes gets one.' : 'No statements issued yet. A job of 3+ minutes gets one.', icon: '', alt: m === 'noir' ? 'Dailies' : 'Press releases', toast: task => (m === 'book' ? `Off the record: ${task}` : m === 'noir' ? '… 👍' : `Statement issued: ${task}`), hidden: true },
    log: { draw: (W, beats, pick) => dialCard(W, beats, pick, m), hasControls: true, alt: dialAlt },
    org: (W, root) => withTableAct(tableCard(W, root as BoysOrg, m), m),
    boot: BOOTS[m],
    bootDraw: W => bootLine(W, m),
    greeting: GREETINGS[m],
    words: m === 'book' ? SPIN_BOOK : m === 'gold' ? SPIN_GOLD : m === 'noir' ? SPIN_NOIR : SPIN_BRAND,
    tools: m === 'book' ? TOOLS_BOOK : m === 'gold' ? TOOLS_GOLD : TOOLS_BRAND,
    extras: boysExtras(m),
    shake: boysShake(m),
    paneReserve: BOYS_PANE_RESERVE,
  }
}
// The pieces the tests and the handoff reach for.
export { T }
