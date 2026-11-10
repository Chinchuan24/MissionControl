// Unit tests for each stage piece: deterministic for a seed, inside its budget, a still frame for reduced motion, and
// never a duplicate attribute, a clashing id or an unescaped character (any of which blanks the whole Svg).
import type { Sprite } from '../cast'
import { compact, phased } from '../smooth'
import { expect, test } from 'claude-code/testing'
import { BUDGET, audit, badText, chars, doc, dupes, esc } from './budget'
import { Camera } from './camera'
import { EASE, curve, ease, steps } from './ease'
import { FrameBank, flipbook, quantise, rectPaths, silhouette, swapRows } from './frames'
import * as fx from './fx'
import * as light from './light'
import { hide, pair, stop } from './motion'
import { Act } from './timeline'

const T0 = Date.parse('2026-11-10T10:00:00Z')
const SP: Sprite = { rows: ['..aa..', '.abba.', 'abccba', '.abba.', '..dd..', '.d..d.'], pal: { a: '#101018', b: '#E8B48A', c: '#F4F1E8', d: '#3B6FD8' } }
const SP2: Sprite = { rows: ['.aa...', 'abbaa.', 'abccba', '.abba.', '..dd..', 'd....d'], pal: SP.pal }
const clean = (svg: string): void => {
  const a = audit(svg)
  expect(a.dupes).toEqual([])
  expect(a.badText).toEqual([])
  expect(a.dupeIds).toEqual([])
}
const act = (id = 'unit', ms = 3000, W = 300, H = 120): Act => new Act({ id, ms, at: T0, W, H }).cast('A', SP).cast('B', SP2)

// ---------------------------------------------------------------- ease
test('ease: the five names are the curves the skins already used; anything else passes through', () => {
  expect(ease('settle')).toBe('cubic-bezier(.2,.9,.3,1)')
  expect(ease('overshoot')).toBe('cubic-bezier(.2,1.4,.4,1)')
  expect(ease('whip')).toBe('cubic-bezier(.7,0,.3,1)')
  expect(ease('steps(3)')).toBe('steps(3)')
  expect(ease(undefined)).toBe('linear')
  expect(steps(4)).toBe('steps(4)')
  expect(Object.keys(EASE)).toEqual(['linear', 'snap', 'settle', 'overshoot', 'anticipate', 'whip'])
})
test('ease: curve() ends at 0 and 1; overshoot passes 1, anticipate dips below 0, steps hold', () => {
  for (const n of Object.keys(EASE)) { expect(curve(n)(0)).toBe(0); expect(curve(n)(1)).toBe(1) }
  expect(Math.max(...[0.3, 0.4, 0.5, 0.6].map(curve('overshoot')))).toBeGreaterThan(1)
  expect(Math.min(...[0.05, 0.1, 0.2].map(curve('anticipate')))).toBeLessThan(0)
  expect(curve('steps(4)')(0.3)).toBe(0.25)
})

// ---------------------------------------------------------------- motion
test('motion: pair hides the animated half and shows the still half only under reduced motion', () => {
  const rm = pair('zz')
  expect(rm.anim('X')).toBe('<g class="zz-a">X</g>')
  expect(rm.still('Y')).toBe('<g class="zz-s">Y</g>')
  expect(rm.css).toBe('.zz-s{display:none}@media (prefers-reduced-motion: reduce){.zz-a{display:none}.zz-s{display:inline}}')
  expect(stop('a', 'b')).toBe('@media (prefers-reduced-motion: reduce){.a,.b{animation:none!important}}')
  expect(hide('f')).toBe('@media (prefers-reduced-motion: reduce){.f{display:none}}')
  expect(stop()).toBe('')
})
test('motion: compact keeps the reduced-motion block (it sits on its own line)', () => {
  const rm = pair('zz')
  const svg = `<svg><style>${rm.css}</style>${rm.anim('<rect/>')}${rm.still('<rect/>')}</svg>`
  expect(compact(svg)).toContain('prefers-reduced-motion: reduce')
})

