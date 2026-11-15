/*
 * Army builder: small controls
 *
 * Buttons, steppers, chips and the list of problems.
 *
 * In this file: abPick, abUpg, abArm, abArmed(), abBtn(), abRe(), abStepper(), abMini(), abChip(),
 *   abIssues()
 */

let abPick = null,
  abUpg = null,
  abArm = null;

function abArmed(k, fn) {
  if (abArm === k) {
    abArm = null;
    fn();
    return;
  }
  abArm = k;
  renderTurnbar();
  setTimeout(() => {
    if (abArm === k) {
      abArm = null;
      renderTurnbar();
    }
  }, 4000);
} // open pickers: {wb:index|'new'}; open upgrade form key

function abBtn(t, fn, cls, label) {
  const b = bEl('button', { type: 'button', className: 'ab-b' + (cls ? ' ' + cls : ''), textContent: t });
  b.onclick = fn;
  if (label) b.setAttribute('aria-label', label);
  b.disabled = aiBusy && !/ab-keep/.test(cls || '');
  return b;
}

function abRe() {
  wlFix();
  bldSave();
  renderTurnbar();
  /* the Army builder page of the main menu holds its own copy of the builder: redraw that too */
  try {
    if (mmCurrent() === 'army') renderMenu();
  } catch (e) {}
}

function abStepper(val, min, max, onSet, label) {
  const w = bEl('span', { className: 'ab-step' });
  const m = abBtn('−', () => onSet(val - 1), 'ab-sq', 'Fewer ' + label),
    p = abBtn('+', () => onSet(val + 1), 'ab-sq', 'More ' + label);
  m.disabled = val <= min;
  p.disabled = val >= max;
  const n = bEl('span', { className: 'ab-n', textContent: String(val) });
  n.setAttribute('aria-label', label + ': ' + val);
  w.append(m, n, p);
  return w;
}

function abMini(st) {
  const g = bEl('div', { className: 'ab-mini' });
  ['M', 'V', 'C', 'A', 'W', 'R', 'D', 'E'].forEach(k => {
    const v = st[k];
    g.append(
      bEl('span', { className: 'ab-mk', textContent: k }),
      bEl('span', { className: 'ab-mv', textContent: v === '-' || v == null ? '–' : String(v) })
    );
  });
  return g;
}

function abChip(t, cls) {
  return bEl('span', { className: 'ab-chip' + (cls ? ' ' + cls : ''), textContent: t });
}

function abIssues(list, okText) {
  const d = bEl('div', { className: 'ab-iss' + (list.length ? '' : ' ok') });
  if (!list.length) {
    d.append(bEl('span', { textContent: '✓ ' + okText }));
    return d;
  }
  const ul = bEl('ul');
  list.forEach(t => ul.append(bEl('li', { textContent: t })));
  d.append(ul);
  return d;
}
