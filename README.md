# Conquest Table

A browser battle map for **Conquest: The Last Argument of Kings**: build your army, set up terrain and one of 12 scenarios, then play a friend online or face Claude.

**Play:** https://thepaintingbunny.github.io/Conquest/

## Features

- **Main menu:** Continue, Single player, Multiplayer, Test field, Army builder, Combat calculator, Encyclopedia and Settings, with a lobby for each kind of game and an in-game menu (☰ Menu).
- **Combat calculator:** build two regiments as in the army builder (characters, upgrades, options, Inspired, Supremacy), then see their profiles side by side, the average wounds of each Impact, Clash and Volley, and how often each wins a whole fight, all rolled with the game's own combat rules.
- **Battle map:** a 6×4 ft table with terrain (random or placed by hand), objective zones and markers for all 12 scenarios, and scoring for each round.
- **Full turn flow:** reinforcements, hidden Command Stacks, the Supremacy roll-off, the Strategic Stack, marching, charges, and combat with automatic dice (Clash, Impact, Volley, Morale, Die Fighting, Lethal Demise).
- **Army builder:** choose a faction and add regiments and characters. The profiles come from the built-in encyclopedia, so no API key is needed.
- **Encyclopedia:** all 10 factions, with every character and regiment, its stat line, special rules, options and warband choices. Hover a rule to see what it does.
- **Online play:** the host starts a game and sends the invite link or code. Each player sees the table from their own edge, Command Stacks stay hidden, and the defender rolls their own saves.
- **Single player, free:** the built-in opponent (Easy, Normal or Hard) builds a legal army for any faction and plays its turns itself: it weighs every Charge, March and Volley in points (damage, zones, how exposed it ends up), orders its Command Stack by what acting early is worth, and sacrifices cheap regiments when that saves something more valuable. No API key, works offline.
- **Army import:** paste a list copied from the Para Bellum app and it is read directly, no AI involved.
- **Play against Claude (optional):** add your own Anthropic API key under *Claude settings* and choose Claude as the opponent instead.

## How to play online

1. Open the site, choose **Multiplayer** in the main menu and press **Host an online game**. Keep that tab open: the host's browser holds the game.
2. Press **Copy invite link** and send it to your opponent. They can also choose **Multiplayer** and type the code into the **Join** box.
3. In the lobby each player takes a seat (an edge), builds or loads an army, and either of you starts the game.

With Firebase set up (see below), the game is saved in the cloud: either player can close the tab and come back later through the same link. Without Firebase, the host's tab holds the game, so it must stay open. Either way, players keep their seats after a reload, and you can join from a second tab in the same browser, which is handy for testing.

## Playing against Claude

Claude needs an [Anthropic API key](https://console.anthropic.com/):

- **Cost:** each game costs a little on your own Anthropic account.
- **Privacy:** the key is stored only in your browser and is sent only to `api.anthropic.com`.
- **Models:** you can change which models are used under *Claude settings*.

## How it's built

- **No bundler and no server.** The site is plain files on GitHub Pages.
- **Game:** `src/`, the same page that runs as a Claude artifact:
  - `src/index.html`: the markup only, with the stylesheets and scripts it loads, in order.
  - `src/css/`: the stylesheets, numbered in the order they load.
  - `src/js/`: the game, in one folder per area (`core`, `terrain`, `regiments`, `rules`, `spells`, `factions`, `supremacy`, `actions`, `activation`, `combat`, `game`, `online`, `ai`, `overlays`, `ui`, `screens`). Every file opens with a header that says what it holds and lists its contents.
  - `src/js/data/`: rules data from the army lists. Each faction has its own folder under `data/factions/` with its units, upgrades and rule text.
- **Finding your way:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) explains the folders, how the game runs and where to make common changes. [docs/CODE_INDEX.md](docs/CODE_INDEX.md) lists every file and every function with the file it lives in.
- **Standalone runtime:** `shim.js` replaces Claude's runtime. It keeps game data in local storage, syncs online games through Firebase Cloud Firestore (or, if Firebase isn't configured, relays moves through a free public MQTT broker with the host's browser as referee), and calls Claude with the player's own API key.
- **Online safety (MQTT relay):** every message on the public relay is signed in the browser (ECDSA P-256). The game code is made from a hash of the host's key, so guests only accept the game from the real host. Each player's moves are signed with a key kept in their browser and tied to their seat; the host only accepts moves from seated players, and watchers can do nothing but appear in the lobby and take an open seat. Nobody but the host can move another player out of a seat; the host can free a seat for a player who comes back on another device. Dice and rules are still run in the host's browser, so this stops outsiders, not a host who tampers with their own copy.
- **Building the site:** `tools/build.py` copies `src/` to the site root (`index.html`, `css/`, `js/`), adds `shim.js` and the footer, and stamps every file link with the build version so browsers never mix old and new files. After editing the game, run `python3 tools/build.py` and commit `src/` and the built files together.
- **Developer tools (optional):** run `npm install` once, then `npm run check` (every script is loaded, no name is declared twice, the load order is safe), `npm run index` (refresh the code index and the file headers), `npm run format` (Prettier) and `npm run build`.

### Publishing with GitHub Pages

In the repository settings, go to **Pages** and set **Source** to *Deploy from a branch*, using the `main` branch and the `/ (root)` folder.

### Setting up Firebase for online games

Online games are synced through **Cloud Firestore** from Google Firebase when `firebase-config.js` is filled in. Without it, they fall back to a public MQTT relay. Firestore's free Spark plan is plenty for this game.

1. Go to the [Firebase console](https://console.firebase.google.com/), choose **Create a project**, give it a name and skip Google Analytics.
2. Open **Build → Firestore Database**, press **Create database**, choose a location (for example `eur3` for Europe) and start in **production mode**.
3. On the **Rules** tab, replace the rules with these, then press **Publish**:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /rooms/{room}/docs/{doc} {
         allow read: if true;
         allow create, update: if request.resource.data.j is string
                               && request.resource.data.j.size() < 900000;
         allow delete: if true;
       }
     }
   }
   ```

4. Open **Project settings** (the gear icon), go to **Your apps**, add a **Web app** (`</>`), and copy the `firebaseConfig` object it shows.
5. Paste it into `firebase-config.js` as `window.CONQUEST_FIREBASE = { apiKey: "…", authDomain: "…", projectId: "…", … };` and commit.

The web config is not a secret: Firebase web configs are meant to be public, and the rules above control what can be read and written.

### Privacy of online games

Games are stored under their random code. Anyone who knew a code could in principle read or change that game, because there are no player accounts. Codes are random and 8 characters long, and hidden Command Stacks are never sent at all.

## Disclaimer

This is an unofficial, fan-made project, not affiliated with or endorsed by Para Bellum Wargames. Conquest, its rules, factions and unit profiles belong to [Para Bellum Wargames](https://www.para-bellum.com/).

Unit data and rule summaries are paraphrased from their free army lists and may contain mistakes. Always check the [official rules and army lists](https://www.para-bellum.com/rules-and-faq/).
