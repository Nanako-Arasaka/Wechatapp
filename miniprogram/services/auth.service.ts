import { request } from './request';
import { User } from '../types';
import { AuthStore } from '../store/auth';

/** 登录/续期响应：token 保留不变，新增 refreshToken */
export interface AuthSession {
  token: string;
  refreshToken?: string;
  user: User;
}

export interface RefreshResult {
  token: string;
  refreshToken: string;
}

export class AuthService {
  private static saveSession(res: AuthSession) {
    AuthStore.setTokens(res.token, res.refreshToken);
    if (res.user) {
      AuthStore.setUser(res.user);
    }
  }

  /**
   * 账号密码登录：角色由后端根据账号密码识别
   */
  static async login(username: string, password: string): Promise<AuthSession> {
    const res = await request<AuthSession>(
      '/auth/login',
      'POST',
      { username, password },
      { showLoading: true, loadingTitle: '正在登录...', showErrorToast: true, skipAuthRefresh: true },
    );
    this.saveSession(res);
    return res;
  }

  /**
   * 微信授权登录（mock 模式）
   * 后端当前只接受 mock_wx_code_ 前缀的 code，且同一 code 固定映射到同一 openid。
   * 为了演示时不每次都创建新用户，本机会缓存一个稳定的 mock code。
   */
  static async wechatLogin(nickname?: string, avatar?: string): Promise<AuthSession> {
    try {
      // 兼容调用一次 wx.login，但真实 code 在 mock 模式下不会被后端接受
      await new Promise<void>((resolve) => {
        wx.login({
          success: () => resolve(),
          fail: () => resolve(),
        });
      });

      const MOCK_CODE_KEY = 'SMART_VENUE_MOCK_WX_CODE';
      let code = wx.getStorageSync(MOCK_CODE_KEY) as string | undefined;
      if (!code) {
        code = `mock_wx_code_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        wx.setStorageSync(MOCK_CODE_KEY, code);
      }

      const res = await request<AuthSession>(
        '/auth/wechat-login',
        'POST',
        { code, nickname, avatar },
        { showLoading: false, skipAuthRefresh: true },
      );
      this.saveSession(res);
      return res;
    } catch (err) {
      wx.showToast({ title: '登录失败，请检查网络后重试', icon: 'none', duration: 2500 });
      throw err;
    }
  }

  /**
   * 退出登录：调用后端吊销 refreshToken，并清理本地会话
   * 后端约定：POST /auth/logout，body 传 { refreshToken }
   */
  static async logout(): Promise<void> {
    const refreshToken = AuthStore.getRefreshToken();
    try {
      if (refreshToken) {
        await request(
          '/auth/logout',
          'POST',
          { refreshToken },
          { showErrorToast: false, skipAuthRefresh: true, retryOn401: false },
        );
      }
    } catch (err) {
      // 退出以本地清理为准，服务端失败不阻断
    } finally {
      AuthStore.clear();
    }
  }

  /**
   * 用 refreshToken 换新 access token
   * 后端约定：POST /auth/refresh，body 传 { refreshToken }，返回 { token, refreshToken }
   */
  static async refreshSession(): Promise<RefreshResult> {
    const refreshToken = AuthStore.getRefreshToken();
    if (!refreshToken) {
      throw new Error('NO_REFRESH_TOKEN');
    }

    const res = await request<RefreshResult>(
      '/auth/refresh',
      'POST',
      { refreshToken },
      { showErrorToast: false, skipAuthRefresh: true, retryOn401: false },
    );

    if (!res || !res.token) {
      throw new Error('REFRESH_FAILED');
    }

    AuthStore.setTokens(res.token, res.refreshToken);
    return { token: res.token, refreshToken: res.refreshToken || refreshToken };
  }

  /**
   * 获取个人资料
   */
  static async getProfile(): Promise<User> {
    return request<User>('/auth/profile', 'GET');
  }
}
