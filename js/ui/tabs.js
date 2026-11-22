/*
 * Side tabs
 *
 * Switching between the Regiment and Armies tabs, and highlighting a regiment on the board.
 *
 * In this file: rightTab, setTab(), renderTabs(), hiUnit()
 */

/* Armies tab: both rosters next to the map */
let rightTab = 'reg';

function setTab(t) {
  rightTab = t;
  renderTabs();
}

function renderTabs() {
  const a = rightTab === 'army',
    g = rightTab === 'game';
  $('tab-reg').setAttribute('aria-selected', String(!a && !g));
  $('tab-army').setAttribute('aria-selected', String(a));
  $('tab-game').setAttribute('aria-selected', String(g));
  $('card').hidden = a || g;
  $('armies').hidden = !a;
  $('gamepanel').hidden = !g;
  const n = ((state && state.units) || []).filter(
    u => u.type !== 'marker' && !u.destroyed && u.onTable && !u.activated
  ).length;
  {
    const t = $('tab-army');
    t.textContent = 'Armies';
    if (state && (state.units || []).some(u => u.type !== 'marker')) {
      const b = document.createElement('span');
      b.className = 'tb-n';
      b.textContent = n;
      b.title = n + ' regiment' + (n === 1 ? '' : 's') + ' on the table still to activate';
      t.appendChild(b);
      t.setAttribute('aria-label', 'Armies, ' + n + ' still to activate');
    }
  }
  $('tab-game').textContent = state && SBX() ? 'Field' : 'Game';
  {
    const t = $('tab-reg');
    t.textContent = 'Regiment';
    if (act) {
      const b = document.createElement('span');
      b.className = 'tb-dot';
      b.title = 'A regiment is activating';
      t.appendChild(b);
    }
  }
}

function hiUnit(id, on) {
  const g = document.querySelector('#units g[data-id="' + id + '"]');
  if (g) g.classList.toggle('hi', on);
}
