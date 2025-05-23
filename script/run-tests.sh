#!/bin/bash
# 
# ファイルパス: script/run-tests.sh
# 
# Portfolio Manager テスト実行スクリプト（修正版）
# Jest設定ファイルを利用し、各種テスト実行オプションを提供
# カバレッジ率の正確なビジュアル化に対応
#
# @author Portfolio Manager Team
# @updated 2025-05-22 - カバレッジビジュアル化の修正
# 

# 色の設定
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 関数定義
print_header() {
  echo -e "\n${BLUE}===========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}===========================================${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

print_debug() {
  if [ $DEBUG_MODE -eq 1 ]; then
    echo -e "${CYAN}[DEBUG] $1${NC}"
  fi
}

show_help() {
  print_header "Portfolio Manager テスト実行ヘルプ"
  echo "使用方法: $0 [オプション] <テスト種別>"
  echo ""
  echo "オプション:"
  echo "  -h, --help                  このヘルプメッセージを表示"
  echo "  -c, --clean                 テスト実行前にテスト環境をクリーンアップ"
  echo "  -v, --visual                テスト結果をビジュアルレポートで表示"
  echo "  -m, --mock                  APIモックを使用（E2Eテスト用）"
  echo "  -w, --watch                 監視モードでテストを実行（コード変更時に自動再実行）"
  echo "  -n, --no-coverage           カバレッジ計測・チェックを無効化"
  echo "  -f, --force                 テストを強制実行"
  echo "  -d, --debug                 デバッグモードを有効化（詳細ログを表示）"
  echo "  -i, --ignore-coverage-errors テスト自体は成功してもカバレッジエラーを無視"
  echo "  -s, --specific              特定のファイルまたはパターンに一致するテストのみ実行"
  echo "  -t, --target                カバレッジ目標段階を指定 [initial|mid|final]"
  echo "  --html-coverage             HTMLカバレッジレポートをブラウザで開く"
  echo "  --chart                     カバレッジをチャートで生成（ビジュアルレポートに追加）"
  echo "  --junit                     JUnit形式のレポートを生成（CI環境用）"
  echo "  --nvm                       nvmを使用してNode.js 18に切り替え"
  echo "  --force-coverage            カバレッジ計測を強制的に有効化（--no-coverageより優先）"
  echo "  --config                    カスタムJest設定ファイルのパスを指定"
  echo "  --verbose-coverage          カバレッジデータ処理の詳細ログを出力"
  echo "  --detect-open-handles       非同期ハンドルの検出を有効化"
  echo "  --validate-coverage         カバレッジデータの検証を強化"
  echo ""
  echo "テスト種別:"
  echo "  unit                単体テストのみ実行"
  echo "  integration         統合テストのみ実行"
  echo "  e2e                 エンドツーエンドテストのみ実行"
  echo "  all                 すべてのテストを実行"
  echo "  quick               単体テストと統合テストのみ高速実行（モック使用）"
  echo "  specific            -s オプションで指定したファイルまたはパターンに一致するテストのみ実行"
  echo ""
  echo "カバレッジ目標段階 (-t/--target オプション):"
  echo "  initial             初期段階の目標 (20-30%) - 基本的なテスト実装時"
  echo "  mid                 中間段階の目標 (40-60%) - サービス層とAPIハンドラーのテスト時"
  echo "  final               最終段階の目標 (70-80%) - 完全なテストカバレッジ時"
  echo ""
  echo "使用例:"
  echo "  $0 unit             単体テストのみ実行（カバレッジあり）"
  echo "  $0 -c all           環境クリーンアップ後、すべてのテストを実行"
  echo "  $0 -v e2e           E2Eテストを実行し、結果をビジュアル表示"
  echo "  $0 --chart all      すべてのテストを実行し、カバレッジチャートを生成"
  echo "  $0 -t mid all       中間段階のカバレッジ目標を設定してすべてのテストを実行"
  echo "  $0 --force-coverage --validate-coverage all  カバレッジを強制有効化し検証強化"
  echo ""
}

# 変数の初期化
CLEAN=0
VISUAL=0
MOCK=0
WATCH=0
NO_COVERAGE=0
USE_NVM=0
FORCE_TESTS=0
DEBUG_MODE=0
IGNORE_COVERAGE_ERRORS=0
HTML_COVERAGE=0
GENERATE_CHART=0
JUNIT_REPORT=0
FORCE_COVERAGE=0
VALIDATE_COVERAGE=0
SPECIFIC_PATTERN=""
TEST_TYPE=""
COVERAGE_TARGET="initial"
JEST_CONFIG_PATH="jest.config.js"
VERBOSE_COVERAGE=0
DETECT_OPEN_HANDLES=0

# オプション解析
while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    -c|--clean)
      CLEAN=1
      shift
      ;;
    -v|--visual)
      VISUAL=1
      shift
      ;;
    -m|--mock)
      MOCK=1
      shift
      ;;
    -w|--watch)
      WATCH=1
      shift
      ;;
    -n|--no-coverage)
      NO_COVERAGE=1
      shift
      ;;
    -f|--force)
      FORCE_TESTS=1
      shift
      ;;
    -d|--debug)
      DEBUG_MODE=1
      shift
      ;;
    -i|--ignore-coverage-errors)
      IGNORE_COVERAGE_ERRORS=1
      shift
      ;;
    -s|--specific)
      SPECIFIC_PATTERN="$2"
      shift 2
      ;;
    -t|--target)
      COVERAGE_TARGET="$2"
      shift 2
      ;;
    --html-coverage)
      HTML_COVERAGE=1
      shift
      ;;
    --chart)
      GENERATE_CHART=1
      shift
      ;;
    --junit)
      JUNIT_REPORT=1
      shift
      ;;
    --nvm)
      USE_NVM=1
      shift
      ;;
    --force-coverage)
      FORCE_COVERAGE=1
      shift
      ;;
    --config)
      JEST_CONFIG_PATH="$2"
      shift 2
      ;;
    --verbose-coverage)
      VERBOSE_COVERAGE=1
      shift
      ;;
    --detect-open-handles)
      DETECT_OPEN_HANDLES=1
      shift
      ;;
    --validate-coverage)
      VALIDATE_COVERAGE=1
      shift
      ;;
    unit|integration|e2e|all|quick|specific)
      TEST_TYPE=$1
      shift
      ;;
    *)
      print_error "不明なオプション: $1"
      show_help
      exit 1
      ;;
  esac
