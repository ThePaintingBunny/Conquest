/*
 * Automatic combat and spells
 *
 * Resolves combat dice and spellcasting for the built-in opponent.
 *
 * In this file: huRolls(), cbDrain(), autoResolve(), aiCast(), aiCastSpell()
 */

/* single player: when the computer attacks, the defender rolls its own Defense and Morale (unless switched off) */
async function huRolls(step) {
  const T = cb && (byId(cb.tgt) || base(cb.tgt));
  if (!T || T.side === AI || PVP() || SET.ownSaves === false) return false;
  const box = $('combat');
  box.classList.add('hu-roll');
  renderCombat();
  try {
    revealIn(box, 'start');
  } catch (e) {}
  toast(step === 'def' ? 'Your Defense roll: press Roll Defense.' : 'Your Morale test: press Roll Morale.');
  const c0 = cb;
  while (cb === c0 && cb.step === step) await sleep(150);
  box.classList.remove('hu-roll');
  return true;
}

/* resolve every fight that is open or waiting (the defender's own rolls still wait for the player) */
async function cbDrain() {
  for (let g = 0; g < 80 && (cb || cbQueue.length); g++) {
    if (!cb) {
      await sleep(200);
      continue;
    }
    await autoResolve();
  }
}

async function autoResolve() {
  let guard = 0;
  while (cb && guard++ < 60) {
    if (cb.split === 'plan') {
      cb.assign = splitDefault(byId(cb.att), cb.engIds.map(byId), true);
      splitGo();
      continue;
    }
    if (!cb.tgt) {
      const id = (cb.choices || [])[0];
      if (!id) {
        cb = null;
        break;
      }
      cb.tgt = id;
      if (cb.type !== 'lethal') cb.groups = buildGroups(cb.type, byId(cb.att), byId(id));
    }
    if (cb.type === 'duel') {
      renderCombat();
      await sleep(800);
      if (!cb) break;
      const T = base(cb.tgt),
        A = base(cb.att);
      if (cb.step === 'offer') {
        if (T.side === AI || duelRefuseWhy(T)) duelDecide(T.side === AI ? aiAcceptDuel(T, A) : true);
        else break;
      } else if (cb.step === 'roll') {
        duelResolve();
      } else {
        await recordDuel();
        break;
      }
      continue;
    }
    renderCombat();
    await sleep(cb.step === 'done' ? 1600 : 1300);
    if (!cb) break;
    const T = byId(cb.tgt) || base(cb.tgt);
    if (cb.step === 'att') {
      const parry = hitParry(T);
      if (
        cb.groups.some(g => g.blessable) &&
        blessOk(base(cb.att)) &&
        (cb.blessA || base(cb.att).side === AI)
      ) {
        cb.blessA = true;
        cb.blessUsedA = true;
        cb.groups.forEach(g => {
          if (g.blessable) g.blessed = true;
        });
      }
      cb.groups.forEach(g => rollHits(g, g.nUse ?? g.n, parry));
      glimApply();
      cb.hits = cb.groups.reduce((a, g) => a + g.hits, 0);
      cb.wounds = 0;
      cb.extra = 0;
      cb.step = cb.hits ? 'def' : 'done';
    } else if (cb.step === 'def') {
      if (
        (cb.type === 'clash' || cb.type === 'impact') &&
        blessOk(T) &&
        T.side !== AI &&
        !PVP() &&
        cb.blessT == null
      ) {
        await new Promise(res => {
          cb.blessWait = res;
          renderCombat();
        });
        cb.blessWait = null;
      }
      if ((cb.type === 'clash' || cb.type === 'impact') && blessOk(T) && (cb.blessT || T.side === AI)) {
        cb.blessT = true;
        cb.blessUsedT = true;
      }
      if (await huRolls('def')) continue;
      rollDef(T);
      cb.step = cbMorale() && cb.wounds ? 'mor' : 'done';
    } else if (cb.step === 'mor') {
      const mi = moraleInfo(T, byId(cb.att) || base(cb.att));
      if (mi.auto) {
        cb.mi = mi;
        cb.extra = 0;
        cb.step = 'done';
      } else {
        if (await huRolls('mor')) continue;
        rollMor(T);
        cb.step = 'done';
      }
    } else {
      renderCombat();
      const cur = cb;
      await recordCombat();
      logAI(state.lastText);
      if (cb === cur) break;
    }
  }
  renderCombat();
}

