# Bolt's Journal - Performance Learnings

## 2026-10-26 - Pre-allocate TypedArrays in 60Hz Canvas Loops
**Learning:** Instantiating `new Uint8Array()` inside `getFrequencyData()` called by `requestAnimationFrame` creates ~120 object allocations/second, causing periodic Garbage Collection (GC) pauses and visual jank during canvas rendering.
**Action:** Always pre-allocate reusable typed array buffers on class instances for high-frequency animation loops.
