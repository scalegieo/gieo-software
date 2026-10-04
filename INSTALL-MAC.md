# Install GIEO CRM on Mac

Your friends do **not** need to clone the repo or run `npm install`.

## Easiest: one Terminal command (no "damaged" error)

Open **Terminal** (Cmd+Space → type Terminal → Enter), paste this, press Enter:

```bash
curl -fsSL https://raw.githubusercontent.com/scalegieo/gieo-software/master/scripts/install-mac.sh | bash
```

It picks the right version for your Mac, installs it into Applications, and opens it. Run the same command again any time to update.

## Manual download

Only if you'd rather not use Terminal. macOS may say the app is "damaged" — that's because it isn't notarized by Apple, not because the file is broken. Fix it with the `xattr` command below.

1. Open **[github.com/scalegieo/gieo-software/releases](https://github.com/scalegieo/gieo-software/releases)**
2. Download the DMG for your Mac:

| Mac type | File |
|----------|------|
| **Apple Silicon** (M1/M2/M3/M4) | `GIEO-CRM-<version>-arm64.dmg` |
| **Intel Mac** | `GIEO-CRM-<version>-x64.dmg` |

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
| sulay | gieo2 |
| ethan | gieo3 |
| jacob | gieo4 |
| dolev | gieo5 |
| shalom | gieo6 |
| daaron | gieo6 |
| quentin | gieo7 |
| lydia | gieo5 |

Internet required — the app syncs clients, hours, tasks, and chat with the team.

## Updates

Check **Releases** on GitHub for a newer `.dmg`, download it, and drag into Applications again (replace the old app).
