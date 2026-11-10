// Pixel frames: a `Sprite` (rows of letters + a palette, hooks/cast.ts) cut into merged rectangles, one <path> per colour,
// with the palette quantised to K colours. Each pose sits in <defs> ONCE per Svg and is shown with <use>, so a pose
// reused ten times costs once. A frame-swap track toggles poses with steps(1) opacity keyframes.
// Cost: ~2.6 chars per bounding-box pixel at K=8 (median 2.25 k for a 31x22 pose), 2.5x leaner than `spriteMarkup`.
//
// PNG frames (<image href="data:image/png...">) are NOT a backend here: the probe could not prove the host keeps them
// (skins-audit/probe.md). Rect paths are the one frame format.
import type { Sprite } from '../cast'

/** FNV-1a: a stable 32-bit hash of any text (ids, seeds, cache keys). */
export const hash = (s: string): number => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0 } return h }
/** A short id-safe token for a text: a letter then base 36. */
export const tag = (s: string, len = 4): string => `s${(hash(s) % 36 ** len).toString(36).padStart(len, '0')}`

const r3 = (n: number): number => Math.round(n * 1000) / 1000

// ---------------------------------------------------------------- quantise + rectangles (lifted from invincible-fight.ts)
const hex3 = (h: string): number[] => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const d2 = (a: string, b: string): number => {
  const x = hex3(a)
  const y = hex3(b)
  return ((x[0] ?? 0) - (y[0] ?? 0)) ** 2 + ((x[1] ?? 0) - (y[1] ?? 0)) ** 2 + ((x[2] ?? 0) - (y[2] ?? 0)) ** 2
}

/**
 * The palette folded to at most `K` colours: the least used colour merges into its nearest, until K remain.
 * Returns colour -> colour it is drawn as.
 */
export const quantise = (sp: Sprite, K: number): Map<string, string> => {
  const count = new Map<string, number>()
  for (const r of sp.rows) for (const ch of r) { const c = ch === '.' ? undefined : sp.pal[ch]; if (c) count.set(c, (count.get(c) ?? 0) + 1) }
  let cols = [...count.keys()]
  const map = new Map<string, string>(cols.map(c => [c, c]))
  while (cols.length > K) {
    cols.sort((a, b) => (count.get(a) ?? 0) - (count.get(b) ?? 0))
    const a = cols[0] as string
    let best = cols[1] as string
    let bd = Infinity
    for (const b of cols.slice(1)) { const d = d2(a, b); if (d < bd) { bd = d; best = b } }
    count.set(best, (count.get(best) ?? 0) + (count.get(a) ?? 0))
    for (const [k, v] of map) if (v === a) map.set(k, best)
    cols = cols.slice(1)
  }
  return map
}

// Greedy rectangle cover of one colour grid: each cell once, runs merged right then down.
const cover = (grid: (string | undefined)[][], w: number, h: number): Map<string, string> => {
  const used = grid.map(r => r.map(() => false))
  const by = new Map<string, string>()
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = grid[y]?.[x]
      if (!c || used[y]?.[x]) continue
      let rw = 1
      while (x + rw < w && grid[y]?.[x + rw] === c && !used[y]?.[x + rw]) rw++
      let rh = 1
      for (; y + rh < h; rh++) {
        let ok = true
        for (let i = 0; i < rw; i++) if (grid[y + rh]?.[x + i] !== c || used[y + rh]?.[x + i]) { ok = false; break }
        if (!ok) break
      }
      for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) (used[y + j] as boolean[])[x + i] = true
      by.set(c, `${by.get(c) ?? ''}M${x} ${y}h${rw}v${rh}h-${rw}z`)
    }
  }
  return by
}

const PATHS = new Map<string, string>()
const keyOf = (sp: Sprite, K: number): string => `${sp.rows.length}|${sp.rows[0]?.length}|${hash(sp.rows.join(''))}|${hash(JSON.stringify(sp.pal))}|${K}`

/** The `<path>`s of a sprite in pixel units (one per colour), rectangles merged, at most `K` colours. Cached. */
export const rectPaths = (sp: Sprite, K: number): string => {
  const key = keyOf(sp, K)
  const hit = PATHS.get(key)
  if (hit !== undefined) return hit
  const map = quantise(sp, K)
  const h = sp.rows.length
  const w = sp.rows[0]?.length ?? 0
  const grid = sp.rows.map(r => [...r].map(ch => { const c = ch === '.' ? undefined : sp.pal[ch]; return c ? (map.get(c) ?? c) : undefined }))
  const out = [...cover(grid, w, h).entries()].map(([c, d]) => `<path fill="${c}" d="${d}"/>`).join('')
  PATHS.set(key, out)
  return out
}

/** The sprite's silhouette as ONE path `d` (every filled pixel, colour ignored): for clips, masks, extrusion, rim light. */
export const silhouette = (sp: Sprite): string => {
  const h = sp.rows.length
  const w = sp.rows[0]?.length ?? 0
  const grid = sp.rows.map(r => [...r].map(ch => (ch !== '.' && sp.pal[ch] ? 'x' : undefined)))
  return cover(grid, w, h).get('x') ?? ''
}

