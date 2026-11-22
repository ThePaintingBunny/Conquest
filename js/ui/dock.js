/*
 * Command dock
 *
 * A bar under the table while a regiment activates: on the left the regiment and how many actions it has left, in
 * the middle the actions it may take as tiles (or, while an action runs, that action's own controls), on the right
 * End activation and Undo (or Finish and Cancel). The side column keeps the regiment's profile, its Draw Events and
 * the actions done so far. The dock's buttons press the regiment card's own buttons, so each is wired in one place.
 * Number keys 1–9 start the action on that tile; Enter finishes the action, or ends the activation.
 *
 * In this file: DOCK_ICO, dockOn(), dockTiles(), dockDraw(), dockDrawTiles(), dockBtn(), renderDock(),
 *   dockKeys(), dockBuilder()
 */

/* an icon for each kind of action */
const DOCK_ICO = {
  march: 'arrowR',
  fadv: 'arrowR',
  dtmarch: 'arrowR',
  soar: 'arrowR',
  sweep: 'arrowR',
  tloc: 'arrowR',
  charge: 'charge',
  clash: 'swords',
  xclash: 'swords',
  duel: 'swords',
  assassin: 'swords',
  reform: 'turn',
  creform: 'turn',
  xreform: 'turn',
  fluid: 'turn',
  hammer: 'turn',
  volley: 'target',
  xvolley: 'target',
  flame: 'target',
  aim: 'target',
  withdraw: 'back',
  leave: 'back',
  rally: 'banner',
  crally: 'banner',
  inspire: 'star',
  memory: 'spark',
  cast: 'spark',
  trample: 'spark'
};

/* is the dock showing an activation (a regiment of ours is activating and is the one looked at)? */
function dockOn() {
  const u = act && byId(act.id);
  return (
    !!u &&
    selId === act.id &&
    !mapEdit &&
    !scenEdit &&
    !document.body.classList.contains('mm-on') &&
    !document.body.classList.contains('replaying')
  );
}

/* the actions as tiles, numbered for the keys */
function dockTiles(u) {
  const box = bEl('div', { className: 'dk-tiles' });
  availableActions(u)
    .slice(0, 9)
    .forEach((a, i) => {
      const m = ACT[a.type] || { n: a.type, d: '' };
      let det = m.d;
      if (a.type === 'march') {
        const first = act.entering && !act.actions.some(x => x.type === 'march');
        det = `${(u.m || 0) + (first ? u.vanguard || 0 : 0)}″ · sideways and back at half`;
      }
      if (a.type === 'charge') det = `D6 + ${u.m}″`;
      const b = bEl('button', { type: 'button', className: 'dk-t' });
      b.disabled = !!a.why;
      b.title = a.why || m.d || '';
      b.dataset.key = String(i + 1);
      b.append(
        bEl('span', { className: 'dk-ti' }, [icon(DOCK_ICO[a.type] || 'spark', 18) || '']),
        bEl('span', { className: 'dk-tn', textContent: m.n + (a.free && !/^Free/i.test(m.n) ? ' (free)' : '') }),
        bEl('kbd', { textContent: String(i + 1) }),
        bEl('span', { className: 'dk-ts', textContent: a.why || det })
      );
      b.onclick = () => startAction(a.type);
      box.append(b);
    });
  return box;
}

/* step 1 of an activation: its Draw Events and the like (faction choices before the first action). Returns the
   choices as tiles' data, the notes of what resolved on its own, and the reminders to resolve by hand. */
function dockDraw(u) {
  const out = { items: [], notes: [], refs: [] };
  if (!act || act.entering || act.actions.length || act.cur || act.drawPast) return out;
  let items = [];
  try {
    items = frOptions(u).filter(it => it.kind !== 'any');
  } catch (e) {}
  let head = '';
  items.forEach(it => {
    if (it.head) head = it.head;
    else out.items.push(Object.assign({ group: head }, it));
  });
  const groups = [...new Set(out.items.map(it => it.group))];
  out.oneGroup = groups.length === 1 && groups[0] ? groups[0] : '';
  out.notes = (act.drawNotes || []).slice();
  const box = $('c-draw');
  if (box) box.querySelectorAll('.dn.ref').forEach(d => out.refs.push(d.textContent.replace(/^•\s*/, '')));
  return out;
}

