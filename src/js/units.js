/* Turning encyclopedia entries into units on the table, officers and Yoroni modular regiments. */
/* ---------- game setup and reset ---------- */
const UNIT_SCHEMA = `{"faction":"<faction name>","armyRules":["<army-wide rules or abilities, short>"],"points":<total>,"units":[{
 "name":"<regiment name, add I/II to tell duplicates apart>","short":"<short name>","points":<n>,
 "cls":"<Light|Medium|Heavy> <Infantry|Cavalry|Brute|Monster|Chariot>","type":"inf|cav|brute|monster|chariot",
 "stands":<regiment stands including the command stand, NOT counting a character or auxiliary stand>,
 "M":n,"V":n,"C":n,"A":n,"W":n,"R":n,"D":n,"E":n,
 "rules":["Special rules exactly as named in the rules, with values: Shield, Impact (2), Cleave (1), Barrage (8) 14″, Armor Piercing (1), Flurry, Tenacious (1), Vanguard (3), Terrifying (1), Hardened (1), Support (2), Fearless, Automaton ..."],
 "abilities":[["<ability, option or Draw Event name>","<one-line effect>"]],
 "standardBearer":true|false,
 "auxiliary":null|{"name":"<e.g. a Minotaur stand>","stats":{"C":n,"A":n,"W":n},"rules":["..."]},
 "character":null|{"name":"<character name>","warlord":true|false,"stats":{"C":n,"A":n,"W":n,"R":n,"D":n,"E":n,"V":n},"rules":["Priest (6)" or "Wizard (5)" etc],
   "spells":[{"name":"<spell>","range":<inches>,"att":<attunement>,"targets":"friendly|enemy","scaling":false,"effect":"<short text added to the target for the round>","text":"<one line>"}]}
}]}`;
function encyLookup(fac, name) {
  const n = String(name || '')
    .replace(/\s+(I|II|III|IV|V|VI)$/, '')
    .toLowerCase()
    .replace(/[-\s]+/g, ' ')
    .replace(/s$/, '');
  const fs = ENCY.filter(f => !fac || facOf(fac) === f.name);
  for (const f of fs.length ? fs : ENCY) {
    const u = f.units.find(
      z =>
        z.name
          .toLowerCase()
          .replace(/[-\s]+/g, ' ')
          .replace(/s$/, '') === n
    );
    if (u) return u;
  }
  return null;
}
/* ---- Officers (Command Models bought for a regiment), from the 2026 faction lists. Effects that count as list-building bonuses are baked into the profile;
   the rest are hooks used by the engine. An Officer stands on the Command Stand, so its benefits last until the regiment is destroyed. ---- */
