// The Boys: the egg registry and the live state its signature mechanics read. Three parts:
//   1. STATE: the APPROVAL RATING (M1), the 7SPN scoreboard (M5), the VNN BREAKING lower-third (M3), TURBO RUSH (M10), the failed
//      calls the FOCUS GROUP dips at, and the typed act now playing. register.tsx feeds it from the tool calls; the drawers read it.
//      Every reading is a pure function of the state and the clock, so a redraw at the same moment draws the same thing.
//   2. HOOKS for the later phases: `vnnBreak` (any egg may hijack the crawl), `boysEvent` + `onBoysEvent` (the engine events,
//      E1-E24 of the bible), the typed-trigger table `TRIGGERS` (T1-T60; phase 1 acts on the mode switch and SOLID GOLD only), and
//      the replay registry `REPLAYS`.
//   3. DATA: the 104 VNN headlines, the 48 spinner verbs, the 34 toasts and the PR SPIN phrasebook. All lines are our own, or a
//      short attributed quote under 15 words. No lyrics.
// No network, no files: memory only, reset per session by `resetBoys`.
/* eslint-disable @typescript-eslint/no-explicit-any */

export type BoysMode = 'brand' | 'book' | 'gold' | 'noir'

// ---------------------------------------------------------------- 1. state
type Score = { pass: number; fail: number; running: boolean; at: number; endAt: number }
type Break = { line: string; at: number; kind: string }
type State = {
  /** The approval number at `approvalAt`, before the decay toward 50. */
  approval: number
  approvalSince: number
  score: Score | null
  breaking: Break | null
  /** Tools in flight (the band counts them) and since when there were 4 or more. */
  inFlight: number
  turboSince: number
  /** When tool calls failed (the FOCUS GROUP dips there); the newest 40. */
  failedAt: number[]
  /** The typed act now playing (kind and start), as Invincible's fx; `fxEvent` when an event egg started it (a typed egg may cut it). */
  fx: { kind: string; at: number } | undefined
  fxEvent: boolean
  /** The run of failed test runs behind the toasts (E1-E3). */
  testFails: number
  lastToast: Record<string, number>
  /** When each typed egg last started (its cooldown), the APPROVAL boost a typed egg holds (T46/T47), T19's 10 s of TURBO RUSH,
   *  the title SPIN after a failed run, LOOK AT ME's one auto play, and the newest draw's clock. */
  lastAct: Record<string, number>
  boost: { delta: number; at: number; until: number } | null
  turboUntil: number
  spinAt: number
  lookedAt: boolean
  drawAt: number
  /** Tool calls that failed in a row (3 = the CRACKED MIRROR, E18). */
  errRun: number
  /** When a failing test run last turned green (E3's regen plays for that run). */
  fixedAt: number
}
const blank = (): State => ({ approval: 50, approvalSince: 0, score: null, breaking: null, inFlight: 0, turboSince: 0, failedAt: [], fx: undefined, fxEvent: false, testFails: 0, lastToast: {}, lastAct: {}, boost: null, turboUntil: 0, spinAt: 0, lookedAt: false, drawAt: 0, errRun: 0, fixedAt: 0 })
let S: State = blank()
/** A fresh session (and every test) starts at 50/50 with nothing on the wire. */
export const resetBoys = (): void => { S = blank() }
/** A copy for tests and the handoff's debugging. */
export const boysState = (): Readonly<State> => ({ ...S, failedAt: [...S.failedAt], lastToast: { ...S.lastToast }, lastAct: { ...S.lastAct } })

// --- M1 APPROVAL RATING: starts 50/50; a passing test run +3, a failing one -4, a clean run +5 more, a tool error -2, a job done
// +5; it decays 1 point a minute back toward 50. Clamped 0..100. The band's face follows it (theboys.ts faceOf).
export const APPROVAL = { pass: 3, fail: -4, clean: 5, error: -2, job: 5, decayPerMin: 1 } as const
/** Is a scheduled act on stage (THE AMBUSH, a set piece)? An event egg never cuts one; theboys-show.ts sets it. */
let BUSY: (at: number) => boolean = () => false
export const setStageBusy = (fn: (at: number) => boolean): void => { BUSY = fn }
const stageBusy = (at: number): boolean => { try { return BUSY(at) } catch { return false } }
/** A clock-driven nudge on top (THE AMBUSH: -8 while Homelander is on screen, +8 when he flies off); theboys-show.ts sets it. */
let MOD: (at: number) => number = () => 0
export const setApprovalMod = (fn: (at: number) => number): void => { MOD = fn }
const modAt = (at: number): number => { try { return MOD(at) } catch { return 0 } }
export const approvalAt = (at: number): number => {
  const mins = S.approvalSince > 0 ? Math.max(0, (at - S.approvalSince) / 60_000) : 0
  const d = Math.min(Math.abs(S.approval - 50), mins * APPROVAL.decayPerMin)
  const b = S.boost && at >= S.boost.at - 1000 && at < S.boost.until ? S.boost.delta : 0
  return Math.max(0, Math.min(100, Math.round((S.approval > 50 ? S.approval - d : S.approval + d) + b + modAt(at))))
}
/** The approval as last set (no decay): for drawers without a clock (THE TABLE's buzz). */
export const lastApproval = (): number => S.approval
export const bumpApproval = (delta: number, at: number): number => {
  const b = S.boost && at >= S.boost.at - 1000 && at < S.boost.until ? S.boost.delta : 0
  S.approval = Math.max(0, Math.min(100, approvalAt(at) - b - modAt(at) + delta))
  S.approvalSince = at
  return S.approval
}
/** The test pass rate of a run, 0..1 (undefined with no counts). */
export const passRate = (pass: number, fail: number): number | undefined => (pass + fail > 0 ? pass / (pass + fail) : undefined)
/** A finished test run moves the approval by its pass rate: a passing run +3 (+5 more when nothing failed); a failing run -4,
 *  softened by its pass rate to -2 at best (80% green: -2; all red: -4), so a failure always dips it. */
export const approvalForRun = (pass: number, fail: number, failed: boolean): number => {
  const r = passRate(pass, fail)
  if (!failed && fail === 0) return r === undefined ? APPROVAL.pass : APPROVAL.pass + APPROVAL.clean
  if (!failed) return APPROVAL.pass
  return Math.min(-2, APPROVAL.fail + Math.round(2 * (r ?? 0)))
}

