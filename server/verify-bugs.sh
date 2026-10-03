#!/bin/bash
set -e
BASE="http://localhost:3000/api"
TODAY=$(date +%Y-%m-%d)
FUTURE=$(date -d "+30 days" +%Y-%m-%d || date -v+30d +%Y-%m-%d)

echo "=== 获取 Token ==="
USER_TOKEN=$(curl -s -X POST "$BASE/auth/demo-login" -H "Content-Type: application/json" -d '{"role":"USER","username":"user"}' | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
ADMIN_TOKEN=$(curl -s -X POST "$BASE/auth/demo-login" -H "Content-Type: application/json" -d '{"role":"ADMIN","username":"admin"}' | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
SUPER_TOKEN=$(curl -s -X POST "$BASE/auth/demo-login" -H "Content-Type: application/json" -d '{"role":"SUPER_ADMIN","username":"superadmin"}' | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "USER_TOKEN=${USER_TOKEN:0:20}..."
echo "ADMIN_TOKEN=${ADMIN_TOKEN:0:20}..."
echo "SUPER_TOKEN=${SUPER_TOKEN:0:20}..."

echo ""
echo "=== A1: 修改开放时间后 slots 是否重建 ==="
echo "修改前今日 slots:"
curl -s "$BASE/venues/1/availability?date=$TODAY" | grep -o '"startTime":"[0-9:]*","endTime":"[0-9:]*"' | head -6

curl -s -X PUT "$BASE/admin/venues/1" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"openTime":"10:00","closeTime":"20:00"}' | head -c 200
echo ""
echo "修改后今日 slots:"
curl -s "$BASE/venues/1/availability?date=$TODAY" | grep -o '"startTime":"[0-9:]*","endTime":"[0-9:]*"' | head -6

echo ""
echo "=== A3: 非法时间校验 ==="
curl -s -X PUT "$BASE/admin/venues/2" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"openTime":"25:00","closeTime":"07:00"}' | head -c 300
echo ""

echo ""
echo "=== A4: 闭馆有预约时的处理 ==="
# 先找一个有未来预约的slot
curl -s "$BASE/admin/bookings?venueId=1&date=$TODAY" -H "Authorization: Bearer $ADMIN_TOKEN" | head -c 300
echo ""
curl -s -X POST "$BASE/admin/venues/1/close-date" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d "{\"date\":\"$TODAY\",\"reason\":\"临时测试闭馆\"}" | head -c 300
echo ""

echo ""
echo "=== B6/B3: 搜索与排序 ==="
# 分页参数
curl -s "$BASE/venues?page=1&pageSize=2" | head -c 500
echo ""
# 搜索大小写
curl -s "$BASE/venues?keyword=羽毛球" | grep -o '"name":"[^"]*"' | head -5
echo "---"
curl -s "$BASE/venues?keyword=badminton" | grep -o '"name":"[^"]*"' | head -5

echo ""
echo "=== 预约 advanceDays / 远期日期 ==="
# 先获取远期slot
echo "Future date: $FUTURE"
SLOT_ID=$(curl -s "$BASE/venues/1/availability?date=$FUTURE" | grep -o '"id":"[^"]*","venueId":"1"' | head -1 | cut -d'"' -f4)
echo "Future slot id: $SLOT_ID"
curl -s -X POST "$BASE/bookings" -H "Content-Type: application/json" -H "Authorization: Bearer $USER_TOKEN" -d "{\"venueId\":\"1\",\"slotId\":\"$SLOT_ID\",\"quantity\":1}" | head -c 500
echo ""

echo ""
echo "=== 管理员预约 CLOSED 时段 ==="
# 闭馆后，场馆1今日slot应已CLOSED
SLOT_ID_CLOSED=$(curl -s "$BASE/venues/1/availability?date=$TODAY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "First slot id: $SLOT_ID_CLOSED"
curl -s -X POST "$BASE/bookings" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d "{\"venueId\":\"1\",\"slotId\":\"$SLOT_ID_CLOSED\",\"quantity\":1}" | head -c 500
echo ""

echo ""
echo "=== 并发 slots 生成 ==="
# 找一个没有生成过slots的远期日期，并发请求
EMPTY_DATE="2030-01-01"
for i in {1..3}; do
  curl -s "$BASE/venues/1/availability?date=$EMPTY_DATE" >/tmp/avail_$i.json &
done
wait
cat /tmp/avail_1.json | head -c 500
echo ""

