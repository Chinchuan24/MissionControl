// Keep-out for band acts: motion never covers the working numbers. The band tells an act where its readouts are (`BandStage`):
// the clear span on the left (`x1`, left of the first readout on the right: the crew and role chips, the percent, TODAY/TURN,
// the readout column) and the readouts INSIDE that span (`keep`: the Tasks chip, the step count). An act clips itself to its
// window MINUS those boxes (`keepClip`, even-odd holes): a fighter passes BEHIND a number, never over it. The header row is never
// in a window (every window starts under its rule, y >= 33).

export type Rect = [number, number, number, number]
/** What the band hands a band act: the clear span's right edge and the readouts inside it (x, y, w, h). */
export type BandStage = { x1: number; keep: Rect[] }

/** The holes of `keep` that fall inside `win`, clipped to it (an even-odd hole outside the window would show, not hide). */
export const holesIn = (win: Rect, keep: Rect[]): Rect[] => {
  const [wx, wy, ww, wh] = win
  const out: Rect[] = []
  for (const [x, y, w, h] of keep) {
    const x0 = Math.max(wx, x)
    const y0 = Math.max(wy, y)
    const x1 = Math.min(wx + ww, x + w)
    const y1 = Math.min(wy + wh, y + h)
    if (x1 > x0 && y1 > y0) out.push([x0, y0, x1 - x0, y1 - y0])
  }
  return out
}
const box = ([x, y, w, h]: Rect): string => `M${Math.round(x)} ${Math.round(y)}h${Math.round(w)}v${Math.round(h)}h${-Math.round(w)}z`
/** A `<clipPath>`: the window minus the readouts inside it (the even-odd rule marks it for the band's keep-out test). */
export const keepClip = (id: string, win: Rect, keep: Rect[] = []): string =>
  `<clipPath id="${id}"><path clip-rule="evenodd" d="${box(win)}${holesIn(win, keep).map(box).join('')}"/></clipPath>`

/** The text boxes of a band's readouts: every text with a digit, %, $ or a short ALL-CAPS label (prose, like the tip, is left
 *  out: the act's scrim may dim it; so is a prop's small lettering). Widths are generous estimates (0.66 em a glyph plus letter-spacing). */
export const readouts = (svg: string): Rect[] => {
  const out: Rect[] = []
  for (const m of svg.matchAll(/<text([^>]*)>([\s\S]*?)<\/text>/g)) {
    const a = m[1] as string
    const t = (m[2] as string).replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, 'x').trim()
    if (!t || t.length > 30) continue
    if (!/[0-9%$]/.test(t) && !(/^[A-Z][A-Z0-9 ·/\-]+$/.test(t) && t.length <= 14)) continue
    const n = (k: string, d = 0): number => { const v = new RegExp(` ${k}="([-\\d.]+)"`).exec(a); return v ? Number(v[1]) : d }
    const fs = n('font-size', 12)
    if (fs < 9) continue // a prop's lettering (a slate, a bug), not a readout: every band readout is 9.5 px or more
    const w = t.length * (fs * 0.66 + n('letter-spacing'))
    const anchor = /text-anchor="(\w+)"/.exec(a)?.[1]
    const x = n('x') - (anchor === 'end' ? w : anchor === 'middle' ? w / 2 : 0)
    out.push([x, n('y') - fs * 0.8, w, fs])
  }
  return out
}
/** The readouts an act's keep-out clip would let it draw over: inside the window and not inside one of its holes. */
export const overlaps = (boxes: Rect[], clipD: string): Rect[] => {
  const rects = [...clipD.matchAll(/M([-\d.]+) ([-\d.]+)h([-\d.]+)v([-\d.]+)/g)].map(m => [1, 2, 3, 4].map(i => Number(m[i])) as Rect)
  const [win, ...holes] = rects
  if (!win) return boxes
  const meet = (a: Rect, b: Rect): boolean => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]
  const inside = (a: Rect, b: Rect): boolean => a[0] >= b[0] - 0.5 && a[1] >= b[1] - 0.5 && a[0] + a[2] <= b[0] + b[2] + 0.5 && a[1] + a[3] <= b[1] + b[3] + 0.5
  // A box is safe when outside the window, or when the window's part of it lies inside a hole.
  return boxes.filter(b => meet(b, win) && !holes.some(h => holesIn(win, [b]).every(p => inside(p, h))))
}
