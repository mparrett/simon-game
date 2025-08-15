# Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint (IMPORTANT: Always run before committing)

# Architecture
React Simon Game with single main component `src/components/SimonGame.jsx` containing all game logic. Uses Tailwind CSS + Radix UI components in `src/components/ui/`.

# Key Files
- `SimonGame.jsx` - All game state, sequence logic, and Web Audio API sounds
- `vite.config.js` - Configured for GitHub Pages with `/simon-game/` base path

# Code Style
- Modern React hooks (useState, useEffect, useCallback)
- Tailwind utility classes for styling
- Import UI components from `./ui/` directory