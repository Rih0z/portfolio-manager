# ユーザー入力最適化戦略

## 概要
心理学的アプローチとゲーミフィケーションを活用し、ユーザーが楽しみながら必要な情報を入力できる仕組みの設計。

## 心理学的原則

### 1. 認知負荷の軽減
- **チャンク化**: 質問を小さな単位に分割
- **プログレッシブ・ディスクロージャー**: 必要な情報を段階的に表示
- **デフォルト値**: 一般的な選択肢を事前選択

### 2. 内発的動機づけ
- **自己決定理論**: 自律性・有能感・関係性の充足
- **フロー理論**: 適切な難易度とフィードバック
- **達成感の演出**: 小さな成功体験の積み重ね

### 3. 行動経済学の活用
- **ナッジ理論**: 望ましい行動への gentle push
- **損失回避**: 「入力しないと失うもの」の提示
- **社会的証明**: 他のユーザーの行動を参考に

## Withアプリ型アンケート設計

### フェーズ1: ウェルカム診断（5分で完了）

#### 👤 年齢とライフステージ
```
質問1/12
「あなたの年齢を教えてください」

[年齢スライダー]
━━━━━●━━━━━━━━
20歳    35歳    65歳

あなたの年代の人気投資スタイル:
• 20代: 成長重視（73%）🚀
• 30代: バランス型（68%）⚖️
• 40代: 安定重視（62%）🛡️
• 50代+: 資産保全（71%）🏦
```

#### 🎯 投資スタイル診断
```
質問2/12
「もし今、100万円もらったら？」

A. 🏦 堅実に貯金
   └→ あなたは「安定重視タイプ」かも

B. 📈 半分投資、半分貯金
   └→ あなたは「バランスタイプ」かも

C. 🚀 全額投資にチャレンジ
   └→ あなたは「成長重視タイプ」かも

[年齢に応じて選択肢の表現を調整]
```

#### 🌍 投資対象市場の選択
```
質問3/12
「どの市場に投資したいですか？」（複数選択可）

[カード式選択UI - タップで選択/解除]

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   🇺🇸        │  │   🇯🇵        │  │   🌐        │
│   米国市場    │  │   日本市場    │  │   全世界     │
│             │  │             │  │             │
│ S&P500      │  │ 日経225     │  │ オルカン     │
│ NASDAQ      │  │ TOPIX       │  │ VTI         │
│ 個別米国株   │  │ 個別日本株   │  │ 新興国含む   │
└─────────────┘  └─────────────┘  └─────────────┘

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   🏠        │  │   💎        │  │   📊        │
│   REIT      │  │  仮想通貨    │  │   債券       │
│             │  │             │  │             │
│ 不動産投資   │  │ ビットコイン │  │ 国債・社債   │
│ J-REIT      │  │ イーサリアム │  │ 先進国債券   │
│ 米国REIT    │  │ その他暗号資産│  │ 新興国債券   │
└─────────────┘  └─────────────┘  └─────────────┘

人気の組み合わせ:
• 🥇 米国 + 日本 (68%)
• 🥈 全世界のみ (23%)
• 🥉 米国 + 日本 + REIT (15%)
```

#### 💭 価値観マッチング
```
質問4/12
「理想の未来はどれ？」

[カード式選択UI - スワイプで選択]

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   🏖️        │  │   🏡        │  │   ✈️        │
│             │  │             │  │             │
│ 南国で      │  │ 家族と      │  │ 世界中を    │
│ のんびり    │  │ 幸せに      │  │ 自由に旅    │
└─────────────┘  └─────────────┘  └─────────────┘
```

### フェーズ2: パーソナライティ深掘り（3分）

#### 🎨 ビジュアル選択式
```
「あなたの理想の資産グラフは？」

[3つのグラフから直感的に選択]
A. 着実な右肩上がり
B. 波はあるが高成長
C. 安定第一の横ばい
```

#### 🎮 ゲーム要素
```
「投資シミュレーションゲーム」
- 仮想100万円でプチ投資体験
- リスクとリターンを体感
- 結果から性格を分析
```

### フェーズ3: 具体的な情報（2分）

