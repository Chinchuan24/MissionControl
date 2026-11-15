// Breaking Bad and Heisenberg's wave 3 motion: SAY MY NAME (the owner's must-have), the Desert Stand-off, the daily pizza, the
// cheers, Walt alive, the crystal, the hat logo, the HEISENBERG flip, the way back, the switch flavours. Rarity and day seeding,
// the trigger words against everyday prompts, still frames, budgets, and the keep-out on the REAL band at the band-fit widths.
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { SAY_MY_NAME_RE, WALTER_WHITE_RE } from './breakingbad'
import { jesseChance } from './breakingbad-jesse'
import {
  BB_MS, BB_SWITCH, HEIS_SWITCH, bbBusy, bbDirector, bbDue, crystal, freeSpan, half, hatLogo, heisDirector, heisFlip, knocksAct, liveBust,
  nameAct, nameEcho, nameVeil, pizzaAct, scienceAct, setBbPlay, standoffAct, titleLayout,
} from './breakingbad-motion'
import { sansW, walt } from './breakingbad-cards'
import { BBAD_CRYSTAL_0 } from './breakingbad-sprites'
import { DAY, MIN, perWindow } from './stage/director'
import { audit, BUDGET } from './stage/budget'
import type { Rect } from './stage/keep'
import { overlaps, readouts } from './stage/keep'
import { playsOf, runPlay } from './stage/replay'
import { skinSwitch } from './stage/wipe'

const NOW = Date.parse('2026-10-20T10:00:00Z')
const BAND_CAP = BUDGET.fightBand.band - 1000
// The theme's pane reserve is 5.7 k (a busy Breaking Bad pane sits near the drawing's cap); 1 k of headroom under it.
const PANE_CAP = 4_700

// ---------------------------------------------------------------- the schedule
test('director: the stand-off plays at most once per 30-45 min, only while working, on both skins; never at rest', () => {
  for (const dir of [bbDirector(0), heisDirector(0)]) {
    const day = dir.plan(NOW, NOW + DAY, { working: true }).filter(s => s.id === 'standoff')
    expect(day.length).toBeGreaterThanOrEqual(24)
    expect(day.length).toBeLessThanOrEqual(48)
    for (let i = 1; i < day.length; i++) expect((day[i] as { startAt: number }).startAt - (day[i - 1] as { startAt: number }).startAt).toBeGreaterThanOrEqual(30 * MIN)
    expect(dir.plan(NOW, NOW + DAY, { working: false }).filter(s => s.id === 'standoff')).toEqual([])
  }
  expect(bbDirector(0).replays().sort()).toEqual(['desert-standoff', 'pizza-on-the-roof'])
  expect(heisDirector(0).replays()).toEqual(['desert-standoff'])
})

test('director: the pizza is once a LOCAL day, between 17 and 22 h, seeded by the day (same day, same time); Breaking Bad only', () => {
  for (const off of [0, -8 * 3_600_000, 5.5 * 3_600_000, 9 * 3_600_000]) {
    const dir = bbDirector(off)
    const base = Math.floor(NOW / DAY) * DAY - off
    const times: number[] = []
    for (let d = 0; d < 14; d++) {
      const p = dir.plan(base + d * DAY, base + (d + 1) * DAY, {}).filter(s => s.id === 'pizza')
      expect(p.length, `day ${d} at ${off}`).toBeLessThanOrEqual(1)
      for (const s of p) {
        const h = ((((s.startAt + off) % DAY) + DAY) % DAY) / 3_600_000
        expect(h).toBeGreaterThanOrEqual(17)
        expect(h).toBeLessThan(22)
        times.push(s.startAt)
      }
    }
    expect(times.length).toBeGreaterThanOrEqual(12)
    expect(new Set(times.map(t => Math.floor((t + off) / DAY))).size).toBe(times.length)
    // Not the same minute every day: the day seeds it.
    expect(new Set(times.map(t => (t + off) % DAY)).size).toBeGreaterThan(times.length / 2)
    expect(bbDirector(off).plan(base, base + DAY, {}).map(s => s.startAt)).toEqual(dir.plan(base, base + DAY, {}).map(s => s.startAt))
  }
  expect(heisDirector(0).plan(NOW, NOW + 3 * DAY, {}).filter(s => s.id === 'pizza')).toEqual([])
})

