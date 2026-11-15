/*
 * Terrain rules
 *
 * Size, Hindering and Dangerous crossings, Cover, line of sight, Water and Garrison terrain (core
 * rules, Terrain chapter).
 *
 * In this file: tBlocks(), baseSize(), uSize(), tIgnore(), segHits(), tCrossed(), stC(),
 *   standCenters(), tAfterMove(), tCover(), tLos(), stIn(), tWater(), tGarrisonNear(), tGarrisonOf()
 */

function tBlocks(t, occ) {
  return tHas(t, 'Impassable') || (tHas(t, 'Garrison') && !occ);
}

function baseSize(u) {
  const c = u.cls || '';
  let s = /Monster|Titan/i.test(c) || u.type === 'monster' ? 3 : /Cavalry|Brute|Chariot/i.test(c) ? 2 : 1;
  const R = (u.rules || [])
      .concat(u.charRules || [])
      .concat((u.abilities || []).map(a => a[0] + ': ' + a[1])),
    fac = frFac(u);
  for (const t of R) {
    const x = String(t);
    let m = x.match(/\bSize\s*\(?\s*(\d)\s*\)?/i);
    if (!m) {
      let d = '';
      try {
        d = ruleInfo(x, fac) || '';
      } catch (e) {}
      m = String(d).match(/count[s]?\s+as\s+Size\s+(\d)/i);
    }
    if (m) return { s: +m[1], why: x.replace(/\s*\(.*$/, '').replace(/:.*$/, '') };
  }
  return { s, why: '' };
}

function uSize(u) {
  let s = baseSize(u).s;
  const e = terrainOf().find(t => tHas(t, 'Elevated') && inT(t, [u.x, u.y]));
  if (e) s += tInfo(e).size;
  if (u.garrison) {
    const g = terrainOf().find(t => tId(t) === u.garrison);
    if (g) s = tInfo(g).size;
  }
  return s;
}

function tIgnore(u, k) {
  const R = (u.rules || []).concat(fx(u));
  if (rh(R, 'Fly')) return true;
  if (R.some(x => new RegExp('^Ignores ' + k, 'i').test(x))) return true;
  if (
    k === 'Hindering' &&
    (armyHas(u.side, /ignores Hindering/i) ||
      frFac(u) === 'Weaver Courts' ||
      R.some(x => /Ignores Hindering/i.test(x)))
  )
    return true;
  return false;
}

function segHits(t, a, b) {
  return segHitsPolyG(a, b, terrPoly(t));
}

/* which stands crossed which terrain during a move */
function tCrossed(u, from, to) {
  const A = standsOf(Object.assign({}, u, from)),
    B = standsOf(Object.assign({}, u, to));
  const out = {};
  terrainOf().forEach(t => {
    let n = 0;
    A.forEach((s, i) => {
      const b = B[i] || B[B.length - 1];
      if (segHits(t, stC(s), stC(b))) n++;
    });
    if (n) out[tId(t)] = { t, n };
  });
  return { per: out, total: A.length };
}

function stC(s) {
  const P = s.poly;
  return [(P[0][0] + P[1][0] + P[2][0] + P[3][0]) / 4, (P[0][1] + P[1][1] + P[2][1] + P[3][1]) / 4];
}

function standCenters(u) {
  return standsOf(u).map(stC);
}

/* after a move: Dangerous / Perilous rolls; charges through Hindering */
function tAfterMove(u, entry) {
  const res = { notes: [], wounds: 0, hindered: false };
  if (!entry.from || !entry.to) return res;
  const C = tCrossed(u, entry.from, entry.to),
    big = /Cavalry|Chariot/i.test(u.cls || '');
  Object.values(C.per).forEach(({ t, n }) => {
    const I = tInfo(t);
    ['Dangerous', 'Perilous'].forEach(k => {
      if (!I.kw.includes(k) || tIgnore(u, k)) return;
      const need = k === 'Dangerous' ? 6 : 4,
        rolls = [];
      let w = 0;
      for (let i = 0; i < n; i++) {
        const d = d6();
        rolls.push(d);
        if (d >= need) w += big ? 2 : 1;
      }
      res.wounds += w;
      res.notes.push(`${I.name} (${k}): rolled ${rolls.join(', ')} → ${w} wound${w === 1 ? '' : 's'}`);
    });
    if (
      entry.type === 'charge' &&
      I.kw.includes('Hindering') &&
      !tIgnore(u, 'Hindering') &&
      n >= Math.ceil(C.total / 2)
    )
      res.hindered = I.name;
  });
  return res;
}

/* Volley Cover and Line of Sight */
function tCover(A, T) {
  if (rh((A.rules || []).concat(fx(A)), 'Sureshot')) return null;
  const sz = uSize(T),
    TS = standsOf(T);
  for (const t of terrainOf()) {
    if (!tHas(t, 'Cover')) continue;
    const I = tInfo(t);
    if (sz > I.size) continue;
    if (TS.length && TS.every(s => stIn(t, s))) return I.name + ' (target inside)';
    if (!inT(t, [A.x, A.y]) && segHits(t, [A.x, A.y], [T.x, T.y])) return I.name + ' (shooting through)';
  }
  return null;
}

function tLos(A, T, volley) {
  const sa = uSize(A),
    st = uSize(T);
  for (const t of terrainOf()) {
    if (!tHas(t, 'Obstructing') && !tHas(t, 'Garrison')) continue;
    if (inT(t, [A.x, A.y]) || inT(t, [T.x, T.y])) continue;
    const I = tInfo(t);
    const blocks = volley ? I.size >= sa && I.size >= st : I.size >= sa && I.size >= st;
    if (blocks && segHits(t, [A.x, A.y], [T.x, T.y])) return I.name + ' (Size ' + I.size + ')';
  }
  return null;
}

/* a stand is within a piece of Zonal terrain when any part of it is inside */
function stIn(t, s) {
  return terrDist(s.poly, t) === 0;
}

function tWater(u) {
  const S = standsOf(u);
  if (!S.length) return false;
  const w = S.filter(s => terrainOf().some(t => tHas(t, 'Water') && stIn(t, s))).length;
  return w >= Math.ceil(S.length / 2);
}

/* Garrison terrain */
function tGarrisonNear(u) {
  if (!/Infantry/i.test(u.cls || '') || u.garrison) return [];
  const C = corners(u);
  return terrainOf().filter(t => {
    if (!tHas(t, 'Garrison')) return false;
    const I = tInfo(t);
    if (live(u) > I.cap) return false;
    if (all().some(o => o.garrison === tId(t) && !o.destroyed)) return false;
    return terrDist(C, t) <= (u.m || 0) + 1;
  });
}

function tGarrisonOf(u) {
  return u && u.garrison ? terrainOf().find(t => tId(t) === u.garrison) : null;
}
