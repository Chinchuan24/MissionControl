// What an effect weighs, in the units the host counts: characters of Svg source (not gzip; compression never helps).
// The limits and the per-effect budgets from the engine audit live here once, with the checks every stage test runs:
// size, a duplicate attribute in one tag (it breaks the WHOLE image), an unescaped `<` or `&` in text, a still frame.
import { compact } from '../smooth'

/** Hard limits of the host. One Svg over SVG_MAX is refused (blank); a drawing over DRAW_MAX is refused whole. */
export const SVG_MAX = 131_072
export const DRAW_MAX = 262_144
/** What the plugin aims a whole drawing at, and where the band redraws in "lite". */
export const DRAW_AIM = 220_000
export const BAND_LITE = 120_000

/** Per-effect budgets in chars (engine audit, section 6). `band` and `card` (one pane card). */
export const BUDGET = {
  idle: { band: 1_500, card: 1_500 },
  entrance: { band: 1_000, card: 1_000 },
  number: { band: 1_000, card: 1_000 },
  light: { band: 1_500, card: 1_500 },
  parallax: { band: 8_000, card: 6_000 },
  voxel: { band: 1_000, card: 1_000 },
  turnaround: { band: 12_000, card: 20_000 },
  wipe: { band: 8_000, card: 5_000 },
  fightBand: { band: 32_000, card: 0 },
  fightAct: { band: 0, card: 36_000 },
  /** Every motion layer at once on the band; on the pane it is the theme's `<!--dl-->` reserve. */
  total: { band: 70_000, card: 100_000 },
} as const
export type BudgetKind = keyof typeof BUDGET

/** Chars as the desktop receives them: after `compact` (dead CSS dropped), which is what `steady` sends. */
export const chars = (svg: string): number => compact(svg).length

/** Within a budget? `surface` picks the band or card column. */
export const fits = (svg: string, kind: BudgetKind, surface: 'band' | 'card' = 'card'): boolean => chars(svg) <= BUDGET[kind][surface]

/** Each attribute named twice in one tag: one is enough to turn the whole Svg into a broken-image icon. */
export const dupes = (svg: string): string[] => {
  const out: string[] = []
  for (const tag of svg.match(/<[a-zA-Z][^<>]*>/g) ?? []) {
    const names = [...tag.matchAll(/\s([a-zA-Z:-]+)=/g)].map(m => m[1])
    const seen = new Set<string>()
    for (const n of names) {
      if (seen.has(n as string)) out.push(`${n} in ${tag.slice(0, 80)}`)
      seen.add(n as string)
    }
  }
  return out
}

/** Text nodes holding a raw `<` or a bare `&` (an entity is fine): also a broken image. Style blocks are skipped. */
export const badText = (svg: string): string[] => {
  const out: string[] = []
  const body = svg.replace(/<style>[\s\S]*?<\/style>/g, '')
  for (const m of body.matchAll(/>([^<>]*)</g)) {
    const t = m[1] ?? ''
    if (/&(?!(?:[a-zA-Z]+|#\d+|#x[\da-fA-F]+);)/.test(t)) out.push(t.slice(0, 60))
  }
  for (const m of body.matchAll(/<(?![a-zA-Z/!?])/g)) out.push(body.slice(m.index ?? 0, (m.index ?? 0) + 30))
  return out
}

/** Text escaped for an Svg text node or attribute. */
export const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Every `id="..."` defined more than once (two acts in one Svg must not share ids). */
export const dupeIds = (svg: string): string[] => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const m of svg.matchAll(/\sid="([^"]+)"/g)) { const id = m[1] as string; if (seen.has(id)) out.push(id); seen.add(id) }
  return out
}

/** A ready-made report for tests: size after compact, and every structural fault found. */
export const audit = (svg: string): { chars: number; dupes: string[]; badText: string[]; dupeIds: string[]; reduced: boolean } => ({
  chars: chars(svg),
  dupes: dupes(svg),
  badText: badText(svg),
  dupeIds: dupeIds(svg),
  reduced: svg.includes('prefers-reduced-motion: reduce'),
})

/** Wraps a layer as a whole Svg document (for measuring and previews). */
export const doc = (W: number, H: number, inner: string, bg = ''): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bg ? `<rect width="${W}" height="${H}" fill="${bg}"/>` : ''}${inner}</svg>`
