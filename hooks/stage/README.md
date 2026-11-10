# hooks/stage: the shared motion engine

One toolkit for every skin's acts, fights and idle motion. **Tools, not looks**: no colour, pose or effect here belongs
to a skin. Your skin keeps its own signature; you build it from these parts.

👉 Start from the worked examples: `demo.test.ts` (`demoAct`, every part-1 piece in one 4 s act, 15 k chars) and
`choreo-inv.test.ts` (a real fight written as beats). Tests for each piece: `pieces.test.ts`, `kit.test.ts`.

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
| `wipe.ts` | Transitions: `clip` wipe, slit `bar`, `iris`, `titleCard` slam, `shards`; the generic **`skinSwitch`** (+ `into`, `sizeOf`) |
| `parallax.ts` | 2-4 layer backdrop, each layer one `<pattern>` drifting in steps |
| `turntable.ts` | "3D": `turntable` (8-view turnaround), `spin` (views as act windows), `voxel` (extruded sprite), `flip` / `tilt` (2D card) |
| `director.ts` | ONE scheduler for rare events: lanes of seeded slots, priority, breath, held windows, working-only, daily, replays |
| `replay.ts` | The shared `/missioncontrol play <name>` registry: every skin's fights (and acts worth replaying) by name |
| `choreo.ts` | The fight choreographer: a beat language compiled to an `Act` + `fx` + `Camera`; `fightLane` for the director |

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

### wipe (transitions) and the skin switch

```ts
import * as wipe from './stage/wipe'
body += wipe.clip(act, 0, 0.5, veil, { dir: 'r', mode: 'out' })       // veil wipes away to the right ('in' wipes on)
body += wipe.bar(act, 0, 0.5, { dir: 'r', color: ACCENT })             // a hot bar rides the edge (same times + `ease`, default 'whip')
body += wipe.iris(act, 0.2, 0.7, { cx: 40, cy: H / 2, mode: 'in' })     // a round hole opens on the scene ('out' closes)
body += wipe.titleCard(act, 0.3, 1.6, { text: 'ROUND 2', x: W / 2, y: H / 2, size: 28, fill: GOLD, ink: INK })  // escaped
body += wipe.shards(act, 0.1, { n: 8, seed: 'cut', colors: [A, B], mode: 'in' })
```
All act-bound (pinned, part of the act's still pair). No blend modes (ER2's hue veil cannot live inside an act).

**The skin switch** (`skinSwitch`) is already wired: `/skin <name>` and the skin picker play it on the band and the top
4 pane cards (cascading 60 ms apart), 0.7 s, pinned to the switch. Default = a see-through veil of the NEW skin's ground
(`SWITCH_VEIL`, .55: the working numbers stay readable through it) wipes off the new panel ('settle': it moves at once),
with a bar in its accent and a few shards; only the new skin's colours (GENE stays grey). Reduced motion: a 2 px accent rule.
Keep a flavour's `veil` at .6 or under: a full cover reads as a blank panel and hides the numbers.
It skips itself while a big act is drawn (`<!--dl-->` in the source), while a theme keeps a fight's pane reserve, and on a
band above 60 k. Typed unlocks with their own transition (CAPRI, SOLID GOLD, NOIR, Heisenberg, the era swap) never set it.
Your skin's flavour (to wire in `register.tsx` `switchBand`/`switchTree` when you need it):
```ts
skinSwitch({ W, H, at, surface: 'band', from, to, flavour: { dir: 'd', ms: 600, bar: false, shards: 0, extra: (act, s) => wipe.titleCard(act, .1, .5, { text: 'NEW', x, y }) } })
```

### parallax

```ts
import { parallax } from './stage/parallax'
const sky = parallax({ id: 'cpsky', W, H, fps: 8, layers: [
  { tile: farTowers, w: 160, speed: 2, op: 0.5 },     // px per second, drifts left (negative: right)
  { tile: nearTowers, w: 220, speed: 6, y: 10 },
  { tile: rain, w: 64, speed: 0, dy: 40, h: 64 },      // vertical drift (rain, snow, bubbles)
] })
svg = `<style>${sky.css}</style>${sky.svg}`            // a 3-layer skyline + rain: ~1.4 k
```
Each layer = one `<pattern>` + one rect sliding one repeat per loop, `steps()` at <= `fps` (max 12): idle-safe, phased,
still under reduced motion. Tiles repeat: make them seamless. Max 4 layers.

### turntable, voxel, flip, tilt ("3D" without 3D)

