// The Boys (fan homage): THE FIGHTS (phase B of the motion upgrade), each written as beats with the stage engine's `choreo`
// (hit-stop, smears, impact frames, the camera) on the act's stage (`a.sg`). Never a comic: every fight is CENSORED LIVE FOOTAGE
// that Vought is trying to cover, so each one opens on a LIVE bug and a discretion slate, every contact lands under a censor
// mosaic (PG-13: nobody is ever seen hurt), the handheld camera drifts and punches in, the feed drops once (SIGNAL LOST), APPROVAL
// swings on the beats, and it ends on a PR-spin lower third. THIS MEANS NOIR's fight is a silent picture instead: intertitles in
// place of captions, an iris in and out, a bow.
//   reunion      F1 Homelander vs Soldier Boy, graded SOLID GOLD: the laser into the shield, the shield bash, the chest blast
//   offthebooks  F2 Butcher vs Homelander: the stare, the red-hot-eyes cut-in, the laser, the whiff and the dodge, the connect
//   curtainup    F3 Kimiko vs Black Noir, a silent movie for THIS MEANS NOIR
//   race         F4 A-Train vs the progress bar: START, RUN1-4, SPEED, a photo finish
// They are rare: one director slot shared with THE AMBUSH (theboys-director.ts), at most one fight per 30-45 min, working only.
// The band plays the fight inside a camera window that never reaches the working numbers (the window ends left of the bar's
// percent, the cost line and the readouts, and below the top row); the CRISIS DESK plays the monitor cut (the night tower arena in
// parallax, the other close-up).
import { keepClip } from './stage/keep'
import type { Rect } from './stage/keep'
import type { Sprite } from './cast'
import { COND, PROPS, SP, esc, r1, unit } from './theboys'
import type { Mode } from './theboys'
import { KIT, defineActs } from './theboys-acts'
import type { Act, Geo, Row } from './theboys-acts'
import { registerReplay, setActMs } from './theboys-eggs'
import { Camera } from './stage/camera'
import { Fight } from './stage/choreo'
import { rectPaths } from './stage/frames'
import * as fx from './stage/fx'
import { parallax } from './stage/parallax'
import * as MS from './theboys-motion-sprites'

const { padPose, intertitle, gaugeOf, GROUND, PH } = KIT

/** Condensed type without its font attributes: every fight layer sets them once on its root (finish). */
const C = (x: number, y: number, text: string, size: number, fill: string, extra = ''): string => `<text x="${r1(x)}" y="${r1(y)}" font-size="${size}" fill="${fill}" ${extra}>${esc(text)}</text>`

// ---------------------------------------------------------------- the camera window
/** Where a fight plays: the window (x0..x1, y0..gy), the feet line, the sprite scale, and which surface. */
export type Win = { x0: number; x1: number; y0: number; gy: number; sc: number; band: boolean; W: number; H: number; m: Mode; /** Readouts inside the window (holes in its clip). */ keep?: Rect[] }
/** The pane window's top (under the card's title row) and the right-hand column it leaves free (theboys-cards.ts deskCard). */
export const PANE_TOP = 34
export const PANE_RIGHT = 124
/** The band's window: right of the bust and the step count, left of the bar's percent and the cost line, under the top row. */
export const winOf = (g: Geo): Win => {
  if (g.on === 'band') {
    const q = gaugeOf(g.W)
    const right = g.W >= 520 ? q.r0 - 24 : g.W
    // On the real band: never past the band's clear span (the crew, the percent, TODAY), the Tasks chip a hole in the clip.
    const x1 = Math.round(Math.min(g.W * 0.6 - 6, right - 6, g.stage ? g.stage.x1 - 4 : g.W))
    return { x0: 120, x1, y0: 47, gy: GROUND, sc: 1.1, band: true, W: g.W, H: g.H, m: g.m, ...(g.stage ? { keep: g.stage.keep } : {}) }
  }
  // The CRISIS DESK (THE JOB, THE SCRIPT): under the card's title row (the title, LIVE · ON MESSAGE, the card's own line, all at
  // y 26) and left of its right-hand column (the stamps, `N of M spun`, the percent, the releases' time and cost, all within
  // PANE_RIGHT of the right edge), so the card keeps every number and chip while the monitor cut plays.
  return { x0: 8, x1: g.W - PANE_RIGHT, y0: PANE_TOP, gy: g.H - 10, sc: Math.max(1, Math.min(1.6, (g.H - PANE_TOP - 26) / 58)), band: false, W: g.W, H: g.H, m: g.m }
}
/** The window's clip (static: the camera moves inside it); `clipDef` once per layer, `clipped` for each group in it. */
const clipDef = (a: Act, w: Win): string => `<defs>${w.keep ? keepClip(`${a.sg.p}w`, [w.x0, w.y0, w.x1 - w.x0, w.gy + 1 - w.y0], w.keep) : `<clipPath id="${a.sg.p}w"><rect x="${w.x0}" y="${w.y0}" width="${w.x1 - w.x0}" height="${w.gy + 1 - w.y0}"/></clipPath>`}</defs>`
const clipped = (a: Act, inner: string): string => `<g clip-path="url(#${a.sg.p}w)">${inner}</g>`
/** A fighter's centre y (every pose is padded to PH rows, feet on the window's ground). */
const cy = (w: Win): number => r1(w.gy - (PH * w.sc) / 2)
/** Casts poses (padded, anchored at their foot pivot `ax`) on the act's stage. */
const cast = (a: Act, poses: Record<string, [Sprite, number]>): void => {
  a.sgK = 7
  for (const [k, [sp, ax]] of Object.entries(poses)) if (!a.sg.bank.has(k)) a.sg.cast(k, padPose(sp), ax)
}

// ---------------------------------------------------------------- grading (SOLID GOLD's ramp, NOIR's greys)
const GOLD_RAMP = ['#3A2508', '#5E3F0F', '#86621A', '#B08A2A', '#C9A13B', '#E2C25A', '#F4DC86', '#FFF3C4']
const GREY_RAMP = ['#101010', '#262626', '#3D3D3D', '#575757', '#767676', '#999999', '#C2C2C2', '#EDEDED']
const lum = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16)
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}
/** A sprite recoloured by luminance onto a ramp (the cut-ins and the arena, graded in code). */
const graded = (sp: Sprite, ramp: string[]): Sprite => ({ ...sp, pal: Object.fromEntries(Object.entries(sp.pal).map(([k, c]) => [k, ramp[Math.min(ramp.length - 1, Math.floor(lum(c) * ramp.length))] as string])) })
const GRADED = new Map<string, Sprite>()
const gradeOf = (key: string, sp: Sprite, m: Mode): Sprite => {
  if (m !== 'gold' && m !== 'noir') return sp
  const k = `${key}|${m}`
  let g = GRADED.get(k)
  if (!g) { g = graded(sp, m === 'gold' ? GOLD_RAMP : GREY_RAMP); GRADED.set(k, g) }
  return g
}

