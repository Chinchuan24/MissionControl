// The three classic Cyberpunk skins' rare fights (wave 2, phase C), each in its own film language, built on hooks/stage:
//   Cyberpunk 2077 (runners)  THE MAXTAC RAID: police strobe and a cop's-eye heat bar, the AV drops two troopers, the
//                             Sandevistan cut-in, a time-slow zig-zag whose first hit lands only when time comes back,
//                             the flying finisher, both troopers knocked out of frame, the landing. Loud, chromatic, fast.
//   Arasaka (corpo)           THE BOARDROOM STAND-OFF: calm, cold, symmetrical, NEVER a glitch. Mattes close, a slow push,
//                             the stand-off (stare, step, flinch, backdown), the cyborg steps out of the shadow (his clean
//                             cut-in), the laser lock, the grab, the stomp, the rogue process scanned away, TERMINATED.
//   Lucy (netrun)             THE ICE DUEL: everything wireframe. The dive into the grid, the ICE wall rises, the daemon
//                             strikes back (the recoil, the crouch), the wind-up, her cut-in, the lash that cracks the ICE,
//                             the shards falling away in perspective, the moon rising behind her.
// Each fight: band cut (title rows, left of every readout), a light echo in the pane's BREACH PROTOCOL matrix, a director
// (at most one per 30-45 min, working only), a replay name (`/missioncontrol play maxtac | boardroom | ice-duel`). The raid also
// plays on the climb past 95% context (MaxTac's own moment), at most once per 30 min. Plus each skin's flavour of the switch.
// PG-13: impacts, flashes, a knock-back out of frame, a stamp. Fan homage: names only, our own pixel art (cyberpunk-art.ts).
import type { Sprite } from './cast'
import { netGrid } from './cyber-motion'
import * as ART from './cyberpunk-art'
import type { CyberEgg } from './eggs'
import { CJK_FONT } from './eggs'
import { mirror, padTo } from './edgerunners2-motion'
import { Camera } from './stage/camera'
import { Fight, fightLane } from './stage/choreo'
import { Director, localOffsetMs } from './stage/director'
import { quantise } from './stage/frames'
import * as fx from './stage/fx'
import { registerPlay } from './stage/replay'
import { Act, r1, r3 } from './stage/timeline'
import type { SwitchFlavour } from './stage/wipe'

const FONT = "'Avenir Next Condensed','Roboto Condensed','Arial Narrow',Bahnschrift,sans-serif"
const MONO = "'SF Mono',Menlo,Consolas,monospace"
// 2077: police strobe and neon. Arasaka: black, bone white, one red. Lucy: netspace violet, cyan wire, pink, ICE red.
const CP = { ink: '#050507', yellow: '#FCEE0A', cyan: '#00F0FF', red: '#FF003C', blue: '#2A6BFF', green: '#00FF9F', magenta: '#FF2BD6', white: '#FFFFFF' }
const AR = { ink: '#050506', black: '#000000', bone: '#ECECEC', grey: '#7E828A', red: '#E3001B', hot: '#FF2A40' }
const LU = { ink: '#07030F', violet: '#1A0B2E', pink: '#FF5CF0', cyan: '#5CE1FF', ice: '#FF2A40', iceDark: '#3A0612', white: '#F4F0FF' }

/** The skin ids each fight is offered on (`/missioncontrol play`). */
const SKIN_ID: Record<'runners' | 'corpo' | 'netrun', string> = { runners: 'cyberpunk-2077', corpo: 'arasaka', netrun: 'lucy-edgerunners' }
// Each act's length covers its beats AND its hit-stops (a freeze pushes every later key: an `on()` past the end would fade all act).
export const FIGHT_MS = { maxtac: 5800, boardroom: 6500, 'ice-duel': 5900 } as const
export type FightKind = keyof typeof FIGHT_MS
/** Which fight each classic skin owns (SAMURAI's set piece is its daily "2023" gig, in cyber-motion.ts). */
export const FIGHT_OF: Record<CyberEgg, FightKind | undefined> = { runners: 'maxtac', corpo: 'boardroom', netrun: 'ice-duel', samurai: undefined }

// ---------------------------------------------------------------- directors, replays, the 95% trigger
export type FightPlay = { kind: FightKind; at: number }
let PLAY: FightPlay | undefined
/** The fight `/missioncontrol play` (or the 95% climb, or a test) started last. */
export const fightPlay = (): FightPlay | undefined => PLAY
export const setFightPlay = (p: FightPlay | undefined): void => { PLAY = p }
/** A skin's fight director: its one fight, at most one per 30-45 min, only while a job works, its own seed. */
export const fightDirector = (kind: FightKind, dayOffsetMs = 0): Director => fightLane(new Director(`cyf-${kind}`, { dayOffsetMs }), [{ id: kind, ms: FIGHT_MS[kind] }])
const dirs = (off: number): Record<FightKind, Director> => ({ maxtac: fightDirector('maxtac', off), boardroom: fightDirector('boardroom', off), 'ice-duel': fightDirector('ice-duel', off) })
let DIRS = dirs(localOffsetMs(Date.now()))
/** Tests: the directors on a fixed time zone. */
export const setFightOffset = (ms: number): void => { DIRS = dirs(ms) }
/**
 * The fight drawn at `at` on skin `egg`: a typed one first (a replay, the 95% raid), else the skin's director (a typed fight
 * holds the director's slots near it). `ahead`: a panel that redraws seldom draws it early (it is pinned, so it waits).
 */
export const fightAt = (egg: CyberEgg, at: number, working: boolean, ahead = 60_000): { kind: FightKind; startAt: number } | undefined => {
  const kind = FIGHT_OF[egg]
  if (!kind) return undefined
  const p = PLAY && PLAY.kind === kind ? PLAY : undefined
  if (p && at >= p.at - ahead && at < p.at + FIGHT_MS[kind]) return { kind, startAt: p.at }
  const s = DIRS[kind].at(at, { working, held: p ? [{ startAt: p.at, endAt: p.at + FIGHT_MS[kind] }] : [] }, ahead)
  return s ? { kind, startAt: s.startAt } : undefined
}
/** Is a fight on screen (the cheer and the job-start acts yield to it: one big act at a time). */
export const fightOn = (egg: CyberEgg, at: number, working: boolean): boolean => {
  const f = fightAt(egg, at, working, 0)
  return Boolean(f && at >= f.startAt && at < f.startAt + FIGHT_MS[f.kind])
}
/** The raid on the climb past 95% context: at most once per this long (fights stay rare). */
export const MAXTAC_GAP_MS = 30 * 60_000
let MAXTAC_LAST = -Infinity
/** The context just climbed past 95% on 2077 (the siren's moment): the raid rolls in now, unless one rolled in the last 30 min. */
export const maxtacClimb = (at: number): boolean => {
  if (at - MAXTAC_LAST < MAXTAC_GAP_MS) return false
  MAXTAC_LAST = at
  PLAY = { kind: 'maxtac', at: at + 300 }
  return true
}
/** Tests: forget the last raid. */
export const resetMaxtac = (): void => { MAXTAC_LAST = -Infinity }
const play = (kind: FightKind) => (at: number): void => { PLAY = { kind, at } }
registerPlay(SKIN_ID.runners, { name: 'maxtac', what: 'the MaxTac raid', run: play('maxtac') })
registerPlay(SKIN_ID.corpo, { name: 'boardroom', what: 'the boardroom stand-off', run: play('boardroom') })
registerPlay(SKIN_ID.netrun, { name: 'ice-duel', what: "Lucy's ICE duel", run: play('ice-duel') })

// ---------------------------------------------------------------- shared parts
/** `act.kf` holding its last row to the act's end (a track whose rows stop early slides back to its base by 100%). */
const kf = (act: Act, svg: string, rows: [number, string][], o: { ease?: string; c?: boolean; origin?: string } = {}): string => act.kf(svg, [...rows, [99, (rows[rows.length - 1] as [number, string])[1]]], o)
/** A dark scrim over the act's region (fades at both ends) so the figures read over the band's title rows. */
const scrim = (act: Act, t1: number, fill: string, op = 0.93): string => act.on(`<rect width="${act.W}" height="${act.H}" fill="${fill}"/>`, 0, t1, { fade: 0.14, op })
/** A 4-point star polygon (a hit frozen in time). */
const starPoly = (x: number, y: number, r: number, fill: string, ink: string): string =>
  `<polygon points="${Array.from({ length: 16 }, (_, i) => { const a = (Math.PI * i) / 8 - Math.PI / 2; const rr = i % 2 ? r * 0.38 : r; return `${r1(x + Math.cos(a) * rr)},${r1(y + Math.sin(a) * rr)}` }).join(' ')}" fill="${fill}" stroke="${ink}"/>`
