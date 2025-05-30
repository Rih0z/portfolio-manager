/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/craco.config.js 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-03-01 10:30:00 
 * 
 * 更新履歴: 
 * - 2025-03-01 10:30:00 Koki Riho 初回作成
 * - 2025-05-08 11:20:00 Koki Riho ファイルヘッダーを追加
 * 
 * 説明: 
 * Create React App Configuration Override (CRACO) 設定ファイル。
 * Create React App のデフォルト設定を上書きせずに拡張するための設定。
 * Tailwind CSS と PostCSS の設定を含む。
 */
module.exports = {
    style: {
      postcss: {
        plugins: [
          require('tailwindcss'),
          require('autoprefixer'),
        ],
      },
    },
  }
