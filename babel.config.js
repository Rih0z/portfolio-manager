/**
 * ファイルパス: babel.config.js
 * 
 * Babel設定ファイル
 * Reactコンポーネントのトランスパイル設定を定義
 */

module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current',
      },
    }],
    ['@babel/preset-react', {
      runtime: 'automatic',
    }],
  ],
  plugins: []
};
