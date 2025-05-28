import { renderHook, act } from '@testing-library/react';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { useAuth } from '@/hooks/useAuth';
import { authApiClient } from '@/utils/apiUtils';
import { getApiEndpoint } from '@/utils/envUtils';

jest.mock('@/hooks/useAuth');
jest.mock('@/utils/apiUtils');
jest.mock('@/utils/envUtils');

beforeEach(() => {
  jest.clearAllMocks();
  getApiEndpoint.mockImplementation((path) => `/api/${path}`);
});

describe('useGoogleDrive', () => {
  it('returns error when unauthenticated', async () => {
    useAuth.mockReturnValue({ isAuthenticated: false });
    const { result } = renderHook(() => useGoogleDrive());

    let files;
    await act(async () => {
      files = await result.current.listFiles();
    });

    expect(files).toBeNull();
    expect(result.current.error).toBe('認証が必要です');
  });

  it('listFiles calls API when authenticated', async () => {
    useAuth.mockReturnValue({ isAuthenticated: true });
    authApiClient.get = jest.fn().mockResolvedValue({ data: { success: true, files: ['file1'] } });

    const { result } = renderHook(() => useGoogleDrive());
    let files;
    await act(async () => {
      files = await result.current.listFiles();
    });

    expect(authApiClient.get).toHaveBeenCalledWith('/api/drive/files');
    expect(files).toEqual(['file1']);
  });

  it('saveFile posts data to API', async () => {
    useAuth.mockReturnValue({ isAuthenticated: true });
    authApiClient.post = jest.fn().mockResolvedValue({ data: { success: true, file: 'id' } });

    const { result } = renderHook(() => useGoogleDrive());

    let file;
    await act(async () => {
      file = await result.current.saveFile({});
    });

    expect(authApiClient.post).toHaveBeenCalledWith('/api/drive/save', { portfolioData: {} });
    expect(file).toBe('id');
  });

  it('loadFile gets data from API', async () => {
    useAuth.mockReturnValue({ isAuthenticated: true });
    authApiClient.get = jest.fn().mockResolvedValue({ data: { success: true, data: { foo: 'bar' } } });

    const { result } = renderHook(() => useGoogleDrive());
    let data;
    await act(async () => {
      data = await result.current.loadFile('123');
    });

    expect(authApiClient.get).toHaveBeenCalledWith('/api/drive/load', { params: { fileId: '123' } });
    expect(data).toEqual({ foo: 'bar' });
  });
});
