/*
 * Shared combat
 *
 * Online combat where each side rolls its own dice. Each step travels as an entry in the game log.
 *
 * In this file: cbSync(), onCombat(), cbWho(), cbGate()
 */

/* shared combat: each side rolls its own dice */
function cbSync() {
  if (!PVP() || !db) return;
  const v = JSON.stringify(cb || null);
  if (v === lastCbJson) return;
  lastCbJson = v;
  const pose = act && cb ? { id: act.id, pose: act.pose } : null;
  /* a step of the combat is an entry in the game log, so both screens see the steps in the same order as
     everything else; the board keeps it too, so a page opened mid-combat picks it up */
  const f = { cbj: v, cbBy: HU, cbPose: JSON.stringify(pose) };
  if (state) Object.assign(state, f);
  logAppend(f, {
    k: 'combat-step',
    l: cb ? 'Combat: ' + (cb.type || '') + ' · ' + (cb.step || '') : 'Combat closed'
  });
}

function onCombat(d) {
  if (!d || d.by === HU) return;
  lastCbJson = d.cb || 'null';
  let c = null;
  try {
    c = JSON.parse(lastCbJson);
  } catch (e) {}
  try {
    const p = JSON.parse(d.pose || 'null');
    if (p && p.id && !(act && act.id === p.id)) ract = p;
  } catch (e) {}
  if (!c && cb && cb.owner === HU) return;
  cb = c;
  renderCombat();
  drawBoard();
  renderRemote(renderCard);
}

function cbWho() {
  if (!PVP() || !cb) return null;
  const A = base(cb.att),
    T = cb.tgt ? base(cb.tgt) : null;
  return { A: !!A && A.side === HU, T: !!T && T.side === HU, O: cb.owner === HU };
}

function cbGate() {
  const w = cbWho();
  if (!w) {
    $('cb-close').hidden = false;
    return;
  }
  const body = $('cb-body');
  const whoSide = {
    A: cb.att && base(cb.att) ? base(cb.att).side : other(HU),
    T: cb.tgt && base(cb.tgt) ? base(cb.tgt).side : other(HU),
    O: other(HU)
  };
  body.querySelectorAll('[data-who]').forEach(e => {
    if (w[e.dataset.who]) return;
    e.disabled = true;
    if (e.tagName === 'BUTTON') {
      e.hidden = true;
      if (!e.parentNode.querySelector('.waitp')) {
        const p = ptext(
          e.dataset.who === 'O'
            ? 'Waiting for ' + N(whoSide.O) + ' to record the result.'
            : 'Waiting for ' + N(whoSide[e.dataset.who]) + ' to roll.'
        );
        p.classList.add('waitp');
        e.after(p);
      }
    }
  });
  $('cb-close').hidden = !w.O;
}