// ---------------------------------------------------------------- budget
test('budget: dupes, bad text and escaping catch what blanks an Svg', () => {
  expect(dupes('<rect x="1" x="2"/>')).toHaveLength(1)
  expect(dupes('<rect x="1" y="2"/>')).toEqual([])
  expect(badText('<text>A & B</text>')).toHaveLength(1)
  expect(badText('<text>A &amp; B</text>')).toEqual([])
  expect(badText(`<text>${esc('a < b & "c"')}</text>`)).toEqual([])
  expect(BUDGET.fightBand.band).toBe(32_000)
  expect(chars('<svg><style>.dead{fill:red}</style><rect/></svg>')).toBe('<svg><rect/></svg>'.length)
})

// ---------------------------------------------------------------- frames
test('frames: rect paths quantise to K colours and merge runs into rectangles', () => {
  expect(quantise(SP, 2).size).toBe(4)
  expect(new Set(quantise(SP, 2).values()).size).toBe(2)
  const p = rectPaths(SP, 8)
  expect(p.match(/<path /g)).toHaveLength(4)
  expect(rectPaths(SP, 8)).toBe(p)
  expect(silhouette(SP)).toMatch(/^M\d/)
  expect(silhouette(SP)).not.toContain('fill')
})
test('frames: the bank cuts a pose once, however often it is used, and refuses an unknown pose', () => {
  const b = new FrameBank('tb', 6).add('A', SP).add('B', SP2)
  const uses = [b.use('A', 10, 10), b.use('A', 30, 10, -1, 2), b.use('A', 50, 10)].join('')
  expect(b.count()).toBe(1)
  expect(b.defs().match(/id="tbA"/g)).toHaveLength(1)
  expect(uses).toContain('scale(-2 2)')
  b.sil('A')
  expect(b.defs()).toContain('id="tbA-k"')
  expect(b.count()).toBe(1)
  expect(() => b.use('Q', 0, 0)).toThrow()
  clean(`<svg><defs>${b.defs()}</defs>${uses}</svg>`)
})
test('frames: swap rows show a pose only inside its windows; a flipbook is endless steps with a still first pose', () => {
  expect(swapRows([[1, 2]], t => t * 10)).toEqual([[0, 'opacity:0'], [10, 'opacity:1'], [20, 'opacity:0'], [100, 'opacity:0']])
  const b = new FrameBank('fb').add('A', SP).add('B', SP2)
  const f = flipbook(b, 'fbl', ['A', 'B'], 20, 20, 0.6)
  expect(f.svg.match(/infinite/g)).toHaveLength(2)
  expect(f.svg.split('<g class="fbl"')[1]).not.toContain('opacity="0"')
  expect(f.css).toContain('prefers-reduced-motion: reduce')
  expect(f.css.length + f.svg.length).toBeLessThan(BUDGET.idle.card)
  // Phased: drawn a minute apart, the loop keeps its phase (the shift is the same mod the period).
  expect(phased(f.svg, T0 + 30_000)).toContain('infinite')
})