```ts
import { turntable, turnViews, spin, voxel, flip, tilt } from './stage/turntable'
const bank = new FrameBank('shd', 5); SHIELD.forEach((sp, i) => bank.add(`v${i}`, sp))
// A prop turning in place: 2.4 s a turn, clockwise, view 0 under reduced motion, a shadow that narrows edge-on.
const t = turntable(bank, { id: 'shT', views: ['v0','v1','v2','v3','v4'], mirror: true, x, y, sc: 2, period: 2.4, dir: 1, still: 0,
  shadow: { rx: 30, dy: 44, widths: [1, .75, .3, .75, 1, .75, .3, .75] } })
svg = `<style>${t.css}</style><defs>${bank.defs()}</defs>${t.svg}`
// The same views thrown end over end in an act:
body += act.actor('shield', spin(turnViews(['v0','v1','v2','v3','v4'], true), 1.2, 2.0, 0.4), [[1.2, x0, y], [2.0, x1, y]])
svg += voxel(bank, 'crate', x, y, { side: '#6A4A2A', depth: 4, sc: 4 })      // 3-4 darker silhouettes behind, 1 px apart
const card = flip({ id: 'qf', x, y, w, h, front, back, period: 8 })          // or { act, t } to flip once in an act
const sway = tilt({ id: 'qt', x, y, w, h, svg: box, deg: 4, glare: '#FFF' })
```
- **8 views from 5**: a symmetric object needs only 0-180 degrees; `mirror: true` flips 3-1 for the far side (-31% chars).
  The Boys' shield: 10.7 k for 8 views, **7.4 k** for 5 + mirror (K=5, sc 2).
- Views are rect-path frames (`FrameBank`), toggled by one `steps(1)` loop: as cheap at rest as a blink.
- `dir: -1` turns the other way; `period: 0` draws the still view only.

### director (rare events)

```ts
import { Director, cadence, localOffsetMs, perWindow } from './stage/director'
import { fightLane } from './stage/choreo'
const dir = new Director('boys', { dayOffsetMs: localOffsetMs(Date.now()) })   // same seed = same schedule on every redraw
fightLane(dir, [{ id: 'offthebooks', ms: 9000 }, { id: 'reunion', ms: 11000, replay: 'reunion' }])  // 30-45 min, working only, in turns
dir.lane('piece', { daily: [9, 18] }).add('piece', { id: 'billboard', ms: 7000, replay: 'billboard' })   // once a day, 9-18 h
dir.lane('roam', { gap: 'sometimes', chance: 0.65 }).add('roam', { id: 'r-hughie', ms: 6000, weight: 30 }).add('roam', { id: 'r-noir', ms: 5000, weight: 7 })
const now = dir.at(at, { working, held: typed ? [typed] : [] }, AHEAD_MS)   // { lane, id, startAt, endAt, src } | undefined
const replay = dir.play('reunion', at)                                     // a bit from now: store it as your typed act (see replay below)
```
- **Lanes in priority order** (first added wins). A lower lane's slot near a higher lane's slot is DROPPED (never moved).
- **Breath**: 10 s between two acts (fights: 20 s). **held** windows (a typed act, a mode swap) beat every lane.
- **Rarity words** (`RARITY`, minutes between two hits): often 2-4, sometimes 6-10, uncommon 12-20, rare 30-45, fight 30-45, epic 60-120.
- Pure: `plan(t0, t1, ctx)` lists every act; `next(t, ctx, lane)` finds the next one; tests can count a simulated day.
- `dayOffsetMs` is east positive (`localOffsetMs(at)`). Never pass `getTimezoneOffset()` raw: it is minutes, west positive.
- Higher lanes beat lower ones by their RAW slots (whatever the context): a roamer near a working-only fight slot is dropped
  even at rest, so the schedule never reshuffles when a job starts or stops.