// ---------------------------------------------------------------- the broadcast kit (the Boys' own look)
const INK = '#0A0B0D'
const RED = '#C8202C'
/** The LIVE bug, top right of the window, for the whole act (the dot blinks). OFF BOOK records on THE WIRE. */
const bug = (a: Act, w: Win, t1: number): string => {
  const book = w.m === 'book'
  const noir = w.m === 'noir'
  const label = book ? 'THE WIRE' : w.m === 'gold' ? 'VNN 1983' : 'VNN'
  const x = w.x1 - 70
  const y = w.y0 + 3
  a.sg.extraCss.add('.tbfd{animation:tbfd 1s steps(2) infinite}@keyframes tbfd{50%{opacity:0}}@media (prefers-reduced-motion: reduce){.tbfd{animation:none}}')
  const dot = `<circle class="tbfd" cx="${x + 6}" cy="${y + 6}" r="2" fill="#FFFFFF"/>`
  return a.sg.on(`<rect x="${x}" y="${y}" width="66" height="12" rx="2" fill="${INK}" opacity=".88"/><rect x="${x + 1}" y="${y + 1}" width="27" height="10" rx="1.5" fill="${noir ? '#575757' : RED}"/>${dot}${C(x + 18, y + 9, book ? 'REC' : 'LIVE', 6.5, '#FFFFFF', 'text-anchor="middle" letter-spacing=".5"')}${C(x + 47, y + 9, label, 6.5, noir ? '#EDEDED' : '#F0D27A', 'text-anchor="middle" letter-spacing=".5"')}`, 0.05, t1)
}
/** The opening slate over the window: VIEWER DISCRETION ADVISED (OFF BOOK: a tape label, SOLID GOLD: a 1983 card). */
const slate = (a: Act, w: Win, t1: number): string => {
  const cx = (w.x0 + w.x1) / 2
  const my = (w.y0 + w.gy) / 2
  const book = w.m === 'book'
  const gold = w.m === 'gold'
  const card = book
    ? `<rect x="${w.x0}" y="${w.y0}" width="${w.x1 - w.x0}" height="${w.gy - w.y0}" fill="#16181B"/><g transform="rotate(-2 ${r1(cx)} ${r1(my)})"><rect x="${r1(cx - 92)}" y="${r1(my - 13)}" width="184" height="24" fill="${PROPS.tape}"/>${C(cx, my + 4, 'THE WIRE · UNEDITED', 11, PROPS.paperInk as string, 'text-anchor="middle" letter-spacing="1.4"')}</g>`
    : `<rect x="${w.x0}" y="${w.y0}" width="${w.x1 - w.x0}" height="${w.gy - w.y0}" fill="${gold ? '#1E1406' : INK}"/><rect x="${r1(cx - 110)}" y="${r1(my - 15)}" width="220" height="1" fill="${gold ? '#C9A13B' : '#F0D27A'}"/>${C(cx, my + 2, 'VIEWER DISCRETION ADVISED', 12, gold ? '#F4DC86' : '#F0D27A', 'text-anchor="middle" letter-spacing="1.6"')}${w.band ? '' : C(cx, my + 14, gold ? 'RECORDED LIVE · 1983' : 'THE FOLLOWING FOOTAGE HAS NOT BEEN APPROVED', 6.5, '#ECE6DA', 'text-anchor="middle" letter-spacing="1"')}`
  return a.sg.on(card, 0, t1)
}
/** The censor mosaic on a contact: coarse cells in the fighters' colours and a CENSORED bar, for .6 s (PG-13: no hit is seen). */
const MOSAIC: Record<Mode, string[]> = {
  brand: ['#22305E', '#C81E28', '#F4B88F', '#EBB34E', '#3A2A20', '#F4F1E8'],
  book: ['#22305E', '#C81E28', '#F4B88F', '#3A2A20', '#5A5048', '#ECE6DA'],
  gold: ['#5E3F0F', '#86621A', '#C9A13B', '#E2C25A', '#F4DC86', '#3A2508'],
  noir: ['#262626', '#575757', '#767676', '#999999', '#C2C2C2', '#101010'],
}
const mosaicSvg = (x: number, y: number, w: Win, seed: string, big = true): string => {
  const c = Math.round((big ? 4 : 3) * w.sc)
  const nx = big ? 6 : 4
  const ny = big ? 4 : 3
  const x0 = r1(x - (nx * c) / 2)
  const y0 = r1(y - (ny * c) / 2)
  const cols = MOSAIC[w.m]
  const cells = new Map<string, [number, number][]>()
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const col = cols[Math.floor(unit(`${seed}|${i}|${j}`) * cols.length)] as string
    cells.set(col, [...(cells.get(col) ?? []), [i, j]])
  }
  // One path a colour, the same squares as before in fewer chars: a run of one colour along a row is one rectangle, and each
  // rectangle after the first starts with a relative move from the last one's corner (a closed subpath leaves the pen there).
  const paths = new Map<string, string>()
  for (const [col, l] of cells) {
    l.sort((p, q) => p[1] - q[1] || p[0] - q[0])
    let d = ''
    let px: number | undefined
    let py = 0
    for (let k = 0; k < l.length;) {
      const [i, j] = l[k] as [number, number]
      let n = 1
      while (k + n < l.length && (l[k + n] as [number, number])[1] === j && (l[k + n] as [number, number])[0] === i + n) n++
      d += `${px === undefined ? `M${r1(x0 + i * c)} ${r1(y0 + j * c)}` : `m${(i - px) * c} ${(j - py) * c}`}h${n * c}v${c}h-${n * c}z`
      px = i
      py = j
      k += n
    }
    paths.set(col, d)
  }
  const bw = Math.max(nx * c + 8, 46)
  const by = r1(y0 + ny * c - 3)
  const noir = w.m === 'noir'
  return `${[...paths].map(([col, d]) => `<path d="${d}" fill="${col}"/>`).join('')}<rect x="${r1(x - bw / 2)}" y="${by}" width="${bw}" height="9" fill="${noir ? '#0B0C0E' : '#050505'}"${noir ? ' stroke="#F4F1E8" stroke-width=".6"' : ''}/>${C(x, by + 7, noir ? '(censored)' : 'CENSORED', 6.5, '#FFFFFF', `text-anchor="middle" letter-spacing="1"${noir ? ' font-style="italic"' : ''}`)}`
}
const mosaic = (a: Act, w: Win, t: number, x: number, y: number, seed: string, d = 0.6, big = true): string => a.sg.win(t, t + d, mosaicSvg(x, y, w, seed, big))
/** SIGNAL LOST: colour bars over the window for `d` s, the first frame torn sideways. Outside the camera (the feed itself drops). */
const BARS = ['#C0C0C0', '#C0C000', '#00C0C0', '#00C000', '#C000C0', '#C00000', '#0000C0']
const signalLost = (a: Act, w: Win, t: number, d = 0.55): string => {
  const ww = w.x1 - w.x0
  const h = w.gy - w.y0
  const bw = ww / 7
  const bars = (dx: number) => BARS.map((c, i) => `<rect x="${r1(w.x0 + dx + i * bw)}" y="${w.y0}" width="${r1(bw + 0.5)}" height="${r1(h * 0.72)}" fill="${w.m === 'noir' ? GREY_RAMP[7 - i] : c}"/>`).join('') + `<rect x="${w.x0}" y="${r1(w.y0 + h * 0.72)}" width="${ww}" height="${r1(h * 0.28 + 1)}" fill="#101014"/>`
  const label = `<rect x="${r1(w.x0 + ww / 2 - 62)}" y="${r1(w.y0 + h * 0.36 - 9)}" width="124" height="16" fill="${INK}"/>${C(w.x0 + ww / 2, w.y0 + h * 0.36 + 3, 'SIGNAL LOST', 10, '#FFFFFF', 'text-anchor="middle" letter-spacing="2"')}${C(w.x0 + ww / 2, w.y0 + h * 0.86 + 3, w.m === 'book' ? 'THE WIRE · REROUTING' : 'VNN · PLEASE STAND BY', 6.5, '#ECE6DA', 'text-anchor="middle" letter-spacing="1"')}`
  const cls = `${a.sg.p}tr`
  a.sg.extraCss.add(`.${cls}{animation:${cls} .1s steps(2) both;animation-delay:calc(var(--s) + ${r1(a.sg.warp(t))}s)}@keyframes ${cls}{from{transform:translateX(12px)}to{transform:none}}`)
  return a.sg.win(t, t + d, `<g class="${cls}">${bars(0)}</g>${label}`)
}
/** The PR-spin lower third: it wipes in from the left and stays to the end. */
const lowerThird = (a: Act, w: Win, t: number, line: string, sub: string, tag: string): string => {
  const ww = Math.min(240, w.x1 - w.x0 - 12)
  const x = w.x0 + 6
  const y = w.gy - 30
  const gold = w.m === 'gold'
  const noir = w.m === 'noir'
  const body = `<rect x="0" y="0" width="${ww}" height="22" fill="${gold ? '#2A1C08' : noir ? '#161616' : '#0A1430'}" opacity=".94"/><rect x="0" y="0" width="${ww}" height="1.5" fill="${gold ? '#E2C25A' : noir ? '#C2C2C2' : '#F0D27A'}"/><rect x="0" y="0" width="38" height="22" fill="${noir ? '#575757' : RED}"/>${C(19, 14, tag, 7, '#FFFFFF', 'text-anchor="middle" letter-spacing=".6"')}${C(44, 11, line, 9, '#FFFFFF', 'letter-spacing=".8"')}${C(44, 19, sub, 5.8, gold ? '#F4DC86' : noir ? '#C2C2C2' : '#9FC3E8', 'letter-spacing=".8"')}`
  const end = a.sg.T - 0.05
  return a.sg.mv(`<g>${body}</g>`, [[0, x - ww - 20, y, 0], [t, x - ww - 20, y, 0], [t + 0.01, x - ww - 20, y, 1], [t + 0.3, x, y, 1], [end, x, y, 1]], { ease: 'settle' })
}
/** An APPROVAL swing, popped under the LIVE bug: red down, green up. */
const swing = (a: Act, w: Win, t: number, delta: number): string => {
  const up = delta > 0
  const x = w.x1 - 70
  const y = w.y0 + 18
  return a.sg.cue('pop', t, `<rect x="0" y="0" width="66" height="11" rx="2" fill="${INK}" opacity=".85"/>${C(33, 8.2, `APPROVAL ${up ? '+' : '−'}${Math.abs(delta)}`, 6.5, w.m === 'noir' ? (up ? '#EDEDED' : '#999999') : up ? '#3DDC84' : '#FF5A5A', 'text-anchor="middle" letter-spacing=".5"')}`, { x, y, d: 1.1 })
}
/** A close-up CUT-IN: a letterbox strip (80 by 20, scaled) slams in from the side under the hit-stop, `d` real seconds. */
const cutin = (a: Act, w: Win, t: number, key: string, sp: Sprite, d: number, from: 1 | -1 = 1): string => {
  if (!a.sg.bank.has(key)) a.sg.cast(key, gradeOf(key, sp, w.m))
  const ww = w.x1 - w.x0
  const s = r1(Math.min(w.band ? 2 : 3, (ww * 0.8) / 80, ((w.gy - w.y0) * 0.62) / 20))
  const cx = r1((w.x0 + w.x1) / 2)
  const y = r1(w.y0 + (w.gy - w.y0) * 0.42)
  const hh = 10 * s
  const strip = `<rect x="${r1(w.x0 - cx)}" y="${r1(y - hh - 6)}" width="${ww}" height="${r1(hh * 2 + 12)}" fill="${INK}"/>${a.sg.bank.use(key, 0, y, 1, s)}<rect x="${r1(-40 * s)}" y="${r1(y - hh)}" width="${r1(80 * s)}" height="${r1(hh * 2)}" fill="none" stroke="#FFFFFF" stroke-width="1"/>`
  // The strip slides 30 px into place in its first 80 ms (the slam), pinned to the cue's real time (it rides the hit-stop).
  const cls = `${a.sg.p}c${from > 0 ? 'r' : 'l'}`
  a.sg.extraCss.add(`.${cls}{animation:${cls} .08s ease-out both;animation-delay:calc(var(--s) + var(--t))}@keyframes ${cls}{from{transform:translateX(${30 * from}px)}to{transform:none}}`)
  return a.sg.cue('show', t, `<g transform="translate(${cx} 0)"><g class="${cls}">${strip}</g></g>`, { d })
}
/** A handheld news camera: slow drifts of a pixel or two (call in time order with the fight's own camera beats). */
const drift = (cam: Camera, t0: number, t1: number, seed: string): void => {
  const n = Math.max(1, Math.round((t1 - t0) / 2.2))
  for (let i = 0; i < n; i++) cam.pan(t0 + ((t1 - t0) * i) / n, t0 + ((t1 - t0) * (i + 1)) / n, r1((unit(`${seed}${i}x`) - 0.5) * 3), r1((unit(`${seed}${i}y`) - 0.5) * 2), 'settle')
}
/** The night tower arena behind a pane fight: far tower, mid roofs, near rail, drifting at three speeds (graded per look). */
const arena = (a: Act, w: Win, layers: ('far' | 'mid' | 'near')[]): string => {
  const L = { far: [MS.TB_ARENA_FAR, 1.4, 2, 0.9, 10], mid: [MS.TB_ARENA_MID, 1.35, 5, 1, 4], near: [MS.TB_ARENA_NEAR, 1.39, 9, 1, -1] } as const
  const s = w.band ? 1 : r1(Math.max(1, ((w.gy - w.y0) * 0.5) / 36))
  const p = parallax({
    id: `${a.sg.p}ar`, W: w.W, H: w.H, fps: 6,
    layers: layers.map(k => {
      const [sp, ys, speed, op, lift] = L[k]
      const sp2 = gradeOf(`arena-${k}`, sp as Sprite, w.m)
      const h = (sp as Sprite).rows.length * (ys as number) * s
      return { tile: `<g transform="scale(${r1(s)} ${r1((ys as number) * s)})">${rectPaths(sp2, 4)}</g>`, w: r1(160 * s), speed: speed as number, op: op as number, y: r1(w.gy - h - (lift as number) * s) }
    }),
  })
  a.sg.extraCss.add(p.css)
  return p.svg
}
/** The finished layer: the window (clipped) holds the camera, which holds the fight; the feed's own overlays sit on top. */
const finish = (a: Act, w: Win, cam: Camera, back: string, fight: string, over: string, still: string): string =>
  `<g font-family="${COND}" font-weight="800">${clipDef(a, w)}${a.fx(clipped(a, cam.wrap(back + fight) + over))}<g class="${a.sg.p}-s">${clipped(a, still)}</g></g>`

