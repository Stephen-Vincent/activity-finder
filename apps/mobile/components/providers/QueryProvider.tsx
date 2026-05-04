/**
 * QueryProvider
 *
 * TanStack Query QueryClientProvider with sensible defaults for a mobile app:
 *   - staleTime: 5 minutes for venue data
 *   - retry: 1
 *   - persisted query cache via @tanstack/react-query-persist-client + AsyncStorage
 */

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // TODO: implement.
  return <>{children}</>;
}
