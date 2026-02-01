import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { Navbar } from "@/components/Navbar";
import {
  Wallet,
  Ruler,
  Weight,
  Activity,
  Share2,
  Copy,
  Check,
  User,
  TrendingUp,
  Maximize2,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Profile } from "@shared/schema";

export default function DigitalWallet() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: ["/api/profile"],
  });

  const copyWalletId = () => {
    if (profile?.walletId) {
      navigator.clipboard.writeText(profile.walletId);
      setCopied(true);
      toast({
        title: t("wallet.copied"),
        description: t("wallet.copiedDesc"),
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareWallet = async () => {
    if (!profile?.walletId) return;

    const shareData = {
      title: t("wallet.shareTitle"),
      text: t("wallet.shareText", { 
        walletId: profile.walletId, 
        name: profile.name, 
        height: profile.height, 
        weight: profile.weight 
      }),
      url: window.location.href,
    };

    try {
      // Check if Web Share API is supported
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({
          title: t("wallet.shared"),
          description: t("wallet.sharedDesc"),
        });
      } else {
        // Fallback: Copy wallet ID to clipboard
        await navigator.clipboard.writeText(
          t("wallet.shareFullText", {
            walletId: profile.walletId,
            name: profile.name,
            gender: t(`profile.${profile.gender}`),
            age: profile.age,
            height: profile.height,
            weight: profile.weight,
            chest: profile.chest,
            waist: profile.waist,
            hip: profile.hip,
            shoulder: profile.shoulder,
            armLength: profile.armLength,
            legLength: profile.legLength
          })
        );
        toast({
          title: t("wallet.copied"),
          description: t("wallet.copiedFullDesc"),
        });
      }
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.name !== 'AbortError') {
        console.error("Error sharing:", error);
        // Fallback to copy
        await navigator.clipboard.writeText(
          t("wallet.shareBasicText", { walletId: profile.walletId, name: profile.name })
        );
        toast({
          title: t("wallet.copied"),
          description: t("wallet.copiedDesc"),
        });
      }
    }
  };

  const measurements = profile
    ? [
        { 
          label: t("dashboard.height"), 
          value: `${profile.height}`, 
          unit: "cm", 
          icon: Ruler,
          color: "from-blue-500 to-cyan-600",
          bgColor: "bg-blue-50 dark:bg-blue-950/20",
          borderColor: "border-blue-200 dark:border-blue-800",
          textColor: "text-blue-600 dark:text-blue-400"
        },
        { 
          label: t("dashboard.weight"), 
          value: `${profile.weight}`, 
          unit: "kg", 
          icon: Weight,
          color: "from-purple-500 to-pink-600",
          bgColor: "bg-purple-50 dark:bg-purple-950/20",
          borderColor: "border-purple-200 dark:border-purple-800",
          textColor: "text-purple-600 dark:text-purple-400"
        },
        { 
          label: t("dashboard.chest"), 
          value: `${profile.chest}`, 
          unit: "cm", 
          icon: Activity,
          color: "from-red-500 to-rose-600",
          bgColor: "bg-red-50 dark:bg-red-950/20",
          borderColor: "border-red-200 dark:border-red-800",
          textColor: "text-red-600 dark:text-red-400"
        },
        { 
          label: t("dashboard.waist"), 
          value: `${profile.waist}`, 
          unit: "cm", 
          icon: Maximize2,
          color: "from-orange-500 to-amber-600",
          bgColor: "bg-orange-50 dark:bg-orange-950/20",
          borderColor: "border-orange-200 dark:border-orange-800",
          textColor: "text-orange-600 dark:text-orange-400"
        },
        { 
          label: t("dashboard.hip"), 
          value: `${profile.hip}`, 
          unit: "cm", 
          icon: Activity,
          color: "from-pink-500 to-rose-600",
          bgColor: "bg-pink-50 dark:bg-pink-950/20",
          borderColor: "border-pink-200 dark:border-pink-800",
          textColor: "text-pink-600 dark:text-pink-400"
        },
        { 
          label: t("dashboard.shoulder"), 
          value: `${profile.shoulder}`, 
          unit: "cm", 
          icon: TrendingUp,
          color: "from-indigo-500 to-blue-600",
          bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
          borderColor: "border-indigo-200 dark:border-indigo-800",
          textColor: "text-indigo-600 dark:text-indigo-400"
        },
        { 
          label: t("dashboard.armLength"), 
          value: `${profile.armLength}`, 
          unit: "cm", 
          icon: Ruler,
          color: "from-green-500 to-emerald-600",
          bgColor: "bg-green-50 dark:bg-green-950/20",
          borderColor: "border-green-200 dark:border-green-800",
          textColor: "text-green-600 dark:text-green-400"
        },
        { 
          label: t("dashboard.legLength"), 
          value: `${profile.legLength}`, 
          unit: "cm", 
          icon: Ruler,
          color: "from-teal-500 to-cyan-600",
          bgColor: "bg-teal-50 dark:bg-teal-950/20",
          borderColor: "border-teal-200 dark:border-teal-800",
          textColor: "text-teal-600 dark:text-teal-400"
        },
      ]
    : [];

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

      {/* Content */}
      <div className="pt-24 pb-12 px-4 md:px-6 relative">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center [dir='rtl']:text-center">
            <div className="flex items-center justify-center gap-3 mb-3 flex-wrap">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Wallet className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent break-words">
                {t("wallet.digitalWallet")}
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-base break-words px-4">
              {t("wallet.yourMeasurements")}
            </p>
          </div>

          {isLoading ? (
            <GlassCard className="p-8">
              <div className="space-y-4">
                <div className="h-20 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 rounded-xl animate-pulse" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="h-32 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 rounded-xl animate-pulse" />
                  ))}
                </div>
              </div>
            </GlassCard>
          ) : !profile ? (
            <GlassCard className="p-12 text-center">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-indigo-500/20 rounded-full blur-2xl animate-pulse" />
                  <div className="relative w-24 h-24 bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-pink-500/10 rounded-2xl flex items-center justify-center border border-purple-200/20 dark:border-purple-800/20">
                    <Wallet className="w-12 h-12 text-purple-500 dark:text-purple-400" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {t("wallet.noProfiles")}
                </h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  {t("wallet.noProfilesDesc")}
                </p>
                <GradientButton
                  onClick={() => setLocation("/profile/create")}
                  data-testid="button-create-profile-wallet"
                  className="px-8"
                >
                  {t("dashboard.createProfile")}
                </GradientButton>
              </div>
            </GlassCard>
          ) : (
            <>
              {/* Wallet ID Card */}
              <GlassCard className="p-6 md:p-8" data-testid="card-wallet-id">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <Wallet className="w-8 h-8 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1 break-words">{t("wallet.walletId")}</p>
                      <p className="text-gray-900 dark:text-gray-100 text-xl font-bold font-mono break-all" data-testid="text-wallet-id">
                        {profile.walletId}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm break-words">
                          {profile.name} • {t(`profile.${profile.gender}`)} • {t("wallet.age")} {profile.age}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={copyWalletId}
                      className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:bg-white dark:hover:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all duration-200"
                      data-testid="button-copy-wallet-id"
                    >
                      {copied ? (
                        <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <Copy className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                      )}
                    </button>
                    <button
                      onClick={shareWallet}
                      className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:bg-white dark:hover:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all duration-200"
                      data-testid="button-share"
                      title={t("wallet.shareTitle")}
                    >
                      <Share2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                  </div>
                </div>
              </GlassCard>

              {/* Measurements Grid */}
              <GlassCard className="p-6 md:p-8" data-testid="card-measurements-grid">
                <div className="flex items-center gap-3 mb-8 flex-wrap">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <Ruler className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 break-words">
                      {t("dashboard.measurements")}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">
                      {t("dashboard.measurementsDesc")}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {measurements.map((measurement, index) => {
                    const IconComponent = measurement.icon;
                    return (
                      <div
                        key={index}
                        className={`relative overflow-hidden ${measurement.bgColor} border-2 ${measurement.borderColor} rounded-xl p-5 md:p-6 hover:shadow-lg hover:scale-105 transition-all duration-300 group min-h-[120px]`}
                        data-testid={`measurement-${measurement.label.toLowerCase().replace(' ', '-')}`}
                      >
                        {/* Gradient accent */}
                        <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${measurement.color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-300`} />
                        
                        <div className="relative z-10">
                          <div className={`flex items-center gap-2 ${measurement.textColor} mb-3 flex-wrap`}>
                            <div className={`w-8 h-8 bg-gradient-to-br ${measurement.color} rounded-lg flex items-center justify-center shadow-md`}>
                              <IconComponent className="w-4 h-4 text-white" strokeWidth={2} />
                            </div>
                            <span className="text-xs sm:text-sm font-semibold leading-tight break-words">
                              {measurement.label}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                              {measurement.value}
                            </p>
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              {measurement.unit}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4">
                <GradientButton
                  onClick={() => setLocation("/dashboard")}
                  className="flex-1 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 whitespace-nowrap"
                  data-testid="button-back-dashboard"
                >
                  {t("wallet.backToDashboard")}
                </GradientButton>
                <button
                  onClick={() => setLocation("/profile/edit")}
                  className="flex-1 h-12 px-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-2 border-gray-300 dark:border-gray-700 rounded-xl text-base font-semibold text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-900 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all duration-200 whitespace-nowrap"
                  data-testid="button-edit-measurements"
                >
                  {t("wallet.editMeasurements")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
