// The four classic Cyberpunk skins' own motion (cyber-motion.ts): what each builds, that it fires when it should and
// never on a normal prompt, its still frame, its size, its cadence, and Arasaka's "no noise" fix.
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { ACT_MS, IDLE_CSS, WAKE_SAMURAI_RE, bossIdle, city, diveAct, gigAct, hankoCheer, idScan, moon, moonCheer, playing, preemCheer, relic, samuraiDirector, sandevistanAct, setCyberPlay, shockCheer, stage, tower } from './cyber-motion'
import { audit, BUDGET, doc } from './stage/budget'
import { DAY } from './stage/director'
import { playsOf, runPlay } from './stage/replay'

const T0 = Date.parse('2026-10-20T10:00:00Z')
const clean = (svg: string) => {
  const a = audit(doc(900, 204, svg))
  expect(a.dupes).toEqual([])
  expect(a.badText).toEqual([])
  expect(a.dupeIds).toEqual([])
  return a
}
// Idle loops are stepped and filter-free: every animation names steps(), and no filter attribute rides on them.
const stepped = (css: string) => {
  for (const m of css.matchAll(/animation:([^;}]+)/g)) expect(`${m[1]}`).toMatch(/steps\(|^\s*none/)
}

test('2077: Night City in three depths and rain, stepped, inside the parallax budget', () => {
  const sky = city({ id: 'cpsk', W: 900, y: 180, h: 22 })
  const a = clean(`<style>${sky.css}</style>${sky.svg}`)
  expect(a.chars).toBeLessThanOrEqual(BUDGET.parallax.band)
  expect(a.reduced).toBe(true)
  stepped(sky.css)
  expect(sky.svg).not.toContain('filter')
  // Four layers: far, mid (the neon), near, rain.
  expect((sky.svg.match(/<pattern /g) ?? []).length).toBe(4)
})

test('Arasaka: the tower turns in 3D with a light climbing it; the ID scan is eased, stepped and under budget', () => {
  const t = tower({ id: 'artw', x: 640, y: 200, sc: 0.75 })
  const ta = clean(`<style>${t.css}</style>${t.svg}`)
  expect(ta.chars).toBeLessThanOrEqual(BUDGET.turnaround.band)
  stepped(t.css)
  const s = idScan({ W: 900, H: 204, tick: { x: 880, y: 196 }, font: 'sans-serif' })
  const sa = clean(`<style>${s.css}</style>${s.svg}`)
  expect(sa.chars).toBeLessThanOrEqual(BUDGET.light.band + 600)
  expect(s.svg).toContain('ID VERIFIED')
  stepped(s.css)
  // Every 12 s: one loop of 12 s.
  expect(s.css).toContain('arscan 12s')
})

test('Lucy: the moon turns (4 views on the band, 8 in the pane); the dive has a faint-grid still', () => {
  const m4 = moon({ id: 'lumn', x: 500, y: 190, sc: 0.5 })
  expect(clean(`<style>${m4.css}</style>${m4.svg}`).chars).toBeLessThanOrEqual(BUDGET.turnaround.band)
  expect(m4.bank.count()).toBe(4)
  const m8 = moon({ id: 'lupm', x: 500, y: 40, sc: 1.1, views: [0, 1, 2, 3, 4, 5, 6, 7] })
  expect(clean(`<style>${m8.css}</style>${m8.svg}`).chars).toBeLessThanOrEqual(BUDGET.turnaround.card)
  const d = clean(diveAct({ at: T0, W: 900, H: 204, y: 86, h: 118 }))
  expect(d.reduced).toBe(true)
  expect(d.chars).toBeLessThan(6_000)
})

test('SAMURAI: the stage (lights, crowd on the beat) and the Relic chip are stepped and cheap; the beat doubles at work', () => {
  const rest = stage({ id: 'smst', W: 900, y: 174, h: 28, working: false, lamps: [540, 684] })
  const work = stage({ id: 'smst', W: 900, y: 174, h: 28, working: true, lamps: [540, 684] })
  // The stage replaces the old static cones and skyline props: about a turnaround's weight.
  expect(clean(`<style>${rest.css}</style>${rest.svg}`).chars).toBeLessThanOrEqual(BUDGET.turnaround.band)
  expect(rest.svg).toContain('smstb 1s')
  expect(work.svg).toContain('smstb 0.5s')
  stepped(rest.css)
  const r = relic({ id: 'smrc', x: 850, y: 190, sc: 0.55 })
  expect(clean(`<style>${r.css}</style>${r.svg}`).chars).toBeLessThanOrEqual(BUDGET.turnaround.band)
  expect(r.bank.count()).toBe(5)
})

