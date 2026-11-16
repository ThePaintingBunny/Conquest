/*
 * The Supremacy step
 *
 * The step each round where a side may activate its Supremacy Ability, with its bar in the turn bar.
 *
 * In this file: supChip(), supNeeded(), supAiWant(), supStart(), supNext(), supDecide(), supBar(),
 *   supBlock()
 */

function supChip(side) {
  const S = supOf(side);
  if (!S) return '';
  if (S.d.prey) {
    const t = supPrey(side);
    return S.k + ' · ' + (t ? 'Prey: ' + (t.short || t.name) : 'no Prey marked');
  }
  return (
    S.k +
    (S.active
      ? ' · active this round'
      : S.d.a
        ? S.d.every
          ? ' · every round'
          : S.can
            ? ' · ready'
            : ' · ' + (S.used ? 'used' : 'not on the table')
        : ' · passive')
  );
}

function supNeeded() {
  return ['cs', 'nord'].some(s => {
    const S = supOf(s),
      SA = supOf(s, 'ally');
    /* choices such as the Eidolon's Combat Directive come up even without a Supremacy to use */
    return wlMissing(s) || (SA && SA.can) || (S && (S.can || supNeedPrey(s))) || !!supChoiceNeeded(s);
  });
}

function supAiWant(side, who) {
  const S = supOf(side, who);
  if (!S || !S.can || S.d.unknown) return false;
  if (S.d.every) return true;
  const R = state.round || 1;
  const mine = (state.units || []).filter(u => u.side === side && u.type !== 'marker' && !u.destroyed),
    on = mine.filter(u => u.onTable).length;
  if (state.aiSupWant === true && R >= 2) return true;
  if (state.aiSupWant === false && R < 5) return false;
  return R >= 4 || (R >= 3 && on >= mine.length * 0.6);
}

async function supStart(first) {
  if (!supNeeded()) return false;
  await putState({
    step: 'supdecl',
    first,
    supDone: {},
    phase: 'Round ' + state.round + ' · Supremacy Abilities'
  });
  await supNext();
  return true;
}

async function supNext() {
  const first = state.first,
    order = [first, other(first)],
    done = state.supDone || {};
  const who = order.find(s => !done[s]);
  if (!who) {
    for (const s0 of [first, other(first)]) {
      if (supChoiceNeeded(s0)) {
        if (!PVP() && s0 === AI) await supAiChoice(s0);
        else {
          render();
          return;
        }
      }
    }
    await afterSupremacy0(first);
    return;
  }
  const S = supOf(who);
  if (S && supNeedPrey(who)) {
    if (!PVP() && who === AI) {
      await supSetPrey(AI, supPreyOpts(AI)[0].id);
      return supNext();
    }
    render();
    return;
  }
  if (!S && wlMissing(who)) {
    render();
    return;
  }
  const SA = supOf(who, 'ally');
  if ((!S || !S.can) && !(SA && SA.can)) {
    await putState({ supDone: Object.assign({}, done, { [who]: 'skip' }) });
    return supNext();
  }
  if (!PVP() && who === AI) {
    if ((!S || !S.can) && SA && SA.can) {
      if (supAiWant(AI, 'ally')) await supActivate(AI, '', 'ally');
      await putState({ supDone: Object.assign({}, state.supDone || {}, { [AI]: 'done' }) });
      return supNext();
    }
    let ch = '';
    if (S.d.cho) {
      const used = S.g.chosen || [];
      ch =
        S.d.cho.find(c => !used.includes(c) && c !== 'Hregg') || S.d.cho.find(c => !used.includes(c)) || '';
    }
    if (supAiWant(AI)) await supActivate(AI, ch);
    await putState({ supDone: Object.assign({}, state.supDone || {}, { [AI]: 'done' }) });
    return supNext();
  }
  render();
}

async function supDecide(side, yes, choice, who) {
  if (yes) {
    const ok = await supActivate(side, choice, who);
    if (!ok) return;
  }
  await putState({ supDone: Object.assign({}, state.supDone || {}, { [side]: yes ? 'done' : 'pass' }) });
  await supNext();
}

