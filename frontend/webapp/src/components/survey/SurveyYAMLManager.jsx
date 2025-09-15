/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/components/survey/SurveyYAMLManager.jsx
 * 
 * 作成者: Claude Code
 * 作成日: 2025-01-03
 * 
 * 説明:
 * YAMLアンケート形式のデータ管理コンポーネント。
 * ユーザー情報の収集とYAML形式での出力を行う。
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModernButton from '../common/ModernButton';
import ModernCard from '../common/ModernCard';
import { FaClipboardList, FaUserCheck, FaSave } from 'react-icons/fa';

const SurveyYAMLManager = ({ onSurveyComplete, initialData }) => {
  const { t } = useTranslation();
  const [surveyData, setSurveyData] = useState({
    profile: {
      age: '',
      experience: 'beginner',
      riskTolerance: 'conservative',
      investmentGoal: 'long_term'
    },
    preferences: {
      markets: [],
      budget: '',
      timeHorizon: '5_years'
    },
    ...initialData
  });

  const experienceOptions = [
    { value: 'beginner', label: '初心者（投資経験1年未満）' },
    { value: 'intermediate', label: '中級者（投資経験1-5年）' },
    { value: 'advanced', label: '上級者（投資経験5年以上）' }
  ];

  const riskToleranceOptions = [
    { value: 'conservative', label: '保守的（元本重視）' },
    { value: 'moderate', label: '中程度（バランス重視）' },
    { value: 'aggressive', label: '積極的（収益重視）' }
  ];

  const goalOptions = [
    { value: 'long_term', label: '長期資産形成' },
    { value: 'retirement', label: '退職後資金' },
    { value: 'education', label: '教育資金' },
    { value: 'house', label: '住宅購入資金' }
  ];

  const timeHorizonOptions = [
    { value: '1_year', label: '1年以内' },
    { value: '3_years', label: '3年程度' },
    { value: '5_years', label: '5年程度' },
    { value: '10_years', label: '10年以上' }
  ];

  const handleInputChange = (section, field, value) => {
    setSurveyData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const generateYAMLOutput = () => {
    const yamlOutput = `# 投資家プロフィール
investor_profile:
  age: ${surveyData.profile.age || 'not_specified'}
  experience_level: ${surveyData.profile.experience}
  risk_tolerance: ${surveyData.profile.riskTolerance}
  investment_goal: ${surveyData.profile.investmentGoal}

# 投資設定
investment_preferences:
  budget: ${surveyData.preferences.budget || 'not_specified'}
  time_horizon: ${surveyData.preferences.timeHorizon}
  preferred_markets: ${JSON.stringify(surveyData.preferences.markets)}
  
# 生成日時
generated_at: ${new Date().toISOString()}
`;
    return yamlOutput;
  };

  const handleSave = () => {
    const yamlOutput = generateYAMLOutput();
    onSurveyComplete?.({
      data: surveyData,
      yaml: yamlOutput
    });
  };

  return (
    <ModernCard className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary-500/10 rounded-lg">
          <FaClipboardList className="w-5 h-5 text-primary-400" />
        </div>
        <h3 className="text-lg font-semibold text-white">投資家プロフィール設定</h3>
      </div>

      <div className="space-y-8">
        {/* プロフィール情報 */}
        <div>
          <h4 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
            <FaUserCheck className="w-4 h-4 text-primary-400" />
            基本情報
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                年齢
              </label>
              <input
                type="number"
                value={surveyData.profile.age}
                onChange={(e) => handleInputChange('profile', 'age', e.target.value)}
                className="w-full p-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:border-primary-500"
                placeholder="例: 35"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                投資予算（万円）
              </label>
              <input
                type="number"
                value={surveyData.preferences.budget}
                onChange={(e) => handleInputChange('preferences', 'budget', e.target.value)}
                className="w-full p-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:border-primary-500"
                placeholder="例: 100"
              />
            </div>
          </div>
        </div>

        {/* 投資経験 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            投資経験
          </label>
          <div className="space-y-2">
            {experienceOptions.map(option => (
              <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="experience"
                  value={option.value}
                  checked={surveyData.profile.experience === option.value}
                  onChange={(e) => handleInputChange('profile', 'experience', e.target.value)}
                  className="text-primary-500 focus:ring-primary-500 bg-dark-200 border-dark-400"
                />
                <span className="text-gray-300">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* リスク許容度 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            リスク許容度
          </label>
          <div className="space-y-2">
            {riskToleranceOptions.map(option => (
              <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="riskTolerance"
                  value={option.value}
                  checked={surveyData.profile.riskTolerance === option.value}
                  onChange={(e) => handleInputChange('profile', 'riskTolerance', e.target.value)}
                  className="text-primary-500 focus:ring-primary-500 bg-dark-200 border-dark-400"
                />
                <span className="text-gray-300">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 投資目的 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            投資目的
          </label>
          <select
            value={surveyData.profile.investmentGoal}
            onChange={(e) => handleInputChange('profile', 'investmentGoal', e.target.value)}
            className="w-full p-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:border-primary-500"
          >
            {goalOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 投資期間 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            投資期間
          </label>
          <select
            value={surveyData.preferences.timeHorizon}
            onChange={(e) => handleInputChange('preferences', 'timeHorizon', e.target.value)}
            className="w-full p-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:border-primary-500"
          >
            {timeHorizonOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-4">
          <ModernButton
            onClick={handleSave}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600"
          >
            <FaSave className="w-4 h-4" />
            プロフィールを保存
          </ModernButton>
        </div>
      </div>
    </ModernCard>
  );
};

export default SurveyYAMLManager;