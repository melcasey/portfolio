# Mel Casey — Personal Portfolio

A fast, single-page portfolio built with [Astro](https://astro.build), matching the Figma desktop design.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321).

## Build & preview

```bash
npm run build
npm run preview
```

## Project structure

- `src/pages/index.astro` — single scroll page
- `src/components/` — Header, Hero, ProjectCard, About, Footer
- `src/styles/global.css` — design tokens and layout
- `src/scripts/effects.ts` — smooth scroll, scroll reveal, carousel hint
- `public/images/` — exported Figma assets

## Deployment (later)

When ready, deploy the `dist/` folder to GitHub Pages or Netlify with a custom domain. Set `site` in `astro.config.mjs` to your domain for canonical URLs.

## Updating content

- **Project cards** — edit props in `src/pages/index.astro`
- **About / Experience** — edit `src/components/About.astro`
- **Contact links** — edit `src/components/Footer.astro` (Email, LinkedIn, ADPList URLs are placeholders)
