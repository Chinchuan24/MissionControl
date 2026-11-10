// The Boys, motion phase A, the pane cards: THE TABLE as an orbiting 3D set, the Q-SCORE box turning in its packaging, and
// THIS MEANS NOIR's own cards (THE SCRIPT, THE STORYBOARD) with no navy left in them.
import { expect, test } from 'claude-code/testing'
import { BLANK_CRED } from './extras'
import type { Cred } from './extras'
import { BADGES, BOARD_PW, BOX_TURN_S, ORBIT_S, TITLES, credCard, deskCard, dialCard, featuredBox, scriptCard, storyboardCard, tableCard } from './theboys-cards'
import { noteDraw } from './theboys-eggs'
import { audit, BUDGET } from './stage/budget'
import { compact } from './smooth'

const NOW = Date.parse('2026-10-20T10:00:00Z')
const LOOKS = ['brand', 'book', 'gold', 'noir'] as const
const full: Cred = { ...BLANK_CRED, xp: 9000, jobs: 120, longJobs: 20, agents: 300, crewJobs: 4, chromed: true, badges: ['choom', 'merc', 'edgerunner', 'legend', 'netrunner', 'crewboss', 'chromed'], skinBadges: ['lateedition', 'solidgold', 'noir'], found: ['solidgold', 'noir'] }
const steps = [
  { title: 'Read the incident report', state: 'done' }, { title: 'Map the API', state: 'done' }, { title: 'Rewrite the parser', state: 'failed' },
  { title: 'Write the holding statement', state: 'running' }, { title: 'Run the tests', state: 'todo' }, { title: 'Ship it', state: 'stopped' }]
const legends = Array.from({ length: 12 }, (_, i) => ({ task: `Press release number ${i} about a very long incident title`, costUsd: 1.5, at: NOW - i * 1000, ms: 240_000 }))
const beats = Array.from({ length: 160 }, (_, i) => ({ at: NOW - (160 - i) * 1000, tool: ['Read', 'Edit', 'Write', 'Bash', 'Agent', 'Grep', 'WebFetch', 'Other'][i % 8] as string, text: `file-${i}.ts`, who: 'Manager' }))
const org = (n: number) => ({ label: 'Manager', color: '#C9A13B', kind: 'manager', status: 'running', children: [{ label: 'Researchers', color: '#4FC3F7', kind: 'role', children: Array.from({ length: n }, (_, i) => ({ label: `Researcher: thing ${i}`, color: '#4FC3F7', kind: 'agent', status: i % 3 === 2 ? 'failed' : i % 2 ? 'running' : 'done', children: [] })) }] })
const NAVY = ['#1E3474', '#13214A', '#0E1838', '#0A1430', '#08102A', '#14204A']
const clean = (svg: string, label: string) => {
  const a = audit(svg)
  expect(a.dupes, `${label} duplicate attributes`).toEqual([])
  expect(a.badText, `${label} unescaped text`).toEqual([])
  expect(a.dupeIds, `${label} duplicate ids`).toEqual([])
  expect(svg, label).not.toContain('NaN')
  expect(svg, label).not.toContain('undefined')
}

