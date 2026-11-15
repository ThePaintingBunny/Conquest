/*
 * Moving the active regiment
 *
 * Applies a dragged position, a turn or a formation change to the regiment being activated.
 *
 * In this file: setPose(), rot(), form()
 */

function setPose(p) {
  if (!act) return;
  if (act.entering && !act.placed) {
    const G = geom(Object.assign({}, base(act.id), act.pose));
    if ((act.edge || 'own') === 'own')
      act.pose.x = Math.max(G.w / 2, Math.min(72 - G.w / 2, p.x ?? act.pose.x));
    else {
      const { lo, hi } = sideBand(base(act.id).side, G.w);
      act.pose.y = Math.max(lo, Math.min(hi, p.y ?? act.pose.y));
    }
    render();
    return;
  }
  const c = act.cur;
  if (!c) return;
  if (c.type === 'charge') {
    if (c.stage !== 'adjust') return;
    const G = geom(byId(act.id));
    const vx = (p.x ?? act.pose.x) - c.e[0],
      vy = (p.y ?? act.pose.y) - c.e[1];
    const lim = Math.max(c.half, c.half + G.w / 2 - G.sw),
      off = Math.max(-lim, Math.min(lim, vx * c.along[0] + vy * c.along[1]));
    Object.assign(act.pose, {
      x: c.e[0] + (c.n[0] * G.d) / 2 + c.along[0] * off,
      y: c.e[1] + (c.n[1] * G.d) / 2 + c.along[1] * off
    });
    render();
    return;
  }
  if ((c.type === 'march' || c.withdraw) && c.segs) {
    marchDrag(p);
    return;
  }
  const cand = Object.assign({}, act.pose, p);
  if (c.moving) {
    let k = curCost(cand);
    if (k.cost > c.budget + 1e-6) {
      let lo = 0,
        hi = 1;
      for (let i = 0; i < 20; i++) {
        const m = (lo + hi) / 2,
          t = {
            x: c.start.x + (cand.x - c.start.x) * m,
            y: c.start.y + (cand.y - c.start.y) * m,
            facing: cand.facing
          };
        if (curCost(t).cost <= c.budget) lo = m;
        else hi = m;
      }
      cand.x = c.start.x + (cand.x - c.start.x) * lo;
      cand.y = c.start.y + (cand.y - c.start.y) * lo;
      if (curCost(cand).cost > c.budget + 1e-6) {
        toast('Not enough movement left for that.');
        return;
      }
    }
  } else if (c.type === 'creform') {
    Object.assign(act.pose, cand);
    render();
    return;
  } else if (c.reshape) {
    cand.x = c.start.x;
    cand.y = c.start.y;
  }
  Object.assign(act.pose, cand);
  render();
}

function rot(dg) {
  if (!act || !act.cur || !(act.cur.moving || act.cur.reshape)) return;
  if ((act.cur.type === 'march' || act.cur.withdraw) && act.cur.segs) {
    if (Math.abs(dg) >= 180) {
      toast('Turning around is a Reform, not a March.');
      return;
    }
    marchApply(dg > 0 ? 'wright' : 'wleft', Math.abs(dg));
    return;
  }
  if (act.cur.type === 'hammer') {
    toast('Hammer and Anvil cannot change ranks or files.');
  }
  const nf = ((((act.pose.facing || 0) + dg) % 360) + 360) % 360;
  if (act.cur.reshape) {
    const d = Math.abs(((((nf - act.cur.start.facing) % 360) + 540) % 360) - 180);
    if (d > 180) {
      toast('A Reform turns at most 180°.');
      return;
    }
  }
  setPose({ facing: nf });
}

function form(dl) {
  if (!act || !act.cur || !act.cur.reshape) return;
  if (act.cur.type === 'hammer') {
    toast('Hammer and Anvil cannot change ranks or files.');
    return;
  }
  const u = byId(act.id);
  let f = Math.max(1, Math.min(u.stands, geom(u).files + dl));
  if (act.cur.type === 'fluid' && f > 3) {
    toast('Fluid Formation keeps the front rank at 3 stands or fewer.');
    f = 3;
  }
  if (act.cur.type === 'creform') {
    const c = act.cur;
    if (f > c.start.files + 2) {
      toast('A Combat Reform can add at most 2 stands to the front rank.');
      f = c.start.files + 2;
    }
    const pos = crAnchor(c, f);
    act.pose.files = f;
    Object.assign(act.pose, pos);
    render();
    return;
  }
  act.pose.files = f;
  render();
}
