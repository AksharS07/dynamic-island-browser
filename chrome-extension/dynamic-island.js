(function () {
  'use strict';

  if (document.getElementById('vdi')) return;

  var CFG = {
    collapseDelay  : 500,
    tickInterval   : 1000,
    idleDelay      : 9000,
    islandTop      : 10,
    defaultAccent  : '#6366f1',
    defaultGradient: 'linear-gradient(135deg,#6366f1,#a855f7)',
    defaultDark    : 'hsl(244,40%,6%)',
    lyricsApi      : 'https://lrclib.net/api/get',
  };

  var S = {
    isPlaying   : false,
    title       : '',
    artist      : '',
    artwork     : null,
    duration    : 0,
    position    : 0,
    hasMedia    : false,
    lastArtwork : null,
    supportsPiP : false,
    lyricsOn    : false,
    lyricsLines : [],
    lyricsIdx   : -1,
    lastLyricsKey: '',
    isIdle      : false,
  };

  var css = document.createElement('style');
  css.id = 'vdi-css';
  css.textContent = [
    '#vdi{',
      'position:fixed;top:' + CFG.islandTop + 'px;left:50%;transform:translateX(-50%);',
      'z-index:2147483647;border-radius:32px;overflow:hidden;user-select:none;cursor:default;',
      'width:168px;height:34px;',
      'background:var(--vdi-dark,' + CFG.defaultDark + ');',
      'box-shadow:0 0 0 1px rgba(255,255,255,.08),0 10px 40px rgba(0,0,0,.8),0 0 80px var(--vdi-glow,rgba(99,102,241,.18));',
      'opacity:0;pointer-events:none;',
      'font-family:-apple-system,Inter,Segoe UI,sans-serif;',
      'transition:width .55s cubic-bezier(.32,.72,0,1),height .55s cubic-bezier(.32,.72,0,1),',
        'border-radius .55s cubic-bezier(.32,.72,0,1),background .7s ease,box-shadow .7s ease,opacity .3s ease;',
    '}',
    '#vdi.vdi-visible{opacity:1;pointer-events:all;}',
    '#vdi.vdi-expanded{width:400px;height:152px;border-radius:26px;}',
    '#vdi.vdi-idle{width:28px!important;height:28px!important;border-radius:14px!important;opacity:.95!important;}',

    '#vdi-col{position:absolute;inset:0;display:flex;align-items:center;gap:8px;padding:0 13px;opacity:1;transition:opacity .18s ease;}',
    '#vdi.vdi-expanded #vdi-col{opacity:0;pointer-events:none;}',
    '#vdi.vdi-idle #vdi-col{justify-content:center;padding:0;}',
    '#vdi.vdi-idle #vdi-col-text, #vdi.vdi-idle #vdi-col-btn {display:none;}',
    '#vdi-eq{display:flex;align-items:flex-end;justify-content:center;gap:3px;width:16px;height:12px;flex-shrink:0;}',
    '.vdi-eq-bar{width:3px;height:3px;background:var(--vdi-accent,' + CFG.defaultAccent + ');border-radius:1.5px;transition:height .15s ease, background .7s ease;}',
    '#vdi-col-text{flex:1;overflow:hidden;white-space:nowrap;}',
    '#vdi-col-inner{display:inline-block;font-size:11px;font-weight:500;color:rgba(255,255,255,.82);animation:vdi-scroll 9s linear infinite;}',
    '@keyframes vdi-scroll{0%,28%{transform:translateX(0)}72%{transform:translateX(-55%)}100%{transform:translateX(0)}}',
    '#vdi-col-btn{width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;}',

    '#vdi-exp{position:absolute;inset:0;display:flex;align-items:center;padding:14px 15px;gap:13px;',
      'opacity:0;transform:scale(.9);transition:opacity .28s ease .13s,transform .28s ease .13s;pointer-events:none;}',
    '#vdi.vdi-expanded #vdi-exp{opacity:1;transform:scale(1);pointer-events:all;}',

    '#vdi-art{width:74px;height:74px;border-radius:14px;flex-shrink:0;overflow:hidden;isolation:isolate;',
      'background:var(--vdi-grad,' + CFG.defaultGradient + ');',
      'box-shadow:0 4px 20px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;position:relative;',
      'transition:background .7s ease;}',
    '#vdi-art img{position:absolute;inset:0;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:cover;border-radius:14px;opacity:0;transition:opacity .4s ease;}',
    '#vdi-art img.ok{opacity:1;}',
    '#vdi-art-ph{font-size:28px;line-height:1;}',

    '#vdi-track{flex:1;display:flex;flex-direction:column;gap:5px;min-width:0;}',
    '#vdi-title-row{display:flex;align-items:center;gap:6px;min-width:0;}',
    '#vdi-title{flex:1;font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#vdi-pip-btn{width:22px;height:22px;border-radius:6px;border:none;background:rgba(255,255,255,.07);',
      'color:rgba(255,255,255,.55);display:none;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;',
      'transition:background .2s,color .2s,transform .15s;}',
    '#vdi-pip-btn.show{display:flex;}',
    '#vdi-pip-btn:hover{background:rgba(255,255,255,.14);color:#fff;transform:scale(1.1);}',
    '#vdi-pip-btn svg{width:13px;height:13px;pointer-events:none;}',
    '#vdi-artist{font-size:11px;color:rgba(255,255,255,.38);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',

    '#vdi-prog-row{display:flex;align-items:center;gap:5px;}',
    '.vdi-t{font-size:9px;color:rgba(255,255,255,.5);min-width:22px;}',
    '#vdi-prog{flex:1;height:4px;background:rgba(255,255,255,.15);border-radius:99px;cursor:pointer;position:relative;}',
    '#vdi-prog-fill{height:100%;width:0%;border-radius:99px;',
      'background:var(--vdi-accent,' + CFG.defaultAccent + ');',
      'transition:width .6s linear, background .7s ease;}',

    '#vdi-ctrl-row{display:flex;align-items:center;justify-content:space-between;margin-top:6px;}',
    '#vdi-ctrl-main{display:flex;align-items:center;gap:6px;}',
    '#vdi-ctrl-extra{display:flex;align-items:center;gap:3px;}',
    '.vdi-btn{width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;',
      'background:rgba(255,255,255,.07);color:rgba(255,255,255,.75);',
      'transition:background .2s,transform .15s,color .15s;}',
    '.vdi-btn:hover{background:rgba(255,255,255,.16);color:#fff;transform:scale(1.1);}',
    '.vdi-btn:active{transform:scale(.92);}',
    '.vdi-btn svg{width:16px;height:16px;pointer-events:none;}',
    '.vdi-icon-btn{width:28px;height:28px;border-radius:8px;border:none;cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;',
      'background:rgba(255,255,255,.06);color:rgba(255,255,255,.55);',
      'transition:background .2s,color .2s,transform .15s;}',
    '.vdi-icon-btn:hover{background:rgba(255,255,255,.15);color:#fff;transform:scale(1.08);}',
    '.vdi-icon-btn.active{color:var(--vdi-accent,' + CFG.defaultAccent + ');}',
    '.vdi-icon-btn svg{width:15px;height:15px;pointer-events:none;}',
    '#vdi-play{width:40px;height:40px;border-radius:50%;background:var(--vdi-grad,' + CFG.defaultGradient + ');',
      'color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.45);',
      'display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;',
      'transition:background .7s ease, transform .15s;}',
    '#vdi-play:hover{transform:scale(1.08);filter:brightness(1.1);}',
    '#vdi-play svg{width:18px;height:18px;}',

    '#vdi-lyrics-panel{position:fixed;top:' + (CFG.islandTop + 165) + 'px;left:50%;transform:translateX(-50%) translateY(-10px);',
      'z-index:2147483646;width:400px;height:380px;border-radius:32px;overflow:hidden;',
      'background:rgba(0,0,0,0.5);backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);',
      'border:1px solid rgba(255,255,255,0.08);box-shadow:0 12px 40px rgba(0,0,0,0.6);',
      'opacity:0;pointer-events:none;transition:opacity 0.4s cubic-bezier(.32,.72,0,1), transform 0.4s cubic-bezier(.32,.72,0,1);',
      'display:flex;flex-direction:column;padding:24px 0;}',
    '#vdi-lyrics-panel.show{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:all;}',
    '#vdi-lyrics-scroll{flex:1;overflow-y:auto;scroll-behavior:smooth;padding:0 32px;',
      'mask-image:linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);',
      '-webkit-mask-image:linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);}',
    '#vdi-lyrics-scroll::-webkit-scrollbar{display:none;}',
    '.vdi-lyric-line{font-size:22px;font-weight:700;line-height:1.5;color:rgba(255,255,255,0.25);',
      'padding:14px 0;transition:color 0.8s ease, transform 0.8s cubic-bezier(0.2,0.8,0.2,1), filter 0.8s ease;',
      'transform-origin:left center; cursor:pointer; filter:blur(1.5px); transform:scale(0.95);}',
    '.vdi-lyric-line:hover{color:rgba(255,255,255,0.6); filter:blur(0px);}',
    '.vdi-lyric-line.active{color:#fff;transform:scale(1.1);text-shadow:0 4px 20px rgba(0,0,0,0.6); filter:blur(0px);}',
    '.vdi-lyric-line.unsynced{font-size:16px;color:rgba(255,255,255,0.8);transform:none; filter:none;}',
  ].join('');
  document.head.appendChild(css);

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
      '<div id="vdi-col-btn"><svg id="vdi-col-icon" viewBox="0 0 24 24" fill="white" width="10" height="10"><path d="M8 5v14l11-7z"/></svg></div>' +
    '</div>' +
    '<div id="vdi-exp">' +
      '<div id="vdi-art">' +
        '<div id="vdi-art-ph">\uD83C\uDFB5</div>' +
        '<img id="vdi-art-img" src="" alt=""/>' +
      '</div>' +
      '<div id="vdi-track">' +
        '<div id="vdi-title-row">' +
          '<div id="vdi-title">No media</div>' +
          '<button id="vdi-pip-btn" title="Picture-in-Picture">' +
            '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 7H9c-1.1 0-2 .9-2 2v3H5v3h2v3c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 10H9v-3h4v-3h6v6z"/></svg>' +
          '</button>' +
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
            '<button class="vdi-btn" id="vdi-play" title="Play/Pause"><svg id="vdi-pp" viewBox="0 0 24 24" fill="currentColor"><path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"/></svg></button>' +
            '<button class="vdi-btn" id="vdi-next" title="Next"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></button>' +
          '</div>' +
          '<div id="vdi-ctrl-extra">' +
            '<button class="vdi-icon-btn" id="vdi-lyr-btn" title="Lyrics">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(island);

  var lyrPanel = document.createElement('div');
  lyrPanel.id = 'vdi-lyrics-panel';
  lyrPanel.innerHTML = '<div id="vdi-lyrics-scroll"></div>';
  document.body.appendChild(lyrPanel);

  function $(id) { return document.getElementById(id); }

  function fmt(s) {
    if (!s || !isFinite(s) || s < 0) return '0:00';
    s = Math.floor(s);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  function setPlayIcon(playing) {
    var path = playing
      ? '<path d="M8 19c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2s2 .9 2 2v10c0 1.1-.9 2-2 2zm8 0c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2s2 .9 2 2v10c0 1.1-.9 2-2 2z"/>'
      : '<path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"/>';
    if ($('vdi-pp')) $('vdi-pp').innerHTML = path;
    if ($('vdi-col-icon')) $('vdi-col-icon').innerHTML = path;
  }

  function extractVibrant(url, cb) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      try {
        var W = 40, H = 40;
        var cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        var cx = cv.getContext('2d');
        cx.drawImage(img, 0, 0, W, H);
        var d = cx.getImageData(0, 0, W, H).data;
        
        var buckets = new Array(36);
        for(var i=0; i<36; i++) buckets[i] = { sumS: 0, maxS: 0, r:0, g:0, b:0 };
        
        for (var i = 0; i < W*H*4; i+=4) {
            var r = d[i]/255, g = d[i+1]/255, b = d[i+2]/255;
            var mx = Math.max(r,g,b), mn = Math.min(r,g,b);
            var l = (mx+mn)/2, delta = mx-mn;
            if (l < 0.05 || l > 0.95 || delta < 0.02) continue;
            
            var sat = delta / (1 - Math.abs(2*l-1));
            
            var h = 0;
            if (mx===r)      h = ((g-b)/delta) % 6;
            else if (mx===g) h = (b-r)/delta + 2;
            else             h = (r-g)/delta + 4;
            h = Math.round(h*60); if (h<0) h+=360;
            
            var bIdx = Math.floor(h / 10) % 36;
            var score = sat * (l > 0.5 ? (1-l)*2 : l*2);
            buckets[bIdx].sumS += score;
            if (sat > buckets[bIdx].maxS) {
              buckets[bIdx].maxS = sat;
              buckets[bIdx].r = r; buckets[bIdx].g = g; buckets[bIdx].b = b;
            }
        }
        
        var best = null;
        var maxSum = -1;
        for (var j=0; j<36; j++) {
          if (buckets[j].sumS > maxSum) {
            maxSum = buckets[j].sumS;
            best = buckets[j];
          }
        }
        
        if (!best || maxSum === 0) { cb(null); return; }
        
        var mxA = Math.max(best.r,best.g,best.b), mnA = Math.min(best.r,best.g,best.b);
        var hA = 0, sA = 0, lA = (mxA+mnA)/2;
        if(mxA !== mnA){
          var dA = mxA-mnA;
          sA = lA > 0.5 ? dA/(2-mxA-mnA) : dA/(mxA+mnA);
          if(mxA===best.r) hA = (best.g-best.b)/dA + (best.g<best.b?6:0);
          else if(mxA===best.g) hA = (best.b-best.r)/dA + 2;
          else hA = (best.r-best.g)/dA + 4;
          hA = Math.round(hA*60);
        }
        
        sA = Math.min(1, sA * 1.5 + 0.3);
        lA = Math.max(0.4, Math.min(0.65, lA));
        
        cb({
          accent  : 'hsl(' + hA + ',' + Math.round(sA*100) + '%,' + Math.round(lA*100) + '%)',
          gradient: 'linear-gradient(135deg, hsl(' + hA + ',' + Math.round(sA*100) + '%,' + Math.round(lA*100) + '%), hsl(' + ((hA+35)%360) + ',' + Math.round(sA*90) + '%,' + Math.round((lA-0.15)*100) + '%))',
          dark    : 'hsl(' + hA + ', ' + Math.round(sA*40) + '%, 12%)',
          glow    : 'hsla(' + hA + ', ' + Math.round(sA*100) + '%, ' + Math.round(lA*100) + '%, 0.45)'
        });
      } catch(e) { cb(null); }
    };
    img.onerror = function() { cb(null); };
    img.src = url;
  }

  function applyTheme(c) {
    var accent = c ? c.accent   : CFG.defaultAccent;
    var grad   = c ? c.gradient : CFG.defaultGradient;
    var dark   = c ? c.dark     : CFG.defaultDark;
    var glow   = c ? c.glow     : 'rgba(99,102,241,.2)';
    island.style.setProperty('--vdi-accent', accent);
    island.style.setProperty('--vdi-grad',   grad);
    island.style.setProperty('--vdi-dark',   dark);
    island.style.setProperty('--vdi-glow',   glow);
  }

  function updateUI() {
    if (!S.hasMedia) { island.classList.remove('vdi-visible'); return; }
    island.classList.add('vdi-visible');

    var label = [S.title, S.artist].filter(Boolean).join(' \u2014 ') || 'Now Playing';
    $('vdi-col-inner').textContent = label;
    $('vdi-title').textContent     = S.title  || 'Unknown Track';
    $('vdi-artist').textContent    = S.artist || 'Unknown Artist';

    setPlayIcon(S.isPlaying);

    if (S.supportsPiP) $('vdi-pip-btn').classList.add('show');
    else               $('vdi-pip-btn').classList.remove('show');

    if (S.artwork && (S.artwork !== S.lastArtwork || S.title !== S.lastArtTitle)) {
      S.lastArtwork = S.artwork;
      S.lastArtTitle = S.title;
      var img = $('vdi-art-img');
      img.classList.remove('ok');
      img.src = S.artwork;
      img.onload  = function() { img.classList.add('ok'); $('vdi-art-ph').style.display='none'; };
      img.onerror = function() { $('vdi-art-ph').style.display='flex'; };
      extractVibrant(S.artwork, applyTheme);
    } else if (!S.artwork && S.lastArtwork) {
      S.lastArtwork = null;
      var im2 = $('vdi-art-img');
      im2.classList.remove('ok');
      im2.src = '';
      $('vdi-art-ph').style.display = 'flex';
      applyTheme(null);
    }
    refreshProgress();
  }

  function refreshProgress() {
    var pct = S.duration > 0 ? Math.min(100, (S.position/S.duration)*100) : 0;
    $('vdi-prog-fill').style.width = pct + '%';
    $('vdi-pos').textContent = fmt(S.position);
    $('vdi-dur').textContent = fmt(S.duration);
  }

  function sendAction(act, val) {
    chrome.runtime.sendMessage({ type: 'VDI_ACTION', act: act, val: val });
  }

  function fetchLyrics(title, artist, duration) {
    var key = title + '|' + artist;
    S.lastLyricsKey = key;
    S.lyricsLines   = [];
    S.lyricsIdx     = -1;
    S.lyricsSynced  = false;
    $('vdi-lyr-btn').style.display = 'flex';
    $('vdi-lyrics-scroll').innerHTML = '<div class="vdi-lyric-line unsynced" style="text-align:center;margin-top:50px;">Loading lyrics...</div>';

    try {
      var params = 'track_name=' + encodeURIComponent(title) + '&artist_name=' + encodeURIComponent(artist || '');
      if (duration > 0) params += '&duration=' + Math.round(duration);

      var xhr = new XMLHttpRequest();
      xhr.open('GET', CFG.lyricsApi + '?' + params, true);
      xhr.timeout = 5000;
      xhr.onload = function() {
        try {
          if (xhr.status !== 200) return;
          if (key !== S.lastLyricsKey) return;
          var data = JSON.parse(xhr.responseText);
          var lines = [];

          if (data.syncedLyrics) {
            S.lyricsSynced = true;
            var raw = data.syncedLyrics.split('\n');
            for (var i=0; i<raw.length; i++) {
              var m = raw[i].match(/\[(\d+):(\d+\.\d+)\](.*)/);
              if (m) lines.push({ time: parseInt(m[1])*60 + parseFloat(m[2]), text: m[3].trim() });
            }
            lines.sort(function(a,b){return a.time-b.time;});
          } else if (data.plainLyrics) {
            S.lyricsSynced = false;
            var plines = data.plainLyrics.split('\n');
            for (var j=0; j<plines.length; j++) lines.push({ time:0, text:plines[j].trim() });
          }

          if (lines.length) {
            S.lyricsLines = lines;
            var html = '';
            for (var k=0; k<lines.length; k++) {
              var cls = S.lyricsSynced ? 'vdi-lyric-line' : 'vdi-lyric-line unsynced';
              html += '<div class="' + cls + '" id="vdi-lyr-' + k + '">' + (lines[k].text || '&nbsp;') + '</div>';
            }
            $('vdi-lyrics-scroll').innerHTML = html;
            $('vdi-lyr-btn').style.display = 'flex';
            if (S.lyricsOn) lyrPanel.classList.add('show');
            
            if (S.lyricsSynced) {
              for (var n=0; n<lines.length; n++) {
                (function(tTarget, idx) {
                  var lineEl = document.getElementById('vdi-lyr-' + idx);
                  if (lineEl) {
                    lineEl.addEventListener('click', function(e) {
                      e.stopPropagation();
                      S.position = tTarget;
                      refreshProgress();
                      sendAction('seek', tTarget);
                    });
                  }
                })(lines[n].time, n);
              }
            }
          } else {
            $('vdi-lyrics-scroll').innerHTML = '<div class="vdi-lyric-line unsynced" style="text-align:center;margin-top:50px;">No lyrics found for this track.</div>';
          }
        } catch(e) {}
      };
      xhr.onerror = xhr.ontimeout = function() {
        $('vdi-lyrics-scroll').innerHTML = '<div class="vdi-lyric-line unsynced" style="text-align:center;margin-top:50px;">Failed to fetch lyrics.</div>';
      };
      xhr.send();
    } catch(e) {}
  }

  function syncLyrics() {
    if (!S.lyricsLines.length || !S.lyricsSynced) return;
    var pos = S.position;
    var idx = -1;
    for (var i = S.lyricsLines.length-1; i>=0; i--) {
      if (S.lyricsLines[i].time <= pos + 0.3) { idx=i; break; }
    }
    if (idx !== S.lyricsIdx && idx >= 0) {
      if (S.lyricsIdx >= 0) {
        var old = $('vdi-lyr-' + S.lyricsIdx);
        if (old) old.classList.remove('active');
      }
      S.lyricsIdx = idx;
      var cur = $('vdi-lyr-' + idx);
      if (cur) {
        cur.classList.add('active');
        if (S.lyricsOn) cur.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  var idleTimer = null;
  function resetIdle() {
    clearTimeout(idleTimer);
    if (S.isIdle) { S.isIdle=false; island.classList.remove('vdi-idle'); }
    idleTimer = setTimeout(function() {
      if (!S.hasMedia) return;
      S.isIdle = true; island.classList.add('vdi-idle');
    }, CFG.idleDelay);
  }
  document.addEventListener('mousemove', function(e) {
    if (!S.hasMedia) return;
    var r = island.getBoundingClientRect();
    if (e.clientX>=r.left-80&&e.clientX<=r.right+80&&e.clientY>=r.top-60&&e.clientY<=r.bottom+60) resetIdle();
  });

  var colTimer = null;
  function handleMouseEnter() {
    clearTimeout(colTimer);
    if (S.isIdle) { S.isIdle=false; island.classList.remove('vdi-idle'); }
    island.classList.add('vdi-expanded');
    resetIdle();
  }
  function handleMouseLeave() {
    clearTimeout(colTimer);
    colTimer = setTimeout(function(){ 
      island.classList.remove('vdi-expanded'); 
      if (S.lyricsOn) {
        S.lyricsOn = false;
        $('vdi-lyr-btn').classList.remove('active');
        lyrPanel.classList.remove('show');
      }
    }, CFG.collapseDelay);
    resetIdle();
  }

  island.addEventListener('mouseenter', handleMouseEnter);
  island.addEventListener('mouseleave', handleMouseLeave);
  lyrPanel.addEventListener('mouseenter', handleMouseEnter);
  lyrPanel.addEventListener('mouseleave', handleMouseLeave);

  island.addEventListener('dblclick', function() {
    sendAction('jump');
  });

  $('vdi-prev').addEventListener('click', function(e) { e.stopPropagation(); sendAction('prev'); });
  $('vdi-next').addEventListener('click', function(e) { e.stopPropagation(); sendAction('next'); });
  $('vdi-play').addEventListener('click', function(e) {
    e.stopPropagation();
    sendAction('toggle');
    S.isPlaying = !S.isPlaying;
    setPlayIcon(S.isPlaying);
  });
  $('vdi-prog').addEventListener('click', function(e) {
    e.stopPropagation();
    if (!S.duration) return;
    var r = e.currentTarget.getBoundingClientRect();
    S.position = ((e.clientX - r.left) / r.width) * S.duration;
    refreshProgress();
    sendAction('seek', S.position);
  });
  $('vdi-pip-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    sendAction('pip');
  });
  $('vdi-lyr-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    S.lyricsOn = !S.lyricsOn;
    $('vdi-lyr-btn').classList.toggle('active', S.lyricsOn);
    if (S.lyricsOn) {
      lyrPanel.classList.add('show');
      if (S.lyricsSynced && S.lyricsIdx >= 0) {
        var cur = $('vdi-lyr-' + S.lyricsIdx);
        if (cur) cur.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
    } else {
      lyrPanel.classList.remove('show');
    }
  });

  setInterval(function() {
    if (S.isPlaying && S.duration > 0) {
      S.position = Math.min(S.duration, S.position + 1);
      refreshProgress();
    }
    syncLyrics();
  }, CFG.tickInterval);

  setInterval(function() {
    var bars = document.querySelectorAll('.vdi-eq-bar');
    if (!bars.length) return;
    for(var i=0; i<bars.length; i++) {
      if (!S.isPlaying) {
        bars[i].style.height = '3px';
      } else {
        bars[i].style.height = Math.floor(4 + Math.random() * 9) + 'px';
      }
    }
  }, 200);

  chrome.runtime.onMessage.addListener(function(msg) {
    if (msg.type === 'VDI_UPDATE') {
      var newState = msg.state;
      S.hasMedia    = newState.hasMedia;
      S.isPlaying   = newState.isPlaying;
      S.title       = newState.title;
      S.artist      = newState.artist;
      S.artwork     = newState.artwork;
      S.duration    = newState.duration;
      S.position    = newState.position;
      S.supportsPiP = newState.supportsPiP;
      
      updateUI();
      var key = S.title + '|' + S.artist;
      if (key !== S.lastLyricsKey && S.title) fetchLyrics(S.title, S.artist, S.duration);
    }
  });

  try {
    chrome.runtime.sendMessage({ type: 'VDI_REQUEST_STATE' }, function(state) {
      if (state) {
        S.hasMedia = state.hasMedia; S.isPlaying = state.isPlaying; S.title = state.title; S.artist = state.artist;
        S.artwork = state.artwork; S.duration = state.duration; S.position = state.position; S.supportsPiP = state.supportsPiP;
        updateUI();
        var key = S.title + '|' + S.artist;
        if (key !== S.lastLyricsKey && S.title) fetchLyrics(S.title, S.artist, S.duration);
      }
    });
  } catch(e) {}

  resetIdle();
})();
