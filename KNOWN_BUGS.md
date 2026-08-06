# Known Bugs & Planned Fixes (Pre-v1.6)

> **IMPORTANT FOR AI AGENTS:** Read `DEVELOPER_NOTES.md` before making ANY changes.
> The popup (`popup.html`/`popup.js`) and the content script (`ui.js`) communicate
> via `chrome.storage.local`. The in-page settings panel works by directly modifying
> the `settings` object in memory + calling `updateUI()`. The popup relies on the
> `chrome.storage.onChanged` listener in `ui.js` (lines ~1326-1336).

---

## ✅ FIXED (pushed August 6, 2026)

### 1. Popup version string showed v1.3
- **File:** `chrome-extension/popup.html` line 13
- **Fix:** Changed hardcoded `v1.3` to `v1.5`

### 2. Popup toggles did not affect the island
- **Root cause:** Key naming mismatch. `popup.js` saved `hideYouTube`, but `ui.js`
  listened for `vdi_cfg_hideYouTube`. The `vdi_cfg_` prefix was dead code.
- **Files fixed:** `src/ui.js` lines 1308-1336 — removed `vdi_cfg_` prefix from
  `storage.local.get()` and `storage.onChanged` listener keys.

### 3. Missing Spotify and Apple Music hide toggles in popup
- **Files:** `chrome-extension/popup.html`, `chrome-extension/popup.js`
- **Fix:** Added two new toggle rows and wired them up following the existing pattern.

### 4. Popup preset buttons don't move the island
- **Root cause:** `popup.js` saved keys `vdi_pos_x`, `vdi_pos_y`, `vdi_transform` to storage,
  but `ui.js` used `vdi_loc_x` and `vdi_loc_y`. Also, `ui.js`'s `storage.onChanged`
  listener did not listen for these position keys.
- **Fix:** Changed popup to save `vdi_loc_x` and `vdi_loc_y`. Added a check in `ui.js`
  `storage.onChanged` to call `applyPos()` when position keys change.

---

## 🟡 OPEN BUGS (Fix before August 15 deadline)

### 4. Play/Pause button renders as solid colored circle
- **Severity:** Visual (cosmetic)
- **Description:** The expanded play/pause button (`#vdi-play` / `#vdi-pp`) sometimes
  renders as a solid accent-colored circle with no visible play/pause icon inside.
  The SVG path is present in the DOM but visually invisible.
- **Likely cause:** The SVG `fill="currentColor"` inherits the accent color, but the
  button background is also set to the accent color, making icon invisible. OR the
  SVG viewBox/path is not rendering correctly.
- **Where to look:** 
  - `src/ui.js` line 53 — the `#vdi-play` button HTML
  - `src/styles.js` — search for `#vdi-play`, `.vdi-btn` CSS rules
  - `src/ui.js` `setPlayIcon()` function (line ~225)
- **Risk level:** LOW — CSS-only fix, no logic changes needed

### 5. Island elements get squished/elongated/oval
- **Severity:** Visual (cosmetic)
- **Description:** Sometimes the island UI elements (buttons, icons) appear
  squished or elongated, as if the container aspect ratio is wrong.
- **Likely cause:** CSS flex/grid layout interaction with the dynamic width/height
  transitions during expand/collapse animation. May also be caused by the island
  inheriting unexpected styles from the host page's CSS.
- **Where to look:**
  - `src/styles.js` — the `#vdi` container styles, especially `width`, `height`,
    `transition`, and flex properties
  - Check if styles use `!important` to prevent host page CSS bleed
- **Risk level:** MEDIUM — CSS changes could affect animations

### 7. Font inconsistency across operating systems
- **Severity:** Visual (cosmetic)
- **Description:** Fonts look inconsistent, especially on Ubuntu/Linux where the
  default system font differs from Windows/Mac.
- **Fix approach:** Add a cross-platform system font stack to the island's root CSS:
  ```css
  #vdi, #vdi * {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
                 'Helvetica Neue', Ubuntu, sans-serif;
  }
  ```
- **Where to look:** `src/styles.js` — the `#vdi` root styles
- **Risk level:** LOW — CSS-only, no logic changes

---

## 📋 Testing Matrix

When fixing any bug, test across this matrix before pushing:

| Browser | YouTube | YT Music | Spotify | Apple Music |
|---------|---------|----------|---------|-------------|
| Zen (Firefox) | ☐ | ☐ | ☐ | ☐ |
| Chrome/Edge | ☐ | ☐ | ☐ | ☐ |

**Test checklist per combination:**
- [ ] Island appears and shows metadata
- [ ] Play/pause button works and shows correct icon
- [ ] Lyrics sync correctly
- [ ] Hide toggles work (popup AND in-page settings)
- [ ] Position presets work (popup AND in-page settings)
- [ ] PiP teleportation works
- [ ] Island collapses/expands smoothly (no squishing)

---

## 🗓️ Hackathon Deadlines

| Hackathon | Deadline (IST) | Status |
|-----------|---------------|--------|
| Build Beyond | Aug 16, 12:15 PM | ⏳ First priority |
| QuantumHacks | Aug 21, 5:30 AM | ⏳ |
| ImpactForge | Aug 24, 12:15 PM | ⏳ |
| Hack The Limit | Aug 30, 12:15 PM | ⏳ |

**Strategy:** Fix bug #7 before Aug 15. Bugs #4 and #5 can wait for post-hackathon v1.6.