/** A sprite folded to two inks: its reds stay red, everything else one dark grey (a heavy in the dark: the shape and the lights). */
const fold2 = (sp: Sprite, grey: string, red: string): Sprite => {
  const pal: Record<string, string> = {}
  for (const [k, c] of Object.entries(sp.pal)) { const n = parseInt(String(c).slice(1), 16); const r = n >> 16; const g = (n >> 8) & 255; const b = n & 255; pal[k] = r > 140 && g < 90 && b < 110 ? red : grey }
  return { ...sp, pal, rim: false }
}
/**
 * The band's act region: the header's left (the name and the skin chip) and the title rows, left of the gauge's percent, the
 * breach ticker and the readouts. From 85% context the header carries the CYBERPSYCHOSIS / MAXTAC chip: the region then keeps
 * below the header line (shorter, the fight drawn smaller) so the chip is never covered.
 */
export const fightRegion = (OW: number, ctxPct = 0): { x: number; y: number; w: number; h: number } => {
  const w = Math.round(Math.max(220, Math.min(OW - 352, 352)))
  return ctxPct >= 85 ? { x: 8, y: 38, w, h: 42 } : { x: 8, y: 13, w, h: 67 }
}
/** The act placed at the region and clipped to it. */
const placed = (layer: string, r: { x: number; y: number; w: number; h: number }, id: string): string =>
  `<g transform="translate(${r1(r.x)} ${r1(r.y)})"><defs><clipPath id="${id}"><rect width="${r1(r.w)}" height="${r1(r.h)}" rx="3"/></clipPath></defs><g clip-path="url(#${id})">${layer}</g></g>`
/** A letterbox with a cut-in strip (80 x 20) centred in it: the beat before the big hit. */
const cutStrip = (act: Act, key: string, w: number, h: number, frac = 0.76): { lb: string; y: number; hh: number; sc: number; x: number } => {
  const hh = r1(h * frac)
  const y = r1((h - hh) / 2)
  const sc = r3(Math.min(hh / 20, (w - 8) / 80))
  const x = r1(w / 2 - 40 * sc)
  return { lb: act.bank.use(key, x, r1(y + hh / 2), 1, sc), y, hh, sc, x }
}

// ---------------------------------------------------------------- FIGHT 1: THE MAXTAC RAID (2077)
/** The MaxTac AV, in vector (a heavy armoured flyer, side on, its light bar red and blue), centred on (0, 0) at scale `s`. */
const avShape = (s: number): string =>
  `<g transform="scale(${s})"><path d="M-28 -2l6 -8h34l10 8h6v8h-56z" fill="#1A1B22" stroke="#3A3C48" stroke-width=".8"/><path d="M-18 -8h10v5h-12zM-5 -8h12l6 5h-18z" fill="#2E4058"/><path d="M-30 6h60v3h-60z" fill="#0E0E14"/><rect x="-26" y="9" width="10" height="3" fill="#2A2C36"/><rect x="16" y="9" width="10" height="3" fill="#2A2C36"/><rect x="-6" y="-12" width="5" height="2.4" fill="${CP.red}"/><rect x="1" y="-12" width="5" height="2.4" fill="${CP.blue}"/><path d="M-26 1h52" stroke="${CP.yellow}" stroke-width=".7" opacity=".7"/></g>`
const D_H = 46
const T_H = 52
const D_DASH = padTo(ART.CP77_DAVID_DASH, D_H)
const D_PUNCH = padTo(ART.CP77_DAVID_FINISH_PUNCH, D_H)
const D_LAND = padTo(ART.CP77_DAVID_LAND, D_H)
const T_AIM = padTo(fold2(ART.CP77_MAXTAC_AIM, '#2C2E36', '#FF1A40'), T_H)
// Drawn falling back to the LEFT: face 1 (the left trooper) falls away from David on his right; face -1 mirrors it.
const T_KO = padTo(fold2(ART.CP77_MAXTAC_KNOCKED, '#2C2E36', '#FF1A40'), T_H)
/**
 * The MaxTac raid in a region `w` by `h`, 5.6 s:
 *   0.0  the strobe: red and blue sweep the frame, the heat bar fills five stars (NCPD // MAXTAC)
 *   0.5  the AV drops in with its searchlight; 0.95 two troopers drop, land (dust, a 2 px jolt), rise to aim (laser sights)
 *   1.75 CUT-IN: David's eyes in a letterbox, SANDEVISTAN // ON (the beat before the hit)
 *   2.3  time-slow: the frame goes green, he zig-zags (afterimages in the trail's green-to-magenta), taps the left trooper
 *        (the hit freezes in the air), crosses, and the flying FINISHER lands on the right one: impact frame, hit-stop
 *   2.95 time snaps back (a chromatic blink): both troopers are knocked out of frame (crash), he lands, the AV pulls away
 *   4.0  MAXTAC: /compact, CHOOM in neon. Reduced motion: the landing with the title.
 */
