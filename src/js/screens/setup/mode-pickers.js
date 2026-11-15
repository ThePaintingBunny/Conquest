/*
 * Setup: how to bring an army
 *
 * Choosing the opponent and how to enter your army, and the seat names.
 *
 * In this file: armyModePicker(), modePicker(), SEATNAME
 */

function armyModePicker(add) {
  const g = document.createElement('div');
  g.className = 'grp';
  g.setAttribute('role', 'group');
  g.setAttribute('aria-label', 'How to enter your army');
  [
    ['build', 'Build it here'],
    ['paste', 'Paste a list']
  ].forEach(([m, t]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t;
    b.setAttribute('aria-pressed', String(armyMode === m));
    b.onclick = () => {
      armyMode = m;
      renderTurnbar();
    };
    g.appendChild(b);
  });
  add(g);
}

function modePicker(add) {
  const g = document.createElement('div');
  g.className = 'grp';
  g.setAttribute('role', 'group');
  g.setAttribute('aria-label', 'Opponent');
  [
    ['ai', 'Play against Claude'],
    ['pvp', 'Play against a friend'],
    ['test', 'Test field']
  ].forEach(([m, t]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t;
    b.setAttribute('aria-pressed', String((state.mode || 'ai') === m));
    b.onclick = () => {
      if (m === 'test') {
        tfEnter();
        return;
      }
      if ((state.mode || 'ai') !== m) putState({ mode: m });
    };
    g.appendChild(b);
  });
  add(g);
}

const SEATNAME = {
  get cs() {
    return 'South edge (' + colName('cs') + ')';
  },
  get nord() {
    return 'North edge (' + colName('nord') + ')';
  }
};
