import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { ProgressStepper } from "@/components/ProgressStepper";
import { BodyAvatar, BodyAvatarLegend } from "@/components/BodyAvatar";
import { Check, ArrowLeft, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Recommendation, Profile } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const getSteps = (t: any) => [
  { id: 1, name: t("profile.createProfile") },
  { id: 2, name: t("clothing.selectClothing") },
  { id: 3, name: t("fabric.selectFabric") },
  { id: 4, name: t("recommendations.recommendations") },
];

// Helper to parse the analysis data
function parseMeasurementComparisons(recommendation: Recommendation): any {
  try {
    let analysisData = recommendation.analysis;
    let sizeChartData = recommendation.sizeChartData;

    // Parse analysis if it's a string (might be plain text or JSON)
    if (typeof recommendation.analysis === "string") {
      try {
        analysisData = JSON.parse(recommendation.analysis);
      } catch (e) {
        // Keep as string if parse fails (analysis might be plain text)
        analysisData = recommendation.analysis;
      }
    }

    // Parse sizeChartData if it's a string
    if (typeof recommendation.sizeChartData === "string") {
      try {
        sizeChartData = JSON.parse(recommendation.sizeChartData);
      } catch (e) {
        console.error('Failed to parse size chart data:', e);
        sizeChartData = {} as any;
      }
    }

    return { analysisData, sizeChartData };
  } catch (error) {
    console.error('Error parsing recommendation data:', error);
    return { analysisData: null, sizeChartData: {} };
  }
}

// Helper to translate confidence level
function translateConfidence(confidence: string, t: any): string {
  const confidenceLower = confidence.toLowerCase();
  if (confidenceLower.includes("perfect")) return t("recommendations.perfect");
  if (confidenceLower.includes("good")) return t("recommendations.good");
  if (confidenceLower.includes("loose")) return t("recommendations.loose");
  if (confidenceLower.includes("tight")) return t("recommendations.tight");
  return confidence;
}

// Helper to get confidence badge styling
function getConfidenceBadgeStyle(confidence: string): string {
  const confidenceLower = confidence.toLowerCase();
  if (confidenceLower.includes("perfect")) return "bg-green-500 text-white";
  if (confidenceLower.includes("good")) return "bg-blue-500 text-white";
  if (confidenceLower.includes("loose")) return "bg-yellow-500 text-white";
  if (confidenceLower.includes("tight")) return "bg-red-500 text-white";
  return "bg-gray-500 text-white";
}

// Helper to get measurement card border color
function getMeasurementBorderColor(status: string): string {
  const statusLower = status.toLowerCase();
  if (statusLower.includes("perfect")) return "border-green-500 border-l-4";
  if (statusLower.includes("good")) return "border-blue-500 border-l-4";
  if (statusLower.includes("loose")) return "border-yellow-500 border-l-4";
  if (statusLower.includes("tight")) return "border-red-500 border-l-4";
  return "border-gray-300 border-l-4";
}

// Helper to translate status - with special handling for length measurements
function translateStatus(status: string, t: any, measurementKey?: string): string {
  const statusLower = status.toLowerCase();
  const isLengthMeasurement = measurementKey && 
    ['inseam', 'armLength', 'legLength', 'thighCircumference'].includes(measurementKey);
  
  if (statusLower.includes("perfect")) return t("recommendations.perfect");
  if (statusLower.includes("good")) return t("recommendations.good");
  
  // For length measurements, use short/long instead of tight/loose
  if (isLengthMeasurement) {
    if (statusLower.includes("loose")) return t("recommendations.long");
    if (statusLower.includes("tight")) return t("recommendations.short");
  } else {
    if (statusLower.includes("loose")) return t("recommendations.loose");
    if (statusLower.includes("tight")) return t("recommendations.tight");
  }
  return status;
}

