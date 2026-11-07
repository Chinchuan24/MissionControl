// THINK, MARK cutscene: the sprite table. The art itself is invincible-thinkmark-art.ts (the artist's file, copied verbatim:
// replace it to update the pictures; the names are the contract). Original pixel art, redrawn, never traced from footage.
import type { Sprite } from './cast'
import * as ART from './invincible-thinkmark-art'

export const TM_NAMES = [
  'TM_BG_SKY', 'TM_BG_ROCKS', 'TM_MARK_DOWN', 'TM_OMNI_KNEEL_A', 'TM_OMNI_KNEEL_B', 'TM_OMNI_KNEEL_C', 'TM_OMNI_CU_SHOUT', 'TM_OMNI_ECU_YELL',
  'TM_MARK_CU', 'TM_MARK_CU_TALK', 'TM_OMNI_STAND', 'TM_OMNI_MED', 'TM_OMNI_HANDS', 'TM_CRATER', 'TM_OMNI_CRY', 'TM_OMNI_UP', 'TM_OMNI_FLY',
] as const
export type TmName = (typeof TM_NAMES)[number]
export const TM: Record<TmName, Sprite> = Object.fromEntries(TM_NAMES.map(n => [n, (ART as unknown as Record<string, Sprite>)[n] as Sprite])) as Record<TmName, Sprite>
