// Wave 4: SAMURAI's daily "2023" gig ends on the rocker: his close-up cut-in, the chord's shockwave, his three stage finishers
// (leap, knee slide, finisher), in the fights' lane on the classic band, pinned to the gig (a redraw resumes it).
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { audit } from './stage/budget'
import { overlaps, readouts } from './stage/keep'
import { FIN_AT, FIN_MS, finPx, finaleAct, gigFinale } from './cyber-fights'
import { ACT_MS } from './cyber-motion'

test('samurai finale: the gig covers it, a clean layer in budget at every region, its three poses and the cut-in, a still', () => {
  expect(ACT_MS.gig).toBeGreaterThanOrEqual(FIN_AT * 1000 + FIN_MS)
  for (const [w, h] of [[220, 46], [352, 46], [300, 78], [430, 78], [640, 78]] as const) {
    const a = finaleAct({ at: 0, w, h, id: `t-fin-${w}x${h}` })
    const au = audit(`<svg xmlns="http://www.w3.org/2000/svg">${a.layer}</svg>`)
    expect(au.dupes, `${w}x${h}`).toEqual([])
    expect(au.dupeIds, `${w}x${h}`).toEqual([])
    expect(au.badText, `${w}x${h}`).toEqual([])
    expect(au.chars, `${w}x${h}`).toBeLessThanOrEqual(16_000)
    expect(a.act.chainKeys()).toEqual(['leap', 'slide', 'fin'])
    // the reduced-motion still: the finisher under the spot
    expect(a.layer).toMatch(/class="[\w-]+-s"><rect[^>]*\/><path[^>]*\/><use href="#[\w-]+fin"/)
  }
  // The rocker stands as tall as the lane allows: 72 px in the classic band's wide stage, 40 in its title row.
  expect(finPx(78)).toBeGreaterThanOrEqual(70)
  expect(finPx(46)).toBeGreaterThanOrEqual(39)
  // Drawn from a minute before its start (the band looks a minute ahead), gone after it.
  const gig = 1_000_000
  const t0 = gig + FIN_AT * 1000
  expect(gigFinale(1596, t0 - 61_000, gig)).toBe('')
  expect(gigFinale(1596, gig, gig)).toContain(FIN_MARK)
  expect(gigFinale(1596, t0 + FIN_MS, gig)).toBe('')
  expect(gigFinale(1596, gig, undefined)).toBe('')
})

/** The finale's own mark on a band: its spotlight cone's gradient (the SAMURAI band draws no other). */
const FIN_MARK = 'stop-color="#FFF4C0" stop-opacity=".38"'
const NOW = Date.parse('2026-10-20T10:00:00Z')
const COLS: Record<number, number> = { 450: 66, 600: 86, 750: 106, 900: 126, 1250: 173 }
const base = (on: On, ctx = 100_000) => {
  const clock = mock.clock(on, { now: NOW })
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
  on('turn.complete', async () => ({ text: '' }) as never)
  on('prompt.submit', async (_$, e) => ({ text: (e as { text: string }).text }) as never)
  let n = 0
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: `a${++n}` }) as never)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: ctx }, rateLimits: [], cost: { usd: 1.23 } } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  return clock
}
const band = async ($: Engine, W: number): Promise<string> => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: true, maxRows: 14, bodyColumns: COLS[W] } as never })
  const all = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  await ui.unmount()
  return all
}
const TITLE = 'GDA HQ incident report'
const ROLES = ['Lead: run it', 'Researcher: map the API', 'Engineer: rewrite the parser', 'Tester: break it', 'Writer: the report', 'Reviewer: read the diff']
const work = async ($: Engine, agents: number) => {
  await $.prompt.submit({ text: TITLE, cursor: 0 } as never)
  await $.tool.call({ tool: 'mcp__crab-progress__progress', title: TITLE, total: 6, done: 2, phase: 'delegate', tasks: ROLES.map(title => ({ title, tier: 'medium' })) } as never).catch(() => undefined)
  for (const [i, d] of ROLES.slice(0, agents).entries()) await $.agent.spawn({ tool_use_id: `t${i}`, prompt: 'p', description: d, subagentType: 'general-purpose', provider: 'engine', parentModel: 'x', background: false, fork: false } as never)
}
// The classic band draws its rows in translated groups: read the readouts with their offsets (as keepout.test.ts does).
const flat = (svg: string): string => {
  const at: [number, number][] = [[0, 0]]
  let out = ''
  for (const m of svg.matchAll(/<g\b([^>]*?)(\/?)>|<\/g>|<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const top = at[at.length - 1] as [number, number]
    if (m[0] === '</g>') { if (at.length > 1) at.pop(); continue }
    if (m[0].startsWith('<g')) {
      if (m[2]) continue
      const t = /transform="translate\(([-\d.]+)[ ,]+([-\d.]+)\)"/.exec(m[1] as string)
      at.push(t ? [top[0] + Number(t[1]), top[1] + Number(t[2])] : top)
      continue
    }
    const a = (m[3] as string).replace(/ x="([-\d.]+)"/, (_, v) => ` x="${Number(v) + top[0]}"`).replace(/ y="([-\d.]+)"/, (_, v) => ` y="${Number(v) + top[1]}"`)
    out += `<text${a}>${m[4]}</text>`
  }
  return out
}

for (const [agents, crew] of [[4, false], [6, true]] as const) test(`samurai finale: on the real band (${agents} agents${crew ? ', crew mode' : ''}), in its lane, off every readout, the band under its caps`, { timeoutMs: 90_000 }, async ($, on) => {
  const clock = base(on)
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  await $.command.run({ command: 'skin', args: 'samurai' } as never)
  if (crew) await $.command.run({ command: 'autocrew', args: 'always' } as never)
  await clock.advance(5_000)
  await work($, agents)
  await clock.advance(4_000)
  const calm: Record<number, string> = {}
  for (const W of [450, 600, 750, 900, 1250]) calm[W] = await band($, W)
  expect(String(((await $.command.run({ command: 'missioncontrol', args: 'play gig-2023' } as never)) as { text?: string }).text)).toBe('▶ gig-2023')
  let t = 0
  for (const at of [400, 5_000, 6_500]) {
    await clock.advance(at - t)
    t = at
    for (const W of [450, 600, 750, 900, 1250]) {
      const b = await band($, W)
      expect(b, `${W} at ${at}: the finale is drawn (pinned to the gig)`).toContain(FIN_MARK)
      // The whole gig stays on (the band never goes "lite", which drops the gig's set): 1 k under the 120 k line.
      expect(b, `${W} at ${at}: the gig's set is still drawn`).toContain('NEVER FADE AWAY · 2023')
      expect(b.length, `${W} at ${at}`).toBeLessThanOrEqual(119_000)
      const clip = /<clipPath id="([\w-]+rg)"><path clip-rule="evenodd" d="([^"]+)"/.exec(b)
      expect(clip, `${W}: a keep-out clip`).not.toBeNull()
      const d = (clip as RegExpExecArray)[(clip as RegExpExecArray).length - 1] as string
      expect(overlaps(readouts(flat(calm[W] as string)), d), `${W}`).toEqual([])
      expect(Number(/^M[-\d.]+ ([-\d.]+)/.exec(d)?.[1])).toBeGreaterThanOrEqual(33)
    }
  }
})
