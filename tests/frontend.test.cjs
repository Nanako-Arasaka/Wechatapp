const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '../miniprogram');
const quiet = { log() {}, warn() {}, error() {} };

function load(relative, stubs = {}, wxOverrides = {}, globals = {}) {
  const calls = [];
  const wx = new Proxy(wxOverrides, {
    get(target, key) {
      if (key in target) return target[key];
      return (...args) => {
        calls.push([key, ...args]);
        if (key === 'getStorageSync') return '';
      };
    },
  });
  const filename = path.join(root, relative);
  const nativeRequire = createRequire(filename);
  const module = { exports: {} };
  let page;
  let component;
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    module,
    exports: module.exports,
    require: (name) => name in stubs ? stubs[name] : nativeRequire(name),
    wx,
    Page: (options) => { page = options; },
    Component: (options) => { component = options; },
    getApp: () => ({ globalData: {} }),
    console: quiet,
    setTimeout,
    clearTimeout,
    setInterval: () => 1,
    clearInterval: () => {},
    ...globals,
  }, { filename });
  if (page) {
    page.data = structuredClone(page.data);
    page.setData = (values, callback) => {
      for (const [key, value] of Object.entries(values)) {
        const parts = key.split('.');
        let target = page.data;
        for (const part of parts.slice(0, -1)) target = target[part];
        target[parts.at(-1)] = value;
      }
      callback?.();
    };
  }
  return { page, component, exports: module.exports, calls };
}

const orderStubs = (service) => ({ '../../../services/order.service': { OrderService: service } });
const adminStubs = (service) => ({
  '../../../services/admin.service': { AdminService: service },
  '../../../utils/admin-guard': { guardAdminPage: () => true },
});
function order(status = 'PENDING_PAYMENT', expiredAt = new Date(Date.now() + 60000).toISOString()) {
  return {
    id: 'order-1', orderNo: 'ORD-1', amount: 3500, paidAmount: 3500,
    orderStatus: status === 'PENDING_PAYMENT' ? status : 'PAID',
    paymentStatus: status === 'PENDING_PAYMENT' ? 'UNPAID' : 'PAID',
    booking: {
      id: 'booking-1', status, expiredAt, bookingCode: 'SV202609280123',
      bookingDate: '2026-09-28', contactName: '张三', contactPhone: '13800138000', studentNo: '12345678',
      venue: { id: 'venue-1', name: '体育馆', address: '文体中心一层' },
    }, payments: [], refunds: [],
  };
}

test('订单请求失败必须抛错，不返回示例订单', async () => {
  const { OrderService } = load('services/order.service.js', {
    './request': { request: async () => { throw new Error('offline'); } },
  }).exports;
  await assert.rejects(OrderService.getOrders(), /offline/);
  await assert.rejects(OrderService.getOrderDetail('missing'), /offline/);
});

test('退改分组包含退款、取消及超时订单', async () => {
  let filter;
  const { OrderService } = load('services/order.service.js', {
    './request': { request: async (_url, _method, params) => {
      filter = params.status;
      return ['REFUNDED', 'CANCELLED', 'EXPIRED', 'CONFIRMED'].map((bookingStatus) => ({ bookingStatus }));
    } },
  }).exports;
  const list = await OrderService.getOrders('REFUNDED');
  assert.equal(filter, undefined);
  assert.equal(list.length, 3);
});

test('缺失预约结构的订单详情不能当作成功', async () => {
  const { OrderService } = load('services/order.service.js', { './request': { request: async () => ({ id: 'bad' }) } }).exports;
  await assert.rejects(OrderService.getOrderDetail('bad'), /订单数据异常/);
});

test('待支付订单取消传预约 ID，不能传订单 ID', async () => {
  let cancelled;
  const { page } = load('pages/order/list/list.js', {
    ...orderStubs({ cancelOrder: async (id) => { cancelled = id; } }),
    '../../../store/auth': { AuthStore: { getToken: () => 'token' } },
  }, { showModal: async (options) => options.success({ confirm: true }) });
  page.data.orderList = [{ id: 'order-1', bookingId: 'booking-1' }];
  page.loadOrders = async () => {};
  await page.onCancelOrder({ currentTarget: { dataset: { id: 'order-1' } } });
  await new Promise(setImmediate);
  assert.equal(cancelled, 'booking-1');
});

