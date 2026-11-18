/* Landing hero: the career trajectory.
   Stops (HTML list) are plotted along a horizontal pseudotime line on wide screens; dots drift
   along it and, past "now", sort into the two branches: orange up to computational biology,
   red down to wet lab and cell therapy. Narrow screens and no-JS keep the plain vertical list.
   Settings locked 2026-11-18: sorted by colour, speed 1x, size 1x, 900 dots. */
(function () {
  const box = document.getElementById('axis');
  if (!box) return;
  const cv = box.querySelector('canvas');
  const stops = [...box.querySelectorAll('.stop')];
  const endsEl = [...box.querySelectorAll('.ends a')];
  const STOPS = stops.map(a => ({ y: +a.dataset.y, e: +a.dataset.e }));

  const GRAD = ['#51127c', '#b73779', '#fc8961', '#fcfdbf'];
  const INK = '#f2eef0', SOFT = '#a99ea6', UP = '#fca16d', DOWN = '#c84a78';
  const N = 900, R = 2.3, MIN_W = 900;
  const Y0 = 2011, NOW = 2026.9, Y1 = 2027.5;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const G = GRAD.map(hex);
  const grad = t => { t = Math.min(0.999, Math.max(0, t)) * (G.length - 1); const i = t | 0, f = t - i; return `rgb(${G[i].map((v, k) => Math.round(v + (G[i + 1][k] - v) * f))})`; };

  let ctx, W, H, X, cy, ends, endX, x0, xm, TB, on = false, focus = -1, dots = [];
  const OFF = [];

  stops.forEach((a, i) => {
    const enter = () => { focus = i; if (reduce && on) draw(); }, leave = () => { focus = -1; if (reduce && on) draw(); };
    a.addEventListener('pointerenter', enter); a.addEventListener('focus', enter);
    a.addEventListener('pointerleave', leave); a.addEventListener('blur', leave);
  });

  function layout() {
    on = box.clientWidth >= MIN_W;
    box.classList.toggle('plotted', on);
    stops.forEach(a => { a.classList.remove('up'); a.style.left = a.style.top = ''; });
    endsEl.forEach(a => { a.style.top = ''; });
    if (!on) return;
    const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx = cv.getContext('2d'); ctx.setTransform(d, 0, 0, d, 0, 0);
    X = y => 10 + (y - Y0) / (Y1 - Y0) * (W - 360);
    cy = H * 0.5; ends = [H * 0.24, H * 0.76]; endX = W - 288; x0 = X(NOW); xm = x0 + (endX - x0) * 0.5;
    TB = (endX - x0) / (X(Y0 + 1) - X(Y0)); // branch length in years, so dots keep their speed after the split
    // labels alternate above and below the line; one that would overlap an earlier label
    // on the same side moves further out, and its tick line grows to reach it
    const lefts = [];
    stops.forEach((a, i) => {
      const up = !(i % 2);
      a.classList.toggle('up', up);
      // shift a label left if it would run into the branch curves that start at "now"
      lefts[i] = Math.max(0, Math.min(X(STOPS[i].y) - 8, x0 - 172 - 16));
      a.style.left = lefts[i] + 'px';
      OFF[i] = 52;
      for (let j = i - 2; j >= 0; j -= 2) if (lefts[i] < lefts[j] + 172 + 12) OFF[i] = Math.max(OFF[i], OFF[j] + stops[j].offsetHeight + 14);
      a.style.top = (up ? cy - OFF[i] : cy + OFF[i]) + 'px';
    });
    endsEl.forEach((a, i) => { a.style.top = ends[i] + 'px'; });
    if (!dots.length) dots = Array.from({ length: N }, () => ({
      y: Y0 + Math.random() * (NOW + TB - Y0), u: Math.random(),
      j: (Math.random() + Math.random() + Math.random() - 1.5) * 30, sp: 0.0005 + Math.random() * 0.001,
    }));
  }

  // a dot's position at pseudotime y: on the line before now, on its branch's curve after
  function pos(d) {
    if (d.y <= NOW) return [X(d.y), cy + d.j];
    const t = Math.min(1, (d.y - NOW) / TB), m = 1 - t, by = ends[d.u < 0.5 ? 0 : 1];
    return [m * m * m * x0 + 3 * m * m * t * xm + 3 * m * t * t * xm + t * t * t * endX,
            m * m * m * cy + 3 * m * m * t * cy + 3 * m * t * t * by + t * t * t * by + d.j * (1 - 0.8 * t)];
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (focus >= 0) { const s = STOPS[focus]; ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(X(s.y), cy - 44, Math.max(6, X(Math.min(s.e, NOW)) - X(s.y)), 88); }
    for (const d of dots) {
      const dim = focus >= 0 && !(d.y >= STOPS[focus].y && d.y <= STOPS[focus].e);
      const [x, y] = pos(d);
      ctx.globalAlpha = dim ? 0.15 : 0.6; ctx.fillStyle = d.u < 0.5 ? UP : DOWN;
      ctx.beginPath(); ctx.arc(x, y, R, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (let x = X(Y0); x < x0; x += 2) { ctx.fillStyle = grad((x - X(Y0)) / (x0 - X(Y0))); ctx.fillRect(x, cy - 3, 2, 6); }
    ends.forEach((by, i) => {
      const comp = i === 0;
      ctx.strokeStyle = comp ? UP : DOWN; ctx.lineWidth = comp ? 2.6 : 2; ctx.setLineDash(comp ? [6, 6] : []);
      ctx.beginPath(); ctx.moveTo(x0, cy); ctx.bezierCurveTo(xm, cy, xm, by, endX, by); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(endX, by, 4, 0, 6.283); ctx.fill();
    });
    STOPS.forEach((s, i) => {
      const x = X(s.y), up = !(i % 2);
      ctx.strokeStyle = focus === i ? INK : SOFT; ctx.lineWidth = focus === i ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x, up ? cy - OFF[i] + 4 : cy + OFF[i] - 4); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, cy, focus === i ? 5.5 : 4, 0, 6.283); ctx.fill();
    });
  }

  // small previews on the Publications and Contact cards
  function previews() {
    document.querySelectorAll('.card canvas').forEach(c => {
      const rc = c.getBoundingClientRect(); if (!rc.width) return;
      const d = Math.min(2, devicePixelRatio || 1); c.width = rc.width * d; c.height = rc.height * d;
      const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.scale(rc.width / 76, rc.height / 56);
      if (c.dataset.p === 'bars') [1, 2, 0, 2, 2, 3, 2, 1].forEach((v, i) => { g.fillStyle = grad(i / 7); g.fillRect(4 + i * 9, 52 - v * 15, 6, v * 15); });
      if (c.dataset.p === 'pin') { g.strokeStyle = SOFT; g.lineWidth = 1; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(0, 10 + i * 10); g.lineTo(76, 6 + i * 11); g.stroke(); } g.fillStyle = UP; g.beginPath(); g.arc(44, 26, 5, 0, 6.283); g.fill(); }
    });
  }

  layout(); previews(); if (on) draw();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { layout(); previews(); if (on) draw(); }, 100); });
  if (reduce) return;
  (function loop() {
    if (on && !document.hidden) { for (const d of dots) { d.y += d.sp; if (d.y > NOW + TB) d.y = Y0; } draw(); }
    requestAnimationFrame(loop);
  })();
})();
