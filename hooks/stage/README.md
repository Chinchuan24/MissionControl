# hooks/stage: the shared motion engine

One toolkit for every skin's acts, fights and idle motion. **Tools, not looks**: no colour, pose or effect here belongs
to a skin. Your skin keeps its own signature; you build it from these parts.

👉 Start from the worked example: `demo.test.ts` (`demoAct`). It uses every piece below in one 4 s act, 15 k chars.

## How it all stays smooth (read this first)

The desktop draws each `Svg` **as an image**. A new source is a new image, and its animations start from zero.
So every piece follows one contract:

- One act = **one duration**. Every keyframe is a **percent** of it.
- Every delay is the act's **pinned start**: `pin(at)` (`hooks/smooth.ts`). `steady`/`phased` turn it into "seconds since
  this image began". A redraw in the middle of an act draws the act **at the right moment**. It never restarts.
- Endless loops (`infinite`) are phase-shifted by `phased`, so idle motion never jumps on a redraw.
- Never put per-second data in a source. Use `liveText` / `liveWidth`.

## The pieces

| File | What |
|---|---|
| `timeline.ts` | `Act`: the one act runner (tracks, cues, actors, freeze, still frame) |
| `frames.ts` | Pixel `Sprite` to rect paths, palette quantise, `FrameBank` (<defs> cache), swap rows, `flipbook` idle loop |
| `ease.ts` | Named curves: `snap`, `settle`, `overshoot`, `anticipate`, `whip` (+ `steps`, `curve`) |
| `fx.ts` | Seeded particles: `star3`, `flash`, `puff`, `confetti`, `ring`, `speedLines`, `smoke`, `dust`, `sparks`, `debris`, `koStars` |
| `camera.ts` | `Camera`: shake tiers 1–4, `push` (zoom about a point), `pan`, `reset`, `grade` (filters), `freeze` |
| `light.ts` | `sweep` (glint), `rim` (lit edge), `flicker`, `godRay`, `clipTo` (a silhouette clip) |
| `motion.ts` | Reduced motion: `pair` (anim/still), `stop`, `hide`, `reduced` |
| `budget.ts` | Limits, per-effect `BUDGET`, `chars`, `audit` (`dupes`, `badText`, `dupeIds`), `esc`, `doc` |

### timeline: `Act`

```ts
import { Act } from './stage/timeline'
const act = new Act({ id: 'boys-t7-band', ms: 6000, at: startAt, W, H })  // id: unique per act AND surface
act.cast('M1', SP.M1, 0.45).cast('M3', SP.M3, 0.4)                          // poses (Sprite), ax = where the body stands
let body = ''
body += act.actor('hero', [[0, 1, 'M1'], [1, 1.6, 'M3']], [[0, 20, 60], [1, 120, 60]], { sc: 2, ghosts: [1, 1.4] })
body += act.mv(caption, [[0, -200, 10], [0.4, 12, 10]], { ease: 'settle' })   // move along keys
body += act.on(sign, 1.2, 3)                                                   // shown from 1.2 s to 3 s
body += act.slam(stamp, 2, 4)                                                  // title card slam
body += act.kf(prop, [[0, 'opacity:0'], [1, 'opacity:1']], { c: true })      // any keyframes
body += act.win(1, 1.5, speed)                                                 // a cue: shown in a window
act.freeze(1.0, 0.07)                                                          // hit-freeze: paths hold, later times shift
const layer = act.done(body, act.still('M3', 120, 60, 1, 2))                   // still = the reduced-motion frame
```

