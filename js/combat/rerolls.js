/*
 * Re-rolls
 *
 * Which dice may be re-rolled and why.
 *
 * In this file: rrPlan(), rrDie(), blessOk(), noChargeReroll(), hitSources(), moraleSources()
 */

/* ---------- re-roll stacking (core rules + Para Bellum FAQ) ----------
   A die is re-rolled at most once. Opposing full re-rolls ("re-roll all fails" vs "re-roll all successes") cancel.
   Opposing partial re-rolls (e.g. re-roll 6s vs re-roll 1s) cancel. A full re-roll beats an opposing partial one. */
function rrPlan(src) {
  const fF = src.filter(x => x.k === 'fail' && !x.face),
    fP = src.filter(x => x.k === 'fail' && x.face),
    sF = src.filter(x => x.k === 'succ' && !x.face),
    sP = src.filter(x => x.k === 'succ' && x.face);
  const notes = [];
  let failAll = !!fF.length,
    succAll = !!sF.length,
    failF = fP.map(x => x.face),
    succF = sP.map(x => x.face);
  if (failAll && succAll) {
    notes.push(fF.map(x => x.src).join('/') + ' and ' + sF.map(x => x.src).join('/') + ' cancel out');
    failAll = succAll = false;
    failF = [];
    succF = [];
  } else {
    if (failAll && succF.length) {
      notes.push(fF[0].src + ' overrides ' + sP.map(x => x.src).join('/'));
      succF = [];
    }
    if (succAll && failF.length) {
      notes.push(sF[0].src + ' overrides ' + fP.map(x => x.src).join('/'));
      failF = [];
    }
    if (failF.length && succF.length) {
      notes.push(fP.map(x => x.src).join('/') + ' and ' + sP.map(x => x.src).join('/') + ' cancel out');
      failF = [];
      succF = [];
    }
  }
  return {
    failAll,
    succAll,
    failF,
    succF,
    notes,
    any: failAll || succAll || failF.length || succF.length,
    used: src
      .filter(
        x =>
          (x.k === 'fail' && (x.face ? failF.includes(x.face) : failAll)) ||
          (x.k === 'succ' && (x.face ? succF.includes(x.face) : succAll))
      )
      .map(x => x.src)
  };
}

function rrDie(v, ok, P) {
  const good = ok(v);
  return good ? P.succAll || P.succF.includes(v) : P.failAll || P.failF.includes(v);
}

function blessOk(u) {
  return (
    !!u &&
    u.blessedR !== (state.round || 1) &&
    (rh((u.rules || []).concat(fx(u)), 'Blessed') || rh(u.charRules || [], 'Blessed'))
  );
}

function noChargeReroll(u) {
  return fxHas(u, /Broken Ground|Snæstormur|no Charge re-roll/i);
}

function hitSources(g, parry) {
  const S = [];
  if (!parry) {
    if (g.flurry) S.push({ k: 'fail', src: 'Flurry' });
    if (g.fiend) S.push({ k: 'fail', src: 'Fiend Hunter' });
    if (g.opp) S.push({ k: 'fail', src: 'Opportunists' });
    if (g.blessed) S.push({ k: 'fail', src: 'Blessed' });
    if (g.eccentric) S.push({ k: 'fail', src: 'Eccentric Fighting Style' });
    if (g.reroll6) S.push({ k: 'fail', face: 6, src: 'Inspired/Aim (re-roll 6s)' });
    if (g.wrath) S.push({ k: 'fail', face: 6, src: 'Wrathful Momentum' });
    if (g.pt) S.push({ k: 'fail', face: 6, src: 'Professional Troops' });
    if (g.crop) S.push({ k: 'fail', face: 6, src: 'Crop Rotation' });
    if (g.water) S.push({ k: 'fail', face: 6, src: 'Water Elemental (in Water)' });
    if (g.marked) S.push({ k: 'fail', src: 'Designate Target (Marked)' });
  }
  return S;
}

function moraleSources(T, mi) {
  const S = [],
    A = byId(cb.att) || base(cb.att) || {},
    iron = rh(RU(T), 'Iron Discipline');
  if (!iron && (mi.arc === 'left' || mi.arc === 'right')) S.push({ k: 'succ', src: 'flank attack' });
  if (!iron && (cb.groups || []).some(g => g.forceMor && g.hits))
    S.push({ k: 'succ', src: (A.charName || 'character') + ' (re-roll successful Morale)' });
  if (upgOf(T, /Glimmer of Faith/)) S.push({ k: 'fail', src: 'Glimmer of Faith' });
  if (fxHas(T, /^Echo in Eternity/)) S.push({ k: 'succ', src: 'Echo in Eternity (refused a Duel)' });
  if (fxHas(T, /^Refused a Duel/)) S.push({ k: 'succ', face: 1, src: 'Refused a Duel' });
  if (fxHas(T, /Pheromantic Drive/)) S.push({ k: 'fail', face: 6, src: 'Pheromantic Drive' });
  {
    const wl = supWl(T.side),
      S0 = supOf(T.side);
    if (
      S0 &&
      S0.k === 'Army of Lions' &&
      wl &&
      wl.onTable &&
      /Infantry/.test(T.cls || '') &&
      polyDist(corners(T), corners(wl)) <= 10
    )
      S.push({ k: 'fail', face: 6, src: 'Army of Lions' });
  }
  return S;
}
