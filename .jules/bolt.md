# Bolt's Journal - Critical Performance Learnings

This journal documents critical architectural learnings, surprising bottlenecks, and non-obvious performance patterns specific to the F.R.I.D.A.Y. assistant codebase.

## 2025-05-18 - Audio Visualizer Canvas Render Loop Bottleneck
**Learning:** The dual canvas visualizer (`drawArcReactor` and `drawSpectrum`) runs inside a continuous `requestAnimationFrame` loop, calling `getFrequencyData()` twice per frame. When audio is synthetic (idle/listening), allocating `new Uint8Array(32)` inside `getFrequencyData()` generated 120-288 short-lived heap allocations every second, causing garbage collection spikes. Furthermore, recalculating trigonometric formants and `Math.random` twice within the same frame produced visual desynchronization and redundant CPU work.
**Action:** Always preallocate typed arrays on persistent engine instances and cache synchronous per-frame calculations when multiple canvas elements share identical audio spectrum data.
