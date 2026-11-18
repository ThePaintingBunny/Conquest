/*
 * Built-in opponent: the Command Stack
 *
 * Orders the cards by what acting early is worth, in points, not by how threatened a regiment is:
 *   - saved: how much of the risk it faces it can remove by acting before the enemy (moving out of reach,
 *     turning to face, striking first in a fight). A cheap regiment that cannot escape saves nothing, so it goes
 *     late and is left as the sacrifice.
 *   - chance: an attack open to it now that the enemy may take away by acting first.
 *   - react: going late lets a quiet regiment answer what the enemy did.
 * Each regiment gets a value for every slot (how many enemy activations come before it), and the order with the
 * best total is found exactly (the assignment method). A character goes just before its own regiment, so the
 * regiment acts straight after as its Entourage.
 *
 * In this file: botOutlook(), botAssign(), botSlotVal(), botPlanRound(), botStackWhy
 */

/* what acting early is worth for one regiment */
function botOutlook(ctx, u) {
  const val = botVal(u);
  if (!u.onTable) return { saved: 0, chance: 0, react: 0.03 * val, why: 'arriving' };
  const cur = { x: u.x, y: u.y, facing: u.facing || 0, files: geom(u).files },
    M = +u.m || 0;
  ctx.zone0 = botZoneAt(u, cur);
  const eng = engaged(u);
  if (eng.length) {
    let saved = 0,
      chance = 0;
    eng.forEach(E => {
      const ep = { x: E.x, y: E.y, facing: E.facing };
      const mine = botAttack(u, E, 'clash', { Apose: cur, Tpose: ep, inspired: true }).tot,
        theirs = botAttack(E, u, 'clash', { Apose: ep, Tpose: cur }).tot;
      /* striking first removes stands before they strike back */
      saved += botWoundPts(u, theirs) * Math.min(1, mine / botLeftW(E));
      chance += botWoundPts(E, mine) * 0.15;
    });
    return { saved, chance, react: 0, why: 'in a fight' };
  }
  const risk = botExposure(ctx, u, cur).risk;
  let safe = risk,
    calm = botEnd(ctx, u, cur, cur, false).s,
    strike = -Infinity;
  if (!(u.arrivedRound === state.round)) {
    botCharges(ctx, u, cur, false).forEach(c => {
      const n = botChargeNet(u, c.T, c.face);
      const e = botEnd(ctx, u, cur, c.end, true);
      strike = Math.max(strike, c.p * (n.gain - n.loss + e.s) + (1 - c.p) * calm);
    });
  }
  if (botInfo(u).vr)
    ctx.foes.forEach(T => {
      const g = botVolleyHit(u, T, true);
      if (g > 0) strike = Math.max(strike, g + calm * 0.5);
    });
  botDests(ctx, u).forEach(D => {
    const r1 = botMarchSim(u, cur, D, M);
    if (r1.moved < 0.3) return;
    const r2 = botMarchSim(u, r1.pose, D, M);
    [r1.pose, r2.pose].forEach(p => {
      const e = botEnd(ctx, u, cur, p, false);
      safe = Math.min(safe, e.ex);
      calm = Math.max(calm, e.s);
      botCharges(ctx, u, p, false).forEach(c => {
        if (p !== r1.pose || u.arrivedRound === state.round) return;
        const imp = botAttack(u, c.T, 'impact', { face: c.face, charged: true });
        strike = Math.max(strike, c.p * botWoundPts(c.T, imp.tot) + e.s);
      });
    });
  });
  const saved = Math.max(0, risk - safe),
    chance = Math.max(0, strike - calm),
    urgent = Math.min(1, (saved + chance) / Math.max(60, val * 0.3));
  return { saved, chance, react: 0.05 * val * (1 - urgent), why: '' };
}

