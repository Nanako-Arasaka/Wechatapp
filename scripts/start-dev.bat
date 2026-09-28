@echo off
chcp 65001 >nul
title Slotify (智场通) - 系统服务一键启动器
echo ========================================================
echo        Slotify (智场通) · 场地预约系统启动器
echo ========================================================
echo.

cd /d %~dp0\..\server

if not exist node_modules (
    echo [1/5] 正在安装后端依赖库...
    call npm install
) else (
    echo [1/5] 后端依赖库已就绪.
)

echo [2/5] 正在生成 Prisma ORM 客户端...
call npx prisma generate

echo [3/5] 正在同步 SQLite 数据库表结构 (dev.db)...
call npx prisma db push

if not exist prisma\dev.db (
    echo [4/5] 首次运行，正在导入 300+ 笔标准业务初始化数据...
    call npx ts-node prisma/seed.ts
) else (
    echo [4/5] 数据库 dev.db 已就绪.
)

echo [5/5] 正在编译微信小程序前端脚本 (TypeScript -^> JavaScript)...
cd /d %~dp0\..\miniprogram
call ..\server\node_modules\.bin\tsc -p tsconfig.json

cd /d %~dp0\..\server

echo.
echo ========================================================
echo 🚀 正在启动 NestJS 服务 (http://127.0.0.1:3000)...
echo 🏸 请在【微信开发者工具】中点击【重新编译】或重新导入 miniprogram 目录即可！
echo ========================================================
echo.

call npm run start:dev
pause
