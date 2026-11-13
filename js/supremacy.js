/* The Supremacy step and Warlord declaration. */
/* ---------- Supremacy Abilities (the Warlord's) ---------- */
/* t: when the passive part works; p: passive part; a: Activated part (once per battle unless every/uses);
   g: what the map applies automatically when activated (who gets which rules/stats until the end of the round) */
function supRoles(u) {
  const r = frRoles(u).slice();
  try {
    itemRoles(u).forEach(x => {
      if (!r.includes(x)) r.push(x);
    });
  } catch (e) {}
  /* Professional Troops: Feudal regiments in its holder's warband are Veteran; Feudal units gain the Dynastic Ally's role */
  if (frFac(u) === 'Hundred Kingdoms' && r.includes('Feudal')) {
    const PT = supAll(u.side).find(S => S.k === 'Professional Troops');
    if (PT) {
      if (!u.charName && PT.wl && srSameWb(PT.wl, u) && !r.includes('Veteran')) r.push('Veteran');
      const al = supAllyU(u.side),
        ar = al && frRoles(al, true).find(x => /^(Imperial|Feudal|Theist|The Orders)$/.test(x));
      if (ar && !r.includes(ar)) r.push(ar);
    }
  }
  if (frFac(u) === 'Old Dominion') {
    const wl = supWl(u.side);
    if (/Hierodeacon/.test((wl && wl.charName) || '') && /Cultists|Hashashin/.test(frBase(u)))
      r.push('The Fallen Pantheon');
  }
  return r;
}
const SUPALIAS = { 'concetrated assault': 'Concentrated Assault', 'for all mankind': 'For All Mankind' };
function supWl(side) {
  return (
    (state.units || []).find(
      u => u.side === side && (u.warlord || u.warlordMonster) && u.type !== 'marker'
    ) || null
  );
}
function supKey(u) {
  if (!u) return '';
  const cn = u.charName || frBase(u) || '';
  const byC = Object.keys(SUP).find(
    k =>
      SUP[k].c &&
      SUP[k].c.test(cn) &&
      (!/Strategos/.test(cn) || /Mounted/.test(cn) === (k === 'Glimmers of a Golden Age'))
  );
  const e = frEncy(u, u.charName || null),
    m = e && String(e.options || '').match(/Supremacy:\s*([^;]+)/);
  if (!m) return byC || '';
  const names = m[1]
    .split(/,\s*|\s+or\s+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => SUPALIAS[s.toLowerCase()] || s);
  if (names.length > 1 && byC && names.includes(byC)) return byC;
  return names[0] || byC || '';
}
/* Hundred Kingdoms Dynastic Ally: a second character with its own Supremacy Ability (and the rules that refer to the
   Warlord's warband), used as if it were the Warlord. It does not count as the Warlord for anything else. Only one
   Activated Supremacy Ability may be used per Supremacy Phase. Its activation is kept under the key "<side>@ally". */
