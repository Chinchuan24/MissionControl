// Better Call Saul, wave 3 phase B: the CHICANERY bar hearing (band + LEGAL PAD), its rarity and replay, the three-failed-runs
// trigger, the GENE look (the colour drain and flood, the stepped film grain, the NIPPY! shutter cheer, his blink and glint, his
// glasses in the head turn) and the two skins' own skin-switch flavours.
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { overlaps, readouts } from './stage/keep'
import { BUDGET, audit, chars } from './stage/budget'
import { MIN } from './stage/director'
import { skinSwitch } from './stage/wipe'
import { BCS_CSS, CARD_CSS, GENE_LENS, bcsFigure, grain } from './bettercallsaul'
import { CHIC, CHIC_LINES, CHIC_MS, PANE_WIN, WIDE_SPAN, chicaneryBand, chicaneryPane } from './bettercallsaul-court'
import { EGG_MS, GENE_GLINTS, eggAct, saul3d } from './bettercallsaul-motion'
import { FAILS_FOR_HEARING, bashToast, dayOf, fxOf, hearingAfterFails } from './bettercallsaul-fx'
import { bcsDirector, bcsExtras, fightPlan } from './bettercallsaul-extra'
import { NIPPY, SWAP_MS, geneCheer, swapLayer } from './bettercallsaul-gene'
import { switchFlavour } from './switch-flavours'
import { THEMES } from './themes'

const NOW = Date.parse('2026-10-20T10:00:00Z')
/** The band's real clear span and holes at the band-fit widths (measured on the real band). */
const STAGES: Record<number, { x1: number; keep: [number, number, number, number][] }> = {
  450: { x1: 195, keep: [[12, 88, 76, 21]] },
  600: { x1: 274, keep: [[165, 39, 85, 22], [12, 88, 76, 21]] },
  750: { x1: 287, keep: [[258, 39, 29, 22], [12, 88, 76, 21]] },
  900: { x1: 436, keep: [[261, 39, 85, 22], [12, 88, 76, 21]] },
  1250: { x1: 785, keep: [[261, 39, 85, 22], [12, 88, 76, 21]] },
}
const COLOUR = /#(5B8FD6|9FC2F0|D7262C|FFD23F|1F4FA3|1E2F55|E6C35C|C98A3A|E0A050)/i

