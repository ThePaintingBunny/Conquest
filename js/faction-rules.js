/* Faction rules: roles, trackers, tokens and per-activation options. */
/* ---------- faction rules: roles, trackers, per-activation options ---------- */
const frN = s =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
const FROLES = (() => {
  const R = {
    Nords: {
      Blooded: 'Character,Half-Bloods',
      Jarl: 'Character,Mortals',
      Konungyr: 'Character,Exalted',
      Shaman: 'Character,Mortals',
      Volva: 'Character,Mortals',
      'Vargyr Lord': 'Character,Half-Bloods',
      'Jotnar Seidr': 'Character,Jotun',
      Raiders: 'Mortals',
      'Bow Chosen': 'Exalted',
      Stalkers: 'Half-Bloods',
      Werewargs: 'Half-Bloods',
      Huskarls: 'Mortals',
      Ulfhednar: 'Mortals',
      Trolls: 'Half-Bloods',
      Valkyries: 'Mortals',
      'Fenr Beastpack': 'Half-Bloods',
      Ugr: 'Half-Bloods',
      Bearsarks: 'Mortals',
      'Steel Chosen': 'Exalted',
      'Goltr Beastpack': 'Half-Bloods',
      'Sea Jotnar': 'Jotun',
      'Mountain Jotnar': 'Jotun',
      'Ice Jotnar': 'Jotun'
    },
    'Old Dominion': {
      Xhiliarch: 'Character,The Legion',
      Strategos: 'Character,The Legion',
      'Mounted Strategos': 'Character,The Legion',
      Hierodeacon: 'Character,The Fallen Pantheon',
      Archimandrite: 'Character,The Creed',
      'Fallen Divinity': 'Character,The Fallen Pantheon',
      Theokrator: 'Character,The Creed',
      Cultists: 'The Creed',
      Hashashin: 'The Creed',
      Kheres: 'The Creed',
      Moroi: 'The Creed',
      Legionnaires: 'The Legion',
      'Praetorian Guard': 'The Legion',
      Athanatoi: 'The Legion',
      'Varangian Guard': 'The Legion',
      Karyatids: 'The Fallen Pantheon',
      Kanephors: 'The Fallen Pantheon',
      'Fallen Angels': 'The Creed,The Legion',
      'Tainted Heralds': 'The Fallen Pantheon',
      Buccephaloi: 'The Fallen Pantheon',
      'Centaur Prodromoi': 'The Fallen Pantheon,The Legion',
      'Bone Golems': 'The Creed',
      'Centaur Kerykes': 'The Fallen Pantheon,The Legion',
      Kataphraktoi: 'The Legion',
      'Unhallowed Sepulcher': 'The Creed'
    },
    "W'adrhŭn": {
      'Matriarch Queen': 'The Tribes',
      Chieftain: 'The Tribes',
      'Thunder Chieftain': 'The Speakers',
      Predator: 'The Speakers',
      'Mounted Predator': 'The Speakers',
      'Winglord Predator': 'The Speakers',
      'Scion of Conquest': 'Scion,The Cults,Cult of Conquest',
      'Scion of War': 'Scion,The Cults,Cult of War',
      'Scion of Death': 'Scion,The Cults,Cult of Death',
      Braves: 'The Tribes',
      Blooded: 'The Tribes',
      Hunters: 'The Speakers',
      Veterans: 'The Tribes',
      'Chosen of Conquest': 'The Cults,Cult of Conquest',
      Slingers: 'The Tribes',
      'Chosen of Death': 'The Cults,Cult of Death',
      'Chosen of Famine': 'The Cults,Cult of Famine',
      'Hunting Pack': 'The Speakers',
      Warbred: 'The Tribes',
      'Raptor Riders': 'The Speakers',
      'Thunder Riders': 'The Speakers',
      'Chosen of War': 'The Cults,Cult of War',
      'Apex Predator': 'The Speakers',
      Tontorr: 'The Speakers',
      Quatl: 'The Speakers',
      'Drum Beast': 'The Cults'
    },
    Yoroni: {
      Daimyo: 'Ka,Chi,Sui,Fu',
      Oyabun: 'Chi',
      'Kitsune Bakasu': 'Fu',
      'Kitsune Onmyoji': 'Sui',
      'Jorogumo Mahotsu': 'Mu',
      'Jorogumo Geisha': 'Mu',
      'Oni Ayakashi': 'Ka',
      'Kami Ayakashi': 'Chi',
      'Tengu Bushi': 'Fu',
      'Tengu Ayakashi': 'Fu',
      'Kappa Bushi': 'Sui',
      'Origami Warriors': 'Mu',
      'Domaru-damashi': 'Mu',
      Shikigami: 'Mu',
      'Dai Yokai': 'Ka,Chi,Fu,Sui,Mu',
      'Genya no Yokai': 'Ka,Chi,Fu,Sui,Mu',
      'Oni Kishin Raiu': 'Ka',
      'Oni Kishin Kiba': 'Ka'
    },
    'Sorcerer Kings': {
      'Mahabharati Sardar': 'Mahabharati',
      'Mahabharati Initiates': 'Mortals,Mahabharati',
      'Mahabharati Sorcerer Saints': 'Elemental,Mahabharati',
      'Dhanur Disciples': 'Mortals',
      Rajakur: 'Mortals',
      Ghols: 'Elemental',
      'Efreet Flamecasters': 'Elemental',
      'Efreet Sword Dancers': 'Elemental',
      'Rakshasa Bakasura': 'Elemental',
      'Rakshasa Ravanar': 'Elemental',
      'Steelheart Djinn': 'Elemental',
      'Windborne Djinn': 'Elemental',
      'Trinavarta Sabhagrih': 'Elemental',
      'Trinavarta Chandavat': 'Elemental',
      'Eternal Ikons': 'Elemental',
      'Eternal Destroyers': 'Elemental',
      Mahut: 'Elemental',
      'Marid Lancers': 'Elemental',
      'Marid Sahar': 'Elemental',
      'Marid Apsara': 'Elemental',
      'Marid Shaytan': 'Elemental'
    },
    'Weaver Courts': {
      'Mhor Sidhe': 'Court of Autumn',
      'Rhun Sidhe': 'Court of Spring',
      Morrowen: 'Court of Spring',
      'Scathach Hunters': 'Court of Autumn',
      'Gemred Knights': 'Court of Winter',
      'Scaile Dancers': 'Court of Summer'
    },
    'Hundred Kingdoms': {
      'Gilded Legion': 'Veteran,Imperial',
      'Steel Legion': 'Veteran,Imperial',
      'Hunter Cadre': 'Veteran,Imperial',
      Sicarii: 'Veteran,Theist',
      'Order of the Sword': 'The Orders,Veteran',
      'Penitents of St Lazarus': 'The Orders,Veteran',
      'Martyrs of St Lazarus': 'The Orders,Veteran',
      'Order of the Ashen Dawn': 'The Orders,Veteran',
      'Order of the Crimson Tower': 'The Orders,Veteran',
      'Order of the Sealed Temple': 'The Orders,Veteran'
    },
    Spires: {
      Pheromancer: 'Clone',
      Biomancer: 'Clone',
      'High Clone Executor': 'Clone',
      'Lineage Highborne': 'Husk',
      'Lineage Prideborne': 'Husk',
      'Merchant Prince': 'Clone',
      'Mimetic Assassin': 'Clone',
      'Bound Clones': 'Clone',
      'Desolation Drones': 'Drone',
      'Force Grown Drones': 'Drone',
      'Marksman Clones': 'Clone',
      'Onslaught Drones': 'Drone',
      Stryx: 'Drone',
      'Vanguard Clone Infiltrators': 'Clone',
      'Vanguard Clones': 'Clone',
      Avatara: 'Husk',
      'Brute Drones': 'Drone',
      'Incarnate Sentinels': 'Monstrosity',
      'Centaur Avatara': 'Husk',
      'Leonine Avatara': 'Husk',
      Abomination: 'Monstrosity',
      'Siegebreaker Behemoth': 'Monstrosity',
      'Pteraphon Surveyor': 'Monstrosity',
      'Desolation Beast': 'Monstrosity',
      'Consumption Beast': 'Monstrosity'
    },
    Dweghom: {
      'Ardent Kerawegh': 'Ardent',
      'Hold Raegh': 'Clan',
      Exemplar: 'Clan,Ardent',
      'Tempered Sorcerer': 'Tempered,Forged',
      'Tempered Steelshaper': 'Tempered,Forged',
      'Lost Ancestor': 'Tempered,Ardent',
      Dragonslayers: 'Clan',
      Fireforged: 'Tempered,Forged',
      'Flame Berserkers': 'Ardent',
      'Hellbringer Drake': 'Tempered,Forged',
      'Hold Warriors': 'Clan',
      'Hold Ballistae': 'Clan',
      'Hold Thanes': 'Clan',
      'Inferno Automata': 'Tempered,Forged',
      Initiates: 'Ardent',
      'Ironclad Drake': 'Clan',
      Lost: 'Ardent,Tempered',
      Found: 'Ardent,Tempered,Forged',
      Magmaforged: 'Tempered,Forged',
      Steelforged: 'Tempered,Forged',
      Stoneforged: 'Tempered,Forged',
      Wardens: 'Ardent'
    }
  };
  const out = {};
  Object.entries(R).forEach(([f, m]) => {
    out[f] = {};
    Object.entries(m).forEach(([n, r]) => {
      out[f][frN(n)] = r.split(',');
    });
  });
  return out;
})();
const STRAIN = {
  'Bound Clones': ['Hypercortical Stimulation', ['Support (+2)']],
  'Desolation Drones': ['Parasitic Hyperstimulation', ['Deadly Shot']],
  'Force Grown Drones': ['Apoptotic Spasms', ['Lethal Demise (1)']],
  'Marksman Clones': ['Ocular Nerve Hyperstimulation', ['Armor Piercing (1)']],
  'Onslaught Drones': ['Adrenal Hysteria', ['Linebreaker'], '+2″ Charge distance'],
  Stryx: ['Telencephalic Lateralization', ['Disruptive']],
  'Vanguard Clone Infiltrators': [
    'Hypersynaptic Bonding',
    [],
    'Volley targets lose Cover and Loose Formation'
  ],
  'Vanguard Clones': ['Neuromuscular Overstimulation', [], '+1 Attacks', { A: 1 }],
  Avatara: ['Induced Hyperkinesis', ['Flawless Strikes']],
  'Brute Drones': ['Hyperkeratinism', ['Cleave (+1)']],
  'Incarnate Sentinels': ['Muscular Teratosis', ['Trample (3)']],
  'Centaur Avatara': ['Hypothalamic Suppression', ['Shock']],
  'Leonine Avatara': ['Muscular Teratosis', ['Longshot']],
  Abomination: ['Dysthymic Hysteria', ['Relentless Blows']],
  'Siegebreaker Behemoth': ['Apex Hyperyparixa', ['Juggernaut']],
  'Pteraphon Surveyor': ['Microbial Shroud', [], 'Aura: enemies within 8″ cannot Heal or Rally'],
  'Consumption Beast': ['Halitotic Fetor', ['Dread']]
};
const FORGED = {
  Fireforged: [['Barrage +2', 1, ['Barrage (+2)']]],
  'Hellbringer Drake': [['Barrage +2, Armor Piercing +1', 1, ['Barrage (+2)', 'Armor Piercing (+1)']]],
  'Inferno Automata': [
    ['+1 March', 1, [], { M: 1 }],
    ['Impact +2', 1, ['Impact (+2)']]
  ],
  Found: [['Barrage +1 and +4″ range', 1, ['Barrage (+1)', 'Barrage Range (+4)']]],
  Magmaforged: [
    ['+2″ Charge', 1, [], null, '+2″ Charge distance'],
    ['+1 Defense', 1, [], { D: 1 }],
    ['Both', 3, [], { D: 1 }, '+2″ Charge distance']
  ],
  Steelforged: [
    ['+2 Attacks', 1, [], { A: 2 }],
    ['Hardened (1)', 1, ['Hardened (1)']],
    ['Both', 3, ['Hardened (1)'], { A: 2 }]
  ],
  Stoneforged: [
    ['Heal 3 wounds', 1, [], null, null, 3],
    ['+2 March', 1, [], { M: 2 }]
  ]
};
const RITUALS = {
  'Court of Fire': [
    ['Intrusive Thoughts', 7],
    ['Conflagration', 7],
    ['Fiery Dominion', 7]
  ],
  'Court of Water': [
    ['Call forth the Deep', 5],
    ['Violent Geyser', 7],
    ['Soothing Tides', 6]
  ],
  'Court of Air': [
    ['Far Sight', 7],
    ['Sayf', 7],
    ['Spiteful Winds', 7]
  ],
  'Court of Earth': [
    ['Gifts of the Earth', 7],
    ['Earthquake', 7],
    ['Kiss of the Earth', 6]
  ]
};
const CULTS = {
  Famine: ['Dread', 'Dread'],
  War: ['Cleave (+1)', 'Cleave (+1)'],
  Death: ['Deadly Blades', 'Deadly Blades'],
  Conquest: ['+2 Evasion (max 3)', null]
};
const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'],
  SEASONFX = {
    Spring: ['Verdant Awakening: +2 March', [], { M: 2 }],
    Summer: ['Sunfire Reprisal: Shock', ['Shock']],
    Autumn: ["Harvest's Resolve: Culling", ['Culling']],
    Winter: ['Frostbound Defiance: Dread', ['Dread']]
  };
