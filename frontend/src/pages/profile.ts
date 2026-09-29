import { animClass } from "../motion/transitions";
import { S } from "../state/store";

export function pageProfile() {
  return `
  <div class="profile-head ${animClass("我的", "enter-quiet")}">
    <div class="row">
      <div class="avatar">👤</div>
      <div>
        <div style="font-size:18px;font-weight:700">演示用户</div>
        <div style="opacity:.9;font-size:12px">学工号 ${S.form.sid || "2024001"} · 普通用户</div>
      </div>
    </div>
    <div class="stats">
      <div><strong>${S.orders.filter((o) => o.status === "待使用").length}</strong><span>待使用预约</span></div>
      <div><strong>${S.orders.length}</strong><span>累计预约</span></div>
      <div><strong>${S.orders.length}</strong><span>预约时长(h)</span></div>
    </div>
  </div>
  <div class="card ${animClass("我的", "enter-quiet")} d1" style="margin-top:14px">
    <div class="section-title" style="margin-top:0">我的预约</div>
    <div class="row" style="justify-content:space-between;text-align:center">
      ${[
        [
          "待付款",
          `<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/></svg>`,
          "待付款",
        ],
        [
          "待使用",
          `<svg viewBox="0 0 24 24"><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z"/><path d="M12 8v8"/></svg>`,
          "待使用",
        ],
        [
          "已完成",
          `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.2 2.3 2.3 4.7-5"/></svg>`,
          "已完成",
        ],
        [
          "退改/取消",
          `<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 5v4h4"/></svg>`,
          "已取消",
        ],
      ]
        .map(
          ([t, svg, filter]) =>
            `<button class="prof-shortcut" data-act="filter-orders" data-filter="${filter}" data-go="1">
          <span class="prof-ic">${svg}</span>${t}
        </button>`,
        )
        .join("")}
    </div>
  </div>
  <div class="card ${animClass("我的", "enter-quiet")} d2">
    <button class="menu-row" data-act="toast" data-message="消息通知中心（演示）">消息通知中心 <span class="muted">›</span></button>
    <button class="menu-row" data-act="go" data-page="订单">我的入场核销码 <span class="muted">›</span></button>
    <button class="menu-row" data-act="toast" data-message="感谢反馈！">意见反馈与客服 <span class="muted">›</span></button>
    <button class="menu-row" data-act="toast" data-message="智场通 SmartVenue v2">关于智场通 <span class="muted">›</span></button>
    <button class="menu-row" data-act="logout">退出登录 <span class="muted">›</span></button>
  </div>`;
}
