/*
 * Board coordinates and DOM helpers
 *
 * Converts table inches to screen pixels and back (flipped so each player sees the table from their own
 * edge), and the two helpers every file uses: $ to find an element and el to create an SVG element.
 *
 * In this file: NS, X0, S, ME, FLIP, px, py, ix, iy, ROT, $, el()
 */

document.documentElement.dataset.ui = 'steel';

const NS = 'http://www.w3.org/2000/svg',
  X0 = 170,
  S = 7;

let ME = 'cs',
  FLIP = false;

const px = x => X0 + (FLIP ? x : 72 - x) * S,
  py = y => 40 + (FLIP ? 48 - y : y) * S,
  ix = p => (FLIP ? (p - X0) / S : 72 - (p - X0) / S),
  iy = p => (FLIP ? 48 - (p - 40) / S : (p - 40) / S),
  ROT = f => (f || 0) + (FLIP ? 0 : 180);

const $ = id => document.getElementById(id);

function el(tag, a, p) {
  const e = document.createElementNS(NS, tag);
  for (const k in a) e.setAttribute(k, a[k]);
  if (p) p.appendChild(e);
  return e;
}
