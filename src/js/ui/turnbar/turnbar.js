/*
 * Turn bar
 *
 * The bar above the board that shows the round, the step and what to do next.
 *
 * In this file: renderTurnbar(), tbInTop(), placeTurnbar(), GP_STEPS, gpChoice(), placeNetBar(),
 *   tbMoreOpen, foldTurnbar(), renderTurnbar0()
 */

let reinfSkipKey = ''; /* the round whose empty Reinforcements step was skipped automatically */

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
    } else if (!act && !charAct && humanCardsLeft() > 0 && humanCardsLeft() < myTurnCards && oppOut()) {
      /* the opponent is out of cards: the next card is ready at once, no End turn needed */
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
    placeTurnbar(tb0);
  } catch (e) {
    console.error(e);
  }
  try {
    renderGpCard();
  } catch (e) {
    console.error(e);
  }
  try {
    foldTurnbar(tb0);
  } catch (e) {
    console.error(e);
  }
  try {
    tbStatus(tb0);
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

/* during a game the turn bar sits in the top row, and its reference sections move to the Game tab */
function tbInTop() {
  const st = (state && state.step) || 'activations';
  return (
    !!state && !SBX() && !document.body.classList.contains('mm-lobby') && !['setup', 'review'].includes(st)
  );
}

function placeTurnbar(tb) {
  const slot = $('top-turn'),
    gp = $('gp-body');
  if (!tb || !slot || !gp) return;
  gp.innerHTML = '';
  if (tbInTop()) {
    if (tb.parentNode !== slot) slot.appendChild(tb);
    /* victory conditions, army and faction rules, the host console and New game: on the Game tab */
    [...tb.children]
      .filter(k => k.tagName === 'DETAILS' || (k.classList && k.classList.contains('ng')))
      .forEach(k => gp.appendChild(k));
  } else if (tb.parentNode === slot) $('mm').after(tb);
  document.body.classList.toggle('tb-top', tbInTop());
  placeNetBar();
  /* ordering the Command Stack happens in the Game tab, which opens by itself once per round */
  const gs = $('gp-stack');
  if (gs) {
    gs.innerHTML = '';
    const big = tbInTop() ? [...tb.children].filter(k => k.matches('ol.stackb, label.ab-inl')) : [];
    gs.hidden = !big.length;
    if (big.length) {
      gs.append(
        bEl('div', { className: 'gp-cardface' }, [
          bEl('span', { className: 'gp-k', textContent: 'Command Phase · round ' + (state.round || 1) }),
          bEl('strong', { textContent: 'Order your Command Stack' }),
          bEl('span', {
            className: 'gp-sub',
            textContent: 'The top card acts first. Drag a card or use the arrows.'
          })
        ]),
        ...big
      );
      const key = 'stack|' + state.round + '|' + (state.step || '');
      if (placeTurnbar.key !== key) {
        placeTurnbar.key = key;
        if (rightTab !== 'game') setTab('game');
      }
    }
  }
  gpChoice(tb);
  /* the bar is one line unless a step needs a choice in it (a menu, a note) */
  tb.classList.toggle(
    'tb-line',
    tbInTop() && [...tb.children].every(k => k.matches('.tb-status, .read, button, details'))
  );
  const inf = $('tb-info');
  if (inf) inf.title = inf.textContent;
}

/* Decisions before the round (Reinforcements, the Master Manipulator Offer, the Supremacy roll-off and abilities,
   the Eidolon's Combat Directive, scenario picks, who goes first) go to the Game tab with their explanation; the top
   row keeps a short line saying where to look. */
const GP_STEPS = {
  reinforce: 'Reinforcements',
  supremacy: 'Command Phase',
  picks: 'Scenario choice',
  supdecl: 'Supremacy Phase',
  choose: 'Who goes first'
};

function gpChoice(tb) {
  const gc = $('gp-choice');
  if (!gc) return;
  gc.innerHTML = '';
  const step = state && (state.step || 'activations'),
    title = GP_STEPS[step];
  const items =
    tbInTop() && title && !aiBusy
      ? [...tb.children].filter(k => !k.matches('.tb-status, #tb-info, details, .ng'))
      : [];
  gc.hidden = !items.length;
  if (!items.length) return;
  const inf = $('tb-info'),
    text = inf ? inf.textContent : '';
  gc.append(
    bEl('div', { className: 'gp-cardface' }, [
      bEl('span', { className: 'gp-k', textContent: 'Round ' + (state.round || 1) + ' · ' + title }),
      bEl('strong', { textContent: 'Your decision' }),
      text ? bEl('span', { className: 'gp-sub', textContent: text }) : ''
    ]),
    bEl('div', { className: 'gp-choices' }, items)
  );
  if (inf) inf.textContent = title + ': your decision is in the Game tab.';
  const key = 'choice|' + state.round + '|' + step + '|' + text;
  if (gpChoice.key !== key) {
    gpChoice.key = key;
    if (rightTab !== 'game') setTab('game');
  }
}

/* the connection bar of the online site (made by its own script, at any time): in a game it joins the top row,
   and when you play on this device only it has nothing to say */
function placeNetBar() {
  const nb = $('net-bar'),
    slot = $('top-turn');
  if (!nb || !slot) return;
  if (!nb.__obs) {
    /* its status text changes when the connection does */
    nb.__obs = new MutationObserver(() => placeNetBar());
    nb.__obs.observe(nb, { childList: true });
  }
  const quiet = /^\s*Offline/.test(nb.textContent || '');
  if (nb.classList.contains('nb-quiet') !== quiet) nb.classList.toggle('nb-quiet', quiet);
  const top = slot.parentNode;
  if (document.body.classList.contains('tb-top')) {
    if (nb.parentNode !== top) top.insertBefore(nb, slot.nextSibling);
  } else if (nb.parentNode === top) document.body.insertBefore(nb, document.body.firstChild);
}
new MutationObserver(() => placeNetBar()).observe(document.body, { childList: true });

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
  if (simEndOk()) {
    const sb = mk('Simulate to the end', simToEnd);
    sb.title = `${N(other(simEndSide()))} have no regiments left. Score the Victory Phase of this round and every round after it, with every regiment staying where it stands.`;
    add(sb);
  }
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
    const rsel = ravenSelect(HU, add),
      hsel = huntSelect(HU, add);
    const roll = async () => {
      aiBusy = true;
      render();
      try {
        const rep = await doReinforcements(
          sel.value || null,
          (rsel && rsel.value) || null,
          (hsel && hsel.value) || null
        );
        aiBusy = false;
        await startCommandPhase(rep);
      } catch (e) {
        aiBusy = false;
        toast('That could not be saved. Try again.');
        render();
      }
    };
    /* nothing to choose (no reserves that may arrive, no Raven Messengers or Call the Hunt): skip the question */
    if (sel.options.length === 1 && !rsel && !hsel) {
      sel.remove();
      info.textContent = `Round ${state.round} · Reinforcements: nothing to choose, carrying on…`;
      if (reinfSkipKey !== state.round + ':' + HU) {
        reinfSkipKey = state.round + ':' + HU;
        setTimeout(roll, 0);
        return;
      }
    }
    add(mk('Roll reinforcements', roll));
    return;
  }
  if (step === 'supremacy') {
    info.textContent = `Round ${state.round} · Command Phase: put your cards in order in the Game tab (top acts first), then roll off for Supremacy. Your order stays hidden from ${N(AI)}.`;
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
  if (artOfWarOk(HU)) add(mk('Art of War: pass without drawing', artOfWarPass));
  const vd = document.createElement('details');
  vd.className = 'vc';
  const vs = document.createElement('summary');
  vs.textContent = 'Victory conditions';
  vd.append(vs, ptext(scenOf().vp + picksText()));
  add(vd);
  add(armyRulesBox());
  add(frPanel());
}