done

# カバレッジ目標段階の検証
if [[ ! "$COVERAGE_TARGET" =~ ^(initial|mid|final)$ ]]; then
  print_error "不明なカバレッジ目標段階: $COVERAGE_TARGET"
  print_info "有効な値: initial, mid, final"
  exit 1
fi

# カバレッジ検証の強化
validate_coverage_setup() {
  print_debug "カバレッジ設定の検証を開始"
  
  # Jest設定ファイルの確認
  if [ ! -f "$JEST_CONFIG_PATH" ]; then
    print_warning "Jest設定ファイルが見つかりません: $JEST_CONFIG_PATH"
    
    # 代替ファイルを探す
    local alt_configs=("jest.config.js" "jest.config.json" "package.json")
    for config in "${alt_configs[@]}"; do
      if [ -f "$config" ]; then
        print_info "代替設定ファイルを使用: $config"
        JEST_CONFIG_PATH="$config"
        break
      fi
    done
    
    if [ ! -f "$JEST_CONFIG_PATH" ]; then
      print_error "Jest設定ファイルが見つかりません"
      return 1
    fi
  fi
  
  # カバレッジディレクトリの確認
  if [ ! -d "./coverage" ]; then
    print_debug "coverageディレクトリを作成"
    mkdir -p ./coverage
  fi
  
  # テスト結果ディレクトリの確認
  if [ ! -d "./test-results" ]; then
    print_debug "test-resultsディレクトリを作成"
    mkdir -p ./test-results
  fi
  
  # カスタムレポーターの確認
  if [ ! -f "./custom-reporter.js" ]; then
    print_warning "カスタムレポーターが見つかりません: ./custom-reporter.js"
    return 1
  fi
  
  print_debug "カバレッジ設定の検証完了"
  return 0
}

# Jest設定の詳細デバッグ
debug_jest_config() {
  print_debug "Jest設定のデバッグ情報を表示"
  
  # Jest のバージョンを確認
  local jest_version=$(npx jest --version 2>/dev/null || echo "Jest not found")
  print_debug "Jest バージョン: $jest_version"
  
  # 使用する設定ファイルの確認
  print_debug "使用する設定ファイル: $JEST_CONFIG_PATH"
  
  if [ -f "$JEST_CONFIG_PATH" ]; then
    print_debug "設定ファイル内容の抜粋:"
    grep -E "collectCoverage|coverageDirectory|coverageReporters|reporters" "$JEST_CONFIG_PATH" | head -10
  fi
  
  # 環境変数の確認
  print_debug "カバレッジ関連の環境変数:"
  env | grep -E "COVERAGE|JEST|collectCoverage" || print_debug "カバレッジ関連の環境変数なし"
  
  # Node.jsとnpmのバージョン
  print_debug "Node.js バージョン: $(node -v)"
  print_debug "npm バージョン: $(npm -v)"
}

