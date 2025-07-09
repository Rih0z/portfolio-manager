/**
 * useCloudSync.js のテストファイル
 * クラウド同期フックの包括的テスト
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { useCloudSync } from '../../../hooks/portfolio/useCloudSync';
import { PortfolioContext } from '../../../context/PortfolioContext';

// テスト用のコンテキスト値を作成するヘルパー関数
const createMockContext = (overrides = {}) => ({
  saveToGoogleDrive: jest.fn(),
  loadFromGoogleDrive: jest.fn(),
  dataSource: 'local',
  lastSyncTime: null,
  currentUser: null,
  handleAuthStateChange: jest.fn(),
  ...overrides
});

// PortfolioProviderラッパー
const createWrapper = (contextValue) => {
  return ({ children }) => (
    <PortfolioContext.Provider value={contextValue}>
      {children}
    </PortfolioContext.Provider>
  );
};

describe('useCloudSync', () => {
  describe('基本機能', () => {
    test('コンテキスト内で使用した場合、正しい値を返す', () => {
      const mockContext = createMockContext({
        dataSource: 'google-drive',
        lastSyncTime: '2023-01-01T00:00:00Z',
        currentUser: { name: 'Test User', email: 'test@example.com' }
      });
      
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => useCloudSync(), { wrapper });
      
      expect(result.current.saveToGoogleDrive).toBe(mockContext.saveToGoogleDrive);
      expect(result.current.loadFromGoogleDrive).toBe(mockContext.loadFromGoogleDrive);
      expect(result.current.dataSource).toBe('google-drive');
      expect(result.current.lastSyncTime).toBe('2023-01-01T00:00:00Z');
      expect(result.current.currentUser).toEqual({ name: 'Test User', email: 'test@example.com' });
      expect(result.current.handleAuthStateChange).toBe(mockContext.handleAuthStateChange);
    });

    test('同期アクションが正しく公開される', () => {
      const mockSaveToGoogleDrive = jest.fn();
      const mockLoadFromGoogleDrive = jest.fn();
      const mockContext = createMockContext({
        saveToGoogleDrive: mockSaveToGoogleDrive,
        loadFromGoogleDrive: mockLoadFromGoogleDrive
      });
      
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => useCloudSync(), { wrapper });
      
      expect(result.current.saveToGoogleDrive).toBe(mockSaveToGoogleDrive);
      expect(result.current.loadFromGoogleDrive).toBe(mockLoadFromGoogleDrive);
    });

    test('同期状態が正しく公開される', () => {
      const mockContext = createMockContext({
        dataSource: 'local',
        lastSyncTime: null
      });
      
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => useCloudSync(), { wrapper });
      
      expect(result.current.dataSource).toBe('local');
      expect(result.current.lastSyncTime).toBeNull();
    });

    test('認証状態が正しく公開される', () => {
      const mockHandleAuthStateChange = jest.fn();
      const mockUser = { id: '123', name: 'John Doe' };
      const mockContext = createMockContext({
        currentUser: mockUser,
        handleAuthStateChange: mockHandleAuthStateChange
      });
      
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => useCloudSync(), { wrapper });
      
      expect(result.current.currentUser).toBe(mockUser);
      expect(result.current.handleAuthStateChange).toBe(mockHandleAuthStateChange);
    });
  });

  describe('エラーハンドリング', () => {
    test('PortfolioProvider外で使用した場合、エラーを投げる', () => {
      expect(() => {
        renderHook(() => useCloudSync());
      }).toThrow('useCloudSync must be used within a PortfolioProvider');
    });

    test('コンテキスト値がnullの場合、エラーを投げる', () => {
      const wrapper = ({ children }) => (
        <PortfolioContext.Provider value={null}>
          {children}
        </PortfolioContext.Provider>
      );
      
      expect(() => {
        renderHook(() => useCloudSync(), { wrapper });
      }).toThrow('useCloudSync must be used within a PortfolioProvider');
    });

    test('コンテキスト値がundefinedの場合、エラーを投げる', () => {
      const wrapper = ({ children }) => (
        <PortfolioContext.Provider value={undefined}>
          {children}
        </PortfolioContext.Provider>
      );
      
      expect(() => {
        renderHook(() => useCloudSync(), { wrapper });
      }).toThrow('useCloudSync must be used within a PortfolioProvider');
    });
  });

  describe('データソースの種類', () => {
    test('localデータソースの場合', () => {
      const mockContext = createMockContext({
        dataSource: 'local',
        lastSyncTime: null,
        currentUser: null
      });
      
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => useCloudSync(), { wrapper });
      
      expect(result.current.dataSource).toBe('local');
      expect(result.current.lastSyncTime).toBeNull();
      expect(result.current.currentUser).toBeNull();
    });

    test('google-driveデータソースの場合', () => {
      const mockContext = createMockContext({
        dataSource: 'google-drive',
        lastSyncTime: '2023-06-01T12:00:00Z',
        currentUser: { email: 'user@gmail.com' }
      });
      
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => useCloudSync(), { wrapper });
      
      expect(result.current.dataSource).toBe('google-drive');
      expect(result.current.lastSyncTime).toBe('2023-06-01T12:00:00Z');
      expect(result.current.currentUser).toEqual({ email: 'user@gmail.com' });
    });
  });

  describe('同期タイムスタンプ', () => {
    test('同期されていない場合はnull', () => {
      const mockContext = createMockContext({
        lastSyncTime: null
      });
      
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => useCloudSync(), { wrapper });
      
      expect(result.current.lastSyncTime).toBeNull();
    });

    test('同期済みの場合はISO文字列', () => {
      const timestamp = '2023-12-25T09:30:00Z';
      const mockContext = createMockContext({
        lastSyncTime: timestamp
      });
      
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => useCloudSync(), { wrapper });
      
      expect(result.current.lastSyncTime).toBe(timestamp);
    });
  });

  describe('ユーザー情報', () => {
    test('ログインしていない場合はnull', () => {
      const mockContext = createMockContext({
        currentUser: null
      });
      
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => useCloudSync(), { wrapper });
      
      expect(result.current.currentUser).toBeNull();
    });

    test('ログイン済みユーザー情報が含まれる', () => {
      const user = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        picture: 'https://example.com/avatar.jpg'
      };
      const mockContext = createMockContext({
        currentUser: user
      });
      
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => useCloudSync(), { wrapper });
      
      expect(result.current.currentUser).toEqual(user);
    });
  });

  describe('Interface Segregation Principle', () => {
    test('クラウド同期に関連する機能のみが公開される', () => {
      const mockContext = createMockContext({
        // クラウド同期以外の機能も含むコンテキスト
        portfolioData: { assets: [] },
        updateAsset: jest.fn(),
        deleteAsset: jest.fn(),
        // クラウド同期関連のみが公開されるべき
        saveToGoogleDrive: jest.fn(),
        loadFromGoogleDrive: jest.fn(),
        dataSource: 'local',
        lastSyncTime: null,
        currentUser: null,
        handleAuthStateChange: jest.fn()
      });
      
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => useCloudSync(), { wrapper });
      
      // クラウド同期関連のプロパティのみ存在することを確認
      const expectedProperties = [
        'saveToGoogleDrive',
        'loadFromGoogleDrive',
        'dataSource',
        'lastSyncTime',
        'currentUser',
        'handleAuthStateChange'
      ];
      
      const actualProperties = Object.keys(result.current);
      expect(actualProperties).toEqual(expect.arrayContaining(expectedProperties));
      expect(actualProperties).toHaveLength(expectedProperties.length);
      
      // ポートフォリオ管理関連のプロパティは含まれないことを確認
      expect(result.current.portfolioData).toBeUndefined();
      expect(result.current.updateAsset).toBeUndefined();
      expect(result.current.deleteAsset).toBeUndefined();
    });
  });
});