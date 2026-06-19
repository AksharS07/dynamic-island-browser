# Dynamic Island for Browsers

A browser mod (and Chrome Extension) that brings an Apple-style Dynamic Island to your desktop browser, syncing with whatever media tab is playing in the background.

There are two versions:

- **Vivaldi Mod** — lives natively in Vivaldi's title bar, works across every tab including settings and new tab pages. Looks and feels like it belongs there.
- **Chrome Extension** — works on Chrome, Edge, Brave, or any Chromium browser. Sits as a fixed overlay at the top of every webpage. Less native-looking, but anyone can install it in 30 seconds without touching their browser's internals.

### Vivaldi — Native title bar mod
![Vivaldi Demo](vivaldi-demo.gif)

### Chrome / Edge — Unpacked extension
![Edge Demo](edge-demo.gif)

---

## Features

- **Media Playback Control:** Play, pause, skip, and scrub through tracks directly from the island. Double-click the island to jump directly to the media tab.
- **Time-Synced Lyrics:** Fetches and displays beautifully animated, time-synced lyrics in their original language (no translations). Click any lyric line to instantly seek to that part of the song!
- **High-Res Artwork Injection:** Automatically cross-references YouTube and Spotify tracks with the Apple Music API to fetch crisp, high-resolution album art, complete with a tiny Apple Music indicator!
- **Auto-Collapse & Idle State:** Expands on hover to show album art and controls. When inactive, it automatically shrinks into a tiny, unobtrusive dot so it stays completely out of your way.
- **Audio Visualizer:** Features a built-in EQ visualizer animation while music is playing (Static Visualizer).
- **Context-Aware PiP & Icons:** Includes a Picture-in-Picture (PiP) button. On standard YouTube videos, the lyrics icon intelligently hides itself to give priority to the PiP button. 
- **Vivaldi PiP Teleportation Hack:** Because Vivaldi mods live outside the webpage, Chromium blocks PiP. The Vivaldi Mod uses a custom "Teleportation Hack" that instantly teleports you to the video tab, drops a glass overlay, and teleports you back the moment you click it, bypassing Chromium's strict user gesture requirement!
- **Vibrant Theming:** Automatically extracts the dominant color from the album art and seamlessly themes the entire island—background, glow, accent, and progress bar—to match perfectly.

---

## Steps to Download & Install

### For Vivaldi only:
1. Close Vivaldi completely.
2. Clone or download the **source code / repository**.
3. Right-click `UPDATE (Run as Admin).bat` and select **Run as Administrator**.
4. The script will automatically find your Vivaldi installation, inject the Dynamic Island (`dynamic-island.js`), and relaunch the browser for you.

*(Note: You will need to re-run this script after any major Vivaldi version updates, as they overwrite core browser files).*

### Installing the Chrome / Edge Extension:
1. Download the **`dynamic-island-extension.zip`** release file.
2. Extract the folder to a safe location on your computer.
3. Open `chrome://extensions` (or `edge://extensions`).
4. Enable **Developer Mode** using the toggle in the top right.
5. Click **Load unpacked** and select the folder you extracted.

No build step, no dependencies, no account required.

---

## How this was actually built

I am a 2nd-year CS/IoT/Cybersecurity engineering student. I do not enjoy frontend development. I did not write the HTML, CSS, or JS syntax for this project — that was handled by agentic AI (Google's Antigravity 2.0 and Claude).

What I did do: defined the product, made every architectural decision, and acted as QA throughout. I caught bugs the AI missed repeatedly — a silent `ReferenceError` that was killing color theming entirely, a JavaScript closure bug that bound every lyrics click listener to the last line instead of the correct one, an infinite loop in the Apple Music API fetcher that brought the browser to its knees, and Chromium's strict User Gesture requirements that completely blocked PiP in Vivaldi until we engineered the "Teleportation Hack". The AI generated code; I decided what the code was supposed to do and whether it actually did it.

This is what AI-assisted development actually looks like in practice. It is a lot of iterative debugging and knowing when the output is wrong.

---

## Known Limitations & Technical Challenges

- **Fake Visualizer:** The EQ visualizer animates randomly rather than reacting to actual audio. There is no browser API that securely exposes raw audio waveform data from an arbitrary tab to an external script. 
- **Lyrics Availability:** Depends entirely on lrclib.net's database. Mainstream and regional tracks work surprisingly well; obscure tracks often do not. Lyrics are strictly in the original language.
- **YouTube Music Dual-Video Bug:** YouTube Music loads an audio-only stream and a hidden music video simultaneously. The island scrapes the UI time instead of relying purely on video element duration to prevent seeking bugs.
- **Chromium Throttling:** When the media tab isn't focused, Chromium aggressively throttles its JavaScript, which can cause 1–2s lag when skipping tracks.
- **Extension Restrictions:** The Chrome Extension cannot appear on `chrome://` internal pages or the new tab page due to browser security restrictions. It works on every normal webpage.
- **Color Extraction:** Occasionally picks a muted color depending on album art composition, though this has been optimized.

---

## Development

The codebase is modularized in `src/` for easier maintenance:

```
src/
  core.js           # Shared: time formatting, color extraction, lyrics API
  styles.js         # CSS generation with configurability
  ui.js             # DOM creation and controller logic
  platform/
    vivaldi.js      # Vivaldi-specific APIs
    chrome-ext.js   # Chrome Extension messaging
```

Run `node build.js` to regenerate the output files and the release `.zip` archive. No bundler required.

---

## Contributions

Pull requests are highly welcome. The modular structure makes it easy to work with: CSS edits belong in `src/styles.js`, core logic in `src/core.js`, and browser-specific code in `src/platform/`.
