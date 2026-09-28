import { Injectable, Logger } from '@nestjs/common';

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

@Injectable()
export class MockWechatAuthProvider {
  private readonly logger = new Logger('MockWechatAuth');

  async code2Session(code: string): Promise<WechatAuthResult> {
    this.logger.log(`Mock Wechat code2Session invoked with code: ${code}`);
    // 同一 mock code 固定映射到同一 openid，避免每次 mock 登录都创建新用户
    const simulatedOpenId = `mock_wx_openid_${Buffer.from(code).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`;
    return {
      openid: simulatedOpenId,
      sessionKey: `mock_session_key_${Date.now()}`,
    };
  }
}

@Injectable()
export class MockWechatPayProvider {
  private readonly logger = new Logger('MockWechatPay');

  async createPayment(orderNo: string, amount: number): Promise<WechatPayResult> {
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
}

@Injectable()
export class MockRefundProvider {
  private readonly logger = new Logger('MockRefund');

  async processRefund(orderNo: string, amount: number, reason?: string): Promise<RefundResult> {
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
}

@Injectable()
export class MockSmsProvider {
  private readonly logger = new Logger('MockSMS');

  async sendBookingNotification(phone: string, venueName: string, timeStr: string, code: string): Promise<boolean> {
    this.logger.log(`[SMS Sent to ${phone}] 尊敬的客户，您已成功预约【${venueName}】时段【${timeStr}】，核销码为【${code}】。请凭码入场！`);
    return true;
  }
}
