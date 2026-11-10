// Cyberpunk: Edgerunners 2 (D mode) and its hidden CAPRICORN (CAPRI mode), wave 2 phase B motion, built on hooks/stage.
//
//   D mode      D is shot like a FILM (the skin's own words: Pan, Zoom, Cut, Action, Print): a clapper slate when a job
//               starts ("SC.nn TAKE n"), Roman's tape on NETRUN TRACE (sprockets that run, a playhead that scrubs, a REWIND
//               smear when a beat lands, CUT! when the job is done), and the rare fight D vs a CYBERPSYCHO, cut like a film:
//               slate, torn-paper wipe, the lunge, the optics close-up before the counter, a freeze-frame on torn paper, CUT!.
//   CAPRI mode  she is DIGITAL possession: her bust turning inside the holo capsule (rotating glass ribs and a light pass),
//               the band's border beating lub-dub faster as the context climbs, and the rare fight CAPRI vs D for the HUD:
//               the HUD splits on a diagonal, a tug of war, the face-to-face cut-in, the collision, D shatters in slices.
//
// Rare things go through ONE director per mode (stage/director.ts, `fightLane`: at most one fight per 30-45 min, working only)
// and every act has a replay name (`/missioncontrol play cyberpsycho | capri-vs-d | slate`). Every act is pinned (`Act`) and has
// a still frame. Motion never covers the working numbers: band acts stay inside the title rows, left of the readouts.
// Fan homage: names only, our own pixel art (cyberpunk-art.ts), PG-13 (a knock-back and a paper rip, never a wound).
import type { Sprite } from './cast'
import { ER_CAPRI_BUST } from './cast'
import * as ART from './cyberpunk-art'
import { esc } from './stage/budget'
import { Camera } from './stage/camera'
import { Fight, fightLane } from './stage/choreo'
import { Director, localOffsetMs } from './stage/director'
import type { Slot } from './stage/director'
import { FrameBank, silhouette } from './stage/frames'
import { turntable } from './stage/turntable'
import * as fx from './stage/fx'
import { keepClip } from './stage/keep'
import type { BandStage } from './stage/keep'
import { registerPlay } from './stage/replay'
import { Act, r1, r3 } from './stage/timeline'
import type { SwitchFlavour } from './stage/wipe'
import * as wipe from './stage/wipe'

/** The skin ids the replays are offered on (CAPRI mode is the same skin, worn as `capricorn` from the picker too). */
export const ER2_SKINS = ['edgerunners-2', 'capricorn']
const FONT = "'Avenir Next Condensed','Roboto Condensed','Arial Narrow',Bahnschrift,sans-serif"
const MONO = "'SF Mono',Menlo,Consolas,monospace"
// D's film: cobalt, ice, torn magenta paper on a near-black glass. Capri: hot red, acid green, white.
const C = { ink: '#070A12', cobalt: '#3E80F7', ice: '#BFD8FF', paper: '#E0247A', paperLit: '#FF6AA8', paperDark: '#5A0E30', white: '#F7F4EA', hot: '#FF1F4E', green: '#3DF27A', pink: '#FF2E7E' }

// ---------------------------------------------------------------- sprites
/** Mirrored rows: the art faces one way, the choreographer wants every fighter drawn facing right at face 1. */
export const mirror = (sp: Sprite): Sprite => ({ ...sp, rows: sp.rows.map(r => [...r].reverse().join('')) })
/** Empty rows on top so a fighter's poses share one height (the feet stay on the floor when the pose swaps). */
export const padTo = (sp: Sprite, h: number): Sprite => {
  const w = Math.max(...sp.rows.map(r => r.length))
  return { ...sp, rows: [...Array.from({ length: Math.max(0, h - sp.rows.length) }, () => '.'.repeat(w)), ...sp.rows.map(r => r.padEnd(w, '.'))] }
}
const D_H = 49
const P_H = 48
const D_SIDE = padTo(ART.ER2_D_SIDESTEP, D_H)
const D_COUNTER = padTo(ART.ER2_D_COUNTER, D_H)
const D_FREEZE = padTo(ART.ER2_D_FREEZE, D_H)
// The psycho is drawn facing left (blades toward D): mirrored here so face -1 shows him as drawn.
const P_LUNGE = mirror(padTo(ART.ER2_PSYCHO_LUNGE, P_H))
// The knock-down (Chin's art): drawn falling head to the left, so face -1 throws him head-away from D. (STAGGER and DOWN are
// cut too; they do not fit the band cut's 32 k with the cut-in, so the punch is a flinch and he glitches out mid-skid.)
const P_FALL = padTo(ART.ER2_PSYCHO_FALL, P_H)


// ---------------------------------------------------------------- the two directors (one per mode) and the replays
export const ACT_MS = { cyberpsycho: 5000, 'capri-vs-d': 4000, slate: 900, rewind: 450, cut: 1600 } as const
export type Er2Kind = keyof typeof ACT_MS
export type Er2Play = { kind: Er2Kind; at: number }
let PLAY: Er2Play | undefined
/** The act `/missioncontrol play` (or a test) started last. */
export const er2Play = (): Er2Play | undefined => PLAY
export const setEr2Play = (p: Er2Play | undefined): void => { PLAY = p }
/** A replayed act of `kind` live at `at`: its start. */
export const playing = (kind: Er2Kind, at: number): number | undefined => {
  const p = PLAY
  return p && p.kind === kind && at >= p.at - 1000 && at < p.at + ACT_MS[kind] ? p.at : undefined
}
/** D mode's director: the cyberpsycho fight, at most one per 30-45 min, only while a job works. */
export const dDirector = (dayOffsetMs = 0): Director => fightLane(new Director('er2-film', { dayOffsetMs }), [{ id: 'cyberpsycho', ms: ACT_MS.cyberpsycho }])
/** CAPRI mode's director: the fight for the HUD, the same rarity, its own seed (the two modes never share a schedule). */
export const capriDirector = (dayOffsetMs = 0): Director => fightLane(new Director('capri-hud', { dayOffsetMs }), [{ id: 'capri-vs-d', ms: ACT_MS['capri-vs-d'] }])
let D_DIR = dDirector(localOffsetMs(Date.now()))
let CAPRI_DIR = capriDirector(localOffsetMs(Date.now()))
/** The fight to draw at `at` (a replay first, else the mode's director), or undefined. `ahead`: a panel that redraws seldom draws it early. */
export const er2Fight = (at: number, working: boolean, sec: boolean, ahead = 60_000): { kind: Er2Kind; startAt: number } | undefined => {
  const kind: Er2Kind = sec ? 'capri-vs-d' : 'cyberpsycho'
  const p = playing(kind, at) ?? (PLAY && PLAY.kind === kind && PLAY.at > at && PLAY.at - at < ahead ? PLAY.at : undefined)
  if (p !== undefined) return { kind, startAt: p }
  const s: Slot | undefined = (sec ? CAPRI_DIR : D_DIR).at(at, { working }, ahead)
  return s ? { kind, startAt: s.startAt } : undefined
}
/** Is a fight on screen at `at`: Capri's walks, hacks, duets and glitches hush for it (one act at a time). */
export const fightLive = (at: number, working: boolean, sec: boolean): boolean => {
  const f = er2Fight(at, working, sec, 0)
  return Boolean(f && at >= f.startAt - 500 && at < f.startAt + ACT_MS[f.kind] + 500)
}
const play = (kind: Er2Kind) => (at: number): void => { PLAY = { kind, at } }
registerPlay(ER2_SKINS, { name: 'cyberpsycho', what: 'D vs a cyberpsycho, cut like a film', run: play('cyberpsycho') })
registerPlay(ER2_SKINS, { name: 'capri-vs-d', what: 'Capri vs D for control of the HUD', run: play('capri-vs-d') })
registerPlay(ER2_SKINS, { name: 'slate', what: "the clapper slate (D's job start)", run: play('slate') })
registerPlay(ER2_SKINS, { name: 'cut', what: 'CUT! on the tape (a job done)', run: play('cut') })

