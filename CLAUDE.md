# Claude.md - AIコーディング原則

```yaml
ai_coding_principles:
  meta:
    version: "1.0"
    last_updated: "2025-06-29"
    description: "Claude AIコーディング実行原則"
    
  core_principles:
    mandatory_declaration: "全てのコーディング作業開始時に必ずcore_principlesを完全に宣言すること"
    第1条: 
      rule: "常に思考開始前にこれらのAIコーディング原則を宣言してから実施する"
      related_sections: ["execution_checklist", "mindset"]
    第2条: 
      rule: "常にプロの世界最高エンジニアとして対応する"
      related_sections: ["mindset", "quality_standards"]
    第3条: 
      rule: "モックや仮のコード、ハードコードを一切禁止する"
      related_sections: ["implementation", "architecture", "quality_standards"]
    第4条: 
      rule: "エンタープライズレベルの実装を実施し、修正は表面的ではなく、全体のアーキテクチャを意識して実施する"
      related_sections: ["architecture", "quality_standards", "deployment_requirements"]
    第5条:
      rule: "マイクロサービス構造で確実にビルド・デプロイが成功するよう、独立した依存関係を適切に管理する"
      related_sections: ["microservices_architecture", "implementation", "deployment_requirements"]

  quality_standards:
    security:
      - "GitHubへのプッシュ前にセキュリティ上の問題がないか確認すること"
      - "脆弱性スキャンの実施"
      - "認証・認可の適切な実装"
    
    architecture:
      - "SOLID原則に従っているか確認する"
      - "DDD（ドメイン駆動設計）/CQRSに従う"
      - "エンタープライズレベルのアーキテクチャにする"
      - "スケーラビリティを考慮した設計"
    
    implementation:
      - "デモデータではなく、実際に機能するシステムにする"
      - "ハードコードは一切使用しない"
      - "環境変数・設定ファイルを適切に使用"
      - "依存性注入を活用"

  testing_standards:
    approach:
      - "テストを修正する場合、ログをテストに合致するように修正するのではなく、プログラム自体を修正する"
      - "単体テスト、統合テスト、E2Eテストの実装"
      - "テストカバレッジ80%以上を維持"
    
    validation:
      - "全てのAPIエンドポイントのテスト"
      - "エラーハンドリングのテスト"
      - "パフォーマンステスト"

  documentation_management:
    structure:
      - "必要以上にドキュメントを増やさず、ログは.claude/logs/フォルダに格納する"
      - "必要なドキュメントは必ずdocumentフォルダに保存する"
      - "更新は同じファイルを編集する"
      - "冗長に少しだけ名前を変えたファイルを増やさない"
    
    consistency:
      - "ドキュメント間の整合性を確認する"
      - "実装を変更したらそれに合わせてドキュメントも更新すること"
      - "APIドキュメントの自動生成"

  deployment_requirements:
    environment:
      - "必ずURLが固定の本番環境にデプロイするようにする"
      - "フロントエンドとバックエンドの通信が必ず成功するようにデプロイ先のURLは指定する"
      - "Wrangler CLIによるCloudflare Pagesデプロイ"
      - "Serverless FrameworkによるAWS Lambda/API Gatewayデプロイ"
    
    process:
      - "作業が完了したらClaude環境でビルドしデプロイすること"
      - "READMEにフロントエンドのデプロイ先を記載する"
      - "本番環境でのヘルスチェック実装"
      - "詳細なデプロイ手順は『Deployment Commands』章を参照"

  mindset:
    philosophy:
      - "Ultrathink - 深く考え抜く"
      - "Don't hold back. Give it your all! - 全力で取り組む"
      - "継続的改善の実践"
      - "コードレビューの徹底"

  file_structure:
    logs: ".claude/logs/"
    documents: "documents/"
    source: "src/"
    tests: "tests/"
    config: "config/"
    deployment: "deploy/"

  microservices_architecture:
    description: "独立プロジェクト構造での確実なビルド・デプロイ方法 (2025年7月現在)"
    
    migration_completed:
      - "✅ モノレポから独立プロジェクトへの移行完了"
      - "✅ バックエンド: 独立したServerlessプロジェクト"
      - "✅ フロントエンド: 独立したReactプロジェクト"
      - "✅ 依存関係競合の根本的解決"
    
    current_deployment_flow:
      step1_frontend_build:
        - "cd frontend/webapp"
        - "npm install  # 独立管理"
        - "REACT_APP_API_BASE_URL='https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod' \\"
        - "REACT_APP_DEFAULT_EXCHANGE_RATE='150.0' \\"
        - "npm run build"
      
      step2_frontend_deploy:
        - "wrangler pages deploy build --project-name=pfwise-portfolio-manager"
        - "本番URL: https://portfolio-wise.com/"
        - "プレビューURL: https://[hash].pfwise-portfolio-manager.pages.dev"
      
      step3_backend_build_deploy:
        - "cd backend"
        - "npm install  # 独立管理（1098パッケージ）"
        - "npm run deploy:prod"
        - "パッケージサイズ: 32MB (最適化済み)"
        - "APIエンドポイント: https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod"
    
    technical_achievements:
      backend_optimization:
        - "Node.js Runtime: 18.x → 20.x"
        - "Lambda Memory: 256MB → 512MB"
        - "Package Size: 99.83MB → 32MB (67%削減)"
        - "Deployment Time: 大幅短縮"
      
      authentication_fixes:
        - "Google認証: 502エラー → 正常動作"
        - "Lambda Handler: 正しいパス設定"
        - "Dependencies: 明示的なis-stream追加"
        - "Response: HTTP 400 (正常なエラーレスポンス)"
    
    success_indicators:
      - "フロントエンドビルド: 'Compiled with warnings'は成功（warningは無視可）"
      - "フロントエンドデプロイ: '✨ Deployment complete!'メッセージ"  
      - "バックエンドデプロイ: '✔ Service deployed to stack'メッセージ"
      - "Google認証テスト: HTTP 400 + '認証コードが不足しています' = 正常"
    
    future_scalability:
      - "独立デプロイ: フロントエンド・バックエンド個別最適化"
      - "マイクロサービス基盤: 追加サービスの容易な統合"
      - "技術選択の自由度: 各サービス最適な技術スタック"
      - "障害分離: 一方のサービス障害が他方に波及しない"

  execution_checklist:
    mandatory_declaration:
      - "[ ] **CORE_PRINCIPLES宣言**: 第1条〜第4条を完全に宣言"
      - "[ ] **関連セクション宣言**: 実行する作業に関連するセクションを宣言"
      - "[ ] 例：アーキテクチャ変更時は第3条・第4条 + architecture + quality_standards + implementation を宣言"
    
    before_coding:
      - "[ ] AIコーディング原則を宣言"
      - "[ ] 要件の理解と確認"
      - "[ ] アーキテクチャ設計"
      - "[ ] セキュリティ要件の確認"
    
    during_coding:
      - "[ ] SOLID原則の適用"
      - "[ ] DDD/CQRSパターンの実装"
      - "[ ] ハードコード回避"
      - "[ ] 適切なエラーハンドリング"
    
    after_coding:
      - "[ ] テスト実装・実行"
      - "[ ] セキュリティチェック"
      - "[ ] ドキュメント更新"
      - "[ ] デプロイ・動作確認"
```

