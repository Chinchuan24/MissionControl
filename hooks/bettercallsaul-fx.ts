// The Better Call Saul skins' trigger words, toasts and the celebration's pieces (meme pass; only lines verified in the
// research notes). Pure functions: the hooks module keeps the little state (when a word was typed, when a toast last
// showed) and passes it in. Every drawing is pinned to the clock with `pin()`, brief, ≤ 3 Hz, still under reduced motion.
//
//   chicanery  Chuck at the witness stand, "I AM NOT CRAZY!" (S3E5), 1216 <-> 1261 flipping beside him, Kim watching
//   1216       the number flip alone, a big manila exhibit tag (the whole prompt "1216", or "it was 1216")
//   namaste    a bowling ball rolls along the roof into Howard's car (S5E4): hit-stop, the crack, a dust puff, Howard looks
//   ding       Hector rolls in and rings his bell three times (the whole prompt "ding", or "ding ding")
//   saul3d     the bust turns all the way round: 8 views of the head under a swinging spotlight (bettercallsaul-motion.ts)
// The drawings are band acts on the shared stage engine (bettercallsaul-motion.ts), inside the band's clear span.
import { bcsFigure, fingerGuns } from './bettercallsaul'
import { hashOf } from './cast'
import { EGG_MS, eggAct } from './bettercallsaul-motion'
import type { BandStage } from './stage/keep'

/** The typed eggs, then the scheduled acts a `/missioncontrol play <name>` replays (drawn from the same slot). */
export type FxKind = 'chicanery' | '1216' | 'namaste' | 'ding' | 'saul3d' | 'gus' | 'car' | 'lalo'
export type Fx = { kind: FxKind; at: number }
export const FX_MS: Record<FxKind, number> = { ...EGG_MS, gus: 13_000, car: 14_000, lalo: 5_000 }
export const fxLive = (fx: Fx | undefined, at: number): fx is Fx => Boolean(fx) && at >= (fx as Fx).at - 1000 && at < (fx as Fx).at + (FX_MS[(fx as Fx).kind] ?? 0)

const word = (w: string): RegExp => new RegExp(`(?<![a-z0-9])${w}(?![a-z0-9])`, 'i')
/** The whole prompt is the word (a little punctuation and space allowed): "ding", "1216!" */
const whole = (w: string): RegExp => new RegExp(`^[\\s"'“”]*${w}[\\s.!?"'“”]*$`, 'i')
/**
 * The triggers. Rare words fire anywhere as a whole word (chicanery, namaste, saul3d). The two that turn up in ordinary work
 * ("see line 1216", "add a ding sound") fire only as the whole prompt or in a distinctive phrase: "ding ding" (Hector's bell
 * rung twice or more), "it was 1216" (Chuck).
 */
const FX_RES: [FxKind, RegExp[]][] = [
  ['chicanery', [word('chicanery')]],
  ['1216', [whole('1216'), /(?<![a-z0-9])it\s+was\s+1216(?![0-9])/i]],
  ['namaste', [word('namaste')]],
  ['ding', [whole('ding'), /(?<![a-z0-9])ding(?:[\s,!.-]+ding)+(?![a-z0-9])/i]],
  ['saul3d', [word('saul3d')]],
]
/** The trigger in a prompt (the first of the list found), or undefined. The prompt itself always goes on unchanged. */
export const fxOf = (text: string): FxKind | undefined => FX_RES.find(([, res]) => res.some(re => re.test(text)))?.[0]
/** The typed eggs a `/missioncontrol play <name>` replays on these two skins (the scheduled ones come from the director). */
export const EGG_PLAYS: [FxKind, string][] = [['saul3d', 'the head turns all the way round'], ['namaste', 'the bowling ball and Howard\'s car'], ['ding', "Hector's bell, three times"], ['chicanery', 'I AM NOT CRAZY!'], ['1216', '1216 or 1261']]

