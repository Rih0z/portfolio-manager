# ポートフォリオマネージャー サーバー機能移行計画

**バージョン:** 1.0  
**作成日:** 2025-05-08  
**作成者:** [担当者名]

## 1. 移行の目的と背景

Netlify Functions の使用制限（月間125,000回）を超過したため、より効率的なサーバー構成へ移行する必要がある。現状では複数の個別関数が連鎖的に呼び出され、キャッシュ戦略も最適化されていない。この移行計画では、サーバー側機能の統合、キャッシュ機構の強化、専用サーバーへの移行を行い、安定したサービス提供を実現する。

## 2. 移行の概要

### 2.1 主要変更点

1. **関数の統合**: 複数の個別関数（米国株、日本株、投資信託、為替レート取得）を単一のAPIエンドポイントに統合
2. **キャッシュ強化**: データの有効期間を延長し、スクレイピング頻度を最小限に抑制
3. **専用サーバー**: レンタルサーバーを導入し、すべてのAPI機能を移行
4. **Python実装**: 日本株取得をPythonスクリプトで実装し、定期実行

### 2.2 アーキテクチャ変更

**現在のアーキテクチャ:**
```
[ユーザー] → [Netlify (静的コンテンツ + Functions)] → [各種外部API/スクレイピング]
```

**移行後のアーキテクチャ:**
```
[ユーザー] → [Netlify (静的コンテンツのみ)]
                ↓
              API呼び出し
                ↓
[レンタルサーバー (統合API + キャッシュ)] ← [Python日本株スクレイピング (定期実行)]
                ↓
[各種外部API/スクレイピング (最小限の呼び出し)]
```

## 3. 詳細実装計画

### 3.1 統合APIエンドポイントの実装

#### 3.1.1 単一APIエンドポイント設計

新しいAPIエンドポイントは、全ての株価・為替レート取得機能を統合し、以下の機能を提供する：

- **エンドポイント**: `/api/market-data`
- **メソッド**: GET
- **クエリパラメータ**:
  - `type`: 'us-stock', 'jp-stock', 'mutual-fund', 'exchange-rate'のいずれか
  - `symbols`: 取得する銘柄のシンボル（カンマ区切り）
  - `refresh`: キャッシュを強制的に更新するフラグ（オプション）

#### 3.1.2 コード例（Node.js/Express）

```javascript
const express = require('express');
const cors = require('cors');
const app = express();
const Redis = require('ioredis'); // Redisクライアント
const axios = require('axios');
const cheerio = require('cheerio');

// Redisクライアント初期化
const redis = new Redis(process.env.REDIS_URL);

// CORS設定
app.use(cors({
  origin: ['https://portfolio-wise.com', 'http://localhost:3000']
}));

// 統合市場データAPI
app.get('/api/market-data', async (req, res) => {
  try {
    const { type, symbols, refresh = 'false' } = req.query;
    const forceRefresh = refresh === 'true';
    
    // リクエストパラメータのバリデーション
    if (!type || !symbols) {
      return res.status(400).json({
        success: false,
        message: 'type と symbols パラメータは必須です'
      });
    }
    
    // キャッシュキーの生成
    const cacheKey = `market-data:${type}:${symbols}`;
    
    // キャッシュからデータを取得（更新フラグがない場合）
    if (!forceRefresh) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        console.log(`キャッシュヒット: ${cacheKey}`);
        return res.json(JSON.parse(cachedData));
      }
    }
    
    // キャッシュがない場合やリフレッシュが要求された場合、実際のデータを取得
    let data;
    let cacheTime;
    
    switch (type) {
      case 'us-stock':
        data = await fetchUSStockData(symbols.split(','));
        cacheTime = 60 * 60; // 1時間キャッシュ
        break;
      case 'jp-stock':
        data = await fetchJPStockData(symbols.split(','));
        cacheTime = 60 * 60; // 1時間キャッシュ
        break;
      case 'mutual-fund':
        data = await fetchMutualFundData(symbols.split(','));
        cacheTime = 60 * 60 * 3; // 3時間キャッシュ（更新頻度が低いため）
        break;
      case 'exchange-rate':
        data = await fetchExchangeRateData();
        cacheTime = 60 * 60 * 6; // 6時間キャッシュ
        break;
      default:
        return res.status(400).json({
          success: false,
          message: '不明なデータタイプです'
        });
    }
    
    // レスポンスオブジェクト
    const response = {
      success: true,
      data: data,
      source: 'live',
      lastUpdated: new Date().toISOString()
    };
    
    // キャッシュに保存
    await redis.set(cacheKey, JSON.stringify(response), 'EX', cacheTime);
    
    // レスポンス送信
    return res.json(response);
  } catch (error) {
    console.error('API エラー:', error);
    return res.status(500).json({
      success: false,
      message: 'データ取得中にエラーが発生しました',
      error: error.message
    });
  }
});

// サーバー起動
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});
```

