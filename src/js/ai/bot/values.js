/*
 * Built-in opponent: values
 *
 * Everything the built-in opponent weighs is measured in army points: a regiment's worth, a wound, a zone, a
 * Victory Point. The weights live in BOT so they can be tuned in one place.
 *
 * In this file: BOT, botLevel(), botOn(), botNoise(), botVal(), botMaxW(), botLeftW(), botWoundPts(),
 *   botZoneW(), botZoneScore()
 */

const BOT = {
  vp: 45 /* one Victory Point, in army points */,
  charPts: 110 /* a character's worth on top of its regiment */,
  warlordPts: 140 /* the Warlord on top of that (slaying it scores) */,
  killShare: 0.25 /* bonus for finishing a regiment, as a share of its worth */,
  returnW: 0.8 /* how much of the enemy's answer to a charge we count */,
  futureRisk: 0.45 /* next round's threats, against this round's */,
  potential: 0.45 /* our own threats for next time */,
  progress: 1.2 /* points per inch closer to a zone worth taking */,
  crowd: 3 /* points lost for each idle friendly regiment ending right next to it (traffic jams) */,
  lost: 0.3 /* chance per enemy activation that an opportunity is gone before we use it */,
  noise: { easy: 0.45, normal: 0.12, hard: 0 }
};

/* Easy, Normal or Hard (set in the Single player lobby) */
function botLevel() {
  const v = state && state.botLevel;
  return v === 'easy' || v === 'hard' ? v : 'normal';
}

/* is the built-in opponent playing (rather than Claude)? */
function botOn() {
  return !state || state.aiPlayer !== 'claude' || !sample;
}

/* a random nudge for Easy and Normal, so the opponent is not perfectly predictable */
function botNoise(scale) {
  const k = BOT.noise[botLevel()] || 0;
  if (!k) return 0;
  const g = (Math.random() + Math.random() + Math.random() - 1.5) * 2;
  return g * k * (scale || 40);
}

/* what a regiment is worth: its points, its character and the Warlord */
function botVal(u) {
  if (!u || isMarker(u)) return u && isMarker(u) ? 3 * BOT.vp : 0;
  return (+u.points || 60) + (u.charName ? BOT.charPts : 0) + (u.charName && u.warlord ? BOT.warlordPts : 0);
}

function botMaxW(u) {
  try {
    return Math.max(1, woundState(u, 0).max);
  } catch (e) {
    return Math.max(1, (+u.stands || 1) * (+(u.stats || {}).W || 4));
  }
}

function botLeftW(u) {
  if (isMarker(u)) return Math.max(1, 3 - (u.wounds || 0));
  return Math.max(1, botMaxW(u) - (u.wounds || 0));
}

/* what w expected wounds on u are worth: its share of the regiment, and a bonus when it is likely to be finished */
function botWoundPts(u, w) {
  if (!u || !(w > 0)) return 0;
  const left = botLeftW(u),
    v = botVal(u),
    per = v / botMaxW(u),
    f = Math.min(1, w / left);
  return Math.min(w, left) * per + Math.pow(f, 3) * v * BOT.killShare;
}

/* a zone's worth this round: its Victory Points, a little less before zones score */
function botZoneW(z) {
  const from = scenOf().from || 2,
    R = state.round || 1;
  return (z.vp || 2) * BOT.vp * (R >= from ? 1 : 0.6);
}

/* the zone picture for one side: + for each zone it holds, − for each the enemy holds */
function botZoneScore(side) {
  let s = 0;
  zoneControl().forEach(z => {
    const w = botZoneW(z);
    if (z.holder === side) s += w;
    else if (z.holder) s -= w;
  });
  return s;
}
