"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("./store/auth");
const auth_service_1 = require("./services/auth.service");
App({
    globalData: {
        userInfo: null,
        isLoggedIn: false,
        targetOrderStatus: null,
        targetVenueKeyword: null,
        targetVenueType: null,
    },
    onLaunch() {
        console.log('🚀 Slotify (智场通) 启动中...');
        // 1. 检查本地是否有已登录的用户会话
        const token = auth_1.AuthStore.getToken();
        const user = auth_1.AuthStore.getUser();
        if (token && user) {
            this.globalData.userInfo = user;
            this.globalData.isLoggedIn = true;
            console.log(`👤 恢复已登录用户会话: ${user.nickname} [${user.role}]`);
            // 后台静默校验并刷新最新用户信息
            auth_service_1.AuthService.getProfile()
                .then((profile) => {
                this.globalData.userInfo = profile;
                auth_1.AuthStore.setUser(profile);
            })
                .catch(() => {
                if (!auth_1.AuthStore.getToken()) {
                    this.globalData.userInfo = null;
                    this.globalData.isLoggedIn = false;
                }
            });
        }
        else {
            // 默认保持未登录状态
            this.globalData.userInfo = null;
            this.globalData.isLoggedIn = false;
            console.log('👤 进入小程序默认未登录状态，等待用户自主选择角色登录');
        }
    },
});
