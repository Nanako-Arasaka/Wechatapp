import { Module } from '@nestjs/common';
import { DevService } from './dev.service';
import { DevController } from './dev.controller';

@Module({
  controllers: [DevController],
  providers: [DevService],
  exports: [DevService],
})
export class DevModule {}
