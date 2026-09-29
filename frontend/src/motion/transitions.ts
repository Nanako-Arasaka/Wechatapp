import { S } from "../state/store";
import type { PageName } from "../types";

export function animClass(name: PageName, kind: string): string {
  if (S.motion === "micro") return "";
  if (S.motion === "none") return "";
  if (!S.entered[name]) return kind;
  return "";
}

export function summaryAnimClass() {
  if (S._summaryFirst) {
    S._summaryFirst = false;
    return "summary-first";
  }
  return "";
}

export function clearPageSwap() {
  S._pageSwap = "";
  S._pageSwapAt = 0;
}
