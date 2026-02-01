import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/Navbar";
import { GradientButton } from "@/components/GradientButton";
import { useGuest } from "@/hooks/useGuest";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Upload, ArrowLeft, Check, Loader2 } from "lucide-react";

const FABRIC_TYPES = [
  { id: "stretchy", tolerance: 3 },
  { id: "normal", tolerance: 2 },
  { id: "rigid", tolerance: 1 },
];

export default function GuestFabricUpload() {
  const { t, i18n } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isGuest, guestProfile, setGuestRecommendation } = useGuest();
  const [selectedFabric, setSelectedFabric] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState("");
  const isRTL = i18n.language === "ar";

  const clothingType = sessionStorage.getItem("sizesync_guest_clothing_type");

  useEffect(() => {
    if (!isGuest || !guestProfile || !clothingType) {
      setLocation("/guest/profile");
    }
  }, [isGuest, guestProfile, clothingType, setLocation]);

  const handleImageUpload = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: t("fabric.invalidFile"),
        description: t("fabric.invalidFileDesc"),
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [toast, t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  }, [handleImageUpload]);

  const handleAnalyze = async () => {
    if (!imageFile || !selectedFabric || !guestProfile) return;

    setIsAnalyzing(true);
    setAnalysisStatus(t("fabric.compressingImage"));

    const reader = new FileReader();
    reader.onerror = () => {
      console.error("FileReader error");
      toast({
        title: t("fabric.imageProcessingFailed"),
        description: t("fabric.imageNotClear"),
        variant: "destructive",
      });
      setIsAnalyzing(false);
      setAnalysisStatus("");
    };
    reader.onload = async (e) => {
      try {
        const base64Image = e.target?.result as string;
        
        setAnalysisStatus(t("fabric.uploadingImage"));

        const response = await fetch("/api/analyze-size-chart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Image,
            clothingType,
            fabricType: selectedFabric,
            userProfile: guestProfile,
          }),
        });

        if (!response.ok) {
          throw new Error("Analysis failed");
        }

        setAnalysisStatus(t("fabric.processingImage"));
        const result = await response.json();

        setGuestRecommendation({
          clothingType: clothingType || "",
          fabricType: selectedFabric,
          recommendedSize: result.recommendedSize || result.recommendation?.recommendedSize || "M",
          confidence: result.confidence || result.recommendation?.confidence || "good",
          overallScore: result.overallScore || result.recommendation?.overallScore || 75,
          analysis: result,
          sizeChartData: result.sizeChartData || result.recommendation?.sizeChartData,
          createdAt: new Date().toISOString(),
        });

        setLocation("/guest/recommendations");
      } catch (error) {
        console.error("Analysis error:", error);
        toast({
          title: t("fabric.imageProcessingFailed"),
          description: t("fabric.imageNotClear"),
          variant: "destructive",
        });
        setIsAnalyzing(false);
        setAnalysisStatus("");
      }
    };
    reader.readAsDataURL(imageFile);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir={isRTL ? "rtl" : "ltr"}>
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg flex items-start gap-3">
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

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 md:p-8">
          <button
            onClick={() => setLocation("/guest/clothing-selection")}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("common.back")}
          </button>

          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t("fabric.fabricAndSizeChart")}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t("fabric.fabricAndSizeChartDesc")}
            </p>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t("fabric.selectFabric")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {FABRIC_TYPES.map((fabric) => (
                <button
                  key={fabric.id}
                  onClick={() => setSelectedFabric(fabric.id)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    selectedFabric === fabric.id
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                      : "border-gray-200 dark:border-gray-700 hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {t(`fabric.${fabric.id}`)}
                    </span>
                    {selectedFabric === fabric.id && (
                      <Check className="w-5 h-5 text-indigo-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t(`fabric.${fabric.id}Desc`)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t("fabric.uploadSizeChart")}
            </h3>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                imagePreview
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-indigo-400"
              }`}
            >
              {imagePreview ? (
                <div>
                  <img
                    src={imagePreview}
                    alt="Size chart preview"
                    className="max-h-64 mx-auto rounded-lg mb-4"
                  />
                  <p className="text-green-600 dark:text-green-400 font-medium">
                    {t("fabric.sizeChartUploaded")}
                  </p>
                  <button
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="mt-2 text-sm text-gray-500 hover:text-red-500"
                  >
                    {t("common.delete")}
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    {t("fabric.dragAndDrop")}
                  </p>
                  <p className="text-sm text-gray-500">{t("fabric.supportedFormats")}</p>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <GradientButton
              onClick={handleAnalyze}
              disabled={!selectedFabric || !imageFile || isAnalyzing}
              className="w-full md:w-auto px-12 py-3"
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {analysisStatus || t("fabric.analyzing")}
                </span>
              ) : (
                t("fabric.analyze")
              )}
            </GradientButton>
          </div>
        </div>
      </div>
    </div>
  );
}
