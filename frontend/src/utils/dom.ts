export function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element: #${id}`);
  return element as T;
}

export const esc = (s: unknown): string =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      (
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }) as Record<string, string>
      )[c],
  );

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export const toast = (msg: string) => {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
};
