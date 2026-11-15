// Chin's fight frequency (wave 4): `/missioncontrol fights often | normal | rare | off`, saved in the store, `often` by default.
// Every fight lane (stage/choreo.ts `fightLane`, and The Boys' own fight lane) follows it: the cadence at each level over a
// simulated day (working and at rest), the rotation, `off` (replays still play), the setting surviving a restart, no stacking.
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { fightLane } from './stage/choreo'
import { DAY, Director, FIGHT_LEVELS, MIN, cleanFightLevel, fightLevel, setFightLevel, setJobStart } from './stage/director'
import type { FightLevel, Slot } from './stage/director'
import { buildDirector } from './theboys-director'
import { crabDirector } from './classics'
import { fightDirector } from './cyber-fights'
import { duelPlan } from './invincible-eggs'

const T0 = Date.parse('2026-10-20T00:00:00Z')
const two = (): Director => fightLane(new Director('t-level'), [{ id: 'a', ms: 9_000 }, { id: 'b', ms: 11_000 }])
const fights = (d: Director, working: boolean): Slot[] => d.plan(T0, T0 + DAY, { working }).filter(s => s.lane === 'fight')
const gaps = (l: Slot[]): number[] => l.slice(1).map((s, i) => (s.startAt - (l[i] as Slot).startAt) / MIN)
const at = <T>(level: FightLevel, f: () => T): T => { const was = fightLevel(); setFightLevel(level); try { return f() } finally { setFightLevel(was) } }

test('fight level: the setting defaults to often; a stored or typed value is cleaned (anything else is often)', () => {
  // The engine's own default is the crew's old rule (a director asked outside the plugin); the plugin sets the level at start.
  expect(fightLevel()).toBe('rare')
  expect(FIGHT_LEVELS).toEqual(['often', 'normal', 'rare', 'off'])
  expect(cleanFightLevel('RARE')).toBe('rare')
  expect(cleanFightLevel(undefined)).toBe('often')
  expect(cleanFightLevel('sometimes')).toBe('often')
})

test('fight level: the cadence at each level over a simulated day, working and at rest', () => {
  const want: Record<FightLevel, { work?: [number, number]; idle?: [number, number] }> = { often: { work: [7, 10], idle: [15, 20] }, normal: { work: [15, 20] }, rare: { work: [30, 45] }, off: {} }
  for (const level of FIGHT_LEVELS) at(level, () => {
    for (const working of [true, false]) {
      const l = fights(two(), working)
      const w = working ? want[level].work : want[level].idle
      if (!w) { expect(l, `${level} ${working ? 'working' : 'at rest'}: none`).toEqual([]); continue }
      // as many as the gap gives in a day, never closer than its shortest gap nor further than its longest
      expect(l.length, `${level} ${working}`).toBeGreaterThanOrEqual(Math.floor((24 * 60) / w[1]))
      expect(l.length, `${level} ${working}`).toBeLessThanOrEqual(Math.ceil((24 * 60) / w[0]))
      for (const g of gaps(l)) { expect(g, `${level} ${working}`).toBeGreaterThanOrEqual(w[0] - 0.01); expect(g).toBeLessThanOrEqual(w[1] + 0.01) }
    }
  })
  // Off: none by themselves, but a replay still plays.
  at('off', () => expect(two().play('b', T0)?.id).toBe('b'))
})

test('fight level: a skin with several fights rotates, never the same one twice in a row (working and at rest)', () => {
  at('often', () => {
    for (const working of [true, false]) {
      const l = fights(two(), working)
      expect(l.length).toBeGreaterThan(40)
      l.slice(1).forEach((s, i) => expect(s.id, `${working} ${i}`).not.toBe((l[i] as Slot).id))
    }
  })
})

test('fight level: it reaches every skin: the shared fight lane (Cyberpunk, Crab Classic) and The Boys and Invincible lanes', () => {
  for (const [level, perDay] of [['often', 120], ['normal', 60], ['rare', 25]] as const) at(level, () => {
    expect(fightDirector('maxtac').plan(T0, T0 + DAY, { working: true }).length, `maxtac ${level}`).toBeGreaterThanOrEqual(perDay)
    expect(crabDirector(T0).plan(T0, T0 + DAY, { working: true }).filter(s => s.lane === 'fight').length, `crab ${level}`).toBeGreaterThanOrEqual(perDay)
    // The Boys: their own fight lane (often, normal), under the day's set pieces, over THE AMBUSH and the roamers; at rare,
    // THE AMBUSH's fight turn (one slot in four) as before.
    const boys = buildDirector({ dayOffsetMs: 0 }).plan(T0, T0 + DAY, { working: true })
    const bf = boys.filter(s => s.lane === 'fight' || s.id === 'fight').length
    expect(bf, `boys ${level}`).toBeGreaterThanOrEqual(level === 'rare' ? 6 : perDay - 10)
    // Invincible: THE FIGHT's slots, working.
    let n = 0
    const seen = new Set<number>()
    for (let t = T0; t < T0 + DAY; t += MIN) { const d = duelPlan(t, 1); if (d.on && !seen.has(d.startAt)) { seen.add(d.startAt); n++ } }
    expect(n, `invincible ${level}`).toBeGreaterThanOrEqual(perDay - 10)
  })
  at('off', () => {
    expect(fightDirector('maxtac').plan(T0, T0 + DAY, { working: true })).toEqual([])
    expect(buildDirector({ dayOffsetMs: 0 }).plan(T0, T0 + DAY, { working: true }).filter(s => s.lane === 'fight')).toEqual([])
    expect(duelPlan(T0 + 3_600_000, 1).on).toBe(false)
  })
})

