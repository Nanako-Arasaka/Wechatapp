# 浏览器前端

原 `index.html` 的样式、页面和交互已拆到本目录；`index.html` 与
`preview.html` 共用一个入口。使用原生 TypeScript 和 Vite，不引入额外 UI 框架。

## 启动与构建

在仓库根目录执行：

```sh
npm ci
npm run dev
npm run typecheck
npm run build:web
npm run preview
```

开发地址以终端输出为准，默认 `http://127.0.0.1:5173`。
生产文件输出到 `dist/`，包含首页、兼容预览入口和动效演示入口。
HTML 现在通过模块加载 TypeScript，需要开发服务器或构建后的静态服务，
不能直接双击源码 HTML 运行。

## 目录

```text
frontend/
├── tsconfig.json         # 严格类型检查，不直接生成 JS
└── src/
    ├── main.ts           # 整站入口
    ├── motion-demo.ts    # 独立动效演示入口
    ├── types.ts          # 页面、场馆、订单、预约状态类型
    ├── config.ts         # API 地址与演示模式配置
    ├── routes.ts         # 主导航定义
    ├── router.ts         # 导航与返回逻辑
    ├── render.ts         # 页面组合和导航渲染
    ├── events.ts         # 委托事件绑定
    ├── pages/            # 登录、首页、场地、预约各步骤、订单、我的
    ├── components/       # 场馆卡片、导航图标
    ├── controllers/      # 登录、筛选、预约交互
    ├── state/            # 共享预览状态
    ├── services/         # HTTP 与余量查询
    ├── data/             # 演示场馆和余量
    ├── assets/           # 本地场馆图片，由 Vite 打包
    ├── motion/           # 转场与数字滚动
    ├── utils/            # DOM、转义、日期工具
    └── styles/           # 基础、页面、组件、动效样式
```

新增页面时在 `pages/` 中实现渲染函数，在 `types.ts` 的页面类型及
`render.ts` 的渲染表注册。交互放入 `controllers/`，通过 `events.ts`
绑定 `data-act`，不使用内联事件或全局函数。`styles/app.css` 统一组织样式；
保持导入顺序，末尾的 `overrides.css` 保留原页面的覆盖规则。

## 与微信小程序的关系

浏览器页面用于交互和视觉预览，默认使用演示数据；登录、支付、订单及
核销凭证不会发起真实业务操作。仅修改 `USE_API` 不会接通完整业务流程。
实际微信小程序继续放在 `miniprogram/`，保留微信原生目录与编译方式。
后端在 `server/`，本次结构化不修改后端。

```sh
npm run build:miniprogram  # 编译微信小程序 TS
npm run build             # 编译两种前端
npm test                  # 小程序回归检查
npm run test:web          # 浏览器交互与响应式检查
```

浏览器测试在 macOS 使用已安装的 Google Chrome；其他系统先运行
`npx playwright install chromium`。测试截图和失败 trace 保存在 `test-results/`。
