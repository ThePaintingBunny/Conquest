/*
 * Main menu: the home page
 *
 * A bar to carry on with the game in progress, the three ways to play as large cards, the tools as tiles, and a
 * column with your saved armies, your last battles and the settings. Finished games are remembered on this device
 * for the Last battles list.
 *
 * In this file: BATTLEKEY, battleList(), battleRecord(), mhArmyPts(), mhContinue(), mhSide(), mmHome()
 */

const BATTLEKEY = 'conquest-last-battles';

function battleList() {
  try {
    const L = JSON.parse(localStorage.getItem(BATTLEKEY) || '[]');
    return Array.isArray(L) ? L : [];
  } catch (e) {
    return [];
  }
}

/* when a game ends, remember it once: who played whom, the scenario and the score (from the side you played) */
function battleRecord() {
  if (!state || state.step !== 'over' || state.mode === 'test' || !state.gid) return;
  const L = battleList();
  if (L.some(b => b.gid === state.gid)) return;
  const me = PVP() ? seatSide() || 'cs' : HU,
    them = other(me),
    vp = state.vp || {};
  L.unshift({
    gid: state.gid,
    at: Date.now(),
    me: N(me),
    them: N(them),
    scen: (typeof scenOf === 'function' && scenOf().name) || '',
    a: +vp[me] || 0,
    b: +vp[them] || 0
  });
  try {
    localStorage.setItem(BATTLEKEY, JSON.stringify(L.slice(0, 8)));
  } catch (e) {}
}

/* the points of a saved army (the builder's own counting, on that army) */
function mhArmyPts(a) {
  const keep = bld;
  try {
    bld = a.bld;
    return bldTotal();
  } catch (e) {
    return 0;
  } finally {
    bld = keep;
  }
}

/* the bar at the top: the game in progress, or the setup you left */
function mhContinue() {
  const go = () => {
    mmOverlay = false;
    mmPage = null;
    render();
  };
  let k, t, sub, chips = [], fn;
  if (mmGameOn()) {
    k = 'Continue';
    t = (state.step === 'over' ? 'Game over' : 'Round ' + (state.round || 1)) + ' · ' + (state.phase || '').replace(/^Round \d+ · /, '');
    sub = N('cs') + ' against ' + N('nord') + (typeof scenOf === 'function' ? ' · ' + scenOf().name : '');
    chips = ['cs', 'nord'].map(s => bEl('span', { className: 'mh-vp ' + s, textContent: N(s) + ' ' + ((state.vp || {})[s] || 0) }));
    fn = go;
  } else if (mmSetupStep() && state.setup && (state.setup.cs || state.setup.nord)) {
    k = 'Continue setting up';
    t = PVP() ? 'Multiplayer lobby' : 'Single player lobby';
    sub = state.step === 'review' ? 'Both armies are ready: check them and start' : 'Your armies are being set up';
    fn = () => mmGo(PVP() ? 'multi' : 'single');
  } else return null;
  const b = bEl('button', { type: 'button', className: 'mm-card pri mh-cont' });
  b.append(
    bEl('span', { className: 'mm-ico' }, [icon('play', 26) || '▶']),
    bEl('span', { className: 'mm-tx' }, [
      bEl('span', { className: 'mh-k', textContent: k }),
      bEl('strong', { textContent: t }),
      bEl('small', { textContent: sub })
    ]),
    bEl('span', { className: 'mh-chips' }, chips),
    bEl('span', { className: 'btn gold mh-go', textContent: 'Continue' })
  );
  b.onclick = fn;
  return b;
}

