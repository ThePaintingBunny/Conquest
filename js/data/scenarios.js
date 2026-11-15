/*
 * Scenarios
 *
 * The 12 scenarios: objective zones, objective markers and special scoring.
 *
 * In this file: Z, MK, SCEN
 */

const Z = (name, x, y, d, friendly) => ({ name, x, y, r: d / 2, size: d, friendly: friendly || null });
const MK = (name, x, y, side) => ({ name, x, y, side });

const SCEN = {
  1: {
    name: 'Divide and Conquer',
    zones: [
      Z('Blue Left', 60, 12, 6, 'nord'),
      Z('Blue Right', 12, 12, 6, 'nord'),
      Z('Centre Left', 48, 24, 6),
      Z('Centre Right', 24, 24, 6),
      Z('Red Left', 60, 36, 6, 'cs'),
      Z('Red Right', 12, 36, 6, 'cs')
    ],
    markers: [MK('B', 36, 12, 'nord'), MK('A', 36, 36, 'cs')],
    vp: '3 VP per enemy Objective Marker destroyed this round; 2 VP per zone Seized; +2 if Seizing three or more zones; +1 if Seizing more zones than the opponent; 2 VP for slaying the enemy Warlord. Red zones are friendly to the bottom player and blue zones to the top player: you cannot Seize your own friendly zones.'
  },
  2: {
    name: 'Declined Flank',
    zones: [
      Z('Zone 1', 66, 18, 6),
      Z('Zone 2', 42, 18, 6),
      Z('Zone 3', 18, 18, 6),
      Z('Zone 4', 54, 30, 6),
      Z('Zone 5', 30, 30, 6),
      Z('Zone 6', 6, 30, 6)
    ],
    markers: [],
    pick: 'deny',
    vp: '2 VP per zone Seized; +2 if Seizing three or more; +1 if Seizing all six. After Supremacy the First Player, then the Second, each name a different zone: those two zones score nothing this round.'
  },
  3: {
    name: 'Breakout',
    zones: [Z('Left', 60, 24, 9), Z('Centre', 36, 24, 9), Z('Right', 12, 24, 9)],
    markers: [MK('A', 40.5, 24, 'cs'), MK('B', 31.5, 24, 'nord')],
    vp: '3 VP per enemy Objective Marker destroyed this round; 2 VP per zone Seized; +1 if Seizing two or more; 2 VP for slaying the enemy Warlord. Rounds 1-4 and 9-10: +1 per side zone Seized. Rounds 5-8: +2 for the centre zone.'
  },
  4: {
    name: 'Echelon',
    zones: [Z('Far left', 48, 18, 9), Z('Near right', 24, 30, 9)],
    markers: [
      MK('A', 60, 42, 'cs'),
      MK('B', 12, 6, 'nord'),
      MK('C', 24, 18, 'neutral'),
      MK('D', 48, 30, 'neutral')
    ],
    vp: '3 VP per Objective Marker you destroy this round (enemy or neutral); +2 if you destroy two or more in the same round; 2 VP per zone Seized; +2 if Seizing both zones.'
  },
  5: {
    name: 'Forlorn Hope',
    zones: [
      Z('Far left 6″', 48, 18, 6),
      Z('Far right 9″', 24, 18, 9),
      Z('Near left 9″', 48, 30, 9),
      Z('Near right 6″', 24, 30, 6)
    ],
    markers: [MK('B', 36, 18, 'nord'), MK('A', 36, 30, 'cs')],
    vp: '3 VP per enemy Objective Marker destroyed this round; 2 VP per zone Seized; +3 if Seizing three or more; 2 VP per enemy Character destroyed this round.'
  },
  6: {
    name: 'Off-Balance',
    zones: [Z('Left', 60, 24, 9), Z('Right', 24, 24, 9)],
    markers: [
      MK('B1', 42, 18, 'nord'),
      MK('A1', 42, 30, 'cs'),
      MK('B2', 12, 12, 'nord'),
      MK('A2', 12, 36, 'cs')
    ],
    vp: '4 VP per enemy Objective Marker destroyed this round; 2 VP per zone Seized; +1 if Seizing both; 2 VP for slaying the enemy Warlord.'
  },
  7: {
    name: 'Melee',
    zones: [
      Z('Kingsfield', 12, 24, 9),
      Z('Ashen Ford', 60, 24, 9),
      Z('Old Well', 30, 18, 6),
      Z('Shrine Stones', 42, 30, 6)
    ],
    markers: [],
    vp: '2 VP per 6″ zone and 3 VP per 9″ zone Seized; +2 if Seizing two or more; 2 VP per enemy Regiment and 2 per enemy Character destroyed this round; 2 VP for slaying the enemy Warlord.'
  },
  8: {
    name: 'Bulwark',
    zones: [Z('Left', 54, 24, 9), Z('Right', 18, 24, 9)],
    markers: [MK('A', 54, 24, 'cs'), MK('B', 18, 24, 'nord'), MK('C', 36, 24, 'neutral')],
    vp: '3 VP per enemy Objective Marker destroyed this round; 3 VP for destroying the centre marker; 2 VP per zone Seized; +1 if Seizing both; 2 VP for slaying the enemy Warlord. +2 for the Left zone (as the bottom player sees it) in rounds 3, 5, 7, 9 and for the Right zone in rounds 2, 4, 6, 8. A zone holding your own friendly marker is Contested: the enemy cannot Seize it.'
  },
  9: {
    name: 'Foresight',
    zones: [
      Z('Zone 1', 66, 30, 6),
      Z('Zone 2', 54, 18, 6),
      Z('Centre', 36, 24, 6),
      Z('Zone 3', 18, 30, 6),
      Z('Zone 4', 6, 18, 6)
    ],
    markers: [],
    pick: 'secret',
    vp: '2 VP per zone Seized; +2 if Seizing two zones other than the centre; +1 if Seizing the centre. After Supremacy each player secretly picks a non-central zone; picked zones score nothing this round, but a zone both players picked scores double.'
  },
  10: {
    name: 'Head-to-Head',
    zones: [Z('B', 54, 12, 6, 'nord'), Z('A', 54, 36, 6, 'cs'), Z('Big zone', 18, 24, 9)],
    markers: [],
    vp: "3 VP for Seizing the 9″ zone; 4 VP for Seizing the enemy's friendly 6″ zone (A is the bottom player's, B the top player's); 2 VP per enemy Regiment and 2 per enemy Character destroyed this round; 2 VP for slaying the enemy Warlord."
  },
  11: {
    name: 'Maelstrom',
    zones: [Z('Left', 60, 24, 9), Z('Centre', 36, 24, 6), Z('Right', 12, 24, 9)],
    markers: [],
    from: 1,
    vp: 'Zones score from round 1. Rounds 1-4 and 9-10: 2 VP for the 6″ zone and 1 VP per 9″ zone Seized. Rounds 5-8: 1 VP for the 6″ zone and 2 VP per 9″ zone.'
  },
  12: {
    name: 'Grind Them Down',
    zones: [
      Z('Far left', 54, 18, 6),
      Z('Far right', 18, 18, 6),
      Z('Near left', 54, 30, 6),
      Z('Near right', 18, 30, 6),
      Z('Centre', 36, 24, 9)
    ],
    markers: [],
    pick: 'grind',
    vp: '1 VP per zone Seized; +2 if Seizing two or more. After Supremacy each player picks a 6″ zone with none of their own regiments in range: +3 if they Seize it this round.'
  }
};
