const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('scripts/run-tests.sh wrapper', () => {
  function setup(dirExitCode = 0) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rtwrapper-'));
    // create script and scripts directories
    fs.mkdirSync(path.join(tmp, 'script'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
    // copy wrapper from repo
    const wrapperSrc = path.resolve(__dirname, '../../../scripts/run-tests.sh');
    const wrapperDest = path.join(tmp, 'scripts', 'run-tests.sh');
    fs.copyFileSync(wrapperSrc, wrapperDest);
    fs.chmodSync(wrapperDest, 0o755);
    // stub real script
    const stub = `#!/bin/sh\necho \"$@\" > ../args.log\nexit ${dirExitCode}\n`;
    const stubPath = path.join(tmp, 'script', 'run-tests.sh');
    fs.writeFileSync(stubPath, stub, { mode: 0o755 });
    return tmp;
  }

  test('forwards arguments to real script', () => {
    const tmp = setup(0);
    const res = spawnSync('bash', [path.join(tmp, 'scripts/run-tests.sh'), 'foo', 'bar'], { cwd: tmp, encoding: 'utf8' });
    const args = fs.readFileSync(path.join(tmp, 'args.log'), 'utf8').trim();
    fs.rmSync(tmp, { recursive: true, force: true });
    expect(res.status).toBe(0);
    expect(args).toBe('foo bar');
  });

  test('exit code follows underlying script', () => {
    const tmp = setup(7);
    const res = spawnSync('bash', [path.join(tmp, 'scripts/run-tests.sh'), 'all'], { cwd: tmp, encoding: 'utf8' });
    fs.rmSync(tmp, { recursive: true, force: true });
    expect(res.status).toBe(7);
  });
});
