// The four classic Cyberpunk skins' own motion (wave 2, phase A), each with its own signature, built on hooks/stage:
//   Cyberpunk 2077 (runners)  Night City in depth: a 3-layer parallax skyline with stepped rain (band margin + behind the
//                             pane's crew), David's real Sandevistan time-slow when a job starts, the neon PREEM cheer.
//   Arasaka (corpo)           corporate calm, never a glitch: a red laser ID scan every 12 s with a "verified" tick, the
//                             3D tower turning with a light climbing its face, the hanko seal cheer.
//   Lucy (netrun)             the Net and the Moon: the moon turning in 3D, a fall into a wireframe grid when a job
//                             starts (a faint grid stays while it works), the moon rising and turning on the cheer.
//   SAMURAI (samurai)         a live gig: two stage lights sweeping, a 2-frame crowd on the beat, the Relic chip
//                             spinning, the "2023" set piece once a day at 20:23, the amp shockwave cheer.
// Plus the sprite idles (a blink, lit optics, a rim, a strum) as small diff overlays on the boss.
// Idle motion is stepped and filter-free; every act is pinned (`Act`), has a still frame and a replay name.
// Fan homage: names only, our own pixel art (cyberpunk-art.ts), PG-13.
import type { Sprite } from './cast'
import { CASTS, spriteDiff } from './cast'
import * as ART from './cyberpunk-art'
import type { CyberEgg } from './eggs'
import { CJK_FONT } from './eggs'
import { Director } from './stage/director'
import type { Slot } from './stage/director'
import { FrameBank, rectPaths } from './stage/frames'
import * as fx from './stage/fx'
import { parallax } from './stage/parallax'
import { playsFrom, registerPlay } from './stage/replay'
import { Act, r1, r3 } from './stage/timeline'
import { turntable, turnViews } from './stage/turntable'

/** The skin ids each flavour is worn as (what the replay registry is keyed by). */
export const SKIN_OF: Record<CyberEgg, string> = { runners: 'cyberpunk-2077', corpo: 'arasaka', netrun: 'lucy-edgerunners', samurai: 'samurai' }

// ---------------------------------------------------------------- replays: one typed act at a time, pinned to its start
export type CyberPlay = { kind: string; at: number }
let PLAY: CyberPlay | undefined
/** The act `/missioncontrol play` (or a test) started last. */
export const cyberPlay = (): CyberPlay | undefined => PLAY
export const setCyberPlay = (p: CyberPlay | undefined): void => { PLAY = p }
/** Act lengths (ms): what a replay or a trigger keeps drawn. */
export const ACT_MS = { sandevistan: 1400, dive: 1300, preem: 3600, hanko: 2800, moon: 3600, shockwave: 3200, gig: 5000 } as const
/** A replayed act of `kind` live at `at`: its start. */
export const playing = (kind: string, at: number): number | undefined => {
  const p = PLAY
  const ms = (ACT_MS as Record<string, number>)[kind] ?? 0
  return p && p.kind === kind && at >= p.at - 1000 && at < p.at + ms ? p.at : undefined
}

// ---------------------------------------------------------------- 2077: Night City parallax + rain
// The far haze keeps its towers and drops its windows (3.3 k of scattered pixels that read as dust at that depth).
const FAR: Sprite = { ...ART.CP77_SKY_FAR, rows: ART.CP77_SKY_FAR.rows.map(r => r.replace(/c/g, 'a')) }
const tile = (sp: Sprite, sc: number, K = 8): string => (sc === 1 ? rectPaths(sp, K) : `<g transform="scale(${sc})">${rectPaths(sp, K)}</g>`)

/**
 * Night City in three depths with rain, in a strip `h` tall whose top is `y` (the band's bottom margin; the foot of the
 * pane's crew view at sc 2). Far haze 1.5 px/s, the neon mid towers 4, the near roofs 9, rain falling 40 px/s; each a
 * stepped loop at 8 fps (idle-safe), still under reduced motion. ~7 k.
 */
export const city = (o: { id: string; W: number; y: number; h: number; sc?: number; rain?: number; rainH?: number }): { svg: string; css: string } => {
  const sc = o.sc ?? 1
  const far = parallax({ id: `${o.id}c`, W: o.W, H: o.h, fps: 8, layers: [
    { tile: tile(FAR, sc, 3), w: 192 * sc, h: 30 * sc, speed: 1.5 * sc, y: o.h - 30 * sc + 9 * sc, op: 0.55 },
    { tile: tile(ART.CP77_SKY_MID, sc, 6), w: 192 * sc, h: 24 * sc, speed: 4 * sc, y: o.h - 24 * sc + 4 * sc, op: 0.9 },
    { tile: tile(ART.CP77_SKY_NEAR, sc, 5), w: 192 * sc, h: 18 * sc, speed: 9 * sc, y: o.h - 18 * sc + 3 * sc },
  ] })
  const rh = o.rainH ?? o.h
  const rain = parallax({ id: `${o.id}r`, W: o.W, H: rh, fps: 8, layers: [{ tile: tile(ART.CP77_RAIN, sc, 2), w: 16 * sc, h: 16 * sc, speed: 0, dy: 40 * sc, op: o.rain ?? 0.3 }] })
  const clip = `<clipPath id="${o.id}k"><rect y="${r1(o.y + o.h - rh)}" width="${o.W}" height="${r1(rh)}"/></clipPath>`
  return {
    svg: `<defs>${clip}</defs><g clip-path="url(#${o.id}k)"><g transform="translate(0 ${r1(o.y)})">${far.svg}</g><g transform="translate(0 ${r1(o.y + o.h - rh)})">${rain.svg}</g></g>`,
    css: far.css + rain.css,
  }
}

