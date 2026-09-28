"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_service_1 = require("../../../services/auth.service");
Page({
    data: {
        username: '',
        password: '',
        submitting: false,
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
            wx.switchTab({ url: '/pages/index/index' });
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
            wx.switchTab({ url: '/pages/index/index' });
        }
        catch (err) {
            console.warn('微信登录失败:', err);
        }
        finally {
            this.setData({ submitting: false });
        }
    },
});
