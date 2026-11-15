/*
 * Current profile
 *
 * What a regiment's stats and rules are right now: the printed profile plus everything in effect
 * (upgrades, effects, faction rules, derived rules). Includes the helpers that read a rule or its value
 * from a rule list.
 *
 * In this file: RU, cR(), rx(), rh(), fxHas(), prof(), hasRule(), FXB, fx(), baseStats(), baseRules(),
 *   effStats(), effRules()
 */

const RU = u => (u ? (u.rules || []).concat(fx(u)) : []);

function cR(u) {
  return u && u.charName ? u.charRules || [] : [];
}

function rx(rules, name) {
  const re = new RegExp('(?:^|, )' + name + '\\s*\\((\\+?)(\\d+)\\)');
  let base = 0,
    add = 0;
  for (const r of rules || []) {
    if (name === 'Tenacious' && /Volleys/i.test(String(r))) continue;
    const m = String(r).match(re);
    if (m) {
      const v = parseInt(m[2], 10);
      if (m[1]) add += v;
      else base = Math.max(base, v);
    }
  }
  const t = base + add;
  return name === 'Tenacious' ? Math.min(2, t) || 0 : t;
}

function rh(rules, name) {
  const re = new RegExp('(?:^|, )' + name + '(?![A-Za-z])');
  return (rules || []).some(r => re.test(String(r)));
}

function fxHas(u, re) {
  return fx(u).some(x => re.test(x));
}

function prof(u, kind, mod) {
  const s = u.stats || {};
  let p = {
    C: +s.C || 0,
    A: +s.A || 0,
    V: +s.V || 0,
    rules: (u.rules || []).slice(),
    name: u.short || u.name
  };
  if (kind === 'reg' && mod && u.modProfiles && u.modProfiles[mod]) {
    const m = u.modProfiles[mod];
    p = { C: +m.C || 0, A: +m.A || 0, V: +m.V || 0, rules: (m.rules || []).concat(u.rules || []), name: mod };
  }
  if (kind === 'aux' && u.auxStats) {
    p = Object.assign(p, u.auxStats);
    p.rules = (u.auxRules || []).slice();
    p.name = u.auxName || 'Auxiliary';
  }
  if (kind === 'char' && u.charStats) {
    p = Object.assign(p, chStatsX(u));
    p.rules = chRulesX(u);
    p.name = u.charName;
    if ((u.effects || []).some(x => /Greetings to a Fellow General/.test(x))) p.A += 5;
  }
  if (kind === 'reg') {
    const d = srStat(u, 'reg');
    p.C += d.C;
    p.A += d.A;
  }
  if (supOn(u.side, 'Army of Lions') && srIsWl(u) && p.C < 4) p.C += 1;
  return p;
}

function hasRule(u, re) {
  return (u.rules || []).concat(fx(u)).some(x => re.test(x));
}

const FXB = new Set();

function fx(u) {
  const e = (u.effects || []).slice();
  if (!u || FXB.has(u.id)) return e;
  FXB.add(u.id);
  try {
    if (act && act.id === u.id)
      act.extraFx.forEach(x => {
        if (!e.includes(x)) e.push(x);
      });
    try {
      frFx(u).forEach(x => {
        if (!e.includes(x)) e.push(x);
      });
    } catch (err) {}
    try {
      dRules(u).forEach(x => {
        if (!e.includes(x)) e.push(x);
      });
    } catch (err) {}
  } finally {
    FXB.delete(u.id);
  }
  return e;
}

/* the regiment's printed stats (without this round's changes) and its stats right now */
function baseStats(u) {
  const b = Object.assign({}, u.stats || {});
  (u.temp || []).forEach(g =>
    Object.entries(g.d || {}).forEach(([k, v]) => {
      if (b[k] != null && !isNaN(+b[k])) b[k] = +b[k] - v;
    })
  );
  return b;
}

function baseRules(u) {
  const T = new Set();
  (u.temp || []).forEach(g => (g.rules || []).forEach(r => T.add(r)));
  const out = [];
  (u.rules || []).forEach(r => {
    if (T.has(r)) {
      T.delete(r);
      return;
    }
    out.push(r);
  });
  return out;
}

function effStats(u) {
  const S = u.stats || {},
    e = Object.assign({}, S),
    why = {};
  const p = prof(u, 'reg');
  e.M = (+u.m || +S.M || 0) + srMarchMod(u);
  if (e.M !== +baseStats(u).M) why.M = 'March changes this round';
  const hc = hitMods(u, p, 'clash', null);
  e.C = hc.hitOn;
  why.C = hc.reroll6 ? 're-rolls failed 6s (bonus above 5)' : fxHas(u, /Inspired/) ? 'Inspired' : '';
  if (hasBarrage(u)) {
    const hv = hitMods(u, p, 'volley', null);
    e.V = hv.hitOn;
  }
  e.A = p.A;
  const mi = moraleInfo(u, u);
  e.R = mi.auto ? '–' : mi.R;
  why.R = mi.auto ? 'never tests' : 'includes its size' + (u.charName ? ' and the character’s Resolve' : '');
  let D = +S.D || 0;
  const rr = RU(u);
  if (rh(rr, 'Shield') && !u.garrison) D += 1;
  if (phalanx(u)) D += 1;
  const bas = drawVal(u, /^Bastion\s*\((\d+)\)/);
  if (bas) D += bas;
  e.D = D;
  if (D !== (+S.D || 0)) why.D = 'from the front' + (bas ? ', with Bastion' : '');
  let Ev = supEvasion(u, +S.E || 0);
  if (fxHas(u, /^Coils of the Serpent/) && Ev < 2) Ev += 1;
  e.E = Ev;
  e._why = why;
  return e;
}

/* special rules that are new or have a different value right now */
function effRules(u, BR) {
  const all = RU(u),
    out = [],
    seen = new Set();
  const val = (L, n) => rx(L, n);
  all.forEach(r => {
    const m = String(r).match(/^([A-Z][A-Za-z'!\- ]+?)\s*\(\+?(\d+)\)$/);
    const plain = /^[A-Z][A-Za-z'!\- ]+$/.test(String(r)) && GLOSS[String(r).toLowerCase()];
    if (m) {
      const n = m[1].trim();
      if (seen.has(n)) return;
      seen.add(n);
      const now = val(all, n),
        was = val(BR, n);
      if (now !== was && now > 0) out.push([n + ' (' + now + ')', was ? n + ' (' + was + ')' : '']);
    } else if (plain && !rh(BR, String(r)) && !seen.has(r)) {
      seen.add(r);
      out.push([String(r), '']);
    }
  });
  return out;
}
