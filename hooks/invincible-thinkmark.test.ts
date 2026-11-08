import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { camPlanOfSlot } from './invincible-cameos'
import { CAM_SLOT_MS } from './invincible-cameos'
import type { CamPlan } from './invincible-cameos'
import { AHEAD_MS, THINK_RE, duelPlan, showdownPlan } from './invincible-eggs'
import { BLOCK_RAW_MAX, BUBBLES, DRAW_BUDGET, MOVIE_RAW_MAX, RIG_CHUNKS, SHOT_COUNT, TM_KIND, TM_MS, drawOf, drawShot, frameOf, patchWindows, shotAt, thinkMarkFx, thinkMarkHolds, thinkMarkLive, thinkMarkPane, thinkMarkRedraws } from './invincible-thinkmark'
import { TM3_ART } from './invincible-thinkmark-art3'
import { TM3_CHUNKS } from './invincible-thinkmark-rig3'
import { HARD_CUTS, PATCHES, SHOT_TIMES } from './invincible-thinkmark-plan'
import { clearThinkMarkTimers, pendingThinkMarkTimers, scheduleThinkMark } from './invincible-thinkmark-timers'
import { PATCH_AT, PLAN_SIZE, TM, TM_NAMES } from './invincible-thinkmark-sprites'
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

