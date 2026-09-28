#!/bin/bash
set -e
BASE="http://localhost:3000/api"
TODAY=$(date +%Y-%m-%d)

echo "=== 获取 Token ==="
USER_TOKEN=$(curl -s -X POST "$BASE/auth/demo-login" -H "Content-Type: application/json" -d '{"role":"USER","username":"user"}' | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
ADMIN_TOKEN=$(curl -s -X POST "$BASE/auth/demo-login" -H "Content-Type: application/json" -d '{"role":"ADMIN","username":"admin"}' | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

echo ""
echo "=== 今日可用 slot 状态 ==="
curl -s "$BASE/venues/1/availability?date=$TODAY" | grep -o '"status":"[^"]*","statusText":"[^"]*"' | head -5

echo ""
echo "=== 管理员 vs 普通用户预约权限差异 ==="
# 找一个非高峰、AVAILABLE的slot
SLOT_JSON=$(curl -s "$BASE/venues/1/availability?date=$TODAY" | grep -o '"id":"[^"]*","venueId":"1","date":"[^"]*","startTime":"[^"]*","endTime":"[^"]*","price":[0-9]*,"totalCapacity":[0-9]*,"bookedCapacity":[0-9]*,"remaining":[0-9]*,"status":"AVAILABLE"' | head -1)
echo "Target slot: $SLOT_JSON"
SLOT_ID=$(echo "$SLOT_JSON" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Slot ID: $SLOT_ID"

echo ""
echo "=== 普通用户预约 ==="
curl -s -X POST "$BASE/bookings" -H "Content-Type: application/json" -H "Authorization: Bearer $USER_TOKEN" -d "{\"venueId\":\"1\",\"slotId\":\"$SLOT_ID\",\"quantity\":1}" | head -c 400
echo ""

echo ""
echo "=== 检查该slot剩余容量 ==="
curl -s "$BASE/venues/1/availability?date=$TODAY" | grep -o '"id":"'$SLOT_ID'"[^}]*' | head -1

echo ""
echo "=== 超卖测试：5个用户同时约最后1个名额 ==="
# 找一个 remaining=1 的slot
ONE_SLOT=$(curl -s "$BASE/venues/1/availability?date=$TODAY" | grep -o '"id":"[^"]*","venueId":"1"[^}]*"remaining":1[^}]*' | head -1)
echo "One remaining slot: $ONE_SLOT"
ONE_SLOT_ID=$(echo "$ONE_SLOT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "One slot ID: $ONE_SLOT_ID"
if [ -n "$ONE_SLOT_ID" ]; then
  for i in 1 2 3 4 5; do
    curl -s -X POST "$BASE/bookings" -H "Content-Type: application/json" -H "Authorization: Bearer $USER_TOKEN" -d "{\"venueId\":\"1\",\"slotId\":\"$ONE_SLOT_ID\",\"quantity\":1}" > /tmp/book_$i.json &
  done
  wait
  echo "Result1: $(cat /tmp/book_1.json | head -c 200)"
  echo "Result2: $(cat /tmp/book_2.json | head -c 200)"
  echo "Result3: $(cat /tmp/book_3.json | head -c 200)"
  echo "Result4: $(cat /tmp/book_4.json | head -c 200)"
  echo "Result5: $(cat /tmp/book_5.json | head -c 200)"
  # 统计成功数量
  SUCCESS_COUNT=$(grep -l '"bookingId"' /tmp/book_*.json | wc -l)
  echo "成功预约数: $SUCCESS_COUNT"
fi

echo ""
echo "=== 分页测试 ==="
echo "请求 pageSize=2:"
curl -s "$BASE/venues?page=1&pageSize=2" | grep -o '"id":"[0-9]*","name"' | wc -l
echo "请求无分页:"
curl -s "$BASE/venues" | grep -o '"id":"[0-9]*","name"' | wc -l

echo ""
echo "=== 日期边界：预约昨天 ==="
YESTERDAY=$(date -d "-1 day" +%Y-%m-%d || date -v-1d +%Y-%m-%d)
YESTERDAY_SLOT=$(curl -s "$BASE/venues/1/availability?date=$YESTERDAY" | grep -o '"id":"[^"]*","venueId":"1"' | head -1 | cut -d'"' -f4)
echo "Yesterday slot: $YESTERDAY_SLOT"
curl -s -X POST "$BASE/bookings" -H "Content-Type: application/json" -H "Authorization: Bearer $USER_TOKEN" -d "{\"venueId\":\"1\",\"slotId\":\"$YESTERDAY_SLOT\",\"quantity\":1}" | head -c 300
echo ""
