/*
 * Start-up
 *
 * Connects to the game state and draws the first frame. Loaded after everything else.
 */

(async () => {
  try {
    db = await window.claude?.use?.('db');
  } catch (e) {}
  /* the room carries live moves (never stored); a page that cannot join it uses game/live alone */
  try {
    window.claude
      ?.use?.('room')
      .then(r => liveRoomJoin(r))
      .catch(() => {});
  } catch (e) {}
  if (!db) {
    $('phase').textContent = 'Live game state unavailable in this view.';
    return;
  }
  try {
    usr = await window.claude?.use?.('user');
    realId = usr ? await usr.id() : null;
  } catch (e) {
    realId = null;
  }
  myId = realId;
  if (!myId) {
    try {
      myId = localStorage.getItem('vob-me');
      if (!myId) {
        myId = 'local-' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem('vob-me', myId);
      }
    } catch (e) {
      myId = null;
    }
  }
  try {
    myStk = JSON.parse(localStorage.getItem('vob-stack') || 'null');
  } catch (e) {}
  if (realId) {
    try {
      db.doc(stkPath()).onSnapshot(
        sn => {
          if (sn.exists) {
            myStk = Object.assign({}, sn.data());
            /* your own Command Stack: only the parts that show it */
            if (state)
              renderRemote(() => {
                renderTurnbar();
                renderCard();
                renderStrat();
              });
          }
        },
        () => {}
      );
    } catch (e) {}
  }
  db.doc('game/live').onSnapshot(
    sn => {
      if (sn.exists && state && PVP()) onLive(sn.data());
    },
    () => {}
  );
  try {
    db.doc('game/ruler').onSnapshot(
      sn => {
        if (sn.exists && state && PVP()) onRuler(sn.data());
      },
      () => {}
    );
    db.doc('game/roll').onSnapshot(
      sn => {
        if (sn.exists && state && PVP()) onRoll(sn.data());
      },
      () => {}
    );
    db.doc('game/anim').onSnapshot(
      sn => {
        if (sn.exists && state && PVP()) onAnim(sn.data());
      },
      () => {}
    );
    db.doc('game/arcs').onSnapshot(
      sn => {
        if (sn.exists && state && PVP()) onArcs(sn.data());
      },
      () => {}
    );
    db.doc('game/threat').onSnapshot(
      sn => {
        if (sn.exists && state && PVP()) onThreat(sn.data());
      },
      () => {}
    );
    db.doc('game/ping').onSnapshot(
      sn => {
        if (sn.exists && state && PVP()) onPing(sn.data());
      },
      () => {}
    );
  } catch (e) {}
  try {
    db.doc('game/lobby').onSnapshot(
      sn => {
        lobby = sn.exists ? Object.assign({}, sn.data()) : {};
        if (state) {
          try {
            /* presence pings arrive every few seconds: rebuild the menu only when who is here (or their seat or name)
               changed, never just for a new timestamp, so its dropdowns stay usable */
            const sig = lobbySig();
            if (sig !== lobbySeen) {
              lobbySeen = sig;
              if (mmCurrent()) renderRemote(renderMenu);
            }
            renderPresence();
          } catch (e) {}
        }
      },
      () => {}
    );
  } catch (e) {}
  /* a light "still here" signal for the online dot; it never redraws the page */
  setInterval(() => presencePing(), 20000);
  setTimeout(() => presencePing(), 1500);
  window.__presenceLeave = () => {
    try {
      if (!db || !myId) return;
      const d = db.doc('game/lobby'),
        v = { [myId]: { n: savedName() || '', t: 0, left: Date.now() } };
      if (typeof d.update === 'function') d.update(v).catch(() => {});
      else d.set(Object.assign({}, lobby, v)).catch(() => {});
    } catch (e) {}
  };
  window.addEventListener('pagehide', () => window.__presenceLeave());
  const t = setTimeout(() => {
    $('phase').textContent = 'The game state is slow to load.';
  }, 10000);
  /* the game log: every screen works the board out from the same ordered entries (online/net-state.js) */
  logStart(st => {
    clearTimeout(t);
    const prev = state;
    state = st;
    if (!state.units) state.units = [];
    applySeat();
    if (PVP() && act && state.turn !== HU && !(state.ovr && state.ovr.side === HU)) {
      act = null;
      cb = null;
      charAct = null;
      setTimeout(() => toast('The host moved the turn on; your activation was dropped.'), 50);
      render();
    } else if (prev && PVP()) renderDiff(prev);
    else render();
    /* online combat: the other side's step (its dice, its choice) arrived in the log */
    if (PVP() && state.cbBy && state.cbBy !== HU && (state.cbj || 'null') !== lastCbJson)
      onCombat({ by: state.cbBy, cb: state.cbj || 'null', pose: state.cbPose || 'null' });
  });
})();
