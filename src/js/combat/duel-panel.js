/*
 * Duel panel
 *
 * Shows a Duel's dice and result, and the Duel box in the activation panel.
 *
 * In this file: lastDuelLine, duelRows(), renderDuel(), duelBox()
 */

let lastDuelLine = '';

function duelRows(box, r, who, X, Y) {
  const s = stepBox(who);
  if (!r) {
    s.appendChild(ptext(X.name + ' was slain before striking (Quicksilver Strike).'));
    box.appendChild(s);
    return;
  }
  s.appendChild(
    ptext(
      `${X.name}: ${X.A} attacks, hits on ${r.hitOn} or less → ${r.hits} hit${r.hits === 1 ? '' : 's'}`,
      'gl'
    )
  );
  const d1 = document.createElement('div');
  d1.className = 'drow';
  r.rolls.forEach((q, qi) =>
    d1.appendChild(
      dieMini(
        q.v,
        (q.hit ? 'hit' : 'miss') + (q.re ? ' re' : ''),
        ((cb && cb.uid) || '') +
          'D' +
          (r.who || Y.name) +
          (r.n || '') +
          'h' +
          qi +
          '.' +
          q.v +
          (q.re ? 'r' : '')
      )
    )
  );
  s.appendChild(d1);
  if (r.hits) {
    s.appendChild(
      ptext(
        `${Y.name} saves on Defense ${r.D} or Evasion ${r.E} → ${r.wounds} wound${r.wounds === 1 ? '' : 's'}`,
        'gl'
      )
    );
    const d2 = document.createElement('div');
    d2.className = 'drow';
    r.drolls.forEach((q, qi) =>
      d2.appendChild(
        dieMini(
          q.v,
          (q.save ? 'hit' : 'miss') + (q.re ? ' re' : ''),
          ((cb && cb.uid) || '') +
            'D' +
            (r.who || Y.name) +
            (r.n || '') +
            'd' +
            qi +
            '.' +
            q.v +
            (q.re ? 'r' : '')
        )
      )
    );
    s.appendChild(d2);
  }
  if (r.mrolls.length) {
    s.appendChild(ptext(`${Y.name} tests Resolve ${r.R} → ${r.extra} more`, 'gl'));
    const d3 = document.createElement('div');
    d3.className = 'drow';
    r.mrolls.forEach((q, qi) =>
      d3.appendChild(
        dieMini(
          q.v,
          (q.pass ? 'hit' : 'miss') + (q.re ? ' re' : ''),
          ((cb && cb.uid) || '') +
            'D' +
            (r.who || Y.name) +
            (r.n || '') +
            'm' +
            qi +
            '.' +
            q.v +
            (q.re ? 'r' : '')
        )
      )
    );
    s.appendChild(d3);
  }
  r.notes.forEach(n => s.appendChild(ptext(n)));
  s.appendChild(ptext(`${Y.name} suffers ${r.total} wound${r.total === 1 ? '' : 's'}`, 'tot'));
  box.appendChild(s);
}

function renderDuel(body) {
  const A = base(cb.att),
    T = base(cb.tgt),
    DA = duelist(A),
    DT = duelist(T);
  if (!DA || !DT) {
    body.appendChild(ptext('One of the characters is no longer there.'));
    body.appendChild(
      cbtn(
        'Close',
        () => {
          cb = null;
          renderCombat();
          render();
        },
        'O'
      )
    );
    return;
  }
  const sA = N(A.side),
    sT = N(T.side);
  body.appendChild(
    ptext(
      `${DA.name} (${sA}) challenges ${DT.name} (${sT}). Both strike at the same time${DA && (rh(DA.rules, 'Quicksilver Strike') || rh(DT.rules, 'Quicksilver Strike')) ? ' (Quicksilver Strike strikes first)' : ''}; wounds only hit the characters. ${DA.name}: ${DA.W - DA.wounds}/${DA.W} wounds left · ${DT.name}: ${DT.W - DT.wounds}/${DT.W}.`
    )
  );
  if (cb.step === 'offer') {
    const why = duelRefuseWhy(T),
      np = duelNoPenalty(T);
    const s = stepBox(sT + ' answers the challenge');
    if (why) {
      s.appendChild(ptext(why + '.'));
      s.appendChild(
        cbtn(
          'Accept the Duel',
          () => {
            duelDecide(true);
            maybeAutoAI();
          },
          'T'
        )
      );
    } else {
      s.appendChild(
        ptext(
          np
            ? 'Refusing costs nothing (' +
                (rh(T.charRules || [], 'Refined Beyond Nature') ? 'Refined Beyond Nature' : 'Bodyguard') +
                ').'
            : 'Refusing: until the end of the round its regiment cannot Seize, uses its lowest Resolve, loses Inspiration and re-rolls Resolve tests of 1.'
        )
      );
      const r = document.createElement('div');
      r.className = 'row';
      r.append(
        cbtn(
          'Accept the Duel',
          () => {
            duelDecide(true);
            maybeAutoAI();
          },
          'T'
        ),
        cbtn(
          'Refuse',
          () => {
            duelDecide(false);
            maybeAutoAI();
          },
          'T'
        )
      );
      s.appendChild(r);
    }
    body.appendChild(s);
    if (!PVP() && T.side === AI && A.side !== AI && !cb.aiAns) {
      cb.aiAns = true;
      setTimeout(() => {
        if (cb && cb.type === 'duel' && cb.step === 'offer') {
          const acc = aiAcceptDuel(T, A);
          toast(N(AI) + (acc ? ' accept the Duel.' : ' refuse the Duel.'));
          duelDecide(acc);
        }
      }, 700);
    }
    return;
  }
  if (cb.step === 'roll') {
    body.appendChild(
      cbtn(
        'Roll the Duel (' + sA + ')',
        () => {
          duelResolve();
          renderCombat();
        },
        'A'
      )
    );
    return;
  }
  if (cb.refused) {
    body.appendChild(ptext(DT.name + ' refuses the Duel.', 'tot'));
  } else {
    duelRows(body, cb.duel.a, '1 · ' + DA.name + ' strikes', DA, DT);
    duelRows(body, cb.duel.t, '2 · ' + DT.name + ' strikes', DT, DA);
  }
  body.appendChild(cbtn('Record result', recordDuel, 'O'));
}

/* the character activation panel */
function duelBox(u, box) {
  if (!charAct || !u || !u.onTable) return;
  const T = duelTargets(u);
  if (!T.length) return;
  const h = ptext(
    'Duel (uses the character’s action): challenge an enemy character in a regiment in contact with yours.'
  );
  box.appendChild(h);
  const r = document.createElement('div');
  r.className = 'row';
  T.forEach(t => {
    const D = duelist(t);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = 'Duel ' + D.name + ' (' + (t.short || t.name) + ')';
    b.onclick = () =>
      openCombat({
        type: 'duel',
        att: u.id,
        tgt: t.id,
        inAct: false,
        charDuel: true,
        step: 'offer',
        selfTitle: 'Duel'
      });
    r.appendChild(b);
  });
  box.appendChild(r);
}
