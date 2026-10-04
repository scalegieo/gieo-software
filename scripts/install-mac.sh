#!/bin/bash
# GIEO CRM installer for macOS — installs the latest release without the "damaged" warning.
# Usage: curl -fsSL https://raw.githubusercontent.com/scalegieo/gieo-software/master/scripts/install-mac.sh | bash
set -euo pipefail

REPO="scalegieo/gieo-software"
APP="GIEO CRM.app"

case "$(uname -m)" in
  arm64) ARCH="arm64" ;;
  *) ARCH="x64" ;;
esac

echo "→ Finding latest GIEO CRM release ($ARCH)…"
URL=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
  | grep -o "\"browser_download_url\": *\"[^\"]*-${ARCH}\.dmg\"" \
  | head -1 | sed 's/.*"\(https[^"]*\)"/\1/')

if [ -z "$URL" ]; then
  echo "✗ Couldn't find a $ARCH download. Check https://github.com/$REPO/releases"
  exit 1
fi

TMP=$(mktemp -d)
trap 'hdiutil detach "$TMP/mnt" >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT

echo "→ Downloading $(basename "$URL")…"
curl -fL --progress-bar -o "$TMP/gieo.dmg" "$URL"

echo "→ Installing to /Applications…"
hdiutil attach -nobrowse -readonly -mountpoint "$TMP/mnt" "$TMP/gieo.dmg" >/dev/null
osascript -e 'quit app "GIEO CRM"' >/dev/null 2>&1 || true
rm -rf "/Applications/$APP"
cp -R "$TMP/mnt/$APP" /Applications/
xattr -cr "/Applications/$APP"

echo "✓ GIEO CRM installed. Opening…"
open "/Applications/$APP"