test('every act is clean, has its still frame and stays inside a band cut', () => {
  const o = { at: T0, W: 900, H: 204, font: 'sans-serif' }
  const sv = sandevistanAct({ ...o, fig: 'cbfig', fx: 0, fy: 0 })
  const g = gigAct({ ...o, john: { x: 38, y: 56 }, fig: { x: 26, y: 22 }, strip: { y: 178, h: 26 } })
  for (const [name, svg] of [['sandevistan', sv.bg + sv.fg], ['preem', preemCheer(o)], ['hanko', hankoCheer(o)], ['moon', moonCheer(o)], ['shockwave', shockCheer(o)], ['gig', g.bg + g.fg]] as const) {
    const a = clean(svg)
    expect([name, a.reduced]).toEqual([name, true])
    expect([name, a.chars <= BUDGET.fightBand.band]).toEqual([name, true])
  }
  // Each skin its own cheer: no two share their words or marks.
  expect(preemCheer(o)).toContain('>P<')
  expect(hankoCheer(o)).toContain('完了')
  expect(moonCheer(o)).toContain('TO THE MOON')
  expect(shockCheer(o)).toContain('NEVER FADE AWAY')
  for (const c of [preemCheer(o), hankoCheer(o), moonCheer(o), shockCheer(o)]) expect(c).not.toContain('class="flash"')
})

test('the sprite idles: each boss its own few pixels, toggled by stepped loops', () => {
  for (const egg of ['runners', 'netrun', 'corpo', 'samurai'] as const) {
    const d = bossIdle(egg, true)
    expect(d.length).toBeGreaterThan(40)
    expect(d.length).toBeLessThanOrEqual(BUDGET.idle.band * 2)
  }
  // David's optics light only while he works; Johnny strums on the beat at work.
  expect(bossIdle('runners', false)).not.toContain('ibl')
  expect(bossIdle('runners', true)).toContain('ibl')
  expect(bossIdle('samurai', true)).toContain('ibw')
  expect(bossIdle('samurai', false)).not.toContain('ibw')
  stepped(IDLE_CSS)
  expect(IDLE_CSS).toContain('prefers-reduced-motion: reduce')
})

test('the "2023" gig: once a day at 20:23 local while a job works, never at rest', () => {
  const dir = samuraiDirector(8 * 3_600_000) // UTC+8
  const day0 = Date.parse('2026-10-20T00:00:00Z')
  const hits = dir.plan(day0, day0 + 14 * DAY, { working: true })
  expect(hits.length).toBe(14)
  for (const h of hits) {
    const local = new Date(h.startAt + 8 * 3_600_000)
    expect([local.getUTCHours(), local.getUTCMinutes()]).toEqual([20, 23])
    expect(h.endAt - h.startAt).toBe(ACT_MS.gig)
  }
  expect(dir.plan(day0, day0 + 14 * DAY, { working: false })).toEqual([])
  expect(dir.replays()).toEqual(['gig-2023'])
})

test('replays: every act has a name on its own skin, and a play pins it to now', async () => {
  expect(playsOf('cyberpunk-2077').map(p => p.name)).toEqual(['sandevistan', 'preem'])
  expect(playsOf('arasaka').map(p => p.name)).toEqual(['hanko'])
  expect(playsOf('lucy-edgerunners').map(p => p.name)).toEqual(['dive', 'to-the-moon'])
  expect(playsOf('samurai').map(p => p.name)).toEqual(['never-fade-away', 'gig-2023'])
  expect(await runPlay('cyberpunk-2077', 'sandevistan', T0)).toBe('▶ sandevistan')
  expect(playing('sandevistan', T0 + 500)).toBe(T0)
  expect(playing('sandevistan', T0 + ACT_MS.sandevistan + 10)).toBeUndefined()
  expect(await runPlay('arasaka', 'sandevistan', T0)).toBeUndefined()
  setCyberPlay(undefined)
})

test('"wake up, samurai" is the typed find, never the words apart', () => {
  for (const s of ['Wake up, Samurai.', 'wake up samurai', 'WAKE UP... SAMURAI!']) expect([s, WAKE_SAMURAI_RE.test(s)]).toEqual([s, true])
  for (const s of ['samurai', 'wake up', 'wake up the samurai', 'the samurai woke up', 'awake upsamurais']) expect([s, WAKE_SAMURAI_RE.test(s)]).toEqual([s, false])
})