test('replays: every act has a name; say-my-name plays on Heisenberg and, on Breaking Bad, says to type it', async () => {
  expect(playsOf('breaking-bad').map(p => p.name)).toEqual(expect.arrayContaining(['say-my-name', 'desert-standoff', 'pizza-on-the-roof', 'yeah-science']))
  expect(playsOf('heisenberg').map(p => p.name)).toEqual(expect.arrayContaining(['say-my-name', 'desert-standoff', 'one-who-knocks']))
  expect(await runPlay('breaking-bad', 'say-my-name', NOW)).toContain('say my name')
  expect(bbDue(NOW + 500, true, false)?.kind).not.toBe('name')
  expect(await runPlay('heisenberg', 'say-my-name', NOW)).toBe('▶ say-my-name')
  expect(bbDue(NOW + 500, true, true)).toEqual({ kind: 'name', startAt: NOW })
  // Breaking Bad never draws the unlock act; it ends on time; Jesse keeps away while it plays.
  expect(bbDue(NOW + 500, true, false)?.kind).not.toBe('name')
  expect(bbBusy(NOW + 500, true)).toBe(true)
  expect(bbDue(NOW + BB_MS.name + 1, true, true)?.startAt).not.toBe(NOW)
  setBbPlay(undefined)
})

test('jesse: about once every 8 minutes (every 5 at 95%), the director\'s rarity; never while an act is on', () => {
  expect(jesseChance(10)).toBe(perWindow(8))
  expect(jesseChance(96)).toBe(perWindow(5))
  expect(jesseChance(10)).toBeLessThan(0.07)
  setBbPlay({ kind: 'standoff', at: NOW })
  expect(bbBusy(NOW + 4000, false)).toBe(true)
  expect(bbBusy(NOW + BB_MS.standoff + 1000, false)).toBe(false)
  setBbPlay(undefined)
})

// ---------------------------------------------------------------- the trigger words
const PROMPTS = [
  'Fix the login bug in auth.ts', 'Add a dark mode toggle to the settings page', 'Why does the build fail on CI?', 'Refactor the parser into smaller functions',
  'Write tests for the payment service', 'Rename getUser to fetchUser everywhere', 'Bump React to 19 and fix the warnings', 'Explain this stack trace',
  'Add pagination to the /orders endpoint', 'Say hello to the new API in the README', 'What is my name field called in the user table?', 'Show my name in the header',
  'what is the name of my branch', 'Add a "name" column, say, after email', 'Validate my_name in the form', "What's the name of the env var?",
  'Walter, please review the white-label config', 'Use white space in the walter.css file', 'Make the background white', 'Waltz through the test suite',
  'Rename the field whatsMyName to displayName', 'say: my name is not set in the profile', 'Fix the Heisenberg uncertainty in the flaky test', 'Deploy the blue build',
  'Run the chemistry lab simulation tests', 'The pizza endpoint returns 500', 'Crystal reports export is broken', 'Port the RV parser to Rust',
  'Add retry with backoff to the HTTP client', 'Draft release notes for v2.3', 'Profile the slow query in reports.sql', 'Find the memory leak in the worker',
  'Set up eslint with the new config', 'whitelist the walter-bot user', 'Make the bot say my name when I log in',
]
test('trigger words: "say my name" / "what\'s my name" and "walter white" are whole phrases; 34 everyday coding prompts fire neither', () => {
  expect(PROMPTS.length).toBeGreaterThanOrEqual(30)
  for (const p of PROMPTS) {
    expect(SAY_MY_NAME_RE.test(p), p).toBe(false)
    expect(WALTER_WHITE_RE.test(p), p).toBe(false)
  }
  for (const p of ['say my name', 'Say my name.', "what's my name?", 'whats my name', 'What is my name']) expect(SAY_MY_NAME_RE.test(p), p).toBe(true)
  for (const p of ['walter white', 'Walter  White, come back', 'ok WALTER WHITE']) expect(WALTER_WHITE_RE.test(p), p).toBe(true)
  for (const p of ['walterwhite', 'walter whitehead', 'mcwalter white']) expect(WALTER_WHITE_RE.test(p), p).toBe(false)
})

