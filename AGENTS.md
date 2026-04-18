# AGENTS

## Scope

These instructions are repo-specific. Follow them when working inside `/Users/microwavedev/workspace/microwave-hub/geesome-ui`.

## Project Shape

- `geesome-ui` is the older packaged frontend layer published as `@geesome/ui`.
- The repo uses Vue 2 and Parcel-era build tooling.
- Main surfaces:
  - `src/` for shared UI logic and services
  - `assets/` for packaged assets
  - `locale/` for translations

## Workflow

- Use `yarn install` for dependency setup.
- Prefer `npm run build` as the verification command when changing shipped UI code or packaging behavior.
- Treat service-layer changes as shared-contract changes and review `geesome-node` impact before calling the task complete.

## Safety

- Avoid modernizing toolchain assumptions unless the user explicitly asked for that migration.
- Keep published-package behavior stable unless a breaking change is the requested outcome.
- Update all affected locales when i18n keys change.
