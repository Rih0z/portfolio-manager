# Source Modules and Functions

## src/App.jsx
- **App()** => JSX element
- **ContextConnector()** => null

## src/App.test.js
No top-level functions found.

## src/components/auth/LoginButton.jsx
- **LoginButton()** => JSX element
- **handleGoogleLoginError(error)** => void

## src/components/auth/UserProfile.jsx
- **UserProfile()** => null

## src/components/common/ContextConnector.js
- **ContextConnector()** => null

## src/components/common/DataSourceBadge.jsx
- **DataSourceBadge({ source, showIcon = true })** => JSX element

## src/components/common/ErrorBoundary.jsx
No top-level functions found.

## src/components/common/ToastNotification.jsx
- **ToastNotification({ 
  message, 
  type = 'info', 
  duration = 5000,
  onClose,
  position = 'bottom'
})** => JSX element

## src/components/dashboard/AssetsTable.jsx
- **AssetsTable()** => object
- **formatDividendFrequency(frequency)** => '毎月'

## src/components/dashboard/DifferenceChart.jsx
- **DifferenceChart()** => object
- **calculateDifferenceData()** => object
- **CustomTooltip({ active, payload })** => JSX element

## src/components/dashboard/PortfolioCharts.jsx
- **PortfolioCharts()** => JSX element
- **CustomTooltip({ active, payload })** => JSX element

## src/components/dashboard/PortfolioSummary.jsx
- **PortfolioSummary()** => acc

## src/components/data/ExportOptions.jsx
- **ExportOptions()** => JSON.stringify(portfolioData, null, 2)

## src/components/data/GoogleDriveIntegration.jsx
- **GoogleDriveIntegration()** => JSX element

## src/components/data/ImportOptions.jsx
- **ImportOptions()** => object

## src/components/layout/DataStatusBar.jsx
- **DataStatusBar()** => JSX element

## src/components/layout/Header.jsx
- **Header()** => JSX element

## src/components/layout/TabNavigation.jsx
- **TabNavigation()** => JSX element

## src/components/settings/AiPromptSettings.jsx
- **AiPromptSettings()** => JSX element
- **handleSave()** => void
- **handleReset()** => void

## src/components/settings/AllocationEditor.jsx
- **AllocationEditor()** => JSX element
- **handleAllocationChange(id, value)** => void
- **handleAdjustAllocations()** => void
- **showMessage(text, type)** => void

## src/components/settings/HoldingsEditor.jsx
- **HoldingsEditor()** => value
- **startEditing(id, value, field)** => void
- **handleUpdate(id)** => void
- **calculateAssetValue(asset)** => value
- **calculateAnnualFee(asset)** => 0
- **calculateAnnualDividend(asset)** => 0
- **handleRemoveTicker(id, name)** => void
- **handleIncrementHoldings(asset, amount)** => void
- **showMessage(text, type)** => void
- **formatDividendFrequency(frequency)** => '毎月'

## src/components/settings/PopularTickers.jsx
- **PopularTickers()** => JSX element
- **showMessage(text, type)** => void

## src/components/settings/TickerSearch.jsx
- **TickerSearch()** => JSX element
- **showMessage(text, type)** => void

## src/components/simulation/AiAnalysisPrompt.jsx
- **AiAnalysisPrompt()** => []
- **calculateCurrentAllocation()** => []
- **getTargetAllocation()** => []
- **formatBudget(budget, currency)** => '0'
- **generatePrompt()** => prompt
- **copyToClipboard()** => void
- **getPromptPreview()** => 'プロンプトを生成できません。'

## src/components/simulation/BudgetInput.jsx
- **BudgetInput()** => currency === 'JPY' ? 10000 : 100

## src/components/simulation/SimulationResult.jsx
- **SimulationResult()** => JSX element
- **DataSourceBadge({ source })** => JSX element
- **startEditing(id, units)** => void
- **calculateAmount(result, units)** => units * result.price
- **handleUnitsChange(e, result)** => void
- **handlePurchase(result)** => void
- **handleEditedPurchase(result)** => void
- **showMessage(text, type)** => void

## src/context/AuthContext.js
- **AuthProvider({ children })** => true

## src/context/PortfolioContext.js
- **encryptData(data)** => btoa(encodeURIComponent(jsonString))
- **decryptData(encryptedData)** => data
- **PortfolioProvider({ children })** => id

## src/craco.config.js
No top-level functions found.

## src/hooks/useAuth.js
- **useAuth()** => context

## src/hooks/useGoogleDrive.js
- **useGoogleDrive()** => null

## src/hooks/usePortfolioContext.js
- **usePortfolioContext()** => context

## src/index.js
No top-level functions found.

## src/pages/Dashboard.jsx
- **Dashboard()** => JSX element

## src/pages/DataIntegration.jsx
- **DataIntegration()** => JSX element

## src/pages/Settings.jsx
- **Settings()** => JSX element

## src/pages/Simulation.jsx
- **Simulation()** => `${value.toLocaleString()} 円`
- **handleBatchPurchase()** => void
- **formatCurrencyValue(value, currency)** => `${value.toLocaleString()} 円`