/* the Draw Event choices as tiles */
function dockDrawTiles(D) {
  const box = bEl('div', { className: 'dk-tiles dk-draw' });
  D.items.slice(0, 9).forEach((it, i) => {
    const b = bEl('button', { type: 'button', className: 'dk-t' + (it.cls === 'pri' ? ' pri' : '') });
    b.disabled = !!it.why;
    b.title = it.why || it.label;
    b.dataset.key = String(i + 1);
    b.append(
      bEl('span', { className: 'dk-ti' }, [icon('spark', 18) || '']),
      bEl('span', { className: 'dk-tn', textContent: it.label }),
      bEl('kbd', { textContent: String(i + 1) }),
      bEl('span', { className: 'dk-ts', textContent: it.why || (D.oneGroup ? 'Use it now' : it.group || 'Draw Event') })
    );
    b.onclick = () => {
      if (b.disabled) return;
      Promise.resolve(it.fn())
        .then(() => render())
        .catch(() => toast('That could not be saved. Try again.'));
    };
    box.append(b);
  });
  return box;
}

/* a dock button that presses one of the regiment card's own buttons */
function dockBtn(id, text, cls, key) {
  const src = $(id),
    b = bEl('button', { type: 'button', className: 'btn ' + (cls || '') });
  b.append(document.createTextNode(text));
  if (key) b.append(bEl('kbd', { textContent: key }));
  b.disabled = !src || src.disabled;
  b.title = (src && src.title) || '';
  b.onclick = () => src && src.click();
  return b;
}

