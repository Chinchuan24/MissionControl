// Easter eggs for the Breaking Bad skin (and its hidden Heisenberg skin): small nods a
// fan of the show will catch. A fan homage to AMC / Sony Pictures Television: only
// episode titles, short phrases and the periodic table. "Cook", "blue" and "purity" are
// show flavour only: nothing here describes how to make anything. Pure SVG strings and
// tables, no state: the hooks module decides when each shows.

import { BADGES } from './extras'
import type { Badge, CredWords } from './extras'

export const BLUE = '#5EC8F0'
export const GREEN = '#4FB37A'
export const YELLOW = '#F2C318'
let uid = 0
const id = (p: string) => `${p}${(uid = (uid + 1) % 100000)}`

// --- Motion ---
// (The old cheer stamp, the title glitch and the unlock tag are gone: breakingbad-motion.ts draws those moments now.)
export const BB_CSS = `.bbp{animation:bbp 1.2s steps(1) infinite}@keyframes bbp{50%{opacity:.25}}
.bbs{animation:bbs 1.4s ease-in-out infinite}@keyframes bbs{50%{opacity:.05}}
.bbsp{transform-box:fill-box;transform-origin:center;animation:bbsp 1.8s ease-in-out infinite}@keyframes bbsp{0%,100%{opacity:0;transform:scale(.4)}50%{opacity:.9;transform:scale(1)}}
.bbwin{animation:bbwin 3.4s steps(1) infinite}@keyframes bbwin{50%{opacity:.25}}
.bbhat{animation:bbhat 4s ease-in-out infinite}@keyframes bbhat{50%{opacity:.12}}
.bbchip{animation:bbchip 1.6s ease-in-out infinite}@keyframes bbchip{50%{opacity:.62}}
.onair{animation:onair 1.4s ease-in-out infinite}@keyframes onair{50%{opacity:.3}}
@media (prefers-reduced-motion: reduce){.bbp,.bbs,.bbsp,.bbwin,.bbhat,.bbchip,.onair{animation:none}.bbsp{opacity:.5}}`

// --- Episode ticker: one real title an hour ---
export const BB_EPISODES: string[] = [
  'S1E1 Pilot', 'S1E4 Cancer Man', 'S1E5 Gray Matter', "S1E6 Crazy Handful of Nothin'",
  'S2E2 Grilled', 'S2E6 Peekaboo', 'S2E7 Negro y Azul', 'S2E8 Better Call Saul', 'S2E9 4 Days Out', 'S2E12 Phoenix', 'S2E13 ABQ',
  'S3E1 No Más', 'S3E4 Green Light', 'S3E7 One Minute', 'S3E8 I See You', 'S3E9 Kafkaesque', 'S3E10 Fly', 'S3E12 Half Measures', 'S3E13 Full Measure',
  'S4E1 Box Cutter', 'S4E7 Problem Dog', 'S4E8 Hermanos', 'S4E10 Salud', 'S4E11 Crawl Space', 'S4E12 End Times', 'S4E13 Face Off',
  'S5E1 Live Free or Die', 'S5E2 Madrigal', 'S5E3 Hazard Pay', 'S5E5 Dead Freight', 'S5E8 Gliding Over All', 'S5E14 Ozymandias', 'S5E15 Granite State', 'S5E16 Felina',
]
export const bbEpisodeAt = (at: number): string => BB_EPISODES[Math.floor(at / 3_600_000) % BB_EPISODES.length] as string

// --- Purity (flavour only): 96.2% with nothing done, 99.1% with every step ---
export const purityOf = (done: number, total: number): number => +(96.2 + 2.9 * (total > 0 ? Math.max(0, Math.min(1, done / total)) : 0)).toFixed(1)
export const labStatus = (isWorking: boolean, done: number, total: number): string => (isWorking ? 'In the lab…' : total > 0 && done >= total ? 'Batch complete.' : 'Class is in session.')

export const BB_WARNING = (_ctx: number): string => 'Context nearly full: tread lightly. /compact'

// --- Crystal sparkle: blue afterimages and glints trailing a working figure ---
export const crystalGlints = (figure: string, box: { x: number; y: number; w: number; h: number }): { defs: string; svg: string } => {
  const f = id('bg')
  const glints = [
    [0.05, 0.2, 0],
    [0.95, 0.5, 0.6],
    [0.3, 0.9, 1.2],
  ]
    .map(([fx, fy, d]) => `<path class="bbsp" style="animation-delay:${-(d as number)}s" d="M0 -3L.7 -.7L3 0L.7 .7L0 3L-.7 .7L-3 0L-.7 -.7Z" transform="translate(${+(box.x + (fx as number) * box.w).toFixed(1)} ${+(box.y + (fy as number) * box.h).toFixed(1)})" fill="#BFEBFF"/>`)
    .join('')
  return {
    defs: `<filter id="${f}"><feColorMatrix type="matrix" values="0.2 0 0 0 0.2  0 0.6 0 0 0.45  0 0 0.9 0 0.55  0 0 0 1 0"/></filter>`,
    svg:
      [8, 5, 2].map((dx, i) => `<g class="bbs" style="animation-delay:${-i * 0.2}s" opacity="${(0.1 + i * 0.08).toFixed(2)}" filter="url(#${f})" transform="translate(${-dx} 0)">${figure}</g>`).join('') + glints,
  }
}

