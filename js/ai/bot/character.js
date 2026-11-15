/*
 * Built-in opponent: characters and spells
 *
 * Picks a character's Draw Events and its one action: a spell (scored from the spell's hits, healing or effect
 * and the chance to cast it), an ability, a Duel with good odds, or nothing.
 *
 * In this file: botBinomAtLeast(), botMatters(), botSpellValue(), botBestSpell(), botAbilityValue(),
 *   botPlanCharacter()
 */

/* the chance of at least k successes on n dice that each succeed with chance p */
function botBinomAtLeast(n, p, k) {
  if (k <= 0) return 1;
  if (k > n) return 0;
  let s = 0;
  const C = (a, b) => {
    let r = 1;
    for (let i = 1; i <= b; i++) r = (r * (a - b + i)) / i;
    return r;
  };
  for (let i = k; i <= n; i++) s += C(n, i) * Math.pow(p, i) * Math.pow(1 - p, n - i);
  return s;
}

/* how much a regiment is about to matter: in a fight, or able to start one, counts fully */
function botMatters(ctx, t) {
  if (!t || !t.onTable) return 0;
  if (engaged(t).length) return 1;
  const other = t.side === ctx.me ? ctx.foes : ctx.mine;
  return other.some(o => botReach(t, o).p > 0.3 || botReach(o, t).p > 0.3) ? 0.8 : 0.35;
}

/* the expected worth of casting this spell on T, in points */
function botSpellValue(ctx, u, asChar, sp, T) {
  const S = sp.db || {},
    lvl = magicLevel(u, asChar) + (srSpellDice(u, asChar) || 0);
  if (!lvl && S.a !== null) return 0;
  let need = 2;
  try {
    need = srNeed(u, asChar, spellNeed(sp, T));
  } catch (e) {}
  const pd =
    S.a === null ? 1 : S.a === 'D' ? Math.min(5, +(T.stats || {}).D || 0) / 6 : Math.min(5, +S.a || 0) / 6;
  const pOk = S.a === null ? 1 : botBinomAtLeast(lvl, pd, need);
  if (pOk <= 0.02) return 0;
  const exS = S.a === null ? 1 : Math.max(need, lvl * pd);
  const foe = T.side !== u.side;
  let v = 0;
  if (S.h || S.hf) {
    const [per, ap] = S.h || S.hf,
      hits = S.h ? per * exS : per;
    const st = T.stats || {},
      save = Math.max(0, Math.min(5, Math.max((+st.D || 0) - (+ap || 0), +st.E || 0))) / 6;
    let w = hits * (1 - save);
    if (!S.nm && st.R != null && st.R !== '–') w += w * (1 - Math.max(1, Math.min(5, +st.R || 0)) / 6);
    v = foe ? botWoundPts(T, w) : -botWoundPts(T, w);
  } else if (S.heal) {
    const n = S.heal === 's' ? exS : +S.heal || 0;
    v = foe ? 0 : (Math.min(n, +T.wounds || 0) * botVal(T)) / botMaxW(T);
  } else {
    const mag = Object.values(S.st || {}).reduce((a, x) => a + Math.abs(+x || 0), 0) + (S.g || []).length;
    v = (0.06 + 0.04 * Math.min(3, mag)) * botVal(T) * botMatters(ctx, T);
  }
  return pOk * v;
}

/* the best spell and target for u (as a character or as a casting regiment) */
function botBestSpell(ctx, u, asChar) {
  let best = null;
  spellsOf(u, asChar).forEach(sp => {
    let T = [];
    try {
      T = spellTargets(u, sp);
    } catch (e) {}
    T.forEach(t => {
      const v = botSpellValue(ctx, u, asChar, sp, t);
      if (v > 0 && (!best || v > best.v)) best = { sp, t, v };
    });
  });
  return best;
}

/* a character ability with a target: friends that are fighting, enemies that matter */
function botAbilityValue(ctx, u, a, t) {
  const bad = /suffers?|loses?|sacrific|remove a stand|wound(s)? to (this|your)/i.test(a.d || '');
  if (bad) return 0;
  return 0.07 * botVal(t) * botMatters(ctx, t);
}

function botPlanCharacter(u) {
  if (!u.onTable) return { char: 'pass' };
  const ctx = botCtx(u.side),
    out = { draws: [], char: 'pass', narration: '' };
  let AB = [];
  try {
    AB = chAbil(u).filter(a => !chWhy(u, a));
  } catch (e) {}
  const pick = a => {
    let best = null;
    (chTargets(u, a) || []).forEach(t => {
      const v = botAbilityValue(ctx, u, a, t);
      if (v > 0 && (!best || v > best.v)) best = { t, v };
    });
    return best;
  };
  AB.filter(a => a.kind === 'draw').forEach(a => {
    const b = pick(a);
    if (b) out.draws.push({ ability: a.n, target: b.t.id });
  });
  const opts = [];
  if (magicLevel(u, true) > 0) {
    const s = botBestSpell(ctx, u, true);
    if (s) opts.push({ v: s.v, r: { char: 'cast', spell: s.sp.name, target: s.t.id } });
  }
  AB.filter(a => a.kind !== 'draw').forEach(a => {
    const b = pick(a);
    if (b) opts.push({ v: b.v, r: { char: 'ability', ability: a.n, target: b.t.id } });
  });
  try {
    duelTargets(u).forEach(t => {
      const o = duelOdds(u, t);
      if (o >= 1.2) opts.push({ v: (o - 1) * 120, r: { char: 'ability', ability: 'Duel', target: t.id } });
    });
  } catch (e) {}
  opts.forEach(o => (o.v += botNoise(15)));
  opts.sort((a, b) => b.v - a.v);
  if (opts[0] && opts[0].v > 2) Object.assign(out, opts[0].r);
  return out;
}
