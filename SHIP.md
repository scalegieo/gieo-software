# Ship GIEO CRM to your team

## Quick start (you — build the DMG)

```bash
cd gieo-app
npm install
npm run release        # DMG for your Mac chip (arm64 on Apple Silicon)
npm run release:mac    # Both arm64 + Intel DMGs
```

The installer lands in **`release/`** — e.g. `GIEO-CRM-1.0.0-arm64.dmg`.

**Publish to GitHub so friends can download:**

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions builds both Mac DMGs and attaches them to **Releases**.

Or: GitHub → **Actions** → **Build Mac App (DMG)** → **Run workflow**.

Friends install from: **[INSTALL-MAC.md](./INSTALL-MAC.md)** (open DMG → drag to Applications).

---

## Friend install (share this section)

### 1. Download the right file

Go to **[github.com/scalegieo/gieo-software/releases](https://github.com/scalegieo/gieo-software/releases)**

| Your Mac | File |
|----------|------|
| Apple Silicon (M1/M2/M3/M4) | `GIEO-CRM-1.0.0-arm64.dmg` |
| Intel Mac | `GIEO-CRM-1.0.0-x64.dmg` |

### 2. Install

1. Double-click the `.dmg`
2. **Drag GIEO CRM → Applications** (the window shows both icons)
3. Open **Applications** → **GIEO CRM**
4. First launch: **right-click → Open** (Mac security for unsigned apps)

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
6. `supabase/migration-v6.sql` ← **GIEO / Python client portals**

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
