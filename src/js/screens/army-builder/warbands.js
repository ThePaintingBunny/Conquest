/*
 * Army builder: warbands
 *
 * What a character's warband may contain, regiment options, and which regiment the character joins.
 *
 * In this file: WAD_CULTS, wadFixedCult(), wadWbCult(), PRIORY, prioryOf(), wcCourtChoices(),
 *   wbRules(), wbResolve(), wbChoices(), OFFICER_LIMIT, regOptions(), joinable(), labaronOn(),
 *   labaronIdx()
 */

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
   sets its warband, its profile (Crimson Tower: Brutal Impact (2), Terrifying (1); Sealed Temple: +1 Attacks, Impact (+1))
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
/* Sanctified Labaron (Old Dominion): the player picks one regiment of the warband taken as a Restricted choice; that one
   regiment counts as Mainstay (army building only) */
function labaronOn(w) {
  return (w.upg || []).includes('Sanctified Labaron');
}

function labaronIdx(w) {
  return labaronOn(w) ? w.regs.findIndex(r => r.labaron) : -1;
}
