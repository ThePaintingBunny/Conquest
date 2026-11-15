/*
 * Main menu: layout
 *
 * Groups the cards of the main menu by what they are for: playing a game first and largest, then the tools,
 * then the settings as small buttons.
 *
 * In this file: mmLayout()
 */

function mmLayout(grid) {
  const cards = [...grid.children];
  const named = t => cards.find(c => (c.querySelector('strong') || {}).textContent === t);
  const groups = [
    [
      'Play',
      'mm-play',
      cards.filter(c => c.classList.contains('pri')).concat([named('Single player'), named('Multiplayer')])
    ],
    ['Tools', 'mm-tools', ['Army builder', 'Test field', 'Combat calculator', 'Encyclopedia'].map(named)],
    ['', 'mm-sets', ['Settings', 'Claude settings'].map(named)]
  ];
  const used = new Set();
  const out = [];
  groups.forEach(([title, cls, list]) => {
    list = list.filter(Boolean);
    if (!list.length) return;
    const sec = bEl('section', { className: 'mm-sec ' + cls });
    if (title) sec.append(bEl('h2', { className: 'mm-sech', textContent: title }));
    const row = bEl('div', { className: 'mm-row' });
    list.forEach(c => {
      used.add(c);
      row.append(c);
    });
    sec.append(row);
    out.push(sec);
  });
  /* anything this function does not know about stays visible, with the tools */
  const rest = cards.filter(c => !used.has(c));
  if (rest.length && out[1]) rest.forEach(c => out[1].querySelector('.mm-row').append(c));
  grid.classList.add('mm-grouped');
  grid.append(...out);
}
