/*
 * Built-in opponent: its army
 *
 * Builds a legal army for the built-in opponent with the army builder's own rules: characters with full
 * warbands (a Mainstay regiment the character can join first, then Mainstay and Restricted choices), checked
 * with the builder's warband and army checks, as close to the points limit as it gets. Several random tries,
 * the fullest legal one wins.
 *
 * In this file: botPickOne(), botArmyTry(), botArmy()
 */

function botPickOne(L) {
  return L[Math.floor(Math.random() * L.length)];
}

/* one random attempt; returns the draft or null */
function botArmyTry(fac, pts) {
  bld = { fac, wbs: [], warlord: 0, name: '' };
  if (fac === 'Spires' && typeof SECTS !== 'undefined') bld.sect = botPickOne(SECTS);
  const F = bldFac();
  if (!F) return null;
  const chars = F.units.filter(u => u.kind === 'char' && u.pts != null);
  const regPts = r => {
    try {
      return rowPts(r);
    } catch (e) {
      return 9999;
    }
  };
  for (let g = 0; g < 8; g++) {
    const left = pts - bldTotal();
    const cs = chars.filter(c => (c.pts || 0) < left - 60);
    if (!cs.length) break;
    const c = botPickOne(cs);
    const w = { char: c.name, regs: [], upg: [] };
    const cc = wcCourtChoices(c);
    if (cc) w.court = cc[0];
    if (prioryOf(c)) w.order = 'Crimson Tower';
    if (bld.fac === "W'adrhŭn" && !wadFixedCult(c)) w.cult = 'War';
    bld.wbs.push(w);
    for (let k = 0; k < 4; k++) {
      const ch = wbChoices(c, w).filter(q => !q.modular);
      const main = ch.filter(q => q.cat === 'main'),
        res = ch.filter(q => q.cat === 'res');
      const pool = (w.regs.length && Math.random() < 0.35 && res.length ? res : main)
        .slice()
        .sort(() => Math.random() - 0.5);
      let added = false;
      for (const q of pool) {
        const r = q.chariots
          ? { chariots: [q.chariots[0], q.chariots[0]], custom: [] }
          : { unit: q.unit, opts: [], stands: bldBase(bldUnit(q.unit)), custom: [] };
        /* the first regiment is one the character can join */
        if (!w.regs.length && c.type !== 'Monster' && !joinable(w, r)) continue;
        if (bldTotal() + regPts(r) > pts) continue;
        w.regs.push(r);
        if (w.joins == null && c.type !== 'Monster' && joinable(w, r)) w.joins = w.regs.length - 1;
        if (wbProblems(w).length) {
          w.regs.pop();
          continue;
        }
        added = true;
        break;
      }
      if (!added) break;
    }
    if (wbProblems(w).length || (!w.regs.length && c.type !== 'Monster')) bld.wbs.pop();
  }
  if (!bld.wbs.length) return null;
  /* the Warlord: the first character that may lead */
  for (let i = 0; i < bld.wbs.length; i++) {
    bld.warlord = i;
    if (!bldProblems().some(t => /Warlord/i.test(t))) break;
  }
  if (bldProblems().length) return null;
  return JSON.parse(JSON.stringify(bld));
}

/* a legal army for fac (any faction when empty) at about pts; returns a game list (as bldToList) or null */
function botArmy(fac, pts) {
  const keep = bld;
  let best = null;
  try {
    const facs = ENCY.filter(f => f.units.some(u => u.kind === 'char')).map(f => f.name);
    const F =
      (fac &&
        facs.find(
          n => enNorm(n) === enNorm(fac) || enNorm(n).includes(enNorm(fac)) || enNorm(fac).includes(enNorm(n))
        )) ||
      botPickOne(facs);
    for (let i = 0; i < 40; i++) {
      const d = botArmyTry(F, pts);
      if (!d) continue;
      bld = d;
      const t = bldTotal();
      if (!best || t > best.t) best = { t, d };
      if (t >= pts - 25) break;
    }
    if (!best) return null;
    bld = best.d;
    bld.name = F + ' (built-in opponent)';
    const L = bldToList();
    return L && L.units.length ? L : null;
  } finally {
    bld = keep;
  }
}