// --- M5 7SPN scoreboard: shown while a test command runs and for SCORE_HOLD_MS after.
export const SCORE_HOLD_MS = 20_000
/** Reads "N passed" / "N failed" (jest, vitest, pytest, cargo, go, the claude test runner's "✓ n / ✗ n") from a tool result. */
export const parseCounts = (text: string): { pass: number; fail: number } | undefined => {
  const t = text.slice(-20_000)
  const num = (re: RegExp): number | undefined => {
    let last: number | undefined
    for (const m of t.matchAll(re)) last = Number(m[1])
    return last
  }
  const pass = num(/(\d+)\s+(?:passed|passing|pass\b|ok\b)/gi) ?? num(/✓\s*(\d+)/g)
  const fail = num(/(\d+)\s+(?:failed|failing|fail\b|failures?)/gi) ?? num(/✗\s*(\d+)/g)
  if (pass === undefined && fail === undefined) return undefined
  return { pass: pass ?? 0, fail: fail ?? 0 }
}
export const scoreStart = (at: number): void => { S.score = { pass: S.score?.running ? S.score.pass : 0, fail: S.score?.running ? S.score.fail : 0, running: true, at, endAt: 0 } }
export const scoreEnd = (pass: number, fail: number, at: number): void => { S.score = { pass, fail, running: false, at: S.score?.at ?? at, endAt: at } }
/** A run that never reported (cancelled, denied): the LIVE board goes away instead of waiting out its 30 minutes. */
export const scoreStop = (): void => { if (S.score?.running) S.score = null }
export const scoreAt = (at: number): Score | null => {
  const sc = S.score
  if (!sc) return null
  if (sc.running) return at - sc.at < 30 * 60_000 ? sc : null
  return at >= sc.endAt - 1000 && at < sc.endAt + SCORE_HOLD_MS ? sc : null
}

// --- M3 VNN BREAKING: any egg may hijack the crawl for BREAK_MS with a line of its own. Later phases call this.
export const BREAK_MS = 6_000
export const vnnBreak = (line: string, at: number, kind = 'event'): void => { S.breaking = { line: line.slice(0, 90), at, kind } }
export const breakingAt = (at: number): Break | null => (S.breaking && at >= S.breaking.at - 1000 && at < S.breaking.at + BREAK_MS ? S.breaking : null)

// --- M10 TURBO RUSH: 4+ tools in flight.
export const setInFlight = (n: number, at: number): void => {
  if (n >= 4 && S.inFlight < 4) S.turboSince = at
  if (n < 4) S.turboSince = 0
  S.inFlight = n
}
export const turboAt = (at: number): boolean => (S.inFlight >= 4 && S.turboSince > 0) || (at >= S.turboUntil - actMs('turbo') - 1000 && at < S.turboUntil)
/** How many agents are in flight (the SPEED SMEAR's lines follow it). */
export const inFlight = (): number => S.inFlight

// --- the FOCUS GROUP's dips: the times tool calls failed.
export const noteFailed = (at: number): void => { S.failedAt = [...S.failedAt, at].slice(-40) }
export const failedNear = (at: number, within = 2_000): boolean => S.failedAt.some(t => Math.abs(t - at) <= within)

// --- the typed act now playing (the band's and the pane's extras read it).
export const setBoysFx = (kind: string, at: number, fromEvent = false): void => { S.fx = { kind, at }; S.fxEvent = fromEvent }
export const boysFx = (): { kind: string; at: number } | undefined => S.fx
/** Did an event egg start the act now playing (a typed egg, or a newer event, may cut it)? */
export const fxFromEvent = (): boolean => S.fxEvent

/** A toast at most once per its gap (ms): true when it may show now, and the time is noted. */
export const toastOk = (key: string, at: number, gapMs: number): boolean => {
  if (at - (S.lastToast[key] ?? -Infinity) < gapMs) return false
  S.lastToast[key] = at
  return true
}

// ---------------------------------------------------------------- 2. hooks for the later phases
/** The engine events the bible's E1-E24 hang on. register.tsx raises the ones it sees; phase 3 subscribes with `onBoysEvent`. */
export type BoysEvent =
  | 'test-start' | 'test-fail' | 'test-pass' | 'test-fixed' | 'test-clean' | 'tool-error' | 'errors3' | 'force-push' | 'cancel'
  | 'compact' | 'permission' | 'plan' | 'resume' | 'ctx85' | 'ctx95' | 'long-job' | 'job-done' | 'turbo' | 'idle10' | 'idle20'
  | 'cost1' | 'cost5' | 'cost20' | 'agent-spawn' | 'agent-done' | 'new-file' | 'lint-fixed' | 'net-error' | 'cap' | 'midnight'
