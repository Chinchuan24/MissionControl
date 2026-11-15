// The Mentalist and Red John's wave 3 motion: the tea ritual, THE READ, the Parlour Reveal, the painted smiley, the cheers,
// Red John's title card and walk-by, the way back, the switch flavours. Rarity and day seeding, the trigger words against
// everyday prompts, still frames, budgets, and the keep-out on the REAL band at the band-fit widths.
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { PATRICK_JANE_RE, TYGER_RE } from './mentalist'
import {
  MENT_MS, MENT_SWITCH, RJ_SWITCH, bandFigure, caseClosedAct, janeFigure, mentDirector, mentDue, paintedCorner, paneFigure, parlourAct,
  readAct, rjCheerAct, rjDirector, setMentPlay, tygerAct, walkAct,
} from './mentalist-motion'
import { DAY, MIN } from './stage/director'
import { audit, BUDGET } from './stage/budget'
import { overlaps, readouts } from './stage/keep'
import { playsOf, runPlay } from './stage/replay'
import { skinSwitch } from './stage/wipe'

const NOW = Date.parse('2026-10-20T10:00:00Z')

// ---------------------------------------------------------------- the schedule
test('director: THE READ plays at most once per 30-45 min, only while working; never at rest', () => {
  const dir = mentDirector(0)
  const day = dir.plan(NOW, NOW + DAY, { working: true }).filter(s => s.id === 'the-read')
  expect(day.length).toBeGreaterThanOrEqual(24)
  expect(day.length).toBeLessThanOrEqual(48)
  for (let i = 1; i < day.length; i++) expect((day[i] as { startAt: number }).startAt - (day[i - 1] as { startAt: number }).startAt).toBeGreaterThanOrEqual(30 * MIN)
  expect(dir.plan(NOW, NOW + DAY, { working: false }).filter(s => s.id === 'the-read')).toEqual([])
  expect(dir.replays()).toEqual(['parlour-reveal', 'the-read'])
})

test('director: the Parlour Reveal is once a LOCAL day, between 10 and 19 h, seeded by the day (same day, same time)', () => {
  for (const off of [0, -8 * 3_600_000, 5.5 * 3_600_000]) {
    const dir = mentDirector(off)
    const base = Math.floor(NOW / DAY) * DAY - off
    const times: number[] = []
    for (let d = 0; d < 14; d++) {
      const p = dir.plan(base + d * DAY, base + (d + 1) * DAY, {}).filter(s => s.id === 'parlour')
      expect(p.length, `day ${d} at ${off}`).toBeLessThanOrEqual(1)
      for (const s of p) {
        const h = (((s.startAt + off) % DAY) + DAY) % DAY / 3_600_000
        expect(h).toBeGreaterThanOrEqual(10)
        expect(h).toBeLessThan(19)
        times.push(s.startAt)
      }
    }
    // Twelve days or more of the fourteen (a day whose slot sits near a raw fight slot gives way: lanes above it never move).
    expect(times.length).toBeGreaterThanOrEqual(12)
    expect(new Set(times.map(t => Math.floor((t + off) / DAY))).size).toBe(times.length)
    // The same day asks the same: a redraw never moves it.
    expect(mentDirector(off).plan(base, base + DAY, {}).map(s => s.startAt)).toEqual(dir.plan(base, base + DAY, {}).map(s => s.startAt))
  }
})

test("director: Red John's walk-by comes 20 min apart or more, any time, never two at once", () => {
  const dir = rjDirector(0)
  const day = dir.plan(NOW, NOW + DAY, {})
  expect(day.length).toBeGreaterThanOrEqual(25)
  expect(day.length).toBeLessThanOrEqual(72)
  for (let i = 1; i < day.length; i++) expect((day[i] as { startAt: number }).startAt - (day[i - 1] as { startAt: number }).startAt).toBeGreaterThanOrEqual(20 * MIN)
  expect(dir.plan(NOW, NOW + DAY, { working: true }).length).toBe(day.length)
})

