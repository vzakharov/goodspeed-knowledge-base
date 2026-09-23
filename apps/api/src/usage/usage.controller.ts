import type { UsageReport } from '@kb/contracts';
import { Controller, Get } from '@nestjs/common';

import { CurrentReader, type Reader } from '../auth/index.ts';
import { UsageService } from './usage.service.ts';

@Controller('usage')
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  @Get()
  async report(@CurrentReader() reader: Reader): Promise<UsageReport> {
    return this.usage.report(reader);
  }
}
