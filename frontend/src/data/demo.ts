import { fmtDate, weekdayName } from "../utils/date";
import type { Venue, DaySummary, BookingSlot } from "../types";
import badmintonImage from "../assets/venues/badminton.jpg";
import basketballImage from "../assets/venues/basketball.jpg";
import footballImage from "../assets/venues/football.jpg";
import tennisImage from "../assets/venues/tennis.jpg";
import tableTennisImage from "../assets/venues/table-tennis.jpg";
import swimmingImage from "../assets/venues/swimming.jpg";

export const venues: Venue[] = [
  {
    id: 1,
    name: "星羽羽毛球馆 (A馆)",
    type: "羽毛球",
    address: "文体中心综合馆 2层 B区",
    price: 35,
    remain: 8,
    hours: "08:00-22:00",
    image: badmintonImage,
    facilities: ["中央空调", "专业照明", "更衣淋浴"],
    desc: "国家级比赛标准木地板与专业防滑地胶，配备无影 LED 运动照明和恒温空调。",
  },
  {
    id: 2,
    name: "冠军篮球中心 (室内主馆)",
    type: "篮球",
    address: "体育中心北区 1号竞技馆",
    price: 50,
    remain: 5,
    hours: "09:00-22:00",
    image: basketballImage,
    facilities: ["中央空调", "电子计分器", "淋浴间"],
    desc: "FIBA 认证枫木地板，配备标准篮架与实时计分大屏。",
  },
  {
    id: 3,
    name: "青春足球场 (人工草7人制)",
    type: "足球",
    address: "体育中心南区 户外足球场",
    price: 120,
    remain: 2,
    hours: "08:00-22:00",
    image: footballImage,
    facilities: ["夜间照明", "替补席", "急救箱"],
    desc: "环保人造草坪，配备夜间照明和七人制标准球门。",
  },
  {
    id: 4,
    name: "悦动网球馆 (红土&硬地)",
    type: "网球",
    address: "体育公园东侧 网球中心",
    price: 60,
    remain: 4,
    hours: "07:00-22:00",
    image: tennisImage,
    facilities: ["发球机租借", "夜间照明", "淋浴间"],
    desc: "标准红土与硬地球场，夜间配备专业泛光照明。",
  },
  {
    id: 5,
    name: "活力乒乓球馆",
    type: "乒乓球",
    address: "文体中心综合馆 3层 A区",
    price: 20,
    remain: 10,
    hours: "08:00-22:00",
    image: tableTennisImage,
    facilities: ["空调", "休息区", "储物柜"],
    desc: "专业比赛球台与防滑地胶，提供独立隔断空间。",
  },
  {
    id: 6,
    name: "蓝海游泳馆 (恒温50米)",
    type: "游泳",
    address: "体育中心水上运动馆 1层",
    price: 40,
    remain: 6,
    hours: "06:30-21:30",
    image: swimmingImage,
    facilities: ["恒温水质", "淋浴间", "救生员"],
    desc: "50 米恒温泳池，配备循环净化系统与专业救生员。",
  },
];

export function mockDaySummaries(): DaySummary[] {
  const now = new Date();
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    return {
      date: fmtDate(d),
      weekday: weekdayName(d),
      isToday: i === 0,
      isClosed: i === 3,
      closedReason: i === 3 ? "场馆维护" : "",
      totalRemaining: i === 3 ? 0 : Math.max(0, 24 - i * 3),
      availableSlotCount: i === 3 ? 0 : 8,
    };
  });
}

export function mockSlots(dateStr: string): BookingSlot[] {
  // 仅「当天」才用系统时间过滤已过时段；未来日期整天可约
  const todayStr = fmtDate(new Date());
  const isToday = !dateStr || dateStr === todayStr;
  const nowH = new Date().getHours();
  return [
    "09:00",
    "10:00",
    "11:00",
    "14:00",
    "15:00",
    "16:00",
    "18:00",
    "19:00",
    "20:00",
  ].map((t) => {
    const hour = Number(t.slice(0, 2));
    const isPast = isToday && hour < nowH;
    const isFull = !isPast && t === "19:00";
    return {
      id: t,
      t,
      remaining: isPast || isFull ? 0 : 3 + (hour % 5),
      disabled: isPast || isFull,
      reason: isPast ? "past" : isFull ? "full" : "",
      statusText: isPast ? "已过" : isFull ? "满" : "✓ 余 " + (3 + (hour % 5)),
    };
  });
}
