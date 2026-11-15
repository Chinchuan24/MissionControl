import { expect, test } from 'claude-code/testing'
import { CL_CSS, CLACK_CSS, CLAWOFF, CLAWOFF_MS, CRAB_SWITCH, DEFAULT_SWITCH, FRESH_MS, bubbles, checkMark, clawOff, crabDirector, riseInto, scuttle, shake } from './classics'
import { CAL_CSS, bezel, calGauge, calPal, dial, fineOff, needleAngle, ruler, vernier } from './caliper'
import { readoutCard } from './caliper-cards'
import { CAL_FRESH_MS, calForget, calSeen } from './caliper-theme'
import { crabPose } from './cast'
import { phased } from './smooth'
import { audit } from './stage/budget'
import { playsOf } from './stage/replay'
import { THEMES } from './themes'

const NOW = Date.parse('2026-10-20T10:00:00Z')
const MIN = 60_000
const CARD = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="80" viewBox="0 0 300 80"><text x="10" y="20">42%</text></svg>'
const FACES = ['dark', 'light'] as const
const hexes = (s: string): string[] => [...new Set(s.match(/#[0-9A-Fa-f]{6}\b/g) ?? [])]

// ---------------------------------------------------------------- Default + Crab Classic: fires once
test('classics: the done check draws itself once, pinned to the done time, then rests plain', () => {
  const fresh = checkMark(10, 10, '#3B9C5F', NOW, NOW + 100)
  expect(fresh).toContain('class="cl-chk"')
  expect(phased(fresh, NOW + 100)).toContain('animation-delay:-0.1s')
  // a later redraw resumes it further along, never restarts it
  expect(phased(checkMark(10, 10, '#3B9C5F', NOW, NOW + 200), NOW + 200)).toContain('animation-delay:-0.2s')
  // long after: no animation at all (a redraw cannot replay it)
  expect(checkMark(10, 10, '#3B9C5F', NOW, NOW + FRESH_MS + 1)).not.toContain('cl-chk')
  expect(checkMark(10, 10, '#3B9C5F')).not.toContain('cl-chk')
})

test('classics: pane cards rise in once on open, cascading; a redraw resumes, a stale open draws them plain', () => {
  const a = riseInto(CARD, NOW, 0, NOW + 50)
  const b = riseInto(CARD, NOW, 3, NOW + 50)
  expect(a).toContain('class="cl-rise"')
  expect(audit(a).dupes).toEqual([])
  expect(phased(a, NOW + 50)).toContain('animation-delay:-0.05s')
  expect(phased(b, NOW + 50)).toContain('animation-delay:0.07s')
  // the numbers are still in the card, untouched
  expect(a).toContain('<text x="10" y="20">42%</text>')
  expect(riseInto(CARD, NOW, 0, NOW + FRESH_MS + 10)).toBe(CARD)
  // budget: an entrance under 1 k a card
  expect(a.length - CARD.length).toBeLessThan(1000)
})

test('classics: a failed pill shakes once (pinned), a crab scuttles in at its spawn and out when it ends', () => {
  expect(shake('<rect/>', NOW, NOW + 10)).toContain('cl-shk')
  expect(shake('<rect/>', NOW, NOW + FRESH_MS + 1)).toBe('<rect/>')
  expect(shake('<rect/>', undefined, NOW)).toBe('<rect/>')
  expect(scuttle('<g/>', { startedAt: NOW, running: true }, NOW + 100)).toContain('cl-in')
  // Never ahead of its spawn: a crab whose clock runs a little ahead is drawn plain, never held invisible.
  expect(scuttle('<g/>', { startedAt: NOW + 400, running: true }, NOW)).toBe('<g/>')
  expect(scuttle('<g/>', { startedAt: NOW - 10 * MIN, running: true }, NOW)).toBe('<g/>')
  expect(scuttle('<g/>', { startedAt: NOW - MIN, endedAt: NOW, running: false }, NOW + 100)).toContain('cl-out')
})

test('classics: reduced motion stops every reaction on its resting look; no filter animates, nothing loops', () => {
  for (const c of ['cl-chk', 'cl-rise', 'cl-shk', 'cl-in', 'cl-out']) expect(/prefers-reduced-motion: reduce\)\{([^}]*)\}/.exec(CL_CSS)?.[1]).toContain(c)
  expect(CLACK_CSS).toContain('prefers-reduced-motion: reduce')
  for (const css of [CL_CSS, CLACK_CSS]) {
    expect(css).not.toContain('infinite')
    expect(css).not.toMatch(/filter/)
  }
})

// ---------------------------------------------------------------- Crab Classic: the cheer and the claw-off
test('crab: the code poses are 30 by 28 crabs; the bubbles and the claw-off are clean, small and have a still frame', () => {
  for (const p of ['idle', 'up', 'pinch', 'nip', 'salute', 'boss'] as const) {
    const sp = crabPose(p)
    expect(sp.rows.length).toBe(28)
    expect(sp.rows.every(r => r.length === 30)).toBe(true)
  }
  const b = bubbles(900, 124, 22, 18, 1.05, NOW)
  expect(audit(b).dupes).toEqual([])
  expect(audit(b).chars).toBeLessThan(3000)
  const ring = { x0: 200, x1: 600, y0: 54, y1: 80 }
  const duel = clawOff(1002, 124, ring, NOW)
  const a = audit(duel)
  expect(a.dupes).toEqual([])
  expect(a.dupeIds).toEqual([])
  expect(a.badText).toEqual([])
  expect(a.reduced).toBe(true)
  // a small act: under a third of a fight band's 32 k
  expect(a.chars).toBeLessThan(16_000)
  // clipped to its ring: nothing it draws reaches a readout outside it
  expect(duel).toMatch(new RegExp(`<rect x="${ring.x0}" y="${ring.y0}" width="${ring.x1 - ring.x0}" height="${ring.y1 - ring.y0}"/>`))
  expect(duel).toContain('clk!')
})

test('crab: the claw-off is rare (30-45 min apart), only while working, and has a replay name', () => {
  const dir = crabDirector(NOW)
  expect(dir.replays()).toContain(CLAWOFF)
  const day = dir.plan(NOW, NOW + 24 * 60 * MIN, { working: true })
  expect(day.length).toBeGreaterThan(20)
  expect(day.length).toBeLessThanOrEqual(48)
  for (let i = 1; i < day.length; i++) expect((day[i] as { startAt: number }).startAt - (day[i - 1] as { startAt: number }).startAt).toBeGreaterThanOrEqual(30 * MIN - CLAWOFF_MS)
  expect(dir.plan(NOW, NOW + 24 * 60 * MIN, { working: false }).length).toBe(0)
  expect(dir.play(CLAWOFF, NOW)?.endAt).toBe(NOW + CLAWOFF_MS)
})

test('classics: the switch flavours stay subtle (no shards, a see-through veil)', () => {
  for (const f of [DEFAULT_SWITCH, CRAB_SWITCH, THEMES.caliper.switchFlavour ?? {}]) {
    expect(f.shards ?? 0).toBe(0)
    expect(f.veil ?? 0.55).toBeLessThanOrEqual(0.5)
  }
})

// ---------------------------------------------------------------- Caliper
test('caliper: the needle swings from the old value, overshoots and settles (pinned); unchanged, it has no settle', () => {
  const P = calPal('dark')
  const set = dial(P, 37, 56, 60, true, { was: { from: 20, at: NOW } })
  expect(set).toContain('class="cal-set"')
  const d = needleAngle(20) - needleAngle(60)
  expect(set).toContain(`--a:${Math.round(d * 100) / 100}deg`)
  expect(set).toContain('--o:4deg')
  expect(set).toContain('cal-needle')
  expect(dial(P, 37, 56, 60, true)).not.toContain('cal-set')
  expect(audit(set).dupes).toEqual([])
})

test('caliper: the knurled bezel turns only while working, stepped, under a fixed light; both faces keep their own colours', () => {
  for (const face of FACES) {
    const P = calPal(face)
    const other = calPal(face === 'dark' ? 'light' : 'dark')
    const work = bezel(P, 37, 56, 16.5, true, 'b1')
    expect(work).toContain('cal-knurl')
    expect(bezel(P, 37, 56, 16.5, false, 'b1')).not.toContain('cal-knurl')
    const own = new Set(Object.values(P).flat().map(c => String(c).toUpperCase()))
    for (const h of hexes(dial(P, 37, 56, 40, true, { bezel: true, was: { from: 10, at: NOW } }))) expect(own.has(h.toUpperCase())).toBe(true)
    // nothing of the other face leaks in
    const foreign = hexes(readoutCard(700, 'Job', true, 3, 6, [], face, [], { dialWas: { from: 0, at: NOW }, rulerWas: { from: 0, at: NOW }, zeroAt: NOW })).filter(h => !own.has(h.toUpperCase()))
    expect(foreign.filter(h => Object.values(other).flat().map(c => String(c).toUpperCase()).includes(h.toUpperCase()))).toEqual([])
  }
  expect(/\.cal-knurl\{animation:cal-kn [^}]*steps\(4\)/.test(CAL_CSS)).toBe(true)
})

test('caliper: the vernier slide and the colour fade now run, pinned, and never replay on a redraw', () => {
  const P = calPal('light')
  const v = vernier(P, 100, 20, true, true, NOW)
  expect(v).toContain('class="cal-vern"')
  expect(phased(v, NOW + 300)).toContain('animation-delay:-0.3s')
  expect(vernier(P, 100, 20, true, true)).not.toContain('cal-vern')
  const party = calGauge(P, 10, 10, 400, 100, { party: true, partyAt: NOW })
  expect(party).toContain('cal-vern')
  expect(party).toContain('cal-glint')
  // the old transition (which could never run) is gone; a fade is a pinned keyframe from the old colour
  expect(CAL_CSS).not.toContain('transition')
  const foot = THEMES.caliperlight.slim?.foot as (W: number, H: number, t: never, c: { ctxPct: number; overBudget: boolean; isWorking?: boolean; party?: boolean; at?: number }) => string
  calForget()
  foot(900, 132, undefined as never, { ctxPct: 1, overBudget: false, isWorking: true, at: NOW })
  const faded = foot(900, 132, undefined as never, { ctxPct: 1, overBudget: false, party: true, at: NOW + 100 })
  expect(faded).toContain('cal-fade')
  expect(faded).toContain(`--from:${P.accent}`)
  expect(foot(900, 132, undefined as never, { ctxPct: 1, overBudget: false, party: true, at: NOW + CAL_FRESH_MS + 200 })).not.toContain('cal-fade')
  calForget()
})

test('caliper: the parallax fine scale tracks progress at twice the cursor, and slides only on a change', () => {
  const P = calPal('dark')
  expect(fineOff(100)).toBe(200 % 9)
  const still = ruler(P, 10, 20, 400, 50, { fine: { id: 'f1' } })
  expect(still).toContain('pattern id="f1"')
  expect(still).not.toContain('cal-par')
  const moved = ruler(P, 10, 20, 400, 50, { fine: { id: 'f1', was: { from: 150, at: NOW } } })
  expect(moved).toContain('cal-par')
  expect(audit(moved).dupeIds).toEqual([])
  calForget()
  expect(calSeen('k', 1, NOW)).toBeUndefined()
  expect(calSeen('k', 2, NOW + 10)).toEqual({ from: 1, at: NOW + 10 })
  expect(calSeen('k', 2, NOW + CAL_FRESH_MS + 20)).toBeUndefined()
  calForget()
})

test('caliper: every new class has its reduced-motion rule; nothing filters; the band at rest has no loop but the hunt', () => {
  const rule = /prefers-reduced-motion: reduce\)\{([^}]*)\}/.exec(CAL_CSS)?.[1] ?? ''
  for (const c of ['cal-vt', 'cal-fade', 'cal-set', 'cal-knurl', 'cal-par', 'cal-glint']) expect(CAL_CSS.includes(`.${c}`) && (rule.includes(c) || CAL_CSS.includes(`.${c}{display:none}`))).toBe(true)
  expect(CAL_CSS).not.toMatch(/filter/)
  // an idle dial: no animated class at all
  const idle = dial(calPal('dark'), 37, 56, 0, false, { bezel: true })
  expect(idle).not.toMatch(/class="cal-/)
})

test('replays: every new act has a name in the shared registry', () => {
  expect(playsOf('caliper').map(p => p.name)).toEqual(expect.arrayContaining(['zero', 'settle']))
})
