// Final review (wave 4): Chin asked for fights to "pop up more frequently and regularly for each of the skins". At the plugin's
// default level (`often`) every skin with a fight or a stand-off gets one at the new cadence: every 7-10 min while a job works,
// every 15-20 min at rest, over a simulated day (each skin's OWN director, its set pieces and roamers included), and on the REAL
// band (the plugin mounted, the skin worn, a job running: the act is drawn when its slot comes, and is gone at `fights off`).
// Plus what the higher rate must not break: one act at a time, nothing in a job's first moments, nothing through the skin switch.
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { DAY, MIN, fightLevel, localOffsetMs, setFightLevel, setJobStart, setSwitchHold } from './stage/director'
import type { Director, FightLevel, Slot } from './stage/director'
import { directorAt } from './theboys-director'
import { crabDirector } from './classics'
import { fightDirector } from './cyber-fights'
import { capriDirector, dDirector } from './edgerunners2-motion'
import { bcsDirector } from './bettercallsaul-extra'
import { mentDirector } from './mentalist-motion'
import { bbDirector, heisDirector } from './breakingbad-motion'
import { duelPlan } from './invincible-eggs'

const T0 = Date.parse('2026-10-20T00:00:00Z')
const OFF = localOffsetMs(T0)
const at = <T>(level: FightLevel, f: () => T): T => { const was = fightLevel(); setFightLevel(level); try { return f() } finally { setFightLevel(was) } }

/** Every skin with a fight or a stand-off, and its fights' slots in [t0, t1) as its own director plans them. */
type Plan = (t0: number, t1: number, working: boolean) => Slot[]
const lane = (d: () => Director, isFight: (s: Slot) => boolean = s => s.lane === 'fight'): Plan => (t0, t1, working) => d().plan(t0, t1, { working }).filter(isFight)
const inv = (era: 1 | 2): Plan => (t0, t1, working) => {
  const out: Slot[] = []
  for (let t = t0; t < t1; t += 30_000) { const p = duelPlan(t, era, working); if (p.on && p.startAt >= t0 && p.startAt < t1 && !out.some(s => s.startAt === p.startAt)) out.push({ lane: 'fight', id: String(p.v), startAt: p.startAt, endAt: p.endAt, src: 'lane' }) }
  return out
}
const boysFight = (s: Slot): boolean => (fightLevel() === 'rare' ? s.lane === 'ambush' && s.id === 'fight' : s.lane === 'fight')
const SKINS: { skin: string; what: string; plan: Plan }[] = [
  { skin: 'invincible', what: 'THE FIGHT', plan: inv(1) },
  { skin: 'invincible (new suit)', what: 'THE FIGHT / MARK VS CONQUEST', plan: inv(2) },
  // The Boys, SOLID GOLD and THIS MEANS NOIR share The Boys' director (their modes only grade the acts).
  // At often and normal their own fight lane; at rare THE AMBUSH's fight turn (theboys-director.ts `stageAt`).
  { skin: 'the-boys', what: 'the Boys fights', plan: lane(() => directorAt(T0), boysFight) },
  { skin: 'cyberpunk-2077', what: 'MAXTAC', plan: lane(() => fightDirector('maxtac')) },
  { skin: 'arasaka', what: 'the boardroom', plan: lane(() => fightDirector('boardroom')) },
  { skin: 'lucy-edgerunners', what: 'the ICE duel', plan: lane(() => fightDirector('ice-duel')) },
  { skin: 'edgerunners-2', what: 'cyberpsycho', plan: lane(() => dDirector(OFF)) },
  { skin: 'capricorn', what: 'capri-vs-d', plan: lane(() => capriDirector(OFF)) },
  { skin: 'better-call-saul', what: 'CHICANERY', plan: lane(() => bcsDirector(false)) },
  { skin: 'gene', what: 'CHICANERY', plan: lane(() => bcsDirector(true)) },
  { skin: 'mentalist', what: 'THE READ', plan: lane(() => mentDirector(OFF)) },
  { skin: 'breaking-bad', what: 'the desert stand-off', plan: lane(() => bbDirector(OFF)) },
  { skin: 'heisenberg', what: 'the desert stand-off', plan: lane(() => heisDirector(OFF)) },
  { skin: 'crab-classic', what: 'the claw-off', plan: lane(() => crabDirector(T0)) },
]
const gaps = (l: Slot[]): number[] => l.slice(1).map((s, i) => (s.startAt - (l[i] as Slot).startAt) / MIN)

