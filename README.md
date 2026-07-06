# GIEO CRM

Desktop CRM for the GIEO team — clients, MRR, hours, pipeline, team chat, calendar, and FRIDAY AI.

## Download the Mac app (team members)

**Do not clone this repo unless you're developing.**

1. Go to **[Releases](https://github.com/scalegieo/gieo-software/releases)**
2. Download `GIEO-CRM-*-arm64.dmg` (Apple Silicon) or `*-x64.dmg` (Intel)
3. Open the DMG → **drag GIEO CRM into Applications**
4. First launch: right-click the app → **Open**

Full steps: **[INSTALL-MAC.md](./INSTALL-MAC.md)**

## Logins

| User | Password |
|------|----------|
| reda | gieo1 |
| yoni | gieo2 |
| yeab | gieo3 |
| natu | gieo4 |
| lydia | gieo5 |

## For developers

```bash
git clone https://github.com/scalegieo/gieo-software.git
cd gieo-software
npm install
npm run dev
```

### Build a Mac installer (DMG)

```bash
npm run release          # DMG for your Mac's chip
npm run release:mac      # arm64 + Intel DMGs
```

Output: `release/GIEO-CRM-1.0.0-arm64.dmg`

### Publish a GitHub Release (auto-builds DMGs)

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions builds both Mac DMGs and attaches them to the release.

Or: **Actions** → **Build Mac App (DMG)** → **Run workflow** (no tag needed).

### Supabase setup

Run in order in Supabase SQL editor: `schema.sql` → `migration-v2` → `v3` → `v4` → `v5`

See **[SHIP.md](./SHIP.md)** for full shipping checklist.

## Features

- **Dashboard** — Real MRR, hours, billing reminders, calendar widget
- **Clients** — Retainer, hours logging (synced across team), Stripe links
- **CRM Pipeline** — Kanban leads with onboarding checklist
- **Tasks** — Team task board with notifications
- **Team chat** — Real-time Supabase messages
- **Calendar** — Google Calendar + Calendly
- **FRIDAY AI** — Ollama Cloud assistant (⌥ Option quick bar)
- **Whiteboard** — Team sticky notes

## Tech stack

Electron-Vite · React 18 · TypeScript · Tailwind · Supabase · Zustand