// ---------------------------------------------------------------- Arasaka: the tower, the ID scan
const towerBank = (prefix: string): FrameBank => {
  const b = new FrameBank(prefix, 5)
  ART.ARA_TOWER_FRAMES.slice(0, 4).forEach((sp, i) => b.add(`v${i}`, sp, 0.5))
  return b
}
/**
 * The Arasaka tower turning (the Blender turnaround: a square tower repeats every 90 degrees, so 4 views make the turn),
 * one view every 2 s, base at (x, y), with a light climbing its face every 9 s (clipped to its silhouettes).
 */
export const tower = (o: { id: string; x: number; y: number; sc: number; period?: number }): { svg: string; css: string } => {
  const bank = towerBank(`${o.id}f`)
  const cy = o.y - (48 * o.sc) / 2
  const views = [0, 1, 2, 3, 0, 1, 2, 3].map(i => ({ key: `v${i}`, dir: 1 as const }))
  const t = turntable(bank, { id: `${o.id}t`, views, x: o.x, y: cy, sc: o.sc, period: o.period ?? 16, still: 0 })
  const sil = [0, 1, 2, 3].map(i => `<use href="#${bank.sil(`v${i}`)}" transform="translate(${r3(o.x)} ${r3(cy)}) ${bank.anchor(`v${i}`, 1, o.sc)}"/>`).join('')
  const h = 48 * o.sc
  const top = o.y - h
  // The light: a soft band rising from the base to the crown in 1.6 s of every 9 s, 12 fps.
  const lid = `${o.id}l`
  const css = `.${lid}{animation:${lid} 9s steps(1) infinite}@keyframes ${lid}{${Array.from({ length: 21 }, (_, i) => `${r3((i / 20) * 17.8)}%{transform:translateY(${r1(-(h * 0.92) * easeIO(i / 20))}px)}`).join('')}17.9%,100%{transform:translateY(${r1(-h)}px);opacity:0}}@media (prefers-reduced-motion: reduce){.${lid}{animation:none;opacity:0}}`
  const light = `<linearGradient id="${lid}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF4A5E" stop-opacity="0"/><stop offset=".5" stop-color="#FFD0D6" stop-opacity=".75"/><stop offset="1" stop-color="#FF4A5E" stop-opacity="0"/></linearGradient>`
  return {
    svg: `<defs>${bank.defs()}<clipPath id="${lid}c">${sil}</clipPath>${light}</defs><ellipse cx="${r1(o.x)}" cy="${r1(o.y - 1)}" rx="${r1(9 * o.sc)}" ry="${r1(1.6 * o.sc)}" fill="#000" opacity=".45"/>${t.svg}<g clip-path="url(#${lid}c)"><rect class="${lid}" x="${r1(o.x - 14 * o.sc)}" y="${r1(o.y - 4 * o.sc)}" width="${r1(28 * o.sc)}" height="${r1(7 * o.sc)}" fill="url(#${lid}g)"/></g>`,
    css: t.css + css,
  }
}
const easeIO = (u: number): number => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2)

/**
 * Arasaka's ID scan: a thin red laser line crosses the whole band left to right every 12 s (1.4 s, eased in and out,
 * sampled at 12 fps: idle-safe), drawn UNDER the readouts; when it has passed, "✓ ID VERIFIED" shows for 0.8 s in the
 * margin at `tick`. Calm and symmetrical, no noise: the corporation's motion, never a glitch.
 */
export const idScan = (o: { W: number; H: number; tick: { x: number; y: number }; font: string; period?: number }): { svg: string; css: string } => {
  const P = o.period ?? 12
  const pass = 1.4 / P
  const n = 17
  const rows = Array.from({ length: n + 1 }, (_, i) => `${r3(((i / n) * pass) * 100)}%{transform:translateX(${r1(-8 + (o.W + 16) * easeIO(i / n))}px)}`).join('')
  const css = `.arscan{animation:arscan ${P}s steps(1) infinite}@keyframes arscan{${rows}${r3(pass * 100 + 0.01)}%,100%{transform:translateX(${o.W + 8}px)}}
.arok{opacity:0;animation:arok ${P}s steps(1) infinite}@keyframes arok{0%,${r3(pass * 100)}%{opacity:0}${r3(pass * 100 + 0.1)}%,${r3((pass + 0.8 / P) * 100)}%{opacity:1}${r3((pass + 0.8 / P) * 100 + 0.1)}%,100%{opacity:0}}
@media (prefers-reduced-motion: reduce){.arscan,.arok{animation:none}.arscan{opacity:0}}`
  const beam = `<linearGradient id="arsg" x1="0" x2="1"><stop offset="0" stop-color="#E3001B" stop-opacity="0"/><stop offset="1" stop-color="#E3001B" stop-opacity=".22"/></linearGradient>`
  return {
    svg: `<defs>${beam}</defs><g class="arscan" transform="translate(-8 0)"><rect x="-26" y="0" width="26" height="${o.H}" fill="url(#arsg)"/><rect x="0" y="0" width="1.2" height="${o.H}" fill="#FF2A40" opacity=".85"/></g><text class="arok" x="${r1(o.tick.x)}" y="${r1(o.tick.y)}" text-anchor="end" font-family="${o.font}" font-size="8" font-weight="800" letter-spacing="1" fill="#FF2A40" opacity="0">✓ ID VERIFIED</text>`,
    css,
  }
}

