/**
 * チャート用カラーパレット定数
 *
 * CSS変数 (--chart-1 ~ --chart-15) を参照し、
 * ライト/ダークモードでテーマ連動する。
 * 全チャートコンポーネントで統一的に使用すること。
 *
 * @file src/constants/chartColors.ts
 */

/** チャート用15色パレット（CSS変数参照） */
export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
  'var(--chart-9)',
  'var(--chart-10)',
  'var(--chart-11)',
  'var(--chart-12)',
  'var(--chart-13)',
  'var(--chart-14)',
  'var(--chart-15)',
] as const;

/** セマンティック色（SVG/Recharts の fill / stroke 用） */
export const SEMANTIC_COLORS = {
  success: 'var(--color-success-500)',
  danger: 'var(--color-danger-500)',
  primary: 'var(--color-primary-500)',
  warning: 'var(--color-warning-500)',
} as const;
