// Each hidden skin has its OWN secret flag (cred.found). Finding one never lights another skin's secret badge or button, and
// people who found things under the old shared `samurai` flag keep every unlock (cleanCred migrates it).
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { BADGES, BLANK_CRED, SECRET_IDS, award, anySecret, cleanCred, credFor, foundOf, secretFoundFor, withFound } from './extras'
import type { Cred } from './extras'
import { syncCard } from './edgerunners2-cards'
import { coverCard } from './invincible-cards'

// ---------------------------------------------------------------- the pure view
test('flags: each find sets only its own id; the shared samurai flag is never written', () => {
  for (const id of SECRET_IDS) {
    const c = withFound(BLANK_CRED, id)
    expect(c.found).toEqual([id])
    expect(c.samurai).toBe(false)
    for (const other of SECRET_IDS) if (other !== id) expect(foundOf(c, other)).toBe(false)
  }
  // Paid once: a second find of the same secret changes nothing.
  const once = withFound(BLANK_CRED, 'capricorn')
  expect(withFound(once, 'capricorn')).toBe(once)
})

test('flags: finding SAMURAI earns the cyberpunk secret badge only, not Capri\'s 0+2=1 nor Invincible\'s NEW SUIT', () => {
  const c = award(withFound(BLANK_CRED, 'samurai')).cred
  // The store's shared SAMURAI badge counts any secret (it is the cyberpunk cards' last badge)...
  expect(c.badges).toContain('samurai')
  expect(credFor(c, 'samurai').badges).toContain('samurai')
  expect(credFor(c, 'runners').samurai).toBe(true)
  // ...but every other skin's card sees its own secret only.
  for (const key of ['edgerunners2', 'capricorn', 'invincible', 'invincible2', 'mentalist', 'breakingbad', 'bettercallsaul']) {
    const v = credFor(c, key)
    expect(`${key}:${v.samurai}:${v.badges.includes('samurai')}`).toBe(`${key}:false:false`)
  }
  expect(syncCard(480, credFor(c, 'edgerunners2'), false)).not.toContain('0+2=1')
  expect(coverCard(480, credFor(c, 'invincible'), { era: 1 })).not.toContain('NEW SUIT')
  // The pane's two button gates read the per-skin flags.
  expect(foundOf(c, 'capricorn')).toBe(false)
  expect(foundOf(c, 'invincible2')).toBe(false)
})

test('flags: each skin\'s card lights its own secret badge when its own secret is found', () => {
  const pairs: [string, string][] = [['edgerunners2', 'capricorn'], ['invincible', 'invincible2'], ['mentalist', 'red-john'], ['breakingbad', 'heisenberg'], ['bettercallsaul', 'gene'], ['corpo', 'samurai']]
  for (const [key, id] of pairs) {
    const c = award(withFound(BLANK_CRED, id)).cred
    expect(`${key}:${credFor(c, key).badges.includes('samurai')}`).toBe(`${key}:true`)
  }
  expect(syncCard(480, credFor(award(withFound(BLANK_CRED, 'capricorn')).cred, 'edgerunners2'), false)).toContain('0+2=1')
  expect(coverCard(480, credFor(award(withFound(BLANK_CRED, 'invincible2')).cred, 'invincible'), { era: 1 })).toContain('NEW SUIT')
  // A skin with no secret of its own (Caliper) counts any secret; SOLID GOLD and NOIR are not shared secrets at all.
  expect(secretFoundFor(withFound(BLANK_CRED, 'gene'), 'caliper')).toBe(true)
  expect(anySecret(withFound(withFound(BLANK_CRED, 'solidgold'), 'noir'))).toBe(false)
  expect(BADGES.find(b => b.id === 'samurai')?.progress(withFound(BLANK_CRED, 'heisenberg'))).toBe(1)
})

