import { animClass } from "../motion/transitions";
import { S } from "../state/store";
import { esc } from "../utils/dom";

export function pageFill() {
  return `
  <div class="card ${animClass("填写信息", "enter-panel")}">
    <div class="section-title" style="margin-top:0">订单摘要</div>
    <div class="fact"><span>场馆</span><span>${S.venue.name}</span></div>
    <div class="fact"><span>场地</span><span>${S.court}号场</span></div>
    <div class="fact"><span>时间</span><span>${S.slot}</span></div>
    <div class="fact"><span>合计</span><span style="color:#FF4D4F;font-size:18px">¥${S.venue.price}</span></div>
  </div>
  <div class="card ${animClass("填写信息", "enter-panel")} d1">
    <div class="section-title" style="margin-top:0">联系方式（入场核验）</div>
    <div class="field"><label>学号</label><input id="f-sid" placeholder="请输入学号" value="${esc(S.form.sid)}" data-form-field="sid" /></div>
    <div class="field"><label>姓名</label><input id="f-name" placeholder="请输入真实姓名" value="${esc(S.form.name)}" data-form-field="name" /></div>
    <div class="field"><label>手机号</label><input id="f-phone" placeholder="请输入手机号" value="${esc(S.form.phone)}" data-form-field="phone" /></div>
  </div>
  <button class="btn" style="width:100%;margin-top:8px" data-act="submit-booking">提交预约 · 模拟支付</button>
  <p class="muted" style="margin-top:10px">预览模式不会产生真实订单；完整流程请在微信开发者工具中运行小程序。</p>`;
}
