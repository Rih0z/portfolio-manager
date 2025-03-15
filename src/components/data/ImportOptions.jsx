import React, { useState, useRef } from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import Papa from 'papaparse';

const ImportOptions = () => {
  const { importData } = usePortfolioContext();
  const [importFormat, setImportFormat] = useState('json');
  const [importMethod, setImportMethod] = useState('file');
  const [inputText, setInputText] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState(''); // 'success' or 'error'
  const fileInputRef = useRef(null);

  // ファイルからのインポート
  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        processImportData(content);
      } catch (error) {
        console.error('File import error:', error);
        showStatus('ファイルの読み込み中にエラーが発生しました', 'error');
      }
    };
    
    reader.onerror = () => {
      showStatus('ファイルの読み込みに失敗しました', 'error');
    };
    
    if (importFormat === 'json') {
      reader.readAsText(file);
    } else if (importFormat === 'csv') {
      reader.readAsText(file);
    }
  };

  // クリップボードからのインポート
  const handlePasteFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      processImportData(clipboardText);
    } catch (error) {
      console.error('Clipboard import error:', error);
      showStatus('クリップボードからの読み込みに失敗しました', 'error');
    }
  };

  // テキスト入力からのインポート
  const handleTextImport = () => {
    if (!inputText.trim()) {
      showStatus('テキストが入力されていません', 'error');
      return;
    }
    
    processImportData(inputText);
  };

  // インポートデータの処理
  const processImportData = (content) => {
    try {
      let parsedData;
      
      if (importFormat === 'json') {
        parsedData = JSON.parse(content);
      } else if (importFormat === 'csv') {
        // CSVからJSONへの変換（簡易的な実装）
        const results = Papa.parse(content, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        });
        
        if (results.errors.length > 0) {
          throw new Error('CSV parsing error: ' + results.errors[0].message);
        }
        
        // 変換されたデータを構造化
        const currentAssets = [];
        const targetPortfolio = [];
        
        results.data.forEach(row => {
          if (row.ticker) {
            // 資産データの作成
            const asset = {
              id: row.id || row.ticker,
              name: row.name || row.ticker,
              ticker: row.ticker,
              price: parseFloat(row.price) || 0,
              holdings: parseInt(row.holdings) || 0,
              currency: row.currency || 'JPY',
              annualFee: parseFloat(row.annualFee) || 0.3
            };
            
            currentAssets.push(asset);
            
            // 目標配分の作成
            const targetPercentage = parseFloat(row.targetPercentage) || 0;
            targetPortfolio.push({
              ...asset,
              targetPercentage
            });
          }
        });
        
        parsedData = {
          baseCurrency: 'JPY',
          currentAssets,
          targetPortfolio
        };
      }
      
      const result = importData(parsedData);
      
      if (result.success) {
        showStatus('データを正常にインポートしました', 'success');
        setInputText('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        showStatus(result.message || 'インポートに失敗しました', 'error');
      }
      
    } catch (error) {
      console.error('Data processing error:', error);
      showStatus('データの処理中にエラーが発生しました', 'error');
    }
  };

  // ステータスメッセージの表示
  const showStatus = (message, type) => {
    setStatusMessage(message);
    setStatusType(type);
    setTimeout(() => {
      setStatusMessage('');
      setStatusType('');
    }, 5000);
  };

  return (
    <div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          インポート形式
        </label>
        <div className="flex space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio"
              name="importFormat"
              value="json"
              checked={importFormat === 'json'}
              onChange={() => setImportFormat('json')}
            />
            <span className="ml-2">JSON</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio"
              name="importFormat"
              value="csv"
              checked={importFormat === 'csv'}
              onChange={() => setImportFormat('csv')}
            />
            <span className="ml-2">CSV</span>
          </label>
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          インポート方法
        </label>
        <div className="flex space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio"
              name="importMethod"
              value="file"
              checked={importMethod === 'file'}
              onChange={() => setImportMethod('file')}
            />
            <span className="ml-2">ファイル</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio"
              name="importMethod"
              value="clipboard"
              checked={importMethod === 'clipboard'}
              onChange={() => setImportMethod('clipboard')}
            />
            <span className="ml-2">クリップボード</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio"
              name="importMethod"
              value="text"
              checked={importMethod === 'text'}
              onChange={() => setImportMethod('text')}
            />
            <span className="ml-2">テキスト入力</span>
          </label>
        </div>
      </div>
      
      {/* インポート方法に応じたUIの表示 */}
      <div className="mb-4">
        {importMethod === 'file' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ファイルを選択
            </label>
            <input
              type="file"
              accept={importFormat === 'json' ? '.json' : '.csv'}
              onChange={handleFileImport}
              ref={fileInputRef}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        )}
        
        {importMethod === 'clipboard' && (
          <div>
            <button
              onClick={handlePasteFromClipboard}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              クリップボードから貼り付け
            </button>
          </div>
        )}
        
        {importMethod === 'text' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              データを入力
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full h-32 p-2 border rounded"
              placeholder={`${importFormat === 'json' ? 'JSONデータ' : 'CSVデータ'}を入力してください`}
            ></textarea>
            <button
              onClick={handleTextImport}
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              インポート
            </button>
          </div>
        )}
      </div>
      
      {/* ステータスメッセージの表示 */}
      {statusMessage && (
        <div className={`mt-3 text-sm ${
          statusType === 'success' ? 'text-green-600' : 'text-red-600'
        }`}>
          {statusMessage}
        </div>
      )}
    </div>
  );
};

export default ImportOptions;