export const maxtacAct = (o: { at: number; w: number; h: number; id: string }): { layer: string; act: Act; fight: Fight } => {
  const act = new Act({ id: o.id, ms: FIGHT_MS.maxtac, at: o.at, W: o.w, H: o.h, K: 3 })
  const sc = r3(Math.min(1.25, (o.h - 6) / T_H))
  const gy = o.h - 3
  const cy = (hh: number) => r1(gy - (hh * sc) / 2)
  act.cast('dDash', D_DASH, 0.5).cast('dPunch', D_PUNCH, 0.5).cast('dLand', D_LAND, 0.5).cast('tAim', T_AIM, 0.5).cast('tKo', T_KO, 0.5)
  const cam = new Camera(act)
  const f = new Fight(act, { sc, ink: CP.ink, star: { core: CP.white, star: CP.yellow, ring: CP.cyan }, spark: CP.yellow, dust: '#8A8FA8', lines: CP.cyan, smear: CP.green, impactBg: '#0A0A12', impactFg: CP.yellow, font: FONT }, cam)
  const xl = r1(o.w * 0.15)
  const xr = r1(o.w * 0.83)
  const xd = r1(o.w * 0.47)
  const p = act.p
  f.fighter('d', 'dLand', xd, cy(D_H), 1).fighter('tl', 'tAim', xl, -44, 1).fighter('tr', 'tAim', xr, -44, -1)
  // 0.95: the drop, from above the frame through the AV.
  f.at(0.95).approach('tl', xl, 0.22, { ease: 'snap', y: cy(T_H), lines: false, ghosts: false })
  f.with().approach('tr', xr, 0.22, { ease: 'snap', y: cy(T_H), lines: false, ghosts: false })
  cam.shake(1.17, 2, 0.14)
  cam.push(1.42, 1.75, 1.05, xd, cy(D_H), 'settle').reset(2.3, 2.34, 'snap')
  // 2.3: the Sandevistan. Zig to the left trooper (a tap whose hit waits for time to come back), zag to the right one.
  f.at(2.3).pose('d', 'dDash', -1)
  f.approach('d', r1(xl + 26 * sc), 0.14, { ease: 'snap', ghosts: false, lines: false })
  f.at(2.5).pose('d', 'dDash', 1)
  f.approach('d', r1(xr - 46 * sc), 0.2, { ease: 'snap', ghosts: false, lines: false })
  // 2.74: the flying finisher, off the ground into his jaw-line.
  f.at(2.74).pose('d', 'dPunch', 1)
  f.approach('d', r1(xr - 24 * sc), 0.12, { ease: 'snap', y: r1(cy(D_H) - 10 * sc), lines: true, ghosts: false })
  f.at(2.86).hit('tr', { impact: true, flash: 0.3, shake: 3, freeze: 0.24, y: r1(cy(T_H) - 9 * sc) })
  // 2.95: time comes back. The tap lands and both fly out of frame; he drops and lands; then the cocky stance.
  f.at(2.95).hit('tl', { flash: false, shake: false, freeze: false, x: r1(xl + 8 * sc), y: r1(cy(T_H) - 8 * sc) })
  f.knockback('tr', r1(o.w * 0.1), { pose: 'tKo', d: 0.38, arc: 10, land: 'crash' })
  f.with().exit('tl', { dir: -1, d: 0.3, fade: true })
  f.at(3.0).approach('d', r1(o.w * 0.6), 0.28, { pose: 'dLand', y: cy(D_H), ease: 'settle', lines: false, ghosts: false })
  let body = scrim(act, 5.45, CP.ink, 0.95)
  // The strobe: red from the left, blue from the right, in turns (6 Hz), loud at the start and once more when time comes back.
  body += `<defs><linearGradient id="${p}sr" x1="0" x2="1"><stop offset="0" stop-color="${CP.red}" stop-opacity=".5"/><stop offset=".55" stop-color="${CP.red}" stop-opacity="0"/></linearGradient><linearGradient id="${p}sb" x1="1" x2="0"><stop offset="0" stop-color="${CP.blue}" stop-opacity=".5"/><stop offset=".55" stop-color="${CP.blue}" stop-opacity="0"/></linearGradient><linearGradient id="${p}sl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".4"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs>`
  // A looping class shown in windows (the strobe's phase never matters; reduced motion stops it).
  act.extraCss.add(`.${p}st{animation:${p}st .17s steps(1) infinite}.${p}sb2{animation-delay:-.085s}@keyframes ${p}st{50%{opacity:0}}@media (prefers-reduced-motion: reduce){.${p}st{animation:none}}`)
  const strobe = `<rect class="${p}st" width="${o.w}" height="${o.h}" fill="url(#${p}sr)"/><rect class="${p}st ${p}sb2" width="${o.w}" height="${o.h}" fill="url(#${p}sb)"/>`
  body += act.win(0.05, 1.7, strobe) + act.win(2.96, 3.5, strobe)
  // The heat bar: NCPD // MAXTAC and five stars lighting one by one (the band's own HEAT, at its worst).
  const hx = r1(o.w - 6)
  const stars = act.on(kf(act, `<text x="${hx}" y="23" text-anchor="end" font-size="10" letter-spacing="1" fill="${CP.red}">★★★★★</text>`, [[0, 'clip-path:inset(0 100% 0 0)'], [0.12, 'clip-path:inset(0 100% 0 0)'], [0.6, 'clip-path:inset(0 0 0 0)']], { ease: 'steps(5,end)' }), 0.05, 1.7)
  body += act.on(`<text x="${hx}" y="10" text-anchor="end" font-family="${MONO}" font-size="7" font-weight="700" letter-spacing="1" fill="${CP.white}">NCPD // MAXTAC</text>`, 0.05, 1.7, { fade: 0.08 }) + stars
  // The AV: drops in with its searchlight, hovers, pulls away when the raid is lost.
  const avx = r1(o.w * 0.5)
  const avs = r3(sc * 0.95)
  const beam = `<path d="M-7 ${r1(10 * avs)}L7 ${r1(10 * avs)}L${r1(34 * sc)} ${r1(gy - 14)}L-${r1(34 * sc)} ${r1(gy - 14)}Z" fill="url(#${p}sl)"/>`
  body += act.mv(`${act.win(1.0, 2.25, beam)}${avShape(avs)}`, [[0, avx, -30, 1], [0.5, avx, -30, 1], [0.95, avx, 14, 1], [3.3, avx, 14, 1], [3.95, r1(avx + o.w * 0.2), -34, 1], [5.6, r1(avx + o.w * 0.2), -34, 1]], { ease: 'settle' })
  // Dust where they land; laser sights on David while they aim.
  body += fx.dust(act, 1.17, xr, gy, { seed: `${p}dr`, n: 3, dx: -6 })
  const my = r1(cy(T_H) - 5 * sc)
  const chest = r1(cy(D_H) - 8 * sc)
  body += act.win(1.48, 2.28, `<path d="M${r1(xl + 20 * sc)} ${my}L${xd} ${chest}M${r1(xr - 20 * sc)} ${my}L${xd} ${chest}" stroke="${CP.red}" stroke-width=".8" opacity=".85"/><circle cx="${xd}" cy="${chest}" r="1.6" fill="${CP.red}"/>`)
  // The time-slow: the frame goes cold green under everyone; a hairline sweeps; afterimages hang in the trail's ramp.
  body += act.win(2.28, 2.95, `<rect width="${o.w}" height="${o.h}" fill="#021A12" opacity=".7"/>`)
  body += kf(act, `<rect width="2" height="${o.h}" fill="${CP.green}" opacity=".55"/>`, [[0, 'transform:translateX(-4px)'], [2.3, 'transform:translateX(-4px)'], [2.95, `transform:translateX(${o.w}px)`]], { ease: 'cubic-bezier(.1,.9,.2,1)' })
  const ghost = (x: number, y: number, dir: 1 | -1, key: string, color: string, t0: number) => act.on(`<use href="#${act.bank.sil(key)}" fill="${color}" opacity=".55" transform="translate(${r1(x)} ${r1(y)}) ${act.bank.anchor(key, dir, sc)}"/>`, t0, t0 + 0.5, { fade: 0.2 })
  body += ghost(r1((xd + xl) / 2 + 8), cy(D_H), -1, 'dDash', CP.green, 2.36) + ghost(r1(xl + 26 * sc), cy(D_H), 1, 'dDash', CP.blue, 2.5) + ghost(r1(xr - 46 * sc), cy(D_H), 1, 'dDash', CP.magenta, 2.72)
  // The tap on the left trooper: its star hangs frozen in the air until time comes back.
  body += act.win(2.45, 2.95, starPoly(r1(xl + 8 * sc), r1(cy(T_H) - 8 * sc), 7, CP.yellow, CP.ink))
  body += cam.wrap(f.body())
  // 2.95: the snap back, a chromatic blink.
  body += act.win(2.95, 3.0, `<rect y="${r1(o.h * 0.3)}" width="${o.w}" height="2" fill="${CP.cyan}"/><rect y="${r1(o.h * 0.62)}" width="${o.w}" height="2" fill="${CP.red}"/>`)
  body += fx.flash(act, 2.95, { a: 0.3, color: CP.green, d: 0.12 })
  // 1.75-2.3: the cut-in. His eyes in a letterbox, yellow rules, SANDEVISTAN // ON.
  act.cast('cut', ART.CP77_CUTIN_DAVID, 0)
  const ci = cutStrip(act, 'cut', o.w, o.h)
  body += act.win(1.75, 2.28, `<rect width="${o.w}" height="${o.h}" fill="#000"/>${ci.lb}<path d="M0 ${r1(ci.y - 1)}H${o.w}M0 ${r1(ci.y + ci.hh + 1)}H${o.w}" stroke="${CP.yellow}" stroke-width="1.2"/><text x="${r1(o.w - 6)}" y="${r1(ci.y + ci.hh - 3)}" text-anchor="end" font-family="${MONO}" font-size="7" font-weight="700" letter-spacing="1" fill="${CP.green}">SANDEVISTAN // ON</text>`)
  // 4.0: the title in neon tubes.
  const tx = r1(o.w / 2)
  const ty = r1(o.h * 0.3)
  const title = `<rect x="${r1(tx - 118)}" y="${r1(ty - 15)}" width="236" height="27" fill="${CP.ink}" stroke="${CP.yellow}" stroke-opacity=".6"/><text x="${tx}" y="${r1(ty + 5)}" text-anchor="middle" font-family="${FONT}" font-size="16" font-weight="900" letter-spacing="1.2" fill="#FFF8B0" stroke="${CP.yellow}" stroke-width=".7">MAXTAC: /compact, CHOOM</text>`
  body += act.slam(title, 4.0, 5.45)
  const still = `<rect width="${o.w}" height="${o.h}" fill="${CP.ink}" opacity=".9"/>${act.still('dLand', r1(o.w * 0.6), cy(D_H), 1, sc)}${title}`
  return { layer: act.done(body, still), act, fight: f }
}

// ---------------------------------------------------------------- FIGHT 2: THE BOARDROOM STAND-OFF (Arasaka)
const S_H = 54
// The cyborg in two inks (his armour one cold grey, his lights red): a heavy out of the dark, and he fits the band's budget.
const SM_AIM = padTo(fold2(ART.ARA_SMASHER_AIM, '#34343C', '#E3001B'), S_H)
const SM_GRAB = padTo(fold2(ART.ARA_SMASHER_GRAB, '#34343C', '#E3001B'), S_H)
const SM_STOMP = padTo(fold2(ART.ARA_SMASHER_STOMP, '#34343C', '#E3001B'), S_H)
const G_H = 44
const GHOST = padTo(ART.ARA_GHOST, G_H)
/** The boardroom, isometric and clean: a long black table with a red light strip on its edge, chairs along the far side, the
 *  floor a dark plate with one red hairline. Vector (a few hundred chars), crisp at any scale. Base of the table at `gy`. */
