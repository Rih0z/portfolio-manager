const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const scriptPath = path.resolve(__dirname, '../../../scripts/run-tests.sh');
const fakeBinDir = path.resolve(__dirname, 'fakebin');
const resultsDir = path.resolve(__dirname, '../../../test-results');
const coverageFile = path.join(resultsDir, 'detailed-results.json');

function runScript(args = [], env = {}) {
  return spawnSync('bash', [scriptPath, ...args], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${fakeBinDir}:${process.env.PATH}`, ...env }
  });
}

describe('run-tests.sh coverage handling', () => {
  beforeAll(() => {
    if (!fs.existsSync(fakeBinDir)) {
      fs.mkdirSync(fakeBinDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(resultsDir)) fs.rmdirSync(resultsDir, { recursive: true });
  });

  test('warns when coverageMap missing in result file', () => {
    fs.mkdirSync(resultsDir, { recursive: true });
    // coverageMapを含まないJSONファイルを作成
    fs.writeFileSync(coverageFile, JSON.stringify({ 
      numTotalTests: 1, 
      numPassedTests: 1,
      testResults: []
    }));
    const result = runScript(['all']);
    expect(result.stdout).toContain('カバレッジデータが結果ファイルに含まれていません');
  });

  test('reports success when coverage data exists', () => {
    fs.mkdirSync(resultsDir, { recursive: true });
    fs.writeFileSync(
      coverageFile,
      JSON.stringify({
        coverageMap: {
          total: {
            statements: { pct: 90, covered: 9, total: 10 },
            branches: { pct: 80, covered: 8, total: 10 },
            functions: { pct: 100, covered: 10, total: 10 },
            lines: { pct: 95, covered: 19, total: 20 }
          }
        },
        numFailedTests: 0
      })
    );
    const result = runScript(['all']);
    expect(result.stdout).toContain('カバレッジデータが結果ファイルに含まれています');
    expect(result.stdout).toContain('カバレッジ目標: 初期段階');
  });
});
