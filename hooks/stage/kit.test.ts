// Part 2 of the stage kit: wipe (+ the skin switch), parallax, turntable / voxel / flip / tilt, director, choreo.
// Every piece: deterministic for a seed, inside its budget, a still frame for reduced motion, and no duplicate
// attribute, clashing id or unescaped character (any of which blanks the whole Svg).
import type { Sprite } from '../cast'
import { phased } from '../smooth'
import { expect, test } from 'claude-code/testing'
import { BUDGET, audit, chars, doc } from './budget'
import { Camera } from './camera'
import { Fight, fightLane } from './choreo'
import { DAY, Director, MIN, RARITY, cadence, localOffsetMs, perWindow } from './director'
import { FrameBank } from './frames'
import { parallax } from './parallax'
import { Act } from './timeline'
import { darken, flip, spin, tilt, turnViews, turntable, voxel } from './turntable'
import * as wipe from './wipe'

const T0 = Date.parse('2026-11-10T10:00:00Z')
const clean = (svg: string): void => {
  const a = audit(svg)
  expect(a.dupes).toEqual([])
  expect(a.badText).toEqual([])
  expect(a.dupeIds).toEqual([])
}
// A generic code-drawn prop (ours): a disc seen from 5 yaw angles, 0 front to 180 back (its width narrows to edge-on).
const disc = (k: number): Sprite => {
  const W = 21
  const half = Math.max(1, Math.round(10 * Math.abs(Math.cos((k * Math.PI) / 4))))
  const rows = Array.from({ length: 21 }, (_, y) => Array.from({ length: W }, (_, x) => {
    const dy = y - 10
    const dx = x - 10
    const ry = Math.sqrt(Math.max(0, 100 - dy * dy)) / 10
    return Math.abs(dx) <= half * ry ? (k < 2 || k > 2 ? (Math.abs(dx) < half * ry * 0.4 ? 'c' : 'a') : 'b') : '.'
  }).join(''))
  return { rows, pal: { a: '#C0392B', b: '#7F8C8D', c: '#F1C40F' } }
}
const DISC = [0, 1, 2, 3, 4].map(disc)
const BOX: Sprite = { rows: ['.aaaa.', 'abbbba', 'abccba', 'abbbba', '.aaaa.'], pal: { a: '#101018', b: '#3B6FD8', c: '#F4F1E8' } }
const MAN: Sprite = { rows: ['..aa..', '.abba.', 'abccba', '.abba.', '..dd..', '.d..d.'], pal: { a: '#101018', b: '#E8B48A', c: '#F4F1E8', d: '#3B6FD8' } }
const MAN2: Sprite = { rows: ['.aa...', 'abbaa.', 'abccba', '.abba.', '..dd..', 'd....d'], pal: MAN.pal }