/** `act.kf` holding its last row to the act's end (a track whose rows stop early would slide back to its base by 100%). */
const kf = (act: Act, svg: string, rows: [number, string][], o: { ease?: string; c?: boolean; origin?: string } = {}): string => act.kf(svg, [...rows, [999, (rows[rows.length - 1] as [number, string])[1]]], o)

// ---------------------------------------------------------------- small parts in D's film look
/** A torn edge: a jagged vertical path from (x, y0) to (x, y1), seeded. */
const tornEdge = (x: number, y0: number, y1: number, seed: string, amp = 3): string => {
  const R = fx.rng(seed)
  let d = ''
  for (let y = y0; y <= y1; y += 4) d += `L${r1(x + (R() - 0.5) * 2 * amp)} ${r1(Math.min(y, y1))}`
  return d
}
/** A frame of torn magenta paper around (0, 0, w, h): the outside filled, the inner hole's four edges torn (evenodd). */
const tornFrame = (w: number, h: number, m: number, seed: string): string => {
  const R = fx.rng(seed)
  const j = (v: number) => r1(v + (R() - 0.5) * m * 0.9)
  let d = `M${-4} ${-4}H${w + 4}V${h + 4}H${-4}Z M${m} ${m}`
  for (let x = m; x <= w - m; x += 9) d += `L${Math.round(x)} ${Math.round(j(m))}`
  for (let y = m; y <= h - m; y += 7) d += `L${Math.round(j(w - m))} ${Math.round(y)}`
  for (let x = w - m; x >= m; x -= 9) d += `L${Math.round(x)} ${Math.round(j(h - m))}`
  for (let y = h - m; y >= m; y -= 7) d += `L${Math.round(j(m))} ${Math.round(y)}`
  return `<path d="${d}Z" fill="${C.paper}" fill-rule="evenodd"/>`
}
/** A sheet of torn magenta paper over [x0, x1] x [y0, y1] whose right edge is torn, with its drop shadow. */
const paperSheet = (x0: number, x1: number, y0: number, y1: number, seed: string): string => {
  const edge = tornEdge(x1, y0, y1, seed, 4)
  return `<path d="M${x0} ${y0}H${x1}${edge}L${x0} ${y1}Z" fill="${C.paperDark}" transform="translate(3 2)"/><path d="M${x0} ${y0}H${x1}${edge}L${x0} ${y1}Z" fill="${C.paper}"/><path d="M${x1} ${y0}${edge}" fill="none" stroke="${C.paperLit}" stroke-width="1.2"/>`
}
/** A clapper slate, `w` wide, at (x, y): the striped bar (a <g> of its own, to snap shut) and the board with its lines. */
const slateParts = (x: number, y: number, w: number, lines: [string, string]): { bar: string; board: string } => {
  const h = w * 0.5
  const stripes = `<path d="${Array.from({ length: 6 }, (_, i) => `M${r1(x + 4 + i * (w / 6))} ${y}h${r1(w / 12)}l-4 7h-${r1(w / 12)}z`).join('')}" fill="${C.white}"/>`
  const bar = `<rect x="${x}" y="${y}" width="${w}" height="7" fill="${C.ink}" stroke="${C.white}" stroke-width=".8"/>${stripes}`
  const board = `<rect x="${x}" y="${y + 8}" width="${w}" height="${r1(h)}" fill="${C.ink}" stroke="${C.white}" stroke-width=".8"/><line x1="${x}" y1="${r1(y + 8 + h / 2)}" x2="${x + w}" y2="${r1(y + 8 + h / 2)}" stroke="${C.white}" stroke-opacity=".5"/>`
    + `<text x="${x + 5}" y="${r1(y + 8 + h / 2 - 4)}" font-family="${MONO}" font-size="${r1(h * 0.28)}" font-weight="700" fill="${C.white}">${esc(lines[0])}</text>`
    + `<text x="${x + 5}" y="${r1(y + 8 + h - 4)}" font-family="${MONO}" font-size="${r1(h * 0.24)}" font-weight="700" fill="${C.ice}">${esc(lines[1])}</text>`
  return { bar, board }
}
/** A soft dark scrim over the act's region (fades at both ends), so the figures read over the title row. */
const scrim = (act: Act, t1: number, op = 0.9, fill = C.ink): string => {
  const id = `${act.p}sg`
  return `<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${fill}"/><stop offset=".86" stop-color="${fill}"/><stop offset="1" stop-color="${fill}" stop-opacity="0"/></linearGradient></defs>${act.on(`<rect width="${act.W}" height="${act.H}" fill="url(#${id})"/>`, 0, t1, { fade: 0.14, op })}`
}
/** Roman's REC viewfinder: corner brackets, a red REC dot and a timecode, inside (x, y, w, h). */
const recFrame = (x: number, y: number, w: number, h: number, tc: string, color = C.ice): string => {
  const L = Math.min(10, w / 6)
  const br = `M${x} ${y + L}V${y}H${x + L}M${x + w - L} ${y}H${x + w}V${y + L}M${x + w} ${y + h - L}V${y + h}H${x + w - L}M${x + L} ${y + h}H${x}V${y + h - L}`
  return `<path d="${br}" fill="none" stroke="${color}" stroke-width="1.2"/><circle cx="${x + 7}" cy="${y + 7}" r="2.4" fill="${C.hot}"/><text x="${x + 13}" y="${y + 10}" font-family="${MONO}" font-size="7" font-weight="700" fill="${C.hot}">REC</text><text x="${x + w - 4}" y="${y + 10}" text-anchor="end" font-family="${MONO}" font-size="7" fill="${color}">${tc}</text>`
}
/** A reticle (D's optics) that snaps onto (x, y). */
const reticle = (x: number, y: number, r: number, color = '#5BD8FF'): string =>
  `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="none" stroke="${color}" stroke-width="1.2"/><path d="M${r1(x - r - 4)} ${r1(y)}h6M${r1(x + r - 2)} ${r1(y)}h6M${r1(x)} ${r1(y - r - 4)}v6M${r1(x)} ${r1(y + r - 2)}v6" stroke="${color}" stroke-width="1.2"/><circle cx="${r1(x)}" cy="${r1(y)}" r="1.2" fill="${color}"/>`
/** Capri's eye (pink, boxed), the corner hint that she watched. */
const capriEye = (x: number, y: number): string => `<rect x="${x - 7}" y="${y - 5}" width="14" height="10" fill="${C.ink}" stroke="${C.pink}"/><path d="M${x - 5} ${y}q5 -4 10 0q-5 4 -10 0z" fill="${C.white}"/><circle cx="${x}" cy="${y}" r="1.8" fill="${C.pink}"/>`
/** The region an act owns, placed and clipped: the band's title rows, never the readouts on the right or the rows below. */
const placed = (layer: string, x: number, y: number, w: number, h: number, id: string): string =>
  `<g transform="translate(${r1(x)} ${r1(y)})"><defs><clipPath id="${id}"><rect width="${r1(w)}" height="${r1(h)}"/></clipPath></defs><g clip-path="url(#${id})">${layer}</g></g>`
