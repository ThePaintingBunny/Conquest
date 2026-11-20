/*
 * Lobby and presence
 *
 * Who is in the lobby, whether the opponent is connected, and player names.
 *
 * In this file: pnDraft, lobby, presLast, presencePing(), lobbyPeople(), lobbyBox(), renderPresence(),
 *   savedName(), nameInput()
 */

let pnDraft = {};

let lobby = {},
  presLast = 0;

function presencePing(force) {
  if (!db || !myId || !state) return;
  const inMp = state.mode === 'pvp' || mmCurrent() === 'multi';
  if (!inMp) return;
  const now = Date.now();
  if (!force && now - presLast < 8000) return;
  presLast = now;
  const me = { n: savedName() || '', t: now, seat: seatSide() || null };
  const d = db.doc('game/lobby'),
    full = () => {
      try {
        d.set(Object.assign({}, lobby, { [myId]: me })).catch(() => {});
      } catch (e) {}
    };
  try {
    if (typeof d.update === 'function') d.update({ [myId]: me }).catch(full);
    else full();
  } catch (e) {
    full();
  }
}

function lobbyPeople() {
  const now = Date.now(),
    seats = (state && state.seats) || {},
    out = [];
  Object.entries(lobby || {}).forEach(([id, v]) => {
    if (!v || typeof v !== 'object') return;
    const seat = seats.cs === id ? 'cs' : seats.nord === id ? 'nord' : null;
    out.push({
      id,
      left: !!v.left,
      name: v.n || (seat && PN(seat)) || '',
      seat,
      online: now - (+v.t || 0) < 25000,
      me: id === myId
    });
  });
  ['cs', 'nord'].forEach(sd => {
    const id = seats[sd];
    if (id && !out.some(p => p.id === id))
      out.push({ id, name: PN(sd) || '', seat: sd, online: false, me: id === myId });
  });
  return out.sort(
    (a, b) =>
      (a.seat ? 0 : 1) - (b.seat ? 0 : 1) ||
      (a.seat || '').localeCompare(b.seat || '') ||
      String(a.name).localeCompare(String(b.name))
  );
}

function lobbyBox() {
  const box = bEl('div', { className: 'mm-net mm-ppl' });
  box.append(bEl('h3', { textContent: 'In the lobby' }));
  const L = lobbyPeople().filter(p => p.online || p.seat);
  if (!L.length) box.append(bEl('p', { className: 'hint', textContent: 'Nobody else is here yet.' }));
  L.forEach(p => {
    const r = bEl('div', { className: 'mm-pp' });
    r.append(
      bEl('span', {
        className: 'nb-dot ' + (p.online ? 'on' : 'off'),
        title: p.online ? 'Connected' : 'Not connected'
      }),
      bEl('strong', { textContent: (p.name || 'Unnamed player') + (p.me ? ' (you)' : '') }),
      bEl('span', {
        className: 'ab-note',
        textContent: p.seat
          ? (p.seat === 'cs' ? 'South edge' : 'North edge') +
            ' · ' +
            colName(p.seat) +
            ((state.setup || {})[p.seat] ? ' · army ready' : '')
          : 'watching'
      }),
      bEl('span', {
        className: 'ab-note',
        textContent: p.online ? 'connected' : p.left ? 'left' : 'not connected'
      })
    );
    box.append(r);
  });
  box.append(
    bEl('p', {
      className: 'hint',
      textContent: 'Anyone else who opens the invite link can watch the game without taking a seat.'
    })
  );
  return box;
}

/* the opponent's connection, shown during an online game */
function renderPresence() {
  const el0 = $('pres');
  if (!el0) return;
  if (!state || !PVP() || !seatSide() || mmCurrent()) {
    el0.hidden = true;
    return;
  }
  const opp = seatSide() === 'cs' ? 'nord' : 'cs',
    id = (state.seats || {})[opp];
  const v = id && lobby[id];
  const on = !!(v && Date.now() - (+v.t || 0) < 25000);
  const watch = lobbyPeople().filter(p => !p.seat && p.online).length;
  el0.hidden = false;
  el0.innerHTML = '';
  el0.append(
    bEl('span', { className: 'nb-dot ' + (on ? 'on' : 'off') }),
    document.createTextNode(
      (PN(opp) || 'Opponent') +
        (id ? (on ? ' connected' : v && v.left ? ' has left' : ' not connected') : ' — seat open') +
        (watch ? ' · ' + watch + ' watching' : '')
    )
  );
}

function savedName() {
  try {
    return localStorage.getItem('conquest-player-name') || '';
  } catch (e) {
    return '';
  }
}

function nameInput(side, label, editable) {
  const w = bEl('label', { className: 'pn-in' });
  w.append(bEl('span', { className: 'tf-l', textContent: label }));
  const i = bEl('input', {
    type: 'text',
    id: 'pn-' + side,
    maxLength: 24,
    value: pnDraft[side] != null ? pnDraft[side] : PN(side),
    placeholder: editable ? 'Type a name' : 'No name yet'
  });
  i.disabled = !editable;
  i.setAttribute('autocomplete', 'nickname');
  const commit = () => {
    const v = i.value.trim().slice(0, 24);
    delete pnDraft[side];
    if (v === PN(side)) return;
    try {
      localStorage.setItem('conquest-player-name', v);
    } catch (e) {}
    if (PVP())
      stateUpdate({ players: { [side]: v }, updatedAt: Date.now() }).catch(() =>
        toast('The name could not be saved.')
      );
    else putState({ players: Object.assign({}, state.players || {}, { [side]: v }) });
  };
  i.oninput = () => {
    pnDraft[side] = i.value;
  };
  i.onchange = commit;
  i.onkeydown = e => {
    if (e.key === 'Enter') i.blur();
  };
  w.append(i);
  return w;
}
