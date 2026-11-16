/*
 * Command Stack in the turn bar
 *
 * Viewing and reordering the Command Stack.
 *
 * In this file: daimyoPick(), stackDnD(), stackView(), gpCardKey, huCardChoices(), renderGpCard()
 */

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

/* your turn: the card on top of your Command Stack and everything it can activate, arriving regiments included.
   Shown at the top of the Game tab, which opens by itself each time a new card is waiting. */
let gpCardKey = '';

function huCardChoices() {
  if (!state || (state.step || 'activations') !== 'activations' || state.turn !== HU) return null;
  if (act || aiBusy || SBX() || !huStackOn()) return null;
  /* the card was put in the Strategic Stack this turn: the turn is spent */
  if (myTurnStrat && PS().strategicUsedRound === state.round) return null;
  /* once this turn's card is played, only the Strategic Stack card is still on offer */
  const played = myTurnCards != null && humanCardsLeft() < myTurnCards;
  const top = played ? null : humanTop(),
    held = huHeldOk() ? PS().huHeld : null;
  if (!top && !held) return null;
  const L = [];
  const mine = (state.units || []).filter(u => u.side === HU && regCardLive(u) && u.type !== 'marker');
  if (top) {
    const yc = yCard(top);
    mine.forEach(u => {
      const okU = yc ? ySame(top, u, false) : top[0] === 'u' && sameCard(top, u),
        okC = yc ? ySame(top, u, true) : top[0] === 'c' && sameCard(top, u);
      const nm = u.short || u.name;
      if (okU) {
        if (PS().huLastCard === 'c:' + u.id && !noEntourage(u))
          L.push({
            u,
            name: nm,
            tag: 'Entourage',
            note: 'Inspired, straight after its character',
            go: () => startActivation(u.id, 'entourage', top)
          });
        L.push({
          u,
          name: nm,
          tag: u.onTable ? '' : 'Arriving',
          note: yc && yMatch(u, cardIdeal(top)) ? 'The Ideal matches' : '',
          go: () => startActivation(u.id, 'command', top)
        });
      }
      if (okC)
        L.push({
          u,
          name: 'The ' + u.charName,
          tag: u.onTable ? '' : 'Arriving',
          note: 'with ' + nm,
          go: () => charActivate(u.id, top)
        });
    });
  }
  if (held && !stratWhy())
    mine
      .filter(u => !u.activated && stratU(u) && sameCard(held, u))
      .forEach(u =>
        L.push({
          u,
          name: u.short || u.name,
          tag: 'Strategic Stack',
          note: '',
          go: () => startActivation(u.id, 'strategic')
        })
      );
  return { top, held, L };
}

function renderGpCard() {
  const box = $('gp-card');
  if (!box) return;
  box.innerHTML = '';
  const C = tbInTop() ? huCardChoices() : null;
  box.hidden = !C;
  $('tab-game').classList.toggle('waiting', !!C);
  if (!C) {
    gpCardKey = '';
    return;
  }
  /* a new card is waiting: bring the Game tab forward once */
  const key = [state.round, C.top, C.held, humanCardsLeft()].join('|');
  if (key !== gpCardKey) {
    gpCardKey = key;
    if (rightTab !== 'game') setTab('game');
  }
  const left = Math.max(0, validCards(PS().huStack || []).length - (C.top ? 1 : 0));
  const card = bEl('div', { className: 'gp-cardface' });
  card.style.setProperty('--fac', facColor((cardOf(C.top || C.held) || {}).fac || ''));
  card.append(
    bEl('span', { className: 'gp-k', textContent: C.top ? 'Your card' : 'Your Strategic Stack' }),
    bEl('strong', { textContent: cardName(C.top || C.held) }),
    bEl('span', {
      className: 'gp-left',
      textContent: C.top
        ? left
          ? left + ' more in your stack'
          : 'last card'
        : left
          ? left + ' left in your Command Stack'
          : 'Command Stack empty'
    })
  );
  const ul = bEl('ul', { className: 'gp-pick' });
  C.L.forEach(o => {
    const b = bEl('button', { type: 'button', className: 'gp-row' });
    b.append(
      bEl('span', { className: 'gp-nm', textContent: o.name }),
      o.tag ? bEl('span', { className: 'gp-tag', textContent: o.tag }) : '',
      o.note ? bEl('span', { className: 'gp-note', textContent: o.note }) : '',
      bEl('span', { className: 'gp-go', textContent: 'Activate ›' })
    );
    b.onmouseenter = () => hiUnit(o.u.id, true);
    b.onmouseleave = () => hiUnit(o.u.id, false);
    b.onclick = () => {
      hiUnit(o.u.id, false);
      selId = o.u.id;
      setTab('reg');
      o.go();
    };
    ul.append(bEl('li', {}, [b]));
  });
  /* City States (and anyone with a Strategic Stack): the top regiment card can be hidden face down instead, once a
     round while the Strategic Stack is empty */
  let strat = null;
  if (
    C.top &&
    C.top[0] === 'u' &&
    !SBX() &&
    canStrat(ME) &&
    !PS().strategicHeld &&
    PS().strategicUsedRound !== state.round &&
    !act &&
    !(PVP() && (state.turn !== HU || !seatSide()))
  ) {
    strat = bEl('button', { type: 'button', className: 'gp-row gp-strat' });
    strat.append(
      bEl('span', { className: 'gp-nm', textContent: 'Place it in the Strategic Stack' }),
      bEl('span', {
        className: 'gp-note',
        textContent: 'Face down, once this round; then press End turn'
      }),
      bEl('span', { className: 'gp-go', textContent: 'Hold ›' })
    );
    strat.onclick = () => $('strat-btn').onclick();
  }
  box.append(
    card,
    C.L.length
      ? bEl('p', {
          className: 'gp-ask',
          textContent: !C.top
            ? 'You may play it now, or keep it and press End turn:'
            : C.L.length === 1
              ? 'It activates:'
              : 'Choose who acts with it:'
        })
      : bEl('p', {
          className: 'gp-ask',
          textContent: strat
            ? 'Nothing can activate with this card now.'
            : 'Nothing can use this card now. Press End turn.'
        }),
    ul
  );
  if (strat) box.append(bEl('p', { className: 'gp-ask', textContent: 'Or keep it for later:' }), strat);
}
