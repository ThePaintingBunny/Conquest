/*
 * Supremacy choices
 *
 * Activated parts that need a choice (Hregg, Sacrifice, Master of the Legion, First Born, Lastor and
 * others) with their bar in the turn bar.
 *
 * In this file: supHregg(), supSacrifice(), MOTL, supMotl(), supFirstBorn(), LASTOR, lastorNeeded(),
 *   lastorSet(), supChoiceNeeded(), cdirNeeded(), supAiChoice(), supChoiceBar()
 */

/* activated parts that need a choice: Skývald's Hregg, Surrounded by Fear and Dead Men, Master of the Legions, First Born of War */
async function supHregg(side, tid) {
  const T = base(tid);
  if (!T) return;
  const AL = allocate(T, 5);
  await putState({
    units: state.units.map(x =>
      x.id === tid
        ? Object.assign(
            {},
            x,
            { wounds: AL.w, auxWounds: AL.aw },
            AL.dead
              ? {
                  onTable: false,
                  destroyed: true,
                  status: 'Destroyed',
                  destroyedRound: state.round,
                  destroyedBy: side
                }
              : {}
          )
        : x
    ),
    lastTitle: N(side) + ' · Skývald: Hregg',
    lastText: (T.short || T.name) + ' suffers 5 unavoidable wounds. No Morale Tests.'
  });
}

async function supSacrifice(side, tid) {
  const T = base(tid);
  if (!T) return;
  const W = +(T.stats && T.stats.W) || 4,
    before = live(T),
    AL = allocate(T, 3 * W),
    after = AL.dead ? 0 : live(Object.assign({}, T, { wounds: AL.w, auxWounds: AL.aw })),
    lost = Math.max(0, before - after);
  const g = frG(side, 'od');
  await putState({
    fr: frPatch(side, 'od', { pant: (+g.pant || 0) + lost }),
    units: state.units.map(x =>
      x.id === tid
        ? Object.assign(
            {},
            x,
            { wounds: AL.w, auxWounds: AL.aw },
            AL.dead
              ? {
                  onTable: false,
                  destroyed: true,
                  status: 'Destroyed (sacrificed)',
                  destroyedRound: state.round
                }
              : {}
          )
        : x
    ),
    lastTitle: N(side) + ' · Surrounded by Fear and Dead Men',
    lastText:
      (T.short || T.name) +
      ' loses ' +
      lost +
      ' stand' +
      (lost === 1 ? '' : 's') +
      '; +' +
      lost +
      ' Fallen Pantheon token' +
      (lost === 1 ? '' : 's') +
      (AL.dead ? '. It is destroyed (its Command Stand may Die Fighting).' : '.')
  });
}

const MOTL = {
  'Tier +1': ['Master of the Legions (Dark Power Tier +1)', []],
  'Memories of Old': ['Memories of Old', null],
  '2D6 Charge': ['Master of the Legions (2D6 Charge, pick the highest)', []],
  'loses Brittle': ['Loses Brittle (Master of the Legions)', []]
};

async function supMotl(side, picks) {
  let units = state.units;
  const lines = [];
  picks.forEach(([id, b]) => {
    const u = units.find(x => x.id === id);
    if (!u || !MOTL[b]) return;
    let y;
    if (b === 'Memories of Old') {
      const m = memOf(u);
      y = m ? grantU(u, 'Memories of Old', m.rules) : u;
    } else y = grantU(u, MOTL[b][0], MOTL[b][1]);
    units = units.map(x => (x.id === id ? y : x));
    lines.push((u.short || u.name) + ': ' + b);
  });
  await putState({
    units,
    sup: supMemo(side, { motlR: srRnd() }),
    lastTitle: N(side) + ' · Master of the Legions',
    lastText: lines.join('; ') || 'No regiment chosen.'
  });
}

async function supFirstBorn(side, ids) {
  let units = state.units;
  ids.forEach(id => {
    units = units.map(x =>
      x.id === id && !hasGrant(x, 'Awakened')
        ? grantU(
            Object.assign({}, x, { effects: (x.effects || []).filter(e => e !== 'Broken') }),
            'Awakened',
            awakenRules(x)
          )
        : x
    );
  });
  await putState({
    units,
    sup: supMemo(side, { fbR: srRnd() }),
    lastTitle: N(side) + ' · First Born of War',
    lastText:
      ids
        .map(id => {
          const u = base(id);
          return u ? u.short || u.name : id;
        })
        .join(' and ') + ' become Awakened.'
  });
}

