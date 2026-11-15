/*
 * Failed Charge
 *
 * What a regiment does when its Charge fails.
 *
 * In this file: cautiousOk(), failCharge()
 */

/* Cautious Strikes (Nords Mastery, Konungyr or Jarl Warlord): a friendly Exalted regiment that fails a charge moves
   either the roll or its March, the player's choice (the AI takes the longer) */
function cautiousOk(u, roll) {
  const wl = supWl(u.side);
  return !!(wl && upgOf(wl, /Cautious Strikes/) && supRoles(u).includes('Exalted') && (u.m || 0) !== roll);
}

function failCharge(useMarch) {
  const u = byId(act.id),
    c = act.cur;
  const a = ((u.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)];
  let k = c.roll || 0;
  if (useMarch == null && cautiousOk(u, k)) {
    if (!PVP() && !SBX() && u.side === AI) useMarch = (u.m || 0) > k;
    else {
      c.stage = 'cautious';
      render();
      return;
    }
  }
  if (useMarch) {
    k = u.m || 0;
    toast('Cautious Strikes: it moves its March (' + k + '″) instead of the roll.');
  }
  let p = { x: c.start.x + f[0] * k, y: c.start.y + f[1] * k };
  /* a failed Charge halts 1″ away from any enemy regiment and any Garrison terrain */
  const near = pp => {
    const A = corners(Object.assign({}, u, pp));
    return (
      all().some(o => o.onTable && o.side !== u.side && polyDist(A, corners(o)) < 1) ||
      terrainOf().some(t => tHas(t, 'Garrison') && terrDist(A, t) < 1)
    );
  };
  while (k > 0 && near(p)) {
    k = Math.max(0, +(k - 0.1).toFixed(2));
    p = { x: c.start.x + f[0] * k, y: c.start.y + f[1] * k };
  }
  Object.assign(act.pose, p);
  act.chargeFailed = true;
  act.actions.push({
    type: 'charge',
    free: false,
    from: c.start,
    to: { x: p.x, y: p.y, facing: u.facing || 0, files: geom(u).files },
    roll: c.roll,
    rerolled: !!c.rerolled,
    target: c.target,
    dist: +c.dist.toFixed(2),
    result: 'failed',
    moved: k
  });
  act.cur = null;
  toast('Charge failed. The regiment moves ' + k.toFixed(1) + '″ straight forward and its activation ends.');
  if (encyOpt(u, /Hurl It/i)) {
    const T = byId(c.target);
    if (T && T.onTable && !T.destroyed) {
      const V = Math.min(6, (+(u.stats || {}).V || 0) + 1),
        d = d6(),
        hit = d <= V,
        n = uSize(T);
      setTimeout(() => {
        banner(
          'Hurl It! Barrage (1), Aimed Shot',
          [{ v: d, cls: hit ? 'hit' : 'miss' }],
          'hits on ' + V + ' or less'
        );
        setTimeout(bannerHide, 2400);
        if (hit) {
          toast(
            'Hurl It! hits ' +
              (T.short || T.name) +
              ': ' +
              n +
              ' wound' +
              (n === 1 ? '' : 's') +
              ' (its Size), no Defense or Morale.'
          );
          putState({
            units: hurt(state.units, T.id, n),
            lastTitle: N(u.side) + ' · Hurl It!',
            lastText:
              (u.short || u.name) +
              ' falls short but hurls something at ' +
              (T.short || T.name) +
              ': ' +
              n +
              ' wound' +
              (n === 1 ? '' : 's') +
              '.'
          });
        } else toast('Hurl It! misses.');
      }, 400);
    }
  }
}
