import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { BLANK_CRED, SKIN_BADGES, award, cleanCred, withFound } from './extras'
import type { Cred } from './extras'
import { CASTS } from './cast'
import { BOOK, BRAND, CHIP_WORDS, EPISODES, GOLD, contrast, faceOf, litOf, syringe } from './theboys'
import { BADGES, credCard, deskCard, dialCard, tableCard } from './theboys-cards'
import { APPROVAL, BANNED_BARE, REPLAYS, SPIN_BOOK, SPIN_BRAND, SPIN_GOLD, SPIN_NOIR, TOASTS, TRIGGERS, VNN_BOOK, VNN_BRAND, VNN_GOLD, VNN_OVERNIGHT, approvalAt, approvalForRun, boysEvent, boysState, bumpApproval, onBoysEvent, parseCounts, prToast, resetBoys, spin, typed, vnnBreak, vnnLine } from './theboys-eggs'
import { swapLayer } from './theboys-theme'
import * as TB from './theboys-sprites'
import { THEMES } from './themes'

const pane = { title: '', isFocused: false, bodyColumns: 100, placement: 'dock', scroll: { offset: 0, bodyRows: 60 }, view: {} } as const
const NOW = Date.parse('2026-10-20T10:00:00Z')
const COLS: Record<number, number> = { 750: 106, 900: 126, 1250: 173 }
const toasts: string[] = []

const base = (on: On, context = 100_000, now = NOW, testOut = 'Tests: 3 failed, 12 passed') => {
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
  on('tool.call', async (_$, e) => {
    const c = String((e as { command?: string }).command ?? '')
    if ((e as { tool?: string }).tool === 'Read' && /missing/.test(String((e as { file_path?: string }).file_path))) return { isError: true, result: 'Error: ENOENT: no such file or directory' } as never
    return { result: /test/.test(c) ? testOut : 'ok' } as never
  })
  on('turn.complete', async () => ({ text: '' }) as never)
  on('prompt.submit', async (_$, e) => ({ text: (e as { text: string }).text }) as never)
  let n = 0
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: `a${++n}` }) as never)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: context }, rateLimits: [], cost: { usd: 1.23 } } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  return clock
}
const start = async ($: Engine, skin: string) => {
  toasts.length = 0
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  if (skin) await $.command.run({ command: 'skin', args: skin } as never)
}
const svgs = async ($: Engine, component: 'Pane' | 'AbovePrompt', W = 1250, working = true): Promise<string[]> => {
  const ui =
    component === 'Pane'
      ? await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: pane })
      : await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: working, maxRows: 14, bodyColumns: COLS[W] } as never })
  const all = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source))
  await ui.unmount()
  return all
}
const bandAt = async ($: Engine, W: number, working = true) => (await svgs($, 'AbovePrompt', W, working)).join('')
const TITLE = 'Vought Tower incident report'
const jobIn = async ($: Engine) => {
  await $.prompt.submit({ text: TITLE, cursor: 0 } as never)
  await $.tool.call({ tool: 'mcp__crab-progress__progress', title: TITLE, total: 5, done: 2, phase: 'delegate', tasks: [{ title: 'Lead: run it', tier: 'fable' }, { title: 'Researcher: map the API', tier: 'medium' }, { title: 'Engineer: rewrite the parser', tier: 'careful' }, { title: 'Tester: break it', tier: 'light' }] } as never).catch(() => undefined)
}
const four = async ($: Engine) => {
  for (const [i, d] of ['Lead: run it', 'Researcher: map the API', 'Engineer: rewrite the parser', 'Tester: break it'].entries()) await $.agent.spawn({ tool_use_id: `t${i}`, prompt: 'p', description: d, subagentType: 'general-purpose', provider: 'engine', parentModel: 'x', background: false, fork: false } as never)
}
const skinList = async ($: Engine) => String(((await $.command.run({ command: 'skin', args: 'list' } as never)) as { text?: string }).text)
const say = async ($: Engine, text: string) => $.prompt.submit({ text, cursor: 0 } as never)

