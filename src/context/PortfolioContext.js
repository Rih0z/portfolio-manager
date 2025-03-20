// 銘柄追加（銘柄タイプ、手数料、配当情報の設定を含む）
const addTicker = useCallback(async (ticker) => {
  try {
    // 既に存在するか確認
    const exists = [...targetPortfolio, ...currentAssets].some(
      item => item.ticker?.toLowerCase() === ticker.toLowerCase()
    );

    if (exists) {
      addNotification('既に追加されている銘柄です', 'warning');
      return { success: false, message: '既に追加されている銘柄です' };
    }

    setIsLoading(true);

    // Alpha Vantageから銘柄データ取得
    const tickerResult = await fetchTickerData(ticker);
    console.log('Fetched ticker data:', tickerResult);
    
    // APIエラーの処理
    if (!tickerResult.success) {
      // エラータイプに応じたメッセージを表示
      if (tickerResult.errorType === 'RATE_LIMIT') {
        addNotification('APIリクエスト制限に達しました。しばらく待ってから再試行してください。', 'error');
      } else {
        addNotification(`銘柄「${ticker}」の情報取得でエラーが発生しました: ${tickerResult.message}`, 'warning');
      }
      
      // フォールバックデータがある場合は続行、ない場合は中断
      if (!tickerResult.data) {
        addNotification(`銘柄「${ticker}」を追加できませんでした`, 'error');
        return { success: false, message: '銘柄の追加に失敗しました' };
      }
      
      // フォールバックデータを使用する旨を通知
      addNotification(`推定データを使用して「${ticker}」を追加します`, 'info');
    }
    
    // 銘柄データ
    const tickerData = tickerResult.data;

    // ファンド情報を取得（手数料率など）
    const fundInfoResult = await fetchFundInfo(ticker, tickerData.name);
    console.log('Fetched fund info:', fundInfoResult);
    
    // 配当情報を取得
    const dividendResult = await fetchDividendData(ticker);
    console.log('Fetched dividend info:', dividendResult);

    // 銘柄タイプを確認してisStockフラグを設定
    // 特別な処理: VXUSなどのETFリストで明示的に指定されている銘柄の確認
    let fundType;
    const upperTicker = ticker.toUpperCase();
    
    if (US_ETF_LIST.includes(upperTicker)) {
      // 明示的にリストにある場合はETF_USとして扱う
      fundType = FUND_TYPES.ETF_US;
    } else {
      fundType = tickerData.fundType || fundInfoResult.fundType || 'unknown';
    }
    
    const isStock = fundType === FUND_TYPES.STOCK;
    
    // 自動取得した情報のメッセージを作成
    let infoMessage = '';
    if (fundInfoResult.success) {
      // 個別株かどうかでメッセージを変える
      if (isStock) {
        infoMessage = `${fundType || '個別株'} として判定しました（手数料は固定で0%）`;
      } else {
        infoMessage = `${fundType} ファンドとして判定し、年間手数料率${isStock ? 0 : (tickerData.annualFee || fundInfoResult.annualFee || 0)}%を${fundInfoResult.feeIsEstimated ? '推定' : '設定'}しました`;
      }
      
      // 配当情報があれば追加
      if (dividendResult.data.hasDividend) {
        infoMessage += `、配当利回り${dividendResult.data.dividendYield.toFixed(2)}%${dividendResult.data.dividendIsEstimated ? '（推定）' : ''}`;
      }
    }

    // 目標配分に追加
    setTargetPortfolio(prev => {
      const newItems = [...prev, {
        id: tickerData.id,
        name: tickerData.name,
        ticker: tickerData.ticker,
        targetPercentage: 0
      }];
      return newItems;
    });

    // 保有資産に追加（ファンド情報を含む）
    setCurrentAssets(prev => {
      const newItems = [...prev, {
        ...tickerData,
        // 保有数量は0から始める
        holdings: 0,
        // 銘柄タイプを設定
        fundType: fundType,
        isStock: isStock,
        // 手数料情報（個別株は常に0%）
        annualFee: isStock ? 0 : (tickerData.annualFee || fundInfoResult.annualFee || 0),
        feeSource: isStock ? '個別株' : (tickerData.feeSource || fundInfoResult.feeSource || 'Estimated'),
        feeIsEstimated: isStock ? false : (tickerData.feeIsEstimated || fundInfoResult.feeIsEstimated || true),
        region: tickerData.region || fundInfoResult.region || 'unknown',
        // 配当情報
        dividendYield: dividendResult.data.dividendYield,
        hasDividend: dividendResult.data.hasDividend,
        dividendFrequency: dividendResult.data.dividendFrequency,
        dividendIsEstimated: dividendResult.data.dividendIsEstimated
      }];
      return newItems;
    });

    // 手数料・配当情報の通知を追加
    if (infoMessage) {
      addNotification(infoMessage, 'info');
    }
    
    // データソースの通知（フォールバック値の場合）
    if (tickerData.source === 'Fallback') {
      addNotification(`「${ticker}」のデータはフォールバック値を使用しています。最新の価格情報ではありません。`, 'warning');
    }
    
    // 追加成功の通知
    addNotification(`銘柄「${tickerData.name || ticker}」を追加しました`, 'success');
    
    // データを自動保存
    setTimeout(() => saveToLocalStorage(), 100);

    return { success: true, message: '銘柄を追加しました' };
  } catch (error) {
    console.error('銘柄の追加に失敗しました', error);
    addNotification(`銘柄「${ticker}」の追加に失敗しました: ${error.message}`, 'error');
    return { success: false, message: '銘柄の追加に失敗しました' };
  } finally {
    setIsLoading(false);
  }
}, [targetPortfolio, currentAssets, addNotification, saveToLocalStorage]);

