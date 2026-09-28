"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.request = void 0;
const config_1 = require("../config");
const auth_1 = require("../store/auth");
/**
 * 全局统一 HTTP 网络请求客户端
 */
function request(url, method = 'GET', data, options = {}) {
    const { showLoading = false, loadingTitle = '加载中...', showErrorToast = false, // 默认静默，防止外部真机体验版弹出连接失败
    retryOn401 = true, } = options;
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
    // 清洗过滤无效参数
    let cleanData = data;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        cleanData = {};
        for (const key of Object.keys(data)) {
            const val = data[key];
            if (val !== undefined && val !== null && val !== '') {
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
                    auth_1.AuthStore.clear();
                    wx.showToast({ title: '登录已过期，请重新登录', icon: 'none', duration: 2500 });
                    reject(new Error('未授权'));
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
                // 静默失败，由上层 Service 自动降级为自愈数据引擎
                reject(new Error(err.errMsg || 'NETWORK_FAIL'));
            },
        });
    });
}
exports.request = request;
