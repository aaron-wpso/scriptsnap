# ScriptSnap — CLAUDE.md

## How to work in this project (read this first)

This project follows **agentic engineering**, not vibe coding. The distinction matters and shapes every interaction here.

**Vibe coding** raises the floor — anyone can ship something. Accept all, paste errors back, don't look at the diff. Fine for prototypes, not for this.

**Agentic engineering** preserves the quality bar of professional software while using agents for speed. The engineer owns the spec, the architecture, the taste, and the oversight. The agent handles execution. Karpathy: *"You're still responsible for your software just as before, but can you go faster?"*

---

## The Karpathy Method — rules for this project

These rules come directly from Andrej Karpathy's framework for agentic engineering (Sequoia Ascent 2026, Software 3.0). They are not suggestions.

### 1. Spec before code, always

Before writing anything, the desired behaviour must be described explicitly. Do not infer it. Do not assume from the task name. Ask:

> "What should the user see and experience? Walk me through it step by step."

The spec is the source of truth. Code is just the implementation of the spec. A task that starts with code has no spec and will produce the wrong thing confidently.

### 2. You cannot outsource understanding

Karpathy: *"You can outsource your thinking but you can't outsource your understanding."*

When the agent produces code, the engineer must be able to answer: what does this do, why does it do it this way, what breaks if this assumption is wrong? If you cannot answer those questions, do not ship it.

The agent is an intern. Powerful, fast, sometimes wrong in ways that are hard to spot. You are the senior engineer who reviews and owns everything that goes out.

### 3. Agents are stochastic. Treat them accordingly.

LLMs are *"spiky entities — a bit fallible, a little stochastic, but extremely powerful."* They fly well in familiar territory and crash in unfamiliar domains without warning.

Concrete oversight for this project:
- Review every diff. Do not Accept All.
- Ask: "Is there a unique identifier I should have specified that the agent might have overlooked?"
- Check for silent failures — things that run without errors but do the wrong thing.
- Do not assume the agent understood constraints that weren't in the prompt.

### 4. Behaviour-first testing (spec made executable)

Write a failing Playwright test before writing any implementation. The test encodes the spec. Only when the test fails for the right reason do you write the code to make it pass.

Tests written after implementation test what the code does. Tests written before test what it should do. These are not the same thing.

### 5. The human owns taste, architecture, and judgment

What agents do well: implementation, boilerplate, translation between specs and code.

What the human must own and never delegate:
- The spec (what are we building and why)
- Architectural decisions (schema design, abstraction boundaries)
- Security decisions (what data is exposed, who can access what)
- The judgment call when something looks off

### 6. Context window discipline

Trim ruthlessly. State constraints explicitly. State non-goals explicitly. When writing a spec or prompt structure it as:
- **Goal**: what should exist after this task
- **Constraints**: what must remain true
- **Non-goals**: what this task does not include
- **Success criteria**: how you will verify it is done

---

## Confirmed Behaviour Spec

### 1. First Visit

User opens the app. Immediately redirected to `/auth`. No landing page. Page shows a centered card:
- Title: "Sign in to ScriptSnap"
- Email field
- Password field
- Button: "Sign in"
- Toggle link: "No account? Sign up"

### 2. Auth

**Sign up:** Toggle changes title to "Create account" and button to "Sign up". On submit, button → "Please wait…" disabled. On success → `/dashboard`. No email confirmation step.

**Sign in:** Same flow. On success → `/dashboard`.

**Errors:**
- Wrong password → `"Invalid login credentials"` inline red, button re-enables, fields stay filled
- Duplicate email → `"User already registered"`

**Sign out:** Clicking "Sign out" → immediately redirects to `/auth`.

**Already logged in visiting `/auth`** → redirected to `/dashboard`.

### 3. Dashboard

**Layout:**
- Header: "ScriptSnap" left, "Settings" + "Sign out" right
- Section: "Transcribe a TikTok video" — URL input + "Transcribe" button
- Section: "History" — newest first, or "No transcriptions yet."

**Submit valid TikTok URL:**
1. Button → "Submitting…", disabled
2. On response: button resets, URL field clears
3. History gains new row at top — **Pending** badge (yellow)

