@../CLAUDE.md
@AGENTS.md

## Behaviour-first rule (applies everywhere, repeated here for emphasis)

Before writing any frontend code, ask:

> "What should the user see and experience? Describe it step by step."

Write the Playwright test first. Make it fail. Then write the code. See root CLAUDE.md → Testing for the full reasoning.

## Frontend-specific rules

**Supabase clients** — two separate clients, two separate files. `lib/supabase/client.ts` is for browser components (`createBrowserClient`). `lib/supabase/server.ts` is for server components and route handlers (`createServerClient` with cookie handling). Never use the server client in a `"use client"` component — it will throw.

**Auth flow** — Supabase auth is handled entirely through `middleware.ts`. It intercepts every request to `/dashboard/**` and `/settings/**`, checks the session, and redirects to `/auth` if unauthenticated. Do not add auth checks inside individual page components — the middleware is the single gate.

**The `NEXT_PUBLIC_` prefix matters** — only variables prefixed with `NEXT_PUBLIC_` are available in the browser bundle. The API URL, Supabase URL, and publishable key all need it. Never put a secret key in a `NEXT_PUBLIC_` variable.

**Realtime subscription cleanup** — every `useEffect` that opens a Supabase Realtime channel must return a cleanup function that calls `supabase.removeChannel(channel)`. Leaking channels causes duplicate updates and memory issues.

**Access token passing** — the dashboard server component fetches the session server-side and passes `session.access_token` as a prop to `TranscribeForm`. This is intentional — it avoids the client component needing to re-fetch the session just to make an API call.

**Playwright tests** — live in `tests/`. Run with `npx playwright test`. The config in `playwright.config.ts` starts the Next.js dev server automatically. Tests should not depend on specific transcription content — the AssemblyAI call is too slow and non-deterministic for E2E assertions. Test the UI flow up to submission, then assert the pending state appears.
