export const pageNames = [
  "登录",
  "首页",
  "场地",
  "场馆详情",
  "选择日期",
  "选择时间",
  "选场地",
  "填写信息",
  "预约成功",
  "订单",
  "我的",
] as const;
export type PageName = (typeof pageNames)[number];
export type RootTab = "首页" | "场地" | "订单" | "我的";

export interface Venue {
  id: number;
  name: string;
  type: string;
  address: string;
  price: number;
  remain: number;
  hours: string;
  image: string;
  facilities: string[];
  desc: string;
}

export interface PreviewOrder {
  id: string;
  status: string;
  venue: Venue;
  date: string;
  time: string;
  court: number;
  price: number;
}

export interface DaySummary {
  date: string;
  weekday: string;
  isToday: boolean;
  isClosed: boolean;
  closedReason: string;
  totalRemaining: number;
  availableSlotCount: number;
}

export interface BookingSlot {
  id: string;
  t: string;
  end?: string;
  remaining: number;
  disabled: boolean;
  reason: string;
  statusText: string;
}

export interface AvailabilityResponse {
  isClosed: boolean;
  closedReason?: string;
  slots: Array<{
    id: string;
    startTime: string;
    endTime: string;
    remaining: number;
    isSelectable: boolean;
    status: string;
    statusText: string;
  }>;
}

export interface PreviewState {
  page: PageName;
  loggedIn: boolean;
  venue: Venue;
  type: string;
  keyword: string;
  slot: string;
  court: number;
  quickVenue: number;
  orderFilter: string;
  form: { sid: string; name: string; phone: string };
  selectedDate: string;
  selectedDateLabel: string;
  daySummaries: DaySummary[];
  daysLoading: boolean;
  daysError: boolean;
  slotsByDate: Record<string, BookingSlot[]>;
  viewOrder: PreviewOrder | null;
  entered: Partial<Record<PageName, boolean>>;
  motion: "enter" | "micro" | "none";
  slotsLoading: boolean;
  orders: PreviewOrder[];
  _pageSwap: string;
  _pageSwapAt: number;
  _summaryFirst: boolean;
}

export function isPageName(value: string | undefined): value is PageName {
  return pageNames.some((name) => name === value);
}
