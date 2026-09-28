import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { MockRefundProvider, MockSmsProvider } from '../common/providers/mock-providers';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, MockRefundProvider, MockSmsProvider],
  exports: [BookingsService],
})
export class BookingsModule {}
