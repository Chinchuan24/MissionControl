// THINK, MARK v3 rig: ONE procedural animation (a pure function of time) shared by the 60 fps MP4 renderer and the pane generator.
// scene(t) -> { sec:'W'|'E', cam:{cx,cy,s,rot}, shake:[x,y], bg, root:Node }
// Node = { id, x, y, r (deg), sx, sy, a, part (name|null), kids:[Node] }; the part is drawn at -pivot, then the kids on top (in order).
// Original pixel art; the choreography is our own (see PLAN.md section 4). Omni-Man faces LEFT in the art; in the wide shot we mirror him
// (root sx=-1) so he looks toward Mark, so every x below in the figure is "local" (forward = -x).

export const T0 = 7.2
export const T1 = 24.65
export const TCUT = 19.65
export const FPS = 60

// ---------------------------------------------------------------- tiny math
const D2R = Math.PI / 180
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const lerp = (a, b, u) => a + (b - a) * u
const EASE = {
  lin: u => u,
  out: u => 1 - (1 - u) ** 3,
  out2: u => 1 - (1 - u) ** 2,
  in: u => u ** 3,
  in2: u => u ** 2,
  io: u => (u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2),
  back: u => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2 },
  hold: () => 0,
}
/** Keyframes [[t, v, ease?], ...]: the ease belongs to the segment that ENDS at that key. v is a number or an array. Holds before/after. */
export const K = (t, keys) => {
  if (t <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e = 'lin'] = keys[i]
    const [t0, v0] = keys[i - 1]
    if (t < t1) {
      const u = EASE[e]((t - t0) / (t1 - t0))
      return Array.isArray(v0) ? v0.map((a, j) => lerp(a, v1[j], u)) : lerp(v0, v1, u)
    }
  }
  return keys[keys.length - 1][1]
}
const ramp = (t, a, b, e = 'lin') => EASE[e](clamp((t - a) / (b - a), 0, 1))
const inW = (t, w) => w.some(([a, b]) => t >= a && t < b)
const pulse = (t, t0, d) => (t >= t0 && t < t0 + d ? Math.sin(((t - t0) / d) * Math.PI) : 0)
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }
const q = (t, fps) => Math.floor(t * fps + 1e-6) / fps

const N = (id, o = {}, kids = []) => ({ id, x: 0, y: 0, r: 0, sx: 1, sy: 1, a: 1, part: null, ...o, kids })

// ---------------------------------------------------------------- the world layout (320 x 180 canvas)
const MARK_HIP = [196, 72]
const MARK_ROT = -17
const OMNI_HIP = [212, 128]
const GROUND = 150

const rotp = (p, deg) => { const c = Math.cos(deg * D2R); const s = Math.sin(deg * D2R); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c] }

// ---------------------------------------------------------------- speech: mouth shapes from the bubble syllables
const SPEECH = [
  { w: [7.2, 7.9], text: "You'd keep fighting while they all drop?", kind: 'talk' },
  { w: [8.0, 8.4], text: 'THINK MARK', kind: 'shout' },
  { w: [8.4, 8.62], text: 'MARK', kind: 'open' },
  { w: [9.9, 13.3], text: "They'll all be gone. You won't.", kind: 'talk' },
  { w: [14.5, 17.1], text: 'This planet will rot away around you.', kind: 'talk' },
  { w: [18.2, 19.5], text: 'Every face you love will vanish.', kind: 'talk' },
]
const VOW = { a: 'O', o: 'O', e: 'M', i: 'M', u: 'O', y: 'M' }
/** 'C' | 'M' | 'O' | 'S' at time t (12 fps slots, ~167 ms per syllable). */
export const mouthAt = t => {
  const s = SPEECH.find(x => t >= x.w[0] && t < x.w[1])
  if (!s) return 'C'
  const slot = Math.floor((t - s.w[0]) * 6)
  if (s.kind === 'shout') return slot % 3 === 2 ? 'O' : 'S'
  if (s.kind === 'open') return 'O'
  const chars = [...s.text.toLowerCase().replace(/[^a-z .]/g, '')]
  const ch = chars[slot % chars.length]
  if (ch === ' ' || ch === '.') return 'C'
  if (VOW[ch]) return VOW[ch]
  return 'bmp'.includes(ch) ? 'C' : slot % 2 ? 'M' : 'C'
}
const speaking = t => SPEECH.some(x => t >= x.w[0] && t < x.w[1])
/** Eyes: 'N' | 'G' (glare) | 'B' (blink: 3 frames at 24 fps) */
const BLINKS = [250 / 24, 13.0, 374 / 24, 430 / 24]
const blinkAt = t => BLINKS.some(b => t >= b - 1e-6 && t < b + 3 / 24 - 1e-6)
/** Limited animation: drawings change on a 12 fps grid, on a 24 fps grid in the bursts (the swing, the shout, the rise, the face peaks) and in blinks. Motion stays continuous (60 fps). */
export const BURSTS = [[7.45, 7.75], [8.0, 8.4], [14.3, 14.6], [19.65, 20.1], [23.2, 23.6]]
export const dq = t => {
  const b = BURSTS.some(([a, c]) => t >= a && t < c) || BLINKS.some(k => t >= k - 1e-6 && t < k + 3 / 24)
  const f = b ? 24 : 12
  return Math.floor(t * f + 1e-6) / f
}

