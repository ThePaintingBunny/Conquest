/*
 * Old Dominion
 *
 * Memories of Old, the Dark Power track with its tiers and gauge, and the token sources (Acolytes,
 * Divine Shard, Font of Dark Power).
 *
 * In this file: memOf(), odPts(), odTier(), odTierU(), odThr(), OD_T4, odT4ok(), ROMAN, odGauge(),
 *   renderOdTrk(), odLost(), odFontU(), odPendingBox()
 */

/* Old Dominion */
function memOf(u) {
  if (frFac(u) !== 'Old Dominion') return null;
  const e = frEncy(u);
  const m = e && String(e.options || '').match(/Memory of Old:\s*([^;]+)/);
  if (!m) return null;
  const rules = m[1]
    .split(/,\s*/)
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => t.replace(/^(.*?)\s*\+(\d+)$/, '$1 (+$2)'));
  return { text: m[1].trim(), rules };
}

function odPts(side) {
  if (SBX()) return 2000;
  const L = state.setup && state.setup[side];
  const n =
    (L && +L.points) ||
    (state.units || []).filter(u => u.side === side).reduce((a, u) => a + (+u.points || 0), 0);
  return n >= 500 ? n : 2000;
}

function odTier(side, pool) {
  const g = frG(side, 'od'),
    n = +g[pool] || 0,
    s = Math.trunc((odPts(side) - 2000) / 250) * 2,
    t4ok = pool === 'dark' && odT4ok(side);
  if (t4ok && n >= 23 + s) return 4;
  return n >= 18 + s ? 3 : n >= 9 + s ? 2 : 1;
}

/* the Dark Power tier a regiment counts as being under (Legio I 'Primigenia': +1 while its character is attached) */
function odTierU(u, pool) {
  const t = odTier(u.side, pool);
  return pool === 'dark' && u && u.charName && upgOf(u, /Primigenia/) ? Math.min(4, t + 1) : t;
}

function odThr(side) {
  const s = Math.trunc((odPts(side) - 2000) / 250) * 2;
  return [9 + s, 18 + s, 23 + s];
}

/* Dark Power reaches Tier IV only under a Supremacy Ability that says so (Obdurate Bone and Stone, Master of the
   Legions, Glimmers of a Golden Age), whether the Warlord's or an allied one's */
const OD_T4 = ['Obdurate Bone and Stone', 'Master of the Legions', 'Glimmers of a Golden Age'];
function odT4ok(side) {
  return supAll(side).some(S => OD_T4.includes(S.k));
}

const ROMAN = ['', 'I', 'II', 'III', 'IV'];

