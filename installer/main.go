package main

import (
	"embed"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

//go:embed ext/*
var embeddedFiles embed.FS

func main() {
	fmt.Println("============================================================")
	fmt.Println(" Dynamic Island - Universal Browser Extension Installer")
	fmt.Println("============================================================")
	fmt.Println()

	docsDir := filepath.Join(os.Getenv("USERPROFILE"), "Documents")
	extDir := filepath.Join(docsDir, "DynamicIslandExtension")

	fmt.Println("[~] Extracting extension to:", extDir)

	err := os.MkdirAll(extDir, 0755)
	if err != nil {
		fmt.Println("[-] Error creating directory:", err)
		pauseAndExit()
	}

	filesToCopy := []string{
		"background.js",
		"dynamic-island.js",
		"icon128.png",
		"manifest.json",
		"README.md",
	}

	for _, f := range filesToCopy {
		content, err := embeddedFiles.ReadFile("ext/" + f)
		if err != nil {
			fmt.Println("[-] Error reading embedded file:", f, "-", err)
			continue
		}
		dest := filepath.Join(extDir, f)
		err = os.WriteFile(dest, content, 0644)
		if err != nil {
			fmt.Println("[-] Error writing file:", f, "-", err)
		} else {
			fmt.Println("  +", f)
		}
	}

	// Create instructions.html
	instructions := `<!DOCTYPE html>
<html>
<head>
    <title>Dynamic Island Installation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #111; color: #eee; padding: 40px; text-align: center; }
        .container { max-width: 600px; margin: 0 auto; background: #222; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        h1 { color: #8b5cf6; }
        .step { background: #333; padding: 15px; margin: 15px 0; border-radius: 10px; text-align: left; }
        .code { background: #000; padding: 5px 10px; border-radius: 5px; font-family: monospace; color: #a78bfa; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Dynamic Island Files Extracted!</h1>
        <p>Because of strict browser security, extensions cannot be installed automatically. Follow these 3 easy steps to load it:</p>
        
        <div class="step">
            <b>Step 1:</b> Open your browser and go to <span class="code">chrome://extensions</span> (or <span class="code">edge://extensions</span>).
        </div>
        <div class="step">
            <b>Step 2:</b> Turn on <b>Developer Mode</b> (usually a toggle in the top right corner).
        </div>
        <div class="step">
            <b>Step 3:</b> Click <b>Load unpacked</b> and select the folder we just created: <br><br>
            <span class="code">` + extDir + `</span>
        </div>
        
        <p style="margin-top: 30px; color: #888;">You can now close this window and the command prompt.</p>
    </div>
</body>
</html>`

	instructionsPath := filepath.Join(extDir, "INSTRUCTIONS.html")
	os.WriteFile(instructionsPath, []byte(instructions), 0644)

	fmt.Println()
	fmt.Println("[+] Extraction complete!")
	fmt.Println("[~] Opening instructions in your browser...")
	
	// Automatically launch instructions in the default browser
	exec.Command("cmd", "/C", "start", instructionsPath).Run()

	pauseAndExit()
}

func pauseAndExit() {
	fmt.Println()
	fmt.Println("Press Enter to exit...")
	fmt.Scanln()
	os.Exit(0)
}
