#!/usr/bin/env python3
"""Build the GitHub Pages site (index.html, css/, js/) from src/.

src/ holds the same page that runs as a Claude artifact:
  src/index.html   the markup, with <link> and <script src> tags in load order
  src/css/*.css    styles, split by area
  src/js/*.js      the game, split by feature (src/js/data/ holds the rules data)

This script copies them to the site root and:
  - loads firebase-config.js and shim.js (which replace Claude's runtime with local
    storage, online play and an optional Anthropic API key) before the game scripts,
  - adjusts the wording that only makes sense inside Claude,
  - adds the fan-made footer and a version stamp,
  - appends ?v=<stamp> to every css/js link so browsers never mix old and new files.
"""
import datetime, pathlib, re, shutil, sys

root = pathlib.Path(__file__).resolve().parent.parent
src = root / 'src'
page = (src / 'index.html').read_text(encoding='utf8')

# The game's own files, read into memory so text swaps can be applied before writing.
files = {p.relative_to(src).as_posix(): p.read_text(encoding='utf8')
         for p in sorted(src.rglob('*')) if p.is_file() and p.suffix in ('.css', '.js')}


def swap(old, new):
    """Replace text in whichever game file holds it (exactly one must)."""
    hits = [k for k, v in files.items() if old in v]
    if len(hits) != 1:
        sys.exit(f'build: expected {old[:70]!r} in exactly one file, found {hits}')
    files[hits[0]] = files[hits[0]].replace(old, new)


def swap_page(text, old, new):
    if old not in text:
        sys.exit(f'build: expected text not found in src/index.html: {old[:70]!r}')
    return text.replace(old, new)


KEY_HINT = 'Add your Anthropic API key under Claude settings at the top of the page to use Claude.'
swap("'Claude was not allowed to run, so the army was not read.'", repr(KEY_HINT))
swap("'Claude was not allowed to run, so the armies were not built.'", repr(KEY_HINT))
swap('Share this page with them from the Share menu, with permission to interact.',
     'Press Host an online game above (or open the invite link your opponent sent), then each of you takes a seat.')

STAMP = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
VER = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M')

# Split the page into head material (title, links) and body.
body_start = page.index('<div class="wrap">')
head, body = page[:body_start], page[body_start:]
head = re.sub(r'<meta name="claude:[^>]*>\s*', '', head)

footer = ('<footer class="fan-note"><p>Version ' + STAMP + '. Unofficial, fan-made table for <em>Conquest: The Last Argument of Kings</em>. '
          'Conquest, its rules, factions and unit profiles belong to '
          '<a href="https://www.para-bellum.com/" rel="noopener">Para Bellum Wargames</a>; this project is not affiliated with or endorsed by them. '
          'Unit data and rule summaries are paraphrased from their free army lists; always check the '
          '<a href="https://www.para-bellum.com/rules-and-faq/" rel="noopener">official rules and army lists</a>.</p></footer>\n')
body = swap_page(body, '<!-- runtime -->', footer + '<script src="firebase-config.js"></script>\n<script src="shim.js"></script>')

# Cache busting: every css/js link gets the build version.
versioned = lambda s: re.sub(r'((?:href|src)="(?:css|js)/[^"?]+)"', r'\1?v=' + VER + '"', s)
head, body = versioned(head), versioned(body)

extra_css = ('<style>.fan-note{max-width:1240px;margin:24px auto 32px;font-size:13px;color:var(--muted)}'
             '.fan-note a{color:inherit}</style>\n')

out = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
       '<meta name="description" content="A battle map for Conquest: The Last Argument of Kings. Play a friend online or face Claude.">\n'
       + head + extra_css + '</head>\n<body>\n' + body + '\n</body>\n</html>\n')

# Write the site: generated css/ and js/ are replaced wholesale.
for d in ('css', 'js'):
    shutil.rmtree(root / d, ignore_errors=True)
for rel, text in files.items():
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding='utf8')
(root / 'index.html').write_text(out, encoding='utf8')
print('built index.html and', len(files), 'css/js files')
