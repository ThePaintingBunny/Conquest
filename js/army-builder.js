/* The army builder: warbands, regiment options, upgrades, saved armies. */
/* ---------- army builder: warbands (from the encyclopedia, no Claude needed) ---------- */
const BLDKEY = { main: 'conquest-army-builder2', test: 'conquest-test-field-draft' };
function bldLoad(k) {
  try {
    const v = JSON.parse(localStorage.getItem(BLDKEY[k]) || 'null');
    if (v && Array.isArray(v.wbs)) return v;
  } catch (e) {}
  return { fac: '', wbs: [], warlord: 0 };
}
let bld = bldLoad('main'),
  bldWho = 'main',
  bldStash = {},
  armyMode = 'build';
function bldSave() {
  try {
    localStorage.setItem(BLDKEY[bldWho], JSON.stringify(bld));
  } catch (e) {}
}
/* the test field keeps its own builder draft, so it never touches the player's army */
function bldUse(k) {
  if (k === bldWho) return;
  bldStash[bldWho] = bld;
  bld = bldStash[k] || bldLoad(k);
  bldWho = k;
  abPick = null;
}
function bldFac() {
  return ENCY.find(f => f.name === bld.fac) || null;
}
function bldUnit(name) {
  const f = bldFac();
  return f && f.units.find(u => u.name === name);
}
function bldBase(u) {
  if (!u) return 1;
  const m = String(u.stands || '').match(/(\d+)\s*(?:double\s+)?stands?/i);
  return u.kind === 'char' || /^1 stand/.test(u.stands) ? 1 : m ? +m[1] : 3;
}
function bnorm(t) {
  return String(t || '')
    .toLowerCase()
    .replace(/[-–]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/s\b/g, '');
}
function isChariot(u) {
  return u && /chariot/i.test(u.type);
}
/* W'adrhŭn: every character follows a Cult. A Scion's is fixed by its name; the others choose Famine, Death or War when
   the list is made, and only the Warlord may follow Conquest. */
const WAD_CULTS = ['Famine', 'Death', 'War', 'Conquest'];
function wadFixedCult(c) {
  const m = c && String(c.name).match(/^Scion of (\w+)/);
  return m ? m[1] : '';
}
function wadWbCult(w) {
  const c = w && bldUnit(w.char);
  if (!c || bld.fac !== "W'adrhŭn") return '';
  return wadFixedCult(c) || w.cult || '';
}
/* Hundred Kingdoms: the Priory Commander belongs to the Order of the Crimson Tower or of the Sealed Temple. The Order
   sets its warband, its profile (Crimson Tower: Brutal Impact (2), Terrifying (1); Sealed Temple: +1 Attacks, Impact +1)
   and its Supremacy Ability (Tactical Superiority or Relentless Protectors). */
const PRIORY = ['Crimson Tower', 'Sealed Temple'];
function prioryOf(c) {
  return c && c.name === 'Priory Commander';
}
/* Weaver Courts: the Taosidhe picks any Seasonal Court, the Seanchas Sidhe Summer or Winter (it knows that Court's
   spells). Other characters' Courts are fixed. */
