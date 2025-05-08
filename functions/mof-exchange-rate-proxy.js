/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: functions/mof-exchange-rate-proxy.js 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2023/04/25 13:45:00 
 * 
 * 更新履歴: 
 * - 2023/04/25 13:45:00 Koki Riho 初回作成
 * 
 * 説明: 
 * 日本の財務省（MOF）の為替レートデータを取得するためのサーバーレス関数。
 * 公式の為替レートを代替データソースとして使用し、他のAPIが利用できない場合のバックアップとして機能する。
 * HTMLコンテンツをスクレイピングして為替レートデータを抽出する仕組みを実装している。
 * 現在は簡易版のため、実際のスクレイピング処理は未実装でデフォルト値を返す。
 */
/**
 * 日本の財務省為替レートAPIへのプロキシ関数
 * 公式の為替レートを代替データソースとして使用
 */
const axios = require('axios');

exports.handler = async function(event, context) {
    // CORS ヘッダーを設定
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };
    
    // プリフライトリクエストをハンドリング
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight response' })
        };
    }
    
    try {
        // 財務省の為替レートデータを取得
        // このエンドポイントは実際のAPIではなく、HTMLページなのでスクレイピングが必要
        const response = await axios.get('https://www.mof.go.jp/english/policy/international_policy/reference/feio/index.htm', {
            headers: {
                'User-Agent': 'PortfolioManager/1.0'
            }
        });
        
        // HTMLからデータを抽出
        const html = response.data;
        const ratesData = extractExchangeRatesFromHTML(html);
        
        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Cache-Control': 'public, max-age=86400' // 24時間キャッシュ
            },
            body: JSON.stringify(ratesData)
        };
    } catch (error) {
        console.error('MOF exchange rate fetch error:', error);
        
        // エラーレスポンス
        return {
            statusCode: error.response?.status || 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to fetch exchange rate data from MOF',
                details: error.message
            })
        };
    }
};

/**
 * 財務省ページからの為替レートデータ抽出（簡易版）
 * 実際の実装ではより堅牢なHTMLパーサーを使用すべき
 */
function extractExchangeRatesFromHTML(html) {
    // 為替レートのデフォルト値（財務省データの抽出に失敗した場合のフォールバック）
    const defaultRates = {
        'USD/JPY': 150.0,
        'EUR/JPY': 160.0,
        'GBP/JPY': 190.0,
        'AUD/JPY': 95.0,
        'CAD/JPY': 105.0,
        'CHF/JPY': 145.0,
        'CNY/JPY': 20.0,
        'KRW/JPY': 0.1
    };
    
    try {
        // HTMLからテーブルデータを抽出する実装
        // ...実際の抽出ロジック...
        
        // 簡易版では財務省データの抽出は省略し、デフォルト値を返す
        return {
            rates: defaultRates,
            source: 'MOF Fallback',
            lastUpdated: new Date().toISOString(),
            note: 'これはデフォルト値です。実際のデータ抽出に失敗しました。'
        };
    } catch (error) {
        console.error('Exchange rate extraction error:', error);
        return {
            rates: defaultRates,
            source: 'Default Values',
            lastUpdated: new Date().toISOString(),
            error: true,
            note: 'データ抽出中にエラーが発生しました。デフォルト値を使用しています。'
        };
    }
}