// ---------------------------------------------------------------- wipe
const wipeAct = (): string => {
  const act = new Act({ id: 'unit-wipe', ms: 1600, at: T0, W: 400, H: 120 })
  let body = ''
  body += wipe.clip(act, 0, 0.5, '<rect width="400" height="120" fill="#222"/>', { dir: 'r' })
  body += wipe.clip(act, 0.2, 0.6, '<rect width="400" height="120" fill="#444"/>', { dir: 'd', mode: 'in' })
  body += wipe.bar(act, 0, 0.5, { dir: 'r', color: '#9FE8FF' })
  body += wipe.iris(act, 0.6, 1.0, { cx: 60, cy: 60, mode: 'in' })
  body += wipe.iris(act, 1.1, 1.5, { cx: 300, cy: 60, mode: 'out', color: '#111' })
  body += wipe.titleCard(act, 0.4, 1.4, { text: 'R&D <2>', x: 200, y: 60, size: 24, fill: '#FFE066', ink: '#111' })
  body += wipe.shards(act, 0.1, { n: 8, seed: 'cut', colors: ['#FF2E6A', '#9FE8FF'] })
  return act.done(body, '<rect width="400" height="2" fill="#9FE8FF"/>')
}
test('wipe: clip, bar, iris, title card and shards compose cleanly inside the band wipe budget', () => {
  const layer = wipeAct()
  clean(doc(400, 120, layer))
  expect(chars(layer)).toBeLessThan(BUDGET.wipe.band)
  expect(layer).toContain('clip-path:inset(0 0 0 100%)')
  expect(layer).toContain('R&amp;D &lt;2&gt;')
  expect(layer).toContain('prefers-reduced-motion: reduce')
  expect(wipeAct()).toBe(layer)
  expect(layer).not.toContain('mix-blend-mode')
})
test('wipe: the skin switch is short, pinned, inside its budgets, with a still rule for reduced motion', () => {
  const from = { bg: '#0B0F1A', accent: '#FCEE0A' }
  const to = { bg: '#F4EFE6', accent: '#C2410C' }
  const band = wipe.skinSwitch({ W: 1100, H: 204, at: T0, surface: 'band', from, to })
  clean(doc(1100, 204, band))
  expect(chars(band)).toBeLessThan(BUDGET.wipe.band)
  expect(wipe.SWITCH_MS).toBeLessThan(1000)
  const cards = Array.from({ length: wipe.SWITCH_CARDS }, (_, i) => wipe.skinSwitch({ W: 480, H: 220, at: T0, surface: 'pane', from, to, i }))
  for (const c of cards) { clean(doc(480, 220, c)); expect(chars(c)).toBeLessThan(BUDGET.wipe.card) }
  expect(cards.reduce((n, c) => n + chars(c), 0)).toBeLessThan(30_000)
  // Each card its own ids; the cascade makes later cards a little later.
  clean(doc(480, 880, cards.join('')))
  expect(band).toContain('#F4EFE6')
  expect(band).not.toContain('#0B0F1A') // only the new skin's colours by default
  expect(band).toContain('<rect width="1100" height="2" fill="#C2410C"/>')
  // Pinned: drawn 300 ms in, the act is 0.3 s along, never restarted.
  expect(phased(band, T0 + 300)).toContain('--p:-0.3s')
  expect(wipe.skinSwitch({ W: 1100, H: 204, at: T0, surface: 'band', from, to })).toBe(band)
})
test('wipe: a skin can pass its own flavour; into() and sizeOf() splice into any Svg', () => {
  const from = { bg: '#000', accent: '#F00' }
  const to = { bg: '#FFF', accent: '#00F' }
  const flavoured = wipe.skinSwitch({ W: 300, H: 100, at: T0, surface: 'band', from, to, flavour: { dir: 'u', bar: false, shards: 0, extra: act => wipe.titleCard(act, 0.1, 0.5, { text: 'NEW', x: 150, y: 50 }) } })
  expect(flavoured).toContain('NEW')
  expect(flavoured).not.toContain('sg-shard')
  const src = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100" viewBox="0 0 300 100"><rect width="300" height="100"/></svg>'
  expect(wipe.sizeOf(src)).toEqual({ W: 300, H: 100 })
  const out = wipe.into(src, flavoured)
  expect(out.endsWith(`${flavoured}</svg>`)).toBe(true)
  clean(out)
})

