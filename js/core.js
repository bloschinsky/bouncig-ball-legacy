<!--
// Block A: core. JavaScript 1.2 compatible.
// No try/catch, toFixed, apply, getElementById, or appendChild.
// Netscape 4 must parse this block.
// End Block A.

function E(id) {
  if (document.all) { return document.all[id]; }
  if (document.getElementById) { return document.getElementById(id); }
  return null;
}
function setTxt(id, s) {
  var el = E(id);
  if (el && typeof el.innerHTML != "undefined") { el.innerHTML = s; }
}

// Camera
var W = 640, H = 480, CX = 320, CY = 240;
var FOV = 50 * Math.PI / 180;
var K = 240 / Math.tan(FOV / 2);          // Projection scale in pixels
var CAMZ = 6.0;                           // Distance to the ball plane
var RAD = 0.9;                            // Ball radius
var TILT = -17 * Math.PI / 180;           // Axis tilt, matching the original
var WALLZ = CAMZ + 6.0;                   // Back wall of the 3D room

var HH = CAMZ * Math.tan(FOV / 2);
var HW = HH * W / H;
var XLIM = HW - RAD, YBOT = -HH + RAD, YTOP = HH - RAD;
var FLOORY = -HH;                         // Floor plane

// Canvas size can change at runtime. Physics uses world units, not pixels.
// Projection scale follows viewport height, so the ball keeps its relative size and path.
// The ball keeps the same relative size and trajectory.
function applySize(w, h) {
  W = w; H = h; CX = w / 2; CY = h / 2;
  K = (H / 2) / Math.tan(FOV / 2);
  HW = HH * W / H;                        // 4:3 aspect ratio keeps this value unchanged
  XLIM = HW - RAD;
  if (bx > XLIM) { bx = XLIM; }
  if (bx < -XLIM) { bx = -XLIM; }
}

var GRAV = -11.0, MINB = 8.4, SPINRATE = 2.6;

var GRIDCOL = "#9E219E", REDCOL = "#D1131C", WHTCOL = "#F2F2F2";
var DARKCOL = "#5E0A10", SHADCOL = "#15151A", BGCOL = "#2A2A2E";

// State
var NS = 16, NB = 8, VOX = 14;
var ux = [], uy = [], uz = [], sxx = [], syy = [];
var CULL = 1;
var bx = -1.5, by = 0.6, vx = 2.4, vy = 0.0, spin = 0, spinDir = 1;
var hits = 0, kicks = 0, polys = 0;
var room = false;
var paused = false, tmr = null, prevT = 0, fpsAcc = 0, fpsCnt = 0;
var R = null, sceneCache = null, stageEl = null;

// Mesh
function buildSphere() {
  ux = []; uy = []; uz = [];
  var i, j, t, st, ct, p;
  for (j = 0; j <= NB; j++) {
    t = j / NB * Math.PI; st = Math.sin(t); ct = Math.cos(t);
    for (i = 0; i <= NS; i++) {
      p = i / NS * 2 * Math.PI;
      ux[ux.length] = RAD * st * Math.cos(p);
      uy[uy.length] = RAD * ct;
      uz[uz.length] = RAD * st * Math.sin(p);
    }
  }
}

// Projection: camera at the origin looking along -Z
function pjx(X, w) { return CX + K * X / w; }
function pjy(Y, w) { return CY - K * Y / w; }

function projectMesh() {
  var cs = Math.cos(spin), ss = Math.sin(spin);
  var ct = Math.cos(TILT), st = Math.sin(TILT);
  var n = ux.length, k, x, y, z, x1, z1, x2, y2, q;
  for (k = 0; k < n; k++) {
    x = ux[k]; y = uy[k]; z = uz[k];
    x1 = x * cs + z * ss;                 // Rotate around the local axis
    z1 = z * cs - x * ss;
    x2 = x1 * ct - y * st;                // Apply axis tilt
    y2 = x1 * st + y * ct;
    q = K / (CAMZ - z1);                  // Perspective scale
    sxx[k] = CX + (x2 + bx) * q;
    syy[k] = CY - (y2 + by) * q;
  }
}

