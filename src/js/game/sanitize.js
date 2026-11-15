/*
 * State checks on every save
 *
 * Runs before every save: keeps contact, cannot-be-Broken rules, first-time triggers and Reinforcement
 * Lines consistent.
 *
 * In this file: contactKeep(), sanitize()
 */

/* ---- state sanity on every save: cannot-be-Broken, first-time triggers, Reinforcement Lines ---- */
/* casualties come off the back: keep the front edge where it was, then "Press the Attack" with any regiment the losses left stranded */
function contactKeep(old, st) {
  if (!old || !Array.isArray(old.units) || old === st) return;
  const O = new Map(old.units.map(u => [u.id, u])),
    onT = u => !!u && u.onTable && !u.destroyed && u.type !== 'marker';
  const same = (a, b) => a.x === b.x && a.y === b.y && (a.facing || 0) === (b.facing || 0);
  const posed = u => (act && act.id === u.id && act.pose ? Object.assign({}, u, act.pose) : u);
  const fwd = fc => {
    const a = ((fc || 0) * Math.PI) / 180;
    return [Math.sin(a), Math.cos(a)];
  };
  const shrunk = new Set();
  st.units = st.units.map(u => {
    const o = O.get(u.id);
    if (!onT(u) || !onT(o) || !same(u, o) || (u.files || 1) !== (o.files || 1)) return u;
    const n0 = live(o),
      n1 = live(u);
    if (n0 === n1) return u;
    if (n1 < n0) shrunk.add(u.id);
    /* surviving stands stay exactly where they stood: move the regiment's centre by their average displacement */
    const shift = (A, B) => {
      const ca = new Map(standsOf(A).map(x => [x.tok, x.poly])),
        cen = P => [P.reduce((a, p) => a + p[0], 0) / P.length, P.reduce((a, p) => a + p[1], 0) / P.length];
      let dx = 0,
        dy = 0,
        m = 0;
      const D = [];
      standsOf(B).forEach(x => {
        const P = ca.get(x.tok);
        if (!P) return;
        const a = cen(P),
          b = cen(x.poly);
        D.push([a[0] - b[0], a[1] - b[1]]);
      });
      if (!D.length) return [0, 0];
      /* keep as many stands as possible exactly where they were; the rest close up */
      let best = D[0],
        bn = -1;
      D.forEach(d => {
        const n = D.filter(e => Math.hypot(e[0] - d[0], e[1] - d[1]) < 0.05).length;
        if (n > bn || (n === bn && Math.hypot(...d) < Math.hypot(...best))) {
          bn = n;
          best = d;
        }
      });
      return best;
    };
    const [dx, dy] = shift(o, u);
    if (act && act.id === u.id && act.pose && act.pose.x != null) {
      const [px, py] = shift(Object.assign({}, o, act.pose), Object.assign({}, u, act.pose));
      act.pose.x += px;
      act.pose.y += py;
    }
    if (Math.abs(dx) + Math.abs(dy) < 1e-9) return u;
    return Object.assign({}, u, { x: u.x + dx, y: u.y + dy });
  });
  if (!shrunk.size) return;
  const P = st.units,
    byI = new Map(P.map(u => [u.id, u]));
  const near = (a, list) =>
    list.filter(e => onT(e) && e.side !== a.side && polyDist(corners(posed(a)), corners(posed(e))) <= 0.3);
  const prevEng = new Map();
  old.units.forEach(o => {
    if (onT(o))
      prevEng.set(
        o.id,
        near(o, old.units).map(e => e.id)
      );
  });
  for (let i = 0; i < P.length; i++) {
    const u = P[i],
      o = O.get(u.id);
    if (!onT(u) || !onT(o) || !same(u, o)) continue;
    const was = (prevEng.get(u.id) || []).map(id => byI.get(id)).filter(e => onT(e));
    if (!was.length || !was.some(e => shrunk.has(e.id))) continue;
    if (near(u, P).length) continue;
    for (const E of was.filter(e => shrunk.has(e.id))) {
      const U = posed(u),
        cp = closestPts(corners(U), corners(posed(E)));
      if (!cp || !(cp[0] > 0.3) || cp[0] > 8) continue;
      const s2 = (cp[0] - 0.1) / cp[0],
        dx = (cp[2][0] - cp[1][0]) * s2,
        dy = (cp[2][1] - cp[1][1]) * s2,
        moved = Object.assign({}, U, { x: U.x + dx, y: U.y + dy });
      if (P.some(x => x.id !== u.id && onT(x) && polyDist(corners(moved), corners(posed(x))) <= 0.01))
        continue;
      if (act && act.id === u.id && act.pose && act.pose.x != null) {
        act.pose.x += dx;
        act.pose.y += dy;
      }
      P[i] = Object.assign({}, u, { x: u.x + dx, y: u.y + dy });
      byI.set(u.id, P[i]);
      st.pressNote = (st.pressNote || []).concat([
        (u.short || u.name) +
          ' presses the attack on ' +
          (E.short || E.name) +
          ' (' +
          Math.round(cp[0] * 10) / 10 +
          '″)'
      ]);
      break;
    }
  }
  if (st.pressNote && st.pressNote.length) {
    const t = st.pressNote.join('; ');
    delete st.pressNote;
    setTimeout(() => toast('Press the Attack: ' + t + '.'), 60);
  }
}

