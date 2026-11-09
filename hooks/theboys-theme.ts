// The Boys (fan homage): the theme entries. One skin, two modes, `boysTheme('brand')` ON BRAND and `boysTheme('book')` OFF BOOK
// (cast keys `boys` and `boys2`, as Invincible picks its era), plus the hidden SOLID GOLD skin, `boysTheme('gold')` (cast
// `solidgold`). The band is the slim band in the theme's own hand with the VNN crawl along its foot; Q-SCORE is the level card,
// CRISIS DESK the task card with the PRESS RELEASES, FOCUS GROUP the log and THE TABLE the hierarchy.
// The live numbers (APPROVAL, 7SPN, BREAKING, TURBO RUSH) are read from theboys-eggs.ts, which the register feeds.
import { BAND_H, BOOTS, CSS, PROPS, SCORE_W, WARNINGS, bootLine, chip, cheer, crew, ep, epW, episodeAt, figure, foot, gauge, idle, name, pal, pip, sansW, scoreboard, syringe, C, T, condW, r1 } from './theboys'
import type { Mode } from './theboys'
import { BADGES, TITLES, credCard, credToast, deskAlt, deskCard, dialAlt, dialCard, rankOf, tableCard } from './theboys-cards'
import type { BoysOrg } from './theboys-cards'
import { SPIN_BOOK, SPIN_BRAND, SPIN_GOLD, TOOLS_BOOK, TOOLS_BRAND, TOOLS_GOLD } from './theboys-eggs'
import type { ExtraArgs, ThemeEggs } from './themes'
import { pin } from './smooth'

export const GREETINGS: Record<Mode, string> = { brand: 'Welcome back. Smile for the cameras.', book: "Oi. Kettle's on.", gold: 'Thawed out and ready to roll.' }
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
  const label = to === 'gold' ? 'ROLL TAPE · SOLID GOLD' : 'WE APOLOGISE FOR THE INTERRUPTION'
  const sz = W < 500 ? 10 : 13
  return `<g class="tb-swap" pointer-events="none" style="${d}" data-egg="onbrand"><g class="tb-wipe" style="${d}"><rect width="${W}" height="${H}" rx="10" fill="#C9A13B"/><rect y="${r1(H / 2 - 14)}" width="${W}" height="28" fill="#0A1430"/>${C(W / 2, H / 2 + sz * 0.35, label, sz, '#F0D27A', 'text-anchor="middle" letter-spacing="2"')}</g></g>`
}
/** Is the swap still playing at `at`? */
export const swapLive = (since: number | undefined, at: number): since is number => since !== undefined && since > 0 && at >= since - 1000 && at < since + SWAP_MS

/** The scheduled and live layers: the swap, the 7SPN scoreboard on the band's task row. */
export const boysExtras = (m: Mode) => (o: ExtraArgs): string => {
  if (o.party) return ''
  const out: string[] = []
  if (swapLive(o.swapAt, o.at)) out.push(swapLayer(o.W, o.H, m, o.swapAt))
  if (o.surface === 'band') {
    // The 7SPN bug sits just left of the CONTEXT readouts (or the band's right edge when they are folded away).
    const rw = o.W < 1100 ? 62 : 100
    const xr = o.W >= 520 ? o.W - 20 - rw * 3 - 18 - 10 : o.W - 14
    out.push(scoreboard(xr - SCORE_W, 42, o.at, m))
  }
  return out.join('')
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
    cheer: (W, H, _font, _t, startAt) => cheer(W, H, m, startAt === undefined ? {} : { delay: `calc(@@T${Math.round(startAt)}@@ + 0s)` }),
    cred: { title: TITLES[m].cred, ranks, words: { cases: 'JOBS', long: 'LONG JOBS', all: 'THE FULL SET. MINT IN BOX.', badges }, badges, toast: l => credToast(l, m), card: (W, c) => credCard(W, c, m) },
    card: {
      draw: (W, task, isWorking, done, total, _t, _font, _frame, legends, steps) => deskCard(W, task, isWorking, done, total, legends, m, steps),
      alt: deskAlt,
    },
    legends: { title: m === 'book' ? 'OFF THE RECORD' : 'PRESS RELEASES', empty: 'No statements issued yet. A job of 3+ minutes gets one.', icon: '', alt: 'Press releases', toast: task => (m === 'book' ? `Off the record: ${task}` : `Statement issued: ${task}`), hidden: true },
    log: { draw: (W, beats, pick) => dialCard(W, beats, pick, m), hasControls: true, alt: dialAlt },
    org: (W, root) => tableCard(W, root as BoysOrg, m),
    boot: BOOTS[m],
    bootDraw: W => bootLine(W, m),
    greeting: GREETINGS[m],
    words: m === 'book' ? SPIN_BOOK : m === 'gold' ? SPIN_GOLD : SPIN_BRAND,
    tools: m === 'book' ? TOOLS_BOOK : m === 'gold' ? TOOLS_GOLD : TOOLS_BRAND,
    extras: boysExtras(m),
  }
}
// The pieces the tests and the handoff reach for.
export { T }
