// The Better Call Saul skins' rare scheduled eggs. One director (stage/director.ts) schedules them, so two never meet and a
// typed egg owns the band while it plays; each is a pure function of the clock, drawn only inside its window and pinned to
// the wall clock with `pin()`, so an idle redraw still shows it and resumes where it was. Pixel art and props only; no sound;
// nothing above 3 Hz; reduced motion in BCS_CSS. Band acts stay inside the band's clear span (stage/keep.ts).
//
//   car     Jimmy's beat-up yellow two-door hatchback putters across the foot of the band, about once per 10-15 min
//   gus     Gus walks onto the band (Nacho a step behind him), straightens his tie in two frames while he stands, and walks
//           out: about once per 30-45 min (the director's "rare"), never in the same breath as Mike's cameo
//   lalo    Lalo rises through the floorboards at the bottom edge of THE DOCKET or the LEGAL PAD, about once per 20-40 min
//   chicanery  the bar hearing (bettercallsaul-court.ts) by itself: at most one per 30-45 min, only while a job works, on the
//           band and the LEGAL PAD; `/missioncontrol play chicanery` replays it (and the typed word plays it)
//   unplug  Chuck "unplugs": 4+ tool calls in 10 s (or 4+ running agents) dim the band and the LEGAL PAD to lantern light for 4 s
import { BCS_CHUCK, BCS_GUS, BCS_LALO, BCS_NACHO } from './cast'
import type { Sprite } from './cast'
import { PROPS, clamp, px, r1, sid, spW, prop } from './bettercallsaul'
import { ROAM_WINDOW_MS, roamPlan, unit } from './roamer'
import { pin } from './smooth'
import { Director, MIN, fightKey } from './stage/director'
import { keepClip } from './stage/keep'
import type { BandStage } from './stage/keep'

import type { ExtraArgs } from './themes'
import { EGG_MS } from './bettercallsaul-motion'
import { fxLayer, fxLive } from './bettercallsaul-fx'
import { fightLane } from './stage/choreo'
import { CHIC_MS, chicaneryPane } from './bettercallsaul-court'
import { SWAP_MS, swapLayer } from './bettercallsaul-gene'
import type { Fx } from './bettercallsaul-fx'
export type Surface = 'band' | 'pane'

export type Slot = { on: boolean; startAt: number; endAt: number; bucket: number }
/**
 * A rare act as a function of the clock: slots twice as long as the gap, the act always in the slot's first half, so two
 * of them are never closer than `gapMin` minutes, with no memory of the last one.
 */
export const slotPlan = (seed: string, at: number, gapMin: number, chance: number, durMs: number): Slot => {
  const gap = gapMin * 60_000
  const slot = Math.floor(at / (2 * gap))
  const startAt = slot * 2 * gap + Math.floor(unit(`${seed}|b|${slot}`) * Math.max(1, gap - durMs))
  const on = unit(`${seed}|on|${slot}`) < chance
  return { on, startAt, endAt: startAt + durMs, bucket: slot }
}
const live = (p: Slot, at: number): boolean => p.on && at >= p.startAt && at < p.endAt

export const CAR_MS = 14_000
export const GUS_MS = 13_000
export const LALO_MS = 5_000
export const UNPLUG_MS = 4_000
/** After one, the next waits this long (an engine rule, not a slot). */
export const UNPLUG_GAP_MS = 120_000
export const carSeed = (gene: boolean): string => (gene ? 'bcs-gene-car' : 'bcs-car')
export const gusSeed = (gene: boolean): string => (gene ? 'bcs-gene-gus' : 'bcs-gus')
export const laloSeed = (gene: boolean): string => (gene ? 'bcs-gene-lalo' : 'bcs-lalo')
const mikeSeed = (gene: boolean): string => (gene ? 'bcs-gene-mike' : 'bcs-mike')

/** The skin's director: the bar hearing (a fight: 30-45 min, working only), Gus (rare, 30-45 min), the car (8-14 min) and Lalo
 *  (20-40 min) in priority order, each with a replay name. */