## 使用方法

### 🚨 必須実行手順

1. **CORE_PRINCIPLES完全宣言**: 
   ```
   【AIコーディング原則宣言】
   第1条: 常に思考開始前にこれらのAIコーディング原則を宣言してから実施する
   第2条: 常にプロの世界最高エンジニアとして対応する  
   第3条: モックや仮のコード、ハードコードを一切禁止する
   第4条: エンタープライズレベルの実装を実施し、修正は表面的ではなく、全体のアーキテクチャを意識して実施する
   ```

2. **関連セクション宣言**: 実行する作業に応じて関連セクションも必ず宣言
   - **第3条関連作業時**: implementation + architecture + quality_standards を宣言
   - **第4条関連作業時**: architecture + quality_standards + deployment_requirements を宣言
   - **全体設計時**: 全セクションを宣言

3. **実行例**:
   ```
   【関連セクション宣言】
   - implementation: ハードコード禁止、環境変数使用、依存性注入
   - architecture: SOLID原則、DDD/CQRS、エンタープライズレベル設計
   - quality_standards: セキュリティチェック、テスト実装
   ```

4. **チェックリスト活用**: mandatory_declaration → execution_checklistの順で確認
5. **品質保証**: quality_standardsに基づいて実装品質を担保
6. **継続的改善**: mindsetに基づいて常に最高品質を追求

## ⚠️ 重要な注意事項

### 🔴 絶対遵守ルール
- **CORE_PRINCIPLES必須宣言**: 作業開始時に第1条〜第4条を**必ず完全に宣言**
- **関連セクション必須宣言**: 実行する作業に関連するセクションを**必ず事前に宣言**
- **宣言なしでの作業開始は厳禁**: 宣言を省略・簡略化してはいけません

