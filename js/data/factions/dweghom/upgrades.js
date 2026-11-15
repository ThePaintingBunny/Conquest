/*
 * Dweghom: character upgrades
 *
 * The upgrade catalogue: items, masteries, artefacts and what each costs.
 */

UPG['Dweghom'] = {
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
};