export type BoysEventArgs = { at: number; mode: BoysMode; tool?: string; text?: string; pass?: number; fail?: number }
export type BoysAct = { toast?: string; breaking?: string; fx?: string; approval?: number }
const LISTENERS = new Map<BoysEvent, ((a: BoysEventArgs) => BoysAct | void)[]>()
/** Phase 3: subscribe an egg to an engine event; what it returns is acted on (a toast, a BREAKING line, an act, an approval move). */
export const onBoysEvent = (ev: BoysEvent, fn: (a: BoysEventArgs) => BoysAct | void): (() => void) => {
  const list = LISTENERS.get(ev) ?? []
  list.push(fn)
  LISTENERS.set(ev, list)
  return () => LISTENERS.set(ev, (LISTENERS.get(ev) ?? []).filter(f => f !== fn))
}
/** The phase-1 reactions (the signature mechanics), then every subscriber's. Returns the toasts to show, in order. */
export const boysEvent = (ev: BoysEvent, a: BoysEventArgs): string[] => {
  const out: BoysAct[] = [...core(ev, a)]
  for (const fn of LISTENERS.get(ev) ?? []) {
    try {
      const r = fn(a)
      if (r) out.push(r)
    } catch {
      // An egg never breaks the band.
    }
  }
  const toasts: string[] = []
  for (const r of out) {
    if (r.approval) bumpApproval(r.approval, a.at)
    if (r.breaking) vnnBreak(r.breaking, a.at, ev)
    if (r.fx && (!actLive(a.at) || S.fxEvent) && !stageBusy(a.at)) setBoysFx(r.fx, a.at, true)
    if (r.toast) toasts.push(r.toast)
  }
  return toasts
}
const core = (ev: BoysEvent, a: BoysEventArgs): BoysAct[] => {
  const book = a.mode === 'book'
  const gold = a.mode === 'gold'
  switch (ev) {
    case 'test-start':
      scoreStart(a.at)
      return []
    case 'test-fail': {
      scoreEnd(a.pass ?? 0, a.fail ?? 1, a.at)
      S.testFails++
      S.spinAt = a.at
      const acts: BoysAct[] = [{ approval: approvalForRun(a.pass ?? 0, a.fail ?? 1, true), breaking: gold ? 'Tracking error on tonight’s tape. Please stand by.' : book ? 'THE WIRE: it failed. Obviously.' : 'Vought denies "fail" footage' }]
      if (S.testFails >= 2 && toastOk('diabolical', a.at, 3_600_000)) acts.push({ toast: gold ? 'Not my finest hour.' : 'Diabolical.' })
      return acts
    }
    case 'test-pass': {
      const was = S.testFails
      scoreEnd(a.pass ?? 0, a.fail ?? 0, a.at)
      S.testFails = 0
      const clean = (a.fail ?? 0) === 0
      const acts: BoysAct[] = [{ approval: approvalForRun(a.pass ?? 0, a.fail ?? 0, false) }]
      if (was > 0) S.fixedAt = a.at
      if (was > 0 && toastOk('fixed', a.at, 600_000)) acts.push({ toast: gold ? 'Shield’s up.' : 'Somebody up there likes us, mate.' })
      else if (clean && (a.pass ?? 0) > 0 && toastOk('clean', a.at, 600_000)) acts.push({ toast: gold ? 'Hit the mark.' : book ? 'Not bad, Hughie.' : 'It was perfect.' })
      return acts
    }
    case 'tool-error':
      noteFailed(a.at)
      S.errRun++
      return [{ approval: APPROVAL.error }]
    case 'force-push':
      return [{ breaking: book ? 'THE WIRE: history rewritten. Again.' : 'History rewritten; Vought calls it "a fresh start"', ...(toastOk('force', a.at, 180_000) ? { toast: gold ? 'Payback time.' : book ? 'Shock and awe.' : '“It’s an absolute wonder to me that you’ve all managed to live this long.” — Edgar' } : {}) }]
    case 'job-done':
      return [{ approval: APPROVAL.job }]
    case 'turbo':
      return [{ fx: 'turbo' }]
    default:
      return []
  }
}

/** A tool call that worked ends the run of errors. Returns how many failed in a row (after a tool-error: 3 = E18). */
export const toolOk = (): void => { S.errRun = 0 }
/** The failed test runs in a row, and when a failing run last turned green. */
export const testFails = (): number => S.testFails
export const fixedAt = (): number => S.fixedAt
export const errRun = (): number => S.errRun

// --- VOUGHT PR SPIN (M2): a failed tool's line, rewritten into press-speak before it shows. OFF BOOK shows the real line, LEAKED.
export const SPIN: [RegExp, string][] = [
  [/permission denied|not permitted|\bdenied\b|EACCES/i, 'legal is reviewing it'],
  [/not found|no such file|ENOENT|cannot find|does not exist/i, 'an exclusive, not yet released'],
  [/time(?:d)? ?out|ETIMEDOUT|took too long/i, 'an extended engagement window'],
  [/crash(?:ed)?|segfault|panic|killed|exit code 137/i, 'an unscheduled pause'],
  [/rejected|refused|declined/i, 'held for a stronger launch'],
  [/fail(?:ed|ure|ing)?/i, 'being reimagined'],
  [/error|exception|traceback/i, 'a learning moment'],
]
/** The spun line: the first phrase that matches, or the house line. Never longer than 90 characters. */
export const spin = (tool: string, text: string): string => {
  const hit = SPIN.find(([re]) => re.test(text))
  const verb = hit ? hit[1] : 'a valued part of our journey'
  return `VOUGHT PR · ${tool}: ${verb}.`.slice(0, 90)
}
/** The toast for a failed tool call, in the worn mode: spun (ON BRAND), leaked (OFF BOOK), a tape note (SOLID GOLD). */
export const prToast = (tool: string, text: string, mode: BoysMode): string => {
  const real = String(text || 'it did not work').replace(/\s+/g, ' ').trim().slice(0, 70)
  if (mode === 'book') return `LEAKED · ${tool}: ${real}`
  if (mode === 'gold') return `TAPE JAMMED · ${tool}: ${real}`
  if (mode === 'noir') return '…'
  return spin(tool, real)
}

