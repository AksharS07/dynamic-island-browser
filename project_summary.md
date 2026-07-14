# Dynamic Island for Web - Project Summary & Roadmap

## 🚀 What We Have Accomplished So Far

The project evolved from a concept to a fully functional, highly polished browser modification with two distinct versions: a native **Vivaldi Mod** (injected directly into the browser UI) and a standalone **Chrome/Edge Extension**. 

### 🌟 V1.0 & V1.1 (The Foundation)
*   **Media Syncing:** Built the core engine to track background media tabs and extract real-time metadata (Title, Artist, Duration).
*   **Apple Music API Integration:** Built a robust fetcher to pull high-res, crisp album artwork.
*   **Vibrant Theming:** Implemented an algorithm to extract dominant colors from album art to seamlessly theme the island's glow and progress bar.
*   **Time-Synced Lyrics:** Integrated `lrclib.net` to provide real-time lyrics that scroll in sync with the song.
*   **Romanization Engine:** Added on-the-fly Google Translate API queries to silently Romanize non-Latin scripts (Korean, Japanese, etc.).
*   **Major Bug Fixes:** Resolved critical issues, including an infinite API loop, a `ReferenceError` that broke theming, and JavaScript closure scope bugs in the lyrics click-to-seek logic.

### ⚡ V1.2 (The Major Overhaul)
*   **Universal PiP Teleportation:** Engineered a brilliant workaround for Chromium's strict cross-origin Picture-in-Picture security policies. The island now instantly teleports the user to the media tab, triggers PiP, and teleports them back seamlessly.
*   **Cinematic Lyrics Engine:** Scrapped the jittery word-by-word animation in favor of a stunning, buttery-smooth full-line glow that fades elegantly into focus.
*   **Zero Jitter Progress Bar:** Rebuilt the progress bar logic with mathematical smoothing to completely eliminate rubber-banding and lag caused by background tab throttling.
*   **Smart Lyrics Caching:** Implemented `localStorage` caching so that opening new tabs loads lyrics instantly from memory rather than triggering redundant API requests.
*   **Unified UI/UX:** Stripped away the bulky lyrics header and replaced the Romanization button with a sleek, floating transparent orb that perfectly matches the island's aesthetics.
*   **Automated Patch Notes:** Engineered a clever `chrome.runtime.onInstalled` listener that opens a clean `patch-notes.html` screen upon updates, strictly adhering to Manifest V3 CSP rules.
*   **Marketing & Documentation:** Generated stunning promotional graphics (`final_large_promo.jpg`) and completely overhauled the `README.md` to be a professional, top-tier landing page.

---

## ⏳ Current Status
*   **GitHub:** V1.2 source code and release ZIP are officially published.
*   **Microsoft Edge Add-ons Store:** V1.2 is currently **In Review**. (Experiencing delays due to the US July 4th holiday weekend).

---

## 🗺️ What's Planned for the Future

While V1.2 is incredibly stable, here are the major challenges and features we've discussed for future roadmaps:

### 1. Expanded Platform Support (V1.3+)
*   **Current:** Strictly optimized for YouTube and YouTube Music.
*   **Goal:** Expand robust support to **Spotify (Web Player)**, **SoundCloud**, and **Apple Music (Web)**. This will require writing custom DOM scrapers and time-tracking logic for each specific platform, as they all handle media elements differently.

### 2. True Audio Visualizer
*   **Current:** The visualizer uses a random CSS animation ("Fake Visualizer") because standard browser APIs do not securely expose raw audio waveform data from an arbitrary tab to an external script.
*   **Goal:** Investigate workarounds (e.g., using `chrome.tabCapture` or advanced Web Audio API routing) to create a genuine EQ visualizer that reacts to the actual frequencies of the music.

### 3. Lyrics Fallback Systems
*   **Current:** We rely entirely on `lrclib.net`. Obscure tracks often return nothing.
*   **Goal:** Implement a fallback scraping mechanism or secondary API to find lyrics when the primary database fails.

### 4. Cross-Browser Store Publishing
*   **Current:** Edge Add-ons Store.
*   **Goal:** Package and submit the extension to the **Google Chrome Web Store** and **Mozilla Firefox Add-ons** directory to maximize reach.
