import { spawn, spawnSync } from 'node:child_process';
import { request } from 'node:http';
import { resolve } from 'node:path';

const port = 5173;
const url = `http://127.0.0.1:${port}`;
const viteCli = resolve(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');
const playwrightCli = resolve(process.cwd(), 'node_modules', 'playwright', 'cli.js');

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await canReachServer()) return;
    await wait(500);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function canReachServer() {
  return new Promise((resolveRequest) => {
    const req = request(url, { agent: false, timeout: 2_000 }, (response) => {
      response.resume();
      resolveRequest(Boolean(response.statusCode && response.statusCode < 500));
    });

    req.on('error', () => {
      resolveRequest(false);
    });
    req.on('timeout', () => {
      req.destroy();
      resolveRequest(false);
    });
    req.end();
  }).catch(() => false);
}

function spawnServer(command, args, env = {}) {
  const server = spawn(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: 'ignore',
  });
  server.unref();
  return server;
}

function stopServer(server) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    const netstat = spawnSync('netstat', ['-ano'], { encoding: 'utf8' });
    const listenerIds = new Set(
      (netstat.stdout ?? '')
        .split(/\r?\n/)
        .filter((line) => line.includes(`127.0.0.1:${port}`) && line.includes('LISTENING'))
        .map((line) => line.trim().split(/\s+/).at(-1))
        .filter((pid) => pid && pid !== '0'),
    );
    listenerIds.forEach((pid) => {
      spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
    });
    return;
  }

  server.kill('SIGTERM');
}

async function run() {
  console.log('Starting Vite test server...');
  const server = spawnServer(process.execPath, [viteCli, '--host', '127.0.0.1']);

  try {
    await waitForServer();
    console.log(`Server ready at ${url}`);
    console.log('Running Playwright tests...');
    const result = spawnSync(
      process.execPath,
      [playwrightCli, 'test', '--config=playwright.e2e.config.ts'],
      {
        cwd: process.cwd(),
        env: { ...process.env, PLAYWRIGHT_NO_WEB_SERVER: '1' },
        stdio: 'inherit',
      },
    );
    console.log(`Playwright exited with code ${result.status ?? 1}`);
    process.exitCode = Number(result.status ?? 1);
  } finally {
    console.log('Stopping Vite test server...');
    stopServer(server);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
