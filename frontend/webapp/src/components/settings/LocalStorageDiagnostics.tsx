/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/components/settings/LocalStorageDiagnostics.jsx
 * 
 * 作成者: Claude Code
 * 作成日: 2025-01-03
 * 
 * 説明:
 * ローカルストレージの診断機能を提供するコンポーネント。
 * ブラウザ保存されたポートフォリオデータの状態確認とデバッグを支援する。
 */

import React, { useState } from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { Button } from '../ui/button';
import { FaExclamationTriangle, FaCheckCircle, FaTools, FaTrash, FaSync } from 'react-icons/fa';

const LocalStorageDiagnostics = () => {
  const { debugLocalStorage, clearLocalStorage, loadFromLocalStorage, initializeData } = usePortfolioContext();
  const [diagnosticsResult, setDiagnosticsResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    try {
      const result = debugLocalStorage();
      setDiagnosticsResult(result);
    } catch (error) {
      setDiagnosticsResult({ error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  const forceReloadFromStorage = async () => {
    try {
      const data = loadFromLocalStorage();
      if (data) {
        window.location.reload(); // ページリロードでデータを再初期化
      } else {
        alert('ローカルストレージにデータがありません');
      }
    } catch (error) {
      alert(`読み込みエラー: ${error.message}`);
    }
  };

  const clearAndRestart = async () => {
    if (window.confirm('ローカルストレージのデータを完全に削除してアプリを再起動しますか？\n\n⚠️ この操作は元に戻せません。Google Driveバックアップがある場合は事前に確認してください。')) {
      try {
        clearLocalStorage();
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        alert(`削除エラー: ${error.message}`);
      }
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-xl p-6" data-testid="local-storage-diagnostics">
      <div className="flex items-center gap-2 mb-4">
        <FaTools className="text-orange-400" />
        <h3 className="text-lg font-medium text-foreground">ローカルストレージ診断</h3>
      </div>

      <p className="text-muted-foreground text-sm mb-4">
        ブラウザに保存されたポートフォリオデータの状態を確認し、問題があれば修復できます。
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Button
          variant="secondary"
          onClick={runDiagnostics}
          disabled={isRunning}
          className="flex items-center justify-center gap-2"
        >
          <FaTools className="w-4 h-4" />
          {isRunning ? '診断中...' : '診断実行'}
        </Button>

        <Button
          variant="primary"
          onClick={forceReloadFromStorage}
          className="flex items-center justify-center gap-2"
        >
          <FaSync className="w-4 h-4" />
          強制再読み込み
        </Button>

        <Button
          variant="danger"
          onClick={clearAndRestart}
          className="flex items-center justify-center gap-2"
        >
          <FaTrash className="w-4 h-4" />
          リセット
        </Button>
      </div>

      {diagnosticsResult && (
        <div className="bg-background border border-border rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-3">診断結果</h4>
          
          {diagnosticsResult.error ? (
            <div className="flex items-center gap-2 text-red-400">
              <FaExclamationTriangle />
              <span>エラー: {diagnosticsResult.error}</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {diagnosticsResult.hasData ? (
                  <FaCheckCircle className="text-green-400" />
                ) : (
                  <FaExclamationTriangle className="text-yellow-400" />
                )}
                <span className="text-foreground">
                  データ存在: {diagnosticsResult.hasData ? 'あり' : 'なし'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {diagnosticsResult.canDecrypt ? (
                  <FaCheckCircle className="text-green-400" />
                ) : (
                  <FaExclamationTriangle className="text-red-400" />
                )}
                <span className="text-foreground">
                  復号化: {diagnosticsResult.canDecrypt ? '成功' : '失敗'}
                </span>
              </div>

              {diagnosticsResult.currentState && (
                <div className="bg-card p-3 rounded">
                  <h5 className="text-sm font-medium text-foreground mb-2">現在の状態</h5>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>初期化: {diagnosticsResult.currentState.initialized ? '完了' : '未完了'}</div>
                    <div>基準通貨: {diagnosticsResult.currentState.baseCurrency || '未設定'}</div>
                    <div>保有資産数: {diagnosticsResult.currentState.currentAssetsLength || 0}件</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <h5 className="text-sm font-medium text-blue-400 mb-2">解決方法</h5>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• <strong>データなし</strong>: まず設定ページで銘柄を追加してください</li>
          <li>• <strong>復号化失敗</strong>: 「リセット」で完全初期化を実行してください</li>
          <li>• <strong>読み込み失敗</strong>: 「強制再読み込み」でデータ取得を再試行してください</li>
          <li>• <strong>問題継続</strong>: Google Driveバックアップからデータを復元してください</li>
        </ul>
      </div>
    </div>
  );
};

export default LocalStorageDiagnostics;