/*
 * Setup: game against Claude
 *
 * The setup screen for a single-player game.
 *
 * In this file: renderSetup()
 */

function renderSetup(tb, info, mk, add) {
  if (state.step === 'setup') {
    if (PVP()) return renderSetupPvp(tb, info, mk, add);
    info.textContent =
      'New game. Build your army here or paste a list for Claude to read, and Claude will design its own army to play against you.';
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
    const aif = lab(
      "Claude's faction",
      Object.assign(document.createElement('input'), {
        type: 'text',
        value: setupDraft.aiFaction,
        placeholder: 'Leave empty to let Claude choose'
      })
    );
    aif.oninput = () => (setupDraft.aiFaction = aif.value);
    if (armyMode === 'paste') {
      const ta = document.createElement('textarea');
      ta.rows = 9;
      ta.value = setupDraft.list;
      ta.placeholder = 'Paste your list here: characters, regiments, stands, options and upgrades.';
      ta.oninput = () => (setupDraft.list = ta.value);
      lab('Your army list', ta).parentNode.classList.add('wide');
    } else {
      fac.parentNode.hidden = true;
      pts.parentNode.hidden = true;
    }
    {
      const cr = bEl('div', { className: 'tf-row col-row' });
      if (!PN('cs') && savedName() && !state._pnTried) {
        state._pnTried = 1;
        putState({ players: Object.assign({}, state.players || {}, { cs: savedName() }) }).catch(() => {});
      }
      /* one card per side: who you are and what Claude plays */
      cr.className = 'side-cards';
      const you = bEl('section', { className: 'side-card cs' }, [bEl('h4', { textContent: 'You' })]);
      you.append(nameInput('cs', 'Your name', true), colorPicker('cs', 'Your colour', true));
      const them = bEl('section', { className: 'side-card nord' }, [bEl('h4', { textContent: 'Claude' })]);
      them.append(colorPicker('nord', "Claude's colour", true), aif.parentNode);
      cr.append(you, them);
      add(cr);
    }
    armyModePicker(add);
    add(f);
    if (armyMode === 'build')
      armyBuilder(
        add,
        mk,
        () => {
          toast('Army saved. Now press Build both armies.');
        },
        'Check the list'
      );
    add(
      mk('Build both armies', async () => {
        const built = armyMode === 'build' ? bldToList() : null;
        if (armyMode === 'build' && (!built || !built.units.length)) {
          toast('Add at least one regiment to your army first.');
          return;
        }
        if (armyMode === 'paste' && !setupDraft.list.trim()) {
          toast('Paste your army list first.');
          return;
        }
        if (!sample) {
          toast('Claude is not available in this view, so the armies cannot be built here.');
          return;
        }
        aiBusy = true;
        aiStatus('Claude is reading your list…');
        render();
        try {
          const mine = built || (await convertList(setupDraft.list, setupDraft.faction, setupDraft.pts));
          aiStatus('Claude is designing its army…');
          render();
          const theirs = await designList(
            setupDraft.aiFaction,
            built ? Math.max(500, Math.round(built.points / 50) * 50) : setupDraft.pts,
            mine.faction || setupDraft.faction
          );
          aiBusy = false;
          aiStatus('');
          await putState({ scenario: scenId(), zones: scenOf().zones });
          await putState({
            step: 'review',
            terrain: genTerrain(),
            setup: { cs: mine, nord: theirs },
            names: {
              cs: String(mine.faction || setupDraft.faction || 'Your army'),
              nord: String(theirs.faction || setupDraft.aiFaction || 'Claude')
            },
            phase: 'New game · Check both armies'
          });
        } catch (e) {
          aiBusy = false;
          aiStatus('');
          render();
          toast(
            e && e.code === 'not_granted'
              ? 'Claude was not allowed to run, so the armies were not built.'
              : 'Claude could not build the armies (' + ((e && e.code) || 'error') + '). Try again.'
          );
        }
      })
    );
    return true;
  }
  if (state.step === 'review') {
    const S = state.setup || {};
    info.textContent =
      'Check both armies. Fix any profile in the JSON boxes if something is off, then start the game.';
    ['cs', 'nord'].forEach(side => {
      const L = S[side] || { units: [] };
      const box = document.createElement('div');
      box.className = 'rev';
      const h = document.createElement('h3');
      h.textContent =
        (PVP()
          ? side === HU && seatSide()
            ? 'Your army: '
            : (side === 'cs' ? 'South' : 'North') + ' army: '
          : side === HU
            ? 'Your army: '
            : 'Claude’s army: ') +
        (L.faction || N(side)) +
        (L.points ? ' · ' + L.points + ' points' : '');
      box.appendChild(h);
      if ((L.armyRules || []).length) box.appendChild(ptext('Army rules: ' + L.armyRules.join(', ')));
      const units = buildUnits(side, L);
      const sc = document.createElement('div');
      sc.className = 'rost-wrap';
      sc.appendChild(
        rosterTable(units, (i, v) => {
          const L2 = JSON.parse(JSON.stringify(L));
          if (L2.units[i]) L2.units[i].standardBearer = v;
          putState({ setup: Object.assign({}, state.setup, { [side]: L2 }) });
        })
      );
      box.appendChild(sc);
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
      add(box);
    });
    scenarioPanel(add, mk);
    terrainPanel(add, mk);
    add(
      mk('Start the game', async () => {
        const units = buildUnits('cs', S.cs || {})
          .concat(buildUnits('nord', S.nord || {}))
          .concat(markerUnits(scenId()));
        if (!units.length) {
          toast('There are no regiments to play with.');
          return;
        }
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
          maxRounds: 10
        });
        act = null;
        cb = null;
        selId = null;
      })
    );
    add(mk('Back', () => putState({ step: 'setup' }), true));
    if (PVP() && !seatSide()) {
      tb.querySelectorAll('button').forEach(b => (b.disabled = true));
    }
    return true;
  }
  return false;
}
