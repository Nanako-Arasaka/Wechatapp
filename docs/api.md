# 智场通 SmartVenue - RESTful API 接口规范说明

## 一、通用报文规范

### 1. 成功响应
```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

### 2. 业务异常响应
```json
{
  "code": 40021,
  "message": "该时段余量不足（当前仅剩 1 个名额），请重新选择时段",
  "data": null,
  "timestamp": "2026-08-29T14:30:00.000Z",
  "path": "/api/bookings"
}
```

---

## 二、核心接口清单

### 1. 认证模块 (Auth)
- `POST /api/auth/demo-login` - 快捷角色与测试账号登录 (支持 USER, ADMIN, SUPER_ADMIN)
- `POST /api/auth/wechat-login` - 模拟微信快捷授权登录
- `GET /api/auth/profile` - 查询当前登录用户信息

### 2. 场馆与余量模块 (Venues)
- `GET /api/venues` - 场馆列表与综合推荐检索 (支持 keyword, type, date)
- `GET /api/venues/:id` - 场馆图文详情、设施服务与评价
- `GET /api/venues/:id/availability?date=YYYY-MM-DD` - 实时时段余量 Slots 矩阵与错峰建议

### 3. 预约模块 (Bookings)
- `POST /api/bookings` - 创建预约 (Prisma 事务防超卖并发扣库存)
- `GET /api/bookings/:id` - 查询预约详情与核销码
- `POST /api/bookings/:id/cancel` - 取消预约并释放库存 (已支付触发退款)

### 4. 订单与支付模块 (Orders & Payments)
- `GET /api/orders` - 用户订单列表 (支持 status 多维筛选)
- `GET /api/orders/:id` - 订单详情与流水
- `POST /api/orders/:id/pay` - 模拟微信支付 (扭转为已支付，生成交易流水)
- `POST /api/orders/:id/cancel` - 取消待支付订单 / 申请退款

### 5. 扫码核销模块 (Checkin - 需 Admin 权限)
- `POST /api/admin/checkin/verify` - 扫描/解析核销码并展示预约人信息与防重校验
- `POST /api/admin/checkin/confirm` - 管理员确认核销入场

### 6. 数据看板与监控 (Dashboard - 需 Admin 权限)
- `GET /api/admin/dashboard` - 核心 KPI、近7天折线图、环形占比图、热门时段、智能诊断
- `GET /api/admin/dashboard/realtime` - 8大场馆当前与下一时段实时并发负荷大屏
- `GET /api/admin/dashboard/heatmap` - 7×24小时预约热力矩阵分析

### 7. 场馆管理与维护 (Admin - 需 Admin 权限)
- `GET /api/admin/venues` - 管理端场馆分页列表与今日营收
- `POST /api/admin/venues` - 新增场馆
- `PUT /api/admin/venues/:id` - 修改场馆信息与上下架状态
- `DELETE /api/admin/venues/:id` - 软删除场馆
- `POST /api/admin/venues/:id/close-date` - 设置临时维护闭馆日

### 8. 系统调度与控制台 (Dev)
- `POST /api/dev/generate-peak` - 一键注入高峰客流压力测试
- `POST /api/dev/expire-orders` - 扫描并释放超时待支付订单库存
