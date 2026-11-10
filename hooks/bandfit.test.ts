import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { condW } from './invincible'
import { serifW } from './mentalist-cards'
import { THEMES } from './themes'
import type { ThemeKey } from './themes'

// Every skin and mode, at five real widths, quiet and busy: no two texts on the band overlap and none crosses its edge.
// The boxes come from the drawing itself (each text's x, anchor, size, letter-spacing and the skin's own width model), not pixels.
const NOW = Date.parse('2026-10-20T10:00:00Z')
const MIN = 60_000
// The band's columns: about 450, 600, 750, 900 and 1250 px of layout (the host draws (cols * 9.5 - 48) / scale).
const COLS = [66, 86, 106, 126, 173]
type Store = Record<string, unknown>
const SKINS: [string, Store, ThemeKey | null][] = [
  ['default', { skin: 'default' }, null],
  ['default full band', { skin: 'default', simpleBand: false }, null],
  ['crab-classic', { skin: 'crab-classic' }, null],
  ['crab-classic full band', { skin: 'crab-classic', simpleBand: false }, null],
  ['mentalist', { skin: 'mentalist' }, 'mentalist'],
  ['red-john', { skin: 'red-john' }, 'redjohn'],
  ['breaking-bad', { skin: 'breaking-bad' }, 'breakingbad'],
  ['heisenberg', { skin: 'heisenberg' }, 'heisenberg'],
  ['better-call-saul', { skin: 'better-call-saul' }, 'bettercallsaul'],
  ['gene', { skin: 'gene' }, 'gene'],
  ['invincible classic suit', { skin: 'invincible' }, 'invincible'],
  ['invincible new suit', { skin: 'invincible', invEra: 2 }, 'invincible2'],
  ['caliper dark', { skin: 'caliper', calMode: 'dark' }, 'caliper'],
  ['caliper light', { skin: 'caliper', calMode: 'light' }, 'caliperlight'],
  ['the-boys ON BRAND', { skin: 'the-boys' }, 'boys'],
  ['the-boys OFF BOOK', { skin: 'the-boys', boysMode: 'book' }, 'boys2'],
  ['solidgold', { skin: 'solidgold' }, 'solidgold'],
  ['noir', { skin: 'noir' }, 'boysnoir'],
  ['cyberpunk-2077', { skin: 'cyberpunk-2077' }, null],
  ['arasaka', { skin: 'arasaka' }, null],
  ['lucy-edgerunners', { skin: 'lucy-edgerunners' }, null],
  ['samurai', { skin: 'samurai' }, null],
  ['edgerunners-2 D', { skin: 'edgerunners-2' }, 'edgerunners2'],
  ['edgerunners-2 CAPRI (capricorn)', { skin: 'capricorn' }, 'capricorn'],
]

