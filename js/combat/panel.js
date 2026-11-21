/*
 * Combat panel
 *
 * Draws the combat panel step by step. One long function, renderCombat0, draws every step.
 *
 * In this file: stepBox(), cbMorale(), aiDefAuto(), renderCombat(), renderCombat0()
 */

/* does this fight end with Morale Tests? Volleys and automatic hits do not, unless the rule (a spell) says so */
function cbMorale() {
  if (!cb) return false;
  return cb.type === 'lethal' ? !!cb.hitMorale : cb.type !== 'volley';
}

function stepBox(t) {
  const s = document.createElement('div');
  s.className = 'cstep';
  const h = document.createElement('h3');
  h.textContent = t;
  s.appendChild(h);
  return s;
}

/* single player: when you attack the computer, its Defense and Morale are rolled for it, after a pause so you
   can read your own dice first */
function aiDefAuto() {
  if (!cb || PVP() || SBX() || aiBusy || !['def', 'mor'].includes(cb.step)) return;
  const T = byId(cb.tgt) || base(cb.tgt);
  if (!T || T.side !== AI || cb.blessWait) return;
  const c0 = cb,
    st = cb.step;
  if (c0.aiAutoAt === st) return;
  c0.aiAutoAt = st;
  setTimeout(() => {
    if (cb !== c0 || cb.step !== st) return;
    const T2 = byId(cb.tgt) || base(cb.tgt);
    if (st === 'def') {
      if ((cb.type === 'clash' || cb.type === 'impact') && blessOk(T2)) {
        cb.blessT = true;
        cb.blessUsedT = true;
      }
      rollDef(T2);
      cb.step = cbMorale() && cb.wounds ? 'mor' : 'done';
    } else {
      const mi = moraleInfo(T2, byId(cb.att) || base(cb.att));
      cb.mi = mi;
      if (mi.auto) cb.extra = 0;
      else rollMor(T2);
      cb.step = 'done';
    }
    renderCombat();
  }, 1400);
}

function renderCombat() {
  if (cb && !cb.uid) cb.uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  renderCombat0();
  /* the side column is not scrolled as steps appear: the dice stay where you are looking */
  if (cb) cbGate();
  try {
    aiDefAuto();
  } catch (e) {
    console.error(e);
  }
  try {
    cbStepper();
  } catch (e) {}
  cbSync();
  if (act && !renderCombat.busy) {
    renderCombat.busy = true;
    try {
      renderCard();
    } catch (e) {
      console.error(e);
    }
    renderCombat.busy = false;
  }
}

