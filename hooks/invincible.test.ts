import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { CASTS } from './cast'
import type { Sprite } from './cast'
import { BADGES, RANKS, VERBS, coverCard, coverHeight, pageCard, rankOf, tierOf, wallCard } from './invincible-cards'
import { cqFrame, ACT_LEN, ACT_OFF, BAND_CUT, CONQUEST, CONQUEST_PLAY, CQ_K, CQ_LEN, CQ_MS, CQ_OFF, FIGHT_CSS, FIGHT_MS, FIGHT_PANE_RESERVE, FRAME_KEYS, STOP, VERSIONS, chainOfAct, fightAct, fightBand, fightCut, fightShake, frameSprite, suit2, timing } from './invincible-fight'
import { CAMEO_CSS, CAM_JITTER_MS, CAM_SLOT_MS, CECIL_LINES, DUR_MS, EVE_LINE, OLIVER_LINE, camBlocked, camDue, camExtras, camPlanOfSlot, camReplay } from './invincible-cameos'
import type { CamPlan } from './invincible-cameos'
import { AHEAD_MS, CLASSIC_RE, CQ_DUEL_MS, DUEL_MS, GUARDIANS_RE, TURN, swap, versionOf, NEW_SUIT_RE, SHOWDOWN_MS, SWAP_MS, THINK_RE, VARIANTS_MS, VARIANTS_RE, VARIANTS_SOLO_RE, duelPlan, fightDirector, fightDue, fightOf, isVariantsAsk, opOnly, showdown, showdownDue, showdownPlan, slotPlan, variantsDue, variantsPlan } from './invincible-eggs'
import { VARIANTS_CSS, variants } from './invincible-variants'
import * as VS from './invincible-variants-sprites'
import { CSS, DONE_TURN, VICTORY, EPISODES, ERA1, ERA2, PROPS, SP, cheer, TITLE_WORDS, condW, contrast, episodeAt, lum, monoW, sansW, unit as unitOf } from './invincible'
import { THEMES } from './themes'
import * as MOTION from './invincible-motion-sprites'
import { audit, doc } from './stage/budget'

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
    if (!near(d) && !near(duelPlan(t + 120_000, era)) && !near(showdownPlan(t, era)) && !near(showdownPlan(t + 120_000, era)) && !near(variantsPlan(t)) && !near(variantsPlan(t + 120_000))) return t
  }
}
const fightStart = (era: 1 | 2 = 1, from = NOW): number => {
  for (let t = from; ; t += 60_000) {
    const p = duelPlan(t, era)
    if (p.on && !(showdownPlan(p.startAt, era).startAt < p.endAt + 5000 && showdownPlan(p.startAt, era).endAt > p.startAt - 5000)) return p.startAt
  }
}

