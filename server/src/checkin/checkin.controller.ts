import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/checkin')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Post('verify')
  async verify(@Body('code') code: string) {
    return this.checkinService.verifyCode(code);
  }

  @Post('confirm')
  async confirm(
    @Body('bookingId') bookingId: string,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.checkinService.confirmCheckin(bookingId, operatorId);
  }
}
