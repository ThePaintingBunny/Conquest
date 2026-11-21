/*
 * Combat special rules
 *
 * Contact arcs, Water and aura effects in a Clash, Fearsome, Decay, queued follow-up combats and
 * everything that triggers after combat.
 *
 * In this file: contactArc(), cArcU(), cArc(), mostlyHindering(), srClashWater(), srWaterAura(),
 *   srAirNow(), cbQueue, queueHits(), srQueue(), srFearsome(), decayN(), srAfterCombat()
 */

/* combat helpers */
/* the arc an engaged enemy is in contact with: if it touches the front edge it is in the front arc, otherwise the edge it touches most */
/* which arc of T the attacker is fighting: the target edge with the longest stretch actually in contact (a corner merely touching does not count) */
function contactArc(T, A) {
  const C = corners(T),
    P = corners(A),
    N = 24,
    pd = q => (inside(q, P) ? 0 : Math.min(...[0, 1, 2, 3].map(j => segDist(q, P[j], P[(j + 1) % 4]))));
  const len = {};
  for (let i = 0; i < 4; i++) {
    const e0 = C[i],
      e1 = C[(i + 1) % 4],
      L = Math.hypot(e1[0] - e0[0], e1[1] - e0[1]);
    let n = 0;
    for (let k = 0; k < N; k++) {
      const t = (k + 0.5) / N;
      if (pd([e0[0] + (e1[0] - e0[0]) * t, e0[1] + (e1[1] - e0[1]) * t]) <= 0.4) n++;
    }
    if (n) {
      const arc = arcOf(T, [(e0[0] + e1[0]) / 2, (e0[1] + e1[1]) / 2]);
      len[arc] = (len[arc] || 0) + (L * n) / N;
    }
  }
  let best = null;
  Object.entries(len).forEach(([a, l]) => {
    if (!best || l > best[1] + 1e-6 || (Math.abs(l - best[1]) <= 1e-6 && a === 'front')) best = [a, l];
  });
  return best && best[1] >= 0.05 ? best[0] : null;
}

function cArcU(T, A) {
  if (!T || !A) return 'front';
  if (rh(RU(T), 'Acute Senses')) return 'front';
  if (A.onTable && T.onTable && polyDist(corners(A), corners(T)) <= 0.4) {
    const c = contactArc(T, A);
    if (c) return c;
  }
  return arcOf(T, [A.x, A.y]);
}

function cArc(t, p) {
  return rh(RU(t), 'Acute Senses') ? 'front' : arcOf(t, p);
}

function mostlyHindering(u) {
  const P = standCenters(u);
  if (!P.length) return false;
  return (
    P.filter(p => terrainOf().some(t => tHas(t, 'Hindering') && inT(t, p))).length >= Math.ceil(P.length / 2)
  );
}

function srClashWater(A) {
  return engaged(A).some(
    e => rh(e.rules, 'Dread Tide') || hasGrant(e, 'Tidecaller: engaged enemies count as in Water')
  );
}

function srWaterAura(u) {
  return (
    rh(u.rules, 'Water Elemental') &&
    srFriends(u).some(
      f => hasGrant(f, 'Tidecaller: Water Elementals within 8″ count as in Water') && srNear(f, u, 8)
    )
  );
}

function srAirNow(side) {
  const g = frG(side, 'sk');
  return !!g.airNow;
}

let cbQueue = [];

/* Hits from a spell or an ability: the defending player rolls Defense (and Morale, if the rule causes it) in the
   combat panel. o: { att, tgt, n, ap, label, morale, loose (Loose Formation halves them), text, thaumBy } */
function queueHits(o) {
  const T = byId(o.tgt) || base(o.tgt);
  if (!T || T.destroyed || !(o.n > 0)) return 0;
  const lf = o.loose && rh(RU(T), 'Loose Formation'),
    n = lf ? Math.ceil(o.n / 2) : o.n,
    nm = T.short || T.name;
  srQueue({
    type: 'lethal',
    att: o.att,
    tgt: o.tgt,
    inAct: false,
    lethalHits: n,
    lethalX: 0,
    lethalLost: 0,
    lethalRed: o.ap || 0,
    lethalLabel: o.label,
    spellHit: true,
    hitMorale: !!o.morale,
    thaumBy: o.thaumBy || null,
    selfTitle: o.label,
    selfText:
      (o.text ? o.text + ' ' : '') +
      `${nm} takes ${n} Hit${n === 1 ? '' : 's'}` +
      (o.ap ? ` with Armor Piercing (${o.ap})` : '') +
      (lf ? ' (halved: Loose Formation)' : '') +
      `. Roll its Defense` +
      (o.morale ? ', then test Morale for the wounds.' : '; no Morale Tests.')
  });
  return n;
}

