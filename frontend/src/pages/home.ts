import { animClass } from "../motion/transitions";
import { venues } from "../data/demo";
import { venueCard } from "../components/venue-card";
import { S } from "../state/store";

export function pageHome() {
  return `<div class="home-top">
    <div class="between" style="margin-bottom:12px">
      <button class="pill active home-loc" style="background:#fff;color:var(--text);border-color:transparent;box-shadow:0 4px 14px rgba(0,0,0,.05)">
        <svg class="home-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6.5-5.2 6.5-11A6.5 6.5 0 0 0 5.5 10c0 5.8 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>
        武汉市 · 洪山区文体中心
      </button>
      <button class="pill home-notify" style="background:#fff;border-color:transparent;box-shadow:0 4px 14px rgba(0,0,0,.05)" data-act="toast" data-message="消息中心（演示）" aria-label="消息通知">
        <svg class="home-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 10a5.5 5.5 0 1 1 11 0c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>
      </button>
    </div>
    <div class="search" id="searchBox">
      <svg class="search-ic home-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>
      <input id="homeSearch" placeholder="搜索运动项目、场馆名称..." />
      <button class="btn-sm" data-act="search-home">搜索</button>
    </div>
  </div>

  <div class="banner ${animClass("首页", "enter-home")}" data-act="open-venue" data-id="1">
    <img src="${venues[0].image}" alt="" />
    <div class="shade"></div>
    <div class="copy">
      <span class="tag" style="background:rgba(255,255,255,.28);color:#fff">热门推荐</span>
      <h2>星羽羽毛球馆 A馆全新升级</h2>
      <p>国家级比赛标准木地板 · 恒温中央空调</p>
    </div>
  </div>

  <div class="advice ${animClass("首页", "enter-home")} d1">
    <strong>今日错峰建议</strong>
    <p class="muted">今日 18:00-21:00 为晚高峰，余量紧张。建议选择 14:00-17:00 错峰运动，体验更舒适。</p>
  </div>

  <div class="section-title">热门推荐场馆</div>
  ${venues
    .slice(0, 3)
    .map((venue, index) => venueCard(venue, index))
    .join("")}

  <div class="section-title">
    <span>今日时段实时余量</span>
    <button class="btn-sm" style="margin-left:auto;background:#F4F6F9;color:var(--text2);font-weight:600" data-act="refresh-slots" title="刷新余量">
      <span class="ic-refresh">⟳</span> 刷新
    </button>
  </div>
  <div class="hscroll" style="margin-bottom:10px">
    ${venues.map((v) => `<button class="pill ${S.quickVenue === v.id ? "active" : ""}" data-act="quick-venue" data-id="${v.id}">${v.name.replace(/\s*\(.*\)/, "")}</button>`).join("")}
  </div>
  <div class="hscroll">
    ${["09:00", "10:00", "14:00", "15:00", "18:00", "19:00"]
      .map((t, i) => {
        const full = i === 5;
        return `<button class="slot-mini ${full ? "full" : ""}" data-act="quick-slot" data-full="${full ? 1 : 0}" data-venue="${S.quickVenue}">
        <strong>${t}</strong>${full ? "满" : "✓ 有空"}
      </button>`;
      })
      .join("")}
  </div>`;
}
