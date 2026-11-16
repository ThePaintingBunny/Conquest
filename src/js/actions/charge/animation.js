/*
 * Charge ghost and animation
 *
 * The see-through regiment at the end of the planned Charge Move and playing the move on the board.
 *
 * In this file: chargeGo(), redrawChargeGhost(), drawChargeGhost(), playChargePath(), animateCharge()
 */

/* play the Charge Move: wheel, straight move, close the door */
async function chargeGo() {
  const c = act.cur;
  if (!c || c.stage !== 'place') return;
  const pl = c.alts[c.altI] || c.plan;
  c.plan = pl;
  Object.assign(c, { face: pl.face, e: pl.F.e, n: pl.F.n, along: pl.F.along, half: pl.F.half });
  act.tgtPose = null;
  c.stage = 'adjust';
  c.animating = true;
  render();
  animateCharge(pl).then(() => {
    c.animating = false;
    if (act && act.cur === c) finishAction();
    else render();
  });
}

function redrawChargeGhost() {
  const g = $('cghost');
  if (!g || !act || !act.cur || act.cur.stage !== 'place') return render();
  g.innerHTML = '';
  try {
    drawChargeGhost(g);
  } catch (e) {
    console.error(e);
  }
}

function drawChargeGhost(g) {
  const c = act.cur,
    pl = c.alts[c.altI] || c.plan;
  if (!pl) return;
  const u0 = base(act.id);
  const pts = [
    [pl.start.x, pl.start.y],
    [pl.P1.x, pl.P1.y],
    [pl.P2.x, pl.P2.y],
    [pl.P3.x, pl.P3.y]
  ];
  el(
    'polyline',
    {
      points: pts.map(q => px(q[0]) + ',' + py(q[1])).join(' '),
      fill: 'none',
      stroke: '#FFE58A',
      'stroke-width': 2,
      'stroke-dasharray': '5 4',
      opacity: 0.9
    },
    g
  );
  c.alts.forEach((a, i) => {
    if (i === c.altI) return;
    el('circle', { cx: px(a.P3.x), cy: py(a.P3.y), r: 3, fill: '#FFE58A', opacity: 0.45 }, g);
  });
  standsOf(Object.assign({}, u0, { x: pl.P3.x, y: pl.P3.y, facing: pl.P3.facing })).forEach(s =>
    el(
      'polygon',
      {
        points: s.poly.map(q => px(q[0]) + ',' + py(q[1])).join(' '),
        fill: COL[u0.side] ? COL[u0.side].fill : '#888',
        'fill-opacity': 0.35,
        stroke: '#FFE58A',
        'stroke-width': 1.4,
        'stroke-dasharray': '3 2'
      },
      g
    )
  );
  if (pl.tgtPose) {
    const t = base(c.target);
    if (t)
      standsOf(Object.assign({}, t, pl.tgtPose)).forEach(s =>
        el(
          'polygon',
          {
            points: s.poly.map(q => px(q[0]) + ',' + py(q[1])).join(' '),
            fill: 'none',
            stroke: '#FFFFFF',
            'stroke-width': 1.2,
            'stroke-dasharray': '3 2',
            opacity: 0.8
          },
          g
        )
      );
  }
}

/* Play a Charge Move: wheel, straight move, then close the door (or the target pivots).
   setPose / setTgt receive the poses, so the same animation runs for the charging player (act) and, online, for the
   opponent (who replays the plan it receives). */
async function playChargePath(pl, u, tid, setPose, setTgt) {
  setPose({ x: pl.start.x, y: pl.start.y, facing: pl.start.facing });
  if (pl.th)
    await animFrames(Math.round(250 + (350 * Math.abs(pl.th)) / 90), e => {
      const p = wheelPose(pl.start, u, pl.dir, Math.abs(pl.th) * e);
      setPose({ x: p.x, y: p.y, facing: p.facing });
    });
  {
    const a = (pl.P1.facing * Math.PI) / 180,
      f = [Math.sin(a), Math.cos(a)];
    await animFrames(Math.round(Math.min(1400, 250 + 110 * pl.s)), e => {
      setPose({ x: pl.P1.x + f[0] * pl.s * e, y: pl.P1.y + f[1] * pl.s * e, facing: pl.P1.facing });
    });
  }
  if (pl.tgtPose) {
    const t = base(tid),
      t0 = t ? { x: t.x, y: t.y, facing: t.facing || 0 } : null;
    if (t0) {
      const d = angDiff(pl.tgtPose.facing, t0.facing);
      await animFrames(Math.round(250 + (350 * Math.abs(d)) / 90), e => {
        const p = rotAbout(t0, pl.pv, d * e);
        setTgt(tid, { x: p.x, y: p.y, facing: p.facing });
      });
      setTgt(tid, pl.tgtPose);
    }
  } else if (pl.dl) {
    const P2 = pl.P2;
    await animFrames(Math.round(250 + (350 * Math.abs(pl.dl)) / 90), e => {
      const p = rotAbout(P2, pl.pv, pl.dl * e);
      setPose({ x: p.x, y: p.y, facing: p.facing });
    });
  }
  /* lining the stands up: the last bit slides along the charged face */
  if (pl.slide && Math.abs(pl.slide) > 0.01) {
    const a = (pl.P3.facing * Math.PI) / 180,
      along = [Math.cos(a), -Math.sin(a)],
      F = pl.F || null,
      v = F ? F.along : along,
      x0 = pl.P3.x - v[0] * pl.slide,
      y0 = pl.P3.y - v[1] * pl.slide;
    await animFrames(Math.round(200 + 120 * Math.abs(pl.slide)), e =>
      setPose({ x: x0 + v[0] * pl.slide * e, y: y0 + v[1] * pl.slide * e, facing: pl.P3.facing })
    );
  }
  setPose({ x: pl.P3.x, y: pl.P3.y, facing: pl.P3.facing });
}

async function animateCharge(pl) {
  const u = byId(act.id),
    tid = act.cur && act.cur.target;
  /* only what the animation needs (the plan also refers to its alternatives, which refer back to it) */
  const lite = {};
  ['start', 'th', 'dir', 'P1', 's', 'tgtPose', 'pv', 'dl', 'P2', 'P3', 'slide', 'F'].forEach(k => {
    if (pl[k] !== undefined) lite[k] = pl[k];
  });
  pushAnim('charge', { id: act.id, tid, pl: lite });
  await playChargePath(
    pl,
    u,
    tid,
    p => Object.assign(act.pose, p),
    (id, pose) => (act.tgtPose = { id, pose })
  );
}
