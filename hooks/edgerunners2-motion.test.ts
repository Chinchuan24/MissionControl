import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { DUET_SEED, GLITCH_SEED, duetPlan, glitchPlan } from './edgerunners2-duet'
import { hackPlan } from './edgerunners2-hack'
import { CAPRI_WORD_RE, HI_CAPRI_RE } from './edgerunners2'
import { ACT_MS, CAPRI_SWITCH, D_SWITCH, bandRegion, capriDirector, capsuleTurn, dDirector, er2FightBand, er2FightPane, heartbeat, hudAct, psychoAct, setEr2Play, slateAct, tapeLayer } from './edgerunners2-motion'
import { roamOptsOf } from './overlay'
import { roamPlan } from './roamer'
import { audit, BUDGET } from './stage/budget'
import { playsOf, runPlay } from './stage/replay'
import { Act } from './stage/timeline'
import { skinSwitch } from './stage/wipe'
import { THEMES } from './themes'

const BASE = Date.parse('2026-10-20T10:00:00Z')
const DAY = 86_400_000
const W = 1149
const H = 169
const clean = (svg: string): void => {
  const a = audit(svg)
  expect(a.dupes).toEqual([])
  expect(a.badText).toEqual([])
  expect(a.dupeIds).toEqual([])
}

// ---------------------------------------------------------------- the fights
test('fights: each director fires only while a job works, at most one per 30-45 min, and the two modes never share a schedule', () => {
  for (const dir of [dDirector(0), capriDirector(0)]) {
    const plan = dir.plan(BASE, BASE + DAY, { working: true })
    expect(plan.length).toBeGreaterThanOrEqual(30)
    expect(plan.length).toBeLessThanOrEqual(50)
    for (let i = 1; i < plan.length; i++) expect((plan[i] as { startAt: number }).startAt - (plan[i - 1] as { startAt: number }).startAt).toBeGreaterThanOrEqual(30 * 60_000)
    expect(dir.plan(BASE, BASE + DAY, { working: false })).toEqual([])
  }
  const d = dDirector(0).plan(BASE, BASE + DAY, { working: true }).map(s => s.startAt)
  const c = capriDirector(0).plan(BASE, BASE + DAY, { working: true }).map(s => s.startAt)
  expect(d).not.toEqual(c)
})

test('fights: replay names on both skin ids; a play draws the act on the band, idle or working, and ends on time', async () => {
  for (const skin of ['edgerunners-2', 'capricorn']) expect(playsOf(skin).map(p => p.name)).toEqual(expect.arrayContaining(['cyberpsycho', 'capri-vs-d', 'slate', 'cut']))
  const at = BASE + 1234
  expect(await runPlay('edgerunners-2', 'cyberpsycho', at)).toBe('▶ cyberpsycho')
  expect(er2FightBand(W, H, at + 100, false, false)).toContain('<!--dl-->')
  expect(er2FightBand(W, H, at + ACT_MS.cyberpsycho + 10, false, false)).toBe('')
  expect(er2FightBand(W, H, at + 100, false, true)).toBe('') // the D fight never draws in CAPRI mode
  await runPlay('capricorn', 'capri-vs-d', at)
  expect(er2FightBand(W, H, at + 100, false, true)).toContain('<!--dl-->')
  setEr2Play(undefined)
})