const base = (on: On, store: Store, busy: boolean) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  mock.store(on, store)
  on('fs.exists', async (_$, e) => ({ value: /addons[\\/]cyberpunk[\\/]addon\.json$/.test(String((e as { path: string }).path)) }) as never)
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
  on('classic.Stop', async () => ({}) as never)
  let n = 0
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: `a${++n}` }) as never)
  // Busy: a full context, the five-hour and weekly limits high, a big bill.
  const usage = busy
    ? { startedAt: 0, context: { window: 1_000_000, tokens: 910_000 }, rateLimits: [{ kind: 'five_hour', percentUsed: 60, resetsAt: '2026-10-20T13:30:00Z' }, { kind: 'seven_day', percentUsed: 93, resetsAt: '2026-10-23T10:00:00Z' }], cost: { usd: 1234.56 } }
    : { startedAt: 0, context: { window: 1_000_000, tokens: 300_000 }, rateLimits: [], cost: { usd: 7.89 } }
  on('session.usage', async () => ({ value: usage }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  return clock
}

const BG = [
  { id: 'bsh001', type: 'shell', status: 'running', description: 'Dev server', command: 'npm run dev' },
  { id: 'wf0001', type: 'workflow', status: 'running', description: 'Release check', name: 'release-check' },
]
const CREW = ['Integrator: wave 2 of the overnight migration', 'Cutter: trim the fixtures', 'Cutter: split the parser', 'Cutter: drop the shims', 'Engineer: rewrite the parser', 'Engineer: wire the cache', 'Engineer: port the CLI', 'Engineer: fix the build', 'Researcher: map the API', 'Tester: break it', 'Writer: the release notes']
const spawn = ($: Engine, d: string, i: number) => $.agent.spawn({ tool_use_id: `t${i}`, prompt: 'p', description: d, subagentType: 'general-purpose', provider: 'engine', parentModel: 'x', background: false, fork: false } as never)

// Busy: crew mode on, two jobs in the background, a long title, 50 of a 60 minute budget gone, eleven agents in six roles.
const busyJob = async ($: Engine, clock: { advance: (ms: number) => Promise<unknown> }) => {
  await $.classic.Stop({ stop_hook_active: false, background_tasks: BG, session_crons: [] } as never)
  await $.command.run({ command: 'autocrew', args: 'always' } as never)
  await $.prompt.submit({ text: 'Integrate wave 2 of the overnight migration across every service, the docs and the release notes', cursor: 0 } as never)
  // @ts-ignore TS2589: the plugin's tool-name types are deep
  await $.tool.call({ tool: 'mcp__crab-progress__progress', title: 'Integrate wave 2 of the overnight migration across every service', total: 8, done: 6, minutes: 60, phase: 'delegate', tasks: CREW.slice(0, 8).map(title => ({ title, tier: 'medium' })) } as never).catch(() => undefined)
  for (const [i, d] of CREW.entries()) await spawn($, d, i)
  await clock.advance(50 * MIN + 57_000)
  await $.tool.call({ tool: 'Bash', command: 'cd /repo && npm run build -- --verbose --watch=false' } as never).catch(() => undefined)
}
const quietJob = async ($: Engine) => {
  await $.prompt.submit({ text: 'crack the case', cursor: 0 } as never)
  // @ts-ignore TS2589: the plugin's tool-name types are deep
  await $.tool.call({ tool: 'mcp__crab-progress__progress', title: 'Red-herring audit', total: 5, done: 1, phase: 'delegate', tasks: [{ title: 'Lead: run the case', tier: 'fable' }, { title: 'Researcher: map the API', tier: 'medium' }] } as never).catch(() => undefined)
  for (const [i, d] of ['Lead: run the case', 'Researcher: map the API', 'Engineer: wire the parser'].entries()) await spawn($, d, i)
}

type Width = (s: string, size: number, ls: number, bold: boolean) => number
// The shared guess for the system UI font (the plain and the cyberpunk bands), letter-spacing added per glyph.
const WIDE = /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿가-힣！-｠\u{1F300}-\u{1FAFF}]/u
const uiW: Width = (s, size, ls) => [...s].reduce((w, ch) => (ch === '︎' ? w : w + (WIDE.test(ch) ? 1 : /[\s.,:;'|!il1()[\]]/.test(ch) ? 0.3 : /[A-Z@%m]/.test(ch) ? 0.72 : 0.56) * size + ls), 0)
const widthOf = (key: ThemeKey | null): Width => {
  if (!key) return uiW
  const sw = THEMES[key].slim?.sw
  return sw ? (s, size, ls, bold) => sw(s, size, ls, bold) : (s, size, ls, bold) => serifW(s, size, ls, bold)
}

type Box = { l: number; r: number; t: number; b: number; s: string }
const attr = (tag: string, k: string): string | undefined => new RegExp(`\\s${k}="([^"]*)"`).exec(tag)?.[1]
const unescape = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
/**
 * The drawn texts of a band as boxes in its own units. Groups' translate() is followed; a text inside a clip (a news crawl that
 * runs under its label), a transient egg layer, a <title> or a <defs>, or drawn fully transparent (a glitch's resting ghost) is
 * not part of the layout and is left out.
 */
const boxesOf = (svg: string, skinW: Width): { boxes: Box[]; W: number } => {
  const W = Number(/viewBox="0 0 ([\d.]+) /.exec(svg)?.[1] ?? /<svg[^>]* width="([\d.]+)"/.exec(svg)?.[1])
  // The skin's own model for its band font (the family most texts use); a theme's second face, condensed or mono, by its own.
  const fams = new Map<string, number>()
  for (const m of svg.matchAll(/<text\b[^>]*?\sfont-family="([^"]*)"/g)) fams.set(m[1] as string, (fams.get(m[1] as string) ?? 0) + 1)
  const main = [...fams.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
  const widthFor = (family: string): Width => (family === main || !family ? skinW : /mono/i.test(family) ? (s, size, ls) => [...s].length * (size * 0.6 + ls) : /Condensed/.test(family) ? (s, size, ls) => condW(s, size, ls) : skinW)
  const boxes: Box[] = []
  type Frame = { name: string; dx: number; dy: number; skip: boolean }
  const stack: Frame[] = [{ name: 'root', dx: 0, dy: 0, skip: false }]
  let text: { tag: string; s: string; dx: number; dy: number } | null = null
  let inTitle = 0
  for (const m of svg.matchAll(/<!--(?:dl|\/dl)-->|<!--[\s\S]*?-->|<\/?([a-zA-Z][\w:-]*)([^>]*?)(\/?)>|([^<]+)/g)) {
    const tok = m[0]
    if (tok === '<!--dl-->') { stack.push({ name: '#dl', dx: 0, dy: 0, skip: true }); continue }
    if (tok === '<!--/dl-->') { while (stack.length > 1 && (stack.pop() as Frame).name !== '#dl'); continue }
    if (tok.startsWith('<!--')) continue
    const top = stack[stack.length - 1] as Frame
    if (m[4] !== undefined) {
      if (text && !inTitle) text.s += m[4]
      continue
    }
    const name = m[1] as string
    const closing = tok.startsWith('</')
    const selfClosing = m[3] === '/'
    if (name === 'title') { inTitle += closing ? -1 : selfClosing ? 0 : 1; continue }
    if (name === 'tspan') continue
    if (name === 'text') {
      if (closing) {
        if (text) {
          const tag = text.tag
          const s = unescape(text.s).replace(/\s+/g, ' ').trim()
          const x = Number(attr(tag, 'x'))
          const y = Number(attr(tag, 'y'))
          const size = parseFloat(attr(tag, 'font-size') ?? '12')
          const hidden = attr(tag, 'opacity') === '0' || attr(tag, 'fill-opacity') === '0' || attr(tag, 'fill') === 'none'
          if (s && Number.isFinite(x) && Number.isFinite(y) && !hidden && !top.skip) {
            const wd = widthFor(attr(tag, 'font-family') ?? '')(s, size, parseFloat(attr(tag, 'letter-spacing') ?? '0'), Number(attr(tag, 'font-weight') ?? 400) >= 600)
            const anchor = attr(tag, 'text-anchor')
            const l = text.dx + (anchor === 'end' ? x - wd : anchor === 'middle' ? x - wd / 2 : x)
            // 2 px of tolerance each side, the glyphs' box from cap height to baseline.
            boxes.push({ l: l + 2, r: l + wd - 2, t: text.dy + y - size * 0.72, b: text.dy + y + size * 0.12, s })
          }
        }
        text = null
      } else if (!selfClosing) text = { tag: tok, s: '', dx: top.dx, dy: top.dy }
      continue
    }
    if (!['g', 'svg', 'defs', 'clipPath', 'mask', 'symbol', 'pattern', 'a'].includes(name) || selfClosing) continue
    if (closing) {
      if (stack.length > 1) stack.pop()
      continue
    }
    const tr = attr(tok, 'transform') ?? ''
    const tm = /^\s*translate\(\s*(-?[\d.]+)(?:[\s,]+(-?[\d.]+))?\s*\)\s*$/.exec(tr)
    const other = tr !== '' && !tm
    const skip = top.skip || other || name !== 'g' && name !== 'svg' && name !== 'a' || attr(tok, 'clip-path') !== undefined || attr(tok, 'data-egg') !== undefined || attr(tok, 'opacity') === '0'
    stack.push({ name, dx: top.dx + (tm ? Number(tm[1]) : 0), dy: top.dy + (tm ? Number(tm[2] ?? 0) : 0), skip: name === 'svg' && stack.length === 1 ? false : skip })
  }
  return { boxes, W }
}
const problems = (svg: string, w: Width): string[] => {
  const { boxes, W } = boxesOf(svg, w)
  const out: string[] = []
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i] as Box
    if (a.l < -0.5 || a.r > W + 0.5) out.push(`"${a.s}" crosses the edge (${Math.round(a.l)}..${Math.round(a.r)} of ${W})`)
    for (let j = i + 1; j < boxes.length; j++) {
      const b = boxes[j] as Box
      // a glitch's or chromatic copy sits within a few px of the text it copies
      if (a.s === b.s && Math.abs(a.l - b.l) < 4 && Math.abs(a.t - b.t) < 4) continue
      if (Math.min(a.r, b.r) - Math.max(a.l, b.l) > 1 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 3) out.push(`"${a.s}" overlaps "${b.s}"`)
    }
  }
  return out
}

for (const [label, store, key] of SKINS)
  for (const busy of [false, true])
    test(`band fit: ${label}, ${busy ? 'busy' : 'quiet'}: at every width no two texts overlap and none crosses the edge`, { timeoutMs: 60_000 }, async ($, on) => {
      const clock = base(on, store, busy)
      await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
      if (busy) await busyJob($, clock)
      else await quietJob($)
      const found: string[] = []
      for (const bodyColumns of COLS) {
        const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: true, maxRows: 14, bodyColumns } as never })
        const svg = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source))[0] ?? ''
        await ui.unmount()
        expect(svg).toContain('<text')
        if (busy) expect(svg).toMatch(/50:57 \/ 60m|50\/60m/) // the budget clock, a working number, stays at every width
        found.push(...problems(svg, widthOf(key)).map(p => `${bodyColumns} cols: ${p}`))
      }
      expect(found).toEqual([])
    })

