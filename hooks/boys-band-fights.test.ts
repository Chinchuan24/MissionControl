// The Boys' band fights (final review): the task title reads through a fight and nothing is drawn over the band's bottom status
// row. On the band's real stages at the five band-fit widths, for the four fights in every look:
// - no band-wide scrim any more (it dimmed the title, the Tasks chip and TODAY/TURN at .72): one light scrim (<= .35) inside the
//   fight's window only, and the title is never inside that window (outside it, or a hole in its clip);
// - the window (and so every fighter, cut-in, slate, spark and caption: all are clipped to it) ends above the status row (y 110);
// - a standing fighter's box never meets the task title or the status row; the cast is as tall as the room allows;
// - the opening card's words fit the window whole.
import { expect, test } from 'claude-code/testing'
import { audit } from './stage/budget'
import type { BandStage, Rect } from './stage/keep'
import { holesIn, meets } from './stage/keep'
import { actOn } from './theboys-acts'
import { BAND_FLOOR, FIGHT_KINDS, SCRIM_OP, castPx, winOf } from './theboys-fights'

// The main band's stages as register.tsx hands them (wide-fights.test.ts: a 4-agent job, "GDA HQ incident report", 2/5 tasks).
const ST: Record<number, BandStage> = {
  450: { x1: 258, keep: [[211, 39, 84, 22], [12, 88, 102, 21]], wide: { x2: 368, keep: [[368, 34, 452, 50], [289, 79, 452, 31], [257.5, 110, 452, 24]] }, title: [61, 39, 144, 22] },
  600: { x1: 245, keep: [[178, 39, 84, 22], [12, 88, 102, 21]], wide: { x2: 308, keep: [[308, 34, 601, 50], [245, 79, 601, 31], [296.9, 110, 601, 24]] }, title: [61, 39, 111, 22] },
  750: { x1: 296, keep: [[259, 39, 84, 22], [12, 88, 102, 21]], wide: { x2: 458, keep: [[458, 34, 749, 50], [326, 79, 749, 31], [295.9, 110, 749, 24]] }, title: [61, 39, 192, 22] },
  900: { x1: 445, keep: [[259, 39, 84, 22], [12, 88, 102, 21]], wide: { x2: 608, keep: [[608, 34, 898, 50], [475, 79, 898, 31], [444.9, 110, 898, 24]] }, title: [61, 39, 192, 22] },
  1250: { x1: 794, keep: [[259, 39, 84, 22], [12, 88, 102, 21]], wide: { x2: 842, keep: [[842, 34, 1247, 50], [824, 79, 1247, 31], [793.9, 110, 1247, 24]] }, title: [61, 39, 192, 22] },
}
const BW: Record<number, number> = { 450: 452, 600: 601, 750: 749, 900: 898, 1250: 1247 }
const LOOKS = ['brand', 'book', 'gold', 'noir'] as const
/** The tallest fighter (band px) per width: the 1250 lane and the row under the title elsewhere. */
const MIN: Record<number, number> = { 450: 45, 600: 45, 750: 45, 900: 45, 1250: 69 }

/** The fight's window and its holes, read back from its clip (a keepClip path or a plain rect). */
const clipOf = (svg: string): { win: Rect; holes: Rect[] } => {
  const p = /<clipPath id="[^"]*w"><path clip-rule="evenodd" d="([^"]+)"/.exec(svg)
  if (p) {
    const [win, ...holes] = [...(p[1] as string).matchAll(/M([-\d.]+) ([-\d.]+)h([-\d.]+)v([-\d.]+)/g)].map(m => [1, 2, 3, 4].map(i => Number(m[i])) as Rect)
    return { win: win as Rect, holes }
  }
  const r = /<clipPath id="[^"]*w"><rect x="([-\d.]+)" y="([-\d.]+)" width="([-\d.]+)" height="([-\d.]+)"/.exec(svg)
  expect(r, 'the fight has a window clip').toBeTruthy()
  return { win: [1, 2, 3, 4].map(i => Number((r as RegExpExecArray)[i])) as Rect, holes: [] }
}
const inside = (a: Rect, b: Rect): boolean => a[0] >= b[0] - 0.5 && a[1] >= b[1] - 0.5 && a[0] + a[2] <= b[0] + b[2] + 0.5 && a[1] + a[3] <= b[1] + b[3] + 0.5

