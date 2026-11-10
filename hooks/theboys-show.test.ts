// The Boys, phase 3: the event eggs, the daily set pieces, the rare roamers, THE AMBUSH v2, the replays and THIS MEANS NOIR.
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { actOn } from './theboys-acts'
import { REPLAYS, boysEvent, boysFx, boysState, breakingAt, resetBoys, setBoysFx } from './theboys-eggs'
import type { BoysEvent, BoysMode } from './theboys-eggs'
import { AMBUSH_KINDS, AMB_SLOT_MS, EVENT_EGGS, PIECES, ROAM_SLOT_MS, SHOW_KINDS, ambushAt, ambushOfSlot, dayPlan, isCompaction, localDay, resetEvents, resetShow, roamerOfSlot, sign, stageAt } from './theboys-show'
import { BADGES, veiled } from './theboys-cards'
import { BLANK_CRED, foundOf, withFound } from './extras'

const LOOKS: BoysMode[] = ['brand', 'book', 'gold', 'noir']
const fresh = () => { resetBoys(); resetShow(); resetEvents() }
const T0 = new Date(2026, 9, 20, 10, 0, 0).getTime()

test('event eggs: every one of E1-E24 answers its own engine event (an act, a BREAKING line or a toast), in every look', () => {
  expect(EVENT_EGGS.length).toBe(24)
  for (const m of LOOKS) {
    const fire = (ev: BoysEvent, at: number, extra: object = {}) => boysEvent(ev, { at, mode: m, ...extra })
    const kindAfter = (prep: (at: number) => void, ev: BoysEvent, extra: object = {}): { kind?: string; toasts: string[]; br?: string } => {
      fresh()
      prep(T0)
      setBoysFx('none', T0 - 600_000)
      const toasts = fire(ev, T0 + 60_000, extra)
      const fx = boysFx()
      return { kind: fx && fx.at === T0 + 60_000 ? fx.kind : undefined, toasts, br: breakingAt(T0 + 60_000)?.line }
    }
    const want: [BoysEvent, string | RegExp, (at: number) => void, object?][] = [
      ['test-fail', 'scorch', () => undefined, { pass: 3, fail: 1 }],
      ['test-pass', 'regen', at => { fire('test-fail', at, { fail: 1 }) }, { pass: 4, fail: 0 }],
      ['cancel', m === 'brand' ? 'sweep' : m === 'gold' ? 'chestglow' : 'slash', () => undefined],
      ['compact', m === 'brand' || m === 'noir' ? 'blackout' : m === 'book' ? 'shredder' : 'chestblast', () => undefined],
      ['permission', 'legalno', () => undefined],
      ['force-push', 'rewind', () => undefined],
      ['plan', 'knight', () => undefined],
      ['resume', 'wakey', () => undefined],
      ['ctx95', 'lookatme', () => undefined],
      ['turbo', 'race', () => undefined],
      ['turbo', 'turbo', at => { fire('turbo', at - 40_000) }],
      ['idle10', 'terror', () => undefined],
      ['agent-spawn', 'recruit', () => undefined],
      ['errors3', 'mirror', () => undefined],
      ['new-file', 'blink', () => undefined],
      ['net-error', 'fish', () => undefined],
    ]
    for (const [ev, act, prep, extra] of want) expect(kindAfter(prep, ev, extra).kind, `${m} ${ev}`).toBe(act)
    // E2: the second failure in a row (OFF BOOK: Butcher's Diabolical.)
    const two = kindAfter(at => { fire('test-fail', at, { fail: 1 }) }, 'test-fail', { fail: 2 })
    expect(two.kind, `${m} E2`).toBe(m === 'book' ? 'diabolical' : m === 'noir' ? 'slash' : 'disgusted')
    expect(two.toasts.length, `${m} E2 toast`).toBe(1)
    // The ones that speak: a BREAKING line or a toast.
    for (const ev of ['ctx85', 'midnight', 'long-job', 'cap'] as BoysEvent[]) expect(kindAfter(() => undefined, ev).br, `${m} ${ev}`).toBeTruthy()
    for (const ev of ['cost1', 'cost5', 'cost20', 'idle20', 'agent-done', 'lint-fixed', 'cap', 'plan', 'resume', 'net-error'] as BoysEvent[]) expect(kindAfter(() => undefined, ev).toasts.length, `${m} ${ev} toast`).toBe(1)
    // E20 a clean run, E24 a test start (the 7SPN scoreboard).
    fresh()
    fire('test-start', T0)
    expect(boysState().score?.running).toBe(true)
    if (m !== 'noir') expect(fire('test-pass', T0 + 5000, { pass: 9, fail: 0 }).length, `${m} E20`).toBe(1)
  }
  // Once-a-session eggs stay once; an event act never cuts a live one.
  fresh()
  expect(boysEvent('cost1', { at: T0, mode: 'brand' }).length).toBe(1)
  expect(boysEvent('cost1', { at: T0 + 1000, mode: 'brand' }).length).toBe(0)
  setBoysFx('whale', T0)
  boysEvent('cancel', { at: T0 + 1000, mode: 'brand' })
  expect(boysFx()?.kind).toBe('whale')
  // The compaction rule: a big drop from 30%+.
  expect(isCompaction(80, 12)).toBe(true)
  expect(isCompaction(80, 70)).toBe(false)
  expect(isCompaction(20, 2)).toBe(false)
})

