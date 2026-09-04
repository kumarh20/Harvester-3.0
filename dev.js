const { spawn } = require('child_process');

let port = 3000;
let host = '0.0.0.0';

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--port' && args[i + 1]) {
    port = args[++i];
  } else if (arg.startsWith('--port=')) {
    port = arg.split('=')[1];
  } else if (/^\d{4,5}$/.test(arg)) {
    port = arg;
  } else if (arg === '--host' && args[i + 1]) {
    host = args[++i];
  } else if (arg.startsWith('--host=')) {
    host = arg.split('=')[1];
  } else if (arg === '0.0.0.0' || arg === 'localhost' || arg === '127.0.0.1') {
    host = arg;
  }
}

const ngArgs = [
  'serve',
  '--host', String(host),
  '--port', String(port)
];

console.log(`Starting Angular dev server: npx ng ${ngArgs.join(' ')}`);

const child = spawn('npx', ['ng', ...ngArgs], {
  stdio: 'inherit',
  env: process.env
});

child.on('error', (err) => {
  console.error('Failed to start ng serve:', err);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
