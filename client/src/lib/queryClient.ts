import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const text = await res.text();
      if (text) {
        const json = JSON.parse(text);
        // Prioritize message field for detailed error messages (e.g., role mismatch)
        if (json.message) {
          errorMessage = json.message;
        } else if (json.error) {
          errorMessage = typeof json.error === 'string' ? json.error : json.error.message || errorMessage;
        } else {
          errorMessage = text;
        }
      }
    } catch {
      // If parsing fails, use status text
      errorMessage = res.statusText;
    }
    const error = new Error(errorMessage);
    (error as any).status = res.status;
    (error as any).response = res;
    throw error;
  }
}

// Get token from localStorage
function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add JWT token to Authorization header if available
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Include cookies for session-based auth
  });

  await throwIfResNotOk(res);
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal }) => {
    const token = getToken();
    const headers: Record<string, string> = {};
    
    // Add JWT token to Authorization header if available
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include", // Include cookies for session-based auth
      signal, // Support request cancellation
    });

    // Handle 401 errors without throwing to prevent infinite retries
    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      // For "throw" behavior, still throw but with a proper error
      const error = new Error("Unauthorized - Please login");
      (error as any).status = 401;
      throw error;
    }

    // Handle 403 errors (Forbidden - Admin access required)
    if (res.status === 403) {
      const error = new Error("Forbidden - Admin access required");
      (error as any).status = 403;
      throw error;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false, // CRITICAL: Don't refetch on mount
      refetchOnReconnect: false,
      staleTime: 60 * 60 * 1000, // 1 hour default - data is fresh for 1 hour
      gcTime: 2 * 60 * 60 * 1000, // 2 hours default
      retry: false,
      // Use structural sharing to prevent unnecessary re-renders
      structuralSharing: true,
      // Network mode: only fetch when online and not in suspense
      networkMode: 'online',
    },
    mutations: {
      retry: false,
    },
  },
});
