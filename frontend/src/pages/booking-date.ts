import { S } from "../state/store";
import type { DaySummary } from "../types";
import { fmtDate } from "../utils/date";
import { animClass } from "../motion/transitions";
import { esc } from "../utils/dom";

export function pageSelectDate() {
  const loading = S.daysLoading;
  const err = S.daysError;
  const days = S.daySummaries || [];
  // 仅在「有日历内容的首帧」播 cal-in；loading 骨架不播也不算已进入
  const first = !S.entered["选择日期"] && !loading && !err;

  // 日历：从「本周一」起铺 7 列，覆盖今天起 8 天（含前导空白格）
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today);
  const wd = (today.getDay() + 6) % 7; // 周一=0
  weekStart.setDate(today.getDate() - wd);

  const byDate: Record<string, DaySummary> = {};
  days.forEach((d) => {
    byDate[d.date] = d;
  });

  // 铺 2 周（14 格）保证 8 天都在
  const cells = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + i,
    );
    const key = fmtDate(d);
    const info = byDate[key];
    const inRange = !!info;
    cells.push({ d, key, info, inRange });
  }

  const monthLabel = `${today.getFullYear()}年${today.getMonth() + 1}月`;

  return `
  <div class="card ${animClass("选择日期", "enter-panel")}">
    <div class="between">
      <div>
        <div style="font-weight:700;font-size:15px">选择预约日期</div>
        <div class="muted">可预约未来 7 天 · ${esc(S.venue.name)}</div>
      </div>
      <button class="btn-sm" style="background:#F4F6F9;color:var(--text2)" data-act="refresh-days">⟳ 刷新</button>
    </div>
  </div>

  ${
    loading
      ? `<div class="card" style="overflow:hidden">
    <div class="sk" style="width:40%;height:16px;margin-bottom:12px"></div>
    <div class="cal-grid">
      ${Array.from({ length: 14 }, () => `<div class="sk" style="height:64px;border-radius:10px;margin:0"></div>`).join("")}
    </div>
  </div>`
      : ""
  }

  ${
    !loading && err
      ? `<div class="card" style="text-align:center;padding:28px">
    <div class="muted">日期余量加载失败</div>
    <button class="btn-sm" style="margin-top:12px" data-act="refresh-days">点击重试</button>
  </div>`
      : ""
  }

  ${
    !loading && !err
      ? `
  <div class="card" style="overflow:hidden">
    <div class="cal-month">
      <div class="cal-month-title">${monthLabel}</div>
      <div class="cal-hint">点选日期 · 数字为当日剩余</div>
    </div>
    <div class="cal-weekdays">
      <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
    </div>
    <div class="cal-grid">
      ${cells
        .map((c, i) => {
          if (!c.inRange) {
            return `<div class="cal-cell empty ${first ? "cal-in" : ""}" style="animation-delay:${Math.min(i, 13) * 28}ms"></div>`;
          }
          const d = c.info;
          const disabled = d.isClosed || (d.isToday && d.totalRemaining <= 0);
          const dayNum = c.d.getDate();
          return `<button class="cal-cell ${d.isToday ? "today" : ""} ${S.selectedDate === d.date ? "selected" : ""} ${disabled ? "disabled" : ""} ${first ? "cal-in" : ""}"
          style="animation-delay:${Math.min(i, 13) * 28}ms"
          data-act="select-date" data-date="${d.date}" data-label="${d.date} ${d.weekday}" data-disabled="${disabled ? 1 : 0}">
          <div class="cal-num">${dayNum}</div>
          ${d.isToday ? '<div class="cal-tag">今天</div>' : ""}
          ${disabled && !d.isToday ? '<div class="cal-tag">休</div>' : ""}
          <div class="cal-rem-label">${d.isClosed ? "闭馆" : "剩余"}</div>
          <div class="day-rem" id="rem-${d.date}">
${d.isClosed ? '<span class="odo-static"><span class="odo-strip"><i>—</i></span></span>' : remMarkup(d.totalRemaining)}
          </div>
        </button>`;
        })
        .join("")}
    </div>
    <div class="cal-open">
      <span>● 蓝色为已选 / 今天</span>
      <span>灰色为闭馆或无可约</span>
    </div>
  </div>`
      : ""
  }

  <button class="btn ${S.selectedDate ? "" : "disabled"}" style="width:100%;margin-top:12px" ${S.selectedDate ? "" : "disabled"}
    data-act="go" data-page="选择时间">下一步 · 选择时段</button>`;
}

export function remMarkup(n: number) {
  return String(n)
    .split("")
    .map(
      (ch, i) =>
        `<span class="odo-char odo-static" data-i="${i}" data-ch="${ch}"><span class="odo-strip"><i>${ch}</i></span></span>`,
    )
    .join("");
}
