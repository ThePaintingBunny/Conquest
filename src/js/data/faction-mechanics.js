/*
 * Faction mechanic tables
 *
 * Small lookup tables for each faction's own mechanic: Spires Strains and Sects, Dweghom Forged
 * effects, Sorcerer Kings Rituals, W'adrhŭn Cults, Weaver Courts Seasons, Nords Tribal Tactics, Yoroni
 * Ideals and Commander bonuses.
 *
 * In this file: STRAIN, FORGED, RITUALS, CULTS, SEASONS, SEASONFX, TACTICS, IDEAL, SECTS, CMDR
 */

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

/* Spires: the army's Sect. Chosen in the army builder (it travels with the list as the army rule "Sect: …"); an army
   without one (an older list, the test field) can still pick it in the faction panel. */
const SECTS = ['Underspire', 'Directorate', 'Sovereign Lineage'];

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
