import { S } from "./state/store";
import { $ } from "./utils/dom";
import { render } from "./render";
import { venues } from "./data/demo";
import type { PageName } from "./types";

export function go(page: PageName, direction?: "back") {
  const back = direction === "back";
  S.page = page;
  S.motion = "enter";
  // 每次切到场地 Tab 都重播「自上而下」列表加载，避免只在第一次可见
  if (page === "场地") {
    delete S.entered["场地"];
  }
  // Tab / 页面差异化切入：首页上浮、场地下落、订单极轻、我的轻缩放
  if (back) {
    S._pageSwap = "page-swap-back";
  } else if (page === "首页") {
    S._pageSwap = "swap-home";
  } else if (page === "场地") {
    S._pageSwap = "swap-list";
  } else if (page === "订单") {
    S._pageSwap = "swap-orders";
  } else if (page === "我的") {
    S._pageSwap = "swap-profile";
  } else {
    S._pageSwap = "page-swap-in";
  }
  // 动画时长更久，窗口拉长避免中途被重绘掐掉
  S._pageSwapAt = Date.now();
  $("scroll").scrollTop = 0;
  render();
}

export function goBack() {
  const map: Partial<Record<PageName, PageName>> = {
    场馆详情: "场地",
    选择日期: "场馆详情",
    选择时间: "选择日期",
    选场地: "选择时间",
    填写信息: "选场地",
    预约成功: "订单",
  };
  go(map[S.page] || "首页", "back");
}

export function openVenue(id: number) {
  S.venue = venues.find((v) => v.id === id) || venues[0];
  go("场馆详情");
}