const isoRoom = (rx: number, gy: number, s: number): string => {
  const L = 54 * s
  const ty = r1(gy - 16 * s)
  const k = 9 * s
  const top = `M${r1(rx - L)} ${ty}L${r1(rx + L - k)} ${ty}L${r1(rx + L + k * 0.4)} ${r1(ty - k * 0.6)}L${r1(rx - L + k * 1.4)} ${r1(ty - k * 0.6)}Z`
  const front = `M${r1(rx - L)} ${ty}L${r1(rx + L - k)} ${ty}L${r1(rx + L - k)} ${r1(ty + 4 * s)}L${r1(rx - L)} ${r1(ty + 4 * s)}Z`
  const side = `M${r1(rx + L - k)} ${ty}L${r1(rx + L + k * 0.4)} ${r1(ty - k * 0.6)}L${r1(rx + L + k * 0.4)} ${r1(ty - k * 0.6 + 4 * s)}L${r1(rx + L - k)} ${r1(ty + 4 * s)}Z`
  let chairs = ''
  for (let i = 0; i < 4; i++) { const cx = r1(rx - L + k * 2.4 + i * ((2 * L - k * 3) / 4)); chairs += `M${cx} ${r1(ty - k * 0.6 - 9 * s)}h${r1(7 * s)}v${r1(9 * s)}h-${r1(7 * s)}Z` }
  const floor = `M${r1(rx - L - 26 * s)} ${r1(gy + 2)}L${r1(rx + L + 20 * s)} ${r1(gy + 2)}L${r1(rx + L + 34 * s)} ${r1(gy - 12 * s)}L${r1(rx - L - 12 * s)} ${r1(gy - 12 * s)}Z`
  return `<path d="${floor}" fill="#121216"/><path d="M${r1(rx - L - 26 * s)} ${r1(gy + 2)}L${r1(rx + L + 20 * s)} ${r1(gy + 2)}" stroke="${AR.red}" stroke-width=".6" opacity=".6"/><path d="${chairs}" fill="#1C1C22"/><path d="M${r1(rx - L + 6 * s)} ${r1(ty + 4 * s)}v${r1(10 * s)}M${r1(rx + L - k - 6 * s)} ${r1(ty + 4 * s)}v${r1(10 * s)}" stroke="#18181C" stroke-width="${r1(2.4 * s)}"/><path d="${front}" fill="#0B0B0E"/><path d="${side}" fill="#141418"/><path d="${top}" fill="#26262C"/><path d="M${r1(rx - L)} ${ty}L${r1(rx + L - k)} ${ty}" stroke="${AR.red}" stroke-width="1"/>`
}
/**
 * The boardroom stand-off in a region `w` by `h`, 6.2 s. Arasaka's motion: precise, symmetrical, eased, never a glitch.
 *   0.0  black mattes close in; the isometric boardroom; the chairman seated at the head
 *   0.55 a rogue process (a red ghost of the overspending agent) resolves at the far end. THE STAND-OFF: a slow push (stare),
 *        it steps forward, the chairman does not move
 *   1.75 in the shadow behind him, two red optics light up. CUT-IN: the cyborg's face in a clean matte, red rules
 *   2.35 he steps out of the shadow and aims; the laser lock (a square reticle that tightens); the ghost flinches, backs down
 *   3.3  THE GRAB (hit-stop); 3.75 THE STOMP: an impact frame, a 1 px jolt; the ghost is scanned away top to bottom
 *   4.2  TERMINATED · 解雇 is stamped; the mattes open: THE BOARD RECOMMENDS /compact. Reduced motion: the stamp over the stomp.
 */
