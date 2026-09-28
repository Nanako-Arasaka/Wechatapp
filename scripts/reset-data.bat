@echo off
chcp 65001 >nul
title 智场通 SmartVenue - 初始化标准数据库
echo ========================================================
echo        智场通 SmartVenue · 标准业务数据初始化工具
echo ========================================================
echo.

cd /d %~dp0\..\server

echo 正在清理并重建数据库 dev.db ...
if exist prisma\dev.db del prisma\dev.db

echo 正在生成数据库表结构...
call npx prisma db push

echo 正在导入 300+ 笔标准业务数据 (30天趋势、8大场馆、核销记录)...
call npx ts-node prisma/seed.ts

echo.
echo ========================================================
echo 🎉 数据库已成功初始化就绪！
echo 预置账号：user / admin / superadmin
echo ========================================================
pause
