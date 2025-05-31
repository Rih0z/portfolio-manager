/**
 * ファイルパス: __tests__/unit/utils/scrapingBlacklist.test.js
 *
 * スクレイピングブラックリストユーティリティのユニットテスト
 * 銘柄の失敗回数管理とブラックリスト登録機能をテストします
 */

const blacklist = require('../../../src/utils/scrapingBlacklist');
const awsConfig = require('../../../src/utils/awsConfig');
const alertService = require('../../../src/services/alerts');

jest.mock('../../../src/utils/awsConfig');
jest.mock('../../../src/services/alerts');

describe('Scraping Blacklist Utils', () => {
  const mockDynamoDb = {
    send: jest.fn().mockResolvedValue({})
  };

  beforeEach(() => {
    jest.clearAllMocks();
    awsConfig.getDynamoDb.mockReturnValue(mockDynamoDb);
  });

  describe('isBlacklisted', () => {
    test('アイテムが存在しない場合はfalseを返す', async () => {
      mockDynamoDb.send.mockResolvedValueOnce({});

      const result = await blacklist.isBlacklisted('TEST', 'jp');
      expect(result).toBe(false);
    });

    test('クールダウン期間が過ぎている場合は削除してfalseを返す', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      mockDynamoDb.send.mockResolvedValueOnce({
        Item: { market: 'jp', cooldownUntil: pastDate }
      });
      jest.spyOn(blacklist, 'removeFromBlacklist').mockResolvedValue(true);

      const result = await blacklist.isBlacklisted('TEST', 'jp');
      expect(result).toBe(false);
      expect(blacklist.removeFromBlacklist).toHaveBeenCalledWith('TEST');
    });

    test('クールダウン期間中はtrueを返す', async () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      mockDynamoDb.send.mockResolvedValueOnce({
        Item: { market: 'jp', cooldownUntil: future }
      });

      const result = await blacklist.isBlacklisted('TEST', 'jp');
      expect(result).toBe(true);
    });
  });

  describe('recordFailure', () => {
    test('初回の失敗を記録する', async () => {
      mockDynamoDb.send.mockResolvedValueOnce({});
      mockDynamoDb.send.mockResolvedValueOnce({});

      const res = await blacklist.recordFailure('AAA', 'jp', 'error');
      expect(res).toEqual({ symbol: 'AAA', failureCount: 1, isBlacklisted: false });
      expect(mockDynamoDb.send).toHaveBeenCalled();
    });

    test('失敗回数が閾値に達した場合アラートを送信する', async () => {
      const now = new Date().toISOString();
      mockDynamoDb.send.mockResolvedValueOnce({
        Item: { symbol: 'BBB', market: 'jp', failureCount: 2, firstFailure: now }
      });
      mockDynamoDb.send.mockResolvedValueOnce({});

      const result = await blacklist.recordFailure('BBB', 'jp', 'err');
      expect(result.isBlacklisted).toBe(true);
      expect(alertService.sendAlert).toHaveBeenCalled();
    });
  });

  describe('recordSuccess', () => {
    test('ブラックリスト登録銘柄は削除される', async () => {
      mockDynamoDb.send.mockResolvedValueOnce({
        Item: { failureCount: 3 }
      });
      jest.spyOn(blacklist, 'removeFromBlacklist').mockResolvedValue(true);

      const res = await blacklist.recordSuccess('CCC');
      expect(res).toBe(true);
      expect(blacklist.removeFromBlacklist).toHaveBeenCalledWith('CCC');
    });

    test('失敗カウントが残る場合は更新する', async () => {
      mockDynamoDb.send.mockResolvedValueOnce({
        Item: { failureCount: 2 }
      });
      mockDynamoDb.send.mockResolvedValueOnce({});

      const res = await blacklist.recordSuccess('DDD');
      expect(res).toBe(true);
      expect(mockDynamoDb.send).toHaveBeenCalled();
    });

    test('記録がない場合はtrueを返す', async () => {
      mockDynamoDb.send.mockResolvedValueOnce({});

      const res = await blacklist.recordSuccess('EEE');
      expect(res).toBe(true);
    });
  });

  describe('getBlacklistedSymbols', () => {
    test('ブラックリスト一覧を返す', async () => {
      const items = [{ symbol: 'FFF' }];
      mockDynamoDb.send.mockResolvedValueOnce({ Items: items });

      const res = await blacklist.getBlacklistedSymbols();
      expect(res).toEqual(items);
      expect(mockDynamoDb.send).toHaveBeenCalled();
    });

    test('エラー時は空配列を返す', async () => {
      mockDynamoDb.send.mockRejectedValueOnce(new Error('err'));

      const res = await blacklist.getBlacklistedSymbols();
      expect(res).toEqual([]);
    });
  });

  describe('cleanupBlacklist', () => {
    test('期限切れアイテムを削除する', async () => {
      const expired = [{ symbol: 'GGG' }, { symbol: 'HHH' }];
      mockDynamoDb.send.mockResolvedValueOnce({ Items: expired });
      mockDynamoDb.send.mockResolvedValue({});

      const res = await blacklist.cleanupBlacklist();
      expect(res).toEqual({ success: true, cleanedItems: expired.length });
      expect(mockDynamoDb.send).toHaveBeenCalledTimes(1 + expired.length);
    });

    test('エラー時はfalseを返す', async () => {
      mockDynamoDb.send.mockRejectedValueOnce(new Error('err'));

      const res = await blacklist.cleanupBlacklist();
      expect(res.success).toBe(false);
    });
  });
});
