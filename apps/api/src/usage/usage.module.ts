import { Module } from '@nestjs/common';

import { UsageController } from './usage.controller.ts';
import { UsageService } from './usage.service.ts';

@Module({
  controllers: [UsageController],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
