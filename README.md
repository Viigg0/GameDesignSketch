# GameDesignSketch

Throwaway gameplay-feel prototypes, built in vanilla JS + Vite, auto-deployed
to GitHub Pages. One index page, one link per prototype.

Live at: **https://viigg0.github.io/GameDesignSketch/** (once Pages is turned
on — see step 2 below).

## One-time setup

1. **Get this into your local clone of the repo.**
   Unzip this into your local `GameDesignSketch` folder (or copy the files in
   if you already have one cloned), then:
   ```bash
   git add .
   git commit -m "Set up Vite + GitHub Pages scaffold"
   git push
   ```
   You'll need Node **20.19+** or **22.12+** installed locally.

2. **Turn on GitHub Pages for this repo.**
   On GitHub: `Settings → Pages → Build and deployment → Source`, set it to
   **GitHub Actions**. This only needs to be done once. After that, every
   push to `main` builds and deploys automatically — the workflow is already
   in `.github/workflows/deploy.yml`.

3. **Open Claude Code in this folder** (`claude` in the terminal, or Claude
   Code Desktop). It reads `CLAUDE.md` automatically and already knows the
   conventions for this repo.

## Local development

```bash
npm install
npm run dev
```

Opens a local dev server. The root page links to every prototype; each
prototype is a normal page with its own console for debugging.

## Adding a new prototype

1. Copy `prototypes/hello-juice/` and rename the folder.
2. Add an entry to `public/prototypes.json` (slug, title, one-line blurb).
3. Iterate with `npm run dev`.
4. `git push` — it's live within a minute or two, no manual deploy step.

You don't need to touch `vite.config.js` — it picks up any folder under
`prototypes/` that has an `index.html`.

## Why it's built this way

- **Vite** gives a fast local dev server and a real browser console for
  debugging — good enough for game-feel iteration, nothing more.
- **No framework.** These prototypes get rebuilt in Unity later; the code
  here is disposable on purpose.
- **The manifest (`public/prototypes.json`)** is the only thing you edit by
  hand to add a prototype to the index — everything else is automatic.
