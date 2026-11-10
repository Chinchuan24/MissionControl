// The worked example: one small act that uses the timeline, frames, fx, camera and light together. It ships in no skin;
// it is here to prove the pieces compose inside the budgets, and as the pattern skin teams copy. Two code-drawn boxers
// (generic, ours), a punch, a hit-freeze, a knockback, dust, KO stars, a glint, a rim light and a push-in.
import type { Sprite } from '../cast'
import { phased } from '../smooth'
import { expect, test } from 'claude-code/testing'
import { audit, doc } from './budget'
import { Camera } from './camera'
import * as fx from './fx'
import * as light from './light'
import { Act } from './timeline'

// ---------------------------------------------------------------- generic sprites, drawn in code (16 x 20)
const PAL = { k: '#16141F', s: '#E8B48A', w: '#F4F1E8', a: '#3B6FD8', A: '#2A4FA0', r: '#D8453B', R: '#9C2B24', y: '#F2C94C' }
const pose = (body: string, dark: string, f: (put: (x: number, y: number, w: number, h: number, c: string) => void) => void): Sprite => {
  const g = Array.from({ length: 20 }, () => Array.from({ length: 16 }, () => '.'))
  const put = (x: number, y: number, w: number, h: number, c: string): void => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && i >= 0 && i < 16) (g[j] as string[])[i] = c }
  put(5, 0, 6, 1, 'k'); put(4, 1, 8, 5, 'k'); put(5, 1, 6, 4, 's'); put(7, 2, 1, 1, 'k'); put(9, 2, 1, 1, 'k') // head
  put(4, 6, 8, 7, 'k'); put(5, 6, 6, 6, body); put(5, 12, 6, 1, dark) // torso and belt
  put(5, 13, 2, 6, dark); put(9, 13, 2, 6, dark); put(4, 19, 3, 1, 'k'); put(9, 19, 3, 1, 'k') // legs, feet
  f(put)
  return { rows: g.map(r => r.join('')), pal: PAL }
}
const guard = (put: (x: number, y: number, w: number, h: number, c: string) => void): void => { put(11, 6, 3, 3, 'w'); put(11, 9, 1, 2, 's') }
const SPR: Record<string, Sprite> = {
  aIdle: pose('a', 'A', guard),
  aPunch: pose('a', 'A', put => { put(11, 7, 3, 1, 's'); put(13, 6, 3, 3, 'w') }),
  bIdle: pose('r', 'R', guard),
  bHit: pose('r', 'R', put => { put(1, 3, 3, 3, 'w'); put(11, 4, 3, 3, 'w'); put(7, 2, 3, 1, 'k') }),
}

