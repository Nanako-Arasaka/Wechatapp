export const CONFIG = {
  APP_NAME: 'Slotify (智场通) 场地预约',
  APP_VERSION: 'v1.0.0',
  // 模拟器/开发者工具：使用本机后端（npm run start:dev 默认端口 3000）
  API_BASE_URL: 'http://127.0.0.1:3000/api',
  // 真机同局域网调试时，改成后端启动日志里打印的局域网 IP
  // 例如 http://192.168.31.127:3000/api（每次 Wi-Fi 可能不同，按需修改）
  LAN_API_BASE_URL: 'http://192.168.31.127:3000/api',
  /**
   * 生产环境后端地址（上线前必须修改）：
   * - 微信小程序线上要求 HTTPS + 已备案域名，并加入 request 合法域名白名单；
   * - 把下方地址改为真实后端域名，例如 https://venue.example.com/api；
   * - 同时在微信公众平台 → 开发管理 → 服务器域名中配置该域名。
   */
  PROD_API_BASE_URL: 'https://your-domain.example.com/api',
  /** 请求超时（毫秒）。弱网下余量刷新建议 ≥15s（F-10） */
  REQUEST_TIMEOUT_MS: 15000,
  ENABLE_OFFLINE_DEMO: false,
  DEFAULT_PAGE_SIZE: 20,
  POLL_INTERVAL: 30000,
};

/** 根据运行环境自动选择后端地址：模拟器用 127.0.0.1，真机用局域网 IP */
export function getApiBaseUrl(): string {
  try {
    const platform = wx.getSystemInfoSync().platform;
    if (platform === 'devtools') {
      return CONFIG.API_BASE_URL;
    }
  } catch (e) {
    // ignore
  }
  return CONFIG.LAN_API_BASE_URL;
}
