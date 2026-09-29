import { S } from "./state/store";
import { rootTabs } from "./routes";
import { $, esc } from "./utils/dom";
import { pageLogin } from "./pages/login";
import { pageHome } from "./pages/home";
import { pageList } from "./pages/venues";
import { pageDetail } from "./pages/venue-detail";
import { pageSelectDate } from "./pages/booking-date";
import { pageBooking } from "./pages/booking-time";
import { pageCourt } from "./pages/booking-court";
import { pageFill } from "./pages/booking-contact";
import { pageSuccess } from "./pages/booking-success";
import { pageOrders } from "./pages/orders";
import { pageProfile } from "./pages/profile";
import { TAB_ICONS } from "./components/tab-icons";
import type { PageName } from "./types";

export function render() {
  const page = S.page;
  const isRoot = rootTabs.some((tab) => tab === page);
  $("nav").innerHTML =
    `${isRoot || page === "登录" ? "" : '<button class="back" aria-label="返回" data-act="back">‹</button>'}${
      page === "登录"
        ? "登录"
        : page === "首页"
          ? "智场通"
          : page === "场馆详情"
            ? esc(S.venue.name.replace(/\s*\(.*\)/, ""))
            : page
    }`;
  const views: Record<PageName, () => string> = {
    登录: pageLogin,
    首页: pageHome,
    场地: pageList,
    场馆详情: pageDetail,
    选择日期: pageSelectDate,
    选择时间: pageBooking,
    选场地: pageCourt,
    填写信息: pageFill,
    预约成功: pageSuccess,
    订单: pageOrders,
    我的: pageProfile,
  };
  // 切页动画类：在动画窗口内跨多次 render 保留，避免 loading 重绘打断
  let swap = "";
  if (S._pageSwap) {
    const alive = Date.now() - (S._pageSwapAt || 0) < 800;
    swap = alive ? ` ${S._pageSwap}` : "";
    if (!alive) {
      S._pageSwap = "";
      S._pageSwapAt = 0;
    }
  }
  $("content").innerHTML =
    `<div class="page-body${swap}">${(views[page] || pageHome)()}</div>`;
  // 强制重启动画（同帧二次 render 时也要能播）
  const body = $("content").querySelector<HTMLElement>(".page-body");
  if (body && swap) {
    body.style.animation = "none";
    void body.offsetWidth;
    body.style.animation = "";
  }
  $("tabbar").innerHTML = rootTabs
    .map((t) => {
      const show = !(!S.loggedIn && page === "登录");
      return show
        ? `<button class="${page === t ? "active" : ""}" data-act="go" data-page="${t}">
      <span class="ic">${TAB_ICONS[t] || ""}</span>${t}</button>`
        : "";
    })
    .join("");
  // 首次入场：loading 骨架不算「已看过」，要等真实内容那一帧
  const stillLoading =
    (page === "选择日期" && S.daysLoading) ||
    (page === "选择时间" && S.slotsLoading);
  if (S.motion === "enter" && !stillLoading) {
    S.entered[page] = true;
    S.motion = "none";
  }
}
