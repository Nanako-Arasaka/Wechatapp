import { animClass } from "../motion/transitions";
import { S } from "../state/store";
import type { Venue } from "../types";
import { esc } from "../utils/dom";

export function venueCard(v: Venue, i = 0, mode?: "list") {
  // mode: 'list' 场地页自上而下；默认首页错落上浮
  let cls = "";
  if (mode === "list") {
    cls = animClass("场地", "card-drop");
  } else {
    cls = animClass("首页", "enter-home");
  }
  const delay =
    cls && S.motion === "enter"
      ? `style="animation-delay:${mode === "list" ? Math.min(i, 6) * 140 : Math.min(i, 5) * 70}ms"`
      : "";
  return `<article class="venue-card ${cls}" ${delay} data-act="open-venue" data-id="${v.id}">
    <img src="${v.image}" alt="${esc(v.name)}" />
    <div style="min-width:0;flex:1;display:flex;flex-direction:column">
      <h3 class="truncate">${v.name}</h3>
      <div class="muted truncate">${v.address}</div>
      <div class="chips">${v.facilities
        .slice(0, 3)
        .map((f) => `<span class="chip">${f}</span>`)
        .join("")}</div>
      <div class="between" style="margin-top:auto">
        <div class="price">¥${v.price}<small>/小时起</small></div>
        <button class="btn-sm" data-act="start-booking" data-id="${v.id}">立即预约</button>
      </div>
    </div>
  </article>`;
}