export const boardroomAct = (o: { at: number; w: number; h: number; id: string }): { layer: string; act: Act; fight: Fight } => {
  const act = new Act({ id: o.id, ms: FIGHT_MS.boardroom, at: o.at, W: o.w, H: o.h, K: 3 })
  const sc = r3(Math.min(1.15, (o.h - 6) / S_H))
  const gy = o.h - 3
  const cy = (hh: number, s = sc) => r1(gy - (hh * s) / 2)
  act.cast('aim', SM_AIM, 0.42).cast('grab', SM_GRAB, 0.36).cast('stomp', SM_STOMP, 0.45).cast('ghost', GHOST, 0.5).cast('sab', ART.ARA_SABURO_SEATED, 0.5)
  const cam = new Camera(act)
  const f = new Fight(act, { sc, ink: AR.black, star: { core: AR.bone, star: AR.bone, ring: AR.red }, spark: AR.bone, dust: '#3A3D44', lines: AR.bone, smear: AR.bone, impactBg: AR.black, impactFg: AR.bone, font: FONT }, cam)
  const p = act.p
  // The set: the table across the middle, the chairman at its head (left), the ghost at its foot (right).
  const rx = r1(o.w * 0.5)
  const rs = r3(Math.min(1, (o.h - 10) / 52))
  const xs = r1(rx - 64 * rs)
  const xg = r1(rx + 70 * rs)
  const xm = r1(Math.max(24 * sc, rx - 118 * rs))
  f.fighter('g', 'ghost', xg, cy(G_H), -1).fighter('m', 'aim', xm, cy(S_H), 1)
  // THE STAND-OFF: the push (stare), the ghost steps up to the table; the chairman never moves.
  f.at(0.9).stare('m', 'g', 0.8, { push: 0.05 })
  f.at(1.1).step('g', 10, 0.5)
  // 2.35: the cyborg steps out of the shadow (his silhouette was all you saw) and aims. The laser locks.
  f.at(2.35).approach('m', r1(xg - 64 * sc), 0.55, { pose: 'aim', ease: 'settle', lines: false, ghosts: false })
  f.at(2.95).flinch('g', { px: 4, d: 0.16 })
  f.at(3.0).backdown('g', 6, 0.25)
  // 3.3: THE GRAB. 3.75: THE STOMP (the impact frame).
  f.at(3.3).strike('m', 'g', { pose: 'grab', reach: 40 * sc, d: 0.12, smear: false })
  f.hit('g', { flash: false, shake: 1, freeze: 0.14, sparks: false, y: r1(cy(G_H) - 14 * sc) })
  f.at(3.75).pose('m', 'stomp')
  f.hit('g', { impact: true, flash: 0.18, shake: 1, freeze: 0.2, sparks: false, y: r1(gy - 6) })
  // Stomped down into the floor (then scanned away): no body is left on the boardroom floor.
  f.approach('g', r1(xg - 4), 0.12, { ease: 'snap', y: r1(cy(G_H) + 12 * sc), lines: false, ghosts: false })
  let body = scrim(act, 6.05, AR.ink, 0.95)
  // The boardroom (isometric), the chairman seated at its head: still, lit from above.
  const room = `${isoRoom(rx, gy, rs)}${act.bank.use('sab', xs, r1(gy - 2 - (37 * rs) / 2), 1, rs)}`
  body += act.on(room, 0.2, 6.0, { fade: 0.35 })
  // The shadow: before he steps out, only his outline and two red optics, behind the chairman.
  // The ghost resolves at the far end (eased, no noise), and the label of what it is.
  const fb = f.body()
  body += kf(act, cam.wrap(fb), [[0, 'opacity:0'], [0.5, 'opacity:0'], [0.9, 'opacity:1']], { ease: 'ease-in-out' })
  body += act.on(`<rect x="${r1(xm - 30 * sc)}" y="0" width="${r1(60 * sc)}" height="${o.h}" fill="#060608"/>`, 0, 2.4, { fade: 0.2, op: 0.9 })
  body += act.on(`<rect x="${r1(xm + 6 * sc)}" y="${r1(cy(S_H) - 21 * sc)}" width="2" height="1.4" fill="${AR.hot}"/><rect x="${r1(xm + 10 * sc)}" y="${r1(cy(S_H) - 21 * sc)}" width="2" height="1.4" fill="${AR.hot}"/>`, 1.75, 2.36, { fade: 0.12 })
  body += act.on(`<text x="${r1(Math.min(o.w - 4, xg + 18))}" y="${r1(gy - G_H * sc - 2)}" text-anchor="end" font-family="${MONO}" font-size="6.5" letter-spacing=".8" fill="${AR.hot}">ROGUE PROCESS</text>`, 0.7, 2.3, { fade: 0.2 })
  // The laser lock: a hairline from his aim to the ghost, a square reticle tightening onto it, LOCKED.
  const lx = r1(xg - 2)
  const ly = r1(cy(G_H) - 14 * sc)
  body += act.on(`<path d="M${r1(xg - 64 * sc + 26 * sc)} ${r1(cy(S_H) - 14 * sc)}L${lx} ${ly}" stroke="${AR.hot}" stroke-width=".7"/>`, 2.85, 3.3)
  body += kf(act, `<rect x="${r1(lx - 7)}" y="${r1(ly - 7)}" width="14" height="14" fill="none" stroke="${AR.hot}" stroke-width="1"/>`, [[0, 'opacity:0;transform:scale(2)'], [2.8, 'opacity:0;transform:scale(2)'], [2.82, 'opacity:1;transform:scale(2)'], [3.05, 'opacity:1;transform:scale(1)'], [3.3, 'opacity:0;transform:scale(1)']], { ease: 'ease-in-out', origin: `${lx}px ${ly}px` })
  body += act.on(`<text x="${r1(lx + 9)}" y="${r1(ly - 8)}" font-family="${MONO}" font-size="6" fill="${AR.hot}">LOCKED</text>`, 3.05, 3.3)
  // After the stomp the ghost is scanned away top to bottom by Arasaka's red line (clean: a deletion, not a glitch).
  const gTop = r1(cy(G_H) - (G_H * sc) / 2 - 2)
  const gx0 = r1(xg - 20 * sc - 10)
  body += kf(act, `<rect x="${gx0}" y="${gTop}" width="${r1(40 * sc + 20)}" height="${r1(gy - gTop + 2)}" fill="${AR.ink}"/>`, [[0, 'transform:scaleY(0)'], [3.95, 'transform:scaleY(0)'], [4.35, 'transform:scaleY(1)']], { ease: 'ease-in-out', origin: `0px ${gTop}px` })
  body += kf(act, `<rect x="${gx0}" y="${gTop}" width="${r1(40 * sc + 20)}" height="1.2" fill="${AR.hot}"/>`, [[0, 'opacity:0;transform:translateY(0px)'], [3.94, 'opacity:0;transform:translateY(0px)'], [3.95, 'opacity:1;transform:translateY(0px)'], [4.35, `opacity:1;transform:translateY(${r1(gy - gTop)}px)`], [4.45, `opacity:0;transform:translateY(${r1(gy - gTop)}px)`]], { ease: 'ease-in-out' })
  // 1.75-2.33: the cut-in, a clean matte: black, two red rules, the cyborg's face, ARASAKA SECURITY.
  act.cast('cut', ART.ARA_CUTIN_SMASHER, 0)
  const ci = cutStrip(act, 'cut', o.w, o.h, 0.7)
  body += act.on(`<rect width="${o.w}" height="${o.h}" fill="${AR.black}"/>${ci.lb}<path d="M0 ${r1(ci.y - 1)}H${o.w}M0 ${r1(ci.y + ci.hh + 1)}H${o.w}" stroke="${AR.red}" stroke-width=".8"/><text x="${r1(o.w - 6)}" y="${r1(ci.y + ci.hh - 3)}" text-anchor="end" font-family="${FONT}" font-size="7" font-weight="700" letter-spacing="2" fill="${AR.bone}">ARASAKA SECURITY</text>`, 1.8, 2.33, { fade: 0.06 })
  // The mattes: they close in at the start (a clean 16:9) and open at the end.
  const mh = r1(o.h * 0.1)
  const matte = (top: boolean) => kf(act, `<rect y="${top ? 0 : r1(o.h - mh)}" width="${o.w}" height="${mh}" fill="${AR.black}"/>`, [[0, 'transform:scaleY(0)'], [0.45, 'transform:scaleY(1)'], [5.2, 'transform:scaleY(1)'], [5.6, 'transform:scaleY(0)']], { ease: 'ease-in-out', origin: `0px ${top ? 0 : o.h}px` })
  body += matte(true) + matte(false)
  // 4.2: the stamp. 4.9: the board's line.
  const cjk = `${FONT.replace(/,?sans-serif$/, '')},${CJK_FONT}`
  const sx = r1(Math.min(o.w - 70, xg))
  const sy = r1(o.h * 0.48)
  const stamp = `<g transform="rotate(-4 ${sx} ${sy})"><rect x="${r1(sx - 62)}" y="${r1(sy - 12)}" width="124" height="24" fill="none" stroke="${AR.red}" stroke-width="2.2"/><text x="${sx}" y="${r1(sy + 5)}" text-anchor="middle" font-family="${cjk}" font-size="13" font-weight="900" letter-spacing="1.5" fill="${AR.red}">TERMINATED · 解雇</text></g>`
  body += kf(act, stamp, [[0, 'opacity:0;transform:scale(1.15)'], [4.2, 'opacity:0;transform:scale(1.15)'], [4.32, 'opacity:1;transform:scale(1)'], [5.75, 'opacity:1;transform:scale(1)'], [6.05, 'opacity:0;transform:scale(1)']], { ease: 'cubic-bezier(.6,0,.9,.5)', origin: `${sx}px ${sy}px` })
  body += act.on(`<text x="${r1(o.w * 0.04)}" y="${r1(o.h * 0.3)}" font-family="${FONT}" font-size="8.5" font-weight="700" letter-spacing="1.6" fill="${AR.bone}">THE BOARD RECOMMENDS /compact</text>`, 4.9, 6.05, { fade: 0.25 })
  const still = `<rect width="${o.w}" height="${o.h}" fill="${AR.ink}" opacity=".93"/>${room}${act.still('stomp', r1(xg - 64 * sc + 40 * sc - 40 * sc), cy(S_H), 1, sc)}${stamp}`
  return { layer: act.done(body, still), act, fight: f }
}

// ---------------------------------------------------------------- FIGHT 3: THE ICE DUEL (Lucy)
const L_H = 44
const L_DIVE = padTo(ART.LUCY_DIVE, L_H)
const L_CROUCH = padTo(ART.LUCY_CROUCH, L_H)
const L_RECOIL = padTo(ART.LUCY_RECOIL, L_H)
const L_WIND = padTo(ART.LUCY_WINDUP, L_H)
const L_LASH = padTo(ART.LUCY_FINISH_LASH, L_H)
const L_WIN = padTo(ART.LUCY_VICTORY, L_H)
// The ICE wall is not a sprite: an empty pose stands for it (the choreographer's hits need a target).
const NOTHING: Sprite = { rows: ['.'], pal: {} } as Sprite
/**
 * The ICE duel in a region `w` by `h`, 5.6 s, in netspace (wireframe only):
 *   0.0  the dive: the grid rushes up from its vanishing point, Lucy flies in (DIVE) and lands crouched
 *   0.6  the ICE wall rises in perspective (a red hex lattice) and the daemon's eye opens in it
 *   1.25 the daemon strikes first: a red bolt, Lucy RECOILS (hit-stop) and is thrown back into a CROUCH (the setback)
 *   2.15 she gets up into the WIND-UP; data motes gather; 2.6 CUT-IN: her eyes, MONOWIRE (the beat before the hit)
 *   3.15 THE LASH: the monowire cracks the lattice (impact frame, hit-stop), cracks run, the eye shuts, the shards fall away
 *   4.1  she stands (VICTORY) and the moon rises where the ICE was: ICE BYPASSED. Reduced motion: the lash with the title.
 */
