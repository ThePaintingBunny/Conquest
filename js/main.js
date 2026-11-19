/*
 * Start-up
 *
 * Connects to the game state and draws the first frame. Loaded after everything else.
 */

(async () => {
  try {
    db = await window.claude?.use?.('db');
  } catch (e) {}
  try {
    window.claude
      ?.use?.('sample')
      .then(x => {
        sample = x;
      })
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
  db.doc('game/combat').onSnapshot(
    sn => {
      if (sn.exists && state && PVP()) onCombat(sn.data());
    },
    () => {}
  );
  const t = setTimeout(() => {
    $('phase').textContent = 'The game state is slow to load.';
  }, 10000);
  db.doc('game/state').onSnapshot(
    sn => {
      clearTimeout(t);
      if (sn.exists) {
        const prev = state;
        state = Object.assign({}, sn.data());
        if (!state.units) state.units = [];
        applySeat();
        if (PVP() && act && state.turn !== HU) {
          act = null;
          cb = null;
          charAct = null;
          setTimeout(() => toast('The host moved the turn on; your activation was dropped.'), 50);
          render();
        } else if (prev && PVP()) renderDiff(prev);
        else render();
      } else {
        state = { step: 'setup', units: [], vp: { cs: 0, nord: 0 }, round: 0, phase: 'New game' };
        applySeat();
        render();
      }
    },
    () => {
      clearTimeout(t);
      $('phase').textContent = 'The map stopped updating. Reload to reconnect.';
    }
  );
})();