/* Veteran upgrades bought in the builder: their text is the bonus */
function vetBonus(d) {
  d = String(d || '').trim();
  let m;
  if ((m = d.match(/^([A-Z][A-Za-z ]+?)\s*\+(\d)$/))) return { r: [m[1] + ' (+' + m[2] + ')'] };
  if ((m = d.match(/^\+(\d)\s+(Clash|Attacks|Resolve|March)$/i)))
    return { s: { [{ clash: 'C', attacks: 'A', resolve: 'R', march: 'M' }[m[2].toLowerCase()]]: +m[1] } };
  if ((m = d.match(/^(.+?)\s+vs\.?\s+Volleys$/i))) return { r: [m[1] + ' against Volleys'] };
  return null;
}
function optInfo(o) {
  if (!o) return '';
  const d = o.detail || '';
  let t = '';
  const gi = x => {
    try {
      return ruleInfo(x, bld.fac) || '';
    } catch (e) {
      return '';
    }
  };
  if (o.kind === 'off') {
    t = (OFF[o.name] && OFF[o.name].t) || gi(o.name) || (d ? d : '');
    return (
      'Officer · ' +
      o.name +
      (o.cost ? ' (+' + o.cost + ' pts)' : '') +
      ': ' +
      (t || 'no rules text available for this officer.')
    );
  }
  if (o.kind === 'vet') {
    const g = gi(d);
    return (
      'Veteran (+' +
      o.cost +
      ' pts): the regiment gains ' +
      (d || 'its veteran upgrade') +
      (g ? '. ' + g.replace(/\n/g, ' · ') : '.')
    );
  }
  if (o.kind === 'aux') {
    let u = null;
    try {
      u = bldUnit(o.name);
    } catch (e) {}
    const ab = u
      ? (u.abilities || [])
          .map(a => a[0])
          .filter(Boolean)
          .slice(0, 6)
          .join(', ')
      : '';
    return (
      'Auxiliary (+' +
      o.cost +
      ' pts): adds a ' +
      o.name +
      ' stand to the regiment (one Auxiliary per regiment)' +
      (ab ? '. Its rules: ' + ab : '') +
      '.'
    );
  }
  if (o.kind === 'order') return o.name + ' (+' + o.cost + ' pts): ' + d + '.';
  t = d || gi(o.name);
  return (
    o.name +
    (o.cost ? ' (+' + o.cost + ' pts)' : '') +
    ': ' +
    (t ? t.replace(/\n/g, ' · ') : 'no rules text available.')
  );
}
function upgInfo(e) {
  return (
    e[1] +
    ' · ' +
    e[0] +
    ' · ' +
    (e[2] ? e[2] + ' pts' : 'free') +
    (e[3] ? ' · for ' + e[3] : '') +
    ': ' +
    (e[4] || '')
  );
}
/* an info line under a row of options: shows the hovered/focused button, otherwise what is selected */
function infoLine(defTxt) {
  const d = bEl('div', { className: 'opt-info' });
  d.setAttribute('aria-live', 'polite');
  const show = t => {
    d.textContent = t || defTxt || 'Hover or tap and hold an option to see what it does.';
  };
  show();
  d._show = show;
  d._def = () => show();
  return d;
}
function hookInfo(bt, txt, box) {
  bt.title = txt;
  bt.addEventListener('mouseenter', () => box._show(txt));
  bt.addEventListener('focus', () => box._show(txt));
  bt.addEventListener('mouseleave', () => box._def());
  bt.addEventListener('blur', () => box._def());
  let tm = null;
  bt.addEventListener(
    'touchstart',
    () => {
      tm = setTimeout(() => box._show(txt), 350);
    },
    { passive: true }
  );
  bt.addEventListener('touchend', () => clearTimeout(tm));
}
function offNames(u) {
  return (u.abilities || []).filter(a => OFF[a[0]] && /^Officer\b/.test(String(a[1] || ''))).map(a => a[0]);
}
function offOn(u, k) {
  if (!u || u.destroyed) return false;
  return offNames(u).some(n => OFF[n][k] && !(n === 'Catabolic Node' && u.nodeGone));
}
function applyOfficers(u) {
  const add = (r, s) => {
    (r || []).forEach(x => {
      if (!u.rules.includes(x)) u.rules.push(x);
    });
    Object.entries(s || {}).forEach(([k, v]) => {
      if (k === 'M') {
        u.m = (+u.m || 0) + v;
        u.stats.M = (+u.stats.M || 0) + v;
        return;
      }
      if (u.stats[k] === '–' || u.stats[k] == null) return;
      u.stats[k] = (+u.stats[k] || 0) + v;
    });
  };
  u.abilities = u.abilities.map(a => {
    const O = OFF[a[0]];
    if (O && /^Officer\b/.test(a[1])) {
      add(O.r, O.s);
      if (O.cmdA) u.cmdA = (u.cmdA || 0) + O.cmdA;
      if (O.strat) u.strategicFx = (u.strategicFx || []).concat(O.strat);
      if (O.r6) u.offR6 = [...new Set((u.offR6 || []).concat(O.r6))];
      return [a[0], 'Officer: ' + O.t];
    }
    if (a[0] === 'Veteran') {
      const m = String(a[1]).match(/^Option:\s*(.+?),\s*\d+\s*pts$/);
      const B = m && vetBonus(m[1]);
      u.vetRole = true;
      if (B) {
        add(B.r, B.s);
        return ['Veteran', 'Veteran: ' + m[1]];
      }
    }
    return a;
  });
  u.vanguard = Math.max(+u.vanguard || 0, rx(u.rules, 'Vanguard'));
  return u;
}
function buildUnits(side, list) {
  const pre = side === 'cs' ? 'h' : 'a';
  const out = [];
  (list.units || []).forEach((x, i) => {
    const typ = ['inf', 'cav', 'brute', 'monster', 'chariot'].includes(x.type) ? x.type : 'inf';
    const stands = Math.max(1, Math.round(+x.stands || 1)),
      hasAux = !!(x.auxiliary && x.auxiliary.stats),
      ch0 = x.character && x.character.name ? x.character : null,
      hold = !!(ch0 && /Mimetic Assassin/.test(ch0.name)),
      ch = hold ? null : ch0,
      tot = stands + (hasAux ? 1 : 0) + (ch ? 1 : 0);
    const sw = typ === 'monster' ? 4 : 2,
      sd = typ === 'monster' ? 4 : typ === 'chariot' ? 4 : 2,
      files = typ === 'monster' || typ === 'chariot' ? 1 : Math.min(tot, tot >= 4 ? (tot >= 8 ? 4 : 3) : tot);
    const rules = (x.rules || []).map(String);
    const vg = +((rules.join(', ').match(/Vanguard\s*\((\d+)\)/) || [])[1] || 0);
    const ref = encyLookup(list.faction, x.name);
    const u = {
      id: pre + '-' + (i + 1),
      side,
      name: String(x.name || 'Regiment ' + (i + 1)),
      short: String(x.short || x.name || '').slice(0, 24),
      cls: String(x.cls || 'Medium Infantry'),
      type: typ,
      m: +x.M || 5,
      vanguard: vg,
      sw,
      sd,
      stands: tot,
      files,
      cmd: files >= 3 ? 1 : 0,
      stats: {
        M: +x.M || 5,
        V: +x.V || 0,
        C: +x.C || 1,
        A: +x.A || 1,
        W: +x.W || 4,
        R: x.R == null || x.R === '–' ? '–' : +x.R,
        D: +x.D || 0,
        E: +x.E || 0
      },
      rules,
      abilities: (x.abilities || [])
        .filter(a => Array.isArray(a))
        .map(a => [String(a[0]), String(a[1] || '')]),
      fac: facOf(list.faction) || '',
      points: +x.points || 0,
      bearer: ref && ref.cmd ? !!ref.cmd.bearer : !!x.standardBearer,
      leader: ref && ref.cmd ? !!ref.cmd.leader : x.leader !== false,
      effects: [],
      wounds: 0,
      auxWounds: 0,
      activated: false,
      charActivated: false,
      onTable: false,
      arriving: false,
      x: 36,
      y: 24,
      facing: side === 'cs' ? 180 : 0
    };
    if (x.mods && x.modProfiles) {
      u.mods = x.mods.map(String);
      u.modProfiles = x.modProfiles;
    }
    if (x.wb != null) {
      u.wb = +x.wb;
      u.wbChar = String(x.wbChar || '');
    }
    if (x.vetRole) u.vetRole = true;
    if (x.warlordMonster) u.warlordMonster = true;
    if (hold)
      u.assassinHold = {
        name: String(ch0.name),
        stats: ch0.stats || {},
        rules: (ch0.rules || []).map(String)
      };
    if (hasAux) {
      u.aux = 0;
      u.auxName = String(x.auxiliary.name || 'Auxiliary');
      u.auxStats = x.auxiliary.stats;
      u.auxRules = (x.auxiliary.rules || []).map(String);
    }
    if (ch) {
      u.char = files >= 3 ? 2 : Math.min(files - 1, 1);
      u.charName = String(ch.name);
      u.charStats = ch.stats || {};
      u.charRules = (ch.rules || []).map(String);
      u.warlord = !!ch.warlord;
      u.spells = (ch.spells || [])
        .filter(s => s && s.name)
        .map(s => ({
          name: String(s.name),
          range: +s.range || 12,
          att: +s.att || 3,
          targets: s.targets === 'enemy' ? 'enemy' : 'friendly',
          scaling: !!s.scaling,
          effect: String(s.effect || s.name),
          text: String(s.text || '')
        }));
      if (
        typ === 'monster' &&
        (ch.rider || (ch.rules || []).includes('Rider') || (ch.upgrades || []).some(n => RIDE[n]))
      )
        u.rider = true;
    }
    applyOfficers(u);
    out.push(u);
  });
  return out;
}
async function convertList(text, faction, pts) {
  const prompt = `Convert this Conquest: The Last Argument of Kings army list into JSON for a battle map. Use the official current rules and profiles for each regiment, character, upgrade and option as best you know them. Put options and upgrades into rules, abilities, auxiliary or character as appropriate; a character joins the regiment it leads (its Warband regiment of the same Type). Mark exactly one character as the warlord (the one the list names, or the first).\nFaction: ${faction || 'as stated in the list'}. Points: ${pts}.\nLIST:\n${text}\n\nReply with JSON only, in this shape:\n${UNIT_SCHEMA}`;
  const E = encyFor(text, faction);
  const ref = E.units.length
    ? `\nOfficial 2026 profiles for the units named in this list (use these numbers; a character's M comes from the regiment it joins):\n${E.units.map(encyBrief).join('\n')}\n`
    : '';
  return await sample.json(prompt.replace('\n\nReply with JSON only', ref + '\nReply with JSON only'), {
    modelTier: 'complex'
  });
}
async function designList(faction, pts, enemyFaction) {
  const prompt = `You are Claude, about to play Conquest: The Last Argument of Kings against a human playing ${enemyFaction || 'an opponent'} in a 10-round scenario with objective zones on a 6x4 ft table. Design your own tournament-legal ${pts}-point army list${faction ? ` for the ${faction} faction` : ' from a faction of your choice'}: legal warbands (each character leads a warband of regiments), correct points, current official profiles. Build a list that plays well with simple, aggressive tactics and holds zones.\nReply with JSON only, in this shape:\n${UNIT_SCHEMA}`;
  const ff = faction ? encyFor('', faction).faction : null;
  const ref = ff
    ? `\nOfficial 2026 ${ff.name} roster (use only these units and numbers):\n${ff.units
        .filter(u => u.pts != null)
        .map(u => encyBrief(Object.assign({ faction: ff.name }, u)))
        .join('\n')}\n`
    : '';
  return await sample.json(prompt + ref, { modelTier: 'complex' });
}
let setupDraft = { faction: '', pts: 2000, list: '', aiFaction: '' },
  resetArm = false;
