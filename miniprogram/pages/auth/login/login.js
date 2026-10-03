"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_service_1 = require("../../../services/auth.service");
Page({
    data: {
        username: '',
        password: '',
        submitting: false,
    },
    // 登录成功后的回跳目标（由 admin-guard 等以 ?redirect= 传入）
    redirectUrl: '',
    onLoad(options) {
        if (options && options.redirect) {
            this.redirectUrl = decodeURIComponent(options.redirect);
        }
    },
    /** 登录成功后统一跳转：优先回跳目标页，否则回首页 */
    navigateAfterLogin() {
        const target = this.redirectUrl;
        this.redirectUrl = '';
        if (!target) {
            wx.switchTab({ url: '/pages/index/index' });
            return;
        }
        // tabBar 页面必须用 switchTab，其余用 reLaunch 避免返回栈残留登录页
        const tabPages = [
            '/pages/index/index',
            '/pages/venue/list/list',
            '/pages/order/list/list',
            '/pages/user/profile/profile',
        ];
        if (tabPages.includes(target)) {
            wx.switchTab({ url: target });
        }
        else {
            wx.reLaunch({ url: target });
        }
    },
    onUsernameInput(e) {
        this.setData({ username: e.detail.value });
    },
    onPasswordInput(e) {
        this.setData({ password: e.detail.value });
    },
    async handleLogin() {
        if (this.data.submitting)
            return;
        const { username, password } = this.data;
        if (!username.trim()) {
            wx.showToast({ title: '请输入学工号', icon: 'none' });
            return;
        }
        if (!password.trim()) {
            wx.showToast({ title: '请输入密码', icon: 'none' });
            return;
        }
        this.setData({ submitting: true });
        try {
            const res = await auth_service_1.AuthService.login(username.trim(), password);
            wx.showToast({
                title: `欢迎，${res.user.nickname}`,
                icon: 'success',
                duration: 1500,
            });
            this.navigateAfterLogin();
        }
        catch (err) {
            console.warn('登录异常:', err);
        }
        finally {
            this.setData({ submitting: false });
        }
    },
    async handleWechatLogin() {
        if (this.data.submitting)
            return;
        this.setData({ submitting: true });
        try {
            await auth_service_1.AuthService.wechatLogin();
            wx.showToast({
                title: '微信登录成功',
                icon: 'success',
            });
            this.navigateAfterLogin();
        }
        catch (err) {
            console.warn('微信登录失败:', err);
        }
        finally {
            this.setData({ submitting: false });
        }
    },
});
