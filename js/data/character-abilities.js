/*
 * Character abilities
 *
 * Draw Events and ability actions of the characters that have them, with their targets and effects.
 *
 * In this file: CHAB
 */

const CHAB = {
  Aristarch: [
    {
      n: 'Battlefield Order: Arms of Steel',
      kind: 'draw',
      rng: 12,
      tgt: 'friend',
      req: 'Infantry',
      grant: ['Untouchable'],
      label: 'Arms of Steel (Untouchable)',
      order: true,
      d: 'A friendly Infantry regiment within 12″ gains Untouchable until the end of the round.'
    },
    {
      n: 'Battlefield Order: Hearts of Iron',
      kind: 'draw',
      rng: 12,
      tgt: 'friend',
      req: 'Infantry',
      grant: ['Bravery'],
      label: 'Hearts of Iron (Bravery)',
      order: true,
      d: 'A friendly Infantry regiment within 12″ gains Bravery until the end of the round.'
    }
  ],
  'Lineage Prideborne': [
    {
      n: 'Snapshot',
      kind: 'action',
      rng: u => {
        const m = (u.charRules || []).join(', ').match(/Barrage\s*\(\d+\)\s*\(?(\d+)/);
        return m ? +m[1] : 16;
      },
      tgt: 'enemy',
      fn: 'wound1',
      d: 'An enemy regiment in sight and in Barrage range suffers 1 wound. No Resolve tests.'
    }
  ],
  'Lineage Highborne': [
    {
      n: 'Mighty Swing',
      kind: 'action',
      rng: 0.4,
      tgt: 'enemy',
      fn: 'wound1',
      d: 'An enemy regiment engaged with its regiment suffers 1 wound. No Resolve tests.'
    }
  ],
  Pheromancer: [
    {
      n: 'Suppress Higher Functions',
      kind: 'draw',
      rng: 12,
      tgt: 'friend',
      grant: ['Fearless'],
      d: 'A friendly regiment within 12″ gains Fearless this round.'
    },
    {
      n: 'Induce Vigor',
      kind: 'action',
      prac: 'Pheromancy',
      rng: 12,
      tgt: 'friend',
      grant: ['Untouchable'],
      d: 'A friendly regiment within 12″ gains Untouchable this round.'
    },
    {
      n: 'Pheromantic Drive',
      kind: 'action',
      prac: 'Pheromancy',
      rng: 12,
      tgt: 'self',
      fn: 'drive',
      d: 'Friendly Drone and Clone regiments within 12″ re-roll failed Resolve rolls of 6; its own regiment gains Tenacious (1).'
    },
    {
      n: 'Pheromantic Compulsion',
      kind: 'action',
      prac: 'Pheromancy',
      rng: 12,
      tgt: 'enemy',
      req: 'monster',
      label: 'Pheromantic Compulsion (counts as 0 stands for zones)',
      d: 'An enemy Monster within 12″ counts as 0 stands for Seizing and Contesting this round.'
    },
    {
      n: 'Siphon Strength',
      kind: 'action',
      prac: 'Pheromancy',
      rng: 12,
      tgt: 'enemy',
      label: 'Siphon Strength (no Inspiration, no Aimed Shot)',
      d: 'An enemy regiment within 12″ cannot be Inspired or use Aimed Shot this round.'
    }
  ],
  Biomancer: [
    {
      n: 'Epigenetic Trigger',
      kind: 'draw',
      rng: 12,
      tgt: 'friend',
      label: 'Epigenetic Trigger (Command Stand +2 Attacks)',
      d: 'The Command Stand of a friendly regiment within 12″ gets +2 Attacks this round.'
    },
    {
      n: 'Essence Transfer',
      kind: 'action',
      prac: 'Biomancy',
      rng: 12,
      tgt: 'friend',
      fn: 'essence',
      d: 'A friendly regiment within 12″ takes wounds equal to the lower of 2D6; another friendly non-Monster within 12″ heals 4.'
    },
    {
      n: 'Unstable Enhancement',
      kind: 'action',
      prac: 'Biomancy',
      rng: 12,
      tgt: 'friend',
      req: 'nonmonster',
      fn: 'unstable',
      d: 'A friendly non-Monster within 12″ rolls a die: 1–2 +1 March, 3–4 +1 Clash (max 4), 5–6 +1 Volley (max 4).'
    },
    {
      n: 'Catalytic Rupture',
      kind: 'action',
      prac: 'Biomancy',
      rng: 12,
      tgt: 'friend',
      fn: 'rupture',
      d: 'Enemies in contact with a friendly regiment within 12″ take Hits equal to the higher of 2D6, Armor Piercing (1), no Morale.'
    },
    {
      n: 'Grant Virulence',
      kind: 'action',
      prac: 'Biomancy',
      rng: 12,
      tgt: 'enemy',
      fn: 'virulence',
      d: 'An enemy regiment within 12″ takes D6 Hits with Armor Piercing equal to 6 minus the roll, no Morale.'
    }
  ],
  'High Clone Executor': [
    {
      n: 'Symbiotic Command',
      kind: 'action',
      rng: 12,
      tgt: 'friend',
      req: 'Clone',
      label: 'Double Time (Symbiotic Command)',
      d: 'A friendly Clone regiment within 12″ gains the Double Time Draw Event this round.'
    }
  ],
  'Matriarch Queen': [
    {
      n: 'To The Last Breath',
      kind: 'draw',
      rng: 10,
      tgt: 'friend',
      req: 'nonmonster',
      heal: 4,
      once1: true,
      d: 'A friendly non-Monster regiment within 10″ heals 4 wounds (each regiment once per round).'
    }
  ],
  Hierodeacon: [
    {
      n: 'Dark Shepherd',
      kind: 'draw',
      rng: 12,
      tgt: 'friend',
      fn: 'shepherd',
      d: 'A friendly regiment within 12″ takes wounds to finish off its most wounded stand. No Morale.'
    }
  ],
  Theokrator: [
    {
      n: 'Exploitation of Divine Vanity',
      kind: 'draw',
      tgt: 'self',
      fn: 'vanity',
      d: 'Its regiment takes 3 wounds for 1 Dark Power token and a boon such as Aura of Death (+10).'
    }
  ],
  'Mahabharati Sardar': [
    {
      n: 'Elemental Assault: Untouchable',
      kind: 'draw',
      rng: 12,
      tgt: 'friend',
      grant: ['Untouchable'],
      cost: 3,
      d: 'Spend 3 Ritual Markers: a friendly Mortal regiment gains Untouchable.'
    },
    {
      n: 'Elemental Assault: Relentless Blows',
      kind: 'draw',
      rng: 12,
      tgt: 'friend',
      grant: ['Relentless Blows'],
      cost: 3,
      d: 'Spend 3 Ritual Markers: a friendly Mortal regiment gains Relentless Blows.'
    }
  ],
  'Jorogumo Geisha': [
    {
      n: 'Monstrous Inspiration',
      kind: 'draw',
      tgt: 'self',
      label: 'Monstrous Inspiration (shares an Ideal Card effect within 8″)',
      d: 'Share one of its Ideal Card effects with friendly regiments within 8″ this round.'
    },
    {
      n: 'Whispered Illusion',
      kind: 'draw',
      tgt: 'self',
      label: 'Whispered Illusion (attackers test Resolve)',
      d: 'Enemies charging or clashing with it must pass a Resolve test with penalties.'
    }
  ],
  Taosidhe: [
    {
      n: 'Planting an Ambush',
      kind: 'draw',
      rng: 12,
      tgt: 'friend',
      req: 'Infantry',
      grant: ['Prowl', 'Pounce'],
      d: 'A friendly Infantry regiment within 12″ gains Prowl and Pounce this round.'
    }
  ],
  'Hold Raegh': [
    {
      n: 'Preternatural Focus',
      kind: 'draw',
      rng: 10,
      tgt: 'friend',
      fn: 'awaken',
      d: 'A friendly regiment within 10″ becomes Awakened.'
    }
  ],
  'Lost Ancestor': [
    {
      n: 'Unassailable Authority',
      kind: 'draw',
      tgt: 'self',
      fn: 'awaken',
      d: 'Its regiment becomes Awakened.'
    }
  ]
};