test('fight level: one act at a time at every level: no two slots of a director overlap (with their breath)', () => {
  for (const level of FIGHT_LEVELS) at(level, () => {
    for (const working of [true, false]) {
      for (const d of [buildDirector({ dayOffsetMs: 0 }), crabDirector(T0)]) {
        const l = d.plan(T0, T0 + DAY, { working })
        l.slice(1).forEach((s, i) => expect(s.startAt, `${level} ${working} ${s.id} after ${(l[i] as Slot).id}`).toBeGreaterThanOrEqual((l[i] as Slot).endAt + 10_000))
      }
    }
  })
})

test('fight level: a frequent fight never lands on a job-start act: none from 5 s before a job to 90 s after it (rare unchanged)', () => {
  at('often', () => {
    const f = fights(two(), true)[5] as Slot
    setJobStart(f.startAt - 10_000)
    try {
      expect(fights(two(), true).some(s => s.startAt === f.startAt), 'dropped').toBe(false)
      expect(fights(two(), true).length).toBeGreaterThan(100)
    } finally { setJobStart(undefined) }
    expect(fights(two(), true).some(s => s.startAt === f.startAt)).toBe(true)
  })
  at('rare', () => {
    const f = fights(two(), true)[3] as Slot
    setJobStart(f.startAt - 10_000)
    try { expect(fights(two(), true).some(s => s.startAt === f.startAt)).toBe(true) } finally { setJobStart(undefined) }
  })
})

// ---------------------------------------------------------------- the command, and the setting surviving a restart
const NOW = Date.parse('2026-10-20T10:00:00Z')
const base = (on: On, kv: Map<string, unknown>) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  on('store.get', async (_$, e) => ({ value: kv.get(String((e as { key: string }).key)) }) as never)
  on('store.set', async (_$, e) => { kv.set(String((e as { key: string }).key), (e as { value: unknown }).value); return { value: undefined } as never })
  on('store.delete', async (_$, e) => { kv.delete(String((e as { key: string }).key)); return { value: undefined } as never })
  on('store.keys', async () => ({ value: [...kv.keys()] }) as never)
  on('settings.read', async () => ({ value: {} }) as never)
  on('tool.register', async () => ({ value: undefined }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
  on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
  on('ui.panes', async () => ({ value: [] }) as never)
  on('ui.toast', async () => ({ value: undefined }) as never)
  on('audio.play', async () => ({ value: undefined }) as never)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: 100_000 }, rateLimits: [], cost: { usd: 1.23 } } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  return clock
}
const say = async ($: Engine, args: string): Promise<string> => String(((await $.command.run({ command: 'missioncontrol', args } as never)) as { text?: string }).text)

test('fight level: /missioncontrol fights shows it, sets it, saves it; a bad word changes nothing', async ($, on) => {
  const kv = new Map<string, unknown>()
  base(on, kv)
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  expect(await say($, 'fights')).toMatch(/^Fights: often \(a fight every 7-10 min while a job runs, every 15-20 min at rest\)/)
  expect(await say($, 'fights sometimes')).toMatch(/is not a level/)
  expect(await say($, 'fights rare')).toBe('Fights: rare (a fight every 30-45 min while a job runs).')
  expect(kv.get('fightLevel'), 'saved in the store').toBe('rare')
  expect(await say($, 'fights')).toMatch(/^Fights: rare/)
  expect(await say($, 'fights off')).toMatch(/^Fights: off \(none by themselves; \/missioncontrol play <name> still replays one\)/)
  expect(await say($, 'fights often')).toMatch(/^Fights: often/)
})

test('fight level: the saved level survives a restart (read from the store at session start)', async ($, on) => {
  base(on, new Map<string, unknown>([['fightLevel', 'normal']]))
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  expect(await say($, 'fights')).toMatch(/^Fights: normal \(a fight every 15-20 min while a job runs\)/)
})
