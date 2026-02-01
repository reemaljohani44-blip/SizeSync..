import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/Navbar";
import { GradientButton } from "@/components/GradientButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useGuest } from "@/hooks/useGuest";
import { BodyAvatar, BodyAvatarLegend } from "@/components/BodyAvatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle, AlertTriangle, UserPlus, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type FitStatus = "perfect" | "good" | "loose" | "tight" | "neutral";

function calculateFitStatus(userValue: number, chartValue: number, fabricType?: string): { status: FitStatus } {
  const diff = userValue - chartValue;
  const percentage = Math.abs(diff / chartValue) * 100;
  
  const tolerance = fabricType === "stretchy" ? 8 : fabricType === "rigid" ? 3 : 5;
  
  if (percentage <= tolerance) return { status: "perfect" };
  if (diff > 0) return { status: percentage <= tolerance * 2 ? "tight" : "tight" };
  return { status: percentage <= tolerance * 2 ? "loose" : "loose" };
}

function getFitIndicatorColor(status: string) {
  switch (status) {
    case "perfect": return "bg-green-500";
    case "good": return "bg-indigo-500";
    case "loose": return "bg-amber-500";
    case "tight": return "bg-red-500";
    default: return "bg-gray-400";
  }
}

function translateStatus(status: string, t: any) {
  switch (status) {
    case "perfect": return t("fitStatus.perfect");
    case "good": return t("fitStatus.good");
    case "loose": return t("fitStatus.loose");
    case "tight": return t("fitStatus.tight");
    default: return status;
  }
}

