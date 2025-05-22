/**
 * ファイルパス: __test__/unit/components/DataSourceBadge.test.js
 *
 * DataSourceBadgeコンポーネントの単体テスト
 * データソース表示とアイコン表示オプションをテスト
 *
 * @author プロジェクトチーム
 * @created 2025-05-21
 */

// テスト対象モジュールのインポート
import DataSourceBadge from '@/components/common/DataSourceBadge';

// テスト用ライブラリ
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('DataSourceBadgeコンポーネント', () => {
  it('既知のソースでは適切なテキストとアイコンを表示する', () => {
    render(<DataSourceBadge source="Alpaca" />);

    const badge = screen.getByText('Alpaca');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Alpaca');
    // アイコンが表示されていることを確認
    expect(badge.querySelector('span')).toBeInTheDocument();
  });

  it('showIcon=falseの場合はアイコンが非表示になる', () => {
    render(<DataSourceBadge source="Yahoo Finance" showIcon={false} />);

    // 表示テキストは短縮形になっている
    expect(screen.getByText('YFinance')).toBeInTheDocument();
    const badge = screen.getByText('YFinance');
    // 子要素にアイコンがないことを確認
    expect(badge.querySelector('span')).not.toBeInTheDocument();
  });

  it('未知のソースではデフォルト表示を行う', () => {
    render(<DataSourceBadge source="Unknown" />);

    const badge = screen.getByText('Unknown');
    expect(badge).toBeInTheDocument();
    // タイトル属性がデフォルトの説明になっているか確認
    expect(badge).toHaveAttribute('title', '不明なデータソース');
  });
});