/* the assignment method (Hungarian): rows to columns at the least total cost; returns the column of each row */
function botAssign(cost) {
  const n = cost.length,
    INF = 1e18,
    u = new Array(n + 1).fill(0),
    v = new Array(n + 1).fill(0),
    p = new Array(n + 1).fill(0),
    way = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(n + 1).fill(INF),
      used = new Array(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF,
        j1 = 0;
      for (let j = 1; j <= n; j++)
        if (!used[j]) {
          const c = cost[i0 - 1][j - 1] - u[i0] - v[j];
          if (c < minv[j]) {
            minv[j] = c;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  const col = new Array(n);
  for (let j = 1; j <= n; j++) if (p[j]) col[p[j] - 1] = j - 1;
  return col;
}

/* the worth of an item in slot k; first: do we act before the enemy's first card */
function botSlotVal(o, k, n, foeCards, first) {
  const e = k + (first ? 0 : 1),
    frac = Math.min(1, e / Math.max(1, foeCards));
  return -o.saved * frac - o.chance * (1 - Math.pow(1 - BOT.lost, e)) + (o.react * k) / Math.max(1, n - 1);
}

function botPlanRound() {
  botCacheReset();
  const cards = defaultStack(),
    ctx = botCtx(AI);
  /* items: a character and its own regiment go together (the Entourage), everything else alone */
  const items = [],
    taken = new Set();
  cards.forEach((c, i) => {
    if (taken.has(i)) return;
    const id = c.slice(2),
      u = byId(id);
    if (c[0] === 'c') {
      const j = cards.findIndex((d, k) => !taken.has(k) && k !== i && d === 'u:' + id);
      if (j >= 0 && u && !noEntourage(u)) {
        taken.add(j);
        items.push({ cards: [c, cards[j]], u });
      } else items.push({ cards: [c], u, charOnly: true });
    } else items.push({ cards: [c], u });
    taken.add(i);
  });
  items.forEach(it => {
    try {
      it.o = it.u ? botOutlook(ctx, it.u) : { saved: 0, chance: 0, react: 0 };
    } catch (e) {
      console.error(e);
      it.o = { saved: 0, chance: 0, react: 0 };
    }
    if (it.charOnly) it.o = { saved: 0, chance: it.o.chance * 0.3, react: it.o.react };
    const z = botNoise(10);
    it.o.chance = Math.max(0, it.o.chance + z);
  });
  const n = items.length;
  const solve = first => {
    const cost = items.map(it =>
      Array.from({ length: n }, (_, k) => -botSlotVal(it.o, k, n, ctx.foeCards, first))
    );
    const col = n ? botAssign(cost) : [];
    let tot = 0;
    const order = new Array(n);
    items.forEach((it, i) => {
      order[col[i]] = it;
      tot -= cost[i][col[i]];
    });
    return { order, tot };
  };
  const A = solve(true),
    B = solve(false);
  const best = A.tot >= B.tot - 5 ? A : B;
  const stack = [];
  best.order.forEach(it => it && it.cards.forEach(c => stack.push(c)));
  cards.forEach(c => {
    if (!stack.includes(c)) stack.push(c);
  });
  const top = best.order.slice(0, 2).filter(Boolean);
  const say = top.length
    ? 'Opening with ' +
      top.map(it => (it.u ? it.u.short || it.u.name : '?')).join(', then ') +
      '; ' +
      (A.tot >= B.tot - 5 ? 'wants to go first.' : 'happy to let the enemy move first.')
    : '';
  aiLastPlanBy = '';
  botStackWhy = best.order.filter(Boolean).map(it => ({
    id: it.u && it.u.id,
    saved: Math.round(it.o.saved),
    chance: Math.round(it.o.chance),
    react: Math.round(it.o.react)
  }));
  if (!PVP())
    botTraceAdd({
      k: 'stack',
      first: A.tot >= B.tot - 5,
      scoreFirst: Math.round(A.tot),
      scoreSecond: Math.round(B.tot),
      order: best.order.filter(Boolean).map(it => ({
        cards: it.cards,
        unit: it.u && (it.u.short || it.u.name),
        saved: Math.round(it.o.saved),
        chance: Math.round(it.o.chance),
        react: Math.round(it.o.react),
        why: it.o.why || undefined
      }))
    });
  return { stack, first: A.tot >= B.tot - 5, effects: [], intent: say, faction: [] };
}

let botStackWhy = [];
