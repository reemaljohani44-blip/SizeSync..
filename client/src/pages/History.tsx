import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { Navbar } from "@/components/Navbar";
import { ArrowLeft, Clock, Shirt, Tag, TrendingUp, Trash2 } from "lucide-react";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Recommendation } from "@shared/schema";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function History() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: recommendations, isLoading, error } = useQuery<Recommendation[]>({
    queryKey: ["/api/recommendations"],
    queryFn: getQueryFn<Recommendation[]>({ on401: "throw" }),
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/recommendations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      toast({
        title: t("history.deleted"),
        description: t("history.deletedDesc"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getClothingTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      't-shirt': t('clothing.tShirt'),
      'pants': t('clothing.pants'),
      'dress': t('clothing.dress'),
      'jacket': t('clothing.jacket'),
      'formal-shirt': t('clothing.formalShirt'),
      'shorts': t('clothing.shorts'),
    };
    return labels[type] || type;
  };

  const getFabricTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'stretchy': t('fabric.stretchy'),
      'normal': t('fabric.normal'),
      'rigid': t('fabric.rigid'),
    };
    return labels[type] || type;
  };

  const translateConfidence = (confidence: string) => {
    const confidenceLower = confidence.toLowerCase();
    if (confidenceLower.includes("perfect")) return t("recommendations.perfect");
    if (confidenceLower.includes("good")) return t("recommendations.good");
    if (confidenceLower.includes("loose")) return t("recommendations.loose");
    if (confidenceLower.includes("tight")) return t("recommendations.tight");
    return confidence;
  };

  const getConfidenceBadgeColor = (confidence: string) => {
    const colors: Record<string, string> = {
      'Perfect': 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-lg',
      'Good': 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-lg',
      'Loose': 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-lg',
    };
    return colors[confidence] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-950 dark:via-indigo-950/30 dark:to-purple-950/30 relative overflow-hidden">
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <Navbar />
        <div className="pt-24 pb-12 px-4 md:px-6 relative flex items-center justify-center min-h-[60vh]">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-gray-100/50 dark:border-gray-800/50 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400 font-medium break-words">{t("history.loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error("Error loading recommendations:", error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-950 dark:via-indigo-950/30 dark:to-purple-950/30 relative overflow-hidden">
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <Navbar />
        <div className="pt-24 pb-12 px-4 md:px-6 relative">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-gray-100/50 dark:border-gray-800/50 p-12 text-center" data-testid="card-error-state">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 break-words">
                {t("history.errorLoading")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 break-words">
                {error instanceof Error ? error.message : t("history.failedToLoad")}
              </p>
              <GradientButton
                onClick={() => window.location.reload()}
                data-testid="button-retry"
                className="whitespace-nowrap"
              >
                {t("common.retry")}
              </GradientButton>
            </div>
          </div>
        </div>
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
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              data-testid="button-back"
              className="h-10 w-10 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 [dir='rtl']:rotate-180" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 dark:from-white dark:via-indigo-200 dark:to-purple-200 bg-clip-text text-transparent break-words leading-tight">
                {t("history.recommendationHistory")}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base break-words leading-relaxed">
                {t("history.viewAndManage")}
              </p>
            </div>
          </div>

          {/* Recommendations List */}
          {!recommendations || recommendations.length === 0 ? (
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-gray-100/50 dark:border-gray-800/50 p-12 text-center relative overflow-hidden" data-testid="card-empty-state">
              {/* Decorative gradient accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 break-words">
                {t("history.noRecommendationsYet")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 text-base break-words">
                {t("history.startByAnalyzing")}
              </p>
              <GradientButton
                onClick={() => navigate("/clothing-selection")}
                data-testid="button-get-started"
                className="h-12 px-8 text-base font-semibold shadow-lg hover:shadow-xl whitespace-nowrap"
              >
                {t("history.getStarted")}
              </GradientButton>
            </div>
          ) : (
            <div className="space-y-5">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-lg border-2 border-gray-200/50 dark:border-gray-800/50 hover:shadow-xl hover:border-indigo-300/50 dark:hover:border-indigo-700/50 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group min-w-0"
                  data-testid={`card-recommendation-${rec.id}`}
                >
                  {/* Decorative gradient accent */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                  
                  <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 min-w-0">
                      {/* Left: Recommendation Info */}
                      <div className="flex-1 space-y-4 min-w-0">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className={`px-5 py-2.5 rounded-xl text-sm sm:text-base font-bold shadow-md break-words whitespace-normal ${getConfidenceBadgeColor(rec.confidence)}`}>
                            {translateConfidence(rec.confidence)} {t("history.fit")}
                          </div>
                          <div className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 dark:from-white dark:via-indigo-200 dark:to-purple-200 bg-clip-text text-transparent break-words leading-tight">
                            {t("history.size")} {rec.recommendedSize}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-4 sm:gap-6 text-sm sm:text-base">
                          <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5 rounded-lg min-w-0">
                            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Shirt className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <span className="font-semibold text-gray-700 dark:text-gray-300 break-words min-w-0">{getClothingTypeLabel(rec.clothingType)}</span>
                          </div>
                          <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5 rounded-lg min-w-0">
                            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="font-semibold text-gray-700 dark:text-gray-300 break-words min-w-0">{getFabricTypeLabel(rec.fabricType)}</span>
                          </div>
                          <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5 rounded-lg min-w-0">
                            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="font-semibold text-gray-700 dark:text-gray-300 break-words min-w-0">{rec.matchScore}% {t("history.match")}</span>
                          </div>
                          <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5 rounded-lg min-w-0">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="font-semibold text-gray-700 dark:text-gray-300 break-words min-w-0">{format(new Date(rec.createdAt), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex gap-3 flex-shrink-0">
                        <GradientButton
                          onClick={() => navigate(`/recommendations?id=${rec.id}`)}
                          data-testid={`button-view-${rec.id}`}
                          className="h-11 px-4 sm:px-6 text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg whitespace-nowrap flex-shrink-0"
                        >
                          {t("history.viewDetails")}
                        </GradientButton>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-delete-${rec.id}`}
                              className="h-11 w-11 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 border-2 border-transparent hover:border-red-200 dark:hover:border-red-800"
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 break-words">{t("history.deleteRecommendation")}</AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-600 dark:text-gray-400 break-words">
                                {t("history.deleteConfirmDesc")}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-3">
                              <AlertDialogCancel 
                                data-testid="button-cancel-delete"
                                className="h-11 px-6 rounded-xl border-2 whitespace-nowrap"
                              >
                                {t("common.cancel")}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(rec.id)}
                                data-testid="button-confirm-delete"
                                className="bg-red-600 hover:bg-red-700 h-11 px-6 rounded-xl whitespace-nowrap"
                              >
                                {t("history.delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
