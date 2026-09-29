import { S } from "../state/store";
import { venues, mockDaySummaries, mockSlots } from "../data/demo";
import { go } from "../router";
import { render } from "../render";
import { USE_API } from "../config";
import { fetchDaySummaries, apiGet } from "../services/availability";
import { toast, esc } from "../utils/dom";
import { clearPageSwap } from "../motion/transitions";
import { fmtDate, timeText } from "../utils/date";
import { mountOdometer, rollOdometer } from "../motion/odometer";
import type { AvailabilityResponse } from "../types";

export function startBooking(id: number) {
  S.venue = venues.find((v) => v.id === id) || venues[0];
  S.slot = "";
  S.court = 0;
  S.selectedDate = "";
  S.selectedDateLabel = "";
  // 每次开始预约都重播选日切入
  delete S.entered["选择日期"];
  delete S.entered["选择时间"];
  S.daysLoading = true;
  S.daysError = false;
  S.daySummaries = [];
  go("选择日期"); // 带 page-swap 的首帧先绘制
  // 下一帧再灌数据，保证切入动画先播出来
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      loadDaySummaries(true);
    });
  });
}

export async function loadDaySummaries(skipRender = false) {
  if (!skipRender) {
    S.daysLoading = true;
    S.daysError = false;
    S.motion = S.entered["选择日期"] ? "none" : "enter";
    render();
  }
  try {
    if (USE_API) {
      S.daySummaries = await fetchDaySummaries(S.venue.id);
    } else {
      S.daySummaries = mockDaySummaries();
    }
    S.daysLoading = false;
    // 首次看到日历内容时再播 cal-in
    if (!S.entered["选择日期"]) S.motion = "enter";
    render();
  } catch (e) {
    console.warn(e);
    S.daySummaries = mockDaySummaries();
    S.daysLoading = false;
    S.daysError = false; // 降级 mock 仍展示
    if (!S.entered["选择日期"]) S.motion = "enter";
    render();
    toast("已使用演示余量（后端未连接）");
  }
}

export async function selectDate(date: string, label?: string) {
  clearPageSwap();
  S.selectedDate = date;
  S.selectedDateLabel = label || date;
  S.slot = "";
  S.motion = "micro";
  render();
  await loadSlotsForDate(date);
}

export function loadSlotsForDate(date: string) {
  S.slotsLoading = true;
  S.motion = "none";
  render();
  return (async () => {
    try {
      if (USE_API) {
        const av = await apiGet<AvailabilityResponse>(
          `/venues/${S.venue.id}/availability?date=${date}`,
        );
        S.slotsByDate[date] = (av.slots || []).map((s) => ({
          id: s.id,
          t: s.startTime,
          end: s.endTime,
          remaining: s.remaining ?? 0,
          disabled: !s.isSelectable,
          reason: s.isSelectable
            ? ""
            : s.statusText === "已过时段" || s.status === "CLOSED"
              ? "past"
              : "full",
          statusText: s.isSelectable
            ? "✓ 余 " + (s.remaining ?? 0)
            : s.statusText === "已过时段" || s.status === "CLOSED"
              ? "已过"
              : "满",
        }));
      } else {
        S.slotsByDate[date] = mockSlots(date);
      }
      S.slotsLoading = false;
      if (!S.entered["选择时间"]) S.motion = "enter";
      if (S.page === "选择时间") render();
    } catch (e) {
      console.warn(e);
      S.slotsByDate[date] = mockSlots(date);
      S.slotsLoading = false;
      if (!S.entered["选择时间"]) S.motion = "enter";
      if (S.page === "选择时间") {
        render();
        toast("时段数据来自演示");
      }
    }
  })();
}

