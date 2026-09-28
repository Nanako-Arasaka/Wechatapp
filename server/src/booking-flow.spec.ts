import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('SmartVenue Business Flow & Anti-Overselling E2E Test', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let adminToken: string;
  let venueId: string;
  let slotId: string;
  let createdBookingId: string;
  let createdOrderId: string;
  let bookingCode: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('TEST 01: 用户账号密码登录并获取 Token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'user', password: 'user123' })
      .expect(201);

    expect(res.body.code).toBe(0);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('USER');
    userToken = res.body.data.token;
  });

  it('TEST 02: 管理员账号密码登录并获取 Token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);

    expect(res.body.code).toBe(0);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('ADMIN');
    adminToken = res.body.data.token;
  });

  it('TEST 03: 查询场馆列表与实时余量 Slots', async () => {
    const venuesRes = await request(app.getHttpServer())
      .get('/api/venues')
      .expect(200);

    expect(venuesRes.body.code).toBe(0);
    const venues = Array.isArray(venuesRes.body.data) ? venuesRes.body.data : venuesRes.body.data.list;
    expect(venues.length).toBeGreaterThan(0);
    venueId = venues[0].id;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);

    const availRes = await request(app.getHttpServer())
      .get(`/api/venues/${venueId}/availability?date=${dateStr}`)
      .expect(200);

    expect(availRes.body.code).toBe(0);
    expect(availRes.body.data.slots.length).toBeGreaterThan(0);
    const availableSlot = availRes.body.data.slots.find((s: any) => s.remaining > 0);
    expect(availableSlot).toBeDefined();
    slotId = availableSlot.id;
  });

  it('TEST 04: 创建预约并原子扣减库存 (防超卖检验)', async () => {
    const beforeSlot = await prisma.venueSlot.findUnique({ where: { id: slotId } });
    const beforeBooked = beforeSlot!.bookedCapacity;

    const res = await request(app.getHttpServer())
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        venueId,
        slotId,
        quantity: 1,
        contactName: '自动化测试张同学',
        studentNo: '20240001',
        contactPhone: '13800138000',
      })
      .expect(201);

    expect(res.body.code).toBe(0);
    expect(res.body.data.bookingId).toBeDefined();
    expect(res.body.data.orderId).toBeDefined();
    createdBookingId = res.body.data.bookingId;
    createdOrderId = res.body.data.orderId;
    bookingCode = res.body.data.bookingCode;

    // 检查数据库中库存是否严格 +1
    const afterSlot = await prisma.venueSlot.findUnique({ where: { id: slotId } });
    expect(afterSlot!.bookedCapacity).toBe(beforeBooked + 1);
  });

  it('TEST 05: 模拟微信支付订单并扭转状态', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/orders/${createdOrderId}/pay`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(201);

    expect(res.body.code).toBe(0);
    expect(res.body.data.paymentNo).toBeDefined();

    // 验证订单和预约状态
    const booking = await prisma.booking.findUnique({ where: { id: createdBookingId } });
    expect(booking!.status).toBe('CONFIRMED');

    const order = await prisma.order.findUnique({ where: { id: createdOrderId } });
    expect(order!.paymentStatus).toBe('PAID');
    expect(order!.orderStatus).toBe('PAID');
  });

  it('TEST 06: 二维码核销预检', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/checkin/verify')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: bookingCode })
      .expect(201);

    expect(res.body.code).toBe(0);
    expect(res.body.data.bookingId).toBe(createdBookingId);
    expect(res.body.data.canConfirm).toBe(true);
  });

  it('TEST 07: 管理员确认核销入场', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/checkin/confirm')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ bookingId: createdBookingId })
      .expect(201);

    expect(res.body.code).toBe(0);
    expect(res.body.data.checkinRecordId).toBeDefined();

    const booking = await prisma.booking.findUnique({ where: { id: createdBookingId } });
    expect(booking!.status).toBe('CHECKED_IN');
  });

  it('TEST 08: 重复核销安全拦截', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/checkin/verify')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: bookingCode })
      .expect(400);

    expect(res.body.code).toBe(40051); // CHECKIN_ALREADY_DONE
  });

  it('TEST 09: 普通用户禁止访问 Admin 接口 (RoleGuard 拦截)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    expect(res.body.code).toBe(40301);
  });

  it('TEST 10: 管理员访问 Dashboard 数据看板成功', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.code).toBe(0);
    expect(res.body.data.kpi.todayOrders).toBeGreaterThanOrEqual(1);
    expect(res.body.data.incomeTrend.length).toBe(7);
  });
});
