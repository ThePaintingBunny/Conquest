/*
 * Spell overlay
 *
 * Shows the chosen spell on the board: its range, legal targets and enemies out of reach.
 *
 * In this file: spellView, spellViewLive(), drawSpellZone(), redrawSpellZone()
 */

/* legal targets for a spell */
/* ===== Spell overlay on the board: the range around the caster's stand, legal targets outlined, enemies in range that
   the caster cannot see marked "no Line of Sight", and the chosen target highlighted. ===== */
let spellView = null;

function spellViewLive() {
  const v = spellView;
  if (!v) return null;
  const open = v.asChar
    ? charAct && charAct.id === v.uid
    : act && act.id === v.uid && act.cur && act.cur.type === 'cast';
  return open ? v : null;
}

function drawSpellZone(g, given) {
  const v = given || spellViewLive();
  if (!v || !g) return;
  const u = byId(v.uid),
    sp = v.sp;
  if (!u) return;
  const pts = q => q.map(p => px(p[0]) + ',' + py(p[1])).join(' '),
    cp = casterPoly(u);
  const S = sp.db || {},
    hits = (S.h || S.hf || /Hit/.test(sp.text || '')) && sp.targets === 'enemy',
    self = S.t === 'self' || sp.range === 0;
  if (!self) {
    const R = (sp.range || 12) + srRangeAdd(u) + itemSpellRange(u);
    el(
      'polygon',
      {
        points: pts(grownPoly(cp, R)),
        fill: '#B57CFF',
        'fill-opacity': 0.13,
        stroke: '#CDA6FF',
        'stroke-width': 2,
        'stroke-dasharray': '7 4'
      },
      g
    );
  }
  /* the caster's own stand */
  el('polygon', { points: pts(cp), fill: 'none', stroke: '#CDA6FF', 'stroke-width': 3 }, g);
  let legal = [];
  try {
    legal = spellTargets(u, sp);
  } catch (e) {}
  const ids = new Set(legal.map(t => t.id));
  legal.forEach(t =>
    el(
      'polygon',
      {
        points: pts(corners(t)),
        fill: 'none',
        stroke: t.id === v.ctx.target ? '#FFE07A' : '#8EE6A0',
        'stroke-width': t.id === v.ctx.target ? 4 : 2.5
      },
      g
    )
  );
  if (hits && !engaged(u).length) {
    const R = (sp.range || 12) + srRangeAdd(u) + itemSpellRange(u);
    all()
      .filter(
        t =>
          t.onTable &&
          !t.destroyed &&
          t.type !== 'marker' &&
          t.side !== u.side &&
          !ids.has(t.id) &&
          polyDist(cp, corners(t)) <= R + 1e-6
      )
      .forEach(t => {
        el(
          'polygon',
          {
            points: pts(corners(t)),
            fill: 'none',
            stroke: '#E57373',
            'stroke-width': 2.5,
            'stroke-dasharray': '4 3'
          },
          g
        );
        const tx = el(
          'text',
          {
            x: px(t.x),
            y: Math.max(...corners(t).map(q => py(q[1]))) + 14,
            'text-anchor': 'middle',
            fill: '#E57373',
            'font-size': 11,
            'font-weight': 700,
            stroke: '#1C2421',
            'stroke-width': 3,
            'paint-order': 'stroke'
          },
          g
        );
        tx.textContent = 'no Line of Sight';
      });
  }
}

function redrawSpellZone() {
  const g = $('spellg');
  if (!g) return;
  g.innerHTML = '';
  drawSpellZone(g);
}
