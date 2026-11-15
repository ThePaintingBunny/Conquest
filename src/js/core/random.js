/*
 * Random numbers
 *
 * The seeded generator that keeps painted scenery identical on every screen, and the D6 used for every
 * roll in the game.
 *
 * In this file: s, r(), d6()
 */

let s = 31;

function r() {
  s |= 0;
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function d6() {
  const a = new Uint8Array(1);
  do {
    crypto.getRandomValues(a);
  } while (a[0] >= 252);
  lastRollAt = performance.now();
  return (a[0] % 6) + 1;
}
