/* Landing hero: the career trajectory.
   The stops are an HTML list. Wide screens plot them along a horizontal pseudotime line; narrow
   screens run it down a centre rail with labels alternating left and right. In both,
   dots drift along the line and, past "now", sort into the two branches: orange to computational
   biology, red to wet lab and cell therapy. Without JS the list shows with a plain gradient rail.
   Settings locked 2026-11-18: sorted by colour, speed 1x, size 1x, 900 dots (wide). */
(function () {
  const box = document.getElementById('axis');
  if (!box) return;
  const cv = box.querySelector('canvas');
  const stops = [...box.querySelectorAll('.stop')];
  const endsEl = [...box.querySelectorAll('.ends a')];
  const STOPS = stops.map(a => ({ y: +a.dataset.y, e: +a.dataset.e }));

  const GRAD = ['#51127c', '#b73779', '#fc8961', '#fcfdbf'];
  const INK = '#f2eef0', SOFT = '#a99ea6', UP = '#fca16d', DOWN = '#c84a78';
  const MIN_W = 900;                 // axis width below which the trajectory runs vertically
  const GAP = 20;                    // vertical mode: space between the centre rail and a label
  const Y0 = 2011, NOW = 2026.9, Y1 = 2027.5;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const G = GRAD.map(hex);
  const grad = t => { t = Math.min(0.999, Math.max(0, t)) * (G.length - 1); const i = t | 0, f = t - i; return `rgb(${G[i].map((v, k) => Math.round(v + (G[i + 1][k] - v) * f))})`; };
  const bez = (a, b, c, e, t) => { const m = 1 - t; return m * m * m * a + 3 * m * m * t * b + 3 * m * t * t * c + t * t * t * e; };

  let mode = '', ctx, W, H, TB, focus = -1, dots = [];
  // horizontal geometry
  let X, cy, ends, endX, x0, xm; const OFF = [];
  // vertical geometry: centre x, stop y, split y, branch end y and the two branch end x
  let CX, YT, ys, yS, yE, EXS;

  stops.forEach((a, i) => {
    const enter = () => { focus = i; if (reduce && mode) draw(); }, leave = () => { focus = -1; if (reduce && mode) draw(); };
    a.addEventListener('pointerenter', enter); a.addEventListener('focus', enter);
    a.addEventListener('pointerleave', leave); a.addEventListener('blur', leave);
  });

  function makeDots(n) {
    dots = Array.from({ length: n }, () => ({
      y: Y0 + Math.random() * (NOW + TB - Y0), u: Math.random(),
      j: (Math.random() + Math.random() + Math.random() - 1.5) * 30, sp: 0.0005 + Math.random() * 0.001,
    }));
  }

  function layout() {
    const next = box.clientWidth >= MIN_W ? 'h' : 'v';
    box.classList.toggle('plotted', next === 'h');
    box.classList.toggle('vplot', next === 'v');
    stops.forEach(a => { a.classList.remove('up', 'l', 'r'); a.style.left = a.style.top = a.style.width = ''; });
    endsEl.forEach(a => { a.style.left = a.style.top = a.style.width = ''; });
    box.style.height = '';
    if (next === 'v') placeVertical();

    const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx = cv.getContext('2d'); ctx.setTransform(d, 0, 0, d, 0, 0);

    if (next === 'h') {
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
    } else {
      // the labels are stacked for legibility, not by date, so dots flow evenly down the whole rail
      YT = y => ys[0] + (Math.min(y, NOW) - Y0) / (NOW - Y0) * (yS - ys[0]);
      TB = (yE - yS) / ((yS - ys[0]) / (NOW - Y0)); // branch length in years at the rail's pace
    }

    if (next !== mode) {
      mode = next;
      // similar density in both: about 900 dots across the wide line, fewer on the narrow rail
      makeDots(mode === 'h' ? 900 : Math.max(120, Math.min(420, Math.round((yS - ys[0]) * 0.4))));
    }
  }

  // narrow screens: a centre rail with labels alternating left and right, oldest at the top.
  // Each label starts a little below the previous one and clear of the last label on its side.
  function placeVertical() {
    const w = box.clientWidth, half = w / 2 - GAP;
    CX = w / 2; ys = [];
    let prevTop = -Infinity; const bottom = { l: 0, r: 0 };
    stops.forEach((a, i) => {
      const side = i % 2 ? 'r' : 'l';
      a.classList.add(side);
      a.style.width = half + 'px';
      a.style.left = (side === 'l' ? 0 : CX + GAP) + 'px';
      const top = Math.max(i ? prevTop + 30 : 4, bottom[side] ? bottom[side] + 18 : 0);
      a.style.top = top + 'px';
      prevTop = top; bottom[side] = top + a.offsetHeight;
      ys[i] = top + 6;                                   // middle of the year line
    });
    yS = Math.max(bottom.l, bottom.r) + 22;              // where the rail splits
    yE = yS + 64;                                        // where the branches end
    EXS = [half / 2, CX + GAP + half / 2];               // computational left, wet lab right
    let endsH = 0;
    endsEl.forEach((a, i) => {
      a.style.width = half + 'px';
      a.style.left = (i ? CX + GAP : 0) + 'px';
      a.style.top = (yE + 14) + 'px';
      endsH = Math.max(endsH, a.offsetHeight);
    });
    box.style.height = (yE + 14 + endsH + 8) + 'px';
  }

  // a dot's position at pseudotime y: on the line before now, on its branch's curve after
  function pos(d) {
    const comp = d.u < 0.5;
    if (mode === 'h') {
      if (d.y <= NOW) return [X(d.y), cy + d.j];
      const t = Math.min(1, (d.y - NOW) / TB), by = ends[comp ? 0 : 1];
      return [bez(x0, xm, xm, endX, t), bez(cy, cy, by, by, t) + d.j * (1 - 0.8 * t)];
    }
    const jx = d.j * 0.3;
    if (d.y <= NOW) return [CX + jx, YT(d.y)];
    const t = Math.min(1, (d.y - NOW) / TB), ex = EXS[comp ? 0 : 1], span = yE - yS;
    return [bez(CX, CX, ex, ex, t) + jx * (1 - 0.8 * t), bez(yS, yS + 0.5 * span, yE - 0.5 * span, yE, t)];
  }

  function drawDots() {
    for (const d of dots) {
      const [x, y] = pos(d);
      const dim = focus >= 0 && (mode === 'h' ? !(d.y >= STOPS[focus].y && d.y <= STOPS[focus].e) : !(y >= ys[focus] && y <= (ys[focus + 1] || yS)));
      ctx.globalAlpha = dim ? 0.15 : 0.6; ctx.fillStyle = d.u < 0.5 ? UP : DOWN;
      ctx.beginPath(); ctx.arc(x, y, mode === 'h' ? 2.3 : 2, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawH() {
    if (focus >= 0) { const s = STOPS[focus]; ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(X(s.y), cy - 44, Math.max(6, X(Math.min(s.e, NOW)) - X(s.y)), 88); }
    drawDots();
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

  function drawV() {
    if (focus >= 0) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(CX - 22, ys[focus], 44, (ys[focus + 1] || yS) - ys[focus]); }
    drawDots();
    const g = ctx.createLinearGradient(0, ys[0], 0, yS);
    GRAD.forEach((c, i) => g.addColorStop(i / (GRAD.length - 1), c));
    ctx.fillStyle = g; ctx.fillRect(CX - 2, ys[0], 4, yS - ys[0]);
    const span = yE - yS;
    EXS.forEach((ex, i) => {
      const comp = i === 0;
      ctx.strokeStyle = comp ? UP : DOWN; ctx.lineWidth = comp ? 2.4 : 2; ctx.setLineDash(comp ? [5, 5] : []);
      ctx.beginPath(); ctx.moveTo(CX, yS); ctx.bezierCurveTo(CX, yS + 0.5 * span, ex, yE - 0.5 * span, ex, yE); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(ex, yE, 4, 0, 6.283); ctx.fill();
    });
    ys.forEach((y, i) => {
      const dir = i % 2 ? 1 : -1;                         // tick points towards the label's side
      ctx.strokeStyle = focus === i ? INK : SOFT; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(CX, y); ctx.lineTo(CX + dir * (GAP - 4), y); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(CX, y, focus === i ? 5 : 4, 0, 6.283); ctx.fill();
    });
  }

  function draw() { ctx.clearRect(0, 0, W, H); if (mode === 'h') drawH(); else drawV(); }

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

  layout(); previews(); draw();
  // web fonts can reflow the list after first paint; re-measure once they are in
  if (document.fonts) document.fonts.ready.then(() => { layout(); draw(); });
  let rt, lastW = innerWidth;
  addEventListener('resize', () => {
    // phones fire resize when the address bar slides in and out; only a width change matters
    if (innerWidth === lastW && mode === 'v') return;
    clearTimeout(rt);
    rt = setTimeout(() => { layout(); previews(); draw(); lastW = innerWidth; }, 100);
  });
  if (reduce) return;
  (function loop() {
    if (!document.hidden) { for (const d of dots) { d.y += d.sp; if (d.y > NOW + TB) d.y = Y0; } draw(); }
    requestAnimationFrame(loop);
  })();
})();