function srQueue(o) {
  cbQueue.push(o);
  if (!cb)
    setTimeout(() => {
      if (!cb && cbQueue.length) openCombat(cbQueue.shift());
    }, 60);
}

/* ---- Fearsome: an enemy in contact must pass a D6 at or under its best Resolve to Combat Rally or Combat Reform ---- */
function srFearsome(u, type) {
  if (!['crally', 'creform'].includes(type)) return true;
  const R = RU(u);
  if (rh(R, 'Fearless') || rh(R, 'Bravery')) return true;
  const f = engaged(u).find(e => rh(RU(e), 'Fearsome'));
  if (!f) return true;
  const best = Math.max(+(u.stats && u.stats.R) || 0, +(u.charName && chStatsX(u).R) || 0),
    pass = v => (v <= best && v !== 6) || v === 1,
    what = type === 'crally' ? 'Combat Rally' : 'Combat Reform';
  /* a player rolls the test themselves; once it is passed the action starts again with the test done */
  if (act.fearOk === type) {
    act.fearOk = null;
    return true;
  }
  if (rollAskWho(u.side)) {
    askRoll({
      title: 'Fearsome: ' + (f.short || f.name),
      text: `${u.short || u.name} needs ${best} or less to ${what}.`,
      n: 1,
      side: u.side,
      ok: pass,
      sum: r => (pass(r[0]) ? 'Passed' : 'Failed: the action is lost')
    }).then(r => {
      if (!act || act.id !== u.id) return;
      if (pass(r[0])) {
        act.fearOk = type;
        startAction(type);
      } else {
        const st = { x: u.x, y: u.y, facing: u.facing || 0, files: geom(u).files };
        act.actions.push({ type, failed: true, fearsome: true, from: st, to: st });
        toast('Fearsome: the test failed, so the action is lost.');
        render();
      }
    });
    return false;
  }
  const v = d6(),
    ok = pass(v);
  banner(
    'Fearsome: ' + (f.short || f.name),
    [{ v, cls: ok ? 'hit' : 'miss' }],
    `${u.short || u.name} needs ${best} or less to ${type === 'crally' ? 'Combat Rally' : 'Combat Reform'}`
  );
  setTimeout(bannerHide, 1300);
  if (!ok) {
    const st = { x: u.x, y: u.y, facing: u.facing || 0, files: geom(u).files };
    act.actions.push({ type, failed: true, fearsome: true, from: st, to: st });
    toast('Fearsome: the test failed, so the action is lost.');
    render();
  }
  return ok;
}

/* ---- Decay with its reductions ---- */
function decayN(u) {
  if (fxHas(u, /^(Cure|Oathstone)/)) return 0;
  let n = u.type === 'monster' ? 3 : live(u);
  if (rh(u.rules, 'Superior Creations')) n = Math.max(0, n - 1);
  if (rh(u.rules, 'Optimized Fodder')) n = Math.min(n, 6);
  if (rh(cR(u), 'The Best That Money Can Buy')) n = Math.ceil(n / 2);
  const wl = supWl(u.side);
  if (wl && wl.id === u.id && supKey(wl) === 'Induced Aggression') n = 0;
  return n;
}

