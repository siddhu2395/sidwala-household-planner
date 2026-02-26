# 🏠 Sidwala Household Planner

A fun, pastel-themed household task management app for families. Built to run on a Mac Mini (or any Docker host) so everyone in the household can create, assign, and complete tasks together.

![Stack](https://img.shields.io/badge/React-18-blue) ![Stack](https://img.shields.io/badge/Express-4-green) ![Stack](https://img.shields.io/badge/PostgreSQL-16-blue) ![Stack](https://img.shields.io/badge/Docker-Compose-blue)

## ✨ Features

- **Task Management** — Create, assign, edit, and complete household tasks
- **Categories** — 12 categories with fun emojis (🧹 Cleaning, 🍳 Cooking, 🛒 Shopping, 🔧 Repairs, etc.)
- **Priority Levels** — Low, Medium, High, and Urgent with color-coded badges
- **Recurring Tasks** — Set tasks to repeat daily, weekly, bi-weekly, or monthly
- **Points & Gamification** — Earn points for completing tasks, compete on the leaderboard
- **Achievement Badges** — Unlock badges like 🌱 First Step, 🏅 Task Master, 🚀 Unstoppable
- **Streak Tracking** — Track consecutive days of task completion 🔥
- **Comments** — Discuss tasks with comments
- **Activity Feed** — See what everyone has been doing
- **Multi-User** — Admin creates accounts, everyone logs in with their own credentials
- **Responsive** — Works beautifully on desktop and mobile
- **Fun Pastel Theme** — Lavender, mint, peach, and sky blue color palette

## 🚀 Quick Start (Docker)

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)

### 1. Clone or copy the project
```bash
cd sidwala-household-planner
```

### 2. Configure environment (optional)
Edit `.env` to customize passwords and settings:
```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_DISPLAY_NAME=Admin
JWT_SECRET=change-this-to-something-random
```

### 3. Build and start
```bash
docker compose up --build -d
```

### 4. Open in browser
Visit **http://localhost:8080** (or your Mac Mini's IP address on the local network)

### 5. Login
- **Username:** `admin`
- **Password:** `admin123`

Then go to the Admin panel to create accounts for household members!

## 🖥️ Deploying on Mac Mini

### Access from other devices on your network
1. Find your Mac Mini's local IP: `ifconfig | grep "inet "` (look for something like `192.168.1.x`)
2. Other devices on the same Wi-Fi can access: `http://192.168.1.x:8080`

> **Custom port:** Override the host port at any time with `APP_PORT=3000 docker compose up -d` if port 8080 conflicts with something else.

### Auto-start on boot
The `docker-compose.yml` uses `restart: unless-stopped`, so containers will auto-restart after a reboot as long as Docker Desktop is set to start on login.

### Updating
```bash
docker compose down
docker compose up --build -d
```

### Backup your data
```bash
# Export database
docker exec sidwala-db pg_dump -U sidwala sidwala > backup.sql

# Restore
docker exec -i sidwala-db psql -U sidwala sidwala < backup.sql
```

## 📁 Project Structure

```
sidwala-household-planner/
├── docker-compose.yml      # Orchestration (app + PostgreSQL)
├── Dockerfile              # Multi-stage build (React → Express)
├── .env                    # Environment configuration
├── init.sql                # Database schema
├── server/                 # Express.js backend
│   ├── index.js            # Server entry point
│   ├── db.js               # Database connection & seeding
│   ├── auth.js             # JWT authentication middleware
│   └── routes/
│       ├── auth.js         # Login & password routes
│       ├── users.js        # User management (admin)
│       ├── tasks.js        # Task CRUD + completion logic
│       └── stats.js        # Dashboard & leaderboard
└── client/                 # React frontend (Vite)
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx         # Router setup
        ├── App.css         # Complete pastel theme
        ├── api.js          # API client
        ├── context/        # Auth state management
        ├── components/     # Reusable UI components
        └── pages/          # Dashboard, Tasks, Leaderboard, Admin
```

## 🎯 Points & Achievements

| Points | Task Type |
|--------|-----------|
| 5 pts  | Quick tasks |
| 10 pts | Normal tasks |
| 20 pts | Effort tasks |
| 50 pts | Big jobs |
| 100 pts | Epic tasks |

### Badges
| Badge | Requirement |
|-------|-------------|
| 🌱 First Step | Complete 1 task |
| ⭐ Getting Going | Complete 5 tasks |
| 🏅 Task Master | Complete 10 tasks |
| 🦸 Household Hero | Complete 25 tasks |
| 🏆 Legend | Complete 50 tasks |
| 💯 Centurion | Complete 100 tasks |
| 🔥 On Fire | 3-day streak |
| 💪 Week Warrior | 7-day streak |
| 🚀 Unstoppable | 30-day streak |
| 💎 Point Collector | Earn 100 points |
| 👑 Point Hoarder | Earn 500 points |

## 🛠️ Development

### Run without Docker
```bash
# Terminal 1: Start only the database container
docker compose up db -d

# Terminal 2: Backend (port 3000)
cd server && npm install && npm run dev

# Terminal 3: Frontend (port 5173)
cd client && npm install && npm run dev
```

The Vite dev server proxies `/api` requests to the Express server at `http://localhost:3000`.

## 📝 License

MIT — Built with ❤️ for the Sidwala household.