// --- the theme ---------------------------------------------------------------------------------------------------------------
test('the boys: Q-SCORE, CRISIS DESK, FOCUS GROUP, THE TABLE, the crawl, the roster, the syringe; no other skin words', async ($, on) => {
  base(on)
  await start($, 'the-boys')
  await jobIn($)
  await four($)
  await $.tool.call({ tool: 'Read', file_path: '/repo/a.ts' } as never).catch(() => undefined)
  const p = (await svgs($, 'Pane')).join('')
  for (const w of ['Q-SCORE', 'CRISIS DESK', 'FOCUS GROUP', 'THE TABLE', 'TALKING POINTS', 'PRESS RELEASES', 'THE COLLECTION', 'DIAL TEST', 'SITUATION']) expect(p).toContain(w)
  const b = await bandAt($, 1250)
  for (const w of ['MISSION CONTROL', 'data-egg="vnn"', 'data-egg="roster"', 'data-egg="syringe"', 'data-egg="approval"', 'data-egg="milk"', 'ROSTER', TITLE]) expect(b).toContain(w)
  expect(b).toMatch(/Total <tspan[^>]*>\$1\.23/)
  for (const w of ['COVER STORY', 'GDA WALL', 'THE PAGE', 'STREET CRED', 'BREACH PROTOCOL', 'NEURAL SYNC', 'ATTORNEY AT LAW', 'GRAVEYARD SHIFT']) {
    expect(p).not.toContain(w)
    expect(b).not.toContain(w)
  }
  expect(b).not.toContain('NaN')
  expect(p).not.toContain('NaN')
})
test('the boys: one entry in the picker, SOLID GOLD hidden until found; the casts exist; the JSON copy matches the palette', async ($, on) => {
  base(on)
  await start($, '')
  const list = await skinList($)
  expect(list.split('\n').filter(l => /\bthe-boys\b/.test(l)).length).toBe(1)
  expect(list).not.toContain('solidgold')
  for (const k of ['boys', 'boys2', 'solidgold'] as const) {
    expect(CASTS[k]).toBeTruthy()
    expect(THEMES[k]).toBeTruthy()
  }
})

// --- two modes ---------------------------------------------------------------------------------------------------------------
test('modes: `shock and awe, my son` hijacks the feed (OFF BOOK), `never meet your heroes` puts it back ON BRAND; `back on brand` does nothing', async ($, on) => {
  const clock = base(on)
  await start($, 'the-boys')
  await jobIn($)
  expect(await bandAt($, 1250)).toContain(BRAND.tile)
  await say($, 'back on brand please, this page looks off')
  expect(await bandAt($, 1250)).not.toContain('data-egg="onbrand"')
  await say($, 'Shock and awe, my son.')
  await clock.advance(400)
  const off = await bandAt($, 1250)
  expect(off).toContain(BOOK.tile)
  expect(off).toContain('data-egg="hijack"')
  expect(off).toContain('SIGNAL HIJACKED')
  expect(off).toContain('THE WIRE')
  expect((await svgs($, 'Pane')).join('')).toContain('LEAKED')
  await clock.advance(5_000)
  expect(await bandAt($, 1250)).not.toContain('data-egg="hijack"')
  await say($, 'shock and awe, my son')
  expect(await bandAt($, 1250)).not.toContain('data-egg="hijack"')
  await say($, 'never meet your heroes')
  await clock.advance(300)
  const on2 = await bandAt($, 1250)
  expect(on2).toContain(BRAND.tile)
  expect(on2).toContain('WE APOLOGISE FOR THE INTERRUPTION')
  expect(await skinList($)).toContain('▸ the-boys')
})
test('modes: the phrases are whole phrases; the banned bare words never fire any trigger', () => {
  expect(typed('shock and awe, my son', 'brand')?.kind).toBe('hijack')
  expect(typed('shock & awe my son', 'brand')?.kind).toBe('hijack')
  expect(typed('shock and awe', 'brand')).toBeUndefined()
  expect(typed('never meet your heroes', 'book')?.kind).toBe('onbrand')
  expect(typed('never meet your heroes', 'brand')).toBeUndefined()
  expect(typed('get the page back on brand', 'book')).toBeUndefined()
  expect(typed('solidgold', 'brand')?.kind).toBe('solidgold')
  expect(typed('Soldier Boy', 'book')?.kind).toBe('solidgold')
  expect(typed('solid gold advice', 'brand')).toBeUndefined()
  expect(typed('back on ice', 'gold')?.kind).toBe('backonice')
  expect(typed('back on ice', 'brand')).toBeUndefined()
  for (const w of BANNED_BARE) for (const m of ['brand', 'book', 'gold'] as const) expect(typed(w, m, { all: true })?.id ?? 'none').toBe('none')
  // A corpus of ordinary prompts never fires a live or a phase-2 trigger.
  const corpus = ['fix the failing test in hooks/a.ts', 'make the seven cards line up', 'the milk carton icon is too big', 'is this solid? gold border maybe', 'payback period for the loan', 'diabolical regex here, help', 'add a whale emoji', 'noir style dark mode', 'better error messages', 'run the tests', 'the boys and girls of the team', 'a perfect fit']
  for (const t of corpus) expect(typed(t, 'brand', { all: true })?.id ?? 'none').toBe('none')
  expect(TRIGGERS.length).toBe(60)
  expect(new Set(TRIGGERS.map(t => t.id)).size).toBe(60)
})

