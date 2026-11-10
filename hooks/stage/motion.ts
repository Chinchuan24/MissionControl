// Reduced motion, written once. The app has no motion toggle of its own: only the OS `prefers-reduced-motion` reaches an
// image, so every animated piece needs a still frame that the @media rule swaps in. Before this, ~20 files wrote their own.
//
//   const rm = pair('zz')                 // classes zz-a (animated) and zz-s (still)
//   svg = `<style>${rm.css}</style>${rm.anim(moving)}${rm.still(frame)}`
//   stop('zz-loop', 'zz-blink')           // CSS: those classes stop dead (their markup attrs are the still pose)

export const REDUCE = '@media (prefers-reduced-motion: reduce)'

/** CSS that only applies under reduced motion. */
export const reduced = (css: string): string => (css ? `${REDUCE}{${css}}` : '')

/** CSS that stops the named classes (and keeps them stopped) under reduced motion: their static attributes are the still. */
export const stop = (...classes: string[]): string => (classes.length ? reduced(`${classes.map(c => `.${c}`).join(',')}{animation:none!important}`) : '')

/** CSS that hides the named classes under reduced motion (a flash, a shake, a particle: no still form at all). */
export const hide = (...classes: string[]): string => (classes.length ? reduced(`${classes.map(c => `.${c}`).join(',')}{display:none}`) : '')

export type Pair = { anim: (markup: string) => string; still: (markup: string) => string; css: string; a: string; s: string }

/**
 * An animated/still pair under one prefix: `anim()` is drawn normally and hidden under reduced motion, `still()` the
 * other way round. The CSS is one short line; put it in the Svg's `<style>` once per prefix.
 */
export const pair = (prefix: string): Pair => {
  const a = `${prefix}-a`
  const s = `${prefix}-s`
  return {
    a,
    s,
    css: `.${s}{display:none}${reduced(`.${a}{display:none}.${s}{display:inline}`)}`,
    anim: markup => `<g class="${a}">${markup}</g>`,
    still: markup => `<g class="${s}">${markup}</g>`,
  }
}

/** True when `css` handles reduced motion at all: what the tests ask of every piece that animates. */
export const hasReduced = (svg: string): boolean => svg.includes('prefers-reduced-motion: reduce')
