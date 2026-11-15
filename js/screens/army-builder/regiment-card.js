/*
 * Army builder: regiment card
 *
 * One regiment in the list with its options.
 *
 * In this file: abRegCard()
 */

function abRegCard(f, w, wi, r, ri, choices) {
  const c = bldUnit(w.char),
    led = w.joins === ri && c && c.type !== 'Monster';
  const card = bEl('div', { className: 'ab-reg' + (led ? ' led' : '') });
  const key = r.modular ? 'modular' : r.chariots ? 'chariot' : r.unit,
    ch = choices.find(q => q.key === key),
    labHere = labaronOn(w) && ch && ch.cat === 'res',
    cat = ch ? (labHere && r.labaron ? 'main' : ch.cat) : null;
  const u = r.modular ? null : bldUnit(r.unit || (r.chariots || [])[0]);
  const title = r.modular ? 'Modular Regiment' : r.chariots ? 'War Chariots' : r.unit || '';
  const head = bEl('div', { className: 'ab-rh' });
  const tl = bEl('div', { className: 'ab-rt' });
  tl.append(bEl('h5', { textContent: title }));
  tl.append(
    abChip(
      cat === 'res' ? 'Restricted' : cat === 'main' ? 'Mainstay' : 'Not in this warband',
      cat === 'res' ? 'ab-res' : cat === 'main' ? 'ab-main' : 'ab-bad'
    )
  );
  if (led) tl.append(abChip('★ Led by the ' + c.name, 'ab-led'));
  const tr = bEl('div', { className: 'ab-rr' });
  tr.append(bEl('span', { className: 'ab-pts', textContent: rowPts(r) + ' pts' }));
  if (labHere) {
    const lb = abBtn(
      r.labaron ? 'Labaron: counts as Mainstay' : 'Labaron',
      () => {
        const on = !r.labaron;
        w.regs.forEach(q => delete q.labaron);
        if (on) r.labaron = true;
        abRe();
      },
      'ab-tog ab-small',
      'Sanctified Labaron: this Restricted regiment counts as Mainstay'
    );
    lb.setAttribute('aria-pressed', String(!!r.labaron));
    lb.title = 'Sanctified Labaron: one Restricted regiment of this warband counts as Mainstay.';
    tr.append(lb);
  }
  if (u) tr.append(abBtn('Details', () => enDetail(u, f.name), 'ab-ghost ab-small ab-keep'));
  tr.append(
    abBtn(
      'Remove',
      () => {
        w.regs.splice(ri, 1);
        if (w.joins === ri) w.joins = null;
        else if (w.joins > ri) w.joins--;
        abRe();
      },
      'ab-ghost ab-small ab-danger',
      'Remove ' + title
    )
  );
  head.append(tl, tr);
  card.append(head);
  if (r.modular) {
    const M = r.modular,
      mj = modJson(M);
    card.append(
      bEl('div', {
        className: 'ab-meta',
        textContent: `Medium Brute · ${modTotal(M)} stands · March ${mj.M}″ · Ideal Card ${MODULAR[M.cmd].role}`
      })
    );
    const cmdRow = bEl('div', { className: 'ab-row' });
    const cs = bEl('select', { className: 'ab-sel' });
    cs.setAttribute('aria-label', 'Command Stand type');
    Object.keys(MODULAR).forEach(t =>
      cs.appendChild(bEl('option', { value: t, textContent: t + ' [' + MODULAR[t].role + ']' }))
    );
    cs.value = M.cmd;
    cs.onchange = () => {
      M.cmd = cs.value;
      if (!+M.counts[M.cmd]) M.counts[M.cmd] = 2;
      abRe();
    };
    cmdRow.append(
      bEl('label', { className: 'ab-lab' }, [bEl('span', { textContent: 'Command Stand' }), cs]),
      bEl('span', {
        className: 'ab-note',
        textContent: 'Command rules for the whole regiment: ' + MODULAR[M.cmd].cmd
      })
    );
    card.append(cmdRow);
    const grid = bEl('div', { className: 'ab-mods' });
    Object.keys(MODULAR).forEach(t => {
      const n = +M.counts[t] || 0,
        X = MODULAR[t],
        eu = bldUnit(t);
      const tile = bEl('div', { className: 'ab-mod' + (n ? ' on' : '') + (t === M.cmd ? ' cmd' : '') });
      const th = bEl('div', { className: 'ab-modh' });
      th.append(
        bEl('strong', { textContent: t }),
        eu ? abBtn('Details', () => enDetail(eu, f.name), 'ab-link ab-keep', 'Details for ' + t) : null
      );
      tile.append(th);
      tile.append(
        bEl('div', {
          className: 'ab-meta',
          textContent: X.pts + ' pts per stand' + (t === M.cmd ? ' · Command' : '')
        })
      );
      tile.append(abMini({ M: X.M, V: X.V, C: X.C, A: X.A, W: X.W, R: X.R, D: X.D, E: X.E }));
      tile.append(bEl('div', { className: 'ab-rules', textContent: X.rules.join(', ') }));
      tile.append(
        abStepper(
          n,
          0,
          20,
          v => {
            M.counts[t] = Math.max(0, Math.min(20, v));
            abRe();
          },
          t + ' stands'
        )
      );
      grid.append(tile);
    });
    card.append(grid);
  } else if (r.chariots) {
    card.append(
      bEl('div', {
        className: 'ab-meta',
        textContent: 'One regiment slot holding 1 or 2 chariots; each chariot fights as its own regiment.'
      })
    );
    const row = bEl('div', { className: 'ab-row' });
    [0, 1].forEach(k => {
      const s2 = bEl('select', { className: 'ab-sel' });
      s2.setAttribute('aria-label', 'Chariot ' + (k + 1));
      if (k === 1) s2.appendChild(bEl('option', { value: '', textContent: 'No second chariot' }));
      (ch ? ch.chariots : []).forEach(n =>
        s2.appendChild(bEl('option', { value: n, textContent: n + ' · ' + (bldUnit(n) || {}).pts + ' pts' }))
      );
      s2.value = r.chariots[k] || '';
      s2.onchange = () => {
        r.chariots[k] = s2.value;
        abRe();
      };
      row.append(
        bEl('label', { className: 'ab-lab' }, [bEl('span', { textContent: 'Chariot ' + (k + 1) }), s2])
      );
    });
    card.append(row);
    r.chariots.filter(Boolean).forEach(n => {
      const cu = bldUnit(n);
      if (cu) {
        const l = bEl('div', { className: 'ab-row' });
        l.append(
          bEl('span', { className: 'ab-note', textContent: n }),
          abMini(cu.stats),
          abBtn('Details', () => enDetail(cu, f.name), 'ab-link ab-keep')
        );
        card.append(l);
      }
    });
  } else if (u) {
    const b = bldBase(u);
    card.append(
      bEl('div', {
        className: 'ab-meta',
        textContent: [
          [u.cls, u.type].filter(Boolean).join(' '),
          u.type !== 'Monster' && u.kind === 'reg' ? cmdText(u) : ''
        ]
          .filter(Boolean)
          .join(' · ')
      })
    );
    card.append(abMini(u.stats));
    if (u.rules.length) card.append(bEl('div', { className: 'ab-rules', textContent: u.rules.join(', ') }));
    const row = bEl('div', { className: 'ab-row' });
    if (u.kind !== 'char' && !/^1 stand/.test(u.stands)) {
      row.append(
        bEl('span', { className: 'ab-lab ab-inl' }, [
          bEl('span', { textContent: 'Stands' }),
          abStepper(
            r.stands || b,
            b,
            12,
            v => {
              r.stands = Math.max(b, Math.min(12, v));
              abRe();
            },
            'stands'
          ),
          bEl('span', {
            className: 'ab-note',
            textContent: u.extra ? '+' + u.extra + ' pts each above ' + b : ''
          })
        ])
      );
    }
    if (row.children.length) card.append(row);
    const O = regOptions(u);
    if (O.opts.length) {
      const offN = (r.opts || []).filter(n => (O.opts.find(o => o.name === n) || {}).kind === 'off').length,
        hasAux = (r.opts || []).some(n => (O.opts.find(z => z.name === n) || {}).kind === 'aux');
      const og = bEl('div', { className: 'ab-opts' });
      og.append(
        bEl('span', {
          className: 'ab-lab-t',
          textContent:
            'Options' +
            (O.max != null ? ' (Officers: up to ' + O.max + ', each once; an Auxiliary does not count)' : '')
        })
      );
      const oi = infoLine(
        (r.opts || []).length
          ? (r.opts || [])
              .map(n => optInfo(O.opts.find(o => o.name === n)))
              .filter(Boolean)
              .join('\n')
          : null
      );
      O.opts.forEach(o => {
        const on = (r.opts || []).includes(o.name);
        const t = abBtn(
          (on ? '✓ ' : '') + o.name + (o.detail ? ' (' + o.detail + ')' : '') + ' +' + o.cost,
          () => {
            r.opts = r.opts || [];
            if (on) r.opts = r.opts.filter(n => n !== o.name);
            else r.opts.push(o.name);
            abRe();
          },
          'ab-tog' + (on ? ' on' : '')
        );
        t.setAttribute('aria-pressed', String(on));
        if (!on && ((o.kind === 'off' && O.max != null && offN >= O.max) || (o.kind === 'aux' && hasAux)))
          t.disabled = true;
        hookInfo(t, optInfo(o), oi);
        og.append(t);
      });
      og.append(oi);
      card.append(og);
    }
  }
  card.append(abUpgrades((r.custom = r.custom || []), 'w' + wi + 'r' + ri, 'Add upgrade'));
  return card;
}
