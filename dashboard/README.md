# Calmutopia Admin Dashboard

A React + Vite + TypeScript + Tailwind admin dashboard for the Calmutopia
server. It authenticates against the server's admin API and visualizes users,
sessions, self-analyses, homework, and a live activity feed. The design mirrors
the WatchOver dashboard (indigo `#4f46e5` brand, card/`btn`/`nav` utilities,
Recharts).

## Setup

```bash
cd dashboard
npm install
cp .env.example .env   # optional — defaults to the production API
npm run dev            # http://localhost:5180
```

By default the dashboard talks to the production API
(`http://91.99.194.149:3900`). To point at a local server, set `VITE_API_BASE`
in `.env`:

```
VITE_API_BASE=http://localhost:3900
```

## Auth

Sign in with the admin credentials configured on the server via the
`ADMIN_EMAIL` / `ADMIN_PASSWORD` environment variables (see
`server/.env.example`). The dashboard stores the issued JWT in `localStorage`
and sends it as a `Bearer` token on every request.

## Server endpoints used

All under `/api/admin` (added in `server/admin.js`):

| Method | Path                | Purpose                              |
| ------ | ------------------- | ------------------------------------ |
| POST   | `/login`            | Exchange email+password for a token  |
| GET    | `/me`               | Validate the current token           |
| GET    | `/overview`         | KPIs, breakdowns, 30-day trend       |
| GET    | `/users`            | User list (supports `?q=` search)    |
| GET    | `/users/:userId`    | Full profile + homework + transcript |
| GET    | `/activity`         | Activity feed (`?limit=`)            |

## Build

```bash
npm run build     # type-checks then builds to dist/
npm run preview   # serve the production build
```
