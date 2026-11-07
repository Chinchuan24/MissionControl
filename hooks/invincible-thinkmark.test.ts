import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { camPlanOfSlot } from './invincible-cameos'
import { CAM_SLOT_MS } from './invincible-cameos'
import type { CamPlan } from './invincible-cameos'
import { AHEAD_MS, THINK_RE, duelPlan, showdownPlan } from './invincible-eggs'
import { BUBBLES, DRAW_BUDGET, TM_KIND, TM_MS, drawOf, frameOf, shotAt, thinkMarkFx, thinkMarkHolds, thinkMarkLive, thinkMarkPane, thinkMarkRedraws } from './invincible-thinkmark'
import { clearThinkMarkTimers, pendingThinkMarkTimers, scheduleThinkMark } from './invincible-thinkmark-timers'
import { TM, TM_NAMES } from './invincible-thinkmark-sprites'
import { mock } from 'claude-code/testing'

const pane = { title: '', isFocused: false, bodyColumns: 100, placement: 'dock', scroll: { offset: 0, bodyRows: 60 }, view: {} } as const
const NOW = Date.parse('2026-10-20T10:00:00Z')
const HOUR = 3_600_000
const toasts: string[] = []
const COLS: Record<number, number> = { 750: 106, 900: 126, 1250: 173 }

