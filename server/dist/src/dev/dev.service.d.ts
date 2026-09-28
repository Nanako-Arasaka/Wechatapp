import { PrismaService } from '../common/prisma/prisma.service';
export declare class DevService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    handleExpiredOrdersCron(): Promise<void>;
    expirePendingOrders(): Promise<{
        expiredCount: number;
        message: string;
    }>;
    generatePeakTraffic(): Promise<{
        affectedSlots: number;
        message: string;
    }>;
}