// Helper to get status badge color
function getStatusBadgeColor(status: string): string {
  const statusLower = status.toLowerCase();
  if (statusLower.includes("perfect") || statusLower.includes("ideal")) return "bg-green-100 text-green-700 border-green-200";
  if (statusLower.includes("good")) return "bg-blue-100 text-blue-700 border-blue-200";
  if (statusLower.includes("loose")) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (statusLower.includes("tight")) return "bg-red-100 text-red-700 border-red-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

// Helper to get fit indicator dot color
function getFitIndicatorColor(status: string): string {
  const statusLower = status.toLowerCase();
  if (statusLower.includes("perfect") || statusLower.includes("ideal")) return "bg-green-500";
  if (statusLower.includes("good")) return "bg-blue-500";
  if (statusLower.includes("loose")) return "bg-yellow-500";
  if (statusLower.includes("tight")) return "bg-red-500";
  return "bg-gray-400";
}

// Fabric-specific ease factor configuration
// difference = productMeasurement - userMeasurement
// positive difference = product larger than body = more ease (loose)
// negative difference = product smaller than body = tight
interface FabricEaseConfig {
  perfectMin: number;  // Min difference for "perfect" fit
  perfectMax: number;  // Max difference for "perfect" fit
  tightThreshold: number;  // Below this = "tight"
  looseThreshold: number;  // Above this = "loose"
}

const FABRIC_EASE_CONFIGS: Record<string, FabricEaseConfig> = {
  // Rigid/Woven (قماش قاسي): needs positive ease (+2 to +4 cm) for comfort
  rigid: {
    perfectMin: 2,      // Product should be at least 2cm larger
    perfectMax: 4,      // Up to 4cm larger is still perfect
    tightThreshold: 0,  // Anything at 0 or below is tight
    looseThreshold: 6,  // More than 6cm larger is loose
  },
  // Normal/Blended (قماش عادي): moderate tolerance around 0
  normal: {
    perfectMin: -1.5,   // 1.5cm smaller is okay
    perfectMax: 2,      // 2cm larger is okay
    tightThreshold: -3, // More than 3cm smaller is tight
    looseThreshold: 4,  // More than 4cm larger is loose
  },
  // Elastic/Stretch (قماش مطاطي): allows negative ease (body-hugging)
  stretchy: {
    perfectMin: -4,     // Can be up to 4cm smaller (stretches)
    perfectMax: 1,      // Up to 1cm larger is still body-hugging
    tightThreshold: -6, // More than 6cm smaller is too tight even for stretch
    looseThreshold: 3,  // More than 3cm larger loses the fitted look
  },
};

// Helper to calculate fit status for a specific size measurement with fabric consideration
// difference = productMeasurement - userMeasurement (STANDARDIZED)
// positive = product larger = more ease (towards loose)
// negative = product smaller = less ease (towards tight)
function calculateFitStatus(
  userValue: number, 
  chartValue: number, 
  fabricType: string = "normal"
): { status: string; difference: number } {
  // STANDARDIZED: difference = product - user
  const difference = parseFloat((chartValue - userValue).toFixed(1));
  
  const config = FABRIC_EASE_CONFIGS[fabricType] || FABRIC_EASE_CONFIGS.normal;
  
  // 1. PERFECT fit
  if (difference >= config.perfectMin && difference <= config.perfectMax) {
    return { status: "perfect", difference };
  } 
  
  // 2. TIGHT side (Product is smaller than body, difference is negative)
  if (difference < config.perfectMin) { 
    return { status: "tight", difference };
  }
  
  // 3. LOOSE side (Product is larger than body, difference is positive)
  if (difference > config.perfectMax) {
    return { status: "loose", difference };
  }
  
  // Fallback
  return { status: "good", difference };
}

// Size comparison item for the collapsible section
interface SizeComparisonItemProps {
  measurementLabel: string;
  userValue: number;
  rangeMin: number;
  rangeMax: number;
  status: string;
  t: any;
}

function SizeComparisonItem({ measurementLabel, userValue, rangeMin, rangeMax, status, t }: SizeComparisonItemProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className={cn("w-3 h-3 rounded-full flex-shrink-0", getFitIndicatorColor(status))} />
      <span className="text-gray-800 dark:text-gray-200 text-sm flex-1">
        {measurementLabel}: {translateStatus(status, t)} ({userValue} {t("recommendations.cmInRange")} {rangeMin}-{rangeMax})
      </span>
    </div>
  );
}

// Measurement comparison card
interface MeasurementCardProps {
  label: string;
  yourMeasurement: number | string;
  sizeChartValue: number | string;
  difference?: number | string;
  status: string;
  measurementKey?: string;
  t: any;
}

