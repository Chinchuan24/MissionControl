import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { BADGES, BLANK_CRED, credCard } from './extras'
import type { Cred } from './extras'
import { CBI_WORDS } from './mentalist'
import { personnelFile } from './mentalist-cards'
import { periodicCard } from './breakingbad-cards'
import { EMPIRE_WORDS } from './breakingbad'
import { BCS_CRED_WORDS } from './bettercallsaul-cards'
import { attorneyCard } from './bettercallsaul-cards'
import { ER2_WORDS, syncCard } from './edgerunners2-cards'
import { coverCard } from './invincible-cards'
import { BADGES as INV_BADGES } from './invincible-cards'

// What a locked card must never say: the secret skins, the codes that open them, and the hints at both.
const FORBIDDEN = ['secret', 'Find the', 'other era', 'SAY MY NAME', 'TYGER', '0+2=1', 'NEW SUIT', 'NIPPY', 'THINK, MARK!', 'takavic', 'chicanery']
const clean = (svg: string, label: string) => {
  for (const w of FORBIDDEN) expect(`${label}: ${svg.toLowerCase().includes(w.toLowerCase()) ? w : ''}`).toBe(`${label}: `)
}
const frame = (x: number, y: number, w: number, h: number, a: string) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${a}/>`
const TH = { accent: '#5EC8F0', accent2: '#4FB37A', done: '#7FD48F', warn: '#F2C318', alert: '#E0605A', text: '#F2F5F0', subtext: '#B9C7BC', muted: '#94A598', tile: '#0F1A14', track: '#18261D', line: '#22352A' }
const OTHERS = BADGES.filter(b => b.id !== 'samurai').map(b => b.id)
const states: [string, Cred][] = [
  ['none earned', { ...BLANK_CRED, xp: 40, jobs: 2 }],
  ['all but the last earned', { ...BLANK_CRED, xp: 9000, jobs: 99, chromed: true, badges: OTHERS }],
]
const renderers: [string, (W: number, c: Cred) => string][] = [
  ['cyberpunk-2077', (W, c) => credCard(W, c, TH, 'sans-serif', frame, 'STREET CRED')],
  ['cyberpunk-2077 (words)', (W, c) => credCard(W, c, TH, 'sans-serif', frame, 'STREET CRED', '', undefined, { badges: BADGES, cases: 'GIGS', long: 'LONG', all: 'ALL' })],
  ['mentalist', (W, c) => personnelFile(W, c, TH, 'serif', frame)],
  ['mentalist (words)', (W, c) => credCard(W, c, TH, 'serif', frame, 'CBI CRED', '', undefined, CBI_WORDS)],
  ['breaking-bad', (W, c) => periodicCard(W, c, TH, 'sans-serif', frame)],
  ['breaking-bad (words)', (W, c) => credCard(W, c, TH, 'sans-serif', frame, 'EMPIRE', '', undefined, EMPIRE_WORDS)],
  ['better-call-saul', (W, c) => attorneyCard(W, c, false)],
  ['better-call-saul (words)', (W, c) => credCard(W, c, TH, 'sans-serif', frame, 'CRED', '', undefined, BCS_CRED_WORDS)],
  ['edgerunners-2', (W, c) => syncCard(W, c, false)],
  ['edgerunners-2 (words)', (W, c) => credCard(W, c, TH, 'sans-serif', frame, 'SYNC', '', undefined, ER2_WORDS as never)],
  ['invincible', (W, c) => coverCard(W, c, { era: 1 })],
  ['invincible era 2', (W, c) => coverCard(W, c, { era: 2 })],
  ['invincible (words)', (W, c) => credCard(W, c, TH, 'sans-serif', frame, 'COVER', '', undefined, { badges: INV_BADGES as never, cases: 'M', long: 'L', all: 'A' })],
]

for (const [name, draw] of renderers) {
  test(`secrets: ${name} shows a neutral mystery tile while the last badge is locked`, () => {
    for (const [label, cred] of states) for (const W of [300, 480, 700]) clean(draw(W, cred), `${name} / ${label} / ${W}`)
    // the neutral tile is there, and "Keep exploring." is what it says
    expect(draw(480, states[0]![1])).toContain('???')
  })
}

test('secrets: once earned the last badge shows its real name', () => {
  const won = { ...BLANK_CRED, xp: 9000, samurai: true, badges: BADGES.map(b => b.id) }
  expect(credCard(480, won, TH, 'sans-serif', frame, 'STREET CRED')).toContain('SAMURAI')
  expect(personnelFile(480, won, TH, 'serif', frame)).toContain('TYGER TYGER')
  expect(periodicCard(480, won, TH, 'sans-serif', frame)).toContain('SAY MY NAME')
  expect(attorneyCard(480, won, false)).toContain('NIPPY')
  expect(syncCard(480, won, false)).toContain('0+2=1')
  expect(coverCard(480, won, { era: 1 })).toContain('NEW SUIT')
})

// --- the whole band and pane, through the engine ---
const pane = { title: '', isFocused: false, bodyColumns: 100, placement: 'dock', scroll: { offset: 0, bodyRows: 60 }, view: {} } as const
const band = { hasSurvey: false, isWorking: true, maxRows: 14, bodyColumns: 120 } as never
const setup = (on: On, context = 100_000) => {
  mock.clock(on, { now: Date.parse('2026-10-20T10:00:00Z') })
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
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: context }, rateLimits: [] } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
}
const svgs = async ($: Engine, component: 'Pane' | 'AbovePrompt') => {
  const ui =
    component === 'Pane'
      ? await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: pane })
      : await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: band })
  const all = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source))
  await ui.unmount()
  return all
}
for (const skin of ['mentalist', 'breaking-bad', 'better-call-saul', 'invincible']) {
  for (const ctx of [100_000, 880_000, 960_000]) {
    test(`secrets: ${skin} band and pane at ${ctx / 10_000}% context, all badges locked`, async ($, on) => {
      setup(on, ctx)
      await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
      await $.command.run({ command: 'skin', args: skin } as never)
      await $.prompt.submit({ text: 'Fix it', cursor: 0 } as never)
      const all = [...(await svgs($, 'AbovePrompt')), ...(await svgs($, 'Pane'))].join('\n')
      expect(all.length).toBeGreaterThan(1000)
      // the fight's dialogue frames may say THINK, MARK! (story content); nothing else may
      const body = skin === 'invincible' ? all.replace(/THINK, MARK[.!]/g, '') : all
      clean(body, `${skin} / ${ctx}`)
    })
  }
}
