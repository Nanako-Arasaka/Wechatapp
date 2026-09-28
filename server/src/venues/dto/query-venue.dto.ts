import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { VenueType, VenueStatus } from '../../common/enums';

export class QueryVenueDto {
  @IsOptional()
  @Transform(({ value }) => (value === 'undefined' || value === 'null' || !value ? undefined : value))
  @IsString()
  keyword?: string;

  @IsOptional()
  @Transform(({ value }) => (value === 'undefined' || value === 'null' || !value ? undefined : value))
  @IsEnum(VenueType)
  type?: VenueType;

  @IsOptional()
  @Transform(({ value }) => (value === 'undefined' || value === 'null' || !value ? undefined : value))
  @IsEnum(VenueStatus)
  status?: VenueStatus;

  @IsOptional()
  @Transform(({ value }) => (value === 'undefined' || value === 'null' || !value ? undefined : value))
  @IsString()
  date?: string; // 查询特定日期的可用场馆

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10) || 1)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10) || 20)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @IsOptional()
  @Transform(({ value }) => (value === 'undefined' || value === 'null' || !value ? undefined : value))
  @IsString()
  sortBy?: string; // recommend / price_asc / remain_desc
}
