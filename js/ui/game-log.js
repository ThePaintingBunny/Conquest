/*
 * Game log
 *
 * Everything that happens in a game, in order: each action's result as the game reports it (the line under the
 * board), new rounds and the final score. It is kept on this device for the current game and shown in the Game
 * tab, where it can be exported as a text file.
 *
 * The built-in opponent's decisions are traced alongside: the army plan for each round (which regiment has which
 * job and why), the Command Stack order with its reasons, and for every step the best lines it weighed with their
 * scores (zone change, threat, exposure, progress). Exported as one JSON file with the game log and a picture of
 * the board at the start of each round, for reviewing and tuning the opponent.
 *
 * In this file: gameLog, botTrace, glogSeen, glogStep, glogRound, glogOpen, glogLoad(), glogSave(),
 *   glogAdd(), botTraceAdd(), glogBoard(), glogWatch(), glogText(), glogDownload(), glogStamp(),
 *   glogPanel()
 */

let gameLog = null,
  botTrace = null,
  glogSeen = null,
  glogStep = null,
  glogRound = null,
  glogOpen = false;

function glogLoad() {
  if (gameLog) return;
  try {
    gameLog = JSON.parse(localStorage.getItem('vob-log') || '[]');
    botTrace = JSON.parse(localStorage.getItem('vob-bottrace') || '[]');
  } catch (e) {}
  if (!Array.isArray(gameLog)) gameLog = [];
  if (!Array.isArray(botTrace)) botTrace = [];
}

function glogSave() {
  try {
    localStorage.setItem('vob-log', JSON.stringify(gameLog.slice(-2000)));
  } catch (e) {}
  try {
    localStorage.setItem('vob-bottrace', JSON.stringify(botTrace.slice(-1200)));
  } catch (e) {
    try {
      localStorage.setItem('vob-bottrace', JSON.stringify(botTrace.slice(-300)));
    } catch (e2) {}
  }
}

function glogAdd(e) {
  glogLoad();
  gameLog.push(Object.assign({ t: Date.now(), r: (state && state.round) || 0 }, e));
  if (gameLog.length > 2500) gameLog.splice(0, gameLog.length - 2000);
  glogSave();
}

/* the built-in opponent's reasoning (only kept while it plays) */
function botTraceAdd(e) {
  glogLoad();
  botTrace.push(Object.assign({ t: Date.now(), r: (state && state.round) || 0 }, e));
  if (botTrace.length > 4000) botTrace.splice(0, botTrace.length - 3000);
  clearTimeout(botTraceAdd.tm);
  botTraceAdd.tm = setTimeout(glogSave, 400);
}

/* where every regiment stands, compactly */
function glogBoard() {
  return (state.units || [])
    .filter(u => !u.destroyed)
    .map(u => ({
      id: u.id,
      side: u.side,
      name: u.short || u.name,
      cls: u.cls,
      on: !!u.onTable,
      x: u.onTable ? +(+u.x).toFixed(1) : null,
      y: u.onTable ? +(+u.y).toFixed(1) : null,
      f: u.onTable ? Math.round(u.facing || 0) : null,
      stands: u.stands,
      wounds: u.wounds || 0,
      char: u.charName || undefined,
      fx: (u.effects || []).length ? u.effects : undefined
    }));
}

/* called on every render: notes what changed since last time */
function glogWatch() {
  if (!state) return;
  glogLoad();
  const st = state.step || 'activations',
    key = (state.lastTitle || '') + '|' + (state.lastText || '');
  const prevStep = glogStep;
  glogStep = st;
  if (st === 'setup' || st === 'review') {
    glogSeen = key;
    glogRound = null;
    return;
  }
  /* a game starts: a fresh log */
  if (prevStep && (prevStep === 'setup' || prevStep === 'review')) {
    gameLog = [];
    botTrace = [];
    glogSeen = null;
    glogAdd({
      kind: 'start',
      title: 'Game started',
      text:
        `${N('cs')} against ${N('nord')} · ${scenOf().name}` + (PVP() ? ' · online' : ' · against ' + N(AI))
    });
  }
  if (glogSeen === null) {
    /* first look after loading the page: what is showing now was logged before */
    glogSeen = key;
    glogRound = state.round;
    if (!gameLog.length) glogAdd({ kind: 'start', title: 'Log started', text: state.phase || '' });
    return;
  }
  if (state.round !== glogRound) {
    glogRound = state.round;
    glogAdd({
      kind: 'round',
      title: 'Round ' + state.round,
      text: `Score: ${N('cs')} ${(state.vp || {}).cs || 0}, ${N('nord')} ${(state.vp || {}).nord || 0}`
    });
    if (!PVP() && botOn())
      botTraceAdd({
        k: 'board',
        units: glogBoard(),
        vp: state.vp,
        zones: zoneControl().map(z => ({ name: z.name, holder: z.holder || null }))
      });
  }
  if (key !== glogSeen) {
    glogSeen = key;
    if (state.lastTitle || state.lastText)
      glogAdd({
        kind: 'act',
        side: state.turn || null,
        title: state.lastTitle || '',
        text: state.lastText || ''
      });
  }
  if (st === 'over' && prevStep !== 'over')
    glogAdd({
      kind: 'end',
      title: 'Game over',
      text: `${N('cs')} ${(state.vp || {}).cs || 0}, ${N('nord')} ${(state.vp || {}).nord || 0}`
    });
}

