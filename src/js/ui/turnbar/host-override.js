/*
 * Host override console
 *
 * Lets the host fix the game when it gets stuck.
 *
 * In this file: ovrOpen, ovrHost(), ovrMine(), ovrLog(), ovrPanel(), ovrArm
 */

/* ---------- Host override console: for when the game gets stuck ---------- */
let ovrOpen = false;

function ovrHost() {
  if (!state || SBX()) return false;
  if (!PVP()) return true;
  const net = window.__conquestNet;
  if (net && net.mode) return net.mode === 'host';
  return !!myId && (state.hostId ? state.hostId === myId : (state.seats || {}).cs === myId);
}

function ovrMine() {
  const o = state && state.ovr;
  return !!(o && o.n > 0 && o.side === HU && (!PVP() || !!seatSide()));
}

async function ovrLog(t, patch) {
  await putState(Object.assign({}, patch || {}, { lastTitle: 'Host override', lastText: t }));
  toast('Override: ' + t);
}

function ovrPanel() {
  if (!ovrHost() || ['setup', 'review', 'over'].includes(state.step || '')) return null;
  const d = bEl('details', { className: 'rev ovr' });
  d.open = ovrOpen;
  d.ontoggle = () => {
    ovrOpen = d.open;
  };
  d.append(bEl('summary', { textContent: 'Host override console' }));
  d.append(
    ptext(
      'Only for when something gets stuck. Every override is written to the log for both players.',
      'hint'
    )
  );
  const row = (l, ...k) => {
    const r = bEl('div', { className: 'tf-row' });
    r.append(bEl('span', { className: 'tf-l', textContent: l }), ...k);
    d.append(r);
  };
  const b = (t, fn, dis) => {
    const x = abBtn(t, fn, 'ab-tog');
    if (dis) x.disabled = true;
    return x;
  };
  const S = ['cs', 'nord'],
    nm = s => (PVP() ? WHO(s) : N(s)),
    turnNow = state.turn;
  row(
    'Turn: ' +
      (turnNow ? nm(turnNow) : 'nobody') +
      (state.step && state.step !== 'activations' ? ' · step ' + state.step : ''),
    ...S.map(s =>
      b(
        'Give the turn to ' + nm(s),
        async () => {
          act = null;
          cb = null;
          charAct = null;
          aiBusy = false;
          await ovrLog('the turn is given to ' + nm(s) + '.', {
            turn: s,
            step: 'activations',
            phase: 'Round ' + (state.round || 1) + ' · ' + nm(s) + ' to act'
          });
          if (!PVP() && s === AI) runAITurn();
        },
        turnNow === s && (state.step || 'activations') === 'activations'
      )
    )
  );
  row(
    'Force the current turn to end:',
    b(
      'End the turn' + (turnNow ? ' of ' + nm(turnNow) : ''),
      async () => {
        act = null;
        cb = null;
        charAct = null;
        aiBusy = false;
        const o = turnNow === 'cs' ? 'nord' : 'cs';
        const left = s =>
          !PVP() && s === AI ? aiCardsLeft() : !PVP() && s === HU ? humanCardsLeft() : sideCardsLeft(s);
        if (left(o) > 0) {
          await ovrLog('the turn of ' + nm(turnNow) + ' is ended; ' + nm(o) + ' to act.', {
            turn: o,
            phase: 'Round ' + (state.round || 1) + ' · ' + nm(o) + ' to act'
          });
          if (!PVP() && o === AI) runAITurn();
        } else if (left(turnNow) > 0) {
          await ovrLog(nm(o) + ' have no cards left; ' + nm(turnNow) + ' keep acting.', {});
        } else {
          await ovrLog('the round is ended.', {});
          await endRound();
        }
      },
      !turnNow
    )
  );
  row(
    'Let a player activate any one regiment (ignores the Command Stack):',
    ...S.filter(s => PVP() || s === HU).map(s =>
      b(nm(s) + ' activates one', async () => {
        await ovrLog(nm(s) + ' may activate any one regiment or character of their choice.', {
          ovr: { side: s, n: 1 },
          turn: s,
          step: 'activations'
        });
      })
    ),
    ...(!PVP()
      ? [
          b('Claude takes a turn now', async () => {
            act = null;
            cb = null;
            aiBusy = false;
            await ovrLog(N(AI) + ' take a turn now.', { turn: AI });
            runAITurn();
          })
        ]
      : [])
  );
  const u = selId && base(selId);
  if (u && u.type !== 'marker')
    row(
      'Selected: ' + (u.short || u.name) + ':',
      b(u.activated ? 'Mark as not activated' : 'Mark as activated', () =>
        ovrLog(
          (u.short || u.name) + (u.activated ? ' is marked as not activated.' : ' is marked as activated.'),
          {
            units: state.units.map(x =>
              x.id === u.id ? Object.assign({}, x, { activated: !u.activated }) : x
            )
          }
        )
      ),
      ...(u.charName
        ? [
            b(
              u.charActivated ? 'The ' + u.charName + ': not activated' : 'The ' + u.charName + ': activated',
              () =>
                ovrLog(
                  'the ' +
                    u.charName +
                    (u.charActivated ? ' is marked as not activated.' : ' is marked as activated.'),
                  {
                    units: state.units.map(x =>
                      x.id === u.id ? Object.assign({}, x, { charActivated: !u.charActivated }) : x
                    )
                  }
                )
            )
          ]
        : [])
    );
  else row('Select a regiment on the map to mark it activated or not.');
  row(
    'This device:',
    b('Clear a stuck activation or dice panel', () => {
      act = null;
      cb = null;
      cbQueue = [];
      charAct = null;
      aiBusy = false;
      try {
        bannerHide();
      } catch (e) {}
      try {
        renderCombat();
      } catch (e) {}
      render();
      toast('Cleared on this device.');
    })
  );
  row(
    'Round:',
    b(
      ovrArm ? 'Click again to end round ' + (state.round || 1) : 'End the round now (score it)',
      async () => {
        if (!ovrArm) {
          ovrArm = true;
          renderTurnbar();
          setTimeout(() => {
            ovrArm = false;
          }, 4000);
          return;
        }
        ovrArm = false;
        act = null;
        cb = null;
        aiBusy = false;
        await ovrLog('round ' + (state.round || 1) + ' is ended early.', {});
        await endRound();
      }
    )
  );
  return d;
}

let ovrArm = false;