// ---------------------------------------------------------------- Omni-Man (wide)
const posture = t => (t < 7.55 ? 'H' : t < 8.75 ? 'U' : t < 14.45 ? 'H' : t < 16.25 ? 'U' : t < 16.9 ? 'H' : t < 18.3 ? 'H' : 'U')
const headKind = t => {
  if (t < 7.45) return 'DOWN'
  if (t < 8.75) return 'FWD'
  if (t < 9.9) return 'DOWN'
  if (t < 13.4) return 'FWD'
  if (t < 14.45) return 'DOWN'
  if (t < 16.1) return 'UP'
  if (t < 16.5) return 'DOWN'
  return 'FWD'
}
// where the face patches sit on each head (head px, the patch's own centre pivot); tuned by eye on the zoomed heads
const FACE = {
  FWD: { mouth: [5, 11], eyes: [6, 6] },
  UP: { mouth: [5, 10], eyes: [5, 6] },
  DOWN: null,
}

/** opts.lite: the pane's cut-down version (no foreground rocks, no second face base: the peaks punch in the first one instead). */
export function makeScene(R, opts = {}) {
  const lite = !!opts.lite
  const J = (part, joint) => { const p = R[part]; const j = p.joints[joint]; return [j[0] - p.pivot[0], j[1] - p.pivot[1]] }
  const ang = v => Math.atan2(v[1], v[0]) / D2R

  const liftOf = t => K(t, [[18.1, 0], [18.7, 1, 'out'], [20, 1]])
  /** Mark: where a point of S_LYING (its own px) is in the world. */
  const markXf = t => {
    const lift = liftOf(t)
    const rot = MARK_ROT + 4 * lift
    const dx = 6 * lift
    const dy = 1.5 * pulse(t, 8.06, 0.35) + 9 * lift + 0.5 * Math.sin(t * 2.2)
    // the pulls on the collar at 17.0 and 17.6
    const pull = pulse(t, 17.0, 0.3) + pulse(t, 17.6, 0.3)
    return { rot, pos: [MARK_HIP[0] + dx + 1.5 * pull, MARK_HIP[1] + dy - 1 * pull] }
  }
  const markPt = (t, lx, ly) => { const m = markXf(t); const p = rotp([lx - 82, ly - 16], m.rot); return [m.pos[0] + p[0], m.pos[1] + p[1]] }

  // ---- IK for one arm. S = shoulder (torso frame), T = wrist target (torso frame). Returns angles of the two bones.
  const arm = (side, S, T, pose) => {
    const U = 'F_ARM_UPPER_' + side
    const F = 'F_FOREARM_' + side
    const vU = J(U, 'elbow') // shoulder pivot -> elbow, in the upper's own frame
    const vF = J(F, 'wrist')
    const l1 = Math.hypot(...vU)
    const l2 = Math.hypot(...vF)
    let d = [T[0] - S[0], T[1] - S[1]]
    let dist = Math.hypot(...d)
    const lim = l1 + l2 - 0.5
    if (dist > lim) { d = [(d[0] / dist) * lim, (d[1] / dist) * lim]; dist = lim }
    if (dist < Math.abs(l1 - l2) + 1) dist = Math.abs(l1 - l2) + 1
    const cosA = clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1)
    const A = Math.acos(cosA) / D2R
    const base = ang(d)
    const c1 = base + A
    const c2 = base - A
    const elb = a => [S[0] + l1 * Math.cos(a * D2R), S[1] + l1 * Math.sin(a * D2R)]
    // elbow below the line (larger y) for 'down', behind (larger x, trailing side) for 'back'
    const pick = pose === 'back' ? (elb(c1)[0] > elb(c2)[0] ? c1 : c2) : elb(c1)[1] > elb(c2)[1] ? c1 : c2
    const E = elb(pick)
    const w = [S[0] + d[0], S[1] + d[1]]
    const rU = pick - ang(vU)
    const rF = ang([w[0] - E[0], w[1] - E[1]]) - ang(vF)
    return { rU, rF, E, w }
  }

  const omni = t => {
    const td = dq(t)
    const post = posture(td)
    const TOR = post === 'U' ? 'F_TORSO_UPRIGHT' : 'F_TORSO_HUNCH'
    const hipP = R[TOR].pivot
    const sh = s => J(TOR, s)
    const neck = J(TOR, 'neck')

    // ---- the body's own motion
    const breathe = 1 + 0.012 * Math.sin(t * 2.6) * (t > 8.75 ? 1 : 0.5)
    const recoil = pulse(t, 8.08, 0.16) * 2
    const swing = K(t, [[7.2, 0], [7.45, -6, 'out2'], [7.7, 5, 'out'], [7.9, 0, 'io'], [8, 0]]) // torso rock (deg)
    const lean = t >= 18.1 ? K(t, [[18.1, 0], [18.7, -2, 'out'], [19.4, -2], [19.65, 1, 'in']]) : t >= 16.1 ? K(t, [[16.1, 0], [16.5, 4, 'out'], [18, 4]]) : 0
    const tremor = inW(t, [[14.8, 16.0]]) ? 0.6 * Math.sin(t * 2 * Math.PI * 7) : 0
    const torsoR = swing + lean + tremor * 0.5
    const lf = liftOf(t)
    const hipX = OMNI_HIP[0] + 26 * lf
    const hipY = OMNI_HIP[1] + recoil - 16 * lf + (post === 'H' ? 0 : -2) + pulse(t, 16.25, 0.3) * 1

    // ---- world -> torso frame for arm targets (the root is mirrored, so local x = hipX - world x)
    const toL = ([wx, wy]) => [hipX - wx, wy - hipY]

    // ---- arm targets (torso frame = relative to the hip)
    const mk = (lx, ly) => toL(markPt(t, lx, ly))
    const chest = mk(120, 6)
    const collar = mk(140, 12)
    let TR
    let TL
    let handR = 'POINT'
    let handL = 'FIST'
    // R = the leading arm (toward Mark)
    if (t < 8.0) {
      handR = td < 7.45 ? 'FIST' : td < 7.62 ? 'OPEN' : 'POINT'
      TR = K(t, [[7.2, [-26, 24]], [7.45, [-2, 6], 'out'], [7.6, [-62, -52], 'back'], [7.8, [-58, -50], 'io'], [7.95, [-56, -50]]])
      TL = [-22, 32]
    } else if (t < 8.75) {
      handR = 'FIST'
      handL = 'FIST'
      const up = [-34, -40]
      const slamR = mk(132, 36)
      const slamL = mk(162, 30)
      TR = K(t, [[8.0, up], [8.07, slamR, 'in'], [8.75, slamR]])
      TL = K(t, [[8.0, [-14, -40]], [8.07, slamL, 'in'], [8.75, slamL]])
    } else if (t < 14.3) {
      handR = 'POINT'
      const jab = Math.max(0, ...[9.9, 11.0, 12.2, 13.3].map(j => pulse(t, j, 0.25)))
      const base = K(t, [[8.75, [-44, -22]], [9.3, [-54, -46], 'out']])
      TR = [base[0] - 6 * jab, base[1] - 6 * jab]
      TL = K(t, [[8.75, mk(250, 96)], [9.3, [-30, 26], 'out']])
    } else if (t < 16.1) {
      handR = 'OPEN'
      handL = 'OPEN'
      const k = ramp(t, 14.3, 14.7, 'out')
      const trem = t > 14.8 && t < 16 ? Math.sin(t * 2 * Math.PI * 7) * 1.2 : 0
      TR = [lerp(-54, -50, k) + 0, lerp(-46, -34, k) + trem]
      TL = [lerp(-30, -28, k), lerp(26, -30, k) - trem]
    } else if (t < 18.1) {
      handR = td < 16.45 ? 'OPEN' : 'GRIP'
      handL = 'FIST'
      TR = K(t, [[16.1, [-50, -34]], [16.45, collar, 'out'], [18.1, collar]])
      TL = [-24, 28]
    } else {
      handR = 'GRIP'
      handL = 'FIST'
      TR = collar
      TL = [-20, 30]
    }
    // the torso rotates about the hip; arms are children of the torso, so counter-rotate the targets into its frame
    const unrot = p => rotp(p, -torsoR)
    const aR = arm('R', sh('shoulder_R'), unrot(TR), 'down')
    const aL = arm('L', sh('shoulder_L'), unrot(TL), 'back')

    const armNode = (side, a, hand, tag) => {
      const U = 'F_ARM_UPPER_' + side
      const F = 'F_FOREARM_' + side
      const S = sh(side === 'R' ? 'shoulder_R' : 'shoulder_L')
      const el = J(U, 'elbow')
      const wr = J(F, 'wrist')
      const handName = `F_HAND_${side}_${hand}`
      const align = hand === 'POINT' ? 0 : hand === 'OPEN' ? (tag === 'R' ? -4 : 4) : 0
      return N(`arm${side}`, { x: S[0], y: S[1], r: a.rU, part: U }, [
        N(`fore${side}`, { x: el[0], y: el[1], r: a.rF - a.rU, part: F }, [N(`hand${side}`, { x: wr[0], y: wr[1], r: align, part: handName })]),
      ])
    }

    // ---- head and face
    const hk = headKind(td)
    const nod = (t > 8.75 && t < 14.3 ? Math.max(0, ...[9.9, 11.0, 12.2, 13.3].map(j => pulse(t, j, 0.25))) * 3 : 0) + pulse(t, 8.05, 0.3) * -4
    const headR = (hk === 'FWD' ? -3 : hk === 'UP' ? 0 : 3) + nod + (t >= 18.1 ? K(t, [[18.1, 0], [18.5, 3, 'out']]) : 0)
    const HN = `F_HEAD_${hk}`
    const fp = FACE[hk]
    const ms = mouthAt(td)
    const eyes = blinkAt(td) ? 'BLINK' : td >= 8.0 && td < 8.75 ? 'GLARE' : td >= 18.1 ? 'GLARE' : 'NEUTRAL'
    const headKids = fp
      ? [
          N('mouth', { x: fp.mouth[0], y: fp.mouth[1] - 0, part: `F_MOUTH_${{ C: 'CLOSED', M: 'MID', O: 'OPEN', S: 'SHOUT' }[ms]}_S` }),
          N('eyes', { x: fp.eyes[0], y: fp.eyes[1], part: `F_EYES_${eyes}_S` }),
        ]
      : []
    // head pivot is the neck joint of the head part; the neck joint of the torso is `neck`
    const headNode = N('head', { x: neck[0], y: neck[1] + (hk === 'DOWN' ? 1 : 0), r: headR, part: HN }, headKids.map(k => ({ ...k, x: k.x - R[HN].pivot[0], y: k.y - R[HN].pivot[1] })))

    // ---- cloak (behind everything), pinned at the neck, swaying
    const cl = td >= 7.55 && td < 7.8 ? 'LIFTED' : inW(td, [[8.05, 8.3]]) ? 'WHIPPED' : inW(td, [[8.3, 8.7], [14.45, 15.0]]) ? 'LIFTED' : 'HANGING'
    const sway = 1.5 * Math.sin(t * 2 * Math.PI * 0.7) + (cl === 'HANGING' ? 0 : 0)
    const cloak = N('cloak', { x: neck[0] + 9, y: neck[1] + 1, r: sway, part: `F_CLOAK_${cl}` })

    const legs = N('legs', { x: 0, y: 0, part: 'F_LEGS_KNEEL' })
    const torso = N('torso', { r: torsoR, sy: breathe, part: TOR }, [armNode('L', aL, handL, 'L'), headNode, armNode('R', aR, handR, 'R')])
    return N('omni', { x: hipX, y: hipY, sx: -1 }, [cloak, legs, torso])
  }

  const mark = t => {
    const m = markXf(t)
    const td = dq(t)
    const lifted = td >= 18.1
    const blink = td >= 17.3 && td < 17.6
    const head = lifted ? 'S_HEAD_LIFTED' : blink ? 'S_HEAD_BLINK' : 'S_HEAD_HALF'
    const neck = [147 - 82, 13 - 16]
    const hp = R[head].pivot
    return N('mark', { x: m.pos[0], y: m.pos[1], r: m.rot, sy: 1 + 0.01 * Math.sin(t * 2.2) }, [
      N('mbody', { part: 'S_LYING', x: 0, y: 0 }),
      N('mhead', { x: neck[0] - 3, y: neck[1] + 1, r: lifted ? K(t, [[18.1, 0], [18.5, -9, 'out']]) : 0, part: head }),
    ])
  }

  // ---------------------------------------------------------------- FX
  const debris = (t, t0, x0, y0, n, spread, up) => {
    const out = []
    for (let i = 0; i < n; i++) {
      const tt = t - t0
      if (tt < 0 || tt > 0.7) continue
      const h = hash(i + t0 * 7)
      const vx = (i / (n - 1) - 0.5) * 2 * spread + (h - 0.5) * 20
      const vy = -up * (0.7 + hash(i * 3.1 + t0) * 0.6)
      const x = x0 + vx * tt
      const y = y0 + vy * tt + 0.5 * 260 * tt * tt
      out.push(N(`deb${t0}_${i}`, { x, y, r: tt * (240 + 120 * h) * (i % 2 ? 1 : -1), a: tt > 0.55 ? 1 - (tt - 0.55) / 0.15 : 1, part: `FX_DEBRIS_${(i % 8) + 1}` }))
    }
    return out
  }
  const dust = (t, t0, x, y, flip = 1) => {
    const f = Math.floor((t - t0) * 12)
    if (f < 0 || f > 3) return []
    return [N(`dust${t0}`, { x, y, sx: flip, a: f === 3 ? 0.8 : 1, part: `FX_DUST_${f + 1}` })]
  }
  const shock = (t, t0, x, y) => {
    const f = Math.floor((t - t0) * 20)
    if (f < 0 || f > 3) return []
    return [N(`shock${t0}`, { x, y, a: f === 3 ? 0.5 : 1, part: `FX_SHOCK_${Math.min(f + 1, 3)}` })]
  }
  const drip = (t, t0, x, y, fall = 24) => {
    // bead -> stretch -> drop (falls) -> splash, 0.9 s
    const u = t - t0
    if (u < 0 || u > 1.0) return []
    if (u < 0.2) return [N(`drip${t0}`, { x, y, part: 'FX_BLOOD_BEAD' })]
    if (u < 0.4) return [N(`drip${t0}`, { x, y, part: 'FX_BLOOD_STRETCH' })]
    if (u < 0.8) return [N(`drip${t0}`, { x, y: y + ((u - 0.4) / 0.4) * fall, part: 'FX_BLOOD_DROP' })]
    return [N(`drip${t0}`, { x, y: y + fall, a: 1 - (u - 0.8) / 0.2, part: 'FX_BLOOD_SPLASH' })]
  }

  // ---------------------------------------------------------------- camera
  const cam = t => {
    // pushes in just ahead of the first shake, so a jolt never shows the edge of the picture
    const s = K(t, [[7.2, 1.0], [7.95, 1.0], [8.1, 1.04, 'out'], [14.3, 1.07], [16.1, 1.07], [18.1, 1.08], [19.65, 1.13, 'in2']])
    const c = K(t, [[7.2, [176, 92]], [8.0, [176, 92]], [8.75, [196, 90], 'out2'], [14.3, [208, 88]], [18.1, [216, 84], 'io'], [19.65, [222, 76], 'in2']])
    return { cx: clamp(c[0], 160 / s + 4, 320 - 160 / s - 4), cy: clamp(c[1], 90 / s + 3, 180 - 90 / s - 3), s, rot: 0 }
  }
  const SHAKE = [[8.05, 0.2, 3], [8.25, 0.15, 1], [14.5, 0.1, 1]]
  const shake = t => {
    let x = 0
    let y = 0
    for (const [t0, d, px] of SHAKE) {
      if (t < t0 || t >= t0 + d) continue
      const i = Math.floor((t - t0) * 30)
      const fade = 1 - (t - t0) / d
      x += (i % 2 ? -1 : 1) * px * fade
      y += (i % 2 ? 0.5 : -0.5) * px * fade
    }
    return [x, y]
  }

  // ---------------------------------------------------------------- the wide shot
  const wide = t => {
    const SR = markPt(8.07, 132, 36)
    const SL = markPt(8.07, 162, 30)
    const motes = N('motes', { x: 160 - ((t * 5) % 222) + 110, y: 100, a: 0.7, part: 'FX_MOTES' })
    const motes2 = lite ? null : N('motes2', { x: 330 - ((t * 3.4 + 90) % 330), y: 52, a: 0.5, part: 'FX_MOTES' })
    const fxBack = [
      ...(t >= 8.2 ? [N('splat', { x: (SR[0] + SL[0]) / 2, y: (SR[1] + SL[1]) / 2 + 12, a: t < 8.3 ? 0.6 : 0.95, part: t < 8.3 ? 'FX_BLOOD_SPLAT_1' : 'FX_BLOOD_SPLAT_2' })] : []),
      ...dust(t, 8.08, SR[0], SR[1] + 4),
      ...dust(t, 8.1, SL[0], SL[1] + 4, -1),
      ...dust(t, 16.25, OMNI_HIP[0] - 20, 152),
      ...debris(t, 8.08, (SR[0] + SL[0]) / 2, (SR[1] + SL[1]) / 2, 4, 40, 70),
    ]
    const fxFront = [
      ...shock(t, 8.08, (SR[0] + SL[0]) / 2, (SR[1] + SL[1]) / 2 + 2),
      ...drip(t, 12.0, OMNI_HIP[0] + 31, OMNI_HIP[1] + 20, 14),
      ...drip(t, 13.8, OMNI_HIP[0] + 33, OMNI_HIP[1] + 20, 14),
      ...drip(t, 18.9, OMNI_HIP[0] + 39, OMNI_HIP[1] - 42, 16),
    ]
    return N('world', {}, [
      N('sky', { part: 'ENV_SKY' }),
      N('rocks', { part: 'ENV_ROCKS' }),
      motes,
      mark(t),
      ...fxBack,
      omni(t),
      ...(lite ? [] : [N('fg', { x: 0, y: 180, part: 'ENV_ROCK_FG' })]),
      ...(motes2 ? [motes2] : []),
      ...fxFront,
    ])
  }


  // ---------------------------------------------------------------- the face close-up (19.65 - 24.65)
  const ECU_BUBBLE = 'Every face you love will vanish.'
  const ecuMouth = t => {
    if (t < 19.7) return 'WIDE'
    if (t < 22.6) {
      if (t < 20.0) return 'OPEN'
      const slot = Math.floor((t - 20.0) * 6)
      const chars = [...ECU_BUBBLE.toLowerCase().replace(/[^a-z .]/g, '')]
      const ch = chars[slot % chars.length]
      if (ch === ' ' || ch === '.') return 'CLOSED'
      if (ch === 'a' || ch === 'o') return 'WIDE'
      if ('eiuy'.includes(ch)) return 'OPEN'
      return 'bmp'.includes(ch) ? 'CLOSED' : slot % 2 ? 'MID' : 'CLOSED'
    }
    if (t < 23.1) return 'CLOSED'
    if (t < 23.3) return 'MID'
    if (t < 23.6) return t < 23.45 ? 'WIDE' : 'SNARL'
    if (t < 24.0) return 'OPEN'
    return 'GRITTED'
  }
  const ecu = t0_ => {
    const t = dq(t0_)
    const peak = (t >= 19.7 && t < 20.1) || (t >= 23.3 && t < 23.75)
    const useB = peak && !lite
    const sfx = useB ? '_onB' : ''
    const base = useB ? 'F_ECU_BASE_B' : 'F_ECU_BASE_A'
    const bp = R[base].pivot
    const mouth = ecuMouth(t)
    const open = mouth === 'OPEN' || mouth === 'WIDE'
    let eyes = t < 19.7 ? 'WIDE' : t >= 24.0 ? 'SQUINT' : t >= 23.3 && t < 23.75 ? 'WIDE' : 'GLARE'
    if (t >= 22.7 && t < 22.7 + 3 / 24) eyes = t < 22.7 + 1 / 24 || t >= 22.7 + 2 / 24 ? 'SQUINT' : 'BLINK'
    if (t >= 19.7 && t < 19.9) eyes = 'WIDE'
    const at = nm => R[nm].anchor
    const patch = (id, nm) => {
      const a = at(nm)
      const p = R[nm]
      return N(id, { x: a[0] - bp[0] + p.pivot[0], y: a[1] - bp[1] + p.pivot[1], part: nm })
    }
    const kids = [patch('emouth', `F_ECU_MOUTH_${mouth}${sfx}`), patch('eeyes', `F_ECU_EYES_${eyes}${sfx}`)]
    if (!useB && t >= 22.75 && t < 22.95) kids.push(patch('enos', 'F_ECU_FX_NOSTRIL'))
    // brow trickle: slides 6 px over 2.5 s, longer as it runs
    const tr = clamp((t0_ - 19.65) / 2.5, 0, 1)
    const trLen = t < 20.6 ? 1 : t < 22.2 ? 2 : 3
    kids.push(N('etrickle', { x: (useB ? 97 : 91) - bp[0], y: (useB ? 22 : 24) - bp[1] + 6 * Math.min(1, tr) + (t > 24 ? 3 : 0), part: `F_ECU_FX_TRICKLE_${trLen}` }))
    // sweat bead on the temple from 22.6
    if (t >= 22.6) kids.push(N('esweat', { x: 206 - bp[0], y: 62 - bp[1] + (t0_ - 22.6) * 22, part: t < 23.3 ? 'F_ECU_FX_SWEAT_1' : 'F_ECU_FX_SWEAT_2' }))
    // spittle
    const sp = [[19.75, 0], [23.32, 1]]
    for (const [s0, k] of sp) {
      const f = Math.floor((t - s0) * 24)
      if (f >= 0 && f < 4) kids.push(N(`espit${k}`, { x: 150 - bp[0] + (f * 9) * (k ? -1 : 1) + (k ? -26 : 26), y: 130 - bp[1] + f * 4, a: 1 - f * 0.18, part: `F_ECU_FX_SPIT_${f + 1}` }))
    }
    const jitter = open && t < 22.6 ? Math.sin(t0_ * 2 * Math.PI * 8) * 1 : 0
    const trem = t >= 24.0 ? Math.sin(t0_ * 2 * Math.PI * 10) * 1 : 0
    const sc = 1.05 + (lite && peak ? 0.05 : 0)
    return N('ecu', { x: 160 + trem, y: 183 + jitter, r: lite && peak ? -5 : -3, sx: sc, sy: sc }, [N('eface', { part: base }, kids)])
  }
  const camE = t => {
    const s = K(t, [[19.65, 1.0], [22.6, 1.04], [23.1, 1.045], [23.3, 1.05], [24.0, 1.06], [24.65, 1.07]])
    return { cx: 160, cy: 90, s, rot: 0 }
  }
  const SHAKE_E = [[19.7, 0.15, 2], [23.3, 0.15, 2]]
  const shakeE = t => {
    let x = 0
    let y = 0
    for (const [t0, d, px] of SHAKE_E) {
      if (t < t0 || t >= t0 + d) continue
      const i = Math.floor((t - t0) * 30)
      const fade = 1 - (t - t0) / d
      x += (i % 2 ? -1 : 1) * px * fade
      y += (i % 2 ? 0.5 : -0.5) * px * fade
    }
    return [x, y]
  }

  return function scene(t) {
    if (t >= TCUT) return { sec: 'E', cam: camE(t), shake: shakeE(t), bg: '#4A2530', root: N('world', {}, [ecu(t)]) }
    return { sec: 'W', cam: cam(t), shake: shake(t), root: wide(t) }
  }
}