const TACTICS = {
  'Direct Assault!': ['Relentless Blows'],
  'Draw Them In!': ['Tenacious (+1)'],
  'Take the Flanks!': ['Opportunist']
};
const IDEAL = {
  Ka: ['Impact (+1), Brutal Impact (+1)', ['Impact (+1)', 'Brutal Impact (+1)']],
  Chi: ['Indomitable (2)', ['Indomitable (2)']],
  Fu: ['+2″ on the first March', []],
  Sui: ["choose one stand's Command rules", []],
  Mu: ['+1 Evasion (max 3)', [], { E: 1 }]
};
function frBase(u) {
  if (u.mods && u.mods.length) return u.mods[0];
  return String(u.name || '').replace(/\s+(I|II|III|IV|V|VI|VII|VIII)$/, '');
}
function frFac(u) {
  if (!u) return '';
  if (u.fac) return u.fac;
  const k = facOf(N(u.side));
  if (k) return k;
  const b = frBase(u);
  const f = ENCY.find(f => f.units.some(x => x.name === b));
  return f ? f.name : '';
}
function frEncy(u, name) {
  const f = ENCY.find(f => f.name === frFac(u));
  return f && f.units.find(x => frN(x.name) === frN(name || frBase(u)));
}
function frRoles(u, char) {
  const f = frFac(u),
    m = FROLES[f] || {};
  if (!char && u.mods && u.mods.length && MODULAR[u.mods[0]]) return [MODULAR[u.mods[0]].role];
  let r = (m[frN(char ? u.charName : frBase(u))] || []).slice();
  const e = frEncy(u, char ? u.charName : null);
  /* Hundred Kingdoms: the Battlefield Roles are in the army list entry (a regiment's "Feudal, Theist"; a character's
     warband line "Theist. Mainstay: …") */
  if (f === 'Hundred Kingdoms' && e) {
    const head = String(e.warband || '').split(/\.\s|Mainstay|No warband/)[0];
    (head.match(/Imperial|Feudal|Theist|The Orders|Veteran/g) || []).forEach(x => {
      if (!r.includes(x)) r.push(x);
    });
  }
  const cm = e && String(e.warband || '').match(/Court of (Fire|Air|Earth|Water)/);
  if (cm) r.push('Court of ' + cm[1]);
  if (
    (f === 'Weaver Courts' || f === 'Sorcerer Kings') &&
    char &&
    u.charCourt &&
    !r.some(x => /^Court of/.test(x))
  )
    r.push('Court of ' + u.charCourt);
  /* Sorcerous Patronage: [Mortals] regiments take the Court of their warband's character; Ghols (Denizens of the Upper
     Planes) the Warlord's Court */
  if (f === 'Sorcerer Kings' && !char && !r.some(x => /^Court of/.test(x))) {
    const wl = supWl(u.side);
    const c = r.includes('Mortals')
      ? u.wbCourt
      : frBase(u) === 'Ghols' && wl && wl.charCourt
        ? wl.charCourt
        : '';
    if (c) r.push('Court of ' + c);
  }
  if (f === 'Weaver Courts' && !char && !r.some(x => /^Court of/.test(x)))
    r.push('Court of ' + wcCourt(u.side));
  if (u.vetRole && !char && !r.includes('Veteran')) r.push('Veteran');
  /* Lineage Commander: the Bound Clones it leads gain the Husk role */
  if (!char && f === 'Spires' && u.charName && !r.includes('Husk') && upgOf(u, /Lineage Commander/))
    r.push('Husk');
  /* W'adrhŭn: the character and the regiment it joins gain the [Cult of …] role of the Cult it follows */
  if (f === "W'adrhŭn" && u.cult && (char || u.charName) && !r.some(x => /^Cult of/.test(x)))
    r.push('Cult of ' + u.cult);
  if (char && f === 'Yoroni' && /Daimyo/.test(u.charName || ''))
    r = r.filter(x => !['Ka', 'Chi', 'Fu', 'Sui', 'Mu'].includes(x)).concat([u.daimyoIdeal || 'Ka']);
  return r;
}
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
/* Weaver Courts: regiments without a fixed Court belong to the Warlord's Seasonal Court (Mhor Sidhe: Autumn, Rhun Sidhe:
   Spring, Taosidhe and Seanchas Sidhe: the Court chosen in the list). An older list falls back to the panel's choice. */
function wcCourtOf(wl) {
  return wl && wl.charName
    ? (frRoles(wl, true).find(x => /^Court of/.test(x)) || '').replace('Court of ', '')
    : '';
}
function wcCourt(side) {
  const wl = supWl(side);
  return (wl && frFac(wl) === 'Weaver Courts' && wcCourtOf(wl)) || frG(side, 'wc').court || 'Spring';
}
/* Sorcerer Kings: the Court whose Ritual is being prepared, and Elemental Confluence (a friendly Maharajah: Elemental
   Conduit adds its marker to any Ritual) */
function skRitualCourt(side) {
  const n = frG(side, 'sk').ritual;
  const e = n && Object.entries(RITUALS).find(([, L]) => L.some(x => x[0] === n));
  return e ? e[0].replace('Court of ', '') : '';
}
function skSpellCourt(name) {
  return Object.keys(SK_COURTS).find(c => SK_COURTS[c].includes(name)) || '';
}
function skConfluence(side) {
  return supAll(side).some(S => S.k === 'Elemental Confluence');
}
/* a Ritual Marker for each spell of the prepared Ritual's Court that is cast (successful or not: "Every time a Spell
   is cast"); Shu'laat adds one more once per
   activation */
