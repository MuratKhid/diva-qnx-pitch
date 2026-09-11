# DIVA × QNX

Interactive pitch site for **DIVA** (Deepwater Investigation & Visual Analysis) — a manta-ray-inspired
buoyancy-driven underwater glider, built as a Yale MENG 4137L senior design project by Group 1
(Jordan Davis, Murat Khidoyatov, Nowyshin Mridula, Chloe DeJoy), presented as a sponsorship pitch to QNX.

Scroll to dive: the 3D robot disassembles layer by layer (hull, buoyancy engine, electronics bay,
servo-driven wings). The 3D buoyancy-and-cooling chapter shows the proposed shared water path:
outside water ↔ silicone tube ↔ Seeed Studio 114070261 Pi 5 radiator ↔ silicone tube ↔ ballast
reservoir, driven by the NEMA 17 piston. The cooler is mounted on the actual electronics tray;
silicone tubing stays attached through the exploded view. Scrolling fills and empties the
reservoir, moves the piston, and reverses the 3D flow markers through the same two tubes.
The second half shows how QNX Neutrino's deterministic scheduling and
microkernel fault isolation are essential to the control stack.

## Codebase

Includes vanilla JS and Three.js (inlined, r147). No build step, no external
dependencies. Works as a static page (GitHub Pages ready).

| File | Contents |
|---|---|
| `index.html` | HTML shell, links out to the rest |
| `styles.css` | CSS styling |
| `lib/three.min.js` | bundled Three.js library (was inlined) |
| `assets/ocean.jpg` | ocean background image (was a 362KB base64 data URI) |
| `prev.index.html` | full byte-identical backup of the original monolith, before any changes |
| `src/utils.js` | `$`, `clamp`, `lerp`, `ease`, `sstep`, `reduced`, `FAKE` |
| `src/scene-setup.js` | THREE renderer/scene/camera/lights |
| `src/materials.js` | material factory |
| `src/shapes.js` | geometry helpers |
| `src/robot.js` | robot model build (biggest, 344 lines) |
| `src/cooling.js` | 3D Pi cooler, attached silicone plumbing, and scroll-driven coolant flow |
| `src/seabed.js` | Q&A boulders scene |
| `src/keyframes.js` | camera/explode/focus keyframes |
| `src/scenes-labels.js` | scene defs + label system |
| `src/qnx-hud.js` | QNX HUD |
| `src/particles.js` | snow particle canvas |
| `src/main.js` | scroll/depth-gauge/rAF loop, orchestrates rest |

Tip: append `#p=0.5` to the URL to deep-link to any scroll position.