/** The plan's cut times, seconds: the start of each of the 24 shots, then the end. */
const CUTS = [0, 2.85, 5.25, 7.2, 8.75, 14.3, 16.1, 18.1, 19.65, 24.65, 26.25, 30.4, 31.1, 32.45, 39.75, 45.7, 46.95, 48, 52.05, 55.65, 56.45, 58.6, 62.1, 63.35, 65]
/** The plan's nine bubbles, word for word: [number, shot, who, start, end, text]. Only 4 and 9 are the show's own lines. */
const PLAN_BUBBLES: [number, number, string, number, number, string][] = [
  [1, 1, 'Omni-Man', 0.5, 2.8, 'Why force my hand?!'],
  [2, 2, 'Omni-Man', 3.1, 5.2, "You'd let them all fall for this?!"],
  [3, 3, 'Omni-Man', 5.6, 7.9, "You'd keep fighting while they all drop?"],
  [4, 4, 'Omni-Man', 8.0, 9.6, 'THINK, MARK!'],
  [5, 5, 'Omni-Man', 9.9, 13.4, "They'll all be gone. You won't."],
  [6, 6, 'Omni-Man', 14.5, 17.2, 'This planet will rot away around you.'],
  [7, 9, 'Omni-Man', 20.0, 24.4, 'Every face you love will vanish.'],
  [8, 11, 'Omni-Man', 27.0, 31.6, "Five centuries on, what's left for you?"],
  [9, 14, 'Mark', 36.8, 39.7, "I'd still have you."],
]
test('think, mark: the sprite contract is all there (but the one patch the art left out), the trigger is the same words', () => {
  const missing = TM_NAMES.filter(n => !TM[n])
  expect(missing.sort()).toEqual(['TM2_P_PROF_BLINK'])
  expect(TM_NAMES).toHaveLength(50)
  for (const n of TM_NAMES) if (TM[n] && !n.includes('_P_') && !n.includes('FX_')) expect(TM[n].rows.length).toBeGreaterThan(8)
  expect(THINK_RE.test('think, mark')).toBe(true)
  expect(TM_MS).toBe(65_000)
})
test('think, mark: the chest-up medium shots are wide (shoulders and cape edge to edge), bottom-anchored, and their patches land on the face', () => {
  for (const n of ['TM_OMNI_MED', 'TM_OMNI_CRY', 'TM_OMNI_UP']) {
    const sp = TM[n]!
    const w = sp.rows[0]!.length
    expect(w).toBeGreaterThanOrEqual(130)
    expect(w).toBeLessThanOrEqual(160)
    expect(sp.rows.length).toBeGreaterThanOrEqual(80)
    expect(sp.rows.length).toBeLessThanOrEqual(90)
    expect(PLAN_SIZE[n]).toEqual([w, sp.rows.length])
    // the shoulders reach both edges on the bottom row
    const bottom = sp.rows[sp.rows.length - 1]!
    expect(bottom[0]).not.toBe('.')
    expect(bottom[w - 1]).not.toBe('.')
  }
  // every face patch sits in the middle third, where the head is
  for (const pd of PATCHES.filter(p => ['TM_OMNI_MED', 'TM_OMNI_CRY', 'TM_OMNI_UP'].includes(p.parent))) {
    const at = PATCH_AT[pd.name]!
    expect(at.x).toBeGreaterThan(53)
    expect(at.x + pd.w).toBeLessThan(107)
  }
})
test('think, mark: 24 shots at the plan\'s cut times; the hard cuts are the plan\'s eleven', () => {
  expect(SHOT_COUNT).toBe(24)
  expect(SHOT_TIMES).toHaveLength(24)
  expect([...SHOT_TIMES.map(s => s[0]), SHOT_TIMES[23]![1]]).toEqual(CUTS)
  for (let i = 1; i < 24; i++) expect(SHOT_TIMES[i]![0]).toBe(SHOT_TIMES[i - 1]![1])
  expect(HARD_CUTS).toEqual([5.25, 19.65, 24.65, 26.25, 32.45, 39.75, 46.95, 52.05, 55.65, 56.45, 63.35])
  for (let i = 0; i < 24; i++) expect(shotAt(CUTS[i]! + 0.01)).toBe(i)
})
test('think, mark: nine bubbles at the plan\'s times with the plan\'s exact text; the show\'s own words only in 4 and 9', () => {
  expect(BUBBLES).toHaveLength(9)
  for (const [i, b] of PLAN_BUBBLES.entries()) {
    const d = BUBBLES[i]!
    expect([d.n, d.shot, d.who, d.start, d.end, d.text]).toEqual([...b])
    expect(d.text.split(/\s+/).length).toBeLessThan(10)
    // it is in the draws of its shots, shows from its start (the keyframe), and is in no draw far from it
    for (const [wd, hd] of [[992, 384], [360, 300]] as const) {
      const dr = drawOf(wd, hd, d.shot - 1)
      const svg = thinkMarkPane(wd, hd, 'cred', 0, d.start + 0.01)
      expect(svg).toContain(`>${d.text}</text>`)
      const m = new RegExp(`@keyframes tmcb${d.n}\\{[^@]*?([\\d.]+)%\\{opacity:1;transform:scale\\(\\.85\\)\\}`).exec(dr.css) ?? new RegExp(`@keyframes tmcb${d.n}\\{[^@]*?([\\d.]+)%\\{opacity:1;transform:scale\\(\\.85\\)\\}`).exec(svg)
      expect(Math.abs((Number(m?.[1]) / 100) * 65 - d.start)).toBeLessThan(0.01)
    }
    const far = thinkMarkPane(992, 384, 'cred', 0, (d.start + 30) % 64)
    expect(far).not.toContain(`>${d.text}</text>`)
  }
  expect(BUBBLES.filter(b => ['THINK, MARK!', "I'd still have you."].includes(b.text)).map(b => b.n)).toEqual([4, 9])
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
  expect(cred).toContain('Why force my hand?!')
  expect(cred).not.toContain("I'd still have you.")
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
        expect(cutscene).toBeLessThan(MOVIE_RAW_MAX)
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
    for (let k = 0; k < SHOT_COUNT; k++) {
      const d = drawOf(W, H, k)
      expect(d.which.length).toBeLessThanOrEqual(2)
      expect(d.which[0]).toBe(drawShot(k))
      expect(d.defs.length).toBeLessThanOrEqual(DRAW_BUDGET)
    }
  }
  // each draw carries the current shot plus the next while they fit
  expect(drawOf(992, 384, 0).which).toEqual([0, 1])
  expect(drawOf(992, 384, 23).which).toEqual([23])
  // the rigged window is three draws, taken at 7.2, 14.3 and 19.65 s (shots 4, 6 and 9): every shot inside it maps to its chunk's first shot
  expect(RIG_CHUNKS.map(c => SHOT_TIMES[c[0]]![0])).toEqual([7.2, 14.3, 19.65])
  expect([3, 4, 5, 6, 7, 8].map(drawShot)).toEqual([3, 3, 5, 5, 5, 8])
  expect(drawOf(992, 384, 4)).toBe(drawOf(992, 384, 3))
  expect(drawOf(992, 384, 7).which[0]).toBe(5)
  // the last shot of a draw holds its final frame to the end of the film (a late redraw changes only when the cut happens)
  expect(drawOf(992, 384, 23).css).toContain('100%')
})
test('think, mark: the size sweep: every 0.5 s of all 24 shots at three sizes, each Svg under 131072, the three cards together under the pane budget', () => {
  let worst = 0
  let worstCards = 0
  for (const [W, H] of [[992, 384], [496, 434], [360, 300], [600, 236]] as const) {
    for (let s = 0; s < 65; s += 0.5) {
      const cards = (['cred', 'task', 'log'] as const).map(c => thinkMarkPane(W, H, c, 0, s))
      // the picture's own card carries about 18 kB of its own on top of the cutscene block
      for (const c of cards) { expect(c.length).toBeLessThan(BLOCK_RAW_MAX); worst = Math.max(worst, c.length) }
      const sum = cards.reduce((n, c) => n + c.length, 0)
      worstCards = Math.max(worstCards, sum)
      // the three cutscene blocks together, as drawn: the pane reserves MOVIE_RESERVE for them (the app counts what is sent, compacted)
      expect(sum).toBeLessThan(MOVIE_RAW_MAX)
    }
  }
  expect(worst).toBeGreaterThan(20_000)
  expect(worstCards).toBeGreaterThan(20_000)
})
test('think, mark: every patch sits inside its parent sprite, and a patch that was never drawn is skipped, not drawn', () => {
  const names = new Set(PATCHES.map(p => p.name))
  expect(names.size).toBe(21)
  for (const pd of PATCHES) {
    const at = PATCH_AT[pd.name]!
    const parent = TM[at.parent]
    const patch = TM[pd.name]
    expect(parent).toBeDefined()
    if (!patch) continue
    expect(at.x).toBeGreaterThanOrEqual(0)
    expect(at.y).toBeGreaterThanOrEqual(0)
    expect(at.x + patch.rows[0]!.length).toBeLessThanOrEqual(parent!.rows[0]!.length)
    expect(at.y + patch.rows.length).toBeLessThanOrEqual(parent!.rows.length)
  }
  // the windows follow the plan's cycle: base 0.15 s, then the patch 0.12 s, ending on the base
  const w = patchWindows(3, 'TM2_P_KNEEL_GRAB_MOUTH')
  expect(w[0]).toEqual([5.55, 5.67])
  expect(Math.abs(w[1]![0] - 5.82)).toBeLessThan(1e-6)
  expect(w[w.length - 1]![1]).toBeLessThanOrEqual(7.1)
  expect(patchWindows(14, 'TM2_P_MARK_BLINK')).toEqual([[33.5, 33.75], [38.9, 39.2]])
  expect(patchWindows(2, 'TM2_P_CU_MOUTH_CLOSED').some(([a, b]) => a === 4.6 && b === 5.25)).toBe(true)
  // a lone patch ends at the next event of the same patch, not at the cut
  expect(patchWindows(9, 'TM2_P_ECU_MOUTH_CLOSED')).toEqual([[22.6, 24.0], [24.0, 24.65]])
})
test('think, mark: the pane is redrawn after every cut: the schedule, the cancel on a new trigger and on a skin switch', async ($, on) => {
  const t0 = 1_000_000
  const times = thinkMarkRedraws(t0)
  // a redraw after every cut, except the three inside the rigged window (8.75, 16.1 and 18.1 s): its three draws carry them
  const drawn = [...Array(23).keys()].map(i => i + 1).filter(i => drawShot(i) === i)
  expect(drawn).not.toContain(4)
  expect(drawn).not.toContain(6)
  expect(drawn).not.toContain(7)
  expect(times).toHaveLength(drawn.length + 1)
  expect(times).toHaveLength(21)
  drawn.forEach((shot, j) => {
    expect(shotAt((times[j] as number - t0) / 1000)).toBe(shot)
    expect(times[j]).toBe(Math.round(t0 + CUTS[shot]! * 1000 + 80))
  })
  expect(times[drawn.length]).toBe(t0 + 65_000 + 80)
  // inside the window: exactly the plan's three (7.2, 14.3, 19.65), each a hair late
  expect(times.filter(t => t > t0 + 7_000 && t < t0 + 25_000)).toEqual([7.2, 14.3, 19.65, 24.65].map(c => Math.round(t0 + c * 1000 + 80)))
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
  expect(pendingThinkMarkTimers()).toBe(21)
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
  expect(writes).not.toContain(cuts[12])
  expect(writes).not.toContain(cuts[cuts.length - 1])
})

