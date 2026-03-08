/**
 * ポートフォリオデータのインポート機能コンポーネント
 *
 * JSON / PfWise CSV / 証券会社CSV（SBI・楽天・汎用）をサポート。
 * Shift-JIS 自動検出・デコード対応。
 *
 * @file src/components/data/ImportOptions.tsx
 */
import React, { useState, useCallback } from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import Papa from 'papaparse';
import {
  type BrokerFormat,
  decodeCSVBuffer,
  detectBrokerFormat,
  parseBrokerCSV,
} from '../../utils/csvParsers';
import { getErrorMessage } from '../../utils/errorUtils';

type ImportFormat = 'json' | 'csv' | 'broker-csv';

const BROKER_LABELS: Record<BrokerFormat, string> = {
  sbi: 'SBI証券',
  rakuten: '楽天証券',
  generic: '汎用CSV',
  pfwise: 'PfWise形式',
};

const ImportOptions = () => {
  const { importData } = usePortfolioContext();

  const [importFormat, setImportFormat] = useState<ImportFormat>('json');
  const [brokerFormat, setBrokerFormat] = useState<BrokerFormat | 'auto'>('auto');
  const [importMethod, setImportMethod] = useState<'file' | 'clipboard' | 'text'>('file');
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<{ type: string; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [detectedBroker, setDetectedBroker] = useState<BrokerFormat | null>(null);

  // PfWise独自CSV解析（既存ロジック維持）
  const parsePfWiseCSV = useCallback((csvContent: string) => {
    const sections = csvContent.split(/^#\s*(.+)$/gm).filter(Boolean);
    let assetsData: any[] = [];
    let targetData: any[] = [];
    let configData: Record<string, any> = {};

    for (let i = 0; i < sections.length; i += 2) {
      const sectionName = sections[i].trim();
      const sectionContent = sections[i + 1]?.trim() || '';

      if (sectionContent) {
        const result = Papa.parse(sectionContent, { header: true, skipEmptyLines: true });

        if (sectionName.includes('保有資産')) {
          assetsData = result.data.map((asset: any) => ({
            ...asset,
            price: parseFloat(asset.price),
            holdings: parseFloat(asset.holdings),
            annualFee: parseFloat(asset.annualFee || 0),
          }));
        } else if (sectionName.includes('目標配分')) {
          targetData = result.data.map((target: any) => ({
            ...target,
            targetPercentage: parseFloat(target.targetPercentage),
          }));
        } else if (sectionName.includes('設定')) {
          result.data.forEach((row: any) => {
            if (row.key && row.value) configData[row.key] = row.value;
          });
        }
      }
    }

    return {
      baseCurrency: configData.baseCurrency || 'JPY',
      exchangeRate: {
        rate: parseFloat(configData.exchangeRate || 1),
        source: configData.exchangeRateSource || '',
        lastUpdated: configData.lastUpdated || new Date().toISOString(),
      },
      currentAssets: assetsData,
      targetPortfolio: targetData,
    };
  }, []);

  // データの正規化（共通処理）
  const normalizeData = (data: any) => ({
    ...data,
    additionalBudget: data.additionalBudget || { amount: 0, currency: 'JPY' },
    currentAssets:
      data.currentAssets?.map((asset: any) => ({
        ...asset,
        ticker: asset.ticker || asset.id,
        id: asset.id || asset.ticker,
      })) || [],
    targetPortfolio:
      data.targetPortfolio?.map((target: any) => ({
        ...target,
        ticker: target.ticker || target.id,
        id: target.id || target.ticker,
      })) || [],
  });

  // CSV文字列からパース（形式判定含む）
  const processCSVContent = useCallback(
    (content: string) => {
      if (importFormat === 'csv') {
        // PfWise独自CSVフォーマット
        return parsePfWiseCSV(content);
      }

      // 証券会社CSVフォーマット
      const format = brokerFormat === 'auto' ? undefined : brokerFormat;
      const result = parseBrokerCSV(content, format);

      // PfWise形式が検出された場合は既存パーサーにフォールバック
      if (result.broker === 'pfwise') {
        return parsePfWiseCSV(content);
      }

      setDetectedBroker(result.broker);

      if (result.warnings.length > 0) {
        setImportStatus({
          type: 'warning',
          message: result.warnings.join('\n'),
        });
      }

      return {
        baseCurrency: result.baseCurrency,
        currentAssets: result.currentAssets,
        targetPortfolio: [],
      };
    },
    [importFormat, brokerFormat, parsePfWiseCSV]
  );

  // ファイルインポート
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsLoading(true);
      setImportStatus(null);
      setDetectedBroker(null);

      if (importFormat === 'json') {
        // JSON はテキストとして読む
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            const result = await importData(normalizeData(data));
            if (result?.success) {
              setImportStatus({ type: 'success', message: result.message || 'データを正常にインポートしました' });
            } else {
              throw new Error(result?.message || 'インポートに失敗しました');
            }
          } catch (error: unknown) {
            setImportStatus({ type: 'error', message: `インポートに失敗しました: ${getErrorMessage(error)}` });
          } finally {
            setIsLoading(false);
          }
        };
        reader.onerror = () => {
          setImportStatus({ type: 'error', message: 'ファイルの読み込みに失敗しました' });
          setIsLoading(false);
        };
        reader.readAsText(file);
      } else {
        // CSV は ArrayBuffer で読んで Shift-JIS 自動検出
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const buffer = event.target?.result as ArrayBuffer;
            const content = decodeCSVBuffer(buffer);
            const data = processCSVContent(content);
            const result = await importData(normalizeData(data));
            if (result?.success) {
              const brokerLabel = detectedBroker ? ` (${BROKER_LABELS[detectedBroker]})` : '';
              setImportStatus({
                type: 'success',
                message: `${result.message || 'データを正常にインポートしました'}${brokerLabel}`,
              });
            } else {
              throw new Error(result?.message || 'インポートに失敗しました');
            }
          } catch (error: unknown) {
            setImportStatus({ type: 'error', message: `インポートに失敗しました: ${getErrorMessage(error)}` });
          } finally {
            setIsLoading(false);
          }
        };
        reader.onerror = () => {
          setImportStatus({ type: 'error', message: 'ファイルの読み込みに失敗しました' });
          setIsLoading(false);
        };
        reader.readAsArrayBuffer(file);
      }
    },
    [importFormat, importData, processCSVContent, detectedBroker]
  );

  // クリップボードインポート
  const handlePaste = useCallback(async () => {
    try {
      setIsLoading(true);
      setImportStatus(null);
      setDetectedBroker(null);

      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) throw new Error('クリップボードが空です');

      let data;
      if (importFormat === 'json') {
        data = JSON.parse(clipboardText);
      } else {
        data = processCSVContent(clipboardText);
      }

      const result = await importData(normalizeData(data));
      if (result?.success) {
        setImportStatus({ type: 'success', message: result.message || 'データを正常にインポートしました' });
      } else {
        throw new Error(result?.message || 'インポートに失敗しました');
      }
    } catch (error: unknown) {
      setImportStatus({ type: 'error', message: `インポートに失敗しました: ${getErrorMessage(error)}` });
    } finally {
      setIsLoading(false);
    }
  }, [importFormat, importData, processCSVContent]);

  // テキスト入力インポート
  const handleTextImport = useCallback(async () => {
    if (!importText.trim()) {
      setImportStatus({ type: 'error', message: 'インポートするデータを入力してください' });
      return;
    }

    try {
      setIsLoading(true);
      setImportStatus(null);
      setDetectedBroker(null);

      let data;
      if (importFormat === 'json') {
        data = JSON.parse(importText);
      } else {
        data = processCSVContent(importText);
      }

      const result = await importData(normalizeData(data));
      if (result?.success) {
        setImportStatus({ type: 'success', message: result.message || 'データを正常にインポートしました' });
        setImportText('');
      } else {
        throw new Error(result?.message || 'インポートに失敗しました');
      }
    } catch (error: unknown) {
      setImportStatus({ type: 'error', message: `インポートに失敗しました: ${getErrorMessage(error)}` });
    } finally {
      setIsLoading(false);
    }
  }, [importText, importFormat, importData, processCSVContent]);

  const activeBtn = 'bg-primary-500 text-white';
  const inactiveBtn = 'bg-muted text-muted-foreground hover:bg-accent';

  return (
    <div className="bg-card rounded-lg shadow border border-border p-4 mb-6">
      <h2 className="text-lg font-semibold mb-4 text-foreground">データインポート</h2>

      {/* インポート形式選択 */}
      <div className="mb-4">
        <label id="import-format-label" className="block text-sm font-medium text-muted-foreground mb-1">
          インポート形式
        </label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="import-format-label">
          {(['json', 'csv', 'broker-csv'] as ImportFormat[]).map((fmt) => (
            <button
              key={fmt}
              type="button"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                importFormat === fmt ? activeBtn : inactiveBtn
              }`}
              onClick={() => setImportFormat(fmt)}
              role="radio"
              aria-checked={importFormat === fmt}
            >
              {fmt === 'json' ? 'JSON' : fmt === 'csv' ? 'PfWise CSV' : '証券会社CSV'}
            </button>
          ))}
        </div>
      </div>

      {/* 証券会社選択（broker-csv選択時） */}
      {importFormat === 'broker-csv' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            証券会社（自動検出可）
          </label>
          <div className="flex flex-wrap gap-2">
            {(['auto', 'sbi', 'rakuten', 'generic'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  brokerFormat === fmt ? activeBtn : inactiveBtn
                }`}
                onClick={() => setBrokerFormat(fmt)}
              >
                {fmt === 'auto' ? '自動検出' : BROKER_LABELS[fmt]}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Shift-JIS エンコーディングも自動検出されます
          </p>
        </div>
      )}

      {/* インポート方法選択 */}
      <div className="mb-4">
        <label id="import-method-label" className="block text-sm font-medium text-muted-foreground mb-1">
          インポート方法
        </label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="import-method-label">
          {(['file', 'clipboard', 'text'] as const).map((method) => (
            <button
              key={method}
              type="button"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                importMethod === method ? activeBtn : inactiveBtn
              }`}
              onClick={() => setImportMethod(method)}
              role="radio"
              aria-checked={importMethod === method}
            >
              {method === 'file' ? 'ファイル' : method === 'clipboard' ? 'クリップボード' : 'テキスト入力'}
            </button>
          ))}
        </div>
      </div>

      {/* ファイルアップロード */}
      {importMethod === 'file' && (
        <div className="mb-4">
          <label htmlFor="file-upload" className="block text-sm font-medium text-muted-foreground mb-1">
            ファイルをアップロード
          </label>
          <input
            id="file-upload"
            type="file"
            accept={importFormat === 'json' ? '.json' : '.csv,.txt'}
            onChange={handleFileChange}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-500 file:text-white hover:file:bg-primary-600"
          />
        </div>
      )}

      {/* クリップボード */}
      {importMethod === 'clipboard' && (
        <div className="mb-4">
          <button
            type="button"
            className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors"
            onClick={handlePaste}
            disabled={isLoading}
          >
            {isLoading ? '処理中...' : 'クリップボードから貼り付け'}
          </button>
          <p className="text-sm text-muted-foreground mt-1">
            クリップボードからのデータを読み込み、インポートします。
          </p>
        </div>
      )}

      {/* テキスト入力 */}
      {importMethod === 'text' && (
        <div className="mb-4">
          <label htmlFor="import-text" className="block text-sm font-medium text-muted-foreground mb-1">
            データを貼り付け
          </label>
          <textarea
            id="import-text"
            className="w-full h-40 p-2 border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={
              importFormat === 'json'
                ? '{"currentAssets": [...], "targetPortfolio": [...]}'
                : importFormat === 'broker-csv'
                  ? '銘柄コード,銘柄名,数量,現在値,評価額\n1306,TOPIX連動型,100,2500,250000'
                  : '# 保有資産\nid,name,ticker,...'
            }
          />
          <button
            type="button"
            className="mt-2 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors"
            onClick={handleTextImport}
            disabled={isLoading || !importText.trim()}
          >
            {isLoading ? '処理中...' : 'インポート'}
          </button>
        </div>
      )}

      {/* 検出結果 */}
      {detectedBroker && (
        <div className="mb-3 p-2 bg-primary-500/10 border border-primary-500/20 rounded-lg">
          <p className="text-sm text-primary-500">
            検出された形式: <strong>{BROKER_LABELS[detectedBroker]}</strong>
          </p>
        </div>
      )}

      {/* ステータス表示 */}
      {importStatus && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm ${
            importStatus.type === 'success'
              ? 'bg-success-500/10 text-success-500 border border-success-500/20'
              : importStatus.type === 'warning'
                ? 'bg-warning-500/10 text-warning-500 border border-warning-500/20'
                : 'bg-danger-500/10 text-danger-500 border border-danger-500/20'
          }`}
        >
          {importStatus.message}
        </div>
      )}
    </div>
  );
};

export default ImportOptions;
