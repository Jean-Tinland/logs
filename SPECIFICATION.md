# Logs App Specification

## 1. Purpose

Provide a standalone, local-first logging application.
The app focuses on quick journaling with plain text, local persistence, and simple operations.

## 2. Product Goals

- Fast daily logging flow.
- Plain local storage that is easy to inspect and back up.
- Reliable and minimal architecture.
- No dependency on external database services.

## 3. Scope

### In Scope

- Password-based login and token validation.
- Create and read logs grouped by day.
- Delete and copy log entries.
- Incremental loading of older days.
- JSON export of all logs.
- Responsive UI for desktop and mobile.

### Out of Scope

- Multi-user accounts and permissions.
- In-app editing of existing logs.
- Realtime collaboration.
- Rich text/markdown formatting.
- Cloud sync.

## 4. Functional Requirements

### FR-1 Authentication

- User authenticates from `/login` using `PASSWORD`.
- Successful login returns a JWT.
- JWT is stored in the `token` cookie client-side.
- Proxy middleware redirects unauthenticated requests to `/login`.

### FR-2 Create Log

- User can submit a text log from the sticky composer.
- Empty content is rejected.
- Supported log kinds: `normal`, `highlight`, `warn`, `danger`.
- Prefix shortcuts in composer input:
  - `n:` => `normal`
  - `h:` => `highlight`
  - `w:` => `warn`
  - `d:` => `danger`

### FR-3 Read Logs

- App displays logs grouped by day.
- Initial page load requests the latest 10 day groups.
- API supports dynamic window size through `days` query.
- Empty days appear as `<Empty>` groups.

### FR-4 Delete Log

- User can delete a log entry after confirmation.
- Delete request must include entry `id` and corresponding `date`.

### FR-5 Copy Log

- User can copy a log's content to clipboard.
- Copy should gracefully fail without breaking UI when clipboard API is unavailable.

### FR-6 Incremental History

- User can load older data by 10-day windows.
- Older groups are prepended to already loaded groups.

### FR-7 Export

- User/system can request full export at `GET /api/logs/export`.
- Response payload includes:
  - `exportedAt`
  - `count`
  - `logs` (newest first)

## 5. Data Model

Storage strategy is file-based JSON, one file per day:

- Path pattern: `contents/logs/YYYY-MM-DD.json`
- File content: JSON array of `LogItem`

`LogItem` shape:

- `id`: number (unique within a day file)
- `kind`: `normal | highlight | warn | danger`
- `content`: string
- `createdAt`: ISO timestamp string
- `updatedAt`: ISO timestamp string

## 6. API Contract

### POST `/api/login`

Request body:

- `password`: string

Responses:

- `200`: `{ token: string }`
- `401`: missing/wrong password
- `500`: missing server auth configuration

### GET `/api/logs`

Query:

- `days`: optional integer, clamped to `1..30`, default `7`
- `reference`: optional `YYYY-MM-DD`
- `q`: optional text search
- `kinds`: optional comma-separated kinds

Response:

- `groups`: day groups
- `meta`: `{ reference, days, oldestDate, nextReference, hasMore }`
- `stats`: `{ total, today, filteredTotal }`

### POST `/api/logs`

Request body:

- `kind`: `normal|highlight|warn|danger`
- `content`: string

Responses:

- `201`: created log item
- `400`: invalid kind or empty content

### DELETE `/api/logs/:id?date=YYYY-MM-DD`

Responses:

- `200`: `{ ok: true }`
- `400`: missing/invalid id or date
- `404`: log not found

### GET `/api/logs/export`

Response:

- JSON attachment with all logs ordered by newest first

## 7. Architecture

### UI Layer

- `src/components/logs/logs.tsx`
- `src/components/logs/journal.tsx`
- `src/components/logs/input-field.tsx`
- `src/components/login-form.tsx`

### API Layer

- `src/app/api/login/route.ts`
- `src/app/api/logs/route.ts`
- `src/app/api/logs/[id]/route.ts`
- `src/app/api/logs/export/route.ts`

### Domain/Data Layer

- `src/lib/logs-repository.ts`: grouped query logic and API-facing operations
- `src/lib/file-logs-repository.ts`: filesystem operations
- `src/types/log.ts`: shared contracts

### Security Layer

- `src/proxy.ts`: route guard/redirect
- `src/services/auth.ts`: token verification

### Runtime

- Node.js runtime is required for filesystem-backed API handlers.

## 8. UX Requirements

- Sticky composer at page bottom.
- Keyboard shortcuts:
  - `Cmd/Ctrl + Enter`: submit current composer content
  - `Cmd + ArrowUp/ArrowDown`: navigate selected log row
  - `C`: copy selected log
  - `D`: delete selected log
- Kind-based visual highlighting for log rows.
- Sober, low-distraction visual style.

## 9. Non-Functional Requirements

- Local-first persistence.
- Simple setup and small codebase.
- Type-safe TypeScript implementation.
- No external database dependency.

## 10. Operational Considerations

- Required env vars:
  - `PASSWORD`
  - `JWT_SECRET`
  - `JWT_DURATION`
- Persistence depends on writable durable filesystem.
- `contents` directory is gitignored by default.

## 11. Migration Notes

- SQLite-era infrastructure and dependencies are removed.
- Storage now relies only on JSON files in `contents/logs`.
- Export behavior now reads directly from filesystem-backed logs.
