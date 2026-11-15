/*
 * Supremacy: choosing Prey
 *
 * For abilities that name a Prey: reading, offering and setting the Prey regiment.
 *
 * In this file: supPrey(), supPreyOpts(), supNeedPrey(), supSetPrey(), supPreySel()
 */

function supPrey(side) {
  const S = supOf(side);
  if (!S || !S.d.prey) return null;
  const id = S.g.prey,
    t = id && (state.units || []).find(x => x.id === id);
  return t && !t.destroyed ? t : null;
}

function supPreyOpts(side) {
  return (state.units || [])
    .filter(t => t.side !== side && t.type !== 'marker' && !t.destroyed)
    .sort((a, b) => (+b.points || 0) - (+a.points || 0));
}

function supNeedPrey(side) {
  const S = supOf(side);
  return !!(S && S.d.prey && !supPrey(side) && supPreyOpts(side).length);
}

function supSetPrey(side, id) {
  const S = supOf(side);
  if (!S) return;
  const t = byId(id);
  const sup = Object.assign({}, state.sup || {});
  sup[side] = Object.assign({}, sup[side] || {}, { prey: id });
  return putState({
    sup,
    lastTitle: WHO(side) + ' · The Big Game Hunt',
    lastText:
      'Prey marked: ' +
      (t ? t.short || t.name : id) +
      '. Friendly Clashes and Volleys against it count as Inspired and Taking Aim.'
  });
}

function supPreySel(side, lead) {
  const r = bEl('div', { className: 'tf-row' });
  const sel = document.createElement('select');
  sel.setAttribute('aria-label', 'Prey');
  const cur = supPrey(side);
  const o0 = document.createElement('option');
  o0.value = '';
  o0.textContent = cur ? 'Prey: ' + (cur.short || cur.name) : 'Choose the Prey…';
  sel.append(o0);
  supPreyOpts(side).forEach(t => {
    const o = document.createElement('option');
    o.value = t.id;
    o.textContent = (t.short || t.name) + (t.onTable ? '' : ' (off the table)');
    sel.append(o);
  });
  sel.onchange = () => {
    if (sel.value)
      Promise.resolve(supSetPrey(side, sel.value)).then(() => {
        if (state.step === 'supdecl') supNext();
      });
  };
  r.append(bEl('span', { className: 'tf-l', textContent: lead || 'The Big Game Hunt' }), sel);
  return r;
}
