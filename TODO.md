# TODO

This list is not a modernization plan. Every change must be evaluated first for
compatibility with Netscape Navigator 4 and MSIE 4/5.5–9, then for compatibility
with modern browsers.

## Bugs and risks

- [ ] **P1 — prevent duplicate `requestAnimationFrame` loops.** If pause and
  resume are triggered before an already scheduled frame runs, the old and new
  callbacks may start two parallel loops.
- [ ] **P1 — correct the FPS calculation.** `tick()` limits `dt` to `0.12` and
  then uses that simulated time for the FPS counter. The displayed value may be
  too high after a long stall or background-tab throttling.
- [ ] **P1 — verify the first sound after autoplay blocking.**
  `AudioContext.resume()` is asynchronous, but its state is checked immediately.
  The first impact after user interaction may be silent.
- [ ] **P1 — verify the status panel in Netscape 4.** `E()` has no path to plain
  `SPAN` elements through the Netscape DOM. The renderer name, FPS, and counters
  may keep their initial values even while the animation works.
- [ ] **P0 — verify the declared browser matrix.** Record the operating system,
  exact browser version, selected renderer, sound, click handling, pause,
  scenes, and known limitations for Netscape 4, MSIE 4, MSIE 5.5, IE 8/9
  document modes, and modern browsers.

## Monolith decomposition plan

The final runtime page must remain compatible with legacy browsers. CSS and
JavaScript can be extracted directly. HTML fragments must be assembled before
deployment so old browsers still receive one flat document.

Target structure:

```text
index.html                  # flat runtime document and script loading order
css/legacy.css              # current rules without cascade or VML changes
js/parse-audio.js           # early document.write for Netscape LiveAudio
js/core.js                  # JavaScript 1.2: state, math, physics, DIV/Layer
js/renderers.js             # Canvas, VML, Web Audio; isolated capability block
js/app.js                   # JavaScript 1.2: detection, UI, boot, and loop
boing.wav
```

- [ ] Record a baseline: screenshots of both scenes and all three renderers,
  initial diagnostic values, and a manual smoke-test checklist.
- [x] Extract CSS to `css/legacy.css` without changing selectors, the cascade,
  quirks mode, VML behavior, or visual geometry.
- [x] Extract the early Netscape audio insertion to a separate synchronous
  script that still runs while the HTML document is being parsed.
- [x] Extract the JavaScript 1.2 core and DIV/Layer renderer to `js/core.js`.
  Do not add syntax unsupported by the target parser.
- [x] Extract Canvas, VML, and Web Audio to `js/renderers.js`. Keep this file as
  an independent failure boundary: a parse error in an old browser must not
  break the core or the following startup block.
- [x] Extract feature detection, UI handling, and startup to the JavaScript
  1.2-compatible `js/app.js`. Preserve the loading order `core.js` →
  `renderers.js` → `app.js`.
- [x] Keep the runtime HTML as one complete document. If authoring with markup
  fragments becomes necessary, add only a build-time assembly step that creates
  a deterministic `index.html`. Do not use runtime `fetch`, modules, custom
  elements, or another client-side component loader.
- [ ] After every extraction step, compare Canvas, VML, and DIV output and run
  the legacy smoke tests. Do not move the whole monolith in one large diff.

## Potential improvements

- [ ] Add minimal static checks for forbidden syntax in JavaScript 1.2 files,
  required meta/VML markers, and the correct script order.
- [ ] Add a manual `TESTING.md` with instructions for old virtual machines or
  emulators and a table of verified results.
- [ ] Consider pointer and touch controls in a separate modern-only layer. The
  mouse path and inline handlers must continue to work in old browsers.
- [ ] Check contrast and keyboard controls in modern browsers without changing
  the intentional 1990s home-page style.