function rosterTable(units, onBanner) {
  const t = document.createElement('table');
  t.className = 'rost';
  const h = t.insertRow();
  ['Regiment', 'Class', 'Stands', 'M V C A W R D E', 'Rules', 'Character']
    .concat(onBanner ? ['Standard Bearer'] : [])
    .forEach(x => {
      const th = document.createElement('th');
      th.textContent = x;
      h.appendChild(th);
    });
  units.forEach(u => {
    const r = t.insertRow();
    const S0 = u.stats;
    [
      u.name + (u.points ? ' (' + u.points + ')' : ''),
      u.cls,
      String(u.stands),
      ['M', 'V', 'C', 'A', 'W', 'R', 'D', 'E'].map(k => S0[k]).join(' '),
      (u.rules || []).join(', ') + (u.auxName ? ' · with ' + u.auxName : ''),
      u.charName
        ? u.charName +
          (u.warlord ? ' (Warlord)' : '') +
          ((u.spells || []).length ? ' · ' + u.spells.map(s => s.name).join(', ') : '')
        : ''
    ].forEach(v => {
      const c = r.insertCell();
      c.textContent = v;
    });
    if (onBanner) {
      const c = r.insertCell();
      if (u.type !== 'monster') {
        const x = document.createElement('input');
        x.type = 'checkbox';
        x.checked = !!u.bearer;
        x.setAttribute('aria-label', 'Standard Bearer for ' + u.name);
        x.onchange = () => onBanner(units.indexOf(u), x.checked);
        c.appendChild(x);
      }
    }
  });
  return t;
}
function terrR(t) {
  return Math.max(t.rx, t.ry);
}
function terrWhy(p, list) {
  const R = terrR(p);
  if (p.x - p.rx < 0 || p.x + p.rx > 72 || p.y - p.ry < 0 || p.y + p.ry > 48)
    return 'That piece would hang off the table.';
  for (const q of list) {
    if (q === p) continue;
    if (Math.hypot(p.x - q.x, p.y - q.y) - R - terrR(q) < 7 - 1e-6)
      return 'Terrain must be at least 7″ from other terrain.';
  }
  if (
    (tHas(p, 'Impassable') || tHas(p, 'Garrison')) &&
    zonesOf().some(z => Math.hypot(p.x - z.x, p.y - z.y) < z.r + R)
  )
    return tHas(p, 'Garrison')
      ? 'Buildings cannot overlap an objective zone.'
      : 'Impassable terrain cannot sit on an objective zone.';
  if (tHas(p, 'Garrison')) {
    if (p.x - p.rx < 6 || p.x + p.rx > 66 || p.y - p.ry < 6 || p.y + p.ry > 42)
      return 'Buildings must be at least 6″ from the table edges.';
    if (list.filter(q => q !== p && tHas(q, 'Garrison')).length >= 2)
      return 'At most 2 buildings per battlefield.';
  }
  if (
    (scenOf().markers || []).some(
      m => ((m.x - p.x) / (p.rx + 1.5)) ** 2 + ((m.y - p.y) / (p.ry + 1.5)) ** 2 <= 1
    )
  )
    return 'Terrain cannot cover an Objective Marker.';
  return '';
}
const TSIZE = { small: [2.5, 1.8], medium: [4, 3], large: [5.5, 4] };
let terrPref = (() => {
  try {
    const v = JSON.parse(localStorage.getItem('conquest-terrain-filter') || 'null');
    if (v && Array.isArray(v.allow)) return { allow: v.allow.filter(t => TTYPES[t]), count: +v.count || 0 };
  } catch (e) {}
  return { allow: Object.keys(TTYPES), count: 0 };
})();
function saveTerrPref() {
  try {
    localStorage.setItem('conquest-terrain-filter', JSON.stringify(terrPref));
  } catch (e) {}
}
function terrFilterBox() {
  const box = document.createElement('div');
  box.className = 't-filter';
  const h = document.createElement('div');
  h.className = 'row';
  const lb = document.createElement('b');
  lb.textContent = 'Random terrain uses:';
  h.appendChild(lb);
  const allB = abBtn(
      'All',
      () => {
        terrPref.allow = Object.keys(TTYPES);
        saveTerrPref();
        renderTurnbar();
      },
      'ab-ghost ab-small'
    ),
    noneB = abBtn(
      'None',
      () => {
        terrPref.allow = [];
        saveTerrPref();
        renderTurnbar();
      },
      'ab-ghost ab-small'
    );
  h.append(allB, noneB);
  h.append(
    document.createTextNode(' Pieces:'),
    abStepper(
      terrPref.count || 0,
      0,
      12,
      v => {
        terrPref.count = v === 1 || v === 2 || v === 3 ? (terrPref.count === 0 ? 4 : 0) : v;
        saveTerrPref();
        renderTurnbar();
      },
      'number of terrain pieces'
    )
  );
  const cl = document.createElement('span');
  cl.className = 'hint';
  cl.textContent = terrPref.count ? terrPref.count + ' pieces' : '0 = automatic (6 to 8)';
  h.appendChild(cl);
  box.appendChild(h);
  const row = document.createElement('div');
  row.className = 'row';
  Object.entries(TTYPES).forEach(([k, d]) => {
    const on = terrPref.allow.includes(k);
    const b = abBtn(
      (on ? '✓ ' : '') + d.name,
      () => {
        terrPref.allow = on ? terrPref.allow.filter(x => x !== k) : terrPref.allow.concat([k]);
        saveTerrPref();
        renderTurnbar();
      },
      'ab-tog' + (on ? ' on' : '')
    );
    b.setAttribute('aria-pressed', String(on));
    b.title = d.kw.join(', ') + ' · Size ' + d.size;
    row.appendChild(b);
  });
  box.appendChild(row);
  if (!terrPref.allow.length)
    box.appendChild(ptext('Pick at least one terrain type for random maps.', 'warn'));
  else if (terrPref.allow.length === 1 && terrPref.allow[0] === 'building')
    box.appendChild(ptext('Only buildings: at most 2 can be placed.', 'hint'));
  return box;
}
function genTerrain() {
  if (!terrPref.allow.length) {
    toast('Pick at least one terrain type first.');
    return terrainOf();
  }
  let best = [];
  for (let a = 0; a < 30; a++) {
    const out = [],
      n = terrPref.count || 6 + Math.floor(Math.random() * 3);
    let tries = 0;
    const allT = terrPref.allow.length === Object.keys(TTYPES).length,
      types = terrPref.allow.flatMap(t => (allT && (t === 'forest' || t === 'hill') ? [t, t] : [t]));
    while (out.length < n && tries++ < 3000) {
      const type = types[Math.floor(Math.random() * types.length)],
        rx = +(2.5 + Math.random() * 4).toFixed(1),
        ry = +Math.max(1.8, rx * (0.55 + Math.random() * 0.4)).toFixed(1);
      const big = type === 'building',
        RX = big ? 2.6 : rx,
        RY = big ? 2.2 : ry,
        p = {
          type,
          x: +(RX + Math.random() * (72 - 2 * RX)).toFixed(1),
          y: +(RY + Math.random() * (48 - 2 * RY)).toFixed(1),
          rx: RX,
          ry: RY,
          seed: Math.floor(Math.random() * 1e9)
        };
      if (!terrWhy(p, out)) out.push(p);
    }
    if (out.length > best.length) best = out;
    if (best.length >= n) break;
  }
  return best;
}
let terrMode = 'random',
  terrType = 'forest',
  terrSize = 'medium',
  terrSel = null,
  tfTerr = false;