// ---------------------------------------------------------------- parallax
test('parallax: up to 4 layers, stepped at <= 8 fps by default, phased, still under reduced motion, inside 8 k', () => {
  const tower = (h: number) => `<rect x="4" y="${60 - h}" width="14" height="${h}" fill="#1A2230"/><rect x="26" y="${60 - h * 0.7}" width="10" height="${h * 0.7}" fill="#1A2230"/>`
  const p = parallax({ id: 'px', W: 900, H: 120, layers: [
    { tile: tower(40), w: 48, speed: 3, op: 0.5 },
    { tile: tower(55), w: 64, speed: 8, y: 20 },
    { tile: '<rect x="3" width="1" height="6" fill="#9FE8FF"/>', w: 20, speed: 0, dy: 60, h: 30 },
    { tile: '<rect width="900" height="4" fill="#000"/>', w: 900, speed: 0 },
    { tile: '<rect/>', w: 10, speed: 1 },
  ] })
  const svg = doc(900, 120, `<style>${p.css}</style>${p.svg}`)
  clean(svg)
  expect(chars(svg)).toBeLessThan(BUDGET.parallax.band)
  expect((p.css.match(/@keyframes/g) ?? []).length).toBe(3) // the 5th layer is dropped, the 4th holds still
  for (const m of p.css.matchAll(/(\d+(?:\.\d+)?)s steps\((\d+)\)/g)) expect(Number(m[2]) / Number(m[1])).toBeLessThan(8.6)
  expect(p.css).toContain('prefers-reduced-motion: reduce')
  expect(p.css).toContain('infinite')
  // A redraw shifts the loops onto the shared epoch instead of restarting them.
  expect(phased(p.css, T0 + 1234)).not.toBe(p.css)
})

// ---------------------------------------------------------------- turntable, voxel, flip, tilt
test('turntable: 5 views + mirror = 8, one stepped loop, the still view first, inside the card turnaround budget', () => {
  const bank = new FrameBank('ut', 4)
  DISC.forEach((sp, i) => bank.add(`v${i}`, sp))
  expect(turnViews(['a', 'b', 'c', 'd', 'e'], true).map(v => `${v.key}${v.dir}`)).toEqual(['a1', 'b1', 'c1', 'd1', 'e1', 'd-1', 'c-1', 'b-1'])
  const t = turntable(bank, { id: 'utT', views: ['v0', 'v1', 'v2', 'v3', 'v4'], mirror: true, x: 40, y: 30, sc: 2, period: 2.4, dir: 1, still: 2, shadow: { rx: 18, dy: 24, widths: [1, 0.7, 0.3, 0.7, 1, 0.7, 0.3, 0.7] } })
  const svg = doc(120, 80, `<style>${t.css}</style><defs>${bank.defs()}</defs>${t.svg}`)
  clean(svg)
  expect(t.views.length).toBe(8)
  expect(bank.count()).toBe(5)
  expect(chars(svg)).toBeLessThan(BUDGET.turnaround.card)
  expect((t.svg.match(/class="utT"/g) ?? []).length).toBe(8)
  // The still view (2) is drawn first, so reduced motion (animation:none) shows it.
  expect(t.svg.indexOf('#utv2')).toBeLessThan(t.svg.indexOf('#utv3'))
  expect(t.css).toContain('prefers-reduced-motion: reduce')
  // Reverse direction: the view after the still one is the previous yaw.
  const back = turntable(bank, { id: 'utB', views: ['v0', 'v1', 'v2', 'v3', 'v4'], mirror: true, x: 40, y: 30, period: 2.4, dir: -1, still: 2 })
  expect(back.svg.indexOf('#utv1')).toBeLessThan(back.svg.indexOf('#utv3'))
  // Period 0 = a still prop, no CSS.
  expect(turntable(bank, { id: 'utS', views: ['v0', 'v1'], x: 0, y: 0, period: 0, still: 1 }).css).toBe('')
})
test('turntable: spin() turns views into actor windows; an act can throw a prop end over end', () => {
  const views = turnViews(['v0', 'v1', 'v2', 'v3', 'v4'], true)
  const segs = spin(views, 1, 2, 0.4)
  expect(segs.length).toBe(20)
  expect(segs[0]).toEqual([1, 1.05, 'v0', 1])
  expect(segs[5]?.[3]).toBe(-1)
  const act = new Act({ id: 'unit-spin', ms: 2500, at: T0, W: 300, H: 100 })
  DISC.forEach((sp, i) => act.cast(`v${i}`, sp))
  const layer = act.done(act.actor('shield', segs, [[1, 20, 50], [2, 280, 50]], { sc: 1.5 }), act.still('v0', 150, 50, 1, 1.5))
  clean(doc(300, 100, layer))
  expect(chars(layer)).toBeLessThan(BUDGET.turnaround.band)
})
test('voxel: the silhouette 3 times behind, 1 px apart, each darker; under 1 k a sprite', () => {
  const bank = new FrameBank('vx', 6).add('box', BOX)
  const v = voxel(bank, 'box', 20, 20, { side: '#2A4FA0', depth: 3, sc: 2 })
  expect((v.match(/href="#vxbox-k"/g) ?? []).length).toBe(3)
  expect(v).toContain(darken('#2A4FA0', 0.24))
  expect(darken('#808080', 0.5)).toBe('#404040')
  const svg = doc(60, 60, `<defs>${bank.defs()}</defs>${v}`)
  clean(svg)
  expect(chars(v)).toBeLessThan(BUDGET.voxel.card)
})
test('flip and tilt: act-bound and idle forms, still under reduced motion, idle stepped', () => {
  const front = '<rect x="10" y="10" width="40" height="60" fill="#F4F1E8"/>'
  const back = '<rect x="10" y="10" width="40" height="60" fill="#3B6FD8"/>'
  const idle = flip({ id: 'fl', x: 10, y: 10, w: 40, h: 60, front, back, period: 8 })
  clean(doc(80, 80, `<style>${idle.css}</style>${idle.svg}`))
  expect(idle.css).toContain('steps(96)')
  expect(idle.css).toContain('prefers-reduced-motion: reduce')
  const act = new Act({ id: 'unit-flip', ms: 1500, at: T0, W: 80, H: 80 })
  const once = flip({ id: 'fo', x: 10, y: 10, w: 40, h: 60, front, back, act, t: 0.5 })
  clean(doc(80, 80, act.done(once.svg, front)))
  const tl = tilt({ id: 'tl', x: 10, y: 10, w: 40, h: 60, svg: front, deg: 4, glare: '#FFFFFF' })
  clean(doc(80, 80, `<style>${tl.css}</style>${tl.svg}`))
  expect(tl.css).toContain('prefers-reduced-motion: reduce')
  expect(chars(`<style>${tl.css}</style>${tl.svg}`)).toBeLessThan(BUDGET.light.card)
})

