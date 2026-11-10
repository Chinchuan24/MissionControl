// Each skin's own flavour of the shared skin switch (stage/wipe.ts skinSwitch), with its emblem (art set 015 / 029, 32 x 32 coins
// in emblems-sprites.ts): Invincible's fist punches out of the panel, The Boys' cracked gold star slams in and spins like a coin
// on the broadcast wipe, NOIR's film reel drops in with the curtain and turns like a projector reel. Band only for the emblem
// (about 3.5 k of the switch's 8 k); the cards get the wipe's direction and bar, no emblem (5 k a card).
import type { Act } from './stage/timeline'
import type { SwitchFlavour } from './stage/wipe'
import { INV_EMBLEM, NOIR_EMBLEM, TB_EMBLEM } from './emblems-sprites'

/** The emblem on the band: slammed in from 1.5x, then its own turn, gone with the wipe. Hidden under reduced motion (the act's). */
const emblem = (act: Act, key: string, sp: typeof TB_EMBLEM, turn: 'coin' | 'reel' | 'punch'): string => {
  act.cast(key, sp, 0.5, 6)
  // Over the task title (prose), clear of the step count, the Tasks chip and the header: 42 px, slammed from 63.
  const x = 160
  const y = Math.round(Math.min(66, act.H / 2))
  const T = act.T
  const spin: [number, string][] = turn === 'coin'
    ? [[0.2, 'transform:scale(1)'], [0.3, 'transform:scale(.08,1)'], [0.38, 'transform:scale(-1,1)'], [0.46, 'transform:scale(.08,1)'], [0.54, 'transform:scale(1)']]
    : turn === 'reel'
      ? [[0.2, 'transform:rotate(0deg)'], [0.36, 'transform:rotate(120deg)'], [0.52, 'transform:rotate(240deg)']]
      : [[0.16, 'transform:scale(1.25)'], [0.24, 'transform:scale(1)']]
  const rows: [number, string][] = [[0, 'opacity:0;transform:scale(1.5)'], [0.04, 'opacity:1;transform:scale(1.5)'], [0.16, 'opacity:1;transform:scale(1)'], ...spin, [T - 0.12, 'opacity:1'], [T - 0.04, 'opacity:0']]
  return act.kf(act.bank.use(key, x, y, 1, 1.3), rows, { c: true })
}
/** The flavour for the skin being put on (its id), or undefined for the default switch. */
export const switchFlavour = (to: string): SwitchFlavour | undefined => {
  if (to === 'invincible') return { dir: 'r', shards: 8, extra: (act, s) => (s === 'band' ? emblem(act, 'emInv', INV_EMBLEM, 'punch') : '') }
  if (to === 'the-boys' || to === 'solidgold') return { dir: 'l', shards: 0, ms: 800, extra: (act, s) => (s === 'band' ? emblem(act, 'emTb', TB_EMBLEM, 'coin') : '') }
  if (to === 'noir') return { dir: 'd', bar: false, shards: 0, veil: 0.6, ms: 850, extra: (act, s) => (s === 'band' ? emblem(act, 'emNoir', NOIR_EMBLEM, 'reel') : '') }
  return undefined
}