function renderDock() {
  const dock = $('dock'),
    main = $('dock-main'),
    who = $('dock-who');
  if (!dock || !main || !who) return;
  if (mapEdit || scenEdit) {
    dockBuilder();
    return;
  }
  const on = dockOn(),
    chg = $('c-chg'),
    ctl = $('c-ctl'),
    cur = $('c-cur'),
    running = on && !!act.cur;
  /* in a game the dock keeps its place under the table, so the table does not change size between activations */
  const game =
    on ||
    (!!state &&
      (tbInTop() || tfInPanel()) &&
      (state.step || 'activations') === 'activations' &&
      !mapEdit &&
      !scenEdit &&
      !document.body.classList.contains('mm-on') &&
      !document.body.classList.contains('replaying'));
  const was = !dock.hidden;
  dock.hidden = !game;
  document.body.classList.toggle('has-dock', on);
  document.body.classList.toggle('dk-cur', running);
  if (!on) document.body.classList.remove('dk-draw', 'dk-panel');
  /* the running action's own controls come into the dock, and go back to the card afterwards */
  if (!running && cur && chg && chg.parentNode !== cur) {
    const read = $('c-meter') || $('c-cur-read');
    read.after(chg);
  }
  if (!running && cur && ctl && chg && ctl.parentNode !== cur) chg.after(ctl);
  let foot = dock.querySelector('.dk-foot');
  if (!foot) {
    foot = bEl('div', { className: 'dk-foot' });
    dock.append(foot);
  }
  who.innerHTML = '';
  [...main.children].forEach(k => !k.classList.contains('dk-ctl') && k !== chg && k.remove());
  if (!running) {
    const row = main.querySelector('.dk-ctl');
    if (row) row.remove();
  }
  foot.innerHTML = '';
  if (!game) return;
  if (!on) {
    const mine = state.turn === HU || SBX(),
      a = act && byId(act.id);
    who.append(
      bEl('div', {
        className: 'dk-k',
        textContent: (SBX() ? 'Test field · round ' : 'Round ') + (state.round || 1)
      }),
      bEl('div', {
        className: 'dk-n',
        textContent: a ? 'Activating' : SBX() ? 'Free play' : mine ? 'Your turn' : N(state.turn || AI) + '’ turn'
      })
    );
    const idle = bEl('div', { className: 'dk-idle' });
    if (a) {
      idle.append(bEl('span', { textContent: (a.short || a.name) + ' is activating.' }));
      const bk = bEl('button', { type: 'button', className: 'btn', textContent: 'Back to ' + (a.short || a.name) });
      bk.onclick = () => {
        selId = act.id;
        setTab('reg');
        render();
      };
      idle.append(bk);
    } else
      idle.append(
        bEl('span', {
          textContent: SBX()
            ? 'Click a regiment to activate it, or add regiments and terrain in the Field tab.'
            : mine
            ? 'Click the regiment whose card is up to start its activation.'
            : 'Waiting for ' + N(state.turn || AI) + ' to act.'
        })
      );
    main.append(idle);
    const lm = ($('last') && $('last').textContent) || '';
    if (lm && !/No moves yet/.test(lm))
      main.append(bEl('div', { className: 'dk-last', textContent: lm.replace(/^Last move:\s*/, ''), title: lm }));
    if (was !== game) requestAnimationFrame(fitBoard);
    return;
  }
  const u = byId(act.id),
    used = act.actions.filter(a => !a.free).length,
    left = Math.max(0, 2 - used);
  /* left: the regiment and its actions left */
  const pips = bEl('span', { className: 'dk-pips' });
  for (let i = 0; i < 2; i++) pips.append(bEl('i', { className: i < used ? 'on' : '' }));
  who.append(
    bEl('div', { className: 'dk-k', textContent: 'Activating' }),
    bEl('div', { className: 'dk-n', textContent: u.short || u.name }),
    u.charName ? bEl('div', { className: 'dk-c', textContent: '+ ' + u.charName }) : ''
  );
  const D = dockDraw(u),
    drawing = !running && (D.items.some(it => !it.why) || D.refs.length > 0);
  /* the steps of the activation: Draw Events, Actions, End */
  const stp = (n, t, st, extra) =>
    bEl('div', { className: 'dk-step ' + st }, [
      bEl('b', { textContent: st === 'ok' ? '✓' : String(n) }),
      bEl('span', { textContent: t }),
      extra || ''
    ]);
  who.append(
    bEl('div', { className: 'dk-steps' }, [
      stp(1, 'Draw Events', drawing ? 'now' : 'ok'),
      stp(2, 'Actions', drawing ? '' : left ? 'now' : 'ok', drawing ? '' : pips),
      stp(3, 'End', !drawing && !left ? 'now' : '')
    ])
  );
  /* middle: what to do now */
  const fight = cb && cb.type !== 'duel' && (cb.att === act.id || cb.tgt === act.id);
  document.body.classList.toggle('dk-draw', drawing);
  /* the side column still shows the activation panel when it holds something to do there: Draw Events, coming on
     to the table, a faction or formation choice, a warning, or a fight in progress */
  {
    const has = id => {
      const e = $(id);
      return !!e && !e.hidden && !!e.textContent.trim();
    };
    const panel = has('c-start') || has('c-form') || has('c-fac') || !!$('c-cbstep');
    document.body.classList.toggle('dk-panel', !!panel);
  }
  if (fight && running) {
    const go = bEl('button', { type: 'button', className: 'btn', textContent: 'Go to the dice' });
    go.onclick = () => {
      try {
        revealIn($('combat'), 'start');
      } catch (e) {}
    };
    main.append(bEl('div', { className: 'dk-note' }, [bEl('span', { textContent: 'Resolve the dice in the combat panel first.' }), go]));
  }
  if (fight && !running) {
    const go = bEl('button', { type: 'button', className: 'btn', textContent: 'Go to the dice' });
    go.onclick = () => {
      try {
        revealIn($('combat'), 'start');
      } catch (e) {}
    };
    main.append(
      bEl('div', { className: 'dk-msg' }, [
        bEl('strong', { textContent: 'Resolve the dice first' }),
        bEl('span', { textContent: 'The combat panel on the right is waiting for a roll.' }),
        go
      ])
    );
  } else if (running) {
    const c = act.cur,
      read = ($('c-cur-read') && $('c-cur-read').textContent) || '',
      k = c.moving ? curCost(act.pose) : null,
      pct = k && c.budget ? Math.min(100, (k.cost / c.budget) * 100) : 0;
    const head = bEl('div', { className: 'dk-run' }, [
      bEl('div', { className: 'dk-rh' }, [
        bEl('span', { className: 'dk-ti' }, [icon(DOCK_ICO[c.type] || 'spark', 18) || '']),
        bEl('strong', { textContent: (ACT[c.type] || { n: c.type }).n }),
        c.moving
          ? bEl('span', {
              className: 'dk-rm',
              textContent: k.cost.toFixed(1) + '″ of ' + c.budget + '″' + (c.roll != null ? ' · rolled ' + c.roll : '')
            })
          : ''
      ]),
      c.moving ? bEl('div', { className: 'dk-meter' }, [bEl('i', { style: 'width:' + pct + '%' })]) : '',
      !c.moving ? bEl('div', { className: 'dk-rt', textContent: read.replace(/^[^:]*:\s*/, '') }) : ''
    ]);
    main.prepend(head);
    /* the action's own controls, then turning and formation, in one row under its name */
    let row = main.querySelector('.dk-ctl');
    if (!row) {
      row = bEl('div', { className: 'dk-ctl' });
      main.append(row);
    }
    if (chg && chg.parentNode !== row) row.append(chg);
    if (ctl && ctl.parentNode !== row) row.append(ctl);
  } else if (drawing) {
    /* step 1: use a Draw Event, or carry on to the actions */
    const lines = D.notes.map(t => '✓ ' + t).concat(D.refs.map(t => '• ' + t));
    main.append(
      bEl('div', { className: 'dk-sh' }, [
        bEl('strong', { textContent: 'Draw Events' }),
        bEl('span', {
          textContent:
            (D.oneGroup ? D.oneGroup + ' · ' : '') +
            (D.items.some(it => !it.why)
              ? 'pick one, or continue to the actions.'
              : 'check these, then continue to the actions.')
        })
      ])
    );
    if (lines.length)
      main.append(bEl('div', { className: 'dk-dn', textContent: lines.join('   '), title: lines.join('\n') }));
    if (D.items.length) main.append(dockDrawTiles(D));
  } else if (!left && !availableActions(u).some(a => !a.why)) {
    main.append(
      bEl('div', { className: 'dk-msg' }, [
        bEl('strong', { textContent: 'Both actions are used' }),
        bEl('span', { textContent: 'Press End activation to finish.' })
      ])
    );
  } else {
    if (!used && (act.drawNotes || []).length)
      main.append(
        bEl('div', { className: 'dk-dn', textContent: act.drawNotes.map(t => '✓ ' + t).join('   ') })
      );
    main.append(dockTiles(u));
  }
  /* right: finish the action, or the activation */
  if (running) {
    foot.append(dockBtn('done-act', 'Finish action', 'gold', '↵'), dockBtn('cancel-act', 'Cancel action', 'ghost'));
  } else if (drawing && !fight) {
    const go = bEl('button', { type: 'button', className: 'btn gold dk-go' });
    go.append(document.createTextNode('Continue to actions'), bEl('kbd', { textContent: '↵' }));
    go.onclick = () => {
      act.drawPast = true;
      render();
    };
    foot.append(go, dockBtn('abort', 'Undo activation', 'ghost'));
  } else foot.append(dockBtn('end', 'End activation', 'gold', '↵'), dockBtn('abort', 'Undo activation', 'ghost'));
  if (was !== game) requestAnimationFrame(fitBoard);
}

