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
import { Button } from '../ui/button';
import { FaUpload, FaCheckCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';

const AIDataImportModal = ({ isOpen, onClose, onImportSuccess }: any) => {
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-testid="ai-data-import-modal">
      <div className="bg-muted rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-border">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">YAML データ取り込み</h2>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-white transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              AI投資戦略のYAMLレスポンスを貼り付けてください
            </label>
            <textarea
              value={yamlInput}
              onChange={(e) => setYamlInput(e.target.value)}
              placeholder="assets:&#10;  - VTI: 40%&#10;  - VXUS: 30%&#10;  - BND: 20%&#10;  - VNQ: 10%"
              className="w-full h-64 p-4 bg-card border border-border rounded-lg text-white placeholder-secondary-500 font-mono text-sm focus:outline-none focus:border-primary-500"
            />
          </div>

          {processingResults && (
            <div className={`p-4 rounded-lg border ${
              processingResults.success
                ? 'bg-success-900/20 border-success-500/30'
                : 'bg-danger-900/20 border-danger-500/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {processingResults.success ? (
                  <FaCheckCircle className="w-5 h-5 text-success-400" />
                ) : (
                  <FaExclamationTriangle className="w-5 h-5 text-danger-400" />
                )}
                <span className={`font-medium ${
                  processingResults.success ? 'text-success-400' : 'text-danger-400'
                }`}>
                  {processingResults.message}
                </span>
              </div>
              {processingResults.details && (
                <p className="text-sm text-muted-foreground">{processingResults.details}</p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={processYAMLData}
              disabled={!yamlInput.trim() || isProcessing}
              loading={isProcessing}
              icon={!isProcessing ? <FaUpload className="w-4 h-4" /> : undefined}
            >
              {isProcessing ? '処理中...' : 'データを取り込む'}
            </Button>

            <Button
              variant="secondary"
              onClick={handleClose}
            >
              キャンセル
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIDataImportModal;