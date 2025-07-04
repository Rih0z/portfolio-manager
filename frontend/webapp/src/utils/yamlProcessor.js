/**
 * YAML処理の基盤モジュール
 * エンタープライズレベルのYAML処理とバリデーション機能を提供
 */

import yaml from 'js-yaml';

/**
 * YAML処理エラーのカスタムエラークラス
 */
export class YAMLProcessingError extends Error {
  constructor(message, type = 'UNKNOWN', details = null) {
    super(message);
    this.name = 'YAMLProcessingError';
    this.type = type;
    this.details = details;
  }
}

/**
 * YAML文字列を安全にパースする
 * @param {string} yamlString - パースするYAML文字列
 * @returns {Object} パースされたオブジェクト
 * @throws {YAMLProcessingError} パースエラー時
 */
export const parseYAMLSafely = (yamlString) => {
  if (!yamlString || typeof yamlString !== 'string') {
    throw new YAMLProcessingError(
      'YAML文字列が無効です',
      'INVALID_INPUT',
      { input: yamlString }
    );
  }

  try {
    const parsed = yaml.load(yamlString, {
      // セキュリティ設定
      schema: yaml.SAFE_SCHEMA, // 安全なスキーマのみ使用
      onWarning: (warning) => {
        console.warn('YAML parsing warning:', warning);
      }
    });

    if (!parsed || typeof parsed !== 'object') {
      throw new YAMLProcessingError(
        'YAMLの内容が空またはオブジェクトではありません',
        'INVALID_STRUCTURE'
      );
    }

    return parsed;
  } catch (error) {
    if (error instanceof YAMLProcessingError) {
      throw error;
    }

    // js-yamlのエラーを適切にラップ
    throw new YAMLProcessingError(
      `YAML解析エラー: ${error.message}`,
      'PARSE_ERROR',
      {
        originalError: error,
        line: error.mark?.line,
        column: error.mark?.column
      }
    );
  }
};

/**
 * オブジェクトをYAML文字列に変換する
 * @param {Object} data - 変換するオブジェクト
 * @returns {string} YAML文字列
 * @throws {YAMLProcessingError} 変換エラー時
 */
export const stringifyToYAML = (data) => {
  if (!data || typeof data !== 'object') {
    throw new YAMLProcessingError(
      'データが無効です',
      'INVALID_DATA',
      { data }
    );
  }

  try {
    return yaml.dump(data, {
      // 出力設定
      indent: 2,
      lineWidth: 120,
      noRefs: true, // 参照を使用しない
      sortKeys: false, // キーの順序を保持
      quotingType: '"', // ダブルクォートを使用
      forceQuotes: false
    });
  } catch (error) {
    throw new YAMLProcessingError(
      `YAML変換エラー: ${error.message}`,
      'STRINGIFY_ERROR',
      { originalError: error, data }
    );
  }
};

/**
 * YAMLデータのタイプを検出する
 * @param {Object} parsedData - パース済みYAMLデータ
 * @returns {string} データタイプ
 */
export const detectYAMLDataType = (parsedData) => {
  if (!parsedData || typeof parsedData !== 'object') {
    return 'unknown';
  }

  // 複合データの検出（最初にチェック）
  const hasMultipleTypes = [
    parsedData.portfolio_data,
    parsedData.user_profile,
    parsedData.app_config,
    parsedData.allocation_templates
  ].filter(Boolean).length > 1;

  if (hasMultipleTypes) {
    return 'composite';
  }

  // ポートフォリオデータの検出
  if (parsedData.portfolio_data) {
    return 'portfolio';
  }

  // ユーザープロファイルの検出
  if (parsedData.user_profile) {
    return 'user_profile';
  }

  // アプリ設定の検出
  if (parsedData.app_config) {
    return 'app_config';
  }

  // 配分テンプレートの検出
  if (parsedData.allocation_templates) {
    return 'allocation_templates';
  }

  return 'unknown';
};

/**
 * YAML処理のメタデータを生成する
 * @param {string} yamlString - 元のYAML文字列
 * @param {Object} parsedData - パース済みデータ
 * @returns {Object} メタデータ
 */
export const generateYAMLMetadata = (yamlString, parsedData) => {
  const dataType = detectYAMLDataType(parsedData);
  const lineCount = yamlString.split('\n').length;
  const sizeInBytes = new TextEncoder().encode(yamlString).length;

  return {
    dataType,
    lineCount,
    sizeInBytes,
    sizeInKB: Math.round(sizeInBytes / 1024 * 100) / 100,
    processedAt: new Date().toISOString(),
    hasValidStructure: dataType !== 'unknown'
  };
};

/**
 * YAMLデータの基本的な健全性チェック
 * @param {Object} parsedData - パース済みYAMLデータ
 * @returns {Object} チェック結果
 */
export const performBasicYAMLHealthCheck = (parsedData) => {
  const issues = [];
  const warnings = [];

  // null/undefined値の検出
  const checkForNullValues = (obj, path = '') => {
    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (value === null) {
        warnings.push(`null値が検出されました: ${currentPath}`);
      } else if (value === undefined) {
        warnings.push(`undefined値が検出されました: ${currentPath}`);
      } else if (typeof value === 'object' && value !== null) {
        checkForNullValues(value, currentPath);
      }
    });
  };

  try {
    checkForNullValues(parsedData);

    // 循環参照の検出
    try {
      JSON.stringify(parsedData);
    } catch (error) {
      if (error.message.includes('circular')) {
        issues.push('循環参照が検出されました');
      }
    }

    // 非常に深いネストの検出
    const checkDepth = (obj, depth = 0) => {
      if (depth > 10) {
        warnings.push(`非常に深いネスト（${depth}層）が検出されました`);
        return depth;
      }

      if (typeof obj === 'object' && obj !== null) {
        return Math.max(...Object.values(obj).map(value => 
          checkDepth(value, depth + 1)
        ));
      }

      return depth;
    };

    const maxDepth = checkDepth(parsedData);

    return {
      isHealthy: issues.length === 0,
      issues,
      warnings,
      metadata: {
        maxNestingDepth: maxDepth,
        totalKeys: countTotalKeys(parsedData),
        estimatedComplexity: calculateComplexity(parsedData)
      }
    };
  } catch (error) {
    return {
      isHealthy: false,
      issues: [`健全性チェック中にエラーが発生: ${error.message}`],
      warnings: [],
      metadata: null
    };
  }
};

/**
 * オブジェクト内の総キー数をカウント
 * @param {Object} obj - カウント対象のオブジェクト
 * @returns {number} 総キー数
 */
const countTotalKeys = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return 0;
  }

  let count = Object.keys(obj).length;
  Object.values(obj).forEach(value => {
    count += countTotalKeys(value);
  });

  return count;
};

/**
 * データの複雑さを計算（ヒューリスティック）
 * @param {Object} obj - 計算対象のオブジェクト
 * @returns {string} 複雑さレベル
 */
const calculateComplexity = (obj) => {
  const totalKeys = countTotalKeys(obj);
  const stringifiedSize = JSON.stringify(obj).length;

  if (totalKeys < 20 && stringifiedSize < 1000) {
    return 'simple';
  } else if (totalKeys < 100 && stringifiedSize < 10000) {
    return 'moderate';
  } else {
    return 'complex';
  }
};

/**
 * YAML処理のユーティリティ関数をまとめたオブジェクト
 */
export const YAMLUtils = {
  parse: parseYAMLSafely,
  stringify: stringifyToYAML,
  detectType: detectYAMLDataType,
  generateMetadata: generateYAMLMetadata,
  healthCheck: performBasicYAMLHealthCheck
};

export default YAMLUtils;