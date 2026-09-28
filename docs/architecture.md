# 智场通 SmartVenue - 系统技术架构设计说明书

## 一、系统架构总览

“智场通 (SmartVenue)” 是专为高校、体育公园与综合体育馆打造的智慧场馆预约、实时余量透明探测及数字化运营管理系统。

```
┌─────────────────────────────────────────────────────────────┐
│                 微信小程序端 (Miniprogram)                   │
│  · 微信原生 (TypeScript + WXML + WXSS)                      │
│  · 状态机联动 / 实时余量Slots色彩矩阵 / 原生Canvas图表与二维码│
│  · 演示身份秒切 / 角色权限感知 TabBar 与工作台               │
└──────────────────────────────▲──────────────────────────────┘
                               │ HTTP / RESTful API (JSON)
                               │ Bearer JWT 鉴权
┌──────────────────────────────▼──────────────────────────────┐
│                    NestJS 后端服务框架                      │
│  ├── 认证鉴权: AuthGuard, RolesGuard, JwtStrategy           │
│  ├── 业务引擎: VenuesService, BookingsService(事务防超卖)   │
│  ├── 状态机流转: OrdersService, CheckinService(防重核销)    │
│  ├── 数据分析: DashboardService, 智能错峰与AI规则引擎       │
│  └── 统一管道: AllExceptionsFilter, Transform, Logging      │
└──────────────────────────────▲──────────────────────────────┘
                               │ Prisma ORM
┌──────────────────────────────▼──────────────────────────────┐
│                     SQLite 持久化数据库                      │
│  ├── 核心实体: User, Venue, VenueSlot, Booking, Order       │
│  ├── 支付核销: Payment, Refund, CheckinRecord               │
│  └── 系统支撑: VenueSchedule, ClosedDate, OperationLog      │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、核心设计亮点

### 1. 事务级高并发防超卖库存控制
- **问题**：在高并发选座场景下，若多个用户同时看到剩余 1 个名额，普通查询可能导致超卖。
- **解决**：在单个 Prisma 交互式事务 `$transaction` 中锁定 Slot，原子校验 `slot.bookedCapacity + quantity <= slot.totalCapacity` 并即时扣减。库存不足时自动回滚并抛出 `SLOT_CAPACITY_NOT_ENOUGH` 业务异常。

### 2. 状态机严格约束与自动库存释放
- 状态流转严格受限：`PENDING_PAYMENT` -> `CONFIRMED` -> `CHECKED_IN` -> `COMPLETED`。
- 取消预约 / 申请退款时，原子释放库存 `bookedCapacity -= quantity`，若时段此前为 `FULL` 则重置为 `AVAILABLE`，并生成退款流水 `Refund`。
- 重复核销拦截：已核销的预约再次扫码，系统将明确提示已于何时由哪位管理员完成核销，防止二次入场。

### 3. 原生 Canvas 渲染图表与二维码
- 小程序端避免引入体积庞大的第三方库，采用纯原生 Canvas 绘制高清平滑折线图、环形饼图与二维码，极速渲染无白屏。