// --- the showdown: beats, sizes, budgets, still frames ----------------------------------------------------------------------
test('chicanery: the typed word plays the bar hearing (one act: 9 s, stand-off beats in time order, lines under 15 words)', () => {
  expect(fxOf('that was pure chicanery')).toBe('chicanery')
  expect(EGG_MS.chicanery).toBe(CHIC_MS)
  expect(CHIC_MS).toBe(9000)
  const out = chicaneryBand({ W: 1250, H: 134, at: NOW, gene: false, stage: STAGES[1250] })
  // The typed egg IS the hearing (no second, competing act): eggAct draws the same layer.
  expect(eggAct('chicanery', { W: 1250, H: 134, at: NOW, gene: false, stage: STAGES[1250] })).toBe(out.svg)
  const names = out.beats.map(([b]) => b)
  for (const b of ['step', 'flinch', 'backdown']) expect(names, b).toContain(b)
  const ts = out.beats.map(([, t]) => t)
  expect([...ts].sort((a, b) => a - b)).toEqual(ts)
  const beats = [CHIC.gavel, CHIC.trap, CHIC.battery, CHIC.press, CHIC.deny, CHIC.brk, CHIC.slump, CHIC.title]
  expect([...beats].sort((a, b) => a - b)).toEqual(beats)
  for (const line of Object.values(CHIC_LINES)) expect(line.split(/\s+/).length, line).toBeLessThan(15)
  for (const line of [CHIC_LINES.trap, CHIC_LINES.press, CHIC_LINES.deny, CHIC_LINES.brk]) expect(out.svg).toContain(line)
  // The close-up, the gavel, the stand, the bench: all on the wide band.
  expect(out.size.jimmy).toBeGreaterThanOrEqual(55)
  expect(out.size.chuck).toBeGreaterThanOrEqual(55)
})
test('chicanery: every band width and both skins under the band act budget (1 k headroom), with a still frame and clean markup', () => {
  for (const gene of [false, true]) {
    for (const [W, st] of Object.entries(STAGES)) {
      const out = chicaneryBand({ W: Number(W), H: 134, at: NOW, gene, stage: st })
      const a = audit(out.svg)
      expect(a.dupes, `${W}`).toEqual([])
      expect(a.badText, `${W}`).toEqual([])
      expect(a.dupeIds, `${W}`).toEqual([])
      expect(a.chars, `${gene ? 'gene' : 'saul'} ${W}`).toBeLessThanOrEqual(BUDGET.fightBand.band - 1000)
      expect(a.reduced).toBe(true)
      expect(/<g class="s\w+-s">[\s\S]*?<use/.test(out.svg), `${W} still`).toBe(true)
      // The act clips to the span minus the readouts' holes.
      expect(out.svg).toContain(`d="M0 34h${st.x1}v100h-${st.x1}z`)
      // Wide spans seat both brothers; narrow spans keep Chuck's side (no Jimmy pose drawn).
      expect(out.size.jimmy > 0, `${W}`).toBe(st.x1 >= WIDE_SPAN)
      // GENE plays it in black and white.
      if (gene) expect(COLOUR.test(out.svg), `${W} gene colour`).toBe(false)
    }
  }
})
test('chicanery: the LEGAL PAD act fills the pad under its title row, clear of the margin times and the date, under the act budget', () => {
  for (const gene of [false, true]) {
    for (const W of [992, 700]) {
      const out = chicaneryPane({ W, H: 236, at: NOW, gene })
      const a = audit(out.svg)
      expect(a.dupes).toEqual([])
      expect(a.dupeIds).toEqual([])
      expect(a.chars, `${W}`).toBeLessThanOrEqual(BUDGET.fightAct.card - 1000)
      const ww = W - PANE_WIN.x0 - PANE_WIN.right
      expect(out.svg).toContain(`d="M${PANE_WIN.x0} ${PANE_WIN.y0}h${ww}v`)
      expect(PANE_WIN.y0).toBeGreaterThanOrEqual(34)
      expect(out.size.jimmy).toBeGreaterThanOrEqual(90)
      if (gene) expect(COLOUR.test(out.svg)).toBe(false)
    }
  }
  // Under the theme's pane reserve.
  expect(THEMES.bettercallsaul.paneReserve).toBeGreaterThanOrEqual(chars(chicaneryPane({ W: 992, H: 236, at: NOW, gene: true }).svg))
})

// --- rarity: a fight on the director, working only, 30-45 min apart; replay; the failed-runs trigger ----------------------
test('chicanery: by itself at most once per 30-45 min, only while a job works; never at rest; a replay name', () => {
  const day = 24 * 60 * MIN
  for (const gene of [false, true]) {
    const d = bcsDirector(gene)
    const work = d.plan(NOW, NOW + day, { working: true }).filter(s => s.lane === 'fight')
    expect(work.length).toBeGreaterThanOrEqual(28)
    expect(work.length).toBeLessThanOrEqual(49)
    for (let i = 1; i < work.length; i++) expect((work[i] as { startAt: number }).startAt - (work[i - 1] as { startAt: number }).startAt).toBeGreaterThanOrEqual(30 * MIN - 1)
    expect(d.plan(NOW, NOW + day, {}).filter(s => s.lane === 'fight')).toEqual([])
    expect(d.replays()).toContain('chicanery')
    // The band only draws it while a job works.
    const f = work[0] as { startAt: number }
    const ex = bcsExtras(gene)
    const args = { W: 1250, H: 134, surface: 'band' as const, at: f.startAt + 2000, ctxPct: 10, stage: STAGES[1250] }
    expect(fightPlan(f.startAt + 2000, gene).startAt).toBe(f.startAt)
    expect(ex({ ...args, working: true })).toContain(CHIC_LINES.title)
    expect(ex({ ...args, working: false })).not.toContain(CHIC_LINES.title)
    // And on the LEGAL PAD.
    expect(ex({ W: 992, H: 236, surface: 'pane', card: 'log', at: f.startAt + 2000, ctxPct: 10, working: true })).toContain(CHIC_LINES.title)
  }
})
test('chicanery: three failed test runs in a row play it, at most once a local day', () => {
  let st = { testFails: 0, lintFailed: false }
  for (let i = 0; i < FAILS_FOR_HEARING; i++) st = bashToast('test', true, st).state
  expect(st.testFails).toBe(3)
  expect(hearingAfterFails(2, '', NOW)).toBe(false)
  expect(hearingAfterFails(3, '', NOW)).toBe(true)
  expect(hearingAfterFails(4, dayOf(NOW), NOW + 3_600_000)).toBe(false)
  expect(hearingAfterFails(3, dayOf(NOW), NOW + 24 * 3_600_000)).toBe(true)
  expect(bashToast('test', false, st).state.testFails).toBe(0)
})