test('fights: in budget (band cut and pane echo), no duplicate attributes or ids, escaped text, a reduced-motion still', () => {
  const r = bandRegion(W, H)
  // The region never reaches the readouts on the right nor the rows below the title.
  expect(r.x + r.w).toBeLessThanOrEqual(W * 0.65)
  expect(r.y + r.h).toBeLessThanOrEqual(110)
  for (const a of [psychoAct({ at: BASE, w: r.w, h: r.h, id: 't-psy' }), hudAct({ at: BASE, w: r.w, h: r.h, id: 't-hud' })]) {
    expect(a.act.bank.count()).toBeLessThanOrEqual(10)
    expect(audit(`<svg xmlns="http://www.w3.org/2000/svg">${a.layer}</svg>`).chars).toBeLessThan(BUDGET.fightBand.band)
    expect(a.layer).toContain('prefers-reduced-motion')
    clean(`<svg xmlns="http://www.w3.org/2000/svg">${a.layer}</svg>`)
    // hit-stop, an impact frame and the cut-in before the big hit
    expect(a.fight.hits.length).toBeGreaterThanOrEqual(1)
    expect(a.fight.script.map(s => s[0])).toEqual(expect.arrayContaining(['hit', 'freeze', 'impact']))
  }
  const psy = psychoAct({ at: BASE, w: r.w, h: r.h, id: 't-psy2' })
  // the cut-in (1.45 s) comes before the big hit (the kick, 2.3 s)
  expect(psy.fight.hits.map(h => h.t)).toEqual([2.15, 2.3])
  expect(psy.layer).toContain('CUT!')
  expect(psy.layer).toContain('SC.85')
  setEr2Play({ kind: 'cyberpsycho', at: BASE })
  const pane = er2FightPane('log', 600, 214, BASE + 500, false, false)
  expect(pane.length).toBeGreaterThan(1000)
  expect(pane).toContain('CUT!')
  expect(pane.length).toBeLessThan(12_000) // a light echo: the pane keeps its layout (no reserve)
  setEr2Play({ kind: 'capri-vs-d', at: BASE })
  const hp = er2FightPane('cred', 600, 600, BASE + 500, false, true)
  expect(hp.length).toBeGreaterThan(1000)
  expect(hp.length).toBeLessThan(8_000)
  setEr2Play(undefined)
})

// ---------------------------------------------------------------- the calm-down, over a simulated day
const er2 = THEMES.edgerunners2.roamer as NonNullable<(typeof THEMES.edgerunners2)['roamer']>
const roamFor = (ctx: number) => (t: number) => roamPlan(er2.seed, t, roamOptsOf(er2, ctx))
const N = (2 * DAY) / 30_000
test('calm: D mode has one Capri event in about 13 windows under 85% (a surprise), one in four from 85%, most from 95%; one event per window', () => {
  const share = (ctx: number) => {
    let any = 0
    for (let i = 0; i < N; i++) {
      const t = BASE + i * 30_000
      const roam = roamFor(ctx)(t)
      const duet = duetPlan(DUET_SEED, t, ctx, roamFor(ctx))
      // her lines alone yield to a duet (themes.ts `taken`)
      const hack = !roam.on && duet.on ? { on: false } : hackPlan(`${er2.seed}|hack`, t, ctx, false, roam)
      if (duet.on) expect(roam.on).toBeFalsy()
      if (roam.on || hack.on || duet.on) any++
    }
    return any / N
  }
  const low = share(30)
  expect(low).toBeGreaterThan(0.04)
  expect(low).toBeLessThan(0.1) // was 0.63 at the audit, 0.2 after wave 1
  expect(share(88)).toBeGreaterThan(low * 2)
  expect(share(96)).toBeGreaterThan(0.55)
})

test('calm: CAPRI mode glitches and hack lines are a surprise too, and never share a window', () => {
  const share = (ctx: number) => {
    let any = 0
    for (let i = 0; i < N; i++) {
      const t = BASE + i * 30_000
      const hack = hackPlan('capricorn|hack', t, ctx, true, null)
      const g = glitchPlan(GLITCH_SEED, t, ctx, w0 => hackPlan('capricorn|hack', w0, ctx, true, null).on)
      if (hack.on) expect(g.events).toEqual([])
      if (hack.on || g.events.length) any++
    }
    return any / N
  }
  const low = share(30)
  expect(low).toBeGreaterThan(0.1)
  expect(low).toBeLessThan(0.3) // was about 0.75 (glitch .5 + hack .45)
  expect(share(96)).toBeGreaterThan(share(88))
})