// ---------------------------------------------------------------- the acts: still frames, budgets, structure
const HOLES: Rect[] = [[253, 5, 85, 22], [4, 54, 104, 21]]
const ACTS: [string, () => string, number][] = [
  ['say-my-name band 640', () => nameAct({ at: NOW, w: 640, h: 56, id: 't-name-640', holes: HOLES }).layer, BAND_CAP],
  ['say-my-name band 280', () => nameAct({ at: NOW, w: 280, h: 56, id: 't-name-280', holes: [[150, 5, 85, 22]] }).layer, BAND_CAP],
  ['say-my-name band 150', () => nameAct({ at: NOW, w: 150, h: 56, id: 't-name-150', holes: [] }).layer, BAND_CAP],
  ['say-my-name pane', () => nameEcho({ at: NOW, w: 964, h: 152, id: 't-name-pane' }).layer, PANE_CAP],
  ['say-my-name pane narrow', () => nameEcho({ at: NOW, w: 380, h: 150, id: 't-name-pane-n' }).layer, PANE_CAP],
  ['stand-off band', () => standoffAct({ at: NOW, w: 640, h: 56, id: 't-so-band', holes: HOLES }).layer, BAND_CAP],
  ['stand-off narrow', () => standoffAct({ at: NOW, w: 150, h: 56, id: 't-so-narrow' }).layer, BAND_CAP],
  ['pizza', () => pizzaAct({ at: NOW, w: 640, h: 56, id: 't-pizza', holes: HOLES }).layer, BAND_CAP],
  ['yeah-science', () => scienceAct({ at: NOW, w: 600, h: 56, id: 't-sci' }).layer, BAND_CAP],
  ['one-who-knocks', () => knocksAct({ at: NOW, w: 600, h: 56, id: 't-knock' }).layer, BAND_CAP],
  ['the veil', () => nameVeil({ at: NOW, W: 1250, H: 134, id: 't-veil' }), BUDGET.wipe.band - 1000],
]
test('acts: each is pinned, has a reduced-motion still, no duplicate attribute or id, escaped text, and real headroom under its cap', () => {
  for (const [name, make, cap] of ACTS) {
    const layer = make()
    const a = audit(layer)
    expect(a.dupes, name).toEqual([])
    expect(a.dupeIds, name).toEqual([])
    expect(a.badText, name).toEqual([])
    expect(a.reduced, `${name}: reduced-motion still`).toBe(true)
    expect(layer, name).toContain('<!--dl-->')
    expect(layer, name).toContain('@@T')
    expect(layer, name).not.toMatch(/NaN|undefined|Infinity/)
    expect(layer, name).not.toContain('mix-blend-mode')
    expect(a.chars, `${name} is ${a.chars}`).toBeLessThan(cap)
  }
})

