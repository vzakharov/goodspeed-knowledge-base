import { usageReportSchema } from '@kb/contracts';
import { queryOptions } from '@tanstack/react-query';

import { api } from '@/shared/api';

export const usageQuery = () =>
  queryOptions({
    queryKey: ['usage'],
    queryFn: async ({ signal }) =>
      api.request('/usage', usageReportSchema, { signal }),
  });