// --- contrast ----------------------------------------------------------------------------------------------------------------
test('contrast: every text colour reads at 4.5:1 or better on tile, tile2 and the pane in all three looks', () => {
  for (const P of [BRAND, BOOK, GOLD] as Record<string, string>[]) {
    for (const fg of [P.text, P.sub, P.muted, P.aT, P.done, P.alert, P.redT]) for (const bg of [P.tile, P.tile2, P.bg]) expect(contrast(fg as string, bg as string)).toBeGreaterThanOrEqual(4.5)
    for (const role of P.roles as unknown as string[]) expect(contrast(role, P.tile as string)).toBeGreaterThanOrEqual(4.5)
  }
  // Ink on the fills that carry text.
  expect(contrast(BRAND.ink, BRAND.a)).toBeGreaterThanOrEqual(4.5)
  expect(contrast('#FFFFFF', '#C81E28')).toBeGreaterThanOrEqual(4.5)
  expect(contrast('#FFFFFF', BOOK.red)).toBeGreaterThanOrEqual(4.5)
  expect(contrast('#1A1C22', BOOK.manila)).toBeGreaterThanOrEqual(4.5)
  expect(contrast(GOLD.ink, GOLD.a)).toBeGreaterThanOrEqual(4.5)
  expect(contrast(GOLD.text, GOLD.olive)).toBeGreaterThanOrEqual(4.5)
  expect(contrast('#1A1C22', '#F4F1E8')).toBeGreaterThanOrEqual(4.5)
})

// --- SOLID GOLD: the unlock and its own flag ----------------------------------------------------------------------------------
test('SOLID GOLD: `solidgold` typed in The Boys puts it on with its own flag and badge; `back on ice` takes it off; samurai untouched', async ($, on) => {
  const clock = base(on)
  await start($, 'the-boys')
  await say($, 'solidgold')
  await clock.advance(300)
  expect(await skinList($)).toContain('▸ solidgold')
  const b = await bandAt($, 1250)
  expect(b).toContain(GOLD.tile)
  expect(b).toContain('SOLID GOLD')
  expect(b).toContain('data-egg="vu"')
  expect(toasts.some(t => t.includes('Badge unlocked: SOLID GOLD'))).toBe(true)
  expect(toasts).toContain('Thawed out and ready to roll.')
  const pn = (await svgs($, 'Pane')).join('')
  expect(pn).toContain('GOLD RECORD')
  expect(pn).not.toContain('>???<')
  // The shared flag is untouched: Invincible's era button (shown only once `samurai` is set) stays hidden.
  await $.command.run({ command: 'skin', args: 'invincible' } as never)
  const inv = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: pane })
  const labels = (await inv.findAll({ type: 'Button' })).map(b => String(b.props.label))
  await inv.unmount()
  expect(labels.some(l => l.includes('NEW SUIT'))).toBe(false)
  await $.command.run({ command: 'skin', args: 'solidgold' } as never)
  await say($, 'back on ice')
  expect(await skinList($)).toContain('▸ the-boys')
  expect(toasts).toContain('Back in storage.')
  // Typed in another skin it does nothing.
  await $.command.run({ command: 'skin', args: 'mentalist' } as never)
  await say($, 'solidgold')
  expect(await skinList($)).toContain('▸ mentalist')
})
test('secret flag: SOLID GOLD and the shared samurai flag are independent both ways', () => {
  const samuraiOnly: Cred = { ...BLANK_CRED, samurai: true, badges: ['samurai'] }
  const card1 = credCard(560, samuraiOnly, 'brand')
  expect(card1).toContain('???')
  expect(card1).not.toContain('>SOLID GOLD<')
  const goldOnly = award(withFound(BLANK_CRED, 'solidgold')).cred
  expect(goldOnly.samurai).toBe(false)
  expect(goldOnly.badges).not.toContain('samurai')
  expect(goldOnly.skinBadges).toEqual(['solidgold'])
  const card2 = credCard(560, goldOnly, 'brand')
  expect(card2).toContain('SOLID GOLD')
  expect(card2).not.toContain('???')
  // Another skin's card never counts the skin-only badge.
  expect(goldOnly.badges.length).toBe(0)
  expect(SKIN_BADGES.map(b => b.id)).toEqual(['lateedition', 'solidgold'])
  // LATE EDITION: three jobs inside an hour, not a clock window.
  const late = award({ ...BLANK_CRED, jobTimes: [NOW, NOW + 20 * 60_000, NOW + 50 * 60_000] }).cred
  expect(late.skinBadges).toContain('lateedition')
  expect(award({ ...BLANK_CRED, jobTimes: [NOW, NOW + 40 * 60_000, NOW + 70 * 60_000] }).cred.skinBadges ?? []).not.toContain('lateedition')
  expect(cleanCred({ ...goldOnly, found: ['solidgold', '<bad>', 7] }).found).toEqual(['solidgold'])
  expect(BADGES.map(b => b.id)).toEqual(['choom', 'merc', 'edgerunner', 'legend', 'netrunner', 'crewboss', 'chromed', 'lateedition', 'solidgold'])
})

