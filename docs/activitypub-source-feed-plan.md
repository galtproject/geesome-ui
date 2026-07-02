# ActivityPub Source Feed Plan

## Goal

Add a user-facing ActivityPub section where operators can subscribe to remote ActivityPub sources and read new posts in a feed-style view. The first preset should support the official Bluesky account through Bridgy Fed, not direct ATProto, because Bluesky itself is not ActivityPub.

This is separate from the current group ActivityPub review screen. The review screen is moderation/admin tooling for cached remote objects in a specific group. The new section should feel like a reader: source list, subscription state, chronological feed, refresh, unread/new item state, and safe post rendering.

## Product Shape

- Add a top-level ActivityPub/Sources entry in the app navigation for users with the relevant admin/read permission.
- Show a source sidebar/list with actor avatar, name, handle, origin domain, subscription status, last refresh time, unread count, and error state.
- Provide an add-source flow that accepts an ActivityPub handle or actor URL. For the Bluesky official account preset, label it as `@bsky.app via Bridgy Fed` and resolve through `acct:bsky.app@bsky.brid.gy` unless the backend says otherwise.
- Show a feed view ordered by remote `publishedAt` plus a stable local id tie-breaker. Feed cards should show source identity, content text/rich text, safe links, attachment previews according to backend `embedPolicy`, post time, remote URL, and import/review state where relevant.
- Include refresh and unsubscribe controls. Refresh should show in-progress, success, skipped, and error states without blocking the rest of the page.
- Keep the mobile layout single-column with source selector tabs/sheets; keep desktop as source list plus feed. Do not hide source status or errors on mobile.

## Backend Contract Needed

The UI should not scrape existing remote-object review routes directly. `geesome-node` should expose source-oriented APIs that can be backed by the existing ActivityPub actor/object/follow cache:

- Resolve source handle/actor URL, returning actor identity, inbox/outbox/shared inbox metadata, bridge/provider hints, and whether the source can be followed or polled.
- List, add, refresh, and remove subscriptions. Subscription rows need status (`pending`, `active`, `paused`, `error`), source actor identity, optional local actor/group binding, timestamps, unread counters, and last error.
- List feed items by subscription/source with cursor pagination. Feed item DTOs should include sanitized `contentText`, `contentHtml` only when safe for adapter rendering, canonical `contentRichText` when available, bounded attachment metadata, `embedPolicy`, remote object URL, published time, local review/import state, and source actor summary.
- Support a safe initial path for Bridgy Fed ActivityPub sources such as the official Bluesky account. Direct Bluesky/ATProto import or cross-posting should stay a separate backend module/driver.

## Safety

- Never render raw remote HTML directly. Use escaped text or sanitized/canonical rich-text output from the backend.
- Treat remote images/links as untrusted. Show only metadata and previews that satisfy backend policy; unsupported attachments should remain external links/provenance.
- Keep source subscription/following separate from publishing or importing a GeeSome post. Reading a source feed should not bypass review gates or create native posts unless the backend exposes an explicit action.
- Keep bridge failures honest. If a Bluesky account is not Bridgy-enabled or has no bridge-visible public content, show a clear source error/empty state instead of fake feed success.

## E2E Coverage

Add `tests/e2e/activitypub-sources.spec.js` when the UI lands. The fixture should mock `$geesome` service calls rather than requiring a live `geesome-node` server:

- Start from the ActivityPub Sources navigation item and verify the section heading, add-source control, source list, and feed container.
- Add/select the `@bsky.app via Bridgy Fed` preset, assert the subscribe call payload, and show the resulting active source.
- Render a feed with at least one safe rich-text post, one external link, one media/document attachment governed by `embedPolicy`, and one unread/new indicator.
- Verify refresh, unsubscribe/pause, loading, empty, and error states.
- Assert unsafe HTML from mocked feed content is escaped or absent.
- Capture mobile `375x667` and desktop `1280x800` screenshots through the existing screenshot helper. Check JSON sidecars for no broken images, no horizontal overflow, expected headings/controls, and stable scroll position.

Keep generated screenshots, sidecars, Parcel caches, Playwright reports, and `dist` out of Git.