test('订单列表加载失败可重试', async () => {
  let fail = true;
  const { page } = load('pages/order/list/list.js', {
    ...orderStubs({ getOrders: async () => { if (fail) throw new Error('offline'); return []; } }),
    '../../../store/auth': { AuthStore: { getToken: () => 'token' } },
  });
  await page.loadOrders();
  assert.equal(page.data.loadError, true);
  fail = false;
  await page.loadOrders();
  assert.equal(page.data.loadError, false);
});

test('倒计时基于截止时间，隐藏后返回不会重新给 15 分钟', async () => {
  let now = 1000000;
  let timerCount = 0;
  const FakeDate = class extends Date { static now() { return now; } };
  const { page } = load('pages/order/pay/pay.js', orderStubs({ getOrderDetail: async () => order('PENDING_PAYMENT', new Date(1060000).toISOString()) }), {}, {
    Date: FakeDate, setInterval: () => ++timerCount,
  });
  page.onLoad({ orderId: 'order-1' });
  page._visible = true;
  await page.loadOrderDetail();
  assert.equal(page.data.countdownText, '01:00');
  page.onHide();
  assert.equal(page._timer, null);
  now += 45000;
  page.onShow();
  await new Promise(setImmediate);
  assert.equal(page.data.countdownText, '00:15');
  assert.equal(timerCount, 2);
  now += 16000;
  page.updateCountdown();
  assert.equal(page.data.canPay, false);
  assert.equal(page._timer, null);
});

test('支付连点只提交一次，支付成功后跳转失败也不能再次支付', async () => {
  let resolvePay;
  let count = 0;
  const { page } = load('pages/order/pay/pay.js', orderStubs({ payOrder: () => {
    count++;
    return new Promise((resolve) => { resolvePay = resolve; });
  } }), { redirectTo: (options) => options.fail() });
  page.data.order = order();
  page.data.loading = false;
  const first = page.onConfirmPay();
  await page.onConfirmPay();
  assert.equal(count, 1);
  resolvePay({});
  await first;
  await page.onConfirmPay();
  assert.equal(count, 1);
  assert.equal(page.data.canPay, false);
});

for (const status of ['PENDING_PAYMENT', 'CANCELLED', 'REFUNDED', 'EXPIRED', 'CHECKED_IN', 'COMPLETED']) {
  test(`${status} 预约不显示可核销二维码`, async () => {
    let draws = 0;
    const { page } = load('pages/order/success/success.js', {
      ...orderStubs({ getOrderDetail: async () => order(status) }),
      '../../../utils/qrcode': { QRCodeGenerator: { draw: () => draws++ } },
    });
    page._visible = true;
    page.data.orderId = 'order-1';
    await page.loadOrderDetail();
    assert.equal(page.data.canCheckin, false);
    assert.equal(page.data.bookingCode, '');
    assert.equal(draws, 0);
  });
}

test('有效凭证使用服务端核销码及联系方式', async () => {
  let payload;
  const { page } = load('pages/order/success/success.js', {
    ...orderStubs({ getOrderDetail: async () => order('CONFIRMED') }),
    '../../../utils/qrcode': { QRCodeGenerator: { draw: (_id, code) => { payload = code; } } },
  });
  page._visible = true;
  page.data.orderId = 'order-1';
  await page.loadOrderDetail();
  assert.equal(payload, 'SV202609280123');
  assert.equal(page.data.order.booking.studentNo, '12345678');
});

