# ACRA API Reference

Base URL: `http://localhost:5000/api` (or your deployed server URL).
All protected routes require `Authorization: Bearer <jwt>`.
Errors always return `{ "error": { "code": string, "message": string } }`.

## Auth

### POST /auth/register
Body: `{ "name", "email", "password" }` (password ≥ 8 chars)
`201 → { user: { id, name, email, created_at }, token }`
`409 EMAIL_EXISTS` · `400 VALIDATION`

### POST /auth/login
Body: `{ "email", "password" }`
`200 → { user, token }` · `401 INVALID_CREDENTIALS`

### GET /auth/me  (auth)
`200 → { id, name, email, created_at }`

### PATCH /auth/me  (auth)
Body: `{ "name"?, "password"? }`
`200 → { user }`

### POST /auth/forgot-password
Body: `{ "email" }` — always `200` (email delivery is stubbed; token logged server-side in dev).

## Submissions

### POST /submissions  (auth)
Paste — JSON body: `{ "title", "language": "javascript"|"python", "code" }`
File — multipart with field `file` (.js/.jsx/.mjs/.py, ≤ 100 KB); `title` optional, language inferred from extension.
`201 → { submission: { id, title, source_type, language, file_name, created_at } }`
`400 UNSUPPORTED_LANGUAGE | FILE_TOO_LARGE | VALIDATION`

### POST /submissions/:id/reviews  (auth)
Starts the asynchronous two-stage review pipeline.
`202 → { review: { id, status: "pending" } }` — poll GET /reviews/:id until completed/failed.

## Reviews

### GET /reviews  (auth)
Query: `search`, `language`, `severity`, `page` (default 1), `limit` (default 10, max 50)
`200 → { reviews: [{ id, status, overall_score, title, language, created_at, error_count, warning_count }], total, page, limit }`

### GET /reviews/:id  (auth)
`200 → { review: { id, status, overall_score, summary, metrics, error_message, generated_docs, created_at, completed_at, submission: { id, title, language, code, file_name }, findings: [{ id, stage: "static"|"ai", severity, category, rule, issue, explanation, suggested_fix, line_number, column_number }] } }`
Metrics include: `loc`, `total_lines`, `functions`, `classes`, `cyclomatic_complexity`, `avg_complexity_per_function`, `max_nesting_depth`, `longest_line`.

### POST /reviews/:id/docs  (auth)
Generates documented code via the AI model, stores and returns it.
`200 → { generated_docs }` · `503 AI_DISABLED` when no AI key is configured.

### DELETE /reviews/:id  (auth)
`204` · `404 NOT_FOUND` (also returned for reviews owned by other users)

## Scoring

`score = max(0, 100 − Σ penalties)` where critical=25, error=10, warning=4, info=1,
summed over static + AI findings. Transparent and reproducible by design.
