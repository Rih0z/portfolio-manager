const fs = require('fs');
const path = require('path');

function generate() {
  const outputDir = path.resolve('./test-results');
  const jsonPath = path.join(outputDir, 'detailed-results.json');
  const logPath = path.join(outputDir, 'test-log.md');

  if (!fs.existsSync(jsonPath)) {
    console.error(`detailed-results.json not found: ${jsonPath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  let md = '# テスト実行結果\n\n';
  md += `実行日時: ${new Date().toLocaleString('ja-JP')}\n\n`;
  md += '## サマリー\n\n';
  md += `- 合計テスト数: ${data.numTotalTests}\n`;
  md += `- 成功: ${data.numPassedTests}\n`;
  md += `- 失敗: ${data.numFailedTests}\n`;
  md += `- スキップ: ${data.numPendingTests}\n`;

  if (data.coverageMap && data.coverageMap.total) {
    const total = data.coverageMap.total;
    md += '\n## カバレッジ\n\n';
    md += '| メトリクス | パーセント |\n';
    md += '|------------|-----------:|\n';
    md += `| ステートメント | ${total.statements.pct} |\n`;
    md += `| ブランチ | ${total.branches.pct} |\n`;
    md += `| 関数 | ${total.functions.pct} |\n`;
    md += `| 行 | ${total.lines.pct} |\n`;
  }

  fs.writeFileSync(logPath, md);
}

generate();
