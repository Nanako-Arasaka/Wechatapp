import { AuthStore } from '../store/auth';
import { AuthService } from '../services/auth.service';

/**
 * 管理端页面权限守卫
 * 1. 先按本地缓存角色做快速拦截；
 * 2. 再异步向服务端校验最新角色（防止用户篡改本地 storage 中的 role 进入页面），
 *    校验失败会清空本地登录态并踢回登录页。
 * 注意：真正的权限校验始终以后端接口鉴权为准，这里只是体验层防护。
 */
/** 构造当前页面完整路径，用于登录成功后回跳 */
function currentPageUrl(): string {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  if (!current || !current.route) return '/pages/user/profile/profile';
  const options = (current as any).options || {};
  const qs = Object.keys(options)
    .map((k) => `${k}=${encodeURIComponent(options[k])}`)
    .join('&');
  return `/${current.route}${qs ? `?${qs}` : ''}`;
}

function kickToLogin(message: string) {
  const back = currentPageUrl();
  wx.showToast({ title: message, icon: 'none', duration: 2000 });
  setTimeout(() => {
    wx.reLaunch({
      url: `/pages/auth/login/login?redirect=${encodeURIComponent(back)}`,
    });
  }, 1500);
}

export function guardAdminPage(page?: any): boolean {
  if (!AuthStore.isAdmin()) {
    kickToLogin('暂无管理权限');
    return false;
  }

  // 异步复核服务端真实角色，发现被篡改/降权立即踢出
  verifyRoleWithServer();
  return true;
}

let verifying = false;

async function verifyRoleWithServer() {
  if (verifying) return;
  verifying = true;
  try {
    const profile = await AuthService.getProfile();
    const role = (profile as any)?.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      AuthStore.clear();
      kickToLogin('管理权限已失效，请重新登录');
    } else if (role !== AuthStore.getUser()?.role) {
      // 角色发生变更（如被降权/提权），同步最新用户信息
      AuthStore.setUser(profile as any);
    }
  } catch (err) {
    // 网络失败或 401：request 层已统一处理（401 会清空登录态）
  } finally {
    verifying = false;
  }
}
