import { venues } from "../data/demo";
import { S } from "../state/store";
import { animClass } from "../motion/transitions";
import { esc } from "../utils/dom";
import { venueCard } from "../components/venue-card";

export function pageList() {
  const filtered = venues.filter(
    (v) =>
      (S.type === "全部" || v.type === S.type) &&
      `${v.name}${v.type}${v.address}${v.facilities.join("")}`
        .toLowerCase()
        .includes(S.keyword.toLowerCase()),
  );
  return `
  <div class="search ${animClass("场地", "enter-quiet")}" id="searchBox" style="margin-bottom:8px">
    <svg class="search-ic home-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>
    <input id="listSearch" value="${esc(S.keyword)}" placeholder="搜索场地名称、项目或地址"
      data-search="list" />
    <button class="btn-sm" data-act="clear-search">清除</button>
  </div>
  <div class="filters ${animClass("场地", "enter-quiet")} d1">
    ${["全部", "羽毛球", "篮球", "足球", "网球", "乒乓球", "游泳"]
      .map(
        (t) =>
          `<button class="filter ${S.type === t ? "active" : ""}" data-act="filter-type" data-type="${t}">${t}</button>`,
      )
      .join("")}
  </div>
  <div id="venue-results">
    ${filtered.length ? filtered.map((v, i) => venueCard(v, i, "list")).join("") : '<div class="empty">暂无匹配场地</div>'}
  </div>`;
}
