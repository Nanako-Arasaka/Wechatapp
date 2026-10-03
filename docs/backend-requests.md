# 后端需求与问题清单（前端不改后端）

> 更新时间：2026-09-28  
> 原则：**前端同学不直接改后端代码**。有缺口写在本文档，由后端同学实现或确认。  
> 先前「刷新时段余量」等需求一并汇总在此。

---

## 0. 现状速览（前端已对接）

| 能力 | 现状 | 前端用法 |
|---|---|---|
| 场馆列表 | `GET /api/venues` → `{code,message,data:{list,total,page,pageSize}}` | 首页/列表 |
| 场馆详情 | `GET /api/venues/:id` → `data` 含 `advanceDays` | 详情页 |
| 单日余量 | `GET /api/venues/:id/availability?date=YYYY-MM-DD` | 选日汇总 + 选时段 |
| 提前预约天数 | `Venue.advanceDays` 默认 **7**（schema / 预约校验 `maxBookDate`） | 选日页「今天 + 后 7 天」 |

**响应包装：** 均为 `{ code: 0, message: 'success', data: ... }`，非 0 视为失败。

---

## 1. 【建议】多日余量汇总接口（P1 · 提升体验）

### 为什么需要
选日页要展示「今天 + 后 7 天」每天的剩余数量。现在只有单日 `availability`，前端需要 **串行/并发 8 次请求**，弱网慢、也容易被限流。

### 建议接口

```http
GET /api/venues/:id/availability/days?from=YYYY-MM-DD&days=7
Authorization: 可选（公开）
```

**响应建议：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "venueId": "4",
    "advanceDays": 7,
    "days": [
      {
        "date": "2026-09-28",
        "weekday": "周日",
        "isToday": true,
        "isClosed": false,
        "closedReason": null,
        "totalRemaining": 12,
        "availableSlotCount": 5,
        "isPast": false
      }
    ],
    "serverTime": "2026-09-28T18:30:00+08:00"
  }
}
```

### 验收
- [ ] `days` 长度 = 请求天数（不超过 `advanceDays`）
- [ ] 每天 `totalRemaining` = 当日可约时段 `remaining` 之和（不含已过/CLOSED/FULL）
- [ ] 闭馆日 `isClosed=true` 且 `totalRemaining=0`
- [ ] 不要生成 slot 时把并发写库打爆（可复用 `generateSlotsForDate` 串行或事务）

### 前端降级方案（已做）
在接口就绪前，前端对每天调用 `GET /venues/:id/availability?date=` 并汇总 `remaining`。接口就绪后切一次请求即可。

---

## 2. 刷新时段 / 选日余量（P1）

**触发：** 预约页、选日页的「⟳ 刷新」。

**期望：**
1. 按钮旋转反馈 ~700ms，防连点（建议前端 debounce 500ms，后端也可做 1s 限流）。
2. 重新拉取当日/多日余量。
3. 成功更新 `remaining` / `status`；失败返回明确错误码，前端 toast「刷新失败」。
4. **不要**导致前端整页骨架重播（纯数据更新）。

**复用：** 现有 `GET /venues/:id/availability?date=` 即可，无需新接口。

**注意：** 刷新后若原选中时段已满，前端会提示并清空选中——需要 `isSelectable` / `status` 准确。

---

## 3. 列表字段缺口

### 3.1 `GET /venues` 列表里 `advanceDays` 为 `null`
- **现象：** 列表项 `advanceDays: null`，详情才有 `7`。
- **影响：** 选日页若只靠列表会误判可约天数。
- **建议：** 列表也返回 `advanceDays`，或前端统一以详情为准（当前如此）。

### 3.2 列表无「当日总剩余」稳定字段
- **现象：** 列表有热度/容量等，但选日/首页要的「今日总剩余」需再打 availability。
- **建议（可选）：** 列表增加 `todayRemaining`，或提供批量接口。

---

## 4. 预约与库存（已有，需联调确认）

| 项 | 现状 | 前端需要 |
|---|---|---|
| 最多提前天数 | `dayjs().add(venue.advanceDays \|\| 7,'day')` 校验 | 选日页只展示 `0..advanceDays` |
| 历史时间 | 预约校验历史时间 | 已过时段灰显不可点 |
| 防超卖 | 原子扣库存 / CourtOccupancy | 选场地页 |

**请后端确认：**
- [ ] 选定日期不在 `advanceDays` 内时，错误文案是否稳定（前端要展示）
- [ ] `availability` 对 `date` 超范围是报错还是空 slots？建议：**400 + 明确 message**，避免前端静默

---

## 5. 其他已登记（原 api-pending）

| 入口 | 现状 | 期望 |
|---|---|---|
| 消息通知中心 | 前端 toast 演示 | `GET /api/notifications`（已有，待接） |
| 模拟支付 | 前端本地造单 | `POST /api/bookings` + `POST /api/payments` |
| 微信一键登录 | 演示直接进首页 | `POST /api/auth/wechat-login` |

---

## 6. 非功能

- [ ] 生产配置 `JWT_SECRET`（已警告使用 dev fallback）
- [ ] availability 高频刷新建议加 HTTP 缓存头或 1s 内合并
- [ ] `advanceDays` 改小时，已有远期订单如何处理（策略需产品/后端定）

---

## 附：前端已实现的预约日期流

```
详情 → [开始预约] → 选择日期（今天 + 后 7 天，每日剩余）
      → 选择时间（当日 slots） → 选场地 → 填信息 → 支付
