# 微信小程序前端

浏览器预览的布局与动效已迁入原生 WXML/WXSS/TypeScript。主要对应关系：

| 页面 | 小程序目录 |
| --- | --- |
| 首页、热门场馆、今日余量 | `pages/index/` |
| 场地搜索与筛选 | `pages/venue/list/` |
| 场馆封面、介绍、设施和价格 | `pages/venue/detail/` |
| 预约日历（今天及未来七天） | `pages/venue/date/` |
| 时段、场地选择 | `pages/venue/booking/`、`pages/venue/court/` |
| 联系方式、确认和支付 | `pages/order/fill-info/`、`confirm/`、`pay/` |
| 订单、入场凭证 | `pages/order/list/`、`success/` |
| 登录、个人中心 | `pages/auth/login/`、`pages/user/profile/` |

公共场馆卡片在 `components/venue-card/`，数字滚动在
`components/rolling-number/`，页面动效在 `styles/preview-motion.wxss`。
基础颜色继续由 `app.wxss` 管理；原生导航栏与 TabBar 由 `app.json` 管理。

场馆分类切换由 `utils/venue-filter-motion.ts` 控制：不匹配项先淡出，
保留项平滑补位；切回全部时，保留项滑回完整排序中的位置，其余项淡入。
页面通过原生视图查询提供卡片的位置、高度和透明度，连续切换从当前画面接续。

在仓库根目录运行：

```sh
npm ci
npm run build:miniprogram
npm test
```

然后在微信开发者工具导入本目录。修改 TS 后重新运行编译，生成同目录 JS。
浏览器的 `npm run dev` 只启动网页预览，不会编译或运行微信小程序。

日历从现有 `/venues/:id/availability?date=...` 查询每日余量，选中的
日期和服务端 `slotId` 一路传入选场、联系方式与下单页。请求失败显示重试，
闭馆或约满不可选择；首页点击具体时段仍可直接进入当天的时段页。
登录、订单、付款与核销继续使用原服务层，浏览器模拟状态不会写入小程序。

本地运行需按 `config.ts` 配置已有后端地址。真机调试需配置手机可访问的地址；
设备上的 `127.0.0.1` 指向设备本身。
