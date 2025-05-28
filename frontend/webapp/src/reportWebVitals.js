/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/reportWebVitals.js 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-03-01 10:00:00 
 * 
 * 更新履歴: 
 * - 2025-03-01 10:00:00 Koki Riho 初回作成
 * - 2025-05-08 11:20:00 Koki Riho ファイルヘッダーを追加
 * 
 * 説明: 
 * Web Vitalsのパフォーマンス測定を実行するためのユーティリティ関数。
 * Core Web Vitals（CLS、FID、FCP、LCP、TTFB）の測定をサポートし、
 * 指定されたコールバック関数にその結果を渡す。
 * Create React Appのデフォルト設定に含まれており、アプリケーションのパフォーマンスモニタリングに使用される。
 */
const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;
