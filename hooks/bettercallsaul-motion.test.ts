// Better Call Saul, wave 3 phase A: the real 3D head turn, the inflatable, the typed eggs as visible band acts, the triggers
// that no longer fire inside ordinary prompts, Gus's tie, Mike off the text, the director and the replays.
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { overlaps, readouts } from './stage/keep'
import { BUDGET, audit, chars } from './stage/budget'
import { MIN } from './stage/director'
import { BCS_CSS, STATUE, bcsFigure, statueAt } from './bettercallsaul'
import { EGG_MS, HEAD, ding, namaste, rant, saul3d } from './bettercallsaul-motion'
import { chicaneryBand } from './bettercallsaul-court'
import type { EggOut } from './bettercallsaul-motion'
import { EGG_PLAYS, fxOf } from './bettercallsaul-fx'
import { GUS, bcsDirector, carPlan, gus, gusPlan, lalooPlan } from './bettercallsaul-extra'
import { MIKE_LEDGE, mikeRoamer } from './bettercallsaul-mike'

const NOW = Date.parse('2026-10-20T10:00:00Z')
const COLS: Record<number, number> = { 450: 66, 600: 86, 750: 106, 900: 126, 1250: 173 }
const STAGE = { x1: 794, keep: [[259, 39, 84, 22], [12, 88, 114, 21]] as [number, number, number, number][] }
const ALL = (gene: boolean, W = 1250): [string, EggOut][] => [
  ['saul3d', saul3d({ W, H: 134, at: NOW, gene, stage: STAGE })],
  ['namaste', namaste({ W, H: 134, at: NOW, gene, stage: STAGE })],
  ['ding', ding({ W, H: 134, at: NOW, gene, stage: STAGE })],
  ['chicanery', chicaneryBand({ W, H: 134, at: NOW, gene, stage: STAGE })],
  ['1216', rant({ W, H: 134, at: NOW, gene, stage: STAGE, kind: '1216' })],
]

// --- triggers ---------------------------------------------------------------------------------------------------------
test('triggers: each egg fires on its word or phrase; ding and 1216 only as the whole prompt or a distinctive phrase', () => {
  for (const [t, k] of [['saul3d', 'saul3d'], ['namaste', 'namaste'], ['Namaste!', 'namaste'], ['that was pure chicanery', 'chicanery'], ['ding', 'ding'], ['Ding!', 'ding'], ['ding ding ding', 'ding'], ['ding, ding', 'ding'], ['1216', '1216'], ['1216.', '1216'], ['It was 1216', '1216']] as const) expect(fxOf(t), t).toBe(k)
})
test('triggers: 40 ordinary coding prompts fire nothing', () => {
  const prompts = [
    'see line 1216 in parser.ts', 'bump the timeout to 1216 ms', 'fix issue #1216', 'PR 1216 needs a rebase', 'the port 1216 is taken, use 1217',
    'add a ding sound when the build finishes', 'ding the user when the upload is done', 'play a ding on success', 'rename dingbat to icon', 'the ding.wav file is missing',
    'refactor the coding style guide', 'fix the encoding of the CSV export', 'run the tests and fix what fails', 'why does the band flicker at 900 px?', 'commit and push the branch',
    'add a retry with backoff to fetchUser', 'explain this stack trace', 'write a migration for the users table', 'what does 12160 mean in the log', 'error code 1216a in the response',
    'speed up the build', 'add dark mode to the settings page', 'the year 1216 is in the fixture data', 'update dependencies', 'set the max width to 1216px',
    'make the button bigger', 'add a 3d preview of the model', 'search for TODOs in hooks', 'log every request id', 'deploy to staging',
    'is 1216 a prime?', 'the ding endpoint returns 500', 'bind the ding handler', 'grep for "1216" in the repo', 'parse the dingo config',
    'clean up the namespaces', 'saul is a variable name here', 'the chicane test is flaky', 'nama ste split word', 'update the 3d model loader',
  ]
  expect(prompts.length).toBeGreaterThanOrEqual(30)
  for (const p of prompts) expect(fxOf(p), p).toBeUndefined()
})

