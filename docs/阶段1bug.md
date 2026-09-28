# 🐛 第一阶段 Bug 排查报告（v2）

## 概述

**排查日期**：2026-09-21（云函数删除后重新扫版）  
**第一阶段需求**：
1. 管理端可更改场地开放时间段
2. 使用端预约时可搜索，并优先显示空余场馆
3. 管理员预约等功能与普通用户相同，对开放预约有优先权
4. 普通用户不开放的时间段，管理员也能预约

**整体结论**：
- 微信云函数已删除，Bug A2（两套数据不互通）已消除。
- 其余核心 bug 仍然存在。
- 云函数删除后，mock 兜底变成唯一自愈链路，静默假数据的问题更突出了。
- 后端 10 组既有测试全绿，但这些测试没覆盖「改时间重建 / 搜索排序分页 / 管理员特权预约」等第一阶段核心路径。

---

## 后端 Bug

### P0 · 致命

**A1 改了开放时间对已生成时段不生效**
- 位置：`server/src/admin/admin.service.ts:114-138`
- 现象：`updateVenue` 只更新场馆表，不重建/清理已生成的 `VenueSlot`；新时间只对从未被访问过的日期生效
- 影响：管理端改营业时间形同虚设

**N11 管理员预约特权完全未实现**
- 位置：`server/src/bookings/bookings.controller.ts:10-13`、`bookings.service.ts:40`
- 现象：创建预约不区分角色，无管理员专属时段入口，无优先权/预留机制
- 影响：需求 ③④ 不成立

**N2 闭馆不处理已有预约，且取消后恢复 CLOSED 时段**
- 位置：`server/src/admin/admin.service.ts:170-188`、`server/src/bookings/bookings.service.ts:231-246`
- 现象：`setClosedDate` 只把 slot 标 `CLOSED`，已付款 Booking 不取消/退款/通知；用户取消后 slot 又被恢复为 `AVAILABLE`
- 影响：闭馆日到馆纠纷、重复预约失败

### P1 · 高

**A3 营业时间无健壮校验**
- 位置：`server/src/admin/dto/admin-venue.dto.ts:82-88`、`server/src/venues/venues.service.ts:247-298`
- 现象：`openTime/closeTime` 只校验"是字符串"；非法时间或 `close <= open` 时静默生成 0 个 slot
- 影响：场馆永久不可约且无告警

**N3 改价/改容量对已生成时段无效**
- 位置：`server/src/admin/admin.service.ts:120-125`
- 现象：只改 `Venue` 表，`VenueSlot.price / totalCapacity` 是生成时快照
- 影响：财务与库存数据错配

**N4 `advanceDays` 形同虚设**
- 位置：`server/src/venues/venues.service.ts:141-143`、`server/src/bookings/bookings.service.ts:40`
- 现象：任意日期都生成 slot，预约时不校验 `advanceDays` 和历史时间
- 影响：库存透支、远期数据污染

**N5 删除/下架场馆不处理未来预约**
- 位置：`server/src/admin/admin.service.ts:143-165`
- 现象：仅改 `status = DELETED`，不取消未来 Booking
- 影响：用户到场无法核销、退款纠纷

**N8 后端列表无排序、无分页**
- 位置：`server/src/venues/venues.service.ts:17-89`、`venues.controller.ts:11-14`
- 现象：`findAll` 永远按 `createdAt desc` 全量返回；虽计算 `recommendScore` 但未按空余优先排序
- 影响：需求 ② 后端支撑缺失，数据量大后首屏爆炸

### P2 · 中

**A5 `status` 无枚举白名单校验**
- 位置：`server/src/admin/dto/admin-venue.dto.ts:90-92`
- 现象：可写入任意状态字符串（如 `DELETED`），绕过软删除审计
- 影响：数据完整性破坏

**N7 并发懒生成时段可能抛 500**
- 位置：`server/src/venues/venues.service.ts:170-172`、`290-292`
- 现象：两个请求同时发现日期无 slot，`createMany` 撞唯一约束
- 影响：高并发时偶发报错

**N9 搜索大小写敏感、类型只能用英文枚举**
- 位置：`server/src/venues/venues.service.ts:37-43`
- 现象：Prisma SQLite `contains` 大小写敏感；`type` 过滤需传 `BADMINTON`
- 影响：中文搜索体验差

**N10 推荐分算法与"空余优先"语义部分冲突**
- 位置：`server/src/venues/venues.service.ts:57-67`
- 现象：`recommendScore` 中 popularity 越高分越高；未按目标日期过滤 `totalRemaining`
- 影响：排序结果不符合空余优先

