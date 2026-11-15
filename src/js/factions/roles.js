/*
 * Faction and roles
 *
 * Which faction a regiment belongs to and its roles within it (for example Mortals, Exalted, The
 * Legion), which decide what faction rules apply to it.
 *
 * In this file: frN, FROLES, frBase(), frFac(), frEncy(), frRoles(), frFacs()
 */

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