test('replays: every act has a name on its own skin; a replay is what is due, pinned to when it was asked', async () => {
  expect(playsOf('mentalist').map(p => p.name)).toEqual(expect.arrayContaining(['the-read', 'parlour-reveal', 'case-closed']))
  expect(playsOf('red-john').map(p => p.name)).toEqual(expect.arrayContaining(['tyger-tyger', 'walk-by', 'still-watching']))
  expect(playsOf('mentalist').map(p => p.name)).not.toContain('walk-by')
  expect(await runPlay('mentalist', 'the-read', NOW)).toBe('▶ the-read')
  expect(mentDue(NOW + 1000, true, false)).toEqual({ kind: 'the-read', startAt: NOW })
  // Red John does not play the Mentalist's replay; a replay ends on time.
  expect(mentDue(NOW + 1000, true, true)?.kind).not.toBe('the-read')
  expect(mentDue(NOW + MENT_MS['the-read'] + 1, true, false)?.startAt).not.toBe(NOW)
  setMentPlay(undefined)
})

// ---------------------------------------------------------------- the trigger words
const PROMPTS = [
  'Fix the login bug in auth.ts', 'Add a dark mode toggle to the settings page', 'Why does the build fail on CI?', 'Refactor the parser into smaller functions',
  'Write tests for the payment service', 'Rename getUser to fetchUser everywhere', 'Bump React to 19 and fix the warnings', 'Explain this stack trace',
  'Add pagination to the /orders endpoint', 'The tiger image on the landing page is blurry', 'Patrick wants the report by Friday', 'Ask Jane about the API keys',
  'Create a migration for the patients table', 'Deploy the staging branch', 'Make the card component accessible', 'Read the README and summarise it',
  'Profile the slow query in reports.sql', 'Why is the tea-time cron job running twice?', 'Patch the Jane Street parser for the new format', 'Add a TigerBeetle adapter',
  'Update the copyright year in the footer', 'Help me write a commit message', 'Find the memory leak in the worker', 'Port the shell script to Python',
  'Draft release notes for v2.3', 'Set up eslint with the new config', 'patrick: please review PR 412', 'Jane Doe test fixture is wrong',
  'Convert the CSV import to streaming', 'Add retry with backoff to the HTTP client', 'Burning bright: the CPU is at 100% on the build box', 'Add the red smiley emoji to the status',
  'Tyger is misspelled in the poem fixture', 'Order the mentalist episodes by season',
]
test('trigger words: "tyger tyger" and "patrick jane" are whole phrases; 34 everyday coding prompts fire neither', () => {
  expect(PROMPTS.length).toBeGreaterThanOrEqual(30)
  for (const p of PROMPTS) {
    expect(TYGER_RE.test(p), p).toBe(false)
    expect(PATRICK_JANE_RE.test(p), p).toBe(false)
  }
  for (const p of ['patrick jane', 'Patrick  Jane, come back', 'ok PATRICK JANE']) expect(PATRICK_JANE_RE.test(p), p).toBe(true)
  for (const p of ['patrickjane', 'patrick janet', 'fitzpatrick jane']) expect(PATRICK_JANE_RE.test(p), p).toBe(false)
})

// ---------------------------------------------------------------- the acts: still frames, budgets, structure
const ACTS: [string, () => string][] = [
  ['the-read band', () => readAct({ at: NOW, w: 640, h: 56, id: 't-read-band' }).layer],
  ['the-read narrow', () => readAct({ at: NOW, w: 140, h: 56, id: 't-read-narrow' }).layer],
  ['the-read pane', () => readAct({ at: NOW, w: 960, h: 84, id: 't-read-pane', sc: 1.85, lite: true }).layer],
  ['parlour band', () => parlourAct({ at: NOW, w: 640, h: 56, id: 't-par-band' }).layer],
  ['parlour pane', () => parlourAct({ at: NOW, w: 960, h: 84, id: 't-par-pane', sc: 1.57, lite: true }).layer],
  ['tyger', () => tygerAct({ at: NOW, w: 600, h: 56, id: 't-tyger' }).layer],
  ['walk-by', () => walkAct({ at: NOW, w: 600, h: 56, id: 't-walk' }).layer],
  ['case-closed', () => caseClosedAct({ at: NOW, w: 600, h: 56, id: 't-cc' }).layer],
  ['still-watching', () => rjCheerAct({ at: NOW, w: 600, h: 56, id: 't-rjc' }).layer],
]
test('acts: each is pinned, has a reduced-motion still, no duplicate attribute or id, escaped text, and real headroom under its cap', () => {
  for (const [name, make] of ACTS) {
    const layer = make()
    const a = audit(layer)
    expect(a.dupes, name).toEqual([])
    expect(a.dupeIds, name).toEqual([])
    expect(a.badText, name).toEqual([])
    expect(a.reduced, `${name}: reduced-motion still`).toBe(true)
    expect(layer, name).toContain('<!--dl-->')
    expect(layer, name).toContain('@@T') // the pinned start
    expect(layer, name).not.toMatch(/NaN|undefined|Infinity/)
    expect(layer, name).not.toContain('mix-blend-mode')
    // A band act: 1 k under the 32 k fight band; a pane echo inside the theme's 16 k pane reserve (a busy Mentalist pane is near the cap).
    const cap = name.includes('pane') ? 16_000 : BUDGET.fightBand.band - 1000
    expect(a.chars, `${name} is ${a.chars}`).toBeLessThan(cap)
  }
})