test('THE TABLE orbits: one stepped 40 s lap shared by every seat (a seat is its delay), depth-scaled, with a still frame', () => {
  for (const m of LOOKS) {
    for (const n of [0, 3, 7, 12, 20]) {
      const svg = tableCard(560, org(n) as never, m)
      clean(svg, `table ${m} ${n}`)
      expect(svg.length, `${m} ${n}`).toBeLessThan(60_000)
      // One keyframes block for the lap (24 keys + the wrap), stepped at 6 fps; the seats share it by delay.
      expect(svg).toContain(`.tbo{animation:tbo ${ORBIT_S}s steps(10) infinite}`)
      expect(svg.match(/@keyframes tbo\{/g)?.length).toBe(1)
      const seats = svg.match(/class="tbo" style="animation-delay:-[\d.]+s"/g) ?? []
      expect(seats.length, `${m} ${n} seats`).toBe(Math.max(7, Math.min(12, n)) + 1)
      // Depth: back .8, front 1.1, dimmer at the back.
      expect(svg).toContain('scale(0.8);opacity:0.62')
      expect(svg).toContain('scale(1.1);opacity:1')
      // Reduced motion: every orbit class stops; each seat's transform attribute is its home slot.
      expect(svg).toContain('@media (prefers-reduced-motion: reduce){.tbo,.tbl,.tbt{animation:none!important}}')
      expect(/class="tbo" style="[^"]*" transform="translate\(\d+ \d+\) scale\([\d.]+\)"/.test(svg)).toBe(true)
      // The backdrop is a 2-layer parallax, stepped, stilled under reduced motion; the table is extruded (3 rim copies under its top).
      expect(svg).toContain('tbsk0p')
      expect(svg).toContain('tbsk1p')
      expect(svg.match(/<ellipse cx="[\d.]+" cy="[\d.]+" rx="[\d.]+" ry="44" fill="#[0-9A-F]{6}"(?: stroke="#[0-9A-F]{6}" stroke-opacity="\.5")?\/>/g)?.length).toBe(3)
    }
  }
  // The seats' order in the source is front-last (y-sorted), so the front row paints over the back row.
  const svg = tableCard(560, org(7) as never, 'brand')
  const ys = [...svg.matchAll(/class="tbo" style="[^"]*" transform="translate\(\d+ (\d+)\)/g)].map(x => Number(x[1]))
  expect([...ys].sort((a, b) => a - b)).toEqual(ys)
  // The orbit budget: the table's motion (its CSS) stays inside an idle loop's share of a card.
  const css = [...svg.matchAll(/<style>([^<]*tbo[^<]*)<\/style>/g)].map(x => x[1]).join('')
  expect(css.length).toBeLessThan(BUDGET.parallax.card)
})

