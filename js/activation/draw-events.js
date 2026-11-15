/*
 * Draw Events
 *
 * Draw Events and other effects that happen at the start of an activation.
 *
 * In this file: drawEvents()
 */

/* Draw Events and start-of-activation effects */
function drawEvents(u) {
  const notes = [];
  if (act && act.id === u.id && act.entering) {
    act.drawNotes = [];
    return;
  }
  const bas = (u.abilities || [])
    .concat(fx(u).map(x => [x]))
    .map(a => String(a[0]).match(/^Bastion\s*\((\d+)\)/))
    .find(Boolean);
  if (bas) {
    act.extraFx.push('Bastion (' + bas[1] + ')');
    notes.push('Bastion: +' + bas[1] + ' Defense until the end of the round');
  }
  let heal = 0,
    cheal = 0;
  const chPre = u.charName ? 'The ' + u.charName + ':' : '\u0000';
  const reg = (u.abilities || [])
    .filter(a => !String(a[0]).startsWith(chPre))
    .concat(fx(u).map(x => [x]))
    .concat(
      fodder6(u) && (u.abilities || []).some(a => /^Regeneration/.test(a[0])) ? [['Regeneration (+4)']] : []
    )
    .map(a => String(a[0]).match(/^Regeneration\s*\(\+?(\d+)\)/))
    .filter(Boolean)
    .sort((a, b) => b[1] - a[1])[0];
  if (u.charName) {
    const cr = chRulesX(u)
      .concat(
        (u.abilities || [])
          .filter(a => String(a[0]).startsWith(chPre))
          .map(a => String(a[0]).slice(chPre.length).trim())
      )
      .map(x => String(x).match(/^Regeneration\s*\(\+?(\d+)\)/))
      .filter(Boolean)
      .sort((a, b) => b[1] - a[1])[0];
    if (cr) cheal = +cr[1];
  }
  if (reg) heal += +reg[1];
  const fh = frHeal(u);
  if (fh) {
    heal += fh;
    notes.push('Underspire Regeneration (+' + fh + ')');
  }
  if (u.charName && upgOf(u, /Biotic Renewal/)) {
    heal += 3;
    notes.push('Biotic Renewal: heals 3');
  }
  if (act && act.id === u.id && glacialOn(u) && !act.extraFx.includes('Decay (Glacial Presence)')) {
    act.extraFx.push('Decay (Glacial Presence)');
    notes.push('Glacial Presence: Decay until the end of the round');
  }
  if (u.charName && upgOf(u, /Ferro-Ossified Carapace/) && act && act.id === u.id) {
    act.extraFx.push('Hardened (1) (Ferro-Ossified Carapace)');
    notes.push('Ferro-Ossified Carapace: Hardened (1) until the end of the round');
  }
  if (heal && !canHeal(u)) {
    notes.push(srHas(u, /^Primal Cacophony/) ? 'Primal Cacophony: it cannot Heal' : 'Broken: it cannot Heal');
    heal = 0;
  }
  if (cheal && !canHeal(u)) cheal = 0;
  /* Seed of Spring/Summer/Autumn/Winter (Weaver Courts Gifts): in that Season its regiment of that Court gains a Seed
     Marker at the start of its Draw Event step */
  let seedUp = 0;
  {
    const m =
      u.charName && (u.abilities || []).map(a => String(a[0]).match(/: Seed of (\w+)$/)).find(Boolean);
    if (
      m &&
      seasonNow(u.side) === m[1] &&
      frRoles(u).includes('Court of ' + m[1]) &&
      (+u.seeds || 0) < 3 &&
      !(act && act.seedOf)
    ) {
      seedUp = 1;
      if (act) act.seedOf = true;
      notes.push('Seed of ' + m[1] + ': gains a Seed Marker (' + ((+u.seeds || 0) + 1) + ')');
    }
  }
  if ((heal && (u.wounds || 0) > 0) || (cheal && (+u.charWounds || 0) > 0)) {
    const h = Math.min(heal, u.wounds || 0),
      hc = Math.min(cheal, +u.charWounds || 0);
    const units = (state.units || []).map(x =>
      x.id !== u.id
        ? x
        : Object.assign({}, x, {
            wounds: (x.wounds || 0) - h,
            charWounds: Math.max(0, (+x.charWounds || 0) - hc),
            seeds: Math.min(3, (+x.seeds || 0) + seedUp)
          })
    );
    putState({
      units,
      lastTitle: N(u.side) + ' · ' + u.name,
      lastText: `Draw Event: heals ${h + hc} wound${h + hc > 1 ? 's' : ''}${hc ? ' (' + hc + ' on the ' + u.charName + ')' : ''}.`
    }).catch(() => {});
    notes.push(
      'heals ' +
        (h + hc) +
        ' wound' +
        (h + hc > 1 ? 's' : '') +
        (hc ? ' (' + hc + ' on the ' + u.charName + ')' : '')
    );
  } else if (seedUp)
    putState({
      units: state.units.map(x =>
        x.id === u.id ? Object.assign({}, x, { seeds: Math.min(3, (+x.seeds || 0) + 1) }) : x
      )
    }).catch(() => {});
  if (hasDraw(u, /^Double Time/)) notes.push('Double Time: after two Marches, take a free third March');
  if (act && act.id === u.id) act.drawNotes = notes.slice();
  if (notes.length) toast('Draw Events: ' + notes.join(' · ') + '.');
  // Aura of Death from engaged enemies
  const me = byId(u.id);
  if (!me || !me.onTable) return;
  const mc = corners(me);
  let first = null,
    tot = 0;
  if (fxHas(me, /^(Cure|Oathstone)/)) return;
  engaged(me).forEach(e => {
    const heph = engaged(e).some(o => {
      const x = typeof o === 'string' ? byId(o) : o;
      return x && x.side !== e.side && upgOf(x, /Hephaestian Alloys/);
    });
    const X = Math.max(0, rx(RU(e), 'Aura of Death') - (heph ? 4 : 0));
    if (!X) return;
    const k = standsOf(e).filter(st => polyDist(st.poly, mc) <= 0.35).length;
    const per = e.type === 'monster' ? X : Math.min(4, X);
    if (k) {
      tot += per * k;
      if (!first) first = e;
    }
  });
  if (tot && first && act && act.id === u.id)
    act.drawNotes = (act.drawNotes || []).concat([
      'Aura of Death from ' + (first.short || first.name) + ': ' + tot + ' Hits'
    ]);
  if (tot && first)
    setTimeout(
      () =>
        openCombat({
          type: 'lethal',
          att: first.id,
          tgt: u.id,
          inAct: false,
          lethalHits: tot,
          lethalX: 0,
          lethalLost: 0,
          selfTitle: 'Aura of Death',
          selfText: `${me.short || me.name} starts its activation in contact with an Aura of Death and suffers ${tot} Hits. No Morale Tests.`
        }),
      50
    );
}
