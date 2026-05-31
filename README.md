# Vivaldi Dynamic Island

A native UI mod for the Vivaldi Browser that adds an interactive, macOS-style Dynamic Island to the top of the browser window. It automatically detects media playing in any tab (like YouTube or YouTube Music) and provides a floating control center with synchronized lyrics, album art, and playback controls.

![Demo Placeholder - Replace with a GIF or Screenshot of the Island](screenshot.png)

## Why I Built This

I wanted to see if I could bring an Apple-style UI concept into a desktop web browser. Vivaldi is unique because its entire UI is built using standard web technologies (HTML/CSS/JS). Instead of building a standard Chrome extension—which is sandboxed and restricted to the webpage viewport—I decided to inject a script directly into Vivaldi's core `browser.html` file. 

This allowed the Island to break out of the webpage and live natively in the browser's title bar, acting as a global UI component regardless of what tab is active.

## Features

* **Global Media Polling**: Silently polls audio-emitting tabs in the background using Chrome's internal Extension APIs.
* **Synchronized Lyrics**: Parses `.lrc` files on the fly and syncs lyrics to the active song.
* **Interactive Timeline**: Click anywhere on the progress bar or the lyrics to seek the track.
* **Hardware-Accelerated UI**: Built entirely in Vanilla JS and CSS3 without bulky frameworks to ensure zero lag.
* **Instant UX Feedback**: Custom visual locking mechanism that masks network buffering latency when skipping tracks.

## Technical Challenges

**The YouTube Music Offset Bug**
One of the biggest hurdles was keeping the Island's progress bar in sync with YouTube Music. I originally tried pulling timestamps directly from the `<video>` elements, but I noticed the Island was showing wildly incorrect durations (e.g., 4:50 instead of 3:59).

I eventually realized that for cropped tracks, YouTube Music loads the *entire* music video into the background, but uses Javascript to apply a mathematical offset to hide the intro. Relying on standard media APIs returned the raw, uncropped physical video length. 

To fix this, I built a custom DOM scraper that reads the logical timestamps directly from YouTube Music's UI (e.g., scraping the text "0:06 / 3:59"). The script then calculates the exact offset between the UI and the physical video element, translating logical clicks on the Island back into absolute physical timestamps.

## Installation

Since this modifies the core browser UI, it cannot be distributed via the Chrome Web Store.

1. Close Vivaldi.
2. Clone or download this repository.
3. Right-click `UPDATE (Run as Admin).bat` and run it as an Administrator.
4. The script will automatically locate your Vivaldi installation, back up your original `browser.html`, and inject the mod.
5. Reopen Vivaldi.

*Note: You will need to re-run the `.bat` script whenever Vivaldi installs a major browser update, as updates overwrite `browser.html`.*

## Stack

* **Vanilla Javascript** (ES5/ES6 compatible to ensure stability within the Vivaldi UI loop)
* **CSS3** (Transforms, transitions, and z-index layering)
* **Windows Batch Scripting** (For the automated installer)
