@echo off
chcp 65001 >nul
title 智场通 SmartVenue · 后端一键启动器
echo ========================================================
echo        智场通 SmartVenue · 后端服务一键启动器
echo        API 地址: http://127.0.0.1:3000/api
echo ========================================================
echo.

cd /d %~dp0..\server

if not exist node_modules (
  echo [1/4] 正在安装后端依赖...
  call npm install
) else (
  echo [1/4] 后端依赖已就绪.
)

echo [2/4] 正在生成 Prisma ORM 客户端...
call npx prisma generate

echo [3/4] 正在同步 SQLite 数据库表结构 (dev.db)...
call npx prisma db push

if not exist prisma\dev.db (
  echo [4/4] 首次运行，正在导入标准演示数据...
  call npx ts-node prisma/seed.ts
) else (
  echo [4/4] 数据库 dev.db 已就绪.
)

echo.
echo ========================================================
echo  正在启动 NestJS 开发服务器 (http://127.0.0.1:3000)...
echo  按 Ctrl+C 停止服务
echo ========================================================
echo.

call npm run start:dev
pause
