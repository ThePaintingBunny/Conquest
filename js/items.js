/* Character upgrades applied in play. */
function itemsOf(u) {
  return u && u.charName
    ? (u.abilities || []).map(a => String(a[0]).replace(/^.*?:\s*/, '')).filter(n => ITEMS[n])
    : [];
}
function itemSpec(u) {
  return itemsOf(u).map(n => [n, ITEMS[n]]);
}
const itV = (v, u) => (typeof v === 'function' ? v(u) : v || []);
/* rules a regiment gets from its own character's items and from friendly characters' auras or army-wide items */
function itemRegRules(u) {
  const o = [];
  if (!u || u.type === 'marker') return o;
  itemSpec(u).forEach(([n, S]) => {
    if (S.army || S.aura) return;
    if (S.cond && !S.cond(u)) return;
    itV(S.r, u).forEach(x => o.push(x));
    if (S.label) o.push(S.label);
  });
  (state.units || []).forEach(x => {
    if (x.side !== u.side || !x.charName || x.destroyed) return;
    itemSpec(x).forEach(([n, S]) => {
      if (!(S.army || S.aura)) return;
      if (S.army && !S.army(x)) return;
      if (S.wb && !srSameWb(x, u)) return;
      if (S.aura && x.id !== u.id && !srNear(x, u, S.aura)) return;
      if (S.to && !S.to(u)) return;
      itV(S.r, u).forEach(r => o.push(r));
    });
  });
  return o;
}
function itemRoles(u) {
  return itemSpec(u)
    .map(([n, S]) => S.role)
    .filter(Boolean);
}
function chRulesX(u) {
  const R = (u.charRules || []).slice();
  itemSpec(u).forEach(([n, S]) => itV(S.c, u).forEach(x => R.push(x)));
  /* items that replace part of the profile take rules away (Alternate Soma: no Impact (2), Hardened (2) not (1)) */
  const lose = itemSpec(u).flatMap(([n, S]) => S.cLose || []);
  return lose.length ? R.filter(x => !lose.some(re => re.test(String(x)))) : R;
}
function chStatsX(u) {
  const s = Object.assign({}, u.charStats || {});
  (u.temp || []).forEach(g => {
    const m = String(g.src).match(/^(?:Soul Reaper|Runeforged Plate) \(\+(\d+) Attacks\)/);
    if (m) s.A = (+s.A || 0) + +m[1];
  });
  /* Convulsive Doom (Spires): +2 Attacks when it Dies Fighting */
  if (typeof cb !== 'undefined' && cb && cb.dieFight && cb.att === u.id && upgOf(u, /Convulsive Doom/))
    s.A = (+s.A || 0) + 2;
  itemSpec(u).forEach(([n, S]) => {
    const d = typeof S.cs === 'function' ? S.cs(u) : S.cs;
    if (d)
      Object.entries(d).forEach(([k, v]) => {
        s[k] = (+s[k] || 0) + v;
      });
  });
  return s;
}
function itemFlag(u, k) {
  return itemSpec(u).some(([n, S]) => S[k]);
}
function itemDuelRules(u) {
  const R = [];
  itemSpec(u).forEach(([n, S]) => (S.duel || []).forEach(x => R.push(x)));
  return R;
}
function itemSpellRange(u) {
  return itemSpec(u).reduce((a, [n, S]) => a + (S.spellRange || 0), 0);
}
