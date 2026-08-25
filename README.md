# DIVA × QNX

Interactive pitch site for **DIVA** (Deepwater Investigation & Visual Analysis) — a manta-ray-inspired
buoyancy-driven underwater glider, built as a Yale MENG 4137L senior design project by Group 1
(Jordan Davis, Murat Khidoyatov, Nowyshin Mridula, Chloe DeJoy), presented as a sponsorship pitch to QNX.

Scroll to dive: the 3D robot disassembles layer by layer (hull, electronics bay, buoyancy engine,
servo-driven wings), then the second half shows how QNX Neutrino's deterministic scheduling and
microkernel fault isolation are essential to the control stack.

## Tech

Single self-contained `index.html` — vanilla JS + Three.js (inlined, r147). No build step, no external
dependencies. Works as a static page (GitHub Pages ready).

Tip: append `#p=0.5` to the URL to deep-link to any scroll position.