### 3.2 高度なキャッシュ戦略

#### 3.2.1 キャッシュ期間の最適化

データタイプ別のキャッシュ期間設定：

| データタイプ | キャッシュ期間 | 理由 |
|------------|--------------|------|
| 米国株     | 1時間         | 取引時間中は価格変動があるため |
| 日本株     | 1時間         | 取引時間中は価格変動があるため |
| 投資信託   | 3時間         | 基準価額の更新頻度が低いため |
| 為替レート | 6時間         | 一日の中でも緩やかな変動のため |

#### 3.2.2 Redis実装

キャッシュストレージには Redis を使用し、以下の機能を実装：

- キー名に型とシンボルを含め、効率的に検索可能
- 自動有効期限切れ機能を利用（`EX`オプション）
- バッチ処理による複数銘柄の一括キャッシュ
- 緊急時のキャッシュフラッシュAPI

#### 3.2.3 スマートリフレッシュ

取引時間に基づく動的キャッシュ更新戦略：

- 日本市場取引時間（9:00-15:00 JST）: 30分キャッシュ
- 米国市場取引時間（9:30-16:00 EST）: 30分キャッシュ
- 市場閉場時間: 3-6時間キャッシュ
- 週末: 12時間キャッシュ

### 3.3 レンタルサーバー構成

#### 3.3.1 サーバー要件

- **OS**: Ubuntu 20.04 LTS
- **RAM**: 最低2GB（推奨4GB）
- **CPU**: 2コア以上
- **ストレージ**: 20GB SSD
- **帯域幅**: 月間1TB以上
- **技術スタック**: Node.js 16+, Redis, Python 3.9+

#### 3.3.2 推奨サーバー候補

1. **Digital Ocean**
   - 構成: Basic Droplet ($20/月)
   - スペック: 4GB RAM, 2CPUコア, 80GB SSD, 4TB転送量
   - メリット: 管理が容易、スケーリングが簡単

2. **Linode**
   - 構成: Shared CPU 4GB ($20/月)
   - スペック: 4GB RAM, 2CPUコア, 80GB SSD, 4TB転送量
   - メリット: 高パフォーマンス、APIが充実

3. **Vultr**
   - 構成: Cloud Compute ($20/月)
   - スペック: 4GB RAM, 2CPUコア, 80GB SSD, 4TB転送量
   - メリット: グローバルロケーション、高速ネットワーク

#### 3.3.3 サーバーセットアップ手順

1. サーバーインスタンス作成
2. SSH接続設定
3. 基本セキュリティ設定
   - ファイアウォール設定
   - SSH鍵認証
   - 不要なサービスの無効化
4. Node.js, Redis, Python環境のインストール
5. アプリケーションコードのデプロイ
6. Nginx設定（リバースプロキシ）
7. SSL証明書の設定（Let's Encrypt）
8. 監視とログ設定（PM2, Logrotate）

### 3.4 Python日本株取得実装

#### 3.4.1 機能概要

日本株価データを取得するPythonスクリプトを実装し、定期実行する。取得したデータはRDBMSまたはRedisに保存し、統合APIから参照できるようにする。

#### 3.4.2 使用ライブラリ

