export declare class CreateVenueDto {
    name: string;
    type: string;
    description: string;
    address: string;
    coverImage: string;
    basePrice: number;
    capacity: number;
    openTime: string;
    closeTime: string;
    facilities?: string;
    rules?: string;
    timeRangeValid?: any;
}
export declare class UpdateVenueDto {
    name?: string;
    type?: string;
    description?: string;
    address?: string;
    coverImage?: string;
    basePrice?: number;
    capacity?: number;
    openTime?: string;
    closeTime?: string;
    status?: string;
    facilities?: string;
    rules?: string;
    timeRangeValid?: any;
}
