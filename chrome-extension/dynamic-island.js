/**
 * Dynamic Island - Shared Core Module
 * Common utilities, color extraction, and lyrics handling
 */

var VDI = VDI || {};

VDI.Core = (function() {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  // Time formatting
  // ─────────────────────────────────────────────────────────────
  function formatTime(s) {
    if (!s || !isFinite(s) || s < 0) return '0:00';
    s = Math.floor(s);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  // ─────────────────────────────────────────────────────────────
  // Play/Pause icon SVG paths
  // ─────────────────────────────────────────────────────────────
  var ICONS = {
    play: '<path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"/>',
    pause: '<path d="M8 19c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2s2 .9 2 2v10c0 1.1-.9 2-2 2zm8 0c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2s2 .9 2 2v10c0 1.1-.9 2-2 2z"/>'
  };

  function getPlayIcon(playing) {
    return playing ? ICONS.pause : ICONS.play;
  }

  // ─────────────────────────────────────────────────────────────
  // Color extraction from album art
  // ─────────────────────────────────────────────────────────────
  function extractVibrant(url, cb) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      try {
        var W = 40, H = 40;
        var cv = document.createElement('canvas');
        cv.width = W;
        cv.height = H;
        var cx = cv.getContext('2d');
        cx.drawImage(img, 0, 0, W, H);
        var d = cx.getImageData(0, 0, W, H).data;

        // 36 buckets for hue ranges (10 degrees each)
        var buckets = new Array(36);
        for (var i = 0; i < 36; i++) {
          buckets[i] = { sumS: 0, maxS: 0, r: 0, g: 0, b: 0 };
        }

        for (var i = 0; i < W * H * 4; i += 4) {
          var r = d[i] / 255;
          var g = d[i + 1] / 255;
          var b = d[i + 2] / 255;
          var mx = Math.max(r, g, b);
          var mn = Math.min(r, g, b);
          var l = (mx + mn) / 2;
          var delta = mx - mn;

          // Skip very dark, very light, or grayscale pixels
          if (l < 0.05 || l > 0.95 || delta < 0.02) continue;

          var sat = delta / (1 - Math.abs(2 * l - 1));

          // Calculate hue
          var h = 0;
          if (mx === r) h = ((g - b) / delta) % 6;
          else if (mx === g) h = (b - r) / delta + 2;
          else h = (r - g) / delta + 4;
          h = Math.round(h * 60);
          if (h < 0) h += 360;

          var bIdx = Math.floor(h / 10) % 36;
          var score = sat * (l > 0.5 ? (1 - l) * 2 : l * 2);
          buckets[bIdx].sumS += score;

          if (sat > buckets[bIdx].maxS) {
            buckets[bIdx].maxS = sat;
            buckets[bIdx].r = r;
            buckets[bIdx].g = g;
            buckets[bIdx].b = b;
          }
        }

        // Find the bucket with highest saturation score
        var best = null;
        var maxSum = -1;
        for (var j = 0; j < 36; j++) {
          if (buckets[j].sumS > maxSum) {
            maxSum = buckets[j].sumS;
            best = buckets[j];
          }
        }

        if (!best || maxSum === 0) {
          cb(null);
          return;
        }

        // Convert to HSL with boosted saturation
        var mxA = Math.max(best.r, best.g, best.b);
        var mnA = Math.min(best.r, best.g, best.b);
        var hA = 0, sA = 0, lA = (mxA + mnA) / 2;

        if (mxA !== mnA) {
          var dA = mxA - mnA;
          sA = lA > 0.5 ? dA / (2 - mxA - mnA) : dA / (mxA + mnA);
          if (mxA === best.r) hA = (best.g - best.b) / dA + (best.g < best.b ? 6 : 0);
          else if (mxA === best.g) hA = (best.b - best.r) / dA + 2;
          else hA = (best.r - best.g) / dA + 4;
          hA = Math.round(hA * 60);
        }

        // Boost saturation and constrain lightness
        // Avoid making dull colors look "dirty" and avoid blowing out saturated colors
        sA = sA < 0.05 ? 0 : Math.min(1, sA * 1.2 + 0.1);
        lA = Math.max(0.35, Math.min(0.7, lA));

        cb({
          accent: 'hsl(' + hA + ',' + Math.round(sA * 100) + '%,' + Math.round(lA * 100) + '%)',
          gradient: 'linear-gradient(135deg, hsl(' + hA + ',' + Math.round(sA * 100) + '%,' + Math.round(lA * 100) + '%), hsl(' + ((hA + 35) % 360) + ',' + Math.round(sA * 90) + '%,' + Math.round((lA - 0.15) * 100) + '%))',
          dark: 'hsl(' + hA + ', ' + Math.round(sA * 40) + '%, 12%)',
          glow: 'hsla(' + hA + ', ' + Math.round(sA * 100) + '%, ' + Math.round(lA * 100) + '%, 0.45)'
        });
      } catch (e) {
        cb(null);
      }
    };
    img.onerror = function() {
      cb(null);
    };
    img.src = url;
  }

  // ─────────────────────────────────────────────────────────────
  // High-Res Album Art Fetching (iTunes API)
  // ─────────────────────────────────────────────────────────────
  function fetchHighResArt(title, artist, cb) {
    if (!title) return cb(null);
    var cleanTitle = title.replace(/\(.*(?:official|music|lyric|video|audio).*\)/i, '').trim();
    var cleanArtist = (artist || '').replace(/\(.*(?:official|music|lyric|video|audio).*\)/i, '').trim();
    var term = encodeURIComponent(cleanTitle + ' ' + cleanArtist);
    fetch('https://itunes.apple.com/search?term=' + term + '&media=music&limit=1')
      .then(function(res) {
        if (!res.ok) throw new Error('Bad status');
        return res.json();
      })
      .then(function(data) {
        if (data.results && data.results.length > 0 && data.results[0].artworkUrl100) {
          var url = data.results[0].artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg');
          cb(url);
        } else {
          cb(null);
        }
      })
      .catch(function(e) {
        cb(null);
      });
  }

  // ─────────────────────────────────────────────────────────────
  // Lyrics fetching from lrclib.net
  // ─────────────────────────────────────────────────────────────
  var LYRICS_API = 'https://lrclib.net/api/search';

  function fetchLyrics(title, artist, duration, cb) {
    var cleanTitle = title.replace(/\(.*(?:official|music|lyric|video|audio).*\)/i, '').trim();
    var cleanArtist = (artist || '').replace(/\(.*(?:official|music|lyric|video|audio).*\)/i, '').trim();
    
    var q = cleanTitle + ' ' + cleanArtist;
    var params = 'q=' + encodeURIComponent(q.trim());
    var targetUrl = LYRICS_API + '?' + params;

    function parseLRCLib(data) {
      if (!data) return null;
      var lines = [];
      var synced = false;
      if (data.syncedLyrics) {
        synced = true;
        var raw = data.syncedLyrics.split('\n');
        var rawLines = [];
        for (var i = 0; i < raw.length; i++) {
          var m = raw[i].match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
          if (m) {
            rawLines.push({
              time: parseInt(m[1]) * 60 + parseFloat(m[2]),
              text: m[3].trim(),
              translation: ''
            });
          }
        }
        rawLines.sort(function(a, b) { return a.time - b.time; });
        for (var i = 0; i < rawLines.length; i++) {
          var text = rawLines[i].text;
          // If empty text, check if there's a significant gap (instrumental break)
          if (!text) {
            var nextIdx = -1;
            for (var j = i + 1; j < rawLines.length; j++) {
              if (rawLines[j].text) { nextIdx = j; break; }
            }
            var gap = nextIdx > -1 ? rawLines[nextIdx].time - rawLines[i].time : 0;
            if (gap >= 5) {
              // This is an instrumental break — insert a ♪ marker
              lines.push({ time: rawLines[i].time, text: '♪', translation: '' });
            }
            continue;
          }
          lines.push(rawLines[i]);
        }
        // Also check for a long intro before the first lyric
        if (lines.length > 0 && lines[0].time >= 5) {
          lines.unshift({ time: 0, text: '♪', translation: '' });
        }
      } else if (data.plainLyrics) {
        synced = false;
        var plines = data.plainLyrics.split('\n');
        for (var j = 0; j < plines.length; j++) {
          lines.push({ time: 0, text: plines[j].trim() });
        }
      }
      if (lines.length === 0) return null;
      var trackUrl = data.id ? 'https://lrclib.net/track/' + data.id : 'https://lrclib.net';
      return { lines: lines, synced: synced, url: trackUrl };
    }

    function doFetch(url, isProxy) {
      fetch(url)
        .then(function(res) {
          if (!res.ok) throw new Error('Bad status');
          return res.json();
        })
        .then(function(responseData) {
          var data = null;
          if (Array.isArray(responseData)) {
            for (var i = 0; i < responseData.length; i++) {
              if (responseData[i].syncedLyrics) {
                data = responseData[i];
                break;
              }
            }
            if (!data && responseData.length > 0) data = responseData[0];
          } else {
            data = responseData;
          }
          
          var result = parseLRCLib(data);
          if (result) {
            cb(result.lines, result.synced, result.url);
          } else {
            throw new Error('No lyrics in response');
          }
        })
        .catch(function(err) {
          if (!isProxy) {
            // Fallback to proxy to bypass Vivaldi CORS/Cloudflare UA blocks
            doFetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(targetUrl), true);
          } else {
            cb(null, null);
          }
        });
    }

    doFetch(targetUrl, false);
  }

  // ─────────────────────────────────────────────────────────────
  // Batch Romanization via Google Translate API
  // ─────────────────────────────────────────────────────────────
  function batchRomanize(lines, cb) {
    if (!lines || lines.length === 0) return cb([]);
    
    var CHUNK_MAX = 800; // Safe chunk size for URL encoding
    var chunks = [];
    var currentChunk = [];
    var currentLen = 0;
    
    for (var i = 0; i < lines.length; i++) {
      var text = lines[i].text || '';
      // Skip instrumentals
      if (text === '♪' || text === '♫' || text === '&nbsp;' || !text.trim()) {
        currentChunk.push({ index: i, text: '' });
        continue;
      }
      var len = encodeURIComponent(text).length;
      if (currentLen + len > CHUNK_MAX && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentLen = 0;
      }
      currentChunk.push({ index: i, text: text });
      currentLen += len + 3; // +3 for \n
    }
    if (currentChunk.length > 0) chunks.push(currentChunk);

    var results = new Array(lines.length);
    var completed = 0;

    if (chunks.length === 0) return cb(results);

    chunks.forEach(function(chunk) {
      // Strip existing pipes to avoid delimiter collision
      var texts = chunk.map(function(c) { return c.text ? c.text.replace(/\|/g, ' ') : ''; }).filter(Boolean);
      if (texts.length === 0) {
        chunk.forEach(function(c) { results[c.index] = ''; });
        completed++;
        if (completed === chunks.length) cb(results);
        return;
      }

      var q = texts.join(' | ');
      var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=rm&q=' + encodeURIComponent(q);
      
      fetch(url)
        .then(function(res) { return res.json(); })
        .then(function(data) {
          var romStr = '';
          if (data && data[0]) {
            for (var j = 0; j < data[0].length; j++) {
              if (data[0][j][3]) { // Romanization is usually at index 3
                romStr += data[0][j][3];
              } else if (data[0][j][2]) {
                romStr += data[0][j][2];
              }
            }
          }
          var romLines = romStr.split(/\s*\|\s*/);
          var idx = 0;
          chunk.forEach(function(c) {
            if (!c.text) {
              results[c.index] = '';
            } else {
              var rLine = romLines[idx] || '';
              // Occasionally GT capitalizes the first letter after a pipe, we can leave it
              results[c.index] = rLine.trim();
              idx++;
            }
          });
          completed++;
          if (completed === chunks.length) cb(results);
        })
        .catch(function() {
          chunk.forEach(function(c) { results[c.index] = ''; });
          completed++;
          if (completed === chunks.length) cb(results);
        });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Tab media state extraction (injected into content pages)
  // ─────────────────────────────────────────────────────────────
  function getTabMediaState() {
    var vids = document.querySelectorAll('video');
    var auds = document.querySelectorAll('audio');
    var isYTMusic = window.location.hostname === 'music.youtube.com';
    var pipOk = !!(!isYTMusic && document.pictureInPictureEnabled && vids.length &&
          Array.prototype.slice.call(vids).some(function(v) { return !v.disablePictureInPicture; }));

    var uiDur = null;
    var uiCur = null;

    try {
      if (isYTMusic) {
        var timeInfo = document.querySelector('.time-info.ytmusic-player-bar');
        if (timeInfo) {
          var parts = timeInfo.textContent.trim().split('/');
          if (parts.length === 2) {
            var parseTime = function(str) {
              var p = str.trim().split(':').map(Number);
              return p.length === 2 ? p[0] * 60 + p[1] : (p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : 0);
            };
            uiCur = parseTime(parts[0]);
            uiDur = parseTime(parts[1]);
          }
        }

        // The UI text is rounded to integers. Use the hidden player API for millisecond precision!
        var player = document.getElementById('movie_player');
        if (player && typeof player.getCurrentTime === 'function') {
          try {
            var pTime = player.getCurrentTime();
            if (pTime >= 0) uiCur = pTime;
          } catch (e) {}
        }
      } else if (window.location.hostname.indexOf('youtube.com') > -1) {
        var td = document.querySelector('.ytp-time-duration');
        if (td) {
          uiDur = td.textContent.trim().split(':').reduce(function(a, v) {
            return (60 * a) + parseInt(v);
          }, 0);
        }
      }
    } catch (e) {}

    // Find the best video element
    var el = null;

    // For YouTube (non-Music), match by duration
    if (uiDur !== null && uiDur > 0 && !isYTMusic) {
      for (var i = 0; i < vids.length; i++) {
        if (Math.abs(vids[i].duration - uiDur) <= 2) {
          el = vids[i];
          break;
        }
      }
    }

    // Find currently playing video
    if (!el) {
      for (var i = 0; i < vids.length; i++) {
        if (!vids[i].paused && vids[i].currentTime > 0) {
          el = vids[i];
          break;
        }
      }
    }

    // Fallback to main video selector
    if (!el) el = document.querySelector('.html5-main-video');
    if (!el && vids.length) el = vids[vids.length - 1];
    if (!el && auds.length) el = auds[0];

    try {
      var ms = navigator.mediaSession;
      var art = null;
      if (ms && ms.metadata && ms.metadata.artwork && ms.metadata.artwork.length) {
        art = ms.metadata.artwork[ms.metadata.artwork.length - 1].src;
      }

      return {
        title: (ms && ms.metadata && ms.metadata.title) || '',
        artist: (ms && ms.metadata && ms.metadata.artist) || '',
        artwork: art,
        isPlaying: (ms && ms.playbackState === 'playing') || (el ? !el.paused : false),
        duration: (uiDur !== null && uiDur > 0) ? uiDur : (el ? (isFinite(el.duration) ? el.duration : 0) : 0),
        position: (uiCur !== null && uiDur > 0) ? uiCur : (el ? el.currentTime : 0),
        hasMedia: !!(el || (ms && ms.metadata && ms.metadata.title)),
        volume: el ? el.volume : 1,
        pipOk: pipOk,
        isFullscreen: !!document.fullscreenElement,
        isYouTubeVideo: location.hostname.includes('youtube.com') && !location.hostname.includes('music.youtube.com'),
        isMusicApp: location.hostname.includes('music.youtube') || location.hostname.includes('spotify') || location.hostname.includes('soundcloud') || location.hostname.includes('music.apple')
      };
    } catch (e) {
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Media actions (injected into content pages)
  // ─────────────────────────────────────────────────────────────
  function executeMediaAction(act, val) {
    try {
      var els = Array.prototype.slice.call(document.querySelectorAll('video,audio'));
      var el = null;

      // Find active element
      for (var i = 0; i < els.length; i++) {
        if (!els[i].paused && !els[i].ended) {
          el = els[i];
          break;
        }
      }
      if (!el) {
        for (var j = 0; j < els.length; j++) {
          if (els[j].paused && els[j].currentTime > 0) {
            el = els[j];
            break;
          }
        }
      }
      if (!el && els.length) el = els[0];

      if (act === 'toggle') {
        if (el) {
          if (el.paused) el.play();
          else el.pause();
        }
      } else if (act === 'prev') {
        if (el) {
          var pb = document.querySelector('ytmusic-player-bar .previous-button') ||
                   document.querySelector('.ytp-prev-button') ||
                   document.querySelector('.previous-button');
          if (pb) pb.click();
          else el.currentTime = 0;
        }
      } else if (act === 'next') {
        if (el) {
          var nb = document.querySelector('ytmusic-player-bar .next-button') ||
                   document.querySelector('.ytp-next-button') ||
                   document.querySelector('.next-button');
          if (nb) nb.click();
          else el.currentTime = el.duration;
        }
      } else if (act === 'seek' && typeof val === 'number') {
        var isYTM = window.location.hostname === 'music.youtube.com';
        var v = document.querySelectorAll('video');
        var u = null;
        var uc = null;

        try {
          if (isYTM) {
            var t = document.querySelector('.time-info.ytmusic-player-bar');
            if (t) {
              var p = t.textContent.trim().split('/');
              if (p.length === 2) {
                var pT = function(s) {
                  var z = s.trim().split(':').map(Number);
                  return z.length === 2 ? z[0] * 60 + z[1] : (z.length === 3 ? z[0] * 3600 + z[1] * 60 + z[2] : 0);
                };
                uc = pT(p[0]);
                u = pT(p[1]);
              }
            }
          } else {
            var td = document.querySelector('.ytp-time-duration');
            if (td) {
              u = td.textContent.trim().split(':').reduce(function(a, x) {
                return (60 * a) + parseInt(x);
              }, 0);
            }
          }
        } catch (e) {}

        var target = null;
        if (u > 0 && !isYTM) {
          for (var i = 0; i < v.length; i++) {
            if (Math.abs(v[i].duration - u) <= 2) {
              target = v[i];
              break;
            }
          }
        }
        if (!target) target = document.querySelector('.html5-main-video');
        if (!target && v.length) target = v[v.length - 1];

        if (target) {
          if (isYTM && uc !== null && u > 0) {
            var offset = target.currentTime - uc;
            target.currentTime = val + offset;
          } else {
            target.currentTime = val;
          }
        }
      }
    } catch (e) {}
  }

  function togglePiP(sourceInfo) {
    function teleportBack() {
      if (sourceInfo) {
        try {
          if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ type: 'VDI_TELEPORT_BACK', source: sourceInfo });
          }
        } catch (e) {}
      }
    }

    function showPiPOverlay(videoElement) {
      if (document.getElementById('vdi-pip-overlay')) return;
      var overlay = document.createElement('div');
      overlay.id = 'vdi-pip-overlay';
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.zIndex = '2147483647'; // Max z-index
      overlay.style.cursor = 'pointer';
      overlay.style.background = 'rgba(0, 0, 0, 0.7)';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.backdropFilter = 'blur(5px)';
      overlay.style.transition = 'opacity 0.2s';
      
      var msg = document.createElement('div');
      msg.style.background = 'rgba(255, 255, 255, 0.1)';
      msg.style.color = '#fff';
      msg.style.padding = '20px 30px';
      msg.style.borderRadius = '16px';
      msg.style.fontFamily = 'system-ui, sans-serif';
      msg.style.fontSize = '20px';
      msg.style.fontWeight = '600';
      msg.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
      msg.style.border = '1px solid rgba(255,255,255,0.2)';
      msg.innerHTML = '<div style="margin-bottom:8px;font-size:24px;text-align:center;">🎬</div>Click anywhere to enter Picture-in-Picture';
      
      overlay.appendChild(msg);
      
      overlay.onclick = function() {
        overlay.style.opacity = '0';
        setTimeout(function() { overlay.remove(); }, 200);
        try {
          videoElement.requestPictureInPicture().then(function() {
            teleportBack();
          }).catch(function() {
            teleportBack();
          });
        } catch (e) {
          teleportBack();
        }
      };
      
      document.body.appendChild(overlay);
    }

    try {
      var vids = Array.prototype.slice.call(document.querySelectorAll('video'));
      var v = null;
      for (var i = 0; i < vids.length; i++) {
        if (!vids[i].paused) {
          v = vids[i];
          break;
        }
      }
      if (!v && vids.length) v = vids[0];
      if (!v || !document.pictureInPictureEnabled) return false;

      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().then(function() {
          teleportBack();
        }).catch(function() {
          teleportBack();
        });
        return true;
      }

      // Try direct first (works in Chrome Extension with user gesture)
      var promise = v.requestPictureInPicture();
      if (promise && promise.catch) {
        promise.then(function() {
          teleportBack();
        }).catch(function(err) {
          showPiPOverlay(v);
        });
      }
      return true;
    } catch (e) {
      showPiPOverlay(v);
      return true;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────
  return {
    formatTime: formatTime,
    getPlayIcon: getPlayIcon,
    extractVibrant: extractVibrant,
    fetchLyrics: fetchLyrics,
    batchRomanize: batchRomanize,
    getTabMediaState: getTabMediaState,
    executeMediaAction: executeMediaAction,
    togglePiP: togglePiP
  };
})();


/**
 * Dynamic Island - Shared CSS Styles
 * Generates CSS string based on configuration
 */

var VDI = VDI || {};

VDI.Styles = (function() {
  'use strict';

  var DEFAULTS = {
    accent: '#6366f1',
    gradient: 'linear-gradient(135deg,#6366f1,#a855f7)',
    dark: 'hsl(244,40%,6%)'
  };

  function generate(opts) {
    opts = opts || {};
    var islandTop = opts.islandTop || 10;
    var accent = opts.accent || DEFAULTS.accent;
    var gradient = opts.gradient || DEFAULTS.gradient;
    var dark = opts.dark || DEFAULTS.dark;

    var rules = [];

    // ═══════════════════════════════════════════════════════════
    // Main Container
    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi{',
        'position:fixed;top:' + islandTop + 'px;left:50%;transform:translateX(-50%);',
        'z-index:2147483647;border-radius:32px;overflow:hidden;user-select:none;cursor:default;',
        'width:168px;height:34px;',
        'background:var(--vdi-dark,' + dark + ');',
        'box-shadow:0 0 0 1px rgba(255,255,255,.08),0 10px 40px rgba(0,0,0,.8),0 0 80px var(--vdi-glow,rgba(99,102,241,.18));',
        'opacity:0;pointer-events:none;',
        'font-family:-apple-system,Inter,Segoe UI,sans-serif;',
        'transition:width .55s cubic-bezier(.32,.72,0,1),height .55s cubic-bezier(.32,.72,0,1),',
          'border-radius .55s cubic-bezier(.32,.72,0,1),background .7s ease,box-shadow .7s ease,opacity .3s ease;',
      '}'
    );

    // State classes
    rules.push('#vdi.vdi-visible{opacity:1;pointer-events:all;}');
    rules.push('#vdi.vdi-expanded{width:400px;height:152px;border-radius:26px;}');
    rules.push('#vdi.vdi-idle{width:28px!important;height:28px!important;border-radius:14px!important;opacity:.95!important;}');

    // ═══════════════════════════════════════════════════════════
    // Collapsed Pill View
    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi-col{',
        'position:absolute;inset:0;display:flex;align-items:center;gap:8px;padding:0 13px;',
        'opacity:1;transition:opacity .18s ease;',
      '}'
    );
    rules.push('#vdi.vdi-expanded #vdi-col{opacity:0;pointer-events:none;}');
    rules.push('#vdi.vdi-idle #vdi-col{justify-content:center;padding:0;}');
    rules.push('#vdi.vdi-idle #vdi-col-text,#vdi.vdi-idle #vdi-col-btn{display:none;}');

    // EQ Visualizer
    rules.push(
      '#vdi-eq{',
        'display:flex;align-items:flex-end;justify-content:center;gap:3px;',
        'width:16px;height:12px;flex-shrink:0;',
      '}'
    );
    rules.push(
      '.vdi-eq-bar{',
        'width:3px;height:3px;',
        'background:var(--vdi-accent,' + accent + ');',
        'border-radius:1.5px;',
        'transition:height .15s ease, background .7s ease;',
      '}'
    );

    // Track text
    rules.push('#vdi-col-text{flex:1;overflow:hidden;white-space:nowrap;}');
    rules.push(
      '#vdi-col-inner{',
        'display:inline-block;font-size:11px;font-weight:500;color:rgba(255,255,255,.82);',
        'animation:vdi-scroll 9s linear infinite;',
      '}'
    );
    rules.push('@keyframes vdi-scroll{0%,28%{transform:translateX(0)}72%{transform:translateX(-55%)}100%{transform:translateX(0)}}');
    rules.push('#vdi-col-btn{width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;}');

    // ═══════════════════════════════════════════════════════════
    // Expanded View
    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi-exp{',
        'position:absolute;inset:0;display:flex;align-items:center;padding:14px 15px;gap:13px;',
        'opacity:0;transform:scale(.9);',
        'transition:opacity .28s ease .13s,transform .28s ease .13s;pointer-events:none;',
      '}'
    );
    rules.push('#vdi.vdi-expanded #vdi-exp{opacity:1;transform:scale(1);pointer-events:all;}');

    // Album Art
    rules.push(
      '#vdi-art{',
        'width:74px !important;height:74px !important;min-width:74px !important;min-height:74px !important;border-radius:14px !important;flex-shrink:0 !important;overflow:hidden !important;isolation:isolate !important;box-sizing:border-box !important;padding:0 !important;margin:0 !important;border:none !important;',
        'background:var(--vdi-grad,' + gradient + ');',
        'box-shadow:0 4px 20px rgba(0,0,0,.5);',
        'display:flex;align-items:center;justify-content:center;position:relative;',
        'transition:background .7s ease;',
      '}'
    );
    rules.push('#vdi-art img{position:absolute !important;inset:0 !important;width:100% !important;height:100% !important;max-width:100% !important;max-height:100% !important;object-fit:cover !important;border-radius:14px !important;opacity:0;transition:opacity .4s ease;box-sizing:border-box !important;padding:0 !important;margin:0 !important;border:none !important;display:block !important;min-width:100% !important;min-height:100% !important;}');
    rules.push('#vdi-art img.ok{opacity:1 !important;}');
    rules.push('#vdi-art-ph{font-size:28px;line-height:1;}');

    // Track Info
    rules.push('#vdi-track{flex:1;display:flex;flex-direction:column;gap:5px;min-width:0;}');
    rules.push('#vdi-title-row{display:flex;align-items:center;gap:6px;min-width:0;}');
    rules.push('#vdi-title{flex:1;font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}');

    rules.push('#vdi-artist{font-size:11px;color:rgba(255,255,255,.38);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}');

    // ═══════════════════════════════════════════════════════════
    // Progress Bar
    // ═══════════════════════════════════════════════════════════
    rules.push('#vdi-prog-row{display:flex;align-items:center;gap:5px;}');
    rules.push('.vdi-t{font-size:9px;color:rgba(255,255,255,.5);min-width:22px;}');
    rules.push('#vdi-prog{flex:1;height:4px;background:rgba(255,255,255,.15);border-radius:99px;cursor:pointer;position:relative;}');
    rules.push(
      '#vdi-prog-fill{',
        'height:100%;width:0%;border-radius:99px;',
        'background:var(--vdi-accent,' + accent + ') ;',
        'transition:width .6s linear, background .7s ease;',
      '}'
    );

    // ═══════════════════════════════════════════════════════════
    // Control Buttons
    // ═══════════════════════════════════════════════════════════
    rules.push('#vdi-ctrl-row{display:flex;align-items:center;justify-content:space-between;margin-top:6px;}');
    rules.push('#vdi-ctrl-main{display:flex;align-items:center;gap:6px;}');
    rules.push('#vdi-ctrl-extra{display:flex;align-items:center;gap:3px;}');

    // Standard button
    rules.push(
      '.vdi-btn{',
        'width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;',
        'display:flex;align-items:center;justify-content:center;',
        'background:rgba(255,255,255,.07);color:rgba(255,255,255,.75);',
        'transition:background .2s,transform .15s,color .15s;',
      '}'
    );
    rules.push('.vdi-btn:hover{background:rgba(255,255,255,.16);color:#fff;transform:scale(1.1);}');
    rules.push('.vdi-btn:active{transform:scale(.92);}');
    rules.push('.vdi-btn svg{width:16px;height:16px;pointer-events:none;}');

    // Icon button (smaller, square-ish)
    rules.push(
      '.vdi-icon-btn{',
        'width:28px;height:28px;border-radius:8px;border:none;cursor:pointer;',
        'display:flex;align-items:center;justify-content:center;',
        'background:rgba(255,255,255,.06);color:rgba(255,255,255,.55);',
        'transition:background .2s,color .2s,transform .15s;',
      '}'
    );
    rules.push('.vdi-icon-btn:hover{background:rgba(255,255,255,.15);color:#fff;transform:scale(1.08);}');
    rules.push('.vdi-icon-btn.active{color:var(--vdi-accent,' + accent + ');}');
    rules.push('.vdi-icon-btn.loading{pointer-events: none;}');
    rules.push(
      '.vdi-loading-dots{',
        'display:flex;gap:3px;align-items:center;justify-content:center;height:100%;',
      '}'
    );
    rules.push('.vdi-loading-dots span{width:4px;height:4px;background:currentColor;border-radius:50%;animation:vdi-bounce 0.6s infinite alternate;}');
    rules.push('.vdi-loading-dots span:nth-child(2){animation-delay:0.2s;}');
    rules.push('.vdi-loading-dots span:nth-child(3){animation-delay:0.4s;}');
    rules.push('@keyframes vdi-bounce{ 0%{transform:translateY(0);} 100%{transform:translateY(-3px);} }');
    rules.push('.vdi-icon-btn svg{width:15px;height:15px;pointer-events:none;}');

    // Play button (special styling)
    rules.push(
      '#vdi-play{',
        'width:40px;height:40px;border-radius:50%;',
        'background:var(--vdi-grad,' + gradient + ');',
        'color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.45);',
        'display:flex;align-items:center;justify-content:center;border:none;',
        'cursor:pointer;transition:background .7s ease, transform .15s;',
      '}'
    );
    rules.push('#vdi-play:hover{transform:scale(1.08);filter:brightness(1.1);}');
    rules.push('#vdi-play svg{width:18px;height:18px;}');

    // ═══════════════════════════════════════════════════════════
    // Lyrics Panel
    // ═══════════════════════════════════════════════════════════
    var lyricsTop = islandTop + 165;
    rules.push(
      '#vdi-lyrics-panel{',
        'position:fixed;top:' + lyricsTop + 'px;left:50%;transform:translateX(-50%) translateY(-10px);',
        'z-index:2147483646;width:400px;height:380px;border-radius:32px;overflow:hidden;',
        'background:rgba(0,0,0,0.5);backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);',
        'border:1px solid rgba(255,255,255,0.08);box-shadow:0 12px 40px rgba(0,0,0,0.6);',
        'opacity:0;pointer-events:none;',
        'transition:opacity 0.4s cubic-bezier(.32,.72,0,1), transform 0.4s cubic-bezier(.32,.72,0,1);',
        'display:flex;flex-direction:column;padding:24px 0;',
      '}'
    );
    rules.push('#vdi-lyrics-panel.show{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:all;}');

    rules.push(
      '#vdi-lyrics-scroll{',
        'flex:1;overflow-y:auto;scroll-behavior:smooth;padding:0 32px;',
        'mask-image:linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);',
        '-webkit-mask-image:linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);',
      '}'
    );
    rules.push('#vdi-lyrics-scroll::-webkit-scrollbar{display:none;}');

    // Lyric lines
    rules.push(
      '.vdi-lyric-line{',
        'font-size:22px;font-weight:700;line-height:1.6;color:rgba(255,255,255,0.3);',
        'padding:16px 0;',
        'margin: 0 10px;',
        'transition:color 0.8s ease, transform 0.8s cubic-bezier(0.2,0.8,0.2,1), filter 0.8s ease;',
        'transform-origin:center center;cursor:pointer;',
        'filter:blur(2px);transform:scale(0.95);',
      '}'
    );
    rules.push('.vdi-lyric-line:hover{color:rgba(255,255,255,0.6);filter:blur(0px);}');
    rules.push(
      '.vdi-lyric-line.active{',
        'transform:scale(1.05);text-shadow:0 4px 20px rgba(0,0,0,0.5);filter:blur(0px);',
        'color: #fff;',
      '}'
    );
    rules.push(
      '.vdi-full-line{',
        'display:inline-block;',
        'color:rgba(255,255,255,0.3);',
        'transition: color 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), filter 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);',
        'filter: blur(1px);',
      '}'
    );
    rules.push('.vdi-lyric-line.active .vdi-full-line{color:#fff; filter: blur(0px); text-shadow: 0 0 16px rgba(255,255,255,0.3); transition: color 0.3s ease-out, filter 0.3s ease-out, text-shadow 0.3s ease-out;}');
    rules.push('#vdi-romanize-btn:hover{background:rgba(255,255,255,0.2) !important; color:#fff !important;}');
    rules.push('#vdi-romanize-btn.active{background:#fff !important; color:#000 !important;}');
    rules.push('@keyframes sweep{ 0%{background-position:100% 0;} 100%{background-position:0% 0;} }');
    rules.push('.vdi-lyric-line.unsynced{font-size:16px;color:rgba(255,255,255,0.8);transform:none;filter:none;}');
    rules.push('.vdi-lyric-translation{font-size:14px;color:rgba(255,255,255,0.5);margin-top:6px;font-weight:500;}');
    rules.push(
      '.vdi-lyrics-source{',
        'font-size:12px;color:rgba(255,255,255,0.4);margin-top:40px;text-align:center;',
      '}'
    );
    rules.push(
      '.vdi-lyrics-source a{',
        'color:rgba(255,255,255,0.6);text-decoration:none;font-weight:600;transition:color 0.2s;',
      '}'
    );
    rules.push('.vdi-lyrics-source a:hover{color:#fff;}');
    rules.push(
      '.vdi-instrumental-wrapper{',
        'display:flex;justify-content:center;align-items:center;height:40px;margin-top:8px;',
      '}'
    );
    rules.push(
      '.vdi-instrumental{',
        'position:relative;width:32px;height:32px;',
      '}'
    );
    rules.push(
      '.vdi-note-bg, .vdi-note-fill{',
        'position:absolute;top:0;left:0;width:100%;height:100%;',
        'fill:rgba(255,255,255,0.2);',
      '}'
    );
    rules.push(
      '.vdi-note-fill{',
        'fill:#fff;',
        'clip-path:inset(100% 0 0 0);',
        '-webkit-clip-path:inset(100% 0 0 0);',
      '}'
    );
    rules.push('.vdi-lyric-line.active .vdi-note-fill{animation:fillup var(--line-dur, 2s) linear forwards;}');
    rules.push('@keyframes fillup{ 0%{clip-path:inset(100% 0 0 0);-webkit-clip-path:inset(100% 0 0 0);} 100%{clip-path:inset(0 0 0 0);-webkit-clip-path:inset(0 0 0 0);} }');

    return rules.join('');
  }

  return {
    generate: generate,
    DEFAULTS: DEFAULTS
  };
})();


/**
 * Dynamic Island - Chrome Extension Platform
 * Content script that communicates with background service worker
 */

var VDI = VDI || {};

VDI.Platform = VDI.Platform || {};

VDI.Platform.ChromeExt = (function() {
  'use strict';

  /* Content Script Side */

  function sendAction(action, value) {
    chrome.runtime.sendMessage({
      type: 'VDI_ACTION',
      act: action,
      val: value
    });
  }

  function jumpToTab() {
    chrome.runtime.sendMessage({ type: 'VDI_ACTION', act: 'jump' });
  }

  function requestPiP() {
    chrome.runtime.sendMessage({ type: 'VDI_ACTION', act: 'pip' });
  }

  function requestState(callback) {
    try {
      chrome.runtime.sendMessage({ type: 'VDI_REQUEST_STATE' }, function(state) {
        if (callback) callback(state);
      });
    } catch (e) {
      if (callback) callback(null);
    }
  }

  function onStateUpdate(callback) {
    chrome.runtime.onMessage.addListener(function(msg) {
      if (msg.type === 'VDI_UPDATE') {
        callback(msg.state);
      }
    });
  }

  /* Background Script Side (for background.js) */

  function createBackgroundWorker() {
    var S = {
      isPlaying: false,
      title: '',
      artist: '',
      artwork: null,
      duration: 0,
      position: 0,
      hasMedia: false,
      tabId: null,
      windowId: null,
      supportsPiP: false
    };

    var pollInterval = 1000;

    function execInTab(tabId, fn, args, cb) {
      if (!tabId) {
        if (cb) cb(null);
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId: tabId, allFrames: false },
        func: fn,
        args: args || [],
        world: 'ISOLATED'
      }, function(res) {
        if (chrome.runtime.lastError || !res) {
          console.warn('[VDI] execInTab failed:', chrome.runtime.lastError);
          if (cb) cb(null);
          return;
        }
        if (cb) cb(res[0] ? res[0].result : null);
      });
    }

    function broadcastState() {
      chrome.tabs.query({}, function(tabs) {
        for (var i = 0; i < tabs.length; i++) {
          chrome.tabs.sendMessage(tabs[i].id, { type: 'VDI_UPDATE', state: S }, function() {
            if (chrome.runtime.lastError) {} // suppress "no listener" errors
          });
        }
      });
    }

    function poll() {
      chrome.tabs.query({ audible: true }, function(tabs) {
        var tab = (tabs && tabs.length) ? tabs[0] : null;

        if (!tab) {
          if (S.tabId !== null) {
            execInTab(S.tabId, VDI.Core.getTabMediaState, [], function(res) {
              if (!res) {
                S.hasMedia = false;
                broadcastState();
                return;
              }
              S.title = res.title || S.title;
              S.artist = res.artist || S.artist;
              S.artwork = res.artwork || S.artwork;
              S.isPlaying = res.isPlaying;
              S.duration = res.duration;
              S.position = res.position;
              S.supportsPiP = res.pipOk || false;
              S.isFullscreen = res.isFullscreen || false;
              S.isYouTubeVideo = res.isYouTubeVideo || false;
              S.isMusicApp = res.isMusicApp || false;
              if (!res.hasMedia) S.hasMedia = false;
              broadcastState();
            });
          } else if (S.hasMedia) {
            S.hasMedia = false;
            broadcastState();
          }
          return;
        }

        S.tabId = tab.id;
        S.windowId = tab.windowId;

        execInTab(tab.id, VDI.Core.getTabMediaState, [], function(res) {
          if (!res) {
            S.hasMedia = true;
            broadcastState();
            return;
          }

          S.hasMedia = res.hasMedia || true;
          S.isPlaying = res.isPlaying;
          S.title = res.title || tab.title || '';
          S.artist = res.artist || '';
          S.artwork = res.artwork || null;
          S.duration = res.duration || 0;
          S.position = res.position || 0;
          S.supportsPiP = res.pipOk || false;
          S.isYouTubeVideo = res.isYouTubeVideo || false;
          S.isMusicApp = res.isMusicApp || false;

          broadcastState();
        });
      });
    }

    function multiPoll(callback, intervals) {
      intervals.forEach(function(delay) {
        setTimeout(callback, delay);
      });
    }

    function handleMessage(msg, sender, sendResponse) {
      if (msg.type === 'VDI_ACTION') {
        if (msg.act === 'pip') {
          var sourceTabId = (sender && sender.tab) ? sender.tab.id : null;
          var sourceWinId = (sender && sender.tab) ? sender.tab.windowId : null;
          
          if (S.tabId !== null && sourceTabId !== S.tabId) {
            // Teleport to the media tab so the user can interact with the overlay
            chrome.tabs.update(S.tabId, { active: true }, function() {
              if (S.windowId !== null) {
                chrome.windows.update(S.windowId, { focused: true }, function() {
                  execInTab(S.tabId, VDI.Core.togglePiP, [{tabId: sourceTabId, winId: sourceWinId}], null);
                });
              } else {
                execInTab(S.tabId, VDI.Core.togglePiP, [{tabId: sourceTabId, winId: sourceWinId}], null);
              }
            });
          } else {
            execInTab(S.tabId, VDI.Core.togglePiP, [null], null);
          }
        } else if (msg.act === 'jump') {
          if (S.tabId !== null) {
            chrome.tabs.update(S.tabId, { active: true });
            if (S.windowId !== null) {
              chrome.windows.update(S.windowId, { focused: true });
            }
          }
        } else {
          var args = msg.val !== undefined ? [msg.act, msg.val] : [msg.act];
          execInTab(S.tabId, VDI.Core.executeMediaAction, args, null);

          // Rapid poll after actions
          multiPoll(poll, [200, 500, 1000]);
        }
      } else if (msg.type === 'VDI_TELEPORT_BACK' && msg.source) {
        if (msg.source.tabId) chrome.tabs.update(msg.source.tabId, { active: true });
        if (msg.source.winId) chrome.windows.update(msg.source.winId, { focused: true });
      } else if (msg.type === 'VDI_REQUEST_STATE') {
        sendResponse(S);
      }
    }

    function start() {
      setInterval(poll, pollInterval);
      poll();

      chrome.runtime.onMessage.addListener(handleMessage);
      chrome.tabs.onActivated.addListener(function() { poll(); });
      chrome.windows.onFocusChanged.addListener(function() { poll(); });

      chrome.runtime.onInstalled.addListener(function(details) {
        if (details.reason === "update") {
          chrome.tabs.create({ url: "patch-notes.html" });
        }
      });
    }

    return {
      start: start,
      getState: function() { return S; }
    };
  }

  return {
    // Content script methods
    sendAction: sendAction,
    jumpToTab: jumpToTab,
    requestPiP: requestPiP,
    requestState: requestState,
    onStateUpdate: onStateUpdate,

    // Background script factory
    createBackgroundWorker: createBackgroundWorker
  };
})();