// --- the acts: size, budget, still frame, visible size -------------------------------------------------------------------
test('eggs: every act is drawn big enough to see, under the band act budget, with a still frame, clean markup (both skins)', () => {
  const MIN_SIZE: Record<string, [string, number][]> = { saul3d: [['head', 40]], namaste: [['ball', 12], ['car', 36], ['howard', 40]], ding: [['bell', 20], ['hector', 40], ['word', 14]], chicanery: [['chuck', 40], ['jimmy', 40], ['words', 11], ['stamp', 14]], '1216': [['number', 20], ['tag', 60]] }
  for (const gene of [false, true]) {
    for (const [k, out] of ALL(gene)) {
      for (const [part, min] of MIN_SIZE[k] ?? []) expect(out.size[part] ?? 0, `${k} ${part}`).toBeGreaterThanOrEqual(min)
      const a = audit(out.svg)
      expect(a.dupes, k).toEqual([])
      expect(a.badText, k).toEqual([])
      expect(a.dupeIds, k).toEqual([])
      expect(a.chars, `${k} ${gene ? 'gene' : 'saul'}`).toBeLessThanOrEqual(BUDGET.fightBand.band - 1000)
      // The still frame: drawn instead of the act under reduced motion, and not empty.
      expect(out.svg).toContain('prefers-reduced-motion: reduce')
      expect(/<g class="s\w+-s">[\s\S]*?<(use|rect|path|text)/.test(out.svg), k).toBe(true)
      // Kept clear of the readouts: the act clips to the span minus the holes.
      expect(out.svg, k).toContain('clip-rule="evenodd" d="M0 34h794v100h-794zM259 39h84v22h-84zM12 88h114v21h-114z"')
    }
  }
  // GENE stays grey: no Saul blue, no ad red or yellow in GENE's acts.
  // (saul3d's front view shows the bust's own exception once he is round: the two one-pixel lens ads, red and yellow.)
  for (const [k, out] of ALL(true)) expect(/#(5589D8|D7262C|FFD23F|1B2A5E)/i.test(out.svg.replace(/<rect [^>]*width="1" height="1" fill="#(D7262C|FFD23F)"\/>/g, '')), k).toBe(false)
  // saul3d is a real turn: five head poses (8 views with the mirrored three), not a size pop.
  const s3 = (ALL(false)[0] as [string, EggOut])[1].svg
  expect((s3.match(/<g id="s\w+fv[0-4]">/g) ?? []).length).toBe(5)
  expect(s3).toContain('scale(-1 1)')
  expect(HEAD.sc * 45).toBeGreaterThan(40)
  expect(EGG_MS.saul3d).toBe(4000)
})
test('eggs: a narrow band still plays them inside its span', () => {
  for (const W of [450, 600]) {
    const st = { x1: Math.round(W * 0.42), keep: STAGE.keep }
    for (const k of ['namaste', 'ding'] as const) {
      const out = k === 'namaste' ? namaste({ W, H: 134, at: NOW, gene: false, stage: st }) : ding({ W, H: 134, at: NOW, gene: false, stage: st })
      expect(chars(out.svg)).toBeLessThan(BUDGET.fightBand.band)
      expect(out.svg).toContain(`M0 34h${Math.max(140, st.x1)}v100`)
    }
  }
})

// --- the band's own pieces ---------------------------------------------------------------------------------------------
test('statue: the torch is yellow (not the crew tint); it inflates on a job start, stands while working, sags at rest', () => {
  expect(STATUE.rows.join('')).not.toContain('t')
  expect(STATUE.rows).toHaveLength(17)
  const up = statueAt(6, 126.5, false, { working: true, at: NOW + 60_000, jobAt: NOW })
  expect(up).toContain('#FFD23F')
  expect(up).not.toContain('#2C4B4E')
  expect(up).toContain('bcs-sway')
  const inflating = statueAt(6, 126.5, false, { working: true, at: NOW + 200, jobAt: NOW })
  expect(inflating.match(/bcs-ws90-/g)?.length).toBeGreaterThanOrEqual(3)
  expect(inflating).toContain('bcs-wob')
  const rest = statueAt(6, 126.5, false, { working: false, at: NOW })
  expect(rest).toContain('rotate(6 ')
  const droop = statueAt(6, 126.5, false, { working: false, at: NOW + 1000, partyAt: NOW })
  expect(droop).toContain('bcs-droop')
  // GENE: grey, no sway.
  expect(statueAt(6, 126.5, true, { working: true, at: NOW + 60_000, jobAt: NOW })).not.toContain('bcs-sway')
  // Reduced motion stops all of it (the still pose is the state's own).
  const rm = BCS_CSS.split('prefers-reduced-motion')[1] as string
  for (const c of ['bcs-wob', 'bcs-droop', 'bcs-win', 'bcs-breath', 'bcs-blk']) expect(rm).toContain(c)
})
test('bust: breathes and blinks cheaply; glances aside after a cheer; hides while saul3d turns the head', () => {
  const idle = bcsFigure(false, { at: NOW })
  expect(idle).toContain('class="bcs-breath"')
  expect(idle).toContain('class="bcs-blk" opacity="0"')
  expect(bcsFigure(true, { at: NOW })).toContain('class="bcs-breath"')
  const glance = bcsFigure(false, { at: NOW + 1000, glanceAt: NOW })
  expect(glance).toContain('bcs-ws420-250-370')
  expect(bcsFigure(false, { at: NOW + 9000, glanceAt: NOW })).not.toContain('bcs-ws420')
  expect(bcsFigure(false, { at: NOW, hideAt: NOW, hideMs: 4000 })).toContain('bcs-wh400-0-395')
  // Idle costs little: the blink is two lid pixels (the breath is one class on the bust's group).
  expect((/<g class="bcs-blk"[^>]*>(.*?)<\/g>/.exec(idle)?.[1] ?? '').length).toBeLessThan(200)
})
test('gus: the tie only while he stands (2.45 cycles from 4.6 s), the step bob only while he walks, Nacho a step behind', () => {
  const g = gus(1250, 134, { on: true, startAt: NOW, endAt: NOW + 13_000, bucket: 1 }, false, STAGE)
  expect(g).toContain(`animation-iteration-count:${GUS.tieCycles}`)
  expect(g).toContain(`+ ${GUS.tieFrom}s)`)
  expect(g).toContain('class="bcs-walk" style="animation-iteration-count:6')
  expect(g).toContain('translate(-30 0)')
  expect(g).toContain('clip-rule="evenodd"')
})
test('mike: on the band he walks small and faint on the roof ledge and never sits over the text', () => {
  const r = mikeRoamer(false)
  const band = (r.walk as (...a: unknown[]) => string)(1.8, 1, {}, { surface: 'band' })
  expect(band).toContain(`opacity="${MIKE_LEDGE.op}"`)
  expect(MIKE_LEDGE.op).toBeLessThan(0.4)
  expect((r.sit as (...a: unknown[]) => string)(100, 127, 1.5, 1, {}, { surface: 'band' })).toBe('')
  expect((r.sit as (...a: unknown[]) => string)(100, 127, 1.4, 1, {}, { surface: 'pane' })).not.toBe('')
})

// --- the director ------------------------------------------------------------------------------------------------------
test('director: Gus about every 30-45 min, the car every 8-14 min, Lalo every 20-40 min; never two at once; replay names', () => {
  const day = 24 * 60 * MIN
  for (const gene of [false, true]) {
    const p = bcsDirector(gene).plan(NOW, NOW + day)
    const n = (lane: string) => p.filter(s => s.lane === lane).length
    expect(n('gus')).toBeGreaterThan(24)
    expect(n('gus')).toBeLessThan(50)
    expect(n('car')).toBeGreaterThan(70)
    expect(n('car')).toBeLessThan(181)
    expect(n('lalo')).toBeGreaterThan(20)
    expect(n('lalo')).toBeLessThan(73)
    for (let i = 1; i < p.length; i++) expect((p[i] as { startAt: number }).startAt).toBeGreaterThanOrEqual((p[i - 1] as { endAt: number }).endAt)
    expect(bcsDirector(gene).replays().sort()).toEqual(['car', 'chicanery', 'gus', 'lalo'])
  }
  expect(carPlan(NOW, false)).toEqual(carPlan(NOW, false))
  expect(gusPlan(NOW, false).on || gusPlan(NOW, false).startAt === 0).toBe(true)
  expect(lalooPlan(NOW, false).card === 'task' || lalooPlan(NOW, false).card === 'log').toBe(true)
  expect(EGG_PLAYS.map(([k]) => k).sort()).toEqual(['1216', 'chicanery', 'ding', 'namaste', 'saul3d'])
})

// --- the real band: replays play, and no egg covers a readout at the band-fit widths -------------------------------------
const base = (on: On) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on)
  on('fs.exists', async () => ({ value: false }) as never)
  on('settings.read', async () => ({ value: {} }) as never)
  on('tool.register', async () => ({ value: undefined }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
  on('command.run', async () => ({ text: '' }) as never)
  on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
  on('ui.panes', async () => ({ value: [] }) as never)
  on('ui.toast', async () => ({ value: undefined }) as never)
  on('audio.play', async () => ({ value: undefined }) as never)
  on('tool.call', async () => ({ result: 'ok' }) as never)
  on('turn.complete', async () => ({ text: '' }) as never)
  on('prompt.submit', async (_$, e) => ({ text: (e as { text: string }).text }) as never)
  let n = 0
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: `a${++n}` }) as never)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: 120_000 }, rateLimits: [], cost: { usd: 12.34 } } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  return clock
}
const bandOf = async ($: Engine, W: number): Promise<string> => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: true, maxRows: 14, bodyColumns: COLS[W] } as never })
  const all = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  await ui.unmount()
  return all
}
const TITLE = 'Sandpiper document review'
for (const skin of ['better-call-saul', 'gene']) {
  test(`keep-out: every egg (${skin}) on the real band at 450, 600, 750, 900 and 1250 covers no readout; each has a play name`, { timeoutMs: 120_000 }, async ($, on) => {
    const clock = base(on)
    await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
    await $.command.run({ command: 'skin', args: skin } as never)
    await clock.advance(5_000)
    await $.prompt.submit({ text: TITLE, cursor: 0 } as never)
    await $.tool.call({ tool: 'mcp__crab-progress__progress', title: TITLE, total: 5, done: 2, phase: 'delegate', tasks: [{ title: 'Lead: run it', tier: 'fable' }, { title: 'Researcher: map the API', tier: 'medium' }] } as never).catch(() => undefined)
    await clock.advance(4_000)
    const W5 = [450, 600, 750, 900, 1250]
    const calm: Record<number, string> = {}
    for (const W of W5) calm[W] = await bandOf($, W)
    for (const [play] of EGG_PLAYS) {
      expect(String(((await $.command.run({ command: 'missioncontrol', args: `play ${play}` } as never)) as { text?: string }).text)).toBe(`▶ ${play}`)
      await clock.advance(1_500)
      for (const W of W5) {
        const b = await bandOf($, W)
        const clip = /<clipPath id="[\w-]+"><path clip-rule="evenodd" d="([^"]+)"/.exec(b)
        expect(clip, `${play} ${W}: drawn through a keep-out clip`).not.toBeNull()
        const boxes = readouts((calm[W] as string).replace(/<!--dl-->[\s\S]*?<!--\/dl-->/g, ''))
        expect(boxes.length, `${W}: readouts found`).toBeGreaterThanOrEqual(5)
        expect(overlaps(boxes, (clip as RegExpExecArray)[1] as string), `${play} ${W}`).toEqual([])
        expect(Number(/^M[-\d.]+ ([-\d.]+)/.exec((clip as RegExpExecArray)[1] as string)?.[1])).toBeGreaterThanOrEqual(33)
        expect(b.length, `${play} ${W}: the band under the lite cut`).toBeLessThan(120_000)
      }
      await clock.advance(7_000)
    }
    for (const p of ['gus', 'car']) expect(String(((await $.command.run({ command: 'missioncontrol', args: `play ${p}` } as never)) as { text?: string }).text)).toBe(`▶ ${p}`)
  })
}