**N12 取消预约未预留管理员代退扩展点**
- 位置：`server/src/bookings/bookings.service.ts:204-220`
- 现象：当前仅区分本人/管理员，未与"代约/代退"业务结合
- 影响：会阻塞管理员预约特权闭环

### P3 · 低（代码债）

- `VenueSchedule` 死模型：`server/prisma/schema.prisma:54-63`
- 晚高峰定价硬编码 18:00-21:00：`server/src/venues/venues.service.ts:266`

---

## 前端 Bug

### P0 · 致命

**B1 搜索后再点排序，筛选结果被覆盖**
- 位置：`miniprogram/pages/venue/list/list.ts:121-125`
- 现象：`onSelectSort` 直接对 `rawVenues` 排序，忽略当前 keyword/type
- 影响：核心路径错乱

**B2 首页分类入口失效**
- 位置：`miniprogram/pages/index/index.ts:213-220`、`index.wxml:35`
- 现象：对 tabBar 页用 `wx.switchTab` 传参，query 全部丢失
- 影响：羽毛球/篮球/游泳分类入口不可用

**F1 mock 静默兜底掩盖后端故障**
- 位置：`miniprogram/services/venue.service.ts:14-28`、`order.service.ts:10-21`、`pages/venue/list/list.ts:82-85`
- 现象：接口失败或返回空结果时返回写死 mock，全程无"离线演示"提示
- 影响：后端宕机用户仍用假库存下单

**F2 admin 页面无权限守卫**
- 位置：`miniprogram/pages/admin/*`
- 现象：任意知道 URL 或改跳转的用户都可进入管理页
- 影响：越权风险

**F3 微信登录前 2 个用户自动成为 ADMIN**
- 位置：`miniprogram/services/auth.service.ts:53-55`
- 现象：本地 `WECHAT_USER_INDEX` 计数，前两位自动提权
- 影响：任意用户可获管理权限

### P1 · 高

**B3 "空余优先"未真正落地**
- 位置：`miniprogram/pages/venue/list/list.ts:91-99`、`server/src/venues/venues.service.ts:64-67`
- 现象：默认 `RECOMMEND` 不排序；后端 `recommendScore` 未接入
- 影响：需求 ② 落空

**B5 列表/首页数据不刷新**
- 位置：`miniprogram/pages/venue/list/list.ts:41-49`、`pages/index/index.ts:149-164`
- 现象：tabBar 页 `onShow` 不重拉数据；首页 `quickSlots` 缓存不随预约失效
- 影响：已约满时段仍显示"有空余"

**A3 管理端开放时间仍为文本框**
- 位置：`miniprogram/pages/admin/venues/venues.wxml:83-87`
- 现象：`openTime/closeTime` 用普通 `input`，无时间选择器
- 影响：易输错格式

**F4 管理端提交几乎无校验**
- 位置：`miniprogram/pages/admin/venues/venues.ts:94-111`
- 现象：只校验 `name`，不校验时间格式/大小/价格/容量
- 影响：脏数据可直接保存

**F5 `description` 被模板覆盖**
- 位置：`miniprogram/pages/admin/venues/venues.ts:104`
- 现象：保存时用模板字符串覆盖原 `description`
- 影响：场馆介绍丢失

**F6 admin 场馆列表写死 50 条上限**
- 位置：`miniprogram/pages/admin/venues/venues.ts:38`
- 现象：`getVenues(1, 50, ...)`
- 影响：第 51 个场馆不可见

**B7 价格裸除 100，不反映真实时段价**
- 位置：`miniprogram/pages/venue/list/list.wxml:104` 等多处
- 现象：`{{basePrice / 100}}` 可出现长小数；不展示高峰/周末浮动价
- 影响：价格误导/投诉

**F7 401 重试变成"假登录"**
- 位置：`miniprogram/services/request.ts:86-95`
- 现象：遇 401 后 `AuthService.demoLogin` 用当前角色生成 mock token
- 影响：真实后端下可能循环或虚假登录

### P2 · 中

**B6 搜索体验差**
- 位置：`miniprogram/pages/venue/list/list.ts:62-72`、`101-104`
- 现象：中文运动类型搜不到、无防抖、无拼音、三处搜索规则不一致
- 影响：搜索体验差

**F8 无分页**
- 位置：`miniprogram/pages/venue/list/list.ts`、`server/src/venues/venues.service.ts:45-53`
- 现象：一次性拉取全部场馆/订单
- 影响：数据量大后首屏慢、内存高

**F9 无 loading 状态**
- 位置：`miniprogram/pages/venue/list/list.ts:7`、`list.wxml:46-50`
- 现象：`loading` 默认 false，骨架屏死代码
- 影响：首次加载无反馈

**F10 临时闭馆只能设置"今天"**
- 位置：`miniprogram/pages/admin/venues/venues.ts:145-167`
- 现象：无日期选择器
- 影响：无法提前安排维护闭馆