export const iceAct = (o: { at: number; w: number; h: number; id: string }): { layer: string; act: Act; fight: Fight } => {
  const act = new Act({ id: o.id, ms: FIGHT_MS['ice-duel'], at: o.at, W: o.w, H: o.h, K: 3 })
  const sc = r3(Math.min(1.3, (o.h - 6) / L_H))
  const gy = o.h - 3
  const cy = (hh: number) => r1(gy - (hh * sc) / 2)
  act.cast('dive', L_DIVE, 0.5).cast('crouch', L_CROUCH, 0.5).cast('recoil', L_RECOIL, 0.5).cast('wind', L_WIND, 0.5).cast('lash', L_LASH, 0.3).cast('win', L_WIN, 0.5).cast('ice', NOTHING, 0.5)
  const cam = new Camera(act)
  const f = new Fight(act, { sc, ink: LU.ink, star: { core: LU.white, star: LU.cyan, ring: LU.pink }, spark: LU.cyan, dust: LU.pink, lines: LU.cyan, smear: LU.cyan, impactBg: LU.ink, impactFg: LU.cyan, font: FONT }, cam)
  const p = act.p
  let body0 = ''
  const xl = r1(o.w * 0.26)
  const wx0 = r1(o.w * 0.6)
  const wx1 = r1(o.w * 0.94)
  const wmid = r1((wx0 + wx1) / 2)
  const wy = r1(o.h * 0.44)
  f.fighter('l', 'dive', -40, r1(cy(L_H) - 16), 1).fighter('ice', 'ice', wx0, wy, -1)
  f.at(0.12).approach('l', xl, 0.42, { pose: 'dive', ease: 'settle', y: cy(L_H), lines: true, ghosts: false })
  f.at(0.54).pose('l', 'crouch')
  f.at(0.9).pose('l', 'wind')
  // 1.25: the daemon strikes first. The setback: the recoil, thrown back, the crouch.
  f.at(1.3).hit('l', { pose: 'recoil', flash: 0.25, shake: 2, freeze: 0.1, x: r1(xl + 6 * sc), y: r1(cy(L_H) - 10 * sc) })
  f.backdown('l', r1(14 * sc), 0.3, { pose: 'recoil' })
  f.pose('l', 'crouch')
  body0 += fx.dust(act, 1.62, r1(xl - 14 * sc), gy, { seed: `${act.p}sk`, n: 3, color: LU.pink })
  // 2.15: up again, the wind-up; a step in.
  f.at(2.15).pose('l', 'wind')
  f.step('l', 8, 0.35)
  // 3.15: THE LASH.
  f.at(3.15).pose('l', 'lash')
  f.hit('ice', { impact: true, flash: 0.35, shake: 3, freeze: 0.22, x: r1(wx0 + 10), y: wy, r: r1(12 * sc) })
  f.at(4.1).pose('l', 'win')
  let body = scrim(act, 5.45, LU.ink, 0.94) + body0
  // Netspace: the grid floor (the dive: it rushes up from the vanishing point, then holds faint), motes drifting up.
  const horizon = r1(o.h * 0.38)
  const grid = netGrid({ W: o.w, y: horizon, h: o.h - horizon, color: LU.pink, op: 0.5 })
  body += kf(act, grid, [[0, 'opacity:0;transform:scale(2.4)'], [0.05, 'opacity:1;transform:scale(2.4)'], [0.5, 'opacity:1;transform:scale(1)'], [1.2, 'opacity:.55;transform:scale(1)'], [5.3, 'opacity:.55;transform:scale(1)'], [5.6, 'opacity:0;transform:scale(1)']], { ease: 'cubic-bezier(.5,0,.2,1)', origin: `${r1(o.w / 2)}px ${horizon}px` })
  const R = fx.rng(`${p}mt`)
  for (let i = 0; i < 7; i++) body += act.cue('rise', r3(0.4 + i * 0.6 + R() * 0.3), `<rect width="2" height="2" fill="${i % 2 ? LU.cyan : LU.pink}"/>`, { x: r1(o.w * (0.05 + R() * 0.5)), y: r1(o.h * (0.45 + R() * 0.45)), d: 1.6 })
  // The ICE wall: a hex lattice in perspective (a quad, near edge taller), rising from the floor; the daemon's eye in it.
  const quad = `M${wx0} ${r1(o.h * 0.08)}L${wx1} ${r1(o.h * 0.2)}L${wx1} ${r1(gy - 4)}L${wx0} ${gy}Z`
  const hex = `<pattern id="${p}hx" width="12" height="10.4" patternUnits="userSpaceOnUse"><path d="M3 0h6l3 5.2l-3 5.2h-6l-3 -5.2z" fill="none" stroke="${LU.ice}" stroke-width=".8"/></pattern>`
  const wall = `<defs>${hex}</defs><path d="${quad}" fill="${LU.iceDark}" fill-opacity=".55"/><path d="${quad}" fill="url(#${p}hx)"/><path d="${quad}" fill="none" stroke="${LU.ice}" stroke-width="1.2"/>`
  const eye = `<path d="M${r1(wmid - 11)} ${wy}Q${wmid} ${r1(wy - 8)} ${r1(wmid + 11)} ${wy}Q${wmid} ${r1(wy + 8)} ${r1(wmid - 11)} ${wy}Z" fill="#14000A" stroke="${LU.ice}" stroke-width="1.2"/><path d="M${r1(wmid - 1.4)} ${r1(wy - 5)}h2.8v10h-2.8z" fill="${LU.ice}"/>`
  body += kf(act, wall, [[0, 'opacity:0;transform:scaleY(0)'], [0.6, 'opacity:1;transform:scaleY(0)'], [1.0, 'opacity:1;transform:scaleY(1)'], [3.5, 'opacity:1;transform:scaleY(1)'], [3.52, 'opacity:0;transform:scaleY(1)']], { ease: 'cubic-bezier(.2,1.4,.4,1)', origin: `0px ${gy}px` })
  body += kf(act, eye, [[0, 'opacity:0;transform:scaleY(0)'], [0.95, 'opacity:0;transform:scaleY(0)'], [1.1, 'opacity:1;transform:scaleY(1)'], [3.2, 'opacity:1;transform:scaleY(1)'], [3.3, 'opacity:0;transform:scaleY(.1)']], { origin: `${wmid}px ${wy}px` })
  // 1.22-1.32: the daemon's bolt at her.
  body += act.win(1.22, 1.32, `<path d="M${r1(wmid - 10)} ${wy}L${r1((wmid + xl) / 2 + 10)} ${r1(wy - 8)}L${r1((wmid + xl) / 2)} ${r1(wy + 4)}L${r1(xl + 10)} ${r1(cy(L_H) - 10 * sc)}" fill="none" stroke="${LU.ice}" stroke-width="2"/>`)
  body += cam.wrap(f.body())
  // 3.05-3.6: the monowire: a cyan arc drawn on from her hand to the wall, then gone.
  const hx = r1(xl + 8 + 10 * sc)
  const hy = r1(cy(L_H) - 6 * sc)
  const wire = `<path d="M${hx} ${hy}Q${r1((hx + wx0) / 2)} ${r1(o.h * 0.05)} ${r1(wx0 + 10)} ${wy}" fill="none" stroke="${LU.cyan}" stroke-width="1.6" stroke-dasharray="400" pathLength="400"/>`
  body += kf(act, wire, [[0, 'opacity:0;stroke-dashoffset:400'], [3.02, 'opacity:1;stroke-dashoffset:400'], [3.15, 'opacity:1;stroke-dashoffset:0'], [3.5, 'opacity:1;stroke-dashoffset:0'], [3.7, 'opacity:0;stroke-dashoffset:0']])
  // The cracks run from the hit, then the lattice falls apart in shards (perspective: the far ones smaller, falling slower).
  const Rc = fx.rng(`${p}ck`)
  let cracks = ''
  for (let i = 0; i < 5; i++) {
    let d = `M${r1(wx0 + 10)} ${wy}`
    let x = wx0 + 10
    let y = wy
    for (let k = 0; k < 3; k++) { x += 6 + Rc() * 10; y += (Rc() - 0.5) * 16 + (i - 2) * 3; d += `L${r1(x)} ${r1(y)}` }
    cracks += `<path d="${d}" fill="none" stroke="${LU.white}" stroke-width="1"/>`
  }
  body += act.on(cracks, 3.16, 3.52)
  for (let i = 0; i < 6; i++) {
    const sx = r1(wx0 + 4 + (i % 3) * ((wx1 - wx0 - 8) / 3))
    const sy = r1(o.h * (0.18 + Math.floor(i / 3) * 0.38))
    const shard = `<path d="M0 0l${r1(6 + Rc() * 5)} ${r1(2 + Rc() * 4)}l${r1(-2 - Rc() * 4)} ${r1(7 + Rc() * 5)}z" fill="${LU.ice}" stroke="${LU.white}" stroke-width=".5"/>`
    const far = 0.6 + (i % 3) * 0.2
    body += act.mv(shard, [[0, sx, sy, 0], [3.49, sx, sy, 0], [3.5, sx, sy, 1], [4.3, r1(sx + (Rc() - 0.3) * 30), r1(gy + 6), 0, `rotate(${Math.round(80 + Rc() * 200)}deg) scale(${r3(far)})`], [5.6, r1(sx), r1(gy + 6), 0]], { ease: 'cubic-bezier(.5,0,1,1)' })
  }
  // 2.6-3.1: the cut-in. Her eyes in a wireframe letterbox, pink and cyan rules, MONOWIRE.
  act.cast('cut', ART.LUCY_CUTIN, 0)
  const ci = cutStrip(act, 'cut', o.w, o.h)
  body += act.win(2.6, 3.1, `<rect width="${o.w}" height="${o.h}" fill="${LU.ink}"/>${ci.lb}<path d="M0 ${r1(ci.y - 1)}H${o.w}" stroke="${LU.pink}" stroke-width="1"/><path d="M0 ${r1(ci.y + ci.hh + 1)}H${o.w}" stroke="${LU.cyan}" stroke-width="1"/><text x="${r1(o.w - 6)}" y="${r1(ci.y + ci.hh - 3)}" text-anchor="end" font-family="${MONO}" font-size="7" font-weight="700" letter-spacing="1" fill="${LU.cyan}">MONOWIRE</text>`)
  // 4.1: the moon rises where the ICE was; ICE BYPASSED.
  act.cast('moon', ART.LUCY_MOON_0, 0.5)
  const mx = r1(wmid)
  body += act.mv(`<g opacity=".9">${act.bank.use('moon', 0, 0, 1, r3(Math.min(0.85, (o.h * 0.5) / 40)))}</g>`, [[0, mx, r1(o.h + 30), 0], [4.0, mx, r1(o.h + 30), 0], [4.8, mx, r1(o.h * 0.4), 1], [5.4, mx, r1(o.h * 0.36), 1], [5.6, mx, r1(o.h * 0.36), 0]], { ease: 'settle' })
  const title = `<text x="${r1(o.w * 0.47)}" y="${r1(o.h * 0.28)}" text-anchor="middle" font-family="${FONT}" font-size="15" font-weight="800" letter-spacing="2" fill="${LU.pink}" stroke="${LU.ink}" stroke-width="2" paint-order="stroke">ICE BYPASSED</text>`
  body += act.slam(title, 4.3, 5.45)
  const still = `<rect width="${o.w}" height="${o.h}" fill="${LU.ink}" opacity=".92"/>${netGrid({ W: o.w, y: horizon, h: o.h - horizon, color: LU.pink, op: 0.3 })}${act.still('lash', xl + 8, cy(L_H), 1, sc)}${title}`
  return { layer: act.done(body, still), act, fight: f }
}