// ---------------------------------------------------------------- the CRISIS DESK's cut (camera 2)
type Cut = { freezes: [number, number][]; cuts: [number, string, Sprite, number][]; hits: number[]; lost: number; spin: [number, string, string, string]; arena: ('far' | 'mid' | 'near')[]; where: string }
/**
 * The pane's cut of a fight: camera 2 on the roof. The night tower arena drifts (the wide shot), the close-ups cut in on the
 * band's beats (the same hit-stops, so the two panels stay in step), the mosaic lands on each hit with a punch-in, the feed drops
 * with the band's, and the spin goes up as a lower third.
 */
const monitor = (a: Act, g: Geo, o: Cut): string => {
  const w = winOf(g)
  for (const [t, d] of o.freezes) a.sg.freeze(t, d)
  const cam = new Camera(a.sg)
  const cx = r1((w.x0 + w.x1) / 2)
  const my = r1(w.gy - (w.gy - w.y0) * 0.3)
  let over = bug(a, w, a.sg.T - 0.1) + a.sg.on(C(w.x0 + 6, w.gy - 6, o.where, 7, '#ECE6DA', 'letter-spacing="1"'), 0.9, o.spin[0])
  drift(cam, 0, o.hits[0] ?? 3, 'mon')
  for (const [t, key, sp, d] of o.cuts) over += cutin(a, w, t, key, sp, d, key === 'ciB' || key === 'ciS' ? -1 : 1)
  o.hits.forEach((t, i) => {
    over += mosaic(a, w, t, cx + (i % 2 ? 18 : -10) * w.sc, my - 6 * w.sc, `mon${i}`, 0.6, i === 0)
    cam.shake(t, i ? 2 : 3, 0.2)
    if (i === 0) cam.push(t, t + 0.06, 1.1, cx, my, 'snap').reset(t + 0.4, t + 0.6, 'settle')
  })
  over += signalLost(a, w, o.lost)
  drift(cam, o.lost + 0.6, a.sg.T - 0.5, 'monb')
  over += lowerThird(a, w, o.spin[0], o.spin[1], o.spin[2], o.spin[3])
  const sky = `<rect x="${w.x0}" y="${w.y0}" width="${w.x1 - w.x0}" height="${w.gy - w.y0}" fill="${w.m === 'gold' ? '#1E1406' : w.m === 'noir' ? '#101010' : '#0B1430'}"/>`
  const back = sky + (o.arena.length ? arena(a, w, o.arena) : '')
  over = slate(a, w, 0.9) + over
  return finish(a, w, cam, back, '', over, mosaicSvg(cx, my, w, 'mon0') + C(w.x0 + 6, w.gy - 6, o.spin[1], 8, '#FFFFFF', 'letter-spacing="1"'))
}

