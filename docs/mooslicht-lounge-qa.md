# Garden lounge refinement — 2026-09-16

The original Mooslicht lounge now has curved ivory bucket chairs with continuous padded rims, rounded grey sofa cushions, a pale oak table, gathered curtains and a scalloped canopy valance. Two smooth hide silhouettes use an irregular chocolate/cream pattern. The private reference photos remain outside this repository and deployment.

The new house button opens three inspection views (room, chairs, hide). Entering pauses gameplay and clears held controls; leaving returns to the existing player position and follow camera. The inspection is not saved as player progress. The independent KI-Mooslicht game is unchanged.

## Verification

- `npm test`: 84 passed, 0 failed. Includes the complete adventure, walking into and out of the lounge, glass/doorway collisions, ball behaviour, appearance persistence and high/low scene budgets.
- Extended the real camera-path test for all three inspection views in landscape and portrait, unchanged paused player/save data, bounded scene size and restoration of the follow-camera FOV.
- `npm run build`: passed. Existing shared Three.js chunk warning remains (534.39 kB uncompressed).
- High quality: 349,714 scene triangles; low: 276,674. Both are just 3 triangles above the previous scene, with the same 339 meshes and 16 shadow-casting meshes. These are geometry counts, not measured frame rate or rendered draw calls.
- Manually inspected offline views generated from the actual scene geometry with approximate daylight. Adjusted the room framing and replaced isolated chair-rim blobs with a continuous padded edge after viewing them. This is a modelling check, not a GPU rendering acceptance test.
- Browser runtime verification is limited: the available browser already failed to create a WebGL context on the unmodified public version (`GL_VENDOR = Disabled`, `GL_RENDERER = Disabled`). It also cannot open the local dev server. No successful browser playthrough, GPU shader verification or FPS measurement is claimed.

The procedural materials use no photographs, external textures, reflection passes, fur particles or additional per-frame mesh allocation. Stacked-stone fronts replace hidden closed boxes to keep the existing geometry budget.
