/*
 * Seats and private data
 *
 * Which side each player sits on, whether the game is online or against the built-in opponent, and each player's
 * private data (hidden Command Stack).
 *
 * In this file: AI, HU, myId, realId, myStk, ract, lastCbJson, lastLive, liveT, usr, PVP(), SBX(),
 *   other(), seatSide(), applySeat(), PS(), stkPath(), savePS(), myTurnPvp()
 */

let AI = 'nord',
  HU = 'cs';

let myId = null,
  realId = null,
  myStk = null,
  ract = null,
  lastCbJson = 'null',
  lastLive = '',
  liveT = null,
  usr = null;

function PVP() {
  return !!(state && state.mode === 'pvp');
}

function SBX() {
  return !!(state && state.mode === 'test');
}

function other(s) {
  return s === 'cs' ? 'nord' : 'cs';
}

function seatSide() {
  if (!PVP() || !myId) return null;
  const st = state.seats || {};
  return st.cs === myId ? 'cs' : st.nord === myId ? 'nord' : null;
}

function applySeat() {
  const was = FLIP;
  const me = PVP() ? seatSide() || 'cs' : SBX() ? state.sbSide || 'cs' : 'cs';
  HU = ME = me;
  AI = other(me);
  FLIP = me === 'nord';
  if (was !== FLIP) {
    terrKey = '';
    zoneKey = '';
  }
  applyColors();
  const ly = $('leg-you'),
    lt2 = $('leg-them'),
    ltt = $('leg-them-t');
  if (ltt) ltt.textContent = PVP() ? 'Opponent' : 'Opponent’s army';
  const h = $('view-hint');
  if (h)
    h.textContent =
      (PVP()
        ? seatSide()
          ? 'Shown from your side of the table. '
          : 'You are watching; the view is from the south edge. '
        : 'Shown from your side of the table. ') +
      'Arrow keys nudge ½″, Q and E wheel 15° during a March or Reform. R ruler, A arcs, T threat ranges, P ping; ? lists every hotkey.';
}

function PS() {
  if (!PVP()) return state;
  const d = {
      gid: state.gid,
      round: state.round,
      huStack: [],
      huHeld: null,
      huLastCard: null,
      strategicHeld: false,
      strategicUsedRound: 0,
      hammerUsed: false
    },
    s = myStk || {};
  if (s.gid !== state.gid) return d;
  if (s.round !== state.round) return Object.assign(d, { strategicUsedRound: s.strategicUsedRound || 0 });
  return Object.assign(d, s);
}

function stkPath() {
  return 'data/users/' + realId + '/stack';
}

async function savePS(patch) {
  const n = Object.assign({}, PS(), patch, { gid: state.gid, round: state.round });
  myStk = n;
  try {
    if (realId) await db.doc(stkPath()).set(n);
  } catch (e) {}
  try {
    localStorage.setItem('vob-stack', JSON.stringify(n));
  } catch (e) {}
}

function myTurnPvp() {
  return !PVP() || (!!seatSide() && state.turn === HU);
}
