# Study Dost AI — Frontend (Static Site)

> By **Sami Ahraf Nirob**

Pure HTML / CSS / JS. No build step. Drop these files onto any static host
(Netlify, Vercel, GitHub Pages, your cPanel, an S3 bucket, or `public_html`
on shared hosting) and you're done.

## Files

```
frontend/
├── index.html
├── styles.css
├── app.js
├── config.js   # ← edit this with your backend URL
└── README.md
```

## 1. Point it at your backend

Open `config.js` and edit:

```js
window.CC_CONFIG = {
  API_BASE: "https://api.yourdomain.com",   // FastAPI backend on your RDP
  API_KEY:  ""                              // optional shared secret
};
```

If your backend `.env` has `APP_API_KEY` set, paste the same value into
`API_KEY` so the frontend can authenticate.

## 2. Test locally

Don't open `index.html` with `file://` — browsers block CORS that way.
Serve it instead:

```powershell
cd frontend
python -m http.server 5500
# open http://localhost:5500
```

Make sure the backend is running (default `http://localhost:8000`) and that
its `ALLOWED_ORIGINS` includes `http://localhost:5500` (or use `*` while testing).

## 3. Host on your website

Upload the four files (`index.html`, `styles.css`, `app.js`, `config.js`)
to wherever your site lives, e.g. `https://yourdomain.com/clarity/`.

### Embed inside an existing site

You have three good options:

1. **Standalone subpath**: drop the folder into `/clarity/` and link to it
   from your nav. Cleanest option.
2. **`<iframe>`**: embed the page anywhere with:
   ```html
   <iframe src="/clarity/index.html" style="width:100%;height:100vh;border:0"></iframe>
   ```
3. **Inline**: copy the contents of `<body>`, `styles.css`, and `app.js`
   into your existing page. The CSS is namespaced under `.cc-` classes so
   it won't clash with your site styles.

## Important: HTTPS / mixed content

If your website is `https://`, your backend **must** be `https://` too,
or the browser will refuse to call it. The recommended setup:

- Frontend: `https://yourdomain.com/clarity/`
- Backend:  `https://api.yourdomain.com/` (Caddy or Nginx in front of FastAPI)

See `backend/README.md` for a Caddy snippet.

## Features

### Core
- Three styled explanation cards (step-by-step, analogy, visual cue)
- 🔄 **Explain Even Simpler** — re-explains like you're 10
- 🎯 **Practice Problem** — Easy / Medium / Hard, with attempt textbox + reveal answer
- 🧒 Encouraging feedback after each explanation

### Rich content rendering
- **Markdown**: bold, italic, lists, code fences
- **LaTeX math** via KaTeX (`$x^2$` inline, `$$\\frac{a}{b}$$` display)
- **Code highlighting** for CS questions via highlight.js
- All loaded from CDN — no build step

### Gamification
- ⚡ **XP & Levels** — earn XP for asking, simplifying, practicing, favoriting
- 🔥 **Daily Streak** counter
- 🏅 **10 Badges** to unlock (First Question, Centurion, Polymath, Legendary, …)
- 🎉 **Confetti** on level-ups, badge unlocks, and correct practice
- 🤖 **Animated mascot** 🧠 that reacts (idle / thinking / celebrate)
- 🍞 **Achievement toasts** sliding in from the corner
- � Stats panel: level, XP bar, streak, total concepts, practice count

### Fun & accessibility
- 🎨 **5 themes**: Midnight · Galaxy · Sunset · Forest · Daylight (one-click switch)
- 🔊 **Text-to-speech** play button on every card
- � **Voice input** via Web Speech API (where supported)
- 🎲 **Surprise me** button + suggestion chips with random STEM questions
- ⭐ **Favorites** tab — star explanations to keep forever
- 📋 Copy-to-clipboard on each card

### Quality of life
- Session history persisted in `localStorage`
- Card entrance animations & rotating fun-fact loading state
- Responsive: hamburger menu on mobile
- `Ctrl/Cmd+Enter` to submit, `Esc` to close sidebar
- Honors `prefers-reduced-motion`
