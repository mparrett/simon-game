# Key Facts

## Architecture
- Single-component React app: `src/components/SimonGame.jsx`
- UI: Tailwind CSS + Radix UI components in `src/components/ui/`
- Audio: Web Audio API (singleton AudioContext)
- Build: Vite, configured for GitHub Pages at `/simon-game/`

## Game Rules
- 10 games per session
- Win condition: 20-step sequence
- 6-second timer per player turn (flashes at 3s)