// --- the real band and pane: the replay plays on both, the band keeps every readout clear, never blank --------------------
const base = (on: On) => {
  const clock = mock.clock(on, { now: NOW })
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
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: 120_000 }, rateLimits: [], cost: { usd: 12.34 } } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  return clock
}
const COLS: Record<number, number> = { 450: 66, 600: 86, 750: 106, 900: 126, 1250: 173 }
const svgsOf = async ($: Engine, component: 'Pane' | 'AbovePrompt', W = 1250): Promise<string[]> => {
  const ui = component === 'Pane'
    ? await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: { title: '', isFocused: false, bodyColumns: 100, placement: 'dock', scroll: { offset: 0, bodyRows: 60 }, view: {} } as never })
    : await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: true, maxRows: 14, bodyColumns: COLS[W] } as never })
  const all = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source))
  await ui.unmount()
  return all
}
const TITLE = 'Sandpiper document review'
const jobIn = async ($: Engine, clock: { advance: (ms: number) => Promise<void> }, skin: string) => {
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  await $.command.run({ command: 'skin', args: skin } as never)
  await clock.advance(5_000)
  await $.prompt.submit({ text: TITLE, cursor: 0 } as never)
  await $.tool.call({ tool: 'mcp__crab-progress__progress', title: TITLE, total: 5, done: 2, phase: 'delegate', tasks: [{ title: 'Lead: run it', tier: 'fable' }] } as never).catch(() => undefined)
  await clock.advance(4_000)
}
for (const skin of ['better-call-saul', 'gene']) {
  test(`chicanery (${skin}) on the real band and the LEGAL PAD: every beat clear of the readouts at every band-fit width, never blank`, { timeoutMs: 120_000 }, async ($, on) => {
    const clock = base(on)
    await jobIn($, clock, skin)
    const calm: Record<number, string> = {}
    for (const W of [450, 600, 750, 900, 1250]) calm[W] = (await svgsOf($, 'AbovePrompt', W)).join('')
    expect(String(((await $.command.run({ command: 'missioncontrol', args: 'play chicanery' } as never)) as { text?: string }).text)).toBe('▶ chicanery')
    for (const t of [500, 2000, 3000, 2500]) {
      await clock.advance(t)
      for (const W of [450, 600, 750, 900, 1250]) {
        const b = (await svgsOf($, 'AbovePrompt', W)).join('')
        const clip = /<clipPath id="[\w-]+"><path clip-rule="evenodd" d="([^"]+)"/.exec(b)
        expect(clip, `${W}: through a keep-out clip`).not.toBeNull()
        expect(overlaps(readouts((calm[W] as string).replace(/<!--dl-->[\s\S]*?<!--\/dl-->/g, '')), (clip as RegExpExecArray)[1] as string), `${W}`).toEqual([])
        // Never a blank band: the whole band is one valid image, far under the caps, with its readouts still drawn.
        expect(b.length, `${W}`).toBeLessThan(120_000 - 1000)
        expect(audit(b).dupes, `${W}`).toEqual([])
        expect(audit(b).badText, `${W}`).toEqual([])
        expect(b).toContain('Tasks')
      }
    }
    // The LEGAL PAD carries the pane half (a fresh run, so the act is drawn).
    const pad = (await svgsOf($, 'Pane')).find(s => s.includes('LEGAL PAD')) as string
    expect(pad).toContain(CHIC_LINES.title)
    expect(pad.length).toBeLessThan(60_000)
  })
}
// --- the GENE look ----------------------------------------------------------------------------------------------------------
test('gene grain: three baked tiles stepped at 8 fps, a flicker, dust and scratches; no filter at rest, cheap, still under reduced motion', () => {
  const g = grain(1250, 134)
  expect(g).not.toContain('<filter')
  expect(g).not.toContain('feTurbulence')
  for (const i of [1, 2, 3]) expect(g).toContain(`id="bcsgr${i}"`)
  expect(g).toContain('class="bcs-flk"')
  expect(g).toContain('class="bcs-dust1"')
  expect(g).toContain('class="bcs-dust2"')
  expect(chars(g)).toBeLessThan(6_000)
  // Every film loop steps (no smooth tween to raster each frame) at 8 fps or slower, at 7% or less.
  for (const cls of ['bcs-gr1', 'bcs-flk', 'bcs-dust1', 'bcs-dust2']) expect(new RegExp(`\\.${cls}[^{]*\\{animation:[^}]*steps\\(1\\)`).test(BCS_CSS), cls).toBe(true)
  expect(/@keyframes bcs-gr\{[^}]*opacity:\.07/.test(BCS_CSS)).toBe(true)
  expect(BCS_CSS).toContain('.bcs-gr1,.bcs-gr2,.bcs-gr3{animation:bcs-gr .375s steps(1) infinite}')
  const rm = BCS_CSS.split('prefers-reduced-motion')[1] as string
  for (const c of ['bcs-gr1', 'bcs-flk', 'bcs-dust1', 'bcs-gblk', 'bcs-glint']) expect(rm).toContain(c)
  // The cards carry the same film.
  for (const c of ['bcs-gr1', 'bcs-flk', 'bcs-dust2']) expect(CARD_CSS).toContain(c)
})
test('gene: takavic drains the colour out (right to left) and saul goodman floods it back (left to right, the red star-wipe)', () => {
  const drain = swapLayer({ W: 1250, H: 134, at: NOW, toGene: true, surface: 'band' })
  const flood = swapLayer({ W: 1250, H: 134, at: NOW, toGene: false, surface: 'band' })
  expect(drain).toContain('#5B8FD6')
  expect(drain).toContain('url(#bcsgr1)')
  expect(drain).toContain('inset(0 100% 0 0)')
  expect(flood).toContain('fill="#121212" opacity=".62"')
  expect(flood).toContain('inset(0 0 0 100%)')
  for (const s of [drain, flood]) {
    const a = audit(s)
    expect(a.dupes).toEqual([])
    expect(a.reduced).toBe(true)
    expect(a.chars).toBeLessThanOrEqual(BUDGET.wipe.band)
    expect(s).toContain('@@T')
  }
  expect(SWAP_MS).toBeLessThanOrEqual(2000)
})
test('gene: the switch words play the drain and the flood on the real band, then it is gone', { timeoutMs: 60_000 }, async ($, on) => {
  const clock = base(on)
  await jobIn($, clock, 'better-call-saul')
  await $.prompt.submit({ text: 'takavic', cursor: 0 } as never)
  await clock.advance(400)
  const band = (await svgsOf($, 'AbovePrompt', 1250)).join('')
  expect(band).toContain('GENE TAKAVIC')
  expect(band).toContain('#5B8FD6')
  const pad = (await svgsOf($, 'Pane')).filter(s => /LEGAL PAD|THE DOCKET/.test(s)).join('')
  expect(pad).toContain('#5B8FD6')
  await clock.advance(SWAP_MS + 1000)
  expect((await svgsOf($, 'AbovePrompt', 1250)).join('')).not.toContain('#5B8FD6')
  await $.prompt.submit({ text: 'saul goodman', cursor: 0 } as never)
  await clock.advance(400)
  const back = (await svgsOf($, 'AbovePrompt', 1250)).join('')
  expect(back).toContain('SAUL GOODMAN')
  expect(back).toContain('fill="#121212" opacity=".62"')
})
test('gene: NIPPY! is his own cheer, the mall shutter rolls down and up, one brief flash of colour, a still frame', () => {
  const c = geneCheer(1250, 134, NOW)
  expect(THEMES.gene.cheer(1250, 134, '', {} as never, NOW)).toBe(c)
  expect(THEMES.bettercallsaul.cheer(1250, 134, '', {} as never, NOW)).toContain('BETTER CALL SAUL!')
  const a = audit(c)
  expect(a.dupes).toEqual([])
  expect(a.reduced).toBe(true)
  expect(a.chars).toBeLessThan(8_000)
  expect(c).toContain('MALL BAKERY')
  // The one splash of colour is the red slats: shown at NIPPY.red for three frames (0.12 s), then drained.
  expect(c).toContain('#E0362C')
  expect(NIPPY.ms).toBeLessThanOrEqual(2_400)
  // Under reduced motion the shutter is down with NIPPY on it (the still has no red).
  const still = /<g class="s\w+-s">([\s\S]*)<\/g><\/g><!--\/dl-->/.exec(c)?.[1] ?? ''
  expect(still).toContain('MALL BAKERY')
  expect(still).not.toContain('sr)')
})
test('gene: his bust blinks behind the glasses and the glasses glint; in the head turn they catch the light and the ad shows', () => {
  const b = bcsFigure(true, { at: NOW })
  expect(b).toContain('class="bcs-gblk" opacity="0"')
  expect(b).toContain('class="bcs-glint"')
  expect(GENE_LENS).toHaveLength(2)
  expect((/<g class="bcs-gblk"[^>]*>(.*?)<\/g>/.exec(b)?.[1] ?? '').length).toBeLessThan(200)
  const turn = saul3d({ W: 1250, H: 134, at: NOW, gene: true, stage: STAGES[1250] })
  expect(turn.size.glints).toBe(GENE_GLINTS.length)
  expect(turn.svg).toContain('fill="#D7262C"')
  expect(chars(turn.svg)).toBeLessThanOrEqual(BUDGET.fightBand.band - 1000)
})
test('skin switch: Better Call Saul slams the gavel on the ad wipe; GENE drops with the shutter and spins his emblem, all grey', () => {
  const look = { bg: '#121212', accent: '#9A9A9A', ink: '#F2F2F2' }
  for (const id of ['better-call-saul', 'gene']) {
    const f = switchFlavour(id)
    expect(f, id).toBeDefined()
    const band = skinSwitch({ W: 900, H: 134, at: NOW, surface: 'band', from: look, to: look, ...(f ? { flavour: f } : {}) })
    expect(audit(band).dupes).toEqual([])
    expect(chars(band)).toBeLessThanOrEqual(BUDGET.wipe.band)
    const card = skinSwitch({ W: 992, H: 236, at: NOW, surface: 'pane', from: look, to: look, ...(f ? { flavour: f } : {}) })
    expect(chars(card)).toBeLessThanOrEqual(BUDGET.wipe.card)
    if (id === 'gene') {
      const cols = [...band.matchAll(/#([0-9A-Fa-f]{6})\b/g)].map(m => m[1] as string)
      for (const c of cols) { const [r, g, bl] = [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)) as [number, number, number]; expect(Math.max(r, g, bl) - Math.min(r, g, bl), c).toBeLessThanOrEqual(2) }
      expect(f?.dir).toBe('d')
    }
  }
})