export function selectSlot(t: string) {
  clearPageSwap();
  const firstSummary = !S.slot && !!t;
  const prev = S.slot;
  S.slot = t;
  S.motion = "none";
  S._summaryFirst = firstSummary;

  // 只改点中的格子，避免整页重绘造成整卡震动
  const cells = document.querySelectorAll<HTMLElement>(
    '.cell[data-act="select-slot"]',
  );
  cells.forEach((btn) => {
    const on = btn.getAttribute("data-t") === t;
    if (!on) btn.classList.remove("selected");
    // 禁用格不加 selected
    if (on && btn.getAttribute("data-disabled") !== "1") {
      // 强制重置 CSS 动画，只让本次选中播 pop+ring
      btn.classList.remove("selected");
      void btn.offsetWidth;
      btn.classList.add("selected");
    }
  });

  // 更新/插入「已选时段」摘要（只动这一块）
  const date = S.selectedDate || fmtDate(new Date());
  const exist = document.querySelector<HTMLElement>("#summary-card");
  const html = `
    <div class="section-title" style="margin-top:0;color:var(--primary)">已选时段</div>
    <div class="fact"><span>场馆</span><span>${S.venue.name}</span></div>
    <div class="fact"><span>日期</span><span>${esc(S.selectedDateLabel || date)}</span></div>
    <div class="fact"><span>时间段</span><span class="slot-val" id="slotVal">${timeText(S.slot)}</span></div>
    <div class="fact"><span>单价</span><span style="color:var(--warning)">¥${S.venue.price}</span></div>
  `;
  if (exist) {
    exist.innerHTML = html;
    exist.style.display = "";
  } else {
    const wrap = document.createElement("div");
    wrap.id = "summary-card";
    wrap.className = "card summary-first";
    wrap.innerHTML = html;
    const nextBtn = document.querySelector(
      '[data-act="go"][data-page="选场地"]',
    );
    if (nextBtn && nextBtn.parentElement) {
      nextBtn.parentElement.insertBefore(wrap, nextBtn);
    }
  }

  // 下一步按钮可用状态
  const next = document.querySelector('[data-act="go"][data-page="选场地"]');
  if (next) {
    next.classList.remove("disabled");
    next.removeAttribute("disabled");
  }

  // 时间段数字：仅首次出现轻入场；换时间只滚数字
  const val = document.getElementById("slotVal");
  if (!val) return;
  if (firstSummary || !prev) {
    mountOdometer(val, timeText(S.slot));
    return;
  }
  if (prev === S.slot) return;
  const advancing = Number(S.slot.slice(0, 2)) >= Number(prev.slice(0, 2));
  mountOdometer(val, timeText(prev));
  requestAnimationFrame(() => {
    rollOdometer(val, timeText(prev), timeText(S.slot), advancing);
  });
}

export function selectCourt(n: number) {
  clearPageSwap();
  S.court = n;
  S.motion = "none";
  // 只更新场地格子
  const cells = document.querySelectorAll<HTMLElement>(
    '.cell[data-act="select-court"]',
  );
  cells.forEach((btn) => {
    const on = Number(btn.getAttribute("data-no")) === n;
    if (!on) btn.classList.remove("selected");
    if (on) {
      btn.classList.remove("selected");
      void btn.offsetWidth;
      btn.classList.add("selected");
    }
  });
  const next = document.querySelector('[data-act="go"][data-page="填写信息"]');
  if (next && n) {
    next.classList.remove("disabled");
    next.removeAttribute("disabled");
  }
}

export function refreshSlots() {
  const btn = document.querySelector('[data-act="refresh-slots"]');
  if (btn) {
    btn.classList.add("refresh-spin");
    setTimeout(() => btn.classList.remove("refresh-spin"), 720);
  }
  const date = S.selectedDate || fmtDate(new Date());
  loadSlotsForDate(date).then(() => {
    S.motion = "none";
    if (S.page === "选择时间") render();
    toast("已刷新时段余量");
  });
}

export async function refreshDays() {
  const btn = document.querySelector('[data-act="refresh-days"]');
  if (btn) {
    btn.classList.add("refresh-spin");
    setTimeout(() => btn.classList.remove("refresh-spin"), 720);
  }
  const prev: Record<string, number> = {};
  (S.daySummaries || []).forEach((d) => {
    prev[d.date] = d.totalRemaining;
  });
  await loadDaySummaries();
  // 数字变化：Apple 滚轮
  requestAnimationFrame(() => {
    S.daySummaries.forEach((d) => {
      const oldN = prev[d.date];
      if (oldN === undefined || oldN === d.totalRemaining || d.isClosed) return;
      const root = document.getElementById("rem-" + d.date);
      if (!root) return;
      mountOdometer(root, String(oldN));
      requestAnimationFrame(() => {
        rollOdometer(
          root,
          String(oldN),
          String(d.totalRemaining),
          d.totalRemaining >= oldN,
        );
      });
    });
  });
}

export function submitBooking() {
  if (!S.form.sid || !S.form.name || !S.form.phone) {
    toast("请填写完整联系方式");
    return;
  }
  const order = {
    id: "BK" + Date.now().toString().slice(-10),
    status: "待使用",
    venue: S.venue,
    date: S.selectedDate || fmtDate(new Date()),
    time: `${S.slot}-${String(Number(S.slot.slice(0, 2)) + 1).padStart(2, "0")}:00`,
    court: S.court,
    price: S.venue.price,
  };
  S.orders.unshift(order);
  toast("支付成功");
  setTimeout(() => go("预约成功"), 200);
}
