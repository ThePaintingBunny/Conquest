/*
 * Yoroni: army list
 *
 * The army list entry: army rules, every regiment and character with its profile, options and warbands.
 */

ENCY.push({
  name: 'Yoroni',
  version: '2026 Wave and Thunder update (19 June 2026)',
  source:
    'https://www.para-bellum.com/wp-content/uploads/2026/06/Yoroni-TLAOK-2026-Wave-and-Thunder-Update.pdf',
  armyRules: [
    'Ideal Cards (Ka, Chi, Fu, Sui, Mu)',
    'no Entourage activations for regiments',
    'Modular Regiments',
    'Enlightened',
    'Disciplines',
    'Powerful Presence',
    'Supremacy: Lord of Roaring Flames, Lord of the Eternal Mountain, Mistress of Azure Gales, Mistress of Winsome Mists, Mistress of the Ghostly Reikai'
  ],
  units: [
    {
      name: 'Daimyo',
      kind: 'char',
      type: 'Brute',
      cls: '',
      pts: 110,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: '-', V: 1, C: 4, A: 6, W: 7, R: 4, D: 3, E: 2 },
      rules: ['Cleave (2)', 'Impact (3)', 'Powerful Presence'],
      draw: [],
      options: '1 Discipline (10-40)',
      warband:
        'Role: Ka, Chi, Sui or Fu. Mainstay: Modular Regiments; Restricted: Dai Yokai, Genya no Yokai, Shikigami, Oni Kishin Raiu, Oni Kishin Kiba'
    },
    {
      name: 'Oyabun',
      kind: 'char',
      type: 'Brute',
      cls: '',
      pts: 110,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: '-', V: 1, C: 3, A: 6, W: 7, R: 4, D: 3, E: 2 },
      rules: ['Cleave (1)', 'Impact (3)', 'Forward Force', 'Quicksilver Strikes', 'Powerful Presence'],
      draw: [],
      options: '1 Discipline (10-40)',
      warband:
        'Role: Chi. Mainstay: Modular Regiments; Restricted: Dai Yokai, Genya no Yokai, Shikigami, Oni Kishin Raiu, Oni Kishin Kiba'
    },
    {
      name: 'Kitsune Bakasu',
      kind: 'char',
      type: 'Brute',
      cls: '',
      pts: 110,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: '-', V: 1, C: 4, A: 8, W: 6, R: 4, D: 3, E: 2 },
      rules: ['Deadly Blades', 'Impact (3)', 'Powerful Presence'],
      draw: [],
      options: '1 Discipline (10-40)',
      warband: 'Role: Fu. Mainstay: Modular Regiments, Domaru-damashi; Restricted: Dai Yokai, Genya no Yokai'
    },
    {
      name: 'Kitsune Onmyoji',
      kind: 'char',
      type: 'Brute',
      cls: '',
      pts: 110,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: '-', V: 3, C: 2, A: 5, W: 6, R: 4, D: 3, E: 2 },
      rules: [
        'Barrage (3) (14", Armor Piercing (1), Rapid Volley)',
        'Impact (3)',
        'Priest (6)',
        'Powerful Presence'
      ],
      draw: [],
      options:
        '1 Discipline (10-40); spells: Iron Soul of Discipline, Bane of Deeds, Blossom in the Wind, Misery of Failure Envisioned',
      warband: 'Role: Sui. Mainstay: Modular Regiments, Domaru-damashi; Restricted: Dai Yokai, Genya no Yokai'
    },
    {
      name: 'Jorogumo Mahotsu',
      kind: 'char',
      type: 'Monster',
      cls: 'Medium',
      pts: 240,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: 7, V: 1, C: 3, A: 11, W: 18, R: 4, D: 3, E: 1 },
      rules: ['Cleave (1)', 'Devout', 'Impact (5)', 'Priest (6)', 'Tenacious (1)', 'Terrifying (1)'],
      draw: [],
      options:
        'Two actions per activation; Duel action; spells: Repose in Healing Spring, Honor a Void of Self, Dancing Shadows, Witness of the Void; no upgrades; also a regiment',
      warband:
        'Role: Mu. At least 1 regiment; Mainstay: Modular Regiments, Shikigami; Restricted: Dai Yokai, Genya no Yokai',
      cmd: { leader: false, bearer: false }
    },
    {
      name: 'Jorogumo Geisha',
      kind: 'char',
      type: 'Monster',
      cls: 'Medium',
      pts: 260,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: 7, V: 1, C: 3, A: 14, W: 18, R: 4, D: 3, E: 1 },
      rules: ['Cleave (1)', 'Devout', 'Deadly Blades', 'Impact (5)', 'Tenacious (1)', 'Terrifying (2)'],
      draw: ['Monstrous Inspiration', 'Whispered Illusion'],
      options: 'Two actions per activation; Duel action; no upgrades; also a regiment',
      warband:
        'Role: Mu. At least 1 regiment; Mainstay: Modular Regiments, Shikigami; Restricted: Dai Yokai, Genya no Yokai',
      cmd: { leader: false, bearer: false }
    },
    {
      name: 'Oni Ayakashi',
      kind: 'reg',
      type: 'Brute',
      cls: 'Medium',
      pts: 80,
      extra: 80,
      stands: 'Modular, min 2 stands of 1 model (points per stand)',
      stats: { M: 6, V: 1, C: 3, A: 5, W: 7, R: 3, D: 3, E: 1 },
      rules: ['Cleave (2)', 'Impact (2)', 'Command stand: +1 Attacks, Juggernaut'],
      draw: [],
      options: '',
      warband: 'Role: Ka; Modular',
      cmd: { leader: false, bearer: false }
    },
    {
      name: 'Kami Ayakashi',
      kind: 'reg',
      type: 'Brute',
      cls: 'Medium',
      pts: 75,
      extra: 75,
      stands: 'Modular, min 2 stands of 1 model (points per stand)',
      stats: { M: 6, V: 1, C: 3, A: 5, W: 7, R: 3, D: 3, E: 1 },
      rules: ['Trample (2)', 'Impact (2)', 'Command stand: +1 Evasion, Tenacious (1)'],
      draw: [],
      options: '',
      warband: 'Role: Chi; Modular',
      cmd: { leader: false, bearer: false }
    },
    {
      name: 'Tengu Bushi',
      kind: 'reg',
      type: 'Brute',
      cls: 'Medium',
      pts: 75,
      extra: 75,
      stands: 'Modular, min 2 stands of 1 model (points per stand)',
      stats: { M: 7, V: 1, C: 3, A: 6, W: 6, R: 3, D: 3, E: 1 },
      rules: [
        'Flawless Strikes',
        'Impact (2)',
        'Command stand: ignores Hindering terrain, Vanguard (3)',
        'Fly if only Tengu',
        'Blade Masters'
      ],
      draw: [],
      options: '',
      warband: 'Role: Fu; Modular',
      cmd: { leader: false, bearer: false }
    },
    {
      name: 'Tengu Ayakashi',
      kind: 'reg',
      type: 'Brute',
      cls: 'Medium',
      pts: 80,
      extra: 80,
      stands: 'Modular, min 2 stands of 1 model (points per stand)',
      stats: { M: 7, V: 3, C: 2, A: 4, W: 5, R: 3, D: 3, E: 1 },
      rules: [
        'Barrage (4) (14", Armor Piercing (1), Rapid Volley)',
        'Command stand: Tenacious (1) vs Volleys, Vanguard (3)',
        'Fly if only Tengu',
        'Spirit Breeze'
      ],
      draw: [],
      options: '',
      warband: 'Role: Fu; Modular',
      cmd: { leader: false, bearer: false }
    },
    {
      name: 'Kappa Bushi',
      kind: 'reg',
      type: 'Brute',
      cls: 'Medium',
      pts: 75,
      extra: 75,
      stands: 'Modular, min 2 stands of 1 model (points per stand)',
      stats: { M: 6, V: 1, C: 3, A: 5, W: 7, R: 3, D: 3, E: 1 },
      rules: ['Cleave (1)', 'Impact (2)', 'Flurry', 'Command stand: can activate from any Ideal Card'],
      draw: [],
      options: '',
      warband: 'Role: Sui; Modular',
      cmd: { leader: false, bearer: false }
    },
    {
      name: 'Origami Warriors',
      kind: 'reg',
      type: 'Brute',
      cls: 'Medium',
      pts: 60,
      extra: 60,
      stands: 'Modular, min 2 stands of 1 model (points per stand)',
      stats: { M: 6, V: 1, C: 2, A: 5, W: 6, R: 3, D: 3, E: 1 },
      rules: ['Lethal Demise (4)', 'Command stand: Tenacious (1) vs Volleys', 'In the Fold'],
      draw: [],
      options: '',
      warband: 'Role: Mu; Modular',
      cmd: { leader: false, bearer: false }
    },
    {
      name: 'Domaru-damashi',
      kind: 'reg',
      type: 'Brute',
      cls: 'Light',
      pts: 140,
      extra: 40,
      stands: '3 stands of 1 model',
      stats: { M: 7, V: 1, C: 2, A: 6, W: 4, R: 3, D: 2, E: 1 },
      rules: ['Flurry', 'Impact (2)', 'Unstoppable', 'Visage'],
      draw: [],
      options: '',
      warband: 'Role: Mu',
      cmd: { leader: true, bearer: false }
    },
    {
      name: 'Shikigami',
      kind: 'reg',
      type: 'Brute',
      cls: 'Light',
      pts: 120,
      extra: 30,
      stands: '3 stands',
      stats: { M: 7, V: 1, C: 2, A: 4, W: 4, R: 2, D: 2, E: 1 },
      rules: [
        'Unstoppable',
        'Loose Formation',
        'Irregular',
        'Swarm',
        'Disruptive',
        'Cheerful (Aura: +1 Resolve to friends within 8")'
      ],
      draw: [],
      options: 'Cannot be joined by a Character',
      warband: 'Role: Mu',
      cmd: { leader: true, bearer: false }
    },
    {
      name: 'Dai Yokai',
      kind: 'reg',
      type: 'Monster',
      cls: 'Heavy',
      pts: 220,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: 7, V: 1, C: 4, A: 12, W: 18, R: 4, D: 3, E: 1 },
      rules: [
        'Cleave (1)',
        'Fearless',
        'Impact (5)',
        'Terrifying (1)',
        'Vanguard (3)',
        'Unstoppable',
        'Sweeping Step'
      ],
      draw: [],
      options: 'Free Duel action; adds an Ideal Card',
      warband: 'Role: any',
      cmd: { leader: false, bearer: false }
    },
    {
      name: 'Genya no Yokai',
      kind: 'reg',
      type: 'Monster',
      cls: 'Heavy',
      pts: 260,
      extra: null,
      stands: '1 stand of 1 model',
      stats: { M: 7, V: 1, C: 3, A: 11, W: 18, R: 4, D: 3, E: 2 },
      rules: [
        'Cleave (3)',
        'Fearless',
        'Impact (7)',
        'Terrifying (1)',
        'Vanguard (3)',
        'Unstoppable',
        'Enlightening Fury'
      ],
      draw: [],
      options: 'Adds an Ideal Card',
      warband: 'Role: any',
      cmd: { leader: false, bearer: false }
    },
    {
      name: 'Oni Kishin Raiu',
      kind: 'reg',
      type: 'Cavalry',
      cls: 'Heavy',
      pts: 250,
      extra: 120,
      stands: '2 double stands of 1 model',
      stats: { M: 7, V: 1, C: 3, A: 7, W: 8, R: 4, D: 3, E: 1 },
      rules: [
        'Cleave (1)',
        'Impact (5)',
        'Brutal Impact (2)',
        'Unstoppable',
        'Hardened (1)',
        'Flank',
        'Honor Beyond Death',
        'Wrathful Momentum'
      ],
      draw: [],
      options: '',
      warband: 'Role: Ka',
      cmd: { leader: true, bearer: false }
    },
    {
      name: 'Oni Kishin Kiba',
      kind: 'reg',
      type: 'Cavalry',
      cls: 'Heavy',
      pts: 240,
      extra: 110,
      stands: '2 double stands of 1 model',
      stats: { M: 7, V: 1, C: 3, A: 7, W: 8, R: 4, D: 3, E: 1 },
      rules: [
        'Cleave (2)',
        'Impact (4)',
        'Unstoppable',
        'Hardened (1)',
        'Flank',
        'Fiend Hunter',
        'Honor Beyond Death',
        'Hubris',
        'Titanic Defiance'
      ],
      draw: [],
      options: '',
      warband: 'Role: Ka',
      cmd: { leader: true, bearer: false }
    }
  ]
});