// ---------------------------------------------------------------- the pieces
test('pieces: slate, tape, capsule, heartbeat and both switch flavours are clean, small and still under reduced motion', () => {
  const slate = slateAct({ at: BASE, take: 3, scene: 11, x: 60, y: 30 })
  expect(slate).toContain('TAKE 3')
  expect(slate.length).toBeLessThan(6000)
  const tape = tapeLayer({ vx: 14, vy: 38, vw: 212, vh: 162, gx: 280, gr: 580, axY: 190, live: true, working: true, at: BASE + 100, beatAt: BASE, doneAt: BASE, color: '#BFD8FF', dim: '#7A8AA8' })
  expect(tape).toContain('REW')
  expect(tape).toContain('CUT!')
  expect(tape).toMatch(/prefers-reduced-motion: reduce\)\{\.tp-run,\.tp-head\{animation:none/)
  // an old beat and no job done: only the running tape
  expect(tapeLayer({ vx: 14, vy: 38, vw: 212, vh: 162, gx: 280, gr: 580, axY: 190, live: true, working: true, at: BASE + 60_000, beatAt: BASE, color: '#BFD8FF', dim: '#7A8AA8' })).not.toContain('REW')
  const cap = capsuleTurn({ id: 'tcap', mx: 100, top: 72, floor: 222, R: 54, bx: 37, by: 76, bs: 3, head: true })
  expect(cap.length).toBeLessThan(26_000)
  expect(cap).toContain('prefers-reduced-motion')
  expect(heartbeat('M0 0H10', 96)).toContain('.75s')
  expect(heartbeat('M0 0H10', 30)).toContain('1.2s')
  for (const [k, fl] of [['d', D_SWITCH], ['c', CAPRI_SWITCH]] as const) {
    const band = skinSwitch({ W, H, at: BASE, surface: 'band', from: { bg: '#111', accent: '#F00' }, to: { bg: '#070A12', accent: '#3E80F7' }, flavour: fl })
    expect(band.length).toBeLessThan(BUDGET.wipe.band)
    clean(`<svg xmlns="http://www.w3.org/2000/svg" id="${k}">${band}</svg>`)
    const card = skinSwitch({ W: 600, H: 200, at: BASE, surface: 'pane', from: { bg: '#111', accent: '#F00' }, to: { bg: '#070A12', accent: '#3E80F7' }, flavour: fl, i: 1 })
    expect(card.length).toBeLessThan(BUDGET.wipe.card)
  }
  void Act
})

// ---------------------------------------------------------------- the trigger (audit bugs 5 and 7)
test('trigger: "hi capri" or "let capri in" lets her in; the bare word (capri pants, the island) never does', () => {
  for (const s of ['hi capri', 'Hi, Capri!', 'ok let capri in now']) expect(CAPRI_WORD_RE.test(s)).toBe(true)
  for (const s of ['capri pants for the summer', 'a trip to Capri', 'capricorn', 'capriccio']) expect(CAPRI_WORD_RE.test(s)).toBe(false)
  expect(CAPRI_WORD_RE.source).toContain(HI_CAPRI_RE.source)
})

// ---------------------------------------------------------------- the band with a fight playing, at several contexts
const base = (on: On, now: number, ctx: number) => {
  const clock = mock.clock(on, { now })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on)
  on('fs.exists', async (_$, e) => ({ value: /addons[\\/]cyberpunk[\\/]addon\.json$/.test(String((e as { path: string }).path)) }) as never)
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
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: ctx * 10_000 }, rateLimits: [] } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  return clock
}
const bandOf = async ($: Engine): Promise<string> => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: true, maxRows: 14, bodyColumns: 173 } as never })
  const all = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  await ui.unmount()
  return all
}
for (const [skin, play] of [['edgerunners-2', 'cyberpsycho'], ['capricorn', 'capri-vs-d']] as const)
  for (const ctx of play === 'cyberpsycho' ? [30, 88, 94] : [30, 88, 96])
  test(`band: ${play} playing at ${ctx}% context stays under the lite cut (120 k), the readouts drawn`, { timeoutMs: 120_000 }, async ($, on) => {
    {
      const clock = base(on, BASE + ctx * 1000, ctx)
      await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
      await $.command.run({ command: 'skin', args: skin } as never)
      await clock.advance(5000)
      await $.prompt.submit({ text: 'crack the case', cursor: 0 } as never)
      for (let i = 0; i < 4; i++) await $.agent.spawn({ tool_use_id: `t${i}`, prompt: 'p', description: `Engineer: piece ${i}`, subagentType: 'general-purpose', provider: 'engine', parentModel: 'x', background: false, fork: false } as never)
      await clock.advance(3000)
      await $.command.run({ command: 'missioncontrol', args: `play ${play}` } as never)
      await clock.advance(1500)
      const band = await bandOf($)
      expect(band).toContain('<!--dl-->')
      expect(band.length).toBeLessThan(120_000)
      expect(band).toMatch(/\d+%/)
      setEr2Play(undefined)
    }
  })
