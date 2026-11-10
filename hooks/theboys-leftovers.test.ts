// The Boys, wave 2 leftovers: the 3D head turn on the mode swap, the living-bust patches (blink, red eyes, smile twitch, scowl,
// smirk), the victory poses on the ON BRAND cheer, F2's once-a-day comeback trigger, and the looks' own skin-switch flavours.
import { expect, test } from 'claude-code/testing'
import { BUST_TURN, PATCH, VICTORY, bustTurn, cheer, figure } from './theboys'
import { boysTheme } from './theboys-theme'
import { COMEBACK_MS, FACE_MS, boysEvent, comebackDue, faceAt, markComeback, resetBoys } from './theboys-eggs'
import { switchFlavour } from './switch-flavours'
import { skinSwitch } from './stage/wipe'
import { audit, chars, doc } from './stage/budget'

const T0 = new Date(2026, 9, 20, 9, 0, 0).getTime()

test('head turn: ON BRAND to OFF BOOK turns the caped leader away and the long-coat man round (and back), stepped, pinned, gone under reduced motion', () => {
  for (const to of ['book', 'brand'] as const) {
    const t = bustTurn(to, T0)
    // Five views in order: the old face front, side, back; the new face back, side (then the real bust).
    const ids = [...t.matchAll(/<use href="#(\w+)"/g)].map(m => (m[1] as string).slice(-2))
    expect(ids).toEqual([...BUST_TURN])
    expect(t).toContain(`calc(@@T${T0}@@ + .1s)`)
    expect(t).toContain('steps(1)')
    expect(t).toMatch(/@media \(prefers-reduced-motion: reduce\)\{\.tb-bt\{animation:none!important\}\}/)
    // Everything starts hidden: under reduced motion only the new bust shows.
    expect((t.match(/class="tb-bt" opacity="0"/g) ?? []).length).toBe(6)
    const a = audit(doc(900, 148, t))
    expect([a.dupes, a.dupeIds, a.badText]).toEqual([[], [], []])
    expect(chars(t)).toBeLessThan(20_000) // a turnaround strip on the band
  }
  // The two directions are different faces.
  expect(bustTurn('book', T0)).not.toBe(bustTurn('brand', T0))
  // Drawn by the theme on the band while the swap plays, never on a card, never in the hidden looks.
  const band = boysTheme('book').extras?.({ W: 900, H: 148, surface: 'band', at: T0 + 300, ctxPct: 10, swapAt: T0, working: true }) ?? ''
  expect(band).toContain('data-egg="bustturn"')
  expect(boysTheme('book').extras?.({ W: 480, H: 200, surface: 'pane', card: 'task', at: T0 + 300, ctxPct: 10, swapAt: T0 }) ?? '').not.toContain('bustturn')
  expect(boysTheme('book').extras?.({ W: 900, H: 148, surface: 'band', at: T0 + 30_000, ctxPct: 10, swapAt: T0 }) ?? '').not.toContain('bustturn')
})

test('living bust: the patches blink in place of the code lids; red eyes on an error, the smile twitch on a dip, the scowl and smirk OFF BOOK', () => {
  resetBoys()
  // The blink is the art's patch (ON BRAND, OFF BOOK); SOLID GOLD and NOIR keep the code lids.
  expect(Object.keys(PATCH).sort()).toEqual(['book', 'brand'])
  const calm = figure('brand', T0)
  expect(calm).toContain('class="tb-lid" data-egg="blink"')
  expect(calm).not.toMatch(/data-egg="(redeyes|smile|scowl|smirk)"/)
  expect(figure('gold', T0)).toContain('fill="#FFF3C4"') // gold's code lid
  // A failed tool call: red eyes for FACE_MS, pinned to the error, then gone.
  boysEvent('tool-error', { at: T0, mode: 'brand', tool: 'Bash' })
  expect(faceAt(T0 + 100).err).toBe(T0)
  const red = figure('brand', T0 + 200)
  expect(red).toContain('data-egg="redeyes"')
  expect(red).toContain(`calc(@@T${T0}@@ + 0s)`)
  expect(figure('brand', T0 + FACE_MS + 10)).not.toContain('redeyes')
  // A red test run dips the approval: the smile twitches (ON BRAND); OFF BOOK scowls at it.
  const t1 = T0 + 60_000
  boysEvent('test-fail', { at: t1, mode: 'brand', pass: 2, fail: 6 })
  expect(faceAt(t1 + 100).dip).toBe(t1)
  expect(figure('brand', t1 + 100)).toContain('data-egg="smile"')
  expect(figure('brand', t1 + 100)).toContain('class="tb-twitch"')
  expect(figure('book', t1 + 100)).toContain('data-egg="scowl"')
  // The run turns green: OFF BOOK smirks.
  const t2 = t1 + 60_000
  boysEvent('test-pass', { at: t2, mode: 'book', pass: 8, fail: 0 })
  expect(figure('book', t2 + 100)).toContain('data-egg="smirk"')
  // Cheap: a moment is a patch, not a second bust; reduced motion stops it (a still face).
  expect(chars(figure('brand', t1 + 100)) - chars(calm)).toBeLessThan(600)
  const css = boysTheme('brand').css
  expect(css).toMatch(/\.tb-face,\.tb-twitch,\.tb-bt\{animation:none\}/)
  resetBoys()
})

