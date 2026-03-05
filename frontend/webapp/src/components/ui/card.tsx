/**
 * Card コンポーネント（shadcn/ui スタイル）
 * @file src/components/ui/card.tsx
 */
import React from 'react';
import { cn } from '../../lib/utils';

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    hoverable?: boolean;
    elevation?: 'none' | 'low' | 'medium' | 'high';
    padding?: 'none' | 'small' | 'medium' | 'large';
  }
>(({ className, hoverable, elevation = 'low', padding = 'medium', ...props }, ref) => {
  const elevationStyles = {
    none: '',
    low: 'shadow-soft',
    medium: 'shadow-medium',
    high: 'shadow-large',
  };
  const paddingStyles = {
    none: '',
    small: 'p-3',
    medium: 'p-5',
    large: 'p-6 sm:p-8',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-border bg-card text-card-foreground',
        elevationStyles[elevation],
        paddingStyles[padding],
        hoverable && 'transition-all duration-200 hover:shadow-medium hover:-translate-y-0.5',
        className
      )}
      {...props}
    />
  );
});
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 pb-4', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
export default Card;