test('boys band fights: the title reads through a fight (no band-wide scrim; a light one inside the window, never over the title)', () => {
  expect(SCRIM_OP).toBeLessThanOrEqual(0.35)
  for (const W of [450, 600, 750, 900, 1250]) {
    const st = ST[W] as BandStage
    const title = st.title as Rect
    for (const k of FIGHT_KINDS) for (const m of LOOKS) {
      const svg = actOn(k, { W: BW[W] as number, H: 148, m, at: 0, on: 'band', task: 'GDA HQ incident report', titleW: 192, stage: st })
      const tag = `${k} ${m} ${W}`
      // The old stage scrim (`M0 46H...` at .72 over the whole stage strip) is gone.
      expect(svg, `${tag}: no band-wide scrim`).not.toMatch(/d="M0 46H/)
      expect(svg, `${tag}: no .72 dim`).not.toMatch(/opacity="\.72"/)
      // Its own scrim: one rect inside the window, at the light opacity.
      expect(svg, `${tag}: the light scrim`).toContain(`opacity:${SCRIM_OP}`)
      // The title is never inside the window: outside it, or a hole in its clip.
      const { win, holes } = clipOf(svg)
      const part = holesIn(win, [title])
      for (const p of part) expect(holes.some(h => inside(p, h)), `${tag}: the title is a hole`).toBe(true)
      // The window (everything in the fight is clipped to it) ends above the status row.
      expect(win[1] + win[3], `${tag}: above the status row`).toBeLessThanOrEqual(110)
      // ...and keeps left of every row's first readout above the floor (the percent, the crew), right of the step count.
      for (const r of (st.wide as { keep: Rect[] }).keep.filter(r => r[1] < 110)) expect(meets(win, r), `${tag}: clear of ${r}`).toBe(false)
      expect(audit(`<svg xmlns="http://www.w3.org/2000/svg">${svg}</svg>`).dupes, tag).toEqual([])
    }
  }
})

test('boys band fights: a standing fighter never meets the title or the status row, and stands as tall as the room allows', () => {
  for (const W of [450, 600, 750, 900, 1250]) {
    const st = ST[W] as BandStage
    const w = winOf({ W: BW[W] as number, H: 148, m: 'brand', at: 0, on: 'band', stage: st })
    const px = castPx(w)
    expect(px, `${W}: tall enough`).toBeGreaterThanOrEqual(MIN[W] as number)
    expect(w.gy, `${W}: feet above the status row`).toBeLessThanOrEqual(BAND_FLOOR)
    // The cast stands anywhere across the window: its whole box (window wide, castPx tall) clear of the title and the status row.
    const cast: Rect = [w.x0, w.gy - px, w.x1 - w.x0, px]
    expect(meets(cast, st.title as Rect), `${W}: clear of the title`).toBe(false)
    expect(meets(cast, [0, 110, BW[W] as number, 24]), `${W}: clear of the status row`).toBe(false)
    expect(cast[1], `${W}: under the header rule`).toBeGreaterThanOrEqual(36)
    for (const hole of st.keep) expect(meets(cast, hole), `${W}: clear of ${hole}`).toBe(false)
  }
})

test('boys band fights: the opening card is whole in a narrow window (VIEWER DISCRETION / ADVISED on two lines)', () => {
  for (const W of [450, 600, 750]) {
    const svg = actOn('offthebooks', { W: BW[W] as number, H: 148, m: 'brand', at: 0, on: 'band', task: 'GDA HQ incident report', titleW: 192, stage: ST[W] as BandStage })
    const w = winOf({ W: BW[W] as number, H: 148, m: 'brand', at: 0, on: 'band', stage: ST[W] as BandStage })
    const m = /font-size="([\d.]+)"[^>]*>VIEWER DISCRETION</.exec(svg)
    expect(m, `${W}: two lines`).toBeTruthy()
    const fs = Number((m as RegExpExecArray)[1])
    // 17 condensed glyphs (about .62 em each) and 1 px of spacing fit the window, with a margin.
    expect(17 * (fs * 0.62 + 1), `${W}: fits`).toBeLessThanOrEqual(w.x1 - w.x0 - 12)
    expect(fs, `${W}: readable`).toBeGreaterThanOrEqual(7)
    expect(svg).toContain('>ADVISED<')
  }
})