/** The band's act region: from the figure box to just left of the percent and the readouts (64% of the width, never past the
 *  band's clear span, stage/keep.ts), the title rows. */
// At most 700 wide: the fighters never grow with the region (its height sets them), only its floor and trails do, so a very wide
// band (a short slot on a wide window) kept adding chars: 32,049 at 1600 px, over the 32 k fight budget.
export const bandRegion = (W: number, H: number, stage?: BandStage): { x: number; y: number; w: number; h: number } => ({ x: 8, y: 34, w: Math.round(Math.min(W * 0.64, W - 300, 700, stage ? stage.x1 - 8 : W)), h: Math.max(60, Math.min(74, H - 95)) })

// ---------------------------------------------------------------- FIGHT 1: D vs a cyberpsycho, cut like a film (D mode)
/**
 * D vs a CYBERPSYCHO in one region `w` by `h` (the band's title rows, or the tape's viewfinder), 4.6 s:
 *   0.0  slate SC.85 TAKE 1 · ACTION, the clapper snaps; a torn-paper sheet tears away and opens the frame
 *   0.5  the psycho LUNGES in from the right (hard cut, 1 px shake); D slips it (SIDESTEP), the blades whiff (smear)
 *   1.45 CUT-IN: D's optics close-up in a letterbox, Roman's REC frame, the reticle snaps on (the beat before the hit)
 *   2.05 the COUNTER: a straight punch (hit-stop), then the kick: an impact frame and a freeze-frame on torn paper
 *   2.5  the psycho is knocked back along a paper rip (PG-13), lands, glitches out
 *   3.35 CUT! slams; Capri's eye blinks once in the corner (a hint, not a takeover)
 * Reduced motion: the kick clash with CUT!. Returns the layer (an `Act.done`) in the region's own coordinates.
 */
export const psychoAct = (o: { at: number; w: number; h: number; id: string; sc?: number; lite?: boolean }): { layer: string; act: Act; fight: Fight } => {
  const act = new Act({ id: o.id, ms: ACT_MS.cyberpsycho, at: o.at, W: o.w, H: o.h, K: 4 })
  const sc = o.sc ?? 1.25
  const gy = o.h - 4
  const cy = (hh: number) => r1(gy - (hh * sc) / 2)
  act.cast('dSide', D_SIDE, 0.5).cast('dPunch', D_COUNTER, 0.4).cast('dKick', D_FREEZE, 0.35).cast('pLunge', P_LUNGE, 0.5).cast('pFall', P_FALL, 0.5)
  const cam = new Camera(act)
  const f = new Fight(act, { sc, ink: C.ink, star: { core: C.white, star: C.ice, ring: C.cobalt }, spark: C.ice, dust: '#9AA6C0', lines: C.ice, smear: C.ice, impactBg: C.paperDark, impactFg: C.white, font: FONT }, cam)
  const dx0 = Math.round(o.w * 0.3)
  f.fighter('d', 'dSide', dx0, cy(D_H)).fighter('p', 'pLunge', o.w + 40 * sc, cy(P_H), -1)
  // 0.5: the lunge from off frame, a hard cut and a tap of shake.
  f.at(0.5).approach('p', dx0 + 40 * sc, 0.3, { pose: 'pLunge', ease: 'snap', lines: true, ghosts: true })
  cam.shake(0.8, 1, 0.12)
  // 0.85: the blades come down where D was; D slips back and down (whiff smear), the psycho overshoots.
  f.at(0.85).strike('p', 'd', { reach: 4 * sc, d: 0.12 })
  f.with().backdown('d', 18 * sc, 0.22, { pose: 'dSide' })
  f.at(1.2).step('p', -8, 0.25)
  // 1.45-2.0: the cut-in (drawn below); everyone holds. 2.05: the counter punch.
  f.at(2.05).strike('d', 'p', { pose: 'dPunch', reach: 22 * sc, d: 0.1 })
  f.hit('p', { flash: false, shake: 2, freeze: 0.06, sparks: true })
  f.flinch('p', { px: 6, d: 0.12 })
  // 2.3: the kick, the impact frame and the freeze-frame on torn paper (the big hit).
  f.at(2.3).pose('d', 'dKick')
  f.hit('p', { pose: 'pFall', impact: true, flash: 0.3, shake: 3, freeze: 0.28 })
  f.at(2.38).knockback('p', Math.round(o.w * 0.34), { pose: 'pFall', d: 0.45, arc: 8, land: 'skid' })
  f.at(3.1).pose('d', 'dSide')
  // He is knocked out of frame and glitches out (no body left on the floor).
  f.at(3.0).exit('p', { dir: 1, d: 0.12, fade: true })
  let body = scrim(act, 4.5, 0.94)
  // The freeze-frame: torn paper closes round the frozen kick while it holds (the kick's freeze is at 2.3).
  body += act.win(2.3, 2.3001, tornFrame(o.w, o.h, 7, `${o.id}ff`))
  // The paper rip along his flight (2.3-2.85): a torn magenta strip with a white tear edge, opening behind him.
  const ripY = r1(gy - P_H * sc * 0.5)
  const rx0 = r1(dx0 + 40 * sc)
  const rlen = r1(o.w * 0.3)
  const R = fx.rng(`${o.id}rip`)
  let top = ''
  let bot = ''
  for (let i = 0; i <= 7; i++) { top += `L${Math.round(rx0 + (rlen * i) / 7)} ${Math.round(ripY - 3 - R() * 4)}`; bot = `L${Math.round(rx0 + (rlen * i) / 7)} ${Math.round(ripY + 3 + R() * 4)}${bot}` }
  const rip = `<path d="M${rx0} ${ripY}${top}${bot}Z" fill="${C.paper}" opacity=".85"/><path d="M${rx0} ${ripY}${top}" fill="none" stroke="${C.white}" stroke-width="1.2"/>`
  body += kf(act, rip, [[0, 'opacity:0;transform:scaleX(0)'], [2.3, 'opacity:0;transform:scaleX(0)'], [2.31, 'opacity:1;transform:scaleX(.2)'], [2.6, 'opacity:1;transform:scaleX(1)'], [2.85, 'opacity:0;transform:scaleX(1)']], { origin: `${rx0}px ${ripY}px` })
  body += cam.wrap(f.body())
  // His exit: an RGB-split flicker where he glitches out.
  body += act.win(3.0, 3.06, `<path d="M${Math.round(o.w * 0.62)} ${Math.round(gy - 40)}h56v3h-56zM${Math.round(o.w * 0.64)} ${Math.round(gy - 22)}h46v2h-46z" fill="${C.hot}"/>`)
  // 0.0-0.6: the slate snaps on a sheet of torn paper; at 0.3 the sheet tears in two and the halves fly apart.
  const sw = Math.min(96, o.w * 0.3)
  const sx = r1(o.w / 2 - sw / 2)
  const sy = r1(Math.max(2, o.h / 2 - sw * 0.33))
  const sl = slateParts(sx, sy, sw, ['SC.85  TAKE 1', 'ACTION'])
  const half = (left: boolean): string => {
    const Rr = fx.rng(`${o.id}half`)
    let e = ''
    for (let y = -2; y <= o.h + 2; y += 8) e += `L${Math.round(o.w / 2 + (Rr() - 0.5) * 12)} ${y}`
    const edge = `M${left ? -4 : o.w + 4} -2${e}L${left ? -4 : o.w + 4} ${o.h + 2}Z`
    const fibres = `<path d="${Array.from({ length: 5 }, (_, i) => `M${Math.round(left ? 10 + i * o.w * 0.08 : o.w * 0.55 + i * o.w * 0.08)} ${Math.round(6 + ((i * 17) % (o.h - 12)))}h${Math.round(o.w * 0.06)}`).join('')}" stroke="${C.paperDark}" stroke-opacity=".35"/>`
    return `<path d="${edge}" fill="${C.paper}" stroke="${C.paperDark}" stroke-width="2"/>${fibres}`
  }
  body += kf(act, half(true), [[0, 'transform:none'], [0.3, 'transform:none'], [0.6, `transform:translate(-${r1(o.w * 0.6)}px,6px) rotate(-4deg)`]], { ease: 'cubic-bezier(.5,0,.9,.6)' })
  body += kf(act, half(false), [[0, 'transform:none'], [0.3, 'transform:none'], [0.6, `transform:translate(${r1(o.w * 0.6)}px,-4px) rotate(3deg)`]], { ease: 'cubic-bezier(.5,0,.9,.6)' })
  body += act.on(`${kf(act, sl.bar, [[0, 'transform:rotate(-24deg)'], [0.14, 'transform:rotate(-24deg)'], [0.2, 'transform:none'], [0.5, 'transform:none']], { origin: `${sx}px ${r1(sy + 7)}px` })}${sl.board}`, 0, 0.32)
  // 1.45-2.0: the cut-in: an extreme close-up of D's optics in a letterbox, Roman's REC frame, the reticle snaps onto his eye.
  {
    const lbY = r1(o.h * 0.1)
    const lbH = r1(o.h * 0.8)
    const csc = r1(lbH / 20)
    act.cast('dCut', ART.ER2_CUTIN_D, 0)
    const cx0 = r1(o.w * 0.44 - 37 * csc)
    const ex = r1(cx0 + 37 * csc)
    const ey = r1(lbY + 12.5 * csc)
    const bsc = csc
    const strip = act.bank.use('dCut', cx0, r1(lbY + 10 * csc), 1, csc)
    const lb = `<rect width="${o.w}" height="${o.h}" fill="#000"/><defs><clipPath id="${act.p}lb"><rect y="${lbY}" width="${o.w}" height="${lbH}"/></clipPath></defs><g clip-path="url(#${act.p}lb)"><rect y="${lbY}" width="${o.w}" height="${lbH}" fill="#0041CC"/>${strip}</g>`
    const cut = `${lb}${recFrame(8, lbY + 4, o.w - 16, lbH - 8, 'SC.85 · 00:01:12')}`
    body += act.win(1.45, 2.0, cut)
    body += kf(act, reticle(ex, ey, Math.max(6, r1(bsc * 5))), [[0, 'opacity:0;transform:scale(2.4)'], [1.55, 'opacity:0;transform:scale(2.4)'], [1.56, 'opacity:1;transform:scale(2.4)'], [1.7, 'opacity:1;transform:scale(1)'], [1.98, 'opacity:1;transform:scale(1)'], [2.0, 'opacity:0']], { origin: `${ex}px ${ey}px` })
  }
  // 3.35-4.4: CUT! slams; 3.9: her eye blinks once in the corner.
  const cutCard = `<g transform="rotate(-4 ${r1(o.w * 0.62)} ${r1(o.h / 2)})"><rect x="${r1(o.w * 0.62 - 46)}" y="${r1(o.h / 2 - 17)}" width="92" height="34" fill="${C.white}"/><rect x="${r1(o.w * 0.62 - 43)}" y="${r1(o.h / 2 - 14)}" width="86" height="28" fill="none" stroke="${C.ink}" stroke-width="1.5"/><text x="${r1(o.w * 0.62)}" y="${r1(o.h / 2 + 8)}" text-anchor="middle" font-family="${FONT}" font-size="24" font-weight="900" letter-spacing="2" fill="${C.ink}">CUT!</text></g>`
  body += act.slam(cutCard, 3.35, 4.4)
  body += act.win(3.95, 4.2, capriEye(o.w - 14, 10))
  // Reduced motion: the kick landing, and CUT!.
  const still = `<rect width="${o.w}" height="${o.h}" fill="${C.ink}" opacity=".88"/>${act.still('dKick', dx0 + 40 * sc - 22 * sc, cy(D_H), 1, sc)}${act.still('pFall', dx0 + 40 * sc + 8 * sc, cy(P_H), -1, sc)}${cutCard}`
  return { layer: act.done(body, still), act, fight: f }
}

