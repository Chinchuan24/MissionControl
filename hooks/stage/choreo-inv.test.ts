// The proof that the beat language can write a real fight: Invincible's COVER STORY act, "The Catch" (combo A of THE
// FIGHT v1, then hand-keyed), written as beats. THE FIGHT v2 (invincible-fight.ts) is now written on choreo itself; this
// demo stays as the small worked example of the beat language.
import { expect, test } from 'claude-code/testing'
import { PROPS } from '../invincible'
import type { Era } from '../invincible'
import { fightAct, frameInfo, frameSprite } from '../invincible-fight'
import { audit, BUDGET, doc } from './budget'
import { Camera } from './camera'
import { Fight } from './choreo'
import { Act } from './timeline'

const KEYS = ['O2', 'O3', 'O4', 'O7', 'M1', 'M2', 'M3', 'M8', 'M9', 'M10']
/** "The Catch" in beats, on a W x H card from `at`. Positions are the original's. */
export const catchCut = (at: number, era: Era = 1, W = 480, H = 434): { layer: string; svg: string; f: Fight; act: Act } => {
  const act = new Act({ id: 'choreo-catch', ms: 4900, at, W, H, K: 5 })
  for (const k of KEYS) act.cast(k, frameSprite(k, era), frameInfo(k).ax)
  const sc = 1.9
  const yc = Math.round(H * 0.42)
  const ox = Math.round(W * 0.72)
  const mx = Math.round(W * 0.28)
  const hit = ox - 34 * sc
  const gy = yc + 70
  const cam = new Camera(act)
  const f = new Fight(act, { sc, ink: PROPS.ink, star: { core: '#FFFFFF', star: '#FFE066', ring: '#9FE8FF' }, spark: '#FFE9A8', word: '#FFE066', dust: '#FFFFFF' }, cam)
  f.fighter('o', 'O2', ox, yc, -1).fighter('m', 'M9', mx, -30)
  // Mark drops in as a ball and squares up; Omni-Man makes his pitch.
  f.throw('m', mx, yc, { d: 0.35, arc: 0, turns: 0.75 }).pose('m', 'M1')
  f.at(0.8).pose('o', 'O3').say('o', 'JOIN ME', 0.6).at(1.4).pose('o', 'O2')
  // The charge, the punch... caught.
  f.sfx('FWOOSH', mx + 40, yc - 40, { size: 13 }).approach('m', mx + (hit - mx) * 0.55, 0.3, { pose: 'M2', lines: true, ghosts: true }).strike('m', 'o', { pose: 'M3', d: 0.3, reach: ox - hit })
  f.hit('o', { pose: 'O4', word: 'TAK!', shake: 1, r: 12 })
  for (const t of [2.2, 2.4, 2.6]) f.at(t).flinch('m', { px: 1, d: 0.1 })
  // The backhand: WHAM, an impact frame, and Mark through two buildings to a skid.
  f.at(2.95).pose('o', 'O7').at(3.0).hit('m', { pose: 'M8', word: 'WHAM!', flash: 0.35, shake: 3, freeze: 0.08, r: 24, impact: true })
  f.at(3.1).knockback('m', hit - W * 0.2, { pose: 'M9', d: 0.9, dy: gy - 20 - yc, rot: 720, land: 'skid', landPose: 'M10', arc: 0, ease: 'linear' })
  // The two buildings he goes through (scenery, not a beat): standing until he hits them.
  let set = ''
  for (const [bx, bh, t] of [[W * 0.46, 54, 3.35], [W * 0.3, 40, 3.65]] as [number, number, number][]) {
    set += act.win(3.0, t, `<rect x="${Math.round(bx - 13)}" y="${Math.round(gy + 14 - bh)}" width="26" height="${bh}" fill="#1B2236" stroke="${PROPS.ink}" stroke-width="1.5"/>`)
    f.at(t).sfx('KRAK!', bx, gy - 34)
  }
  f.at(3.4).pose('o', 'O2')
  f.at(4.0).sfx('SKRRT', W * 0.2, gy - 36, { tilt: 5 }).at(4.4).exit('m', { dir: -1, d: 0.2, pose: 'M9' })
  const layer = act.done(set + f.body(), f.still())
  return { layer, svg: doc(W, H, cam.wrap(`<rect width="${W}" height="${H}" fill="#1B2236"/>${layer}`)), f, act }
}

