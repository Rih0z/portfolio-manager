/**
 * 為替レート更新のデバウンス管理
 */

// 最後の為替レート更新時刻を記録
let lastExchangeRateUpdate = 0;
const MIN_UPDATE_INTERVAL = 3600000; // 1時間は再更新しない

export function shouldUpdateExchangeRate() {
  const now = Date.now();
  const timeSinceLastUpdate = now - lastExchangeRateUpdate;
  
  if (timeSinceLastUpdate < MIN_UPDATE_INTERVAL) {
    const minutes = Math.round(timeSinceLastUpdate / 1000 / 60);
    console.log(`為替レート更新をスキップ: 前回から${minutes}分しか経過していません（1時間待機）`);
    return false;
  }
  
  lastExchangeRateUpdate = now;
  return true;
}

export function resetExchangeRateTimer() {
  lastExchangeRateUpdate = 0;
}