import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { readdirSync, existsSync } from 'node:fs'

// GitHub Pages serves this repo from /GameDesignSketch/, not from the domain root.
// If you rename the repo, update this to match.
const BASE = '/GameDesignSketch/'

const rootDir = process.cwd()
const prototypesDir = resolve(rootDir, 'prototypes')

// Every folder under /prototypes with an index.html automatically becomes
// its own page in the build — no need to hand-edit this file each time
// you add a sketch.
function getPrototypeEntries() {
  const entries = {}
  if (existsSync(prototypesDir)) {
    for (const name of readdirSync(prototypesDir)) {
      const htmlPath = resolve(prototypesDir, name, 'index.html')
      if (existsSync(htmlPath)) {
        entries[name] = htmlPath
      }
    }
  }
  return entries
}

export default defineConfig({
  base: BASE,
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        ...getPrototypeEntries(),
      },
    },
  },
})