function supBar(add, info, mk, me) {
  {
    const fo = [state.first, other(state.first)],
      dn = state.supDone || {};
    if (!fo.find(s => !dn[s])) {
      const mk2 = (t, f, g) =>
        mk(
          t,
          () =>
            Promise.resolve(f()).then(() => {
              if (state.step === 'supdecl') supNext();
            }),
          g
        );
      if (supChoiceNeeded(me) && supChoiceBar(add, mk2, me, info)) return;
      info.textContent = 'Waiting for ' + WHO(other(me)) + ' to finish their Supremacy choices.';
      return;
    }
  }
  const first = state.first,
    order = [first, other(first)],
    done = state.supDone || {},
    who = order.find(s => !done[s]);
  const theirs = order
    .filter(s => done[s] === 'done' && supOf(s))
    .map(s => WHO(s) + ' activated ' + supOf(s).k)
    .join(' · ');
  if (who !== me) {
    info.textContent =
      `Supremacy Abilities: waiting for ${WHO(who || other(me))} to decide.` +
      (theirs ? ' ' + theirs + '.' : '');
    return;
  }
  if (supNeedPrey(me)) {
    info.textContent =
      'The Big Game Hunt: mark an enemy regiment as your Prey. Your Clashes and Volleys against it count as Inspired and Taking Aim.';
    add(supPreySel(me, 'Prey'));
    return;
  }
  const S = supOf(me);
  if (!S && wlMissing(me)) {
    info.textContent =
      'Your army has no Warlord declared. Choose your Warlord: its Supremacy Ability is offered next.';
    const sl = document.createElement('select');
    sl.className = 'tf-in';
    sl.setAttribute('aria-label', 'Warlord');
    wlCands(me).forEach(u => {
      const o = document.createElement('option');
      o.value = u.id;
      o.textContent = u.charName ? u.charName + ' (with ' + (u.short || u.name) + ')' : u.short || u.name;
      sl.appendChild(o);
    });
    add(sl);
    add(
      mk('Declare as Warlord', async () => {
        await wlDeclare(sl.value);
        await supNext();
      })
    );
    add(mk('Play without a Warlord', () => supDecide(me, false), true));
    return;
  }
  if (!S || (!S.can && !(supOf(me, 'ally') || {}).can)) {
    info.textContent = 'Supremacy Abilities: none to activate this round.';
    add(mk('Continue', () => supDecide(me, false)));
    return;
  }
  const SA0 = supOf(me, 'ally'),
    both = S.can && SA0 && SA0.can;
  info.textContent =
    `Supremacy Abilities (${who === first ? 'First Player declares first' : 'the First Player has declared'}). ` +
    (both
      ? `Activate ${S.k} or the Dynastic Ally’s ${SA0.k} (only one per Supremacy Phase)?`
      : `Activate ${S.can ? S.k : SA0.k}?`) +
    (theirs ? ' ' + theirs + '.' : '');
  if (S.can)
    add(
      ptext(
        S.d.a +
          (S.d.every ? ' (every round)' : S.d.uses ? ` (${S.d.uses - S.used} left)` : ' (once per battle)') +
          ' The map applies it.'
      )
    );
  if (S.can) {
    if (S.d.cho)
      S.d.cho
        .filter(c => !(S.g.chosen || []).includes(c))
        .forEach(c => add(mk('Activate: ' + c, () => supDecide(me, true, c))));
    else add(mk('Activate ' + S.k, () => supDecide(me, true)));
  }
  /* the Dynastic Ally's ability: one Activated Supremacy Ability per phase, so it is either this or the Warlord's */
  const SA = supOf(me, 'ally');
  if (SA && SA.can) {
    add(
      ptext(
        'Dynastic Ally (' +
          SA.wl.charName +
          '): ' +
          SA.d.a +
          (SA.d.every ? ' (every round)' : ' (once per battle)')
      )
    );
    add(mk('Activate ' + SA.k + ' (Dynastic Ally)', () => supDecide(me, true, '', 'ally')));
  }
  add(mk('Not this round', () => supDecide(me, false), true));
}

/* full text in the Faction rules panel and the character's card */
function supBlock(side, mine, who) {
  const S = supOf(side, who);
  if (!S) return null;
  const box = bEl('div', { className: 'fr-blk' });
  box.append(ptext((S.wl.charName || 'Warlord') + (S.ally ? ' (Dynastic Ally)' : '') + ' · ' + S.k));
  if (S.d.p) box.append(ptext((S.d.t ? S.d.t + ': ' : '') + S.d.p));
  if (S.d.a)
    box.append(
      ptext(
        'Activated' +
          (S.d.every ? ' (every round)' : S.d.uses ? ' (' + S.d.uses + ' times)' : ' (once per battle)') +
          ': ' +
          S.d.a +
          (S.active
            ? ' — active this round' + (S.choice ? ' (' + S.choice + ')' : '') + '.'
            : S.used && !S.d.every
              ? ' — used.'
              : '')
      )
    );
  supTrackers(side, box, mine);
  if (S.d.prey && mine && (SBX() || !supPrey(side)))
    box.append(supPreySel(side, supPrey(side) ? 'Change the Prey' : 'Prey'));
  else if (S.d.prey)
    box.append(
      ptext(supPrey(side) ? 'Prey: ' + (supPrey(side).short || supPrey(side).name) : 'No Prey marked.')
    );
  if (mine && SBX() && (S.d.a || S.d.unknown)) {
    const r = bEl('div', { className: 'fr-opts' });
    if (S.can) {
      (S.d.cho ? S.d.cho.filter(c => !(S.g.chosen || []).includes(c)) : ['']).forEach(c =>
        r.append(abBtn('Activate' + (c ? ': ' + c : ''), () => supActivate(side, c, who), 'ab-tog'))
      );
    } else r.append(bEl('span', { className: 'hint', textContent: S.why }));
    if (S.used)
      r.append(
        abBtn(
          'Reset',
          () => {
            const sup = Object.assign({}, state.sup || {});
            delete sup[S.key];
            return putState({ sup });
          },
          'ab-tog'
        )
      );
    box.append(r);
  }
  return box;
}