// ---------------------------------------------------------------- Lucy: the moon
const moonBank = (prefix: string, views: number[]): FrameBank => {
  const b = new FrameBank(prefix, 3)
  views.forEach(i => b.add(`m${i}`, ART.LUCY_MOON_FRAMES[i] as Sprite, 0.5))
  return b
}
/** The moon turning in 3D (Blender views), a slow 24 s turn, centred at (x, y). Band: 4 views; pane: all 8. */
export const moon = (o: { id: string; x: number; y: number; sc: number; views?: number[]; period?: number; glow?: boolean }): { svg: string; css: string; bank: FrameBank } => {
  const views = o.views ?? [0, 2, 4, 6]
  const bank = moonBank(`${o.id}f`, views)
  const t = turntable(bank, { id: `${o.id}t`, views: views.map(i => ({ key: `m${i}`, dir: 1 as const })), x: o.x, y: o.y, sc: o.sc, period: o.period ?? 24, still: 0 })
  const r = 20 * o.sc
  const glow = o.glow === false ? '' : `<radialGradient id="${o.id}g"><stop offset=".55" stop-color="#FFD6F2" stop-opacity=".35"/><stop offset="1" stop-color="#FF5CF0" stop-opacity="0"/></radialGradient>`
  return { svg: `<defs>${bank.defs()}${glow}</defs>${glow ? `<circle cx="${r1(o.x)}" cy="${r1(o.y)}" r="${r1(r * 1.5)}" fill="url(#${o.id}g)"/>` : ''}${t.svg}`, css: t.css, bank }
}

/** The faint wireframe floor Lucy dived into: lines converging on a vanishing point, under the readouts (<= .12). */
export const netGrid = (o: { W: number; y: number; h: number; color: string; op?: number }): string => {
  const vx = o.W / 2
  const lines: string[] = []
  for (let i = -10; i <= 10; i++) lines.push(`M${r1(vx + i * 6)} ${r1(o.y)}L${r1(vx + i * (o.W / 16))} ${r1(o.y + o.h)}`)
  for (let k = 1; k <= 5; k++) { const yy = o.y + o.h * (k / 5) ** 1.8; lines.push(`M0 ${r1(yy)}H${o.W}`) }
  return `<path d="${lines.join('')}" fill="none" stroke="${o.color}" stroke-width=".8" opacity="${o.op ?? 0.1}"/>`
}

// ---------------------------------------------------------------- SAMURAI: the stage
/**
 * The live stage along the band's foot: a red and a yellow light cone sweeping +-12 degrees out of phase (2.4 s, sampled
 * at 10 fps), haze, and the crowd's two frames on the beat (120 BPM at rest, double time while a job works).
 */
export const stage = (o: { id: string; W: number; y: number; h: number; working: boolean; lamps: [number, number]; sc?: number }): { svg: string; css: string } => {
  const k = o.sc ?? 1
  const bank = new FrameBank(`${o.id}f`, 4).add('up', ART.SAM_CROWD_UP, 0).add('down', ART.SAM_CROWD_DOWN, 0).add('cy', ART.SAM_CONE_YELLOW, 0.5).add('cr', ART.SAM_CONE_RED, 0.5)
  // The crowd: one strip per frame, tiled with <use> across the width (each frame cut once).
  const crowdY = o.y + o.h - 26 * 0.85 * k + 3
  const strip = (key: string): string => { let s = ''; for (let x = 0; x < o.W; x += 136 * k) s += bank.use(key, x, crowdY + 13 * 0.85 * k, 1, 0.85 * k); return s }
  const beat = o.working ? 0.25 : 0.5
  const crowd = `<g class="${o.id}a" style="animation:${o.id}b ${beat * 2}s steps(1) infinite">${strip('up')}</g><g class="${o.id}a" style="animation:${o.id}b ${beat * 2}s steps(1) infinite -${beat}s" opacity="0">${strip('down')}</g>`
  const sweep = (cls: string, d: number): string => `.${cls}{transform-box:view-box;animation:${cls} 2.4s steps(1) infinite ${d}s}@keyframes ${cls}{${Array.from({ length: 25 }, (_, i) => `${r3((i / 24) * 100)}%{transform:rotate(${r1(12 * Math.sin((i / 24) * Math.PI * 2))}deg)}`).join('')}}`
  const cone = (key: string, x: number, cls: string): string => `<g class="${cls}" style="transform-origin:${r1(x)}px ${r1(o.y)}px" opacity=".6">${bank.use(key, x, o.y + (56 * 0.6 * k) / 2, 1, 0.6 * k)}</g>`
  const css = `@keyframes ${o.id}b{0%{opacity:1}50%,100%{opacity:0}}${sweep(`${o.id}l`, 0)}${sweep(`${o.id}r`, -1.2)}@media (prefers-reduced-motion: reduce){.${o.id}a,.${o.id}l,.${o.id}r{animation:none!important}}`
  const haze = `<radialGradient id="${o.id}h"><stop offset="0" stop-color="#E10600" stop-opacity=".22"/><stop offset="1" stop-color="#E10600" stop-opacity="0"/></radialGradient>`
  const cones = `${cone('cy', o.lamps[0], `${o.id}l`)}${cone('cr', o.lamps[1], `${o.id}r`)}`
  return {
    svg: `<defs>${bank.defs()}${haze}</defs><ellipse cx="${r1((o.lamps[0] + o.lamps[1]) / 2)}" cy="${r1(o.y + o.h)}" rx="${r1(o.W * 0.22)}" ry="${r1(o.h)}" fill="url(#${o.id}h)"/>${cones}<g opacity=".95">${crowd}</g>`,
    css,
  }
}

/** The Relic chip spinning (Blender turnaround, 8 views; a flat chip, so the far side mirrors), centred at (x, y). */
export const relic = (o: { id: string; x: number; y: number; sc: number; period?: number }): { svg: string; css: string; bank: FrameBank } => {
  const bank = new FrameBank(`${o.id}f`, 4)
  ART.SAM_RELIC_FRAMES.slice(0, 5).forEach((sp, i) => bank.add(`r${i}`, sp, 0.5))
  const t = turntable(bank, { id: `${o.id}t`, views: turnViews(['r0', 'r1', 'r2', 'r3', 'r4'], true), x: o.x, y: o.y, sc: o.sc, period: o.period ?? 3.2, still: 0 })
  return { svg: `<defs>${bank.defs()}</defs>${t.svg}`, css: t.css, bank }
}

