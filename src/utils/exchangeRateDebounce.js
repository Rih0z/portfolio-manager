/**
 * 為替レート更新のデバウンス管理
 */

// 最後の為替レート更新時刻を記録
let lastExchangeRateUpdate = 0;
const MIN_UPDATE_INTERVAL = 60000; // 1分間は再更新しない

export function shouldUpdateExchangeRate() {
  const now = Date.now();
  const timeSinceLastUpdate = now - lastExchangeRateUpdate;
  
  if (timeSinceLastUpdate < MIN_UPDATE_INTERVAL) {
    console.log(`為替レート更新をスキップ: 前回から${Math.round(timeSinceLastUpdate / 1000)}秒しか経過していません`);
    return false;
  }
  
  lastExchangeRateUpdate = now;
  return true;
}

export function resetExchangeRateTimer() {
  lastExchangeRateUpdate = 0;
}