const ACTS: Record<FightKind, (o: { at: number; w: number; h: number; id: string }) => { layer: string; act: Act; fight: Fight }> = { maxtac: maxtacAct, boardroom: boardroomAct, 'ice-duel': iceAct }

/** The fight on the classic Cyberpunk band (OW wide): placed in its region, '' when none is due. */
export const cyberFightBand = (egg: CyberEgg, OW: number, at: number, working: boolean, ctxPct = 0): string => {
  const ft = fightAt(egg, at, working)
  if (!ft || at >= ft.startAt + FIGHT_MS[ft.kind]) return ''
  const r = fightRegion(OW, ctxPct)
  const a = ACTS[ft.kind]({ at: ft.startAt, w: r.w, h: r.h, id: `cyf-${ft.kind}-band-${OW}-${r.h}` })
  return placed(a.layer, r, `${a.act.p}rg`)
}

// ---------------------------------------------------------------- the pane's light echo (in BREACH PROTOCOL's matrix)
/** The matrix's box in the breach card (eggs.ts breachCard: x0 18, y0 36, five cells of 32, five rows of 17). */
export const ECHO_BOX = { x: 14, y: 32, w: 168, h: 92 }
/**
 * The pane's echo of the fight, light (no fighters, a few k): over BREACH PROTOCOL's hex matrix (a decoration; the buffer
 * count, the daemons and every number stay clear). 2077: the strobe, his cut-in, the flash, the title. Arasaka: the mattes,
 * the cyborg's cut-in, the lock, TERMINATED. Lucy: the ICE lattice over the matrix, the lash that cracks it, ICE BYPASSED.
 */
export const cyberFightEcho = (egg: CyberEgg, at: number, working: boolean): string => {
  const ft = fightAt(egg, at, working)
  if (!ft || at >= ft.startAt + FIGHT_MS[ft.kind]) return ''
  const r = ECHO_BOX
  const act = new Act({ id: `cyf-${ft.kind}-echo`, ms: FIGHT_MS[ft.kind], at: ft.startAt, W: r.w, H: r.h, K: 3 })
  const p = act.p
  const cx = r1(r.w / 2)
  const cyy = r1(r.h / 2)
  let body = ''
  let still = ''
  if (ft.kind === 'maxtac') {
    act.cast('cut', ART.CP77_CUTIN_DAVID, 0)
    const ci = cutStrip(act, 'cut', r.w, r.h, 0.5)
    body += act.on(`<rect width="${r.w}" height="${r.h}" fill="${CP.ink}"/>`, 0, 5.45, { fade: 0.12, op: 0.92 })
    body += act.win(0.05, 1.7, `<g class="${p}sw"><rect width="${r.w / 2}" height="${r.h}" fill="${CP.red}" opacity=".45"/><rect x="${r.w / 2}" width="${r.w / 2}" height="${r.h}" fill="${CP.blue}" opacity=".45"/></g>`)
    act.extraCss.add(`.${p}sw{animation:${p}sw .17s steps(1) infinite}@keyframes ${p}sw{50%{transform:translateX(${r.w / 2}px) scaleX(-1)}}@media (prefers-reduced-motion: reduce){.${p}sw{animation:none}}`)
    body += act.on(`<text x="${cx}" y="${r1(cyy + 4)}" text-anchor="middle" font-family="${MONO}" font-size="10" font-weight="700" letter-spacing="1" fill="${CP.white}">MAXTAC INBOUND</text>`, 0.2, 1.7)
    body += act.win(1.75, 2.28, `<rect width="${r.w}" height="${r.h}" fill="#000"/>${ci.lb}<path d="M0 ${r1(ci.y - 1)}H${r.w}M0 ${r1(ci.y + ci.hh + 1)}H${r.w}" stroke="${CP.yellow}"/>`)
    body += act.on(`<rect width="${r.w}" height="${r.h}" fill="#021A12"/>`, 2.28, 2.95, { fade: 0.08, op: 0.8 }) + fx.flash(act, 2.86, { a: 0.45, color: CP.yellow, d: 0.1 })
    still = `<text x="${cx}" y="${r1(cyy + 4)}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="900" fill="#FFF8B0" stroke="${CP.yellow}" stroke-width=".5">/compact, CHOOM</text>`
    body += act.slam(still, 4.0, 5.45)
  } else if (ft.kind === 'boardroom') {
    act.cast('cut', ART.ARA_CUTIN_SMASHER, 0)
    const ci = cutStrip(act, 'cut', r.w, r.h, 0.5)
    body += act.on(`<rect width="${r.w}" height="${r.h}" fill="${AR.ink}"/>`, 0, 6.05, { fade: 0.2, op: 0.94 })
    body += act.on(`<text x="${cx}" y="${r1(cyy + 3)}" text-anchor="middle" font-family="${MONO}" font-size="8" letter-spacing="1" fill="${AR.hot}">ROGUE PROCESS</text>`, 0.6, 1.75, { fade: 0.2 })
    body += act.on(`<rect width="${r.w}" height="${r.h}" fill="#000"/>${ci.lb}<path d="M0 ${r1(ci.y - 1)}H${r.w}M0 ${r1(ci.y + ci.hh + 1)}H${r.w}" stroke="${AR.red}" stroke-width=".8"/>`, 1.8, 2.33, { fade: 0.06 })
    body += kf(act, `<rect x="${cx - 9}" y="${cyy - 9}" width="18" height="18" fill="none" stroke="${AR.hot}"/>`, [[0, 'opacity:0;transform:scale(2.2)'], [2.8, 'opacity:0;transform:scale(2.2)'], [2.82, 'opacity:1;transform:scale(2.2)'], [3.05, 'opacity:1;transform:scale(1)'], [3.75, 'opacity:0;transform:scale(1)']], { ease: 'ease-in-out', origin: `${cx}px ${cyy}px` })
    const cjk = `${FONT.replace(/,?sans-serif$/, '')},${CJK_FONT}`
    still = `<g transform="rotate(-4 ${cx} ${cyy})"><rect x="${cx - 70}" y="${cyy - 12}" width="140" height="24" fill="none" stroke="${AR.red}" stroke-width="2"/><text x="${cx}" y="${cyy + 5}" text-anchor="middle" font-family="${cjk}" font-size="13" font-weight="900" letter-spacing="1.2" fill="${AR.red}">TERMINATED · 解雇</text></g>`
    body += kf(act, still, [[0, 'opacity:0;transform:scale(1.15)'], [4.2, 'opacity:0;transform:scale(1.15)'], [4.32, 'opacity:1;transform:scale(1)'], [5.75, 'opacity:1;transform:scale(1)'], [6.05, 'opacity:0;transform:scale(1)']], { ease: 'cubic-bezier(.6,0,.9,.5)', origin: `${cx}px ${cyy}px` })
  } else {
    const hex = `<pattern id="${p}hx" width="12" height="10.4" patternUnits="userSpaceOnUse"><path d="M3 0h6l3 5.2l-3 5.2h-6l-3 -5.2z" fill="none" stroke="${LU.ice}" stroke-width=".8"/></pattern>`
    body += act.on(`<rect width="${r.w}" height="${r.h}" fill="${LU.ink}"/>`, 0, 5.45, { fade: 0.15, op: 0.9 })
    body += kf(act, `<defs>${hex}</defs><rect width="${r.w}" height="${r.h}" fill="url(#${p}hx)"/><rect x=".5" y=".5" width="${r.w - 1}" height="${r.h - 1}" fill="none" stroke="${LU.ice}"/>`, [[0, 'opacity:0;transform:scaleY(0)'], [0.6, 'opacity:1;transform:scaleY(0)'], [1.0, 'opacity:1;transform:scaleY(1)'], [3.5, 'opacity:1;transform:scaleY(1)'], [3.8, 'opacity:0;transform:scaleY(1)']], { ease: 'cubic-bezier(.2,1.4,.4,1)', origin: `0px ${r.h}px` })
    body += act.on(`<text x="${cx}" y="${r1(cyy + 4)}" text-anchor="middle" font-family="${MONO}" font-size="9" font-weight="700" letter-spacing="1" fill="${LU.ice}">BLACK ICE</text>`, 1.0, 2.6)
    body += act.win(3.15, 3.5, `<path d="M${cx} ${cyy}l-30 -20l-14 6M${cx} ${cyy}l34 -14l20 4M${cx} ${cyy}l-20 26M${cx} ${cyy}l26 30l18 -4" fill="none" stroke="${LU.white}" stroke-width="1.2"/>`) + fx.flash(act, 3.15, { a: 0.45, color: LU.cyan, d: 0.12 })
    still = `<text x="${cx}" y="${r1(cyy + 5)}" text-anchor="middle" font-family="${FONT}" font-size="14" font-weight="800" letter-spacing="2" fill="${LU.pink}">ICE BYPASSED</text>`
    body += act.slam(still, 4.3, 5.45)
  }
  return placed(act.done(body, `<rect width="${r.w}" height="${r.h}" fill="${CP.ink}" opacity=".88"/>${still}`), r, `${p}rg`)
}

