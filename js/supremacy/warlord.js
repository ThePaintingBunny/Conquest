/*
 * Warlord and Supremacy Ability
 *
 * Finds the Warlord, its Supremacy Ability and roles, declares a Warlord, and activates the ability.
 *
 * In this file: supRoles(), SUPALIAS, supWl(), supKey(), supAllyU(), supAll(), supOf(), supApply(),
 *   supActivate(), wlCands(), wlMissing(), wlDeclare()
 */

function supRoles(u) {
  const r = frRoles(u).slice();
  try {
    itemRoles(u).forEach(x => {
      if (!r.includes(x)) r.push(x);
    });
  } catch (e) {}
  /* Professional Troops: Feudal regiments in its holder's warband are Veteran; Feudal units gain the Dynastic Ally's role */
  if (frFac(u) === 'Hundred Kingdoms' && r.includes('Feudal')) {
    const PT = supAll(u.side).find(S => S.k === 'Professional Troops');
    if (PT) {
      if (!u.charName && PT.wl && srSameWb(PT.wl, u) && !r.includes('Veteran')) r.push('Veteran');
      const al = supAllyU(u.side),
        ar = al && frRoles(al, true).find(x => /^(Imperial|Feudal|Theist|The Orders)$/.test(x));
      if (ar && !r.includes(ar)) r.push(ar);
    }
  }
  if (frFac(u) === 'Old Dominion') {
    const wl = supWl(u.side);
    if (/Hierodeacon/.test((wl && wl.charName) || '') && /Cultists|Hashashin/.test(frBase(u)))
      r.push('The Fallen Pantheon');
  }
  return r;
}

const SUPALIAS = { 'concetrated assault': 'Concentrated Assault', 'for all mankind': 'For All Mankind' };

function supWl(side) {
  return (
    (state.units || []).find(
      u => u.side === side && (u.warlord || u.warlordMonster) && u.type !== 'marker'
    ) || null
  );
}

function supKey(u) {
  if (!u) return '';
  const cn = (u.charName || frBase(u) || '') + (u.charOrder ? ' (' + u.charOrder + ')' : '');
  const byC = Object.keys(SUP).find(
    k =>
      SUP[k].c &&
      SUP[k].c.test(cn) &&
      (!/Strategos/.test(cn) || /Mounted/.test(cn) === (k === 'Glimmers of a Golden Age'))
  );
  const e = frEncy(u, u.charName || null),
    m = e && String(e.options || '').match(/Supremacy:\s*([^;]+)/);
  if (!m) return byC || '';
  const names = m[1]
    .split(/,\s*|\s+or\s+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => SUPALIAS[s.toLowerCase()] || s);
  if (names.length > 1 && byC && names.includes(byC)) return byC;
  return names[0] || byC || '';
}

/* Hundred Kingdoms Dynastic Ally: a second character with its own Supremacy Ability (and the rules that refer to the
   Warlord's warband), used as if it were the Warlord. It does not count as the Warlord for anything else. Only one
   Activated Supremacy Ability may be used per Supremacy Phase. Its activation is kept under the key "<side>@ally". */
function supAllyU(side) {
  return (state.units || []).find(u => u.side === side && u.dynAlly && u.type !== 'marker') || null;
}

function supAll(side) {
  return [supOf(side), supOf(side, 'ally')].filter(Boolean);
}

