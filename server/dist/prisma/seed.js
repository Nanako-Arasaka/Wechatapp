"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const dayjs = require("dayjs");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting high-speed database seeding for SmartVenue...');
    await prisma.operationLog.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.checkinRecord.deleteMany();
    await prisma.refund.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.venueSlot.deleteMany();
    await prisma.venueClosedDate.deleteMany();
    await prisma.venueSchedule.deleteMany();
    await prisma.venue.deleteMany();
    await prisma.user.deleteMany();
    console.log('🧹 Cleaned existing tables.');
    const superAdmin = await prisma.user.create({
        data: {
            username: 'superadmin',
            password: bcrypt.hashSync('admin123', 10),
            nickname: '系统超级管理员',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            phone: '13800000001',
            role: 'SUPER_ADMIN',
            status: 'ACTIVE',
        },
    });
    const admin1 = await prisma.user.create({
        data: {
            username: 'admin',
            password: bcrypt.hashSync('admin123', 10),
            nickname: '王管理员 (场馆总监)',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            phone: '13800000002',
            role: 'ADMIN',
            status: 'ACTIVE',
        },
    });
    const admin2 = await prisma.user.create({
        data: {
            username: 'admin_li',
            password: 'admin123',
            nickname: '李主管 (前台运营)',
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
            phone: '13800000003',
            role: 'ADMIN',
            status: 'ACTIVE',
        },
    });
    const defaultUser = await prisma.user.create({
        data: {
            username: 'user',
            password: 'user123',
            nickname: '张同学 (运动爱好者)',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            phone: '13800138000',
            role: 'USER',
            status: 'ACTIVE',
        },
    });
    const userNicknames = [
        '运动健将小陈', '羽球小王子', '三分神射手老刘', '网球达人Emma', '乒乓旋风小赵',
        '晨跑打卡小吴', '暴扣少年Tony', '追风少女Lily', '健身狂热者Kevin', '阳光学长Alex',
        '马拉松爱好者周哥', '球场老炮儿孙叔', '羽坛新秀小林', '游泳健儿大宋', '热血队长Leo',
        '飞盘队长Mia', '力量训练师Max', '瑜伽导师Chloe', '活力少年Lucas', '快乐运动家Sophie',
    ];
    const normalUsers = [defaultUser];
    for (let i = 0; i < userNicknames.length; i++) {
        const u = await prisma.user.create({
            data: {
                username: `user_${i + 1}`,
                nickname: userNicknames[i],
                avatar: `https://images.unsplash.com/photo-${1530000000000 + (i * 1234567) % 90000000}?w=150`,
                phone: `139${String(10000000 + i * 111111).slice(0, 8)}`,
                role: 'USER',
                status: 'ACTIVE',
            },
        });
        normalUsers.push(u);
    }
    console.log(`✅ Seeded ${normalUsers.length + 3} users.`);
    const venueConfigs = [
        {
            name: '星羽羽毛球馆 (A馆)',
            type: 'BADMINTON',
            description: '国家级比赛标准木地板与专业PVC防滑地胶，配备无影LED专业运动照明与格力中央恒温空调。',
            address: '文体中心综合馆 2层 B区',
            coverImage: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600',
            basePrice: 3500,
            capacity: 10,
            openTime: '08:00',
            closeTime: '22:00',
            facilities: '中央空调,专业淋浴,免费储物柜,器材租借,免费停车,WIFI覆盖',
            rules: '1. 需着专业羽毛球运动鞋入场；2. 支持提前7天预约；3. 开场前2小时可免费取消退款。',
        },
        {
            name: '冠军篮球中心 (室内主馆)',
            type: 'BASKETBALL',
            description: 'FIBA认证枫木龙骨减震地板，NBA标准液压升降篮架，高清大屏实时计分。',
            address: '体育中心北区 1号竞技馆',
            coverImage: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600',
            basePrice: 5000,
            capacity: 6,
            openTime: '09:00',
            closeTime: '22:00',
            facilities: '中央空调,电子计分器,淋浴间,饮料售卖机,休息长廊',
            rules: '1. 禁止携带碳酸饮料及有色饮品进入木地板区域；2. 严禁扣篮悬挂篮筐。',
        },
        {
            name: '悦动网球馆 (红土&硬地)',
            type: 'TENNIS',
            description: '标准法网红土球场与美网硬地球场，夜间配备高色温泛光照明。',
            address: '体育公园东侧 网球中心',
            coverImage: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=600',
            basePrice: 6000,
            capacity: 4,
            openTime: '07:00',
            closeTime: '22:00',
            facilities: '发球机租借,夜间照明,淋浴间,停车位,裁判椅',
            rules: '1. 进入红土场地需更换平底网球鞋；2. 雨天室外场地自动顺延或退款。',
        },
        {
            name: '活力乒乓球馆',
            type: 'TABLE_TENNIS',
            description: '红双喜奥运比赛专用球台，防滑专业地胶，独立隔断包厢与标准大厅。',
            address: '文体中心综合馆 3层 A区',
            coverImage: 'https://images.unsplash.com/photo-1534158914592-062992fbe900?w=600',
            basePrice: 2000,
            capacity: 12,
            openTime: '08:00',
            closeTime: '22:00',
            facilities: '空调,乒乓球捡球器,休息区,饮水机,储物柜',
            rules: '1. 遵守球馆秩序，爱护球网与球台；2. 请勿将杂物放置于台面。',
        },
        {
            name: '青春足球场 (人工草7人制)',
            type: 'FOOTBALL',
            description: 'FIFA认证免充砂环保人造草坪，弹性极佳有效保护膝关节。',
            address: '体育中心南区 户外足球场',
            coverImage: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800',
            basePrice: 12000,
            capacity: 2,
            openTime: '08:00',
            closeTime: '22:00',
            facilities: '夜间高杆灯,替补席,裁判用具,医疗急救箱,洗手间',
            rules: '1. 仅限穿碎钉(TF)或胶钉(AG)足球鞋；2. 严禁携带金属钉足球鞋。',
        },
        {
            name: '蓝海游泳馆 (恒温50米)',
            type: 'SWIMMING',
            description: '50米国际标准恒温泳池，24小时水循环与臭氧杀菌消毒系统，常年水温保持27±1℃。',
            address: '体育中心水上运动馆 1层',
            coverImage: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600',
            basePrice: 3000,
            capacity: 30,
            openTime: '09:00',
            closeTime: '21:30',
            facilities: '恒温水池,专职救生员,桑拿房,热水淋浴,吹风机,电子更衣柜',
            rules: '1. 必须佩戴泳帽并穿戴正规泳装；2. 凡有心脏病、高血压或传染性疾病者禁止入水。',
        },
        {
            name: '全民健身中心 (力量与有氧)',
            type: 'FITNESS',
            description: '全套泰诺健(Technogym)进口高端器械，划分为自由力量区、固定器械区、有氧区及拉伸区。',
            address: '文体中心综合馆 4层',
            coverImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600',
            basePrice: 2500,
            capacity: 40,
            openTime: '08:00',
            closeTime: '22:30',
            facilities: '中央空调,体测仪(InBody),淋浴间,动感单车房,储物柜',
            rules: '1. 训练请着运动服及软底运动鞋；2. 杠铃哑铃使用完毕请自觉归位。',
        },
        {
            name: '综合多功能训练馆',
            type: 'MULTI',
            description: '多功能弹性运动地面，可灵活布置为排球、羽毛球、壁球或体能团课集训场地。',
            address: '文体中心综合馆 1层 C区',
            coverImage: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600',
            basePrice: 4000,
            capacity: 8,
            openTime: '08:30',
            closeTime: '21:30',
            facilities: '可移动球网,专业音响,白板,空调,更衣室',
            rules: '1. 支持团体团建与团课集训；2. 借用设备请在离场前清点归还。',
        },
    ];
    const createdVenues = [];
    for (let i = 0; i < venueConfigs.length; i++) {
        const vc = venueConfigs[i];
        const v = await prisma.venue.create({
            data: {
                id: String(i + 1),
                ...vc,
            },
        });
        createdVenues.push(v);
    }
    console.log(`✅ Seeded ${createdVenues.length} venues.`);
    const today = dayjs();
    const timeSlots = [
        { start: '08:00', end: '09:00', isPeak: false },
        { start: '09:00', end: '10:00', isPeak: false },
        { start: '10:00', end: '11:00', isPeak: false },
        { start: '11:00', end: '12:00', isPeak: false },
        { start: '13:00', end: '14:00', isPeak: false },
        { start: '14:00', end: '15:00', isPeak: false },
        { start: '15:00', end: '16:00', isPeak: false },
        { start: '16:00', end: '17:00', isPeak: false },
        { start: '17:00', end: '18:00', isPeak: true },
        { start: '18:00', end: '19:00', isPeak: true },
        { start: '19:00', end: '20:00', isPeak: true },
        { start: '20:00', end: '21:00', isPeak: true },
        { start: '21:00', end: '22:00', isPeak: false },
    ];
    const slotsToInsert = [];
    for (let dayOffset = -29; dayOffset <= 7; dayOffset++) {
        const targetDateStr = today.add(dayOffset, 'day').format('YYYY-MM-DD');
        const dayOfWeek = today.add(dayOffset, 'day').day();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        for (const venue of createdVenues) {
            for (const slot of timeSlots) {
                let slotPrice = venue.basePrice;
                if (isWeekend)
                    slotPrice = Math.round(slotPrice * 1.2);
                else if (slot.isPeak)
                    slotPrice = Math.round(slotPrice * 1.15);
                slotsToInsert.push({
                    venueId: venue.id,
                    date: targetDateStr,
                    startTime: slot.start,
                    endTime: slot.end,
                    price: slotPrice,
                    totalCapacity: venue.capacity,
                    bookedCapacity: dayOffset < 0 ? (slot.isPeak ? Math.floor(venue.capacity * 0.8) : Math.floor(venue.capacity * 0.4)) : (dayOffset === 0 && slot.isPeak ? venue.capacity : 2),
                    status: 'AVAILABLE',
                });
            }
        }
    }
    await prisma.venueSlot.createMany({ data: slotsToInsert });
    console.log(`✅ Seeded ${slotsToInsert.length} slots in batch.`);
    const allSlots = await prisma.venueSlot.findMany({
        where: { date: { lte: today.format('YYYY-MM-DD') } },
        take: 320,
        orderBy: { date: 'desc' },
    });
    const bookingsData = [];
    const ordersData = [];
    const paymentsData = [];
    const refundsData = [];
    const checkinsData = [];
    let idx = 0;
    for (const s of allSlots) {
        idx++;
        const user = normalUsers[idx % normalUsers.length];
        const isToday = s.date === today.format('YYYY-MM-DD');
        const bookingId = `seed_b_${idx}`;
        const orderId = `seed_o_${idx}`;
        const bookingNo = `BK${s.date.replace(/-/g, '')}${s.startTime.replace(':', '')}${String(10000 + idx).slice(-4)}`;
        const bookingCode = `SV${s.date.replace(/-/g, '')}${String(10000 + (idx % 89999))}`;
        const orderNo = `SV${s.date.replace(/-/g, '')}${String(20000 + idx).slice(-4)}`;
        const paymentNo = `PAY${s.date.replace(/-/g, '')}${String(30000 + idx).slice(-4)}`;
        const transactionNo = `WXPAY_${s.date.replace(/-/g, '')}_${idx}_${Date.now().toString(36)}`;
        const isRefunded = !isToday && (idx % 18 === 0);
        const isCheckedIn = !isToday && !isRefunded && (idx % 10 !== 0);
        let bStatus = 'COMPLETED';
        let oStatus = 'COMPLETED';
        let pStatus = 'PAID';
        let paidAmount = s.price;
        let refundAmount = 0;
        if (isRefunded) {
            bStatus = 'REFUNDED';
            oStatus = 'REFUNDED';
            pStatus = 'REFUNDED';
            refundAmount = paidAmount;
        }
        else if (isToday) {
            bStatus = 'CONFIRMED';
            oStatus = 'PAID';
        }
        const bDate = dayjs(`${s.date} ${s.startTime}`).toDate();
        bookingsData.push({
            id: bookingId,
            bookingNo,
            userId: user.id,
            venueId: s.venueId,
            slotId: s.id,
            bookingDate: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            quantity: 1,
            unitPrice: s.price,
            totalAmount: s.price,
            status: bStatus,
            bookingCode,
            contactName: user.nickname,
            contactPhone: user.phone,
            checkedInAt: isCheckedIn ? bDate : null,
            cancelledAt: isRefunded ? bDate : null,
            createdAt: bDate,
        });
        ordersData.push({
            id: orderId,
            orderNo,
            userId: user.id,
            bookingId,
            amount: s.price,
            paidAmount,
            refundAmount,
            paymentStatus: pStatus,
            orderStatus: oStatus,
            paidAt: bDate,
            cancelledAt: isRefunded ? bDate : null,
            createdAt: bDate,
        });
        paymentsData.push({
            id: `seed_p_${idx}`,
            paymentNo,
            orderId,
            paymentMethod: 'WECHAT_PAY',
            transactionNo,
            amount: paidAmount,
            status: 'SUCCESS',
            paidAt: bDate,
        });
        if (isRefunded) {
            refundsData.push({
                id: `seed_r_${idx}`,
                refundNo: `RF${s.date.replace(/-/g, '')}${String(50000 + idx).slice(-4)}`,
                orderId,
                amount: refundAmount,
                reason: '用户主动取消',
                status: 'SUCCESS',
                completedAt: bDate,
                createdAt: bDate,
            });
        }
        if (isCheckedIn) {
            checkinsData.push({
                id: `seed_c_${idx}`,
                bookingId,
                userId: user.id,
                operatorId: admin1.id,
                checkinCode: bookingCode,
                checkinAt: bDate,
                status: 'SUCCESS',
            });
        }
    }
    const demoSlot = await prisma.venueSlot.findFirst({
        where: {
            venueId: createdVenues[0].id,
            date: today.format('YYYY-MM-DD'),
            startTime: '14:00',
        },
    });
    if (demoSlot) {
        const demoBookingId = 'demo_booking_ready_001';
        const demoOrderId = 'demo_order_ready_001';
        const demoCode = `SV${today.format('YYYYMMDD')}0888`;
        bookingsData.unshift({
            id: demoBookingId,
            bookingNo: `BK${today.format('YYYYMMDD')}DEMO001`,
            userId: defaultUser.id,
            venueId: createdVenues[0].id,
            slotId: demoSlot.id,
            bookingDate: today.format('YYYY-MM-DD'),
            startTime: demoSlot.startTime,
            endTime: demoSlot.endTime,
            quantity: 1,
            unitPrice: demoSlot.price,
            totalAmount: demoSlot.price,
            status: 'CONFIRMED',
            bookingCode: demoCode,
            contactName: '张同学',
            contactPhone: '13800138000',
            checkedInAt: null,
            cancelledAt: null,
            createdAt: new Date(),
        });
        ordersData.unshift({
            id: demoOrderId,
            orderNo: `SV${today.format('YYYYMMDD')}DEMO001`,
            userId: defaultUser.id,
            bookingId: demoBookingId,
            amount: demoSlot.price,
            paidAmount: demoSlot.price,
            refundAmount: 0,
            paymentStatus: 'PAID',
            orderStatus: 'PAID',
            paidAt: new Date(),
            cancelledAt: null,
            createdAt: new Date(),
        });
        paymentsData.unshift({
            id: 'demo_payment_ready_001',
            paymentNo: `PAY${today.format('YYYYMMDD')}DEMO001`,
            orderId: demoOrderId,
            paymentMethod: 'WECHAT_PAY',
            transactionNo: `WXPAY_DEMO_${Date.now()}`,
            amount: demoSlot.price,
            status: 'SUCCESS',
            paidAt: new Date(),
        });
    }
    await prisma.booking.createMany({ data: bookingsData });
    await prisma.order.createMany({ data: ordersData });
    await prisma.payment.createMany({ data: paymentsData });
    await prisma.refund.createMany({ data: refundsData });
    await prisma.checkinRecord.createMany({ data: checkinsData });
    console.log(`✅ Seeded ${bookingsData.length} bookings, ${ordersData.length} orders, ${paymentsData.length} payments, ${refundsData.length} refunds, ${checkinsData.length} checkins.`);
    await prisma.operationLog.createMany({
        data: [
            {
                operatorId: admin1.id,
                action: 'UPDATE_VENUE',
                module: 'VENUE',
                targetId: createdVenues[0].id,
                description: '更新了星羽羽毛球馆 (A馆) 的营业时间与设施标签',
            },
            {
                operatorId: admin2.id,
                action: 'CHECKIN',
                module: 'CHECKIN',
                description: '完成了张同学的羽毛球场地入场核销',
            },
        ],
    });
    await prisma.notification.createMany({
        data: [
            {
                userId: defaultUser.id,
                title: '预约成功通知',
                content: `您已成功预约【星羽羽毛球馆 (A馆)】今日 14:00-15:00 时段，核销码为 SV${today.format('YYYYMMDD')}0888，请凭码入场！`,
                type: 'BOOKING_SUCCESS',
                isRead: false,
            },
            {
                userId: defaultUser.id,
                title: '入场提醒',
                content: '温馨提示：您今日的运动时段即将开始，请提前10分钟到场完成扫码核销。',
                type: 'REMINDER',
                isRead: false,
            },
        ],
    });
    console.log('\n🎉 Fast Seeding Completed Successfully in < 3s!\n');
}
main()
    .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map