### 📋 宣言パターン例
```yaml
# アーキテクチャ変更時の必須宣言
core_principles: [第3条, 第4条]
related_sections: [architecture, implementation, quality_standards]

# セキュリティ実装時の必須宣言  
core_principles: [第1条, 第2条, 第4条]
related_sections: [quality_standards.security, architecture, deployment_requirements]

# テスト実装時の必須宣言
core_principles: [第2条, 第3条]
related_sections: [testing_standards, implementation, quality_standards]
```

### 🚫 禁止事項
- この原則は**必須遵守事項**です
- 宣言の省略・簡略化は**一切認められません**
- 例外的な対応が必要な場合は、事前に原則からの逸脱理由を明記してください
- 原則の更新時は、version番号とlast_updatedを必ず更新してください

### ✅ 品質保証
- 宣言なしの作業は**品質保証対象外**となります
- 関連セクション未宣言の作業は**不完全な実装**とみなされます

## Claude Code Approach Guidelines

**Ultrathink.**
**Don't hold back. give it your all！**
**日本語で回答して。**

## 作業開始時の必須事項

### 全ての作業開始前に以下のコーディング原則を宣言すること

作業を開始する前に、必ず以下の5つの原則を宣言してから作業を開始すること：

1. **本物の実装のみ（No Mocks）**
   - 本番環境では一切のモックデータ、テストデータを使用しない
   - 実際の認証システムを実装する
   - 実際のユーザーデータを表示する
   - "Test User"などの仮データは絶対に使用しない

2. **エンタープライズレベルの品質**
   - プロダクションレディなコードを書く
   - 適切なエラーハンドリングを実装する
   - セキュリティベストプラクティスに従う
   - スケーラビリティを考慮した設計

3. **完全な動作保証**
   - デプロイ前に徹底的にテストする
   - 動作確認が取れるまでリリースしない
   - ユーザーエクスペリエンスを最優先する
   - エッジケースも考慮する

4. **透明性とトレーサビリティ**
   - 全ての変更を明確に記録する
   - デバッグログを適切に配置する
   - 問題の原因を迅速に特定できるようにする
   - コミットメッセージは明確で具体的に

5. **継続的改善**
   - フィードバックを即座に反映する
   - パフォーマンスを継続的に最適化する
   - ユーザーの要求に迅速に対応する
   - 技術的負債を蓄積しない

## 本番環境規則

### 本番データ保護
- **テストデータ・モックデータの使用は一切禁止**
- **Test User、mock_user、dev_userなどの偽データを絶対に返してはいけない**
- **実際のユーザー認証情報のみを使用すること**
- **本番環境では常に実際のGoogle認証を行うこと**

## Important Workflow Guidelines

### Completion of Work
1. **GitHub Commit**: 作業が完了したらGitHubに追加すること
   - 変更内容を必ずコミットしてプッシュする
   - コミットメッセージは日本語でも英語でも可

2. **Build and Deploy**: 作業が完了したらClaude環境でビルドしデプロイすること
   - デプロイ手順は『Deployment Commands』章を参照

3. **Update README**: READMEにデプロイ先を記載して
   - 本番環境URL: https://portfolio-wise.com/
   - 開発環境URL: プレビューURLは毎回変わるため記載不要

### Security Considerations
- **セキュリティチェック**: GitHubへのプッシュ前にセキュリティ上の問題がないか確認すること
  - APIキーや秘密情報が含まれていないか確認
  - .envファイルがコミットされていないか確認
  - console.logでセンシティブな情報を出力していないか確認

### Documentation Updates
- **ドキュメント更新**: 実装を変更したらそれに合わせてドキュメントも更新すること
  - 技術的な変更はCLAUDE.mdに記載
  - ユーザー向けの変更はREADME.mdに記載
  - API仕様の変更は該当するドキュメントファイルに記載

### Production Deployment
- **固定URL使用**: 必ずURLが固定の本番環境にデプロイするようにして
  - **本番環境**: https://portfolio-wise.com/ （このURLのみが認証可能）
  - Cloudflare Pagesのカスタムドメインを使用
  - **重要**: Google認証はhttps://portfolio-wise.com/からのリクエストのみ対応
  - プレビューURLは開発確認用のみ（認証は動作しない）

### API Configuration
- **固定API使用**: フロントエンドとバックエンドの通信が必ず成功するように固定のAPIを指定して
  - 本番API: https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod
  - ビルド時の環境変数設定は『Deployment Commands』章を参照

## Commands

### Development
```bash
# Start development server
npm start

# Build for production
npm run build

# Run all tests with coverage
npm test

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:e2e          # End-to-end tests

# Advanced test options (using script/run-tests.sh)
npm run test:all          # All tests
npm run test:coverage-chart  # Generate visual coverage report
npm run test:visual       # Open coverage in browser

# Run a single test file
npm test -- path/to/test.js
```

