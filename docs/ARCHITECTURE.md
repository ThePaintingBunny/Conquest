# How the code is organised

This page is the map of the game's source. It explains where things live, how the pieces work together and where to make the most common changes. To find one function or constant by name, use the [code index](CODE_INDEX.md).

## The big picture

- The game is plain HTML, CSS and JavaScript in `src/`. There is no bundler and no framework.
- `src/index.html` holds the page markup and loads every stylesheet and script, in order.
- **All scripts share one global scope.** A function declared in one file can be called from any other file; there are no `import` or `export` lines. That is why moving a function to another file never changes behaviour.
- **Load order matters only for code that runs while the page loads** (constants, tables, event listeners). Code inside a function runs later, when everything is loaded. `npm run check` verifies the order is safe.
- `tools/build.py` copies `src/` to the site root for GitHub Pages.

## Folder map

Everything below is under `src/js/`. Each file starts with a header that says what it holds and lists its contents.

| Folder | What lives there |
| --- | --- |
| `data/` | Rules data with no logic: the core glossary, spells, Supremacy Abilities, items, officers, terrain, scenarios. |
| `data/factions/<faction>/` | One folder per faction: `units.js` (the army list), `upgrades.js` (character upgrades) and `rules-text.js` (the faction's rule text). |
| `core/` | Foundations: board coordinates, DOM helpers, random numbers and dice, geometry, and the game state. |
| `terrain/` | Terrain outlines, terrain rules, the artwork, random generation and the editor. |
| `regiments/` | A regiment on the table: its stands, footprint and contact, current profile, drawing, and building regiments from an army list. |
| `rules/` | The special rules engine: derived rules, movement, charge and combat rules, Broken and Shattered, extra actions, items, officers and character abilities. |
| `spells/` | Who casts what, targets, the casting roll, resolving a spell and the casting panel. |
| `factions/` | Each faction's own mechanics, the hooks the game calls, and the faction panels. |
| `supremacy/` | Warlords and Supremacy Abilities: passive rules, hooks, choices and the Supremacy step. |
| `actions/` | The actions of an activation: March, Reform, Combat Reform, Withdraw, with `charge/` and `volley/` in their own folders. |
| `activation/` | The activation itself: starting it, Draw Events, which actions are available, saving and undoing. |
| `combat/` | The combat roller: attack groups, re-rolls, rolls, the panel, recording the result, split Clashes and Duels. |
| `game/` | The flow of the game: scenarios and scoring, Command Cards, the Command Phase, reinforcements, ending a turn and a round. |
| `input/` | Pointer, button and keyboard wiring. |
| `online/` | Online play: seats, private data, live updates, shared combat, presence. |
| `ai/` | Playing against Claude: prompts, planning, carrying out the plan. |
| `overlays/` | Things drawn over the board on request: ruler, facing arcs, threat ranges. |
| `ui/` | The in-game interface: regiment card, tabs, turn bar, legend, tooltips, settings, dice, messages. |
| `screens/` | Whole pages: main menu, setup, army builder, encyclopedia, combat calculator, test field. |
| `dev/` | Hooks for the automated tests. |
| `main.js` | Start-up. Loaded after everything else. |

## How the game runs

**One state object.** The whole game (regiments, round, scores, terrain, both armies) is one object, `state`, stored as the document `game/state`. Every screen reads from it.

**One way to change it.** `putState(patch)` in `core/state.js` merges a change into the state, runs the state checks (`sanitize` in `game/sanitize.js`), saves it and calls `render()`.

**One way to draw it.** `render()` in `ui/render.js` redraws the board and every panel from the current state. Nothing keeps its own copy of what is on screen.

**Work in progress stays local.** Two variables hold what the player is in the middle of, and are not saved until it is done:

| Variable | Declared in | What it holds |
| --- | --- | --- |
| `act` | `core/state.js` | The activation in progress: the active regiment, its pose while it moves, the actions taken so far. |
| `cb` | `combat/open-close.js` | The combat being rolled in the combat panel. |

**Start-up.** `main.js` connects to the stored state, subscribes to changes (so an online opponent's moves arrive) and draws the first frame.

### The life of an activation

1. `startActivation` (`activation/start.js`) creates `act` for the chosen regiment.
2. `drawEvents` (`activation/draw-events.js`) applies Draw Events. The faction, special rule and Supremacy choices for this activation come from `frOptions`, `srOptions` and `supOptions`.
3. `availableActions` (`activation/available-actions.js`) decides which actions are allowed next.
4. `startAction` and `finishAction` (`activation/actions.js`) run one action. Each action has its own file under `actions/`.
5. A Clash, Impact or Volley opens the combat panel with `openCombat`; `recordCombat` applies the result.
6. `saveActivation` (`activation/save.js`) writes everything to the state. `abort` (`activation/undo.js`) throws it away instead.

### Where a rule lives

A rule usually has two parts: its **data** (name, text, numbers) and the **code** that makes it work.

| Kind of rule | Data | Code |
| --- | --- | --- |
| A regiment's profile and options | `data/factions/<faction>/units.js` | `regiments/unit-factory.js` turns it into a regiment |
| Core special rule text | `data/glossary.js` | checked where it applies, mostly in `rules/` and `combat/` |
| Faction special rule text | `data/factions/<faction>/rules-text.js` | `rules/` and `factions/` |
| Character upgrade (item, mastery) | `data/factions/<faction>/upgrades.js` and `data/items.js` | `rules/items.js` |
| Spell | `data/spells.js` | `spells/casting.js` |
| Supremacy Ability | `data/supremacy.js` | `supremacy/` |
| Faction mechanic (tokens, Chants, Rituals) | `data/faction-mechanics.js` | `factions/<faction>.js` and `factions/activation-options.js` |
| Officer | `data/officers.js` | `rules/officers.js` |
| Terrain | `data/terrain.js` | `terrain/rules.js` |

The game asks the rules for their effect at fixed points, through **hook** functions. For example, after every combat it calls `srAfterCombat` (special rules) and `supAfterCombat` (Supremacy). To see every place a rule can act, search for the hook's name.

## Reading the names

Many names are short. The prefix tells you the area:

| Prefix | Area | Folder |
| --- | --- | --- |
| `sr` | special rules | `rules/` |
| `fr` | faction rules | `factions/` |
| `sup` | Supremacy Abilities | `supremacy/` |
| `wad`, `od`, `sk`, `wc`, `dw`, `sp`, `y`, `hk` | W'adrhŭn, Old Dominion, Sorcerer Kings, Weaver Courts, Dweghom, Spires, Yoroni, Hundred Kingdoms | `factions/` |
| `ch` | character abilities | `rules/character-abilities.js` |
| `cb` | combat | `combat/` |
| `duel` | Duels | `combat/duels.js` |
| `chg`, `charge` | Charge | `actions/charge/` |
| `volley` | Volley | `actions/volley/` |
| `cr`, `wd` | Combat Reform, Withdraw | `actions/` |
| `t` (as in `tCover`), `terr` | terrain | `terrain/` |
| `reinf`, `rl` | reinforcements, Reinforcement Lines | `game/` |
| `ai`, `ex`, `plan` | Claude's turn (`ex` = carry out one step) | `ai/` |
| `bld`, `ab`, `wb`, `upg` | army builder (`wb` = warband, `upg` = upgrade) | `screens/army-builder/` |
| `en` | encyclopedia | `screens/encyclopedia.js` |
| `mm` | main menu (and Master Manipulator in `factions/spires/`) | `screens/menu/` |
| `tf`, `qa` | test field, its quick-add form | `screens/test-field/` |
| `calc` | combat calculator | `screens/calculator/` |
| `thr`, `arc` | threat ranges, facing arcs | `overlays/` |
| `ovr` | host override console | `ui/turnbar/host-override.js` |

A few helpers appear everywhere:

| Name | Meaning |
| --- | --- |
| `$(id)` | the page element with that id |
| `el(tag, attrs, parent)` | create an SVG element |
| `all()`, `byId(id)`, `base(id)` | every regiment; one regiment as shown right now; one regiment as saved |
| `RU(u)` | all rules a regiment has right now |
| `rh(rules, 'Name')` | does the list have that rule |
| `rx(rules, 'Name')` | the number in `Name (X)` |
| `fx(u)` | every effect in force on a regiment |
| `u`, `A`, `T` | a regiment; the attacker; the target |
| `HU`, `AI` | the side this screen plays; the other side |
| `PVP()`, `SBX()` | is this an online game; is this the test field |
| `PS()` | this player's private data (hidden Command Stack) |
| `N(side)` | the army name of a side |
| `d6()` | roll one die |
| `toast(text)` | show a message over the board |

## Where to change things

- **A unit's stats, options or points:** `data/factions/<faction>/units.js`.
- **A new army list for one faction:** the three files in `data/factions/<faction>/`. Then check `data/faction-mechanics.js`, `data/spells.js`, `data/supremacy.js` and `data/items.js` for entries of that faction.
- **A special rule's wording in tooltips:** `data/glossary.js` (core) or the faction's `rules-text.js`.
- **How a special rule works:** search for the rule's name in `src/js/rules`, `src/js/factions` and `src/js/combat`.
- **A spell:** its entry in `data/spells.js`; unusual effects are in `resolveSpell0` in `spells/casting.js`.
- **Scenario zones or scoring:** `data/scenarios.js` and `game/scoring.js`.
- **Colours, spacing, layout:** `src/css/` (see below).
- **A hotkey:** `ui/settings.js` (the list shown to the player) and `input/hotkeys.js` (what it does; the overlays handle their own keys in `overlays/`).

### Adding a script

1. Create the file in the folder it belongs to, with a header like the other files.
2. Add a `<script src="js/...">` line to `src/index.html`, next to the files of the same folder.
3. Run `npm run check`. If the new file runs code while loading that needs a later file, the check says which one; move the line down.
4. Run `npm run index` to refresh the code index and the "In this file" lists.

## Stylesheets

The stylesheets in `src/css/` are numbered because **their order matters**: when two rules set the same property with equal weight, the later one wins. They were split from larger files without reordering a single rule.

| Files | What they style |
| --- | --- |
| `01` to `08` | The base look: page, panels and controls, encyclopedia, army builder, activation panel, formation editor, legend, board extras. |
| `09` | The regiment card. |
| `10` to `12` | Themes. The game uses Steel & Brass. |
| `13` to `15` | Settings window, Regiment tab, main menu. |

The army builder appears in two files (`04` and `06`) because its rules sit in two places in the cascade. Merging them would need a check that no rule in between depends on the order.

## Tools

Install once with `npm install`. Then:

| Command | What it does |
| --- | --- |
| `npm run build` | Builds the GitHub Pages site from `src/` (same as `python3 tools/build.py`). |
| `npm run check` | Verifies that every script is loaded, no name is declared twice and the load order is safe. |
| `npm run index` | Rewrites [CODE_INDEX.md](CODE_INDEX.md) and the "In this file" lists in the file headers. |
| `npm run format` | Formats the scripts with Prettier. |

## Known rough edges

The files are organised; the code inside them is unchanged. These are the main things a later clean-up could take on:

- **Very long functions.** Each of these builds a whole panel or handles every faction in one function, and would be easier to follow split into one function per section or per faction:

  | Function | File | Lines |
  | --- | --- | --- |
  | `renderCard` | `ui/regiment-card.js` | about 1,230 |
  | `armyBuilder` | `screens/army-builder/page.js` | about 550 |
  | `frOptions0` | `factions/activation-options.js` | about 525 |
  | `srOptions` | `rules/activation-options.js` | about 510 |
  | `renderCombat0` | `combat/panel.js` | about 480 |
  | `frBlock` | `factions/trackers-panel.js` | about 410 |
  | `renderTestField` | `screens/test-field/panel.js` | about 390 |
  | `renderMenu` | `screens/menu/page.js` | about 390 |

- **Short names.** Names such as `rx`, `cb` and `frG` are quick to type and hard to read. The tables above decode them; renaming them is a separate step.
- **One global scope.** Converting to ES modules (`import` and `export`) would make each file's dependencies explicit.
