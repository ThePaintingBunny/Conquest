# Conquest Table

A browser battle map for **Conquest: The Last Argument of Kings**: build your army, set up terrain and one of 12 scenarios, then play a friend online or face Claude.

**Play:** https://thepaintingbunny.github.io/conquest/

## Features

- **Battle map:** a 6×4 ft table with terrain (random or placed by hand), objective zones and markers for all 12 scenarios, and scoring for each round.
- **Full turn flow:** reinforcements, hidden Command Stacks, the Supremacy roll-off, the Strategic Stack, marching, charges, and combat with automatic dice (Clash, Impact, Volley, Morale, Die Fighting, Lethal Demise).
- **Army builder:** choose a faction and add regiments and characters. The profiles come from the built-in encyclopedia, so no API key is needed.
- **Encyclopedia:** all 10 factions, with every character and regiment, its stat line, special rules, options and warband choices. Hover a rule to see what it does.
- **Online play:** the host starts a game and sends the invite link or code. Each player sees the table from their own edge, Command Stacks stay hidden, and the defender rolls their own saves.
- **Play against Claude (optional):** add your own Anthropic API key under *Claude settings*. Claude can read a pasted army list, design its own army and play its turns with animated moves and dice.

## How to play online

1. Open the site and press **Host an online game**. Keep that tab open: the host's browser holds the game.
2. Press **Copy invite link** and send it to your opponent. They can also type the code into the **Join** box.
3. Choose **Play against a friend**. Each player takes an edge, builds an army, and either of you starts the game.

If the host reloads the page, the game resumes from that browser. The guest reconnects automatically and keeps their seat after a reload. You can also join from a second tab in the same browser, which is handy for testing.

## Playing against Claude

Claude needs an [Anthropic API key](https://console.anthropic.com/):

- **Cost:** each game costs a little on your own Anthropic account.
- **Privacy:** the key is stored only in your browser and is sent only to `api.anthropic.com`.
- **Models:** you can change which models are used under *Claude settings*.

## How it's built

- **No build step and no server.** The site is plain files on GitHub Pages.
- **Game:** `src/game.html`, the same page that runs as a Claude artifact.
- **Standalone runtime:** `shim.js` replaces Claude's runtime. It keeps game data in local storage, handles online play by relaying moves through a free public MQTT broker over secure WebSockets (EMQX, with HiveMQ and Mosquitto as fallbacks), which works on almost any network, and calls Claude with the player's own API key.
- **Building the site:** `tools/build.py` wraps `src/game.html` into `index.html`. After editing the game, run `python3 tools/build.py` and commit both files.

### Publishing with GitHub Pages

In the repository settings, go to **Pages** and set **Source** to *Deploy from a branch*, using the `main` branch and the `/ (root)` folder.

### Privacy of online games

Public brokers are open, so anyone who knew your game code could in principle read the shared game. Codes are random and 8 characters long, and hidden Command Stacks are never sent at all.

## Disclaimer

This is an unofficial, fan-made project, not affiliated with or endorsed by Para Bellum Wargames. Conquest, its rules, factions and unit profiles belong to [Para Bellum Wargames](https://www.para-bellum.com/).

Unit data and rule summaries are paraphrased from their free army lists and may contain mistakes. Always check the [official rules and army lists](https://www.para-bellum.com/rules-and-faq/).
