// The shared replay registry: `/missioncontrol play <name>` for every skin. The plan promises a replay name for every fight;
// a skin registers each one here (and any other act worth replaying) for the skin ids it plays on, and the command asks the
// WORN skin. The registry never draws: `run` stores the act as the skin's typed act, pinned to `at`, exactly as when it is
// typed, and the command redraws both panels.
//
//   registerPlay(['cyberpunk-2077'], { name: 'maxtac', what: 'the MaxTac raid', run: at => { CP_FX = { kind: 'maxtac', at } } })
//   playsFrom(['the-boys', 'solidgold', 'noir'], dir, s => { BOYS_FX = s })   // every director bit that has a `replay` name
//
// The Boys (theboys-eggs.ts `REPLAYS`) and Invincible (register.tsx `INV_REPLAYS`) keep their own older lists; the command
// tries this registry first, and their "Play which?" lists name what is registered here too.
import type { Director, Slot } from './director'

export type Play = {
  /** What `/missioncontrol play <name>` takes: lower case letters, digits and dashes, 1-32 long. */
  name: string
  /** One short line for the list ("the MaxTac raid"). */
  what: string
  /** Starts it now: store the act as the skin's typed act, pinned to `at`. Return a string to answer with it instead of `▶ name`. */
  run: (at: number) => void | string | Promise<void | string>
}
const REG = new Map<string, Map<string, Play>>()
export const PLAY_NAME = /^[a-z0-9][a-z0-9-]{0,31}$/

/** Offers `p` on each skin id in `skins` (the worn `SKIN.id`). The same name again on a skin replaces it. */
export const registerPlay = (skins: string | string[], p: Play): void => {
  if (!PLAY_NAME.test(p.name)) throw new Error(`stage/replay: bad play name "${p.name}" (a-z, 0-9, dashes)`)
  for (const skin of typeof skins === 'string' ? [skins] : skins) {
    const m = REG.get(skin) ?? new Map<string, Play>()
    m.set(p.name, p)
    REG.set(skin, m)
  }
}
/** Every play a skin offers, in the order registered. */
export const playsOf = (skin: string): Play[] => [...(REG.get(skin)?.values() ?? [])]
/** One play by name (any case), or undefined. */
export const playOf = (skin: string, name: string): Play | undefined => REG.get(skin)?.get(name.trim().toLowerCase())
/** Registers every director bit that has a `replay` name; `start` gets the bit as a slot from `at` (store it as the typed act). */
export const playsFrom = (skins: string | string[], dir: Director, start: (s: Slot) => void, what: (name: string) => string = n => n): void => {
  for (const name of dir.replays()) registerPlay(skins, { name, what: what(name), run: at => { const s = dir.play(name, at); if (s) start(s) } })
}
/** `/missioncontrol play <name>` on the worn skin: the reply, or undefined when the skin offers no play of that name. */
export const runPlay = async (skin: string, name: string, at: number): Promise<string | undefined> => {
  const p = playOf(skin, name)
  if (!p) return undefined
  const said = await p.run(at)
  return typeof said === 'string' ? said : `▶ ${p.name}`
}
/** Forgets one skin's plays, or all (tests). */
export const clearPlays = (skin?: string): void => { if (skin === undefined) REG.clear(); else REG.delete(skin) }
