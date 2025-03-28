import React, { useState, useCallback } from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';

const ExportOptions = () => {
  const { currentAssets, targetPortfolio, baseCurrency, exchangeRate } = usePortfolioContext();
  const [exportFormat, setExportFormat] = useState('json');
  const [exportStatus, setExportStatus] = useState(null);

  // JSONへの変換
  const convertToJson = useCallback(() => {
    const portfolioData = {
      baseCurrency,
      exchangeRate,
      lastUpdated: new Date().toISOString(),
      currentAssets,
      targetPortfolio
    };
    
    return JSON.stringify(portfolioData, null, 2);
  }, [baseCurrency, exchangeRate, currentAssets, targetPortfolio]);

  // CSVへの変換
  const convertToCsv = useCallback(() => {
    // 保有資産のCSV
    const assetsHeader = 'id,name,ticker,exchangeMarket,price,currency,holdings,annualFee,lastUpdated,source';
    const assetsRows = currentAssets.map(asset => {
      return `${asset.id},"${asset.name}",${asset.ticker},${asset.exchangeMarket},${asset.price},${asset.currency},${asset.holdings},${asset.annualFee || 0},"${asset.lastUpdated || ''}","${asset.source || ''}"`;
    });
    
    // 目標配分のCSV
    const targetHeader = 'id,name,ticker,targetPercentage';
    const targetRows = targetPortfolio.map(target => {
      return `${target.id},"${target.name}",${target.ticker},${target.targetPercentage}`;
    });
    
    // 設定情報のCSV
    const configHeader = 'key,value';
    const configRows = [
      `baseCurrency,${baseCurrency}`,
      `exchangeRate,${exchangeRate?.rate || 1}`,
      `exchangeRateSource,"${exchangeRate?.source || ''}"`,
      `lastUpdated,"${exchangeRate?.lastUpdated || new Date().toISOString()}"`
    ];
    
    return `# 保有資産\n${assetsHeader}\n${assetsRows.join('\n')}\n\n# 目標配分\n${targetHeader}\n${targetRows.join('\n')}\n\n# 設定\n${configHeader}\n${configRows.join('\n')}`;
  }, [baseCurrency, exchangeRate, currentAssets, targetPortfolio]);

  // ファイルダウンロード
  const handleDownload = useCallback(() => {
    try {
      const data = exportFormat === 'json' ? convertToJson() : convertToCsv();
      const blob = new Blob([data], { type: exportFormat === 'json' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFormat === 'json' ? 'portfolio_data.json' : 'portfolio_data.csv';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setExportStatus({ type: 'success', message: `データを${exportFormat.toUpperCase()}形式でダウンロードしました` });
      
      // 3秒後にステータスをクリア
      setTimeout(() => setExportStatus(null), 3000);
    } catch (error) {
      console.error('エクスポートエラー:', error);
      setExportStatus({ type: 'error', message: 'エクスポートに失敗しました' });
    }
  }, [exportFormat, convertToJson, convertToCsv]);

  // クリップボードにコピー
  const handleCopy = useCallback(() => {
    try {
      const data = exportFormat === 'json' ? convertToJson() : convertToCsv();
      navigator.clipboard.writeText(data).then(
        () => {
          setExportStatus({ type: 'success', message: 'クリップボードにコピーしました' });
          // 3秒後にステータスをクリア
          setTimeout(() => setExportStatus(null), 3000);
        },
        (err) => {
          console.error('クリップボードコピーエラー:', err);
          setExportStatus({ type: 'error', message: 'クリップボードへのコピーに失敗しました' });
        }
      );
    } catch (error) {
      console.error('エクスポートエラー:', error);
      setExportStatus({ type: 'error', message: 'データの生成に失敗しました' });
    }
  }, [exportFormat, convertToJson, convertToCsv]);

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h2 className="text-lg font-semibold mb-4">データエクスポート</h2>
      
      <div className="mb-4">
        <label id="export-format-label" className="block text-sm font-medium text-gray-700 mb-1">
          エクスポート形式
        </label>
        <div className="flex space-x-4" role="radiogroup" aria-labelledby="export-format-label">
          <button
            type="button"
            className={`px-4 py-2 rounded-md ${
              exportFormat === 'json' ? 'bg-primary text-white' : 'bg-gray-200'
            }`}
            onClick={() => setExportFormat('json')}
            role="radio"
            aria-checked={exportFormat === 'json'}
          >
            JSON
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-md ${
              exportFormat === 'csv' ? 'bg-primary text-white' : 'bg-gray-200'
            }`}
            onClick={() => setExportFormat('csv')}
            role="radio"
            aria-checked={exportFormat === 'csv'}
          >
            CSV
          </button>
        </div>
      </div>
      
      <div className="flex space-x-4">
        <button
          type="button"
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark"
          onClick={handleDownload}
        >
          ダウンロード
        </button>
        <button
          type="button"
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
          onClick={handleCopy}
        >
          クリップボードにコピー
        </button>
      </div>
      
      {exportStatus && (
        <div
          className={`mt-4 p-2 rounded-md ${
            exportStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {exportStatus.message}
        </div>
      )}
    </div>
  );
};

export default ExportOptions;