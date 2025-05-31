/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/data/ImportOptions.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * 
 * 説明: 
 * ポートフォリオデータのインポート機能を提供するコンポーネント。
 * ファイル、クリップボード、テキスト入力の3種類のインポート方法をサポートし、
 * JSONとCSV形式のデータをインポート可能。Papa Parseライブラリを使用してCSVを解析する。
 */
import React, { useState, useCallback, useEffect } from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import Papa from 'papaparse';

const ImportOptions = () => {
  const portfolioContext = usePortfolioContext();
  
  // より安全な関数取得
  let importData;
  if (portfolioContext && typeof portfolioContext === 'object') {
    importData = portfolioContext.importData || 
                 portfolioContext.importPortfolioData || 
                 portfolioContext.import ||
                 null;
  }
  
  // デバッグ用
  useEffect(() => {
    if (portfolioContext) {
      console.log('PortfolioContext keys:', Object.keys(portfolioContext));
      console.log('importData found:', importData !== null);
      console.log('importData type:', typeof importData);
      
      // 全ての関数を列挙
      const functions = Object.entries(portfolioContext)
        .filter(([key, value]) => typeof value === 'function')
        .map(([key]) => key);
      console.log('Available functions:', functions);
    }
  }, [portfolioContext, importData]);
  
  const [importFormat, setImportFormat] = useState('json');
  const [importMethod, setImportMethod] = useState('file');
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // CSVデータを解析して構造化
  const parseCSV = useCallback((csvContent) => {
    // CSVの各セクションを分割
    const sections = csvContent.split(/^#\s*(.+)$/gm).filter(Boolean);
    let assetsData = [];
    let targetData = [];
    let configData = {};
    
    for (let i = 0; i < sections.length; i += 2) {
      const sectionName = sections[i].trim();
      const sectionContent = sections[i + 1]?.trim() || '';
      
      if (sectionContent) {
        const result = Papa.parse(sectionContent, { header: true, skipEmptyLines: true });
        
        if (sectionName.includes('保有資産')) {
          assetsData = result.data.map(asset => ({
            ...asset,
            price: parseFloat(asset.price),
            holdings: parseFloat(asset.holdings),
            annualFee: parseFloat(asset.annualFee || 0)
          }));
        } else if (sectionName.includes('目標配分')) {
          targetData = result.data.map(target => ({
            ...target,
            targetPercentage: parseFloat(target.targetPercentage)
          }));
        } else if (sectionName.includes('設定')) {
          // 設定を連想配列に変換
          result.data.forEach(row => {
            if (row.key && row.value) {
              configData[row.key] = row.value;
            }
          });
        }
      }
    }
    
    return {
      baseCurrency: configData.baseCurrency || 'JPY',
      exchangeRate: {
        rate: parseFloat(configData.exchangeRate || 1),
        source: configData.exchangeRateSource || '',
        lastUpdated: configData.lastUpdated || new Date().toISOString()
      },
      currentAssets: assetsData,
      targetPortfolio: targetData
    };
  }, []);

  // ファイルからのインポート
  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    setImportStatus(null);
    
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const content = event.target.result;
        
        let data;
        if (importFormat === 'json') {
          data = JSON.parse(content);
        } else {
          data = parseCSV(content);
        }
        
        if (!importData || typeof importData !== 'function') {
          console.error('Import function not available:', {
            importData,
            type: typeof importData,
            contextKeys: portfolioContext ? Object.keys(portfolioContext) : 'context is null'
          });
          throw new Error('インポート機能が利用できません。ページを再読み込みしてください。');
        }
        
        console.log('Calling importData with:', data);
        const result = await importData(data);
        console.log('Import result:', result);
        
        if (result && result.success) {
          setImportStatus({ type: 'success', message: result.message || 'データを正常にインポートしました' });
        } else {
          throw new Error(result?.message || 'インポートに失敗しました');
        }
      } catch (error) {
        console.error('インポートエラー:', error);
        setImportStatus({ type: 'error', message: `インポートに失敗しました: ${error.message}` });
      } finally {
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      setImportStatus({ type: 'error', message: 'ファイルの読み込みに失敗しました' });
      setIsLoading(false);
    };
    
    if (importFormat === 'json') {
      reader.readAsText(file);
    } else {
      reader.readAsText(file);
    }
  }, [importFormat, importData, parseCSV]);

  // クリップボードからのインポート
  const handlePaste = useCallback(async () => {
    try {
      setIsLoading(true);
      setImportStatus(null);
      
      const clipboardText = await navigator.clipboard.readText();
      
      if (!clipboardText) {
        throw new Error('クリップボードが空です');
      }
      
      let data;
      if (importFormat === 'json') {
        data = JSON.parse(clipboardText);
      } else {
        data = parseCSV(clipboardText);
      }
      
      if (typeof importData !== 'function') {
        throw new Error('インポート機能が利用できません。ページを再読み込みしてください。');
      }
      
      const result = await importData(data);
      if (result && result.success) {
        setImportStatus({ type: 'success', message: result.message || 'データを正常にインポートしました' });
      } else {
        throw new Error(result?.message || 'インポートに失敗しました');
      }
    } catch (error) {
      console.error('クリップボードインポートエラー:', error);
      setImportStatus({ type: 'error', message: `インポートに失敗しました: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  }, [importFormat, importData, parseCSV]);

  // テキスト入力からのインポート
  const handleTextImport = useCallback(async () => {
    if (!importText.trim()) {
      setImportStatus({ type: 'error', message: 'インポートするデータを入力してください' });
      return;
    }
    
    try {
      setIsLoading(true);
      setImportStatus(null);
      
      let data;
      if (importFormat === 'json') {
        data = JSON.parse(importText);
      } else {
        data = parseCSV(importText);
      }
      
      if (typeof importData !== 'function') {
        throw new Error('インポート機能が利用できません。ページを再読み込みしてください。');
      }
      
      const result = await importData(data);
      if (result && result.success) {
        setImportStatus({ type: 'success', message: result.message || 'データを正常にインポートしました' });
      } else {
        throw new Error(result?.message || 'インポートに失敗しました');
      }
      setImportText(''); // 入力フィールドをクリア
    } catch (error) {
      console.error('テキストインポートエラー:', error);
      setImportStatus({ type: 'error', message: `インポートに失敗しました: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  }, [importText, importFormat, importData, parseCSV]);

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h2 className="text-lg font-semibold mb-4">データインポート</h2>
      
      <div className="mb-4">
        <label id="import-format-label" className="block text-sm font-medium text-gray-700 mb-1">
          インポート形式
        </label>
        <div className="flex space-x-4" role="radiogroup" aria-labelledby="import-format-label">
          <button
            type="button"
            className={`px-4 py-2 rounded-md ${
              importFormat === 'json' ? 'bg-primary text-white' : 'bg-gray-200'
            }`}
            onClick={() => setImportFormat('json')}
            role="radio"
            aria-checked={importFormat === 'json'}
          >
            JSON
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-md ${
              importFormat === 'csv' ? 'bg-primary text-white' : 'bg-gray-200'
            }`}
            onClick={() => setImportFormat('csv')}
            role="radio"
            aria-checked={importFormat === 'csv'}
          >
            CSV
          </button>
        </div>
      </div>
      
      <div className="mb-4">
        <label id="import-method-label" className="block text-sm font-medium text-gray-700 mb-1">
          インポート方法
        </label>
        <div className="flex space-x-4" role="radiogroup" aria-labelledby="import-method-label">
          <button
            type="button"
            className={`px-4 py-2 rounded-md ${
              importMethod === 'file' ? 'bg-primary text-white' : 'bg-gray-200'
            }`}
            onClick={() => setImportMethod('file')}
            role="radio"
            aria-checked={importMethod === 'file'}
          >
            ファイル
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-md ${
              importMethod === 'clipboard' ? 'bg-primary text-white' : 'bg-gray-200'
            }`}
            onClick={() => setImportMethod('clipboard')}
            role="radio"
            aria-checked={importMethod === 'clipboard'}
          >
            クリップボード
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-md ${
              importMethod === 'text' ? 'bg-primary text-white' : 'bg-gray-200'
            }`}
            onClick={() => setImportMethod('text')}
            role="radio"
            aria-checked={importMethod === 'text'}
          >
            テキスト入力
          </button>
        </div>
      </div>
      
      {importMethod === 'file' && (
        <div className="mb-4">
          <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-1">
            ファイルをアップロード
          </label>
          <input
            id="file-upload"
            type="file"
            accept={importFormat === 'json' ? '.json' : '.csv'}
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-primary file:text-white
              hover:file:bg-primary-dark"
          />
        </div>
      )}
      
      {importMethod === 'clipboard' && (
        <div className="mb-4">
          <button
            type="button"
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark"
            onClick={handlePaste}
            disabled={isLoading}
          >
            {isLoading ? '処理中...' : 'クリップボードから貼り付け'}
          </button>
          <p className="text-sm text-gray-500 mt-1">
            クリップボードからのデータを読み込み、インポートします。
          </p>
        </div>
      )}
      
      {importMethod === 'text' && (
        <div className="mb-4">
          <label htmlFor="import-text" className="block text-sm font-medium text-gray-700 mb-1">
            データを貼り付け
          </label>
          <textarea
            id="import-text"
            className="w-full h-40 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={importFormat === 'json' ? '{"currentAssets": [...], "targetPortfolio": [...]}' : '# 保有資産\nid,name,ticker,...'}
          ></textarea>
          
          <button
            type="button"
            className="mt-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark"
            onClick={handleTextImport}
            disabled={isLoading || !importText.trim()}
          >
            {isLoading ? '処理中...' : 'インポート'}
          </button>
        </div>
      )}
      
      {importStatus && (
        <div
          className={`mt-4 p-2 rounded-md ${
            importStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {importStatus.message}
        </div>
      )}
    </div>
  );
};

export default ImportOptions;
