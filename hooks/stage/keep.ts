// Keep-out for band acts: motion never covers the working numbers. The band tells an act where its readouts are (`BandStage`):
// the clear span on the left (`x1`, left of the first readout on the right: the crew and role chips, the percent, TODAY/TURN,
// the readout column) and the readouts INSIDE that span (`keep`: the Tasks chip, the step count). An act clips itself to its
// window MINUS those boxes (`keepClip`, even-odd holes): a fighter passes BEHIND a number, never over it. The header row is never
// in a window (every window starts under its rule, y >= 33).

export type Rect = [number, number, number, number]
/** What the band hands a band act: the clear span's right edge and the readouts inside it (x, y, w, h). `wide`, when the band
 *  gives it: a wider window (to `x2`) for an act that keeps out of each row's own readouts (`keep` there holds those rows'
 *  right parts, as holes, on top of the span's own). */
export type BandStage = { x1: number; keep: Rect[]; wide?: { x2: number; keep: Rect[] }; /** The task title's box, when the band has one (not a hole by default: a fight with a lane clear of it adds it). */ title?: Rect }

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

/** Do two boxes overlap? */
export const meets = (a: Rect, b: Rect): boolean => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]
/**
 * The largest empty rectangles of a region w by h around `holes` (each kept `pad` px clear, 2 px above and below): where a
 * piece of an act can stand whole. Brute force over the holes' edges (a band has two holes), the maximal ones only.
 */
export const freeRects = (w: number, h: number, holes: Rect[], pad = 4): Rect[] => {
  const hs = holes.map(([x, y, hw, hh]) => [x - pad, y - 2, hw + pad * 2, hh + 4] as Rect)
  const edges = (v: number[], max: number): number[] => [...new Set([0, max, ...v].map(n => Math.max(0, Math.min(max, n))))].sort((a, b) => a - b)
  const xs = edges(hs.flatMap(([x, , hw]) => [x, x + hw]), w)
  const ys = edges(hs.flatMap(([, y, , hh]) => [y, y + hh]), h)
  const all: Rect[] = []
  xs.forEach((x0, i) => xs.slice(i + 1).forEach(x1 => ys.forEach((y0, k) => ys.slice(k + 1).forEach(y1 => {
    const r: Rect = [x0, y0, x1 - x0, y1 - y0]
    if (!hs.some(q => meets(r, q))) all.push(r)
  }))))
  const inside = (a: Rect, b: Rect): boolean => b[0] <= a[0] && b[1] <= a[1] && b[0] + b[2] >= a[0] + a[2] && b[1] + b[3] >= a[1] + a[3]
  return all.filter((a, i) => !all.some((b, j) => j !== i && inside(a, b)))
}
/**
 * A band act's whole clear span under the header (the task row, the step row, the tip line), from the figure box to the band's
 * wide edge (each row up to its own first readout), and its keep-out: the span's own readouts plus, in the wide window, the
 * rows' right parts. For an act that places every piece in a free rectangle (`freeRects`).
 */
export const spanOf = (H: number, stage: BandStage): { r: { x: number; y: number; w: number; h: number }; keep: BandStage } => ({
  r: { x: 8, y: 34, w: Math.round(Math.max(120, (stage.wide?.x2 ?? stage.x1) - 8)), h: Math.max(56, H - 37) },
  keep: { x1: stage.wide?.x2 ?? stage.x1, keep: [...stage.keep, ...(stage.wide?.keep ?? [])] },
})
/**
 * The widest full-height lane of a window `win` (x, y, w, h) free of every hole that meets it (each kept `pad` px clear), when it
 * is at least `min` wide: where a band act can stand tall without passing over the task title, a chip or a number (wave 4). The
 * holes are the band's: its readouts, each row's right part, and the task title (`BandStage.title`).
 */
export const laneIn = (win: Rect, holes: Rect[], min: number, pad = 4): Rect | undefined => {
  const [wx, wy, ww, wh] = win
  const hit = holesIn(win, holes)
  const xs = [wx, wx + ww, ...hit.flatMap(([x, , w]) => [x - pad, x + w + pad])].map(v => Math.max(wx, Math.min(wx + ww, v))).sort((p, q) => p - q)
  let best: Rect | undefined
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i] as number
    const b = xs[i + 1] as number
    if (b - a >= min && b - a > (best?.[2] ?? 0) && !hit.some(([x, , w]) => x < b && x + w > a)) best = [Math.round(a), wy, Math.round(b - a), wh]
  }
  return best
}
/** Every hole a band act keeps clear of on a staged band: its readouts, the wide window's row parts, the task title. */
export const allHoles = (stage: BandStage): Rect[] => [...stage.keep, ...(stage.wide?.keep ?? []), ...(stage.title ? [stage.title] : [])]
