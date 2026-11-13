/* Start-up: connects to the game state and draws the first frame. Loaded last. */
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
            if (state) render();
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
            renderMenu();
            renderPresence();
          } catch (e) {}
        }
      },
      () => {}
    );
  } catch (e) {}
  setInterval(() => presencePing(), 10000);
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
        state = Object.assign({}, sn.data());
        if (!state.units) state.units = [];
        applySeat();
        if (PVP() && act && state.turn !== HU) {
          act = null;
          cb = null;
          charAct = null;
          setTimeout(() => toast('The host moved the turn on; your activation was dropped.'), 50);
        }
        render();
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
/* debug hook for the automated tests */
try {
  Object.defineProperty(window, '__sr', {
    value: {
      fx,
      dRules,
      RU,
      rlCompute,
      decayN,
      srChargeBonus,
      srMarchMod,
      vgOf,
      buildGroups,
      hitMods,
      defInfo,
      moraleInfo,
      inspWhy,
      aimWhy,
      sanitize,
      regOptions,
      withBld,
      joinable,
      wbProblems,
      bldToList,
      availableActions,
      startActivation,
      startAction,
      moraleInfo,
      hitMods,
      layout,
      offNames,
      offOn,
      getAct: () => act,
      getCb: () => cb,
      srOnCharge,
      saveActivation,
      qaChars,
      cardName,
      runAITurn,
      frOptions,
      frRoles,
      chAbil,
      cardIdeal,
      yMatch,
      breakCheck,
      frRoundEnd,
      noEntourage,
      openCombat,
      hasBarrage,
      resolveSpell,
      spellsOf,
      calcBuild,
      calcPlace,
      calcSandbox,
      calcAttack,
      whoami: () => myId,
      lobbyNow: () => lobby,
      presencePing,
      arcingWhy,
      friendSees,
      fxBarrage,
      encyOpt,
      chRulesX,
      volleyRange,
      UPG: () => UPG,
      buildUnits,
      ENCY: () => ENCY,
      rx,
      rh,
      RU,
      volleyArcSpan,
      volleyStands,
      volleyWhy,
      buildGroups,
      qaList,
      qaSpecOf,
      qaClean,
      tfRebuild,
      standsOf,
      render: () => render(),
      planCharge,
      chargeFaces,
      placeCharge,
      corners,
      polyDist,
      geom,
      live,
      lostOf,
      contactKeep,
      byId,
      base,
      chargeMax,
      srSeizeStands,
      zoneControl,
      seizeVal,
      sanitize,
      srStat,
      prof,
      canHeal,
      noEntourage,
      hitSources,
      rrPlan,
      srOnCharge,
      srChantBonus,
      frRoundOptions,
      srActions,
      availableActions,
      getQ: () => cbQueue,
      validCards,
      cardAvail,
      cardPick,
      effStats,
      effRules,
      baseRules,
      layout,
      slayChar,
      glimApply,
      mwExtra,
      defInfo,
      frRoles,
      supRoles,
      supMem,
      supOf,
      supOptions,
      supChoiceNeeded,
      aolTry,
      supBloom,
      glimmerN,
      seasonNow,
      aiDuel,
      startAction,
      mmSides,
      privOk,
      fodder6,
      srStrain,
      frontArcHas,
      duelist,
      duelTargets,
      duelOdds,
      duelStrike,
      isMChar,
      getCb: () => cb,
      setCb: v => {
        cb = v;
      },
      setAct: v => {
        act = v;
      },
      getState: () => state,
      setState: v => {
        state = v;
      }
    },
    configurable: true
  });
} catch (e) {}