// ---------------------------------------------------------------- FIGHT 2: CAPRI vs D for control of the HUD (CAPRI mode)
const DB = padTo(ART.CAPRI_D_BRACE, 44)
const DP = padTo(ART.CAPRI_D_PUSHED, 44)
const CR = padTo(ART.CAPRI_REACH, 44)
const CP = padTo(ART.CAPRI_PUSHED, 44)
/**
 * CAPRI vs D for the HUD in a region `w` by `h`, 3.8 s (Capri wins: in CAPRI mode the HUD is hers):
 *   0.0  the HUD splits on a diagonal: D's cobalt left, her red right, a white seam
 *   0.5  the tug of war: the seam shoves three times (overshoot), D braced left, Capri reaching right; their traces race
 *   1.5  CUT-IN: the two faces, split-screen, an RGB tear on hers (the beat before the hit)
 *   1.95 the collision: a white flash, an impact frame; the mode chip types D / CAPRI / D / CAP-
 *   2.4  she floods the HUD; D is pushed back and shatters in row slices; her line types: my HUD, choom.
 * Reduced motion: the collision with her line. Returns the layer in the region's own coordinates.
 */
export const hudAct = (o: { at: number; w: number; h: number; id: string; sc?: number }): { layer: string; act: Act; fight: Fight } => {
  const act = new Act({ id: o.id, ms: ACT_MS['capri-vs-d'], at: o.at, W: o.w, H: o.h, K: 4 })
  const sc = o.sc ?? 1.3
  const gy = o.h - 4
  const cy = r1(gy - (44 * sc) / 2)
  act.cast('dBrace', DB, 0.6).cast('dPushed', DP, 0.5).cast('cReach', CR, 0.6).cast('cPushed', CP, 0.5)
  const cam = new Camera(act)
  const f = new Fight(act, { sc, ink: '#050305', star: { core: C.white, star: C.green, ring: C.hot }, spark: C.green, dust: C.hot, lines: C.hot, smear: C.white, impactBg: '#050305', impactFg: C.hot, font: FONT }, cam)
  const mid = o.w * 0.5
  f.fighter('d', 'dBrace', r1(mid - 30 * sc), cy).fighter('c', 'cReach', r1(mid + 30 * sc), cy, -1)
  // The tug of war: three shoves of the seam, both bodies with it.
  const shoves = [[0.5, 14], [0.85, -10], [1.15, 18]] as const
  for (const [t, dx] of shoves) {
    f.at(t).step('d', dx, 0.22)
    f.with().step('c', -dx, 0.22)
  }
  f.at(1.95).hit('d', { pose: 'dBrace', impact: true, flash: 0.4, shake: 3, freeze: 0.12, x: r1(mid + 12), y: r1(cy - 6) })
  f.knockback('d', Math.round(o.w * 0.22), { pose: 'dPushed', d: 0.45, arc: 4, land: 'skid' })
  f.with().step('c', -12, 0.3)
  // 2.5: D shatters (the slices below) and is gone from her HUD.
  f.at(2.5).exit('d', { dir: -1, d: 0.06, fade: true })
  // The seam's x through the act (it follows the shoves).
  let seam = mid
  const seamKeys: [number, string][] = [[0, 'transform:translateX(0px)']]
  for (const [t, dx] of shoves) { seamKeys.push([t, `transform:translateX(${r1(seam - mid)}px)`]); seam += dx; seamKeys.push([t + 0.22, `transform:translateX(${r1(seam - mid)}px)`]) }
  seamKeys.push([1.95, `transform:translateX(${r1(seam - mid)}px)`], [2.4, `transform:translateX(${r1(-o.w * 0.6)}px)`], [ACT_MS['capri-vs-d'] / 1000, `transform:translateX(${r1(-o.w * 0.6)}px)`])
  const lean = o.h * 0.35
  const left = `<path d="M-${o.w} 0H${r1(mid + lean)}L${r1(mid - lean)} ${o.h}H-${o.w}Z" fill="${C.cobalt}" opacity=".22"/>`
  const right = `<path d="M${r1(mid + lean)} 0H${o.w * 2}V${o.h}H${r1(mid - lean)}Z" fill="${C.hot}" opacity=".2"/>`
  const seamLine = `<path d="M${r1(mid + lean)} 0L${r1(mid - lean)} ${o.h}" stroke="${C.white}" stroke-width="2"/><path d="M${r1(mid + lean + 3)} 0L${r1(mid - lean + 3)} ${o.h}" stroke="${C.green}" stroke-width="1" opacity=".8"/>`
  let body = scrim(act, 3.75, 0.92, '#050305')
  // Her light: a hot glow behind where she stands, so the dark sprite reads on the dark HUD.
  body += `<defs><radialGradient id="${act.p}cg"><stop offset="0" stop-color="${C.hot}" stop-opacity=".55"/><stop offset=".6" stop-color="${C.hot}" stop-opacity=".18"/><stop offset="1" stop-color="${C.hot}" stop-opacity="0"/></radialGradient><radialGradient id="${act.p}dg"><stop offset="0" stop-color="${C.cobalt}" stop-opacity=".45"/><stop offset="1" stop-color="${C.cobalt}" stop-opacity="0"/></radialGradient></defs>`
  body += act.on(`<ellipse cx="${r1(mid + 34 * sc)}" cy="${r1(cy)}" rx="${r1(30 * sc)}" ry="${r1(o.h * 0.55)}" fill="url(#${act.p}cg)"/>`, 0.2, 3.7, { fade: 0.3 })
  body += act.on(`<ellipse cx="${r1(mid - 30 * sc)}" cy="${r1(cy)}" rx="${r1(28 * sc)}" ry="${r1(o.h * 0.5)}" fill="url(#${act.p}dg)"/>`, 0.2, 2.5, { fade: 0.3 })
  body += act.on(wipe.clip(act, 0, 0.45, `${left}`, { dir: 'r', mode: 'in' }), 0, 3.7)
  body += kf(act, `${right}${seamLine}`, seamKeys.map(([t, v]) => [t, v]), { ease: 'cubic-bezier(.3,1.5,.5,1)' })
  // The traces racing toward each other along the top: D's cobalt from the left, her red from the right, meeting at 1.95.
  const ty = 6
  body += kf(act, `<line x1="0" y1="${ty}" x2="${r1(mid)}" y2="${ty}" stroke="${C.cobalt}" stroke-width="2"/>`, [[0, 'transform:scaleX(0)'], [0.5, 'transform:scaleX(0)'], [1.95, 'transform:scaleX(1)'], [2.3, 'transform:scaleX(1);opacity:1'], [2.6, 'transform:scaleX(1);opacity:0']], { origin: '0px 0px' })
  body += kf(act, `<path d="M${o.w} ${ty}H${r1(mid + 40)}l-6 4h-12l-4 -4H${r1(mid)}" fill="none" stroke="${C.hot}" stroke-width="2"/>`, [[0, 'transform:scaleX(0)'], [0.5, 'transform:scaleX(0)'], [1.95, 'transform:scaleX(1)'], [3.5, 'transform:scaleX(1)']], { origin: `${o.w}px 0px` })
  body += cam.wrap(f.body())
  // D shatters in row slices after the knock-back (2.55-3.0): his last pose drawn in strips that fly apart.
  const dxEnd = r1(mid - 30 * sc + 14 - 10 + 18 - Math.round(o.w * 0.22))
  let slices = ''
  for (let i = 0; i < 6; i++) {
    const y0 = r1(cy - 22 * sc + i * 7.4 * sc)
    slices += `<defs><clipPath id="${act.p}sl${i}"><rect x="0" y="${y0}" width="${o.w}" height="${r1(7.4 * sc)}"/></clipPath></defs><g transform="translate(${(i % 2 ? 1 : -1) * (2 + i)} 0)" clip-path="url(#${act.p}sl${i})">${act.bank.use('dPushed', dxEnd, cy, 1, sc)}</g>`
  }
  body += kf(act, slices, [[0, 'opacity:0;transform:none'], [2.5, 'opacity:0;transform:none'], [2.52, 'opacity:1;transform:none'], [2.9, 'opacity:0;transform:translateX(-14px)'], [3.8, 'opacity:0']])
  body += act.win(2.5, 2.56, `<rect x="${r1(dxEnd - 30)}" y="${r1(cy - 30)}" width="60" height="60" fill="#050305"/>`)
  // 1.5-1.95: the face-to-face cut-in. D's optics left, her bust right (an RGB tear on hers).
  // The two cut-in strips (Chin's art), face to face across the seam: D's optics left, her eyes right, an RGB tear on hers.
  act.cast('dCut', ART.ER2_CUTIN_D, 1).cast('cCut', ART.CAPRI_CUTIN, 0)
  const lbY = r1(o.h * 0.08)
  const lbH = r1(o.h * 0.84)
  const ksc = r1(lbH / 20)
  const sy = r1(lbY + 10 * ksc)
  const cutIn = `<rect width="${o.w}" height="${o.h}" fill="#050305"/><defs><clipPath id="${act.p}ld"><path d="M0 ${lbY}H${r1(mid + 8)}L${r1(mid - 8)} ${r1(lbY + lbH)}H0Z"/></clipPath><clipPath id="${act.p}lc"><path d="M${r1(mid + 10)} ${lbY}H${o.w}V${r1(lbY + lbH)}H${r1(mid - 6)}Z"/></clipPath></defs>`
    + `<g clip-path="url(#${act.p}ld)"><rect width="${o.w}" height="${o.h}" fill="#0041CC"/>${act.bank.use('dCut', r1(mid + 8), sy, 1, ksc)}</g>`
    + `<g clip-path="url(#${act.p}lc)"><rect width="${o.w}" height="${o.h}" fill="#000000"/><use href="#${act.bank.sil('cCut')}" fill="${C.green}" opacity=".5" transform="translate(${r1(mid - 9)} ${sy}) ${act.bank.anchor('cCut', 1, ksc)}"/>${act.bank.use('cCut', r1(mid - 6), sy, 1, ksc)}</g>`
    + `<path d="M${r1(mid + 10)} ${lbY}L${r1(mid - 6)} ${r1(lbY + lbH)}" stroke="${C.white}" stroke-width="2"/>`
    + `<text x="8" y="${r1(o.h - 2)}" font-family="${MONO}" font-size="7" fill="${C.ice}">D · HOST</text><text x="${o.w - 8}" y="${r1(o.h - 2)}" text-anchor="end" font-family="${MONO}" font-size="7" fill="${C.green}">CAPRI · CONSTRUCT</text>`
  body += act.win(1.5, 1.93, cutIn)
  body += act.win(1.68, 1.72, `<rect x="${r1(mid)}" y="${r1(o.h * 0.3)}" width="${r1(o.w * 0.4)}" height="4" fill="${C.green}"/><rect x="${r1(mid + 6)}" y="${r1(o.h * 0.55)}" width="${r1(o.w * 0.3)}" height="3" fill="${C.hot}"/>`)
  // The mode chip types and retypes at the collision: D / CAPRI / D / CAP-, then CAPRI.
  const chipX = r1(o.w * 0.5)
  const words = [['D', 1.95], ['CAPRI', 2.07], ['D', 2.19], ['CAP-', 2.29], ['CAPRI IN CONTROL', 2.4]] as const
  words.forEach(([w, t], i) => {
    const t1 = i + 1 < words.length ? (words[i + 1] as readonly [string, number])[1] : 3.55
    const wid = r1(w.length * 6.6 + 14)
    body += act.win(t, t1, `<rect x="${r1(chipX - wid / 2)}" y="2" width="${wid}" height="13" fill="#050305" stroke="${w === 'D' ? C.cobalt : C.hot}"/><text x="${chipX}" y="12" text-anchor="middle" font-family="${MONO}" font-size="9" font-weight="700" fill="${w === 'D' ? C.ice : C.green}">${esc(w)}</text>`)
  })
  // Her line, typed (a cover rect steps away), from 2.6.
  const line = 'my HUD, choom.'
  const lw = r1(line.length * 7.2 + 12)
  const lx = r1(Math.min(o.w - lw - 6, mid + 78 * sc))
  const ly = r1(o.h * 0.45)
  const cover = kf(act, `<rect x="${r1(lx + 4)}" y="${r1(ly - 11)}" width="${r1(lw - 6)}" height="15" fill="#050305"/>`, [[0, 'transform:scaleX(1)'], [2.62, 'transform:scaleX(1)'], [3.2, 'transform:scaleX(0)'], [3.9, 'transform:scaleX(0)']], { origin: `${r1(lx + lw - 2)}px 0px`, ease: 'steps(14,end)' })
  body += act.on(`<rect x="${lx}" y="${r1(ly - 12)}" width="${lw}" height="17" fill="#050305" stroke="${C.hot}"/><text x="${r1(lx + 6)}" y="${ly}" font-family="${MONO}" font-size="12" font-weight="700" fill="${C.white}">${esc(line)}</text>${cover}`, 2.6, 3.75)
  const still = `<rect width="${o.w}" height="${o.h}" fill="#050305" opacity=".9"/>${right}${seamLine}${f.still()}<text x="${lx}" y="${ly}" font-family="${MONO}" font-size="12" font-weight="700" fill="${C.white}">${esc(line)}</text>`
  return { layer: act.done(body, still), act, fight: f }
}

