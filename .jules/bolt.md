## 2025-05-18 - Avoid TypedArray Allocations in requestAnimationFrame Visualizers
**Learning:** Calling functions in `requestAnimationFrame` render loops that instantiate object structures (like `new Uint8Array(32)`) allocates hundreds of objects per second on the heap. This creates significant GC pressure and micro-stutters during canvas animations.
**Action:** Pre-allocate array buffers or typed arrays in constructor properties and reuse them across animation frames instead of instantiating new instances inside audio/canvas callbacks.
