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

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import TickerSearch from '../components/settings/TickerSearch';
import PopularTickers from '../components/settings/PopularTickers';
import HoldingsEditor from '../components/settings/HoldingsEditor';
import AllocationEditor from '../components/settings/AllocationEditor';
import AiPromptSettings from '../components/settings/AiPromptSettings';
import PortfolioYamlConverter from '../components/settings/PortfolioYamlConverter';
import ResetSettings from '../components/settings/ResetSettings';

const Settings = () => {
  const { t, i18n } = useTranslation();
  const [activeSection, setActiveSection] = useState('portfolio');
  const isJapanese = i18n.language === 'ja';

  const sections = [
    { 
      id: 'portfolio', 
      name: isJapanese ? 'ポートフォリオ設定' : 'Portfolio Settings',
      icon: '📊'
    },
    { 
      id: 'ai-settings', 
      name: isJapanese ? 'AI分析設定' : 'AI Analysis Settings',
      icon: '🤖'
    },
    { 
      id: 'data-exchange', 
      name: isJapanese ? 'データ交換' : 'Data Exchange',
      icon: '🔄'
    },
    { 
      id: 'system', 
      name: isJapanese ? 'システム設定' : 'System Settings',
      icon: '⚙️'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* セクションタブ */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-2">
        <div className="flex flex-wrap gap-2">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeSection === section.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span className="mr-2">{section.icon}</span>
              {section.name}
            </button>
          ))}
        </div>
      </div>

      {/* ポートフォリオ設定セクション */}
      {activeSection === 'portfolio' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              {isJapanese ? '銘柄の追加' : 'Add Tickers'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">
                  {isJapanese ? '銘柄を検索して追加' : 'Search and Add'}
                </h3>
                <TickerSearch />
              </div>
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">
                  {isJapanese ? '人気銘柄を追加' : 'Popular Tickers'}
                </h3>
                <PopularTickers />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              {isJapanese ? '保有資産の設定' : 'Holdings Settings'}
            </h2>
            <HoldingsEditor />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              {isJapanese ? '目標配分の設定' : 'Target Allocation'}
            </h2>
            <AllocationEditor />
          </div>
        </div>
      )}

      {/* AI分析設定セクション */}
      {activeSection === 'ai-settings' && (
        <div className="space-y-6">
          <AiPromptSettings />
        </div>
      )}

      {/* データ交換セクション */}
      {activeSection === 'data-exchange' && (
        <div className="space-y-6">
          <PortfolioYamlConverter />
        </div>
      )}

      {/* システム設定セクション */}
      {activeSection === 'system' && (
        <div className="space-y-6">
          <ResetSettings />
        </div>
      )}
    </div>
  );
};

export default Settings;
