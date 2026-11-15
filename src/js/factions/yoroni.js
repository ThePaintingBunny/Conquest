/*
 * Yoroni
 *
 * Ideal Cards (matching and applying them), regiments without an Entourage and the Sui swap.
 *
 * In this file: noEntourage(), yAny(), yMatch(), yApply(), suiSwap(), suiRestore()
 */

function noEntourage(u) {
  return (
    (frFac(u) === 'Yoroni' && !upgOf(u, /Purification Rites/)) ||
    srHas(u, /^Primal Cacophony/) ||
    srHas(u, /Honor, a Void of Self/)
  );
}

function yAny(u) {
  return (
    (u.abilities || []).some(a => a[0] === 'Any Ideal Card') ||
    fxHas(u, /^Kabuki/) ||
    u.suiCmd === 'Kappa Bushi'
  );
}

function yMatch(u, k) {
  return (
    frRoles(u).includes(k) ||
    (u.charName ? frRoles(u, true).includes(k) : false) ||
    yAny(u) ||
    supIdealMatch(u, k)
  );
}

async function yApply(u, k) {
  if (!act || act.frIdeal) return;
  act.frIdeal = k;
  const match = yMatch(u, k) || (upgOf(u, /Ofuda/) && act.card && cardIdeal(act.card) === 'Mu');
  if (k === 'Ka' && rh(u.rules, 'Honor Beyond Death') && (base(u.id).effects || []).includes('Broken'))
    await putState({
      units: state.units.map(x =>
        x.id === u.id ? Object.assign({}, x, { effects: x.effects.filter(e => e !== 'Broken') }) : x
      ),
      lastTitle: N(u.side) + ' · Honor Beyond Death',
      lastText: 'Activated by a Ka Ideal Card: it is no longer Broken.'
    });
  if (!match || hasGrant(base(u.id), 'Ideal Card: ' + k)) {
    render();
    if (!match)
      toast('The ' + k + ' Ideal Card does not match ' + (u.short || u.name) + ': no Ideal effect.');
    return;
  }
  if (k === 'Fu') act.frFu = true;
  await grant(
    u.id,
    'Ideal Card: ' + k,
    IDEAL[k][1],
    IDEAL[k][2] || null,
    'Ideal Card ' + k + ': ' + IDEAL[k][0]
  );
}

/* Sui: the regiment swaps to another stand's Command rules until the end of the round (restored by frRoundEnd) */
function suiSwap(x, to) {
  const from = x.suiCmd || (x.mods || [])[0];
  if (!from || !CMDR[from] || !CMDR[to] || from === to) return x;
  const y = Object.assign({}, x),
    F = CMDR[from],
    T = CMDR[to];
  if (!x.suiSave)
    y.suiSave = {
      rules: x.rules.slice(),
      E: x.stats.E,
      prof: JSON.parse(JSON.stringify(x.modProfiles || {}))
    };
  const r = x.rules.slice();
  F.r.forEach(q => {
    const i = r.indexOf(q);
    if (i >= 0) r.splice(i, 1);
  });
  T.r.forEach(q => {
    if (!r.includes(q)) r.push(q);
  });
  y.rules = r;
  y.stats = Object.assign({}, x.stats, { E: (+x.stats.E || 0) - (F.E || 0) + (T.E || 0) });
  y.modProfiles = JSON.parse(JSON.stringify(x.modProfiles || {}));
  Object.values(y.modProfiles).forEach(m => {
    m.A = (+m.A || 0) - (F.A || 0) + (T.A || 0);
  });
  y.suiCmd = to;
  y.effects = (x.effects || []).filter(e => !/^Sui: /.test(e)).concat(['Sui: ' + to + ' Command rules']);
  return y;
}

function suiRestore(x) {
  if (!x.suiSave) return x;
  const y = Object.assign({}, x, {
    rules: x.suiSave.rules,
    stats: Object.assign({}, x.stats, { E: x.suiSave.E }),
    modProfiles: x.suiSave.prof
  });
  delete y.suiSave;
  delete y.suiCmd;
  y.effects = (y.effects || []).filter(e => !/^Sui: /.test(e));
  return y;
}