// ---------------------------------------------------------------- F2 · OFF THE BOOKS (Butcher vs Homelander)
export const F2_MS = 11_500
const offthebooks = (a: Act, g: Geo): string => {
  const w = winOf(g)
  cast(a, {
    bW: [SP.TB_BUTCHER_WALK, 0.5], bD: [MS.TB_BUTCHER_DUCK, 0.56], bC: [MS.TB_BUTCHER_CONNECT, 0.29],
    hH: [SP.TB_HOMELANDER_HOVER, 0.5], hL: [SP.TB_HOMELANDER_LASER, 0.42],
  })
  const sc = w.sc
  const ww = w.x1 - w.x0
  const y = cy(w)
  const bx = r1(w.x0 + ww * 0.3)
  const hx = r1(w.x0 + ww * 0.66)
  const cam = new Camera(a.sg)
  const f = new Fight(a.sg, { sc, ink: INK, dust: '#9AA0A8', lines: '#FFFFFF', smear: '#FFFFFF', impactBg: INK, impactFg: '#F4F1E8', ghosts: !w.band }, cam)
  f.fighter('b', 'bW', w.x0 - 24 * sc, y, 1).fighter('h', 'hH', hx, w.y0 - 40 * sc, -1)
  let over = slate(a, w, 0.9) + bug(a, w, a.sg.T - 0.1)
  let fight = ''
  drift(cam, 0, 1.9, 'f2a')
  // 0.7-1.9: Butcher walks in (a real cycle); Homelander drops in at 1.0 and lands with a squash of dust.
  const step = (bx - (w.x0 - 24 * sc)) / 3
  f.at(0.7)
  for (let i = 0; i < 3; i++) f.step('b', step, 0.4)
  f.at(1.0).approach('h', hx, 0.28, { y, ease: 'snap', lines: false, ghosts: true })
  cam.shake(1.28, 2, 0.2)
  // 1.9-2.7: the stare. The camera creeps in on them.
  f.at(1.9).stare('b', 'h', 0.8, { push: 0.07 })
  // 3.05: the wind-up is the red-hot-eyes cut-in, under a hit-stop.
  f.at(3.05).freeze(0.45)
  over += cutin(a, w, 3.05, 'ciH', MS.TB_CUTIN_HOMELANDER_LASER, 0.42)
  // 3.05-3.85: the LASER sweeps low; Butcher ducks under it, a scorch line burns along the ground behind him.
  f.at(3.05).pose('h', 'hL')
  f.at(3.12).pose('b', 'bD')
  const ex = r1(hx - 4 * sc)
  const ey = r1(y - 15 * sc)
  const beam = (tx: number, ty: number) => `<path d="M${ex} ${ey}L${r1(tx)} ${r1(ty)}" stroke="#FF8A7A" stroke-width="${r1(3.2 * sc)}" opacity=".35"/><path d="M${ex} ${ey}L${r1(tx)} ${r1(ty)}M${r1(ex)} ${r1(ey + 1.6)}L${r1(tx)} ${r1(ty + 2)}" stroke="#FF2A2A" stroke-width="1.3"/><circle cx="${r1(tx)}" cy="${r1(ty)}" r="${r1(2.2 * sc)}" fill="#FFE2D8"/>`
  const aims: [number, number, number][] = [[3.05, bx + 4 * sc, y - 8 * sc], [3.4, bx - 22 * sc, w.gy - 3]]
  for (const [t, tx, ty] of aims) fight += a.sg.win(t, t + 0.4, beam(tx, ty))
  fight += a.sg.kf(`<rect x="${r1(w.x0 + 4)}" y="${r1(w.gy - 2)}" width="${r1(bx - 10 * sc - w.x0)}" height="2" rx="1"/>`, [[0, 'opacity:0;fill:#FF2A2A;transform:scaleX(0)'], [3.5, 'opacity:0;fill:#FF2A2A;transform:scaleX(0)'], [3.52, 'opacity:1;fill:#FF2A2A;transform:scaleX(.1)'], [3.85, 'opacity:1;fill:#FF8A3A;transform:none'], [5.2, 'opacity:.8;fill:#6B6B6B;transform:none'], [6.2, 'opacity:0;fill:#6B6B6B;transform:none']], { origin: `${r1(bx - 10 * sc)}px 0` })
  // 3.9-4.3: Butcher springs up swinging; Homelander isn't there (a smear back), the crowbar whiffs and Butcher overshoots.
  f.at(3.9).pose('h', 'hH').strike('b', 'h', { pose: 'bC', d: 0.14, reach: 20 * sc })
  f.at(3.98).approach('h', hx + 30 * sc, 0.1, { ghosts: true, lines: false })
  f.smear('h', hx, hx + 30 * sc, 3.99, 0.08)
  f.at(4.06).step('b', 9 * sc, 0.18)
  // 4.5: the connect. The crowbar lands under the mosaic: hit-stop, an impact frame, a punch-in, a 3 px shake.
  f.at(4.5).strike('b', 'h', { pose: 'bC', d: 0.1, reach: 17 * sc, smear: false })
  f.hit('h', { star: false, sparks: false, flash: 0.25, shake: 3, freeze: 0.12, impact: true })
  const h1 = f.hits[f.hits.length - 1] as { t: number; x: number; y: number }
  fight += mosaic(a, w, h1.t, h1.x, h1.y, 'f2h1') + fx.sparks(a.sg, h1.t + 0.02, h1.x, h1.y, { seed: 'f2s1', n: 6, color: '#FFD27A' })
  cam.push(4.6, 4.66, 1.12, h1.x, h1.y, 'snap').reset(4.95, 5.2, 'settle')
  // 4.9: the backhand. Butcher flies back and crashes (another mosaic), dust.
  f.at(4.9).hit('b', { pose: 'bD', star: false, sparks: false, flash: false, shake: 2, freeze: 0.08 })
  const h2 = f.hits[f.hits.length - 1] as { t: number; x: number; y: number }
  fight += mosaic(a, w, h2.t, h2.x, h2.y, 'f2h2', 0.45, false)
  f.knockback('b', 70 * sc, { d: 0.42, land: 'skid', arc: 12 })
  // 5.6: the feed drops. Back on air at 6.15: Butcher is gone, Homelander faces the camera and smiles.
  over += signalLost(a, w, 5.6)
  f.at(6.1).exit('b', { dir: -1, d: 0.02, fade: true })
  f.at(6.12).pose('h', 'hH', 1)
  over += lowerThird(a, w, 7.2, w.m === 'book' ? 'INCIDENT UNDER REVIEW' : 'ROUTINE TRAINING EXERCISE', w.m === 'book' ? 'WHAT VOUGHT WILL SAY' : 'APPROVAL +8 · NO COMMENT', w.m === 'book' ? 'LEAK' : 'VOUGHT')
  fight = f.body() + fight
  return finish(a, w, cam, '', fight, over, f.still() + mosaicSvg(h2.x, h2.y, w, 'f2h2'))
}

