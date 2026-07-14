#!/bin/bash

# Vivaldi Dynamic Island - Linux Installer
echo "=========================================="
echo " Vivaldi Dynamic Island Mod Installer"
echo "=========================================="

if [ "$EUID" -ne 0 ]; then
  echo "Please run this script as root (sudo ./install.sh)"
  exit 1
fi

VIVALDI_DIR="/opt/vivaldi/resources/vivaldi"

# Check if Vivaldi is installed
if [ ! -d "$VIVALDI_DIR" ]; then
  echo "Error: Vivaldi installation not found at $VIVALDI_DIR"
  echo "Make sure Vivaldi is installed before running this script."
  exit 1
fi

# Determine the correct HTML file
TARGET_HTML=""
if [ -f "$VIVALDI_DIR/window.html" ]; then
  TARGET_HTML="$VIVALDI_DIR/window.html"
elif [ -f "$VIVALDI_DIR/browser.html" ]; then
  TARGET_HTML="$VIVALDI_DIR/browser.html"
else
  echo "Error: Could not find window.html or browser.html in $VIVALDI_DIR"
  exit 1
fi

echo "Found Vivaldi target: $TARGET_HTML"

# Backup the original HTML file if backup doesn't exist
if [ ! -f "$TARGET_HTML.bak" ]; then
  echo "Creating backup of $TARGET_HTML..."
  cp "$TARGET_HTML" "$TARGET_HTML.bak"
else
  echo "Backup already exists, restoring clean version before patching..."
  cp "$TARGET_HTML.bak" "$TARGET_HTML"
fi

# Copy the dynamic island payload
echo "Copying dynamic-island.js..."
cp "../dynamic-island.js" "$VIVALDI_DIR/dynamic-island.js"
chmod 644 "$VIVALDI_DIR/dynamic-island.js"

# Inject the script tag before </body>
echo "Injecting script into Vivaldi UI..."
sed -i 's|</body>|<script src="dynamic-island.js"></script></body>|' "$TARGET_HTML"

echo "=========================================="
echo "Installation complete! Please restart Vivaldi."
echo "=========================================="
