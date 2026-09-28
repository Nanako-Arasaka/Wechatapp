Component({
    properties: {
        icon: {
            type: String,
            value: '🏸',
        },
        title: {
            type: String,
            value: '暂无数据',
        },
        description: {
            type: String,
            value: '',
        },
        btnText: {
            type: String,
            value: '',
        },
    },
    methods: {
        onBtnTap() {
            this.triggerEvent('btnTap');
        },
    },
});
