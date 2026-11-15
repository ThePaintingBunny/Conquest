/*
 * W'adrhŭn
 *
 * Cults, the Chant sequence, Unsung markers, Adaptability and each regiment's Chant bonus.
 *
 * In this file: wadCult(), wadUnsungOf(), wadAdaptTargets(), wadOnChant(), CHANTB, srChantBonus()
 */

/* the Cult whose Chant Markers a W'adrhŭn regiment adds: its own [Cult of …] role (Chosen, Scions), otherwise the
   Cult its warband's character follows */
function wadCult(u) {
  const r = (frRoles(u).find(x => /^Cult of/.test(x)) || '').replace('Cult of ', '');
  return r || u.cult || '';
}

/* Chanting the Battlecry, step 3 and 5: the markers of the chosen Cult are discarded (Conquest markers make up the
   two if needed) and the rest are Unsung */
function wadUnsungOf(seq, c) {
  const left = seq.slice();
  const take = k => {
    const i = left.indexOf(k);
    if (i >= 0) left.splice(i, 1);
    return i >= 0;
  };
  /* Step 3 needs at least two; discarding more gains nothing, so exactly two are discarded (the Cult's own first, then
     exchanged Conquest markers) and the rest are Unsung (History may return any number of them) */
  let n = 0;
  while (n < 2 && take(c)) n++;
  while (n < 2 && c !== 'Conquest' && take('Conquest')) n++;
  return left;
}

/* W'adrhŭn character upgrades triggered by Chanting the Battlecry */
/* Adaptability targets: non-friendly Objective Markers within 6″ of the regiment, nearest first */
function wadAdaptTargets(u) {
  return all()
    .filter(m => isMarker(m) && m.onTable && !m.destroyed && m.side !== u.side)
    .map(m => [m, polyDist(corners(u), corners(m))])
    .filter(([, d]) => d <= 6)
    .sort((a, b) => a[1] - b[1])
    .map(([m]) => m);
}

async function wadOnChant(id, c, seq) {
  const u = base(id);
  if (!u) return [];
  let units = state.units;
  const notes = [];
  if (c === 'Conquest' && /Infantry/.test(u.cls || '') && upgOf(u, /Roar of the Awe/)) {
    units = units.map(x => (x.id === id ? grantU(x, "Roar of the Awe'khwge", ['Blessed']) : x));
    notes.push("Roar of the Awe'khwge: Blessed until the end of the round");
  }
  if (c === 'War' && /Cavalry/.test(u.cls || '') && upgOf(u, /Horn of Ronan/)) {
    units = units.map(x => (x.id === id ? grantU(x, 'The Horn of Ronan', ['Trample (+2)']) : x));
    notes.push('The Horn of Ronan: Trample (+2) until the end of the round');
  }
  /* the player picks the Adaptability target and decides on History in the activation panel; the AI takes the
     nearest marker and always uses History */
  const auto = !PVP() && !SBX() && u.side === AI;
  if (upgOf(u, /: Adaptability$/) && !auto) {
    if (wadAdaptTargets(u).length && act && act.id === id) {
      act.adaptPend = true;
      notes.push('Adaptability: choose the non-friendly Objective Marker within 6″ to destroy');
    } else notes.push('Adaptability: no non-friendly Objective Marker within 6″');
  }
  if (upgOf(u, /: Adaptability$/) && auto) {
    const mk = wadAdaptTargets(u).map(m => [m])[0];
    if (mk) {
      const m = mk[0];
      units = units.map(x =>
        x.id === m.id
          ? Object.assign({}, x, {
              onTable: false,
              destroyed: true,
              destroyedRound: state.round,
              destroyedBy: u.side,
              status: 'Destroyed'
            })
          : x
      );
      notes.push('Adaptability: ' + (m.short || m.name) + ' is destroyed');
    } else notes.push('Adaptability: no non-friendly Objective Marker within 6″');
  }
  /* History (Teaching of Famine): once per round the Unsung markers may become Famine markers and stay */
  const g = frG(u.side, 'wa'),
    unsung = wadUnsungOf(seq || [], c);
  let next = [];
  if (
    unsung.length &&
    g.histR !== state.round &&
    all().some(x => x.side === u.side && !x.destroyed && x.charName && upgOf(x, /: History$/))
  ) {
    if (!auto && act && act.id === id) {
      act.histPend = unsung.length;
      notes.push(
        'History: you may return the ' +
          unsung.length +
          ' Unsung marker' +
          (unsung.length > 1 ? 's' : '') +
          ' as Famine'
      );
    } else next = unsung.map(() => 'Famine');
    if (next.length)
      notes.push(
        'History: ' +
          unsung.length +
          ' Unsung marker' +
          (unsung.length > 1 ? 's return' : ' returns') +
          ' as Famine'
      );
  }
  if (notes.length) {
    toast(notes.join(' · '));
    await putState({ units, lastText: (state.lastText || '') + ' ' + notes.join('; ') + '.' });
  }
  return next;
}