test('凭证请求失败不能显示成功，重试后可恢复', async () => {
  let fail = true;
  const { page } = load('pages/order/success/success.js', {
    ...orderStubs({ getOrderDetail: async () => { if (fail) throw new Error('offline'); return order('CONFIRMED'); } }),
    '../../../utils/qrcode': { QRCodeGenerator: { draw() {} } },
  });
  page._visible = true;
  page.data.orderId = 'order-1';
  await page.loadOrderDetail();
  assert.equal(page.data.loadError, true);
  assert.equal(page.data.order, null);
  fail = false;
  await page.loadOrderDetail();
  assert.equal(page.data.canCheckin, true);
});

test('预约创建后跳转失败，重试不会创建第二个订单', async () => {
  let creates = 0;
  const { page } = load('pages/order/confirm/confirm.js', {
    '../../../services/booking.service': { BookingService: { createBooking: async () => { creates++; return { orderId: 'order-1' }; } } },
  }, { redirectTo: (options) => { options.fail(); options.complete(); } });
  Object.assign(page.data, { venueId: 'v', slotId: 's', quantity: 1, studentNo: '12345678', contactName: '张三', contactPhone: '13800138000' });
  await page.onConfirmSheet();
  await page.onConfirmSheet();
  assert.equal(creates, 1);
  assert.equal(page.data.submitting, false);
});

test('热力图正确处理零值和二维数据，失败不保留预置矩阵', async () => {
  let fail = false;
  const { page } = load('pages/admin/heatmap/heatmap.js', adminStubs({ getHeatmap: async () => {
    if (fail) throw new Error('offline');
    return { days: ['周一'], hours: ['08:00', '10:00'], matrix: [[0, 95]] };
  } }));
  await page.loadHeatmap();
  assert.equal(page.data.rows[0].cells[0].value, 0);
  assert.equal(page.data.rows[0].cells[1].background, '#002C8C');
  fail = true;
  await page.loadHeatmap();
  assert.equal(page.data.loadError, true);
  assert.equal(page.data.rows.length, 0);
});

test('管理员列表读取解包后的 list', async () => {
  const { page } = load('pages/admin/users/users.js', adminStubs({ getUsers: async () => ({ list: [{ id: 'admin-1' }] }) }));
  page.data.isSuperAdmin = true;
  await page.loadAdmins();
  assert.equal(page.data.adminList[0].id, 'admin-1');
});

test('場馆选择器保存类型键，新增表单支持免费场馆', async () => {
  let payload;
  const { page } = load('pages/admin/venues/venues.js', adminStubs({
    createVenue: async (value) => { payload = value; },
    getVenues: async () => ({ list: [] }),
  }));
  page.openAddModal();
  page.onTypeChange({ detail: { value: '2' } });
  assert.equal(page.data.form.type, 'TENNIS');
  Object.assign(page.data.form, { name: '网球馆', description: '室外网球场', basePriceYuan: '0' });
  await page.submitVenueForm();
  assert.equal(payload.type, 'TENNIS');
  assert.equal(payload.basePrice, 0);
});

test('场馆搜索必须替换列表而非追加到下一页', async () => {
  let requestedPage;
  const { page } = load('pages/admin/venues/venues.js', adminStubs({ getVenues: async (page) => {
    requestedPage = page;
    return { list: [{ id: 'new' }] };
  } }));
  page.data.venues = [{ id: 'old' }];
  page.data.page = 3;
  page.onSearchConfirm();
  await new Promise(setImmediate);
  assert.equal(requestedPage, 1);
  assert.equal(page.data.venues[0].id, 'new');
});

test('旧请求晚返回时不能覆盖当前订单筛选', async () => {
  let resolveOld;
  const { page } = load('pages/order/list/list.js', {
    ...orderStubs({ getOrders: (status) => status ? Promise.resolve([{ id: 'new' }]) : new Promise((resolve) => { resolveOld = resolve; }) }),
    '../../../store/auth': { AuthStore: { getToken: () => 'token' } },
  });
  const old = page.loadOrders();
  page.data.currentStatus = 'CONFIRMED';
  await page.loadOrders();
  resolveOld([{ id: 'old' }]);
  await old;
  assert.equal(page.data.orderList[0].id, 'new');
});

