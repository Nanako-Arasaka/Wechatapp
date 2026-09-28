"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthStore = void 0;
const TOKEN_KEY = 'SMART_VENUE_TOKEN';
const USER_KEY = 'SMART_VENUE_USER';
class AuthStore {
    static getToken() {
        return wx.getStorageSync(TOKEN_KEY) || '';
    }
    static setToken(token) {
        wx.setStorageSync(TOKEN_KEY, token);
    }
    static getUser() {
        return wx.getStorageSync(USER_KEY) || null;
    }
    static setUser(user) {
        wx.setStorageSync(USER_KEY, user);
    }
    static getRole() {
        const user = this.getUser();
        return user?.role || 'USER';
    }
    static isAdmin() {
        const role = this.getRole();
        return role === 'ADMIN' || role === 'SUPER_ADMIN';
    }
    static isSuperAdmin() {
        return this.getRole() === 'SUPER_ADMIN';
    }
    static clear() {
        wx.removeStorageSync(TOKEN_KEY);
        wx.removeStorageSync(USER_KEY);
    }
}
exports.AuthStore = AuthStore;