/** Sprite size in pixels. */
export const size = (sp: Sprite): { w: number; h: number } => ({ w: Math.max(0, ...sp.rows.map(r => r.length)), h: sp.rows.length })

// ---------------------------------------------------------------- the <defs> cache
export type Pose = { id: string; w: number; h: number; ax: number }

/**
 * One Svg's poses. `add` cuts a sprite once into <defs> under `prefix` (ids never clash with another act's bank);
 * `use` places it, anchored at its body (`ax`: fraction of the width the body stands at; the vertical centre), facing
 * `dir` (-1 mirrors), scaled `sc` pixels per sprite pixel.
 */
export class FrameBank {
  private poses = new Map<string, Pose & { sp: Sprite; K?: number }>()
  private made = new Set<string>()
  private out = ''
  constructor(readonly prefix: string, readonly K = 6) {}
  /**
   * Register a pose under `key` (cheap: nothing is cut until it is used). `K` keeps more (or fewer) colours for this pose
   * than the bank's: a face with a one-pixel scar needs its scar colour, the crowd around it does not.
   */
  add(key: string, sp: Sprite, ax = 0.5, K?: number): this {
    const { w, h } = size(sp)
    this.poses.set(key, { id: `${this.prefix}${key.replace(/[^\w-]/g, '_')}`, w, h, ax, sp, ...(K !== undefined ? { K } : {}) })
    return this
  }
  has(key: string): boolean { return this.poses.has(key) }
  /** The pose, cut into the defs on first ask. Throws for an unknown key: a typo must fail a test, not draw nothing. */
  pose(key: string): Pose { return this.entry(key) }
  private entry(key: string): Pose & { sp: Sprite; K?: number } {
    const p = this.poses.get(key)
    if (!p) throw new Error(`stage/frames: no pose "${key}" in bank ${this.prefix}`)
    if (!this.made.has(p.id)) { this.made.add(p.id); this.out += `<g id="${p.id}">${rectPaths(p.sp, p.K ?? this.K)}</g>` }
    return p
  }
  /** The silhouette path of a pose as a def (id `<pose id>-k`): a `<use>` of it is valid inside a clipPath or mask. */
  sil(key: string): string {
    const p = this.entry(key)
    const id = `${p.id}-k`
    if (!this.made.has(id)) { this.made.add(id); this.out += `<path id="${id}" d="${silhouette(p.sp)}"/>` }
    return id
  }
  /** The transform that anchors a pose at the local origin: body at x=0, vertical centre at y=0. */
  anchor(key: string, dir: 1 | -1 = 1, sc = 1): string {
    const p = this.pose(key)
    return `scale(${r3(dir * sc)} ${r3(sc)}) translate(${r3(-p.ax * p.w)} ${r3(-p.h / 2)})`
  }
  /** A `<use>` of the pose anchored at (x, y). */
  use(key: string, x: number, y: number, dir: 1 | -1 = 1, sc = 1, extra = ''): string {
    const p = this.pose(key)
    return `<use href="#${p.id}" transform="translate(${r3(x)} ${r3(y)}) ${this.anchor(key, dir, sc)}"${extra ? ` ${extra}` : ''}/>`
  }
  /** Every pose cut so far: put inside the Svg's <defs>. */
  defs(): string { return this.out }
  /** How many unique poses were cut (what the budget counts). */
  count(): number { return [...this.made].filter(id => !id.endsWith('-k')).length }
}

// ---------------------------------------------------------------- frame-swap tracks
/** A window [t0, t1) in which one pose shows, in seconds of the act. */
export type Window = [number, number]

/**
 * The keyframes (percent rows) that show a pose only inside its windows: opacity 0/1 with steps(1). `pc` maps act
 * seconds to percent of the act's duration.
 */
export const swapRows = (wins: Window[], pc: (t: number) => number): [number, string][] => {
  const rows: [number, string][] = [[0, 'opacity:0']]
  for (const [a, b] of [...wins].sort((x, y) => x[0] - y[0])) rows.push([pc(a), 'opacity:1'], [pc(b), 'opacity:0'])
  if ((rows[rows.length - 1]?.[0] ?? 0) < 100) rows.push([100, 'opacity:0'])
  return rows
}

/**
 * An idle flipbook (breath, blink, a flag): `keys` shown in turn, `hold` s each, forever, steps(1), at (x, y).
 * Endless, so `phased` keeps it in step across redraws. Reduced motion: the first pose, still (`cls` is stopped).
 * Cost: one <use> and ~70 chars of CSS per pose, plus the poses' defs.
 */
export const flipbook = (bank: FrameBank, cls: string, keys: string[], x: number, y: number, hold: number, dir: 1 | -1 = 1, sc = 1): { svg: string; css: string } => {
  const n = keys.length
  const T = r3(n * hold)
  const css = `@keyframes ${cls}{0%{opacity:1}${r3(100 / n)}%,100%{opacity:0}}`
  const svg = keys
    .map((k, i) => `<g class="${cls}" style="animation:${cls} ${T}s steps(1) infinite ${r3((i - n) * hold)}s"${i ? ' opacity="0"' : ''}>${bank.use(k, x, y, dir, sc)}</g>`)
    .join('')
  return { svg, css: `${css}@media (prefers-reduced-motion: reduce){.${cls}{animation:none!important}}` }
}
