import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const BAND = { component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100 } as never } as const

async function session($: Engine, on: On) {
  mock.clock(on, { now: Date.parse('2026-10-10T02:00:00Z') })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  on('settings.read', async () => ({ value: {} }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'terminal', isInteractive: true } as never)
  await $.tool.call({ tool: 'mcp__crab-progress__progress', title: 'Ship it', total: 4, done: 1, phase: 'delegate' } as never)
}

async function band($: Engine, surface: 'terminal' | 'desktop') {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface, ...BAND })
  const svg = await ui.findAll({ type: 'Svg' })
  const title = await ui.findAll({ type: 'Text', text: /^Ship it$/ })
  const label = await ui.findAll({ type: 'Text', text: /^Tasks 1\/4$/ })
  await ui.unmount()
  return { svg: svg.length, title: title.length, label: label.length }
}

test('terminal: the row draws the title, bar and label as text, not an Svg', async ($, on) => {
  await session($, on)
  expect(await band($, 'terminal')).toEqual({ svg: 0, title: 1, label: 1 })
})

test('desktop: the row is still one Svg', async ($, on) => {
  await session($, on)
  expect(await band($, 'desktop')).toEqual({ svg: 1, title: 0, label: 0 })
})

// ---- the simple band (default, Crab Classic): row 3 shows this task and the SESSION's total, never "Today".
const WARN = '#E9B44C'
const ALERT = '#E5675E'
const dayKey = (at: number): string => {
  const d = new Date(at)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const NOW = Date.parse('2026-10-10T02:00:00Z')
async function simple($: Engine, on: On, o: { skin: string; sessionUsd: number; todayUsd?: number; dailyUsd?: number }): Promise<string> {
  mock.clock(on, { now: NOW })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on, { skin: o.skin, dailyUsd: o.dailyUsd ?? 0, ...(o.todayUsd !== undefined ? { today: { date: dayKey(NOW), tasks: 0, agents: 0, tokens: 0, costUsd: o.todayUsd } } : {}) })
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
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: 300_000 }, rateLimits: [], cost: { usd: o.sessionUsd } } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 140 } as never })
  const all = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  await ui.unmount()
  return all
}

for (const skin of ['default', 'crab-classic']) {
  test(`simple band (${skin}): the cost row says Total, with the session's dollars, and no Today`, async ($, on) => {
    const svg = await simple($, on, { skin, sessionUsd: 3.21 })
    expect(svg).toContain('This task')
    expect(svg).toMatch(/Total <tspan[^>]*>≈\$3\.21</)
    expect(svg).not.toContain('Today <tspan')
    expect(svg).toContain('Context')
  })
}

test('simple band: the daily cap still warns, as a dot beside the Total: none under 80%, amber from 80%, red from 100% (of TODAY)', async ($, on) => {
  const low = await simple($, on, { skin: 'default', sessionUsd: 0, todayUsd: 2, dailyUsd: 10 })
  expect(low).not.toContain('●')
})
test('simple band: the cap dot is amber from 80% of the daily cap', async ($, on) => {
  const svg = await simple($, on, { skin: 'crab-classic', sessionUsd: 0, todayUsd: 8.5, dailyUsd: 10 })
  expect(svg).toContain(`<tspan fill="${WARN}"> ●<title>Today ≈$8.50 of the $10.0 daily cap</title></tspan>`)
  expect(svg).toMatch(/Total <tspan[^>]*>≈\$0\.00</)
})
test('simple band: the cap dot is red from 100% of the daily cap', async ($, on) => {
  const svg = await simple($, on, { skin: 'crab-classic', sessionUsd: 0, todayUsd: 10.5, dailyUsd: 10 })
  expect(svg).toContain(`<tspan fill="${ALERT}"> ●`)
})
test('simple band: the default skin warns with its own colour, still a dot beside the Total', async ($, on) => {
  const svg = await simple($, on, { skin: 'default', sessionUsd: 0, todayUsd: 10.5, dailyUsd: 10 })
  expect(svg).toMatch(/Total <tspan[^>]*>≈\$0\.00<\/tspan><tspan fill="#[0-9A-Fa-f]{6}"> ●/)
})
test('simple band: no daily cap set, no dot however much was spent today', async ($, on) => {
  const svg = await simple($, on, { skin: 'default', sessionUsd: 0, todayUsd: 99, dailyUsd: 0 })
  expect(svg).not.toContain('●')
})
