// The Skins pane's look: which group a skin sits in, the one-line tagline on its card, which
// skin a secret hides behind and the vague hint its locked card shows, and the banner's
// counts. Pure: no `$`, no state. The unlock phrases live elsewhere and are never shown here.

export type SkinGroup = 'classics' | 'tv' | 'city' | 'yours'
export const SKIN_GROUPS: readonly SkinGroup[] = ['classics', 'tv', 'city', 'yours']

export const GROUP_TITLE: Record<SkinGroup, string> = { classics: 'Classics', tv: 'TV shows', city: 'Night City', yours: 'Your skins' }
export const GROUP_TAGLINE: Record<SkinGroup, string> = {
  classics: 'the crab, and no skin at all',
  tv: 'fan homages; each hides a secret',
  city: 'the Cyberpunk Skins add-on',
  yours: 'from the Custom Claude Skins folder',
}

const TV_CASTS = new Set(['mentalist', 'redjohn', 'breakingbad', 'heisenberg', 'bettercallsaul', 'gene'])
const CITY_CASTS = new Set(['runners', 'netrun', 'corpo', 'samurai', 'edgerunners2', 'capricorn'])

/** The group a skin is shown under: a skin from the folder is "yours" whatever it looks like. */
export const groupOf = (cast: string | undefined, isBuiltIn: boolean): SkinGroup => {
  if (!isBuiltIn) return 'yours'
  const c = cast ?? ''
  if (TV_CASTS.has(c)) return 'tv'
  if (CITY_CASTS.has(c)) return 'city'
  return 'classics'
}

/** The skin a secret hides behind, by the secret's id. SAMURAI hides in Night City as a whole. */
export const SECRET_PARENT: Record<string, string> = {
  'red-john': 'mentalist',
  heisenberg: 'breaking-bad',
  gene: 'better-call-saul',
  samurai: 'cyberpunk-2077',
  capricorn: 'edgerunners-2',
}

/** What a locked card says: where to look, never how to open it. */
export const secretHint = (secretId: string, parentName: string | undefined): string =>
  secretId === 'samurai' ? 'Night City hides a secret' : parentName ? `${parentName} hides a secret` : 'Somewhere, a secret'

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
  'edgerunners-2': "D's optics: a cobalt glass HUD with a ghost in it",
  samurai: 'Red on black, stage lights, never fade away',
  capricorn: 'She owns the HUD now',
}

/** The card's tagline: the short line for a built-in skin, else the description's first clause. */
export const skinTagline = (id: string, description: string): string => {
  const known = TAGLINES[id]
  if (known) return known
  const first = description.split(/(?<=[.!?])\s|:\s/).find(s => s.trim()) ?? ''
  const line = first.trim().replace(/[.!?]+$/, '')
  return line.length > 56 ? `${line.slice(0, 55).trimEnd()}…` : line
}

/** The banner's chips: how many skins there are to pick from, and the secrets found and still hidden. */
export const skinsSummary = (shown: number, found: number, hidden: number): string[] => {
  const n = (k: number, word: string) => `${k} ${word}${k === 1 ? '' : 's'}`
  const out = [n(shown, 'skin')]
  if (found) out.push(`${n(found, 'secret')} found`)
  if (hidden) out.push(`${n(hidden, 'secret')} hidden`)
  return out
}
