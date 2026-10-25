/* =====================================================================
   D. OSESENAGA — interaction layer
   GSAP + ScrollTrigger + Lenis. Every feature degrades: if a library
   fails to load, content stays visible and core controls still work.
   ===================================================================== */
(function(){
  'use strict';

  var html = document.documentElement;
  var REDUCE = html.classList.contains('reduce-motion');
  var FINE = html.classList.contains('fine-pointer');
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  var $ = function(s, c){ return (c || document).querySelector(s); };
  var $$ = function(s, c){ return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function(v, a, b){ return Math.max(a, Math.min(b, v)); };

  if (hasGSAP) gsap.registerPlugin(ST);

  /* -------------------------------------------------------------------
     TEXT FX (shared with reel.js through window.S3FX)
     ------------------------------------------------------------------- */
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#·';
  function scramble(el, text, dur){
    if (!el) return;
    if (REDUCE) { el.textContent = text; return; }
    dur = dur || 620;
    var from = el.textContent || '';
    var start = performance.now();
    cancelAnimationFrame(el._scr);
    var tick = function(now){
      var p = Math.min(1, (now - start) / dur);
      var out = '';
      for (var i = 0; i < text.length; i++) {
        var ch = text[i];
        var t = (i / Math.max(1, text.length)) * 0.65;
        if (ch === ' ' || p >= t + 0.35) out += ch;
        else if (p >= t) out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        else out += from[i] && from[i] !== ' ' ? from[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) el._scr = requestAnimationFrame(tick);
      else el.textContent = text;
    };
    el._scr = requestAnimationFrame(tick);
  }
  function fadeText(el, text){
    if (!el) return;
    if (!hasGSAP || REDUCE) { el.textContent = text; return; }
    gsap.killTweensOf(el);
    gsap.to(el, { opacity: 0, y: 6, duration: .18, ease: 'power1.in', onComplete: function(){
      el.textContent = text;
      gsap.to(el, { opacity: 1, y: 0, duration: .45, ease: 'power3.out' });
    }});
  }
  window.S3FX = { scramble: scramble, fadeText: fadeText };

  /* split every text node inside root into word spans (keeps <strong>, <em>, <br>) */
  function splitWords(root){
    var words = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function(node){
      var parts = node.nodeValue.split(/(\s+)/);
      var frag = document.createDocumentFragment();
      parts.forEach(function(part){
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var s = document.createElement('span');
        s.className = 'w';
        s.textContent = part;
        frag.appendChild(s);
        words.push(s);
      });
      node.parentNode.replaceChild(frag, node);
    });
    return words;
  }
  function splitChars(el){
    var text = el.textContent;
    el.textContent = '';
    return text.split('').map(function(c){
      var s = document.createElement('span');
      s.className = 'ch';
      s.textContent = c;
      el.appendChild(s);
      return s;
    });
  }

  /* -------------------------------------------------------------------
     SMOOTH SCROLL
     ------------------------------------------------------------------- */
  var lenis = null;
  if (hasGSAP && window.Lenis && !REDUCE) {
    lenis = new window.Lenis({ lerp: 0.14, smoothWheel: true, wheelMultiplier: 1.2, touchMultiplier: 1 });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function(t){ lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function scrollToTarget(target, opts){
    opts = opts || {};
    if (lenis) { lenis.scrollTo(target, { duration: opts.duration || 1.6, offset: opts.offset || 0, immediate: !!opts.immediate, easing: opts.easing }); return; }
    var y = typeof target === 'number' ? target : (target.getBoundingClientRect().top + window.scrollY + (opts.offset || 0));
    window.scrollTo({ top: y, behavior: (opts.immediate || REDUCE) ? 'auto' : 'smooth' });
  }
  window.S3Scroll = function(y){ scrollToTarget(y, { duration: 1.1 }); };
  function stopScroll(){ if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden'; }
  function startScroll(){ if (lenis) lenis.start(); else document.body.style.overflow = ''; }

  /* anchor links */
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id === '#' || id === '#top') { e.preventDefault(); closeMenu(); scrollToTarget(0, { duration: 1.8 }); return; }
    var t = document.querySelector(id);
    if (!t) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(t, { duration: 1.6 });
    if (a.classList.contains('skip-link')) { t.setAttribute('tabindex','-1'); t.focus({ preventScroll: true }); }
  });

  /* -------------------------------------------------------------------
     NAV + MENU
     ------------------------------------------------------------------- */
  var nav = $('#nav');
  var menu = $('#menu');
  var menuBtn = $('#menuBtn');
  function openMenu(){
    if (!menu) return;
    menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.querySelector('span').textContent = 'Close';
    stopScroll();
    if (hasGSAP && !REDUCE) {
      gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: .6, ease: 'expo.out' });
      gsap.fromTo($$('.menu li a', menu), { yPercent: 105 }, { yPercent: 0, duration: .7, ease: 'expo.out', stagger: .05, delay: .1 });
    }
  }
  function closeMenu(){
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.querySelector('span').textContent = 'Menu';
    startScroll();
  }
  if (menuBtn) menuBtn.addEventListener('click', function(){ menu.hidden ? openMenu() : closeMenu(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeMenu(); });

  var lastY = window.scrollY;
  function onScrollNav(){
    var y = window.scrollY;
    nav.classList.toggle('scrolled', y > 12);
    lastY = y;
  }
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  /* -------------------------------------------------------------------
     CURSOR — viewfinder reticle with context labels
     ------------------------------------------------------------------- */
  (function(){
    if (!FINE || !hasGSAP) return;
    var cur = $('.cursor');
    if (!cur) return;
    html.classList.add('cursor-ready');
    var ring = $('.cursor-ring', cur), dot = $('.cursor-dot', cur), label = $('.cursor-label', cur);
    var rx = gsap.quickTo(ring, 'x', { duration: .45, ease: 'power3' });
    var ry = gsap.quickTo(ring, 'y', { duration: .45, ease: 'power3' });
    var dx = gsap.quickTo(dot, 'x', { duration: .08, ease: 'power2' });
    var dy = gsap.quickTo(dot, 'y', { duration: .08, ease: 'power2' });
    cur.classList.add('is-hidden');
    window.addEventListener('mousemove', function(e){
      cur.classList.remove('is-hidden');
      rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
    }, { passive: true });
    document.addEventListener('mouseover', function(e){
      var t = e.target.closest && e.target.closest('[data-cursor]');
      if (t) { label.textContent = t.getAttribute('data-cursor'); cur.classList.add('has-label'); }
      else cur.classList.remove('has-label');
    });
    document.addEventListener('mouseout', function(e){ if (!e.relatedTarget) cur.classList.add('is-hidden'); });
    window.addEventListener('mousedown', function(){ cur.classList.add('is-down'); });
    window.addEventListener('mouseup', function(){ cur.classList.remove('is-down'); });
  })();

  /* magnetic buttons */
  (function(){
    if (!FINE || !hasGSAP || REDUCE) return;
    $$('.magnetic').forEach(function(el){
      var strength = el.classList.contains('mail-big') ? 0.12 : 0.3;
      var xTo = gsap.quickTo(el, 'x', { duration: .6, ease: 'power3' });
      var yTo = gsap.quickTo(el, 'y', { duration: .6, ease: 'power3' });
      el.addEventListener('mousemove', function(e){
        var r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * strength);
        yTo((e.clientY - (r.top + r.height / 2)) * strength);
      });
      el.addEventListener('mouseleave', function(){
        gsap.to(el, { x: 0, y: 0, duration: .9, ease: 'elastic.out(1, .4)' });
      });
    });
  })();

  /* -------------------------------------------------------------------
     HERO — running timecode
     ------------------------------------------------------------------- */
  function tc(frames){
    var f = frames % 24, s = Math.floor(frames / 24);
    var p = function(x){ return String(x).padStart(2, '0'); };
    return p(Math.floor(s / 3600)) + ':' + p(Math.floor(s / 60) % 60) + ':' + p(s % 60) + ':' + p(f);
  }
  (function(){
    var el = $('#heroTC');
    if (!el) return;
    var t0 = performance.now(), last = -1;
    var heroVisible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function(en){ heroVisible = en[0].isIntersecting; }).observe($('#top'));
    }
    (function loop(now){
      if (heroVisible) {
        var fr = Math.floor((now - t0) / (1000 / 24));
        if (fr !== last) { el.textContent = tc(fr); last = fr; }
      }
      requestAnimationFrame(loop);
    })(t0);
  })();

  /* hero video: make sure it plays */
  (function(){
    var vid = $('#heroVideo');
    if (!vid) return;
    vid.muted = true;
    var tryPlay = function(){ var p = vid.play(); if (p && p.catch) p.catch(function(){}); };
    tryPlay();
    document.addEventListener('click', tryPlay, { once: true });
    document.addEventListener('touchstart', tryPlay, { once: true, passive: true });
  })();

  /* -------------------------------------------------------------------
     STILLS LIGHTBOX (no GSAP dependency)
     ------------------------------------------------------------------- */
  (function(){
    var figs = $$('#stillsGrid figure');
    var box = $('#lightbox');
    if (!figs.length || !box) return;
    var img = $('#lbImg'), count = $('#lbCount');
    var btnPrev = $('#lbPrev'), btnNext = $('#lbNext'), btnClose = $('#lbClose');
    var idx = 0, lastFocus = null;
    var srcs = figs.map(function(f){ var i = f.querySelector('img'); return { src: i.getAttribute('src'), alt: i.getAttribute('alt') || '' }; });

    function show(i){
      idx = (i + srcs.length) % srcs.length;
      var apply = function(){
        img.src = srcs[idx].src;
        img.alt = srcs[idx].alt;
        count.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(srcs.length).padStart(2, '0');
      };
      if (hasGSAP && !REDUCE && !box.hidden && img.getAttribute('src')) {
        gsap.to(img, { opacity: 0, scale: .985, duration: .16, onComplete: function(){
          apply();
          gsap.to(img, { opacity: 1, scale: 1, duration: .45, ease: 'power3.out' });
        }});
      } else apply();
    }
    function open(i){
      lastFocus = document.activeElement;
      box.hidden = false;
      show(i);
      stopScroll();
      if (hasGSAP && !REDUCE) {
        gsap.fromTo(box, { opacity: 0 }, { opacity: 1, duration: .35 });
        gsap.fromTo(img, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .6, ease: 'power3.out' });
      }
      btnClose.focus({ preventScroll: true });
    }
    function close(){
      if (box.hidden) return;
      box.hidden = true;
      startScroll();
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
    figs.forEach(function(f, i){
      f.setAttribute('role', 'button');
      f.setAttribute('aria-label', 'Open still ' + (i + 1) + ' of ' + figs.length);
      f.addEventListener('click', function(){ open(i); });
      f.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } });
    });
    btnPrev.addEventListener('click', function(){ show(idx - 1); });
    btnNext.addEventListener('click', function(){ show(idx + 1); });
    btnClose.addEventListener('click', close);
    $('#lbStage').addEventListener('click', function(e){ if (e.target === e.currentTarget) close(); });
    document.addEventListener('keydown', function(e){
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(idx + 1);
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'Tab') { // keep focus inside the dialog
        var f = [btnPrev, btnNext, btnClose];
        var at = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(at + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
    var sx = null;
    var stage = $('#lbStage');
    stage.addEventListener('pointerdown', function(e){ sx = e.clientX; });
    stage.addEventListener('pointerup', function(e){
      if (sx === null) return;
      var d = e.clientX - sx; sx = null;
      if (Math.abs(d) > 50) show(idx + (d < 0 ? 1 : -1));
    });
  })();

  /* -------------------------------------------------------------------
     COPY EMAIL
     ------------------------------------------------------------------- */
  (function(){
    var b = $('#copyBtn');
    if (!b) return;
    var email = 's3nagamedia@gmail.com';
    b.addEventListener('click', function(){
      var done = function(){
        b.textContent = 'Copied ✓';
        b.classList.add('copied');
        setTimeout(function(){ b.textContent = 'Copy email'; b.classList.remove('copied'); }, 2000);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(email).then(done, fallback);
      } else fallback();
      function fallback(){
        var t = document.createElement('textarea');
        t.value = email; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); done(); } catch(e) {}
        t.remove();
      }
    });
  })();

  /* -------------------------------------------------------------------
     LOG → GRADE comparison slider (no GSAP dependency)
     ------------------------------------------------------------------- */
  var gradeSlider = (function(){
    var frame = $('#gradeFrame');
    if (!frame) return null;
    var handle = $('#gHandle'), after = $('#gAfter'), beforeImg = $('#gBeforeImg');
    var btns = $$('#gradeFrames .gf');
    var pos = 50;
    function set(p){
      pos = clamp(p, 0, 100);
      frame.style.setProperty('--p', pos + '%');
      handle.setAttribute('aria-valuenow', String(Math.round(pos)));
      handle.setAttribute('aria-valuetext', Math.round(pos) + '% log');
      frame.setAttribute('data-side', pos > 85 ? 'log' : (pos < 15 ? 'grade' : 'both'));
    }
    function fromX(x){ var r = frame.getBoundingClientRect(); set((x - r.left) / r.width * 100); }
    var dragging = false, startX = 0, startY = 0, decided = false;
    frame.addEventListener('pointerdown', function(e){
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true; decided = e.pointerType === 'mouse'; startX = e.clientX; startY = e.clientY;
      if (decided) { frame.setPointerCapture(e.pointerId); frame.classList.add('is-dragging'); fromX(e.clientX); }
    });
    frame.addEventListener('pointermove', function(e){
      if (!dragging) return;
      if (!decided) {
        // touch: only take over for a sideways drag, so vertical swipes still scroll the page
        var dx = Math.abs(e.clientX - startX), dy = Math.abs(e.clientY - startY);
        if (dx < 6 && dy < 6) return;
        if (dy > dx) { dragging = false; return; }
        decided = true; frame.setPointerCapture(e.pointerId); frame.classList.add('is-dragging');
      }
      fromX(e.clientX);
    });
    var end = function(e){
      if (dragging && !decided && e && e.type === 'pointerup') fromX(e.clientX); // a tap moves the line
      dragging = false; frame.classList.remove('is-dragging');
    };
    frame.addEventListener('pointerup', end);
    frame.addEventListener('pointercancel', end);
    handle.addEventListener('keydown', function(e){
      var step = e.shiftKey ? 10 : 4;
      if (e.key === 'ArrowLeft') { e.preventDefault(); set(pos - step); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); set(pos + step); }
      else if (e.key === 'Home') { e.preventDefault(); set(0); }
      else if (e.key === 'End') { e.preventDefault(); set(100); }
    });
    function applyRatio(b){
      var r = b.getAttribute('data-ratio').split('/');
      frame.style.aspectRatio = r[0] + '/' + r[1];
      frame.style.setProperty('--r', (r[0] / r[1]).toFixed(4));
    }
    function show(b){
      if (b.classList.contains('active')) return;
      var key = b.getAttribute('data-key');
      btns.forEach(function(x){ var on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      var swap = function(){
        applyRatio(b);
        after.src = 'assets/grade/' + key + '-grade.jpg';
        beforeImg.src = 'assets/grade/' + key + '-log.jpg';
        after.alt = b.getAttribute('data-alt');
        var r = b.getAttribute('data-ratio').split('/');
        after.width = beforeImg.width = +r[0]; after.height = beforeImg.height = +r[1];
      };
      if (hasGSAP && !REDUCE) {
        gsap.to(frame, { opacity: 0, duration: .2, onComplete: function(){
          swap();
          var go = function(){
            gsap.to(frame, { opacity: 1, duration: .45 });
            set(100);
            gsap.to({ v: 100 }, { v: 50, duration: 1.2, ease: 'expo.inOut', onUpdate: function(){ set(this.targets()[0].v); } });
          };
          if (after.complete) go(); else after.addEventListener('load', go, { once: true });
        }});
      } else swap();
    }
    btns.forEach(function(b){ b.addEventListener('click', function(){ show(b); }); });
    // preload the other frames so switching is instant
    btns.forEach(function(b){ var k = b.getAttribute('data-key'); [k + '-grade', k + '-log'].forEach(function(f){ var i = new Image(); i.src = 'assets/grade/' + f + '.jpg'; }); });
    var active = btns.filter(function(b){ return b.classList.contains('active'); })[0];
    if (active) applyRatio(active);
    set(50);
    return { set: set };
  })();

  /* -------------------------------------------------------------------
     HIRE — enquiry composer → opens a ready email
     ------------------------------------------------------------------- */
  (function(){
    var form = $('#hireForm');
    if (!form) return;
    var note = $('#hireNote');
    $$('.hf-group', form).forEach(function(g){
      var multi = g.getAttribute('data-multi') === '1';
      $$('.chip', g).forEach(function(c){
        c.addEventListener('click', function(){
          var on = c.getAttribute('aria-pressed') !== 'true';
          if (!multi) $$('.chip', g).forEach(function(o){ o.setAttribute('aria-pressed', 'false'); });
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      });
    });
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var picked = function(name){
        var g = form.querySelector('.hf-group[data-name="' + name + '"]');
        return $$('.chip[aria-pressed="true"]', g).map(function(c){ return c.textContent.trim(); });
      };
      var project = picked('Project'), needs = picked('Needs'), timing = picked('Timing');
      var name = form.elements.name.value.trim(), place = form.elements.place.value.trim(), idea = form.elements.idea.value.trim();
      if (!project.length && !idea) {
        note.textContent = 'Pick what we are making, or write a line about the idea.';
        note.classList.add('warn');
        return;
      }
      note.classList.remove('warn');
      var subject = 'Enquiry — ' + (project.length ? project.join(', ') : 'New project') + (name ? ' — ' + name : '');
      var lines = ['Hi Daniel,', ''];
      if (project.length) lines.push('Project: ' + project.join(', '));
      if (needs.length) lines.push('Need: ' + needs.join(', '));
      if (timing.length) lines.push('When: ' + timing.join(', '));
      if (place) lines.push('Based in: ' + place);
      if (idea) lines.push('', idea);
      lines.push('', name || '');
      var href = 'mailto:s3nagamedia@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      window.location.href = href;
      note.textContent = 'Your email app should open now. If it doesn\'t, write to s3nagamedia@gmail.com.';
    });
  })();

  /* -------------------------------------------------------------------
     FILMOGRAPHY thumbs (mobile inline + desktop floating preview)
     ------------------------------------------------------------------- */
  (function(){
    var rows = $$('#filmo a.filmo-row');
    rows.forEach(function(r){
      var id = r.getAttribute('data-yt');
      var t = r.querySelector('.f-thumb');
      if (id && t) t.style.backgroundImage = 'url(https://i.ytimg.com/vi/' + id + '/mqdefault.jpg)';
    });
    var prev = $('#filmoPreview'), pimg = $('#filmoPreviewImg'), list = $('#filmo');
    if (!prev || !FINE || !hasGSAP) return;
    var warmed = false;
    list.addEventListener('mouseenter', function(){
      if (warmed) return; warmed = true;
      rows.forEach(function(r){ var i = new Image(); i.src = 'https://i.ytimg.com/vi/' + r.getAttribute('data-yt') + '/hqdefault.jpg'; });
    });
    var xTo = gsap.quickTo(prev, 'x', { duration: .55, ease: 'power3' });
    var yTo = gsap.quickTo(prev, 'y', { duration: .55, ease: 'power3' });
    var rTo = gsap.quickTo(prev, 'rotation', { duration: .8, ease: 'power3' });
    var lastX = 0, shown = false;
    rows.forEach(function(r){
      r.addEventListener('mouseenter', function(e){
        pimg.src = 'https://i.ytimg.com/vi/' + r.getAttribute('data-yt') + '/hqdefault.jpg';
        if (!shown) {
          gsap.set(prev, { x: e.clientX + 28, y: e.clientY - 60 });
          lastX = e.clientX;
        }
        shown = true;
        gsap.to(prev, { opacity: 1, scale: 1, duration: .4, ease: 'power3.out', overwrite: 'auto' });
      });
    });
    list.addEventListener('mousemove', function(e){
      var w = prev.offsetWidth;
      var x = e.clientX + 28;
      if (x + w > window.innerWidth - 16) x = e.clientX - w - 28;
      xTo(x); yTo(e.clientY - prev.offsetHeight / 2);
      rTo(clamp((e.clientX - lastX) * 0.35, -8, 8));
      lastX = e.clientX;
    });
    list.addEventListener('mouseleave', function(){
      shown = false;
      gsap.to(prev, { opacity: 0, scale: .85, duration: .3, ease: 'power2.in', overwrite: 'auto' });
    });
  })();

  /* -------------------------------------------------------------------
     PROCESS BOARD — build tracks + hologram tooltip
     ------------------------------------------------------------------- */
  var TRACKS = [
    { label:'SUB', group:3, desc:"Subtitles — added at every delivery so the film reads with or without sound.",
      clips:[[3,'c-ash'],[10,'gap'],[4,'c-ash'],[3,'c-ash'],[14,'gap'],[5,'c-ash'],[4,'c-ash'],[3,'c-ash']] },
    { label:'V6', group:3, desc:"Titles & graphics — the top layer, reserved for text and on-screen graphics only.",
      clips:[[18,'gap'],[3,'c-red'],[2,'c-paper'],[30,'gap'],[3,'c-red'],[44,'gap']] },
    { label:'V5', group:2, desc:"Adjustment layers — full-frame colour passes stacked over finished cuts, not baked into any single clip.",
      clips:[[24,'gap'],[6,'c-ash'],[3,'c-ash'],[20,'gap'],[5,'c-ash'],[42,'gap']] },
    { label:'V4', group:1, desc:"A second layer of B-roll — texture and cutaways layered above the main image.",
      clips:[[8,'gap'],[3,'c-paper'],[3,'c-paper'],[16,'gap'],[4,'c-paper'],[24,'gap'],[3,'c-paper'],[39,'gap']] },
    { label:'V3', group:1, desc:"A first layer of B-roll — supporting footage cut in over the base performance or scene.",
      clips:[[5,'gap'],[4,'c-red'],[10,'gap'],[3,'c-ash'],[18,'gap'],[5,'c-red'],[3,'c-ash'],[22,'gap'],[4,'c-red'],[26,'gap']] },
    { label:'V2', group:1, desc:"Nested cutaways — smaller pre-built sequences dropped in whole, so the main timeline stays readable.",
      clips:[[6,'gap'],[3,'c-paper'],[30,'gap'],[8,'c-paper'],[20,'gap'],[10,'c-paper'],[23,'gap']] },
    { label:'V1', group:0, desc:"The base edit — the main cut everything else is built on top of.",
      clips:[[100,'c-ash']] },
    { label:'A1–3', group:0, desc:"Dialogue & sync sound — the audio recorded on set, cleaned and levelled.",
      clips:[[4,'c-red'],[10,'gap'],[12,'c-red'],[6,'gap'],[10,'c-red'],[8,'gap'],[14,'c-red'],[36,'gap']] },
    { label:'A4–6', group:4, desc:"Ambience & foley — room tone, atmosphere, and small sounds that make a scene feel real.",
      clips:[[2,'gap'],[6,'c-ash'],[6,'gap'],[9,'c-ash'],[10,'gap'],[7,'c-ash'],[8,'gap'],[6,'c-ash'],[46,'gap']] },
    { label:'A7–9', group:4, desc:"Score & sound design — the layers built entirely in post: music, tone, and texture.",
      clips:[[10,'gap'],[3,'c-paper'],[3,'c-paper'],[20,'gap'],[4,'c-paper'],[3,'c-paper'],[57,'gap']] }
  ];
  var procRows = [];
  (function(){
    var stage = $('.process-stage');
    var board = $('#processBoard');
    var tooltip = $('#procTooltip'), procTitle = $('#procTitle'), procDesc = $('#procDesc');
    if (!board) return;
    var playheadEl = $('#procPlayhead');

    TRACKS.forEach(function(t){
      var row = document.createElement('div');
      row.className = 'proc-row';
      row.setAttribute('tabindex', '0');
      row.setAttribute('aria-label', t.label + ': ' + t.desc);
      row.innerHTML = '<div class="proc-label">' + t.label + '</div><div class="proc-lane"></div>';
      var lane = row.querySelector('.proc-lane');
      t.clips.forEach(function(c){
        var el = document.createElement('div');
        el.style.flex = '0 0 ' + c[0] + '%';
        el.className = c[1] === 'gap' ? 'proc-gap' : ('proc-clip ' + c[1]);
        lane.appendChild(el);
      });
      var popUp = function(){
        board.querySelectorAll('.proc-row').forEach(function(r){ r.classList.remove('active'); });
        row.classList.add('active');
        procTitle.textContent = t.label;
        procDesc.textContent = t.desc;
        tooltip.style.top = row.offsetTop + 'px';
        tooltip.classList.add('show');
      };
      row.addEventListener('mouseenter', popUp);
      row.addEventListener('click', popUp);
      row.addEventListener('focus', popUp);
      board.insertBefore(row, playheadEl);
      procRows.push({ row: row, lane: lane, group: t.group, clips: $$('.proc-clip', lane) });
    });

    var hideTip = function(){
      board.querySelectorAll('.proc-row').forEach(function(r){ r.classList.remove('active'); });
      tooltip.classList.remove('show');
    };
    board.addEventListener('mouseleave', hideTip);
    board.addEventListener('focusout', function(e){ if (!board.contains(e.relatedTarget)) hideTip(); });
    document.addEventListener('click', function(e){ if (!stage.contains(e.target)) hideTip(); });
    board.addEventListener('scroll', hideTip, { passive: true });
  })();

  /* -------------------------------------------------------------------
     MASTER TIMELINE — the whole page as one sequence
     ------------------------------------------------------------------- */
  var master = (function(){
    var bar = $('#master'), clipsWrap = $('#masterClips'), head = $('#masterHead');
    var tcEl = $('#masterTC'), nameEl = $('#masterName'), track = $('#masterTrack');
    if (!bar) return null;
    var navLinks = $$('.nav-links a');
    var scenes = [{ el: $('#top'), name: 'Open', sc: '00' }].concat($$('.sec').map(function(s){
      return { el: s, name: s.getAttribute('data-name'), sc: s.getAttribute('data-scene') };
    }));
    var bounds = [];
    var btns = scenes.map(function(s, i){
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'm-clip';
      b.setAttribute('aria-label', 'Go to ' + s.name);
      b.innerHTML = '<span class="m-lbl">' + (i ? s.sc + ' ' : '') + s.name + '</span><i class="m-line"><i class="m-fill"></i></i>';
      b.addEventListener('click', function(){ scrollToTarget(i === 0 ? 0 : s.el, { duration: 1.6 }); });
      clipsWrap.appendChild(b);
      return b;
    });
    var fills = btns.map(function(b){ return b.querySelector('.m-fill'); });

    function maxScroll(){ return Math.max(1, document.documentElement.scrollHeight - window.innerHeight); }
    function measure(){
      var m = maxScroll();
      bounds = scenes.map(function(s, i){
        // a scene becomes "current" once it fills the reading line (40% down the viewport)
        var top = i === 0 ? 0 : s.el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.4;
        return clamp(top / m, 0, 1);
      });
      bounds.push(1);
      btns.forEach(function(b, i){ b.style.flex = '0 0 calc(' + ((bounds[i+1] - bounds[i]) * 100) + '% - 4px)'; });
      update();
    }
    var current = -1;
    function update(){
      var y = window.scrollY;
      var p = clamp(y / maxScroll(), 0, 1);
      head.style.left = (p * 100) + '%';
      tcEl.textContent = tc(Math.round(y / 3));
      var idx = 0;
      for (var i = 0; i < scenes.length; i++) if (p >= bounds[i] - 0.0005) idx = i;
      if (idx !== current) {
        current = idx;
        btns.forEach(function(b, i){ b.classList.toggle('active', i === idx); });
        nameEl.textContent = 'SC ' + scenes[idx].sc + ' — ' + scenes[idx].name;
        navLinks.forEach(function(a){ a.classList.toggle('is-active', a.getAttribute('href') === '#' + (scenes[idx].el.id)); });
      }
      var span = Math.max(0.0001, bounds[idx+1] - bounds[idx]);
      fills.forEach(function(f, i){ f.style.transform = 'scaleX(' + (i === idx ? clamp((p - bounds[idx]) / span, 0, 1) : (i < idx ? 1 : 0)) + ')'; });
      bar.classList.toggle('show', y > window.innerHeight * 0.55);
    }

    /* drag the head to scrub the page */
    var dragging = false;
    function scrubTo(clientX){
      var r = track.getBoundingClientRect();
      var p = clamp((clientX - r.left) / r.width, 0, 1);
      scrollToTarget(p * maxScroll(), { immediate: true });
    }
    head.addEventListener('pointerdown', function(e){
      dragging = true;
      head.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    head.addEventListener('pointermove', function(e){ if (dragging) scrubTo(e.clientX); });
    head.addEventListener('pointerup', function(){ dragging = false; });
    head.addEventListener('pointercancel', function(){ dragging = false; });

    var queued = false;
    window.addEventListener('scroll', function(){ if (queued) return; queued = true; requestAnimationFrame(function(){ queued = false; update(); }); }, { passive: true });
    window.addEventListener('resize', measure);
    if (hasGSAP) ST.addEventListener('refresh', measure);
    measure();
    return { measure: measure };
  })();

  /* rewind */
  (function(){
    var r = $('#rewind');
    if (!r) return;
    r.addEventListener('click', function(){
      scrollToTarget(0, { duration: 2.6, easing: function(t){ return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; } });
    });
  })();

  /* ===================================================================
     MOTION (GSAP only, skipped for reduced motion)
     =================================================================== */
  if (!hasGSAP || REDUCE) {
    var hc = $('#heroContent');
    if (hc) hc.classList.add('is-in');
    var leaderEl = $('#leader');
    if (leaderEl) leaderEl.remove();
    html.classList.remove('show-leader');
    return;
  }

  /* hero name → chars */
  var heroChars = $$('.hero-name .hn').map(splitChars);

  function heroIntro(){
    var tl = gsap.timeline();
    var hc = $('#heroContent');
    tl.add(function(){ hc.classList.add('is-in'); });
    heroChars.forEach(function(chars, k){
      tl.fromTo(chars, { yPercent: 115 }, { yPercent: 0, duration: 1.15, ease: 'expo.out', stagger: .045 }, k * .12);
    });
    tl.fromTo('.hero-lower > *', { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: .9, ease: 'power3.out', stagger: .1 }, .45);
    tl.fromTo('.hud-c', { scale: .4, opacity: 0 }, { scale: 1, opacity: 1, duration: .9, ease: 'expo.out', stagger: .05 }, .1);
    tl.fromTo('.hud-row, .hud-cross, .scroll-cue', { opacity: 0 }, { opacity: 1, duration: .8 }, .5);
    tl.fromTo('#heroVideo', { scale: 1.12 }, { scale: 1, duration: 2.4, ease: 'expo.out' }, 0);
    return tl;
  }

  /* leader → "Film by S3NAGA" → hero
     3 · 2 · 1 at roughly a second each, the title card holds, and the curtain
     only opens once the hero footage can play (or after a sensible cap). */
  (function(){
    var leader = $('#leader');
    var showLeader = html.classList.contains('show-leader') && leader;
    if (!showLeader) {
      if (leader) leader.remove();
      heroIntro();
      return;
    }
    stopScroll();
    var num = $('#leaderNum'), sweep = $('#leaderSweep');
    var vid = $('#heroVideo');
    var finished = false;
    var finish = function(){
      if (finished) return;
      finished = true;
      try { sessionStorage.setItem('s3_leader', '1'); } catch(e) {}
      leader.remove();
      html.classList.remove('show-leader');
      startScroll();
    };

    /* hero footage readiness */
    var videoReady = !vid || vid.readyState >= 3;
    if (!videoReady) {
      var mark = function(){ videoReady = true; };
      vid.addEventListener('canplaythrough', mark, { once: true });
      vid.addEventListener('canplay', mark, { once: true });
      vid.addEventListener('error', mark, { once: true });
    }

    var tl = gsap.timeline({ onComplete: finish });
    gsap.set('#leaderTitle', { opacity: 0 });
    gsap.set('.lt-by', { opacity: 0, y: 30 });
    gsap.set('.lt-name', { clipPath: 'inset(0 100% 0 0)' });

    ['3','2','1'].forEach(function(n){
      tl.add(function(){ num.textContent = n; });
      tl.fromTo(sweep, { '--a': '0deg' }, { '--a': '360deg', duration: 1, ease: 'none' });
    });
    // count-down out, title card in
    tl.to('.leader-ring, .leader-grid', { opacity: 0, duration: .35, ease: 'power2.in' });
    tl.set('#leaderTitle', { opacity: 1 });
    tl.to('.lt-by', { opacity: 1, y: 0, duration: .7, ease: 'power3.out' }, '>-0.05');
    tl.to('.lt-name', { clipPath: 'inset(0 0% 0 0)', duration: 1.1, ease: 'expo.inOut' }, '<0.15');
    tl.addLabel('hold');
    // hold on the card; if the footage still isn't ready, keep holding (up to ~2.5s more)
    tl.add(function(){
      if (videoReady) return;
      tl.pause();
      var waited = 0;
      var iv = setInterval(function(){
        waited += 100;
        if (videoReady || waited >= 2500) { clearInterval(iv); tl.resume(); }
      }, 100);
    }, 'hold+=1.1');
    tl.to('#leaderTitle, .leader-meta, .leader-skip', { opacity: 0, duration: .45, ease: 'power2.in' }, 'hold+=1.2');
    tl.to('.leader-bar', { backgroundColor: '#ece3d6', duration: .04 });
    tl.to('.leader-bar', { backgroundColor: '#000', duration: .1 });
    tl.addLabel('open');
    tl.to('.leader-bar.top', { yPercent: -101, duration: 1.1, ease: 'expo.inOut' }, 'open');
    tl.to('.leader-bar.bottom', { yPercent: 101, duration: 1.1, ease: 'expo.inOut' }, 'open');
    tl.add(heroIntro(), 'open+=0.4');
    // the page is usable as soon as the curtain is mostly open (intro keeps playing underneath)
    tl.add(function(){
      if (finished) return;
      leader.style.pointerEvents = 'none';
      startScroll();
    }, 'open+=0.8');
    // click anywhere: skip straight to the cut
    leader.addEventListener('click', function(){
      if (tl.time() < tl.labels.open) { tl.resume(); tl.seek('open'); }
    });
  })();

  /* hero on scroll: frame tightens, title drifts up */
  gsap.timeline({ scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom top', scrub: true } })
    .fromTo('#heroFrame', { scale: 1, yPercent: 0 }, { scale: .9, yPercent: 6, ease: 'none', duration: 1 }, 0)
    .fromTo('#heroContent', { yPercent: 0 }, { yPercent: -28, ease: 'none', duration: 1, immediateRender: false }, 0)
    .fromTo('#heroContent', { opacity: 1 }, { opacity: 0, ease: 'power1.in', duration: .85, immediateRender: false }, .15)
    .fromTo('#hud', { opacity: 1 }, { opacity: 0, ease: 'none', immediateRender: false }, 0);

  /* film strip — loops, speeds up + leans with scroll speed, reverses on scroll up */
  (function(){
    var track = $('#stripTrack');
    if (!track) return;
    var loop = gsap.to(track, { xPercent: -50, duration: 34, ease: 'none', repeat: -1 });
    loop.totalTime(loop.duration() * 400); // headroom so it can run backwards forever
    var vel = 0, dir = 1, ts = 1, skew = 0, visible = false;
    ST.create({
      trigger: '.filmstrip', start: 'top bottom', end: 'bottom top',
      onToggle: function(self){ visible = self.isActive; if (!visible) { loop.timeScale(dir); gsap.set(track, { skewX: 0 }); } },
      onUpdate: function(self){ vel = self.getVelocity(); if (vel) dir = vel > 0 ? 1 : -1; }
    });
    gsap.ticker.add(function(){
      if (!visible) return;
      var targetTs = dir * (1 + clamp(Math.abs(vel) / 260, 0, 8));
      var targetSkew = clamp(-vel / 300, -8, 8);
      vel *= 0.88;                       // decay toward idle
      ts += (targetTs - ts) * 0.12;
      skew += (targetSkew - skew) * 0.12;
      loop.timeScale(ts);
      gsap.set(track, { skewX: Math.abs(skew) < .02 ? 0 : skew });
    });
  })();

  /* section heads: slate clap + title rise + rule draw */
  $$('.section-head').forEach(function(head){
    var arm = $('.slate-arm', head), title = $('.reveal-title > span', head), p = $('p', head), body = $('.slate-body', head);
    var tl = gsap.timeline({ scrollTrigger: { trigger: head, start: 'top 85%', once: true } });
    tl.fromTo(arm, { rotation: -28 }, { rotation: 0, duration: .5, ease: 'back.in(3)' }, 0)
      .fromTo(body, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: .5 }, 0)
      .fromTo(title, { yPercent: 108 }, { yPercent: 0, duration: 1.1, ease: 'expo.out' }, .25)
      .fromTo(p, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .8, ease: 'power3.out' }, .45)
      /* the red rule draws through, then retracts and leaves the hairline behind */
      .fromTo(head, { '--draw': 0, '--o': 'left' }, { '--draw': 1, duration: 1, ease: 'expo.inOut' }, .2)
      .set(head, { '--o': 'right' })
      .to(head, { '--draw': 0, duration: 1, ease: 'expo.inOut' }, '+=0.15');
  });

  /* about: words light up as you read */
  (function(){
    var bio = $('#aboutBio');
    if (!bio) return;
    var words = splitWords(bio);
    var paper = '#ece3d6', red = '#c9382d', faint = '#3a342e';
    words.forEach(function(w){ w.dataset.c = w.closest('em.hl') ? red : paper; });
    gsap.fromTo(words, { color: faint }, {
      color: function(i, el){ return el.dataset.c; },
      stagger: .1, ease: 'none',
      scrollTrigger: { trigger: bio, start: 'top 78%', end: 'bottom 52%', scrub: .6 }
    });
    var count = $('.count');
    if (count) {
      var o = { v: 0 };
      count.textContent = '0';
      gsap.to(o, { v: +count.dataset.to, duration: 1.6, ease: 'power2.out', snap: { v: 1 },
        onUpdate: function(){ count.textContent = String(Math.round(o.v)); },
        scrollTrigger: { trigger: count, start: 'top 88%', once: true } });
    }
    var ex = $('.scramble-in');
    if (ex) ST.create({ trigger: ex, start: 'top 88%', once: true, onEnter: function(){ scramble(ex, ex.dataset.text, 900); } });
    gsap.fromTo('.disciplines li', { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: .6, ease: 'power3.out', stagger: .06,
      scrollTrigger: { trigger: '.disciplines', start: 'top 90%', once: true } });
  })();

  /* work: screen opens, films slide in like frames on a strip */
  (function(){
    var tl = gsap.timeline({ scrollTrigger: { trigger: '#reel', start: 'top 82%', once: true } });
    tl.fromTo('.reel-screen', { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.1, ease: 'expo.inOut', clearProps: 'clipPath' })
      .fromTo('.reel-info > *', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .8, ease: 'power3.out', stagger: .06 }, .4)
      .fromTo('.reel-item', { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: .9, ease: 'expo.out', stagger: .08 }, .55)
      .fromTo('#work .ig-line', { opacity: 0 }, { opacity: 1, duration: .6 }, .9);
  })();

  /* process: the edit builds itself layer by layer as you scroll */
  (function(){
    if (!procRows.length) return;
    var steps = $$('#procSteps li');
    var ph = $('#procPlayhead');
    var board = $('#processBoard');
    var groups = [0,1,2,3,4].map(function(g){ return procRows.filter(function(r){ return r.group === g; }); });

    function laneGeom(){
      var lane = procRows[0].lane;
      return { left: lane.offsetLeft, width: lane.offsetWidth };
    }
    function setSteps(prog){
      var at = Math.min(4, Math.floor(prog * 5 + 0.0001));
      steps.forEach(function(li, i){
        li.classList.toggle('on', i < at || prog >= 1);
        li.classList.toggle('now', i === at && prog < 1 && prog > 0);
      });
      var g = laneGeom();
      ph.style.left = (g.left + g.width * prog) + 'px';
      ph.style.opacity = prog > 0 && prog < 1 ? '1' : '0';
    }

    function buildTimeline(){
      var tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
      groups.forEach(function(g, gi){
        var clips = [];
        g.forEach(function(r){ clips = clips.concat(r.clips); });
        tl.fromTo(clips, { scaleX: 0 }, { scaleX: 1, duration: 1, stagger: .08 }, gi * 1.1);
        g.forEach(function(r){
          tl.add(function(){ r.row.classList.add('lit'); }, gi * 1.1 + .01);
        });
      });
      return tl;
    }

    var mm = gsap.matchMedia();
    mm.add('(min-width: 761px) and (min-height: 660px)', function(){
      var tl = buildTimeline();
      ST.create({
        trigger: '#processPin', start: 'top 84px', end: function(){ return '+=' + Math.round(window.innerHeight * 1.15); },
        pin: true, scrub: .6, animation: tl, anticipatePin: 1,
        onUpdate: function(self){ setSteps(self.progress); }
      });
      return function(){ procRows.forEach(function(r){ r.row.classList.remove('lit'); }); };
    });
    mm.add('(max-width: 760px), (max-height: 659px)', function(){
      var tl = buildTimeline();
      ST.create({
        trigger: board, start: 'top 85%', end: 'bottom 35%', scrub: .6, animation: tl,
        onUpdate: function(self){ setSteps(self.progress); }
      });
    });
  })();

  /* grade: the frame opens on full log, then the grade wipes in */
  (function(){
    if (!gradeSlider) return;
    gradeSlider.set(100);
    var o = { v: 100 };
    gsap.timeline({ scrollTrigger: { trigger: '#gradeFrame', start: 'top 70%', once: true } })
      .fromTo('.grade-stage', { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1, ease: 'expo.inOut', clearProps: 'clipPath' })
      .to(o, { v: 50, duration: 1.6, ease: 'expo.inOut', onUpdate: function(){ gradeSlider.set(o.v); } }, '-=0.1')
      .fromTo('#gradeFrames li', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .7, ease: 'power3.out', stagger: .08 }, .4);
  })();

  /* hire: title rises, the questions come in one by one */
  (function(){
    var tl = gsap.timeline({ scrollTrigger: { trigger: '#hire', start: 'top 78%', once: true } });
    tl.fromTo('#hire .slate-arm', { rotation: -28 }, { rotation: 0, duration: .5, ease: 'back.in(3)' }, 0)
      .fromTo('#hire .reveal-title > span', { yPercent: 108 }, { yPercent: 0, duration: 1.1, ease: 'expo.out' }, .2)
      .fromTo('#hire .hire-lede, #hire .hire-roles', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .8, ease: 'power3.out', stagger: .1 }, .45)
      .fromTo('#hireForm > *', { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: .8, ease: 'power3.out', stagger: .08 }, .35);
  })();

  /* stills: frames wipe open like shutters */
  $$('.stills-row').forEach(function(row){
    gsap.fromTo($$('figure', row), { clipPath: 'inset(100% 0% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.inOut', stagger: .09,
      clearProps: 'clipPath',
      scrollTrigger: { trigger: row, start: 'top 85%', once: true }
    });
  });

  /* filmography rows */
  gsap.fromTo('#filmo .filmo-row', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: .8, ease: 'power3.out', stagger: .07,
    scrollTrigger: { trigger: '#filmo', start: 'top 82%', once: true } });

  /* contact: the poem is read into the frame */
  (function(){
    var poem = $('#poem');
    if (!poem) return;
    var words = splitWords(poem);
    var em = $('em', poem);
    gsap.fromTo(words, { opacity: .1, y: 18 }, {
      opacity: 1, y: 0, stagger: .12, ease: 'none',
      scrollTrigger: {
        trigger: poem, start: 'top 82%', end: 'bottom 50%', scrub: .7,
        onUpdate: function(self){ if (em) em.classList.toggle('is-red', self.progress > .62); }
      }
    });
    gsap.fromTo('.contact .eyebrow', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .8, scrollTrigger: { trigger: '.contact', start: 'top 80%', once: true } });
    gsap.fromTo('.mail-wrap, .contact .links', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .12,
      scrollTrigger: { trigger: '.mail-wrap', start: 'top 90%', once: true } });
    gsap.fromTo('.credits span, .credits-name', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .6, stagger: .08,
      scrollTrigger: { trigger: '.credits', start: 'top 92%', once: true } });
  })();

  /* keep measurements honest once fonts + images settle */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ ST.refresh(); });
  window.addEventListener('load', function(){ ST.refresh(); });
})();