// ---------------------------------------------------------------- director
const boysLike = (): Director => {
  const d = new Director('unit')
  fightLane(d, [{ id: 'f-a', ms: 9000 }, { id: 'f-b', ms: 8000, replay: 'rematch' }])
  d.lane('daily', { daily: [9, 18] }).add('daily', { id: 'piece', ms: 7000, replay: 'piece' })
  d.lane('roam', { gap: 'sometimes', chance: 0.65 }).add('roam', { id: 'r-a', ms: 6000, weight: 3 }).add('roam', { id: 'r-b', ms: 5000, weight: 1 })
  return d
}
test('director: cadence() keeps two hits of a lane between the gap; perWindow() is the per-window chance', () => {
  expect(cadence('rare')).toEqual({ slotMs: 37.5 * MIN, jitterMs: 7.5 * MIN })
  expect(RARITY.fight).toEqual([30, 45])
  expect(perWindow(8)).toBe(0.0625)
  expect(perWindow(0.1)).toBe(1)
  const d = new Director('gap').lane('a', { gap: 'rare' }).add('a', { id: 'x', ms: 10_000 })
  const hits = d.plan(T0, T0 + DAY, {})
  for (let i = 1; i < hits.length; i++) {
    const g = ((hits[i] as { startAt: number }).startAt - (hits[i - 1] as { startAt: number }).startAt) / MIN
    expect(g).toBeGreaterThan(29.99)
    expect(g).toBeLessThan(45.01)
  }
  expect(hits.length).toBeGreaterThan(24 * 60 / 45 - 1)
  expect(hits.length).toBeLessThan(24 * 60 / 30 + 1)
})
test('director: fights are rare (one per 30-45 min, working only), in turns, and replayable', () => {
  const d = boysLike()
  const working = d.plan(T0, T0 + 8 * 3_600_000, { working: true }).filter(s => s.lane === 'fight')
  expect(working.length).toBeGreaterThan(8 * 60 / 45 - 2)
  expect(working.length).toBeLessThan(8 * 60 / 30 + 1)
  for (let i = 1; i < working.length; i++) expect((working[i] as { startAt: number }).startAt - (working[i - 1] as { startAt: number }).startAt).toBeGreaterThan(20 * MIN)
  expect(new Set(working.map(s => s.id))).toEqual(new Set(['f-a', 'f-b']))
  expect(d.plan(T0, T0 + 8 * 3_600_000, { working: false }).filter(s => s.lane === 'fight')).toEqual([])
  expect(d.replays()).toEqual(['f-a', 'rematch', 'piece'])
  expect(d.play('rematch', T0)).toEqual({ lane: 'fight', id: 'f-b', startAt: T0, endAt: T0 + 8000, src: 'replay' })
  expect(d.play('nope', T0)).toBeUndefined()
})
test('director: one act at a time, with a breath; held windows beat every lane; daily once a day', () => {
  const d = boysLike()
  const day = d.plan(T0, T0 + DAY, { working: true })
  for (let i = 1; i < day.length; i++) expect((day[i] as { startAt: number }).startAt).toBeGreaterThanOrEqual((day[i - 1] as { endAt: number }).endAt + 10_000)
  expect(day.filter(s => s.lane === 'daily').length).toBeLessThan(2)
  const twoDays = d.plan(T0, T0 + 2 * DAY, {}).filter(s => s.lane === 'daily')
  expect(twoDays.length).toBeLessThan(3)
  // Held: a typed act (or the skin switch) owns its window; nothing scheduled starts near it.
  const s = d.next(T0, { working: true }) as { startAt: number; endAt: number }
  const held = { startAt: s.startAt - 2000, endAt: s.startAt + 4000 }
  const again = d.plan(s.startAt - MIN, s.startAt + MIN, { working: true, held: [held] })
  expect(again.some(x => x.startAt === s.startAt)).toBe(false)
  expect(d.plan(T0, T0 + DAY, { quiet: true })).toEqual([])
  // Pure: the same question, the same answer.
  expect(boysLike().plan(T0, T0 + DAY, { working: true })).toEqual(day)
  const live = d.at(s.startAt + 500, { working: true })
  expect(live?.startAt).toBe(s.startAt)
  expect(d.at(s.startAt - 30_000, { working: true }, 60_000)?.startAt).toBe(s.startAt)
})
test('director: a lane or a bit named twice is an error, not a silent double', () => {
  const d = new Director('x').lane('a', { gap: 'often' }).add('a', { id: 'p', ms: 1 })
  expect(() => d.lane('a', { gap: 'often' })).toThrow()
  expect(() => d.add('a', { id: 'p', ms: 1 })).toThrow()
  expect(() => d.add('zz', { id: 'q', ms: 1 })).toThrow()
})

