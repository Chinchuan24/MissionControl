// The Settings pane's look: which colour of the skin's palette names each card, and the
// short line each card's band says in the skin's own voice. Pure: no `$`, no state.

export type SettingsSection = 'money' | 'guard' | 'crew' | 'look' | 'billing'
export const SETTINGS_SECTIONS: readonly SettingsSection[] = ['money', 'guard', 'crew', 'look', 'billing']

type Palette = { warn: string; meter: string; accent: string; accent2: string; done: string; alert: string; muted: string; text: string }

const rgbOf = (c: string): [number, number, number] | null => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim())
  if (!m) return null
  const h = m[1]!.length === 3 ? [...m[1]!].map(x => x + x).join('') : m[1]!
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}
const distance = (a: string, b: string): number => {
  const x = rgbOf(a)
  const y = rgbOf(b)
  if (!x || !y) return a.trim().toLowerCase() === b.trim().toLowerCase() ? 0 : 999
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
}
// Bright enough to be a band on the skin's dark tile (a near-black boss stop is no band).
const isBright = (c: string): boolean => {
  const v = rgbOf(c)
  return !v || Math.max(...v) >= 90
}

// Hue in degrees and HSL saturation, 0..1; a colour it cannot read is grey.
const hueSat = (c: string): { h: number; s: number } => {
  const v = rgbOf(c)
  if (!v) return { h: 0, s: 0 }
  const [r, g, b] = v.map(x => x / 255) as [number, number, number]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  if (!d) return { h: 0, s: 0 }
  const l = (max + min) / 2
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: h * 60, s: d / (1 - Math.abs(2 * l - 1)) }
}
const hueGap = (a: string, b: string): number => {
  const d = Math.abs(hueSat(a).h - hueSat(b).h) % 360
  return Math.min(d, 360 - d)
}
// Of the same hue family as `like`, and coloured enough to read as it (a grey is no family).
const isKin = (x: string, like: string): boolean => hueSat(x).s > 0.3 && hueSat(like).s > 0.3 && hueGap(x, like) < 22

// Halfway from one colour to another: a paler tint when the palette runs out of distinct colours.
const mix = (a: string, b: string, t: number): string => {
  const x = rgbOf(a)
  const y = rgbOf(b)
  if (!x || !y) return a
  return `#${x.map((v, i) => Math.round(v + ((y[i] as number) - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

/**
 * One colour per card, from the skin's own palette: Money its gold (warn), Machine Guard its
 * meter, Crew its accent, Look and feel its second accent, Billing its first role colour.
 * A colour already taken, too dark for a band, of the "on" green's hue, near the "off" grey, or
 * of the alert red's hue gives way to the next in the palette, then to a paler tint of the accents. Red
 * is left to warnings, unless red is the skin's own accent (Arasaka, SAMURAI, CAPRICORN).
 */
export function settingsTones(c: Palette, roles: readonly string[], boss: readonly string[]): Record<SettingsSection, string> {
  const wants: Record<SettingsSection, string> = { money: c.warn, guard: c.meter, crew: c.accent, look: c.accent2, billing: roles[0] ?? c.accent2 }
  const tints = [c.accent, c.accent2, c.meter, c.warn].map(x => mix(x, c.text, 0.5))
  const spare = [c.accent, c.accent2, c.meter, c.warn, ...roles, ...boss, ...tints, c.text]
  const taken: string[] = []
  // Red is the brand where the skin's own accent is red; elsewhere a red band would read as an error.
  const isRedBrand = isKin(c.accent, c.alert)
  const free = (x: string) =>
    isBright(x) && (isRedBrand || !isKin(x, c.alert)) && !isKin(x, c.done) && distance(x, c.muted) >= 48 && taken.every(t => distance(x, t) >= 72)
  const out = {} as Record<SettingsSection, string>
  for (const k of SETTINGS_SECTIONS) {
    const pick = free(wants[k]) ? wants[k] : (spare.find(free) ?? wants[k])
    out[k] = pick
    taken.push(pick)
  }
  return out
}

type Voice = Record<SettingsSection, string>
const CRAB_VOICE: Voice = { money: 'keep the meter honest', guard: 'no melted laptops', crew: 'who scuttles where', look: 'shell and colours', billing: 'who pays the tab' }
const CYBER_VOICE: Voice = { money: 'count every eddie', guard: "don't fry the deck", crew: 'pick your crew', look: 'new chrome', billing: 'pay the fixer' }
const MENTALIST_VOICE: Voice = { money: 'follow the money', guard: 'keep the office standing', crew: 'assemble the team', look: 'a good suit matters', billing: 'expenses, signed off' }
const BB_VOICE: Voice = { money: 'keep the books clean', guard: "don't blow up the lab", crew: 'the cook crew', look: 'dress the lab', billing: 'better call the accountant' }
const VOICES: Record<string, Voice> = {
  runners: CYBER_VOICE,
  corpo: CYBER_VOICE,
  netrun: CYBER_VOICE,
  samurai: CYBER_VOICE,
  edgerunners2: CYBER_VOICE,
  capricorn: CYBER_VOICE,
  mentalist: MENTALIST_VOICE,
  redjohn: MENTALIST_VOICE,
  breakingbad: BB_VOICE,
  heisenberg: BB_VOICE,
}

/** The card's tagline in the voice of the skin's cast (the crab's when it has none). */
export const settingsTagline = (cast: string | undefined, section: SettingsSection): string => (VOICES[cast ?? ''] ?? CRAB_VOICE)[section]

/** "RAM 15 GB → 30 agents": the limit in force and the crew size it allows, from the Auto label and the setting. */
export function ramStatus(autoLabel: string, maxAgents: number, ramLabel: string): string {
  const gb = /\(([\d.]+) GB ÷/.exec(autoLabel)?.[1]
  const auto = Number(/Auto · (\d+)/.exec(autoLabel)?.[1]) || 0
  const n = maxAgents || auto
  return `RAM ${gb ? `${gb} GB` : ramLabel}${n ? ` → ${n} agent${n === 1 ? '' : 's'}` : ''}`
}