#### 📊 スライダー式入力
```
「毎月の投資額は？」
[スライダーで直感的に調整]
━━━━━●━━━━━━━━
¥10,000     ¥50,000

「人気の金額: ¥30,000」
```

#### 🎯 目標設定
```
「夢を叶える金額は？」

人気の目標:
• 🏠 マイホーム資金 3,000万円
• 👴 老後の安心 5,000万円
• 🌏 早期リタイア 1億円
• ✏️ カスタム入力
```

## 入力を楽しくする工夫

### 1. マイクロインタラクション
```javascript
// 入力完了時のアニメーション例
const celebrateCompletion = () => {
  // 紙吹雪エフェクト
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
  
  // 励ましメッセージ
  showMessage("素晴らしい！あと少しです✨");
};
```

### 2. パーソナライズされた質問
```javascript
// 前の回答に基づいて質問を調整
const getNextQuestion = (previousAnswers) => {
  if (previousAnswers.age < 30) {
    return "将来の夢を教えてください🌟";
  } else if (previousAnswers.hasKids) {
    return "お子様の教育資金について考えていますか？👨‍👩‍👧‍👦";
  }
  // カスタマイズされた質問で関連性を高める
};
```

### 3. インスタントフィードバック
```javascript
// リアルタイムで結果を表示
const showInstantInsight = (answer) => {
  return {
    "conservative": "堅実な選択ですね！リスクを抑えた運用が向いています",
    "balanced": "バランス感覚が素晴らしい！分散投資がおすすめです",
    "aggressive": "チャレンジ精神旺盛！成長株への投資も検討できそうです"
  }[answer.type];
};
```

## AIプロンプト生成の最適化

### ユーザー資産情報の取得プロンプト
```javascript
const generateAssetGatheringPrompt = () => {
  return `
以下の会話形式で、ユーザーの投資情報を優しく聞き出してください：

1. まず現在保有している株式や投資信託について聞く
   「どんな銘柄をお持ちですか？例えば『eMAXIS Slim全世界株式を100口』のように教えてください」

2. それぞれの現在価格を確認
   「その銘柄の現在の価格をご存知でしたら教えてください。分からない場合は大体の金額でも構いません」

3. 為替情報の確認（必要な場合）
   「米国株をお持ちの場合、現在の為替レート（1ドル何円か）を教えてください」

4. 追加投資予定の確認
   「今後の投資予定（毎月の積立額など）があれば教えてください」

会話の最後に、以下のJSON形式でまとめてください：
{
  "portfolio": {
    "assets": [
      {
        "ticker": "銘柄コード",
        "name": "銘柄名",
        "quantity": 保有数,
        "currentPrice": 現在価格,
        "currency": "JPY/USD",
        "priceSource": "user_input",
        "lastUpdated": "2024-02-03"
      }
    ],
    "exchangeRate": {
      "USD_JPY": 150.00,
      "source": "user_input",
      "date": "2024-02-03"
    },
    "monthlyInvestment": {
      "amount": 50000,
      "currency": "JPY"
    }
  },
  "userProfile": {
    "investmentExperience": "初心者/中級/上級",
    "riskTolerance": "保守的/バランス型/積極的",
    "primaryGoal": "ユーザーの主な目標"
  }
}
`;
};
```

### インテリジェントな情報抽出
```javascript
const extractPortfolioFromConversation = (aiResponse) => {
  // AI応答から自然言語とJSONを分離
  const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
  
  if (jsonMatch) {
    try {
      const portfolioData = JSON.parse(jsonMatch[1]);
      
      // データ検証と正規化
      return {
        success: true,
        data: normalizePortfolioData(portfolioData),
        summary: generatePortfolioSummary(portfolioData)
      };
    } catch (error) {
      return {
        success: false,
        error: "データの解析に失敗しました",
        suggestion: "もう一度情報を整理してお話しください"
      };
    }
  }
};

// ポートフォリオデータの正規化
const normalizePortfolioData = (data) => {
  return {
    assets: data.portfolio.assets.map(asset => ({
      ...asset,
      ticker: asset.ticker.toUpperCase(),
      currentPrice: parseFloat(asset.currentPrice),
      quantity: parseFloat(asset.quantity),
      totalValue: parseFloat(asset.currentPrice) * parseFloat(asset.quantity),
      lastUpdated: new Date().toISOString()
    })),
    exchangeRate: {
      ...data.portfolio.exchangeRate,
      rate: parseFloat(data.portfolio.exchangeRate.USD_JPY),
      lastUpdated: new Date().toISOString()
    },
    monthlyInvestment: data.portfolio.monthlyInvestment,
    profile: data.userProfile
  };
};
```

