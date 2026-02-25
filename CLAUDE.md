# CLAUDE.md — Sidwala Household Planner

This file provides AI assistants with a comprehensive guide to the codebase structure, development workflows, and conventions for this project.

---

## Project Overview

**Sidwala Household Planner** is a full-stack household task management web application designed for shared households. It features gamification (points, badges, streaks), multi-user support, recurring tasks, comments, and an activity feed. The UI uses a distinctive pastel design language.

**Tech Stack:**
- **Frontend:** React 18 + Vite (port 5173 in dev, served from port 3000 in production)
- **Backend:** Express.js (Node 20)
- **Database:** PostgreSQL 16
- **Deployment:** Docker + Docker Compose

---

## Repository Structure

```
sidwala-household-planner/
├── client/                    # React Vite frontend
│   ├── src/
│   │   ├── App.jsx            # Root component with React Router setup
│   │   ├── App.css            # Global pastel theme stylesheet (~773 lines)
│   │   ├── main.jsx           # Vite entry point
│   │   ├── api.js             # Centralized API client (fetch wrapper)
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Auth state (user, token, login/logout)
│   │   ├── components/
│   │   │   ├── Layout.jsx       # Sidebar navigation + page wrapper
│   │   │   ├── TaskModal.jsx    # Create/edit task modal form
│   │   │   ├── TaskDetail.jsx   # Task detail panel with comments
│   │   │   ├── Confetti.jsx     # CSS confetti animation on task completion
│   │   │   └── Toast.jsx        # Toast notification system
│   │   └── pages/
│   │       ├── Login.jsx        # Auth page (login form)
│   │       ├── Dashboard.jsx    # Home: stats, activity feed, category chart
│   │       ├── Tasks.jsx        # Task list with filters and CRUD
│   │       ├── Leaderboard.jsx  # User rankings by points
│   │       └── Admin.jsx        # User management (admin only)
│   ├── index.html
│   ├── package.json
│   └── vite.config.js         # Dev proxy: /api -> http://localhost:3000
├── server/                    # Express.js backend
│   ├── index.js               # Server entry point, middleware setup, route mounting
│   ├── db.js                  # PostgreSQL pool + schema initialization
│   ├── auth.js                # JWT middleware (verifyToken)
│   ├── package.json
│   └── routes/
│       ├── auth.js            # POST /login, GET /me, PUT /password
│       ├── users.js           # CRUD /users (admin-gated create/delete)
│       ├── tasks.js           # CRUD /tasks + complete/reopen + comments
│       └── stats.js           # GET /dashboard, /leaderboard, /achievements/:userId
├── init.sql                   # PostgreSQL schema (auto-applied via Docker)
├── Dockerfile                 # Multi-stage: Vite build -> Express production image
├── docker-compose.yml         # App + PostgreSQL orchestration
└── README.md                  # End-user/deployment documentation
```

---

## Development Workflows

### Running Locally (without Docker)

You need a running PostgreSQL instance. Easiest way: start only the database via Docker.

```bash
# 1. Start only the PostgreSQL container
docker compose up db -d

# 2. Backend (port 3000) — in one terminal
cd server
npm install
npm run dev        # uses node --watch for hot reload

# 3. Frontend (port 5173) — in another terminal
cd client
npm install
npm run dev        # Vite dev server with HMR
```

The Vite dev server proxies `/api` requests to `http://localhost:3000` (configured in `vite.config.js`).

### Running with Docker (Production)

```bash
docker compose up --build -d
```

- Application available at `http://localhost:3000`
- PostgreSQL runs internally on port 5432 (not exposed externally by default)
- The `init.sql` schema is applied automatically on first run

### Stopping / Cleanup

```bash
docker compose down          # Stop containers
docker compose down -v       # Stop and remove volumes (wipes database)
```

---

## Environment Variables

All configured in `docker-compose.yml`. For local dev without Docker, set these in your shell or a `.env` file:

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | (constructed from below) | Full PostgreSQL connection string |
| `PGHOST` | `db` | PostgreSQL host |
| `PGPORT` | `5432` | PostgreSQL port |
| `PGDATABASE` | `sidwala` | Database name |
| `PGUSER` | `sidwala` | Database user |
| `PGPASSWORD` | `sidwala_secret_2024` | Database password |
| `JWT_SECRET` | `sidwala-super-secret-jwt-key-change-me` | JWT signing secret — **change in production** |
| `ADMIN_USERNAME` | `admin` | Bootstrapped admin username |
| `ADMIN_PASSWORD` | `admin123` | Bootstrapped admin password — **change in production** |
| `ADMIN_DISPLAY_NAME` | `Admin` | Display name for the admin user |
| `APP_PORT` | `3000` | Port the Express server listens on |
| `NODE_ENV` | `production` | Node environment |

