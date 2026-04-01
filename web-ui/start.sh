#!/bin/bash

# Accio Work Web UI 启动脚本

set -e

echo "🚀 启动 Accio Work Web UI..."
echo ""

# 检查bun是否安装
if ! command -v bun &> /dev/null; then
    echo "❌ Bun 未安装，请先安装 Bun:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖..."
bun install

# 启动服务器
echo ""
echo "🌐 启动 Web UI..."
echo ""
echo "   前端地址: http://localhost:3000"
echo "   API地址:  http://localhost:8080"
echo "   文档地址: http://localhost:8080/swagger"
echo ""

# 同时启动前端和后端
bun run server &
SERVER_PID=$!

bun run dev &
DEV_PID=$!

# 捕获Ctrl+C信号
trap "echo ''; echo '🛑 正在关闭服务...'; kill $SERVER_PID $DEV_PID 2>/dev/null; exit 0" INT

wait