function supOf(side, who) {
  const ally = who === 'ally',
    wl = ally ? supAllyU(side) : supWl(side);
  if (!wl) return null;
  const k = supKey(wl);
  if (!k) return null;
  const d = SUP[k] || {
    t: '',
    p: 'The text of this Supremacy Ability is not in the rules this map uses yet. Check the Warlord’s card.',
    a: '',
    unknown: true
  };
  const key = ally ? side + '@ally' : side,
    okey = ally ? side : side + '@ally',
    g = (state.sup || {})[key] || {},
    R = state.round || 1,
    on = !!wl.onTable && !wl.destroyed && !(ally && wl.charSlain),
    used = +g.n || 0;
  const active = g.round === R,
    max = d.uses || 1,
    otherActive = ((state.sup || {})[okey] || {}).round === R;
  let why = '';
  if (!d.a && !d.unknown) why = 'No Activated part';
  else if (!on) why = ally ? 'The Dynastic Ally must be on the table' : 'The Warlord must be on the table';
  else if (active) why = 'Already active this round';
  else if (otherActive) why = 'Only one Activated Supremacy Ability per Supremacy Phase';
  else if (!d.every && used >= max) why = max > 1 ? 'Used twice already' : 'Already used this battle';
  return { wl, k, d, on, used, active, why, can: !why, g, choice: g.choice, ally, key };
}

function supApply(units, side, S, choice) {
  const g = S.d.g;
  if (!g) return units;
  const src = 'Supremacy: ' + S.k;
  return units.map(u => {
    if (u.side !== side || u.type === 'marker' || u.destroyed || !u.onTable || !g.who(u)) return u;
    let y = grantU(u, src, typeof g.rules === 'function' ? g.rules(u) : g.rules || [], g.stats || null);
    if (g.heal && (y.wounds || 0) > 0 && canHeal(y))
      y = Object.assign({}, y, { wounds: Math.max(0, (y.wounds || 0) - g.heal) });
    return y;
  });
}

async function supActivate(side, choice, who) {
  const S = supOf(side, who);
  if (!S || !S.can) {
    toast(S ? S.why : 'No Supremacy Ability');
    return false;
  }
  const sup = Object.assign({}, state.sup || {});
  sup[S.key] = Object.assign({}, S.g, {
    n: (S.used || 0) + 1,
    round: state.round || 1,
    choice: choice || '',
    chosen: (S.g.chosen || []).concat(choice ? [choice] : [])
  });
  let units = supApply(state.units || [], side, S, choice);
  if (choice === 'Snæstormur')
    units = units.map(u =>
      u.side !== side && u.type !== 'marker' && !u.destroyed
        ? grantU(u, 'Snæstormur (−1 March, no Charge re-rolls)', [], { M: -1 })
        : u
    );
  if (choice === 'Niflmire')
    units = units.map(u =>
      u.type !== 'marker' && !u.destroyed ? grantU(u, 'Niflmire (Barrage range halved)', [], null) : u
    );
  await putState({
    sup,
    units,
    lastTitle: WHO(side) + ' · Supremacy',
    lastText: `${S.wl.charName || 'The Warlord'}${S.ally ? ' (Dynastic Ally)' : ''} activates ${S.k}${choice ? ' (' + choice + ')' : ''}: ${S.d.a}`
  });
  return true;
}

/* the Supremacy step: after the First Player is set, First Player declares, then the other */
/* characters (or monster characters) that could be the Warlord when none was declared */
function wlCands(side) {
  return (state.units || []).filter(
    u =>
      u.side === side &&
      !u.destroyed &&
      u.type !== 'marker' &&
      ((u.charName && canWarlord(frEncy(u, u.charName) || { name: u.charName })) ||
        (!u.charName && u.type === 'monster' && (frEncy(u) || {}).kind === 'char' && canWarlord(frEncy(u))))
  );
}

function wlMissing(side) {
  return !supWl(side) && wlCands(side).length > 0 && (PVP() || side === HU);
}

async function wlDeclare(id) {
  const u = base(id);
  if (!u) return;
  await putState({
    units: state.units.map(x =>
      x.side !== u.side
        ? x
        : x.id === id
          ? Object.assign({}, x, x.charName ? { warlord: true } : { warlordMonster: true })
          : Object.assign({}, x, { warlord: false, warlordMonster: false })
    ),
    lastTitle: N(u.side) + ' · Warlord',
    lastText: (x => x)((u.charName || u.short || u.name) + ' is declared the Warlord.')
  });
}