/** The fight for the band (W by H): placed in the title rows, left of the readouts. '' when none is due. */
export const er2FightBand = (W: number, H: number, at: number, working: boolean, sec: boolean, stage?: BandStage): string => {
  const ft = er2Fight(at, working, sec)
  if (!ft || at >= ft.startAt + ACT_MS[ft.kind]) return ''
  const r = bandRegion(W, H, stage)
  const a = ft.kind === 'cyberpsycho' ? psychoAct({ at: ft.startAt, w: r.w, h: r.h, id: `er2-psy-band-${W}-${r.w}` }) : hudAct({ at: ft.startAt, w: r.w, h: r.h, id: `er2-hud-band-${W}-${r.w}` })
  if (!stage) return placed(a.layer, r.x, r.y, r.w, r.h, `${a.act.p}rg`)
  // On the real band: clipped to the region minus the readouts inside it (stage/keep.ts), in the band's coordinates.
  const id = `${a.act.p}rg`
  return `<defs>${keepClip(id, [r.x, r.y, r.w, r.h], stage.keep)}</defs><g clip-path="url(#${id})"><g transform="translate(${r1(r.x)} ${r1(r.y)})">${a.layer}</g></g>`
}

// ---------------------------------------------------------------- the pane echoes
/**
 * The pane's echo of the fight, light (no fighters): D mode, Roman's tape in NETRUN TRACE's viewfinder (the slate, D's optics
 * cut-in, the paper flash of the kick, CUT!); CAPRI mode, the split and the typed chip across NEURAL SYNC's head. '' when none.
 */
