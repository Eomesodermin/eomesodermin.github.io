/* Shared behaviour for every page.
   data/site-data.json is refreshed weekly by a GitHub Action (OpenAlex metrics, newer papers,
   repositories). Pages ship static fallback values; this only replaces them when the fetch works. */
(function () {
  const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const ext = (href, txt, cls) => { const a = mk('a', cls, txt); if (/^https:\/\//.test(href)) { a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; } return a; };

  fetch('data/site-data.json', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
    .then(d => {
      const m = d.metrics || {};
      document.querySelectorAll('[data-metric]').forEach(el => { const v = m[el.dataset.metric]; if (Number.isFinite(v)) el.textContent = v.toLocaleString('en-US'); });

      if (d.updated) {
        const t = new Date(d.updated + 'T00:00:00Z');
        if (!isNaN(t)) document.querySelectorAll('[data-updated]').forEach(el => { el.textContent = t.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }); el.setAttribute('datetime', d.updated); });
      }

      const repos = (d.repos || []).filter(r => r && /^https:\/\/github\.com\//.test(r.url || ''));
      document.querySelectorAll('[data-count="repos"]').forEach(el => { if (repos.length) el.textContent = String(repos.length); });

      // code behind the papers
      const paperBody = document.getElementById('paper-code');
      const withPaper = repos.filter(r => r.paper);
      if (paperBody && withPaper.length) {
        paperBody.replaceChildren(...withPaper.map(r => {
          const tr = mk('tr'), repo = mk('td', 'repo'), paper = mk('td'), yr = mk('td', 'yr', String(r.paper.year || ''));
          repo.appendChild(ext(r.url, r.name));
          paper.append(ext(r.paper.doi, r.paper.cite), ' ', mk('span', 'soft', r.paper.journal || ''));
          tr.append(repo, paper, yr); return tr;
        }));
      }
      // tools and current projects
      const toolBody = document.getElementById('tool-code');
      const tools = repos.filter(r => !r.paper);
      if (toolBody && tools.length) {
        toolBody.replaceChildren(...tools.map(r => {
          const tr = mk('tr'), repo = mk('td', 'repo'), desc = mk('td');
          repo.appendChild(ext(r.url, r.name)); if (r.language) repo.appendChild(mk('span', 'lang', r.language));
          desc.textContent = r.description || '';
          tr.append(repo, desc); return tr;
        }));
      }

      // papers newer than the hand-written list
      const latest = document.getElementById('latest');
      if (latest && (d.latest || []).length) {
        const list = latest.querySelector('[data-list]');
        const shown = new Set([...document.querySelectorAll('a.doi')].map(a => a.href.toLowerCase()));
        d.latest.filter(p => p.doi && !shown.has(p.doi.toLowerCase())).forEach(p => {
          const row = mk('div', 'pub'), body = mk('div'), au = mk('p', 'au');
          (p.authors || []).forEach((a, i) => { if (i) au.append(', '); if (a.me) au.appendChild(mk('strong', '', a.name)); else au.append(a.name); });
          if (p.et_al) au.append(', et al.');
          body.append(mk('span', 'badge', 'New'), au, mk('p', 'ti', p.title), mk('p', 've', p.venue + ', ' + p.year));
          row.append(body, ext(p.doi, 'DOI', 'doi'));
          list.appendChild(row);
        });
        if (list.children.length) latest.hidden = false;
      }
    })
    .catch(() => { /* keep the static values in the HTML */ });

  // Analytics: GoatCounter (no cookies, no IP storage). Dashboard: dilloncorvino.goatcounter.com.
  // Changing the code also means changing img-src in each page's Content-Security-Policy.
  // Counts are sent as an image request from this script, so no third-party script is loaded.
  const GC_CODE = 'dilloncorvino';
  if (GC_CODE && location.hostname === 'dilloncorvino.com' && !navigator.webdriver) {
    const count = (path, title, event) => {
      const q = new URLSearchParams({ p: path, t: title, rnd: Math.random().toString(36).slice(2) });
      if (event) q.set('e', 'true'); else if (document.referrer) q.set('r', document.referrer);
      new Image().src = 'https://' + GC_CODE + '.goatcounter.com/count?' + q;
    };
    count(location.pathname, document.title);
    document.addEventListener('click', e => {
      const a = e.target.closest('a, button'); if (!a) return;
      const name = a.matches('a[download]') ? 'cv-download'
        : a.id === 'copy-email' ? 'email-copy'
        : a.matches('a[href^="mailto:"]') ? 'email-click'
        : a.matches('a[href*="linkedin.com"]') ? 'linkedin-click'
        : a.matches('a[href*="scholar.google"]') ? 'scholar-click'
        : a.matches('a[href*="github.com"]') ? 'github-click' : '';
      if (name) count(name, name, true);
    });
  }

  // copy email (contact page)
  const btn = document.getElementById('copy-email');
  if (btn) {
    const fb = document.getElementById('copied'); let timer;
    btn.addEventListener('click', async () => {
      const email = btn.dataset.email;
      try { await navigator.clipboard.writeText(email); } catch (e) { return; }
      fb.classList.add('show'); clearTimeout(timer); timer = setTimeout(() => fb.classList.remove('show'), 2000);
    });
  }
})();
