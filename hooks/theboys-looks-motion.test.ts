// The Boys, motion phase A, the band's looks: the bust breathes and blinks in every look, SOLID GOLD's tape rolls about every 2 min
// and its bulbs chase, Soldier Boy's shield turns on the gauge, NOIR is a silent picture (stepped grain, letterbox, quiet labels),
// and leaving a hidden look plays its own turn (back on ice, The End). Idle motion is stepped; filters never animate at rest.
import { expect, test } from 'claude-code/testing'
import { CSS, LIDS, TRACK_MS, approval, bulbs, figure, filmLook, gauge, shieldHero, syringe, trackAt, trackOfSlot, vhsRoll } from './theboys'
import type { Mode } from './theboys'
import { noteTurn, resetLooks, turnAt, turnLayer } from './theboys-theme'
import { audit } from './stage/budget'
import { phased } from './smooth'

const LOOKS: Mode[] = ['brand', 'book', 'gold', 'noir']
const T0 = new Date(2026, 9, 20, 10, 0, 0).getTime()

test('looks: the bust breathes and blinks in all four looks (stepped loops, still under reduced motion)', () => {
  for (const m of LOOKS) {
    const f = figure(m, T0)
    expect(f).toContain('data-egg="breath"')
    expect(f).toContain('data-egg="blink"')
    expect(LIDS[m].eyes.length).toBe(2)
  }
  expect(CSS).toMatch(/\.tb-br\{animation:tb-br [\d.]+s steps\(1\) infinite\}/)
  expect(CSS).toMatch(/\.tb-lid\{opacity:0;animation:tb-lid [\d.]+s steps\(1\) infinite\}/)
  // Reduced motion stops both (the lids then stay at opacity 0: eyes open).
  const rm = CSS.slice(CSS.indexOf('prefers-reduced-motion'))
  expect(rm).toContain('.tb-br')
  expect(rm).toContain('.tb-lid')
})

test('SOLID GOLD: the tracking roll about every 2 min, pinned, no colour split; the bulbs chase (translate in steps)', () => {
  // Rolls are 90-150 s apart and last 1.2 s.
  const starts = Array.from({ length: 40 }, (_, n) => trackOfSlot(Math.floor(T0 / TRACK_MS) + n))
  for (let i = 1; i < starts.length; i++) {
    const gap = (starts[i] as number) - (starts[i - 1] as number)
    expect(gap).toBeGreaterThanOrEqual(90_000)
    expect(gap).toBeLessThanOrEqual(150_000)
  }
  const t = starts[3] as number
  const roll = vhsRoll(898, 148, t + 300)
  expect(roll).toContain('data-egg="vhs"')
  expect(roll).toContain(`@@T${t}@@`)
  expect(roll).toContain('TRACKING')
  expect(roll).not.toMatch(/feTurbulence|feOffset|feColorMatrix|mix-blend/)
  expect(trackAt(t + 300)).toBe(t)
  // Between two rolls (more than the 75 s look-ahead away) nothing is drawn.
  const mid = t + 2_000
  if ((starts[4] as number) - mid > 75_000) expect(vhsRoll(898, 148, mid)).toBe('')
  expect(audit(phased(`<svg xmlns="http://www.w3.org/2000/svg" width="898" height="148">${roll}</svg>`, t)).dupes).toEqual([])
  const b = bulbs(20, 10, 300, 'gold', T0)
  expect(b).toContain('class="tb-chase"')
  expect(b).not.toContain('tb-run')
  expect(CSS).toMatch(/\.tb-chase\{animation:tb-chase [\d.]+s steps\(\d\) infinite\}@keyframes tb-chase\{to\{transform:translateX\(\d+px\)\}\}/)
})

test('SOLID GOLD: Soldier Boy’s shield turns on the gauge while a job works (8 views from 5), the front at rest; small', () => {
  const on = shieldHero(100, 60, true)
  const off = shieldHero(100, 60, false)
  expect(on).toContain('data-egg="shield"')
  expect(on).toContain('infinite')
  expect(off).not.toContain('infinite')
  expect(on).toContain('prefers-reduced-motion')
  expect(on.length).toBeLessThan(9_000)
  // It sits at the right end of SOLID GOLD's VU meter (the syringe's slot), only there.
  expect(syringe(64, 64, 400, 40, 'gold', { working: true })).toContain('data-egg="shield"')
  expect(syringe(64, 64, 400, 40, 'brand', { working: true })).not.toContain('data-egg="shield"')
})

test('NOIR: a silent picture (stepped grain tile, letterbox, vignette, no animated filter) and quiet labels', () => {
  const f = filmLook(898, 148)
  expect(f).toContain('data-egg="film"')
  expect(f).toContain('<pattern id="tbgr"')
  expect(f).not.toMatch(/feTurbulence|<filter/)
  expect(CSS).toMatch(/\.tb-grain\{animation:tb-grain [\d.]+s steps\(1\) infinite\}/)
  expect(f.length).toBeLessThan(4_000)
  const a = approval(20, 30, 64, 'noir', true)
  expect(a).not.toMatch(/APPROVAL|HOMETEAMERS|STARLIGHTERS/)
  expect(a).toContain('…')
  const g = gauge(700, 60, false, 0, 7, 'noir').svg
  expect(g).toContain('data-egg="roster"')
  expect(g).not.toMatch(/ROSTER|SEATS VACANT|PAYBACK|DIRT/)
  // The other looks keep their words.
  expect(approval(20, 30, 64, 'brand', true)).toMatch(/HOMETEAMERS|APPROVAL/)
})

test('leaving a hidden look: back on ice (gold -> brand), The End (noir -> brand), the iris into NOIR; once, pinned, see-through', () => {
  resetLooks()
  noteTurn('gold', 'brand', T0 + 2_000)
  const ice = turnAt(T0 + 2_500)
  expect(ice?.from).toBe('gold')
  const band = turnLayer(898, 148, ice as never, 'band')
  expect(band).toContain('BACK ON ICE')
  expect(band).toContain(`@@T${T0 + 2_000}@@`)
  expect(band).toContain('prefers-reduced-motion')
  expect(audit(phased(`<svg xmlns="http://www.w3.org/2000/svg" width="898" height="148">${band}</svg>`, T0)).dupes).toEqual([])
  expect(turnAt(T0 + 2_000 + 10_000)).toBeUndefined()
  resetLooks()
  noteTurn('noir', 'brand', T0 + 1_000)
  const end = turnLayer(898, 148, turnAt(T0 + 1_200) as never, 'band')
  expect(end).toContain('The End')
  resetLooks()
  noteTurn('brand', 'noir', T0 + 1_000)
  expect(turnLayer(480, 200, turnAt(T0 + 1_100) as never, 'pane', 'cred').length).toBeGreaterThan(0)
  // An ordinary swap (ON BRAND <-> OFF BOOK) is not a turn: it keeps its own SIGNAL HIJACKED layer.
  resetLooks()
  noteTurn('brand', 'book', T0 + 1_000)
  expect(turnAt(T0 + 1_100)).toBeUndefined()
  for (const [W, H, s] of [[898, 148, 'band'], [480, 300, 'pane']] as const) {
    resetLooks(); noteTurn('gold', 'brand', T0 + 500)
    expect(turnLayer(W, H, turnAt(T0 + 600) as never, s).length).toBeLessThan(s === 'band' ? 8_000 : 5_000)
  }
  resetLooks()
})