async function skSpellMarker(cid, sp, asChar, failed) {
  const u = base(cid);
  if (!u || frFac(u) !== 'Sorcerer Kings') return;
  const g = frG(u.side, 'sk'),
    rc = skRitualCourt(u.side),
    sc = skSpellCourt(sp && sp.name ? sp.name : sp);
  if (!g.ritual || !rc || sc !== rc) return;
  let n = 1;
  const notes = [sp.name || sp];
  /* Shu'laat: only for a successfully cast Spell */
  if (asChar && !failed && upgOf(u, /Shu'laat/) && u.shulR !== state.round) {
    n++;
    notes.push("Shu'laat +1");
  }
  await putState({
    fr: frPatch(u.side, 'sk', { rm: (+g.rm || 0) + n }),
    units:
      n > 1
        ? state.units.map(x => (x.id === u.id ? Object.assign({}, x, { shulR: state.round }) : x))
        : state.units
  });
  toast(
    'Ritual: +' + n + ' marker' + (n > 1 ? 's' : '') + ' for ' + g.ritual + ' (' + notes.join(', ') + ').'
  );
}
function frFacs(side) {
  return [
    ...new Set(
      (state.units || [])
        .filter(u => u.side === side && u.type !== 'marker')
        .map(frFac)
        .filter(Boolean)
    )
  ];
}
/* Spires: the army's Sect. Chosen in the army builder (it travels with the list as the army rule "Sect: …"); an army
   without one (an older list, the test field) can still pick it in the faction panel. */
const SECTS = ['Underspire', 'Directorate', 'Sovereign Lineage'];
function spSectList(side) {
  const a = ((state && state.army && state.army[side]) || []).map(String).find(x => /^Sect: /.test(x));
  return a ? a.slice(6).trim() : '';
}
function spSect(side) {
  return spSectList(side) || frG(side, 'sp').sect || '';
}
function frG(side, k) {
  return Object.assign({}, ((state.fr || {})[side] || {})[k] || {});
}
function frPatch(side, k, p) {
  const fr = JSON.parse(JSON.stringify(state.fr || {}));
  fr[side] = fr[side] || {};
  fr[side][k] = Object.assign({}, fr[side][k] || {}, p);
  return fr;
}
function frSet(side, k, p, extra) {
  return putState(Object.assign({ fr: frPatch(side, k, p) }, extra || {}));
}
function canStrat(side) {
  const a = (state.army && state.army[side]) || [];
  if (a.length) return a.some(x => /Strategic Stack/.test(x));
  return facOf(N(side)) === 'City States';
}
function directOrders(side) {
  const a = (state.army && state.army[side]) || [];
  if (a.length) return a.some(x => /Direct Orders/.test(x));
  return facOf(N(side)) === 'City States';
}
function noEntourage(u) {
  return (
    (frFac(u) === 'Yoroni' && !upgOf(u, /Purification Rites/)) ||
    srHas(u, /^Primal Cacophony/) ||
    srHas(u, /Honor, a Void of Self/)
  );
}
function stratU(u) {
  return canStrat(u.side) && (!u.fac || u.fac === 'City States');
}
function ordersU(u) {
  return directOrders(u.side) && (!u.fac || u.fac === 'City States');
}
/* temporary rules and stat changes that last until the end of the round */
function grantU(x, src, rules, stats) {
  if ((x.temp || []).some(g => g.src === src)) return x;
  const y = Object.assign({}, x),
    d = {};
  y.rules = (x.rules || []).concat(rules || []);
  if (stats) {
    y.stats = Object.assign({}, x.stats);
    Object.entries(stats).forEach(([k, v]) => {
      if (k === 'M') {
        y.m = (+x.m || 0) + v;
        y.stats.M = (+y.stats.M || 0) + v;
        d.M = v;
        return;
      }
      const b = +y.stats[k] || 0;
      let a = b + v;
      if (k === 'E') a = Math.min(a, Math.max(3, b));
      d[k] = a - b;
      y.stats[k] = a;
    });
  }
  y.temp = (x.temp || []).concat([{ src, rules: rules || [], d }]);
  y.effects = (x.effects || []).includes(src) ? x.effects || [] : (x.effects || []).concat([src]);
  return y;
}
function ungrantU(x, pred) {
  if (!x.temp || !x.temp.length) return x;
  const drop = x.temp.filter(g => !pred || pred(g.src)),
    keep = x.temp.filter(g => pred && !pred(g.src));
  const y = Object.assign({}, x),
    r = (x.rules || []).slice(),
    st = Object.assign({}, x.stats);
  let m = +x.m || 0;
  drop.forEach(g => {
    (g.rules || []).forEach(q => {
      const i = r.lastIndexOf(q);
      if (i >= 0) r.splice(i, 1);
    });
    (g.lost || []).forEach(q => r.push(q)); /* rules the grant took away come back */
    Object.entries(g.d || {}).forEach(([k, v]) => {
      if (k === 'M') {
        m -= v;
        st.M = (+st.M || 0) - v;
      } else st[k] = (+st[k] || 0) - v;
    });
  });
  y.rules = r;
  y.stats = st;
  y.m = m;
  y.effects = (x.effects || []).filter(e => !drop.some(g => g.src === e));
  y.temp = keep;
  return y;
}
/* a grant that also removes rules until it ends (Inscription of Lighter Alloys: loses Phalanx and Shield) */
function grantLoseU(x, src, rules, stats, lose) {
  const y = grantU(x, src, rules, stats);
  if (y === x) return x;
  const lost = (y.rules || []).filter(r => lose.some(re => re.test(String(r))));
  y.rules = (y.rules || []).filter(r => !lost.includes(r));
  y.temp = y.temp.map(g => (g.src === src ? Object.assign({}, g, { lost }) : g));
  return y;
}
function hasGrant(u, src) {
  return !!u && (u.temp || []).some(g => g.src === src);
}
async function grant(id, src, rules, stats, note, extra) {
  const u = base(id);
  if (!u) return false;
  if (hasGrant(u, src)) {
    toast('Already active this round.');
    return false;
  }
  await putState(
    Object.assign(
      {
        units: state.units.map(x => (x.id === id ? grantU(x, src, rules, stats) : x)),
        lastTitle: N(u.side) + ' · ' + (u.short || u.name),
        lastText: note || src
      },
      extra || {}
    )
  );
  return true;
}
/* Old Dominion */
function memOf(u) {
  if (frFac(u) !== 'Old Dominion') return null;
  const e = frEncy(u);
  const m = e && String(e.options || '').match(/Memory of Old:\s*([^;]+)/);
  if (!m) return null;
  const rules = m[1]
    .split(/,\s*/)
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => t.replace(/^(.*?)\s*\+(\d+)$/, '$1 (+$2)'));
  return { text: m[1].trim(), rules };
}
function odPts(side) {
  if (SBX()) return 2000;
  const L = state.setup && state.setup[side];
  const n =
    (L && +L.points) ||
    (state.units || []).filter(u => u.side === side).reduce((a, u) => a + (+u.points || 0), 0);
  return n >= 500 ? n : 2000;
}
function odTier(side, pool) {
  const g = frG(side, 'od'),
    n = +g[pool] || 0,
    s = Math.trunc((odPts(side) - 2000) / 250) * 2,
    wl = (state.units || []).find(u => u.side === side && u.warlord);
  const t4ok = pool === 'dark' && wl && /Xhiliarch|Mounted Strategos/.test(wl.charName || '');
  if (t4ok && n >= 23 + s) return 4;
  return n >= 18 + s ? 3 : n >= 9 + s ? 2 : 1;
}
/* the Dark Power tier a regiment counts as being under (Legio I 'Primigenia': +1 while its character is attached) */
function odTierU(u, pool) {
  const t = odTier(u.side, pool);
  return pool === 'dark' && u && u.charName && upgOf(u, /Primigenia/) ? Math.min(4, t + 1) : t;
}
function odThr(side) {
  const s = Math.trunc((odPts(side) - 2000) / 250) * 2;
  return [9 + s, 18 + s, 23 + s];
}
function odT4ok(side) {
  const wl = (state.units || []).find(u => u.side === side && u.warlord);
  return !!(wl && /Xhiliarch|Mounted Strategos/.test(wl.charName || ''));
}
const ROMAN = ['', 'I', 'II', 'III', 'IV'];
/* a token gauge: count, tier, and how far to the next tier */
function odGauge(side, pool, who) {
  const n = +frG(side, 'od')[pool] || 0,
    t = odTier(side, pool),
    th = odThr(side),
    maxT = pool === 'dark' && odT4ok(side) ? 4 : 3,
    top = th[maxT - 2] + 2;
  const nextAt = t < maxT ? th[t - 1] : null,
    name = pool === 'dark' ? 'Dark Power' : 'Fallen Pantheon';
  const b = bEl('button', { type: 'button', className: 'odg ' + pool });
  b.title = 'Open the Faction rules panel to change the tokens';
  b.setAttribute(
    'aria-label',
    (who ? who + ': ' : '') +
      name +
      ' ' +
      n +
      ' tokens, Tier ' +
      ROMAN[t] +
      (nextAt != null ? ', ' + (nextAt - n) + ' more to Tier ' + ROMAN[t + 1] : '')
  );
  const bar = bEl('div', { className: 'odg-bar' });
  const fill = bEl('i');
  fill.style.width = Math.min(100, (n / top) * 100) + '%';
  bar.append(fill);
  th.slice(0, maxT - 1).forEach(v => {
    const m = bEl('b');
    m.style.left = Math.min(100, (v / top) * 100) + '%';
    bar.append(m);
  });
  b.append(
    bEl('span', { className: 'odg-n', textContent: String(n) }),
    bEl(
      'span',
      { className: 'odg-m' },
      [
        who ? bEl('span', { className: 'odg-who', textContent: who }) : null,
        bEl(
          'span',
          { className: 'odg-l' },
          [
            bEl('span', { textContent: name }),
            bEl('span', { className: 'odg-t', textContent: 'Tier ' + ROMAN[t] })
          ].filter(Boolean)
        ),
        bar,
        bEl('span', {
          className: 'odg-s',
          textContent:
            nextAt != null
              ? nextAt - n + ' more to Tier ' + ROMAN[t + 1] + ' (at ' + nextAt + ')'
              : 'Highest tier reached'
        })
      ].filter(Boolean)
    )
  );
  b.onclick = () => {
    frOpen = true;
    renderTurnbar();
    const d = document.querySelector('#turnbar .fr-panel');
    if (d) d.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  return b;
}
function renderOdTrk() {
  const el = $('od-trk');
  if (!el) return;
  el.innerHTML = '';
  if (!state || ['setup', 'review'].includes(state.step || '')) {
    el.hidden = true;
    return;
  }
  const sides = SBX() ? ['cs', 'nord'] : PVP() ? [ME, other(ME)] : [HU, AI];
  sides.forEach(side => {
    if (!frFacs(side).includes('Old Dominion')) return;
    const who = SBX()
      ? side === 'cs'
        ? 'South'
        : 'North'
      : side === ME
        ? PN(side) || 'You'
        : PN(side) || N(side);
    el.append(odGauge(side, 'dark', who), odGauge(side, 'pant', who));
    const mine = SBX() || (PVP() ? side === ME : side === HU);
    if (!mine) return;
    const g = frG(side, 'od'),
      R = state.round || 1,
      due = bEl('div', { className: 'od-due' });
    if (g.soma !== R && (state.step || '') !== 'setup')
      due.append(
        frRow(
          'Blasphemous Soma, round ' + R + ': 1 token, your choice:',
          abBtn('+1 Dark Power', () => frSet(side, 'od', { dark: (+g.dark || 0) + 1, soma: R }), 'ab-tog'),
          abBtn(
            '+1 Fallen Pantheon',
            () => frSet(side, 'od', { pant: (+g.pant || 0) + 1, soma: R }),
            'ab-tog'
          )
        )
      );
    try {
      odPendingBox(side, due, g, true);
    } catch (e) {}
    if (due.children.length) {
      due.prepend(bEl('div', { className: 'odg-who', textContent: who + ' · tokens to place' }));
      el.append(due);
    }
  });
  el.hidden = !el.children.length;
}
function odLost(side) {
  return (state.units || [])
    .filter(u => u.side === side && u.type !== 'marker' && animate(u))
    .reduce((a, u) => a + (u.destroyed ? u.stands || 0 : Math.max(0, (u.stands || 0) - live(u))), 0);
}
/* Dweghom */
function dwCreed(side) {
  const g = frG(side, 'dw');
  if (g.creed) return g.creed;
  const wl = (state.units || []).find(u => u.side === side && u.warlord);
  const w = (wl && wl.charName) || '';
  return /Lost Ancestor/.test(w)
    ? 'Ardent and Tempered'
    : /Hold Raegh/.test(w)
      ? 'Clan'
      : /Tempered/.test(w)
        ? 'Tempered'
        : /Ardent/.test(w)
          ? 'Ardent'
          : '';
}
function awakenRules(u) {
  return dwCreed(u.side) === 'Clan' && frRoles(u).includes('Clan') ? ['Oblivious', 'Iron Discipline'] : [];
}
async function awaken0(id, why) {
  const u = base(id);
  if (!u || hasGrant(u, 'Awakened')) return;
  const wasBroken = (u.effects || []).includes('Broken');
  await putState({
    units: state.units.map(x => {
      if (x.id !== id) return x;
      let y = grantU(x, 'Awakened', awakenRules(x));
      if (wasBroken) y = Object.assign({}, y, { effects: y.effects.filter(e => e !== 'Broken') });
      return y;
    }),
    lastTitle: N(u.side) + ' · ' + (u.short || u.name),
    lastText:
      'Awakened' +
      (why ? ' (' + why + ')' : '') +
      '. It cannot become Broken this round' +
      (wasBroken ? '; it Rallies at once.' : '.')
  });
}
function frOnCharge(id) {
  const u = base(id);
  if (!u || frFac(u) !== 'Dweghom') return;
  const c = dwCreed(u.side),
    r = frRoles(u);
  if (/Ardent/.test(c) && (r.includes('Ardent') || r.includes('Clan')))
    awaken(id, 'Ardent Creed: successful Charge');
}
/* round effects that come from state rather than actions */
function frFx(u) {
  const out = [];
  if (!state || !u || u.type === 'marker') return out;
  const f = frFac(u);
  const gt = tGarrisonOf(u);
  if (gt)
    out.push(
      'In ' +
        tInfo(gt).name.toLowerCase() +
        ' (+' +
        (u.garrisonD || tInfo(gt).def) +
        ' Defense, 360° sight, all stands front rank)'
    );
  if (u.onTable && tWater(u)) out.push('In water (−1 Clash)');
  {
    const e = terrainOf().find(t => tHas(t, 'Elevated') && inT(t, [u.x, u.y]));
    if (e) out.push('On ' + tInfo(e).name.toLowerCase() + ' (Size ' + uSize(u) + ')');
  }
  if (f === 'Old Dominion' && animate(u) && odTierU(u, 'dark') >= 3) out.push('Inspired (Dark Power III)');
  if (
    f === 'Nords' &&
    typeof cb !== 'undefined' &&
    cb &&
    cb.type === 'clash' &&
    cb.att === u.id &&
    /Cavalry|Brute/.test(u.cls || '') &&
    (byId(cb.tgt) || {}).type === 'monster' &&
    supRoles(u).includes('Half-Bloods') &&
    all().some(x => x.side === u.side && !x.destroyed && x.charName && upgOf(x, /Pack Tactics/))
  )
    /* X is the regiment's Attacks at that moment, bonuses included */
    out.push('Support (' + (prof(u, 'reg').A || 0) + ') (Pack Tactics)');
  if (f === 'Dweghom' && firstInFray(u) && rx((u.rules || []).concat(itemRegRules(u)), 'Terrifying') < 2)
    out.push('Terrifying (+1) (First in the Fray)');
  if (
    f === 'Hundred Kingdoms' &&
    /Infantry/.test(u.cls || '') &&
    frRoles(u).includes('Veteran') &&
    live(u) - (u.char != null ? 1 : 0) >= 5
  )
    out.push('Inspired (Relentless Drills)');
  return out;
}
/* Glacial Presence (Weaver Courts Gift): an enemy that activates engaged with its Court of Winter regiment gains Decay
   until the end of the round (it keeps it if it withdraws) */
function glacialOn(u) {
  return (
    !!u &&
    u.onTable &&
    engaged(u).some(
      e =>
        e.charName &&
        upgOf(e, /Glacial Presence/) &&
        frFac(e) === 'Weaver Courts' &&
        frRoles(e).includes('Court of Winter')
    )
  );
}
function frHeal(u) {
  if (
    frFac(u) === 'Spires' &&
    spSect(u.side) === 'Underspire' &&
    frRoles(u).some(r => r === 'Drone' || r === 'Clone')
  )
    return 2;
  return 0;
}
function frSeasonUnits(units, side, season) {
  const g = frG(side, 'wc');
  season = season || g.season;
  if (!season) return units;
  const fxs = SEASONFX[season];
  g.season = season;
  return units.map(u => {
    if (u.side !== side || u.type === 'marker' || frFac(u) !== 'Weaver Courts') return u;
    const r = frRoles(u);
    if (!r.includes('Court of ' + season)) return u;
    return grantU(u, 'Season: ' + fxs[0], fxs[1], fxs[2]);
  });
}
/* end of an activation: Decay, Seed Markers, Elemental Power */
function frAfterAct(a, units) {
  const out = { units, fr: null, notes: [] };
  const i = units.findIndex(x => x.id === a.id);
  if (i < 0) return out;
  let u = units[i];
  const f = frFac(u);
  if ((f === 'Spires' && a.frDecay) || (!a.frDecay && RU(u).some(x => /^Decay\b/.test(x)))) {
    const n = decayN(u);
    const AL = allocate(u, n);
    u = Object.assign(
      {},
      u,
      { wounds: AL.w, auxWounds: AL.aw },
      AL.dead ? { onTable: false, destroyed: true, status: 'Destroyed', destroyedRound: state.round } : {}
    );
    out.notes.push('Decay: ' + n + ' wounds' + (AL.dead ? ', destroyed' : ''));
    if (n && u.charName && upgOf(u, /Degenerative Aura/))
      engaged(u).forEach(e0 => {
        const e = typeof e0 === 'string' ? byId(e0) : e0,
          j = e && units.findIndex(x => x.id === e.id);
        if (!e || j < 0) return;
        const k = live(e),
          A2 = allocate(units[j], k);
        units[j] = Object.assign(
          {},
          units[j],
          { wounds: A2.w, auxWounds: A2.aw },
          A2.dead ? { onTable: false, destroyed: true, status: 'Destroyed', destroyedRound: state.round } : {}
        );
        out.notes.push('Degenerative Aura: ' + (e.short || e.name) + ' takes ' + k + ' wounds');
      });
  }
  if (f === 'Weaver Courts' && a.actions.some(x => x.type === 'clash' || x.type === 'volley')) {
    const s = Math.min(3, (+u.seeds || 0) + 1);
    if (s !== (+u.seeds || 0)) out.notes.push('gains a Seed Marker (' + s + ')');
    u = Object.assign({}, u, { seeds: s });
  }
  if (f === 'Dweghom' && frRoles(u).includes('Forged') && !a.frForged) {
    const g = frG(u.side, 'dw'),
      ep = Math.min(10, (+g.ep || 0) + 1);
    out.fr = frPatch(u.side, 'dw', { ep });
    out.notes.push('Forged: +1 Elemental Power (' + ep + ')');
  }
  {
    const L = supLeadByExample(units, a);
    if (L) {
      out.notes.push(L);
      state.sup = supMemo(u.side, { lbR: srRnd() });
    }
  }
  if (!out.fr && frG(u.side, 'sk').airNow) out.fr = frPatch(u.side, 'sk', { airNow: false });
  units[i] = u;
  return out;
}
/* options shown during an activation */
function frOptions(u) {
  return frOptions0(u).concat(srOptions(u)).concat(supOptions(u));
}
function yAny(u) {
  return (
    (u.abilities || []).some(a => a[0] === 'Any Ideal Card') ||
    fxHas(u, /^Kabuki/) ||
    u.suiCmd === 'Kappa Bushi'
  );
}
function yMatch(u, k) {
  return (
    frRoles(u).includes(k) ||
    (u.charName ? frRoles(u, true).includes(k) : false) ||
    yAny(u) ||
    supIdealMatch(u, k)
  );
}
async function yApply(u, k) {
  if (!act || act.frIdeal) return;
  act.frIdeal = k;
  const match = yMatch(u, k) || (upgOf(u, /Ofuda/) && act.card && cardIdeal(act.card) === 'Mu');
  if (k === 'Ka' && rh(u.rules, 'Honor Beyond Death') && (base(u.id).effects || []).includes('Broken'))
    await putState({
      units: state.units.map(x =>
        x.id === u.id ? Object.assign({}, x, { effects: x.effects.filter(e => e !== 'Broken') }) : x
      ),
      lastTitle: N(u.side) + ' · Honor Beyond Death',
      lastText: 'Activated by a Ka Ideal Card: it is no longer Broken.'
    });
  if (!match || hasGrant(base(u.id), 'Ideal Card: ' + k)) {
    render();
    if (!match)
      toast('The ' + k + ' Ideal Card does not match ' + (u.short || u.name) + ': no Ideal effect.');
    return;
  }
  if (k === 'Fu') act.frFu = true;
  await grant(
    u.id,
    'Ideal Card: ' + k,
    IDEAL[k][1],
    IDEAL[k][2] || null,
    'Ideal Card ' + k + ': ' + IDEAL[k][0]
  );
}
const CMDR = {
  'Oni Ayakashi': { r: ['Juggernaut'], A: 1, t: '+1 Attacks and Juggernaut' },
  'Kami Ayakashi': { r: ['Tenacious (1)'], E: 1, t: '+1 Evasion and Tenacious (1)' },
  'Tengu Bushi': {
    r: ['Vanguard (3)', 'Ignores Hindering terrain'],
    t: 'ignores Hindering terrain and Vanguard (3)'
  },
  'Tengu Ayakashi': {
    r: ['Vanguard (3)', 'Tenacious (1) against Volleys'],
    t: 'Tenacious (1) against Volleys and Vanguard (3)'
  },
  'Kappa Bushi': { r: [], t: 'any Ideal Card gives its effect' },
  'Origami Warriors': {
    r: ['Tenacious (1) against Volleys'],
    t: 'Tenacious (1) against Volleys; destroyed Origami stands do not count toward Broken'
  }
};
/* Sui: the regiment swaps to another stand's Command rules until the end of the round (restored by frRoundEnd) */
function suiSwap(x, to) {
  const from = x.suiCmd || (x.mods || [])[0];
  if (!from || !CMDR[from] || !CMDR[to] || from === to) return x;
  const y = Object.assign({}, x),
    F = CMDR[from],
    T = CMDR[to];
  if (!x.suiSave)
    y.suiSave = {
      rules: x.rules.slice(),
      E: x.stats.E,
      prof: JSON.parse(JSON.stringify(x.modProfiles || {}))
    };
  const r = x.rules.slice();
  F.r.forEach(q => {
    const i = r.indexOf(q);
    if (i >= 0) r.splice(i, 1);
  });
  T.r.forEach(q => {
    if (!r.includes(q)) r.push(q);
  });
  y.rules = r;
  y.stats = Object.assign({}, x.stats, { E: (+x.stats.E || 0) - (F.E || 0) + (T.E || 0) });
  y.modProfiles = JSON.parse(JSON.stringify(x.modProfiles || {}));
  Object.values(y.modProfiles).forEach(m => {
    m.A = (+m.A || 0) - (F.A || 0) + (T.A || 0);
  });
  y.suiCmd = to;
  y.effects = (x.effects || []).filter(e => !/^Sui: /.test(e)).concat(['Sui: ' + to + ' Command rules']);
  return y;
}
function suiRestore(x) {
  if (!x.suiSave) return x;
  const y = Object.assign({}, x, {
    rules: x.suiSave.rules,
    stats: Object.assign({}, x.stats, { E: x.suiSave.E }),
    modProfiles: x.suiSave.prof
  });
  delete y.suiSave;
  delete y.suiCmd;
  y.effects = (y.effects || []).filter(e => !/^Sui: /.test(e));
  return y;
}
function frOptions0(u) {
  const out = [];
  if (!u || !act || act.id !== u.id) return out;
  const f = frFac(u),
    fresh = !act.actions.length && !act.cur,
    add = (label, fn, why, cls) => out.push({ label, fn, why, cls });
  if (
    f === 'Yoroni' &&
    act.frIdeal === 'Sui' &&
    hasGrant(base(u.id), 'Ideal Card: Sui') &&
    Array.isArray(u.mods) &&
    !act.suiDone
  ) {
    const cur = u.suiCmd || u.mods[0],
      alive = [...new Set(u.mods.slice(0, regTot(u) - lostOf(u)))].filter(t => t !== cur && CMDR[t]);
    if (alive.length) {
      out.push({ head: 'Sui: take the Command rules of another stand in the regiment' });
      alive.forEach(t =>
        add(t + ': ' + CMDR[t].t, async () => {
          act.suiDone = true;
          await putState({
            units: state.units.map(x => (x.id === u.id ? suiSwap(x, t) : x)),
            lastTitle: N(u.side) + ' · Sui',
            lastText: (u.short || u.name) + ' uses the ' + t + ' Command rules until the end of the round.'
          });
        })
      );
      add('Keep its own Command rules', () => {
        act.suiDone = true;
        render();
      });
    }
  }
  if (
    f === 'Yoroni' &&
    fresh &&
    !act.entering &&
    (u.abilities || []).some(a => a[0] === 'Monstrous Inspiration') &&
    !act.monIns
  ) {
    const mine = (u.temp || []).filter(g => /^Ideal Card: /.test(g.src)),
      F = srFriends(u).filter(x => srNear(x, u, 8) && x.type !== 'marker');
    if (mine.length && F.length) {
      out.push({
        head: 'Monstrous Inspiration (Draw Event): share one Ideal Card effect with a friendly regiment within 8″'
      });
      mine.forEach(g => {
        const k = g.src.replace('Ideal Card: ', '');
        F.forEach(x =>
          add(
            k + ' (' + IDEAL[k][0] + ') to ' + (x.short || x.name),
            async () => {
              act.monIns = true;
              await putState({
                units: state.units.map(y =>
                  y.id === x.id
                    ? grantU(
                        y,
                        'Ideal Card: ' + k + ' (Monstrous Inspiration)',
                        IDEAL[k][1],
                        IDEAL[k][2] || null
                      )
                    : y
                ),
                lastTitle: N(u.side) + ' · Monstrous Inspiration',
                lastText:
                  (x.short || x.name) + ' gains the ' + k + ' Ideal Card effect until the end of the round.'
              });
            },
            hasGrant(x, 'Ideal Card: ' + k) || hasGrant(x, 'Ideal Card: ' + k + ' (Monstrous Inspiration)')
              ? 'Already has it'
              : ''
          )
        );
      });
    } else
      out.push({
        head:
          'Monstrous Inspiration: ' +
          (mine.length ? 'no friendly regiment within 8″' : 'no Ideal Card effect on it to share yet')
      });
  }
  if (
    f === 'Yoroni' &&
    fresh &&
    !act.entering &&
    (u.abilities || []).some(a => a[0] === 'Whispered Illusion') &&
    !fxHas(u, /^Whispered Illusion/)
  ) {
    out.push({ head: 'Whispered Illusion (Draw Event): choose one until the end of the round' });
    add(
      'Phantom Onslaught: enemies charging it test Resolve (pass −1″ Charge; fail no Shock and −2 Impact)',
      () =>
        grant(
          u.id,
          'Whispered Illusion: Phantom Onslaught',
          [],
          null,
          'Whispered Illusion: Phantom Onslaught'
        )
    );
    add('Veil of Doubt: enemies clashing with it test Resolve (−1 Attacks; fail also loses Inspired)', () =>
      grant(u.id, 'Whispered Illusion: Veil of Doubt', [], null, 'Whispered Illusion: Veil of Doubt')
    );
  }
  if (offOn(u, 'thegn') && !u.thegnTactic) {
    out.push({ head: 'Thegn: choose the Tribal Tactic it is always under' });
    Object.keys(TACTICS).forEach(t =>
      add(t + ' (' + TACTICS[t].join(', ') + ')', () =>
        putState({
          units: state.units.map(x => (x.id === u.id ? Object.assign({}, x, { thegnTactic: t }) : x)),
          lastTitle: N(u.side) + ' · ' + (u.short || u.name),
          lastText: 'Thegn: always under ' + t + '.'
        })
      )
    );
  }
  if (f === 'Old Dominion' && !act.entering) {
    const m = memOf(u);
    if (m && odTierU(u, 'dark') >= 2 && animate(u))
      add(
        'Memories of Old as a Draw Event: ' +
          m.text +
          (offOn(u, 'cenotaph') ? ' (Dark Cenotaph: +1 Dark Power)' : ''),
        () =>
          grant(
            u.id,
            'Memories of Old',
            m.rules,
            null,
            'Memories of Old (Draw Event, Dark Power Tier II): ' +
              m.text +
              (offOn(u, 'cenotaph') ? '. Dark Cenotaph adds 1 Dark Power token.' : ''),
            offOn(u, 'cenotaph')
              ? { fr: frPatch(u.side, 'od', { dark: (+frG(u.side, 'od').dark || 0) + 1 }) }
              : null
          ),
        hasGrant(u, 'Memories of Old')
          ? 'Already used this round'
          : !fresh
            ? 'Only before the first action'
            : ''
      );
  }
  if (f === "W'adrhŭn" && !act.entering) {
    const g = frG(u.side, 'wa'),
      seq = (g.seq || []).slice(),
      own = wadCult(u);
    /* Adaptability: the player targets the marker */
    if (act.adaptPend) {
      const M = wadAdaptTargets(u);
      if (!M.length) act.adaptPend = false;
      else {
        out.push({ head: 'Adaptability: destroy a non-friendly Objective Marker within 6″' });
        M.forEach(m =>
          add((m.short || m.name) + ' (' + polyDist(corners(u), corners(m)).toFixed(1) + '″)', async () => {
            act.adaptPend = false;
            await putState({
              units: state.units.map(x =>
                x.id === m.id
                  ? Object.assign({}, x, {
                      onTable: false,
                      destroyed: true,
                      destroyedRound: state.round,
                      destroyedBy: u.side,
                      status: 'Destroyed'
                    })
                  : x
              ),
              lastTitle: N(u.side) + ' · Adaptability',
              lastText: (m.short || m.name) + ' is destroyed.'
            });
            toast('Adaptability: ' + (m.short || m.name) + ' is destroyed.');
          })
        );
      }
    }
    /* History: the player decides whether the Unsung markers return as Famine */
    if (act.histPend) {
      const N0 = act.histPend;
      out.push({
        head: 'History (once per round): any of the ' + N0 + ' Unsung Chant Markers may return as Famine'
      });
      for (let n = N0; n >= 1; n--)
        add('Return ' + n + ' as Famine Chant Marker' + (n > 1 ? 's' : ''), async () => {
          act.histPend = 0;
          await frSet(u.side, 'wa', {
            seq: (frG(u.side, 'wa').seq || []).concat(Array.from({ length: n }, () => 'Famine')).slice(0, 3),
            histR: state.round
          });
          toast(
            'History: ' + n + ' Famine Chant Marker' + (n > 1 ? 's return' : ' returns') + ' to the Sequence.'
          );
        });
      add('Leave them Unsung', () => {
        act.histPend = 0;
        render();
      });
    }
    if (!act.frMarker)
      out.push({ head: 'Add this activation’s Chant Marker' + (own ? ' (its cult: ' + own + ')' : '') });
    if (!act.frMarker)
      Object.keys(CULTS).forEach(c =>
        add(
          c,
          () => {
            act.frMarker = true;
            const s = seq.concat([c]);
            frSet(
              u.side,
              'wa',
              { seq: s.slice(-3) },
              {
                lastTitle: N(u.side) + ' · War Chant',
                lastText: 'Chant Marker: ' + c + (s.length > 3 ? ' (replaces the oldest)' : '')
              }
            );
          },
          '',
          own === c ? 'pri' : ''
        )
      );
    if (
      act.frMarker &&
      !act.frMarker2 &&
      (srDrum(u) || (u.abilities || []).some(a => /Aberration/.test(a[0])))
    ) {
      const dr = srDrum(u);
      out.push({
        head: 'Add a second Chant Marker (' + (dr ? 'Drum Beat' : 'Aberration: its own cult') + ')'
      });
      Object.keys(CULTS)
        .filter(c => dr || c === own)
        .forEach(c =>
          add(
            c,
            () => {
              act.frMarker2 = true;
              const s2 = (frG(u.side, 'wa').seq || []).concat([c]);
              frSet(
                u.side,
                'wa',
                { seq: s2.slice(-3) },
                { lastTitle: N(u.side) + ' · War Chant', lastText: 'Second Chant Marker: ' + c }
              );
            },
            '',
            own === c ? 'pri' : ''
          )
        );
    }
    if (seq.length === 3) {
      const cnt = c => seq.filter(x => x === c).length,
        cq = cnt('Conquest');
      Object.keys(CULTS).forEach(c => {
        const ok = c === 'Conquest' ? cq >= 2 : cnt(c) + cq >= 2;
        if (!ok) return;
        if (/^Chosen of /.test(frBase(u)) && own && c !== own) return;
        const C = CULTS[c];
        add(
          'Chant the Battlecry: ' + c + ' (' + C[0] + ')',
          async () => {
            const ok2 = await grant(
              u.id,
              'Chant: ' + c,
              C[1] ? [C[1]] : [],
              c === 'Conquest' ? { E: 2 } : null,
              'Chants the Battlecry of ' + c + ': ' + C[0]
            );
            if (ok2) {
              const CB = srChantBonus(u.id);
              if (CB && CB.units)
                await putState({
                  units: CB.units,
                  lastText:
                    (state.lastText || '') +
                    (CB.notes.length ? ' Chant bonus: ' + CB.notes.join(', ') + '.' : '')
                });
              {
                const SC = supOnChant(base(u.id), c);
                if (SC.notes.length)
                  await putState({
                    units: SC.units,
                    lastText: (state.lastText || '') + ' ' + SC.notes.join('; ') + '.'
                  });
              }
              {
                const next = await wadOnChant(u.id, c, seq);
                await frSet(u.side, 'wa', next.length ? { seq: next, histR: state.round } : { seq: [] });
              }
            }
          },
          rh(u.rules, 'Swarm')
            ? 'Swarm: it cannot Chant'
            : hasGrant(u, 'Chant: ' + c)
              ? 'Already chanted'
              : !fresh
                ? 'Only before the first action'
                : ''
        );
      });
    }
  }
  if (f === 'Sorcerer Kings' && hasDraw(u, /^Elemental Conduit/)) {
    const g = frG(u.side, 'sk'),
      rc = skRitualCourt(u.side),
      myC = (frRoles(u).find(x => /^Court of/.test(x)) || '').replace('Court of ', ''),
      conf = skConfluence(u.side);
    add(
      'Elemental Conduit: +1 Ritual Marker',
      () => {
        act.frConduit = true;
        frSet(
          u.side,
          'sk',
          { rm: (+g.rm || 0) + 1 },
          {
            lastTitle: N(u.side) + ' · Ritual',
            lastText: 'Elemental Conduit adds a Ritual Marker to ' + (g.ritual || 'the Ritual') + '.'
          }
        );
      },
      !g.ritual
        ? 'No Ritual is being prepared (see Faction rules)'
        : act.frConduit
          ? 'Already used'
          : rc && myC && rc !== myC && !conf
            ? 'The Ritual is of the Court of ' + rc + ' (only with Elemental Confluence, a Maharajah Warlord)'
            : ''
    );
  }
  if (f === 'Yoroni' && !act.frIdeal) {
    const ck0 = act.card && yCard(act.card) ? cardIdeal(act.card) : null,
      ofuda = ck0 === 'Mu' && upgOf(u, /Ofuda/),
      ck = ofuda ? null : ck0;
    out.push({
      head: ofuda
        ? 'Ofuda: the Mu Ideal Card may give the effect of another Ideal Card'
        : ck
          ? 'Activated by the ' + ck + ' Ideal Card'
          : 'Which Ideal Card activated it?'
    });
    (ck ? [ck] : Object.keys(IDEAL)).forEach(k => {
      const match = yMatch(u, k) || ofuda;
      add(
        k + (match ? ' · ' + IDEAL[k][0] : ' · no match, no effect'),
        () => yApply(u, k),
        hasGrant(u, 'Ideal Card: ' + k) ? 'Already gained from this card this round' : '',
        match ? 'pri' : ''
      );
    });
  }
  if (f === 'Weaver Courts' && fresh && !act.entering && !act.frBloom) {
    /* Wild Spirit (Gift): the Bloom may also spend Seed Markers of friendly regiments within 12″ */
    const donors =
      u.charName && upgOf(u, /Wild Spirit/)
        ? all()
            .filter(
              x =>
                x.side === u.side &&
                x.id !== u.id &&
                x.onTable &&
                !x.destroyed &&
                (+x.seeds || 0) > 0 &&
                polyDist(corners(u), corners(x)) <= 12
            )
            .sort((a, b) => (+b.seeds || 0) - (+a.seeds || 0))
        : [];
    const own = +u.seeds || 0,
      s = own + donors.reduce((a, x) => a + (+x.seeds || 0), 0),
      g = frG(u.side, 'wc');
    const spend = n => {
      const take = {};
      let left = n - Math.min(n, own);
      take[u.id] = Math.min(n, own);
      donors.forEach(x => {
        const k = Math.min(left, +x.seeds || 0);
        if (k) take[x.id] = k;
        left -= k;
      });
      return take;
    };
    [
      [1, 'Command Stand +2 Attacks (and Barrage +2)'],
      [2, "the Warlord's Bloom effect"],
      [3, 'the ' + (seasonNow(u.side) || 'current Season') + ' Court role']
    ].forEach(([n, t]) =>
      add(
        'Bloom (' + n + ' Seed' + (n > 1 ? 's' : '') + '): ' + t,
        async () => {
          act.frBloom = true;
          const br = n === 1 && hasRule(u, /^Barrage/) ? ['Barrage (+2)'] : [];
          const take = spend(n);
          await putState({
            units: state.units.map(x => {
              const y = take[x.id] ? Object.assign({}, x, { seeds: (+x.seeds || 0) - take[x.id] }) : x;
              return x.id === u.id ? grantU(y, 'Bloom: ' + t, br, null) : y;
            }),
            lastTitle: N(u.side) + ' · Bloom',
            lastText:
              'Bloom, spending ' +
              n +
              ' Seed Marker' +
              (n > 1 ? 's' : '') +
              ': ' +
              t +
              (n === 1 ? ' (apply the Command Stand Attacks yourself)' : '') +
              '.'
          });
          await srAfterBloom(u, n);
          if (n === 2) await supApplyBloom(u);
        },
        s < n
          ? 'Needs ' +
              n +
              ' Seed Marker' +
              (n > 1 ? 's' : '') +
              (donors.length ? ' (Wild Spirit: ' + s + ' in reach)' : '')
          : ''
      )
    );
  }
  if (f === 'Spires' && !act.entering && srStrain(u)) {
    const S = srStrain(u);
    add(
      'Strain Expression: ' + S[0] + ' (' + (S[1].join(', ') || S[2]) + '; Decay)',
      async () => {
        act.frDecay = true;
        await grant(
          u.id,
          'Strain: ' + S[0],
          S[1],
          S[3] || null,
          'Strain Expression, ' +
            S[0] +
            ': ' +
            S[1].concat(S[2] ? [S[2]] : []).join(', ') +
            '. Decay at the end of the activation.'
        );
        await srAfterStrain(u);
        if (supK(u.side) === 'Ruthless Competence' && /Infantry/.test(u.cls || ''))
          await grant(u.id, 'March +1 (Ruthless Competence)', []);
      },
      act.frDecay ? 'Already used' : !fresh ? 'Only before the first action' : ''
    );
  }
  if (f === 'Dweghom' && !act.entering) {
    const g = frG(u.side, 'dw'),
      ep = +g.ep || 0,
      F = FORGED[frBase(u)];
    const F2 =
      F && frBase(u) === 'Hellbringer Drake' && upgOf(u, /Hellbringer Sorcerer/)
        ? F.concat([
            [
              'Barrage +4 (twice; Armor Piercing stays at most 2)',
              3,
              ['Barrage (+4)', 'Armor Piercing (+1)']
            ],
            [
              'Barrage +6 (three times; Armor Piercing stays at most 2)',
              5,
              ['Barrage (+6)', 'Armor Piercing (+1)']
            ]
          ])
        : F;
    if (F2 && !act.frForged)
      F2.forEach(([t, cost, rules, stats, note, heal]) =>
        add(
          'Forged by the Elements (' + cost + '): ' + t,
          async () => {
            act.frForged = true;
            const fr = frPatch(u.side, 'dw', { ep: ep - cost });
            await putState({
              fr,
              units: state.units.map(x => {
                if (x.id !== u.id) return x;
                let y = grantU(x, 'Forged: ' + t, rules, stats);
                if (heal) y = Object.assign({}, y, { wounds: Math.max(0, (+y.wounds || 0) - heal) });
                if (!hasGrant(y, 'Awakened')) y = grantU(y, 'Awakened', awakenRules(y));
                return y;
              }),
              lastTitle: N(u.side) + ' · Forged by the Elements',
              lastText:
                t + (note ? ' (' + note + ')' : '') + '; Awakened. Elemental Power ' + (ep - cost) + '.'
            });
          },
          ep < cost ? 'Needs ' + cost + ' Elemental Power' : ''
        )
      );
    /* Runeforged Plate (Relic): Draw Event, spend 1 or 2 Elemental Power for +2 or +4 Attacks on the character */
    if (u.charName && upgOf(u, /Runeforged Plate/) && fresh && !act.rfPlate)
      [1, 2].forEach(n =>
        add(
          'Runeforged Plate (' +
            n +
            ' Elemental Power): the ' +
            u.charName +
            ' +' +
            2 * n +
            ' Attacks this round',
          async () => {
            act.rfPlate = true;
            await putState({
              fr: frPatch(u.side, 'dw', { ep: ep - n }),
              units: state.units.map(x =>
                x.id === u.id ? grantU(x, 'Runeforged Plate (+' + 2 * n + ' Attacks)', []) : x
              ),
              lastTitle: N(u.side) + ' · Runeforged Plate',
              lastText: 'The ' + u.charName + ' gains +' + 2 * n + ' Attacks until the end of the round.'
            });
          },
          ep < n ? 'Needs ' + n + ' Elemental Power' : ''
        )
      );
    if (!hasGrant(u, 'Awakened'))
      out.push({
        label: 'Awaken (from an ability)',
        fn: () => awaken(u.id, 'ability'),
        why: '',
        cls: 'ghost',
        kind: 'any'
      });
  }
  return out;
}

/* the Draw Events step of the activation panel */
function renderDrawStep(u, fresh) {
  const box = $('c-draw');
  box.innerHTML = '';
  if (act && act.entering) {
    box.appendChild(
      ptext(
        'Arriving from Reinforcements this round: its Draw Events are not resolved (core rules, Resolve Draw Events).' +
          (frFac(u) === "W'adrhŭn" ? ' It adds no Chant Marker and cannot Chant the Battlecry.' : ''),
        'hint'
      )
    );
    let it0 = [];
    try {
      it0 = frOptions(u).filter(it => it.kind !== 'any');
    } catch (e) {}
    it0 = it0.filter((it, i) => !it.head || (it0[i + 1] && !it0[i + 1].head));
    if (it0.length) {
      const wrap = document.createElement('div');
      wrap.className = 'fr-opts';
      it0.forEach(it => {
        if (it.head) {
          const h = document.createElement('div');
          h.className = 'dn-h';
          h.textContent = it.head;
          wrap.appendChild(h);
          return;
        }
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'dn-btn' + (it.cls === 'pri' ? ' pri' : '');
        b.textContent = it.label;
        if (it.why) {
          b.disabled = true;
          b.title = it.why;
        }
        b.onclick = () => {
          if (b.disabled) return;
          Promise.resolve(it.fn())
            .then(() => render())
            .catch(() => toast('That could not be saved. Try again.'));
        };
        wrap.appendChild(b);
      });
      box.appendChild(wrap);
    }
    return;
  }
  (act.drawNotes || []).forEach(t => {
    const d = document.createElement('div');
    d.className = 'dn auto';
    const i = document.createElement('span');
    i.className = 'dn-i';
    i.textContent = '✓';
    const s = document.createElement('span');
    s.textContent = t;
    d.append(i, s);
    box.appendChild(d);
  });
  if (fresh) {
    const notes = (act.drawNotes || []).join(' ').toLowerCase();
    (u.abilities || []).forEach(([n, t]) => {
      const nm = String(n),
        base = nm.replace(/\s*\(.*$/, '').trim();
      if (!isDrawAb(u, nm, t) && !fx(u).some(x => new RegExp('^' + base.replace(/[^A-Za-z ]/g, '.')).test(x)))
        return;
      if (
        /^(Bloom|Elemental Conduit|Forged by the Elements|Strain Expression|Memories of Old)/i.test(base) ||
        notes.includes(base.toLowerCase().split(' ')[0])
      )
        return;
      const d = document.createElement('div');
      d.className = 'dn ref';
      const i = document.createElement('span');
      i.className = 'dn-i';
      i.textContent = '•';
      const s2 = document.createElement('span');
      const b = document.createElement('b');
      b.textContent = nm.replace(/^Draw Event:\s*/i, '') + ': ';
      const auto = /^(Regeneration|Biotic Renewal|Bastion|Double Time)/i.test(base);
      s2.append(
        b,
        document.createTextNode(
          auto && /Regeneration|Biotic/i.test(base) && !(u.wounds > 0)
            ? 'nothing to heal right now.'
            : auto
              ? String(t).replace(/^Draw Event:\s*/i, '')
              : 'resolve it yourself. ' + String(t).replace(/^Draw Event:\s*/i, '')
        )
      );
      d.append(i, s2);
      box.appendChild(d);
    });
  }
  let items = [];
  try {
    items = frOptions(u).filter(it => it.kind !== 'any');
  } catch (e) {}
  if (!fresh) items = items.filter(it => it.head || it.why !== 'Only before the first action');
  // drop headers that have no buttons after them
  items = items.filter((it, i) => !it.head || (items[i + 1] && !items[i + 1].head));
  if (items.length) {
    const wrap = document.createElement('div');
    wrap.className = 'fr-opts';
    items.forEach(it => {
      if (it.head) {
        const h = document.createElement('div');
        h.className = 'dn-h';
        h.textContent = it.head;
        wrap.appendChild(h);
        return;
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dn-btn' + (it.cls === 'pri' ? ' pri' : '');
      b.textContent = it.label;
      if (it.why) {
        b.disabled = true;
        b.title = it.why;
        const sm = document.createElement('small');
        sm.textContent = it.why;
        b.appendChild(sm);
      }
      b.onclick = () => {
        if (b.disabled) return;
        Promise.resolve(it.fn())
          .then(() => render())
          .catch(() => toast('That could not be saved. Try again.'));
      };
      wrap.appendChild(b);
    });
    box.appendChild(wrap);
  }
  if (!box.children.length) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = fresh
      ? 'No Draw Events to resolve. Choose the first action below.'
      : 'No Draw Events were resolved.';
    box.appendChild(p);
  }
}
function renderFacBox() {
  const box = $('c-fac');
  if (!box) return;
  box.innerHTML = '';
  const u = byId(selId);
  if (!u || u.type === 'marker' || !(u.side === ME || SBX()) || aiBusy) {
    box.hidden = true;
    return;
  }
  const f = frFac(u),
    items = frOptions(u).filter(it => it.kind === 'any');
  const info = [];
  if (f === 'Weaver Courts')
    info.push([
      'Seed Markers',
      (+u.seeds || 0) + ' / 3',
      u.side === ME || SBX()
        ? [
            ['−', () => tfSeeds(u, -1), (+u.seeds || 0) <= 0],
            ['+', () => tfSeeds(u, 1), (+u.seeds || 0) >= 3]
          ]
        : []
    ]);
  if (f === 'Old Dominion') {
    const m = memOf(u);
    if (m) info.push(['Memory of Old', m.text + (hasGrant(u, 'Memories of Old') ? ' · active' : '')]);
  }
  if (f === 'Spires' && STRAIN[frBase(u)]) info.push(['Strain', STRAIN[frBase(u)][0]]);
  const R = frRoles(u);
  if (R.length) info.push(['Battlefield Role', R.filter(r => r !== 'Character').join(', ')]);
  const SB = u.warlord ? supBlock(u.side, true) : u.dynAlly ? supBlock(u.side, true, 'ally') : null;
  if (!items.length && !info.length && !SB) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  box.append(bEl('h3', { textContent: 'Faction rules · ' + f }));
  if (SB) {
    box.append(bEl('div', { className: 'tf-l', textContent: 'Warlord · Supremacy Ability' }), SB);
  }
  info.forEach(([a, b, btns]) => {
    const r = bEl('div', { className: 'tf-row' });
    r.append(bEl('span', { className: 'tf-l', textContent: a + ':' }), bEl('span', { textContent: b }));
    (btns || []).forEach(([t, fn, dis]) => {
      const x = abBtn(t, fn, 'ab-sq');
      x.disabled = !!dis;
      x.setAttribute('aria-label', (t === '+' ? 'More ' : 'Fewer ') + a);
      r.append(x);
    });
    box.append(r);
  });
  const wrap = bEl('div', { className: 'fr-opts' });
  items.forEach(it => {
    if (it.head) {
      wrap.append(bEl('div', { className: 'tf-l', textContent: it.head }));
      return;
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn' + (it.cls === 'pri' ? '' : ' ghost');
    b.textContent = it.label;
    if (it.why) {
      b.disabled = true;
      b.title = it.why;
    }
    b.onclick = () => {
      if (b.disabled) return;
      Promise.resolve(it.fn())
        .then(() => render())
        .catch(() => toast('That could not be saved. Try again.'));
    };
    wrap.append(b);
  });
  if (items.length) box.append(wrap);
}
function tfSeeds(u, d) {
  return putState({
    units: state.units.map(x =>
      x.id === u.id ? Object.assign({}, x, { seeds: Math.max(0, Math.min(3, (+x.seeds || 0) + d)) }) : x
    )
  });
}

/* always-visible summary of faction tokens and trackers */
function frSummary(side, f) {
  const g = k => frG(side, k);
  if (f === 'Old Dominion') {
    const o = g('od');
    return [
      'Dark Power: ' + (+o.dark || 0) + ' tokens (Tier ' + ROMAN[odTier(side, 'dark')] + ')',
      'Fallen Pantheon: ' + (+o.pant || 0) + ' tokens (Tier ' + ROMAN[odTier(side, 'pant')] + ')'
    ];
  }
  if (f === 'Nords') {
    const o = g('no');
    return [
      'Tribal Tactic: ' +
        (o.round === (state.round || 1) ? o.tactic + ' (this round)' : o.used ? 'used' : 'available')
    ];
  }
  if (f === "W'adrhŭn") {
    const o = g('wa');
    return ['Chant: ' + ((o.seq || []).join(', ') || 'no markers') + ' (' + (o.seq || []).length + '/3)'];
  }
  if (f === 'Sorcerer Kings') {
    const o = g('sk');
    return [
      o.ritual ? 'Ritual: ' + o.ritual + ' ' + (+o.rm || 0) + '/' + (o.th || 7) : 'No Ritual being prepared'
    ];
  }
  if (f === 'Weaver Courts') {
    const o = g('wc'),
      seeds = (state.units || [])
        .filter(u => u.side === side && !u.destroyed)
        .reduce((a, u) => a + (+u.seeds || 0), 0);
    return [
      (o.season ? 'Season: ' + o.season : 'Season not chosen') +
        ' · ' +
        seeds +
        ' Seed Marker' +
        (seeds === 1 ? '' : 's')
    ];
  }
  if (f === 'Spires') return ['Sect: ' + (spSect(side) || 'not chosen')];
  if (f === 'Dweghom') {
    const o = g('dw');
    return [(dwCreed(side) || 'No Creed') + ' · Elemental Power ' + (+o.ep || 0) + '/10'];
  }
  if (f === 'City States' && stratU({ side, fac: 'City States' }))
    return [
      PS().strategicHeld && side === ME && !SBX() ? 'Strategic Stack: 1 card' : 'Strategic Stack: empty'
    ];
  return [];
}
function renderFrStrip() {
  const el = $('fr-strip');
  if (!el) return;
  el.innerHTML = '';
  const st = state.step || 'activations';
  if (!state || ['setup', 'review'].includes(st)) {
    el.hidden = true;
    return;
  }
  const sides = SBX() ? ['cs', 'nord'] : PVP() ? [ME, other(ME)] : [HU, AI];
  sides.forEach(side =>
    frFacs(side).forEach(f =>
      frSummary(side, f)
        .concat(f === frFacs(side)[0] && supChip(side) ? ['Supremacy: ' + supChip(side)] : [])
        .forEach(t => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = side;
          const who = SBX()
            ? side === 'cs'
              ? 'South'
              : 'North'
            : side === ME
              ? PN(side) || 'You'
              : PN(side) || N(side);
          b.innerHTML = '';
          const bb = document.createElement('b');
          bb.textContent = who + ': ';
          b.append(bb, document.createTextNode(t));
          b.title = 'Open the Faction rules panel';
          b.onclick = () => {
            frOpen = true;
            renderTurnbar();
            const d = document.querySelector('#turnbar .fr-panel');
            if (d) d.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          };
          el.appendChild(b);
        })
    )
  );
  el.hidden = !el.children.length;
}
/* the Faction rules panel: trackers per side */
let frOpen = false;
function frPanel() {
  const d = bEl('details', { className: 'vc fr-panel' });
  d.open = frOpen;
  d.ontoggle = () => {
    frOpen = d.open;
  };
  d.append(bEl('summary', { textContent: 'Faction rules and Supremacy' }));
  let any = false;
  ['cs', 'nord'].forEach(side => {
    const facs = frFacs(side);
    if (!facs.length) return;
    const mine = side === ME || SBX();
    facs.forEach(f => {
      const blk = frBlock(side, f, mine);
      if (!blk) return;
      any = true;
      const h = bEl('div', {
        className: 'en-tag',
        textContent:
          (SBX() ? (side === 'cs' ? 'South' : 'North') : N(side)) + ' · ' + f + (side === ME ? ' (you)' : '')
      });
      h.style.marginTop = '8px';
      d.append(h, blk);
    });
  });
  ['cs', 'nord'].forEach(side =>
    ['', 'ally'].forEach(who => {
      const blk = supBlock(side, side === ME || SBX(), who || undefined);
      if (!blk) return;
      any = true;
      const h = bEl('div', {
        className: 'en-tag',
        textContent:
          (SBX() ? (side === 'cs' ? 'South' : 'North') : N(side)) +
          (who ? ' · Dynastic Ally’s Supremacy Ability' : ' · Supremacy Ability') +
          (side === ME ? ' (you)' : '')
      });
      h.style.marginTop = '8px';
      d.append(h, blk);
    })
  );
  if (!any) d.append(ptext('No faction trackers are needed for the armies on the table.'));
  return d;
}
function frRow(label, ...kids) {
  const r = bEl('div', { className: 'tf-row' });
  if (label) r.append(bEl('span', { className: 'tf-l', textContent: label }));
  kids.forEach(k => k && r.append(k));
  return r;
}
function frStep(side, k, key, val, min, max, label) {
  return abStepper(val, min, max, v => frSet(side, k, { [key]: v }), label);
}
function frBlock(side, f, mine) {
  const box = bEl('div', { className: 'fr-blk' }),
    R = state.round || 1,
    lock = el => {
      if (!mine) el.querySelectorAll('button,select,input').forEach(b => (b.disabled = true));
      return el;
    };
  if (f === 'City States') {
    const eid = (state.units || []).filter(
      u => u.side === side && srAlive(u) && /Eidolon/.test(u.charName || '')
    );
    eid.forEach(u => {
      const cur = cdirOf(u);
      box.append(
        frRow(
          'Combat Directive · ' + (u.short || u.name) + ':',
          ...cdirKeys(u).map(k => {
            const b = abBtn(k, () => cdirSet(u.id, k), 'ab-tog' + (cur === k ? ' on' : ''));
            b.disabled = !!cur;
            return b;
          })
        )
      );
    });
    if (!canStrat(side)) return eid.length ? lock(box) : null;
    box.append(
      ptext(
        'Strategic Stack and Direct Orders are applied automatically: hold a card face down once per round, and Entourage activations count as Strategic Stack activations (Inspired).'
      )
    );
    return box;
  }
  if (f === 'Old Dominion') {
    const g = frG(side, 'od'),
      tD = odTier(side, 'dark'),
      tP = odTier(side, 'pant'),
      s = Math.trunc((odPts(side) - 2000) / 250) * 2;
    {
      const gg = bEl('div', { className: 'od-trk' });
      const a = odGauge(side, 'dark'),
        b2 = odGauge(side, 'pant');
      a.onclick = b2.onclick = null;
      gg.append(a, b2);
      box.append(gg);
    }
    box.append(
      frRow(
        'Change Dark Power tokens:',
        frStep(side, 'od', 'dark', +g.dark || 0, 0, 40, 'Dark Power tokens')
      ),
      frRow(
        'Change Fallen Pantheon tokens:',
        frStep(side, 'od', 'pant', +g.pant || 0, 0, 40, 'Fallen Pantheon tokens')
      )
    );
    box.append(
      ptext(
        'Tiers at ' +
          odPts(side) +
          ' points: II from ' +
          (9 + s) +
          ', III from ' +
          (18 + s) +
          ', IV from ' +
          (23 + s) +
          ' (Dark Power IV only with Obdurate Bone and Stone or Glimmers of a Golden Age).'
      )
    );
    if (g.soma !== R)
      box.append(
        frRow(
          'Blasphemous Soma, round ' + R + ':',
          abBtn('+1 Dark Power', () => frSet(side, 'od', { dark: (+g.dark || 0) + 1, soma: R }), 'ab-tog'),
          abBtn(
            '+1 Fallen Pantheon',
            () => frSet(side, 'od', { pant: (+g.pant || 0) + 1, soma: R }),
            'ab-tog'
          )
        )
      );
    odPendingBox(side, box, g, mine);
    const fxl = [];
    if (tD >= 2) fxl.push('Dark II: regiments may use Memories of Old as a Draw Event');
    if (tD >= 3) fxl.push('Dark III: Animate Vessel regiments are Inspired (applied)');
    if (tD >= 4)
      fxl.push('Dark IV: enemies engaged with your Animate Vessels re-roll successful Morale tests');
    if (tP >= 2)
      fxl.push(
        'Pantheon ' +
          tP +
          ': the Fallen Divinity uses its Tier ' +
          (tP >= 3 ? 'III' : 'II') +
          ' profile (heal ' +
          (tP >= 3 ? 6 : 4) +
          ' on first reaching it)'
      );
    box.append(
      ptext(
        fxl.length
          ? fxl.join(' · ')
          : 'Tier I: no pool effects yet. Memories of Old is available as an action to regiments that have one.'
      )
    );
    return lock(box);
  }
  if (f === 'Nords') {
    const g = frG(side, 'no'),
      wl = (state.units || []).find(u => u.side === side && u.warlord),
      multi = wl && /Jarl|Konungyr/.test(wl.charName || '');
    const row = frRow('Tribal Tactic (once per game, after Supremacy):');
    Object.keys(TACTICS).forEach(t => {
      const b = abBtn(
        (g.tactic === t && g.round === R ? '✓ ' : '') + t,
        async () => {
          const units = state.units.map(u => {
            if (u.side !== side || u.type === 'marker' || frFac(u) !== 'Nords') return u;
            const r = frRoles(u);
            if (!(r.includes('Mortals') || r.includes('Exalted') || u.charName)) return u;
            return grantU(u, 'Tribal Tactic: ' + t, TACTICS[t]);
          });
          await putState({
            units,
            fr: frPatch(side, 'no', { tactic: t, round: R, used: (+g.used || 0) + 1 }),
            lastTitle: N(side) + ' · Tribal Tactics',
            lastText: t + ' for Mortals, Exalted and Characters until the end of the round.'
          });
        },
        'ab-tog' + (g.tactic === t && g.round === R ? ' on' : '')
      );
      b.disabled = g.round === R || (!!g.used && !multi && !SBX());
      row.append(b);
    });
    box.append(
      row,
      ptext(
        g.used
          ? 'Used ' +
              g.used +
              '× (last: ' +
              g.tactic +
              ', round ' +
              g.round +
              ').' +
              (multi ? ' Your Warlord may use Tactics again.' : '')
          : 'Direct Assault!: Relentless Blows · Draw Them In!: Tenacious +1 · Take the Flanks!: Opportunist on Volleys, Fury and a fixed 4 on Charges into flank or rear (apply the last two yourself).'
      )
    );
    box.append(ptext('Prophecy Unfulfilled (+2″ Charge against engaged enemies) is applied automatically.'));
    return lock(box);
  }
  if (f === "W'adrhŭn") {
    const g = frG(side, 'wa'),
      seq = g.seq || [];
    const r = frRow('Chant Sequence:');
    seq.forEach(c => r.append(abChip(c)));
    if (!seq.length) r.append(bEl('span', { className: 'tf-l', textContent: 'empty' }));
    if (seq.length) r.append(abBtn('Clear', () => frSet(side, 'wa', { seq: [] }), 'ab-ghost ab-small'));
    box.append(
      r,
      ptext(
        'Each activation adds a marker (choose it in the activation panel). With 3 markers a regiment may Chant before its first action: Famine Dread, War Cleave +1, Death Deadly Blades, Conquest +2 Evasion. Conquest markers can stand in for another cult.'
      )
    );
    return lock(box);
  }
  if (f === 'Sorcerer Kings') {
    const g = frG(side, 'sk');
    const sel = bEl('select', { className: 'tf-in' });
    sel.setAttribute('aria-label', 'Ritual being prepared');
    sel.append(bEl('option', { value: '', textContent: 'No Ritual being prepared' }));
    Object.entries(RITUALS).forEach(([c, L]) => {
      const og = bEl('optgroup');
      og.label = c;
      L.forEach(([n, t]) =>
        og.append(bEl('option', { value: n, textContent: n + ' (' + t + ')', selected: g.ritual === n }))
      );
      sel.append(og);
    });
    sel.onchange = () => {
      const n = sel.value,
        th = (Object.values(RITUALS)
          .flat()
          .find(x => x[0] === n) || [0, 7])[1],
        dis = n && g.dis !== R;
      frSet(
        side,
        'sk',
        { ritual: n, th, rm: dis ? Math.min(R, 5) : 0, dis: dis ? R : g.dis },
        {
          lastTitle: N(side) + ' · Ritual',
          lastText: n
            ? n +
              ' is Being Prepared' +
              (dis ? '; Elemental Discharge adds ' + Math.min(R, 5) + ' markers.' : '.')
            : 'No Ritual is being prepared.'
        }
      );
    };
    box.append(frRow('Ritual:', sel));
    if (g.ritual) {
      const done = (+g.rm || 0) >= (+g.th || 7);
      box.append(
        frRow(
          'Ritual Markers ' + (+g.rm || 0) + ' / ' + (g.th || 7),
          frStep(side, 'sk', 'rm', +g.rm || 0, 0, 20, 'Ritual Markers'),
          done
            ? abBtn(
                'Resolved: start again',
                () => frSet(side, 'sk', { rm: 0, ritual: '' }),
                'ab-ghost ab-small'
              )
            : null
        )
      );
      if (done)
        box.append(
          ptext(
            'Complete: its Command Card goes into your Command Stack at the start of your next Command Phase.',
            'warn'
          )
        );
    }
    if (
      (state.units || []).some(
        u => u.side === side && (rh(u.rules, 'Fury of the Tempest') || rh(u.rules, 'Eye of the Storm'))
      )
    )
      box.append(
        frRow(
          'Court of Air Ritual card activated in your last draw:',
          abBtn(
            g.airNow ? 'Yes' : 'No',
            () => frSet(side, 'sk', { airNow: !g.airNow }),
            'ab-tog' + (g.airNow ? ' on' : '')
          )
        )
      );
    box.append(
      ptext(
        'Each spell of the Ritual’s Court that is cast, even a failed one, adds 1 marker (applied automatically; Shu’laat adds one more once per activation). Elemental Conduit adds 1 from the activation panel: only for its own Court’s Ritual, unless a Maharajah Warlord gives Elemental Confluence. The first new Ritual each round starts with markers equal to the round (max 5). With Elemental Confluence, a completed Ritual may be followed at once by one of a different Court.'
      )
    );
    return lock(box);
  }
  if (f === 'Weaver Courts') {
    const g = frG(side, 'wc');
    const r = frRow(
      g.season
        ? 'Season: ' + g.season + ' (' + SEASONFX[g.season][0] + ')'
        : 'Start the Cycle of Seasons with:'
    );
    if (!g.season)
      SEASONS.forEach(s =>
        r.append(
          abBtn(
            s,
            () =>
              putState({
                fr: frPatch(side, 'wc', { season: s, round: R }),
                units: frSeasonUnits(state.units, side, s),
                lastTitle: N(side) + ' · Cycle of Seasons',
                lastText: 'The Cycle starts in ' + s + '.'
              }),
            'ab-tog'
          )
        )
      );
    else
      r.append(
        abBtn(
          'Change',
          () =>
            putState({
              fr: frPatch(side, 'wc', { season: null }),
              units: state.units.map(x => (x.side === side ? ungrantU(x, src => /^Season: /.test(src)) : x))
            }),
          'ab-ghost ab-small'
        )
      );
    box.append(r);
    const wlC = wcCourtOf(supWl(side));
    let cs;
    if (wlC) cs = bEl('span', { textContent: 'Court of ' + wlC + ' (from the Warlord)' });
    else {
      cs = bEl('select', { className: 'tf-in' });
      cs.setAttribute('aria-label', "Warlord's Seasonal Court");
      SEASONS.forEach(s =>
        cs.append(
          bEl('option', { value: s, textContent: 'Court of ' + s, selected: (g.court || 'Spring') === s })
        )
      );
      cs.onchange = () => frSet(side, 'wc', { court: cs.value });
    }
    box.append(
      frRow("Warlord's Seasonal Court:", cs),
      ptext(
        'The Season advances at the end of every round and its effect is applied to regiments of the matching Court. Regiments gain a Seed Marker after a Clash or Volley (max 3) and spend them on Bloom in the activation panel.'
      )
    );
    return lock(box);
  }
  if (f === 'Spires') {
    const g = frG(side, 'sp');
    (state.units || [])
      .filter(u => u.side === side && privOk(u))
      .forEach(u =>
        box.append(
          frRow(
            'Privileged Observer · ' + (u.short || u.name) + ':',
            abBtn(
              'Make it Medium (before the first Reinforcements)',
              () =>
                putState({
                  units: state.units.map(x =>
                    x.id === u.id ? Object.assign({}, x, { cls: x.cls.replace(/Light/, 'Medium') }) : x
                  ),
                  lastTitle: N(side) + ' · Privileged Observer',
                  lastText: (u.short || u.name) + ' becomes a Medium regiment.'
                }),
              'ab-tog'
            )
          )
        )
      );
    const sect = spSect(side),
      fromList = !!spSectList(side);
    const r = frRow('Sect:');
    if (fromList) r.append(bEl('strong', { textContent: sect + ' (from the army list)' }));
    else
      SECTS.forEach(s =>
        r.append(
          abBtn(
            (sect === s ? '✓ ' : '') + s,
            () => frSet(side, 'sp', { sect: s }),
            'ab-tog' + (sect === s ? ' on' : '')
          )
        )
      );
    box.append(r);
    box.append(
      ptext(
        sect === 'Underspire'
          ? 'Underspire: Drone and Clone regiments heal 2 at the start of each activation (applied); Drones may Heal while Broken and have Indomitable from their size.'
          : sect === 'Directorate'
            ? 'Directorate: once per round set the drawn card aside and draw the next; apply it with your Command Stack.'
            : sect === 'Sovereign Lineage'
              ? 'Sovereign Lineage: Husk regiments gain Inspired and Aimed Shot while attacking an enemy below starting strength.'
              : 'Pick the army’s Sect.'
      )
    );
    box.append(
      ptext(
        'Strain Expression is offered in the activation panel; Decay wounds are applied at the end of that activation.'
      )
    );
    return lock(box);
  }
  if (f === 'Dweghom') {
    const g = frG(side, 'dw'),
      cr = dwCreed(side);
    const r = frRow('Creed:');
    ['Ardent', 'Tempered', 'Clan', 'Ardent and Tempered'].forEach(c =>
      r.append(
        abBtn(
          (cr === c ? '✓ ' : '') + c,
          () => frSet(side, 'dw', { creed: c }),
          'ab-tog' + (cr === c ? ' on' : '')
        )
      )
    );
    box.append(
      r,
      frRow(
        'Elemental Power ' + (+g.ep || 0) + ' / 10',
        frStep(side, 'dw', 'ep', +g.ep || 0, 0, 10, 'Elemental Power')
      ),
      ptext(
        (/Ardent/.test(cr)
          ? 'Ardent: regiments are Awakened after a successful Charge (applied); all regiments have Pathfinders. '
          : '') +
          (/Tempered/.test(cr)
            ? 'Tempered: casting an Elemental spell adds a marker (applied automatically); casters may spend 2 per +1 Wizard (adjust the pool yourself). '
            : '') +
          (cr === 'Clan'
            ? 'Clan: Awakened Clan regiments gain Oblivious and Iron Discipline (applied). '
            : '') +
          'Forged regiments add 1 Elemental Power at the end of an activation without Forged by the Elements (applied). Awakened regiments cannot become Broken. Dweghom regiments cannot be Shattered.'
      )
    );
    return lock(box);
  }
  if (f === 'Yoroni') {
    box.append(
      ptext(
        'Ideal Cards: choose which card activated a regiment in the activation panel; a matching card grants its effect until the end of the round. Yoroni regiments cannot make Entourage activations.'
      )
    );
    return box;
  }
  if (f === 'Hundred Kingdoms') {
    box.append(
      ptext(
        'Relentless Drills: Veteran Infantry regiments with 5 or more stands count as Inspired (applied).'
      )
    );
    return box;
  }
  return null;
}

/* end of round: drop round-long grants, advance the Seasons */
function frRoundEnd(units, nextRound) {
  let fr = JSON.parse(JSON.stringify(state.fr || {}));
  units = units
    .map(suiRestore)
    .map(u =>
      rh(u.rules, 'Enlightening Fury') ? ungrantU(u, src => !/^Ideal Card: /.test(src)) : ungrantU(u)
    );
  ['cs', 'nord'].forEach(side => {
    const g = (fr[side] || {}).wc || {};
    if (g.season && units.some(u => u.side === side && frFac(u) === 'Weaver Courts')) {
      const nx = SEASONS[(SEASONS.indexOf(g.season) + 1) % 4];
      fr[side].wc = Object.assign({}, g, { season: nx, round: nextRound });
      const keep = state.fr;
      state.fr = fr;
      units = frSeasonUnits(units, side, nx);
      state.fr = keep;
    }
  });
  return { units, fr };
}
