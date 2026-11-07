// THINK, MARK: the pane redraws that carry the film. A draw holds only the shot playing and (when it fits) the next, so the pane
// is drawn again just after every cut; the engine's timers do it. Kept here so the schedule is one small, testable thing.
import { thinkMarkRedraws } from './invincible-thinkmark'

export type TimerLike = { cancel: () => void }
export type AfterLike = (ms: number, fn: () => void) => TimerLike

let held: TimerLike[] = []
/** Cancels every redraw still waiting (a skin switch, a new trigger, a reload). Safe to call at any time, any number of times. */
export const clearThinkMarkTimers = (): void => {
  const was = held
  held = []
  for (const t of was) {
    try {
      t.cancel()
    } catch {
      /* already gone */
    }
  }
}
/** Starts the redraws for a cutscene that began at `start`: one timer per cut still ahead of `now`. Returns the moments (epoch ms). */
export const scheduleThinkMark = (after: AfterLike, start: number, now: number, redraw: (at: number) => void): number[] => {
  clearThinkMarkTimers()
  const due = thinkMarkRedraws(start).filter(t => t > now)
  for (const t of due) held.push(after(t - now, () => redraw(t)))
  return due
}
export const pendingThinkMarkTimers = (): number => held.length
