# AGENTS.md

## Project Context

This is a local-first React and Vite application. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for setup and local development commands.

## Key Files

- `src/`: frontend application source.
- `src/api/localClient.js`: browser-local persistence for demands and statuses.
- `vite.config.js`: Vite and React configuration.
- `package.json`: development, validation, and build commands.

## Working Notes

- Use `npm run dev` for local development.
- Data is stored in the browser's `localStorage`; do not introduce a remote backend unless the user explicitly requests one.
- Keep storage migrations backward-compatible when changing persisted record shapes.
- Run the relevant checks from `package.json` before finishing code changes.
- **Design System**: All UI components and screens MUST follow the Shadcn UI standard (`@/components/ui/*`) and Tailwind semantic tokens as detailed in `DESIGN_SYSTEM.md`. Never introduce unstyled raw HTML elements when a Shadcn component is available.