/* ---- after combat: Designate Target, Battery, Avatar of Nature, Devouring Moulder, Last Word, Acolytes, Visceral Bombardment, Prowl ---- */
async function srAfterCombat(S, before) {
  const A = base(S.att),
    T = base(S.tgt);
  if (!A || !T) return;
  let units = state.units.slice(),
    notes = [],
    changed = false;
  const set = (id, f) => {
    units = units.map(x => (x.id === id ? f(x) : x));
    changed = true;
  };
  const lostT = Math.max(0, live(before) - (T.destroyed ? 0 : live(T))),
    wounded = (T.wounds || 0) > (before.wounds || 0) || T.destroyed;
  if (S.mark) {
    set(S.mark.id, x => Object.assign({}, x, { [S.mark.k]: srRound() }));
  }
  if (S.healFriend) {
    const F = units
      .filter(
        x =>
          x.side === A.side &&
          x.onTable &&
          !x.destroyed &&
          x.type !== 'monster' &&
          (x.wounds || 0) > 0 &&
          canHeal(x)
      )
      .sort((p, q) => (q.wounds || 0) - (p.wounds || 0))[0];
    if (F) {
      set(F.id, x => Object.assign({}, x, { wounds: Math.max(0, (x.wounds || 0) - S.healFriend) }));
      notes.push((F.short || F.name) + ' heals ' + Math.min(S.healFriend, F.wounds));
    }
  }
  if (
    ['clash', 'impact', 'volley'].includes(S.type) &&
    wounded &&
    rh(RU(A), 'Designate Target') &&
    !T.destroyed
  ) {
    set(T.id, x => grantU(x, 'Marked (Designate Target)', []));
    notes.push((T.short || T.name) + ' is Marked');
  }
  if (S.type === 'volley' && wounded && rh(RU(A), 'Battery') && !T.destroyed) {
    set(T.id, x => grantU(x, 'Battery (−1 March)', [], { M: -1 }));
    notes.push('Battery: −1 March');
  }
  if (
    (S.type === 'clash' || S.type === 'volley') &&
    rh(T.rules, 'Avatar of Nature') &&
    !T.destroyed &&
    frFac(T) === 'Weaver Courts'
  ) {
    set(T.id, x => Object.assign({}, x, { seeds: Math.min(3, (+x.seeds || 0) + 1) }));
    notes.push('Avatar of Nature: +1 Seed');
  }
  if (lostT && rh(A.rules, 'Devouring Moulder') && act && act.id === A.id && canHeal(A)) {
    set(A.id, x => Object.assign({}, x, { wounds: Math.max(0, (x.wounds || 0) - lostT) }));
    notes.push('Devouring Moulder heals ' + lostT);
  }
  if (S.type === 'volley' && rh(A.rules, 'Prowl')) {
    set(A.id, x => Object.assign({}, x, { prowlLost: srRound() }));
  }
  if (T.destroyed && !before.destroyed && /Cultists|Hashashin/.test(frBase(T)) && rh(T.rules, 'Acolytes')) {
    const g = frG(T.side, 'od');
    const fr = frPatch(T.side, 'od', { aco: (+g.aco || 0) + 2 });
    if (changed || true) {
      await putState({ units, fr });
      units = state.units.slice();
      changed = false;
    }
    notes.push('Acolytes: 2 Power tokens to allocate');
  }
  if (changed)
    await putState({
      units,
      lastText: (state.lastText || '') + (notes.length ? ' ' + notes.join('; ') + '.' : '')
    });
  if (S.type === 'volley' && rh(RU(A), 'Visceral Bombardment')) {
    const ones = (S.groups || []).reduce((a, g) => a + (g.rolls || []).filter(r => r.v === 1).length, 0);
    if (ones) {
      const near = srEnemies(A).filter(e => e.id !== T.id && srNear(e, T, 3));
      near.forEach(e =>
        srQueue({
          type: 'lethal',
          att: A.id,
          tgt: e.id,
          inAct: false,
          lethalHits: ones,
          lethalX: 0,
          lethalLost: 0,
          lethalLabel: 'Visceral Bombardment',
          lethalRed: rx(RU(A), 'Armor Piercing'),
          selfTitle: 'Visceral Bombardment',
          selfText: `${ones} rolls of 1 also hit ${e.short || e.name} (within 3″ of the target): ${ones} Hits with Armor Piercing. No Morale Tests.`
        })
      );
    }
  }
  if (T.destroyed && !before.destroyed && rh(T.rules, 'Last Word')) {
    const anch = (state.units || []).filter(
      x => x.side === T.side && srAlive(x) && (x.charName || rx(x.rules, 'Wizard'))
    );
    const C = srEnemies(T).filter(e => anch.some(a => srNear(a, e, 8)));
    if (C.length)
      srQueue({
        type: 'lethal',
        att: T.id,
        tgt: C.length === 1 ? C[0].id : null,
        choices: C.map(e => e.id),
        inAct: false,
        lethalHits: 8,
        lethalX: 0,
        lethalLost: 0,
        lethalLabel: 'Last Word',
        flank: true,
        selfTitle: 'Last Word',
        selfText: `${T.short || T.name} is destroyed. Last Word: one enemy within 8″ of a friendly character or Wizard suffers 8 Hits against its flank. No Morale Tests.`
      });
  }
}
