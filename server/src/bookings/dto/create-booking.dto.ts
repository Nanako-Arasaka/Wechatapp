import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export enum BookingPrivilege {
  NONE = 'NONE',
  RESERVE = 'RESERVE',
  EXPAND = 'EXPAND',
}

export class CreateBookingDto {
  @IsNotEmpty({ message: '场馆ID不能为空' })
  @IsString()
  venueId: string;

  @IsNotEmpty({ message: '时段ID不能为空' })
  @IsString()
  slotId: string;

  @IsNotEmpty({ message: '预约数量不能为空' })
  @IsInt({ message: '预约数量必须为整数' })
  @Min(1, { message: '预约数量至少为1' })
  @Max(5, { message: '单次预约数量不可超过5' })
  quantity: number;

  @IsNotEmpty({ message: '姓名不能为空' })
  @IsString()
  @MaxLength(20, { message: '姓名不能超过 20 个字符' })
  contactName: string;

  @IsNotEmpty({ message: '学号不能为空' })
  @IsString()
  @Matches(/^\d{6,12}$/, { message: '学号须为 6-12 位数字' })
  studentNo: string;

  @IsNotEmpty({ message: '手机号不能为空' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入正确的 11 位手机号' })
  contactPhone: string;

  @IsOptional()
  @IsEnum(BookingPrivilege)
  privilege?: BookingPrivilege;

  @IsOptional()
  @IsInt({ message: '场地编号必须为整数' })
  @Min(1, { message: '场地编号至少为 1' })
  courtNo?: number; // 选场地流程时传入；同时段同场地由 CourtOccupancy 唯一约束互斥
}
