// Better Call Saul + GENE, wave 4 polish: the job-done cheer keeps to the band's clear span (every number readable), the typed
// eggs are drawn big enough to see (a minimum size for each), and the 3D head turn plays large on the band's clear span.
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { meets, overlaps, readouts } from './stage/keep'
import { BUDGET, audit } from './stage/budget'
import { bcsCheer, isAdCheer } from './bettercallsaul'
import { EGG_MS, HEAD, TURN, ding, namaste, rant, saul3d, turnStage } from './bettercallsaul-motion'
import { chicaneryBand } from './bettercallsaul-court'

const NOW = Date.parse('2026-10-20T10:00:00Z')
const W5 = [450, 600, 750, 900, 1250]
const COLS: Record<number, number> = { 450: 66, 600: 86, 750: 106, 900: 126, 1250: 173 }
/** The band's real clear span and holes at the band-fit widths (measured on the real band, as in bettercallsaul-b.test.ts). */
const STAGES: Record<number, { x1: number; keep: [number, number, number, number][] }> = {
  450: { x1: 195, keep: [[12, 88, 76, 21]] },
  600: { x1: 274, keep: [[165, 39, 85, 22], [12, 88, 76, 21]] },
  750: { x1: 287, keep: [[258, 39, 29, 22], [12, 88, 76, 21]] },
  900: { x1: 436, keep: [[261, 39, 85, 22], [12, 88, 76, 21]] },
  1250: { x1: 785, keep: [[261, 39, 85, 22], [12, 88, 76, 21]] },
}

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
const bandOf = async ($: Engine, W: number, working = true): Promise<string> => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: working, maxRows: 14, bodyColumns: COLS[W] } as never })
  const all = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  await ui.unmount()
  return all
}
const TITLE = 'Sandpiper document review'
const jobIn = async ($: Engine, clock: { advance: (ms: number) => Promise<void> }, skin: string) => {
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  await $.command.run({ command: 'skin', args: skin } as never)
  await clock.advance(5_000)
  await $.prompt.submit({ text: TITLE, cursor: 0 } as never)
  await $.tool.call({ tool: 'mcp__crab-progress__progress', title: TITLE, total: 5, done: 2, phase: 'delegate', tasks: [{ title: 'Lead: run it', tier: 'fable' }] } as never).catch(() => undefined)
  await clock.advance(4_000)
}
// Acts out, and the live-text columns (a nested Svg of stacked timer texts, placed by its own transform: readouts() cannot place them).
const noDl = (s: string): string => s.replace(/<!--dl-->[\s\S]*?<!--\/dl-->/g, '').replace(/<svg x="[^"]*" y="[^"]*"[\s\S]*?<\/svg>/g, '')

// --- 1. the job-done cheer -------------------------------------------------------------------------------------------------
test('cheer: on the band the star-wipe keeps to the clear span (the readouts cut out as holes), the shout whole and at least 12 px', () => {
  for (const W of W5) {
    const st = STAGES[W] as (typeof STAGES)[number]
    for (const at of [NOW, NOW + 3_000]) {
      const c = bcsCheer(W, 134, false, at, st)
      const a = audit(c)
      expect(a.dupes, `${W}`).toEqual([])
      expect(a.badText, `${W}`).toEqual([])
      expect(a.dupeIds, `${W}`).toEqual([])
      // One keep-out clip, the strip inside it, never the band's full width.
      const clip = /<clipPath id="bcs-chw[\w-]+"><path clip-rule="evenodd" d="([^"]+)"/.exec(c)?.[1] ?? ''
      expect(clip.startsWith('M0 34h'), `${W}`).toBe(true)
      for (const [x, y, w, h] of st.keep) expect(clip, `${W}`).toContain(`M${x} ${y}h${w}v${h}`)
      expect(c).not.toContain(`width="${W}" height="46"`)
      const fs = Number(/font-size="([\d.]+)"[^>]*>BETTER CALL SAUL!</.exec(c)?.[1])
      expect(fs, `${W}`).toBeGreaterThanOrEqual(12)
      if (isAdCheer(at)) expect(c).toContain('505-555-0100')
    }
  }
  // Off the band (no stage) it is the middle strip, as before.
  expect(bcsCheer(1250, 134, false, NOW)).toContain('width="1250" height="46"')
})
test('cheer on the real band: a finished job cheers at every band-fit width, and no number, label or chip is under the wipe', { timeoutMs: 120_000 }, async ($, on) => {
  const clock = base(on)
  await jobIn($, clock, 'better-call-saul')
  await clock.advance(25_000)
  await $.turn.complete({ reason: 'answer', answer: 'done' } as never)
  await clock.advance(300)
  const calm: Record<number, string> = {}
  // The calm band to read the readouts from: the same moment with the cheer's layer taken out.
  for (const W of W5) calm[W] = await bandOf($, W, false)
  for (const t of [0, 700, 900]) {
    await clock.advance(t)
    for (const W of W5) {
      const b = await bandOf($, W, false)
      expect(b, `${W}: the cheer is drawn`).toContain('BETTER CALL SAUL!')
      const clip = /<clipPath id="bcs-chw[\w-]+"><path clip-rule="evenodd" d="([^"]+)"/.exec(b)
      expect(clip, `${W}: through the cheer's keep-out clip`).not.toBeNull()
      const cheerless = (calm[W] as string).replace(/<defs><clipPath id="bcs-chw[\s\S]*$/, '')
      const boxes = readouts(noDl(cheerless))
      expect(boxes.length, `${W}: readouts found`).toBeGreaterThanOrEqual(5)
      expect(overlaps(boxes, (clip as RegExpExecArray)[1] as string), `${W}`).toEqual([])
      expect(audit(b).dupes, `${W}`).toEqual([])
    }
  }
})

