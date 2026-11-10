// The Boys on the stage director: the AMBUSH, the roamers and the set pieces come from one Director (theboys-director.ts), with
// the same rarity as the scheduler it replaced (`V1`, kept one release), and every play name goes through the shared registry.
import { expect, test } from 'claude-code/testing'
import { REPLAYS, resetBoys, setBoysFx } from './theboys-eggs'
import { PIECES, resetEvents, resetShow, stageAt } from './theboys-show'
import { V1, buildDirector, dayPlan, directorAt } from './theboys-director'
import type { Slot } from './theboys-director'
import { playOf, playsOf, runPlay } from './stage/replay'
import { boysFx } from './theboys-eggs'

const fresh = () => { resetBoys(); resetShow(); resetEvents() }
const DAY = 86_400_000
const MIN = 60_000
const T0 = new Date(2026, 9, 20, 0, 0, 0).getTime()
/** Every distinct act `f` puts on stage over [t0, t1), sampled every 5 s. */
const acts = (f: (t: number) => Slot | undefined, t0: number, t1: number): Slot[] => {
  const out: Slot[] = []
  let last: Slot | undefined
  for (let t = t0; t < t1; t += 5000) {
    const s = f(t)
    if (s && (!last || s.startAt !== last.startAt)) out.push(s)
    last = s
  }
  return out
}
const of = (l: Slot[], src: Slot['src']) => l.filter(s => s.src === src)

test('director: a working day, THE AMBUSH every 30-45 min (never at rest); roamers and pieces at the old rates', { timeoutMs: 60_000 }, () => {
  fresh()
  const work = acts(t => stageAt(t, { mode: 'brand', working: true }), T0, T0 + DAY)
  const rest = acts(t => stageAt(t, { mode: 'brand', working: false }), T0, T0 + DAY)
  const amb = of(work, 'ambush')
  expect(amb.length).toBeGreaterThanOrEqual(30)
  expect(amb.length).toBeLessThanOrEqual(48)
  for (let i = 1; i < amb.length; i++) {
    const gap = (amb[i] as Slot).startAt - (amb[i - 1] as Slot).startAt
    expect(gap).toBeGreaterThanOrEqual(30 * MIN)
    expect(gap).toBeLessThanOrEqual(90 * MIN) // 45 min, or two slots when a set piece took one
    expect((amb[i] as Slot).kind).not.toBe((amb[i - 1] as Slot).kind)
  }
  expect(of(rest, 'ambush').length).toBe(0)
  // Hit counts per day against the scheduler it replaced: within 25%.
  const old = acts(t => V1.stageAt(t, { mode: 'brand', working: true }), T0, T0 + DAY)
  for (const src of ['ambush', 'roamer', 'piece'] as const) {
    const a = of(work, src).length
    const b = of(old, src).length
    expect(Math.abs(a - b), `${src}: ${a} vs ${b}`).toBeLessThanOrEqual(Math.ceil(b * 0.25))
  }
  const roam = of(rest, 'roamer').length
  expect(roam).toBeGreaterThanOrEqual(100)
  expect(roam).toBeLessThanOrEqual(170)
  // One thing at a time, with a breath: nothing starts within 10 s of the act before it ends.
  for (const day of [work, rest]) for (let i = 1; i < day.length; i++) expect((day[i] as Slot).startAt - (day[i - 1] as Slot).endAt).toBeGreaterThanOrEqual(10_000)
})