const DIRS = new Map<boolean, Director>()
export const bcsDirector = (gene: boolean): Director => {
  const had = DIRS.get(gene)
  if (had) return had
  const d = fightLane(new Director(gene ? 'bcs-gene' : 'bcs'), [{ id: 'chicanery', ms: CHIC_MS, replay: 'chicanery' }])
    .lane('gus', { gap: 'rare', chance: 0.95 }).add('gus', { id: 'gus', ms: GUS_MS, replay: 'gus' })
    .lane('car', { gap: [8, 14], chance: 0.8 }).add('car', { id: 'car', ms: CAR_MS, replay: 'car' })
    .lane('lalo', { gap: [20, 40], chance: 0.7 }).add('lalo', { id: 'lalo', ms: LALO_MS, replay: 'lalo' })
  DIRS.set(gene, d)
  return d
}
const SPAN: Record<string, number> = { fight: 46 * MIN, gus: 46 * MIN, car: 15 * MIN, lalo: 41 * MIN }
const PAGES = new Map<string, { startAt: number; endAt: number }[]>()
/** One lane's act around `at`: the one under way, else the next, else the last (`on` false when the lane has none near). */
const laneSlot = (gene: boolean, lane: 'fight' | 'gus' | 'car' | 'lalo', at: number, working = true): Slot => {
  const span = SPAN[lane] as number
  // Plans come in span-long pages (each with a span either side), cached: a redraw or a test asking every few seconds is cheap.
  // The fight lane's page also depends on the fight level, the job's start and the skin switch (fightKey), and on the job:
  // at `often` the bar hearing plays at rest too (its own 15-20 min series).
  const page = Math.floor(at / span)
  const key = `${gene ? 'g' : 's'}|${lane}|${page}${lane === 'fight' ? `|${working ? 1 : 0}|${fightKey()}` : ''}`
  let list = PAGES.get(key)
  if (!list) {
    list = bcsDirector(gene).plan((page - 1) * span, (page + 2) * span, lane === 'fight' ? { working } : {}).filter(x => x.lane === lane)
    PAGES.set(key, list)
    if (PAGES.size > 96) PAGES.delete(PAGES.keys().next().value as string)
  }
  const cur = list.find(x => x.startAt <= at && at < x.endAt) ?? list.find(x => x.startAt > at) ?? list[list.length - 1]
  return cur ? { on: true, startAt: cur.startAt, endAt: cur.endAt, bucket: Math.floor(cur.startAt / 1000) } : { on: false, startAt: 0, endAt: 0, bucket: -1 }
}
/** A replayed act as a slot from `at`. */
const replaySlot = (at: number, ms: number): Slot => ({ on: true, startAt: at, endAt: at + ms, bucket: Math.floor(at / 1000) })
export const carPlan = (at: number, gene: boolean): Slot => laneSlot(gene, 'car', at)
/** The scheduled bar hearing around `at`, while a job works or at rest (as often as the fight level says). */
export const fightPlan = (at: number, gene: boolean, working = true): Slot => laneSlot(gene, 'fight', at, working)
export const lalooPlan = (at: number, gene: boolean): Slot & { card: 'task' | 'log' } => {
  const p = laneSlot(gene, 'lalo', at)
  return { ...p, card: unit(`${laloSeed(gene)}|card|${p.bucket}`) < 0.5 ? 'task' : 'log' }
}
/** Gus never comes in the same breath as Mike's cameo: a plan whose window meets a takeover of Mike's is off. */
export const gusPlan = (at: number, gene: boolean): Slot => {
  const p = laneSlot(gene, 'gus', at)
  if (!p.on) return p
  for (let b = Math.floor((p.startAt - 3_000) / ROAM_WINDOW_MS); b <= Math.floor((p.endAt + 3_000) / ROAM_WINDOW_MS); b++) {
    if (roamPlan(mikeSeed(gene), b * ROAM_WINDOW_MS, { chance: 0, takeoverEveryMin: 30 }).kind === 'takeover') return { ...p, on: false }
  }
  return p
}

/** Chuck unplugs when 4 or more tool calls ran within 10 s, or 4 or more agents are running. */
export const shouldUnplug = (callTimes: number[], now: number, running: number): boolean => running >= 4 || callTimes.filter(t => t > now - 10_000 && t <= now).length >= 4

