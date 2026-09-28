export interface WechatAuthResult {
    openid: string;
    unionid?: string;
    sessionKey: string;
}
export interface WechatPayResult {
    transactionNo: string;
    paymentNo: string;
    paidAt: Date;
    status: 'SUCCESS' | 'FAILED';
}
export interface RefundResult {
    refundNo: string;
    transactionNo: string;
    amount: number;
    completedAt: Date;
    status: 'SUCCESS' | 'FAILED';
}
export declare class MockWechatAuthProvider {
    private readonly logger;
    code2Session(code: string): Promise<WechatAuthResult>;
}
export declare class MockWechatPayProvider {
    private readonly logger;
    createPayment(orderNo: string, amount: number): Promise<WechatPayResult>;
}
export declare class MockRefundProvider {
    private readonly logger;
    processRefund(orderNo: string, amount: number, reason?: string): Promise<RefundResult>;
}
export declare class MockSmsProvider {
    private readonly logger;
    sendBookingNotification(phone: string, venueName: string, timeStr: string, code: string): Promise<boolean>;
}