test('SAY MY NAME: the stare, the hat dropping and turning, the head turn, a hit-stop, the slam with a shake, the wipe; a still', () => {
  const n = nameAct({ at: NOW, w: 640, h: 56, id: 't-name-beats', holes: HOLES })
  // The poses in order: bare head in profile, the hat man's profile, three-quarter, front; the hat turns as it falls.
  const keys = n.act.chainKeys()
  for (const k of ['hv0', 'hv1', 'hv2', 'hv3']) expect(keys).toContain(k)
  expect(n.act.bank.has('cut')).toBe(true)
  for (const k of ['b90', 'h90', 'h45', 'h0']) expect(n.act.bank.has(k)).toBe(true)
  // The hit-stop: the act holds .2 s at 2.55 (everything after it moves on by that), a 1 px tap; then the 3 px slam shake.
  expect(Math.abs(n.act.warp(3) - 3.2)).toBeLessThan(1e-6)
  expect(n.layer).toMatch(/animation-name:sg-sh1,sg-sh3,sg-sh1/)
  // The slam (2.4x to rest), the line, the wipe downward on the crystal-blue bar; the hat's landing squash.
  expect(n.layer).toContain('scale(2.4)')
  expect(n.layer).toContain("YOU'RE GODDAMN")
  expect(n.layer).toContain('clip-path:inset(100% 0 0 0)')
  expect(n.layer).toMatch(/scale\(1,0\.82\)/)
  expect(n.layer).toContain('Say my name.')
  expect(n.layer).toContain('Heisenberg.')
  // The still (reduced motion) carries the line too: once in the act, once in the still.
  expect((n.layer.match(/YOU'RE GODDAMN/g) ?? []).length).toBeGreaterThanOrEqual(2)
  // The pane's echo: no close-up (its reserve is small): the bare head, the hat drops and stays, the slam.
  const p = nameEcho({ at: NOW, w: 964, h: 152, id: 't-name-pane-beats' })
  expect(p.act.bank.has('cut')).toBe(false)
  expect(p.act.chainKeys()).toEqual(['hv0'])
  expect(p.layer).toContain("YOU'RE GODDAMN RIGHT.")
})

test('the title card: large, never inside a keep-out hole, right of the bust where it fits, at every span', () => {
  for (const [w, holes] of [[640, HOLES], [640, [[90, 5, 85, 22]]], [400, [[300, 5, 85, 22]]], [280, [[150, 5, 85, 22]]], [150, []], [964, []]] as [number, Rect[]][]) {
    const big = w === 964
    const h = big ? 152 : 56
    const L = titleLayout(w, h, holes, 80, big)
    expect(L.size, `${w}`).toBeGreaterThanOrEqual(big ? 30 : 12)
    const wide = Math.max(...L.lines.map(l => sansW(l, L.size, L.size * 0.04, true) * 1.07))
    const top = L.y - L.size
    const bottom = L.y + (L.lines.length - 1) * L.size * 1.04 + 4
    for (const [hx, hy, hw, hh] of holes) {
      const xs = L.x < hx + hw + 4 && L.x + wide > hx - 4
      const ys = top < hy + hh && bottom > hy
      expect(xs && ys, `${w}: card ${L.x}..${r(L.x + wide)} ${r(top)}..${r(bottom)} vs hole ${hx},${hy}`).toBe(false)
    }
    expect(L.x + wide, `${w}`).toBeLessThanOrEqual(w + 2)
  }
  // At 640 the line is at least 20 px; the pane's echo at least 40 (it fills the card).
  expect(titleLayout(640, 56, HOLES, 80, false).size).toBeGreaterThanOrEqual(20)
  expect(titleLayout(964, 152, [], 80, true).size).toBeGreaterThanOrEqual(40)
  expect(freeSpan([[100, 0, 50, 56]], 400, 0, 56)).toEqual([154, 400])
})
const r = (n: number): number => Math.round(n)

test('the stand-off is words only, in choreo beats: stare, flinch, step, backdown; no hit, no weapon', () => {
  const s = standoffAct({ at: NOW, w: 640, h: 56, id: 't-so-beats', holes: HOLES })
  expect(s.fight.script.map(([b]) => b)).toEqual(['stare', 'flinch', 'step', 'backdown'])
  expect(s.fight.hits).toEqual([])
  expect(s.act.chainKeys()).toEqual(expect.arrayContaining(['hS', 'hT', 'hP', 'hF', 'dC', 'dU', 'dB']))
  for (const line of ['Say my name.', 'Heisenberg.', "You're goddamn right."]) expect(s.layer.replace(/&apos;/g, "'")).toContain(line)
  expect(s.act.bank.has('rv')).toBe(true)
  expect(s.act.bank.has('mesa')).toBe(true)
})

test('the pizza: thrown from his box, tumbles through 6 views onto the roof, lands and stays to the end', () => {
  const p = pizzaAct({ at: NOW, w: 640, h: 56, id: 't-pizza-beats', holes: HOLES })
  const keys = p.act.chainKeys()
  for (const k of ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'pl']) expect(keys).toContain(k)
  expect(keys[keys.length - 1]).toBe('pl')
  expect(p.layer).toContain('Skyler is not impressed.')
  // The scrim starts after the bust's box (he threw it).
  expect(p.layer).toMatch(/<rect x="52" width="[\d.]+" height="56" fill="url\(#/)
})

test('cheers: element tiles (Y, Sc) on Breaking Bad and the knocks on Heisenberg; neither is the old stamp', () => {
  const s = scienceAct({ at: NOW, w: 600, h: 56, id: 't-sci-b' })
  expect(s.layer).toContain('>Y</text>')
  expect(s.layer).toContain('>Sc</text>')
  expect(s.layer).toContain('IENCE!')
  const k = knocksAct({ at: NOW, w: 600, h: 56, id: 't-knock-b' })
  expect(k.layer).toContain('I AM THE ONE WHO KNOCKS.')
  expect(k.layer).toMatch(/sg-sh2,sg-sh2,sg-sh2/)
  for (const l of [s.layer, k.layer]) {
    expect(l).not.toContain('bbcheer')
    expect(l).not.toContain('steps(1) 3')
  }
})

// ---------------------------------------------------------------- idle: Walt, the crystal, the hat, the flip, the switch
test('Walt comes alive: the bust breathes (its .bd, the class nothing styled before), blinks and glances; the lenses glint when done', () => {
  for (const heis of [false, true]) {
    const idle = liveBust(live => walt(20, 36, 34, 40, heis, live), heis, {})
    expect(idle).toContain('class="bbbust"')
    expect(idle).toContain('.bbbust .bd{animation:bbwbr 3.4s steps(1) infinite}')
    for (const c of ['bbwk', 'bbwg', 'bbwl']) expect(idle).toContain(`class="${c}"`)
    expect(idle).toContain('prefers-reduced-motion: reduce')
    // Patches only: a few hundred chars over the bust.
    expect(idle.length - walt(20, 36, 34, 40, heis).length).toBeLessThan(1_500)
    expect(audit(idle).dupes).toEqual([])
    const done = liveBust(live => walt(20, 36, 34, 40, heis, live), heis, { party: true })
    expect(done).toContain('class="bbwl"')
    expect(done).not.toContain('class="bbwk"')
    expect(liveBust(live => walt(20, 36, 34, 40, heis, live), heis, { working: true })).toContain('5.2s')
  }
})

test('the crystal: 8 Blender views turning by PURITY while working (half size, crisp), the front view at rest; within budget', () => {
  expect(half(BBAD_CRYSTAL_0).rows.length).toBe(17)
  const on = crystal(100, 22, true)
  expect((on.match(/class="bbcrt"/g) ?? []).length).toBe(8)
  expect(on).toContain('2.4s steps(1) infinite')
  expect(on.length).toBeLessThan(BUDGET.turnaround.band - 1000)
  const rest = crystal(100, 22, false)
  expect(rest).not.toContain('animation')
  expect(rest.length).toBeLessThan(1_000)
})

test("Heisenberg's hat logo turns once at the top of each hour (an endless 1-hour loop, still between); the flip is on the episode", () => {
  const h = hatLogo(20, 22)
  expect(h.svg).toContain('animation-duration:3600s')
  expect(h.svg).toContain('animation-iteration-count:infinite')
  expect((h.svg.match(/class="bbhlt"/g) ?? []).length).toBe(8)
  expect(h.svg).toContain('prefers-reduced-motion: reduce')
  expect(h.svg.length).toBeLessThan(4_000)
  const ep = '<text x="900" y="22" text-anchor="end">S1E4  Cancer Man</text>'
  const f = heisFlip(ep, 800, 22)
  expect(f).toContain('HEISENBERG')
  expect(f).toContain('90s steps(1) infinite')
  expect(f).toContain('opacity="0"') // hidden between flips and under reduced motion
  expect(heisFlip('<text x="900" y="22">S1</text>', 890, 22)).toBe('')
})

test('switch flavours: Br and Ba flip in for Breaking Bad; the hat drops for Heisenberg. Within the wipe budget', () => {
  const look = { bg: '#0A120D', accent: '#4FB37A', ink: '#F2F5F0' }
  const b = skinSwitch({ W: 900, H: 134, at: NOW, surface: 'band', from: look, to: look, flavour: BB_SWITCH })
  const h = skinSwitch({ W: 900, H: 134, at: NOW, surface: 'band', from: look, to: { bg: '#0A0A0B', accent: '#5EC8F0', ink: '#F4F4F4' }, flavour: HEIS_SWITCH })
  for (const s of [b, h]) {
    expect(audit(s).dupes).toEqual([])
    expect(audit(s).chars).toBeLessThan(BUDGET.wipe.band - 1000)
  }
  expect(b).toContain('>Br</text>')
  expect(h).toContain('<use href=')
  expect(skinSwitch({ W: 900, H: 200, at: NOW, surface: 'pane', from: look, to: look, flavour: HEIS_SWITCH }).length).toBeLessThan(BUDGET.wipe.card)
})

// ---------------------------------------------------------------- the real plugin
const toasts: string[] = []
const base = (on: On, tokens = 120_000) => {
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
  on('ui.toast', async (_$, e) => {
    toasts.push(String((e as { text?: string; message?: string }).text ?? (e as { message?: string }).message ?? ''))
    return { value: undefined } as never
  })
  on('audio.play', async () => ({ value: undefined }) as never)
  on('tool.call', async () => ({ result: 'ok' }) as never)
  on('turn.complete', async () => ({ text: '' }) as never)
  on('prompt.submit', async (_$, e) => ({ text: (e as { text: string }).text }) as never)
  let n = 0
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: `a${++n}` }) as never)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 1_000_000, tokens }, rateLimits: [], cost: { usd: 12.34 } } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  return clock
}
const COLS: Record<number, number> = { 450: 66, 600: 86, 750: 106, 900: 126, 1250: 173 }
const band = async ($: Engine, W = 900, isWorking = true): Promise<string> => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking, maxRows: 14, bodyColumns: COLS[W] } as never })
  const all = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  await ui.unmount()
  return all
}
const paneSvgs = async ($: Engine): Promise<string[]> => {
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: { title: '', isFocused: false, bodyColumns: 140, placement: 'dock', scroll: { offset: 0, bodyRows: 60 }, view: {} } as never })
  const all = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source))
  await ui.unmount()
  return all
}
const TITLE = 'Ship the lab report'
const work = async ($: Engine) => {
  await $.prompt.submit({ text: TITLE, cursor: 0 } as never)
  await $.tool.call({ tool: 'mcp__crab-progress__progress', title: TITLE, total: 5, done: 2, phase: 'delegate', tasks: [{ title: 'Lead: run it', tier: 'fable' }, { title: 'Researcher: map the API', tier: 'medium' }, { title: 'Engineer: rewrite the parser', tier: 'careful' }, { title: 'Tester: break it', tier: 'heavy' }] } as never).catch(() => undefined)
  for (const [i, d] of ['Lead: run it', 'Researcher: map the API', 'Engineer: rewrite the parser', 'Tester: break it'].entries()) await $.agent.spawn({ tool_use_id: `t${i}`, prompt: 'p', description: d, subagentType: 'general-purpose', provider: 'engine', parentModel: 'x', background: false, fork: false } as never)
}
const skinList = async ($: Engine) => String(((await $.command.run({ command: 'skin', args: 'list' } as never)) as { text?: string }).text)
const start = async ($: Engine, skin: string) => {
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  await $.command.run({ command: 'skin', args: skin } as never)
}
const CARD = "YOU'RE GODDAMN"
const WIDE = [450, 600, 750, 900, 1250]
const layerOf = (b: string): string => (b.match(/<!--dl-->[\s\S]*?<!--\/dl-->/g) ?? []).filter(l => !l.includes('skin-switch')).sort((a, c) => c.length - a.length)[0] ?? ''
/** The act's keep-out clip on a band source; the readouts it must miss come from the band drawn without any act. */
const keepCheck = (name: string, b: string, calm: string): void => {
  const clip = /<clipPath id="[\w-]+"><path clip-rule="evenodd" d="([^"]+)"/.exec(b)
  expect(clip, `${name}: drawn through a keep-out clip`).not.toBeNull()
  const boxes = readouts(calm.replace(/<!--dl-->[\s\S]*?<!--\/dl-->/g, ''))
  expect(boxes.length, `${name}: readouts found`).toBeGreaterThanOrEqual(6)
  expect(overlaps(boxes, (clip as RegExpExecArray)[1] as string), name).toEqual([])
  expect(Number(/^M[-\d.]+ ([-\d.]+)/.exec((clip as RegExpExecArray)[1] as string)?.[1])).toBeGreaterThanOrEqual(33)
  expect(b.length, name).toBeLessThan(131_072)
  expect(audit(b).dupes, name).toEqual([])
}