**Submit invalid URL:** Inline error: `"Please enter a valid URL."` No row added.

**Backend down:** Inline error: `"Something went wrong. Please try again."` Button re-enables.

**History row — live via Supabase Realtime (no page reload):**
- Pending → yellow
- Processing → blue
- Completed → green
- Failed → red

**Completed row:**
- TikTok URL truncated
- Green "Completed" badge
- Timestamp (e.g. "20 Jun 2026, 3:45 PM")
- "Show transcript" toggle → expands inline scrollable box
- "Copy" button inside box → copies to clipboard → shows "Copied!" for 2 seconds → resets

### 4. Settings

**Layout:** Same header + "← Back to dashboard". Two sections: Account, Telegram.

**Account section:** Shows email, read-only.

**Telegram section — unlinked state — two options:**

**Option A (recommended) — Connect via bot:**
Inline step-by-step guide:
1. Open Telegram and search for `@scriptsnap_bot`
2. Send the command `/link` to the bot
3. Bot replies with a 6-digit code (valid 10 minutes) e.g. `"Your link code: 847291"`
4. Paste the code below

Input: "Enter 6-digit code" + "Link" button.
On submit → "Linking…". On success → linked state.
Invalid/expired code → `"Invalid or expired code. Request a new one from the bot."`

**Option B — Enter Telegram ID manually:**
Collapsible section: "Or link manually" toggle.
Expanded shows:
- Guide: "Open Telegram → search `@userinfobot` → send any message → copy the numeric ID it replies with"
- Number input: "Your Telegram user ID"
- "Link" button

**Telegram section — linked state:**
Green card: "Telegram linked" + username or ID shown + "Unlink" button.
Unlink → returns to unlinked state immediately.

### 5. Mobile Responsiveness

All screens responsive below 640px:
- Auth card: full width with horizontal padding
- Dashboard: URL input and "Transcribe" button stack vertically, button full width
- History rows: URL on first line (truncated), badge + timestamp on second line
- Transcript box: full-screen scrollable, "Copy" button pinned at bottom
- Settings: full-width cards stacked
- Telegram options: Option A full width, Option B collapsible below
- Header: "ScriptSnap" left, only "Sign out" visible on mobile (Settings accessible from main page)

### 6. Telegram Bot

**`/start`:**
> "Welcome to ScriptSnap! Send me a TikTok URL to transcribe it, or use /link to connect your account."

**`/link`:**
> "Your link code: `847291`
> Enter this on scriptsnap.app/settings → Telegram section.
> Expires in 10 minutes."

**Valid TikTok URL (linked user):**
1. Bot replies: `"Got it! Transcribing your video… ⏳"`
2. On complete: sends transcript as plain text
3. If transcript >4000 chars: split into multiple sequential messages

**Valid TikTok URL (unlinked user):**
> "Your Telegram account isn't linked. Visit scriptsnap.app/settings to link it."

**Invalid URL:**
> "Please send a valid TikTok URL."

**Failed transcription:**
> "Transcription failed. Please try again."

### 7. Edge Cases

- New tab while logged in → `/dashboard` directly
- Session expires → next navigation redirects to `/auth`
- History loads on mount, newest first
- `/link` code expires after 10 minutes

---

## What this project is

TikTok URL goes in, transcript comes out. Two trigger surfaces: a web dashboard and a Telegram bot. Both hit the same ASP.NET Core API. Transcriptions are stored per-user in Supabase Postgres and streamed live to the frontend via Supabase Realtime.

## Repo layout

```
ScriptSnap/
├── ScriptSnap.API/       ASP.NET Core .NET 10 — the only backend
└── scriptsnap-web/       Next.js 15 + Tailwind — the only frontend
```

No monorepo tooling. No shared packages. Two independent projects that talk over HTTP.

## Stack decisions (and why — don't undo these without understanding them)

**AssemblyAI over local Whisper** — local Whisper needs 1–2 GB RAM. Railway's cheapest tier doesn't have it. AssemblyAI's free tier covers the expected load. If you switch to local Whisper you need a bigger (more expensive) Railway instance.