### 対話型ポートフォリオ入力UI
```javascript
// チャット形式での資産入力
const ChatBasedPortfolioInput = () => {
  const messages = [
    {
      type: 'bot',
      text: 'こんにちは！あなたの投資を一緒に整理しましょう。まず、どんな株や投資信託をお持ちですか？',
      suggestions: ['日本株を持っています', '投資信託があります', '米国株も持っています']
    },
    {
      type: 'user',
      text: 'eMAXIS Slimの全世界株式を持っています'
    },
    {
      type: 'bot',
      text: '素晴らしい選択ですね！何口くらいお持ちですか？',
      inputType: 'number',
      placeholder: '例: 1000'
    }
  ];
  
  return (
    <div className="chat-container">
      {messages.map((msg, idx) => (
        <ChatMessage key={idx} {...msg} />
      ))}
    </div>
  );
};
```

### 年齢情報を含むプロンプト生成
```javascript
// 年齢とライフステージ情報の収集
const collectAgeAndLifeStage = (userData) => {
  return {
    age: userData.age,
    remainingYearsToRetirement: 65 - userData.age,
    lifeStage: userData.age < 30 ? "キャリア形成期" :
               userData.age < 40 ? "家族形成期" :
               userData.age < 50 ? "教育費準備期" :
               userData.age < 60 ? "退職準備期" :
               "退職後",
    potentialLifeEvents: getLifeEvents(userData)
  };
};

// ライフイベント情報の整理
const getLifeEvents = (userData) => {
  const events = [];
  
  if (userData.age < 35 && !userData.isMarried) {
    events.push("結婚の可能性");
  }
  if (userData.age < 45 && !userData.hasHome) {
    events.push("住宅購入の検討");
  }
  if (userData.age < 55 && userData.hasChildren) {
    events.push("子供の教育費準備");
  }
  if (userData.age > 40) {
    events.push("親の介護の可能性");
  }
  events.push("老後資金の準備");
  
  return events;
};

// AIへ渡すための年齢関連情報のフォーマット
const formatAgeInfoForAI = (userData) => {
  const ageInfo = collectAgeAndLifeStage(userData);
  
  return `
【基本情報】
- 年齢: ${userData.age}歳
- 職業: ${userData.occupation}
- 家族構成: ${userData.familyStatus}
- 退職まで: 約${ageInfo.remainingYearsToRetirement}年

【投資対象市場】
- 希望する投資先: ${userData.targetMarkets.join('、')}
- 日本で購入可能な商品に限定: ${userData.japanAvailableOnly ? 'はい' : 'いいえ'}

【考慮すべきライフイベント】
${ageInfo.potentialLifeEvents.map(event => `- ${event}`).join('\n')}

【現在の投資状況】
- 投資経験: ${userData.investmentExperience}
- リスク許容度（自己申告）: ${userData.riskTolerance}
- 毎月の投資可能額: ${userData.monthlyInvestment}円

この情報を基に、私の年齢とライフステージに最適な投資戦略を提案してください。
具体的なアセットアロケーションの比率も教えてください。
`;
};
```

