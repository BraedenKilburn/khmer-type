/**
 * Which OS the user is on, to the only resolution this app needs.
 *
 * Adding a Khmer input source is three different sets of steps, and a learner
 * who is stuck on the wrong layout should not have to work out which set is
 * theirs. All three stay reachable — the detection picks the tab, it does not
 * hide the others, so being wrong costs a click rather than the answer.
 */

export type Os = 'macos' | 'windows' | 'linux'

/**
 * Read the OS off a user agent string.
 *
 * Taken as an argument rather than off `navigator` so this is testable and so
 * the caller decides what happens without a browser. Linux is the fallback
 * because it is the case whose instructions are the most generic — a user on
 * something unrecognised is better served by "your desktop's settings" than by
 * a confident wrong path through System Settings.
 */
export function detectOs(userAgent: string): Os {
  if (/mac|iphone|ipad|ipod/i.test(userAgent)) return 'macos'
  if (/win/i.test(userAgent)) return 'windows'
  return 'linux'
}
