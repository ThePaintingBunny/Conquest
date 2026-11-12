/* Terrain catalogue: the terrain types and their rules. */
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