test('acts: every phase-3 act draws on the band or its pane card in all four looks, ends, and keeps a reduced-motion rule', () => {
  for (const k of SHOW_KINDS) {
    for (const m of LOOKS) {
      const b = actOn(k, { W: 900, H: 148, m, at: T0, on: 'band' })
      const p = (['cred', 'task', 'log', 'table'] as const).map(on => actOn(k, { W: 560, H: 240, m, at: T0, on }))
      const all = [b, ...p].filter(Boolean)
      expect(all.length, `${k} ${m}`).toBeGreaterThan(0)
      for (const s of all) {
        expect(s, k).toContain(`data-egg="act-${k}"`)
        expect(s, k).toContain('prefers-reduced-motion')
        expect(s, k).not.toContain('NaN')
        expect(s, k).not.toContain('undefined')
      }
    }
  }
  // Kimiko never gets a bubble: closed captions.
  expect(sign(100, 20, 'now')).toContain('[signs: now]')
  for (const k of ['r-kimiko', 'ambush-a', 'ambush-b', 'regen']) expect([actOn(k, { W: 900, H: 148, m: 'brand', at: T0, on: 'band' }), actOn(k, { W: 560, H: 240, m: 'brand', at: T0, on: 'task' })].join(''), k).toContain('[signs: ')
})

test('set pieces: seeded by the local day (the same all day, new tomorrow), each in its window, none within 10 s of another', () => {
  for (let d = 0; d < 40; d++) {
    const day = new Date(2026, 9, 1 + d, 0, 30).getTime()
    const plan = dayPlan(day)
    expect(dayPlan(day + 23 * 3_600_000).map(s => s.startAt)).toEqual(plan.map(s => s.startAt))
    expect(new Set(plan.map(s => localDay(s.startAt))).size).toBe(1)
    expect(plan.filter(s => s.kind === 'walk').length).toBe(2)
    expect(plan.some(s => s.kind === 'bravemaeve')).toBe(false)
    for (const s of plan) {
      const p = PIECES.find(q => q.kind === s.kind) as { from: number; to: number }
      const h = new Date(s.startAt).getHours() + new Date(s.startAt).getMinutes() / 60
      expect(h, s.kind).toBeGreaterThanOrEqual(p.from)
      expect(h, s.kind).toBeLessThan(p.to)
    }
    for (let i = 1; i < plan.length; i++) expect((plan[i] as { startAt: number }).startAt - (plan[i - 1] as { endAt: number }).endAt).toBeGreaterThanOrEqual(10_000)
    const pr = plan.find(s => s.kind === 'premiere')
    const te = plan.find(s => s.kind === 'teaser')
    if (pr && te) expect(Math.abs(pr.startAt - te.startAt)).toBeGreaterThan(120_000)
  }
  // A different day, a different schedule; BRAVE MAEVE only in June.
  expect(dayPlan(new Date(2026, 9, 2, 9).getTime()).map(s => s.startAt % 86_400_000)).not.toEqual(dayPlan(new Date(2026, 9, 3, 9).getTime()).map(s => s.startAt % 86_400_000))
  expect(dayPlan(new Date(2027, 5, 14, 9).getTime()).some(s => s.kind === 'bravemaeve')).toBe(true)
  // Drawn ahead of time on an idle band, and only in OFF BOOK for the second walk.
  const plan = dayPlan(T0)
  const s0 = plan[0] as { kind: string; startAt: number }
  expect(stageAt(s0.startAt - 60_000, { mode: 'brand' })?.kind).toBe(s0.kind)
  expect(stageAt(s0.startAt - 60_000, { mode: 'noir' })?.src).not.toBe('piece')
})

