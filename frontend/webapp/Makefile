# Portfolio Manager Makefile
# 簡単なデプロイコマンド

.PHONY: build deploy deploy-preview deploy-prod clean help

# デフォルトターゲット
default: help

# ヘルプ
help:
	@echo "Portfolio Manager デプロイコマンド:"
	@echo ""
	@echo "  make build          - アプリケーションをビルド"
	@echo "  make deploy         - 通常のデプロイ（ビルド込み）"
	@echo "  make deploy-preview - プレビューデプロイ"
	@echo "  make deploy-prod    - 本番デプロイ（mainブランチ）"
	@echo "  make deploy-only    - ビルド済みファイルをデプロイ"
	@echo "  make clean          - ビルドファイルをクリーン"
	@echo ""

# ビルド
build:
	@echo "🔨 ビルド中..."
	@npm run build
	@echo "✅ ビルド完了"

# 通常のデプロイ（ビルド込み）
deploy:
	@echo "🚀 デプロイを開始..."
	@npm run deploy
	@echo "✅ デプロイ完了"

# プレビューデプロイ
deploy-preview:
	@echo "👁️ プレビューデプロイを開始..."
	@npm run deploy:preview
	@echo "✅ プレビューデプロイ完了"

# 本番デプロイ
deploy-prod:
	@echo "🚀 本番デプロイを開始..."
	@npm run deploy:prod
	@echo "✅ 本番デプロイ完了: https://portfolio-wise.com/"

# ビルドなしでデプロイ
deploy-only:
	@echo "📦 ビルド済みファイルをデプロイ..."
	@wrangler pages deploy build --project-name=pfwise-portfolio-manager --commit-dirty=true
	@echo "✅ デプロイ完了"

# クリーン
clean:
	@echo "🧹 ビルドファイルをクリーン..."
	@rm -rf build
	@echo "✅ クリーン完了"