// ---------------------------------------------------------------- choreo
const brawl = (at = T0): { layer: string; svg: string; f: Fight; act: Act } => {
  const act = new Act({ id: 'unit-brawl', ms: 4200, at, W: 480, H: 150 })
  act.cast('A', MAN).cast('A2', MAN2).cast('B', MAN).cast('B2', MAN2)
  const cam = new Camera(act)
  const f = new Fight(act, { sc: 4, ink: '#111' }, cam)
  f.fighter('a', 'A', 60, 90).fighter('b', 'B', 400, 90, -1)
  f.stare('a', 'b', 0.6).step('a', 12).with().backdown('b', 10, 0.4).flinch('b', { pose: 'B2' })
  f.approach('a', 300, 0.35).strike('a', 'b', { pose: 'A2' }).hit('b', { pose: 'B2', word: 'POW', flash: 0.35, shake: 3, impact: true })
  f.knockback('b', 70, { land: 'crash', landPose: 'B' }).wait(0.3).throw('a', 200, 90, { d: 0.5, turns: 1 }).exit('b', { d: 0.4 })
  const layer = act.done(f.body(), f.still())
  return { layer, svg: doc(480, 150, cam.wrap(layer)), f, act }
}
test('choreo: the beats compile to actors, cues and a camera; clean, inside the band cut budget, deterministic', () => {
  const { svg, f, act, layer } = brawl()
  clean(svg)
  expect(chars(svg)).toBeLessThan(BUDGET.fightBand.band)
  expect(f.script.map(s => s[0])).toEqual(['stare', 'step', 'backdown', 'flinch', 'approach', 'strike', 'hit', 'impact', 'freeze', 'knockback', 'throw', 'exit'])
  expect(f.hits.length).toBe(1)
  expect(act.bank.count()).toBeLessThan(5)
  expect(brawl().svg).toBe(svg)
  // The hit-stop is real: the act holds 70 ms at the hit.
  expect(Math.abs(act.warp(3) - 3.07)).toBeLessThan(1e-9)
  // A smear (stretched silhouette) and an impact frame (ink + bright silhouettes) both draw.
  expect(layer).toMatch(/scale\(\d+(\.\d+)? 1\)/)
  expect(layer).toContain('opacity=".88"')
  // Reduced motion: the still shows both fighters at the clash and the star.
  const still = layer.split(`<g class="${act.p}-s">`)[1] ?? ''
  expect((still.match(/<use /g) ?? []).length).toBe(2)
  expect(still).toContain('<polygon')
})
test('choreo: an unknown fighter or pose fails loudly', () => {
  const act = new Act({ id: 'unit-bad', ms: 1000, at: T0, W: 100, H: 100 }).cast('A', MAN)
  const f = new Fight(act).fighter('a', 'A', 10, 10)
  expect(() => f.approach('zz', 50)).toThrow()
  expect(() => f.pose('a', 'NOPE')).toThrow()
})