function sanitize(st) {
  if (!st || !Array.isArray(st.units) || (st.mode === 'test' && false)) return st;
  const keep = state;
  state = st;
  try {
    try {
      if (!st._undo) breakCheck(keep, st);
      delete st._undo;
    } catch (e) {
      console.error(e);
    }
    supParagon(st);
    st.units = st.units.map(u => {
      if (u.type === 'marker') return u;
      let y = u;
      if (
        (y.effects || []).includes('Broken') &&
        ((rh(y.rules, 'In the Fold') && srAllMods(y, /Origami/)) ||
          rh(y.rules, 'Life for Glory') ||
          hasGrant(y, 'Awakened') ||
          srHas(y, /^Cannot be Broken/))
      )
        y = Object.assign({}, y, { effects: y.effects.filter(e => e !== 'Broken') });
      if ((y.effects || []).includes('Broken') && !y.fawnUsed && INF_(y) && itemFlag(y, 'fawn'))
        y = Object.assign({}, y, { fawnUsed: true, effects: y.effects.filter(e => e !== 'Broken') });
      if (
        (rh(y.rules, 'Shattered Perfection') || rh(y.rules, 'Raging Elements')) &&
        !y.belowOnce &&
        belowStart(y)
      )
        y = Object.assign({}, y, { belowOnce: true });
      if (
        rh(y.rules, 'Prowl') &&
        y.onTable &&
        y.prowlLost !== (st.round || 1) &&
        st.units.some(
          e =>
            e.side !== y.side &&
            e.onTable &&
            !e.destroyed &&
            e.type !== 'marker' &&
            polyDist(corners(e), corners(y)) < 8 - 1e-6 &&
            !tLos(e, y)
        )
      )
        y = Object.assign({}, y, { prowlLost: st.round || 1 });
      if (y.onTable && !y.destroyed && itemFlag(y, 'awake') && !hasGrant(y, 'Awakened'))
        y = grantU(y, 'Awakened', awakenRules(y));
      if (rh(y.rules, 'Gorged') && !y.gorged) {
        if ((y.wounds || 0) > 0 && !y.wasHurt) y = Object.assign({}, y, { wasHurt: true });
        else if (y.wasHurt && (y.wounds || 0) === 0 && !y.destroyed)
          y = Object.assign({}, y, { gorged: true });
      }
      return y;
    });
    try {
      contactKeep(keep, st);
    } catch (e) {
      console.error(e);
    }
    if (
      st.rlStart &&
      st.mode !== 'test' &&
      ['activations', 'picks', 'choose', 'supdecl', 'supremacy'].includes(st.step || 'activations')
    )
      st.rl = {
        cs: rlCompute('cs', st.units, st.rlStart.cs),
        nord: rlCompute('nord', st.units, st.rlStart.nord)
      };
  } catch (e) {
  } finally {
    state = keep;
  }
  return st;
}
