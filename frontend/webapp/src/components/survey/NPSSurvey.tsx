/**
 * NPS（Net Promoter Score）調査コンポーネント
 *
 * ダッシュボード下部にフローティングカードとして表示。
 * 0-10のスケールで推奨度を質問し、オプションでコメントを収集。
 *
 * @file src/components/survey/NPSSurvey.tsx
 */
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useNPSSurvey, getNPSCategory } from '../../hooks/useNPSSurvey';

const SCORE_COLORS: Record<number, string> = {
  0: 'bg-red-500 hover:bg-red-600',
  1: 'bg-red-500 hover:bg-red-600',
  2: 'bg-red-400 hover:bg-red-500',
  3: 'bg-orange-400 hover:bg-orange-500',
  4: 'bg-orange-400 hover:bg-orange-500',
  5: 'bg-yellow-400 hover:bg-yellow-500',
  6: 'bg-yellow-400 hover:bg-yellow-500',
  7: 'bg-lime-400 hover:bg-lime-500',
  8: 'bg-lime-400 hover:bg-lime-500',
  9: 'bg-green-500 hover:bg-green-600',
  10: 'bg-green-500 hover:bg-green-600',
};

const NPSSurvey: React.FC = () => {
  const { t } = useTranslation();
  const { shouldShow, submit, dismiss } = useNPSSurvey();
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [step, setStep] = useState<'score' | 'comment' | 'thanks'>('score');

  const handleScoreSelect = useCallback((score: number) => {
    setSelectedScore(score);
    setStep('comment');
  }, []);

  const handleSubmit = useCallback(() => {
    if (selectedScore === null) return;
    submit(selectedScore, comment || undefined);
    setStep('thanks');
  }, [selectedScore, comment, submit]);

  const handleDismiss = useCallback(() => {
    dismiss();
  }, [dismiss]);

  if (!shouldShow && step !== 'thanks') return null;

  // 送信完了メッセージ（2秒後に自動消去）
  if (step === 'thanks') {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4" role="status" aria-live="polite">
        <Card padding="medium" className="shadow-lg border-success-500/30 bg-card text-center">
          <p className="text-foreground font-medium">
            {t('nps.thanks', 'ご回答ありがとうございます！')}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('nps.thanksDetail', 'いただいたフィードバックはサービス改善に活用します。')}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4"
      role="dialog"
      aria-label={t('nps.ariaLabel', 'NPS調査')}
      data-testid="nps-survey"
    >
      <Card padding="large" className="shadow-xl border-primary-500/20 bg-card">
        {/* ヘッダー + 閉じるボタン */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-base font-semibold text-foreground">
            {t('nps.title', 'PortfolioWise をおすすめしますか？')}
          </h3>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground p-1 -mt-1 -mr-1"
            aria-label={t('nps.close', '閉じる')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 'score' && (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {t('nps.question', '友人や同僚に PortfolioWise を勧める可能性はどのくらいですか？')}
            </p>

            {/* スコアボタン 0-10 */}
            <div className="flex gap-1 justify-center mb-2">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => handleScoreSelect(i)}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-md text-xs sm:text-sm font-bold text-white transition-all ${SCORE_COLORS[i]} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1`}
                  aria-label={`${i} ${t('nps.point', '点')}`}
                >
                  {i}
                </button>
              ))}
            </div>

            {/* ラベル */}
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>{t('nps.unlikely', 'まったく勧めない')}</span>
              <span>{t('nps.likely', '強く勧める')}</span>
            </div>
          </>
        )}

        {step === 'comment' && selectedScore !== null && (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              {getNPSCategory(selectedScore) === 'promoter'
                ? t('nps.commentPromoter', '嬉しいです！特に気に入っている点を教えてください。')
                : getNPSCategory(selectedScore) === 'passive'
                  ? t('nps.commentPassive', 'もっと良くするために、改善点を教えてください。')
                  : t('nps.commentDetractor', '申し訳ありません。どうすれば改善できるか教えてください。')
              }
            </p>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('nps.commentPlaceholder', '（任意）ご意見をお聞かせください')}
              className="w-full p-3 border border-border rounded-lg bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              maxLength={500}
              aria-label={t('nps.commentLabel', 'フィードバックコメント')}
            />

            <div className="flex justify-between items-center mt-3">
              <button
                onClick={() => setStep('score')}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {t('nps.back', '戻る')}
              </button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSubmit}>
                  {t('nps.skip', 'スキップ')}
                </Button>
                <Button variant="primary" size="sm" onClick={handleSubmit}>
                  {t('nps.submit', '送信')}
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default NPSSurvey;
