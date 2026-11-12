/* Character upgrade catalogue per faction (items, masteries, artefacts), paraphrased from the 2026 army lists. */
/* character upgrade catalogue per faction (paraphrased from the 2026 army lists) */
const UPG = {
  Nords: {
    rule: 'Each character takes 1 Trove-find (Konungyr 2) and 1 Mastery; upgrades from different categories; each once per army. Jotnar Seidr takes none.',
    list: [
      [
        'Trove-find',
        'Raven Messengers',
        10,
        '[Mortals] characters',
        'If any of your regiments is engaged, one more regiment automatically passes its Reinforcement Roll.'
      ],
      [
        'Trove-find',
        'Heralds of the Storm',
        10,
        'Shaman, Volva',
        'Regiments within 10" count as 3 stands larger against enemy spells.'
      ],
      ['Trove-find', 'Coils of the Serpent', 20, 'any', 'Its regiment gains +1 Evasion (max 2).'],
      [
        'Trove-find',
        'Figurehead of the Naglfar',
        20,
        'any',
        'Its regiment gains Tenacious (2) against Volleys.'
      ],
      [
        'Occult',
        'Occultists Charm',
        10,
        'Shaman, Jarl',
        'Bloody Sacrifice: its regiment takes 2 wounds for +1 March on its first action.'
      ],
      ['Armor', 'Ty Jokull, the Rimeheart', 40, 'any', 'Its regiment gains Hardened (1).'],
      ['Armor', 'Massive Frame', 10, 'any', 'Gains Impact (+2) and Linebreaker.'],
      ['Armor', 'Mark of the Beast', 5, 'any', 'Its regiment gains the Half-Bloods role.'],
      [
        'Weapon',
        'Elding, the Skypiercer',
        30,
        'Blooded, Jarl, Konungyr',
        'It and its regiment gain Sureshot; it gains Barrage (5).'
      ],
      [
        'Weapon',
        'Rjóða, the Red Bringer',
        30,
        'any',
        'Its regiment gains Impact (2); +2 Attacks; may always Die Fighting.'
      ],
      [
        'Weapon',
        'Blóðíss, the Blood Thirster',
        20,
        'any',
        'Before a Clash or Duel, take up to 3 wounds for that many extra Attacks; cannot refuse Duels.'
      ],
      ['Weapon', 'Vinda, the Dancer', 20, 'any', 'One extra Attack for every 2 Hits in a Clash or Duel.'],
      ['Weapon', 'Reyngeir, the God Spear', 20, 'any', 'Gains Parry and Cleave (2).'],
      [
        'Teaching',
        'Wealth of a Hundred Raids',
        30,
        '[Mortals] or [Exalted] characters',
        'Its regiment gains Dauntless.'
      ],
      [
        'Teaching',
        'Cautious Strikes',
        10,
        'Konungyr, Jarl (Warlord only)',
        'A failed charge by a friendly Exalted regiment lets it March instead.'
      ],
      [
        'Teaching',
        'Lessons of the Jotun War',
        10,
        'Konungyr, Jarl',
        'Once per battle its regiment gains a Tribal Tactic for the round.'
      ],
      ['Teaching', 'Jotun Shepard', 5, 'Shaman', 'Aura: friendly Jotun within 12" gain Indomitable (+2).'],
      [
        'Tale',
        'Call the Hunt',
        30,
        '[Half-Bloods] (Warlord only)',
        'Each round one extra Half-Bloods regiment may arrive.'
      ],
      ['Tale', 'Vicious Assault', 15, 'any', 'Its regiment gains Fury.'],
      [
        'Tale',
        'Pack Tactics',
        10,
        '[Half-Bloods] characters',
        'Half-Blood Cavalry and Brutes clashing a Monster gain Support equal to Attacks.'
      ],
      ['Saga', "Ancestors' Blessing", 15, 'Shaman, Volva', 'Its regiment gains the Bastion (1) Draw Event.'],
      ['Saga', 'Promise of Flesh', 10, 'any', 'Its Half-Bloods regiment gains Vanguard (3).'],
      ['Saga', 'Written in Bones', 5, 'any', 'Its regiment cannot be Shattered.']
    ]
  },
  'City States': {
    rule: 'Upgrades from different categories, each once per army. Relics: Polemarch 2, Aristarch 1, Ipparchos 1, Mechanist 1 (Relic or Modification). Eidolon up to 3 Modifications. Masteries by listed category. Promethean Oracle takes none.',
    list: [
      [
        'Banner',
        'Standard of Last Oration',
        45,
        'Polemarch, Aristarch, Mechanist',
        'Its regiment re-rolls failed Defense near an Objective Zone once activated.'
      ],
      [
        'Banner',
        'Aristia',
        20,
        'Polemarch, Aristarch, Mechanist',
        'A nearby non-Monster regiment charges at March +5" for a round.'
      ],
      [
        'Banner',
        'Primodynamic Globe',
        10,
        'Polemarch, Aristarch, Mechanist',
        'Enemy spells on friends within 8" can backfire harmlessly.'
      ],
      [
        'Armor',
        "Chrysaor's Helmet",
        30,
        'Eidolon, Mechanist, Polemarch, Aristarch, Ipparchos',
        'Gains Dread; Duel enemies lose Quicksilver Strike and Flurry.'
      ],
      [
        'Armor',
        'Living Breastplate',
        5,
        'Eidolon, Mechanist, Polemarch, Aristarch, Ipparchos',
        'Re-rolls failed Defense in Duels.'
      ],
      [
        'Weapon',
        'Blades of Eakides',
        30,
        'Eidolon, Mechanist, Polemarch, Aristarch, Ipparchos',
        '+1 Clash, -1 Attacks, Cleave (4).'
      ],
      [
        'Weapon',
        "Atalanta's Spear",
        25,
        'Eidolon, Mechanist, Polemarch, Aristarch, Ipparchos',
        '+1 Attacks and Cleave (1).'
      ],
      [
        'Weapon',
        'Featherblade',
        10,
        'Eidolon, Mechanist, Polemarch, Aristarch, Ipparchos',
        'Gains Quicksilver Strikes.'
      ],
      [
        'Inscription',
        'Inscription of Lighter Alloys',
        35,
        'Eidolon, Mechanist, Polemarch, Aristarch, Ipparchos',
        'Draw Event: its Infantry gets -1 Defense and +3 March, losing Phalanx and Shield.'
      ],
      [
        'Inscription',
        'Inscription of Impact Resistance',
        20,
        'Eidolon, Mechanist, Polemarch, Aristarch, Ipparchos',
        'Draw Event: its regiment gains Tenacious (1) this round.'
      ],
      [
        'Inscription',
        'Inscription of Balance',
        10,
        'Eidolon, Mechanist, Polemarch, Aristarch, Ipparchos',
        'Counts 3 stands larger against enemy spells.'
      ],
      [
        'Modification',
        'Alternate Soma',
        20,
        'Eidolon',
        'A tougher profile; counts as 3 stands for objectives on non-Light regiments.'
      ],
      [
        'Modification',
        'Alternate Programming',
        15,
        'Eidolon',
        'Swaps its Combat Directives for Heavy Exoskeleton, Relentless or Precision Armament.'
      ],
      [
        'Modification',
        'Anticythian Alloy Gears',
        20,
        'Eidolon, Mechanist',
        'Its Clockwork Hoplites gain +1 March and Double Time.'
      ],
      [
        'Modification',
        'Resonance Receptors',
        10,
        'Eidolon, Mechanist',
        'Its regiment gets friendly Promethean spells at any range.'
      ],
      [
        'Modification',
        'Hephaestian Alloys',
        10,
        'Eidolon, Mechanist',
        'Enemies touching its regiment reduce Aura of Death by 4.'
      ],
      [
        'Mastery (Tactical)',
        'Expert Scouts',
        20,
        'Aristarch, Ipparchos',
        'Non-Phalanx Infantry from the Strategic Stack gain Vanguard (3).'
      ],
      [
        'Mastery (Tactical)',
        'Initiative',
        20,
        'Aristarch, Ipparchos',
        'Its regiment from the Strategic Stack may make a free Charge.'
      ],
      ['Mastery (Tactical)', 'Long Lineage', 15, 'Aristarch, Ipparchos', 'One extra Character Upgrade.'],
      [
        'Mastery (Combat)',
        'Combined Arms Drills',
        40,
        'Polemarch, Ipparchos',
        'Brutes and Cavalry charging an enemy that charged Infantry gain Terrifying (max 2).'
      ],
      [
        'Mastery (Combat)',
        'Disorienting Strikes',
        10,
        'Polemarch, Ipparchos',
        'Enemy characters get -1 Clash in Duels with it.'
      ],
      [
        'Mastery (Combat)',
        'Overkill',
        10,
        'Polemarch, Ipparchos',
        'Each Duel wound it inflicts forces a Morale Test on the enemy regiment.'
      ]
    ]
  },
  "W'adrhŭn": {
    rule: 'One Artefact per character; other upgrades from different categories; each once per army. One Mastery (riders may be bought more than once). Winglord Predator takes none.',
    list: [
      [
        'Cult Artefact',
        "Roar of the Awe'khwge",
        30,
        'Cult of Conquest characters',
        'Its Infantry gains Blessed when it Chants Conquest.'
      ],
      ['Cult Artefact', "Death's Gaze", 25, 'Cult of Death characters', 'Its regiment gains Impact (3).'],
      [
        'Cult Artefact',
        'Scars of Endekar',
        10,
        'Cult of Famine characters',
        'Its regiment gains Terrifying (+1) after charging near an Objective Zone.'
      ],
      [
        'Cult Artefact',
        'The Horn of Ronan',
        30,
        'Cult of War characters',
        'Its Cavalry gains Trample (+2) when it Chants War.'
      ],
      ['Armor', 'Hide of the Silent Hunter', 15, 'any', 'Its regiment gains Opportunists.'],
      ['Armor', 'Beads of Death', 10, 'any', 'Bloody Sacrifice: 2 wounds for +1 March on the first action.'],
      ['Armor', "Death's Reach", 10, 'Predator, Mounted Predator', '+1 Attacks and Cleave (+1).'],
      ['Weapon', 'Brood of Omgorah', 20, 'any', 'Becomes Cavalry with Brutal Impact (2) and Impact (4).'],
      [
        'Weapon',
        'Kiss of the Dilosaur',
        25,
        'any',
        'Enemies re-roll successful Defense and Morale against its Hits.'
      ],
      ['Weapon', 'Tribal Spear', 20, 'any', 'Its regiment gets +1 Attacks near an Objective Zone.'],
      ['Teaching', 'Vision', 30, 'any', 'Gains Forward Force.'],
      [
        'Teaching',
        'Adaptability',
        20,
        'any',
        'When its regiment Chants, destroy a non-friendly Objective Marker within 6".'
      ],
      [
        'Teaching',
        'Authority',
        20,
        'Cult of War (Warlord only)',
        'Blooded, Braves and Veterans cannot become Broken.'
      ],
      ['Teaching', 'Resilience', 20, 'Thunder Chieftain', 'Thunder Riders gain Hardened (1).'],
      ['Teaching', 'Drive', 20, 'Cult of Famine (Warlord only)', 'Infantry in its warband gain Double Time.'],
      ['Teaching', 'History', 5, 'any', 'Once per round, unsung Chant markers may become Famine markers.'],
      [
        'Teaching',
        'Blood',
        20,
        'Cult of Death (Warlord only)',
        'Its regiment heals 1 wound per stand it destroys in Clashes (max 5).'
      ],
      [
        'Teaching',
        'Cure',
        20,
        'Cult of Death characters',
        'It and its regiment ignore Lethal Demise, Aura of Death and Decay.'
      ],
      [
        'Mastery',
        'Apex Master',
        10,
        'Matriarch Queen, Predator, Mounted Predator',
        'Rides an Apex Predator, which may make a free Volley.'
      ],
      ['Mastery', 'Drum Beast Rider', 10, 'Scion of Conquest', 'Rides a Drum Beast; +4" spell range.'],
      ['Mastery', 'Tontorr Rider', 10, 'Chieftain', "Rides a Tontorr; Tribe's Pride gives Vanguard (5)."]
    ]
  },
  'Old Dominion': {
    rule: 'Xhiliarch and Strategos: up to 2 Treasures from different categories; Hierodeacon and Archimandrite: 1; Fallen Divinity: one Old Ways Dark Blessing; Theokrator: none. Each once per army.',
    list: [
      ['Fallen Banners', 'Vexilla of the Lost', 30, 'any', 'Gains Forward Force.'],
      [
        'Fallen Banners',
        'Caelestine Banner',
        20,
        '[The Legion] characters',
        'It and its regiment always count as Inspired.'
      ],
      [
        'Fallen Banners',
        "Legio I 'Primigenia'",
        20,
        '[The Legion] characters',
        'Its regiment counts as one Dark Power tier higher.'
      ],
      ['Fallen Banners', 'Sanctified Labaron', 20, 'any', 'One Restricted option counts as Mainstay.'],
      [
        'Sarcophagus',
        "Cuirass of Hazlia's Shadow",
        30,
        'any',
        'Survives one fatal Duel on 1 wound; cannot refuse Duels.'
      ],
      [
        'Sarcophagus',
        'Imperial Oplon',
        15,
        '[The Legion] characters',
        'Counts as 2 extra stands for Seizing.'
      ],
      [
        'Sarcophagus',
        'Armor of the Living Saint',
        10,
        'any',
        'Gains Priest (1) and the Creed role, shared with its regiment.'
      ],
      [
        'Sarcophagus',
        'Aventine Armor',
        10,
        '[The Legion] characters',
        'It and its regiment gain the Fallen Pantheon role.'
      ],
      [
        'Grim Crypt',
        'Unholy Sacrament',
        30,
        '[The Creed] or [The Fallen Pantheon] characters',
        'Spend a Dark Power token for Priest (+3) on the first spell each round.'
      ],
      [
        'Grim Crypt',
        'Consecrated Mitre',
        25,
        '[The Creed] or [The Fallen Pantheon] characters',
        'Priest (+X) where X is the Dark Power tier.'
      ],
      ['Grim Crypt', 'Reaping Crook', 20, 'Hierodeacon', 'Dark Shepherd has unlimited range.'],
      [
        'Grim Crypt',
        'Hierotekton',
        15,
        'Hierodeacon, Archimandrite',
        'Bone Golems become Mainstay and it can join them.'
      ],
      [
        'Grim Crypt',
        'Grave Step',
        10,
        'Hierodeacon, Archimandrite',
        'Its regiment gets +1 March (tiers 1-2) or +2 (tiers 3-4).'
      ],
      [
        'Lost Arsenal',
        'Anastegma, Brand of the Faithless',
        30,
        'Xhiliarch, Strategos',
        'Enemies roll double Morale dice against its attacks.'
      ],
      ['Lost Arsenal', 'Harvest of the Fallen', 30, 'any', '+X Attacks, X is the Dark Power tier.'],
      ['Lost Arsenal', 'Skofnung', 30, 'any', 'Cleave (+1); its regiment gains Linebreaker.'],
      ['Lost Arsenal', 'Calamitas, Blade of the Caelesor', 20, 'any', '+1 Attacks and Cleave (+1).'],
      [
        'Lost Arsenal',
        'Eleutherea, Giver of Mercy',
        10,
        'any',
        '+1 Clash; in Duels Parry, Counter-Attack and Cleave (+1).'
      ],
      [
        'Lost Arsenal',
        'Soul Reaper',
        10,
        'Hierodeacon, Archimandrite',
        'Spend Dark Power tokens for extra Attacks when clashing.'
      ],
      ['The Old Ways', 'Aura of Malice', 40, 'any', 'Its regiment gains Dread.'],
      ['The Old Ways', 'Eternal Discipline', 30, 'any', 'Its regiment gains Untouchable.'],
      ['The Old Ways', 'Kentarch', 20, 'any', 'At tier III it and its regiment count as Inspired.'],
      [
        'Forgotten Codex',
        'What we did in Life will Echo in Eternity',
        25,
        '[The Legion] characters',
        'After a refused Duel its regiment re-rolls successful Morale; Flurry against Broken.'
      ],
      [
        'Forgotten Codex',
        'Gladiator',
        25,
        '[The Legion] characters',
        'Gains Flurry, Deadly Blades and Parry.'
      ],
      [
        'Forgotten Codex',
        'Implacable',
        20,
        '[The Legion] characters',
        'Break Their Lines action gives its regiment Linebreaker.'
      ],
      [
        'Forgotten Codex',
        'Strength and Honor',
        10,
        '[The Legion] characters',
        'Always Dies Fighting; its regiment loses Brittle while Inspired.'
      ],
      [
        'The Dark Art',
        'Unholy Mastery',
        40,
        '[The Creed] or [The Fallen Pantheon] characters',
        'A spell with 4+ successes is cast again free once per activation.'
      ],
      ['The Dark Art', 'Schemophore', 20, 'Archimandrite', 'Gains the Dark Shepherd Draw Event.'],
      [
        'The Dark Art',
        'Devoted to Hazlia',
        10,
        '[The Creed] or [The Fallen Pantheon] characters',
        'Re-rolls 6s when spellcasting.'
      ],
      [
        'The Dark Art',
        'Viaticum',
        5,
        'Hierodeacon',
        'Its regiment gains the Fallen Pantheon role and Bodyguard.'
      ]
    ]
  },
  'Sorcerer Kings': {
    rule: "One Mastery (a Sorcerous Patrons Mastery allows one more from another category); one Patron's Gift; items once per army.",
    list: [
      [
        'Sorcerous Patrons',
        'Recorder of all Deeds',
        35,
        'any (Warlord only)',
        'Mortal regiments gain Vanguard (3) and Bravery.'
      ],
      [
        'Sorcerous Patrons',
        'Prince of the Setting Moon',
        30,
        'any (Warlord only)',
        'Mortals near an Objective Zone heal 3 wounds each Victory Phase.'
      ],
      [
        'Sorcerous Patrons',
        'Vizier of the Morning Star',
        30,
        'any (Warlord only)',
        'After each Supremacy Phase, regiments of its Court lose Broken.'
      ],
      ['Combat', 'Best Money can Buy', 20, 'any', 'Its Infantry gains Hardened (+1).'],
      [
        'Combat',
        'Favored of Hormus',
        15,
        'Maharajah, Sorcerer (Court of Earth)',
        'Rides a Mahut; nearby friends count as near Earth terrain.'
      ],
      [
        'Arcane',
        'Elemental Feedback',
        20,
        'any',
        'Its first spell each activation heals its regiment 2 wounds per 2 successes.'
      ],
      [
        'Arcane',
        'Bound to the Elements',
        15,
        'Maharajah, Sorcerer, Raj',
        '+2 Wounds and Attacks, Impact (3); takes the Type of a same-Court regiment.'
      ],
      ['Arcane', 'Elemental Projection', 15, 'any', '+3" spell range.'],
      ['Banner', 'Banner of Elemental Dominion', 25, 'any', 'Elementals within 12" gain Unstoppable.'],
      [
        'Weapon',
        'Dancing Scimitar',
        20,
        'any',
        'Draw Event: 3 automatic AP (2) Hits on an enemy within 12".'
      ],
      ['Weapon', 'Prijm Khanjar', 15, 'any', '+2 Attacks and Flawless Strikes.'],
      [
        'Arcane',
        'Niyantran',
        20,
        'any',
        'Friends within 12" may use its Resolve while its regiment is not Broken.'
      ],
      ['Arcane', 'Jadoo Kavach', 20, 'any', 'Casters within 10" re-roll 6s once per activation.'],
      ['Arcane', "Shu'laat", 10, 'any', 'A successful spell adds one more Ritual marker.']
    ]
  },
  Yoroni: {
    rule: 'One Discipline per character, each once per army; a Discipline needs a character of its Ideal fielded. Jorogumo take none.',
    list: [
      [
        'Discipline (Ka)',
        'Way of the Kensei',
        40,
        'any except Jorogumo',
        'Quicksilver Strike; its Duels cannot be refused.'
      ],
      ['Discipline (Ka)', 'Hannya', 30, 'any except Jorogumo', 'Its regiment gains Terrifying (1).'],
      [
        'Discipline (Ka)',
        'Kenshibu Dancer',
        15,
        'any except Jorogumo',
        'Wounds from its attacks count double for Morale.'
      ],
      ['Discipline (Chi)', 'Unyielding Kata', 30, 'any except Jorogumo', 'Its regiment gains Hardened (+1).'],
      [
        'Discipline (Chi)',
        'Trial of hakari-ishi',
        25,
        'any except Jorogumo',
        'Its regiment gains Tenacious (1).'
      ],
      [
        'Discipline (Chi)',
        'Takigyo Training',
        20,
        'any except Jorogumo',
        'If its regiment passes all its actions, Hardened (3) until next activation.'
      ],
      ['Discipline (Fu)', 'Gunbai', 30, 'any except Jorogumo', 'Gains Forward Force.'],
      ['Discipline (Fu)', 'Hauchiwa', 20, 'any except Jorogumo', 'Its regiment ignores Hindering terrain.'],
      [
        'Discipline (Fu)',
        'Horagai Master',
        20,
        'any except Jorogumo',
        'Friends within 10" gain Unstoppable.'
      ],
      [
        'Discipline (Sui)',
        'Kabuki',
        30,
        'any except Jorogumo',
        'After a successful spell on a friend, it may use any Ideal Card effect.'
      ],
      [
        'Discipline (Sui)',
        'Shamisen',
        20,
        'any except Jorogumo',
        'Enemies touching its regiment lose rules from enemy spells.'
      ],
      [
        'Discipline (Sui)',
        'Fudoshin',
        10,
        'any except Jorogumo',
        'Friends within 10" count 3 stands larger against enemy spells.'
      ],
      [
        'Discipline (Mu)',
        'Purification Rites',
        20,
        'any except Jorogumo',
        'May make an Entourage Activation.'
      ],
      [
        'Discipline (Mu)',
        'Ofuda',
        10,
        'any except Jorogumo',
        'Activated by a Mu card, its regiment may take another Ideal effect.'
      ],
      ['Discipline (Mu)', 'Flow', 15, 'any except Jorogumo', 'Friends see through its regiment.']
    ]
  },
  'Weaver Courts': {
    rule: 'One Gift and one Mastery per character; each once per army (Chitinous Metamorphosis and Cloud Seeding may repeat).',
    list: [
      [
        'Character Upgrade',
        'Glacial Presence',
        30,
        'any',
        'Enemies engaging its Winter regiment gain Decay.'
      ],
      ['Character Upgrade', 'Rapid Blossoming', 25, 'any', 'Its Spring regiment can heal while Broken.'],
      ['Character Upgrade', 'Bond of Falcons', 15, 'any', 'Its regiment gains Sureshot.'],
      ['Character Upgrade', 'Sun Crown', 15, 'any', 'Its Summer regiment gains Flawless Strikes.'],
      [
        'Character Upgrade',
        'Wild Spirit',
        15,
        'any',
        'Its regiment may spend Seed markers of friends within 12".'
      ],
      [
        'Character Upgrade',
        'Abundant Harvest',
        10,
        'any',
        'Its Autumn regiment gives friends within 12" a Seed marker after a kill.'
      ],
      ['Character Upgrade', "Forest's Embrace", 5, 'any', 'Its regiment in Cover gains Untouchable.'],
      [
        'Character Upgrade',
        'Seed of Spring',
        5,
        'any',
        'In Spring its regiment gains a Seed marker each Draw Event step.'
      ],
      [
        'Character Upgrade',
        'Seed of Summer',
        5,
        'any',
        'In Summer its regiment gains a Seed marker each Draw Event step.'
      ],
      [
        'Character Upgrade',
        'Seed of Autumn',
        5,
        'any',
        'In Autumn its regiment gains a Seed marker each Draw Event step.'
      ],
      [
        'Character Upgrade',
        'Seed of Winter',
        5,
        'any',
        'In Winter its regiment gains a Seed marker each Draw Event step.'
      ],
      [
        'Mastery',
        'Draic Rider',
        40,
        'Rhun Sidhe, Mhor Sidhe',
        'Rides a Coill or Scoth Draic; its regiment gains Flank.'
      ],
      ['Mastery', 'Ambush', 30, 'any', 'Gains Forward Force.'],
      [
        'Mastery',
        "Winter's Bite",
        20,
        'Court of Winter characters',
        'Becomes Cavalry, +2 Wounds, Impact (4), Brutal Impact (2), Trample (2).'
      ],
      ['Mastery', 'Veil of Undergrowth', 30, 'any', 'Its Infantry or Cavalry gains Loose Formation.'],
      [
        'Mastery',
        'Chitinous Metamorphosis',
        15,
        'any',
        'Becomes Brute with Impact (3), +1 Clash and Attacks.'
      ],
      ['Mastery', "The Voice's Calling", 15, 'any', 'Its regiment gains Vanguard (4).'],
      ['Mastery', 'Cloud Seeding', 10, 'any', 'Gains Fly and joins a flying regiment.']
    ]
  },
  'Hundred Kingdoms': {
    rule: 'One Armor, one Weapon, Heirlooms (Imperial Officer and Noble Lord 2, others 1), one Mastery; each once per army. Noble Lords pick 2 Weapon Arts; the Crusading Noble Lord 1 Crusading Bull.',
    list: [
      [
        'Armor',
        'Armor of Dominion',
        50,
        'Infantry characters (not The Orders)',
        'Its regiment ignores Cleave, Armor Piercing and Smite.'
      ],
      ['Armor', 'Bakkian Token', 20, 'any', 'Gains Blessed.'],
      ['Armor', 'Mask of Eakides', 10, 'any', 'Its Veteran regiment gains Indomitable (+1), max 2.'],
      ['Weapon', 'Caledburn', 25, 'any', 'Enemies re-roll successful Defense against its Hits.'],
      ['Weapon', 'The Flesh Cleaver', 15, 'any', 'Its Clash attacks ignore Hardened.'],
      ['Weapon', 'Laurean Lance', 15, 'any', 'Re-roll failed Impact hits; Brutal Impact (+1).'],
      [
        'Heirloom',
        'Standard of Steel',
        40,
        'Infantry characters',
        'Its Imperial regiment gains Dread; Veterans also Unyielding.'
      ],
      [
        'Heirloom',
        'Order Warhorses',
        40,
        '[The Orders] (Warlord only)',
        'Friendly Feudal Cavalry gain Impact (+1).'
      ],
      ['Heirloom', 'Regalia of the Empire', 35, 'any', 'Its Feudal regiment gains Dauntless.'],
      ['Heirloom', "Olefant's Roar", 30, '[Feudal] characters', 'Its regiment gains Glorious Charge.'],
      [
        'Heirloom',
        'Elysian Fragment',
        25,
        'any',
        'Once per game its Theist regiment gains Cleave (3) for the round.'
      ],
      ['Heirloom', 'Gilded Rampart', 25, 'Infantry characters', 'Its Veteran regiment gains Oblivious.'],
      ['Heirloom', 'Mantle of Saint Nicholas', 20, 'any', 'Its regiment gains Divine Purpose.'],
      ['Heirloom', 'Get in Position', 30, 'Infantry characters', 'Gains Forward Force.'],
      [
        'Heirloom',
        'Seize the Advantage',
        30,
        'any',
        'Imperial regiments activated by Entourage get +2" Charge.'
      ],
      ['Heirloom', 'Art of War', 25, 'any', 'Once per round, pass instead of drawing a card.'],
      [
        'Heirloom',
        'Glimmer of Faith',
        15,
        '[Theist] characters',
        'Its Theist regiment re-rolls failed Resolve tests.'
      ],
      ['Heirloom', 'Conviction', 10, '[Theist] characters', 'Its Theist regiment gets +1 Resolve (max 4).'],
      [
        'Heirloom',
        'Eccentric Fighting Style',
        25,
        'any',
        '+2 Attacks; re-roll failed hits and successful enemy Defense.'
      ],
      ['Heirloom', 'Front of the Line', 20, 'any', 'Its Veteran Infantry gains Bravery.'],
      ['Heirloom', 'Tip of the Lance', 15, 'any', 'Its Veteran Cavalry gains Wedge!.'],
      ['Heirloom', 'Talented', 20, 'Chapter Mage', 'Learns a second school of spells.'],
      [
        'Heirloom',
        'Protective Glyphs',
        15,
        'any',
        'Enemy casters need one more success on friends within 10".'
      ],
      [
        'Mastery',
        'Lathander Sacrifice',
        0,
        'any',
        'Once per game its regiment makes an extra Clash, then is destroyed.'
      ],
      ['Mastery', 'First to Answer', 0, 'any', 'Its regiment gains Vanguard (5).'],
      ['Mastery', 'Sword of the First Order', 0, 'any', 'Gains Cleave (+1) and Flurry.'],
      [
        'Mastery',
        'Oathstone',
        0,
        'any',
        'It and its regiment ignore Lethal Demise, Decay and Aura of Death.'
      ],
      ['Mastery', 'Hammer Drill', 0, 'any', 'Its regiment gains Impact (2).'],
      [
        'Mastery',
        'Oath Unbroken',
        0,
        'any',
        'Once per game its regiment automatically passes a Resolve test.'
      ],
      [
        'Mastery',
        'Like Gods Among Men',
        0,
        'any',
        'After its Cavalry charges, a friendly Infantry within 8" heals 4 wounds.'
      ],
      [
        'Crusading Bull',
        'To Restore the Faith',
        0,
        'Crusading Noble Lord',
        'Infantry within 8" with Resolve 4+ have Divine Purpose.'
      ],
      [
        'Crusading Bull',
        'To Banish the Darkness',
        0,
        'Crusading Noble Lord',
        'Its regiment gains Oblivious.'
      ],
      [
        'Crusading Bull',
        'To Cast Out the Daemon',
        0,
        'Crusading Noble Lord',
        'Its regiment gains Terrifying (+1).'
      ],
      ['Weapon Art', 'Weapon Master', 0, 'Noble Lord, Mounted Noble Lord', 'Gains Cleave (1).'],
      ['Weapon Art', 'Relentless', 0, 'Noble Lord, Mounted Noble Lord', 'Gains Flurry.'],
      ['Weapon Art', 'Duellist', 0, 'Noble Lord, Mounted Noble Lord', '+1 Clash.'],
      ['Weapon Art', 'Graceful Combatant', 0, 'Noble Lord', '+2 Attacks.'],
      ['Weapon Art', 'Tourney Champion', 0, 'Mounted Noble Lord', 'Gains Impact (+2).']
    ]
  },
  Spires: {
    rule: 'Up to 2 Apparatuses and Eccentricities combined (Mimetic Assassin 1 Eccentricity), any number of Mutations; each once per character.',
    list: [
      [
        'Experiment',
        'Degenerative Aura',
        25,
        'Biomancer, Pheromancer',
        'Engaged enemies take wounds equal to their stands when its regiment suffers Decay.'
      ],
      [
        'Experiment',
        'Affliction Absorption',
        20,
        'any',
        'Once per round, move Decay wounds from a friend within 8" to its regiment.'
      ],
      [
        'Experiment',
        'Biotic Renewal',
        20,
        'Biomancer, Pheromancer',
        'Draw Event: its regiment heals 3 wounds.'
      ],
      [
        'Experiment',
        'Grotesque Elixir',
        20,
        'Biomancer, Pheromancer',
        'Once per game a Monstrosity within 12" heals D6 wounds.'
      ],
      ['Experiment', 'Hyperadrenal Stimulation', 10, 'Pheromancer', 'Its regiment gains Counter Attack.'],
      [
        'Experiment',
        'Induce Lethargy',
        10,
        'Pheromancer',
        'Enemies charging its regiment lose Unstoppable and Juggernaut.'
      ],
      [
        'Apparatus',
        'Ferro-Ossified Carapace',
        30,
        'Lineage Highborne, Lineage Prideborne',
        'Draw Event: its regiment gains Hardened (1).'
      ],
      [
        'Apparatus',
        'Convulsive',
        10,
        'Pheromancer, Biomancer, High Clone Executor, Merchant Prince, Mimetic Assassin',
        'Always Dies Fighting, with +2 Attacks.'
      ],
      [
        'Apparatus',
        'Linked Neuroreceptors',
        10,
        'Pheromancer, Biomancer, High Clone Executor, Merchant Prince, Mimetic Assassin',
        "Untouchable while its regiment's Strain is active."
      ],
      ['Apparatus', 'Cultivated Muscle Memory', 10, 'any', '+1 Clash.'],
      ['Apparatus', 'Grafted', 5, 'any', '+1 Attacks.'],
      ['Mutation', 'Forlorn Drive', 30, 'any', 'Its Drone or Clone regiment gains Flank.'],
      [
        'Mutation',
        'Preservation Protocols',
        30,
        'Lineage Highborne, Lineage Prideborne',
        'An action removing all wound markers from it and its Husk regiment.'
      ],
      [
        'Mutation',
        'No Matter the Price',
        20,
        'any',
        'Once per game, trade failed Clash hits for wounds on its Clone regiment.'
      ],
      [
        'Mutation',
        'Lineage Commander',
        15,
        'Lineage Highborne',
        'Joins Bound Clones, which gain the Husk role.'
      ],
      [
        'Mutation',
        'Master of Flesh',
        15,
        'Pheromancer, Biomancer, High Clone Executor, Merchant Prince, Mimetic Assassin',
        'Once per game, when destroyed it replaces a stand in a friendly regiment instead.'
      ],
      [
        'Mutation',
        'Avatar Projection',
        10,
        'Biomancer, Pheromancer, Merchant Prince',
        'Becomes Brute with Impact (3), +1 Clash and Attacks.'
      ],
      [
        'Eccentricity',
        'Induced Fawn Response',
        10,
        'Pheromancer, Biomancer, High Clone Executor, Merchant Prince, Mimetic Assassin',
        'The first time its Infantry becomes Broken, remove Broken.'
      ],
      [
        'Eccentricity',
        'Infiltration Optimization Strain',
        10,
        'High Clone Executor',
        'Gains Barrage (6) 12".'
      ],
      [
        'Eccentricity',
        'Marksman Optimization Strain',
        10,
        'High Clone Executor',
        'Gains Barrage (5) 18" and Arcing Fire.'
      ],
      [
        'Eccentricity',
        'Chain Reaction',
        5,
        'Biomancer (Warlord only)',
        'Catabolic Node detonations chain to two more nodes.'
      ]
    ]
  },
  Dweghom: {
    rule: 'One Relic and one Mastery per character, each once per army. Tempered Sorcerers and Lost Ancestors pick a spell school for free.',
    list: [
      ['Relic', 'Chthonic Flame', 25, 'any', 'Enemies re-roll successful Morale when it wounds them.'],
      ['Relic', 'Draegbhrud', 25, 'any', 'Cleave (+1) and Fiend Hunter.'],
      ['Relic', 'Tempered Goad', 35, 'any', 'Enemy characters cannot refuse its Duels.'],
      ['Relic', "Champion's Horns", 5, 'any', '+1 Attacks.'],
      [
        'Relic',
        'Gifted in Fire',
        20,
        'any (Tempered armies)',
        '+1 Attacks and a Draw Event adding an Elemental Power marker.'
      ],
      [
        'Relic',
        'Invocation of the Shattering',
        20,
        'any',
        'Flawless Strikes; its regiment gains it after its Duel.'
      ],
      ['Relic', 'Litanies of Victory', 10, 'any', 'Its regiment always counts as Awakened.'],
      ['Relic', 'Runeforged Plate', 25, 'any', 'Spend up to 2 markers for +2 or +4 Attacks this round.'],
      [
        'Relic',
        'The Crown of Ushkelodh',
        25,
        'any',
        'Its Infantry gets +1 March and Impact (+2), max Impact (5).'
      ],
      [
        'Mastery',
        'World Breakers',
        60,
        'any',
        "Defense, Evasion and Resolve can't drop below 3, also for its Awakened Infantry."
      ],
      [
        'Mastery',
        'First in the Fray',
        30,
        'any (Ardent armies)',
        'The foremost friendly Infantry gains Terrifying (+1), max 2.'
      ],
      [
        'Mastery',
        'Superiority',
        20,
        'any',
        'After it kills an enemy character in a Duel, that regiment gets -1 Resolve.'
      ],
      ['Mastery', 'Bloody-Minded Focus', 5, 'any', 'Always Dies Fighting.'],
      [
        'Mastery',
        'Bergont Raegh',
        30,
        'Hold Raegh (Warlord only)',
        'Rides an Ironclad Drake; both gain Flawless Strikes and +2 Wounds.'
      ],
      ['Mastery', 'Hellbringer Sorcerer', 30, 'Tempered Sorcerer', 'Rides a Hellbringer Drake.'],
      ['Mastery', 'Relentless March', 30, 'any', 'Friendly Infantry get +1 March on their second March.'],
      ['Mastery', 'Thaumaturge', 30, 'any', 'Wizard (+1) per enemy regiment its spells destroy, max +2.'],
      [
        'Mastery',
        'Ferric Throne',
        20,
        'Tempered Steelshaper',
        'Rides a Stoneforged; nearby Forged gain Unstable Alloys.'
      ]
    ]
  }
};
