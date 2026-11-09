// The Boys, phase 2: the 60 typed eggs. Every trigger fires its act on the band AND the pane; no ordinary coding prompt fires
// anything; the finale egg waits for the spoiler setting; one act at a time with a cooldown; the sizes stay in budget.
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { ACT_KINDS, SPIN_WORDS, actOn, actShake, paneOf, speedSmear, titleSpin } from './theboys-acts'
import { ACT_COOLDOWN_MS, REPLAYS, TRIGGERS, actMs, approvalAt, autoLookAtMe, boysState, fireTyped, resetBoys, typed } from './theboys-eggs'
import type { BoysMode, Trigger } from './theboys-eggs'

const NOW = Date.parse('2026-10-20T10:00:00Z')
const COLS: Record<number, number> = { 750: 106, 900: 126, 1250: 173 }
const pane = { title: '', isFocused: false, bodyColumns: 100, placement: 'dock', scroll: { offset: 0, bodyRows: 60 }, view: {} } as const
const toasts: string[] = []
const base = (on: On, context = 100_000, now = NOW) => {
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
const svgs = async ($: Engine, component: 'Pane' | 'AbovePrompt', W = 1250): Promise<string[]> => {
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

/** One way to type each egg (the bible's phrase, in a sentence where it fits). */
export const SAMPLES: Record<string, string> = {
  T1: 'oh, diabolical', T2: 'Ashley, look at me', T3: 'shock and awe, my son', T4: 'never meet your heroes', T5: 'I can do whatever I want',
  T6: "Pinocchio is stayin' put", T7: 'timothy the octopus', T8: 'vought on ice tonight', T9: 'laser baby!', T10: 'mon cœur',
  T11: 'buster beaver', T12: 'have you seen the memes', T13: 'play some billy joel', T14: 'solidgold', T15: 'back on ice',
  T16: 'a tall glass of milk', T17: 'compound v', T18: 'Hughie, blink', T19: 'turbo rush', T20: 'training a-train',
  T21: 'brave maeve', T22: 'seven on 7', T23: 'dawn of the seven', T24: 'the fun cut', T25: 'invisible force',
  T26: 'this means noir', T27: 'VIVANT!', T28: 'not without my dolphin', T29: 'ambrosius', T30: 'american hero',
  T31: 'rock my kiss', T32: 'smartest person in the room', T33: 'wakey wakey', T34: 'class dismissed', T35: 'you guys are the real heroes',
  T36: "you're bad product", T37: 'what we are, really, is a pharmaceutical company', T38: 'storage boy', T39: 'red scare', T40: 'godolkin',
  T41: 'little cricket', T42: 'monster club', T43: 'v52 expo', T44: 'good boy, terror', T45: 'full roster',
  T46: 'hometeamers', T47: 'starlighters', T48: 'saving america', T49: 'vought for tots', T50: 'planet vought',
  T51: "it's what clara would have wanted", T52: 'cracked mirror', T53: "it's a deepfake", T54: 'the boys are back in town', T55: 'did i ever tell you about nicaragua',
  T56: 'payback', T57: 'red thunder', T58: 'vought classic', T59: 'truthbomb', T60: '7spn',
}
const modeOf = (t: Trigger): BoysMode => (t.modes?.[0] ?? 'brand') as BoysMode
const SWITCHES = new Set(['hijack', 'onbrand', 'solidgold', 'backonice'])
const ACTS = TRIGGERS.filter(t => !SWITCHES.has(t.kind))

// --- every trigger ---------------------------------------------------------------------------------------------------------------
test('triggers: all 60 are live; each sample fires its own row in its mode; aliases fire too', () => {
  expect(TRIGGERS.length).toBe(60)
  expect(TRIGGERS.every(t => t.on)).toBe(true)
  for (const t of TRIGGERS) {
    const hit = typed(SAMPLES[t.id] as string, modeOf(t), { spoilers: true })
    expect(`${t.id}:${hit?.id}`).toBe(`${t.id}:${t.id}`)
  }
  expect(typed('Cirque de Vought', 'brand')?.kind).toBe('vivant')
  expect(typed('supersonic', 'brand')?.kind).toBe('rockmykiss')
  expect(typed('super-sweet', 'book')?.kind).toBe('rockmykiss')
  expect(typed('vought rising', 'gold')?.kind).toBe('redscare')
  expect(typed('MON COEUR', 'book')?.kind).toBe('dance')
  expect(typed('diabolical.', 'brand')?.kind).toBe('diabolical')
})
test('acts: every typed act draws on the band AND on its pane surface, in all three looks, with a reduced-motion rule and an end', () => {
  expect(ACT_KINDS.length).toBe(56)
  for (const t of ACTS) expect(ACT_KINDS).toContain(t.kind)
  for (const kind of ACT_KINDS) {
    for (const m of ['brand', 'book', 'gold'] as const) {
      const band = actOn(kind, { W: 1250, H: 148, m, at: NOW, on: 'band', task: 'Fix the login bug', titleW: 200 })
      // 7SPN's band act is the real scoreboard once a run is on record; with none it shows its own chip.
      expect(`${kind}:${band.includes(`data-egg="act-${kind}"`)}`).toBe(`${kind}:true`)
      const where = paneOf(kind)
      const card = where === 'all' ? 'task' : (where as 'cred' | 'task' | 'log' | 'table')
      if (card === 'table') expect(actOn(kind, { W: 520, H: 220, m, at: NOW, on: 'log' })).toContain(`data-egg="act-${kind}"`)
      const p = actOn(kind, { W: 520, H: card === 'table' ? 300 : 220, m, at: NOW, on: card })
      expect(`${kind}:${card}:${p.includes(`data-egg="act-${kind}"`)}`).toBe(`${kind}:${card}:true`)
      for (const s of [band, p]) {
        expect(s).toContain('prefers-reduced-motion')
        expect(s).toContain('@keyframes tql')
        expect(s).toContain('@@T')
        expect(s).not.toContain('NaN')
        expect(s).not.toContain('undefined')
        expect((s.match(/<g [^>]*style="[^"]*"[^>]*style=/g) ?? []).length).toBe(0)
      }
    }
  }
})
test('triggers end to end: every act egg typed while wearing The Boys draws its act on the band and the pane; the prompt goes on', { timeoutMs: 240_000 }, async ($, on) => {
  const clock = base(on)
  await start($)
  await run($, 'spoilers on')
  for (const t of ACTS) {
    await clock.advance(ACT_COOLDOWN_MS + 11_000)
    await say($, SAMPLES[t.id] as string)
    await clock.advance(300)
    const b = (await svgs($, 'AbovePrompt', 1250)).join('')
    expect(`${t.id}:${b.includes(`data-egg="act-${t.kind}"`)}`).toBe(`${t.id}:true`)
    expect(b.length).toBeLessThan(65_000)
    const p = await svgs($, 'Pane')
    expect(`${t.id}:${p.join('').includes(`data-egg="act-${t.kind}"`)}`).toBe(`${t.id}:true`)
    for (const s of p) expect(s.length).toBeLessThan(60_000)
    expect(p.reduce((n, s) => n + s.length, 0)).toBeLessThan(260_000)
    // T26 also unlocks THIS MEANS NOIR (phase 3): its way back, so the rest are typed in The Boys again.
    if (t.id === 'T26') await say($, 'curtain call')
  }
  // The toasts that come with an egg (once a minute each).
  expect(toasts).toContain('Smartest person.')
  expect(toasts).toContain('The Boys are back in town. Vought is aware.')
})

// --- no false positives ---------------------------------------------------------------------------------------------------------
export const DEV_PROMPTS = [
  'fix the failing test in hooks/register.tsx', 'refactor the payment service to use the new API client', 'add a dark mode toggle to the settings page',
  'why does the build fail on CI but pass locally?', 'write unit tests for the date parser', 'rename the Product model to Item across the codebase',
  'the bad product id error shows up when the cart is empty', 'add a class dismissed to the toast when the user closes it', 'load the full roster of players from the API',
  'build a dashboard for a pharmaceutical company client', 'add a page about Nicaragua to the travel guide', 'make the hero section full width on mobile',
  'the compound value calculation is off by one', 'storage bucket permissions are wrong in prod', 'the red button should turn green on hover',
  'implement a payback period calculator', 'add a whale icon to the docker docs', 'noir theme colors look washed out',
  'the seven day forecast widget overflows', 'use solid gold borders for premium users', 'is this a deepfake detection model or a classifier?',
  'mirror the repo to the backup remote', 'cracked screen detection for the phone app', 'add milk and sugar options to the coffee order form',
  'the boys and girls signup form needs a gender-neutral option', 'invisible characters break the CSV import', 'add a training mode to the onboarding',
  'set up the expo app for v52 of the SDK', 'make the dolphin mascot smaller on the landing page', 'add supersonic speed to the animation easing names',
  'the octopus deploy integration keeps timing out', 'show a little cricket score widget on the sports page', 'the monster energy sponsor logo is blurry',
  'run the tests and tell me what failed', 'update the README with the new install steps', 'what is the fastest way to profile this React render?',
  'migrate the database from Postgres 14 to 16', 'the American flag emoji renders as two letters on Windows', 'the planet earth image is too large',
]
test('no false positives: 39 ordinary coding prompts fire nothing in any mode, with every row live and spoilers on', () => {
  // `supersonic`, `class dismissed` and `full roster` alone are triggers; in a sentence about code they must not be.
  let checked = 0
  for (const p of DEV_PROMPTS) {
    for (const m of ['brand', 'book', 'gold'] as const) expect(`${p} → ${typed(p, m, { all: true, spoilers: true })?.id ?? 'none'}`).toBe(`${p} → none`)
    checked++
  }
  expect(checked).toBeGreaterThanOrEqual(30)
})
test('no false positives end to end: ordinary prompts draw no act on the band', async ($, on) => {
  const clock = base(on)
  await start($)
  // The first prompt of the day plays E9's wake-up (an event egg, phase 3); the corpus starts once it is over.
  await say($, 'good morning')
  await clock.advance(15_000)
  for (const p of DEV_PROMPTS.slice(0, 12)) {
    await say($, p)
    await clock.advance(400)
    expect((await svgs($, 'AbovePrompt', 900)).join('')).not.toContain('data-egg="act-')
  }
})

// --- spoilers -------------------------------------------------------------------------------------------------------------------
test('spoilers: OFF by default, the Clara egg does nothing; `/missioncontrol spoilers on` lets it play; off again stops it', async ($, on) => {
  const clock = base(on)
  await start($)
  const clara = TRIGGERS.find(t => t.spoiler) as Trigger
  expect(TRIGGERS.filter(t => t.spoiler).map(t => t.kind)).toEqual(['clara'])
  expect(typed(SAMPLES.T51 as string, 'brand')).toBeUndefined()
  expect(typed(SAMPLES.T51 as string, 'brand', { spoilers: true })?.kind).toBe('clara')
  expect(await run($, 'spoilers')).toContain('off')
  await say($, SAMPLES.T51 as string)
  await clock.advance(300)
  expect((await svgs($, 'AbovePrompt')).join('')).not.toContain('act-clara')
  expect(await run($, 'spoilers on')).toContain('Spoilers on')
  await clock.advance(25_000)
  await say($, SAMPLES.T51 as string)
  await clock.advance(300)
  expect((await svgs($, 'AbovePrompt')).join('')).toContain('act-clara')
  expect((await svgs($, 'Pane')).join('')).toContain('act-clara')
  expect(await run($, 'spoilers off')).toContain('off')
  await clock.advance(25_000)
  await say($, SAMPLES.T51 as string)
  await clock.advance(300)
  expect((await svgs($, 'AbovePrompt')).join('')).not.toContain('act-clara')
  // The replay list never names a spoiler egg.
  expect(REPLAYS.map(r => r.name)).not.toContain(clara.kind)
})

// --- one at a time, cooldowns, timing --------------------------------------------------------------------------------------------
test('one at a time: a second egg while one plays is held back; the same egg again within the cooldown too; then both play', () => {
  resetBoys()
  const t = (id: string) => TRIGGERS.find(x => x.id === id) as Trigger
  expect(fireTyped(t('T6'), NOW, 'brand')).toBeTruthy()
  expect(boysState().breaking?.line).toContain('whale')
  expect(fireTyped(t('T9'), NOW + 1000, 'brand')).toBeUndefined()
  expect(boysState().fx?.kind).toBe('whale')
  expect(fireTyped(t('T9'), NOW + actMs('whale') + 10, 'brand')).toBeTruthy()
  expect(fireTyped(t('T9'), NOW + actMs('whale') + actMs('laserbaby') + 100, 'brand')).toBeUndefined()
  expect(fireTyped(t('T9'), NOW + actMs('whale') + ACT_COOLDOWN_MS + 100, 'brand')).toBeTruthy()
  // Durations follow the bible's seconds.
  expect([actMs('diabolical'), actMs('turbo'), actMs('expo'), actMs('mirror'), actMs('cricket')]).toEqual([2500, 10_000, 8_000, 8_000, 1_500])
  // HOMETEAMERS holds APPROVAL +10 for its 5 s; STARLIGHTERS -10.
  resetBoys()
  expect(approvalAt(NOW)).toBe(50)
  fireTyped(t('T46'), NOW, 'brand')
  expect(approvalAt(NOW + 1000)).toBe(60)
  expect(approvalAt(NOW + 5_100)).toBe(50)
  fireTyped(t('T47'), NOW + 30_000, 'brand')
  expect(approvalAt(NOW + 31_000)).toBe(40)
  resetBoys()
})
test('LOOK AT ME plays by itself the first time the context passes 95%, once a session', async ($, on) => {
  resetBoys()
  expect(autoLookAtMe(80, NOW)).toBe(false)
  expect(autoLookAtMe(96, NOW)).toBe(true)
  expect(boysState().fx?.kind).toBe('lookatme')
  expect(autoLookAtMe(97, NOW + 60_000)).toBe(false)
  resetBoys()
  base(on, 960_000)
  await start($)
  await say($, 'Vought Tower incident report')
  expect((await svgs($, 'AbovePrompt')).join('')).toContain('data-egg="act-lookatme"')
})
test('shakes: LOOK AT ME, WHATEVER and LITTLE CRICKET move whole panels for their act only, pinned', () => {
  expect(actShake('lookatme', 'band', NOW)).toContain('@@T')
  expect(actShake('whatever', 'cred', NOW)).toContain('xswhat')
  for (const c of ['cred', 'task', 'log'] as const) expect(actShake('cricket', c, NOW)).toContain('xscric')
  expect(actShake('whale', 'band', NOW)).toBe('')
  expect(actOn('cricket', { W: 500, H: 200, m: 'brand', at: NOW, on: 'log' })).toContain('@keyframes xscric')
})

// --- phase-2 band pieces ---------------------------------------------------------------------------------------------------------
test('SPEED SMEAR: horizontal lines and exactly one ghost, however many agents run; more lines with more agents; GOLD has no ghost', () => {
  const ghosts = (s: string) => (s.match(/<g opacity="\.22">/g) ?? []).length + (s.match(/filter="url\(#tqsg\)"/g) ?? []).length
  const lines = (s: string) => (s.match(/<rect x="[^"]+" y="[^"]+" width="[^"]+" height="1\.2"/g) ?? []).length
  for (const n of [2, 3, 6, 12]) {
    expect(ghosts(speedSmear('brand', n))).toBe(1)
    expect(ghosts(speedSmear('book', n))).toBe(1)
    expect(ghosts(speedSmear('gold', n))).toBe(0)
  }
  expect(lines(speedSmear('brand', 2))).toBe(3)
  expect(lines(speedSmear('brand', 9))).toBe(6)
  expect(speedSmear('book', 3)).toContain('feMorphology')
})
test('title SPIN: a bad word is struck and its PR word written above; no bad word gives the DEEPFAKE? tear', () => {
  expect(SPIN_WORDS.length).toBe(7)
  const a = titleSpin(1250, 'Fix the login bug', 220, 'brand', NOW)
  expect(a).toContain('>feature<')
  expect(a).toContain('data-egg="spin"')
  expect(titleSpin(1250, 'The parser crashes on empty input', 300, 'book', NOW)).toContain('>pause<')
  const df = titleSpin(1250, 'Vought Tower incident report', 300, 'brand', NOW)
  expect(df).toContain('DEEPFAKE?')
  // A censor mosaic (two pixel patterns), never Cyberpunk's red and cyan RGB split.
  expect((df.match(/<pattern /g) ?? []).length).toBe(2)
  expect(df).not.toMatch(/#3BE8FF|#FF3B5C|mix-blend-mode/i)
})
test('title SPIN on the band right after a failing test run', async ($, on) => {
  base(on)
  await start($)
  await say($, 'Fix the failing parser')
  await $.tool.call({ tool: 'mcp__crab-progress__progress', title: 'Fix the failing parser', total: 3, done: 1, phase: 'build' } as never).catch(() => undefined)
  await $.tool.call({ tool: 'Bash', command: 'npm test' } as never).catch(() => undefined)
  const b = (await svgs($, 'AbovePrompt')).join('')
  expect(b).toContain('data-egg="spin"')
  expect(b).toContain('>setback<')
})

// --- sizes and content ----------------------------------------------------------------------------------------------------------
test('sizes: every act under 16 kB on the band and on each pane surface at three widths, in every look', () => {
  let biggest = ['', 0] as [string, number]
  for (const kind of ACT_KINDS) {
    for (const m of ['brand', 'book', 'gold'] as const) {
      for (const W of [750, 900, 1250]) {
        const b = actOn(kind, { W, H: 148, m, at: NOW, on: 'band', task: 'Fix the login bug', titleW: 200 })
        expect(b.length).toBeLessThan(16_000)
        if (b.length > biggest[1]) biggest = [`${kind} band`, b.length]
      }
      for (const on of ['cred', 'task', 'log', 'table'] as const) {
        for (const W of [360, 560]) {
          const p = actOn(kind, { W, H: 230, m, at: NOW, on })
          expect(p.length).toBeLessThan(16_000)
        }
      }
    }
  }
  expect(biggest[1]).toBeGreaterThan(0)
})
test('content: every shipped act string is PG-13, ours, and no Cyberpunk copy', () => {
  const all = ACT_KINDS.flatMap(k => (['brand', 'book', 'gold'] as const).flatMap(m => [actOn(k, { W: 1250, H: 148, m, at: NOW, on: 'band', task: 'x', titleW: 100 }), ...(['cred', 'task', 'log', 'table'] as const).map(on => actOn(k, { W: 520, H: 230, m, at: NOW, on }))])).join('\n')
  for (const bad of [/GRAVEYARD SHIFT/i, /Sandevistan/i, /BREACH/, /heat star/i, /\bRELIC\b/, /Herogasm/i, /Love Sausage/i, /Termite/i, /Stormfront/i, /\bc[u]nt/i, /\bfuck/i, /\bshit/i, /blood/i, /\bgore\b/i, /\bdead\b/i, /\bkill(?:ed|s)?\b(?! what)/i]) expect(all).not.toMatch(bad)
  // Quotes stay under 15 words.
  for (const q of all.match(/“([^”]+)”/g) ?? []) expect(q.split(/\s+/).length).toBeLessThan(15)
})
for (const look of ['brand', 'book', 'gold'] as const) {
  test(`sizes end to end: ${look}: the biggest acts with four agents, BREAKING and the 7SPN board keep the band under 65 kB at 750/900/1250 and the pane in budget`, { timeoutMs: 120_000 }, async ($, on) => {
    const clock = base(on)
    await start($)
    if (look === 'book') await say($, 'shock and awe, my son')
    if (look === 'gold') await say($, 'soldier boy')
    await say($, 'Vought Tower incident report')
    await $.tool.call({ tool: 'mcp__crab-progress__progress', title: 'Vought Tower incident report', total: 5, done: 2, phase: 'delegate', tasks: [{ title: 'Lead: run it', tier: 'fable' }, { title: 'Researcher: map the API', tier: 'medium' }, { title: 'Engineer: rewrite the parser', tier: 'careful' }, { title: 'Tester: break it', tier: 'light' }] } as never).catch(() => undefined)
    for (const [i, d] of ['Lead: run it', 'Researcher: map the API', 'Engineer: rewrite the parser', 'Tester: break it'].entries()) await $.agent.spawn({ tool_use_id: `t${i}`, prompt: 'p', description: d, subagentType: 'general-purpose', provider: 'engine', parentModel: 'x', background: false, fork: false } as never)
    for (const id of ['T8', 'T54', 'T46', 'T43', 'T6', 'T11', 'T23', 'T30']) {
      await clock.advance(ACT_COOLDOWN_MS + 11_000)
      await $.tool.call({ tool: 'Bash', command: 'npm test' } as never).catch(() => undefined)
      await say($, SAMPLES[id] as string)
      await clock.advance(400)
      for (const W of [750, 900, 1250]) {
        const b = (await svgs($, 'AbovePrompt', W)).join('')
        expect(`${id}@${W}:${b.includes('data-egg="act-')}`).toBe(`${id}@${W}:true`)
        expect(b.length).toBeLessThan(65_000)
        expect(b).not.toContain('NaN')
      }
      const p = await svgs($, 'Pane')
      for (const s of p) expect(s.length).toBeLessThan(60_000)
      expect(p.reduce((n, s) => n + s.length, 0)).toBeLessThan(260_000)
    }
  })
}