async function aiCast(id, spellName, targetId) {
  const u = byId(id),
    sp = (u.spells || []).find(s => s.name.toLowerCase() === String(spellName || '').toLowerCase());
  const pr = rx(u.charRules, 'Priest') || rx(u.charRules, 'Wizard');
  if (!sp || !pr || !u.onTable) {
    await charCommit(id, { note: 'No action.' });
    return `the ${u.charName} takes no action`;
  }
  const cp = corners(u),
    ok = t =>
      sp.req === 'automaton'
        ? rh(t.rules, 'Automaton')
        : sp.req === 'nonmonster'
          ? t.type !== 'monster'
          : true;
  const cands = all().filter(
    t =>
      t.onTable &&
      !t.destroyed &&
      (sp.targets === 'enemy' ? t.side !== u.side : t.side === u.side) &&
      polyDist(cp, corners(t)) <= sp.range + 1e-6 &&
      ok(t)
  );
  const T = cands.find(t => t.id === targetId) || cands[0];
  if (!T) {
    await charCommit(id, { note: 'No action (no target in range).' });
    return `the ${u.charName} finds no target for ${sp.name}`;
  }
  const caster = t =>
    rx(t.rules, 'Priest') ||
    rx(t.rules, 'Wizard') ||
    (t.charName && (rx(t.charRules, 'Priest') || rx(t.charRules, 'Wizard')));
  const interf = all().some(
    t =>
      t.onTable &&
      t.side !== u.side &&
      caster(t) &&
      (polyDist(cp, corners(t)) <= 10 || polyDist(corners(T), corners(t)) <= 10)
  );
  const att = sp.att - (interf ? 1 : 0),
    n = live(T),
    need =
      2 + (sp.scaling ? (n >= 10 ? 3 : n >= 7 ? 2 : n >= 4 ? 1 : 0) + (T.type === 'monster' ? 1 : 0) : 0),
    devout = rh(T.rules, 'Devout');
  const rolls = Array.from({ length: pr }, d6);
  let succ = rolls.filter(v => v === 1 || (v <= att && v !== 6)).length;
  if (devout && succ < pr) succ++;
  const won = succ >= need;
  banner(
    `${u.charName} casts ${sp.name} on ${T.short || T.name}`,
    rolls.map(v => ({ v, cls: v === 1 || (v <= att && v !== 6) ? 'hit' : 'miss' })),
    `${succ} successes, needs ${need}: ${won ? 'the spell works' : 'the spell fails'}`
  );
  await sleep(1600);
  bannerHide();
  if (!won) nullMage(u);
  await charCommit(id, {
    spell: sp.name,
    target: won ? T.id : null,
    effect: won ? sp.effect : null,
    rolls,
    success: won,
    note: `Cast ${sp.name} on ${T.short || T.name}: ${rolls.join(', ')} (${succ} successes, needed ${need}), ${won ? 'success' : 'failed'}.`
  });
  return `the ${u.charName} casts ${sp.name} on ${T.short || T.name}: ${won ? 'it works' : 'it fails'}`;
}

/* the opponent casting: pick and resolve without the panel */
async function aiCastSpell(u, asChar, spellName, targetId) {
  const sps = spellsOf(u, asChar),
    lvl = magicLevel(u, asChar);
  const sp = sps.find(s => s.name.toLowerCase() === String(spellName || '').toLowerCase()) || null;
  if (!sp || !lvl) return null;
  const C = spellTargets(u, sp);
  const T = C.find(t => t.id === targetId) || C[0];
  if (!T) return sp.name + ': no target';
  const S = sp.db || {},
    need = srNeed(u, asChar, spellNeed(sp, T));
  const caster = t =>
    rx(t.rules, 'Priest') ||
    rx(t.rules, 'Wizard') ||
    (t.charName && (rx(t.charRules, 'Priest') || rx(t.charRules, 'Wizard'))) ||
    (CASTERS[frBase(t)] && CASTERS[frBase(t)].reg) ||
    globeWizard(t);
  const cp = casterPoly(u),
    interf = all().some(
      t =>
        t.onTable &&
        t.side !== u.side &&
        caster(t) &&
        (polyDist(cp, casterPoly(t)) <= 10 || polyDist(corners(T), casterPoly(t)) <= 10)
    );
  let succ;
  if (S.a === null || (rh(T.rules, 'Gifted Mortals') && T.side === u.side && asChar))
    succ = Math.max(need, 2);
  else {
    const att = (S.a === 'D' ? +T.stats.D || 0 : sp.att) - (interf ? 1 : 0),
      jk = jadooAvail(u, asChar),
      rolls = Array.from({ length: lvl + srSpellDice(u, asChar) }, d6).map(v =>
        v === 6 && ((asChar && upgOf(u, /Devoted to Hazlia/)) || jk) ? d6() : v
      );
    sacrSpend(u, asChar);
    if (jk) await jadooMark(u, asChar);
    succ = rolls.filter(v => v === 1 || (v <= att && v !== 6)).length + srBrand(u, sp, T);
    if (
      T.side === u.side &&
      (rh(T.rules, 'Devout') || (T.charName && rh(T.charRules || [], 'Devout'))) &&
      succ < lvl
    )
      succ++;
    if (T.side !== u.side && fx(T).some(e => /Elemental Vortex/.test(e))) succ = Math.max(0, succ - 2);
    banner(
      `${asChar ? u.charName : u.short || u.name} casts ${sp.name} on ${T.short || T.name}`,
      rolls.map(v => ({ v, cls: v === 1 || (v <= att && v !== 6) ? 'hit' : 'miss' })),
      `${succ} successes, needs ${need}`
    );
    await sleep(1400);
    bannerHide();
  }
  if (succ < need) {
    /* Sorcerer Kings: every spell cast (even a failed one) adds a Ritual Marker */
    try {
      await skSpellMarker(u.id, sp, asChar, true);
    } catch (e) {}
    return `${sp.name} on ${T.short || T.name} fails (${succ}/${need})`;
  }
  const line = await resolveSpell(u.id, sp, T.id, succ, asChar);
  return `casts ${sp.name}: ${line}`;
}
