// The Boys, motion phase A: the sixteen flattest acts now move pose to pose on the shared stage (a wind-up, the action with a real
// ease, a landing with a squash and dust), and three old bugs are fixed: the slate claps, LOOK AT ME has its own OFF BOOK line,
// and THE AMBUSH's scrim leaves the working numbers clear. Unit tests on the drawings (no engine needed).
import { expect, test } from 'claude-code/testing'
import { KIT, actOn, paneOf } from './theboys-acts'
import { actMs } from './theboys-eggs'
import './theboys-show'
import { AMBUSH_KINDS } from './theboys-show'
import { audit } from './stage/budget'

const NOW = Date.parse('2026-10-20T10:00:00Z')
const LOOKS = ['brand', 'book', 'gold', 'noir'] as const
/** The sixteen flat acts of the audit, and where each one draws (band and/or its pane card). */
const FLAT: [string, boolean, boolean][] = [
  ['sevenon7', true, true], ['funcut', true, true], ['invisible', true, true], ['americanhero', true, true], ['badproduct', true, true],
  ['pharma', true, true], ['redscare', true, true], ['fullroster', true, true], ['clara', true, true], ['nicaragua', true, true],
  ['deepfake', true, true], ['legalno', true, true], ['chestblast', true, true], ['r-noir', false, true], ['r-starlight', false, true], ['r-kimiko', true, false],
]
const band = (kind: string, m: string, W = 900) => actOn(kind, { W, H: 148, m: m as never, at: NOW, on: 'band', task: 'Fix the login bug', titleW: 200 })
const pane = (kind: string, m: string, W = 480) => {
  const p = paneOf(kind)
  const on = p === 'all' ? 'task' : (p ?? 'cred')
  return actOn(kind, { W, H: on === 'table' ? 260 : 150, m: m as never, at: NOW, on: on as never })
}
const svg = (s: string) => `<svg xmlns="http://www.w3.org/2000/svg">${s}</svg>`
/** Motion of the shared stage: a cue (fx), a frame-swap actor, or the act's own eased track with more than one pose or a squash. */
const moves = (s: string) => /class="sg-(rise|burst|ring|show|pop|blink)/.test(s) || /class="s[0-9a-z]{4}k"/.test(s) || /@keyframes x[a-z0-9-]+\{[^@]*transform:(scale|translate|rotate)/.test(s)

test('motion: each of the sixteen flat acts fires on its surfaces in all four looks, moves, and stays clean', () => {
  for (const [kind, onBand, onPane] of FLAT) {
    for (const m of LOOKS) {
      for (const [on, s] of [['band', onBand ? band(kind, m) : ''], ['pane', onPane ? pane(kind, m) : '']] as [string, string][]) {
        if (on === 'band' && !onBand) continue
        if (on === 'pane' && !onPane) continue
        expect(`${kind}/${m}/${on}:${s.includes(`data-egg="act-${kind}"`)}`).toBe(`${kind}/${m}/${on}:true`)
        expect(`${kind}/${on}:${moves(s)}`).toBe(`${kind}/${on}:true`)
        expect(s).not.toMatch(/NaN|undefined|Infinity/)
        const a = audit(svg(s))
        expect([kind, a.dupes, a.badText, a.dupeIds]).toEqual([kind, [], [], []])
      }
    }
  }
})

test('motion: every band act uses a wind-up/landing curve or the stage engine, not one linear slide', () => {
  for (const [kind, onBand] of FLAT) {
    if (!onBand) continue
    const s = band(kind, 'brand')
    // An eased track (the engine's named curves) or the stage engine's pieces; never only linear moves.
    expect(`${kind}:${/cubic-bezier|steps\(1,end\)|sg-/.test(s)}`).toBe(`${kind}:true`)
  }
})

test('motion: the stage actors have a reduced-motion still pose, and every act keeps the reduced-motion rule', () => {
  for (const [kind, onBand, onPane] of FLAT) {
    for (const s of [onBand ? band(kind, 'brand') : '', onPane ? pane(kind, 'brand') : ''].filter(Boolean)) {
      expect(s).toContain('prefers-reduced-motion: reduce')
      // A frame-swap actor (stage, hidden under reduced motion) always comes with its still (`-s`, shown only then).
      if (/class="s[0-9a-z]{4}k"/.test(s)) expect(`${kind}:${/class="s[0-9a-z]{4}-s"/.test(s)}`).toBe(`${kind}:true`)
      // The stage pieces sit in `tqh` wrappers (hidden under reduced motion).
      if (s.includes('class="sg-')) expect(s).toContain('<g class="tqh">')
    }
  }
})

test('motion: budgets: every typed act under 16 k on the band and the pane at three widths; the event and roamer acts under 20 k', () => {
  for (const [kind, onBand, onPane] of FLAT) {
    const lim = kind.startsWith('r-') || kind === 'legalno' || kind === 'chestblast' ? 20_000 : 16_000
    for (const m of ['brand', 'book', 'gold'] as const) {
      for (const W of [750, 900, 1250]) if (onBand) expect(`${kind}@${W}:${band(kind, m, W).length < lim}`).toBe(`${kind}@${W}:true`)
      for (const W of [360, 560]) if (onPane) expect(`${kind}@${W}:${pane(kind, m, W).length < lim}`).toBe(`${kind}@${W}:true`)
    }
  }
})