- **Tracks** (`kf`, `mv`, `on`, `slam`, `actor`) = one keyframes block each (~100–300 chars).
- **Cues** (`cue`, `win`, all of `fx`) = a shared class + `--t` (~40 chars). Use cues for anything short.
- `off`: a surface that starts later on a shared timeline (band cut, then pane cards): `new Act({ ..., ms: total, off: 4.4 })`.
- `done()` wraps the layer in `<!--dl-->` markers (for a theme's pane reserve), carries its own `<style>` and `<defs>`.
- `freeze` holds numeric paths (`mv`, actors, camera). A `kf` row spanning a freeze is only shifted: add a row at the freeze if it must hold.

### frames

```ts
import { FrameBank, flipbook, rectPaths } from './stage/frames'
const bank = new FrameBank('crw', 6).add('idle', SP.A).add('blink', SP.B)
const idle = flipbook(bank, 'crwb', ['idle', 'idle', 'idle', 'blink'], x, y, 0.6)  // idle loop, steps(1)
svg = `<style>${idle.css}</style><defs>${bank.defs()}</defs>${idle.svg}`
```
A pose costs ~2.6 chars per pixel of its box at K=8, **once per Svg**; every reuse is a `<use>` (~90 chars).
`rectPaths` is the same cutter THE FIGHT uses (Invincible now imports it from here).
**No PNG frames**: not proven to survive the host (see `skins-audit/probe.md`). Rect paths only.

### ease

`ease('settle')` gives the CSS. `curve('overshoot')(u)` evaluates one in JS (to sample a path).
snap = lands hard · settle = glides to rest · overshoot = passes and springs back · anticipate = pulls back first · whip = slow-FAST-slow.

### fx

```ts
import * as fx from './stage/fx'
body += fx.star3(act, 1.0, x, y, 18, { core: '#FFF', star: '#FFE066', ring: '#9FE8FF', ink: INK })
body += fx.flash(act, 1.0, { a: 0.35 })        // keep big flashes rare, opacity <= .5
body += fx.confetti(act, 2.3, x, y, { n: 8, seed: 'krak', colors: [...] })
body += fx.smoke(act, 2, x, y, { seed: 's1', n: 3 })
body += fx.koStars(act, 2, 3.5, x, y - 30, { color: GOLD, s: 1.5 })
```
Every particle takes a `seed`: same seed, same burst on every redraw. All colours are parameters (neutral defaults).

### camera

```ts
import { Camera } from './stage/camera'
const cam = new Camera(act)
cam.push(0.7, 0.95, 1.15, cx, cy, 'snap').shake(1.0, 3, 0.22).grade(1, 1.5, 'contrast(1.3)').reset(2, 2.5)
const panel = root + cam.wrap(content) + '</svg>'    // grade > move > shake, nested; self-contained <style>
```
Already have a wrapper (like `overlay.ts` `shakeInto`)? Use `cam.shakeStyle()` (valid longhands).
Shake 1–4 px only, inside acts only. Grades are filters: acts only, never at rest.

### light

```ts
import * as light from './stage/light'
const clip = light.clipTo(act.bank, 'M1', 'heroClip', x, y, 1, 2)
const glint = light.sweep({ id: 'gl', x, y, w: 60, h: 80, clip: 'heroClip', act, t0: 2.1, t1: 3.1 })   // once, in an act
const idle = light.sweep({ id: 'gl2', x, y, w, h, period: 4, pass: 0.3 })                              // idle loop, steps
const rim = light.rim(act.bank, 'M1', x, y, { id: 'rim', color: COOL, dx: -1, sc: 2 })                // lit from the left
const tube = light.flicker('tube', { seed: 'neon' })    // CSS; put class="tube" on the lit group
const ray = light.godRay({ id: 'ray', x, y: 0, len: H, spread: 90, pulse: 4 })
```
Every light is gradients, clips, masks and opacity. No blend modes.

### motion (reduced motion)

`pair('zz')` gives `anim()`, `still()` and one CSS line. `stop('a','b')` stops classes dead (their attributes are the still
pose). `hide('fx')` hides them. An `Act` does this for you: `done(body, still)`.

### budget

```ts
import { audit, BUDGET, fits } from './stage/budget'
const a = audit(svg)   // { chars, dupes, badText, dupeIds, reduced }
expect(a.dupes).toEqual([]); expect(a.chars).toBeLessThan(BUDGET.fightAct.card)
```
`chars` counts what the desktop receives (after `compact`).

## Budgets (chars, from `budget.ts`)

| Effect | Band | Per pane card |
|---|---|---|
| Idle loop per sprite | 1.5 k | 1.5 k |
| Card entrance / state change | 1 k | 1 k |
| Light pass | 1.5 k | 1.5 k |
| Parallax backdrop | 8 k | 6 k |
| Voxel extrusion (per sprite) | 1 k | 1 k |
| Turnaround strip | 12 k (6 views) | 20 k (8 views) |
| Transition / wipe | 8 k | 5 k (30 k all cards) |
| Fight band cut | 32 k, ≤ 8–10 poses | — |
| Fight act | — | 36 k, ≤ 10 poses (100 k all acts) |
| **All motion at once** | 70 k (lite at 120 k) | the theme's reserve |

Hard limits: 131,072 chars per Svg (else blank), 262,144 per drawing (aim ≤ 220,000). Chars, not gzip.
**Unique poses are the cost**; duration is almost free. One big act at a time.

## Do

- Go through `Act` (or `pin`/`phased`) for every timed thing.
- Give every animated piece a still frame. Test it.
- Use cues for short bursts; tracks only for what moves the whole act.
- Seed every random thing.
- Escape all text (`esc`). Run `audit()` on every layer in a test.
- Idle loops: `steps()` at low rates. Probe: a 60 fps sweep costs ~4–8× a 12 fps stepped one (`probe.md`).
- Keep motion off the working numbers (%, cost, context, timers). Band acts sit on the scrim.
- One id per act and surface: two acts in one Svg need two ids.

## Don't

- Don't hand-roll a second timeline, easing or particle system in a skin. Missing something? Add it here, small commit.
- Don't use `mix-blend-mode` (flat colour under any opacity/filter/clip/animated parent; never blends with the app).
- Don't use PNG `<image>` frames, `<foreignObject>`, script or `on*` attributes.
- Don't rely on CSS 3D (`perspective()`, `rotateY`): not proven in the host. Fake depth in 2D (flip `scaleX`, skew, parallax, light).
- Don't animate filters (`feTurbulence`, blur, grades) at rest: acts only.
- Don't write `animation:` shorthand glued to a delay list (see `skins-audit/HANDOFF-engine.md`, trap 1).
- Don't copy another skin's signature effect in new colours.
