# Editor track — D17–D20 (Preethi)

Work through Day 16 was already in the tree: shell, file tree, CodeMirror, iframe preview, persistence, sections panel, version history, and accept/reject that leaves a file untouched.

Gaps closed here, without touching the content panel:

| Day | What landed |
| --- | --- |
| D3 / D4 | Section registry plus React components for all ten section types. Composition renderer maps a `Composition` to React. `composition.json` is loaded with the project. Section actions rewrite `index.html` from the composition. |
| D8 | Suggested-change copy is the explanation plus Keep / Discard. No `+/-` listing, no diff vocabulary. |
| D11–D15 | Ask panel talks to `POST /api/v1/projects/{id}/edits`. A version is saved first. The suggestion is held until Keep; Discard leaves every file as it was. |
| D17 | Files past 200k characters or 8k lines skip highlighting and wrapping. |
| D18 | Arrow-key file tree, skip link, Escape closes a suggestion or versions, preview box is reserved (`absolute inset-0`), `prefers-reduced-motion` stops skeleton pulse and transitions. Four-browser matrix is a CI concern, not claimed from this pass. |
| D19 | Empty / loading / error for load, files, sections, chat, preview, versions, save. |
| D20 | Unit coverage for the paths above. No live beta watch from this environment. |

Do not edit `src/components/editor/ContentPanel.tsx` or `src/components/editor/fields/*` on this track.
