import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import {
  User,
  Plus,
  Wallet,
  History,
  Ruler,
  Weight,
  Activity,
  RotateCcw,
  TrendingUp,
  Maximize2,
} from "lucide-react";
import type { Profile } from "@shared/schema";

export default function Dashboard() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();

  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: ["/api/profile"],
  });

  // Redirect admin users to admin dashboard
  useEffect(() => {
    if (!authLoading && user) {
      const userRole = user.role ? String(user.role).toLowerCase().trim() : '';
      if (userRole === 'admin') {
        setLocation("/admin");
      }
    }
  }, [user, authLoading, setLocation]);

  // Wait for auth to load before checking role
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-purple-700 flex items-center justify-center">
        <div className="text-white text-2xl">{t("common.loading")}</div>
      </div>
    );
  }

  // If user is admin, show loading while redirecting
  const userRole = user?.role ? String(user.role).toLowerCase().trim() : '';
  if (userRole === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-purple-700 flex items-center justify-center">
        <div className="text-white text-2xl">Redirecting...</div>
      </div>
    );
  }

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
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Welcome Header */}
          <div className="text-left [dir='rtl']:text-right">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 break-words">
              {profile ? t("dashboard.welcome", { name: profile.name || t("auth.user") }) : t("dashboard.welcomeNoName")}
            </h2>
            <p className="text-muted-foreground text-base break-words">
              {profile
                ? t("dashboard.createProfileDesc")
                : t("dashboard.createProfileDescNoProfile")}
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <GlassCard key={i} className="p-6 md:p-8 animate-pulse">
                  <div className="h-32 bg-gray-50 rounded-xl" />
                </GlassCard>
              ))}
            </div>
          ) : !profile ? (
            /* No Profile - Quick Actions */
            <GlassCard className="p-8 md:p-12 text-center">
              <div className="max-w-md mx-auto space-y-6">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
                  <User className="w-10 h-10 text-foreground" />
                </div>
                <h3 className="text-2xl font-semibold text-foreground">
                  {t("dashboard.createProfile")}
                </h3>
                <p className="text-muted-foreground">
                  {t("dashboard.createProfileDesc")}
                </p>
                <div className="flex justify-center">
                  <GradientButton
                    onClick={() => setLocation("/profile/create")}
                    data-testid="button-create-profile-dashboard"
                  >
                    <Plus className="inline-block w-5 h-5 mr-2" />
                    {t("dashboard.createProfile")}
                  </GradientButton>
                </div>
              </div>
            </GlassCard>
          ) : (
            <>
              {/* Profile Summary */}
              <GlassCard className="p-8 md:p-10 bg-white/80 dark:bg-card/80 backdrop-blur-xl border-2 border-indigo-100/50 dark:border-indigo-900/50 shadow-xl" data-testid="card-profile-summary">
                <div className="space-y-8">
                  {/* Digital Wallet Section */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Wallet className="w-6 h-6 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xl font-semibold text-foreground mb-1 break-words">
                          {t("wallet.digitalWallet")}
                        </h3>
                        <p className="text-sm text-muted-foreground font-mono break-all">
                          ID: {profile.walletId}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setLocation("/wallet")}
                      className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 whitespace-nowrap flex-shrink-0"
                      data-testid="button-view-wallet"
                    >
                      {t("dashboard.viewWallet")}
                    </button>
                  </div>

                  {/* Separator */}
                  <div className="border-t border-gray-200 dark:border-gray-700"></div>

                  {/* Measurement Profile Section */}
                  <div>
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold text-foreground mb-1">{t("dashboard.measurements")}</h4>
                      <p className="text-sm text-muted-foreground">{t("dashboard.measurementsDesc")}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
                      {/* Height */}
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl p-4 md:p-5 border-2 border-blue-200/50 dark:border-blue-800/50 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 hover:-translate-y-1 min-h-[100px]">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs sm:text-sm mb-2 flex-wrap">
                          <div className="p-1.5 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-md">
                            <Ruler className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="font-semibold text-xs sm:text-sm leading-tight break-words">{t("dashboard.height")}</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                          {profile.height} <span className="text-sm font-medium text-blue-500 dark:text-blue-400">cm</span>
                        </p>
                      </div>
                      {/* Weight */}
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl p-4 border-2 border-purple-200/50 dark:border-purple-800/50 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200 hover:-translate-y-1">
                        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs mb-2">
                          <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-md">
                            <Weight className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="font-semibold text-xs sm:text-sm leading-tight break-words">{t("dashboard.weight")}</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                          {profile.weight} <span className="text-sm font-medium text-purple-500 dark:text-purple-400">kg</span>
                        </p>
                      </div>
                      {/* Chest */}
                      <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 rounded-xl p-4 border-2 border-red-200/50 dark:border-red-800/50 hover:shadow-lg hover:border-red-300 dark:hover:border-red-700 transition-all duration-200 hover:-translate-y-1">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs mb-2">
                          <div className="p-1.5 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg shadow-md">
                            <Activity className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="font-semibold text-xs sm:text-sm leading-tight break-words">{t("dashboard.chest")}</span>
                        </div>
                        <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                          {profile.chest} <span className="text-sm font-medium text-red-500 dark:text-red-400">cm</span>
                        </p>
                      </div>
                      {/* Waist */}
                      <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-xl p-4 border-2 border-orange-200/50 dark:border-orange-800/50 hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-700 transition-all duration-200 hover:-translate-y-1">
                        <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs mb-2">
                          <div className="p-1.5 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg shadow-md">
                            <Maximize2 className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="font-semibold text-xs sm:text-sm leading-tight break-words">{t("dashboard.waist")}</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                          {profile.waist} <span className="text-sm font-medium text-orange-500 dark:text-orange-400">cm</span>
                        </p>
                      </div>
                      {/* Hip */}
                      <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 rounded-xl p-4 border-2 border-pink-200/50 dark:border-pink-800/50 hover:shadow-lg hover:border-pink-300 dark:hover:border-pink-700 transition-all duration-200 hover:-translate-y-1">
                        <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400 text-xs mb-2">
                          <div className="p-1.5 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg shadow-md">
                            <Activity className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="font-semibold text-xs sm:text-sm leading-tight break-words">{t("dashboard.hip")}</span>
                        </div>
                        <p className="text-2xl font-bold text-pink-700 dark:text-pink-300">
                          {profile.hip} <span className="text-sm font-medium text-pink-500 dark:text-pink-400">cm</span>
                        </p>
                      </div>
                      {/* Shoulder */}
                      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 rounded-xl p-4 border-2 border-indigo-200/50 dark:border-indigo-800/50 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200 hover:-translate-y-1">
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs mb-2">
                          <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg shadow-md">
                            <TrendingUp className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="font-semibold text-xs sm:text-sm leading-tight break-words">{t("dashboard.shoulder")}</span>
                        </div>
                        <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                          {profile.shoulder} <span className="text-sm font-medium text-indigo-500 dark:text-indigo-400">cm</span>
                        </p>
                      </div>
                      {/* Arm Length */}
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-4 border-2 border-green-200/50 dark:border-green-800/50 hover:shadow-lg hover:border-green-300 dark:hover:border-green-700 transition-all duration-200 hover:-translate-y-1">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs mb-2">
                          <div className="p-1.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-md">
                            <Ruler className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="font-semibold text-xs sm:text-sm leading-tight break-words">{t("dashboard.armLength")}</span>
                        </div>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {profile.armLength} <span className="text-sm font-medium text-green-500 dark:text-green-400">cm</span>
                        </p>
                      </div>
                      {/* Leg Length */}
                      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 rounded-xl p-4 border-2 border-teal-200/50 dark:border-teal-800/50 hover:shadow-lg hover:border-teal-300 dark:hover:border-teal-700 transition-all duration-200 hover:-translate-y-1">
                        <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 text-xs mb-2">
                          <div className="p-1.5 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg shadow-md">
                            <Ruler className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="font-semibold text-xs sm:text-sm leading-tight break-words">{t("dashboard.legLength")}</span>
                        </div>
                        <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">
                          {profile.legLength} <span className="text-sm font-medium text-teal-500 dark:text-teal-400">cm</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => setLocation("/profile/edit")}
                        className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 whitespace-nowrap"
                        data-testid="button-edit-profile"
                      >
                        {t("dashboard.editProfile")}
                      </button>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Get Size Recommendation */}
                <GlassCard className="p-6 md:p-8 bg-gradient-to-br from-white to-indigo-50/50 dark:from-card dark:to-indigo-950/20 backdrop-blur-xl border-2 border-indigo-200/50 dark:border-indigo-800/50 hover:-translate-y-2 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:border-indigo-300 dark:hover:border-indigo-700 group" data-testid="card-get-recommendation" onClick={() => setLocation("/clothing-selection")}>
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 group-hover:shadow-2xl">
                      <Plus className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                        {t("dashboard.getRecommendation")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t("dashboard.getRecommendationDesc")}
                      </p>
                    </div>
                  </div>
                </GlassCard>

                {/* View History */}
                <GlassCard className="p-6 md:p-8 bg-gradient-to-br from-white to-purple-50/50 dark:from-card dark:to-purple-950/20 backdrop-blur-xl border-2 border-purple-200/50 dark:border-purple-800/50 hover:-translate-y-2 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:border-purple-300 dark:hover:border-purple-700 group" data-testid="card-view-history" onClick={() => setLocation("/history")}>
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 group-hover:shadow-2xl group-hover:from-purple-400 group-hover:via-purple-500 group-hover:to-pink-500">
                      <RotateCcw className="w-8 h-8 text-white group-hover:rotate-180 transition-transform duration-300" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                        {t("history.history")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t("history.recommendationHistory")}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