/* number keys pick the action on that tile; Enter finishes the action, or ends the activation */
function dockKeys(ev) {
  if (!dockOn() || ev.ctrlKey || ev.metaKey || ev.altKey || ev.repeat) return;
  const tg = ev.target;
  if (/INPUT|TEXTAREA|SELECT/.test(tg.tagName) || tg.isContentEditable) return;
  if (mmCurrent() || document.querySelector('dialog[open]') || $('roll-ask')) return;
  if (/^[1-9]$/.test(ev.key) && !act.cur) {
    const b = document.querySelector('#dock .dk-t[data-key="' + ev.key + '"]');
    if (b && !b.disabled) {
      ev.preventDefault();
      b.click();
    }
    return;
  }
  if (ev.key === 'Enter' && (!tg || tg === document.body || !/BUTTON|A/.test(tg.tagName))) {
    const fin = $('done-act'),
      end = $('end');
    const go = document.querySelector('#dock .dk-go');
    if (go && !act.cur) {
      ev.preventDefault();
      go.click();
      return;
    }
    if (act.cur && fin && !fin.disabled) {
      ev.preventDefault();
      fin.click();
    } else if (!act.cur && !cb && end && !end.disabled && !end.hidden) {
      ev.preventDefault();
      end.click();
    }
  }
}
document.addEventListener('keydown', dockKeys);

/* the map and scenario builders: the dock under the table says what the builder is doing */
function dockBuilder() {
  const dock = $('dock'),
    main = $('dock-main'),
    who = $('dock-who');
  if (!dock || !main || !who) return;
  document.body.classList.remove('has-dock', 'dk-cur', 'dk-draw', 'dk-panel');
  const was = !dock.hidden;
  dock.hidden = false;
  who.innerHTML = '';
  main.innerHTML = '';
  const foot = dock.querySelector('.dk-foot');
  if (foot) foot.remove();
  let mode = '';
  if (mapEdit) {
    const M = mapEdit;
    mode =
      M.tool === 'erase'
        ? 'Erasing'
        : M.tool === 'building'
          ? 'Placing · ' + ((typeof BVAR !== 'undefined' && BVAR[M.bv || 'house']) || {}).name
          : 'Painting · ' + TTYPES[M.type].name;
  } else {
    const t = scenEdit.tool;
    mode = t === 'select' ? 'Pick and move' : t === 'marker' ? 'Adding markers' : 'Adding zones';
  }
  who.append(
    bEl('div', { className: 'dk-k', textContent: mapEdit ? 'Map builder' : 'Scenario builder' }),
    bEl('div', { className: 'dk-n', textContent: mode })
  );
  let text = dockBuilder.text || '';
  if (scenEdit)
    text +=
      ' · ' +
      (scenEdit.tool === 'zone'
        ? 'Click where the centre of the objective zone goes.'
        : scenEdit.tool === 'marker'
          ? 'Click where the objective marker goes.'
          : 'Click a zone or marker to change it in the side panel; drag it to move it.');
  main.append(bEl('div', { className: 'dk-idle' }, [bEl('span', { textContent: text })]));
  if (!was) requestAnimationFrame(fitBoard);
}
