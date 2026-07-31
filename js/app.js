<!--
// Renderer selection and startup.
// JavaScript 1.2 compatible.
// End renderer selection and startup.

var forced = "auto", useRaf = false, pickNote = "";

function haveCanvas() {
  if (!document.createElement) { return false; }
  var c = document.createElement("canvas");
  if (!c || !c.getContext) { return false; }
  return c.getContext("2d") ? true : false;
}
function okCanvas() { return (typeof canR != "undefined") && haveCanvas(); }
function okVml() {
  return (typeof vmlR != "undefined") && (typeof haveVML != "undefined") && haveVML();
}

function pickRenderer() {
  var can = okCanvas(), vml = okVml();
  pickNote = "";
  if (forced === "div") { return divR; }
  if (forced === "canvas") {
    if (can) { return canR; }
    pickNote = "Canvas 2D тут немає";
  }
  if (forced === "vml") {
    if (vml) { return vmlR; }
    pickNote = document.namespaces ? "VML не малює: немає VGX.DLL" : "VML тут немає";
  }
  if (can) { return canR; }
  if (vml) { return vmlR; }
  if (forced === "auto" && !can && !vml) { pickNote = "ні Canvas, ні VML"; }
  return divR;
}

// Diagnostic text shows supported and unsupported browser features.
function probeInfo() {
  var s = "canvas:" + (okCanvas() ? "є" : "нема");
  s += " &middot; namespaces:" + (document.namespaces ? "є" : "нема");
  s += " &middot; VGX/VML:" + (okVml() ? "є" : "нема");
  s += " &middot; DIV:є";
  if (pickNote) { s += " &nbsp;&mdash;&nbsp; " + pickNote; }
  return s;
}

// Mark unavailable renderers in the menu.
function labelOptions() {
  var sel = E("ren"), i, o, t;
  if (!sel || !sel.options) { return; }
  for (i = 0; i < sel.options.length; i++) {
    o = sel.options[i];
    t = "" + o.value;
    if (t === "canvas" && !okCanvas()) { o.text = "Canvas 2D (недоступно)"; }
    if (t === "vml" && !okVml()) { o.text = "VML (недоступно)"; }
  }
}

function mount() {
  R = pickRenderer();
  if (stageEl && typeof stageEl.innerHTML != "undefined") { stageEl.innerHTML = ""; }
  R.setup(stageEl);
  sceneCache = sceneLines();
  R.drawScene(sceneCache);
  setTxt("rend", R.nm);
  setTxt("diag", probeInfo());
}

function setRenderer(v) {
  if (!stageEl) { return; }                 // Netscape 4 does not support renderer switching.
  forced = v;
  mount();
}
function setScene(v) {
  room = (v === "room");
  if (!stageEl) { return; }
  mount();
}
function setDetail(v) {
  var p = ("" + v).split(",");
  NS = parseInt(p[0], 10);
  NB = parseInt(p[1], 10);
  VOX = parseInt(p[2], 10);
  buildSphere();
  if (stageEl) { mount(); }
}

// Keep the page frame at least 640 pixels wide so selects do not shrink.
// Expand it with the stage for 800x600.
function syncChrome() {
  var tw = W > 640 ? W : 640, el;
  el = E("mq"); if (el) { el.width = tw; }
  el = E("t1"); if (el) { el.width = tw; }
  el = E("t2"); if (el) { el.width = tw; }
  el = E("t3"); if (el) { el.width = tw; }
  el = E("hr1"); if (el) { el.width = tw; }
  el = E("bar"); if (el && el.style) { el.style.width = tw + "px"; }
}

function setSize(v) {
  if (!stageEl) { return; }               // Netscape 4 cannot rebuild an ILAYER.
  var p = ("" + v).split(",");
  applySize(parseInt(p[0], 10), parseInt(p[1], 10));
  stageEl.style.width = W + "px";
  stageEl.style.height = H + "px";
  syncChrome();
  mount();                                // Keep physics state; the ball continues moving.
}

function loop() {
  if (paused) { return; }
  tick();
  window.requestAnimationFrame(loop);
}
function startLoop() {
  prevT = new Date().getTime();
  if (useRaf) { loop(); } else { tmr = setInterval(tick, 16); }
}
function togglePause() {
  paused = !paused;
  var el = E("pause");
  if (el) { el.value = paused ? "ПУСК" : "ПАУЗА"; }
  if (paused) {
    if (tmr) { clearInterval(tmr); tmr = null; }
  } else { startLoop(); }
}

// Mouse controls
function absPos(el) {
  var x = 0, y = 0;
  while (el) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
  return { x: x, y: y };
}
function localXY(e) {
  var o = absPos(stageEl), sl = 0, st = 0;
  if (document.body) { sl = document.body.scrollLeft; st = document.body.scrollTop; }
  if (document.documentElement) {
    sl = sl || document.documentElement.scrollLeft;
    st = st || document.documentElement.scrollTop;
  }
  return { x: e.clientX + sl - o.x, y: e.clientY + st - o.y };
}
function onDownDOM(ev) {
  var e = ev ? ev : window.event, m = localXY(e);
  kick(m.x, m.y);
}
function onMoveDOM(ev) {
  var e = ev ? ev : window.event, m = localXY(e);
  stageEl.style.cursor = hitTest(m.x, m.y).hit ? "pointer" : "default";
}
function onDownNN(e) {
  var L = document.layers["stage"];
  kick(e.pageX - L.pageX, e.pageY - L.pageY);
  return true;
}

// 90s extras
function chrome() {
  var n = 1024000 + Math.floor(Math.random() * 74000), s = "" + n;
  while (s.length < 7) { s = "0" + s; }
  setTxt("counter", s);
  var on = true;
  setInterval(function () {
    on = !on;
    var b = E("blinker");
    if (b && b.style) { b.style.visibility = on ? "visible" : "hidden"; }
  }, 550);
}

function boot() {
  chrome();
  if (document.layers) {
    document.captureEvents(Event.MOUSEDOWN);
    document.onmousedown = onDownNN;
  } else {
    stageEl = E("stage");
  }
  useRaf = window.requestAnimationFrame ? true : false;
  buildSphere();
  syncChrome();
  labelOptions();
  mount();
  if (stageEl) {
    if (stageEl.addEventListener) {
      stageEl.addEventListener("mousedown", onDownDOM, false);
      stageEl.addEventListener("mousemove", onMoveDOM, false);
    } else if (stageEl.attachEvent) {
      stageEl.attachEvent("onmousedown", onDownDOM);
      stageEl.attachEvent("onmousemove", onMoveDOM);
    }
  }
  startLoop();
}

if (window.addEventListener) { window.addEventListener("load", boot, false); }
else if (window.attachEvent) { window.attachEvent("onload", boot); }
else { window.onload = boot; }
//-->
