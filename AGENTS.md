# AGENTS.md

Instructions for AI coding agents working in this project.

## What this is

A description of your project and the problem it solves.

## Commands

For a Vite + React (JavaScript) project.

- Dev server: `npm run dev` (http://localhost:5173)
- Build: `npm run build`
- Preview production build: `npm run preview`
- Lint: `npm run lint` (oxlint)

No unit test runner is configured yet. Testing is not a gate until one exists.

## Conventions

- Functional React components only; hooks for state and side effects
- Plain JavaScript (JSX), no TypeScript
- Plain CSS per component, CSS custom properties for theme values, no CSS
  framework installed
- Components: PascalCase filenames (`ItemCard.jsx`); functions: camelCase;
  constants: SCREAMING_SNAKE_CASE
- No commented-out code, no unused imports or variables
- Comment the why, not the what - skip comments that just restate the code
- No em dashes in generated content (docs, comments, commit messages)
