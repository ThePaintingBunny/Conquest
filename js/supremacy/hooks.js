/*
 * Supremacy hooks
 *
 * Where Supremacy Abilities change the rest of the game: re-rolls and dice, Chants, command cards,
 * reinforcements, Awakening, after combat and tokens.
 *
 * In this file: supHitSrc(), supDefSrc(), supEvasion(), glimmerN(), supOnChant(), vocOk(), mwExtra(),
 *   srGodflesh(), supReinfNeed(), supAfterReinf(), supAfterReinf1(), supTactical(), supLeadByExample(),
 *   supParagon(), fsTok(), aolTry(), totPool(), supOnAwaken(), supAfterCombat(), supApplyBloom(),
 *   glimApply(), totAdd()
 */

/* re-roll and dice hooks */
function supHitSrc(A, g, T) {
  const S = [];
  if (srHas(A, /^Professional Troops/) && (g.type === 'clash' || !g.type))
    S.push({ k: 'fail', face: 6, src: 'Professional Troops' });
  if (srHas(A, /^Crop Rotation/)) S.push({ k: 'fail', face: 6, src: 'Crop Rotation' });
  return S;
}

function supDefSrc(T) {
  return srHas(T, /^Professional Troops/) ? [{ k: 'fail', face: 6, src: 'Professional Troops' }] : [];
}

function supEvasion(T, E) {
  return supOn(T.side, 'Divine Protection') && E < 2 ? E + 1 : E;
}

/* Glimmers of a Golden Age: once per round, 1+X failed hits become hits in a Legion Clash or Charge */
function glimmerN(A) {
  if (
    !supOn(A.side, 'Glimmers of a Golden Age') ||
    !supRoles(A).includes('The Legion') ||
    supMem(A.side).glR === srRnd()
  )
    return 0;
  return 1 + (supAct(A.side, 'Glimmers of a Golden Age') ? 4 : odTierU(A, 'dark'));
}

/* chants */
function supOnChant(u, cult) {
  let units = state.units;
  const k = supK(u.side),
    notes = [];
  if (k === 'The Matriarch Walks' && (base(u.id).effects || []).includes('Broken')) {
    units = units.map(x =>
      x.id === u.id ? Object.assign({}, x, { effects: x.effects.filter(e => e !== 'Broken') }) : x
    );
    notes.push('The Matriarch Walks: no longer Broken');
  }
  if (k === 'Visions of Conquest' && cult === 'Conquest') {
    const E = engaged(u).map(e => e.id);
    units = units.map(x => (E.includes(x.id) ? grantU(x, 'Dissonance (no Inspiration this round)', []) : x));
    if (E.length) notes.push('Visions of Conquest: engaged enemies lose Inspiration');
  }
  if (k === 'Visions of War' && cult === 'War') {
    units = units.map(x =>
      x.id === u.id ? grantU(x, 'Visions of War (Tenacious (1))', ['Tenacious (1)']) : x
    );
    notes.push('Visions of War: Tenacious (1)');
  }
  if (k === 'Visions of Death' && cult === 'Death' && /Infantry/.test(u.cls || '')) {
    units = units.map(x =>
      x.id === u.id ? grantU(x, 'Visions of Death (Command Stand +3 Attacks)', []) : x
    );
    notes.push('Visions of Death: Command Stand +3 Attacks');
  }
  return { units, notes };
}

/* the Matriarch Walks and Visions of Conquest (card choice) */
function vocOk(c) {
  return supAct(HU, 'Visions of Conquest') && huStackOn() && validCards(PS().huStack).includes(c);
}

function mwExtra(side) {
  return supAct(side, 'The Matriarch Walks') && supMem(side).mwR !== srRnd();
}

/* Carrier of the Godflesh */
function srGodflesh(side, card) {
  if (!card || !supOn(side, 'Carrier of the Godflesh')) return {};
  const id = card.slice(2),
    u = base(id);
  if (!u || !u.onTable) return {};
  const hard = rx((u.rules || []).concat(fx(u)), 'Hardened');
  return {
    units: state.units.map(x =>
      x.id === id && hard < 2 ? grantU(x, 'Carrier of the Godflesh (Hardened (+1))', ['Hardened (+1)']) : x
    ),
    lastText:
      'Carrier of the Godflesh: the Strategic Stack card is revealed (' +
      cardName(card) +
      '); ' +
      (u.short || u.name) +
      ' gains Hardened (+1).'
  };
}

/* reinforcements: Raid Tactics!, Infantry Tactics, Combat Maneuvers, Reigning Season, Tactical Superiority */
function supReinfNeed(u, need) {
  let n =
    supK(u.side) === 'Raid Tactics!' && (supRoles(u).includes('Mortals') || supRoles(u).includes('Exalted'))
      ? need + 1
      : need;
  /* Ways of the Speakers (W'adrhŭn): a Warlord with one of its Masteries gives the Monster regiments of its warband +1
     to their Reinforcement Roll; a 6 always fails */
  const wl = supWl(u.side);
  if (
    wl &&
    u.type === 'monster' &&
    frFac(u) === "W'adrhŭn" &&
    srSameWb(wl, u) &&
    upgOf(wl, /Apex Master|Drum Beast Rider|Tontorr Rider/)
  )
    n = Math.min(5, n + 1);
  return n;
}

