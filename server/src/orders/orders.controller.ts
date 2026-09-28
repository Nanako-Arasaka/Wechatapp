import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { BookingsService } from '../bookings/bookings.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly bookingsService: BookingsService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
  ) {
    return this.ordersService.findAll(userId, status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ordersService.findOne(id, userId);
  }

  @Post(':id/pay')
  async pay(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ordersService.pay(id, userId);
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const order = await this.ordersService.findOne(id, userId);
    return this.bookingsService.cancel(order.bookingId, userId, role);
  }

  @Post(':id/refund')
  async refund(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const order = await this.ordersService.findOne(id, userId);
    return this.bookingsService.cancel(order.bookingId, userId, role);
  }
}