test('THE READ is a stand-off written in choreo beats: stare, step, flinch, backdown; poses fan, reveal, smile; no hit', () => {
  const r = readAct({ at: NOW, w: 640, h: 56, id: 't-read-beats' })
  expect(r.fight.script.map(([b]) => b)).toEqual(['stare', 'step', 'flinch', 'backdown'])
  expect(r.fight.hits).toEqual([])
  expect(r.act.chainKeys()).toEqual(expect.arrayContaining(['jFan', 'jRev', 'jSmile', 'oHold', 'oFlinch']))
  expect(r.layer).toContain('Seven of hearts.')
  // The palm: his close-up in the letterbox, once.
  expect(r.act.bank.has('cut')).toBe(true)
})

test('the walk-by is a silhouette: no face pixels, no skin tones, never a red figure; one close-up of the smile', () => {
  const w = walkAct({ at: NOW, w: 600, h: 56, id: 't-walk-face' })
  for (const skin of ['#D9B99B', '#C9A35A', '#E0B090']) expect(w.layer).not.toContain(skin)
  expect(w.act.bank.has('cut')).toBe(true)
  expect(w.act.chainKeys()).toEqual(['wA', 'wB', 'wA', 'wB', 'wA', 'wB', 'wA', 'wB', 'wA', 'wB', 'wA', 'wB', 'wA', 'wB', 'st', 'tn'])
})

// ---------------------------------------------------------------- the tea ritual, the corner, the switch
test('tea ritual: idle sips (4 poses, one 3.8 s steps(1) loop each), working thinks (a 1 px sway), done smiles, failed sets the cup down', () => {
  const idle = janeFigure({ p: 'tq', x: 30, foot: 83 })
  expect((idle.match(/steps\(1\) infinite/g) ?? []).length).toBe(4)
  expect(idle).toContain('3.8s')
  expect(idle).toContain('prefers-reduced-motion: reduce')
  expect((idle.match(/<use /g) ?? []).length).toBe(4)
  expect(idle.length).toBeLessThan(8_000)
  const think = janeFigure({ p: 'tq', x: 30, foot: 83, working: true })
  expect(think).toContain('translateX(1px)')
  expect((think.match(/<use /g) ?? []).length).toBe(1)
  expect(janeFigure({ p: 'tq', x: 30, foot: 83, party: true })).not.toContain('animation')
  expect(janeFigure({ p: 'tq', x: 30, foot: 83, failed: true })).not.toBe(janeFigure({ p: 'tq', x: 30, foot: 83, party: true }))
  for (const s of [idle, think]) expect(audit(s).dupes).toEqual([])
  // Out of the box while one of his acts plays; back after.
  setMentPlay({ kind: 'parlour', at: NOW })
  expect(bandFigure({ at: NOW + 2000 })).toBe('')
  expect(bandFigure({ at: NOW + MENT_MS.parlour + 1000 })).not.toBe('')
  setMentPlay(undefined)
  expect(paneFigure(600, 124, {})).toContain('scale(1.4')
})

test('the corner: the smiley paints itself on in strokes (ring, eyes, smile, drip), every 16 s in steps; still under reduced motion', () => {
  const c = paintedCorner(900, 132)
  expect((c.match(/pathLength="1"/g) ?? []).length).toBe(4)
  expect(c).toContain('steps(6) infinite')
  expect(c).toContain('prefers-reduced-motion: reduce')
  expect(c).not.toContain('class="rjs"')
  expect(c.length).toBeLessThan(1_500)
})