// The crew grows past what the cards can hold: the pane falls back to its short view, which has no cards, and the movie used to be
// dropped there (Chin's cutscene stopped at ~25 s when the crew grew). It must be drawn at every cut, with a plan and 1 to 28 agents.
for (const N of [1, 12, 28]) {
  test(`think, mark: with a plan and ${N} agents the movie is drawn at every cut and stays under the app's caps`, { timeoutMs: 180_000 }, async ($, on) => {
    const clock = base(on, 880_000, quietAt())
    await start($, 'invincible')
    await jobIn($)
    for (let i = 0; i < N; i++) await $.agent.spawn({ tool_use_id: `t${i}`, prompt: 'p', description: `Engineer ${i}: a long task number ${i}`, subagentType: 'general-purpose', provider: 'engine', parentModel: 'x', background: false, fork: false } as never)
    await clock.advance(12_000)
    await type($)
    let at = 0
    // every cut, the rigged window's three draws (7.2, 14.3 and 19.65 s, a hair after) and moments in the middle of its bursts (the swing, the shout, the rise, the face peaks)
    const mid = [7.6, 8.1, 8.3, 14.45, 19.75, 21, 23.3]
    for (const cut of [...CUTS.slice(0, 24).map(c => c + 0.2), ...[7.2, 14.3, 19.65].map(c => c + 0.09), ...mid, 30, 45, 64].sort((a, b) => a - b)) {
      await clock.advance(Math.round((cut - at) * 1000))
      at = cut
      const p = await svgs($, 'Pane')
      expect(playing(p).length, `movie missing at ${cut} s`).toBeGreaterThanOrEqual(1)
      for (const x of p) expect(x.length).toBeLessThan(131072)
      expect(p.reduce((n, x) => n + x.length, 0)).toBeLessThan(262_144)
    }
  })
}

