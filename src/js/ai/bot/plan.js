/*
 * Built-in opponent: the army's plan for the round
 *
 * Before its regiments act, the built-in opponent decides what each one is for this round:
 *   - an objective zone to take or hold;
 *   - an enemy regiment to fight;
 *   - a flanking move: a fast regiment goes around an enemy regiment to charge its flank or rear;
 *   - a guard: standing beside a friend that is fighting or about to, on the side an enemy could charge its flank from;
 *   - a lane: holding open ground with no objective at the left, centre or right of the table, so the line is wide
 *     and the enemy has to spread out too.
 * All regiments are planned together (the assignment method), so
 * they spread over the table instead of all heading for the nearest prize, and a zone or target only gets as many
 * regiments as it needs. Regiments still in reserve count too, so the ones on the table leave them a job.
 *
 * The plan is kept for the round (a regiment keeps its job unless the picture changes: a regiment arrives, falls,
 * or a zone changes hands), and last round's job is preferred, so the army does not change its mind every turn.
 *
 * In this file: botPlanObj, botObjOf(), botObjPoint(), botObjDist(), botObjList(), botObjVal(),
 *   botObjPlan()
 */

let botPlanObj = null;

/* the job a regiment has this round, or null */
function botObjOf(u) {
  if (!u || !u.side) return null;
  const P = botObjPlan(u.side);
  return (P && P.map[u.id]) || null;
}

/* the spot a flanking, guarding or lane job aims for, worked out from where things stand now (p: the regiment) */
function botObjPoint(o, p) {
  if (o.kind === 'lane') return { x: o.x, y: o.y };
  const T = byId(o.id);
  if (!T || !T.onTable) return null;
  const G = geom(T),
    a = ((T.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)],
    r = [Math.cos(a), -Math.sin(a)];
  if (o.kind === 'flank') {
    /* well out to the side of its front, level with its rear: from there a Charge lands in a flank or the rear */
    const off = G.w / 2 + 4,
      back = G.d / 2 + 1;
    const P = [1, -1].map(sg => ({
      x: T.x + r[0] * off * sg - f[0] * back,
      y: T.y + r[1] * off * sg - f[1] * back
    }));
    const ok = P.filter(q => q.x > 1 && q.x < 71 && q.y > 1 && q.y < 47);
    const L = ok.length ? ok : P;
    return L.sort((A, B) => Math.hypot(A.x - p.x, A.y - p.y) - Math.hypot(B.x - p.x, B.y - p.y))[0];
  }
  if (o.kind === 'guard') {
    /* next to the friend, on the side the threat is (or the side nearest us) */
    const E = o.threat && byId(o.threat);
    const side = E ? Math.sign((E.x - T.x) * r[0] + (E.y - T.y) * r[1]) || 1 : 1;
    /* about a regiment's half-width plus a 1″ gap: side by side, not touching */
    const off = G.w / 2 + 4;
    return { x: T.x + r[0] * off * side, y: T.y + r[1] * off * side };
  }
  return null;
}

/* how far a regiment at p is from an objective: the edge of a zone, the enemy regiment itself, or the spot */
function botObjDist(o, p) {
  if (o.kind === 'zone') return Math.max(0, Math.hypot(o.x - p.x, o.y - p.y) - o.r);
  if (o.kind === 'flank' || o.kind === 'guard' || o.kind === 'lane') {
    const q = botObjPoint(o, p);
    return q ? Math.max(0, Math.hypot(q.x - p.x, q.y - p.y) - 1) : 0;
  }
  const T = byId(o.id);
  if (!T) return 0;
  return Math.max(0, Math.hypot(T.x - p.x, T.y - p.y) - 2);
}