const LASTOR = 'Last Oration (re-roll failed Defense within range of an Objective Zone)';

function lastorNeeded(side) {
  return (state.units || []).find(
    u => u.side === side && srAlive(u) && upgOf(u, /Last Oration/) && u.lastorR !== srRnd()
  );
}

async function lastorSet(id, on) {
  const R = srRnd();
  await putState({
    units: state.units.map(x =>
      x.id !== id ? x : Object.assign({}, on ? grantU(x, LASTOR, []) : x, { lastorR: R })
    ),
    lastTitle: N(base(id).side) + ' · Standard of Last Oration',
    lastText: on
      ? (base(id).short || base(id).name) +
        ' re-rolls failed Defense rolls within range of an Objective Zone this round.'
      : 'Standard of Last Oration not used this round.'
  });
}

function supChoiceNeeded(side) {
  if (cdirNeeded(side)) return 'cdir';
  if (lastorNeeded(side)) return 'lastor';
  const S = supOf(side);
  if (!S) return '';
  const R = srRnd();
  if (
    S.k === 'First Born of War' &&
    S.on &&
    supMem(side).fbR !== R &&
    (state.units || []).some(u => u.side === side && srAlive(u))
  )
    return 'fb';
  if (
    S.k === 'Master of the Legions' &&
    S.active &&
    supMem(side).motlR !== R &&
    (state.units || []).some(u => u.side === side && srAlive(u) && supRoles(u).includes('The Legion'))
  )
    return 'motl';
  if (S.k === 'Skývald' && S.active && S.choice === 'Hregg' && supMem(side).hrR !== R) return 'hregg';
  if (S.k === 'Surrounded by Fear and Dead Men' && S.active && supMem(side).sfR !== R) return 'sacrifice';
  return '';
}

function cdirNeeded(side) {
  return (state.units || []).find(
    /* every Supremacy Phase, on the table or not yet arrived: the Directive lasts the round */
    u =>
      u.side === side && !u.destroyed && u.type !== 'marker' && /Eidolon/.test(u.charName || '') && !cdirOf(u)
  );
}

async function supAiChoice(side) {
  const c = supChoiceNeeded(side),
    R = srRnd();
  if (c === 'lastor') {
    let e;
    while ((e = lastorNeeded(side))) await lastorSet(e.id, true);
    return supAiChoice(side);
  }
  if (c === 'cdir') {
    let e;
    while ((e = cdirNeeded(side))) await cdirSet(e.id, 'Precision Armament');
    return supAiChoice(side);
  }
  const mine = (state.units || []).filter(u => u.side === side && srAlive(u)),
    foes = (state.units || []).filter(u => u.side !== side && srAlive(u));
  const nearFoe = u => Math.min(99, ...foes.map(e => polyDist(corners(u), corners(e))));
  if (c === 'fb')
    await supFirstBorn(
      side,
      mine
        .sort((a, b) => nearFoe(a) - nearFoe(b))
        .slice(0, 2)
        .map(u => u.id)
    );
  if (c === 'motl')
    await supMotl(
      side,
      mine
        .filter(u => supRoles(u).includes('The Legion'))
        .sort((a, b) => nearFoe(a) - nearFoe(b))
        .slice(0, 2)
        .map(u => [u.id, nearFoe(u) < 12 ? '2D6 Charge' : memOf(u) ? 'Memories of Old' : 'loses Brittle'])
    );
  if (c === 'hregg') {
    const t = foes.sort((a, b) => (+b.points || 0) - (+a.points || 0))[0];
    await putState({ sup: supMemo(side, { hrR: R }) });
    if (t) await supHregg(side, t.id);
  }
  if (c === 'sacrifice') {
    const t = mine
      .filter(
        u =>
          supRoles(u).includes('The Fallen Pantheon') && !/Fallen Divinity/.test(u.name + (u.charName || ''))
      )
      .sort((a, b) => (+a.points || 0) - (+b.points || 0))[0];
    await putState({ sup: supMemo(side, { sfR: R }) });
    if (t) await supSacrifice(side, t.id);
  }
}