test('图表按实际画布尺寸绘制', () => {
  let size;
  const { CanvasChart } = load('utils/chart.js', {}, {
    nextTick: (callback) => callback(),
    createSelectorQuery: () => ({ in() { return this; }, select() { return this; },
      boundingClientRect(callback) { callback({ width: 250, height: 180 }); return this; }, exec() {},
    }),
  }).exports;
  CanvasChart.drawInPage('chart', {}, (width, height) => { size = [width, height]; });
  assert.deepEqual(size, [250, 180]);
});

test('负收入数据保持在图表绘图区内，零收入不绘制虚假占比', () => {
  const ys = [];
  const labels = [];
  const context = new Proxy({}, { get: (_target, key) => (...args) => {
    if (key === 'lineTo') ys.push(args[1]);
    if (key === 'fillText') labels.push(args[0]);
    if (key === 'measureText') return { width: 10 };
  } });
  const { CanvasChart } = load('utils/chart.js', {}, { createCanvasContext: () => context }).exports;
  CanvasChart.drawLineChart('line', [{ date: '1', value: -100 }, { date: '2', value: 50 }], 250, 180);
  assert.ok(ys.every((y) => y >= 25 && y <= 145));
  CanvasChart.drawDonutChart('pie', [{ name: '体育馆', value: 0, percentage: 0 }], 250, 180);
  assert.ok(labels.includes('暂无收入'));
});

test('核销失败必须清除旧结果', async () => {
  const { page } = load('pages/admin/checkin/checkin.js', adminStubs({ verifyCheckin: async () => { throw new Error('invalid'); } }));
  page.data.verifyResult = { bookingId: 'old' };
  const pending = page.verify('invalid');
  assert.equal(page.data.verifyResult, null);
  await pending;
  assert.equal(page.data.verifyResult, null);
  assert.equal(page.data.parsing, false);
});

test('微信登录失败不会跳到首页', async () => {
  const { page, calls } = load('pages/auth/login/login.js', {
    '../../../services/auth.service': { AuthService: { wechatLogin: async () => { throw new Error('offline'); } } },
  });
  await page.handleWechatLogin();
  assert.equal(calls.some(([name]) => name === 'switchTab'), false);
  assert.equal(page.data.submitting, false);
});

function requestHarness(responses) {
  let cleared = false;
  let sent;
  const store = {
    getToken: () => 'token', getRefreshToken: () => 'refresh', setTokens() {},
    clear() { cleared = true; },
  };
  const result = load('services/request.js', {
    '../store/auth': { AuthStore: store }, '../config': { CONFIG: { API_BASE_URL: 'https://example.test/api' } },
  }, { request: (options) => {
    sent = options.data;
    const response = responses.shift();
    if (response.fail) options.fail(response.fail);
    else options.success(response);
  } });
  return { ...result, cleared: () => cleared, sent: () => sent };
}

test('续期后的业务错误不清空登录态', async () => {
  const h = requestHarness([
    { statusCode: 401, data: {} },
    { statusCode: 200, data: { code: 0, data: { token: 'new', refreshToken: 'new-refresh' } } },
    { statusCode: 500, data: { message: '业务失败' } },
  ]);
  await assert.rejects(h.exports.request('/orders'), /业务失败/);
  assert.equal(h.cleared(), false);
});

test('登录密码错误显示接口原因，不清除已有会话', async () => {
  const h = requestHarness([{ statusCode: 401, data: { message: '账号或密码错误' } }]);
  await assert.rejects(h.exports.request('/auth/login', 'POST', {}, { skipAuthRefresh: true }), /账号或密码错误/);
  assert.equal(h.cleared(), false);
});

test('请求保留用于清空字段的空字符串与 null', async () => {
  const h = requestHarness([{ statusCode: 200, data: { code: 0, data: {} } }]);
  await h.exports.request('/admin/venues/v', 'PUT', { description: '', phone: null, omitted: undefined });
  assert.equal(h.sent().description, '');
  assert.equal(h.sent().phone, null);
  assert.equal('omitted' in h.sent(), false);
});

