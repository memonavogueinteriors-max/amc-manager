# AMC Manager — Villa Service Portal

A full-stack web application for managing Annual Maintenance Contracts across 40+ villas.

## Tech Stack
- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite (via better-sqlite3)
- **Auth**: JWT

## Quick Start

### 1. Backend
```bash
cd backend
npm install
npm run dev
# Server runs on http://localhost:5000
```

### 2. Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

### 3. Login
- Email: `admin@amc.com`
- Password: `admin123`

## Features
- ✅ Dashboard with live stats
- ✅ Contract management (CRUD)
- ✅ Villa directory
- ✅ Client management
- ✅ Service tickets with priority
- ✅ Service scheduling
- ✅ Procurement & inventory
- ✅ Reports & analytics
- ✅ JWT authentication

## Deployment (Railway.app)
1. Push to GitHub
2. Connect repo to Railway
3. Add backend as service: set `PORT=5000`
4. Add frontend as static site: build command `npm run build`, publish `dist`
5. Set `VITE_API_URL` env var to your backend URL

## Project Structure
```
amc-software/
├── backend/
│   ├── db/database.js     # SQLite setup + seed
│   ├── middleware/auth.js  # JWT middleware
│   ├── routes/
│   │   ├── auth.js        # Login/register
│   │   ├── contracts.js   # AMC contracts
│   │   └── all.js         # Clients, villas, tickets, etc.
│   └── server.js
└── frontend/
    └── src/
        ├── pages/          # All page components
        ├── components/     # Layout, sidebar
        ├── api.js          # Axios instance
        └── index.css       # Global styles
```
