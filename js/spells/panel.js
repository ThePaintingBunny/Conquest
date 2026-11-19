/*
 * Spellcasting panel
 *
 * The spell list and casting controls in the activation panel.
 *
 * In this file: spellBox()
 */

/* the casting panel, shared by characters and spellcasting regiments */
function spellBox(box, u, asChar, ctx, onDone) {
  const sps = spellsOf(u, asChar),
    lvl = magicLevel(u, asChar);
  const ck = casterKey(u, asChar),
    C = CASTERS[ck] || {};
  if (C.sch) {
    const r = document.createElement('div');
    r.className = 'row';
    const lb = document.createElement('span');
    lb.className = 'tf-l';
    lb.textContent = (C.label || 'School') + ':';
    const s = document.createElement('select');
    s.setAttribute('aria-label', C.label || 'School');
    Object.keys(C.sch).forEach(k => {
      const o = document.createElement('option');
      o.value = k;
      o.textContent = k;
      s.appendChild(o);
    });
    s.value = spellSchool(u, asChar);
    s.onchange = () => {
      putState({
        units: state.units.map(x =>
          x.id === u.id ? Object.assign({}, x, { [asChar ? 'cschool' : 'school']: s.value }) : x
        )
      });
      ctx.spell = 0;
      ctx.rolls = null;
    };
    r.append(lb, s);
    /* Talented: pick the second School */
    if (asChar && upgOf(u, /Talented/)) {
      const s2 = document.createElement('select');
      s2.setAttribute('aria-label', 'Second School (Talented)');
      const first = spellSchool(u, asChar);
      Object.keys(C.sch)
        .filter(k => k !== first)
        .forEach(k => {
          const o = document.createElement('option');
          o.value = k;
          o.textContent = k;
          s2.appendChild(o);
        });
      s2.value = talentedSchool(u, C, first);
      s2.onchange = () => {
        putState({
          units: state.units.map(x => (x.id === u.id ? Object.assign({}, x, { cschool2: s2.value }) : x))
        });
        ctx.spell = 0;
        ctx.rolls = null;
      };
      const l2 = document.createElement('span');
      l2.className = 'tf-l';
      l2.textContent = 'Talented:';
      r.append(l2, s2);
    }
    box.appendChild(r);
  }
  if (!sps.length || !lvl) {
    box.appendChild(ptext('No spells to cast.'));
    return false;
  }
  const castSoFar = ctx.cast || [];
  const sel = document.createElement('select');
  sel.setAttribute('aria-label', 'Spell');
  sps.forEach((s, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    const S = s.db || {};
    o.textContent = `${s.name} (${s.range === 0 ? 'Self' : s.range + '″'}, ${S.a === null ? 'automatic' : 'Attunement ' + (S.a === 'D' ? '= Defense' : s.att)}${s.scaling ? ', Scaling' : ''})`;
    sel.appendChild(o);
  });
  sel.value = String(ctx.spell || 0);
  sel.onchange = () => {
    ctx.spell = +sel.value;
    ctx.target = null;
    ctx.rolls = null;
    render();
  };
  box.appendChild(sel);
  const sp = sps[ctx.spell || 0];
  if (!sp) return false;
  /* show this spell's range and targets on the board */
  spellView = { uid: u.id, sp, ctx, asChar };
  requestAnimationFrame(redrawSpellZone);
  box.appendChild(ptext(sp.text || ''));
  if (castSoFar.includes(sp.name)) {
    box.appendChild(ptext('Already cast this activation.', 'warn'));
    return false;
  }
  const cands = spellTargets(u, sp);
  if (!cands.length) {
    const S0 = sp.db || {},
      hitSp = (S0.h || S0.hf || /Hit/.test(sp.text || '')) && sp.targets === 'enemy';
    box.appendChild(
      ptext(
        hitSp
          ? 'No legal target: no enemy in range that the caster can see (spells that cause Hits need Line of Sight).'
          : 'No legal target in range.'
      )
    );
    return false;
  }
  if (!ctx.target || !cands.some(c => c.id === ctx.target)) ctx.target = cands[0].id;
  if (cands.length > 1 || cands[0].id !== u.id) {
    const ts = document.createElement('select');
    ts.setAttribute('aria-label', 'Spell target');
    const cp = corners(u);
    cands.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id;
      o.textContent =
        (c.short || c.name) +
        (c.side !== u.side ? ' (enemy)' : '') +
        ' · ' +
        polyDist(cp, corners(c)).toFixed(1) +
        '″';
      ts.appendChild(o);
    });
    ts.value = ctx.target;
    ts.onchange = () => {
      ctx.target = ts.value;
      ctx.rolls = null;
      render();
    };
    box.appendChild(ts);
  }
  const T = byId(ctx.target),
    S = sp.db || {};
  /* Dark Supplication: the caster's player picks the pool */
  if (S.x === 'supplication') {
    if (!ctx.pool) ctx.pool = odSuppPool(u.side);
    const ps = document.createElement('select');
    ps.setAttribute('aria-label', 'Pool for the token');
    [
      ['dark', 'Add the token to Dark Power'],
      ['pant', 'Add the token to Fallen Pantheon']
    ].forEach(([v, t]) => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent =
        t + ' (' + (+frG(u.side, 'od')[v] || 0) + ' now, Tier ' + ROMAN[odTier(u.side, v)] + ')';
      ps.appendChild(o);
    });
    ps.value = ctx.pool;
    ps.onchange = () => {
      ctx.pool = ps.value;
    };
    box.appendChild(ps);
  }
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
  const talos = all().filter(
    t =>
      t.onTable &&
      t.side === u.side &&
      (t.abilities || []).some(a => /Blood of the Forge God/.test(a[0])) &&
      polyDist(cp, corners(t)) <= 10
  ).length;
  const auto =
    S.a === null ||
    (rh(T.rules, 'Gifted Mortals') && T.side === u.side && asChar) ||
    (asChar && charAct && charAct.autoWin);
  const att = (S.a === 'D' ? +T.stats.D || 0 : sp.att) - (interf ? 1 : 0),
    dice = lvl + talos + srSpellDice(u, asChar),
    need = srNeed(u, asChar, spellNeed(sp, T));
  const devout = rh(T.rules, 'Devout') || (T.charName && rh(T.charRules || [], 'Devout')),
    vortex = T.side !== u.side && fx(T).some(e => /Elemental Vortex/.test(e));
  const go = succ => {
    ctx.done = true;
    suppPool = ctx.pool || null;
    resolveSpell(u.id, sp, T.id, succ, asChar).then(line =>
      onDone({ spell: sp.name, target: T.id, line, success: true })
    );
  };
  if (auto) {
    box.appendChild(
      ptext(
        rh(T.rules, 'Gifted Mortals')
          ? 'Gifted Mortals: the spell succeeds automatically.'
          : 'This spell is cast automatically.'
      )
    );
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = 'Cast ' + sp.name;
    b.onclick = () => {
      b.disabled = true;
      go(Math.max(need, 2));
    };
    box.appendChild(b);
    return true;
  }
  box.appendChild(
    ptext(
      `${dice} dice (Magic Level ${lvl}${talos ? ' +' + talos + ' Blood of the Forge God' : ''}), success on ${att} or less${interf ? ' (−1: enemy spellcaster within 10″)' : ''}. Needs ${need} successes${devout && T.side === u.side ? '; Devout turns one failed die into a success' : ''}${vortex ? '; Elemental Vortex removes 2 successes' : ''}.`
    )
  );
  if (!ctx.rolls) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = 'Cast ' + sp.name;
    b.onclick = () => {
      ctx.rolls = Array.from({ length: dice }, d6);
      /* Devoted to Hazlia: the character re-rolls results of 6 */
      if (asChar && upgOf(u, /Devoted to Hazlia/)) ctx.rolls = ctx.rolls.map(v => (v === 6 ? d6() : v));
      sacrSpend(u, asChar);
      render();
    };
    box.appendChild(b);
    return true;
  }
  const dr = document.createElement('div');
  dr.className = 'drow';
  let succ = 0;
  ctx.rolls.forEach(v => {
    const s = v === 1 || (v <= att && v !== 6);
    if (s) succ++;
    dr.appendChild(dieMini(v, s ? 'hit' : 'miss'));
  });
  box.appendChild(dr);
  /* Jadoo Kavach: re-roll the 6s, the player's choice of cast */
  if (
    !ctx.jk &&
    ctx.rolls.includes(6) &&
    !(asChar && upgOf(u, /Devoted to Hazlia/)) &&
    jadooAvail(u, asChar)
  ) {
    const jb = document.createElement('button');
    jb.type = 'button';
    jb.className = 'btn ghost';
    jb.textContent = 'Jadoo Kavach: re-roll the 6s (once this round)';
    jb.onclick = async () => {
      jb.disabled = true;
      ctx.jk = true;
      ctx.rolls = ctx.rolls.map(v => (v === 6 ? d6() : v));
      await jadooMark(u, asChar);
      render();
    };
    box.appendChild(jb);
  }
  succ += srBrand(u, sp, T);
  if (devout && T.side === u.side && succ < dice) succ++;
  if (vortex) succ = Math.max(0, succ - 2);
  const won = succ >= need;
  box.appendChild(
    ptext(
      `${succ} success${succ === 1 ? '' : 'es'}: ${won ? 'the spell is cast.' : 'the spell fails.'}`,
      'tot'
    )
  );
  const ap = document.createElement('button');
  ap.type = 'button';
  ap.className = 'btn';
  ap.textContent = won ? 'Apply ' + sp.name : 'Spell failed: continue';
  ap.onclick = () => {
    ap.disabled = true;
    if (won) go(succ);
    else {
      nullMage(u);
      skSpellMarker(u.id, sp, asChar, true).catch(() => {});
      onDone({
        spell: sp.name,
        target: T.id,
        line: sp.name + ' failed (' + succ + '/' + need + ')',
        success: false
      });
    }
  };
  box.appendChild(ap);
  return true;
}
