import "./styles/motion-demo.css";
import { $ } from "./utils/dom";

// Search focus
const searchBox = $("searchBox");
const searchInput = $("searchInput");
searchInput.addEventListener("focus", () => searchBox.classList.add("focus"));
searchInput.addEventListener("blur", () => searchBox.classList.remove("focus"));

// Generic select groups
function bindSelect(id: string, sel: string) {
  const root = $(id);
  root.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;
    const el = e.target.closest(sel);
    if (!el || el.classList.contains("disabled")) return;
    root
      .querySelectorAll<HTMLElement>(sel)
      .forEach((n) => n.classList.remove("selected", "active"));
    el.classList.add(id === "chips" || id === "vpills" ? "active" : "selected");
  });
}
bindSelect("chips", ".chip");
bindSelect("vpills", ".vpill");
bindSelect("slots", ".slot");
bindSelect("courtSlots", ".slot");

// Stagger replay
function replay(id: string) {
  const root = $(id);
  root.style.animation = "none";
  root.querySelectorAll<HTMLElement>(":scope > *").forEach((el) => {
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";
  });
  void root.offsetWidth;
}
$("replayStagger").addEventListener("click", () => replay("staggerList"));
$("replaySuccess").addEventListener("click", () => replay("successDemo"));

// Sheet
const mask = $("mask");
const sheet = $("sheet");
function openSheet() {
  mask.classList.add("show");
  sheet.classList.add("show");
}
function closeSheet() {
  mask.classList.remove("show");
  sheet.classList.remove("show");
}
$("openSheet").addEventListener("click", openSheet);
$("closeSheet").addEventListener("click", closeSheet);
mask.addEventListener("click", closeSheet);