- **requests**: HTTPリクエスト
- **BeautifulSoup4**: HTML解析
- **pandas**: データ処理
- **yfinance**: バックアップデータソース
- **schedule**: 定期実行
- **redis**: キャッシュ連携

#### 3.4.3 スクリプト例

```python
#!/usr/bin/env python3
# jp_stock_scraper.py

import requests
import redis
import json
import random
import time
import schedule
import pandas as pd
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import yfinance as yf

# Redisに接続
redis_client = redis.Redis(host='localhost', port=6379, db=0)

# ユーザーエージェントリスト
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1'
]

def get_random_user_agent():
    """ランダムなユーザーエージェントを返す"""
    return random.choice(USER_AGENTS)

def scrape_yahoo_japan(code):
    """Yahoo Finance Japanから株価データを取得"""
    try:
        url = f"https://finance.yahoo.co.jp/quote/{code}.T"
        headers = {'User-Agent': get_random_user_agent()}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        price_element = soup.select_one('._3rXWJKZF')
        name_element = soup.select_one('._2NQoTMHk')
        
        if price_element and name_element:
            price = float(price_element.text.replace(',', ''))
            name = name_element.text.strip()
            
            return {
                'ticker': code,
                'price': price,
                'name': name,
                'currency': 'JPY',
                'source': 'Yahoo Finance Japan',
                'isStock': True,
                'isMutualFund': False
            }
        raise ValueError("価格または銘柄名の要素が見つかりません")
    except Exception as e:
        print(f"Yahoo Finance Japan からのスクレイピングエラー: {e}")
        return None

def fetch_from_yfinance(code):
    """yfinanceから株価データを取得（バックアップ）"""
    try:
        ticker = yf.Ticker(f"{code}.T")
        info = ticker.info
        history = ticker.history(period="1d")
        
        if not history.empty:
            return {
                'ticker': code,
                'price': float(history['Close'].iloc[-1]),
                'name': info.get('shortName', f"銘柄 {code}"),
                'currency': 'JPY',
                'source': 'yfinance',
                'isStock': True,
                'isMutualFund': False
            }
        raise ValueError("yfinanceからデータを取得できませんでした")
    except Exception as e:
        print(f"yfinance エラー: {e}")
        return None

def get_stock_data(code):
    """複数のソースから株価データを取得し、最初に成功したデータを返す"""
    # まずYahoo Financeからスクレイピング
    data = scrape_yahoo_japan(code)
    if data:
        return data
    
    # 失敗した場合はyfinanceを使用
    data = fetch_from_yfinance(code)
    if data:
        return data
    
    # すべてのソースが失敗した場合、キャッシュから最後の既知の値を取得
    cached_data = redis_client.get(f"jp-stock:{code}")
    if cached_data:
        data = json.loads(cached_data)
        data['source'] = f"{data['source']} (キャッシュ)"
        return data
    
    # 最終手段としてフォールバック値を返す
    return {
        'ticker': code,
        'price': 0.0,
        'name': f"銘柄 {code}",
        'currency': 'JPY',
        'source': 'Fallback',
        'isStock': True,
        'isMutualFund': False
    }

def update_stock_data(code_list):
    """指定された証券コードリストの株価データを更新"""
    now = datetime.now()
    # 日本の取引時間外（平日15:00-9:00）または週末はスキップ
    is_weekend = now.weekday() >= 5  # 5=土曜日, 6=日曜日
    is_trading_hours = 9 <= now.hour < 15
    is_weekday = now.weekday() < 5
    
    # 取引時間外で、前回の更新から3時間経過していない場合はスキップ
    last_update_key = "jp-stocks:last-update"
    last_update_str = redis_client.get(last_update_key)
    
    if last_update_str:
        last_update = datetime.fromisoformat(last_update_str.decode('utf-8'))
        hours_since_update = (now - last_update).total_seconds() / 3600
        
        if (not is_weekday or not is_trading_hours) and hours_since_update < 3:
            print(f"前回の更新から{hours_since_update:.1f}時間しか経過していないため、更新をスキップします")
            return
    
    print(f"{len(code_list)}銘柄の株価データを更新中...")
    
    # 各銘柄のデータを取得してRedisに保存
    for code in code_list:
        # 連続リクエストによるブロック防止のため、ランダムに遅延
        time.sleep(random.uniform(1.0, 3.0))
        data = get_stock_data(code)
        if data:
            # 個別銘柄データの保存（有効期限12時間）
            redis_client.set(f"jp-stock:{code}", json.dumps(data), ex=43200)
            print(f"銘柄 {code} を更新しました: ¥{data['price']} ({data['source']})")
    
    # 最終更新時刻を記録
    redis_client.set(last_update_key, now.isoformat())
    print(f"更新完了: {now.isoformat()}")

def main():
    # 監視対象の日本株コードリスト（例）
    jp_stocks = ['7203', '9984', '8306', '6758', '6861', '7974', '4755', '9432', '8058', '6501', '6702', '6503', '7267', '8316', '8031']
    
    # 初回実行
    update_stock_data(jp_stocks)
    
    # スケジュール設定：取引時間内（平日9:00-15:00）は1時間ごと、それ以外は3時間ごと
    schedule.every(1).hour.do(update_stock_data, jp_stocks)
    
    print("日本株スクレイパーが起動しました。Ctrl+Cで停止します。")
    
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)
    except KeyboardInterrupt:
        print("スクリプトを停止します")

if __name__ == "__main__":
    main()
```

