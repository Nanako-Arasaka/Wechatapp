import { AuthStore } from '../store/auth';

/**
 * 构造当前页面的完整路径（含 query），用于登录成功后回跳
 */
function currentPageUrl(): string {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  if (!current || !current.route) return '/pages/index/index';
  const options = (current as any).options || {};
  const qs = Object.keys(options)
    .map((k) => `${k}=${encodeURIComponent(options[k])}`)
    .join('&');
  return `/${current.route}${qs ? `?${qs}` : ''}`;
}

/**
 * 需要登录的页面守卫：
 * - 已登录返回 true，页面正常渲染；
 * - 未登录提示后跳登录页，并携带当前页地址作为回跳目标（登录成功自动返回）。
 */
export function guardLoginPage(): boolean {
  if (AuthStore.getToken()) return true;

  const back = currentPageUrl();
  wx.showToast({ title: '请先登录', icon: 'none', duration: 1200 });
  setTimeout(() => {
    wx.reLaunch({
      url: `/pages/auth/login/login?redirect=${encodeURIComponent(back)}`,
    });
  }, 1000);
  return false;
}
