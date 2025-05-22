/**
 * ファイルパス: script/generate-coverage-chart.js
 * 
 * Jest テストカバレッジデータからグラフィカルなチャートを生成するスクリプト（修正版）
 * カバレッジ率の正確なビジュアル化に対応
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-21
 * @updated 2025-05-22 - カバレッジデータ処理の改善
 */

const fs = require('fs');
const path = require('path');

// 色の設定
const COLORS = {
  statements: '#4285F4', // Google Blue
  branches: '#34A853',   // Google Green
  functions: '#FBBC05',  // Google Yellow
  lines: '#EA4335',      // Google Red
  background: '#F8F9FA', // Light gray
  text: '#202124',       // Dark gray
  grid: '#DADCE0',       // Light gray for grid
  threshold: {
    initial: '#FFCDD2',  // Light red
    mid: '#FFECB3',      // Light amber
    final: '#C8E6C9'     // Light green
  }
};

// カバレッジ目標値の設定
const COVERAGE_THRESHOLDS = {
  initial: {
    statements: 30,
    branches: 20,
    functions: 25,
    lines: 30
  },
  mid: {
    statements: 60,
    branches: 50,
    functions: 60,
    lines: 60
  },
  final: {
    statements: 80,
    branches: 70,
    functions: 80,
    lines: 80
  }
};

/**
 * デバッグログ出力
 */