function supAllyU(side) {
  return (state.units || []).find(u => u.side === side && u.dynAlly && u.type !== 'marker') || null;
}
function supAll(side) {
  return [supOf(side), supOf(side, 'ally')].filter(Boolean);
}
function supOf(side, who) {
  const ally = who === 'ally',
    wl = ally ? supAllyU(side) : supWl(side);
  if (!wl) return null;
  const k = supKey(wl);
  if (!k) return null;
  const d = SUP[k] || {
    t: '',
    p: 'The text of this Supremacy Ability is not in the rules this map uses yet. Check the Warlord’s card.',
    a: '',
    unknown: true
  };
  const key = ally ? side + '@ally' : side,
    okey = ally ? side : side + '@ally',
    g = (state.sup || {})[key] || {},
    R = state.round || 1,
    on = !!wl.onTable && !wl.destroyed && !(ally && wl.charSlain),
    used = +g.n || 0;
  const active = g.round === R,
    max = d.uses || 1,
    otherActive = ((state.sup || {})[okey] || {}).round === R;
  let why = '';
  if (!d.a && !d.unknown) why = 'No Activated part';
  else if (!on) why = ally ? 'The Dynastic Ally must be on the table' : 'The Warlord must be on the table';
  else if (active) why = 'Already active this round';
  else if (otherActive) why = 'Only one Activated Supremacy Ability per Supremacy Phase';
  else if (!d.every && used >= max) why = max > 1 ? 'Used twice already' : 'Already used this battle';
  return { wl, k, d, on, used, active, why, can: !why, g, choice: g.choice, ally, key };
}
function supApply(units, side, S, choice) {
  const g = S.d.g;
  if (!g) return units;
  const src = 'Supremacy: ' + S.k;
  return units.map(u => {
    if (u.side !== side || u.type === 'marker' || u.destroyed || !u.onTable || !g.who(u)) return u;
    let y = grantU(u, src, typeof g.rules === 'function' ? g.rules(u) : g.rules || [], g.stats || null);
    if (g.heal && (y.wounds || 0) > 0 && canHeal(y))
      y = Object.assign({}, y, { wounds: Math.max(0, (y.wounds || 0) - g.heal) });
    return y;
  });
}
async function supActivate(side, choice, who) {
  const S = supOf(side, who);
  if (!S || !S.can) {
    toast(S ? S.why : 'No Supremacy Ability');
    return false;
  }
  const sup = Object.assign({}, state.sup || {});
  sup[S.key] = Object.assign({}, S.g, {
    n: (S.used || 0) + 1,
    round: state.round || 1,
    choice: choice || '',
    chosen: (S.g.chosen || []).concat(choice ? [choice] : [])
  });
  let units = supApply(state.units || [], side, S, choice);
  if (choice === 'Snæstormur')
    units = units.map(u =>
      u.side !== side && u.type !== 'marker' && !u.destroyed
        ? grantU(u, 'Snæstormur (−1 March, no Charge re-rolls)', [], { M: -1 })
        : u
    );
  if (choice === 'Niflmire')
    units = units.map(u =>
      u.type !== 'marker' && !u.destroyed ? grantU(u, 'Niflmire (Barrage range halved)', [], null) : u
    );
  await putState({
    sup,
    units,
    lastTitle: WHO(side) + ' · Supremacy',
    lastText: `${S.wl.charName || 'The Warlord'}${S.ally ? ' (Dynastic Ally)' : ''} activates ${S.k}${choice ? ' (' + choice + ')' : ''}: ${S.d.a}`
  });
  return true;
}
function supPrey(side) {
  const S = supOf(side);
  if (!S || !S.d.prey) return null;
  const id = S.g.prey,
    t = id && (state.units || []).find(x => x.id === id);
  return t && !t.destroyed ? t : null;
}
function supPreyOpts(side) {
  return (state.units || [])
    .filter(t => t.side !== side && t.type !== 'marker' && !t.destroyed)
    .sort((a, b) => (+b.points || 0) - (+a.points || 0));
}
function supNeedPrey(side) {
  const S = supOf(side);
  return !!(S && S.d.prey && !supPrey(side) && supPreyOpts(side).length);
}
function supSetPrey(side, id) {
  const S = supOf(side);
  if (!S) return;
  const t = byId(id);
  const sup = Object.assign({}, state.sup || {});
  sup[side] = Object.assign({}, sup[side] || {}, { prey: id });
  return putState({
    sup,
    lastTitle: WHO(side) + ' · The Big Game Hunt',
    lastText:
      'Prey marked: ' +
      (t ? t.short || t.name : id) +
      '. Friendly Clashes and Volleys against it count as Inspired and Taking Aim.'
  });
}
function supPreySel(side, lead) {
  const r = bEl('div', { className: 'tf-row' });
  const sel = document.createElement('select');
  sel.setAttribute('aria-label', 'Prey');
  const cur = supPrey(side);
  const o0 = document.createElement('option');
  o0.value = '';
  o0.textContent = cur ? 'Prey: ' + (cur.short || cur.name) : 'Choose the Prey…';
  sel.append(o0);
  supPreyOpts(side).forEach(t => {
    const o = document.createElement('option');
    o.value = t.id;
    o.textContent = (t.short || t.name) + (t.onTable ? '' : ' (off the table)');
    sel.append(o);
  });
  sel.onchange = () => {
    if (sel.value)
      Promise.resolve(supSetPrey(side, sel.value)).then(() => {
        if (state.step === 'supdecl') supNext();
      });
  };
  r.append(bEl('span', { className: 'tf-l', textContent: lead || 'The Big Game Hunt' }), sel);
  return r;
}
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
/* the Supremacy step: after the First Player is set, First Player declares, then the other */
/* characters (or monster characters) that could be the Warlord when none was declared */
function wlCands(side) {
  return (state.units || []).filter(
    u =>
      u.side === side &&
      !u.destroyed &&
      u.type !== 'marker' &&
      ((u.charName && canWarlord(frEncy(u, u.charName) || { name: u.charName })) ||
        (!u.charName && u.type === 'monster' && (frEncy(u) || {}).kind === 'char' && canWarlord(frEncy(u))))
  );
}
function wlMissing(side) {
  return !supWl(side) && wlCands(side).length > 0 && (PVP() || side === HU);
}
async function wlDeclare(id) {
  const u = base(id);
  if (!u) return;
  await putState({
    units: state.units.map(x =>
      x.side !== u.side
        ? x
        : x.id === id
          ? Object.assign({}, x, x.charName ? { warlord: true } : { warlordMonster: true })
          : Object.assign({}, x, { warlord: false, warlordMonster: false })
    ),
    lastTitle: N(u.side) + ' · Warlord',
    lastText: (x => x)((u.charName || u.short || u.name) + ' is declared the Warlord.')
  });
}
function supNeeded() {
  return ['cs', 'nord'].some(s => {
    const S = supOf(s),
      SA = supOf(s, 'ally');
    return wlMissing(s) || (SA && SA.can) || (S && (S.can || supNeedPrey(s) || supChoiceNeeded(s)));
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
