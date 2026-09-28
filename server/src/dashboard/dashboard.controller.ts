import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@UseGuards(RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('realtime')
  async getRealtimeStatus() {
    return this.dashboardService.getRealtimeStatus();
  }

  @Get('heatmap')
  async getHeatmap() {
    return this.dashboardService.getHeatmap();
  }
}
