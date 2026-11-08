// THINK, MARK v3 generator (a development tool, not shipped code): reads the rig (rig.mjs) and the artists' part PNGs and writes
//   hooks/invincible-thinkmark-art3.ts   the half-size sprites (rows + pal, the same format as the other art files)
//   hooks/invincible-thinkmark-rig3.ts   the animation, sampled from the rig and compressed into CSS keyframes, one chunk per pane draw
// usage: node gen.mjs <parts dir (has A/ B/ C/ with parts_*.json)> <hooks out dir>
// The same rig drives the 60 fps MP4, so the pane and the film cannot drift apart. Original art, no footage anywhere.
import fs from 'node:fs'
import path from 'node:path'
import { readPng } from './png.mjs'
import { makeScene, T0, TCUT, T1 } from './rig.mjs'

const [SRC, OUT] = process.argv.slice(2)
if (!SRC || !OUT) throw new Error('usage: node gen.mjs <parts dir> <hooks out dir>')
const J = f => JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'))
const A = J('A/parts_A.json')
const B = J('B/parts_B.json')
const C = J('C/parts_C.json')

// ---------------------------------------------------------------- the half-size registry (what the pane draws)
const HALF = {} // name -> { file, w, h, pivot, joints, anchor }  (all in half px)
for (const p of A) {
  if (!p.name.endsWith('@half')) continue
  const n = p.name.replace('@half', '')
  HALF[n] = { file: `A/parts/${p.name}.png`, pivot: p.pivot, joints: p.joints ?? {} }
}
for (const p of B) {
  if (p.name.includes('SHEET') || !p.file_half) continue
  const half = p.pivot ? [Math.round(p.pivot[0] / 2), Math.round(p.pivot[1] / 2)] : [0, 0]
  HALF[p.name] = { file: `B/${p.file_half}`, pivot: half, joints: {}, anchor: p.anchor_half }
}
for (const p of C) {
  if (p.name.includes('SHEET') || !p.half) continue
  const h = v => [Math.round(v[0] / 2), Math.round(v[1] / 2)]
  HALF[p.name] = { file: `C/${p.half}`, pivot: h(p.pivot ?? [0, 0]), joints: Object.fromEntries(Object.entries(p.joints ?? {}).map(([k, v]) => [k, h(v)])) }
}
const PNG = {}
for (const [n, h] of Object.entries(HALF)) { PNG[n] = readPng(path.join(SRC, h.file)); h.w = PNG[n].w; h.h = PNG[n].h }
// the rig works in full-size coordinates: give it the half geometry doubled, so every joint and anchor is exact for the half art
const R = {}
for (const [n, h] of Object.entries(HALF)) {
  const d = v => [v[0] * 2, v[1] * 2]
  R[n] = { name: n, w: h.w * 2, h: h.h * 2, pivot: d(h.pivot), joints: Object.fromEntries(Object.entries(h.joints).map(([k, v]) => [k, d(v)])), anchor: h.anchor ? d(h.anchor) : undefined }
}
const scene = makeScene(R, { lite: true })