# テスト種別が指定されていない場合はエラー
if [ -z "$TEST_TYPE" ]; then
  print_error "テスト種別を指定してください"
  show_help
  exit 1
fi

# デバッグモードの場合は詳細情報を表示
if [ $DEBUG_MODE -eq 1 ] || [ $VERBOSE_COVERAGE -eq 1 ]; then
  debug_jest_config
fi

# カバレッジ検証の実行
if [ $VALIDATE_COVERAGE -eq 1 ] || [ $FORCE_COVERAGE -eq 1 ]; then
  if ! validate_coverage_setup; then
    print_error "カバレッジ設定の検証に失敗しました"
    exit 1
  fi
fi

# nvmが指定されている場合、Node.js 18に切り替え
if [ $USE_NVM -eq 1 ]; then
  print_info "nvmを使用してNode.js 18に切り替えます..."
  
  # nvmをロード
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  
  # 現在のNode.jsバージョンを確認
  CURRENT_NODE_VERSION=$(node -v)
  
  if [[ "$CURRENT_NODE_VERSION" == v18.* ]]; then
    print_success "既にNode.js $CURRENT_NODE_VERSION を使用しています"
  else
    # Node.js 18に切り替え
    nvm use 18 || {
      print_warning "Node.js 18に切り替えられませんでした。インストールを試みます..."
      nvm install 18 && nvm use 18 || {
        print_error "Node.js 18のインストールに失敗しました。"
        exit 1
      }
    }
    print_success "Node.js $(node -v) に切り替えました"
  fi
fi

# クリーンアップが指定された場合は実行
if [ $CLEAN -eq 1 ]; then
  print_info "テスト環境をクリーンアップしています..."
  
  # キャッシュとレポートのクリーンアップ
  rm -rf ./coverage ./test-results ./.jest-cache
  
  # npmのキャッシュもクリーンアップ
  npm cache clean --force 2>/dev/null || true
  
  print_success "クリーンアップ完了"
fi

# テスト環境のセットアップ
print_info "テスト環境をセットアップしています..."
if [ -f "./script/setup-test-env.js" ]; then
  node ./script/setup-test-env.js
else
  print_warning "setup-test-env.js が見つかりません。手動でディレクトリを作成します。"
  mkdir -p ./test-results ./coverage ./.jest-cache
fi
print_success "セットアップ完了"

# 環境変数の設定
ENV_VARS=""

# カバレッジ目標に応じた環境変数を設定
case $COVERAGE_TARGET in
  initial)
    print_info "カバレッジ目標: 初期段階 (20-30%)"
    ENV_VARS="$ENV_VARS COVERAGE_TARGET=initial"
    ;;
  mid)
    print_info "カバレッジ目標: 中間段階 (40-60%)"
    ENV_VARS="$ENV_VARS COVERAGE_TARGET=mid"
    ;;
  final)
    print_info "カバレッジ目標: 最終段階 (70-80%)"
    ENV_VARS="$ENV_VARS COVERAGE_TARGET=final"
    ;;
esac

# その他の環境変数設定
if [ $MOCK -eq 1 ]; then
  ENV_VARS="$ENV_VARS USE_API_MOCKS=true"
  print_info "APIモック使用モードが有効です"
fi

if [ $FORCE_TESTS -eq 1 ]; then
  ENV_VARS="$ENV_VARS FORCE_TESTS=true"
  print_info "テスト強制実行モードが有効です"
fi

if [ $DEBUG_MODE -eq 1 ]; then
  ENV_VARS="$ENV_VARS DEBUG=true"
  print_info "デバッグログが有効です"
fi

if [ $VERBOSE_COVERAGE -eq 1 ]; then
  ENV_VARS="$ENV_VARS VERBOSE_COVERAGE=true"
  print_info "カバレッジデータ処理の詳細ログを出力します"
fi

