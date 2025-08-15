# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Vite
- `npm run build` - Build for production
- `npm run lint` - Run ESLint to check code quality
- `npm run preview` - Preview production build locally

## Project Architecture

This is a React-based Simon Game built with Vite, using modern React patterns and Tailwind CSS for styling.

### Key Components
- **SimonGame.jsx** - Main game component containing all game logic, state management, and UI
- **UI Components** - Shadcn/ui-style components in `src/components/ui/` (alert, button, card)
- **App.jsx** - Simple wrapper that renders the SimonGame component

### Game Logic Architecture
The Simon Game uses React hooks for state management:
- Game sequence generation and validation
- Player input tracking with immediate feedback
- Audio synthesis using Web Audio API for button sounds
- Game session management (10 games max per session)
- Score tracking and game history

### Styling
- Tailwind CSS for utility-first styling
- Radix UI components for accessible UI primitives
- Custom color mapping for game buttons (red, blue, green, yellow)
- Dark mode support built into the layout

### Deployment
- Configured for GitHub Pages deployment with base path `/simon-game/`
- Vite handles bundling and optimization