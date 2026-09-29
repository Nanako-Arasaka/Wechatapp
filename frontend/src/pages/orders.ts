import { S } from "../state/store";
import { animClass } from "../motion/transitions";

export function pageOrders() {
  const tabs = ["全部", "待付款", "待使用", "已完成", "已取消"];
  const list = S.orders.filter(
    (o) => S.orderFilter === "全部" || o.status === S.orderFilter,
  );
  return `
  <div class="order-tabs ${animClass("订单", "enter-quiet")}">
    ${tabs.map((t) => `<button class="${S.orderFilter === t ? "active" : ""}" data-act="filter-orders" data-filter="${t}">${t}</button>`).join("")}
  </div>
  ${
    list.length
      ? list
          .map(
            (o) => `
    <div class="card ${animClass("订单", "enter-quiet")}">
      <div class="between" style="margin-bottom:12px">
        <span class="muted">订单号：${o.id}</span>
        <strong style="color:${o.status === "待使用" ? "var(--success)" : o.status === "已完成" ? "var(--text3)" : "var(--warning)"}">${o.status}</strong>
      </div>
      <div class="row" style="align-items:flex-start">
        <img src="${o.venue.image}" style="width:72px;height:68px;border-radius:10px;object-fit:cover" alt="" />
        <div style="min-width:0;flex:1">
          <div style="font-weight:700" class="truncate">${o.venue.name}</div>
          <div class="muted">${o.date} ${o.time} · ${o.court}号场</div>
        </div>
      </div>
      <div class="between" style="margin-top:12px;padding-top:12px;border-top:1px solid #F0F1F3">
        <span class="muted">总计 <b class="price" style="font-size:16px">¥${o.price}</b></span>
        ${
          o.status === "待使用"
            ? `<button class="btn-sm" data-act="show-code" data-id="${o.id}">出示核销码</button>`
            : o.status === "待付款"
              ? `<button class="btn-sm" data-act="toast" data-message="预览模式不发起支付">去支付</button>`
              : `<button class="btn-sm" style="background:#F4F6F9;color:var(--text2)" data-act="start-booking" data-id="${o.venue.id}">再次预约</button>`
        }
      </div>
    </div>`,
          )
          .join("")
      : '<div class="empty">暂无相关订单</div>'
  }`;
}