// Group polygons by color and cull back faces by signed area.
function meshGroups() {
  var red = [], wht = [], NS1 = NS + 1, kept = 0, pass;
  var i, j, a, b, c, d, ax, ay, bX, bY, cX, cY, dX, dY, area;
  for (pass = 0; pass < 2; pass++) {
    red.length = 0; wht.length = 0; kept = 0;
    for (j = 0; j < NB; j++) {
      for (i = 0; i < NS; i++) {
        a = j * NS1 + i; b = a + 1; d = a + NS1; c = d + 1;
        ax = sxx[a]; ay = syy[a]; bX = sxx[b]; bY = syy[b];
        cX = sxx[c]; cY = syy[c]; dX = sxx[d]; dY = syy[d];
        area = (ax * bY - bX * ay) + (bX * cY - cX * bY)
             + (cX * dY - dX * cY) + (dX * ay - ax * dY);
        if (area * CULL >= 0) { continue; }
        kept++;
        if (((i + j) % 2) === 0) { red[red.length] = [ax, ay, bX, bY, cX, cY, dX, dY]; }
        else { wht[wht.length] = [ax, ay, bX, bY, cX, cY, dX, dY]; }
      }
    }
    if (kept > 0) { break; }
    CULL = -CULL;                         // Fallback for reversed winding.
  }
  polys = kept;
  return [{ c: REDCOL, p: red }, { c: WHTCOL, p: wht }];
}

// Silhouette and shadow
function ballRadiusPx() {                 // Visible sphere radius from the tangent
  return K * RAD / Math.sqrt(CAMZ * CAMZ - RAD * RAD);
}
function circlePoly(cx, cy, rx, ry) {
  var pts = [], n = 16, i, a;
  for (i = 0; i < n; i++) {
    a = i / n * 2 * Math.PI;
    pts[pts.length] = cx + rx * Math.cos(a);
    pts[pts.length] = cy + ry * Math.sin(a);
  }
  return pts;
}
// Dark base hides subpixel gaps between faces.
function discInfo() {
  var q = K / CAMZ, r = RAD * q * 0.97;
  var cx = CX + bx * q, cy = CY - by * q;
  return { cx: cx, cy: cy, rx: r, ry: r, poly: circlePoly(cx, cy, r, r) };
}
function shadowInfo() {
  var i, a, rr, hn, q, px, py, w, pts;
  if (!room) {
    q = K / (CAMZ + 0.7);                 // Shifted silhouette on the same wall
    return { cx: CX + (bx + 0.42) * q, cy: CY - (by - 0.30) * q,
             rx: RAD * q, ry: RAD * q,
             poly: circlePoly(CX + (bx + 0.42) * q, CY - (by - 0.30) * q,
                              RAD * q, RAD * q) };
  }
  // 3D room: project a floor-plane circle in perspective
  hn = (by - YBOT) / (YTOP - YBOT);
  rr = RAD * (1.0 - 0.32 * hn);
  pts = [];
  var minx = 999999, maxx = -999999, miny = 999999, maxy = -999999;
  for (i = 0; i < 16; i++) {
    a = i / 16 * 2 * Math.PI;
    w = CAMZ - rr * Math.sin(a);
    px = pjx(bx + rr * Math.cos(a), w);
    py = pjy(FLOORY, w);
    pts[pts.length] = px; pts[pts.length] = py;
    if (px < minx) { minx = px; }
    if (px > maxx) { maxx = px; }
    if (py < miny) { miny = py; }
    if (py > maxy) { maxy = py; }
  }
  return { cx: (minx + maxx) / 2, cy: (miny + maxy) / 2,
           rx: (maxx - minx) / 2, ry: (maxy - miny) / 2, poly: pts };
}

// Background: segment list [x1, y1, x2, y2]
function sceneLines() {
  var L = [], i, v, x, y, horizon;
  if (!room) {
    for (i = 0; i <= 16; i++) { v = i * W / 16; L[L.length] = [v, 0, v, H]; }
    for (i = 0; i <= 12; i++) { v = i * H / 12; L[L.length] = [0, v, W, v]; }
    return L;
  }
  horizon = pjy(FLOORY, WALLZ);           // Floor-wall horizon
  for (i = -7; i <= 7; i++) {             // Back-wall verticals
    x = pjx(i, WALLZ);
    L[L.length] = [x, 0, x, horizon];
  }
  for (i = 0; i <= 6; i++) {              // Back-wall horizontals
    y = pjy(FLOORY + i * 1.4, WALLZ);
    L[L.length] = [0, y, W, y];
  }
  for (i = 0; i <= 6; i++) {              // Floor cross lines
    y = pjy(FLOORY, CAMZ + i);
    L[L.length] = [0, y, W, y];
  }
  for (i = -5; i <= 5; i++) {             // Depth lines; the only diagonal lines
    L[L.length] = [pjx(i, CAMZ), pjy(FLOORY, CAMZ), pjx(i, WALLZ), horizon];
  }
  return L;
}

