/*
 * Army builder: upgrade picker
 *
 * Choosing a character's upgrades.
 *
 * In this file: abUpgPicker(), abUpgrades()
 */

function abUpgPicker(f, w, wi) {
  const c = bldUnit(w.char),
    box = bEl('div', { className: 'ab-pick' });
  const U = UPG[f.name] || { rule: '', list: [] };
  box.append(
    bEl('div', { className: 'ab-pickh' }, [
      bEl('strong', { textContent: 'Upgrades for the ' + c.name }),
      abBtn(
        'Done',
        () => {
          abPick = null;
          renderTurnbar();
        },
        'ab-pri ab-small ab-keep'
      )
    ])
  );
  if (U.rule) box.append(bEl('p', { className: 'ab-note', textContent: U.rule }));
  const cats = [...new Set(U.list.map(x => x[0]))];
  cats.forEach(cat => {
    box.append(
      bEl('div', { className: 'ab-pickg' }, [bEl('span', { className: 'ab-lab-t', textContent: cat })])
    );
    const grid = bEl('div', { className: 'ab-pickgrid' });
    U.list
      .filter(x => x[0] === cat)
      .forEach(e => {
        const on = (w.upg || []).includes(e[1]),
          why = on ? '' : upgWhy(e, c, wi);
        const b = bEl('button', { type: 'button', className: 'ab-opt' + (on ? ' sel' : '') });
        b.setAttribute('aria-pressed', String(on));
        b.append(
          bEl('span', { className: 'ab-opth' }, [
            bEl('strong', { textContent: (on ? '✓ ' : '') + e[1] }),
            bEl('span', { className: 'ab-pts', textContent: e[2] ? e[2] + ' pts' : 'free' })
          ]),
          bEl('span', { className: 'ab-rules', textContent: e[4] }),
          bEl('span', { className: 'ab-meta', textContent: why || (e[3] === 'any' ? 'Any character' : e[3]) })
        );
        if (why && !on) b.disabled = true;
        b.onclick = () => {
          w.upg = w.upg || [];
          if (on) w.upg = w.upg.filter(n => n !== e[1]);
          else w.upg.push(e[1]);
          if (RIDE[e[1]]) {
            if (on) {
              if (w.joins != null && !joinable(w, w.regs[w.joins] || {}))
                w.joins = w.regs.findIndex(r => joinable(w, r));
              if (w.joins < 0) w.joins = null;
            } else riderFix(w);
          }
          abRe();
        };
        grid.append(b);
      });
    box.append(grid);
  });
  box.append(
    bEl('div', { className: 'ab-pickg' }, [
      bEl('span', { className: 'ab-lab-t', textContent: 'Not in the list' })
    ])
  );
  box.append(abUpgrades((w.custom = w.custom || []), 'w' + wi + 'c', 'Add another upgrade by hand'));
  return box;
}

function abUpgrades(list, key, label) {
  const box = bEl('div', { className: 'ab-upg' });
  (list || []).forEach((x, i) => {
    const c = abChip(x.name + ' · ' + x.pts + ' pts', 'ab-chip-u');
    c.append(
      abBtn(
        '×',
        () => {
          list.splice(i, 1);
          abRe();
        },
        'ab-x',
        'Remove ' + x.name
      )
    );
    box.append(c);
  });
  if (abUpg === key) {
    const nm = bEl('input', { type: 'text', placeholder: label, className: 'ab-in' }),
      pt = bEl('input', {
        type: 'number',
        placeholder: 'pts',
        min: '0',
        step: '5',
        className: 'ab-in ab-in-s'
      });
    nm.setAttribute('aria-label', label);
    pt.setAttribute('aria-label', 'Points');
    const ok = abBtn(
      'Add',
      () => {
        if (!nm.value.trim()) {
          nm.focus();
          return;
        }
        list.push({ name: nm.value.trim(), pts: +pt.value || 0 });
        abUpg = null;
        abRe();
      },
      'ab-pri'
    );
    const no = abBtn(
      'Cancel',
      () => {
        abUpg = null;
        renderTurnbar();
      },
      'ab-ghost'
    );
    nm.onkeydown = e => {
      if (e.key === 'Enter') ok.click();
    };
    pt.onkeydown = e => {
      if (e.key === 'Enter') ok.click();
    };
    box.append(bEl('span', { className: 'ab-upf' }, [nm, pt, ok, no]));
    setTimeout(() => {
      try {
        nm.focus();
      } catch (e) {}
    }, 0);
  } else
    box.append(
      abBtn(
        '+ ' + label,
        () => {
          abUpg = key;
          renderTurnbar();
        },
        'ab-ghost ab-small'
      )
    );
  return box;
}