test('victory poses: the ON BRAND cheer lands him beside the stamp (hover, wave, hands on hips); hips is the still; band only', () => {
  const c = cheer(1250, 148, 'brand', { delay: `calc(@@T${T0}@@ + 0s)` })
  expect(c).toContain('data-egg="victory"')
  expect([...c.matchAll(/animation-name:tbv(\w+)/g)].map(m => m[1])).toEqual(VICTORY.map(v => v[0]))
  // Only the last pose shows without animation (the reduced-motion still); the others start hidden.
  expect(c).toMatch(/<g class="tb-vic" style="animation-name:tbvhips">/)
  expect((c.match(/class="tb-vic" style="animation-name:tbv(hover|wave)" opacity="0"/g) ?? []).length).toBe(2)
  expect(c).toContain('animation-delay:var(--cd,0s)')
  const a = audit(doc(1250, 148, c))
  expect([a.dupes, a.dupeIds, a.badText]).toEqual([[], [], []])
  expect(chars(c.slice(c.indexOf('<g data-egg="victory"')))).toBeLessThan(8_000)
  for (const m of ['book', 'gold', 'noir'] as const) expect(cheer(1250, 148, m)).not.toContain('data-egg="victory"')
  expect(cheer(480, 300, 'brand')).not.toContain('data-egg="victory"')
})

test('F2 OFF THE BOOKS comeback: OFF BOOK, a 10+ minute job ending green after a red run in it, once a day', () => {
  resetBoys()
  const start = T0
  const end = T0 + COMEBACK_MS + 60_000
  expect(comebackDue(end, 'book', end - start)).toBe(false) // no red run yet
  boysEvent('test-fail', { at: start + 120_000, mode: 'book', pass: 1, fail: 3 })
  expect(comebackDue(end, 'book', end - start)).toBe(false) // still red
  boysEvent('test-pass', { at: start + 300_000, mode: 'book', pass: 4, fail: 0 })
  expect(comebackDue(end, 'book', end - start)).toBe(true)
  // Never ON BRAND, never on a short job, never a red run from before the job.
  expect(comebackDue(end, 'brand', end - start)).toBe(false)
  expect(comebackDue(end, 'book', COMEBACK_MS - 1)).toBe(false)
  expect(comebackDue(end, 'book', 200_000)).toBe(false)
  // Once a day (local): spent, then free again tomorrow.
  markComeback(end)
  expect(comebackDue(end + 3_600_000, 'book', end + 3_600_000 - start)).toBe(false)
  const tomorrow = new Date(2026, 9, 21, 10, 0, 0).getTime()
  boysEvent('test-fail', { at: tomorrow - 400_000, mode: 'book', pass: 1, fail: 1 })
  boysEvent('test-pass', { at: tomorrow - 300_000, mode: 'book', pass: 2, fail: 0 })
  expect(comebackDue(tomorrow, 'book', 900_000)).toBe(true)
  resetBoys()
})

test('skin switch flavours: The Boys\' gold star spins like a coin, NOIR\'s reel drops with the curtain, Invincible\'s fist punches in; inside the wipe budgets', () => {
  const look = { bg: '#0A1430', accent: '#C9A13B', ink: '#F4F6FB' }
  for (const id of ['the-boys', 'solidgold', 'noir', 'invincible']) {
    const f = switchFlavour(id)
    expect(f, id).toBeDefined()
    const band = skinSwitch({ W: 900, H: 148, at: T0, surface: 'band', from: look, to: look, ...(f ? { flavour: f } : {}) })
    expect(chars(band), `${id} band`).toBeLessThanOrEqual(8_000)
    expect(band).toMatch(/<use href="#\w+fem\w+"/)
    const a = audit(doc(900, 148, band))
    expect([a.dupes, a.dupeIds, a.badText], id).toEqual([[], [], []])
    expect(a.reduced, id).toBe(true)
    for (const i of [0, 1, 2]) {
      const card = skinSwitch({ W: 480, H: 240, at: T0, surface: 'pane', from: look, to: look, i, ...(f ? { flavour: f } : {}) })
      expect(chars(card), `${id} card ${i}`).toBeLessThanOrEqual(5_000)
      expect(card).not.toMatch(/fem\w+"/)
    }
  }
  const tb = skinSwitch({ W: 900, H: 148, at: T0, surface: 'band', from: look, to: look, flavour: switchFlavour('the-boys') as never })
  expect(tb).toContain('scale(-1,1)') // the coin's far side
  const noir = skinSwitch({ W: 900, H: 148, at: T0, surface: 'band', from: look, to: look, flavour: switchFlavour('noir') as never })
  expect(noir).toContain('rotate(240deg)')
  expect(switchFlavour('caliper')).toBeUndefined()
})
