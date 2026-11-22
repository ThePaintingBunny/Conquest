/*
 * Game tab overview
 *
 * The parts of the Game tab around your card: the score (Victory Points, the round, the zones each side holds),
 * the next cards of your Command Stack, and everything else (victory conditions, army and faction rules, the game
 * log, the connection, the host console) as one list of rows with an icon. New game sits under it as a quiet link.
 *
 * In this file: GP_ICONS, gpScore(), gpNext(), gpList()
 */

/* the icon for each row of the list, by the start of its title */
const GP_ICONS = [
  [/^Your Command Stack/, 'roster'],
  [/^Victory/, 'banner'],
  [/^Army rules/, 'book'],
  [/^Faction rules/, 'star'],
  [/^Game log/, 'openBook'],
  [/^Connection/, 'people'],
  [/^Host override/, 'gear']
];

/* Victory Points, the round and the zones held */
function gpScore() {
  const box = $('gp-score');
  if (!box) return;
  box.innerHTML = '';
  const st = state && state.step;
  const on = !!state && tbInTop() && !!state.round && !['setup', 'review'].includes(st);
  box.hidden = !on;
  if (!on) return;
  const vp = state.vp || {},
    held = { cs: 0, nord: 0 };
  try {
    zoneControl().forEach(z => {
      if (z.holder === 'cs' || z.holder === 'nord') held[z.holder]++;
    });
  } catch (e) {}
  const sides = PVP() ? [seatSide() || 'cs', other(seatSide() || 'cs')] : [HU, AI];
  const v = s => bEl('div', { className: 'gs-v ' + s }, [bEl('b', { textContent: String(+vp[s] || 0) }), bEl('small', { textContent: N(s) })]);
  box.append(
    bEl('h3', { textContent: 'Score · round ' + (state.round || 1) + ' of ' + (state.maxRounds || 10) }),
    bEl('div', { className: 'gs-row' }, [
      v(sides[0]),
      bEl('div', { className: 'gs-z' }, [
        bEl('small', { textContent: 'Zones held' }),
        bEl('b', { textContent: held[sides[0]] + ' – ' + held[sides[1]] })
      ]),
      v(sides[1])
    ])
  );
}

/* the next cards in your Command Stack */
function gpNext() {
  const box = $('gp-next');
  if (!box) return;
  box.innerHTML = '';
  let L = [];
  try {
    L = tbInTop() && huStackOn() && !(PVP() && !seatSide()) ? validCards(PS().huStack || []) : [];
  } catch (e) {}
  /* the card on top is the one being played now */
  if (!$('gp-card').hidden && L.length) L = L.slice(1);
  const ordering = !$('gp-stack').hidden;
  box.hidden = !L.length || ordering;
  if (box.hidden) return;
  const row = bEl('div', { className: 'gn-row' });
  L.slice(0, 3).forEach((c, i) => row.append(bEl('span', { className: i ? '' : 'first', textContent: cardName(c), title: cardName(c) })));
  if (L.length > 3) row.append(bEl('span', { className: 'more', textContent: '+' + (L.length - 3) }));
  box.append(bEl('h3', { textContent: 'Your Command Stack · next up' }), row);
}

/* everything else: one list of rows, each opening as before; New game below it as a quiet link */
function gpList(gp) {
  const rows = [...gp.children].filter(k => k.tagName === 'DETAILS');
  const ng = [...gp.children].filter(k => k.classList && k.classList.contains('ng'));
  if (!rows.length && !ng.length) return;
  const list = bEl('div', { className: 'gp-list' });
  rows.forEach(d => {
    const sm = d.querySelector(':scope > summary');
    if (sm && !sm.querySelector('.gp-ic')) {
      const t = sm.textContent.trim(),
        m = GP_ICONS.find(([re]) => re.test(t));
      const ic = bEl('span', { className: 'gp-ic' });
      ic.append((m && icon(m[1], 16)) || '');
      sm.prepend(ic);
    }
    list.append(d);
  });
  gp.append(bEl('h3', { className: 'gp-lh', textContent: 'Rules and more' }), list);
  if (ng.length) gp.append(bEl('div', { className: 'gp-ng' }, ng));
}
