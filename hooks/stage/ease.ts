// Named easing curves for every act, so skins stop hand-copying cubic-beziers. The names are the motion words the
// crew uses: a curve is picked by what the move should feel like, not by its numbers.
//   snap        lands hard and fast, no bounce          (ER2's cut-ins, a card slapped down)
//   settle      glides in and comes to rest softly      (The Boys' slips and captions)
//   overshoot   passes the mark and springs back        (Invincible's pops and title cards)
//   anticipate  pulls back first, then goes             (a wind-up before a throw)
//   whip        slow, very fast, slow                   (a whip pan between two framings)
// `curve(name)` evaluates one in JS, for sampling a path or a camera move into keys.

export const EASE = {
  linear: 'linear',
  snap: 'cubic-bezier(.2,.9,.2,1)',
  settle: 'cubic-bezier(.2,.9,.3,1)',
  overshoot: 'cubic-bezier(.2,1.4,.4,1)',
  anticipate: 'cubic-bezier(.6,-.35,.7,1)',
  whip: 'cubic-bezier(.7,0,.3,1)',
} as const
export type Ease = keyof typeof EASE

/** The CSS timing function for a name; any other string (a `steps(3)`, a custom bezier) passes through. */
export const ease = (e: Ease | string | undefined): string => (e === undefined ? EASE.linear : (EASE as Record<string, string>)[e] ?? e)

/** `steps(n)`: a held, frame-by-frame move (pixel art, idle loops). `jump` is the CSS step position. */
export const steps = (n: number, jump: 'end' | 'start' | 'jump-none' = 'end'): string => `steps(${Math.max(1, Math.round(n))}${jump === 'end' ? '' : `,${jump}`})`

const BEZ = /^cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)$/

/** The curve as a function of progress u (0..1) to eased progress; `linear` and `steps(n)` are handled too. */
export const curve = (e: Ease | string): ((u: number) => number) => {
  const css = ease(e)
  const st = /^steps\((\d+)/.exec(css)
  if (st) { const n = Number(st[1]); return u => (u >= 1 ? 1 : Math.floor(u * n) / n) }
  const m = BEZ.exec(css)
  if (!m) return u => u
  const [x1, y1, x2, y2] = [m[1], m[2], m[3], m[4]].map(Number) as [number, number, number, number]
  const bx = (t: number): number => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t ** 2 * (1 - t) + t ** 3
  const by = (t: number): number => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t ** 2 * (1 - t) + t ** 3
  return u => {
    if (u <= 0) return 0
    if (u >= 1) return 1
    let lo = 0
    let hi = 1
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (bx(mid) < u) lo = mid; else hi = mid }
    return by((lo + hi) / 2)
  }
}