// --- Jimmy's car: a tiny beat-up yellow two-door hatchback, no badge. 16 by 8 pixels.
const CAR: Sprite = {
  rows: ['................', '....yyyyyyy.....', '...ywwwywwwy....', '..yywwwywwwyy...', '.yyyyyyyyyyyyy..', 'yyyyyyyyyyyyyyyd', 'dyyyyyydyyyyyyyd', '.kkk.dddddd.kkk.'],
  pal: { y: PROPS.car, w: '#33414F', d: PROPS.carDark, k: '#15161A' },
}
/** The band act's window: under the header rule, left of the readouts, minus the readouts inside (stage/keep.ts). */
const keepOf = (W: number, H: number, stage: BandStage | undefined, id: string): { defs: string; open: string } => {
  const x1 = Math.round(Math.max(140, Math.min(W - 14, stage?.x1 ?? W * 0.6)))
  return { defs: `<defs>${keepClip(id, [0, 34, x1, H - 34], stage?.keep ?? [])}</defs>`, open: `<g clip-path="url(#${id})">` }
}
export const car = (W: number, H: number, p: Slot, gene: boolean, stage?: BandStage): string => {
  const s = 1.3
  const k = keepOf(W, H, stage, sid('bcscark', W, H, p.bucket))
  return `${k.defs}${k.open}<g transform="translate(0 ${r1(H - 9.5 - 0)})" pointer-events="none"><g class="bcs-go" style="--a:-30px;--b:${W + 30}px;animation-duration:${CAR_MS / 1000}s;animation-timing-function:cubic-bezier(.35,.1,.65,.9);animation-delay:calc(${pin(p.startAt)} + 0s)"><g class="bcs-putt">${px(CAR, 0, -8 * s + 8, s, { grey: gene })}</g></g></g></g>`
}

// --- Gus: walks in (eased, a step bob), stands and straightens his tie in two frames, walks out. Nacho walks a step behind him.
// His tie is the dark column on his chest; frame two shifts it a pixel. The tie frames run only while he stands (2.45 cycles from
// 4.6 s, ending on frame one), the bob only while he walks.
const tieShifted = (rows: string[]): string[] =>
  rows.map((row, i) => {
    if (i < 10 || i > 18) return row
    const a = [...row]
    const at = a.map((ch, j) => (ch === 'd' && j >= 5 && j <= 8 ? j : -1)).filter(j => j >= 0)
    if (!at.length) return row
    at.forEach(j => { a[j] = 'c' })
    at.forEach(j => { if (j + 1 <= 9) a[j + 1] = 'd' })
    return a.join('')
  })
export const GUS = { walkIn: 4, tieFrom: 4.6, tieCycles: 2.45, walkOut: 8.6 } as const
export const gus = (W: number, H: number, p: Slot, gene: boolean, stage?: BandStage): string => {
  const s = 1.7
  const w = spW(BCS_GUS) * s
  const h = BCS_GUS.rows.length * s
  const x1 = Math.round(Math.max(140, Math.min(W - 14, stage?.x1 ?? W * 0.6)))
  const stand = Math.round(x1 * (0.35 + 0.4 * unit(`gusx|${p.bucket}`)))
  const P = pin(p.startAt)
  const tie = `animation-iteration-count:${GUS.tieCycles};animation-fill-mode:both;animation-delay:calc(${P} + ${GUS.tieFrom}s)`
  const frames = `<g class="bcs-tie1" style="${tie}">${px(BCS_GUS, -w / 2, -h, s, { grey: gene })}</g><g class="bcs-tie2" style="${tie}">${px(BCS_GUS, -w / 2, -h, s, { grey: gene, rowsOverride: tieShifted(BCS_GUS.rows) })}</g>`
  const nw = spW(BCS_NACHO) * s
  const nacho = `<g transform="translate(-30 0)"><ellipse cx="0" cy="0" rx="${r1(nw * 0.5)}" ry="2" fill="#000" opacity=".3"/>${px(BCS_NACHO, -nw / 2, -BCS_NACHO.rows.length * s, s, { grey: gene })}</g>`
  const bob = (n: number, from: number, inner: string): string => `<g class="bcs-walk" style="animation-iteration-count:${n};animation-fill-mode:both;animation-delay:calc(${P} + ${from}s)">${inner}</g>`
  const body = `${nacho}<ellipse cx="0" cy="0" rx="${r1(w * 0.55)}" ry="2" fill="#000" opacity=".35"/>${frames}`
  const k = keepOf(W, H, stage, sid('bcsgusk', W, H, p.bucket))
  return `${k.defs}${k.open}<g transform="translate(${stand} ${H - 5})" pointer-events="none"><g class="bcs-go" style="--a:${-(stand + 70)}px;--b:0px;animation-duration:${GUS.walkIn}s;animation-timing-function:cubic-bezier(.3,.55,.4,1);animation-delay:calc(${P} + 0s)"><g class="bcs-go" style="--a:0px;--b:${x1 - stand + 70}px;animation-duration:4s;animation-timing-function:cubic-bezier(.55,0,.75,.45);animation-delay:calc(${P} + ${GUS.walkOut}s)">${bob(6, 0, bob(6, GUS.walkOut, body))}</g></g></g></g>`
}

