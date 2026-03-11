const { spawnSync } = require('child_process');

if (process.platform !== 'win32') {
  console.error('Questo comando deve essere eseguito su Windows (win32).');
  process.exit(1);
}

const commands = [
  ['npm', ['run', 'build:localize']],
  ['npm', ['run', 'build:electron']],
  ['npx', ['electron-builder', '--win']],
];

for (const [cmd, args] of commands) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
