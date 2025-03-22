#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
yfinance_fetcher.py

Yahoo Financeから市場データを取得するためのPythonスクリプト
Netlify Functionsから呼び出され、コマンドライン引数を通じてリクエストを受け取る
"""

import yfinance as yf
import pandas as pd
import json
import sys
import argparse
import traceback
from datetime import datetime


def format_ticker(ticker):
    """
    ティッカーシンボルを正規化する
    
    Args:
        ticker (str): 元のティッカーシンボル
        
    Returns:
        str: 正規化されたティッカーシンボル
    """
    if ticker.isdigit() and len(ticker) == 4:
        return f"{ticker}.T"
    return ticker


def fetch_market_data(tickers_str):
    """
    複数の銘柄の市場データを一括取得する
    
    Args:
        tickers_str (str): カンマ区切りのティッカーシンボルリスト
        
    Returns:
        dict: 銘柄データを含む辞書
    """
    try:
        # ティッカー文字列をリストに分割し、各ティッカーを正規化
        tickers = [format_ticker(t.strip()) for t in tickers_str.split(',')]
        print(f"Fetching data for tickers: {tickers}")
        
        # yfinanceでデータをダウンロード
        data = yf.download(
            tickers, 
            period="1d",    # 1日分のデータ
            progress=False, # 進捗表示を無効化
            group_by="ticker" # ティッカーでグルーピング
        )
        
        # データを構造化
        result = {}
        for ticker in tickers:
            try:
                # 単一銘柄の場合と複数銘柄の場合でデータ構造が異なる
                if len(tickers) == 1:
                    ticker_data = data
                else:
                    ticker_data = data[ticker]
                
                # Closeの値を取得（終値）
                if not ticker_data.empty and 'Close' in ticker_data.columns:
                    close_price = ticker_data['Close'].iloc[-1]
                else:
                    # 別の方法で試行
                    ticker_obj = yf.Ticker(ticker)
                    hist = ticker_obj.history(period="1d")
                    if not hist.empty and 'Close' in hist.columns:
                        close_price = hist['Close'].iloc[-1]
                    else:
                        print(f"No data found for ticker: {ticker}")
                        continue
                
                # 詳細情報を取得
                ticker_obj = yf.Ticker(ticker)
                info = ticker_obj.info
                
                # 通貨情報を取得
                currency = info.get('currency', 'USD')
                if ticker.endswith('.T'):
                    currency = 'JPY'
                
                # 銘柄名を取得
                name = info.get('shortName', info.get('longName', ticker))
                
                # 結果に追加
                result[ticker] = {
                    'ticker': ticker,
                    'name': name,
                    'price': float(close_price),
                    'currency': currency,
                    'longName': info.get('longName', ''),
                    'shortName': info.get('shortName', ''),
                    'exchange': info.get('exchange', ''),
                    'quoteType': info.get('quoteType', '')
                }
            except Exception as e:
                print(f"Error processing ticker {ticker}: {str(e)}")
                traceback.print_exc()
        
        # 結果を返す
        return {
            "success": True,
            "data": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error fetching market data: {str(e)}")
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "stack": traceback.format_exc()
        }


def fetch_exchange_rate(from_currency, to_currency):
    """
    為替レートを取得する
    
    Args:
        from_currency (str): 元の通貨コード（例: 'USD'）
        to_currency (str): 変換先の通貨コード（例: 'JPY'）
        
    Returns:
        dict: 為替レート情報を含む辞書
    """
    try:
        # 通貨ペアのティッカーを作成
        ticker = f"{from_currency}{to_currency}=X"
        print(f"Fetching exchange rate for: {ticker}")
        
        # yfinanceでデータを取得
        currency_ticker = yf.Ticker(ticker)
        hist = currency_ticker.history(period="1d")
        
        if hist.empty or 'Close' not in hist.columns:
            return {
                "success": False,
                "error": f"No exchange rate data found for {ticker}"
            }
        
        # 為替レートを取得
        rate = hist['Close'].iloc[-1]
        print(f"Exchange rate {from_currency}/{to_currency}: {rate}")
        
        return {
            "success": True,
            "rate": float(rate),
            "from_currency": from_currency,
            "to_currency": to_currency,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error fetching exchange rate: {str(e)}")
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "stack": traceback.format_exc()
        }


if __name__ == "__main__":
    try:
        # コマンドライン引数をパース
        parser = argparse.ArgumentParser(description='Yahoo Finance data fetcher')
        parser.add_argument('--symbols', help='Comma-separated list of ticker symbols')
        parser.add_argument('--exchange_rate', help='Exchange rate pair (e.g. USDJPY)')
        
        args = parser.parse_args()
        
        # 結果を格納する変数
        result = None
        
        # シンボルが指定されている場合は市場データを取得
        if args.symbols:
            result = fetch_market_data(args.symbols)
        # 為替レートが指定されている場合は為替レートを取得
        elif args.exchange_rate:
            # 通貨コードを分離（例: USDJPYからUSDとJPYを取得）
            if len(args.exchange_rate) >= 6:
                from_currency = args.exchange_rate[:3]
                to_currency = args.exchange_rate[3:6]
                result = fetch_exchange_rate(from_currency, to_currency)
            else:
                result = {
                    "success": False,
                    "error": f"Invalid exchange rate format: {args.exchange_rate}"
                }
        else:
            result = {
                "success": False,
                "error": "No arguments provided. Please specify --symbols or --exchange_rate."
            }
        
        # 結果をJSON形式で標準出力に出力
        print(json.dumps(result))
        sys.exit(0)
    except Exception as e:
        # エラー情報をJSON形式で標準出力に出力
        error_result = {
            "success": False,
            "error": str(e),
            "stack": traceback.format_exc()
        }
        print(json.dumps(error_result))
        sys.exit(1)