// --- Lalo rises through the floorboards at a card's bottom edge: head and shoulders, then sinks back.
export const lalo = (W: number, H: number, p: Slot, gene: boolean): string => {
  const s = 1.6
  const rows: [number, number] = [0, 22]
  const w = spW(BCS_LALO) * s
  const h = (rows[1] - rows[0]) * s
  const x = Math.round(W * (0.3 + 0.4 * unit(`lalox|${p.bucket}`)))
  const id = sid('bcslalo', W, H, x)
  const wd = prop('wood', gene)
  const wdk = prop('woodDark', gene)
  return `<defs><clipPath id="${id}"><rect x="${r1(x - w)}" y="${r1(H - 4 - h)}" width="${r1(w * 2)}" height="${r1(h)}"/></clipPath></defs><g pointer-events="none"><g clip-path="url(#${id})"><g class="bcs-up" style="--d:${LALO_MS / 1000}s;animation-delay:calc(${pin(p.startAt)} + 0s)">${px(BCS_LALO, x - w / 2, H - 4 - h, s, { grey: gene, rows })}</g></g><rect x="${r1(x - w * 0.8)}" y="${H - 4}" width="${r1(w * 1.6)}" height="4" fill="${wd}"/><path d="M${r1(x - w * 0.8)} ${H - 2}h${r1(w * 1.6)}M${r1(x - w * 0.2)} ${H - 4}v4" stroke="${wdk}"/></g>`
}

// --- Chuck unplugs: the panel dims to warm lantern light for 4 s, and Chuck peeks in under his space blanket.
export const unplug = (W: number, H: number, unplugAt: number, gene: boolean, surface: Surface): string => {
  const s = 1.6
  const rows: [number, number] = [0, 26]
  const w = spW(BCS_CHUCK) * s
  const h = (rows[1] - rows[0]) * s
  const x = Math.round(W * (surface === 'band' ? 0.42 : 0.62))
  const id = sid('bcschk', W, H, x)
  const dly = `animation-delay:calc(${pin(unplugAt)} + 0s)`
  const blanket = prop('blanket', gene)
  const top = H - h + 2
  const lamp = prop('lamp', gene)
  const bl = `<path d="M${r1(x - w * 0.62)} ${r1(top + h * 0.5)}L${r1(x - w * 0.2)} ${r1(top + h * 0.34)}L${r1(x + w * 0.2)} ${r1(top + h * 0.34)}L${r1(x + w * 0.62)} ${r1(top + h * 0.5)}L${r1(x + w * 0.7)} ${H}L${r1(x - w * 0.7)} ${H}Z" fill="${blanket}" opacity=".92"/><path d="M${r1(x - w * 0.3)} ${r1(top + h * 0.56)}l3 6l3 -5l3 7M${r1(x + w * 0.1)} ${r1(top + h * 0.58)}l3 7l3 -6l3 6" stroke="#8D949C" stroke-width="1" fill="none"/>`
  return `<g pointer-events="none"><g class="bcs-dim" style="${dly}"><rect width="${W}" height="${H}" fill="#120A03" opacity=".5"/><g opacity=".16"><rect class="bcs-lamp" width="${W}" height="${H}" fill="${lamp}"/></g></g><defs><clipPath id="${id}"><rect x="${r1(x - w)}" y="${r1(H - h - 2)}" width="${r1(w * 2)}" height="${r1(h + 2)}"/></clipPath></defs><g clip-path="url(#${id})"><g class="bcs-up" style="--d:${UNPLUG_MS / 1000}s;${dly}">${px(BCS_CHUCK, x - w / 2, top, s, { grey: gene, rows })}${bl}</g></g></g>`
}