const T0 = Date.parse('2026-11-10T10:00:00Z')
test('choreo x Invincible: "The Catch" in beats plays the catch, then the backhand, as THE FIGHT v2 (now on choreo) does', () => {
  const shipped = fightAct({ W: 480, H: 434, era: 1, startAt: T0 }, 0)
  const { act } = catchCut(T0)
  const mark = (c: string[]): string[] => c.filter(k => k.startsWith('M')).filter((k, i, a) => a[i - 1] !== k)
  const omni = (c: string[]): string[] => c.filter(k => /^O\d/.test(k)).filter((k, i, a) => a[i - 1] !== k)
  const ours = act.chain.sort((a, b) => a[0] - b[0]).map(c => c[1])
  expect(mark(ours)).toEqual(['M9', 'M1', 'M2', 'M3', 'M8', 'M9', 'M10', 'M9'])
  // Both catch the punch (O4) before the backhand (O7), and the shipped act is an engine Act (its reduced-motion pair).
  for (const c of [ours, shipped.chain]) expect(omni(c).indexOf('O4')).toBeLessThan(omni(c).lastIndexOf('O7'))
  expect(shipped.svg).toMatch(/prefers-reduced-motion: reduce\)\{\.\w+-a\{display:none\}/)
})
test('choreo x Invincible: the two hits land when the original lands them, and the v2 extras are there', () => {
  const { f, layer } = catchCut(T0)
  expect(f.hits.map(h => h.t)).toEqual([2.0, 3.0])
  expect(f.script.filter(s => s[0] === 'freeze').length).toBe(2)
  expect(f.script.some(s => s[0] === 'impact')).toBe(true)
  expect(layer).toContain('WHAM!')
  expect(layer).toContain('TAK!')
})
test('choreo x Invincible: clean, inside the fight-act budget, with the clash as its reduced-motion still', () => {
  const { svg, layer, act } = catchCut(T0)
  const a = audit(svg)
  expect(a.dupes).toEqual([])
  expect(a.badText).toEqual([])
  expect(a.dupeIds).toEqual([])
  expect(a.chars).toBeLessThan(BUDGET.fightAct.card)
  expect(act.bank.count()).toBeLessThan(11)
  const still = layer.split(`<g class="${act.p}-s">`)[1] ?? ''
  expect((still.match(/<use /g) ?? []).length).toBe(2)
  expect(catchCut(T0).svg).toBe(svg)
})

test('choreo: `star: false` keeps the hit (hit-stop, shake, the hits list) without the star; `ghosts: false` draws no afterimage', () => {
  const sp = { rows: ['aa', 'aa'], pal: { a: '#FF0000' } }
  const make = (look: { ghosts?: boolean }, star: boolean) => {
    const act = new Act({ id: 'chk', ms: 2000, at: 0, W: 200, H: 80 })
    act.cast('p', sp)
    const f = new Fight(act, { sc: 2, ...look })
    f.fighter('a', 'p', 20, 40).fighter('b', 'p', 160, 40, -1)
    f.at(0.2).approach('a', 120, 0.1).hit('b', { star, freeze: 0.1 }).knockback('b', 30)
    return { f, s: f.body() }
  }
  const on = make({}, true)
  const off = make({ ghosts: false }, false)
  expect(on.s).toContain('<polygon')
  expect(off.s).not.toContain('<polygon')
  expect(off.f.hits.length).toBe(1)
  expect(off.s.length).toBeLessThan(on.s.length)
  expect((on.s.match(/opacity:0\.18/g) ?? []).length).toBeGreaterThan(0)
  expect((off.s.match(/opacity:0\.18/g) ?? []).length).toBe(0)
})
