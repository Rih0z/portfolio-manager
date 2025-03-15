import React, { useState } from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';

const ExportOptions = () => {
  const { exportData } = usePortfolioContext();
  const [exportFormat, setExportFormat] = useState('json');
  const [exportMessage, setExportMessage] = useState('');

  // データをエクスポートする関数
  const handleExport = () => {
    try {
      // ポートフォリオデータの取得
      const data = exportData();
      
      // 形式に応じてフォーマット
      let formattedData;
      let fileName;
      let mimeType;
      
      if (exportFormat === 'json') {
        formattedData = JSON.stringify(data, null, 2);
        fileName = 'portfolio-data.json';
        mimeType = 'application/json';
      } else if (exportFormat === 'csv') {
        // 簡易的なCSV変換（実際にはより堅牢な実装が必要）
        const headers = ['id', 'name', 'ticker', 'holdings', 'price', 'currency', 'targetPercentage'];
        const rows = [headers];
        
        // 各資産のデータを行として追加
        data.currentAssets.forEach(asset => {
          const targetItem = data.targetPortfolio.find(item => item.id === asset.id);
          const targetPercentage = targetItem ? targetItem.targetPercentage : 0;
          
          rows.push([
            asset.id,
            asset.name,
            asset.ticker,
            asset.holdings,
            asset.price,
            asset.currency,
            targetPercentage
          ]);
        });
        
        // 行をCSV形式に変換
        formattedData = rows.map(row => row.join(',')).join('\n');
        fileName = 'portfolio-data.csv';
        mimeType = 'text/csv';
      }
      
      // ファイルのダウンロード
      const blob = new Blob([formattedData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setExportMessage('データを正常にエクスポートしました');
      setTimeout(() => setExportMessage(''), 3000);
      
    } catch (error) {
      console.error('Export error:', error);
      setExportMessage('エクスポート中にエラーが発生しました');
      setTimeout(() => setExportMessage(''), 3000);
    }
  };

  // クリップボードにコピーする関数
  const handleCopyToClipboard = () => {
    try {
      const data = exportData();
      const formattedData = JSON.stringify(data, null, 2);
      
      navigator.clipboard.writeText(formattedData).then(
        () => {
          setExportMessage('データをクリップボードにコピーしました');
          setTimeout(() => setExportMessage(''), 3000);
        },
        (err) => {
          console.error('クリップボードへのコピーに失敗しました', err);
          setExportMessage('クリップボードへのコピーに失敗しました');
          setTimeout(() => setExportMessage(''), 3000);
        }
      );
    } catch (error) {
      console.error('Copy to clipboard error:', error);
      setExportMessage('データのコピー中にエラーが発生しました');
      setTimeout(() => setExportMessage(''), 3000);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          エクスポート形式
        </label>
        <div className="flex space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio"
              name="exportFormat"
              value="json"
              checked={exportFormat === 'json'}
              onChange={() => setExportFormat('json')}
            />
            <span className="ml-2">JSON</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio"
              name="exportFormat"
              value="csv"
              checked={exportFormat === 'csv'}
              onChange={() => setExportFormat('csv')}
            />
            <span className="ml-2">CSV</span>
          </label>
        </div>
      </div>
      
      <div className="flex space-x-4">
        <button
          onClick={handleExport}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          ファイルとしてエクスポート
        </button>
        <button
          onClick={handleCopyToClipboard}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
          クリップボードにコピー
        </button>
      </div>
      
      {exportMessage && (
        <div className="mt-3 text-sm text-green-600">
          {exportMessage}
        </div>
      )}
    </div>
  );
};

export default ExportOptions;