function renderCombat0() {
  const box = $('combat');
  if (!cb) {
    box.hidden = true;
    if (cbQueue.length)
      setTimeout(() => {
        if (!cb && cbQueue.length) openCombat(cbQueue.shift());
      }, 150);
    return;
  }
  box.hidden = false;
  const body = $('cb-body');
  body.innerHTML = '';
  const A = byId(cb.att) || base(cb.att),
    T = cb.tgt ? byId(cb.tgt) : null,
    LBL = {
      clash: 'Clash',
      impact: 'Impact Attacks',
      volley: 'Volley',
      lethal: 'Lethal Demise',
      freform: 'Fighting Reform'
    };
  $('cb-title').textContent =
    (cb.dieFight ? 'Die Fighting! ' : '') +
    (cb.selfTitle || LBL[cb.type]) +
    ': ' +
    (A.short || A.name) +
    (T ? ' against ' + (T.short || T.name) : '') +
    (cb.pool && cb.pool[1] > 1 ? ' (pool ' + cb.pool[0] + ' of ' + cb.pool[1] + ')' : '');
  if (!T && cb.split === 'plan') {
    $('cb-title').textContent =
      'Clash: ' + (A.short || A.name) + ' against ' + cb.engIds.length + ' enemy regiments';
    renderSplit(body, A);
    return;
  }
  if (!T) {
    body.appendChild(
      ptext(
        cb.dieFight
          ? 'Die Fighting! Choose which enemy regiment in contact with its last stand it fights.'
          : 'Choose which engaged enemy regiment to attack.'
      )
    );
    const row = document.createElement('div');
    row.className = 'row';
    const nmC = e => e.short || e.name,
      dupe = n => (cb.choices || []).filter(i => byId(i) && nmC(byId(i)) === n).length > 1;
    (cb.choices || []).forEach(id => {
      const e = byId(id);
      if (!e) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ghost';
      b.dataset.who = cb.dieFight ? 'A' : 'O';
      let where = '';
      if (dupe(nmC(e))) {
        const D = (cb.choices || []).map(byId).filter(x => x && nmC(x) === nmC(e)),
          xs = D.map(x => px(x.x)),
          ys = D.map(x => py(x.y)),
          hor = Math.max(...xs) - Math.min(...xs) >= Math.max(...ys) - Math.min(...ys);
        const k = hor ? px(e.x) : py(e.y),
          L = hor ? xs : ys,
          lo = Math.min(...L),
          hi = Math.max(...L);
        where =
          ' (' +
          (k <= lo + 0.5 ? (hor ? 'left' : 'top') : k >= hi - 0.5 ? (hor ? 'right' : 'bottom') : 'middle') +
          ' one on the map)';
      }
      b.textContent = nmC(e) + where;
      b.onmouseenter = () => {
        try {
          const g = document.querySelector('g[data-id="' + id + '"]');
          if (g) g.style.filter = 'drop-shadow(0 0 6px #FFE58A)';
        } catch (x) {}
      };
      b.onmouseleave = () => {
        try {
          const g = document.querySelector('g[data-id="' + id + '"]');
          if (g) g.style.filter = '';
        } catch (x) {}
      };
      b.onclick = () => {
        cb.tgt = id;
        if (cb.type !== 'lethal') cb.groups = buildGroups(cb.type, A, byId(id));
        renderCombat();
      };
      row.appendChild(b);
    });
    body.appendChild(row);
    return;
  }
  const sA = N(A.side),
    sT = N(T.side),
    arc = cb.type === 'volley' ? volleyMainArc(cb.vst, T, A) : cArcU(T, A);
  if (cb.type === 'duel') {
    renderDuel(body);
    return;
  }
  if (cb.selfText) {
    body.appendChild(ptext(cb.selfText));
  } else if (cb.type === 'freform') {
    body.appendChild(
      ptext(
        `The Combat Reform test failed, so ${T.short || T.name} suffers ${cb.preWounds} wound${cb.preWounds > 1 ? 's' : ''}, one for each stand in contact with the enemy. Test Morale for them, record, then finish the reform.`
      )
    );
  } else if (cb.type === 'lethal') {
    body.appendChild(
      ptext(
        `${cb.lethalLost} ${A.short || A.name} stand${cb.lethalLost > 1 ? 's were' : ' was'} destroyed while in contact, so ${T.short || T.name} suffers ${cb.lethalHits} automatic Hits (Lethal Demise ${cb.lethalX} each). They hit the front arc, use no other special rules, and the wounds cause no Morale Tests.`
      )
    );
  } else {
    body.appendChild(
      ptext(
        `${A.short || A.name} strikes ${T.short || T.name} in the ${arc === 'left' || arc === 'right' ? 'flank' : arc}.` +
          (cb.type === 'volley' ? ' ' + volleySummary(cb.vst || [], cb.arcing) : '') +
          ' Dice counts are worked out from the stands in contact; change a count if the table says otherwise.'
      )
    );
  }
  /* Masters of the Sword (Draw Event): its gains are chosen before the hit rolls */
  {
    const mb = mosBox(A, T);
    if (mb) {
      body.appendChild(mb);
      return;
    }
  }
  if (cb.type !== 'lethal' && cb.type !== 'freform') {
    const s1 = stepBox('1 · ' + sA + ' rolls to hit');
    if (cb.type === 'volley') {
      const lab = document.createElement('label');
      lab.className = 'row hint';
      const x = document.createElement('input');
      x.type = 'checkbox';
      x.id = 'cb-cover';
      x.checked = cb.cover;
      x.disabled = cb.step !== 'att';
      x.dataset.who = 'A';
      x.onchange = () => {
        cb.cover = x.checked;
        renderCombat();
      };
      lab.append(
        x,
        document.createTextNode(
          'Target is in Cover or has Loose Formation (shots halved)' +
            (cb.coverWhy ? ' · Cover: ' + cb.coverWhy : '')
        )
      );
      s1.appendChild(lab);
    }
    cb.groups.forEach((g, gi) => {
      const row = document.createElement('div');
      row.className = 'grow';
      g.nUse = cb.type === 'volley' && cb.cover ? Math.ceil(g.n / 2) : g.n;
      const tags = ['hits on ' + g.hitOn + ' or less'];
      if (g.reroll6) tags.push('re-roll 6s');
      if (g.flurry) tags.push('Flurry');
      if (g.fiend) tags.push('Fiend Hunter');
      if (g.opp) tags.push('Opportunists');
      if (g.blessed) tags.push('Blessed');
      if (g.eccentric) tags.push('Eccentric Fighting Style');
      (g.rrNotes || []).forEach(t => tags.push(t));
      if (g.relentless) tags.push(cb.type === 'volley' ? 'Rapid Volley' : 'Relentless Blows');
      if (g.red)
        tags.push(
          (cb.type === 'impact' ? 'Brutal Impact' : cb.type === 'volley' ? 'Armor Piercing' : 'Cleave') +
            ' ' +
            g.red
        );
      if (g.smite) tags.push('Smite');
      if (g.flawless) tags.push(cb.type === 'volley' ? 'Precise Shot' : 'Flawless Strikes');
      if (g.deadly) tags.push(cb.type === 'volley' ? 'Deadly Shot' : 'Deadly Blades');
      if (g.linebreaker) tags.push('Linebreaker');
      const h = document.createElement('div');
      h.className = 'gl';
      const nm = document.createElement('b');
      nm.textContent = g.label + ' ';
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.min = '0';
      inp.className = 'nin';
      inp.value = String(g.nUse);
      inp.disabled = cb.step !== 'att';
      inp.dataset.who = 'A';
      inp.setAttribute('aria-label', 'Dice for ' + g.label);
      inp.onchange = () => {
        const v = Math.max(0, parseInt(inp.value, 10) || 0);
        g.n = cb.type === 'volley' && cb.cover ? v * 2 : v;
        renderCombat();
      };
      h.append(
        nm,
        inp,
        bEl('span', { className: 'gdice', textContent: ' dice' }),
        bEl('span', { className: 'gsep', textContent: ' · ' }),
        bEl('span', { className: 'gtags', textContent: tags.join(' · ') })
      );
      row.appendChild(h);
      if (g.rolls) {
        const dr = document.createElement('div');
        dr.className = 'drow';
        g.rolls.forEach((r, ri) =>
          dr.appendChild(
            dieMini(
              r.v,
              (r.hit ? 'hit' : 'miss') + (r.re ? ' re' : ''),
              cb.uid + 'h' + gi + '.' + ri + '.' + r.v + (r.re ? 'r' + r.first : '')
            )
          )
        );
        row.appendChild(dr);
        row.appendChild(
          ptext(
            g.hits +
              (g.hits === 1 ? ' hit' : ' hits') +
              (g.extra
                ? ` (${g.extra} extra${g.vindaN ? ', ' + g.vindaN + ' from Vinda’s extra Attacks' : ' from rolls of 1'})`
                : '')
          )
        );
      }
      s1.appendChild(row);
    });
    if (cb.step === 'att' && cb.groups.some(g => g.blessable) && blessOk(base(cb.att)))
      s1.appendChild(blessAsk('A', sA));
    /* No Matter the Price (Spires Mutation), declared before rolling to hit */
    {
      const A0 = base(cb.att);
      if (
        cb.step === 'att' &&
        cb.type === 'clash' &&
        A0 &&
        A0.charName &&
        upgOf(A0, /No Matter the Price/) &&
        frRoles(A0).includes('Clone') &&
        !A0.nmtpUsed
      ) {
        const lab = document.createElement('label');
        lab.className = 'row hint bless-q';
        const x = document.createElement('input');
        x.type = 'checkbox';
        x.dataset.who = 'A';
        x.checked = !!cb.nmtp;
        x.onchange = () => {
          cb.nmtp = x.checked;
          renderCombat();
        };
        lab.append(
          x,
          document.createTextNode(
            `${sA}: No Matter the Price (once per game)? Every failed hit becomes a hit and costs this regiment 1 wound; no re-rolls.`
          )
        );
        s1.appendChild(lab);
      }
    }
    if (cb.step === 'att')
      s1.appendChild(
        cbtn(
          'Roll to hit (' + sA + ')',
          () => {
            const parry = hitParry(T);
            if (cb.blessA) {
              cb.groups.forEach(g => {
                if (g.blessable) g.blessed = true;
              });
              cb.blessUsedA = true;
            }
            if (cb.nmtp) cb.groups.forEach(g => (g.nmtp = true));
            cb.groups.forEach((g, gi) => rollHits(g, g.nUse, parry));
            if (cb.nmtp) {
              const A0 = base(cb.att),
                miss = cb.groups.reduce((a, g) => a + (g.nmtpMiss || 0), 0);
              state.units = state.units.map(x =>
                x.id === cb.att ? Object.assign({}, x, { nmtpUsed: true }) : x
              );
              if (miss)
                srQueue({
                  type: 'freform',
                  att: cb.att,
                  tgt: cb.att,
                  inAct: false,
                  resumeAct: false,
                  preWounds: miss,
                  selfTitle: 'No Matter the Price: ' + (A0.short || A0.name),
                  selfText: `${miss} failed hit${miss === 1 ? '' : 's'} became hits: ${A0.short || A0.name} suffers ${miss} wound${miss === 1 ? '' : 's'}. Morale Tests at the end of the action.`
                });
            }
            glimApply();
            cb.hits = cb.groups.reduce((a, g) => a + g.hits, 0);
            cb.wounds = 0;
            cb.extra = 0;
            cb.step = cb.hits ? 'def' : 'done';
            renderCombat();
          },
          'A'
        )
      );
    else s1.appendChild(ptext('Total: ' + cb.hits + (cb.hits === 1 ? ' hit' : ' hits'), 'tot'));
    body.appendChild(s1);
  }
  if (cb.step === 'att') return;
  if (cb.hits) {
    const s2 = stepBox('2 · ' + sT + ' rolls Defense');
    cb.groups
      .filter(g => g.hits)
      .forEach(g => {
        const gi = cb.groups.indexOf(g);
        const di = g.def || defInfo(T, A, g),
          row = document.createElement('div');
        row.className = 'grow';
        row.appendChild(
          ptext(
            `${g.hits} from ${g.label}: saves on Defense ${di.D} or Evasion ${di.E}, whichever is better` +
              (di.red ? ` (Defense lowered by ${di.red})` : '') +
              (di.front && rh(RU(T), 'Shield') && !g.linebreaker ? ' · Shield +1' : '') +
              (g.flawless ? ' · rolls of 1 to hit ignore Defense' : ''),
            'gl'
          )
        );
        if (g.drolls) {
          const dr = document.createElement('div');
          dr.className = 'drow';
          g.drolls.forEach((r, ri) =>
            dr.appendChild(
              dieMini(
                r.v,
                (r.save ? 'hit' : 'miss') + (r.re ? ' re' : ''),
                cb.uid + 'd' + gi + '.' + ri + '.' + r.v + (r.re ? 'r' + r.first : '')
              )
            )
          );
          row.appendChild(dr);
        }
        s2.appendChild(row);
      });
    const ten = rx((T.rules || []).concat(fx(T)), 'Tenacious') + (cb.type === 'volley' ? tenVol(RU(T)) : 0);
    if (ten)
      s2.appendChild(
        ptext(`Tenacious (${ten}): up to ${ten} failed save${ten > 1 ? 's count' : ' counts'} as a success.`)
      );
    cb.groups.forEach(g => (g.drrNotes || []).forEach(t => s2.appendChild(ptext(t))));
    if (cb.groups.some(g => g.forceDef && g.hits))
      s2.appendChild(
        ptext(
          (A.charName || 'The character') + ': ' + sT + ' must re-roll successful Defense against its hits.'
        )
      );
    if (cb.step === 'def' && (cb.type === 'clash' || cb.type === 'impact') && blessOk(base(cb.tgt)))
      s2.appendChild(blessAsk('T', sT));
    if (cb.step === 'def' && !cb.blessWait)
      s2.appendChild(
        cbtn(
          'Roll Defense (' + sT + ')',
          () => {
            if (cb.blessT) cb.blessUsedT = true;
            rollDef(T);
            cb.step = cbMorale() && cb.wounds ? 'mor' : 'done';
            renderCombat();
          },
          'T'
        )
      );
    else
      s2.appendChild(
        ptext(
          cb.wounds +
            (cb.wounds === 1 ? ' wound' : ' wounds') +
            (cb.tenacious ? `, after Tenacious saved ${cb.tenacious}` : '') +
            (cb.dbl ? ` (${cb.dbl} extra from Deadly)` : '') +
            (cb.brittle ? ` (${cb.brittle} save${cb.brittle > 1 ? 's' : ''} lost to Brittle)` : ''),
          'tot'
        )
      );
    body.appendChild(s2);
  }
  if (cb.step === 'def') return;
  if (cbMorale() && cb.wounds) {
    const mi = cb.mi || moraleInfo(T, A),
      s3 = stepBox('3 · ' + sT + ' tests Morale');
    if (mi.auto) {
      s3.appendChild(ptext('No Resolve: passes every Morale Test automatically.'));
      if (cb.step === 'mor') {
        cb.extra = 0;
        cb.step = 'done';
      }
    } else {
      s3.appendChild(
        ptext(
          `${cb.wounds} dice, pass on ${mi.R} or less (includes +${mi.bonus} for regiment size${mi.terr ? `, −${mi.terr} Terrifying` : ''})` +
            (mi.arc === 'rear' && !mi.iron ? '. Rear attack: every test fails.' : '.') +
            (() => {
              const P = rrPlan(moraleSources(T, mi));
              return (
                (P.used.length ? ' Re-rolls: ' + P.used.join(', ') + '.' : '') +
                (P.notes.length ? ' ' + P.notes.join('; ') + '.' : '')
              );
            })() +
            (mi.oblivious ? ' Oblivious: 1 wound per 2 failures.' : '') +
            (mi.indom ? ` Indomitable (${mi.indom}).` : '')
        )
      );
      if (cb.mrolls) {
        const dr = document.createElement('div');
        dr.className = 'drow';
        cb.mrolls.forEach((r, ri) =>
          dr.appendChild(
            dieMini(
              r.v,
              (r.pass ? 'hit' : 'miss') + (r.re ? ' re' : ''),
              cb.uid + 'm' + ri + '.' + r.v + (r.re ? 'r' + r.first : '')
            )
          )
        );
        s3.appendChild(dr);
      }
      if (cb.step === 'mor') {
        s3.appendChild(
          cbtn(
            'Roll Morale (' + sT + ')',
            () => {
              rollMor(T);
              cb.step = 'done';
              renderCombat();
            },
            'T'
          )
        );
        /* Oath Unbroken (Hundred Kingdoms Mastery): once per game, the Resolve test is passed automatically */
        if (upgOf(T, /Oath Unbroken/) && !base(T.id).oathUsed)
          s3.appendChild(
            cbtn(
              'Oath Unbroken: pass automatically (once per game)',
              async () => {
                cb.mrolls = [];
                cb.extra = 0;
                cb.mi = moraleInfo(T, byId(cb.att));
                cb.oath = true;
                cb.step = 'done';
                await putState({
                  units: state.units.map(x => (x.id === T.id ? Object.assign({}, x, { oathUsed: true }) : x))
                });
                renderCombat();
              },
              'T'
            )
          );
      } else
        s3.appendChild(
          ptext(
            cb.oath
              ? 'Oath Unbroken: the Resolve test is passed automatically.'
              : cb.extra + (cb.extra === 1 ? ' extra wound' : ' extra wounds') + ' from failed Morale',
            'tot'
          )
        );
    }
    body.appendChild(s3);
  }
  if (cb.step !== 'done') return;
  const tot = (cb.wounds || 0) + (cb.extra || 0);
  cb.total = tot;
  if (cb.type === 'freform' && cb.mi && cb.mi.auto) cb.extra = 0;
  const lost = woundState(T, (T.wounds || 0) + tot).lost - woundState(T).lost;
  const s4 = stepBox('Result');
  s4.appendChild(
    ptext(
      `${T.short || T.name} takes ${tot} wound${tot === 1 ? '' : 's'}` +
        (lost ? `, about ${lost} stand${lost > 1 ? 's' : ''} removed` : '') +
        '.',
      'tot'
    )
  );
  s4.appendChild(
    ptext(
      'Recording saves every roll and the wounds to the board. Claude checks casualty removal and Broken.'
    )
  );
  s4.appendChild(
    cbtn(
      cb.inAct || cb.fromCharge
        ? 'Finish the ' + ({ clash: 'Clash', impact: 'Charge', volley: 'Volley' }[cb.type] || 'action')
        : 'Record result',
      recordCombat,
      'O'
    )
  );
  body.appendChild(s4);
}
