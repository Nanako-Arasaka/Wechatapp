"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_service_1 = require("../../../services/auth.service");
Page({
    data: {
        username: '',
        password: '',
    },
    onUsernameInput(e) {
        this.setData({ username: e.detail.value });
    },
    onPasswordInput(e) {
        this.setData({ password: e.detail.value });
    },
    async handleLogin() {
        const { username, password } = this.data;
        if (!username.trim()) {
            wx.showToast({ title: '请输入学工号', icon: 'none' });
            return;
        }
        if (!password.trim()) {
            wx.showToast({ title: '请输入密码', icon: 'none' });
            return;
        }
        try {
            const res = await auth_service_1.AuthService.login(username.trim(), password);
            wx.showToast({
                title: `欢迎，${res.user.nickname}`,
                icon: 'success',
                duration: 1500,
            });
            setTimeout(() => {
                wx.switchTab({ url: '/pages/index/index' });
            }, 1500);
        }
        catch (err) {
            console.warn('登录异常:', err);
        }
    },
    async handleWechatLogin() {
        try {
            const res = await auth_service_1.AuthService.wechatLogin('微信运动用户', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');
            wx.showToast({
                title: '微信登录成功',
                icon: 'success',
            });
            setTimeout(() => {
                wx.switchTab({ url: '/pages/index/index' });
            }, 1000);
        }
        catch (err) {
            wx.switchTab({ url: '/pages/index/index' });
        }
    },
});
