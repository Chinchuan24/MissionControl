// Invincible (fan homage to Robert Kirkman, Cory Walker, Ryan Ottley, Image Comics, Skybound and Amazon MGM Studios): THE
// MULTIVERSE's cast. Other-universe Marks (S3E6-7), each a NEW sprite painted by region over INV_MARK_FLY (that sprite is
// untouched). Our own pixel art, no images copied. Same format as cast.ts: rows of letters, `.` empty; no `t` (no tint).
// All 21x18 and facing right (never flipped). Rows 0-1 are the 2-row pad: only overlay pixels (mohawk, spikes, hair) live
// there; body rows 2-17 sit exactly where INV_MARK_FLY's rows 0-15 do, so every Mark centres the same with spriteC.
//
//   INV_VAR_CAPE       Capevincible: black and yellow, black visor, black shoulders, yellow boots, rounded chest point,
//                      a big gold cape blowing back (lit top edge, a fold, two-point hem).
//   INV_VAR_OMNI       Omnivincible: Omni-Man red and white, red mask with black lenses, red legs and gloves, white boots,
//                      three spiky hair tips, a short dark-red cape.
//   INV_VAR_HAWK       Movincihawk: no mask, shaved sides, a two-spike black mohawk crest, eye bags; black suit with a blue
//                      centre panel that runs down between the legs, black gloves and boots.
//   INV_VAR_MASK       Maskvincible: the whole head black with one bright white goggle slit; black suit, blue arms and knee.
//   INV_VAR_HOOD       Hoodvincible: mostly yellow, blue hood and arms, big yellow goggles, bare hands, blue toes.
//   INV_VAR_LIGHTBLUE  Lightblueincible: no black on the suit: light blue, pale-yellow chest, yellow gloves and lower boots,
//                      no mask, thick black hair.
//   INV_VAR_PRISON     Prisonincible (pane): bald, burn scars, black visor fused in, grey inmate fatigues with a dark belt,
//                      bulked-up traps and front arm.
//   INV_VAR_VILTRUM    Viltrumincible (pane): white Viltrumite uniform, black boots, dark shoulder insignia, no mask, bangs.
//   INV_VAR_FLAXAN     Flaxancible (pane tail, era 1): blue jumpsuit under white Flaxan armour, black specs, side fringe.
//   (era 2 tail)       Corrupted Invincible: no sprite here, it is INV_MARK_FLY padded (padTop).
import type { Sprite } from './cast'

/** Two empty rows on top, so a 21x16 Mark (INV_MARK_FLY / INV_MARK_S3_FLY) lines up with these 21x18 variants. */
export const padTop = (sp: Sprite): Sprite => ({ ...sp, rows: ['.'.repeat(sp.rows[0]?.length ?? 21), '.'.repeat(sp.rows[0]?.length ?? 21), ...sp.rows] })

// Capevincible
export const INV_VAR_CAPE: Sprite = {
  rows: [
    ".....................",
    ".....................",
    ".............aaa.....",
    ".......bbbbbcaca.....",
    "...ddddeddddffff.....",
    "ddddeeeaaaa.ghhh.....",
    "ee..iiaaacaijhhh.....",
    "e.jiikcccccilkhc..il.",
    "..kk.....caiijmaaiijj",
    "........ackiimccckkkk",
    "......aaacjjcc.......",
    "...caaaaaccc.........",
    "..icacccaaa..........",
    ".iii..aaaa...........",
    "ii..iaaa.............",
    "ii.iii...............",
    "..ii.................",
    "..i..................",
  ],
  pal: { a: '#2B2F36', b: '#F0C85A', c: '#24282D', d: '#D9A332', e: '#9C7424', f: '#111318', g: '#D89D4E', h: '#E2B394', i: '#E8C243', j: '#D9B13C', k: '#C39A35', l: '#E1BA40', m: '#355457' },
}

