// THINK, MARK v2: the shot plan as data (generated from the plan's plan.json; the times, the patch table and the bubble text are the plan's, word for word).
// Times are seconds into the 65 s. Everything the picture does at a given time is derived from here; nothing is guessed in the renderer.

export type PatchDef = { name: string; parent: string; x: number; y: number; w: number; h: number }
/** A mouth cycle / blink / patch event of the plan. mouth: base for `on` s, then the patch for `off` s, from t[0] to t[1] (it ends on the base); a lone `t` with a patch = the patch from t to the end of the shot. */
export type Anim = { t: number | [number, number]; kind: 'mouth' | 'blink' | 'patch'; patch: string; on?: number; off?: number; dur?: number }
export type BubbleDef = { n: number; shot: number; text: string; who: string; start: number; end: number; style?: 'big' | 'quiet' }

export const HARD_CUTS: number[] = [5.25, 19.65, 24.65, 26.25, 32.45, 39.75, 46.95, 52.05, 55.65, 56.45, 63.35]
/** [start, end] of each of the 24 shots, in order (shot 1 = index 0). */
export const SHOT_TIMES: [number, number][] = [[0.0, 2.85], [2.85, 5.25], [5.25, 7.2], [7.2, 8.75], [8.75, 14.3], [14.3, 16.1], [16.1, 18.1], [18.1, 19.65], [19.65, 24.65], [24.65, 26.25], [26.25, 30.4], [30.4, 31.1], [31.1, 32.45], [32.45, 39.75], [39.75, 45.7], [45.7, 46.95], [46.95, 48.0], [48.0, 52.05], [52.05, 55.65], [55.65, 56.45], [56.45, 58.6], [58.6, 62.1], [62.1, 63.35], [63.35, 65.0]]
export const PATCHES: PatchDef[] = [
  {name: 'TM2_P_PROF_MOUTH_CLOSED', parent: 'TM2_OMNI_CU_PROFILE', x: 44, y: 34, w: 22, h: 14},
  {name: 'TM2_P_PROF_BLINK', parent: 'TM2_OMNI_CU_PROFILE', x: 52, y: 20, w: 20, h: 7},
  {name: 'TM2_P_CU_MOUTH_CLOSED', parent: 'TM_OMNI_CU_SHOUT', x: 58, y: 27, w: 24, h: 18},
  {name: 'TM2_P_CU_BLINK', parent: 'TM_OMNI_CU_SHOUT', x: 60, y: 16, w: 24, h: 8},
  {name: 'TM2_P_ECU_MOUTH_CLOSED', parent: 'TM2_OMNI_ECU_YELL_12', x: 46, y: 55, w: 36, h: 19},
  {name: 'TM2_P_ECU_MOUTH_MID', parent: 'TM2_OMNI_ECU_YELL_12', x: 46, y: 55, w: 36, h: 19},
  {name: 'TM2_P_ECU_BLINK', parent: 'TM2_OMNI_ECU_YELL_12', x: 34, y: 21, w: 60, h: 10},
  {name: 'TM2_P_MARK_MOUTH_OPEN', parent: 'TM2_MARK_CU_HEAD', x: 40, y: 44, w: 20, h: 12},
  {name: 'TM2_P_MARK_BLINK', parent: 'TM2_MARK_CU_HEAD', x: 28, y: 18, w: 36, h: 18},
  {name: 'TM2_P_MED_BLINK', parent: 'TM_OMNI_MED', x: 68, y: 15, w: 26, h: 6},
  {name: 'TM2_P_MED_MOUTH_AGAPE', parent: 'TM_OMNI_MED', x: 74, y: 33, w: 12, h: 4},
  {name: 'TM2_P_CRY_EYES_SHUT', parent: 'TM_OMNI_CRY', x: 68, y: 15, w: 26, h: 6},
  {name: 'TM2_P_CRY_MOUTH_QUIVER', parent: 'TM_OMNI_CRY', x: 74, y: 32, w: 12, h: 7},
  {name: 'TM2_P_UP_MOUTH_OPEN', parent: 'TM_OMNI_UP', x: 70, y: 24, w: 18, h: 4},
  {name: 'TM2_P_KNEEL_A_MOUTH', parent: 'TM_OMNI_KNEEL_A', x: 27, y: 7, w: 3, h: 2},
  {name: 'TM2_P_KNEEL_B_MOUTH', parent: 'TM_OMNI_KNEEL_B', x: 26, y: 7, w: 3, h: 2},
  {name: 'TM2_P_KNEEL_C_MOUTH', parent: 'TM_OMNI_KNEEL_C', x: 32, y: 9, w: 3, h: 2},
  {name: 'TM2_P_KNEEL_C_HEADDOWN', parent: 'TM_OMNI_KNEEL_C', x: 24, y: 0, w: 16, h: 14},
  {name: 'TM2_P_KNEEL_GRAB_MOUTH', parent: 'TM2_OMNI_KNEEL_GRAB', x: 30, y: 8, w: 3, h: 2},
  {name: 'TM2_P_KNEEL_ARMSUP_MOUTH', parent: 'TM2_OMNI_KNEEL_ARMSUP', x: 30, y: 10, w: 3, h: 2},
  {name: 'TM2_P_KNEEL_LEAN_MOUTH', parent: 'TM2_OMNI_KNEEL_LEAN', x: 34, y: 8, w: 3, h: 2},
]
/** The plan's patch events by shot number (the cycles with no patch name - the ECU yell, the sobs - are in the renderer). */
export const ANIM: Record<number, Anim[]> = {
  1: [{'t': [0.2, 0.9], 'kind': 'mouth', 'patch': 'TM2_P_PROF_MOUTH_CLOSED', 'on': 0.12, 'off': 0.1}, {'t': [1.2, 1.9], 'kind': 'mouth', 'patch': 'TM2_P_PROF_MOUTH_CLOSED', 'on': 0.12, 'off': 0.1}, {'t': [2.0, 2.6], 'kind': 'mouth', 'patch': 'TM2_P_PROF_MOUTH_CLOSED', 'on': 0.12, 'off': 0.1}, {'t': 2.6, 'kind': 'mouth', 'patch': 'TM2_P_PROF_MOUTH_CLOSED'}, {'t': 1.0, 'kind': 'blink', 'patch': 'TM2_P_PROF_BLINK', 'dur': 0.1}],
  2: [{'t': [2.95, 4.6], 'kind': 'mouth', 'patch': 'TM2_P_CU_MOUTH_CLOSED', 'on': 0.15, 'off': 0.1}, {'t': 4.6, 'kind': 'mouth', 'patch': 'TM2_P_CU_MOUTH_CLOSED'}, {'t': 4.75, 'kind': 'blink', 'patch': 'TM2_P_CU_BLINK', 'dur': 0.1}],
  3: [{'t': [5.4, 7.1], 'kind': 'mouth', 'patch': 'TM2_P_KNEEL_GRAB_MOUTH', 'on': 0.15, 'off': 0.12}],
  4: [{'t': [7.3, 7.9], 'kind': 'mouth', 'patch': 'TM2_P_KNEEL_A_MOUTH', 'on': 0.15, 'off': 0.12}, {'t': [8.0, 8.6], 'kind': 'mouth', 'patch': 'TM2_P_KNEEL_B_MOUTH', 'on': 0.2, 'off': 0.1}],
  5: [{'t': [9.9, 13.3], 'kind': 'mouth', 'patch': 'TM2_P_KNEEL_C_MOUTH', 'on': 0.15, 'off': 0.15}],
  6: [{'t': [14.5, 16.0], 'kind': 'mouth', 'patch': 'TM2_P_KNEEL_ARMSUP_MOUTH', 'on': 0.15, 'off': 0.12}],
  7: [{'t': [16.3, 17.1], 'kind': 'mouth', 'patch': 'TM2_P_KNEEL_C_MOUTH', 'on': 0.15, 'off': 0.12}, {'t': [17.3, 18.0], 'kind': 'mouth', 'patch': 'TM2_P_KNEEL_GRAB_MOUTH', 'on': 0.15, 'off': 0.12}],
  8: [{'t': [18.2, 19.5], 'kind': 'mouth', 'patch': 'TM2_P_KNEEL_LEAN_MOUTH', 'on': 0.15, 'off': 0.12}],
  9: [{'t': 22.6, 'kind': 'mouth', 'patch': 'TM2_P_ECU_MOUTH_CLOSED'}, {'t': 22.7, 'kind': 'blink', 'patch': 'TM2_P_ECU_BLINK', 'dur': 0.12}, {'t': 24.0, 'kind': 'mouth', 'patch': 'TM2_P_ECU_MOUTH_CLOSED'}],
  10: [{'t': 25.4, 'kind': 'blink', 'patch': 'TM2_P_MARK_BLINK', 'dur': 0.3}],
  11: [{'t': [26.5, 30.3], 'kind': 'mouth', 'patch': 'TM2_P_KNEEL_C_MOUTH', 'on': 0.15, 'off': 0.15}],
  12: [{'t': [30.4, 31.0], 'kind': 'mouth', 'patch': 'TM2_P_KNEEL_A_MOUTH', 'on': 0.15, 'off': 0.12}],
  13: [{'t': [31.2, 31.6], 'kind': 'mouth', 'patch': 'TM2_P_KNEEL_GRAB_MOUTH', 'on': 0.15, 'off': 0.12}],
  14: [{'t': 33.5, 'kind': 'blink', 'patch': 'TM2_P_MARK_BLINK', 'dur': 0.25}, {'t': [34.8, 35.6], 'kind': 'mouth', 'patch': 'TM2_P_MARK_MOUTH_OPEN', 'on': 0.25, 'off': 0.25}, {'t': [36.8, 38.6], 'kind': 'mouth', 'patch': 'TM2_P_MARK_MOUTH_OPEN', 'on': 0.25, 'off': 0.2}, {'t': 38.9, 'kind': 'blink', 'patch': 'TM2_P_MARK_BLINK', 'dur': 0.3}],
  15: [{'t': 43.7, 'kind': 'patch', 'patch': 'TM2_P_KNEEL_C_HEADDOWN'}],
  17: [{'t': 46.95, 'kind': 'patch', 'patch': 'TM2_P_MED_MOUTH_AGAPE'}, {'t': 47.5, 'kind': 'blink', 'patch': 'TM2_P_MED_BLINK', 'dur': 0.12}],
  18: [{'t': 50.6, 'kind': 'blink', 'patch': 'TM2_P_MED_BLINK', 'dur': 0.12}],
  20: [{'t': [55.8, 56.2], 'kind': 'mouth', 'patch': 'TM2_P_MARK_MOUTH_OPEN', 'on': 0.2, 'off': 0.2}],
  21: [{'t': 57.8, 'kind': 'blink', 'patch': 'TM2_P_MED_BLINK', 'dur': 0.12}, {'t': 57.2, 'kind': 'patch', 'patch': 'TM2_P_MED_MOUTH_AGAPE'}],
  22: [{'t': 61.0, 'kind': 'patch', 'patch': 'TM2_P_CRY_EYES_SHUT'}],
  23: [{'t': 62.1, 'kind': 'patch', 'patch': 'TM2_P_UP_MOUTH_OPEN'}],
}
/** The nine bubbles. Only 4 and 9 are the show's own words; the rest are our own short paraphrases. */
export const BUBBLE_DEFS: BubbleDef[] = [
  { n: 1, shot: 1, text: "Why force my hand?!", who: "Omni-Man", start: 0.5, end: 2.8 },
  { n: 2, shot: 2, text: "You'd let them all fall for this?!", who: "Omni-Man", start: 3.1, end: 5.2 },
  { n: 3, shot: 3, text: "You'd keep fighting while they all drop?", who: "Omni-Man", start: 5.6, end: 7.9 },
  { n: 4, shot: 4, text: "THINK, MARK!", who: "Omni-Man", start: 8.0, end: 9.6, style: 'big' },
  { n: 5, shot: 5, text: "They'll all be gone. You won't.", who: "Omni-Man", start: 9.9, end: 13.4 },
  { n: 6, shot: 6, text: "This planet will rot away around you.", who: "Omni-Man", start: 14.5, end: 17.2 },
  { n: 7, shot: 9, text: "Every face you love will vanish.", who: "Omni-Man", start: 20.0, end: 24.4 },
  { n: 8, shot: 11, text: "Five centuries on, what's left for you?", who: "Omni-Man", start: 27.0, end: 31.6 },
  { n: 9, shot: 14, text: "I'd still have you.", who: "Mark", start: 36.8, end: 39.7, style: 'quiet' },
]
/** Sprite sizes [w, h] as the plan drew them (the real art may differ a little: figures are anchored on their planned bottom edge). */
export const PLAN_SIZE: Record<string, [number, number]> = {'TM_OMNI_CU_SHOUT': [120, 69], 'TM_BG_SKY': [160, 90], 'TM_OMNI_KNEEL_A': [50, 49], 'TM_OMNI_KNEEL_B': [46, 47], 'TM_OMNI_KNEEL_C': [40, 44], 'TM_OMNI_STAND': [34, 79], 'TM_OMNI_MED': [160, 90], 'TM_OMNI_CRY': [160, 90], 'TM_OMNI_UP': [160, 90], 'TM2_OMNI_ECU_YELL_12': [132, 74], 'TM2_CRATER_10': [128, 72], 'TM2_MARK_DOWN_LITE': [84, 17], 'TM2_SKY_CU': [160, 90], 'TM2_ROCKS_LITE': [160, 90], 'TM2_ROCK_CLOSE': [128, 72], 'TM2_FX_STREAK': [20, 90], 'TM2_FX_DUST': [64, 24], 'TM2_FX_DEBRIS': [48, 12], 'TM2_FX_FLASH': [160, 90], 'TM2_FX_TEAR': [16, 8], 'TM2_FX_BLOOD_DRIP': [24, 14], 'TM2_OMNI_CU_PROFILE': [120, 72], 'TM2_OMNI_KNEEL_GRAB': [52, 48], 'TM2_OMNI_KNEEL_ARMSUP': [56, 56], 'TM2_OMNI_KNEEL_LEAN': [60, 46], 'TM2_OMNI_STAND_LOW': [84, 130], 'TM2_OMNI_HAND_L': [44, 48], 'TM2_OMNI_HAND_R': [44, 48], 'TM2_MARK_CU_HEAD': [96, 64], 'TM2_P_PROF_MOUTH_CLOSED': [22, 14], 'TM2_P_PROF_BLINK': [20, 7], 'TM2_P_CU_MOUTH_CLOSED': [24, 18], 'TM2_P_CU_BLINK': [24, 8], 'TM2_P_ECU_MOUTH_CLOSED': [36, 19], 'TM2_P_ECU_MOUTH_MID': [36, 19], 'TM2_P_ECU_BLINK': [60, 10], 'TM2_P_MARK_MOUTH_OPEN': [20, 12], 'TM2_P_MARK_BLINK': [36, 18], 'TM2_P_MED_BLINK': [26, 6], 'TM2_P_MED_MOUTH_AGAPE': [12, 4], 'TM2_P_CRY_EYES_SHUT': [26, 6], 'TM2_P_CRY_MOUTH_QUIVER': [12, 7], 'TM2_P_UP_MOUTH_OPEN': [18, 4], 'TM2_P_KNEEL_A_MOUTH': [3, 2], 'TM2_P_KNEEL_B_MOUTH': [3, 2], 'TM2_P_KNEEL_C_MOUTH': [3, 2], 'TM2_P_KNEEL_C_HEADDOWN': [16, 14], 'TM2_P_KNEEL_GRAB_MOUTH': [3, 2], 'TM2_P_KNEEL_ARMSUP_MOUTH': [3, 2], 'TM2_P_KNEEL_LEAN_MOUTH': [3, 2]}
export const TM2_NAMES: string[] = ['TM2_OMNI_ECU_YELL_12', 'TM2_CRATER_10', 'TM2_MARK_DOWN_LITE', 'TM2_SKY_CU', 'TM2_ROCKS_LITE', 'TM2_ROCK_CLOSE', 'TM2_FX_STREAK', 'TM2_FX_DUST', 'TM2_FX_DEBRIS', 'TM2_FX_FLASH', 'TM2_FX_TEAR', 'TM2_FX_BLOOD_DRIP', 'TM2_OMNI_CU_PROFILE', 'TM2_OMNI_KNEEL_GRAB', 'TM2_OMNI_KNEEL_ARMSUP', 'TM2_OMNI_KNEEL_LEAN', 'TM2_OMNI_STAND_LOW', 'TM2_OMNI_HAND_L', 'TM2_OMNI_HAND_R', 'TM2_MARK_CU_HEAD', 'TM2_P_PROF_MOUTH_CLOSED', 'TM2_P_PROF_BLINK', 'TM2_P_CU_MOUTH_CLOSED', 'TM2_P_CU_BLINK', 'TM2_P_ECU_MOUTH_CLOSED', 'TM2_P_ECU_MOUTH_MID', 'TM2_P_ECU_BLINK', 'TM2_P_MARK_MOUTH_OPEN', 'TM2_P_MARK_BLINK', 'TM2_P_MED_BLINK', 'TM2_P_MED_MOUTH_AGAPE', 'TM2_P_CRY_EYES_SHUT', 'TM2_P_CRY_MOUTH_QUIVER', 'TM2_P_UP_MOUTH_OPEN', 'TM2_P_KNEEL_A_MOUTH', 'TM2_P_KNEEL_B_MOUTH', 'TM2_P_KNEEL_C_MOUTH', 'TM2_P_KNEEL_C_HEADDOWN', 'TM2_P_KNEEL_GRAB_MOUTH', 'TM2_P_KNEEL_ARMSUP_MOUTH', 'TM2_P_KNEEL_LEAN_MOUTH']
