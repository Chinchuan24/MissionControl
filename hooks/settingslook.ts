// The Settings pane's look: which colour of the skin's palette names each card, and the
// short line each card's band says in the skin's own voice. Pure: no `$`, no state.

export type SettingsSection = 'money' | 'guard' | 'crew' | 'look' | 'billing'
export const SETTINGS_SECTIONS: readonly SettingsSection[] = ['money', 'guard', 'crew', 'look', 'billing']

type Palette = { warn: string; meter: string; accent: string; accent2: string; done: string; alert: string; muted: string }

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

/**
 * One colour per card, from the skin's own palette: Money its gold (warn), Machine Guard its
 * meter, Crew its accent, Look and feel its second accent, Billing the next distinct colour.
 * A colour already taken, too close to the "on" green, or too dark for a band gives way to the
 * next in the palette, so two cards never share a band and a band never reads as "on" or "off".
 */
export function settingsTones(c: Palette, roles: readonly string[], boss: readonly string[]): Record<SettingsSection, string> {
  const wants: Record<SettingsSection, string> = { money: c.warn, guard: c.meter, crew: c.accent, look: c.accent2, billing: roles[0] ?? c.alert }
  const spare = [c.accent, c.accent2, c.meter, c.warn, c.alert, ...roles, ...boss].filter(isBright)
  const taken: string[] = []
  const free = (x: string) => isBright(x) && distance(x, c.done) >= 48 && distance(x, c.muted) >= 48 && taken.every(t => distance(x, t) >= 72)
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
