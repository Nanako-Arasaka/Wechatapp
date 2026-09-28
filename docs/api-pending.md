# 前端待接后端 · 接口清单

> 预览页 / 小程序里已有 UI 但尚未接真实数据的入口。实现前请与前端对齐契约（`miniprogram/types/index.ts`）。

## 1. 刷新时段余量（预约页 + 首页余量区）

**触发**：用户点击「⟳ 刷新」按钮（`选择时间` 页时段卡片右上角、首页「今日时段实时余量」区）。

**期望行为**：
1. 按钮短暂旋转（约 700ms）作为反馈。
2. 重新拉取所选场馆、所选日期的时段库存。
3. 成功：更新每个时段的 `remain` / `status`（可约 / 已满 / 已过）；失败：toast「刷新失败，请稍后重试」。
4. **不要**整页重播入场动画，只更新数据与选中态（微动效）。

**建议接口**（若已有则复用，不必新建）：

```http
GET /venues/:venueId/slots?date=YYYY-MM-DD
Authorization: Bearer <token>
```

**响应（建议）**：

```json
{
  "venueId": "…",
  "date": "2026-09-28",
  "slots": [
    {
      "id": "…",
      "startTime": "14:00",
      "endTime": "15:00",
      "totalCapacity": 8,
      "bookedCapacity": 2,
      "remaining": 6,
      "status": "AVAILABLE",
      "price": 3500
    }
  ],
  "serverTime": "2026-09-28T10:00:00+08:00"
}
```

**前端接入点**：
- 预览：`preview.html` → `refreshSlots()`（当前仅 toast 模拟）
- 小程序：`pages/venue/booking/booking.ts`、首页 `loadAvailabilityForVenue`
- 现有封装：`miniprogram/services/venue.service.ts`

**验收**：
- [ ] 弱网下点击刷新有按钮反馈
- [ ] 连续快速点击不重复并发（可 debounce 500ms）
- [ ] 刷新后选中的时段若已满，需提示并清空选中
- [ ] 不触发整页骨架屏（骨架仅首次进入页面时出现）

---

## 2. 其他预览占位（可选，按优先级）

| 入口 | 当前行为 | 建议接口 |
|---|---|---|
| 消息通知中心 | toast 演示 | `GET /notifications` |
| 模拟支付 / 提交预约 | 本地生成订单 | `POST /bookings` + `POST /payments/mock` |
| 微信一键登录 | 直接进首页 | `POST /auth/wechat` |
