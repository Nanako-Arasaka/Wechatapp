import { getStatusMeta } from '../../utils/format';

Component({
  properties: {
    status: {
      type: String,
      value: '',
      observer(newVal) {
        this.updateMeta(newVal);
      },
    },
    showDot: {
      type: Boolean,
      value: true,
    },
  },
  data: {
    meta: { label: '', color: '#595959', bg: '#F5F5F5' },
  },
  lifetimes: {
    attached() {
      this.updateMeta(this.properties.status);
    },
  },
  methods: {
    updateMeta(status: string) {
      if (status) {
        this.setData({
          meta: getStatusMeta(status),
        });
      }
    },
  },
});
