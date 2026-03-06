# Phase 4: 差別化機能 — TDD実装計画

**作成日**: 2026-03-05
**方針**: テスト駆動開発（TDD） — テストを先に書き、実装を後に行う

---

## TDD実装順序

### Week 1: ゴールベース投資トラッキング

```
Step 1: goalCalculations.ts（ユーティリティ）
  TEST FIRST → src/__tests__/unit/utils/goalCalculations.test.ts
  IMPLEMENT  → src/utils/goalCalculations.ts

Step 2: goalStore.ts（Zustandストア）
  TEST FIRST → src/__tests__/unit/stores/goalStore.test.ts
  IMPLEMENT  → src/stores/goalStore.ts

Step 3: GoalCard.tsx（表示コンポーネント）
  TEST FIRST → src/__tests__/unit/components/goals/GoalCard.test.tsx
  IMPLEMENT  → src/components/goals/GoalCard.tsx

Step 4: GoalDialog.tsx（作成/編集ダイアログ）
  TEST FIRST → src/__tests__/unit/components/goals/GoalDialog.test.tsx
  IMPLEMENT  → src/components/goals/GoalDialog.tsx

Step 5: GoalProgressSection.tsx（ダッシュボード統合）
  TEST FIRST → src/__tests__/unit/components/goals/GoalProgressSection.test.tsx
  IMPLEMENT  → src/components/goals/GoalProgressSection.tsx

Step 6: Dashboard.tsx + App.tsx統合
  UPDATE TEST → Dashboard.test.jsx
  IMPLEMENT   → Dashboard.tsx, App.tsx
```

### Week 2: 月次レポート + subscriptionStore拡張

```
Step 7: monthlyReport.ts（ユーティリティ）
  TEST FIRST → src/__tests__/unit/utils/monthlyReport.test.ts
  IMPLEMENT  → src/utils/monthlyReport.ts

Step 8: MonthlyReportCard.tsx
  TEST FIRST → src/__tests__/unit/components/reports/MonthlyReportCard.test.tsx
  IMPLEMENT  → src/components/reports/MonthlyReportCard.tsx

Step 9: subscriptionStore拡張（goalTracking機能制限）
  UPDATE TEST → subscriptionStore.test.ts に goalTracking テストケース追加
  IMPLEMENT   → subscriptionStore.ts

Step 10: portfolioDataEnricher拡張（goals連携）
  UPDATE TEST → portfolioDataEnricher テスト追加
  IMPLEMENT   → portfolioDataEnricher.ts
```

---

## データモデル

```typescript
interface InvestmentGoal {
  id: string;
  name: string;
  type: 'amount' | 'allocation';
  targetAmount?: number;      // amount型: 目標金額
  targetDate?: string;        // ISO date string
  currentAmount: number;      // 計算値: 現在の該当資産額
  progressPercent: number;    // 計算値: 達成率
  monthlyRequired?: number;   // 計算値: 月々の必要投資額
  createdAt: string;
  updatedAt: string;
}
```

## プラン制限

- Free: 1ゴールまで
- Standard: 5ゴールまで

## コンポーネント配置

Dashboard: PnLSummary → StrengthsWeaknessCard → **GoalProgressSection** → PortfolioScoreCard
