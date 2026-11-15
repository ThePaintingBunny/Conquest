/*
 * City States: army list
 *
 * The army list entry: army rules, every regiment and character with its profile, options and warbands.
 */

ENCY.push({
  name: 'City States',
  version: '2026 Post-Adepticon update (3 April 2026)',
  source:
    'https://www.para-bellum.com/wp-content/uploads/2026/04/CityStates-TLAOK-2026-POST-ADEPTICON-UPDATE.pdf',
  armyRules: [
    'Strategic Stack',
    'Direct Orders',
    'Auxiliary Stands',
    'Supremacy: Carrier of the Godflesh, Army of Lions, Infantry Tactics, Hammer and Anvil, Bringing Back the Children of Fire',
    'Masteries (Tactical, Combat)',
    'Bestowed Relics',
    'Modifications'
  ],
  /* Auxiliary Stands (army rule): their own Clash, Attacks, Wounds and Special Rules. March, Defense, Resolve,
     Evasion, Class and Type come from the regiment they join. These are NOT the profiles of the regiments
     of the same name. */
  auxiliaries: {
    'Minotaur Haspist': {
      /* the army list prints Wounds 6 for this stand: a typo, it has 7 like the Minotaur Haspists regiment */
      stats: { V: 1, C: 3, A: 4, W: 7 },
      rules: ['Brutal Impact (1)', 'Cleave (1)', 'Impact (2)', 'Shield']
    },
    'Minotaur Thyrean': {
      stats: { V: 1, C: 3, A: 5, W: 7 },
      rules: ['Brutal Impact (1)', 'Cleave (3)', 'Impact (3)', 'Linebreaker']
    },
    'Sacred Band Veteran': {
      stats: { V: 1, C: 3, A: 5, W: 5 },
      rules: ['Cleave (2)', 'Sacred Warriors']
    }
  },
  units: [
    {
      name: 'Eidolon',
      kind: 'char',
      type: 'Brute',
      cls: '',
      pts: 100,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: '-', V: 1, C: 3, A: 4, W: 6, R: 4, D: 3, E: 2 },
      rules: ['Combat Directives', 'Hardened (1)', 'Impact (2)'],
      draw: [],
      options: 'Up to 3 Modifications; cannot be Warlord; max 3 regiments when leading Inquisitors',
      warband:
        'Can attach to Infantry. Mainstay: Thorakites, Hoplites, Clockwork Hoplites, Inquisitors; Restricted: Minotaur Haspists, Promethean, Hephaestian'
    },
    {
      name: 'Mechanist',
      kind: 'char',
      type: 'Infantry',
      cls: '',
      pts: 80,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: '-', V: 2, C: 2, A: 4, W: 4, R: 3, D: 2, E: 1 },
      rules: ['Priest (6)'],
      draw: [],
      options:
        '1 Modification or Bestowed Relic; spells: Aggression Directive, Clockwork Parade, Iron Stride, Torque; no Masteries',
      warband:
        'Mainstay: Thorakites, Hoplites, Clockwork Hoplites; Restricted: Inquisitors, Minotaur Haspists, Promethean, Hephaestian, Talos'
    },
    {
      name: 'Polemarch',
      kind: 'char',
      type: 'Infantry',
      cls: '',
      pts: 90,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: '-', V: 1, C: 3, A: 6, W: 4, R: 4, D: 3, E: 0 },
      rules: ['Flurry', 'Shield'],
      draw: [],
      options: 'Up to 2 Bestowed Relics; Mastery: Combat',
      warband:
        'Mainstay: Thorakites, Hoplites, Phalangites, Agema, Minotaur Haspists; Restricted: Sacred Band, Hephaestian, Minotaur Thyrean, Selinoi, Satyroi, Talos'
    },
    {
      name: 'Aristarch',
      kind: 'char',
      type: 'Infantry',
      cls: '',
      pts: 90,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: '-', V: 1, C: 3, A: 6, W: 4, R: 4, D: 2, E: 0 },
      rules: ['Shield'],
      draw: [],
      options: '1 Bestowed Relic; Mastery: Tactical',
      warband:
        'Mainstay: Thorakites, Hoplites, Phalangites, Selinoi; Restricted: Satyroi, Companion Cavalry, Minotaur Thyrean, Agema, War Chariots, Promethean, Talos'
    },
    {
      name: 'Ipparchos',
      kind: 'char',
      type: 'Cavalry',
      cls: '',
      pts: 100,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: '-', V: 0, C: 3, A: 6, W: 5, R: 3, D: 4, E: 1 },
      rules: ['Brutal Impact (1)', 'Cleave (1)', 'Impact (4)', 'Dread'],
      draw: [],
      options: '1 Bestowed Relic; Masteries: Tactical, Combat',
      warband: 'Mainstay: Thorakites, Hoplites, Companion Cavalry; Restricted: Sacred Band, War Chariots'
    },
    {
      name: 'Promethean Oracle',
      kind: 'char',
      type: 'Monster',
      cls: 'Heavy',
      pts: 260,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: 7, V: 2, C: 3, A: 12, W: 20, R: 4, D: 3, E: 2 },
      rules: ['Cleave (2)', 'Fearless', 'Hardened (1)', 'Impact (6)', 'Tenacious (1)', 'Terrifying (1)'],
      draw: [],
      options:
        'Free weapon: Skorge (Cleave +1, can destroy Objective Markers) or Dori (Unyielding); no Relics or Masteries; counts as 6 stands for objectives',
      warband: 'Up to 2 regiments; Mainstay: Promethean; Restricted: Hephaestian, Talos',
      cmd: { leader: false, bearer: false }
    },
    {
      name: 'Thorakites',
      kind: 'reg',
      type: 'Infantry',
      cls: 'Light',
      pts: 120,
      extra: 35,
      stands: '3 stands of 4 models',
      stats: { M: 6, V: 1, C: 2, A: 4, W: 4, R: 2, D: 2, E: 0 },
      rules: ['Shield', 'Vanguard (3)'],
      draw: [],
      options: 'Officers: Andromachos 25, Lochagos 15; Auxiliary: Minotaur Thyrean 50',
      warband: '',
      cmd: { leader: true, bearer: false }
    },
    {
      name: 'Hoplites',
      kind: 'reg',
      type: 'Infantry',
      cls: 'Medium',
      pts: 120,
      extra: 35,
      stands: '3 stands of 4 models',
      stats: { M: 5, V: 1, C: 2, A: 4, W: 4, R: 2, D: 2, E: 0 },
      rules: ['Phalanx', 'Shield', 'Support (2)'],
      draw: [],
      options: 'Officers: Dorilates 15, Lochagos 15; Auxiliary: Minotaur Haspist 50',
      warband: '',
      cmd: { leader: true, bearer: false }
    },
    {
      name: 'Selinoi',
      kind: 'reg',
      type: 'Infantry',
      cls: 'Light',
      pts: 120,
      extra: 40,
      stands: '3 stands of 4 models',
      stats: { M: 6, V: 2, C: 2, A: 4, W: 4, R: 3, D: 2, E: 1 },
      rules: ['Barrage (4) (16", Arcing Fire)', 'Loose Formation'],
      draw: [],
      options: '',
      warband: '',
      cmd: { leader: true, bearer: false }
    },
    {
      name: 'Phalangites',
      kind: 'reg',
      type: 'Infantry',
      cls: 'Medium',
      pts: 140,
      extra: 40,
      stands: '3 stands of 4 models',
      stats: { M: 5, V: 1, C: 3, A: 5, W: 4, R: 3, D: 2, E: 0 },
      rules: ['Phalanx', 'Pike Formation', 'Support (3)'],
      draw: [],
      options: 'Officers: Dorilates 15, Lochagos 15; Auxiliary: Sacred Band Veteran 50',
      warband: '',
      cmd: { leader: true, bearer: false }
    },
    {
      name: 'Agema',
      kind: 'reg',
      type: 'Infantry',
      cls: 'Medium',
      pts: 160,
      extra: 45,
      stands: '3 stands of 4 models',
      stats: { M: 6, V: 1, C: 3, A: 5, W: 4, R: 3, D: 2, E: 0 },
      rules: ['Shield', 'Cleave (1)', 'Fluid Formation'],
      draw: [],
      options: 'Officer: Andromachos 25; Auxiliary: Sacred Band Veteran 50',
      warband: '',
      cmd: { leader: true, bearer: false }
    },
    {
      name: 'Satyroi',
      kind: 'reg',
      type: 'Infantry',
      cls: 'Medium',
      pts: 150,
      extra: 50,
      stands: '3 stands of 4 models',
      stats: { M: 6, V: 1, C: 2, A: 5, W: 4, R: 2, D: 1, E: 2 },
      rules: ['Cleave (1)', 'Shield', 'Opportunist', 'Vanguard (6)', 'Loose Formation', 'Flank'],
      draw: [],
      options: '',
      warband: '',
      cmd: { leader: true, bearer: false }
    },
    {
      name: 'Sacred Band',
      kind: 'reg',
      type: 'Infantry',
      cls: 'Heavy',
      pts: 180,
      extra: 50,
      stands: '3 stands of 4 models',
      stats: { M: 6, V: 1, C: 3, A: 5, W: 5, R: 4, D: 3, E: 0 },
      rules: ['Devout', 'Priest (5)', 'Cleave (2)', 'Fearless'],
      draw: [],
      options: 'Free Spellcasting via the Command Stand; spells: Othismos, Molon Labe',
      warband: '',
      cmd: { leader: true, bearer: false }
    },
    {
      name: 'Clockwork Hoplites',
      kind: 'reg',
      type: 'Infantry',
      cls: 'Medium',
      pts: 190,
      extra: 60,
      stands: '3 stands of 4 models',
      stats: { M: 5, V: 1, C: 2, A: 4, W: 5, R: '-', D: 3, E: 1 },
      rules: ['Cleave (1)', 'Flurry', 'Shield', 'Support (2)', 'Automaton'],
      draw: [],
      options: '',
      warband: '',
      cmd: { leader: true, bearer: false }
    },
    {
      name: 'Companion Cavalry',
      kind: 'reg',
      type: 'Cavalry',
      cls: 'Medium',
      pts: 140,
      extra: 40,
      stands: '3 stands of 1 model',
      stats: { M: 8, V: 1, C: 3, A: 6, W: 4, R: 3, D: 2, E: 1 },
      rules: ['Brutal Impact (1)', 'Impact (3)', 'Dread'],
      draw: [],
      options: '',
      warband: '',
      cmd: { leader: true, bearer: false }
    },
    {
      name: 'Inquisitors',
      kind: 'reg',
      type: 'Brute',
      cls: 'Medium',
      pts: 180,
      extra: 60,
      stands: '3 stands of 1 model',
      stats: { M: 7, V: 1, C: 2, A: 6, W: 5, R: 4, D: 3, E: 2 },
      rules: ['Cleave (1)', 'Flurry', 'Unstoppable', 'Impact (3)'],
      draw: [],
      options: '',
      warband: '',
      cmd: { leader: false, bearer: false }
    },
    {
      name: 'Minotaur Haspists',
      kind: 'reg',
      type: 'Brute',
      cls: 'Medium',
      pts: 170,
      extra: 60,
      stands: '3 stands of 1 model',
      stats: { M: 6, V: 1, C: 3, A: 4, W: 7, R: 3, D: 2, E: 1 },
      rules: [
        'Brutal Impact (1)',
        'Cleave (1)',
        'Fearsome',
        'Impact (2)',
        'Shield',
        'Vanguard (3)',
        'Unstoppable'
      ],
      draw: [],
      options: '',
      warband: '',
      cmd: { leader: true, bearer: false }
    },
    {
      name: 'Minotaur Thyrean',
      kind: 'reg',
      type: 'Brute',
      cls: 'Heavy',
      pts: 190,
      extra: 60,
      stands: '3 stands of 1 model',
      stats: { M: 6, V: 1, C: 3, A: 5, W: 7, R: 3, D: 2, E: 1 },
      rules: [
        'Brutal Impact (1)',
        'Cleave (3)',
        'Impact (3)',
        'Linebreaker',
        'Tenacious (1)',
        'Terrifying (1)',
        'Juggernaut'
      ],
      draw: [],
      options: 'Also an Auxiliary option for Thorakites (50)',
      warband: '',
      cmd: { leader: true, bearer: false }
    },
    {
      name: 'Promethean',
      kind: 'reg',
      type: 'Monster',
      cls: 'Medium',
      pts: 200,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: 7, V: 1, C: 3, A: 11, W: 16, R: 4, D: 3, E: 1 },
      rules: [
        'Cleave (2)',
        'Hardened (1)',
        'Priest (2)',
        'Terrifying (1)',
        'Impact (5)',
        'Herald of the Forge God'
      ],
      draw: [],
      options: 'Spells: Temper Resolve, Quench Blades',
      warband: 'Role: Titan',
      cmd: { leader: false, bearer: false }
    },
    {
      name: 'Hephaestian',
      kind: 'reg',
      type: 'Monster',
      cls: 'Heavy',
      pts: 220,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: 7, V: 0, C: 3, A: 11, W: 16, R: 4, D: 3, E: 1 },
      rules: [
        'Cleave (3)',
        'Hardened (1)',
        'Priest (2)',
        'Terrifying (2)',
        'Impact (5)',
        'Herald of the Forge God'
      ],
      draw: [],
      options: "Spells: Trident Strike, Crucible's Fire",
      warband: 'Role: Titan',
      cmd: { leader: false, bearer: false }
    },
    {
      name: 'Talos',
      kind: 'reg',
      type: 'Monster',
      cls: 'Heavy',
      pts: 260,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: 7, V: 1, C: 3, A: 12, W: 20, R: 4, D: 3, E: 1 },
      rules: [
        'Cleave (1)',
        'Fearless',
        'Hardened (2)',
        'Impact (5)',
        'Shield',
        'Terrifying (1)',
        'Vanguard (3)'
      ],
      draw: [],
      options: 'Options: Mask of Eris 10, Helm of Nike 10',
      warband: 'Role: Titan',
      cmd: { leader: false, bearer: false }
    },
    {
      name: 'Flogobolon',
      kind: 'reg',
      type: 'Chariot',
      cls: 'Medium',
      pts: 135,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: 7, V: 2, C: 2, A: 6, W: 10, R: 3, D: 3, E: 0 },
      rules: [
        'Barrage (7) (12", Armor Piercing (1), Torrential Fire)',
        'Weapon Platform',
        'Deadshot',
        'Impact (3)',
        'Hardened (1)',
        'Vanguard (4)',
        'Longshot'
      ],
      draw: ['Fire and Advance'],
      options: 'War Chariot entry: up to 2 chariots per entry',
      warband: '',
      cmd: { leader: false, bearer: false }
    },
    {
      name: 'Skorpios',
      kind: 'reg',
      type: 'Chariot',
      cls: 'Medium',
      pts: 135,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: 7, V: 2, C: 2, A: 6, W: 10, R: 3, D: 3, E: 0 },
      rules: [
        'Barrage (8) (14", Armor Piercing (1), Rapid Volley)',
        'Weapon Platform',
        'Deadshot',
        'Impact (3)',
        'Hardened (1)',
        'Vanguard (4)',
        'Exploit Flanks'
      ],
      draw: ['Fire and Advance'],
      options: 'War Chariot entry: up to 2 chariots per entry',
      warband: '',
      cmd: { leader: false, bearer: false }
    }
  ]
});
