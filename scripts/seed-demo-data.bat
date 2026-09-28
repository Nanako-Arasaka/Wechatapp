@echo off
chcp 65001 >nul
title 智场通 SmartVenue - 导入演示数据
cd /d %~dp0\..\server
echo 正在执行 Seed 数据生成...
call npx ts-node prisma/seed.ts
pause
