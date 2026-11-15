// Caliper: the theme entry. One skin, two faces: `calTheme('dark')` and `calTheme('light')`; the worn face picks the cast key
// `caliper` or `caliperlight` (the way Invincible picks its era). The band is the slim band in the theme's own hand; CALIBRATION
// is the level card, READOUT the task card with the LOG BOOK, TRACE the log and CREW the hierarchy. A classic is quiet: no roamer,
// no extras, no takeover, no shake.
import { CAL_CSS, calBandH, calChip, calFoot, calGauge, calIdle, calPal, calPill, calPip, calWarning, dial, jaws, pin, sansW } from './caliper'
import type { CalFace, Was } from './caliper'
import { registerPlay } from './stage/replay'
import { CAL_BOOT, CAL_CRED_WORDS, CAL_GREETING, CAL_TOOLS, CAL_WORDS, MARKS, bootLine, calRankOf, calToast, calibrationCard, orgCard, readoutAlt, readoutCard, traceAlt, traceCard } from './caliper-cards'
import type { ThemeEggs } from './themes'

// The setting (dark, light or auto) the CALIBRATION card prints in its header. The register sets it when the mode changes.
let MODE_WORD = 'auto'
export const setCalModeWord = (word: string): void => { MODE_WORD = word }

// What the instrument last read, so a change can be drawn as one (the needle's settle, the fine scale's slide, the edge's and
// the pill's colour): each draw is a new image, so the old value has to be remembered here. A change stays "fresh" for 3 s,
// pinned to the first draw that saw it; after that the plain resting markup. `CAL_NOW` is the last clock a band draw carried
// (the pane's cards are drawn with no clock of their own).
const SEEN = new Map<string, { v: unknown; was?: Was<unknown> }>()
let CAL_NOW = 0
export const CAL_FRESH_MS = 3000
export const calSeen = <T>(key: string, v: T, at: number): Was<T> | undefined => {
  const s = SEEN.get(key)
  if (!s) { SEEN.set(key, { v }); return undefined }
  if (s.v !== v) { const was = { from: s.v, at }; SEEN.set(key, { v, was }); return was as Was<T> }
  return s.was && at >= s.was.at && at - s.was.at < CAL_FRESH_MS ? (s.was as Was<T>) : undefined
}
/** Forgets what was read (tests). */
export const calForget = (): void => { SEEN.clear(); CAL_NOW = 0; ZERO_AT = undefined; DONE_AT = undefined }
const now = (at?: number): number => { if (at !== undefined && at > CAL_NOW) CAL_NOW = at; return CAL_NOW }
// `/missioncontrol play zero` (the vernier reads zero under the cursor) and `play settle` (the needle swings up from zero).
let ZERO_AT: number | undefined
let DONE_AT: number | undefined
const zeroNow = (at: number): number | undefined => (ZERO_AT !== undefined && at >= ZERO_AT - 1000 && at < ZERO_AT + CAL_FRESH_MS ? ZERO_AT : undefined)
registerPlay('caliper', { name: 'zero', what: 'the vernier reads zero', run: at => { ZERO_AT = at } })
registerPlay('caliper', { name: 'settle', what: 'the needle swings and settles', run: at => { for (const k of ['needle-band', 'needle-pane']) SEEN.set(k, { v: SEEN.get(k)?.v, was: { from: 0, at } }) } })

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
      figure: ctx => {
        const pct = ctx?.party ? 100 : (ctx?.progress ?? 0)
        const was = calSeen('needle-band', Math.round(pct), now(ctx?.at))
        return dial(P, 37, 56, pct, Boolean(ctx?.working) && !ctx?.party, { bezel: true, id: 'calbzb', ...(was ? { was } : {}) })
      },
      crew: (x, y, color, live) => pin(P, x + 5, y + 9.5, color, Boolean(live)),
      pip: (st, cx, cy) => calPip(P, st, cx, cy),
      gauge: () => ({ svg: '', w: 0 }),
      tear: (x, y, w, pct, _t, ctx) => {
        const at = now(ctx?.at)
        if (ctx?.party && ctx.partyAt !== undefined) DONE_AT = ctx.partyAt
        const was = ctx?.party ? undefined : calSeen('ruler-band', Math.round(pct), at)
        const zeroAt = zeroNow(at)
        return calGauge(P, x, y, w, pct, { working: ctx?.isWorking, party: ctx?.party, partyAt: ctx?.partyAt, ...(was ? { was } : {}), ...(zeroAt !== undefined ? { zeroAt } : {}) })
      },
      pill: (x, y, w, h, fill, opacity, stroke) => {
        const was = stroke ? undefined : calSeen(`pill-${face}`, fill, CAL_NOW)
        return calPill(x, y, w, h, fill, opacity, stroke, P.line, was)
      },
      foot: (W, H, _t, ctx) => {
        const edge = ctx.party ? P.done : ctx.isWorking ? P.accent : P.hair
        return calFoot(P, W, H, ctx, calSeen(`edge-${face}`, edge, now(ctx.at)))
      },
      ownEdge: true,
    },
    idle: (x, y) => calIdle(P, x, y),
    warning: calWarning,
    cheer: () => '',
    cred: { title: 'CALIBRATION', ranks: calRankOf, words: CAL_CRED_WORDS, badges: MARKS, toast: calToast, card: (W, c) => calibrationCard(W, c, face, MODE_WORD) },
    card: {
      draw: (W, task, isWorking, done, total, _t, _font, _frame, legends, steps) => {
        const pct = total > 0 ? Math.round((Math.min(done, total) / total) * 100) : 0
        const dialWas = calSeen('needle-pane', pct, CAL_NOW)
        const rulerWas = calSeen('ruler-pane', pct, CAL_NOW)
        const isDone = !isWorking && total > 0 && done >= total
        const zeroAt = isDone && DONE_AT !== undefined && CAL_NOW - DONE_AT < CAL_FRESH_MS ? DONE_AT : zeroNow(CAL_NOW)
        return readoutCard(W, task, isWorking, done, total, legends, face, steps, { ...(dialWas ? { dialWas } : {}), ...(rulerWas ? { rulerWas } : {}), ...(zeroAt !== undefined ? { zeroAt } : {}) })
      },
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
    // The skin switch, Caliper's way: no shards, a thin wipe, a hairline in the accent (it shows only the new face's colours).
    switchFlavour: { shards: 0, ms: 600, veil: 0.45 },
  }
}