test('SAY MY NAME on the real plugin: plays on every typing on Breaking Bad (found or not), band and pane, then Heisenberg', { timeoutMs: 60_000 }, async ($, on) => {
  const clock = base(on)
  toasts.length = 0
  await start($, 'breaking-bad')
  await work($)
  await clock.advance(3_000)
  await $.prompt.submit({ text: 'say my name', cursor: 0 } as never)
  expect(await skinList($)).toContain('▸ heisenberg')
  await clock.advance(1_200)
  const b1 = await band($, 1250)
  expect(b1).toContain(CARD)
  // The band-wide half: Breaking Bad's green veil, pulled off at the end of the act.
  expect(b1).toContain('fill="#0F2418" opacity=".5"')
  const card = (await paneSvgs($)).find(s => s.includes('CLASSROOM')) ?? ''
  expect(card).toContain('<!--dl-->')
  expect(card).toContain(CARD)
  expect(card).toMatch(/<g transform="translate\(14 36\)" font-family=/)
  expect(audit(layerOf(card)).chars).toBeLessThan(PANE_CAP)
  // Gone after its 4.9 s: Heisenberg's own band.
  await clock.advance(4_000)
  expect(await band($, 1250)).not.toContain(CARD)
  // Back to Breaking Bad and type it again: it plays again (the unlock was already found), pinned to the new moment.
  await $.command.run({ command: 'skin', args: 'breaking-bad' } as never)
  await clock.advance(2_000)
  await $.prompt.submit({ text: "What's my name?", cursor: 0 } as never)
  expect(await skinList($)).toContain('▸ heisenberg')
  await clock.advance(500)
  const b2 = await band($, 900)
  expect(b2).toContain(CARD)
  expect(b2).toMatch(/--p:-0\.5s/)
  expect(toasts.filter(t => t === "You're goddamn right!").length).toBe(2)
  // The replay on Heisenberg plays it too.
  await clock.advance(6_000)
  expect(String(((await $.command.run({ command: 'missioncontrol', args: 'play say-my-name' } as never)) as { text?: string }).text)).toBe('▶ say-my-name')
  await clock.advance(1_000)
  expect(await band($, 900)).toContain(CARD)
  setBbPlay(undefined)
})

