// The Mentalist + Red John, final review (wave 4): on the REAL slim band at the band-fit widths, Red John's walk-by and the
// Parlour Reveal play in rooms of their own, free of every word of the band (the task title, the Tasks chip, the step's words,
// the tip line, every number); nothing outside them is dimmed (the title stays lit the whole act). THE READ's two lines never sit
// on each other or on a word of the band, and its dark never reaches the title. Red John's smile close-up is lit.
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { audit, BUDGET } from './stage/budget'
import { serifW } from './mentalist-cards'

const NOW = Date.parse('2026-10-20T10:00:00Z')
const BAND = { hasSurvey: false, isWorking: true, maxRows: 14 } as const
const COLS: Record<number, number> = { 450: 66, 600: 86, 750: 106, 900: 126, 1250: 173 }
type R = [number, number, number, number]

const base = (on: On, skin: string) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on, { skin })
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
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: 300_000 }, rateLimits: [], cost: { usd: 7.89 } } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  return clock
}
const job = async ($: Engine) => {
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  // Off: only the replay plays (the act under test, at a known moment).
  await $.command.run({ command: 'missioncontrol', args: 'fights off' } as never)
  await $.prompt.submit({ text: 'crack the case', cursor: 0 } as never)
  // @ts-ignore TS2589: the plugin's tool-name types are deep; the same call is already ignored in the other tests' budget
  await $.tool.call({ tool: 'mcp__crab-progress__progress', title: 'Red-herring audit', total: 5, done: 1, phase: 'delegate', tasks: [{ title: 'Lead: run the case', tier: 'fable' }, { title: 'Researcher: map the API', tier: 'medium' }, { title: 'Engineer: wire the parser', tier: 'careful' }] } as never)
  for (const [i, d] of ['Lead: run the case', 'Researcher: map the API', 'Engineer: wire the parser'].entries()) await $.agent.spawn({ tool_use_id: `t${i}`, prompt: 'p', description: d, subagentType: 'general-purpose', provider: 'engine', parentModel: 'x', background: false, fork: false } as never)
}
const band = async ($: Engine, W: number): Promise<string> => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { ...BAND, bodyColumns: COLS[W] } as never })
  const all = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  await ui.unmount()
  return all
}
/** Every text of a drawing as a box (band coordinates), measured with the serif's own widths (1 px of tolerance each side). */
const textBoxes = (svg: string, dx = 0, dy = 0): R[] => {
  const out: R[] = []
  for (const m of svg.matchAll(/<text ([^>]*)>(.*?)<\/text>/gs)) {
    const at = (k: string) => new RegExp(`(?:^| )${k}="([^"]*)"`).exec(m[1] as string)?.[1]
    const x = Number(at('x'))
    const y = Number(at('y'))
    const size = Number(at('font-size') ?? 12)
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    const s = (m[2] as string).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'")
    if (!s.trim()) continue
    const w = serifW(s, size, Number(at('letter-spacing') ?? 0), at('font-weight') === '700')
    const anchor = at('text-anchor')
    const l = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x
    out.push([l + dx + 1, y + dy - size * 0.75, w - 2, size * 0.9])
  }
  return out
}
const meet = (a: R, b: R): boolean => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]
/** The act's own clip rectangles (span coordinates to band: + 8, + 34), by the key its id ends in. */
const clips = (act: string, key: string): R[] => [...act.matchAll(new RegExp(`<clipPath id="[\\w-]*${key}"><rect x="([-\\d.]+)" y="([-\\d.]+)" width="([\\d.]+)" height="([\\d.]+)"/>`, 'g'))].map(m => [Number(m[1]) + 8, Number(m[2]) + 34, Number(m[3]), Number(m[4])] as R)
const scales = (svg: string): number[] => [...svg.matchAll(/scale\(-?([\d.]+)[ ,)]/g)].map(m => Number(m[1]))
const split = (svg: string): { act: string; rest: string } => {
  const act = /<!--dl-->[\s\S]*?<!--\/dl-->/.exec(svg)?.[0] ?? ''
  return { act, rest: svg.replace(act, '') }
}

