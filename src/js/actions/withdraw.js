/*
 * Withdraw
 *
 * Starting a Withdraw, turning the regiment away and handling a failed Withdraw.
 *
 * In this file: wdStart(), wdTurn(), wdFail()
 */

function wdStart(u, st) {
  const eng = engaged(u),
    Rs = [u.stats && u.stats.R, u.charName && chStatsX(u).R, u.auxStats && u.auxStats.R]
      .map(Number)
      .filter(n => n > 0),
    R = Rs.length ? Math.max(...Rs) : 0,
    roll = d6(),
    clean = roll <= R,
    wd = d6();
  const foes = eng.map(e => corners(e)),
    nC = standsOf(u).filter(s => foes.some(q => polyDist(s.poly, q) <= 0.35)).length,
    wounds = clean ? wd : wd * nC;
  act.cur = {
    type: 'withdraw',
    stage: 'test',
    start: st,
    budget: 0,
    moving: false,
    reshape: false,
    roll,
    R,
    clean,
    wd,
    nC,
    wounds,
    foes: eng.map(e => e.id)
  };
  render();
  const txt = clean
    ? `Clean Withdrawal: rolled ${roll} against Resolve ${R}. Even a clean withdrawal costs D6 wounds: rolled ${wd}, so ${wounds} wound${wounds === 1 ? '' : 's'}, with no Morale Tests. Record them, then the regiment turns away and Marches.`
    : `Fighting Withdrawal: rolled ${roll} against Resolve ${R}. One D6 rolled ${wd}, applied to each of the ${nC} stand${nC === 1 ? '' : 's'} in contact: ${wounds} wound${wounds === 1 ? '' : 's'}. Test Morale for them, record, then the regiment turns away and Marches.`;
  if (wounds > 0) {
    openCombat({
      type: 'freform',
      att: u.id,
      tgt: u.id,
      inAct: false,
      resumeAct: false,
      preWounds: wounds,
      noMorale: clean,
      selfTitle: (clean ? 'Clean' : 'Fighting') + ' Withdrawal: ' + (u.short || u.name),
      selfText: txt
    });
    toast(txt);
  } else wdTurn();
}

function wdTurn() {
  const c = act.cur,
    u = byId(act.id);
  if (!u || !u.onTable || u.destroyed) {
    act.cur = null;
    render();
    return;
  }
  const foes = (c.foes || []).map(byId).filter(e => e && e.onTable);
  let vx = 0,
    vy = 0;
  foes.forEach(e => {
    vx += u.x - e.x;
    vy += u.y - e.y;
  });
  let fac = u.facing || 0;
  if (foes.length) {
    const raw = (Math.atan2(vx, vy) * 180) / Math.PI;
    const a = u.facing || 0;
    const opts = [0, 90, 180, 270].map(k => (a + k) % 360);
    const diff = o => Math.abs(((((o - raw) % 360) + 540) % 360) - 180);
    fac = opts.sort((x, y) => diff(x) - diff(y))[0];
  }
  c.origin = Object.assign({}, c.start);
  Object.assign(act.pose, { facing: fac });
  const st = { x: u.x, y: u.y, facing: fac, files: geom(u).files };
  Object.assign(c, {
    stage: 'march',
    start: st,
    budget: u.m || 0,
    moving: true,
    segs: [],
    segStart: Object.assign({}, st),
    mode: 'fwd',
    pending: null,
    withdraw: true
  });
  render();
  toast(`The regiment turns to face away (${fac}°). March it now; it cannot end within 1″ of an enemy.`);
}

function wdFail() {
  const c = act.cur;
  if (!c || c.type !== 'withdraw') return;
  Object.assign(act.pose, { x: c.origin.x, y: c.origin.y, facing: c.origin.facing, files: c.origin.files });
  c.failed = true;
  c.start = Object.assign({}, c.origin);
  finishAction();
}
