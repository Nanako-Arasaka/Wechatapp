import { Controller, Post, UseGuards } from '@nestjs/common';
import { DevService } from './dev.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@UseGuards(RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('dev')
export class DevController {
  constructor(private readonly devService: DevService) {}

  @Post('expire-orders')
  async expireOrders() {
    return this.devService.expirePendingOrders();
  }

  @Post('generate-peak')
  async generatePeak() {
    return this.devService.generatePeakTraffic();
  }
}