test('网络失败在启用提示的操作中显示错误', async () => {
  const h = requestHarness([{ fail: { errMsg: 'request:fail' } }]);
  await assert.rejects(h.exports.request('/admin/users', 'POST', {}, { showErrorToast: true }), /网络连接失败/);
  assert.equal(h.calls.some(([name]) => name === 'showToast'), true);
});

test('全部注册页面的静态事件处理器存在，静态跳转目标已注册', () => {
  const pages = JSON.parse(fs.readFileSync(path.join(root, 'app.json'))).pages;
  for (const route of pages) {
    const { page } = load(`${route}.js`);
    const wxml = fs.readFileSync(path.join(root, `${route}.wxml`), 'utf8');
    for (const match of wxml.matchAll(/\b(?:bind|catch):?[\w-]+="([^"{}]+)"/g)) {
      assert.equal(typeof page[match[1]], 'function', `${route}: ${match[1]}`);
    }
    for (const match of wxml.matchAll(/data-url="\/([^"?]+)[^"]*"/g)) {
      assert.ok(pages.includes(match[1]), `${route}: ${match[1]}`);
    }
    for (const match of wxml.matchAll(/\{\{([^}]+)\}\}/g)) {
      assert.doesNotMatch(match[1], /(?<!\.)\bgetCellBg\(/, `${route}: WXML cannot call Page methods`);
    }
  }
});

test('二维码绘制可还原实际核销码', { skip: !process.env.QR_DECODER }, () => {
  const decode = require(process.env.QR_DECODER);
  const width = 160;
  const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
  let fill;
  const { QRCodeGenerator } = load('utils/qrcode.js', {}, { createCanvasContext: () => ({
    setFillStyle(value) { fill = value; },
    fillRect(x, y, w, h) {
      const value = fill === '#FFFFFF' ? 255 : 0;
      for (let row = y; row < y + h; row++) for (let col = x; col < x + w; col++) {
        const offset = (row * width + col) * 4;
        pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = value;
      }
    },
    draw() {},
  }) }).exports;
  QRCodeGenerator.draw('canvas', 'SV202609280123', width, width);
  assert.equal(decode(pixels, width, width).data, 'SV202609280123');
});

const calendar = require('../miniprogram/utils/booking-calendar');
const venueStubs = (service) => ({ '../../../services/venue.service': { VenueService: service } });
const sampleVenue = { id: 'venue-1', name: '体育馆', address: '北区', basePrice: 3500, facilities: [], capacity: 4 };
function availability(date, overrides = {}) {
  return { date, isClosed: false, slots: [{
    id: `slot-${date}`, venueId: 'venue-1', date, startTime: '09:00', endTime: '10:00',
    timeRange: '09:00-10:00', price: 3500, isSelectable: true, remaining: 3,
    totalCapacity: 4, bookedCapacity: 1, statusText: '余量充足', statusColor: 'green',
  }], ...overrides };
}
const tapData = (dataset) => ({ currentTarget: { dataset }, detail: {} });
const routeOptions = (url) => Object.fromEntries(new URL(url, 'https://test.local').searchParams);

test('日历跨月跨年覆盖今天和未来七天，完整对齐周一到周日', () => {
  for (const now of [new Date(2026, 11, 27, 18), new Date(2026, 8, 29, 18)]) {
    const dates = calendar.bookingDates(now);
    assert.equal(dates.length, 8);
    const cells = calendar.calendarCells(dates.map((date) => calendar.summarizeDay(date, availability(date), now)), now);
    assert.equal(cells.length, 14);
    assert.equal(new Date(`${cells[0].date}T12:00:00`).getDay(), 1);
    assert.deepEqual(cells.filter((cell) => !cell.empty).map((cell) => cell.date), dates);
  }
  assert.equal(calendar.bookingDates(new Date(2026, 11, 27)).at(-1), '2027-01-03');
  assert.equal(calendar.isBookingDate('2026-02-30'), false);
});

