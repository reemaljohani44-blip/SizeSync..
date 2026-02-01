import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/Navbar";
import { GradientButton } from "@/components/GradientButton";
import { useGuest } from "@/hooks/useGuest";
import { AlertTriangle, Shirt, ArrowLeft } from "lucide-react";

const CLOTHING_TYPES = [
  { id: "tShirt", icon: "👕" },
  { id: "pants", icon: "👖" },
  { id: "dress", icon: "👗" },
  { id: "jacket", icon: "🧥" },
  { id: "formalShirt", icon: "👔" },
  { id: "shorts", icon: "🩳" },
  { id: "skirt", icon: "🩱" },
];

export default function GuestClothingSelection() {
  const { t, i18n } = useTranslation();
  const [, setLocation] = useLocation();
  const { isGuest, guestProfile } = useGuest();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const isRTL = i18n.language === "ar";

  useEffect(() => {
    if (!isGuest || !guestProfile) {
      setLocation("/guest/profile");
    }
  }, [isGuest, guestProfile, setLocation]);

  const handleContinue = () => {
    if (selectedType) {
      sessionStorage.setItem("sizesync_guest_clothing_type", selectedType);
      setLocation("/guest/fabric-upload");
    }
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
            onClick={() => setLocation("/guest/profile")}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("common.back")}
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Shirt className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t("clothing.selectClothing")}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t("clothing.selectClothingDesc")}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {CLOTHING_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                  selectedType === type.id
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-lg"
                    : "border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
              >
                <div className="text-4xl mb-2">{type.icon}</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {t(`clothing.${type.id}`)}
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            <GradientButton
              onClick={handleContinue}
              disabled={!selectedType}
              className="w-full md:w-auto px-12 py-3"
            >
              {t("common.continue")}
            </GradientButton>
          </div>
        </div>
      </div>
    </div>
  );
}
