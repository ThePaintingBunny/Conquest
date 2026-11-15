/*
 * Built-in opponent: threats
 *
 * Who can reach whom. For any regiment in any pose: which enemies could Charge or Volley it in their next
 * activation, with what chance, into which facing, and what that would cost in points. The same measure, turned
 * around, says how much a pose threatens the enemy.
 *
 * In this file: botInfo(), botArc(), botCtx(), botFree(), botReach(), botChargeNet(), botChargeNet0(),
 *   botVolleyHit(), botExposure(), botPotential()
 */

/* what does not change with a regiment's pose (kept until the next decision) */
function botInfo(u) {
  const k = 'info|' + u.id;
  let v = botCache.get(k);
  if (v) return v;
  const R = RU(u);
  v = {
    M: +u.m || 0,
    fixed: chargeFixed(u),
    max: chargeMax(u),
    arc:
      rh(R, 'Acute Senses') || rh(R, 'Fluid Formation') ? 'all' : rh(R, 'Weapon Platform') ? 'wp' : 'front',
    vr: volleyRange(u),
    corn: null
  };
  botCache.set(k, v);
  return v;
}

/* frontArcHas for a regiment in any pose, with its rules looked up once */
function botArc(A, T) {
  const m = botInfo(A).arc;
  if (m === 'all') return true;
  const P = corners(T).concat([[T.x, T.y]]);
  return m === 'wp' ? P.some(p => arcOf(A, p) !== 'rear') : P.some(p => arcOf(A, p) === 'front');
}

/* the picture at the start of a decision: both armies and who has still to act this round */
function botCtx(side) {
  const me = side || AI,
    U = all().filter(u => u.onTable && !u.destroyed && !isMarker(u)),
    mine = U.filter(u => u.side === me),
    foes = U.filter(u => u.side !== me && u.side !== 'neutral');
  const foeCards = (state.units || []).filter(u => u.side !== me && regCardLive(u) && !u.activated).length;
  return {
    me,
    mine,
    foes,
    markers: all().filter(u => u.onTable && !u.destroyed && isMarker(u) && u.side !== me),
    foeCards,
    zone0: botZoneScore(me),
    share: new Map()
  };
}

/* can this regiment Charge in its next activation (this round if it has not acted, else next round)? */
function botFree(u, thisRound) {
  if (!u || !u.onTable || u.destroyed || isMarker(u) || u.garrison) return false;
  if ((u.effects || []).includes('Broken')) return false;
  if (engaged(u).length) return false;
  if (thisRound && (u.activated || u.arrivedRound === state.round)) return false;
  return true;
}

/* the chance that A reaches T with a Charge in one activation (a March first if needed), and the facing it hits.
   T may be a regiment in a pose it does not hold yet. */
function botReach(A, T) {
  const I = botInfo(A),
    M = I.M,
    fixed = I.fixed,
    max = I.max;
  const dc = Math.hypot(A.x - T.x, A.y - T.y);
  if (dc > M * 2 + (fixed != null ? fixed : 6) + 12) return { p: 0, d: dc };
  const d = polyDist(corners(A), corners(T));
  if (d > M * 2 + (fixed != null ? fixed : 6) + 0.5) return { p: 0, d };
  const inArc = botArc(A, T);
  const face = arcOf(T, [A.x, A.y]);
  const pRoll = need =>
    fixed != null ? (need <= M + fixed + 1e-6 ? 1 : 0) : botP6(Math.ceil(need - M - 1e-6));
  let p = 0,
    march = false;
  if (inArc && d <= max + 1e-6) p = pRoll(d);
  /* March first: a straight March of M if it is in the front arc, less when it must wheel to face */
  const turn = inArc ? 0 : Math.min(1, Math.abs(angDiff(heading(A, T), A.facing || 0)) / 180);
  const eff = Math.max(0, M * (inArc ? 0.9 : 0.75 - 0.35 * turn) - 1);
  const p2 = pRoll(Math.max(0, d - eff));
  if (p2 > p + 0.05) {
    p = p2 * 0.95;
    march = true;
  }
  return { p, d, face, march };
}

/* A charges T in that facing: what T loses and what A loses to T's answer, in points */
function botChargeNet(A, T, face) {
  const k = ['net', A.id, T.id, face, A.wounds || 0, T.wounds || 0].join('|');
  if (botCache.has(k)) return botCache.get(k);
  const r = botChargeNet0(A, T, face);
  botCache.set(k, r);
  return r;
}

