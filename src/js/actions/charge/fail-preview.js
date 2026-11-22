/*
 * Preview of an impossible Charge
 *
 * Shows why a Charge cannot be made.
 *
 * In this file: chargePathPose(), chgFailAnim, previewChargeFail(), chargeFailText(), clearChargeFail()
 */

/* ===== Preview of a Charge that cannot be made: a see-through regiment follows the best Charge Move the planner tried
   (wheel, straight move, close the door) and stops where it is blocked; the blocking contact is marked in red. ===== */
function chargePathPose(fl, u, e) {
  /* pose along the attempted path; e runs 0..1 over wheel, move and door, ending at the failure point */
  const segs = [];
  const upto = { wheel: 0, move: 1, door: 2, final: 3 }[fl.phase];
  if (fl.th) segs.push(k => wheelPose(fl.start, u, fl.dir, Math.abs(fl.th) * k));
  segs.push(k => {
    const a = (fl.P1.facing * Math.PI) / 180;
    return Object.assign({}, fl.P1, {
      x: fl.P1.x + Math.sin(a) * fl.s * k,
      y: fl.P1.y + Math.cos(a) * fl.s * k
    });
  });
  if (fl.dl) segs.push(k => Object.assign(rotAbout(fl.P2, fl.pv, fl.dl * k)));
  /* how much of each segment is played */
  const plays = [];
  if (fl.th) plays.push(upto === 0 ? fl.f : 1);
  if (upto >= 1) plays.push(upto === 1 ? fl.f : 1);
  if (fl.dl && upto >= 2) plays.push(upto === 2 ? fl.f : 1);
  const n = plays.length,
    i = Math.min(n - 1, Math.floor(e * n)),
    k = e >= 1 ? 1 : e * n - i;
  return segs[i](plays[i] * k);
}

let chgFailAnim = 0;

async function previewChargeFail() {
  const c = act && act.cur,
    ill = c && c.illegal,
    fl = ill && ill.fail;
  const ug = $('units');
  if (!fl || !ug) return;
  const u0 = Object.assign({}, base(act.id), act.pose),
    myRun = ++chgFailAnim;
  let g = $('cfail');
  if (!g) g = el('g', { id: 'cfail', 'pointer-events': 'none' }, ug.parentNode);
  else g.parentNode.appendChild(g);
  const draw = (pose, done) => {
    g.innerHTML = '';
    const gu = Object.assign({}, u0, pose),
      col = done ? '#E57373' : '#FFE58A';
    el(
      'line',
      {
        x1: px(fl.start.x),
        y1: py(fl.start.y),
        x2: px(pose.x),
        y2: py(pose.y),
        stroke: col,
        'stroke-width': 1.6,
        'stroke-dasharray': '4 3'
      },
      g
    );
    standsOf(gu).forEach(s2 =>
      el(
        'polygon',
        {
          points: s2.poly.map(q => px(q[0]) + ',' + py(q[1])).join(' '),
          fill: COL[u0.side] ? COL[u0.side].fill : '#888',
          'fill-opacity': 0.35,
          stroke: col,
          'stroke-width': 1.4,
          'stroke-dasharray': '3 2'
        },
        g
      )
    );
    if (!done) return;
    /* the point of failure: where the next step would touch or overlap what blocks it */
    const hitPose = chargePathPose(Object.assign({}, fl, { f: fl.fHit }), u0, 1),
      HP = corners(Object.assign({}, u0, hitPose));
    let pt = [hitPose.x, hitPose.y];
    if (fl.blk) {
      const cp = closestPts(HP, fl.blk);
      if (cp) pt = [(cp[1][0] + cp[2][0]) / 2, (cp[1][1] + cp[2][1]) / 2];
      el(
        'polygon',
        {
          points: fl.blk.map(q => px(q[0]) + ',' + py(q[1])).join(' '),
          fill: 'none',
          stroke: '#E57373',
          'stroke-width': 2.4
        },
        g
      );
    }
    el(
      'circle',
      { cx: px(pt[0]), cy: py(pt[1]), r: 9, fill: 'none', stroke: '#E57373', 'stroke-width': 2.5 },
      g
    );
    el('circle', { cx: px(pt[0]), cy: py(pt[1]), r: 3, fill: '#E57373' }, g);
    const t = el(
      'text',
      {
        x: px(pt[0]),
        y: py(pt[1]) - 14,
        'text-anchor': 'middle',
        fill: '#E57373',
        'font-size': 12,
        'font-weight': 700,
        'font-family': 'Alegreya Sans, sans-serif',
        stroke: '#1C2421',
        'stroke-width': 3,
        'paint-order': 'stroke'
      },
      g
    );
    t.textContent = chargeFailText(fl);
  };
  const ms = noMotion() ? 0 : 1600,
    t0 = performance.now();
  await new Promise(res => {
    const step = now => {
      if (myRun !== chgFailAnim) return res();
      const k = ms ? Math.min(1, (now - t0) / ms) : 1;
      draw(chargePathPose(fl, u0, ease(k)), k >= 1);
      if (k < 1) requestAnimationFrame(step);
      else res();
    };
    requestAnimationFrame(step);
  });
  setTimeout(() => {
    if (myRun === chgFailAnim && g.parentNode) g.innerHTML = '';
  }, 6000);
}

function chargeFailText(fl) {
  const what = fl.by || 'something';
  return fl.phase === 'wheel'
    ? 'Blocked while wheeling: ' + what
    : fl.phase === 'move'
      ? (/table edge/.test(what) ? 'Runs off ' : 'Blocked: would touch ') + what
      : fl.phase === 'door'
        ? 'Cannot close the door: ' + what
        : 'Cannot end here: ' + what;
}

function clearChargeFail() {
  chgFailAnim++;
  const g = $('cfail');
  if (g) g.innerHTML = '';
}