test('think, mark v3: the rigged window is three generated chunks (7.2, 14.3, 19.65 s) whose parts, ids and keyframes all line up', () => {
  expect(TM3_CHUNKS.map(c => [c.key, c.t0, c.t1])).toEqual([['a', 7.2, 14.3], ['b', 14.3, 19.65], ['c', 19.65, 24.65]])
  for (const c of TM3_CHUNKS) {
    // every part the markup uses is a sprite of the art file, and is cut into the draw's defs under the id the markup references
    expect(c.parts.length).toBeGreaterThan(15)
    for (const n of c.parts) expect(TM3_ART[n], n).toBeDefined()
    const refs = new Set([...c.body.matchAll(/href="#\{P\}s_([A-Za-z0-9_]+)"/g)].map(m => m[1] as string))
    expect([...refs].sort()).toEqual([...c.parts].sort())
    // every animation name has keyframes and every keyframes block is used; the percent stops rise
    const used = new Set([...c.body.matchAll(/animation-name:(\{P\}[a-z0-9]+)/g)].map(m => m[1] as string))
    const defined = [...c.css.matchAll(/@keyframes (\{P\}[a-z0-9]+)\{/g)].map(m => m[1] as string)
    expect(new Set(defined).size).toBe(defined.length)
    expect([...used].sort()).toEqual([...defined].sort())
    for (const blk of c.css.split('@keyframes ').slice(1)) {
      const pcs = [...blk.matchAll(/[{}](\d+(?:\.\d+)?)%\{/g)].map(m => Number(m[1]))
      expect(pcs[0]).toBe(0)
      expect(pcs[pcs.length - 1]).toBe(100)
      for (let i = 1; i < pcs.length; i++) expect(pcs[i]!).toBeGreaterThan(pcs[i - 1]!)
    }
    // the art keeps to the plan's rules: a limited palette per part, no network, no external references
    expect(c.body + c.css + c.defs).not.toMatch(/https?:|data:|@import/)
  }
  // the drawings swap on a strip track (steps), the motion is linear keyframes the browser interpolates every frame
  expect(TM3_CHUNKS[0]!.css).toContain('translate(')
  expect(TM3_CHUNKS[0]!.css).toContain('rotate(')
  expect(TM3_CHUNKS[0]!.body).toContain('steps(1,end)')
})
test('think, mark v3: the bubbles in the window are the plan\'s, unchanged: same words, same moments, the pane keeps v2\'s bubble drawing', () => {
  const inWin = BUBBLES.filter(b => b.start < 24.65 && b.end > 7.2)
  expect(inWin.map(b => [b.n, b.start, b.end, b.text])).toEqual([
    [3, 5.6, 7.9, "You'd keep fighting while they all drop?"],
    [4, 8.0, 9.6, 'THINK, MARK!'],
    [5, 9.9, 13.4, "They'll all be gone. You won't."],
    [6, 14.5, 17.2, 'This planet will rot away around you.'],
    [7, 20.0, 24.4, 'Every face you love will vanish.'],
  ])
  const pc = (t: number): string => `${+((t / 65) * 100).toFixed(3)}%`
  for (const [at, ns] of [[7.3, [3, 4, 5]], [14.4, [6]], [19.7, [7]]] as const) {
    const svg = thinkMarkPane(992, 384, 'cred', 0, at)
    for (const n of ns) {
      const b = inWin.find(x => x.n === n)!
      expect(svg, `bubble ${n} text`).toContain(b.text.replace(/&/g, '&amp;'))
      expect(svg, `bubble ${n} starts at ${b.start}`).toContain(`${pc(b.start)}{opacity:1;transform:scale(.85)}`)
    }
  }
})