### 市場選択の情報構造化
```javascript
// 投資対象市場の管理
const INVESTMENT_MARKETS = {
  US: {
    name: '米国市場',
    icon: '🇺🇸',
    examples: ['S&P500', 'NASDAQ', '個別米国株'],
    japanAvailable: true
  },
  JAPAN: {
    name: '日本市場',
    icon: '🇯🇵',
    examples: ['日経225', 'TOPIX', '個別日本株'],
    japanAvailable: true
  },
  GLOBAL: {
    name: '全世界',
    icon: '🌐',
    examples: ['オルカン', 'VTI', '新興国含む'],
    japanAvailable: true
  },
  REIT: {
    name: 'REIT',
    icon: '🏠',
    examples: ['J-REIT', '米国REIT', '不動産投資'],
    japanAvailable: true
  },
  CRYPTO: {
    name: '仮想通貨',
    icon: '💎',
    examples: ['ビットコイン', 'イーサリアム', 'その他暗号資産'],
    japanAvailable: true
  },
  BONDS: {
    name: '債券',
    icon: '📊',
    examples: ['国債・社債', '先進国債券', '新興国債券'],
    japanAvailable: true
  }
};

// 市場選択データの処理
const processMarketSelection = (selectedMarkets) => {
  return selectedMarkets.map(market => ({
    market: market,
    name: INVESTMENT_MARKETS[market].name,
    examples: INVESTMENT_MARKETS[market].examples,
    japanAvailable: INVESTMENT_MARKETS[market].japanAvailable
  }));
};
```

### パーソナライズされたプロンプト生成
```javascript
const generateOptimizedPrompt = (userData) => {
  // ユーザーの情報を整理してAIに渡す
  const userContext = `
私は${userData.age}歳の${userData.occupation}です。
${userData.dream}を実現したいと考えています。

【私の状況】
${formatAgeInfoForAI(userData)}

【投資対象の希望】
- 興味のある市場: ${userData.targetMarkets.map(market => 
  INVESTMENT_MARKETS[market].name
).join('、')}
- 具体的な投資先例: ${userData.targetMarkets.map(market => 
  INVESTMENT_MARKETS[market].examples.join('/')
).join('、')}

【現在のポートフォリオ】
${userData.portfolio.assets.map(asset => 
  `- ${asset.name}: ${asset.quantity}口（評価額: ${asset.totalValue.toLocaleString()}円）`
).join('\n')}
総資産額: ${userData.portfolio.totalValue.toLocaleString()}円

【私の価値観】
- ${userData.values.join('\n- ')}

【不安に思っていること】
- ${userData.concerns.join('\n- ')}

上記の情報を基に、以下について教えてください：
1. 私の年齢と状況に合った投資戦略は？
2. 選択した市場での最適なポートフォリオ配分は？
3. リスクとリターンのバランスはどう取るべき？
4. 今後注意すべきライフイベントと対策は？
5. 具体的なアクションプランは？

※日本在住のため、日本で購入可能な商品での提案をお願いします。
`;

  return userContext;
};

// シンプルな情報収集用プロンプト
const generateInfoGatheringPrompt = () => {
  return `
あなたの投資プランを一緒に考えるために、いくつか質問させてください：

1. 年齢と職業を教えてください
2. 将来の夢や目標は何ですか？
3. 現在投資している銘柄があれば教えてください
4. 投資に対する不安はありますか？
5. 大切にしている価値観は何ですか？

これらの情報を教えていただければ、あなたに最適な投資戦略を一緒に考えることができます。
`;
};
```

## 実装優先順位

### Phase 1（1週間）
1. ✅ ビジュアル診断UI
2. ✅ プログレスバー
3. ✅ 即時フィードバック

### Phase 2（2週間）
1. 🔄 AIプロンプト最適化
2. 🔄 結果の視覚化
3. 🔄 共有機能

### Phase 3（1ヶ月）
1. 📊 詳細分析
2. 🎮 ゲーミフィケーション
3. 🤝 コミュニティ連携

## KPI

### エンゲージメント指標
- アンケート完了率: 80%以上（現状: 推定30%）
- 平均入力時間: 10分以内
- 再入力率: 月1回以上

### 満足度指標
- 「楽しかった」評価: 4.5/5.0
- 推奨意向(NPS): 70以上
- 継続利用率: 90%以上

## まとめ

この設計により、ユーザーは「面倒なアンケート」ではなく「自分を知る楽しい診断」として入力プロセスを体験できます。心理学的アプローチとモダンなUIの組み合わせで、必要な情報を自然に、楽しく収集することが可能になります。