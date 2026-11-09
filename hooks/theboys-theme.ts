// The Boys (fan homage): the theme entries. One skin, two modes, `boysTheme('brand')` ON BRAND and `boysTheme('book')` OFF BOOK
// (cast keys `boys` and `boys2`, as Invincible picks its era), plus the hidden SOLID GOLD skin, `boysTheme('gold')` (cast
// `solidgold`). The band is the slim band in the theme's own hand with the VNN crawl along its foot; Q-SCORE is the level card,
// CRISIS DESK the task card with the PRESS RELEASES, FOCUS GROUP the log and THE TABLE the hierarchy.
// The live numbers (APPROVAL, 7SPN, BREAKING, TURBO RUSH) are read from theboys-eggs.ts, which the register feeds.
import { BAND_H, BOOTS, CSS, PROPS, SCORE_W, WARNINGS, bootLine, chip, cheer, crew, ep, epW, episodeAt, figure, foot, gauge, idle, name, pal, pip, sansW, scoreboard, syringe, C, T, condW, r1 } from './theboys'
import type { Mode } from './theboys'
import { BADGES, TITLES, credCard, credToast, deskAlt, deskCard, dialAlt, dialCard, rankOf, tableCard } from './theboys-cards'
import type { BoysOrg } from './theboys-cards'
import { SPIN_BOOK, SPIN_BRAND, SPIN_GOLD, SPIN_NOIR, fxFromEvent, TOOLS_BOOK, TOOLS_BRAND, TOOLS_GOLD, actMs, autoLookAtMe, boysFx, drawAt, inFlight, noteDraw, spinDue } from './theboys-eggs'
import { actOn, actShake, speedSmear, titleSpin } from './theboys-acts'
import { AMBUSH_KINDS, IDLE_NAP_MS, PREMIERE_FACE_MS, ahead, idleFor, isNight, lastWorking, longestCall, moon, noirCheer, noteAmbush, noteBusy, noteWorking, premiereFace, stageAt, terrorNap } from './theboys-show'
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

/** The typed act playing at `at` (its kind and start), or undefined. */
export const actAt = (at: number): { kind: string; at: number } | undefined => {
  const fx = boysFx()
  return fx && at >= fx.at - 1000 && at < fx.at + actMs(fx.kind) ? fx : undefined
}
/** Characters the pane keeps free while a job works for the typed acts (drawn between `<!--dl-->` markers, so the layout never
 *  flips as they come and go). Phase 3's AMBUSH raises it. */
export const BOYS_PANE_RESERVE = 100_000
/** The scheduled and live layers: the swap, the 7SPN scoreboard on the band's task row, the SPEED SMEAR and the title SPIN, LOOK
 *  AT ME the first time the context passes 95%, and the typed act now playing (on the band, and on its pane card). */
export const boysExtras = (m: Mode) => (o: ExtraArgs): string => {
  if (o.party) return ''
  noteDraw(o.at)
  const out: string[] = []
  const swapping = swapLive(o.swapAt, o.at)
  if (swapping) out.push(swapLayer(o.W, o.H, m, o.swapAt))
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
    noteWorking(o.working)
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
    let s = actOn(st.kind, { W: o.W, H: o.H, m, at: st.startAt, on, ...(o.task ? { task: o.task } : {}), ...(o.titleW ? { titleW: o.titleW } : {}) })
    // Scheduled pieces are marked `show-` (typed and event acts `act-`), and stay hidden until their start.
    if (s && st.src !== 'fx') s = ahead(s.replace('data-egg="act-', 'data-egg="show-'), st.startAt)
    if (s) out.push(on === 'band' ? s : `<!--dl-->${s}<!--/dl-->`)
  }
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
      tear: (x, y, w, pct, _t, ctx) => syringe(x, y, w, pct, m, { near: (ctx?.ctxPct ?? 0) >= 95, working: ctx?.isWorking }),
      ownEdge: true,
      cache: { fill: m === 'gold' ? P.a : m === 'book' ? P.manila : PROPS.vblue, core: m === 'brand' ? '#BFE9FF' : undefined },
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
    legends: { title: m === 'book' ? 'OFF THE RECORD' : 'PRESS RELEASES', empty: 'No statements issued yet. A job of 3+ minutes gets one.', icon: '', alt: 'Press releases', toast: task => (m === 'book' ? `Off the record: ${task}` : `Statement issued: ${task}`), hidden: true },
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