## src/reportWebVitals.js
No top-level functions found.

## src/services/adminService.js
- **getBaseEndpoint()** => `${API_URL}/${API_STAGE}`
- **setAdminApiKey(apiKey)** => true

## src/services/api.js
- **getApiEndpoint(type)** => `${MARKET_DATA_API_URL}/${API_STAGE}/api/market-data`
- **initGoogleDriveAPI()** => object
- **setGoogleAccessToken(token)** => void

## src/services/marketDataService.js
No top-level functions found.

## src/setupProxy.js
No top-level functions found.

## src/setupTests.js
No top-level functions found.

## src/utils/apiUtils.js
- **setAuthToken(token)** => void
- **getAuthToken()** => authToken
- **clearAuthToken()** => void
- **createApiClient(withAuth = false)** => config
- **formatErrorResponse(error, ticker)** => errorResponse
- **generateFallbackData(ticker)** => object

## src/utils/envUtils.js
- **isLocalDevelopment()** => window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
- **getBaseApiUrl()** => process.env.REACT_APP_LOCAL_API_URL || 'http://localhost:3000'
- **getApiStage()** => process.env.REACT_APP_API_STAGE || 'dev'
- **getApiEndpoint(path)** => `/${stage}/${cleanPath}`
- **getGoogleClientId()** => clientId || ''
- **getOrigin()** => window.location.origin
- **getRedirectUri()** => `${origin}/auth/callback`
- **getDefaultExchangeRate()** => isNaN(defaultRate) ? 150.0 : defaultRate

## src/utils/formatters.js
- **formatCurrency(amount, currency = 'JPY')** => '-'
- **formatPercent(value, fractionDigits = 2)** => '-'
- **formatDate(date)** => '-'

## src/utils/fundUtils.js
- **isKnownETF(ticker)** => Object.keys(TICKER_SPECIFIC_FEES).includes(ticker) || US_ETF_LIST.includes(ticker)
- **guessFundType(ticker, name = '')** => FUND_TYPES.UNKNOWN
- **containsFundIndicators(name)** => name.includes('fund') || 
         name.includes('ファンド') || 
         name.includes('投信') || 
         name.includes('etf') || 
         name.includes('インデックス') || 
         name.includes('index') ||
         name.includes('trust') ||
         name.includes('ishares') ||
         name.includes('vanguard') ||
         name.includes('シェアーズ') ||
         name.includes('spdr')
- **isETF(name, ticker)** => name.includes('etf') || 
         name.includes('exchange traded fund') || 
         name.includes('上場投信') || 
         name.includes('上場投資信託') ||
         ETF_PREFIXES.some(prefix => name.includes(prefix.toLowerCase())) ||
         (ticker.includes('-') && (name.includes('ishares') || name.includes('vanguard') || name.includes('spdr')))
- **isIndex(name)** => name.includes('index') ||
         name.includes('インデックス') ||
         name.includes('日経') ||
         name.includes('topix') ||
         name.includes('トピックス') ||
         name.includes('s&p') ||
         name.includes('sp500') ||
         name.includes('msci') ||
         name.includes('ftse') ||
         name.includes('russell') ||
         name.includes('ベンチマーク') ||
         name.includes('パッシブ') ||
         INDEX_FUND_PREFIXES.some(prefix => name.includes(prefix.toLowerCase()))
- **isGlobal(name)** => name.includes('global') ||
         name.includes('グローバル') ||
         name.includes('international') ||
         name.includes('world') ||
         name.includes('世界') ||
         name.includes('全世界') ||
         name.includes('海外')
- **isREIT(name)** => name.includes('reit') ||
         name.includes('リート') ||
         name.includes('不動産投資') ||
         name.includes('real estate') ||
         name.includes('不動産投資法人')
- **isBond(name, ticker)** => name.includes('bond') ||
         name.includes('債券') ||
         name.includes('aggregate') ||
         name.includes('国債') ||
         name.includes('社債') ||
         name.includes('fixed income') ||
         ticker === 'BND' ||
         ticker === 'AGG' ||
         ticker === 'BNDX' ||
         ticker === 'LQD' ||
         ticker === 'HYG' ||
         ticker === 'JNK' ||
         ticker === 'TLT' ||
         ticker === 'SHY' ||
         ticker === 'MUB'
- **isCrypto(name, ticker)** => name.includes('bitcoin') ||
         name.includes('ethereum') ||
         name.includes('crypto') ||
         name.includes('暗号資産') ||
         name.includes('ビットコイン') ||
         name.includes('イーサリアム') ||
         ticker === 'GBTC' ||
         ticker === 'ETHE' ||
         ticker === 'IBIT'
- **isActive(name)** => name.includes('active') ||
         name.includes('アクティブ') ||
         name.includes('厳選') ||
         name.includes('セレクト') ||
         name.includes('選定') ||
         name.includes('運用') ||
         name.includes('マネージド')
- **isActiveOrIndex(name, isJapanese)** => FUND_TYPES.ACTIVE_GLOBAL
- **estimateAnnualFee(ticker, name = '')** => object
- **extractFundInfo(ticker, name = '')** => info
- **estimateDividendYield(ticker, name = '')** => object

