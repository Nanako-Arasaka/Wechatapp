import { User, Role } from '../types';

const TOKEN_KEY = 'SMART_VENUE_TOKEN';
const REFRESH_TOKEN_KEY = 'SMART_VENUE_REFRESH_TOKEN';
const USER_KEY = 'SMART_VENUE_USER';

export class AuthStore {
  static getToken(): string {
    return wx.getStorageSync(TOKEN_KEY) || '';
  }

  static setToken(token: string) {
    wx.setStorageSync(TOKEN_KEY, token);
  }

  static getRefreshToken(): string {
    return wx.getStorageSync(REFRESH_TOKEN_KEY) || '';
  }

  static setRefreshToken(refreshToken: string) {
    wx.setStorageSync(REFRESH_TOKEN_KEY, refreshToken);
  }

  /** 同时保存 access / refresh token */
  static setTokens(token: string, refreshToken?: string) {
    this.setToken(token);
    if (refreshToken) {
      this.setRefreshToken(refreshToken);
    }
  }

  static getUser(): User | null {
    return wx.getStorageSync(USER_KEY) || null;
  }

  static setUser(user: User) {
    wx.setStorageSync(USER_KEY, user);
  }

  static getRole(): Role {
    const user = this.getUser();
    return user?.role || 'USER';
  }

  static isAdmin(): boolean {
    const role = this.getRole();
    return role === 'ADMIN' || role === 'SUPER_ADMIN';
  }

  static isSuperAdmin(): boolean {
    return this.getRole() === 'SUPER_ADMIN';
  }

  static clear() {
    wx.removeStorageSync(TOKEN_KEY);
    wx.removeStorageSync(REFRESH_TOKEN_KEY);
    wx.removeStorageSync(USER_KEY);
  }
}