> **Security note:** The defaults are intentionally simple for home use. Change `JWT_SECRET`, `ADMIN_PASSWORD`, and `PGPASSWORD` for any internet-facing deployment.

---

## Database Schema

Managed by `init.sql`, which runs automatically via the Docker entrypoint on first container start.

### Tables

**`users`**
- `id`, `username` (unique), `password_hash`, `display_name`, `avatar_emoji`, `is_admin`
- `points` (total), `streak_days`, `last_activity_date`
- `created_at`, `updated_at`

**`tasks`**
- `id`, `title`, `description`, `category` (enum), `priority` (enum)
- `status` (enum: `todo` | `in_progress` | `done` | `wont_do`)
- `assigned_to` (FK → users), `created_by` (FK → users)
- `due_date`, `completed_at`, `completed_by` (FK → users)
- `recurrence` (enum), `points_value`, `is_recurring`
- `created_at`, `updated_at`

**`comments`** — `id`, `task_id` (FK), `user_id` (FK), `content`, `created_at`

**`activity_log`** — `id`, `user_id` (FK), `action`, `task_id` (FK, nullable), `created_at`

**`achievements`** — `id`, `user_id` (FK), `badge_key` (unique per user), `earned_at`

### Enums

- `task_category`: `cleaning`, `cooking`, `shopping`, `repairs`, `garden`, `laundry`, `pets`, `finance`, `organization`, `errands`, `wellness`, `other`
- `task_priority`: `low`, `medium`, `high`, `urgent`
- `task_status`: `todo`, `in_progress`, `done`, `wont_do`
- `task_recurrence`: `none`, `daily`, `weekly`, `biweekly`, `monthly`

### Database Access Pattern

The backend uses the `pg` library with a connection pool (`server/db.js`). Always use parameterized queries to prevent SQL injection:

```js
// Correct — parameterized
const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);

// Never do this — string interpolation
const result = await pool.query(`SELECT * FROM tasks WHERE id = ${taskId}`);
```

---

## API Reference

All routes are mounted under `/api`. JWT authentication is required for all routes except `POST /api/auth/login`.

Include token in requests: `Authorization: Bearer <token>`

### Auth (`/api/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/login` | None | Login, returns `{ token, user }` |
| GET | `/me` | User | Current user profile |
| PUT | `/password` | User | Change own password |

### Users (`/api/users`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | User | List all users |
| POST | `/` | Admin | Create user |
| PUT | `/:id` | User | Update user (self or admin) |
| DELETE | `/:id` | Admin | Delete user |

### Tasks (`/api/tasks`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | User | List tasks (supports query filters) |
| POST | `/` | User | Create task |
| PUT | `/:id` | User | Update task |
| DELETE | `/:id` | User | Delete task |
| POST | `/:id/complete` | User | Mark complete (awards points/badges/streak) |
| POST | `/:id/reopen` | User | Reopen a completed task |
| GET | `/:id/comments` | User | List comments on task |
| POST | `/:id/comments` | User | Add comment to task |

**Task query filters:** `?status=`, `?category=`, `?priority=`, `?assigned_to=`, `?sort=`

### Stats (`/api/stats`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/dashboard` | User | Stats: task counts, weekly chart, categories, activity |
| GET | `/leaderboard` | User | All users ranked by points |
| GET | `/achievements/:userId` | User | Badges earned by a user |

---

## Frontend Architecture

### Routing (`client/src/App.jsx`)

React Router v6 with protected routes. All routes except `/login` require authentication (checked via `AuthContext`).

```
/          → Dashboard
/tasks     → Tasks
/leaderboard → Leaderboard
/admin     → Admin (admin-only, redirects non-admins)
/login     → Login
```

### Auth Context (`client/src/context/AuthContext.jsx`)

Persists `token` and `user` in `localStorage`. Provides `login(token, user)` and `logout()` functions. Wrap any component that needs auth state with `useAuth()` hook.

### API Client (`client/src/api.js`)

Centralized fetch wrapper that automatically attaches the JWT `Authorization` header from localStorage. **Always use this instead of raw `fetch`** for API calls.

```js
import api from '../api';

const tasks = await api.get('/api/tasks');
const task  = await api.post('/api/tasks', { title: 'Clean kitchen', ... });
```

### Component Conventions

- **Functional components only** — no class components
- **Hooks** for all state and side effects (`useState`, `useEffect`, `useCallback`)
- **PascalCase** filenames for components, **camelCase** for utilities
- Props destructured in function signature
- CSS classes from `App.css` — no CSS modules, no styled-components

### Styling

All styles live in `client/src/App.css`. The design uses CSS custom properties for the pastel theme:

```css
--lavender: #c4b5fd;
--mint: #86efac;
--peach: #fdba74;
--sky: #7dd3fc;
--butter: #fde68a;
--rose: #fda4af;
```

Fonts: **Nunito** (body) and **Quicksand** (headings) from Google Fonts.

Do not introduce CSS-in-JS or external component libraries — keep the flat CSS approach.

---

## Backend Architecture

### Server Entry Point (`server/index.js`)

Sets up Express middleware (CORS, JSON body parsing) and mounts all route files under `/api`. In production, also serves the compiled React static files from `dist/`.

### Auth Middleware (`server/auth.js`)

Exports `verifyToken` middleware. Add it to any route that requires authentication:

```js
const { verifyToken } = require('../auth');
router.get('/protected', verifyToken, async (req, res) => {
  // req.user = { id, username, is_admin, ... }
});
```

### Admin-Only Routes

Check `req.user.is_admin` inside the route handler after `verifyToken`:

```js
router.delete('/:id', verifyToken, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  // ...
});
```

### Error Handling Pattern

All route handlers use `try/catch`. Return JSON error objects consistently:

```js
try {
  // ... business logic
} catch (err) {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
```

### Task Completion Logic (`server/routes/tasks.js`)

The `POST /api/tasks/:id/complete` endpoint runs multiple operations in a **single transaction**:
1. Mark task as `done`, record `completed_at` and `completed_by`
2. Award points to the completing user (based on `points_value`)
3. Update streak (`streak_days`, `last_activity_date`)
4. Check and award badges (11 badge types based on task count, streaks, points)
5. Log to `activity_log`
6. If task is recurring, create the next recurrence instance

Always keep this logic within a database transaction when modifying it.

---

## Gamification System

### Points

Each task has a `points_value` set at creation:

| Value | Label |
|---|---|
| 5 | Quick task |
| 10 | Normal task (default) |
| 20 | Effort task |
| 50 | Big job |
| 100 | Epic task |

### Badges (11 total)

| Key | Emoji | Name | Trigger |
|---|---|---|---|
| `first_step` | 🌱 | First Step | 1 task completed |
| `getting_going` | ⭐ | Getting Going | 5 tasks |
| `task_master` | 🏅 | Task Master | 10 tasks |
| `household_hero` | 🦸 | Household Hero | 25 tasks |
| `legend` | 🏆 | Legend | 50 tasks |
| `centurion` | 💯 | Centurion | 100 tasks |
| `on_fire` | 🔥 | On Fire | 3-day streak |
| `week_warrior` | 💪 | Week Warrior | 7-day streak |
| `unstoppable` | 🚀 | Unstoppable | 30-day streak |
| `point_collector` | 💎 | Point Collector | 100 points |
| `point_hoarder` | 👑 | Point Hoarder | 500 points |

Badge keys in the `achievements` table must exactly match the keys above.

---

## Testing

**There is currently no test infrastructure.** No test framework (Jest, Vitest, etc.) is configured in either `client/package.json` or `server/package.json`.

When adding tests:
- **Frontend:** Use Vitest (already in the Vite ecosystem — minimal setup)
- **Backend:** Use Jest or Node's built-in test runner
- Place test files alongside source files as `*.test.js` / `*.test.jsx`

---

## Key Conventions Summary

| Concern | Convention |
|---|---|
| Component style | Functional components + hooks only |
| CSS | Flat stylesheet (`App.css`), CSS custom properties for theme |
| API calls (frontend) | Use `api.js` wrapper, never raw `fetch` |
| DB queries (backend) | Always parameterized (`$1`, `$2`, …), never string interpolation |
| Auth | JWT bearer token; use `verifyToken` middleware |
| Admin check | `req.user.is_admin` after `verifyToken` |
| Error responses | `res.status(NNN).json({ error: 'message' })` |
| DB transactions | Use for multi-step operations (e.g., task completion) |
| Naming | PascalCase components, camelCase variables/functions |
| No new deps | Prefer existing stack; avoid adding libraries without good reason |

---

## Database Backup & Restore

```bash
# Backup
docker exec sidwala-db pg_dump -U sidwala sidwala > backup.sql

# Restore
docker exec -i sidwala-db psql -U sidwala sidwala < backup.sql
```

---

## Dockerfile Build Process

The `Dockerfile` uses a **multi-stage build**:

1. **Stage 1 (builder):** `node:20-alpine` — installs client deps and runs `vite build`, producing `client/dist/`
2. **Stage 2 (production):** Fresh `node:20-alpine` — copies compiled `dist/` and server source, installs only server deps, runs `node index.js`

The Express server in production serves the React build as static files and handles API routes. No separate web server (Nginx) is needed.
