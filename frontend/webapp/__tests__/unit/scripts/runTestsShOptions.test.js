const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

function withTempSetup(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rtopt-'));
  fs.mkdirSync(path.join(tmp, 'script'));
  const files = ['run-tests.sh', 'setup-test-env.js'];
  files.forEach(f => {
    const src = path.resolve(__dirname, '../../../script', f);
    const dest = path.join(tmp, 'script', f);
    fs.copyFileSync(src, dest);
    if (f.endsWith('.sh')) fs.chmodSync(dest, 0o755);
  });
  fs.writeFileSync(path.join(tmp, 'package.json'), '{}');
  fs.copyFileSync(path.resolve(__dirname, '../../../custom-reporter.js'), path.join(tmp, 'custom-reporter.js'));
  try {
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

describe('run-tests.sh additional options', () => {
  const script = path.resolve(__dirname, '../../../scripts/run-tests.sh');

  test('watch mode with debug shows command', () => {
    withTempSetup(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      const log = path.join(tmp, 'cmd.log');
      fs.writeFileSync(path.join(bin, 'npx'), `#!/bin/sh\necho \"$@\" > \"${log}\"\n`, { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'cross-env'), '#!/bin/sh\nshift\n"$@"\n', { mode: 0o755 });

      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const res = spawnSync('bash', [path.join(tmp, 'scripts/run-tests.sh'), '-w', '--debug', 'all'], { cwd: tmp, env, encoding: 'utf8' });
      const cmd = fs.readFileSync(log, 'utf8');
      expect(res.status).toBe(0);
      expect(res.stdout).toContain('監視モードが有効です');
      expect(res.stdout).toContain('実行するJestコマンド');
      expect(cmd).toContain('--watch');
    });
  });

  test('no coverage disables reporters', () => {
    withTempSetup(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      const log = path.join(tmp, 'cmd.log');
      fs.writeFileSync(path.join(bin, 'npx'), `#!/bin/sh\necho \"$@\" > \"${log}\"\n`, { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'cross-env'), '#!/bin/sh\nshift\n"$@"\n', { mode: 0o755 });

      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const res = spawnSync('bash', [path.join(tmp, 'scripts/run-tests.sh'), '-n', 'all'], { cwd: tmp, env, encoding: 'utf8' });
      const cmd = fs.readFileSync(log, 'utf8');
      expect(res.status).toBe(0);
      expect(res.stdout).toContain('カバレッジチェックが無効化されています');
      expect(cmd).toContain('--coverage=false');
    });
  });

  test('force coverage overrides no-coverage', () => {
    withTempSetup(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      const log = path.join(tmp, 'cmd.log');
      fs.writeFileSync(path.join(bin, 'npx'), `#!/bin/sh\necho \"$@\" > \"${log}\"\n`, { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'cross-env'), '#!/bin/sh\nshift\n"$@"\n', { mode: 0o755 });

      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const res = spawnSync('bash', [path.join(tmp, 'scripts/run-tests.sh'), '-n', '--force-coverage', 'all'], { cwd: tmp, env, encoding: 'utf8' });
      const cmd = fs.readFileSync(log, 'utf8');
      expect(res.status).toBe(0);
      expect(cmd).not.toContain('--coverage=false');
      expect(cmd).toContain('--coverage');
    });
  });

  test('--nvm triggers nvm call', () => {
    withTempSetup(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      const log = path.join(tmp, 'nvm.log');
      fs.writeFileSync(path.join(bin, 'npx'), '#!/bin/sh\nshift\n"$@"\n', { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'cross-env'), '#!/bin/sh\nshift\n"$@"\n', { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'nvm'), `#!/bin/sh\necho \"$@\" >> \"${log}\"\n`, { mode: 0o755 });

      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const res = spawnSync('bash', [path.join(tmp, 'scripts/run-tests.sh'), '--nvm', 'all'], { cwd: tmp, env, encoding: 'utf8' });
      const nvmCmd = fs.readFileSync(log, 'utf8');
      expect(res.status).toBe(0);
      expect(res.stdout).toContain('nvmを使用してNode.js 18に切り替えます');
      expect(nvmCmd).toContain('use 18');
    });
  });
});

