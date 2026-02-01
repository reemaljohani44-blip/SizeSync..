import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, refetch, isFetching } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    // Disable all automatic refetching to prevent excessive requests
    refetchOnWindowFocus: false,
    refetchOnMount: false, // CRITICAL: Don't refetch when component mounts - keeps cached data during redirects
    refetchOnReconnect: false,
    refetchInterval: false,
    // Use a very long staleTime to prevent constant refetching
    // Data is considered fresh for 1 hour - only fetch once per hour
    staleTime: 60 * 60 * 1000, // 1 hour - data is fresh for 1 hour
    // Keep data in cache for 2 hours
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    // Only fetch if we don't have data in cache yet
    // This ensures the query only runs once when the app first loads
    enabled: true,
    // Use structuralSharing to prevent unnecessary re-renders
    structuralSharing: true,
    // Network mode: only fetch when online
    networkMode: 'online',
    // Placeholder data: use null as placeholder to prevent refetching
    placeholderData: (previousData) => previousData ?? null,
  });

  // Debug logging to track user data
  if (user) {
    console.log("=== useAuth Hook ===");
    console.log("User object:", user);
    console.log("User role:", user.role);
    console.log("User role type:", typeof user.role);
  }

  return {
    user: user || undefined,
    isLoading: isLoading && !user, // Only show loading if we don't have cached data
    isAuthenticated: !!user,
    refetch,
  };
}