// 市場データの更新（銘柄タイプ、手数料、配当情報の正確な更新を含む）
const refreshMarketPrices = useCallback(async () => {
  setIsLoading(true);
  try {
    console.log('Refreshing market prices for all assets...');
    
    let feeChangesCount = 0;
    const feeChangeDetails = [];
    let dividendChangesCount = 0;
    let fundTypeChangesCount = 0; // 銘柄タイプの変更カウンター
    const fundTypeChangeDetails = []; // 銘柄タイプの変更詳細
    
    // エラーの統計
    let errorCount = 0;
    let rateLimit = false;
    const errorDetails = [];
    
    // 全ての保有銘柄の最新データを取得
    const updatedAssets = await Promise.all(
      currentAssets.map(async (asset) => {
        try {
          // Alpha Vantageから直接データ取得
          const updatedData = await fetchTickerData(asset.ticker);
          console.log(`Updated data for ${asset.ticker}:`, updatedData);
          
          // エラーの処理
          if (!updatedData.success) {
            errorCount++;
            if (updatedData.errorType === 'RATE_LIMIT') {
              rateLimit = true;
            }
            errorDetails.push({
              ticker: asset.ticker,
              name: asset.name,
              message: updatedData.message,
              errorType: updatedData.errorType
            });
            
            // エラー時でもフォールバックデータがあるため利用可能
            console.log(`Using fallback data for ${asset.ticker} due to error`);
          }
          
          // 銘柄タイプの変更を確認
          const newFundType = updatedData.data.fundType || asset.fundType;
          const hasFundTypeChanged = asset.fundType !== newFundType;
          
          // 銘柄タイプ変更の記録
          if (hasFundTypeChanged) {
            fundTypeChangesCount++;
            fundTypeChangeDetails.push({
              ticker: asset.ticker,
              name: asset.name,
              oldType: asset.fundType,
              newType: newFundType
            });
          }
          
          // 新しい銘柄タイプに基づいて個別株かどうかを判定
          const isStock = newFundType === FUND_TYPES.STOCK;
          
          // 手数料情報の変更を確認（個別株でなく、かつ手数料が変わった場合）
          const newFee = isStock ? 0 : updatedData.data.annualFee;
          const hasFeeChanged = asset.annualFee !== newFee;
          
          // 手数料変更を記録
          if (hasFeeChanged) {
            feeChangesCount++;
            feeChangeDetails.push({
              ticker: asset.ticker,
              name: asset.name,
              oldFee: asset.annualFee,
              newFee: newFee
            });
          }
          
          // 配当情報も取得
          const dividendData = await fetchDividendData(asset.ticker);
          
          // 配当情報の変更を確認
          const hasDividendChanged = 
            asset.dividendYield !== dividendData.data.dividendYield ||
            asset.hasDividend !== dividendData.data.hasDividend;
          
          if (hasDividendChanged) {
            dividendChangesCount++;
          }
          
          // 更新されたアセット情報を返す
          return {
            ...asset,
            price: updatedData.data.price,
            source: updatedData.data.source,
            lastUpdated: updatedData.data.lastUpdated,
            // 銘柄タイプを更新
            fundType: newFundType,
            isStock: isStock,
            // 手数料情報を更新（個別株は常に0%）
            annualFee: isStock ? 0 : newFee,
            feeSource: isStock ? '個別株' : updatedData.data.feeSource,
            feeIsEstimated: isStock ? false : updatedData.data.feeIsEstimated,
            region: updatedData.data.region || asset.region,
            // 配当情報を更新
            dividendYield: dividendData.data.dividendYield,
            hasDividend: dividendData.data.hasDividend,
            dividendFrequency: dividendData.data.dividendFrequency,
            dividendIsEstimated: dividendData.data.dividendIsEstimated
          };
        } catch (error) {
          console.error(`銘柄 ${asset.ticker} の更新に失敗しました`, error);
          errorCount++;
          errorDetails.push({
            ticker: asset.ticker,
            name: asset.name,
            message: `内部エラー: ${error.message}`,
            errorType: 'INTERNAL'
          });
          return asset; // エラーの場合は既存のデータを維持
        }
      })
    );

    // 更新したデータをさらに検証（VXUSなど特殊ケースの対応）
    const { updatedAssets: validatedAssets, changes } = validateAssetTypes(updatedAssets);
    
    // 追加の変更があれば統計に加算
    fundTypeChangesCount += changes.fundType;
    feeChangesCount += changes.fees;
    dividendChangesCount += changes.dividends;
    
    // 変更があった銘柄の詳細も追加
    if (changes.fundTypeDetails && changes.fundTypeDetails.length > 0) {
      fundTypeChangeDetails.push(...changes.fundTypeDetails);
    }
    if (changes.feeDetails && changes.feeDetails.length > 0) {
      feeChangeDetails.push(...changes.feeDetails);
    }

    setCurrentAssets(validatedAssets);
    setLastUpdated(new Date().toISOString());
    
    // データソースの統計を計算
    const sourceCounts = validatedAssets.reduce((acc, asset) => {
      acc[asset.source] = (acc[asset.source] || 0) + 1;
      return acc;
    }, {});
    
    // 通知メッセージを作成
    let message = '市場データを更新しました';
    if (sourceCounts['Alpha Vantage']) {
      message += ` (Alpha Vantage: ${sourceCounts['Alpha Vantage']}件`;
    }
    if (sourceCounts['Fallback']) {
      message += `, フォールバック: ${sourceCounts['Fallback']}件`;
    }
    message += ')';
    
    // エラーがあった場合は通知
    if (errorCount > 0) {
      const errorMessage = rateLimit 
        ? `APIリクエスト制限のため、${errorCount}銘柄のデータが正しく更新できませんでした` 
        : `${errorCount}銘柄のデータ更新でエラーが発生しました`;
      
      addNotification(errorMessage, 'error');
      
      // 最大3件までエラー詳細を表示
      errorDetails.slice(0, 3).forEach(error => {
        addNotification(
          `「${error.name || error.ticker}」: ${error.message}`,
          'warning'
        );
      });
    }
    
    addNotification(message, 'success');
    
    // 銘柄タイプの変更があった場合は通知
    if (fundTypeChangesCount > 0) {
      let typeMessage = `${fundTypeChangesCount}件の銘柄でタイプ情報が更新されました`;
      addNotification(typeMessage, 'info');
      
      // 詳細な変更内容も表示（最大3件まで）
      fundTypeChangeDetails.slice(0, 3).forEach(detail => {
        addNotification(
          `「${detail.name || detail.ticker}」のタイプが「${detail.oldType}」から「${detail.newType}」に変更されました`,
          'info'
        );
      });
    }
    
    // 手数料変更があった場合は別途通知
    if (feeChangesCount > 0) {
      let feeMessage = `${feeChangesCount}件のファンドで手数料情報が更新されました`;
      addNotification(feeMessage, 'info');
      
      // 詳細な変更内容も表示（最大3件まで）
      feeChangeDetails.slice(0, 3).forEach(detail => {
        addNotification(
          `「${detail.name || detail.ticker}」の手数料が${detail.oldFee.toFixed(2)}%から${detail.newFee.toFixed(2)}%に変更されました`,
          'info'
        );
      });
    }
    
    // 配当情報の変更があった場合の通知
    if (dividendChangesCount > 0) {
      addNotification(`${dividendChangesCount}件の銘柄で配当情報が更新されました`, 'info');
    }
    
    // データを自動保存
    saveToLocalStorage();
    
    return { success: true, message };
  } catch (error) {
    console.error('市場データの更新に失敗しました', error);
    addNotification(`市場データの更新に失敗しました: ${error.message}`, 'error');
    return { success: false, message: '市場データの更新に失敗しました' };
  } finally {
    setIsLoading(false);
  }
}, [currentAssets, addNotification, saveToLocalStorage, validateAssetTypes]);
