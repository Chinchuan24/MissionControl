import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import { CYBER_SWITCH, ECHO_BOX, FIGHT_MS, MAXTAC_GAP_MS, boardroomAct, cyberFightBand, cyberFightEcho, fightAt, fightDirector, fightOn, fightRegion, iceAct, maxtacAct, maxtacClimb, resetMaxtac, setFightPlay } from './cyber-fights'
import { audit, BUDGET } from './stage/budget'
import { playsOf, runPlay } from './stage/replay'
import { skinSwitch } from './stage/wipe'

const BASE = Date.parse('2026-10-20T10:00:00Z')
const DAY = 86_400_000
const OW = 859
const clean = (svg: string): void => {
  const a = audit(svg)
  expect(a.dupes).toEqual([])
  expect(a.badText).toEqual([])
  expect(a.dupeIds).toEqual([])
}
const ACTS = [['maxtac', maxtacAct], ['boardroom', boardroomAct], ['ice-duel', iceAct]] as const

// ---------------------------------------------------------------- the right skin, rare, replayable
test('cyber fights: each fires on its own skin only (2077 the raid, Arasaka the boardroom, Lucy the ICE duel; SAMURAI none)', async () => {
  const at = BASE + 777
  expect(await runPlay('cyberpunk-2077', 'maxtac', at)).toBe('▶ maxtac')
  expect(cyberFightBand('runners', OW, at + 100, false)).toContain('MAXTAC: /compact, CHOOM')
  for (const egg of ['corpo', 'netrun', 'samurai'] as const) expect(cyberFightBand(egg, OW, at + 100, false)).not.toContain('MAXTAC')
  await runPlay('arasaka', 'boardroom', at)
  expect(cyberFightBand('corpo', OW, at + 100, false)).toContain('TERMINATED')
  expect(cyberFightBand('runners', OW, at + 100, false)).toBe('') // the play is Arasaka's now; 2077 draws nothing at rest
  await runPlay('lucy-edgerunners', 'ice-duel', at)
  expect(cyberFightBand('netrun', OW, at + 100, false)).toContain('ICE BYPASSED')
  expect(cyberFightBand('netrun', OW, at + FIGHT_MS['ice-duel'] + 10, false)).toBe('') // ends on time
  expect(cyberFightBand('samurai', OW, at + 100, true)).toBe('')
  // each name is offered only where it plays
  expect(playsOf('cyberpunk-2077').map(p => p.name)).toContain('maxtac')
  expect(playsOf('arasaka').map(p => p.name)).toContain('boardroom')
  expect(playsOf('lucy-edgerunners').map(p => p.name)).toContain('ice-duel')
  expect(playsOf('arasaka').map(p => p.name)).not.toContain('maxtac')
  expect(playsOf('samurai').map(p => p.name)).not.toContain('ice-duel')
  setFightPlay(undefined)
})

test('cyber fights: rare. Each director fires only while a job works, 30-45 min apart, each skin on its own schedule', () => {
  const plans = (['maxtac', 'boardroom', 'ice-duel'] as const).map(k => fightDirector(k, 0).plan(BASE, BASE + DAY, { working: true }).map(s => s.startAt))
  for (const k of ['maxtac', 'boardroom', 'ice-duel'] as const) {
    const plan = fightDirector(k, 0).plan(BASE, BASE + DAY, { working: true })
    expect(plan.length).toBeGreaterThanOrEqual(30)
    expect(plan.length).toBeLessThanOrEqual(50)
    for (let i = 1; i < plan.length; i++) expect((plan[i] as { startAt: number }).startAt - (plan[i - 1] as { startAt: number }).startAt).toBeGreaterThanOrEqual(30 * 60_000)
    expect(fightDirector(k, 0).plan(BASE, BASE + DAY, { working: false })).toEqual([])
  }
  expect(plans[0]).not.toEqual(plans[1])
  expect(plans[1]).not.toEqual(plans[2])
  // never at rest: a whole idle day draws no fight on any skin
  setFightPlay(undefined)
  let any = 0
  for (let t = BASE; t < BASE + DAY; t += 60_000) if (fightOn('runners', t, false) || fightOn('corpo', t, false) || fightOn('netrun', t, false)) any++
  expect(any).toBe(0)
})

