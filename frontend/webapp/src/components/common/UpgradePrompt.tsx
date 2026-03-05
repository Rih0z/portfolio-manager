/**
 * アップグレード促進コンポーネント
 *
 * Free プランの使用量上限に到達した際に表示する
 * Standard プランへのアップグレード誘導 UI。
 *
 * @file src/components/common/UpgradePrompt.tsx
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface UpgradePromptProps {
  /** 制限に達した機能名 */
  feature: string;
  /** 現在の使用量 */
  current?: number;
  /** 上限値 */
  limit?: number;
  /** 表示スタイル: 'inline' = コンパクト, 'modal' = フルサイズ */
  variant?: 'inline' | 'banner';
  /** 閉じるコールバック */
  onClose?: () => void;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  feature,
  current,
  limit,
  variant = 'inline',
  onClose,
}) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-primary-500/10 to-primary-600/10 border border-primary-500/20 rounded-xl p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-sm font-semibold text-gray-100">{feature}の上限に到達しました</h3>
            </div>
            {current !== undefined && limit !== undefined && (
              <p className="text-xs text-gray-400 mb-3">
                使用量: {current} / {limit}
              </p>
            )}
            <p className="text-sm text-gray-300 mb-3">
              Standard プランにアップグレードすると、すべての機能を無制限でご利用いただけます。
            </p>
            <button
              onClick={handleUpgrade}
              className="inline-flex items-center px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors shadow-lg"
            >
              プランを見る
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="閉じる"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  // inline variant
  return (
    <div className="flex items-center gap-3 bg-dark-300 border border-dark-400 rounded-lg px-3 py-2">
      <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
      </svg>
      <span className="text-xs text-gray-300 flex-1">
        {feature}の無料プラン上限
        {current !== undefined && limit !== undefined && `（${current}/${limit}）`}
        に達しました
      </span>
      <button
        onClick={handleUpgrade}
        className="text-xs text-primary-400 hover:text-primary-300 font-medium whitespace-nowrap"
      >
        アップグレード
      </button>
    </div>
  );
};

export default UpgradePrompt;