// ---------------------------------------------------------------- the sprite idles (diff overlays on the boss)
const shut = (sp: Sprite, eyes: [number, number[]], lid: string): Sprite => ({ ...sp, rows: sp.rows.map((r, y) => (y === eyes[0] ? [...r].map((ch, x) => (eyes[1].includes(x) ? lid : ch)).join('') : r)) })
const SABURO = CASTS.corpo?.boss as Sprite
// Saburo's blink, hand-edited: the two dark eye pixels become a lid line in the shadow tone.
const SABURO_SHUT = shut(SABURO, [3, [5, 7]], 'k')
const IDLE: Record<CyberEgg, { base: Sprite; frames: [string, Sprite][] }> = {
  runners: { base: CASTS.runners?.boss as Sprite, frames: [['ibs', ART.CP77_DAVID_IDLE_SHUT], ['ibl', ART.CP77_DAVID_IDLE_LIT]] },
  netrun: { base: CASTS.netrun?.boss as Sprite, frames: [['ibs', ART.LUCY_IDLE_SHUT], ['ibr', ART.LUCY_IDLE_RIM]] },
  samurai: { base: CASTS.samurai?.boss as Sprite, frames: [['ibu', ART.SAM_JOHNNY_STRUM_UP], ['ibd', ART.SAM_JOHNNY_STRUM_DOWN]] },
  corpo: { base: SABURO, frames: [['ibs', SABURO_SHUT]] },
}
const diffs = new Map<string, string>()
const TAG: Record<CyberEgg, string> = { runners: 'ibR', netrun: 'ibN', corpo: 'ibC', samurai: 'ibS' }
/**
 * The boss's idle frames as overlays (put inside the figure's `.ch` group): David blinks and his Kiroshis light while he
 * works; Lucy blinks and her hair catches a neon rim; Johnny strums (on the beat while a job works); Saburo blinks,
 * slowly. Each is a few pixels toggled by a stepped loop in `IDLE_CSS`.
 */
export const bossIdle = (egg: CyberEgg, isWorking: boolean): string =>
  IDLE[egg].frames
    .filter(([cls]) => cls !== 'ibl' || isWorking)
    .map(([cls, sp]) => {
      const name = `${cls} ${TAG[egg]}${egg === 'samurai' && isWorking ? ' ibw' : ''}`
      return diffs.get(name) ?? diffs.set(name, spriteDiff(IDLE[egg].base, sp, name)).get(name) ?? ''
    })
    .join('')
/** The idle loops: blink 1 frame in ~5 s (each skin its own rhythm), optics and rim on a slow pulse, the strum on the beat. */
export const IDLE_CSS = `.ibs,.ibl,.ibr,.ibu,.ibd{opacity:0}
.ibs.ibR{animation:ib1 4.6s steps(1) infinite -1.3s}.ibs.ibN{animation:ib1 5.4s steps(1) infinite -2.1s}.ibs.ibC{animation:ib1 7.2s steps(1) infinite -3s}
@keyframes ib1{0%,96.9%{opacity:0}97%,100%{opacity:1}}
.ibl{animation:ib2 1.8s steps(1) infinite}@keyframes ib2{0%,40%{opacity:1}41%,100%{opacity:0}}
.ibr{animation:ib3 3.6s steps(1) infinite -.4s}@keyframes ib3{0%,34%{opacity:1}35%,100%{opacity:0}}
.ibu{animation:ib4 3s steps(1) infinite}.ibd{animation:ib4 3s steps(1) infinite -2.75s}@keyframes ib4{0%,7.9%{opacity:1}8%,100%{opacity:0}}
.ibu.ibw{animation:ib5 .5s steps(1) infinite}.ibd.ibw{animation:ib5 .5s steps(1) infinite -.25s}@keyframes ib5{0%,49%{opacity:1}50%,100%{opacity:0}}
@media (prefers-reduced-motion: reduce){.ibs,.ibl,.ibr,.ibu,.ibd{animation:none!important;opacity:0}}`

// ---------------------------------------------------------------- acts on job start
/**
 * David's Sandevistan when a job starts (1.4 s, pinned to the job's start): a one-frame chromatic split, the band's
 * ground drops into a cold green time-slow (a veil UNDER the readouts), five afterimages peel off him in the trail's
 * green-to-magenta ramp and dissolve in turn, then the snap back with a second split. `fig`: the figure's def id, drawn
 * at (fx, fy) in the layer's coordinates; `veil`: the ground's box in the same coordinates. Still: one green ghost.
 */
export const sandevistanAct = (o: { at: number; W: number; H: number; fig: string; fx: number; fy: number }): { bg: string; fg: string } => {
  const at = { ms: ACT_MS.sandevistan, at: o.at, W: o.W, H: o.H }
  const ground = new Act({ id: 'cp-sandy-bg', ...at })
  const act = new Act({ id: 'cp-sandy', ...at })
  const TINTS = ['#00FF9F', '#00E5FF', '#3D7BFF', '#B000FF', '#FF2BD6']
  const filt = (id: string, c: string): string => { const [r, g, b] = [1, 3, 5].map(i => (parseInt(c.slice(i, i + 2), 16) / 255).toFixed(2)); return `<filter id="${id}"><feColorMatrix type="matrix" values="0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 1 0"/></filter>` }
  const defs = `<defs>${TINTS.map((c, i) => filt(`cpsv${i}`, c)).join('')}${filt('cpsvR', '#FF003C')}${filt('cpsvC', '#00F0FF')}</defs>`
  const use = (dx: number, dy: number, f: string, op: number): string => `<use href="#${o.fig}" x="${r1(o.fx + dx)}" y="${r1(o.fy + dy)}" filter="url(#${f})" opacity="${op}"/>`
  // The ground: a cold green veil (time slowing down) and a hairline sweep, all under the readouts.
  const veil = ground.on(`<rect width="${o.W}" height="${o.H}" fill="#021A12"/>`, 0.05, 1.12, { fade: 0.14, op: 0.6 }) + ground.kf(`<rect width="2" height="${o.H}" fill="#00FF9F" opacity=".5"/>`, [[0, 'transform:translateX(0)'], [0.08, 'transform:translateX(0)'], [1.05, `transform:translateX(${o.W}px)`], [1.4, `transform:translateX(${o.W}px)`]], { ease: 'cubic-bezier(.1,.9,.2,1)' })
  let body = defs
  body += act.win(0, 0.08, use(-2, 0, 'cpsvR', 0.8) + use(2, 0, 'cpsvC', 0.8))
  TINTS.forEach((_, i) => { body += act.on(use(-3 * (i + 1), i % 2 ? -1 : 0, `cpsv${i}`, 0.62 - i * 0.08), 0.1 + i * 0.1, 0.7 + i * 0.09, { fade: 0.12 }) })
  body += act.win(1.08, 1.16, use(-2, 0, 'cpsvC', 0.8) + use(2, 0, 'cpsvR', 0.8))
  // The filters live once, in the moving branch (a filter is referenced even from a hidden subtree); the still uses one.
  return { bg: ground.done(veil, ''), fg: act.done(body, use(-4, 0, 'cpsv0', 0.4)) }
}

