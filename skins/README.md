# Custom Claude Skins

Skins for the **Mission Control** mod: the band above the prompt, the Mission Control pane, its cards and the hierarchy.

Skins load from, in order: the folder you used last, a `Custom Claude Skins/` folder in your working folder (on Linux, or a case-sensitive Mac drive, the name must match exactly), then the `skins/` examples shipped with the mod. The JSON files here are copies of the built-in skins: copy one to start your own. `mentalist.json` is The Mentalist, a fan-homage skin with Jane and the CBI team as its pixel cast. `breaking-bad.json` is the Breaking Bad fan-homage skin (Mr. White, Jesse and the lab). `better-call-saul.json` is the Better Call Saul fan-homage skin (Saul's strip-mall law office). `caliper.json` is Caliper, an original Mission Control design. The cyberpunk ones (Cyberpunk Edgerunner, Lucy · Edgerunners, Arasaka, Edgerunners 2) live in `addons/cyberpunk/skins/` and need the Cyberpunk Skins add-on.

> Unofficial, non-commercial fan project. Cyberpunk 2077, Cyberpunk: Edgerunners and all related names and characters belong to their respective owners (CD PROJEKT S.A., Studio Trigger, Netflix) and are used as fan homage only. The Mentalist and its characters belong to CBS and Warner Bros. Television, likewise used as fan homage only. Breaking Bad and its characters belong to Sony Pictures Television and AMC, used as fan homage only. Invincible and its characters belong to Robert Kirkman, Cory Walker, Ryan Ottley, Image Comics, Skybound and Amazon MGM Studios, used as fan homage only. Better Call Saul and its characters belong to Sony Pictures Television and AMC, used as fan homage only. The Boys and its characters belong to Eric Kripke, Garth Ennis, Darick Robertson, Sony Pictures Television and Amazon MGM Studios, used as fan homage only; the pixel art is original (text prompts only, no stills, no actor likenesses).

Caliper is an original Mission Control design (no homage): a dark face, a light face and an auto setting that follows the app's theme.

## Use

- `/skins`: open the skin picker panel (the **Skins** tab is a gallery: a preview card per skin, under Classics, TV shows, Night City and Your skins)
- `/skin`: list skins (▸ marks the one that's on)
- `/skin crab-classic`: switch, live
- `/skin mentalist`: Jane and the CBI team (dark, its own pixel cast)
- `/skin breaking-bad`: Mr. White, Jesse and the lab (dark, crystal blue, its own pixel cast)
- `/skin better-call-saul`: Saul's strip-mall law office (dark walnut, powder blue and gold, Mike roams)
- `/skin invincible`: the comic page that became the show (the classic suit: sky blue with yellow accents, the whole interface). Mark and Omni-Man fight across the band and the pane now and then, the Guardians take on Omni-Man once a day (or type `guardians`), a rift spills a flock of evil Marks across the screen once a day too (or type `multiverse`), and a second era hides behind `new suit`: the S3 suit's black and blue (`classic suit` goes back to the sky blue).
- `/skin the-boys`: Vought's broadcast console (ON BRAND: navy and gold). The APPROVAL RATING follows your test pass rate and the bust's face follows it; a VNN crawl runs along the band's foot and BREAKING news takes it over when tests fail; the 7SPN scoreboard shows test runs; failed tools are spun into press-speak. Type `shock and awe, my son` and the Boys hijack the feed (OFF BOOK: coat-black, marker red, everything LEAKED); `never meet your heroes` puts it back.
- `/skin caliper`: graphite and ice, a dial and a ruler. `/skin caliper light`, `dark` or `auto` picks the face; the CALIBRATION card's `⇄` button cycles it.
- `/skin off`: back to Default (no skin)
- `/skin reload`: re-read this folder after you edit or add a file
- `/skin new <idea>`: Claude drafts a skin from a one-line idea and saves it
- `/skin check <file>`: check a skin file; `skin.schema.json` lets your editor do it too

Guide: [`docs/SKINS.md`](../docs/SKINS.md).

## Easter eggs

Type the word anywhere in a prompt (any case) while the skin is on.

- **Invincible**: `think, mark`, `guardians`, `multiverse`, `new suit` / `classic suit`
- **Better Call Saul**: `chicanery`, `namaste`, `ding`, `1216`, `saul3d`
- **The Boys**: `shock and awe, my son` / `never meet your heroes`, `7spn` (more on the way)
- **Replays**: Invincible `/missioncontrol play fight|showdown|think|eve|oliver|cecil|newsuit|classic`; The Boys `/missioncontrol play hijack|onbrand|breaking|scoreboard|spin|turbo`
- Many eggs also play by themselves: daily events, cameos, and extras at 85% and 95% context.

<details>
<summary>Spoilers: hidden skins</summary>
<br>

Not listed anywhere until worn.

- **Red John**: type `tyger tyger` on The Mentalist, or `/skin red-john`
- **Heisenberg**: type `say my name` on Breaking Bad, or `/skin heisenberg`
- **GENE**: type `takavic` on Better Call Saul, or `/skin gene`; `saul goodman` goes back
- **CAPRI** (add-on, Edgerunners 2's CAPRI mode): type `capri` or `0+2=1` on Edgerunners 2, `hi capri` within a minute of a takeover, or `/skin capricorn`; `bye capri` goes back
- **SAMURAI** (add-on): `/skin samurai` only
- **SOLID GOLD**: type `solidgold` or `soldier boy` on The Boys, or `/skin solidgold`; `back on ice` goes back. It has its own badge and its own secret flag

</details>

## Make your own

Copy a `.json` file here, give it a new `id` (lowercase, dashes), change the colors, then `/skin reload` and `/skin <your-id>`.

| Field | What it does |
|---|---|
| `font` | Font list, first installed one wins (install Rajdhani for the true Cyberpunk look) |
| `corners` | `round` or `chamfer` (cut corners, HUD style) |
| `dark` | `true` paints its own dark colors whatever the system theme |
| `colors.accent` / `accent2` | Main and second neon |
| `colors.done` / `warn` / `alert` | Green, amber and red states |
| `colors.meter` | Usage bars |
| `colors.text` / `subtext` / `muted` | Text, from bright to quiet |
| `colors.tile` / `track` / `line` / `grid` | Card fill, bar tracks, hairlines, dotted backdrop |
| `boss` | Five colors for the Manager's spinning ring |
| `roles` | Colors given to named roles ("Designer: ...") |
| `effects` | `scanlines` and `glitch` on or off |
| `backdrop` | The whole panel's background: `fill` color, `pattern` (`dots`, `lines`, `stars`, `none`), `ink` for the pattern |
| `chat` | `true` restyles the chat's tool rows and spinner; `false` leaves the app's own |
| `words` | Spinner words while Claude thinks ("Jacking in") |
| `toolWords` | A verb per tool row, e.g. `{ "Read": "Scan", "Bash": "Exec" }` |
| `tabs` | Tab titles: `{ "mission": "◢ Mission Control", "skins": "◢ Skins" }` |

Colors are hex (`#FCEE0A`) or `rgb()/rgba()`. A file with a mistake is skipped; `/skin` shows what loaded.

## Credits: The Boys

- The Boys (Amazon Prime Video, 2019–2026) was developed by Eric Kripke from the comic by Garth Ennis and Darick Robertson, produced by Sony Pictures Television and Amazon MGM Studios. Vought, the Seven, VNN, Vought on Ice, 7SPN, Solid Gold and every character name are theirs, used here as fan homage only.
- The pixel cast in `hooks/theboys-sprites.ts` is original art generated from text prompts only (no show stills, no photos, no actor likenesses; faces were changed on purpose).
- Every VNN headline, toast and spinner line is our own writing, apart from a few short attributed lines under 15 words. No song lyrics are used, only titles.