const base = (on: On, context = 100_000, now = NOW, cost = 0) => {
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
    toasts.push(String((e as { text?: string; message?: string }).text ?? (e as { message?: string }).message ?? JSON.stringify(e)))
    return { value: undefined } as never
  })
  on('audio.play', async () => ({ value: undefined }) as never)
  on('tool.call', async () => ({ result: 'ok' }) as never)
  on('turn.complete', async () => ({ text: '' }) as never)
  on('prompt.submit', async (_$, e) => ({ text: (e as { text: string }).text }) as never)
  let n = 0
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: `a${++n}` }) as never)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens: context }, rateLimits: [], cost: { usd: cost } } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  return clock
}
const start = async ($: Engine, skin: string) => {
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
const bandAt = async ($: Engine, W: number, working = true): Promise<string> => (await svgs($, 'AbovePrompt', W, working)).join('')
const TITLE = 'GDA HQ incident report'
const jobIn = async ($: Engine, title = TITLE) => {
  await $.prompt.submit({ text: title, cursor: 0 } as never)
  await $.tool.call({ tool: 'mcp__crab-progress__progress', title, total: 5, done: 2, phase: 'delegate', tasks: [{ title: 'Lead: run it', tier: 'fable' }, { title: 'Researcher: map the API', tier: 'medium' }, { title: 'Engineer: rewrite the parser', tier: 'careful' }, { title: 'Tester: break it', tier: 'heavy' }, { title: 'Writer: the report', tier: 'light' }] } as never).catch(() => undefined)
}
const four = async ($: Engine) => {
  for (const [i, d] of ['Lead: run it', 'Researcher: map the API', 'Engineer: rewrite the parser', 'Tester: break it'].entries()) await $.agent.spawn({ tool_use_id: `t${i}`, prompt: 'p', description: d, subagentType: 'general-purpose', provider: 'engine', parentModel: 'x', background: false, fork: false } as never)
}
const skinList = async ($: Engine) => String(((await $.command.run({ command: 'skin', args: 'list' } as never)) as { text?: string }).text)
const OTHER = ['ATTORNEY AT LAW', 'LEGAL PAD', 'THE DOCKET', 'PERIODIC TABLE', 'NEURAL SYNC', 'PERSONNEL FILE', 'BREACH PROTOCOL', 'STREET CRED', 'COLD READ', 'CLASSROOM', 'HONOR ROLL', 'NETRUNNER', 'BRAINDANCE', 'NETRUN TRACE', 'CLOSED GIGS', 'CLOSED CASES']
/** A moment with no fight (now or within the look-ahead), no daily showdown near and nothing else scheduled. */
const quietAt = (era: 1 | 2 = 1, from = NOW): number => {
  for (let t = from; ; t += 61_000) {
    const d = duelPlan(t, era)
    const near = (p: { startAt: number; endAt: number }) => t + 2 * AHEAD_MS > p.startAt && t < p.endAt + 60_000
    if (!near(d) && !near(duelPlan(t + 120_000, era)) && !near(showdownPlan(t, era)) && !near(showdownPlan(t + 120_000, era))) return t
  }
}
const fightStart = (era: 1 | 2 = 1, from = NOW): number => {
  for (let t = from; ; t += 60_000) {
    const p = duelPlan(t, era)
    if (p.on && !(showdownPlan(p.startAt, era).startAt < p.endAt + 5000 && showdownPlan(p.startAt, era).endAt > p.startAt - 5000)) return p.startAt
  }
}

const K0 = Math.floor(NOW / CAM_SLOT_MS)
const camFind = (pred: (p: CamPlan) => boolean, from = K0): CamPlan => {
  for (let k = from; ; k++) {
    const p = camPlanOfSlot(k)
    if (p.on && pred(p)) return p
  }
}
const type = ($: Engine) => $.prompt.submit({ text: 'think, mark', cursor: 0 } as never)
const dims = (l: string[]) => l.map(s => `${/width="(\d+)"/.exec(s)?.[1]}x${/height="(\d+)"/.exec(s)?.[1]}`).join(',')
const sig = async ($: Engine) => {
  const b = await svgs($, 'AbovePrompt', 900)
  const p = await svgs($, 'Pane')
  return `${b.length}:${/height="(\d+)"/.exec(b[0] ?? '')?.[1]}|${p.length}|${dims(p)}`
}
const playing = (l: string[]) => l.filter(s => s.includes('class="tm-anim"'))

test('think, mark: the sprite contract is all there, the trigger is the same words', () => {
  expect(TM_NAMES).toHaveLength(17)
  for (const n of TM_NAMES) expect(TM[n].rows.length).toBeGreaterThan(8)
  expect(THINK_RE.test('think, mark')).toBe(true)
  expect(TM_MS).toBe(65_000)
})
test('think, mark: at most six short bubbles, none over eleven words', () => {
  expect(BUBBLES.length).toBeLessThanOrEqual(6)
  for (const b of BUBBLES) expect(b[2].split(/\s+/).length).toBeLessThan(12)
})
test('think, mark: the windows: live from a second before the start to 65 s after; holds overlapping spans', () => {
  const fx = thinkMarkFx(10_000)
  expect(fx.kind).toBe(TM_KIND)
  expect(thinkMarkLive(fx, 8_999)).toBe(false)
  expect(thinkMarkLive(fx, 9_000)).toBe(true)
  expect(thinkMarkLive(fx, 74_999)).toBe(true)
  expect(thinkMarkLive(fx, 75_000)).toBe(false)
  expect(thinkMarkLive({ kind: 'think', at: 10_000 }, 10_500)).toBe(false)
  expect(thinkMarkHolds(fx, 70_000, 90_000)).toBe(true)
  expect(thinkMarkHolds(fx, 76_000, 90_000)).toBe(false)
  expect(thinkMarkHolds(undefined, 0, 1e12)).toBe(false)
})
test('think, mark: typing starts the cutscene: the pane takes over, the band shows a NOW PLAYING strip; it ends on its own at 65 s', async ($, on) => {
  const clock = base(on, 100_000, quietAt())
  await start($, 'invincible')
  await jobIn($)
  expect(playing(await svgs($, 'Pane'))).toHaveLength(0)
  expect(await bandAt($, 1250)).not.toContain('NOW PLAYING')
  await type($)
  const band = await bandAt($, 1250)
  expect(band).toContain('NOW PLAYING')
  expect(band).toContain('THINK, MARK')
  expect(band).not.toContain('THINK, MARK.')
  expect(band).toContain('0:42')
  const pn = await svgs($, 'Pane')
  expect(playing(pn)).toHaveLength(3)
  // it lives in the pane's three cards and the band, nowhere else
  expect(pn.filter(s => s.includes('tm-anim'))).toHaveLength(3)
  await clock.advance(64_000)
  expect(await bandAt($, 1250)).toContain('NOW PLAYING')
  await clock.advance(2_500)
  expect(await bandAt($, 1250)).not.toContain('NOW PLAYING')
  expect(playing(await svgs($, 'Pane'))).toHaveLength(0)
})
test('think, mark: a redraw in the middle resumes in place: one pinned delay from the start, negative once under way', async ($, on) => {
  const clock = base(on, 100_000, quietAt())
  await start($, 'invincible')
  await jobIn($)
  await type($)
  const delays = (l: string[]) => [...new Set(l.flatMap(s => [...s.matchAll(/--q:(-?[\d.]+)s/g)].map(m => Number(m[1]))))]
  const d0 = delays([await bandAt($, 1250), ...(await svgs($, 'Pane'))])
  expect(d0).toHaveLength(1)
  expect(Math.abs(d0[0] as number)).toBeLessThan(1.5)
  await clock.advance(30_000)
  const d1 = delays([await bandAt($, 1250), ...(await svgs($, 'Pane'))])
  expect(d1).toHaveLength(1)
  expect(Math.round((d1[0] as number) - (d0[0] as number))).toBe(-30)
  await clock.advance(30_000)
  const d2 = delays([await bandAt($, 1250), ...(await svgs($, 'Pane'))])
  expect(Math.round((d2[0] as number) - (d0[0] as number))).toBe(-60)
})
test('think, mark: the pane carries the whole film: one duration, keyframes in percent, nothing but the cutscene needs a redraw', async ($, on) => {
  base(on, 100_000, quietAt())
  await start($, 'invincible')
  await jobIn($)
  await type($)
  const cred = (await svgs($, 'Pane')).find(s => s.includes('tmc')) as string
  expect(cred).toContain('65s')
  expect(cred).toContain('<!--dl-->')
  expect(cred).not.toContain('<image')
  expect(cred).not.toContain('@@T')
  expect(cred.match(/@keyframes/g)?.length).toBeGreaterThan(15)
  // a draw carries the bubbles of its own shots only
  expect(cred).toContain('THINK! USE YOUR HEAD FOR ONCE!')
  expect(cred).not.toContain("I'D HAVE MY DAD")
})
test('think, mark: reduced motion: a still title card with one line and no animation; the band a still strip', async ($, on) => {
  base(on, 100_000, quietAt())
  await start($, 'invincible')
  await jobIn($)
  await type($)
  const all = [await bandAt($, 1250), ...(await svgs($, 'Pane'))]
  for (const s of all.filter(x => x.includes('tm-anim'))) {
    expect(s).toMatch(/prefers-reduced-motion: reduce\)\{\.tm-anim\{display:none\}\.tm-still\{display:block/)
    expect(s).toContain('class="tm-still"')
  }
  const cred = (await svgs($, 'Pane')).find(s => s.includes('tmc')) as string
  const still = /<g class="tm-still">([\s\S]*?)<\/g><\/g><!--\/dl-->/.exec(cred)?.[1] ?? ''
  expect(still).toContain('THINK, MARK.')
  expect(still).toContain("I'D STILL HAVE YOU.")
  expect(still).not.toContain('animation')
})
test('think, mark: every other act yields for its full length: the fight, the cameos, the showdown', async ($, on) => {
  // the fight
  const st = fightStart(1, quietAt(1) + 3_600_000)
  const clock = base(on, 100_000, st - 6_000)
  await start($, 'invincible')
  await jobIn($)
  await clock.advance(3_000)
  expect((await bandAt($, 1250)) + (await svgs($, 'Pane')).join('')).toContain('class="dl-anim"')
  await type($)
  for (let i = 0; i < 4; i++) {
    const all = (await bandAt($, 1250)) + (await svgs($, 'Pane')).join('')
    expect(all).not.toContain('class="dl-anim"')
    expect(all).toContain('tm-anim')
    await clock.advance(16_000)
  }
})
test('think, mark: a live cameo and the daily showdown yield too', async ($, on) => {
  const q = camFind(z => z.who === 'eve' && z.mode === 'fly-band')
  base(on, 100_000, q.startAt + 1_500)
  await start($, 'invincible')
  await jobIn($)
  expect(await bandAt($, 1250)).toContain('data-cam="eve"')
  await type($)
  expect(await bandAt($, 1250)).not.toContain('data-cam=')
  expect((await svgs($, 'Pane')).join('')).not.toContain('data-cam=')
})
test('think, mark: the daily showdown due inside the 65 s does not play', async ($, on) => {
  const sd = showdownPlan(NOW, 1)
  base(on, 100_000, sd.startAt - 20_000)
  await start($, 'invincible')
  await jobIn($)
  await type($)
  const wall = (await svgs($, 'Pane')).join('')
  expect(wall).not.toContain('LAST ONE STANDING')
  expect(wall).toContain('tm-anim')
})
test('think, mark: typing it in another skin does nothing; nothing in the skin list hints at it', async ($, on) => {
  base(on, 100_000, quietAt())
  await start($, 'mentalist')
  await type($)
  expect(await bandAt($, 1250)).not.toContain('NOW PLAYING')
  expect((await svgs($, 'Pane')).join('')).not.toContain('tm-anim')
  await $.command.run({ command: 'skin', args: 'invincible' } as never)
  expect(await skinList($)).not.toMatch(/think|mark,/i)
})
for (const era of [1, 2] as const) {
  test(`think, mark: era ${era}: sizes with 4 agents: the band under 70 kB, each pane Svg under 131072, the pane under 260 kB; the layout never flips`, { timeoutMs: 180_000 }, async ($, on) => {
    const clock = base(on, 880_000, quietAt(era))
    await start($, 'invincible')
    if (era === 2) await $.prompt.submit({ text: 'new suit', cursor: 0 } as never)
    await jobIn($)
    await four($)
    await clock.advance(12_000)
    const before = await sig($)
    await type($)
    const seen = new Set([before])
    let sawPlay = 0
    for (let i = 0; i < 16; i++) {
      for (const W of [750, 900, 1250]) {
        const b = await bandAt($, W)
        expect(b.length).toBeLessThan(70_000)
        if (i < 12) expect(b).toContain('NOW PLAYING')
      }
      const p = await svgs($, 'Pane')
      for (const s of p) expect(s.length).toBeLessThan(131072)
      expect(p.reduce((n, s) => n + s.length, 0)).toBeLessThan(260_000)
      if (playing(p).length === 3) {
        sawPlay++
        const cutscene = p.reduce((n, s) => n + (/<!--dl-->[\s\S]*<!--\/dl-->/.exec(s)?.[0].length ?? 0), 0)
        expect(cutscene).toBeLessThan(95_000)
        expect(cutscene).toBeGreaterThan(20_000)
      }
      seen.add(await sig($))
      await clock.advance(5_000)
    }
    expect(sawPlay).toBeGreaterThanOrEqual(12)
    // the pane looks the same before and after: one layout signature across the act and once it is over
    expect([...seen]).toHaveLength(1)
    expect(playing(await svgs($, 'Pane'))).toHaveLength(0)
  })
}
test('think, mark: the picture is as big as the card allows, 16:9, at full resolution and full palette', () => {
  for (const [W, H] of [[360, 300], [496, 434], [992, 384], [600, 434], [992, 236]] as const) {
    const f = frameOf(W, H)
    expect(f.PW).toBeLessThanOrEqual(W)
    expect(f.PH).toBeLessThanOrEqual(H)
    expect(Math.abs(f.PW / f.PH - 16 / 9)).toBeLessThan(0.02)
    expect(f.PH).toBeGreaterThanOrEqual(Math.min(H - 8, (W * 9) / 16) - 2)
  }
  // no downsampling: a whole 160-wide backdrop is in the draw as its own rectangles, and the full palette is kept
  const d = drawOf(992, 384, 1)
  expect(d.defs).toContain('fill="#')
  expect(new Set(d.defs.match(/fill="#[0-9A-Fa-f]{6}"/g)).size).toBeGreaterThan(14)
})
test('think, mark: every draw has at most two shots, fits its byte budget and each Svg stays under 131072', () => {
  for (const [W, H] of [[992, 384], [496, 434], [360, 300]] as const) {
    for (let k = 0; k < 12; k++) {
      const d = drawOf(W, H, k)
      expect(d.which.length).toBeLessThanOrEqual(2)
      expect(d.which[0]).toBe(k)
      expect(d.defs.length).toBeLessThanOrEqual(DRAW_BUDGET)
      for (const card of ['cred', 'task', 'log'] as const) expect(thinkMarkPane(W, H, card, 0, 6 * k).length).toBeLessThan(131072)
      expect(thinkMarkPane(W, 384, 'cred', 0, [0, 6, 20, 25, 30, 36, 41, 48, 53, 56, 60, 64][k] as number).length).toBeLessThan(110_000)
    }
  }
  // a pair that does not fit is not drawn: shot 5 (the Kid talking) is alone, shot 0 carries the wide shot after it
  expect(drawOf(992, 384, 4).which).toEqual([4])
  expect(drawOf(992, 384, 0).which).toEqual([0])
  expect(drawOf(992, 384, 2).which).toEqual([2, 3])
  // the last shot of a draw holds its final frame to the end of the film (a late redraw changes only when the cut happens)
  expect(drawOf(992, 384, 4).css).toContain('100%')
})
test('think, mark: the pane is redrawn after every cut: the schedule, the cancel on a new trigger and on a skin switch', async ($, on) => {
  const t0 = 1_000_000
  const times = thinkMarkRedraws(t0)
  expect(times).toHaveLength(12)
  for (let i = 0; i < 11; i++) expect(shotAt((times[i] as number - t0) / 1000)).toBe(i + 1)
  expect(times[0]).toBe(t0 + 5_250 + 80)
  expect(times[10]).toBe(t0 + 63_000 + 80)
  expect(times[11]).toBe(t0 + 65_000 + 80)
  // the timers: one per cut ahead, cancelled by clear, replaced by a new trigger
  const log: string[] = []
  let n = 0
  const after = (ms: number) => { const id = ++n; log.push(`after ${ms}`); return { cancel: () => { log.push(`cancel ${id}`) } } }
  const due = scheduleThinkMark(after, t0, t0 + 30_000, () => undefined)
  expect(due).toEqual(times.filter(t => t > t0 + 30_000))
  expect(pendingThinkMarkTimers()).toBe(due.length)
  clearThinkMarkTimers()
  expect(pendingThinkMarkTimers()).toBe(0)
  expect(log.filter(l => l.startsWith('cancel'))).toHaveLength(due.length)
  scheduleThinkMark(after, t0, t0, () => undefined)
  scheduleThinkMark(after, t0, t0, () => undefined)
  expect(pendingThinkMarkTimers()).toBe(12)
  clearThinkMarkTimers()
  clearThinkMarkTimers()
  expect(pendingThinkMarkTimers()).toBe(0)
  // in the engine: typing makes the pane redraw after every cut (a write to the pane's tick, counted through state.set); a
  // skin switch away stops them; `new suit` in the middle keeps them
  const writes: number[] = []
  const clk = base(on, 100_000, quietAt())
  on('state.set', async (_$, e, next) => {
    const w = e as { key?: string; value?: unknown }
    if (w.key === 'paneTick' && typeof w.value === 'number') writes.push(w.value)
    return next(e as never)
  })
  await start($, 'invincible')
  await jobIn($)
  const t1 = Number(await (clk as unknown as { now: () => unknown }).now())
  await type($)
  const cuts = thinkMarkRedraws(t1)
  await clk.advance(5_500)
  expect(writes).toContain(cuts[0])
  await clk.advance(3_000)
  await $.prompt.submit({ text: 'new suit', cursor: 0 } as never)
  await clk.advance(20_000)
  for (const c of cuts.slice(1, 4)) expect(writes).toContain(c)
  await $.command.run({ command: 'skin', args: 'mentalist' } as never)
  await clk.advance(45_000)
  expect(writes).not.toContain(cuts[4])
  expect(writes).not.toContain(cuts[11])
})
