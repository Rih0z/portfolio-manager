/**
 * ファイルパス: __test__/unit/components/Table.test.js
 * 
 * Tableコンポーネントの単体テスト
 * 基本的なテーブル機能、ソート機能、ページネーション機能をテスト
 * 
 * @author プロジェクトチーム
 * @created 2025-05-21
 */

// テスト対象モジュールのインポート
import Table from '@/components/common/Table';

// テスト用ライブラリ
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// モックデータ
import { mockTableData } from '../../mocks/data';

describe('Tableコンポーネント', () => {
  // テスト用データ
  const { columns, data } = mockTableData;
  
  // 基本的なprops
  const defaultProps = {
    columns,
    data,
    onRowClick: jest.fn(),
    onSort: jest.fn()
  };
  
  // 各テスト前の準備
  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();
  });
  
  it('空のデータセットでテーブルが正しくレンダリングされる', () => {
    // テスト実行
    render(<Table {...defaultProps} data={[]} />);
    
    // カラムヘッダーが表示されていることを検証
    columns.forEach(column => {
      expect(screen.getByText(column.label)).toBeInTheDocument();
    });
    
    // 空のメッセージが表示されていることを検証
    expect(screen.getByText('データがありません')).toBeInTheDocument();
  });
  
  it('データを受け取ってテーブルが正しくレンダリングされる', () => {
    // テスト実行
    render(<Table {...defaultProps} />);
    
    // カラムヘッダーが表示されていることを検証
    columns.forEach(column => {
      expect(screen.getByText(column.label)).toBeInTheDocument();
    });
    
    // 各行のデータが表示されていることを検証
    data.forEach(row => {
      expect(screen.getByText(row.ticker)).toBeInTheDocument();
      expect(screen.getByText(row.name)).toBeInTheDocument();
      
      // 数値は文字列として表示されるため、変換が必要
      expect(screen.getByText(row.price.toString())).toBeInTheDocument();
      expect(screen.getByText(row.holdings.toString())).toBeInTheDocument();
      expect(screen.getByText(row.value.toString())).toBeInTheDocument();
    });
  });
  
  it('ソート機能が正しく動作する', async () => {
    // テスト実行
    render(<Table {...defaultProps} />);
    
    // ソート可能なカラムヘッダーをクリック
    const tickerHeader = screen.getByText('銘柄コード');
    await userEvent.click(tickerHeader);
    
    // onSortが呼ばれたことを検証
    expect(defaultProps.onSort).toHaveBeenCalledTimes(1);
    expect(defaultProps.onSort).toHaveBeenCalledWith('ticker', 'asc');
    
    // 再度クリックして降順にソート
    await userEvent.click(tickerHeader);
    
    // onSortが再度呼ばれたことを検証
    expect(defaultProps.onSort).toHaveBeenCalledTimes(2);
    expect(defaultProps.onSort).toHaveBeenCalledWith('ticker', 'desc');
  });
  
  it('ソート不可のカラムではソート機能が動作しない', async () => {
    // テスト実行
    render(<Table {...defaultProps} />);
    
    // ソート不可のカラムヘッダーをクリック
    const actionsHeader = screen.getByText('操作');
    await userEvent.click(actionsHeader);
    
    // onSortが呼ばれないことを検証
    expect(defaultProps.onSort).not.toHaveBeenCalled();
  });
  
  it('行クリック時にonRowClickハンドラーが呼ばれる', async () => {
    // テスト実行
    render(<Table {...defaultProps} />);
    
    // 最初の行をクリック
    const firstRow = screen.getByText('AAPL').closest('tr');
    await userEvent.click(firstRow);
    
    // onRowClickが正しい引数で呼ばれたことを検証
    expect(defaultProps.onRowClick).toHaveBeenCalledTimes(1);
    expect(defaultProps.onRowClick).toHaveBeenCalledWith(data[0]);
  });
  
  it('ページネーションが正しく動作する', async () => {
    // 大量のデータを生成
    const manyRows = Array.from({ length: 25 }, (_, i) => ({
      id: `id-${i}`,
      ticker: `TICK${i}`,
      name: `Test Stock ${i}`,
      price: 100 + i,
      holdings: 10,
      value: (100 + i) * 10
    }));
    
    // ページネーション用のprops
    const paginationProps = {
      ...defaultProps,
      data: manyRows,
      pageSize: 10
    };
    
    // テスト実行
    render(<Table {...paginationProps} />);
    
    // 初期状態では最初の10行が表示されていることを検証
    expect(screen.getByText('TICK0')).toBeInTheDocument();
    expect(screen.getByText('TICK9')).toBeInTheDocument();
    expect(screen.queryByText('TICK10')).not.toBeInTheDocument();
    
    // 次のページボタンをクリック
    const nextPageButton = screen.getByLabelText('次のページ');
    await userEvent.click(nextPageButton);
    
    // 次の10行が表示されていることを検証
    expect(screen.queryByText('TICK0')).not.toBeInTheDocument();
    expect(screen.getByText('TICK10')).toBeInTheDocument();
    expect(screen.getByText('TICK19')).toBeInTheDocument();
    
    // 前のページボタンをクリック
    const prevPageButton = screen.getByLabelText('前のページ');
    await userEvent.click(prevPageButton);
    
    // 最初の10行が再度表示されていることを検証
    expect(screen.getByText('TICK0')).toBeInTheDocument();
    expect(screen.getByText('TICK9')).toBeInTheDocument();
    expect(screen.queryByText('TICK10')).not.toBeInTheDocument();
  });
  
  it('カスタムレンダラーで列の表示をカスタマイズできる', () => {
    // カスタムレンダラーを持つカラム定義
    const customColumns = [
      ...columns.slice(0, -1), // actionsカラムを除外
      {
        key: 'price',
        label: '価格',
        sortable: true,
        // 価格を通貨形式でレンダリングするカスタムレンダラー
        render: (value, row) => `${row.currency === 'JPY' ? '¥' : '$'}${value.toLocaleString()}`
      }
    ];
    
    // カスタムデータ
    const customData = [
      { ...data[0], currency: 'USD' },
      { ...data[1], currency: 'USD' },
      { ...data[2], currency: 'JPY' }
    ];
    
    // テスト実行
    render(<Table columns={customColumns} data={customData} />);
    
    // カスタムレンダリングされた価格が表示されていることを検証
    expect(screen.getByText('$174.79')).toBeInTheDocument();
    expect(screen.getByText('$335.25')).toBeInTheDocument();
    expect(screen.getByText('¥2,100')).toBeInTheDocument();
  });
});
