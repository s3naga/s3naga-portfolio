# S3NAGA — Daniel Osesenaga, filmmaker

Personal portfolio. Plain static site: no build step.

```
index.html          page
css/style.css       all styles
js/main.js          scroll, intro, cursor, page timeline, grade slider, hire form
js/reel.js          Vimeo reel (one player + film strip)
js/vendor/          GSAP, ScrollTrigger, Lenis (vendored, no CDN)
fonts/              Anton, Lato, Fraunces, IBM Plex Mono (self-hosted)
assets/             hero video, poster, stills, grade frames, logo
_headers            cache rules (Cloudflare Pages / Netlify)
```

## Edit common things
- **Films in the reel** — `index.html`, the `.reel-item` buttons (`data-id` = Vimeo ID).
- **Log → grade frames** — put `gX-log.jpg` + `gX-grade.jpg` in `assets/grade/`, add a `.gf` button with `data-key="gX"` and `data-ratio="width/height"`.
- **Stills** — `assets/stills/`, `<figure>` blocks in the Stills section.
- **Filmography** — `.filmo-row` links (`data-yt` = YouTube ID for the hover preview).

## Preview locally
```
python3 -m http.server 8000
```
then open http://localhost:8000 (the Vimeo player needs a real server, not a double-clicked file).

## Deploy
Every push to `main` goes live when the repo is connected to Cloudflare Pages
(build command: none, output directory: `/`). Custom domain: Pages → Custom domains.
