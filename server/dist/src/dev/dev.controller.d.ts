import { DevService } from './dev.service';
export declare class DevController {
    private readonly devService;
    constructor(devService: DevService);
    expireOrders(): Promise<{
        expiredCount: number;
        message: string;
    }>;
    generatePeak(): Promise<{
        affectedSlots: number;
        message: string;
    }>;
}
