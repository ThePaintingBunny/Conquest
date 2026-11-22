/*
 * Side panel extras
 *
 * Small additions to the regiment card and combat panel that make them quicker to read: a strength bar
 * under the regiment's name (a block per stand), and the combat steps marked done or current.
 *
 * In this file: cardStrength(), cbStepper()
 */

/* the regiment's strength under its name: stands left of stands, with a bar */
function cardStrength() {
  const meta = $('c-meta');
  if (!meta) return;
  let box = $('c-str');
  const u = byId(selId);
  if (!u || u.type === 'marker' || !u.onTable || u.destroyed) {
    if (box) box.hidden = true;
    return;
  }
  if (!box) {
    box = bEl('div', { id: 'c-str', className: 'c-str' });
    meta.after(box);
  }
  const L = live(u),
    T = u.stands || 1,
    pct = Math.max(0, Math.min(1, L / T));
  box.hidden = false;
  box.innerHTML = '';
  /* one block per stand (a long bar for big regiments); the stand that has taken wounds is partly filled */
  let bar;
  if (T <= 12) {
    let W = 0;
    try {
      W = +effStats(u).W || 0;
    } catch (e) {}
    bar = bEl('span', { className: 'c-blocks' });
    for (let i = 0; i < T; i++) {
      const b = bEl('i', { className: i < L ? (pct <= 0.34 ? 'low' : '') : 'gone' });
      if (i === L - 1 && u.wounds && W) {
        b.style.setProperty('--hp', Math.max(0.1, 1 - u.wounds / W) * 100 + '%');
        b.classList.add('hit');
      }
      bar.append(b);
    }
  } else {
    bar = bEl('i', { className: 'u-bar' });
    const fill = bEl('b', { className: pct <= 0.34 ? 'low' : '' });
    fill.style.width = Math.round(pct * 100) + '%';
    bar.append(fill);
  }
  box.append(
    bEl('span', { className: 'c-str-n', textContent: L + '/' + T + ' stands' }),
    bar,
    u.wounds
      ? bEl('span', {
          className: 'c-str-w',
          textContent: u.wounds + ' wound' + (u.wounds === 1 ? '' : 's') + ' on'
        })
      : ''
  );
  if (u.wounds) box.title = u.wounds + ' wound' + (u.wounds === 1 ? '' : 's') + ' on the next stand';
}

/* combat steps: the last one is the step to act on now, the ones before it are done */
function cbStepper() {
  if (!cb || $('combat').hidden) return;
  const steps = [...document.querySelectorAll('#combat .cstep')];
  steps.forEach((s, i) => {
    s.classList.toggle('cs-done', i < steps.length - 1);
    s.classList.toggle('cs-now', i === steps.length - 1);
  });
}
