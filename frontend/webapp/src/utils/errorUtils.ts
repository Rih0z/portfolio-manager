/**
 * エラーハンドリング型安全ユーティリティ
 *
 * catch(e: unknown) で安全にエラーメッセージを取得するための
 * 型ガード + ヘルパー関数を提供する。
 */

/**
 * unknown 型のエラーから安全にメッセージ文字列を取得する
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return '不明なエラーが発生しました';
}

/**
 * unknown 型が Error インスタンスか判定する型ガード
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * HTTP レスポンスエラーからステータスコードを安全に取得
 */
export function getErrorStatus(error: unknown): number | undefined {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'status' in error.response
  ) {
    return (error.response as { status: number }).status;
  }
  return undefined;
}
