/* ============================================================
   Flux & Flow - interactions
   three.js particle wave field (cursor-reactive) + nav + form helpers
   Loaded as a classic (non-module) script so it also runs when the
   site is opened directly as a file:// path, not just over http(s).
   three.js itself is fetched via a dynamic import() at runtime.
   ============================================================ */

(function () {
  "use strict";

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
     Kicker colour cycle - green, teal, pink, purple, repeating
     in document order (no lime, that's reserved for the highlight)
     ------------------------------------------------------------ */
  var KICKER_COLORS = ["kicker--green", "kicker--teal", "kicker--pink", "kicker--purple"];
  document.querySelectorAll(".section__kicker, .page-hero__kicker").forEach(function (el, i) {
    el.classList.add(KICKER_COLORS[i % KICKER_COLORS.length]);
  });

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

      var gap = w < 700 ? 26 : 34;
      var cols = Math.ceil(w / gap) + 1;
      var rows = Math.ceil(h / gap) + 1;
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var seed = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
          seed = Math.abs(seed);
          var col = fluxColorAt(x / cols);
          ctx.beginPath();
          ctx.arc(x * gap, y * gap, 1.3 + seed * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(" + col[0] + ", " + col[1] + ", " + col[2] + ", " + (0.5 + seed * 0.3) + ")";
          ctx.fill();
        }
      }
    }

    draw();
    window.addEventListener("resize", draw);
  }

  // Flux Spectrum stops - lime, green, teal, pink, purple
  var FLUX_STOPS = [
    [217, 237, 92],
    [95, 221, 140],
    [82, 199, 214],
    [236, 111, 163],
    [142, 110, 240],
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
    var COLS = 150;
    var ROWS = 70;
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
      // Flux Spectrum - lime, green, teal, pink, purple - sampled across the field by position + slow drift
      uStop0: { value: new THREE.Color("#d9ed5c") },
      uStop1: { value: new THREE.Color("#5fdd8c") },
      uStop2: { value: new THREE.Color("#52c7d6") },
      uStop3: { value: new THREE.Color("#ec6fa3") },
      uStop4: { value: new THREE.Color("#8e6ef0") },
    };

    var material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: [
        "uniform float uTime;",
        "uniform vec2 uMouse;",
        "uniform float uPixelRatio;",
        "attribute float aSeed;",
        "varying float vElev;",
        "varying float vSeed;",
        "varying vec2 vUvPos;",
        "void main() {",
        "  vec3 p = position;",
        "  float t = uTime * 0.55;",
        "  float e = 0.0;",
        "  e += sin(p.x * 0.55 + t) * 0.55;",
        "  e += sin(p.z * 0.85 + t * 1.4) * 0.35;",
        "  e += sin((p.x + p.z) * 0.35 + t * 0.8) * 0.45;",
        "  float mDist = distance(p.xz * vec2(1.0, 2.0), uMouse * vec2(13.0, 6.5));",
        "  e += smoothstep(5.0, 0.0, mDist) * 1.2;",
        "  p.y = e;",
        "  vElev = e;",
        "  vSeed = aSeed;",
        "  vUvPos = vec2(position.x / 26.0 + 0.5, position.z / 13.0 + 0.5);",
        "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
        "  gl_Position = projectionMatrix * mv;",
        "  gl_PointSize = (1.6 + aSeed * 1.8) * uPixelRatio * (6.0 / -mv.z);",
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
        "  vec3 col = mix(uColInk, hue, 0.55 + energy * 0.45);",
        "  float alpha = (0.3 + energy * 0.6) * (0.55 + vSeed * 0.45);",
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
    }
    resize();
    window.addEventListener("resize", resize);

    var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    function onPointerMove(e) {
      var rect = wrap.getBoundingClientRect();
      mouse.tx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.ty = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    }
    function onPointerLeave() {
      mouse.tx = 0;
      mouse.ty = 0;
    }
    wrap.addEventListener("pointermove", onPointerMove);
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

      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      uniforms.uMouse.value.set(mouse.x, mouse.y);

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
  if (filterBtns.length && workCards.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var filter = btn.getAttribute("data-filter");

        filterBtns.forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");

        workCards.forEach(function (card) {
          var match = filter === "all" || card.getAttribute("data-category") === filter;
          card.classList.toggle("is-filtered-out", !match);
        });
      });
    });
  }

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
      var email = form.getAttribute("data-contact-email") || "";

      var subject = encodeURIComponent("Project enquiry from " + (name || "website"));
      var body = encodeURIComponent(
        "Name: " + name + "\nOrganisation: " + org + "\n\n" + message
      );
      window.location.href = "mailto:" + email + "?subject=" + subject + "&body=" + body;
    });
  }
})();
