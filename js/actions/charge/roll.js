/*
 * Charge Roll
 *
 * Rolling for the Charge and resolving the result.
 *
 * In this file: chargeRollBtn(), resolveCharge(), rollPicker()
 */

/* the Charge Roll happens in the game: one die (two, keep the highest, with Master of the Legions) */
function chargeRollBtn(label, go, need) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn';
  b.textContent = label;
  b.onclick = async () => {
    b.disabled = true;
    const u = byId(act.id),
      two = u && (fxHas(u, /2D6 Charge/) || endocrineNear(u));
    const d = [d6()].concat(two ? [d6()] : []),
      r = Math.max(...d);
    pubRoll(
      'Charge Roll' +
        (two ? ' (2D6, highest)' : '') +
        ' · ' +
        (u.short || u.name) +
        (act && act.cur && act.cur.target && byId(act.cur.target)
          ? ' → ' + (byId(act.cur.target).short || byId(act.cur.target).name)
          : ''),
      d.map(v => ({ v, cls: v === r && v >= need ? 'hit' : v === r ? 'miss' : '' })),
      'needs ' + need + ' or more'
    );
    banner(
      'Charge Roll' + (two ? ' (2D6, highest)' : ''),
      d.map(v => ({ v, cls: v === r && v >= need ? 'hit' : v === r ? 'miss' : '' })),
      'needs ' + need + ' or more'
    );
    await sleep((DSPEED[SET.diceSpeed] || 1300) + 700);
    bannerHide();
    go(r);
  };
  return b;
}

function resolveCharge(roll, reroll) {
  const u = byId(act.id),
    c = act.cur;
  c.roll = roll;
  if (reroll) c.rerolled = true;
  const tg = byId(c.target);
  if (tg && fxHas(tg, /^Whispered Illusion: Phantom Onslaught/) && !c.wi) {
    const mi = moraleInfo(u, u),
      v = d6();
    c.wi = { v, R: mi.R, pass: mi.auto || v <= mi.R };
    toast(
      'Phantom Onslaught: Resolve test ' +
        v +
        ' against ' +
        mi.R +
        (c.wi.pass ? ' passed: −1″ Charge Distance.' : ' failed: no Shock and −2 Impact this round.')
    );
    if (!c.wi.pass && !act.extraFx.includes('Phantom Onslaught (no Shock, Impact −2)'))
      act.extraFx.push('Phantom Onslaught (no Shock, Impact −2)');
  }
  const f = chargeFixed(u);
  const cd =
    (u.m || 0) +
    (f != null ? f : roll + srChargeBonus(u, byId(c.target))) +
    (c.pu ? 2 : 0) -
    (c.wi && c.wi.pass ? 1 : 0);
  c.cd = cd;
  if (cd >= c.dist - 1e-6) {
    c.success = true;
    if (placeCharge()) {
      c.stage = 'adjust';
      if (!aiBusy && (PVP() || SBX() || base(act.id).side !== AI)) {
        const pl = c.plan;
        c.alts = pl.alts && pl.alts.length ? pl.alts : [pl];
        c.altI = Math.max(0, c.alts.indexOf(pl));
        c.stage = 'place';
        Object.assign(act.pose, { x: pl.start.x, y: pl.start.y, facing: pl.start.facing });
        act.tgtPose = null;
        render();
        return;
      }
      if (!aiBusy) {
        c.animating = true;
        animateCharge(c.plan).then(() => {
          c.animating = false;
          if (act && act.cur === c) finishAction();
          else render();
        });
      }
    } else c.stage = 'blocked';
  } else if (
    ((hasRule(u, /Unstoppable/) && !lethargyT(u)) || u.bearer) &&
    !c.rerolled &&
    chargeFixed(u) == null &&
    !noChargeReroll(u)
  ) {
    c.stage = 'reroll';
  } else failCharge();
  render();
}

function rollPicker(label, cb) {
  const w = document.createElement('div');
  w.className = 'row';
  const sel = document.createElement('select');
  sel.id = 'chg-roll';
  sel.setAttribute('aria-label', 'Charge roll');
  for (let i = 1; i <= 6; i++) {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = i;
    sel.appendChild(o);
  }
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn';
  b.textContent = label;
  b.onclick = () => cb(+sel.value);
  w.append(sel, b);
  return w;
}