/* the objectives on offer: every zone, and every enemy regiment on the table */
function botObjList(side) {
  const out = [];
  zoneControl().forEach(z => {
    const w = botZoneW(z);
    /* a zone held by the enemy is worth twice (they lose it, we gain it); one we hold needs keeping */
    const v = w * (z.holder && z.holder !== side ? 1.6 : z.holder === side ? 1.1 : 1.3);
    out.push({
      kind: 'zone',
      key: 'z:' + z.name,
      name: z.name,
      x: z.x,
      y: z.y,
      r: z.r,
      v,
      cap: z.r >= 6 ? 3 : 2
    });
  });
  all()
    .filter(u => u.onTable && !u.destroyed && !isMarker(u) && u.side !== side && u.side !== 'neutral')
    .forEach(E =>
      out.push({
        kind: 'foe',
        key: 'f:' + E.id,
        id: E.id,
        name: E.short || E.name,
        x: E.x,
        y: E.y,
        v: 0,
        cap: 2
      })
    );
  all()
    .filter(u => u.onTable && !u.destroyed && isMarker(u) && u.side !== side)
    .forEach(M =>
      out.push({
        kind: 'foe',
        key: 'm:' + M.id,
        id: M.id,
        name: M.short || M.name,
        x: M.x,
        y: M.y,
        v: 0,
        cap: 1
      })
    );
  const foes = all().filter(
    u => u.onTable && !u.destroyed && !isMarker(u) && u.side !== side && u.side !== 'neutral'
  );
  /* flanking moves: around each enemy regiment that is not already fighting on both flanks */
  foes.forEach(E =>
    out.push({ kind: 'flank', key: 'fl:' + E.id, id: E.id, name: 'flank of ' + (E.short || E.name), cap: 1 })
  );
  /* guards: friends that fight or are about to, with an enemy able to reach their flank */
  const friends = all().filter(u => u.side === side && u.onTable && !u.destroyed && !isMarker(u));
  friends.forEach(F => {
    const near = foes.filter(E => polyDist(corners(E), corners(F)) < 12);
    if (!engaged(F).length && !near.length) return;
    let best = null;
    foes.forEach(E => {
      if (engaged(E).length) return;
      const p = botReach(E, F).p || 0;
      if (p < 0.15) return;
      const n = botChargeNet(E, F, 'flank'),
        v = p * n.gain;
      if (!best || v > best.v) best = { E, v };
    });
    if (best && best.v > 20)
      out.push({
        kind: 'guard',
        key: 'g:' + F.id,
        id: F.id,
        threat: best.E.id,
        name: 'guard ' + (F.short || F.name),
        v: best.v * 0.6,
        cap: 1
      });
  });
  /* lanes: open ground left, centre and right on our side of the middle, where no zone is close */
  if ((state.round || 1) >= 2) {
    const y = ownEntry(side, 2).y < 24 ? 18 : 30;
    [10, 36, 62].forEach(x => {
      if (zonesOf().some(z => Math.hypot(z.x - x, z.y - y) < z.r + 8)) return;
      out.push({
        kind: 'lane',
        key: 'l:' + x,
        x,
        y,
        name: x < 24 ? 'left lane' : x > 48 ? 'right lane' : 'centre lane',
        v: 30,
        cap: 1
      });
    });
  }
  return out;
}

