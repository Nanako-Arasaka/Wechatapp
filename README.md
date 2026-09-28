# 🏟️ Slotify (智场通) · 智慧体育场馆预约与分时余量管理系统
## 📖 官方系统架构与开发部署指南 (Architecture & Deployment Guide)

---

### 📖 一、系统概述 (System Overview)
**Slotify (智场通)** 是一款面向高校文体中心与商业体育场馆的高性能分时预约与智能调度平台。系统严格遵循微信小程序官方设计规范，基于 **“双引擎架构”**（微信云开发原生通道 + NestJS 独立全栈服务端），实现了**毫秒级余量感知、防超卖原子事务、动态错峰指南、一键扫码核销与多维运营大屏**。

---

### 🛠️ 二、技术栈与工程架构 (Tech Stack)

| 模块 | 核心技术选型 | 说明 |
| :--- | :--- | :--- |
| **小程序端 (Frontend)** | 微信原生框架 + TypeScript + WXML/WXSS | 启用组件按需注入 (`lazyCodeLoading`)，0 毫秒首屏秒开 |
| **微信云开发 (Cloud Base)** | 微信云函数 (Node.js) + 云数据库 (JSON) | 包含 6 大业务云函数，支持体验版 5G 免域名秒开 |
| **全栈服务端 (Backend)** | NestJS + TypeScript + Prisma ORM + SQLite | 事务级锁控与防超卖引擎，JWT 安全鉴权，RBAC 角色权限体系 |
| **测试与质量 (QA & Test)** | Jest 自动化测试套件 + 微信代码质量 Audit | 10 组高并发防超卖、防重复核销与权限越权拦截用例 100% PASS |

---

### 📂 三、项目完整目录结构 (Project Structure)

```text
smart-venue/
├── miniprogram/                     # 📱 微信小程序完整工程源码
│   ├── assets/icons/               # 8 张 81x81 高清 TabBar 矢量图标
│   ├── cloudfunctions/             # ☁️ 6 大核心微信云函数
│   │   ├── initDatabase/           # 自动初始化云端数据表与 8 大场馆
│   │   ├── checkAndCreateOrder/    # 需求 8.1: 原子防超卖下单云函数
│   │   ├── cancelOrder/            # 需求 8.2: 取消订单释放库存云函数
│   │   ├── getDashboardStat/       # 需求 8.3: 运营数据大屏聚合云函数
│   │   ├── getVenues/              # 场馆多维查询云函数
│   │   └── getOrders/              # 用户订单列表查询云函数
│   ├── components/                 # 🧩 自定义按需加载组件 (empty, status-tag)
│   ├── pages/                      # 19 个业务页面 (用户端 + 管理端)
│   │   ├── index/                  # 首页 (错峰出行指南、热门场馆、快速排期选座)
│   │   ├── venue/                  # 场地列表检索、场馆详情、7天时段矩阵选座
│   │   ├── order/                  # 订单列表、详情、模拟支付、核销动态二维码
│   │   ├── user/                   # 会员中心、身份切换、消息通知
│   │   └── admin/                  # 📊 运营大屏、实时监控、扫码核销器、结算中心
│   ├── services/                   # 🔌 业务接口层与三重自愈容错引擎
│   ├── store/                      # 🗄️ 全局状态管理 (Token/UserInfo 本地持久化)
│   ├── app.json                    # 全局路由、TabBar 与按需注入配置
│   ├── config.ts                   # 环境与 API 地址配置
│   ├── project.config.json         # 微信开发者工具工程配置
│   └── project.private.config.json # 微信工具私有配置 (内置 6 组一键直达编译模式)
│
├── server/                         # 🚀 NestJS 高性能独立服务端
│   ├── prisma/                     # 数据模型定义与自动化种子数据脚本 (seed.ts)
│   │   ├── schema.prisma           # Prisma 数据建模 (8 张实体关联表)
│   │   └── dev.db                  # 持久化 SQLite 数据库 (已注入全部演示数据)
│   ├── src/                        # 业务源码 (Auth, Venues, Bookings, Orders, Admin)
│   │   ├── booking-flow.spec.ts    # 10 组全链路自动化并发与核销测试用例
│   │   └── main.ts                 # 服务启动入口 (监听 0.0.0.0 支持真机局域网)
│   └── package.json
│
├── scripts/                        # 🛠️ 运维与启动脚本
│   ├── install-cloud-functions.bat # 一键安装 6 大云函数 npm 依赖
│   └── start-server.bat            # 一键启动本地 NestJS 后端服务
│
└── README.md                       # 快速入门与部署文档
```

---

### 👥 四、预置账号矩阵 (Account Matrix)

| 角色类型 | 登录账号 | 姓名 | 默认权限 | 推荐体验功能 |
| :--- | :--- | :--- | :--- | :--- |
| **普通用户 (USER)** | `user` | **张同学 (运动爱好者)** | 场地预约、分时选座、模拟支付、出示核销码、退改签 | 首页错峰指南、预约星羽羽毛球馆、查看核销凭证 |
| **场馆管理员 (ADMIN)** | `admin` | **王管理员 (场馆总监)** | 扫码核销、排期管理、订单退款、场馆状态调整 | 扫码核销工作台、查看待核销流水 |
| **系统超管 (SUPER_ADMIN)** | `superadmin` | **李主管 (系统超管)** | 全局数据大屏、财务结算、系统设置、全权限 | 📊 运营数据大屏、7天营收走势图、场地热力图 |

> 💡 **快捷切换技巧**：在小程序【我的】个人中心页面顶部，点击 **「切换为管理员身份」** 即可 1 秒免密切换，体验完整权限！

---

### 🚀 五、一键启动与使用指引 (Quick Start)

#### 模式 A：微信开发者工具本地调试（推荐演示）
1. 打开【微信开发者工具】，选择 **「导入项目」**；
2. 目录选择 `smart-venue/miniprogram`，AppID 填入您的小程序 AppID；
3. 双击运行 `scripts/start-server.bat` 启动后端服务（端口 3000）；
4. 微信工具顶部编译下拉菜单中已预设 6 组直达入口，点击即可秒开！

#### 模式 B：纯微信云开发模式（支持手机 5G 真机秒开）
1. 在微信开发者工具中右键 `cloudfunctions/` 下的各个云函数 $\rightarrow$ **「创建并部署：所有文件」**；
2. 点击顶部 **「上传」** 设为体验版；
3. 任何手机扫码即可直接体验，数据自动在微信云数据库同步！

---

### 🧪 六、自动化测试验证报告 (Test Verification)

执行测试命令：`cd server && npm run test`
```text
PASS src/booking-flow.spec.ts
  SmartVenue Business Flow & Anti-Overselling E2E Test
    √ TEST 01: 用户演示登录并获取 Token (36 ms)
    √ TEST 02: 管理员演示登录并获取 Token (4 ms)
    √ TEST 03: 查询场馆列表与实时余量 Slots (11 ms)
    √ TEST 04: 创建预约并原子扣减库存 (防超卖检验) (62 ms)
    √ TEST 05: 模拟微信支付订单并扭转状态 (22 ms)
    √ TEST 06: 二维码核销预检 (7 ms)
    √ TEST 07: 管理员确认核销入场 (20 ms)
    √ TEST 08: 重复核销安全拦截 (6 ms)
    √ TEST 09: 普通用户禁止访问 Admin 接口 (RoleGuard 拦截) (3 ms)
    √ TEST 10: 管理员访问 Dashboard 数据看板成功 (71 ms)

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total (100% PASS)
```
