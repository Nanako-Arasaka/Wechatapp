import { S } from "../state/store";
import { toast } from "../utils/dom";
import { go } from "../router";

export function doLogin(wx = false) {
  S.loggedIn = true;
  toast(wx ? "微信登录成功" : "登录成功");
  go("首页");
}

export function logout() {
  S.loggedIn = false;
  toast("已退出登录");
  go("登录");
}