// Physics
function step(dt) {
  vy += GRAV * dt;
  bx += vx * dt;
  by += vy * dt;
  if (bx < -XLIM) { bx = -XLIM; vx = Math.abs(vx); spinDir = -spinDir; bump(); }
  else if (bx > XLIM) { bx = XLIM; vx = -Math.abs(vx); spinDir = -spinDir; bump(); }
  if (by < YBOT) {
    by = YBOT;
    vy = Math.abs(vy) * 0.99;
    if (vy < MINB) { vy = MINB; }
    bump();
  } else if (by > YTOP) {
    by = YTOP; vy = -Math.abs(vy) * 0.85; bump();
  }
  spin += SPINRATE * spinDir * dt;
}
function bump() { hits++; boing(); }

// DIV voxel renderer.
// Renderer 3 uses DIV voxels and basic positioning.
// Supported by MSIE 4 (innerHTML), Netscape 4 (new Layer), and modern browsers.
// Cast a ray for each cell instead of using polygons.
// Use inverse rotation to find the checkerboard cell. This is still real 3D.
// End DIV voxel renderer.
var divR = {
  nm: "DIV-вокселі",
  wantMesh: false,
  lay: false, stage: null, box: null,
  cells: [], prev: [], shp: [], side: 0, grid: 0,

  setup: function (stage) {
    this.lay = (document.layers && !document.all) ? true : false;
    this.stage = this.lay ? document.layers["stage"] : stage;
    this.cells = []; this.prev = []; this.shp = []; this.box = null;
    this.grid = VOX;
    this.side = Math.ceil(2 * ballRadiusPx() / this.grid);
  },

  // Creation order sets layer order: background, shadow, then ball.
  drawScene: function (lines) {
    if (this.lay) { this.buildNN(lines); } else { this.buildDOM(lines); }
  },

  // Convert each segment to axis-aligned rectangles; diagonals use steps.
  rects: function (out, s) {
    var x1 = s[0], y1 = s[1], x2 = s[2], y2 = s[3], k, steps, ax, ay, bxx, byy;
    if (Math.abs(x1 - x2) < 1.5 || Math.abs(y1 - y2) < 1.5) {
      out[out.length] = [Math.round(Math.min(x1, x2)), Math.round(Math.min(y1, y2)),
                         Math.max(1, Math.round(Math.abs(x2 - x1))),
                         Math.max(1, Math.round(Math.abs(y2 - y1)))];
      return;
    }
    steps = 8;
    for (k = 0; k < steps; k++) {
      ax = x1 + (x2 - x1) * k / steps;
      ay = y1 + (y2 - y1) * k / steps;
      bxx = x1 + (x2 - x1) * (k + 1) / steps;
      byy = y1 + (y2 - y1) * (k + 1) / steps;
      out[out.length] = [Math.round(Math.min(ax, bxx)), Math.round(Math.min(ay, byy)),
                         Math.max(1, Math.round(Math.abs(bxx - ax))),
                         Math.max(1, Math.round(Math.abs(byy - ay)))];
    }
  },

  buildDOM: function (lines) {
    var s = [], rc = [], i, n, gx, gy, size = this.side * this.grid;
    for (i = 0; i < lines.length; i++) { this.rects(rc, lines[i]); }
    for (i = 0; i < rc.length; i++) {
      s[s.length] = '<div style="position:absolute;left:' + rc[i][0] + 'px;top:' + rc[i][1]
                  + 'px;width:' + rc[i][2] + 'px;height:' + rc[i][3]
                  + 'px;overflow:hidden;font-size:0px;background-color:' + GRIDCOL + '"></div>';
    }
    for (i = 0; i < 5; i++) {
      s[s.length] = '<div id="shp' + i + '" style="position:absolute;left:-99px;top:-99px;'
                  + 'width:4px;height:4px;overflow:hidden;font-size:0px;'
                  + 'background-color:' + SHADCOL + '"></div>';
    }
    s[s.length] = '<div id="vbox" style="position:absolute;left:0px;top:0px;width:' + size
                + 'px;height:' + size + 'px;overflow:hidden;font-size:0px">';
    for (gy = 0; gy < this.grid; gy++) {
      for (gx = 0; gx < this.grid; gx++) {
        s[s.length] = '<div style="position:absolute;left:' + (gx * this.side) + 'px;top:'
                    + (gy * this.side) + 'px;width:' + this.side + 'px;height:' + this.side
                    + 'px;overflow:hidden;font-size:0px"></div>';
      }
    }
    s[s.length] = '</div>';
    this.stage.innerHTML = s.join("");
    this.box = E("vbox");
    var kids = this.box.children ? this.box.children : this.box.childNodes;
    for (n = 0; n < this.grid * this.grid; n++) { this.cells[n] = kids[n]; this.prev[n] = ""; }
    for (i = 0; i < 5; i++) { this.shp[i] = E("shp" + i); }
  },

  buildNN: function (lines) {
    var rc = [], i, n, gx, gy, o, size = this.side * this.grid, P = this.stage;
    for (i = 0; i < lines.length; i++) { this.rects(rc, lines[i]); }
    for (i = 0; i < rc.length; i++) {
      o = new Layer(rc[i][2], P);
      o.resizeTo(rc[i][2], rc[i][3]);
      o.moveTo(rc[i][0], rc[i][1]);
      o.bgColor = GRIDCOL; o.visibility = "show";
    }
    for (i = 0; i < 5; i++) {
      o = new Layer(4, P);
      o.resizeTo(4, 4); o.moveTo(-99, -99);
      o.bgColor = SHADCOL; o.visibility = "show";
      this.shp[i] = o;
    }
    this.box = new Layer(size, P);
    this.box.resizeTo(size, size);
    this.box.moveTo(0, 0);
    this.box.visibility = "show";
    n = 0;
    for (gy = 0; gy < this.grid; gy++) {
      for (gx = 0; gx < this.grid; gx++) {
        o = new Layer(this.side, this.box);
        o.resizeTo(this.side, this.side);
        o.moveTo(gx * this.side, gy * this.side);
        o.visibility = "show";
        this.cells[n] = o; this.prev[n] = ""; n++;
      }
    }
  },

  place: function (o, x, y, w, h) {
    if (this.lay) {
      o.moveTo(x, y);
      if (w) { o.resizeTo(w, h); }
      return;
    }
    o.style.left = x + "px"; o.style.top = y + "px";
    if (w) { o.style.width = w + "px"; o.style.height = h + "px"; }
  },

  frame: function () {
    var q = K / CAMZ;
    var size = this.side * this.grid;
    var L = Math.round(CX + bx * q - size / 2);
    var T = Math.round(CY - by * q - size / 2);
    this.place(this.box, L, T);

    // Approximate the shadow blob with five rectangular bands.
    var sh = shadowInfo(), i, fy, hw, bh = (2 * sh.ry) / 5;
    for (i = 0; i < 5; i++) {
      fy = -1 + (2 * i + 1) / 5;
      hw = sh.rx * Math.sqrt(Math.max(0, 1 - fy * fy));
      this.place(this.shp[i],
                 Math.round(sh.cx - hw), Math.round(sh.cy + fy * sh.ry - bh / 2),
                 Math.max(1, Math.round(2 * hw)), Math.max(1, Math.round(bh)));
    }

    // Ray casting: invert the same rotations used by the mesh.
    var ict = Math.cos(-TILT), ist = Math.sin(-TILT);
    var ics = Math.cos(-spin), iss = Math.sin(-spin);
    var ccz = -CAMZ, RR = RAD * RAD, half = this.side / 2;
    var Cq = bx * bx + by * by + ccz * ccz - RR;
    var gx, gy, n = 0, px, py, dx, dy, A, B, disc, tt, lx, ly, lz;
    var axx, ayy, b2, z2, th, ph, ii, jj, col, cnt = 0;
    for (gy = 0; gy < this.grid; gy++) {
      py = T + gy * this.side + half;
      dy = -(py - CY) / K;
      for (gx = 0; gx < this.grid; gx++, n++) {
        px = L + gx * this.side + half;
        dx = (px - CX) / K;
        A = dx * dx + dy * dy + 1;
        B = -2 * (dx * bx + dy * by - ccz);
        disc = B * B - 4 * A * Cq;
        if (disc < 0) { col = ""; }
        else {
          tt = (-B - Math.sqrt(disc)) / (2 * A);
          lx = tt * dx - bx; ly = tt * dy - by; lz = -tt - ccz;
          axx = lx * ict - ly * ist; ayy = lx * ist + ly * ict;
          b2 = axx * ics + lz * iss; z2 = lz * ics - axx * iss;
          th = ayy / RAD;
          if (th > 1) { th = 1; }
          if (th < -1) { th = -1; }
          th = Math.acos(th);
          ph = Math.atan2(z2, b2);
          if (ph < 0) { ph += 2 * Math.PI; }
          jj = Math.floor(th / Math.PI * NB); if (jj >= NB) { jj = NB - 1; }
          ii = Math.floor(ph / (2 * Math.PI) * NS); if (ii >= NS) { ii = NS - 1; }
          col = ((ii + jj) % 2) === 0 ? REDCOL : WHTCOL;
          cnt++;
        }
        if (col != this.prev[n]) {         // Update only changed cells.
          this.prev[n] = col;
          if (col === "") {
            if (this.lay) { this.cells[n].bgColor = null; }
            else { this.cells[n].style.backgroundColor = "transparent"; }
          } else if (this.lay) { this.cells[n].bgColor = col; }
          else { this.cells[n].style.backgroundColor = col; }
        }
      }
    }
    polys = cnt;
  }
};

