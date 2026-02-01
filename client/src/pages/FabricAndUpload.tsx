import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { Navbar } from "@/components/Navbar";
import { ProgressStepper } from "@/components/ProgressStepper";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";

async function compressImage(base64: string, maxWidth = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } else {
        resolve(base64);
      }
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

const getFabricTypes = (t: any) => [
  {
    id: "stretchy",
    name: t("fabric.stretchy"),
    description: t("fabric.stretchyDesc"),
  },
  {
    id: "normal",
    name: t("fabric.normal"),
    description: t("fabric.normalDesc"),
  },
  {
    id: "rigid",
    name: t("fabric.rigid"),
    description: t("fabric.rigidDesc"),
  },
];

const getSteps = (t: any) => [
  { id: 1, name: t("profile.createProfile") },
  { id: 2, name: t("clothing.selectClothing") },
  { id: 3, name: t("fabric.selectFabric") },
  { id: 4, name: t("recommendations.recommendations") },
];

export default function FabricAndUpload() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const clothingType = params.get("type");
  
  const fabricTypes = getFabricTypes(t);
  const steps = getSteps(t);

  const [selectedFabric, setSelectedFabric] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState<string>("");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const pollJobStatus = async (jobId: string) => {
    try {
      const response = await apiRequest("GET", `/api/analyze-size-chart/job/${jobId}`);
      
      if (response.status === "completed" && response.result) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        setAnalysisProgress(100);
        setAnalysisStatus(t("fabric.analysisComplete"));
        queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
        setTimeout(() => {
          setIsAnalyzing(false);
          setLocation(`/recommendations?id=${response.result.id}`);
        }, 500);
        return;
      }

      if (response.status === "failed") {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        setIsAnalyzing(false);
        toast({
          title: t("fabric.imageProcessingFailed"),
          description: response.error || t("fabric.imageNotClear"),
          variant: "destructive",
        });
        return;
      }

      setAnalysisProgress(response.progress || 0);
      if (response.status === "processing") {
        setAnalysisStatus(t("fabric.processingImage"));
      }
    } catch (error: any) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setIsAnalyzing(false);
      toast({
        title: t("fabric.imageProcessingFailed"),
        description: t("fabric.imageNotClear"),
        variant: "destructive",
      });
    }
  };

  const analyzeMutation = useMutation({
    mutationFn: async (data: {
      clothingType: string;
      fabricType: string;
      imageBase64: string;
    }) => {
      const compressedImage = await compressImage(data.imageBase64);
      return await apiRequest("POST", "/api/analyze-size-chart/async", {
        ...data,
        imageBase64: compressedImage,
      });
    },
    onSuccess: (response: any) => {
      if (response.status === "completed" && response.result) {
        queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
        setIsAnalyzing(false);
        setLocation(`/recommendations?id=${response.result.id}`);
        return;
      }

      if (response.jobId) {
        setAnalysisProgress(10);
        setAnalysisStatus(t("fabric.uploadingImage"));
        pollingRef.current = setInterval(() => pollJobStatus(response.jobId), 1500);
      }
    },
    onError: (error: Error) => {
      setIsAnalyzing(false);
      toast({
        title: t("fabric.imageProcessingFailed"),
        description: t("fabric.imageNotClear"),
        variant: "destructive",
      });
    },
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: t("fabric.invalidFile"),
        description: t("fabric.invalidFileDesc"),
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFile]);

  const handleAnalyze = () => {
    if (!clothingType || !selectedFabric || !uploadedImage) return;

    setIsAnalyzing(true);
    setAnalysisProgress(5);
    setAnalysisStatus(t("fabric.compressingImage"));

    analyzeMutation.mutate({
      clothingType,
      fabricType: selectedFabric,
      imageBase64: uploadedImage,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-950 dark:via-indigo-950/30 dark:to-purple-950/30 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Navigation */}
      <Navbar />

      {/* Content */}
      <div className="pt-24 pb-12 px-4 md:px-6 relative">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Progress Stepper */}
          <ProgressStepper steps={steps} currentStep={2} variant="light" />

          {/* Title */}
          <div className="text-left [dir='rtl']:text-right">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 dark:from-white dark:via-indigo-200 dark:to-purple-200 bg-clip-text text-transparent mb-2 break-words">
              {t("fabric.fabricAndSizeChart")}
            </h2>
            <p className="text-muted-foreground text-base break-words">
              {t("fabric.fabricAndSizeChartDesc")}
            </p>
          </div>

          {/* Fabric Type Selection */}
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-6 break-words" data-testid="heading-fabric-type">
              {t("fabric.selectFabric")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="grid-fabric-types">
              {fabricTypes.map((fabric, index) => {
                const colors = [
                  { bg: "from-blue-50 to-indigo-50", border: "border-blue-200", hover: "hover:border-blue-400", text: "text-blue-700", darkBg: "dark:from-blue-950/30 dark:to-indigo-950/30", darkBorder: "dark:border-blue-800", darkText: "dark:text-blue-300" },
                  { bg: "from-purple-50 to-pink-50", border: "border-purple-200", hover: "hover:border-purple-400", text: "text-purple-700", darkBg: "dark:from-purple-950/30 dark:to-pink-950/30", darkBorder: "dark:border-purple-800", darkText: "dark:text-purple-300" },
                  { bg: "from-indigo-50 to-blue-50", border: "border-indigo-200", hover: "hover:border-indigo-400", text: "text-indigo-700", darkBg: "dark:from-indigo-950/30 dark:to-blue-950/30", darkBorder: "dark:border-indigo-800", darkText: "dark:text-indigo-300" },
                ];
                const colorScheme = colors[index];
                
                return (
                  <GlassCard
                    key={fabric.id}
                    className={cn(
                      "p-6 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-xl border-2 bg-white dark:bg-card",
                      `bg-gradient-to-br ${colorScheme.bg} ${colorScheme.darkBg}`,
                      selectedFabric === fabric.id
                        ? `${colorScheme.border} ${colorScheme.darkBorder} shadow-lg scale-105 ring-2 ring-offset-2 ring-indigo-500/50`
                        : `border-gray-200 dark:border-gray-800 ${colorScheme.hover} ${colorScheme.darkBorder}`,
                    )}
                    onClick={() => setSelectedFabric(fabric.id)}
                    data-testid={`card-fabric-${fabric.id}`}
                  >
                    <h4 className={cn(
                      "text-lg font-semibold mb-2 break-words",
                      selectedFabric === fabric.id ? `${colorScheme.text} ${colorScheme.darkText}` : "text-foreground"
                    )}>
                      {fabric.name}
                    </h4>
                    <p className="text-sm text-muted-foreground break-words">{fabric.description}</p>
                    {selectedFabric === fabric.id && (
                      <div className="mt-4 flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse"></div>
                        <span className={cn("font-medium break-words", colorScheme.text, colorScheme.darkText)}>{t("fabric.selected")}</span>
                      </div>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          </div>

          {/* File Upload */}
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-6 break-words" data-testid="heading-upload">
              {t("fabric.uploadSizeChart")}
            </h3>
            {!uploadedImage ? (
              <GlassCard
                className={cn(
                  "p-12 border-2 border-dashed transition-all duration-300 bg-white dark:bg-card",
                  dragActive 
                    ? "border-indigo-400 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[1.02] shadow-xl" 
                    : "border-gray-300 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
                data-testid="card-upload-dropzone"
              >
                <input
                  type="file"
                  id="file-upload"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                  data-testid="input-file"
                />
                <div className="min-h-64 flex flex-col items-center justify-center gap-6 text-center cursor-pointer">
                  <div className={cn(
                    "w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300",
                    dragActive 
                      ? "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg scale-110" 
                      : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 group-hover:from-indigo-100 group-hover:to-purple-100"
                  )}>
                    <Upload className={cn(
                      "w-10 h-10 transition-colors duration-300",
                      dragActive ? "text-white" : "text-gray-600 dark:text-gray-400"
                    )} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-foreground break-words">
                      {t("fabric.dragAndDrop")}
                    </p>
                    <p className="text-sm text-muted-foreground break-words">
                      {t("fabric.orClickToBrowse")}
                    </p>
                    <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mt-2 break-words">
                      {t("fabric.uploadClearImage")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById('file-upload')?.click();
                    }}
                    className="px-6 py-2.5 border-2 border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-foreground hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all duration-200 cursor-pointer whitespace-nowrap"
                    data-testid="button-browse"
                  >
                    {t("fabric.browseFiles")}
                  </button>
                  <p className="text-xs text-muted-foreground mt-2 break-words">
                    {t("fabric.supportedFormats")}
                  </p>
                </div>
              </GlassCard>
            ) : (
              <GlassCard className="p-6 bg-white dark:bg-card border-2 border-gray-200 dark:border-gray-800 shadow-lg" data-testid="card-uploaded-image">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md">
                        <ImageIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="text-foreground font-semibold block break-words">
                          {t("fabric.sizeChartUploaded")}
                        </span>
                        <span className="text-xs text-muted-foreground break-words">
                          {t("fabric.readyToAnalyze")}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setUploadedImage(null)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors group"
                      data-testid="button-remove-image"
                    >
                      <X className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
                    </button>
                  </div>
                  <div className="relative rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                    <img
                      src={uploadedImage}
                      alt={t("fabric.uploadedSizeChart")}
                      className="w-full rounded-xl max-h-96 object-contain"
                    />
                  </div>
                </div>
              </GlassCard>
            )}
          </div>

          {/* Navigation */}
          <div className="space-y-4 pt-6">
            {isAnalyzing && (
              <GlassCard className="p-6 bg-white dark:bg-card border-2 border-indigo-200 dark:border-indigo-800">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {analysisStatus || t("fabric.analyzing")}
                    </span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {analysisProgress}%
                    </span>
                  </div>
                  <Progress value={analysisProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    {t("fabric.analysisNote")}
                  </p>
                </div>
              </GlassCard>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setLocation("/clothing-selection")}
                disabled={isAnalyzing}
                className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-foreground hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 whitespace-nowrap disabled:opacity-50"
                data-testid="button-back"
              >
                {t("common.back")}
              </button>
              <GradientButton
                onClick={handleAnalyze}
                disabled={!selectedFabric || !uploadedImage || isAnalyzing}
                className="flex-1 h-12 text-base font-semibold whitespace-nowrap"
                data-testid="button-analyze"
              >
                {isAnalyzing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t("fabric.analyzing")}
                  </span>
                ) : (
                  t("fabric.analyze")
                )}
              </GradientButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
