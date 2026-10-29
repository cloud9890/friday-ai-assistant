# Bolt's Performance Journal

## 2025-05-18 - Eliminate TypedArray Allocation in rAF Audio Visualizer Loop
**Learning:** Re-instantiating `Uint8Array` buffers inside `requestAnimationFrame` loops (such as canvas audio frequency visualizers running at 60 FPS across multiple canvases) creates ~120 short-lived object allocations per second. This triggers minor GC cycles and frame stutters.
**Action:** Pre-allocate fixed `Uint8Array` buffers on the class instance during initialization and reuse them synchronously within frame render ticks.