## Architecture Overview

This is a React-based portfolio management application with AI-powered investment analysis capabilities. Key architectural decisions:

### Frontend Architecture
- **React 18** with functional components and hooks
- **Context API** for state management (AuthContext for auth, PortfolioContext for portfolio data)
- **TailwindCSS** for styling with custom theme colors
- **Recharts** for data visualization
- **Google OAuth** for authentication
- **Axios** for API calls with retry logic

### Testing Architecture
- **Jest + React Testing Library** for unit/integration tests
- **MSW (Mock Service Worker)** for API mocking
- Custom test runner script (`script/run-tests.sh`) with advanced options
- Coverage thresholds enforced (70-80% target)
- Visual coverage reporting with chart generation

### Key Patterns

1. **Service Layer Pattern**: All API calls go through `/src/services/` modules
   - `api.js`: Core API client with auth handling
   - `marketDataService.js`: Market data fetching with fallbacks
   - `adminService.js`: Admin functionality

2. **Context Bridge Pattern**: `ContextConnector` component bridges AuthContext and PortfolioContext

3. **Environment Configuration**: All API settings are dynamically fetched from AWS
   - No API URLs or keys stored in client
   - Configuration fetched from AWS at runtime
   - Enhanced security and easier maintenance

4. **Component Organization**:
   ```
   components/
   ├── auth/       # LoginButton, UserProfile
   ├── common/     # ErrorBoundary, ToastNotification, etc.
   ├── dashboard/  # Portfolio visualization components
   ├── data/       # Import/Export, Google Drive integration
   ├── layout/     # Header, TabNavigation, DataStatusBar
   ├── settings/   # Holdings/Allocation editors, AI prompt settings
   └── simulation/ # Investment simulation components
   ```

## Important Implementation Details

### Deployment
- **Frontend Hosting**: Cloudflare Pages (migrated from Netlify)
- **Backend API**: AWS Lambda + API Gateway
- **Database**: Amazon DynamoDB
- **Authentication**: Google OAuth + AWS Cognito

## Deployment Commands

### Frontend Deployment to Cloudflare Pages (Wrangler CLI)

#### 推奨デプロイ手順
1. **既存のbuildディレクトリを使用してデプロイ**
   ```bash
   cd frontend/webapp
   # 既にビルド済みの場合
   wrangler pages deploy build --project-name=pfwise-portfolio-manager --commit-dirty=true
   ```

2. **新規ビルドしてデプロイ**
   ```bash
   cd frontend/webapp
   # 環境変数を設定してビルド
   REACT_APP_API_BASE_URL='https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod' \
   REACT_APP_DEFAULT_EXCHANGE_RATE='150.0' \
   NODE_OPTIONS='--openssl-legacy-provider' \
   npm run build
   
   # デプロイ
   wrangler pages deploy build --project-name=pfwise-portfolio-manager --commit-dirty=true
   ```

#### 重要な注意事項
- **プロジェクト名**: `pfwise-portfolio-manager`（固定）
- **--commit-dirty=true**: Gitに未コミットの変更がある場合に必要
- **タイムアウト対策**: デプロイが長時間かかる場合があるため、必要に応じてバックグラウンド実行
- **エラー対処**: "Operation timed out"エラーは無視して問題ありません（ファイルは正常にアップロードされます）

#### デプロイ確認
```bash
# デプロイメント履歴を確認
wrangler pages deployment list --project-name=pfwise-portfolio-manager
```

### Backend Deployment to AWS (Serverless Framework)

```bash
# 1. バックエンドディレクトリに移動
cd backend

# 2. 依存関係のインストール
npm install

# 3. Serverlessプラグインのインストール（初回のみ）
npm install serverless-dotenv-plugin --save-dev

# 4. 本番環境にデプロイ
npm run deploy:prod
# または強制デプロイ（変更検知をスキップ）
npm run deploy:force
```

### Environment Variables

#### Cloudflare Pages環境変数
Cloudflare Pagesダッシュボードで設定:
- `REACT_APP_API_BASE_URL`: https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod
- `REACT_APP_DEFAULT_EXCHANGE_RATE`: 150.0

#### AWS Lambda環境変数
serverless.ymlで自動設定されます。Secrets Managerも利用。

### URL Configuration

#### Production URLs
- **Frontend**: https://portfolio-wise.com/ （カスタムドメイン）
- **Backend API**: https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod
- **Preview**: https://[deployment-id].pfwise-portfolio-manager.pages.dev

