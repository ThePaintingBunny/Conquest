/*
 * Reinforcement Phase
 *
 * Reinforcement Rolls and which regiments arrive, with the rules that change them (Raven Messengers,
 * Call the Hunt).
 *
 * In this file: reinfRule(), reserves(), reinfLabel(), ravenOk(), ravenSelect(), huntOk(),
 *   huntSelect(), doReinforcements()
 */

function reinfRule(cls, R) {
  const c = /Light/.test(cls || '') ? 'L' : /Heavy/.test(cls || '') ? 'H' : 'M';
  if (c === 'L') return R >= 3 ? 'auto' : 'roll4';
  if (c === 'M') return R <= 1 ? 'no' : R === 2 ? 'roll2' : R === 3 ? 'roll4' : 'auto';
  return R <= 2 ? 'no' : R === 3 ? 'roll2' : R === 4 ? 'roll4' : 'auto';
}

function reserves(side) {
  return (state.units || []).filter(u => u.side === side && !u.onTable && !u.arriving && !u.destroyed);
}

/* a regiment's name in a reserve list, numbered when several share it */
function reinfLabel(u, pool) {
  const same = pool.filter(x => x.name === u.name);
  return (
    u.name +
    (same.length > 1 ? ' ' + (same.indexOf(u) + 1) : '') +
    ' (' +
    u.cls +
    (u.charName ? ', with the ' + u.charName + (u.warlord ? ' · Warlord' : '') : '') +
    ')'
  );
}

function ravenOk(side) {
  const U = state.units || [];
  return (
    U.some(x => x.side === side && x.charName && !x.destroyed && upgOf(x, /Raven Messengers/)) &&
    U.some(x => x.side === side && x.onTable && !x.destroyed && x.type !== 'marker' && engaged(x).length)
  );
}

/* the second dropdown in the Reinforcement bar */
function ravenSelect(side, add) {
  if (!ravenOk(side)) return null;
  const pool = reserves(side).filter(u => /^roll/.test(reinfRule(u.cls, state.round)));
  if (!pool.length) return null;
  const sel = document.createElement('select');
  sel.id = 'tb-raven';
  sel.setAttribute('aria-label', 'Raven Messengers: a second regiment arriving automatically');
  const o0 = document.createElement('option');
  o0.value = '';
  o0.textContent = 'Raven Messengers: choose a second regiment';
  sel.appendChild(o0);
  pool.forEach(u => {
    const o = document.createElement('option');
    o.value = u.id;
    o.textContent = 'Raven Messengers: ' + reinfLabel(u, pool);
    sel.appendChild(o);
  });
  add(sel);
  return sel;
}

function huntOk(side) {
  const wl = supWl(side);
  return !!(wl && upgOf(wl, /Call the Hunt/));
}

/* Call the Hunt: the extra Half-Bloods regiment, picked in the Reinforcement bar */
function huntSelect(side, add) {
  if (!huntOk(side)) return null;
  const pool = reserves(side).filter(
    u => supRoles(u).includes('Half-Bloods') && /^roll/.test(reinfRule(u.cls, state.round))
  );
  if (!pool.length) return null;
  const sel = document.createElement('select');
  sel.id = 'tb-hunt';
  sel.setAttribute('aria-label', 'Call the Hunt: an additional Half-Bloods regiment');
  const o0 = document.createElement('option');
  o0.value = '';
  o0.textContent = 'Call the Hunt: choose a Half-Bloods regiment';
  sel.appendChild(o0);
  pool.forEach(u => {
    const o = document.createElement('option');
    o.value = u.id;
    o.textContent = 'Call the Hunt: ' + reinfLabel(u, pool);
    sel.appendChild(o);
  });
  add(sel);
  return sel;
}

