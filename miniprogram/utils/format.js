"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStatusMeta = exports.getVenueTypeName = exports.getWeekdayName = exports.formatDate = exports.formatMoney = void 0;
/**
 * 格式化金额 (分转元，保留2位或整数)
 */
function formatMoney(cents, showSymbol = true) {
    if (cents === undefined || cents === null || isNaN(cents)) {
        return showSymbol ? '¥0.00' : '0.00';
    }
    const yuan = (cents / 100).toFixed(2);
    return showSymbol ? `¥${yuan}` : yuan;
}
exports.formatMoney = formatMoney;
/**
 * 格式化时间
 */
function formatDate(dateStr, format = 'YYYY-MM-DD') {
    const d = new Date(dateStr);
    if (isNaN(d.getTime()))
        return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return format
        .replace('YYYY', String(year))
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}
exports.formatDate = formatDate;
/**
 * 获取星期几
 */
function getWeekdayName(dateStr) {
    const d = new Date(dateStr);
    const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return names[d.getDay()] || '';
}
exports.getWeekdayName = getWeekdayName;
/**
 * 场馆类型中文映射
 */
function getVenueTypeName(type) {
    const map = {
        BADMINTON: '羽毛球',
        BASKETBALL: '篮球',
        TENNIS: '网球',
        TABLE_TENNIS: '乒乓球',
        FOOTBALL: '足球',
        SWIMMING: '游泳',
        FITNESS: '健身',
        MULTI: '综合馆',
    };
    return map[type] || type;
}
exports.getVenueTypeName = getVenueTypeName;
/**
 * 订单/预约状态中文及样式映射
 */
function getStatusMeta(status) {
    switch (status) {
        case 'PENDING_PAYMENT':
            return { label: '待支付', color: '#FA8C16', bg: '#FFF7E6' };
        case 'CONFIRMED':
        case 'PAID':
            return { label: '待使用', color: '#1677FF', bg: '#E6F4FF' };
        case 'CHECKED_IN':
            return { label: '已入场', color: '#00B96B', bg: '#E6FFFB' };
        case 'COMPLETED':
            return { label: '已完成', color: '#52C41A', bg: '#F6FFED' };
        case 'CANCELLED':
            return { label: '已取消', color: '#8C8C8C', bg: '#F5F5F5' };
        case 'REFUNDING':
            return { label: '退款中', color: '#722ED1', bg: '#F9F0FF' };
        case 'REFUNDED':
            return { label: '已退款', color: '#FF4D4F', bg: '#FFF1F0' };
        case 'EXPIRED':
            return { label: '已超时', color: '#BFBFBF', bg: '#FAFAFA' };
        default:
            return { label: status, color: '#595959', bg: '#F5F5F5' };
    }
}
exports.getStatusMeta = getStatusMeta;