function botChargeNet0(A, T, face) {
  const imp = botAttack(A, T, 'impact', { face, charged: true }),
    cl = botAttack(A, T, 'clash', { face, charged: true });
  const dealt = imp.tot + cl.tot,
    gain = botWoundPts(T, dealt);
  const left = botLeftW(T);
  const survive = Math.max(0, 1 - dealt / left);
  const back = botAttack(T, A, 'clash', { face: 'front' });
  const loss = botWoundPts(A, back.tot) * survive * BOT.returnW;
  return { gain, loss, dealt, back: back.tot };
}

/* A volleys T from where A stands: expected points; 0 if it cannot */
function botVolleyHit(A, T, marched) {
  const vr = botInfo(A).vr;
  if (!vr) return 0;
  if (Math.hypot(A.x - T.x, A.y - T.y) > vr.range + (+A.m || 0) + 12) return 0;
  const d = polyDist(corners(A), corners(T));
  const reach = vr.range + (marched ? Math.max(0, (+A.m || 0) * 0.8) : 0);
  if (d > reach + 1e-6) return 0;
  if (!marched && !botArc(A, T)) return 0;
  /* the result hardly depends on the exact spot: key it by the facing hit and short or long range */
  let Ap = { x: A.x, y: A.y, facing: A.facing };
  if (marched) {
    /* after a March: closer if needed, and turned toward the target */
    const h = heading(A, T),
      step = Math.max(0, d - vr.range + 1),
      a = (h * Math.PI) / 180;
    Ap = { x: A.x + Math.sin(a) * step, y: A.y + Math.cos(a) * step, facing: h };
  }
  const r = botAttack(A, T, 'volley', {
    Apose: Ap,
    Tpose: { x: T.x, y: T.y, facing: T.facing },
    key: [
      'v',
      arcOf(T, [Ap.x, Ap.y]),
      Math.max(0, d - (marched ? d - vr.range + 1 : 0)) <= vr.range / 2 ? 's' : 'l'
    ].join(',')
  });
  return botWoundPts(T, r.tot) * (marched ? 0.7 : 1);
}

/* how much u stands to lose at this pose before it acts again: each enemy that can reach it, the chance, the
   cost, and how likely that enemy is to pick u over its other targets */
function botExposure(ctx, u, pose, skip) {
  const U = Object.assign({}, u, pose || {});
  let risk = 0;
  const parts = [];
  ctx.foes.forEach(E => {
    const now = !E.activated && E.arrivedRound !== state.round,
      w = now ? 1 : BOT.futureRisk;
    if (!botFree(E, false) || (skip && skip.has(E.id))) return;
    let best = 0,
      how = '';
    const R = botReach(E, U);
    if (R.p > 0.02) {
      const n = botChargeNet(E, U, R.face);
      const v = R.p * Math.max(0, n.gain - n.loss * 0.6);
      if (v > best) {
        best = v;
        how = 'charge ' + R.face;
      }
    }
    const vh = botVolleyHit(E, U, true);
    if (vh > best) {
      best = vh;
      how = 'volley';
    }
    if (best <= 0) return;
    /* the enemy has other targets: the more there are, the less likely it picks this one */
    let others = ctx.share.get(E.id);
    if (others == null) {
      others = 0;
      ctx.mine.forEach(W => {
        if (W.id === u.id) return;
        const r = botReach(E, W);
        if (r.p > 0.15) others += r.p * botVal(W) * 0.5;
      });
      ctx.share.set(E.id, others);
    }
    const mine = best * 2.5;
    const sh = mine / (mine + others + 40);
    risk += w * best * sh;
    parts.push({ id: E.id, how, v: best, sh });
  });
  return { risk, parts };
}

/* how much this pose threatens the enemy next time (the best single charge or volley) */
function botPotential(ctx, u, pose) {
  const U = Object.assign({}, u, pose || {});
  let best = 0;
  ctx.foes.forEach(T => {
    const R = botReach(U, T);
    if (R.p > 0.05) {
      const n = botChargeNet(U, T, R.face);
      best = Math.max(best, R.p * (n.gain - n.loss));
    }
  });
  ctx.markers.forEach(T => {
    if ((state.round || 1) < 1) return;
    const R = botReach(U, T);
    if (R.p > 0.05) best = Math.max(best, R.p * botVal(T) * 0.5);
  });
  if (botInfo(U).vr)
    ctx.foes.forEach(T => {
      best = Math.max(best, botVolleyHit(U, T, true) * 0.8);
    });
  return best;
}
