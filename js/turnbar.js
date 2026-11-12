/* The turn bar, Command Stack ordering and the host override console. */
function renderTurnbarPvp(tb, info, mk, add, step) {
  const me = seatSide();
  if (!me) {
    info.textContent = `You are watching ${WHO('cs')} against ${WHO('nord')}. ${state.phase || ''}`;
    return true;
  }
  if (step === 'reinforce') {
    if (mmBar(add, mk, ME, info)) return true;
    const rt = state.reinfTurn || 'cs';
    if (rt !== HU) {
      info.textContent = `Round ${state.round} · Reinforcements. Waiting for ${WHO(rt)} to roll.`;
      return true;
    }
    const pool = reserves(HU).filter(u => reinfRule(u.cls, state.round) !== 'no');
    info.textContent = `Round ${state.round} · Reinforcements. Choose one regiment to arrive automatically, then roll for the rest.`;
    const sel = document.createElement('select');
    sel.id = 'tb-auto';
    sel.setAttribute('aria-label', 'Regiment arriving automatically');
    const o0 = document.createElement('option');
    o0.value = '';
    o0.textContent = 'No automatic arrival';
    sel.appendChild(o0);
    pool
      .filter(u => reinfRule(u.cls, state.round) !== 'auto')
      .forEach(u => {
        const o = document.createElement('option');
        o.value = u.id;
        o.textContent = u.name + ' (' + u.cls + ')';
        sel.appendChild(o);
      });
    add(sel);
    add(
      mk('Roll reinforcements', async () => {
        aiBusy = true;
        render();
        try {
          const rep = await doReinforcements(sel.value || null);
          aiBusy = false;
          if (HU === 'nord') {
            const prev = state.lastReinf || '';
            await startCommandPhase([{ title: prev, lines: [] }].filter(r => r.title).concat(rep));
          } else {
            await putState({
              lastReinf: rep.map(r => r.title + ': ' + r.lines.join(', ')).join(' · '),
              lastTitle: 'Reinforcements',
              lastText: rep.map(r => r.title + ': ' + r.lines.join(', ')).join(' · ')
            });
          }
        } catch (e) {
          aiBusy = false;
          toast('That could not be saved. Try again.');
          render();
        }
      })
    );
    return true;
  }
  if (step === 'supremacy') {
    const rd = state.ready || {};
    if (rd.cs && rd.nord) {
      info.textContent = `Round ${state.round} · Both Command Stacks are locked. Roll off for Supremacy: lowest wins, and the side with fewer Command Cards subtracts 1.`;
      add(
        mk('Roll off for Supremacy', async () => {
          aiBusy = true;
          render();
          try {
            aiBusy = false;
            await rollSupremacy();
          } catch (e) {
            aiBusy = false;
            render();
            toast('That could not be saved. Try again.');
          }
        })
      );
      return true;
    }
    if (rd[HU]) {
      info.textContent = `Your Command Stack is locked. Waiting for ${WHO(AI)} to lock theirs.`;
      return true;
    }
    info.textContent = `Round ${state.round} · Command Phase: put your cards in order (top acts first), then lock the stack. Only you can see your order.`;
    const valid = defaultHumanStack();
    if (!huDraft || huDraft.length !== valid.length || !huDraft.every(c => valid.includes(c)))
      huDraft = valid.slice();
    const box = document.createElement('ol');
    box.className = 'stackb';
    box.setAttribute('aria-label', 'Your Command Stack');
    huDraft.forEach((c, i) => {
      const li = document.createElement('li');
      const nm = document.createElement('span');
      nm.textContent = i + 1 + '. ' + cardName(c);
      li.appendChild(nm);
      const up = document.createElement('button');
      up.type = 'button';
      up.className = 'btn ghost';
      up.textContent = '↑';
      up.setAttribute('aria-label', 'Move ' + cardName(c) + ' up');
      up.disabled = i === 0;
      up.onclick = () => {
        [huDraft[i - 1], huDraft[i]] = [huDraft[i], huDraft[i - 1]];
        renderTurnbar();
      };
      const dn = document.createElement('button');
      dn.type = 'button';
      dn.className = 'btn ghost';
      dn.textContent = '↓';
      dn.setAttribute('aria-label', 'Move ' + cardName(c) + ' down');
      dn.disabled = i === huDraft.length - 1;
      dn.onclick = () => {
        [huDraft[i + 1], huDraft[i]] = [huDraft[i], huDraft[i + 1]];
        renderTurnbar();
      };
      li.append(up, dn);
      box.appendChild(li);
    });
    stackDnD(box, huDraft);
    add(box);
    daimyoPick(add);
    add(
      mk('Lock my stack', async () => {
        try {
          await savePS({
            huStack: huDraft.slice(),
            huHeld: null,
            huLastCard: null,
            strategicHeld: false,
            hammerUsed: false
          });
          huDraft = null;
          await db.doc('game/state').update({ ready: { [HU]: true }, updatedAt: Date.now() });
        } catch (e) {
          toast('That could not be saved. Try again.');
        }
      })
    );
    return true;
  }
  if (step === 'picks') {
    const sc = scenOf(),
      p = state.picks || {},
      first = state.first,
      order = [first, other(first)],
      who = order.find(s => !p[s]);
    if (who !== HU) {
      info.textContent =
        `${sc.name}: waiting for ${WHO(who || AI)} to pick a zone.` +
        (p[HU] && p[HU] !== 'none' ? ` You picked ${p[HU]}.` : '');
      return true;
    }
    info.textContent =
      `${sc.name}: ` +
      (sc.pick === 'deny'
        ? 'pick a zone that scores nothing this round.'
        : sc.pick === 'secret'
          ? 'secretly pick a zone other than the centre; it scores nothing this round unless you both pick it.'
          : 'pick a 6″ zone with none of your regiments in it; Seizing it this round is worth +3.') +
      (p[AI] && p[AI] !== 'none' && sc.pick !== 'secret' ? ` ${N(AI)} picked ${p[AI]}.` : '');
    pickOptions(HU).forEach(n => add(mk(n, () => humanPick(n), true)));
    return true;
  }
  if (step === 'supdecl') {
    supBar(add, info, mk, ME);
    return true;
  }
  if (step === 'choose') {
    if (state.chooser !== HU) {
      info.textContent = `${WHO(state.chooser || AI)} won Supremacy and are choosing who goes first.`;
      return true;
    }
    info.textContent = 'You won Supremacy. Who goes first?';
    add(mk('I go first', () => chooseFirst(HU)));
    add(mk(N(AI) + ' go first', () => chooseFirst(AI), true));
    return true;
  }
  const hu = sideCardsLeft(HU),
    op = sideCardsLeft(AI),
    vd = document.createElement('details');
  vd.className = 'vc';
  const vs = document.createElement('summary');
  vs.textContent = 'Victory conditions';
  vd.append(vs, ptext(scenOf().vp + picksText()));
  if (state.turn !== HU) {
    info.textContent = `${scenOf().name} · Waiting for ${WHO(state.turn || AI)} to act. You have ${hu} card${hu === 1 ? '' : 's'} left, ${N(AI)} have ${op}.`;
    add(vd);
    add(armyRulesBox());
    add(frPanel());
    return true;
  }
  {
    const sv = stackView();
    if (sv) add(sv);
  }
  const tp = humanTop();
  info.textContent = `${scenOf().name} · Your turn · ${tp ? 'next card: ' + cardName(tp) + ' · ' : ''}${huHeldOk() ? 'held in the Strategic Stack: ' + cardName(PS().huHeld) + ' · ' : ''}you have ${hu} card${hu === 1 ? '' : 's'} left, ${N(AI)} have ${op}.`;
  add(mk('End turn', endTurn));
  add(vd);
  add(armyRulesBox());
  add(frPanel());
  return true;
}

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
let myTurnCards = null,
  myTurnStrat = false,
  lastTurnSeen = null;
