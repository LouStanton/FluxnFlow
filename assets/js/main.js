/* ============================================================
   Flux & Flow - interactions
   three.js particle wave field (cursor-reactive) + nav + form helpers
   Loaded as a classic (non-module) script so it also runs when the
   site is opened directly as a file:// path, not just over http(s).
   three.js itself is fetched via a dynamic import() at runtime.
   ============================================================ */

(function () {
  "use strict";

  // Show the home page as the bare domain, never /index.html
  if (/^https?:$/.test(location.protocol) && /\/index\.html$/.test(location.pathname)) {
    history.replaceState(null, "", location.pathname.replace(/index\.html$/, "") + location.search + location.hash);
  }

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var THREE_CDN_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

  /* ------------------------------------------------------------
     Custom cursor - an ampersand follows the pointer on devices
     with a real mouse. Skipped entirely on touch (no pointer:fine).
     ------------------------------------------------------------ */
  if (window.matchMedia("(pointer: fine)").matches) {
    var cursorEl = document.createElement("span");
    cursorEl.className = "custom-cursor is-hidden";
    cursorEl.setAttribute("aria-hidden", "true");
    cursorEl.textContent = "&";
    document.body.appendChild(cursorEl);
    document.documentElement.classList.add("has-custom-cursor");

    var cursorX = 0;
    var cursorY = 0;
    function renderCursor() {
      cursorEl.style.transform = "translate(" + cursorX + "px, " + cursorY + "px) translate(-50%, -50%)" +
        (cursorEl.classList.contains("is-pressed") ? " scale(0.85)" : "");
    }

    window.addEventListener("pointermove", function (e) {
      cursorEl.classList.remove("is-hidden");
      cursorX = e.clientX;
      cursorY = e.clientY;
      renderCursor();
    });
    window.addEventListener("pointerleave", function () {
      cursorEl.classList.add("is-hidden");
    });
    document.addEventListener("pointerdown", function () {
      cursorEl.classList.add("is-pressed");
      renderCursor();
    });
    document.addEventListener("pointerup", function () {
      cursorEl.classList.remove("is-pressed");
      renderCursor();
    });
  }

  /* ------------------------------------------------------------
     Hero word cycle ("Let's create your Brand / Story / Design")
     ------------------------------------------------------------ */
  var cycleWrap = document.querySelector("[data-cycle]");
  if (cycleWrap && !reducedMotion) {
    var cycleWords = cycleWrap.querySelectorAll(".hero__cycle-word");
    var cycleIndex = 0;
    setInterval(function () {
      cycleWords[cycleIndex].classList.remove("is-active");
      cycleIndex = (cycleIndex + 1) % cycleWords.length;
      cycleWords[cycleIndex].classList.add("is-active");
    }, 2200);
  }


  /* ------------------------------------------------------------
     Scroll-linked ampersand colour - each ".amp-scroll" glyph
     mixes from ink toward its flux colour as it travels from the
     vertical centre of the viewport up to the top, so it's fully
     coloured by the time you've scrolled past it.
     ------------------------------------------------------------ */
  var ampScrollEls = document.querySelectorAll(".amp-scroll");
  if (ampScrollEls.length) {
    var updateAmpScroll = function () {
      var vh = window.innerHeight;
      ampScrollEls.forEach(function (el) {
        var top = el.getBoundingClientRect().top;
        var t = (vh * 0.5 - top) / (vh * 0.5);
        el.style.setProperty("--amp-t", Math.min(1, Math.max(0, t)));
      });
    };
    updateAmpScroll();
    window.addEventListener("scroll", updateAmpScroll, { passive: true });
    window.addEventListener("resize", updateAmpScroll);
  }

  /* ------------------------------------------------------------
     Header scroll state
     ------------------------------------------------------------ */
  var header = document.querySelector(".header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ------------------------------------------------------------
     Mobile nav toggle
     ------------------------------------------------------------ */
  var menuToggle = document.querySelector(".header__menu-toggle");
  var mobileNav = document.querySelector(".mobile-nav");
  var mobileClose = document.querySelector(".mobile-nav__close");

  function closeMenu() {
    if (mobileNav) mobileNav.classList.remove("is-open");
    if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener("click", function () {
      var open = mobileNav.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    });
  }
  if (mobileClose) mobileClose.addEventListener("click", closeMenu);
  if (mobileNav) {
    mobileNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
  }

  /* ------------------------------------------------------------
     Dot field - three.js: a real wave-field mesh of points in 3D,
     perspective camera, vertex-shader displacement, cursor swell.
     Colour samples the Flux Spectrum by horizontal position, with a
     slow hue drift, over a white surface. This runs on the home
     hero only - inner pages use a static gradient, not the field.
     reduced-motion, or if three.js can't be fetched: static 2D grid.
     ------------------------------------------------------------ */
  function initStaticDotField(canvas) {
    var ctx = canvas.getContext("2d");
    var wrap = canvas.parentElement;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function draw() {
      var w = wrap.clientWidth;
      var h = wrap.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      var gap = w < 700 ? 40 : 54;
      var cols = Math.ceil(w / gap) + 1;
      var rows = Math.ceil(h / gap) + 1;
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var seed = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
          seed = Math.abs(seed);
          var col = fluxColorAt(x / cols);
          ctx.beginPath();
          var chaos = 1;
          var seed2 = Math.abs((Math.sin(x * 39.346 + y * 11.135) * 24634.6345) % 1);
          var jx = (seed - 0.5) * gap * 1.6 * chaos;
          var jy = (seed2 - 0.5) * gap * 1.6 * chaos;
          ctx.arc(x * gap + jx, y * gap + jy, 1.3 + seed * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(" + col[0] + ", " + col[1] + ", " + col[2] + ", " + (0.5 + seed * 0.3) + ")";
          ctx.fill();
        }
      }
    }

    draw();
    window.addEventListener("resize", draw);
  }

  // Dot field stops - blue tones only: sky, blue, cobalt, blue, sky
  var FLUX_STOPS = [
    [180, 214, 255],
    [66, 152, 251],
    [18, 87, 201],
    [66, 152, 251],
    [180, 214, 255],
  ];

  function fluxColorAt(t) {
    t = ((t % 1) + 1) % 1;
    var scaled = t * (FLUX_STOPS.length - 1);
    var i = Math.floor(scaled);
    var f = scaled - i;
    var a = FLUX_STOPS[Math.min(i, FLUX_STOPS.length - 1)];
    var b = FLUX_STOPS[Math.min(i + 1, FLUX_STOPS.length - 1)];
    return [
      Math.round(a[0] + (b[0] - a[0]) * f),
      Math.round(a[1] + (b[1] - a[1]) * f),
      Math.round(a[2] + (b[2] - a[2]) * f),
    ];
  }

  function initWaveField(canvas, THREE) {
    var wrap = canvas.parentElement;

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 2.2, 7.5);
    camera.lookAt(0, 0, 0);

    // grid of points displaced by layered sine waves in the vertex shader
    var COLS = 72;
    var ROWS = 32;
    var W = 26;
    var H = 13;
    var count = COLS * ROWS;
    var positions = new Float32Array(count * 3);
    var seeds = new Float32Array(count);

    var i = 0;
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        positions[i * 3 + 0] = (x / (COLS - 1) - 0.5) * W;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = (y / (ROWS - 1) - 0.5) * H;
        seeds[i] = Math.random();
        i++;
      }
    }

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

    var uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uColInk: { value: new THREE.Color("#0d0d10") },
      // 0 at rest, rises to 1 while the pointer is over the banner
      uActive: { value: 0 },
      // half-width of the visible field at the origin, so the effect sits under the pointer
      uHalfW: { value: 8 },
      // Blue tones only - sky, blue, cobalt - sampled across the field by position + slow drift
      uStop0: { value: new THREE.Color("#b4d6ff") },
      uStop1: { value: new THREE.Color("#4298fb") },
      uStop2: { value: new THREE.Color("#1257c9") },
      uStop3: { value: new THREE.Color("#4298fb") },
      uStop4: { value: new THREE.Color("#b4d6ff") },
    };

    var material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: [
        "uniform float uTime;",
        "uniform vec2 uMouse;",
        "uniform float uPixelRatio;",
        "uniform float uActive;",
        "uniform float uHalfW;",
        "attribute float aSeed;",
        "varying float vElev;",
        "varying float vSeed;",
        "varying float vNear;",
        "varying float vFade;",
        "varying vec2 vUvPos;",
        "void main() {",
        "  vec3 g = position;",
        "  float t = uTime * 0.38;",
        "  // pointer in field space",
        "  float mx = uMouse.x * uHalfW;",
        "  float mz = -uMouse.y * 4.2;",
        "",
        "  // FLUX (default): every dot is off its grid, drifting on its own rhythm",
        "  vec3 f = g;",
        "  f.x += (aSeed - 0.5) * 2.4 + sin(aSeed * 23.0 + uTime * 0.7) * 0.3;",
        "  f.z += (fract(aSeed * 7.31) - 0.5) * 2.4;",
        "  f.y = sin(g.x * 0.55 + t) * 0.2 + sin(g.z * 0.85 + t * 1.4) * 0.12 + sin(aSeed * 40.0 + uTime) * 0.6;",
        "",
        "  // FLOW (pointer): three clear lines form across the whole field, passing",
        "  // through the pointer. Dots within reach leave the scatter, take an evenly",
        "  // spaced place on the line and travel along it, like beads on a thread.",
        "  float band = abs(g.z - mz);",
        "  float pull = smoothstep(4.8, 3.0, band) * uActive;",
        "  pull = pull * pull * (3.0 - 2.0 * pull);",
        "  // three lines flowing together. Rows share places so the dots sit apart",
        "  // with clear gaps, like the original dot field, instead of merging.",
        "  float row = floor((g.z / 13.0 + 0.5) * 31.0 + 0.5);",
        "  float lane = mod(row, 3.0) - 1.0;",
        "  float slot = mod(floor(row / 3.0), 2.0) * 0.5 * (26.0 / 71.0);",
        "  float xf = mod(g.x + slot + lane * 0.09 + uTime * 0.9 + 13.0, 26.0) - 13.0;",
        "  float alongF = xf - mx;",
        "  float rise = sin(alongF * 0.38 - uTime * 0.6 + lane * 0.45) * 0.7 * smoothstep(0.0, 6.0, abs(alongF));",
        "  vec3 w = vec3(xf, 0.25 + rise + lane * 0.3, mz + lane * 0.2);",
        "",
        "  vec3 p = mix(f, w, pull);",
        "  vNear = pull;",
        "  // hide the wrap-around at the far ends of the line",
        "  vFade = mix(1.0, smoothstep(13.0, 10.5, abs(xf)), pull);",
        "  vElev = p.y;",
        "  vSeed = aSeed;",
        "  vUvPos = vec2(position.x / 26.0 + 0.5, position.z / 13.0 + 0.5);",
        "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
        "  gl_Position = projectionMatrix * mv;",
        "  gl_PointSize = mix(2.0 + aSeed * 2.0, 5.6, pull) * uPixelRatio * (6.0 / -mv.z);",
        "}",
      ].join("\n"),
      fragmentShader: [
        "uniform vec3 uColInk;",
        "uniform vec3 uStop0;",
        "uniform vec3 uStop1;",
        "uniform vec3 uStop2;",
        "uniform vec3 uStop3;",
        "uniform vec3 uStop4;",
        "uniform float uTime;",
        "varying float vElev;",
        "varying float vSeed;",
        "varying float vNear;",
        "varying float vFade;",
        "varying vec2 vUvPos;",
        "vec3 fluxSpectrum(float t) {",
        "  t = fract(t);",
        "  float scaled = t * 4.0;",
        "  float f = fract(scaled);",
        "  int i = int(floor(scaled));",
        "  if (i == 0) return mix(uStop0, uStop1, f);",
        "  if (i == 1) return mix(uStop1, uStop2, f);",
        "  if (i == 2) return mix(uStop2, uStop3, f);",
        "  return mix(uStop3, uStop4, f);",
        "}",
        "void main() {",
        "  float d = length(gl_PointCoord - 0.5);",
        "  if (d > 0.5) discard;",
        "  float drift = uTime * 0.012;",
        "  vec3 hue = fluxSpectrum(vUvPos.x * 0.85 + drift);",
        "  float energy = smoothstep(0.15, 1.3, abs(vElev));",
        "  // one colour throughout: the line is the same pale blue as the scatter.",
        "  // It reads as a line because its dots are solid, even and aligned.",
        "  // (colours arrive in linear space; convert so the pale blue shows as specified)",
        "  vec3 col = pow(uStop0, vec3(1.0 / 2.2));",
        "  float alpha = (0.5 + energy * 0.25) * (0.6 + vSeed * 0.4);",
        "  alpha = mix(alpha, vFade, vNear);",
        "  gl_FragColor = vec4(col, alpha);",
        "}",
      ].join("\n"),
    });

    var points = new THREE.Points(geometry, material);
    points.rotation.x = -0.12;
    scene.add(points);

    function resize() {
      var w = wrap.clientWidth;
      var h = wrap.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / (h || 1);
      camera.updateProjectionMatrix();
      uniforms.uHalfW.value = Math.tan((55 * Math.PI) / 360) * 7.8 * camera.aspect;
    }
    resize();
    window.addEventListener("resize", resize);

    var mouse = { x: 0, y: 0, tx: 0, ty: 0, active: 0, activeTarget: 0 };
    function onPointerMove(e) {
      mouse.activeTarget = 1;
      var rect = wrap.getBoundingClientRect();
      mouse.tx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.ty = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    }
    function onPointerLeave() {
      mouse.tx = 0;
      mouse.ty = 0;
      mouse.activeTarget = 0;
    }
    if (window.matchMedia("(hover: none)").matches) {
      mouse.activeTarget = 1;
    } else {
      wrap.addEventListener("pointermove", onPointerMove);
    }
    wrap.addEventListener("pointerleave", onPointerLeave);

    var visible = true;
    new IntersectionObserver(
      function (entries) { visible = entries[0].isIntersecting; },
      { threshold: 0 }
    ).observe(wrap);

    var clock = new THREE.Clock();
    renderer.setAnimationLoop(function () {
      if (!visible) return;
      uniforms.uTime.value = clock.getElapsedTime();

      mouse.x += (mouse.tx - mouse.x) * 0.12;
      mouse.y += (mouse.ty - mouse.y) * 0.12;
      mouse.active += (mouse.activeTarget - mouse.active) * 0.07;
      uniforms.uMouse.value.set(mouse.x, mouse.y);
      uniforms.uActive.value = mouse.active;

      camera.position.x = mouse.x * 0.5;
      camera.position.y = 2.2 + mouse.y * 0.25;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    });
  }

  var dotFieldCanvases = document.querySelectorAll("[data-dot-field]");
  if (dotFieldCanvases.length) {
    if (reducedMotion) {
      dotFieldCanvases.forEach(initStaticDotField);
    } else {
      // dynamic import() works from a classic script even when the page
      // itself was opened as file:// - it's a normal cross-origin fetch
      // to the CDN, not a same-origin module load (which file:// blocks)
      import(THREE_CDN_URL)
        .then(function (THREE) {
          dotFieldCanvases.forEach(function (canvas) {
            initWaveField(canvas, THREE);
          });
        })
        .catch(function () {
          // offline, CDN blocked, etc. - fall back rather than show nothing
          dotFieldCanvases.forEach(initStaticDotField);
        });
    }
  }

  /* ------------------------------------------------------------
     Scroll reveal for sections (simple, no external deps)
     ------------------------------------------------------------ */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if (revealEls.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ------------------------------------------------------------
     Work page filter (All / Branding / Animation)
     ------------------------------------------------------------ */
  var filterBtns = document.querySelectorAll("[data-filter]");
  var workCards = document.querySelectorAll("[data-category]");

  /* Mosaic: one full-width tile, then two squares, repeating over the
     cards that are showing. A square left on its own goes full width,
     so every filter (and any number of projects) fills whole rows. */
  var mosaic = document.querySelector(".work-grid--mosaic");
  function layoutMosaic() {
    if (!mosaic) return;
    var shown = Array.prototype.filter.call(workCards, function (c) {
      return !c.classList.contains("is-filtered-out");
    });
    shown.forEach(function (card, i) {
      var full = i % 3 === 0 || (i % 3 === 1 && i === shown.length - 1);
      card.classList.toggle("work-card--full", full);
      card.classList.toggle("work-card--square", !full);
    });
  }
  layoutMosaic();

  if (filterBtns.length && workCards.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var filter = btn.getAttribute("data-filter");

        filterBtns.forEach(function (b) {
          b.classList.remove("is-active");
          b.setAttribute("aria-pressed", "false");
        });
        btn.classList.add("is-active");
        btn.setAttribute("aria-pressed", "true");

        var shown = 0;
        workCards.forEach(function (card) {
          var cats = (card.getAttribute("data-category") || "").split(" ");
          var match = filter === "all" || cats.indexOf(filter) !== -1;
          card.classList.toggle("is-filtered-out", !match);
          if (match) shown++;
        });
        var empty = document.querySelector("[data-work-empty]");
        if (empty) empty.hidden = shown > 0;
        layoutMosaic();
      });
    });
  }

  /* ------------------------------------------------------------
     Case study galleries become a full-width slider with dots.
     Native horizontal scrolling with snap, so touch, trackpad and
     keyboard all work; arrows and dots are added for mouse users.
     ------------------------------------------------------------ */
  document.querySelectorAll(".case-gallery").forEach(function (gallery) {
    var imgs = Array.prototype.slice.call(gallery.querySelectorAll("img"));
    if (imgs.length < 2) return;

    var slider = document.createElement("div");
    slider.className = "case-slider";
    slider.setAttribute("role", "group");
    slider.setAttribute("aria-roledescription", "carousel");
    slider.setAttribute("aria-label", "Project images");

    var track = document.createElement("div");
    track.className = "case-slider__track";
    track.setAttribute("tabindex", "0");

    imgs.forEach(function (img, i) {
      var slide = document.createElement("div");
      slide.className = "case-slider__slide";
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-label", "Image " + (i + 1) + " of " + imgs.length);
      img.removeAttribute("loading");
      slide.appendChild(img);
      track.appendChild(slide);
    });

    function arrow(dir, label, glyph) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "case-slider__arrow case-slider__arrow--" + dir;
      b.setAttribute("aria-label", label);
      b.textContent = glyph;
      return b;
    }
    var prev = arrow("prev", "Previous image", "\u2190");
    var next = arrow("next", "Next image", "\u2192");

    var dots = document.createElement("div");
    dots.className = "case-slider__dots";
    var dotEls = imgs.map(function (_, i) {
      var d = document.createElement("button");
      d.type = "button";
      d.className = "case-slider__dot";
      d.setAttribute("aria-label", "Show image " + (i + 1) + " of " + imgs.length);
      d.addEventListener("click", function () { goTo(i); });
      dots.appendChild(d);
      return d;
    });

    var current = 0;
    function goTo(i) {
      i = Math.max(0, Math.min(imgs.length - 1, i));
      track.scrollTo({ left: i * track.clientWidth, behavior: reducedMotion ? "auto" : "smooth" });
    }
    function sync() {
      current = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      dotEls.forEach(function (d, i) {
        if (i === current) d.setAttribute("aria-current", "true");
        else d.removeAttribute("aria-current");
      });
      prev.disabled = current === 0;
      next.disabled = current === imgs.length - 1;
    }
    prev.addEventListener("click", function () { goTo(current - 1); });
    next.addEventListener("click", function () { goTo(current + 1); });
    track.addEventListener("scroll", sync, { passive: true });
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(current + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goTo(current - 1); }
    });
    window.addEventListener("resize", function () { track.scrollLeft = current * track.clientWidth; });

    slider.appendChild(track);
    slider.appendChild(prev);
    slider.appendChild(next);
    slider.appendChild(dots);
    gallery.parentNode.replaceChild(slider, gallery);
    sync();
  });

  /* ------------------------------------------------------------
     Contact form - builds a mailto: draft (no backend)
     ------------------------------------------------------------ */
  var form = document.querySelector("[data-contact-form]");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.querySelector("#name").value.trim();
      var org = form.querySelector("#organisation").value.trim();
      var message = form.querySelector("#message").value.trim();
      var timelineEl = form.querySelector("#timeline");
      var timeline = timelineEl ? timelineEl.value.trim() : "";
      var email = form.getAttribute("data-contact-email") || "";

      var subject = encodeURIComponent("Project enquiry from " + (name || "website"));
      var body = encodeURIComponent(
        "Name: " + name + "\nOrganisation: " + org + (timeline ? "\nTimeline: " + timeline : "") + "\n\n" + message
      );
      window.location.href = "mailto:" + email + "?subject=" + subject + "&body=" + body;
    });
  }
})();