// ---------------------------------------------------------------- sprites
// capitals first: a row of letters must never spell a word the privacy check looks for (nc, ssh, ftp ...)
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const hex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()
const toSprite = (png, under) => {
  const pal = new Map()
  const rows = []
  for (let y = 0; y < png.h; y++) {
    let row = ''
    for (let x = 0; x < png.w; x++) {
      const i = (y * png.w + x) * 4
      let px = png.rgba[i + 3] >= 128 ? hex(png.rgba[i], png.rgba[i + 1], png.rgba[i + 2]) : null
      if (!px && under) px = under(x, y)
      if (!px) { row += '.'; continue }
      if (!pal.has(px)) pal.set(px, ALPHABET[pal.size])
      row += pal.get(px)
    }
    rows.push(row)
  }
  if (pal.size > ALPHABET.length) throw new Error('too many colours')
  return { rows, pal: Object.fromEntries([...pal].map(([c, k]) => [k, c])) }
}
// the sky and the rock wall, baked into one backdrop (one static drawing per draw)
const sky = PNG.ENV_SKY
const rocks = PNG.ENV_ROCKS
const bakedPng = { w: sky.w, h: sky.h, rgba: Buffer.from(sky.rgba) }
for (let i = 0; i < sky.w * sky.h; i++) if (rocks.rgba[i * 4 + 3] >= 128) for (let k = 0; k < 4; k++) bakedPng.rgba[i * 4 + k] = rocks.rgba[i * 4 + k]
// the rock wall's grain is what makes a draw heavy: a light 3x3 majority filter joins the specks into runs (the pane's backdrop only; the film keeps the full art)
const smooth = (png, rounds) => {
  let cur = png.rgba
  const key = (r, g, b) => (r << 16) | (g << 8) | b
  for (let k = 0; k < rounds; k++) {
    const nxt = Buffer.from(cur)
    for (let y = 1; y < png.h - 1; y++) for (let x = 1; x < png.w - 1; x++) {
      const cnt = new Map()
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const i = ((y + dy) * png.w + x + dx) * 4; const c = key(cur[i], cur[i + 1], cur[i + 2]); cnt.set(c, (cnt.get(c) ?? 0) + 1) }
      const i0 = (y * png.w + x) * 4
      const mine = key(cur[i0], cur[i0 + 1], cur[i0 + 2])
      let best = mine
      let n = cnt.get(mine)
      for (const [c, v] of cnt) if (v > n + 1) { best = c; n = v }
      if (best !== mine) { nxt[i0] = best >> 16; nxt[i0 + 1] = (best >> 8) & 255; nxt[i0 + 2] = best & 255 }
    }
    cur = nxt
  }
  return { w: png.w, h: png.h, rgba: cur }
}
bakedPng.rgba = smooth(bakedPng, 3).rgba
PNG.TM3_BG = bakedPng
HALF.TM3_BG = { w: sky.w, h: sky.h, pivot: [0, 0], joints: {} }

// ---------------------------------------------------------------- sampling and compression
const FPS = 60
const TOL = { x: 0.2, y: 0.2, r: 0.7, sx: 0.006, sy: 0.006, a: 0.05 }
const CH = ['x', 'y', 'r', 'sx', 'sy', 'a']
const r2 = v => +v.toFixed(1)
const pc = t => `${+((t / 65) * 100).toFixed(3)}%`

/** Flatten one frame's tree to {id: {parent, order, x,y,r,sx,sy,a, part}}. */
const flat = root => {
  const m = new Map()
  const walk = (n, parent) => {
    const part = n.part === 'ENV_SKY' ? 'TM3_BG' : n.part
    if (n.id === 'rocks') return
    m.set(n.id, { parent, x: n.x * 0.5, y: n.y * 0.5, r: n.r, sx: n.sx, sy: n.sy, a: n.a, part })
    for (const k of n.kids) walk(k, n.id)
  }
  for (const k of root.kids) walk(k, null)
  return m
}

/** Ramer-Douglas-Peucker over multi-channel samples (each [t, ...vals]); keeps the indices needed within the per-channel tolerances. */
const rdp = (S, tols) => {
  const keep = new Set([0, S.length - 1])
  const go = (a, b) => {
    let worst = 0
    let wi = -1
    for (let i = a + 1; i < b; i++) {
      const u = (S[i][0] - S[a][0]) / (S[b][0] - S[a][0])
      let e = 0
      for (let c = 0; c < tols.length; c++) e = Math.max(e, Math.abs(S[i][c + 1] - (S[a][c + 1] + (S[b][c + 1] - S[a][c + 1]) * u)) / tols[c])
      if (e > worst) { worst = e; wi = i }
    }
    if (worst > 1 && wi >= 0) { keep.add(wi); go(a, wi); go(wi, b) }
  }
  go(0, S.length - 1)
  return [...keep].sort((a, b) => a - b)
}

const TRACKLOG = []
const kfs = (name, stops) => `@keyframes ${name}{${stops.map(([t, v]) => `${pc(t)}{${v}}`).join('')}}`

