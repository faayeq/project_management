# PM Standards Comparator (Prototype)

A lightweight static prototype to compare PMBOK 7, PRINCE2, and ISO 21500/21502, with side-by-side topics, insights, and a WBS page. Deep links open the attached PDF via `#page` anchors.

## Structure
- `index.html` – Home + repository listing (loads `data/standards.json`).
- `compare.html` – Three-column comparison by topic (uses `data/comparisons.json`).
- `insights.html` – Summaries of similarities, differences, and unique points (uses `data/insights.json`).
- `wbs.html` – Assignment WBS.
- `styles.css` – Minimal dark theme.
- `script.js`, `compare.js`, `insights.js` – Page logic.
- `data/` – JSON data for repository, comparisons, insights.
- `PM_standards_comparison.pdf` – Consolidated reference PDF.

## How to Run Locally
No server is required if your browser allows `fetch` from `file://`. If your browser blocks local `fetch`, run a tiny static server:

- Python 3: `python -m http.server 8000`
- Node (npx): `npx serve -l 8000`

Then open: `http://localhost:8000/` and navigate to pages.

Notes:
- PDF `#page` anchors are supported by most Chromium-based browsers; some viewers may ignore anchors. If anchors don’t jump, open the PDF and use the page number manually.
- All data is editable in `data/*.json`. Extend topics, pages, and texts as needed.

## License
Educational prototype for coursework; content and standards references remain subject to their respective copyrights.

