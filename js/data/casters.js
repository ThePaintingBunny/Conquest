/*
 * Spellcasters
 *
 * Which regiments and characters cast, at what level, and which spell schools or courts they draw from.
 *
 * In this file: SK_COURTS, DW_SCHOOLS, HK_SCHOOLS, CASTERS
 */

const SK_COURTS = {
  Fire: ['Burn to Cinders', 'Cauterize', 'Ignite', 'Searing Sandstorm', 'Molten Blades', 'Wreathed in Fire'],
  Air: ['Lifting Winds', 'Lightning Bolt', 'Homing Winds', 'Air Step', 'Cyclone', 'Wind Kissed Blades'],
  Earth: [
    'Sunder (the Land)',
    'Stabilize (the Pattern)',
    'Overwhelm (the Form)',
    'Reinforce (the Pattern)',
    'Hurl (the Earth)',
    'Reincarnate (the Self)'
  ],
  Water: [
    'Blood to Water',
    'Lammelar Flow',
    'Swirling Embrace',
    'Induced Hypoxia',
    'Flowing Stride',
    'Water to Blood'
  ]
};

const DW_SCHOOLS = {
  Fire: ['Coruscation', 'Fireball', 'Flamewall'],
  Magma: ['Magmatic Seep', 'Pyroclast', 'Eruption'],
  Earth: ['Broken Ground', 'Roots of Stone', 'Rock Shaping']
};

const HK_SCHOOLS = {
  Fire: ['Kindle Courage', 'Fire Dart'],
  Earth: ['Earth to Mud', 'Stone Spikes'],
  Water: ["Ninuah's Tears", 'Call Fog'],
  Air: ['Seeking Winds', 'Guide']
};

/* who knows what: fixed spells plus, for casters that choose, a school or court */
const CASTERS = {
  Shaman: { f: ['Blurred Vision', 'Mist Weave', 'Enrage', 'Reshape Destiny', 'Hoarfrost', 'Dominate'] },
  Volva: {
    f: [
      'Fruit of the Golden Tree',
      "Warbringer's Light",
      "Hela's Caress",
      'Glory of Valhalla',
      'Aspect of Fenrir'
    ]
  },
  'Ice Jotnar': { f: ['Encase', 'Rime Storm', 'Ice Armor'], reg: 1, free: 1 },
  Mechanist: { f: ['Aggression Directive', 'Clockwork Parade', 'Iron Stride', 'Torque'] },
  'Sacred Band': { f: ['Othismos', 'Molon Labe'], reg: 1, free: 1 },
  Promethean: { f: ['Temper Resolve', 'Quench Blades'], reg: 1, free: 1 },
  Hephaestian: { f: ['Trident Strike', "Crucible's Fire"], reg: 1, free: 1 },
  'Scion of Conquest': { f: ['Crescendo', 'Discordance', 'Dissonance', 'Resonance', 'Cacophony'] },
  Hierodeacon: {
    f: ['Dark Supplication', 'Blackflame Coruscation', 'Benediction of the Black Sun', 'Undying Devotion']
  },
  Archimandrite: { f: ["Hazlia's Touch", 'Dark Immolation', 'Blasphemous Power', 'Unholy Baptism'] },
  Theokrator: { f: ["Hazlia's Touch", 'Dark Immolation', 'Blasphemous Power', 'Unholy Baptism'] },
  Kheres: { f: ['Insanity', 'Drain Will'], reg: 1, free: 1, lvl: '2xstands', mem: 1 },
  Moroi: { f: ['Immolation', 'Translocation'], reg: 1, free: 1, lvl: '2xstands', mem: 1 },
  Maharajah: { sch: SK_COURTS, label: 'Court' },
  Sorcerer: { sch: SK_COURTS, label: 'Court' },
  Raj: { sch: SK_COURTS, label: 'Court' },
  'Trinavarta Chandavat': { f: ['Lifting Winds', 'Lightning Bolt'], reg: 1 },
  'Marid Sahar': { f: ['Blood to Water'], reg: 1, free: 1 },
  'Marid Apsara': { f: ['Blood to Water', 'Flowing Stride', 'Swirling Embrace'], reg: 1 },
  'Kitsune Onmyoji': {
    f: [
      'Iron Soul of Discipline',
      'Hesitation, Bane of Deeds',
      'Blossom in the Wind',
      'Misery of Failure Envisioned'
    ]
  },
  'Jorogumo Mahotsu': {
    f: ['Repose in Healing Spring', 'Honor, a Void of Self', 'Dancing Shadows', 'Witness of the Void'],
    reg: 1,
    extra: 1
  },
  'Seanchas Sidhe': {
    sch: {
      Summer: ['Disseminate', 'Dehydrate', 'Heat Haze', 'Propagate'],
      Winter: ['Dark of Winter', 'Armor of Rime', 'Mouldering Bloom', 'Heart of Winter']
    },
    label: 'Court'
  },
  'Chapter Mage': { f: ['Elemental Vortex', 'Elemental Missile'], sch: HK_SCHOOLS, label: 'School' },
  'Theist Priest': { f: ["Saint's Favour", 'Divine Sanction', 'Heavenly Blessing', 'Holy Fire', 'Fervour'] },
  'Ardent Kerawegh': { f: ['Fear', 'Dismay', 'Rancor', 'Resolve', 'Litanies of Battle'] },
  'Tempered Sorcerer': { sch: DW_SCHOOLS, label: 'School' },
  'Tempered Steelshaper': { f: ['Hone Blades', 'Temper Plate', 'Unmake Armor'] },
  'Lost Ancestor': { f: ['Litanies of Battle', 'Songs of the Descent'], sch: DW_SCHOOLS, label: 'School' }
};
