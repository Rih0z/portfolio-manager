/**
 * LoadingFallback
 *
 * React.Suspense の fallback 用ローディングUI。
 * ルートベースのコード分割時にページ読み込み中に表示する。
 *
 * @file src/components/common/LoadingFallback.tsx
 */
import React from 'react';

interface LoadingFallbackProps {
  message?: string;
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  message = '読み込み中...',
}) => {
  return (
    <div
      data-testid="loading-fallback"
      className="flex items-center justify-center min-h-[200px] py-12"
    >
      <div className="text-center">
        <div
          data-testid="loading-spinner"
          className="w-8 h-8 mx-auto mb-3 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin"
        />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

export default LoadingFallback;
