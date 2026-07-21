const { readdirSync, statSync } = require('fs');
const { join } = require('path');
const { spawnSync } = require('child_process');

function javascriptFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? javascriptFiles(path) : path.endsWith('.js') ? [path] : [];
  });
}

const files = ['src', 'scripts', 'test'].filter((directory) => {
  try { return statSync(directory).isDirectory(); } catch { return false; }
}).flatMap(javascriptFiles);

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log(`Syntax checked ${files.length} JavaScript files.`);
