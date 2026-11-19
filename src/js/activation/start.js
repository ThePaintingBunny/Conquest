/*
 * Starting an activation
 *
 * Begins a regiment's activation.
 *
 * In this file: startActivation()
 */

function startActivation(id, source, card) {
  if (PVP() && !myTurnPvp()) {
    toast('It is not your turn.');
    return;
  }
  if (source === 'strategic' && base(id) && base(id).side === HU && stratWhy()) {
    toast(stratWhy());
    return;
  }
  const u = base(id),
    G = geom(u);
  const entering = !u.onTable;
  act = {
    id,
    source,
    card: card || null,
    entering,
    placed: false,
    snap: { units: state.units, fr: state.fr || null, sup: state.sup || null },
    actions: [],
    cur: null,
    arrivedThisRound: !!u.arrivedRound && u.arrivedRound === state.round,
    pose: entering
      ? Object.assign({ onTable: true, x: 36, files: G.files }, ownEntry(u.side, G.d))
      : { x: u.x, y: u.y, facing: u.facing || 0, files: G.files },
    extraFx:
      source === 'strategic' || (source === 'entourage' && ordersU(u))
        ? (hasRule(u, /Automaton/)
            ? []
            : [source === 'entourage' ? 'Inspired (Direct Orders)' : 'Inspired (Strategic Stack)']
          )
            .concat(u.strategicFx || [])
            .concat(
              /Infantry|Cavalry/.test(u.cls || '') && supOn(u.side, 'Hammer and Anvil')
                ? ['Shock (Hammer and Anvil)']
                : []
            )
            .concat(
              /Infantry/.test(u.cls || '') &&
                !phalanx(u) &&
                all().some(x => x.side === u.side && !x.destroyed && upgOf(x, /Expert Scouts/))
                ? ['Vanguard (3) (Expert Scouts)']
                : []
            )
            .concat(
              supOn(u.side, 'Bringing Back the Children of Fire') && frRoles(u).includes('Titan')
                ? ['Children of Fire (counts as 6 stands for Seizing)']
                : []
            )
        : []
  };
  selId = id;
  rightTab = 'reg';
  render();
  drawEvents(u);
  if (card && yCard(card) && frFac(u) === 'Yoroni') {
    const k = cardIdeal(card);
    if (fxHas(u, /^Ideal Card: Fu \(/)) act.frFu = true;
    if (k && !(k === 'Mu' && upgOf(u, /Ofuda/)))
      setTimeout(() => {
        if (act && act.id === id && !act.frIdeal) yApply(byId(id), k);
      }, 60);
  }
}