function MeasurementComparisonCard({ 
  label, 
  yourMeasurement, 
  sizeChartValue, 
  difference, 
  status,
  measurementKey,
  t
}: MeasurementCardProps) {
  return (
    <Card className={cn("border bg-white", getMeasurementBorderColor(status))}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-semibold text-gray-900 break-words text-sm sm:text-base leading-tight min-w-0 flex-1">{label}</h3>
          <span className={cn("px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border whitespace-nowrap flex-shrink-0", getStatusBadgeColor(status))}>
            {translateStatus(status, t, measurementKey)}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-gray-500 mb-1 break-words leading-relaxed">{t("recommendations.yourMeasurement")}</p>
            <p className="text-base sm:text-lg font-bold text-gray-900 break-words">{yourMeasurement} <span className="text-xs sm:text-sm">cm</span></p>
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-gray-500 mb-1 break-words leading-relaxed">{t("recommendations.sizeChart")}</p>
            <p className="text-base sm:text-lg font-bold text-gray-900 break-words">{sizeChartValue} <span className="text-xs sm:text-sm">cm</span></p>
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-gray-500 mb-1 break-words leading-relaxed">{t("recommendations.difference")}</p>
            <p className="text-base sm:text-lg font-bold text-gray-900 break-words">{difference || '0.0'} <span className="text-xs sm:text-sm">cm</span></p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Recommendations() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const params = new URLSearchParams(window.location.search);
  const recommendationId = params.get("id");
  
  const steps = getSteps(t);

  const { data: recommendation, isLoading } = useQuery<Recommendation>({
    queryKey: ["/api/recommendations", recommendationId],
    enabled: !!recommendationId,
  });

  // Fetch user's profile to get their actual measurements
  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profile"],
    enabled: !!recommendation,
  });

  // Set default selected size to recommended size when recommendation loads
  useEffect(() => {
    if (recommendation && !selectedSize) {
      setSelectedSize(recommendation.recommendedSize);
    }
  }, [recommendation, selectedSize]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        {/* Navigation */}
        <Navbar />

        {/* Loading State */}
        <div className="pt-24 pb-12 px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <ProgressStepper steps={steps} currentStep={3} variant="light" />
            
            <div className="mt-12 text-center space-y-6">
              {/* Purple Circle with 4 */}
              <div className="flex justify-center mb-8">
                <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg">
                  <span className="text-4xl font-bold text-white">4</span>
                </div>
              </div>
              
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 break-words leading-tight">
                {t("recommendations.smartRecommendation")}
              </h2>
              <p className="text-gray-600 break-words text-sm sm:text-base leading-relaxed">{t("recommendations.aiAnalysisComplete")}</p>
              
              {/* Loading Spinner */}
              <div className="flex justify-center mt-8">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md bg-white">
          <p className="text-gray-900 text-xl mb-4 break-words">{t("recommendations.notFound")}</p>
          <Button
            onClick={() => setLocation("/dashboard")}
            className="bg-gray-900 hover:bg-gray-800 text-white whitespace-nowrap"
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="w-4 h-4 mr-2 [dir='rtl']:mr-0 [dir='rtl']:ml-2" />
            {t("recommendations.backToDashboard")}
          </Button>
        </Card>
      </div>
    );
  }

  const { analysisData, sizeChartData } = parseMeasurementComparisons(recommendation);

  // Get measurements for the recommended size from size chart
  // sizeChartData is already the extractedSizes object, e.g., {"M": {"chest": 90, ...}, "L": {...}}
  const recommendedSizeMeasurements = sizeChartData?.[recommendation.recommendedSize] || {};
  
  // Build comparison data by matching user's profile measurements with size chart measurements
  const measurementComparisons: Array<{
    key: string;
    label: string;
    userValue: number;
    chartValue: number;
    difference: number;
    status: string;
  }> = [];

  if (profile && recommendedSizeMeasurements && Object.keys(recommendedSizeMeasurements).length > 0) {
    // Map of measurement keys to labels - comprehensive for all clothing types
    const measurementMap: Record<string, string> = {
      chest: t("recommendations.chestCircumference"),
      waist: t("recommendations.waistCircumference"),
      hip: t("recommendations.hipCircumference"),
      shoulder: t("recommendations.shoulderWidth"),
      armLength: t("recommendations.armLength"),
      legLength: t("recommendations.legLength"),
      thighCircumference: t("recommendations.thighCircumference"),
      inseam: t("recommendations.inseam"),
      thigh: t("recommendations.thighCircumference"),
    };

    // Check each measurement in the size chart
    Object.entries(recommendedSizeMeasurements).forEach(([key, chartValue]) => {
      if (key === "size" || typeof chartValue !== "number") return;
      
      // Get corresponding user measurement
      let userKey = key;
      // Handle different naming conventions (e.g., "armLength" vs "arm_length")
      if (key.includes("_")) {
        userKey = key.replace(/_./g, (match) => match.charAt(1).toUpperCase());
      }
      
      const userValue = profile[userKey as keyof typeof profile];
      if (typeof userValue !== "number") return;

      // Use fabric-aware fit calculation
      const { status, difference } = calculateFitStatus(userValue, chartValue, recommendation.fabricType);

      measurementComparisons.push({
        key,
        label: measurementMap[userKey] || `${key.charAt(0).toUpperCase() + key.slice(1)} (cm)`,
        userValue,
        chartValue,
        difference,
        status: status.charAt(0).toUpperCase() + status.slice(1), // Capitalize for consistency
      });
    });
  }

  // PRIORITY RULE: Derive actual confidence from detailed comparisons
  // If ANY key measurement is "Tight", the overall must be "Tight"
  // If ANY key measurement is "Loose", and none are "Tight", overall is "Loose"
  // Otherwise, it's "Perfect" or "Good"
  const deriveActualConfidence = (): string => {
    if (measurementComparisons.length === 0) {
      return recommendation.confidence; // Fallback to AI confidence
    }
    
    const hasTight = measurementComparisons.some(m => 
      m.status.toLowerCase().includes("tight")
    );
    const hasLoose = measurementComparisons.some(m => 
      m.status.toLowerCase().includes("loose")
    );
    const allPerfect = measurementComparisons.every(m => 
      m.status.toLowerCase().includes("perfect")
    );
    
    if (hasTight) {
      return "Tight"; // Priority: Tight overrides everything
    } else if (hasLoose) {
      return "Loose";
    } else if (allPerfect) {
      return "Perfect";
    } else {
      return "Good";
    }
  };
  
  const actualConfidence = deriveActualConfidence();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <Navbar />

      {/* Content */}
      <div className="pt-12 pb-12 px-4 md:px-6">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Progress Stepper */}
          <ProgressStepper steps={steps} currentStep={3} variant="light" />

          {/* Main Card with Purple Theme */}
          <Card className="bg-white shadow-lg border-0" data-testid="card-recommendation-main">
            <CardContent className="p-8 md:p-12">
              {/* Purple Circle with 4 */}
              <div className="flex justify-center mb-8">
                <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg">
                  <span className="text-4xl font-bold text-white">4</span>
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 break-words leading-tight">
                  {t("recommendations.smartRecommendation")}
                </h2>
                <p className="text-gray-600 break-words text-sm sm:text-base leading-relaxed">{t("recommendations.aiAnalysisComplete")}</p>
              </div>

              {/* Confidence Badge - Uses derived confidence from detailed analysis */}
              <div className="flex justify-center mb-8">
                <div className={cn(
                  "px-6 sm:px-8 py-3 sm:py-4 rounded-2xl flex items-center gap-3 shadow-md min-w-0 max-w-full",
                  getConfidenceBadgeStyle(actualConfidence)
                )}>
                  <Check className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                  <div className="text-left [dir='rtl']:text-right min-w-0">
                    <div className="text-lg sm:text-xl font-bold break-words leading-tight">{translateConfidence(actualConfidence, t)}</div>
                    <div className="text-xs sm:text-sm opacity-90 break-words leading-relaxed">{t("recommendations.confidenceLevel")}</div>
                  </div>
                </div>
              </div>

              {/* Recommended Size */}
              <div className="text-center mb-8">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 break-words leading-tight">
                  {t("recommendations.recommendedSize")}
                </h3>
                <div className="text-6xl sm:text-7xl md:text-8xl font-bold text-indigo-600 mb-4 leading-none" data-testid="text-recommended-size">
                  {recommendation.recommendedSize}
                </div>
                <p className="text-gray-600 break-words text-sm sm:text-base leading-relaxed" data-testid="text-match-score">
                  {t("recommendations.overallScore")}: <span className="font-bold text-gray-900">{recommendation.matchScore}%</span>
                </p>
              </div>

              {/* Fabric Info */}
              <div className="bg-gray-50 rounded-lg p-4 sm:p-5 mb-6">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">👕</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 break-words text-sm sm:text-base leading-tight">
                      {t(`fabric.${recommendation.fabricType}`)} {t("recommendations.fabric")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Measurement Comparisons - Real Data */}
          {measurementComparisons.length > 0 && (
            <div className="space-y-6">
              {/* Section Header */}
              <h3 className="text-xl sm:text-2xl font-bold text-center text-indigo-700 mb-6">
                {t("recommendations.measurementComparison")}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {measurementComparisons.map((comparison) => (
                  <MeasurementComparisonCard
                    key={comparison.key}
                    label={comparison.label}
                    yourMeasurement={comparison.userValue}
                    sizeChartValue={comparison.chartValue}
                    difference={comparison.difference}
                    status={comparison.status}
                    measurementKey={comparison.key}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Visual Separator between AI Recommendation and Size Comparison Tool */}
          <div className="relative py-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-gray-300"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-gray-100 px-6 py-2 text-xl sm:text-2xl text-indigo-700 font-bold rounded-lg">
                {t("recommendations.compareAllSizes")}
              </span>
            </div>
          </div>

          {/* Interactive Size Comparison - Tabbed Interface */}
          {sizeChartData && Object.keys(sizeChartData).length > 0 && profile && (
            <Card className="bg-white shadow-lg border-0">
              <CardContent className="p-6 md:p-8">
                {/* Size Selection Tabs */}
                <div className="flex justify-center gap-2 sm:gap-3 mb-8 flex-wrap">
                  {Object.keys(sizeChartData).map((size) => {
                    const isSelected = size === selectedSize;
                    const isRecommended = size === recommendation.recommendedSize;
                    return (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={cn(
                          "w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-base sm:text-lg font-bold border-2 transition-all cursor-pointer",
                          isSelected
                            ? "bg-gray-900 text-white border-gray-900 shadow-lg scale-110"
                            : "bg-white text-gray-700 border-gray-300 hover:border-gray-500 hover:bg-gray-50"
                        )}
                        data-testid={`size-tab-${size.toLowerCase()}`}
                      >
                        {isRecommended && !isSelected && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></span>
                        )}
                        {size}
                      </button>
                    );
                  })}
                </div>

                {/* Body Diagram with Fit Indicators */}
                {selectedSize && sizeChartData[selectedSize] && (() => {
                  const sizeMeasurements = sizeChartData[selectedSize];
                  const isRecommended = selectedSize === recommendation.recommendedSize;
                  
                  const measurementMap: Record<string, string> = {
                    chest: t("recommendations.chestLabel"),
                    waist: t("recommendations.waistLabel"),
                    hip: t("recommendations.hipLabel"),
                    shoulder: t("recommendations.shoulderLabel"),
                    armLength: t("recommendations.armLengthLabel"),
                    legLength: t("recommendations.legLengthLabel"),
                    thighCircumference: t("recommendations.thighLabel"),
                    inseam: t("recommendations.inseamLabel"),
                    thigh: t("recommendations.thighLabel"),
                  };

                  const fitDetails: Array<{
                    key: string;
                    label: string;
                    userValue: number;
                    chartValue: number;
                    status: string;
                  }> = [];

                  Object.entries(sizeMeasurements).forEach(([key, chartValue]) => {
                    if (key === "size" || typeof chartValue !== "number") return;
                    
                    let userKey = key;
                    if (key.includes("_")) {
                      userKey = key.replace(/_./g, (match) => match.charAt(1).toUpperCase());
                    }
                    
                    const userValue = profile[userKey as keyof typeof profile];
                    if (typeof userValue !== "number") return;

                    // Use fabric-aware fit calculation
                    const { status } = calculateFitStatus(userValue, chartValue as number, recommendation.fabricType);
                    
                    fitDetails.push({
                      key,
                      label: measurementMap[userKey] || key,
                      userValue,
                      chartValue: chartValue as number,
                      status,
                    });
                  });

                  const overallFit = fitDetails.length > 0 
                    ? fitDetails.every(f => f.status === "perfect") 
                      ? "perfect" 
                      : fitDetails.some(f => f.status === "tight") 
                        ? "tight" 
                        : fitDetails.some(f => f.status === "loose") 
                          ? "loose" 
                          : "good"
                    : "unknown";

                  const getFitStatusType = (status: string): "perfect" | "good" | "loose" | "tight" | "neutral" => {
                    if (status === "perfect") return "perfect";
                    if (status === "loose") return "loose";
                    if (status === "tight") return "tight";
                    return "good";
                  };

                  const chestDetail = fitDetails.find(d => d.key === "chest");
                  const waistDetail = fitDetails.find(d => d.key === "waist");
                  const hipDetail = fitDetails.find(d => d.key === "hip");

                  const avatarOverlays = [
                    chestDetail && {
                      type: "chest" as const,
                      value: chestDetail.userValue,
                      fitStatus: getFitStatusType(chestDetail.status),
                      label: t("measurements.chest"),
                    },
                    waistDetail && {
                      type: "waist" as const,
                      value: waistDetail.userValue,
                      fitStatus: getFitStatusType(waistDetail.status),
                      label: t("measurements.waist"),
                    },
                    hipDetail && {
                      type: "hip" as const,
                      value: hipDetail.userValue,
                      fitStatus: getFitStatusType(hipDetail.status),
                      label: t("measurements.hip"),
                    },
                  ].filter(Boolean) as any[];

                  return (
                    <div className="flex flex-col items-center">
                      {/* Professional Body Avatar with Dynamic Proportions */}
                      <div className="mb-6">
                        <BodyAvatar
                          gender={(profile?.gender as "male" | "female" | "other") || "male"}
                          measurements={{
                            chest: profile?.chest,
                            waist: profile?.waist,
                            hip: profile?.hip,
                            shoulder: profile?.shoulder,
                            height: profile?.height,
                            weight: profile?.weight,
                          }}
                          overlays={avatarOverlays}
                          showLabels={true}
                          showPulse={true}
                          highlightRecommended={overallFit === "perfect" ? "chest" : null}
                          size="lg"
                        />
                      </div>
                      
                      {/* Fit Legend */}
                      <div className="mb-6">
                        <BodyAvatarLegend />
                      </div>

                      {/* Size Title */}
                      <div className="text-center mb-6">
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                          {t("recommendations.sizeRecommendation")} {selectedSize}
                        </h3>
                        {isRecommended && (
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
                            {t("recommendations.recommended")}
                          </span>
                        )}
                      </div>

                      {/* Fit Details List */}
                      <div className="w-full max-w-md space-y-3" dir="auto">
                        {fitDetails.map((detail) => (
                          <div key={detail.key} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                            <div className={cn("w-4 h-4 rounded-full flex-shrink-0", getFitIndicatorColor(detail.status))} />
                            <span className="text-gray-800 dark:text-gray-200 text-sm sm:text-base flex-1">
                              {detail.label}: {translateStatus(detail.status, t)} ({detail.userValue} {t("recommendations.cmInRange")} {Math.floor(detail.chartValue * 0.95)}-{Math.ceil(detail.chartValue * 1.05)})
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Final Recommendation */}
                      <div className="mt-6 pt-4 border-t border-gray-200 w-full max-w-md text-center">
                        <p className="text-gray-700 text-base sm:text-lg">
                          {t("recommendations.finalRecommendation")}: 
                          <span className={cn(
                            "font-bold ms-2",
                            overallFit === "perfect" ? "text-green-600" : 
                            overallFit === "loose" ? "text-yellow-600" : 
                            overallFit === "tight" ? "text-red-600" : "text-gray-700"
                          )}>
                            {translateStatus(overallFit, t)}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Button
              onClick={() => setLocation("/clothing-selection")}
              variant="outline"
              size="lg"
              className="bg-gray-500 hover:bg-gray-600 text-white border-0 px-6 sm:px-8 whitespace-nowrap text-sm sm:text-base"
              data-testid="button-start-over"
            >
              {t("recommendations.startOver")}
            </Button>
            <Button
              onClick={() => setLocation("/dashboard")}
              size="lg"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 px-6 sm:px-8 whitespace-nowrap text-sm sm:text-base"
              data-testid="button-view-dashboard"
            >
              <Home className="w-5 h-5 mr-2 [dir='rtl']:mr-0 [dir='rtl']:ml-2 flex-shrink-0" />
              {t("recommendations.viewDashboard")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
