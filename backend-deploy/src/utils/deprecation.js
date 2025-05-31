/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/utils/deprecation.js
 * 
 * 説明: 
 * 非推奨機能に関するユーティリティ。
 * 非推奨機能の使用を検出し、警告やエラーを発生させる機能を提供します。
 * 
 * @author Koki Riho
 * @created 2025-05-20
 */
'use strict';

const logger = require('./logger');

/**
 * 非推奨機能の使用を記録し、警告またはエラーを出力する
 * @param {string} deprecatedName - 非推奨となった機能の名称
 * @param {string} alternative - 代替として推奨される機能
 * @param {Object} options - オプション
 * @param {boolean} options.throwError - エラーをスローするかどうか
 * @param {string} options.version - 非推奨となったバージョン
 * @param {string} options.removalVersion - 削除予定のバージョン
 */
const warnDeprecation = (deprecatedName, alternative, options = {}) => {
  const {
    throwError = false,
    version = '2.0.0',
    removalVersion = '3.0.0'
  } = options;
  
  const message = `DEPRECATED: '${deprecatedName}' は非推奨です（v${version}から）。` +
                 `代わりに '${alternative}' を使用してください。` +
                 `この機能は v${removalVersion} で削除される予定です。`;
  
  // スタックトレースを取得して呼び出し元を特定
  const stack = new Error().stack
    .split('\n')
    .slice(2, 3) // 最初の2行は現在の関数とwarnDeprecation自体
    .join('\n');
  
  // 警告をログに記録
  logger.warn(message + `\n呼び出し元: ${stack}`);
  
  // エラーをスローするオプションが有効な場合
  if (throwError) {
    throw new Error(message);
  }
  
  return message;
};

module.exports = {
  warnDeprecation
};
