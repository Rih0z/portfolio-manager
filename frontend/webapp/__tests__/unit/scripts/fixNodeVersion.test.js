const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

function withTempDir(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fix-'));
  fs.copyFileSync(path.resolve(__dirname, '../../../scripts/fix-node-version.sh'), path.join(tmp, 'fix.sh'));
  fs.chmodSync(path.join(tmp, 'fix.sh'), 0o755);
  fs.writeFileSync(path.join(tmp, 'package.json'), '{"engines":{"node":"18.x"}}');
  try {
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

describe('fix-node-version.sh', () => {
  test('exits immediately when Node 18 is already used', () => {
    withTempDir(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      fs.writeFileSync(path.join(bin, 'node'), '#!/bin/sh\necho v18.10.0\n', { mode: 0o755 });
      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, HOME: tmp };
      const res = spawnSync('bash', [path.join(tmp, 'fix.sh')], { encoding: 'utf8', env });
      expect(res.status).toBe(0);
      expect(res.stdout).toContain('Node.jsバージョンは適切です');
    });
  });

  test('handles missing nvm and updates package.json', () => {
    withTempDir(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      fs.writeFileSync(path.join(bin, 'node'), '#!/bin/sh\necho v14.0.0\n', { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'npm'), '#!/bin/sh\necho "$@" > "${TMPDIR:-$tmp}/npm.log"\n', { mode: 0o755 });
      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, HOME: tmp };
      const res = spawnSync('bash', [path.join(tmp, 'fix.sh')], { encoding: 'utf8', env, input: 'y\n' });
      expect(res.status).toBe(0);
      expect(res.stdout).toContain('nvmが見つかりません');
      const pkg = fs.readFileSync(path.join(tmp, 'package.json'), 'utf8');
      expect(pkg).toContain('>=18.x');
      expect(fs.existsSync(path.join(tmp, 'package.json.bak'))).toBe(true);
    });
  });
});