function debugLog(message, data = null) {
  if (process.env.DEBUG === 'true' || process.env.VERBOSE_COVERAGE === 'true') {
    console.log(`[DEBUG] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

/**
 * 数値を小数点以下2桁に丸める
 */
function roundToTwo(num) {
  if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) {
    return 0;
  }
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * カバレッジメトリクスの検証と正規化
 */
function validateCoverageMetric(metric) {
  if (!metric || typeof metric !== 'object') {
    return { covered: 0, total: 0, pct: 0 };
  }
  
  const covered = parseInt(metric.covered) || 0;
  const total = parseInt(metric.total) || 0;
  let pct = parseFloat(metric.pct) || 0;
  
  // パーセンテージの再計算（totalが0でない場合）
  if (total > 0 && (isNaN(pct) || pct === 0)) {
    pct = (covered / total) * 100;
  }
  
  // NaNや無限大の値をチェック
  if (isNaN(pct) || !isFinite(pct)) {
    pct = 0;
  }
  
  // 100%を超える場合の修正
  if (pct > 100) {
    pct = 100;
  }
  
  return {
    covered,
    total,
    pct: roundToTwo(pct)
  };
}

/**
 * カバレッジJSONデータを読み込む
 */
function loadCoverageData() {
  try {
    debugLog('カバレッジデータの読み込みを開始');
    
    // 複数のファイルパスを優先順位順に試行
    const possiblePaths = [
      path.resolve('./test-results/detailed-results.json'),
      path.resolve('./coverage/coverage-final.json'),
      path.resolve('./coverage/coverage-summary.json'),
      path.resolve('./test-results/coverage-data.json')
    ];
    
    let loadedData = null;
    let usedPath = null;
    
    // 各パスを順番に試行
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        try {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const jsonData = JSON.parse(fileContent);
          
          debugLog(`ファイルを検出: ${filePath}`);
          debugLog('ファイル内容のキー', Object.keys(jsonData));
          
          // データ形式に応じて処理
          if (filePath.includes('detailed-results.json') && jsonData.coverageMap) {
            debugLog('detailed-results.jsonからカバレッジデータを抽出');
            loadedData = extractFromDetailedResults(jsonData);
            usedPath = filePath;
            break;
          } else if (filePath.includes('coverage-summary.json') && jsonData.total) {
            debugLog('coverage-summary.jsonからカバレッジデータを抽出');
            loadedData = extractFromSummary(jsonData);
            usedPath = filePath;
            break;
          } else if (filePath.includes('coverage-final.json')) {
            debugLog('coverage-final.jsonからカバレッジデータを抽出');
            loadedData = extractFromFinalCoverage(jsonData);
            usedPath = filePath;
            break;
          }
        } catch (parseError) {
          console.warn(`⚠ ${filePath} の解析に失敗: ${parseError.message}`);
          continue;
        }
      }
    }
    
    if (!loadedData) {
      console.warn('⚠ 有効なカバレッジデータファイルが見つかりません');
      return null;
    }
    
    console.log(`✓ カバレッジデータを読み込みました: ${usedPath}`);
    debugLog('読み込んだカバレッジデータ', loadedData);
    
    return loadedData;
    
  } catch (error) {
    console.error('カバレッジデータの読み込みに失敗:', error.message);
    return null;
  }
}

/**
 * detailed-results.jsonからカバレッジデータを抽出
 */
function extractFromDetailedResults(data) {
  if (!data.coverageMap || !data.coverageMap.total) {
    return null;
  }
  
  const total = data.coverageMap.total;
  return {
    statements: validateCoverageMetric(total.statements),
    branches: validateCoverageMetric(total.branches),
    functions: validateCoverageMetric(total.functions),
    lines: validateCoverageMetric(total.lines)
  };
}

/**
 * coverage-summary.jsonからカバレッジデータを抽出
 */
function extractFromSummary(data) {
  if (!data.total) {
    return null;
  }
  
  const total = data.total;
  return {
    statements: validateCoverageMetric(total.statements),
    branches: validateCoverageMetric(total.branches),
    functions: validateCoverageMetric(total.functions),
    lines: validateCoverageMetric(total.lines)
  };
}

/**
 * coverage-final.jsonからカバレッジデータを抽出
 */
function extractFromFinalCoverage(data) {
  const aggregated = {
    statements: { covered: 0, total: 0 },
    branches: { covered: 0, total: 0 },
    functions: { covered: 0, total: 0 },
    lines: { covered: 0, total: 0 }
  };
  
  // 各ファイルのカバレッジデータを集計
  Object.values(data).forEach(fileData => {
    if (!fileData || typeof fileData !== 'object') return;
    
    // ステートメント
    if (fileData.s) {
      const statementCovered = Object.values(fileData.s).filter(v => v > 0).length;
      const statementTotal = Object.keys(fileData.s).length;
      aggregated.statements.covered += statementCovered;
      aggregated.statements.total += statementTotal;
    }
    
    // ブランチ
    if (fileData.b) {
      Object.values(fileData.b).forEach(branches => {
        if (Array.isArray(branches)) {
          branches.forEach(count => {
            aggregated.branches.total++;
            if (count > 0) aggregated.branches.covered++;
          });
        }
      });
    }
    
    // 関数
    if (fileData.f) {
      const functionCovered = Object.values(fileData.f).filter(v => v > 0).length;
      const functionTotal = Object.keys(fileData.f).length;
      aggregated.functions.covered += functionCovered;
      aggregated.functions.total += functionTotal;
    }
    
    // 行
    if (fileData.l) {
      const lineCovered = Object.values(fileData.l).filter(v => v > 0).length;
      const lineTotal = Object.keys(fileData.l).length;
      aggregated.lines.covered += lineCovered;
      aggregated.lines.total += lineTotal;
    } else if (fileData.statementMap && fileData.s) {
      // 行データがない場合はステートメントから推定
      const lineMap = new Map();
      Object.entries(fileData.statementMap).forEach(([stmtId, location]) => {
        if (location && location.start && location.start.line) {
          const line = location.start.line;
          const covered = fileData.s[stmtId] > 0;
          lineMap.set(line, lineMap.get(line) || covered);
        }
      });
      
      aggregated.lines.total += lineMap.size;
      aggregated.lines.covered += Array.from(lineMap.values()).filter(v => v).length;
    }
  });
  
  return {
    statements: validateCoverageMetric(aggregated.statements),
    branches: validateCoverageMetric(aggregated.branches),
    functions: validateCoverageMetric(aggregated.functions),
    lines: validateCoverageMetric(aggregated.lines)
  };
}

/**
 * 目標レベルを現在の環境変数から取得
 */
function getCoverageTarget() {
  const target = process.env.COVERAGE_TARGET || 'initial';
  if (!['initial', 'mid', 'final'].includes(target)) {
    console.warn(`不明なカバレッジ目標: ${target}、初期段階を使用します`);
    return 'initial';
  }
  return target;
}

/**
 * デモカバレッジデータを生成
 */
function generateDemoCoverageData() {
  const targetLevel = getCoverageTarget();
  const targetThresholds = COVERAGE_THRESHOLDS[targetLevel];
  
  console.log('⚠ 実際のカバレッジデータが見つからないため、デモデータを生成します');
  
  return {
    statements: validateCoverageMetric({
      covered: 120,
      total: 200,
      pct: Math.round(targetThresholds.statements * 0.8)
    }),
    branches: validateCoverageMetric({
      covered: 30,
      total: 50,
      pct: Math.round(targetThresholds.branches * 0.8)
    }),
    functions: validateCoverageMetric({
      covered: 25,
      total: 40,
      pct: Math.round(targetThresholds.functions * 0.8)
    }),
    lines: validateCoverageMetric({
      covered: 150,
      total: 200,
      pct: Math.round(targetThresholds.lines * 0.8)
    })
  };
}

/**
 * 棒グラフSVGを生成
 */
function generateBarChart(coverageData, targetLevel) {
  const width = 800;
  const height = 400;
  const padding = 60;
  const barWidth = 80;
  const barGap = 70;
  const startX = 120;
  
  const targetThresholds = COVERAGE_THRESHOLDS[targetLevel];
  
  const data = [
    { 
      name: 'ステートメント', 
      value: coverageData.statements.pct, 
      threshold: targetThresholds.statements,
      covered: coverageData.statements.covered,
      total: coverageData.statements.total
    },
    { 
      name: 'ブランチ', 
      value: coverageData.branches.pct, 
      threshold: targetThresholds.branches,
      covered: coverageData.branches.covered,
      total: coverageData.branches.total
    },
    { 
      name: '関数', 
      value: coverageData.functions.pct, 
      threshold: targetThresholds.functions,
      covered: coverageData.functions.covered,
      total: coverageData.functions.total
    },
    { 
      name: '行', 
      value: coverageData.lines.pct, 
      threshold: targetThresholds.lines,
      covered: coverageData.lines.covered,
      total: coverageData.lines.total
    }
  ];
  
  const maxValue = 100;
  const scaleY = (value) => height - padding - (value / maxValue) * (height - padding * 2);
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
  
  // 背景
  svg += `  <rect width="${width}" height="${height}" fill="${COLORS.background}" />\n`;
  
  // タイトル
  const targetLevelName = {
    initial: '初期段階 (20-30%)',
    mid: '中間段階 (40-60%)',
    final: '最終段階 (70-80%)'
  }[targetLevel];
  
  svg += `  <text x="${width/2}" y="30" text-anchor="middle" font-family="Arial" font-size="20" font-weight="bold" fill="${COLORS.text}">Portfolio Manager カバレッジレポート</text>\n`;
  svg += `  <text x="${width/2}" y="55" text-anchor="middle" font-family="Arial" font-size="16" fill="${COLORS.text}">目標段階: ${targetLevelName} - ${new Date().toLocaleDateString('ja-JP')}</text>\n`;
  
  // Y軸
  svg += `  <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height-padding}" stroke="${COLORS.text}" stroke-width="2" />\n`;
  
  // Y軸の目盛り
  for (let i = 0; i <= maxValue; i += 10) {
    const y = scaleY(i);
    svg += `  <line x1="${padding-5}" y1="${y}" x2="${width-padding}" y2="${y}" stroke="${COLORS.grid}" stroke-width="1" />\n`;
    svg += `  <text x="${padding-10}" y="${y+5}" text-anchor="end" font-family="Arial" font-size="12" fill="${COLORS.text}">${i}%</text>\n`;
  }
  
  // X軸
  svg += `  <line x1="${padding}" y1="${height-padding}" x2="${width-padding}" y2="${height-padding}" stroke="${COLORS.text}" stroke-width="2" />\n`;
  
  // 棒グラフと目標ライン
  data.forEach((d, i) => {
    const x = startX + i * (barWidth + barGap);
    const barHeight = (height - padding * 2) * (d.value / maxValue);
    const y = height - padding - barHeight;
    const color = Object.values(COLORS)[i % 4];
    
    // 目標閾値の背景
    const thresholdY = scaleY(d.threshold);
    svg += `  <rect x="${x - 15}" y="${thresholdY}" width="${barWidth + 30}" height="${height - padding - thresholdY}" fill="${COLORS.threshold[targetLevel]}" opacity="0.3" />\n`;
    
    // 目標閾値ライン
    svg += `  <line x1="${x - 15}" y1="${thresholdY}" x2="${x + barWidth + 15}" y2="${thresholdY}" stroke="${COLORS.text}" stroke-width="2" stroke-dasharray="4" />\n`;
    svg += `  <text x="${x + barWidth/2}" y="${thresholdY - 5}" text-anchor="middle" font-family="Arial" font-size="12" fill="${COLORS.text}">目標: ${d.threshold}%</text>\n`;
    
    // 棒グラフ
    svg += `  <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" />\n`;
    
    // X軸ラベル
    svg += `  <text x="${x + barWidth/2}" y="${height-padding+20}" text-anchor="middle" font-family="Arial" font-size="14" fill="${COLORS.text}">${d.name}</text>\n`;
    
    // 値ラベル
    svg += `  <text x="${x + barWidth/2}" y="${y-5}" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="${COLORS.text}">${roundToTwo(d.value)}%</text>\n`;
    
    // 詳細データ
    svg += `  <text x="${x + barWidth/2}" y="${y-25}" text-anchor="middle" font-family="Arial" font-size="12" fill="${COLORS.text}">${d.covered}/${d.total}</text>\n`;
    
    // 達成状況
    const isAchieved = d.value >= d.threshold;
    const statusColor = isAchieved ? '#00cc00' : '#ff3333';
    const statusText = isAchieved ? '✓' : '✗';
    svg += `  <text x="${x + barWidth/2}" y="${y-45}" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="${statusColor}">${statusText}</text>\n`;
  });
  
  // 全体の達成状況
  const totalAchieved = data.filter(d => d.value >= d.threshold).length;
  const overallColor = totalAchieved === data.length ? '#00cc00' : '#ff6600';
  svg += `  <text x="${width-padding}" y="${padding+20}" text-anchor="end" font-family="Arial" font-size="14" font-weight="bold" fill="${overallColor}">達成率: ${totalAchieved}/${data.length}</text>\n`;
  
  // 生成時刻
  svg += `  <text x="${width-padding}" y="${height-10}" text-anchor="end" font-family="Arial" font-size="10" font-style="italic" fill="${COLORS.text}">生成: ${new Date().toLocaleString('ja-JP')}</text>\n`;
  
  svg += '</svg>';
  
  return svg;
}

/**
 * 折れ線グラフSVGを生成（履歴データ対応）
 */
function generateLineChart(currentData, historyData, targetLevel) {
  const allData = [...historyData, {
    date: new Date().toISOString().split('T')[0],
    statements: currentData.statements.pct,
    branches: currentData.branches.pct,
    functions: currentData.functions.pct,
    lines: currentData.lines.pct,
  }];
  
  const width = 800;
  const height = 400;
  const margin = { top: 40, right: 100, bottom: 80, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
  const numPoints = allData.length;
  const xScale = (i) => margin.left + (i / Math.max(numPoints - 1, 1)) * innerWidth;
  
  const targetThresholds = COVERAGE_THRESHOLDS[targetLevel];
  const maxValue = Math.max(100, Math.ceil((Math.max(
    ...allData.map(d => Math.max(d.statements, d.branches, d.functions, d.lines)),
    targetThresholds.statements,
    targetThresholds.branches,
    targetThresholds.functions,
    targetThresholds.lines
  ) + 10) / 10) * 10);
  
  const yScale = (value) => margin.top + innerHeight - (value / maxValue) * innerHeight;
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
  
  // 背景
  svg += `  <rect width="${width}" height="${height}" fill="${COLORS.background}" />\n`;
  
  // タイトル
  svg += `  <text x="${width/2}" y="30" text-anchor="middle" font-family="Arial" font-size="20" font-weight="bold" fill="${COLORS.text}">Portfolio Manager カバレッジ履歴</text>\n`;
  
  // Y軸
  svg += `  <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height-margin.bottom}" stroke="${COLORS.text}" stroke-width="2" />\n`;
  
  // Y軸の目盛り
  for (let i = 0; i <= maxValue; i += 10) {
    const y = yScale(i);
    svg += `  <line x1="${margin.left-5}" y1="${y}" x2="${width-margin.right}" y2="${y}" stroke="${COLORS.grid}" stroke-width="1" />\n`;
    svg += `  <text x="${margin.left-10}" y="${y+5}" text-anchor="end" font-family="Arial" font-size="12" fill="${COLORS.text}">${i}%</text>\n`;
  }
  
  // X軸
  svg += `  <line x1="${margin.left}" y1="${height-margin.bottom}" x2="${width-margin.right}" y2="${height-margin.bottom}" stroke="${COLORS.text}" stroke-width="2" />\n`;
  
  // X軸ラベル
  allData.forEach((d, i) => {
    if (i % Math.max(1, Math.floor(numPoints / 5)) === 0 || i === numPoints - 1) {
      const x = xScale(i);
      svg += `  <text x="${x}" y="${height-margin.bottom+20}" text-anchor="middle" font-family="Arial" font-size="10" fill="${COLORS.text}" transform="rotate(-45 ${x} ${height-margin.bottom+20})">${d.date}</text>\n`;
    }
  });
  
  // 目標ライン
  const thresholds = [
    { name: 'Statements', value: targetThresholds.statements, color: COLORS.statements },
    { name: 'Branches', value: targetThresholds.branches, color: COLORS.branches },
    { name: 'Functions', value: targetThresholds.functions, color: COLORS.functions },
    { name: 'Lines', value: targetThresholds.lines, color: COLORS.lines }
  ];
  
  thresholds.forEach((threshold, index) => {
    const y = yScale(threshold.value);
    svg += `  <line x1="${margin.left}" y1="${y}" x2="${width-margin.right}" y2="${y}" stroke="${threshold.color}" stroke-width="1" stroke-dasharray="4" opacity="0.7" />\n`;
  });
  
  // 折れ線グラフ
  const series = [
    { name: 'Statements', key: 'statements', color: COLORS.statements },
    { name: 'Branches', key: 'branches', color: COLORS.branches },
    { name: 'Functions', key: 'functions', color: COLORS.functions },
    { name: 'Lines', key: 'lines', color: COLORS.lines }
  ];
  
  series.forEach((serie) => {
    if (numPoints > 1) {
      // 折れ線
      let path = `  <path d="M`;
      allData.forEach((d, i) => {
        const x = xScale(i);
        const y = yScale(d[serie.key]);
        if (i === 0) {
          path += `${x},${y}`;
        } else {
          path += ` L${x},${y}`;
        }
      });
      path += `" fill="none" stroke="${serie.color}" stroke-width="2" />\n`;
      svg += path;
    }
    
    // データポイント
    allData.forEach((d, i) => {
      const x = xScale(i);
      const y = yScale(d[serie.key]);
      svg += `  <circle cx="${x}" cy="${y}" r="4" fill="${serie.color}" stroke="white" stroke-width="1" />\n`;
      
      // 最新のデータポイントには値を表示
      if (i === allData.length - 1) {
        svg += `  <text x="${x+8}" y="${y-8}" text-anchor="start" font-family="Arial" font-size="12" font-weight="bold" fill="${serie.color}">${roundToTwo(d[serie.key])}%</text>\n`;
      }
    });
  });
  
  // 凡例
  const legendStartX = width - margin.right + 10;
  const legendStartY = margin.top + 20;
  series.forEach((serie, i) => {
    const y = legendStartY + i * 20;
    svg += `  <line x1="${legendStartX}" y1="${y}" x2="${legendStartX + 15}" y2="${y}" stroke="${serie.color}" stroke-width="2" />\n`;
    svg += `  <text x="${legendStartX + 20}" y="${y + 4}" font-family="Arial" font-size="12" fill="${COLORS.text}">${serie.name}</text>\n`;
  });
  
  svg += '</svg>';
  
  return svg;
}

/**
 * カバレッジ履歴データを読み込む
 */
function loadCoverageHistory() {
  const historyFile = path.resolve('./test-results/coverage-history.json');
  
  if (!fs.existsSync(historyFile)) {
    return [];
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('カバレッジ履歴データの読み込みに失敗:', error.message);
    return [];
  }
}

/**
 * カバレッジ履歴データを保存
 */
function saveCoverageHistory(currentData) {
  const historyFile = path.resolve('./test-results/coverage-history.json');
  const history = loadCoverageHistory();
  
  const today = new Date().toISOString().split('T')[0];
  
  // 同じ日付のデータがあれば上書き、なければ追加
  const existingIndex = history.findIndex(item => item.date === today);
  
  const newDataPoint = {
    date: today,
    statements: roundToTwo(currentData.statements.pct),
    branches: roundToTwo(currentData.branches.pct),
    functions: roundToTwo(currentData.functions.pct),
    lines: roundToTwo(currentData.lines.pct)
  };
  
  if (existingIndex >= 0) {
    history[existingIndex] = newDataPoint;
  } else {
    history.push(newDataPoint);
  }
  
  // 履歴を最大30日分に制限
  const limitedHistory = history.slice(-30);
  
  try {
    fs.writeFileSync(historyFile, JSON.stringify(limitedHistory, null, 2));
    console.log('✓ カバレッジ履歴データを保存しました');
  } catch (error) {
    console.error('カバレッジ履歴データの保存に失敗:', error.message);
  }
}

/**
 * SVGチャートをHTMLレポートに埋め込む
 */
function embedChartsInReport(barChartSvg, lineChartSvg) {
  const reportFile = path.resolve('./test-results/visual-report.html');
  
  if (!fs.existsSync(reportFile)) {
    console.warn('⚠ ビジュアルレポートファイルが見つかりません:', reportFile);
    return;
  }
  
  try {
    let html = fs.readFileSync(reportFile, 'utf8');
    
    // チャートセクションの挿入位置を探す
    const insertPosition = html.indexOf('</body>');
    if (insertPosition === -1) {
      console.warn('⚠ HTMLファイルの構造が不正です');
      return;
    }
    
    const chartSection = `
      <div class="coverage-charts" style="margin-top: 30px; border-top: 1px solid #333; padding-top: 20px;">
        <h2 style="text-align: center; margin-bottom: 20px; color: #00ffff;">カバレッジチャート</h2>
        <div class="chart-container" style="display: flex; justify-content: center; margin-bottom: 30px;">
          ${barChartSvg}
        </div>
        <div class="chart-container" style="display: flex; justify-content: center; margin-bottom: 30px;">
          ${lineChartSvg}
        </div>
      </div>
    `;
    
    html = html.slice(0, insertPosition) + chartSection + html.slice(insertPosition);
    
    fs.writeFileSync(reportFile, html);
    console.log('✓ ビジュアルレポートにチャートを埋め込みました');
  } catch (error) {
    console.error('レポートへのチャート埋め込みに失敗:', error.message);
  }
}

/**
 * メイン処理
 */
function main() {
  console.log('🎨 カバレッジチャート生成を開始します...');
  
  // カバレッジデータを読み込む
  let coverageData = loadCoverageData();
  
  if (!coverageData) {
    coverageData = generateDemoCoverageData();
  }
  
  // カバレッジ目標を取得
  const targetLevel = getCoverageTarget();
  console.log(`📊 カバレッジ目標段階: ${targetLevel}`);
  
  debugLog('使用するカバレッジデータ', coverageData);
  
  // チャート生成
  const barChartSvg = generateBarChart(coverageData, targetLevel);
  
  // 履歴データ処理
  const historyData = loadCoverageHistory();
  saveCoverageHistory(coverageData);
  
  const lineChartSvg = generateLineChart(coverageData, historyData, targetLevel);
  
  // 出力ディレクトリの確保
  const outputDir = path.resolve('./test-results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // SVGファイルとして保存
  fs.writeFileSync(path.join(outputDir, 'coverage-bar-chart.svg'), barChartSvg);
  fs.writeFileSync(path.join(outputDir, 'coverage-line-chart.svg'), lineChartSvg);
  
  console.log('✓ SVGチャートファイルを生成しました');
  
  // レポートに埋め込む
  embedChartsInReport(barChartSvg, lineChartSvg);
  
  console.log('🎉 カバレッジチャート生成が完了しました');
  
  // サマリー情報を表示
  console.log('\n📈 カバレッジサマリー:');
  console.log(`- ステートメント: ${coverageData.statements.pct}% (${coverageData.statements.covered}/${coverageData.statements.total})`);
  console.log(`- ブランチ: ${coverageData.branches.pct}% (${coverageData.branches.covered}/${coverageData.branches.total})`);
  console.log(`- 関数: ${coverageData.functions.pct}% (${coverageData.functions.covered}/${coverageData.functions.total})`);
  console.log(`- 行: ${coverageData.lines.pct}% (${coverageData.lines.covered}/${coverageData.lines.total})`);
  
  const targetThresholds = COVERAGE_THRESHOLDS[targetLevel];
  const achievedCount = [
    coverageData.statements.pct >= targetThresholds.statements,
    coverageData.branches.pct >= targetThresholds.branches,
    coverageData.functions.pct >= targetThresholds.functions,
    coverageData.lines.pct >= targetThresholds.lines
  ].filter(Boolean).length;
  
  console.log(`\n🎯 目標達成状況: ${achievedCount}/4 項目達成`);
}

// エラーハンドリング付きでスクリプトを実行
try {
  main();
} catch (error) {
  console.error('❌ カバレッジチャート生成中にエラーが発生しました:', error.message);
  if (process.env.DEBUG === 'true') {
    console.error(error.stack);
  }
  process.exit(1);
}
