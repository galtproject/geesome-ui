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
- Use the wrapper scripts for browser coverage instead of calling Playwright directly:
  - `npm run test:e2e`
  - `npm run test:e2e:screens`
  - `npm run test:e2e:screens:debug`
- The e2e wrappers pick an isolated local port and keep screenshot evidence under ignored `.agent/` paths. Do not commit generated screenshots, Playwright reports, Parcel caches, or `dist`.
- This UI stack currently builds and runs e2e reliably under Node 18. Use Node 18 for `npm run build` and e2e verification unless the task is specifically about Node runtime migration. Node 22 can fail before app compilation on legacy native dependencies.

## E2E And Screenshot Review

- For any user-visible UI change, functional checks alone are not enough. Add or update Playwright coverage when the changed surface can be reached with the existing e2e fixture pattern.
- Prefer deterministic component or page fixtures with mocked `$geesome` service calls when a full `geesome-node` backend would make the test slow or brittle. Use real Vue rendering and real user interactions in the browser.
- Screenshot-heavy tests should capture both mobile and desktop viewports for changed screens:
  - mobile: `375x667`
  - desktop: `1280x800`
- Every screenshot capture should also write a JSON sidecar with viewport, headings, broken images, scroll metrics, and horizontal-overflow status.
- Treat these sidecar findings as actionable visual regressions even if Playwright assertions pass:
  - non-empty `brokenImages`
  - `overflowX: true`
  - unexpected non-zero `document.scrollY` after entering a screen
  - missing expected headings or controls for the tested flow
- Include executable assertions for key controls and layout health: controls visible, enabled/disabled at the right time, no horizontal overflow, broken images absent, and critical service-call payloads matching the UI action.
- Keep functional proof and visual proof separate in PR notes. A successful click flow does not prove layout quality unless fresh screenshots and sidecar checks also passed.
- If an e2e fixture needs Parcel, isolate its output with `--dist-dir` and `--cache-dir` under `.agent/` so production `npm run build` cannot accidentally bundle test fixtures into `dist`.
- When reviewing generated screenshots, inspect the `.json` sidecar first, then open the PNG if the sidecar flags anything or if layout/composition changed.

## Safety

- Avoid modernizing toolchain assumptions unless the user explicitly asked for that migration.
- Keep published-package behavior stable unless a breaking change is the requested outcome.
- Update all affected locales when i18n keys change.
