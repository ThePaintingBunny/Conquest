/*
 * Broken and Shattered
 *
 * Checks after every change whether a regiment becomes Broken or Shattered (core rules), with the rules
 * that prevent it.
 *
 * In this file: quietBreak, breakImmune(), shatterImmune(), breakCheck()
 */

/* Broken and Shattered (core rules): losing half or more (rounded up) of the stands it had at the start of the round, or since it last Rallied, Breaks a regiment at once;
   once Broken, losing half or more of the stands it had at that moment Shatters it. Characters count as stands. Both can happen in one action. */
let quietBreak = false;

function breakImmune(y) {
  return (
    rh(y.rules || [], 'Dauntless') ||
    noBreak(y) ||
    rh(y.rules || [], 'Life for Glory') ||
    (rh(y.rules || [], 'In the Fold') && srAllMods(y, /Origami/))
  );
}

function shatterImmune(y) {
  const t = (y.rules || [])
    .concat(
      (y.abilities || []).map(a => a[0] + ' ' + a[1]),
      fx(y)
    )
    .join(' | ');
  return (
    frFac(y) === 'Dweghom' ||
    /cannot be Shattered|Written in Bones/i.test(t) ||
    supHasK(y.side, 'For All Mankind')
  );
}

function breakCheck(old, st) {
  const O = new Map(((old && old.units) || []).map(u => [u.id, u])),
    rnd = st.round || 0,
    notes = [];
  st.units = st.units.map(u => {
    if (u.type === 'marker' || !u.onTable || u.destroyed) return u;
    let y = u;
    const n = live(y),
      o = O.get(y.id);
    const wasBroken = !!(o && (o.effects || []).includes('Broken')),
      isBroken = (y.effects || []).includes('Broken');
    if (y.rsRound !== rnd || y.rs == null) {
      const n0 = o && o.onTable && !o.destroyed ? live(o) : n;
      y = Object.assign({}, y, { rs: n0, rsRound: rnd, broke: isBroken ? n0 : null });
    }
    if (wasBroken && !isBroken) y = Object.assign({}, y, { rs: n, broke: null });
    if (isBroken && y.broke == null) y = Object.assign({}, y, { broke: o && wasBroken ? live(o) : n });
    const rs = +y.rs || n;
    const paper =
        (y.suiCmd || (y.mods || [])[0]) === 'Origami Warriors'
          ? removalSeq(y)
              .slice(0, lostOf(y))
              .filter(i => /Origami/.test((y.mods || [])[i] || '')).length
          : 0,
      nb = n + paper;
    if (!isBroken && rs > 1 && rs - nb >= Math.ceil(rs / 2) && !breakImmune(y)) {
      if (Array.isArray(y.mods) && y.mods.length && !y.enlUsed) {
        y = Object.assign({}, y, { enlUsed: true, rs: n, rsRound: rnd });
        notes.push((y.short || y.name) + ' is Enlightened: instead of breaking it Rallies (once per battle)');
      } else {
        const at = rs - Math.ceil(rs / 2);
        y = Object.assign({}, y, { effects: (y.effects || []).concat(['Broken']), broke: at });
        notes.push((y.short || y.name) + ' is Broken');
      }
    }
    if (
      (y.effects || []).includes('Broken') &&
      y.broke != null &&
      y.broke >= 1 &&
      y.broke - n >= Math.ceil(y.broke / 2) &&
      !shatterImmune(y)
    ) {
      y = Object.assign({}, y, {
        onTable: false,
        destroyed: true,
        status: 'Shattered',
        destroyedRound: rnd,
        dyingFight: false
      });
      notes.push((y.short || y.name) + ' is Shattered and flees the field');
    }
    return y;
  });
  if (notes.length && !quietBreak) {
    st.lastText = (st.lastText ? st.lastText + ' ' : '') + notes.join('. ') + '.';
    setTimeout(() => toast(notes.join(' · ') + '.'), 80);
  }
}
