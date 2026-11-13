/* Character Draw Events and ability actions, and Claude's faction choices. */
/* ---------- character Draw Events and ability actions (Practitioners etc.) ---------- */
const CHAB = {
  Aristarch: [
    {
      n: 'Battlefield Order: Arms of Steel',
      kind: 'draw',
      rng: 12,
      tgt: 'friend',
      req: 'Infantry',
      grant: ['Untouchable'],
      label: 'Arms of Steel (Untouchable)',
      order: true,
      d: 'A friendly Infantry regiment within 12″ gains Untouchable until the end of the round.'
    },
    {
      n: 'Battlefield Order: Hearts of Iron',
      kind: 'draw',
      rng: 12,
      tgt: 'friend',
      req: 'Infantry',
      grant: ['Bravery'],
      label: 'Hearts of Iron (Bravery)',
      order: true,
      d: 'A friendly Infantry regiment within 12″ gains Bravery until the end of the round.'
    }
  ],
  'Lineage Prideborne': [
    {
      n: 'Snapshot',
      kind: 'action',
      rng: u => {
        const m = (u.charRules || []).join(', ').match(/Barrage\s*\(\d+\)\s*\(?(\d+)/);
        return m ? +m[1] : 16;
      },
      tgt: 'enemy',
      fn: 'wound1',
      d: 'An enemy regiment in sight and in Barrage range suffers 1 wound. No Resolve tests.'
    }
  ],
  'Lineage Highborne': [
    {
      n: 'Mighty Swing',
      kind: 'action',
      rng: 0.4,
      tgt: 'enemy',
      fn: 'wound1',
      d: 'An enemy regiment engaged with its regiment suffers 1 wound. No Resolve tests.'
    }
  ],
  Pheromancer: [
    {
      n: 'Suppress Higher Functions',
      kind: 'draw',
      rng: 12,
      tgt: 'friend',
      grant: ['Fearless'],
      d: 'A friendly regiment within 12″ gains Fearless this round.'
    },
    {
      n: 'Induce Vigor',
      kind: 'action',
      prac: 'Pheromancy',
      rng: 12,
      tgt: 'friend',
      grant: ['Untouchable'],
      d: 'A friendly regiment within 12″ gains Untouchable this round.'
    },
    {
      n: 'Pheromantic Drive',
      kind: 'action',
      prac: 'Pheromancy',
      rng: 12,
      tgt: 'self',
      fn: 'drive',
      d: 'Friendly Drone and Clone regiments within 12″ re-roll failed Resolve rolls of 6; its own regiment gains Tenacious (1).'
    },
    {
      n: 'Pheromantic Compulsion',
      kind: 'action',
      prac: 'Pheromancy',
      rng: 12,
      tgt: 'enemy',
      req: 'monster',
      label: 'Pheromantic Compulsion (counts as 0 stands for zones)',
      d: 'An enemy Monster within 12″ counts as 0 stands for Seizing and Contesting this round.'
    },
    {
      n: 'Siphon Strength',
      kind: 'action',
      prac: 'Pheromancy',
      rng: 12,
      tgt: 'enemy',
      label: 'Siphon Strength (no Inspiration, no Aimed Shot)',
      d: 'An enemy regiment within 12″ cannot be Inspired or use Aimed Shot this round.'
    }
  ],
  Biomancer: [
    {
      n: 'Epigenetic Trigger',
      kind: 'draw',
      rng: 12,
      tgt: 'friend',
      label: 'Epigenetic Trigger (Command Stand +2 Attacks)',
      d: 'The Command Stand of a friendly regiment within 12″ gets +2 Attacks this round.'
    },
    {
      n: 'Essence Transfer',
      kind: 'action',
      prac: 'Biomancy',
      rng: 12,
      tgt: 'friend',
      fn: 'essence',
      d: 'A friendly regiment within 12″ takes wounds equal to the lower of 2D6; another friendly non-Monster within 12″ heals 4.'
    },
    {
      n: 'Unstable Enhancement',
      kind: 'action',
      prac: 'Biomancy',
      rng: 12,
      tgt: 'friend',
      req: 'nonmonster',
      fn: 'unstable',
      d: 'A friendly non-Monster within 12″ rolls a die: 1–2 +1 March, 3–4 +1 Clash (max 4), 5–6 +1 Volley (max 4).'
    },
    {
      n: 'Catalytic Rupture',
      kind: 'action',
      prac: 'Biomancy',
      rng: 12,
      tgt: 'friend',
      fn: 'rupture',
      d: 'Enemies in contact with a friendly regiment within 12″ take Hits equal to the higher of 2D6, Armor Piercing (1), no Morale.'
    },
    {
      n: 'Grant Virulence',
      kind: 'action',
      prac: 'Biomancy',
      rng: 12,
      tgt: 'enemy',
      fn: 'virulence',
      d: 'An enemy regiment within 12″ takes D6 Hits with Armor Piercing equal to 6 minus the roll, no Morale.'
    }
  ],
  'High Clone Executor': [
    {
      n: 'Symbiotic Command',
      kind: 'action',
      rng: 12,
      tgt: 'friend',
      req: 'Clone',
      label: 'Double Time (Symbiotic Command)',
      d: 'A friendly Clone regiment within 12″ gains the Double Time Draw Event this round.'
    }
  ],
  'Matriarch Queen': [
    {
      n: 'To The Last Breath',
      kind: 'draw',
      rng: 10,
      tgt: 'friend',
      req: 'nonmonster',
      heal: 4,
      once1: true,
      d: 'A friendly non-Monster regiment within 10″ heals 4 wounds (each regiment once per round).'
    }
  ],
  Hierodeacon: [
    {
      n: 'Dark Shepherd',
      kind: 'draw',
      rng: 12,
      tgt: 'friend',
      fn: 'shepherd',
      d: 'A friendly regiment within 12″ takes wounds to finish off its most wounded stand. No Morale.'
    }
  ],
  Theokrator: [
    {
      n: 'Exploitation of Divine Vanity',
      kind: 'draw',
      tgt: 'self',
      fn: 'vanity',
      d: 'Its regiment takes 3 wounds for 1 Dark Power token and a boon such as Aura of Death (+10).'
    }
  ],
  'Mahabharati Sardar': [
    {
      n: 'Elemental Assault: Untouchable',
      kind: 'draw',
      rng: 12,
      tgt: 'friend',
      grant: ['Untouchable'],
      cost: 3,
      d: 'Spend 3 Ritual Markers: a friendly Mortal regiment gains Untouchable.'
    },
    {
      n: 'Elemental Assault: Relentless Blows',
      kind: 'draw',
      rng: 12,
      tgt: 'friend',
      grant: ['Relentless Blows'],
      cost: 3,
      d: 'Spend 3 Ritual Markers: a friendly Mortal regiment gains Relentless Blows.'
    }
  ],
  'Jorogumo Geisha': [
    {
      n: 'Monstrous Inspiration',
      kind: 'draw',
      tgt: 'self',
      label: 'Monstrous Inspiration (shares an Ideal Card effect within 8″)',
      d: 'Share one of its Ideal Card effects with friendly regiments within 8″ this round.'
    },
    {
      n: 'Whispered Illusion',
      kind: 'draw',
      tgt: 'self',
      label: 'Whispered Illusion (attackers test Resolve)',
      d: 'Enemies charging or clashing with it must pass a Resolve test with penalties.'
    }
  ],
  Taosidhe: [
    {
      n: 'Planting an Ambush',
      kind: 'draw',
      rng: 12,
      tgt: 'friend',
      req: 'Infantry',
      grant: ['Prowl', 'Pounce'],
      d: 'A friendly Infantry regiment within 12″ gains Prowl and Pounce this round.'
    }
  ],
  'Hold Raegh': [
    {
      n: 'Preternatural Focus',
      kind: 'draw',
      rng: 10,
      tgt: 'friend',
      fn: 'awaken',
      d: 'A friendly regiment within 10″ becomes Awakened.'
    }
  ],
  'Lost Ancestor': [
    {
      n: 'Unassailable Authority',
      kind: 'draw',
      tgt: 'self',
      fn: 'awaken',
      d: 'Its regiment becomes Awakened.'
    }
  ]
};
function chAbil(u) {
  if (!u || !u.charName) return [];
  let L = CHAB[u.charName] || [];
  /* Grotesque Elixir (Spires Experiment): once per game, a friendly Monstrosity within 12″ heals D6 */
  if (upgOf(u, /Grotesque Elixir/) && !(base(u.id) || {}).elixirUsed)
    L = L.concat([
      {
        n: 'Grotesque Elixir',
        kind: 'action',
        rng: 12,
        tgt: 'friend',
        req: 'Monstrosity',
        fn: 'elixir',
        d: 'Once per game: a friendly Monstrosity within 12″ heals D6 wounds.'
      }
    ]);
  if (upgOf(u, /Schemophore/) && !L.some(a => a.n === 'Dark Shepherd'))
    L = L.concat((CHAB.Hierodeacon || []).filter(a => a.n === 'Dark Shepherd'));
  if (upgOf(u, /Reaping Crook/))
    L = L.map(a => (a.n === 'Dark Shepherd' ? Object.assign({}, a, { rng: 999 }) : a));
  return L;
}
function chTargets(u, a) {
  if (a.tgt === 'self') return [u];
  const cp = corners(u);
  return all().filter(
    t =>
      t.onTable &&
      !t.destroyed &&
      t.type !== 'marker' &&
      (a.tgt === 'enemy' ? t.side !== u.side : t.side === u.side) &&
      polyDist(cp, corners(t)) <= (typeof a.rng === 'function' ? a.rng(u) : a.rng || 12) + 1e-6 &&
      (!a.once1 || t.ltb !== (state.round || 1)) &&
      (!a.req ||
        (a.req === 'monster'
          ? t.type === 'monster'
          : a.req === 'nonmonster'
            ? t.type !== 'monster'
            : a.req === 'Infantry'
              ? /Infantry/.test(t.cls || '')
              : frRoles(t).includes(a.req)))
  );
}
function chWhy(u, a) {
  if (!u.onTable) return 'Not on the table';
  if (a.cost && (+frG(u.side, 'sk').rm || 0) < a.cost) return 'Needs ' + a.cost + ' Ritual Markers';
  if (!chTargets(u, a).length) return 'No legal target in range';
  return '';
}
function autoDefend(T, hits, ap) {
  const D = Math.max(0, (+(T.stats && T.stats.D) || 0) - (ap || 0)),
    r = [];
  let w = 0;
  for (let i = 0; i < hits; i++) {
    const d = d6();
    r.push(d);
    if (d > D || d === 6) w++;
  }
  return { w, rolls: r };
}
function hurt(units, id, n) {
  return units.map(x => {
    if (x.id !== id || !n) return x;
    const AL = allocate(x, n);
    return Object.assign(
      {},
      x,
      { wounds: AL.w, auxWounds: AL.aw },
      AL.dead ? { onTable: false, destroyed: true, status: 'Destroyed', destroyedRound: state.round } : {}
    );
  });
}
/* resolve one ability; returns a log line */
async function useAbil(cid, name, tid) {
  const u = byId(cid),
    a = chAbil(u).find(x => x.n === name);
  if (!a) return '';
  const why = chWhy(u, a);
  if (why) return a.n + ': ' + why;
  const C = chTargets(u, a);
  const T = C.find(t => t.id === tid) || C[0];
  if (!T) return a.n + ': no target';
  const nm = t => t.short || t.name;
  let units = state.units.slice(),
    line = '',
    extra = {};
  if (a.prac && (T.temp || []).some(g => /^Practitioner/.test(g.src)))
    return a.n + ': ' + nm(T) + ' was already the target of a Practitioner action this round';
  const src = (a.prac ? 'Practitioner: ' : '') + (a.label || a.n);
  if (a.grant || a.label) {
    units = units.map(x => (x.id === T.id ? grantU(x, src, a.grant || [], null) : x));
    line = a.n + ' on ' + nm(T);
  }
  if (a.order && supAct(u.side, 'Infantry Tactics')) {
    units = units.map(x =>
      x.side === u.side && x.onTable && !x.destroyed && x.type !== 'monster' && x.type !== 'marker'
        ? grantU(x, src, a.grant || [], null)
        : x
    );
    line += ' (Infantry Tactics: every non-Monster regiment)';
  }
  if (a.heal && canHeal(T)) {
    units = units.map(x => {
      if (x.id !== T.id) return x;
      const h = Math.min(a.heal, +x.wounds || 0);
      return Object.assign({}, x, { wounds: (+x.wounds || 0) - h }, a.once1 ? { ltb: state.round || 1 } : {});
    });
    line = a.n + ': ' + nm(T) + ' heals ' + a.heal;
  }
  if (a.fn === 'wound1') {
    units = hurt(units, T.id, 1);
    line = a.n + ': ' + nm(T) + ' suffers 1 wound';
  }
  if (a.cost) extra.fr = frPatch(u.side, 'sk', { rm: (+frG(u.side, 'sk').rm || 0) - a.cost });
  if (a.fn === 'drive') {
    const cp = corners(u);
    units = units.map(x => {
      if (x.side !== u.side || !x.onTable || x.destroyed) return x;
      let y = x;
      if (x.id === u.id) y = grantU(y, src, ['Tenacious (+1)'], null);
      else if (polyDist(cp, corners(x)) <= 12 && frRoles(x).some(r => r === 'Drone' || r === 'Clone'))
        y = grantU(y, 'Pheromantic Drive (re-roll failed Resolve 6s)', [], null);
      return y;
    });
    line = 'Pheromantic Drive around ' + nm(u);
  }
  if (a.fn === 'essence') {
    const r1 = d6(),
      r2 = d6(),
      lo = Math.min(r1, r2);
    units = hurt(units, T.id, lo);
    const cp = corners(u),
      H = all()
        .filter(
          x =>
            x.side === u.side &&
            x.id !== T.id &&
            x.onTable &&
            !x.destroyed &&
            x.type !== 'monster' &&
            (x.wounds || 0) > 0 &&
            polyDist(cp, corners(x)) <= 12
        )
        .sort((p, q) => (q.wounds || 0) - (p.wounds || 0))[0];
    if (H)
      units = units.map(x =>
        x.id === H.id ? Object.assign({}, x, { wounds: Math.max(0, (+x.wounds || 0) - 4) }) : x
      );
    line =
      `Essence Transfer: ${nm(T)} takes ${lo} (rolled ${r1}, ${r2})` +
      (H ? `, ${nm(H)} heals 4` : ', nobody needed healing');
  }
  if (a.fn === 'elixir') {
    const r = d6(),
      h = Math.min(r, +T.wounds || 0);
    units = units.map(x =>
      x.id === T.id
        ? Object.assign({}, x, { wounds: (+x.wounds || 0) - h })
        : x.id === u.id
          ? Object.assign({}, x, { elixirUsed: true })
          : x
    );
    if (T.id === u.id)
      units = units.map(x => (x.id === u.id ? Object.assign({}, x, { elixirUsed: true }) : x));
    line = `Grotesque Elixir on ${nm(T)}: rolled ${r}, heals ${h}`;
  }
  if (a.fn === 'unstable') {
    const r = d6(),
      k = r <= 2 ? 'M' : r <= 4 ? 'C' : 'V',
      st = k === 'M' ? { M: 1 } : { [k]: 1 };
    units = units.map(x => {
      if (x.id !== T.id) return x;
      const cur = +(x.stats && x.stats[k]) || 0;
      if (k !== 'M' && cur >= 4) return grantU(x, src, [], null);
      return grantU(x, src + ': +1 ' + (k === 'M' ? 'March' : k === 'C' ? 'Clash' : 'Volley'), [], st);
    });
    line = `Unstable Enhancement on ${nm(T)}: rolled ${r}, +1 ${k === 'M' ? 'March' : k === 'C' ? 'Clash' : 'Volley'}`;
  }
  if (a.fn === 'rupture') {
    const r1 = d6(),
      r2 = d6(),
      hi = Math.max(r1, r2),
      E = engaged(T).map(byId).filter(Boolean),
      parts = [];
    E.forEach(e => {
      const R = autoDefend(e, hi, 1);
      units = hurt(units, e.id, R.w);
      parts.push(`${nm(e)} ${R.w} wound${R.w === 1 ? '' : 's'}`);
    });
    line =
      `Catalytic Rupture at ${nm(T)}: ${hi} Hits (rolled ${r1}, ${r2})` +
      (parts.length ? ' → ' + parts.join(', ') : ', nobody in contact');
  }
  if (a.fn === 'virulence') {
    const r = d6(),
      R = autoDefend(T, r, 6 - r);
    units = hurt(units, T.id, R.w);
    line = `Grant Virulence on ${nm(T)}: ${r} Hits, Armor Piercing ${6 - r} → ${R.w} wound${R.w === 1 ? '' : 's'}`;
  }
  if (a.fn === 'shepherd') {
    const W = +(T.stats && T.stats.W) || 4,
      m = (+T.wounds || 0) % W,
      n = m ? W - m : 0;
    units = hurt(units, T.id, n);
    line = `Dark Shepherd: ${nm(T)} takes ${n} wound${n === 1 ? '' : 's'}`;
  }
  if (a.fn === 'vanity') {
    units = hurt(units, T.id, 3);
    units = units.map(x => (x.id === T.id ? grantU(x, 'Divine Vanity boon', [], null) : x));
    const g = frG(u.side, 'od');
    extra.fr = frPatch(u.side, 'od', { dark: (+g.dark || 0) + 1 });
    line = `Exploitation of Divine Vanity: ${nm(T)} takes 3 wounds, +1 Dark Power`;
  }
  if (a.fn === 'awaken') {
    await awaken(T.id, a.n);
    return a.n + ': ' + nm(T) + ' is Awakened';
  }
  if (a.prac)
    units = units.map(x =>
      x.id === T.id && !(x.temp || []).some(g => g.src === src) ? grantU(x, src, [], null) : x
    );
  await putState(
    Object.assign(
      { units, lastTitle: N(u.side) + ' · ' + u.charName, lastText: line + '. No Morale Tests.' },
      extra
    )
  );
  toast(line + '.');
  return line;
}
function charAbilBox(u, box) {
  const L = chAbil(u);
  if (!L.length || !charAct) return;
  charAct.used = charAct.used || [];
  const mk2 = a => {
    const row = document.createElement('div');
    row.className = 'dn';
    const why =
      chWhy(u, a) ||
      (charAct.used.includes(a.n) ? 'Already used' : '') ||
      (a.order && charAct.used.some(n => /^Battlefield Order/.test(n))
        ? 'One Battlefield Order per activation'
        : '') ||
      (a.kind === 'action' && charAct.acted ? 'The character already used its action' : '');
    const C = why ? [] : chTargets(u, a);
    const t = document.createElement('div');
    t.style.flex = '1';
    const b = document.createElement('b');
    b.textContent = a.n + (a.prac ? ' (' + a.prac + ')' : '');
    t.append(b, document.createTextNode(': ' + a.d));
    const ctl = document.createElement('div');
    ctl.className = 'row';
    let sel = null;
    if (C.length > 1) {
      sel = document.createElement('select');
      sel.setAttribute('aria-label', 'Target for ' + a.n);
      C.forEach(c => {
        const o = document.createElement('option');
        o.value = c.id;
        o.textContent = (c.short || c.name) + (c.side !== u.side ? ' (enemy)' : '');
        sel.appendChild(o);
      });
      ctl.appendChild(sel);
    }
    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'btn ghost';
    go.textContent = why
      ? why
      : 'Use' + (C.length === 1 && a.tgt !== 'self' ? ' on ' + (C[0].short || C[0].name) : '');
    go.disabled = !!why;
    go.onclick = async () => {
      go.disabled = true;
      await useAbil(u.id, a.n, sel ? sel.value : (C[0] || {}).id);
      charAct.used.push(a.n);
      if (a.kind === 'action') {
        charAct.acted = true;
        await charCommit(u.id, { note: 'Used ' + a.n + '.' });
        return;
      }
      render();
    };
    ctl.appendChild(go);
    t.appendChild(ctl);
    row.append(t);
    return row;
  };
  const D = L.filter(a => a.kind === 'draw'),
    A = L.filter(a => a.kind === 'action');
  if (D.length) {
    box.appendChild(ptext('Draw Events (resolve before acting):', 'hint'));
    D.forEach(a => box.appendChild(mk2(a)));
  }
  if (A.length) {
    box.appendChild(
      ptext(
        'Abilities (each uses the character’s action and ends its activation; one Practitioner action per target each round):',
        'hint'
      )
    );
    A.forEach(a => box.appendChild(mk2(a)));
  }
}

/* ---------- Claude's faction choices ---------- */
function frRoundOptions(side) {
  const o = frRoundOptions0(side);
  (state.units || [])
    .filter(u => u.side === side && srAlive(u) && /Eidolon/.test(u.charName || '') && !cdirOf(u))
    .forEach(u =>
      Object.keys(CDIR).forEach(k =>
        o.push({
          id: 'cdir' + u.id + ':' + k,
          label: 'Combat Directive (Eidolon with ' + (u.short || u.name) + '): ' + k,
          def: k === 'Precision Armament'
        })
      )
    );
  return o;
}
function frRoundOptions0(side) {
  const out = [],
    R = state.round || 1,
    facs = frFacs(side);
  if (facs.includes('Old Dominion') && frG(side, 'od').soma !== R) {
    out.push({ id: 'soma:dark', label: 'Blasphemous Soma: +1 Dark Power', def: true });
    out.push({ id: 'soma:pant', label: 'Blasphemous Soma: +1 Fallen Pantheon' });
  }
  if (facs.includes('Nords')) {
    const g = frG(side, 'no'),
      raid = supK(side) === 'Raid Tactics!',
      ruler = supK(side) === 'Ruler of Manheim';
    if (g.round !== R && (!g.used || (raid && (+g.used || 0) < 3) || ruler))
      Object.keys(TACTICS)
        .filter(
          t => !(ruler && g.round === R - 1 && g.tactic === t) && !(raid && (g.usedL || []).includes(t))
        )
        .forEach(t =>
          out.push({
            id: 'tactic:' + t,
            label:
              'Tribal Tactic ' +
              t +
              ' (' +
              TACTICS[t].join(', ') +
              ' for Mortals, Exalted and character-led regiments this round; once per game)'
          })
        );
  }
  if (facs.includes('Sorcerer Kings') && !frG(side, 'sk').ritual)
    Object.entries(RITUALS).forEach(([c, L]) =>
      L.forEach(([n, t], i) =>
        out.push({
          id: 'ritual:' + n,
          label: 'Prepare Ritual ' + n + ' (' + c + ', needs ' + t + ' markers)',
          def: i === 0 && c === 'Court of Fire'
        })
      )
    );
  if (facs.includes('Weaver Courts') && !frG(side, 'wc').season)
    SEASONS.forEach(s =>
      out.push({
        id: 'season:' + s,
        label: 'Start the Cycle of Seasons in ' + s + ' (' + SEASONFX[s][0] + ')',
        def: s === 'Summer'
      })
    );
  if (facs.includes('Spires') && !spSect(side))
    SECTS.forEach(s => out.push({ id: 'sect:' + s, label: 'Sect: ' + s, def: s === 'Underspire' }));
  if (facs.includes('Dweghom') && !frG(side, 'dw').creed && !dwCreed(side))
    ['Ardent', 'Tempered', 'Clan'].forEach(c =>
      out.push({ id: 'creed:' + c, label: 'Creed: ' + c, def: c === 'Clan' })
    );
  return out;
}
async function applyRoundOption(side, id) {
  {
    const m = String(id).match(/^cdir(.+?):(.+)$/);
    if (m) {
      if (CDIR[m[2]] && cdirKeys(base(m[1])).includes(m[2])) return cdirSet(m[1], m[2]);
      return;
    }
  }
  const [k, v] = String(id).split(/:(.*)/s),
    R = state.round || 1;
  if (k === 'soma') {
    const g = frG(side, 'od');
    return frSet(
      side,
      'od',
      v === 'pant' ? { pant: (+g.pant || 0) + 1, soma: R } : { dark: (+g.dark || 0) + 1, soma: R }
    );
  }
  if (k === 'tactic' && TACTICS[v]) {
    const g = frG(side, 'no');
    const units = state.units.map(u => {
      if (u.side !== side || u.type === 'marker' || frFac(u) !== 'Nords') return u;
      const r = frRoles(u);
      if (!(r.includes('Mortals') || r.includes('Exalted') || u.charName)) return u;
      return grantU(u, 'Tribal Tactic: ' + v, TACTICS[v]);
    });
    return putState({
      units,
      fr: frPatch(side, 'no', {
        tactic: v,
        round: R,
        used: (+g.used || 0) + 1,
        usedL: (g.usedL || []).concat([v])
      })
    });
  }
  if (k === 'ritual') {
    const th = (Object.values(RITUALS)
        .flat()
        .find(x => x[0] === v) || [0, 7])[1],
      g = frG(side, 'sk'),
      dis = g.dis !== R;
    return frSet(side, 'sk', { ritual: v, th, rm: dis ? Math.min(R, 5) : 0, dis: dis ? R : g.dis });
  }
  if (k === 'season' && SEASONS.includes(v))
    return putState({
      fr: frPatch(side, 'wc', { season: v, round: R }),
      units: frSeasonUnits(state.units, side, v)
    });
  if (k === 'sect') return frSet(side, 'sp', { sect: v });
  if (k === 'creed') return frSet(side, 'dw', { creed: v });
}
async function aiFactionRound(chosen) {
  const side = AI,
    opts = frRoundOptions(side),
    lines = [];
  if (!opts.length) return lines;
  const groups = {};
  opts.forEach(o => {
    const g = o.id.split(':')[0];
    (groups[g] = groups[g] || []).push(o);
  });
  for (const [g, L] of Object.entries(groups)) {
    let pick = L.find(o => (chosen || []).includes(o.id));
    if (!pick && g !== 'tactic') pick = L.find(o => o.def) || L[0];
    if (!pick && g === 'tactic' && !(chosen || []).length && (state.round || 1) >= 2 && !aiLastPlanBy)
      pick = L[0];
    if (pick) {
      await applyRoundOption(side, pick.id);
      lines.push(pick.label);
    }
  }
  // tokens for destroyed Animate Vessels go to Dark Power
  if (frFacs(side).includes('Old Dominion')) {
    const g = frG(side, 'od'),
      pend = odLost(side) - (+g.seen || 0);
    if (pend > 0) {
      await frSet(side, 'od', { dark: (+g.dark || 0) + pend, seen: (+g.seen || 0) + pend });
      lines.push(pend + ' Dark Power token' + (pend > 1 ? 's' : '') + ' from destroyed Animate Vessels');
    }
  }
  return lines;
}
let aiLastPlanBy = '';
/* options offered to Claude at the start of a regiment activation */
function aiFacOpts(u) {
  let L = [],
    h = '',
    out = [];
  try {
    L = frOptions(u);
  } catch (e) {}
  L.forEach(it => {
    if (it.head) {
      h = it.head.replace(/\s*\(.*\)\s*$/, '').replace(/\?$/, '');
      return;
    }
    if (!it.why) out.push(h && !/:/.test(it.label) ? h + ': ' + it.label : it.label);
  });
  return out;
}
async function exFaction(st) {
  const u = byId(act.id);
  const want = String(st.option || '')
    .toLowerCase()
    .trim();
  if (!want) return '';
  let L = [];
  try {
    L = frOptions(u).filter(it => !it.head);
  } catch (e) {}
  const it =
    L.find(
      x =>
        x.label.toLowerCase() === want ||
        want.endsWith(': ' + x.label.toLowerCase()) ||
        want.split(': ').pop() === x.label.toLowerCase().split(' · ')[0]
    ) ||
    L.find(x => x.label.toLowerCase().startsWith(want.slice(0, 24))) ||
    L.find(x => want.includes(x.label.toLowerCase().slice(0, 18)));
  if (!it) return 'could not use ' + st.option;
  if (it.why) return 'could not use ' + it.label + ' (' + it.why + ')';
  await Promise.resolve(it.fn());
  render();
  await sleep(250);
  return 'uses ' + it.label;
}
async function aiAutoFaction(u, lines) {
  let L = [];
  try {
    L = frOptions(u);
  } catch (e) {
    return;
  }
  const f = frFac(u);
  if (f === "W'adrhŭn" && !act.frMarker) {
    const own = (frRoles(u).find(r => /^Cult of/.test(r)) || '').replace('Cult of ', '') || 'War';
    const it = L.find(x => !x.head && x.label === own);
    if (it) {
      await Promise.resolve(it.fn());
      lines.push('adds a ' + own + ' Chant Marker');
    }
  }
  if (f === 'Yoroni' && !act.frIdeal) {
    const it =
      L.find(x => !x.head && x.cls === 'pri' && !x.why) ||
      L.find(x => !x.head && /^(Ka|Chi|Fu|Sui|Mu)\b/.test(x.label));
    if (it) {
      await Promise.resolve(it.fn());
      lines.push('is activated by Ideal Card ' + it.label.split(' ')[0]);
    }
  }
}

function hasSpell(t, name) {
  return (
    !!t && (t.temp || []).some(g => g.src === 'Spell: ' + name || g.src.startsWith('Spell: ' + name + ' ·'))
  );
}