#### CORS Configuration
バックエンドのserverless.ymlで以下を許可:
- https://portfolio-wise.com
- https://*.pfwise-portfolio-manager.pages.dev（プレビュー環境）

### Deployment Script
手動デプロイ用のスクリプトも利用可能:
```bash
cd frontend/webapp
./deploy-cloudflare.sh
```

### API Integration
- All API endpoints dynamically configured from AWS
- Production API hosted on AWS (separate repository)
- **Batch API**: Use `fetchMultipleStocks` to fetch multiple tickers in one request
- Supports multiple market data sources with automatic fallback
- API keys and authentication handled server-side
- **Rate Limiting**: Circuit breakers, exponential backoff, request deduplication
- **Session-based auth**: Uses cookies with `withCredentials: true`

### Multi-Currency Support
- Handles JPY and USD
- Exchange rate fetching from multiple sources
- Automatic currency conversion in calculations

### AI Features
- Custom prompt generation for investment analysis
- Configurable AI settings in Settings page
- Integration with external AI services via prompts

### Data Persistence
- Google Drive integration for backup/restore
- Local storage for offline capability
- Export to CSV/JSON formats

### Testing Requirements
- All new components need corresponding tests in `__tests__/unit/components/`
- Integration tests for API interactions in `__tests__/integration/`
- Mock handlers in `__tests__/mocks/handlers.js`
- Use existing test patterns and utilities

## Development Tips

1. When modifying API calls, update both the service layer and corresponding MSW handlers
2. Run tests before committing - the project has strict coverage requirements
3. Use the visual coverage report to identify untested code paths
4. Follow the existing component structure and naming conventions
5. Ensure mobile responsiveness - the app is optimized for iOS devices
6. Consider Japanese users (primary target audience) in UI/UX decisions

## Security Configuration

### Environment Variables
API configurations are fetched dynamically from AWS. The following environment variables are supported:

1. Required environment variables:
   ```bash
   REACT_APP_API_BASE_URL=https://YOUR_AWS_API_URL_HERE.execute-api.YOUR_REGION.amazonaws.com
   REACT_APP_DEFAULT_EXCHANGE_RATE=150.0
   ```

2. Setup instructions:
   ```bash
   cp .env.example .env.development
   cp .env.example .env.production
   # Edit files to replace YOUR_AWS_API_URL_HERE with actual URL
   ```

3. API endpoints, keys, and Google Client ID are fetched from AWS at runtime using the base URL

4. The `.gitignore` file is configured to exclude all `.env*` files except `.env.example`

5. For production deployments, set `REACT_APP_API_BASE_URL` in your hosting platform's environment variables

### API Security
- All API configurations are managed server-side on AWS
- API keys and sensitive data never exposed to client
- CORS restrictions enforced on the backend
- Rate limiting based on authentication status
- **Authentication**: Session-based using cookies (no JWT tokens currently)
- **Important**: Backend needs to implement JWT token response for full functionality

### Test Environment Setup

1. **Local Testing**:
   ```bash
   # First time setup
   cp .env.test.example .env.test
   # Edit .env.test and replace YOUR_AWS_API_URL_HERE with actual URL
   
   # Run tests
   npm test
   ```

2. **CI/CD Environment** (GitHub Actions, etc.):
   - Add `REACT_APP_MARKET_DATA_API_URL` as a secret in your CI/CD platform
   - The test runner will automatically use environment variables if available
   
3. **Using Mock API**:
   - If `USE_API_MOCKS=true` is set in .env.test, tests will use MSW mocks instead of real API
   - This is useful for unit tests and when the backend is unavailable

## Deployment and URL Management

### Production URL
- **Primary Domain**: https://portfolio-wise.com/
- **Hosting**: Cloudflare Pages
- **Important**: Only this URL is registered with Google OAuth. Preview URLs (e.g., https://abc123.portfolio-manager-7bx.pages.dev) will NOT work for authentication.


### Important Notes on URLs
- **Production URL**: https://portfolio-wise.com/ （この固定URLのみが本番環境）
- **認証制限**: Google認証はhttps://portfolio-wise.com/からのリクエストのみ受け付ける
- **バックエンドCORS**: サーバー側でhttps://portfolio-wise.com/のみを許可
- **Preview URLs**: デプロイ確認用のみ（認証機能は動作しない）
- **Google OAuth Redirect URIs**: 以下のみ登録済み:
  - https://portfolio-wise.com/auth/google/callback
  - https://portfolio-wise.com/ (for popup auth)
  
**絶対に他のURLを追加しないこと** - セキュリティ上の理由でportfolio-wise.com以外は使用禁止