test('roamers: rare. At most one per 6-min slot, about 65% of slots, never closer than 4 min, Oi. at most once per 48 min', () => {
  const list = Array.from({ length: 2400 }, (_, i) => roamerOfSlot(10_000 + i)).filter(Boolean) as { kind: string; startAt: number; endAt: number }[]
  expect(list.length / 2400).toBeGreaterThan(0.5)
  expect(list.length / 2400).toBeLessThan(0.7)
  for (let i = 1; i < list.length; i++) expect((list[i] as { startAt: number }).startAt - (list[i - 1] as { startAt: number }).startAt).toBeGreaterThanOrEqual(ROAM_SLOT_MS - 120_000)
  const ois = list.filter(r => r.kind === 'r-oi')
  for (let i = 1; i < ois.length; i++) expect((ois[i] as { startAt: number }).startAt - (ois[i - 1] as { startAt: number }).startAt).toBeGreaterThanOrEqual(45 * 60_000)
  expect(new Set(list.map(r => r.kind)).size).toBe(13)
  expect(list.filter(r => r.kind === 'r-hughie').length / list.length).toBeGreaterThan(0.2)
  // Never inside a set piece or an AMBUSH window.
  for (const r of list) for (const p of dayPlan(r.startAt)) expect(r.startAt >= p.endAt || r.endAt <= p.startAt, `${r.kind} vs ${p.kind}`).toBe(true)
})

test('THE AMBUSH: rare (about every 30-45 min) while a job works, 12 s, the three choreographies take turns; never with no job', () => {
  let sum = 0
  let n0 = 0
  for (let s = 5000; s < 5400; s++) {
    const a = ambushOfSlot(s)
    const b = ambushOfSlot(s + 1)
    const gap = b.startAt - a.startAt
    expect(gap).toBeGreaterThanOrEqual(20 * 60_000) // never two inside 20 min (was 15-20 min apart every time)
    expect(gap).toBeLessThanOrEqual(55 * 60_000)
    sum += gap
    n0++
    expect(a.endAt - a.startAt).toBe(12_000)
    expect(a.kind).not.toBe(b.kind)
  }
  // On average one every 30-45 min: a working day of 8 h sees about 13, not 25-30.
  expect(sum / n0).toBeGreaterThanOrEqual(30 * 60_000)
  expect(sum / n0).toBeLessThanOrEqual(45 * 60_000)
  let day = 0
  for (let t = T0; t < T0 + 8 * 3_600_000; t += 6000) if (ambushAt(t)?.startAt !== undefined && ambushAt(t - 6000)?.startAt !== ambushAt(t)?.startAt) day++
  expect(day).toBeGreaterThanOrEqual(8)
  expect(day).toBeLessThanOrEqual(17)
  expect(AMBUSH_KINDS).toEqual(['ambush-a', 'ambush-b', 'ambush-c'])
  fresh()
  let n = 0
  for (let s = 6000; s < 6100; s++) {
    const a = ambushOfSlot(s)
    // One slot in four is the look's FIGHT (theboys-fights.ts): it shares the slot, so it is never an AMBUSH too.
    if (a.src === 'fight') { expect(ambushAt(a.startAt + 6000)).toBeUndefined(); continue }
    if (!ambushAt(a.startAt + 6000)) continue
    n++
    expect(stageAt(a.startAt + 6000, { mode: 'brand', working: true })?.kind).toBe(a.kind)
    expect(stageAt(a.startAt + 6000, { mode: 'brand', working: false })?.src).not.toBe('ambush')
  }
  expect(n).toBeGreaterThan(68)  // of the 75 AMBUSH slots in 100 (a few give way to a set piece)
  // C steals the real progress bar (the slot goes empty with a dashed outline), on the band.
  const c = actOn('ambush-c', { W: 900, H: 148, m: 'brand', at: T0, on: 'band' })
  expect(c).toContain('stroke-dasharray="3 2"')
  expect(c).toContain('my bad')
  expect(AMB_SLOT_MS).toBe(2_250_000) // 37.5 min, the director's `rare` cadence
})

