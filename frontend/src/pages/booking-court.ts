import { S } from "../state/store";
import { animClass } from "../motion/transitions";

export function pageCourt() {
  const count = Math.min(S.venue.remain + 3, 12);
  return `
  <div class="card ${animClass("选场地", "enter-panel")}">
    <div class="section-title" style="margin-top:0">已选时段</div>
    <div class="fact"><span>场馆</span><span>${S.venue.name}</span></div>
    <div class="fact"><span>日期</span><span>${new Date().toLocaleDateString("sv-SE")}</span></div>
    <div class="fact"><span>时间段</span><span>${S.slot || "--"}</span></div>
    <div class="fact"><span>单价</span><span style="color:var(--warning)">¥${S.venue.price}</span></div>
  </div>
  <div class="card ${animClass("选场地", "enter-panel")} d1">
    <div class="between" style="margin-bottom:12px">
      <div class="section-title" style="margin:0">请选择场地</div>
      <div class="row" style="gap:6px">
        <span class="chip" style="background:var(--success-light);color:var(--success)">✓ 可预约</span>
        <span class="chip">满 / 占用</span>
      </div>
    </div>
    <div class="grid3">
      ${Array.from({ length: count }, (_, i) => {
        const no = i + 1,
          disabled = i === 1 || i === 5;
        return `<button class="cell ${disabled ? "disabled" : ""} ${S.court === no ? "selected" : ""}"
          data-act="select-court" data-no="${no}" data-disabled="${disabled ? 1 : 0}">
          <div class="t">${no}号场</div>
          <div class="s">${disabled ? "× 已占用" : "✓ 可预约"}</div>
        </button>`;
      }).join("")}
    </div>
  </div>
  <button class="btn ${S.court ? "" : "disabled"}" style="width:100%;margin-top:8px" ${S.court ? "" : "disabled"}
    data-act="go" data-page="填写信息">下一步</button>`;
}
