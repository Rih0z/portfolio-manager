/**
 * アンケートYAML統合フック
 * 
 * AIAdvisorのアンケート機能とYAMLシステムを統合するカスタムフック
 * アンケートデータのエクスポート/インポート機能を提供
 * 
 * 機能:
 * - アンケートデータのYAMLエクスポート
 * - YAMLからアンケートデータのインポート
 * - データ同期と状態管理
 * - エラーハンドリング
 * 
 * @author Claude Code
 * @since 2025-01-03
 */

import { useState, useCallback } from 'react';
import surveyYAMLService from '../services/surveyYAMLService';

/**
 * アンケートYAML統合フック
 * @param {Object} options - フックオプション
 * @returns {Object} アンケートYAML統合機能と状態
 */
export const useSurveyYAML = (options = {}) => {
  const {
    autoValidate = true,
    showNotifications = true
  } = options;

  // 状態管理
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastExportResult, setLastExportResult] = useState(null);
  const [lastImportResult, setLastImportResult] = useState(null);
  const [validationResult, setValidationResult] = useState(null);

  /**
   * アンケートデータをYAMLフォーマットでエクスポート
   * @param {Object} surveyData - AIAdvisorのアンケートデータ
   * @param {Object} exportOptions - エクスポートオプション
   * @returns {Promise<Object>} エクスポート結果
   */
  const exportSurveyToYAML = useCallback(async (surveyData, exportOptions = {}) => {
    setIsExporting(true);
    
    try {
      // データの検証
      if (autoValidate) {
        const validation = surveyYAMLService.validateSurveyData(surveyData);
        setValidationResult(validation);
        
        if (!validation.isValid) {
          const result = {
            success: false,
            errors: validation.errors,
            warnings: validation.warnings,
            completeness: validation.completeness
          };
          setLastExportResult(result);
          return result;
        }
      }

      // YAMLエクスポート
      const yamlString = surveyYAMLService.exportSurveyToYAML(surveyData);
      
      const result = {
        success: true,
        yaml: yamlString,
        metadata: {
          exportedAt: new Date().toISOString(),
          dataSource: 'ai_advisor_survey',
          completeness: validationResult?.completeness || 0,
          totalFields: Object.keys(surveyData).length
        },
        warnings: validationResult?.warnings || []
      };

      setLastExportResult(result);
      
      // ダウンロード機能
      if (exportOptions.autoDownload) {
        await downloadYAMLFile(yamlString, exportOptions.filename);
      }

      return result;

    } catch (error) {
      const errorResult = {
        success: false,
        error: error.message,
        errorType: error.name || 'ExportError'
      };
      
      setLastExportResult(errorResult);
      return errorResult;
    } finally {
      setIsExporting(false);
    }
  }, [autoValidate, validationResult]);

  /**
   * YAMLデータをアンケート形式にインポート
   * @param {string} yamlString - YAML文字列
   * @param {Object} importOptions - インポートオプション
   * @returns {Promise<Object>} インポート結果
   */
  const importYAMLToSurvey = useCallback(async (yamlString, importOptions = {}) => {
    setIsImporting(true);
    
    try {
      // YAMLインポート
      const surveyData = surveyYAMLService.importYAMLToSurvey(yamlString);
      
      // データの検証
      let validation = null;
      if (autoValidate) {
        validation = surveyYAMLService.validateSurveyData(surveyData);
        setValidationResult(validation);
      }

      const result = {
        success: true,
        surveyData,
        metadata: {
          importedAt: new Date().toISOString(),
          dataSource: 'yaml_import',
          originalDataType: 'user_profile',
          completeness: validation?.completeness || 0
        },
        validation,
        warnings: validation?.warnings || []
      };

      setLastImportResult(result);
      return result;

    } catch (error) {
      const errorResult = {
        success: false,
        error: error.message,
        errorType: error.name || 'ImportError',
        details: error.details || null
      };
      
      setLastImportResult(errorResult);
      return errorResult;
    } finally {
      setIsImporting(false);
    }
  }, [autoValidate]);

  /**
   * ファイルからYAMLを読み込んでインポート
   * @param {File} file - YAMLファイル
   * @param {Object} importOptions - インポートオプション
   * @returns {Promise<Object>} インポート結果
   */
  const importYAMLFromFile = useCallback(async (file, importOptions = {}) => {
    if (!file) {
      throw new Error('ファイルが選択されていません');
    }

    if (!file.name.toLowerCase().endsWith('.yml') && !file.name.toLowerCase().endsWith('.yaml')) {
      throw new Error('YAMLファイル (.yml または .yaml) を選択してください');
    }

    try {
      const fileContent = await readFileAsText(file);
      return await importYAMLToSurvey(fileContent, importOptions);
    } catch (error) {
      throw new Error(`ファイルの読み込みに失敗: ${error.message}`);
    }
  }, [importYAMLToSurvey]);

  /**
   * アンケートデータの検証のみ実行
   * @param {Object} surveyData - 検証対象のアンケートデータ
   * @returns {Object} 検証結果
   */
  const validateSurveyData = useCallback((surveyData) => {
    const validation = surveyYAMLService.validateSurveyData(surveyData);
    setValidationResult(validation);
    return validation;
  }, []);

  /**
   * YAMLプレビューを生成
   * @param {Object} surveyData - アンケートデータ
   * @param {number} maxLines - 最大行数
   * @returns {string} YAMLプレビュー
   */
  const generateYAMLPreview = useCallback((surveyData, maxLines = 20) => {
    try {
      const yamlString = surveyYAMLService.exportSurveyToYAML(surveyData);
      const lines = yamlString.split('\n');
      
      if (lines.length <= maxLines) {
        return yamlString;
      }
      
      return lines.slice(0, maxLines).join('\n') + '\n# ... (省略)';
    } catch (error) {
      return `# YAMLプレビューの生成に失敗\n# エラー: ${error.message}`;
    }
  }, []);

  /**
   * データの完成度情報を取得
   * @param {Object} surveyData - アンケートデータ
   * @returns {Object} 完成度情報
   */
  const getCompletenessInfo = useCallback((surveyData) => {
    const validation = surveyYAMLService.validateSurveyData(surveyData);
    
    return {
      completeness: validation.completeness,
      isValid: validation.isValid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
      status: validation.completeness >= 80 ? 'excellent' : 
              validation.completeness >= 60 ? 'good' : 
              validation.completeness >= 40 ? 'fair' : 'poor'
    };
  }, []);

  /**
   * 履歴をクリア
   */
  const clearHistory = useCallback(() => {
    setLastExportResult(null);
    setLastImportResult(null);
    setValidationResult(null);
  }, []);

  return {
    // 主要機能
    exportSurveyToYAML,
    importYAMLToSurvey,
    importYAMLFromFile,
    validateSurveyData,
    generateYAMLPreview,
    getCompletenessInfo,
    clearHistory,

    // 状態
    isExporting,
    isImporting,
    lastExportResult,
    lastImportResult,
    validationResult,

    // 便利な状態
    hasExportResult: Boolean(lastExportResult),
    hasImportResult: Boolean(lastImportResult),
    lastOperationSuccess: lastExportResult?.success || lastImportResult?.success,
    totalOperations: (lastExportResult ? 1 : 0) + (lastImportResult ? 1 : 0)
  };
};

/**
 * YAMLファイルをダウンロード
 * @param {string} yamlContent - YAML内容
 * @param {string} filename - ファイル名
 */
const downloadYAMLFile = async (yamlContent, filename = 'survey-data.yml') => {
  const blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * ファイルをテキストとして読み込み
 * @param {File} file - 読み込むファイル
 * @returns {Promise<string>} ファイル内容
 */
const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

export default useSurveyYAML;