function supAfterReinf(side, units, res) {
  supAll(side).forEach(S => supAfterReinf1(side, units, res, S));
}

function supAfterReinf1(side, units, res, S) {
  if (!S) return;
  const arr = units.filter(u => u.side === side && u.arriving && !u.onTable);
  const give = (u, src, r) => {
    Object.assign(u, grantU(u, src, r));
  };
  if (S.k === 'Combat Maneuvers') {
    const imp = arr.filter(u => /Infantry/.test(u.cls || '') && supRoles(u).includes('Imperial'));
    const L = imp.length ? imp.slice(0, 2) : arr.filter(u => /Infantry/.test(u.cls || '')).slice(0, 1);
    L.forEach(u => {
      give(u, 'Combat Maneuvers (Vanguard (5))', ['Vanguard (5)']);
      res.push(u.name + ' gains Vanguard (5) (Combat Maneuvers)');
    });
  }
  if (S.k === 'Reigning Season' && supMem(side).rsR !== srRnd()) {
    const u = arr.filter(u => u.type !== 'monster').sort((a, b) => (+b.points || 0) - (+a.points || 0))[0];
    if (u) {
      give(u, 'Reigning Season (Vanguard (3))', ['Vanguard (3)']);
      res.push(u.name + ' gains Vanguard (3) (Reigning Season)');
      state.sup = supMemo(side, { rsR: srRnd() });
    }
  }
}

function supTactical(side, pool, autoId) {
  if (!supHasK(side, 'Tactical Superiority') || !autoId) return null;
  return pool.find(
    u =>
      u.id !== autoId &&
      !u.arriving &&
      supRoles(u).includes('The Orders') &&
      reinfRule(u.cls, state.round || 1) !== 'no'
  );
}

/* Lead by Example: after an Orders regiment activates, the next card's non-Veteran regiment Rallies and gets +1 Clash and +2″ Charge */
function supLeadByExample(units, a) {
  const u = units.find(x => x.id === a.id);
  if (
    !u ||
    !supHasK(u.side, 'Lead by Example') ||
    supMem(u.side).lbR === srRnd() ||
    !supRoles(u).includes('The Orders')
  )
    return null;
  const st = (u.side === HU && !PVP() ? PS().huStack || [] : state.aiStack || []).filter(
    c => c[0] === 'u' && c.slice(2) !== u.id && cardOk(c)
  );
  const nx = st[0];
  if (!nx) return null;
  const t = units.find(x => x.id === nx.slice(2));
  if (!t || supRoles(t).includes('Veteran')) return null;
  const i = units.indexOf(t);
  let y = Object.assign({}, t, { effects: (t.effects || []).filter(e => e !== 'Broken') });
  if ((+y.stats.C || 0) < 4) y = grantU(y, 'Lead by Example (+1 Clash)', [], { C: 1 });
  y = grantU(y, 'Charge +2″ (Lead by Example)', []);
  units[i] = y;
  return 'Lead by Example: ' + (t.short || t.name) + ' Rallies and gets +1 Clash and +2″ Charge';
}

/* Paragon of War: while the Exemplar's regiment is engaged, all friendly regiments are Awakened */
function supParagon(st) {
  ['cs', 'nord'].forEach(side => {
    const w = st.units.find(u => u.side === side && u.warlord);
    if (!w || !/Exemplar/.test(w.charName || '') || !w.onTable || w.destroyed) return;
    const keep = state;
    state = st;
    try {
      if (!engaged(w).length) return;
      st.units = st.units.map(x =>
        x.side === side && x.onTable && !x.destroyed && x.type !== 'marker' && !hasGrant(x, 'Awakened')
          ? grantU(
              Object.assign({}, x, { effects: (x.effects || []).filter(e => e !== 'Broken') }),
              'Awakened',
              awakenRules(x)
            )
          : x
      );
    } finally {
      state = keep;
    }
  });
}

/* Field Studies (Biomancer): Observation tokens */
function fsTok(side) {
  return +supMem(side).fs || 0;
}

/* Army of Lions: once per game, reveal the top card before the Supremacy roll-off; a Polemarch card wins it */
function aolTry(side) {
  if (supK(side) !== 'Army of Lions' || supMem(side).aolUsed) return null;
  const S = supOf(side);
  if (!S.on) return null;
  const st = side === HU && !PVP() ? PS().huStack || [] : state.aiStack || [];
  const top = validCards(st)[0];
  if (!top) return null;
  const u = base(top.slice(2));
  const isP = top[0] === 'c' && u && /Polemarch/.test(u.charName || '');
  return { top, isP };
}

