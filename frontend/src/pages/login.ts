import { animClass } from "../motion/transitions";

export function pageLogin() {
  return `<div class="login-hero ${animClass("登录", "enter-login")}">
    <div class="tag" style="background:rgba(255,255,255,.22);color:#fff">智场通 SmartVenue</div>
    <h1>校园场馆预约</h1>
    <p>真实场地库存 · 防超卖 · 扫码入场<br>登录后即可预约羽毛球、篮球、游泳等场地</p>
  </div>
  <div class="card login-card ${animClass("登录", "enter-login")} d1">
    <div class="section-title" style="margin-top:0">学工号登录</div>
    <input id="login-user" placeholder="请输入学工号 / 账号" value="user" />
    <input id="login-pass" type="password" placeholder="请输入密码" value="user123" />
    <button class="btn" style="width:100%;margin-top:4px" data-act="login">登录</button>
    <button class="btn-outline" style="width:100%;margin-top:10px" data-act="login" data-wechat="1">微信一键登录（演示）</button>
    <p class="muted" style="margin-top:14px">演示账号：user/user123 · admin/admin123<br>正式环境由后端返回角色，前端不暴露密码。</p>
  </div>`;
}
