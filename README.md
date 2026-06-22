# Last Time

Track when you last did anything.

## Prerequisites

- Node.js 20+
- A MongoDB instance
- A Google OAuth app ([console.cloud.google.com](https://console.cloud.google.com))

## Setup

Copy `.env.example` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `SESSION_SECRET` | Random secret for session signing |
| `CLIENT_URL` | URL the browser uses to reach the app |
| `PORT` | Port for the Express server (default: 3001) |

## Development

Runs Vite (port 5173) and Express (port 3001) concurrently. Vite proxies `/api` and `/auth` to Express.

```bash
npm install
npm run dev
```

Set `CLIENT_URL=http://localhost:5173` in `.env` for dev.

Open [http://localhost:5173](http://localhost:5173).

## Production

Builds the frontend and serves everything from Express on a single port.

```bash
npm install
npm run build
npm start
```

Set `CLIENT_URL=http://localhost:3001` in `.env` (or your deployment URL).

## Docker

```bash
docker compose up --build
```

Set `CLIENT_URL=http://localhost:3001` in `.env`.

The app will be available at [http://localhost:3001](http://localhost:3001).
