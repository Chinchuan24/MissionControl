// Motion never covers the working numbers: every fight's BAND cut, drawn on the REAL band (Invincible's THE FIGHT x3 and MARK VS
// CONQUEST, The Boys' four fights in their looks), at three widths, keeps clear of the band's readouts (ON PATROL n/m, TODAY
// n tasks · $, TURN, CACHE, the percent, the readout column, the Tasks chip, the step count, the crew's role chips). The band
// hands each band act its clear span and the readouts inside it (stage/keep.ts); the act clips itself to that window minus them.
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { holesIn, keepClip, overlaps, readouts } from './stage/keep'
import { BUDGET, chars } from './stage/budget'
import { fightBand } from './invincible-fight'
import { actOn } from './theboys-acts'
import { FIGHT_KINDS } from './theboys-fights'

const NOW = Date.parse('2026-10-20T10:00:00Z')
const COLS: Record<number, number> = { 750: 106, 900: 126, 1250: 173 }
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
const band = async ($: Engine, W: number): Promise<string> => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: true, maxRows: 14, bodyColumns: COLS[W] } as never })
  const all = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  await ui.unmount()
  return all
}
const TITLE = 'GDA HQ incident report'
const work = async ($: Engine) => {
  await $.prompt.submit({ text: TITLE, cursor: 0 } as never)
  await $.tool.call({ tool: 'mcp__crab-progress__progress', title: TITLE, total: 5, done: 2, phase: 'delegate', tasks: [{ title: 'Lead: run it', tier: 'fable' }, { title: 'Researcher: map the API', tier: 'medium' }, { title: 'Engineer: rewrite the parser', tier: 'careful' }, { title: 'Tester: break it', tier: 'heavy' }, { title: 'Writer: the report', tier: 'light' }] } as never).catch(() => undefined)
  for (const [i, d] of ['Lead: run it', 'Researcher: map the API', 'Engineer: rewrite the parser', 'Tester: break it'].entries()) await $.agent.spawn({ tool_use_id: `t${i}`, prompt: 'p', description: d, subagentType: 'general-purpose', provider: 'engine', parentModel: 'x', background: false, fork: false } as never)
}

test('keep-out: the clip is the window minus the readouts inside it; a readout outside the window or in a hole is clear', () => {
  const c = keepClip('k', [0, 34, 400, 100], [[300, 39, 60, 22], [500, 10, 40, 20], [-20, 88, 120, 21]])
  // The chip and the step count become holes (the step count clipped to the window); the box outside never does.
  expect(c).toContain('clip-rule="evenodd" d="M0 34h400v100h-400zM300 39h60v22h-60zM0 88h100v21h-100z"')
  expect(holesIn([0, 34, 400, 100], [[500, 10, 40, 20]])).toEqual([])
  const d = / d="([^"]+)"/.exec(c)?.[1] as string
  expect(overlaps([[310, 42, 40, 14], [450, 100, 50, 14], [20, 90, 30, 14]], d)).toEqual([])
  expect(overlaps([[200, 100, 50, 14]], d)).toEqual([[200, 100, 50, 14]])
  // The readouts of a band: numbers and short capital labels; prose (the tip) is left to the act's scrim.
  const r = readouts('<text x="500" y="123" text-anchor="end" font-size="9.5">TODAY</text><text x="34" y="123" font-size="11.5">“Researcher: map the API” reads on Opus 5.5: Haiku does read-only work</text><text x="618" y="73" font-size="13">40%</text>')
  expect(r.length).toBe(2)
})

// [skin, prompts to put the look on, the fight's play name]
const FIGHTS: [string, string[], string][] = [
  ['invincible', [], 'the-catch'], ['invincible', [], 'jet-flick'], ['invincible', [], 'every-angle'], ['invincible', ['new suit'], 'the-catch'], ['invincible', ['new suit'], 'conquest'],
  ['the-boys', ['shock and awe, my son'], 'offthebooks'], ['the-boys', [], 'race'], ['the-boys', [], 'offthebooks'], ['solidgold', [], 'reunion'], ['noir', [], 'curtainup'],
]
for (const [skin, pre, play] of FIGHTS) {
  test(`keep-out: ${play} (${skin}${pre.length ? `, ${pre[0]}` : ''}) on the real band at 750, 900 and 1250 covers no readout`, { timeoutMs: 60_000 }, async ($, on) => {
    const clock = base(on)
    await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
    await $.command.run({ command: 'skin', args: skin } as never)
    await clock.advance(5_000)
    for (const p of pre) { await $.prompt.submit({ text: p, cursor: 0 } as never); await clock.advance(5_000) }
    await work($)
    await clock.advance(4_000)
    const calm: Record<number, string> = {}
    for (const W of [750, 900, 1250]) calm[W] = await band($, W)
    expect(String(((await $.command.run({ command: 'missioncontrol', args: `play ${play}` } as never)) as { text?: string }).text)).toBe(`▶ ${play}`)
    await clock.advance(400)
    for (const W of [750, 900, 1250]) {
      const b = await band($, W)
      const clip = /<clipPath id="[\w-]+"><path clip-rule="evenodd" d="([^"]+)"/.exec(b)
      expect(clip, `${play} ${W}: the fight is drawn through a keep-out clip`).not.toBeNull()
      const boxes = readouts((calm[W] as string).replace(/<!--dl-->[\s\S]*?<!--\/dl-->/g, ''))
      for (const t of ['TODAY', 'TURN', '40%', '0/5']) expect((calm[W] as string).includes(`>${t}<`) || (calm[W] as string).includes(t), `${W} ${t}`).toBe(true)
      expect(boxes.length, `${W}: readouts found`).toBeGreaterThanOrEqual(10)
      expect(overlaps(boxes, (clip as RegExpExecArray)[1] as string), `${play} ${W}`).toEqual([])
      // The header row is never in the window: the window starts under its rule.
      expect(Number(/^M[-\d.]+ ([-\d.]+)/.exec((clip as RegExpExecArray)[1] as string)?.[1])).toBeGreaterThanOrEqual(33)
    }
  })
}

test('keep-out: every fight band cut stays under 32 k WITH its keep-out clip (the real band\'s spans at 750, 900, 1250)', () => {
  const keep: [number, number, number, number][] = [[259, 39, 84, 22], [12, 88, 114, 21]]
  const spans = [[750, 290], [900, 439], [1250, 794]] as const
  for (const era of [1, 2] as const) for (const v of [0, 1, 2, 3] as const) {
    if (v === 3 && era === 1) continue
    for (const [W, x1] of spans) {
      const s = fightBand({ W, H: 134, era, startAt: 0, v, stage: { x1, keep } }).svg
      expect(chars(s), `inv e${era} v${v} ${W}`).toBeLessThanOrEqual(BUDGET.fightBand.band)
      expect(s).toContain('clip-rule="evenodd"')
    }
  }
  for (const k of FIGHT_KINDS) for (const m of ['brand', 'book', 'gold', 'noir'] as const) for (const [W, x1] of spans) {
    const s = actOn(k, { W, H: 148, m, at: 0, on: 'band', task: 'Vought Tower incident report', titleW: 300, stage: { x1, keep } })
    expect(chars(s), `boys ${k} ${m} ${W}`).toBeLessThanOrEqual(BUDGET.fightBand.band)
    expect(s).toContain('clip-rule="evenodd"')
  }
})
