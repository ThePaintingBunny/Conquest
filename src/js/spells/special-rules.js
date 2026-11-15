/*
 * Spell special rules
 *
 * Rules that change casting: Null Mage, extra dice, range bonuses, Aqueous Branding, Elemental Tether
 * and what triggers after a spell.
 *
 * In this file: nullMage(), srNeed(), srSpellDice(), srRangeAdd(), srBrand(), srTether(),
 *   srAfterSpell(), srRangeBonus()
 */

/* ---- spells: Herald of the Forge God, Arcane Tide Form, Elemental Tether, Aqueous Branding, Divine Purpose, Prowl ---- */
function nullMage(u) {
  if (!u) return;
  const cp = corners(u);
  const nm = (state.units || []).find(
    x => x.side !== u.side && srAlive(x) && offOn(x, 'nullMage') && polyDist(corners(x), cp) <= 10 + 1e-6
  );
  if (!nm) return;
  const b = base(u.id);
  if (!b) return;
  const AL = allocate(b, 2);
  setTimeout(
    () =>
      putState({
        units: state.units.map(x =>
          x.id === b.id
            ? Object.assign(
                {},
                x,
                { wounds: AL.w, auxWounds: AL.aw },
                AL.dead
                  ? { onTable: false, destroyed: true, status: 'Destroyed', destroyedRound: state.round }
                  : {}
              )
            : x
        ),
        lastTitle: N(nm.side) + ' · Null Mage',
        lastText:
          (nm.short || nm.name) +
          '’s Null Mage: the failed spell costs ' +
          (b.short || b.name) +
          ' 2 wounds. No Morale Tests.'
      })
        .then(() => toast('Null Mage: ' + (b.short || b.name) + ' takes 2 wounds.'))
        .catch(() => {}),
    300
  );
}

function srNeed(u, asChar, n) {
  return !asChar && rh(u.rules || [], 'Herald of the Forge God') ? Math.max(n, 4) : n;
}

function srSpellDice(u, asChar) {
  /* Unholy Sacrament (Old Dominion): Priest (+3) for the character's first Spellcasting Action this round */
  if (asChar && fxHas(u, /^Unholy Sacrament/) && (base(u.id) || {}).sacrR !== srRnd()) return 3;
  if (asChar || !rh(u.rules || [], 'Herald of the Forge God') || !act || act.id !== u.id) return 0;
  return act.actions.reduce((a, x) => a + ((x.combat && x.combat.hits) || 0), 0);
}

function srRangeAdd(u) {
  return act && act.id === u.id && act.spellRange4 ? 4 : 0;
}

function srBrand(u, sp, T) {
  return T &&
    T.side !== u.side &&
    hasGrant(T, 'Aqueous Branding') &&
    (SK_COURTS.Water || []).includes(sp.name)
    ? 1
    : 0;
}

function srTether(u, sp, C) {
  if (!(SK_COURTS.Air || []).includes(sp.name) || sp.targets === 'enemy') return [];
  const T = (state.units || []).filter(
    x => x.side === u.side && srAlive(x) && rh(x.rules, 'Elemental Tether')
  );
  if (!T.length) return [];
  return (state.units || []).filter(
    x =>
      x.side === u.side &&
      srAlive(x) &&
      !C.some(c => c.id === x.id) &&
      T.some(t => t.id === x.id || srNear(t, x, 8))
  );
}

async function srAfterSpell(cid, sp, tid, asChar) {
  const u = base(cid),
    T = base(tid);
  if (!u) return;
  let units = state.units,
    ch = false;
  if (
    asChar &&
    /Theist Priest/.test(u.charName || '') &&
    T &&
    T.side === u.side &&
    rh(RU(T), 'Divine Purpose')
  ) {
    units = units.map(x =>
      x.id === T.id ? grantU(x, 'Divine Purpose (+2″ to the first March or the Charge)', []) : x
    );
    ch = true;
  }
  if (rh(u.rules || [], 'Aqueous Branding') && T && T.side !== u.side) {
    units = units.map(x => (x.id === T.id ? grantU(x, 'Aqueous Branding', []) : x));
    ch = true;
  }
  if (rh(u.rules || [], 'Prowl')) {
    units = units.map(x => (x.id === u.id ? Object.assign({}, x, { prowlLost: srRound() }) : x));
    ch = true;
  }
  if (ch) await putState({ units });
}

function srRangeBonus(u) {
  if (!act || act.id !== u.id || !act.momentum) return 0;
  const a = act.actions.filter(x => !x.free)[0];
  if (!a || a.type !== 'march' || !(a.segs || []).every(s => s.mode === 'fwd')) return 0;
  return Math.min(4, Math.floor(a.dist || 0));
}
