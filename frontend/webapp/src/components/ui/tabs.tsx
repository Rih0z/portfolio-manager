/**
 * Tabs コンポーネント（shadcn/ui スタイル）
 * @file src/components/ui/tabs.tsx
 */
import React, { useCallback, useRef } from 'react';
import { cn } from '../../lib/utils';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  variant?: 'default' | 'pills';
}

function Tabs({
  tabs,
  activeTab,
  onTabChange,
  className,
  variant = 'default',
}: TabsProps) {
  const tablistRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const enabledTabs = tabs.filter((t) => !t.disabled);
      const currentIndex = enabledTabs.findIndex((t) => t.id === activeTab);
      if (currentIndex === -1) return;

      let nextIndex: number | null = null;

      if (e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % enabledTabs.length;
      } else if (e.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
      } else if (e.key === 'Home') {
        nextIndex = 0;
      } else if (e.key === 'End') {
        nextIndex = enabledTabs.length - 1;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        onTabChange(enabledTabs[nextIndex].id);
        const buttons = tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)');
        buttons?.[nextIndex]?.focus();
      }
    },
    [tabs, activeTab, onTabChange]
  );

  return (
    <div
      ref={tablistRef}
      className={cn(
        'flex',
        variant === 'default'
          ? 'border-b border-border'
          : 'bg-muted p-1 rounded-lg',
        className
      )}
      role="tablist"
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          disabled={tab.disabled}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:pointer-events-none disabled:opacity-50',
            variant === 'default'
              ? cn(
                  '-mb-px border-b-2',
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-500'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                )
              : cn(
                  'rounded-md',
                  activeTab === tab.id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  tabId: string;
  activeTab: string;
}

function TabPanel({ tabId, activeTab, className, children, ...props }: TabPanelProps) {
  if (tabId !== activeTab) return null;

  return (
    <div
      id={`tabpanel-${tabId}`}
      role="tabpanel"
      aria-labelledby={tabId}
      className={cn('mt-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { Tabs, TabPanel };
export default Tabs;
