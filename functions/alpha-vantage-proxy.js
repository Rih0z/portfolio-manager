/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: functions/alpha-vantage-proxy.js 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2023/04/15 10:30:00 
 * 
 * 更新履歴: 
 * - 2023/04/15 10:30:00 Koki Riho 初回作成
 * - 2023/05/01 11:45:00 Yuta Sato エラーハンドリングを強化
 * 
 * 説明: 
 * Alpha Vantage APIへのプロキシとして機能し、株価データを取得するサーバーレス関数。
 * CORSの問題を回避し、APIキーを安全に管理するための層として機能する。
 * Alpaca APIが利用できない場合のバックアップデータソースとして使用される。
 * API使用制限やタイムアウトを適切に処理し、エラー情報を詳細に提供する。
 */
