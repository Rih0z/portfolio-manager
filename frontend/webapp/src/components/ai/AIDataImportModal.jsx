/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/components/ai/AIDataImportModal.jsx
 * 
 * 作成者: Claude Code
 * 作成日: 2025-01-03
 * 
 * 説明:
 * AI投資戦略から返却されたYAMLデータをインポートするモーダル。
 * YAML処理とポートフォリオへの反映機能を含む。
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import ModernButton from '../common/ModernButton';
import { FaUpload, FaCheckCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';

const AIDataImportModal = ({ isOpen, onClose, onImportSuccess }) => {
  const { t } = useTranslation();
  const { updatePortfolioFromYAML } = usePortfolioContext();
  const [yamlInput, setYamlInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResults, setProcessingResults] = useState(null);

  if (!isOpen) return null;

  const processYAMLData = async () => {
    setIsProcessing(true);
    setProcessingResults(null);

    try {
      // YAML処理ロジック - 複数戦略でパース
      const processedData = await processYAMLWithStrategies(yamlInput);
      
      if (processedData.success) {
        await updatePortfolioFromYAML(processedData.data);
        setProcessingResults({
          success: true,
          message: 'YAMLデータの取り込みが完了しました',
          details: `${processedData.data.assets?.length || 0}件の資産が追加されました`
        });
        onImportSuccess?.(processedData.data);
      } else {
        throw new Error(processedData.error);
      }
    } catch (error) {
      setProcessingResults({
        success: false,
        message: 'YAML取り込み中にエラーが発生しました',
        details: error.message
      });
    }

    setIsProcessing(false);
  };

  const processYAMLWithStrategies = async (yamlText) => {
    // 戦略1: 標準YAML解析
    try {
      const data = parseStandardYAML(yamlText);
      return { success: true, data };
    } catch (e) {
      console.log('標準YAML解析失敗:', e.message);
    }

    // 戦略2: 説明文除去後解析
    try {
      const cleanedText = yamlText.replace(/^[^:]*?(?=\w+:)/gm, '');
      const data = parseStandardYAML(cleanedText);
      return { success: true, data };
    } catch (e) {
      console.log('説明文除去解析失敗:', e.message);
    }

    // 戦略3: JSON形式として解析
    try {
      const data = JSON.parse(yamlText);
      return { success: true, data: convertJSONToYAML(data) };
    } catch (e) {
      console.log('JSON解析失敗:', e.message);
    }

    // 戦略4: カスタム解析
    try {
      const data = parseCustomFormat(yamlText);
      return { success: true, data };
    } catch (e) {
      return { 
        success: false, 
        error: 'すべての解析戦略で失敗しました。YAML形式を確認してください。' 
      };
    }
  };

  const parseStandardYAML = (text) => {
    // 簡易YAML解析（実装はjs-yamlライブラリを想定）
    const lines = text.split('\n');
    const result = { assets: [], allocation: {} };
    
    let currentSection = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      if (trimmed.includes('assets:')) {
        currentSection = 'assets';
        continue;
      }
      
      if (currentSection === 'assets' && trimmed.startsWith('- ')) {
        const assetMatch = trimmed.match(/- (\w+): ([\d.]+)/);
        if (assetMatch) {
          result.assets.push({
            symbol: assetMatch[1],
            allocation: parseFloat(assetMatch[2])
          });
        }
      }
    }
    
    return result;
  };

  const parseCustomFormat = (text) => {
    // AI出力の多様な形式に対応したカスタム解析
    const result = { assets: [] };
    
    // ティッカーシンボル: 割合 の形式を検索
    const matches = text.match(/([A-Z]{1,5}):\s*([\d.]+)%?/g);
    if (matches) {
      matches.forEach(match => {
        const [symbol, percentage] = match.split(':');
        result.assets.push({
          symbol: symbol.trim(),
          allocation: parseFloat(percentage.trim().replace('%', ''))
        });
      });
    }
    
    return result;
  };

  const convertJSONToYAML = (jsonData) => {
    // JSON形式をYAML相当の構造に変換
    return {
      assets: jsonData.assets || jsonData.portfolio || [],
      allocation: jsonData.allocation || {}
    };
  };

  const handleClose = () => {
    setYamlInput('');
    setProcessingResults(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-300 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-dark-400">
        <div className="p-6 border-b border-dark-400 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">YAML データ取り込み</h2>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-dark-400 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              AI投資戦略のYAMLレスポンスを貼り付けてください
            </label>
            <textarea
              value={yamlInput}
              onChange={(e) => setYamlInput(e.target.value)}
              placeholder="assets:&#10;  - VTI: 40%&#10;  - VXUS: 30%&#10;  - BND: 20%&#10;  - VNQ: 10%"
              className="w-full h-64 p-4 bg-dark-200 border border-dark-400 rounded-lg text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:border-primary-500"
            />
          </div>

          {processingResults && (
            <div className={`p-4 rounded-lg border ${
              processingResults.success 
                ? 'bg-green-900/20 border-green-500/30' 
                : 'bg-red-900/20 border-red-500/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {processingResults.success ? (
                  <FaCheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <FaExclamationTriangle className="w-5 h-5 text-red-400" />
                )}
                <span className={`font-medium ${
                  processingResults.success ? 'text-green-400' : 'text-red-400'
                }`}>
                  {processingResults.message}
                </span>
              </div>
              {processingResults.details && (
                <p className="text-sm text-gray-300">{processingResults.details}</p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <ModernButton
              onClick={processYAMLData}
              disabled={!yamlInput.trim() || isProcessing}
              className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <FaUpload className="w-4 h-4" />
              )}
              {isProcessing ? '処理中...' : 'データを取り込む'}
            </ModernButton>
            
            <ModernButton
              onClick={handleClose}
              className="bg-gray-600 hover:bg-gray-700"
            >
              キャンセル
            </ModernButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIDataImportModal;