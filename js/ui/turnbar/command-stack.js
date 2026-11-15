/*
 * Command Stack in the turn bar
 *
 * Viewing and reordering the Command Stack.
 *
 * In this file: daimyoPick(), stackDnD(), stackView()
 */

/* reorder the Command Stack: drag a card onto another card to swap them, or between two cards to insert it there */
function daimyoPick(add) {
  (state.units || [])
    .filter(u => u.side === HU && /Daimyo/.test(u.charName || '') && regCardLive(u))
    .forEach(u => {
      const sl = bEl('select', { className: 'tf-in' });
      sl.setAttribute('aria-label', 'Daimyo Ideal');
      ['Ka', 'Chi', 'Sui', 'Fu'].forEach(k =>
        sl.append(bEl('option', { value: k, textContent: k + ' · ' + IDEAL[k][0] }))
      );
      sl.value = u.daimyoIdeal || 'Ka';
      sl.onchange = () =>
        putState({
          units: state.units.map(x => (x.id === u.id ? Object.assign({}, x, { daimyoIdeal: sl.value }) : x))
        });
      add(
        bEl('label', { className: 'ab-lab ab-inl' }, [
          bEl('span', { textContent: 'Daimyo (' + (u.short || u.name) + ') Ideal Card:' }),
          sl
        ])
      );
    });
}

function stackDnD(box, arr) {
  const items = Array.from(box.children);
  let drag = null;
  const clear = () => items.forEach(x => x.classList.remove('over', 'ins-b', 'ins-a'));
  const where = (x, y) => {
    const el = document.elementFromPoint(x, y),
      t = el && el.closest('ol.stackb>li');
    if (!t) return null;
    const r = t.getBoundingClientRect(),
      f = (y - r.top) / r.height;
    return { t, i: +t.dataset.i, mode: f < 0.25 ? 'before' : f > 0.75 ? 'after' : 'swap' };
  };
  items.forEach((li, i) => {
    li.dataset.i = i;
    li.classList.add('dnd');
    const g = document.createElement('span');
    g.className = 'grip';
    g.textContent = '⠿';
    g.setAttribute('aria-hidden', 'true');
    li.insertBefore(g, li.firstChild);
    const start = e => {
      if (e.target.closest('button')) return;
      if (e.pointerType !== 'mouse' && !e.target.closest('.grip')) return;
      e.preventDefault();
      drag = { i, w: null };
      li.classList.add('drag');
      const mv = ev => {
        const w = where(ev.clientX, ev.clientY);
        drag.w = w;
        clear();
        if (!w || w.i === i) return;
        w.t.classList.add(w.mode === 'swap' ? 'over' : w.mode === 'before' ? 'ins-b' : 'ins-a');
      };
      const up = () => {
        window.removeEventListener('pointermove', mv);
        window.removeEventListener('pointerup', up);
        li.classList.remove('drag');
        clear();
        const w = drag && drag.w;
        drag = null;
        if (!w || w.i === i) return;
        if (w.mode === 'swap') {
          [arr[i], arr[w.i]] = [arr[w.i], arr[i]];
        } else {
          const [x] = arr.splice(i, 1);
          let to = w.i + (w.mode === 'after' ? 1 : 0);
          if (i < to) to--;
          arr.splice(to, 0, x);
        }
        renderTurnbar();
      };
      window.addEventListener('pointermove', mv);
      window.addEventListener('pointerup', up);
    };
    li.addEventListener('pointerdown', start);
  });
}

function stackView() {
  if (!huStackOn() && !(PS() && PS().huHeld)) return null;
  const L = validCards(PS().huStack || []);
  const d = document.createElement('details');
  d.className = 'stackv';
  const sm = document.createElement('summary');
  sm.textContent = 'Your Command Stack (' + L.length + ' left)';
  d.appendChild(sm);
  const ol = document.createElement('ol');
  L.forEach(c => {
    const li = document.createElement('li');
    li.textContent = cardName(c);
    ol.appendChild(li);
  });
  d.appendChild(ol);
  if (huHeldOk() && PS().huHeld) d.appendChild(ptext('Strategic Stack: ' + cardName(PS().huHeld)));
  return d;
}
