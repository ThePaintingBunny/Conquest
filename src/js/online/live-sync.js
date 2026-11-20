/*
 * Live updates
 *
 * Sends the active player's moves and dice rolls to the opponent's screen.
 *
 * In this file: netRoom, liveN, liveSeenN, liveDbAt, liveGlide, liveRoomJoin(), pushLive(), onLive(),
 *   onLiveObj(), liveRaf, liveGlideStep(), rollSince, rollSeen, rollHideT, pubRoll(), onRoll()
 */

/* live view of the opponent's activation. The moving regiment's pose goes out through the room (presence: many
   times a second, never stored) when the page can join it, and to game/live once the movement pauses, for a
   page without the room and for anyone who opens the page later */
let netRoom = null,
  liveN = 0,
  liveSeenN = -1,
  liveDbAt = 0,
  liveGlide = null;

function liveRoomJoin(r) {
  if (!r || netRoom) return;
  netRoom = r;
  netW.st.liveVia = 'live link (many updates a second)';
  try {
    r.onPeers(peers => {
      (peers || []).forEach(p => {
        if (!p || p.isMe) return;
        const L = p.presence && p.presence.live;
        if (L && typeof L === 'object' && L.by && L.by !== HU) onLiveObj(L.a, L.n);
      });
    });
  } catch (e) {}
  netPanelFill();
}

function pushLive() {
  if (!PVP() || !db || !seatSide()) return;
  const mine = act && base(act.id) && base(act.id).side === HU,
    chMine = !act && charAct && base(charAct.id) && base(charAct.id).side === HU;
  const o = mine
    ? { id: act.id, pose: act.pose, ov: liveOverlay() }
    : chMine
      ? { id: charAct.id, char: true, ov: liveOverlay() }
      : null;
  const v = JSON.stringify(o);
  if (v === lastLive) return;
  lastLive = v;
  const n = (liveN = Math.max(liveN + 1, Date.now())),
    a = o ? Object.assign({}, o, { n }) : null;
  if (netRoom)
    try {
      netRoom.presence({ live: { by: HU, n, a } }).catch(() => {});
    } catch (e) {}
  /* the stored copy: at most a few times a second, and the last pose always */
  clearTimeout(liveT);
  const send = () => {
    liveDbAt = Date.now();
    db.doc('game/live')
      .set({ by: HU, act: JSON.stringify(a), n, at: Date.now() })
      .catch(() => {});
  };
  const gap = netRoom ? 600 : 200;
  if (!netRoom && Date.now() - liveDbAt >= gap) send();
  else liveT = setTimeout(send, netRoom ? 250 : gap);
}

function onLive(d) {
  if (!d || d.by === HU) return;
  let a = null;
  try {
    a = JSON.parse(d.act || 'null');
  } catch (e) {}
  onLiveObj(a, d.n);
}

/* a pose from the opponent: newer than the last one seen, then glided to */
function onLiveObj(a, n) {
  if (n != null) {
    /* the same pose arrives twice (room and game/live) and the stored one can be older */
    if (+n <= liveSeenN) return;
    liveSeenN = +n;
  }
  netW.st.live++;
  const prev = ract;
  ract = a && a.id ? a : null;
  if (act) return;
  if (ract && ract.pose && prev && prev.id === ract.id && prev.pose && byId(ract.id)) {
    const from = liveGlide ? liveGlide.cur : prev.pose,
      to = ract.pose;
    if (from && Math.hypot((to.x || 0) - (from.x || 0), (to.y || 0) - (from.y || 0)) < 24) {
      liveGlide = { from: Object.assign({}, from), to, cur: Object.assign({}, from), t0: performance.now() };
      ract.pose = Object.assign({}, to, liveGlide.cur);
      liveGlideStep();
      return;
    }
  }
  liveGlide = null;
  drawBoard();
}

/* move the opponent's regiment smoothly between the poses it sends: one drawing per screen frame at most */
let liveRaf = 0;
function liveGlideStep() {
  if (liveRaf) return;
  const step = () => {
    liveRaf = 0;
    const G = liveGlide;
    if (!G || !ract || !ract.pose) return;
    const k = Math.min(1, (performance.now() - G.t0) / 140),
      e = k * (2 - k),
      df = (((((G.to.facing || 0) - (G.from.facing || 0)) % 360) + 540) % 360) - 180;
    G.cur = {
      x: G.from.x + (G.to.x - G.from.x) * e,
      y: G.from.y + (G.to.y - G.from.y) * e,
      facing: (G.from.facing || 0) + df * e
    };
    ract.pose = Object.assign({}, G.to, G.cur);
    if (k >= 1) {
      ract.pose = Object.assign({}, G.to);
      liveGlide = null;
    }
    if (!act) drawBoard();
    if (liveGlide) liveRaf = requestAnimationFrame(step);
  };
  liveRaf = requestAnimationFrame(step);
}

const rollSince = Date.now();

let rollSeen = 0,
  rollHideT = null;

function pubRoll(title, dice, text) {
  if (!PVP() || !db || !seatSide()) return;
  db.doc('game/roll')
    .set({ by: HU, title, dice: JSON.stringify(dice), text: text || '', at: Date.now() })
    .catch(() => {});
}

function onRoll(d) {
  if (!d || d.by === HU || !d.at || d.at < rollSince - 2000 || d.at === rollSeen) return;
  rollSeen = d.at;
  let dice = [];
  try {
    dice = JSON.parse(d.dice || '[]');
  } catch (e) {}
  banner((PN(d.by) || N(d.by)) + ' · ' + d.title, dice, d.text);
  clearTimeout(rollHideT);
  rollHideT = setTimeout(bannerHide, (DSPEED[SET.diceSpeed] || 1300) + 2600);
}
