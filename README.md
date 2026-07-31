```text
 ____   ___ ___ _   _  ____   ____    _    _     _
| __ ) / _ \_ _| \ | |/ ___| | __ )  / \  | |   | |
|  _ \| | | | ||  \| | |  _  |  _ \ / _ \ | |   | |
| |_) | |_| | || |\  | |_| | | |_) / ___ \| |___| |___
|____/ \___/___|_| \_|\____| |____/_/   \_\_____|_____|

                 L E G A C Y   E D I T I O N
```

# Boing Ball Legacy

A static web demo inspired by the Amiga Boing Ball. The same 3D model, physics,
and scene are rendered through several rasterizers from different browser eras,
from `DIV`/`Layer` and VML to Canvas 2D.

The main project requirement is not to modernize the code, but to preserve one
implementation for Netscape Navigator 4, old Internet Explorer versions, and
modern browsers. The archaic markup, global functions, `document.write`, inline
event handlers, and old JavaScript syntax are architectural requirements. They
must not be removed as routine technical cleanup.

## Live demo

https://bloschinsky.github.io/bouncig-ball-legacy/

## Current state

- The project has no dependencies, build step, server, or framework.
- The runtime is dependency-free. Markup remains in `index.html`; CSS and
  JavaScript are split into static files loaded in legacy-safe order.
- `boing.wav` supports legacy audio APIs. Modern browsers synthesize the sound
  through Web Audio.
- The demo provides a flat 1984 scene and a perspective 3D room.
- Browsers with a suitable DOM can change the viewport size, sphere detail, and
  renderer without restarting the animation state.
- Legacy support is the target compatibility matrix, not yet a fully verified
  guarantee. It must be tested again in real browsers or virtual machines. See
  [TODO.md](TODO.md).

## Renderers and fallback order

| Renderer | Intended environment | Main mechanism |
| --- | --- | --- |
| Canvas 2D | Modern browsers | Sphere polygons and scene lines on `<canvas>` |
| VML | MSIE 5.5–9 when VGX/VML is available | VML paths in quirks/IE5 document mode |
| DIV voxels | Universal fallback, including MSIE 4 and Netscape 4 | Positioned `DIV` elements or Netscape `Layer` objects with per-cell ray casting |

In `auto` mode, the code tries Canvas, then VML, and finally DIV voxels. VML
support is detected from the behavior of a real VML element rather than from
`document.namespaces` alone.

## Running the project

Open `index.html` directly for a basic check. To reproduce GitHub Pages behavior
more closely, serve the project directory with any static HTTP server and open
the root page.

Page controls:

- Click the ball to kick it.
- Click the side of the ball to change its spin direction.
- Use `PAUSE` / `START` to stop or resume the simulation.
- Use `SOUND` to enable or disable the impact sound.
- Use the selectors below the scene to change the scene, renderer, viewport
  size, and sphere detail.

Netscape 4 has a limited DOM. Renderer and viewport switching are intentionally
disabled there, and the stage is created while the document is being parsed.

## Runtime file order

The section order is critical:

1. `<head>` defines IE5 mode, UTF-8, the VML namespace, and loads
   `css/legacy.css` with the VML behavior and base CSS.
2. `js/parse-audio.js` inserts Netscape LiveAudio with `document.write` while
   the document is being parsed.
3. The markup creates the UI and stage container. Netscape receives an
   `ILAYER`; other browsers receive a positioned `DIV`.
4. `js/core.js` contains JavaScript 1.2-compatible math, physics, geometry,
   controls, and the DIV/Layer renderer.
5. `js/renderers.js` contains Canvas, VML, and Web Audio. An old parser may
   reject this whole file without breaking the core or startup files.
6. `js/app.js` is JavaScript 1.2-compatible and selects a renderer, mounts the
   scene, and starts the loop.

All renderers use the same physics and projection state. Canvas and VML receive
grouped polygons. The DIV renderer casts a ray for every voxel cell.

## Legacy compatibility rules

Do not make the following changes without explicit legacy-browser testing:

- Add a `DOCTYPE` or change `<meta http-equiv="X-UA-Compatible"
  content="IE=5">`.
- Remove `XMLNS:V`, the `V\:*` rule, or `#default#VML`.
- Replace `document.layers`, `document.all`, `attachEvent`, `BGSOUND`, `EMBED`,
  or inline handlers with modern-only APIs.
- Add modules, `class`, `let`/`const`, arrow functions, Promise, or other modern
  syntax to blocks that must be parsed by JavaScript 1.2.
- Move the early `document.write` call to the `load` event.
- Reorder the script blocks or merge the capability block into the core.
- Run HTML, CSS, or JavaScript through a formatter or minifier without testing
  the old engines.
- Change the UTF-8 encoding of project files.

Feature detection and graceful fallback must remain the main capability
selection strategy. Modern improvements are allowed only in an isolated block
whose parse failure cannot stop the legacy core.

## Next steps

The planned monolith decomposition, compatibility checks, known risks, and
improvement ideas are tracked in [TODO.md](TODO.md).

## Files

```text
index.html           — flat runtime document and script loading order
css/legacy.css       — legacy CSS and VML behavior
js/parse-audio.js    — synchronous Netscape LiveAudio insertion
js/core.js           — JavaScript 1.2 core and DIV/Layer renderer
js/renderers.js      — Canvas, VML, and Web Audio capability block
js/app.js            — JavaScript 1.2 detection, UI, boot, and loop
boing.wav            — legacy impact sound
TESTING.md            — manual browser checklist and result matrix
README.md             — project context and architecture constraints
TODO.md               — bugs, verification tasks, and decomposition plan
AGENTS.md              — concise rules for future work on the project
```
