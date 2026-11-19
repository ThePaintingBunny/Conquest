/*
 * Live updates
 *
 * Sends the active player's moves and dice rolls to the opponent's screen.
 *
 * In this file: pushLive(), rollSince, rollSeen, rollHideT, pubRoll(), onRoll(), onLive()
 */

/* live view of the opponent's activation */
function pushLive() {
  if (!PVP() || !db || !seatSide()) return;
  const mine = act && base(act.id) && base(act.id).side === HU,
    chMine = !act && charAct && base(charAct.id) && base(charAct.id).side === HU;
  const v = mine
    ? JSON.stringify({ id: act.id, pose: act.pose, ov: liveOverlay() })
    : chMine
      ? JSON.stringify({ id: charAct.id, char: true, ov: liveOverlay() })
      : 'null';
  if (v === lastLive) return;
  lastLive = v;
  clearTimeout(liveT);
  liveT = setTimeout(() => {
    db.doc('game/live')
      .set({ by: HU, act: v, at: Date.now() })
      .catch(() => {});
  }, 120);
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

function onLive(d) {
  if (!d || d.by === HU) return;
  try {
    const a = JSON.parse(d.act || 'null');
    ract = a && a.id ? a : null;
  } catch (e) {
    ract = null;
  }
  /* only the table: the opponent's regiment, its ring and overlay */
  if (!act) drawBoard();
}
