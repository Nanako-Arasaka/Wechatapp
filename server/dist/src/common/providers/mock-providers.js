"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockSmsProvider = exports.MockRefundProvider = exports.MockWechatPayProvider = exports.MockWechatAuthProvider = void 0;
const common_1 = require("@nestjs/common");
let MockWechatAuthProvider = class MockWechatAuthProvider {
    constructor() {
        this.logger = new common_1.Logger('MockWechatAuth');
    }
    async code2Session(code) {
        this.logger.log(`Mock Wechat code2Session invoked with code: ${code}`);
        const simulatedOpenId = `mock_wx_openid_${Buffer.from(code).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`;
        return {
            openid: simulatedOpenId,
            sessionKey: `mock_session_key_${Date.now()}`,
        };
    }
};
exports.MockWechatAuthProvider = MockWechatAuthProvider;
exports.MockWechatAuthProvider = MockWechatAuthProvider = __decorate([
    (0, common_1.Injectable)()
], MockWechatAuthProvider);
let MockWechatPayProvider = class MockWechatPayProvider {
    constructor() {
        this.logger = new common_1.Logger('MockWechatPay');
    }
    async createPayment(orderNo, amount) {
        this.logger.log(`Mock Wechat Pay initiated: orderNo=${orderNo}, amount=${amount / 100}元`);
        const dateStr = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const transactionNo = `WXPAY${dateStr}${randomSuffix}`;
        const paymentNo = `PAY${dateStr}${randomSuffix}`;
        return {
            transactionNo,
            paymentNo,
            paidAt: new Date(),
            status: 'SUCCESS',
        };
    }
};
exports.MockWechatPayProvider = MockWechatPayProvider;
exports.MockWechatPayProvider = MockWechatPayProvider = __decorate([
    (0, common_1.Injectable)()
], MockWechatPayProvider);
let MockRefundProvider = class MockRefundProvider {
    constructor() {
        this.logger = new common_1.Logger('MockRefund');
    }
    async processRefund(orderNo, amount, reason) {
        this.logger.log(`Mock Refund processing: orderNo=${orderNo}, amount=${amount / 100}元, reason=${reason || '用户主动取消'}`);
        const dateStr = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const refundNo = `RF${dateStr}${randomSuffix}`;
        const transactionNo = `WXREF${dateStr}${randomSuffix}`;
        return {
            refundNo,
            transactionNo,
            amount,
            completedAt: new Date(),
            status: 'SUCCESS',
        };
    }
};
exports.MockRefundProvider = MockRefundProvider;
exports.MockRefundProvider = MockRefundProvider = __decorate([
    (0, common_1.Injectable)()
], MockRefundProvider);
let MockSmsProvider = class MockSmsProvider {
    constructor() {
        this.logger = new common_1.Logger('MockSMS');
    }
    async sendBookingNotification(phone, venueName, timeStr, code) {
        this.logger.log(`[SMS Sent to ${phone}] 尊敬的客户，您已成功预约【${venueName}】时段【${timeStr}】，核销码为【${code}】。请凭码入场！`);
        return true;
    }
};
exports.MockSmsProvider = MockSmsProvider;
exports.MockSmsProvider = MockSmsProvider = __decorate([
    (0, common_1.Injectable)()
], MockSmsProvider);
//# sourceMappingURL=mock-providers.js.map