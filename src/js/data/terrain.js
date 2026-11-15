/*
 * Terrain catalogue
 *
 * The terrain types with their rules, the terrain keywords and what each means, and the default table
 * layout.
 *
 * In this file: TTYPES, TKW, TKWD, TERR0, ROCKS
 */

const TTYPES = {
  forest: { name: 'Forest', size: 3, kw: ['Traversable', 'Hindering', 'Cover'] },
  hill: { name: 'Hill', size: 2, kw: ['Elevated', 'Obstructing'] },
  rocks: { name: 'Rocks', size: 2, kw: ['Impassable', 'Obstructing'] },
  swamp: { name: 'Swamp', size: 0, kw: ['Traversable', 'Hindering', 'Dangerous'] },
  water: { name: 'River or lake', size: 0, kw: ['Traversable', 'Water'] },
  ruins: { name: 'Ruins', size: 1, kw: ['Traversable', 'Cover', 'Hindering'] },
  field: { name: 'Cornfield', size: 1, kw: ['Traversable', 'Cover'] },
  rubble: { name: 'Broken ground', size: 0, kw: ['Traversable', 'Dangerous'] },
  thorns: { name: 'Thornwood', size: 1, kw: ['Traversable', 'Hindering', 'Perilous'] },
  building: { name: 'Building', size: 2, kw: ['Garrison'], cap: 4, def: 1 }
};

const TKW = [
  'Traversable',
  'Elevated',
  'Obstructing',
  'Cover',
  'Hindering',
  'Dangerous',
  'Perilous',
  'Water',
  'Impassable',
  'Garrison',
  'Earth'
];

const TKWD = {
  Traversable: 'Can be moved through; does not raise a regiment’s Size.',
  Elevated: 'Can be moved through; regiments standing on it add its Size to their own.',
  Obstructing:
    'Blocks Line of Sight for regiments of equal or smaller Size; regiments on it can see over everything.',
  Cover:
    'Volleys through it, or at a regiment wholly inside it, halve their Barrage (round up) if the target’s Size is not above the terrain’s. Sureshot ignores this.',
  Hindering:
    'If at least half the stands charge through it, no Impact Attacks; Medium and Heavy regiments also lose Inspired that round.',
  Dangerous:
    'Roll a die for each stand that moves through it: each 6 is 1 Wound (2 for Cavalry and Chariots). No Morale Tests.',
  Perilous:
    'Roll a die for each stand that moves through it: each 4+ is 1 Wound (2 for Cavalry and Chariots). No Morale Tests.',
  Water: 'A regiment with at least half its stands in it gets −1 Clash (minimum 1).',
  Impassable: 'Cannot be moved through.',
  Garrison:
    'A building. Infantry that fit its Capacity can Occupy it for +Defense and 360° sight; nobody else may move into or within 1″ of it.'
};

const TERR0 = [
  { type: 'forest', x: 20, y: 38, rx: 3.5, ry: 2.5, seed: 11 },
  { type: 'forest', x: 54, y: 9, rx: 3.5, ry: 2.5, seed: 12 },
  { type: 'hill', x: 37, y: 40, rx: 3, ry: 2, seed: 13 },
  { type: 'hill', x: 32, y: 8, rx: 3, ry: 2, seed: 14 },
  { type: 'rocks', x: 61, y: 37, rx: 2.5, ry: 1.5, seed: 15 },
  { type: 'rocks', x: 10, y: 11, rx: 2.5, ry: 1.5, seed: 16 }
];

const ROCKS = [
  [61, 37],
  [10, 11]
];