/* a token gauge: count, tier, and how far to the next tier */
function odGauge(side, pool, who) {
  const n = +frG(side, 'od')[pool] || 0,
    t = odTier(side, pool),
    th = odThr(side),
    maxT = pool === 'dark' && odT4ok(side) ? 4 : 3,
    top = th[maxT - 2] + 2;
  const nextAt = t < maxT ? th[t - 1] : null,
    name = pool === 'dark' ? 'Dark Power' : 'Fallen Pantheon';
  const b = bEl('button', { type: 'button', className: 'odg ' + pool });
  b.title = 'Open the Faction rules panel to change the tokens';
  b.setAttribute(
    'aria-label',
    (who ? who + ': ' : '') +
      name +
      ' ' +
      n +
      ' tokens, Tier ' +
      ROMAN[t] +
      (nextAt != null ? ', ' + (nextAt - n) + ' more to Tier ' + ROMAN[t + 1] : '')
  );
  const bar = bEl('div', { className: 'odg-bar' });
  const fill = bEl('i');
  fill.style.width = Math.min(100, (n / top) * 100) + '%';
  bar.append(fill);
  th.slice(0, maxT - 1).forEach(v => {
    const m = bEl('b');
    m.style.left = Math.min(100, (v / top) * 100) + '%';
    bar.append(m);
  });
  b.append(
    bEl('span', { className: 'odg-n', textContent: String(n) }),
    bEl(
      'span',
      { className: 'odg-m' },
      [
        who ? bEl('span', { className: 'odg-who', textContent: who }) : null,
        bEl(
          'span',
          { className: 'odg-l' },
          [
            bEl('span', { textContent: name }),
            bEl('span', { className: 'odg-t', textContent: 'Tier ' + ROMAN[t] })
          ].filter(Boolean)
        ),
        bar,
        bEl('span', {
          className: 'odg-s',
          textContent:
            nextAt != null
              ? nextAt - n + ' more to Tier ' + ROMAN[t + 1] + ' (at ' + nextAt + ')'
              : 'Highest tier reached'
        })
      ].filter(Boolean)
    )
  );
  b.onclick = () => {
    frOpen = true;
    renderTurnbar();
    const d = document.querySelector('#turnbar .fr-panel');
    if (d) d.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  return b;
}

function renderOdTrk() {
  const el = $('od-trk');
  if (!el) return;
  el.innerHTML = '';
  if (!state || ['setup', 'review'].includes(state.step || '')) {
    el.hidden = true;
    return;
  }
  const sides = SBX() ? ['cs', 'nord'] : PVP() ? [ME, other(ME)] : [HU, AI];
  sides.forEach(side => {
    if (!frFacs(side).includes('Old Dominion')) return;
    const who = SBX()
      ? side === 'cs'
        ? 'South'
        : 'North'
      : side === ME
        ? PN(side) || 'You'
        : PN(side) || N(side);
    el.append(odGauge(side, 'dark', who), odGauge(side, 'pant', who));
    const mine = SBX() || (PVP() ? side === ME : side === HU);
    if (!mine) return;
    const g = frG(side, 'od'),
      R = state.round || 1,
      due = bEl('div', { className: 'od-due' });
    if (g.soma !== R && (state.step || '') !== 'setup')
      due.append(
        frRow(
          'Blasphemous Soma, round ' + R + ': 1 token, your choice:',
          abBtn('+1 Dark Power', () => frSet(side, 'od', { dark: (+g.dark || 0) + 1, soma: R }), 'ab-tog'),
          abBtn(
            '+1 Fallen Pantheon',
            () => frSet(side, 'od', { pant: (+g.pant || 0) + 1, soma: R }),
            'ab-tog'
          )
        )
      );
    try {
      odPendingBox(side, due, g, true);
    } catch (e) {}
    if (due.children.length) {
      due.prepend(bEl('div', { className: 'odg-who', textContent: who + ' · tokens to place' }));
      el.append(due);
    }
  });
  el.hidden = !el.children.length;
}

function odLost(side) {
  return (state.units || [])
    .filter(u => u.side === side && u.type !== 'marker' && animate(u))
    .reduce((a, u) => a + (u.destroyed ? u.stands || 0 : Math.max(0, (u.stands || 0) - live(u))), 0);
}

/* ---- Old Dominion token sources: Acolytes, Divine Shard, Font of Dark Power ---- */
function odFontU(u) {
  return (state.units || []).some(
    x =>
      x.side === u.side &&
      srAlive(x) &&
      /Fallen Divinity/.test((x.charName || '') + ' ' + x.name) &&
      (x.id === u.id || srNear(x, u, 12))
  );
}

function odPendingBox(side, box, g, mine) {
  const R = srRound();
  const seenU = Object.assign({}, g.seenU || {});
  let init = false;
  if (!g.seenU && (+g.seen || 0) > 0) {
    (state.units || [])
      .filter(u => u.side === side && u.type !== 'marker' && animate(u))
      .forEach(u => {
        seenU[u.id] = u.destroyed ? u.stands || 0 : Math.max(0, (u.stands || 0) - live(u));
      });
    init = true;
  }
  if (init) {
    frSet(side, 'od', { seenU });
    return;
  }
  (state.units || [])
    .filter(u => u.side === side && u.type !== 'marker' && animate(u))
    .forEach(u => {
      const lost = u.destroyed ? u.stands || 0 : Math.max(0, (u.stands || 0) - live(u)),
        p = lost - (+seenU[u.id] || 0);
      if (p <= 0) return;
      const font = odFontU(u),
        shard = rh(u.rules, 'Divine Shard'),
        nm = u.short || u.name;
      const give = (pool, n) =>
        frSet(side, 'od', {
          [pool]: (+frG(side, 'od')[pool] || 0) + n,
          seenU: Object.assign({}, frG(side, 'od').seenU || {}, {
            [u.id]: (+(frG(side, 'od').seenU || {})[u.id] || 0) + 1
          })
        });
      const row = frRow(
        nm +
          ': ' +
          p +
          ' stand' +
          (p > 1 ? 's' : '') +
          ' lost, 1 token each' +
          (font ? ' (Font of Dark Power: Fallen Pantheon only)' : '') +
          (shard ? ' (Divine Shard: +1 if Fallen Pantheon)' : '') +
          ':',
        font ? null : abBtn('+1 Dark Power', () => give('dark', 1), 'ab-tog'),
        abBtn('+' + (shard ? 2 : 1) + ' Fallen Pantheon', () => give('pant', shard ? 2 : 1), 'ab-tog')
      );
      box.append(row);
    });
  const aco = +g.aco || 0;
  if (aco > 0)
    box.append(
      frRow(
        'Acolytes: ' + aco + ' Power token' + (aco > 1 ? 's' : '') + ' to allocate:',
        abBtn('+1 Dark Power', () => frSet(side, 'od', { dark: (+g.dark || 0) + 1, aco: aco - 1 }), 'ab-tog'),
        abBtn(
          '+1 Fallen Pantheon',
          () => frSet(side, 'od', { pant: (+g.pant || 0) + 1, aco: aco - 1 }),
          'ab-tog'
        )
      )
    );
}