test('band fit: the measure sees an overlap and an edge when there is one', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="40" viewBox="0 0 300 40"><g transform="translate(10 0)"><text x="0" y="20" font-size="12">CREW MODE</text></g><text x="40" y="20" font-size="12">50:57</text><text x="290" y="30" font-size="12">2 BACKGROUND</text><g clip-path="url(#c)"><text x="0" y="20" font-size="12">a crawl</text></g></svg>'
  const p = problems(svg, uiW)
  expect(p).toContain('"CREW MODE" overlaps "50:57"')
  expect(p.some(x => x.startsWith('"2 BACKGROUND" crosses the edge'))).toBe(true)
  expect(p.some(x => x.includes('a crawl'))).toBe(false)
})

// Chin's call: in CAPRI mode the CAPRI IN CONTROL chip stays on a narrow band; CREW and the background count give way first.
test('band fit: CAPRI IN CONTROL outranks CREW and the background count at every width (narrow bands drop them first)', { timeoutMs: 60_000 }, async ($, on) => {
  const clock = base(on, { skin: 'capricorn' }, true)
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  await busyJob($, clock)
  const seen: string[] = []
  for (const bodyColumns of COLS) {
    const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: true, maxRows: 14, bodyColumns } as never })
    const svg = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source))[0] ?? ''
    await ui.unmount()
    const capri = /CAPRI IN CONTROL/.test(svg.replace(/<title>[\s\S]*?<\/title>/g, ''))
    const crew = />(?:CREW MODE|CREW)</.test(svg)
    const bg = />2 (?:BACKGROUND|BG)</.test(svg)
    seen.push(`${bodyColumns}:${capri ? 'C' : '-'}${crew ? 'W' : '-'}${bg ? 'B' : '-'}`)
    expect(capri).toBe(true)
    expect(problems(svg, widthOf('capricorn'))).toEqual([])
  }
  // The widest bands keep all three; the narrowest (about 450 px) keeps CAPRI's chip and lets CREW and the background count go.
  expect(seen).toEqual(['66:C--', '86:CWB', '106:CWB', '126:CWB', '173:CWB'])
})