test('replays: 90+ unique names, every one resolves to an act that draws (or a mode / a line)', () => {
  const names = REPLAYS.map(r => r.name)
  expect(names.length).toBeGreaterThan(90)
  expect(new Set(names).size).toBe(names.length)
  for (const n of ['ambush', 'ambush-a', 'ambush-b', 'ambush-c', 'scorch', 'regen', 'sweep', 'slash', 'blackout', 'shredder', 'chestblast', 'legalno', 'rewind', 'recruit', 'fish', 'teaser', 'curtain', 'hughie', 'starlight', 'kimiko', 'frenchie', 'noir', 'atrain', 'waddle', 'swimby', 'tentacle', 'bounce', 'blimp', 'oi', 'night', 'ice', 'whale', 'premiere', 'expo', 'redscare', 'walk', 'bravemaeve']) expect(names, n).toContain(n)
  for (const r of REPLAYS) {
    fresh()
    const out = r.run(T0, 'brand')
    if (!out.fx) continue
    const drawn = [actOn(out.fx, { W: 900, H: 148, m: 'brand', at: T0, on: 'band' }), ...(['cred', 'task', 'log', 'table'] as const).map(on => actOn(out.fx as string, { W: 560, H: 240, m: 'brand', at: T0, on }))].join('')
    expect(drawn.length, r.name).toBeGreaterThan(100)
  }
})

test('hidden skins: THIS MEANS NOIR has its own flag and badge; SOLID GOLD and the shared samurai flag stay untouched', () => {
  const c = withFound({ ...BLANK_CRED }, 'noir')
  expect(foundOf(c, 'noir')).toBe(true)
  expect(foundOf(c, 'solidgold')).toBe(false)
  expect(c.samurai).toBeFalsy()
  const g = withFound({ ...BLANK_CRED }, 'solidgold')
  expect(foundOf(g, 'noir')).toBe(false)
  const nb = BADGES.find(b => b.id === 'noir')
  expect(nb).toBeTruthy()
  expect(veiled(nb, g).name).toBe('???')
  expect(veiled(nb, c).name).toBe('THIS MEANS NOIR')
  expect(veiled(BADGES.find(b => b.id === 'solidgold'), c).name).toBe('???')
})

// ---------------------------------------------------------------- end to end
const COLS: Record<number, number> = { 900: 126 }
const pane = { title: '', isFocused: false, bodyColumns: 100, placement: 'dock', scroll: { offset: 0, bodyRows: 60 }, view: {} } as const
const toasts: string[] = []
const base = (on: On, now: number, context = 100_000) => {
  const clock = mock.clock(on, { now })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on)
  on('fs.exists', async () => ({ value: false }) as never)
  on('settings.read', async () => ({ value: {} }) as never)
  on('tool.register', async () => ({ value: undefined }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
  on('command.run', async () => ({ text: '' }) as never)
  on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
  on('ui.panes', async () => ({ value: [] }) as never)
  on('ui.toast', async (_$, e) => {
    toasts.push(String((e as { text?: string }).text ?? JSON.stringify(e)))
    return { value: undefined } as never
  })
  on('audio.play', async () => ({ value: undefined }) as never)
  on('tool.call', async (_$, e) => ({ result: /test/.test(String((e as { command?: string }).command ?? '')) ? 'Tests: 3 failed, 12 passed' : 'ok' }) as never)
  on('turn.complete', async () => ({ text: '' }) as never)
  on('prompt.submit', async (_$, e) => ({ text: (e as { text: string }).text }) as never)
  let n = 0
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: `a${++n}` }) as never)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: context }, rateLimits: [], cost: { usd: 1.23 } } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  return clock
}
const start = async ($: Engine) => {
  toasts.length = 0
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  await $.command.run({ command: 'skin', args: 'the-boys' } as never)
}
const svgs = async ($: Engine, component: 'Pane' | 'AbovePrompt', W = 900): Promise<string[]> => {
  const ui =
    component === 'Pane'
      ? await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: pane })
      : await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: true, maxRows: 14, bodyColumns: COLS[W] } as never })
  const all = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source))
  await ui.unmount()
  return all
}
const say = async ($: Engine, text: string) => $.prompt.submit({ text, cursor: 0 } as never)
const run = async ($: Engine, args: string) => String(((await $.command.run({ command: 'missioncontrol', args } as never)) as { text?: string }).text)
const work = async ($: Engine) => {
  await say($, 'Vought Tower incident report')
  await $.tool.call({ tool: 'mcp__crab-progress__progress', title: 'Vought Tower incident report', total: 5, done: 2, phase: 'build', tasks: [{ title: 'Lead: run it' }, { title: 'Engineer: fix it' }] } as never).catch(() => undefined)
  for (const [i, d] of ['Lead: run it', 'Engineer: fix it', 'Tester: break it', 'Writer: say it'].entries()) await $.agent.spawn({ tool_use_id: `t${i}`, prompt: 'p', description: d, subagentType: 'general-purpose', provider: 'engine', parentAgentId: undefined } as never).catch(() => undefined)
}

