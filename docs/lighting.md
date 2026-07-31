# Feature research: scene lighting

Status: research only. Not implemented. Must be verified in the legacy target
browsers before it is accepted (see `TODO.md`).

## Goal

Add two light sources to the scene:

1. A uniform fill light (ambient) that raises the base brightness of every face
   by the same amount.
2. One hard directional/point light that lights a segment of the scene more
   brightly at a 45-degree angle.

## How the scene works today (no lighting)

- The ball is built as a sphere in `buildSphere` (`js/core.js`); vertices are
  stored in `ux`/`uy`/`uz`.
- `projectMesh` rotates and projects the vertices into 2D (`sxx`/`syy`).
- `meshGroups` collects quads into two groups by checkerboard color, `REDCOL`
  (`#D1131C`) and `WHTCOL` (`#F2F2F2`), and culls back faces by the sign of the
  projected area.
- Renderers receive ready polygons with a flat single color per group
  (`fillPolys` in `canR`, `polyPath`/`shape` in `vmlR`). This is pure flat
  shading with no normals and no brightness gradient.
- `SHADCOL`/`DARKCOL` are a static shadow and a dark backing plate. They are not
  connected to any light source.

So the pipeline has no concept of a face normal or brightness. Both have to be
added.

## What is technically required for the two lights

1. **Uniform fill light (ambient).** Trivial: a single global multiplier applied
   to the base color, identical for every face. For example `AMBIENT = 0.35`.
2. **Hard directional/point light at 45 degrees.** Requires:
   - a **normal per quad** of the ball. It can be computed almost for free: the
     cross product of two quad edges using the already rotated coordinates.
   - a light direction, for example `L = normalize(1, 1, 1)`, which is the
     "45 degrees from above, side and front" direction.
   - an intensity `I = ambient + diffuse * max(0, dot(N, L))`. A hard light means
     high contrast: a sharp multiplier, optionally with a threshold or `pow`, so
     the lit segment is clearly brighter.
   - multiplying the base face color by `I` (clamped to 255), producing a shade
     instead of the two fixed colors.

## Key architectural problem

Today `meshGroups` groups quads into only **two arrays by color**, and the
renderer does one `fill` per group. Brightness gradation does not fit this: each
quad now needs its **own color**. This changes the contract between `core.js`
and the renderers:

- Instead of `groups[i].p` (polygon array) plus `groups[i].c` (one color), the
  core must return a list of polygons where each one carries its own computed
  color (for example `{poly, color}` per quad).
- The loops in `canR.frame`/`fillPolys` and `vmlR.frame`/`polyPath` must be
  rewritten to paint each quad separately, per frame.

This increases the number of fill operations: on Canvas from about 2 fills to
about `NS*NB/2` fills per frame (tens to hundreds); on VML the same count of
separate `<v:shape>` elements. On Canvas 2D this is acceptable; on VML in a real
IE it is a noticeable performance hit and must be checked on the target VM.

## Legacy compatibility constraints (guardrails)

- Code in `renderers.js` is **JavaScript 1.2-safe**: no `try/catch`, `toFixed`,
  `apply`, and so on (see the comments in `core.js`). The lighting math
  (`Math.sqrt`, `Math.max`, multiplication, hex string concatenation) follows
  these rules and is implementable.
- The hex color must be built by hand (no `padStart`) in a compatible way.
- The Canvas/VML/Web Audio block must stay isolated so an old parser (Netscape 4)
  may reject it without breaking the core. Lighting should stay here or in a
  separate optional module and must not touch `Block A: core`.
- The script order (core -> renderers -> startup) and the `mount()` structure do
  not need to change.

## Suggested minimal, reviewable step

- Add the quad normal and brightness computation to the mesh part of `core.js`,
  and return per-quad colored polygons from `meshGroups`. Keep two parameters:
  `AMBIENT` and the direction `LIGHTDIR = (1, 1, 1)` for the 45-degree angle.
- Update `canR` to fill each quad per frame. Do the same for VML, but mark it as
  potentially slow and put it behind a flag.
- Light the DIV voxel renderer (`divR`) later, separately: its `frame` already
  has the ray/surface intersection point `lx, ly, lz`, from which the normal is
  easy to take and the same `ambient + diffuse*dot(N, L)` formula applies.
- Leave the background grid without lighting: it is a set of lines, not surfaces.

## Feasibility summary

Lighting is realistic and in the spirit of the project, but it is not a
one-line cosmetic change. It requires introducing normals/brightness in
`core.js` and changing the "color per group -> color per quad" contract in the
renderers. The Canvas 2D path is the simplest and safest place to start. The VML
variant and legacy compatibility must be verified on the target legacy browser
per the test matrix in `TODO.md`.
