// Caliper: the theme entry. One skin, two faces: `calTheme('dark')` and `calTheme('light')`; the worn face picks the cast key
// `caliper` or `caliperlight` (the way Invincible picks its era). The band is the slim band in the theme's own hand; CALIBRATION
// is the level card, READOUT the task card with the LOG BOOK, TRACE the log and CREW the hierarchy. A classic is quiet: no roamer,
// no extras, no takeover, no shake.
import { CAL_CSS, calBandH, calChip, calFoot, calGauge, calIdle, calPal, calPill, calPip, calWarning, dial, jaws, pin, sansW } from './caliper'
import type { CalFace } from './caliper'
import { CAL_BOOT, CAL_CRED_WORDS, CAL_GREETING, CAL_TOOLS, CAL_WORDS, MARKS, bootLine, calRankOf, calToast, calibrationCard, orgCard, readoutAlt, readoutCard, traceAlt, traceCard } from './caliper-cards'
import type { ThemeEggs } from './themes'

// The setting (dark, light or auto) the CALIBRATION card prints in its header. The register sets it when the mode changes.
let MODE_WORD = 'auto'
export const setCalModeWord = (word: string): void => { MODE_WORD = word }

export const calTheme = (face: CalFace): ThemeEggs => {
  const P = calPal(face)
  return {
    face,
    ticker: () => '',
    css: CAL_CSS,
    readout: { w: 0, draw: () => '' },
    chip: (x, y, ctxPct) => calChip(x, y, ctxPct, P),
    slimBand: true,
    slim: {
      h: calBandH,
      sw: sansW,
      head: (x, y) => ({ svg: jaws(P, x, y - 10), w: 14 }),
      figure: ctx => dial(P, 37, 56, ctx?.party ? 100 : (ctx?.progress ?? 0), Boolean(ctx?.working) && !ctx?.party),
      crew: (x, y, color, live) => pin(P, x + 5, y + 9.5, color, Boolean(live)),
      pip: (st, cx, cy) => calPip(P, st, cx, cy),
      gauge: () => ({ svg: '', w: 0 }),
      tear: (x, y, w, pct, _t, ctx) => calGauge(P, x, y, w, pct, { working: ctx?.isWorking, party: ctx?.party, partyAt: ctx?.partyAt }),
      pill: (x, y, w, h, fill, opacity, stroke) => calPill(x, y, w, h, fill, opacity, stroke, P.line),
      foot: (W, H, _t, ctx) => calFoot(P, W, H, ctx),
      ownEdge: true,
    },
    idle: (x, y) => calIdle(P, x, y),
    warning: calWarning,
    cheer: () => '',
    cred: { title: 'CALIBRATION', ranks: calRankOf, words: CAL_CRED_WORDS, badges: MARKS, toast: calToast, card: (W, c) => calibrationCard(W, c, face, MODE_WORD) },
    card: {
      draw: (W, task, isWorking, done, total, _t, _font, _frame, legends, steps) => readoutCard(W, task, isWorking, done, total, legends, face, steps),
      alt: readoutAlt,
    },
    legends: { title: 'LOG BOOK', empty: 'No closed jobs yet. A job that runs 3+ minutes is logged here.', icon: '', alt: 'Log book', toast: task => `Logged: ${task}`, hidden: true },
    log: { draw: (W, beats, pick) => traceCard(W, beats, pick, face), hasControls: true, alt: traceAlt },
    org: (W, root) => orgCard(W, root, face),
    boot: CAL_BOOT,
    bootDraw: W => bootLine(W, face),
    greeting: CAL_GREETING,
    words: CAL_WORDS,
    tools: CAL_TOOLS,
  }
}
