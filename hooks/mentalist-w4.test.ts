// The Mentalist + Red John, wave 4 polish: the Parlour Reveal and Red John's walk-by take the band's whole clear span (bigger,
// every line whole, clear of the readouts), and the walk-by's silhouette catches a red rim light (still faceless).
import { expect, test } from 'claude-code/testing'
import { audit, BUDGET } from './stage/budget'
import { MENT_MS, mentBand, setMentPlay } from './mentalist-motion'

const NOW = Date.parse('2026-10-20T10:00:00Z')
type R = [number, number, number, number]
/** A band's stage at the band-fit widths: the clear span, the Tasks chip and step count inside it, each row's right part. */
const stageOf = (W: number) => ({
  x1: Math.round(W * 0.42),
  keep: [[Math.round(W * 0.26), 39, 85, 22], [12, 88, 76, 21]] as R[],
  wide: { x2: Math.round(W * 0.6), keep: [[Math.round(W * 0.48), 34, W, 50], [Math.round(W * 0.56), 79, W, 31], [Math.round(W * 0.46), 110, W, 24]] as R[] },
})
const scales = (svg: string): number[] => [...svg.matchAll(/scale\(-?([\d.]+)[ ,)]/g)].map(m => Number(m[1]))

for (const W of [450, 600, 750, 900, 1250]) {
  test(`parlour + walk-by at ${W}: the whole clear span, figures at least 1.6x, the butler line whole, the rim light on him`, () => {
    const st = stageOf(W)
    setMentPlay({ kind: 'parlour', at: NOW })
    const p = mentBand({ W, H: 134, at: NOW + 6_500, working: false, red: false, stage: st })
    // The span's own clip (to y 131, the last row's foot), not the old 56 px task-row strip.
    expect(p).toMatch(/clip-rule="evenodd" d="M8 34h\d+v97h/)
    expect(Math.max(...scales(p)), `${W}`).toBeGreaterThanOrEqual(1.6)
    // The punch line is drawn whole inside the span, clear of every hole.
    const m = /<text x="([\d.]+)" y="([\d.]+)"[^>]*font-size="([\d.]+)"[^>]*>It was the butler\.<\/text>/.exec(p)
    expect(m, `${W}`).not.toBeNull()
    const [lx, ly, fs] = [Number(m?.[1]), Number(m?.[2]), Number(m?.[3])]
    const lw = 18 * fs * 0.5
    const spanW = Math.max(120, st.wide.x2 - 8)
    expect(lx, `${W}`).toBeGreaterThanOrEqual(4)
    expect(lx + lw, `${W}`).toBeLessThanOrEqual(spanW - 6 + 0.5)
    for (const [hx, hy, hw, hh] of [...st.keep, ...st.wide.keep]) {
      const [rx, ry] = [hx - 8, hy - 34]
      const clear = lx >= rx + hw + 4 || rx - 4 >= lx + lw || ly - fs >= ry + hh + 2 || ry - 2 >= ly + 3
      expect(clear, `${W} ${hx},${hy}`).toBe(true)
    }
    const a = audit(p)
    expect(a.dupes).toEqual([])
    expect(a.dupeIds).toEqual([])
    expect(a.chars, `${W}`).toBeLessThanOrEqual(BUDGET.fightBand.band - 1000)
    setMentPlay({ kind: 'walk-by', at: NOW })
    const w = mentBand({ W, H: 134, at: NOW + 3_000, working: true, red: true, stage: st })
    expect(w).toMatch(/clip-rule="evenodd" d="M8 34h\d+v97h/)
    expect(Math.max(...scales(w)), `${W}`).toBeGreaterThanOrEqual(1.6)
    // The rim: his poses as flat red silhouettes behind him (no face, no skin: only the edge catches the light).
    expect(w).toContain('#C42A22')
    expect(w).not.toMatch(/#(F[0-9A-F]B[0-9A-F]8[0-9A-F]|E79E73|F9BE91)/i)
    const b = audit(w)
    expect(b.dupes).toEqual([])
    expect(b.dupeIds).toEqual([])
    expect(b.reduced).toBe(true)
    expect(b.chars, `${W}`).toBeLessThanOrEqual(BUDGET.fightBand.band - 1000)
    setMentPlay(undefined)
    expect(MENT_MS.parlour).toBe(9_000)
  })
}
