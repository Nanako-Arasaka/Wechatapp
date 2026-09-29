import { venues } from "../data/demo";
import type { PreviewState } from "../types";

export const S: PreviewState = {
  page: "登录",
  loggedIn: false,
  venue: venues[0],
  type: "全部",
  keyword: "",
  slot: "",
  court: 0,
  quickVenue: 1,
  orderFilter: "全部",
  form: { sid: "", name: "", phone: "" },
  // 预约日期（今天+7）
  selectedDate: "",
  selectedDateLabel: "",
  daySummaries: [],
  daysLoading: false,
  daysError: false,
  slotsByDate: {}, // date -> slots[]
  viewOrder: null, // 订单页「出示核销码」时选中的订单
  // 动效调度：仅首次进入页面播放入场；交互只用微动效
  entered: {},
  motion: "enter", // enter | micro | none
  slotsLoading: false,
  _pageSwap: "",
  _pageSwapAt: 0,
  _summaryFirst: false,
  orders: [
    {
      id: "BK202609280031",
      status: "待使用",
      venue: venues[0],
      date: "2026-09-28",
      time: "18:00-19:00",
      court: 3,
      price: 35,
    },
    {
      id: "BK202609200112",
      status: "已完成",
      venue: venues[1],
      date: "2026-09-20",
      time: "19:00-20:00",
      court: 1,
      price: 50,
    },
  ],
};