- **Keeping your own scheduler?** Use the helpers: `perWindow(everyMin)` = a roamer's chance per 30 s window (Jesse, Mike, Capri
  use it now), `cadence('rare')` = slot + jitter for your own slots (The Boys' AMBUSH uses it now: 30-45 min).
- **Migrating a skin** (not done yet for any skin's whole schedule): register each roamer / set piece / fight as a bit with
  its length, call `dir.at()` where your `stageAt`/`fightDue` was, keep your typed acts as `held`, keep the old function
  behind it for one release and test that the hit counts per simulated day match the audit's numbers.

### replay (`/missioncontrol play <name>`)

```ts
import { playsFrom, registerPlay } from './stage/replay'
// Every director bit with a replay name (fightLane names every fight), offered while any of these skins is worn:
playsFrom(['the-boys', 'solidgold', 'noir'], dir, s => { MY_TYPED = s }, n => `fight: ${n}`)
// Or one act by hand. `run` stores it as your typed act, pinned to `at`; return a string to answer with it instead.
registerPlay('cyberpunk-2077', { name: 'maxtac', what: 'the MaxTac raid', run: at => { MY_TYPED = { kind: 'maxtac', at } } })
```
- Register at module load, keyed by the skin ids it plays on (`SKIN.id`). The command asks this registry first, then
  redraws both panels (your act is drawn from the typed act you stored, as when it is typed: pinned, resumes on redraw).
- The Boys (`theboys-eggs.ts` `REPLAYS`, 90+ names) and Invincible (`INV_REPLAYS`, 8) keep their own older lists; their
  "Play which?" lists also name what is registered here. New fights go here, not into those lists.
- Names: lower case letters, digits and dashes. Test your play with `runPlay(skin, name, at)` in a unit test: the plugin
  runs in its own module graph, so a test cannot register into a mounted engine.

### choreo (fights)

```ts
import { Fight } from './stage/choreo'
const act = new Act({ id: 'boys-f2-band', ms: 6000, at, W, H }); act.cast('bIdle', SP.B1).cast('bPunch', SP.B2) /* ... */
const cam = new Camera(act)
const f = new Fight(act, { sc: 2, ink: INK, star: { core: '#FFF', star: GOLD, ring: CYAN }, word: GOLD }, cam)
f.fighter('b', 'bIdle', 60, gy).fighter('h', 'hIdle', 300, gy, -1)
f.stare('b', 'h', 0.8).say('h', 'WELL WELL', 0.6)                      // stand-off: stare, step, flinch, backdown, say
 .approach('b', 220, 0.4, { pose: 'bRun' }).strike('b', 'h', { pose: 'bPunch' })   // strike adds a SMEAR frame
 .hit('h', { pose: 'hHit', word: 'POW', flash: .35, shake: 3, freeze: .08, impact: true })  // star, sparks, HIT-STOP, IMPACT FRAME
 .knockback('h', 90, { pose: 'hFly', rot: 360, land: 'crash', landPose: 'hDown' }).exit('b', { d: .5 })
const layer = act.done(f.body(), f.still())        // still = the last clash; panel = cam.wrap(content)
```
- Beats run on a cursor in time order: moves advance it (`approach`, `strike`, `knockback`, `throw`, `exit`, `step`,
  `backdown`, `stare`), instants happen at it (`hit`, `freeze`, `impact`, `smear`, `sfx`, `say`, `pose`). `at(t)`, `wait(s)`,
  `with()` (the next move alongside the last).
- **Hit-stop** (`freeze`), **smear** and **impact frames** are first-class beats. A turning move lands upright on its own.
- Proof: `choreo-inv.test.ts` writes Invincible's "The Catch" as 20 beats: same poses in the same order, the same hits at
  2.0 and 3.0 s, 35.1 k (budget 36 k). Previews: `scratchpad/motion/prev/engine2/demo-catch-*.png` (beats left, original right).
- **Fights are rare**: put them in the director with `fightLane` (one per 30-45 min, working only); it names each fight
  (its `replay`, else its id). Offer them with `playsFrom` (see replay).
  PG-13: stars, flashes, dust; never blood.

## Budgets (chars, from `budget.ts`)

| Effect | Band | Per pane card |
|---|---|---|
| Idle loop per sprite | 1.5 k | 1.5 k |
| Card entrance / state change | 1 k | 1 k |
| Light pass | 1.5 k | 1.5 k |
| Parallax backdrop (3 layers: ~1.4 k) | 8 k | 6 k |
| Voxel extrusion (per sprite) | 1 k | 1 k |
| Turnaround strip (shield 5+mirror: 7.4 k) | 12 k (6 views) | 20 k (8 views) |
| Transition / wipe (skin switch: 3.7 k band, ~1.5-2.5 k a card) | 8 k | 5 k (30 k all cards) |
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
- Schedule every rare thing through the director (or its `perWindow`/`cadence` helpers). Fights: one per 30-45 min.
- Give every fight a replay name in `replay.ts` (`playsFrom` does it for a director).
- Give every hidden skin its own secret id (`withFound(c, id)` in `extras.ts`; `credFor` lights only that skin's badge).

## Don't

- Don't hand-roll a second timeline, easing or particle system in a skin. Missing something? Add it here, small commit.
- Don't use `mix-blend-mode` (flat colour under any opacity/filter/clip/animated parent; never blends with the app).
- Don't use PNG `<image>` frames, `<foreignObject>`, script or `on*` attributes.
- Don't rely on CSS 3D (`perspective()`, `rotateY`): not proven in the host. Fake depth in 2D (flip `scaleX`, skew, parallax, light).
- Don't animate filters (`feTurbulence`, blur, grades) at rest: acts only.
- Don't write `animation:` shorthand glued to a delay list (see `skins-audit/HANDOFF-engine.md`, trap 1).
- Don't copy another skin's signature effect in new colours.
