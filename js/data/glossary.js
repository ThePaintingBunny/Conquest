/*
 * Core rule glossary
 *
 * The text of every core special rule, paraphrased from the core rulebook and keyed by the rule's name
 * in lower case. Faction-specific rule text lives with each faction under data/factions/.
 *
 * In this file: GLOSS
 */

const GLOSS = {
  'acute senses':
    'All of this regiment’s arcs count as its front arc, and its own stands never block its line of sight when it volleys.',
  'aimed shot':
    '+1 Volley for the next Volley this activation. If that would take Volley to 5 or more, re-roll unmodified hit rolls of 6 instead.',
  'arcing fire':
    'With Aimed Shot and outside garrison terrain, it may volley at -1 Volley at an enemy in its front arc and Barrage range that a friendly regiment can see, treating it as a clear shot.',
  'armor piercing': 'Hits from its Volleys and spells lower the target’s Defense by X.',
  'aura of death':
    'At the start of each enemy regiment’s Draw Command Card step, that enemy takes X Hits per stand of this regiment in contact. No Morale Tests. Non-Monsters cap at 4 per stand.',
  barrage:
    'Each stand adds X shots to a Volley. The range and any extra shooting rules follow in the second brackets.',
  'weapon platform':
    'Its stands count their flank arcs as front arc for Line of Sight and obstruction when it volleys.',
  blessed:
    'Once per round, during a Clash or Charge, the regiment may re-roll all failed hit rolls or all failed Defense rolls. Declare it before rolling.',
  bodyguards:
    'No penalty when an attached character declines a Duel (a Broken regiment still cannot decline).',
  bodyguard:
    'No penalty when an attached character declines a Duel (a Broken regiment still cannot decline).',
  bravery: 'Ignores Fearsome and Terrifying. At the start of its activation it removes Broken.',
  'brutal impact': 'Its Impact Attacks lower the target’s Defense by X.',
  brittle:
    'Against Clash or Charge attacks from its flank, two successful Defense rolls count as fails; from its rear, four.',
  cleave: 'Hits from its Clash and Duel attacks lower the target’s Defense by X.',
  'counter attack':
    'Enemies that attack it in a Clash take a Hit for every attack roll of 6. No Morale Tests from these.',
  dauntless: 'Can never be Broken and always counts as Inspired.',
  decay: 'Takes 1 wound per stand (3 for a Monster) at the end of its activation. No Morale Tests.',
  'deadly blades':
    'In Clashes and Duels, each failed Defense roll of 6 against it costs the target 2 wounds instead of 1.',
  'deadly shot': 'In Volleys, each failed Defense roll of 6 costs the target 2 wounds instead of 1.',
  deadshots: 'Always counts as having Aimed Shot.',
  deadshot: 'Always counts as having Aimed Shot.',
  devout: 'When a friendly Priest casts on this regiment, one failed casting die becomes a success.',
  dread: 'Enemy regiments in contact with it cannot benefit from Inspired.',
  'flawless strikes': 'In Clashes and Duels, the enemy cannot use Defense against hit rolls of 1.',
  'fanatical devotion':
    'Heals 3 wounds whenever a friendly Priest successfully casts a non-Self spell on it.',
  fearless: 'Ignores Fearsome and Terrifying. On a character, it only applies in Duels.',
  fearsome:
    'Enemies in contact must roll a D6 at or under their best Resolve before a Combat Rally or Combat Reform, or the action is lost.',
  'fiend hunter': 'Re-rolls failed hit rolls against Monster and Brute regiments.',
  'forward force': 'The non-Monster regiment this character joins gains Flank.',
  flank:
    'Adds no die to the Reinforcement Roll. Before each class is rolled, its player chooses whether it arrives automatically or stays back (it cannot arrive earlier than its class allows).',
  'flawless drill': 'Once per game, a free extra Combat Reform during its activation.',
  'fluid formation':
    'A free extra Reform before its first action or after its last, if it has at most 3 stands in front before and after. It can see and volley from every arc.',
  flurry: 'Re-rolls failed hit rolls in Clashes and Duels.',
  fly: 'If every stand has Fly, it may March and Charge over other regiments, and ignores zonal terrain it only passes over. It may not end on a regiment or impassable terrain.',
  fury: 'After a successful Charge, +1 Attacks until the end of the round.',
  'glorious charge':
    'After a successful Charge, its Impact Attacks get +1 Clash and Terrifying (1) until the end of the round.',
  hardened:
    'When it rolls Defense, the attacker’s Cleave, Brutal Impact and Armor Piercing are reduced by X.',
  impact: 'Each stand makes X Impact Attacks when it charges home.',
  indomitable: 'When it fails Morale Tests, X of the failures count as passes, even against rear attacks.',
  inspired:
    '+1 Clash until the end of its activation, or re-roll unmodified 6s if Clash would reach 5 or more. Never applies to Impact Attacks.',
  irregular: 'Does not affect either side’s Reinforcement Lines. Stands without Irregular cannot join it.',
  'iron discipline':
    'Never loses Support, never re-rolls passed Morale Tests, and does not auto-fail Morale from rear attacks.',
  juggernaut: 'Its Charge distance is always March +5″ and cannot be changed by other rules.',
  'lethal demise':
    'When an enemy in contact destroys one of its stands, that enemy takes X automatic Hits to its front, with no other rules applied and no Morale Tests.',
  linebreaker: 'Ignores the target’s Shield and Bastion in Clashes, Duels and Impact Attacks.',
  'loose formation':
    'Volleys at it halve their Barrage, and spells at it halve their Hits (round up). It cannot make Impact Attacks. This does not stack with cover.',
  longshot: 'Its Effective Range equals its Barrage range.',
  oblivious: 'Takes only 1 wound per 2 failed Morale Tests (round up).',
  opportunists: 'Re-rolls failed hit rolls in Clashes and Volleys against an enemy’s flank or rear.',
  opportunist: 'Re-rolls failed hit rolls in Clashes and Volleys against an enemy’s flank or rear.',
  parry: 'Enemy stands engaged with it cannot re-roll failed hit rolls.',
  pathfinders: 'A Reinforcement Line it sets cannot be pushed back by enemies.',
  phalanx:
    '+1 Defense and +1 Resolve against Hits from its front. Its Charge distance is always March +3″. It cannot Inspire or occupy garrison terrain.',
  'precise shot': 'In Volleys, the enemy cannot use Defense against hit rolls of 1.',
  priest: 'Can cast spells (Spellcasting action) at Magic Level X.',
  'quicksilver strike': 'This character strikes first in Duels (simultaneously if both have it).',
  'quicksilver strikes': 'This character strikes first in Duels (simultaneously if both have it).',
  'rapid volley': 'In Volleys, each hit roll of 1 adds one more automatic Hit.',
  'relentless blows': 'In Clashes and Duels, each hit roll of 1 adds one more automatic Hit.',
  rider:
    'The character rides the Monster: no stand of its own, it uses the Monster’s size and March, and counts as in contact with whatever the Monster touches.',
  shield:
    '+1 Defense against Hits from its front arc (a character gets it in Duels from any side). Not while in garrison terrain.',
  shock: 'After a successful Charge, +1 Clash until the end of the round.',
  smite: 'In Clashes and Duels, the enemy cannot use its Defense at all.',
  support:
    'Each supporting stand adds X attacks in a Clash instead of 1. Lost while engaged in the flank or rear.',
  sureshot: 'Ignores the penalties for cover when shooting.',
  tenacious: 'When it rolls Defense, X failed rolls count as successes.',
  terrifying: 'Regiments in contact with it test Morale against its wounds at -X Resolve.',
  'torrential fire':
    'In Volleys within Effective Range, every 2 successful hits (round up) add one more automatic Hit.',
  trample:
    'At the end of its activation, an enemy in contact with its front takes X automatic Hits per stand. No Morale Tests. It can also wound Objective Markers.',
  unstoppable: 'May re-roll failed Charge rolls.',
  untouchable: 'Re-rolls failed Defense rolls of 6.',
  unyielding: 'Enemies cannot Seize an Objective Zone it is in range of, unless it is Broken.',
  vanguard: '+X March on its first March when it arrives from Reinforcements.',
  'weapon platform': 'Its flank arcs count as front arc for line of sight when it volleys.',
  wizard: 'Can cast spells (Spellcasting action) at Magic Level X.',
  bastion: 'Draw Event: +X Defense until the end of the round.',
  'biotic renewal': 'Draw Event: heal D6 wounds (D3 if not Infantry).',
  'double time': 'Draw Event: after two Marches this activation, take a free third March.',
  'fire and advance':
    'Draw Event: after a Volley as its second action, take a free March (not sideways or backwards).',
  'flux-powered': 'Draw Event: +2 Clash or +2 Attacks until the end of the round.',
  'murderous volley':
    'Draw Event: after Take Aim, its Volley wounds on targets within 12″ cause Morale Tests this round.',
  regeneration: 'Draw Event: heal X wounds (a character with it heals only itself).',
  aura: 'An [Aura] affects every regiment in range, measured from any point of a stand with it, while that regiment takes an action.',
  masteries: 'Character upgrades: usually one Mastery per character, each with its own points cost.',
  'always active': 'Works whether the unit is on the table, in Reinforcements or destroyed.'
};
