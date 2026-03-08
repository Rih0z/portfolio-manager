/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/pages/Settings.tsx
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
import { BarChart3, Bot, ArrowUpDown, Bell, Settings as SettingsIcon } from 'lucide-react';
import TickerSearch from '../components/settings/TickerSearch';
import PopularTickers from '../components/settings/PopularTickers';
import HoldingsEditor from '../components/settings/HoldingsEditor';
import AllocationEditor from '../components/settings/AllocationEditor';
import AiPromptSettings from '../components/settings/AiPromptSettings';
import PortfolioYamlConverter from '../components/settings/PortfolioYamlConverter';
import ResetSettings from '../components/settings/ResetSettings';
import AlertRulesManager from '../components/notifications/AlertRulesManager';
import NotificationPreferences from '../components/notifications/NotificationPreferences';

const Settings = () => {
  const [activeSection, setActiveSection] = useState('portfolio');

  const sections = [
    { id: 'portfolio', name: '銘柄管理', Icon: BarChart3 },
    { id: 'ai-settings', name: 'AI設定', Icon: Bot },
    { id: 'data-exchange', name: 'データ', Icon: ArrowUpDown },
    { id: 'notifications', name: '通知', Icon: Bell },
    { id: 'system', name: 'システム', Icon: SettingsIcon },
  ];

  return (
    <div data-testid="settings-page" className="max-w-7xl mx-auto">
      {/* セクションタブ */}
      <div className="bg-card border border-border rounded-xl shadow-sm mb-6 p-1.5">
        <div className="flex flex-wrap gap-1">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeSection === section.id
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <section.Icon size={16} />
              {section.name}
            </button>
          ))}
        </div>
      </div>

      {/* ポートフォリオ設定セクション */}
      {activeSection === 'portfolio' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 text-foreground">銘柄の追加</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-base font-medium mb-3 text-foreground">銘柄を検索して追加</h3>
                <TickerSearch />
              </div>
              <div>
                <h3 className="text-base font-medium mb-3 text-foreground">人気銘柄を追加</h3>
                <PopularTickers />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 text-foreground">保有資産の設定</h2>
            <HoldingsEditor />
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 text-foreground">目標配分の設定</h2>
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

      {/* 通知設定セクション */}
      {activeSection === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 text-foreground">アラートルール</h2>
            <AlertRulesManager />
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 text-foreground">通知設定</h2>
            <NotificationPreferences />
          </div>
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