**F11 admin 接口失败无任何提示**
- 位置：`miniprogram/services/admin.service.ts`
- 现象：无 mock 兜底也无错误提示
- 影响：网络波动时管理端空白

**F12 管理员预约入口缺失**
- 位置：`miniprogram/pages/admin/dashboard/`、`pages/user/profile/`
- 现象：无"管理员预约/代预约"入口
- 影响：需求 ③ 前端入口不成立

**F13 手机号校验不严格**
- 位置：`miniprogram/pages/venue/booking/booking.ts:206-209`
- 现象：只检查长度 `< 11`
- 影响：可提交非法手机号

**F14 支付倒计时基于前端本地时间**
- 位置：`miniprogram/pages/order/pay/pay.ts:42-67`
- 现象：15 分钟倒计时不基于订单 `expiredAt`
- 影响：显示过期时间不一致

**F15 详情页硬编码数据**
- 位置：`miniprogram/pages/venue/detail/detail.wxml:21-28`
- 现象：评分、服务人次、好评率写死
- 影响：信息不可信

### P3 · 低

- 场馆类型展示英文：多处 wxml
- 有 `formatMoney` 却未复用：`miniprogram/utils/format.ts` vs 页面裸除 100
- 根级 admin 占位文件：`miniprogram/pages/admin/*.js/wxml` 等

---

## 修复优先级建议

### 第一梯队 P0（阻塞需求 / 安全 / 资损）

| # | Bug | 修复动作 |
|---|---|---|
| 1 | A1 + N11 | 后端：改时间触发时段重建/清理；新增管理员专属时段与预约特权接口 |
| 2 | A4/N2 | 后端：闭馆前置校验 + 取消已有 Booking/退款/通知；取消预约不恢复 CLOSED 时段 |
| 3 | B1 + B2 | 前端：排序前重新过滤；tabBar 传参改用 `reLaunch` 或全局状态 |
| 4 | F1 + F7 + F3 | 前端/后端：mock 兜底加"离线演示"提示；修复 401 重试；删除自动 ADMIN 提权 |
| 5 | F2 | 前端：所有 admin 页面 `onShow` 检查 `isAdmin()`，越权 redirect |

### 第二梯队 P1（数据正确与体验）

| # | Bug | 修复动作 |
|---|---|---|
| 6 | A3 + 前端 picker | 后端 DTO 加 HH:mm + 交叉校验；前端改用 `picker mode="time"` |
| 7 | N8 + B3 + B5 | 后端 `findAll` 支持 sort/page；默认按空余优先排序；前端 tabBar `onShow` 刷新 |
| 8 | N3 + N4 + N5 | 改价/容量联动更新 slot；预约校验 `advanceDays` 与历史时间；下架场馆取消未来 Booking |
| 9 | B7 | 统一使用 `formatMoney()`；展示真实时段价 |
| 10 | B6 | 类型中英文映射、防抖、搜索走后端 |
| 11 | F4 + F5 + F6 | 管理端提交校验、description 可编辑、admin 列表加分页 |

### 第三梯队 P2/P3（完善打磨）

| # | Bug | 修复动作 |
|---|---|---|
| 12 | F12 | dashboard/profile 增加管理员预约入口 |
| 13 | F13 + F14 + F15 | 手机号正则、支付倒计时基于 `expiredAt`、详情页真实数据 |
| 14 | N7 + N9 + N10 + N12 | 并发 slot 生成加事务重试；搜索大小写不敏感；推荐算法调优；取消预约支持代退 |
| 15 | A6 | 清理 `VenueSchedule` 死模型，高峰定价可配置 |
| 16 | F8 + F9 + F10 + F11 | 分页、loading、临时闭馆日期选择、admin 接口错误提示 |
| 17 | P3 项 | 类型中文映射、复用 formatMoney、清理占位文件 |

---

## 架构状态更新

| 项目 | 状态 |
|---|---|
| 微信云函数 | 已删除（`miniprogram/cloudfunctions/`、`install-cloud-functions.bat`、配置、`wx.cloud` 调用全部移除） |
| 后端唯一真相源 | NestJS + SQLite 成为唯一后端 |
| mock 兜底链路 | 仍存在，且从"三级"变成"二级"，静默假数据风险更突出，建议加显式"离线演示模式"提示 |
| 数据库商用建议 | 上线前仍建议 SQLite → MySQL/PostgreSQL（Prisma 换 datasource 即可） |

---

*本次排查基于代码静态审查，未运行真机调试。修复后需回归 `cd server && npm test`（现有 10 组），并新增覆盖：改时间重建、闭馆取消预约、搜索排序分页、管理员特权预约的测试用例。*