export default function GuestRecommendations() {
  const { t, i18n } = useTranslation();
  const [, setLocation] = useLocation();
  const { isGuest, guestProfile, guestRecommendation, endGuestSession } = useGuest();
  const [showConversionPrompt, setShowConversionPrompt] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const isRTL = i18n.language === "ar";

  useEffect(() => {
    if (!isGuest || !guestProfile || !guestRecommendation) {
      setLocation("/guest/profile");
      return;
    }

    if (!selectedSize && guestRecommendation.recommendedSize) {
      setSelectedSize(guestRecommendation.recommendedSize);
    }

    const timer = setTimeout(() => {
      setShowConversionPrompt(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isGuest, guestProfile, guestRecommendation, setLocation, selectedSize]);

  if (!guestRecommendation || !guestProfile) {
    return null;
  }

  const handleSignUp = () => {
    endGuestSession();
    setLocation("/signup");
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence?.toLowerCase()) {
      case "perfect":
        return "text-green-600 bg-green-100 dark:bg-green-900/30";
      case "good":
        return "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30";
      case "loose":
        return "text-amber-600 bg-amber-100 dark:bg-amber-900/30";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-900/30";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-indigo-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const sizeChartData = guestRecommendation.sizeChartData || {};
  const availableSizes = Object.keys(sizeChartData).filter(key => key !== "sizes");

  const getFitDetails = () => {
    if (!selectedSize || !sizeChartData[selectedSize]) return [];
    
    const sizeMeasurements = sizeChartData[selectedSize];
    const details: Array<{
      key: string;
      label: string;
      userValue: number;
      chartValue: number;
      status: FitStatus;
    }> = [];

    const measurementMap: Record<string, string> = {
      chest: t("measurements.chest"),
      waist: t("measurements.waist"),
      hip: t("measurements.hip"),
    };

    Object.entries(sizeMeasurements).forEach(([key, chartValue]) => {
      if (key === "size" || typeof chartValue !== "number") return;
      
      const userValue = guestProfile[key as keyof typeof guestProfile];
      if (typeof userValue !== "number") return;

      const { status } = calculateFitStatus(userValue, chartValue, guestRecommendation.fabricType);
      
      details.push({
        key,
        label: measurementMap[key] || key,
        userValue,
        chartValue,
        status,
      });
    });

    return details;
  };

  const fitDetails = getFitDetails();
  const chestDetail = fitDetails.find(d => d.key === "chest");
  const waistDetail = fitDetails.find(d => d.key === "waist");
  const hipDetail = fitDetails.find(d => d.key === "hip");

  const avatarOverlays = [
    chestDetail && {
      type: "chest" as const,
      value: chestDetail.userValue,
      fitStatus: chestDetail.status,
      label: t("measurements.chest"),
    },
    waistDetail && {
      type: "waist" as const,
      value: waistDetail.userValue,
      fitStatus: waistDetail.status,
      label: t("measurements.waist"),
    },
    hipDetail && {
      type: "hip" as const,
      value: hipDetail.userValue,
      fitStatus: hipDetail.status,
      label: t("measurements.hip"),
    },
  ].filter(Boolean) as any[];

  const overallFit = fitDetails.length > 0 
    ? fitDetails.every(f => f.status === "perfect") 
      ? "perfect" 
      : fitDetails.some(f => f.status === "tight") 
        ? "tight" 
        : fitDetails.some(f => f.status === "loose") 
          ? "loose" 
          : "good"
    : "unknown";

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900" dir={isRTL ? "rtl" : "ltr"}>
      <Navbar />
      <div className="pt-24 pb-12 px-4 md:px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                {t("guest.guestSession")}
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {t("guest.dataNotSaved")}
              </p>
            </div>
          </div>

          <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl rounded-3xl overflow-hidden">
            <CardContent className="p-6 md:p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg">
                  <Check className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {t("recommendations.smartRecommendation")}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {t("recommendations.aiAnalysisComplete")}
                </p>
              </div>

              <div className="flex justify-center mb-8">
                <div className={cn(
                  "px-6 py-3 rounded-2xl flex items-center gap-3 shadow-md",
                  guestRecommendation.confidence === "Perfect" 
                    ? "bg-green-100 text-green-800" 
                    : guestRecommendation.confidence === "Good"
                      ? "bg-indigo-100 text-indigo-800"
                      : "bg-amber-100 text-amber-800"
                )}>
                  <CheckCircle className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-lg font-bold">
                      {t(`recommendations.${guestRecommendation.confidence?.toLowerCase()}`)}
                    </div>
                    <div className="text-xs opacity-90">{t("recommendations.confidenceLevel")}</div>
                  </div>
                </div>
              </div>

              <div className="text-center mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t("recommendations.recommendedSize")}
                </h3>
                <div className="text-7xl md:text-8xl font-bold text-indigo-600 mb-4">
                  {guestRecommendation.recommendedSize}
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {t("recommendations.overallScore")}: <span className={cn("font-bold", getScoreColor(guestRecommendation.overallScore))}>{guestRecommendation.overallScore}%</span>
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t("history.clothingType")}:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {t(`clothing.${guestRecommendation.clothingType}`)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t("recommendations.fabric")}:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {t(`fabric.${guestRecommendation.fabricType}`)}
                    </span>
                  </div>
                </div>
              </div>

              {availableSizes.length === 0 && (
                <div className="flex flex-col items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t("avatar.yourBody")}
                  </h4>
                  <BodyAvatar
                    gender={(guestProfile.gender as "male" | "female" | "other") || "female"}
                    measurements={{
                      chest: guestProfile.chest,
                      waist: guestProfile.waist,
                      hip: guestProfile.hip,
                      shoulder: guestProfile.shoulder,
                      height: guestProfile.height,
                      weight: guestProfile.weight,
                    }}
                    showLabels={true}
                    showPulse={false}
                    size="md"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {availableSizes.length > 0 && (
            <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl rounded-3xl overflow-hidden">
              <CardContent className="p-6 md:p-8">
                <h3 className="text-xl font-bold text-center text-indigo-700 dark:text-indigo-400 mb-6">
                  {t("recommendations.measurementComparison")}
                </h3>

                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  {availableSizes.map((size) => {
                    const isSelected = selectedSize === size;
                    const isRecommended = size === guestRecommendation.recommendedSize;
                    return (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={cn(
                          "relative px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200",
                          isSelected
                            ? "bg-indigo-600 text-white shadow-lg scale-105"
                            : isRecommended
                              ? "bg-green-100 text-green-700 border-2 border-green-300 hover:bg-green-200"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                        )}
                      >
                        {isRecommended && !isSelected && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></span>
                        )}
                        {size}
                      </button>
                    );
                  })}
                </div>

                {selectedSize && (
                  <div className="flex flex-col items-center">
                    <div className="mb-6">
                      <BodyAvatar
                        gender={(guestProfile.gender as "male" | "female" | "other") || "female"}
                        measurements={{
                          chest: guestProfile.chest,
                          waist: guestProfile.waist,
                          hip: guestProfile.hip,
                          shoulder: guestProfile.shoulder,
                          height: guestProfile.height,
                          weight: guestProfile.weight,
                        }}
                        overlays={avatarOverlays}
                        showLabels={true}
                        showPulse={true}
                        highlightRecommended={overallFit === "perfect" ? "chest" : null}
                        size="lg"
                      />
                    </div>
                    
                    <div className="mb-6">
                      <BodyAvatarLegend />
                    </div>

                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {t("recommendations.sizeRecommendation")} {selectedSize}
                      </h3>
                      {selectedSize === guestRecommendation.recommendedSize && (
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
                          {t("recommendations.recommended")}
                        </span>
                      )}
                    </div>

                    <div className="w-full max-w-md space-y-3">
                      {fitDetails.map((detail) => (
                        <div key={detail.key} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <div className={cn("w-4 h-4 rounded-full flex-shrink-0", getFitIndicatorColor(detail.status))} />
                          <span className="text-gray-800 dark:text-gray-200 text-sm flex-1">
                            {detail.label}: {translateStatus(detail.status, t)} ({detail.userValue} {t("recommendations.cmInRange")} {Math.floor(detail.chartValue * 0.95)}-{Math.ceil(detail.chartValue * 1.05)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <GradientButton onClick={handleSignUp} className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              {t("guest.signUpToSave")}
            </GradientButton>
            <Button
              variant="outline"
              onClick={() => {
                endGuestSession();
                setLocation("/");
              }}
            >
              {t("recommendations.startOver")}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showConversionPrompt} onOpenChange={setShowConversionPrompt}>
        <DialogContent className="max-w-md" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">
              {t("guest.conversionPrompt")}
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              {t("guest.conversionPromptDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {t("landing.features.smartMeasurements")}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {t("wallet.digitalWallet")}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {t("history.recommendationHistory")}
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <GradientButton onClick={handleSignUp} className="w-full flex items-center justify-center gap-2">
                {t("guest.createFreeAccount")}
                <ArrowRight className="w-4 h-4" />
              </GradientButton>
              <Button
                variant="ghost"
                onClick={() => setShowConversionPrompt(false)}
                className="w-full"
              >
                {t("guest.maybeLayer")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
