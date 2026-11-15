/*
 * Movement special rules
 *
 * Rules that change a March: Vanguard, March bonuses, first-March effects, and what happens after a
 * March (Bird of Prey, Bombing Run).
 *
 * In this file: vgOf(), srMarchMod(), relentlessMarch(), firstInFray(), srFirstMarch(), srFirstAct(),
 *   seizeAdv(), srCrossed(), srAfterMarch()
 */

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

/* Relentless March (Dweghom Mastery): friendly Infantry get +1 March on their second March of an activation */
function relentlessMarch(u) {
  return (
    /Infantry/.test(u.cls || '') &&
    all().some(x => x.side === u.side && !x.destroyed && x.charName && upgOf(x, /Relentless March/))
  );
}

/* First in the Fray (Dweghom Mastery, Ardent): the foremost friendly regiment, if Infantry, has Terrifying (+1), to at
   most Terrifying (2). Foremost: the regiment whose front edge is furthest towards the enemy edge; if that is not
   Infantry, nobody gets it. */
function firstInFray(u) {
  if (!u || !u.onTable || u.destroyed || !/Infantry/.test(u.cls || '')) return false;
  if (!all().some(x => x.side === u.side && !x.destroyed && x.charName && upgOf(x, /First in the Fray/)))
    return false;
  /* only for an army following the Ardent Creed */
  if (!/Ardent/.test(dwCreed(u.side) || '')) return false;
  /* foremost: the regiment whose front edge reaches furthest towards the enemy's table edge */
  const rear = x => {
    const ys = corners(x).map(p => p[1]);
    return x.side === 'nord' ? Math.max(...ys) : -Math.min(...ys);
  };
  const L = all().filter(x => x.side === u.side && x.onTable && !x.destroyed && x.type !== 'marker');
  const best = L.reduce((m, x) => (!m || rear(x) > rear(m) ? x : m), null);
  return !!best && best.id === u.id;
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

/* the first action of this activation still to come (Bloody Sacrifice: +1 March until the end of the first action) */
function srFirstAct(u) {
  return !!(act && act.id === u.id && !act.actions.some(a => !a.free));
}

function seizeAdv(u) {
  return all().some(x => x.side === u.side && x.onTable && !x.destroyed && upgOf(x, /Seize the Advantage/));
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