// --- the APPROVAL RATING ------------------------------------------------------------------------------------------------------
test('approval: 50/50 at the start, moved by the test pass rate, decays 1 point a minute to 50; the face follows it', () => {
  resetBoys()
  expect(approvalAt(NOW)).toBe(50)
  expect(approvalForRun(12, 0, false)).toBe(APPROVAL.pass + APPROVAL.clean)
  expect(approvalForRun(0, 5, true)).toBe(APPROVAL.fail)
  expect(approvalForRun(6, 6, true)).toBe(-3)
  expect(approvalForRun(12, 3, true)).toBe(-2)
  expect(approvalForRun(0, 0, false)).toBe(APPROVAL.pass)
  bumpApproval(20, NOW)
  expect(approvalAt(NOW)).toBe(70)
  expect(approvalAt(NOW + 5 * 60_000)).toBe(65)
  expect(approvalAt(NOW + 60 * 60_000)).toBe(50)
  bumpApproval(-200, NOW)
  expect(approvalAt(NOW)).toBe(0)
  expect([faceOf(80), faceOf(60), faceOf(40), faceOf(10)]).toEqual(['grin', 'smile', 'tight', 'disgust'])
  resetBoys()
})
test('approval + 7SPN + BREAKING: a failing test run dips the meter, lights the scoreboard and hijacks the crawl; a clean run cheers', async ($, on) => {
  const clock = base(on, 100_000, NOW, 'Tests: 3 failed, 12 passed, 15 total')
  await start($, 'the-boys')
  await jobIn($)
  await $.tool.call({ tool: 'Bash', command: 'npm test' } as never).catch(() => undefined)
  const b = await bandAt($, 1250)
  expect(b).toMatch(/data-egg="approval"><title>HomeTeamers 48%/)
  expect(b).toContain('data-egg="scoreboard"')
  expect(b).toContain('P 12')
  expect(b).toContain('F 3')
  expect(b).toContain('BREAKING')
  expect(b).toContain('Vought denies')
  await clock.advance(7_000)
  expect(await bandAt($, 1250)).not.toContain('BREAKING')
  await clock.advance(30_000)
  expect(await bandAt($, 1250)).not.toContain('data-egg="scoreboard"')
  expect(parseCounts('Tests  14 passed (14)')).toEqual({ pass: 14, fail: 0 })
  expect(parseCounts('✓ 30 / ✗ 2')).toEqual({ pass: 30, fail: 2 })
  expect(parseCounts('nothing here')).toBeUndefined()
})
test('approval: two failed runs toast Diabolical. once an hour; a fix toasts the Butcher line; listeners can hook any event', () => {
  resetBoys()
  expect(boysEvent('test-fail', { at: NOW, mode: 'brand', pass: 1, fail: 1 })).toEqual([])
  expect(boysEvent('test-fail', { at: NOW + 1000, mode: 'brand', pass: 1, fail: 1 })).toContain('Diabolical.')
  expect(boysEvent('test-fail', { at: NOW + 2000, mode: 'brand', pass: 1, fail: 1 })).not.toContain('Diabolical.')
  expect(boysEvent('test-pass', { at: NOW + 3000, mode: 'brand', pass: 2, fail: 0 })).toContain('Somebody up there likes us, mate.')
  const off = onBoysEvent('compact', a => ({ toast: `blackout ${a.mode}`, breaking: 'Starlight drains the lights' }))
  expect(boysEvent('compact', { at: NOW + 4000, mode: 'brand' })).toEqual(['blackout brand'])
  expect(boysState().breaking?.line).toBe('Starlight drains the lights')
  off()
  expect(boysEvent('compact', { at: NOW + 5000, mode: 'brand' })).toEqual([])
  resetBoys()
})

