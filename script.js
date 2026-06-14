function navigateTo(url) {
  document.body.classList.add('exiting');
  setTimeout(function () {
    location.href = url;
  }, 220);
}

// ── App-wide body-text scaling (Schriftgrösse setting) ──
// Slider stores 1–5; map to a multiplier applied via the --font-scale variable.
var FONT_SCALES = [0.85, 0.92, 1, 1.12, 1.25];

function applyFontScale() {
  var step = parseInt(localStorage.getItem('fontSize') || '3', 10);
  var scale = FONT_SCALES[step - 1] || 1;
  document.documentElement.style.setProperty('--font-scale', scale);
}

applyFontScale();

// ── Animation length (Animationslänge setting) ──
// Slider stores 1–5; map to a duration multiplier (1 = fast … 5 = slow).
// Exposed as the --anim-scale CSS variable and the global ANIM_SCALE.
var ANIM_SCALES = [0.4, 0.7, 1, 1.5, 2.2];
var ANIM_SCALE = 1;

function applyAnimScale() {
  var step = parseInt(localStorage.getItem('animSpeed') || '3', 10);
  ANIM_SCALE = ANIM_SCALES[step - 1] || 1;
  document.documentElement.style.setProperty('--anim-scale', ANIM_SCALE);
}

applyAnimScale();

// ── Voice button waveform visualiser (shared) ──
// Builds the bar row, and while listening animates bar heights from the live
// microphone level (falls back to a gentle sine wave if mic access is denied).
var _viz = { stream: null, ctx: null, raf: 0 };

function buildVoiceBars(btn, n) {
  n = n || 6;
  var wrap = document.createElement('span');
  wrap.className = 'bars';
  for (var i = 0; i < n; i++) wrap.appendChild(document.createElement('span'));
  btn.innerHTML = '';
  btn.appendChild(wrap);
}

function startVoiceViz(btn) {
  btn.classList.add('active');
  var bars = btn.querySelectorAll('.bars span');
  var analyser = null;
  var data = null;
  var MIN = 10, MAX = 56;

  function frame() {
    var i;
    if (analyser) {
      analyser.getByteFrequencyData(data);
      for (i = 0; i < bars.length; i++) {
        var v = data[i * 2 + 2] || 0;            // sample a few low-mid bins
        bars[i].style.height = (MIN + (v / 255) * (MAX - MIN)) + 'px';
      }
    } else {
      var t = Date.now() / 170;
      for (i = 0; i < bars.length; i++) {
        var s = (Math.sin(t + i * 0.9) + 1) / 2;  // 0..1 idle shimmer
        bars[i].style.height = (MIN + s * (MAX - MIN) * 0.7) + 'px';
      }
    }
    _viz.raf = requestAnimationFrame(frame);
  }

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      _viz.stream = stream;
      var AC = window.AudioContext || window.webkitAudioContext;
      _viz.ctx = new AC();
      var src = _viz.ctx.createMediaStreamSource(stream);
      analyser = _viz.ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.7;
      src.connect(analyser);
      data = new Uint8Array(analyser.frequencyBinCount);
    }).catch(function () { /* denied → keep the sine fallback */ });
  }
  frame();
}

// ── Dismissible screen hints (shown once, remembered per key) ──
function setupHint(id, key) {
  var el = document.getElementById(id);
  if (!el) return;
  if (localStorage.getItem(key)) { el.classList.add('dismissed'); return; }
  var close = el.querySelector('.hint-close');
  if (close) close.addEventListener('click', function () {
    el.classList.add('dismissed');
    localStorage.setItem(key, '1');
  });
}

function stopVoiceViz(btn) {
  btn.classList.remove('active');
  if (_viz.raf) { cancelAnimationFrame(_viz.raf); _viz.raf = 0; }
  var bars = btn.querySelectorAll('.bars span');
  for (var i = 0; i < bars.length; i++) bars[i].style.height = '';
  if (_viz.stream) { _viz.stream.getTracks().forEach(function (t) { t.stop(); }); _viz.stream = null; }
  if (_viz.ctx) { try { _viz.ctx.close(); } catch (e) {} _viz.ctx = null; }
}