/* ---- chants: the regiment's own [Chant] bonus ---- */
const CHANTB = {
  'Blood to be Spilled': { r: ['Impact (+2)'] },
  'Proven Warriors': { l: 'Charge +2″ (Proven Warriors)' },
  Momentum: {
    f: u => {
      act.momentum = true;
    }
  },
  'Show the Path': {
    f: u => {
      state.units = state.units.map(x => {
        if (x.side !== u.side || x.id === u.id || !srNear(x, u, 8) || !frRoles(x).includes('The Tribes'))
          return x;
        const c = +(x.stats && x.stats.C) || 0;
        return c >= 4 ? x : grantU(x, 'Show the Path (+1 Clash)', [], { C: 1 });
      });
    }
  },
  'Cultists of Conquest': {
    f: u => {
      act.srFirstMarch = (act.srFirstMarch || 0) + 3;
    }
  },
  'Singing Bullets': { r: ['Longshot'] },
  'Cultists of Death': { r: ['Flawless Strikes'] },
  Penance: { r: ['Juggernaut', 'Ignores Hindering terrain'] },
  'Mounted Riders': {
    r: ['Aimed Shot'],
    f: u => {
      act.freeVolley = true;
    }
  },
  'Mounted Hunters': {
    f: u => {
      act.freeVolley = true;
    }
  },
  'Thundering Charge': {
    f: u => {
      act.thunder = true;
    }
  },
  'Cultists of War': { r: ['Terrifying (2)'] },
  'Predatory Shriek': { r: ['Terrifying (+1)'] },
  'Cultists of Famine': { r: ['Terrifying (1)'] },
  'Dominating Presence': { r: ['Unyielding'], l: 'Dominating Presence (its Seize count cannot be reduced)' },
  'Primal Cacophony': { l: 'Primal Cacophony (enemies within 12″ cannot Heal, Rally or Entourage-activate)' }
};

function srChantBonus(id) {
  const u = base(id);
  if (!u) return [];
  const notes = [];
  const names = new Set();
  (u.rules || []).concat(cR(u)).forEach(r => {
    const s = String(r);
    const m = s.match(/^Chant:\s*([^(]+?)\s*(\(|$)/);
    if (m) names.add(m[1].trim());
    const n = s.replace(/\s*\(.*$/, '').trim();
    if (CHANTB[n]) names.add(n);
  });
  let units = state.units;
  const keep = state;
  names.forEach(n => {
    const C = CHANTB[n];
    if (!C) {
      const raw = (u.rules || []).find(r => String(r).startsWith('Chant: ' + n));
      const m = raw && String(raw).match(/^Chant:\s*(.+)$/);
      if (m && /^[A-Z][A-Za-z ]+\s*\(\+?\d+\)$/.test(m[1].trim())) {
        units = units.map(x => (x.id === id ? grantU(x, 'Chant bonus: ' + n, [m[1].trim()]) : x));
        notes.push(m[1].trim());
      }
      return;
    }
    if (C.r || C.l)
      units = units.map(x =>
        x.id === id ? grantU(x, C.l || 'Chant bonus: ' + n + ' (' + C.r.join(', ') + ')', C.r || []) : x
      );
    if (C.f) {
      state = Object.assign({}, state, { units });
      C.f(u);
      units = state.units;
      state = keep;
    }
    notes.push(n);
  });
  return { units, notes };
}
