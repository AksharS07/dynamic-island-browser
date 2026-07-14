#!/bin/bash

# Vivaldi Dynamic Island - Linux Uninstaller
echo "=========================================="
echo " Vivaldi Dynamic Island Mod Uninstaller"
echo "=========================================="

if [ "$EUID" -ne 0 ]; then
  echo "Please run this script as root (sudo ./uninstall.sh)"
  exit 1
fi

VIVALDI_DIR="/opt/vivaldi/resources/vivaldi"

# Check if Vivaldi is installed
if [ ! -d "$VIVALDI_DIR" ]; then
  echo "Error: Vivaldi installation not found at $VIVALDI_DIR"
  exit 1
fi

TARGET_HTML=""
if [ -f "$VIVALDI_DIR/window.html" ]; then
  TARGET_HTML="$VIVALDI_DIR/window.html"
elif [ -f "$VIVALDI_DIR/browser.html" ]; then
  TARGET_HTML="$VIVALDI_DIR/browser.html"
else
  echo "Error: Could not find window.html or browser.html in $VIVALDI_DIR"
  exit 1
fi

if [ -f "$TARGET_HTML.bak" ]; then
  echo "Restoring original HTML file from backup..."
  cp "$TARGET_HTML.bak" "$TARGET_HTML"
else
  echo "No backup found, stripping script tag manually..."
  sed -i 's|<script src="dynamic-island.js"></script>||' "$TARGET_HTML"
fi

if [ -f "$VIVALDI_DIR/dynamic-island.js" ]; then
  rm "$VIVALDI_DIR/dynamic-island.js"
fi

echo "=========================================="
echo "Uninstallation complete! Please restart Vivaldi."
echo "=========================================="