// Omnivincible
export const INV_VAR_OMNI: Sprite = {
  rows: [
    ".............a.......",
    "............a.a......",
    ".............aaa.....",
    ".......bbbbbcaca.....",
    "...ddddeddddffff.....",
    "ddddeeegggg.hiii.....",
    "ee..jjgggkgjjiii.....",
    "..jjjhkkkkkjjhik..jj.",
    "..hh.....kgjjjkggjjjj",
    "........gkhjjkkkkhhhh",
    "......jjjhjjhk.......",
    "...hjjjjjhhh.........",
    "..ghjhhhjjj..........",
    ".ggg..jjjj...........",
    "gg..gjjj.............",
    "gg.ggg...............",
    "..gg.................",
    "..g..................",
  ],
  pal: { a: '#2B2F36', b: '#D2383E', c: '#24282D', d: '#A51E25', e: '#6E1419', f: '#111318', g: '#ECEBE8', h: '#8E1C22', i: '#E2B394', j: '#C0272D', k: '#BFC3C9' },
}

// Movincihawk
export const INV_VAR_HAWK: Sprite = {
  rows: [
    "............a.a......",
    "............bbb......",
    ".............bbc.....",
    "............ddcc.....",
    "............dcec.....",
    ".......bbff.dcgc.....",
    "....bbbbbhffdccc.....",
    "..bbbiiiiihffdch..bb.",
    "..ii.....ibfffjbbbbbb",
    "........bihffjiiiiiii",
    "......bbbhffhi.......",
    "...ibbbbbhhh.........",
    "..kibiiihhb..........",
    ".kkk..bbhb...........",
    "kk..kbbb.............",
    "kk.kkk...............",
    "..kk.................",
    "..k..................",
  ],
  pal: { a: '#4A515E', b: '#2B2F36', c: '#E2B394', d: '#C99474', e: '#1A1C22', f: '#3F78B5', g: '#8C6A70', h: '#2F5C8C', i: '#24282D', j: '#355457', k: '#1E2127' },
}

// Maskvincible
export const INV_VAR_MASK: Sprite = {
  rows: [
    ".....................",
    ".....................",
    ".............aaa.....",
    "............baba.....",
    "............accc.....",
    ".......dddd.baaa.....",
    "....eedddfdeaaaa.....",
    "..eeegfffffeebag..ee.",
    "..gg.....geeeefddeeee",
    "........eggeeffffgggg",
    "......eeegeegg.......",
    "...feeeeeggg.........",
    "..gfegggeee..........",
    ".ggg..eeee...........",
    "gg..geee.............",
    "gg.ggg...............",
    "..gg.................",
    "..g..................",
  ],
  pal: { a: '#1E2127', b: '#16181D', c: '#F2F4F7', d: '#3F78B5', e: '#2B2F36', f: '#2F5C8C', g: '#24282D' },
}

// Hoodvincible
export const INV_VAR_HOOD: Sprite = {
  rows: [
    ".....................",
    ".............aa......",
    ".............bbb.....",
    "............cbcb.....",
    "............dddd.....",
    ".......bbbb.cdde.....",
    "....eebbbcbfbeee.....",
    "..eeegcccccffcec..ee.",
    "..gg.....cbfffcbbeeee",
    "........bchffccccgggg",
    "......iiihffhc.......",
    "...jiiiiihhh.........",
    "..ijijjjiii..........",
    ".iii..iiii...........",
    "bi..iiii.............",
    "bi.iii...............",
    "..ii.................",
    "..b..................",
  ],
  pal: { a: '#2B2F36', b: '#3F78B5', c: '#2F5C8C', d: '#F5D84A', e: '#E2B394', f: '#E8C243', g: '#C99474', h: '#C39A35', i: '#E1BA40', j: '#B8902F' },
}

// Lightblueincible
export const INV_VAR_LIGHTBLUE: Sprite = {
  rows: [
    ".....................",
    ".............aaa.....",
    ".............aaa.....",
    "............baba.....",
    "............acdc.....",
    ".......eeee.accc.....",
    "....ffeeegehcccc.....",
    "..fffiggggghhjcg..ff.",
    "..ii.....gehhhgeeffff",
    "........egkhhggggiiii",
    "......eeekhhkg.......",
    "...geeeeekkk.........",
    "..ggegggeee..........",
    ".ggg..eeee...........",
    "ff..feee.............",
    "ff.fff...............",
    "..ff.................",
    "..f..................",
  ],
  pal: { a: '#2B2F36', b: '#24282D', c: '#E2B394', d: '#1A1C22', e: '#8CC8F0', f: '#E8C243', g: '#63A6D6', h: '#F3DE8A', i: '#C39A35', j: '#C99474', k: '#D9C26A' },
}

