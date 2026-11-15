/*
 * Dweghom
 *
 * Creeds and Awakening.
 *
 * In this file: dwCreed(), awakenRules(), awaken0(), awaken()
 */

/* Dweghom */
function dwCreed(side) {
  const g = frG(side, 'dw');
  if (g.creed) return g.creed;
  const wl = (state.units || []).find(u => u.side === side && u.warlord);
  const w = (wl && wl.charName) || '';
  return /Lost Ancestor/.test(w)
    ? 'Ardent and Tempered'
    : /Hold Raegh/.test(w)
      ? 'Clan'
      : /Tempered/.test(w)
        ? 'Tempered'
        : /Ardent/.test(w)
          ? 'Ardent'
          : '';
}

function awakenRules(u) {
  return dwCreed(u.side) === 'Clan' && frRoles(u).includes('Clan') ? ['Oblivious', 'Iron Discipline'] : [];
}

async function awaken0(id, why) {
  const u = base(id);
  if (!u || hasGrant(u, 'Awakened')) return;
  const wasBroken = (u.effects || []).includes('Broken');
  await putState({
    units: state.units.map(x => {
      if (x.id !== id) return x;
      let y = grantU(x, 'Awakened', awakenRules(x));
      if (wasBroken) y = Object.assign({}, y, { effects: y.effects.filter(e => e !== 'Broken') });
      return y;
    }),
    lastTitle: N(u.side) + ' · ' + (u.short || u.name),
    lastText:
      'Awakened' +
      (why ? ' (' + why + ')' : '') +
      '. It cannot become Broken this round' +
      (wasBroken ? '; it Rallies at once.' : '.')
  });
}

async function awaken(id, why) {
  await awaken0(id, why);
  const u = base(id);
  try {
    await supOnAwaken(u);
  } catch (e) {}
  if (u && rh(u.rules, 'Testaments to Honor')) {
    for (const x of srFriends(u).filter(
      x => x.type !== 'monster' && frRoles(x).includes('Clan') && srNear(x, u, 6) && !hasGrant(x, 'Awakened')
    ))
      await awaken0(x.id, 'Testaments to Honor');
  }
}
