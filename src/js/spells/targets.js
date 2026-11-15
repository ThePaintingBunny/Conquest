/*
 * Spell targets
 *
 * Range from the caster's stand, line of sight and the legal targets of a spell.
 *
 * In this file: casterPoly(), spellLos(), spellTargets()
 */

/* Range, Line of Sight and Enemy Interference are measured from the spellcaster's own stand (core rules 2026):
   the character's stand when a character casts, the whole regiment when the regiment itself is the caster. */
function casterPoly(u) {
  if (u && u.charName && !regCaster(u)) {
    const s = standsOf(u).find(x => x.kind === 'char');
    if (s) return s.poly;
  }
  return corners(u);
}

/* Spells that cause Hits need Line of Sight: a line from the caster's stand to any point of the target that is not
   blocked by a regiment or Obstructing terrain of a Size equal to or larger than both the caster and the target. */
function spellLos(u, T) {
  const sa = uSize(u),
    st = uSize(T),
    P = casterPoly(u),
    from = P.concat([
      [P.reduce((s, p) => s + p[0], 0) / P.length, P.reduce((s, p) => s + p[1], 0) / P.length]
    ]);
  const TC = corners(T),
    to = TC.concat(
      TC.map((p, i) => [(p[0] + TC[(i + 1) % 4][0]) / 2, (p[1] + TC[(i + 1) % 4][1]) / 2]),
      [[T.x, T.y]]
    );
  const walls = all()
    .filter(
      o =>
        o.onTable &&
        !o.destroyed &&
        o.id !== u.id &&
        o.id !== T.id &&
        o.type !== 'marker' &&
        uSize(o) >= Math.max(sa, st)
    )
    .map(o => ({ name: o.short || o.name, P: shrinkPoly(corners(o), 0.05) }));
  const terr = terrainOf().filter(x => {
    if (!tHas(x, 'Obstructing') && !tHas(x, 'Garrison')) return false;
    if (inT(x, [u.x, u.y]) || inT(x, [T.x, T.y])) return false;
    const I = tInfo(x);
    return I.size >= sa && I.size >= st;
  });
  let by = null;
  for (const a of from)
    for (const b of to) {
      const w = walls.find(W => segPolyHit(a, b, W.P));
      if (w) {
        by = by || w.name;
        continue;
      }
      const x = terr.find(X => segHits(X, a, b));
      if (x) {
        by = by || tInfo(x).name;
        continue;
      }
      return { ok: true };
    }
  return { ok: false, by };
}

function spellTargets(u, sp) {
  const S = sp.db || {},
    cp = casterPoly(u);
  if (S.t === 'self' || S.t === 'zone' || S.t === 'terrain' || sp.range === 0) {
    /* Sacred Warriors (City States Auxiliary): a Sacred Band regiment may cast its Self spells on a friendly
       regiment within 12″ that has a living Sacred Band Veteran stand */
    if (S.t === 'self' && /^Sacred Band/.test(frBase(u)))
      return [u].concat(
        all().filter(
          t =>
            t.id !== u.id &&
            t.side === u.side &&
            t.onTable &&
            !t.destroyed &&
            t.aux != null &&
            rh(t.auxRules || [], 'Sacred Warriors') &&
            !auxDead(t) &&
            polyDist(cp, corners(t)) <= 12 + 1e-6
        )
      );
    return [u];
  }
  const eng = engaged(u).map(byId).filter(Boolean),
    hits = S.h || S.hf || /Hit/.test(sp.text || '');
  let C = all().filter(
    t =>
      t.onTable &&
      !t.destroyed &&
      t.type !== 'marker' &&
      (S.t === 'any' ? true : sp.targets === 'enemy' ? t.side !== u.side : t.side === u.side) &&
      polyDist(cp, corners(t)) <= (sp.range || 12) + srRangeAdd(u) + itemSpellRange(u) + 1e-6
  );
  C = C.concat(srTether(u, sp, C));
  if (sp.targets !== 'enemy' && /Promethean/.test((u.name || '') + ' ' + (u.charName || '')))
    all()
      .filter(
        t =>
          t.side === u.side && t.onTable && !t.destroyed && upgOf(t, /Resonance Receptors/) && !C.includes(t)
      )
      .forEach(t => C.push(t));
  if (u.warlord && supAct(u.side, 'Divine Protection') && sp.targets !== 'enemy' && sp.range !== 0)
    C = all().filter(t => t.onTable && !t.destroyed && t.type !== 'marker' && t.side === u.side);
  /* hit spells need Line of Sight; an engaged caster may only target the enemy it fights, and counts as seeing it */
  if (hits && sp.targets === 'enemy') C = C.filter(t => spellLos(u, t).ok);
  if (eng.length && hits && sp.targets === 'enemy') C = eng;
  const q = S.q;
  if (q)
    C = C.filter(t =>
      q === 'nonmonster'
        ? t.type !== 'monster'
        : q === 'Infantry'
          ? /Infantry/.test(t.cls || '')
          : q === 'Brute'
            ? /Brute/.test(t.cls || '')
            : q === 'Automaton'
              ? rh(t.rules, 'Automaton')
              : q === 'modular'
                ? !!t.mods
                : q === 'inzone'
                  ? zonesOf().some(z => standsOf(t).some(st => inZone(st.poly, z)))
                  : q.startsWith('name:')
                    ? new RegExp(q.slice(5)).test(t.name)
                    : q.startsWith('fx:')
                      ? fx(t).some(e => e.startsWith(q.slice(3)))
                      : frRoles(t).includes(q) || (t.charName && frRoles(t, true).includes(q))
    );
  if (!hits) C = C.filter(t => !hasSpell(t, sp.name));
  if (sp.req === 'automaton') C = C.filter(t => rh(t.rules, 'Automaton'));
  if (sp.req === 'nonmonster') C = C.filter(t => t.type !== 'monster');
  return C;
}