/**
 * Lucy's dive when a job starts (1.3 s, pinned): the band falls into the Net, a wireframe floor rushes up from a
 * vanishing point (scale 2.2 to 1, lines bright, eased in), then dims to the faint grid that stays while the job works.
 * Drawn under the readouts. Still: the faint grid.
 */
export const diveAct = (o: { at: number; W: number; H: number; y: number; h: number }): string => {
  const act = new Act({ id: 'lu-dive', ms: ACT_MS.dive, at: o.at, W: o.W, H: o.H })
  const grid = netGrid({ W: o.W, y: o.y, h: o.h, color: '#FF5CF0', op: 0.55 })
  const cx = o.W / 2
  let body = act.on(`<rect width="${o.W}" height="${o.H}" fill="#07030F"/>`, 0, 0.9, { fade: 0.2, op: 0.5 })
  body += act.kf(grid, [[0, `opacity:0;transform:scale(2.2)`], [0.05, 'opacity:1;transform:scale(2.2)'], [0.55, 'opacity:1;transform:scale(1)'], [1.2, 'opacity:.18;transform:scale(1)'], [1.3, 'opacity:0;transform:scale(1)']], { ease: 'cubic-bezier(.5,0,.2,1)', origin: `${r1(cx)}px ${r1(o.y)}px` })
  body += act.kf(`<path d="M0 ${r1(o.y)}H${o.W}" stroke="#5CE1FF" stroke-width="1.2"/>`, [[0, 'opacity:0'], [0.5, 'opacity:0'], [0.56, 'opacity:.9'], [1.0, 'opacity:0']])
  return act.done(body, netGrid({ W: o.W, y: o.y, h: o.h, color: '#FF5CF0', op: 0.1 }))
}

// ---------------------------------------------------------------- the cheers (each skin its own)
type CheerO = { at: number; W: number; H: number; font: string }
const scrim = (act: Act, W: number, y: number, h: number, t1: number, op = 0.82, x0 = 0, x1 = W): string => {
  const id = `${act.p}sg`
  return `<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="#050507" stop-opacity="0"/><stop offset=".22" stop-color="#050507"/><stop offset=".78" stop-color="#050507"/><stop offset="1" stop-color="#050507" stop-opacity="0"/></linearGradient></defs>${act.on(`<rect x="${r1(x0)}" y="${r1(y)}" width="${r1(x1 - x0)}" height="${r1(h)}" fill="url(#${id})"/>`, 0, t1, { fade: 0.15, op })}`
}

/** 2077: "PREEM" in neon tubes that strike one letter at a time (each flickers on like a real sign), throw their light, then buzz off. */
export const preemCheer = (o: CheerO): string => {
  const act = new Act({ id: 'cp-preem', ms: ACT_MS.preem, at: o.at, W: o.W, H: o.H })
  const cy = o.H / 2 + 6
  const word = 'PREEM'
  const size = 30
  const adv = size * 0.78
  const x0 = o.W / 2 - (adv * word.length) / 2 + adv / 2
  let body = scrim(act, o.W, cy - 26, 56, 3.5, 0.85, o.W * 0.22, o.W * 0.78)
  body += act.on(`<ellipse cx="${o.W / 2}" cy="${cy}" rx="${r1(adv * 4)}" ry="30" fill="url(#cppg)"/>`, 0.5, 3.3, { fade: 0.4 })
  body += `<defs><radialGradient id="cppg"><stop offset="0" stop-color="#FCEE0A" stop-opacity=".35"/><stop offset="1" stop-color="#FCEE0A" stop-opacity="0"/></radialGradient></defs>`
  ;[...word].forEach((ch, i) => {
    const t = 0.15 + i * 0.18
    const x = x0 + i * adv
    const glyph = `<text x="${r1(x)}" y="${r1(cy + size * 0.36)}" text-anchor="middle" font-family="${o.font}" font-size="${size}" font-weight="900" fill="none" stroke="#FCEE0A" stroke-width="2.2" stroke-linejoin="round">${ch}</text><text x="${r1(x)}" y="${r1(cy + size * 0.36)}" text-anchor="middle" font-family="${o.font}" font-size="${size}" font-weight="900" fill="#FFF8B0" fill-opacity=".9">${ch}</text>`
    body += act.kf(glyph, [[0, 'opacity:0'], [t, 'opacity:0'], [t + 0.04, 'opacity:1'], [t + 0.08, 'opacity:.15'], [t + 0.13, 'opacity:1'], [t + 0.17, 'opacity:.4'], [t + 0.2, 'opacity:1'], [3.0 + i * 0.05, 'opacity:1'], [3.05 + i * 0.05, 'opacity:.2'], [3.1 + i * 0.05, 'opacity:.9'], [3.18 + i * 0.05, 'opacity:0'], [3.6, 'opacity:0']])
  })
  body += act.on(`<text x="${o.W / 2}" y="${r1(cy + 23)}" text-anchor="middle" font-family="${o.font}" font-size="9.5" font-weight="800" letter-spacing="2.4" fill="#00F0FF">JOB DONE, CHOOM</text>`, 1.15, 3.2, { fade: 0.1 })
  const still = `<rect x="${r1(o.W * 0.3)}" y="${r1(cy - 26)}" width="${r1(o.W * 0.4)}" height="56" fill="#050507" opacity=".8"/><text x="${o.W / 2}" y="${r1(cy + size * 0.36)}" text-anchor="middle" font-family="${o.font}" font-size="${size}" font-weight="900" fill="#FFF8B0" stroke="#FCEE0A" stroke-width="1.4">PREEM</text>`
  return act.done(body, still)
}

