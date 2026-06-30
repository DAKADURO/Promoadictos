const fs = require('fs');
const html = fs.readFileSync('social.html', 'utf8');
const scriptMatch = html.match(/<script id="__NORDIC_RENDERING_CTX__"[^>]*>([\s\S]*?)<\/script>/);
const scriptContent = scriptMatch[1].trim();
const jsonStart = scriptContent.indexOf("{");
let braceCount = 0;
let jsonEnd = -1;
let inString = false;
let escape = false;

for (let i = jsonStart; i < scriptContent.length; i++) {
  const char = scriptContent[i];
  if (escape) { escape = false; continue; }
  if (char === '\\') { escape = true; continue; }
  if (char === '"') { inString = !inString; continue; }
  if (!inString) {
    if (char === '{') braceCount++;
    else if (char === '}') {
      braceCount--;
      if (braceCount === 0) { jsonEnd = i; break; }
    }
  }
}

const state = scriptContent.substring(jsonStart, jsonEnd + 1);
fs.writeFileSync('state.json', state);
