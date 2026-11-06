#!/usr/bin/env python3
"""Build index.html (the GitHub Pages site) from src/game.html.

src/game.html is the same page that runs as a Claude artifact. This script wraps it
in a full HTML document, loads shim.js (which replaces Claude's runtime with local
storage, peer-to-peer online play and an optional Anthropic API key) and adjusts the
wording that only makes sense inside Claude.
"""
import pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'src' / 'game.html').read_text(encoding='utf8')

def swap(text, old, new, required=True):
    if old not in text:
        if required:
            sys.exit(f'build: expected text not found: {old[:70]!r}')
        return text
    return text.replace(old, new)

# Split the fragment into head material (title, links, styles) and body.
body_start = src.index('<div class="wrap">')
head, body = src[:body_start], src[body_start:]
head = re.sub(r'<meta name="claude:[^>]*>\s*', '', head)

KEY_HINT = 'Add your Anthropic API key under Claude settings at the top of the page to use Claude.'
body = swap(body, "'Claude was not allowed to run, so the army was not read.'", repr(KEY_HINT))
body = swap(body, "'Claude was not allowed to run, so the armies were not built.'", repr(KEY_HINT))
body = swap(body, 'Share this page with them from the Share menu, with permission to interact.',
            'Press Host an online game at the top, then send your opponent the invite link.')

body = swap(body, '<script>\n(function(){', '<script src="firebase-config.js"></script>\n<script src="shim.js"></script>\n<script>\n(function(){')

footer = ('<footer class="fan-note"><p>Unofficial, fan-made table for <em>Conquest: The Last Argument of Kings</em>. '
          'Conquest, its rules, factions and unit profiles belong to '
          '<a href="https://www.para-bellum.com/" rel="noopener">Para Bellum Wargames</a>; this project is not affiliated with or endorsed by them. '
          'Unit data and rule summaries are paraphrased from their free army lists; always check the '
          '<a href="https://www.para-bellum.com/rules-and-faq/" rel="noopener">official rules and army lists</a>.</p></footer>\n')
body = swap(body, '<script src="firebase-config.js"></script>', footer + '<script src="firebase-config.js"></script>')

extra_css = ('<style>.fan-note{max-width:1240px;margin:24px auto 32px;font-size:13px;color:var(--muted)}'
             '.fan-note a{color:inherit}</style>\n')

out = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
       '<meta name="description" content="A battle map for Conquest: The Last Argument of Kings. Play a friend online or face Claude.">\n'
       + head + extra_css + '</head>\n<body>\n' + body + '\n</body>\n</html>\n')
(root / 'index.html').write_text(out, encoding='utf8')
print('built index.html', len(out), 'bytes')