```

- 入口页：`index.html`（Web 预览）、小程序 `pages/venue/date/`
- 剩余数量变化：Apple 风数字滚轮 + 加深

---

# 追加需求（2026-10-03 · 校内场馆版）

> 本期定位收窄为**只面向校内场馆**。以下为前端已按契约实现、但后端尚未提供的接口。
> 前端已做优雅降级：接口未就绪时不会崩，只会提示操作失败。

## A5. 时段使用权开关（管理端）⭐ 阻塞「管理员关闭未来一周某时段」

**语义澄清**：不再是「管理员专属时段（管理员可预约）」，而是**管理员自主开关某时段的使用权**。

| action | 含义 | 普通用户端表现 |
|---|---|---|
| `open` | 开放预约 | 正常可见可选 |
| `block` | 封锁，仅管理员内部使用（校队训练等） | **完全不可见**，且不计入每日余量汇总 |
| `close` | 关闭 | 不可见，不占容量 |

### A5.1 单时段开关

```http
PATCH /api/admin/slots/:slotId
Authorization: Bearer <token>
Content-Type: application/json

{ "action": "block", "reason": "校队训练占用" }
```

**响应**：`{ code: 0, message: 'success', data: { slotId, action, reason } }`

**约束**：
- `action` 为 `block` / `close` 时 `reason` 必填（前端已做非空校验拦截）
- 仅 `ADMIN` / `SUPER_ADMIN` 可调用
- 需保证幂等：重复提交同一 action 不产生副作用

### A5.2 批量开关（同一时段应用到未来 N 天）

```http
POST /api/admin/slots/batch
Authorization: Bearer <token>

{
  "venueId": "4",
  "dates": ["2026-10-03", "2026-10-04", "2026-10-05"],
  "startTime": "18:00",
  "action": "block",
  "reason": "赛事占用"
}
```

**响应**：

```json
{
  "code": 0,
  "message": "success",
  "data": { "successCount": 3, "failedDates": [] }
}
```

**约束**：单日失败不影响其余日期，前端按 `successCount` 汇总提示。

### A5.3 availability 响应字段迁移（重要）

用户端过滤逻辑已按 `isBlocked` 实现，**需要后端同步改字段名**：

```diff
- { "isAdminOnly": true }
+ { "isBlocked": true, "blockReason": "校队训练占用" }
```

- **过渡期兼容**：`isBlocked` 缺失时前端视为未封锁，不影响现网行为
- 迁移完成后建议下线 `isAdminOnly`，避免两套语义并存
- `blockReason` 只应出现在管理端响应中；用户端建议**不返回**，避免泄露校内内部安排

**前端已改造的位置**（可直接验收）：

| 文件 | 改动 |
|---|---|
| `utils/booking-calendar.ts` | 新增 `userVisibleSlots()` 统一过滤入口，接入 `summarizeDay` |
| `pages/venue/booking/booking.ts` | 选时段页过滤封锁时段 |
| `pages/venue/court/court.ts` | 选场地页拒绝已封锁时段 |
| `pages/index/index.ts` | 首页快速预约不展示封锁时段 |
| `pages/admin/venue-schedule/` | 管理端显示封锁态 + 原因，支持开关 |

---

## A6. 我的场馆（管理端落地页）⭐ 阻塞「管理员只管 1-2 个场馆」

管理端首页（`pages/admin/home/home`）已按「我的场馆」设计，但当前**复用 `GET /admin/venues` 返回全部场馆**。

### 建议接口

```http
GET /api/admin/venues/mine
Authorization: Bearer <token>
```

**响应**：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [ { "id": "4", "name": "羽毛球馆", "type": "BADMINTON", "...": "..." } ],
    "total": 1
  }
}
```

