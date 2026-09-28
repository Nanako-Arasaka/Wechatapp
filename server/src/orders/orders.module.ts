import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { BookingsModule } from '../bookings/bookings.module';
import { MockWechatPayProvider } from '../common/providers/mock-providers';

@Module({
  imports: [BookingsModule],
  controllers: [OrdersController],
  providers: [OrdersService, MockWechatPayProvider],
  exports: [OrdersService],
})
export class OrdersModule {}
