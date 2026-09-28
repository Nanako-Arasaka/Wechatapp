import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.payment.findMany({
      where: {
        order: { userId },
      },
      include: {
        order: {
          include: {
            booking: {
              include: { venue: true },
            },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });
  }
}
