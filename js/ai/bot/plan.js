/*
 * Built-in opponent: the army's plan for the round
 *
 * Before its regiments act, the built-in opponent decides what each one is for this round: an objective zone to
 * take or hold, or an enemy regiment to go after. All regiments are planned together (the assignment method), so
 * they spread over the table instead of all heading for the nearest prize, and a zone or target only gets as many
 * regiments as it needs. Regiments still in reserve count too, so the ones on the table leave them a job.
 *
 * The plan is kept for the round (a regiment keeps its job unless the picture changes: a regiment arrives, falls,
 * or a zone changes hands), and last round's job is preferred, so the army does not change its mind every turn.
 *
 * In this file: botPlanObj, botObjOf(), botObjDist(), botObjList(), botObjVal(), botObjPlan()
 */

let botPlanObj = null;

/* the job a regiment has this round, or null */
function botObjOf(u) {
  if (!u || !u.side) return null;
  const P = botObjPlan(u.side);
  return (P && P.map[u.id]) || null;
}

/* how far a regiment at p is from an objective: the edge of a zone, or the enemy regiment itself */
function botObjDist(o, p) {
  if (o.kind === 'zone') return Math.max(0, Math.hypot(o.x - p.x, o.y - p.y) - o.r);
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
  return out;
}

/* what regiment u is worth to objective o, in points (before travel) */
function botObjVal(u, o, cur) {
  if (o.kind === 'zone') {
    const sv = seizeVal(u);
    /* a regiment that cannot seize (Light) still contests a zone a little, by keeping the enemy off it */
    return o.v * (sv > 0 ? Math.min(1.5, 0.6 + 0.2 * sv * (+u.stands || 1)) : 0.25);
  }
  const T = byId(o.id);
  if (!T) return 0;
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
  return botPlanObj;
}
