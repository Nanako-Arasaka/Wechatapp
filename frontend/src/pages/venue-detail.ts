import { S } from "../state/store";
import { animClass } from "../motion/transitions";

export function pageDetail() {
  const v = S.venue;
  return `<img class="hero ${animClass("场馆详情", "enter-detail")}" src="${v.image}" alt="" />
  <h1 class="detail-title ${animClass("场馆详情", "enter-detail")} d1">${v.name}</h1>
  <p class="muted ${animClass("场馆详情", "enter-detail")} d1" style="margin-bottom:14px">${v.address}<br>营业时间 ${v.hours}</p>
  <div class="card ${animClass("场馆详情", "enter-detail")} d2">
    <div class="section-title" style="margin-top:0">场馆介绍</div>
    <p class="muted">${v.desc}</p>
    <div class="chips" style="margin-top:12px">${v.facilities.map((f) => `<span class="chip">${f}</span>`).join("")}</div>
  </div>
  <div class="card ${animClass("场馆详情", "enter-detail")} d3">
    <div class="section-title" style="margin-top:0">场馆信息</div>
    <div class="fact"><span>今日余量</span><span>${v.remain} 个名额</span></div>
    <div class="fact"><span>开放时间</span><span>${v.hours}</span></div>
    <div class="fact"><span>起订价</span><span>¥${v.price}/小时</span></div>
    <div class="fact"><span>场地类型</span><span>${v.type}</span></div>
  </div>
  <div class="row" style="position:sticky;bottom:8px;margin-top:8px">
    <div class="price">¥${v.price}<small>/小时起</small></div>
    <button class="btn" style="flex:1" data-act="start-booking" data-id="${v.id}">开始预约</button>
  </div>`;
}