test(`keep-out: SAY MY NAME on the real band at ${WIDE.join(', ')} covers no readout, stays under the header, in budget`, { timeoutMs: 90_000 }, async ($, on) => {
  const clock = base(on)
  await start($, 'heisenberg')
  await clock.advance(5_000)
  await work($)
  await clock.advance(4_000)
  const calm: Record<number, string> = {}
  for (const W of WIDE) calm[W] = await band($, W)
  expect(String(((await $.command.run({ command: 'missioncontrol', args: 'play say-my-name' } as never)) as { text?: string }).text)).toBe('▶ say-my-name')
  for (const dt of [400, 2_600]) {
    await clock.advance(dt)
    for (const W of WIDE) {
      const b = await band($, W)
      keepCheck(`say-my-name ${W}`, b, calm[W] as string)
      expect(b).toContain(CARD)
      expect(audit(layerOf(b)).chars, `say-my-name ${W} act`).toBeLessThan(BAND_CAP)
    }
  }
  setBbPlay(undefined)
})

for (const [skin, play] of [['breaking-bad', 'desert-standoff'], ['breaking-bad', 'pizza-on-the-roof']] as [string, string][]) {
  test(`keep-out: ${play} (${skin}) on the real band at ${WIDE.join(', ')} covers no readout, in budget`, { timeoutMs: 90_000 }, async ($, on) => {
    const clock = base(on)
    await start($, skin)
    await clock.advance(5_000)
    await work($)
    await clock.advance(4_000)
    const calm: Record<number, string> = {}
    for (const W of WIDE) calm[W] = await band($, W)
    expect(String(((await $.command.run({ command: 'missioncontrol', args: `play ${play}` } as never)) as { text?: string }).text)).toBe(`▶ ${play}`)
    await clock.advance(2_500)
    for (const W of WIDE) {
      const b = await band($, W)
      keepCheck(`${play} ${W}`, b, calm[W] as string)
      expect(audit(layerOf(b)).chars, `${play} ${W} act`).toBeLessThan(BAND_CAP)
    }
    setBbPlay(undefined)
  })
}