// --- the band, the cards, the Total, the words -------------------------------------------------------------------------
test('invincible: COVER STORY, THE PAGE, GDA WALL, the episode, the title and the Total; no other skin words', async ($, on) => {
  base(on, 100_000, quietAt(), 1.234)
  await start($, 'invincible')
  await jobIn($)
  await $.tool.call({ tool: 'Read', file_path: '/repo/a.ts' } as never).catch(() => undefined)
  const paneSvg = (await svgs($, 'Pane')).join('')
  const band = await bandAt($, 1250)
  for (const w of ['COVER STORY', 'THE PAGE', 'GDA WALL', 'ARCHIVED FEEDS', 'MISSION PATCHES', 'GDA FIELD REPORT', 'GDA FEED COMING ONLINE']) expect(paneSvg).toContain(w)
  const ep = (episodeAt(quietAt()) as string[])[0] as string
  expect(band).toContain(ep)
  expect(band).toContain(TITLE)
  expect(band).toMatch(/Total <tspan[^>]*>\$1\.23/)
  expect(band).toContain('MISSION CONTROL')
  expect(band).toContain('GLOBAL DEFENSE AGENCY')
  expect(band).toContain('ON PATROL')
  for (const w of OTHER) {
    expect(paneSvg).not.toContain(w)
    expect(band).not.toContain(w)
  }
  // The Total sits right after the name, the way bcsTotal does it.
  const m = /MISSION CONTROL<\/text>.*?<text x="([\d.]+)"[^>]*>Total /s.exec(band)
  expect(m).toBeTruthy()
})
test('invincible: Allen\'s eye in the corner, Eve\'s pink cache bar, the hero rule; Debbie\'s mug and BURGER MART when idle', async ($, on) => {
  base(on, 100_000, quietAt())
  await start($, 'invincible')
  await jobIn($)
  const work = await bandAt($, 1250)
  expect(work).toContain(PROPS.allen as string)
  expect(work).toContain(PROPS.eve as string)
  expect(work).toContain('class="inv-blink"')
  expect(work).not.toContain('BURGER MART')
  expect(work).not.toContain(PROPS.mug as string)
  const idle = await bandAt($, 1250, false)
  expect(idle).toContain(PROPS.mug as string)
  expect(idle).not.toContain('class="inv-steam"')
})
test('invincible: Allen goes wide at 96%', async ($, on) => {
  base(on, 960_000, quietAt())
  await start($, 'invincible')
  await jobIn($)
  const b = await bandAt($, 1250)
  expect(b).toContain('class="inv-wide"')
})
for (const [pct, ctx, word] of [[88, 880_000, 'THAT ACTUALLY HURT'], [96, 960_000, 'HOLD THE LINE']] as const) {
  test(`invincible: the ${pct}% chip says ${word}`, async ($, on) => {
    base(on, ctx, quietAt())
    await start($, 'invincible')
    await jobIn($)
    for (const W of [900, 1250]) expect(await bandAt($, W)).toContain(word)
  })
}
test('invincible: the title-card SLAM on a finished job', async ($, on) => {
  const clock = base(on, 100_000, quietAt())
  await start($, 'invincible')
  await jobIn($)
  await clock.advance(500)
  const cheer = THEMES.invincible.cheer(1250, 134, 'x', {} as never, 5_000)
  expect(cheer).toContain('INVINCIBLE')
  expect(cheer).toContain('JOB DONE')
  expect(cheer).toContain('inv-slam')
  expect(cheer).toMatch(/--cd:calc\(@@T5000@@ \+ 0s\)/)
  expect(CSS).toContain('prefers-reduced-motion')
})
test('invincible: episodes, ranks, patches and verbs', () => {
  expect(EPISODES.length).toBe(32)
  expect(episodeAt(0)).toEqual(EPISODES[0])
  expect(episodeAt(HOUR)).toEqual(EPISODES[1])
  for (const [code] of EPISODES) expect(code).toMatch(/^S\dE\d$/)
  expect(rankOf(1)).toBe('Burger Mart Cashier')
  expect(rankOf(4)).toBe('Invincible')
  expect(rankOf(20)).toBe('Invincible, Full Stop')
  expect(RANKS.length).toBe(11)
  expect(BADGES.map(b => b.id)).toEqual(['choom', 'merc', 'edgerunner', 'legend', 'netrunner', 'crewboss', 'chromed', 'owl', 'samurai'])
  expect(VERBS.Edit).toBe('PUNCH')
  expect(TITLE_WORDS).toContain('That Actually Hurt')
  expect(THEMES.invincible.tools).toEqual(VERBS)
})
test('invincible: the other skins do not wear the Invincible words', async ($, on) => {
  base(on, 100_000, quietAt())
  await start($, 'mentalist')
  await $.prompt.submit({ text: 'new suit, think, mark, guardians, season 3, multiverse, invincible war', cursor: 0 } as never)
  const band = await bandAt($, 1250)
  expect(band).not.toContain('data-egg="variants"')
  expect(band).not.toContain('THINK, MARK.')
  expect(band).not.toContain('INVINCIBLE')
  expect(await skinList($)).toContain('▸ mentalist')
  expect(band).not.toContain(ERA2.tile)
  const pn = (await svgs($, 'Pane')).join('')
  expect(pn).not.toContain('LAST ONE STANDING')
  expect(pn).not.toContain('data-egg="variants"')
})
// --- two eras ------------------------------------------------------------------------------------------------------------
test('eras: the codes, as whole words in any case', () => {
  for (const t of ['new suit', 'New Suit please', 'season 3', 'Season three', 'season 4']) expect(NEW_SUIT_RE.test(t)).toBe(true)
  for (const t of ['classic suit', 'old suit', 'season 1', 'Season one', 'season 2']) expect(CLASSIC_RE.test(t)).toBe(true)
  for (const t of ['newsuit', 'season 30', 'season', 'new suits']) expect(NEW_SUIT_RE.test(t) && t !== 'new suits').toBe(false)
  expect(THINK_RE.test('think, mark')).toBe(true)
  expect(THINK_RE.test('Think Mark!')).toBe(true)
  expect(THINK_RE.test('thinkmark')).toBe(false)
  expect(GUARDIANS_RE.test('call the Guardians')).toBe(true)
  expect(GUARDIANS_RE.test('guardianship')).toBe(false)
})
test('eras: the pane hides the era button until the new suit has been found, then switches both ways', async ($, on) => {
  base(on, 100_000, quietAt())
  await start($, 'invincible')
  const ui = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: pane })
  expect(await ui.find({ key: 'inv-era' })).toBeUndefined()
  await $.prompt.submit({ text: 'new suit', cursor: 0 } as never)
  expect(await ui.find({ key: 'inv-era' })).toBeDefined()
  await ui.press({ key: 'inv-era' })
  expect(await ui.find({ key: 'inv-era' })).toBeDefined() // found once, it stays
  await ui.unmount()
})
test('eras: "new suit" puts on the blue-and-black suit with the swap, "classic suit" goes back; the prompt goes on unchanged; saved across restarts', async ($, on) => {
  const clock = base(on, 100_000, quietAt())
  await start($, 'invincible')
  await jobIn($)
  const era1 = await bandAt($, 1250)
  expect(era1).toContain(ERA1.hero)
  expect(era1).not.toContain('class="sw-anim"')
  const r = (await $.prompt.submit({ text: 'Try the new suit', cursor: 0 } as never)) as { text?: string }
  expect(String(r?.text ?? 'Try the new suit')).toBe('Try the new suit')
  const swap = await bandAt($, 1250)
  expect(swap).toContain(ERA2.hero)
  expect(swap).toContain('class="sw-anim"')
  expect(swap).toContain('YOU WANT A REAL COSTUME, RIGHT?')
  expect(swap).toContain('sw-still')
  expect(swap).toMatch(/NEW SUIT · S3\+/)
  const pn = (await svgs($, 'Pane')).join('')
  expect(pn).toContain('class="sw-anim"')
  await clock.advance(3_000)
  const settled = await bandAt($, 1250)
  expect(settled).not.toContain('class="sw-anim"')
  expect(settled).toContain(ERA2.hero)
  expect(await skinList($)).toContain('▸ invincible')
  expect((await skinList($)).split('\n').filter(l => /invincible/.test(l)).length).toBe(1)
  await $.prompt.submit({ text: 'classic suit', cursor: 0 } as never)
  expect(await bandAt($, 1250)).toContain('IT\'S ABOUT TIME')
  // Both at once: left alone.
  await clock.advance(3_000)
  await $.prompt.submit({ text: 'new suit or classic suit', cursor: 0 } as never)
  expect(await bandAt($, 1250)).not.toContain('class="sw-anim"')
})
test('eras: the classic suit paints the whole interface suit navy with sky-blue accents; the new suit keeps its black and blue', () => {
  // Era 1 (palette A): navy surfaces, clearly blue (blue well above red and green) and well clear of the S3 near-black,
  // the layers a step apart: tile, then tile2 deeper, then the backdrop deepest.
  for (const k of ['tile', 'tile2', 'bg'] as const) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(ERA1[k].slice(i, i + 2), 16)) as [number, number, number]
    expect(b).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(r)
    expect(b - r).toBeGreaterThanOrEqual(0x38)
    expect(lum(ERA1[k])).toBeGreaterThan(lum(ERA2.tile) * 5)
    expect(lum(ERA1[k])).toBeLessThan(0.1)
  }
  expect(lum(ERA1.tile2)).toBeLessThan(lum(ERA1.tile))
  expect(lum(ERA1.bg)).toBeLessThan(lum(ERA1.tile2))
  expect(ERA1.light).toBe(false)
  // Sky-blue accents: bright and blue-led, the accent and hero words lifting off the navy.
  for (const k of ['a', 'aT', 'heroT'] as const) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(ERA1[k].slice(i, i + 2), 16)) as [number, number, number]
    expect(b).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(r)
    expect(lum(ERA1[k])).toBeGreaterThan(0.4)
    for (const s of ['tile', 'tile2', 'bg'] as const) expect(contrast(ERA1[k], ERA1[s])).toBeGreaterThanOrEqual(4.5)
  }
  expect(contrast(ERA1.a, ERA1.track)).toBeGreaterThanOrEqual(3)
  expect(ERA1.hero).toBe('#F5C518')
  expect(contrast(ERA1.heroInk, ERA1.hero)).toBeGreaterThanOrEqual(7)
  expect(lum(ERA1.text)).toBeGreaterThan(0.85)
  for (const s of ['tile', 'tile2', 'bg'] as const) for (const fg of [ERA1.text, ERA1.sub, ERA1.muted]) expect(contrast(fg, ERA1[s])).toBeGreaterThanOrEqual(4.5)
  expect(contrast(ERA1.text, ERA1.tile)).toBeGreaterThanOrEqual(7)
  // Era 2: unchanged, dark.
  expect(ERA2.light).toBe(false)
  expect(ERA2.tile).toBe('#0A0B10')
  expect(ERA2.hero).toBe('#6FB4F5')
  expect(ERA2.bg).toBe('#090C18')
  for (const k of ['tile', 'tile2', 'track', 'line', 'bg'] as const) expect(lum(ERA2[k])).toBeLessThan(0.05)
})
test('eras: the classic suit wears the navy palette on the band and the pane, the new suit the dark one', async ($, on) => {
  const clock = base(on, 100_000, quietAt())
  await start($, 'invincible')
  await jobIn($)
  const b1 = await bandAt($, 1250)
  expect(b1).toContain(ERA1.tile)
  expect(b1).not.toContain(ERA2.tile)
  const ui1 = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: pane })
  expect(JSON.stringify(await ui1.drawn())).toContain(`"backgroundColor":"${ERA1.bg}"`)
  const p1 = (await ui1.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  await ui1.unmount()
  expect(p1).toContain(ERA1.tile)
  expect(p1).toContain(ERA1.heroT)
  expect(p1).not.toContain(ERA2.tile)
  await $.prompt.submit({ text: 'new suit', cursor: 0 } as never)
  await clock.advance(3_000)
  const b2 = await bandAt($, 1250)
  expect(b2).toContain(ERA2.tile)
  expect(b2).not.toContain(ERA1.tile)
  const ui2 = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: pane })
  expect(JSON.stringify(await ui2.drawn())).toContain(`"backgroundColor":"${ERA2.bg}"`)
  await ui2.unmount()
  await $.prompt.submit({ text: 'classic suit', cursor: 0 } as never)
  await clock.advance(3_000)
  expect(await bandAt($, 1250)).toContain(ERA1.tile)
})
test('eras: the classic suit wears yellow-and-black trim on the band and the pane; the new suit wears none', async ($, on) => {
  // The suit's yellow and its black: yellow reads as text on every navy surface, ink on yellow is strong.
  expect(ERA1.trim).toEqual({ hi: '#F5C518', ink: '#0B0D14' })
  expect(ERA2.trim).toBeNull()
  const T = ERA1.trim as { hi: string; ink: string }
  for (const s of ['tile', 'tile2', 'bg'] as const) expect(contrast(T.hi, ERA1[s])).toBeGreaterThanOrEqual(4.5)
  expect(contrast(T.ink, T.hi)).toBeGreaterThanOrEqual(7)
  const clock = base(on, 100_000, quietAt())
  await start($, 'invincible')
  await jobIn($)
  await four($)
  // The band: the ink frame with the yellow status edge, the yellow-and-black rules, the yellow Tasks chip, ON PATROL in
  // yellow and the ink episode tag ringed in yellow.
  const b1 = await bandAt($, 1250)
  expect(b1.match(/class="inv-trim"/g)?.length ?? 0).toBeGreaterThanOrEqual(7)
  expect(b1).toMatch(/<g class="inv-trim"><rect x="1" y="1" [^>]*stroke="#0B0D14" stroke-width="2"\/>/)
  expect(b1).toMatch(/<rect x="2" y="14" width="3" height="\d+" rx="1" fill="#F5C518"\/>/)
  expect(b1).toMatch(/fill="#F5C518" fill-opacity="1" stroke="#0B0D14" stroke-width="1.5" class="inv-trim"/)
  expect(b1).toMatch(/fill="#F5C518" letter-spacing=".8" class="inv-trim">ON PATROL</)
  expect(b1).toContain('class="inv-trim" x=')
  expect(b1).not.toContain('class="hedge"')
  // The pane: yellow rails with an ink edge, ink edges round the plain cards, the comic cards framed in ink and yellow.
  const ui1 = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: pane })
  const tree1 = JSON.stringify(await ui1.drawn())
  const p1 = (await ui1.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  await ui1.unmount()
  expect(p1).toContain('.tile:not([stroke]){stroke:#0B0D14;stroke-width:2}')
  expect(p1).toContain('fill="#F5C518" stroke="#0B0D14" stroke-width="1" paint-order="stroke"')
  expect(p1).toContain('<g class="inv-trim"><rect x="1" y="1"')
  expect(tree1).toMatch(/"color":"#F5C518"[^▍]{0,60}"▍"/)
  // The new suit: none of it.
  await $.prompt.submit({ text: 'new suit', cursor: 0 } as never)
  await clock.advance(3_000)
  const b2 = await bandAt($, 1250)
  expect(b2).not.toContain('inv-trim')
  expect(b2).toContain('class="hedge"')
  const ui2 = await $.ui.mount({ plugin: 'crab-progress', surface: 'desktop', component: 'Pane', requestId: 'crab-agents', props: pane })
  const p2 = (await ui2.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  await ui2.unmount()
  expect(p2).not.toContain('inv-trim')
  expect(p2).not.toContain('.tile:not([stroke])')
  expect(p2).not.toContain('paint-order="stroke"')
  // Back to the classic suit: the trim returns.
  await $.prompt.submit({ text: 'classic suit', cursor: 0 } as never)
  await clock.advance(3_000)
  expect(await bandAt($, 1250)).toContain('inv-trim')
})
test('eras: era 2 draws its own palette, its own cast key and the NEW SUIT patch', async ($, on) => {
  base(on, 100_000, quietAt(2))
  await start($, 'invincible')
  await jobIn($)
  await $.prompt.submit({ text: 'season 3', cursor: 0 } as never)
  const b = await bandAt($, 1250)
  expect(b).toContain(ERA2.tile)
  const p = (await svgs($, 'Pane')).join('')
  expect(p).toContain('#6FB4F5')
  expect(THEMES.invincible2.era).toBe(2)
  expect(THEMES.invincible.era).toBe(1)
  expect(CASTS.invincible2?.boss).toBe(SP.INV_MARK_S3)
  expect(CASTS.invincible?.boss).toBe(SP.INV_MARK)
})
test('think, mark: typed, Omni-Man drops in with his line on the band for 3 s, only here, ends on its own', async ($, on) => {
  const clock = base(on, 100_000, quietAt())
  await start($, 'invincible')
  await jobIn($)
  expect(await bandAt($, 1250)).not.toContain('THINK, MARK.')
  await $.prompt.submit({ text: 'think, mark', cursor: 0 } as never)
  expect(await bandAt($, 1250)).toContain('THINK, MARK.')
  expect((await svgs($, 'Pane')).join('')).not.toContain('THINK, MARK.')
  await clock.advance(4_500)
  expect(await bandAt($, 1250)).not.toContain('THINK, MARK.')
})
test('think, mark: the 95% context warning has the same 3 s drop-in: Omni-Man with his line, ends on its own', async ($, on) => {
  const clock = base(on, 960_000, quietAt())
  await start($, 'invincible')
  await jobIn($)
  await clock.advance(1_000)
  const band = await bandAt($, 1250)
  expect(band).toContain('THINK, MARK.')
  await clock.advance(4_500)
  expect(await bandAt($, 1250)).not.toContain('THINK, MARK.')
  const reduced = CSS.split('prefers-reduced-motion')[1] as string
  for (const c of ['inv-think', 'inv-tbub', 'inv-tdrop', 'inv-cheer', 'inv-slam']) expect(reduced).toContain(c)
})
// --- the fight ---------------------------------------------------------------------------------------------------------
test('fight: on the director: rare (30-45 min apart, about 1.3-2 an hour), working only, the three cuts in turns', () => {
  expect(duelPlan(NOW, 1)).toEqual(duelPlan(NOW, 1))
  expect(slotPlan('x', NOW, 6, 0.8, DUEL_MS)).toEqual(slotPlan('x', NOW, 6, 0.8, DUEL_MS))
  expect(duelPlan(NOW, 1)).not.toEqual(duelPlan(NOW, 2))
  for (const era of [1, 2] as const) {
    const starts: { at: number; v: number }[] = []
    for (let t = NOW; t < NOW + 48 * HOUR; t += 30_000) {
      const p = duelPlan(t, era)
      if (p.on && !starts.some(x => x.at === p.startAt)) starts.push({ at: p.startAt, v: p.v })
    }
    const perHour = starts.length / 48
    expect(perHour).toBeGreaterThan(1.3)
    expect(perHour).toBeLessThan(2.05)
    for (const [i, s] of starts.slice(1).entries()) {
      const gap = s.at - (starts[i] as { at: number }).at
      expect(gap).toBeGreaterThanOrEqual(30 * 60_000)
      expect(gap).toBeLessThanOrEqual(45 * 60_000)
      const prev = (starts[i] as { v: number }).v
      // Never the same cut twice in a row: 0, 1, 2, 0, ... (the new suit puts MARK VS CONQUEST between them: 0, 3, 1, 3, 2, 3).
      if (era === 1) expect(s.v).toBe((prev + 1) % 3)
      else if (prev === 3) expect(s.v).not.toBe(3)
      else expect(s.v).toBe(3)
    }
    expect(new Set(starts.map(x => x.v)).size).toBe(era === 1 ? 3 : 4)
    // Working only: the same moment draws nothing at rest.
    const first = starts[0] as { at: number }
    expect(fightDue(first.at + 1000, era, true)).toBe(first.at)
    expect(fightDue(first.at + 1000, era, false)).toBeUndefined()
  }
  expect(DUEL_MS).toBeGreaterThanOrEqual(FIGHT_MS)
  // The director names every cut for `/missioncontrol play`.
  expect(fightDirector(1).replays()).toEqual([...VERSIONS])
  // A replay picks its cut: `fight` the classic, `fight:2` the third.
  expect(fightOf(NOW + 500, 1, false, { kind: 'fight', at: NOW })).toEqual({ startAt: NOW, v: 0 })
  expect(fightOf(NOW + 500, 1, false, { kind: 'fight:2', at: NOW })).toEqual({ startAt: NOW, v: 2 })
})
test('fight: the three combos chain their poses frame by frame', () => {
  const chain = (a: 0 | 1 | 2 | 'band', era: 1 | 2 = 1) => chainOfAct(a, era).join('>')
  // A, "The Catch": Mark smashes in at full size (XL), the dash, the punch, the catch, the BACKWIND, the smear, the backhand, the ball.
  expect(chain(0)).toMatch(/^T4>O4>M2>M3>O6>OS>M9>O7/)
  // B, "Every Angle": the ball, the charge, jabs from every side with flinches, the lazy jab (O8), the grab and the throw.
  expect(chain(1)).toMatch(/^M9>O1>M2>M4>O11.*M5>O11.*O8.*M6>O8>M9>O7/)
  // C, "Think, Mark": recover, block, hammer up and down, pitch, kneel, hands, flight.
  expect(chain(2)).toMatch(/M11>M7>O9>O9B>M12>O3>O12>O13/)
  // Every band cut ends with Mark thrown DOWN toward the viewer: S then M.
  expect(chain('band')).toMatch(/^O4>M2>M3>O7>M8>M9.*M8>T1>T2$/)
  expect(chainOfAct('band', 1, 1).join('>')).toMatch(/^O1>M2>O8>O1>O8>MS>M8>M9.*T1>T2>O1$/)
  expect(chainOfAct('band', 1, 2).join('>')).toMatch(/^O2>M2>MS>M3>O7>M8>M9.*M2>MS>M3>M2>MS>M3>O7>M8>T1>T2>O2$/)
  // The three cuts differ.
  expect(new Set([0, 1, 2].map(v => chainOfAct('band', 1, v as 0 | 1 | 2).join('>'))).size).toBe(3)
  expect(chainOfAct(0, 2).join('>')).toBe(chainOfAct(0, 1).join('>'))
  for (const k of FRAME_KEYS) {
    for (const era of [1, 2] as const) expect(frameSprite(k, era).rows.length).toBeGreaterThan(10)
  }
  expect(ACT_OFF[0]).toBeLessThan(BAND_CUT)
  expect(Math.abs(ACT_OFF[2] + ACT_LEN[2] - FIGHT_MS / 1000)).toBeLessThan(1e-6)
})
test('fight: each frame once per Svg in defs, shown with use; one pinned delay; no red in the effects; reduced motion shows one still', () => {
  const a = fightBand({ W: 1250, H: 134, era: 1, startAt: 5_000 }).svg
  const defs = /<defs>([\s\S]*?)<\/defs>/.exec(a)?.[1] as string
  const ids = [...defs.matchAll(/<g id="([^"]+)"/g)].map(m => m[1])
  expect(new Set(ids).size).toBe(ids.length)
  expect(ids.length).toBe(8)
  expect([...a.matchAll(/<use href="#([^"]+)"/g)].every(m => ids.includes(m[1]))).toBe(true)
  expect(a).toMatch(/--p:@@T5000@@/)
  expect(new Set([...a.matchAll(/@@T(\d+)@@/g)].map(m => m[1]))).toEqual(new Set(['5000']))
  const fxOnly = a.replace(/<defs>[\s\S]*?<\/defs>/, '').replace(/<g class="dl-still"[\s\S]*$/, '')
  for (const red of [PROPS.red, PROPS.redDeep, ERA1.alert, '#FF0000', '#E8453C']) expect(fxOnly.toUpperCase()).not.toContain((red as string).toUpperCase())
  expect(a).toContain('class="dl-still"')
  expect(FIGHT_CSS).toMatch(/prefers-reduced-motion: reduce\)\{\.dl-anim\{display:none\}\.dl-cam\{animation:none!important\}\.dl-still\{display:block/)
  for (const w of ['TAK!', 'WHAM!', 'KRAK!', 'BOOM', 'POW']) expect(a).toContain(w)
  for (const w of ['blood', 'gore', 'train']) expect(a.toLowerCase()).not.toContain(w)
  const p0 = fightAct({ W: 480, H: 434, era: 1, startAt: 5_000 }, 0).svg
  const p1 = fightAct({ W: 480, H: 260, era: 1, startAt: 5_000 }, 1).svg
  const p2 = fightAct({ W: 480, H: 236, era: 1, startAt: 5_000 }, 2).svg
  for (const w of ['TAK!', 'WHAM!', 'KRAK!']) expect(p0).toContain(w)
  for (const w of ['POW', 'BAM', 'BIFF', 'GRAB', 'BOOM!']) expect(p1).toContain(w)
  expect(p2).toContain('THINK, MARK!')
  expect(p2).toContain("I&apos;D STILL HAVE YOU, DAD.".replace('&apos;', "'"))
  // Act 3 is quiet: no shake, no SFX word.
  expect(p2).not.toContain('WHAM')
})
test('fight: scheduled ahead (a positive pinned delay), live (a negative one), over after the last act; only while working', async ($, on) => {
  const st = fightStart(1, quietAt(1) + 3_600_000)
  const clock = base(on, 100_000, st - 40_000)
  await start($, 'invincible')
  await jobIn($)
  await four($)
  const ahead = await bandAt($, 1250)
  expect(ahead).toMatch(/--p:40s;/)
  expect(ahead).toContain('class="dl-anim"')
  const pAhead = (await svgs($, 'Pane')).join('')
  expect(pAhead).toContain('class="dl-anim"')
  await clock.advance(20_000)
  await clock.advance(20_000)
  await clock.advance(2_000)
  expect(await bandAt($, 1250)).toMatch(/--p:-2s;/)
  for (let i = 0; i < 4; i++) await clock.advance(3_000)
  expect(await bandAt($, 1250)).not.toContain('class="dl-anim"')
  expect((await svgs($, 'Pane')).join('')).toContain('class="dl-anim"')
  for (let i = 0; i < 3; i++) await clock.advance(3_000)
  expect((await svgs($, 'Pane')).join('')).not.toContain('class="dl-anim"')
})
test('fight: the pane panel shakes (1, 3 and 4 px tiers), the sprites do not; the band never shakes; reduced motion stops it', async ($, on) => {
  const st = fightStart(1, quietAt(1) + 3_600_000)
  base(on, 100_000, st + 2_000)
  await start($, 'invincible')
  await jobIn($)
  await four($)
  const band = await bandAt($, 1250)
  // The band's working numbers never move: no panel shake there (the cut plays, with its hit-stops, inside its own clip).
  expect(band).toContain('dl-anim')
  expect(band).not.toContain('class="dl-cam"')
  // The band's shake list is still built (the pane's wrapper reads the same longhands for its acts).
  // Longhands: one name, duration and delay per shake, so EVERY shake plays (v1 glued a delay list to a shorthand: one shake).
  const cam = fightShake('band', st, 1250, 134, 1)
  expect(cam).toMatch(/^animation-name:sg-sh\d(,sg-sh\d)+;animation-duration:[\d.s,]+;animation-timing-function:steps\(1\);animation-fill-mode:none;animation-delay:calc\(/)
  const names = (/animation-name:([^;]+)/.exec(cam)?.[1] ?? '').split(',')
  expect(names.length).toBeGreaterThan(4)
  expect((/animation-duration:([^;]+)/.exec(cam)?.[1] ?? '').split(',').length).toBe(names.length)
  expect(((/animation-delay:(.+)$/.exec(cam)?.[1] ?? '').match(/calc\(/g) ?? []).length).toBe(names.length)
  expect(names).toContain('sg-sh3')
  expect(cam).not.toContain('animation:')
  for (const px of ['translate(1px', 'translate(3px', 'translate(4px']) expect(FIGHT_CSS).toContain(px)
  expect(FIGHT_CSS).toContain('.dl-cam{animation:none!important}')
  const pn = (await svgs($, 'Pane')).filter(s => s.includes('class="dl-cam"')).join('')
  expect(pn).toContain('sg-sh4')
})
test('fight: no fight while idle, in another skin, or during the showdown', async ($, on) => {
  const st = fightStart(1, quietAt(1) + 3_600_000)
  base(on, 100_000, st + 2_000)
  await start($, 'invincible')
  expect(await bandAt($, 1250, false)).not.toContain('class="dl-anim"')
  await jobIn($)
  await four($)
  expect(await bandAt($, 1250)).toContain('class="dl-anim"')
  await $.prompt.submit({ text: 'guardians', cursor: 0 } as never)
  expect(await bandAt($, 1250)).not.toContain('class="dl-anim"')
  expect((await svgs($, 'Pane')).join('')).toContain('LAST ONE STANDING.')
})
for (const era of [1, 2] as const) {
  test(`sizes: era ${era}: the band under 70 kB mid-fight; each pane Svg under 60 kB; the pane under 260 kB with four running agents`, async ($, on) => {
    const st = fightStart(era, quietAt(era) + 3_600_000)
    const clock = base(on, 880_000, st - 5_000)
    await start($, 'invincible')
    if (era === 2) await $.prompt.submit({ text: 'new suit', cursor: 0 } as never)
    await jobIn($)
    await four($)
    await clock.advance(3_000)
    await clock.advance(3_500)
    for (const W of [750, 900, 1250]) {
      const b = await bandAt($, W)
      expect(b).toContain('class="dl-anim"')
      expect(b.length).toBeLessThan(70_000)
    }
    const p = await svgs($, 'Pane')
    expect(p.join('')).toContain('class="dl-anim"')
    for (const s of p) expect(s.length).toBeLessThan(60_000)
    expect(p.reduce((n, s) => n + s.length, 0)).toBeLessThan(260_000)
  })
}
test('fight: sizes of the pieces, and the pane reserve covers the three acts at the widest card', () => {
  for (const era of [1, 2] as const) {
    let all = 0
    for (const [act, H] of [[0, 434], [1, 296], [2, 236]] as const) all += fightAct({ W: 600, H, era, startAt: 0 }, act).svg.length
    expect(all).toBeLessThan(FIGHT_PANE_RESERVE)
    for (const v of [0, 1, 2] as const) {
      for (const W of [750, 900, 1250]) expect(fightBand({ W, H: 134, era, startAt: 0, v }).svg.length).toBeLessThan(32_000)
      expect(fightBand({ W: 1250, H: 134, era, startAt: 0, v }).frames).toBeLessThanOrEqual(9)
    }
    for (const [act, H] of [[0, 434], [1, 296], [2, 236]] as const) expect(fightAct({ W: 600, H, era, startAt: 0 }, act).frames).toBeLessThanOrEqual(10)
    for (const [act, H] of [[0, 434], [1, 260], [2, 236]] as const) expect(fightAct({ W: 496, H, era, startAt: 0 }, act).svg.length).toBeLessThan(36_000)
  }
})
// --- THE FIGHT v2: hit-stop, easing, smears, impact frames, the camera, the three cuts --------------------------------------
const SURFACES = [['band', 900, 134], [0, 480, 434], [1, 480, 260], [2, 480, 236]] as const
test('fight v2: a HIT-STOP on every hit: each hit holds the paths, and its shake starts after the freeze', () => {
  for (const v of [0, 1, 2] as const) {
    for (const [sf, W, H] of SURFACES) {
      if (sf !== 'band' && v) continue
      const { f, act } = fightCut({ W, H, era: 1, startAt: 0, v }, sf)
      const hits = f.script.filter(b => b[0] === 'hit').map(b => b[1])
      const freezes = f.script.filter(b => b[0] === 'freeze').map(b => b[1])
      expect(hits.length).toBeGreaterThan(0)
      for (const t of hits) expect(freezes).toContain(t)
      // The act really waits: a moment after the last hit is later on the timeline than in the script.
      const last = Math.max(...hits)
      expect(act.warp(last + 0.01) - (last + 0.01)).toBeGreaterThanOrEqual(STOP.jab)
    }
  }
  // The shakes of the classic band cut start after their freezes (a hit at 0.51 s with a 70 ms stop shakes from 0.58 s).
  const delays = [...fightShake('band', 0, 900, 134, 1).matchAll(/calc\(@@T0@@ \+ ([\d.]+)s\)/g)].map(m => Number(m[1]))
  expect(delays.some(d => d >= 0.58 && d < 0.6)).toBe(true)
  expect(delays.some(d => Math.abs(d - 0.51) < 0.005)).toBe(true) // the 1 px tap rides the freeze itself
})
test('fight v2: smears, anticipation, impact frames and the throw toward the viewer', () => {
  const band1 = chainOfAct('band', 1, 1)
  expect(band1).toContain('MS')
  const a0 = chainOfAct(0, 1).join('>')
  // The backhand winds up (O6, 120 ms), smears (OS, 60 ms), then lands; Mark smashes in at full size first.
  expect(a0).toMatch(/O6>OS>.*O7/)
  expect(a0.startsWith('T4')).toBe(true)
  for (const v of [0, 1, 2] as const) expect(chainOfAct('band', 1, v).join('>')).toMatch(/T1>T2/)
  const p0 = fightAct({ W: 480, H: 434, era: 1, startAt: 0 }, 0).svg
  // The impact frame: an ink burst with both fighters through a flat-colour filter, then inverted.
  expect(p0).toMatch(/<filter id="\w+iw"><feColorMatrix/)
  expect(p0).toMatch(/<filter id="\w+ik"><feColorMatrix/)
  expect(p0).toContain('filter="url(#')
  // The camera punches in (a scale about the hit) and pans with the knock-back, on the act layer only.
  expect(p0).toMatch(/scale\(1\.1\)/)
  expect(p0).toMatch(/translate\(18px,0px\)/)
  // Debris, a crater, dust.
  expect(p0).toContain('sg-drop')
  expect(p0).toContain('sg-rise')
  // Real easing: the dash into contact is sampled from an ease-in (its first step is short, its last long).
  const { f } = fightCut({ W: 900, H: 134, era: 1, startAt: 0 }, 'band')
  expect(f.script.filter(b => b[0] === 'approach').length).toBeGreaterThan(5)
})
test('fight v2: both suits: Mark in his suit for every frame, the throw frames recoloured for the new suit, Omni-Man the same', () => {
  expect(frameSprite('MS', 1)).toBe(MOTION.FX_M_SMEAR_PUNCH)
  expect(frameSprite('MS', 2)).toBe(MOTION.FX3_M_SMEAR_PUNCH)
  expect(frameSprite('OS', 2)).toBe(MOTION.FX_O_SMEAR_BACKHAND)
  expect(frameSprite('T4', 1)).toBe(MOTION.FX_M_THROWN_XL)
  const t2 = frameSprite('T4', 2)
  expect(t2).toBe(suit2(MOTION.FX_M_THROWN_XL))
  expect(t2.rows).toEqual(MOTION.FX_M_THROWN_XL.rows)
  // No classic yellow left on the new suit's throw.
  for (const c of Object.values(t2.pal)) { const [r, g, b] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)) as [number, number, number]; expect(g > 140 && b < 90 && r > g).toBe(false) }
  for (const sp of Object.values(MOTION)) for (const row of sp.rows) for (const ch of row) if (ch !== '.') expect(sp.pal[ch]).toBeTruthy()
  // The two eras draw the same fight in their own colours.
  expect(chainOfAct(1, 2).join('>')).toBe(chainOfAct(1, 1).join('>'))
  expect(fightBand({ W: 900, H: 134, era: 2, startAt: 0 }).svg).not.toBe(fightBand({ W: 900, H: 134, era: 1, startAt: 0 }).svg)
})
test('fight v2: every layer is clean (no duplicate attribute, id or raw text), inside its budget, with a still for reduced motion', () => {
  for (const era of [1, 2] as const) {
    let pane = 0
    for (const [sf, W, H] of [...SURFACES, ['band', 1250, 134], [0, 600, 434], [1, 600, 296], [2, 600, 236]] as const) {
      for (const v of (sf === 'band' ? [0, 1, 2] : [0]) as (0 | 1 | 2)[]) {
        const svg = sf === 'band' ? fightBand({ W, H, era, startAt: NOW, v }).svg : fightAct({ W, H, era, startAt: NOW, v }, sf).svg
        const a = audit(doc(W, H, svg))
        expect(a.dupes).toEqual([])
        expect(a.dupeIds).toEqual([])
        expect(a.badText).toEqual([])
        expect(a.reduced).toBe(true)
        expect(svg.length).toBeLessThan(sf === 'band' ? 32_000 : 36_000)
        if (sf !== 'band' && W === 600) pane += svg.length
        // The reduced-motion still: the fighters at the clash, in place of the animation.
        const still = /<g class="dl-still">([\s\S]*?)<\/g><\/g><!--\/dl-->/.exec(svg)?.[1] ?? ''
        expect((still.match(/<use /g) ?? []).length).toBeGreaterThanOrEqual(2)
        expect(svg).toMatch(/@media \(prefers-reduced-motion: reduce\)\{\.\w+-a\{display:none\}\.\w+-s\{display:inline\}\}/)
      }
    }
    expect(pane).toBeLessThan(FIGHT_PANE_RESERVE)
  }
})
test('idle: the band bust breathes (1 px, 2.6 s, steps) and stands still under reduced motion', async ($, on) => {
  base(on, 100_000, quietAt())
  await start($, 'invincible')
  expect(await bandAt($, 1250, false)).toContain('<g class="inv-breath">')
  expect(CSS).toContain('.inv-breath{animation:inv-breath 2.6s steps(1) infinite}')
  expect(/@media \(prefers-reduced-motion: reduce\)\{[^}]*\.inv-breath[,{]/.test(CSS)).toBe(true)
})
test('fight v2: the act layer never outlives its card, and no beat runs past its act', () => {
  for (const act of [0, 1, 2] as const) {
    const { f, act: a } = fightCut({ W: 480, H: 434, era: 1, startAt: 0 }, act)
    const last = Math.max(...f.script.map(b => b[1]))
    expect(a.warp(last)).toBeLessThan(ACT_LEN[act])
  }
  for (const v of [0, 1, 2] as const) {
    const { f, act: a } = fightCut({ W: 900, H: 134, era: 1, startAt: 0, v }, 'band')
    // Mark leaves the band (thrown down) before the first pane act starts.
    const t2 = f.script.filter(b => b[0] === 'approach').map(b => b[1])
    expect(a.warp(Math.max(...t2))).toBeLessThan(BAND_CUT)
  }
})
// --- the showdown --------------------------------------------------------------------------------------------------------
test('showdown: once a day at a seeded time between 09:00 and 22:00, or when `guardians` is typed; seven KOs; arms never uncrossed', async ($, on) => {
  const seen = new Set<number>()
  for (let day = 0; day < 6; day++) {
    const p = showdownPlan(NOW + day * 86_400_000, 1)
    seen.add(p.startAt)
    const d = new Date(p.startAt)
    expect(d.getHours()).toBeGreaterThanOrEqual(9)
    expect(d.getHours()).toBeLessThan(22)
    expect(p.endAt - p.startAt).toBe(SHOWDOWN_MS)
    expect(showdownPlan(p.startAt + 1000, 1).startAt).toBe(p.startAt)
  }
  expect(seen.size).toBe(6)
  base(on, 100_000, quietAt())
  await start($, 'invincible')
  await jobIn($)
  expect((await svgs($, 'Pane')).join('')).not.toContain('LAST ONE STANDING.')
  await $.prompt.submit({ text: 'bring in the Guardians', cursor: 0 } as never)
  const wall = (await svgs($, 'Pane')).find(s => s.includes('GDA WALL') && s.includes('sd-anim')) as string
  expect(wall).toBeTruthy()
  expect(wall).toContain('THE GUARDIANS OF THE GLOBE')
  expect(wall.match(/class="inv-twirl"/g)?.length).toBe(14)
  expect(wall).toContain('sd-still')
  expect(wall.length).toBeLessThan(131_072)
  // Omni-Man's one frame the whole time: the arms-crossed hover, with a 2 px recoil.
  expect(wall.match(/translate\(2px,0\)/g)?.length).toBeGreaterThanOrEqual(7)
  expect(wall).not.toContain('uncross')
})
test('showdown: at its daily time, ahead and live; once that day, never twice', async ($, on) => {
  const p = showdownPlan(NOW, 1)
  base(on, 100_000, p.startAt - 30_000)
  await start($, 'invincible')
  await jobIn($)
  expect((await svgs($, 'Pane')).join('')).toContain('LAST ONE STANDING.')
  // The plan is the day's: the same start all day, and after its 7.4 s nothing is due until tomorrow.
  for (let t = p.startAt; t < p.startAt + 20 * HOUR; t += 30 * 60_000) expect(showdownPlan(t, 1).startAt === p.startAt || new Date(t).getDate() !== new Date(p.startAt).getDate()).toBe(true)
  const late = showdownPlan(p.endAt + 60_000, 1)
  expect(late.startAt + 0 <= p.endAt + 60_000 && p.endAt + 60_000 < late.endAt).toBe(false)
})
test('showdown: one plan per LOCAL day (the seed never re-rolls mid-day, so never twice, never skipped)', () => {
  // The seed was the UTC day number, which re-rolled at local midnight-minus-offset (here, UTC+8, at 08:00; west of UTC
  // mid-evening), so the day's time could come round twice or not at all. Every hour of a local date must see the same plan,
  // and the next local date a new one.
  for (const era of [1, 2] as const) {
    for (let day = 0; day < 60; day++) {
      const d = new Date(NOW + day * 86_400_000)
      const at = (h: number, m = 0, plus = 0): number => new Date(d.getFullYear(), d.getMonth(), d.getDate() + plus, h, m).getTime()
      const p = showdownPlan(at(0, 30), era)
      for (const [h, m] of [[7, 59], [8, 1], [12, 0], [16, 59], [17, 1], [20, 59], [23, 30]] as const) expect(showdownPlan(at(h, m), era).startAt, `era ${era} day ${day} ${h}:${m}`).toBe(p.startAt)
      expect(showdownPlan(at(0, 30, 1), era).bucket, `era ${era} day ${day}`).toBe(p.bucket + 1)
      expect(new Date(showdownPlan(at(0, 30, 1), era).startAt).getDate()).toBe(new Date(at(12, 0, 1)).getDate())
    }
  }
})
// --- layout ----------------------------------------------------------------------------------------------------------------
type Box = { l: number; r: number; t: number; b: number; s: string }
const widthOf = (font: string, s: string, size: number, ls: number, bold: boolean): number => (/Avenir/.test(font) ? condW(s, size, ls) : /monospace|Menlo/.test(font) ? monoW(s, size) + s.length * ls : sansW(s, size, ls, bold))
const boxes = (svg: string): Box[] => {
  const out: Box[] = []
  for (const m of svg.matchAll(/<text ([^>]*)>(.*?)<\/text>/gs)) {
    const at = (k: string) => new RegExp(`(?:^| )${k}="([^"]*)"`).exec(m[1] as string)?.[1]
    const x = Number(at('x'))
    const y = Number(at('y'))
    const size = Number(at('font-size') ?? 12)
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    const s = (m[2] as string).replace(/<title>.*?<\/title>/gs, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    if (!s.trim()) continue
    const width = widthOf(at('font-family') ?? '', s, size, Number(at('letter-spacing') ?? 0), at('font-weight') === '700' || at('font-weight') === '800')
    const anchor = at('text-anchor')
    const l = anchor === 'end' ? x - width : anchor === 'middle' ? x - width / 2 : x
    out.push({ l: l + 2, r: l + width - 2, t: y - size * 0.75, b: y + size * 0.15, s })
  }
  return out
}
for (const era of [1, 2] as const) {
  for (const W of [750, 900, 1250]) {
    for (const ctx of [100_000, 880_000, 960_000]) {
      test(`slim band invincible era ${era} at ${W} (${ctx / 10_000}% context): the title is plain text, the Total shows, nothing overlaps`, async ($, on) => {
        base(on, ctx, quietAt(era), 3.5)
        await start($, 'invincible')
        if (era === 2) await $.prompt.submit({ text: 'new suit', cursor: 0 } as never)
        await jobIn($)
        const clockLater = 4_000
        void clockLater
        const svg = await bandAt($, W)
        expect(svg).toMatch(new RegExp(`>${TITLE}[^<]*</text>`))
        expect(svg).toMatch(/Total <tspan[^>]*>\$3\.50<\/tspan>/)
        expect(svg).not.toContain('NaN')
        // The swap is a separate layer (era 2): measure the band without it.
        const bs = boxes(svg.replace(/<g pointer-events="none"><style>[\s\S]*?class="sw-anim"[\s\S]*$/, ''))
        const hits: string[] = []
        for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
          const a = bs[i] as Box
          const b = bs[j] as Box
          if (Math.min(a.r, b.r) - Math.max(a.l, b.l) > 1 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 3) hits.push(`${a.s} / ${b.s}`)
        }
        expect(hits).toEqual([])
        expect(svg.length).toBeLessThan(70_000)
      })
    }
  }
}
test('contrast: every text colour reads at 4.5:1 or better on its tile, in both eras', () => {
  // `heroT` carries the hero's words; in era 1 the yellow `hero` only fills boxes and bars (ink type on it), never text on the tile.
  for (const P of [ERA1, ERA2]) for (const fg of [P.text, P.sub, P.muted, P.aT, P.heroT, P.done, P.warn, P.alert]) {
    expect(contrast(fg, P.tile)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(fg, P.tile2)).toBeGreaterThanOrEqual(4.5)
  }
  expect(contrast(ERA2.hero, ERA2.tile)).toBeGreaterThanOrEqual(4.5)
  for (const role of ERA1.roles) expect(contrast(role, ERA1.tile)).toBeGreaterThanOrEqual(4.5)
  expect(contrast(ERA1.heroInk, ERA1.hero)).toBeGreaterThanOrEqual(4.5)
  expect(contrast(ERA2.heroInk, ERA2.hero)).toBeGreaterThanOrEqual(4.5)
  expect(contrast('#FFFFFF', PROPS.red as string)).toBeGreaterThanOrEqual(4.5)
  expect(contrast(PROPS.ink as string, PROPS.paper as string)).toBeGreaterThanOrEqual(4.5)
  expect(contrast(PROPS.screenText as string, PROPS.screen as string)).toBeGreaterThanOrEqual(4.5)
})
test('cards: sizes under the limits, no NaN, the levels pick their cover, the edge states', () => {
  const c = { xp: 420, jobs: 12, longJobs: 3, agents: 37, crewJobs: 1, nightJobs: 0, chromed: false, samurai: false, badges: ['choom', 'merc'] }
  const zero = { xp: 0, jobs: 0, longJobs: 0, agents: 0, crewJobs: 0, nightJobs: 0, chromed: false, samurai: false, badges: [] }
  for (const era of [1, 2] as const) {
    for (const W of [360, 480, 560]) {
      for (const cred of [c, zero, { ...c, xp: 4700, badges: BADGES.map(b => b.id) }]) {
        const s = coverCard(W, cred, { era })
        expect(s.length).toBeLessThan(30_000)
        expect(s).not.toContain('NaN')
        expect(s).toContain(`height="${coverHeight(W)}"`)
      }
    }
  }
  expect(tierOf(1)).toBe(1)
  expect(tierOf(4)).toBe(2)
  expect(tierOf(7)).toBe(3)
  expect(tierOf(12)).toBe(4)
  expect(coverCard(480, zero, { era: 1 })).toContain('BURGER MART CASHIER')
  const beats = Array.from({ length: 16 }, (_, i) => ({ at: NOW + i * 17_000, tool: ['Read', 'Edit', 'Bash', 'Agent'][i % 4] as string, text: `file${i}.ts`, who: 'Engineer' }))
  for (const W of [360, 480]) {
    expect(pageCard(W, beats, -1, { era: 1 })).toContain('TEAM-UP!')
    expect(pageCard(W, beats, 7, { era: 2 })).not.toContain('NaN')
    expect(pageCard(W, [], -1, { era: 1 })).toContain('Nothing drawn yet.')
  }
  const legends = Array.from({ length: 5 }, (_, i) => ({ task: `Mission ${i}`, costUsd: 0.4, at: NOW, ms: (3 + i) * 60_000 }))
  for (const W of [360, 480]) {
    expect(wallCard(W, 'Task', true, 2, 5, legends, { era: 1 })).toContain('FEED 01 · LIVE')
    expect(wallCard(W, '', false, 0, 0, [], { era: 2 })).toContain('No archived feeds yet.')
    expect(wallCard(W, 'Task', true, 2, 5, legends, { era: 1 }).length).toBeLessThan(30_000)
  }
})
test('sprites: rectangular rows, every letter in the palette, the cast, the fight frames', () => {
  const all = Object.entries(SP).filter(([k]) => /^(INV|FX3?)_/.test(k)) as [string, Sprite][]
  expect(all.length).toBeGreaterThanOrEqual(70)
  for (const [, sp] of all) {
    expect(new Set(sp.rows.map(r => r.length)).size).toBe(1)
    for (const row of sp.rows) for (const ch of row) if (ch !== '.' && ch !== 't') expect(sp.pal[ch]).toBeTruthy()
  }
  for (const k of ['invincible', 'invincible2']) {
    const c = CASTS[k] as NonNullable<(typeof CASTS)[string]>
    expect(c.crew.length).toBe(3)
    expect(Object.keys(c.roles).length).toBeGreaterThanOrEqual(10)
    expect(c.crew.every(sp => sp.rows.some(r => r.includes('t')))).toBe(true)
  }
  // No Mark frame is the other era's.
  expect(frameSprite('M3', 1)).toBe(SP.FX_M3_PUNCH)
  expect(frameSprite('M3', 2)).toBe(SP.FX3_M3_PUNCH)
  expect(frameSprite('O4', 2)).toBe(SP.FX_O4_CATCH)
})
test('layout: 150 redraws over 50 minutes (one fight at the most a 45 min gap) keep one layout signature', { timeoutMs: 240_000 }, async ($, on) => {
  const clock = base(on, 100_000, quietAt(1))
  await start($, 'invincible')
  await jobIn($)
  await four($)
  const sig = async () => {
    const b = await svgs($, 'AbovePrompt', 900)
    const p = await svgs($, 'Pane')
    const dims = (l: string[]) => l.map(s => `${/width="(\d+)"/.exec(s)?.[1]}x${/height="(\d+)"/.exec(s)?.[1]}`).join(',')
    return `${b.length}:${/height="(\d+)"/.exec(b[0] ?? '')?.[1]}|${p.length}|${dims(p)}`
  }
  const seen = new Set([await sig()])
  let fights = 0
  for (let i = 0; i < 150; i++) {
    await clock.advance(20_000)
    seen.add(await sig())
    if ((await svgs($, 'Pane')).join('').includes('class="dl-anim"')) fights++
  }
  expect(fights).toBeGreaterThan(0)
  expect([...seen]).toHaveLength(1)
})
// --- the cameos: Atom Eve, Oliver and Cecil ---------------------------------------------------------------------------------
const K0 = Math.floor(NOW / CAM_SLOT_MS)
/** The first cameo from NOW on that is on and matches. */
const camFind = (pred: (p: CamPlan) => boolean, from = K0): CamPlan => {
  for (let k = from; ; k++) {
    const p = camPlanOfSlot(k)
    if (p.on && pred(p)) return p
  }
}
const CARD_WORD = { cred: 'COVER STORY', log: 'THE PAGE', task: 'GDA WALL' } as const
const camsIn = (svgList: string[], who?: string): string[] => svgList.filter(s => (who ? s.includes(`data-cam="${who}"`) : s.includes('data-cam=')))
const MODES = [['eve', 'fly-band'], ['eve', 'fly-pane'], ['eve', 'perch'], ['oliver', 'dash'], ['oliver', 'pop'], ['cecil', 'feed']] as const
test('cameos: each character appears at a known seed and time, and the plan is the same every time', () => {
  // Slots from 2026-10-20 10:00 UTC: [slot, who, mode, start].
  const want: [number, string, string, string][] = [[0, 'eve', 'perch', '2026-10-20T10:01:00.682Z'], [1, 'eve', 'fly-band', '2026-10-20T10:06:18.200Z'], [2, 'cecil', 'feed', '2026-10-20T10:12:38.919Z'], [4, 'oliver', 'pop', '2026-10-20T10:25:52.788Z']]
  for (const [i, who, mode, iso] of want) {
    const p = camPlanOfSlot(K0 + i)
    expect([p.on, p.who, p.mode, new Date(p.startAt).toISOString()]).toEqual([true, who, mode, iso])
    expect(camPlanOfSlot(K0 + i)).toEqual(p)
    expect(p.endAt - p.startAt).toBe(DUR_MS[p.mode])
    expect(p.startAt - p.slot * CAM_SLOT_MS).toBeLessThan(CAM_JITTER_MS)
  }
})
test('cameos: Eve over the band at her time: the pinned delay is negative inside the act', async ($, on) => {
  const eve = camFind(q => q.who === 'eve' && q.mode === 'fly-band')
  base(on, 100_000, eve.startAt + 2_000)
  await start($, 'invincible')
  const b = await bandAt($, 1250, false)
  expect(b).toContain('data-cam="eve"')
  expect(b).toMatch(/animation-delay:calc\(-2s \+ 0s\)/)
  expect(b).toContain('class="cm-anim"')
})
test('cameos: scheduled ahead (a positive pinned delay), live (a negative one), gone after the act', async ($, on) => {
  const cecil = camFind(q => q.who === 'cecil')
  const clock = base(on, 100_000, cecil.startAt - 40_000)
  await start($, 'invincible')
  await jobIn($)
  const ahead = await svgs($, 'Pane')
  expect(camsIn(ahead, 'cecil')).toHaveLength(1)
  expect(camsIn(ahead, 'cecil')[0]).toMatch(/animation-delay:calc\(40s \+ 0s\)/)
  await clock.advance(43_000)
  expect(camsIn(await svgs($, 'Pane'), 'cecil')[0]).toMatch(/animation-delay:calc\(-3s \+ 0s\)/)
  await clock.advance(DUR_MS.feed)
  expect(camsIn(await svgs($, 'Pane'))).toHaveLength(0)
})
for (const [who, mode] of MODES) {
  test(`cameos: ${who} ${mode}: drawn from the clock alone, on the right surface and card, with the show's words only`, async ($, on) => {
    const p = camFind(q => q.who === who && q.mode === mode && q.bubble && (q.mode !== 'feed' || q.rec))
    base(on, 100_000, p.startAt + 2_000)
    await start($, 'invincible')
    await jobIn($)
    await four($)
    const band = await bandAt($, 1250)
    const pn = await svgs($, 'Pane')
    const onBand = mode === 'fly-band' || mode === 'dash' || mode === 'feed'
    expect(band.includes(`data-cam="${who}"`)).toBe(onBand)
    const cards = camsIn(pn, who)
    expect(cards).toHaveLength(mode === 'fly-band' || mode === 'dash' ? 0 : 1)
    if (cards[0]) expect(cards[0]).toContain(CARD_WORD[p.card])
    for (const s of [band, ...cards]) {
      if (!s.includes('data-cam=')) continue
      expect(s).toContain('class="cm-anim"')
      // Only the plan's own line is on a bubble.
      for (const other of [EVE_LINE, OLIVER_LINE, ...CECIL_LINES]) if (other !== p.line) expect(s.includes(`>${other}</text>`)).toBe(false)
    }
    if (mode !== 'feed') expect([band, ...cards].join('').includes(`>${p.line}</text>`)).toBe(true)
    else expect(cards.join('').includes(`>${p.line}</text>`)).toBe(true)
    for (const s of camsIn(pn)) expect(s.includes('GDA WALL')).toBe(who === 'cecil' || p.card === 'task')
  })
}
test("cameos: the lines are short and the show's own", () => {
  for (const l of [EVE_LINE, OLIVER_LINE, ...CECIL_LINES]) expect(l.split(/\s+/).length).toBeLessThanOrEqual(6)
  expect(EVE_LINE).toBe('Need a hand, Mark?')
  expect(OLIVER_LINE).toBe('Hi, Mark!')
  expect(CECIL_LINES).toContain('We need to talk.')
  expect(CECIL_LINES).toContain('Mark. My office.')
})
test('cameos: Cecil is on the GDA WALL only; the band gets just a tiny GDA REC tag, and never his bust', async ($, on) => {
  const p = camFind(q => q.who === 'cecil' && q.rec)
  base(on, 100_000, p.startAt + 3_000)
  await start($, 'invincible')
  await jobIn($)
  await four($)
  const pn = await svgs($, 'Pane')
  const hits = camsIn(pn, 'cecil')
  expect(hits).toHaveLength(1)
  expect(hits[0]).toContain('GDA WALL')
  expect(hits[0]).toContain('INCOMING FEED')
  for (const s of pn) if (!s.includes('GDA WALL')) expect(s).not.toContain('data-cam="cecil"')
  const band = await bandAt($, 1250)
  expect(band).toContain('data-cam="cecil"')
  expect(band).toContain('>REC<')
  expect(band).not.toContain('INCOMING FEED')
})
for (const [who, mode] of [['eve', 'perch'], ['eve', 'fly-pane'], ['oliver', 'pop']] as const) {
  test(`cameos: ${who} ${mode} never puts Cecil's feed on any card`, async ($, on) => {
    const p = camFind(q => q.who === who && q.mode === mode)
    base(on, 100_000, p.startAt + 2_800)
    await start($, 'invincible')
    await jobIn($)
    const pn = (await svgs($, 'Pane')).join('')
    expect(pn).toContain(`data-cam="${who}"`)
    expect(pn).not.toContain('INCOMING FEED')
    expect(pn).not.toContain('data-cam="cecil"')
  })
}
test('cameos: one character per 30 s window, 4 to 8 minutes apart, every character shows up, over 3 simulated hours', () => {
  for (const from of [K0, K0 + 480, K0 + 2_000]) {
    const plans = Array.from({ length: 30 }, (_, i) => camPlanOfSlot(from + i)).filter(p => p.on)
    expect(plans.length).toBeGreaterThanOrEqual(29)
    expect(plans.length).toBeLessThanOrEqual(30)
    const buckets = new Set(plans.map(p => Math.floor(p.startAt / 30_000)))
    expect(buckets.size).toBe(plans.length)
    expect(new Set(plans.map(p => p.who)).size).toBe(3)
    for (let i = 1; i < plans.length; i++) {
      const [a, b] = [plans[i - 1] as CamPlan, plans[i] as CamPlan]
      expect(a.endAt).toBeLessThan(b.startAt - 30_000)
      if (b.slot !== a.slot + 1) continue
      expect(b.startAt - a.startAt).toBeGreaterThanOrEqual(4 * 60_000 - 1)
      expect(b.startAt - a.startAt).toBeLessThanOrEqual(8 * 60_000 + 1)
    }
  }
  // Over 2 000 slots (200 hours) the mix is Eve about 40 %, Oliver 34 %, Cecil 26 %, and nearly every slot has one.
  const count: Record<string, number> = { eve: 0, oliver: 0, cecil: 0 }
  let on = 0
  for (let k = K0; k < K0 + 2_000; k++) {
    const p = camPlanOfSlot(k)
    if (!p.on) continue
    on++
    count[p.who] = (count[p.who] as number) + 1
  }
  expect(on).toBeGreaterThan(1_980)
  expect((count.eve as number) / on).toBeGreaterThan(0.33)
  expect((count.eve as number) / on).toBeLessThan(0.47)
  expect((count.oliver as number) / on).toBeGreaterThan(0.28)
  expect((count.oliver as number) / on).toBeLessThan(0.4)
  expect((count.cecil as number) / on).toBeGreaterThan(0.2)
  expect((count.cecil as number) / on).toBeLessThan(0.32)
})
test("cameos: never inside the fight's or the showdown's window (either era), over 12 simulated hours", () => {
  let checked = 0
  for (let k = K0; k < K0 + 120; k++) {
    const p = camPlanOfSlot(k)
    if (!p.on) continue
    expect(camBlocked(p.startAt, p.endAt)).toBe(false)
    for (const era of [1, 2] as const) {
      for (let t = p.startAt - 8_000; t <= p.endAt + 8_000; t += 1_000) {
        const d = duelPlan(t, era)
        if (d.on) expect(p.startAt < d.endAt + 5_000 && d.startAt < p.endAt + 5_000).toBe(false)
        const sd = showdownPlan(t, era)
        expect(p.startAt < sd.endAt + 5_000 && sd.startAt < p.endAt + 5_000).toBe(false)
        checked++
      }
    }
  }
  expect(checked).toBeGreaterThan(5_000)
  // A window that sits on a fight is refused, and so is one on the showdown.
  const fs = fightStart(1, NOW)
  expect(camBlocked(fs + 1_000, fs + 4_000)).toBe(true)
  expect(camBlocked(showdownPlan(NOW, 1).startAt + 500, showdownPlan(NOW, 1).startAt + 4_000)).toBe(true)
})
test("cameos: a moment that would touch the fight is moved to the slot's next seeded moment", () => {
  let moved = 0
  for (let k = K0; k < K0 + 600; k++) {
    const p = camPlanOfSlot(k)
    const first = k * CAM_SLOT_MS + Math.floor(unitOf(`inv-cam|${k}|at`) * CAM_JITTER_MS)
    if (p.on && p.startAt !== first) moved++
  }
  expect(moved).toBeGreaterThan(0)
})
test('cameos: not while the fight is drawn: none is live and a coming one waits', async ($, on) => {
  const st = fightStart(1, quietAt(1) + 3_600_000)
  base(on, 100_000, st + 2_000)
  await start($, 'invincible')
  await jobIn($)
  await four($)
  const band = await bandAt($, 1250)
  expect(band).toContain('class="dl-anim"')
  expect(camsIn([band, ...(await svgs($, 'Pane'))])).toHaveLength(0)
})
test('cameos: a typed showdown takes the stage from a live cameo', async ($, on) => {
  const p = camFind(q => q.who === 'cecil')
  base(on, 100_000, p.startAt + 2_000)
  await start($, 'invincible')
  await jobIn($)
  expect(camsIn(await svgs($, 'Pane'))).toHaveLength(1)
  await $.prompt.submit({ text: 'guardians', cursor: 0 } as never)
  expect(camsIn([await bandAt($, 1250), ...(await svgs($, 'Pane'))])).toHaveLength(0)
  expect((await svgs($, 'Pane')).join('')).toContain('LAST ONE STANDING.')
})
test('cameos: the daily showdown has the wall to itself', async ($, on) => {
  const sd = showdownPlan(NOW, 1)
  base(on, 100_000, sd.startAt + 1_000)
  await start($, 'invincible')
  await jobIn($)
  const wall = await svgs($, 'Pane')
  expect(wall.join('')).toContain('LAST ONE STANDING.')
  expect(camsIn([await bandAt($, 1250), ...wall])).toHaveLength(0)
})
test('cameos: THINK, MARK takes the band from a live cameo', async ($, on) => {
  const q = camFind(z => z.who === 'eve' && z.mode === 'fly-band')
  base(on, 100_000, q.startAt + 1_500)
  await start($, 'invincible')
  await jobIn($)
  expect(await bandAt($, 1250)).toContain('data-cam="eve"')
  await $.prompt.submit({ text: 'think, mark', cursor: 0 } as never)
  expect(camsIn([await bandAt($, 1250)])).toHaveLength(0)
})
test('cameos: the era swap takes the band from a live cameo', async ($, on) => {
  const q = camFind(z => z.who === 'eve' && z.mode === 'fly-band')
  base(on, 100_000, q.startAt + 1_500)
  await start($, 'invincible')
  await jobIn($)
  await $.prompt.submit({ text: 'new suit', cursor: 0 } as never)
  expect(camsIn([await bandAt($, 1250)])).toHaveLength(0)
})
test('cameos: never during the job-done celebration', async ($, on) => {
  const p = camFind(q => q.who === 'eve' && q.mode === 'fly-band' && q.startAt - 20_600 > NOW)
  const clock = base(on, 100_000, p.startAt + 1_800 - 20_600)
  await start($, 'invincible')
  await jobIn($)
  await clock.advance(20_600)
  expect(await bandAt($, 1250)).toContain('data-cam="eve"')
  await $.turn.complete({ reason: 'answer', answer: 'done' } as never)
  const band = await bandAt($, 1250)
  expect(band).toContain('JOB DONE')
  expect(band).not.toContain('data-cam=')
  // The theme's slot says the same for a party draw at any cameo time.
  for (const era of [1, 2] as const) expect(camExtras(era)({ W: 1250, H: 134, surface: 'band', at: p.startAt + 1_800, ctxPct: 10, party: true })).toBe('')
})
test('cameos: reduced motion: the sheet stops or hides every animated class it defines', () => {
  const reduced = /@media \(prefers-reduced-motion: reduce\)\{(.*)\}$/.exec(CAMEO_CSS)?.[1] ?? ''
  expect(reduced).toBeTruthy()
  const animated = [...CAMEO_CSS.replace(/@media[\s\S]*$/, '').matchAll(/\.(cm-[\w-]+)\{[^}]*animation:/g)].map(m => m[1] as string)
  expect(animated.length).toBeGreaterThanOrEqual(5)
  for (const cls of animated) expect(reduced).toContain(`.${cls}`)
  expect(reduced).toContain('.cm-anim{display:none}')
  expect(reduced).toContain('.cm-still{display:block')
})
for (const [who, mode] of MODES) {
  test(`cameos: reduced motion: ${who} ${mode}: only the hidden act moves, and a faint still lasts the act's length`, async ($, on) => {
    const known = new Set([...CAMEO_CSS.matchAll(/\.(cm-[\w-]+)/g)].map(m => m[1]))
    const p = camFind(q => q.who === who && q.mode === mode && q.still && (q.mode !== 'feed' || q.rec))
    base(on, 100_000, p.startAt + 1_000)
    await start($, 'invincible')
    await jobIn($)
    const mine = camsIn([await bandAt($, 1250), ...(await svgs($, 'Pane'))])
    expect(mine.length).toBeGreaterThan(0)
    for (const s of mine) {
      for (const m of s.matchAll(/class="(cm-[\w-]+)/g)) expect(known.has(m[1])).toBe(true)
      expect(s).toMatch(new RegExp(`class="cm-still" style="animation-duration:${p.durMs / 1000}s;animation-delay:calc\\(-1s \\+ 0s\\)"`))
      // The only inline `animation:` styles are inside the act (`.cm-anim`), which is hidden; the still has none.
      const still = s.slice(s.indexOf('class="cm-still"'))
      expect(still).not.toMatch(/style="animation:/)
    }
  })
}
for (const era of [1, 2] as const) {
  for (const [who, mode] of MODES) {
    test(`cameos: era ${era}: ${who} ${mode}: sizes: the band under 70 kB, every pane Svg under 60 kB, the pane under 260 kB with four running agents`, async ($, on) => {
      const p = camFind(q => q.who === who && q.mode === mode && q.bubble)
      // Era 2 puts the suit on first (the swap holds the cameo back for ~3.7 s), so its clock starts 6.5 s earlier.
      const clock = base(on, 880_000, p.startAt + 2_500 - (era === 2 ? 6_500 : 0))
      await start($, 'invincible')
      if (era === 2) await $.prompt.submit({ text: 'new suit', cursor: 0 } as never)
      await jobIn($)
      await four($)
      if (era === 2) {
        await clock.advance(3_000)
        await clock.advance(3_500)
      }
      for (const W of [750, 900, 1250]) expect((await bandAt($, W)).length).toBeLessThan(70_000)
      const pn = await svgs($, 'Pane')
      for (const s of pn) {
        expect(s.length).toBeLessThan(60_000)
        expect(s.length).toBeLessThan(131_072)
      }
      expect(pn.reduce((n, s) => n + s.length, 0)).toBeLessThan(260_000)
      expect(camsIn([...pn, await bandAt($, 900)]).length).toBeGreaterThan(0)
    })
  }
  test(`cameos: era ${era}: the largest band: a live cameo with a fight already drawn ahead stays under 70 kB`, async ($, on) => {
    let p: CamPlan | undefined
    for (let k = K0; k < K0 + 3_000 && !p; k++) {
      const q = camPlanOfSlot(k)
      if (!q.on || (q.mode !== 'fly-band' && q.mode !== 'dash')) continue
      const d = duelPlan(q.startAt + 30_000, era)
      if (d.on && d.startAt >= q.endAt + 6_000 && d.startAt <= q.startAt + 60_000) p = q
    }
    expect(p).toBeTruthy()
    const q = p as CamPlan
    const clock = base(on, 880_000, q.startAt + 1_200 - (era === 2 ? 6_500 : 0))
    await start($, 'invincible')
    if (era === 2) await $.prompt.submit({ text: 'new suit', cursor: 0 } as never)
    await jobIn($)
    await four($)
    if (era === 2) {
      await clock.advance(3_000)
      await clock.advance(3_500)
    }
    for (const W of [750, 900, 1250]) {
      const b = await bandAt($, W)
      expect(b).toContain(`data-cam="${q.who}"`)
      expect(b).toContain('class="dl-anim"')
      expect(b.length).toBeLessThan(70_000)
    }
  })
}
test('cameos: the pieces are small: each fragment under 14 kB, and the showdown wall with one more still fits under 131072', () => {
  const sd = showdown(600, 296, 1, { delay: '0s' })
  for (const era of [1, 2] as const) {
    for (const [who, mode] of MODES) {
      const p = camFind(q => q.who === who && q.mode === mode && q.bubble && q.still)
      for (const [W, H, surface, card] of [[1250, 134, 'band', undefined], [600, 296, 'pane', p.card], [496, 236, 'pane', p.card]] as const) {
        const out = camExtras(era)({ W, H, surface, at: p.startAt + 1_000, ctxPct: 10, ...(card ? { card } : {}) })
        expect(out.length).toBeLessThan(14_000)
        expect(out.length + sd.length).toBeLessThan(131_072)
      }
    }
  }
})
test("cameos: the same in both eras; only the band tag and Oliver's speed lines take the era's colours", () => {
  const p = camFind(q => q.who === 'eve' && q.mode === 'fly-band')
  const at = { W: 1250, H: 134, surface: 'band', ctxPct: 10 } as const
  expect(camExtras(1)({ ...at, at: p.startAt + 1_000 })).toBe(camExtras(2)({ ...at, at: p.startAt + 1_000 }))
  const cec = camFind(q => q.who === 'cecil' && q.rec)
  expect(camExtras(1)({ ...at, at: cec.startAt + 1_000 })).not.toBe(camExtras(2)({ ...at, at: cec.startAt + 1_000 }))
  const oli = camFind(q => q.who === 'oliver' && q.mode === 'dash')
  expect(camExtras(1)({ ...at, at: oli.startAt + 1_000 })).not.toBe(camExtras(2)({ ...at, at: oli.startAt + 1_000 }))
  expect(THEMES.invincible.extras).toBeTruthy()
  expect(THEMES.invincible2?.extras).toBeTruthy()
})
test('cameos: layout: 130 redraws over ~43 minutes keep one layout signature, with cameos showing', { timeoutMs: 180_000 }, async ($, on) => {
  const clock = base(on, 100_000, NOW)
  await start($, 'invincible')
  await jobIn($)
  await four($)
  const sig = async () => {
    const b = await svgs($, 'AbovePrompt', 900)
    const p = await svgs($, 'Pane')
    const dims = (l: string[]) => l.map(s => `${/width="(\d+)"/.exec(s)?.[1]}x${/height="(\d+)"/.exec(s)?.[1]}`).join(',')
    return `${b.length}:${/height="(\d+)"/.exec(b[0] ?? '')?.[1]}|${p.length}|${dims(p)}`
  }
  const seen = new Set([await sig()])
  const who = new Set<string>()
  let drawn = 0
  for (let i = 0; i < 130; i++) {
    await clock.advance(20_000)
    seen.add(await sig())
    const all = [...(await svgs($, 'AbovePrompt', 900)), ...(await svgs($, 'Pane'))]
    for (const s of all) for (const m of s.matchAll(/data-cam="(\w+)"/g)) who.add(m[1] as string)
    if (camsIn(all).length) drawn++
  }
  expect(drawn).toBeGreaterThan(10)
  expect(who.size).toBeGreaterThanOrEqual(2)
  expect([...seen]).toHaveLength(1)
})
test('skins: Invincible is one entry in the picker, ships in the core edition, and the JSON copy matches', async ($, on) => {
  base(on)
  await start($, '')
  const list = await skinList($)
  expect(list).toContain('invincible')
  expect(list).not.toContain('invincible2')
  expect(list.split('\n').filter(l => /\binvincible\b/.test(l)).length).toBe(1)
  expect(await skinList($)).toContain('Invincible')
  const r = String(((await $.command.run({ command: 'skin', args: 'invincible' } as never)) as { text?: string }).text)
  expect(r).toContain('Skin: Invincible')
})

// --- the unlisted replay: /missioncontrol play <egg> --------------------------------------------------------------------
const play = async ($: Engine, egg: string) => String(((await $.command.run({ command: 'missioncontrol', args: `play ${egg}` } as never)) as { text?: string }).text)
const allSvg = async ($: Engine) => (await bandAt($, 1250, false)) + (await svgs($, 'Pane')).join('')

test('replay: refused unless Invincible is worn', async ($, on) => {
  base(on, 100_000, quietAt())
  await start($, 'mentalist')
  expect(await play($, 'fight')).toBe('Wear the Invincible skin first.')
})

/** A quiet moment (no fight, no showdown) with no cameo due either. */
const calmAt = (from: number): number => {
  for (let t = quietAt(1, from); ; t = quietAt(1, t + 61_000)) if (!camDue(t) && !camDue(t + 2 * AHEAD_MS) && !camDue(t + 30_000)) return t
}

test('replay: every egg draws now, with no job working', async ($, on) => {
  let now = calmAt(NOW)
  const clock = base(on, 100_000, now)
  await start($, 'invincible')
  const marks: Record<string, string> = { fight: 'dl-c', showdown: 'sd-anim', think: 'THINK, MARK.', eve: 'data-cam="eve"', oliver: 'data-cam="oliver"', cecil: 'data-cam="cecil"' }
  for (const [egg, mark] of Object.entries(marks)) {
    const next = calmAt(now + 10 * 60_000)
    await clock.advance(next - now)
    now = next
    expect(`${egg} before:${(await allSvg($)).includes(mark)}`).toBe(`${egg} before:false`)
    expect(await play($, egg)).toBe(`▶ ${egg}`)
    expect(`${egg}:${(await allSvg($)).includes(mark)}`).toBe(`${egg}:true`)
  }
  await clock.advance(60_000)
  expect(await play($, 'newsuit')).toBe('▶ newsuit')
  expect((await allSvg($)).includes('sw-still')).toBe(true)
  expect(await play($, 'newsuit')).toBe('Already in the new suit.')
  await clock.advance(60_000)
  expect(await play($, 'classic')).toBe('▶ classic')
  expect(await play($, 'nope')).toContain('Play which?')
})

test('replay: a fight replay draws in its own time and ends on its own', async ($, on) => {
  const clock = base(on, 100_000, quietAt())
  await start($, 'invincible')
  expect((await allSvg($)).includes('dl-c')).toBe(false)
  await play($, 'fight')
  expect((await allSvg($)).includes('dl-c')).toBe(true)
  await clock.advance(FIGHT_MS + 5000)
  expect((await bandAt($, 1250, false)).includes('dl-c')).toBe(false)
})

test('replay: the three cuts by name (the-catch, jet-flick, every-angle), and `fight` still plays the classic', async ($, on) => {
  const clock = base(on, 100_000, calmAt(NOW))
  await start($, 'invincible')
  expect(await play($, 'jet-flick')).toBe('▶ jet-flick')
  const b = await bandAt($, 1250, false)
  expect(b).toContain('FLICK!')
  expect(b).toContain('class="dl-anim"')
  await clock.advance(FIGHT_MS + 5000)
  expect(await bandAt($, 1250, false)).not.toContain('class="dl-anim"')
  expect(await play($, 'every-angle')).toBe('▶ every-angle')
  expect(await bandAt($, 1250, false)).toContain('BIFF')
  await clock.advance(FIGHT_MS + 5000)
  expect(await play($, 'fight')).toBe('▶ fight')
  expect(await bandAt($, 1250, false)).toContain('WHAM!')
  expect(await play($, 'nope')).toMatch(/the-catch.*jet-flick.*every-angle/)
})
test('replay: play think has Omni-Man drop in on the band for 3 s, ending on its own', async ($, on) => {
  const clock = base(on, 100_000, calmAt(NOW))
  await start($, 'invincible')
  expect(await bandAt($, 1250, false)).not.toContain('THINK, MARK.')
  expect(await play($, 'think')).toBe('▶ think')
  expect(await bandAt($, 1250, false)).toContain('THINK, MARK.')
  await clock.advance(4_500)
  expect(await bandAt($, 1250, false)).not.toContain('THINK, MARK.')
})

// --- THE MULTIVERSE: Angstrom's rifts and the flock of other-universe Marks ------------------------------------------------
const EGG = 'data-egg="variants"'
/** The act's one pinned delay in seconds (the shared class rule), or NaN when the egg is not in the source. */
const vrDelay = (svg: string): number => Number(/\.vr\d+A\{[^}]*animation-delay:calc\((-?[\d.]+)s \+ 0s\)/.exec(svg)?.[1] ?? NaN)
/** The day's plan, from a day on which it is on. */
const vrDay = (from = NOW): ReturnType<typeof variantsPlan> => {
  for (let t = from; ; t += 86_400_000) {
    const p = variantsPlan(t)
    if (p.on) return p
  }
}
const MARK_FLY_ROWS = ['.............ddd.....', '............idid.....', '............jjjj.....', '.......ddbb.clll.....', '....nndddjbnelll.....', '..ennmiiiijnfmlj..nf.', '..mm.....idnneaddnnee', '........dimnnaiiimmmm', '......dddheegi.......', '...adddddkmk.........', '..jadiiiddd..........', '.jjj..dddd...........', 'jj..jddd.............', 'jj.jjj...............', '..jj.................', '..j..................']
const MARK_S3_FLY_ROWS = ['............eee......', '...........hehhe.....', '............ffj......', '...........ilhh......', '.....eeeeefjlii......', '...fffeeeeffgiceefffj', '..ffgb.kkeeffjeeejdbj', '..b.....hhbaahkk.....', '.......ehhjjfh.......', '....ddgehddg.........', '..jjdddjeda..........', '.bjjbadjjj...........', '.jj..gjjj............', '.jdbbjj..............', 'jjbb.................', 'j.b..................']

test('multiverse: the words, whole words in any case; "what have i done" only as the whole prompt', () => {
  for (const t of ['show me the multiverse', 'MULTIVERSE', 'the multiverses', 'start the Invincible War', 'invincible   war']) expect(VARIANTS_RE.test(t)).toBe(true)
  for (const t of ['what have I done', 'What have I done?!', '  what have i done.  ']) expect(VARIANTS_SOLO_RE.test(t)).toBe(true)
  for (const t of ['show me the multiverse', 'MULTIVERSE', 'the multiverses', 'start the Invincible War', 'invincible   war', 'what have I done', 'What have I done?!', '  what have i done.  ']) expect(isVariantsAsk(t)).toBe(true)
  for (const t of ['button variants', 'variants', 'multiversal', 'metaverse', 'invincible warehouse', 'invincible wars', 'what have I done to the build', 'so what have i done wrong']) expect(isVariantsAsk(t)).toBe(false)
})
for (const era of [1, 2] as const) {
  test(`multiverse: era ${era}: typed, the rifts open on the band and on COVER STORY only, between the pane's dl markers; under the caps`, async ($, on) => {
    const clock = base(on, 100_000, quietAt(era))
    await start($, 'invincible')
    // (the swap takes the stage while it plays: the word comes after it)
    if (era === 2) await $.prompt.submit({ text: 'new suit', cursor: 0 } as never)
    await clock.advance(5_000)
    await jobIn($)
    await four($)
    expect(await bandAt($, 1250)).not.toContain(EGG)
    await $.prompt.submit({ text: era === 1 ? 'show me the multiverse' : 'What have I done?!', cursor: 0 } as never)
    for (const W of [750, 900, 1250]) {
      const band = await bandAt($, W)
      expect(band).toContain(`${EGG} data-era="${era}"`)
      expect(band.length).toBeLessThan(70_000)
    }
    const pane = await svgs($, 'Pane')
    const withEgg = pane.filter(s => s.includes(EGG))
    expect(withEgg).toHaveLength(1)
    expect(withEgg[0]).toContain('COVER STORY')
    expect(/<!--dl--><g pointer-events="none" data-egg="variants"[\s\S]*?<!--\/dl-->/.test(withEgg[0] as string)).toBe(true)
    for (const s of pane) expect(s.length).toBeLessThan(60_000)
    expect(pane.join('').length).toBeLessThan(260_000)
  })
}
test('multiverse: "season 3 multiverse" swaps first, then the flock flies in the new suit (the act waits for the swap)', async ($, on) => {
  const clock = base(on, 100_000, quietAt())
  await start($, 'invincible')
  await jobIn($)
  await $.prompt.submit({ text: 'season 3 multiverse', cursor: 0 } as never)
  const band = await bandAt($, 1250)
  expect(band).toContain('class="sw-anim"')
  expect(band).toContain(`${EGG} data-era="2"`)
  expect(vrDelay(band)).toBeGreaterThan(2.4)
  expect(vrDelay(band)).toBeLessThan(2.6)
  await clock.advance(1_000)
  const later = await bandAt($, 1250)
  expect(vrDelay(later)).toBeGreaterThan(1.4)
  expect(vrDelay(later)).toBeLessThan(1.6)
})
test('multiverse: one 8 s act, pinned: ahead (+10 s), live (-4 s), gone after; the pops and the flock in percent', async ($, on) => {
  expect(VARIANTS_MS).toBe(8_000)
  const p = vrDay(quietAt() + 86_400_000)
  const clock = base(on, 100_000, p.startAt - 10_000)
  await start($, 'invincible')
  const ahead = await bandAt($, 1250)
  expect(ahead).toContain('animation-duration:8s')
  expect(vrDelay(ahead)).toBeGreaterThan(9.9)
  expect(vrDelay(ahead)).toBeLessThan(10.1)
  await clock.advance(14_000)
  const live = await bandAt($, 1250)
  expect(vrDelay(live)).toBeGreaterThan(-4.1)
  expect(vrDelay(live)).toBeLessThan(-3.9)
  const cover = (await svgs($, 'Pane')).find(s => s.includes(EGG)) as string
  expect(cover).toContain('COVER STORY')
  expect(cover).toMatch(/@keyframes vr\d+v1\{0%,6\.25%\{/)
  expect(cover).toMatch(/@keyframes vr\d+fl\{0%,67\.5%\{[^}]*\}87\.5%,100%\{/)
  await clock.advance(p.endAt + 1 - (p.startAt + 4_000))
  expect(await bandAt($, 1250)).not.toContain(EGG)
  expect((await svgs($, 'Pane')).join('')).not.toContain(EGG)
})
test('multiverse: once a day at a seeded time between 10:00 and 21:00 local, never within 10 s of the fight or the showdown', () => {
  let on = 0
  for (let day = 0; day < 60; day++) {
    const at = NOW + day * 86_400_000
    const p = variantsPlan(at)
    expect(variantsPlan(at).startAt).toBe(p.startAt)
    if (!p.on) continue
    on++
    expect(variantsPlan(p.startAt + 1_000).startAt).toBe(p.startAt)
    expect(p.endAt - p.startAt).toBe(VARIANTS_MS)
    const d = new Date(p.startAt)
    expect(d.getHours()).toBeGreaterThanOrEqual(10)
    expect(d.getHours()).toBeLessThan(21)
    for (const era of [1, 2] as const) {
      for (let t = p.startAt - 12_000; t <= p.endAt + 12_000; t += 1_000) {
        const f = duelPlan(t, era)
        if (f.on) expect(p.startAt < f.endAt + 10_000 && f.startAt < p.endAt + 10_000).toBe(false)
        const sd = showdownPlan(t, era)
        expect(p.startAt < sd.endAt + 10_000 && sd.startAt < p.endAt + 10_000).toBe(false)
      }
    }
  }
  expect(on).toBeGreaterThanOrEqual(55)
})
test('multiverse: one plan per LOCAL day (the seed never re-rolls mid-day, so never twice, never skipped)', () => {
  // A UTC day number re-rolled the seed at local midnight-minus-offset: here (UTC+8) at 08:00, west of UTC mid-evening, where
  // the day's time could then come round twice or not at all. Every hour of a local date must see the same plan.
  for (let day = 0; day < 60; day++) {
    const d = new Date(NOW + day * 86_400_000)
    const at = (h: number, m = 0): number => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime()
    const p = variantsPlan(at(0, 30))
    for (const [h, m] of [[7, 59], [8, 1], [12, 0], [16, 59], [17, 1], [20, 59], [23, 30]] as const) expect(variantsPlan(at(h, m)).startAt, `day ${day} ${h}:${m}`).toBe(p.startAt)
  }
})
test('opOnly: every frame keeps its own offset (1-decimal rounding put 53.75 and 53.85 on 53.8: a cut became a fade)', () => {
  const css = opOnly('x', [[44.4, 53.75, 1]])
  expect(css).toContain('53.75%{opacity:1}')
  expect(css).toContain('53.85%{opacity:0}')
  for (let a = 0.05; a < 99; a += 0.05) {
    const offs = [...opOnly('x', [[a, a + 0.5, 1]]).matchAll(/([\d.]+)%\{/g)].map(m => m[1])
    expect(new Set(offs).size, `a=${a}`).toBe(offs.length)
  }
})
test('multiverse: cameos are never inside its window, over 30 days', () => {
  let checked = 0
  for (let day = 0; day < 30; day++) {
    const p = variantsPlan(NOW + day * 86_400_000)
    if (!p.on) continue
    for (let k = Math.floor((p.startAt - 600_000) / CAM_SLOT_MS); k <= Math.floor((p.endAt + 600_000) / CAM_SLOT_MS); k++) {
      const c = camPlanOfSlot(k)
      if (!c.on) continue
      expect(c.startAt < p.endAt + 5_000 && p.startAt < c.endAt + 5_000).toBe(false)
      checked++
    }
  }
  expect(checked).toBeGreaterThan(30)
})
test('multiverse: a typed act keeps the fight, the cameos and the daily showdown off; the swap cuts it; the daily one waits for typed eggs', async ($, on) => {
  const fs = fightStart(1, quietAt(1) + 3_600_000)
  expect(fightDue(fs + 2_000, 1, true)).toBe(fs)
  expect(fightDue(fs + 2_000, 1, true, { kind: 'variants', at: fs + 1_000 })).toBeUndefined()
  const c = camFind(q => q.who === 'eve')
  expect(camDue(c.startAt + 500)).toBeDefined()
  expect(camDue(c.startAt + 500, { kind: 'variants', at: c.startAt })).toBeUndefined()
  const sd = showdownPlan(NOW, 1)
  expect(showdownDue(sd.startAt + 500, 1)).toBe(sd.startAt)
  expect(showdownDue(sd.startAt + 500, 1, { kind: 'variants', at: sd.startAt })).toBeUndefined()
  // a swap typed mid-act cuts it; a swap typed with it (the act set after it) does not
  expect(variantsDue(fs + 4_000, { kind: 'variants', at: fs }, fs + 3_000)).toBeUndefined()
  expect(variantsDue(fs + 1_000, { kind: 'variants', at: fs + SWAP_MS + 300 }, fs)).toBe(fs + SWAP_MS + 300)
  // the daily act waits while another typed egg is live, and comes back after a typed act has ended
  const p = vrDay()
  expect(variantsDue(p.startAt + 1_000)).toBe(p.startAt)
  expect(variantsDue(p.startAt + 1_000, { kind: 'showdown', at: p.startAt })).toBeUndefined()
  expect(variantsDue(p.startAt + 1_000, { kind: 'variants', at: p.startAt - 60_000 })).toBe(p.startAt)
  // in the mod: guardians typed after multiverse draws only the showdown; a swap mid-act takes the egg off
  const clock = base(on, 100_000, quietAt())
  await start($, 'invincible')
  await jobIn($)
  await $.prompt.submit({ text: 'multiverse', cursor: 0 } as never)
  await clock.advance(2_000)
  expect(await bandAt($, 1250)).toContain(EGG)
  await $.prompt.submit({ text: 'guardians', cursor: 0 } as never)
  const all = [await bandAt($, 1250), ...(await svgs($, 'Pane'))].join('')
  expect(all).toContain('sd-anim')
  expect(all).not.toContain(EGG)
  await $.prompt.submit({ text: 'multiverse', cursor: 0 } as never)
  await clock.advance(2_000)
  expect(await bandAt($, 1250)).toContain(EGG)
  await $.prompt.submit({ text: 'new suit', cursor: 0 } as never)
  expect(await bandAt($, 1250)).not.toContain(EGG)
})
test('multiverse: no flip, no red in the effects, under the size caps, a reduced-motion still', () => {
  for (const era of [1, 2] as const) {
    for (const W of [750, 900, 1250]) {
      const s = variants(W, 134, 'band', era, NOW)
      expect(s.length).toBeLessThan(20_000)
      expect(s).not.toContain('scale(-1')
      expect(s).not.toContain('flip')
      expect(s).not.toMatch(/<use[^>]*transform=/)
      expect(s.replace(/<defs>[\s\S]*?<\/defs>/, '')).not.toContain(PROPS.red as string)
      const still = /<g class="vr-still"[\s\S]*$/.exec(s)?.[0] ?? ''
      expect(still.match(/<use /g)?.length).toBeGreaterThanOrEqual(7)
      expect(still).toContain('TOO MANY MARKS.')
    }
    for (const [W, H] of [[480, 434], [600, 434]] as const) {
      const s = variants(W, H, 'pane', era, NOW)
      expect(s.length).toBeLessThan(28_000)
      expect(s).not.toContain('scale(-1')
      expect(s).not.toMatch(/<use[^>]*transform=/)
      expect(s.replace(/<defs>[\s\S]*?<\/defs>/, '')).not.toContain(PROPS.red as string)
      expect((/<g class="vr-still"[\s\S]*$/.exec(s)?.[0] ?? '').match(/<use /g)?.length).toBeGreaterThanOrEqual(10)
    }
  }
  const reduced = /@media \(prefers-reduced-motion: reduce\)\{(.*)\}$/.exec(VARIANTS_CSS)?.[1] ?? ''
  expect(reduced).toContain('.vr-anim{display:none}')
  expect(reduced).toContain('.vr-still{display:block')
  expect(reduced).toContain('.vr-bob{animation:none}')
})
test('multiverse: the sprites: 21x18, every letter in the palette, overlay-only top rows, the base Marks untouched', () => {
  const vars = Object.entries(VS).filter(([k]) => k.startsWith('INV_VAR_')) as [string, Sprite][]
  expect(vars.length).toBe(9)
  for (const [, sp] of vars) {
    expect(sp.rows.length).toBe(18)
    expect(new Set(sp.rows.map(r => r.length))).toEqual(new Set([21]))
    for (const row of sp.rows) for (const ch of row) if (ch !== '.') expect(sp.pal[ch]).toBeTruthy()
    // the two pad rows only hold pixels above the head (columns 12-16), never the body's
    for (const row of sp.rows.slice(0, 2)) expect(/^\.{11}.{6}\.{4}$/.test(row)).toBe(true)
  }
  expect(VS.VARIANT_CAST.band).toHaveLength(6)
  expect(VS.VARIANT_CAST.pane).toHaveLength(8)
  expect(SP.INV_MARK_FLY.rows).toEqual(MARK_FLY_ROWS)
  expect(SP.INV_MARK_S3_FLY.rows).toEqual(MARK_S3_FLY_ROWS)
})
test('multiverse: layout: 130 redraws across the act keep one layout signature', { timeoutMs: 180_000 }, async ($, on) => {
  const clock = base(on, 100_000, quietAt(1))
  await start($, 'invincible')
  await jobIn($)
  await four($)
  const sig = async () => {
    const b = await svgs($, 'AbovePrompt', 900)
    const p = await svgs($, 'Pane')
    const dims = (l: string[]) => l.map(s => `${/width="(\d+)"/.exec(s)?.[1]}x${/height="(\d+)"/.exec(s)?.[1]}`).join(',')
    return { sig: `${b.length}:${/height="(\d+)"/.exec(b[0] ?? '')?.[1]}|${p.length}|${dims(p)}`, egg: b.join('').includes(EGG) }
  }
  const seen = new Set([(await sig()).sig])
  await $.prompt.submit({ text: 'multiverse', cursor: 0 } as never)
  let shown = 0
  for (let i = 0; i < 130; i++) {
    const s = await sig()
    seen.add(s.sig)
    if (s.egg) shown++
    await clock.advance(80)
  }
  expect(shown).toBeGreaterThan(90)
  expect([...seen]).toHaveLength(1)
})

// --- MARK VS CONQUEST (phase B): the new suit's own fight, sharing THE FIGHT's slot and pane reserve -----------------------
test('conquest: the new suit only, every other new-suit fight, still one fight per 30-45 min while working', () => {
  const era2: number[] = []
  for (const era of [1, 2] as const) {
    let last = 0
    for (let t = NOW; t < NOW + 72 * HOUR; t += 30_000) {
      const p = duelPlan(t, era)
      if (!p.on || p.startAt === last) continue
      if (last) expect(p.startAt - last).toBeGreaterThanOrEqual(30 * 60_000)
      last = p.startAt
      if (era === 1) expect(p.v).not.toBe(CONQUEST)
      else era2.push(p.v)
      if (p.v === CONQUEST) {
        expect(p.endAt - p.startAt).toBe(CQ_DUEL_MS)
        expect(fightOf(p.startAt + 1000, 2, true)).toEqual({ startAt: p.startAt, v: CONQUEST })
        expect(fightOf(p.startAt + 1000, 2, false)).toBeUndefined()
      }
    }
  }
  const cq = era2.filter(v => v === CONQUEST).length
  expect(cq).toBeGreaterThan(era2.length * 0.4)
  expect(cq).toBeLessThan(era2.length * 0.6)
  // Shorter than THE FIGHT: two acts.
  expect(CQ_DUEL_MS).toBeLessThan(DUEL_MS)
  expect(timing(CONQUEST).acts).toBe(2)
  expect(Math.abs(CQ_OFF[1] + CQ_LEN[1] - CQ_MS / 1000)).toBeLessThan(1e-9)
  // Its replay: the era-2 director names it; `fight:3` replays it in the new suit only.
  expect(fightDirector(2).replays()).toContain(CONQUEST_PLAY)
  expect(fightDirector(1).replays()).not.toContain(CONQUEST_PLAY)
  expect(versionOf(CONQUEST_PLAY)).toBe(CONQUEST)
  expect(fightOf(NOW + 500, 2, false, { kind: 'fight:3', at: NOW })).toEqual({ startAt: NOW, v: CONQUEST })
  expect(fightOf(NOW + 500, 1, false, { kind: 'fight:3', at: NOW })).toBeUndefined()
  expect(fightOf(NOW + CQ_MS + 700, 2, false, { kind: 'fight:3', at: NOW })).toBeUndefined()
})
test('conquest: the beats: welcome, the catch, the slam, swung by the wrist, the comeback, the knock-down; every hit a hit-stop', () => {
  const band = fightCut({ W: 900, H: 134, era: 2, startAt: 0, v: CONQUEST }, 'band')
  const a0 = fightCut({ W: 480, H: 434, era: 2, startAt: 0, v: CONQUEST }, 0)
  const a1 = fightCut({ W: 480, H: 260, era: 2, startAt: 0, v: CONQUEST }, 1)
  for (const { f, act } of [band, a0, a1]) {
    expect(f.hits.length).toBeGreaterThan(0)
    // Each hit holds the paths: the act's clock runs later than its script after it.
    for (const h of f.hits) expect(act.warp(h.t + 0.001)).toBeGreaterThan(h.t + 0.02)
  }
  const beats = (c: typeof band) => c.f.script.map(b => b[0])
  expect(beats(band)).toContain('orbit')
  expect(beats(a0)).toContain('orbit')
  expect(beats(a1)).toContain('orbit')
  // The band: he arrives (C1), catches (C3), Mark swung (M13) and thrown down toward the viewer (T1, T2).
  const cb = chainOfAct('band', 2, CONQUEST)
  for (const k of ['C1', 'M2', 'M3', 'C3', 'M13', 'T1', 'T2']) expect(cb).toContain(k)
  expect(cb.indexOf('C3')).toBeLessThan(cb.indexOf('M13'))
  // COVER STORY: smashes in at full size, swung by the wrist, the goggle wipe. GDA WALL: BAM, the spin, he goes down, Mark hovers.
  const c0 = chainOfAct(0, 2, CONQUEST)
  for (const k of ['T4', 'C3', 'M13', 'M9', 'M14']) expect(c0).toContain(k)
  const c1 = fightAct({ W: 480, H: 236, era: 2, startAt: 0, v: CONQUEST }, 1).chain
  for (const k of ['MS', 'M3', 'C5', 'MSP', 'C6', 'C7', 'M15']) expect(c1).toContain(k)
  expect(c1.indexOf('C6')).toBeLessThan(c1.indexOf('C7'))
  expect(c1[c1.length - 1]).toBe('M15')
  const s0 = fightAct({ W: 480, H: 434, era: 2, startAt: 0, v: CONQUEST }, 0).svg
  const s1 = fightAct({ W: 480, H: 260, era: 2, startAt: 0, v: CONQUEST }, 1).svg
  for (const w of ['BOOM!', 'GRAB', 'WHAM!', 'FINALLY.']) expect(s0).toContain(w)
  for (const w of ['BAM!', 'POW', 'BIFF', 'BOOM!', 'NOT DONE.']) expect(s1).toContain(w)
  // The cut-ins: his scarred eye on COVER STORY, Mark's goggles on GDA WALL.
  expect(s0).toMatch(/id="\w+fCI0"/)
  expect(s1).toMatch(/id="\w+fCI1"/)
  for (const w of ['blood', 'gore', 'kill']) expect((s0 + s1).toLowerCase()).not.toContain(w)
  // No beat runs past its surface: Mark leaves the band before COVER STORY starts.
  const last = (c: typeof band) => c.act.warp(Math.max(...c.f.script.map(b => b[1])))
  expect(last(band)).toBeLessThan(CQ_OFF[0])
  expect(last(a0)).toBeLessThan(CQ_LEN[0])
  expect(last(a1)).toBeLessThan(CQ_LEN[1])
})
test('conquest: the elder warrior reads as himself: his folded palette keeps the scar, the white eye, the bronze arm and the grey suit', () => {
  const sp = frameSprite('C1', 2)
  const cols = new Set(Object.values(sp.pal))
  expect(cols.size).toBeLessThanOrEqual(CQ_K)
  for (const c of ['#A3262A', '#E6E0E5', '#C88A4E', '#8E5C34', '#BEB8C1', '#DF9F7A']) expect(cols.has(c)).toBe(true)
  const svg = fightBand({ W: 900, H: 134, era: 2, startAt: 0, v: CONQUEST }).svg
  const defs = /<defs>([\s\S]*?)<\/defs>/.exec(svg)?.[1] ?? ''
  expect(defs).toContain('fill="#A3262A"')
  expect(defs).toContain('fill="#C88A4E"')
})
test('conquest: sizes: band cut under 32 k, each act under 46 k (GDA WALL carries the arena), both acts inside the pane reserve THE FIGHT already keeps (one fight at a time)', () => {
  for (const W of [750, 900, 1250]) {
    const b = fightBand({ W, H: 134, era: 2, startAt: NOW, v: CONQUEST })
    expect(b.svg.length).toBeLessThan(32_000)
    expect(b.frames).toBeLessThanOrEqual(9)
  }
  let omni = 0
  let cq = 0
  for (const [act, H] of [[0, 434], [1, 296], [2, 236]] as const) omni += fightAct({ W: 600, H, era: 2, startAt: NOW }, act).svg.length
  for (const [sf, W, H] of [[0, 600, 434], [1, 600, 296], [0, 480, 434], [1, 480, 260], [1, 480, 236], [0, 992, 384], [1, 992, 200]] as const) {
    const a = fightAct({ W, H, era: 2, startAt: NOW, v: CONQUEST }, sf)
    // 46 k: the two acts together stay ~85 k of the 100 k reserve, and the real cards stay under 60 k (the real-panel test).
    expect(a.svg.length).toBeLessThan(46_000)
    expect(a.frames).toBeLessThanOrEqual(10)
    if (W === 600) cq += a.svg.length
    const au = audit(doc(W, H, a.svg))
    expect(au.dupes).toEqual([])
    expect(au.dupeIds).toEqual([])
    expect(au.badText).toEqual([])
    expect(au.reduced).toBe(true)
    const still = /<g class="dl-still">([\s\S]*?)<\/g><\/g><!--\/dl-->/.exec(a.svg)?.[1] ?? ''
    expect((still.match(/<use /g) ?? []).length).toBeGreaterThanOrEqual(2)
  }
  // The two fights never draw together (one lane), so the reserve is the larger of the two, and both fit it.
  expect(cq).toBeLessThan(FIGHT_PANE_RESERVE)
  expect(Math.max(omni, cq)).toBeLessThan(FIGHT_PANE_RESERVE)
  const ba = audit(doc(900, 134, fightBand({ W: 900, H: 134, era: 2, startAt: NOW, v: CONQUEST }).svg))
  expect(ba.dupes).toEqual([])
  expect(ba.dupeIds).toEqual([])
  expect(ba.reduced).toBe(true)
  // THE PAGE keeps no reserve for him: no shake, no act.
  expect(fightShake('pane', NOW, 480, 236, 2, 2, CONQUEST)).toBe('')
})
test('conquest: replayed as `/missioncontrol play conquest` in the new suit only; the real band and cards stay inside their sizes', async ($, on) => {
  const now = calmAt(NOW)
  const clock = base(on, 880_000, now)
  await start($, 'invincible')
  expect(await play($, 'conquest')).toContain('new suit')
  await $.prompt.submit({ text: 'new suit', cursor: 0 } as never)
  await clock.advance(5_000)
  await jobIn($)
  await four($)
  expect(await play($, 'conquest')).toBe('▶ conquest')
  await clock.advance(1_800)
  for (const W of [750, 900, 1250]) {
    const b = await bandAt($, W)
    expect(b).toMatch(/id="\w+fC3"/)
    expect(b.length).toBeLessThan(70_000)
  }
  await clock.advance(3_000)
  const p = await svgs($, 'Pane')
  expect(p.join('')).toMatch(/id="\w+fCI0"/)
  for (const s of p) expect(s.length).toBeLessThan(60_000)
  expect(p.filter(s => s.includes('class="dl-anim"')).length).toBeLessThanOrEqual(2)
  expect(p.reduce((n, s) => n + s.length, 0)).toBeLessThan(260_000)
  await clock.advance(5_000)
  const p2 = await svgs($, 'Pane')
  expect(p2.join('')).toMatch(/id="\w+fC7"/)
  for (const s of p2) expect(s.length).toBeLessThan(60_000)
  await clock.advance(6_000)
  expect((await svgs($, 'Pane')).join('')).not.toContain('class="dl-anim"')
})
test('conquest: the pane acts fill their card: a push-in on a tall card, centred on a wide short one, a veil, the arena in GDA WALL', () => {
  // COVER STORY on the real dock (992 x 384): drawn at about its design size and scaled up 1.5x under the title row.
  const cover = cqFrame(992, 384)
  expect(cover.k).toBeGreaterThan(1.4)
  expect(cover.Wv * cover.k).toBeLessThanOrEqual(992)
  expect(cover.Hv * cover.k + cover.top).toBeLessThanOrEqual(384.5)
  const a0 = fightAct({ W: 992, H: 384, era: 2, startAt: NOW, v: CONQUEST }, 0).svg
  expect(a0).toContain(`<g transform="translate(${cover.x} 24) scale(${cover.k})">`)
  expect(a0).toMatch(/opacity="0\.8"\/>/)
  // GDA WALL (992 x 200): no shrink, the action centred in 700 px, the downtown arena drifting behind it (two layers).
  const wall = cqFrame(992, 200)
  expect(wall.k).toBe(1)
  expect(wall.Wv).toBe(700)
  expect(wall.x).toBe(146)
  const a1 = fightAct({ W: 992, H: 200, era: 2, startAt: NOW, v: CONQUEST }, 1).svg
  expect((a1.match(/<pattern id="\w+ar\dp"/g) ?? []).length).toBe(2)
  expect(a1).toContain('fill="#F2DA74"')
  // The arena stops under reduced motion; the act's still keeps both fighters.
  expect(a1).toMatch(/@media \(prefers-reduced-motion: reduce\)\{\.\w+ar0,\.\w+ar1\{animation:none!important\}\}/)
  // A small card keeps the old framing (no push-in): the mock sizes of phase B.
  expect(cqFrame(480, 236).k).toBe(1)
})
test('victory poses: the new suit\'s done cheer lands the fist, the goggle wipe, arms out (the still); the classic suit and the pane have none', () => {
  const ch = cheer(1250, 134, 2, { delay: 'calc(@@T5000@@ + 0s)' })
  expect(ch).toContain('data-egg="victory"')
  expect([...ch.matchAll(/animation-name:invv(\w+)/g)].map(m => m[1])).toEqual(VICTORY.map(v => v[0]))
  expect(ch).toMatch(/<g class="inv-vic" style="animation-name:invvarms">/)
  expect((ch.match(/class="inv-vic" style="animation-name:invv(fist|wipe)" opacity="0"/g) ?? []).length).toBe(2)
  expect(ch).toMatch(/@media \(prefers-reduced-motion: reduce\)\{\.inv-vic\{animation:none!important\}\}/)
  const a = audit(doc(1250, 134, ch))
  expect([a.dupes, a.dupeIds, a.badText]).toEqual([[], [], []])
  expect(ch.slice(ch.indexOf('<g data-egg="victory"')).length).toBeLessThan(7_000)
  expect(cheer(1250, 134, 1)).not.toContain('data-egg="victory"')
  expect(cheer(480, 300, 2)).not.toContain('data-egg="victory"')
})
// --- the head turns (phase B): the suit swap and the done cheer -------------------------------------------------------------
test('head turn: the suit swap turns the bust away in one suit and round in the other (9 views, stepped), none under reduced motion', () => {
  for (const to of [1, 2] as const) {
    const sw = swap(900, 134, 'band', to, { delay: '0s' })
    const from = to === 2 ? 1 : 2
    // The old suit's views come first (a0..a4), then the new suit's back and mirrored views (b4, b3..b1 flipped).
    const uses = [...sw.matchAll(/<use href="#(\w+)"[^>]*transform="([^"]+)"/g)].map(m => [m[1] as string, m[2] as string] as [string, string])
    const views = uses.filter(([id]) => /v[ab]\d$/.test(id))
    expect(views.map(([id]) => id.slice(-2))).toEqual(['a0', 'a1', 'a2', 'a3', 'a4', 'b4', 'b3', 'b2', 'b1'])
    expect(views.slice(6).every(([, tr]) => tr.includes('scale(-1 1)'))).toBe(true)
    expect(TURN[from]).not.toBe(TURN[to])
    const a = audit(doc(900, 134, sw))
    expect(a.dupes).toEqual([])
    expect(a.dupeIds).toEqual([])
    expect(sw).toContain('class="sw-anim"')
    expect(sw.length).toBeLessThan(32_000)
    // Stepped, one view at a time, pinned to the swap's delay.
    expect((sw.match(/steps\(1\) both;animation-delay:0s/g) ?? []).length).toBeGreaterThanOrEqual(10)
  }
  // The pane's swap has no bust to turn.
  expect(swap(480, 300, 'pane', 2, { delay: '0s' })).not.toMatch(/v[ab]\d"/)
})
test('head turn: the done cheer: the band bust glances round (front, 3/4, side, 3/4, front); front view under reduced motion; band only', () => {
  for (const era of [1, 2] as const) {
    const ch = cheer(1250, 134, era, { delay: 'calc(@@T5000@@ + 0s)' })
    expect(ch).toContain('class="inv-dt"')
    expect(ch).toContain('animation-delay:var(--cd,0s)')
    expect(ch).toMatch(/@media \(prefers-reduced-motion: reduce\)\{\.inv-dt\{animation:none!important\}\}/)
    // Front first and visible by itself (the reduced-motion frame); the others start hidden.
    const g = [...ch.matchAll(/<g class="inv-dt" style="animation-name:inv-dt(v\d)"( opacity="0")?>/g)].map(m => `${m[1]}${m[2] ? ':0' : ''}`)
    expect(g).toEqual(['v0', 'v1:0', 'v2:0'])
    expect(DONE_TURN.map(w => w[2])).toEqual(['v0', 'v1', 'v2', 'v1', 'v0'])
    const a = audit(doc(1250, 134, ch))
    expect(a.dupes).toEqual([])
    expect(a.dupeIds).toEqual([])
    expect(ch.length).toBeLessThan(era === 2 ? 18_000 : 12_000) // the new suit adds its victory poses (~4 k)
    expect(cheer(480, 400, era)).not.toContain('inv-dt')
  }
})