test('switch flavours: the Mentalist lifts a curtain and flips a card to the emblem; Red John paints the smiley. Within the wipe budget', () => {
  const look = { bg: '#070B14', accent: '#8DB4EA', ink: '#F2F5FA' }
  const m = skinSwitch({ W: 900, H: 132, at: NOW, surface: 'band', from: look, to: look, flavour: MENT_SWITCH })
  const r = skinSwitch({ W: 900, H: 132, at: NOW, surface: 'band', from: look, to: { ...look, accent: '#E0261F' }, flavour: RJ_SWITCH })
  for (const s of [m, r]) {
    expect(audit(s).dupes).toEqual([])
    expect(audit(s).chars).toBeLessThan(BUDGET.wipe.band)
  }
  expect(m).toContain('scale(.06,1)') // the card flip
  expect(r).toContain('pathLength="1"') // the paint
  expect(skinSwitch({ W: 900, H: 200, at: NOW, surface: 'pane', from: look, to: look, flavour: MENT_SWITCH }).length).toBeLessThan(BUDGET.wipe.card)
})

// ---------------------------------------------------------------- the real plugin
const base = (on: On, tokens = 120_000) => {
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
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens }, rateLimits: [], cost: { usd: 12.34 } } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  return clock
}
const COLS: Record<number, number> = { 450: 66, 600: 86, 750: 106, 900: 126, 1250: 173 }
const band = async ($: Engine, W = 900, isWorking = true): Promise<string> => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking, maxRows: 14, bodyColumns: COLS[W] } as never })
  const all = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  await ui.unmount()
  return all
}
const paneSvgs = async ($: Engine): Promise<string[]> => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: { title: '', isFocused: false, bodyColumns: 140, placement: 'dock', scroll: { offset: 0, bodyRows: 60 }, view: {} } as never })
  const all = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source))
  await ui.unmount()
  return all
}
const TITLE = 'Ship the CBI case report'
const work = async ($: Engine) => {
  await $.prompt.submit({ text: TITLE, cursor: 0 } as never)
  await $.tool.call({ tool: 'mcp__crab-progress__progress', title: TITLE, total: 5, done: 2, phase: 'delegate', tasks: [{ title: 'Lead: run it', tier: 'fable' }, { title: 'Researcher: map the API', tier: 'medium' }, { title: 'Engineer: rewrite the parser', tier: 'careful' }, { title: 'Tester: break it', tier: 'heavy' }] } as never).catch(() => undefined)
  for (const [i, d] of ['Lead: run it', 'Researcher: map the API', 'Engineer: rewrite the parser', 'Tester: break it'].entries()) await $.agent.spawn({ tool_use_id: `t${i}`, prompt: 'p', description: d, subagentType: 'general-purpose', provider: 'engine', parentModel: 'x', background: false, fork: false } as never)
}
const skinList = async ($: Engine) => String(((await $.command.run({ command: 'skin', args: 'list' } as never)) as { text?: string }).text)

const BAND_ACTS: [string, string][] = [['mentalist', 'the-read'], ['mentalist', 'parlour-reveal'], ['mentalist', 'case-closed'], ['red-john', 'tyger-tyger'], ['red-john', 'walk-by'], ['red-john', 'still-watching']]
const WIDE = [450, 600, 750, 900, 1250]
for (const [skin, play] of BAND_ACTS) {
  test(`keep-out: ${play} (${skin}) on the real band at ${WIDE.join(', ')} covers no readout, stays under the header, in budget`, { timeoutMs: 90_000 }, async ($, on) => {
    const clock = base(on)
    await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
    await $.command.run({ command: 'skin', args: skin } as never)
    await clock.advance(5_000)
    await work($)
    await clock.advance(4_000)
    const calm: Record<number, string> = {}
    for (const W of WIDE) calm[W] = await band($, W)
    expect(String(((await $.command.run({ command: 'missioncontrol', args: `play ${play}` } as never)) as { text?: string }).text)).toBe(`▶ ${play}`)
    await clock.advance(1_200)
    for (const W of WIDE) {
      const b = await band($, W)
      const clip = /<clipPath id="[\w-]+"><path clip-rule="evenodd" d="([^"]+)"/.exec(b)
      expect(clip, `${play} ${W}: drawn through a keep-out clip`).not.toBeNull()
      const boxes = readouts((calm[W] as string).replace(/<!--dl-->[\s\S]*?<!--\/dl-->/g, ''))
      expect(boxes.length, `${W}: readouts found`).toBeGreaterThanOrEqual(6)
      expect(overlaps(boxes, (clip as RegExpExecArray)[1] as string), `${play} ${W}`).toEqual([])
      expect(Number(/^M[-\d.]+ ([-\d.]+)/.exec((clip as RegExpExecArray)[1] as string)?.[1])).toBeGreaterThanOrEqual(33)
      expect(b.length, `${play} ${W}`).toBeLessThan(131_072)
      const layer = /<!--dl-->[\s\S]*?<!--\/dl-->/.exec(b)?.[0] ?? ''
      expect(audit(layer).chars, `${play} ${W} act`).toBeLessThan(BUDGET.fightBand.band - 1000)
      expect(audit(b).dupes, `${play} ${W}`).toEqual([])
    }
    setMentPlay(undefined)
  })
}

