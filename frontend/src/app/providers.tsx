import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryFoundation } from "../lib/query-client.ts";
import { AuthProvider } from "../auth/auth-provider";
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryFoundation.client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
