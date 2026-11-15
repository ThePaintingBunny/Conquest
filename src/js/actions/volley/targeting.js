/*
 * Volley targeting
 *
 * Barrage and its range, Aimed Shot, Arcing Fire, and whether (and why not) a regiment can Volley at a
 * target.
 *
 * In this file: barrageOf(), fxBarrage(), rangeAdj(), volleyRange(), hasBarrage(), arcingOn(),
 *   arcingWhy(), friendSees(), volleyWhy(), volleySummary(), volleyArcSpan(), frontArcHas(),
 *   alwaysAim(), aimWhy(), fireVolley()
 */

/* Barrage of one profile, and of the regiment: any stand with Barrage (regiment, its character, auxiliary or modular stands) lets it Volley */
function barrageOf(rules) {
  const m = (rules || []).join(', ').match(/Barrage\s*\((\d+)\)\s*\(?\s*(\d+)/);
  return m ? { shots: +m[1], range: +m[2] } : null;
}

function fxBarrage(u) {
  let n = 0;
  fx(u).forEach(x => {
    const m = String(x).match(/^Barrage\s*\(\+(\d+)\)/);
    if (m) n += +m[1];
  });
  return n;
}

function rangeAdj(u, r) {
  let add = 0;
  (u.rules || []).concat(fx(u)).forEach(x => {
    const m = String(x).match(/^Barrage Range\s*\(\+(\d+)\)/);
    if (m) add += +m[1];
  });
  return (
    (r + add + srRangeBonus(u)) *
    (['cs', 'nord'].some(s => supAct(s, 'Skývald') && supOf(s).choice === 'Niflmire') ? 0.5 : 1)
  );
}

function volleyRange(u) {
  if (!u) return null;
  const P = [u.rules || []];
  if (u.modProfiles) Object.values(u.modProfiles).forEach(x => P.push(x.rules || []));
  if (u.charName) P.push(chRulesX(u));
  if (u.aux != null && u.auxRules && !auxDead(u)) P.push(u.auxRules);
  let best = null;
  P.forEach(r => {
    const b = barrageOf(r);
    if (b && (!best || b.range > best.range)) best = b;
  });
  return best ? { shots: best.shots, range: rangeAdj(u, best.range) } : null;
}

function hasBarrage(u) {
  return !!volleyRange(u);
}

/* can this regiment Volley at that target: some stand within Barrage range and the target in its front arc */
function arcingOn(A) {
  return !!(act && act.cur && act.cur.type === 'volley' && act.id === (A && A.id) && act.cur.arcing);
}

function arcingWhy(A) {
  if (!rh(RU(A), 'Arcing Fire') && !(A.charName && rh(chRulesX(A), 'Arcing Fire')))
    return 'It has no Arcing Fire.';
  if (A.garrison) return 'Not from a building.';
  const aimed = (act && act.id === A.id && act.actions.some(a => a.type === 'aim')) || alwaysAim(A);
  return aimed ? '' : 'Needs Aimed Shot: Take Aim first.';
}

/* Arcing Fire: a friendly regiment must see the target */
function friendSees(A, T) {
  return all().some(
    o =>
      o.onTable &&
      !o.destroyed &&
      o.side === A.side &&
      o.id !== A.id &&
      o.type !== 'marker' &&
      frontArcHas(o, T) &&
      !tLos(o, T, false) &&
      volleyStands(Object.assign({}, o, { rules: (o.rules || []).concat(['Barrage (1) (99")']) }), T).some(
        v => v.inRange && v.clear
      )
  );
}

function volleyWhy(A, T, arcOverride) {
  const arc = arcOverride != null ? arcOverride : arcingOn(A);
  const vr = volleyRange(A);
  if (!vr) return 'It has no Barrage.';
  /* from a building, Range is measured from any edge of it */
  if (
    !(A.garrison && tGarrisonOf(A)
      ? polyDist(terrPoly(tGarrisonOf(A)), occPoly(T)) <= vr.range + 1e-6
      : standsOf(A).some(st => polyDist(st.poly, occPoly(T)) <= vr.range + 1e-6))
  )
    return (
      (T.short || T.name) +
      ' is out of range (Barrage range ' +
      vr.range +
      '″ from ' +
      (A.garrison ? 'the edge of its building' : 'its stands') +
      ').'
    );
  if (!frontArcHas(A, T)) return (T.short || T.name) + ' is not in its front arc.';
  if (engaged(A).length && engVolley(A) && !engaged(A).some(e => e.id === T.id))
    return 'While engaged it can only volley at a regiment it is fighting.';
  const VS = volleyStands(A, T);
  if (!VS.some(v => v.inRange))
    return (
      (T.short || T.name) +
      ' is out of range of every stand in its firing line (Barrage range ' +
      vr.range +
      '″).'
    );
  if (arc) {
    if (arcingWhy(A)) return 'Arcing Fire: ' + arcingWhy(A);
    if (!VS.some(v => v.inRange && v.arcing))
      return (T.short || T.name) + ' is out of range of every stand with Arcing Fire.';
    if (!VS.some(v => v.inRange && v.arcing && v.clear) && !friendSees(A, T))
      return 'Arcing Fire: no friendly regiment can see ' + (T.short || T.name) + '.';
    return '';
  }
  if (!VS.some(v => v.inRange && v.clear)) {
    const af = !arcingWhy(A);
    return (
      'No clear shot: ' +
      ((VS.find(v => v.blocker) || {}).blocker || 'something') +
      ' is in the way of every stand in range.' +
      (rh(RU(A), 'Arcing Fire')
        ? af
          ? ' Switch on Arcing Fire to shoot over it.'
          : ' Arcing Fire needs Aimed Shot: Take Aim first.'
        : '')
    );
  }
  return '';
}

function volleySummary(VS, arcing) {
  const F = VS.filter(v => !v.none && (!arcing || v.arcing)),
    ok = F.filter(v => v.inRange && (v.clear || arcing)),
    out = F.filter(v => !v.inRange).length,
    blk = F.filter(v => v.inRange && !v.clear && !arcing),
    eff = ok.filter(v => v.eff).length;
  if (!F.length) return '';
  let t =
    ok.length +
    ' of ' +
    F.length +
    ' stand' +
    (F.length === 1 ? '' : 's') +
    ' in its firing line can shoot' +
    (eff ? ' (' + eff + ' in effective range, +1 shot each)' : '');
  const why = [];
  if (out) why.push(out + ' out of range');
  if (blk.length) why.push(blk.length + ' blocked by ' + [...new Set(blk.map(v => v.blocker))].join(', '));
  const arcs = [...new Set(ok.map(v => v.arc))];
  return (
    t +
    (why.length ? '; ' + why.join(', ') : '') +
    '.' +
    (arcs.length > 1 ? ' Stands hit different arcs: ' + arcs.join(' and ') + ', resolved separately.' : '')
  );
}

function volleyArcSpan(A) {
  const R = RU(A);
  if (rh(R, 'Acute Senses') || rh(R, 'Fluid Formation')) return 180;
  if (rh(R, 'Weapon Platform')) return 135;
  return 45;
}

function frontArcHas(u, t) {
  return (
    rh(RU(u), 'Acute Senses') ||
    rh(RU(u), 'Fluid Formation') ||
    (rh(RU(u), 'Weapon Platform') &&
      corners(t)
        .concat([[t.x, t.y]])
        .some(p => arcOf(u, p) !== 'rear')) ||
    corners(t)
      .concat([[t.x, t.y]])
      .some(p => arcOf(u, p) === 'front')
  );
}

function alwaysAim(u) {
  const R = RU(u);
  return rh(R, 'Deadshot') || rh(R, 'Deadshots') || rh(R, 'Aimed Shot');
}

function aimWhy(u) {
  const R = RU(u);
  return rh(R, 'Deadshot') || rh(R, 'Deadshots')
    ? 'Always aiming (Deadshot)'
    : rh(R, 'Aimed Shot')
      ? 'Already aiming (Aimed Shot)'
      : '';
}

function fireVolley() {
  if (!act || !act.cur || act.cur.type !== 'volley') return;
  const t = byId(act.cur.sel);
  if (!t) return;
  const vw = volleyWhy(byId(act.id), t);
  if (vw) {
    toast(vw);
    return;
  }
  act.cur.stage = 'combat';
  act.cur.target = t.id;
  openCombat({ type: 'volley', att: act.id, tgt: t.id, inAct: true });
  render();
}
