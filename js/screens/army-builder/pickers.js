/*
 * Army builder: adding regiments and characters
 *
 * The pickers for a new regiment or character.
 *
 * In this file: abPicker(), abCharPicker()
 */

function abPicker(f, w, wi, choices) {
  const R = wbRules(bldUnit(w.char), w),
    box = bEl('div', { className: 'ab-pick' });
  box.append(
    bEl('div', { className: 'ab-pickh' }, [
      bEl('strong', { textContent: 'Choose a regiment for this warband' }),
      abBtn(
        'Cancel',
        () => {
          abPick = null;
          renderTurnbar();
        },
        'ab-ghost ab-small'
      )
    ])
  );
  const nRes = w.regs.filter(r => {
    const k = r.modular ? 'modular' : r.chariots ? 'chariot' : r.unit;
    const x = choices.find(q => q.key === k);
    return x && x.cat === 'res';
  }).length;
  [
    ['main', 'Mainstay', 'Any number, up to the warband limit'],
    ['res', 'Restricted', 'At most 2, and each needs a Mainstay']
  ].forEach(([cat, lab, hint]) => {
    const list = choices.filter(x => x.cat === cat);
    if (!list.length) return;
    box.append(
      bEl('div', { className: 'ab-pickg' }, [
        bEl('span', { className: 'ab-lab-t', textContent: lab }),
        bEl('span', { className: 'ab-note', textContent: hint })
      ])
    );
    const grid = bEl('div', { className: 'ab-pickgrid' });
    list.forEach(x => {
      const u0 = x.unit ? bldUnit(x.unit) : null;
      const b = bEl('button', { type: 'button', className: 'ab-opt' });
      b.append(
        bEl('strong', {
          textContent: x.modular ? 'Modular Regiment' : x.chariots ? 'War Chariots' : x.label
        }),
        bEl('span', {
          className: 'ab-meta',
          textContent: x.modular
            ? 'Mix Ayakashi, Bushi and Origami stands'
            : x.chariots
              ? '1 or 2 chariots, one slot'
              : [[u0.cls, u0.type].filter(Boolean).join(' '), u0.pts + ' pts'].join(' · ')
        })
      );
      if (cat === 'res' && nRes >= 2) {
        b.disabled = true;
        b.title = 'Already 2 Restricted choices';
      }
      b.onclick = () => {
        if (x.modular)
          w.regs.push({ modular: { cmd: 'Oni Ayakashi', counts: { 'Oni Ayakashi': 2 } }, custom: [] });
        else if (x.chariots) w.regs.push({ chariots: [x.chariots[0], ''] });
        else {
          const u = bldUnit(x.unit);
          w.regs.push({ unit: x.unit, stands: bldBase(u), opts: [], custom: [] });
        }
        if (w.joins == null && joinable(w, w.regs[w.regs.length - 1])) w.joins = w.regs.length - 1;
        abPick = null;
        abRe();
      };
      grid.append(b);
    });
    box.append(grid);
  });
  return box;
}

function abCharPicker(f, chars, onPick, title) {
  const box = bEl('div', { className: 'ab-pick' });
  box.append(
    bEl('div', { className: 'ab-pickh' }, [
      bEl('strong', { textContent: title }),
      abBtn(
        'Cancel',
        () => {
          abPick = null;
          renderTurnbar();
        },
        'ab-ghost ab-small'
      )
    ])
  );
  const grid = bEl('div', { className: 'ab-pickgrid' });
  chars.forEach(x => {
    const b = bEl('button', { type: 'button', className: 'ab-opt' });
    b.append(
      bEl('strong', { textContent: x.name }),
      bEl('span', {
        className: 'ab-meta',
        textContent: [[x.cls, x.type].filter(Boolean).join(' '), x.pts + ' pts'].join(' · ')
      }),
      bEl('span', { className: 'ab-rules', textContent: x.rules.slice(0, 4).join(', ') })
    );
    b.onclick = () => onPick(x);
    grid.append(b);
  });
  box.append(grid);
  return box;
}
