@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   SmartVenue 后端一键启动（开发模式）
echo ========================================
echo.

REM 1. 检查依赖
if not exist "node_modules\" (
    echo [1/4] 首次运行，安装依赖...
    call npm install
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo [1/4] 依赖已安装，跳过
)

REM 2. 生成 Prisma 客户端
echo [2/4] 生成 Prisma 客户端...
call npx prisma generate
if errorlevel 1 (
    echo [错误] Prisma 客户端生成失败
    pause
    exit /b 1
)

REM 3. 同步数据库表结构（不存在则自动创建）
echo [3/4] 同步数据库表结构...
call npx prisma db push --skip-generate
if errorlevel 1 (
    echo [错误] 数据库同步失败
    pause
    exit /b 1
)

REM 4. 首次运行自动灌入演示数据
if not exist "prisma\dev.db" (
    echo [4/4] 首次运行，导入演示数据...
    call npx ts-node prisma/seed.ts
) else (
    echo [4/4] 数据库已存在，跳过种子数据
)

echo.
echo ========================================
echo   启动开发服务器 http://127.0.0.1:3000
echo   真机调试请看启动日志里的局域网 IP
echo ========================================
echo.
call npm run start:dev
pause
