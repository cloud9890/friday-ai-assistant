## 2023-10-19 - Command Injection in Vite OS Plugin via unescaped numeric input
**Vulnerability:** OS command injection in `/api/system-volume` route. The `amount` parameter from user input was interpolated directly into an `exec()` command string.
**Learning:** Even parameters that semantically represent numbers (like volume levels) can be vectors for command injection if they are directly interpolated into shell strings without validation or sanitization.
**Prevention:** Coerce user inputs to primitive numeric types (e.g., using `Number(val)`) and explicitly handle `NaN` to guarantee safe numeric representations. Additionally, strongly prefer `execFile` or `spawn` which take arrays of arguments, avoiding shell string interpretation altogether.
