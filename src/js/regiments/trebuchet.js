/*
 * Hundred Kingdoms Trebuchet
 *
 * Not a character: a Light Monster regiment on two monster bases with its own way onto the table.
 *   1. The first time its Command Card is drawn, a crew stand (one Infantry stand of 4 models, Size 1, with the
 *      Trebuchet's profile but not its special rules) comes on with one March of up to 8″ from its table edge; its
 *      activation then ends.
 *   2. On its next activation it gives up all its Actions: the Trebuchet is placed within 1″ of the crew stand, its
 *      rear edge flush with its own table edge, at least 3″ from Impassable terrain and 9″ from other Trebuchets.
 *      The crew stand is removed.
 *   3. From then on it never moves. Load the Next One! must be its first Action each round: Tar Barrels, Boulder or
 *      Incendiary Pot, for its Volleys that round.
 * It cannot be Healed and gains Tenacious (1) when targeted by a Volley.
 *
 * In this file: isTreb(), TREB_AMMO, trebAmmo(), trebActions(), trebSetupPose(), trebSetup(),
 *   trebAfterVolley(), aiTreb()
 */

function isTreb(u) {
  return !!u && /^Trebuchet$/.test(String(u.name || '')) && (u.fac === 'Hundred Kingdoms' || !u.fac);
}

const TREB_AMMO = {
  loadtar: [
    'Tar Barrels',
    'If its Volley hits: the target −2 Impact, −2 March in its first Action and no Charge re-roll this round'
  ],
  loadboulder: ['Boulder', 'No Defense rolls: each Hit is wounds equal to the target’s Size, no Morale'],
  loadpot: ['Incendiary Pot', 'Barrage becomes the number of stands in the target +6 for the Volley']
};

/* the ammunition loaded this round, or '' */
function trebAmmo(u) {
  const g = ((base(u.id) || u).temp || []).find(x => /^Load the Next One!: /.test(x.src));
  return g ? g.src.replace('Load the Next One!: ', '') : '';
}

/* its actions (replaces the usual list): see the steps above */
function trebActions(u, out, used, eng, blocked) {
  const can = (type, why) => out.push({ type, why });
  if (u.trebStage !== 'set') {
    /* the crew: one March on from the table edge, then the activation ends; next time it sets up (no Actions) */
    if (act.entering && !used.length) can('march', blocked('march'));
    return out;
  }
  const loaded = !!trebAmmo(u);
  if (eng.length) {
    can('clash', blocked('clash'));
    return out;
  }
  if (!loaded)
    Object.keys(TREB_AMMO).forEach(k =>
      can(k, used.length ? 'Load the Next One! must be its first Action this round' : blocked(k))
    );
  can('volley', loaded ? blocked('volley') : 'Load the Next One! first (its first Action each round)');
  can('aim', loaded ? aimWhy(u) || blocked('aim') : 'Load the Next One! first (its first Action each round)');
  if ((u.effects || []).includes('Broken')) can('rally', blocked('rally'));
  return out;
}

/* where the Trebuchet goes: rear edge on its own table edge, within 1″ of the crew, 3″ from Impassable terrain and
   9″ from other Trebuchets; the spot nearest the crew. Returns {pose} or {why} */
function trebSetupPose(u) {
  const crew = corners(u),
    T = Object.assign({}, u, { sw: 8, sd: 4, files: 1, stands: 1 }),
    e = ownEntry(u.side, 0),
    y = u.side === 'nord' ? 2 : 46;
  const others = all().filter(
    o => o.id !== u.id && o.onTable && !o.destroyed && isTreb(o) && o.trebStage === 'set'
  );
  let why = 'The crew stand must be within 1″ of a spot on your table edge where the Trebuchet fits.';
  for (let dx = 0; dx <= 12; dx += 0.1)
    for (const sg of dx ? [1, -1] : [1]) {
      const p = { x: +(u.x + sg * dx).toFixed(2), y, facing: e.facing, files: 1 },
        A = corners(Object.assign({}, T, p));
      if (polyDist(A, crew) > 1 + 1e-6) continue;
      if (!A.every(q => q[0] >= -0.01 && q[0] <= 72.01)) continue;
      if (terrainOf().some(t => tHas(t, 'Impassable') && terrDist(A, t) < 3)) {
        why = 'Every spot within 1″ of the crew is closer than 3″ to Impassable terrain.';
        continue;
      }
      if (others.some(o => polyDist(A, corners(o)) < 9)) {
        why = 'Every spot within 1″ of the crew is closer than 9″ to another Trebuchet.';
        continue;
      }
      /* nothing else may be in the way (its own crew is replaced) */
      if (all().some(o => o.id !== u.id && o.onTable && !o.destroyed && polyDist(A, corners(o)) <= 0.02))
        continue;
      return { pose: p };
    }
  return { why };
}

/* replace the crew with the Trebuchet (its whole activation) */
async function trebSetup(u) {
  const P = trebSetupPose(u);
  if (!P.pose) {
    toast(P.why);
    return false;
  }
  act.trebSet = true;
  Object.assign(act.pose, { x: P.pose.x, y: P.pose.y, facing: P.pose.facing, files: 1 });
  await putState({
    units: state.units.map(x =>
      x.id === u.id
        ? Object.assign({}, x, P.pose, {
            trebStage: 'set',
            rules: x.trebRules || x.rules,
            sw: 8,
            sd: 4,
            files: 1,
            m: 0,
            stats: Object.assign({}, x.stats, { M: 0 })
          })
        : x
    ),
    lastTitle: N(u.side) + ' · Trebuchet',
    lastText: 'The crew sets up the Trebuchet on its table edge; the crew stand is removed.'
  });
  return true;
}

/* after its Volley: Tar Barrels marks a target that was hit */
async function trebAfterVolley(A, T, hits) {
  if (!A || !T || !isTreb(A) || trebAmmo(A) !== 'Tar Barrels' || !(hits > 0) || T.destroyed) return;
  await putState({
    units: state.units.map(x =>
      x.id === T.id
        ? grantU(x, 'Tar Barrels (−2 Impact, −2 March in its first Action, no Charge re-roll)', [], { M: -2 })
        : x
    )
  });
}

/* the computer player's Trebuchet: true when its activation is fully handled here */
async function aiTreb(lines) {
  const u = byId(act.id);
  if (!isTreb(u)) return false;
  if (u.trebStage !== 'set') {
    if (act.entering) {
      /* come on and stay at the edge, so the engine can be set up next time */
      if (!act.placed) await exEnter({ edge: 'own', at: botEnterX(base(act.id)) });
      const r = await exMarch({ mode: 'fwd', amount: 2.1 });
      if (r) lines.push('its crew ' + r);
      return true;
    }
    if (!act.trebSet && (await trebSetup(byId(act.id))))
      lines.push('sets up the Trebuchet on its table edge');
    return true;
  }
  if (!trebAmmo(u) && !engaged(u).length) {
    /* Boulder against big targets (each Hit is their Size in wounds), the Incendiary Pot against the rest */
    const T = all().filter(
      o => o.onTable && !o.destroyed && o.side !== u.side && !isMarker(o) && !volleyWhy(u, o, false)
    );
    const k = T.some(o => baseSize(o).s >= 3) ? 'loadboulder' : 'loadpot';
    const r = await exSimple(k, 'loads: ' + TREB_AMMO[k][0]);
    if (r) lines.push(r);
  }
  return false;
}
