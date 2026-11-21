/*
 * Character abilities in play
 *
 * Which abilities a character can use, legal targets, using one, and the abilities box in the
 * activation panel.
 *
 * In this file: chAbil(), chTargets(), chWhy(), autoDefend(), hurt(), useAbil(), charAbilBox()
 */

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
  /* Implacable (Old Dominion): Break Their Lines, a Combat Action of the character: its regiment gains Linebreaker until
     the end of the round */
  if (upgOf(u, /Implacable/))
    L = L.concat([
      {
        n: 'Break Their Lines',
        kind: 'action',
        tgt: 'self',
        combat: true,
        grant: ['Linebreaker'],
        d: 'Combat Action: its regiment gains Linebreaker until the end of the round.'
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
  if (a.combat && !engaged(u).length) return 'A Combat Action: its regiment must be in combat';
  if (a.combat && a.grant && (u.temp || []).some(g => g.src === a.n)) return 'Already active this round';
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
  /* hits from the ability: the defending player rolls Defense for them in the combat panel */
  const hitsQ = [];
  const ask = (n, text, ok, sum) => askRoll({ title: a.n, text, n, side: u.side, ok, sum });
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
    const [r1, r2] = await ask(2, nm(T) + ' takes the lower of two dice in wounds.', null, r => 'Lower: ' + Math.min(...r)),
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
    const [r] = await ask(1, nm(T) + ' heals as many wounds as the die shows.', null, r => 'Heals up to ' + r[0]),
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
    const [r] = await ask(1, '1–2: +1 March · 3–4: +1 Clash · 5–6: +1 Volley', null, r =>
        r[0] <= 2 ? '+1 March' : r[0] <= 4 ? '+1 Clash' : '+1 Volley'
      ),
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
    const [r1, r2] = await ask(
        2,
        'Every enemy engaged with ' + nm(T) + ' takes Hits equal to the higher die, Armor Piercing (1).',
        null,
        r => Math.max(...r) + ' Hits'
      ),
      hi = Math.max(r1, r2),
      E = engaged(T).map(byId).filter(Boolean);
    E.forEach(e => hitsQ.push({ tgt: e.id, n: hi, ap: 1 }));
    line =
      `Catalytic Rupture at ${nm(T)}: ${hi} Hits (rolled ${r1}, ${r2})` +
      (E.length ? ' on ' + E.map(nm).join(', ') + ', to roll Defense against' : ', nobody in contact');
  }
  if (a.fn === 'virulence') {
    const [r] = await ask(1, nm(T) + ' takes Hits equal to the die, with Armor Piercing of 6 minus the die.', null, q =>
      q[0] + ' Hits, Armor Piercing ' + (6 - q[0])
    );
    hitsQ.push({ tgt: T.id, n: r, ap: 6 - r });
    line = `Grant Virulence on ${nm(T)}: ${r} Hits, Armor Piercing ${6 - r}, to roll Defense against`;
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
  hitsQ.forEach(h =>
    queueHits({ att: u.id, tgt: h.tgt, n: h.n, ap: h.ap, morale: false, label: a.n, text: 'The ' + u.charName + ': ' + a.n + '.' })
  );
  toast(line + '.');
  if (hitsQ.length && aiBusy) await cbDrain();
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
  /* Draw Events only trigger while the character is on the table */
  const D = u.onTable ? L.filter(a => a.kind === 'draw') : [],
    A = L.filter(a => a.kind === 'action');
  if (!u.onTable && L.some(a => a.kind === 'draw'))
    box.appendChild(ptext('Not on the table yet: its Draw Events do not trigger.', 'hint'));
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
