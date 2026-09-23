'use client';

import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '@/shared/api';
import type { WithChildren } from '@/shared/typings';

export function QueryProvider({ children }: WithChildren) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