// ---------------------------------------------------------------- F1 · FAMILY REUNION (Homelander vs Soldier Boy, SOLID GOLD)
export const F1_MS = 11_000
const reunion = (a: Act, g: Geo): string => {
  const w = winOf(g)
  cast(a, {
    hH: [MS.TB_GOLD_HOMELANDER_HOVER, 0.5], hL: [MS.TB_GOLD_HOMELANDER_LASER, 0.4],
    sW: [MS.TB_GOLD_SOLDIERBOY_SHIELD, 0.5], sB: [MS.TB_GOLD_SOLDIERBOY_BASH, 0.35], sX: [MS.TB_GOLD_SOLDIERBOY_BLAST, 0.55],
  })
  const sc = w.sc
  const ww = w.x1 - w.x0
  const y = cy(w)
  const hx = r1(w.x0 + ww * 0.32)
  const sx = r1(w.x0 + ww * 0.7)
  const cam = new Camera(a.sg)
  const f = new Fight(a.sg, { sc, ink: '#2A1C08', dust: '#C9A13B', lines: '#FFF3C4', smear: '#FFF3C4', impactBg: '#1E1406', impactFg: '#FFF3C4', ghosts: !w.band }, cam)
  f.fighter('h', 'hH', hx, w.y0 - 40 * sc, 1).fighter('s', 'sW', w.x1 + 24 * sc, y, -1)
  let over = slate(a, w, 0.9) + bug(a, w, a.sg.T - 0.1)
  let fight = ''
  drift(cam, 0, 2.2, 'f1a')
  // 0.8: Homelander drops in; 0.9-2.1 Soldier Boy walks in from the right, shield up.
  f.at(0.8).approach('h', hx, 0.28, { y, ease: 'snap', lines: false, ghosts: true })
  fight += fx.dust(a.sg, 1.08, hx, w.gy, { seed: 'f1land', n: 3, color: '#C9A13B' })
  cam.shake(1.08, 2, 0.2)
  const step = (sx - (w.x1 + 24 * sc)) / 3
  f.at(0.9)
  for (let i = 0; i < 3; i++) f.step('s', -step, 0.4)
  // 2.2-2.8: the stare (and on the CRISIS DESK, his close-up).
  f.at(2.2).stare('h', 's', 0.6, { push: 0.06 })
  // 2.9-3.9: the LASER into the shield: the beam fans out in gold sparks off the rim, the rim glows; Soldier Boy holds.
  f.at(2.9).pose('h', 'hL').pose('s', 'sW')
  const ex = r1(hx + 4 * sc)
  const ey = r1(y - 15 * sc)
  const shx = r1(sx - 9 * sc)
  const shy = r1(y - 6 * sc)
  const beam = `<path d="M${ex} ${ey}L${shx} ${shy}" stroke="#FF8A7A" stroke-width="${r1(3 * sc)}" opacity=".35"/><path d="M${ex} ${ey}L${shx} ${shy}" stroke="#FF2A2A" stroke-width="1.4"/><circle cx="${shx}" cy="${shy}" r="${r1(5 * sc)}" fill="#FFF3C4" opacity=".55"/>`
  fight += a.sg.win(2.9, 3.85, beam)
  fight += fx.sparks(a.sg, 3.0, shx, shy, { seed: 'f1sp', n: 7, color: '#F4DC86', len: 9 }) + a.sg.win(3.1, 3.85, `<circle cx="${shx}" cy="${shy}" r="${r1(10 * sc)}" fill="none" stroke="#FFF3C4" stroke-width="1.5" opacity=".8"/>`)
  f.at(3.3).flinch('s', { px: 3, d: 0.2 })
  over += swing(a, w, 3.2, -6)
  // 4.0: the SHIELD BASH. Contact under the mosaic, hit-stop, impact frame; Homelander skids back.
  f.at(4.0).pose('h', 'hH').strike('s', 'h', { pose: 'sB', d: 0.14, reach: 16 * sc })
  f.hit('h', { star: false, sparks: false, flash: 0.25, shake: 3, freeze: 0.12, impact: true })
  const h1 = f.hits[f.hits.length - 1] as { t: number; x: number; y: number }
  fight += mosaic(a, w, h1.t, h1.x, h1.y, 'f1h1')
  cam.push(4.2, 4.26, 1.1, h1.x, h1.y, 'snap').reset(4.55, 4.8, 'settle')
  f.knockback('h', Math.min(34 * sc, hx - w.x0 - 10), { d: 0.38, land: 'skid', arc: 2 })
  // 4.9: the CHEST BLAST: an orange ring off his chest, a flash, the mosaic; Homelander is blown up and out of the frame.
  f.at(4.9).pose('s', 'sX')
  // Where he stands after the bash (the strike took him to Homelander's front), his chest just ahead of him.
  const chx = r1(hx + 16 * sc - 7 * sc)
  const chy = r1(y - 6 * sc)
  fight += fx.ring(a.sg, 5.0, chx, chy, { rx: 12 * sc, color: '#FF9A3A', w: 2.5 }) + fx.ring(a.sg, 5.1, chx, chy, { rx: 8 * sc, color: '#FFF3C4', w: 1.5 }) + fx.flash(a.sg, 5.0, { a: 0.3, color: '#FFE2A0' })
  f.at(5.05).hit('h', { star: false, sparks: false, flash: false, shake: 4, freeze: 0.1 })
  const h2 = f.hits[f.hits.length - 1] as { t: number; x: number; y: number }
  fight += mosaic(a, w, h2.t, h2.x, h2.y, 'f1h2', 0.4, false)
  f.at(5.2).approach('h', w.x0 - 30 * sc, 0.32, { y: w.y0 - 30 * sc, ghosts: true, lines: true })
  over += swing(a, w, 5.3, -9)
  // 5.8: tracking lost. Back at 6.35: Soldier Boy alone, shield up, to the camera.
  over += signalLost(a, w, 5.8)
  f.at(6.3).pose('s', 'sW', -1)
  over += lowerThird(a, w, 7.0, 'A VOUGHT FAMILY EXCLUSIVE', 'SOLID GOLD · RECORDED LIVE', 'VNN')
  fight = f.body() + fight
  return finish(a, w, cam, '', fight, over, f.still() + mosaicSvg(h2.x, h2.y, w, 'f1h2'))
}

