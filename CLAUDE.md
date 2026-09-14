# GameDesignSketch — conventions for Claude Code

This repo hosts quick, disposable gameplay-feel prototypes. Each one gets thrown
away and reimplemented in Unity later — the code here is not meant to last.

## Ground rules
- Minimal graphics, no sound. Don't spend time on art or audio.
- The only thing worth iterating on is game feel: particle feedback, screenshake,
  timing, weight, responsiveness. Everything else is a placeholder.
- Keep each prototype self-contained in its own folder under `prototypes/`.
- No backend, no database, no persistent state — these are throwaway sketches
  that run entirely in the browser.

## File layout
- `prototypes/<slug>/index.html` + `main.js` (+ anything else that one sketch needs)
- `public/prototypes.json` — the manifest the root landing page reads at runtime.
  Every prototype needs one entry here or it won't show up on the index page.
- `vite.config.js` auto-discovers any folder under `prototypes/` that has an
  `index.html`, so it never needs manual edits when a new sketch is added.

## Adding a new prototype
1. Copy `prototypes/hello-juice/` as a starting point and rename the folder.
2. Add an entry to `public/prototypes.json`: `slug`, `title`, `blurb`.
3. `npm run dev` to iterate locally.
4. Commit and push to `main` — GitHub Actions builds and redeploys
   automatically. There is no manual deploy step.

## Deploy
Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds with
Vite and publishes `dist/` to GitHub Pages. Nothing else to run.
