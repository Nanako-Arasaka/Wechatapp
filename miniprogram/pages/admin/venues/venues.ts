import { AdminService } from '../../../services/admin.service';
import { guardAdminPage } from '../../../utils/admin-guard';
import { formatDate } from '../../../utils/format';

const PAGE_SIZE = 20;

Page({
  data: {
    venues: [] as any[],
    keyword: '',
    page: 1,
    hasMore: true,
    loading: false,
    loadError: false,
    typeOptions: ['羽毛球', '篮球', '网球', '乒乓球', '足球', '游泳', '健身', '综合馆'],
    typeKeys: ['BADMINTON', 'BASKETBALL', 'TENNIS', 'TABLE_TENNIS', 'FOOTBALL', 'SWIMMING', 'FITNESS', 'MULTI'],
    typeIndex: 0,
    showEditModal: false,
    showTimePreviewModal: false,
    showBulkTimeModal: false,
    showCloseRangeModal: false,
    isEditing: false,
    editingId: '',
    closeRangeVenueId: '',
    closeRangeVenueName: '',
    timePreview: null as any,
    form: {
      name: '',
      type: 'BADMINTON',
      description: '',
      basePriceYuan: '35',
      capacity: '10',
      openTime: '08:00',
      closeTime: '22:00',
      address: '文体中心综合馆 2层',
      coverImage: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600',
    },
    bulkTimeForm: {
      openTime: '08:00',
      closeTime: '22:00',
    },
    closeRangeForm: {
      startDate: '',
      endDate: '',
      reason: '临时维护保养',
    },
    formErrors: {} as Record<string, string>, // 表单字段级 inline 错误提示
    submitting: false,
  },
  _loadId: 0,

  onShow() {
    if (!guardAdminPage()) return;
    this.setData({ page: 1, venues: [], hasMore: true });
    this.loadVenues();
  },

  onPullDownRefresh() {
    this.setData({ page: 1, venues: [], hasMore: true });
    this.loadVenues().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadVenues(true);
    }
  },

  onInputKeyword(e: any) {
    this.setData({ keyword: e.detail.value });
  },

  onSearchConfirm() {
    this.setData({ page: 1, venues: [], hasMore: true });
    this.loadVenues();
  },

  async loadVenues(append: boolean = false) {
    if (append && this.data.loading) return;
    const loadId = ++this._loadId;
    this.setData({ loading: true, loadError: false });
    try {
      const page = append ? this.data.page + 1 : 1;
      const res: any = await AdminService.getVenues(page, PAGE_SIZE, this.data.keyword || undefined);
      if (loadId !== this._loadId) return;
      const list = res.list || [];
      this.setData({
        venues: append ? [...this.data.venues, ...list] : list,
        page,
        hasMore: list.length >= PAGE_SIZE,
      });
    } catch (err: any) {
      if (loadId !== this._loadId) return;
      this.setData({ loadError: true });
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    } finally {
      if (loadId === this._loadId) this.setData({ loading: false });
    }
  },

  openAddModal() {
    this.setData({
      showEditModal: true,
      isEditing: false,
      editingId: '',
      typeIndex: 0,
      formErrors: {},
      form: {
        name: '',
        type: 'BADMINTON',
        description: '',
        basePriceYuan: '35',
        capacity: '10',
        openTime: '08:00',
        closeTime: '22:00',
        address: '文体中心综合馆',
        coverImage: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600',
      },
    });
  },

  openEditModal(e: any) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      showEditModal: true,
      isEditing: true,
      editingId: item.id,
      typeIndex: Math.max(0, this.data.typeKeys.indexOf(item.type)),
      formErrors: {},
      form: {
        name: item.name,
        type: item.type,
        description: item.description || '',
        basePriceYuan: String(item.basePrice / 100),
        capacity: String(item.capacity),
        openTime: item.openTime,
        closeTime: item.closeTime,
        address: item.address,
        coverImage: item.coverImage,
      },
    });
  },

  closeEditModal() {
    this.setData({ showEditModal: false, showTimePreviewModal: false, timePreview: null });
  },

  onTypeChange(e: any) {
    const typeIndex = Number(e.detail.value);
    const type = this.data.typeKeys[typeIndex];
    if (type) this.setData({ typeIndex, 'form.type': type });
  },

  onFormInput(e: any) {
    const field = e.currentTarget.dataset.field;
    const val = e.detail.value;
    // 输入时清除该字段的 inline 错误
    const formErrors = { ...this.data.formErrors };
    delete formErrors[field];
    this.setData({ [`form.${field}`]: val, formErrors });
  },

  onTimeChange(e: any) {
    const field = e.currentTarget.dataset.field;
    const formErrors = { ...this.data.formErrors };
    delete formErrors.timeRange;
    this.setData({ [`form.${field}`]: e.detail.value, formErrors });
  },

  async previewTimeChange() {
    const f = this.data.form;
    if (!this.validateTimeRange(f.openTime, f.closeTime)) return;
    try {
      const res: any = await AdminService.previewTimeChange(this.data.editingId, f.openTime, f.closeTime);
      this.setData({ timePreview: res, showTimePreviewModal: true });
    } catch (err: any) {
      wx.showToast({ title: err.message || '预览失败', icon: 'none' });
    }
  },

  closeTimePreviewModal() {
    this.setData({ showTimePreviewModal: false });
  },

  // ===== 批量调整营业时间 =====
  openBulkTimeModal() {
    this.setData({
      showBulkTimeModal: true,
      bulkTimeForm: { openTime: '08:00', closeTime: '22:00' },
    });
  },

  closeBulkTimeModal() {
    this.setData({ showBulkTimeModal: false });
  },

  onBulkTimeChange(e: any) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`bulkTimeForm.${field}`]: e.detail.value });
  },

  async submitBulkTime() {
    if (this.data.submitting) return;
    const { openTime, closeTime } = this.data.bulkTimeForm;
    if (!this.validateTimeRange(openTime, closeTime)) return;
    this.setData({ submitting: true });
    try {
      await AdminService.batchUpdateTime(openTime, closeTime);
      wx.showToast({ title: '已批量调整营业时间', icon: 'success' });
      this.closeBulkTimeModal();
      this.setData({ page: 1, venues: [], hasMore: true });
      this.loadVenues();
    } catch (err: any) {
      wx.showToast({ title: err.message || '批量调整失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  // ===== 临时闭馆区间 =====
  openCloseRangeModal(e: any) {
    const todayStr = formatDate(new Date());
    this.setData({
      showCloseRangeModal: true,
      closeRangeVenueId: e.currentTarget.dataset.id,
      closeRangeVenueName: e.currentTarget.dataset.name,
      closeRangeForm: { startDate: todayStr, endDate: todayStr, reason: '临时维护保养' },
    });
  },

  closeCloseRangeModal() {
    this.setData({ showCloseRangeModal: false });
  },

  onCloseRangeInput(e: any) {
    const field = e.currentTarget.dataset.field;
    const val = e.detail.value;
    this.setData({ [`closeRangeForm.${field}`]: val });
  },

  onCloseRangeDateChange(e: any) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`closeRangeForm.${field}`]: e.detail.value });
  },

  async submitCloseRange() {
    const { startDate, endDate, reason } = this.data.closeRangeForm;
    if (!startDate || !endDate) {
      wx.showToast({ title: '请选择开始和结束日期', icon: 'none' });
      return;
    }
    if (endDate < startDate) {
      wx.showToast({ title: '结束日期不能早于开始日期', icon: 'none' });
      return;
    }
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      await AdminService.setClosedDate(this.data.closeRangeVenueId, startDate, endDate, reason);
      wx.showToast({ title: '已设置临时闭馆', icon: 'success' });
      this.closeCloseRangeModal();
      this.loadVenues();
    } catch (err: any) {
      wx.showToast({ title: err.message || '设置失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  // ===== 直接开馆 =====
  async reopenVenue(e: any) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    wx.showModal({
      title: '确认直接开馆',
      content: `确定将【${name}】恢复开馆？这会清除该场馆所有未来的临时闭馆日期，并恢复为上架运营状态。`,
      confirmColor: '#13C2C2',
      success: async (res) => {
        if (res.confirm) {
          if (this.data.submitting) return;
          this.setData({ submitting: true });
          try {
            await AdminService.reopenVenue(id);
            wx.showToast({ title: '已恢复开馆', icon: 'success' });
            this.loadVenues();
          } catch (err: any) {
            wx.showToast({ title: err.message || '恢复开馆失败', icon: 'none' });
          } finally {
            this.setData({ submitting: false });
          }
        }
      },
    });
  },

  async submitVenueForm() {
    if (this.data.submitting) return;
    const f = this.data.form;
    // 字段级 inline 校验：错误直接标红显示在对应字段下方
    const errors: Record<string, string> = {};
    if (!f.name.trim()) errors.name = '请输入场馆名称';
    if (!f.type.trim()) errors.type = '请选择项目分类';
    if (f.name.trim().length > 100) errors.name = '场馆名称不能超过 100 字';
    if (!this.data.isEditing && !f.description.trim()) errors.description = '请输入场馆介绍';
    if (f.description.length > 2000) errors.description = '场馆介绍不能超过 2000 字';

    const price = Number(f.basePriceYuan);
    if (!Number.isFinite(price) || price < 0 || !/^\d+(\.\d{1,2})?$/.test(f.basePriceYuan.trim())) errors.basePriceYuan = '单价不能为负数，最多两位小数';

    const capacity = Number(f.capacity);
    if (!Number.isInteger(capacity) || capacity < 1) errors.capacity = '容量须为大于 0 的整数';

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(f.openTime) || !timeRegex.test(f.closeTime)) {
      errors.timeRange = '时间格式应为 HH:mm';
    } else {
      const [oh, om] = f.openTime.split(':').map(Number);
      const [ch, cm] = f.closeTime.split(':').map(Number);
      if (ch * 60 + cm - (oh * 60 + om) < 60) {
        errors.timeRange = '结束时间须晚于开始时间且间隔≥1小时';
      }
    }

    if (!f.address.trim()) errors.address = '请输入场馆详细地址';
    if (f.address.trim().length > 200) errors.address = '地址不能超过 200 字';
    if (!f.coverImage.trim()) errors.coverImage = '请输入封面图 URL';

    if (Object.keys(errors).length > 0) {
      this.setData({ formErrors: errors });
      wx.showToast({ title: '请检查标红的表单字段', icon: 'none' });
      return;
    }
    this.setData({ formErrors: {} });

    const payload: any = {
      name: f.name.trim(),
      type: f.type,
      description: f.description || '',
      address: f.address.trim(),
      coverImage: f.coverImage.trim(),
      basePrice: Math.round(price * 100),
      capacity,
      openTime: f.openTime,
      closeTime: f.closeTime,
    };

    this.setData({ submitting: true });
    try {
      if (this.data.isEditing) {
        await AdminService.updateVenue(this.data.editingId, payload);
        wx.showToast({ title: '更新成功', icon: 'success' });
      } else {
        await AdminService.createVenue(payload);
        wx.showToast({ title: '新增成功', icon: 'success' });
      }
      this.closeEditModal();
      this.setData({ page: 1, venues: [], hasMore: true });
      this.loadVenues();
    } catch (err: any) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  validateTimeRange(openTime: string, closeTime: string): boolean {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(openTime) || !timeRegex.test(closeTime)) {
      wx.showToast({ title: '时间格式应为 HH:mm', icon: 'none' });
      return false;
    }
    const [oh, om] = openTime.split(':').map(Number);
    const [ch, cm] = closeTime.split(':').map(Number);
    const openMinutes = oh * 60 + om;
    const closeMinutes = ch * 60 + cm;
    if (closeMinutes - openMinutes < 60) {
      wx.showToast({ title: '结束时间须晚于开始时间且间隔≥1小时', icon: 'none' });
      return false;
    }
    return true;
  },

  async toggleStatus(e: any) {
    if (this.data.submitting) return;
    const id = e.currentTarget.dataset.id;
    const currentStatus = e.currentTarget.dataset.status;
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    this.setData({ submitting: true });
    try {
      await AdminService.updateVenue(id, { status: newStatus });
      wx.showToast({
        title: newStatus === 'ACTIVE' ? '已重新上架' : '已暂停开放(下架)',
        icon: 'none',
      });
      this.loadVenues();
    } catch (err: any) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  deleteVenue(e: any) {
    if (this.data.submitting) return;
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认下架并删除？',
      content: '删除后前端用户将无法检索到该场馆，历史订单仍会保留记录。',
      confirmColor: '#FF4D4F',
      success: async (res) => {
        if (res.confirm && !this.data.submitting) {
          this.setData({ submitting: true });
          try {
            await AdminService.deleteVenue(id);
            wx.showToast({ title: '已成功下架删除', icon: 'success' });
            this.loadVenues();
          } catch (err: any) {
            wx.showToast({ title: err.message || '删除失败', icon: 'none' });
          } finally {
            this.setData({ submitting: false });
          }
        }
      },
    });
  },
});
