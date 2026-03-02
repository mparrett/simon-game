<p align="center">
  <img src="simon-logo.png" alt="Simon" width="180">
</p>

# Simon Game

A browser-based Simon memory game. Watch the sequence, repeat it back, and see how far you can go.

**[Play it here](https://mparrett.github.io/simon-game/)**

## Features

- 10 games per session with score tracking (current, average, best)
- Web Audio tones for each color with countdown and timeout sounds
- 6-second response timer with visual countdown
- Balanced color distribution using chunked shuffle bags
- Light and dark mode support

## Development

```bash
npm install
npm run dev       # Start dev server at localhost:5173
npm run build     # Production build
npm run lint      # Run ESLint
```

Deploys automatically to GitHub Pages on push to `main`.
