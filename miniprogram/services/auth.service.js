"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const request_1 = require("./request");
const auth_1 = require("../store/auth");
class AuthService {
    /**
     * 账号密码登录：角色由后端根据账号密码识别
     */
    static async login(username, password) {
        const res = await (0, request_1.request)('/auth/login', 'POST', { username, password }, { showLoading: true, loadingTitle: '正在登录...', showErrorToast: true });
        auth_1.AuthStore.setToken(res.token);
        auth_1.AuthStore.setUser(res.user);
        return res;
    }
    /**
     * 微信授权登录：不再自动提权，统一按普通用户注册
     */
    static async wechatLogin(nickname, avatar) {
        try {
            const res = await (0, request_1.request)('/auth/wechat-login', 'POST', { code: `mock_wx_code_${Date.now()}`, nickname, avatar }, { showLoading: false });
            auth_1.AuthStore.setToken(res.token);
            auth_1.AuthStore.setUser(res.user);
            return res;
        }
        catch (err) {
            // 登录失败必须显式提示并中断，禁止静默降级到内置演示账号
            wx.showToast({ title: '登录失败，请检查网络后重试', icon: 'none', duration: 2500 });
            throw err;
        }
    }
    /**
     * 获取个人资料
     */
    static async getProfile() {
        try {
            return await (0, request_1.request)('/auth/profile', 'GET', undefined, { showErrorToast: false });
        }
        catch (err) {
            const user = auth_1.AuthStore.getUser();
            if (user)
                return user;
            throw err;
        }
    }
}
exports.AuthService = AuthService;
