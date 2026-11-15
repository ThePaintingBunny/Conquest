/*
 * Yoroni Modular Regiments
 *
 * Stand profiles, Command rules and mix rules for regiments built stand by stand.
 *
 * In this file: MODULAR
 */

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
