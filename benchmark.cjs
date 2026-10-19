const fs = require('fs');
const path = require('path');

// Simulate the file read 10000 times
fs.writeFileSync('.env', 'GROQ_API_KEY=test_key\nAI_PROVIDER=groq\nOLLAMA_BASE_URL=http://localhost:11434');

console.time('No Cache');
for (let i = 0; i < 10000; i++) {
  let apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    try {
      const envContent = fs.readFileSync(path.resolve('.env'), 'utf-8');
      const match = envContent.match(/(?:^|\n)GROQ_API_KEY=(.*)/);
      if (match) apiKey = match[1].trim();
    } catch(e) {}
  }
}
console.timeEnd('No Cache');

let cachedEnvContent = null;
let lastCacheTime = 0;

console.time('With Cache');
for (let i = 0; i < 10000; i++) {
  let apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    try {
      if (!cachedEnvContent || Date.now() - lastCacheTime > 5000) {
        cachedEnvContent = fs.readFileSync(path.resolve('.env'), 'utf-8');
        lastCacheTime = Date.now();
      }
      const match = cachedEnvContent.match(/(?:^|\n)GROQ_API_KEY=(.*)/);
      if (match) apiKey = match[1].trim();
    } catch(e) {}
  }
}
console.timeEnd('With Cache');
