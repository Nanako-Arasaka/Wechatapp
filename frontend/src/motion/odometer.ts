export function mountOdometer(root: HTMLElement, text: string) {
  root.innerHTML = text
    .split("")
    .map(
      (ch, i) =>
        `<span class="odo-char odo-static" data-i="${i}" data-ch="${ch}"><span class="odo-strip"><i>${ch}</i></span></span>`,
    )
    .join("");
}

export function rollOdometer(
  root: HTMLElement,
  oldText: string,
  newText: string,
  timeAdvancing: boolean,
) {
  const len = Math.max(oldText.length, newText.length);
  const oldP = oldText.padStart(len, " ").split("");
  const newP = newText.padStart(len, " ").split("");
  let delay = 0;

  for (let i = 0; i < len; i++) {
    const o = oldP[i] || " ";
    const n = newP[i] || " ";
    const cell = root.querySelector<HTMLElement>(`[data-i="${i}"]`);
    if (!cell) continue;

    if (o === n) continue;

    // 数字位才滚；冒号/短横保持瞬切（更干净）
    if (!/\d/.test(o) && !/\d/.test(n)) {
      cell.innerHTML = `<span class="odo-strip"><i>${n}</i></span>`;
      cell.dataset.ch = n;
      continue;
    }

    // 结构：[old, new] 一条 strip，按方向 translateY
    // 上翻（前进）：strip 里 old 在上、new 在下，滚到 -50% → new 露出
    // 下翻（回退）：new 在上、old 在下，初始 -50%，滚到 0 → new 露出
    const goingUp = timeAdvancing;
    const html = goingUp
      ? `<span class="odo-strip"><i>${o}</i><i>${n}</i></span>`
      : `<span class="odo-strip"><i>${n}</i><i>${o}</i></span>`;

    cell.classList.remove("odo-static");
    cell.classList.add("rolling", goingUp ? "rolling-up" : "rolling-down");
    cell.innerHTML = html;
    cell.dataset.ch = n;

    const strip = cell.querySelector<HTMLElement>(".odo-strip");
    if (!strip) continue;
    if (!goingUp) {
      // 回退：先停在上半（显示 old 在下半...）—— 简化：两种方向都用「新字滑入」
      // 回退时 new 在上：从 -50%（露 old）滚到 0（露 new）
      strip.style.transform = "translateY(-50%)";
    } else {
      strip.style.transform = "translateY(0)";
    }

    // 轻微错峰，苹果卷轴手感（每位 +12ms，总时长仍 < 300ms + 12*n）
    const d = Math.min(delay, 60);
    delay += 12;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        strip.style.transitionDelay = d + "ms";
        strip.style.transform = goingUp ? "translateY(-50%)" : "translateY(0)";
      });
    });

    // 动画结束后固化为静态单字符
    setTimeout(() => {
      cell.classList.remove("rolling", "rolling-up", "rolling-down");
      cell.classList.add("odo-static");
      cell.innerHTML = `<span class="odo-strip"><i>${n}</i></span>`;
    }, 360 + d);
  }
}
