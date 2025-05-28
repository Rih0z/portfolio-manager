const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const scriptPath = path.resolve(__dirname, '../../../scripts/run-tests.sh');
const fakeBinDir = path.resolve(__dirname, 'fakebin');

function runScript(args = [], env = {}) {
  return spawnSync('bash', [scriptPath, ...args], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${fakeBinDir}:${process.env.PATH}`, OSTYPE: 'linux-gnu', ...env }
  });
}

describe('run-tests.sh misc options', () => {
  const coverageHtml = path.resolve(__dirname, '../../../coverage/lcov-report/index.html');
  const visualHtml = path.resolve(__dirname, '../../../test-results/visual-report.html');
  const coverageDir = path.dirname(coverageHtml);
  const visualDir = path.dirname(visualHtml);

  beforeAll(() => {
    if (!fs.existsSync(fakeBinDir)) {
      fs.mkdirSync(fakeBinDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(coverageDir)) fs.rmSync(coverageDir, { recursive: true, force: true });
    if (fs.existsSync(visualDir)) fs.rmSync(visualDir, { recursive: true, force: true });
  });

  test('--html-coverage opens report when file exists', () => {
    fs.mkdirSync(coverageDir, { recursive: true });
    fs.writeFileSync(coverageHtml, '<html></html>');
    const result = runScript(['--html-coverage', 'all']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('HTMLカバレッジレポートを開いています');
  });

  test('--visual opens report when file exists', () => {
    fs.mkdirSync(visualDir, { recursive: true });
    fs.writeFileSync(visualHtml, '<html></html>');
    const result = runScript(['--visual', 'all']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('テスト結果をビジュアルレポートで表示します');
  });

  test('--debug and --detect-open-handles', () => {
    const result = runScript(['--detect-open-handles', '--debug', 'all']);
    expect(result.stdout).toContain('デバッグログが有効です');
    expect(result.stdout).toContain('非同期ハンドルの検出が有効です');
    expect(result.stdout).toContain('実行するJestコマンド');
  });

  test('--junit and --nvm', () => {
    const result = runScript(['--junit', '--nvm', 'all']);
    expect(result.stdout).toContain('JUnit形式のレポートを生成します');
    expect(result.stdout).toContain('nvmを使用してNode.js 18に切り替えます');
  });
});
