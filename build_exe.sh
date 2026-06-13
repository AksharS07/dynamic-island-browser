#!/bin/bash

# ==============================================================================
# Build Script for Vivaldi Dynamic Island Windows Installer
# Run this on Linux to cross-compile the Windows .exe
# ==============================================================================

if ! command -v go &> /dev/null; then
    echo -e "\e[31m[-] Error: Go is not installed.\e[0m"
    echo "Please install Go first: sudo apt install golang"
    exit 1
fi

echo -e "\e[36m[~] Setting up build environment...\e[0m"

# Ensure rsrc is installed for manifest embedding
if ! command -v rsrc &> /dev/null; then
    echo -e "\e[33m[~] Installing github.com/akavel/rsrc to compile Windows manifest...\e[0m"
    go install github.com/akavel/rsrc@latest
    export PATH=$PATH:$(go env GOPATH)/bin
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
INSTALLER_DIR="$SCRIPT_DIR/installer"

# Copy extension files into the installer dir so go:embed can see them
mkdir -p "$INSTALLER_DIR/ext"
cp -r "$SCRIPT_DIR/chrome-extension/"* "$INSTALLER_DIR/ext/"

cd "$INSTALLER_DIR"

# Init go module if not exists
if [ ! -f go.mod ]; then
    go mod init installer
fi

# Compile the manifest into a .syso file
echo -e "\e[36m[~] Compiling application manifest for UAC...\e[0m"
rsrc -manifest installer.manifest -o rsrc.syso

# Build the .exe
echo -e "\e[36m[~] Cross-compiling for Windows (amd64)...\e[0m"
GOOS=windows GOARCH=amd64 go build -o "$SCRIPT_DIR/Install-Dynamic-Island.exe" main.go

# Cleanup
rm rsrc.syso
rm -rf ext

echo -e "\e[32m[+] Build complete! File created: Install-Dynamic-Island.exe\e[0m"