/**
 * Dynamic Island - Shared UI Component
 * Manages the DOM, interactions, and visual updates
 */

var VDI = VDI || {};

VDI.UI = (function() {
  'use strict';

  var DEFAULTS = VDI.Styles.DEFAULTS;

  function createIsland(opts) {
    opts = opts || {};

    var island = document.createElement('div');
    island.id = 'vdi';

    island.innerHTML =
      '<div id="vdi-col">' +
        '<div id="vdi-eq">' +
          '<div class="vdi-eq-bar b1"></div>' +
          '<div class="vdi-eq-bar b2"></div>' +
          '<div class="vdi-eq-bar b3"></div>' +
        '</div>' +
        '<div id="vdi-col-text"><span id="vdi-col-inner">No media</span></div>' +
        '<div id="vdi-col-btn"><svg id="vdi-col-icon" viewBox="0 0 24 24" fill="white" width="10" height="10">' + VDI.Core.getPlayIcon(false) + '</svg></div>' +
      '</div>' +
      '<div id="vdi-exp">' +
        '<div id="vdi-art">' +
          '<div id="vdi-art-ph">\uD83C\uDFB5</div>' +
          '<img id="vdi-art-img" src="" alt="" crossorigin="anonymous"/>' +
        '</div>' +
        '<div id="vdi-track">' +
          '<div id="vdi-title-row">' +
            '<div id="vdi-title">No media</div>' +
          '</div>' +
          '<div id="vdi-artist">Open a media tab</div>' +
          '<div id="vdi-prog-row">' +
            '<span class="vdi-t" id="vdi-pos">0:00</span>' +
            '<div id="vdi-prog"><div id="vdi-prog-fill"></div></div>' +
            '<span class="vdi-t" id="vdi-dur" style="text-align:right">0:00</span>' +
          '</div>' +
          '<div id="vdi-ctrl-row">' +
            '<div id="vdi-ctrl-main">' +
              '<button class="vdi-btn" id="vdi-prev" title="Previous"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></button>' +
              '<button class="vdi-btn" id="vdi-play" title="Play/Pause"><svg id="vdi-pp" viewBox="0 0 24 24" fill="currentColor">' + VDI.Core.getPlayIcon(false) + '</svg></button>' +
              '<button class="vdi-btn" id="vdi-next" title="Next"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></button>' +
            '</div>' +
            '<div id="vdi-ctrl-extra">' +
              '<button class="vdi-icon-btn" id="vdi-lyr-btn" title="Lyrics">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>' +
              '</button>' +
              '<button class="vdi-icon-btn" id="vdi-pip-main-btn" title="Picture-in-Picture" style="display:none;">' +
                '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 7H9c-1.1 0-2 .9-2 2v3H5v3h2v3c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 10H9v-3h4v-3h6v6z"/></svg>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    return island;
  }

  function createLyricsPanel(opts) {
    opts = opts || {};
    var panel = document.createElement('div');
    panel.id = 'vdi-lyrics-panel';
    panel.innerHTML = 
      '<button id="vdi-romanize-btn" title="Show Romanization (KR/JP)" style="display:none; position:absolute; top:12px; right:12px; z-index:100; background:rgba(255,255,255,0.1); border:none; border-radius:50%; width:32px; height:32px; color:rgba(255,255,255,0.6); cursor:pointer; align-items:center; justify-content:center; transition:all 0.2s;">' +
        '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">' +
          '<path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>' +
        '</svg>' +
      '</button>' +
      '<div id="vdi-lyrics-scroll"></div>';
    return panel;
  }

  function createController(island, lyrPanel, platform, opts) {
    opts = opts || {};
    var isVivaldi = opts.isVivaldi || false;

    var state = {
      isPlaying: false,
      title: '',
      artist: '',
      artwork: null,
      duration: 0,
      position: 0,
      hasMedia: false,
      tabId: null,
      windowId: null,
      lastArtwork: null,
      lastArtTitle: null,
      supportsPiP: false,
      lyricsOn: false,
      lyricsLines: [],
      lyricsIdx: -1,
      lastLyricsKey: '',
      isIdle: false,
      lyricsSynced: false,
      romanizeOn: false,
      hasNonLatin: false
    };

    var idleTimer = null;
    var colTimer = null;
    var tickInterval = opts.tickInterval || 1000;
    var idleDelay = opts.idleDelay || 9000;
    var collapseDelay = opts.collapseDelay || 500;

    // Helper
    function $(id) { return document.getElementById(id); }

    // Theme application
    function applyTheme(c) {
      var accent = c ? c.accent : DEFAULTS.accent;
      var grad = c ? c.gradient : DEFAULTS.gradient;
      var dark = c ? c.dark : DEFAULTS.dark;
      var glow = c ? c.glow : 'rgba(99,102,241,.2)';

      island.style.setProperty('--vdi-accent', accent);
      island.style.setProperty('--vdi-grad', grad);
      island.style.setProperty('--vdi-dark', dark);
      island.style.setProperty('--vdi-glow', glow);
    }

    // Update progress bar
    function refreshProgress() {
      var pct = state.duration > 0 ? Math.min(100, (state.position / state.duration) * 100) : 0;
      $('vdi-prog-fill').style.width = pct + '%';
      $('vdi-pos').textContent = VDI.Core.formatTime(state.position);
      $('vdi-dur').textContent = VDI.Core.formatTime(state.duration);
    }

    // Update play/pause icons
    function setPlayIcon(playing) {
      var svg = VDI.Core.getPlayIcon(playing);
      if ($('vdi-pp')) $('vdi-pp').innerHTML = svg;
      if ($('vdi-col-icon')) $('vdi-col-icon').innerHTML = svg;
    }

    // Main UI update
    function updateUI() {
      var isBrowserFs = document.getElementById('browser') && document.getElementById('browser').classList.contains('fullscreen');
      var hideIsland = !state.hasMedia || state.isFullscreen || isBrowserFs || document.fullscreenElement;

      if (hideIsland) {
        island.style.display = 'none';
        if (lyrPanel) lyrPanel.style.display = 'none';
        return;
      }
      island.style.display = '';
      if (lyrPanel) lyrPanel.style.display = '';
      island.classList.add('vdi-visible');

      var label = [state.title, state.artist].filter(Boolean).join(' \u2014 ') || 'Now Playing';
      $('vdi-col-inner').textContent = label;
      $('vdi-title').textContent = state.title || 'Unknown Track';
      $('vdi-artist').textContent = state.artist || 'Unknown Artist';

      setPlayIcon(state.isPlaying);

      if (state.supportsPiP && !state.isMusicApp) {
        $('vdi-pip-main-btn').style.display = 'flex';
      } else {
        $('vdi-pip-main-btn').style.display = 'none';
      }

      if (state.isYouTubeVideo || state.hasLyrics === false) {
        $('vdi-lyr-btn').style.display = 'none';
      } else {
        $('vdi-lyr-btn').style.display = 'flex';
      }

      // Album art
      if (state.artwork && (state.artwork !== state.lastArtwork || state.title !== state.lastArtTitle)) {
        // If we already fetched high res for this exact title, and the background gave us the low res again, ignore it!
        var skipArtUpdate = (state.highResFetchedFor === state.title && state.artwork.includes('i.ytimg.com'));

        if (!skipArtUpdate) {
          state.lastArtwork = state.artwork;
          state.lastArtTitle = state.title;
          var img = $('vdi-art-img');
          img.classList.remove('ok');
          
          var loadImg = function(url) {
            img.src = url;
            img.onload = function() {
              img.classList.add('ok');
              $('vdi-art-ph').style.display = 'none';
            };
            img.onerror = function() {
              $('vdi-art-ph').style.display = 'flex';
            };
          };

          if (state.artwork.includes('i.ytimg.com') || state.artwork.includes('hqdefault')) {
            loadImg(state.artwork); // Load low res first
            if (VDI.Core.fetchHighResArt && state.highResFetchedFor !== state.title) {
              state.highResFetchedFor = state.title; // Mark as fetched immediately to prevent race conditions
              VDI.Core.fetchHighResArt(state.title, state.artist, function(highResUrl) {
                if (highResUrl) {
                  state.artwork = highResUrl;
                  state.lastArtwork = highResUrl;
                  // Swap to high res, color extractor will pick it up
                  var tempImg = new Image();
                  tempImg.onload = function() {
                    img.src = highResUrl;
                    VDI.Core.extractVibrant(tempImg, function(rgb) {
                      if (rgb) {
                        $('vdi').style.background = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
                      }
                    });
                  };
                  tempImg.crossOrigin = 'Anonymous';
                  tempImg.src = highResUrl;
                }
              });
            }
          } else {
            loadImg(state.artwork);
          }
          
          VDI.Core.extractVibrant(state.artwork, applyTheme);
        }
      } else if (!state.artwork && state.lastArtwork) {
        state.lastArtwork = null;
        var im2 = $('vdi-art-img');
        im2.classList.remove('ok');
        im2.src = '';
        $('vdi-art-ph').style.display = 'flex';
        applyTheme(null);
      }

      refreshProgress();
    }

    // Lyrics handling
    function fetchAndRenderLyrics() {
      var key = state.title + '|' + state.artist;
      state.lastLyricsKey = key;
      state.lyricsLines = [];
      state.lyricsIdx = -1;
      state.lyricsSynced = false;
      state.hasLyrics = undefined;

      $('vdi-lyr-btn').classList.add('loading');
      $('vdi-lyr-btn').innerHTML = '<div class="vdi-loading-dots"><span></span><span></span><span></span></div>';
      $('vdi-lyrics-scroll').innerHTML = '<div class="vdi-lyric-line unsynced" style="text-align:center;margin-top:50px;">Loading lyrics...</div>';

      try {
        var cached = localStorage.getItem('vdi_lyr_' + key);
        if (cached) {
          var data = JSON.parse(cached);
          if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
            // Use cached if < 24h old
            renderLyricsData(data.lines, data.synced, data.url, key);
            return;
          }
        }
      } catch(e) {}

      VDI.Core.fetchLyrics(state.title, state.artist, state.duration, function(lines, synced, url) {
        if (key !== state.lastLyricsKey) return;
        
        if (lines) {
          try {
            localStorage.setItem('vdi_lyr_' + key, JSON.stringify({ lines: lines, synced: synced, url: url, timestamp: Date.now() }));
          } catch (e) {}
        }
        renderLyricsData(lines, synced, url, key);
      });

    }

    function renderLyricsData(lines, synced, url, key) {
        if (key !== state.lastLyricsKey) return;

        $('vdi-lyr-btn').classList.remove('loading');
        $('vdi-lyr-btn').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>';

        if (!lines || !lines.length) {
          state.hasLyrics = false;
          $('vdi-lyr-btn').style.display = 'none';
          if (state.lyricsOn) {
            state.lyricsOn = false;
            var panel = $('vdi-lyrics-panel');
            if (panel) panel.classList.remove('show');
            resetIdle();
          }
          return;
        }

        state.hasLyrics = true;
        state.lyricsLines = lines;
        state.lyricsSynced = synced;

        // Detect if any lines have non-Latin script
        var anyNonLatin = false;
        var hasKanjiOrKana = function(t) {
          for (var i = 0; i < t.length; i++) {
            var c = t.charCodeAt(i);
            if (c >= 0x0400 && c <= 0x04FF) return true; // Cyrillic
            if (c >= 0x0900 && c <= 0x0D7F) return true; // Indic
            if (c >= 0xAC00 && c <= 0xD7A3) return true; // Hangul
            if (c >= 0x3040 && c <= 0x9FFF) return true; // CJK
          }
          return false;
        };

        for (var c = 0; c < lines.length; c++) {
          if (hasKanjiOrKana(lines[c].text || '')) {
            anyNonLatin = true;
            break;
          }
        }
        state.hasNonLatin = anyNonLatin;

        var html = '';
        for (var k = 0; k < lines.length; k++) {
          var cls = synced ? 'vdi-lyric-line' : 'vdi-lyric-line unsynced';
          var text = lines[k].text || '&nbsp;';
          var wordsHtml = '&nbsp;';
          
          var duration = 2; // default fallback
          if (synced && k < lines.length - 1) {
            duration = lines[k+1].time - lines[k].time;
            if (duration < 0.5) duration = 0.5;
          } else if (synced) {
            duration = 4; // last line
          }

          if (text.indexOf('♪') > -1 || text.indexOf('♫') > -1 || text === '♪') {
            var notePath = 'M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z';
            wordsHtml = '<div class="vdi-instrumental-wrapper"><div class="vdi-instrumental">' +
              '<svg class="vdi-note-bg" viewBox="0 0 24 24"><path d="' + notePath + '"/></svg>' +
              '<svg class="vdi-note-fill" viewBox="0 0 24 24"><path d="' + notePath + '"/></svg>' +
            '</div></div>';
            cls += ' vdi-lyr-inst vdi-instrumental-break';
          } else {
            // Full line highlight nicely instead of word-by-word
            wordsHtml = '<span class="vdi-full-line" style="--line-dur: ' + duration + 's;">' + text.replace(/\n/g, '<br>') + '</span>';
          }

          var transHtml = '';
          if (lines[k].translation) {
            transHtml = '<div class="vdi-lyric-translation">' + lines[k].translation + '</div>';
          }

          html += '<div class="' + cls + '" id="vdi-lyr-' + k + '">' + wordsHtml + transHtml + '</div>';
        }
        $('vdi-lyrics-scroll').innerHTML = html;
        $('vdi-lyr-btn').style.display = state.isYouTubeVideo ? 'none' : 'flex';

        // Async fetch romanization if needed
        if (anyNonLatin && VDI.Core.batchRomanize) {
          VDI.Core.batchRomanize(lines, function(roms) {
            if (key !== state.lastLyricsKey) return;
            for (var r = 0; r < roms.length; r++) {
              var romText = roms[r];
              var lineEl = document.getElementById('vdi-lyr-' + r);
              var origText = lines[r].text || '';
              if (lineEl && romText && romText.toLowerCase() !== origText.toLowerCase() && origText.indexOf('♪') === -1) {
                var romDiv = document.createElement('div');
                romDiv.className = 'vdi-lyric-roman';
                romDiv.textContent = romText;
                romDiv.style.display = state.romanizeOn ? 'block' : 'none';
                
                var transDiv = lineEl.querySelector('.vdi-lyric-translation');
                if (transDiv) {
                  lineEl.insertBefore(romDiv, transDiv);
                } else {
                  lineEl.appendChild(romDiv);
                }
              }
            }
          });
        }

        // Show/hide romanize toggle
        var romBtn = $('vdi-romanize-btn');
        if (romBtn) {
          romBtn.style.display = anyNonLatin ? 'flex' : 'none';
          romBtn.classList.toggle('active', state.romanizeOn);
          romBtn.onclick = function() {
            state.romanizeOn = !state.romanizeOn;
            romBtn.classList.toggle('active', state.romanizeOn);
            var allRoman = document.querySelectorAll('.vdi-lyric-roman');
            for (var r = 0; r < allRoman.length; r++) {
              allRoman[r].style.display = state.romanizeOn ? 'block' : 'none';
            }
            // Re-scroll to active line after layout shift
            setTimeout(function() {
              var activeLine = document.querySelector('.vdi-lyric-line.active');
              if (activeLine) {
                activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 50);
          };
          // Apply initial state
          var allRoman = document.querySelectorAll('.vdi-lyric-roman');
          for (var r = 0; r < allRoman.length; r++) {
            allRoman[r].style.display = state.romanizeOn ? 'block' : 'none';
          }
        }

        if (state.lyricsOn) lyrPanel.classList.add('show');

        // Bind click handlers for synced lyrics
        if (synced) {
          for (var n = 0; n < lines.length; n++) {
            (function(tTarget, idx) {
              var lineEl = document.getElementById('vdi-lyr-' + idx);
              if (lineEl) {
                lineEl.addEventListener('click', function(e) {
                  e.stopPropagation();
                  state.position = tTarget;
                  refreshProgress();
                  platform.sendAction(state.tabId, 'seek', tTarget);
                });
              }
            })(lines[n].time, n);
          }
        }
      }

    function syncLyrics() {
      if (!state.lyricsLines.length || !state.lyricsSynced) return;

      var pos = state.position;
      var idx = -1;

      for (var i = state.lyricsLines.length - 1; i >= 0; i--) {
        if (state.lyricsLines[i].time <= pos + 0.3) {
          idx = i;
          break;
        }
      }

      if (idx !== state.lyricsIdx && idx >= 0) {
        if (state.lyricsIdx >= 0) {
          var old = $('vdi-lyr-' + state.lyricsIdx);
          if (old) old.classList.remove('active');
        }
        state.lyricsIdx = idx;
        var cur = $('vdi-lyr-' + idx);
        if (cur) {
          cur.classList.add('active');
          if (state.lyricsOn) {
            cur.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    }

    // Idle handling
    function resetIdle() {
      clearTimeout(idleTimer);
      if (state.isIdle) {
        state.isIdle = false;
        island.classList.remove('vdi-idle');
      }
      idleTimer = setTimeout(function() {
        if (!state.hasMedia) return;
        if (state.lyricsOn) return; // Never collapse if lyrics are open
        state.isIdle = true;
        island.classList.add('vdi-idle');
      }, idleDelay);
    }

    // Expand/collapse
    function handleMouseEnter() {
      clearTimeout(colTimer);
      if (state.isIdle) {
        state.isIdle = false;
        island.classList.remove('vdi-idle');
      }
      island.classList.add('vdi-expanded');
      resetIdle();
    }

    function handleMouseLeave() {
      clearTimeout(colTimer);
      colTimer = setTimeout(function() {
        island.classList.remove('vdi-expanded');
        if (state.lyricsOn) {
          state.lyricsOn = false;
          $('vdi-lyr-btn').classList.remove('active');
          lyrPanel.classList.remove('show');
        }
      }, collapseDelay);
      resetIdle();
    }

    // Event binding
    function bindEvents() {
      island.addEventListener('mouseenter', handleMouseEnter);
      island.addEventListener('mouseleave', handleMouseLeave);
      lyrPanel.addEventListener('mouseenter', handleMouseEnter);
      lyrPanel.addEventListener('mouseleave', handleMouseLeave);

      document.addEventListener('mousemove', function(e) {
        if (!state.hasMedia) return;
        var r = island.getBoundingClientRect();
        if (e.clientX >= r.left - 80 && e.clientX <= r.right + 80 &&
            e.clientY >= r.top - 60 && e.clientY <= r.bottom + 60) {
          resetIdle();
        }
      });

      // Double-click to jump to tab
      island.addEventListener('dblclick', function() {
        platform.jumpToTab(state.tabId, state.windowId);
      });

      // Controls
      $('vdi-prev').addEventListener('click', function(e) {
        e.stopPropagation();
        platform.sendAction(state.tabId, 'prev');
      });

      $('vdi-next').addEventListener('click', function(e) {
        e.stopPropagation();
        platform.sendAction(state.tabId, 'next');
      });

      $('vdi-play').addEventListener('click', function(e) {
        e.stopPropagation();
        platform.sendAction(state.tabId, 'toggle');
        state.isPlaying = !state.isPlaying;
        setPlayIcon(state.isPlaying);
      });

      $('vdi-prog').addEventListener('click', function(e) {
        e.stopPropagation();
        if (!state.duration) return;
        var r = e.currentTarget.getBoundingClientRect();
        state.position = ((e.clientX - r.left) / r.width) * state.duration;
        refreshProgress();
        platform.sendAction(state.tabId, 'seek', state.position);
      });

      $('vdi-pip-main-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        if (!opts.isVivaldi && typeof VDI !== 'undefined' && VDI.Core && VDI.Core.togglePiP) {
          var success = VDI.Core.togglePiP();
          if (!success && platform.requestPiP) {
            platform.requestPiP(state.tabId);
          }
        } else if (platform.requestPiP) {
          platform.requestPiP(state.tabId);
        }
      });

      $('vdi-lyr-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        state.lyricsOn = !state.lyricsOn;
        $('vdi-lyr-btn').classList.toggle('active', state.lyricsOn);

        if (state.lyricsOn) {
          lyrPanel.classList.add('show');
          if (state.lyricsSynced && state.lyricsIdx >= 0) {
            var cur = $('vdi-lyr-' + state.lyricsIdx);
            if (cur) cur.scrollIntoView({ behavior: 'auto', block: 'center' });
          }
        } else {
          lyrPanel.classList.remove('show');
        }
      });
    }

    // Tick update
    var lastTickTime = Date.now();
    function startTick() {
      setInterval(function() {
        var now = Date.now();
        var dt = (now - lastTickTime) / 1000.0;
        lastTickTime = now;
        
        if (state.isPlaying && state.duration > 0) {
          state.position = Math.min(state.duration, state.position + dt);
          refreshProgress();
        }
        syncLyrics();
      }, 50);

      // EQ animation
      setInterval(function() {
        var bars = document.querySelectorAll('.vdi-eq-bar');
        if (!bars.length) return;
        for (var i = 0; i < bars.length; i++) {
          if (!state.isPlaying) {
            bars[i].style.height = '3px';
          } else {
            bars[i].style.height = Math.floor(4 + Math.random() * 9) + 'px';
          }
        }
      }, 200);
    }

    // Fullscreen handling
    function setupFullscreen() {
      // Chrome Extension context: injected directly into the page, so standard HTML5 API works instantly

      // 2. Chrome Extension context: injected directly into the page, so standard HTML5 API works perfectly
      document.addEventListener('fullscreenchange', function() {
        if (document.fullscreenElement) {
          island.style.display = 'none';
          if (lyrPanel) lyrPanel.style.display = 'none';
        } else {
          island.style.display = '';
          if (lyrPanel) lyrPanel.style.display = '';
        }
      });
    }

    // Public state getter/setter
    function setState(newState) {
      if (!newState) return;

      var prevKey = state.title + '|' + state.artist;

      state.hasMedia = newState.hasMedia;
      state.isPlaying = newState.isPlaying;
      state.title = newState.title;
      state.artist = newState.artist;
      state.artwork = newState.artwork;
      state.duration = newState.duration;
      
      // Drift check constraint to prevent stuttering
      // Only forcefully overwrite the UI's smooth-scrolled position if it drifts by >2.0s or if media just started/paused
      if (Math.abs(state.position - newState.position) > 2.0 || newState.position === 0 || !newState.isPlaying) {
        state.position = newState.position;
      }
      state.supportsPiP = newState.supportsPiP;
      state.isFullscreen = newState.isFullscreen;
      state.isYouTubeVideo = newState.isYouTubeVideo;
      state.isMusicApp = newState.isMusicApp;
      state.tabId = newState.tabId !== undefined ? newState.tabId : state.tabId;
      state.windowId = newState.windowId !== undefined ? newState.windowId : state.windowId;

      updateUI();

      var key = state.title + '|' + state.artist;
      if (key !== prevKey && state.title) {
        fetchAndRenderLyrics();
      }
    }

    function getState() {
      return state;
    }

    // Initialize
    function init() {
      bindEvents();
      startTick();
      setupFullscreen();
      resetIdle();
    }

    return {
      init: init,
      setState: setState,
      getState: getState,
      updateUI: updateUI,
      refreshProgress: refreshProgress
    };
  }

  return {
    createIsland: createIsland,
    createLyricsPanel: createLyricsPanel,
    createController: createController
  };
})();



(function() {
  'use strict';

  // Guard: only run once
  if (document.getElementById('vdi')) return;

  // Inject CSS
  var css = document.createElement('style');
  css.id = 'vdi-css';
  css.textContent = VDI.Styles.generate({ islandTop: 10 });
  document.head.appendChild(css);

  // Create UI
  var island = VDI.UI.createIsland();
  var lyrPanel = VDI.UI.createLyricsPanel();
  document.body.appendChild(island);
  document.body.appendChild(lyrPanel);

  // Platform adapter (Chrome Extension)
  var platform = {
    sendAction: function(tabId, action, value) {
      VDI.Platform.ChromeExt.sendAction(action, value);
    },
    jumpToTab: VDI.Platform.ChromeExt.jumpToTab,
    requestPiP: VDI.Platform.ChromeExt.requestPiP
  };

  // Create controller
  var ctrl = VDI.UI.createController(island, lyrPanel, platform, {
    isVivaldi: false,
    tickInterval: 1000,
    idleDelay: 9000,
    collapseDelay: 500
  });

  ctrl.init();

  // Listen for state updates from background
  VDI.Platform.ChromeExt.onStateUpdate(function(newState) {
    ctrl.setState(newState);
  });

  // Request initial state
  VDI.Platform.ChromeExt.requestState(function(state) {
    if (state) {
      ctrl.setState(state);
    }
  });

})();