/** Arasaka: the hanko. A red seal lifts (anticipation), slams down with a 1 px jolt, leaves an ink bleed; PROTOCOL COMPLETE. */
export const hankoCheer = (o: CheerO): string => {
  const act = new Act({ id: 'ar-hanko', ms: ACT_MS.hanko, at: o.at, W: o.W, H: o.H })
  const cx = o.W / 2 + 70
  const cy = o.H / 2 + 10
  const s = 42
  const cjk = `${o.font.replace(/,?sans-serif$/, '')},${CJK_FONT}`
  const seal = `<rect x="${r1(cx - s / 2)}" y="${r1(cy - s / 2)}" width="${s}" height="${s}" rx="5" fill="none" stroke="#E3001B" stroke-width="3.2"/><text x="${cx}" y="${r1(cy - 2)}" text-anchor="middle" font-family="${cjk}" font-size="15" font-weight="900" fill="#E3001B">任務</text><text x="${cx}" y="${r1(cy + 16)}" text-anchor="middle" font-family="${cjk}" font-size="15" font-weight="900" fill="#E3001B">完了</text>`
  let body = scrim(act, o.W, cy - 28, 56, 2.7, 0.85, o.W * 0.18, o.W * 0.82)
  body += act.kf(seal, [[0, 'opacity:0;transform:translate(0,-6px) scale(1.12)'], [0.12, 'opacity:1;transform:translate(0,-6px) scale(1.12)'], [0.45, 'opacity:1;transform:translate(0,-10px) scale(1.18)'], [0.58, 'opacity:1;transform:none'], [0.62, 'opacity:1;transform:translate(1px,1px)'], [0.66, 'opacity:1;transform:none'], [2.45, 'opacity:1;transform:none'], [2.75, 'opacity:0;transform:none']], { ease: 'cubic-bezier(.6,0,.9,.5)', origin: `${cx}px ${cy}px` })
  body += act.kf(`<rect x="${r1(cx - s / 2 - 3)}" y="${r1(cy - s / 2 - 3)}" width="${s + 6}" height="${s + 6}" rx="7" fill="#E3001B"/>`, [[0, 'opacity:0;transform:scale(.9)'], [0.58, 'opacity:0;transform:scale(.9)'], [0.6, 'opacity:.35;transform:scale(1)'], [1.2, 'opacity:.12;transform:scale(1.12)'], [2.4, 'opacity:.1;transform:scale(1.14)'], [2.75, 'opacity:0;transform:scale(1.14)']], { origin: `${cx}px ${cy}px` })
  body += act.on(`<text x="${r1(cx - s / 2 - 16)}" y="${r1(cy - 2)}" text-anchor="end" font-family="${o.font}" font-size="15" font-weight="800" letter-spacing="2.2" fill="#F2F2F2">PROTOCOL COMPLETE</text><text x="${r1(cx - s / 2 - 16)}" y="${r1(cy + 14)}" text-anchor="end" font-family="${o.font}" font-size="8.5" font-weight="700" letter-spacing="1.6" fill="#9A9EA6">FILED · ARASAKA CORPORATION</text>`, 0.62, 2.6, { fade: 0.15 })
  const still = `<rect x="${r1(o.W * 0.25)}" y="${r1(cy - 28)}" width="${r1(o.W * 0.5)}" height="56" fill="#050507" opacity=".8"/>${seal}<text x="${r1(cx - s / 2 - 16)}" y="${r1(cy + 5)}" text-anchor="end" font-family="${o.font}" font-size="15" font-weight="800" letter-spacing="2.2" fill="#F2F2F2">PROTOCOL COMPLETE</text>`
  return act.done(body, still)
}

/** Lucy: the moon rises turning in 3D, stars wink on around it, TO THE MOON. (Her cheer, kept and made real.) */
export const moonCheer = (o: CheerO): string => {
  const act = new Act({ id: 'lu-moon', ms: ACT_MS.moon, at: o.at, W: o.W, H: o.H })
  const mx = o.W - 90
  const my = o.H / 2
  const views = [0, 1, 2, 3, 4, 5, 6, 7]
  views.forEach(i => act.cast(`m${i}`, ART.LUCY_MOON_FRAMES[i] as Sprite, 0.5))
  const segs = views.map((v, k) => [r3(k * 0.42), r3(Math.min(3.6, (k + 1) * 0.42)), `m${v}`] as [number, number, string])
  let body = scrim(act, o.W, my - 34, 68, 3.5, 0.85, o.W * 0.5, o.W)
  body += act.actor('moon', segs, [[0, mx, my + 26, undefined, 0], [1.4, mx, my, undefined, 1], [3.2, mx, my - 4, undefined, 1], [3.6, mx, my - 6, undefined, 0]], { sc: 1.35 })
  const stars = [[-140, -22], [-60, 30], [40, -30], [-210, 18], [60, 26], [-100, -34]]
  stars.forEach(([dx, dy], i) => { body += act.cue('pop', 0.9 + i * 0.16, `<path d="M0 -3L.8 -.8L3 0L.8 .8L0 3L-.8 .8L-3 0L-.8 -.8Z" fill="#FFD6F2"/>`, { x: mx + (dx ?? 0), y: my + (dy ?? 0), d: 1.6 }) })
  body += act.mv(`<text x="0" y="0" text-anchor="end" font-family="${o.font}" font-size="17" font-weight="800" letter-spacing="1.8" fill="#FF5CF0">TO THE MOON ☾</text>`, [[0, mx - 50, my + 6 + 12, 0], [0.5, mx - 50, my + 6 + 12, 0], [1.5, mx - 50, my + 6, 1], [3.2, mx - 50, my + 6, 1], [3.6, mx - 50, my + 6, 0]], { ease: 'settle' })
  return act.done(body, `${act.still('m0', mx, my, 1, 1.35)}<text x="${mx - 50}" y="${my + 6}" text-anchor="end" font-family="${o.font}" font-size="17" font-weight="800" fill="#FF5CF0">TO THE MOON ☾</text>`)
}