test('日历仅汇总可预约余量，闭馆、零余量、请求失败不可选择', () => {
  const date = calendar.bookingDates()[0];
  const full = availability(date, { slots: [{ isSelectable: false, remaining: 20 }, { isSelectable: true, remaining: 0 }] });
  assert.equal(calendar.summarizeDay(date, full).totalRemaining, 0);
  assert.equal(calendar.summarizeDay(date, full).disabled, true);
  assert.equal(calendar.summarizeDay(date, availability(date, { isClosed: true })).disabled, true);
  const failed = calendar.summarizeDay(date);
  assert.equal(failed.error, true);
  assert.equal(failed.isClosed, false);
  assert.equal(failed.disabled, true);
});

test('部分日期请求失败保留其他可选日，刷新约满后清除旧选择', async () => {
  const dates = calendar.bookingDates();
  let full = false;
  const { page } = load('pages/venue/date/date.js', venueStubs({
    getVenueDetail: async () => sampleVenue,
    getAvailability: async (_id, date) => {
      if (date === dates[2]) throw Error('offline');
      return availability(date, full ? { slots: [] } : {});
    },
  }));
  page.setData({ id: sampleVenue.id });
  await page.loadDays();
  assert.equal(page.data.loadError, false);
  assert.equal(page.data.hasDayErrors, true);
  page.onSelectDate(tapData({ date: dates[2] }));
  assert.equal(page.data.selectedDate, '');
  page.onSelectDate(tapData({ date: dates[1] }));
  assert.equal(page.data.selectedDate, dates[1]);
  full = true;
  await page.loadDays();
  assert.equal(page.data.selectedDate, '');
  assert.equal(page.data.cells.filter((cell) => !cell.empty).every((cell) => cell.disabled), true);
});

test('离开日期页后旧请求不能再更新页面', async () => {
  let resolveVenue;
  const { page } = load('pages/venue/date/date.js', venueStubs({
    getVenueDetail: () => new Promise((resolve) => { resolveVenue = resolve; }),
    getAvailability: async (_id, date) => availability(date),
  }));
  page.setData({ id: sampleVenue.id });
  const pending = page.loadDays();
  page.onUnload();
  const snapshot = JSON.stringify(page.data);
  resolveVenue(sampleVenue);
  await pending;
  assert.equal(JSON.stringify(page.data), snapshot);
});

test('未来日期从日历一路传到选场、联系方式和确认下单，保留真实 slotId', async () => {
  const date = calendar.bookingDates()[1];
  const service = {
    getVenueDetail: async () => sampleVenue,
    getAvailability: async (_id, requestedDate) => availability(requestedDate),
    getSlotCourts: async () => ({ totalCapacity: 4, occupied: [2] }),
  };
  const day = load('pages/venue/date/date.js', venueStubs(service));
  day.page.setData({ id: sampleVenue.id });
  await day.page.loadDays();
  day.page.onSelectDate(tapData({ date }));
  day.page.goToTime();
  const timeOptions = routeOptions(day.calls.find(([key]) => key === 'navigateTo')[1].url);
  assert.equal(timeOptions.date, date);

  const time = load('pages/venue/booking/booking.js', venueStubs(service));
  time.page.onLoad(timeOptions);
  await new Promise(setImmediate);
  assert.equal(time.page.data.today, date);
  assert.equal(time.page.data.slots[0].isSelectable, true);
  time.page.onSelectSlot(tapData({ slot: time.page.data.slots[0] }));
  time.page.goToCourtSelect();
  const courtOptions = routeOptions(time.calls.find(([key]) => key === 'navigateTo')[1].url);
  assert.equal(courtOptions.date, date);
  const court = load('pages/venue/court/court.js', venueStubs(service));
  court.page.onLoad(courtOptions);
  await new Promise(setImmediate);
  court.page.onSelectCourt(tapData({ no: 2 }));
  assert.equal(court.page.data.selectedCourtNo, 0);
  court.page.onSelectCourt(tapData({ no: 3 }));
  court.page.goToFillInfo();
  const fillOptions = routeOptions(court.calls.find(([key]) => key === 'navigateTo')[1].url);
  assert.equal(fillOptions.date, date);
  const fill = load('pages/order/fill-info/fill-info.js', { '../../../store/auth': { AuthStore: { getUser: () => null } } });
  fill.page.onLoad(fillOptions);
  fill.page.setData({ studentNo: '20260001', contactName: '张三', contactPhone: '13800138000' });
  fill.page.onClickNext();
  const confirmOptions = routeOptions(fill.calls.find(([key]) => key === 'navigateTo')[1].url);
  assert.equal(confirmOptions.date, date);
  let submitted;
  const confirm = load('pages/order/confirm/confirm.js', { '../../../services/booking.service': { BookingService: {
    createBooking: async (params) => { submitted = params; return { orderId: 'order-1' }; },
  } } });
  confirm.page.onLoad(confirmOptions);
  await confirm.page.onConfirmSheet();
  assert.equal(submitted.slotId, `slot-${date}`);
  assert.equal(submitted.courtNo, 3);
  assert.equal(submitted.contactName, '张三');
  assert.equal(confirm.calls.some(([key, options]) => key === 'redirectTo' && options.url.includes('orderId=order-1')), true);
  time.page.onUnload();
});

