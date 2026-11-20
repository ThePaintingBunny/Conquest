/*
 * Scoring
 *
 * Who controls each zone and the Victory Points scored each round.
 *
 * In this file: seizeVal(), inZone(), srSeizeStands(), zoneControl(), scoreRound()
 */

function seizeVal(u) {
  if ((u.effects || []).includes('Broken')) return 0;
  if ((u.abilities || []).some(a => /Brazen Race/.test(a[0]))) return 6;
  if (frBase(u) === 'Tontorr') return 6;
  if (u.type === 'monster') return 3;
  if (/Light/.test(u.cls || '')) return 0;
  return 1;
}

function inZone(poly, z) {
  return (
    inside([z.x, z.y], poly) ||
    poly.some((p, i) => segDist([z.x, z.y], p, poly[(i + 1) % poly.length]) < z.r - 1e-6)
  );
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

function zoneControl() {
  const R = state.round || 1;
  return zonesOf().map(z => {
    const tot = { cs: 0, nord: 0 },
      sz = { cs: 0, nord: 0 };
    const contested = { cs: false, nord: false };
    all()
      .filter(u => u.onTable && !u.destroyed)
      .forEach(u => {
        if (isMarker(u)) {
          if (u.side !== 'neutral' && Math.hypot(u.x - z.x, u.y - z.y) <= z.r + 1.4)
            contested[u.side === 'cs' ? 'nord' : 'cs'] = true;
          return;
        }
        const k = standsOf(u).filter(s => inZone(s.poly, z)).length;
        if (!k) return;
        tot[u.side] += k;
        sz[u.side] += srSeizeStands(u, z, k);
        if (rh(RU(u), 'Unyielding') && !(u.effects || []).includes('Broken'))
          contested[u.side === 'cs' ? 'nord' : 'cs'] = true;
      });
    /* Standard of Last Oration: a regiment carrying it destroyed this round within range of the zone */
    const oration = all().find(
      u =>
        u.destroyed &&
        u.destroyedRound === R &&
        upgOf(u, /Last Oration/) &&
        z.friendly !== u.side &&
        inZone(corners(u), z)
    );
    const holder = oration
      ? oration.side
      : ['cs', 'nord'].find(s => {
          const o = s === 'cs' ? 'nord' : 'cs';
          return z.friendly !== s && !contested[s] && tot[s] > tot[o] && sz[s] > sz[o];
        }) || null;
    return Object.assign({}, z, { tot, sz, holder, vp: z.vp != null ? +z.vp : z.size === 9 ? 3 : 2 });
  });
}

function scoreRound(R) {
  const sc = scenOf(),
    id = scenId(),
    zc = zoneControl(),
    from = sc.from || 2,
    add = { cs: 0, nord: 0 },
    lines = { cs: [], nord: [] };
  const P = (s, v, t) => {
    if (!v) return;
    add[s] += v;
    lines[s].push(t + ' ' + v);
  };
  const opp = s => (s === 'cs' ? 'nord' : 'cs'),
    held = s => (R >= from ? zc.filter(z => z.holder === s) : []);
  const dead = (state.units || []).filter(u => u.destroyed && u.destroyedRound === R);
  const regs = s => dead.filter(u => !isMarker(u) && u.side === opp(s)),
    chars = s => regs(s).filter(u => u.charName),
    wl = s => regs(s).some(u => u.charName && u.warlord);
  const mk = s => dead.filter(u => isMarker(u) && u.destroyedBy === s),
    enemyMk = s => mk(s).filter(u => u.side === opp(s));
  const picks = state.picks || {};
  ['cs', 'nord'].forEach(s => {
    const H = held(s),
      hn = H.map(z => z.name);
    /* a scenario from the Scenario builder: everything comes from its settings */
    if (sc.custom) {
      const X = sc.extra || {};
      H.forEach(z => {
        if (Array.isArray(z.rounds) && z.rounds.length && !z.rounds.includes(R)) return;
        let v = +z.vp || 0;
        if (+z.bonusVp && (z.bonusRounds || []).includes(R)) v += +z.bonusVp;
        P(s, v, z.name);
      });
      mk(s)
        .filter(u => u.side !== s)
        .forEach(u => P(s, u.mvp != null ? +u.mvp : 3, u.short || 'marker'));
      if (+X.zonesN && +X.zonesVp && H.length >= +X.zonesN) P(s, +X.zonesVp, X.zonesN + ' or more zones');
      if (+X.more && H.length > held(opp(s)).length) P(s, +X.more, 'more zones than the enemy');
      P(s, (+X.regs || 0) * regs(s).length, 'enemy regiments');
      P(s, (+X.chars || 0) * chars(s).length, 'enemy characters');
      if (wl(s)) P(s, +X.warlord || 0, 'enemy Warlord slain');
    }
    if (id === 1) {
      P(s, 3 * enemyMk(s).length, 'enemy markers');
      P(s, 2 * H.length, 'zones');
      if (H.length >= 3) P(s, 2, 'three or more zones');
      if (H.length > held(opp(s)).length) P(s, 1, 'more zones than the enemy');
      if (wl(s)) P(s, 2, 'enemy Warlord slain');
    }
    if (id === 2) {
      const denied = [picks.cs, picks.nord].filter(Boolean);
      const L = H.filter(z => !denied.includes(z.name));
      P(s, 2 * L.length, 'zones');
      if (L.length >= 3) P(s, 2, 'three or more zones');
      if (H.length === zc.length) P(s, 1, 'all zones');
    }
    if (id === 3) {
      P(s, 3 * enemyMk(s).length, 'enemy markers');
      P(s, 2 * H.length, 'zones');
      if (H.length >= 2) P(s, 1, 'two or more zones');
      if (wl(s)) P(s, 2, 'enemy Warlord slain');
      if (R <= 4 || R >= 9) P(s, H.filter(z => z.name !== 'Centre').length, 'side zones');
      else if (hn.includes('Centre')) P(s, 2, 'centre zone');
    }
    if (id === 4) {
      const m = mk(s).filter(u => u.side !== s).length;
      P(s, 3 * m, 'markers destroyed');
      if (m >= 2) P(s, 2, 'two or more markers this round');
      P(s, 2 * H.length, 'zones');
      if (H.length >= 2) P(s, 2, 'both zones');
    }
    if (id === 5) {
      P(s, 3 * enemyMk(s).length, 'enemy markers');
      P(s, 2 * H.length, 'zones');
      if (H.length >= 3) P(s, 3, 'three or more zones');
      P(s, 2 * chars(s).length, 'enemy characters');
    }
    if (id === 6) {
      P(s, 4 * enemyMk(s).length, 'enemy markers');
      P(s, 2 * H.length, 'zones');
      if (H.length >= 2) P(s, 1, 'both zones');
      if (wl(s)) P(s, 2, 'enemy Warlord slain');
    }
    if (id === 7) {
      H.forEach(z => P(s, z.size === 9 ? 3 : 2, z.name));
      if (H.length >= 2) P(s, 2, 'two or more zones');
      P(s, 2 * regs(s).length, 'enemy regiments');
      P(s, 2 * chars(s).length, 'enemy characters');
      if (wl(s)) P(s, 2, 'enemy Warlord slain');
    }
    if (id === 8) {
      P(s, 3 * enemyMk(s).length, 'enemy markers');
      if (mk(s).some(u => u.side === 'neutral')) P(s, 3, 'centre marker');
      P(s, 2 * H.length, 'zones');
      if (H.length >= 2) P(s, 1, 'both zones');
      if (wl(s)) P(s, 2, 'enemy Warlord slain');
      if ([3, 5, 7, 9].includes(R) && hn.includes('Left')) P(s, 2, 'Left zone bonus');
      if ([2, 4, 6, 8].includes(R) && hn.includes('Right')) P(s, 2, 'Right zone bonus');
    }
    if (id === 9) {
      const pc = picks.cs,
        pn = picks.nord,
        same = pc && pc === pn;
      H.forEach(z => {
        if (same && z.name === pc) P(s, 4, z.name + ' (picked by both, double)');
        else if (z.name !== pc && z.name !== pn) P(s, 2, z.name);
      });
      if (H.filter(z => z.name !== 'Centre').length >= 2) P(s, 2, 'two zones besides the centre');
      if (hn.includes('Centre')) P(s, 1, 'centre zone');
    }
    if (id === 10) {
      if (H.some(z => z.size === 9)) P(s, 3, 'the 9″ zone');
      if (hn.includes(s === 'cs' ? 'B' : 'A')) P(s, 4, 'the enemy’s zone');
      P(s, 2 * regs(s).length, 'enemy regiments');
      P(s, 2 * chars(s).length, 'enemy characters');
      if (wl(s)) P(s, 2, 'enemy Warlord slain');
    }
    if (id === 11) {
      const early = R <= 4 || R >= 9;
      H.forEach(z => P(s, z.size === 6 ? (early ? 2 : 1) : early ? 1 : 2, z.name));
    }
    if (id === 12) {
      P(s, H.length, 'zones');
      if (H.length >= 2) P(s, 2, 'two or more zones');
      if (picks[s] && hn.includes(picks[s])) P(s, 3, 'picked zone ' + picks[s]);
    }
  });
  return { add, lines };
}
