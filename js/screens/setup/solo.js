/*
 * Setup: single player
 *
 * The setup screen for a game against the built-in opponent.
 *
 * In this file: spRevView, renderSetup()
 */

/* the review comes in two pages: 'armies' (both lists) and 'field' (the map with its settings beside it) */
let spRevView = 'armies';

function renderSetup(tb, info, mk, add) {
  if (state.step !== 'review') spRevView = 'armies';
  if (state.step === 'setup') {
    if (PVP()) return renderSetupPvp(tb, info, mk, add);
    info.textContent =
      'New game. Build your army here or paste one, then set up the built-in opponent.';
    const f = document.createElement('div');
    f.className = 'setupf';
    const lab = (t, el) => {
      const l = document.createElement('label');
      l.className = 'sf';
      const s = document.createElement('span');
      s.textContent = t;
      l.append(s, el);
      f.appendChild(l);
      return el;
    };
    const fac = lab(
      'Your faction',
      Object.assign(document.createElement('input'), {
        type: 'text',
        value: setupDraft.faction,
        placeholder: 'e.g. City States'
      })
    );
    fac.oninput = () => (setupDraft.faction = fac.value);
    const pts = lab(
      'Points',
      Object.assign(document.createElement('input'), {
        type: 'number',
        value: String(setupDraft.pts),
        min: '500',
        step: '50'
      })
    );
    pts.oninput = () => (setupDraft.pts = +pts.value || 2000);
    const aif = lab('Its faction', bEl('select', { className: 'tf-in' }));
    aif.append(bEl('option', { value: '', textContent: 'Random' }));
    ENCY.filter(x => x.units.some(u => u.kind === 'char')).forEach(x =>
      aif.append(bEl('option', { value: x.name, textContent: x.name }))
    );
    aif.value = setupDraft.aiFaction || '';
    aif.onchange = () => (setupDraft.aiFaction = aif.value);
    if (armyMode === 'paste') {
      const ta = document.createElement('textarea');
      ta.rows = 9;
      ta.value = setupDraft.list;
      ta.placeholder =
        'Paste a list copied from the Para Bellum app (its share or export text).';
      ta.oninput = () => (setupDraft.list = ta.value);
      lab('Your army list', ta).parentNode.classList.add('wide');
    }
    /* a Para Bellum list names its own faction and points */
    fac.parentNode.hidden = true;
    pts.parentNode.hidden = true;
    {
      if (!PN('cs') && savedName() && !state._pnTried) {
        state._pnTried = 1;
        putState({ players: Object.assign({}, state.players || {}, { cs: savedName() }) }).catch(() => {});
      }
      /* the lobby: you on the left, your opponent on the right, the battlefield and the next step between them */
      tb.classList.add('sp-lobby');
      add(spLobby(aif, mk));
    }
    const bwrap = bEl('section', { className: 'sp-build' });
    const addB = e => bwrap.appendChild(e);
    addB(bEl('h3', { className: 'sp-bh', textContent: 'Your army' }));
    armyModePicker(addB);
    addB(f);
    add(bwrap);
    if (armyMode === 'build')
      armyBuilder(
        addB,
        mk,
        () => {
          toast('Army saved. Now press Review both armies.');
        },
        'Check the list'
      );
    const bProbs = armyMode === 'build' ? bldProblems() : [];
    const bb = mk('Review both armies', async () => {
      if (armyMode === 'build' && bldProblems().length) {
        toast(bldProblems()[0]);
        return;
      }
      const built = armyMode === 'build' ? bldToList() : null;
      if (armyMode === 'build' && (!built || !built.units.length)) {
        toast('Add at least one regiment to your army first.');
        return;
      }
      if (armyMode === 'paste' && !setupDraft.list.trim()) {
        toast('Paste your army list first.');
        return;
      }
      if (armyMode === 'paste' && !pbLooks(setupDraft.list)) {
        toast(PB_ONLY);
        return;
      }
      aiBusy = true;
      aiStatus(armyMode === 'paste' ? 'Reading your Para Bellum list…' : 'Building the armies…');
      render();
      try {
        const mine = built || convertList(setupDraft.list);
        const P =
          built || mine.points ? Math.max(500, Math.round((built || mine).points / 50) * 50) : setupDraft.pts;
        aiStatus('Building the opponent’s army…');
        render();
        const theirs = botArmy(setupDraft.aiFaction, P);
        if (!theirs) throw { code: 'no army' };
        aiBusy = false;
        aiStatus('');
        await putState({
          scenario: scenId(),
          zones: scenOf().zones,
          botLevel: setupDraft.botLevel || 'normal'
        });
        await putState({
          step: 'review',
          terrain: genTerrain(),
          setup: { cs: mine, nord: theirs },
          names: {
            cs: String(mine.faction || setupDraft.faction || 'Your army'),
            nord: String(theirs.faction || setupDraft.aiFaction || 'Opponent')
          },
          phase: 'New game · Check both armies'
        });
      } catch (e) {
        aiBusy = false;
        aiStatus('');
        render();
        toast(
          e && e.code === 'not_pb'
            ? PB_ONLY
            : 'The armies could not be built (' + ((e && e.code) || 'error') + '). Try again.'
        );
      }
    });
    if (bProbs.length) {
      bb.disabled = true;
      bb.title = 'Fix your army first: ' + bProbs[0];
    }
    bb.classList.add('mp3-go');
    const slot = tb.querySelector('#sp-go');
    if (slot) slot.replaceWith(bb);
    else add(bb);
    return true;
  }
  if (state.step === 'review') {
    const S = state.setup || {};
    /* online, the host decides the scenario, the terrain and when the game starts; each player may still fix
       their own army */
    const guest = PVP() && !ovrHost();
    info.textContent = guest
      ? 'Check both armies; fix your own in its JSON box if something is off. The host chooses the scenario and terrain and starts the game.'
      : 'Check both armies. Fix any profile in the JSON boxes if something is off, then start the game.';
    const field = spRevView === 'field';
    tb.classList.add('sp-lobby');
    document.body.classList.add(field ? 'sp-field' : 'sp-rarm');
    const lw = bEl('div', { className: 'sp-lobby-in sp-review' + (field ? ' sp-rfield' : '') });
    {
      const prog = bEl('div', { className: 'mp3-prog' });
      [
        ['Armies', 1],
        ['Opponent', 1],
        ['Review armies', field ? 1 : 0],
        ['Battlefield', field ? 0 : -1],
        ['Battle', -1]
      ].forEach(([t, k]) =>
        prog.append(
          bEl('div', { className: 'mp3-st' + (k > 0 ? ' ok' : k === 0 ? ' now' : '') }, [
            bEl('i'),
            bEl('span', { textContent: (k > 0 ? '✓ ' : '') + t })
          ])
        )
      );
      lw.append(prog);
    }
    add(lw);
    const goField = () => {
      spRevView = 'field';
      render();
      scrollTo({ top: 0 });
    };
    const goArmies = () => {
      spRevView = 'armies';
      render();
      scrollTo({ top: 0 });
    };
    /* ---- page 1: both armies side by side ---- */
    if (!field) {
      info.textContent = guest
        ? 'Check both armies; fix your own in its JSON box if something is off. Then look at the battlefield.'
        : 'Check both armies. Fix any profile in the JSON boxes if something is off, then set up the battlefield.';
      const cols = bEl('div', { className: 'mp3-cols sp-rcols' }),
        left = PVP() ? seatSide() || 'cs' : HU,
        colOf = {};
      [left, other(left)].forEach(side => {
        const c = bEl('section', { className: 'mp3-p sp-army' + (side === left ? ' me' : ' opp') });
        c.style.setProperty('--pc', 'var(--' + side + ')');
        colOf[side] = c;
      });
      cols.append(colOf[left], colOf[other(left)]);
      lw.append(cols);
      ['cs', 'nord'].forEach(side => {
        const L = S[side] || { units: [] };
        const box = colOf[side];
        const mine = PVP() ? side === seatSide() : side === HU;
        const name = PVP()
          ? PN(side) || SEATNAME[side]
          : mine
            ? PN(side) || savedName() || 'You'
            : 'Built-in opponent';
        box.append(
          bEl('div', { className: 'mp3-ph' }, [
            bEl('span', { className: 'mp3-av', textContent: name.slice(0, 1).toUpperCase() }),
            bEl('div', { className: 'mp3-pn' }, [
              bEl('strong', { textContent: name }),
              bEl('span', {
                textContent:
                  (L.faction || N(side)) +
                  (L.points ? ' · ' + L.points.toLocaleString('en') + ' pts' : '') +
                  ' · ' +
                  SEATNAME[side]
              })
            ]),
            bEl('span', { className: 'mp3-chip ok', textContent: mine ? 'Your army' : 'Ready ✓' })
          ])
        );
        if ((L.armyRules || []).length) box.appendChild(ptext('Army rules: ' + L.armyRules.join(', '), 'hint'));
        const units = buildUnits(side, L);
        const sc = document.createElement('div');
        sc.className = 'rost-wrap';
        sc.appendChild(
          rosterTable(units, (i, v) => {
            if (guest && side !== seatSide()) {
              toast('Only that player (or the host) changes this army.');
              render();
              return;
            }
            const L2 = JSON.parse(JSON.stringify(L));
            if (L2.units[i]) L2.units[i].standardBearer = v;
            putState({ setup: Object.assign({}, state.setup, { [side]: L2 }) });
          })
        );
        box.appendChild(sc);
        if (guest && side !== seatSide()) return;
        const det = document.createElement('details');
        const sm = document.createElement('summary');
        sm.textContent = 'Edit as JSON';
        det.appendChild(sm);
        const ta = document.createElement('textarea');
        ta.rows = 10;
        ta.value = JSON.stringify(L, null, 1);
        ta.id = 'json-' + side;
        det.appendChild(ta);
        const sv = mk(
          'Apply changes',
          async () => {
            try {
              const v = JSON.parse(ta.value);
              const set = Object.assign({}, state.setup, { [side]: v });
              await putState({ setup: set });
            } catch (e) {
              toast('That JSON has an error: ' + e.message);
            }
          },
          true
        );
        det.appendChild(sv);
        box.appendChild(det);
      });
      const acts = bEl('div', { className: 'sp-racts' });
      acts.append(mk('← Change the armies', () => putState({ step: 'setup' }), true), mk('Next: the battlefield →', goField));
      acts.lastChild.classList.add('mp3-go');
      lw.append(acts);
      /* someone watching without a seat can look at both pages but not change the armies */
      if (PVP() && !seatSide()) acts.firstChild.disabled = true;
      return true;
    }
    /* ---- page 2: the map, with the scenario, terrain and Start in the column beside it ---- */
    info.textContent = guest
      ? 'The host chooses the scenario and terrain and starts the game.'
      : 'Choose the scenario and terrain, then start the game.';
    lw.append(
      bEl('div', { className: 'sp-rfhead' }, [
        bEl('h3', { className: 'sp-rh', textContent: 'Battlefield' }),
        bEl('p', {
          className: 'hint',
          textContent: guest
            ? 'This is the table you will play on. The host sets it up.'
            : 'This is the table you will play on. Change the scenario or terrain and the map updates as you go.'
        })
      ])
    );
    const side = bEl('section', { id: 'sp-fside', className: 'mb-side sp-fside' });
    side.setAttribute('aria-label', 'Battlefield settings');
    {
      const rc = document.querySelector('.rcol');
      if (rc) rc.prepend(side);
      else lw.append(side);
    }
    const addM = e => side.appendChild(e);
    if (guest) {
      addM(bEl('h3', { className: 'sp-rh', textContent: 'Battlefield' }));
      addM(
        ptext(
          'Scenario: ' +
            scenOf().name +
            ' · ' +
            (state.terrain || []).length +
            ' terrain pieces. Waiting for the host to start the game.',
          'hint'
        )
      );
      addM(mk('← Back to the armies', goArmies, true));
      return true;
    }
    scenarioPanel(addM, mk);
    terrainPanel(addM, mk);
    addM(
      mk('Start the game', async () => {
        const units = buildUnits('cs', S.cs || {})
          .concat(buildUnits('nord', S.nord || {}))
          .concat(markerUnits(scenId()));
        if (!units.length) {
          toast('There are no regiments to play with.');
          return;
        }
        spRevView = 'armies';
        await putState({
          units,
          army: { cs: (S.cs && S.cs.armyRules) || [], nord: (S.nord && S.nord.armyRules) || [] },
          round: 1,
          step: 'reinforce',
          turn: null,
          gid: 'g' + Date.now().toString(36),
          ready: {},
          reinfTurn: 'cs',
          chooser: null,
          vp: { cs: 0, nord: 0 },
          rl: { cs: 48, nord: 0 },
          aiStack: [],
          huStack: [],
          huHeld: null,
          huLastCard: null,
          strategicHeld: false,
          strategicUsedRound: 0,
          hammerUsed: false,
          moves: [],
          phase: 'Round 1 · Reinforcements',
          picks: {},
          zones: scenOf().zones,
          lastTitle: 'The armies take the field',
          lastText: `${N('cs')} against ${N('nord')} in ${scenOf().name}. Round 1 begins.`,
          maxRounds: +scenOf().rounds || 10
        });
        act = null;
        cb = null;
        selId = null;
      })
    );
    /* Start and Back stay at the foot of the column, in view while the settings scroll */
    const go = side.lastChild;
    go.classList.add('mp3-go');
    side.append(bEl('div', { className: 'sp-ffoot' }, [go, mk('← Back to the armies', goArmies, true)]));
    if (PVP() && !seatSide()) side.querySelectorAll('button').forEach(b => (b.disabled = true));
    return true;
  }
  return false;
}
