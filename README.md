# Sushmit Gujar — Portfolio

Static site (plain HTML/CSS/JS, no build step). Deploy with GitHub Pages from the repo root.

After deploying, consider replacing the relative `og:image` / `twitter:image` / JSON-LD `image` paths in `index.html` with absolute URLs (e.g. `https://<user>.github.io/assets/og.png`) so link previews render everywhere, and add `<link rel="canonical">`.

## Open-source lab (`/projects/`)

`projects/index.html` is a neon "circuit map" showcase of the open-source projects (live at https://sushmit-gujar.github.io/projects/). It is plain HTML/CSS/JS (`lab.css`, `lab.js`, ~50 KB total, no libraries) and is rendered entirely from **`projects/projects.json`**.

### Adding a project

Append an object to the `projects` array in `projects/projects.json`. Its node, wire, panel, stats and pipeline are generated automatically:

```json
{
  "id": "my-project",                 // used for the #anchor and wire id
  "name": "my-project",
  "category": "security",             // security | rag | data — must match an id in "categories" (add a new category there if needed)
  "color": "cyan",                    // cyan | magenta | lime | violet | amber | blue
  "tagline": "One-line description",
  "pitch": "Two or three sentences.",
  "highlights": ["Bullet", "Bullet"],
  "stats": [
    { "value": 98.5, "decimals": 1, "prefix": "~", "suffix": "%", "label": "what it measures", "note": "optional context" }
  ],
  "pipeline": [
    { "label": "Input", "sub": "short detail" },
    { "label": "Fan-out stage", "branches": ["A", "B", "C"] },
    { "label": "Output", "sub": "short detail" }
  ],
  "stack": ["Python", "..."],
  "links": [
    { "label": "GitHub repo", "url": "https://github.com/sushmit-gujar/my-project", "primary": true },
    { "label": "Live demo", "url": "https://..." }
  ]
}
```

The first stat also appears on the project's node in the circuit map. Only use numbers from reproducible, committed results. Category filters are built from `categories` (a category with no projects is hidden). The page respects `prefers-reduced-motion`: no flicker, pulses or counters, just a static glow. Also add a matching card to the `#projects` section of `index.html` (set `data-neon="cyan|lime|magenta|amber|blue"` on the `<article>`).
