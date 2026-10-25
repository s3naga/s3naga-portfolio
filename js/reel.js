/* =====================================================================
   REEL — one Vimeo player, films listed underneath.
   Picking a film loads it into the single player; when a film ends the
   reel cuts to a title card and rolls into the next one.
   ===================================================================== */
(function(){
  'use strict';

  var items = Array.prototype.slice.call(document.querySelectorAll('.reel-item'));
  var iframe = document.getElementById('vimeoPlayer');
  var shell = document.getElementById('playerShell');
  if (!items.length || !iframe) return;

  var n = items.length;
  var $ = function(id){ return document.getElementById(id); };
  var metaTitle = $('metaTitle'), metaType = $('metaType'), metaRole = $('metaRole'), metaDesc = $('metaDesc');
  var watchLink = $('watchLink'), metaBig = $('metaBig'), reelCount = $('reelCount');
  var cut = $('reelCut'), rcNum = $('rcNum'), rcTitle = $('rcTitle');
  var bars = items.map(function(it){ return it.querySelector('.rit-bar i'); });
  var REDUCE = document.documentElement.classList.contains('reduce-motion');

  var current = 0;
  var pad = function(x){ return String(x).padStart(2, '0'); };

  /* ---------- UI ---------- */
  function setUI(i){
    var it = items[i];
    items.forEach(function(b, k){
      b.classList.toggle('active', k === i);
      if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    bars.forEach(function(b, k){ if (k !== i) b.style.transform = 'scaleX(0)'; });
    var fx = window.S3FX;
    var d = it.dataset;
    if (fx) {
      fx.scramble(metaTitle, d.title);
      fx.scramble(metaType, d.type);
      fx.scramble(metaRole, d.role);
      fx.fadeText(metaDesc, d.desc || '');
    } else {
      metaTitle.textContent = d.title; metaType.textContent = d.type;
      metaRole.textContent = d.role; metaDesc.textContent = d.desc || '';
    }
    metaDesc.hidden = !d.desc;
    watchLink.href = 'https://vimeo.com/' + d.id;
    metaBig.textContent = pad(i + 1);
    reelCount.textContent = pad(i + 1) + ' / ' + pad(n);
  }
  function setProgress(ratio){
    var b = bars[current];
    if (b) b.style.transform = 'scaleX(' + Math.max(0, Math.min(1, ratio)) + ')';
  }

  /* title card shown while the next film loads, so the gap reads as a cut */
  var cutShownAt = 0;
  function showCut(i, label){
    if (!cut) return;
    cut.querySelector('.rc-label').textContent = label || 'Next';
    rcNum.textContent = pad(i + 1);
    rcTitle.textContent = items[i].dataset.title;
    cut.classList.add('show');
    cutShownAt = performance.now();
  }
  function hideCut(){
    if (!cut) return;
    var wait = Math.max(0, 650 - (performance.now() - cutShownAt));
    setTimeout(function(){ cut.classList.remove('show'); }, REDUCE ? 0 : wait);
  }

  /* on phones, bring the screen into view when a film is picked from the list below it */
  function revealScreen(){
    var r = shell.getBoundingClientRect();
    if (r.top < 60 || r.bottom > window.innerHeight) {
      var y = r.top + window.scrollY - 80;
      if (window.S3Scroll) window.S3Scroll(y); else window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  /* ---------- no Vimeo API: the list still switches the embed ---------- */
  if (!window.Vimeo || !window.Vimeo.Player) {
    var pick = function(i){
      i = (i + n) % n;
      current = i;
      setUI(i);
      iframe.src = 'https://player.vimeo.com/video/' + items[i].dataset.id + '?title=0&byline=0&portrait=0&dnt=1&playsinline=1&autoplay=1';
    };
    items.forEach(function(it, i){ it.addEventListener('click', function(){ pick(i); revealScreen(); }); });
    $('reelPrev').addEventListener('click', function(){ pick(current - 1); });
    $('reelNext').addEventListener('click', function(){ pick(current + 1); });
    return;
  }

  /* ---------- single player ---------- */
  var player = new Vimeo.Player(iframe);
  var unmuteBtn = $('reelUnmute');

  /* Vimeo keeps (or falls back to) a muted state on films loaded by script — force sound on every load */
  function withSound(){
    return Promise.all([
      player.setMuted ? player.setMuted(false).catch(function(){}) : Promise.resolve(),
      player.setVolume(1).catch(function(){})
    ]);
  }
  /* if the browser still forced it muted, offer one tap to bring the sound in */
  function checkSound(){
    if (!unmuteBtn || !player.getMuted) return;
    Promise.all([player.getMuted().catch(function(){ return false; }), player.getVolume().catch(function(){ return 1; })]).then(function(v){
      unmuteBtn.hidden = !(v[0] || v[1] === 0);
    });
  }
  if (unmuteBtn) unmuteBtn.addEventListener('click', function(){
    withSound().then(function(){ return player.play().catch(function(){}); }).then(checkSound);
  });
  var loading = false;
  var token = 0;          // ignores stale loads if the user clicks quickly
  var duration = 0;

  function select(i, opts){
    opts = opts || {};
    i = (i + n) % n;
    if (i === current && !opts.force) {
      // same film: seek (if asked) and play
      if (typeof opts.seek === 'number') {
        player.getDuration().then(function(d){ player.setCurrentTime(d * opts.seek).catch(function(){}); }).catch(function(){});
      }
      withSound().then(function(){ return player.play().catch(function(){}); }).then(checkSound);
      return;
    }
    var my = ++token;
    current = i;
    loading = true;
    duration = 0;
    setUI(i);
    setProgress(0);
    showCut(i, opts.auto ? 'Next' : 'Now');
    player.loadVideo(items[i].dataset.id).then(function(){
      if (my !== token) return;
      loading = false;
      hideCut();
      var p = Promise.resolve();
      if (typeof opts.seek === 'number' && opts.seek > 0.01) {
        p = player.getDuration().then(function(d){ return player.setCurrentTime(d * opts.seek); });
      }
      p.catch(function(){}).then(function(){
        return withSound();
      }).then(function(){
        // phones may refuse to start without a tap inside the player — the native play button stays ready
        return player.play().catch(function(){ shell.classList.add('needs-tap'); });
      }).then(checkSound);
    }).catch(function(){
      if (my !== token) return;
      loading = false;
      hideCut();
    });
  }

  items.forEach(function(it, i){
    it.addEventListener('click', function(e){
      // clicks on the progress bar seek instead (handled below)
      if (e.target.closest('.rit-bar')) return;
      select(i);
      revealScreen();
    });
  });
  $('reelPrev').addEventListener('click', function(){ select(current - 1); });
  $('reelNext').addEventListener('click', function(){ select(current + 1); });

  /* progress bars are scrub tracks: click or drag */
  items.forEach(function(it, i){
    var bar = it.querySelector('.rit-bar');
    var dragging = false;
    var ratioAt = function(x){ var r = bar.getBoundingClientRect(); return Math.max(0, Math.min(0.999, (x - r.left) / r.width)); };
    bar.addEventListener('pointerdown', function(e){
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
      bar.setPointerCapture(e.pointerId);
      var r = ratioAt(e.clientX);
      if (i === current) { setProgress(r); select(i, { seek: r }); }
      else select(i, { seek: r });
    });
    bar.addEventListener('pointermove', function(e){
      if (!dragging || i !== current || loading || !duration) return;
      var r = ratioAt(e.clientX);
      setProgress(r);
      player.setCurrentTime(duration * r).catch(function(){});
    });
    var end = function(){ dragging = false; };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
    bar.addEventListener('click', function(e){ e.stopPropagation(); });
  });

  player.on('timeupdate', function(d){
    if (loading) return;
    duration = d.duration || duration;
    setProgress(d.percent);
  });
  player.on('play', function(){ shell.classList.remove('needs-tap'); shell.classList.add('is-playing'); setTimeout(checkSound, 400); });
  player.on('volumechange', function(){ checkSound(); });
  player.on('pause', function(){ shell.classList.remove('is-playing'); });
  player.on('ended', function(){
    setProgress(1);
    select(current + 1, { auto: true });
  });
  player.getDuration().then(function(d){ duration = d; }).catch(function(){});

  /* pause when the screen leaves the viewport */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if (!en.isIntersecting) player.pause().catch(function(){}); });
    }, { threshold: 0 }).observe(shell);
  }
})();
