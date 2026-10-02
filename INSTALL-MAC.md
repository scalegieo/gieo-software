# Install GIEO CRM on Mac

Your friends do **not** need to clone the repo or run `npm install`. They download the **`.dmg`** file and drag the app into Applications.

## Download

1. Open **[github.com/scalegieo/gieo-software/releases](https://github.com/scalegieo/gieo-software/releases)**
2. Download the DMG for your Mac:

| Mac type | File |
|----------|------|
| **Apple Silicon** (M1/M2/M3/M4) | `GIEO-CRM-1.0.0-arm64.dmg` |
| **Intel Mac** | `GIEO-CRM-1.0.0-x64.dmg` |

> Not sure? Apple menu → **About This Mac** → look for "Chip" (Apple M…) or "Processor" (Intel).

## Install (drag to Applications)

1. **Double-click** the downloaded `.dmg`
2. A window opens with **GIEO CRM** on the left and **Applications** on the right
3. **Drag GIEO CRM** onto **Applications**
4. Eject the DMG (right-click → Eject)
5. Open **Applications** → double-click **GIEO CRM**

## First launch (important)

The app isn't signed with a paid Apple certificate, so macOS blocks it the first time:

1. Double-click **GIEO CRM** in Applications. When macOS says it can't verify the app, click **Done**
2. Open **System Settings → Privacy & Security** and scroll down to **Security**
3. Next to "GIEO CRM was blocked", click **Open Anyway**, then confirm with your password
4. You only need to do this once

**If there's no "Open Anyway" button** (or it says the app is damaged), open **Terminal** and paste:

```bash
xattr -cr "/Applications/GIEO CRM.app"
```

Then open the app normally.

## Log in

| Username | Password |
|----------|----------|
| reda | gieo1 |
| yoni | gieo2 |
| yeab | gieo3 |
| natu | gieo4 |
| lydia | gieo5 |

Internet required — the app syncs clients, hours, tasks, and chat with the team.

## Updates

Check **Releases** on GitHub for a newer `.dmg`, download it, and drag into Applications again (replace the old app).
