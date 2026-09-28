import { CONFIG } from './config';
import { AuthStore } from './store/auth';
import { AuthService } from './services/auth.service';

App({
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    targetOrderStatus: null as string | null,
    targetVenueKeyword: null as string | null,
  },

  onLaunch() {
    console.log('🚀 Slotify (智场通) 启动中...');

    // 1. 检查本地是否有已登录的用户会话
    const token = AuthStore.getToken();
    const user = AuthStore.getUser();

    if (token && user) {
      this.globalData.userInfo = user;
      this.globalData.isLoggedIn = true;
      console.log(`👤 恢复已登录用户会话: ${user.nickname} [${user.role}]`);

      // 后台静默校验并刷新最新用户信息
      AuthService.getProfile()
        .then((profile) => {
          this.globalData.userInfo = profile;
          AuthStore.setUser(profile);
        })
        .catch(() => {
          // Token 失效时清除过期的登录态
          AuthStore.clear();
          this.globalData.userInfo = null;
          this.globalData.isLoggedIn = false;
        });
    } else {
      // 默认保持未登录状态
      this.globalData.userInfo = null;
      this.globalData.isLoggedIn = false;
      console.log('👤 进入小程序默认未登录状态，等待用户自主选择角色登录');
    }
  },
});