if [ $GENERATE_CHART -eq 1 ]; then
  ENV_VARS="$ENV_VARS GENERATE_COVERAGE_CHART=true"
  print_info "カバレッジチャートを生成します"
  VISUAL=1  # チャート生成時は自動的にビジュアルレポートを表示
  FORCE_COVERAGE=1  # チャート生成時は常にカバレッジを有効化
fi

# カバレッジ関連の環境変数を強制設定
if [ $FORCE_COVERAGE -eq 1 ] || [ $NO_COVERAGE -ne 1 ]; then
  ENV_VARS="$ENV_VARS JEST_COVERAGE=true COLLECT_COVERAGE=true FORCE_COLLECT_COVERAGE=true ENABLE_COVERAGE=true"
  print_info "カバレッジ計測を強制的に有効化"
fi

# テストコマンドの構築
JEST_ARGS=""

# Jest設定ファイルを指定
JEST_ARGS="--config=$JEST_CONFIG_PATH"

# 非同期ハンドルの検出
if [ $DETECT_OPEN_HANDLES -eq 1 ]; then
  JEST_ARGS="$JEST_ARGS --detectOpenHandles"
  print_info "非同期ハンドルの検出が有効です"
fi

# テスト種別に基づいてJestの引数を設定
case $TEST_TYPE in
  unit)
    print_header "単体テストを実行中..."
    JEST_ARGS="$JEST_ARGS --testPathPattern=\"__tests__/unit/\""
    ;;
  integration)
    print_header "統合テストを実行中..."
    JEST_ARGS="$JEST_ARGS --testPathPattern=\"__tests__/integration/\""
    ;;
  e2e)
    print_header "エンドツーエンドテストを実行中..."
    JEST_ARGS="$JEST_ARGS --testPathPattern=\"__tests__/e2e/\""
    ;;
  all)
    print_header "すべてのテストを実行中..."
    JEST_ARGS="$JEST_ARGS"
    ;;
  quick)
    print_header "クイックテスト（単体+統合）を実行中..."
    JEST_ARGS="$JEST_ARGS --testPathPattern=\"__tests__/(unit|integration)/\""
    ENV_VARS="$ENV_VARS USE_API_MOCKS=true"
    ;;
  specific)
    if [ -z "$SPECIFIC_PATTERN" ]; then
      print_error "specific テスト種別を使用する場合は -s オプションでパターンを指定してください"
      exit 1
    fi
    print_header "特定のパターンに一致するテストを実行中..."
    print_info "パターン: $SPECIFIC_PATTERN"
    JEST_ARGS="$JEST_ARGS --testPathPattern=\"$SPECIFIC_PATTERN\""
    ;;
  *)
    print_error "不明なテスト種別: $TEST_TYPE"
    exit 1
    ;;
esac

# カバレッジオプションの詳細設定
if [ $NO_COVERAGE -eq 1 ] && [ $FORCE_COVERAGE -ne 1 ]; then
  print_info "カバレッジチェックが無効化されています"
  JEST_ARGS="$JEST_ARGS --coverage=false"
else
  print_info "カバレッジ計測を有効化しています"
  
  # カバレッジレポーターを個別に設定（カンマ区切りではなく複数オプション形式）
  JEST_ARGS="$JEST_ARGS --coverage"
  JEST_ARGS="$JEST_ARGS --coverageReporters=json"
  JEST_ARGS="$JEST_ARGS --coverageReporters=json-summary"
  JEST_ARGS="$JEST_ARGS --coverageReporters=text"
  JEST_ARGS="$JEST_ARGS --coverageReporters=text-summary"
  
  if [ $HTML_COVERAGE -eq 1 ]; then
    JEST_ARGS="$JEST_ARGS --coverageReporters=lcov"
    print_info "HTMLカバレッジレポートを生成します"
  fi
fi

# JUnitレポート設定
if [ $JUNIT_REPORT -eq 1 ]; then
  JEST_ARGS="$JEST_ARGS --reporters=default --reporters=jest-junit"
  print_info "JUnit形式のレポートを生成します"
fi

# カスタムレポーター設定
JEST_ARGS="$JEST_ARGS --reporters=default --reporters=./custom-reporter.js"

# 監視モードの設定
if [ $WATCH -eq 1 ]; then
  print_info "監視モードが有効です"
  JEST_ARGS="$JEST_ARGS --watch"
else
  # CI環境用の設定
  JEST_ARGS="$JEST_ARGS --forceExit --passWithNoTests"