function scenarioPanel(add, mk) {
  const box = document.createElement('div');
  box.className = 'rev';
  const h = document.createElement('h3');
  h.textContent = 'Scenario';
  box.appendChild(h);
  const sel = document.createElement('select');
  sel.setAttribute('aria-label', 'Scenario');
  Object.keys(SCEN).forEach(k => {
    const o = document.createElement('option');
    o.value = k;
    o.textContent = k + '. ' + SCEN[k].name;
    sel.appendChild(o);
  });
  sel.value = String(scenId());
  sel.onchange = async () => {
    const id = +sel.value;
    const patch = { scenario: id, zones: SCEN[id].zones };
    await putState(patch);
    if (terrMode === 'random') await putState({ terrain: genTerrain() });
    else {
      const ok = terrainOf().filter(t => !terrWhy(t, terrainOf()));
      await putState({ terrain: ok });
    }
  };
  box.appendChild(sel);
  box.appendChild(ptext(scenOf().vp));
  if ((scenOf().markers || []).length)
    box.appendChild(
      ptext(
        'Objective Markers: ' +
          colName('cs') +
          ' belongs to the south army, ' +
          colName('nord') +
          ' to the north army, brown is neutral. Each has 3 wounds and Defense 3 and can be attacked from round 2.'
      )
    );
  add(box);
}
function terrainPanel(add, mk) {
  const box = document.createElement('div');
  box.className = 'rev';
  const h = document.createElement('h3');
  h.textContent = 'Terrain';
  box.appendChild(h);
  const g = document.createElement('div');
  g.className = 'grp';
  g.setAttribute('role', 'group');
  g.setAttribute('aria-label', 'Terrain mode');
  [
    ['random', 'Random'],
    ['manual', 'Place it yourself']
  ].forEach(([m, t]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t;
    b.setAttribute('aria-pressed', String(terrMode === m));
    b.onclick = () => {
      terrMode = m;
      renderTurnbar();
    };
    g.appendChild(b);
  });
  const row = document.createElement('div');
  row.className = 'row';
  row.appendChild(g);
  if (terrMode === 'random') {
    row.appendChild(mk('Shuffle terrain', () => putState({ terrain: genTerrain() }), true));
    box.appendChild(row);
    box.appendChild(terrFilterBox());
    box.appendChild(
      ptext(
        'Pieces are placed at random, at least 7″ apart, using only the terrain types ticked below. Impassable rocks and buildings never sit on objective zones; at most 2 buildings. Hover a piece on the map to see its rules.'
      )
    );
  } else {
    const mkSel = (lab, opts, val, fn) => {
      const sl = document.createElement('select');
      sl.setAttribute('aria-label', lab);
      opts.forEach(([v, t]) => {
        const o = document.createElement('option');
        o.value = v;
        o.textContent = t;
        sl.appendChild(o);
      });
      sl.value = val;
      sl.onchange = () => fn(sl.value);
      return sl;
    };
    row.appendChild(
      mkSel(
        'Terrain type',
        Object.entries(TTYPES).map(([k, d]) => [k, d.name + ' (' + d.kw.join(', ') + ')']),
        terrType,
        v => (terrType = v)
      )
    );
    row.appendChild(
      mkSel(
        'Terrain size',
        [
          ['small', 'Small'],
          ['medium', 'Medium'],
          ['large', 'Large']
        ],
        terrSize,
        v => (terrSize = v)
      )
    );
    row.appendChild(mk('Clear the table', () => putState({ terrain: [] }), true));
    box.appendChild(row);
    box.appendChild(
      ptext(
        'Click the map to place a piece; click a piece to select it, change its rules or remove it. Pieces must be at least 7″ apart; impassable terrain and buildings cannot go on an objective zone.'
      )
    );
    const ed = terrEditor();
    if (ed) box.appendChild(ed);
  }
  add(box);
}
function terrEditor() {
  const T = terrainOf(),
    t = T[terrSel];
  if (terrSel == null || !t) return null;
  const I = tInfo(t),
    box = document.createElement('div');
  box.className = 't-ed';
  const upd = p => {
    const L = T.slice();
    L[terrSel] = Object.assign({}, t, p);
    putState({ terrain: L });
  };
  const h = document.createElement('div');
  h.className = 'row';
  const nm = document.createElement('b');
  nm.textContent = 'Selected: ' + I.name;
  h.append(
    nm,
    abStepper(I.size, 0, 4, v => upd({ size: v }), 'terrain Size'),
    document.createTextNode(' Size')
  );
  const rm = document.createElement('button');
  rm.type = 'button';
  rm.className = 'btn ghost';
  rm.textContent = 'Remove piece';
  rm.onclick = () => {
    const L = T.slice();
    L.splice(terrSel, 1);
    terrSel = null;
    putState({ terrain: L });
  };
  const dn = document.createElement('button');
  dn.type = 'button';
  dn.className = 'btn ghost';
  dn.textContent = 'Done';
  dn.onclick = () => {
    terrSel = null;
    terrKey = '';
    render();
  };
  h.append(rm, dn);
  box.appendChild(h);
  const kw = document.createElement('div');
  kw.className = 'row';
  TKW.forEach(k => {
    const on = I.kw.includes(k);
    const b = abBtn(
      (on ? '✓ ' : '') + k,
      () => upd({ kw: on ? I.kw.filter(x => x !== k) : I.kw.concat([k]) }),
      'ab-tog' + (on ? ' on' : '')
    );
    b.title = TKWD[k];
    b.setAttribute('aria-pressed', String(on));
    kw.appendChild(b);
  });
  box.appendChild(kw);
  if (I.kw.includes('Garrison')) {
    const g = document.createElement('div');
    g.className = 'row';
    g.append(
      document.createTextNode('Capacity'),
      abStepper(I.cap, 1, 8, v => upd({ cap: v }), 'Capacity'),
      document.createTextNode('Defense +'),
      abStepper(I.def, 0, 3, v => upd({ def: v }), 'Defense')
    );
    box.appendChild(g);
  }
  box.appendChild(ptext(I.kw.map(k => k + ': ' + TKWD[k]).join(' ')));
  return box;
}
function terrainClick(pt, ev) {
  const g = ev.target.closest('g[data-tid]');
  const T = terrainOf().slice();
  if (g) {
    const i = +g.getAttribute('data-tid');
    terrSel = terrSel === i ? null : i;
    terrKey = '';
    render();
    return;
  }
  if (terrSel != null) {
    terrSel = null;
    terrKey = '';
    render();
    return;
  }
  const [rx, ry] = TSIZE[terrSize],
    p = {
      type: terrType,
      x: +ix(pt.x).toFixed(1),
      y: +iy(pt.y).toFixed(1),
      rx,
      ry,
      seed: Math.floor(Math.random() * 1e9)
    };
  const why = terrWhy(p, T);
  if (why) {
    toast(why);
    return;
  }
  T.push(p);
  putState({ terrain: T });
}
/* Yoroni Modular Regiments: stand profiles, Command rules and mix rules */
const MODULAR = {
  'Oni Ayakashi': {
    pts: 80,
    role: 'Ka',
    M: 6,
    V: 1,
    C: 3,
    A: 5,
    W: 7,
    R: 3,
    D: 3,
    E: 1,
    rules: ['Cleave (2)', 'Impact (2)'],
    cmd: '+1 Attacks, Juggernaut'
  },
  'Kami Ayakashi': {
    pts: 75,
    role: 'Chi',
    M: 6,
    V: 1,
    C: 3,
    A: 5,
    W: 7,
    R: 3,
    D: 3,
    E: 1,
    rules: ['Trample (2)', 'Impact (2)'],
    cmd: '+1 Evasion, Tenacious (1)'
  },
  'Tengu Bushi': {
    pts: 75,
    role: 'Fu',
    M: 7,
    V: 1,
    C: 3,
    A: 6,
    W: 6,
    R: 3,
    D: 3,
    E: 1,
    rules: ['Flawless Strikes', 'Impact (2)'],
    cmd: 'Ignores Hindering terrain, Vanguard (3)'
  },
  'Tengu Ayakashi': {
    pts: 80,
    role: 'Fu',
    M: 7,
    V: 3,
    C: 2,
    A: 4,
    W: 5,
    R: 3,
    D: 3,
    E: 1,
    rules: ['Barrage (4) (14", Armor Piercing (1), Rapid Volley)'],
    cmd: 'Tenacious (1) against Volleys, Vanguard (3)'
  },
  'Kappa Bushi': {
    pts: 75,
    role: 'Sui',
    M: 6,
    V: 1,
    C: 3,
    A: 5,
    W: 7,
    R: 3,
    D: 3,
    E: 1,
    rules: ['Cleave (1)', 'Impact (2)', 'Flurry'],
    cmd: 'Can be activated by any Ideal Card'
  },
  'Origami Warriors': {
    pts: 60,
    role: 'Mu',
    M: 6,
    V: 1,
    C: 2,
    A: 5,
    W: 6,
    R: 3,
    D: 3,
    E: 1,
    rules: ['Lethal Demise (4)'],
    cmd: 'Tenacious (1) against Volleys; destroyed stands do not count toward Broken'
  }
};
function modTotal(m) {
  return Object.values(m.counts || {}).reduce((a, n) => a + (+n || 0), 0);
}
function modPts(m) {
  return Object.entries(m.counts || {}).reduce(
    (a, [t, n]) => a + (+n || 0) * ((MODULAR[t] || {}).pts || 0),
    0
  );
}
function modProblems(m) {
  const p = [],
    tot = modTotal(m),
    c = +(m.counts || {})[m.cmd] || 0;
  if (tot < 2) p.push('A Modular Regiment needs at least 2 stands.');
  if (c < 1) p.push('Include at least one ' + m.cmd + ' stand for the Command Stand.');
  else {
    if (c * 2 < tot) p.push('At least half the stands must be ' + m.cmd + '.');
    if (tot - c >= c) p.push('Other stand types must be fewer than the ' + m.cmd + ' stands.');
  }
  return p;
}
function modJson(m) {
  const types = Object.entries(m.counts || {}).filter(([t, n]) => +n > 0),
    C = MODULAR[m.cmd],
    tot = modTotal(m);
  const mods = [m.cmd];
  for (let i = 1; i < (+m.counts[m.cmd] || 0); i++) mods.push(m.cmd);
  types.forEach(([t, n]) => {
    if (t !== m.cmd) for (let i = 0; i < +n; i++) mods.push(t);
  });
  const all = types.map(([t]) => t),
    only = re => all.every(t => re.test(t));
  const prof = {};
  const plusA = m.cmd === 'Oni Ayakashi' ? 1 : 0;
  all.forEach(t => {
    const x = MODULAR[t];
    prof[t] = { C: x.C, A: x.A + plusA, V: x.V, W: x.W, rules: x.rules.slice() };
  });
  const rules = [],
    ab = [
      ['Command Stand: ' + m.cmd, C.cmd],
      ['Ideal Card', C.role],
      ['Enlightened', 'The first time it would be Broken, it Rallies instead.']
    ];
  if (m.cmd === 'Oni Ayakashi') rules.push('Juggernaut');
  if (m.cmd === 'Kami Ayakashi') rules.push('Tenacious (1)');
  if (/Tengu/.test(m.cmd)) rules.push('Vanguard (3)');
  if (m.cmd === 'Tengu Bushi') {
    ab.push(['Pathfinding', 'Ignores Hindering terrain']);
    rules.push('Ignores Hindering terrain');
  }
  if (m.cmd === 'Tengu Ayakashi' || m.cmd === 'Origami Warriors') {
    ab.push(['Tenacious against Volleys', 'Tenacious (1) when targeted by a Volley']);
    rules.push('Tenacious (1) against Volleys');
  }
  if (m.cmd === 'Kappa Bushi') ab.push(['Any Ideal Card', 'Can be activated by any Ideal Card']);
  if (m.cmd === 'Origami Warriors') ab.push(['Paper Ranks', 'Destroyed stands do not count toward Broken']);
  if (only(/^Tengu/)) rules.push('Fly');
  if (only(/^Tengu Bushi$/)) ab.push(['Blade Masters', 'Flawless Strikes also trigger on hit rolls of 2']);
  if (only(/^Origami/)) {
    if (!rules.includes('Vanguard (3)')) rules.push('Vanguard (3)');
    ab.push(['In the Fold', 'Cannot be Broken']);
  }
  const M = Math.min(...all.map(t => MODULAR[t].M));
  return {
    name: 'Modular Regiment (' + m.cmd + ')',
    short: m.cmd.split(' ')[0] + ' Modular',
    points: modPts(m),
    cls: 'Medium Brute',
    type: 'brute',
    stands: tot,
    M,
    V: C.V,
    C: C.C,
    A: C.A + plusA,
    W: C.W,
    R: C.R,
    D: C.D,
    E: C.E + (m.cmd === 'Kami Ayakashi' ? 1 : 0),
    rules,
    abilities: ab,
    standardBearer: false,
    leader: true,
    auxiliary: null,
    character: null,
    mods,
    modProfiles: prof
  };
}