function turnNotice(t) {
  let n = $('turn-note');
  if (!n) {
    n = document.createElement('div');
    n.id = 'turn-note';
    n.className = 'aib';
    n.setAttribute('role', 'status');
    document.body.appendChild(n);
  }
  n.textContent = t;
  n.classList.add('on');
  clearTimeout(n._t);
  n._t = setTimeout(() => n.classList.remove('on'), 2600);
  try {
    if (navigator.vibrate) navigator.vibrate(150);
  } catch (e) {}
  document.title = (t.startsWith('Your turn') ? '● ' : '') + document.title.replace(/^● /, '');
}
function turnWatch() {
  if (!state || state.mode === 'test') return;
  const k = (state.step || '') + ':' + (state.round || 0) + ':' + (state.turn || '');
  if (k === lastTurnSeen) return;
  const prev = lastTurnSeen;
  lastTurnSeen = k;
  if (!prev) return;
  if ((state.step || 'activations') === 'activations' && state.turn === HU && !aiBusy) {
    const tp = humanTop();
    turnNotice('Your turn' + (tp ? ' · next card: ' + cardName(tp) : ''));
  } else if ((state.step || 'activations') === 'activations' && state.turn && state.turn !== HU)
    document.title = document.title.replace(/^● /, '');
}
function renderTurnbar() {
  try {
    turnWatch();
  } catch (e) {}
  if (
    state &&
    state.turn === HU &&
    (state.step || 'activations') === 'activations' &&
    state.mode !== 'test'
  ) {
    if (myTurnCards == null) {
      myTurnCards = humanCardsLeft();
      myTurnStrat = false;
    }
  } else myTurnCards = null;
  const a = document.activeElement,
    tb0 = $('turnbar'),
    fid = a && a.id && tb0 && tb0.contains(a) && a.tagName === 'INPUT' ? a.id : null,
    ss = fid ? a.selectionStart : 0;
  renderTurnbar0();
  try {
    const op = ovrPanel();
    if (op) tb0.appendChild(op);
  } catch (e) {
    console.error(e);
  }
  try {
    foldTurnbar(tb0);
  } catch (e) {
    console.error(e);
  }
  if (fid) {
    const e = document.getElementById(fid);
    if (e && !e.disabled) {
      e.focus();
      try {
        e.setSelectionRange(ss, ss);
      } catch (err) {}
    }
  }
}
/* ---------- The turn bar keeps one status row; reference sections and tools fold behind one toggle ---------- */
const tbMoreOpen = {};
function foldTurnbar(tb) {
  if (!tb || aiBusy) return;
  const kids = [...tb.children];
  let fold, key, label;
  if (SBX()) {
    const i = kids.findIndex(k => k.classList && k.classList.contains('tf-row'));
    fold = i >= 0 ? kids.slice(i + 1) : [];
    key = 'test';
    label = 'Test field tools';
  } else {
    fold = kids.filter(k => k.tagName === 'DETAILS' || (k.classList && k.classList.contains('ng')));
    key = 'game';
    label = 'Game info';
  }
  if (!fold.length) return;
  if (tbMoreOpen[key] == null) {
    let v = null;
    try {
      v = localStorage.getItem('tbMore:' + key);
    } catch (e) {}
    /* the test field starts open on an empty table, so the tools are there when you need them */
    tbMoreOpen[key] = v != null ? v === '1' : key === 'test' && !(state.units || []).length;
  }
  const d = document.createElement('details');
  d.className = 'tb-more';
  d.open = tbMoreOpen[key];
  const sm = document.createElement('summary');
  sm.textContent = label;
  sm.title =
    key === 'test'
      ? 'Add regiments, terrain, colours and conditions'
      : 'Victory conditions, army and faction rules, host console, new game';
  const body = document.createElement('div');
  body.className = 'tb-more-body';
  fold.forEach(k => body.appendChild(k));
  d.append(sm, body);
  d.addEventListener('toggle', () => {
    requestAnimationFrame(fitBoard);
    tbMoreOpen[key] = d.open;
    try {
      localStorage.setItem('tbMore:' + key, d.open ? '1' : '0');
    } catch (e) {}
  });
  tb.appendChild(d);
}
/* ---------- Host override console: for when the game gets stuck ---------- */
let ovrOpen = false;
function ovrHost() {
  if (!state || SBX()) return false;
  if (!PVP()) return true;
  const net = window.__conquestNet;
  if (net && net.mode) return net.mode === 'host';
  return !!myId && (state.hostId ? state.hostId === myId : (state.seats || {}).cs === myId);
}
function ovrMine() {
  const o = state && state.ovr;
  return !!(o && o.n > 0 && o.side === HU && (!PVP() || !!seatSide()));
}
async function ovrLog(t, patch) {
  await putState(Object.assign({}, patch || {}, { lastTitle: 'Host override', lastText: t }));
  toast('Override: ' + t);
}
function ovrPanel() {
  if (!ovrHost() || ['setup', 'review', 'over'].includes(state.step || '')) return null;
  const d = bEl('details', { className: 'rev ovr' });
  d.open = ovrOpen;
  d.ontoggle = () => {
    ovrOpen = d.open;
  };
  d.append(bEl('summary', { textContent: 'Host override console' }));
  d.append(
    ptext(
      'Only for when something gets stuck. Every override is written to the log for both players.',
      'hint'
    )
  );
  const row = (l, ...k) => {
    const r = bEl('div', { className: 'tf-row' });
    r.append(bEl('span', { className: 'tf-l', textContent: l }), ...k);
    d.append(r);
  };
  const b = (t, fn, dis) => {
    const x = abBtn(t, fn, 'ab-tog');
    if (dis) x.disabled = true;
    return x;
  };
  const S = ['cs', 'nord'],
    nm = s => (PVP() ? WHO(s) : N(s)),
    turnNow = state.turn;
  row(
    'Turn: ' +
      (turnNow ? nm(turnNow) : 'nobody') +
      (state.step && state.step !== 'activations' ? ' · step ' + state.step : ''),
    ...S.map(s =>
      b(
        'Give the turn to ' + nm(s),
        async () => {
          act = null;
          cb = null;
          charAct = null;
          aiBusy = false;
          await ovrLog('the turn is given to ' + nm(s) + '.', {
            turn: s,
            step: 'activations',
            phase: 'Round ' + (state.round || 1) + ' · ' + nm(s) + ' to act'
          });
          if (!PVP() && s === AI) runAITurn();
        },
        turnNow === s && (state.step || 'activations') === 'activations'
      )
    )
  );
  row(
    'Force the current turn to end:',
    b(
      'End the turn' + (turnNow ? ' of ' + nm(turnNow) : ''),
      async () => {
        act = null;
        cb = null;
        charAct = null;
        aiBusy = false;
        const o = turnNow === 'cs' ? 'nord' : 'cs';
        const left = s =>
          !PVP() && s === AI ? aiCardsLeft() : !PVP() && s === HU ? humanCardsLeft() : sideCardsLeft(s);
        if (left(o) > 0) {
          await ovrLog('the turn of ' + nm(turnNow) + ' is ended; ' + nm(o) + ' to act.', {
            turn: o,
            phase: 'Round ' + (state.round || 1) + ' · ' + nm(o) + ' to act'
          });
          if (!PVP() && o === AI) runAITurn();
        } else if (left(turnNow) > 0) {
          await ovrLog(nm(o) + ' have no cards left; ' + nm(turnNow) + ' keep acting.', {});
        } else {
          await ovrLog('the round is ended.', {});
          await endRound();
        }
      },
      !turnNow
    )
  );
  row(
    'Let a player activate any one regiment (ignores the Command Stack):',
    ...S.filter(s => PVP() || s === HU).map(s =>
      b(nm(s) + ' activates one', async () => {
        await ovrLog(nm(s) + ' may activate any one regiment or character of their choice.', {
          ovr: { side: s, n: 1 },
          turn: s,
          step: 'activations'
        });
      })
    ),
    ...(!PVP()
      ? [
          b('Claude takes a turn now', async () => {
            act = null;
            cb = null;
            aiBusy = false;
            await ovrLog(N(AI) + ' take a turn now.', { turn: AI });
            runAITurn();
          })
        ]
      : [])
  );
  const u = selId && base(selId);
  if (u && u.type !== 'marker')
    row(
      'Selected: ' + (u.short || u.name) + ':',
      b(u.activated ? 'Mark as not activated' : 'Mark as activated', () =>
        ovrLog(
          (u.short || u.name) + (u.activated ? ' is marked as not activated.' : ' is marked as activated.'),
          {
            units: state.units.map(x =>
              x.id === u.id ? Object.assign({}, x, { activated: !u.activated }) : x
            )
          }
        )
      ),
      ...(u.charName
        ? [
            b(
              u.charActivated ? 'The ' + u.charName + ': not activated' : 'The ' + u.charName + ': activated',
              () =>
                ovrLog(
                  'the ' +
                    u.charName +
                    (u.charActivated ? ' is marked as not activated.' : ' is marked as activated.'),
                  {
                    units: state.units.map(x =>
                      x.id === u.id ? Object.assign({}, x, { charActivated: !u.charActivated }) : x
                    )
                  }
                )
            )
          ]
        : [])
    );
  else row('Select a regiment on the map to mark it activated or not.');
  row(
    'This device:',
    b('Clear a stuck activation or dice panel', () => {
      act = null;
      cb = null;
      cbQueue = [];
      charAct = null;
      aiBusy = false;
      try {
        bannerHide();
      } catch (e) {}
      try {
        renderCombat();
      } catch (e) {}
      render();
      toast('Cleared on this device.');
    })
  );
  row(
    'Round:',
    b(
      ovrArm ? 'Click again to end round ' + (state.round || 1) : 'End the round now (score it)',
      async () => {
        if (!ovrArm) {
          ovrArm = true;
          renderTurnbar();
          setTimeout(() => {
            ovrArm = false;
          }, 4000);
          return;
        }
        ovrArm = false;
        act = null;
        cb = null;
        aiBusy = false;
        await ovrLog('round ' + (state.round || 1) + ' is ended early.', {});
        await endRound();
      }
    )
  );
  return d;
}
let ovrArm = false;
function renderTurnbar0() {
  const tb = $('turnbar');
  if (!tb || !state) return;
  tb.innerHTML = '';
  const step = state.step || 'activations';
  const add = e => tb.appendChild(e);
  const info = document.createElement('span');
  info.className = 'read';
  info.id = 'tb-info';
  add(info);
  const mk = (t, fn, ghost) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn' + (ghost ? ' ghost' : '');
    b.textContent = t;
    b.onclick = fn;
    b.disabled = aiBusy;
    return b;
  };
  if (aiBusy) {
    info.textContent = $('ai-status').textContent || N(AI) + ' are acting…';
    return;
  }
  if (renderSetup(tb, info, mk, add)) return;
  if (SBX()) {
    renderTestField(tb, info, mk, add);
    return;
  }
  if (step === 'over') {
    info.textContent =
      'The game is over. ' +
      N('cs') +
      ' ' +
      (state.vp?.cs || 0) +
      ', ' +
      N('nord') +
      ' ' +
      (state.vp?.nord || 0) +
      '.';
    add(mk(resetArm ? 'Click again to confirm' : 'Start a new game', newGame));
    return;
  }
  const ng = mk(resetArm ? 'Click again to reset the game' : 'New game', newGame, true);
  ng.classList.add('ng');
  add(ng);
  if (PVP() && renderTurnbarPvp(tb, info, mk, add, step)) return;
  if (step === 'reinforce') {
    if (mmBar(add, mk, HU, info)) return;
    const pool = reserves(HU).filter(u => reinfRule(u.cls, state.round) !== 'no');
    info.textContent = `Round ${state.round} · Reinforcements. Choose one regiment to arrive automatically, then roll for the rest.`;
    const sel = document.createElement('select');
    sel.id = 'tb-auto';
    sel.setAttribute('aria-label', 'Regiment arriving automatically');
    const o0 = document.createElement('option');
    o0.value = '';
    o0.textContent = 'No automatic arrival';
    sel.appendChild(o0);
    pool
      .filter(u => reinfRule(u.cls, state.round) !== 'auto')
      .forEach(u => {
        const o = document.createElement('option');
        o.value = u.id;
        o.textContent = u.name + ' (' + u.cls + ')';
        sel.appendChild(o);
      });
    add(sel);
    add(
      mk('Roll reinforcements', async () => {
        aiBusy = true;
        render();
        try {
          const rep = await doReinforcements(sel.value || null);
          aiBusy = false;
          await startCommandPhase(rep);
        } catch (e) {
          aiBusy = false;
          toast('That could not be saved. Try again.');
          render();
        }
      })
    );
    return;
  }
  if (step === 'supremacy') {
    info.textContent = `Round ${state.round} · Command Phase: put your cards in order (top acts first), then roll off for Supremacy. Your order stays hidden from ${N(AI)}.`;
    const valid = defaultHumanStack();
    if (!huDraft || huDraft.length !== valid.length || !huDraft.every(c => valid.includes(c)))
      huDraft = valid.slice();
    const box = document.createElement('ol');
    box.className = 'stackb';
    box.setAttribute('aria-label', 'Your Command Stack');
    huDraft.forEach((c, i) => {
      const li = document.createElement('li');
      const nm = document.createElement('span');
      nm.textContent = i + 1 + '. ' + cardName(c);
      li.appendChild(nm);
      const up = document.createElement('button');
      up.type = 'button';
      up.className = 'btn ghost';
      up.textContent = '↑';
      up.setAttribute('aria-label', 'Move ' + cardName(c) + ' up');
      up.disabled = i === 0;
      up.onclick = () => {
        [huDraft[i - 1], huDraft[i]] = [huDraft[i], huDraft[i - 1]];
        renderTurnbar();
      };
      const dn = document.createElement('button');
      dn.type = 'button';
      dn.className = 'btn ghost';
      dn.textContent = '↓';
      dn.setAttribute('aria-label', 'Move ' + cardName(c) + ' down');
      dn.disabled = i === huDraft.length - 1;
      dn.onclick = () => {
        [huDraft[i + 1], huDraft[i]] = [huDraft[i], huDraft[i + 1]];
        renderTurnbar();
      };
      li.append(up, dn);
      box.appendChild(li);
    });
    stackDnD(box, huDraft);
    add(box);
    daimyoPick(add);
    add(
      mk('Lock stack and roll off', async () => {
        aiBusy = true;
        render();
        try {
          await putState({ huStack: huDraft.slice(), huHeld: null, huLastCard: null, strategicHeld: false });
          huDraft = null;
          aiBusy = false;
          await rollSupremacy();
        } catch (e) {
          aiBusy = false;
          render();
          toast('That could not be saved. Try again.');
        }
      })
    );
    return;
  }
  if (step === 'picks') {
    const sc = scenOf(),
      p = state.picks || {},
      waiting = !p[HU];
    info.textContent =
      `${sc.name}: ` +
      (sc.pick === 'deny'
        ? 'pick a zone that scores nothing this round.'
        : sc.pick === 'secret'
          ? 'secretly pick a zone other than the centre; it scores nothing this round unless you both pick it.'
          : 'pick a 6″ zone with none of your regiments in it; Seizing it this round is worth +3.') +
      (p[AI] && sc.pick !== 'secret' ? ` ${N(AI)} picked ${p[AI]}.` : '');
    if (waiting) pickOptions(HU).forEach(n => add(mk(n, () => humanPick(n), true)));
    return;
  }
  if (step === 'supdecl') {
    supBar(add, info, mk, HU);
    return;
  }
  if (step === 'choose') {
    info.textContent = 'You won Supremacy. Who goes first?';
    add(mk('I go first', () => chooseFirst(HU)));
    add(mk(N(AI) + ' go first', () => chooseFirst(AI), true));
    return;
  }
  const hu = humanCardsLeft(),
    ai = aiCardsLeft();
  if (state.turn === AI) {
    info.textContent = `${N(AI)}'s turn.`;
    add(mk('Play the ' + N(AI) + ' turn', runAITurn));
    {
      const sv = stackView();
      if (sv) add(sv);
    }
    return;
  }
  {
    const sv = stackView();
    if (sv) add(sv);
  }
  const tp = humanTop();
  info.textContent = `${scenOf().name} · Your turn · ${tp ? 'next card: ' + cardName(tp) + ' · ' : ''}${huHeldOk() ? 'held in the Strategic Stack: ' + cardName(PS().huHeld) + ' · ' : ''}you have ${hu} card${hu === 1 ? '' : 's'} left, ${N(AI)} have ${ai}.`;
  add(mk('End turn', endTurn));
  const vd = document.createElement('details');
  vd.className = 'vc';
  const vs = document.createElement('summary');
  vs.textContent = 'Victory conditions';
  vd.append(vs, ptext(scenOf().vp + picksText()));
  add(vd);
  add(armyRulesBox());
  add(frPanel());
}
