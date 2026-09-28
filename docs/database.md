# 智场通 SmartVenue - 数据库数据字典设计

本项目采用 Prisma ORM 进行强类型数据建模，底层数据持久化于 SQLite (`prisma/dev.db`)，模型严格标准化设计，无缝兼容后续平滑迁移至 MySQL / PostgreSQL。

## 一、核心表结构设计

### 1. 用户表 (`User`)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | String (UUID) | 主键 |
| `username` | String? (Unique) | 演示登录用户名 (user, admin, superadmin) |
| `openid` | String? (Unique) | 微信 OpenID |
| `nickname` | String | 用户昵称 |
| `avatar` | String | 头像 URL |
| `phone` | String? | 手机号 |
| `role` | String | 角色 (USER, ADMIN, SUPER_ADMIN) |
| `status` | String | 状态 (ACTIVE, DISABLED) |
| `createdAt` | DateTime | 注册时间 |

### 2. 场馆表 (`Venue`)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | String (UUID) | 主键 |
| `name` | String | 场馆名称 |
| `type` | String | 运动分类 (BADMINTON, BASKETBALL, TENNIS...) |
| `description` | String | 场馆图文介绍 |
| `address` | String | 场馆地址 |
| `coverImage` | String | 封面图片 |
| `basePrice` | Int | 单价 (以“分”为单位整数存储) |
| `capacity` | Int | 单时段最大并发场地/名额容量 |
| `openTime` | String | 开放时间 (例如 "08:00") |
| `closeTime` | String | 闭馆时间 (例如 "22:00") |
| `status` | String | 状态 (ACTIVE, INACTIVE, DELETED) |
| `facilities` | String? | 设施服务标签逗号拼接 |

### 3. 时段余量表 (`VenueSlot`)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | String (UUID) | 主键 |
| `venueId` | String | 场馆外键 |
| `date` | String | 预约日期 (YYYY-MM-DD) |
| `startTime` | String | 开始时间 (HH:mm) |
| `endTime` | String | 结束时间 (HH:mm) |
| `price` | Int | 该时段单价(分，支持周末与高峰系数) |
| `totalCapacity` | Int | 总容量 |
| `bookedCapacity`| Int | 已预订容量 |
| `status` | String | AVAILABLE(充足/紧张), FULL(已满), CLOSED(关闭) |
| **唯一索引** | - | `@@unique([venueId, date, startTime])` |

### 4. 预约表 (`Booking`)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | String (UUID) | 主键 |
| `bookingNo` | String (Unique) | 预约单号 (例如 BK20260829153000123) |
| `userId` | String | 用户外键 |
| `venueId` | String | 场馆外键 |
| `slotId` | String | 时段外键 |
| `quantity` | Int | 预约名额数量 |
| `totalAmount` | Int | 总金额(分) |
| `status` | String | PENDING_PAYMENT, CONFIRMED, CHECKED_IN, COMPLETED, CANCELLED, REFUNDED, EXPIRED |
| `bookingCode` | String (Unique) | 扫码核销二维码唯一编码 (例如 SV202609010001) |

### 5. 订单表 (`Order`)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | String (UUID) | 主键 |
| `orderNo` | String (Unique) | 订单号 (例如 SV20260829153000123) |
| `userId` | String | 用户外键 |
| `bookingId` | String (Unique) | 预约关联外键 |
| `amount` | Int | 应付金额(分) |
| `paidAmount` | Int | 实付金额(分) |
| `refundAmount` | Int | 退款金额(分) |
| `paymentStatus`| String | UNPAID, PAID, REFUNDED |
| `orderStatus` | String | PENDING_PAYMENT, PAID, COMPLETED, CANCELLED, REFUNDED, EXPIRED |