function supChoiceBar(add, mk, me, info) {
  const c = supChoiceNeeded(me);
  if (!c) return false;
  const R = srRnd(),
    mine = (state.units || []).filter(u => u.side === me && srAlive(u)),
    foes = (state.units || []).filter(u => u.side !== me && srAlive(u));
  const mkSel = (lab, L, none) => {
    const s = document.createElement('select');
    s.setAttribute('aria-label', lab);
    if (none) {
      const o = document.createElement('option');
      o.value = '';
      o.textContent = none;
      s.appendChild(o);
    }
    L.forEach(u => {
      const o = document.createElement('option');
      o.value = u.id;
      o.textContent = u.short || u.name;
      s.appendChild(o);
    });
    add(s);
    return s;
  };
  if (c === 'lastor') {
    const e = lastorNeeded(me);
    info.textContent =
      'Standard of Last Oration with ' +
      (e.short || e.name) +
      ' (end of the Supremacy Phase): until the end of the round it re-rolls failed Defense rolls while within range of an Objective Zone.';
    add(mk('Activate it', () => lastorSet(e.id, true)));
    add(mk('Not this round', () => lastorSet(e.id, false)));
    return true;
  }
  if (c === 'cdir') {
    const e = cdirNeeded(me);
    info.textContent =
      'Combat Directive for the Eidolon with ' +
      (e.short || e.name) +
      ' (end of the Supremacy Phase): choose one until the end of the round.';
    cdirKeys(e).forEach(k => add(mk(k, () => cdirSet(e.id, k))));
    return true;
  }
  if (c === 'fb') {
    info.textContent = 'First Born of War: choose two friendly regiments to become Awakened this round.';
    const a = mkSel('First regiment', mine),
      b = mkSel('Second regiment', mine, 'none');
    add(
      mk('Awaken them', () =>
        supFirstBorn(
          me,
          [a.value, b.value].filter((v, i, A) => v && A.indexOf(v) === i)
        )
      )
    );
    return true;
  }
  if (c === 'motl') {
    info.textContent = 'Master of the Legions: up to two Legion regiments each gain one benefit this round.';
    const L = mine.filter(u => supRoles(u).includes('The Legion'));
    const rows = [0, 1].map(i => {
      const s = mkSel('Legion regiment ' + (i + 1), L, i ? 'none' : null);
      const b = document.createElement('select');
      b.setAttribute('aria-label', 'Benefit ' + (i + 1));
      Object.keys(MOTL).forEach(k => {
        const o = document.createElement('option');
        o.value = k;
        o.textContent = k;
        b.appendChild(o);
      });
      add(b);
      return [s, b];
    });
    add(
      mk('Apply', () =>
        supMotl(
          me,
          rows.filter(([s]) => s.value).map(([s, b]) => [s.value, b.value])
        )
      )
    );
    return true;
  }
  if (c === 'hregg') {
    info.textContent = 'Skývald, Hregg: one enemy regiment suffers 5 unavoidable wounds (no Morale Tests).';
    const s = mkSel('Hregg target', foes);
    add(
      mk('Strike', async () => {
        await putState({ sup: supMemo(me, { hrR: R }) });
        await supHregg(me, s.value);
      })
    );
    return true;
  }
  if (c === 'sacrifice') {
    info.textContent =
      'Surrounded by Fear and Dead Men: destroy up to 3 stands of another Fallen Pantheon regiment; each stand gives a Fallen Pantheon token.';
    const L = mine.filter(
      u => supRoles(u).includes('The Fallen Pantheon') && !/Fallen Divinity/.test(u.name + (u.charName || ''))
    );
    if (!L.length) {
      putState({ sup: supMemo(me, { sfR: R }) });
      return true;
    }
    const s = mkSel('Regiment to sacrifice', L);
    add(
      mk('Sacrifice', async () => {
        await putState({ sup: supMemo(me, { sfR: R }) });
        await supSacrifice(me, s.value);
      })
    );
    add(mk('Skip', () => putState({ sup: supMemo(me, { sfR: R }) }), true));
    return true;
  }
  return false;
}
