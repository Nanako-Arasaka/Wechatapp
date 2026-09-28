import { VenueType, VenueStatus } from '../../common/enums';
export declare class QueryVenueDto {
    keyword?: string;
    type?: VenueType;
    status?: VenueStatus;
    date?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
}