// --- 2. the typed eggs, drawn big enough to see --------------------------------------------------------------------------
/** The smallest each typed egg's subject may be drawn on the band (px), at every band-fit width. The owner typed namaste and
 *  could not see a 7 px ball: these hold it. */
const MIN = { ball: 18, car: 48, howardWide: 60, bell: 27, hector: 49, word: 16, number: 24, figure: 45 } as const
test('typed eggs: each one drawn at least its minimum size at every band-fit width, both skins, under the band budget', () => {
  for (const gene of [false, true]) {
    for (const W of W5) {
      const st = { ...(STAGES[W] as (typeof STAGES)[number]), wide: { x2: Math.round(W * 0.66), keep: [[Math.round(W * 0.6), 34, W, 50], [Math.round(W * 0.55), 79, W, 31], [Math.round(W * 0.5), 110, W, 24]] as [number, number, number, number][] } }
      const o = { W, H: 134, at: NOW, gene, stage: st }
      const n = namaste(o)
      expect(n.size.ball, `namaste ball ${W}`).toBeGreaterThanOrEqual(MIN.ball)
      expect(n.size.car, `namaste car ${W}`).toBeGreaterThanOrEqual(MIN.car)
      if (W >= 900) expect(n.size.howard, `namaste howard ${W}`).toBeGreaterThanOrEqual(MIN.howardWide)
      const d = ding(o)
      expect(d.size.bell, `ding bell ${W}`).toBeGreaterThanOrEqual(MIN.bell)
      expect(d.size.hector, `ding hector ${W}`).toBeGreaterThanOrEqual(MIN.hector)
      expect(d.size.word, `ding word ${W}`).toBeGreaterThanOrEqual(MIN.word)
      const t = rant({ ...o, kind: '1216' })
      expect(t.size.number, `1216 ${W}`).toBeGreaterThanOrEqual(MIN.number)
      const c = chicaneryBand(o)
      expect(Math.max(c.size.jimmy ?? 0, c.size.chuck ?? 0), `chicanery ${W}`).toBeGreaterThanOrEqual(MIN.figure)
      for (const [name, svg] of [['namaste', n.svg], ['ding', d.svg], ['1216', t.svg]] as const) {
        const a = audit(svg)
        expect(a.dupes, `${name} ${W}`).toEqual([])
        expect(a.dupeIds, `${name} ${W}`).toEqual([])
        expect(a.badText, `${name} ${W}`).toEqual([])
        expect(a.reduced, `${name} ${W}`).toBe(true)
        expect(a.chars, `${name} ${W}`).toBeLessThanOrEqual(BUDGET.fightBand.band - 1000)
      }
    }
  }
  // At 1250 the ball is one you cannot miss (4x the old 7 px), the car 80 px.
  const big = namaste({ W: 1250, H: 134, at: NOW, gene: false, stage: STAGES[1250] })
  expect(big.size.ball).toBeGreaterThanOrEqual(26)
  expect(big.size.car).toBe(80)
})

// --- 3. the 3D head turn on its own stage ------------------------------------------------------------------------------------
test('saul3d: the head leaves the 45 px bust for a stage in the clear span, turns there large under the spotlight, then goes home', () => {
  for (const gene of [false, true]) {
    for (const W of W5) {
      const st = turnStage(W, 134, STAGES[W])
      // The stage is in the clear span, right of the bust, its head at least 1.5x (67 px), never over a readout's hole.
      expect(st.sc, `${W}`).toBeGreaterThanOrEqual(1.5)
      expect(st.rect[0], `${W}`).toBeGreaterThanOrEqual(62)
      for (const h of (STAGES[W] as (typeof STAGES)[number]).keep) expect(meets(st.rect, h), `${W} ${h}`).toBe(false)
      const out = saul3d({ W, H: 134, at: NOW, gene, stage: STAGES[W] })
      expect(out.size.head, `${W}`).toBeGreaterThanOrEqual(67)
      // It starts and ends on the bust: mapped home (its foot on the bust's foot, 1x) at both ends of the act.
      const home = `translate(${HEAD.x - st.x}px,${HEAD.foot - st.foot}px) scale(${Math.round((HEAD.sc / st.sc) * 10) / 10}`
      expect(out.svg, `${W}`).toContain(home)
      expect(TURN.out[1]).toBeLessThanOrEqual(TURN.from)
      expect(TURN.back[0]).toBeGreaterThan(TURN.snap + 0.6)
      expect(TURN.back[1]).toBeLessThanOrEqual(EGG_MS.saul3d / 1000)
      const a = audit(out.svg)
      expect(a.dupes, `${W}`).toEqual([])
      expect(a.dupeIds, `${W}`).toEqual([])
      expect(a.reduced).toBe(true)
      expect(a.chars, `${gene ? 'gene' : 'saul'} ${W}`).toBeLessThanOrEqual(BUDGET.fightBand.band - 1000)
    }
  }
  // Off the band (no stage): the bust's own spot at 1x, as before.
  expect(turnStage(1250, 134).sc).toBe(HEAD.sc)
})
