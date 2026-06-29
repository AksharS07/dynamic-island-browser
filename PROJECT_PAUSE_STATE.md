# Development Pause State
**Date:** June 22, 2026

We are pausing development here because of your upcoming final exams. Best of luck! 
When you return, we will resume fixing the remaining UI animation and sync bugs **stage by stage**, pausing for your testing after each individual change.

---

## 🛑 Current State of the Project
The Vivaldi Dynamic Island extension successfully fetches lyrics via LRCLib, parses them, injects the UI, and handles both native Vivaldi media and YouTube Music web player media. 

Recently, we resolved:
- The "both lines highlighting simultaneously" bug for multi-line wrapped text (by moving to word-by-word span generation).
- Re-activated the Romanize button CSS using `!important` tags to block YouTube Music overrides.
- Implemented an exact URL extractor for LRCLib to point the source link directly to the current track for easy editing.

## 🐛 Remaining Bugs to Address (Next Steps)
When you are back, we will execute the following plan **ONE STEP AT A TIME**. Do NOT execute everything at once.

### Stage 1: Fix the Sync Jitter (Rubber-banding)
- **The Issue:** The UI locally extrapolates the song's position every 50ms. Every 1s, the background script sends the exact position. If they mismatch by a few milliseconds, the UI snaps backwards, causing the lyrics scrolling to judder.
- **The Plan:** Completely remove the `Math.abs(drift) > 0.5` snapping logic. Instead, track `lastSyncTime = Date.now()` and `lastSyncPosition` when a message arrives, and *only* project forward using pure chronological elapsed time. This guarantees zero rubber-banding.
- **Action:** Modify `setState` and `startTick` in `src/ui.js`.
- *STOP AND TEST AFTER THIS STAGE.*

### Stage 2: Fix the "Too Slow" Word Sweeping Animation
- **The Issue:** Because LRCLib provides sync times for whole lines (not words), my code stretches the word highlight animation across the *entire gap* before the next line. If the gap is 5 seconds, the sweep feels painfully slow.
- **The Plan:** Decouple word animation from gap duration. Set a fixed, natural reading speed (e.g., `~0.25s` per word). The line will fill up swiftly and pleasantly, then hold its lit state until the next line arrives. 
- **Action:** Refactor the `wordsHtml` mapping duration algorithm in `src/ui.js`.
- *STOP AND TEST AFTER THIS STAGE.*

### Stage 3: Refine the Romanize Button & Source Link
- **The Issue:** The LRCLib source link is tucked deep at the bottom of the lyrics scroll, making it annoying to reach. The Romanize button feels visually disjointed from the premium glassmorphic UI.
- **The Plan:** Redesign the `#vdi-lyrics-header`. Move the "Correct Lyrics" LRCLib link into the sticky header. Transform the Romanize button into a sleek, premium icon toggle inside the header, creating a unified "toolbar" aesthetic.
- **Action:** Overhaul DOM structure in `src/ui.js` and update `#vdi-lyrics-header` in `src/styles.js`.
- *STOP AND TEST AFTER THIS STAGE.*

---

*Take a deep breath and crush those finals! You can just point me to `PROJECT_PAUSE_STATE.md` when you are ready to continue.*
