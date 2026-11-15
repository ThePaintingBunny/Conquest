/*
 * Test field: the panel
 *
 * Draws the test field controls. One long function, renderTestField.
 *
 * In this file: renderTestField()
 */

function renderTestField(tb, info, mk, add) {
  const nOn = s => (state.units || []).filter(u => u.side === s && u.type !== 'marker').length;
  info.textContent =
    'Test field: drop regiments for either side, set up the situation, then activate any of your regiments as often as you like. Nothing here is scored.';
  const top = bEl('div', { className: 'tf-row' });
  const ctl = bEl('div', { className: 'grp' });
  ctl.setAttribute('role', 'group');
  ctl.setAttribute('aria-label', 'You control');
  [
    ['cs', 'Control South (' + colName('cs') + ')'],
    ['nord', 'Control North (' + colName('nord') + ')']
  ].forEach(([sd, t]) => {
    const b = bEl('button', { type: 'button', textContent: t + ' · ' + nOn(sd) });
    b.setAttribute('aria-pressed', String(ME === sd));
    b.onclick = async () => {
      if (act) {
        toast('Finish or undo the current activation first.');
        return;
      }
      if (ME !== sd) {
        await putState({ sbSide: sd });
        applySeat();
        render();
      }
    };
    ctl.appendChild(b);
  });
  top.append(
    ctl,
    bEl('span', { className: 'tf-l', textContent: 'Round' }),
    abStepper(state.round || 1, 1, 10, v => putState({ round: v }), 'round'),
    mk(
      'Next round (ready everyone)',
      () => {
        if (act) {
          toast('Finish or undo the current activation first.');
          return;
        }
        const nr = Math.min(10, (state.round || 1) + 1),
          FRE = frRoundEnd(state.units || [], nr);
        putState({
          fr: FRE.fr,
          units: FRE.units.map(u =>
            Object.assign({}, u, {
              activated: false,
              charActivated: false,
              effects: (u.effects || []).filter(e => e === 'Broken' || /^Season: /.test(e))
            })
          ),
          round: nr,
          hammerUsed: false,
          strategicUsedRound: 0,
          moves: []
        });
      },
      true
    ),
    mk(
      'Ready everyone',
      () => tfUnits(u => Object.assign({}, u, { activated: false, charActivated: false })),
      true
    )
  );
  add(top);
  const t2 = bEl('div', { className: 'tf-row' });
  t2.append(
    mk(
      (state.terrain || []).length ? 'Shuffle terrain' : 'Add terrain',
      () => putState({ terrain: genTerrain() }),
      true
    )
  );
  {
    const b = mk(
      tfTerr ? 'Done editing terrain' : 'Place terrain',
      () => {
        tfTerr = !tfTerr;
        terrMode = 'manual';
        terrSel = null;
        terrKey = '';
        render();
      },
      true
    );
    b.setAttribute('aria-pressed', String(tfTerr));
    t2.append(b);
  }
  if ((state.terrain || []).length) t2.append(mk('Clear terrain', () => putState({ terrain: [] }), true));
  t2.append(
    mk(
      (state.zones || []).length ? 'Remove objective zones' : 'Add objective zones',
      () => putState({ zones: (state.zones || []).length ? [] : SCEN[7].zones }),
      true
    )
  );
  t2.append(
    mk(
      (state.units || []).length ? 'Clear the table' : 'Table is empty',
      () => {
        act = null;
        cb = null;
        selId = null;
        putState({ units: [], moves: [], fr: {}, sup: {}, army: { cs: [], nord: [] } });
      },
      true
    )
  );
  t2.append(mk('Leave the test field', tfLeave, true));
  t2.lastChild.classList.add('ng');
  t2.lastChild.previousSibling.disabled = !(state.units || []).length;
  {
    const cr = bEl('div', { className: 'tf-row col-row' });
    cr.append(colorPicker('cs', 'South colour', true), colorPicker('nord', 'North colour', true));
    add(cr);
  }
  add(t2);
  if (tfTerr) terrainPanel(add, mk);
  if (((state.army || {}).cs || []).length || ((state.army || {}).nord || []).length) add(armyRulesBox());
  if ((state.units || []).length) add(frPanel());
  // selected regiment: conditions
  const u = base(selId);
  if (u && u.type !== 'marker') {
    const box = bEl('div', { className: 'rev tf-sel' });
    box.append(bEl('h3', { textContent: 'Conditions · ' + u.name + (u.charName ? ' + ' + u.charName : '') }));
    if (!(act && act.id === u.id)) {
      const r0 = bEl('div', { className: 'tf-row' });
      const sg2 = bEl('div', { className: 'grp' });
      sg2.setAttribute('role', 'group');
      sg2.setAttribute('aria-label', 'Belongs to');
      [
        ['cs', 'South (' + colName('cs') + ')'],
        ['nord', 'North (' + colName('nord') + ')']
      ].forEach(([sd, t]) => {
        const b = bEl('button', { type: 'button', textContent: t });
        b.setAttribute('aria-pressed', String(u.side === sd));
        b.onclick = () => {
          if (u.side !== sd) tfSet(u.id, x => ({ side: sd, facing: ((x.facing || 0) + 180) % 360 }));
        };
        sg2.appendChild(b);
      });
      r0.append(bEl('span', { className: 'tf-l', textContent: 'Belongs to' }), sg2);
      box.append(r0);
    }
    if (act && act.id === u.id) {
      box.append(
        ptext(
          'Activating now: use the panel beside the map. Conditions unlock when the activation is saved or undone.'
        )
      );
      add(box);
    } else {
      {
        const sp = qaSpecOf(u);
        if (qaUnitE(sp.fac, sp.unit)) {
          const d = bEl('details', { className: 'qa-edit' });
          d.open = tfEditOpen;
          d.ontoggle = () => {
            tfEditOpen = d.open;
          };
          d.append(bEl('summary', { textContent: 'Setup: leader, stands, options, upgrades' }));
          d.append(qaForm(sp, ns => tfRebuild(u, ns), false));
          box.append(d);
        }
      }
      const r1 = bEl('div', { className: 'tf-row' });
      r1.append(
        bEl('span', { className: 'tf-l', textContent: 'Wounds taken' }),
        abStepper(u.wounds || 0, 0, tfWmax(u) - 1, v => tfSet(u.id, { wounds: v }), 'wounds')
      );
      r1.append(
        bEl('span', { className: 'tf-l', textContent: (u.stands || 1) + ' stands, ' + live(u) + ' left' })
      );
      if (u.auxStats)
        r1.append(
          bEl('span', { className: 'tf-l', textContent: (u.auxName || 'Auxiliary') + ' wounds' }),
          abStepper(
            u.auxWounds || 0,
            0,
            +u.auxStats.W || 6,
            v => tfSet(u.id, { auxWounds: v }),
            'auxiliary wounds'
          )
        );
      box.append(r1);
      const r2 = bEl('div', { className: 'tf-row' });
      r2.append(bEl('span', { className: 'tf-l', textContent: 'Effects' }));
      const E = u.effects || [];
      ['Broken', 'Inspired'].forEach(e => {
        const on = E.some(x => x === e || x.startsWith(e + ' ('));
        const b = abBtn(
          (on ? '✓ ' : '') + e,
          () =>
            tfSet(u.id, {
              effects: on ? E.filter(x => !(x === e || x.startsWith(e + ' ('))) : E.concat([e])
            }),
          'ab-tog' + (on ? ' on' : '')
        );
        b.setAttribute('aria-pressed', String(on));
        r2.append(b);
      });
      E.filter(e => !/^(Broken|Inspired)/.test(e)).forEach(e =>
        r2.append(
          abBtn('✕ ' + e, () => tfSet(u.id, { effects: E.filter(x => x !== e) }), 'ab-tog on', 'Remove ' + e)
        )
      );
      const inp = bEl('input', {
        type: 'text',
        value: tfFx,
        placeholder: 'Other effect, e.g. a spell',
        className: 'tf-in'
      });
      inp.setAttribute('aria-label', 'Add an effect');
      inp.oninput = () => {
        tfFx = inp.value;
      };
      const addFx = () => {
        const v = tfFx.trim();
        if (!v) return;
        tfFx = '';
        tfSet(u.id, { effects: E.concat([v]) });
      };
      inp.onkeydown = e => {
        if (e.key === 'Enter') addFx();
      };
      r2.append(inp, abBtn('Add', addFx, 'ab-ghost ab-small'));
      box.append(r2);
      const r3 = bEl('div', { className: 'tf-row' });
      if (u.activated || u.charActivated)
        r3.append(
          mk('Ready to activate again', () => tfSet(u.id, { activated: false, charActivated: false }))
        );
      if (u.onTable) {
        r3.append(
          mk('⟲ 15°', () => tfSet(u.id, { facing: ((u.facing || 0) - 15 + 360) % 360 }), true),
          mk('15° ⟳', () => tfSet(u.id, { facing: ((u.facing || 0) + 15) % 360 }), true),
          mk('Turn around', () => tfSet(u.id, { facing: ((u.facing || 0) + 180) % 360 }), true)
        );
        r3.append(
          mk(
            'Send to reserves',
            () => tfSet(u.id, { onTable: false, arriving: true, activated: false }),
            true
          )
        );
      } else
        r3.append(
          mk('Put it on the table', () => {
            const p = tfSpot(u.side, 0);
            tfSet(u.id, { onTable: true, arriving: false, x: p.x, y: Math.max(4, Math.min(44, p.y)) });
          })
        );
      r3.append(
        mk(
          'Remove from the field',
          () => {
            if (selId === u.id) selId = null;
            tfUnits(x => (x.id === u.id ? null : x));
          },
          true
        )
      );
      r3.lastChild.classList.add('ab-danger');
      box.append(r3);
      box.append(
        ptext(
          'Drag any regiment that is not activating to move it, whichever side it belongs to; Q and E turn the selected one. ' +
            (u.side === ME
              ? 'Activate it from the panel beside the map.'
              : 'It belongs to the side you are not controlling: switch control above to activate it, or charge it with one of yours.'),
          'hint'
        )
      );
      add(box);
    }
  } else
    add(
      ptext('Select a regiment on the map or in the rosters to set its wounds, effects and facing.', 'hint')
    );
  // adding regiments: the army builder with its own draft
  {
    const one = bEl('details', { className: 'rev tf-add' });
    one.open = tfOneOpen;
    one.ontoggle = () => {
      tfOneOpen = one.open;
    };
    one.append(bEl('summary', { textContent: 'Add one regiment' }));
    const r = bEl('div', { className: 'tf-row' });
    const g = bEl('div', { className: 'grp' });
    g.setAttribute('role', 'group');
    g.setAttribute('aria-label', 'Drop for');
    [
      ['cs', 'For South (' + colName('cs') + ')'],
      ['nord', 'For North (' + colName('nord') + ')']
    ].forEach(([sd, t]) => {
      const b = bEl('button', { type: 'button', textContent: t });
      b.setAttribute('aria-pressed', String(tfSide === sd));
      b.onclick = () => {
        tfSide = sd;
        renderTurnbar();
      };
      g.appendChild(b);
    });
    const lab = bEl('label', { className: 'tf-chk' });
    const cbx = bEl('input', { type: 'checkbox', checked: tfReserve });
    cbx.onchange = () => {
      tfReserve = cbx.checked;
    };
    lab.append(cbx, document.createTextNode(' Arrive from reserves'));
    r.append(g, lab);
    one.append(r);
    one.append(
      qaForm(
        qa,
        ns => {
          qa = ns;
          qaSave();
          renderTurnbar();
        },
        true
      )
    );
    const s0 = qaClean(qa),
      ok = !!qaUnitE(s0.fac, s0.unit);
    const go = mk(
      ok
        ? 'Drop ' +
            s0.unit +
            (s0.char ? ' with the ' + s0.char : '') +
            (tfReserve ? ' in reserves' : ' on the table')
        : 'Choose a regiment first',
      () => {
        const L = qaList(qa);
        if (!L || !L.units.length) {
          toast('Choose a regiment first.');
          return;
        }
        tfDrop(L, qaClean(qa));
      }
    );
    go.disabled = !ok;
    one.append(bEl('div', { className: 'tf-row' }, [go]));
    one.append(
      ptext(
        'Only legal choices are offered: characters that may join this regiment, its stand range, its own options and the upgrades that character may take. Press again to drop another. Change a regiment that is already on the table under Setup when you select it.',
        'hint'
      )
    );
    add(one);
  }
  const det = bEl('details', { className: 'rev tf-add' });
  det.open = tfAddOpen || (!(state.units || []).length && !tfOneOpen);
  det.ontoggle = () => {
    tfAddOpen = det.open;
  };
  det.append(bEl('summary', { textContent: 'Add whole warbands (army builder)' }));
  const r4 = bEl('div', { className: 'tf-row' });
  const sg = bEl('div', { className: 'grp' });
  sg.setAttribute('role', 'group');
  sg.setAttribute('aria-label', 'Drop for');
  [
    ['cs', 'For South (' + colName('cs') + ')'],
    ['nord', 'For North (' + colName('nord') + ')']
  ].forEach(([sd, t]) => {
    const b = bEl('button', { type: 'button', textContent: t });
    b.setAttribute('aria-pressed', String(tfSide === sd));
    b.onclick = () => {
      tfSide = sd;
      renderTurnbar();
    };
    sg.appendChild(b);
  });
  const lab = bEl('label', { className: 'tf-chk' });
  const cbx = bEl('input', { type: 'checkbox', checked: tfReserve });
  cbx.onchange = () => {
    tfReserve = cbx.checked;
  };
  lab.append(cbx, document.createTextNode(' Arrive from reserves (to test entering the table)'));
  r4.append(sg, lab);
  det.append(r4);
  det.append(
    ptext(
      'Build one or more warbands below, with options and upgrades, then drop them. Characters join the regiment you choose; use "Remove the character" afterwards to test a regiment on its own.',
      'hint'
    )
  );
  armyBuilder(
    e => det.appendChild(e),
    mk,
    L => tfDrop(L),
    'Drop on the table'
  );
  add(det);
}