test('flags: the legacy shared samurai flag migrates to every secret it stood for, idempotently, and round-trips', () => {
  const legacy = { xp: 300, jobs: 4, longJobs: 0, agents: 2, crewJobs: 0, nightJobs: 0, chromed: false, samurai: true, badges: ['choom', 'samurai'], found: ['solidgold'] }
  const once = cleanCred(legacy)
  expect(once.found).toEqual(['solidgold', ...SECRET_IDS])
  for (const id of SECRET_IDS) expect(foundOf(once, id)).toBe(true)
  // Nobody loses what they found: every skin's secret badge and both buttons stay lit.
  for (const key of ['samurai', 'edgerunners2', 'invincible', 'mentalist', 'breakingbad', 'bettercallsaul', 'caliper']) expect(credFor(once, key).badges).toContain('samurai')
  // Idempotent and stable: cleaning again (what every read does) changes nothing.
  const twice = cleanCred(once)
  expect(JSON.stringify(twice)).toBe(JSON.stringify(once))
  expect(JSON.stringify(cleanCred(JSON.parse(JSON.stringify(twice))))).toBe(JSON.stringify(once))
  // A cred that never had the shared flag gains nothing.
  const fresh: Cred = cleanCred({ ...BLANK_CRED, found: ['capricorn'] })
  expect(fresh.found).toEqual(['capricorn'])
  expect(cleanCred({ ...BLANK_CRED }).found).toBeUndefined()
})

// ---------------------------------------------------------------- through the engine
const pane = { title: '', isFocused: false, bodyColumns: 100, placement: 'dock', scroll: { offset: 0, bodyRows: 60 }, view: {} } as const
const toasts: string[] = []
const base = (on: On) => {
  mock.clock(on, { now: Date.parse('2026-10-20T10:02:30Z') })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on)
  on('fs.exists', async (_$, e) => ({ value: /addons[\\/]cyberpunk[\\/]addon\.json$/.test(String((e as { path: string }).path)) }) as never)
  on('settings.read', async () => ({ value: {} }) as never)
  on('tool.register', async () => ({ value: undefined }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
  on('command.run', async () => ({ text: '' }) as never)
  on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
  on('ui.panes', async () => ({ value: [] }) as never)
  on('ui.toast', async (_$, e) => { toasts.push(String((e as { text?: string }).text ?? '')); return { value: undefined } as never })
  on('audio.play', async () => ({ value: undefined }) as never)
  on('tool.call', async () => ({ result: 'ok' }) as never)
  on('turn.complete', async () => ({ text: '' }) as never)
  on('prompt.submit', async (_$, e) => ({ text: (e as { text: string }).text }) as never)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: 100_000 }, rateLimits: [] } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
}
const skin = ($: Engine, k: string) => $.command.run({ command: 'skin', args: k } as never)
const buttons = async ($: Engine): Promise<string[]> => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: pane })
  const keys: string[] = []
  for (const key of ['er2-mode', 'inv-era']) if (await ui.find({ key })) keys.push(key)
  const svg = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  await ui.unmount()
  return [...keys, svg]
}

test('flags: finding SAMURAI shows neither Capri\'s mode button nor Invincible\'s era button, and toasts only its own badge', async ($, on) => {
  base(on)
  toasts.length = 0
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  await skin($, 'samurai')
  expect(toasts.join('\n')).toContain('Badge unlocked: SAMURAI')
  await skin($, 'edgerunners-2')
  const er2 = await buttons($)
  expect(er2.includes('er2-mode')).toBe(false)
  expect((er2.at(-1) ?? '').includes('0+2=1')).toBe(false)
  await skin($, 'invincible')
  const inv = await buttons($)
  expect(inv.includes('inv-era')).toBe(false)
  // Now find Capri: her button shows, her badge is toasted, Invincible's stays hidden.
  toasts.length = 0
  await skin($, 'capricorn')
  expect(toasts.join('\n')).toContain('Badge unlocked: 0+2=1')
  const capri = await buttons($)
  expect(capri.includes('er2-mode')).toBe(true)
  await skin($, 'invincible')
  expect((await buttons($)).includes('inv-era')).toBe(false)
})
