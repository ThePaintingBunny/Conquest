/*
 * Dice on screen
 *
 * The rolling-die animation, small dice in the combat panel and the dice banner.
 *
 * In this file: lastRollAt, DSPEED, rollingN, animateDie(), PIPS, DSHOWN, dieMini(), banner(),
 *   bannerHide()
 */

let lastRollAt = -1e9;
const DSPEED = { fast: 700, normal: 1300, slow: 2000 };
let rollingN = 0;

function animateDie(d, v, cls) {
  const now = performance.now(),
    dur = DSPEED[SET.diceSpeed] || 850,
    end = lastRollAt + dur + Math.random() * dur * 0.35,
    left = end - now;
  if (left <= 60) {
    return false;
  }
  d.classList.add('rolling');
  d.style.setProperty('--rd', (left / 1000).toFixed(2) + 's');
  d.style.setProperty('--rx', (Math.random() * 18 - 9).toFixed(1) + 'px');
  rollingN++;
  document.body.classList.add('dice-rolling');
  const face = f => {
    [...d.children].forEach((p, i) => (p.className = PIPS[f] && PIPS[f].includes(i) ? 'on' : ''));
  };
  let f = 1 + Math.floor(Math.random() * 6);
  face(f);
  const iv = setInterval(() => {
    f = 1 + ((f + Math.floor(Math.random() * 4)) % 6);
    face(f);
  }, 70);
  setTimeout(() => {
    clearInterval(iv);
    face(v);
    d.classList.remove('rolling');
    if (cls)
      cls
        .split(' ')
        .filter(Boolean)
        .forEach(c => d.classList.add(c));
    d.classList.add('landed');
    rollingN = Math.max(0, rollingN - 1);
    if (!rollingN) document.body.classList.remove('dice-rolling');
  }, left);
  return true;
}

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const DSHOWN = new Set();

function dieMini(v, cls, key) {
  const d = document.createElement('span');
  d.className = 'md';
  d.setAttribute('role', 'img');
  d.setAttribute('aria-label', 'Die showing ' + v);
  for (let i = 0; i < 9; i++) {
    const p = document.createElement('i');
    if (PIPS[v] && PIPS[v].includes(i)) p.className = 'on';
    d.appendChild(p);
  }
  const fresh = !key || !DSHOWN.has(key);
  if (key) DSHOWN.add(key);
  if (!(fresh && SET.diceAnim && animateDie(d, v, cls || '')))
    (cls || '')
      .split(' ')
      .filter(Boolean)
      .forEach(c => d.classList.add(c));
  return d;
}

/* dice banner */
function banner(title, dice, text, cls) {
  const b = $('aibanner');
  b.hidden = false;
  $('aib-t').textContent = title;
  const d = $('aib-d');
  d.innerHTML = '';
  /* Settings: Show every die off shows only what the dice did */
  (SET.diceEach === false && text ? [] : dice || []).forEach(x => {
    const v = typeof x === 'object' ? x.v : x,
      c = typeof x === 'object' ? x.cls : '';
    d.appendChild(dieMini(v, c || ''));
  });
  $('aib-s').textContent = text || '';
}

function bannerHide() {
  $('aibanner').hidden = true;
}
