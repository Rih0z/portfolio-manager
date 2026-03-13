/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/data/ExportOptions.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * 
 * 説明: 
 * ポートフォリオデータのエクスポート機能を提供するコンポーネント。
 * JSON形式またはCSV形式でデータをエクスポートし、ファイルダウンロードまたは
 * クリップボードへのコピーが可能。エクスポート状態の視覚的フィードバックも提供する。
 */

import React, { useState, useCallback } from 'react';
import { FileDown, FileText, Lock, RotateCw } from 'lucide-react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { useCanUseFeature, useIsPremium } from '../../hooks/queries/useSubscription';
import { calculatePortfolioPnL } from '../../utils/plCalculation';
import { calculatePortfolioScore } from '../../utils/portfolioScore';
import UpgradePrompt from '../common/UpgradePrompt';
import logger from '../../utils/logger';
import type { CurrentAsset, TargetAllocation } from '../../types/portfolio.types';

interface ExportStatus {
  type: 'success' | 'error';
  message: string;
}

const ExportOptions = () => {
  const { currentAssets, targetPortfolio, baseCurrency, exchangeRate } = usePortfolioContext();
  const canExportPDF = useCanUseFeature('pdfExport');
  const isPremium = useIsPremium();

  const [exportFormat, setExportFormat] = useState('json');
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

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
    const assetsRows = (currentAssets as CurrentAsset[]).map((asset: CurrentAsset) => {
      return `${asset.id},"${asset.name}",${asset.ticker},${'exchangeMarket' in asset ? (asset as Record<string, unknown>)['exchangeMarket'] : ''},${asset.price},${asset.currency},${asset.holdings},${asset.annualFee || 0},"${asset.lastUpdated || ''}","${asset.source || ''}"`;
    });

    // 目標配分のCSV
    const targetHeader = 'id,name,ticker,targetPercentage';
    const targetRows = (targetPortfolio as TargetAllocation[]).map((target: TargetAllocation) => {
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
  // 現代的なファイルダウンロード関数（手動DOM操作を排除）
  const downloadFile = useCallback(async (data: string, filename: string, mimeType: string) => {
    try {
      // File System Access APIが利用可能かチェック
      if ('showSaveFilePicker' in window) {
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: mimeType.includes('json') ? 'JSON files' : 'CSV files',
            accept: {
              [mimeType]: [mimeType.includes('json') ? '.json' : '.csv']
            }
          }]
        });
        
        const writable = await fileHandle.createWritable();
        await writable.write(data);
        await writable.close();
        
        return { success: true };
      } else {
        // フォールバック: Blob URL（手動DOM操作を最小化）
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        // 一時的なリンクを作成（DOM操作を最小化）
        const link = Object.assign(document.createElement('a'), {
          href: url,
          download: filename,
          style: 'display: none'
        });
        
        document.body.appendChild(link);
        link.click();
        
        // クリーンアップ
        setTimeout(() => {
          URL.revokeObjectURL(url);
          document.body.removeChild(link);
        }, 100);
        
        return { success: true };
      }
    } catch (error) {
      logger.error('ファイルダウンロードエラー:', error);
      throw error;
    }
  }, []);

  // PDF エクスポート（Standard 専用 — jsPDF lazy import）
  const handlePdfExport = useCallback(async () => {
    if (!canExportPDF) return;

    setIsPdfGenerating(true);
    setExportStatus(null);

    try {
      const rate = exchangeRate?.rate || 150;

      // PnL 計算
      const pnl = calculatePortfolioPnL(
        currentAssets as CurrentAsset[],
        {}, // priceHistories — PDF では前日比不要
        baseCurrency,
        rate
      );

      // スコア計算
      const score = calculatePortfolioScore(
        currentAssets as CurrentAsset[],
        targetPortfolio as TargetAllocation[],
        isPremium,
        baseCurrency,
        rate
      );

      // lazy import PDF generator
      const { generatePortfolioPDF } = await import('../../utils/pdfExport');

      const blob = await generatePortfolioPDF({
        pnl,
        score,
        baseCurrency,
        exchangeRate: rate,
      });

      // ダウンロード
      const url = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement('a'), {
        href: url,
        download: `portfolio_report_${new Date().toISOString().slice(0, 10)}.pdf`,
        style: 'display: none',
      });
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }, 100);

      setExportStatus({ type: 'success', message: 'PDF レポートをダウンロードしました' });
      setTimeout(() => setExportStatus(null), 3000);
    } catch (error) {
      logger.error('PDF エクスポートエラー:', error);
      setExportStatus({ type: 'error', message: 'PDF の生成に失敗しました' });
    } finally {
      setIsPdfGenerating(false);
    }
  }, [canExportPDF, currentAssets, targetPortfolio, baseCurrency, exchangeRate, isPremium]);

  const handleDownload = useCallback(async () => {
    try {
      const data = exportFormat === 'json' ? convertToJson() : convertToCsv();
      const mimeType = exportFormat === 'json' ? 'application/json' : 'text/csv';
      const filename = `portfolio_data.${exportFormat}`;
      
      await downloadFile(data, filename, mimeType);
      
      setExportStatus({ type: 'success', message: `データを${exportFormat.toUpperCase()}形式でダウンロードしました` });
      
      // 3秒後にステータスをクリア
      setTimeout(() => setExportStatus(null), 3000);
    } catch (error) {
      logger.error('エクスポートエラー:', error);
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
          logger.error('クリップボードコピーエラー:', err);
          setExportStatus({ type: 'error', message: 'クリップボードへのコピーに失敗しました' });
        }
      );
    } catch (error) {
      logger.error('エクスポートエラー:', error);
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
      
      {/* PDF エクスポート（Standard 専用） */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
          <FileText className="h-4 w-4" />
          PDF レポート
        </h3>
        {canExportPDF ? (
          <button
            type="button"
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handlePdfExport}
            disabled={isPdfGenerating}
            data-testid="pdf-export-button"
          >
            <FileDown className="h-4 w-4" />
            {isPdfGenerating ? 'PDF 生成中...' : 'PDF でエクスポート'}
          </button>
        ) : (
          <div>
            {/* PDF プレビュー（Curiosity Gap — P3 転換トリガー） */}
            <div className="mb-3 p-3 rounded-md bg-gray-50 border border-gray-200 relative overflow-hidden" data-testid="pdf-preview">
              <div className="blur-[2px] select-none pointer-events-none" aria-hidden="true">
                <p className="text-xs text-gray-500 font-mono">PortfolioWise</p>
                <p className="text-[10px] text-gray-400">ポートフォリオレポート</p>
                <div className="mt-1 h-2 bg-gray-200 rounded w-3/4" />
                <div className="mt-1 h-2 bg-gray-200 rounded w-1/2" />
                <div className="mt-1 h-2 bg-gray-200 rounded w-2/3" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-white/90 px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 shadow-sm flex items-center gap-1.5">
                  <Lock className="h-3 w-3" />
                  Standard プランで利用可能
                </span>
              </div>
            </div>
            <button
              type="button"
              className="bg-gray-200 text-gray-400 px-4 py-2 rounded-md flex items-center gap-2 cursor-not-allowed"
              disabled
              data-testid="pdf-export-locked"
            >
              <Lock className="h-4 w-4" />
              PDF でエクスポート
            </button>
            <UpgradePrompt feature="PDF エクスポート" variant="inline" />
          </div>
        )}
      </div>

      {exportStatus && (
        <div
          className={`mt-4 p-2 rounded-md flex items-center justify-between ${
            exportStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
          role="status"
        >
          <span>{exportStatus.message}</span>
          {exportStatus.type === 'error' && (
            <button
              type="button"
              className="ml-2 flex items-center gap-1 text-sm underline hover:no-underline"
              onClick={handlePdfExport}
              data-testid="pdf-retry-button"
            >
              <RotateCw className="h-3 w-3" />
              再試行
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ExportOptions;