/** The demo act at wall time `at` on a W x H stage: the whole layer, plus the panel wrapped in its camera. */
export const demoAct = (at: number, W = 480, H = 160): { layer: string; svg: string; act: Act } => {
  const act = new Act({ id: 'stage-demo', ms: 4000, at, W, H, K: 6 })
  for (const [k, sp] of Object.entries(SPR)) act.cast(k, sp, 0.45)
  const cam = new Camera(act)
  const sc = 3
  const gy = H - 34
  const ax = W * 0.3
  const bx = W * 0.62
  cam.freeze(1.0, 0.07)
  let body = ''
  // A walks in and throws; B takes it and flies back.
  body += act.actor('a', [[0, 0.9, 'aIdle'], [0.9, 1.35, 'aPunch'], [1.35, 4, 'aIdle']], [[0, -40, gy], [0.6, ax, gy], [0.75, ax, gy], [0.95, bx - 44, gy], [1.35, bx - 44, gy], [1.8, ax, gy], [4, ax, gy]], { sc, trail: [[0.05, 0.6, fx.speedLines(-30, -8, 26, 4, 1, '#FFFFFF', { seed: 'walk' })]] })
  body += act.actor('b', [[0, 1.0, 'bIdle', -1], [1.0, 2.0, 'bHit', -1], [2.0, 4, 'bIdle', -1]], [[0, bx, gy], [1.0, bx, gy], [1.45, bx + 70, gy - 22, 18], [1.6, bx + 86, gy, 0], [2.0, bx + 86, gy, 0], [4, bx + 86, gy, 0]], { sc, ghosts: [1.0, 1.5] })
  // The hit: star, flash, sparks; the landing: ring, dust, debris, smoke.
  body += fx.star3(act, 1.0, bx - 14, gy - 16, 22, { core: '#FFFFFF', star: '#F2C94C', ring: '#9FE8FF', ink: '#16141F' })
  body += fx.flash(act, 1.0, { a: 0.35 })
  body += fx.sparks(act, 1.02, bx - 14, gy - 16, { seed: 'hit', color: '#FFE9A8' })
  body += fx.ring(act, 1.6, bx + 86, gy + 30, { rx: 22 })
  body += fx.dust(act, 1.6, bx + 96, gy + 28, { seed: 'land', n: 5 })
  body += fx.debris(act, 1.62, bx + 86, gy + 20, { seed: 'rubble', colors: ['#6E6A7C', '#8A8F98'] })
  body += fx.smoke(act, 1.7, bx + 110, gy + 26, { seed: 'smk', n: 3, d: 1.4, s: 0.7 })
  body += fx.koStars(act, 2.0, 3.6, bx + 86, gy - 40, { color: '#F2C94C', ink: '#16141F', s: 1.8 })
  body += fx.confetti(act, 2.6, ax, gy - 46, { seed: 'win', n: 10, px: 4, colors: ['#FFFFFF', '#F2C94C', '#9FE8FF'] })
  // Light: a glint across A's silhouette, and a cool rim on his back.
  const clip = light.clipTo(act.bank, 'aIdle', 'demoA', ax, gy, 1, sc)
  const glint = light.sweep({ id: 'demoGl', x: ax - 30, y: gy - 32, w: 60, h: 64, clip: 'demoA', act, t0: 2.1, t1: 3.1, op: 0.7, band: 16 })
  const rim = light.rim(act.bank, 'aIdle', ax, gy, { id: 'demoRim', color: '#9FE8FF', dx: -1, sc, op: 0.8 })
  body += `<defs>${clip}</defs>${act.on(rim.svg + glint.svg, 1.8, 3.95)}`
  // The camera: push in for the hit, a punchy grade, back out.
  cam.push(0.7, 0.95, 1.15, bx - 20, gy - 10, 'snap').shake(1.0, 3, 0.22).grade(1.0, 1.5, 'contrast(1.35) saturate(1.5)').reset(2.0, 2.5, 'settle')
  const still = act.still('aPunch', bx - 44, gy, 1, sc) + act.still('bHit', bx + 20, gy, -1, sc)
  const layer = act.done(body, still)
  const ray = light.godRay({ id: 'demoRay', x: ax, y: 0, len: H - 20, spread: 90, angle: 0, op: 0.25 })
  const stage = `<rect width="${W}" height="${H}" fill="#1E1B2C"/><rect y="${gy + 30}" width="${W}" height="${H - gy - 30}" fill="#2B2740"/>${ray.svg}`
  const svg = doc(W, H, cam.wrap(`${stage}${layer}`))
  return { layer, svg, act }
}

const T0 = Date.parse('2026-11-10T10:00:00Z')

test('demo: the whole act stays well inside a band effect budget (< 32 k) and draws cleanly', () => {
  const { svg } = demoAct(T0)
  const a = audit(svg)
  expect(a.chars).toBeLessThan(32_000)
  expect(a.dupes).toEqual([])
  expect(a.badText).toEqual([])
  expect(a.dupeIds).toEqual([])
  expect(a.reduced).toBe(true)
})

test('demo: same start, same bytes; a later redraw only moves the pinned delays', () => {
  const a = demoAct(T0).svg
  expect(demoAct(T0).svg).toBe(a)
  const now = phased(a, T0 + 1500)
  expect(now).not.toContain('@@T')
  // Pinned to the start: drawn 1.5 s in, the act's delay is 1.5 s in the past.
  expect(now).toContain('--p:-1.5s')
})

test('demo: the reduced-motion still shows both fighters, the moving body is hidden', () => {
  const { layer, act } = demoAct(T0)
  expect(layer).toContain(`<g class="${act.p}-s">`)
  expect((layer.split(`<g class="${act.p}-s">`)[1] ?? '').match(/<use /g)?.length).toBe(2)
  expect(layer).toContain(`@media (prefers-reduced-motion: reduce){.${act.p}-a{display:none}.${act.p}-s{display:inline}}`)
})

test('demo: four poses cut once each, whatever the number of windows', () => {
  const { act } = demoAct(T0)
  expect(act.bank.count()).toBe(4)
  expect(act.chainKeys()).toEqual(['aIdle', 'bIdle', 'aPunch', 'bHit', 'aIdle', 'bIdle'])
})