async function doReinforcements(humanAuto, humanRaven, humanHunt) {
  const R = state.round,
    out = [];
  const units = (state.units || []).map(u => Object.assign({}, u));
  if (R === 1 && !PVP())
    units.forEach(u => {
      if (u.side === AI && privOk(u)) u.cls = u.cls.replace(/Light/, 'Medium');
    });
  const roll = async (side, autoId, ravenId, huntId) => {
    const res = [],
      rollers = [],
      noL = [];
    const pool = units.filter(u => u.side === side && !u.onTable && !u.arriving && !u.destroyed);
    const M = state.mm && state.mm.r === R ? state.mm : null,
      xId = M && M.ans === 'accept' ? (M.pick || {})[side] : null;
    let rrL = M && M.ans === 'decline' && M.by === side && M.opt === 'reroll' ? 1 : 0;
    for (const u of pool) {
      const rule = reinfRule(u.cls, R);
      if (
        rule !== 'no' &&
        (hasRule(u, /^Flank/) ||
          (u.char != null &&
            (rh(chRulesX(u), 'Forward Force') || supForwardForce(u)) &&
            u.type !== 'monster'))
      ) {
        u.arriving = true;
        res.push(rfName(u) + ' arrives (Flank: kept out of the roll)');
        continue;
      }
      if (u.arriving) continue;
      if (xId && u.id === xId && rule !== 'no') {
        u.arriving = true;
        Object.assign(u, grantU(u, 'Master Manipulator (Vanguard (3))', ['Vanguard (3)']));
        res.push(u.name + ' arrives (Master Manipulator, Vanguard (3))');
        continue;
      }
      if (u.id === autoId && rule !== 'no') {
        u.arriving = true;
        res.push(rfName(u) + ' arrives (chosen)');
        {
          const t2 = supTactical(side, pool, autoId);
          if (t2) {
            t2.arriving = true;
            res.push(t2.name + ' arrives (Tactical Superiority)');
          }
        }
        /* Call the Hunt (Nords Mastery, Half-Bloods Warlord): the player chooses one more Half-Bloods regiment that
           would otherwise roll; it arrives automatically (not when the chosen regiment has Flank). The AI takes the
           first. */
        {
          if (huntOk(side) && !hasRule(u, /^Flank/)) {
            const ok = x =>
              x !== u &&
              !x.arriving &&
              supRoles(x).includes('Half-Bloods') &&
              /^roll/.test(reinfRule(x.cls, R));
            const h = huntId
              ? pool.find(x => x.id === huntId && ok(x))
              : !PVP() && side === AI
                ? pool.find(ok)
                : null;
            if (h) {
              h.arriving = true;
              res.push(h.name + ' arrives (Call the Hunt)');
            }
          }
        }
        if (rh(u.rules, 'Tidal Summons')) {
          const w = pool.find(
            x => x !== u && !x.arriving && rh(x.rules, 'Water Elemental') && reinfRule(x.cls, R) !== 'no'
          );
          if (w) {
            w.arriving = true;
            res.push(w.name + ' arrives (Tidal Summons)');
          }
        }
        continue;
      }
      if (rule === 'auto') {
        u.arriving = true;
        res.push(rfName(u) + ' arrives automatically');
        continue;
      }
      if (rule === 'no') {
        noL.push(u);
        continue;
      }
      rollers.push(u);
    }
    /* Raven Messengers (Nords): if one of your regiments is engaged, a second regiment you select passes its
       Reinforcement Roll automatically (once, however many characters carry it); the AI takes its costliest */
    if (rollers.length && ravenOk(side)) {
      const best =
        (ravenId && rollers.find(u => u.id === ravenId)) ||
        (!PVP() && side === AI
          ? rollers.slice().sort((a, b) => (+b.points || 0) - (+a.points || 0))[0]
          : null);
      if (best) {
        best.arriving = true;
        rollers.splice(rollers.indexOf(best), 1);
        res.push(best.name + ' arrives (Raven Messengers)');
      }
    }
    /* each weight class rolls its dice together; the player then picks which regiments of that class arrive */
    const W = u => (/Light/.test(u.cls || '') ? 'Light' : /Heavy/.test(u.cls || '') ? 'Heavy' : 'Medium');
    const groups = {};
    rollers.forEach(u => {
      const need = supReinfNeed(u, reinfRule(u.cls, R) === 'roll4' ? 4 : 2),
        k = W(u) + '|' + need;
      (groups[k] = groups[k] || { cls: W(u), need, units: [], dice: [] }).units.push(u);
    });
    const G = Object.values(groups);
    for (const g of G) {
      g.dice = g.units.map(() => d6());
      g.first = g.dice.slice();
      g.notes = [];
    }
    if (rrL) {
      const g = G.find(g => g.dice.some(v => v > g.need));
      if (g) {
        const i = g.dice.findIndex(v => v > g.need),
          v1 = g.dice[i];
        g.dice[i] = d6();
        rrL = 0;
        g.notes.push('Master Manipulator re-rolled a ' + v1 + ': now ' + g.dice[i] + '.');
      }
    }
    if (supK(side) === 'Infantry Tactics' && !supMem(side).itUsed) {
      const fails = G.reduce((a, g) => a + g.dice.filter(v => v > g.need).length, 0);
      if (fails >= 2 || (fails && R >= 4)) {
        state.sup = supMemo(side, { itUsed: true });
        res.push('Infantry Tactics: every failed Reinforcement Roll is re-rolled (once per game)');
        for (const g of G) {
          const ix = g.dice.map((v, i) => (v > g.need ? i : -1)).filter(i => i >= 0);
          if (!ix.length) continue;
          const was = ix.map(i => g.dice[i]);
          ix.forEach(i => {
            g.dice[i] = d6();
          });
          g.notes.push(
            'Infantry Tactics re-rolled the failures (' +
              was.join(', ') +
              '): now ' +
              ix.map(i => g.dice[i]).join(', ') +
              '.'
          );
        }
      }
    }
    bannerHide();
    const mine = (PVP() && side === ME) || (!PVP() && side === HU) || SBX();
    const PK =
      G.length || noL.length || res.length ? await reinfPanel(side, G, res.slice(), noL, mine) : new Map();
    for (const g of G) {
      const succ = g.dice.filter(v => v <= g.need).length;
      let pick = PK.get(g);
      if (!pick) {
        if (succ >= g.units.length) pick = g.units.slice();
        else if (!succ) pick = [];
        else
          pick = g.units
            .slice()
            .sort((a, b) => (+b.points || 0) - (+a.points || 0))
            .slice(0, succ);
      }
      res.push(g.cls + ': rolled ' + g.dice.join(', ') + ' → ' + succ + ' of ' + g.units.length + ' arrive');
      g.units.forEach(u => {
        if (pick.includes(u)) {
          u.arriving = true;
          res.push(u.name + ' arrives');
        } else res.push(u.name + ' stays back');
      });
    }
    supAfterReinf(side, units, res);
    if (M && M.ans === 'decline' && M.by === side && M.opt === 'vanguard' && M.vg) {
      const t = units.find(x => x.id === M.vg && !x.onTable);
      if (t) {
        Object.assign(t, grantU(t, 'Master Manipulator (Vanguard (3))', ['Vanguard (3)']));
        res.push(t.name + ' gains Vanguard (3) (Master Manipulator)');
      }
    }
    return res;
  };
  const hl = await roll(
    HU,
    humanAuto,
    humanRaven && humanRaven !== humanAuto ? humanRaven : null,
    humanHunt && humanHunt !== humanAuto ? humanHunt : null
  );
  if (PVP()) {
    bannerHide();
    const nxt = HU === 'cs' ? { reinfTurn: 'nord' } : { reinfTurn: 'done' };
    await putState(Object.assign({ units }, nxt));
    out.push({ title: N(HU) + ' reinforcements', lines: hl.length ? hl : ['none'], narration: '' });
    return out;
  }
  const aiPool = units.filter(
    u =>
      u.side === AI &&
      !u.onTable &&
      !u.arriving &&
      !u.destroyed &&
      reinfRule(u.cls, R) !== 'no' &&
      reinfRule(u.cls, R) !== 'auto'
  );
  const rank = u => {
    const r = reinfRule(u.cls, R);
    return r === 'roll2' ? 0 : 1;
  };
  const aiAuto = aiPool.sort((a, b) => rank(a) - rank(b))[0];
  const al = await roll(AI, aiAuto && aiAuto.id);
  bannerHide();
  await putState({ units });
  out.push(
    { title: N(HU) + ' reinforcements', lines: hl.length ? hl : ['none'], narration: '' },
    { title: N(AI) + ' reinforcements', lines: al.length ? al : ['none'], narration: '' }
  );
  return out;
}