**Session pooler, port 5432, never transaction pooler port 6543** — EF Core + Npgsql uses prepared statements. Transaction mode in Supabase's Supavisor does not support prepared statements. The app will fail silently with cryptic errors if you use port 6543. Always use the session pooler string from Supabase → Connect → Session tab.

**JWKS endpoint for JWT, not a shared secret** — Supabase migrated from HS256 (shared secret) to ECC P-256 (asymmetric). We validate tokens by hitting `{supabaseUrl}/auth/v1/.well-known/openid-configuration`. The middleware auto-fetches and caches public keys. There is no `JwtSecret` config anywhere — if you see one, delete it.

**Supabase publishable key, not anon key** — Supabase renamed `anon` to `publishable`. The env var is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Do not use the old `NEXT_PUBLIC_SUPABASE_ANON_KEY` name. The secret key (`sb_secret_...`) is never used in this project.

**Fire-and-forget with IServiceScopeFactory** — transcription is slow (30–60s). The API returns `202 Accepted` immediately and processes in a background `Task.Run`. The background work creates its own DI scope because the request scope (and its DbContext) is gone by then. Do not inject scoped services into the background lambda directly.

**Supabase Realtime for live updates** — the frontend subscribes to `postgres_changes` on the `transcriptions` table filtered by `user_id`. No polling. When the backend writes `status = Completed`, the frontend updates immediately. Do not replace this with polling.

**LinkCode uses Telegram user ID on the bot side** — the `/link` command is handled by the bot which knows the sender's Telegram ID. The code is stored against the Telegram ID. When the web app submits the code, the backend resolves it to a Telegram ID and creates the `telegram_users` row. This means the Telegram identity is proven — the user actually controls that Telegram account.

## Architecture

```
Next.js (Vercel)
  └─ calls ──▶ ASP.NET Core API (Railway) ──▶ yt-dlp (audio download)
                      │                    ──▶ AssemblyAI (transcription)
                      │                    ──▶ Telegram.Bot (webhook handler)
                      └─ reads/writes ──▶ Supabase Postgres (via EF Core)

Browser / Telegram
  └─ auth ──▶ Supabase Auth (ECC P-256 JWT)
  └─ realtime ──▶ Supabase Realtime (postgres_changes)
```

## Secrets — the rules

**Never hardcode a secret in any file that gets committed.**

Local development: `dotnet user-secrets` for the backend, `.env.local` for the frontend. Both are gitignored.

Production: Railway dashboard env vars for the backend, Vercel dashboard env vars for the frontend.

To set backend secrets locally:
```bash
cd ScriptSnap.API
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "postgresql://..."
dotnet user-secrets set "Supabase:Url" "https://your-project.supabase.co"
dotnet user-secrets set "AssemblyAI:ApiKey" "..."
dotnet user-secrets set "AllowedOrigins:0" "http://localhost:3000"
```

To set frontend secrets locally: copy `scriptsnap-web/.env.local.example` to `scriptsnap-web/.env.local` and fill in values.

## Running locally

Prerequisites: .NET 10 SDK, Node.js 18+, `winget install yt-dlp`, `winget install ffmpeg`

```bash
# Backend — http://localhost:5016
cd ScriptSnap.API && dotnet run --launch-profile http

# Frontend — http://localhost:3000
cd scriptsnap-web && npm run dev

# Tests
cd scriptsnap-web && npx playwright test
```

Telegram bot skipped locally unless `Telegram:BotToken` is set. Use ngrok if needed.

## EF Core migrations

```bash
cd ScriptSnap.API
dotnet ef migrations add <MigrationName>
```

Production migrations run automatically on startup via `db.Database.MigrateAsync()`.

## Supabase setup (one-time)

Run `supabase-setup.sql` in SQL Editor. Without it: Realtime is silent, users see each other's data.

## Testing

Playwright in `scriptsnap-web/`. Tests are the spec made executable — write them before implementation.

```bash
npx playwright test        # headless
npx playwright test --ui   # interactive
```

Backend must be running on port 5016. Do not assert on transcript text. Do not mock the API.

## Code conventions

Endpoints in `Endpoints/` as static `Map*Endpoints` methods. No controllers. Services in `Services/`, interface in the same file. Frontend: `"use client"` only when needed. Comments only for non-obvious WHY.
