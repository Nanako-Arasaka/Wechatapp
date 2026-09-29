import { S } from "../state/store";
import { fmtDate, timeText } from "../utils/date";
import { mockSlots } from "../data/demo";
import { animClass, summaryAnimClass } from "../motion/transitions";
import { esc } from "../utils/dom";

export function pageBooking() {
  const date = S.selectedDate || fmtDate(new Date());
  const slots = S.slotsByDate[date] || mockSlots(date);

  // 仅首次进入：骨架；切时段不重播
  if (S.slotsLoading) {
    return `
    <div class="card first-load">
      <div class="row">
        <div class="sk" style="width:56px;height:56px;border-radius:12px;margin:0"></div>
        <div style="flex:1">
          <div class="sk" style="width:55%;height:14px"></div>
          <div class="sk" style="width:75%;height:11px"></div>
        </div>
      </div>
    </div>
    <div class="card first-load">
      <div class="sk" style="width:40%;height:14px"></div>
      <div class="grid3" style="margin-top:14px">
        ${Array.from({ length: 6 }, () => `<div class="sk" style="height:72px;border-radius:14px;margin:0"></div>`).join("")}
      </div>
    </div>`;
  }

  return `
  <div class="card ${animClass("选择时间", "enter-panel")}">
    <div class="row">
      <img src="${S.venue.image}" style="width:56px;height:56px;border-radius:12px;object-fit:cover" alt="" />
      <div style="min-width:0">
        <div style="font-weight:700" class="truncate">${S.venue.name}</div>
        <div class="muted truncate">${S.venue.address}</div>
      </div>
    </div>
  </div>
  <div class="card ${animClass("选择时间", "enter-panel")} d1">
    <div class="between">
      <div>
        <div style="font-weight:700;font-size:15px">选择预约时段</div>
        <div class="muted">${esc(S.selectedDateLabel || date)} · 可选当日</div>
      </div>
      <div class="row" style="gap:8px">
        <button class="btn-sm" style="background:#F4F6F9;color:var(--text2)" data-act="back-date">改日期</button>
        <button class="btn-sm" style="background:#F4F6F9;color:var(--text2)" data-act="refresh-slots" title="刷新时段余量">
          ⟳ 刷新
        </button>
      </div>
    </div>
  </div>
  <div class="card ${animClass("选择时间", "enter-panel")} d2">
    <div class="grid3">
      ${slots
        .map((item) => {
          const disabled = item.disabled;
          return `<button class="cell ${disabled ? "disabled" : ""} ${S.slot === item.t ? "selected" : ""}"
          data-act="select-slot" data-t="${item.t}" data-disabled="${disabled ? 1 : 0}" data-reason="${item.reason || ""}">
          <div class="t">${item.t}</div>
          <div class="s">${item.statusText}</div>
        </button>`;
        })
        .join("")}
    </div>
  </div>
  ${
    S.slot
      ? `<div class="card ${summaryAnimClass()}" id="summary-card">
    <div class="section-title" style="margin-top:0;color:var(--primary)">已选时段</div>
    <div class="fact"><span>场馆</span><span>${S.venue.name}</span></div>
    <div class="fact"><span>日期</span><span>${esc(S.selectedDateLabel || date)}</span></div>
    <div class="fact"><span>时间段</span><span class="slot-val" id="slotVal">${timeText(S.slot)}</span></div>
    <div class="fact"><span>单价</span><span style="color:var(--warning)">¥${S.venue.price}</span></div>
  </div>`
      : ""
  }
  <button class="btn ${S.slot ? "" : "disabled"}" style="width:100%;margin-top:8px" ${S.slot ? "" : "disabled"}
    data-act="go" data-page="选场地">下一步</button>`;
}
