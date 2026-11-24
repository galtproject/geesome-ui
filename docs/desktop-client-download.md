# Native desktop client downloads

Tracking: #41. The user requested an installation flow that an agent can find from
only the node URL after a recipient was incorrectly given a Firefox web app.
All new setup copy is English.

## Shipped behavior

- Public home and main-menu links open the `desktop-client` router page.
- The root HTML describes the native EXE and includes readable no-JavaScript agent
  guidance plus discovery/fallback metadata. Parcel 2.5 must preserve these as
  runtime API addresses, not resolve them as build-time assets.
- The page uses public fetches with credentials omitted, redirects rejected,
  bounded response size/time, same-origin links and discovered API/gateway prefixes.
  No authenticated service-client method or browser token is used.
- It reads the strict Windows x64 signed-envelope manifest format and offers the
  CID-addressed installer with a versioned `.exe` save filename. It does not claim
  to cryptographically verify that signature in the browser. The HTTPS node is the
  metadata authority; the installation guide explains complete-file and publisher
  verification before execution.
- Copyable agent instructions require the native EXE, local health identity/version,
  local UI, enabled per-user task and Windows Installed Apps entry. A browser web app
  or remote website window is not accepted as installation success. Clipboard denial
  exposes a read-only copy fallback.
- Disabled release capability, unpublished installer and invalid/unavailable discovery
  have explicit states and no guessed artifact/PWA fallback.

## Verification

Use Node 18 for `npm run build` and `npm run test:e2e:screens`.
`npm run test:e2e:screens -- --desktop-client` runs only the focused download suite.
Fixtures use the actual page component and mocked public HTTP endpoints; they check
API/gateway prefixes, no credentials, versioned download attribute, copied instructions,
clipboard fallback and unavailable/unsafe metadata states. Desktop (1280×800) and
mobile (375×667) captures/JSON sidecars are under ignored
`.agent/tasks/desktop-client/screenshots/`.

The dependent node PR must pin this UI commit and deploy both the frontend and
updated installation guide. This change does not require a new client EXE and does
not establish that Windows installation or login persistence was tested.