test('end to end: events raise their eggs on the band (a failed test, a new file, a force push, the first prompt of the day)', { timeoutMs: 120_000 }, async ($, on) => {
  const clock = base(on, T0)
  await start($)
  await say($, 'fix the login form')
  expect(toasts.join('|')).toContain('Wakey-wakey.')
  await clock.advance(30_000)
  await $.tool.call({ tool: 'Bash', command: 'npm test' } as never).catch(() => undefined)
  expect((await svgs($, 'AbovePrompt')).join('')).toContain('data-egg="act-scorch"')
  await clock.advance(30_000)
  await $.tool.call({ tool: 'Write', file_path: '/repo/brand-new.ts', content: 'x' } as never).catch(() => undefined)
  expect((await svgs($, 'AbovePrompt')).join('')).toContain('data-egg="act-blink"')
  await clock.advance(30_000)
  await $.tool.call({ tool: 'Bash', command: 'git push --force origin main' } as never).catch(() => undefined)
  expect((await svgs($, 'AbovePrompt')).join('')).toContain('data-egg="act-rewind"')
  expect(toasts.join('|')).toContain('Edgar')
})

test('end to end: THE AMBUSH plays on the band and the CRISIS DESK while a job works, inside the size budgets', { timeoutMs: 120_000 }, async ($, on) => {
  let slot = Math.floor(T0 / AMB_SLOT_MS) + 1
  while (!ambushAt(ambushOfSlot(slot).startAt + 6000)) slot++
  const a = ambushOfSlot(slot)
  const clock = base(on, a.startAt - 25_000)
  await start($)
  await work($)
  await svgs($, 'AbovePrompt')
  await clock.advance(31_000)
  const b = (await svgs($, 'AbovePrompt')).join('')
  expect(b).toContain(`data-egg="show-${a.kind}"`)
  expect(b.length).toBeLessThan(65_000)
  const p = await svgs($, 'Pane')
  expect(p.join('')).toContain(`data-egg="show-${a.kind}"`)
  for (const s of p) expect(s.length).toBeLessThan(101_000)
})

test('end to end: /missioncontrol play lists the Boys names and replays one; THIS MEANS NOIR unlocks, quiets, and curtain call goes back', { timeoutMs: 120_000 }, async ($, on) => {
  const clock = base(on, T0)
  await start($)
  const list = await run($, 'play')
  for (const n of ['ambush-c', 'scorch', 'kimiko', 'whale', 'teaser']) expect(list).toContain(n)
  expect(await run($, 'play ambush-b')).toContain('ambush-b')
  expect((await svgs($, 'AbovePrompt')).join('')).toContain('data-egg="act-ambush-b"')
  await clock.advance(30_000)
  await say($, 'this means noir')
  await clock.advance(4_000)
  const skins = String(((await $.command.run({ command: 'skin', args: 'list' } as never)) as { text?: string }).text)
  expect(skins).toContain('THIS MEANS NOIR')
  const band = (await svgs($, 'AbovePrompt')).join('')
  expect(band).toContain('#0B0C0E')
  toasts.length = 0
  await $.tool.call({ tool: 'Bash', command: 'git push --force' } as never).catch(() => undefined)
  expect(toasts.every(t => t.startsWith('…'))).toBe(true)
  await clock.advance(30_000)
  await say($, 'curtain call')
  await clock.advance(1_000)
  expect(toasts.join('|')).toContain('Curtain call.')
  const back = String(((await $.command.run({ command: 'skin', args: 'list' } as never)) as { text?: string }).text)
  expect(back).toMatch(/▸[^\n]*The Boys/)
})