// ---------------------------------------------------------------- F3 · CURTAIN UP (Kimiko vs Black Noir, a silent movie)
export const F3_MS = 10_000
const curtainup = (a: Act, g: Geo): string => {
  const w = { ...winOf(g), m: 'noir' as Mode }
  cast(a, {
    kS: [MS.TB_BW_KIMIKO_STANCE, 0.5], kK: [MS.TB_BW_KIMIKO_KICK, 0.37], kL: [MS.TB_BW_KIMIKO_LEAP, 0.4], kB: [MS.TB_BW_KIMIKO_BOW, 0.4],
    nR: [MS.TB_BW_NOIR_READY, 0.32], nS: [MS.TB_BW_NOIR_SLASH, 0.31], nT: [MS.TB_BW_NOIR_THUMBSUP, 0.4], nB: [MS.TB_BW_NOIR_BOW, 0.32],
  })
  const sc = w.sc
  const ww = w.x1 - w.x0
  const y = cy(w)
  const kx = r1(w.x0 + ww * 0.26)
  const nx = r1(w.x0 + ww * 0.72)
  const mid = r1((kx + nx) / 2)
  const cx = (w.x0 + w.x1) / 2
  const my = (w.y0 + w.gy) / 2
  const z = w.band ? 14 : 18
  const card = (t0: number, t1: number, text: string) => a.sg.on(`<rect x="${w.x0}" y="${w.y0}" width="${ww}" height="${w.gy - w.y0}" fill="#0B0C0E"/>${intertitle(cx, my, text, z)}`, t0, t1)
  const cam = new Camera(a.sg)
  const f = new Fight(a.sg, { sc, ink: '#0B0C0E', dust: '#999999', lines: '#EDEDED', smear: '#EDEDED', impactBg: '#EDEDED', impactFg: '#0B0C0E', ghosts: !w.band }, cam)
  f.fighter('k', 'kS', kx, y, 1).fighter('n', 'nR', nx, y, -1)
  let fight = ''
  let over = card(0, 1.0, 'Act I.')
  // A silent picture runs a touch fast: the camera barely moves, it jitters (a hand-cranked gate).
  drift(cam, 1.0, 2.3, 'f3a')
  // 1.0-2.3: they size each other up; her line is an intertitle, not a caption.
  f.at(1.0).stare('k', 'n', 0.6, { push: 0.04 })
  over += card(1.7, 2.3, '“Again?”')
  // 2.4: both dash in; slash and kick cross mid-frame under a white slash line and the (censored) card.
  f.at(2.4).approach('k', mid - 12 * sc, 0.22, { pose: 'kS', ghosts: true })
  f.with().approach('n', mid + 12 * sc, 0.22, { ghosts: true })
  f.at(2.62).pose('k', 'kK').pose('n', 'nS')
  f.hit('n', { star: false, sparks: false, flash: false, shake: 2, freeze: 0.14, impact: true })
  const h1 = f.hits[f.hits.length - 1] as { t: number; x: number; y: number }
  fight += a.sg.win(2.62, 2.9, `<path d="M${r1(mid - 40 * sc)} ${r1(y + 14 * sc)}L${r1(mid + 40 * sc)} ${r1(y - 22 * sc)}" stroke="#FFFFFF" stroke-width="1.6"/>`) + mosaic(a, w, h1.t, h1.x, h1.y, 'f3h1', 0.5)
  // 3.0-3.7: the follow-up slash goes low; she leaps it on a real arc and lands behind him.
  f.at(3.0).pose('n', 'nR')
  const land = r1(mid + 40 * sc)
  f.at(3.05).throw('k', land, y, { d: 0.6, arc: 26 * sc, turns: 0, pose: 'kL' })
  f.at(3.15).pose('n', 'nS')
  f.at(3.65).pose('k', 'kS', -1)
  // 3.9: her kick lands from behind: he staggers (mosaic), turns.
  f.at(3.9).pose('k', 'kK', -1)
  f.at(3.95).hit('n', { pose: 'nR', star: false, sparks: false, flash: false, shake: 2, freeze: 0.1, x: mid + 20 * sc })
  const h2 = f.hits[f.hits.length - 1] as { t: number; x: number; y: number }
  fight += mosaic(a, w, h2.t, h2.x, h2.y, 'f3h2', 0.45, false)
  f.at(4.4).pose('k', 'kS', -1).pose('n', 'nR', 1)
  // 4.9-6.0: the stand-off ends in a thumbs-up. Intertitle: …
  f.at(4.9).pose('n', 'nT', 1)
  over += card(5.3, 5.9, '…')
  // 6.1-7.6: both bow.
  f.at(6.1).pose('k', 'kB', -1).pose('n', 'nB', 1)
  drift(cam, 6.1, 7.6, 'f3b')
  fight = f.body() + fight
  const bars = `<rect x="${w.x0}" y="${w.y0}" width="${ww}" height="${r1(5 * sc)}" fill="#000000"/><rect x="${w.x0}" y="${r1(w.gy - 5 * sc + 1)}" width="${ww}" height="${r1(5 * sc)}" fill="#000000"/>`
  over = bars + over + card(8.3, a.sg.T - 0.05, 'Fin.')
  // The projector's light: a pale screen behind the players, so the black-and-white figures read (it fades in after ACT I).
  const screen = a.sg.on(`<defs><linearGradient id="${a.sg.p}sc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C4C2BC"/><stop offset="1" stop-color="#8E8C86"/></linearGradient></defs><rect x="${w.x0}" y="${w.y0}" width="${ww}" height="${w.gy - w.y0}" fill="url(#${a.sg.p}sc)"/>`, 0.9, 8.4, { fade: 0.2, op: 0.92 })
  return finish(a, w, cam, screen, fight, over, f.still() + mosaicSvg(h2.x, h2.y, w, 'f3h2') + bars)
}

