const CFG = {
  pollInterval: 1000
};

let S = {
  isPlaying: false, title: '', artist: '', artwork: null, duration: 0, position: 0,
  hasMedia: false, tabId: null, windowId: null, supportsPiP: false
};

function TAB_getState() {
  var vids = document.querySelectorAll('video');
  var isYTMusic = window.location.hostname === 'music.youtube.com';
  var pipOk = !!(!isYTMusic && document.pictureInPictureEnabled && vids.length &&
                 Array.prototype.slice.call(vids).some(function(v){return !v.disablePictureInPicture;}));
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
            return p.length === 2 ? p[0]*60 + p[1] : (p.length === 3 ? p[0]*3600 + p[1]*60 + p[2] : 0);
          };
          uiCur = parseTime(parts[0]);
          uiDur = parseTime(parts[1]);
        }
      }
    } else if (window.location.hostname.indexOf('youtube.com') > -1) {
      var td = document.querySelector('.ytp-time-duration');
      if (td) uiDur = td.textContent.trim().split(':').reduce(function(a,v){return (60*a) + parseInt(v);}, 0);
    }
  } catch(e) {}

  var el = null;
  if (uiDur !== null && uiDur > 0 && !isYTMusic) {
    for (var i=0; i<vids.length; i++) {
      if (Math.abs(vids[i].duration - uiDur) <= 2) { el = vids[i]; break; }
    }
  }
  if (!el) {
    for (var i=0; i<vids.length; i++) {
      if (!vids[i].paused && vids[i].currentTime > 0) { el = vids[i]; break; }
    }
  }
  if (!el) el = document.querySelector('.html5-main-video');
  if (!el && vids.length) el = vids[vids.length - 1];

  try {
    var ms = navigator.mediaSession; var art = null; if (ms && ms.metadata && ms.metadata.artwork && ms.metadata.artwork.length) { art = ms.metadata.artwork[ms.metadata.artwork.length - 1].src; }
    return {
      title    : (ms && ms.metadata && ms.metadata.title)  || '',
      artist   : (ms && ms.metadata && ms.metadata.artist) || '',
      artwork  : art,
      isPlaying: (ms && ms.playbackState==='playing') || (el ? !el.paused : false),
      duration : (uiDur !== null && uiDur > 0) ? uiDur : (el ? (isFinite(el.duration) ? el.duration : 0) : 0),
      position : (uiCur !== null && uiDur > 0) ? uiCur : (el ? el.currentTime : 0),
      hasMedia : !!(el || (ms && ms.metadata && ms.metadata.title)),
      volume   : el ? el.volume : 1,
      pipOk    : pipOk,
    };
  } catch(e) { return null; }
}

function TAB_doAction(act, val) {
  try {
    var els = Array.prototype.slice.call(document.querySelectorAll('video,audio'));
    var el  = null;
    for (var i=0;i<els.length;i++) { if(!els[i].paused&&!els[i].ended){el=els[i];break;} }
    if (!el) for (var j=0;j<els.length;j++) { if(els[j].paused&&els[j].currentTime>0){el=els[j];break;} }
    if (!el && els.length) el = els[0];

    if (act === 'toggle') {
      if (el) {
        if (el.paused) { el.play(); }
        else           { el.pause(); }
      }
    } else if (act === 'prev') {
      if (el) {
        var pb = document.querySelector('ytmusic-player-bar .previous-button') || document.querySelector('.ytp-prev-button') || document.querySelector('.previous-button');
        if (pb) pb.click(); else el.currentTime = 0;
      }
    } else if (act === 'next') {
      if (el) {
        var nb = document.querySelector('ytmusic-player-bar .next-button') || document.querySelector('.ytp-next-button') || document.querySelector('.next-button');
        if (nb) nb.click(); else el.currentTime = el.duration;
      }
    } else if (act === 'seek' && typeof val === 'number') {
      var isYTM = window.location.hostname === 'music.youtube.com';
      var v = document.querySelectorAll('video'); var u = null; var uc = null; try { if (isYTM) { var t = document.querySelector('.time-info.ytmusic-player-bar'); if (t) { var p = t.textContent.trim().split('/'); if (p.length === 2) { var pT = function(s){var z=s.trim().split(':').map(Number); return z.length===2?z[0]*60+z[1]:(z.length===3?z[0]*3600+z[1]*60+z[2]:0);}; uc = pT(p[0]); u = pT(p[1]); } } } else { var td = document.querySelector('.ytp-time-duration'); if (td) u = td.textContent.trim().split(':').reduce(function(a,x){return (60*a)+parseInt(x);},0); } } catch(e){} var target = null; if(u>0 && !isYTM){ for(var i=0;i<v.length;i++){ if(Math.abs(v[i].duration-u)<=2){target=v[i];break;} } } if(!target) target=document.querySelector('.html5-main-video'); 
      if(target) {
        if (isYTM && uc !== null && u > 0) {
          var offset = target.currentTime - uc;
          target.currentTime = val + offset;
        } else {
          target.currentTime = val;
        }
      }
    }
  } catch(e) {}
}