// ---------------------------------------------------------------- each skin's flavour of the skin switch
/** The skin's emblem (Chin's art, 32 x 32) at the switch's middle (band only): turned like a coin, in, one turn, out. */
const emblem = (act: Act, key: 'CP77_EMBLEM' | 'ARA_EMBLEM', x: number, y: number, turn: boolean): string => {
  // Folded to three inks first (the switch's act keeps six), so the band's switch stays inside its 8 k.
  const sp = ART[key]
  const m = quantise(sp, 3)
  act.cast(key, { ...sp, pal: Object.fromEntries(Object.entries(sp.pal).map(([k, c]) => [k, m.get(c) ?? c])) }, 0.5)
  const sc = r3(Math.min(1.5, (act.H * 0.55) / 32))
  const coin = act.bank.use(key, r1(x), r1(y), 1, sc)
  const rows: [number, string][] = turn
    ? [[0, 'opacity:0;transform:scaleX(.1)'], [0.06, 'opacity:1;transform:scaleX(1)'], [0.2, 'opacity:1;transform:scaleX(-1)'], [0.34, 'opacity:1;transform:scaleX(1)'], [0.5, 'opacity:1;transform:scaleX(1)'], [0.62, 'opacity:0;transform:scaleX(.1)']]
    : [[0, 'opacity:0;transform:scale(.92)'], [0.12, 'opacity:1;transform:scale(1)'], [0.5, 'opacity:1;transform:scale(1)'], [0.66, 'opacity:0;transform:scale(1)']]
  return kf(act, coin, rows, { origin: `${r1(x)}px ${r1(y)}px`, ease: turn ? 'linear' : 'ease-in-out' })
}
/** 2077: JACK IN. Scanlines run across from the left with a red/cyan split on the edge; the emblem turns like a coin. */
const CP77_SWITCH: SwitchFlavour = {
  dir: 'r',
  ms: 720,
  shards: 3,
  veil: 0.5,
  extra: (act, surface) => {
    // The three lines ride one track (the engine holds a track's last key to the end: one track, not three); each starts a
    // little further left, so they still arrive one after another.
    let lines = ''
    for (let i = 0; i < 3; i++) lines += `<rect x="${-14 * i}" y="${r1((act.H * (i + 0.5)) / 3)}" width="${r1(act.W * 0.4)}" height="1.4" fill="${i % 2 ? CP.cyan : CP.red}"/>`
    let s = act.mv(`<g opacity=".75">${lines}</g>`, [[0, -act.W * 0.4, 0, 1], [0.5, act.W + 28, 0, 1], [0.54, act.W + 28, 0, 0]], { ease: 'cubic-bezier(.2,.8,.3,1)' })
    s += act.on(`<text x="10" y="${r1(Math.min(act.H - 4, 14))}" font-family="${MONO}" font-size="8" font-weight="700" letter-spacing="1" fill="${CP.yellow}">JACKING IN…</text>`, 0, 0.5)
    return s + (surface === 'band' ? emblem(act, 'CP77_EMBLEM', act.W * 0.5, act.H / 2, true) : '')
  },
}
/** Arasaka: the shutters. Five slats close and open, eased, symmetrical, a red hairline; the emblem settles in. Never a glitch. */
const ARA_SWITCH: SwitchFlavour = {
  dir: 'd',
  ms: 760,
  bar: false,
  shards: 0,
  veil: 0.45,
  extra: (act, surface) => {
    let s = ''
    const n = 5
    const sh = act.H / n
    for (let i = 0; i < n; i++) s += act.kf(`<rect y="${r1(i * sh)}" width="${act.W}" height="${r1(sh + 0.5)}" fill="${AR.black}" opacity=".6"/>`, [[0, 'transform:scaleY(0)'], [0.18 + i * 0.03, 'transform:scaleY(1)'], [0.4 + i * 0.03, 'transform:scaleY(1)'], [0.62 + i * 0.03, 'transform:scaleY(0)'], [0.76, 'transform:scaleY(0)']], { ease: 'ease-in-out', origin: `0px ${r1(i * sh)}px` })
    s += act.kf(`<rect width="${act.W}" height="1" fill="${AR.red}"/>`, [[0, 'transform:translateY(0px)'], [0.6, `transform:translateY(${act.H}px)`], [0.76, `transform:translateY(${act.H}px)`]], { ease: 'ease-in-out' })
    return s + (surface === 'band' ? emblem(act, 'ARA_EMBLEM', act.W * 0.5, act.H / 2, false) : '')
  },
}
/** Lucy: the dive. The panel falls into a wireframe grid and resolves out of it; her moon rises through the middle (band). */
const LUCY_SWITCH: SwitchFlavour = {
  dir: 'u',
  ms: 760,
  shards: 0,
  veil: 0.5,
  extra: (act, surface) => {
    const g = netGrid({ W: act.W, y: act.H * 0.3, h: act.H * 0.7, color: LU.pink, op: 0.7 })
    let s = act.kf(g, [[0, 'opacity:0;transform:scale(2.2)'], [0.05, 'opacity:1;transform:scale(2.2)'], [0.45, 'opacity:.8;transform:scale(1)'], [0.7, 'opacity:0;transform:scale(1)'], [0.76, 'opacity:0;transform:scale(1)']], { origin: `${r1(act.W / 2)}px ${r1(act.H * 0.3)}px`, ease: 'cubic-bezier(.5,0,.2,1)' })
    if (surface === 'band') {
      act.cast('mn', ART.LUCY_MOON_0, 0.5)
      const sc = r3(Math.min(1.2, (act.H * 0.45) / 40))
      s += act.mv(act.bank.use('mn', 0, 0, 1, sc), [[0, act.W / 2, act.H + 30, 0], [0.12, act.W / 2, act.H * 0.75, 1], [0.5, act.W / 2, act.H * 0.5, 1], [0.7, act.W / 2, act.H * 0.45, 0]], { ease: 'settle' })
    }
    return s
  },
}
/** The flavour of the switch INTO each classic skin (SAMURAI keeps the generic one). */
export const CYBER_SWITCH: Partial<Record<CyberEgg, SwitchFlavour>> = { runners: CP77_SWITCH, corpo: ARA_SWITCH, netrun: LUCY_SWITCH }
