## 2025-05-20 - Pre-allocate TypedArrays in Audio/Canvas Animation Loops
**Learning:** Functions called inside requestAnimationFrame or continuous audio visualizer loops (e.g., `getFrequencyData()`) that allocate TypedArrays (`new Uint8Array(...)`) cause frequent garbage collection pauses (~120 allocations/sec across arc reactor and spectrum visualizers).
**Action:** Pre-allocate fixed-size `Uint8Array` buffers on component/engine initialization and mutate/reuse them during render passes to eliminate GC churn and keep visualizer rendering smooth.
