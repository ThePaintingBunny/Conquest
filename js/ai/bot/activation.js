/*
 * Built-in opponent: one activation
 *
 * Lists every sensible line for the activating regiment (Charge, March then Charge, March twice, Volley, Aim,
 * Reform, Clash with or without Inspire, Combat Reform, Withdraw, hold), scores where each line leaves it, and
 * returns the first step of the best one. After each step the activation is planned again from the new
 * situation, so a failed Charge or a lucky Volley is taken into account.
 *
 * Score = points gained now + zones won or lost + progress toward zones + threat on the enemy next time
 *         − points the enemy is expected to take from it before it acts again.
 *
 * In this file: botZoneAt(), botProgress(), botCrowd(), botEnd(), botMelee(), botEngagedFuture(),
 *   botChargeLine(), botCharges(), botPlan(), botEnterX(), botNextStep(), botLast, botCommit
 */

/* the zone picture with u in this pose */
function botZoneAt(u, pose, ctx) {
  /* far from every zone, here and where it stands now: nothing changes */
  if (ctx) {
    const G = geom(u),
      reach = Math.hypot(G.w, G.d) / 2 + 0.5,
      near = p => zonesOf().some(z => Math.hypot(z.x - p.x, z.y - p.y) <= z.r + reach);
    if (!near(pose) && !near(byId(u.id) || u)) return ctx.zone0;
  }
  const units = (state.units || []).map(x =>
    x.id === u.id ? Object.assign({}, x, pose, { onTable: true }) : x
  );
  return botSandbox(units, () => botZoneScore(u.side));
}

/* closer to a zone worth taking (one it cannot hold yet), in points */
function botProgress(ctx, u, from, to) {
  if ((u.effects || []).includes('Broken')) return 0;
  /* the army's plan gave it a job: closer to that (a zone, or the enemy regiment it is meant to fight) */
  const job = botObjOf(u);
  if (job) {
    const g = botObjDist(job, from) - botObjDist(job, to);
    /* a zone job: in step with what the zone is worth (a plain 2 VP zone gives the base rate) */
    return BOT.progress * (job.kind === 'zone' ? Math.max(1, job.v / (2 * BOT.vp)) : 0.7) * g;
  }
  const sv = seizeVal(u),
    w = sv > 0 ? 1 : 0.4;
  if (!ctx.zoneTargets)
    ctx.zoneTargets = zoneControl().filter(z => z.friendly !== u.side && z.holder !== u.side);
  const zc = ctx.zoneTargets;
  if (!zc.length) return 0;
  /* spread out: a zone that friends already sit on or head for is worth less to one more regiment */
  const claimed = z =>
    ctx.mine.filter(f => f.id !== u.id && f.onTable && Math.hypot(z.x - f.x, z.y - f.y) <= z.r + 5).length;
  const dz = (z, p) => Math.max(0, Math.hypot(z.x - p.x, z.y - p.y) - z.r);
  return BOT.progress * w * Math.max(...zc.map(z => (dz(z, from) - dz(z, to)) / (1 + claimed(z))));
}

/* where a line leaves the regiment, scored */
/* idle friendly regiments right next to where it ends: a traffic jam blocks charges and marches */
function botCrowd(ctx, u, pose) {
  const U = Object.assign({}, u, pose),
    A = corners(U),
    M = +u.m || 5;
  let n = 0;
  ctx.mine.forEach(f => {
    if (f.id === u.id || !f.onTable || engaged(f).length) return;
    const d = polyDist(A, corners(f));
    if (d < 1.5) n += 1;
    else if (d < 3) n += 0.4;
    /* a friend just in front blocks its March and Charge lanes (and it blocks theirs) */
    if (d < M && arcOf(U, [f.x, f.y]) === 'front') n += 0.5;
    if (d < (+f.m || 5) && arcOf(f, [U.x, U.y]) === 'front') n += 0.5;
  });
  return n;
}