function glogText() {
  glogLoad();
  return gameLog
    .map(e => {
      const tm = new Date(e.t).toTimeString().slice(0, 8);
      if (e.kind === 'round' || e.kind === 'start' || e.kind === 'end')
        return `\n== ${e.title}${e.text ? ' · ' + e.text : ''} (${tm})`;
      return `[R${e.r} ${tm}] ${e.title}${e.text ? ': ' + e.text : ''}`;
    })
    .join('\n')
    .trim();
}

/* offer a file: the page's save prompt in claude.ai, a plain download elsewhere */
async function glogDownload(name, text) {
  try {
    const d = await window.claude?.use?.('downloads');
    if (d) {
      await d.save({ filename: name, data: text });
      return;
    }
  } catch (e) {
    if (e && e.code === 'declined') return;
    if (e && e.code === 'rate_limited') {
      toast('A save prompt is already open.');
      return;
    }
  }
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([text], { type: name.endsWith('.json') ? 'application/json' : 'text/plain' })
    );
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
  } catch (e) {
    toast('Saving files is not possible here.');
  }
}

function glogStamp() {
  const d = new Date(),
    p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/* the Game log section of the Game tab */
function glogPanel() {
  glogLoad();
  const d = document.createElement('details');
  d.className = 'vc glog';
  d.open = glogOpen;
  const sm = document.createElement('summary');
  sm.textContent = 'Game log (' + gameLog.filter(e => e.kind === 'act').length + ')';
  d.appendChild(sm);
  d.addEventListener('toggle', () => {
    glogOpen = d.open;
    if (d.open) fill();
  });
  const fill = () => {
    if (d.querySelector('.glog-body')) return;
    const bar = document.createElement('div');
    bar.className = 'glog-bar';
    const b1 = document.createElement('button');
    b1.type = 'button';
    b1.className = 'btn ghost';
    b1.textContent = 'Export log (.txt)';
    b1.onclick = () => glogDownload('conquest-log-' + glogStamp() + '.txt', glogText() || 'Empty log');
    bar.appendChild(b1);
    if (botTrace.length) {
      const b2 = document.createElement('button');
      b2.type = 'button';
      b2.className = 'btn ghost';
      b2.textContent = 'Export opponent decisions (.json)';
      b2.title = 'The built-in opponent’s plans and the options it weighed at every step, with the game log';
      b2.onclick = () =>
        glogDownload(
          'conquest-bot-' + glogStamp() + '.json',
          JSON.stringify(
            {
              kind: 'conquest-bot-trace',
              v: 1,
              sides: { cs: N('cs'), nord: N('nord'), bot: AI },
              scenario: scenOf().name,
              level: botLevel(),
              round: state.round,
              vp: state.vp,
              log: gameLog,
              trace: botTrace,
              board: glogBoard()
            },
            null,
            0
          )
        );
      bar.appendChild(b2);
    }
    const body = document.createElement('ol');
    body.className = 'glog-body';
    gameLog.slice(-300).forEach(e => {
      const li = document.createElement('li');
      if (e.kind !== 'act') {
        li.className = 'glog-h';
        li.textContent = e.title + (e.text ? ' · ' + e.text : '');
      } else {
        const b = document.createElement('b');
        b.textContent = e.title;
        li.append(b, document.createTextNode(e.text ? ' ' + e.text : ''));
        if (e.side) li.dataset.side = e.side;
      }
      body.appendChild(li);
    });
    d.append(bar, body);
    requestAnimationFrame(() => {
      body.scrollTop = body.scrollHeight;
    });
  };
  if (d.open) fill();
  return d;
}
