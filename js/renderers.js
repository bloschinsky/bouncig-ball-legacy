<!--
// Canvas 2D and VML rasterizers.
// Netscape 4 may ignore or fail to parse this block.
// Block A remains unaffected.
// End Canvas 2D and VML rasterizers.

var canR = {
  nm: "Canvas 2D",
  wantMesh: true,
  cv: null, ctx: null, lines: null,

  setup: function (stage) {
    stage.innerHTML = "";
    this.cv = document.createElement("canvas");
    this.cv.width = W; this.cv.height = H;
    this.cv.style.display = "block";
    stage.appendChild(this.cv);
    this.ctx = this.cv.getContext("2d");
  },
  drawScene: function (lines) { this.lines = lines; },

  fillPolys: function (list, color) {
    var g = this.ctx, i, p, k;
    g.beginPath();
    for (i = 0; i < list.length; i++) {
      p = list[i];
      g.moveTo(p[0], p[1]);
      for (k = 2; k < p.length; k += 2) { g.lineTo(p[k], p[k + 1]); }
      g.closePath();
    }
    g.fillStyle = color;
    g.fill();
  },

  frame: function (groups, shadow, disc) {
    var g = this.ctx, i, L = this.lines;
    g.fillStyle = BGCOL;
    g.fillRect(0, 0, W, H);

    g.save();
    g.translate(0.5, 0.5);                 // Align lines to physical pixels
    g.strokeStyle = GRIDCOL;
    g.lineWidth = 1;
    g.beginPath();
    for (i = 0; i < L.length; i++) {
      g.moveTo(Math.round(L[i][0]), Math.round(L[i][1]));
      g.lineTo(Math.round(L[i][2]), Math.round(L[i][3]));
    }
    g.stroke();
    g.restore();

    this.fillPolys([shadow.poly], SHADCOL);
    this.fillPolys([disc.poly], DARKCOL);
    for (i = 0; i < groups.length; i++) {
      if (groups[i].p.length) { this.fillPolys(groups[i].p, groups[i].c); }
    }
  }
};

// Use actual VML detection. document.namespaces exists in every IE5+ browser,
// even when VGX.DLL is unavailable or unregistered.
// Check whether the VML behavior is attached instead of checking the namespace.
// For a valid VML object, the adj property becomes an object.
var vmlProbe = null;
function haveVML() {
  if (vmlProbe !== null) { return vmlProbe; }
  vmlProbe = false;
  if (!document.namespaces || !document.createElement) { return vmlProbe; }
  try { document.namespaces.add("v", "urn:schemas-microsoft-com:vml", "#default#VML"); }
  catch (e) { }
  var d = document.createElement("div"), s;
  try {
    d.innerHTML = '<v:shape adj="1"></v:shape>';
    s = d.firstChild;
    if (!s) { return vmlProbe; }
    s.style.behavior = "url(#default#VML)";
    vmlProbe = (typeof s.adj == "object");
  } catch (e2) { vmlProbe = false; }
  return vmlProbe;
}

var vmlR = {
  nm: "VML",
  wantMesh: true,
  grid: null, ball: null,

  setup: function (stage) {
    if (document.namespaces) {
      try { document.namespaces.add("v", "urn:schemas-microsoft-com:vml", "#default#VML"); }
      catch (e) { }
    }
    var box = 'style="position:absolute;left:0px;top:0px;width:' + W + 'px;height:' + H + 'px"';
    stage.innerHTML = '<div id="vgrid" ' + box + '></div><div id="vball" ' + box + '></div>';
    this.grid = E("vgrid");
    this.ball = E("vball");
  },

  shape: function (path, fill, stroke) {
    var s = '<v:shape style="position:absolute;left:0px;top:0px;width:' + W
          + 'px;height:' + H + 'px" '
          + 'coordsize="' + W + ',' + H + '" coordorigin="0,0" ';
    s += fill ? ('filled="t" fillcolor="' + fill + '" ') : 'filled="f" ';
    s += stroke ? ('stroked="t" strokecolor="' + stroke + '" strokeweight="1px" ')
                : 'stroked="f" ';
    return s + 'path="' + path + '"></v:shape>';
  },

  // Render the full background as one VML path with open subpaths.
  drawScene: function (lines) {
    var s = [], i, L;
    for (i = 0; i < lines.length; i++) {
      L = lines[i];
      s[s.length] = "m " + Math.round(L[0]) + "," + Math.round(L[1])
                  + " l " + Math.round(L[2]) + "," + Math.round(L[3]) + " ";
    }
    this.grid.innerHTML = this.shape(s.join("") + "e", null, GRIDCOL);
  },

  polyPath: function (list) {
    var s = [], i, p, k;
    for (i = 0; i < list.length; i++) {
      p = list[i];
      s[s.length] = "m " + Math.round(p[0]) + "," + Math.round(p[1]) + " l ";
      for (k = 2; k < p.length; k += 2) {
        s[s.length] = Math.round(p[k]) + "," + Math.round(p[k + 1])
                    + (k + 2 < p.length ? "," : "");
      }
      s[s.length] = " x ";
    }
    return s.join("") + "e";
  },

  // Four elements per frame: shadow, base, red cells, and white cells.
  frame: function (groups, shadow, disc) {
    var h = this.shape(this.polyPath([shadow.poly]), SHADCOL, null)
          + this.shape(this.polyPath([disc.poly]), DARKCOL, null);
    var i;
    for (i = 0; i < groups.length; i++) {
      if (groups[i].p.length) {
        h += this.shape(this.polyPath(groups[i].p), groups[i].c, null);
      }
    }
    this.ball.innerHTML = h;
  }
};

// Web Audio: synthesize the same boing sound at runtime.
(function () {
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { return; }
  var ac = null, nb = null;
  waFn = function () {
    if (!ac) {
      ac = new AC();
      var n = Math.floor(ac.sampleRate * 0.09), i;
      nb = ac.createBuffer(1, n, ac.sampleRate);
      var d = nb.getChannelData(0);
      for (i = 0; i < n; i++) { d[i] = (Math.random() * 2 - 1) * (1 - i / n); }
    }
    if (ac.state === "suspended") { ac.resume(); }
    if (ac.state !== "running") { return; }
    var t = ac.currentTime;
    var out = ac.createGain(); out.gain.value = 0.45; out.connect(ac.destination);
    var o = ac.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(330, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.24);
    var g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.32);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.35);
    var o2 = ac.createOscillator(); o2.type = "triangle";
    o2.frequency.setValueAtTime(760, t);
    o2.frequency.exponentialRampToValueAtTime(240, t + 0.10);
    var g2 = ac.createGain();
    g2.gain.setValueAtTime(0.32, t);
    g2.gain.exponentialRampToValueAtTime(0.0006, t + 0.14);
    o2.connect(g2); g2.connect(out); o2.start(t); o2.stop(t + 0.15);
    var s = ac.createBufferSource(); s.buffer = nb;
    var bp = ac.createBiquadFilter(); bp.type = "bandpass";
    bp.frequency.value = 1100; bp.Q.value = 1.1;
    var g3 = ac.createGain(); g3.gain.value = 0.28;
    s.connect(bp); bp.connect(g3); g3.connect(out); s.start(t);
  };
})();
//-->
