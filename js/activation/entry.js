/*
 * Entering the table
 *
 * A regiment entering the table: which edge, the band it may enter in and confirming the spot.
 *
 * In this file: confirmEntry(), ownEntry(), rlLine(), sideBand(), sideBlocked(), setEdge()
 */

function confirmEntry() {
  act.placed = true;
  act.entryPoint = { edge: act.edge || 'own', x: act.pose.x, y: act.pose.y };
  render();
}

function ownEntry(side, d) {
  return side === 'nord' ? { y: -d / 2, facing: 0 } : { y: 48 + d / 2, facing: 180 };
}

function rlLine(side) {
  side = side || (act ? base(act.id).side : HU);
  const v = state.rl && state.rl[side];
  return v != null ? v : side === 'nord' ? 0 : 48;
}

function sideBand(side, w) {
  const rl = rlLine(side);
  return side === 'nord' ? { lo: w / 2, hi: rl - w / 2 } : { lo: rl + w / 2, hi: 48 - w / 2 };
}

function sideBlocked(u) {
  if (state.round === 3 && /Heavy/.test(u.cls || ''))
    return 'Heavy regiments may only enter from your own edge in round 3';
  if (u.side === 'nord' ? rlLine(u.side) <= 0 : rlLine(u.side) >= 48)
    return 'No Reinforcement Line is set, so only your own edge is open';
  return '';
}

function setEdge(e, keep) {
  const u = base(act.id),
    G = geom(Object.assign({}, u, act.pose));
  if (e !== 'own') {
    const why = sideBlocked(u);
    if (why) {
      toast(why + '.');
      return;
    }
    const { lo, hi } = sideBand(u.side, G.w);
    if (hi < lo) {
      toast('There is not enough room between your edge and your Reinforcement Line for that formation.');
      return;
    }
    const y =
      keep && (act.edge || 'own') === e
        ? Math.max(lo, Math.min(hi, act.pose.y))
        : Math.max(lo, Math.min(hi, (lo + hi) / 2));
    Object.assign(
      act.pose,
      e === 'west' ? { x: -G.d / 2, y, facing: 90 } : { x: 72 + G.d / 2, y, facing: 270 }
    );
  } else {
    const x =
      keep && (act.edge || 'own') === 'own' ? Math.max(G.w / 2, Math.min(72 - G.w / 2, act.pose.x)) : 36;
    Object.assign(act.pose, Object.assign({ x }, ownEntry(u.side, G.d)));
  }
  act.edge = e;
  render();
}
