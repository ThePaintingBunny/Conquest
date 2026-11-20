/*
 * Masters of the Sword (Hundred Kingdoms, Order of the Sword)
 *
 * Draw Event: when the regiment performs a Clash Action, compare its unmodified Clash with the target's highest
 * unmodified Clash (the regiment or a character with it). For each point by which it is greater, the regiment gains
 * one of: Flawless Strikes, Relentless Blows, or +1 Attacks. Chosen in the combat panel before the hit rolls; the
 * built-in opponent picks for itself. The gains last until the end of the round.
 *
 * In this file: MOS_SRC, mosOn(), mosClash(), mosPoints(), mosApply(), mosAiPick(), mosBox()
 */

const MOS_SRC = 'Masters of the Sword';

function mosOn(u) {
  return !!u && ((frEncy(u) || {}).draw || []).includes(MOS_SRC);
}

/* a regiment's unmodified Clash: its army list profile, or the higher of it and a character with it */
function mosClash(u) {
  const e = frEncy(u),
    own = e && e.stats && e.stats.C !== '-' ? +e.stats.C || 0 : +(u.stats || {}).C || 0;
  const ch = u.charName ? +(u.charStats || {}).C || 0 : 0;
  return Math.max(own, ch);
}

function mosPoints(A, T) {
  const e = frEncy(A),
    c = e && e.stats ? +e.stats.C || 0 : +(A.stats || {}).C || 0;
  return Math.max(0, c - mosClash(T));
}

/* picks: a list such as ['+1 Attacks', 'Relentless Blows'] */
async function mosApply(A, T, picks) {
  const rules = [],
    nA = picks.filter(p => p === '+1 Attacks').length;
  if (picks.includes('Flawless Strikes')) rules.push('Flawless Strikes');
  if (picks.includes('Relentless Blows')) rules.push('Relentless Blows');
  const txt = picks.length
    ? picks
        .reduce((o, p) => {
          const k = o.find(x => x[0] === p);
          if (k) k[1]++;
          else o.push([p, 1]);
          return o;
        }, [])
        .map(([p, n]) => (p === '+1 Attacks' && n > 1 ? '+' + n + ' Attacks' : p))
        .join(', ')
    : 'nothing';
  await putState({
    units: state.units.map(x => (x.id === A.id ? grantU(x, MOS_SRC, rules, nA ? { A: nA } : null) : x)),
    lastTitle: N(A.side) + ' · ' + MOS_SRC,
    lastText:
      (A.short || A.name) +
      ' (Clash ' +
      (+(frEncy(A) || {}).stats.C || 0) +
      ' against ' +
      mosClash(T) +
      ') gains ' +
      txt +
      ' until the end of the round.'
  });
  if (cb && cb.att === A.id && cb.tgt === T.id) {
    cb.mos = true;
    cb.groups = buildGroups(cb.type, byId(A.id), byId(T.id));
  }
  renderCombat();
}

/* the built-in opponent: more Attacks first, then whichever of the 1s rules suits the target's Defense */
function mosAiPick(A, T, n) {
  const D = +(T.stats || {}).D || 0,
    order = [
      '+1 Attacks',
      D >= 3 ? 'Flawless Strikes' : 'Relentless Blows',
      D >= 3 ? 'Relentless Blows' : 'Flawless Strikes'
    ];
  const out = [];
  for (let i = 0; i < n; i++) out.push(order[i] || '+1 Attacks');
  return out;
}

/* the choice in the combat panel, or null when there is nothing to choose; called before the rolls */
function mosBox(A, T) {
  if (!cb || cb.type !== 'clash' || cb.mos || cb.step !== 'att' || cb.dieFight) return null;
  if (!mosOn(A) || !T || T.side === A.side) return null;
  if (hasGrant(base(A.id), MOS_SRC)) {
    cb.mos = true;
    return null;
  }
  if ((cb.groups || []).some(g => g.rolls)) return null;
  const n = mosPoints(A, T);
  if (n <= 0) {
    cb.mos = true;
    setTimeout(
      () =>
        toast(
          MOS_SRC +
            ': its Clash ' +
            (+(frEncy(A) || {}).stats.C || 0) +
            ' is not higher than ' +
            mosClash(T) +
            ', no bonus.'
        ),
      30
    );
    return null;
  }
  if (!PVP() && A.side === AI) {
    cb.mos = true;
    mosApply(A, T, mosAiPick(A, T, n));
    return null;
  }
  cb.mosPicks = cb.mosPicks || [];
  const box = stepBox(MOS_SRC + ' (Draw Event)');
  box.classList.add('draw-step');
  const left = n - cb.mosPicks.length;
  box.appendChild(
    ptext(
      `Unmodified Clash ${(frEncy(A) || {}).stats.C} against ${mosClash(T)} (${T.short || T.name}): choose ${n} gain${n > 1 ? 's' : ''}` +
        (cb.mosPicks.length ? ` (chosen: ${cb.mosPicks.join(', ')}; ${left} left)` : '') +
        '. They last until the end of the round.'
    )
  );
  const row = document.createElement('div');
  row.className = 'row';
  ['Flawless Strikes', 'Relentless Blows', '+1 Attacks'].forEach(p => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.dataset.who = 'A';
    b.textContent = p;
    const already = p !== '+1 Attacks' && (cb.mosPicks.includes(p) || rh(RU(A), p));
    b.disabled = already || left <= 0;
    if (already) b.title = 'It already has ' + p;
    b.onclick = () => {
      cb.mosPicks.push(p);
      if (cb.mosPicks.length >= n) mosApply(A, T, cb.mosPicks);
      else renderCombat();
    };
    row.appendChild(b);
  });
  if (cb.mosPicks.length) {
    const u = document.createElement('button');
    u.type = 'button';
    u.className = 'btn ghost';
    u.dataset.who = 'A';
    u.textContent = 'Undo';
    u.onclick = () => {
      cb.mosPicks.pop();
      renderCombat();
    };
    row.appendChild(u);
  }
  box.appendChild(row);
  return box;
}
