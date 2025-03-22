#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
yfinance_fetcher.py - Pythonのyfinanceライブラリを使用して株価データと為替データを取得するスクリプト
株式ポートフォリオマネージャーアプリケーション用
"""

import yfinance as yf
import pandas as pd
import json
import sys
import argparse
from datetime import datetime, timedelta

def format_ticker(ticker):
    """
    ティッカーシンボルを整形する関数
    
    Args:
        ticker (str): 元のティッカーシンボル
    
    Returns:
        str: 整形されたティッカーシンボル
    """
    # 4桁数字の場合は.Tを追加（日本株）
    if ticker.isdigit() and len(ticker) == 4:
        return f"{ticker}.T"
    return ticker

def fetch_market_data(tickers):
    """
    複数の銘柄の市場データを取得する
    
    Args:
        tickers (str): カンマ区切りのティッカーシンボル
    
    Returns:
        dict: 取得結果を含む辞書
    """
    try:
        # ティッカーの整形
        ticker_list = [format_ticker(t.strip()) for t in tickers.split(',')]
        print(f"Fetching data for tickers: {ticker_list}", file=sys.stderr)
        
        # yfinanceでデータ取得
        data = yf.download(
            ticker_list,
            period="1d",
            progress=False,
            group_by="ticker"
        )
        
        # 単一銘柄の場合のデータ構造調整
        if len(ticker_list) == 1:
            ticker = ticker_list[0]
            if not data.empty and 'Close' in data.columns:
                price = data['Close'].iloc[-1]
                stock_info = get_stock_info(ticker)
                name = stock_info.get('name', ticker)
                currency = stock_info.get('currency', 'USD')
                
                return {
                    "success": True,
                    "data": {
                        "ticker": ticker,
                        "price": float(price),
                        "name": name,
                        "currency": currency,
                        "lastUpdated": datetime.now().isoformat()
                    }
                }
            else:
                return {"success": False, "error": f"No data found for {ticker}"}
        
        # 複数銘柄の場合の処理
        result = {}
        for ticker in ticker_list:
            try:
                if ticker in data.columns and 'Close' in data[ticker]:
                    price = data[ticker]['Close'].iloc[-1]
                    stock_info = get_stock_info(ticker)
                    
                    result[ticker] = {
                        "ticker": ticker,
                        "price": float(price),
                        "name": stock_info.get('name', ticker),
                        "currency": stock_info.get('currency', 'USD'),
                        "lastUpdated": datetime.now().isoformat()
                    }
                else:
                    print(f"No data for {ticker} in response", file=sys.stderr)
                    result[ticker] = {"error": "No data found"}
            except Exception as e:
                print(f"Error processing ticker {ticker}: {str(e)}", file=sys.stderr)
                result[ticker] = {"error": str(e)}
        
        return {"success": True, "data": result}
        
    except Exception as e:
        print(f"Error fetching market data: {str(e)}", file=sys.stderr)
        return {"success": False, "error": str(e)}

def get_stock_info(ticker):
    """
    銘柄の詳細情報を取得する
    
    Args:
        ticker (str): ティッカーシンボル
    
    Returns:
        dict: 銘柄情報
    """
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
        # 必要な情報を抽出
        name = info.get('shortName') or info.get('longName') or ticker
        currency = info.get('currency', 'USD')
        
        # デフォルト通貨設定（日本株の場合）
        if '.T' in ticker:
            currency = 'JPY'
        
        return {
            'name': name,
            'currency': currency
        }
    except Exception as e:
        print(f"Error getting stock info for {ticker}: {str(e)}", file=sys.stderr)
        # 日本株の場合はデフォルトをJPYにする
        default_currency = 'JPY' if '.T' in ticker else 'USD'
        return {'name': ticker, 'currency': default_currency}

def fetch_exchange_rate(from_currency, to_currency):
    """
    為替レートを取得する
    
    Args:
        from_currency (str): 変換元通貨コード (例: 'USD')
        to_currency (str): 変換先通貨コード (例: 'JPY')
    
    Returns:
        dict: 為替レート情報
    """
    try:
        # 同一通貨の場合は1を返す
        if from_currency == to_currency:
            return {
                "success": True,
                "rate": 1.0,
                "source": "Direct",
                "lastUpdated": datetime.now().isoformat()
            }
            
        # 通貨ペアのティッカー形式（例: USDJPY=X）
        ticker = f"{from_currency}{to_currency}=X"
        print(f"Fetching exchange rate for {ticker}", file=sys.stderr)
        
        # yfinanceでデータ取得
        data = yf.download(ticker, period="1d", progress=False)
        
        if not data.empty and 'Close' in data.columns:
            rate = data['Close'].iloc[-1]
            
            return {
                "success": True,
                "rate": float(rate),
                "source": "Python yfinance",
                "lastUpdated": datetime.now().isoformat()
            }
        else:
            # フォールバック値の定義
            fallback_rates = {
                'USDJPY': 150.0,
                'JPYUSD': 1/150.0,
                'EURJPY': 160.0,
                'EURUSD': 1.1
            }
            
            pair = f"{from_currency}{to_currency}"
            fallback_rate = fallback_rates.get(pair, 1.0)
            
            return {
                "success": False,
                "rate": fallback_rate,
                "source": "Fallback",
                "error": f"No exchange rate data found for {ticker}",
                "lastUpdated": datetime.now().isoformat()
            }
            
    except Exception as e:
        print(f"Error fetching exchange rate: {str(e)}", file=sys.stderr)
        # フォールバック値の定義
        fallback_rates = {
            'USDJPY': 150.0,
            'JPYUSD': 1/150.0,
            'EURJPY': 160.0,
            'EURUSD': 1.1
        }
        
        pair = f"{from_currency}{to_currency}"
        fallback_rate = fallback_rates.get(pair, 1.0)
        
        return {
            "success": False,
            "rate": fallback_rate,
            "source": "Fallback",
            "error": str(e),
            "lastUpdated": datetime.now().isoformat()
        }

def main():
    """
    メイン関数 - コマンドライン引数を解析して実行
    """
    parser = argparse.ArgumentParser(description='Fetch data from Yahoo Finance')
    parser.add_argument('--symbols', help='Comma-separated ticker symbols')
    parser.add_argument('--exchange_rate', help='Currency pair (e.g., USDJPY)')
    
    args = parser.parse_args()
    
    try:
        if args.symbols:
            result = fetch_market_data(args.symbols)
        elif args.exchange_rate:
            if len(args.exchange_rate) >= 6:
                from_currency = args.exchange_rate[:3]
                to_currency = args.exchange_rate[3:6]
                result = fetch_exchange_rate(from_currency, to_currency)
            else:
                result = {"success": False, "error": "Invalid exchange rate format. Use format like 'USDJPY'"}
        else:
            result = {"success": False, "error": "No valid arguments provided. Use --symbols or --exchange_rate"}
        
        # JSON形式で出力
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
