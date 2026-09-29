import { S } from "../state/store";
import { venues } from "../data/demo";
import { $ } from "../utils/dom";
import { venueCard } from "../components/venue-card";
import { render } from "../render";
import { clearPageSwap } from "../motion/transitions";

let filterVersion = 0;

export function updateList() {
  S.motion = "micro";
  const filtered = venues.filter(
    (v) =>
      (S.type === "全部" || v.type === S.type) &&
      `${v.name}${v.type}${v.address}${v.facilities.join("")}`
        .toLowerCase()
        .includes(S.keyword.toLowerCase()),
  );
  $("venue-results").innerHTML = filtered.length
    ? filtered.map((v, i) => venueCard(v, i, "list")).join("")
    : '<div class="empty">暂无匹配场地</div>';
}

export function syncFilterTabs() {
  document.querySelectorAll<HTMLElement>(".filters .filter").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-type") === S.type);
  });
}

export function onTypeFilter(nextType: string) {
  if (nextType === S.type) return;
  const prev = S.type;
  const container = document.getElementById("venue-results");
  if (!container) {
    S.type = nextType;
    S.motion = "micro";
    render();
    return;
  }

  const version = ++filterVersion;
  S.type = nextType;
  syncFilterTabs();
  const isCurrent = () =>
    version === filterVersion && container.isConnected && S.page === "场地";

  clearPageSwap();
  const matchIds = new Set(
    venues
      .filter((v) => nextType === "全部" || v.type === nextType)
      .map((v) => String(v.id)),
  );

  // 模式 A：全部 → 具体类型（保留项 FLIP 上移，其余淡出）
  if (prev === "全部" && nextType !== "全部") {
    const cards = Array.from(
      container.querySelectorAll<HTMLElement>(".venue-card"),
    );
    const firstRects = new Map<string | null, DOMRect>();
    cards.forEach((c) => {
      firstRects.set(c.getAttribute("data-id"), c.getBoundingClientRect());
    });

    const outs = cards.filter(
      (c) => !matchIds.has(c.getAttribute("data-id") || ""),
    );

    // 关键：先卸掉入场 animation（fill:both 会压住 opacity 过渡，淡出会被“吞掉”）
    cards.forEach((c) => {
      c.classList.remove(
        "card-drop",
        "enter-home",
        "fade-in-item",
        "flip-card",
      );
      c.style.animation = "none";
      c.style.opacity = "";
      c.style.transform = "";
      c.style.transition = "";
    });
    void container.offsetWidth; // reflow，确保 animation 停掉

    // 再播淡出（用 inline style 保证 transition 一定生效）
    outs.forEach((c) => {
      c.style.transition =
        "opacity 720ms cubic-bezier(0.4, 0, 0.2, 1), transform 720ms cubic-bezier(0.4, 0, 0.2, 1)";
      c.style.opacity = "1";
      c.style.transform = "translateY(0) scale(1)";
      c.style.pointerEvents = "none";
      void c.offsetWidth;
      c.style.opacity = "0";
      c.style.transform = "translateY(14px) scale(0.97)";
    });

    // 等淡出基本结束再换列表并 FLIP
    setTimeout(() => {
      if (!isCurrent()) return;
      S.type = nextType;
      S.motion = "none";
      S._pageSwap = "";
      render();
      syncFilterTabs();

      const root = $("venue-results");
      if (!root) return;
      const newCards = Array.from(
        root.querySelectorAll<HTMLElement>(".venue-card"),
      );
      newCards.forEach((c) => {
        const id = c.getAttribute("data-id");
        const prevRect = firstRects.get(id);
        const now = c.getBoundingClientRect();
        if (!prevRect) {
          c.classList.add("fade-in-item");
          return;
        }
        const dx = prevRect.left - now.left;
        const dy = prevRect.top - now.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        c.classList.add("flip-card");
        c.style.transition = "none";
        c.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(() => {
          c.style.transition = "transform 780ms cubic-bezier(0.22, 1, 0.36, 1)";
          c.style.transform = "translate(0, 0)";
          setTimeout(() => {
            c.style.transition = "";
            c.style.transform = "";
            c.classList.remove("flip-card");
          }, 800);
        });
      });
    }, 720);
    return;
  }

  // 模式 C：具体类型 → 全部（保留卡 FLIP 回原位，其余淡入）
  if (prev !== "全部" && nextType === "全部") {
    const cards = Array.from(
      container.querySelectorAll<HTMLElement>(".venue-card"),
    );
    const firstRects = new Map<string | null, DOMRect>();
    cards.forEach((c) => {
      firstRects.set(c.getAttribute("data-id"), c.getBoundingClientRect());
    });
    setTimeout(() => {
      if (!isCurrent()) return;
      S.type = nextType;
      S.motion = "none";
      S._pageSwap = "";
      render();
      syncFilterTabs();

      const root = $("venue-results");
      if (!root) return;
      const newCards = Array.from(
        root.querySelectorAll<HTMLElement>(".venue-card"),
      );
      newCards.forEach((c) => {
        const id = c.getAttribute("data-id");
        const prevRect = firstRects.get(id);
        const now = c.getBoundingClientRect();
        if (!prevRect) {
          // 之前被滤掉的卡：慢速淡入
          c.classList.add("fade-in-item");
          return;
        }
        const dx = prevRect.left - now.left;
        const dy = prevRect.top - now.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        c.classList.add("flip-card");
        c.style.transition = "none";
        c.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(() => {
          c.style.transition = "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)";
          c.style.transform = "translate(0, 0)";
          setTimeout(() => {
            c.style.transition = "";
            c.style.transform = "";
            c.classList.remove("flip-card");
          }, 540);
        });
      });
    }, 180);
    return;
  }

  // 模式 B：类型 ↔ 类型：整列交叉淡入淡出（更慢）
  container.classList.add("list-fade-out");
  setTimeout(() => {
    if (!isCurrent()) return;
    S.type = nextType;
    S.motion = "none";
    S._pageSwap = "";
    render();
    syncFilterTabs();
    const root = $("venue-results");
    if (!root) return;
    root.classList.remove("list-fade-out");
    root.classList.add("list-fade-in");
    setTimeout(() => root.classList.remove("list-fade-in"), 720);
  }, 460);
}
