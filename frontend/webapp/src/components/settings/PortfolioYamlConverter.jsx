/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/components/settings/PortfolioYamlConverter.jsx
 * 
 * 作成者: Claude Code
 * 作成日: 2025-07-09
 * 
 * 説明:
 * ポートフォリオをYAML形式に変換するためのプロンプト生成と、
 * YAML結果を貼り付けて現在比率として登録する機能を提供するコンポーネント
 */

import React, { useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { PortfolioContext } from '../../context/PortfolioContext';
import ModernCard from '../common/ModernCard';
import ModernInput from '../common/ModernInput';
import DarkButton from '../common/DarkButton';
import portfolioPromptService from '../../services/PortfolioPromptService';
import { parseYAMLSafely } from '../../utils/yamlProcessor';
import { 
  FaFileCode, 
  FaCopy, 
  FaCheckCircle, 
  FaExclamationCircle,
  FaLightbulb,
  FaSync
} from 'react-icons/fa';

const PortfolioYamlConverter = () => {
  const { t, i18n } = useTranslation();
  const { 
    updateCurrentAssets,
    targetPortfolio,
    exchangeRate = 150
  } = useContext(PortfolioContext);
  
  const [yamlInput, setYamlInput] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  
  const isJapanese = i18n.language === 'ja';

  // YAMLとJSONを自動判定してパースする関数
  const parseDataWithAutoDetection = (inputData) => {
    if (!inputData || typeof inputData !== 'string') {
      throw new Error('Invalid input data');
    }

    const trimmedData = inputData.trim();
    
    // JSON形式を試行
    try {
      const jsonData = JSON.parse(trimmedData);
      return { data: jsonData, format: 'JSON' };
    } catch (jsonError) {
      // JSON失敗時、YAML形式を試行
      try {
        const yamlData = parseYAMLSafely(trimmedData);
        return { data: yamlData, format: 'YAML' };
      } catch (yamlError) {
        throw new Error(`データ形式を認識できません。JSON Error: ${jsonError.message}, YAML Error: ${yamlError.message}`);
      }
    }
  };

  // プロンプトを生成
  const generatePrompt = () => {
    const promptData = portfolioPromptService.getPortfolioYAMLPrompt(
      isJapanese,
      targetPortfolio,
      exchangeRate
    );
    return promptData.prompt;
  };

  // プロンプトをクリップボードにコピー
  const copyPromptToClipboard = async () => {
    try {
      const prompt = generatePrompt();
      await navigator.clipboard.writeText(prompt);
      alert(isJapanese ? 'プロンプトをクリップボードにコピーしました' : 'Prompt copied to clipboard');
    } catch (error) {
      console.error('コピー失敗:', error);
      alert(isJapanese ? 'コピーに失敗しました' : 'Failed to copy');
    }
  };

  // YAMLデータをインポート
  const handleYamlImport = () => {
    if (!yamlInput.trim()) return;

    setIsImporting(true);
    try {
      const parseResult = parseDataWithAutoDetection(yamlInput);
      const importedData = parseResult.data;
      
      // データ検証
      const validation = portfolioPromptService.validatePortfolioJSON(importedData);
      setValidationResult({
        ...validation,
        format: parseResult.format
      });
      
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      // ポートフォリオデータの構造を検証
      const portfolioData = importedData.portfolio || importedData;
      if (portfolioData.assets && Array.isArray(portfolioData.assets)) {
        // 現在の保有資産として設定
        const currentAssets = portfolioData.assets.map(asset => ({
          symbol: asset.ticker || asset.name,
          name: asset.name,
          shares: asset.quantity || 0,
          exchange: asset.market === 'Japan' || asset.currency === 'JPY' ? 'TSE' : 
                   asset.market === 'US' || asset.currency === 'USD' ? 'NYSE' : 'OTHER',
          averagePrice: asset.averagePrice || 0,
          currentPrice: asset.currentPrice || 0,
          type: asset.type || 'stock',
          sector: asset.sector || '',
          currency: asset.currency || 'JPY'
        }));
        
        updateCurrentAssets(currentAssets);
        
        setYamlInput('');
        alert(
          isJapanese 
            ? `${currentAssets.length}件の保有資産データをインポートしました` 
            : `Imported ${currentAssets.length} asset holdings`
        );
      } else {
        throw new Error('Invalid portfolio data format');
      }
    } catch (error) {
      console.error('YAMLインポートエラー:', error);
      alert(
        isJapanese 
          ? `インポートエラー: ${error.message}` 
          : `Import error: ${error.message}`
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <ModernCard className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <FaFileCode className="text-primary-400 text-xl" />
        <h2 className="text-xl font-semibold text-white">
          {isJapanese ? 'ポートフォリオYAML変換' : 'Portfolio YAML Converter'}
        </h2>
      </div>

      {/* プロンプト生成セクション */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-white mb-3">
          {isJapanese ? 'ステップ1: YAML変換プロンプトを生成' : 'Step 1: Generate YAML Conversion Prompt'}
        </h3>
        
        <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-primary-400 font-medium mb-2">
            <FaLightbulb />
            <span>
              {isJapanese 
                ? '現在の保有銘柄をYAML形式に変換するプロンプト' 
                : 'Prompt to convert current holdings to YAML format'
              }
            </span>
          </div>
          <p className="text-sm text-gray-300 mb-3">
            {isJapanese 
              ? 'このプロンプトをClaude（claude.ai）に送信して、あなたの保有銘柄情報をYAML形式に変換してもらいます。'
              : 'Send this prompt to Claude (claude.ai) to convert your holdings information to YAML format.'
            }
          </p>
          
          <div className="flex gap-2">
            <DarkButton
              onClick={() => setShowPrompt(!showPrompt)}
              variant="secondary"
              className="flex-1"
            >
              {showPrompt 
                ? (isJapanese ? 'プロンプトを隠す' : 'Hide Prompt')
                : (isJapanese ? 'プロンプトを表示' : 'Show Prompt')
              }
            </DarkButton>
            <DarkButton
              onClick={copyPromptToClipboard}
              className="flex items-center gap-2"
            >
              <FaCopy />
              {isJapanese ? 'コピー' : 'Copy'}
            </DarkButton>
          </div>
          
          {showPrompt && (
            <div className="mt-4 bg-dark-300 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                {generatePrompt()}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* YAML貼り付けセクション */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-white mb-3">
          {isJapanese ? 'ステップ2: YAML結果を貼り付けて登録' : 'Step 2: Paste YAML Result and Register'}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {isJapanese 
                ? 'ClaudeからのYAML結果を貼り付け' 
                : 'Paste YAML result from Claude'
              }
            </label>
            <textarea
              value={yamlInput}
              onChange={(e) => {
                setYamlInput(e.target.value);
                // リアルタイム検証
                if (e.target.value.trim()) {
                  try {
                    const parseResult = parseDataWithAutoDetection(e.target.value);
                    const validation = portfolioPromptService.validatePortfolioJSON(parseResult.data);
                    setValidationResult({
                      ...validation,
                      format: parseResult.format
                    });
                  } catch (error) {
                    setValidationResult({
                      isValid: false,
                      errors: [`データ解析エラー: ${error.message}`],
                      warnings: [],
                      format: 'Unknown'
                    });
                  }
                } else {
                  setValidationResult(null);
                }
              }}
              placeholder={isJapanese 
                ? 'ClaudeからのYAML形式のポートフォリオデータをここに貼り付けてください...\n\nportfolio:\n  baseCurrency: "JPY"\n  assets:\n    - name: "トヨタ自動車"\n      ticker: "7203.T"\n      quantity: 100\n      currentPrice: 2500'
                : 'Paste YAML portfolio data from Claude here...\n\nportfolio:\n  baseCurrency: "JPY"\n  assets:\n    - name: "Toyota Motor"\n      ticker: "7203.T"\n      quantity: 100\n      currentPrice: 2500'
              }
              className="w-full p-3 bg-dark-300 border border-dark-400 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
              rows={12}
            />
          </div>
          
          {yamlInput && validationResult && (
            <div className={`p-3 rounded-lg border ${
              validationResult.isValid 
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {validationResult.isValid ? (
                  <FaCheckCircle className="text-green-400" />
                ) : (
                  <FaExclamationCircle className="text-red-400" />
                )}
                <span className={`font-medium ${
                  validationResult.isValid ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isJapanese ? 
                    (validationResult.isValid ? `データ検証成功 (${validationResult.format || 'YAML'}形式)` : 'データ検証エラー') :
                    (validationResult.isValid ? `Data Validation Successful (${validationResult.format || 'YAML'} format)` : 'Data Validation Error')
                  }
                </span>
              </div>
              
              {!validationResult.isValid && (
                <div className="text-sm text-red-300">
                  {validationResult.errors.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {yamlInput && (
            <DarkButton
              onClick={handleYamlImport}
              disabled={isImporting || !validationResult?.isValid}
              className="w-full flex items-center justify-center gap-2"
            >
              <FaSync className={isImporting ? 'animate-spin' : ''} />
              {isImporting 
                ? (isJapanese ? '登録中...' : 'Registering...')
                : (isJapanese ? '現在の保有資産として登録' : 'Register as Current Holdings')
              }
            </DarkButton>
          )}
        </div>
      </div>

      {/* ヘルプセクション */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-center gap-2 text-blue-400 font-medium mb-2">
          <FaLightbulb />
          <h4>{isJapanese ? '使い方' : 'How to Use'}</h4>
        </div>
        <div className="space-y-2 text-sm text-gray-300">
          <div>
            1. {isJapanese 
              ? '「プロンプトを表示」をクリックして変換プロンプトを確認'
              : 'Click "Show Prompt" to view the conversion prompt'
            }
          </div>
          <div>
            2. {isJapanese 
              ? 'プロンプトをコピーしてClaude（claude.ai）に送信'
              : 'Copy the prompt and send it to Claude (claude.ai)'
            }
          </div>
          <div>
            3. {isJapanese 
              ? 'あなたの保有銘柄情報をClaudeに伝える'
              : 'Provide your holdings information to Claude'
            }
          </div>
          <div>
            4. {isJapanese 
              ? 'ClaudeからのYAML結果をコピーして貼り付け'
              : 'Copy and paste the YAML result from Claude'
            }
          </div>
          <div>
            5. {isJapanese 
              ? '「現在の保有資産として登録」をクリック'
              : 'Click "Register as Current Holdings"'
            }
          </div>
        </div>
      </div>
    </ModernCard>
  );
};

export default PortfolioYamlConverter;