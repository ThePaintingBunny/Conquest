/*
 * Replays
 *
 * Steps through the current game from its first board, entry by entry, from the game log. The live game carries on
 * underneath (online, the other player's moves still arrive) and comes back when the replay is closed. Nothing can
 * be changed while a replay is showing.
 *
 * In this file: replayOpen(), replayShow(), replayClose(), replayBar()
 */

async function replayOpen() {
  if (LOG.replay) return;
  if (act || cb || charAct) {
    toast('Finish or undo the current activation first.');
    return;
  }
  if (!LOG.epoch) {
    toast('The game log is not loaded yet.');
    return;
  }
  const ep = LOG.epoch;
  toast('Loading the replay…');
  let c0 = null;
  try {
    c0 = await db.doc(logPath.c0(ep)).get();
  } catch (e) {}
  if (!c0 || !c0.exists) {
    toast('No replay is stored for this game.');
    return;
  }
  const last = logChunkOf(Math.max(0, logMaxN()));
  const docs = await Promise.all(
    Array.from({ length: last + 1 }, (_, c) =>
      db
        .doc(logPath.lg(ep, c))
        .get()
        .catch(() => null)
    )
  );
  const ent = new Map();
  docs.forEach(sn => {
    const e = (sn && sn.exists && (sn.data() || {}).e) || {};
    Object.keys(e).forEach(k => e[k] && ent.set(k, e[k]));
  });
  LOG.ent.forEach((e, k) => ent.set(k, e));
  const keys = [...ent.keys()].sort();
  const cache = [],
    start = c0.data().s;
  const frames = [{ label: 'The game begins', enc: start }];
  let enc = start;
  keys.forEach(k => {
    const e = ent.get(k);
    if (e.k === 'undo') enc = e.to === '' ? start : (cache.find(c => c.key === e.to) || { enc }).enc;
    else if (e.d) enc = stMerge(enc, e.d);
    cache.push({ key: k, enc });
    if (e.k !== 'combat-step') frames.push({ label: e.l || e.k || 'Change', enc, n: e.n, by: e.by });
  });
  LOG.replay = { frames, i: frames.length - 1, live: state, play: null };
  document.body.classList.add('replaying');
  replayBar();
  replayShow(0);
}

function replayShow(i) {
  const R = LOG.replay;
  if (!R) return;
  R.i = Math.max(0, Math.min(R.frames.length - 1, i));
  const f = R.frames[R.i];
  state = stDecode(f.enc);
  act = null;
  cb = null;
  charAct = null;
  try {
    render();
  } catch (e) {
    console.error(e);
  }
  const lab = document.getElementById('rp-lab'),
    rng = document.getElementById('rp-rng');
  if (lab)
    lab.textContent =
      `Step ${R.i} of ${R.frames.length - 1}` +
      (state.round ? ` · round ${state.round}` : '') +
      ` · ${f.by ? N(f.by) + ': ' : ''}${f.label}`;
  if (rng) rng.value = String(R.i);
}

function replayClose() {
  const R = LOG.replay;
  if (!R) return;
  clearInterval(R.play);
  LOG.replay = null;
  document.body.classList.remove('replaying');
  const b = document.getElementById('rp-bar'),
    o = document.getElementById('rp-veil');
  if (b) b.remove();
  if (o) o.remove();
  state = stDecode(LOG.enc) || R.live;
  render();
}

function replayBar() {
  const R = LOG.replay;
  const veil = bEl('div', { id: 'rp-veil', className: 'rp-veil', title: 'A replay is showing' });
  const bar = bEl('div', { id: 'rp-bar', className: 'rp-bar' });
  bar.setAttribute('role', 'toolbar');
  const btn = (t, fn, aria) => {
    const x = bEl('button', { type: 'button', className: 'btn ghost', textContent: t });
    if (aria) x.setAttribute('aria-label', aria);
    x.onclick = fn;
    return x;
  };
  const rng = bEl('input', {
    type: 'range',
    id: 'rp-rng',
    min: '0',
    max: String(R.frames.length - 1),
    value: '0'
  });
  rng.setAttribute('aria-label', 'Replay step');
  rng.oninput = () => replayShow(+rng.value);
  const play = btn('Play', () => {
    if (R.play) {
      clearInterval(R.play);
      R.play = null;
      play.textContent = 'Play';
      return;
    }
    play.textContent = 'Pause';
    R.play = setInterval(() => {
      if (!LOG.replay || R.i >= R.frames.length - 1) {
        clearInterval(R.play);
        R.play = null;
        play.textContent = 'Play';
        return;
      }
      replayShow(R.i + 1);
    }, 900);
  });
  bar.append(
    bEl('div', { className: 'rp-row' }, [
      btn('⏮', () => replayShow(0), 'First step'),
      btn('◀', () => replayShow(R.i - 1), 'Previous step'),
      play,
      btn('▶', () => replayShow(R.i + 1), 'Next step'),
      btn('⏭', () => replayShow(R.frames.length - 1), 'Last step'),
      rng,
      btn('Back to the game', replayClose)
    ]),
    bEl('div', { id: 'rp-lab', className: 'rp-lab' })
  );
  document.body.append(veil, bar);
}
