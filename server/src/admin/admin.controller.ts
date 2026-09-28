import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateVenueDto, UpdateVenueDto } from './dto/admin-venue.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('venues')
  async getVenues(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.adminService.getVenues(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
      keyword,
    );
  }

  @Post('venues')
  async createVenue(
    @Body() dto: CreateVenueDto,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.createVenue(dto, operatorId);
  }

  @Put('venues/:id')
  async updateVenue(
    @Param('id') id: string,
    @Body() dto: UpdateVenueDto,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.updateVenue(id, dto, operatorId);
  }

  @Post('venues/:id/preview-time-change')
  async previewTimeChange(
    @Param('id') id: string,
    @Body('openTime') openTime: string,
    @Body('closeTime') closeTime: string,
  ) {
    return this.adminService.previewTimeChange(id, openTime, closeTime);
  }

  @Post('venues/batch-time')
  async batchUpdateTime(
    @Body('openTime') openTime: string,
    @Body('closeTime') closeTime: string,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.batchUpdateTime(openTime, closeTime, operatorId);
  }

  @Delete('venues/:id')
  async deleteVenue(
    @Param('id') id: string,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.deleteVenue(id, operatorId);
  }

  @Post('venues/:id/close-date')
  async setClosedDate(
    @Param('id') venueId: string,
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
    @Body('reason') reason: string,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.setClosedDate(venueId, startDate, endDate, reason, operatorId);
  }

  @Post('venues/:id/reopen')
  async reopenVenue(
    @Param('id') venueId: string,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.reopenVenue(venueId, operatorId);
  }

  @Post('users')
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser('id') operatorId: string,
    @CurrentUser('role') operatorRole: string,
  ) {
    return this.adminService.createUser(dto, operatorId, operatorRole);
  }

  @Get('users')
  async getUsers(
    @Query('role') role?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.getUsers(
      role,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 50,
    );
  }

  @Delete('users/:id')
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser('id') operatorId: string,
    @CurrentUser('role') operatorRole: string,
  ) {
    return this.adminService.deleteUser(id, operatorId, operatorRole);
  }

  @Get('bookings')
  async getBookings(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('venueId') venueId?: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.adminService.getBookings(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
      venueId,
      date,
      status,
      keyword,
    );
  }

  @Get('logs')
  async getLogs(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.getLogs(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }
}
