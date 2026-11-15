/*
 * Board zoom
 *
 * Zooming and panning the board without changing anything in the game: it only changes which part of the
 * table the board shows (the SVG viewBox), and every pointer position is read through the screen matrix, so
 * clicks and drags land on the same spot at any zoom.
 *
 * Touch: pinch with two fingers to zoom, move both fingers to pan; one finger still selects and moves.
 * Mouse and trackpad: Ctrl + wheel (or a trackpad pinch) zooms at the pointer; when zoomed in, the wheel
 * pans. The Zoom buttons in the toolbar do the same, and Fit shows the whole table again.
 *
 * In this file: ZOOM, zoomBase(), zoomApply(), zoomBy(), zoomPan(), zoomFit()
 */

const ZOOM = { base: null, k: 1, cx: 0, cy: 0, max: 4 };

function zoomBase() {
  if (!ZOOM.base) {
    const v = ($('board').getAttribute('viewBox') || '0 0 100 100').split(/\s+/).map(Number);
    ZOOM.base = { x: v[0], y: v[1], w: v[2], h: v[3] };
    ZOOM.cx = v[0] + v[2] / 2;
    ZOOM.cy = v[1] + v[3] / 2;
  }
  return ZOOM.base;
}

/* apply the zoom, keeping the view inside the table */
function zoomApply() {
  const B = zoomBase(),
    k = Math.max(1, Math.min(ZOOM.max, ZOOM.k)),
    w = B.w / k,
    h = B.h / k;
  ZOOM.k = k;
  ZOOM.cx = Math.max(B.x + w / 2, Math.min(B.x + B.w - w / 2, ZOOM.cx));
  ZOOM.cy = Math.max(B.y + h / 2, Math.min(B.y + B.h - h / 2, ZOOM.cy));
  $('board').setAttribute(
    'viewBox',
    [ZOOM.cx - w / 2, ZOOM.cy - h / 2, w, h].map(n => +n.toFixed(2)).join(' ')
  );
  const fit = $('zoom-fit');
  if (fit) fit.hidden = k <= 1.001;
  document.body.classList.toggle('zoomed', k > 1.001);
}

/* zoom by a factor, keeping the board point under the screen point (clientX, clientY) still */
function zoomBy(f, clientX, clientY) {
  const sv = $('board');
  let at = null;
  if (clientX != null) {
    const p = sv.createSVGPoint();
    p.x = clientX;
    p.y = clientY;
    at = p.matrixTransform(sv.getScreenCTM().inverse());
  }
  const k0 = ZOOM.k;
  ZOOM.k = Math.max(1, Math.min(ZOOM.max, k0 * f));
  if (at) {
    const r = k0 / ZOOM.k;
    ZOOM.cx = at.x + (ZOOM.cx - at.x) * r;
    ZOOM.cy = at.y + (ZOOM.cy - at.y) * r;
  }
  zoomApply();
}

/* pan by a distance in screen pixels */
function zoomPan(dx, dy) {
  const m = $('board').getScreenCTM();
  if (!m) return;
  ZOOM.cx -= dx / m.a;
  ZOOM.cy -= dy / m.d;
  zoomApply();
}

function zoomFit() {
  const B = zoomBase();
  ZOOM.k = 1;
  ZOOM.cx = B.x + B.w / 2;
  ZOOM.cy = B.y + B.h / 2;
  zoomApply();
}

/* ---- wheel ---- */
$('board').addEventListener(
  'wheel',
  ev => {
    if (ev.ctrlKey || ev.metaKey) {
      ev.preventDefault();
      zoomBy(Math.exp(-ev.deltaY * 0.01), ev.clientX, ev.clientY);
    } else if (ZOOM.k > 1.001) {
      ev.preventDefault();
      zoomPan(-ev.deltaX, -ev.deltaY);
    }
  },
  { passive: false }
);

/* ---- two-finger pinch and pan; these listeners run before the game's own pointer handlers ---- */
{
  const touches = new Map();
  let pinch = null;
  const mid = () => {
    const P = [...touches.values()];
    return {
      x: (P[0].x + P[1].x) / 2,
      y: (P[0].y + P[1].y) / 2,
      d: Math.hypot(P[0].x - P[1].x, P[0].y - P[1].y)
    };
  };
  const sv = $('board');
  sv.addEventListener(
    'pointerdown',
    ev => {
      if (ev.pointerType !== 'touch') return;
      touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (touches.size === 2) {
        /* a second finger: this is a pinch, so whatever the first finger started stops here */
        ev.stopImmediatePropagation();
        drag = null;
        pinch = mid();
      } else if (touches.size > 2) ev.stopImmediatePropagation();
    },
    true
  );
  sv.addEventListener(
    'pointermove',
    ev => {
      if (!touches.has(ev.pointerId)) return;
      touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (!pinch || touches.size < 2) return;
      ev.stopImmediatePropagation();
      const m = mid();
      if (pinch.d > 0 && m.d > 0) zoomBy(m.d / pinch.d, m.x, m.y);
      zoomPan(m.x - pinch.x, m.y - pinch.y);
      pinch = m;
    },
    true
  );
  const end = ev => {
    if (!touches.has(ev.pointerId)) return;
    touches.delete(ev.pointerId);
    if (pinch) {
      ev.stopImmediatePropagation();
      if (touches.size < 2) pinch = touches.size ? { done: true } : null;
    }
  };
  sv.addEventListener('pointerup', end, true);
  sv.addEventListener('pointercancel', end, true);
  /* the finger left over after a pinch moves nothing until it is lifted */
  sv.addEventListener(
    'pointermove',
    ev => {
      if (pinch && pinch.done && touches.has(ev.pointerId)) ev.stopImmediatePropagation();
    },
    true
  );
}

/* ---- toolbar buttons ---- */
{
  const tools = document.querySelector('.tools'),
    last = $('last');
  if (tools) {
    const mk = (id, text, title, fn) => {
      const b = bEl('button', { type: 'button', id, className: 'tool zoom-b', textContent: text, title });
      b.setAttribute('aria-label', title);
      b.onclick = fn;
      tools.insertBefore(b, last || null);
      return b;
    };
    mk('zoom-in', '', 'Zoom in (Ctrl + wheel, or pinch)', () => zoomBy(1.5)).append(icon('zoomIn', 18));
    mk('zoom-out', '', 'Zoom out', () => zoomBy(1 / 1.5)).append(icon('zoomOut', 18));
    mk('zoom-fit', 'Fit', 'Show the whole table', zoomFit).hidden = true;
  }
}