function botEnd(ctx, u, from, pose, engagedEnd, skip) {
  /* flying over Impassable terrain or a regiment is fine, ending there is not */
  if (!engagedEnd && pose && endPoseWhy(u, pose)) return { s: -5000, ex: 0, zd: 0, pot: 0, pr: 0 };
  const ex = botExposure(ctx, u, pose, skip).risk + (engagedEnd ? 0 : botCrowd(ctx, u, pose) * BOT.crowd),
    zd = botZoneAt(u, pose, ctx) - ctx.zone0,
    pot = engagedEnd ? 0 : botPotential(ctx, u, pose) * BOT.potential,
    pr = engagedEnd ? 0 : botProgress(ctx, u, from, pose);
  return { s: zd + pot + pr - ex, ex, zd, pot, pr };
}

/* the fight a Charge starts goes on after this activation: the exchanges still to come */
function botMelee(u, T, face) {
  const k = ['melee', u.id, T.id, face, u.wounds || 0, T.wounds || 0].join('|');
  if (botCache.has(k)) return botCache.get(k);
  const mine = botAttack(u, T, 'clash', { face }).tot,
    theirs = botAttack(T, u, 'clash', { face: 'front' }).tot;
  const v = (botWoundPts(T, mine) - botWoundPts(u, theirs)) * 0.5;
  botCache.set(k, v);
  return v;
}

/* staying in a fight: what the next exchanges are worth (what we deal against what we take) */
function botEngagedFuture(u, pose, eng) {
  let v = 0;
  eng.forEach(E => {
    const mine = botAttack(u, E, 'clash', {
        Apose: pose,
        Tpose: { x: E.x, y: E.y, facing: E.facing }
      }),
      theirs = botAttack(E, u, 'clash', { Apose: { x: E.x, y: E.y, facing: E.facing }, Tpose: pose });
    v += botWoundPts(E, mine.tot) * 0.5 - botWoundPts(u, theirs.tot) * 0.7;
  });
  return v;
}

/* a Charge, scored: c from botCharges; withClash = the Clash follows in this activation; failS = the score if the
   Charge fails (the activation ends where it stands) */
function botChargeLine(ctx, u, from, c, withClash, failS) {
  const T = c.T,
    imp = botAttack(u, T, 'impact', { face: c.face, charged: true });
  let gain, loss;
  if (withClash) {
    const n = botChargeNet(u, T, c.face);
    gain = n.gain;
    /* their answer is counted like any threat they pose: striking first is worth something */
    loss = n.loss * BOT.returnW;
  } else {
    /* Impacts now; the target strikes back before our Clash */
    gain = botWoundPts(T, imp.tot);
    loss = botWoundPts(u, botAttack(T, u, 'clash', { face: 'front' }).tot) * BOT.returnW;
  }
  if (isMarker(T)) gain = botVal(T) * Math.min(1, imp.tot / 3 + (withClash ? 0.5 : 0));
  /* the fight goes on after this activation; but when the target could charge us anyway, that fight comes either
     way, so it only counts for the part we choose ourselves */
  const mel = isMarker(T) ? 0 : botMelee(u, T, c.face) * (1 - Math.min(1, botReach(T, u).p || 0));
  const e = botEnd(ctx, u, from, c.end, true, new Set([T.id]));
  const v = c.p * (gain - loss + mel + e.s) + (1 - c.p) * failS;
  return { v, gain, loss, mel, p: c.p, ex: e.ex, zd: e.zd, fail: failS };
}

