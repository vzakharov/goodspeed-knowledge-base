import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { z } from 'zod';

/**
 * Parses a body, query or param with a `@kb/contracts` schema, so what reaches
 * a handler is the schema's output type and a request that does not match it
 * is a 400 naming each field that failed.
 */
export class ZodPipe<Schema extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: Schema) {}

  transform(value: unknown): z.output<Schema> {
    const parsed = this.schema.safeParse(value);

    if (!parsed.success) {
      throw new BadRequestException(z.prettifyError(parsed.error), {
        cause: parsed.error,
      });
    }

    return parsed.data;
  }
}
