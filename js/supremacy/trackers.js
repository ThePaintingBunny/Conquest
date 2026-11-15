/*
 * Supremacy trackers
 *
 * Shows Supremacy counters and pools in the faction trackers panel.
 *
 * In this file: supTrackers()
 */

function supTrackers(side, box, mine) {
  const S = supOf(side);
  if (!S) return;
  if (S.k === 'Field Studies') {
    const n = fsTok(side);
    box.append(
      frRow(
        'Observation tokens: ' + n + ' / 4',
        mine
          ? abBtn(
              'Spend 1 (Practitioner: roll 1 extra die, pick any result)',
              () => putState({ sup: supMemo(side, { fs: n - 1 }) }),
              'ab-tog'
            )
          : null
      )
    );
    if (mine && n >= 3) {
      const L = (state.units || []).filter(u => u.side === side && srAlive(u) && u.type !== 'monster');
      const sel = bEl('select', { className: 'tf-in' });
      sel.setAttribute('aria-label', 'Field Studies target');
      L.forEach(u => sel.append(bEl('option', { value: u.id, textContent: u.short || u.name })));
      box.append(
        frRow(
          'Spend 3 (on your last card): loses Broken, heals 5:',
          sel,
          abBtn(
            'Spend 3',
            () =>
              putState({
                sup: supMemo(side, { fs: n - 3 }),
                units: state.units.map(x =>
                  x.id === sel.value
                    ? Object.assign({}, x, {
                        effects: (x.effects || []).filter(e => e !== 'Broken'),
                        wounds: canHeal(x) ? Math.max(0, (x.wounds || 0) - 5) : x.wounds
                      })
                    : x
                )
              }),
            'ab-tog'
          )
        )
      );
    }
    box.append(
      ptext(
        'Spending 2 to stop a Strain Expression’s Decay is offered on the regiment when it uses Strain Expression. A token is added automatically whenever a regiment is destroyed.'
      )
    );
  }
  if (S.k === 'Tricks of the Trade') {
    const P = totPool(side);
    if (!supMem(side).pool) {
      if (mine)
        box.append(
          frRow(
            'Influence Pool:',
            abBtn(
              'Roll the Influence Pool (5 dice)',
              () => putState({ sup: supMemo(side, { pool: Array.from({ length: 5 }, d6) }) }),
              'ab-tog'
            )
          )
        );
    } else {
      const r = frRow(
        'Influence Pool (click a die to spend it instead of rolling; not for Reinforcement or Supremacy rolls):'
      );
      P.forEach((v, i) => {
        const b = abBtn(
          String(v),
          () => {
            const q = P.slice();
            q.splice(i, 1);
            putState({ sup: supMemo(side, { pool: q }) });
            toast('Influence die ' + v + ' spent: use ' + v + ' as that roll’s result.');
          },
          'ab-sq'
        );
        if (!mine) b.disabled = true;
        r.append(b);
      });
      if (!P.length) r.append(bEl('span', { textContent: 'empty' }));
      box.append(r);
      box.append(ptext('Your unmodified Supremacy roll is added to the pool each round.'));
    }
  }
}
