# Maya Rosenberg - 3D portfolio

Next.js 14, React Three Fiber, GSAP ScrollTrigger, Lenis, Tailwind.

```bash
npm install
npm run scrape   # optional: refresh content from mayarosenberg.co.il (WordPress REST API)
npm run dev
```

- `scripts/scrape-maya.ts` writes `src/data/projects.generated.ts` and `src/data/site-content.generated.ts`.
- The image host sends no CORS headers, so all images are served same-origin via the `/remote/*` rewrite in `next.config.mjs` (required for WebGL textures).
- The source site has no video files, so the data model is image-only.
