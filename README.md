# ACRA — AI Code Review Assistant

Full-stack app for automated code review: users paste code or upload a source
file, the backend runs a two-stage pipeline (static analysis → AI review) and
serves findings, complexity metrics, and a score in a dashboard.

**Stack:** Next.js + Tailwind · Node.js/Express · PostgreSQL · JWT auth

# Demo

![ACRA demo — submitting code and receiving a two-stage review](demo/demo.gif)

▶ [Full demo video with narration on Google Drive](https://drive.google.com/your-link-here)

- [x] Monorepo, PostgreSQL schema + migrations runner, JWT auth (register/login/profile/forgot-password)
- [x] Dashboard, paste + file submission (Multer, 100KB cap, language inference), async review pipeline (202 + polling)
- [x] Static analyzers — ESLint via Node API (JS), Pylint via subprocess (Python)
- [x] Findings UI — severity badges, static/ai tabs, flagged-line highlighting, 0–100 scoring
- [x] AI review stage — LLM returns structured JSON findings; degrades gracefully when no API key is set
- [x] Complexity metrics — cyclomatic complexity, per-function average, max nesting depth
- [x] AI documentation generation (`POST /api/reviews/:id/docs` + dashboard button)
- [x] Review history with search, language/severity filters, pagination, delete
- [x] Jest + Supertest integration tests (9 tests: auth, validation, submissions, ownership)
- [x] Docker support (`docker-compose up` runs Postgres + server with pylint baked in)
- [x] API documentation (docs/API.md), deployment guide below

GitHub repository import is out of scope per the project brief.

## Local setup

Prereqs: Node 18+, PostgreSQL 14+, Python 3 with pylint (`pip install pylint`) for Python analysis.

```bash
# 1) Database
createdb acra

# 2) Backend
cd server
cp .env.example .env        # set DATABASE_URL + JWT_SECRET
npm install
npm run migrate
npm run dev                 # http://localhost:5000

# 3) Frontend (files in client/ drop into a create-next-app scaffold)
cd ../client
npx create-next-app@latest . --tailwind --eslint --app --no-src-dir   # if starting fresh
npm run dev                 # http://localhost:3000
```

Set `NEXT_PUBLIC_API_URL` in `client/.env.local` if the API isn't on :5000.

## Architecture

```
Next.js (client) ──REST──▶ Express (server) ──▶ PostgreSQL
                              │
                              └─ async review pipeline
                                 ├─ stage 1: static analyzers (per-language strategy)
                                 └─ stage 2: LLM review (structured JSON findings)
```

A review request returns `202` immediately with `status: pending`; the client
polls `GET /api/reviews/:id` every 2.5s until `completed` or `failed`. This
keeps long analyzer + LLM runs off the request/response path.

## API

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | /api/auth/register | – | Create account, returns JWT |
| POST | /api/auth/login | – | Login, returns JWT |
| GET / PATCH | /api/auth/me | ✓ | Profile read / update |
| POST | /api/auth/forgot-password | – | Reset stub (email delivery stubbed) |
| POST | /api/submissions | ✓ | Paste (JSON) or file (multipart `file`) |
| POST | /api/submissions/:id/reviews | ✓ | Start review → 202 |
| GET | /api/reviews | ✓ | History: `?search&language&severity&page&limit` |
| GET | /api/reviews/:id | ✓ | Full review + findings (poll target) |
| DELETE | /api/reviews/:id | ✓ | Delete own review |

All errors: `{ "error": { "code", "message" } }`. Every query is scoped by
`user_id` (no cross-user access by ID guessing).

## AI review stage

Set `ANTHROPIC_API_KEY` in `server/.env` to enable stage 2 (AI findings, AI summary,
and documentation generation). Without a key, reviews still complete with static
analysis, complexity metrics, and scoring — the summary notes that AI was skipped.
Model is configurable via `AI_MODEL` (defaults to a fast, low-cost model).

## Run with Docker

```bash
docker compose up --build     # Postgres + API on :5000 (pylint included in the image)
cd webapp && npm run dev      # frontend on :3000
```

## Deployment

- **Server → Render**: root directory `server`, build `npm install && pip install pylint`,
  start `npm run migrate && node src/server.js`, env vars from `.env.example` + a managed Postgres URL.
- **Client → Vercel**: root directory of the Next.js app, env `NEXT_PUBLIC_API_URL=<render-url>`.
- **DB**: Render managed PostgreSQL or Supabase (the pool auto-enables SSL for those hosts).

## Testing

```bash
cd server && npm test         # 9 integration tests (requires a running PostgreSQL)
```

## License

MIT — see [LICENSE](LICENSE).
