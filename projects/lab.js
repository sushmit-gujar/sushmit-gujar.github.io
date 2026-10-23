/* Open-source lab: renders projects.json into a neon circuit map. No dependencies. */
(() => {
  'use strict';
  const doc = document.documentElement;
  doc.classList.add('js-on');
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mqMobile = window.matchMedia('(max-width: 720px)');
  const SVGNS = 'http://www.w3.org/2000/svg';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const GH_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';

  const fmt = (st, v) => {
    const d = st.decimals || 0;
    const n = d ? v.toFixed(d) : Math.round(v).toLocaleString('en-US');
    return (st.prefix || '') + n + (st.suffix || '');
  };

  const bare = st => Object.assign({}, st, { prefix: '', suffix: '' });
  let data, catLabel = {}, filter = 'all';

  fetch('projects.json', { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(init)
    .catch(err => {
      $('#panels').insertAdjacentHTML('beforebegin', '<p class="err">Couldn\u2019t load <a href="projects.json">projects.json</a> (' + esc(err.message) + '). See the repos on <a href="https://github.com/sushmit-gujar">GitHub</a>.</p>');
    });

  function init(json) {
    data = json;
    (data.categories || []).forEach(c => { catLabel[c.id] = c.label; });
    renderFilters();
    renderNodes();
    renderPanels();
    wire();
    observe();
    if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  }

  /* ---------- Filters ---------- */
  function renderFilters() {
    const box = $('#filters');
    box.firstElementChild.insertAdjacentHTML('beforeend', '<span class="n">' + data.projects.length + '</span>');
    (data.categories || []).forEach(c => {
      const n = data.projects.filter(p => p.category === c.id).length;
      if (!n) return;
      box.insertAdjacentHTML('beforeend', '<button type="button" class="chip-btn" data-filter="' + esc(c.id) + '" aria-pressed="false">' + esc(c.label) + '<span class="n">' + n + '</span></button>');
    });
    box.addEventListener('click', e => {
      const b = e.target.closest('button[data-filter]'); if (!b) return;
      filter = b.dataset.filter;
      box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      let shown = 0;
      document.querySelectorAll('[data-cat]').forEach(el => {
        const on = filter === 'all' || el.dataset.cat === filter;
        el.hidden = !on; if (on && el.classList.contains('panel')) shown++;
      });
      $('#live').textContent = 'Showing ' + shown + ' project' + (shown === 1 ? '' : 's') + (filter === 'all' ? '' : ' in ' + (catLabel[filter] || filter));
      draw();
    });
  }

  /* ---------- Hub nodes ---------- */
  function renderNodes() {
    $('#nodes').innerHTML = data.projects.map(p => {
      const k = p.stats && p.stats[0];
      return '<li data-cat="' + esc(p.category) + '" data-id="' + esc(p.id) + '">' +
        '<a class="node" href="#' + esc(p.id) + '" data-color="' + esc(p.color || 'cyan') + '" data-id="' + esc(p.id) + '">' +
          '<span class="node-cat">' + esc(catLabel[p.category] || p.category) + '</span>' +
          '<span class="node-name">' + esc(p.name) + '</span>' +
          '<span class="node-tag">' + esc(p.tagline) + '</span>' +
          (k ? '<span class="node-kpi"><b>' + esc(fmt(k, k.value)) + '</b>' + esc(k.label) + '</span>' : '') +
          '<span class="node-go" aria-hidden="true">↓</span>' +
        '</a></li>';
    }).join('');
    $('#nodes').addEventListener('pointerover', hot);
    $('#nodes').addEventListener('pointerout', hot);
    $('#nodes').addEventListener('focusin', hot);
    $('#nodes').addEventListener('focusout', hot);
  }
  function hot(e) {
    const a = e.target.closest('.node');
    const on = (e.type === 'pointerover' || e.type === 'focusin') && a;
    document.querySelectorAll('#wires g.hot').forEach(g => g.classList.remove('hot'));
    if (on) { const g = document.querySelector('#wires g[data-id="' + a.dataset.id + '"]'); if (g) g.classList.add('hot'); }
  }

  /* ---------- Panels ---------- */
  function renderPanels() {
    $('#panels').innerHTML = data.projects.map((p, i) => {
      const stats = (p.stats || []).map(s =>
        '<div class="stat"><div class="stat-v"><span class="sr-only">' + esc(fmt(s, s.value)) + '</span><span aria-hidden="true">' + (s.prefix ? '<span class="pre">' + esc(s.prefix) + '</span>' : '') + '<span class="num" data-v="' + s.value + '">' + esc(fmt(bare(s), s.value)) + '</span>' + (s.suffix ? '<span class="suf">' + esc(s.suffix.trim()) + '</span>' : '') + '</span></div>' +
        '<div class="stat-l">' + esc(s.label) + '</div>' + (s.note ? '<div class="stat-n">' + esc(s.note) + '</div>' : '') + '</div>').join('');
      const pipe = (p.pipeline || []).map((st, j) =>
        '<li class="stage" style="--i:' + j + '"><span class="stage-k">' + String(j + 1).padStart(2, '0') + '</span><b>' + esc(st.label) + '</b>' +
        (st.branches ? '<span class="branches">' + st.branches.map(b => '<span>' + esc(b) + '</span>').join('') + '</span>' : '') +
        (st.sub ? '<small>' + esc(st.sub) + '</small>' : '') + '</li>').join('');
      const links = (p.links || []).map(l =>
        '<a class="nbtn' + (l.primary ? ' primary' : '') + '" href="' + esc(l.url) + '" target="_blank" rel="noopener">' +
        (/github\.com/.test(l.url) ? GH_ICON : '') + esc(l.label) + ' <span aria-hidden="true">↗</span></a>').join('');
      return '<article class="panel" id="' + esc(p.id) + '" data-cat="' + esc(p.category) + '" data-color="' + esc(p.color || 'cyan') + '" aria-labelledby="h-' + esc(p.id) + '">' +
        '<span class="corner tl" aria-hidden="true"></span><span class="corner br" aria-hidden="true"></span>' +
        '<div class="p-grid"><div>' +
          '<p class="p-head"><span class="p-idx">node_' + String(i + 1).padStart(2, '0') + '</span><span class="p-cat">' + esc(catLabel[p.category] || p.category) + '</span></p>' +
          '<h2 class="p-name" id="h-' + esc(p.id) + '">' + esc(p.name) + '</h2>' +
          '<p class="p-tag">&gt; ' + esc(p.tagline) + '</p>' +
          '<p class="p-pitch">' + esc(p.pitch) + '</p>' +
          (p.highlights ? '<ul class="p-hl">' + p.highlights.map(h => '<li>' + esc(h) + '</li>').join('') + '</ul>' : '') +
        '</div><div class="stats" aria-label="Results">' + stats + '</div></div>' +
        (pipe ? '<div class="pipe-wrap"><p class="pipe-title">architecture · signal path</p><ol class="pipe" aria-label="' + esc(p.name) + ' architecture">' + pipe + '</ol></div>' : '') +
        '<div class="p-foot"><ul class="chips" aria-label="Stack">' + (p.stack || []).map(s => '<li>' + esc(s) + '</li>').join('') + '</ul>' +
        '<div class="btns">' + links + '</div></div>' +
      '</article>';
    }).join('');
  }

  /* ---------- Scroll-in, live current, counters ---------- */
  function countUp(el, st) {
    if (mqReduce.matches || el.dataset.done) return;
    el.dataset.done = '1';
    const target = +el.dataset.v, dur = 1300, t0 = performance.now();
    const step = t => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(bare(st), target * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function observe() {
    const panels = [...document.querySelectorAll('.panel')];
    if (!('IntersectionObserver' in window)) { panels.forEach(p => p.classList.add('seen', 'live')); return; }
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      const p = en.target;
      if (en.isIntersecting) {
        p.classList.add('seen', 'live');
        const proj = data.projects.find(x => x.id === p.id);
        p.querySelectorAll('.stat-v .num').forEach((el, j) => countUp(el, proj.stats[j]));
      } else if (!p.matches(':hover, :focus-within')) p.classList.remove('live');
    }), { threshold: 0.18 });
    panels.forEach(p => {
      io.observe(p);
      p.addEventListener('pointerenter', () => p.classList.add('live'));
      p.addEventListener('focusin', () => p.classList.add('live'));
    });
  }

  /* ---------- Wires: route circuit traces from the core to each node ---------- */
  let svg, hub, raf = 0;
  function wire() {
    svg = $('#wires'); hub = $('#hub');
    const sched = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
    if ('ResizeObserver' in window) new ResizeObserver(sched).observe(hub); else window.addEventListener('resize', sched);
    mqReduce.addEventListener && mqReduce.addEventListener('change', sched);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sched);
    draw();
  }
  const R = 14; // corner radius
  function orth(pts) {
    // Polyline with rounded corners through orthogonal points.
    let d = 'M' + pts[0][0] + ' ' + pts[0][1];
    for (let i = 1; i < pts.length - 1; i++) {
      const [px, py] = pts[i - 1], [x, y] = pts[i], [nx, ny] = pts[i + 1];
      const l1 = Math.hypot(x - px, y - py), l2 = Math.hypot(nx - x, ny - y);
      const r = Math.min(R, l1 / 2, l2 / 2);
      const ax = x - (x - px) / l1 * r, ay = y - (y - py) / l1 * r;
      const bx = x + (nx - x) / l2 * r, by = y + (ny - y) / l2 * r;
      d += ' L' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ' Q' + x + ' ' + y + ' ' + bx.toFixed(1) + ' ' + by.toFixed(1);
    }
    const e = pts[pts.length - 1];
    return d + ' L' + e[0] + ' ' + e[1];
  }
  let uid = 0;
  function trace(d, color, opts = {}) {
    const g = document.createElementNS(SVGNS, 'g');
    if (opts.id) g.dataset.id = opts.id;
    if (opts.cls) g.setAttribute('class', opts.cls);
    g.setAttribute('data-color', color);
    g.style.setProperty('--delay', (opts.delay || 0) + 's');
    const id = 'w' + (++uid);
    const mk = (cls, extra = {}) => {
      const p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', d); p.setAttribute('class', cls);
      for (const k in extra) p.setAttribute(k, extra[k]);
      g.appendChild(p); return p;
    };
    mk('w-halo'); mk('w-base', { id });
    if (!mqReduce.matches) {
      mk('w-pulse-halo', { pathLength: 1000 }); mk('w-pulse', { pathLength: 1000 });
      if (opts.spark) {
        const c = document.createElementNS(SVGNS, 'circle');
        c.setAttribute('r', '2.6'); c.setAttribute('class', 'w-spark');
        const am = document.createElementNS(SVGNS, 'animateMotion');
        am.setAttribute('dur', opts.spark + 's'); am.setAttribute('repeatCount', 'indefinite');
        am.setAttribute('begin', (opts.delay || 0) + 's');
        const mp = document.createElementNS(SVGNS, 'mpath');
        mp.setAttribute('href', '#' + id); mp.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#' + id);
        am.appendChild(mp); c.appendChild(am); g.appendChild(c);
      }
    }
    (opts.pads || []).forEach(([x, y]) => {
      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 4); c.setAttribute('class', 'w-pad');
      g.appendChild(c);
    });
    svg.appendChild(g);
  }
  function draw() {
    if (!svg) return;
    const hb = hub.getBoundingClientRect();
    svg.setAttribute('viewBox', '0 0 ' + hb.width.toFixed(0) + ' ' + hb.height.toFixed(0));
    svg.textContent = ''; uid = 0;
    const cr = $('#core .core-chip').getBoundingClientRect();
    const cx = Math.round(cr.left + cr.width / 2 - hb.left), cyB = Math.round(cr.bottom - hb.top), cyT = Math.round(cr.top - hb.top);
    const cl = Math.round(cr.left - hb.left), crt = Math.round(cr.right - hb.left), cym = Math.round(cr.top + cr.height / 2 - hb.top);
    const W = hb.width;
    const nodes = [...document.querySelectorAll('#nodes .node')].filter(a => !a.closest('li').hidden);
    const mobile = mqMobile.matches;

    // Decorative traces from the core out to the edges (circuit-board feel)
    if (!mobile) {
      const deco = [
        [[cl, cym - 30], [cl - 70, cym - 30], [cl - 70, cym - 90], [Math.max(40, cl - 330), cym - 90]],
        [[cl, cym + 20], [cl - 130, cym + 20], [cl - 130, cym + 60], [Math.max(20, cl - 420), cym + 60]],
        [[crt, cym - 30], [crt + 70, cym - 30], [crt + 70, cym - 90], [Math.min(W - 40, crt + 330), cym - 90]],
        [[crt, cym + 20], [crt + 130, cym + 20], [crt + 130, cym + 60], [Math.min(W - 20, crt + 420), cym + 60]],
        [[cx - 40, cyT], [cx - 40, Math.max(6, cyT - 40)]],
        [[cx + 40, cyT], [cx + 40, Math.max(6, cyT - 40)]]
      ];
      deco.forEach((pts, i) => trace(orth(pts), 'violet', { cls: 'deco', delay: i * 0.55, pads: [pts[pts.length - 1]] }));
    }

    nodes.forEach((a, i) => {
      const r = a.getBoundingClientRect();
      const color = a.dataset.color;
      let pts;
      if (mobile) {
        // Left-hand bus: core bottom → down a rail → right into each node's left pad
        const railX = Math.round(r.left - hb.left - 24), ny = Math.round(r.top + r.height / 2 - hb.top), nx = Math.round(r.left - hb.left);
        const sx = cx - 30 + i * 30;
        pts = [[sx, cyB], [sx, cyB + 18 + i * 8], [railX + i * 6 - 6, cyB + 18 + i * 8], [railX + i * 6 - 6, ny], [nx, ny]];
      } else {
        const nx = Math.round(r.left + r.width / 2 - hb.left), ny = Math.round(r.top - hb.top);
        const spread = (i - (nodes.length - 1) / 2) * 22;
        const sx = Math.round(cx + spread);
        const midY = Math.round(cyB + (ny - cyB) * 0.5);
        pts = Math.abs(nx - sx) < 2 ? [[sx, cyB], [sx, ny]] : [[sx, cyB], [sx, midY], [nx, midY], [nx, ny]];
      }
      trace(orth(pts), color, { id: a.dataset.id, delay: i * 0.6, spark: 2.2 + i * 0.35, pads: [pts[0]] });
    });
  }
})();