// Sound
var sndOn = true, sndIdx = 0, lastSnd = 0, waFn = null;

function toggleSound() {
  sndOn = !sndOn;
  var el = E("snd");
  if (el) { el.value = sndOn ? "ЗВУК: УВІМК" : "ЗВУК: ВИКЛ"; }
}
function boing() {
  if (!sndOn) { return; }
  var now = new Date().getTime();
  if (now - lastSnd < 90) { return; }
  lastSnd = now;
  if (waFn) { waFn(); return; }                     // Modern browsers: Web Audio
  var b = E("snd" + sndIdx);
  if (b && typeof b.src != "undefined") {           // MSIE: BGSOUND
    b.src = "boing.wav"; sndIdx = (sndIdx + 1) % 3; return;
  }
  if (document.embeds && document.embeds.length && document.embeds[0].play) {
    document.embeds[0].play(false);                 // Netscape 4: LiveAudio
  }
}

// Mouse controls
function hitTest(mx, my) {
  var q = K / CAMZ, r = ballRadiusPx();
  var dx = mx - (CX + bx * q), dy = my - (CY - by * q);
  return { hit: (dx * dx + dy * dy) <= r * r, dx: dx / r, dy: dy / r };
}
function kick(mx, my) {
  var t = hitTest(mx, my);
  if (!t.hit) { return; }
  vy = MINB + 3.0 * (t.dy > 0 ? t.dy : 0) + 1.5;
  vx += -t.dx * 3.2;
  if (vx > 4.5) { vx = 4.5; }
  if (vx < -4.5) { vx = -4.5; }
  if (vx > -1.2 && vx < 0) { vx = -1.2; }
  if (vx < 1.2 && vx >= 0) { vx = 1.2; }
  if (t.dx > 0.45) { spinDir = -1; }
  else if (t.dx < -0.45) { spinDir = 1; }
  kicks++;
  boing();
}

// Main loop
function tick() {
  var now = new Date().getTime();
  var dt = (now - prevT) / 1000;
  prevT = now;
  if (dt > 0.12) { dt = 0.12; }
  if (dt <= 0) { dt = 0.001; }

  step(dt);
  if (R.wantMesh) {
    projectMesh();
    R.frame(meshGroups(), shadowInfo(), discInfo());
  } else {
    R.frame();
  }

  fpsAcc += dt; fpsCnt++;
  if (fpsAcc >= 0.5) {
    setTxt("fps", "" + Math.round(fpsCnt / fpsAcc));
    setTxt("hits", "" + hits);
    setTxt("kicks", "" + kicks);
    setTxt("poly", "" + polys);
    fpsAcc = 0; fpsCnt = 0;
  }
}
//-->