// ---------------------------------------------------------------- mounted
const base = (on: On) => {
  const clock = mock.clock(on, { now: T0 })
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
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: 100_000 }, rateLimits: [] } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  return clock
}
const bandOf = async ($: Engine) => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: true, maxRows: 14, bodyColumns: 120 } as never })
  const s = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  await ui.unmount()
  return s
}
const paneOf = async ($: Engine) => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: { title: '', isFocused: false, bodyColumns: 90, placement: 'dock', scroll: { offset: 0, bodyRows: 60 }, view: {} } as never })
  const s = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  await ui.unmount()
  return s
}
const wear = async ($: Engine, skin: string) => {
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  await $.command.run({ command: 'skin', args: skin } as never)
}
const spawn = ($: Engine) => $.agent.spawn({ tool_use_id: 't1', prompt: 'p', description: 'Engineer: build', subagentType: 'general-purpose', provider: 'engine', parentModel: 'x', background: false, fork: false } as never)

test('Arasaka has no noise: no Relic tear on its title, no Sandevistan on Saburo, band or pane; its own scan and tower instead', async ($, on) => {
  const clock = base(on)
  await wear($, 'arasaka')
  await clock.advance(2_000)
  await $.prompt.submit({ text: 'Audit the floor', cursor: 0 } as never)
  await spawn($)
  await clock.advance(3_000)
  const band = await bandOf($)
  expect(band).not.toContain('class="rg"')
  expect(band).not.toContain('class="rgs"')
  expect(band).not.toContain('class="sandy"')
  expect(band).toContain('class="arscan"')
  expect(band).toContain('artwt')
  expect(band).toContain('ibC')
  const pane = await paneOf($)
  expect(pane).not.toContain('class="sandy"')
  expect(pane).toContain('arptt')
})

test('2077: Night City on the band and behind the crew; the Sandevistan plays when a job starts and only then', async ($, on) => {
  const clock = base(on)
  await wear($, 'cyberpunk-2077')
  await clock.advance(2_000)
  const idle = await bandOf($)
  expect(idle).toContain('cpskc1')
  expect(idle).not.toContain('cpsv0')
  await $.prompt.submit({ text: 'Build it', cursor: 0 } as never)
  await clock.advance(100)
  const start = await bandOf($)
  expect(start).toContain('cpsv0')
  expect(start).toContain('<use href="#cbfig"')
  // Still the Relic tear on 2077's title (it is its own); the trails while it works.
  expect(start).toContain('class="rg"')
  await spawn($)
  await clock.advance(3_000)
  const work = await bandOf($)
  expect(work).not.toContain('cpsv0')
  expect(work).toContain('class="sandy"')
  expect(work).toContain('class="sbob"')
  expect(work.length).toBeLessThan(120_000)
  expect(await paneOf($)).toContain('cppsc1')
})

test('Lucy: the dive on a job start, the faint Net floor while it works, the moon on band and pane', async ($, on) => {
  const clock = base(on)
  await wear($, 'lucy-edgerunners')
  await clock.advance(2_000)
  expect(await bandOf($)).toContain('lumnt')
  await $.prompt.submit({ text: 'Dive', cursor: 0 } as never)
  await clock.advance(100)
  const start = await bandOf($)
  expect(start).toMatch(/<!--dl--><g class="s[a-z0-9]{4}l"/)
  await spawn($)
  await clock.advance(3_000)
  const work = await bandOf($)
  expect(work).toContain('stroke="#FF5CF0" stroke-width=".8" opacity="0.08"')
  expect(await paneOf($)).toContain('lupmt')
})

test('SAMURAI: "wake up, samurai" on 2077 finds it; the stage plays; a normal prompt finds nothing', async ($, on) => {
  const clock = base(on)
  await wear($, 'cyberpunk-2077')
  await clock.advance(1_000)
  await $.prompt.submit({ text: 'fix the samurai sword bug, then wake up the build', cursor: 0 } as never)
  expect(await bandOf($)).not.toContain('smstb')
  await clock.advance(1_000)
  await $.prompt.submit({ text: 'Wake up, Samurai.', cursor: 0 } as never)
  await clock.advance(1_000)
  const band = await bandOf($)
  expect(band).toContain('SAMURAI')
  expect(band).toContain('smstb')
  expect(band).toContain('smrct')
})

test('each skin cheers its own way when a job is done', async ($, on) => {
  const clock = base(on)
  const marks: [string, string][] = [['cyberpunk-2077', 'JOB DONE, CHOOM'], ['arasaka', '完了'], ['lucy-edgerunners', 'TO THE MOON'], ['samurai', 'NEVER FADE AWAY']]
  for (const [skin, mark] of marks) {
    await wear($, skin)
    await $.prompt.submit({ text: 'Ship it', cursor: 0 } as never)
    await clock.advance(25_000)
    await $.turn.complete({ reason: 'answer', answer: 'done', text: 'done' } as never)
    await clock.advance(200)
    const band = await bandOf($)
    expect([skin, band.includes(mark)]).toEqual([skin, true])
    expect([skin, band.includes('class="flash"')]).toEqual([skin, false])
    await clock.advance(10_000)
  }
})
