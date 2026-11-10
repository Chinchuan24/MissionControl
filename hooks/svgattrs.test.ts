import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { M } from './invincible'

// An attribute written twice in one tag makes the whole SVG invalid, and the desktop then draws the band as a broken image
// (the alt text with a broken-image icon). The GDA "REC" tag in Invincible's Cecil cameo did this with font-weight.
const dupes = (svg: string): string[] => {
  const out: string[] = []
  for (const tag of svg.match(/<[a-zA-Z][^<>]*>/g) ?? []) {
    const names = [...tag.matchAll(/\s([a-zA-Z:-]+)=/g)].map(m => m[1])
    const seen = new Set<string>()
    for (const n of names) {
      if (seen.has(n)) out.push(`${n} in ${tag.slice(0, 80)}`)
      seen.add(n)
    }
  }
  return out
}

test('M: a font-weight in extra replaces the default, never doubles it', () => {
  expect(dupes(M(0, 0, 'GDA', 7.5, '#7FE0A8', 'letter-spacing=".6" font-weight="700"'))).toEqual([])
  expect(M(0, 0, 'GDA', 7.5, '#fff', 'font-weight="700"')).toContain('font-weight="700"')
  expect(M(0, 0, 'REC', 7.5, '#fff')).toContain('font-weight="500"')
})

const base = (on: On) => {
  const clock = mock.clock(on, { now: Date.parse('2026-11-09T10:00:00Z') })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on)
  on('fs.exists', async () => ({ value: false }) as never)
  on('settings.read', async () => ({ value: {} }) as never)
  on('tool.register', async () => ({ value: undefined }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
  on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
  on('ui.panes', async () => ({ value: [] }) as never)
  on('ui.toast', async () => ({ value: undefined }) as never)
  on('audio.play', async () => ({ value: undefined }) as never)
  on('tool.call', async () => ({ result: 'ok' }) as never)
  on('prompt.submit', async (_$, e) => ({ text: (e as { text: string }).text }) as never)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: 360_000 }, rateLimits: [], cost: { usd: 3 } } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  return clock
}

for (const egg of ['cecil', 'eve', 'oliver', 'think', 'showdown', 'fight']) {
  test(`Invincible ${egg}: no attribute twice in any band or pane drawing`, async ($: Engine, on: On) => {
    const clock = base(on)
    await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
    await $.command.run({ command: 'skin', args: 'invincible' } as never)
    await $.prompt.submit({ text: 'Ship the launch trailer' } as never)
    await $.tool.call({ tool: 'mcp__crab-progress__demo', egg } as never)
    const found: string[] = []
    for (let s = 0; s < 20; s += 1) {
      for (const [component, props] of [
        ['AbovePrompt', { hasSurvey: false, isWorking: true, maxRows: 14, bodyColumns: 126 }],
        ['Pane', { title: '', isFocused: false, bodyColumns: 100, placement: 'dock', scroll: { offset: 0, bodyRows: 60 }, view: {} }],
      ] as const) {
        const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component, ...(component === 'Pane' ? { requestId: 'crab-agents' } : {}), props: props as never } as never)
        for (const el of await ui.findAll({ type: 'Svg' })) found.push(...dupes(String(el.props.source)))
        await ui.unmount()
      }
      await clock.advance(1000)
    }
    expect([...new Set(found)].slice(0, 5)).toEqual([])
  })
}