// ---------------------------------------------------------------- timeline
test('timeline: one duration, pinned delays, percent keyframes; a redraw resolves the pin to the elapsed time', () => {
  const a = act()
  const body = a.actor('h', [[0, 1, 'A'], [1, 2, 'B', -1]], [[0, 10, 60], [2, 200, 60]], { sc: 2 }) + a.kf('<rect width="4" height="4"/>', [[0, 'opacity:0'], [1.5, 'opacity:1']], { ease: 'settle' })
  const layer = a.done(body, a.still('A', 100, 60, 1, 2))
  expect(layer.startsWith('<!--dl-->')).toBe(true)
  expect(layer).toContain(`.${a.p}k{animation-duration:3s;`)
  expect(layer).toContain('animation-timing-function:cubic-bezier(.2,.9,.3,1)')
  expect(layer).toContain('50%{opacity:1}')
  expect(phased(layer, T0 + 1000)).toContain('--p:-1s')
  expect(phased(layer, T0 + 1000)).not.toContain('@@T')
  expect(a.bank.count()).toBe(2)
  expect(a.chainKeys()).toEqual(['A', 'B'])
  clean(doc(300, 120, layer))
})
test('timeline: deterministic, and two acts in one Svg never share an id or a keyframes name', () => {
  const build = (id: string): string => { const a = act(id); return a.done(a.actor('h', [[0, 2, 'A']], [[0, 0, 0], [2, 50, 0]]) + a.on('<rect/>', 0.5, 1), a.still('A', 0, 0)) }
  expect(build('x')).toBe(build('x'))
  const both = doc(300, 120, build('x') + build('y'))
  clean(both)
  const names = [...both.matchAll(/@keyframes ([\w-]+)/g)].map(m => m[1])
  expect(names.length).toBe(new Set(names).size)
})
test('timeline: a hit-freeze holds the path and shifts what comes after', () => {
  const a = act().freeze(1, 0.5)
  expect(a.warp(0.5)).toBe(0.5)
  expect(a.warp(2)).toBe(2.5)
  const keys = a.hold([[0, 0, 0], [2, 100, 0]] as [number, number, number][])
  // The value at the freeze (50) is held from 1 s to 1.5 s, the end key moves to 2.5 s.
  expect(keys).toEqual([[0, 0, 0], [1, 50, 0], [1.5, 50, 0], [2.5, 100, 0]])
})
test('timeline: an offset surface (a pane card after the band cut) keys on the whole timeline', () => {
  const a = new Act({ id: 'card', ms: 10_000, at: T0, W: 300, H: 120, off: 5 }).cast('A', SP)
  expect(a.pc(0)).toBe(50)
  expect(a.pc(5)).toBe(100)
  expect(a.done(a.on('<rect/>', 1, 2), '')).toContain('--s:calc(@@T')
})
test('timeline: cues are a class and a time, not a keyframes block', () => {
  const a = act()
  const c = a.cue('pop', 1.25, '<rect/>', { x: 5, y: 6 })
  expect(c).toBe('<g transform="translate(5 6)"><g class="sg-pop sg-c" style="--t:1.25s"><rect/></g></g>')
  const layer = a.done(c, '')
  expect(layer).toContain('@keyframes sg-pop')
  expect(layer).not.toContain('@keyframes sg-burst')
})

// ---------------------------------------------------------------- fx
test('fx: every particle is seeded (same seed, same burst), a cue, and small', () => {
  const run = (seed: string): string => {
    const a = act()
    return [fx.confetti(a, 1, 50, 50, { seed, n: 8 }), fx.smoke(a, 1, 50, 50, { seed }), fx.dust(a, 1, 50, 80, { seed }), fx.sparks(a, 1, 50, 50, { seed }), fx.debris(a, 1, 50, 50, { seed })].join('')
  }
  expect(run('a')).toBe(run('a'))
  expect(run('a')).not.toBe(run('b'))
  const a = act()
  const all = [fx.star3(a, 1, 50, 50, 14), fx.flash(a, 1), fx.puff(a, 1, 50, 50), fx.confetti(a, 1, 50, 50), fx.ring(a, 1, 50, 50), fx.smoke(a, 1, 50, 50), fx.dust(a, 1, 50, 50), fx.sparks(a, 1, 50, 50), fx.debris(a, 1, 50, 50), fx.koStars(a, 1, 2, 50, 30), fx.speedLines(10, 10, 20, 4, 1, '#FFF')]
  for (const piece of all) expect(piece.length).toBeLessThan(1_500)
  expect(all.join('')).not.toContain('@keyframes')
  const layer = a.done(all.join(''), '')
  clean(doc(300, 120, layer))
  expect(chars(doc(300, 120, layer))).toBeLessThan(BUDGET.light.band * 5)
  expect(fx.rng('x')()).toBe(fx.rng('x')())
})

