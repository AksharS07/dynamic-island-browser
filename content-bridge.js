/**
 * Vivaldi Dynamic Island – Content Script Bridge
 *
 * This script is auto-injected into tabs by the Dynamic Island mod (via chrome.scripting).
 * It reads the page's Media Session API and responds to messages from the browser UI.
 *
 * Place this file alongside dynamic-island.js in:
 *   ..\Application\<VERSION>\resources\vivaldi\
 */

(function () {
  'use strict';

  // ── Listen for messages from the Dynamic Island in the browser UI ──
  window.addEventListener('message', handleWindowMessage);

  // chrome.runtime message bridge (when called from chrome.tabs.sendMessage)
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (!msg || !msg.type) return;

      if (msg.type === 'VDI_GET_MEDIA_STATE') {
        sendResponse(getMediaState());
        return true;
      }

      if (msg.type === 'VDI_MEDIA_ACTION') {
        handleAction(msg.action, msg.value);
      }
    });
  }

  function handleWindowMessage(e) {
    if (!e.data || e.data.source !== 'vivaldi-dynamic-island') return;
    if (e.data.type === 'VDI_MEDIA_ACTION') {
      handleAction(e.data.action, e.data.value);
    }
  }

  // ── Read current Media Session / media element state ──────────
  function getMediaState() {
    const ms = navigator.mediaSession;
    const el = findActiveMediaElement();

    const artwork = ms?.metadata?.artwork;
    const artworkSrc = artwork && artwork.length > 0 ? artwork[artwork.length - 1].src : null;

    return {
      title:     ms?.metadata?.title   || document.title || '',
      artist:    ms?.metadata?.artist  || '',
      album:     ms?.metadata?.album   || '',
      artwork:   artworkSrc,
      isPlaying: ms?.playbackState === 'playing' || (el ? !el.paused : false),
      duration:  el?.duration  || 0,
      position:  el?.currentTime || 0,
    };
  }

  // ── Find the primary playing media element on the page ─────────
  function findActiveMediaElement() {
    const candidates = [
      ...document.querySelectorAll('video, audio'),
    ];
    // Prefer playing elements; then paused; then first
    return (
      candidates.find(el => !el.paused && !el.ended) ||
      candidates.find(el => el.paused && el.currentTime > 0) ||
      candidates[0] ||
      null
    );
  }

  // ── Execute media actions ──────────────────────────────────────
  function handleAction(action, value) {
    const ms = navigator.mediaSession;
    const el = findActiveMediaElement();

    try {
      switch (action) {
        case 'play':
          if (ms?.actionHandlers?.get('play')) ms.callActionHandler?.('play', null);
          else el?.play();
          break;

        case 'pause':
          if (ms?.actionHandlers?.get('pause')) ms.callActionHandler?.('pause', null);
          else el?.pause();
          break;

        case 'toggle':
          if (el) {
            if (el.paused) {
              if (ms?.actionHandlers?.get('play')) ms.callActionHandler?.('play', null);
              else el.play();
            } else {
              if (ms?.actionHandlers?.get('pause')) ms.callActionHandler?.('pause', null);
              else el.pause();
            }
          }
          break;

        case 'prev':
          if (ms?.actionHandlers?.get('previoustrack'))
            ms.callActionHandler?.('previoustrack', null);
          else if (el) el.currentTime = 0;
          break;

        case 'next':
          if (ms?.actionHandlers?.get('nexttrack'))
            ms.callActionHandler?.('nexttrack', null);
          break;

        case 'seek':
          if (el && typeof value === 'number') {
            el.currentTime = value;
          }
          break;
      }
    } catch (e) {
      // Gracefully ignore if Media Session or element not accessible
    }
  }
})();
