import { AdminService } from '../../../services/admin.service';
import { AuthStore } from '../../../store/auth';
import { guardAdminPage } from '../../../utils/admin-guard';

/**
 * 管理员账号开通与管理页
 * - 普通管理员：只能开通普通用户账号
 * - 超级管理员：可开通管理员账号，也可删除已有管理员账号
 */
Page({
  data: {
    isSuperAdmin: false,
    activeTab: 'create', // 'create' | 'manage'

    // 创建表单
    username: '',
    password: '',
    nickname: '',
    phone: '',
    role: 'USER',
    roleOptions: ['普通用户'],
    roleIndex: 0,
    submitting: false,

    // 管理员列表
    adminList: [] as any[],
    listLoading: false,
    listError: false,
    deletingId: '',
  },

  onShow() {
    if (!guardAdminPage()) return;
    const isSuperAdmin = AuthStore.isSuperAdmin();
    const roleOptions = isSuperAdmin ? ['普通用户', '场馆管理员'] : ['普通用户'];
    this.setData({ isSuperAdmin, roleOptions, roleIndex: 0, role: 'USER' });
    if (isSuperAdmin) {
      this.loadAdmins();
    }
  },

  switchTab(e: any) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
    if (e.currentTarget.dataset.tab === 'manage') {
      this.loadAdmins();
    }
  },

  onUsernameInput(e: any) {
    this.setData({ username: e.detail.value });
  },

  onPasswordInput(e: any) {
    this.setData({ password: e.detail.value });
  },

  onNicknameInput(e: any) {
    this.setData({ nickname: e.detail.value });
  },

  onPhoneInput(e: any) {
    const v = (e.detail.value || '').replace(/\D/g, '').slice(0, 11);
    this.setData({ phone: v });
  },

  onRoleChange(e: any) {
    const index = Number(e.detail.value);
    this.setData({
      roleIndex: index,
      role: index === 1 ? 'ADMIN' : 'USER',
    });
  },

  async onSubmit() {
    if (this.data.submitting) return;

    const { username, password, nickname, phone, role, isSuperAdmin } = this.data;

    if (!/^\w{3,32}$/.test(username)) {
      wx.showToast({ title: '账号需 3-32 位字母/数字/下划线', icon: 'none' });
      return;
    }
    if (password.length < 6 || password.length > 32) {
      wx.showToast({ title: '密码需 6-32 位', icon: 'none' });
      return;
    }
    if (nickname && nickname.length > 32) {
      wx.showToast({ title: '昵称不超过 32 字', icon: 'none' });
      return;
    }
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '手机号格式错误', icon: 'none' });
      return;
    }
    if (role === 'ADMIN' && !isSuperAdmin) {
      wx.showToast({ title: '只有超级管理员可开通管理员账号', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      await AdminService.createUser({
        username: username.trim(),
        password,
        nickname: nickname.trim() || username.trim(),
        phone: phone || undefined,
        role,
      });
      wx.showModal({
        title: '开通成功',
        content: `账号 ${username} 已创建，角色：${role === 'ADMIN' ? '场馆管理员' : '普通用户'}`,
        showCancel: false,
        success: () => {
          this.setData({ username: '', password: '', nickname: '', phone: '', roleIndex: 0, role: 'USER' });
        },
      });
    } catch (err: any) {
      // request 拦截器已弹 Toast
    } finally {
      this.setData({ submitting: false });
    }
  },

  async loadAdmins() {
    if (!this.data.isSuperAdmin || this.data.listLoading) return;
    this.setData({ listLoading: true, listError: false });
    try {
      const res = await AdminService.getUsers('ADMIN', 1, 100);
      this.setData({ adminList: res.list || [] });
    } catch (err: any) {
      console.error('加载管理员列表失败:', err);
      this.setData({ listError: true, adminList: [] });
    } finally {
      this.setData({ listLoading: false });
    }
  },

  async onDeleteAdmin(e: any) {
    const { id, username } = e.currentTarget.dataset;
    if (!id || this.data.deletingId) return;

    const res = await wx.showModal({
      title: '确认删除',
      content: `确定删除管理员账号「${username}」吗？删除后该账号将无法登录。`,
      confirmColor: '#FF4D4F',
    });
    if (!res.confirm || this.data.deletingId) return;

    this.setData({ deletingId: id });
    try {
      await AdminService.deleteUser(id);
      wx.showToast({ title: '删除成功', icon: 'success' });
      this.loadAdmins();
    } catch (err: any) {
      // request 拦截器已弹 Toast
    } finally {
      this.setData({ deletingId: '' });
    }
  },
});