fi

# 詳細出力の設定
if [ $DEBUG_MODE -eq 1 ]; then
  JEST_ARGS="$JEST_ARGS --verbose"
fi

# テスト実行コマンドの準備
JEST_CMD="jest $JEST_ARGS"

# デバッグモードの場合、実行予定のコマンドを表示
if [ $DEBUG_MODE -eq 1 ] || [ $VERBOSE_COVERAGE -eq 1 ]; then
  print_debug "実行するJestコマンド:"
  echo "npx $JEST_CMD"
  if [ -n "$ENV_VARS" ]; then
    print_debug "環境変数:"
    echo "$ENV_VARS"
  fi
  echo ""
fi

# テストの実行
print_info "テストを実行しています..."

if [ -n "$ENV_VARS" ]; then
  eval "npx cross-env $ENV_VARS $JEST_CMD"
else
  eval "npx $JEST_CMD"
fi

# テスト結果
TEST_RESULT=$?

print_debug "Jest終了コード: $TEST_RESULT"

# カバレッジ結果の検証
validate_coverage_results() {
  print_debug "カバレッジ結果の検証を開始"
  
  # カバレッジ結果ファイルの存在チェック
  local coverage_files=(
    "./test-results/detailed-results.json"
    "./coverage/coverage-final.json"
    "./coverage/coverage-summary.json"
  )
  
  local found_coverage=0
  for file in "${coverage_files[@]}"; do
    if [ -f "$file" ]; then
      print_debug "カバレッジファイル発見: $file"
      found_coverage=1
      
      # ファイルサイズの確認
      local file_size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo "0")
      if [ "$file_size" -gt 10 ]; then
        print_debug "カバレッジファイルサイズ: $file_size bytes"
      else
        print_warning "カバレッジファイルが小さすぎます: $file ($file_size bytes)"
      fi
    fi
  done
  
  if [ $found_coverage -eq 0 ]; then
    print_warning "カバレッジファイルが見つかりません"
    return 1
  fi
  
  # detailed-results.jsonの内容確認
  if [ -f "./test-results/detailed-results.json" ]; then
    if grep -q "coverageMap" "./test-results/detailed-results.json"; then
      print_debug "detailed-results.jsonにカバレッジマップが含まれています"
    else
      print_warning "detailed-results.jsonにカバレッジマップが含まれていません"
      return 1
    fi
  fi
  
  print_debug "カバレッジ結果の検証完了"
  return 0
}

# カバレッジ結果の検証実行
if [ $VALIDATE_COVERAGE -eq 1 ] || [ $VERBOSE_COVERAGE -eq 1 ]; then
  validate_coverage_results
fi

# カバレッジエラーを無視するモードの処理
if [ $IGNORE_COVERAGE_ERRORS -eq 1 ] && [ -f "./test-results/detailed-results.json" ]; then
  # JSON結果ファイルを読み込んでテスト自体の成功/失敗を確認
  failed_tests=$(grep -o '"numFailedTests":[0-9]*' ./test-results/detailed-results.json | cut -d':' -f2 2>/dev/null || echo "0")
  
  if [ "$failed_tests" = "0" ]; then
    print_info "テスト自体は成功しています（カバレッジエラーを無視）"
    TEST_RESULT=0
  fi
fi

# カバレッジチャート生成
if [ $GENERATE_CHART -eq 1 ] && [ $NO_COVERAGE -ne 1 ]; then
  print_info "カバレッジチャートを生成しています..."
  
  # チャート生成用の環境変数を設定
  chart_env_vars="NODE_ENV=production"
  if [ $DEBUG_MODE -eq 1 ] || [ $VERBOSE_COVERAGE -eq 1 ]; then
    chart_env_vars="$chart_env_vars DEBUG=true VERBOSE_COVERAGE=true"
  fi
  chart_env_vars="$chart_env_vars COVERAGE_TARGET=$COVERAGE_TARGET"
  
  # チャート生成スクリプトを実行
  if eval "npx cross-env $chart_env_vars node ./script/generate-coverage-chart.js"; then
    print_success "カバレッジチャートが生成されました"
  else
    print_warning "カバレッジチャートの生成に失敗しました"
    if [ $DEBUG_MODE -eq 1 ]; then
      print_debug "チャート生成スクリプトをデバッグモードで実行します..."
      eval "npx cross-env $chart_env_vars node --trace-warnings ./script/generate-coverage-chart.js"
    fi
  fi