test('director: set pieces at most once a day, in their local windows; none in NOIR; the 2nd WALK only OFF BOOK', { timeoutMs: 60_000 }, () => {
  fresh()
  let walks = 0
  for (let d = 0; d < 20; d++) {
    const t0 = new Date(2026, 9, 1 + d, 0, 0).getTime()
    const plan = dayPlan(t0 + 12 * 3_600_000)
    expect(plan.length).toBeGreaterThanOrEqual(6)
    for (const k of new Set(PIECES.map(p => p.kind))) expect(plan.filter(s => s.kind === k).length, k).toBeLessThanOrEqual(k === 'walk' ? 2 : 1)
    for (const s of plan) {
      const p = PIECES.find(q => q.kind === s.kind) as { from: number; to: number }
      const h = new Date(s.startAt).getHours() + new Date(s.startAt).getMinutes() / 60
      expect(h, s.kind).toBeGreaterThanOrEqual(p.from)
      expect(h, s.kind).toBeLessThan(p.to)
      // On stage a second in: every look but NOIR shows it; the 2nd WALK only OFF BOOK. Drawn ahead of its start too.
      const at = s.startAt + 1000
      expect(stageAt(at, { mode: 'noir' })?.src, s.kind).not.toBe('piece')
      expect(stageAt(at, { mode: 'book' })?.kind, s.kind).toBe(s.kind)
      expect(stageAt(at, { mode: 'brand' })?.src === 'piece', s.kind).toBe(!s.book)
      const pre = stageAt(s.startAt - 60_000, { mode: 'gold' })
      if (!s.book) expect(pre !== undefined && (pre.startAt === s.startAt || pre.endAt + 10_000 <= s.startAt), s.kind).toBe(true)
      if (s.kind === 'walk') walks++
    }
  }
  expect(walks).toBeGreaterThanOrEqual(30) // two a day OFF BOOK, give or take a day a higher piece took the slot
})

test('director: a typed act is held (nothing scheduled starts near it); the same answer on every redraw', () => {
  fresh()
  const amb = acts(t => stageAt(t, { mode: 'brand', working: true }), T0 + 8 * 3_600_000, T0 + 12 * 3_600_000).find(s => s.src === 'ambush') as Slot
  expect(amb).toBeDefined()
  expect(stageAt(amb.startAt + 3000, { mode: 'brand', working: true })?.kind).toBe(amb.kind)
  // A typed act just before the AMBUSH: the typed act plays, the AMBUSH near it is dropped (not shifted).
  setBoysFx('whale', amb.startAt - 2000)
  expect(stageAt(amb.startAt - 1000, { mode: 'brand', working: true })?.src).toBe('fx')
  const after = acts(t => stageAt(t, { mode: 'brand', working: true }), amb.startAt - 1000, amb.startAt + 60_000)
  expect(after.some(s => s.src === 'ambush' && s.startAt === amb.startAt)).toBe(false)
  fresh()
  // Pure: two directors built alike give the same plan; a redraw asks again and gets the same act.
  const a = buildDirector({ dayOffsetMs: 3_600_000 }).plan(T0, T0 + DAY, { working: true })
  const b = buildDirector({ dayOffsetMs: 3_600_000 }).plan(T0, T0 + DAY, { working: true })
  expect(a).toEqual(b)
  for (let t = T0; t < T0 + 3_600_000; t += 37_000) expect(stageAt(t, { mode: 'book', working: true })).toEqual(stageAt(t, { mode: 'book', working: true }))
  expect(directorAt(T0).laneNames().slice(-3)).toEqual(['ambush', 'roam', 'oi'])
})

test('replays: all 92 names still resolve; the director names are in the shared registry, the curtain call only in NOIR', async () => {
  const names = REPLAYS.map(r => r.name)
  expect(names.length).toBeGreaterThanOrEqual(92)
  const shared = playsOf('the-boys').map(p => p.name)
  for (const n of ['ambush-a', 'ambush-b', 'ambush-c', 'hughie', 'starlight', 'kimiko', 'frenchie', 'noir', 'atrain', 'waddle', 'school', 'swimby', 'tentacle', 'bounce', 'blimp', 'oi', 'ice', 'whale', 'teaser', 'premiere', 'expo', 'redscare', 'walk']) expect(shared, n).toContain(n)
  expect(playOf('the-boys', 'curtain')).toBeUndefined()
  expect(playOf('noir', 'curtain')).toBeDefined()
  expect(playOf('solidgold', 'ambush-c')).toBeDefined()
  // Every name plays: through the shared registry (an act starts now), or through the Boys' own list (mode swaps, crawl lines).
  for (const n of names) {
    fresh()
    const said = await runPlay('noir', n, T0)
    if (said === undefined) {
      expect(['hijack', 'onbrand', 'breaking', 'scoreboard', 'spin', 'turbo', 'night'], n).toContain(n)
      continue
    }
    expect(said).toBe(`▶ ${n}`)
    expect(boysFx()?.at, n).toBe(T0)
  }
  fresh()
  await runPlay('the-boys', 'hughie', T0)
  expect(boysFx()?.kind).toBe('r-hughie')
  await runPlay('the-boys', 'walk', T0)
  expect(boysFx()?.kind).toBe('walk')
})
