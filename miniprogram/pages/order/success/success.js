"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const order_service_1 = require("../../../services/order.service");
const qrcode_1 = require("../../../utils/qrcode");
const format_1 = require("../../../utils/format");
Page({
    data: {
        orderId: '',
        bookingCode: '',
        order: null,
        loading: true,
        loadError: false,
        canCheckin: false,
        statusText: '',
        qrError: false,
    },
    _visible: false,
    onLoad(options) {
        this.setData({ orderId: options.orderId || '' });
    },
    onShow() {
        this._visible = true;
        this.loadOrderDetail();
    },
    onHide() {
        this._visible = false;
        this.setData({ canCheckin: false });
    },
    onUnload() {
        this._visible = false;
    },
    onRetry() {
        this.loadOrderDetail();
    },
    async loadOrderDetail() {
        this.setData({ loading: true, loadError: false, canCheckin: false, bookingCode: '', qrError: false });
        try {
            if (!this.data.orderId)
                throw new Error('缺少订单号');
            const order = await order_service_1.OrderService.getOrderDetail(this.data.orderId);
            if (!this._visible)
                return;
            const canCheckin = order.booking.status === 'CONFIRMED' && order.paymentStatus === 'PAID' && !!order.booking.bookingCode;
            this.setData({
                order,
                canCheckin,
                bookingCode: canCheckin ? order.booking.bookingCode : '',
                statusText: (0, format_1.getStatusMeta)(order.booking.status).label,
                loading: false,
            }, () => {
                if (!canCheckin || !this._visible)
                    return;
                try {
                    qrcode_1.QRCodeGenerator.draw('qrcodeCanvas', order.booking.bookingCode, 160, 160, this);
                }
                catch (err) {
                    this.setData({ qrError: true });
                }
            });
        }
        catch (err) {
            if (this._visible)
                this.setData({ order: null, loading: false, loadError: true });
        }
    },
    onOpenLocation() {
        const venue = this.data.order?.booking.venue;
        if (!venue)
            return;
        // 场馆接口没有经纬度，展示已知地址供用户复制。
        wx.showModal({
            title: venue.name,
            content: venue.address || '场馆暂未提供地址',
            confirmText: '复制地址',
            success: (res) => {
                if (res.confirm && venue.address)
                    wx.setClipboardData({ data: venue.address });
            },
        });
    },
    goToOrders() {
        wx.switchTab({ url: '/pages/order/list/list' });
    },
    goToHome() {
        wx.switchTab({ url: '/pages/index/index' });
    },
});
