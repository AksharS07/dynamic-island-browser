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