// --- the typed-trigger table (whole phrase, any case; the prompt goes on unchanged). Every row acts: `kind` is the act the theme
// draws on the band AND the pane (theboys-acts.ts), `ms` how long it plays (the bible's seconds), and a row may add a toast, a
// BREAKING lower-third and an APPROVAL move. Common words never fire alone: phrases, or a prompt that is only the word.
export type Trigger = { id: string; re: RegExp; kind: string; where: 'B' | 'P' | 'BP'; on?: boolean; modes?: BoysMode[]; spoiler?: boolean; ms?: number; toast?: Partial<Record<BoysMode, string>>; breaking?: Partial<Record<BoysMode, string>>; boost?: number }
const ALL3 = (t: string): Partial<Record<BoysMode, string>> => ({ brand: t, book: t, gold: t })
export const TRIGGERS: Trigger[] = [
  { id: 'T1', re: /\boh,?\s+diabolical\b|^\s*diabolical[.!]*\s*$/i, kind: 'diabolical', where: 'BP', on: true, ms: 2_500 },
  { id: 'T2', re: /\bashley,?\s+look\s+at\s+me\b/i, kind: 'lookatme', where: 'BP', on: true, ms: 2_500 },
  { id: 'T3', re: /\bshock\s+(?:and|&)\s+awe,?\s+my\s+son\b/i, kind: 'hijack', where: 'BP', on: true, modes: ['brand'] },
  { id: 'T4', re: /\bnever\s+meet\s+your\s+heroes\b/i, kind: 'onbrand', where: 'BP', on: true, modes: ['book'] },
  { id: 'T5', re: /^\W*i\s+can\s+do\s+whatever\s+i\s+want\W*$|\bi\s+can\s+do\s+whatever\s+i\s+want!/i, kind: 'whatever', where: 'BP', on: true, ms: 1_500 },
  { id: 'T6', re: /\bpinocchio\s+is\s+stay(?:in'?|ing|in’)\s+put\b/i, kind: 'whale', where: 'BP', on: true, ms: 4_500, breaking: { brand: 'Speedboat meets whale; Vought cites a "marine misunderstanding"', book: 'THE WIRE: one boat, one whale, no comment', gold: 'Tonight: a whale of a tale' } },
  { id: 'T7', re: /\btimothy\s+the\s+octopus\b/i, kind: 'timothy', where: 'BP', on: true, ms: 3_000, breaking: { brand: 'Vought Classic remembers Timothy. Gone, never forgotten', book: 'THE WIRE: the octopus deserved better', gold: 'In memoriam: Timothy' } },
  { id: 'T8', re: /\bvought\s+on\s+ice\b/i, kind: 'ice', where: 'BP', on: true, ms: 4_000 },
  { id: 'T9', re: /\blaser\s+baby\b/i, kind: 'laserbaby', where: 'BP', on: true, ms: 2_500 },
  { id: 'T10', re: /\bmon\s+c(?:œ|oe|o)ur\b/i, kind: 'dance', where: 'BP', on: true, ms: 3_500 },
  { id: 'T11', re: /\bbuster\s+beaver\b/i, kind: 'beaver', where: 'BP', on: true, ms: 3_500 },
  { id: 'T12', re: /\bseen\s+the\s+memes\b/i, kind: 'memes', where: 'BP', on: true, ms: 2_000 },
  { id: 'T13', re: /\bbilly\s+joel\b/i, kind: 'joel', where: 'BP', on: true, ms: 4_000 },
  { id: 'T14', re: /\bsolidgold\b|\bsoldier\s+boy\b/i, kind: 'solidgold', where: 'BP', on: true, modes: ['brand', 'book'] },
  { id: 'T15', re: /\bback\s+on\s+ice\b/i, kind: 'backonice', where: 'BP', on: true, modes: ['gold'] },
  { id: 'T16', re: /\btall\s+glass\s+of\s+milk\b/i, kind: 'milk', where: 'BP', on: true, ms: 3_000 },
  { id: 'T17', re: /\bcompound\s+v\b/i, kind: 'compoundv', where: 'BP', on: true, ms: 2_000 },
  { id: 'T18', re: /\bhughie,?\s+blink\b/i, kind: 'blink', where: 'BP', on: true, ms: 2_500 },
  { id: 'T19', re: /\bturbo\s+rush\b/i, kind: 'turbo', where: 'BP', on: true, ms: 10_000 },
  { id: 'T20', re: /\btraining\s+a-?train\b/i, kind: 'training', where: 'BP', on: true, ms: 3_000 },
  { id: 'T21', re: /\bbrave\s+maeve\b/i, kind: 'bravemaeve', where: 'BP', on: true, ms: 5_000, breaking: { brand: 'Brave Maeve™ line expands; sincerity sold separately', book: 'THE WIRE: lasagna as allyship. Really.', gold: 'Brave Maeve™: limited time' } },
  { id: 'T22', re: /\bseven\s+on\s+7\b/i, kind: 'sevenon7', where: 'BP', on: true, ms: 6_000 },
  { id: 'T23', re: /\bdawn\s+of\s+the\s+seven\b/i, kind: 'premiere', where: 'BP', on: true, ms: 6_000 },
  { id: 'T24', re: /\bfun\s+cut\b/i, kind: 'funcut', where: 'BP', on: true, ms: 8_000 },
  { id: 'T25', re: /\binvisible\s+force\b/i, kind: 'invisible', where: 'BP', on: true, ms: 4_000 },
  { id: 'T26', re: /\bthis\s+means\s+noir\b/i, kind: 'noirmode', where: 'BP', on: true, ms: 3_000, toast: ALL3('…') },
  { id: 'T27', re: /^\W*vivant\W*$|\bvivant!|\bcirque\s+de\s+vought\b/i, kind: 'vivant', where: 'BP', on: true, ms: 4_000 },
  { id: 'T28', re: /\bnot\s+without\s+my\s+dolphin\b/i, kind: 'dolphin', where: 'BP', on: true, ms: 3_500 },
  { id: 'T29', re: /\bambrosius\b/i, kind: 'ambrosius', where: 'BP', on: true, ms: 3_000 },
  { id: 'T30', re: /\bamerican\s+hero\b/i, kind: 'americanhero', where: 'BP', on: true, ms: 5_000 },
  { id: 'T31', re: /\brock\s+my\s+kiss\b|^\W*supersonic\W*$|^\W*super-?sweet\W*$/i, kind: 'rockmykiss', where: 'BP', on: true, ms: 3_500 },
  { id: 'T32', re: /\bsmartest\s+person\s+(?:on\s+the\s+planet|in\s+the\s+world)\b|^\W*smartest\s+person\W*$/i, kind: 'knight', where: 'BP', on: true, ms: 3_000, toast: { brand: 'Smartest person.', book: 'Smartest person. Allegedly.', gold: 'Smartest person.' } },
  { id: 'T33', re: /\bwakey,?\s*-?\s*wakey\b/i, kind: 'wakey', where: 'BP', on: true, ms: 1_500 },
  { id: 'T34', re: /^\W*class\s+dismissed\W*$/i, kind: 'dismissed', where: 'BP', on: true, ms: 2_000 },
  { id: 'T35', re: /\byou\s+guys\s+are\s+the\s+real\s+heroes\b|^\W*the\s+real\s+heroes\W*$/i, kind: 'realheroes', where: 'BP', on: true, ms: 3_000 },
  { id: 'T36', re: /\b(?:you'?re|you’re|you\s+are|he'?s|he’s|he\s+is)\s+bad\s+product\b|^\W*bad\s+product\W*$/i, kind: 'badproduct', where: 'BP', on: true, ms: 2_000 },
  { id: 'T37', re: /\breally,?\s+(?:is\s+)?a\s+pharmaceutical\s+company\b|^\W*pharmaceutical\s+company\W*$/i, kind: 'pharma', where: 'BP', on: true, ms: 5_000, breaking: { brand: 'Edgar: Vought is, really, a pharmaceutical company', book: 'THE WIRE: follow the pharmacy', gold: 'Sponsored by Vought Pharmaceuticals' } },
  { id: 'T38', re: /\bstorage\s+boy\b/i, kind: 'storage', where: 'BP', on: true, ms: 4_000 },
  { id: 'T39', re: /\bred\s+scare\b|\bvought\s+rising\b/i, kind: 'redscare', where: 'BP', on: true, ms: 5_000 },
  { id: 'T40', re: /\bgodolkin\b/i, kind: 'godolkin', where: 'BP', on: true, ms: 4_000 },
  { id: 'T41', re: /^\W*little\s+cricket\W*$/i, kind: 'cricket', where: 'BP', on: true, ms: 1_500 },
  { id: 'T42', re: /\bmonster\s+club\b/i, kind: 'puppets', where: 'BP', on: true, ms: 4_000 },
  { id: 'T43', re: /\bv52\s+expo\b/i, kind: 'expo', where: 'BP', on: true, ms: 8_000 },
  { id: 'T44', re: /\bgood\s+boy,?\s+terror\b/i, kind: 'terror', where: 'BP', on: true, ms: 4_000 },
  { id: 'T45', re: /^\W*full\s+roster\W*$/i, kind: 'fullroster', where: 'BP', on: true, ms: 2_000 },
  { id: 'T46', re: /\bhometeamers\b/i, kind: 'hometeamers', where: 'BP', on: true, ms: 5_000, boost: 10 },
  { id: 'T47', re: /\bstarlighters\b/i, kind: 'starlighters', where: 'BP', on: true, ms: 5_000, boost: -10 },
  { id: 'T48', re: /\bsaving\s+america\b/i, kind: 'savingamerica', where: 'BP', on: true, ms: 3_000 },
  { id: 'T49', re: /\bvought\s+for\s+tots\b/i, kind: 'tots', where: 'BP', on: true, ms: 3_000 },
  { id: 'T50', re: /\bplanet\s+vought\b/i, kind: 'planetvought', where: 'BP', on: true, ms: 4_000 },
  { id: 'T51', re: /\bit(?:'|’)?s\s+what\s+clara\s+would\s+have\s+wanted\b/i, kind: 'clara', where: 'BP', on: true, spoiler: true, ms: 3_000 },
  { id: 'T52', re: /\bcracked\s+mirror\b/i, kind: 'mirror', where: 'BP', on: true, ms: 8_000, boost: -5 },
  { id: 'T53', re: /\bit(?:'|’)?s\s+a\s+deepfake\b/i, kind: 'deepfake', where: 'BP', on: true, ms: 2_500 },
  { id: 'T54', re: /\bthe\s+boys\s+are\s+back\s+in\s+town\b/i, kind: 'walk', where: 'BP', on: true, ms: 6_000, toast: { brand: 'The Boys are back in town. Vought is aware.', book: 'The Boys are back in town.', gold: 'The Boys are back in town.' } },
  { id: 'T55', re: /\btell\s+(?:you|me|ya|them)\s+about\s+nicaragua\b/i, kind: 'nicaragua', where: 'BP', on: true, ms: 3_000 },
  { id: 'T56', re: /^\s*payback[.!]*\s*$/i, kind: 'payback', where: 'BP', on: true, ms: 2_500 },
  { id: 'T57', re: /\bred\s+thunder\b/i, kind: 'redthunder', where: 'BP', on: true, ms: 3_000 },
  { id: 'T58', re: /\bvought\s+classic\b/i, kind: 'vclassic', where: 'BP', on: true, ms: 4_000, breaking: { brand: 'Vought Classic: gone, never forgotten', book: 'THE WIRE: Vought Classic, the reruns of regret', gold: 'Vought Classic: tonight, a rerun' } },
  { id: 'T59', re: /\btruthbomb\b/i, kind: 'truthbomb', where: 'BP', on: true, ms: 3_000 },
  { id: 'T60', re: /\b7spn\b/i, kind: 'scoreboard', where: 'BP', on: true, ms: 6_000 },
]
/** The words that must never trigger on their own (the bible's hard-NO list): the corpus test types each alone. */
export const BANNED_BARE = ['milk', 'boys', 'seven', 'oi', 'hughie', 'homelander', 'better', 'perfect', 'whale', 'noir', 'clara', 'solid', 'gold', 'payback now', 'deepfake', 'nicaragua', 'diabolical regex', 'back on brand', 'solid gold', 'shock and awe', 'pinocchio']
/** What a typed prompt asks of the skin in `mode`: the first live trigger that matches. The finale and death eggs (`spoiler`) only
 *  with the `boysSpoilers` setting on. */
export const typed = (text: string, mode: BoysMode, o: { spoilers?: boolean; all?: boolean } = {}): Trigger | undefined =>
  TRIGGERS.find(t => (t.on || o.all) && (!t.modes || t.modes.includes(mode)) && (!t.spoiler || o.spoilers) && t.re.test(text))

// --- the typed acts' clock: how long each plays, one at a time, and a cooldown per egg (as Invincible's: a pinned start, one fx).
const MS = new Map<string, number>(TRIGGERS.filter(t => t.ms).map(t => [t.kind, t.ms as number]))
/** Phase 3's acts say how long they play. */
export const setActMs = (kind: string, ms: number): void => { MS.set(kind, ms) }
/** How long the act `kind` plays (ms); 3 s for a kind with no row. */
export const actMs = (kind: string): number => MS.get(kind) ?? 3_000
/** Is an act playing at `at`? */
export const actLive = (at: number): boolean => Boolean(S.fx && at >= S.fx.at - 1000 && at < S.fx.at + actMs(S.fx.kind))
/** The same egg again within this long is ignored (its act and its toast). */
export const ACT_COOLDOWN_MS = 20_000
/** Typed `t` at `at` in `mode`: starts its act unless one is playing or it just played; returns what the register shows (a toast),
 *  after raising its BREAKING line and APPROVAL move. `undefined` when it was held back. */
export const fireTyped = (t: Trigger, at: number, mode: BoysMode): { toast?: string } | undefined => {
  if (actLive(at) && !S.fxEvent) return undefined
  if (at - (S.lastAct[t.kind] ?? -Infinity) < ACT_COOLDOWN_MS) return undefined
  S.lastAct[t.kind] = at
  setBoysFx(t.kind, at)
  if (t.kind === 'turbo') S.turboUntil = at + actMs('turbo')
  if (t.boost) S.boost = { delta: t.boost, at, until: at + actMs(t.kind) }
  if (t.kind === 'mirror') bumpApproval(-5, at)
  const br = t.breaking?.[mode]
  if (br) vnnBreak(br, at, t.kind)
  const toast = t.toast?.[mode]
  return toast && toastOk(`typed:${t.kind}`, at, 60_000) ? { toast } : {}
}
/** LOOK AT ME plays by itself the first time the context passes 95% in a session (when no act is playing). */
export const autoLookAtMe = (ctxPct: number, at: number): boolean => {
  if (ctxPct < 95 || S.lookedAt || actLive(at)) return false
  S.lookedAt = true
  setBoysFx('lookatme', at)
  return true
}
/** The clock of the newest draw (THE TABLE's drawer has none of its own; it reads this to know whether an act is on). */
export const noteDraw = (at: number): void => { S.drawAt = Math.max(S.drawAt, at) }
export const drawAt = (): number => S.drawAt
// --- the PR SPIN title glitch (plan row 11): every ~10 minutes while a job works (a seeded moment in each 10-min slot), and right
// after a failed test run. 2.5 s each.
export const SPIN_SLOT_MS = 600_000
export const spinDue = (at: number, working: boolean | undefined): number | undefined => {
  if (S.spinAt > 0 && at >= S.spinAt - 1000 && at < S.spinAt + 2_500) return S.spinAt
  if (!working) return undefined
  const slot = Math.floor(at / SPIN_SLOT_MS)
  let h = 2166136261
  for (const ch of `tbspin|${slot}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0 }
  const start = slot * SPIN_SLOT_MS + (h % (SPIN_SLOT_MS - 10_000))
  return at >= start && at < start + 2_500 ? start : undefined
}

// --- the replay registry: `/missioncontrol play <name>` while The Boys is worn. Phase 1 registers its own; later phases add rows.
export type Replay = { name: string; what: string; run: (at: number, mode: BoysMode) => { fx?: string; mode?: BoysMode; toast?: string } }
export const REPLAYS: Replay[] = [
  { name: 'hijack', what: 'SIGNAL HIJACKED: into OFF BOOK', run: () => ({ mode: 'book' }) },
  { name: 'onbrand', what: 'WE APOLOGISE FOR THE INTERRUPTION: back ON BRAND', run: () => ({ mode: 'brand' }) },
  { name: 'breaking', what: 'a BREAKING lower-third on the crawl', run: (at, m) => { vnnBreak(m === 'book' ? 'THE WIRE: replay requested. Nobody saw this.' : 'Vought confirms this is a replay', at, 'replay'); return {} } },
  { name: 'scoreboard', what: 'the 7SPN scoreboard, a clean run', run: at => { scoreStart(at - 2000); scoreEnd(42, 0, at); return {} } },
  { name: 'spin', what: 'a VOUGHT PR toast', run: (_at, m) => ({ toast: prToast('Bash', 'Error: command failed', m) }) },
  { name: 'turbo', what: 'TURBO RUSH for a moment', run: at => { setInFlight(4, at); return { fx: 'turbo' } } },
]
// Every typed act replays by its kind (`/missioncontrol play whale`); the spoiler eggs stay off the list.
for (const t of TRIGGERS) if (t.ms && !t.spoiler && !REPLAYS.some(r => r.name === t.kind)) REPLAYS.push({ name: t.kind, what: `the ${t.id} act`, run: () => ({ fx: t.kind }) })
export const registerReplay = (r: Replay): void => {
  const i = REPLAYS.findIndex(x => x.name === r.name)
  if (i >= 0) REPLAYS[i] = r
  else REPLAYS.push(r)
}

// ---------------------------------------------------------------- 3. data
// VNN crawl pools (bible §8): 68 ON BRAND, 16 OFF BOOK (THE WIRE), 10 SOLID GOLD, 10 VNN OVERNIGHT = 104. All ours.
export const VNN_BRAND = [
  'Vought denies merger talks with reality; "we already own it"', "The Seven's new roster to be announced at a later, more marketable date", 'Compound V supply "stable", says man holding exactly one vial', 'Homelander approval holds at a number legal has approved',
  'Vought on Ice adds a matinee; the ice remains loyal', 'A-Train: Into the Multiverse delayed; Vought blames the multiverse', 'Training A-Train trailer reviewed by its own coach: "inspiring"', "7SPN to air the Seven's charity run; the Seven will win",
  'Dawn of the Seven re-re-release adds a fun cut and a fun-cut cut', 'Vought Studios announces Phase 7 is now Phase 7.5', 'Voughtland opens a line for the line to the Soldier Boy musical', 'VoughtSonic recalls nothing; the drive-thru "misheard you"',
  'Planet Vought debuts a 12-ounce steak called The Noir; it says nothing', 'Vought Fresh Farms assures the eggs were "very patriotic"', 'Vought for Tots: toddlers now certified in cape safety', 'Vought+ raises prices, adds a channel that is only the logo',
  'Vought Classic adds a 24-hour Translucent marathon; critics saw nothing', 'VoughtSoul to premiere a cooking show with an A-list speedster', 'Secret Lair reopens Thursdays with a dress code and a lawyer', 'Little Miss Hero pageant adds a talent round: smiling',
  "Vought's Crime Analytics: crime down in every zip code we checked", 'Starlight House receives a donation; Vought receives the receipt', 'The Deep\'s memoir "Deeper" gets a sequel: "Deepest"', 'Not Without My Dolphin 2 greenlit; the dolphin has notes',
  'Seven on 7 extends to Seven on 7 on 7', 'The Cameron Coleman Hour becomes a very long minute', "Queen Maeve: Her Majesty gets a director's cut with more majesty", 'Translucent: Invisible Force 3 shoot "proceeding"; no one can confirm',
  'Black Noir: Back to Hanoi 4 title leaked; it is "Back to Hanoi 4"', 'Red Thunder remastered in 4K; Soldier Boy remastered in 4K too', 'Teenage Kix: Ditch Day! moves to a school night', 'Super School enrolment opens; tuition payable in loyalty',
  'Speedwalkers 2: Mall Race wins a weekend; the mall was closed', 'G-Men: Days Past From the Future tests well with the past', 'Vought R&D unveils a smaller syringe for "snack-size" powers', "Vought Tower's crown lights now visible from your conscience",
  'The Seven to film a group apology, pending a reason', 'American Hero returns; the two open seats remain very open', 'Super-Sweet reunion tour announced; the kiss will be rocked', 'Vought Music Group confirms the A-Train anthem has a second verse',
  'Rising Tide 2 postponed; tide failed to rise', 'The Mesmerizer renewed; the network shook hands and knew everything', 'Red, White & Blue Justice relocates from Trenton to a nicer Trenton', 'Citizen Starlight recut to Citizen Vought',
  'Vought denies a meme farm; five laptops seen leaving the building', 'Shareholders applaud a chart; the chart was of applause', 'Vought Rewards members earn one point per smile', 'VNN poll: 61% of HomeTeamers approve of polls',
  'VNN weather: sunny, with a 40% chance of searchlights', 'VNN traffic: a cape on the expressway, expect delays', 'VNN sports: the Seven defeat gravity, 7-0', 'VNN markets: V futures up on news of futures',
  'The Tek Knight: Knight Light praised for its lighting', 'Let There Be Knight rated "a knight"', 'The Seven Forever to be followed by The Seven, Still', 'Vought Store sells out of capes in every size but hero',
  'Cirque de Vought: VIVANT! adds wires; the wires add confidence', 'Homelander: Land of the Free, Home of the Saver adds a coupon', 'Firecracker\'s A Christmas Wish wraps in July, "as tradition demands"', 'Vought legal declares the word "setback" a feature',
  'Saving America campaign enters its third successful first year', 'Vought announces a crisis desk for crises about the crisis desk', 'Focus group of 40 agrees with the focus group of 40', 'Q-Score records show everyone is up, somehow',
  'Vought Rising slated for 2027, the 1950s "confirmed in talks"', 'Guardians of Godolkin: Flipped flips again in post', 'Godolkin University ranked #1 Supe school by Godolkin University', 'Vought wishes you a brand-safe evening',
]
export const VNN_BOOK = [
  'INTERCEPT: Tower garage, 2 a.m., a van, our van', 'the press release says "contained"; the carpet says otherwise', 'someone ordered 40 Fresh Farms eggs to the Crisis Desk; not us', 'Tower lift log: 99th floor, milk run, 11 minutes',
  'a focus group of 40 was actually 4 and a dog', '"routine training exercise" not routine', "A-Train's can left at the scene; still fizzing", 'Noir seen reading a script; title VIVANT',
  'the fun cut is 2 hours of the same scene', 'Seven on 7 teleprompter found in a skip; very long', 'the 7SPN score was right, the game was not', 'Vought Classic plays one film on a loop; the loop is the film',
  'safehouse rule: kettle first, plan second', 'the dog has the floor', "the Deep's tank has a visitor; do not ask", 'we don\'t do "features", we do fixes',
]
export const VNN_GOLD = [
  'TONIGHT ON SOLID GOLD: a legend, a shield, a shuffle', 'RED THUNDER · 1983 · "they said it was fiction"', 'WHISKEY SUNRISE · 1984 · the Payback picture', 'PAYBACK plays Nicaragua; details later, always later',
  'a brass star for every job; a gold record for the big ones', 'the VU meter is loyal; the needle is honest', 'back in storage by midnight, as agreed', 'tracking adjusted; please stand by',
  'live from a studio that no longer exists', 'VOUGHT RISING · 2027 · "RED SCARE"',
]
export const VNN_OVERNIGHT = [
  'VNN Overnight: the tower is asleep; the crown is not', 'late edition: nothing to report, very loudly', 'the night desk recommends a glass of milk', 'the Seven are resting; the roster is empty by design',
  'searchlights off for maintenance of the sky', "tomorrow's headlines already approved", 'the ice at Vought on Ice has been re-iced', 'a cape was seen on a rooftop; it was the wind in a cape',
  'the focus group has gone home; results pending', 'this has been VNN Overnight. Stay on brand.',
]
const pick = <T>(list: T[], n: number): T => list[((n % list.length) + list.length) % list.length] as T
/** The crawl's headline at `at`: one per 40 s, the order shuffled per hour; after midnight (local, until 05:00) ON BRAND reads VNN
 *  OVERNIGHT. */
export const vnnLine = (at: number, mode: BoysMode): string => {
  const slot = Math.floor(at / 40_000)
  const hour = Math.floor(at / 3_600_000)
  const night = new Date(at).getHours() < 5
  if (mode === 'noir') return '…'
  const list = mode === 'book' ? VNN_BOOK : mode === 'gold' ? VNN_GOLD : night ? VNN_OVERNIGHT : VNN_BRAND
  // A stride coprime with every pool's length walks the whole pool before it repeats.
  return pick(list, slot * 7 + hour * 13)
}

// Spinner verbs (bible §9): 20 ON BRAND, 14 OFF BOOK, 9 SOLID GOLD, 5 THIS MEANS NOIR = 48. "Get Some" is left out on purpose.
export const SPIN_BRAND = ['Spinning', 'Focus-grouping', 'Running it past legal', 'Polling the heartland', 'Rehearsing the smile', 'Prepping the presser', 'Clearing it with the Tower', 'Testing the slogan', 'Running crime analytics', 'Sending it to R&D', 'Stretching with Vought for Tots', 'Grabbing VoughtSonic', 'Lunch at Planet Vought', 'Cueing Seven on 7', 'Checking the Q-Score', 'Re-re-releasing', 'Booking the ice', 'Lighting the crown', 'Issuing a statement', 'Good for the Soul']
export const SPIN_BOOK = ['Casing the Tower', 'Tailing a supe', 'Bugging the room', 'Calling in a favour', 'Checking the van', 'Brewing something nasty', 'Walking Terror', 'Boiling the kettle', 'Doctoring the file', 'Lifting the tape', 'Working a source', 'Counting the exits', 'Picking the lock', 'Proper Preparation and Planning']
export const SPIN_GOLD = ['Thawing', 'Shield up', 'Rolling tape', 'Hitting the mark', 'Tuning the VU', 'Polishing the brass', 'Cueing the marquee', 'Telling the Nicaragua story', 'Back in a mo']
export const SPIN_NOIR = ['…', '… …', '(nods)', '(thumbs up)', '(reads the script)']

// Tool verbs (plan §2.1 row 20).
export const TOOLS_BRAND: Record<string, string> = { Read: 'Brief', Grep: 'Track down', Glob: 'Canvass', LS: 'Canvass', Edit: 'Spin', MultiEdit: 'Spin', NotebookEdit: 'Spin', Write: 'Issue a statement', Bash: 'Deploy a supe', PowerShell: 'Deploy a supe', Agent: 'Call in a supe', WebFetch: 'Pull the footage', WebSearch: 'Check the polls', ToolSearch: 'Check the roster' }
export const TOOLS_BOOK: Record<string, string> = { Read: 'Read the file', Grep: 'Tail', Glob: 'Case the joint', LS: 'Case the joint', Edit: 'Doctor', MultiEdit: 'Doctor', NotebookEdit: 'Doctor', Write: 'Leak', Bash: 'Light the fuse', PowerShell: 'Light the fuse', Agent: 'Call the Boys', WebFetch: 'Lift the tape', WebSearch: 'Work a source', ToolSearch: 'Check the van' }
export const TOOLS_GOLD: Record<string, string> = { Read: 'Read the cue card', Grep: 'Find the mark', Glob: 'Scan the house', LS: 'Scan the house', Edit: 'Retake', MultiEdit: 'Retake', NotebookEdit: 'Retake', Write: 'Cut a record', Bash: 'Roll tape', PowerShell: 'Roll tape', Agent: 'Call the band', WebFetch: 'Dub the tape', WebSearch: 'Check the charts', ToolSearch: 'Check the line-up' }

// Toasts (bible §10): 34, each with its key, when, mode and gap. Phase 1 shows the rows marked `on`; phase 3 wires the rest.
export type ToastRow = { n: number; text: string; when: string; mode: 'brand' | 'book' | 'gold' | 'noir' | 'all' | 'onoff'; gapMs: number; on?: boolean }
const H1 = 3_600_000
const M10 = 600_000
export const TOASTS: ToastRow[] = [
  { n: 1, text: 'Diabolical.', when: 'tests fail twice', mode: 'all', gapMs: H1, on: true },
  { n: 2, text: 'Somebody up there likes us, mate.', when: 'failing test passes', mode: 'onoff', gapMs: M10, on: true },
  { n: 3, text: '“It’s an absolute wonder to me that you’ve all managed to live this long.” — Edgar', when: 'force push', mode: 'brand', gapMs: 180_000, on: true },
  { n: 4, text: 'Shock and awe.', when: 'force push', mode: 'book', gapMs: 180_000, on: true },
  { n: 5, text: 'Smartest person.', when: 'plan approved', mode: 'brand', gapMs: 0 },
  { n: 6, text: 'Proper planning, mate.', when: 'plan approved', mode: 'book', gapMs: 0 },
  { n: 7, text: 'Wakey-wakey.', when: 'first prompt of the day', mode: 'brand', gapMs: 86_400_000 },
  { n: 8, text: "Daddy's home.", when: 'first prompt of the day', mode: 'book', gapMs: 86_400_000 },
  { n: 9, text: 'Thawed out and ready to roll.', when: 'greeting', mode: 'gold', gapMs: 86_400_000, on: true },
  { n: 10, text: 'Welcome back. Smile for the cameras.', when: 'greeting', mode: 'brand', gapMs: 0, on: true },
  { n: 11, text: "Oi. Kettle's on.", when: 'greeting', mode: 'book', gapMs: 0, on: true },
  { n: 12, text: 'Really marketable.', when: 'cost passes $1', mode: 'brand', gapMs: Infinity },
  { n: 13, text: '“What we are, really, is a pharmaceutical company.” — Edgar', when: 'cost passes $5', mode: 'brand', gapMs: Infinity },
  { n: 14, text: 'Legal has been notified.', when: 'cost passes $20', mode: 'brand', gapMs: Infinity },
  { n: 15, text: 'Mallory wants receipts.', when: 'cost passes $20', mode: 'book', gapMs: Infinity },
  { n: 16, text: 'You guys are the real heroes!', when: 'first subagent finishes', mode: 'brand', gapMs: Infinity },
  { n: 17, text: 'Good lad.', when: 'first subagent finishes', mode: 'book', gapMs: Infinity },
  { n: 18, text: 'It was perfect.', when: 'a clean test run', mode: 'brand', gapMs: M10, on: true },
  { n: 19, text: 'Not bad, Hughie.', when: 'a clean test run', mode: 'book', gapMs: M10, on: true },
  { n: 20, text: 'Legal cleared it.', when: 'lint passes after failing', mode: 'brand', gapMs: M10 },
  { n: 21, text: '“They only call me when there’s trouble at a dock.” — The Deep', when: 'network error', mode: 'brand', gapMs: M10 },
  { n: 22, text: "Line's dead, mate.", when: 'network error', mode: 'book', gapMs: M10 },
  { n: 23, text: 'Statement issued: <task>', when: 'job of 3+ minutes', mode: 'brand', gapMs: 0, on: true },
  { n: 24, text: 'Off the record: <task>', when: 'job of 3+ minutes', mode: 'book', gapMs: 0, on: true },
  { n: 25, text: 'Another win for Vought.', when: 'job done', mode: 'brand', gapMs: 0, on: true },
  { n: 26, text: 'Sorted.', when: 'job done', mode: 'book', gapMs: 0, on: true },
  { n: 27, text: 'The Boys are back in town.', when: 'session resume (a press pun, not a quote)', mode: 'book', gapMs: H1 },
  { n: 28, text: 'Q-SCORE ↑ <n> · <rank>', when: 'level up', mode: 'all', gapMs: 0, on: true },
  { n: 29, text: 'The board has questions.', when: 'daily cap hit', mode: 'brand', gapMs: 86_400_000 },
  { n: 30, text: 'Skint.', when: 'daily cap hit', mode: 'book', gapMs: 86_400_000 },
  { n: 31, text: 'Have you seen the memes about me?', when: 'idle 20 min', mode: 'brand', gapMs: Infinity },
  { n: 32, text: 'Still frozen?', when: 'idle 20 min', mode: 'gold', gapMs: Infinity },
  { n: 33, text: 'Back in storage.', when: 'leaving SOLID GOLD', mode: 'gold', gapMs: 0, on: true },
  { n: 34, text: '…', when: 'every toast in THIS MEANS NOIR', mode: 'noir', gapMs: 0 },
]
export const toastText = (n: number): string => (TOASTS.find(t => t.n === n) as ToastRow).text
