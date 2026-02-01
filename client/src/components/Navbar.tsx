import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User as UserIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface NavbarProps {
  showUserMenu?: boolean;
}

export function Navbar({ showUserMenu = true }: NavbarProps) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use the same query key as useAuth to share the cache
  // This prevents duplicate API calls - it will use the cached data from useAuth
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: showUserMenu,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // CRITICAL: Don't refetch when Navbar mounts
    refetchOnReconnect: false,
    refetchInterval: false,
    // Use same staleTime as useAuth to share cache properly
    staleTime: 60 * 60 * 1000, // 1 hour - matches useAuth
    gcTime: 2 * 60 * 60 * 1000, // 2 hours - matches useAuth
    // Use structural sharing to prevent unnecessary re-renders
    structuralSharing: true,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Make request with Accept header for JSON response
      const response = await fetch("/api/logout", {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to logout");
      }
      return response.json();
    },
    onSuccess: () => {
      // Clear JWT token from localStorage
      localStorage.removeItem("token");
      // Clear all queries and cache
      queryClient.clear();
      // Invalidate auth query to ensure it's refetched
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Use replace instead of push to prevent back navigation
      // This removes the current page from history
      window.location.replace("/signin");
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: () => {
      // Even if logout fails, clear client and redirect
      localStorage.removeItem("token");
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Use replace to prevent back navigation
      window.location.replace("/signin");
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = (user: User | undefined) => {
    if (!user) return "U";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const getUserDisplayName = (user: User | undefined) => {
    if (!user) return "User";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    if (user.email) {
      return user.email.split("@")[0];
    }
    return "User";
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/98 dark:bg-gray-950/98 backdrop-blur-2xl border-b border-gray-200/80 dark:border-gray-800/80 shadow-lg">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-50/40 dark:via-indigo-950/30 to-purple-50/30 dark:to-purple-950/20 pointer-events-none"></div>
      
      {/* Subtle shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none animate-shimmer"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="relative group">
            <h1
              className="text-2xl md:text-3xl font-bold text-indigo-900 dark:text-indigo-100 cursor-pointer transition-all duration-300 group-hover:scale-105 relative z-10"
              onClick={() => {
                if (user) {
                  const userRole = user.role ? String(user.role).toLowerCase().trim() : '';
                  if (userRole === 'admin') {
                    setLocation("/admin");
                  } else {
                    setLocation("/dashboard");
                  }
                } else {
                  setLocation("/");
                }
              }}
            >
              <span className="relative">
                <span className="text-indigo-800 dark:text-indigo-200">Size</span>
                <span className="text-purple-700 dark:text-purple-300">Sync</span>
                {/* Glowing effect on hover */}
                <span className="absolute inset-0 blur-xl opacity-0 group-hover:opacity-30 bg-gradient-to-r from-indigo-600 to-purple-600 transition-opacity duration-300 -z-10"></span>
              </span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            {showUserMenu && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 h-auto p-2 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-950/50 dark:hover:to-purple-950/50 transition-all duration-300 group border border-transparent hover:border-indigo-200/50 dark:hover:border-indigo-800/50">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:shadow-purple-500/50 transition-all duration-300 group-hover:scale-110 relative overflow-hidden">
                        {/* Animated gradient shine */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                        <span className="text-white text-sm font-semibold relative z-10">
                          {getInitials(user)}
                        </span>
                        {/* Pulsing ring on hover */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 opacity-0 group-hover:opacity-50 blur-lg group-hover:scale-125 transition-all duration-300"></div>
                      </div>
                    </div>
                    <span className="hidden md:inline-block text-sm font-medium text-gray-800 dark:text-gray-200 lowercase group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors duration-300">
                      {getUserDisplayName(user)}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-64 bg-white/98 dark:bg-gray-950/98 backdrop-blur-2xl border-2 border-gray-200/80 dark:border-gray-800/80 shadow-2xl rounded-xl p-2 mt-2"
                >
                  <DropdownMenuLabel className="px-3 py-3">
                    <div className="flex flex-col space-y-1.5">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-none">
                        {getUserDisplayName(user)}
                      </p>
                      {user.email && (
                        <p className="text-xs leading-none text-gray-500 dark:text-gray-400 font-mono">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-2 bg-gray-200/50 dark:bg-gray-800/50" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300 focus:bg-red-50 dark:focus:bg-red-950/30 rounded-lg px-3 py-2.5 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors duration-200"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span className="font-medium">{t("auth.logOut")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <div className="relative">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