test('cyber fights: the raid also rolls in on the climb past 95% context, at most once per 30 min', () => {
  resetMaxtac()
  setFightPlay(undefined)
  const t = BASE + 3_000
  expect(maxtacClimb(t)).toBe(true)
  const f = fightAt('runners', t + 400, false)
  expect(f?.kind).toBe('maxtac')
  expect(cyberFightBand('runners', OW, t + 1000, false)).toContain('MAXTAC')
  // a second climb ten minutes later is quiet; one after the gap rolls again
  expect(maxtacClimb(t + 10 * 60_000)).toBe(false)
  expect(maxtacClimb(t + MAXTAC_GAP_MS + 1)).toBe(true)
  // never on another skin
  expect(fightAt('corpo', t + 400, false)?.kind).not.toBe('maxtac')
  setFightPlay(undefined)
  resetMaxtac()
})

// ---------------------------------------------------------------- budgets, still frames, the beats
test('cyber fights: each band cut in budget (<= 32 k, <= 10 poses), clean, escaped, with a reduced-motion still', () => {
  const r = fightRegion(OW)
  for (const [name, f] of ACTS) {
    const a = f({ at: BASE, w: r.w, h: r.h, id: `t-${name}` })
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">${a.layer}</svg>`
    expect(audit(svg).chars).toBeLessThan(BUDGET.fightBand.band)
    expect(a.act.bank.count()).toBeLessThanOrEqual(10)
    expect(a.layer).toContain('prefers-reduced-motion')
    clean(svg)
    // hit-stop and an impact frame on the big hit; the act covers every freeze
    expect(a.fight.script.map(s => s[0])).toEqual(expect.arrayContaining(['hit', 'freeze', 'impact']))
    // the act outlasts its last piece once the hit-stops push it (else the scrim would fade all act)
    expect(a.act.warp(name === 'boardroom' ? 6.05 : 5.45)).toBeLessThan(a.act.T)
  }
  // the raid: the cut-in (1.75 s) comes before the finisher (2.86 s); one trooper is knocked down
  const raid = maxtacAct({ at: BASE, w: r.w, h: r.h, id: 't-raid' })
  expect(raid.fight.hits.map(h => h.t)[0]).toBe(2.86)
  expect(raid.fight.script.filter(s => s[0] === 'knockback').length).toBe(1)
  expect(raid.layer).toContain('SANDEVISTAN')
  // the stand-off uses the stand-off beats before its one strike
  const board = boardroomAct({ at: BASE, w: r.w, h: r.h, id: 't-board' })
  const beats = board.fight.script.map(s => s[0])
  for (const b of ['stare', 'step', 'flinch', 'backdown']) expect(beats).toContain(b)
  expect(beats.indexOf('backdown')).toBeLessThan(beats.indexOf('strike'))
  expect(beats.filter(b => b === 'strike').length).toBe(1)
  // the duel: a setback first (she is hit), then the lash cracks the ICE
  const ice = iceAct({ at: BASE, w: r.w, h: r.h, id: 't-ice' })
  expect(ice.fight.hits.map(h => h.who)).toEqual(['l', 'ice'])
  expect(ice.layer).toContain('MONOWIRE')
})