#### 3.4.4 デプロイと監視

1. レンタルサーバー上にスクリプトをデプロイ
2. システム起動時に自動実行するよう設定（systemdサービス）
3. ログローテーションの設定
4. 監視ツールでプロセス監視（PM2, Supervisord等）

### 3.5 フロントエンド更新

#### 3.5.1 API接続先変更

```javascript
// 変更前: Netlify Functions呼び出し
const fetchStockData = async (ticker) => {
  const response = await axios.get(`/.netlify/functions/alpaca-api-proxy?symbol=${ticker}`);
  return response.data;
};

// 変更後: 新APIエンドポイント呼び出し
const fetchStockData = async (ticker) => {
  const isJapaneseStock = /^\d{4}(\.T)?$/.test(ticker);
  const isMutualFund = /^\d{7,8}C(\.T)?$/.test(ticker);
  
  const type = isJapaneseStock 
    ? 'jp-stock' 
    : isMutualFund 
      ? 'mutual-fund' 
      : 'us-stock';
  
  const response = await axios.get(`https://api.portfolio-wise.com/api/market-data?type=${type}&symbols=${ticker}`);
  return response.data;
};
```

#### 3.5.2 エラーハンドリング強化

```javascript
const fetchStockData = async (ticker) => {
  try {
    // 前略（APIリクエスト処理）
  } catch (error) {
    console.error(`API エラー: ${error.message}`);
    
    // ローカルキャッシュから取得を試みる
    const cachedData = getLocalCachedData(ticker);
    if (cachedData) {
      return {
        success: true,
        data: {
          ...cachedData,
          source: `${cachedData.source} (ローカルキャッシュ)`
        }
      };
    }
    
    // 最終手段のフォールバック
    return {
      success: true,
      data: {
        ticker,
        price: 0,
        name: `銘柄 ${ticker}`,
        currency: /^\d{4}(\.T)?$/.test(ticker) ? 'JPY' : 'USD',
        source: 'Fallback',
        isStock: true,
        isMutualFund: false
      }
    };
  }
};
```

#### 3.5.3 ローカルキャッシュ機能

```javascript
// ブラウザのローカルストレージを使用したキャッシュ機能
const saveToLocalCache = (data) => {
  try {
    const key = `stock-cache:${data.ticker}`;
    const cacheData = {
      ...data,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error('ローカルキャッシュ保存エラー:', error);
  }
};

const getLocalCachedData = (ticker) => {
  try {
    const key = `stock-cache:${ticker}`;
    const cachedDataStr = localStorage.getItem(key);
    
    if (!cachedDataStr) return null;
    
    const cachedData = JSON.parse(cachedDataStr);
    const cacheTime = new Date(cachedData.timestamp);
    const now = new Date();
    
    // 24時間以内のキャッシュのみ有効
    if ((now - cacheTime) < 24 * 60 * 60 * 1000) {
      return cachedData;
    }
    
    return null;
  } catch (error) {
    console.error('ローカルキャッシュ取得エラー:', error);
    return null;
  }
};
```

## 4. 移行スケジュール

### 4.1 事前準備フェーズ（1週間）

| 日 | タスク | 担当者 |
|----|------|-------|
| 1  | サーバー選定と契約 | |
| 2  | サーバー初期設定・セキュリティ対策 | |
| 3  | Node.js/Redis/Python環境構築 | |
| 3  | ドメイン設定とSSL証明書取得 | |

### 4.2 開発フェーズ（2週間）

| 日 | タスク | 担当者 |
|----|------|-------|
| 1-3 | 統合APIエンドポイント実装 | |
| 4-5 | Redisキャッシュ機構実装 | |
| 6-8 | Python日本株スクレイパー実装 | |
| 9-12 | フロントエンド更新とテスト | |
| 13-14 | 総合テストと調整 | |

### 4.3 移行フェーズ（1週間）

| 日 | タスク | 担当者 |
|----|------|-------|
| 1 | Netlify Functions無効化 | |
| 2 | 新APIエンドポイントへの切り替え | |
| 3-4 | モニタリングと調整 | |
| 5 | 最終確認と本番リリース | |
| 6-7 | 監視とバグ修正 | |

## 5. リスク管理

### 5.1 想定されるリスクと対策

| リスク | 影響度 | 可能性 | 対策 |
|-------|-------|-------|-----|
| サーバー障害 | 高 | 低 | バックアップサーバーの準備、監視体制の構築 |
| スクレイピング失敗 | 中 | 高 | 複数ソースからのフォールバック、キャッシュ戦略 |
| CORS問題 | 中 | 中 | 適切なCORS設定、プロキシの活用 |
| SSL証明書期限切れ | 高 | 低 | 自動更新の設定、監視アラート |
| Redis障害 | 高 | 低 | メモリ内キャッシュへのフォールバック |
| API使用料金超過 | 中 | 中 | 使用量の監視、制限の設定 |

### 5.2 フォールバック計画

移行中に問題が発生した場合のロールバック手順：

1. 新APIエンドポイントへのリクエストが失敗した場合、フロントエンドでローカルキャッシュにフォールバック
2. 深刻な問題が発生した場合、一時的にNetlify Functionsを再有効化
3. メンテナンスモードの準備と告知手順の確立

## 6. 監視とパフォーマンス指標

### 6.1 監視項目

- サーバーのCPU/メモリ/ディスク使用率
- APIレスポンス時間
- エラー率
- キャッシュヒット率
- API呼び出し回数
- スクレイピング成功率

### 6.2 アラート設定

- サーバーリソース使用率が80%を超えた場合
- API平均レスポンス時間が500msを超えた場合
- エラー率が5%を超えた場合
- スクレイピング成功率が90%を下回った場合

## 7. 移行成功の定義

移行は以下の条件を満たした場合に「成功」と判断する：

1. サービスの中断なく新APIに切り替えられたこと
2. APIのレスポンス時間が従来以下であること（200ms以下）
3. スクレイピング成功率が95%以上であること
4. キャッシュヒット率が80%以上であること
5. サーバーリソース使用率が平常時50%以下であること
6. 1週間無停止で運用できること

## 8. 今後の展望

今回の移行完了後、以下の追加改善を検討する：

1. CDNの導入による負荷分散
2. 有料APIの導入によるスクレイピング依存からの脱却
3. データの永続化（RDBMSの導入）
4. バックアップと復旧体制の強化
5. 負荷テストと自動スケーリング機能の実装

## 改訂履歴

| バージョン | 日付 | 内容 | 担当者 |
|---|---|---|---|
| 1.0 | 2025-05-08 | 初版作成 | |
