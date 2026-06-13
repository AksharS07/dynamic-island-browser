#!/bin/bash

# ============================================================
#  Vivaldi Dynamic Island - Installer Script for Linux
#  Run this with sudo after each Vivaldi update
# ============================================================

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (e.g. sudo ./install.sh)"
  exit 1
fi

# --- Auto-detect Vivaldi installation -----------------------
CANDIDATES=(
    "/opt/vivaldi"
    "/usr/lib/vivaldi"
    "/usr/share/vivaldi"
    "/var/lib/flatpak/app/com.vivaldi.Vivaldi/current/active/files/vivaldi"
    "/var/lib/flatpak/app/com.vivaldi.Vivaldi/current/active/files/extra/vivaldi"
    "/var/lib/flatpak/app/com.vivaldi.Vivaldi/current/active/files/extra/opt/vivaldi"
    "$HOME/.local/share/flatpak/app/com.vivaldi.Vivaldi/current/active/files/vivaldi"
    "$HOME/.local/share/flatpak/app/com.vivaldi.Vivaldi/current/active/files/extra/vivaldi"
    "$HOME/.local/share/flatpak/app/com.vivaldi.Vivaldi/current/active/files/extra/opt/vivaldi"
)

VIVALDI_PATH=""
for c in "${CANDIDATES[@]}"; do
    if [ -d "$c" ] && [ -d "$c/resources/vivaldi" ]; then
        VIVALDI_PATH="$c"
        break
    fi
done

if [ -z "$VIVALDI_PATH" ]; then
    echo "Could not auto-detect Vivaldi installation path."
    echo "If you are using Snap, modifications are not possible due to its read-only filesystem."
    read -p "Please enter the path to your Vivaldi directory manually (e.g., /usr/lib/vivaldi): " VIVALDI_PATH
fi

# Check if Vivaldi is installed in the given location
if [ ! -d "$VIVALDI_PATH" ]; then
    echo "Could not find Vivaldi installation at $VIVALDI_PATH."
    exit 1
fi


echo -e "\e[36mKilling Vivaldi...\e[0m"
pkill -f vivaldi
sleep 2

RESOURCES_DIR="$VIVALDI_PATH/resources/vivaldi"
echo -e "\e[36mTarget directory: $RESOURCES_DIR\e[0m"

if [ ! -d "$RESOURCES_DIR" ]; then
    echo "Resources directory not found: $RESOURCES_DIR"
    exit 1
fi

# Get directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Copy files
FILES_TO_COPY=("dynamic-island.js" "content-bridge.js")

for f in "${FILES_TO_COPY[@]}"; do
    src="$SCRIPT_DIR/$f"
    if [ ! -f "$src" ]; then
        echo "Source file not found: $src"
        exit 1
    fi
    cp "$src" "$RESOURCES_DIR/"
    echo -e "\e[32mCopied $f\e[0m"
done

# Patch window.html
WINDOW_HTML="$RESOURCES_DIR/window.html"

if [ ! -f "$WINDOW_HTML" ]; then
    echo "window.html not found at: $WINDOW_HTML"
    exit 1
fi

# Backup first (only once)
BACKUP_PATH="${WINDOW_HTML}.backup"
if [ ! -f "$BACKUP_PATH" ]; then
    cp "$WINDOW_HTML" "$BACKUP_PATH"
    echo -e "\e[33mBacked up window.html to window.html.backup\e[0m"
fi

SCRIPT_TAG='<script src="dynamic-island.js"></script>'

if grep -qF "$SCRIPT_TAG" "$WINDOW_HTML"; then
    echo -e "\e[33mdynamic-island.js already injected in window.html - skipping.\e[0m"
else
    # Use sed to insert the script tag before </body>
    sed -i "s|</body>|$SCRIPT_TAG\n</body>|i" "$WINDOW_HTML"
    echo -e "\e[32mPatched window.html successfully.\e[0m"
fi

echo ""
echo -e "\e[32m[OK] Installation complete! Restart Vivaldi to activate the Dynamic Island.\e[0m"
echo ""
echo -e "\e[90m     Hover the pill at the top-center of the browser window\e[0m"
echo -e "\e[90m     whenever media is playing to expand the controls.\e[0m"
