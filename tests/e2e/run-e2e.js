const net = require('net');
const {spawn} = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');

function parseArgs(argv) {
  return {
    screens: argv.includes('--screens'),
    debug: argv.includes('--debug')
  };
}

function tryPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolve(null));
    server.listen({port, host: '127.0.0.1'}, () => {
      const address = server.address();
      const chosenPort = typeof address === 'object' && address ? address.port : port;
      server.close(() => resolve(chosenPort));
    });
  });
}

function takeEphemeralPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen({port: 0, host: '127.0.0.1'}, () => {
      const address = server.address();
      const chosenPort = typeof address === 'object' && address ? address.port : null;
      server.close(() => {
        if (!chosenPort) {
          reject(new Error('Could not read ephemeral port'));
          return;
        }
        resolve(chosenPort);
      });
    });
  });
}

async function findFreePort(preferredPort) {
  const preferred = await tryPort(preferredPort);
  return preferred || takeEphemeralPort();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const port = await findFreePort(Number(process.env.PLAYWRIGHT_TEST_FRONTEND_PORT || 4384));
  const playwrightBin = path.join(repoRoot, 'node_modules/.bin/playwright');
  const specArgs = args.screens ? [
    'tests/e2e/pin-services.spec.js',
    'tests/e2e/post-html-safety.spec.js',
    'tests/e2e/storage-space.spec.js'
  ] : [];

  console.log(`[geesome-ui:e2e] frontend port ${port}`);
  if (args.debug) {
    console.log('[geesome-ui:e2e] debug logs enabled');
  }

  const child = spawn(
    playwrightBin,
    ['test', '--config=tests/e2e/playwright.config.js', '--reporter=line', ...specArgs],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        PLAYWRIGHT_TEST_FRONTEND_PORT: String(port),
        PLAYWRIGHT_SCREEN_DEBUG: args.debug ? '1' : process.env.PLAYWRIGHT_SCREEN_DEBUG || ''
      }
    }
  );

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code || 0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