**约束**：
- 只返回当前登录管理员被授权的场馆
- 若管理员尚未绑定任何场馆，返回空数组（前端已处理空态：「暂未分配场馆」）
- 鉴权在后端完成，**不依赖前端 `role` 判断**（前端 `admin-guard` 只做体验层拦截）

**前端改造点**：仅 `pages/admin/home/home.ts` 的 `loadVenues()` 换数据源，页面结构无需改动。

---

## A7. 预约人身份与同行人落库 ⭐ 阻塞「校外人员进校」

前端已完成采集、校验与展示，**但字段尚未落库**。

### A7.1 Booking 模型新增字段

```prisma
model Booking {
  // 预约人
  identityType          String  @default("STUDENT")  // STUDENT | VISITOR
  // 同行人（可选，最多 1 位）
  companionName         String?
  companionPhone        String?
  companionIdentityType String?                       // STUDENT | VISITOR
  companionIdentityNo   String?
}
```

> `identityType = VISITOR` 时，前端把证件号放在现有 `studentNo` 字段里传（避免字段立即扩容）。
> 若后端希望更语义化，可新增 `identityNo` 字段，前端改一行即可。

### A7.2 校验规则（后端需同步校验，前端已做但不能只信前端）

| 身份 | 证件规则 |
|---|---|
| `STUDENT`（在校生） | 学号 6-12 位数字 |
| `VISITOR`（校外人员） | 身份证 15 位数字，或 18 位（末位可为 X） |

- 手机号统一 `^1[3-9]\d{9}$`
- 姓名 1-20 字符
- `companionName` 非空时，`companionPhone` / `companionIdentityNo` 必填

### A7.3 核销响应需返回同行人信息

```http
POST /api/admin/checkin/verify
```

**响应补充字段**（前端已在核销页展示）：

```json
{
  "bookingId": "...",
  "userName": "张同学",
  "identityType": "STUDENT",
  "companionName": "李同学",
  "companionPhone": "13800138000",
  "companionIdentityType": "VISITOR",
  "companionIdentityNo": "110101200001011234"
}
```

核销成功弹窗会提示前台「同行人需一同入场，请核验证件」。

---

## A8. 每日开售时间（可选，本期未启用）

前端已预留展示位置（选日页显示「今日 08:00 开放预约」占位），但**当前未接具体接口**。

若本期要支持「每日几点开售」，建议在 `Venue` 增加：

```prisma
dailyOpenTime String?  // "HH:mm"，为空表示不限制
```

前端只需在 `pages/venue/date/date.ts` 判断 `now < dailyOpenTime` 时置灰今日。

**当前状态**：前端不做硬拦截，等后端确认是否本期需要。

---

## 附：前端本期已完成（无需后端配合即可验收）

| 项 | 状态 |
|---|---|
| 管理端独立落地页 + 单场馆管理 | ✅ 已实现（等 A6 后改为「我的场馆」） |
| 封锁时段对用户端完全不可见 | ✅ 已实现（等 A5.3 后端改字段名即全链路生效） |
| 日历窗口跟随 `advanceDays` | ✅ 已实现（复用现有 `advanceDays`） |
| 双人预约 + 身份区分（前端侧） | ✅ 已实现（等 A7 落库） |
| 管理端时段开关交互 | ✅ 已实现（等 A5 接口） |
| 校内话术收窄 | ✅ 已完成 |
| 超管端利润/片区分析 | ⏸ 按产品要求延后下版本 |
