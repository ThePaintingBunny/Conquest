/*
 * Built-in opponent: expected damage
 *
 * How many wounds one attack is expected to do, worked out from the game's own attack groups, hit numbers,
 * Defense and Morale (no dice are rolled). The attacker is placed in contact on the chosen facing in a copy of
 * the table, so every rule that looks at the arc, support or Inspiration still applies.
 *
 * In this file: botCache, botCacheReset(), botSandbox(), botContact(), botP6(), botAttack()
 */

let botCache = new Map();

function botCacheReset() {
  botCache = new Map();
}

/* run fn on a copy of the table with some regiments moved; nothing is saved and no activation is open */
function botSandbox(units, fn) {
  const sS = state,
    sC = cb,
    sA = act,
    sq = quietBreak;
  state = Object.assign({}, sS, { units });
  cb = null;
  act = null;
  quietBreak = true;
  try {
    return fn();
  } finally {
    state = sS;
    cb = sC;
    act = sA;
    quietBreak = sq;
  }
}

/* where A stands when it is in contact with T's facing (front, left, right or rear), facing into it */
function botContact(A, T, face) {
  const F = chgFaceGeom(T, face || 'front'),
    G = geom(A);
  return {
    x: F.e[0] + F.n[0] * (G.d / 2 + 0.05),
    y: F.e[1] + F.n[1] * (G.d / 2 + 0.05),
    facing: F.fac
  };
}

/* the chance a D6 rolls n or more */
function botP6(n) {
  if (n <= 1) return 1;
  if (n > 6) return 0;
  return (7 - n) / 6;
}

/* expected wounds of one attack (clash, impact or volley) by A on T.
   o.face: the facing of T that A hits (A is moved into contact there; ignored for a volley)
   o.Apose / o.Tpose: poses to use instead (no contact placement when given)
   o.inspired, o.charged: A is Inspired / has just charged */
function botAttack(A0, T0, type, o) {
  o = o || {};
  if (!A0 || !T0) return { w: 0, mw: 0, tot: 0 };
  const key = [
    o.key || '',
    A0.id,
    T0.id,
    type,
    o.face || '',
    o.inspired ? 1 : 0,
    o.charged ? 1 : 0,
    A0.wounds || 0,
    T0.wounds || 0,
    o.Apose && !o.key ? [o.Apose.x, o.Apose.y, o.Apose.facing].map(v => Math.round(v * 2)).join(',') : '',
    o.Tpose && !o.key ? [o.Tpose.x, o.Tpose.y, o.Tpose.facing].map(v => Math.round(v * 2)).join(',') : '',
    (A0.effects || []).length,
    (T0.effects || []).length
  ].join('|');
  if (botCache.has(key)) return botCache.get(key);
  let res = { w: 0, mw: 0, tot: 0, att: 0 };
  try {
    const Ap =
      o.Apose ||
      (type === 'volley' || o.Tpose ? { x: A0.x, y: A0.y, facing: A0.facing } : botContact(A0, T0, o.face));
    const add = [].concat(
      o.inspired ? ['Inspired (calculator)'] : [],
      o.charged ? ['Inspired (charged)'] : []
    );
    const Ax = Object.assign({}, A0, Ap, { onTable: true, effects: (A0.effects || []).concat(add) }),
      Tx = Object.assign({}, T0, o.Tpose || {}, { onTable: true });
    const units = (state.units || []).map(u => (u.id === Ax.id ? Ax : u.id === Tx.id ? Tx : u));
    if (!units.some(u => u.id === Ax.id)) units.push(Ax);
    if (!units.some(u => u.id === Tx.id)) units.push(Tx);
    res = botSandbox(units, () => {
      const A = base(Ax.id),
        T = base(Tx.id);
      cb = { type, att: A.id, tgt: T.id, groups: null, step: 'att', inAct: false };
      if (type === 'volley') {
        try {
          cb.vst = volleyStands(A, T);
        } catch (e) {}
      }
      let G = buildGroups(type, A, T);
      G = (Array.isArray(G) ? G : Object.values(G)).filter(g => g.n > 0);
      cb.groups = G;
      let w = 0,
        att = 0;
      const parry = hitParry(T);
      G.forEach(g => {
        att += g.n;
        let p = g.hitOn < 1 ? 1 / 6 : Math.min(5, g.hitOn) / 6;
        if (!parry && g.flurry) p = p + (1 - p) * p;
        else if (!parry && g.reroll6) p = p + p / 6;
        let hits = g.n * p;
        if (g.relentless) hits += g.n / 6;
        if (g.torrent) hits += hits / 2;
        const di = defInfo(T, A, g),
          s = Math.max(0, Math.min(5, Math.max(+di.D || 0, +di.E || 0))) / 6;
        w += hits * (1 - s);
      });
      let mw = 0;
      const mi = moraleInfo(T, A);
      if (w > 0 && !mi.auto) {
        let pass = Math.max(1, Math.min(5, mi.R)) / 6;
        if (mi.arc === 'rear' && !mi.iron) pass = 0;
        else if (mi.arc === 'left' || mi.arc === 'right') pass *= pass;
        let fails = w * (1 - pass);
        fails = Math.max(0, fails - Math.min(+mi.indom || 0, fails));
        mw = mi.oblivious ? fails / 2 : fails;
      }
      return { w, mw, tot: w + mw, att };
    });
  } catch (e) {
    res = { w: 0, mw: 0, tot: 0, att: 0, err: String((e && e.message) || e) };
  }
  botCache.set(key, res);
  return res;
}
