import { Controller, Get } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('my-records')
  async findMyPayments(@CurrentUser('id') userId: string) {
    return this.paymentsService.findAll(userId);
  }
}
