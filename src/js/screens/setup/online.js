/*
 * Setup: online game
 *
 * The lobby screen for a game between two players.
 *
 * In this file: renderSetupPvp()
 */

function renderSetupPvp(tb, info, mk, add) {
  const me = seatSide(),
    S0 = state.setup || {};
  /* the seats, both players and the next step are on the lobby page above; here only your army builder, while you
     have no army yet or chose to change it */
  if (!me || (S0[me] && !mpEdit)) {
    info.textContent = '';
    tb.classList.add('tb-empty');
    return true;
  }
  info.textContent = S0[me] ? 'Change your army: build it here or paste a list.' : 'Your army: build it here or paste a list.';
  if (me) {
    armyModePicker(add);
  }
  if (me && armyMode === 'build') {
    armyBuilder(
      add,
      mk,
      async L => {
        await stateUpdate({ setup: { [me]: null }, updatedAt: Date.now() });
        await stateUpdate({ setup: { [me]: L }, names: { [me]: String(L.faction) }, updatedAt: Date.now() });
        mpEdit = false;
        mpLog((PN(me) || 'A player') + ': army ready (' + (L.faction || 'army') + ')');
        toast('Your army is ready.');
      },
      S0[me] ? 'Use this army instead' : 'Use this army'
    );
  }
  if (me && armyMode === 'paste') {
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
    /* a Para Bellum list names its own faction and points */
    fac.parentNode.hidden = true;
    pts.parentNode.hidden = true;
    const ta = document.createElement('textarea');
    ta.rows = 9;
    ta.value = setupDraft.list;
    ta.placeholder =
      'Paste a list copied from the Para Bellum app (its share or export text).';
    ta.oninput = () => (setupDraft.list = ta.value);
    lab('Your army list', ta).parentNode.classList.add('wide');
    add(f);
    add(
      mk(S0[me] ? 'Read my army again' : 'Read my army', async () => {
        if (!setupDraft.list.trim()) {
          toast('Paste your army list first.');
          return;
        }
        if (!pbLooks(setupDraft.list)) {
          toast(PB_ONLY);
          return;
        }
        aiBusy = true;
        aiStatus('Reading your Para Bellum list…');
        render();
        try {
          const L = convertList(setupDraft.list);
          aiBusy = false;
          aiStatus('');
          await stateUpdate({ setup: { [me]: null }, updatedAt: Date.now() });
          await stateUpdate({
            setup: { [me]: L },
            names: { [me]: String(L.faction || setupDraft.faction || (me === 'cs' ? 'South' : 'North')) },
            updatedAt: Date.now()
          });
          mpEdit = false;
          mpLog((PN(me) || 'A player') + ': army ready (' + (L.faction || setupDraft.faction || 'army') + ')');
        } catch (e) {
          aiBusy = false;
          aiStatus('');
          render();
          toast(
            e && e.code === 'not_pb'
              ? PB_ONLY
              : 'The army could not be read (' + ((e && e.code) || 'error') + '). Try again.'
          );
        }
      })
    );
  }
  return true;
}
