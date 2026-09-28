import { IsString, IsOptional, IsIn, Length, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 32)
  username: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 32)
  password: string;

  @IsString()
  @IsOptional()
  @Length(1, 32)
  nickname?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  @IsIn(['USER', 'ADMIN', 'SUPER_ADMIN'])
  role?: string;
}
