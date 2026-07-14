# Development Pause State
**Date:** July 8, 2026

We are pausing development here because Copilot Student credits have run out. When development resumes, we have several major fully-engineered logic blocks ready to be seamlessly integrated into the codebase.

---

## 🛑 Current State of the Project
The project is currently at **V1.2**. It has been published to GitHub and submitted to the Microsoft Edge Add-ons store. V1.2 includes the cinematic lyrics engine, universal PiP teleportation hack, and smart local caching.

## 🚀 Pending Features to Implement
The following features have had their logic completely built and tested locally. They just need to be merged into the official source code files when development resumes.

### 1. Real-Time EQ Visualizer (Web Audio API)
*   **The Goal:** Replace the random "Fake Visualizer" with a true audio-reactive EQ that reads direct frequency data from the media element.
*   **The Solution:** Copilot successfully engineered a global Web Audio API probe (`window.__vdiEqProbe`) that safely attaches an `AnalyserNode` to the YouTube `<video>` element without tripping repeated `AudioContext` errors.
*   **Implementation Steps:**
    *   Add `getRealtimeEqFromElement` to `src/core.js` and pipe `eq` into the returned media state.
    *   Update `src/platform/chrome-ext.js` and `build.js` to pass `S.eq` through the content bridge.
    *   Update `src/ui.js` to consume `state.eq` using exponential smoothing (`eqSmooth[i] = (eqSmooth[i] * 0.65) + (target * 0.35)`).

### 2. Cascading Lyrics Fallback System
*   **The Goal:** Provide a robust fallback for obscure songs when `lrclib.net` fails.
*   **The Solution:** A highly resilient fallback that queries `api.lyrics.ovh/v1/`. It scrubs YouTube suffixes (" - official video"), splits pre-dash titles, and routes failed direct requests through the `allorigins.win` proxy to guarantee CORS bypass.
*   **Implementation Steps:**
    *   Add `fetchSecondaryLyrics` and `parsePlainLyricsText` to `src/core.js`.
    *   Call `fetchSecondaryLyrics` inside the final `.catch()` branch of the primary `lrclib` fetch block.

### 3. UI Lyrics Engine Polish
*   **Word-Based Reading Speed:** Clamp the CSS animation duration using `wordCount * 0.25` so the text glow stays readable and snappy, ignoring massive LRCLib time gaps.
*   **True Instrumental Duration:** Ensure `lineGapDuration` for `♪/♫` correctly uses `nextTime - currTime` so the note fills perfectly over the exact length of the musical break.
*   **Seek-Aware Progress Fill:** Replace the static CSS `@keyframes` with a dynamic JS-driven `clip-path` update (`progress = (position - start) / (end - start)`) that instantly updates when the user skips through the track.
    *   **Implementation:** Add `setInstrumentalFill` and `updateInstrumentalProgress` to `src/ui.js`, and replace `.vdi-note-fill` CSS keyframes with a simple `transition: clip-path .12s linear` in `src/styles.js`.

---

*Just point me to this file when you are ready to resume, and I can implement all of these logic blocks into the codebase for you!*
