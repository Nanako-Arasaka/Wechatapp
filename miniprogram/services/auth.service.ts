import { request } from './request';
import { User } from '../types';
import { AuthStore } from '../store/auth';

export class AuthService {
  /**
   * 账号密码登录：角色由后端根据账号密码识别
   */
  static async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const res = await request<{ token: string; user: User }>(
      '/auth/login',
      'POST',
      { username, password },
      { showLoading: true, loadingTitle: '正在登录...', showErrorToast: true },
    );
    AuthStore.setToken(res.token);
    AuthStore.setUser(res.user);
    return res;
  }

  /**
   * 微信授权登录：不再自动提权，统一按普通用户注册
   */
  static async wechatLogin(nickname?: string, avatar?: string): Promise<{ token: string; user: User }> {
    try {
      const res = await request<{ token: string; user: User }>(
        '/auth/wechat-login',
        'POST',
        { code: `mock_wx_code_${Date.now()}`, nickname, avatar },
        { showLoading: false },
      );
      AuthStore.setToken(res.token);
      AuthStore.setUser(res.user);
      return res;
    } catch (err) {
      // 登录失败必须显式提示并中断，禁止静默降级到内置演示账号
      wx.showToast({ title: '登录失败，请检查网络后重试', icon: 'none', duration: 2500 });
      throw err;
    }
  }

  /**
   * 获取个人资料
   */
  static async getProfile(): Promise<User> {
    try {
      return await request<User>('/auth/profile', 'GET', undefined, { showErrorToast: false });
    } catch (err) {
      const user = AuthStore.getUser();
      if (user) return user;
      throw err;
    }
  }
}