// Prisonincible (pane)
export const INV_VAR_PRISON: Sprite = {
  rows: [
    ".....................",
    ".....................",
    ".............aaa.....",
    "............bcba.....",
    ".........dddbeee.....",
    ".......dddddbaaa.....",
    "....aadddfddaaca.....",
    "..aaabfffffddbafddaa.",
    "..bb.....fddddfddaaaa",
    "........dffddffffbbbb",
    "......dddggggf.......",
    "...fdddddfff.........",
    "..hfdfffddd..........",
    ".hhh..dddd...........",
    "hh..hddd.............",
    "hh.hhh...............",
    "..hh.................",
    "..h..................",
  ],
  pal: { a: '#B9825F', b: '#94623F', c: '#D98A8A', d: '#8E949C', e: '#111318', f: '#6B7179', g: '#4A4F57', h: '#3A3E45' },
}

// Viltrumincible (pane)
export const INV_VAR_VILTRUM: Sprite = {
  rows: [
    ".....................",
    ".....................",
    ".............aaa.....",
    "............baba.....",
    "............aacd.....",
    ".......eeef.addd.....",
    "....eeeeegfedddd.....",
    "..eeeggggggeehdg..ee.",
    "..gg.....geeeegeeeeee",
    "........eggeegggggggg",
    "......eeegeegg.......",
    "...geeeeeggg.........",
    "..agegggeee..........",
    ".aaa..eeee...........",
    "aa..aeee.............",
    "aa.aaa...............",
    "..aa.................",
    "..a..................",
  ],
  pal: { a: '#2B2F36', b: '#24282D', c: '#1A1C22', d: '#E2B394', e: '#ECEBE8', f: '#4A4F57', g: '#BFC3C9', h: '#C99474' },
}

// Flaxancible (pane tail, era 1)
export const INV_VAR_FLAXAN: Sprite = {
  rows: [
    ".....................",
    ".............a.......",
    ".............aaa.....",
    "............baba.....",
    "............acdd.....",
    ".......eeff.accc.....",
    "....eeeeegffcccc.....",
    "..eeehhhhhgfficg..ee.",
    "..hh.....hefffheeeeee",
    "........ehgffhhhhhhhh",
    "......eeegffgh.......",
    "...geeeeeggg.........",
    "..fgehhheee..........",
    ".fff..eeee...........",
    "ff..feee.............",
    "ff.fff...............",
    "..ff.................",
    "..f..................",
  ],
  pal: { a: '#2B2F36', b: '#24282D', c: '#E2B394', d: '#111318', e: '#3E6FB0', f: '#E9ECEF', g: '#B9C0C8', h: '#2E558A', i: '#C99474' },
}

/** Who flies where (spec §2c). Band: 6 + the real Mark. Pane: 8 + the tail + the real Mark (+ Angstrom, drawn from INV_ANGSTROM).
 *  tail[2] is null: the era-2 tail is Corrupted Invincible = padTop(INV_MARK_FLY). */
export const VARIANT_CAST: { band: Sprite[]; pane: Sprite[]; tail: Record<1 | 2, Sprite | null> } = {
  band: [INV_VAR_CAPE, INV_VAR_OMNI, INV_VAR_HAWK, INV_VAR_MASK, INV_VAR_HOOD, INV_VAR_LIGHTBLUE],
  pane: [INV_VAR_CAPE, INV_VAR_OMNI, INV_VAR_HAWK, INV_VAR_MASK, INV_VAR_HOOD, INV_VAR_LIGHTBLUE, INV_VAR_PRISON, INV_VAR_VILTRUM],
  tail: { 1: INV_VAR_FLAXAN, 2: null },
}