/* what regiment u is worth to objective o, in points (before travel) */
function botObjVal(u, o, cur) {
  if (o.kind === 'zone') {
    const sv = seizeVal(u);
    /* a regiment that cannot seize (Light) still contests a zone a little, by keeping the enemy off it */
    return o.v * (sv > 0 ? Math.min(1.5, 0.6 + 0.2 * sv * (+u.stands || 1)) : 0.25);
  }
  if (o.kind === 'lane') return o.v;
  /* shooters (and war engines) shoot: they do not go round flanks or stand guard */
  const shooter = ((botInfo(u).vr || {}).range || 0) > 12;
  if (o.kind === 'guard') return o.id === u.id || shooter ? 0 : o.v;
  const T = byId(o.id);
  if (!T) return 0;
  if (o.kind === 'flank') {
    /* only for the fast: what a flank Charge gains over one into its front */
    const fast =
      (+u.m || 0) >= 7 || /Cavalry|Light|Chariot/.test(u.cls || '') || /Cavalry|Chariot/.test(u.type || '');
    if (!fast || shooter || isMarker(T)) return 0;
    const fl = botChargeNet(u, T, 'flank'),
      fr = botChargeNet(u, T, 'front');
    const v = fl.gain - fl.loss;
    return v > fr.gain - fr.loss + 15 ? v * 0.9 : 0;
  }
  if (isMarker(T)) return botVal(T) * 0.6;
  /* the fight we would pick: what we deal against what it deals back, charging its front (the worst case) */
  const n = botChargeNet(u, T, 'front');
  const v = n.gain - n.loss;
  /* already fighting it: the job is that fight */
  return cur ? Math.max(v, 1) * 1.5 + 60 : v;
}

/* the plan for this round; computed again when the picture changes */
function botObjPlan(side) {
  if (!state || !side) return null;
  const mine = (state.units || []).filter(u => u.side === side && !u.destroyed && !isMarker(u));
  const key = [
    state.round,
    mine.map(u => u.id + (u.onTable ? '' : '-')).join(','),
    all()
      .filter(u => u.side !== side && u.onTable && !u.destroyed)
      .map(u => u.id)
      .join(','),
    zoneControl()
      .map(z => z.holder || '')
      .join(',')
  ].join('|');
  if (botPlanObj && botPlanObj.side === side && botPlanObj.key === key) return botPlanObj;
  const prev = botPlanObj && botPlanObj.side === side ? botPlanObj.map : {};
  const objs = botObjList(side);
  const rows = mine.filter(u => !(u.effects || []).includes('Broken'));
  const slots = [];
  objs.forEach(o => {
    for (let k = 0; k < o.cap; k++) slots.push({ o, k });
  });
  const n = Math.max(rows.length, slots.length + rows.length);
  /* score of regiment i in slot j: worth / (1 + rounds to get there), less for a second and third regiment */
  const score = (u, s) => {
    const o = s.o,
      M = Math.max(3, +u.m || 5);
    let p = u.onTable ? { x: u.x, y: u.y } : Object.assign({ x: o.x }, ownEntry(u.side, 2));
    const eng = u.onTable ? engaged(u).map(e => e.id) : [];
    if (eng.length && !(o.kind === 'foe' && eng.includes(o.id))) return -1e3;
    const cur = o.kind === 'foe' && eng.includes(o.id);
    const d = botObjDist(o, p),
      wait = u.onTable ? 0 : /Heavy/.test(u.cls || '') ? 2 : 1,
      t = d / (2 * M) + wait;
    let v = botObjVal(u, o, cur) / (1 + t);
    v *= [1, 0.6, 0.35][s.k] || 0.3;
    /* keep last round's job unless something better turns up */
    if (prev[u.id] && prev[u.id].key === o.key) v += 25;
    return v;
  };
  const cost = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      const u = rows[i],
        s = slots[j];
      if (!u || !s) return 0;
      const v = score(u, s);
      return v > 0 ? -v : 0;
    })
  );
  const col = n ? botAssign(cost) : [];
  const map = {};
  rows.forEach((u, i) => {
    const s = slots[col[i]];
    if (s && cost[i][col[i]] < 0) map[u.id] = s.o;
  });
  botPlanObj = { side, key, map };
  if (!PVP())
    botTraceAdd({
      k: 'plan',
      side,
      jobs: rows.map((u, i) => {
        const o = map[u.id];
        return {
          unit: u.short || u.name,
          id: u.id,
          on: !!u.onTable,
          job: o ? o.kind + ': ' + o.name : null,
          score: o ? Math.round(-cost[i][col[i]]) : 0
        };
      })
    });
  return botPlanObj;
}