// --- Empire Cred: a chemistry exam page, not a ladder of medals ---
// Progress is purity (it rises batch by batch and never quite reaches 100), the rank is a
// title from Walt's arc, the grade is written in red pen, a flask fills towards the next
// rank, and each badge is an element you discover on a periodic-table row.
const RANKS: [number, string][] = [
  [20, 'Blue Sky'], [15, 'Empire Business'], [12, 'Kingpin'], [9, 'Distributor'], [7, 'Heisenberg'], [5, 'The Professor'], [4, 'Cook'], [3, 'Partner'], [2, 'Car Wash Cashier'], [1, 'Chemistry Teacher'],
]
export const empireRankOf = (level: number): string => (RANKS.find(([from]) => level >= from) ?? (RANKS[RANKS.length - 1] as [number, string]))[1]
// The element each badge id discovers: symbol, atomic number, and what finds it.
export const ELEMENTS: Record<string, [string, string, string, string]> = {
  choom: ['Br', '35', 'FIRST BATCH', 'Finish your first batch'],
  merc: ['Ba', '56', 'PARTNER', 'Finish 10 batches'],
  edgerunner: ['Au', '79', 'THE ONE WHO KNOCKS', 'Finish 50 batches'],
  legend: ['Pt', '78', 'FULL MEASURE', '10 long batches (3+ minutes each)'],
  netrunner: ['Na', '11', 'THE ORGANIZATION', 'Call 100 sub-agents'],
  crewboss: ['Fe', '26', 'HAZMAT CREW', 'Run a batch with 5+ sub-agents'],
  chromed: ['Cl', '17', 'NO HALF MEASURES', 'Push the context past 90%'],
  owl: ['Si', '14', 'NIGHT SHIFT', 'Finish a batch between midnight and 5 am'],
  samurai: ['He', '2', 'SAY MY NAME', 'Keep exploring.'],
}
export const EMPIRE_BADGES: Badge[] = BADGES.map(b => {
  const e = ELEMENTS[b.id]
  return e ? { ...b, name: e[2], icon: e[0], how: e[3] } : b
})
export const EMPIRE_WORDS: CredWords = { badges: EMPIRE_BADGES, cases: 'BATCHES', long: 'LONG BATCHES', all: 'EVERY ELEMENT FOUND. YEAH, SCIENCE!' }

// --- Words ---
export const BB_TITLE_WORDS: string[] = ['Gray Matter', 'Half Measures', 'Full Measure', 'Better Call Saul', 'Green Light', 'Live Free or Die', 'Hazard Pay', 'Crawl Space', 'Granite State', 'Felina', 'Problem Dog']
export const BB_SKIN_WORDS: string[] = ['Respecting the chemistry', 'Applying yourself', 'Calling Saul', 'Washing cars', 'Treading lightly', 'Building an empire']
export const BB_TOOLS: Record<string, string> = {
  Read: 'Study', Grep: 'Trace', Glob: 'Sort', Edit: 'Adjust', MultiEdit: 'Adjust', Write: 'Label', Bash: 'Cook', PowerShell: 'Cook',
  Agent: 'Call Saul', WebFetch: 'Pick up', WebSearch: 'Canvass ABQ', ToolSearch: 'Ask Mike',
}
export const BB_GREETING = 'Mr. White is in the lab. Class is in session.'
export const BB_BOOT = ['OPENING THE LAB…', 'ALBUQUERQUE · NEW MEXICO · CLASS IS IN SESSION']
export const HEIS_BOOT = ['SAY MY NAME…', 'HEISENBERG · BLUE SKY · NO HALF MEASURES']
export const HEIS_GREETING = 'Say my name… Heisenberg.'
// The line that lands when the phrase turns Breaking Bad into Heisenberg: a toast (the band and the pane play SAY MY NAME).
export const BB_RIGHT = "You're goddamn right!"
export const BATCH_TOAST = (task: string): string => `On the honor roll: ${task}`
// Typing this (with the Breaking Bad skin on) wakes the hidden skin.
// The Heisenberg unlock phrases: "say my name", or "what's my name" (also whats / wats / wat's / what is, straight or curly
// apostrophe, any spacing). Whole words only, so "somewhat's my name" or "what's my names" do not count; surrounding
// punctuation ("?", "!", quotes) is fine. The phrase ends there (the text's end, a stop, or "and" / "then" and the rest of the
// ask): "what is my name field called" or "make the bot say my name when I log in" are everyday prompts, not the line.
export const SAY_MY_NAME_RE = /(?<![a-z0-9])(?:say\s+my\s+name|wh?at(?:\s*['\u2018\u2019\u02BC`\u00B4]?\s*s|\s+is)\s+my\s+name)(?=\s*(?:$|[?!.,;:\u2026)"'\u2019\u201D])|\s+(?:and|then)\s)/i
export function isSayMyName(text: string): boolean {
  return SAY_MY_NAME_RE.test(text)
}
// The way back: "walter white" typed while wearing Heisenberg puts Breaking Bad back on. Whole words only ("walter whitehead"
// does not count).
export const WALTER_WHITE_RE = /(?<![a-z0-9])walter\s+white(?![a-z0-9])/i
