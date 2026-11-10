// The shared replay registry (stage/replay.ts): every skin's fights get a `/missioncontrol play <name>`.
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { Director } from './director'
import { fightLane } from './choreo'
import { clearPlays, playOf, playsFrom, playsOf, registerPlay, runPlay } from './replay'

test('replay: register, list, run, replace; names are checked', async () => {
  clearPlays()
  const ran: number[] = []
  registerPlay(['sk-a', 'sk-b'], { name: 'raid', what: 'the raid', run: at => { ran.push(at) } })
  registerPlay('sk-a', { name: 'duel', what: 'the duel', run: () => 'Already dueling.' })
  expect(playsOf('sk-a').map(p => p.name)).toEqual(['raid', 'duel'])
  expect(playsOf('sk-b').map(p => p.name)).toEqual(['raid'])
  expect(playsOf('nobody')).toEqual([])
  expect(await runPlay('sk-b', 'RAID', 42)).toBe('▶ raid')
  expect(ran).toEqual([42])
  expect(await runPlay('sk-a', 'duel', 1)).toBe('Already dueling.')
  expect(await runPlay('sk-a', 'nope', 1)).toBeUndefined()
  registerPlay('sk-a', { name: 'raid', what: 'the raid, v2', run: () => undefined })
  expect(playsOf('sk-a').length).toBe(2)
  expect(playOf('sk-a', 'raid')?.what).toBe('the raid, v2')
  expect(() => registerPlay('sk-a', { name: 'Bad Name', what: '', run: () => undefined })).toThrow()
  clearPlays()
})

test('replay: a director\'s fights become plays that start the bit now', async () => {
  clearPlays()
  const dir = new Director('rp-test')
  fightLane(dir, [{ id: 'f-one', ms: 9000, replay: 'one' }, { id: 'f-two', ms: 7000 }])
  const got: { id: string; startAt: number; endAt: number }[] = []
  playsFrom('sk-f', dir, s => { got.push(s) }, n => `fight ${n}`)
  // fightLane names every fight (its id when no replay name is given): the plan's promise.
  expect(playsOf('sk-f').map(p => [p.name, p.what])).toEqual([['one', 'fight one'], ['f-two', 'fight f-two']])
  expect(await runPlay('sk-f', 'one', 1000)).toBe('▶ one')
  expect(got).toEqual([{ lane: 'fight', id: 'f-one', startAt: 1000, endAt: 10_000, src: 'replay' }])
  clearPlays()
})

const T0 = Date.parse('2026-10-19T10:00:00Z')
const base = (on: On) => {
  mock.clock(on, { now: T0 })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on)
  on('settings.read', async () => ({ value: {} }) as never)
  on('tool.register', async () => ({ value: undefined }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
  on('command.run', async () => ({ text: '' }) as never)
  on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
  on('ui.panes', async () => ({ value: [] }) as never)
  on('ui.toast', async () => ({ value: undefined }) as never)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: 100_000 }, rateLimits: [] } }) as never)
  on('session.cwd', async () => ({ value: '/repo' }) as never)
  on('fs.exists', async () => ({ value: false }) as never)
  on('fs.list', async () => ({ value: [] }) as never)
  on('fs.read', async () => ({ value: '' }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
}
const cmd = async ($: Engine, command: string, args: string) => String(((await $.command.run({ command, args } as never)) as { text?: string }).text)

// The plugin runs in its own module graph: a test cannot register into it, so this checks the command's old answers survive
// the shared registry being asked first (the registry's own behaviour is the two tests above).
test('replay: /missioncontrol play still answers for skins with no shared plays (Boys and Invincible lists unchanged)', async ($, on) => {
  base(on)
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  expect(await cmd($, 'skin', 'mentalist')).toContain('Mentalist')
  expect(await cmd($, 'missioncontrol', 'play duel')).toBe('Wear the Invincible skin first.')
  expect(await cmd($, 'skin', 'the-boys')).toContain('Skin:')
  const list = await cmd($, 'missioncontrol', 'play nope')
  expect(list).toContain('Play which? The Boys has')
  expect(list).toContain('ambush-a')
  expect(await cmd($, 'missioncontrol', 'play ambush-a')).toBe('▶ ambush-a')
})
