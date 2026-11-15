/*
 * Officers in play
 *
 * Which Officers a regiment has and applying their bonuses.
 *
 * In this file: offNames(), offOn(), applyOfficers()
 */

/* ---- Officers (Command Models bought for a regiment), from the 2026 faction lists. Effects that count as list-building bonuses are baked into the profile;
   the rest are hooks used by the engine. An Officer stands on the Command Stand, so its benefits last until the regiment is destroyed. ---- */
function offNames(u) {
  return (u.abilities || []).filter(a => OFF[a[0]] && /^Officer\b/.test(String(a[1] || ''))).map(a => a[0]);
}

function offOn(u, k) {
  if (!u || u.destroyed) return false;
  return offNames(u).some(n => OFF[n][k] && !(n === 'Catabolic Node' && u.nodeGone));
}

function applyOfficers(u) {
  const add = (r, s) => {
    (r || []).forEach(x => {
      if (!u.rules.includes(x)) u.rules.push(x);
    });
    Object.entries(s || {}).forEach(([k, v]) => {
      if (k === 'M') {
        u.m = (+u.m || 0) + v;
        u.stats.M = (+u.stats.M || 0) + v;
        return;
      }
      if (u.stats[k] === '–' || u.stats[k] == null) return;
      u.stats[k] = (+u.stats[k] || 0) + v;
    });
  };
  u.abilities = u.abilities.map(a => {
    const O = OFF[a[0]];
    if (O && /^Officer\b/.test(a[1])) {
      add(O.r, O.s);
      if (O.cmdA) u.cmdA = (u.cmdA || 0) + O.cmdA;
      if (O.strat) u.strategicFx = (u.strategicFx || []).concat(O.strat);
      if (O.r6) u.offR6 = [...new Set((u.offR6 || []).concat(O.r6))];
      return [a[0], 'Officer: ' + O.t];
    }
    if (a[0] === 'Veteran') {
      const m = String(a[1]).match(/^Option:\s*(.+?),\s*\d+\s*pts$/);
      const B = m && vetBonus(m[1]);
      u.vetRole = true;
      if (B) {
        add(B.r, B.s);
        return ['Veteran', 'Veteran: ' + m[1]];
      }
    }
    return a;
  });
  u.vanguard = Math.max(+u.vanguard || 0, rx(u.rules, 'Vanguard'));
  return u;
}
