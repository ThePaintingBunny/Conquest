/*
 * Built-in opponent: its army
 *
 * Builds a legal army for the built-in opponent with the army builder's own rules: characters with full
 * warbands (a Mainstay regiment the character can join first, then Mainstay and Restricted choices), checked
 * with the builder's warband and army checks, as close to the points limit as it gets. Several random tries;
 * the best one wins: full on points, and built to be on the table early (few Heavy regiments, which only arrive
 * from round 3), with enough regiments and regiments a sensible size (spare points buy extra stands).
 *
 * In this file: botPickOne(), botHeavy(), botHeavies(), botHeavyCap(), botGrowMax(), botGrow(),
 *   botArmyScore(), botArmyTry(), botArmy()
 */

function botPickOne(L) {
  return L[Math.floor(Math.random() * L.length)];
}

function botHeavy(r) {
  const names = r.chariots ? r.chariots : [r.unit || r.char];
  return names.some(n => /Heavy/.test((bldUnit(n) || {}).cls || ''));
}

/* Heavy regiments in the draft, a Monster character that fights on its own included */
function botHeavies() {
  return bld.wbs.reduce(
    (n, w) =>
      n +
      w.regs.filter(botHeavy).length +
      ((bldUnit(w.char) || {}).type === 'Monster' && botHeavy(w) ? 1 : 0),
    0
  );
}

/* Heavy regiments arrive from round 3 at the earliest: about one per 1000 points */
function botHeavyCap(pts) {
  return Math.max(1, Math.round(pts / 1000));
}

/* how many stands a regiment may grow to here: a few more than it comes with */
function botGrowMax(u) {
  const b = bldBase(u);
  return b >= 3 ? b + 3 : b + 1;
}

/* spend spare points on extra stands, the smallest regiments first; Heavies last */
function botGrow(pts) {
  for (let k = 0; k < 40; k++) {
    const left = pts - bldTotal();
    const rows = [];
    bld.wbs.forEach(w =>
      w.regs.forEach(r => {
        if (r.chariots || r.modular) return;
        const u = bldUnit(r.unit);
        if (!u || !(u.extra > 0) || u.extra > left) return;
        if ((r.stands || bldBase(u)) >= botGrowMax(u)) return;
        rows.push({
          w,
          r,
          u,
          key: (r.stands || bldBase(u)) - bldBase(u) + (botHeavy(r) ? 2 : 0) + Math.random()
        });
      })
    );
    if (!rows.length) return;
    rows.sort((a, b) => a.key - b.key);
    const { w, r, u } = rows[0];
    r.stands = (r.stands || bldBase(u)) + 1;
    if (wbProblems(w).length) {
      r.stands--;
      return;
    }
  }
}

/* how good a legal draft is: full on points, on the table early, enough regiments */
function botArmyScore(pts) {
  const regs = bld.wbs.flatMap(w => w.regs),
    n = regs.length,
    H = botHeavies();
  let s = bldTotal();
  s -= Math.max(0, H - botHeavyCap(pts)) * 150;
  s -= Math.max(0, Math.round(pts / 300) - n) * 60;
  return s;
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
    let c = botPickOne(cs);
    /* a Heavy Monster character counts toward the Heavies too */
    if (c.type === 'Monster' && /Heavy/.test(c.cls || '') && botHeavies() >= botHeavyCap(pts)) {
      const alt = cs.filter(x => !(x.type === 'Monster' && /Heavy/.test(x.cls || '')));
      if (alt.length) c = botPickOne(alt);
    }
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
        /* not too many Heavies: they come on late and leave the early game to the enemy */
        if (botHeavy(r) && botHeavies() >= botHeavyCap(pts) && Math.random() < 0.9) continue;
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
      /* stop short of a full warband sometimes, to leave points for other characters and extra stands */
      if (w.regs.length >= 2 && Math.random() < 0.25) break;
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
  const keep = JSON.stringify(bld);
  botGrow(pts);
  if (bldProblems().length) bld = JSON.parse(keep);
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
      const t = botArmyScore(pts);
      if (!best || t > best.t) best = { t, d };
      if (t >= pts - 15) break;
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