test('the band: Jane sips tea at rest, thinks at work; the episode flickers, never the title; the corner paints at 95%', async ($, on) => {
  base(on, 960_000)
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  await $.command.run({ command: 'skin', args: 'mentalist' } as never)
  const rest = await band($, 900, false)
  expect((rest.match(/class="mjbt"/g) ?? []).length).toBe(4)
  await work($)
  const busy = await band($)
  expect(busy).toContain('translateX(1px)')
  expect(busy).toMatch(new RegExp(`<text x="64" y="54"[^>]*>${TITLE}</text>`))
  const ghost = /<g class="mx-ghost"[^>]*>([\s\S]*?)<\/g>/.exec(busy)?.[1] ?? ''
  expect(ghost).toMatch(/S\dE\d/)
  expect(ghost).not.toContain(TITLE)
  expect(busy).toContain('class="mpk"')
  expect(busy).not.toContain('class="rjs"')
  expect(busy).not.toContain("CASE CLOSED · TEA'S ON")
})

test('the pane: the tea on COLD READ; THE READ fills the card under its title', async ($, on) => {
  const clock = base(on)
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  await $.command.run({ command: 'skin', args: 'mentalist' } as never)
  await work($)
  await clock.advance(3_000)
  const cold = (await paneSvgs($)).find(s => s.includes('COLD READ')) ?? ''
  expect(cold).toContain('class="mjpt"')
  await $.command.run({ command: 'missioncontrol', args: 'play the-read' } as never)
  await clock.advance(1_000)
  const all = await paneSvgs($)
  const card = all.find(s => s.includes('COLD READ')) ?? ''
  expect(card).toContain('<!--dl-->')
  expect(card).toContain('Seven of hearts.')
  expect(card).not.toContain('class="mjpt"')
  // Under the title row: the act's region starts at y 34.
  expect(card).toMatch(/<g transform="translate\(10 34\)"><defs><clipPath/)
  expect(all.join('').length).toBeLessThan(262_144)
  for (const s of all) expect(s.length).toBeLessThan(131_072)
  setMentPlay(undefined)
})

test('the way back: "patrick jane" on Red John wears The Mentalist again; the prompt goes on; it does nothing elsewhere', async ($, on) => {
  base(on)
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  await $.command.run({ command: 'skin', args: 'mentalist' } as never)
  await $.prompt.submit({ text: 'patrick jane, fix the build', cursor: 0 } as never)
  expect(await skinList($)).toContain('▸ mentalist')
  await $.prompt.submit({ text: 'tyger tyger', cursor: 0 } as never)
  expect(await skinList($)).toContain('▸ red-john')
  // The unlock's title card is due on the band now (pinned to the unlock).
  expect(await band($)).toContain('Tyger Tyger, burning bright,')
  const out = (await $.prompt.submit({ text: 'Patrick Jane, come back', cursor: 0 } as never)) as { text?: string }
  expect(String(out?.text ?? 'Patrick Jane, come back')).toContain('Patrick Jane')
  expect(await skinList($)).toContain('▸ mentalist')
  await $.command.run({ command: 'skin', args: 'crab-classic' } as never)
  await $.prompt.submit({ text: 'patrick jane', cursor: 0 } as never)
  expect(await skinList($)).toContain('▸ crab-classic')
  setMentPlay(undefined)
})