export const er2FightPane = (card: 'log' | 'cred', W: number, H: number, at: number, working: boolean, sec: boolean): string => {
  const ft = er2Fight(at, working, sec)
  if (!ft || at >= ft.startAt + ACT_MS[ft.kind]) return ''
  // Light echoes (a few k, no fighters): the pane keeps its layout and its budget while the band plays the fight.
  if (ft.kind === 'cyberpsycho' && card === 'log' && H >= 160) {
    const vw = W < 520 ? 176 : 212
    const r = { x: 18, y: 62, w: vw - 8, h: Math.min(96, H - 100) }
    const act = new Act({ id: `er2-psy-pane-${W}`, ms: ACT_MS.cyberpsycho, at: ft.startAt, W: r.w, H: r.h, K: 4 })
    act.cast('dCut', ART.ER2_CUTIN_D, 0.5)
    const sl = slateParts(r1(r.w / 2 - 40), r1(r.h / 2 - 24), 80, ['SC.85  TAKE 1', 'ACTION'])
    const strip = `<rect width="${r.w}" height="${r.h}" fill="#000"/>${act.bank.use('dCut', r1(r.w / 2), r1(r.h / 2), 1, r1(Math.min(2.4, r.w / 80)))}`
    const cut = `<g transform="rotate(-5 ${r1(r.w / 2)} ${r1(r.h / 2)})"><rect x="${r1(r.w / 2 - 38)}" y="${r1(r.h / 2 - 15)}" width="76" height="30" fill="${C.white}"/><text x="${r1(r.w / 2)}" y="${r1(r.h / 2 + 8)}" text-anchor="middle" font-family="${FONT}" font-size="21" font-weight="900" fill="${C.ink}">CUT!</text></g>`
    let body = act.on(`<rect width="${r.w}" height="${r.h}" fill="${C.ink}" opacity=".9"/>`, 0, 4.5, { fade: 0.12 })
    body += act.on(`${sl.bar}${sl.board}`, 0, 0.5) + act.win(1.45, 2.0, strip) + fx.flash(act, 2.3, { a: 0.4, color: C.paper, d: 0.28 }) + act.slam(cut, 3.35, 4.4)
    return placed(act.done(body, cut), r.x, r.y, r.w, r.h, `${act.p}rg`)
  }
  if (ft.kind === 'capri-vs-d' && card === 'cred' && W >= 300) {
    const r = { x: 200, y: 40, w: W - 216, h: 36 }
    const act = new Act({ id: `er2-hud-pane-${W}`, ms: ACT_MS['capri-vs-d'], at: ft.startAt, W: r.w, H: r.h })
    const mid = r.w / 2
    const split = `<path d="M-${r.w} 0H${r1(mid + 10)}L${r1(mid - 10)} ${r.h}H-${r.w}Z" fill="${C.cobalt}" opacity=".35"/><path d="M${r1(mid + 10)} 0H${r.w * 2}V${r.h}H${r1(mid - 10)}Z" fill="${C.hot}" opacity=".3"/><path d="M${r1(mid + 10)} 0L${r1(mid - 10)} ${r.h}" stroke="${C.white}" stroke-width="2"/>`
    let body = act.on(`<rect width="${r.w}" height="${r.h}" fill="#050305" opacity=".9"/>`, 0, 3.75, { fade: 0.12 })
    body += kf(act, split, [[0, 'transform:translateX(0px)'], [0.5, 'transform:translateX(14px)'], [0.85, 'transform:translateX(4px)'], [1.15, 'transform:translateX(22px)'], [1.95, 'transform:translateX(22px)'], [2.4, `transform:translateX(-${r1(r.w)}px)`]], { ease: 'cubic-bezier(.3,1.5,.5,1)' })
    const words = [['D', 1.95], ['CAPRI', 2.07], ['D', 2.19], ['CAP-', 2.29], ['my HUD, choom.', 2.4]] as const
    words.forEach(([w, t], i) => { body += act.win(t, i + 1 < words.length ? (words[i + 1] as readonly [string, number])[1] : 3.7, `<text x="${r1(mid)}" y="${r1(r.h / 2 + 5)}" text-anchor="middle" font-family="${MONO}" font-size="13" font-weight="700" fill="${w === 'D' ? C.ice : C.green}">${esc(w)}</text>`) })
    body += fx.flash(act, 1.95, { a: 0.5 })
    return placed(act.done(body, `<rect width="${r.w}" height="${r.h}" fill="#050305"/><text x="${r1(mid)}" y="${r1(r.h / 2 + 5)}" text-anchor="middle" font-family="${MONO}" font-size="13" font-weight="700" fill="${C.green}">my HUD, choom.</text>`), r.x, r.y, r.w, r.h, `${act.p}rg`)
  }
  return ''
}