const WIDE = [450, 600, 750, 900, 1250]
for (const [skin, play, at, keys] of [['red-john', 'walk-by', 3_000, ['wr', 'wc']], ['mentalist', 'parlour-reveal', 6_500, ['rm', 'hp']]] as const) {
  test(`final: ${play} on the real band at ${WIDE.join(', ')}: in a room free of every word, the title lit, nothing covered`, { timeoutMs: 60_000 }, async ($, on) => {
    const clock = base(on, skin)
    await job($)
    const calm: Record<number, string> = {}
    for (const W of WIDE) calm[W] = await band($, W)
    expect(String(((await $.command.run({ command: 'missioncontrol', args: `play ${play}` } as never)) as { text?: string }).text)).toBe(`▶ ${play}`)
    await clock.advance(at)
    for (const W of WIDE) {
      const { act, rest } = split(await band($, W))
      expect(act.length, `${play} ${W}: drawn`).toBeGreaterThan(1000)
      // Every word of the band: the title, the Tasks chip, the step count and its words, the tip, the totals, the readouts.
      const words = textBoxes(split(calm[W] as string).rest)
      expect(words.length, `${W}: words found`).toBeGreaterThanOrEqual(10)
      expect(rest.includes('Red-herring audit') || rest.includes('Red-herring …'), `${W}: the title is on the band`).toBe(true)
      for (const k of keys) {
        const rs = clips(act, k)
        expect(rs.length, `${play} ${W} ${k}`).toBe(1)
        for (const r of rs) for (const b of words) expect(meet(r, b), `${play} ${W}: ${k} ${r.map(Math.round)} meets a word at ${b.map(Math.round)}`).toBe(false)
      }
      // Nothing dims the whole span any more (the old scrim): every dark rect of the act is one of its rooms.
      expect(act, `${W}`).not.toMatch(/<rect width="[\d.]+" height="[\d.]+" fill="url\(#[\w-]+sg\)"/)
      // The act's own line (the butler's) stands whole, clear of every word of the band.
      for (const b of textBoxes(act, 8, 34)) for (const w of words) expect(meet(b, w), `${play} ${W}: its line meets a word`).toBe(false)
      const a = audit(act)
      expect(a.dupes).toEqual([])
      expect(a.dupeIds).toEqual([])
      expect(a.reduced).toBe(true)
      expect(a.chars, `${play} ${W}`).toBeLessThanOrEqual(BUDGET.fightBand.band - 1000)
    }
  })
}

test('final: the walk-by and the Parlour stand big where the band has room (900, 1250), and the smile close-up is lit', { timeoutMs: 60_000 }, async ($, on) => {
  const clock = base(on, 'red-john')
  await job($)
  await $.command.run({ command: 'missioncontrol', args: 'play walk-by' } as never)
  await clock.advance(3_000)
  for (const W of [900, 1250]) {
    const { act } = split(await band($, W))
    // He walks: two walk frames along a path, at 1.4x or more (about 66 px tall).
    expect(Math.max(...scales(act)), `${W}`).toBeGreaterThanOrEqual(1.4)
    expect(act).toContain('#C42A22')
    // The close-up's palette: the smile and the jaw's edge catch a bright red; the jaw itself stays a dark shape (faceless).
    expect(act).toContain('#FF3B2E')
    expect(act).not.toMatch(/#(E9B183|DBC2B5|F9BE91)/i)
  }
})

test('final: THE READ at often: its two lines never sit on each other or on a word of the band; its dark keeps off the title', { timeoutMs: 60_000 }, async ($, on) => {
  const clock = base(on, 'mentalist')
  await job($)
  await $.command.run({ command: 'missioncontrol', args: 'play the-read' } as never)
  await clock.advance(5_000)
  for (const W of WIDE) {
    const svg = await band($, W)
    const { act, rest } = split(svg)
    expect(act, `${W}`).toContain('Seven of hearts.')
    // The two lines (the reduced-motion still repeats the reveal at its own place: one box per distinct line).
    const tell = textBoxes(act.match(/<text [^>]*>a blink\.<\/text>/g)?.join('') ?? '', 8, 34)
    const reveal = textBoxes(act.match(/<text [^>]*>Seven of hearts\.<\/text>/g)?.join('') ?? '', 8, 34)
    expect(tell.length, `${W}`).toBeGreaterThanOrEqual(1)
    expect(reveal.length, `${W}`).toBeGreaterThanOrEqual(1)
    for (const b of tell) for (const c of reveal) expect(meet(b, c), `${W}: the two lines`).toBe(false)
    const lines = [...tell, ...reveal]
    const words = textBoxes(rest)
    for (const b of lines) for (const w of words) expect(meet(b, w), `${W}: a line meets the band's ${w.map(Math.round)}`).toBe(false)
    // The dark (the two's rectangle and the palm's strip) never reaches the title or the Tasks chip.
    const title = textBoxes(rest).filter(b => b[1] < 62 && b[0] < 300)
    expect(title.length, `${W}: the title and chip found`).toBeGreaterThanOrEqual(2)
    for (const k of ['bx', 'pc']) for (const r of clips(act, k)) for (const t of title) expect(meet(r, t), `${W}: ${k} ${r.map(Math.round)} over ${t.map(Math.round)}`).toBe(false)
    expect(audit(act).chars, `${W}`).toBeLessThanOrEqual(BUDGET.fightBand.band - 1000)
  }
})