test('every skin at often: a fight every 7-10 min over an 8 h working day and every 15-20 min over 16 h at rest', { timeoutMs: 60_000 }, () => {
  at('often', () => {
    for (const { skin, what, plan } of SKINS) {
      const work = plan(T0 + 8 * 3_600_000, T0 + 16 * 3_600_000, true)
      const rest = [...plan(T0, T0 + 8 * 3_600_000, false), ...plan(T0 + 16 * 3_600_000, T0 + DAY, false)]
      // 8 h at 7-10 min: 48-68 fights (a daily set piece or a higher lane may take a slot or two); 16 h at 15-20 min: 48-64.
      expect(work.length, `${skin} (${what}) working`).toBeGreaterThanOrEqual(44)
      expect(work.length, `${skin} working`).toBeLessThanOrEqual(69)
      expect(rest.length, `${skin} (${what}) at rest`).toBeGreaterThanOrEqual(44)
      expect(rest.length, `${skin} at rest`).toBeLessThanOrEqual(65)
      // Regular: never closer than the shortest gap; never more than two slots apart (one dropped slot at most).
      for (const g of gaps(work)) { expect(g, `${skin} working gap`).toBeGreaterThanOrEqual(7 - 0.01); expect(g, `${skin} working gap`).toBeLessThanOrEqual(20 + 0.01) }
      const restAm = rest.filter(s => s.startAt < T0 + 8 * 3_600_000)
      for (const g of gaps(restAm)) { expect(g, `${skin} rest gap`).toBeGreaterThanOrEqual(15 - 0.01); expect(g, `${skin} rest gap`).toBeLessThanOrEqual(40 + 0.01) }
    }
  })
})

test('every skin at often: one act at a time (no fight overlaps another act of its director), at rare the old 30-45 min', { timeoutMs: 60_000 }, () => {
  const dirs: [string, () => Director][] = [['the-boys', () => directorAt(T0)], ['crab', () => crabDirector(T0)], ['saul', () => bcsDirector(false)], ['gene', () => bcsDirector(true)], ['mentalist', () => mentDirector(OFF)], ['bb', () => bbDirector(OFF)]]
  for (const level of ['often', 'rare'] as const) at(level, () => {
    for (const [name, d] of dirs) for (const working of [true, false]) {
      const l = d().plan(T0, T0 + DAY, { working })
      l.slice(1).forEach((s, i) => expect(s.startAt, `${level} ${name} ${working}: ${s.id} after ${(l[i] as Slot).id}`).toBeGreaterThanOrEqual((l[i] as Slot).endAt))
    }
  })
  at('rare', () => {
    for (const { skin, plan } of SKINS) {
      const work = plan(T0, T0 + DAY, true)
      // The Boys at rare: THE AMBUSH's one turn in four, as before wave 4.
      expect(work.length, `${skin} rare`).toBeGreaterThanOrEqual(skin === 'the-boys' ? 6 : 26)
      expect(work.length, `${skin} rare`).toBeLessThanOrEqual(49)
      expect(plan(T0, T0 + DAY, false), `${skin} rare at rest: none`).toEqual([])
    }
  })
})

test('the skin switch holds the fights: none starts in its wipe, none of the new skin is under way through it', () => {
  at('often', () => {
    const d = (): Director => fightDirector('maxtac')
    const f = d().plan(T0, T0 + DAY, { working: true })[10] as Slot
    for (const sw of [f.startAt - 300, f.startAt + 2_000]) {
      setSwitchHold(sw - 1000, 2300)
      try { expect(d().plan(T0, T0 + DAY, { working: true }).some(s => s.startAt === f.startAt), `switch at ${sw - f.startAt} ms`).toBe(false) } finally { setSwitchHold(undefined) }
    }
    // A switch well away from it leaves it alone.
    setSwitchHold(f.startAt - 120_000, 2300)
    try { expect(d().plan(T0, T0 + DAY, { working: true }).some(s => s.startAt === f.startAt)).toBe(true) } finally { setSwitchHold(undefined) }
    // Invincible's cached plan follows the switch too (its cache key).
    const p = duelPlan(T0 + 5 * 3_600_000, 1)
    expect(p.on).toBe(true)
    setSwitchHold(p.startAt - 1000, 2300)
    try { expect(duelPlan(p.startAt + 500, 1).on && duelPlan(p.startAt + 500, 1).startAt === p.startAt).toBe(false) } finally { setSwitchHold(undefined) }
  })
})

// ---------------------------------------------------------------- on the REAL band: the plugin mounted, the skin worn, a job running
const NOW = Date.parse('2026-10-20T10:00:00Z')
const BAND = { hasSurvey: false, isWorking: true, maxRows: 14, bodyColumns: 173 } as const
const base = (on: On, skin: string) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on, { skin })
  on('fs.exists', async (_$, e) => ({ value: /addons[\\/]cyberpunk[\\/]addon\.json$/.test(String((e as { path: string }).path)) }) as never)
  on('settings.read', async () => ({ value: {} }) as never)
  on('tool.register', async () => ({ value: undefined }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
  on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
  on('ui.panes', async () => ({ value: [] }) as never)
  on('ui.toast', async () => ({ value: undefined }) as never)
  on('audio.play', async () => ({ value: undefined }) as never)
  on('tool.call', async () => ({ result: 'ok' }) as never)
  on('turn.complete', async () => ({ text: '' }) as never)
  on('prompt.submit', async (_$, e) => ({ text: (e as { text: string }).text }) as never)
  let n = 0
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: `a${++n}` }) as never)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: 200_000 }, rateLimits: [], cost: { usd: 2.5 } } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  return clock
}
const band = async ($: Engine, working = true): Promise<string> => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { ...BAND, isWorking: working } as never })
  const all = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  await ui.unmount()
  return all
}
/** The act layers a band draws (stage/timeline.ts `done()` marks each). */
const layers = (svg: string): string[] => [...svg.matchAll(/<!--dl-->([\s\S]*?)<!--\/dl-->|<!--dl-->([\s\S]{0,400})/g)].map(m => (m[1] ?? m[2] ?? '').slice(0, 400))

