/*
 * Turn bar: online games
 *
 * The turn bar for a game between two players.
 *
 * In this file: renderTurnbarPvp()
 */

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
    };
    /* nothing to choose (no reserves that may arrive, no Raven Messengers or Call the Hunt): skip the question */
    if (sel.options.length === 1 && !rsel && !hsel) {
      sel.remove();
      info.textContent = `Round ${state.round} · Reinforcements: nothing to choose, carrying on…`;
      if (reinfSkipKey !== state.round + ':' + HU) {
        reinfSkipKey = state.round + ':' + HU;
        setTimeout(roll, 0);
        return true;
      }
    }
    add(mk('Roll reinforcements', roll));
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
    info.textContent = `Round ${state.round} · Command Phase: put your cards in order in the Game tab (top acts first), then lock the stack. Only you can see your order.`;
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
          await stateUpdate({ ready: { [HU]: true }, updatedAt: Date.now() });
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
  if (artOfWarOk(HU)) add(mk('Art of War: pass without drawing', artOfWarPass));
  add(vd);
  add(armyRulesBox());
  add(frPanel());
  return true;
}
