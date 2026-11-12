/* Supremacy Abilities: passive and activated parts, per Warlord. */
const INF = u => /Infantry/.test(u.cls || ''),
  CAV = u => /Cavalry/.test(u.cls || ''),
  ROLE =
    (...r) =>
    u =>
      supRoles(u).some(x => r.includes(x)),
  ANY = () => true;
const SUP = {
  'Driven by Carnage': {
    c: /Blooded/,
    t: 'Always Active',
    p: 'Friendly Half-Bloods heal 1 wound per enemy stand they destroy with Clash Actions or Impact Attacks (after Morale Tests). When its regiment destroys an enemy regiment with a Clash or Charge it may make an out-of-sequence Reform or Combat Reform.',
    a: 'Until the end of the round, any Half-Bloods regiment that destroys an enemy regiment with a Clash or Impact Attacks may make an out-of-sequence Reform or Combat Reform, and the healing is doubled.',
    g: { who: ROLE('Half-Bloods'), note: 'Driven by Carnage doubled' }
  },
  'Wild Beasts': {
    c: /Vargyr/,
    t: 'Always Active',
    p: 'Friendly Half-Bloods may make Impact Attacks when charging through or within Hindering terrain.',
    a: 'Until the end of the round, friendly Half-Bloods regiments gain Shock and Fury.',
    g: { who: ROLE('Half-Bloods'), rules: ['Shock', 'Fury'] }
  },
  'Raid Tactics!': {
    c: /Jarl/,
    t: 'Always Active',
    p: 'Use the Activated part of Tribal Tactics three times per game, a different tactic each time. Mortal and Exalted regiments get +1 to Reinforcement Rolls and cannot be Shattered.',
    a: 'Until the end of the round, friendly Mortal and Exalted regiments gain Fearless, Juggernaut and Inspired.',
    g: { who: ROLE('Mortals', 'Exalted'), rules: ['Fearless', 'Juggernaut', 'Inspired'] }
  },
  'Ruler of Manheim': {
    c: /Konungyr/,
    t: 'Always Active',
    p: 'Use the Activated part of Tribal Tactics at the end of every Supremacy Phase (not the same tactic as last round). Mortal and Exalted regiments cannot be Shattered.',
    a: 'Until the end of the round, all friendly regiments and characters count as having chosen every Tribal Tactic.',
    g: { who: ANY, rules: u => [...new Set(Object.values(TACTICS).flat())] }
  },
  Skývald: {
    c: /Shaman/,
    t: 'Always Active',
    uses: 2,
    p: 'The Shaman and its regiment ignore Water, Hindering, Perilous and Dangerous terrain effects.',
    a: 'Twice per game, each time a different effect: Niflmire (all Barrage ranges halved this round), Hregg (one enemy regiment takes 5 unavoidable wounds, no Morale Tests) or Snæstormur (enemy regiments −1 March and no Charge re-rolls this round).',
    cho: ['Niflmire', 'Hregg', 'Snæstormur']
  },
  'Divine Protection': {
    c: /Volva/,
    t: 'Always Active',
    p: 'Friendly regiments get +1 Evasion (max 2).',
    a: 'Until the end of the round the Warlord may target friendly regiments with spells regardless of Line of Sight, range or Engagement (Self spells unaffected).'
  },
  'Carrier of the Godflesh': {
    c: /Mechanist/,
    t: 'Battlefield',
    p: 'When you put a card in the Strategic Stack, reveal it and pick a regiment on the table that card could activate: it gains Hardened (+1) (max 2) until the end of the round.',
    a: ''
  },
  'Army of Lions': {
    c: /Polemarch/,
    t: 'Always Active',
    p: 'Its regiment (with Auxiliary Stand and Character) gets +1 Clash (max 4) and Tenacious (1). Friendly Infantry within 10″ of the Warlord may re-roll failed unmodified Morale Rolls of 6.',
    a: 'Once per game before the Supremacy roll-off, reveal the top card of your Command Stack: if it is a Polemarch you may win this round’s roll-off automatically (two Polemarchs cancel out).'
  },
  'Infantry Tactics': {
    c: /Aristarch/,
    t: 'Always Active',
    p: 'Once per game, at the start of a Reinforcement Phase, re-roll all failed Reinforcement Rolls.',
    a: 'Until the end of the round, the chosen Battlefield Order affects all friendly non-Monster regiments on the table.'
  },
  'Hammer and Anvil': {
    c: /Ipparchos/,
    t: 'Always Active',
    p: 'Once per round an Infantry or Cavalry regiment makes a free Reform as its last action (no change to ranks or files). Battlefield: Infantry or Cavalry activated from the Strategic Stack gains Shock.',
    a: ''
  },
  'Bringing Back the Children of Fire': {
    c: /Promethean|Oracle/,
    t: 'Always Active',
    p: 'Friendly Titan regiments gain Priest (+3). A Titan activated from the Strategic Stack counts as 6 stands for Seizing Objective Zones this round.',
    a: ''
  },
  'The Matriarch Walks': {
    c: /Matriarch/,
    t: 'Always Active',
    p: 'A regiment that Chants any Cult’s Battlecry loses Broken at once.',
    a: 'Once per battle, after your first activation (and any Entourage) this round, draw the next Command Card and activate it straight away (it cannot Entourage).'
  },
  'Concentrated Assault': {
    c: /^Chieftain/,
    t: 'Always Active',
    p: 'The Chieftain’s Crushing Force covers the whole table, and its Tempo becomes Vanguard (4) for every friendly Tribes regiment in the army.',
    a: ''
  },
  'The Big Game Hunt': {
    c: /Predator/,
    t: 'Always Active',
    prey: true,
    p: 'At the end of the first Supremacy Phase mark one enemy regiment (even one in Reinforcements) as your Prey. Friendly regiments always count as Inspired and as having Taken Aim when they Clash or Volley against it. When it is destroyed, pick a new Prey.',
    a: ''
  },
  'Thunderous Assault': {
    c: /Thunder Chieftain/,
    t: 'Battlefield',
    p: 'All friendly Speakers regiments gain Shock.',
    a: ''
  },
  'Visions of Conquest': {
    c: /Scion of Conquest/,
    t: 'Always Active',
    p: 'A regiment that Chants the Cult of Conquest Battlecry also gets the Dissonance spell’s effects this round; any regiment adding a Chant Marker may add a Conquest marker instead.',
    a: 'Until the end of the round, instead of drawing from your Command Stack, pick any card from it to play.'
  },
  'Visions of War': {
    c: /Scion of War/,
    t: 'Always Active',
    p: 'A regiment that Chants the Cult of War Battlecry also gains Tenacious (1) this round.',
    a: 'Until the end of the round, friendly regiments gain Hardened (1).',
    g: { who: ANY, rules: ['Hardened (1)'] }
  },
  'Visions of Death': {
    c: /Scion of Death/,
    t: 'Always Active',
    p: 'Infantry that Chants the Cult of Death Battlecry: its Command Stand gets +3 Attacks this round.',
    a: ''
  },
  'Obdurate Bone and Stone': {
    c: /Xhiliarch/,
    t: 'Always Active',
    p: 'Dark Power can reach Tier IV. Legion Medium regiments gain Vanguard (2), Heavy ones Vanguard (4). Once per round: +X Charge distance for a Legion charge, or +X Attacks for the Warlord’s regiment in a Clash or the Warlord in a Duel (X = Dark Power Tier).',
    a: ''
  },
  'Master of the Legions': {
    c: /^Strategos/,
    t: 'Always Active',
    every: true,
    p: 'Dark Power can reach Tier IV. The Activated part can be used at the end of every Supremacy Phase.',
    a: 'Up to two friendly Legion regiments on the table each gain one benefit until the end of the round: Dark Power Tier +1, its Memory of Old activates, 2D6 pick highest for Charge distance, or loses Brittle.'
  },
  'Glimmers of a Golden Age': {
    c: /Mounted Strategos/,
    t: 'Always Active',
    p: 'Dark Power can reach Tier IV. Once per round, in a Legion Clash or Charge, turn 1+X failed hits into hits before rolling (X = Dark Power Tier).',
    a: 'Until the end of the round, that once-per-round ability counts as Dark Power Tier IV.'
  },
  'Divinity Grace': {
    c: /Hierodeacon/,
    t: 'Always Active',
    p: 'The Warlord may cast one extra spell per activation (not the same one). All friendly regiments lose Brittle. Dark Shepherd makes double tokens. Cultists and Hashashin count as Fallen Pantheon.',
    a: 'Until the end of the round, Fallen Pantheon regiments gain Blessed.',
    g: { who: ROLE('The Fallen Pantheon', 'Fallen Pantheon'), rules: ['Blessed'] }
  },
  'Blasphemous Mesa': {
    c: /Archimandrite/,
    t: 'Always Active',
    p: 'Draw Event for the Warlord: spend 1 Dark Power token for an extra spell (not the same one). Friendly regiments gain Aura of Death (+1).',
    a: 'Until the end of the round, when a Creed or Legion regiment activates, before its Draw Events, spend 1 Dark Power token for one: Aura of Death (+1), lose Brittle, or Terrifying (+1).'
  },
  'Reign of Terror': {
    c: /Theokrator/,
    t: 'Always Active',
    p: 'Creed and Legion Animate Vessels gain Terrifying (+1) at Dark Power Tier III. Once per round, before a Clash, spend 1 token to give a Creed or Legion regiment Trial of Will for that action.',
    a: 'Until the end of the round, friendly Creed and Legion regiments gain Trial of Will.',
    g: { who: ROLE('The Creed', 'The Legion', 'Creed', 'Legion'), rules: ['Trial of Will'] }
  },
  'Surrounded by Fear and Dead Men': {
    c: /Fallen Divinity/,
    t: 'Always Active',
    p: 'Must be the Warlord; acts as a Monster regiment with two actions; may Duel and cannot refuse a Duel. When destroyed, its Fallen Pantheon tokens move to the Dark Power pool.',
    a: 'Pick another friendly Fallen Pantheon regiment: destroy up to 3 of its stands (if it is destroyed, its Command Stand performs Die Fighting!). Each stand gives +1 Fallen Pantheon token.'
  },
  'Elemental Confluence': {
    c: /Maharajah/,
    t: 'Always Active',
    p: 'Elementals with Elemental Conduit add Ritual Markers to any Ritual. When a Ritual completes, start one of a different Court. One extra Court.',
    a: ''
  },
  Omnipotence: {
    c: /^Sorcerer/,
    t: 'Always Active',
    p: 'All characters take the Warlord’s Court. A spell cast with 4+ successes gives one free extra spell per activation (same spell once per round per character, each spell at most 3 times a round).',
    a: ''
  },
  'Elemental Dominion': {
    c: /Raj/,
    t: 'Always Active',
    p: 'Fire Elementals gain Fan the Flames; Air Elementals gain Opportunists; Water Elementals charging flank or rear gain Terrifying (1) and Impact (+2); Earth Elementals gain a Regeneration (2) Draw Event.',
    a: ''
  },
  'Lord of Roaring Flames': {
    c: /Daimyo/,
    t: 'Always Active',
    p: 'Once per round, a regiment or character activated with the Warlord’s Ideal Card may also gain Glorious Charge this round.',
    a: 'This round, every friendly regiment activated with the Warlord’s Ideal Card gets its effects whatever its Battlefield Role.',
    g: { who: ANY, note: 'Warlord’s Ideal for every role' }
  },
  'Lord of the Eternal Mountain': {
    c: /Oyabun/,
    t: 'Always Active',
    p: 'Once per round, a regiment or character activated with a Chi Ideal Card may swap its effects for Hardened (+1) and Oblivious.',
    a: 'This round, every friendly regiment activated with a Chi Ideal Card gets its effects whatever its Battlefield Role.',
    g: { who: ANY, note: 'Chi Ideal for every role' }
  },
  'Mistress of Azure Gales': {
    c: /Bakasu/,
    t: 'Always Active',
    p: 'Once per round, a regiment or character activated with a Fu Ideal Card may swap its effects for Fluid Formation.',
    a: 'This round, every friendly regiment activated with a Fu Ideal Card gets its effects whatever its Battlefield Role.',
    g: { who: ANY, note: 'Fu Ideal for every role' }
  },
  'Mistress of Winsome Mists': {
    c: /Onmyoji/,
    t: 'Always Active',
    p: 'Once per round, a regiment or character activated with a Sui Ideal Card may swap its effects for a free, automatically successful Blossom in the Wind or Misery of Failure Envisioned.',
    a: 'This round, every friendly regiment activated with a Sui Ideal Card gets its effects whatever its Battlefield Role.',
    g: { who: ANY, note: 'Sui Ideal for every role' }
  },
  'Mistress of the Ghostly Reikai': {
    c: /Jorogumo/,
    t: 'Always Active',
    p: 'Once per round, a non-Monster regiment or character activated with a Mu Ideal Card may swap its effects for Loose Formation.',
    a: 'This round, every friendly regiment activated with a Mu Ideal Card gets its effects whatever its Battlefield Role.',
    g: { who: ANY, note: 'Mu Ideal for every role' }
  },
  "Reaper's Bloom": {
    c: /Mhor/,
    t: 'Always Active',
    p: 'Warlord’s Bloom Effect: the regiment gains Cleave (+1) until the end of the round.',
    a: 'The Season counts as Autumn this round (the Cycle does not change), and the Warlord’s Bloom Effect becomes Cleave (+2).'
  },
  'Subtle Sow': {
    c: /Rhun/,
    t: 'Always Active',
    p: 'Warlord’s Bloom Effect: the non-Monster regiment heals 3 wounds.',
    a: 'The Season counts as Spring this round (the Cycle does not change), and the Warlord’s Bloom Effect heals 5 wounds.'
  },
  'Reigning Season': {
    c: /Taosidhe/,
    t: 'Always Active',
    p: 'Once per round, at the end of a Reinforcement Phase, one non-Monster regiment gains Vanguard (3) this round. Warlord’s Bloom Effect: a Clash or Volley against regiments that have not activated gains Deadly Blades and Deadly Shots.',
    a: 'The Season counts as the Warlord’s Court Season this round, and the Bloom Effect works against any regiment.'
  },
  'Crop Rotation': {
    c: /Seanchas/,
    t: 'Always Active',
    p: 'After each Victory Phase, Seed Markers may be moved between friendly regiments. Gains Summer and Winter spells and one free extra spell per activation (one per High Court). Warlord’s Bloom Effect: Untouchable and re-roll failed Clash or Impact hits of 6 this round.',
    a: 'The Season counts as the Warlord’s Court Season this round (the Cycle does not change).'
  },
  'Combat Maneuvers': {
    c: /Imperial Officer/,
    t: 'Always Active',
    p: 'Each Reinforcement Phase, up to two Imperial Infantry regiments (or one other Infantry) still off the table gain Vanguard (5).',
    a: 'Until the end of the round, Veteran Infantry regiments gain Fluid Formation and Opportunist.',
    g: { who: u => INF(u) && frRoles(u).includes('Veteran'), rules: ['Fluid Formation', 'Opportunist'] }
  },
  'Professional Troops': {
    c: /Noble Lord/,
    t: 'Always Active',
    p: 'Feudal regiments within 8″ of a Feudal character re-roll unmodified 6s in Clashes and Defense Rolls; Feudal regiments in the Warlord’s warband are Veteran; Feudal units gain the Dynastic Ally’s role.',
    a: ''
  },
  'The Spirit Shines': {
    c: /Theist Priest/,
    t: 'Always Active',
    p: 'Theist regiments gain Divine Purpose; a Theist regiment within 12″ of a Theist character gains Indomitable (+1).',
    a: 'This round, a Theist character’s successful spell on a Theist regiment affects every Theist regiment on the table, and one Theist character makes an extra, automatically successful spell.'
  },
  'Holy Crusade': {
    c: /Crusading/,
    t: 'Always Active',
    p: 'The Warlord may take every Crusading Bull; a free 3-stand Crusaders regiment joins its warband.',
    a: 'Until the end of the round, Theist Infantry gain Support (4), all friendly regiments gain Divine Purpose, and Theist regiments cannot be Broken or Shattered.',
    g: {
      who: ANY,
      rules: u => ['Divine Purpose'].concat(INF(u) && frRoles(u).includes('Theist') ? ['Support (4)'] : [])
    }
  },
  'Relentless Protectors': {
    c: /Sealed Temple/,
    t: 'Always Active',
    p: 'A Cavalry regiment that destroys an enemy regiment with a Charge may make an out-of-sequence Reform.',
    a: 'Until the end of the round, friendly regiments gain Shock.',
    g: { who: ANY, rules: ['Shock'] }
  },
  'Tactical Superiority': {
    c: /Crimson Tower/,
    t: 'Always Active',
    p: 'When a regiment arrives automatically from Reinforcements, one more Orders regiment arrives too.',
    a: 'Until the end of the round, friendly Cavalry gain Support equal to their Attacks.',
    g: { who: CAV, rules: u => ['Support (' + ((u.stats && u.stats.A) || 0) + ')'] }
  },
  'Lead by Example': {
    c: /Order of the Sword|Sword Priory/,
    t: 'Always Active',
    p: 'Once per round, after an Orders regiment activates, draw the next card: its non-Veteran regiment makes an out-of-sequence Rally and gets +1 Clash (max 4) and +2″ Charge this round.',
    a: 'Until the end of the round, friendly Infantry gain Impact (3).',
    g: { who: INF, rules: ['Impact (3)'] }
  },
  'For All Mankind': {
    c: /Errant|Shield/,
    t: 'Always Active',
    p: 'Friendly regiments cannot be Shattered, and the army ignores Memories of the Red Years.',
    a: 'Until the end of the round, all friendly regiments get +1 Attacks and Hardened (+1).',
    g: { who: ANY, rules: ['Hardened (+1)'], stats: { A: 1 } }
  },
  'Induced Aggression': {
    c: /Pheromancer/,
    t: 'Always Active',
    p: 'Drones, Clones and Monstrosities using Strain Expression may swap it for +1 Clash (max 4) and +1 March this round. Its regiment ignores Decay wounds.',
    a: ''
  },
  'Field Studies': {
    c: /Biomancer/,
    t: 'Battlefield',
    p: 'Observation pool (max 4): +1 token whenever any regiment is destroyed. Spend 1: the Warlord’s Practitioner action rolls an extra die. Spend 2: Strain Expression causes no Decay. Spend 3: on your last card, a non-Monster regiment loses Broken and heals 5.',
    a: ''
  },
  'Ruthless Competence': {
    c: /High Clone Executor/,
    t: 'Always Active',
    p: 'Infantry using Strain Expression get +1 March this round. Once per round one of: a Clone Clash or Volley gains Opportunist; a Clone attacked in a Clash makes the attacker lose Inspired; when a friendly regiment is destroyed, a Clone within 12″ makes an out-of-sequence March.',
    a: ''
  },
  'Remorseless Hunter': {
    c: /Prideborne/,
    t: 'Always Active',
    p: 'Husk regiments gain Designate Target.',
    a: 'Until the end of the round, all friendly regiments gain Sureshot and Longshot.',
    g: { who: ANY, rules: ['Sureshot', 'Longshot'] }
  },
  'Lambs to the Slaughter': {
    c: /Highborne/,
    t: 'Always Active',
    p: 'Its regiment gains Fearless and Fury.',
    a: 'Until the end of the round, Husk regiments’ Clash, Volley and Impact hit rolls of 6 count as 1.',
    g: { who: ROLE('Husk'), note: 'hit rolls of 6 count as 1' }
  },
  'Tricks of the Trade': {
    c: /Merchant Prince/,
    t: 'Always Active',
    p: 'Before the first Reinforcement Phase roll 5 dice as an Influence Pool; spend them instead of rolling (not Reinforcement or Supremacy rolls, no re-rolls). Your final unmodified Supremacy roll joins the pool.',
    a: ''
  },
  'Herald of War': {
    c: /Kerawegh/,
    t: 'Always Active',
    p: 'When its regiment Awakens, Ardent regiments within 8″ Awaken too.',
    a: 'Ardent regiments heal 4 wounds at once and gain Lethal Demise (+4) until the end of the round.',
    g: { who: ROLE('Ardent'), rules: ['Lethal Demise (+4)'], heal: 4 }
  },
  'Paragon of War': {
    c: /Exemplar/,
    t: 'Always Active',
    p: 'While its regiment is engaged, all friendly regiments are Awakened. The character gains Forward Force.',
    a: ''
  },
  'Living Legend': {
    c: /Lost Ancestor/,
    t: 'Always Active',
    p: 'No Creed is chosen: both the Ardent and the Tempered Creeds are active.',
    a: ''
  },
  'First Born of War': {
    c: /Hold Raegh/,
    t: 'Battlefield',
    p: 'At the end of each Supremacy Phase, two friendly regiments become Awakened this round. The character gains Forward Force.',
    a: ''
  },
  Forgemaster: {
    c: /Tempered Sorcerer/,
    t: 'Always Active',
    p: 'One free extra spell each round (not the same one). Tempered characters may measure Line of Sight from an Awakened Forged regiment’s Command Stand (half range, once per regiment per round).',
    a: ''
  },
  'Thesis/Antithesis/Synthesis': {
    c: /Steelshaper/,
    t: 'Always Active',
    p: 'A non-Monster Forged regiment that Awakens heals 2 wounds (once per game spend 3 Elemental Power to heal 5 instead).',
    a: 'This round, each Forged regiment that activates adds an Elemental Power Marker.'
  }
};