/* the Charges open to u from a pose: chance, facing and where it ends. exact = use the Charge planner (slow) */
function botCharges(ctx, u, pose, exact) {
  const U = Object.assign({}, u, pose),
    M = +u.m || 0,
    out = [];
  const R = (state.round || 1) >= 2;
  ctx.foes.concat(R ? ctx.markers : []).forEach(T => {
    const d = polyDist(corners(U), corners(T)),
      max = chargeMaxVs(U, T);
    if (d > max + 0.5 || !botArc(U, T)) return;
    if (fx(T).some(x => /^Prowling/.test(x)) && d >= 8) return;
    let los;
    try {
      los = chargeLos(U, T);
    } catch (e) {
      los = { ok: true };
    }
    if (!los.ok) return;
    let need = d,
      face = arcOf(T, [U.x, U.y]),
      end = null;
    if (exact) {
      let pl;
      try {
        pl = planCharge(U, T, max);
      } catch (e) {
        pl = { ok: false };
      }
      if (!pl.ok) return;
      need = Math.max(d, pl.s || 0);
      face = pl.face || face;
      if (pl.P3) end = { x: pl.P3.x, y: pl.P3.y, facing: pl.P3.facing, files: pl.P3.files };
    }
    if (!end) end = Object.assign(botContact(U, T, face), { files: geom(U).files });
    const fixed = chargeFixed(U);
    let p = fixed != null ? (need <= M + fixed + 1e-6 ? 1 : 0) : botP6(Math.ceil(need - M - 1e-6));
    if (fixed == null && hasRule(U, /^Unstoppable/)) p = 1 - (1 - p) * (1 - p);
    if (!exact) p *= 0.9;
    if (p <= 0.01) return;
    out.push({ T, p, face, end, need });
  });
  return out;
}

