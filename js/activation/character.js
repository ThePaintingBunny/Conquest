/*
 * Character activations
 *
 * A character's own activation: committing its action and its panel.
 *
 * In this file: charCommit(), charAct, charActivate(), renderCharPanel()
 */

async function charCommit(id, extra) {
  extra = extra || {};
  const cUsed = (charAct && charAct.card) || null;
  charAct = null;
  if (!db) {
    toast('The board is read-only in this view.');
    return;
  }
  const u = base(id);
  const note = window.prompt ? null : null;
  const units = (state.units || []).map(x => {
    let y = x;
    if (x.id === id)
      y = Object.assign({}, y, {
        charActivated: true,
        /* "Pass (no action)" is not an Action, for Die Fighting */
        charActedR:
          extra.note === 'No action.'
            ? y.charActedR === (state.round || 1)
              ? y.charActedR
              : 0
            : state.round || 1
      });
    if (extra.target && x.id === extra.target && extra.effect)
      y = Object.assign({}, y, { effects: (y.effects || []).concat([extra.effect]) });
    return y;
  });
  const cnote = $('note') && $('note').value.trim();
  if (cUsed && yCard(cUsed)) {
    const k = cardIdeal(cUsed),
      cm =
        k && (/Daimyo/.test(u.charName || '') ? (u.daimyoIdeal || 'Ka') === k : frRoles(u, true).includes(k));
    const i = units.findIndex(x => x.id === id);
    /* a character activated by its own Ideal passes the effect to the regiment it is attached to */
    if (cm && i >= 0 && !hasGrant(units[i], 'Ideal Card: ' + k) && k !== 'Fu') {
      units[i] = grantU(units[i], 'Ideal Card: ' + k, IDEAL[k][1], IDEAL[k][2] || null);
      extra.note = (
        (extra.note || '') +
        ' Ideal Card ' +
        k +
        ': ' +
        IDEAL[k][0] +
        ' for ' +
        (u.short || u.name) +
        '.'
      ).trim();
    }
  }
  const stkP =
    u.side === ME && Array.isArray(PS().huStack)
      ? {
          huStack: (() => {
            if (cUsed && yCard(cUsed)) {
              const i = PS().huStack.indexOf(cUsed);
              return PS().huStack.filter((c, j) => j !== i);
            }
            const own = 'c:' + id,
              used = cUsed && cUsed !== own && cUsed[0] === 'c' ? cUsed : own;
            return PS()
              .huStack.filter(c => c !== used)
              .map(c => (c === own ? used : c));
          })(),
          huLastCard: 'c:' + id
        }
      : {};
  if (PVP() && stkP.huStack) await savePS(stkP);
  const next = Object.assign(
    {},
    state,
    ovrMine() ? { ovr: Object.assign({}, state.ovr, { n: (+state.ovr.n || 1) - 1 }) } : {},
    PVP() ? {} : stkP,
    {
      units,
      moves: [],
      lastTitle: N(u.side) + ' · ' + u.charName,
      lastText:
        'The ' +
        u.charName +
        ' activated (attached to ' +
        u.name +
        ').' +
        (extra.note ? ' ' + extra.note : '') +
        (cnote ? ' Note: ' + cnote : ''),
      phase: 'Round ' + (state.round || 1) + ' · ' + u.charName + ' activated',
      updatedBy: u.side,
      updatedAt: Date.now()
    }
  );
  try {
    await db.doc('game/state').set(sanitize(next));
    state = next;
    await db
      .collection('events')
      .doc('e' + Date.now())
      .set({
        at: Date.now(),
        side: u.side,
        character: u.charName,
        unit: id,
        kind: 'character',
        spell: extra.spell || null,
        target: extra.target || null,
        rolls: extra.rolls || null,
        success: extra.success ?? null
      });
    if (u.side === ME)
      toast(
        'The ' +
          u.charName +
          ' activated. If your next card is ' +
          u.name +
          ', activate it as an Entourage now.'
      );
    render();
  } catch (e) {
    toast('That could not be saved. Try again in a moment.');
  }
}

let charAct = null;

function charActivate(id, card) {
  if (PVP() && !myTurnPvp()) {
    toast('It is not your turn.');
    return;
  }
  charAct = { id, spell: 0, target: null, rolls: null, card: card || null };
  selId = id;
  render();
}

function renderCharPanel() {
  const box = $('c-char');
  if (!charAct || selId !== charAct.id) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  box.innerHTML = '';
  const u = byId(charAct.id),
    h = document.createElement('h3');
  h.textContent = u.charName + ' activation';
  box.appendChild(h);
  charAbilBox(u, box);
  duelBox(u, box);
  supCharBox(u, box);
  const row0 = document.createElement('div');
  row0.className = 'row';
  const pass = document.createElement('button');
  pass.type = 'button';
  pass.className = 'btn ghost';
  pass.textContent = 'Pass (no action)';
  pass.onclick = () => charCommit(charAct.id, { note: 'No action.' });
  const cl = document.createElement('button');
  cl.type = 'button';
  cl.className = 'btn ghost';
  cl.textContent = 'Cancel';
  cl.onclick = () => {
    charAct = null;
    render();
  };
  row0.append(pass, cl);
  const sps = spellsOf(u, true),
    lvl = magicLevel(u, true);
  if (sps.length && lvl) {
    if (!u.onTable) {
      box.appendChild(ptext('Not on the table yet, so no spells can be cast.'));
      box.appendChild(row0);
      return;
    }
    const sh = document.createElement('p');
    sh.className = 'hint';
    sh.textContent = 'Spellcasting (uses the character’s action):';
    box.appendChild(sh);
    charAct.cast = charAct.cast || [];
    spellBox(box, u, true, charAct, res => srCharCast(res));
  } else
    box.appendChild(
      ptext(
        chAbil(u).length
          ? 'No spells. Use an ability above, or pass.'
          : 'This Character has no spells to cast. Challenge a Duel above if an enemy character is in contact, or pass.'
      )
    );
  box.appendChild(row0);
}