test('cyber fights: Arasaka never glitches (no RGB split, no tear, no jitter in its fight or its switch)', () => {
  const r = fightRegion(OW)
  const board = boardroomAct({ at: BASE, w: r.w, h: r.h, id: 't-board2' }).layer
  for (const bad of ['#00F0FF', '#FF003C', 'feColorMatrix', 'feTurbulence', 'skewX', 'GLITCH']) expect(board).not.toContain(bad)
  const sw = skinSwitch({ W: OW, H: 204, at: BASE, surface: 'band', from: { bg: '#000', accent: '#0FF', ink: '#FFF' }, to: { bg: '#0B0B0E', accent: '#E3001B', ink: '#ECECEC' }, flavour: CYBER_SWITCH.corpo })
  for (const bad of ['#00F0FF', 'feColorMatrix', 'skewX']) expect(sw).not.toContain(bad)
})

test('cyber fights: the band region keeps under the header line, left of the gauge percent and the readouts, above the crew row', () => {
  for (const w of [500, 640, 859, 1100]) {
    const r = fightRegion(w)
    expect(r.x + r.w).toBeLessThanOrEqual(Math.max(228, w - 344)) // the gauge's percent sits at w - 334
    expect(r.x + r.w).toBeLessThanOrEqual(360) // the breach ticker never starts before ~369
    // the header (its chips, the model, the CYBERPSYCHOSIS / MAXTAC chip from 85%) ends at ~31: never covered, at any context
    expect(r.y).toBeGreaterThanOrEqual(33)
    expect(r.y + r.h).toBeLessThanOrEqual(81) // the line over CREW is at 82.5
    // the real band's stage (stage/keep.ts) narrows it to the clear span, and its readouts become holes in the clip
    expect(fightRegion(w, { x1: 200, keep: [] }).w).toBe(192)
  }
  setFightPlay({ kind: 'maxtac', at: BASE })
  const cut = cyberFightBand('runners', OW, BASE + 100, false, { x1: 300, keep: [[200, 40, 80, 21]] })
  expect(cut).toContain('clip-rule="evenodd" d="M8 34h292v46h-292zM200 40h80v21h-80z"')
  setFightPlay(undefined)
  // the cut fits its budget in the region
  const r = fightRegion(OW)
  for (const [name, f] of ACTS) expect(audit(`<svg xmlns="http://www.w3.org/2000/svg">${f({ at: BASE, w: r.w, h: r.h, id: `t-r-${name}` }).layer}</svg>`).chars).toBeLessThan(BUDGET.fightBand.band)
})

test('cyber fights: the pane echo is light, sits in the breach matrix only, and ends with its fight', () => {
  for (const [kind, egg, word] of [['maxtac', 'runners', 'CHOOM'], ['boardroom', 'corpo', 'TERMINATED'], ['ice-duel', 'netrun', 'ICE BYPASSED']] as const) {
    setFightPlay({ kind, at: BASE })
    const e = cyberFightEcho(egg, BASE + 500, false)
    expect(e).toContain(word)
    expect(e.length).toBeLessThan(8_000)
    expect(e).toContain(`translate(${ECHO_BOX.x} ${ECHO_BOX.y})`)
    clean(`<svg xmlns="http://www.w3.org/2000/svg">${e}</svg>`)
    expect(cyberFightEcho(egg, BASE + FIGHT_MS[kind] + 10, false)).toBe('')
  }
  // the matrix box ends before the buffer column (eggs.ts: bx = 18 + 160 + 36)
  expect(ECHO_BOX.x + ECHO_BOX.w).toBeLessThan(214)
  setFightPlay(undefined)
})

