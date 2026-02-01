import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@/components/GlassCard";
import { Navbar } from "@/components/Navbar";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { User, Recommendation } from "@shared/schema";
import { 
  Users, Mail, Calendar, Shield, User as UserIcon, Edit, Trash2, 
  Package, Activity, FileText, Clock, TrendingUp 
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Extended Recommendation type with user information
type RecommendationWithUser = Recommendation & {
  user?: {
    id: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    fullName: string;
  };
};

interface ActivityLog {
  type: string;
  description: string;
  userId: string;
  timestamp: Date | string;
  metadata: any;
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("users");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deletingRecommendation, setDeletingRecommendation] = useState<Recommendation | null>(null);
  const [editFormData, setEditFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "",
  });

  // Redirect non-admin users to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      const userRole = user.role ? String(user.role).toLowerCase().trim() : '';
      if (userRole !== 'admin') {
        setLocation("/dashboard");
      }
    }
  }, [user, authLoading, setLocation]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-purple-700 flex items-center justify-center">
        <div className="text-white text-2xl">{t("common.loading")}</div>
      </div>
    );
  }

  // If user is not admin, show loading while redirecting
  const userRole = user?.role ? String(user.role).toLowerCase().trim() : '';
  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-purple-700 flex items-center justify-center">
        <div className="text-white text-2xl">{t("common.loading")}</div>
      </div>
    );
  }

  // Fetch users
  const { data: users, isLoading: usersLoading, error: usersError } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch recommendations - always enabled to show stats on dashboard
  const { data: recommendations, isLoading: recommendationsLoading, error: recommendationsError, refetch: refetchRecommendations } = useQuery<RecommendationWithUser[]>({
    queryKey: ["/api/admin/recommendations"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: true, // Always enabled to populate stats cards
    retry: false,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true,
  });

  // Debug: Log recommendations data when it changes
  if (recommendations) {
    console.log("=== FRONTEND: Recommendations Data ===");
    console.log("Total recommendations:", recommendations.length);
    recommendations.forEach((rec, idx) => {
      console.log(`Recommendation ${idx + 1}:`, {
        id: rec.id,
        userId: rec.userId,
        hasUser: !!rec.user,
        userFullName: rec.user?.fullName || 'NOT SET',
        userEmail: rec.user?.email || 'NOT SET',
        userData: rec.user,
      });
    });
    console.log("=== END FRONTEND: Recommendations Data ===");
  }

  // Fetch activity logs - always enabled to show stats on dashboard
  const { data: activities, isLoading: activitiesLoading, error: activitiesError, refetch: refetchActivities } = useQuery<ActivityLog[]>({
    queryKey: ["/api/admin/activity"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: true, // Always enabled to populate stats cards
    retry: false,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true,
  });

  
  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      return apiRequest("PUT", `/api/admin/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditingUser(null);
      toast({
        title: t("common.success"),
        description: t("admin.userUpdated"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("errors.somethingWentWrong"),
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setDeletingUser(null);
      toast({
        title: t("common.success"),
        description: t("admin.userDeleted"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("errors.somethingWentWrong"),
        variant: "destructive",
      });
    },
  });

  // Delete recommendation mutation
  const deleteRecommendationMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/recommendations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recommendations"] });
      setDeletingRecommendation(null);
      toast({
        title: t("common.success"),
        description: t("admin.recommendationDeleted"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("errors.somethingWentWrong"),
        variant: "destructive",
      });
    },
  });

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      email: user.email || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      role: user.role || "user",
    });
  };

  const handleSaveEdit = () => {
    if (!editingUser) return;
    updateUserMutation.mutate({
      id: editingUser.id,
      data: editFormData,
    });
  };

  const handleDeleteClick = (user: User) => {
    setDeletingUser(user);
  };

  const handleConfirmDelete = () => {
    if (!deletingUser) return;
    deleteUserMutation.mutate(deletingUser.id);
  };

  const handleDeleteRecommendationClick = (recommendation: Recommendation) => {
    setDeletingRecommendation(recommendation);
  };

  const handleConfirmDeleteRecommendation = () => {
    if (!deletingRecommendation) return;
    deleteRecommendationMutation.mutate(deletingRecommendation.id);
  };

  // Helper function to translate activity descriptions
  const translateActivityDescription = (description: string, metadata: any): string => {
    const descLower = description.toLowerCase();
    
    // Extract email from description if not in metadata
    let email = metadata?.email || '';
    if (!email && description.includes('@')) {
      const emailMatch = description.match(/[\w\.-]+@[\w\.-]+\.\w+/);
      if (emailMatch) email = emailMatch[0];
    }
    
    if (descLower.includes('profile created')) {
      return t("admin.activity.profileCreated", { email: email || t("admin.user") });
    }
    if (descLower.includes('signed up') || descLower.includes('signup')) {
      return t("admin.activity.userSignedUp", { email: email || t("admin.user") });
    }
    if (descLower.includes('recommendation created') || descLower.includes('recommendation')) {
      return t("admin.activity.recommendationCreated", { 
        email: email || t("admin.user"),
        size: metadata?.recommendedSize || metadata?.size || ''
      });
    }
    
    // Fallback to original description if no match
    return description;
  };

  // Helper function to translate activity types
  const translateActivityType = (type: string): string => {
    const typeLower = type.toLowerCase().replace('_', ' ');
    
    if (typeLower.includes('profile')) {
      return t("admin.activity.type.profileCreated");
    }
    if (typeLower.includes('signup') || typeLower.includes('user signup')) {
      return t("admin.activity.type.userSignup");
    }
    if (typeLower.includes('recommendation')) {
      return t("admin.activity.type.recommendationCreated");
    }
    
    return type.replace('_', ' ');
  };

  // Helper function to translate confidence levels
  const translateConfidence = (confidence: string): string => {
    const confidenceLower = confidence.toLowerCase();
    if (confidenceLower.includes("perfect")) return t("recommendations.perfect");
    if (confidenceLower.includes("good")) return t("recommendations.good");
    if (confidenceLower.includes("loose")) return t("recommendations.loose");
    if (confidenceLower.includes("tight")) return t("recommendations.tight");
    return confidence;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_signup':
        return <UserIcon className="w-4 h-4" />;
      case 'recommendation_created':
        return <Package className="w-4 h-4" />;
      case 'profile_created':
        return <FileText className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user_signup':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'recommendation_created':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      case 'profile_created':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      default:
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-950 dark:via-indigo-950/30 dark:to-purple-950/30 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-purple-400/10 to-blue-400/10 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <Navbar />

      {/* Main Content */}
      <div className="pt-24 pb-12 px-4 md:px-6 relative">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-left [dir='rtl']:text-right">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent break-words leading-tight">
                {t("admin.adminDashboard")}
              </h2>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base break-words leading-relaxed mt-2">
              {t("admin.stats.totalUsers")} • {t("admin.stats.totalRecommendations")} • {t("admin.stats.totalActivity")}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <GlassCard className="p-6 hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 hover:scale-[1.02] group">
              <div className="flex items-center justify-between min-w-0">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1 break-words leading-tight">{t("admin.stats.totalUsers")}</p>
                  {usersLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 text-indigo-500 animate-spin flex-shrink-0" />
                      <span className="text-xl sm:text-2xl font-bold text-foreground break-words">{t("common.loading")}</span>
                    </div>
                  ) : (
                    <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent break-words leading-tight">
                      {users?.length || 0}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6 hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-purple-200 dark:hover:border-purple-800 hover:scale-[1.02] group">
              <div className="flex items-center justify-between min-w-0">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1 break-words leading-tight">{t("admin.stats.admins")}</p>
                  {usersLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 text-purple-500 animate-spin flex-shrink-0" />
                      <span className="text-xl sm:text-2xl font-bold text-foreground break-words">{t("common.loading")}</span>
                    </div>
                  ) : (
                    <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent break-words leading-tight">
                      {users?.filter(u => u.role === 'admin').length || 0}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6 hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-800 hover:scale-[1.02] group">
              <div className="flex items-center justify-between min-w-0">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1 break-words leading-tight">{t("admin.stats.totalRecommendations")}</p>
                  {recommendationsLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
                      <span className="text-xl sm:text-2xl font-bold text-foreground break-words">{t("common.loading")}</span>
                    </div>
                  ) : (
                    <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent break-words leading-tight">
                      {recommendations?.length || 0}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <Package className="w-6 h-6 text-white" />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6 hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-green-200 dark:hover:border-green-800 hover:scale-[1.02] group">
              <div className="flex items-center justify-between min-w-0">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1 break-words leading-tight">{t("admin.stats.totalActivity")}</p>
                  {activitiesLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 text-green-500 animate-spin flex-shrink-0" />
                      <span className="text-xl sm:text-2xl font-bold text-foreground break-words">{t("common.loading")}</span>
                    </div>
                  ) : (
                    <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent break-words leading-tight">
                      {activities?.length || 0}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <Activity className="w-6 h-6 text-white" />
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 shadow-lg rounded-xl p-1.5">
              <TabsTrigger 
                value="users" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 text-xs sm:text-sm"
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="break-words whitespace-nowrap">{t("admin.users")}</span>
                {usersLoading && activeTab === "users" && (
                  <Loader2 className="w-3 h-3 animate-spin ml-1 [dir='rtl']:ml-0 [dir='rtl']:mr-1 flex-shrink-0" />
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="recommendations" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 text-xs sm:text-sm"
              >
                <Package className="w-4 h-4 flex-shrink-0" />
                <span className="break-words whitespace-nowrap">{t("admin.recommendations")}</span>
                {recommendationsLoading && activeTab === "recommendations" && (
                  <Loader2 className="w-3 h-3 animate-spin ml-1 [dir='rtl']:ml-0 [dir='rtl']:mr-1 flex-shrink-0" />
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="activity" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 text-xs sm:text-sm"
              >
                <Activity className="w-4 h-4 flex-shrink-0" />
                <span className="break-words whitespace-nowrap">{t("admin.activityLogs")}</span>
                {activitiesLoading && activeTab === "activity" && (
                  <Loader2 className="w-3 h-3 animate-spin ml-1 [dir='rtl']:ml-0 [dir='rtl']:mr-1 flex-shrink-0" />
                )}
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <GlassCard className="p-6 md:p-8">
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl sm:text-2xl font-semibold text-foreground break-words leading-tight">{t("admin.users")}</h3>
                      <p className="text-sm sm:text-base text-muted-foreground mt-1 break-words leading-relaxed">
                        {t("admin.stats.totalUsers")}
                      </p>
                    </div>
                  </div>
                </div>

                {usersLoading ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 to-purple-500/20 rounded-full blur-2xl animate-pulse" />
                          <div className="relative w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-foreground mb-1">{t("admin.loadingUsers")}</p>
                          <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-900/50">
                          <Skeleton className="w-12 h-12 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                          <Skeleton className="h-8 w-20" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : usersError ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 to-orange-500/20 rounded-full blur-2xl animate-pulse" />
                      <div className="relative w-24 h-24 bg-gradient-to-br from-red-500/10 via-orange-500/10 to-pink-500/10 rounded-2xl flex items-center justify-center border border-red-200/20 dark:border-red-800/20">
                        <Users className="w-12 h-12 text-red-500 dark:text-red-400" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {t("errors.somethingWentWrong")}
                    </h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6">
                      {t("errors.tryAgain")}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => window.location.reload()}
                      className="gap-2"
                    >
                      <Activity className="w-4 h-4" />
                      {t("common.retry")}
                    </Button>
                  </div>
                ) : !users || users.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="relative mb-6">
                      {/* Animated background circle */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full blur-2xl animate-pulse" />
                      {/* Icon container with gradient */}
                      <div className="relative w-24 h-24 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-2xl flex items-center justify-center border border-blue-200/20 dark:border-blue-800/20">
                        <Users className="w-12 h-12 text-blue-500 dark:text-blue-400" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2 break-words leading-tight">
                      {t("admin.users")}
                    </h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6 break-words leading-relaxed">
                      {t("admin.stats.totalUsers")}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UserIcon className="w-4 h-4" />
                      <span>{t("common.loading")}</span>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200/50 dark:border-gray-800/50">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                          <TableHead className="font-semibold text-sm sm:text-base break-words">{t("profile.name")}</TableHead>
                          <TableHead className="text-sm sm:text-base break-words">{t("auth.email")}</TableHead>
                          <TableHead className="text-sm sm:text-base break-words">{t("auth.role")}</TableHead>
                          <TableHead className="text-sm sm:text-base break-words">{t("admin.createdAt")}</TableHead>
                          <TableHead className="text-right text-sm sm:text-base break-words [dir='rtl']:text-left">{t("admin.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow 
                            key={user.id}
                            className="hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 dark:hover:from-indigo-950/20 dark:hover:to-purple-950/20 transition-colors duration-200 border-b border-gray-100 dark:border-gray-800/50"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                                  {user.firstName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-foreground break-words text-sm sm:text-base leading-tight">
                                    {user.firstName && user.lastName
                                      ? `${user.firstName} ${user.lastName}`
                                      : user.firstName || user.lastName || t("admin.noName")}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-0">
                                <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-foreground break-words text-sm sm:text-base min-w-0">{user.email || t("admin.noEmail")}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={user.role === 'admin' ? 'default' : 'secondary'}
                                className={
                                  user.role === 'admin'
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white break-words text-xs sm:text-sm'
                                    : 'break-words text-xs sm:text-sm'
                                }
                              >
                                {user.role === 'admin' ? (
                                  <>
                                    <Shield className="w-3 h-3 mr-1 [dir='rtl']:mr-0 [dir='rtl']:ml-1 flex-shrink-0" />
                                    <span className="break-words">{t("auth.admin")}</span>
                                  </>
                                ) : (
                                  <>
                                    <UserIcon className="w-3 h-3 mr-1 [dir='rtl']:mr-0 [dir='rtl']:ml-1 flex-shrink-0" />
                                    <span className="break-words">{t("auth.user")}</span>
                                  </>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-0">
                                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-foreground break-words text-sm sm:text-base">
                                  {user.createdAt
                                    ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                      })
                                    : t("admin.notAvailable")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right [dir='rtl']:text-left">
                              <div className="flex items-center justify-end gap-2 [dir='rtl']:justify-start">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditClick(user)}
                                  className="h-8 w-8 p-0 flex-shrink-0"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteClick(user)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive flex-shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </GlassCard>
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations" className="space-y-6">
              <GlassCard className="p-6 md:p-8">
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl sm:text-2xl font-semibold text-foreground break-words leading-tight">{t("admin.recommendations")}</h3>
                      <p className="text-sm sm:text-base text-muted-foreground mt-1 break-words leading-relaxed">
                        {t("admin.stats.totalRecommendations")}
                      </p>
                    </div>
                  </div>
                </div>

                {recommendationsLoading ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 to-purple-500/20 rounded-full blur-2xl animate-pulse" />
                          <div className="relative w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-foreground mb-1">{t("admin.loadingRecommendations")}</p>
                          <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-900/50">
                          <Skeleton className="w-12 h-12 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-56" />
                          </div>
                          <Skeleton className="h-8 w-24" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : recommendationsError ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 to-orange-500/20 rounded-full blur-2xl animate-pulse" />
                      <div className="relative w-24 h-24 bg-gradient-to-br from-red-500/10 via-orange-500/10 to-pink-500/10 rounded-2xl flex items-center justify-center border border-red-200/20 dark:border-red-800/20">
                        <Package className="w-12 h-12 text-red-500 dark:text-red-400" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {t("errors.somethingWentWrong")}
                    </h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6">
                      {recommendationsError instanceof Error 
                        ? recommendationsError.message 
                        : t("errors.tryAgain")}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => refetchRecommendations()}
                      className="gap-2"
                    >
                      <Activity className="w-4 h-4" />
                      {t("common.retry")}
                    </Button>
                  </div>
                ) : !recommendations || recommendations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="relative mb-6">
                      {/* Animated background circle */}
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 to-purple-500/20 rounded-full blur-2xl animate-pulse" />
                      {/* Icon container with gradient */}
                      <div className="relative w-24 h-24 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl flex items-center justify-center border border-indigo-200/20 dark:border-indigo-800/20">
                        <Package className="w-12 h-12 text-indigo-500 dark:text-indigo-400" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {t("admin.recommendations")}
                    </h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6">
                      {t("admin.stats.totalRecommendations")}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Activity className="w-4 h-4" />
                      <span>{t("common.loading")}</span>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200/50 dark:border-gray-800/50">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                          <TableHead className="font-semibold text-sm sm:text-base break-words">{t("auth.user")}</TableHead>
                          <TableHead className="font-semibold text-sm sm:text-base break-words">{t("clothing.selectClothing")}</TableHead>
                          <TableHead className="font-semibold text-sm sm:text-base break-words">{t("fabric.selectFabric")}</TableHead>
                          <TableHead className="font-semibold text-sm sm:text-base break-words">{t("recommendations.recommendedSize")}</TableHead>
                          <TableHead className="font-semibold text-sm sm:text-base break-words">{t("recommendations.confidence")}</TableHead>
                          <TableHead className="font-semibold text-sm sm:text-base break-words">{t("recommendations.matchScore")}</TableHead>
                          <TableHead className="font-semibold text-sm sm:text-base break-words">{t("admin.createdAt")}</TableHead>
                          <TableHead className="text-right font-semibold text-sm sm:text-base break-words [dir='rtl']:text-left">{t("admin.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recommendations.map((rec, index) => (
                          <TableRow 
                            key={rec.id}
                            className="hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 dark:hover:from-indigo-950/20 dark:hover:to-purple-950/20 transition-colors duration-200 border-b border-gray-100 dark:border-gray-800/50"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3 min-w-0">
                                {(() => {
                                  // Get user display name - prioritize fullName, then email, then fallback
                                  const userFullName = rec.user?.fullName;
                                  const userEmail = rec.user?.email;
                                  const displayName = userFullName || userEmail || t("admin.unknownUser");
                                  const initial = displayName[0]?.toUpperCase() || "U";
                                  const showEmail = userEmail && userFullName && userFullName !== userEmail;
                                  
                                  return (
                                    <>
                                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md flex-shrink-0">
                                        {initial}
                                      </div>
                                      <div className="flex flex-col min-w-0 flex-1">
                                        <span className="font-medium text-foreground text-sm sm:text-base break-words leading-tight">
                                          {displayName}
                                        </span>
                                        {showEmail && (
                                          <span className="text-xs text-muted-foreground flex items-center gap-1 break-words">
                                            <Mail className="w-3 h-3 flex-shrink-0" />
                                            <span className="break-all">{userEmail}</span>
                                          </span>
                                        )}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <span className="font-medium text-foreground break-words text-sm sm:text-base min-w-0">{rec.clothingType ? (t(`clothing.${rec.clothingType}`) || rec.clothingType) : t("admin.notAvailable")}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-gray-300 dark:border-gray-700 break-words text-xs sm:text-sm whitespace-normal">
                                {rec.fabricType ? (t(`fabric.${rec.fabricType}`) || rec.fabricType) : t("admin.notAvailable")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md break-words text-xs sm:text-sm whitespace-normal">
                                {rec.recommendedSize || t("admin.notAvailable")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  rec.confidence === 'Perfect' ? 'default' :
                                  rec.confidence === 'Good' ? 'secondary' : 'outline'
                                }
                                className={
                                  rec.confidence === 'Perfect'
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md whitespace-normal'
                                    : rec.confidence === 'Good'
                                    ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-md whitespace-normal'
                                    : 'border-gray-300 dark:border-gray-700 whitespace-normal'
                                }
                              >
                                <span className="break-words text-xs sm:text-sm">{rec.confidence ? translateConfidence(rec.confidence) : t("admin.notAvailable")}</span>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <TrendingUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <span className="font-medium text-foreground text-sm sm:text-base break-words">{rec.matchScore || 0}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-0">
                                <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-foreground break-words text-sm sm:text-base">
                                  {rec.createdAt
                                    ? new Date(rec.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : t("admin.notAvailable")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right [dir='rtl']:text-left">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteRecommendationClick(rec)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive flex-shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </GlassCard>
            </TabsContent>

            {/* Activity Logs Tab */}
            <TabsContent value="activity" className="space-y-6">
              <GlassCard className="p-6 md:p-8">
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl sm:text-2xl font-semibold text-foreground break-words leading-tight">{t("admin.activityLogs")}</h3>
                      <p className="text-sm sm:text-base text-muted-foreground mt-1 break-words leading-relaxed">
                        {t("admin.stats.totalActivity")}
                      </p>
                    </div>
                  </div>
                </div>

                {activitiesLoading ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-2xl animate-pulse" />
                          <div className="relative w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-foreground mb-1">{t("admin.loadingActivity")}</p>
                          <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-5 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-900/50">
                          <Skeleton className="w-12 h-12 rounded-xl" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-64" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                          <Skeleton className="h-4 w-24" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : activitiesError ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 to-orange-500/20 rounded-full blur-2xl animate-pulse" />
                      <div className="relative w-24 h-24 bg-gradient-to-br from-red-500/10 via-orange-500/10 to-pink-500/10 rounded-2xl flex items-center justify-center border border-red-200/20 dark:border-red-800/20">
                        <Activity className="w-12 h-12 text-red-500 dark:text-red-400" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {t("errors.somethingWentWrong")}
                    </h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6">
                      {activitiesError instanceof Error 
                        ? activitiesError.message 
                        : t("errors.tryAgain")}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => refetchActivities()}
                      className="gap-2"
                    >
                      <Activity className="w-4 h-4" />
                      {t("common.retry")}
                    </Button>
                  </div>
                ) : !activities || activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="relative mb-6">
                      {/* Animated background circle */}
                      <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-2xl animate-pulse" />
                      {/* Icon container with gradient */}
                      <div className="relative w-24 h-24 bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10 rounded-2xl flex items-center justify-center border border-green-200/20 dark:border-green-800/20">
                        <Activity className="w-12 h-12 text-green-500 dark:text-green-400" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {t("admin.activityLogs")}
                    </h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6">
                      {t("admin.stats.totalActivity")}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{t("common.loading")}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-4 p-5 rounded-xl border border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-white/80 to-gray-50/50 dark:from-gray-900/80 dark:to-gray-800/50 hover:from-indigo-50/50 hover:to-purple-50/50 dark:hover:from-indigo-950/20 dark:hover:to-purple-950/20 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${getActivityColor(activity.type)}`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-foreground break-words">{translateActivityDescription(activity.description, activity.metadata)}</p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-4 [dir='rtl']:ml-0 [dir='rtl']:mr-4">
                              {new Date(activity.timestamp).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            <Badge variant="outline" className="text-xs break-words">
                              {translateActivityType(activity.type)}
                            </Badge>
                            {activity.metadata?.email && (
                              <span className="flex items-center gap-1 break-words">
                                <Mail className="w-3 h-3 flex-shrink-0" />
                                {activity.metadata.email}
                              </span>
                            )}
                            {activity.metadata?.role && (
                              <Badge variant="secondary" className="text-xs break-words">
                                {activity.metadata.role === 'admin' ? t("admin.role.admin") : t("admin.role.user")}
                              </Badge>
                            )}
                            {activity.metadata?.clothingType && (
                              <span className="flex items-center gap-1 break-words">
                                <Package className="w-3 h-3 flex-shrink-0" />
                                {t(`clothing.${activity.metadata.clothingType}`) || activity.metadata.clothingType}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="break-words text-lg sm:text-xl leading-tight">{t("admin.editUser")}</DialogTitle>
            <DialogDescription className="break-words text-sm sm:text-base leading-relaxed">
              {t("admin.editUserDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-sm sm:text-base break-words leading-tight">{t("auth.email")}</Label>
              <Input
                id="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                placeholder={t("auth.emailPlaceholder")}
                className="text-sm sm:text-base"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="firstName" className="text-sm sm:text-base break-words leading-tight">{t("auth.firstName")}</Label>
              <Input
                id="firstName"
                value={editFormData.firstName}
                onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                placeholder={t("auth.firstNamePlaceholder")}
                className="text-sm sm:text-base"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName" className="text-sm sm:text-base break-words leading-tight">{t("auth.lastName")}</Label>
              <Input
                id="lastName"
                value={editFormData.lastName}
                onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                placeholder={t("auth.lastNamePlaceholder")}
                className="text-sm sm:text-base"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role" className="text-sm sm:text-base break-words leading-tight">{t("auth.role")}</Label>
              <Select
                value={editFormData.role}
                onValueChange={(value) => setEditFormData({ ...editFormData, role: value })}
              >
                <SelectTrigger id="role" className="text-sm sm:text-base">
                  <SelectValue placeholder={t("auth.selectRole")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user" className="break-words text-sm sm:text-base">{t("auth.user")}</SelectItem>
                  <SelectItem value="admin" className="break-words text-sm sm:text-base">{t("auth.admin")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingUser(null)}
              disabled={updateUserMutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words text-lg sm:text-xl leading-tight">{t("admin.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription className="break-words text-sm sm:text-base leading-relaxed">
              {t("admin.deleteUserConfirm")}
              {deletingUser?.email && ` ${deletingUser.email}`}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUserMutation.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteUserMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? t("admin.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Recommendation Confirmation Dialog */}
      <AlertDialog open={!!deletingRecommendation} onOpenChange={(open) => !open && setDeletingRecommendation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words text-lg sm:text-xl leading-tight">{t("admin.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription className="break-words text-sm sm:text-base leading-relaxed">
              {t("admin.deleteRecConfirm")}
              {deletingRecommendation?.clothingType && ` ${t(`clothing.${deletingRecommendation.clothingType}`) || deletingRecommendation.clothingType}`}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRecommendationMutation.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteRecommendation}
              disabled={deleteRecommendationMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRecommendationMutation.isPending ? t("admin.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
