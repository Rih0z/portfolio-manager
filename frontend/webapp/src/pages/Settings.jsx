/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/pages/Settings.jsx
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-03-18 09:20:45 
 * 
 * 更新履歴: 
 * - 2025-03-18 09:20:45 Koki Riho 初回作成
 * - 2025-04-10 14:25:30 Yuta Sato 銘柄検索機能の改善
 * - 2025-04-28 11:05:10 Koki Riho AI分析プロンプト設定コンポーネントを追加
 * 
 * 説明: 
 * ポートフォリオの設定画面コンポーネント。銘柄の追加、保有資産設定、
 * 目標配分設定、およびAI分析プロンプト設定機能を提供する。
 */

import React from 'react';
import TickerSearch from '../components/settings/TickerSearch';
import PopularTickers from '../components/settings/PopularTickers';
import HoldingsEditor from '../components/settings/HoldingsEditor';
import AllocationEditor from '../components/settings/AllocationEditor';
import AiPromptSettings from '../components/settings/AiPromptSettings';

const Settings = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">銘柄の追加</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-3">銘柄を検索して追加</h3>
            <TickerSearch />
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3">人気銘柄を追加</h3>
            <PopularTickers />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">保有資産の設定</h2>
        <HoldingsEditor />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">目標配分の設定</h2>
        <AllocationEditor />
      </div>
      
      {/* AI分析プロンプト設定を追加 */}
      <AiPromptSettings />
    </div>
  );
};

export default Settings;