// --- VOUGHT PR SPIN -----------------------------------------------------------------------------------------------------------
test('PR spin: a failed tool becomes press-speak ON BRAND, the real line LEAKED OFF BOOK; a toast at most once a minute', async ($, on) => {
  expect(spin('Read', 'ENOENT: no such file')).toBe('VOUGHT PR · Read: an exclusive, not yet released.')
  expect(spin('Bash', 'Command timed out')).toBe('VOUGHT PR · Bash: an extended engagement window.')
  expect(spin('Bash', 'permission denied')).toBe('VOUGHT PR · Bash: legal is reviewing it.')
  expect(spin('Grep', 'exit code 1: failed')).toBe('VOUGHT PR · Grep: being reimagined.')
  expect(spin('Edit', 'Error: old_string not unique')).toContain('a learning moment')
  expect(prToast('Read', 'ENOENT: no such file', 'book')).toBe('LEAKED · Read: ENOENT: no such file')
  for (const [, v] of [['x', spin('A', 'y')]]) expect(v.length).toBeLessThanOrEqual(90)
  base(on)
  await start($, 'the-boys')
  await jobIn($)
  await $.tool.call({ tool: 'Read', file_path: '/repo/missing.ts' } as never).catch(() => undefined)
  await $.tool.call({ tool: 'Read', file_path: '/repo/missing2.ts' } as never).catch(() => undefined)
  expect(toasts.filter(t => t.startsWith('VOUGHT PR')).length).toBe(1)
})

// --- the crawl, the pools ---------------------------------------------------------------------------------------------------------
test('pools: 104 VNN headlines, 48 spinner verbs, 34 toasts; the crawl walks its pool; nothing over the PG-13 line', () => {
  expect(VNN_BRAND.length + VNN_BOOK.length + VNN_GOLD.length + VNN_OVERNIGHT.length).toBe(104)
  expect(SPIN_BRAND.length + SPIN_BOOK.length + SPIN_GOLD.length + SPIN_NOIR.length).toBe(48)
  expect(TOASTS.length).toBe(34)
  expect(SPIN_BRAND).not.toContain('Get Some')
  const day = new Set<string>()
  for (let i = 0; i < 68; i++) day.add(vnnLine(Date.parse('2026-10-20T12:00:00') + i * 40_000, 'brand'))
  expect(day.size).toBeGreaterThan(30)
  expect(VNN_OVERNIGHT).toContain(vnnLine(Date.parse('2026-10-20T02:00:00'), 'brand'))
  const shipped = [...VNN_BRAND, ...VNN_BOOK, ...VNN_GOLD, ...VNN_OVERNIGHT, ...SPIN_BRAND, ...SPIN_BOOK, ...SPIN_GOLD, ...TOASTS.map(t => t.text), ...EPISODES.map(e => e[1]), ...Object.values(CHIP_WORDS).flat()].join('\n')
  for (const bad of [/Herogasm/i, /Love Sausage/i, /Termite/i, /Fifteen Inches/i, /Sons of Bitches/i, /\bRobin\b/, /\bBecca\b/, /Stormfront/i, /Freedom Camp/i, /Pocket Romance/i, /Sex-Ed/i, /Kripk/i, /GRAVEYARD SHIFT/i, /\bChrist\b/, /\bc[u]nt/i]) expect(shipped).not.toMatch(bad)
  for (const t of TOASTS) {
    const quote = /“([^”]+)”/.exec(t.text)
    if (quote) expect((quote[1] as string).split(/\s+/).length).toBeLessThan(15)
  }
  expect(EPISODES.length).toBe(37)
  expect(REPLAYS.map(r => r.name)).toEqual(expect.arrayContaining(['hijack', 'onbrand', 'breaking', 'scoreboard']))
})
test('replay: play breaking puts the lower-third on the crawl now; refused names list the registry', async ($, on) => {
  base(on)
  await start($, 'the-boys')
  const run = async (a: string) => String(((await $.command.run({ command: 'missioncontrol', args: a } as never)) as { text?: string }).text)
  expect(await run('play breaking')).toBe('▶ breaking')
  expect(await bandAt($, 1250, false)).toContain('BREAKING')
  expect(await run('play nope')).toContain('hijack')
  vnnBreak('x', 0)
})