test('时段刷新和旧响应不会覆盖较新的数据，已满时段撤销选择', async () => {
  const date = calendar.bookingDates()[1];
  const pending = [];
  const { page } = load('pages/venue/booking/booking.js', venueStubs({
    getVenueDetail: async () => sampleVenue,
    getAvailability: () => new Promise((resolve) => pending.push(resolve)),
  }));
  page.setData({ id: sampleVenue.id, today: date });
  const first = page.loadVenueAndTodaySlots(sampleVenue.id, `slot-${date}`);
  const second = page.loadVenueAndTodaySlots(sampleVenue.id);
  pending[1](availability(date, { isClosed: true, slots: [] }));
  await second;
  pending[0](availability(date));
  await first;
  assert.equal(page.data.isClosed, true);
  assert.equal(page.data.selectedSlot, null);
  assert.equal(page.data.slots.length, 0);
});

test('筛选测量晚于搜索或离开页面时，不覆盖新列表', () => {
  const measurements = [];
  const { page } = load('pages/venue/list/list.js', {}, {}, {
    setTimeout: () => { throw new Error('已取消的动画不应启动'); },
    clearTimeout() {},
  });
  page.createSelectorQuery = () => {
    const query = { select: () => query, selectAll: () => query, boundingClientRect: () => query, fields: () => query, exec: (callback) => measurements.push(callback) };
    return query;
  };
  page.data.rawVenues = [{ ...sampleVenue, type: 'BADMINTON' }, { ...sampleVenue, id: 'venue-2', name: '篮球馆', type: 'BASKETBALL' }];
  page.data.loading = false;
  page.filterAndSort();
  page.onSelectType(tapData({ key: 'BASKETBALL' }));
  page.onHide();
  const snapshot = JSON.stringify(page.data);
  measurements[0]([{ top: 0, height: 200 }, []]);
  assert.equal(JSON.stringify(page.data), snapshot);
  page.onSelectType(tapData({ key: 'BADMINTON' }));
  page.onKeywordInput({ detail: { value: '不存在' } });
  measurements.at(-1)([{ top: 0, height: 200 }, []]);
  assert.equal(page.data.venueList.length, 0);
  assert.equal(page.data.filterAnimating, false);
});

