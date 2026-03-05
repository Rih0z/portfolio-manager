/**
 * shadcn/ui ユーティリティ関数
 * @file src/lib/utils.ts
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSSクラスをマージする。
 * clsx で条件付きクラスを処理し、tailwind-merge で重複を除去。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
