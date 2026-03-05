/**
 * Badge コンポーネント（shadcn/ui スタイル）
 * @file src/components/ui/badge.tsx
 */
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
        secondary:
          'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        success:
          'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300',
        danger:
          'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300',
        warning:
          'bg-warning-100 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400',
        outline:
          'border border-border text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
export default Badge;