/* Tricks of the Trade: the Influence Pool */
function totPool(side) {
  return supMem(side).pool || [];
}

async function supOnAwaken(u) {
  if (!u) return;
  const k = supK(u.side);
  if (k === 'Herald of War' && srIsWl(u)) {
    for (const x of srFriends(u).filter(
      x => frRoles(x).includes('Ardent') && srNear(x, u, 8) && !hasGrant(x, 'Awakened')
    ))
      await awaken0(x.id, 'Herald of War');
  }
  if (k === 'Thesis/Antithesis/Synthesis') {
    const ids = (state.units || [])
      .filter(
        x =>
          x.side === u.side &&
          hasGrant(x, 'Awakened') &&
          !x.thesisR &&
          frRoles(x).includes('Forged') &&
          x.type !== 'monster' &&
          (x.wounds || 0) > 0 &&
          canHeal(x)
      )
      .map(x => x.id);
    if (ids.length)
      await putState({
        units: state.units.map(x =>
          ids.includes(x.id)
            ? Object.assign({}, x, { wounds: Math.max(0, (x.wounds || 0) - 2), thesisR: srRnd() })
            : x
        ),
        lastTitle: N(u.side) + ' · Thesis/Antithesis/Synthesis',
        lastText: 'Awakened Forged regiments heal 2 wounds.'
      });
  }
}

async function supAfterCombat(S, before) {
  const A = base(S.att),
    T = base(S.tgt);
  if (!A || !T) return;
  const lostT = Math.max(0, live(before) - (T.destroyed ? 0 : live(T)));
  const kA = supK(A.side);
  if (
    lostT &&
    (S.type === 'clash' || S.type === 'impact') &&
    kA === 'Driven by Carnage' &&
    supRoles(A).includes('Half-Bloods') &&
    canHeal(A) &&
    (A.wounds || 0) > 0
  ) {
    const h = lostT * (supAct(A.side, kA) ? 2 : 1);
    await putState({
      units: state.units.map(x =>
        x.id === A.id ? Object.assign({}, x, { wounds: Math.max(0, (x.wounds || 0) - h) }) : x
      ),
      lastText: (state.lastText || '') + ' Driven by Carnage: heals ' + h + '.'
    });
  }
  if (T.destroyed && !before.destroyed && act && act.id === A.id) {
    const dc =
        kA === 'Driven by Carnage' &&
        (srIsWl(A) || (supAct(A.side, kA) && supRoles(A).includes('Half-Bloods'))) &&
        (S.type === 'clash' || S.type === 'impact'),
      rp = supHasK(A.side, 'Relentless Protectors') && /Cavalry/.test(A.cls || '') && S.type === 'impact';
    if (dc || rp) {
      act.freeReform = dc ? 'Driven by Carnage' : 'Relentless Protectors';
      toast(act.freeReform + ': it may make a free out-of-sequence Reform.');
      render();
    }
  }
  if (T.destroyed && !before.destroyed) {
    for (const s of ['cs', 'nord'])
      if (supOn(s, 'Field Studies') && fsTok(s) < 4)
        await putState({ sup: supMemo(s, { fs: fsTok(s) + 1 }) });
  }
}

async function supApplyBloom(u) {
  const B = supBloom(u);
  if (!B) return;
  let units = state.units;
  if (B.rules || B.label)
    units = units.map(x =>
      x.id === u.id ? grantU(x, B.label || "Warlord's Bloom (" + B.rules.join(', ') + ')', B.rules || []) : x
    );
  if (B.heal)
    units = units.map(x =>
      x.id === u.id && canHeal(x)
        ? Object.assign({}, x, { wounds: Math.max(0, (x.wounds || 0) - B.heal) })
        : x
    );
  await putState({ units, lastText: (state.lastText || '') + " Warlord's Bloom Effect: " + B.t + '.' });
}

function glimApply() {
  if (!cb || !(cb.type === 'clash' || cb.type === 'impact')) return;
  const A = base(cb.att);
  if (!A) return;
  let n = glimmerN(A);
  if (!n) return;
  let used = 0;
  for (const g of cb.groups || [])
    for (const r of g.rolls || []) {
      if (n <= 0) break;
      if (!r.hit) {
        r.hit = true;
        r.glim = true;
        g.hits = (g.hits || 0) + 1;
        n--;
        used++;
      }
    }
  if (used) {
    cb.glim = used;
    state.sup = supMemo(A.side, { glR: srRnd() });
    putState({ sup: state.sup }).catch(() => {});
    toast('Glimmers of a Golden Age: ' + used + ' failed hit' + (used > 1 ? 's' : '') + ' become hits.');
  }
}

function totAdd(m) {
  Object.entries(m).forEach(([s, v]) => {
    if (supK(s) === 'Tricks of the Trade' && supMem(s).pool)
      state.sup = supMemo(s, { pool: totPool(s).concat([v]) });
  });
}