/** The theme's extras for a panel: a typed egg's act, else the car and Gus on the band; Lalo on THE DOCKET or the LEGAL PAD;
 *  Chuck's dim on the band and the LEGAL PAD. A typed egg (or a replay) owns the band while it plays: one act at a time. */
export const bcsExtras = (gene: boolean) => (o: ExtraArgs): string => {
  // The switch word's colour move (takavic drains it, saul goodman floods it back), over the band and every card, pinned.
  const swap = o.swapAt !== undefined && o.at >= o.swapAt - 500 && o.at < o.swapAt + SWAP_MS ? swapLayer({ W: o.W, H: o.H, at: o.swapAt, toGene: gene, surface: o.surface, i: o.card ?? '' }) : ''
  if (o.party) return swap
  const out: string[] = [swap]
  const typed = o.fx && fxLive(o.fx as Fx, o.at) ? (o.fx as Fx) : undefined
  // The bar hearing by itself (the director's fight lane) when nothing is typed: while a job works, and at rest when the fight
  // level plays fights then (`often`).
  const f = !typed ? fightPlan(o.at, gene, o.working === true) : undefined
  const hearing: Fx | undefined = typed?.kind === 'chicanery' ? typed : f && live(f, o.at) ? { kind: 'chicanery', at: f.startAt } : undefined
  if (o.surface === 'band') {
    if (hearing && !typed) out.push(fxLayer(o.W, o.H, hearing, o.at, gene, o.stage))
    else if (typed && Object.hasOwn(EGG_MS, typed.kind)) out.push(fxLayer(o.W, o.H, typed, o.at, gene, o.stage))
    else if (typed?.kind === 'car') out.push(car(o.W, o.H, replaySlot(typed.at, CAR_MS), gene, o.stage))
    else if (typed?.kind === 'gus') out.push(gus(o.W, o.H, replaySlot(typed.at, GUS_MS), gene, o.stage))
    else if (!typed) {
      const c = carPlan(o.at, gene)
      if (live(c, o.at)) out.push(car(o.W, o.H, c, gene, o.stage))
      const g = gusPlan(o.at, gene)
      if (live(g, o.at)) out.push(gus(o.W, o.H, g, gene, o.stage))
    }
  } else if (hearing) {
    // The pane's half of the hearing: on the LEGAL PAD, the camera pushed in.
    if (o.card === 'log') out.push(chicaneryPane({ W: o.W, H: o.H, at: hearing.at, gene }).svg)
  } else if (typed?.kind === 'lalo') {
    const r = replaySlot(typed.at, LALO_MS)
    if (o.card === (unit(`${laloSeed(gene)}|card|${r.bucket}`) < 0.5 ? 'task' : 'log')) out.push(lalo(o.W, o.H, r, gene))
  } else {
    const l = lalooPlan(o.at, gene)
    if (live(l, o.at) && o.card === l.card) out.push(lalo(o.W, o.H, l, gene))
  }
  if (o.unplugAt !== undefined && o.at >= o.unplugAt - 1000 && o.at < o.unplugAt + UNPLUG_MS && (o.surface === 'band' || o.card === 'log')) out.push(unplug(o.W, o.H, o.unplugAt, gene, o.surface))
  void clamp
  void PROPS
  return out.join('')
}