test('motion: the act ends on time (life class) and each act runs its own length', () => {
  for (const [kind, onBand] of FLAT) {
    const s = onBand ? band(kind, 'book') : pane(kind, 'book')
    expect(s).toContain('class="tql"')
    expect(s).toContain(`animation-duration:${actMs(kind) / 1000}s`)
  }
})

test('motion: the unused sprites now appear (laser, salute, shield, blast, point, ready, all four run frames)', () => {
  const bank = (s: string) => s.match(/<g id="s[0-9a-z]{4}f[\w-]+">/g)?.length ?? 0
  expect(bank(actOn('legalno', { W: 900, H: 148, m: 'brand', at: NOW, on: 'band' }))).toBeGreaterThanOrEqual(2) // HOVER + LASER
  expect(bank(actOn('chestblast', { W: 900, H: 148, m: 'gold', at: NOW, on: 'band' }))).toBeGreaterThanOrEqual(2) // SHIELD + BLAST
  expect(bank(actOn('nicaragua', { W: 900, H: 148, m: 'brand', at: NOW, on: 'band' }))).toBeGreaterThanOrEqual(2) // idle + SALUTE
  expect(bank(actOn('americanhero', { W: 900, H: 148, m: 'brand', at: NOW, on: 'band' }))).toBeGreaterThanOrEqual(2) // Frenchie POINT
  expect(bank(actOn('r-noir', { W: 480, H: 150, m: 'noir', at: NOW, on: 'cred' }))).toBeGreaterThanOrEqual(2) // READY + THUMBSUP
  // A-Train runs on all four frames, in a stepped cycle that stops on frame 1 under reduced motion.
  const r = actOn('r-atrain', { W: 900, H: 148, m: 'brand', at: NOW, on: 'band' })
  expect(r.match(/class="tqr[ "]/g)?.length).toBe(4)
  expect(r).toContain('.tqr0{opacity:1}')
  expect(r).toContain('@keyframes tqr{')
})

test('bug: the slate claps (training, payback, fun cut): the arm snaps shut at its beat and is drawn shut under reduced motion', () => {
  for (const kind of ['training', 'payback', 'funcut']) {
    const s = actOn(kind, { W: 900, H: 148, m: 'brand', at: NOW, on: 'band' })
    expect(s).toMatch(/rotate\(-31deg\)/) // the wind-up opens it wider
    expect(s).toMatch(/translateY\(-7px\) rotate\(0deg\)/) // the clap
    expect(s).toContain('transform="translate(0 -7)"') // the reduced-motion still: shut
    expect(s).toContain('class="sg-burst') // the chalk puff
  }
  expect(KIT.PH).toBeGreaterThan(50)
})

test('bug: LOOK AT ME has its own OFF BOOK line', () => {
  const on = actOn('lookatme', { W: 900, H: 148, m: 'brand', at: NOW, on: 'band' })
  const off = actOn('lookatme', { W: 900, H: 148, m: 'book', at: NOW, on: 'band' })
  expect(on).toContain('LOOK AT ME!')
  expect(off).not.toContain('LOOK AT ME!')
  expect(off).toContain('LOOK AT ’IM.')
})

test('bug: THE AMBUSH scrim leaves the working numbers clear, and its cast is drawn at 1.2x', () => {
  for (const kind of AMBUSH_KINDS) {
    for (const W of [750, 900, 1250]) {
      const s = actOn(kind, { W, H: 148, m: 'brand', at: NOW, on: 'band' })
      // No full-band dim: the scrim is the stage strip, with the number zones cut out of it (evenodd).
      expect(s).not.toMatch(new RegExp(`<rect width="${W}" height="148" rx="10" fill="[^"]+" opacity="\\.72"/>`))
      const d = /<path fill-rule="evenodd" d="M0 46H([\d.]+)V134H0z(M[^"]+)"[^>]*opacity="0?\.72"/.exec(s)
      expect(d).not.toBeNull()
      // The top row (Total, APPROVAL, ROSTER) is above the strip; the right-hand readouts are right of it; holes for the rest.
      expect(Number(d?.[1])).toBeLessThan(W - 100)
      expect((d?.[2] ?? '').match(/M/g)?.length).toBe(3)
      // 1.2x: the AMBUSH cast stands at .96 where the roamers stand at .8 (the px sprites are drawn with scale(.96)).
      expect(s).toMatch(/scale\(0?\.96\)|matrix\(0?\.96|scale\(-0?\.96 0?\.96\)|\b0\.96\b/)
    }
  }
})

test('motion: the scrimmed AMBUSH and its closing caption stay off the top row', () => {
  for (const kind of AMBUSH_KINDS) {
    const s = actOn(kind, { W: 900, H: 148, m: 'brand', at: NOW, on: 'band' })
    // The caption pill sits on the title row (y 64), never at the top row's y 30.
    expect(s).not.toMatch(/<rect x="[\d.]+" y="15" width="[\d.]+" height="20" rx="10"/)
  }
})
