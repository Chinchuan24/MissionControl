// The 7SPN scoreboard (M5) on the REAL band never sits on the task row's text: it hangs in the strip under the top row's rule, so
// a long activity line ("› running npm run build ...") stays whole under it, at the five band-fit widths, in all four looks.
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { SCORE_H, SCORE_W, SCORE_Y, scoreX } from './theboys'

const NOW = Date.parse('2026-10-20T10:00:00Z')
const COLS: Record<number, number> = { 450: 66, 600: 86, 750: 106, 900: 126, 1250: 173 }
const base = (on: On, store: Record<string, unknown>) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on, store)
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
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: 120_000 }, rateLimits: [], cost: { usd: 12.34 } } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  return clock
}
const band = async ($: Engine, W: number): Promise<string> => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: true, maxRows: 14, bodyColumns: COLS[W] } as never })
  const all = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  await ui.unmount()
  return all
}
type Box = [number, number, number, number]
const hit = (a: Box, b: Box): boolean => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]
/** The boxes of the band's own texts in the strip from the top rule to the task row (absolute `x`/`y`, as the band draws them): a
 *  generous estimate (0.62 em a glyph, the ascent from 0.8 em above the baseline to 0.25 em below). */
const rowTexts = (svg: string): { box: Box; text: string }[] => {
  const out: { box: Box; text: string }[] = []
  const body = svg.replace(/<g data-egg="scoreboard">[\s\S]*?<\/title><\/g>/g, '')
  for (const m of body.matchAll(/<text([^>]*)>([^<]*)</g)) {
    const at = m[1] as string
    const x = Number(/\sx="([\d.-]+)"/.exec(at)?.[1])
    const y = Number(/\sy="([\d.-]+)"/.exec(at)?.[1])
    const fs = Number(/font-size="([\d.]+)"/.exec(at)?.[1] ?? 11.5)
    const text = (m[2] ?? '').trim()
    if (!text || !Number.isFinite(x) || !Number.isFinite(y) || y < 30 || y > 62) continue
    const w = text.length * 0.62 * fs
    const x0 = /text-anchor="end"/.test(at) ? x - w : /text-anchor="middle"/.test(at) ? x - w / 2 : x
    out.push({ box: [x0, y - 0.8 * fs, w, 1.05 * fs], text })
  }
  return out
}
const LOOKS: [string, Record<string, unknown>, string][] = [['brand', {}, 'the-boys'], ['book', { boysMode: 'book' }, 'the-boys'], ['gold', {}, 'solidgold'], ['noir', {}, 'noir']]
for (const [look, store, skin] of LOOKS) {
  test(`7SPN: the scoreboard hangs under the top rule and never covers the task row's text (${look}, 450-1250)`, { timeoutMs: 60_000 }, async ($, on) => {
    const clock = base(on, store)
    await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
    await $.command.run({ command: 'skin', args: skin } as never)
    await clock.advance(5_000)
    await $.prompt.submit({ text: 'GDA HQ incident report', cursor: 0 } as never)
    await $.tool.call({ tool: 'mcp__crab-progress__progress', title: 'GDA HQ incident report', total: 5, done: 2, tasks: [{ title: 'Lead: run it', tier: 'fable' }, { title: 'Tester: break it', tier: 'heavy' }] } as never).catch(() => undefined)
    await $.tool.call({ tool: 'Bash', command: 'npm run build:everything -- --verbose --watch=false --reporter=spec --coverage --long-flag-to-fill-the-activity-text-all-the-way' } as never).catch(() => undefined)
    await clock.advance(4_000)
    await $.command.run({ command: 'missioncontrol', args: 'play scoreboard' } as never)
    await clock.advance(50)
    for (const W of [450, 600, 750, 900, 1250]) {
      const svg = await band($, W)
      expect(`${look}@${W}:${svg.includes('data-egg="scoreboard"')}`).toBe(`${look}@${W}:true`)
      const vb = /viewBox="0 0 ([\d.]+) /.exec(svg)?.[1]
      const bw = Number(vb)
      const x = scoreX(bw)
      // The bug is drawn where scoreX says, inside the band, in the strip under the rule (32.5) and above the task row's glyphs.
      expect(svg).toContain(`<path d="M${Math.round(x * 10) / 10} ${SCORE_Y}h${SCORE_W}`)
      expect(x).toBeGreaterThan(60)
      expect(x + SCORE_W).toBeLessThanOrEqual(bw - 14)
      expect(SCORE_Y).toBeGreaterThan(32.5)
      expect(SCORE_Y + SCORE_H).toBeLessThanOrEqual(43.5)
      // The Tasks chip (y 41-59) is always further left than the bug.
      const pill = /<rect x="([\d.]+)" y="41" width="([\d.]+)" height="18"/.exec(svg)
      if (pill) expect(Number(pill[1]) + Number(pill[2])).toBeLessThan(x)
      const bug: Box = [x, SCORE_Y, SCORE_W, SCORE_H]
      const texts = rowTexts(svg)
      // The activity line is on the band (long, clipped by the band) and the bug overlaps none of the row's texts.
      expect(`${look}@${W}:${texts.some(t => t.text.startsWith('›'))}`).toBe(`${look}@${W}:true`)
      expect(texts.filter(t => hit(t.box, bug)).map(t => `${look}@${W}:${t.text}`)).toEqual([])
    }
  })
}
