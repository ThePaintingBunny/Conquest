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
      'New game. Build your army here or paste one, then choose your opponent: the built-in opponent (free, works offline) or Claude.';
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
    const useClaude = setupDraft.aiPlayer === 'claude';
    const aif = lab('Its faction', bEl('select', { className: 'tf-in' }));
    aif.append(bEl('option', { value: '', textContent: useClaude ? 'Let Claude choose' : 'Random' }));
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
        'Paste your list here. A list copied from the Para Bellum app is read directly; any other list is read by Claude.';
      ta.oninput = () => (setupDraft.list = ta.value);
      lab('Your army list', ta).parentNode.classList.add('wide');
    } else {
      fac.parentNode.hidden = true;
      pts.parentNode.hidden = true;
    }
    {
      if (!PN('cs') && savedName() && !state._pnTried) {
        state._pnTried = 1;
        putState({ players: Object.assign({}, state.players || {}, { cs: savedName() }) }).catch(() => {});
      }
      /* the lobby: you on the left, your opponent on the right, the battlefield and the next step between them */
      tb.classList.add('sp-lobby');
      add(spLobby(useClaude, aif, mk));
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
      const bot = setupDraft.aiPlayer !== 'claude';
      if (!bot && !sample) {
        toast(
          'Claude is not available in this view. Choose the built-in opponent, or add an API key in Claude settings.'
        );
        return;
      }
      if (armyMode === 'paste' && !pbLooks(setupDraft.list) && !sample) {
        toast(
          'Without Claude only lists copied from the Para Bellum app can be read. Build your army here instead, or import it in the army builder.'
        );
        return;
      }
      aiBusy = true;
      aiStatus(
        armyMode === 'paste' && pbLooks(setupDraft.list)
          ? 'Reading your Para Bellum list…'
          : 'Claude is reading your list…'
      );
      render();
      try {
        const mine = built || (await convertList(setupDraft.list, setupDraft.faction, setupDraft.pts));
        const P =
          built || mine.points ? Math.max(500, Math.round((built || mine).points / 50) * 50) : setupDraft.pts;
        aiStatus(bot ? 'Building the opponent’s army…' : 'Claude is designing its army…');
        render();
        const theirs = bot
          ? botArmy(setupDraft.aiFaction, P)
          : await designList(setupDraft.aiFaction, P, mine.faction || setupDraft.faction);
        if (!theirs) throw { code: 'no army' };
        aiBusy = false;
        aiStatus('');
        await putState({
          scenario: scenId(),
          zones: scenOf().zones,
          aiPlayer: bot ? 'bot' : 'claude',
          botLevel: setupDraft.botLevel || 'normal'
        });
        await putState({
          step: 'review',
          terrain: genTerrain(),
          setup: { cs: mine, nord: theirs },
          names: {
            cs: String(mine.faction || setupDraft.faction || 'Your army'),
            nord: String(theirs.faction || setupDraft.aiFaction || (bot ? 'Opponent' : 'Claude'))
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
            : bot
              ? 'The armies could not be built (' + ((e && e.code) || 'error') + '). Try again.'
              : 'Claude could not build the armies (' + ((e && e.code) || 'error') + '). Try again.'
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
    /* the lobby layout: both armies side by side, the battlefield and Start between them */
    tb.classList.add('sp-lobby');
    const lw = bEl('div', { className: 'sp-lobby-in sp-review' });
    {
      const prog = bEl('div', { className: 'mp3-prog' });
      [
        ['Armies', 1],
        ['Opponent', 1],
        ['Review', 0],
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
    const cols = bEl('div', { className: 'mp3-cols' }),
      mid = bEl('div', { className: 'mp3-mid sp-rmid' }),
      left = PVP() ? seatSide() || 'cs' : HU,
      colOf = {};
    [left, other(left)].forEach(side => {
      const c = bEl('section', { className: 'mp3-p sp-army' + (side === left ? ' me' : ' opp') });
      c.style.setProperty('--pc', 'var(--' + side + ')');
      colOf[side] = c;
    });
    cols.append(colOf[left], mid, colOf[other(left)]);
    lw.append(cols);
    add(lw);
    ['cs', 'nord'].forEach(side => {
      const L = S[side] || { units: [] };
      const box = colOf[side];
      const mine = PVP() ? side === seatSide() : side === HU;
      const name = PVP()
        ? PN(side) || SEATNAME[side]
        : mine
          ? PN(side) || savedName() || 'You'
          : state.aiPlayer === 'claude'
            ? 'Claude'
            : 'Built-in opponent';
      box.append(
        bEl('div', { className: 'mp3-ph' }, [
          bEl('span', { className: 'mp3-av', textContent: name.slice(0, 1).toUpperCase() }),
          bEl('div', { className: 'mp3-pn' }, [
            bEl('strong', { textContent: name }),
            bEl('span', {
              textContent:
                (L.faction || N(side)) + (L.points ? ' · ' + L.points.toLocaleString('en') + ' pts' : '') + ' · ' + SEATNAME[side]
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
    const addM = e => mid.appendChild(e);
    addM(bEl('h3', { className: 'sp-rh', textContent: 'Battlefield' }));
    addM(ptext('The table under this page shows the terrain and the objective zones as they will be.', 'hint'));
    if (guest) {
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
    mid.lastChild.classList.add('mp3-go');
    addM(mk('Back to the armies', () => putState({ step: 'setup' }), true));
    if (PVP() && !seatSide()) {
      tb.querySelectorAll('button').forEach(b => (b.disabled = true));
    }
    return true;
  }
  return false;
}