// ---------------------------------------------------------------- camera
test('camera: three nested tracks (grade, move, shake), pinned, stopped under reduced motion, absent when unused', () => {
  const a = act()
  const cam = new Camera(a)
  expect(cam.wrap('<rect/>')).toBe('<rect/>')
  cam.shake(1, 3, 0.2).shake(0.5, 1, 0.1).push(0.2, 0.6, 1.2, 150, 60, 'snap').reset(2, 2.5).grade(1, 2, 'grayscale(1)')
  const w = cam.wrap('<rect/>')
  expect(w).toContain(`class="${a.p}Cg"`)
  expect(w).toContain(`class="${a.p}Cm"`)
  expect(w).toContain('animation-name:sg-sh1,sg-sh3')
  expect(w).toContain('animation-delay:calc(@@T')
  expect(w).toContain('filter:grayscale(1)')
  expect(w).toContain('translate(-30px,-12px) scale(1.2)')
  expect(w).toContain(`{.${a.p}Cg,.${a.p}Cm,.${a.p}Cs{animation:none!important}}`)
  clean(doc(300, 120, w))
  expect(chars(doc(300, 120, w))).toBeLessThan(BUDGET.wipe.card)
})
test('camera: the shake list is one valid set of longhands (no shorthand glued to a delay)', () => {
  const cam = new Camera(act()).shake(1, 2, 0.12).shake(2, 4, 0.3)
  const s = cam.shakeStyle()
  expect(s.split(';').map(d => d.split(':')[0])).toEqual(['animation-name', 'animation-duration', 'animation-timing-function', 'animation-fill-mode', 'animation-delay'])
})
test('camera: a hit-freeze holds the act and taps the camera', () => {
  const a = act()
  new Camera(a).freeze(1, 0.07)
  expect(a.warp(2)).toBe(2.07)
})

// ---------------------------------------------------------------- light
test('light: sweep loops in steps at <= 12 fps, hides under reduced motion, and fits a light budget', () => {
  const s = light.sweep({ id: 'lt', x: 0, y: 0, w: 60, h: 40, period: 3, pass: 0.4 })
  expect(s.css).toContain('steps(14)')
  expect(s.css).toContain('infinite')
  expect(s.css).toContain('prefers-reduced-motion: reduce')
  expect(s.svg.length + s.css.length).toBeLessThan(BUDGET.light.card)
  clean(doc(60, 40, `<style>${s.css}</style>${s.svg}`))
})
test('light: an act-bound sweep clips to a silhouette and moves inside the clip (the clip stays put)', () => {
  const a = act()
  const clip = light.clipTo(a.bank, 'A', 'cl', 50, 50, 1, 2)
  const s = light.sweep({ id: 'gl', x: 30, y: 30, w: 40, h: 40, clip: 'cl', act: a, t0: 1, t1: 2 })
  expect(clip).toContain(`<use href="#${a.p}fA-k"`)
  expect(s.svg).toMatch(/<g clip-path="url\(#cl\)"><g transform="skewX\(-18\)"><g class="s\w+k"/)
  const layer = a.done(`<defs>${clip}</defs>${s.svg}`, '')
  clean(doc(300, 120, layer))
  expect(s.svg.length).toBeLessThan(BUDGET.light.band)
})
test('light: rim, flicker and god-ray are small, seeded and still under reduced motion', () => {
  const b = new FrameBank('lb').add('A', SP)
  const r = light.rim(b, 'A', 40, 40, { id: 'rm', sc: 3 })
  expect(r.svg).toContain('<mask id="rm"')
  expect(r.svg).toContain('translate(1 0)')
  expect(light.flicker('fl', { seed: 's' })).toBe(light.flicker('fl', { seed: 's' }))
  expect(light.flicker('fl')).toContain('steps(1) infinite')
  expect(light.flicker('fl')).toContain('prefers-reduced-motion: reduce')
  const g = light.godRay({ id: 'gr', x: 10, y: 0, len: 80, spread: 40, pulse: 4 })
  expect(g.css).toContain('steps(8)')
  for (const piece of [r.svg, g.svg + g.css, light.flicker('fl')]) expect(piece.length).toBeLessThan(BUDGET.light.card)
  clean(doc(100, 100, `<defs>${b.defs()}</defs>${r.svg}${g.svg}`))
})
