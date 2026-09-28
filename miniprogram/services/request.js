"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.request = void 0;
const config_1 = require("../config");
const auth_1 = require("../store/auth");
/** 并发 401 时合并为一次 refresh */
let refreshInFlight = null;
function refreshAccessToken() {
    if (refreshInFlight) {
        return refreshInFlight;
    }
    const refreshToken = auth_1.AuthStore.getRefreshToken();
    if (!refreshToken) {
        return Promise.reject(new Error('NO_REFRESH_TOKEN'));
    }
    refreshInFlight = new Promise((resolve, reject) => {
        wx.request({
            url: `${config_1.CONFIG.API_BASE_URL}/auth/refresh`,
            method: 'POST',
            data: { refreshToken },
            header: { 'Content-Type': 'application/json' },
            timeout: 5000,
            success: (res) => {
                const body = res.data;
                const ok = (res.statusCode === 200 || res.statusCode === 201) && body && body.code === 0 && body.data?.token;
                if (ok) {
                    // refresh 轮换：保存新的 access + refresh
                    auth_1.AuthStore.setTokens(body.data.token, body.data.refreshToken);
                    resolve(body.data.token);
                }
                else {
                    reject(new Error(body?.message || 'REFRESH_FAILED'));
                }
            },
            fail: (err) => {
                reject(new Error(err.errMsg || 'REFRESH_FAILED'));
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
function request(url, method = 'GET', data, options = {}) {
    const { showLoading = false, loadingTitle = '加载中...', showErrorToast = false, retryOn401 = true, skipAuthRefresh = false, } = options;
    if (showLoading) {
        wx.showLoading({ title: loadingTitle, mask: true });
    }
    const token = auth_1.AuthStore.getToken();
    const header = {
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
    const fullUrl = url.startsWith('http') ? url : `${config_1.CONFIG.API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    return new Promise((resolve, reject) => {
        wx.request({
            url: fullUrl,
            method,
            data: cleanData,
            header,
            timeout: 5000,
            success: async (res) => {
                if (showLoading) {
                    wx.hideLoading();
                }
                const statusCode = res.statusCode;
                const body = res.data;
                if (statusCode === 200 || statusCode === 201) {
                    if (body && body.code === 0) {
                        resolve(body.data);
                    }
                    else {
                        const errorMsg = body?.message || '操作失败';
                        if (showErrorToast) {
                            wx.showToast({ title: errorMsg, icon: 'none', duration: 2500 });
                        }
                        reject(new Error(errorMsg));
                    }
                }
                else if (statusCode === 401) {
                    // access token 过期：尝试用 refreshToken 续期后重放一次
                    const canRefresh = !skipAuthRefresh && retryOn401 && !!auth_1.AuthStore.getRefreshToken();
                    if (canRefresh) {
                        let refreshed = false;
                        try {
                            await refreshAccessToken();
                            refreshed = true;
                        }
                        catch (refreshErr) {
                            // 刷新失败视为会话失效
                        }
                        if (refreshed) {
                            // 重试接口自身的业务或网络错误不能当作登录失效。
                            request(url, method, data, { ...options, retryOn401: false }).then(resolve, reject);
                            return;
                        }
                    }
                    if (!skipAuthRefresh)
                        auth_1.AuthStore.clear();
                    const errorMsg = skipAuthRefresh ? (body?.message || '登录失败') : '登录已过期，请重新登录';
                    if (!skipAuthRefresh || showErrorToast)
                        wx.showToast({ title: errorMsg, icon: 'none', duration: 2500 });
                    reject(new Error(errorMsg));
                }
                else if (statusCode === 403) {
                    const errorMsg = body?.message || '暂无管理权限';
                    if (showErrorToast) {
                        wx.showToast({ title: errorMsg, icon: 'none', duration: 2500 });
                    }
                    reject(new Error(errorMsg));
                }
                else {
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
                if (showErrorToast)
                    wx.showToast({ title: errorMsg, icon: 'none', duration: 2500 });
                reject(new Error(errorMsg));
            },
        });
    });
}
exports.request = request;
