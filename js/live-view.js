/* Live view for both players: the regiment being activated is ringed on every screen, the opponent sees your action's
   overlay (volley ranges, charge zones, the chosen spell's range and target) and your Charge Moves play out on their screen
   too. Press P over the board to ping a spot; online, your opponent sees it. */

let rTgt = null; /* online: the opponent's charge target while it pivots */
const liveSince = Date.now();

/* what the activating player is looking at, sent with the live pose */
function liveOverlay() {
  const c = act && act.cur;
  if (c && c.type === 'volley' && c.stage === 'target') return { k: 'volley' };
  if (c && c.type === 'charge' && (c.stage === 'target' || c.stage === 'roll'))
    return { k: 'charge', t: c.target || null };
  const v = typeof spellViewLive === 'function' ? spellViewLive() : null;
  if (v)
    return {
      k: 'spell',
      uid: v.uid,
      name: v.sp.name,
      asChar: !!v.asChar,
      t: (v.ctx && v.ctx.target) || null
    };
  return null;
}

/* the opponent's overlay, drawn on this screen */
function drawRemoteOverlay(g) {
  if (!ract || !ract.ov || (act && act.id === ract.id)) return;
  const u = byId(ract.id),
    ov = ract.ov;
  if (!u) return;
  if (ov.k === 'volley') drawVolleyZones(u, g);
  else if (ov.k === 'charge') {
    drawChargeZones(u, g);
    const t = ov.t && byId(ov.t);
    if (t)
      el(
        'polygon',
        {
          points: corners(t)
            .map(q => px(q[0]) + ',' + py(q[1]))
            .join(' '),
          fill: 'none',
          stroke: '#FFE07A',
          'stroke-width': 4
        },
        g
      );
  } else if (ov.k === 'spell') {
    const cu = byId(ov.uid);
    const sp = cu && spellsOf(cu, ov.asChar).find(s => s.name === ov.name);
    if (sp) drawSpellZone(g, { uid: ov.uid, sp, ctx: { target: ov.t }, asChar: ov.asChar, remote: true });
  }
}

/* a pulsing ring around whatever is activating: yours, or (online) the opponent's */
function drawActiveRing(g) {
  const rings = [];
  if (act && byId(act.id)) rings.push({ u: byId(act.id), side: byId(act.id).side, char: false });
  else if (charAct && byId(charAct.id))
    rings.push({ u: byId(charAct.id), side: byId(charAct.id).side, char: true });
  if (ract && byId(ract.id) && !rings.some(r => r.u.id === ract.id))
    rings.push({ u: byId(ract.id), side: byId(ract.id).side, char: !!ract.char });
  rings.forEach(({ u, side, char }) => {
    const cs = char && standsOf(u).find(s => s.kind === 'char'),
      P = cs ? cs.poly : corners(u);
    el(
      'polygon',
      {
        points: grownPoly(P, 0.45)
          .map(q => px(q[0]) + ',' + py(q[1]))
          .join(' '),
        fill: 'none',
        stroke: '#FFE07A',
        'stroke-width': 3,
        class: 'act-ring'
      },
      g
    );
  });
}

/* ---------- the Charge Move on the opponent's screen ---------- */
function pushAnim(kind, data) {
  if (!PVP() || !db || !seatSide()) return;
  db.doc('game/anim')
    .set({ by: HU, kind, data: JSON.stringify(data), at: Date.now() })
    .catch(() => {});
}
let animSeen = 0;
async function onAnim(d) {
  if (!d || d.by === HU || !d.at || d.at < liveSince - 2000 || d.at === animSeen) return;
  animSeen = d.at;
  let D = null;
  try {
    D = JSON.parse(d.data || 'null');
  } catch (e) {}
  if (!D || d.kind !== 'charge' || !D.pl || !base(D.id)) return;
  const u = base(D.id);
  await playChargePath(
    D.pl,
    u,
    D.tid,
    p => (ract = { id: D.id, pose: p, ov: null }),
    (id, pose) => (rTgt = { id, pose })
  );
  setTimeout(() => {
    rTgt = null;
    render();
  }, 6000);
}

/* ---------- pings ---------- */
let boardPt = null,
  pingSeen = 0;
$('board').addEventListener('pointermove', ev => {
  try {
    const p = svgPt(ev);
    boardPt = [ix(p.x), iy(p.y)];
  } catch (e) {}
});
$('board').addEventListener('pointerleave', () => (boardPt = null));
document.addEventListener('keydown', ev => {
  if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.repeat) return;
  const tg = ev.target;
  if (/INPUT|TEXTAREA|SELECT/.test(tg.tagName) || tg.isContentEditable) return;
  if (mmCurrent()) return;
  if ((ev.key === 'p' || ev.key === 'P') && boardPt) {
    ev.preventDefault();
    sendPing(boardPt);
  }
});
function sendPing(pt) {
  if (!pt || pt[0] < 0 || pt[0] > 72 || pt[1] < 0 || pt[1] > 48) return;
  showPing(pt, HU);
  if (PVP() && db && seatSide())
    db.doc('game/ping')
      .set({ by: HU, x: +pt[0].toFixed(2), y: +pt[1].toFixed(2), at: Date.now() })
      .catch(() => {});
}
function onPing(d) {
  if (!d || d.by === HU || !d.at || d.at < liveSince - 2000 || d.at === pingSeen) return;
  pingSeen = d.at;
  showPing([d.x, d.y], d.by);
  toast((PN(d.by) || N(d.by)) + ' pinged a spot on the table.');
}
function showPing(pt, side) {
  let g = $('pingg');
  if (!g) g = el('g', { id: 'pingg', 'pointer-events': 'none' }, $('board'));
  else g.parentNode.appendChild(g);
  const col = side === HU ? '#FFE07A' : (COL[side] && COL[side].fill) || '#9CC4FF',
    one = el('g', { class: 'ping' }, g);
  [0, 0.35, 0.7].forEach(dl => {
    el(
      'circle',
      {
        cx: px(pt[0]),
        cy: py(pt[1]),
        r: 6,
        fill: 'none',
        stroke: col,
        'stroke-width': 3,
        class: 'ping-ring',
        style: 'animation-delay:' + dl + 's'
      },
      one
    );
  });
  el(
    'circle',
    { cx: px(pt[0]), cy: py(pt[1]), r: 4, fill: col, stroke: '#1C2421', 'stroke-width': 1.5 },
    one
  );
  setTimeout(() => one.remove(), 2800);
}