function TAB_togglePiP() {
  try {
    var vids = Array.prototype.slice.call(document.querySelectorAll('video'));
    var v = null;
    for (var i=0;i<vids.length;i++) { if(!vids[i].paused){v=vids[i];break;} }
    if (!v && vids.length) v = vids[0];
    if (!v || !document.pictureInPictureEnabled) return false;
    if (document.pictureInPictureElement) document.exitPictureInPicture();
    else v.requestPictureInPicture();
    return true;
  } catch(e) { return false; }
}

function execInTab(tabId, fn, args, cb) {
  if (!tabId) { if (cb) cb(null); return; }
  chrome.scripting.executeScript({
    target: { tabId: tabId, allFrames: false },
    func: fn,
    args: args || [],
    world: 'ISOLATED'
  }, (res) => {
    if (chrome.runtime.lastError || !res) { if (cb) cb(null); return; }
    if (cb) cb(res[0] ? res[0].result : null);
  });
}

function broadcastState() {
  // Send state to all tabs so every island instance stays in sync
  chrome.tabs.query({}, (tabs) => {
    for (var i = 0; i < tabs.length; i++) {
      chrome.tabs.sendMessage(tabs[i].id, { type: 'VDI_UPDATE', state: S }, () => {
        if (chrome.runtime.lastError) {} // suppress "no listener" errors
      });
    }
  });
}

function poll() {
  chrome.tabs.query({ audible: true }, (tabs) => {
    let tab = (tabs && tabs.length) ? tabs[0] : null;

    if (!tab) {
      if (S.tabId !== null) {
        execInTab(S.tabId, TAB_getState, [], (res) => {
          if (!res) { S.hasMedia = false; broadcastState(); return; }
          S.isPlaying = res.isPlaying;
          S.position = res.position;
          S.duration = res.duration;
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

    execInTab(tab.id, TAB_getState, [], (res) => {
      if (!res) { S.hasMedia = true; broadcastState(); return; }
      
      S.hasMedia = res.hasMedia || true;
      S.isPlaying = res.isPlaying;
      S.title = res.title || tab.title || '';
      S.artist = res.artist || '';
      S.artwork = res.artwork || null;
      S.duration = res.duration || 0;
      S.position = res.position || 0;
      S.supportsPiP = res.pipOk || false;
      
      broadcastState();
    });
  });
}

setInterval(poll, CFG.pollInterval);
poll();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'VDI_ACTION') {
    if (msg.act === 'pip') {
      execInTab(S.tabId, TAB_togglePiP, [], null);
    } else if (msg.act === 'jump') {
      if (S.tabId !== null) {
        chrome.tabs.update(S.tabId, { active: true });
        if (S.windowId !== null) chrome.windows.update(S.windowId, { focused: true });
      }
    } else {
      let args = msg.val !== undefined ? [msg.act, msg.val] : [msg.act];
      execInTab(S.tabId, TAB_doAction, args, null);
      
      setTimeout(poll, 200);
      setTimeout(poll, 500);
      setTimeout(poll, 1000);
    }
  } else if (msg.type === 'VDI_REQUEST_STATE') {
    sendResponse(S);
  }
});

chrome.tabs.onActivated.addListener(() => poll());
chrome.windows.onFocusChanged.addListener(() => poll());