// --- toasts: each at most once per a few minutes, only on the two skins
export const TOASTS = {
  done: "S'all good, man!",
  tests: 'I AM NOT CRAZY!',
  force: 'No more half measures.',
  lint: 'Greatest legal mind I ever knew.',
  agent: 'Hey, guys! Can I come in?',
  first: "It's showtime, folks!",
  mcgill: "The name's McGill.",
} as const
export type ToastKey = keyof typeof TOASTS
/** How long each toast waits before it may show again. */
export const TOAST_GAP_MS: Record<ToastKey, number> = { done: 180_000, tests: 180_000, force: 180_000, lint: 180_000, agent: 600_000, first: 3_600_000, mcgill: 3_600_000 }
/** May the toast show now? `last` holds when each last showed. */
export const toastDue = (last: Partial<Record<ToastKey, number>>, key: ToastKey, now: number): boolean => now - (last[key] ?? -Infinity) >= TOAST_GAP_MS[key]
/** The rare "The name's McGill." on GENE (about one job finish in five, seeded by the moment). */
export const mcgillNow = (at: number): boolean => hashOf(`mcgill|${Math.floor(at / 1000)}`) % 5 === 0

export type CmdKind = 'test' | 'lint' | 'force' | null
/** What a Bash command is: a test run, a lint or type check, a force push. */
export const cmdKind = (command: string): CmdKind => {
  const c = command.toLowerCase()
  if (/git\s+push\b[^|;&]*(--force\b|--force-with-lease\b|\s-f\b)/.test(c)) return 'force'
  if (/(^|[\s;&|])(jest|vitest|pytest|go test|cargo test|bun test|npm (run )?test|yarn test|pnpm test|npx (jest|vitest))\b|(^|\s)test(\s|$)/.test(c)) return 'test'
  if (/\b(tsc|eslint|ruff|flake8|mypy|biome|lint|typecheck|type-check)\b/.test(c)) return 'lint'
  return null
}
/** Did a tool result report a failure? Looks at an error flag, then at the text. */
export const resultFailed = (res: unknown): boolean => {
  try {
    const r = res as { isError?: boolean; is_error?: boolean; error?: unknown; result?: unknown } | null
    if (!r || typeof r !== 'object') return false
    if (r.isError === true || r.is_error === true || r.error) return true
    const t = typeof r.result === 'string' ? r.result : JSON.stringify(r.result ?? '')
    return /\b(\d+ fail(ed|ing)?|FAIL\b|exit code [1-9]|exited with [1-9]|error TS\d+|Tests?:\s+\d+ failed|\d+ errors?\b)/i.test(t.slice(0, 6000))
  } catch {
    return false
  }
}
/** The toast a finished Bash call earns, from what came before: `state` is the run of failures this skin has seen. */
export type BashState = { testFails: number; lintFailed: boolean }
export const bashToast = (kind: CmdKind, failed: boolean, state: BashState): { toast?: ToastKey; state: BashState } => {
  if (kind === 'force') return { toast: 'force', state }
  if (kind === 'test') return failed ? (state.testFails >= 1 ? { toast: 'tests', state: { ...state, testFails: state.testFails + 1 } } : { state: { ...state, testFails: 1 } }) : { state: { ...state, testFails: 0 } }
  if (kind === 'lint') return failed ? { state: { ...state, lintFailed: true } } : state.lintFailed ? { toast: 'lint', state: { ...state, lintFailed: false } } : { state }
  return { state }
}

/** The band layer for a live trigger word: its act, inside the band's clear span (`stage`). */
export const fxLayer = (W: number, H: number, fx: Fx | undefined, at: number, gene: boolean, stage?: BandStage): string => {
  if (!fxLive(fx, at)) return ''
  return eggAct(fx.kind, { W, H, at: fx.at, gene, ...(stage ? { stage } : {}) })
}
/** The band's bust: hidden while `saul3d` turns the head (its act draws it), glancing aside after a job's cheer. */
export const figureFor = (gene: boolean, fx: Fx | undefined, at: number, partyAt?: number): string =>
  bcsFigure(gene, { at, ...(partyAt !== undefined ? { glanceAt: partyAt } : {}), ...(fxLive(fx, at) && fx.kind === 'saul3d' ? { hideAt: fx.at, hideMs: FX_MS.saul3d } : {}) })
export { fingerGuns }
