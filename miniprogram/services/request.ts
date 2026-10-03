import { CONFIG, getApiBaseUrl } from '../config';
import { AuthStore } from '../store/auth';

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface RequestOptions {
  showLoading?: boolean;
  loadingTitle?: string;
  showErrorToast?: boolean;
  /** 401 时是否用 refreshToken 自动续期后重试（登录/刷新/退出等接口应关闭） */
  retryOn401?: boolean;
  /** 完全跳过 401 刷新流程（避免 refresh/logout 自身死循环） */
  skipAuthRefresh?: boolean;
}

/** 并发 401 时合并为一次 refresh */
let refreshInFlight: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  const refreshToken = AuthStore.getRefreshToken();
  if (!refreshToken) {
    return Promise.reject(new Error('NO_REFRESH_TOKEN'));
  }

  refreshInFlight = new Promise<string>((resolve, reject) => {
    wx.request({
      url: `${getApiBaseUrl()}/auth/refresh`,
      method: 'POST',
      data: { refreshToken },
      header: { 'Content-Type': 'application/json' },
      timeout: CONFIG.REQUEST_TIMEOUT_MS || 15000,
      success: (res) => {
        const body = res.data as ApiResponse<{ token: string; refreshToken: string }>;
        const ok = (res.statusCode === 200 || res.statusCode === 201) && body && body.code === 0 && body.data?.token;
        if (ok) {
          // refresh 轮换：保存新的 access + refresh
          AuthStore.setTokens(body.data.token, body.data.refreshToken);
          resolve(body.data.token);
        } else {
          // 刷新失败：清会话，避免「看似在线、请求全 401」
          AuthStore.clear();
          reject(new Error(body?.message || '登录已过期，请重新登录'));
        }
      },
      fail: (err) => {
        AuthStore.clear();
        reject(new Error(err.errMsg || '网络异常，登录已失效'));
      },
    });
  }).finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

/**
 * 全局统一 HTTP 网络请求客户端
 */
export function request<T = any>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  data?: any,
  options: RequestOptions = {},
): Promise<T> {
  const {
    showLoading = false,
    loadingTitle = '加载中...',
    showErrorToast = false,
    retryOn401 = true,
    skipAuthRefresh = false,
  } = options;

  if (showLoading) {
    wx.showLoading({ title: loadingTitle, mask: true });
  }

  const token = AuthStore.getToken();
  const header: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    header['Authorization'] = `Bearer ${token}`;
  }

  let cleanData = data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    cleanData = {};
    for (const key of Object.keys(data)) {
      const val = data[key];
      if (val !== undefined) {
        cleanData[key] = val;
      }
    }
  }

  const fullUrl = url.startsWith('http') ? url : `${getApiBaseUrl()}${url.startsWith('/') ? '' : '/'}${url}`;

  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method,
      data: cleanData,
      header,
      timeout: CONFIG.REQUEST_TIMEOUT_MS || 15000,
      success: async (res) => {
        if (showLoading) {
          wx.hideLoading();
        }

        const statusCode = res.statusCode;
        const body = res.data as ApiResponse<T>;

        if (statusCode === 200 || statusCode === 201) {
          if (body && body.code === 0) {
            resolve(body.data);
          } else {
            const errorMsg = body?.message || '操作失败';
            if (showErrorToast) {
              wx.showToast({ title: errorMsg, icon: 'none', duration: 2500 });
            }
            reject(new Error(errorMsg));
          }
        } else if (statusCode === 401) {
          // access token 过期：尝试用 refreshToken 续期后重放一次
          const canRefresh = !skipAuthRefresh && retryOn401 && !!AuthStore.getRefreshToken();
          if (canRefresh) {
            let refreshed = false;
            try {
              await refreshAccessToken();
              refreshed = true;
            } catch (refreshErr) {
              // 刷新失败视为会话失效
            }
            if (refreshed) {
              // 重试接口自身的业务或网络错误不能当作登录失效。
              request<T>(url, method, data, { ...options, retryOn401: false }).then(resolve, reject);
              return;
            }
          }

          if (!skipAuthRefresh) AuthStore.clear();
          const errorMsg = skipAuthRefresh ? (body?.message || '登录失败') : '登录已过期，请重新登录';
          if (!skipAuthRefresh || showErrorToast) wx.showToast({ title: errorMsg, icon: 'none', duration: 2500 });
          reject(new Error(errorMsg));
        } else if (statusCode === 403) {
          const errorMsg = body?.message || '暂无管理权限';
          if (showErrorToast) {
            wx.showToast({ title: errorMsg, icon: 'none', duration: 2500 });
          }
          reject(new Error(errorMsg));
        } else {
          const errorMsg = body?.message || `服务器响应异常 (${statusCode})`;
          if (showErrorToast) {
            wx.showToast({ title: errorMsg, icon: 'none', duration: 2500 });
          }
          reject(new Error(errorMsg));
        }
      },
      fail: (err) => {
        if (showLoading) {
          wx.hideLoading();
        }
        const errorMsg = '网络连接失败，请稍后重试';
        if (showErrorToast) wx.showToast({ title: errorMsg, icon: 'none', duration: 2500 });
        reject(new Error(errorMsg));
      },
    });
  });
}
