// Caliper: the pane's cards (CALIBRATION the level card, READOUT the task card with the LOG BOOK, TRACE the log, CREW the
// hierarchy, and the ZEROING strip), the ladder and the marks, the words. Pure SVG strings, no state; a face is only a palette.
import { CAL_CSS, CAL_FONT, Bd, Lb, Vl, calPal, calPip, clip, dial, frame, hairH, hairV, pin, r2, ruler, sansW, vernier, xml } from './caliper'
import type { CalFace, CalPal } from './caliper'
import { durOf, hhmm, money } from './invincible'
import { nextOf, veil } from './extras'
import type { Badge, Beat, Cred, CredWords } from './extras'
import type { Legend } from './eggs'

const open = (W: number, H: number): string => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="font-variant-numeric:tabular-nums"><style>${CAL_CSS}</style>`
const head = (P: CalPal, W: number, H: number, title: string, right = ''): string => `${frame(P, W, H)}${Lb(P, 18, 22, title)}${right}${hairH(12, 31.5, W - 12, P.line)}`
const rulerW = (W: number): number => Math.floor((W - 36) / 10) * 10

// ---------------------------------------------------------------- words
export const CAL_WORDS = ['Measuring', 'Zeroing', 'Squaring up', 'Taking a reading', 'Within tolerance']
export const CAL_TOOLS: Record<string, string> = { Read: 'Read', Grep: 'Scan', Glob: 'Index', LS: 'Index', Edit: 'Adjust', MultiEdit: 'Adjust', NotebookEdit: 'Adjust', Write: 'Mark', Bash: 'Run', PowerShell: 'Run', Agent: 'Delegate', ToolSearch: 'Look up', WebFetch: 'Fetch', WebSearch: 'Search' }
export const CAL_GREETING = 'Caliper on. Zeroed.'
export const CAL_BOOT: [string, string] = ['ZEROING…', 'ZEROED']

// ---------------------------------------------------------------- the ladder and the marks
export const RANKS = ['Zeroed', 'Rough cut', 'Marked out', 'Squared', 'True', 'Within tolerance', 'Fine adjustment', 'Zeroed in', 'Reference', 'Master gauge']
export const calRankOf = (level: number): string => RANKS[Math.max(0, Math.min(RANKS.length, level) - 1)] as string
/** Level L needs 25·L·(L−1) XP: the same ladder as the other cards (the store is unchanged). */
const levelOf = (xp: number): number => Math.max(1, Math.floor((1 + Math.sqrt(1 + Math.max(0, xp) / 6.25)) / 2))
const xpFor = (level: number): number => 25 * level * (level - 1)
const share = (n: number, of: number): number => Math.max(0, Math.min(1, n / of))
/** Same ids and progress as extras.BADGES (so the store and the awards are unchanged); the names are Caliper's marks. */
export const MARKS: Badge[] = [
  { id: 'choom', name: 'FIRST RUN', icon: '|', how: 'Finish a first job', progress: c => share(c.jobs, 1) },
  { id: 'merc', name: 'TEN JOBS', icon: '|', how: 'Finish 10 jobs', progress: c => share(c.jobs, 10) },
  { id: 'edgerunner', name: 'FIFTY JOBS', icon: '|', how: 'Finish 50 jobs', progress: c => share(c.jobs, 50) },
  { id: 'legend', name: 'LONG HAUL', icon: '|', how: '10 long jobs (3+ minutes each)', progress: c => share(c.longJobs, 10) },
  { id: 'netrunner', name: 'HUNDRED HANDS', icon: '|', how: 'Call 100 sub-agents', progress: c => share(c.agents, 100) },
  { id: 'crewboss', name: 'FULL CREW', icon: '|', how: 'A job with 5+ sub-agents', progress: c => share(c.crewJobs, 1) },
  { id: 'chromed', name: 'OFF THE SCALE', icon: '|', how: 'Push the context past 90 %', progress: c => (c.chromed ? 1 : 0) },
  { id: 'owl', name: 'NIGHT SHIFT', icon: '|', how: 'Finish a job after midnight', progress: c => share(c.nightJobs, 1) },
  { id: 'samurai', name: 'CALIBRATED', icon: '|', how: 'Keep exploring.', progress: c => (c.samurai ? 1 : 0) },
]
export const CAL_CRED_WORDS: CredWords = { badges: MARKS, cases: 'JOBS', long: 'LONG JOBS', all: 'EVERY MARK EARNED. CALIBRATED.' }
export const calToast = (level: number): string => `LEVEL ${String(level).padStart(2, '0')} · ${calRankOf(level).toUpperCase()}`

// ---------------------------------------------------------------- ZEROING (the boot strip, W by 30)
export const bootLine = (W: number, face: CalFace): string => {
  const P = calPal(face)
  const [a, b] = CAL_BOOT
  const lead = a.replace('…', '')
  const x0 = Math.round(sansW(lead, 9.5, 1.6, true)) + 18
  const x1 = W - Math.round(sansW(b, 9.5, 1.6, true)) - 14
  return `${open(W, 30)}${Lb(P, 0, 19, lead)}${hairH(x0, 15.5, x1, P.hair)}<rect class="cal-sweep" x="${x0}" y="14" width="40" height="2" fill="${P.accent}" style="--sw:${Math.max(0, x1 - x0 - 40)}px"/>${Lb(P, W, 19, b, 'end', P.subtext)}</svg>`
}

// ---------------------------------------------------------------- CALIBRATION (the level card)
const markRows = (W: number): number => {
  let rows = 1
  let x = 18
  for (const m of MARKS) {
    const w = Math.round(sansW(m.name, 9.5, 1.2, true) + 18)
    if (x + w > W - 18) { rows += 1; x = 18 }
    x += w + 8
  }
  return rows
}
export const calibrationHeight = (W: number): number => 178 + markRows(W) * 26
/** `modeWord` is the setting (dark, light or auto), printed in the header; the pane button beneath cycles it. */
export const calibrationCard = (W: number, c: Cred, face: CalFace, modeWord = 'auto'): string => {
  const P = calPal(face)
  const H = calibrationHeight(W)
  const level = levelOf(c.xp)
  const have = xpFor(level)
  const need = xpFor(level + 1)
  const pct = share(c.xp - have, need - have) * 100
  const rw = rulerW(W)
  const word = modeWord === 'auto' ? `AUTO · ${face.toUpperCase()}` : modeWord.toUpperCase()
  const s = [open(W, H), head(P, W, H, 'CALIBRATION', `<text x="${W - 18}" y="22" text-anchor="end" font-family="${CAL_FONT}" font-size="11" fill="${P.accent}">⇄︎ ${word}</text>`)]
  s.push(Vl(P, 18, 64, String(level).padStart(2, '0'), P.text, 'start', 28, 600).replace('font-weight="600"', 'font-weight="600" letter-spacing="-.5"'))
  s.push(Lb(P, 58, 52, 'LEVEL'))
  s.push(Bd(P, 58, 66, calRankOf(level), P.subtext, 'start', 12.5))
  s.push(Lb(P, 18, 92, 'XP'))
  const xp = c.xp.toLocaleString('en-US')
  s.push(Vl(P, 60, 92, xp))
  s.push(Bd(P, 60 + sansW(xp, 13, 0, true) + 6, 92, `/ ${need.toLocaleString('en-US')}`, P.muted))
  s.push(ruler(P, 18, 108, rw, pct, false))
  // the vernier under the cursor: eleven fine ticks, the middle one the accent. At the instant a level is reached (no XP past the
  // threshold yet) the ticks line up with the main scale, the way a caliper reads zero.
  s.push(vernier(P, 18 + Math.round((rw * pct) / 100), 112, c.xp === have && c.xp > 0))
  s.push(Lb(P, 18, 140, 'MARKS'))
  s.push(Bd(P, W - 18, 140, `${c.badges.length} of ${MARKS.length}`, P.muted, 'end', 11.5))
  let bx = 18
  let by = 150
  for (const m0 of MARKS) {
    const earned = c.badges.includes(m0.id)
    const m = veil(m0, earned)
    const w = Math.round(sansW(m.name, 9.5, 1.2, true) + 18)
    if (bx + w > W - 18) { bx = 18; by += 26 }
    s.push(`<rect x="${bx + 0.5}" y="${by + 0.5}" width="${w - 1}" height="17" rx="4" fill="${earned ? P.tile2 : 'none'}" stroke="${earned ? P.hair : P.line}"${earned ? '' : ' stroke-dasharray="2 2"'}/><text x="${r2(bx + w / 2)}" y="${by + 12.5}" text-anchor="middle" font-family="${CAL_FONT}" font-size="9.5" font-weight="700" letter-spacing="1.2" fill="${earned ? P.subtext : P.muted}"><title>${xml(`${m.name}: ${m.how}`)}</title>${xml(m.name)}</text>`)
    bx += w + 8
  }
  const next = nextOf(MARKS.map(m => veil(m, c.badges.includes(m.id))), c)
  s.push(Bd(P, 18, H - 12, clip(next ? `Next: ${next.name} · ${next.how} · ${Math.round(next.progress(c) * 100)} %` : CAL_CRED_WORDS.all, 11.5, W - 36), P.muted))
  return `${s.join('')}</svg>`
}

// ---------------------------------------------------------------- READOUT (the task card and the LOG BOOK)
export type ReadoutStep = { title: string; state: string; note?: string }
export const READOUT_STEPS = 6
const BOOK_MAX = 5
export const readoutHeight = (legendsN: number): number => 280 + Math.max(1, Math.min(BOOK_MAX, legendsN)) * 18 + 10
const plain = (t: string): string => t.replace(/^\s*\d+[.)]\s+/, '')
export const readoutCard = (W: number, task: string, isWorking: boolean, done: number, total: number, legends: Legend[], face: CalFace, steps: ReadoutStep[] = []): string => {
  const P = calPal(face)
  const n = Math.min(BOOK_MAX, legends.length)
  const H = readoutHeight(legends.length)
  const pct = total > 0 ? Math.round((Math.min(done, total) / total) * 100) : 0
  const s = [open(W, H), head(P, W, H, 'READOUT', Bd(P, W - 18, 22, total ? `${done} of ${total} steps` : 'no steps', P.muted, 'end'))]
  s.push(dial(P, 36, 62, pct, isWorking))
  const title = task || 'No job running'
  s.push(`<text x="62" y="58" font-family="${CAL_FONT}" font-size="15" font-weight="700" fill="${task ? P.text : P.muted}">${xml(clip(title, 15, W - 62 - 100, true))}</text>`)
  const status = isWorking ? `Working · step ${Math.min(done + 1, Math.max(total, 1))} of ${Math.max(total, 1)}` : total > 0 && done >= total ? `Done · ${total} steps` : task ? `Paused · ${done} of ${total} steps` : 'Waiting for a job'
  s.push(Bd(P, 62, 76, status, P.subtext))
  s.push(Vl(P, W - 18, 62, total ? `${pct}%` : '', P.text, 'end', 22, 600))
  s.push(ruler(P, 18, 100, rulerW(W), total ? pct : null, isWorking))
  // a window of six steps, the running one in view
  if (!steps.length) s.push(Bd(P, 18, 130, 'No steps yet.', P.muted))
  else {
    const run = steps.findIndex(st => st.state === 'running')
    const from = Math.max(0, Math.min(steps.length - READOUT_STEPS, (run >= 0 ? run : Math.max(0, steps.findIndex(st => st.state === 'waiting') - 1)) - 2))
    steps.slice(from, from + READOUT_STEPS).forEach((st, i) => {
      const ry = 126 + i * 18
      const idx = from + i
      const dim = st.state === 'waiting' || st.state === 'stopped'
      s.push(calPip(P, st.state, 19.5, ry - 3.5))
      s.push(Bd(P, 30, ry, String(idx + 1).padStart(2, '0'), dim ? P.muted : P.subtext, 'start', 11.5, 'font-weight="700"'))
      const note = st.note ? clip(st.note, 11.5, 70) : ''
      s.push(Bd(P, 52, ry, clip(plain(st.title), 11.5, W - 52 - 18 - (note ? 80 : 0)), dim ? P.muted : st.state === 'running' ? P.text : P.subtext))
      if (note) s.push(Bd(P, W - 18, ry, note, st.state === 'running' ? P.accent : P.muted, 'end'))
    })
  }
  s.push(hairH(12, 240.5, W - 12, P.line))
  s.push(Lb(P, 18, 260, 'LOG BOOK'))
  s.push(Bd(P, W - 18, 260, legends.length ? `${legends.length} closed job${legends.length === 1 ? '' : 's'}` : '', P.muted, 'end'))
  if (!n) s.push(Bd(P, 18, 280, clip('No closed jobs yet. A job that runs 3+ minutes is logged here.', 11.5, W - 36), P.muted))
  legends.slice(0, n).forEach((l, i) => {
    const ry = 280 + i * 18
    s.push(`<rect x="18" y="${ry - 8}" width="3" height="9" fill="${P.done}" shape-rendering="crispEdges"/>`)
    const cost = money(l.costUsd)
    const dur = durOf(l.ms)
    s.push(Bd(P, W - 18, ry, cost, P.muted, 'end'))
    const dw = Math.round(sansW(cost, 11.5) + 22)
    s.push(Bd(P, W - 18 - dw, ry, dur, P.muted, 'end'))
    s.push(Bd(P, 30, ry, clip(l.task, 11.5, W - 30 - 18 - dw - Math.round(sansW(dur, 11.5)) - 16), P.subtext))
  })
  return `${s.join('')}</svg>`
}
export const readoutAlt = (isWorking: boolean, done: number, total: number): string => `Readout: ${isWorking ? 'working' : 'waiting'}, ${done} of ${total} steps`

// ---------------------------------------------------------------- TRACE (the log)
export const TRACE_H = 216
export const TRACE_ROWS = 6
export const traceCard = (W: number, beats: Beat[], pick: number, face: CalFace): string => {
  const P = calPal(face)
  const n = beats.length
  const live = pick < 0 || pick >= n - 1
  const sel = live ? n - 1 : pick
  let from = Math.max(0, n - TRACE_ROWS)
  if (!live && sel < from) from = Math.max(0, sel - TRACE_ROWS + 1)
  const shown = beats.slice(from, from + TRACE_ROWS)
  const s = [open(W, TRACE_H), head(P, W, TRACE_H, 'TRACE', Bd(P, W - 18, 22, n ? `${n} call${n === 1 ? '' : 's'}` : 'no calls yet', P.muted, 'end'))]
  // the timeline: a hairline with a tick per call in view, the picked one tall and accent
  s.push(hairH(18, 48.5, W - 18, P.hair))
  shown.forEach((_, i) => {
    const bx = 18 + Math.round((i * (W - 36)) / Math.max(1, TRACE_ROWS - 1))
    const picked = from + i === sel
    s.push(`<rect x="${bx}" y="${picked ? 41 : 45}" width="${picked ? 1.5 : 1}" height="${picked ? 15 : 7}" fill="${picked ? P.accent : P.subtext}" shape-rendering="crispEdges"/>`)
  })
  if (!n) s.push(Bd(P, 18, 84, 'Nothing traced yet. Every tool call gets a tick.', P.muted))
  shown.forEach((b, i) => {
    const ry = 78 + i * 18
    const picked = from + i === sel
    const word = (CAL_TOOLS[b.tool] ?? b.tool).toUpperCase()
    s.push(Lb(P, 18, ry, word, 'start', picked ? P.accent : P.muted))
    s.push(Bd(P, 78, ry, clip(b.text, 11.5, W - 78 - 18 - 46), picked ? P.text : P.subtext))
    s.push(Bd(P, W - 18, ry, hhmm(b.at), P.muted, 'end'))
  })
  s.push(hairH(12, 190.5, W - 12, P.line))
  s.push(Bd(P, 18, 207, n ? `${sel + 1} of ${n} · ${live ? 'live' : 'picked'}` : 'idle', live && n ? P.accent : P.muted))
  return `${s.join('')}</svg>`
}
export const traceAlt = (beats: Beat[], pick: number): string => {
  if (!beats.length) return 'Trace: nothing traced yet'
  const i = pick < 0 ? beats.length - 1 : Math.min(pick, beats.length - 1)
  const b = beats[i] as Beat
  return `Trace: call ${i + 1} of ${beats.length}, ${b.who} ${CAL_TOOLS[b.tool] ?? b.tool} ${b.text} at ${hhmm(b.at)}`
}

// ---------------------------------------------------------------- CREW (the hierarchy, drawn as pins and a spine)
/** What the hierarchy hands a theme: the manager, then roles, then agents (a structural copy of the engine's OrgNode). */
export type CalOrgNode = { label: string; color: string; kind: string; status?: string; isQuiet?: boolean; children: CalOrgNode[] }
const ORG_ROWS_MAX = 40
const ORG_WALK_MAX = 400
const ORG_ROW = 22
export const orgCard = (W: number, root: CalOrgNode, face: CalFace): string => {
  const P = calPal(face)
  type Row = { node: CalOrgNode; depth: number }
  const rows: Row[] = []
  const walk = (nodes: CalOrgNode[], depth: number): void => {
    for (const nd of nodes) {
      if (rows.length >= ORG_WALK_MAX) return
      rows.push({ node: nd, depth })
      walk(nd.children, depth + 1)
    }
  }
  walk(root.children, 0)
  // Past the cap the rest is one "+N more" row, as the engine's chart does.
  if (rows.length > ORG_ROWS_MAX) {
    const extra = rows.length - ORG_ROWS_MAX
    rows.length = ORG_ROWS_MAX
    rows.push({ node: { label: `+${extra} more`, color: '', kind: 'more', children: [] }, depth: 0 })
  }
  const agents = rows.filter(r => r.node.kind === 'agent')
  const working = agents.filter(r => r.node.status === 'running' && !r.node.isQuiet).length
  const H = 74 + Math.max(1, rows.length) * ORG_ROW + 14
  const s = [open(W, H), head(P, W, H, 'CREW', Bd(P, W - 18, 22, rows.length ? `${agents.length} agent${agents.length === 1 ? '' : 's'} · ${working} working` : 'no crew yet', P.muted, 'end'))]
  // the manager, then a spine down the left with one row per member
  s.push(pin(P, 30, 55, P.accent, root.status === 'running'))
  s.push(Bd(P, 44, 59, 'Manager', P.text, 'start', 12.5, 'font-weight="700"'))
  const last = 74 + (Math.max(1, rows.length) - 1) * ORG_ROW + 4
  if (rows.length) s.push(hairV(30, 61, last, P.hair))
  if (!rows.length) s.push(Bd(P, 44, 96, 'No sub-agents on this job yet.', P.muted))
  rows.forEach(({ node, depth }, i) => {
    const ry = 90 + i * ORG_ROW
    const x = 50 + depth * 18
    const isAgent = node.kind === 'agent' || node.kind === 'tokens'
    const live = node.status === 'running' && !node.isQuiet
    s.push(hairH(30, ry - 4.5, x - 6, P.hair))
    if (depth > 0) s.push(hairV(50 + (depth - 1) * 18, ry - 22, ry - 4.5, P.hair))
    if (node.kind === 'more') {
      s.push(Bd(P, x, ry, node.label, P.muted))
      return
    }
    s.push(pin(P, x, ry - 4.5, node.color, isAgent && live))
    const word = !isAgent ? '' : node.isQuiet ? 'quiet' : node.status === 'running' ? 'working' : node.status === 'done' ? 'done' : node.status === 'failed' ? 'failed' : node.status === 'stopped' ? 'stopped' : 'waiting'
    const tone = word === 'working' ? P.accent : word === 'done' ? P.done : word === 'failed' ? P.alert : word === 'quiet' ? P.warn : P.muted
    const right = word ? Math.round(sansW(word, 11.5)) + 6 : 0
    s.push(`<text x="${x + 14}" y="${ry}" font-family="${CAL_FONT}" font-size="11.5"${isAgent ? '' : ' font-weight="700"'} fill="${isAgent ? (live ? P.text : P.subtext) : P.subtext}">${xml(clip(node.label, 11.5, W - x - 14 - 18 - right - 8, !isAgent))}</text>`)
    if (word) s.push(Bd(P, W - 18, ry, word, tone, 'end'))
  })
  return `${s.join('')}</svg>`
}
