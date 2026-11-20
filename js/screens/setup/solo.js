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
      const cr = bEl('div', { className: 'tf-row col-row' });
      if (!PN('cs') && savedName() && !state._pnTried) {
        state._pnTried = 1;
        putState({ players: Object.assign({}, state.players || {}, { cs: savedName() }) }).catch(() => {});
      }
      /* one card per side: who you are and what Claude plays */
      cr.className = 'side-cards';
      const you = bEl('section', { className: 'side-card cs' }, [bEl('h4', { textContent: 'You' })]);
      you.append(nameInput('cs', 'Your name', true), colorPicker('cs', 'Your colour', true));
      const them = bEl('section', { className: 'side-card nord' }, [bEl('h4', { textContent: 'Opponent' })]);
      /* who plays it: the built-in opponent (free) or Claude */
      const seg = (label, opts, cur, pick) => {
        const g = bEl('div', { className: 'grp opp-grp' });
        g.setAttribute('role', 'group');
        g.setAttribute('aria-label', label);
        opts.forEach(([v, t, dis]) => {
          const b = bEl('button', { type: 'button', textContent: t });
          b.setAttribute('aria-pressed', String(cur === v));
          if (dis) {
            b.disabled = true;
            b.title = dis;
          }
          b.onclick = () => {
            pick(v);
            renderTurnbar();
          };
          g.append(b);
        });
        return bEl('div', { className: 'opp-row' }, [
          bEl('span', { className: 'tf-l', textContent: label }),
          g
        ]);
      };
      them.append(
        seg(
          'Played by',
          [
            ['bot', 'Built-in (free)'],
            [
              'claude',
              'Claude',
              sample ? '' : 'Claude is not available here (add an API key in Claude settings)'
            ]
          ],
          useClaude ? 'claude' : 'bot',
          v => (setupDraft.aiPlayer = v)
        )
      );
      if (!useClaude)
        them.append(
          seg(
            'Difficulty',
            [
              ['easy', 'Easy'],
              ['normal', 'Normal'],
              ['hard', 'Hard']
            ],
            setupDraft.botLevel || 'normal',
            v => (setupDraft.botLevel = v)
          )
        );
      them.append(aif.parentNode, colorPicker('nord', 'Its colour', true));
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
    const bProbs = armyMode === 'build' ? bldProblems() : [];
    const bb = mk('Build both armies', async () => {
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
            ? 'Add your Anthropic API key under Claude settings at the top of the page to use Claude.'
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
    add(bb);
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
            : (state.aiPlayer === 'claude' ? 'Claude’s' : 'Opponent’s') + ' army: ') +
        (L.faction || N(side)) +
        (L.points ? ' · ' + L.points + ' points' : '');
      box.appendChild(h);
      if ((L.armyRules || []).length) box.appendChild(ptext('Army rules: ' + L.armyRules.join(', ')));
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
      if (guest && side !== seatSide()) {
        add(box);
        return;
      }
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
    if (guest) {
      add(
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
