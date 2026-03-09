/**
 * CopyToClipboard
 *
 * 散在するコピー実装を統一する再利用可能コンポーネント。
 * ボタンモード / アイコンモード切替可能。
 *
 * @file src/components/ai/CopyToClipboard.tsx
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface CopyToClipboardProps {
  text: string;
  mode?: 'button' | 'icon';
  className?: string;
  onCopied?: () => void;
}

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const CopyToClipboard: React.FC<CopyToClipboardProps> = ({
  text,
  mode = 'button',
  className,
  onCopied,
}) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    onCopied?.();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  }, [text, onCopied]);

  if (mode === 'icon') {
    return (
      <button
        onClick={handleCopy}
        data-testid="copy-to-clipboard"
        className={cn(
          'p-1.5 rounded-md transition-colors',
          copied
            ? 'text-success-500'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          className
        )}
        title={copied ? 'コピー済み' : 'コピー'}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    );
  }

  return (
    <Button
      variant={copied ? 'success' : 'primary'}
      size="sm"
      onClick={handleCopy}
      icon={copied ? <CheckIcon /> : <CopyIcon />}
      className={className}
      data-testid="copy-to-clipboard"
    >
      {copied ? 'コピー済み' : 'コピー'}
    </Button>
  );
};

export default CopyToClipboard;
