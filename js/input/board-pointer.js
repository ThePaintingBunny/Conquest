/*
 * Pointer on the board
 *
 * Clicking, dragging and releasing on the board: selecting, moving, measuring and placing.
 *
 * In this file: svgPt()
 */

function svgPt(ev) {
  const sv = $('board'),
    p = sv.createSVGPoint();
  p.x = ev.clientX;
  p.y = ev.clientY;
  return p.matrixTransform(sv.getScreenCTM().inverse());
}

$('board').addEventListener('pointerdown', ev => {
  if (aiBusy) return;
  const pt = svgPt(ev);
  if (state && ((state.step === 'review' && terrMode === 'manual') || (SBX() && tfTerr))) {
    terrainClick(pt, ev);
    return;
  }
  {
    const tg = ev.target.closest('g[data-tid]');
    if (tg && !ev.target.closest('g[data-id]') && !(act && act.cur) && !pick && !ruler) {
      const t = terrainOf()[+tg.getAttribute('data-tid')];
      if (t) {
        const I = tInfo(t);
        toast(
          I.name +
            ' · Size ' +
            I.size +
            ' · ' +
            I.kw.map(k => k + ' (' + TKWD[k].split(/[.;]/)[0].toLowerCase() + ')').join(' · ')
        );
      }
    }
  }
  if (ruler) {
    const gU = ev.target.closest && ev.target.closest('g[data-id]'),
      P = gU ? { id: gU.getAttribute('data-id') } : [ix(pt.x), iy(pt.y)];
    if (!rA || rB) {
      rA = P;
      rB = null;
      lastHover = null;
    } else rB = P;
    drawRuler();
    return;
  }
  const g = ev.target.closest('g[data-id]');
  if (!g) {
    return;
  }
  const id = g.getAttribute('data-id');
  if (
    act &&
    act.cur &&
    act.cur.type === 'charge' &&
    (act.cur.stage === 'target' || act.cur.stage === 'roll')
  ) {
    const t = byId(id);
    if (t && t.side !== ME) {
      selId = act.id;
      setChargeTarget(t);
      return;
    }
  }
  if (act && act.cur && act.cur.type === 'volley' && act.cur.stage === 'target') {
    const t = byId(id);
    if (t && t.side !== ME) {
      selId = act.id;
      act.cur.sel = t.id;
      render();
      const vw = volleyWhy(byId(act.id), t);
      if (vw) toast(vw);
      return;
    }
  }
  if (pick) {
    const t = byId(id),
      a = byId(pick.att);
    if (t && a && t.side !== a.side) {
      const p = pick;
      pick = null;
      openCombat({ type: p.type, att: p.att, tgt: t.id, inAct: false });
      return;
    }
  }
  selId = id;
  rightTab = 'reg';
  if (SBX() && !pick && !cb && !(act && act.id === id)) {
    const u = base(id);
    if (u && u.onTable && u.type !== 'marker') {
      tfDrag = { id, ox: ix(pt.x) - u.x, oy: iy(pt.y) - u.y, moved: false };
      $('board').setPointerCapture(ev.pointerId);
      return;
    }
  }
  if (
    act &&
    act.id === id &&
    ((act.entering && !act.placed) ||
      (act.cur &&
        (act.cur.moving || (act.cur.type === 'charge' && act.cur.stage === 'adjust' && !act.cur.animating))))
  ) {
    const u = byId(id);
    drag = { ox: ix(pt.x) - u.x, oy: iy(pt.y) - u.y };
    $('board').setPointerCapture(ev.pointerId);
  }
  render();
});

$('board').addEventListener('pointermove', ev => {
  const pt = svgPt(ev);
  if (ruler && rA && !rB) {
    drawRuler([ix(pt.x), iy(pt.y)]);
    return;
  }
  if (tfDrag) {
    const u = base(tfDrag.id);
    if (u) {
      u.x = Math.max(0, Math.min(72, Math.round((ix(pt.x) - tfDrag.ox) * 4) / 4));
      u.y = Math.max(0, Math.min(48, Math.round((iy(pt.y) - tfDrag.oy) * 4) / 4));
      tfDrag.moved = true;
      drawUnitsFast();
    }
    return;
  }
  if (!drag) return;
  setPose({ x: Math.round((ix(pt.x) - drag.ox) * 8) / 8, y: Math.round((iy(pt.y) - drag.oy) * 8) / 8 });
});

$('board').addEventListener('pointerup', () => {
  if (tfDrag) {
    const d = tfDrag;
    tfDrag = null;
    if (d.moved) putState({ units: state.units.slice() }).catch(() => {});
    else render();
    return;
  }
  drag = null;
  if (act && act.cur && (act.cur.type === 'march' || act.cur.withdraw) && act.cur.pending) {
    const c = act.cur;
    if (c.pending.amt > 0) c.segs.push(c.pending);
    c.pending = null;
    c.segStart = { x: act.pose.x, y: act.pose.y, facing: act.pose.facing, files: act.pose.files };
    render();
  }
});