test('the band: Walt breathes at rest, the crystal turns at work; Heisenberg flips the episode (never the title) and wears the hat logo', async ($, on) => {
  base(on)
  await start($, 'breaking-bad')
  const rest = await band($, 900, false)
  expect(rest).toContain('.bbbust .bd{animation:bbwbr')
  expect(rest).not.toContain('class="bbhf"')
  await work($)
  const busy = await band($, 1250)
  expect((busy.match(/class="bbcrt"/g) ?? []).length).toBe(8)
  expect(busy).toMatch(new RegExp(`<text x="64" y="54"[^>]*>${TITLE}</text>`))
  await $.command.run({ command: 'skin', args: 'heisenberg' } as never)
  const h = await band($, 1250)
  expect(h).toContain('class="bbhf"')
  expect(h).toContain('animation-duration:3600s')
  expect(h).toMatch(new RegExp(`<text x="64" y="54"[^>]*>${TITLE}</text>`))
  const flip = /<g class="bbhf"[\s\S]*?<\/g>/.exec(h)?.[0] ?? ''
  expect(flip).not.toContain(TITLE)
})

test('the way back: "walter white" on Heisenberg wears Breaking Bad again (its own switch), the prompt goes on; nothing elsewhere', async ($, on) => {
  base(on)
  toasts.length = 0
  await start($, 'breaking-bad')
  await $.prompt.submit({ text: 'say my name', cursor: 0 } as never)
  expect(await skinList($)).toContain('▸ heisenberg')
  const out = (await $.prompt.submit({ text: 'Walter White, fix the build', cursor: 0 } as never)) as { text?: string }
  expect(String(out?.text ?? 'Walter White, fix the build')).toContain('Walter White')
  expect(await skinList($)).toContain('▸ breaking-bad')
  // SAY MY NAME is dropped with the skin it belonged to.
  expect(await band($)).not.toContain(CARD)
  // "walter white" on Breaking Bad or another skin does nothing; Heisenberg stays found (its own flag).
  await $.prompt.submit({ text: 'walter white', cursor: 0 } as never)
  expect(await skinList($)).toContain('▸ breaking-bad')
  await $.command.run({ command: 'skin', args: 'crab-classic' } as never)
  await $.prompt.submit({ text: 'walter white', cursor: 0 } as never)
  expect(await skinList($)).toContain('▸ crab-classic')
  await $.command.run({ command: 'skin', args: 'heisenberg' } as never)
  expect(await skinList($)).toContain('▸ heisenberg')
  setBbPlay(undefined)
})