// ---------------------------------------------------------------- F4 · THE RACE (A-Train vs the progress bar)
export const F4_MS = 6_500
const race = (a: Act, g: Geo): string => {
  const w = winOf(g)
  // A-Train in the look's own film: SOLID GOLD's ramp, NOIR's greys (ON BRAND and OFF BOOK keep his blue), like the cut-ins.
  const gr = (k: string, sp: Sprite): [Sprite, number] => [gradeOf(`f4${k}`, sp, w.m), 0.5]
  cast(a, { aS: gr('aS', SP.TB_ATRAIN_START), r1: gr('r1', SP.TB_ATRAIN_RUN1), r2: gr('r2', SP.TB_ATRAIN_RUN2), r3: gr('r3', SP.TB_ATRAIN_RUN3), r4: gr('r4', SP.TB_ATRAIN_RUN4), aP: gr('aP', SP.TB_ATRAIN_SPEED) })
  // The race's own colours follow too: the speed lines, the bar and its fill, the start lights.
  const k = w.m === 'noir' ? { go: '#EDEDED', bar: '#999999', well: '#262626', ink: '#C2C2C2', stop: '#575757' } : w.m === 'gold' ? { go: '#FFF3C4', bar: '#E2C25A', well: '#2A1C08', ink: '#F4DC86', stop: '#86621A' } : { go: '#3DDC84', bar: '#4FC3F7', well: '#0A1430', ink: '#9FC3E8', stop: '#FF3B3B' }
  const sc = w.sc
  const ww = w.x1 - w.x0
  const y = cy(w)
  const x0 = r1(w.x0 + 14 * sc)
  const fin = r1(w.x1 - 34 * sc)
  const cam = new Camera(a.sg)
  const f = new Fight(a.sg, { sc, ink: INK, lines: k.go, smear: k.go, ghosts: !w.band }, cam)
  f.fighter('a', 'aS', x0, y, 1)
  let over = bug(a, w, 3.3)
  // On the CRISIS DESK the race runs over the card's talking points: a veil inside the window keeps both readable.
  let fight = w.band ? '' : a.sg.on(`<rect x="${w.x0}" y="${w.y0}" width="${ww}" height="${w.gy - w.y0}" fill="${k.well}"/>`, 0, a.sg.T - 0.05, { fade: 0.2, op: 0.86 })
  // The track: a lane line, the finish (a chequered strip), and the rival: a progress bar racing along the lane.
  const lane = w.gy - 2
  let chk = ''
  for (let i = 0; i < 8; i++) chk += `<rect x="${r1(fin + (i % 2) * 3)}" y="${r1(w.y0 + 14 + i * ((lane - w.y0 - 14) / 8))}" width="3" height="${r1((lane - w.y0 - 14) / 8)}" fill="#F4F1E8"/>`
  fight += `<rect x="${w.x0}" y="${lane}" width="${ww}" height="1.5" fill="#F4F1E8" opacity=".5"/>${chk}`
  const bar = `<rect x="${x0}" y="${r1(lane - 7)}" width="${r1(fin - x0)}" height="5" rx="2" fill="${k.well}" stroke="${k.bar}" stroke-width=".6"/>`
  fight += bar + a.sg.kf(`<rect x="${x0}" y="${r1(lane - 7)}" width="${r1(fin - x0)}" height="5" rx="2" fill="${k.bar}"/>`, [[0, 'transform:scaleX(0)'], [1.25, 'transform:scaleX(0)'], [3.3, 'transform:scaleX(.985)'], [a.sg.T, 'transform:scaleX(.985)']], { origin: `${x0}px 0` }) + C(x0 + 4, lane - 9, 'PROGRESS', 5.5, k.ink, 'letter-spacing=".6"')
  // 0.2-1.2: the 7SPN countdown, three lights; he waits in his crouch.
  for (const [i, t] of [0.25, 0.6, 0.95].entries()) fight += a.sg.win(t, 1.3, `<circle cx="${r1(w.x0 + ww / 2 - 14 + i * 14)}" cy="${w.y0 + 10}" r="4.5" fill="${i === 2 ? k.go : k.stop}" stroke="${INK}"/>`)
  over += a.sg.win(0.05, 1.3, `<rect x="${r1(w.x0 + ww / 2 - 26)}" y="${w.y0 + 3}" width="52" height="14" rx="3" fill="${INK}" opacity=".7"/>`)
  // 1.25: GO. A full RUN1-4 cycle (.36 s a stride), ghosts and green speed lines; SPEED at the end; the photo finish.
  const go = 1.25
  const end = 3.3
  f.at(go).approach('a', fin - 4 * sc, end - go, { pose: 'r1', ease: 'linear', lines: true, ghosts: true })
  for (let t = go, i = 0; t < end - 0.5; t += 0.09, i++) f.at(t).pose('a', `r${(i % 4) + 1}`)
  f.at(end - 0.5).pose('a', 'aP')
  fight += a.sg.win(end - 0.5, end, fx.speedLines(fin - 30 * sc, y - 6 * sc, 40 * sc, 5, 1, k.go, { seed: 'f4sl' }))
  f.at(end).freeze(0.35)
  fight += fx.flash(a.sg, end, { a: 0.45 })
  // The photo-finish frame holds him by a nose over the line.
  const pf = `<rect x="${r1(fin - 30 * sc)}" y="${r1(w.y0 + 6)}" width="${r1(54 * sc)}" height="${r1(w.gy - w.y0 - 10)}" fill="none" stroke="#FFFFFF" stroke-width="1.5"/>${C(fin - 3 * sc, w.y0 + 16, 'PHOTO FINISH', 7, '#FFFFFF', 'text-anchor="middle" letter-spacing="1"')}`
  over += a.sg.win(end, a.sg.T - 0.05, pf)
  over += lowerThird(a, w, end + 0.3, 'A-TRAIN BY A NOSE', 'OFFICIAL 7SPN TIMING · THE BAR HAS APPEALED', '7SPN')
  over += swing(a, w, end + 0.5, +3)
  fight = f.body() + fight
  return finish(a, w, cam, '', fight, over, a.sg.still('aP', fin - 4 * sc, y, 1, sc) + pf)
}

