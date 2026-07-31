# Manual testing

The extraction keeps the runtime code unchanged, but source comparison alone does
not verify browser compatibility. Run this checklist in every browser or virtual
machine before recording a compatibility claim.

## Baseline artifacts

For each supported renderer, save one screenshot of the flat scene and one of
the room scene. Use these names so results from different environments remain
easy to compare:

```text
baseline/<browser>-<version>-canvas-flat.png
baseline/<browser>-<version>-canvas-room.png
baseline/<browser>-<version>-vml-flat.png
baseline/<browser>-<version>-vml-room.png
baseline/<browser>-<version>-div-flat.png
baseline/<browser>-<version>-div-room.png
```

A renderer that is not available in an environment must be recorded as not
available. Do not replace a missing VML result with its fallback renderer.

Record the initial diagnostic panel before interacting with the page:

| Field | Expected initial value |
| --- | --- |
| Renderer | Selected automatically from Canvas, VML, then DIV |
| Impacts | `0` |
| Kicks | `0` |
| Faces / voxels | Becomes non-zero after the first rendered frame |
| FPS | Becomes numeric after the first sampling interval |
| Diagnostics | Lists Canvas, namespaces, VGX/VML, and DIV support |

## Smoke-test checklist

1. Open `index.html` from the same static layout used for deployment.
2. Confirm that the page stays in quirks mode and that the scene is 640 by 480.
3. Record the selected renderer and the complete diagnostic text.
4. Confirm that the ball moves, bounces, and updates impact, polygon, and FPS
   counters.
5. Click the center of the ball. Confirm that the kick counter increases and the
   ball receives an upward impulse.
6. Click both sides of the ball and confirm that its spin direction changes.
7. Pause and resume. Confirm that motion stops and resumes at normal speed.
8. Turn sound off and on. Confirm that impact sound follows the selected state.
9. Select both scenes and save a screenshot for every available renderer.
10. Change viewport size and sphere detail where the browser supports the
    controls. Confirm that the animation state is preserved.
11. Reload the page and check the browser console or script error dialog.

Netscape 4 does not support runtime renderer or viewport switching. Test its
initial Layer renderer, click handling, pause control, sound, and status panel.

## Verification matrix

Leave a result as pending until it has been tested in the named real browser or
virtual machine.

| Environment | Renderer | Sound | Click | Pause | Scenes | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Netscape Navigator 4 | Layer/DIV | Pending | Pending | Pending | Pending | Pending |
| MSIE 4 | DIV | Pending | Pending | Pending | Pending | Pending |
| MSIE 5.5 | VML or DIV | Pending | Pending | Pending | Pending | Pending |
| IE 8/9 document modes | VML or DIV | Pending | Pending | Pending | Pending | Pending |
| Modern browser | Canvas or DIV | Pending | Pending | Pending | Pending | Pending |
