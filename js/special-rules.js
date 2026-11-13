/* Special rules engine: unit rules beyond the core combat checks (charges, Broken/Shattered, extra actions...). */
/* ================= Special rules engine: unit rules beyond the core combat checks =================
   Rule texts from the 2026 faction PDFs (City States: Post-Adepticon) and the core rules. */
const RU = u => (u ? (u.rules || []).concat(fx(u)) : []);
function cR(u) {
  return u && u.charName ? u.charRules || [] : [];
}
function srAlive(u) {
  return !!u && u.onTable && !u.destroyed && u.type !== 'marker';
}
function srFriends(u) {
  return (state.units || []).filter(x => x.side === u.side && x.id !== u.id && srAlive(x));
}
function srEnemies(u) {
  return (state.units || []).filter(x => x.side !== u.side && srAlive(x));
}
function srNear(a, b, d) {
  return srAlive(a) && srAlive(b) && polyDist(corners(a), corners(b)) <= d + 1e-6;
}
function srMods(u) {
  return Array.isArray(u.mods) ? u.mods : [];
}
function srAllMods(u, re) {
  const m = srMods(u);
  return !m.length || m.every(x => re.test(x));
}
function srSameWb(a, b) {
  return a.wb != null && b.wb != null ? a.wb === b.wb : true;
}
function srCharWith(u, rule) {
  return (state.units || []).filter(x => x.side === u.side && !x.destroyed && rh(cR(x), rule));
}
/* below starting strength: lost a stand (or, for one-stand regiments, took a wound) */
function belowStart(u) {
  if (!u) return false;
  const one = u.type === 'monster' || (u.stands || 1) <= 1;
  return one ? (+u.wounds || 0) > 0 : live(u) < (u.stands || 0);
}
function srRound() {
  return state.round || 1;
}
function srConcentrated(ch) {
  return !!ch.warlord && supKey(ch) === 'Concentrated Assault';
}
/* ---- derived rules: rule strings a unit has because of where it is, who leads it or its state ---- */
function dRules(u) {
  const o = [];
  if (!state || !u || u.type === 'marker') return o;
  let roles = [];
  try {
    roles = frRoles(u);
  } catch (e) {}
  const add = (...r) =>
    r.forEach(x => {
      if (!o.includes(x)) o.push(x);
    });
  if (rh(cR(u), 'Stoic')) add('Indomitable (1)');
  if (rh(cR(u), "Tribe's Pride")) add(u.rider && upgOf(u, /Tontorr Rider/) ? 'Vanguard (5)' : 'Flurry');
  if (
    roles.includes('Forged') &&
    (state.units || []).some(
      x =>
        x.side === u.side &&
        x.rider &&
        srAlive(x) &&
        upgOf(x, /Ferric Throne/) &&
        (x.id === u.id || srNear(x, u, 8))
    )
  )
    add('Unstable Alloys');
  if (rh(cR(u), 'Ceaseless Hunt')) add('Fire and Advance');
  if (rh(cR(u), 'Imposing Excellence') && roles.includes('Husk')) add('Parry');
  if (/Shaman/.test(u.charName || '') && rh(u.rules, 'Bodyguard while a Shaman is attached'))
    add('Bodyguard');
  if (roles.includes('The Tribes')) {
    for (const ch of srCharWith(u, 'Crushing Force'))
      if (ch.id === u.id || srConcentrated(ch) || srNear(ch, u, 8)) {
        add('Trample (1)');
        break;
      }
    for (const ch of srCharWith(u, 'Tempo')) {
      const c = srConcentrated(ch);
      if (c || srSameWb(ch, u)) {
        add('Vanguard (' + (c ? 4 : 3) + ')');
        break;
      }
    }
  }
  if (frBase(u) === 'Thunder Riders' && srCharWith(u, 'Ride the Lightning').some(ch => srSameWb(ch, u)))
    add('Flank');
  if (roles.includes('The Speakers') && srCharWith(u, 'Expert Hunters').some(ch => srSameWb(ch, u)))
    add('Ignores Hindering terrain', 'Ignores Dangerous terrain', 'Ignores Perilous terrain');
  const below = belowStart(u) || !!u.belowOnce;
  if (rh(u.rules, 'Rampage') && belowStart(u)) add('Rampage (+1 Clash, +1 Attacks)');
  if (rh(u.rules, 'Shattered Perfection') && below)
    add('Smite', 'Fury', 'Oblivious', 'Charge +2″ (Shattered Perfection)');
  if (rh(u.rules, 'Raging Elements') && below) add('Flurry', 'Raging Elements (one extra Clash)');
  if (rh(u.rules, 'Titanic Defiance') && engaged(u).some(e => e.type === 'monster')) add('Fearless');
  if (rh(u.rules, 'Spirit Breeze') || srMods(u).some(m => /Tengu Ayakashi/.test(m)))
    add('March +1 (Spirit Breeze)');
  if (rh(u.rules, 'In the Fold') && srAllMods(u, /Origami/))
    add('Vanguard (3)', 'Cannot be Broken (In the Fold)');
  if (rh(u.rules, 'Fly if only Tengu') && srAllMods(u, /Tengu/)) add('Fly');
  if (rh(u.rules, 'Blade Masters') && srAllMods(u, /Tengu Bushi/))
    add('Blade Masters (Flawless on 1s and 2s)');
  if (rh(u.rules, 'Life for Glory') || rh(u.rules, 'no Resolve, cannot Break'))
    add('Cannot be Broken (Life for Glory)');
  if (
    act &&
    act.id === u.id &&
    u.type !== 'monster' &&
    srFriends(u).some(f => rh(f.rules, 'Cheerful') && srNear(f, u, 8))
  )
    add('Cheerful (+1 Resolve)');
  if (rh(u.rules, 'Just Desserts')) {
    const s = spSect(u.side);
    if (/Sovereign/.test(s)) add('Hardened (1)');
    else if (/Directorate/.test(s)) add('March +2 (Just Desserts)');
    else if (/Underspire/.test(s)) add('Regeneration (2)');
  }
  if (u.gorged) {
    add('Gorged (+6 Attacks, Strain always on)');
    const S = srStrain(u);
    if (S) (S[1] || []).forEach(r => add(r));
  }
  if (
    rh(u.rules, 'Prowl') &&
    u.prowlLost !== srRound() &&
    !srEnemies(u).some(e => srNear(e, u, 8 - 1e-6) && !tLos(e, u))
  )
    add('Prowling (−2 March, does not Seize, unseen from 8″ or more)');
  if (
    rh(u.rules, 'Earthen Aegis') &&
    u.onTable &&
    terrainOf().some(t => tHas(t, 'Earth') && terrDist(corners(u), t) <= 3)
  )
    add('Regeneration (+4)', 'Ignores Dangerous terrain', 'Ignores Perilous terrain');
  if (rh(u.rules, 'Water Elemental') && srFriends(u).some(f => rh(f.rules, 'Dread Tide') && srNear(f, u, 8)))
    add('Terrifying (+1)');
  if (
    srEnemies(u).some(
      e =>
        rh(e.rules, 'Primal Cacophony') &&
        (e.temp || []).some(g => /^Chant: /.test(g.src)) &&
        srNear(e, u, 12)
    )
  )
    add('Primal Cacophony (cannot Heal, Rally or Entourage-activate)');
  if (u.thegnTactic && TACTICS[u.thegnTactic] && offOn(u, 'thegn'))
    TACTICS[u.thegnTactic].forEach(x => add(x + ' (Thegn)'));
  try {
    supDR(u).forEach(x => add(x));
  } catch (e) {}
  try {
    itemRegRules(u).forEach(x => add(x));
  } catch (e) {}
  {
    const h = huntedOf(u.side);
    if (h && /Inquisitor/.test(frBase(u)) && engaged(u).some(e => e.id === h.id))
      add('Terrifying (2) (Hunted)');
  }
  if (supOn(u.side, 'Bringing Back the Children of Fire') && roles.includes('Titan')) add('Priest (+3)');
  return o;
}
function srHas(u, re) {
  return fx(u).some(x => re.test(x));
}
function canHeal(u) {
  return !srHas(u, /^Primal Cacophony/);
}
function noBreak(u) {
  return srHas(u, /^Cannot be Broken/) || hasGrant(u, 'Awakened');
}
/* stat changes from rules */
function srStat(u, kind) {
  const d = { C: 0, A: 0 };
  if (kind !== 'reg') return d;
  if (srHas(u, /^Rampage \(/)) {
    d.C++;
    d.A++;
  }
  if (srHas(u, /^Fury \(\+1 Attacks\)/)) d.A++;
  if (srHas(u, /^Gorged/)) d.A += 6;
  return d;
}
/* movement */
function vgOf(u) {
  return Math.max(+u.vanguard || 0, rx(RU(u), 'Vanguard'));
}
function srMarchMod(u) {
  let m = 0;
  const F = fx(u);
  F.forEach(x => {
    const k = x.match(/^March \+(\d+)/);
    if (k) m += +k[1];
  });
  if (F.some(x => /^Prowling/.test(x))) m -= 2;
  if (rh(u.rules, 'March of Giants')) {
    const neg = (u.temp || []).reduce((a, g) => a + Math.min(0, (g.d && g.d.M) || 0), 0);
    m -= neg;
  }
  return m;
}
function srFirstMarch(u) {
  let b = 0;
  if (act && act.id === u.id) {
    b += act.srFirstMarch || 0;
    if (act.bloody && srFirstAct(u)) b += 1;
    if (srHas(u, /^Divine Purpose/) && !act.dpUsed) {
      b += 2;
      act.dpUsed = 'march';
    }
  }
  return b;
}
/* Combined Arms Drills (City States Mastery): an enemy that charges a friendly Infantry regiment is marked; friendly
   Brutes and Cavalry that then successfully charge it gain Terrifying (+1), to at most Terrifying (2), for that activation */
function cadArmy(side) {
  return all().some(x => x.side === side && !x.destroyed && upgOf(x, /Combined Arms Drills/));
}
const CAD_MARK = 'Charged Infantry (Combined Arms Drills)';
function cadOnCharge(cid, tid) {
  const C = byId(cid),
    T = byId(tid);
  if (!C || !T) return;
  if (upgOf(C, /Like Gods Among Men/) && /Cavalry/.test(C.cls || '')) {
    const H = all()
      .filter(
        x =>
          x.side === C.side &&
          x.onTable &&
          !x.destroyed &&
          /Infantry/.test(x.cls || '') &&
          (+x.wounds || 0) > 0 &&
          canHeal(x) &&
          polyDist(corners(C), corners(x)) <= 8
      )
      .sort((a, b) => (+b.wounds || 0) - (+a.wounds || 0))[0];
    if (H) {
      const n = Math.min(4, +H.wounds || 0);
      putState({
        units: state.units.map(x =>
          x.id === H.id ? Object.assign({}, x, { wounds: (+x.wounds || 0) - n }) : x
        ),
        lastTitle: N(C.side) + ' · Like Gods Among Men',
        lastText: (H.short || H.name) + ' heals ' + n + ' wound' + (n === 1 ? '' : 's') + '.'
      });
      toast('Like Gods Among Men: ' + (H.short || H.name) + ' heals ' + n + '.');
    }
  }
  if (/Brute|Cavalry/.test(C.cls || '') && cadArmy(C.side) && hasGrant(base(T.id), CAD_MARK)) {
    const now = rx(RU(C), 'Terrifying');
    if (now < 2 && act && act.id === cid) {
      act.extraFx.push('Terrifying (+1) (Combined Arms Drills)');
      toast('Combined Arms Drills: ' + (C.short || C.name) + ' gains Terrifying (+1) this activation.');
    }
  }
  if (/Infantry/.test(T.cls || '') && cadArmy(T.side) && !hasGrant(base(C.id), CAD_MARK))
    putState({ units: state.units.map(x => (x.id === cid ? grantU(x, CAD_MARK, []) : x)) });
}
/* the first action of this activation still to come (Bloody Sacrifice: +1 March until the end of the first action) */
function srFirstAct(u) {
  return !!(act && act.id === u.id && !act.actions.some(a => !a.free));
}
function seizeAdv(u) {
  return all().some(x => x.side === u.side && x.onTable && !x.destroyed && upgOf(x, /Seize the Advantage/));
}
/* Endocrine Overstimulation (Spires): friendly regiments within 8″ of the character roll 2D6, highest, for the Charge */
function endocrineNear(u) {
  return all().some(
    x =>
      x.side === u.side &&
      x.onTable &&
      !x.destroyed &&
      upgOf(x, /Endocrine Overstimulation/) &&
      (x.id === u.id || polyDist(corners(x), corners(u)) <= 8)
  );
}
function srChargeBonus(u, t) {
  let b = 0;
  const F = fx(u).concat((u.rules || []).filter(r => /^Charge \+\d+″/.test(r) && !fx(u).includes(r)));
  F.forEach(x => {
    const k = x.match(/^Charge \+(\d+)″/);
    if (k) b += +k[1];
  });
  if (t) {
    if (rh(u.rules, 'Hubris') && t.type === 'monster') b += 3;
    if (rh(u.rules, 'Arrogance') && (t.type === 'monster' || t.charName)) b += 3;
    if (fx(t).some(x => /^Marked \(Designate Target\)/.test(x))) b += 2;
  }
  if (srHas(u, /^Divine Purpose/) && act && act.id === u.id && !act.dpUsed) b += 2;
  /* Seize the Advantage: Imperial regiments activated as an Entourage get +2″ Charge */
  if (act && act.id === u.id && act.source === 'entourage' && frRoles(u).includes('Imperial') && seizeAdv(u))
    b += 2;
  /* Bloody Sacrifice: +1 March until the end of the first action (a Charge as the first action) */
  if (act && act.bloody && srFirstAct(u)) b += 1;
  return b + srMarchMod(u);
}
function srSeizeStands(u, z, k) {
  if (srHas(u, /^Prowling/) || srHas(u, /^Refused a Duel/)) return 0;
  if (srHas(u, /^Children of Fire/)) return 6;
  let v = seizeVal(u);
  if (
    (u.effects || []).includes('Broken') &&
    hasGrant(u, 'Dominating Presence (its Seize count cannot be reduced)')
  )
    v = frBase(u) === 'Tontorr' ? 6 : 3;
  let s = k * v;
  if (
    u.charName &&
    rh(u.charRules || [], 'Powerful Presence') &&
    !/Light/.test(u.cls || '') &&
    standsOf(u).some(st => st.kind === 'char' && inZone(st.poly, z))
  )
    s += 3 - v;
  if (v > 0 && u.charName) {
    const xs = itemSpec(u).reduce(
      (a, [n, S]) => a + (typeof S.seize === 'function' ? S.seize(u) : +S.seize || 0),
      0
    );
    if (xs && standsOf(u).some(st => st.kind === 'char' && inZone(st.poly, z))) s += xs;
  }
  return s;
}
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
function srQueue(o) {
  cbQueue.push(o);
  if (!cb)
    setTimeout(() => {
      if (!cb && cbQueue.length) openCombat(cbQueue.shift());
    }, 60);
}
/* ---- successful charge: Fury, Wedge!, Glorious Charge, Death from Above, Thundering Charge, Savage Retaliation ... ---- */
function srOnCharge(u, c) {
  const R = RU(u),
    T = byId(c.target);
  if (!T) return;
  const push = x => {
    if (!act.extraFx.includes(x)) act.extraFx.push(x);
  };
  if (rh(R, 'Fury')) push('Fury (+1 Attacks)');
  if (rh(R, 'Wedge!') || rh(R, 'Wedge') || rh(R, 'Sundering Charge')) push('Cleave (+1)');
  if (rh(R, 'Glorious Charge')) push('Glorious Charge (Impact +1 Clash, Terrifying (1))');
  const arc = c.face || arcOf(T, [u.x, u.y]);
  if (rh(R, 'Death from Above') && arc !== 'front') push('Brutal Impact (2)');
  const used = act.actions.filter(a => !a.free),
    prev = used[used.length - 1];
  if (act.thunder && prev && prev.type === 'march') push('Brutal Impact (+1)');
  if (rh(R, 'Resounding Malevolence') && prev && prev.type === 'march') act.resoundT = T.id;
  if (arc === 'front' && offOn(T, 'dori'))
    act.postFx = (act.postFx || []).concat([[T.id, 'Inspired (Dorilates)']]);
  if (rh(RU(T), 'Savage Retaliation') && arc === 'front' && !mostlyHindering(T))
    srQueue({
      type: 'impact',
      att: T.id,
      tgt: u.id,
      inAct: false,
      selfTitle: 'Savage Retaliation',
      retal: true
    });
}
/* ---- after a March: Bird of Prey (Quatl, Winglord), Bombing Run (Sciathan Riders) ---- */
function srCrossed(u, entry) {
  const a = [entry.from.x, entry.from.y],
    b = [entry.to.x, entry.to.y];
  return srEnemies(u).filter(e => {
    const C = corners(e);
    for (let k = 0; k <= 24; k++) {
      const f = k / 24;
      if (inside([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], C)) return true;
    }
    return false;
  });
}
function srAfterMarch(u, entry) {
  if (!entry || !entry.from || !entry.to) return;
  const R = RU(u),
    r = srRound();
  if (rh(R, 'Bird of Prey') && u.bopR !== r) {
    const E = srCrossed(u, entry).filter(e => uSize(e) === 1);
    if (E.length) {
      act.bop = true;
      srQueue({
        type: 'lethal',
        att: u.id,
        tgt: E[0].id,
        inAct: false,
        lethalHits: 5,
        lethalX: 0,
        lethalLost: 0,
        lethalLabel: 'Bird of Prey',
        flank: true,
        selfTitle: 'Bird of Prey',
        selfText: `${u.short || u.name} swoops over ${E[0].short || E[0].name}: 5 Hits against its flank. No Morale Tests.`,
        mark: { id: u.id, k: 'bopR' }
      });
    }
  }
  if (rh(R, 'Bombing Run') && u.bopR !== r) {
    const E = srCrossed(u, entry);
    if (E.length) {
      const n = 3 * live(u);
      srQueue({
        type: 'lethal',
        att: u.id,
        tgt: E[0].id,
        inAct: false,
        lethalHits: n,
        lethalX: 0,
        lethalLost: 0,
        lethalLabel: 'Bombing Run',
        flank: true,
        selfTitle: 'Bombing Run',
        selfText: `${u.short || u.name} bombs ${E[0].short || E[0].name}: ${n} Hits (3 per stand) against its flank. No Morale Tests. A friendly non-Monster regiment heals 4 wounds.`,
        mark: { id: u.id, k: 'bopR' },
        healFriend: 4
      });
    }
  }
}
/* ---- Fearsome: an enemy in contact must pass a D6 at or under its best Resolve to Combat Rally or Combat Reform ---- */
function srFearsome(u, type) {
  if (!['crally', 'creform'].includes(type)) return true;
  const R = RU(u);
  if (rh(R, 'Fearless') || rh(R, 'Bravery')) return true;
  const f = engaged(u).find(e => rh(RU(e), 'Fearsome'));
  if (!f) return true;
  const best = Math.max(+(u.stats && u.stats.R) || 0, +(u.charName && chStatsX(u).R) || 0),
    v = d6(),
    ok = (v <= best && v !== 6) || v === 1;
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
/* ---- chants: the regiment's own [Chant] bonus ---- */
const CHANTB = {
  'Blood to be Spilled': { r: ['Impact (+2)'] },
  'Proven Warriors': { l: 'Charge +2″ (Proven Warriors)' },
  Momentum: {
    f: u => {
      act.momentum = true;
    }
  },
  'Show the Path': {
    f: u => {
      state.units = state.units.map(x => {
        if (x.side !== u.side || x.id === u.id || !srNear(x, u, 8) || !frRoles(x).includes('The Tribes'))
          return x;
        const c = +(x.stats && x.stats.C) || 0;
        return c >= 4 ? x : grantU(x, 'Show the Path (+1 Clash)', [], { C: 1 });
      });
    }
  },
  'Cultists of Conquest': {
    f: u => {
      act.srFirstMarch = (act.srFirstMarch || 0) + 3;
    }
  },
  'Singing Bullets': { r: ['Longshot'] },
  'Cultists of Death': { r: ['Flawless Strikes'] },
  Penance: { r: ['Juggernaut', 'Ignores Hindering terrain'] },
  'Mounted Riders': {
    r: ['Aimed Shot'],
    f: u => {
      act.freeVolley = true;
    }
  },
  'Mounted Hunters': {
    f: u => {
      act.freeVolley = true;
    }
  },
  'Thundering Charge': {
    f: u => {
      act.thunder = true;
    }
  },
  'Cultists of War': { r: ['Terrifying (2)'] },
  'Predatory Shriek': { r: ['Terrifying (+1)'] },
  'Cultists of Famine': { r: ['Terrifying (1)'] },
  'Dominating Presence': { r: ['Unyielding'], l: 'Dominating Presence (its Seize count cannot be reduced)' },
  'Primal Cacophony': { l: 'Primal Cacophony (enemies within 12″ cannot Heal, Rally or Entourage-activate)' }
};
function srChantBonus(id) {
  const u = base(id);
  if (!u) return [];
  const notes = [];
  const names = new Set();
  (u.rules || []).concat(cR(u)).forEach(r => {
    const s = String(r);
    const m = s.match(/^Chant:\s*([^(]+?)\s*(\(|$)/);
    if (m) names.add(m[1].trim());
    const n = s.replace(/\s*\(.*$/, '').trim();
    if (CHANTB[n]) names.add(n);
  });
  let units = state.units;
  const keep = state;
  names.forEach(n => {
    const C = CHANTB[n];
    if (!C) {
      const raw = (u.rules || []).find(r => String(r).startsWith('Chant: ' + n));
      const m = raw && String(raw).match(/^Chant:\s*(.+)$/);
      if (m && /^[A-Z][A-Za-z ]+\s*\(\+?\d+\)$/.test(m[1].trim())) {
        units = units.map(x => (x.id === id ? grantU(x, 'Chant bonus: ' + n, [m[1].trim()]) : x));
        notes.push(m[1].trim());
      }
      return;
    }
    if (C.r || C.l)
      units = units.map(x =>
        x.id === id ? grantU(x, C.l || 'Chant bonus: ' + n + ' (' + C.r.join(', ') + ')', C.r || []) : x
      );
    if (C.f) {
      state = Object.assign({}, state, { units });
      C.f(u);
      units = state.units;
      state = keep;
    }
    notes.push(n);
  });
  return { units, notes };
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
/* ---- Reinforcement Lines (core rules), with Irregular and Pathfinders ---- */
function rlCompute(side, units, startV) {
  const ok = u => u.onTable && !u.destroyed && u.type !== 'marker' && !rh(u.rules || [], 'Irregular');
  const fr = units.filter(u => u.side === side && ok(u)),
    en = units.filter(u => u.side !== side && ok(u));
  const cs = side === 'cs';
  const rear = u => {
    const C = corners(u);
    return cs ? Math.max(...C.map(p => p[1])) : Math.min(...C.map(p => p[1]));
  };
  const L = fr.map(u => ({ u, v: rear(u) })).sort((a, b) => (cs ? a.v - b.v : b.v - a.v));
  let line = cs ? 48 : 0;
  for (const { u, v } of L) {
    const crossed =
      !rh(u.rules || [], 'Pathfinders') &&
      en.some(e => corners(e).some(p => (cs ? p[1] > v + 1e-6 : p[1] < v - 1e-6)));
    if (!crossed) {
      line = v;
      break;
    }
  }
  if (startV != null) line = cs ? Math.max(line, startV) : Math.min(line, startV);
  return +Math.max(0, Math.min(48, line)).toFixed(2);
}
/* ---- state sanity on every save: cannot-be-Broken, first-time triggers, Reinforcement Lines ---- */
/* casualties come off the back: keep the front edge where it was, then "Press the Attack" with any regiment the losses left stranded */
function contactKeep(old, st) {
  if (!old || !Array.isArray(old.units) || old === st) return;
  const O = new Map(old.units.map(u => [u.id, u])),
    onT = u => !!u && u.onTable && !u.destroyed && u.type !== 'marker';
  const same = (a, b) => a.x === b.x && a.y === b.y && (a.facing || 0) === (b.facing || 0);
  const posed = u => (act && act.id === u.id && act.pose ? Object.assign({}, u, act.pose) : u);
  const fwd = fc => {
    const a = ((fc || 0) * Math.PI) / 180;
    return [Math.sin(a), Math.cos(a)];
  };
  const shrunk = new Set();
  st.units = st.units.map(u => {
    const o = O.get(u.id);
    if (!onT(u) || !onT(o) || !same(u, o) || (u.files || 1) !== (o.files || 1)) return u;
    const n0 = live(o),
      n1 = live(u);
    if (n0 === n1) return u;
    if (n1 < n0) shrunk.add(u.id);
    /* surviving stands stay exactly where they stood: move the regiment's centre by their average displacement */
    const shift = (A, B) => {
      const ca = new Map(standsOf(A).map(x => [x.tok, x.poly])),
        cen = P => [P.reduce((a, p) => a + p[0], 0) / P.length, P.reduce((a, p) => a + p[1], 0) / P.length];
      let dx = 0,
        dy = 0,
        m = 0;
      const D = [];
      standsOf(B).forEach(x => {
        const P = ca.get(x.tok);
        if (!P) return;
        const a = cen(P),
          b = cen(x.poly);
        D.push([a[0] - b[0], a[1] - b[1]]);
      });
      if (!D.length) return [0, 0];
      /* keep as many stands as possible exactly where they were; the rest close up */
      let best = D[0],
        bn = -1;
      D.forEach(d => {
        const n = D.filter(e => Math.hypot(e[0] - d[0], e[1] - d[1]) < 0.05).length;
        if (n > bn || (n === bn && Math.hypot(...d) < Math.hypot(...best))) {
          bn = n;
          best = d;
        }
      });
      return best;
    };
    const [dx, dy] = shift(o, u);
    if (act && act.id === u.id && act.pose && act.pose.x != null) {
      const [px, py] = shift(Object.assign({}, o, act.pose), Object.assign({}, u, act.pose));
      act.pose.x += px;
      act.pose.y += py;
    }
    if (Math.abs(dx) + Math.abs(dy) < 1e-9) return u;
    return Object.assign({}, u, { x: u.x + dx, y: u.y + dy });
  });
  if (!shrunk.size) return;
  const P = st.units,
    byI = new Map(P.map(u => [u.id, u]));
  const near = (a, list) =>
    list.filter(e => onT(e) && e.side !== a.side && polyDist(corners(posed(a)), corners(posed(e))) <= 0.3);
  const prevEng = new Map();
  old.units.forEach(o => {
    if (onT(o))
      prevEng.set(
        o.id,
        near(o, old.units).map(e => e.id)
      );
  });
  for (let i = 0; i < P.length; i++) {
    const u = P[i],
      o = O.get(u.id);
    if (!onT(u) || !onT(o) || !same(u, o)) continue;
    const was = (prevEng.get(u.id) || []).map(id => byI.get(id)).filter(e => onT(e));
    if (!was.length || !was.some(e => shrunk.has(e.id))) continue;
    if (near(u, P).length) continue;
    for (const E of was.filter(e => shrunk.has(e.id))) {
      const U = posed(u),
        cp = closestPts(corners(U), corners(posed(E)));
      if (!cp || !(cp[0] > 0.3) || cp[0] > 8) continue;
      const s2 = (cp[0] - 0.1) / cp[0],
        dx = (cp[2][0] - cp[1][0]) * s2,
        dy = (cp[2][1] - cp[1][1]) * s2,
        moved = Object.assign({}, U, { x: U.x + dx, y: U.y + dy });
      if (P.some(x => x.id !== u.id && onT(x) && polyDist(corners(moved), corners(posed(x))) <= 0.01))
        continue;
      if (act && act.id === u.id && act.pose && act.pose.x != null) {
        act.pose.x += dx;
        act.pose.y += dy;
      }
      P[i] = Object.assign({}, u, { x: u.x + dx, y: u.y + dy });
      byI.set(u.id, P[i]);
      st.pressNote = (st.pressNote || []).concat([
        (u.short || u.name) +
          ' presses the attack on ' +
          (E.short || E.name) +
          ' (' +
          Math.round(cp[0] * 10) / 10 +
          '″)'
      ]);
      break;
    }
  }
  if (st.pressNote && st.pressNote.length) {
    const t = st.pressNote.join('; ');
    delete st.pressNote;
    setTimeout(() => toast('Press the Attack: ' + t + '.'), 60);
  }
}
/* Broken and Shattered (core rules): losing half or more (rounded up) of the stands it had at the start of the round, or since it last Rallied, Breaks a regiment at once;
   once Broken, losing half or more of the stands it had at that moment Shatters it. Characters count as stands. Both can happen in one action. */
let quietBreak = false;
function breakImmune(y) {
  return (
    rh(y.rules || [], 'Dauntless') ||
    noBreak(y) ||
    rh(y.rules || [], 'Life for Glory') ||
    (rh(y.rules || [], 'In the Fold') && srAllMods(y, /Origami/))
  );
}
function shatterImmune(y) {
  const t = (y.rules || [])
    .concat(
      (y.abilities || []).map(a => a[0] + ' ' + a[1]),
      fx(y)
    )
    .join(' | ');
  return (
    frFac(y) === 'Dweghom' ||
    /cannot be Shattered|Written in Bones/i.test(t) ||
    supHasK(y.side, 'For All Mankind')
  );
}
function breakCheck(old, st) {
  const O = new Map(((old && old.units) || []).map(u => [u.id, u])),
    rnd = st.round || 0,
    notes = [];
  st.units = st.units.map(u => {
    if (u.type === 'marker' || !u.onTable || u.destroyed) return u;
    let y = u;
    const n = live(y),
      o = O.get(y.id);
    const wasBroken = !!(o && (o.effects || []).includes('Broken')),
      isBroken = (y.effects || []).includes('Broken');
    if (y.rsRound !== rnd || y.rs == null) {
      const n0 = o && o.onTable && !o.destroyed ? live(o) : n;
      y = Object.assign({}, y, { rs: n0, rsRound: rnd, broke: isBroken ? n0 : null });
    }
    if (wasBroken && !isBroken) y = Object.assign({}, y, { rs: n, broke: null });
    if (isBroken && y.broke == null) y = Object.assign({}, y, { broke: o && wasBroken ? live(o) : n });
    const rs = +y.rs || n;
    const paper =
        (y.suiCmd || (y.mods || [])[0]) === 'Origami Warriors'
          ? removalSeq(y)
              .slice(0, lostOf(y))
              .filter(i => /Origami/.test((y.mods || [])[i] || '')).length
          : 0,
      nb = n + paper;
    if (!isBroken && rs > 1 && rs - nb >= Math.ceil(rs / 2) && !breakImmune(y)) {
      if (Array.isArray(y.mods) && y.mods.length && !y.enlUsed) {
        y = Object.assign({}, y, { enlUsed: true, rs: n, rsRound: rnd });
        notes.push((y.short || y.name) + ' is Enlightened: instead of breaking it Rallies (once per battle)');
      } else {
        const at = rs - Math.ceil(rs / 2);
        y = Object.assign({}, y, { effects: (y.effects || []).concat(['Broken']), broke: at });
        notes.push((y.short || y.name) + ' is Broken');
      }
    }
    if (
      (y.effects || []).includes('Broken') &&
      y.broke != null &&
      y.broke >= 1 &&
      y.broke - n >= Math.ceil(y.broke / 2) &&
      !shatterImmune(y)
    ) {
      y = Object.assign({}, y, {
        onTable: false,
        destroyed: true,
        status: 'Shattered',
        destroyedRound: rnd,
        dyingFight: false
      });
      notes.push((y.short || y.name) + ' is Shattered and flees the field');
    }
    return y;
  });
  if (notes.length && !quietBreak) {
    st.lastText = (st.lastText ? st.lastText + ' ' : '') + notes.join('. ') + '.';
    setTimeout(() => toast(notes.join(' · ') + '.'), 80);
  }
}
function sanitize(st) {
  if (!st || !Array.isArray(st.units) || (st.mode === 'test' && false)) return st;
  const keep = state;
  state = st;
  try {
    try {
      if (!st._undo) breakCheck(keep, st);
      delete st._undo;
    } catch (e) {
      console.error(e);
    }
    supParagon(st);
    st.units = st.units.map(u => {
      if (u.type === 'marker') return u;
      let y = u;
      if (
        (y.effects || []).includes('Broken') &&
        ((rh(y.rules, 'In the Fold') && srAllMods(y, /Origami/)) ||
          rh(y.rules, 'Life for Glory') ||
          hasGrant(y, 'Awakened') ||
          srHas(y, /^Cannot be Broken/))
      )
        y = Object.assign({}, y, { effects: y.effects.filter(e => e !== 'Broken') });
      if ((y.effects || []).includes('Broken') && !y.fawnUsed && INF_(y) && itemFlag(y, 'fawn'))
        y = Object.assign({}, y, { fawnUsed: true, effects: y.effects.filter(e => e !== 'Broken') });
      if (
        (rh(y.rules, 'Shattered Perfection') || rh(y.rules, 'Raging Elements')) &&
        !y.belowOnce &&
        belowStart(y)
      )
        y = Object.assign({}, y, { belowOnce: true });
      if (
        rh(y.rules, 'Prowl') &&
        y.onTable &&
        y.prowlLost !== (st.round || 1) &&
        st.units.some(
          e =>
            e.side !== y.side &&
            e.onTable &&
            !e.destroyed &&
            e.type !== 'marker' &&
            polyDist(corners(e), corners(y)) < 8 - 1e-6 &&
            !tLos(e, y)
        )
      )
        y = Object.assign({}, y, { prowlLost: st.round || 1 });
      if (y.onTable && !y.destroyed && itemFlag(y, 'awake') && !hasGrant(y, 'Awakened'))
        y = grantU(y, 'Awakened', awakenRules(y));
      if (rh(y.rules, 'Gorged') && !y.gorged) {
        if ((y.wounds || 0) > 0 && !y.wasHurt) y = Object.assign({}, y, { wasHurt: true });
        else if (y.wasHurt && (y.wounds || 0) === 0 && !y.destroyed)
          y = Object.assign({}, y, { gorged: true });
      }
      return y;
    });
    try {
      contactKeep(keep, st);
    } catch (e) {
      console.error(e);
    }
    if (
      st.rlStart &&
      st.mode !== 'test' &&
      ['activations', 'picks', 'choose', 'supdecl', 'supremacy'].includes(st.step || 'activations')
    )
      st.rl = {
        cs: rlCompute('cs', st.units, st.rlStart.cs),
        nord: rlCompute('nord', st.units, st.rlStart.nord)
      };
  } catch (e) {
  } finally {
    state = keep;
  }
  return st;
}
/* ---- extra regiment actions: extra Clash, free Volley, On Soaring Winds, Sweeping Step, Rooted Might ---- */
function encyOpt(u, re) {
  try {
    const e = frEncy(u);
    return !!(e && re.test(String(e.options || '')));
  } catch (x) {
    return false;
  }
}
function engVolley(u) {
  return encyOpt(u, /Volley engaged targets while engaged/i);
}
function srActions(u, out, used, eng, blocked) {
  if (!act || act.cur) return;
  const R = RU(u),
    bar = hasBarrage(u);
  /* Preservation Protocols (Spires): Combat and Out-of-Combat Action */
  if (u.charName && upgOf(u, /Preservation Protocols/) && frRoles(u).includes('Husk'))
    out.push({
      type: 'pres',
      why: (+u.wounds || 0) + (+u.charWounds || 0) ? blocked('pres') : 'No wounds to remove'
    });
  /* Implacable (Old Dominion): Break Their Lines, a Combat and Out-of-Combat Action */
  if (u.charName && upgOf(u, /Implacable/) && !act.extraFx.includes('Linebreaker (Break Their Lines)'))
    out.push({ type: 'btl', why: blocked('btl') });
  if (act.sweepDone) {
    out.length = 0;
    return;
  }
  if (
    eng.length &&
    (srHas(u, /^Raging Elements/) || offOn(u, 'xclash') || act.lath) &&
    used.some(a => a.type === 'clash') &&
    !act.actions.some(a => a.type === 'xclash')
  )
    out.push({ type: 'xclash', why: '', free: true });
  if (offOn(u, 'flame') && frontFoes(u).length) {
    out.push({
      type: 'flame',
      why: used.some(a => a.type === 'clash' || a.type === 'xclash')
        ? 'Not in the same activation as a Clash'
        : blocked('flame')
    });
    if (act.actions.some(a => a.type === 'flame'))
      out.forEach(o => {
        if (o.type === 'clash' || o.type === 'xclash')
          o.why = 'Not in the same activation as the Flamethrower';
      });
  }
  const fv =
    bar &&
    !act.actions.some(a => a.type === 'xvolley') &&
    (act.freeVolley ||
      (u.rider && upgOf(u, /Apex Master/)) ||
      encyOpt(u, /Free Volley/i) ||
      rh(R, 'Spined Descent') ||
      (rh(R, 'Eye of the Storm') && srAirNow(u.side)));
  if (fv)
    out.push({
      type: 'xvolley',
      why: eng.length && !rh(R, 'Eye of the Storm') && !engVolley(u) ? 'Not while engaged' : '',
      free: true
    });
  if (eng.length && bar && (rh(R, 'Eye of the Storm') || engVolley(u)) && !out.some(o => o.type === 'volley'))
    out.push({ type: 'volley', why: blocked('volley') });
  if (rh(R, 'On Soaring Winds')) out.push({ type: 'soar', why: blocked('march') });
  if (rh(R, 'Sweeping Step'))
    out.push({ type: 'sweep', why: used.length ? 'Only as the first action' : blocked('march') });
  if (rh(R, 'Rooted Might')) out.push({ type: 'rooted', why: blocked('rooted') });
  if (act.freeReform && !act.actions.some(a => a.type === 'xreform'))
    out.push({ type: 'xreform', why: eng.length ? 'Not while engaged' : '', free: true });
  if (assassinOk(u)) out.push({ type: 'assassin', why: blocked('clash') });
  if (!u.charName && canDuel(u) && duelTargets(u).length) {
    const arr = rh(u.rules || [], 'Arrogance');
    out.push({
      type: 'duel',
      why: act.actions.some(a => a.type === 'duel')
        ? 'Already used this activation'
        : arr
          ? ''
          : blocked('duel'),
      free: arr
    });
  }
  if (srHas(u, /^Primal Cacophony/))
    out.forEach(o => {
      if (o.type === 'rally' || o.type === 'crally') o.why = 'Primal Cacophony: cannot Rally';
    });
}
function srStartAction(type) {
  const u = byId(act.id);
  const st = { x: u.x, y: u.y, facing: u.facing || 0, files: geom(u).files };
  if (!srFearsome(u, type)) return true;
  if (type === 'assassin') return srAssassin(u);
  if (type === 'xreform') {
    act.cur = {
      type: 'reform',
      xreform: true,
      free: true,
      start: st,
      budget: 0,
      roll: null,
      moving: false,
      reshape: true
    };
    render();
    return true;
  }
  if (type === 'duel') {
    const T = duelTargets(u);
    act.cur = {
      type: 'duel',
      free: rh(u.rules || [], 'Arrogance'),
      start: st,
      budget: 0,
      moving: false,
      reshape: false
    };
    openCombat({
      type: 'duel',
      att: act.id,
      tgt: T.length === 1 ? T[0].id : null,
      choices: T.map(e => e.id),
      inAct: true,
      step: 'offer',
      selfTitle: 'Duel'
    });
    render();
    return true;
  }
  if (type === 'node') return offNode(u);
  if (type === 'flame') {
    act.cur = {
      type: 'volley',
      flame: true,
      stage: 'target',
      start: st,
      budget: 0,
      moving: false,
      reshape: false
    };
    render();
    toast('Flamethrower: click the enemy touching its front, then press Volley.');
    return true;
  }
  if (type === 'xclash') {
    act.cur = {
      type: 'clash',
      xclash: true,
      free: true,
      start: st,
      budget: 0,
      moving: false,
      reshape: false
    };
    clashOpen(u, true);
    render();
    return true;
  }
  if (type === 'xvolley') {
    act.cur = {
      type: 'volley',
      xvolley: true,
      free: true,
      stage: 'target',
      start: st,
      budget: 0,
      moving: false,
      reshape: false
    };
    render();
    toast('Free Volley: click the enemy regiment you are shooting at.');
    return true;
  }
  if (type === 'soar' || type === 'sweep') {
    act.cur = {
      type: 'march',
      soar: true,
      sweep: type === 'sweep',
      start: st,
      budget: (u.m || 0) * (type === 'sweep' ? 2 : 1),
      moving: true,
      reshape: false,
      segs: [],
      segStart: Object.assign({}, st),
      mode: 'fwd',
      pending: null
    };
    render();
    toast(
      type === 'sweep'
        ? 'Sweeping Step: two Marches through regiments; then a free Clash against one you passed through. The activation then ends.'
        : 'On Soaring Winds: March in any direction, ignoring regiments and terrain, even while engaged.'
    );
    return true;
  }
  return false;
}
/* Catabolic Node: "upon declaring a Clash Action you may choose for this Catabolic Node to Detonate".
   Pressing Clash asks first; a detonation is resolved in full before the Clash opens against whoever is still engaged. */
function nodeClashOffer(u) {
  return !!(u && offOn(u, 'node') && engaged(u).length && act && !act.nodeAsked);
}
function nodeThenClash(u) {
  act.nodeAsked = true;
  offNode(u);
  srQueue({ type: 'clashAfterNode', att: u.id });
}
/* opens the Clash that was declared before the detonation, once its Hits are resolved */
function clashAfterNode(o) {
  const A = byId(o.att);
  if (!act || act.id !== o.att || !act.cur || act.cur.type !== 'clash') return;
  if (!A || A.destroyed || !A.onTable || !live(A)) {
    act.cur = null;
    toast('The regiment was destroyed by its own Catabolic Node, so its Clash never happens.');
    render();
    return;
  }
  const eng = engaged(A);
  if (!eng.length) {
    toast(
      'No enemy is left in contact after the detonation: the Clash has no target and the action is spent.'
    );
    finishAction();
    return;
  }
  toast('Catabolic Node resolved. Now the Clash.');
  clashOpen(A, true);
  render();
}
/* "When this Regiment is destroyed ... you may choose for this Catabolic Node to Detonate": the regiment is gone, so the
   blast only hits the enemies that were engaged with it. Detonates automatically, as there is no cost left to weigh. */
function nodeOnDeath(T, foes) {
  const d = d6();
  const ids = foes.filter(id => {
    const e = byId(id);
    return e && e.onTable && !e.destroyed;
  });
  if (!ids.length) return;
  const chain = nodeChainPlan(T),
    gone = [T.id].concat(chain.map(x => x.id));
  putState({
    units: state.units.map(x => (gone.includes(x.id) ? Object.assign({}, x, { nodeGone: true }) : x)),
    lastTitle: N(T.side) + ' · Catabolic Node',
    lastText: `${T.short || T.name} is destroyed and its Catabolic Node detonates: rolled ${d}, every enemy that was engaged with it takes ${d + 4} Hits, no Morale.`
  }).catch(() => {});
  toast(
    `${T.short || T.name} is destroyed: its Catabolic Node detonates (rolled ${d}), ${d + 4} Hits on each enemy it was engaged with.`
  );
  ids.forEach(id => {
    const e = byId(id);
    srQueue({
      type: 'lethal',
      att: T.id,
      tgt: id,
      inAct: false,
      lethalHits: d + 4,
      lethalX: 0,
      lethalLost: 0,
      lethalLabel: 'Catabolic Node',
      selfTitle: 'Catabolic Node',
      selfText: `${T.short || T.name} is destroyed and its Catabolic Node detonates (rolled ${d}): ${e.short || e.name} takes ${d + 4} Hits. No Morale Tests.`
    });
  });
  nodeChainFire(chain);
}
/* Catabolic Node: Detonate */
function offNode(u) {
  const eng = engaged(u);
  if (!eng.length) return true;
  const d = d6(),
    chain = nodeChainPlan(u),
    gone = [u.id].concat(chain.map(x => x.id));
  act.actions.push({
    type: 'node',
    free: true,
    from: { x: u.x, y: u.y, facing: u.facing || 0, files: geom(u).files },
    to: { x: u.x, y: u.y, facing: u.facing || 0, files: geom(u).files },
    roll: d
  });
  putState({
    units: state.units.map(x => (gone.includes(x.id) ? Object.assign({}, x, { nodeGone: true }) : x)),
    lastTitle: N(u.side) + ' · Catabolic Node',
    lastText:
      (u.short || u.name) +
      ' detonates its Catabolic Node: rolled ' +
      d +
      '. Every engaged enemy takes ' +
      (d + 4) +
      ' Hits and the regiment ' +
      d +
      ' Hits, no Morale.'
  }).catch(() => {});
  eng.forEach(e =>
    srQueue({
      type: 'lethal',
      att: u.id,
      tgt: e.id,
      inAct: false,
      lethalHits: d + 4,
      lethalX: 0,
      lethalLost: 0,
      lethalLabel: 'Catabolic Node',
      selfTitle: 'Catabolic Node',
      selfText: `${u.short || u.name} detonates its Catabolic Node (rolled ${d}): ${e.short || e.name} takes ${d + 4} Hits. No Morale Tests.`
    })
  );
  srQueue({
    type: 'lethal',
    att: u.id,
    tgt: u.id,
    inAct: false,
    lethalHits: d,
    lethalX: 0,
    lethalLost: 0,
    lethalLabel: 'Catabolic Node',
    selfTitle: 'Catabolic Node',
    selfText: `The blast also hits ${u.short || u.name}: ${d} Hits. No Morale Tests.`
  });
  nodeChainFire(chain);
  render();
  return true;
}
/* Chain Reaction (Spires Eccentricity, Biomancer Warlord): a detonation may set off a second friendly Catabolic Node within
   18″, and that one a third within 18″ of it; the second adds 2 and the third 4 (taken here as extra Hits on each enemy
   it hits). The map detonates the nearest node that is engaged, so the chain always does something. */
function nodeChainPlan(src) {
  const wl = supWl(src.side);
  if (!wl || !wl.charName || !/Biomancer/.test(wl.charName) || !upgOf(wl, /Chain Reaction/)) return [];
  const out = [];
  let from = src;
  for (let step = 1; step <= 2; step++) {
    const seen = [src.id].concat(out.map(x => x.id));
    const nx = all()
      .filter(
        x =>
          x.side === src.side &&
          x.onTable &&
          !x.destroyed &&
          !seen.includes(x.id) &&
          offOn(x, 'node') &&
          !x.nodeGone &&
          engaged(x).length &&
          polyDist(corners(from), corners(x)) <= 18
      )
      .sort((a, b) => polyDist(corners(from), corners(a)) - polyDist(corners(from), corners(b)))[0];
    if (!nx) break;
    out.push(nx);
    from = nx;
  }
  return out;
}
function nodeChainFire(chain) {
  chain.forEach((nx, i) => {
    const d = d6(),
      plus = i === 0 ? 2 : 4;
    toast(`Chain Reaction: ${nx.short || nx.name}’s Catabolic Node detonates too (rolled ${d}, +${plus}).`);
    engaged(nx).forEach(e =>
      srQueue({
        type: 'lethal',
        att: nx.id,
        tgt: e.id,
        inAct: false,
        lethalHits: d + 4 + plus,
        lethalX: 0,
        lethalLost: 0,
        lethalLabel: 'Catabolic Node (Chain Reaction)',
        selfTitle: 'Chain Reaction',
        selfText: `${nx.short || nx.name}’s Catabolic Node detonates in the chain (rolled ${d}, +${plus}): ${e.short || e.name} takes ${d + 4 + plus} Hits. No Morale Tests.`
      })
    );
    srQueue({
      type: 'lethal',
      att: nx.id,
      tgt: nx.id,
      inAct: false,
      lethalHits: d,
      lethalX: 0,
      lethalLost: 0,
      lethalLabel: 'Catabolic Node (Chain Reaction)',
      selfTitle: 'Chain Reaction',
      selfText: `The blast also hits ${nx.short || nx.name}: ${d} Hits. No Morale Tests.`
    });
  });
}
function srFinishAction(u, c, entry) {
  if (c.flame) entry.type = 'flame';
  if (c.xclash) entry.type = 'xclash';
  if (c.xreform) entry.type = 'xreform';
  if (c.xvolley) entry.type = 'xvolley';
  if (c.soar && !c.sweep) entry.type = 'soar';
  if (c.sweep) {
    entry.type = 'sweep';
    act.sweepDone = true;
    const E = srCrossed(u, entry);
    if (E.length) {
      setTimeout(
        () =>
          openCombat({
            type: 'clash',
            att: act.id,
            tgt: E.length === 1 ? E[0].id : null,
            choices: E.map(e => e.id),
            inAct: false,
            forceContact: true,
            selfTitle: 'Sweeping Step'
          }),
        80
      );
    } else toast('Sweeping Step: it passed through no enemy, so there is no free Clash.');
  }
  if (c.type === 'rooted') {
    const ids = srFriends(u)
      .filter(x => srNear(x, u, 8) && frFac(x) === 'Weaver Courts')
      .map(x => x.id);
    putState({
      units: state.units.map(x =>
        ids.includes(x.id) ? Object.assign({}, x, { seeds: Math.min(3, (+x.seeds || 0) + 1) }) : x
      ),
      lastTitle: N(u.side) + ' · Rooted Might',
      lastText:
        ids.length + ' friendly regiment' + (ids.length === 1 ? '' : 's') + ' within 8″ gain a Seed Marker.'
    }).catch(() => {});
  }
  if (c.type === 'march' && !c.soar) srAfterMarch(base(act.id), entry);
}
/* ---- Sorcerer Kings forms, Tidecaller, Wild Hunters, Fires of the Descent: Draw Events chosen on activation ---- */
const SKFORMS = {
  'Wavebreaker Form': [
    ['Impact (+2)', ['Impact (+2)']],
    ['Brutal Impact (+1)', ['Brutal Impact (+1)']]
  ],
  'Waveborne Form': [
    ['Wizard (+2)', ['Wizard (+2)']],
    ['Barrage (+2)', ['Barrage (+2)']]
  ],
  'Stormqueen Form': [
    ['Impact (+6)', ['Impact (+6)']],
    ['+4 Attacks', [], { A: 4 }]
  ],
  'Arcane Tide Form': [
    ['a free Spellcasting Action', [], null, 'freeCast'],
    ['+4″ spell range', [], null, 'range4']
  ],
  Tidecaller: [
    ['Water Elementals within 8″ count as in Water', [], null, 'aura'],
    ['engaged enemies count as in Water', [], null, 'engaged']
  ]
};
function srOptions(u) {
  const out = [];
  if (!u || !act || act.id !== u.id) return out;
  const fresh = !act.actions.length && !act.cur,
    add = (label, fn, why, cls) => out.push({ label, fn, why, cls });
  /* ---- Initiative (City States Mastery): from the Strategic Stack, a free Charge before Draw Events ---- */
  if (
    fresh &&
    !act.entering &&
    upgOf(u, /Initiative/) &&
    !act.initUsed &&
    (act.source === 'strategic' || (act.source === 'entourage' && ordersU(u))) &&
    !(u.effects || []).includes('Broken') &&
    !engaged(u).length
  )
    add('Initiative: a free Charge now (it does not count towards its actions)', () => {
      act.initUsed = true;
      startAction('charge');
      if (act.cur && act.cur.type === 'charge') act.cur.free = true;
    });
  /* ---- Old Dominion character upgrades that spend Dark Power tokens ---- */
  if (u.charName && frFac(u) === 'Old Dominion') {
    const tok = +frG(u.side, 'od').dark || 0;
    if (fresh && !act.entering && upgOf(u, /Unholy Sacrament/) && !fxHas(u, /^Unholy Sacrament/))
      add(
        'Unholy Sacrament: spend 1 Dark Power token for Priest (+3) on the ' +
          u.charName +
          '’s first spell this round',
        async () => {
          await putState({
            fr: frPatch(u.side, 'od', { dark: tok - 1 }),
            units: state.units.map(x =>
              x.id === u.id ? grantU(x, 'Unholy Sacrament (Priest +3, first spell)', []) : x
            ),
            lastTitle: N(u.side) + ' · Unholy Sacrament',
            lastText:
              'The ' + u.charName + ' spends 1 Dark Power token: Priest (+3) for its first spell this round.'
          });
        },
        tok < 1 ? 'No Dark Power tokens' : ''
      );
    if (
      upgOf(u, /Soul Reaper/) &&
      engaged(u).length &&
      !(u.temp || []).some(g => /^Soul Reaper/.test(g.src))
    ) {
      out.push({
        head:
          'Soul Reaper: spend Dark Power tokens for +1 Attack each on the ' +
          u.charName +
          ' (until the end of the round)'
      });
      [1, 2, 3]
        .filter(n => n <= tok)
        .forEach(n =>
          add(
            'Soul Reaper: +' +
              n +
              ' Attack' +
              (n > 1 ? 's' : '') +
              ' (' +
              n +
              ' token' +
              (n > 1 ? 's' : '') +
              ')',
            async () => {
              await putState({
                fr: frPatch(u.side, 'od', { dark: tok - n }),
                units: state.units.map(x =>
                  x.id === u.id ? grantU(x, 'Soul Reaper (+' + n + ' Attacks)', []) : x
                ),
                lastTitle: N(u.side) + ' · Soul Reaper',
                lastText:
                  'The ' +
                  u.charName +
                  ' spends ' +
                  n +
                  ' Dark Power token' +
                  (n > 1 ? 's' : '') +
                  ' for +' +
                  n +
                  ' Attacks this round.'
              });
            }
          )
        );
    }
  }
  /* ---- Hundred Kingdoms character upgrades ---- */
  if (u.charName) {
    if (
      fresh &&
      !act.entering &&
      upgOf(u, /Elysian Fragment/) &&
      !base(u.id).elysianUsed &&
      frRoles(u).includes('Theist')
    )
      add(
        'Elysian Fragment (once per game): the regiment gains Cleave (3) until the end of the round',
        async () => {
          await putState({
            units: state.units.map(x =>
              x.id === u.id
                ? Object.assign(grantU(x, 'Elysian Fragment (Cleave 3)', ['Cleave (3)']), {
                    elysianUsed: true
                  })
                : x
            ),
            lastTitle: N(u.side) + ' · Elysian Fragment',
            lastText: (u.short || u.name) + ' gains Cleave (3) until the end of the round.'
          });
        }
      );
    if (upgOf(u, /Lathander Sacrifice/) && !base(u.id).lathUsed && !act.lath && engaged(u).length)
      add(
        'Lathander Sacrifice (once per game): one extra Clash this activation; the regiment is destroyed when the activation ends',
        async () => {
          act.lath = true;
          await putState({
            units: state.units.map(x => (x.id === u.id ? Object.assign({}, x, { lathUsed: true }) : x)),
            lastTitle: N(u.side) + ' · Lathander Sacrifice',
            lastText:
              (u.short || u.name) + ' may Clash once more this activation, and is destroyed when it ends.'
          });
        }
      );
  }
  /* ---- character upgrades with Draw Events ---- */
  if (fresh && !act.entering && u.charName) {
    /* Inscription of Lighter Alloys (City States): Mobility */
    const LA = 'Mobility (Inscription of Lighter Alloys)';
    if (upgOf(u, /Lighter Alloys/) && /Infantry/.test(u.cls || '') && !hasGrant(base(u.id), LA))
      add(
        'Mobility (Inscription of Lighter Alloys): +3 March, −1 Defense, loses Phalanx and Shield until the end of the round',
        async () => {
          const x0 = base(u.id),
            dD = (+x0.stats.D || 0) > 1 ? -1 : 0;
          await putState({
            units: state.units.map(x =>
              x.id === u.id
                ? grantLoseU(x, LA, [], Object.assign({ M: 3 }, dD ? { D: dD } : {}), [
                    /^Phalanx\b/,
                    /^Shield\b/
                  ])
                : x
            ),
            lastTitle: N(u.side) + ' · ' + (u.short || u.name),
            lastText:
              'Mobility: +3 March and −1 Defense, without Phalanx and Shield until the end of the round.'
          });
        }
      );
    /* Aristia (City States banner): a friendly non-Monster regiment within 8″ Charges at March +5″ this round */
    if (upgOf(u, /Aristia/) && !act.aristia) {
      const T = all().filter(
        t =>
          t.side === u.side &&
          t.onTable &&
          !t.destroyed &&
          t.type !== 'monster' &&
          t.type !== 'marker' &&
          polyDist(corners(u), corners(t)) <= 8
      );
      if (T.length) {
        out.push({
          head: 'Aristia: a friendly non-Monster regiment within 8″ Charges at its March +5″ until the end of the round (ignores Phalanx)'
        });
        T.forEach(t =>
          add('Aristia on ' + (t.short || t.name) + (t.id === u.id ? ' (this regiment)' : ''), async () => {
            act.aristia = true;
            await grant(
              t.id,
              'Aristia (Charge distance = March +5″)',
              [],
              null,
              'Aristia: ' + (t.short || t.name) + ' Charges at March +5″ this round.'
            );
          })
        );
      }
    }
    /* Bloody Sacrifice (Beads of Death, Occultists Charm): 2 wounds, +1 March until the end of the first action */
    if ((upgOf(u, /Beads of Death/) || upgOf(u, /Occultists Charm/)) && !act.bloody)
      add(
        'Bloody Sacrifice: the regiment suffers 2 wounds (no Morale Test) for +1 March until the end of its first action',
        async () => {
          act.bloody = true;
          const units = state.units.map(x => {
            if (x.id !== u.id) return x;
            const AL = allocate(x, 2);
            return Object.assign(
              {},
              x,
              { wounds: AL.w, auxWounds: AL.aw },
              AL.dead
                ? { onTable: false, destroyed: true, status: 'Destroyed', destroyedRound: state.round }
                : {}
            );
          });
          await putState({
            units,
            lastTitle: N(u.side) + ' · Bloody Sacrifice',
            lastText:
              (u.short || u.name) +
              ' suffers 2 wounds (no Morale Test) and adds +1 March until the end of its first action.'
          });
        }
      );
  }
  Object.entries(SKFORMS).forEach(([rule, ch]) => {
    if (!rh(u.rules, rule)) return;
    out.push({ head: rule + ' (choose one on activation)' });
    ch.forEach(([lab, rules, stats, flag]) =>
      add(
        lab,
        async () => {
          act.srForm = rule;
          if (flag === 'freeCast') act.freeCast = true;
          if (flag === 'range4') act.spellRange4 = true;
          const src =
            rule === 'Tidecaller'
              ? flag === 'aura'
                ? 'Tidecaller: Water Elementals within 8″ count as in Water'
                : 'Tidecaller: engaged enemies count as in Water'
              : rule + ': ' + lab;
          await grant(u.id, src, rules || [], stats || null, rule + ': ' + lab);
        },
        act.srForm === rule ? 'Already chosen' : !fresh ? 'Only before the first action' : ''
      )
    );
  });
  if (rh(u.rules, 'Wild Hunters') && !act.entering && act.frBloom && !act.srWild) {
    out.push({ head: 'Wild Hunters (with the Bloom)' });
    [['Deadly Blades'], ['Cleave (+1)'], ['Flurry']].forEach(([r]) =>
      add(r, async () => {
        act.srWild = true;
        await grant(
          u.id,
          'Wild Hunters: ' + r,
          [r],
          null,
          'Wild Hunters: ' + r + ' until the end of the round'
        );
      })
    );
  }
  if (rh(u.rules, 'Fires of the Descent') && !act.entering && hasGrant(u, 'Awakened') && !act.srFires) {
    const C = srFriends(u).filter(x => srNear(x, u, 8));
    if (C.length) {
      out.push({
        head: 'Fires of the Descent (Draw Event): a friendly regiment within 8″ gains Relentless Blows'
      });
      C.slice(0, 6).forEach(x =>
        add(
          x.short || x.name,
          async () => {
            act.srFires = true;
            await grant(
              x.id,
              'Fires of the Descent (Relentless Blows)',
              ['Relentless Blows'],
              null,
              'Fires of the Descent: ' + (x.short || x.name) + ' gains Relentless Blows this round'
            );
          },
          !fresh ? 'Only before the first action' : ''
        )
      );
    }
  }
  return out;
}
/* ---- City States: Combat Directives (Eidolon) after each Supremacy Phase ---- */
const CDIR = {
  'Greetings to a Fellow General': ['Greetings to a Fellow General (+5 Attacks, −1 Evasion)', []],
  'Secure the Breach': ['Secure the Breach (Parry)', ['Parry']],
  'Precision Armament': ['Precision Armament (character Cleave +3)', []],
  /* Alternate Programming (Eidolon Modification) replaces the first two */
  'Heavy Exoskeleton': ['Heavy Exoskeleton (Brute: Brutal Impact +1)', ['Brutal Impact (+1)'], true],
  Relentless: ['Relentless (Brute: Oblivious)', ['Oblivious'], true]
};
/* the Directives this Eidolon may choose */
function cdirKeys(u) {
  return u && upgOf(u, /Alternate Programming/)
    ? ['Heavy Exoskeleton', 'Relentless', 'Precision Armament']
    : ['Greetings to a Fellow General', 'Secure the Breach', 'Precision Armament'];
}
function cdirOf(u) {
  return Object.keys(CDIR).find(k => hasGrant(u, CDIR[k][0]));
}
function cdirSet(id, k) {
  const D = CDIR[k];
  /* the Brute-only Directives give nothing to a regiment that is not a Brute */
  const rules = D[2] && !/Brute/.test((base(id) || {}).cls || '') ? [] : D[1];
  return putState({
    units: state.units.map(x => (x.id === id ? grantU(x, D[0], rules) : x)),
    lastTitle: N(base(id).side) + ' · Combat Directive',
    lastText: 'The Eidolon chooses ' + k + ' until the end of the round.'
  });
}
/* ---- Old Dominion token sources: Acolytes, Divine Shard, Font of Dark Power ---- */
function odFontU(u) {
  return (state.units || []).some(
    x =>
      x.side === u.side &&
      srAlive(x) &&
      /Fallen Divinity/.test((x.charName || '') + ' ' + x.name) &&
      (x.id === u.id || srNear(x, u, 12))
  );
}
function odPendingBox(side, box, g, mine) {
  const R = srRound();
  const seenU = Object.assign({}, g.seenU || {});
  let init = false;
  if (!g.seenU && (+g.seen || 0) > 0) {
    (state.units || [])
      .filter(u => u.side === side && u.type !== 'marker' && animate(u))
      .forEach(u => {
        seenU[u.id] = u.destroyed ? u.stands || 0 : Math.max(0, (u.stands || 0) - live(u));
      });
    init = true;
  }
  if (init) {
    frSet(side, 'od', { seenU });
    return;
  }
  (state.units || [])
    .filter(u => u.side === side && u.type !== 'marker' && animate(u))
    .forEach(u => {
      const lost = u.destroyed ? u.stands || 0 : Math.max(0, (u.stands || 0) - live(u)),
        p = lost - (+seenU[u.id] || 0);
      if (p <= 0) return;
      const font = odFontU(u),
        shard = rh(u.rules, 'Divine Shard'),
        nm = u.short || u.name;
      const give = (pool, n) =>
        frSet(side, 'od', {
          [pool]: (+frG(side, 'od')[pool] || 0) + n,
          seenU: Object.assign({}, frG(side, 'od').seenU || {}, {
            [u.id]: (+(frG(side, 'od').seenU || {})[u.id] || 0) + 1
          })
        });
      const row = frRow(
        nm +
          ': ' +
          p +
          ' stand' +
          (p > 1 ? 's' : '') +
          ' lost, 1 token each' +
          (font ? ' (Font of Dark Power: Fallen Pantheon only)' : '') +
          (shard ? ' (Divine Shard: +1 if Fallen Pantheon)' : '') +
          ':',
        font ? null : abBtn('+1 Dark Power', () => give('dark', 1), 'ab-tog'),
        abBtn('+' + (shard ? 2 : 1) + ' Fallen Pantheon', () => give('pant', shard ? 2 : 1), 'ab-tog')
      );
      box.append(row);
    });
  const aco = +g.aco || 0;
  if (aco > 0)
    box.append(
      frRow(
        'Acolytes: ' + aco + ' Power token' + (aco > 1 ? 's' : '') + ' to allocate:',
        abBtn('+1 Dark Power', () => frSet(side, 'od', { dark: (+g.dark || 0) + 1, aco: aco - 1 }), 'ab-tog'),
        abBtn(
          '+1 Fallen Pantheon',
          () => frSet(side, 'od', { pant: (+g.pant || 0) + 1, aco: aco - 1 }),
          'ab-tog'
        )
      )
    );
}
/* ---- spells: Herald of the Forge God, Arcane Tide Form, Elemental Tether, Aqueous Branding, Divine Purpose, Prowl ---- */
function nullMage(u) {
  if (!u) return;
  const cp = corners(u);
  const nm = (state.units || []).find(
    x => x.side !== u.side && srAlive(x) && offOn(x, 'nullMage') && polyDist(corners(x), cp) <= 10 + 1e-6
  );
  if (!nm) return;
  const b = base(u.id);
  if (!b) return;
  const AL = allocate(b, 2);
  setTimeout(
    () =>
      putState({
        units: state.units.map(x =>
          x.id === b.id
            ? Object.assign(
                {},
                x,
                { wounds: AL.w, auxWounds: AL.aw },
                AL.dead
                  ? { onTable: false, destroyed: true, status: 'Destroyed', destroyedRound: state.round }
                  : {}
              )
            : x
        ),
        lastTitle: N(nm.side) + ' · Null Mage',
        lastText:
          (nm.short || nm.name) +
          '’s Null Mage: the failed spell costs ' +
          (b.short || b.name) +
          ' 2 wounds. No Morale Tests.'
      })
        .then(() => toast('Null Mage: ' + (b.short || b.name) + ' takes 2 wounds.'))
        .catch(() => {}),
    300
  );
}
function srNeed(u, asChar, n) {
  return !asChar && rh(u.rules || [], 'Herald of the Forge God') ? Math.max(n, 4) : n;
}
function srSpellDice(u, asChar) {
  /* Unholy Sacrament (Old Dominion): Priest (+3) for the character's first Spellcasting Action this round */
  if (asChar && fxHas(u, /^Unholy Sacrament/) && (base(u.id) || {}).sacrR !== srRnd()) return 3;
  if (asChar || !rh(u.rules || [], 'Herald of the Forge God') || !act || act.id !== u.id) return 0;
  return act.actions.reduce((a, x) => a + ((x.combat && x.combat.hits) || 0), 0);
}
function srRangeAdd(u) {
  return act && act.id === u.id && act.spellRange4 ? 4 : 0;
}
function srBrand(u, sp, T) {
  return T &&
    T.side !== u.side &&
    hasGrant(T, 'Aqueous Branding') &&
    (SK_COURTS.Water || []).includes(sp.name)
    ? 1
    : 0;
}
function srTether(u, sp, C) {
  if (!(SK_COURTS.Air || []).includes(sp.name) || sp.targets === 'enemy') return [];
  const T = (state.units || []).filter(
    x => x.side === u.side && srAlive(x) && rh(x.rules, 'Elemental Tether')
  );
  if (!T.length) return [];
  return (state.units || []).filter(
    x =>
      x.side === u.side &&
      srAlive(x) &&
      !C.some(c => c.id === x.id) &&
      T.some(t => t.id === x.id || srNear(t, x, 8))
  );
}
async function srAfterSpell(cid, sp, tid, asChar) {
  const u = base(cid),
    T = base(tid);
  if (!u) return;
  let units = state.units,
    ch = false;
  if (
    asChar &&
    /Theist Priest/.test(u.charName || '') &&
    T &&
    T.side === u.side &&
    rh(RU(T), 'Divine Purpose')
  ) {
    units = units.map(x =>
      x.id === T.id ? grantU(x, 'Divine Purpose (+2″ to the first March or the Charge)', []) : x
    );
    ch = true;
  }
  if (rh(u.rules || [], 'Aqueous Branding') && T && T.side !== u.side) {
    units = units.map(x => (x.id === T.id ? grantU(x, 'Aqueous Branding', []) : x));
    ch = true;
  }
  if (rh(u.rules || [], 'Prowl')) {
    units = units.map(x => (x.id === u.id ? Object.assign({}, x, { prowlLost: srRound() }) : x));
    ch = true;
  }
  if (ch) await putState({ units });
}
function srRangeBonus(u) {
  if (!act || act.id !== u.id || !act.momentum) return 0;
  const a = act.actions.filter(x => !x.free)[0];
  if (!a || a.type !== 'march' || !(a.segs || []).every(s => s.mode === 'fwd')) return 0;
  return Math.min(4, Math.floor(a.dist || 0));
}
async function srAfterBloom(u, n) {
  if (n < 3) return;
  const r = srRound();
  const S = srFriends(u)
    .concat([base(u.id)])
    .filter(
      x =>
        x &&
        rh(x.rules, 'Echoes of Whispers') &&
        x.echoR !== r &&
        srNear(x, u, 8) &&
        (x.wounds || 0) > 0 &&
        canHeal(x)
    )[0];
  if (S)
    await putState({
      units: state.units.map(x =>
        x.id === S.id ? Object.assign({}, x, { wounds: Math.max(0, (x.wounds || 0) - 3), echoR: r }) : x
      ),
      lastTitle: N(u.side) + ' · Echoes of Whispers',
      lastText: (S.short || S.name) + ' heals 3 wounds.'
    });
}
async function srAfterStrain(u) {
  const B = srFriends(u).filter(
    x =>
      rh(x.rules, 'Indiscriminate Omnivore') &&
      !x.gorged &&
      srNear(x, u, 12) &&
      (x.wounds || 0) > 0 &&
      canHeal(x)
  )[0];
  if (B)
    await putState({
      units: state.units.map(x =>
        x.id === B.id ? Object.assign({}, x, { wounds: Math.max(0, (x.wounds || 0) - 2) }) : x
      ),
      lastTitle: N(u.side) + ' · Indiscriminate Omnivore',
      lastText: (B.short || B.name) + ' heals 2 wounds.'
    });
}
function srDrum(u) {
  return (state.units || []).some(
    x => x.side === u.side && srAlive(x) && rh(x.rules, 'Drum Beat') && (x.id === u.id || srNear(x, u, 10))
  );
}
async function awaken(id, why) {
  await awaken0(id, why);
  const u = base(id);
  try {
    await supOnAwaken(u);
  } catch (e) {}
  if (u && rh(u.rules, 'Testaments to Honor')) {
    for (const x of srFriends(u).filter(
      x => x.type !== 'monster' && frRoles(x).includes('Clan') && srNear(x, u, 6) && !hasGrant(x, 'Awakened')
    ))
      await awaken0(x.id, 'Testaments to Honor');
  }
}