test('cyber fights: each skin flavours the switch (2077 jack-in with its emblem, Arasaka shutters, Lucy dive), in budget', () => {
  for (const egg of ['runners', 'corpo', 'netrun'] as const) {
    const f = CYBER_SWITCH[egg]
    expect(f).toBeDefined()
    const band = skinSwitch({ W: OW, H: 204, at: BASE, surface: 'band', from: { bg: '#000', accent: '#0FF', ink: '#FFF' }, to: { bg: '#111', accent: '#FF0', ink: '#FFF' }, ...(f ? { flavour: f } : {}) })
    const card = skinSwitch({ W: 580, H: 132, at: BASE, surface: 'pane', i: 1, from: { bg: '#000', accent: '#0FF', ink: '#FFF' }, to: { bg: '#111', accent: '#FF0', ink: '#FFF' }, ...(f ? { flavour: f } : {}) })
    expect(band.length).toBeLessThan(BUDGET.wipe.band)
    expect(card.length).toBeLessThan(BUDGET.wipe.card)
    clean(`<svg xmlns="http://www.w3.org/2000/svg">${band}${card}</svg>`)
    expect(band).toContain('prefers-reduced-motion')
  }
  expect(CYBER_SWITCH.samurai).toBeUndefined()
})

// ---------------------------------------------------------------- mounted: the 95% climb and a replay draw on the real band
const base = (on: On, now: number, tokens: number) => {
  const clock = mock.clock(on, { now })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on)
  on('fs.exists', async (_$, e) => ({ value: /addons[\\/]cyberpunk[\\/]addon\.json$/.test(String((e as { path: string }).path)) }) as never)
  on('settings.read', async () => ({ value: {} }) as never)
  on('tool.register', async () => ({ value: undefined }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
  on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
  on('ui.panes', async () => ({ value: [] }) as never)
  on('ui.toast', async () => ({ value: undefined }) as never)
  on('audio.play', async () => ({ value: undefined }) as never)
  on('tool.call', async () => ({ result: 'ok' }) as never)
  on('prompt.submit', async (_$, e) => ({ text: (e as { text: string }).text }) as never)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens }, rateLimits: [], cost: { usd: 1 } } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  on('turn.step', async function* () {
    return { turnId: 'turn', index: 0, answer: '', toolUses: [], stopReason: 'tool_use', usage: { model: 'claude-opus-5-5', input_tokens: tokens, output_tokens: 10 } } as never
  })
  return clock
}
const band = async ($: Parameters<Parameters<typeof test>[2]>[0]): Promise<string> => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: true, maxRows: 14, bodyColumns: 126 } as never })
  const src = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  await ui.unmount()
  return src
}

test('cyber fights: on 2077 the climb past 95% context rolls the raid onto the band; under 95% it does not', { timeoutMs: 60_000 }, async ($, on) => {
  resetMaxtac()
  setFightPlay(undefined)
  const clock = base(on, BASE, 960_000)
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  await $.command.run({ command: 'skin', args: 'cyberpunk-2077' } as never)
  await clock.advance(2_000)
  await $.prompt.submit({ text: 'Night City sweep', cursor: 0 } as never)
  const stream = ($.turn.step as (e: unknown) => AsyncIterable<unknown>)({ turnId: 'turn', index: 0, model: 'claude-opus-5-5', messageCount: 1 })
  for await (const _ of stream) void _
  await clock.advance(1_500)
  const src = await band($)
  expect(src).toContain('MAXTAC: /compact, CHOOM')
  // the band stays a full drawing under its lite cut with the raid on it
  expect(src.length).toBeLessThan(120_000)
  setFightPlay(undefined)
  resetMaxtac()
})

test('cyber fights: under 95% context no raid rolls in', { timeoutMs: 60_000 }, async ($, on) => {
  resetMaxtac()
  setFightPlay(undefined)
  const clock = base(on, BASE + 2 * DAY, 900_000)
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  await $.command.run({ command: 'skin', args: 'cyberpunk-2077' } as never)
  await clock.advance(2_000)
  await $.prompt.submit({ text: 'Night City sweep', cursor: 0 } as never)
  const stream = ($.turn.step as (e: unknown) => AsyncIterable<unknown>)({ turnId: 'turn', index: 0, model: 'claude-opus-5-5', messageCount: 1 })
  for await (const _ of stream) void _
  await clock.advance(1_500)
  expect(await band($)).not.toContain('MAXTAC: /compact')
  setFightPlay(undefined)
})
