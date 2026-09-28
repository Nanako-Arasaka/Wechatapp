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
