import { S } from "../state/store";
import { animClass } from "../motion/transitions";

export function pageSuccess() {
  const o = S.viewOrder || S.orders[0];
  return `
  <div class="${animClass("预约成功", "enter-festive")}" style="text-align:center;margin:12px 0 18px">
    <div class="success-icon">✓</div>
    <div style="font-size:22px;font-weight:700;margin-top:14px">${S.viewOrder ? "入场核销码" : "预约成功！"}</div>
    <div class="muted" style="margin-top:6px">请向工作人员出示下方二维码完成核销</div>
  </div>
  <div class="ticket ${animClass("预约成功", "enter-festive")}">
    <div class="between">
      <strong>入场核销凭证</strong>
      <span class="tag">${o.status || "待使用"}</span>
    </div>
    <div class="qr" title="演示二维码"></div>
    <div class="muted" style="text-align:center;letter-spacing:1px">核销码：BK${String(o.id).slice(-8)}</div>
    <div class="dash"></div>
    <div class="fact"><span>预约场馆</span><span>${o.venue.name}</span></div>
    <div class="fact"><span>预约时段</span><span>${o.date} ${o.time}</span></div>
    <div class="fact"><span>场地</span><span>${o.court}号场</span></div>
    <div class="fact"><span>实付金额</span><span style="color:#FF4D4F">¥${o.price}</span></div>
  </div>
  <div class="row" style="margin-top:14px;flex-direction:column;gap:10px">
    <button class="btn" style="width:100%" data-act="go" data-page="订单" data-clear-order="1">返回订单列表</button>
    <button class="btn-outline" style="width:100%" data-act="go" data-page="首页" data-clear-order="1">返回首页</button>
  </div>`;
}