/* every line for the activating regiment, best first */
function botPlan(id, ban) {
  const u = byId(id),
    ctx = botCtx(u.side),
    G = geom(u),
    cur = { x: u.x, y: u.y, facing: u.facing || 0, files: G.files };
  ctx.zone0 = botZoneAt(u, cur);
  const AV = availableActions(u),
    avail = t => AV.some(a => a.type === t && !a.why);
  const used = act.actions.filter(a => !a.free).length,
    left = Math.max(0, 2 - used),
    M = +u.m || 0;
  const C = [];
  const key = st => JSON.stringify(st);
  /* the line chosen at the start of this activation: carrying on with it is worth something, so a small change in
     the picture does not turn a March toward one target into a March toward another and waste both actions */
  const next = botCommit && botCommit.act === act && botCommit.rest.length ? key(botCommit.rest[0]) : null;
  const push = (steps, val, why, e, chk) => {
    if (steps.length && ban && ban.has(key(steps[0]))) return;
    const keep = next && steps.length && key(steps[0]) === next ? BOT.commit : 0;
    C.push({ steps, val: val + keep + botNoise(), why: keep ? why + ' (as planned)' : why, e, chk });
  };
  const eng = engaged(u);
  const here = botEnd(ctx, u, cur, cur, eng.length > 0);
  if (!left) return [];
  if (eng.length) {
    const fut = botEngagedFuture(u, cur, eng);
    const stay = here.s + fut;
    eng.forEach(T => {
      const tp = { x: T.x, y: T.y, facing: T.facing };
      if (avail('clash')) {
        const g = botWoundPts(T, botAttack(u, T, 'clash', { Apose: cur, Tpose: tp }).tot);
        push([{ do: 'clash', target: T.id }], g + stay, 'clash ' + (T.short || T.name));
        if (avail('inspire') && left >= 2) {
          const gi = botWoundPts(T, botAttack(u, T, 'clash', { Apose: cur, Tpose: tp, inspired: true }).tot);
          push(
            [{ do: 'inspire' }, { do: 'clash', target: T.id }],
            gi + stay,
            'inspire and clash ' + (T.short || T.name)
          );
        }
      }
    });
    if (avail('creform')) {
      let g = 0;
      eng.forEach(E => {
        const arc = arcOf(u, [E.x, E.y]);
        if (arc === 'front') return;
        const ep = { x: E.x, y: E.y, facing: E.facing };
        const side = botAttack(E, u, 'clash', { Apose: ep, Tpose: cur }).tot,
          front = botAttack(E, u, 'clash', { face: 'front' }).tot;
        g += Math.max(0, botWoundPts(u, side) - botWoundPts(u, front));
      });
      if (g > 0) {
        const T = eng[0];
        push(
          [{ do: 'combat_reform' }, { do: 'clash', target: T.id }],
          g + stay + botWoundPts(T, botAttack(u, T, 'clash', { face: 'front' }).tot) * (left >= 2 ? 1 : 0),
          'turn to face the flank attack'
        );
      }
    }
    if (avail('withdraw')) {
      const back = { x: u.x, y: u.y, facing: ((u.facing || 0) + 180) % 360, files: G.files };
      const amt = fwdLegal(u, back, M, false),
        end = botFwd(back, amt);
      if (amt > 0.5) {
        /* the Withdraw test: a clean one costs D6 wounds, a failed one D6 for each stand in contact, then Morale */
        const Rs = [u.stats && u.stats.R, u.charName && chStatsX(u).R, u.auxStats && u.auxStats.R]
            .map(Number)
            .filter(n => n > 0),
          R = Rs.length ? Math.max(...Rs) : 0,
          pc = Math.max(0, Math.min(1, R / 6)),
          foes = eng.map(e => corners(e)),
          nC = Math.max(1, standsOf(u).filter(s => foes.some(q => polyDist(s.poly, q) <= 0.35)).length),
          mor = Math.max(1, Math.min(5, R)) / 6,
          w = pc * 3.5 + (1 - pc) * 3.5 * nC * (1 + (1 - mor));
        let cost = botWoundPts(u, w);
        if (w >= botLeftW(u)) cost += botVal(u) * 0.5;
        const e2 = botEnd(ctx, u, cur, end, false);
        push([{ do: 'withdraw' }], e2.s - cost, 'withdraw');
      }
    }
    if (avail('crally')) push([{ do: 'combat_rally' }], stay + botVal(u) * 0.15, 'rally in combat');
    push([], stay - 1, 'hold');
  } else {
    const firstMarch = act.entering && !act.actions.some(a => a.type === 'march');
    if (firstMarch) {
      /* an arriving regiment marches straight on first */
      const amt = fwdLegal(u, cur, M, true) || 0,
        p1 = botFwd(cur, amt);
      push([{ do: 'march', mode: 'fwd', amount: 99 }], botEnd(ctx, u, cur, p1, false).s, 'march on');
    } else {
      /* hold */
      push([], here.s, 'hold', here);
      if (avail('rally')) push([{ do: 'rally' }], here.s + botVal(u) * 0.2, 'rally');
      /* Charge now */
      if (avail('charge')) {
        const fail = botEnd(ctx, u, cur, cur, false).s;
        botCharges(ctx, u, cur, true).forEach(c => {
          const r = botChargeLine(ctx, u, cur, c, left >= 2, fail);
          push(
            [{ do: 'charge', target: c.T.id }].concat(left >= 2 ? [{ do: 'clash', target: c.T.id }] : []),
            r.v,
            'charge ' + (c.T.short || c.T.name) + ' (' + c.face + ', ' + Math.round(c.p * 100) + '%)',
            r
          );
        });
      }
      /* Volley now (and Aim first if both actions are free) */
      if (avail('volley'))
        ctx.foes.concat((state.round || 1) >= 2 ? ctx.markers : []).forEach(T => {
          let why = '';
          try {
            why = volleyWhy(u, T, false);
          } catch (e) {
            why = 'x';
          }
          if (why) return;
          const g = botVolleyHit(u, T, false);
          if (g <= 0) return;
          push([{ do: 'volley', target: T.id }], g + here.s, 'volley ' + (T.short || T.name));
          if (left >= 2 && avail('aim'))
            push(
              [{ do: 'aim' }, { do: 'volley', target: T.id }],
              g * 1.3 + here.s,
              'aim and volley ' + (T.short || T.name)
            );
        });
      /* March somewhere, then a second action */
      if (avail('march')) {
        const seen = new Set();
        botDests(ctx, u).forEach(D => {
          const r1 = botMarchSim(u, cur, D, M);
          if (r1.moved < 0.3) return;
          const p1 = r1.pose,
            k = [p1.x, p1.y, p1.facing].map(v => Math.round(v * 2)).join(',');
          if (seen.has(k)) return;
          seen.add(k);
          const st1 = { do: 'march', toward: { x: +D.x.toFixed(2), y: +D.y.toFixed(2) } };
          const e1 = botEnd(ctx, u, cur, p1, false);
          push([st1], e1.s, 'march: ' + D.why, e1);
          if (left < 2) return;
          /* march again */
          const r2 = botMarchSim(u, p1, D, M);
          if (r2.moved > 0.3)
            push([st1, st1], botEnd(ctx, u, cur, r2.pose, false).s, 'march twice: ' + D.why);
          /* march then charge (Impacts only this activation) */
          if (avail('charge') && u.arrivedRound !== state.round && !(u.effects || []).includes('Broken'))
            botCharges(ctx, u, p1, false).forEach(c => {
              const r = botChargeLine(ctx, u, cur, c, false, e1.s);
              push(
                [st1, { do: 'charge', target: c.T.id }],
                r.v,
                'march then charge ' +
                  (c.T.short || c.T.name) +
                  ' (' +
                  c.face +
                  ', ' +
                  Math.round(c.p * 100) +
                  '%)',
                r,
                { pose: p1, tid: c.T.id, again: x => botChargeLine(ctx, u, cur, x, false, e1.s).v }
              );
            });
          /* march then volley */
          if (botInfo(u).vr)
            ctx.foes.forEach(T => {
              const U1 = Object.assign({}, u, p1);
              if (!botArc(U1, T)) return;
              const g = botVolleyHit(U1, T, false);
              if (g > 0)
                push(
                  [st1, { do: 'volley', target: T.id }],
                  g + e1.s,
                  'march then volley ' + (T.short || T.name)
                );
            });
          /* march then turn to face the nearest enemy */
          const nf = ctx.foes
            .slice()
            .sort(
              (a, b) =>
                polyDist(corners(Object.assign({}, u, p1)), corners(a)) -
                polyDist(corners(Object.assign({}, u, p1)), corners(b))
            )[0];
          if (nf) {
            const fac = Math.round(heading(p1, nf));
            const p2 = Object.assign({}, p1, { facing: fac });
            if (Math.abs(angDiff(fac, p1.facing)) > 20 && poseOk(u, p2))
              push(
                [st1, { do: 'reform', face: fac }],
                botEnd(ctx, u, cur, p2, false).s,
                'march and face ' + (nf.short || nf.name)
              );
          }
        });
      }
      /* Reform to face an enemy, then Charge it */
      if (avail('reform'))
        ctx.foes.forEach(T => {
          const fac = Math.round(heading(cur, T));
          if (Math.abs(angDiff(fac, cur.facing)) < 20) return;
          const p1 = Object.assign({}, cur, { facing: fac });
          if (!poseOk(u, p1)) return;
          const e1 = botEnd(ctx, u, cur, p1, false);
          push([{ do: 'reform', face: fac }], e1.s, 'face ' + (T.short || T.name));
          if (left >= 2 && avail('charge'))
            botCharges(ctx, u, p1, false)
              .filter(c => c.T.id === T.id)
              .forEach(c => {
                const r = botChargeLine(ctx, u, cur, c, false, e1.s);
                push(
                  [
                    { do: 'reform', face: fac },
                    { do: 'charge', target: T.id }
                  ],
                  r.v,
                  'turn and charge ' + (T.short || T.name),
                  r,
                  { pose: p1, tid: T.id, again: x => botChargeLine(ctx, u, cur, x, false, e1.s).v }
                );
              });
        });
    }
  }
  C.sort((a, b) => b.val - a.val);
  /* a Charge planned from a pose not held yet was only estimated: check the best ones with the Charge planner */
  for (let k = 0; k < 6 && C.length && C[0].chk; k++) {
    const c0 = C.shift(),
      ex = botCharges(ctx, u, c0.chk.pose, true).find(x => x.T.id === c0.chk.tid);
    if (!ex) continue;
    c0.val = c0.chk.again(ex) + botNoise();
    c0.chk = null;
    c0.why += ' ✓';
    C.push(c0);
    C.sort((a, b) => b.val - a.val);
  }
  return C;
}