/** SAMURAI: NEVER FADE AWAY lands on the downbeat with three amp shockwaves and the Relic overclocking beside it. */
export const shockCheer = (o: CheerO): string => {
  const act = new Act({ id: 'sm-shock', ms: ACT_MS.shockwave, at: o.at, W: o.W, H: o.H })
  const cx = o.W / 2
  const cy = o.H / 2
  ART.SAM_RELIC_FRAMES.slice(0, 5).forEach((sp, i) => act.cast(`r${i}`, sp, 0.5))
  let body = scrim(act, o.W, cy - 30, 60, 3.1, 0.85, o.W * 0.18, o.W * 0.82)
  ;[0.08, 0.32, 0.56].forEach((t, i) => { body += fx.ring(act, t, cx, cy, { rx: 70 + i * 30, color: i % 2 ? '#FFD400' : '#E10600', w: 2.2 }) })
  body += act.slam(`<text x="${cx}" y="${r1(cy + 8)}" text-anchor="middle" font-family="${o.font}" font-size="22" font-weight="900" letter-spacing="3" fill="#F4F4F4" stroke="#E10600" stroke-width=".8">NEVER FADE AWAY</text>`, 0.08, 2.9)
  const views = turnViews(['r0', 'r1', 'r2', 'r3', 'r4'], true)
  const segs: [number, number, string, (1 | -1)?][] = []
  for (let t = 0.3, i = 0; t < 2.9; t += 0.06, i++) { const v = views[i % views.length]; if (v) segs.push([r3(t), r3(Math.min(2.9, t + 0.06)), v.key, v.dir]) }
  const chipX = cx + 150
  body += act.actor('chip', segs, [[0.3, chipX, cy, undefined, 1], [2.9, chipX, cy, undefined, 1]], { sc: 0.9 })
  body += act.win(1.2, 1.26, `<rect x="${chipX - 18}" y="${cy - 2}" width="36" height="3" fill="#00F0FF"/><rect x="${chipX - 14}" y="${cy + 4}" width="30" height="2" fill="#FF003C"/>`)
  return act.done(body, `<rect x="${r1(o.W * 0.25)}" y="${r1(cy - 30)}" width="${r1(o.W * 0.5)}" height="60" fill="#050507" opacity=".8"/><text x="${cx}" y="${r1(cy + 8)}" text-anchor="middle" font-family="${o.font}" font-size="22" font-weight="900" letter-spacing="3" fill="#F4F4F4">NEVER FADE AWAY</text>`)
}

export const cheerOf = (egg: CyberEgg, o: CheerO): string => (egg === 'runners' ? preemCheer(o) : egg === 'corpo' ? hankoCheer(o) : egg === 'netrun' ? moonCheer(o) : shockCheer(o))

// ---------------------------------------------------------------- SAMURAI: the "2023" set piece
/**
 * Once a day at 20:23, while a job works (or `/missioncontrol play gig-2023`): 5 s on the band's stage strip and around
 * Johnny, never over the readouts. The ground goes dark; a spotlight finds Johnny; a corpo tower (Arasaka's geometry,
 * not its effect) looms with its windows lighting floor by floor; three chords ring out and the floors go dark; a heavy
 * silhouette in the haze; Johnny turns to Relic scanlines; NEVER FADE AWAY with the chip turning. `john`: Johnny's
 * position (the band figure's centre); `strip`: the stage strip's top and height.
 */
