"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const order_service_1 = require("../../../services/order.service");
const qrcode_1 = require("../../../utils/qrcode");
Page({
    data: {
        orderId: '',
        bookingCode: '',
        order: null,
    },
    onLoad(options) {
        if (options.orderId) {
            this.setData({
                orderId: options.orderId,
                bookingCode: options.bookingCode || 'SV202609010001',
            });
            this.loadOrderDetail(options.orderId);
        }
    },
    async loadOrderDetail(id) {
        try {
            const order = await order_service_1.OrderService.getOrderDetail(id);
            const bCode = order.bookingCode || order.booking?.bookingCode || this.data.bookingCode;
            const bNo = order.booking?.bookingNo || order.orderNo || `BK${id.slice(-6)}`;
            this.setData({
                order,
                bookingCode: bCode,
            });
            // 绘制二维码
            const qrPayload = JSON.stringify({
                type: 'BOOKING_CHECKIN',
                bookingNo: bNo,
                bookingCode: bCode,
            });
            setTimeout(() => {
                qrcode_1.QRCodeGenerator.draw('qrcodeCanvas', qrPayload, 160, 160, this);
            }, 200);
        }
        catch (err) {
            console.error('加载凭证详情失败:', err);
        }
    },
    goToOrders() {
        wx.switchTab({ url: '/pages/order/list/list' });
    },
    goToHome() {
        wx.switchTab({ url: '/pages/index/index' });
    },
});
