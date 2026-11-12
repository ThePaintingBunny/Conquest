/* Special rule glossary (paraphrased from the core rulebook) and faction-specific rule text. */
/* ---------- special rule glossary (paraphrased from the core rulebook) ---------- */
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
const FGLOSS = {
  Nords: {
    'slain bigger': [
      'Slain Bigger',
      'In a Duel against a Monster or a Rider character it gains +3 Evasion (max 3) and Fearless.'
    ],
    'savage retaliation': [
      'Savage Retaliation',
      "When charged in its front while mostly outside Hindering terrain, it at once makes Impact Attacks against the charger, at the same time as the charger's."
    ],
    rampage: ['Rampage', 'While below starting strength, +1 Clash and +1 Attacks.'],
    'tribal tactics': [
      'Tribal Tactics',
      'Mortal and Exalted units get an always-on bonus; once per game, after Supremacy, pick a tactic that lasts until the end of the round.'
    ],
    'prophecy unfulfilled': [
      'Prophecy Unfulfilled',
      'Friendly regiments get +2″ Charge distance against an enemy that is already engaged.'
    ],
    'ice, flesh & blood': [
      'Ice, Flesh & Blood',
      'Friendly regiments can still be Inspired when charging through Hindering terrain.'
    ],
    'trove-finds': ['Trove-finds', 'Optional magic items for characters, each taken once per army.'],
    'driven by carnage': [
      'Driven by Carnage',
      'Supremacy (Blooded): Half-Blood regiments heal 1 wound per enemy stand they destroy in Clashes or Impacts, and may reform after wiping out a regiment.'
    ],
    'raid tactics!': [
      'Raid Tactics!',
      "Supremacy (Jarl): use a different Tribal Tactic up to three times; Mortals and Exalted get +1 to Reinforcement rolls and can't be Shattered. Activated: they gain Fearless, Juggernaut and Inspired."
    ],
    'ruler of manheim': [
      'Ruler of Manheim',
      'Supremacy (Konungyr): use a Tribal Tactic after every Supremacy Phase (not the same twice in a row). Activated: every friendly unit gets all Tribal Tactics this round.'
    ],
    skývald: [
      'Skývald',
      'Supremacy (Shaman): the Shaman and its regiment ignore Water, Hindering, Perilous and Dangerous terrain; twice per game use Niflmire, Hregg or Snæstormur.'
    ],
    'divine protection': [
      'Divine Protection',
      "Supremacy (Volva): friendly regiments get +1 Evasion (max 2). Activated: the Warlord's spells ignore range, line of sight and engagement this round."
    ],
    'wild beasts': [
      'Wild Beasts',
      'Supremacy (Vargyr Lord): Half-Bloods can make Impact Attacks through Hindering terrain. Activated: they gain Shock and Fury this round.'
    ],
    'hurl it!': [
      'Hurl It!',
      "When its Charge falls short, it throws something at the target: a Barrage (1) Aimed Shot volley that deals wounds equal to the target's Size, with no Defense or Morale."
    ]
  },
  'City States': {
    'combat directives': [
      'Combat Directives',
      'After each Supremacy Phase the Eidolon picks a bonus until the end of the round: more Attacks, Parry for its regiment, or Cleave (+3).'
    ],
    'pike formation': [
      'Pike Formation',
      'Enemies touching its front get -3 Impact, and anything that charged its front loses Inspired and Shock this round.'
    ],
    automaton: [
      'Automaton',
      'Never Inspired; automatically passes Morale and Resolve tests, but can still be Broken or Shattered.'
    ],
    'herald of the forge god': [
      'Herald of the Forge God',
      'After activating, casts one free spell as if a character, needing 4 successes, with bonus dice for Hits it caused.'
    ],
    'exploit flanks': [
      'Exploit Flanks',
      'Enemies hit in the flank or rear by its Volley within Effective Range re-roll successful Defense rolls of 1.'
    ],
    'strategic stack': [
      'Strategic Stack',
      'Once per round, hide a drawn regiment card face down instead of activating it; play it later and it gets Inspired.'
    ],
    'direct orders': ['Direct Orders', 'Entourage activations count as Strategic Stack activations.'],
    'auxiliary stands': [
      'Auxiliary Stands',
      'Extra stands bought for a regiment with their own profile; they sit in the front rank and are never restored.'
    ],
    'carrier of the godflesh': [
      'Carrier of the Godflesh',
      'Supremacy (Mechanist): when a card goes into the Strategic Stack, pick a regiment to gain Hardened (+1), max 2, this round.'
    ],
    'army of lions': [
      'Army of Lions',
      'Supremacy (Polemarch): its regiment gets +1 Clash (max 4) and Tenacious (1); nearby Infantry re-roll failed Morale 6s. Once per game it can win Priority.'
    ],
    'infantry tactics': [
      'Infantry Tactics',
      'Supremacy (Aristarch): once per game re-roll failed Reinforcement rolls; activated, a chosen Battlefield Order affects all non-Monster regiments.'
    ],
    'hammer and anvil': [
      'Hammer and Anvil',
      'Supremacy (Ipparchos): once per round an Infantry or Cavalry regiment gets a free Reform as its last action; those activated from the Strategic Stack gain Shock.'
    ],
    'bringing back the children of fire': [
      'Bringing Back the Children of Fire',
      'Supremacy (Promethean Oracle): Titans gain Priest (+3); a Titan from the Strategic Stack counts as 6 stands for Seizing.'
    ],
    'bestowed relics': ['Bestowed Relics', 'Magic items characters can buy, each once per army.'],
    modifications: ['Modifications', 'Upgrades only Eidolons (up to 3) and Mechanists (1) can buy.'],
    titan: ['Titan', 'Battlefield role of the Promethean Oracle, Promethean, Hephaestian and Talos.']
  },
  "W'adrhŭn": {
    stoic: ['Stoic', 'Its regiment gains Indomitable (1).'],
    'to the last breath': [
      'To The Last Breath',
      'Draw Event: a friendly non-Monster regiment within 10″ heals 4 wounds (once per regiment per round).'
    ],
    "tribe's pride": ["Tribe's Pride", 'Its regiment gains Flurry.'],
    'crushing force': ['Crushing Force', 'Friendly Tribes regiments within 8″ gain Trample (1).'],
    tempo: ['Tempo', 'Tribes regiments in its warband gain Vanguard (3).'],
    'ride the lightning': ['Ride the Lightning', 'Thunder Riders in its warband gain Flank.'],
    'ceaseless hunt': ['Ceaseless Hunt', 'Its regiment gains the Fire and Advance Draw Event.'],
    'expert hunters': [
      'Expert Hunters',
      'Speakers regiments in its warband ignore Hindering, Dangerous and Perilous terrain.'
    ],
    'mounted hunters': ['Mounted Hunters', 'When it Chants the Battlecry it may make a free Volley.'],
    'bird of prey': [
      'Bird of Prey',
      'Once per round, marching over a Size 1 enemy deals 5 Hits to its flank, no Morale.'
    ],
    'death from above': [
      'Death from Above',
      'After a successful charge into a flank or rear, Brutal Impact (2) this round.'
    ],
    'blood to be spilled': ['Blood to be Spilled', 'Chant: Impact (+2) this round.'],
    'proven warriors': ['Proven Warriors', 'Chant: +2″ Charge distance this round.'],
    momentum: [
      'Momentum',
      'Chant: if its first action is a straight March, its Barrage range grows by the distance marched (max +4″).'
    ],
    'show the path': [
      'Show the Path',
      'Chant: other Tribes regiments within 8″ get +1 Clash (max 4) this round.'
    ],
    'cultists of conquest': ['Cultists of Conquest', 'Chant: +3″ on its first March.'],
    'singing bullets': ['Singing Bullets', 'Chant: gains Longshot this round.'],
    'cultists of death': ['Cultists of Death', 'Chant: gains Flawless Strikes this round.'],
    swarm: [
      'Swarm',
      'Stands count as Size 1 and cannot Chant themselves, though they still add Chant markers.'
    ],
    penance: ['Penance', 'Chant: Juggernaut and ignores Hindering terrain this round.'],
    'mounted riders': ['Mounted Riders', 'Chant: a free Volley and Aimed Shot this round.'],
    'thundering charge': [
      'Thundering Charge',
      'Chant: after a March then a Charge, Brutal Impact (+1) this round.'
    ],
    'cultists of war': ['Cultists of War', 'Chant: Terrifying (2) this round.'],
    'towering presence': ['Towering Presence', 'Its stands count as Size 4.'],
    'march of giants': ['March of Giants', 'Its March can never be reduced.'],
    'dominating presence': [
      'Dominating Presence',
      "Chant: Unyielding this round, and its stand count for Seizing can't be reduced."
    ],
    'predatory shriek': ['Predatory Shriek', 'Chant: Terrifying (+1) this round.'],
    'drum beat': ['Drum Beat', 'Friendly regiments within 10″ that add a Chant marker may add a second one.'],
    'primal cacophony': [
      'Primal Cacophony',
      'Aura, Chant: enemies within 12″ cannot Heal, Rally or Entourage-activate.'
    ],
    'war chant': [
      'War Chant',
      'Each character follows a Cult (Famine, Death or War; the Warlord may pick Conquest), and so does its warband.'
    ],
    chant: [
      'Chant',
      "With three Chant markers, discard two or more of one Cult's markers to gain that Cult's benefit this round."
    ],
    'cults of ukunfazane': [
      'Cults of Ukunfazane',
      'A character may take up to two Chosen of its Cult as Restricted picks.'
    ],
    'the tribes': ['The Tribes', 'Battlefield role of the tribal units, such as Braves and Veterans.'],
    'the speakers': ['The Speakers', "Battlefield role of the Speakers' hunters, riders and beasts."],
    'the cults': ['The Cults', 'Battlefield role of the Scions, Chosen and the Drum Beast.']
  },
  'Old Dominion': {
    'animate vessel': [
      'Animate Vessel',
      'Gains Terrifying (1) and Brittle; always passes Morale and Resolve tests, has no Resolve and cannot Inspire.'
    ],
    'dark shepherd': [
      'Dark Shepherd',
      'Draw Event: a friendly regiment within 12″ takes wounds to finish off its most wounded stand. No Morale Tests.'
    ],
    'font of dark power': [
      'Font of Dark Power',
      'Aura: tokens from nearby friendly stand losses go to the Fallen Pantheon pool, and nearby Fallen Pantheon vessels gain Attacks by tier.'
    ],
    'unhallowed ground': [
      'Unhallowed Ground',
      'Cannot be healed and counts as Size 4; counts as six stands for being in range of a zone but zero for Seizing.'
    ],
    'exploitation of divine vanity': [
      'Exploitation of Divine Vanity',
      'Draw Event: take 3 wounds for a Dark Power token, then pick a boon such as Aura of Death (+10).'
    ],
    acolytes: ['Acolytes', 'When its Command Stand dies, gain 2 Power tokens.'],
    'forced march': ['Forced March', 'The Standard Bearer adds +2″ instead of +1″ to its second March.'],
    'divine shard': [
      'Divine Shard',
      'When a stand dies and its token goes to the Fallen Pantheon pool, add one more.'
    ],
    'dark awakening': [
      'Dark Awakening',
      'Draw Event: discard Power tokens; every two buys +2 Clash, Cleave (2), Brutal Impact (2) or Impact (+2) this round.'
    ],
    'sundering charge': ['Sundering Charge', 'After a successful charge, Cleave (+1) this round.'],
    "heaven's descent": [
      "Heaven's Descent",
      'Draw Event: while engaged, spend 2 Power tokens for Impact Attacks on an engaged enemy, or Inspired and Cleave (+1).'
    ],
    'wedge!': ['Wedge!', 'After a successful charge, Cleave (+1) this round.'],
    'exhortation of eternal faith': [
      'Exhortation of Eternal Faith',
      'Draw Event: take 3 wounds for a Power token, then pick a boon (Command Stand buffs, +6 stands for Seizing, or -1 enemy Resolve aura).'
    ],
    'the legion': ['The Legion', 'Battlefield role that some rules and treasures refer to.'],
    'the creed': ['The Creed', 'Battlefield role that some rules and treasures refer to.'],
    'the fallen pantheon': [
      'The Fallen Pantheon',
      'Battlefield role that some rules and treasures refer to.'
    ],
    'memories of old': [
      'Memories of Old',
      'An action that grants the regiment the rules listed in its entry until the end of the round.'
    ],
    'blasphemous soma': [
      'Blasphemous Soma',
      'Before each Supremacy Phase, add a Power token to a pool of your choice.'
    ],
    empowerment: [
      'Empowerment',
      'Destroyed vessels feed Power tokens into the Dark Power or Fallen Pantheon pool; higher tiers unlock stronger effects.'
    ],
    treasures: ['Treasures', 'Character upgrades, each once per army.'],
    'dark blessings': [
      'Dark Blessings',
      'Character upgrades (Old Ways, Dark Art, Forgotten Codex), each once per army.'
    ]
  },
  'Sorcerer Kings': {
    'elemental assault': [
      'Elemental Assault',
      'Draw Event: spend 3 Ritual markers to give a nearby friendly Mortal regiment Untouchable or Relentless Blows.'
    ],
    'elemental conduit': [
      'Elemental Conduit',
      'Draw Event (also when arriving): add a Ritual marker to a Ritual of its Court being prepared.'
    ],
    'elemental prowess': [
      'Elemental Prowess',
      'Draw Event: spend 3 Ritual markers to heal a nearby Elemental 4 wounds; 2 more gives it Blessed.'
    ],
    'infernal branding': [
      'Infernal Branding',
      'Gains Rapid Volley when Inflamed or when shooting an Inflamed enemy.'
    ],
    'fire elemental': [
      'Fire Elemental',
      'While Inflamed, or charging an Inflamed enemy, gains Juggernaut this round.'
    ],
    arrogance: [
      'Arrogance',
      '+3″ Charge distance against Monsters or character-led regiments; may offer a Duel and gains Flurry if refused.'
    ],
    'last word': [
      'Last Word',
      'When destroyed, an enemy within 8″ of a friendly character or Wizard takes 8 flank Hits, no Morale.'
    ],
    hubris: ['Hubris', '+3″ Charge distance against Monsters.'],
    'on soaring winds': [
      'On Soaring Winds',
      'An action: March at once, ignoring units and terrain, even while engaged, in any direction.'
    ],
    'air elemental': [
      'Air Elemental',
      "Its Reinforcement Line can't be pushed back; its first March each activation gives +1 Evasion (max 3)."
    ],
    'elemental tether': [
      'Elemental Tether',
      'Friendly Air casters can target it, or regiments within 8″ of it, ignoring range and sight.'
    ],
    'fury of the tempest': [
      'Fury of the Tempest',
      'After an Air Ritual in the previous draw, its Relentless Blows also trigger on 2s.'
    ],
    'eye of the storm': [
      'Eye of the Storm',
      'May volley engaged enemies while engaged; after an Air Ritual, a free Volley or spell.'
    ],
    'earthen aegis': [
      'Earthen Aegis',
      'Within 3″ of Earth terrain: Regeneration (+4) and no wounds from Dangerous or Perilous terrain.'
    ],
    'shattered perfection': [
      'Shattered Perfection',
      'Once below starting strength: Smite, Fury, Oblivious and +2″ Charge.'
    ],
    'earth elemental': ['Earth Elemental', 'Within 3″ of an Earth marker, gains Untouchable.'],
    'raging elements': [
      'Raging Elements',
      'Once below starting strength: Flurry and an extra Clash action each activation.'
    ],
    'wavebreaker form': [
      'Wavebreaker Form',
      'On activation choose Impact (+2) or Brutal Impact (+1) this round.'
    ],
    'water elemental': [
      'Water Elemental',
      'Ignores Water terrain penalties and re-rolls failed hit rolls of 6.'
    ],
    'aqueous branding': [
      'Aqueous Branding',
      'After it casts on an enemy, friendly Water casters get +1 success against that enemy this round.'
    ],
    'waveborne form': ['Waveborne Form', 'On activation choose Wizard (+2) or Barrage (+2) this round.'],
    'arcane tide form': [
      'Arcane Tide Form',
      'On activation choose a free Spellcasting action or +4″ spell range.'
    ],
    tidecaller: [
      'Tidecaller',
      'On activation choose an aura that turns nearby Water Elementals, or engaged enemies, into Water terrain.'
    ],
    'tidal summons': [
      'Tidal Summons',
      'When it arrives, one more friendly Water Elemental arrives automatically.'
    ],
    'stormqueen form': ['Stormqueen Form', 'On activation choose Impact (+6) or +4 Attacks this round.'],
    'dread tide': [
      'Dread Tide',
      'Engaged enemies count as Water terrain in Clashes; nearby Water Elementals gain Terrifying (+1).'
    ],
    'sorcerous patronage': [
      'Sorcerous Patronage',
      'Characters may take non-Monster Elementals of their Court as Mainstay, plus one extra Rajakur or Dhanur Disciples.'
    ],
    'elemental markers': [
      'Elemental Markers',
      'Earth and Water markers placed by spells and rituals; Water markers make 3″ of Water terrain.'
    ],
    rituals: [
      'Rituals',
      'Prepared in the Supremacy Phase, they gather markers and fire when their card is drawn.'
    ],
    'elemental discharge': [
      'Elemental Discharge',
      'The first Ritual prepared each round starts with markers equal to the round number (max 5).'
    ]
  },
  Yoroni: {
    'powerful presence': [
      'Powerful Presence',
      'Counts as 3 stands for Seizing while attached to a non-Light regiment.'
    ],
    'monstrous inspiration': [
      'Monstrous Inspiration',
      'Draw Event: share one of its Ideal Card effects with friendly regiments within 8″ this round.'
    ],
    'whispered illusion': [
      'Whispered Illusion',
      'Draw Event: enemies charging or clashing with it must pass a Resolve test with penalties.'
    ],
    'blade masters': ['Blade Masters', 'If all Tengu Bushi, Flawless Strikes also works on hit rolls of 2.'],
    'spirit breeze': ['Spirit Breeze', 'With at least one Tengu Ayakashi stand, +1 March.'],
    'in the fold': ['In the Fold', 'If all Origami Warriors: Vanguard (3) and cannot be Broken.'],
    visage: ['Visage', 'Friends can see through it; it gains Tenacious (1) against Volleys.'],
    cheerful: ['Cheerful', 'Aura: friendly non-Monsters within 8″ get +1 Resolve.'],
    'sweeping step': [
      'Sweeping Step',
      'As its first action, two free Marches through units, then a free Clash on one it passed.'
    ],
    'enlightening fury': [
      'Enlightening Fury',
      'Ideal Card effects it gains last for the rest of the battle.'
    ],
    'honor beyond death': ['Honor Beyond Death', 'When activated by a Ka Ideal Card, it stops being Broken.'],
    'wrathful momentum': [
      'Wrathful Momentum',
      'Re-rolls failed hit rolls of 6; Terrifying (1) against Size 1 regiments.'
    ],
    'titanic defiance': ['Titanic Defiance', 'Fearless while engaged with an enemy Monster.'],
    'ideal cards': [
      'Ideal Cards',
      'Five extra cards in your Command Stack; any can activate any unit, with bonuses when the type matches.'
    ],
    'modular regiments': [
      'Modular Regiments',
      'Regiments of mixed stands; the Command Stand sets the card type, class and Command rules.'
    ],
    enlightened: ['Enlightened', 'The first time it would be Broken, it Rallies instead.'],
    disciplines: ['Disciplines', 'Character upgrades, one per character and once per army.'],
    disruptive: ['Disruptive', 'Enemies touching its front get -1 Clash.'],
    swarm: ['Swarm', 'Rule text not published yet; no effect is applied.']
  },
  'Weaver Courts': {
    'planting an ambush': [
      'Planting an Ambush',
      'Draw Event: a friendly Infantry regiment within 12″ gains Prowl and Pounce this round.'
    ],
    bloom: [
      'Bloom',
      "Draw Event: spend Seed markers; 1 gives the Command Stand +2 Attacks (and +2 Barrage), 2 uses the Warlord's effect, 3 grants the current Season's role."
    ],
    'rooted might': [
      'Rooted Might',
      'An action: every other friendly regiment within 8″ gets a Seed marker.'
    ],
    'bombing run': [
      'Bombing Run',
      'Once per round, a regiment it flies over takes 3 Hits per stand, and a friendly non-Monster heals 4 wounds.'
    ],
    'sowing shot': ['Sowing Shot', 'Its Volleys into a flank or rear gain Armor Piercing (1).'],
    'echoes of whispers': [
      'Echoes of Whispers',
      'Once per round, heals 3 wounds when a nearby friend spends 3+ Seed markers on Bloom.'
    ],
    'avatar of nature': [
      'Avatar of Nature',
      'Gains a Seed marker whenever an enemy Clashes with it or volleys it.'
    ],
    'devouring moulder': ['Devouring Moulder', 'Heals 1 wound for each enemy stand it destroys.'],
    'brute force': [
      'Brute Force',
      "In a Clash, +1 Attacks for each point its Clash beats the target's best Clash."
    ],
    'pick the quarry': [
      'Pick the Quarry',
      'Draw Event: choose Barrage (3) 14″ with Armor Piercing (2), or Barrage (5) 16″.'
    ],
    'wild hunters': [
      'Wild Hunters',
      'When it Blooms, choose Deadly Blades, Cleave (+1) or Flurry this round.'
    ],
    prowl: [
      'Prowl',
      "Enemies 8″+ away can't see it, it doesn't count for Seizing and has -2 March; lost if spotted within 8″ or if it shoots or casts."
    ],
    pounce: ['Pounce', 'While Prowling, drop Prowl to gain Terrifying (1) and Linebreaker this round.'],
    'cycle of seasons': [
      'Cycle of Seasons',
      "The army's Season moves Spring, Summer, Autumn, Winter after each Supremacy Phase from round 2."
    ],
    'seed markers': [
      'Seed Markers',
      'Gained after Clashes and Volleys (max 3 per regiment) and spent on Bloom.'
    ],
    'verdant awakening': ['Verdant Awakening', 'Spring: Court of Spring regiments get +2 March.'],
    'sunfire reprisal': ['Sunfire Reprisal', 'Summer: Court of Summer regiments gain Shock.'],
    "harvest's resolve": ["Harvest's Resolve", 'Autumn: Court of Autumn regiments gain Culling.'],
    'frostbound defiance': ['Frostbound Defiance', 'Winter: Court of Winter regiments gain Dread.'],
    seedbearer: ['Seedbearer', 'An action: give a friendly regiment within 12″ a Seed marker.'],
    'gifts of lifebinding': [
      'Gifts of Lifebinding',
      'Character upgrades, one per character and once per army.'
    ]
  },
  'Hundred Kingdoms': {
    'personal bodyguard': [
      'Personal Bodyguard',
      'One Infantry regiment in its warband may become Veteran for free.'
    ],
    'masters of the sword': [
      'Masters of the Sword',
      "Draw Event: in a Clash, each point its unmodified Clash beats the enemy's buys Flawless Strikes, Relentless Blows or +1 Attacks."
    ],
    'memories of the red years': [
      'Memories of the Red Years',
      "An army can't have both Theist and Orders characters."
    ],
    'dynastic alliances': [
      'Dynastic Alliances',
      'Add one extra character of another role as a Dynastic Ally with its own Supremacy (only one Activated Supremacy per phase).'
    ],
    'relentless drills': [
      'Relentless Drills',
      'Veteran Infantry of 5+ stands count as Inspired; non-Light Infantry Command Stands count extra for Seizing.'
    ],
    'the sacred relics': [
      'The Sacred Relics',
      'If every character is an Orders character, each takes one Sacred Relic free and Order upgrades open up.'
    ],
    imperial: ['Imperial', 'Battlefield role of the Imperial army.'],
    feudal: ['Feudal', 'Battlefield role of the noble levies.'],
    theist: ['Theist', "Battlefield role of the Church's forces; can't be fielded with Orders characters."],
    'the orders': ['The Orders', 'Battlefield role of the knightly Orders.'],
    veteran: ['Veteran', 'Battlefield role, often bought with points, that unlocks extra rules.'],
    heirlooms: ['Heirlooms', 'Character upgrades, each once per army.'],
    'wedge!': ['Wedge!', 'After a successful charge, Cleave (+1) this round.'],
    'pike formation': [
      'Pike Formation',
      'Enemies touching its front get -3 Impact, and anything that charged its front loses Inspired and Shock this round.'
    ],
    'towering presence': ['Towering Presence', 'Its stands count as Size 4.']
  },
  Spires: {
    practitioner: ['Practitioner', 'Once per activation, use a Pheromancy or Biomancy ability as an action.'],
    'symbiotic command': [
      'Symbiotic Command',
      'An action: a friendly Clone regiment within 12″ gains Double Time this round.'
    ],
    'mighty swing': ['Mighty Swing', 'An action: an engaged enemy takes 1 wound, no Resolve test.'],
    'imposing excellence': ['Imposing Excellence', 'This character and its Husk regiment gain Parry.'],
    'ceaseless hunt': ['Ceaseless Hunt', 'Its regiment gains Fire and Advance.'],
    snapshot: ['Snapshot', 'An action: a visible enemy in Barrage range takes 1 wound, no Resolve test.'],
    'master manipulator': [
      'Master Manipulator',
      'Once per round, before Reinforcement rolls, make an Offer to your opponent; either answer helps one of your reserves.'
    ],
    'the best that money can buy': [
      'The Best That Money Can Buy',
      'Its regiment takes half wounds from Decay.'
    ],
    'assassination directive': [
      'Assassination Directive',
      'Once per game, takes the place of a front-rank stand in a clashing Infantry regiment, deals Hits and may Duel.'
    ],
    'refined beyond nature': [
      'Refined Beyond Nature',
      'Its regiment ignores Duel refusal penalties; it always passes Resolve and Morale tests.'
    ],
    'optimized fodder': [
      'Optimized Fodder',
      'Takes at most 6 wounds per Decay; at 6+ stands its Strain gets stronger.'
    ],
    'privileged observer': [
      'Privileged Observer',
      'With a Biomancer or Pheromancer attached, it may become Medium before the first Reinforcement round.'
    ],
    disruptive: ['Disruptive', 'Enemies touching its front get -1 Clash.'],
    'hypersynaptic bonding': [
      'Hypersynaptic Bonding',
      'Its Volley target loses the benefit of Cover and Loose Formation.'
    ],
    'inherited excellence': ['Inherited Excellence', 'Enemies touching its front get -1 Attacks against it.'],
    'superior creations': ['Superior Creations', 'Takes one less wound from each Decay.'],
    'resounding malevolence': [
      'Resounding Malevolence',
      'After a March then a Charge, failed enemy Defense rolls of 6 cost an extra wound.'
    ],
    'just desserts': [
      'Just Desserts',
      'Sect bonus: Sovereign Lineage Hardened (1), Directorate +2 March, Underspire Regeneration (2).'
    ],
    'microbial shroud': ['Microbial Shroud', 'Aura: enemies within 8″ cannot Heal or Rally.'],
    'spined descent': [
      'Spined Descent',
      'Once per activation, a free Volley that can also hit anything it moved over.'
    ],
    'hypercatalytic discharge': [
      'Hypercatalytic Discharge',
      "Enemies can't use Evasion against its Volleys."
    ],
    'visceral bombardment': [
      'Visceral Bombardment',
      'Volley hit rolls of 1 also hit every other enemy within 3″ of the target.'
    ],
    'indiscriminate omnivore': [
      'Indiscriminate Omnivore',
      'Heals 2 wounds when a friendly regiment within 12″ uses Strain Expression.'
    ],
    gorged: ['Gorged', 'Once back at full wounds: +6 Attacks and its Strain is always on.'],
    'endless hunger': [
      'Endless Hunger',
      'Against a smaller enemy, +1 Clash and Terrifying (2) for that Clash.'
    ],
    sects: [
      'Sects',
      'The army follows one Sect (Underspire, Directorate or Sovereign Lineage) for its abilities.'
    ],
    "the master's touch": ["The Master's Touch", 'The army must pick one Sect and gains its abilities.'],
    'strain expression': [
      'Strain Expression',
      "Draw Event: gain the regiment's Strain bonus and Decay this round."
    ],
    strain: ['Strain', 'Bonus gained through Strain Expression, which also brings Decay.']
  },
  Dweghom: {
    'preternatural focus': [
      'Preternatural Focus',
      'Draw Event: a friendly regiment within 10″ becomes Awakened.'
    ],
    'unassailable authority': ['Unassailable Authority', 'Draw Event: its regiment becomes Awakened.'],
    'forged by the elements': [
      'Forged by the Elements',
      'Draw Event: spend markers for an Empowerment (which Awakens it); if unused, gain a marker.'
    ],
    'testaments to honor': [
      'Testaments to Honor',
      'When Awakened, nearby Clan regiments within 6″ also Awaken.'
    ],
    'fires of the descent': [
      'Fires of the Descent',
      'Draw Event: if Awakened, a friendly regiment within 8″ gains Relentless Blows.'
    ],
    battery: ['Battery', 'Wounding Volleys give the target -1 March this round.'],
    'unstable alloys': ['Unstable Alloys', 'Gains Untouchable when targeted by a Volley.'],
    creeds: ['Creeds', 'The army picks Ardent, Tempered or Clan, which shapes bonuses and Warlords.'],
    ardent: ['Ardent', 'Creed and role: regiments Awaken on charges and kills, and gain Pathfinders.'],
    tempered: ['Tempered', 'Creed and role: rewards Elemental Power and spellcasting.'],
    clan: ['Clan', 'Creed and role: Awakened Clan regiments gain Oblivious and Iron Discipline.'],
    'the gift': ['The Gift', 'Dweghom can be Awakened.'],
    awakened: ['Awakened', 'Cannot Break this round; if Broken, it Rallies at once.'],
    forged: ['Forged', 'Role of regiments that make and spend Elemental Power markers.'],
    heralds: [
      'Heralds',
      'Officers: Fire re-rolls 6s to hit, Magma gives Linebreaker, Stone gives Untouchable.'
    ],
    empowerment: [
      'Empowerment',
      'Spend Elemental Power markers for listed bonuses; doing so Awakens the regiment.'
    ],
    'pike formation': [
      'Pike Formation',
      'Enemies touching its front get -3 Impact, and anything that charged its front loses Inspired and Shock this round.'
    ]
  }
};