export const gigAct = (o: { at: number; W: number; H: number; font: string; john: { x: number; y: number }; strip: { y: number; h: number }; fig?: { x: number; y: number } }): { bg: string; fg: string } => {
  const act = new Act({ id: 'sm-gig', ms: ACT_MS.gig, at: o.at, W: o.W, H: o.H })
  const top = new Act({ id: 'sm-gig-fg', ms: ACT_MS.gig, at: o.at, W: o.W, H: o.H })
  act.cast('tw', ART.ARA_TOWER_0, 0.5).cast('sm', ART.ARA_SMASHER_STEP, 0.5)
  ART.SAM_RELIC_FRAMES.slice(0, 5).forEach((sp, i) => act.cast(`r${i}`, sp, 0.5))
  const { x: jx, y: jy } = o.john
  const tx = o.W * 0.62
  const base = o.strip.y + o.strip.h
  const tsc = (o.strip.h + 18) / 48
  const ty = base - (48 * tsc) / 2
  let body = act.on(`<rect width="${o.W}" height="${o.H}" fill="#030202"/>`, 0, 4.85, { fade: 0.4, op: 0.85 })
  body += `<defs><linearGradient id="smgs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF4C0" stop-opacity=".05"/><stop offset="1" stop-color="#FFF4C0" stop-opacity=".45"/></linearGradient></defs>`
  body += act.on(`<path d="M${r1(jx - 3)} 0L${r1(jx + 3)} 0L${r1(jx + 18)} ${r1(jy + 22)}L${r1(jx - 18)} ${r1(jy + 22)}Z" fill="url(#smgs)"/>`, 0.5, 4.0, { fade: 0.25 })
  body += act.on(act.still('tw', tx, ty, 1, tsc), 0.8, 4.6, { fade: 0.35, op: 0.9 })
  // The windows: 6 floors light red one by one, then go dark floor by floor on the chords.
  for (let f = 0; f < 6; f++) {
    const wy = base - 6 - f * ((48 * tsc - 14) / 6)
    body += act.on(`<rect x="${r1(tx - 3.5 * tsc)}" y="${r1(wy)}" width="${r1(7 * tsc)}" height="1.6" fill="#FF2A40"/>`, 1.0 + f * 0.12, 1.9 + f * 0.2)
  }
  ;[1.9, 2.3, 2.7].forEach((t, i) => { body += fx.ring(act, t, jx, jy, { rx: 30 + i * 22, color: i === 1 ? '#FFD400' : '#E10600', w: 2.6 }) })
  body += act.on(`<use href="#${act.bank.sil('sm')}" fill="#3A0C10" transform="translate(${r1(o.W * 0.8)} ${r1(base - (54 * 0.6) / 2)}) ${act.bank.anchor('sm', -1, 0.6)}"/>`, 3.0, 4.4, { fade: 0.3, op: 0.8 })
  // The engram: scanlines over Johnny, then gone (PG-13: a dissolve, never a death).
  const f = o.fig ?? o.john
  let lines = ''
  for (let k = 0; k < 9; k++) lines += `<rect x="${r1(f.x - 11)}" y="${r1(f.y - 14 + k * 3.2)}" width="22" height="1.4" fill="${k % 2 ? '#00F0FF' : '#E10600'}"/>`
  const scan = top.on(lines, 3.2, 3.9, { fade: 0.15, op: 0.85 })
  const views = turnViews(['r0', 'r1', 'r2', 'r3', 'r4'], true)
  const segs: [number, number, string, (1 | -1)?][] = []
  for (let t = 3.9, i = 0; t < 4.95; t += 0.1, i++) { const v = views[i % views.length]; if (v) segs.push([r3(t), r3(Math.min(4.95, t + 0.1)), v.key, v.dir]) }
  const ty2 = o.strip.y + o.strip.h / 2 + 4
  body += act.actor('chip', segs, [[3.9, o.W / 2 - 130, ty2], [4.95, o.W / 2 - 130, ty2]], { sc: 0.55 })
  body += act.on(`<text x="${o.W / 2}" y="${r1(ty2 + 4)}" text-anchor="middle" font-family="${o.font}" font-size="13" font-weight="900" letter-spacing="3" fill="#F4F4F4">NEVER FADE AWAY · 2023</text>`, 3.95, 4.95, { fade: 0.15 })
  return { fg: top.done(scan, ''), bg: act.done(body, `<text x="${o.W / 2}" y="${r1(ty2 + 4)}" text-anchor="middle" font-family="${o.font}" font-size="13" font-weight="900" letter-spacing="3" fill="#F4F4F4">NEVER FADE AWAY · 2023</text>`) }
}

/** SAMURAI's director: the "2023" gig once a day, at 20:23 local time (a seeded moment inside that minute), working only. */
export const samuraiDirector = (dayOffsetMs: number): Director => new Director('samurai', { dayOffsetMs })
  .lane('gig', { daily: [20 + 23 / 60, 20 + 24 / 60], when: 'working', breathMs: 20_000 })
  .add('gig', { id: 'gig-2023', ms: ACT_MS.gig, replay: 'gig-2023' })
let SAM_DIR = samuraiDirector(-new Date().getTimezoneOffset() * 60_000)
/** Tests: the director on a fixed time zone. */
export const setSamuraiOffset = (ms: number): void => { SAM_DIR = samuraiDirector(ms) }
/** The gig drawn at `at`: a replay first, else the director's daily slot (looking a minute ahead: the band redraws each minute). */
export const gigAt = (at: number, working: boolean): Slot | undefined => {
  const p = playing('gig', at)
  if (p !== undefined) return { lane: 'gig', id: 'gig-2023', startAt: p, endAt: p + ACT_MS.gig, src: 'replay' }
  return SAM_DIR.at(at, { working }, 60_000)
}

// ---------------------------------------------------------------- replay names (`/missioncontrol play <name>`)
const play = (kind: keyof typeof ACT_MS) => (at: number): void => { PLAY = { kind, at } }
registerPlay(SKIN_OF.runners, { name: 'sandevistan', what: "David's Sandevistan", run: play('sandevistan') })
registerPlay(SKIN_OF.runners, { name: 'preem', what: 'the neon PREEM cheer', run: play('preem') })
registerPlay(SKIN_OF.corpo, { name: 'hanko', what: 'the hanko seal', run: play('hanko') })
registerPlay(SKIN_OF.netrun, { name: 'dive', what: "Lucy's dive into the Net", run: play('dive') })
registerPlay(SKIN_OF.netrun, { name: 'to-the-moon', what: 'the moon rising', run: play('moon') })
registerPlay(SKIN_OF.samurai, { name: 'never-fade-away', what: 'the amp shockwave cheer', run: play('shockwave') })
playsFrom(SKIN_OF.samurai, SAM_DIR, s => { PLAY = { kind: 'gig', at: s.startAt } }, () => 'the "2023" gig at the Tower')

/** The cheer act's start at `at`: the job's own cheer, else a replayed one. */
export const cheerAt = (egg: CyberEgg, at: number, partyAt: number | undefined): number | undefined => {
  const kind = egg === 'runners' ? 'preem' : egg === 'corpo' ? 'hanko' : egg === 'netrun' ? 'moon' : 'shockwave'
  return playing(kind, at) ?? partyAt
}
/** SAMURAI's typed find: "wake up, samurai" (any case, a comma or none), never the words apart. */
export const WAKE_SAMURAI_RE = /(?<![a-z0-9])wake\s*up[\s,.!…-]*samurai(?![a-z0-9])/i