// --- sizes ---------------------------------------------------------------------------------------------------------------------
for (const look of ['brand', 'book', 'gold'] as const) {
  test(`sizes: ${look}: the band under 65 kB with BREAKING and the scoreboard at 750/900/1250; each pane Svg under 60 kB; the pane under 260 kB with four agents`, async ($, on) => {
    const clock = base(on, 960_000)
    await start($, 'the-boys')
    if (look === 'book') await say($, 'shock and awe, my son')
    if (look === 'gold') await say($, 'soldier boy')
    await jobIn($)
    await four($)
    await $.tool.call({ tool: 'Bash', command: 'npm test' } as never).catch(() => undefined)
    await clock.advance(500)
    for (const W of [750, 900, 1250]) {
      const b = await bandAt($, W)
      expect(b.length).toBeLessThan(65_000)
      expect(b).not.toContain('NaN')
    }
    const p = await svgs($, 'Pane')
    for (const s of p) expect(s.length).toBeLessThan(60_000)
    expect(p.reduce((n, s) => n + s.length, 0)).toBeLessThan(260_000)
  })
}
test('sizes: the cards with every figure earned, many steps, ten press releases and a long log stay under 60 kB; the swap layers are small', () => {
  const full: Cred = { ...BLANK_CRED, xp: 9000, jobs: 120, longJobs: 20, agents: 300, crewJobs: 4, chromed: true, badges: ['choom', 'merc', 'edgerunner', 'legend', 'netrunner', 'crewboss', 'chromed'], skinBadges: ['lateedition', 'solidgold'], found: ['solidgold'] }
  const legends = Array.from({ length: 12 }, (_, i) => ({ task: `Press release number ${i} about a very long incident title`, costUsd: 1.5, at: NOW - i * 1000, ms: 240_000 }))
  const steps = Array.from({ length: 9 }, (_, i) => ({ title: `Talking point ${i} with a long title to clip`, state: i < 3 ? 'done' : i === 3 ? 'running' : 'todo' }))
  const beats = Array.from({ length: 160 }, (_, i) => ({ at: NOW + i * 1000, tool: ['Read', 'Edit', 'Write', 'Bash', 'Agent'][i % 5] as string, text: `file-${i}.ts`, who: 'Manager' }))
  const org = { label: 'Manager', color: '#C9A13B', kind: 'manager', status: 'running', children: [{ label: 'Researchers', color: '#4FC3F7', kind: 'role', children: Array.from({ length: 20 }, (_, i) => ({ label: `Researcher: thing ${i}`, color: '#4FC3F7', kind: 'agent', status: i % 2 ? 'running' : 'done', children: [] })) }] }
  for (const m of ['brand', 'book', 'gold'] as const) {
    for (const W of [360, 560, 900]) {
      for (const svg of [credCard(W, full, m), credCard(W, BLANK_CRED, m), deskCard(W, TITLE, true, 3, 9, legends, m, steps), deskCard(W, '', false, 0, 0, [], m), dialCard(W, beats, -1, m), dialCard(W, beats, 20, m), dialCard(W, [], -1, m), tableCard(W, org, m)]) {
        expect(svg.length).toBeLessThan(60_000)
        expect(svg).not.toContain('NaN')
        expect(svg).not.toContain('undefined')
      }
    }
    expect(swapLayer(1250, 148, m, NOW).length).toBeLessThan(6_000)
  }
  expect(syringe(0, 0, 200, 50, 'brand')).toContain('data-egg="syringe"')
  expect(litOf(2, 5)).toBe(3)
  expect(litOf(5, 5)).toBe(7)
})
test('sprites: 49 rectangular TB_ sprites, every letter in the palette, the SOLID GOLD bust on its own', () => {
  const all = Object.entries(TB as Record<string, { rows: string[]; pal: Record<string, string> }>)
  expect(all.length).toBe(49)
  for (const [, sp] of all) {
    const w = sp.rows[0]?.length ?? 0
    for (const r of sp.rows) {
      expect(r.length).toBe(w)
      for (const ch of r) if (ch !== '.') expect(sp.pal[ch]).toBeTruthy()
    }
  }
  expect(TB.TB_SOLIDGOLD_BUST.rows.length).toBe(40)
})