function wcCourtChoices(c) {
  /* Sorcerer Kings, Sorcerous Patronage: every character picks a Court (its spells, Rituals and Mainstay Elementals) */
  if (c && bld.fac === 'Sorcerer Kings' && c.kind === 'char') return ['Fire', 'Air', 'Earth', 'Water'];
  if (!c || bld.fac !== 'Weaver Courts') return null;
  if (c.name === 'Taosidhe') return ['Spring', 'Summer', 'Autumn', 'Winter'];
  if (c.name === 'Seanchas Sidhe') return ['Summer', 'Winter'];
  return null;
}
/* warband rules for a character */
function wbRules(c, w) {
  const f = bldFac();
  let txt = c.warband || '';
  if (prioryOf(c) && w && w.order) {
    const head = txt.split(/\.\s*(?=Crimson Tower:|Sealed Temple:)/)[0],
      seg = (txt.match(new RegExp(w.order + ':\\s*([^.]*)')) || [])[1];
    if (seg) txt = head + '. ' + seg;
  }
  const same = txt.match(/^Same warband as the (.+)$/i);
  if (same) {
    const o = f.units.find(x => x.name.toLowerCase() === same[1].toLowerCase());
    if (o) txt = o.warband;
  }
  const out = {
    main: [],
    res: [],
    caps: {},
    allow: 4,
    needOne: /at least (one|1) regiment/i.test(txt),
    joinExtra: [],
    none: /no warband/i.test(txt)
  };
  const m = txt.match(/(?:up to|max(?:imum)?)\s*(\d+)\s*regiments?/i);
  if (m) out.allow = +m[1];
  const att = txt.match(/attach to ([A-Za-z -]+?)(?: Brute)? regiments|attach to (Infantry|Cavalry|Brute)/i);
  if (att) out.joinExtra.push((att[1] || att[2]).trim());
  txt.split(/(?<=\.)\s+|;\s*/).forEach(seg => {
    const mm = seg.match(/(mainstay|restricted)\s*:?\s*(.*)$/i);
    if (!mm) return;
    mm[2]
      .replace(/\.$/, '')
      .split(/,\s*|\s+and\s+/)
      .forEach(n => {
        n = n.trim();
        if (!n) return;
        const cap = n.match(/\(max (\d+)(?: each)?\)/i);
        const nm = n.replace(/\(.*?\)/g, '').trim();
        (mm[1].toLowerCase() === 'mainstay' ? out.main : out.res).push(nm);
        if (cap) out.caps[bnorm(nm)] = +cap[1];
      });
  });
  (txt.match(/max (\d+) ([A-Z][A-Za-z' -]+?)(?=(?: and |,|;|\.|$))/g) || []).forEach(t => {
    const mm = t.match(/max (\d+) (.+)/);
    if (mm && !/regiments?$/i.test(mm[2])) out.caps[bnorm(mm[2].replace(/ Regiments?$/i, ''))] = +mm[1];
  });
  (txt.match(/and (\d+) ([A-Z][A-Za-z' -]+?)(?=(?:,|;|\.|$))/g) || []).forEach(t => {
    const mm = t.match(/and (\d+) (.+)/);
    if (mm) out.caps[bnorm(mm[2])] = +mm[1];
  });
  /* the Cults of Ukunfazane: a character's Cult adds up to two Chosen of that Cult as a Restricted choice */
  if (w && bld.fac === "W'adrhŭn" && !wadFixedCult(c) && w.cult) {
    const ch = 'Chosen of ' + w.cult;
    if (!out.main.includes(ch) && !out.res.includes(ch)) out.res.push(ch);
    out.caps[bnorm(ch)] = 2;
  }
  return out;
}
/* resolve an option name from a warband list to units of the faction */
function wbResolve(name) {
  const f = bldFac(),
    n = bnorm(name),
    units = f.units.filter(
      u => u.pts != null && (u.kind === 'reg' || u.type === 'Monster' || /Trebuchet/.test(u.name))
    );
  if (/war chariot/.test(n)) return units.filter(isChariot);
  let hit = units.filter(u => bnorm(u.name) === n);
  if (hit.length) return hit;
  hit = units.filter(u => bnorm(u.name).startsWith(n) || n.startsWith(bnorm(u.name)));
  if (hit.length && n.length > 3) return hit;
  const rest = n.replace(/^(all|any|other|the) /, '');
  if (/modular/.test(n)) return units.filter(u => /modular/i.test(u.warband + ' ' + u.stands));
  if (/spires regiment|any /.test(n)) return units.filter(u => u.kind === 'reg');
  if (/order/.test(rest)) return units.filter(u => /The Orders/.test(u.warband));
  if (/sorcerer saint/.test(n)) return units.filter(u => /Sorcerer Saints/.test(u.name));
  hit = units.filter(u => bnorm(u.name).startsWith(rest) || bnorm(u.warband).includes(rest));
  return hit;
}
function wbChoices(c, w) {
  const r = wbRules(c, w),
    seen = new Set(),
    out = [];
  [
    ['main', r.main],
    ['res', r.res]
  ].forEach(([cat, list]) =>
    list.forEach(nm => {
      const us = wbResolve(nm);
      const chariots = us.length && us.every(isChariot) && /chariot/i.test(nm);
      if (/modular/i.test(nm)) {
        if (!seen.has('modular')) {
          seen.add('modular');
          out.push({
            key: 'modular',
            cat,
            label: 'Modular Regiment (mix Ayakashi, Bushi and Origami stands)',
            modular: true
          });
        }
        return;
      }
      if (chariots) {
        const key = 'chariot';
        if (!seen.has(key)) {
          seen.add(key);
          out.push({
            key,
            cat,
            label: 'War Chariots (1 or 2 chariots, one regiment slot)',
            chariots: us.map(u => u.name)
          });
        }
        return;
      }
      us.forEach(u => {
        if (seen.has(u.name)) return;
        seen.add(u.name);
        out.push({ key: u.name, cat, label: u.name, unit: u.name });
      });
    })
  );
  /* Sorcerous Patronage: non-Monster Elementals of the character's Court are Mainstay */
  if (bld.fac === 'Sorcerer Kings' && w && w.court)
    out.forEach(q => {
      const u = q.unit && bldUnit(q.unit);
      if (u && u.type !== 'Monster' && u.warband === 'Court of ' + w.court) q.cat = 'main';
    });
  return out;
}
/* regiment options parsed from the encyclopedia text */
/* Faction army lists that cap Officers per regiment where the paraphrased entries lost the number
   (City States 2026 post-Adepticon list: up to one Officer per regiment). */
const OFFICER_LIMIT = { 'City States': 1 };
function regOptions(u) {
  const t = String(u.options || '');
  const out = [];
  if (bld.fac === 'Hundred Kingdoms' && u.kind === 'reg' && hkAllOrders()) {
    [
      ['Laurel of Triumph', 10, 'once per game re-roll an Attack or Defense roll'],
      ['Banner of Wrath', 5, 'Fury'],
      ['Disciplined Advance', 5, '+1 Charge distance'],
      ['Oathsworn', 5, 'Command Stand may Die Fighting']
    ].forEach(([n, c, d]) => out.push({ name: n, cost: c, kind: 'order', detail: d }));
  }
  t.split(/;\s*/).forEach(seg => {
    const head = ((seg.match(/^([^:]*):/) || [])[1] || '').trim();
    /* only real purchases: Officers, Auxiliaries, Veteran and plain Options. Memory of Old, Empowerment and notes are rules, not upgrades */
    const kind = /^Veteran\b/i.test(seg)
      ? 'vet'
      : /^Auxiliar/i.test(head)
        ? 'aux'
        : /^Officers?\b/i.test(head)
          ? 'off'
          : /^Options?$/i.test(head)
            ? 'other'
            : null;
    if (!kind) return;
    const body = seg.replace(/^[^:]*:\s*/, '');
    const re = /([A-Z][A-Za-z'’ -]*?)\s*\+?(\d{1,3})\b(?:\s*\(((?:[^()]|\([^()]*\))*)\))?/g;
    let m;
    while ((m = re.exec(body))) {
      const nm = m[1].replace(/\s+(or|and)$/i, '').trim();
      if (!nm || /^(Up to|Max)/i.test(nm)) continue;
      out.push({ name: kind === 'vet' ? 'Veteran' : nm, cost: +m[2], kind, detail: m[3] || '' });
    }
  });
  /* Officers: each one at most once (army lists 2026). The regiment's own entry may set a number ("Officers (up to 2)",
     "Officer (1)"); otherwise the core limit applies: a Command Stand holds at most four Command Models, Leader and
     Standard Bearer included. Auxiliaries, Veterans and other options do not count. */
  let max = null;
  if (out.some(o => o.kind === 'off')) {
    const seg = (t.match(/Officers?\s*\(([^)]*)\)\s*:/i) || [])[1] || '',
      n = (seg.match(/(\d+)/) || [])[1],
      cmd = u.cmd || {},
      room = Math.max(0, 4 - (cmd.leader ? 1 : 0) - (cmd.bearer ? 1 : 0));
    const fl = OFFICER_LIMIT[u.fac || bld.fac];
    max = n ? Math.min(+n, room) : fl != null ? Math.min(fl, room) : room;
  }
  return { opts: out, max };
}
function rowPts(r) {
  if (r.modular) return modPts(r.modular) + (r.custom || []).reduce((a, c) => a + (+c.pts || 0), 0);
  if (r.chariots) return r.chariots.filter(Boolean).reduce((a, n) => a + ((bldUnit(n) || {}).pts || 0), 0);
  const u = bldUnit(r.unit);
  if (!u) return 0;
  const b = bldBase(u);
  const o = regOptions(u).opts;
  return (
    (u.pts || 0) +
    Math.max(0, (r.stands || b) - b) * (u.extra || 0) +
    (r.opts || []).reduce((a, n) => a + ((o.find(x => x.name === n) || {}).cost || 0), 0) +
    (r.custom || []).reduce((a, c) => a + (+c.pts || 0), 0)
  );
}
function wbPts(w) {
  const c = bldUnit(w.char);
  /* Holy Crusade: one 3-stand Crusaders regiment is free (extra stands still cost) */
  const cru = holyCrusadeWb(w) && w.regs.find(r => r.unit === 'Crusaders'),
    free = cru ? (bldUnit('Crusaders') || {}).pts || 0 : 0;
  return (
    (c ? c.pts || 0 : 0) +
    upgPts(w) +
    (w.custom || []).reduce((a, x) => a + (+x.pts || 0), 0) +
    w.regs.reduce((a, r) => a + rowPts(r), 0) -
    free
  );
}
function bldTotal() {
  return bld.wbs.reduce((a, w) => a + wbPts(w), 0);
}
function joinable(w, r) {
  const c = bldUnit(w.char);
  if (!c || c.type === 'Monster' || r.chariots) return false;
  const rk = rideOf(w);
  if (rk) return !!(r.unit && RIDE[rk].test(r.unit));
  if (r.modular) return c.type === 'Brute';
  const u = bldUnit(r.unit);
  if (!u) return false;
  if (u.type === 'Monster') return false;
  /* Lineage Commander (Spires): the Lineage Highborne joins a Bound Clones regiment, and only that */
  if ((w.upg || []).includes('Lineage Commander')) return r.unit === 'Bound Clones';
  const R = wbRules(c, w);
  return (
    u.type === c.type ||
    R.joinExtra.some(x => new RegExp(x.split(' ')[0], 'i').test(u.type + ' ' + u.warband))
  );
}
/* Sanctified Labaron (Old Dominion): one Restricted entry of the character counts as Mainstay. The builder picks the
   Restricted entry the warband uses most, which is always the best choice. */
function labaronKey(w, ch) {
  if (!(w.upg || []).includes('Sanctified Labaron')) return null;
  const cnt = {};
  w.regs.forEach(r => {
    const k = r.modular ? 'modular' : r.chariots ? 'chariot' : r.unit,
      x = ch.find(q => q.key === k);
    if (x && x.cat === 'res') cnt[k] = (cnt[k] || 0) + 1;
  });
  return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || null;
}
function wbProblems(w) {
  const c = bldUnit(w.char),
    p = [];
  if (!c) return ['Choose a character.'];
  const R = wbRules(c, w),
    ch = wbChoices(c, w);
  if (R.none) return w.regs.length ? [c.name + ' has no warband of its own.'] : [];
  w.regs.forEach(r => {
    if (r.modular) modProblems(r.modular).forEach(t => p.push(t));
    /* one Officer per regiment (an Auxiliary is not an Officer) */
    const ru = r.unit && bldUnit(r.unit);
    if (ru && (r.opts || []).length) {
      const O = regOptions(ru).opts,
        offs = r.opts.filter(n => (O.find(o => o.name === n) || {}).kind === 'off');
      const mx = regOptions(ru).max;
      if (mx != null && offs.length > mx)
        p.push(`${r.unit}: at most ${mx} Officer${mx === 1 ? '' : 's'} (has ${offs.join(' and ')}).`);
    }
  });
  const lab = labaronKey(w, ch);
  const n = w.regs.length,
    cat = r => {
      const k = r.modular ? 'modular' : r.chariots ? 'chariot' : r.unit;
      const x = ch.find(q => q.key === k);
      return x ? (k === lab ? 'main' : x.cat) : 'none';
    };
  const nm = w.regs.filter(r => cat(r) === 'main').length,
    nr = w.regs.filter(r => cat(r) === 'res').length;
  if (n > R.allow) p.push(`Too many regiments: ${n} of ${R.allow}.`);
  if (nr > 2) p.push(`At most 2 Restricted choices (you have ${nr}).`);
  if (nr > nm) p.push(`Each Restricted choice needs a Mainstay choice (${nm} Mainstay, ${nr} Restricted).`);
  if (w.regs.some(r => cat(r) === 'none')) p.push('A regiment is not in this character’s warband.');
  Object.entries(R.caps).forEach(([k, v]) => {
    const cnt = w.regs.filter(r => r.unit && bnorm(r.unit).startsWith(k)).length;
    if (cnt > v) p.push(`At most ${v} × ${k.replace(/\b\w/g, s => s.toUpperCase())}.`);
  });
  {
    const rk = rideOf(w);
    if (rk && !w.regs.some(r => joinable(w, r)))
      p.push(
        (m => `${rk}: the ${c.name} must ride ${/^[AEIOU]/.test(m) ? 'an' : 'a'} ${m} in its warband.`)(
          String(RIDE[rk].source)
            .replace(/[\^$()]/g, '')
            .replace('|', ' or ')
        )
      );
    else if (c.type !== 'Monster' && !w.regs.some(r => joinable(w, r)))
      p.push(`Needs a ${c.type} regiment for the ${c.name} to join.`);
  }
  if ((R.needOne || c.type === 'Monster') && !n && !R.none && c.type === 'Monster' && R.needOne)
    p.push('Must include at least one regiment.');
  if (c.type !== 'Monster' && w.joins != null && !(w.regs[w.joins] && joinable(w, w.regs[w.joins])))
    p.push('Choose which regiment the character joins.');
  if (wcCourtChoices(c) && !w.court)
    p.push(
      `Choose the ${c.name}’s ${bld.fac === 'Sorcerer Kings' ? 'Court' : 'Seasonal Court'} (${wcCourtChoices(c).join(', ')}).`
    );
  if (prioryOf(c) && !w.order)
    p.push('Choose the Priory Commander’s Order (Crimson Tower or Sealed Temple).');
  if (bld.fac === "W'adrhŭn" && !wadFixedCult(c)) {
    if (!w.cult)
      p.push(`Choose the ${c.name}’s Cult (Famine, Death or War; the Warlord may follow Conquest).`);
    else if (w.cult === 'Conquest' && bld.wbs[bld.warlord] !== w)
      p.push(`Only the Warlord may follow the Cult of Conquest (the ${c.name} is not the Warlord).`);
  }
  return p;
}
const WL_CREED = {
  'Ardent Kerawegh': ['Ardent'],
  'Hold Raegh': ['Clan'],
  Exemplar: ['Ardent', 'Clan'],
  'Tempered Sorcerer': ['Tempered'],
  'Tempered Steelshaper': ['Tempered'],
  'Lost Ancestor': ['Ardent', 'Tempered']
};
function wlRule(c) {
  if (!c) return { no: true, why: 'Unknown character' };
  const t = (c.options || '') + ' ' + (c.warband || '');
  if (/cannot be (the )?(army's )?warlord/i.test(t))
    return { no: true, why: c.name + ' cannot be the Warlord (army list rule).' };
  if (/must be (your )?warlord/i.test(t))
    return { must: true, why: 'A ' + c.name + ' must be your Warlord.' };
  if (WL_CREED[c.name]) return { creeds: WL_CREED[c.name] };
  return {};
}
function canWarlord(c) {
  return !wlRule(c).no;
}
function wlFix() {
  const W = bld.wbs.map(w => bldUnit(w.char));
  const must = W.findIndex(c => c && wlRule(c).must);
  if (must >= 0) {
    bld.warlord = must;
    return;
  }
  if (!(bld.warlord >= 0 && W[bld.warlord] && canWarlord(W[bld.warlord])))
    bld.warlord = W.findIndex(c => c && canWarlord(c));
}
function wlProblems() {
  const out = [],
    W = bld.wbs.map(w => bldUnit(w.char)).filter(Boolean);
  if (!W.length) return out;
  const musts = W.filter(c => wlRule(c).must);
  if (musts.length > 1) out.push('Only one ' + musts[0].name + ' is allowed: it must be your Warlord.');
  if (!W.some(canWarlord)) out.push('No character here can be the Warlord. Add one who can.');
  return out;
}
/* a Hundred Kingdoms character's sub-faction role, from its warband line ("Theist.", "The Orders.") */
function hkRole(name) {
  const c = bldUnit(name);
  return c ? ((c.warband || '').match(/^(Imperial|Feudal|Theist|The Orders)\b/) || [])[1] || '' : '';
}
function hkRoles() {
  return bld.fac === 'Hundred Kingdoms' ? bld.wbs.map(w => hkRole(w.char)).filter(Boolean) : [];
}
/* Sacred Relics and Order Regiment Upgrades: only when every character is [The Orders] */
function hkAllOrders() {
  const R = hkRoles();
  return R.length > 0 && R.every(r => r === 'The Orders');
}
/* Hundred Kingdoms Dynastic Ally: why this warband's character cannot be the ally ('' if it can) */
function allyWhy(wi) {
  const w = bld.wbs[wi],
    wl = bld.wbs[bld.warlord];
  if (!w) return 'No warband';
  if (bld.warlord === wi) return 'It is the Warlord';
  if (/Chapter Mage/.test(w.char)) return 'A Chapter Mage cannot be a Dynastic Ally';
  const c = bldUnit(w.char);
  if (!c || c.kind !== 'char' || !/Supremacy/.test(c.options || '')) return 'It has no Supremacy Ability';
  if (wl && wl.char === w.char) return 'It must be a different character entry from the Warlord';
  if (wl && hkRole(wl.char) && hkRole(wl.char) === hkRole(w.char))
    return 'It cannot share the Warlord’s Sub-Faction (' + hkRole(w.char) + ')';
  return '';
}
function allyIdx() {
  return bld.fac === 'Hundred Kingdoms' && bld.ally != null && bld.wbs[bld.ally] ? bld.ally : -1;
}
/* Holy Crusade (Crusading Noble Lord as Warlord or Dynastic Ally): every Crusading Bull, and a free Crusaders regiment */
function holyCrusadeWb(w) {
  if (bld.fac !== 'Hundred Kingdoms' || !/Crusading Noble Lord/.test(w.char || '')) return false;
  const i = bld.wbs.indexOf(w);
  return i === bld.warlord || i === allyIdx();
}
function bldProblems() {
  const out = [];
  if (!bld.wbs.length) out.push('Add at least one warband.');
  if (bld.fac === 'Hundred Kingdoms') {
    const R = hkRoles(),
      wl = bld.wbs[bld.warlord];
    /* Memories of the Red Years: no Theist and Orders characters together (For All Mankind ignores it, from the
       Warlord or the Dynastic Ally) */
    const al = bld.wbs[allyIdx()],
      fam = [wl, al].some(x => x && /Errant of the Order of the Shield/.test(x.char));
    if (allyIdx() >= 0 && allyWhy(allyIdx())) out.push('Dynastic Ally: ' + allyWhy(allyIdx()) + '.');
    if (R.includes('Theist') && R.includes('The Orders') && !fam)
      out.push('Memories of the Red Years: an army cannot include both a Theist and an Orders character.');
    /* Servite needs at least one Orders character */
    if (!R.includes('The Orders') && bld.wbs.some(w => w.regs.some(r => (r.opts || []).includes('Servite'))))
      out.push('Servite: the army needs at least one Orders character.');
    if (
      !hkAllOrders() &&
      bld.wbs.some(w =>
        w.regs.some(r =>
          (r.opts || []).some(n =>
            /^(Laurel of Triumph|Banner of Wrath|Disciplined Advance|Oathsworn)$/.test(n)
          )
        )
      )
    )
      out.push('Order Regiment Upgrades are only for armies whose characters are all Orders characters.');
  }
  /* Dweghom: one Mnemancer's Apprentice per army */
  if (bld.fac === 'Dweghom') {
    const n = bld.wbs.reduce(
      (a, w) => a + (w.regs || []).filter(r => (r.opts || []).includes("Mnemancer's Apprentice")).length,
      0
    );
    if (n > 1) out.push(`Only one Mnemancer’s Apprentice per army (you have ${n}).`);
  }
  if (bld.fac === 'Spires' && !bld.sect)
    out.push(
      'Choose the army’s Sect (Underspire, Directorate or Sovereign Lineage): every Spires army must follow one.'
    );
  bld.wbs.forEach((w, i) =>
    wbProblems(w)
      .concat(upgProblems(w, i))
      .forEach(t => out.push(`Warband ${i + 1}: ${t}`))
  );
  wlProblems().forEach(t => out.push(t));
  return out;
}
function bldType(t) {
  t = String(t || '').toLowerCase();
  return t.includes('cav')
    ? 'cav'
    : t.includes('brute')
      ? 'brute'
      : t.includes('monster')
        ? 'monster'
        : t.includes('chariot')
          ? 'chariot'
          : 'inf';
}
function bearerDefault(u) {
  return !!(u && u.cmd && u.cmd.bearer);
}
function cmdText(u) {
  const c = u && u.cmd;
  if (!c) return '';
  return (
    [c.leader ? 'Leader' : '', c.bearer ? 'Standard Bearer' : ''].filter(Boolean).join(' · ') ||
    'No command models'
  );
}
function unitJson(u, extra, f) {
  const S = u.stats,
    n = v => (v === '-' ? null : v);
  return Object.assign(
    {
      name: u.name,
      short: u.name.slice(0, 20),
      points: u.pts || 0,
      cls: [u.cls || 'Medium', u.type].join(' ').trim(),
      type: bldType(u.type),
      stands: bldBase(u),
      M: n(S.M) || (bldType(u.type) === 'monster' ? 7 : 6),
      V: n(S.V) || 0,
      C: n(S.C) || 1,
      A: n(S.A) || 1,
      W: n(S.W) || 4,
      R: S.R === '-' ? '–' : S.R,
      D: n(S.D) || 0,
      E: n(S.E) || 0,
      rules: u.rules.slice(),
      abilities: u.draw.map(d => [d, ruleInfo(d, f.name) || 'Draw Event']),
      standardBearer: bearerDefault(u),
      leader: !!(u.cmd && u.cmd.leader),
      auxiliary: null,
      character: null
    },
    extra || {}
  );
}
function upgAbilities(w) {
  return (w.upg || [])
    .map(n => {
      const e = upgFind(n);
      return e ? [n, e[4] + ' (' + e[0] + ', ' + e[2] + ' pts)'] : [n, 'Upgrade'];
    })
    .concat((w.custom || []).map(x => [x.name, 'Upgrade, ' + x.pts + ' pts']));
}
function charJson(c, warlord, custom, w) {
  const n = v => (v === '-' ? null : v),
    S = Object.assign({}, c.stats);
  let rules = c.rules.concat((c.draw || []).filter(d => !c.rules.includes(d)));
  const order = prioryOf(c) && w && w.order;
  if (prioryOf(c)) {
    rules = rules.filter(r => !/^(Crimson Tower|Sealed Temple):/.test(r));
    if (order === 'Crimson Tower') rules.push('Brutal Impact (2)', 'Terrifying (1)');
    if (order === 'Sealed Temple') {
      S.A = (+S.A || 0) + 1;
      rules = rules.map(r => r.replace(/^Impact \((\d+)\)$/, (m, k) => 'Impact (' + (+k + 1) + ')'));
    }
  }
  return {
    order: order || undefined,
    court: (wcCourtChoices(c) && w && w.court) || undefined,
    name: c.name,
    warlord,
    ally: !warlord && allyIdx() >= 0 && bld.wbs[allyIdx()] === w,
    rider: !!rideOf(w),
    stats: {
      C: n(S.C) || 1,
      A: n(S.A) || 1,
      W: n(S.W) || 4,
      R: S.R === '-' ? 0 : S.R,
      D: n(S.D) || 0,
      E: n(S.E) || 0,
      V: n(S.V) || 0
    },
    rules,
    spells: [],
    upgrades: (w ? upgAbilities(w) : (custom || []).map(x => [x.name, x.pts + ' pts'])).map(a => a[0])
  };
}
function bldToList() {
  const f = bldFac();
  if (!f) return null;
  (bld.wbs || []).forEach(riderFix);
  const units = [],
    count = {};
  units.push = function (...a) {
    a.forEach(x => {
      if (this.wbCur && x) {
        x.wb = this.wbCur[0];
        x.wbChar = this.wbCur[1];
        if (this.wbCur[2]) x.cult = this.wbCur[2];
        if (this.wbCur[3]) x.wbCourt = this.wbCur[3];
      }
    });
    return Array.prototype.push.apply(this, a);
  };
  const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
  const nameOf = u => {
    count[u] = (count[u] || 0) + 1;
    return u;
  };
  bld.wbs.forEach((w, wi) => {
    const c = bldUnit(w.char);
    if (!c && !w.bare) return;
    const wl = bld.warlord === wi;
    units.wbCur = [wi, c ? c.name : null, wadWbCult(w), (wcCourtChoices(c) && w.court) || ''];
    if (c && c.type === 'Monster') {
      units.push(
        unitJson(
          c,
          {
            name: nameOf(c.name),
            points: wbPtsChar(w),
            abilities: c.draw.map(d => [d, ruleInfo(d, f.name) || 'Draw Event']).concat(upgAbilities(w)),
            warlordMonster: wl
          },
          f
        )
      );
    }
    w.regs.forEach((r, ri) => {
      if (r.modular) {
        const x = modJson(r.modular);
        x.points += (r.custom || []).reduce((a, c) => a + (+c.pts || 0), 0);
        (r.custom || []).forEach(q => x.abilities.push([q.name, 'Upgrade, ' + q.pts + ' pts']));
        nameOf(x.name);
        if (c && w.joins === ri && c.type !== 'Monster') x.character = charJson(c, wl, w.custom, w);
        if (c)
          x.abilities = (x.abilities || []).concat(
            upgAbilities(w).map(a => ['The ' + c.name + ': ' + a[0], a[1]])
          );
        units.push(x);
        return;
      }
      if (r.chariots) {
        r.chariots.filter(Boolean).forEach(nm => {
          const u = bldUnit(nm);
          if (u) units.push(unitJson(u, { name: nameOf(nm), stands: 1 }, f));
        });
        return;
      }
      const u = bldUnit(r.unit);
      if (!u) return;
      const o = regOptions(u).opts,
        ab = u.draw.map(d => [d, ruleInfo(d, f.name) || 'Draw Event']);
      let aux = null;
      const rules = u.rules.slice();
      (r.opts || []).forEach(nm => {
        const op = o.find(x => x.name === nm);
        if (!op) return;
        if (op.kind === 'aux') {
          const au = f.units.find(x =>
            bnorm(x.name).startsWith(bnorm(op.name).split(' ').slice(0, 2).join(' '))
          );
          aux = {
            name: op.name,
            stats: au ? { C: au.stats.C, A: au.stats.A, W: au.stats.W } : { C: 3, A: 4, W: 6 },
            rules: au ? au.rules.slice() : []
          };
          return;
        }
        /* Hundred Kingdoms Order Regiment Upgrades that change play */
        if (op.kind === 'order') {
          if (op.name === 'Banner of Wrath') rules.push('Fury');
          if (op.name === 'Disciplined Advance') rules.push('Charge +1″ (Disciplined Advance)');
        }
        if (op.kind === 'vet' && op.detail && ruleInfo(op.detail, f.name) && !/[+]/.test(op.detail)) {
          rules.push(op.detail);
          ab.push(['Veteran', op.detail]);
          return;
        }
        ab.push([
          op.name,
          (op.kind === 'off' ? 'Officer' : 'Option') +
            (op.detail ? ': ' + op.detail : '') +
            ', ' +
            op.cost +
            ' pts'
        ]);
      });
      (r.custom || []).forEach(x => ab.push([x.name, 'Upgrade, ' + x.pts + ' pts']));
      const x = unitJson(
        u,
        {
          name: nameOf(u.name),
          points: rowPts(r),
          stands: u.kind === 'char' ? 1 : r.stands || bldBase(u),
          rules,
          abilities: ab,
          standardBearer: bearerDefault(u),
          auxiliary: aux
        },
        f
      );
      if (w.pbReg === ri) x.vetRole = true;
      if (c && w.joins === ri && c.type !== 'Monster') {
        x.character = charJson(c, wl, w.custom, w);
        const rk = rideOf(w);
        if (rk === 'Bergont Raegh') {
          x.W = (+x.W || 0) + 2;
          x.rules = (x.rules || []).concat(['Flawless Strikes']);
          x.character.rules = x.character.rules.concat(['Flawless Strikes']);
        }
        if (rk === 'Favored of Hormus') {
          x.rules = (x.rules || []).filter(q => !/^Barrage\b/.test(q)).concat(['Terrifying (1)']);
        }
        if (rk === 'Draic Rider') x.rules = (x.rules || []).concat(['Flank']);
        if (rk) x.character.rules = x.character.rules.concat(['Rider']);
      }
      if (c)
        x.abilities = (x.abilities || []).concat(
          upgAbilities(w).map(a => ['The ' + c.name + ': ' + a[0], a[1]])
        );
      units.push(x);
    });
  });
  // number duplicate names
  const seen = {};
  units.forEach(u => {
    if (count[u.name] > 1) {
      seen[u.name] = (seen[u.name] || 0) + 1;
      u.name = u.name + ' ' + roman[seen[u.name]] || u.name;
    }
  });
  if (!units.some(u => (u.character && u.character.warlord) || u.warlordMonster)) {
    const fc = units.find(u => u.character && canWarlord(bldUnit(u.character.name)));
    if (fc) fc.character.warlord = true;
    else {
      const fm = units.find(u => u.warlordMonster === false);
      if (fm) fm.warlordMonster = true;
    }
  }
  /* Spires: the Sect travels with the list as an army rule */
  const ar = f.armyRules.slice();
  if (f.name === 'Spires' && bld.sect) ar.push('Sect: ' + bld.sect);
  return { faction: f.name, armyRules: ar, points: bldTotal(), units };
}
function wbPtsChar(w) {
  const c = bldUnit(w.char);
  return (c ? c.pts || 0 : 0) + upgPts(w) + (w.custom || []).reduce((a, x) => a + (+x.pts || 0), 0);
}
const UPG_MULTI = /Mutation|Weapon Art|Modification|Heirloom|Experiment/;
function upgList() {
  return (UPG[bld.fac] || { list: [] }).list;
}
/* Rider masteries: the character has no stand of its own and rides this Monster of its warband */
const RIDE = {
  'Apex Master': /^Apex Predator$/,
  'Tontorr Rider': /^Tontorr$/,
  'Drum Beast Rider': /^Drum Beast$/,
  'Bergont Raegh': /^Ironclad Drake$/,
  'Hellbringer Sorcerer': /^Hellbringer Drake$/,
  'Ferric Throne': /^Stoneforged$/,
  'Favored of Hormus': /^Mahut$/,
  'Draic Rider': /^(Coill|Scoth) Draic$/
};
const RIDE_MULTI = /^(Apex Master|Tontorr Rider|Drum Beast Rider)$/;
function rideOf(w) {
  return ((w && w.upg) || []).find(n => RIDE[n]) || null;
}
function riderFix(w) {
  const k = rideOf(w);
  if (!k) return;
  const i = w.regs.findIndex(r => r.unit && RIDE[k].test(r.unit));
  if (i >= 0) w.joins = i;
}
function upgFind(n) {
  return upgList().find(x => x[1] === n);
}
function charNoUpg(c) {
  return (
    /no (trove-finds|upgrades|artefacts)|no character upgrades|cannot buy upgrades|no relics or masteries/i.test(
      c.options || ''
    ) || /Jorogumo/.test(c.name)
  );
}
function upgWhy(e, c, wi) {
  const who = e[3],
    f = bldFac();
  if (charNoUpg(c)) return 'The ' + c.name + ' cannot take upgrades';
  if (/Warlord only/i.test(who) && bld.warlord !== wi) return 'Warlord only';
  if (/except Jorogumo/i.test(who) && /Jorogumo/.test(c.name)) return 'Not for Jorogumo';
  {
    const cm = who.match(/Cult of (\w+)/);
    if (cm && bld.fac === "W'adrhŭn") {
      const cu = wadWbCult(bld.wbs[wi]);
      if (cu !== cm[1]) return 'Cult of ' + cm[1] + ' characters only' + (cu ? '' : ' (choose its Cult)');
    }
  }
  const names = f.units
    .filter(u => u.kind === 'char')
    .map(u => u.name)
    .filter(n =>
      who
        .split(/,\s*|\s+or\s+|\s*\(/)
        .map(x => x.trim())
        .includes(n)
    );
  if (names.length && !names.includes(c.name)) return 'Only ' + names.join(', ');
  if (/Infantry characters/i.test(who) && c.type !== 'Infantry') return 'Infantry characters only';
  if (RIDE[e[1]] && rideOf(bld.wbs[wi] || {}) && !(bld.wbs[wi].upg || []).includes(e[1]))
    return 'Already rides a monster';
  const taken = RIDE_MULTI.test(e[1])
    ? -1
    : bld.wbs.findIndex((w, i) => i !== wi && (w.upg || []).includes(e[1]));
  if (taken >= 0) return 'Taken by warband ' + (taken + 1);
  return '';
}
function upgPts(w) {
  return (w.upg || []).reduce((a, n) => a + ((upgFind(n) || [])[2] || 0), 0);
}
function upgProblems(w, wi) {
  const c = bldUnit(w.char),
    out = [];
  if (!c) return out;
  const cats = {};
  (w.upg || []).forEach(n => {
    const e = upgFind(n);
    if (!e) return;
    const why = upgWhy(e, c, wi);
    if (why && !/^Taken/.test(why)) out.push(n + ': ' + why + '.');
    if (
      !UPG_MULTI.test(e[0]) &&
      !(e[0] === 'Crusading Bull' && holyCrusadeWb(w)) &&
      !/^(Spires|W'adrhŭn)$/.test(bld.fac)
    ) {
      const k = e[0].replace(/^Discipline.*/, 'Discipline');
      cats[k] = (cats[k] || 0) + 1;
    }
  });
  Object.entries(cats).forEach(([k, v]) => {
    if (v > 1) out.push(`More than one ${k} upgrade on the ${c.name}.`);
  });
  /* W'adrhŭn: a single Artefact (Cult Artefact, Armor or Weapon) and a single Mastery (a Teaching or a Way of the
     Speakers); a character with a Way of the Speakers may take one more Mastery. Brood of Omgorah bars the Speakers. */
  if (bld.fac === "W'adrhŭn") {
    const U = (w.upg || []).map(upgFind).filter(Boolean),
      art = U.filter(e => /^(Cult Artefact|Armor|Weapon)$/.test(e[0])).length,
      spk = U.filter(e => e[0] === 'Mastery').length,
      mas = U.filter(e => /^(Teaching|Mastery)$/.test(e[0])).length;
    if (art > 1) out.push(`The ${c.name} may take a single Artefact (has ${art}).`);
    if (mas > (spk ? 2 : 1))
      out.push(
        spk
          ? `With a Way of the Speakers the ${c.name} may take one more Mastery, no more (has ${mas}).`
          : `The ${c.name} may take a single Mastery (has ${mas}).`
      );
    if (spk && U.some(e => e[1] === 'Brood of Omgorah'))
      out.push('Brood of Omgorah: the character cannot take a Mastery from the Ways of the Speakers.');
  }
  /* Spires 2026: how many Apparatuses, Mutations and Eccentricities each character may take */
  if (bld.fac === 'Spires') {
    const U = (w.upg || []).map(upgFind).filter(Boolean),
      ame = U.filter(e => /^(Apparatus|Mutation|Eccentricity)$/.test(e[0])),
      app = U.filter(e => e[0] === 'Apparatus').length,
      me = U.filter(e => /^(Mutation|Eccentricity)$/.test(e[0])).length;
    if (/^(Pheromancer|Biomancer)$/.test(c.name) && ame.length > 2)
      out.push(
        `The ${c.name} may take up to 2 Apparatuses, Mutations or Eccentricities (has ${ame.length}).`
      );
    if (/^(High Clone Executor|Lineage Highborne|Lineage Prideborne|Merchant Prince)$/.test(c.name)) {
      if (app) out.push(`The ${c.name} cannot take Apparatuses.`);
      if (me > 2) out.push(`The ${c.name} may take up to 2 Mutations or Eccentricities (has ${me}).`);
    }
    if (c.name === 'Mimetic Assassin') {
      if (app) out.push('The Mimetic Assassin cannot take Apparatuses.');
      if (me > 1) out.push('The Mimetic Assassin may take a single Mutation or Eccentricity.');
    }
    if (
      U.some(e => e[1] === 'Infiltration Optimization Strain') &&
      U.some(e => e[1] === 'Marksman Optimization Strain')
    )
      out.push('Infiltration and Marksman Optimization Strain cannot be taken together.');
  }
  /* City States 2026: Bestowed Relics (Banner, Armor, Weapon, Inscription) per character, Modifications, one Mastery.
     Long Lineage lets the character take one more Character Upgrade. */
  if (bld.fac === 'City States') {
    const U = (w.upg || []).map(upgFind).filter(Boolean),
      extra = U.some(e => e[1] === 'Long Lineage') ? 1 : 0,
      relics = U.filter(e => /^(Banner|Armor|Weapon|Inscription)$/.test(e[0])).length,
      mods = U.filter(e => e[0] === 'Modification').length,
      mast = U.filter(e => /^Mastery/.test(e[0])).length,
      RL = { Polemarch: 2, Aristarch: 1, Ipparchos: 1, Mechanist: 1, 'Promethean Oracle': 0 }[c.name];
    if (RL != null) {
      const used = c.name === 'Mechanist' ? relics + mods : relics;
      if (used > RL + extra)
        out.push(
          `The ${c.name} may take ${RL + extra} ${c.name === 'Mechanist' ? 'Bestowed Relic or Modification' : 'Bestowed Relic'}${RL + extra === 1 ? '' : 's'}${extra ? ' (with Long Lineage)' : ''}; it has ${used}.`
        );
    }
    if (c.name === 'Eidolon' && mods > 3 + extra)
      out.push(`The Eidolon may take up to ${3 + extra} Modifications.`);
    if (mast > 1) out.push(`The ${c.name} may take one Mastery.`);
  }
  return out;
}
function abUpgPicker(f, w, wi) {
  const c = bldUnit(w.char),
    box = bEl('div', { className: 'ab-pick' });
  const U = UPG[f.name] || { rule: '', list: [] };
  box.append(
    bEl('div', { className: 'ab-pickh' }, [
      bEl('strong', { textContent: 'Upgrades for the ' + c.name }),
      abBtn(
        'Done',
        () => {
          abPick = null;
          renderTurnbar();
        },
        'ab-pri ab-small ab-keep'
      )
    ])
  );
  if (U.rule) box.append(bEl('p', { className: 'ab-note', textContent: U.rule }));
  const cats = [...new Set(U.list.map(x => x[0]))];
  cats.forEach(cat => {
    box.append(
      bEl('div', { className: 'ab-pickg' }, [bEl('span', { className: 'ab-lab-t', textContent: cat })])
    );
    const grid = bEl('div', { className: 'ab-pickgrid' });
    U.list
      .filter(x => x[0] === cat)
      .forEach(e => {
        const on = (w.upg || []).includes(e[1]),
          why = on ? '' : upgWhy(e, c, wi);
        const b = bEl('button', { type: 'button', className: 'ab-opt' + (on ? ' sel' : '') });
        b.setAttribute('aria-pressed', String(on));
        b.append(
          bEl('span', { className: 'ab-opth' }, [
            bEl('strong', { textContent: (on ? '✓ ' : '') + e[1] }),
            bEl('span', { className: 'ab-pts', textContent: e[2] ? e[2] + ' pts' : 'free' })
          ]),
          bEl('span', { className: 'ab-rules', textContent: e[4] }),
          bEl('span', { className: 'ab-meta', textContent: why || (e[3] === 'any' ? 'Any character' : e[3]) })
        );
        if (why && !on) b.disabled = true;
        b.onclick = () => {
          w.upg = w.upg || [];
          if (on) w.upg = w.upg.filter(n => n !== e[1]);
          else w.upg.push(e[1]);
          if (RIDE[e[1]]) {
            if (on) {
              if (w.joins != null && !joinable(w, w.regs[w.joins] || {}))
                w.joins = w.regs.findIndex(r => joinable(w, r));
              if (w.joins < 0) w.joins = null;
            } else riderFix(w);
          }
          abRe();
        };
        grid.append(b);
      });
    box.append(grid);
  });
  box.append(
    bEl('div', { className: 'ab-pickg' }, [
      bEl('span', { className: 'ab-lab-t', textContent: 'Not in the list' })
    ])
  );
  box.append(abUpgrades((w.custom = w.custom || []), 'w' + wi + 'c', 'Add another upgrade by hand'));
  return box;
}
/* ---------- builder UI ---------- */
function bEl(tag, props, kids) {
  const e = document.createElement(tag);
  Object.assign(e, props || {});
  (kids || []).forEach(k => k != null && e.append(k));
  return e;
}
let abPick = null,
  abUpg = null,
  abArm = null;
function abArmed(k, fn) {
  if (abArm === k) {
    abArm = null;
    fn();
    return;
  }
  abArm = k;
  renderTurnbar();
  setTimeout(() => {
    if (abArm === k) {
      abArm = null;
      renderTurnbar();
    }
  }, 4000);
} // open pickers: {wb:index|'new'}; open upgrade form key
function abBtn(t, fn, cls, label) {
  const b = bEl('button', { type: 'button', className: 'ab-b' + (cls ? ' ' + cls : ''), textContent: t });
  b.onclick = fn;
  if (label) b.setAttribute('aria-label', label);
  b.disabled = aiBusy && !/ab-keep/.test(cls || '');
  return b;
}
function abRe() {
  wlFix();
  bldSave();
  renderTurnbar();
}
/* saved armies (on this device) and clearing the builder */
const ARMKEY = 'conquest-saved-armies';
let abClearArm = false;
function armyList() {
  try {
    return JSON.parse(localStorage.getItem(ARMKEY) || '[]') || [];
  } catch (e) {
    return [];
  }
}
function armySaveAll(L) {
  try {
    localStorage.setItem(ARMKEY, JSON.stringify(L));
    return true;
  } catch (e) {
    toast('This browser would not save it.');
    return false;
  }
}
function armyStore() {
  const box = bEl('div', { className: 'ab-store' });
  const L = armyList();
  const row = bEl('div', { className: 'ab-row' });
  const nm = bEl('input', {
    className: 'tf-in',
    type: 'text',
    placeholder: 'Army name',
    value: bld.name || ''
  });
  nm.id = 'ab-army-name';
  nm.setAttribute('aria-label', 'Army name');
  nm.maxLength = 60;
  nm.oninput = () => {
    bld.name = nm.value;
    bldSave();
  };
  row.append(
    nm,
    abBtn(
      'Save army',
      () => {
        if (!bld.wbs.length) {
          toast('Nothing to save yet.');
          return;
        }
        const n = (nm.value || '').trim() || (bld.fac || 'Army') + ' ' + new Date().toLocaleDateString();
        const A = armyList().filter(a => a.name !== n);
        A.unshift({
          name: n,
          fac: bld.fac,
          at: Date.now(),
          bld: JSON.parse(JSON.stringify(Object.assign({}, bld, { name: n })))
        });
        if (armySaveAll(A)) {
          bld.name = n;
          bldSave();
          toast('Saved “' + n + '” on this device.');
          renderTurnbar();
        }
      },
      'ab-ghost'
    ),
    abBtn(
      abClearArm ? 'Tap again to clear' : 'Clear army',
      () => {
        if (!abClearArm) {
          abClearArm = true;
          renderTurnbar();
          setTimeout(() => {
            abClearArm = false;
            renderTurnbar();
          }, 4000);
          return;
        }
        abClearArm = false;
        bld = { fac: bld.fac, wbs: [], warlord: -1 };
        abPick = null;
        abRe();
      },
      'ab-ghost'
    )
  );
  box.append(row);
  if (L.length) {
    const d = bEl('details', { className: 'stackv' });
    d.append(bEl('summary', { textContent: 'Saved armies (' + L.length + ')' }));
    L.forEach((a, i) => {
      const r = bEl('div', { className: 'ab-row' });
      r.append(
        bEl('span', {
          className: 'ab-note',
          textContent: a.name + ' · ' + (a.fac || '') + ' · ' + new Date(a.at).toLocaleDateString()
        }),
        abBtn(
          'Load',
          () => {
            bld = JSON.parse(JSON.stringify(a.bld));
            abPick = null;
            abRe();
            toast('Loaded “' + a.name + '”.');
          },
          'ab-ghost'
        ),
        abBtn(
          'Delete',
          () => {
            const A = armyList();
            A.splice(i, 1);
            armySaveAll(A);
            renderTurnbar();
          },
          'ab-ghost'
        )
      );
      d.append(r);
    });
    box.append(d);
  }
  return box;
}
function abStepper(val, min, max, onSet, label) {
  const w = bEl('span', { className: 'ab-step' });
  const m = abBtn('−', () => onSet(val - 1), 'ab-sq', 'Fewer ' + label),
    p = abBtn('+', () => onSet(val + 1), 'ab-sq', 'More ' + label);
  m.disabled = val <= min;
  p.disabled = val >= max;
  const n = bEl('span', { className: 'ab-n', textContent: String(val) });
  n.setAttribute('aria-label', label + ': ' + val);
  w.append(m, n, p);
  return w;
}
function abMini(st) {
  const g = bEl('div', { className: 'ab-mini' });
  ['M', 'V', 'C', 'A', 'W', 'R', 'D', 'E'].forEach(k => {
    const v = st[k];
    g.append(
      bEl('span', { className: 'ab-mk', textContent: k }),
      bEl('span', { className: 'ab-mv', textContent: v === '-' || v == null ? '–' : String(v) })
    );
  });
  return g;
}
function abChip(t, cls) {
  return bEl('span', { className: 'ab-chip' + (cls ? ' ' + cls : ''), textContent: t });
}
function abUpgrades(list, key, label) {
  const box = bEl('div', { className: 'ab-upg' });
  (list || []).forEach((x, i) => {
    const c = abChip(x.name + ' · ' + x.pts + ' pts', 'ab-chip-u');
    c.append(
      abBtn(
        '×',
        () => {
          list.splice(i, 1);
          abRe();
        },
        'ab-x',
        'Remove ' + x.name
      )
    );
    box.append(c);
  });
  if (abUpg === key) {
    const nm = bEl('input', { type: 'text', placeholder: label, className: 'ab-in' }),
      pt = bEl('input', {
        type: 'number',
        placeholder: 'pts',
        min: '0',
        step: '5',
        className: 'ab-in ab-in-s'
      });
    nm.setAttribute('aria-label', label);
    pt.setAttribute('aria-label', 'Points');
    const ok = abBtn(
      'Add',
      () => {
        if (!nm.value.trim()) {
          nm.focus();
          return;
        }
        list.push({ name: nm.value.trim(), pts: +pt.value || 0 });
        abUpg = null;
        abRe();
      },
      'ab-pri'
    );
    const no = abBtn(
      'Cancel',
      () => {
        abUpg = null;
        renderTurnbar();
      },
      'ab-ghost'
    );
    nm.onkeydown = e => {
      if (e.key === 'Enter') ok.click();
    };
    pt.onkeydown = e => {
      if (e.key === 'Enter') ok.click();
    };
    box.append(bEl('span', { className: 'ab-upf' }, [nm, pt, ok, no]));
    setTimeout(() => {
      try {
        nm.focus();
      } catch (e) {}
    }, 0);
  } else
    box.append(
      abBtn(
        '+ ' + label,
        () => {
          abUpg = key;
          renderTurnbar();
        },
        'ab-ghost ab-small'
      )
    );
  return box;
}
function abIssues(list, okText) {
  const d = bEl('div', { className: 'ab-iss' + (list.length ? '' : ' ok') });
  if (!list.length) {
    d.append(bEl('span', { textContent: '✓ ' + okText }));
    return d;
  }
  const ul = bEl('ul');
  list.forEach(t => ul.append(bEl('li', { textContent: t })));
  d.append(ul);
  return d;
}
function abRegCard(f, w, wi, r, ri, choices) {
  const c = bldUnit(w.char),
    led = w.joins === ri && c && c.type !== 'Monster';
  const card = bEl('div', { className: 'ab-reg' + (led ? ' led' : '') });
  const key = r.modular ? 'modular' : r.chariots ? 'chariot' : r.unit,
    ch = choices.find(q => q.key === key),
    cat = ch ? (key === labaronKey(w, choices) ? 'main' : ch.cat) : null;
  const u = r.modular ? null : bldUnit(r.unit || (r.chariots || [])[0]);
  const title = r.modular ? 'Modular Regiment' : r.chariots ? 'War Chariots' : r.unit || '';
  const head = bEl('div', { className: 'ab-rh' });
  const tl = bEl('div', { className: 'ab-rt' });
  tl.append(bEl('h5', { textContent: title }));
  tl.append(
    abChip(
      cat === 'res' ? 'Restricted' : cat === 'main' ? 'Mainstay' : 'Not in this warband',
      cat === 'res' ? 'ab-res' : cat === 'main' ? 'ab-main' : 'ab-bad'
    )
  );
  if (led) tl.append(abChip('★ Led by the ' + c.name, 'ab-led'));
  const tr = bEl('div', { className: 'ab-rr' });
  tr.append(bEl('span', { className: 'ab-pts', textContent: rowPts(r) + ' pts' }));
  if (u) tr.append(abBtn('Details', () => enDetail(u, f.name), 'ab-ghost ab-small ab-keep'));
  tr.append(
    abBtn(
      'Remove',
      () => {
        w.regs.splice(ri, 1);
        if (w.joins === ri) w.joins = null;
        else if (w.joins > ri) w.joins--;
        abRe();
      },
      'ab-ghost ab-small ab-danger',
      'Remove ' + title
    )
  );
  head.append(tl, tr);
  card.append(head);
  if (r.modular) {
    const M = r.modular,
      mj = modJson(M);
    card.append(
      bEl('div', {
        className: 'ab-meta',
        textContent: `Medium Brute · ${modTotal(M)} stands · March ${mj.M}″ · Ideal Card ${MODULAR[M.cmd].role}`
      })
    );
    const cmdRow = bEl('div', { className: 'ab-row' });
    const cs = bEl('select', { className: 'ab-sel' });
    cs.setAttribute('aria-label', 'Command Stand type');
    Object.keys(MODULAR).forEach(t =>
      cs.appendChild(bEl('option', { value: t, textContent: t + ' [' + MODULAR[t].role + ']' }))
    );
    cs.value = M.cmd;
    cs.onchange = () => {
      M.cmd = cs.value;
      if (!+M.counts[M.cmd]) M.counts[M.cmd] = 2;
      abRe();
    };
    cmdRow.append(
      bEl('label', { className: 'ab-lab' }, [bEl('span', { textContent: 'Command Stand' }), cs]),
      bEl('span', {
        className: 'ab-note',
        textContent: 'Command rules for the whole regiment: ' + MODULAR[M.cmd].cmd
      })
    );
    card.append(cmdRow);
    const grid = bEl('div', { className: 'ab-mods' });
    Object.keys(MODULAR).forEach(t => {
      const n = +M.counts[t] || 0,
        X = MODULAR[t],
        eu = bldUnit(t);
      const tile = bEl('div', { className: 'ab-mod' + (n ? ' on' : '') + (t === M.cmd ? ' cmd' : '') });
      const th = bEl('div', { className: 'ab-modh' });
      th.append(
        bEl('strong', { textContent: t }),
        eu ? abBtn('Details', () => enDetail(eu, f.name), 'ab-link ab-keep', 'Details for ' + t) : null
      );
      tile.append(th);
      tile.append(
        bEl('div', {
          className: 'ab-meta',
          textContent: X.pts + ' pts per stand' + (t === M.cmd ? ' · Command' : '')
        })
      );
      tile.append(abMini({ M: X.M, V: X.V, C: X.C, A: X.A, W: X.W, R: X.R, D: X.D, E: X.E }));
      tile.append(bEl('div', { className: 'ab-rules', textContent: X.rules.join(', ') }));
      tile.append(
        abStepper(
          n,
          0,
          20,
          v => {
            M.counts[t] = Math.max(0, Math.min(20, v));
            abRe();
          },
          t + ' stands'
        )
      );
      grid.append(tile);
    });
    card.append(grid);
  } else if (r.chariots) {
    card.append(
      bEl('div', {
        className: 'ab-meta',
        textContent: 'One regiment slot holding 1 or 2 chariots; each chariot fights as its own regiment.'
      })
    );
    const row = bEl('div', { className: 'ab-row' });
    [0, 1].forEach(k => {
      const s2 = bEl('select', { className: 'ab-sel' });
      s2.setAttribute('aria-label', 'Chariot ' + (k + 1));
      if (k === 1) s2.appendChild(bEl('option', { value: '', textContent: 'No second chariot' }));
      (ch ? ch.chariots : []).forEach(n =>
        s2.appendChild(bEl('option', { value: n, textContent: n + ' · ' + (bldUnit(n) || {}).pts + ' pts' }))
      );
      s2.value = r.chariots[k] || '';
      s2.onchange = () => {
        r.chariots[k] = s2.value;
        abRe();
      };
      row.append(
        bEl('label', { className: 'ab-lab' }, [bEl('span', { textContent: 'Chariot ' + (k + 1) }), s2])
      );
    });
    card.append(row);
    r.chariots.filter(Boolean).forEach(n => {
      const cu = bldUnit(n);
      if (cu) {
        const l = bEl('div', { className: 'ab-row' });
        l.append(
          bEl('span', { className: 'ab-note', textContent: n }),
          abMini(cu.stats),
          abBtn('Details', () => enDetail(cu, f.name), 'ab-link ab-keep')
        );
        card.append(l);
      }
    });
  } else if (u) {
    const b = bldBase(u);
    card.append(
      bEl('div', {
        className: 'ab-meta',
        textContent: [
          [u.cls, u.type].filter(Boolean).join(' '),
          u.type !== 'Monster' && u.kind === 'reg' ? cmdText(u) : ''
        ]
          .filter(Boolean)
          .join(' · ')
      })
    );
    card.append(abMini(u.stats));
    if (u.rules.length) card.append(bEl('div', { className: 'ab-rules', textContent: u.rules.join(', ') }));
    const row = bEl('div', { className: 'ab-row' });
    if (u.kind !== 'char' && !/^1 stand/.test(u.stands)) {
      row.append(
        bEl('span', { className: 'ab-lab ab-inl' }, [
          bEl('span', { textContent: 'Stands' }),
          abStepper(
            r.stands || b,
            b,
            12,
            v => {
              r.stands = Math.max(b, Math.min(12, v));
              abRe();
            },
            'stands'
          ),
          bEl('span', {
            className: 'ab-note',
            textContent: u.extra ? '+' + u.extra + ' pts each above ' + b : ''
          })
        ])
      );
    }
    if (row.children.length) card.append(row);
    const O = regOptions(u);
    if (O.opts.length) {
      const offN = (r.opts || []).filter(n => (O.opts.find(o => o.name === n) || {}).kind === 'off').length,
        hasAux = (r.opts || []).some(n => (O.opts.find(z => z.name === n) || {}).kind === 'aux');
      const og = bEl('div', { className: 'ab-opts' });
      og.append(
        bEl('span', {
          className: 'ab-lab-t',
          textContent:
            'Options' +
            (O.max != null ? ' (Officers: up to ' + O.max + ', each once; an Auxiliary does not count)' : '')
        })
      );
      const oi = infoLine(
        (r.opts || []).length
          ? (r.opts || [])
              .map(n => optInfo(O.opts.find(o => o.name === n)))
              .filter(Boolean)
              .join('\n')
          : null
      );
      O.opts.forEach(o => {
        const on = (r.opts || []).includes(o.name);
        const t = abBtn(
          (on ? '✓ ' : '') + o.name + (o.detail ? ' (' + o.detail + ')' : '') + ' +' + o.cost,
          () => {
            r.opts = r.opts || [];
            if (on) r.opts = r.opts.filter(n => n !== o.name);
            else r.opts.push(o.name);
            abRe();
          },
          'ab-tog' + (on ? ' on' : '')
        );
        t.setAttribute('aria-pressed', String(on));
        if (!on && ((o.kind === 'off' && O.max != null && offN >= O.max) || (o.kind === 'aux' && hasAux)))
          t.disabled = true;
        hookInfo(t, optInfo(o), oi);
        og.append(t);
      });
      og.append(oi);
      card.append(og);
    }
  }
  card.append(abUpgrades((r.custom = r.custom || []), 'w' + wi + 'r' + ri, 'Add upgrade'));
  return card;
}
function abPicker(f, w, wi, choices) {
  const R = wbRules(bldUnit(w.char), w),
    box = bEl('div', { className: 'ab-pick' });
  box.append(
    bEl('div', { className: 'ab-pickh' }, [
      bEl('strong', { textContent: 'Choose a regiment for this warband' }),
      abBtn(
        'Cancel',
        () => {
          abPick = null;
          renderTurnbar();
        },
        'ab-ghost ab-small'
      )
    ])
  );
  const nRes = w.regs.filter(r => {
    const k = r.modular ? 'modular' : r.chariots ? 'chariot' : r.unit;
    const x = choices.find(q => q.key === k);
    return x && x.cat === 'res';
  }).length;
  [
    ['main', 'Mainstay', 'Any number, up to the warband limit'],
    ['res', 'Restricted', 'At most 2, and each needs a Mainstay']
  ].forEach(([cat, lab, hint]) => {
    const list = choices.filter(x => x.cat === cat);
    if (!list.length) return;
    box.append(
      bEl('div', { className: 'ab-pickg' }, [
        bEl('span', { className: 'ab-lab-t', textContent: lab }),
        bEl('span', { className: 'ab-note', textContent: hint })
      ])
    );
    const grid = bEl('div', { className: 'ab-pickgrid' });
    list.forEach(x => {
      const u0 = x.unit ? bldUnit(x.unit) : null;
      const b = bEl('button', { type: 'button', className: 'ab-opt' });
      b.append(
        bEl('strong', {
          textContent: x.modular ? 'Modular Regiment' : x.chariots ? 'War Chariots' : x.label
        }),
        bEl('span', {
          className: 'ab-meta',
          textContent: x.modular
            ? 'Mix Ayakashi, Bushi and Origami stands'
            : x.chariots
              ? '1 or 2 chariots, one slot'
              : [[u0.cls, u0.type].filter(Boolean).join(' '), u0.pts + ' pts'].join(' · ')
        })
      );
      if (cat === 'res' && nRes >= 2) {
        b.disabled = true;
        b.title = 'Already 2 Restricted choices';
      }
      b.onclick = () => {
        if (x.modular)
          w.regs.push({ modular: { cmd: 'Oni Ayakashi', counts: { 'Oni Ayakashi': 2 } }, custom: [] });
        else if (x.chariots) w.regs.push({ chariots: [x.chariots[0], ''] });
        else {
          const u = bldUnit(x.unit);
          w.regs.push({ unit: x.unit, stands: bldBase(u), opts: [], custom: [] });
        }
        if (w.joins == null && joinable(w, w.regs[w.regs.length - 1])) w.joins = w.regs.length - 1;
        abPick = null;
        abRe();
      };
      grid.append(b);
    });
    box.append(grid);
  });
  return box;
}
function abCharPicker(f, chars, onPick, title) {
  const box = bEl('div', { className: 'ab-pick' });
  box.append(
    bEl('div', { className: 'ab-pickh' }, [
      bEl('strong', { textContent: title }),
      abBtn(
        'Cancel',
        () => {
          abPick = null;
          renderTurnbar();
        },
        'ab-ghost ab-small'
      )
    ])
  );
  const grid = bEl('div', { className: 'ab-pickgrid' });
  chars.forEach(x => {
    const b = bEl('button', { type: 'button', className: 'ab-opt' });
    b.append(
      bEl('strong', { textContent: x.name }),
      bEl('span', {
        className: 'ab-meta',
        textContent: [[x.cls, x.type].filter(Boolean).join(' '), x.pts + ' pts'].join(' · ')
      }),
      bEl('span', { className: 'ab-rules', textContent: x.rules.slice(0, 4).join(', ') })
    );
    b.onclick = () => onPick(x);
    grid.append(b);
  });
  box.append(grid);
  return box;
}
function armyBuilder(add, mk, onUse, useLabel) {
  wlFix();
  bldSave();
  const box = bEl('div', { className: 'rev ab' });
  const f0 = bldFac();
  // header: faction and summary
  const top = bEl('div', { className: 'ab-top' });
  const fs = bEl('select', { className: 'ab-sel ab-fac' });
  fs.setAttribute('aria-label', 'Faction');
  fs.appendChild(bEl('option', { value: '', textContent: 'Choose a faction…' }));
  ENCY.forEach(f => fs.appendChild(bEl('option', { value: f.name, textContent: f.name })));
  fs.value = bld.fac;
  fs.onchange = () => {
    bld = { fac: fs.value, wbs: [], warlord: 0 };
    abPick = bld.fac ? { wb: 'new' } : null;
    abRe();
  };
  if (bld.wbs.length) fs.title = 'Changing faction clears this army';
  top.append(
    bEl('div', { className: 'ab-title' }, [
      bEl('h3', { textContent: 'Army builder' }),
      bEl('label', { className: 'ab-lab' }, [bEl('span', { textContent: 'Faction' }), fs])
    ])
  );
  /* Spires: the army is dedicated to one Sect when the list is made */
  if (bld.fac === 'Spires') {
    const ss = bEl('select', { className: 'ab-sel ab-sect' });
    ss.setAttribute('aria-label', 'Sect');
    ss.appendChild(bEl('option', { value: '', textContent: 'Choose a Sect…' }));
    SECTS.forEach(n => ss.appendChild(bEl('option', { value: n, textContent: n })));
    ss.value = bld.sect || '';
    ss.onchange = () => {
      bld.sect = ss.value || undefined;
      abRe();
    };
    const SD = {
      Underspire:
        'Violent Delirium: Drone regiments can Heal while Broken and gain Indomitable equal to their Resolve bonus from Stands; Drone and Clone regiments gain Regeneration (+2). Abomination (Just Desserts): Regeneration (2).',
      Directorate:
        'Lobotomytic Override: once per round, on drawing a Command Card, set it aside face down and activate the next card first, then put the first on the top or bottom of the Command Stack. Abomination (Just Desserts): +2 March.',
      'Sovereign Lineage':
        'Magnanimity: Husk regiments gain Inspired and Aimed Shot while they Clash or Volley an enemy below starting strength. Abomination (Just Desserts): Hardened (1).'
    };
    top.lastChild.append(
      bEl('label', { className: 'ab-lab' }, [bEl('span', { textContent: 'Sect' }), ss]),
      bEl('p', {
        className: 'ab-sect-d',
        textContent: bld.sect
          ? SD[bld.sect]
          : 'Every Spires army is dedicated to one Sect; it gives the army its Sect ability.'
      })
    );
  }
  if (f0) {
    const probs = bldProblems(),
      nReg = bld.wbs.reduce((a, w) => a + w.regs.length, 0);
    const sum = bEl('div', { className: 'ab-sum' });
    sum.append(
      bEl('div', { className: 'ab-total' }, [
        bEl('strong', { textContent: String(bldTotal()) }),
        bEl('span', { textContent: ' pts' })
      ]),
      bEl('div', {
        className: 'ab-meta',
        textContent: `${bld.wbs.length} warband${bld.wbs.length === 1 ? '' : 's'} · ${nReg} regiment${nReg === 1 ? '' : 's'}`
      }),
      abChip(
        probs.length ? probs.length + ' issue' + (probs.length === 1 ? '' : 's') : '✓ Legal army',
        probs.length ? 'ab-bad' : 'ab-ok'
      )
    );
    top.append(sum);
  }
  box.append(top);
  {
    const AL = armyList();
    if (AL.length) {
      const r = bEl('div', { className: 'ab-row ab-load' });
      const sel = bEl('select', { className: 'ab-sel' });
      sel.setAttribute('aria-label', 'Saved army');
      AL.forEach((a, i) =>
        sel.appendChild(
          bEl('option', {
            value: String(i),
            textContent:
              a.name +
              ' · ' +
              (a.fac || '') +
              (a.bld && a.bld.wbs
                ? ' · ' + a.bld.wbs.length + ' warband' + (a.bld.wbs.length === 1 ? '' : 's')
                : '')
          })
        )
      );
      r.append(
        bEl('span', { className: 'ab-note', textContent: 'Load a saved army' }),
        sel,
        abBtn(
          'Load',
          () => {
            const a = armyList()[+sel.value];
            if (!a) return;
            bld = JSON.parse(JSON.stringify(a.bld));
            abPick = null;
            abRe();
            toast('Loaded “' + a.name + '”.');
          },
          'ab-ghost'
        )
      );
      box.append(r);
    }
  }
  const f = f0;
  if (!f) {
    box.append(
      bEl('p', {
        className: 'ab-intro',
        textContent:
          'Pick a faction to start. Every character leads a warband of up to 4 regiments: any number of Mainstay choices, at most 2 Restricted, and at least as many Mainstay as Restricted. The character joins one regiment of its own type.'
      })
    );
    add(box);
    return;
  }
  const chars = f.units.filter(u => u.kind === 'char' && u.pts != null);
  let mig = false;
  bld.wbs.forEach(w => {
    const c = bldUnit(w.char);
    if (!c || !wbChoices(c, w).some(q => q.modular)) return;
    w.regs = w.regs.map(r => {
      if (r.unit && MODULAR[r.unit]) {
        mig = true;
        return {
          modular: { cmd: r.unit, counts: { [r.unit]: Math.max(2, +r.stands || 2) } },
          custom: r.custom || []
        };
      }
      return r;
    });
  });
  if (mig) bldSave();
  bld.wbs.forEach((w, wi) => {
    const c = bldUnit(w.char);
    const card = bEl('section', { className: 'ab-wb' });
    card.setAttribute('aria-label', 'Warband ' + (wi + 1));
    if (!c) return;
    const R = wbRules(c, w),
      choices = wbChoices(c, w),
      isWL = bld.warlord === wi;
    const head = bEl('div', { className: 'ab-wbh' });
    const hl = bEl('div', { className: 'ab-wbt' });
    hl.append(
      bEl('span', { className: 'ab-kick', textContent: 'Warband ' + (wi + 1) }),
      bEl('h4', { textContent: c.name }),
      bEl('div', {
        className: 'ab-meta',
        textContent: [[c.cls, c.type].filter(Boolean).join(' ') + ' character', c.pts + ' pts'].join(' · ')
      })
    );
    const WR = wlRule(c),
      mustOther =
        !WR.must &&
        bld.wbs.some(x => {
          const y = bldUnit(x.char);
          return y && wlRule(y).must;
        });
    const wlb = abBtn(
      WR.no ? 'Can\u2019t be Warlord' : isWL ? '★ Warlord' : '☆ Make Warlord',
      () => {
        if (WR.no || mustOther) return;
        bld.warlord = wi;
        if (bld.ally === wi) bld.ally = null;
        abRe();
      },
      'ab-tog' + (isWL ? ' on' : '') + (WR.no ? ' ab-off' : '')
    );
    wlb.setAttribute('aria-pressed', String(isWL));
    if (WR.no || mustOther || WR.must) {
      wlb.disabled = true;
      wlb.title = WR.no
        ? WR.why
        : WR.must
          ? WR.why
          : 'Your ' + bldUnit(bld.wbs[bld.warlord].char).name + ' must be the Warlord.';
    }
    hl.append(wlb);
    /* Hundred Kingdoms: Dynastic Ally */
    if (bld.fac === 'Hundred Kingdoms' && !isWL) {
      const why = allyWhy(wi),
        isAl = allyIdx() === wi;
      const ab = abBtn(
        isAl ? '♛ Dynastic Ally' : '♔ Make Dynastic Ally',
        () => {
          if (why && !isAl) return;
          bld.ally = isAl ? null : wi;
          abRe();
        },
        'ab-tog' + (isAl ? ' on' : '') + (why && !isAl ? ' ab-off' : '')
      );
      ab.setAttribute('aria-pressed', String(isAl));
      ab.title = isAl
        ? 'Uses its Supremacy Ability as if it were the Warlord (one Activated Supremacy per phase). Click to remove.'
        : why || 'A second character that uses its own Supremacy Ability as if it were the Warlord';
      if (why && !isAl) ab.disabled = true;
      hl.append(ab);
    }
    /* Hundred Kingdoms: the Priory Commander's Order */
    if (prioryOf(c)) {
      const sel = bEl('select', { className: 'tf-in' });
      sel.setAttribute('aria-label', 'Order');
      sel.append(bEl('option', { value: '', textContent: 'choose…' }));
      PRIORY.forEach(k =>
        sel.append(bEl('option', { value: k, textContent: 'Order of the ' + k, selected: w.order === k }))
      );
      sel.onchange = () => {
        w.order = sel.value || null;
        abRe();
      };
      const lab = bEl('label', { className: 'ab-wlnote', textContent: 'Order: ' });
      lab.title =
        'Crimson Tower: Brutal Impact (2) and Terrifying (1), Order of the Crimson Tower as Mainstay, Supremacy Tactical Superiority. Sealed Temple: +1 Attacks and Impact +1, Order of the Sealed Temple, Martyrs and Penitents of St Lazarus as Mainstay, Supremacy Relentless Protectors.';
      lab.append(sel);
      hl.append(lab);
    }
    /* Weaver Courts: the Taosidhe's or Seanchas Sidhe's Court */
    if (wcCourtChoices(c)) {
      const sel = bEl('select', { className: 'tf-in' });
      sel.setAttribute('aria-label', 'Seasonal Court');
      sel.append(bEl('option', { value: '', textContent: 'choose…' }));
      wcCourtChoices(c).forEach(k =>
        sel.append(bEl('option', { value: k, textContent: 'Court of ' + k, selected: w.court === k }))
      );
      sel.onchange = () => {
        w.court = sel.value || null;
        abRe();
      };
      const lab = bEl('label', { className: 'ab-wlnote', textContent: 'Court: ' });
      lab.title =
        bld.fac === 'Sorcerer Kings'
          ? 'Sorcerous Patronage: the character gains its Court’s role, spells and Rituals; non-Monster Elementals of its Court become Mainstay, and the Mortals of its warband join its Court.'
          : c.name === 'Seanchas Sidhe'
            ? 'The Seanchas Sidhe belongs to the Court of Summer or of Winter and knows all of that Court’s spells. As Warlord, the army’s regiments follow its Court.'
            : 'The Taosidhe belongs to one Seasonal Court. As Warlord, the army’s regiments follow its Court.';
      lab.append(sel);
      hl.append(lab);
    }
    /* W'adrhŭn: the character's Cult */
    if (bld.fac === "W'adrhŭn") {
      const fixed = wadFixedCult(c);
      if (fixed) hl.append(bEl('div', { className: 'ab-wlnote', textContent: 'Cult of ' + fixed }));
      else {
        const sel = bEl('select', { className: 'tf-in' });
        sel.setAttribute('aria-label', 'Cult');
        sel.append(bEl('option', { value: '', textContent: 'choose…' }));
        WAD_CULTS.filter(k => k !== 'Conquest' || isWL || w.cult === 'Conquest').forEach(k =>
          sel.append(bEl('option', { value: k, textContent: 'Cult of ' + k, selected: w.cult === k }))
        );
        sel.onchange = () => {
          w.cult = sel.value || null;
          abRe();
        };
        const lab = bEl('label', { className: 'ab-wlnote', textContent: 'Follows: ' });
        lab.title =
          'Every W’adrhŭn character follows a Cult: its warband adds that Cult’s Chant Markers, it may take up to two Chosen of that Cult as a Restricted choice, and it and its regiment gain the Cult’s Battlefield Role. Only the Warlord may follow Conquest.';
        lab.append(sel);
        hl.append(lab);
      }
    }
    {
      const PB = (c.rules || []).some(r => /^Personal Bodyguard/.test(r))
        ? 'Personal Bodyguard'
        : (c.rules || []).some(r => /^Personal Entourage/.test(r))
          ? 'Personal Entourage'
          : '';
      if (PB) {
        const opts = w.regs
          .map((r, ri) => ({ r, ri }))
          .filter(
            ({ r }) =>
              r.unit &&
              (PB === 'Personal Bodyguard'
                ? /Infantry/.test((bldUnit(r.unit) || {}).type || '')
                : /Household Knights/.test(r.unit))
          );
        const sel = bEl('select', { className: 'tf-in' });
        sel.setAttribute('aria-label', PB);
        sel.append(bEl('option', { value: '', textContent: 'none' }));
        opts.forEach(({ r, ri }) =>
          sel.append(
            bEl('option', {
              value: String(ri),
              textContent: r.unit + ' (regiment ' + (ri + 1) + ')',
              selected: w.pbReg === ri
            })
          )
        );
        sel.onchange = () => {
          w.pbReg = sel.value === '' ? null : +sel.value;
          abRe();
        };
        const lab = bEl('label', { className: 'ab-wlnote', textContent: PB + ' (gains [Veteran]): ' });
        lab.append(sel);
        hl.append(lab);
      }
    }
    if (WR.must)
      hl.append(bEl('div', { className: 'ab-wlnote', textContent: 'Must be the Warlord · one per army' }));
    else if (WR.creeds)
      hl.append(
        bEl('div', {
          className: 'ab-wlnote',
          textContent: 'Warlord only in ' + WR.creeds.join(' or ') + ' Creed armies'
        })
      );
    const hr = bEl('div', { className: 'ab-rr' });
    hr.append(
      bEl('span', { className: 'ab-pts ab-pts-l', textContent: wbPts(w) + ' pts' }),
      abBtn('Details', () => enDetail(c, f.name), 'ab-ghost ab-small ab-keep'),
      abBtn(
        'Change character',
        () => {
          abPick = { wb: wi, chr: true };
          renderTurnbar();
        },
        'ab-ghost ab-small'
      ),
      abBtn(
        abArm === 'wb' + wi ? 'Click again to remove' : 'Remove',
        () =>
          abArmed('wb' + wi, () => {
            bld.wbs.splice(wi, 1);
            if (bld.warlord > wi) bld.warlord--;
            else if (bld.warlord === wi) bld.warlord = -1;
            if (bld.ally != null) bld.ally = bld.ally > wi ? bld.ally - 1 : bld.ally === wi ? null : bld.ally;
            abRe();
          }),
        'ab-ghost ab-small ab-danger',
        'Remove warband ' + (wi + 1)
      )
    );
    head.append(hl, hr);
    card.append(head);
    if (abPick && abPick.wb === wi && abPick.chr) {
      card.append(
        abCharPicker(
          f,
          chars,
          x => {
            if (x.name !== w.char) {
              w.char = x.name;
              w.regs = [];
              w.joins = null;
              w.custom = [];
            }
            abPick = null;
            abRe();
          },
          'Choose a different character (this clears the warband)'
        )
      );
    }
    const info = bEl('div', { className: 'ab-row ab-lead' });
    if (c.type !== 'Monster' && !R.none) {
      const js = bEl('select', { className: 'ab-sel' });
      js.setAttribute('aria-label', 'Regiment the ' + c.name + ' joins');
      js.appendChild(
        bEl('option', {
          value: '',
          textContent: w.regs.some(r => joinable(w, r))
            ? 'Choose a regiment…'
            : 'Add a ' + c.type + ' regiment first'
        })
      );
      w.regs.forEach((r, ri) => {
        if (joinable(w, r))
          js.appendChild(
            bEl('option', {
              value: String(ri),
              textContent:
                (r.unit || (r.modular ? 'Modular Regiment (' + r.modular.cmd + ')' : '')) +
                ' (regiment ' +
                (ri + 1) +
                ')'
            })
          );
      });
      js.value = w.joins != null ? String(w.joins) : '';
      js.onchange = () => {
        w.joins = js.value === '' ? null : +js.value;
        abRe();
      };
      info.append(
        bEl('label', { className: 'ab-lab ab-inl' }, [
          bEl('span', { textContent: '★ The ' + c.name + ' leads' }),
          js
        ])
      );
    } else
      info.append(
        bEl('span', {
          className: 'ab-note',
          textContent:
            c.type === 'Monster'
              ? 'The ' + c.name + ' fights as its own regiment.'
              : 'No warband: ' + c.warband
        })
      );
    card.append(info);
    const cu = bEl('div', { className: 'ab-row' });
    cu.append(bEl('span', { className: 'ab-lab-t', textContent: 'Character upgrades' }));
    (w.upg || []).forEach(n => {
      const e = upgFind(n);
      const chp = abChip(n + (e ? ' · ' + e[2] + ' pts' : ''), 'ab-chip-u ab-led');
      if (e) chp.title = e[4];
      chp.append(
        abBtn(
          '×',
          () => {
            w.upg = w.upg.filter(x => x !== n);
            abRe();
          },
          'ab-x',
          'Remove ' + n
        )
      );
      cu.append(chp);
    });
    (w.custom || []).forEach((x, i) => {
      const chp = abChip(x.name + ' · ' + x.pts + ' pts', 'ab-chip-u');
      chp.append(
        abBtn(
          '×',
          () => {
            w.custom.splice(i, 1);
            abRe();
          },
          'ab-x',
          'Remove ' + x.name
        )
      );
      cu.append(chp);
    });
    if (charNoUpg(c))
      cu.append(
        bEl('span', { className: 'ab-note', textContent: 'The ' + c.name + ' cannot take upgrades.' })
      );
    else if (!(abPick && abPick.wb === wi && abPick.upg))
      cu.append(
        abBtn(
          (w.upg || []).length || (w.custom || []).length ? 'Change upgrades' : '+ Choose upgrades',
          () => {
            abPick = { wb: wi, upg: true };
            renderTurnbar();
          },
          'ab-ghost ab-small'
        )
      );
    card.append(cu);
    if (abPick && abPick.wb === wi && abPick.upg) card.append(abUpgPicker(f, w, wi));
    const regs = bEl('div', { className: 'ab-regs' });
    w.regs.forEach((r, ri) => regs.append(abRegCard(f, w, wi, r, ri, choices)));
    card.append(regs);
    const full = w.regs.length >= R.allow || R.none;
    if (abPick && abPick.wb === wi && !abPick.chr && !abPick.upg && !full)
      card.append(abPicker(f, w, wi, choices));
    else {
      const row = bEl('div', { className: 'ab-row' });
      const b = abBtn(
        full ? (R.none ? 'No warband' : 'Warband full') : '+ Add regiment',
        () => {
          abPick = { wb: wi };
          renderTurnbar();
        },
        'ab-ghost'
      );
      b.disabled = full;
      row.append(
        b,
        bEl('span', { className: 'ab-note', textContent: `${w.regs.length} of ${R.allow} regiments` })
      );
      card.append(row);
    }
    card.append(abIssues(wbProblems(w).concat(upgProblems(w, wi)), 'This warband is legal'));
    box.append(card);
  });
  if (abPick && abPick.wb === 'new')
    box.append(
      abCharPicker(
        f,
        chars,
        x => {
          bld.wbs.push({ char: x.name, regs: [], joins: null, custom: [] });
          if (bld.wbs.length === 1) bld.warlord = -1;
          abPick = { wb: bld.wbs.length - 1 };
          abRe();
        },
        'Choose a character to lead a new warband'
      )
    );
  else
    box.append(
      bEl('div', { className: 'ab-row' }, [
        abBtn(
          '+ Add a warband',
          () => {
            abPick = { wb: 'new' };
            renderTurnbar();
          },
          'ab-ghost ab-wide'
        )
      ])
    );
  const probs = bldProblems();
  const foot = bEl('div', { className: 'ab-foot' });
  if (probs.length)
    foot.append(
      abIssues(probs.slice(0, 6).concat(probs.length > 6 ? ['…and ' + (probs.length - 6) + ' more'] : []), '')
    );
  if (bld.wbs.length) {
    const sandbox = state && state.mode === 'test';
    const ub = mk(probs.length && sandbox ? useLabel + ' anyway' : useLabel, () => {
      if (probs.length && !sandbox) {
        toast('Fix the problems above first: an illegal army cannot be fielded.');
        return;
      }
      const L = bldToList();
      if (!L || !L.units.length) {
        toast('Add at least one regiment.');
        return;
      }
      onUse(L);
    });
    if (probs.length && !sandbox) {
      ub.disabled = true;
      ub.title = 'An illegal army cannot be fielded. Fix the problems above.';
    }
    foot.append(ub);
  }
  foot.append(armyStore());
  foot.append(
    bEl('p', {
      className: 'ab-note',
      textContent:
        'Officer and upgrade effects beyond stat changes are listed on the regiment for you to apply. Spellcasters know their spells automatically; casters that choose a school or court pick it when casting.'
    })
  );
  box.append(foot);
  add(box);
}
function armyModePicker(add) {
  const g = document.createElement('div');
  g.className = 'grp';
  g.setAttribute('role', 'group');
  g.setAttribute('aria-label', 'How to enter your army');
  [
    ['build', 'Build it here'],
    ['paste', 'Paste a list (Claude reads it)']
  ].forEach(([m, t]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t;
    b.setAttribute('aria-pressed', String(armyMode === m));
    b.onclick = () => {
      armyMode = m;
      renderTurnbar();
    };
    g.appendChild(b);
  });
  add(g);
}
function modePicker(add) {
  const g = document.createElement('div');
  g.className = 'grp';
  g.setAttribute('role', 'group');
  g.setAttribute('aria-label', 'Opponent');
  [
    ['ai', 'Play against Claude'],
    ['pvp', 'Play against a friend'],
    ['test', 'Test field']
  ].forEach(([m, t]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t;
    b.setAttribute('aria-pressed', String((state.mode || 'ai') === m));
    b.onclick = () => {
      if (m === 'test') {
        tfEnter();
        return;
      }
      if ((state.mode || 'ai') !== m) putState({ mode: m });
    };
    g.appendChild(b);
  });
  add(g);
}
const SEATNAME = {
  get cs() {
    return 'South edge (' + colName('cs') + ')';
  },
  get nord() {
    return 'North edge (' + colName('nord') + ')';
  }
};
