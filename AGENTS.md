# Git workflow

- Do not create commits unless the user explicitly instructs you to do so.
- Do not push changes to any remote repository.
- Only the user performs `git push` operations.

# Project guardrails

- Write all project documentation exclusively in simple, technically accurate
  English.
- Legacy compatibility is the primary requirement; do not modernize syntax or
  browser APIs merely for style.
- Preserve the no-DOCTYPE quirks document, `X-UA-Compatible: IE=5`, VML
  namespace/behavior, synchronous `document.write`, globals, and inline event
  handlers unless the change is verified in the target legacy browsers.
- Keep JavaScript 1.2-safe code free of newer syntax and keep the
  Canvas/VML/Web Audio capability block isolated so an old parser may reject it
  without breaking the core or startup block.
- The page is static and dependency-free. Prefer small, reviewable extraction
  steps; do not introduce a runtime component loader for HTML.
- Preserve UTF-8 and the script order: core, optional renderers, startup.
- Treat compatibility claims as unverified until they are exercised in the
  corresponding real browser or VM; see `TODO.md` for the test matrix.