/* the side column: saved armies, last battles, settings */
function mhSide(busy) {
  const side = bEl('aside', { className: 'mh-side' });
  {
    const box = bEl('section', { className: 'mh-box' }, [bEl('h3', { className: 'mh-k', textContent: 'Your armies' })]);
    const L = armyList();
    if (!L.length)
      box.append(bEl('p', { className: 'hint', textContent: 'None yet. Build one in the army builder and save it.' }));
    L.slice(0, 5).forEach(a => {
      const pts = mhArmyPts(a);
      const row = bEl('div', { className: 'mh-row' });
      const bar = bEl('i', { className: 'mh-bar' });
      bar.style.background = FACTION_COLOR[a.fac] || 'var(--line)';
      const play = bEl('button', { type: 'button', className: 'btn ghost', textContent: 'Play' });
      play.disabled = busy;
      play.title = busy ? 'Leave this game first' : 'Play a single player game with this army';
      play.onclick = async () => {
        bld = JSON.parse(JSON.stringify(a.bld));
        bldWho = 'main';
        bldSave();
        try {
          armyMode = 'build';
        } catch (e) {}
        await mmStart('single');
      };
      row.append(
        bar,
        bEl('div', { className: 'mh-rt' }, [
          bEl('b', { textContent: a.name }),
          bEl('small', { textContent: (a.fac || '') + (pts ? ' · ' + pts.toLocaleString('en') + ' pts' : '') })
        ]),
        play
      );
      box.append(row);
    });
    if (L.length > 5) box.append(bEl('p', { className: 'hint', textContent: 'And ' + (L.length - 5) + ' more in the army builder.' }));
    side.append(box);
  }
  {
    const B = battleList();
    if (B.length) {
      const box = bEl('section', { className: 'mh-box' }, [bEl('h3', { className: 'mh-k', textContent: 'Last battles' })]);
      B.slice(0, 4).forEach(b => {
        const res = b.a > b.b ? 'Won' : b.a < b.b ? 'Lost' : 'Draw';
        box.append(
          bEl('div', { className: 'mh-row mh-bt' }, [
            bEl('span', { textContent: 'vs ' + b.them + (b.scen ? ' · ' + b.scen : '') }),
            bEl('b', { className: res.toLowerCase(), textContent: res + ' ' + b.a + '–' + b.b })
          ])
        );
      });
      side.append(box);
    }
  }
  const sets = [mmCard('Settings', 'Dice, animations, controls and display', '⚙', () => $('set-open').click(), { small: true })];
  const n = mmNet();
  if (n && n.openSettings)
    sets.push(mmCard('Claude settings', 'API key and models for playing Claude here', '✦', () => n.openSettings(), { small: true }));
  side.append(bEl('div', { className: 'mh-sets' }, sets));
  return side;
}

function mmHome(inner) {
  const busy = mmOverlay && (mmGameOn() || SBX()),
    bz = busy ? { disabled: true } : {},
    bs = t => (busy ? (SBX() ? 'Leave the test field first' : 'Leave this game first') : t);
  const wrap = bEl('div', { className: 'mh' }),
    main = bEl('div', { className: 'mh-main' });
  /* title with a pennant per faction */
  {
    const pen = bEl('div', { className: 'mh-pen' });
    pen.setAttribute('aria-hidden', 'true');
    Object.keys(FACTION_COLOR).forEach((n, i) => {
      const p = bEl('span', { title: n });
      p.style.background = FACTION_COLOR[n];
      p.style.height = (i % 2 ? 36 : 30) + 'px';
      pen.append(p);
    });
    main.append(
      bEl('div', { className: 'mh-title' }, [
        pen,
        bEl('div', {}, [
          bEl('h1', { textContent: 'Command Stack' }),
          bEl('p', { textContent: 'A battle table for Conquest: The Last Argument of Kings' })
        ])
      ])
    );
  }
  const c = mhContinue();
  if (c) main.append(c);
  main.append(
    bEl('h2', { className: 'mh-k', textContent: 'Play' }),
    bEl('div', { className: 'mh-play' }, [
      mmCard('Single player', bs('Against the built-in opponent (free) or Claude: bring your army, it brings its own'), '⚔', () => mmStart('single'), bz),
      mmCard('Multiplayer', bs('Play a friend online: take a seat, bring your army, ready up'), '⚑', () => mmStart('multi'), bz),
      mmCard('Test field', bs('Drop regiments for either side and try out rules freely'), '⚗', () => mmStart('test'), bz)
    ]),
    bEl('h2', { className: 'mh-k', textContent: 'Tools' }),
    bEl('div', { className: 'mh-tools' }, [
      mmCard('Army builder', 'Build, check and save armies', '✎', () => mmGo('army')),
      mmCard('Map builder', bs('Paint terrain and save maps'), 'quill', () => mbOpen(''), bz),
      mmCard('Scenario builder', bs('Objectives, points and rounds'), 'banner', () => sbOpen(''), bz),
      mmCard('Combat calculator', 'Who wins a fight, and by how much', '⚖', () => mmGo('calc')),
      mmCard('Encyclopedia', 'Every faction, unit and rule', '📖', () => {
        if (mmOverlay) {
          mmOverlay = false;
          mmPage = null;
          render();
        }
        $('en-open').click();
      })
    ])
  );
  wrap.append(main, mhSide(busy));
  inner.append(wrap);
}
