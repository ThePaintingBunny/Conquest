/*
 * Rule queries
 *
 * Short questions asked all over the code: does this regiment have a Draw Event, an upgrade, Trample,
 * Phalanx; is it Animate; does its army have a rule.
 *
 * In this file: isDrawAb(), isUpgAb(), hasDraw(), drawVal(), trampleX(), frontFoes(), animate(),
 *   phalanx(), armyHas(), upgOf()
 */

function isDrawAb(u, n, t) {
  const nm = String(n || ''),
    base = nm
      .replace(/^.*?:\s*/, '')
      .replace(/\s*\(.*$/, '')
      .trim()
      .toLowerCase();
  if (/^Draw Event/i.test(nm) || /^Draw Event/i.test(String(t || ''))) return true;
  try {
    const L = [];
    const e = frEncy(u);
    if (e && e.draw) L.push(...e.draw);
    if (u.charName) {
      const c = frEncy(u, u.charName);
      if (c && c.draw) L.push(...c.draw);
    }
    return L.some(
      d =>
        String(d)
          .toLowerCase()
          .replace(/\s*\(.*$/, '')
          .trim() === base
    );
  } catch (e) {
    return false;
  }
}

function isUpgAb(u, n) {
  const nm = String(n || '');
  if (/^The .+?:/.test(nm)) return true;
  const base = nm.replace(/\s*\(.*$/, '').trim();
  if (ITEMS[base]) return true;
  try {
    const f = UPG[frFac(u)];
    return !!(f && (f.list || []).some(x => x[1] === base));
  } catch (e) {
    return false;
  }
}

function hasDraw(u, re) {
  return (u.abilities || []).some(a => re.test(a[0])) || fx(u).some(x => re.test(x));
}

function drawVal(u, re) {
  let v = 0;
  (u.abilities || []).concat(fx(u).map(x => [x])).forEach(a => {
    const m = String(a[0]).match(re);
    if (m) v = Math.max(v, +m[1] || 0);
  });
  return v;
}

function trampleX(u) {
  return Math.max(rx(RU(u), 'Trample'), u.char != null ? rx(u.charRules, 'Trample') : 0);
}

function frontFoes(u) {
  const uc = standsOf(u).filter(s => s.rank === 0);
  return engaged(u).filter(e => {
    const ec = corners(e);
    return (
      uc.some(s => polyDist(s.poly, ec) <= 0.35) &&
      corners(e)
        .concat([[e.x, e.y]])
        .some(p => arcOf(u, p) === 'front')
    );
  });
}

function animate(u) {
  return rh((u && u.rules) || [], 'Animate Vessel');
}

function phalanx(u) {
  return rh((u && u.rules) || [], 'Phalanx');
}

function armyHas(side, re) {
  return (state.army?.[side] || []).some(x => re.test(x));
}

function upgOf(u, re) {
  return (
    (u.abilities || []).some(a => re.test(String(a[0] || ''))) ||
    rh(u.charRules || [], re.source) ||
    (u.effects || []).some(e => re.test(e))
  );
}