test('director: localOffsetMs is east positive (the opposite sign of getTimezoneOffset)', () => {
  const at = Date.parse('2026-07-01T12:00:00Z')
  expect(localOffsetMs(at)).toBe(-new Date(at).getTimezoneOffset() * 60_000)
  // A daily lane at 9-18 local starts inside those local hours.
  const d = new Director('tz', { dayOffsetMs: localOffsetMs(at) }).lane('p', { daily: [9, 18] }).add('p', { id: 'x', ms: 1000 })
  const s = d.next(at - 86_400_000, {}, 'p')
  expect(s).toBeDefined()
  const h = new Date(s?.startAt ?? 0).getHours()
  expect(h >= 9 && h < 18).toBe(true)
})
test('choreo: orbit swings a fighter round a pivot, its top toward the pivot; a pose can keep its own colour count', () => {
  const act = new Act({ id: 'unit-orbit', ms: 2000, at: T0, W: 300, H: 200 }).cast('A', MAN).cast('B', BOX, 0.5, 2)
  const f = new Fight(act, { sc: 2 }).fighter('a', 'A', 100, 100).fighter('b', 'B', 150, 100, -1)
  f.at(0.2).orbit('a', 150, 80, 30, 90, 270, 0.6, { upright: true, n: 4 })
  expect(f.script.map(s => s[0])).toEqual(['orbit'])
  expect(Math.abs(f.t - 0.8)).toBeLessThan(1e-9)
  const layer = act.done(f.body(), f.still())
  clean(layer)
  // 90 deg: held out to the pivot's left; 180: straight above it; 270: to its right; then squared up.
  expect(layer).toContain('translate(120px,80px)')
  expect(layer).toContain('translate(150px,50px)')
  expect(layer).toContain('translate(180px,80px)')
  expect(layer).toContain('rotate(180deg)')
  expect(layer).toContain('rotate(0deg)')
  // The box keeps 2 colours of its 3 (its own K), the man all 4 (the bank's 6).
  const defs = layer.split('<defs>')[1] ?? ''
  expect((defs.match(/fill="/g) ?? []).length).toBe(6)
})
