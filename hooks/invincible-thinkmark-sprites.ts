// THINK, MARK cutscene: the sprite table. v1's art is invincible-thinkmark-art.ts (the nine sprites v2 reuses), v2's is
// invincible-thinkmark-art2.ts (environments, FX, characters and patches). Replace those files to update the pictures; the names
// are the contract. Original pixel art, redrawn, never traced from footage.
import type { Sprite } from './cast'
import * as ART from './invincible-thinkmark-art'
import * as ART2 from './invincible-thinkmark-art2'
import { PATCHES, PLAN_SIZE, TM2_NAMES } from './invincible-thinkmark-plan'

export const V1_NAMES = ['TM_BG_SKY', 'TM_OMNI_CU_SHOUT', 'TM_OMNI_KNEEL_A', 'TM_OMNI_KNEEL_B', 'TM_OMNI_KNEEL_C', 'TM_OMNI_STAND', 'TM_OMNI_MED', 'TM_OMNI_CRY', 'TM_OMNI_UP'] as const
const V2 = ART2 as unknown as Record<string, Sprite | undefined>
const V1 = ART as unknown as Record<string, Sprite | undefined>
/** Every sprite name the film uses (v1's nine and the plan's TM2 names). A TM2 name the art does not have is skipped when drawn (the lead dropped three patches). */
export type TmName = string
export const TM_NAMES: string[] = [...V1_NAMES, ...TM2_NAMES]
/** The three re-quantized v1 sprites fall back to v1 art cut to fewer colours when the v2 art has no copy of its own. */
const FALLBACK: Record<string, [string, number]> = { TM2_OMNI_ECU_YELL_12: ['TM_OMNI_ECU_YELL', 12], TM2_CRATER_10: ['TM_CRATER', 10], TM2_MARK_DOWN_LITE: ['TM_MARK_DOWN', 11] }
/** The sprite table (only the names the art has). */
export const TM: Record<string, Sprite> = {}
/** The most colours a sprite is cut to. */
export const MAXC: Record<string, number> = {}
for (const n of TM_NAMES) {
  const own = V2[n] ?? V1[n]
  const fb = FALLBACK[n]
  const sp = own ?? (fb ? V1[fb[0]] : undefined)
  if (sp) TM[n] = sp
  if (!own && fb) MAXC[n] = fb[1]
}
export const has = (n: string): boolean => !!TM[n]
/** Where each patch sits in its parent (the art's own offsets win over the plan's nominal ones). */
export const PATCH_AT: Record<string, { parent: string; x: number; y: number }> = Object.fromEntries(PATCHES.map(p => [p.name, { parent: p.parent, x: p.x, y: p.y }]))
Object.assign(PATCH_AT, (V2.TM2_PATCH_AT ?? {}) as unknown as Record<string, { parent: string; x: number; y: number }>)
export { PLAN_SIZE }
