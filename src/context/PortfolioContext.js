// PortfolioContext.js の該当箇所を修正（1099行付近）

// データの初期化処理（ローカルストレージからデータを読み込み、銘柄情報を検証）
const initializeData = useCallback(() => {
  try {
    console.log('データの初期化を開始...');
    const localData = loadFromLocalStorage();
    
    if (localData) {
      console.log('ローカルストレージからデータを読み込みました:', localData);
      
      // 各状態を更新
      if (localData.baseCurrency) {
        console.log('基準通貨を設定:', localData.baseCurrency);
        setBaseCurrency(localData.baseCurrency);
      }
      
      if (localData.exchangeRate) {
        console.log('為替レートを設定:', localData.exchangeRate);
        setExchangeRate(localData.exchangeRate);
      }
      
      if (localData.lastUpdated) {
        console.log('最終更新日時を設定:', localData.lastUpdated);
        setLastUpdated(localData.lastUpdated);
      }
      
      if (localData.additionalBudget !== undefined) {
        console.log('追加予算を設定:', localData.additionalBudget);
        setAdditionalBudget(localData.additionalBudget);
      }
      
      // アセットデータのインポートと検証
      if (Array.isArray(localData.currentAssets)) {
        console.log('保有資産データを設定:', localData.currentAssets.length, '件');
        
        // 銘柄タイプ、手数料、配当情報を検証して修正
        const { updatedAssets: validatedAssets, changes } = validateAssetTypes(localData.currentAssets);
        
        // 検証・修正済みのデータを設定
        setCurrentAssets(validatedAssets);
        
        // 変更があった場合は通知を表示
        if (changes.fundType > 0) {
          addNotification(`${changes.fundType}件の銘柄で種別情報を修正しました`, 'info');
          
          // 詳細な変更内容も表示（最大3件まで）
          changes.fundTypeDetails.slice(0, 3).forEach(detail => {
            addNotification(
              `「${detail.name || detail.ticker}」のタイプが「${detail.oldType}」から「${detail.newType}」に変更されました`,
              'info'
            );
          });
        }
        
        if (changes.fees > 0) {
          addNotification(`${changes.fees}件の銘柄で手数料情報を修正しました`, 'info');
        }
        
        if (changes.dividends > 0) {
          addNotification(`${changes.dividends}件の銘柄で配当情報を修正しました`, 'info');
        }
        
        // データが修正された場合は自動保存
        if (changes.fundType > 0 || changes.fees > 0 || changes.dividends > 0) {
          setTimeout(() => {
            console.log('修正したデータを自動保存します');
            saveToLocalStorage();
          }, 500);
        }
      }
      
      if (Array.isArray(localData.targetPortfolio)) {
        console.log('目標配分データを設定:', localData.targetPortfolio.length, '件');
        setTargetPortfolio(localData.targetPortfolio);
      }
      
      addNotification('前回のデータを読み込みました', 'info');
    } else {
      console.log('ローカルストレージにデータがありませんでした。初期状態を使用します。');
    }
    
    // 初期化完了をマーク
    setInitialized(true);
  } catch (error) {
    console.error('データの初期化中にエラーが発生しました:', error);
    addNotification(`データの初期化中にエラーが発生しました: ${error.message}`, 'error');
    setInitialized(true); // エラーが発生しても初期化完了とマークする
  }
}, [loadFromLocalStorage, addNotification, validateAssetTypes, saveToLocalStorage]);
