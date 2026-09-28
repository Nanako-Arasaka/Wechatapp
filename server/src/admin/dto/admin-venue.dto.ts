import { IsInt, IsNotEmpty, IsOptional, IsString, Min, MaxLength, IsEnum, Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { VenueStatus } from '../../common/enums';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

@ValidatorConstraint({ name: 'isTimeString', async: false })
class IsTimeStringConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    return typeof value === 'string' && TIME_REGEX.test(value);
  }
  defaultMessage(args: ValidationArguments) {
    return `${args.property} 必须是 HH:mm 格式`;
  }
}

@ValidatorConstraint({ name: 'timeRangeValid', async: false })
class TimeRangeValidConstraint implements ValidatorConstraintInterface {
  validate(_value: any, args: ValidationArguments) {
    const obj = args.object as any;
    const open = obj.openTime;
    const close = obj.closeTime;
    if (!open || !close) return true;
    if (!TIME_REGEX.test(open) || !TIME_REGEX.test(close)) return true;
    const [openH, openM] = open.split(':').map(Number);
    const [closeH, closeM] = close.split(':').map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    return closeMinutes - openMinutes >= 60;
  }
  defaultMessage() {
    return '结束时间必须晚于开始时间，且间隔至少 1 小时';
  }
}

export class CreateVenueDto {
  @IsNotEmpty({ message: '场馆名称不能为空' })
  @IsString()
  @MaxLength(100)
  name: string;

  @IsNotEmpty({ message: '场馆类型不能为空' })
  @IsString()
  type: string;

  @IsNotEmpty({ message: '场馆介绍不能为空' })
  @IsString()
  @MaxLength(2000)
  description: string;

  @IsNotEmpty({ message: '场馆地址不能为空' })
  @IsString()
  @MaxLength(200)
  address: string;

  @IsNotEmpty({ message: '封面图不能为空' })
  @IsString()
  coverImage: string;

  @IsNotEmpty({ message: '单价不能为空' })
  @IsInt({ message: '单价必须为分' })
  @Min(0)
  basePrice: number;

  @IsNotEmpty({ message: '单时段容量不能为空' })
  @IsInt()
  @Min(1)
  capacity: number;

  @IsNotEmpty({ message: '开放时间不能为空' })
  @IsString()
  @Validate(IsTimeStringConstraint)
  openTime: string;

  @IsNotEmpty({ message: '关闭时间不能为空' })
  @IsString()
  @Validate(IsTimeStringConstraint)
  closeTime: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  facilities?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rules?: string;

  @Validate(TimeRangeValidConstraint)
  timeRangeValid?: any;
}

export class UpdateVenueDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  @Validate(IsTimeStringConstraint)
  openTime?: string;

  @IsOptional()
  @IsString()
  @Validate(IsTimeStringConstraint)
  closeTime?: string;

  @IsOptional()
  @IsEnum(VenueStatus)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  facilities?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rules?: string;

  @Validate(TimeRangeValidConstraint)
  timeRangeValid?: any;
}