test('Q-SCORE: the featured box turns in its packaging (8 views: 5 Blender views + 3 mirrored, one stepped loop), the rest glint; view 0 is the still', () => {
  expect(featuredBox(BLANK_CRED)).toBeUndefined()
  expect(featuredBox(full)).toBe('legend')
  expect(featuredBox(full, 'merc')).toBe('merc')
  expect(featuredBox({ ...BLANK_CRED, badges: ['choom', 'merc'] })).toBe('merc')
  for (const m of LOOKS) {
    for (const W of [360, 560, 900]) {
      const svg = credCard(W, full, m)
      clean(svg, `cred ${m} ${W}`)
      expect(svg.length).toBeLessThan(60_000)
      expect(svg).toContain('data-egg="box-turn"')
      const views = svg.match(/class="tbft" style="animation:tbft 8s steps\(1\) infinite/g) ?? []
      expect(views.length).toBe(8)
      expect(BOX_TURN_S).toBe(8)
      // The first view drawn is the front (shown under reduced motion: the class stops, the others keep opacity 0).
      expect(svg).toContain('@media (prefers-reduced-motion: reduce){.tbft{animation:none!important}}')
      expect(/<g class="tbft" style="[^"]*"><ellipse[^>]*\/><use href="#tbfbv0"/.test(svg)).toBe(true)
      // The glare sweeps the other bubbles only, stepped, hidden under reduced motion.
      expect(svg).toContain('<clipPath id="tbglc">')
      expect(svg).toContain('.tbgl{animation:tbgl 20s steps(26) infinite}')
      // The turnaround's share stays inside the stage budget for a card (5 views + mirror: about 5.5 k).
      const strip = svg.slice(svg.indexOf('<g data-egg="box-turn">'), svg.indexOf('</g>', svg.lastIndexOf('class="tbft"')) + 4) + (/<defs><g id="tbfbv0"[\s\S]*?<\/defs>/.exec(svg)?.[0] ?? '')
      expect(strip.length).toBeLessThan(BUDGET.turnaround.card)
    }
  }
  // An empty wall turns nothing.
  expect(credCard(560, BLANK_CRED, 'brand')).not.toContain('box-turn')
})

test('THIS MEANS NOIR: THE SCRIPT and THE STORYBOARD are their own cards, typed and sketched, with no navy anywhere', () => {
  noteDraw(NOW)
  expect(TITLES.noir).toEqual({ cred: 'TOP BILLING', task: 'THE SCRIPT', log: 'THE STORYBOARD', org: 'THE TABLE' })
  const script = deskCard(560, 'Vought Tower incident report', true, 2, 6, legends, 'noir', steps)
  expect(script).toBe(scriptCard(560, 'Vought Tower incident report', true, 2, 6, legends, steps))
  expect(script).toContain('>THE SCRIPT<')
  expect(script).toContain('>FADE IN:<')
  expect(script).toContain('INT. VOUGHT TOWER INCIDENT REPORT - NIGHT')
  expect(script).not.toContain('TALKING POINTS')
  expect(script).not.toContain('HOLDING STATEMENT')
  // The running scene types on (a cover with the cursor, stepped, inside a still clip); the failed one is struck in red pencil.
  expect(script).toContain('class="tbty"')
  expect(script).toContain('@keyframes tbty{')
  expect(script).toContain('clip-path="url(#tbtyc)"')
  expect(script).toContain('>CUT<')
  expect(script).toContain('stroke="#B8322A"')
  expect(script).toContain('@media (prefers-reduced-motion: reduce){.tbty{display:none}')
  // The working number stays plain text.
  expect(script).toContain('>33%<')
  // Idle: nothing types.
  const wrap = deskCard(560, 'Vought Tower incident report', false, 6, 6, legends, 'noir', steps.map(s => ({ ...s, state: 'done' })))
  expect(wrap).not.toContain('class="tbty"')
  expect(wrap).toContain('CUT TO:')
  const board = dialCard(560, beats, -1, 'noir')
  expect(board).toBe(storyboardCard(560, beats, -1))
  expect(board).toContain('>THE STORYBOARD<')
  expect(board).not.toContain('DIAL TEST')
  // Two rows of panels; the live one flips Noir's poses while the job shoots, and stands still (a thumbs-up) once it wraps.
  const per = Math.floor((560 - 32 + 10) / (BOARD_PW + 10))
  expect(board.match(/width="62" height="46" fill="#ECE8DC"/g)?.length).toBe(per * 2)
  expect(board.match(/class="tbfl" style="animation:tbfl 1\.4s steps\(1\) infinite/g)?.length).toBe(4)
  expect(board).toContain('@media (prefers-reduced-motion: reduce){.tbfl{animation:none!important}}')
  expect(board).toContain('rolling')
  noteDraw(NOW + 3_600_000)
  const still = dialCard(560, beats, -1, 'noir')
  expect(still).not.toContain('class="tbfl"')
  expect(still).toContain('wrapped')
  // Every NOIR card: clean, small, and no navy (black, greys, cream, amber).
  for (const W of [360, 560, 900]) {
    const cards = {
      script: deskCard(W, 'Vought Tower incident report', true, 2, 6, legends, 'noir', steps),
      scriptEmpty: deskCard(W, '', false, 0, 0, [], 'noir'),
      board: dialCard(W, beats, -1, 'noir'),
      boardPick: dialCard(W, beats, 20, 'noir'),
      boardEmpty: dialCard(W, [], -1, 'noir'),
      billing: credCard(W, full, 'noir'),
      billingEmpty: credCard(W, BLANK_CRED, 'noir'),
      table: tableCard(W, org(9) as never, 'noir'),
    }
    for (const [k, svg] of Object.entries(cards)) {
      clean(svg, `noir ${k} ${W}`)
      expect(svg.length, `noir ${k} ${W}`).toBeLessThan(60_000)
      expect(compact(svg).length, `noir ${k} ${W}`).toBeLessThan(BUDGET.total.card)
      for (const c of NAVY) expect(svg.includes(c), `noir ${k} ${W} has navy ${c}`).toBe(false)
    }
  }
  // The other looks keep their own cards.
  expect(deskCard(560, 'x', true, 1, 3, [], 'brand', steps)).toContain('TALKING POINTS')
  expect(dialCard(560, beats, -1, 'book')).toContain('TAPPED LINE')
})

test('cards: every look, every width, idle motion only through stepped loops (no filter is animated at rest)', () => {
  for (const m of LOOKS) {
    for (const W of [360, 560, 900]) {
      for (const svg of [credCard(W, full, m), tableCard(W, org(7) as never, m), deskCard(W, 'T', true, 2, 6, legends, m, steps), dialCard(W, beats, -1, m)]) {
        const css = [...svg.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(x => x[1]).join('')
        for (const rule of css.match(/animation:[^;}"]*infinite[^;}"]*/g) ?? []) {
          // the shared tb-* loops are older (ease-in-out pulses); every new loop here steps
          if (/^animation:(tbo|tbl|tbt|tbft|tbgl|tbty|tbsb|tbfl|tbsk\d)\b/.test(rule)) expect(rule, `${m} ${W} ${rule}`).toMatch(/steps\(\d+\)/)
        }
        expect(/@keyframes (tbo|tbt|tbty|tbfl)\{[^}]*filter/.test(css)).toBe(false)
      }
    }
  }
  expect(BADGES.length).toBe(10)
})