fi

# HTMLカバレッジレポートを開く
if [ $HTML_COVERAGE -eq 1 ] && [ $TEST_RESULT -eq 0 ]; then
  print_info "HTMLカバレッジレポートを開いています..."
  
  html_report="./coverage/lcov-report/index.html"
  if [ -f "$html_report" ]; then
    # OS別にブラウザを開く
    case "$(uname -s)" in
      Darwin)
        open "$html_report"
        ;;
      Linux)
        if command -v xdg-open > /dev/null; then
          xdg-open "$html_report"
        else
          print_warning "xdg-open コマンドが見つかりません。ブラウザで $html_report を開いてください。"
        fi
        ;;
      CYGWIN*|MINGW*|MSYS*)
        start "$html_report"
        ;;
      *)
        print_warning "未知のOSです。ブラウザで $html_report を開いてください。"
        ;;
    esac
  else
    print_warning "HTMLカバレッジレポートが見つかりません: $html_report"
  fi
fi

# ビジュアルレポートの表示
if [ $VISUAL -eq 1 ]; then
  print_info "テスト結果をビジュアルレポートで表示します..."
  
  visual_report="./test-results/visual-report.html"
  if [ -f "$visual_report" ]; then
    # OS別にブラウザを開く
    case "$(uname -s)" in
      Darwin)
        open "$visual_report"
        ;;
      Linux)
        if command -v xdg-open > /dev/null; then
          xdg-open "$visual_report"
        else
          print_warning "xdg-open コマンドが見つかりません。ブラウザで $visual_report を開いてください。"
        fi
        ;;
      CYGWIN*|MINGW*|MSYS*)
        start "$visual_report"
        ;;
      *)
        print_warning "未知のOSです。ブラウザで $visual_report を開いてください。"
        ;;
    esac
  else
    print_warning "ビジュアルレポートが見つかりません: $visual_report"
  fi
fi

# テスト結果のサマリー表示
if [ $TEST_RESULT -eq 0 ]; then
  print_header "テスト実行が成功しました! 🎉"
  
  # カバレッジ情報の表示
  if [ -f "./test-results/detailed-results.json" ] && grep -q "coverageMap" ./test-results/detailed-results.json; then
    print_info "カバレッジ情報を表示します..."
    
    # カバレッジ情報の抽出（JSONから直接読み取り）
    if command -v jq > /dev/null; then
      statements_pct=$(jq -r '.coverageMap.total.statements.pct // 0' ./test-results/detailed-results.json 2>/dev/null)
      branches_pct=$(jq -r '.coverageMap.total.branches.pct // 0' ./test-results/detailed-results.json 2>/dev/null)
      functions_pct=$(jq -r '.coverageMap.total.functions.pct // 0' ./test-results/detailed-results.json 2>/dev/null)
      lines_pct=$(jq -r '.coverageMap.total.lines.pct // 0' ./test-results/detailed-results.json 2>/dev/null)
      
      echo -e "${BLUE}カバレッジ率:${NC}"
      echo -e "  ステートメント: ${statements_pct}%"
      echo -e "  ブランチ:       ${branches_pct}%"
      echo -e "  関数:           ${functions_pct}%"
      echo -e "  行:             ${lines_pct}%"
    else
      print_debug "jqが利用できないため、カバレッジ詳細表示をスキップ"
    fi
  fi
  
else
  print_header "テスト実行が失敗しました... 😢"
  
  # 改善提案を表示
  print_info "改善提案:"
  echo "- 詳細なエラー情報を確認: cat ./test-results/test-log.md"
  echo "- ビジュアルレポートを表示: $0 -v $TEST_TYPE"
  echo "- デバッグモードで再実行: $0 -d $TEST_TYPE"
  echo "- カバレッジ検証強化: $0 --validate-coverage $TEST_TYPE"
  echo "- カバレッジエラーを無視: $0 -i $TEST_TYPE"
fi

# 最終的なファイル確認
print_info "生成されたファイル:"
output_files=(
  "./test-results/visual-report.html"
  "./test-results/test-log.md"
  "./test-results/detailed-results.json"
  "./coverage/coverage-final.json"
  "./coverage/lcov-report/index.html"
)

for file in "${output_files[@]}"; do
  if [ -f "$file" ]; then
    print_success "$file が生成されました"
  else
    print_debug "$file が見つかりません"
  fi
done

exit $TEST_RESULT