function buildChunk(key, a, b) {
  const n = Math.round((b - a) * FPS)
  // the last sample sits a hair before the chunk's end (the next chunk starts exactly there)
  const times = Array.from({ length: n + 1 }, (_, i) => (i === n ? b - 0.0005 : a + i / FPS))
  const frames = times.map(t => scene(t))
  const sec = frames[0].sec
  const maps = frames.map(f => flat(f.root))
  // node order and parents (first appearance; unseen siblings go after the one before them)
  const parent = new Map()
  const order = new Map([[null, []]])
  for (const m of maps) {
    const prev = new Map() // last sibling seen under each parent in this frame
    for (const [id, v] of m) {
      if (!parent.has(id)) { parent.set(id, v.parent); order.set(id, []) }
      const sib = order.get(v.parent)
      if (!sib.includes(id)) { const p = prev.get(v.parent); const at = p !== undefined && sib.includes(p) ? sib.indexOf(p) + 1 : 0; sib.splice(at, 0, id) }
      prev.set(v.parent, id)
    }
  }
  // the camera and the shake become one track on the group around the world
  const camS = frames.map(f => { const c = f.cam; const s = c.s; return [s, 80 - s * (c.cx * 0.5) + f.shake[0] * 0.5, 45 - s * (c.cy * 0.5) + f.shake[1] * 0.5] })

  let css = ''
  let defsExtra = ''
  let uid = 0
  const partsUsed = new Set()
  const use = name => { partsUsed.add(name); const h = HALF[name]; return `<use href="#{P}s_${name}" x="${-h.pivot[0]}" y="${-h.pivot[1]}"/>` }

  const emit = id => {
    const series = maps.map(m => m.get(id))
    const present = series.map(Boolean)
    if (!present.some(Boolean)) return ''
    // hold the last known transform while a node is absent
    let last = series.find(Boolean)
    const val = series.map(s => { if (s) last = s; return { ...last, vis: !!s } })
    const vary = {}
    for (const c of CH) { vary[c] = val.some(v => Math.abs(v[c] - val[0][c]) > TOL[c] * 0.5) }
    const nonId = { xy: val.some(v => v.x !== 0 || v.y !== 0), r: val.some(v => v.r !== 0), s: val.some(v => v.sx !== 1 || v.sy !== 1) }
    const fmt = v => {
      const f = []
      if (nonId.xy) f.push(`translate(${r2(v.x)}px,${r2(v.y)}px)`)
      if (nonId.r) f.push(`rotate(${r2(v.r)}deg)`)
      if (nonId.s) f.push(`scale(${+v.sx.toFixed(2)},${+v.sy.toFixed(2)})`)
      return f.length ? `transform:${f.join(' ')}` : ''
    }
    // opacity: the node's own alpha, 0 while absent
    const alpha = val.map(v => (v.vis ? v.a : 0))
    const alphaVaries = alpha.some(v => Math.abs(v - alpha[0]) > 0.015)
    const anyMove = CH.slice(0, 5).some(c => vary[c])
    let style = ''
    let attr = ''
    if (anyMove || alphaVaries) {
      const S = times.map((t, i) => [t, val[i].x, val[i].y, val[i].r, val[i].sx, val[i].sy, alpha[i]])
      const keep = rdp(S, [TOL.x, TOL.y, TOL.r, TOL.sx, TOL.sy, TOL.a])
      const stops = keep.map(i => [times[i], `${fmt(val[i])}${alphaVaries ? `;opacity:${+alpha[i].toFixed(1)}` : ''}`.replace(/^;/, '')])
      const nm = `{P}${key}n${uid++}`
      TRACKLOG.push([id, stops.length])
      css += kfs(nm, [[0, stops[0][1]], ...stops, [65, stops[stops.length - 1][1]]])
      style = ` class="tm-a" style="animation-name:${nm};transform-origin:0 0"`
    } else {
      const f = fmt(val[0])
      if (f) attr = ` style="${f}"`
      if (alpha[0] !== 1) attr += ` opacity="${+alpha[0].toFixed(2)}"`
    }
    // drawing swaps
    const partsSeries = series.map(s => (s ? s.part : null))
    const distinct = [...new Set(partsSeries.filter(Boolean))]
    let own = ''
    if (distinct.length === 1) {
      // a single drawing: when absent frames exist they hide the whole group (alpha), so nothing else is needed
      own = use(distinct[0])
    } else if (distinct.length > 1) {
      const L = Math.max(...distinct.map(p => HALF[p].pivot[0]))
      const Rr = Math.max(...distinct.map(p => HALF[p].w - HALF[p].pivot[0]))
      const PY = Math.max(...distinct.map(p => HALF[p].pivot[1]))
      const Hh = Math.max(...distinct.map(p => HALF[p].h - HALF[p].pivot[1]))
      const CW = L + Rr + 2
      const cells = distinct.map((p, i) => `<g transform="translate(${i * CW} 0)">${use(p)}</g>`).join('')
      const cid = `{P}${key}k${uid++}`
      defsExtra += `<clipPath id="${cid}"><rect x="${-L}" y="${-PY}" width="${L + Rr}" height="${PY + Hh}"/></clipPath>`
      // step track: the cell index changes exactly when the drawing does
      const stops = []
      let prevIdx = -1
      partsSeries.forEach((p, i) => {
        const idx = p === null ? (prevIdx < 0 ? 0 : prevIdx) : distinct.indexOf(p)
        if (idx !== prevIdx) { stops.push([times[i], `transform:translateX(${-idx * CW}px)`]); prevIdx = idx }
      })
      const nm = `{P}${key}w${uid++}`
      css += kfs(nm, [[0, stops[0][1]], ...stops, [65, stops[stops.length - 1][1]]])
      own = `<g clip-path="url(#${cid})"><g class="tm-a" style="animation-name:${nm};animation-timing-function:steps(1,end);transform-origin:0 0">${cells}</g></g>`
    }
    const kids = order.get(id).map(emit).join('')
    if (!own && !kids) return ''
    return `<g${style}${attr}>${own}${kids}</g>`
  }
  const world = order.get(null).map(emit).join('')
  // camera track
  const cs = times.map((t, i) => [t, camS[i][1], camS[i][2], camS[i][0]])
  const keep = rdp(cs, [0.1, 0.1, 0.0015])
  const stops = keep.map(i => [times[i], `transform:translate(${r2(cs[i][1])}px,${r2(cs[i][2])}px) scale(${+cs[i][3].toFixed(4)})`])
  css += kfs(`{P}${key}cam`, [[0, stops[0][1]], ...stops, [65, stops[stops.length - 1][1]]])
  const bg = frames[0].bg ? `<rect width="160" height="90" fill="${frames[0].bg}"/>` : ''
  const body = `${bg}<g class="tm-a" style="animation-name:{P}${key}cam;transform-origin:0 0">${world}</g>`
  return { key, t0: a, t1: b, sec, parts: [...partsUsed].sort(), defs: defsExtra, css, body }
}