// ---------------------------------------------------------------- the slate on job start (D mode)
/** The clapper slate when a job starts: it drops in, snaps shut (TAKE n), and is gone in 0.9 s. Over the figure box's right. */
export const slateAct = (o: { at: number; take: number; scene: number; x: number; y: number }): string => {
  const act = new Act({ id: `er2-slate-${o.x}`, ms: ACT_MS.slate, at: o.at, W: 120, H: 70 })
  const w = 84
  const sl = slateParts(0, 0, w, [`SC.${String(o.scene).padStart(2, '0')}  TAKE ${o.take}`, 'ROLLING'])
  const body = act.mv(`${kf(act, sl.bar, [[0, 'transform:rotate(-26deg)'], [0.22, 'transform:rotate(-26deg)'], [0.3, 'transform:none'], [0.9, 'transform:none']], { origin: '0px 7px' })}${sl.board}`, [[0, 0, -16, 0], [0.12, 0, 0, 1], [0.66, 0, 0, 1], [0.88, 0, 4, 0]], { ease: 'settle' })
    + act.cue('blink', 0.3, `<rect x="-3" y="-3" width="${w + 6}" height="56" fill="none" stroke="${C.white}" stroke-width="1.5"/>`)
  return `<g transform="translate(${o.x} ${o.y})">${act.done(body, '')}</g>`
}

// ---------------------------------------------------------------- Roman's tape on NETRUN TRACE (D mode)
/**
 * The tape's motion for the trace card: sprocket holes running along the viewfinder's top and bottom while it records
 * (a stepped loop, idle-safe), a playhead scrubbing the trace's axis, a 300 ms REWIND smear pinned to the beat that just
 * landed, and CUT! on the job done. `vx, vy, vw, vh` the viewfinder; `gx, gr, axY` the trace's axis.
 */
export const tapeLayer = (o: { vx: number; vy: number; vw: number; vh: number; gx: number; gr: number; axY: number; live: boolean; working: boolean; at: number; beatAt?: number; doneAt?: number; color: string; dim: string }): string => {
  const holes = (_y: number, id: string) => `<pattern id="${id}" width="12" height="4" patternUnits="userSpaceOnUse"><rect x="2" width="6" height="4" rx="1" fill="${o.dim}"/></pattern>`
  const run = o.live && o.working
  const sp = `${o.vx}${o.vw}`
  let s = `<defs>${holes(0, `tph${sp}`)}</defs>`
  const strip = (y: number) => `<g class="${run ? 'tp-run' : ''}"><rect x="${o.vx + 10}" y="${y}" width="${o.vw - 8}" height="4" fill="url(#tph${sp})"/></g>`
  s += `<defs><clipPath id="tpc${sp}"><rect x="${o.vx + 8}" y="${o.vy}" width="${o.vw - 16}" height="${o.vh}"/></clipPath></defs><g clip-path="url(#tpc${sp})">${strip(o.vy + 18)}${strip(o.vy + o.vh - 24)}</g>`
  // The playhead: walks the axis from the first node to now in 4 s steps (a scrub), then jumps back.
  if (run) s += `<g class="tp-head"><line x1="${o.gx}" y1="${o.vy + 8}" x2="${o.gx}" y2="${o.axY}" stroke="${o.color}" stroke-opacity=".5"/><path d="M${o.gx - 4} ${o.axY}h8l-4 5z" fill="${o.color}"/></g>`
  let css = `.tp-run{animation:tprun .6s steps(3) infinite}@keyframes tprun{to{transform:translateX(-12px)}}.tp-head{animation:tphead 4s steps(24) infinite}@keyframes tphead{to{transform:translateX(${r1(o.gr - o.gx - 6)}px)}}`
  // The REWIND smear, pinned to the beat (350 ms), drawn only while it can still be playing.
  if (o.beatAt !== undefined && o.at - o.beatAt < 2000 && o.at >= o.beatAt - 60_000) {
    const act = new Act({ id: `tp-rew-${sp}`, ms: ACT_MS.rewind, at: o.beatAt, W: o.vw, H: o.vh })
    let b = ''
    for (let i = 0; i < 4; i++) b += act.mv(`<rect x="0" y="${30 + i * 26}" width="${r1(o.vw * 0.7)}" height="${2 + (i % 2)}" fill="${o.color}" opacity=".55"/>`, [[0, o.vw, 0, 0.9], [0.3, -o.vw * 0.7, 0, 0.9], [0.32, -o.vw * 0.7, 0, 0]])
    b += act.on(`<text x="${o.vw - 12}" y="16" text-anchor="end" font-family="${MONO}" font-size="8" font-weight="700" fill="${o.color}">◀◀ REW</text>`, 0, 0.42)
    s += `<g transform="translate(${o.vx} ${o.vy})">${act.done(b, '')}</g>`
  }
  if (o.doneAt !== undefined && o.at - o.doneAt < ACT_MS.cut + 500) {
    const act = new Act({ id: `tp-cut-${sp}`, ms: ACT_MS.cut, at: o.doneAt, W: o.vw, H: o.vh })
    const cx = o.vw / 2
    const cy = o.vh / 2
    const card = `<g transform="rotate(-5 ${cx} ${cy})"><rect x="${r1(cx - 44)}" y="${r1(cy - 18)}" width="88" height="36" fill="${C.white}"/><text x="${cx}" y="${r1(cy + 9)}" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="900" letter-spacing="2" fill="${C.ink}">CUT!</text></g>`
    s += `<g transform="translate(${o.vx} ${o.vy})">${act.done(act.slam(card, 0.05, 1.45), card)}</g>`
  }
  css += '@media (prefers-reduced-motion: reduce){.tp-run,.tp-head{animation:none}}'
  return `<style>${css}</style>${s}`
}

// ---------------------------------------------------------------- CAPRI: her bust turning inside the holo capsule
/**
 * The capsule turning, over the NEURAL SYNC capsule (axis mx, from top to floor, radius R): 8 glass ribs go round (front ribs
 * bright, back ribs dim, one shared stepped keyframes with phase delays: a cylinder that visibly rotates), a light band
 * sweeps across her bust in step with it (clipped to the bust's own silhouette), and a scan ring climbs. Idle-safe:
 * stepped at 6 fps, no filters. Reduced motion: the ribs stand still. ~3 k.
 */
