# SmartPrompt AI — product site

Static site for **SmartPrompt AI**, a Windows desktop assistant that captures
the conversation, transcribes it locally with whisper.cpp, detects the
question and drafts an answer with Ollama.

Live site: <https://dietherfernandez.github.io/smartprompt--ai-site/>

## What is here

| Path | Purpose |
|---|---|
| `index.html` | The whole page. Plain semantic HTML, no framework. |
| `assets/styles.css` | The design system. The palette matches the desktop application theme. |
| `assets/site.js` | Scroll reveal, sticky header state and the trial request form. |
| `assets/app-*.png` | Real captures of the running application. |
| `assets/favicon.svg` | The product mark. |

## Rules for changes

- The site stays static: no build step, no bundler, no dependencies.
- Icons are inline SVG. No emoji, no icon fonts.
- The screenshots are real. Re-capture them from the application rather than
  mocking them up.
- There is no download link for the application. Trial requests are composed
  as a message to the maintainer's address.
- Motion is limited to one scroll reveal and it must respect
  `prefers-reduced-motion`.

## Recapturing the screenshots

The application runs on Windows. `tools/capture-window.ps1` prints a single
window with `PrintWindow` so the result carries no desktop clutter:

```powershell
.\tools\capture-window.ps1 -Title "SmartPrompt AI" -OutFile assets\app-overlay.png
.\tools\capture-window.ps1 -Title "SmartPrompt AI — Workspace" -OutFile assets\app-workspace.png -SelectNav "Models & Providers"
```

## Local preview

```powershell
python -m http.server 8099 --bind 127.0.0.1
# then open http://127.0.0.1:8099/
```

## Publishing

The site is served from the `gh-pages` branch of the public
`smartprompt--ai-site` repository. The application source repositories stay
private, because GitHub Pages cannot be enabled for a private repository on
the free plan.