test('视图回调晚于搜索、排序或离开页面时，不再启动旧动画', () => {
  for (const cancel of ['onSearchConfirm', 'onClearKeyword', 'onSelectSort', 'onResetFilter', 'onHide', 'onUnload']) {
    const timers = [];
    const callbacks = [];
    const { page } = load('pages/venue/list/list.js', {}, {}, {
      setTimeout: (callback) => { timers.push(callback); return timers.length; },
      clearTimeout() {},
    });
    page.data.loading = false;
    page.data.rawVenues = [{ ...sampleVenue, type: 'BADMINTON' }];
    page.filterAndSort();
    page.createSelectorQuery = () => {
      const query = { select: () => query, selectAll: () => query, boundingClientRect: () => query, fields: () => query, exec: (callback) => callback([{ top: 200, height: 100 }, [{ dataset: { id: sampleVenue.id }, top: 200, height: 100, opacity: '1' }]]) };
      return query;
    };
    const setData = page.setData;
    page.setData = (values, callback) => { setData(values); if (callback) callbacks.push(callback); };
    page.onSelectType(tapData({ key: 'BASKETBALL' }));
    page[cancel](tapData({ sort: 'PRICE_ASC' }));
    const snapshot = JSON.stringify(page.data);
    callbacks.forEach((callback) => callback());
    assert.equal(timers.length, 0, cancel);
    assert.equal(JSON.stringify(page.data), snapshot, cancel);
    assert.equal(page.data.filterAnimating, false, cancel);
    assert.equal(page.data.listStyle, '', cancel);
    assert.deepEqual(Object.keys(page.data.cardStyles), [], cancel);
  }
});

test('共享场馆卡片的详情与预约事件使用对应场馆 ID', () => {
  const { component } = load('components/venue-card/venue-card.js');
  const events = [];
  const instance = { data: { venue: sampleVenue }, triggerEvent: (name, detail) => events.push([name, detail.id]) };
  component.methods.open.call(instance);
  component.methods.book.call(instance);
  assert.deepEqual(events, [['open', sampleVenue.id], ['book', sampleVenue.id]]);
});

test('滚动数字首次不翻动，换值只滚动变化数字', () => {
  const { component } = load('components/rolling-number/rolling-number.js');
  const instance = { data: { digits: [] }, setData(values) { Object.assign(this.data, values); } };
  component.observers.value.call(instance, '09:00-10:00');
  assert.equal(instance.data.digits.some((digit) => digit.rolling), false);
  component.observers.value.call(instance, '10:00-11:00');
  assert.equal(instance.data.digits.filter((digit) => digit.rolling).length, 3);
  assert.equal(instance.data.digits.filter((digit) => digit.character === ':').every((digit) => !digit.rolling), true);
});

test('所有注册的自定义组件资源和事件处理器存在', () => {
  const queue = JSON.parse(fs.readFileSync(path.join(root, 'app.json'))).pages;
  const checked = new Set();
  while (queue.length) {
    const route = queue.shift();
    if (checked.has(route)) continue;
    checked.add(route);
    const config = JSON.parse(fs.readFileSync(path.join(root, `${route}.json`)));
    for (const relative of Object.values(config.usingComponents || {})) {
      const target = relative.startsWith('/') ? relative.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(route), relative));
      for (const extension of ['.js', '.json', '.wxml', '.wxss']) assert.ok(fs.existsSync(path.join(root, target + extension)), target + extension);
      queue.push(target);
    }
    if (config.component) {
      const { component } = load(`${route}.js`);
      const wxml = fs.readFileSync(path.join(root, `${route}.wxml`), 'utf8');
      for (const match of wxml.matchAll(/\b(?:bind|catch):?[\w-]+="([^"{}]+)"/g)) assert.equal(typeof component.methods[match[1]], 'function', `${route}: ${match[1]}`);
    }
  }
});

test('场馆提前预约上限小于七天时，日历遵循接口中的限制', async () => {
  const requested = [];
  const { page } = load('pages/venue/date/date.js', venueStubs({
    getVenueDetail: async () => ({ ...sampleVenue, advanceDays: 2 }),
    getAvailability: async (_id, date) => { requested.push(date); return availability(date); },
  }));
  page.setData({ id: sampleVenue.id });
  await page.loadDays();
  assert.equal(requested.length, 3);
  assert.equal(page.data.advanceDays, 2);
  assert.equal(page.data.cells.filter((cell) => !cell.empty).length, 3);
});
