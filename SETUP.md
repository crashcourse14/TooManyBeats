# Too Many Beats — Next.js Backend Setup Guide

## What this is

Your game backend is now a **Next.js** app.  
Next.js handles both the API routes (auth, leaderboard, titles) **and** serves
your static game files (index.html, game.js, levels/, songs/, etc.) from a
single Node.js process.

---

## Prerequisites

| Tool | Minimum version | Check |
|------|----------------|-------|
| Node.js | 18.17 or newer | `node -v` |
| npm | comes with Node | `npm -v` |

Install Node.js from https://nodejs.org (choose the **LTS** version).

---

## Step 1 — Folder structure

Your final project should look like this:

```
too-many-beats/          ← project root
├── data/                ← JSON data files (created for you)
│   ├── users.json
│   ├── leaderboard.json
│   └── titles.json
├── public/              ← ALL your game files go here ← IMPORTANT
│   ├── index.html
│   ├── javascript/
│   │   └── game.js      ← the updated game.js from this package
│   ├── levels/
│   │   ├── level1.json
│   │   └── ...
│   └── songs/
│       └── ...
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/route.ts
│   │   │   ├── leaderboard/route.ts
│   │   │   └── titles/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── lib/
│       ├── db.ts
│       └── session.ts
├── .env.local
├── next.config.js
├── package.json
└── tsconfig.json
```

> **Key point:** Everything in `/public` is served automatically at the root URL.
> `public/index.html` → `http://localhost:3000/index.html`
> `public/javascript/game.js` → `http://localhost:3000/javascript/game.js`

---

## Step 2 — Install dependencies

Open a terminal in the project root and run:

```bash
npm install
```

This installs Next.js, React, bcryptjs (password hashing), and iron-session
(encrypted cookies for sessions).

---

## Step 3 — Generate your session secret

Your session secret is a random string used to encrypt login cookies.
Run this command to generate one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output, then open `.env.local` and replace the placeholder:

```
SESSION_SECRET=paste_your_generated_secret_here
```

> **Never commit `.env.local` to Git.** Add it to `.gitignore`.

---

## Step 4 — Copy your game files into /public

Copy your existing game files into the `public/` folder:

```
public/index.html           ← your game's index.html (updated version)
public/javascript/game.js   ← the updated game.js from this package
public/levels/              ← all your level JSON files
public/songs/               ← all your audio files
public/data/                ← if you have any static data files your game reads
```

> The `index.html` and `game.js` in this package already have the correct
> API paths pointing to `/api/auth`, `/api/leaderboard`, `/api/titles`.

---

## Step 5 — Run in development

```bash
npm run dev
```

Open http://localhost:3000 in your browser.  
You should see your game. The API routes are live at:

- `GET  /api/auth?action=me`
- `POST /api/auth`   (login / register / logout)
- `GET  /api/leaderboard`
- `POST /api/leaderboard`
- `GET  /api/titles`
- `POST /api/titles`

---

## Step 6 — Deploy to production

### Option A — Vercel (easiest, free tier available)

Vercel is made by the Next.js team. Deployment is one command.

```bash
npm install -g vercel
vercel
```

Follow the prompts. When asked for environment variables, add:
- Key: `SESSION_SECRET`   Value: your generated secret

Then set your environment variable in the Vercel dashboard:
**Project → Settings → Environment Variables**

> **Important for Vercel:** The `/data` folder is a local filesystem.
> Vercel's serverless functions have a read-only filesystem — writes will fail.
> For Vercel, replace the JSON file storage with a database:
> - **Vercel KV** (Redis) — easiest drop-in
> - **PlanetScale** or **Neon** (Postgres) — recommended for production
> - **Supabase** — also works well
>
> For a self-hosted VPS (option B below), the JSON files work perfectly.

### Option B — Self-hosted VPS (DigitalOcean, Linode, etc.)

This is the simplest production setup if you already have a server.

1. Copy your project to the server (git clone, scp, rsync, etc.)

2. Install Node 18+ on the server

3. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```

4. Start the production server:
   ```bash
   npm start
   # runs on port 3000 by default
   ```

5. Use **nginx** as a reverse proxy (so users hit port 80/443):

   ```nginx
   server {
       listen 80;
       server_name yourgame.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

6. Use **PM2** to keep the server running:
   ```bash
   npm install -g pm2
   pm2 start npm --name "too-many-beats" -- start
   pm2 save
   pm2 startup
   ```

7. Create your `.env.local` on the server with your `SESSION_SECRET`.

8. Make the `data/` folder writable:
   ```bash
   chmod 775 data/
   ```

### Option C — Railway / Render

Both support Node.js apps with persistent disk storage.
- Add `SESSION_SECRET` as an environment variable in their dashboard
- Set the start command to: `npm run build && npm start`
- Mount a persistent disk at `/data` (so leaderboard scores survive redeploys)

---

## Granting titles to players

Titles are stored in `data/titles.json`. Players can only equip titles that
have been granted to them. To grant a title to a player, edit `data/users.json`
and add the title ID to their `"titles"` array:

```json
{
  "username": "alice",
  "passwordHash": "...",
  "activeTitle": "top10",
  "titles": ["season1_pioneer", "top10"],
  "createdAt": "2026-03-06T00:00:00.000Z"
}
```

To add a new title to the catalogue, add an entry to `data/titles.json`:

```json
{ "id": "my_new_title", "label": "My New Title", "class": "t-custom" }
```

Available CSS classes: `t-wr`, `t-top10`, `t-top225`, `t-new`, `t-custom`

---

## API quick reference

All routes return JSON. Errors always have an `{ "error": "..." }` field.

### Auth

| Method | URL | Body | Response |
|--------|-----|------|----------|
| GET | `/api/auth?action=me` | — | `{ user, title }` |
| POST | `/api/auth` | `{ action:"login", username, password }` | `{ ok, user, title }` |
| POST | `/api/auth` | `{ action:"register", username, password }` | `{ ok, user }` |
| POST | `/api/auth` | `{ action:"logout" }` | `{ ok }` |

### Leaderboard

| Method | URL | Body | Response |
|--------|-----|------|----------|
| GET | `/api/leaderboard` | — | `LeaderboardEntry[]` |
| POST | `/api/leaderboard` | `{ score, level, combo }` | `{ ok, newTotal }` |

### Titles

| Method | URL | Body | Response |
|--------|-----|------|----------|
| GET | `/api/titles` | — | `{ allTitles, activeTitle, unlocked }` |
| POST | `/api/titles` | `{ action:"setTitle", title }` | `{ ok, activeTitle }` |
