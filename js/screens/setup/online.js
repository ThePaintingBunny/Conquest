/*
 * Setup: online game
 *
 * The lobby screen for a game between two players.
 *
 * In this file: renderSetupPvp()
 */

function renderSetupPvp(tb, info, mk, add) {
  const me = seatSide(),
    S0 = state.setup || {},
    seats = state.seats || {};
  info.textContent =
    'Play against a friend. Press Host an online game above (or open the invite link your opponent sent), then each of you takes a seat. Each of you takes an edge and builds or pastes your own army.';
  const box = document.createElement('div');
  box.className = 'rev seats';
  const h = document.createElement('h3');
  h.textContent = 'Seats';
  box.appendChild(h);
  ['cs', 'nord'].forEach(side => {
    const row = document.createElement('div');
    const who = seats[side];
    row.className = 'row seat ' + side + (who ? (who === myId ? ' mine' : ' taken') : ' open');
    const L = S0[side];
    const t = document.createElement('span');
    t.className = 'read';
    t.textContent =
      SEATNAME[side] +
      ': ' +
      (who
        ? who === myId
          ? 'you' + (PN(side) ? ' (' + PN(side) + ')' : '')
          : PN(side) || 'taken'
        : 'open') +
      (L
        ? ' · army ready: ' + (L.faction || 'army') + ' (' + (L.units || []).length + ' regiments)'
        : who
          ? ' · no army yet'
          : '');
    row.appendChild(t);
    if (!who && !me)
      row.appendChild(
        (b => {
          if (!savedName()) {
            b.disabled = true;
            b.title = 'Fill in your name above first';
          }
          return b;
        })(
          mk('Sit here', () => {
            if (!savedName()) {
              toast('Fill in your name first.');
              return;
            }
            return db
              .doc('game/state')
              .update(
                Object.assign(
                  { seats: { [side]: myId }, updatedAt: Date.now() },
                  savedName() ? { players: { [side]: savedName() } } : {}
                )
              )
              .catch(() => toast('That seat could not be taken. Try again.'));
          })
        )
      );
    if (who) row.appendChild(nameInput(side, 'Name', who === myId));
    row.appendChild(colorPicker(side, 'Colour', who === myId));
    if (who === myId)
      row.appendChild(
        mk(
          'Leave this seat',
          () =>
            db
              .doc('game/state')
              .update({ seats: { [side]: null }, updatedAt: Date.now() })
              .catch(() => {}),
          true
        )
      );
    /* the host can free a seat, for a player who comes back on another device */
    if (who && who !== myId && window.__conquestNet && window.__conquestNet.mode === 'host')
      row.appendChild(
        mk(
          'Free this seat',
          () =>
            db
              .doc('game/state')
              .update({ seats: { [side]: null }, updatedAt: Date.now() })
              .catch(() => {}),
          true
        )
      );
    box.appendChild(row);
  });
  add(box);
  if (!myId) {
    add(ptext('Your identity is not available in this view, so you cannot take a seat here.', 'warn'));
  }
  if (me) {
    armyModePicker(add);
  }
  if (me && armyMode === 'build') {
    armyBuilder(
      add,
      mk,
      async L => {
        await db.doc('game/state').update({ setup: { [me]: null }, updatedAt: Date.now() });
        await db
          .doc('game/state')
          .update({ setup: { [me]: L }, names: { [me]: String(L.faction) }, updatedAt: Date.now() });
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
    const ta = document.createElement('textarea');
    ta.rows = 9;
    ta.value = setupDraft.list;
    ta.placeholder = 'Paste your list here: characters, regiments, stands, options and upgrades.';
    ta.oninput = () => (setupDraft.list = ta.value);
    lab('Your army list', ta).parentNode.classList.add('wide');
    add(f);
    add(
      mk(S0[me] ? 'Read my army again' : 'Read my army', async () => {
        if (!setupDraft.list.trim()) {
          toast('Paste your army list first.');
          return;
        }
        if (!sample) {
          toast('Claude is not available in this view, so the army cannot be read here.');
          return;
        }
        aiBusy = true;
        aiStatus('Claude is reading your list…');
        render();
        try {
          const L = await convertList(setupDraft.list, setupDraft.faction, setupDraft.pts);
          aiBusy = false;
          aiStatus('');
          await db.doc('game/state').update({ setup: { [me]: null }, updatedAt: Date.now() });
          await db.doc('game/state').update({
            setup: { [me]: L },
            names: { [me]: String(L.faction || setupDraft.faction || (me === 'cs' ? 'South' : 'North')) },
            updatedAt: Date.now()
          });
        } catch (e) {
          aiBusy = false;
          aiStatus('');
          render();
          toast(
            e && e.code === 'not_granted'
              ? 'Add your Anthropic API key under Claude settings at the top of the page to use Claude.'
              : 'Claude could not read the army (' + ((e && e.code) || 'error') + '). Try again.'
          );
        }
      })
    );
  }
  if (S0.cs && S0.nord && me)
    add(
      mk('Review both armies', async () => {
        await putState({ scenario: scenId(), zones: scenOf().zones });
        await putState({ step: 'review', terrain: genTerrain(), phase: 'New game · Check both armies' });
      })
    );
  return true;
}
