/*
 * Dweghom: army list
 *
 * The army list entry: army rules, every regiment and character with its profile, options and warbands.
 */

ENCY.push({
  name: 'Dweghom',
  version: '2026 Post-Adepticon update (30 March 2026)',
  source: 'https://www.para-bellum.com/wp-content/uploads/2026/03/DWEGHOM-TLAOK-2026-POST-ADEPTICON.pdf',
  armyRules: [
    'Creeds (Ardent, Tempered, Clan)',
    'The Gift (Awakened)',
    'Forged (Elemental Power pool)',
    'Dweghom regiments cannot be Shattered',
    'Heralds',
    'Relics',
    'Masteries',
    "one Mnemancer's Apprentice per army"
  ],
  units: [
    {
      name: 'Ardent Kerawegh',
      kind: 'char',
      type: 'Infantry',
      cls: '',
      pts: 100,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: '-', V: 1, C: 3, A: 5, W: 5, R: 4, D: 3, E: 0 },
      rules: ['Cleave (1)', 'Priest (6)', 'Tenacious (1)'],
      draw: [],
      options:
        'Supremacy: Herald of War; spells: Fear, Dismay, Rancor, Resolve, Litanies of Battle; Relics; Masteries',
      warband:
        'Mainstay: Flame Berserkers (max 2), Hold Ballistae, Hold Warriors, Initiates; Restricted: Lost, Wardens'
    },
    {
      name: 'Hold Raegh',
      kind: 'char',
      type: 'Infantry',
      cls: '',
      pts: 100,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: '-', V: 1, C: 4, A: 5, W: 5, R: 4, D: 4, E: 0 },
      rules: ['Cleave (2)', 'Hardened (1)'],
      draw: ['Preternatural Focus (a friendly regiment within 10" becomes Awakened)'],
      options:
        'Supremacy: First Born of War; Relics; Masteries; Bergont Raegh option (30, Warlord only, rides an Ironclad Drake)',
      warband:
        'Mainstay: Hold Ballistae, Hold Warriors, Hold Thanes, Initiates; Restricted: Dragonslayers, Ironclad Drake, Wardens'
    },
    {
      name: 'Exemplar',
      kind: 'char',
      type: 'Infantry',
      cls: '',
      pts: 100,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: '-', V: 1, C: 3, A: 5, W: 5, R: 4, D: 3, E: 0 },
      rules: ['Shield', 'Counter Attack', 'Cleave (1)', 'Flurry', 'Quicksilver Strikes', 'Hardened (1)'],
      draw: [],
      options: 'Supremacy: Paragon of War; Relics; Masteries',
      warband:
        'Mainstay: Hold Ballistae, Hold Warriors, Initiates, Wardens; Restricted: Dragonslayers, Flame Berserkers, Hold Thanes'
    },
    {
      name: 'Tempered Sorcerer',
      kind: 'char',
      type: 'Infantry',
      cls: '',
      pts: 110,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: '-', V: 3, C: 2, A: 4, W: 5, R: 3, D: 2, E: 0 },
      rules: ['Barrage (4) (16")', 'Wizard (7)'],
      draw: [],
      options: 'Supremacy: Forgemaster; one free School (Fire, Magma or Earth); Relics; Masteries',
      warband:
        'Mainstay: Fireforged, Hold Ballistae, Hold Warriors, Inferno Automata (max 2); Restricted: Found, Hellbringer Drake, Magmaforged, Stoneforged'
    },
    {
      name: 'Tempered Steelshaper',
      kind: 'char',
      type: 'Infantry',
      cls: '',
      pts: 110,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: '-', V: 2, C: 3, A: 4, W: 6, R: '-', D: 3, E: 3 },
      rules: ['Wizard (7)', 'Terrifying (1)', 'Smite'],
      draw: [],
      options:
        'Supremacy: Thesis/Antithesis/Synthesis; spells: Hone Blades, Temper Plate, Unmake Armor; Relics; Masteries',
      warband:
        'Mainstay: Fireforged, Magmaforged, Inferno Automata (max 2); Restricted: Hellbringer Drake, Steelforged, Stoneforged'
    },
    {
      name: 'Lost Ancestor',
      kind: 'char',
      type: 'Brute',
      cls: '',
      pts: 120,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: '-', V: 1, C: 3, A: 5, W: 6, R: 4, D: 3, E: 3 },
      rules: ['Cleave (2)', 'Wizard (6)', 'Hardened (1)', 'Lethal Demise (6)'],
      draw: ['Unassailable Authority (attached regiment becomes Awakened)'],
      options:
        'Supremacy: Living Legend; spells: Litanies of Battle, Songs of the Descent and one full School; Relics; Masteries',
      warband:
        'Can attach to Infantry. Mainstay: Fireforged, Found (max 2), Initiates, Lost (max 2), Wardens; Restricted: Magmaforged, Steelforged'
    },
    {
      name: 'Dragonslayers',
      kind: 'reg',
      type: 'Infantry',
      cls: 'Heavy',
      pts: 220,
      extra: 70,
      stands: '3 stands of 4 models',
      stats: { M: 5, V: 1, C: 4, A: 5, W: 5, R: 4, D: 4, E: 0 },
      rules: ['Cleave (3)', 'Fiend Hunter', 'Vanguard (3)', 'Fearless'],
      draw: [],
      options: "Officer: Mnemancer's Apprentice 20",
      warband: 'Clan',
      cmd: { leader: true, bearer: true }
    },
    {
      name: 'Fireforged',
      kind: 'reg',
      type: 'Infantry',
      cls: 'Medium',
      pts: 160,
      extra: 50,
      stands: '3 stands of 4 models',
      stats: { M: 5, V: 2, C: 2, A: 3, W: 5, R: 3, D: 3, E: 0 },
      rules: ['Barrage (3) (14", Armor Piercing (1))', 'Shield', 'Forged by the Elements'],
      draw: [],
      options: 'Officer: Flamecaster 20; Empowerment: Barrage +2',
      warband: 'Tempered, Forged',
      cmd: { leader: true, bearer: true }
    },
    {
      name: 'Flame Berserkers',
      kind: 'reg',
      type: 'Infantry',
      cls: 'Light',
      pts: 155,
      extra: 60,
      stands: '3 stands of 4 models',
      stats: { M: 6, V: 1, C: 3, A: 6, W: 5, R: '-', D: 2, E: 1 },
      rules: ['Aura of Death (2)', 'no Resolve, cannot Break'],
      draw: [],
      options: 'Officer: Herald of Fire 20; no attached Character',
      warband: 'Ardent',
      cmd: { leader: true, bearer: true }
    },
    {
      name: 'Hellbringer Drake',
      kind: 'reg',
      type: 'Monster',
      cls: 'Medium',
      pts: 180,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: 7, V: 2, C: 2, A: 10, W: 16, R: 3, D: 3, E: 0 },
      rules: [
        'Barrage (10) (16", Armor Piercing (1))',
        'Impact (5)',
        'Cleave (1)',
        'Terrifying (1)',
        'Forged by the Elements'
      ],
      draw: [],
      options: 'Empowerment: Barrage +2, Armor Piercing +1',
      warband: 'Tempered, Forged',
      cmd: { leader: false, bearer: false }
    },
    {
      name: 'Hold Warriors',
      kind: 'reg',
      type: 'Infantry',
      cls: 'Medium',
      pts: 130,
      extra: 35,
      stands: '3 stands of 4 models',
      stats: { M: 5, V: 1, C: 2, A: 4, W: 5, R: 3, D: 2, E: 0 },
      rules: ['Shield', 'Vanguard (3)', 'Awakened: Impact (2)'],
      draw: [],
      options:
        "Officers: Herald of Fire 15, Herald of Stone 25, Herald of Magma 15, Mnemancer's Apprentice 20",
      warband: 'Clan',
      cmd: { leader: true, bearer: true }
    },
    {
      name: 'Hold Ballistae',
      kind: 'reg',
      type: 'Infantry',
      cls: 'Light',
      pts: 130,
      extra: 40,
      stands: '3 stands of 4 models',
      stats: { M: 5, V: 2, C: 1, A: 4, W: 5, R: 2, D: 2, E: 0 },
      rules: ['Barrage (3) (16", Armor Piercing (1))', 'Shield'],
      draw: [],
      options:
        "Officers: Herald of Fire 15, Herald of Stone 25, Herald of Magma 15, Mnemancer's Apprentice 20",
      warband: 'Clan',
      cmd: { leader: true, bearer: true }
    },
    {
      name: 'Hold Thanes',
      kind: 'reg',
      type: 'Infantry',
      cls: 'Medium',
      pts: 180,
      extra: 50,
      stands: '3 stands of 4 models',
      stats: { M: 5, V: 1, C: 3, A: 4, W: 5, R: 4, D: 3, E: 0 },
      rules: ['Cleave (1)', 'Shield', 'Vanguard (3)'],
      draw: [],
      options:
        "Officers: Herald of Fire 15, Herald of Stone 25, Herald of Magma 15, Mnemancer's Apprentice 20",
      warband: 'Clan',
      cmd: { leader: true, bearer: true }
    },
    {
      name: 'Inferno Automata',
      kind: 'reg',
      type: 'Brute',
      cls: 'Light',
      pts: 180,
      extra: null,
      stands: '3 stands of 1 model',
      stats: { M: 7, V: 1, C: 2, A: 6, W: 5, R: 3, D: 3, E: 2 },
      rules: ['Irregular', 'Fluid Formation', 'Impact (2)', 'Aura of Death (2)', 'Forged by the Elements'],
      draw: [],
      options: 'Empowerment: +1 March or Impact +2',
      warband: 'Tempered, Forged',
      cmd: { leader: false, bearer: false }
    },
    {
      name: 'Initiates',
      kind: 'reg',
      type: 'Infantry',
      cls: 'Medium',
      pts: 140,
      extra: 45,
      stands: '3 stands of 4 models',
      stats: { M: 5, V: 1, C: 2, A: 4, W: 5, R: 3, D: 2, E: 0 },
      rules: ['Devout', 'Shield', 'Support (2)', 'Phalanx', 'Pike Formation', 'Awakened: Support (+1)'],
      draw: [],
      options: 'Officer: Herald of Stone 25',
      warband: 'Ardent',
      cmd: { leader: true, bearer: true }
    },
    {
      name: 'Ironclad Drake',
      kind: 'reg',
      type: 'Monster',
      cls: 'Heavy',
      pts: 220,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: 7, V: 1, C: 3, A: 12, W: 18, R: 3, D: 4, E: 0 },
      rules: [
        'Cleave (2)',
        'Brutal Impact (2)',
        'Impact (6)',
        'Unstoppable',
        'Terrifying (2)',
        'Testaments to Honor'
      ],
      draw: [],
      options: 'Bergont Raegh rider option',
      warband: 'Clan',
      cmd: { leader: false, bearer: false }
    },
    {
      name: 'Lost',
      kind: 'reg',
      type: 'Brute',
      cls: 'Medium',
      pts: 180,
      extra: 70,
      stands: '3 stands of 1 model',
      stats: { M: 6, V: 1, C: 3, A: 5, W: 6, R: 4, D: 3, E: 0 },
      rules: ['Impact (3)', 'Unstoppable', 'Lethal Demise (3)', 'Fires of the Descent'],
      draw: [],
      options: '',
      warband: 'Ardent, Tempered',
      cmd: { leader: true, bearer: false }
    },
    {
      name: 'Found',
      kind: 'reg',
      type: 'Brute',
      cls: 'Medium',
      pts: 160,
      extra: 60,
      stands: '3 stands of 1 model',
      stats: { M: 6, V: 2, C: 2, A: 4, W: 6, R: 4, D: 3, E: 0 },
      rules: ['Arcing Fire', 'Barrage (3) (14")', 'Battery'],
      draw: [],
      options: 'Empowerment: Barrage +1 and +4" range',
      warband: 'Ardent, Tempered, Forged',
      cmd: { leader: true, bearer: false }
    },
    {
      name: 'Magmaforged',
      kind: 'reg',
      type: 'Infantry',
      cls: 'Medium',
      pts: 190,
      extra: 60,
      stands: '3 stands of 4 models',
      stats: { M: 5, V: 1, C: 3, A: 4, W: 5, R: 4, D: 3, E: 0 },
      rules: ['Aura of Death (3)', 'Cleave (2)'],
      draw: [],
      options: 'Officer: Herald of Magma 15; Empowerment: +2" Charge or +1 Defense',
      warband: 'Tempered, Forged',
      cmd: { leader: true, bearer: true }
    },
    {
      name: 'Steelforged',
      kind: 'reg',
      type: 'Brute',
      cls: 'Medium',
      pts: 210,
      extra: 70,
      stands: '3 stands of 1 model',
      stats: { M: 6, V: 1, C: 3, A: 4, W: 5, R: 4, D: 4, E: 1 },
      rules: ['Cleave (1)', 'Impact (2)', 'Unstoppable'],
      draw: [],
      options: 'Empowerment: +2 Attacks or Hardened (1)',
      warband: 'Tempered, Forged',
      cmd: { leader: true, bearer: false }
    },
    {
      name: 'Stoneforged',
      kind: 'reg',
      type: 'Monster',
      cls: 'Heavy',
      pts: 230,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: 6, V: 1, C: 3, A: 10, W: 20, R: 4, D: 4, E: 0 },
      rules: ['Cleave (2)', 'Impact (5)', 'Terrifying (1)', 'Fearless', 'Unstoppable', 'Unstable Alloys'],
      draw: [],
      options: 'Empowerment: heal 3 wounds or +2 March; Ferric Throne 20 (Steelshaper only)',
      warband: 'Tempered, Forged',
      cmd: { leader: false, bearer: false }
    },
    {
      name: 'Wardens',
      kind: 'reg',
      type: 'Infantry',
      cls: 'Medium',
      pts: 180,
      extra: 60,
      stands: '3 stands of 4 models',
      stats: { M: 6, V: 1, C: 3, A: 5, W: 5, R: 3, D: 3, E: 0 },
      rules: ['Cleave (1)', 'Flurry', 'Devout', 'Fearless', 'Awakened: Linebreaker'],
      draw: [],
      options: '',
      warband: 'Ardent',
      cmd: { leader: true, bearer: true }
    }
  ]
});
