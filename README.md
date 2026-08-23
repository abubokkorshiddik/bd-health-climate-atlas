# Bangladesh Health & Climate Atlas

A static, no-backend dashboard: district-level infectious disease trends (2017–2023) alongside climate, land-use and socio-economic data, with a map view and a correlation explorer. Runs entirely in the browser — perfect for GitHub Pages.

## Files
- `index.html` — the page (structure)
- `style.css` — visual design
- `app.js` — dashboard logic (trends chart, map, correlation)
- `data.js` — your spreadsheet data, already converted to JSON and embedded as JS variables (`DATA`, `META`)

No server, database, or build step is needed — it's plain HTML/CSS/JS plus two CDN libraries (Plotly.js for charts, Leaflet.js for the map).

## Publish it on GitHub Pages
1. Create a new GitHub repository (e.g. `bd-health-atlas`).
2. Upload these four files (`index.html`, `style.css`, `app.js`, `data.js`) to the repository root — drag-and-drop on github.com works, or `git add . && git commit -m "dashboard" && git push`.
3. In the repo, go to **Settings → Pages**.
4. Under "Build and deployment", set **Source** to "Deploy from a branch", branch `main`, folder `/ (root)`. Save.
5. Wait ~1 minute, then visit the URL GitHub shows you (usually `https://<your-username>.github.io/bd-health-atlas/`).

That's it — every time you push a change to these files, the live site updates automatically.

## Updating the data later
If you get a new year of data, re-export your spreadsheet to the same column layout and regenerate `data.js` (a short Python/pandas script does this — ask if you want it rebuilt). You don't need to touch `app.js` or `index.html` unless you're adding a new variable category.

## What each tab does
- **Trends** — pick one variable, toggle any number of districts as chips, see a line chart across 2017–2023.
- **Map** — pick a variable and drag the year slider; circle size and colour both scale with the value (teal = low, red = high). Bubble markers are used (there's no district boundary/GeoJSON file), positioned at each district's latitude/longitude.
- **Correlation** — pick an X and Y variable (and optionally restrict to one year) to see a scatter plot, an OLS trend line, and the Pearson correlation coefficient (r) with a plain-language interpretation.
