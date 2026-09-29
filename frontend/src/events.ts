import { S } from "./state/store";
import { isPageName } from "./types";
import { $, toast } from "./utils/dom";
import { go, goBack, openVenue } from "./router";
import { render } from "./render";
import { doLogin, logout } from "./controllers/auth";
import { onTypeFilter, updateList } from "./controllers/venue-filter";
import {
  startBooking,
  selectDate,
  selectSlot,
  selectCourt,
  submitBooking,
  refreshSlots,
  refreshDays,
  loadDaySummaries,
} from "./controllers/booking";

export function bindEvents(): void {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const element = target.closest<HTMLElement>("[data-act]");
    if (!element || element.matches(":disabled")) return;
    const data = element.dataset;
    switch (data.act) {
      case "go":
        if (data.clearOrder) S.viewOrder = null;
        if (isPageName(data.page)) go(data.page);
        break;
      case "back":
        goBack();
        break;
      case "open-venue":
        openVenue(Number(data.id));
        break;
      case "start-booking":
        startBooking(Number(data.id));
        break;
      case "login":
        doLogin(data.wechat === "1");
        break;
      case "logout":
        logout();
        break;
      case "toast":
        toast(data.message || "");
        break;
      case "search-home":
        S.keyword = $<HTMLInputElement>("homeSearch").value;
        go("场地");
        break;
      case "clear-search":
        S.keyword = "";
        S.motion = "micro";
        render();
        break;
      case "quick-venue":
        S.quickVenue = Number(data.id);
        S.motion = "micro";
        render();
        break;
      case "filter-type":
        onTypeFilter(data.type || "全部");
        break;
      case "filter-orders":
        S.orderFilter = data.filter || "全部";
        if (data.go) go("订单");
        else {
          S.motion = "micro";
          render();
        }
        break;
      case "select-slot":
        if (data.disabled === "1") {
          toast(data.reason === "past" ? "该时段已过，不可预约" : "该时段已满");
        } else if (data.t) selectSlot(data.t);
        break;
      case "select-court":
        if (data.disabled === "1") toast("该场地已被占用");
        else selectCourt(Number(data.no));
        break;
      case "quick-slot":
        if (data.full === "1") toast("该时段已满");
        else startBooking(Number(data.venue));
        break;
      case "refresh-slots":
        refreshSlots();
        break;
      case "refresh-days":
        void refreshDays();
        break;
      case "select-date":
        if (data.disabled === "1") toast("该日闭馆或无可约时段");
        else if (data.date) void selectDate(data.date, data.label);
        break;
      case "back-date":
        go("选择日期");
        void loadDaySummaries();
        break;
      case "show-code": {
        const order = S.orders.find((item) => item.id === data.id);
        if (order) {
          S.viewOrder = order;
          go("预约成功");
        }
        break;
      }
      case "submit-booking":
        submitBooking();
        break;
    }
  });

  document.addEventListener("input", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const field = input.dataset.formField;
    if (field === "sid" || field === "name" || field === "phone")
      S.form[field] = input.value;
    if (input.dataset.search === "list") {
      S.keyword = input.value;
      updateList();
    }
  });

  document.addEventListener("focusin", (event) => {
    if (event.target instanceof Element)
      event.target.closest(".search")?.classList.add("focus");
  });
  document.addEventListener("focusout", (event) => {
    if (event.target instanceof Element)
      event.target.closest(".search")?.classList.remove("focus");
  });
}