const E2E: { skin: string; plan: Plan }[] = [
  { skin: 'invincible', plan: inv(1) },
  { skin: 'the-boys', plan: lane(() => directorAt(NOW), boysFight) },
  { skin: 'cyberpunk-2077', plan: lane(() => fightDirector('maxtac')) },
  { skin: 'arasaka', plan: lane(() => fightDirector('boardroom')) },
  { skin: 'lucy-edgerunners', plan: lane(() => fightDirector('ice-duel')) },
  { skin: 'edgerunners-2', plan: lane(() => dDirector(OFF)) },
  { skin: 'capricorn', plan: lane(() => capriDirector(OFF)) },
  { skin: 'better-call-saul', plan: lane(() => bcsDirector(false)) },
  { skin: 'gene', plan: lane(() => bcsDirector(true)) },
  { skin: 'mentalist', plan: lane(() => mentDirector(OFF)) },
  { skin: 'breaking-bad', plan: lane(() => bbDirector(OFF)) },
  { skin: 'heisenberg', plan: lane(() => heisDirector(OFF)) },
  { skin: 'crab-classic', plan: lane(() => crabDirector(NOW)) },
]
for (const rest of [false, true]) for (const { skin, plan } of E2E)
  test(`every skin at often, on the real band: ${skin}'s first fight ${rest ? 'at rest' : 'of a job'} plays when its slot comes, and is gone at off`, { timeoutMs: 30_000 }, async ($, on) => {
    const clock = base(on, skin === 'heisenberg' ? 'breaking-bad' : skin)
    await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
    const said = String(((await $.command.run({ command: 'skin', args: skin } as never)) as { text?: string }).text)
    expect(said, `${skin} is worn`).toMatch(/^Skin: /)
    expect(String(((await $.command.run({ command: 'missioncontrol', args: 'fights' } as never)) as { text?: string }).text), 'the plugin default').toMatch(/^Fights: often/)
    await clock.advance(60_000) // past the skin switch
    // The plugin's engine is its own module instance: plan here with the same level and the same job start as the plugin.
    const was = fightLevel()
    setFightLevel('often')
    const t0 = NOW + 60_000
    if (!rest) {
      await $.prompt.submit({ text: 'crack the case', cursor: 0 } as never)
      setJobStart(t0)
      for (const [i, d] of ['Lead: run the case', 'Engineer: wire the parser'].entries()) await $.agent.spawn({ tool_use_id: `t${i}`, prompt: 'p', description: d, subagentType: 'general-purpose', provider: 'engine', parentModel: 'x', background: false, fork: false } as never)
    }
    // The first fight of the job (none in its first 90 s), within the first 12 minutes (the longest gap plus the breath); at rest
    // within 22 minutes.
    const f = rest ? plan(t0 + 30_000, t0 + 22 * MIN, false)[0] : plan(t0 + 90_000, t0 + 12 * MIN, true)[0]
    expect(f, `${skin}: a fight within ${rest ? 22 : 12} min`).toBeDefined()
    await clock.advance((f as Slot).startAt + 1_500 - t0)
    const live = await band($, !rest)
    const acts = layers(live)
    // The Boys' acts carry no layer marker of their own (theboys-acts.ts): the fight is the band's one big drawing then.
    if (skin !== 'the-boys') expect(acts.length, `${skin}: an act is drawn at ${(((f as Slot).startAt - t0) / MIN).toFixed(1)} min`).toBeGreaterThan(0)
    // The same moment at `off`: that act is not drawn (it was the fight).
    await $.command.run({ command: 'missioncontrol', args: 'fights off' } as never)
    const quiet = await band($, !rest)
    expect(quiet, `${skin}: the band at off differs`).not.toBe(live)
    // A fight is a big drawing (10-31 k chars): the band at off is that much lighter at the same moment.
    expect(live.length - quiet.length, `${skin}: the fight's weight`).toBeGreaterThan(6_000)
    expect(layers(quiet).some(l => acts.includes(l)), `${skin}: the fight's layer is gone at off`).toBe(false)
    await $.command.run({ command: 'missioncontrol', args: 'fights often' } as never)
    setFightLevel(was)
    setJobStart(undefined)
  })
