# Redesign log

The redesign happens on the `redesign` branch. The previous site is tagged `v1-before-redesign`.

## How to go back

- See the old site locally: `git checkout v1-before-redesign` (then `git checkout redesign` to return).
- Undo one change: `git revert <commit>` for the commit listed below.
- Drop the whole redesign: do not merge `redesign` into `main`; `main` still serves the old site.

## Structure

| File | What it is |
|---|---|
| `index.html` | Landing: name, key facts, career trajectory, two branches |
| `experience.html` | Roles, newest first, with papers, code and grants; leadership and funding |
| `computational.html` | Methods, code behind the papers, tools (repos refresh weekly from `data/site-data.json`) |
| `wet-lab.html` | Techniques, immunology focus, cell therapy track record |
| `publications.html` | Selected papers by year; newer papers are added automatically from OpenAlex |
| `contact.html` | Email, links, photo |
| `css/site.css` | All styles (Black + magma, dark only) |
| `js/site.js` | Metrics, last-updated date, repo and paper lists, copy email |
| `js/hero.js` | The landing trajectory animation. Swappable: delete the script tag and the page falls back to a vertical list |

Locked hero settings (2026-11-18): dots sorted by colour (orange to computational biology, red to wet lab), speed 1×, size 1×, 900 dots.

## Changes

| Date | Commit | Change |
|---|---|---|
| 2026-11-18 | (see `git log`) | New landing page, shared stylesheet and scripts |
| 2026-11-18 | (see `git log`) | Detail pages: experience, computational, wet lab, publications, contact |
| 2026-11-18 | (see `git log`) | Weekly data script reads DOIs from `publications.html`; sitemap lists all pages |