// ---------------------------------------------------------------- the rows, their lengths, their replay names
type FightRow = Row & { scrim?: boolean | 'stage'; ms: number }
const row = (ms: number, band: (a: Act, g: Geo) => string, pane: (a: Act, g: Geo) => string): FightRow => ({ ms, scrim: 'stage', band: (a, g) => band(a, g), pane: ['task', (a, g) => pane(a, g)] })
export const FIGHT_ROWS: Record<string, FightRow> = {
  offthebooks: row(F2_MS, offthebooks, (a, g) => monitor(a, g, { freezes: [[3.05, 0.45], [4.6, 0.12], [4.9, 0.08]], cuts: [[2.0, 'ciB', MS.TB_CUTIN_BUTCHER_STARE, 0.6], [3.05, 'ciH', MS.TB_CUTIN_HOMELANDER_LASER, 0.42]], hits: [4.6, 4.9], lost: 5.6, spin: [7.2, g.m === 'book' ? 'INCIDENT UNDER REVIEW' : 'ROUTINE TRAINING EXERCISE', g.m === 'book' ? 'THE CRISIS DESK HAS NOTHING' : 'HOLDING STATEMENT · APPROVED', g.m === 'book' ? 'LEAK' : 'VOUGHT'], arena: ['far', 'mid', 'near'], where: 'CAM 2 · VOUGHT TOWER ROOF' })),
  reunion: row(F1_MS, reunion, (a, g) => monitor(a, g, { freezes: [[4.14, 0.12], [5.05, 0.1]], cuts: [[2.3, 'ciS', MS.TB_CUTIN_SOLDIERBOY_SHIELD, 0.5], [2.9, 'ciH', MS.TB_CUTIN_HOMELANDER_LASER, 0.42]], hits: [4.14, 5.05], lost: 5.8, spin: [7.0, 'A VOUGHT FAMILY EXCLUSIVE', 'RECORDED LIVE · 1983', 'VNN'], arena: ['far', 'near'], where: 'CAM 2 · THE OLD TOWER, 1983' })),
  curtainup: row(F3_MS, curtainup, curtainup),
  race: row(F4_MS, race, race),
}
export const FIGHT_KINDS = Object.keys(FIGHT_ROWS)
for (const [k, r] of Object.entries(FIGHT_ROWS)) setActMs(k, r.ms)
defineActs(FIGHT_ROWS)
/** `/missioncontrol play <name>`: each fight by its name (the shared registry picks these up in theboys-show.ts §4). */
export const FIGHT_PLAYS: [string, string][] = [
  ['reunion', 'F1 FAMILY REUNION: Homelander vs Soldier Boy (SOLID GOLD)'],
  ['offthebooks', 'F2 OFF THE BOOKS: Butcher vs Homelander'],
  ['curtainup', 'F3 CURTAIN UP: Kimiko vs Black Noir, a silent picture'],
  ['race', 'F4 THE RACE: A-Train vs the progress bar'],
]
for (const [name, what] of FIGHT_PLAYS) registerReplay({ name, what, run: () => ({ fx: name }) })
/** The look's fight in a shared AMBUSH/fight slot: SOLID GOLD's reunion, NOIR's silent picture, OFF BOOK's Butcher; ON BRAND
 *  alternates Butcher's fight and A-Train's race. */
export const fightFor = (m: Mode, n: number): string => (m === 'gold' ? 'reunion' : m === 'noir' ? 'curtainup' : m === 'book' ? 'offthebooks' : n % 2 ? 'race' : 'offthebooks')
/** Typed in THIS MEANS NOIR: the silent picture now. */
export const CURTAIN_UP_RE = /\bcurtain\s+up\b/i
