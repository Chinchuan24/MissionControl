// The Skins pane's look: which group a skin sits in, the one-line tagline on its card, and the
// banner's count. Pure: no `$`, no state. Nothing here hints that anything is hidden.

export type SkinGroup = 'classics' | 'tv' | 'city' | 'yours'
export const SKIN_GROUPS: readonly SkinGroup[] = ['classics', 'tv', 'city', 'yours']

export const GROUP_TITLE: Record<SkinGroup, string> = { classics: 'Classics', tv: 'TV shows', city: 'Night City', yours: 'Your skins' }
export const GROUP_TAGLINE: Record<SkinGroup, string> = {
  classics: 'the crab, and no skin at all',
  tv: 'fan homages',
  city: 'the Cyberpunk Skins add-on',
  yours: 'from the Custom Claude Skins folder',
}

const TV_CASTS = new Set(['mentalist', 'redjohn', 'breakingbad', 'heisenberg', 'bettercallsaul', 'gene', 'invincible', 'invincible2'])
const CITY_CASTS = new Set(['runners', 'netrun', 'corpo', 'samurai', 'edgerunners2', 'capricorn'])

/** The group a skin is shown under: a skin from the folder is "yours" whatever it looks like. */
export const groupOf = (cast: string | undefined, isBuiltIn: boolean): SkinGroup => {
  if (!isBuiltIn) return 'yours'
  const c = cast ?? ''
  if (TV_CASTS.has(c)) return 'tv'
  if (CITY_CASTS.has(c)) return 'city'
  return 'classics'
}

// One line per card: the description, cut to its look.
const TAGLINES: Record<string, string> = {
  default: 'No skin: plain greys, system font',
  'crab-classic': 'Soft violet, gold boss, rounded cards',
  mentalist: 'Jane and the CBI: black, navy, crisp white',
  'red-john': 'Red on near-black. He is watching',
  'breaking-bad': 'Crystal blue on desert green-black',
  heisenberg: 'Black and white, with a little blue',
  'better-call-saul': 'Powder blue and gold on dark walnut',
  gene: 'Black and white, with film grain',
  'cyberpunk-2077': 'Neon yellow, hot red, cut corners, scanlines',
  arasaka: 'Blood red on black, hard edges, no noise',
  'lucy-edgerunners': 'Rose-pink and cyan on deep violet',
  'edgerunners-2': "D's optics: a cobalt glass HUD",
  samurai: 'Red on black, stage lights, never fade away',
  capricorn: 'She owns the HUD now',
  invincible: 'The comic page: Mark and Omni-Man across the panels',
  caliper: 'Graphite and ice: a dial, a ruler, one blue',
}

/** The card's tagline: the short line for a built-in skin, else the description's first clause. */
export const skinTagline = (id: string, description: string): string => {
  const known = TAGLINES[id]
  if (known) return known
  const first = description.split(/(?<=[.!?])\s|:\s/).find(s => s.trim()) ?? ''
  const line = first.trim().replace(/[.!?]+$/, '')
  return line.length > 56 ? `${line.slice(0, 55).trimEnd()}…` : line
}

/** The banner's chip: how many skins there are to pick from. */
export const skinsSummary = (shown: number): string[] => [`${shown} skin${shown === 1 ? '' : 's'}`]
