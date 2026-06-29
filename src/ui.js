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