const CHUNKS = [buildChunk('a', T0, 14.3), buildChunk('b', 14.3, TCUT), buildChunk('c', TCUT, T1)]
const used = new Set(CHUNKS.flatMap(c => c.parts))

// ---------------------------------------------------------------- write the two files
const art = []
art.push('// THINK, MARK v3 art: the half-size parts of the rigged window (7.2 s to 24.65 s). GENERATED by tools/thinkmark-v3/gen.mjs from the artists\' part PNGs.')
art.push('// Original pixel art (our own prompts, our own palette); never traced from footage. Same format as cast.ts: rows of letters, `.` empty.')
art.push("import type { Sprite } from './cast'")
art.push('export const TM3_ART: Record<string, Sprite> = {')
for (const n of [...used].sort()) {
  const sp = toSprite(PNG[n])
  art.push(`  ${n}: { rows: [`)
  for (const r of sp.rows) art.push(`    '${r}',`)
  art.push(`  ], pal: ${JSON.stringify(sp.pal).replace(/"/g, "'")}, rim: false },`)
}
art.push('}')
fs.writeFileSync(path.join(OUT, 'invincible-thinkmark-art3.ts'), art.join('\n') + '\n')

const rig = []
rig.push('// THINK, MARK v3: the rigged window as data. GENERATED by tools/thinkmark-v3/gen.mjs from the rig (tools/thinkmark-v3/rig.mjs): one procedural')
rig.push('// animation sampled at 60 Hz and compressed into CSS keyframes. Each chunk is one pane draw: its markup, its keyframes and the part sprites it needs.')
rig.push("// `{P}` is replaced by the draw's id prefix. Times are seconds into the 65 s film. Original art; no footage.")
rig.push('export type Chunk3 = { key: string; t0: number; t1: number; sec: string; parts: string[]; defs: string; css: string; body: string }')
rig.push('export const TM3_CHUNKS: Chunk3[] = ' + JSON.stringify(CHUNKS.map(c => c), null, 1).replace(/\n\s*/g, ' ') )
fs.writeFileSync(path.join(OUT, 'invincible-thinkmark-rig3.ts'), rig.join('\n') + '\n')
if (process.env.TRACKS) console.log(TRACKLOG.sort((a, b) => b[1] - a[1]).slice(0, 40).map(t => t.join(':')).join(' '))
for (const c of CHUNKS) console.log(c.key, c.t0, c.t1, 'parts', c.parts.length, 'css', c.css.length, 'body', c.body.length, 'defs', c.defs.length)
