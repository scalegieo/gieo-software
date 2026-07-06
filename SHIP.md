# Ship GIEO CRM to your team

## Quick start (you — build the zip)

```bash
cd gieo-app
npm install
npm run release        # Mac zip for your current chip (arm64 on Apple Silicon)
npm run release:mac    # Both arm64 + Intel Mac zips
```

Zips land in **`release/`** — e.g. `GIEO-CRM-1.0.0-arm64.zip`.

Send the zip + logins (below) to your team. They unzip and open **GIEO CRM.app**.

---

## Friend install (share this section)

### 1. Download the right zip

| Your Mac | File to use |
|----------|-------------|
| Apple Silicon (M1/M2/M3/M4) | `GIEO-CRM-1.0.0-arm64.zip` |
| Intel Mac | `GIEO-CRM-1.0.0-x64.zip` |

### 2. Install

1. Unzip the file
2. Drag **GIEO CRM.app** to Applications (optional)
3. **First launch:** Mac may block the app (unsigned). Right-click the app → **Open** → **Open** again
4. You need **internet** — the app syncs clients, tasks, chat, and hours with the team database

### 3. Log in

| Username | Password |
|----------|----------|
| reda | gieo1 |
| yoni | gieo2 |
| yeab | gieo3 |
| natu | gieo4 |
| lydia | gieo5 |

### 4. Start using real data

- **MRR** = sum of active clients you add under **Clients → Add Client**
- **Hours** = log time on each client under **Hours & Billing** tab (syncs to whole team)
- **Dashboard** shows live MRR, hours this month, billing reminders, pipeline
- **Team Stats** shows hours and tasks per person from what you actually log

Empty dashboard = no clients in the database yet. Add clients to see real numbers.

---

## One-time Supabase setup (you — before team uses shared data)

In [Supabase SQL editor](https://supabase.com/dashboard), run **in order**:

1. `supabase/schema.sql`
2. `supabase/migration-v2.sql`
3. `supabase/migration-v3.sql`
4. `supabase/migration-v4.sql`
5. `supabase/migration-v5.sql` ← **client hours/profiles sync**

Enable **Realtime** on: `messages`, `whiteboard_items`

---

## API keys (hardcoded in the app)

All keys live in:

- `src/main/gieo-config.ts`
- `src/renderer/src/lib/config.ts`

After changing keys, rebuild: `npm run release`

Optional before ship:

- **Stripe** — replace `sk_test_REPLACE_WITH...` for invoices/payment links
- **Google Calendar** — OAuth client ID/secret + redirect `http://127.0.0.1:42857/oauth/callback`

---

## What syncs vs stays local

| Data | Shared (Supabase) |
|------|-------------------|
| Clients, MRR, status | ✓ |
| Hours, retainer, contacts | ✓ (`client_profiles` table) |
| Tasks, leads, chat, whiteboard | ✓ |
| Client files (PDFs, etc.) | Local only — `~/GIEO_Data/Active/` per machine |
| Scraped leads sheet imports | Local cache |

---

## Windows build

Build on a Windows machine:

```bash
npm run pack:win
```

Share `release/GIEO-CRM-1.0.0-win.zip`.

---

## Version bump before each ship

Edit `version` in `package.json`, then rebuild. Zip filename includes the version.