/* where an arriving regiment should come on: the x on its own edge with the best line after it */
function botEnterX(u) {
  const ctx = botCtx(u.side),
    M = +u.m || 0,
    xs = new Set([12, 24, 36, 48, 60]);
  ctx.zone0 = botZoneScore(u.side);
  zonesOf().forEach(z => xs.add(Math.round(z.x)));
  ctx.foes.forEach(T => xs.add(Math.round(T.x)));
  let best = null;
  xs.forEach(x => {
    const p0 = botEntryPose(u, x);
    if (!poseOk(u, p0, { offOk: true })) return;
    const amt = fwdLegal(u, p0, M, false) || fwdLegal(u, p0, M, true);
    const p1 = botFwd(p0, amt);
    let s = botEnd(ctx, u, p0, p1, false).s;
    /* the second March toward the most useful place */
    let s2 = -Infinity;
    botDests(ctx, Object.assign({}, u, p1)).forEach(D => {
      const r = botMarchSim(u, p1, D, M);
      s2 = Math.max(s2, botEnd(ctx, u, p0, r.pose, false).s);
    });
    s = Math.max(s, s2) + botNoise();
    if (!best || s > best.s) best = { x, s };
  });
  return best ? best.x : 36;
}

/* the next step for the activating regiment, or null when it is done */
function botNextStep(ban) {
  if (!act) return null;
  if (act.entering && !act.placed) return { do: 'enter', edge: 'own', at: botEnterX(base(act.id)) };
  const L = botPlan(act.id, ban);
  const b = L[0];
  if (!b || !b.steps.length) return null;
  botLast = b;
  if (!PVP()) {
    const u = byId(act.id),
      job = botObjOf(u),
      R0 = (v, k) => (typeof v === 'number' ? Math.round(v) : v);
    botTraceAdd({
      k: 'step',
      id: act.id,
      unit: u && (u.short || u.name),
      at: u && u.onTable ? [+u.x.toFixed(1), +u.y.toFixed(1), Math.round(u.facing || 0)] : null,
      done: act.actions.map(a => a.type),
      job: job ? job.kind + ': ' + job.name : null,
      chose: b.why,
      options: L.slice(0, 6).map(c => ({
        v: Math.round(c.val),
        why: c.why,
        steps: c.steps.map(s => s.do).join('+'),
        parts: c.e ? JSON.parse(JSON.stringify(c.e, R0)) : undefined
      }))
    });
  }
  /* remember the rest of the line; a new line only when this one is done or no longer on offer */
  if (!(
    botCommit &&
    botCommit.act === act &&
    botCommit.rest.length &&
    JSON.stringify(b.steps[0]) === JSON.stringify(botCommit.rest[0])
  ))
    botCommit = { act, rest: b.steps.slice(1), why: b.why };
  else botCommit.rest = botCommit.rest.slice(1);
  if (window.__botDbg)
    window.__botDbg.push({
      id: act.id,
      r: state.round,
      n: b.steps.length,
      top: L.slice(0, 4).map(
        c =>
          Math.round(c.val) +
          ' ' +
          c.why +
          (c.e ? ' ' + JSON.stringify(c.e, (k, v) => (typeof v === 'number' ? Math.round(v) : v)) : '')
      )
    });
  return b.steps[0];
}

let botLast = null,
  botCommit = null;