export const capsuleTurn = (o: { id: string; mx: number; top: number; floor: number; R: number; bx: number; by: number; bs: number; period?: number; head?: boolean }): string => {
  const T = o.period ?? 6
  const N = 8
  const STEPS = 24
  const rows: string[] = []
  for (let k = 0; k <= STEPS; k++) {
    const a = (2 * Math.PI * k) / STEPS
    const x = Math.sin(a) * o.R
    const front = Math.cos(a)
    rows.push(`${r1((k / STEPS) * 100)}%{transform:translateX(${r1(x)}px);opacity:${r3(front > 0 ? 0.25 + 0.55 * front : 0.08 + 0.06 * (1 + front))}}`)
  }
  let css = `.${o.id}r{animation:${o.id}r ${T}s steps(1) infinite}@keyframes ${o.id}r{${rows.join('')}}`
  let ribs = ''
  for (let i = 0; i < N; i++) ribs += `<line class="${o.id}r" style="animation-delay:-${r3((i * T) / N)}s" x1="${o.mx}" y1="${o.top}" x2="${o.mx}" y2="${o.floor}" stroke="#FFF4F7" stroke-width="1.2"/>`
  // The light band across the bust, clipped to her silhouette, one pass per half turn (it is a cylinder: two faces lit).
  const bw = 42 * o.bs
  css += `.${o.id}l{animation:${o.id}l ${r3(T / 2)}s steps(18) infinite}@keyframes ${o.id}l{from{transform:translateX(-${r1(bw * 0.5)}px)}to{transform:translateX(${r1(bw * 1.1)}px)}}`
  css += `.${o.id}s{animation:${o.id}s ${T}s steps(30) infinite}@keyframes ${o.id}s{from{transform:translateY(0)}to{transform:translateY(-${r1(o.floor - o.top - 10)}px)}}`
  // Her head (Chin's turn, 5 views + mirror) turning with the glass, once per turn of the ribs; the light pass then lights the
  // glass in front of her (clipped to the capsule), else her static bust's own silhouette.
  let head = ''
  if (o.head) {
    const bank = new FrameBank(`${o.id}h`, 7)
    ART.CAPRI_TURN_FRAMES.forEach((sp, i) => bank.add(`v${i}`, sp, 0.5))
    const t = turntable(bank, { id: `${o.id}t`, views: ['v0', 'v1', 'v2', 'v3', 'v4'], mirror: true, x: o.mx, y: r1(o.by + 18 * o.bs), sc: o.bs, period: T, dir: 1, still: 0 })
    head = `<defs>${bank.defs()}</defs>${t.svg}`
    css += t.css
  }
  const clip = o.head ? `<rect x="${r1(o.mx - o.R)}" y="${o.top}" width="${r1(o.R * 2)}" height="${r1(o.floor - o.top)}"/>` : `<path transform="translate(${r1(o.bx)} ${r1(o.by)}) scale(${o.bs})" d="${silhouette(ER_CAPRI_BUST)}"/>`
  const light = `<defs><clipPath id="${o.id}k">${clip}</clipPath><linearGradient id="${o.id}g" x1="0" x2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset=".5" stop-color="#FFFFFF" stop-opacity=".42"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs><g clip-path="url(#${o.id}k)"><rect class="${o.id}l" x="${r1(o.bx - bw * 0.2)}" y="${r1(o.by)}" width="${r1(bw * 0.3)}" height="${r1(48 * o.bs)}" fill="url(#${o.id}g)"/></g>`
  const scan = `<g class="${o.id}s"><ellipse cx="${o.mx}" cy="${r1(o.floor - 2)}" rx="${r1(o.R * 0.9)}" ry="4" fill="none" stroke="${C.green}" stroke-opacity=".55"/></g>`
  css += `@media (prefers-reduced-motion: reduce){.${o.id}r,.${o.id}l,.${o.id}s{animation:none}.${o.id}l,.${o.id}s{opacity:0}}`
  return `<style>${css}</style>${head}${ribs}${light}${scan}`
}

// ---------------------------------------------------------------- CAPRI: the possession heartbeat on the band's border
/** Her heartbeat on the band's frame (the path `d`): lub-dub, 1.2 s at rest, faster as the context climbs (0.75 s at 95%). Low amplitude. */
export const heartbeat = (d: string, ctxPct: number): string => {
  const T = ctxPct >= 95 ? 0.75 : ctxPct >= 85 ? 0.95 : 1.2
  const css = `.c2-hb{animation:c2hb ${T}s ease-out infinite}@keyframes c2hb{0%,100%{opacity:0}8%{opacity:.55}20%{opacity:.1}30%{opacity:.4}50%{opacity:0}}@media (prefers-reduced-motion: reduce){.c2-hb{animation:none;opacity:0}}`
  return `<style>${css}</style><path class="c2-hb" d="${d}" fill="none" stroke="${C.hot}" stroke-width="2"/>`
}

// ---------------------------------------------------------------- each mode's flavour of the skin switch
/** The skin's emblem (Chin's art, 32 x 32) spun like a coin in the middle of the switch: in, one turn, out (band only, ~4 k). */
const emblemSpin = (act: Act, key: 'ER2_EMBLEM' | 'CAPRI_EMBLEM', x: number, y: number): string => {
  act.cast(key, ART[key], 0.5)
  const sc = r1(Math.min(1.6, (act.H * 0.6) / 32))
  const coin = act.bank.use(key, r1(x), r1(y), 1, sc)
  return kf(act, coin, [[0, 'opacity:0;transform:scaleX(.1)'], [0.06, 'opacity:1;transform:scaleX(1)'], [0.2, 'opacity:1;transform:scaleX(-1)'], [0.34, 'opacity:1;transform:scaleX(1)'], [0.5, 'opacity:1;transform:scaleX(1)'], [0.62, 'opacity:0;transform:scaleX(.1)']], { origin: `${r1(x)}px ${r1(y)}px` })
}
/** D: a sheet of torn magenta paper pulled off to the right, his emblem spun like a coin. */
export const D_SWITCH: SwitchFlavour = {
  dir: 'r',
  ms: 760,
  bar: false,
  shards: 0,
  veil: 0.5,
  extra: (act, surface) => {
    const h = act.H
    const sheet = `<g opacity=".72">${paperSheet(-4, act.W * 0.18, -2, h + 2, `sw${surface}`)}</g>`
    const torn = act.mv(sheet, [[0, 0, 0, 1], [0.12, 0, 0, 1], [0.68, act.W * 0.95, 0, 0.9], [0.74, act.W * 0.95, 0, 0]], { ease: 'whip' })
    return torn + (surface === 'band' ? emblemSpin(act, 'ER2_EMBLEM', act.W * 0.5, h / 2) : '')
  },
}
/** CAPRI: her glitch slices tear the old HUD off to the left in red and green, her emblem spun in the middle. */
export const CAPRI_SWITCH: SwitchFlavour = {
  dir: 'l',
  ms: 720,
  shards: 7,
  veil: 0.5,
  extra: (act, surface) => {
    let s = ''
    for (let i = 0; i < 5; i++) s += act.win(0.08 + i * 0.07, 0.12 + i * 0.07, `<rect x="${r1(act.W * (0.1 + ((i * 37) % 60) / 100))}" y="${r1((act.H * ((i * 23) % 90)) / 100)}" width="${r1(act.W * 0.25)}" height="${i % 2 ? 2 : 3}" fill="${i % 2 ? C.green : C.hot}"/>`)
    if (surface === 'band') s += emblemSpin(act, 'CAPRI_EMBLEM', act.W / 2, act.H / 2)
    return s
  },
}
