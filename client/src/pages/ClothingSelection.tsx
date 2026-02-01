import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { Navbar } from "@/components/Navbar";
import { ProgressStepper } from "@/components/ProgressStepper";
import { Shirt, Package, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";

const getClothingTypes = (t: any) => [
  { id: "t-shirt", name: t("clothing.tShirt"), Icon: Shirt },
  { id: "pants", name: t("clothing.pants"), Icon: Package },
  { id: "dress", name: t("clothing.dress"), Icon: Shirt },
  { id: "jacket", name: t("clothing.jacket"), Icon: Package },
  { id: "formal-shirt", name: t("clothing.formalShirt"), Icon: Shirt },
  { id: "shorts", name: t("clothing.shorts"), Icon: Package },
  { id: "skirt", name: t("clothing.skirt"), Icon: Shirt },
];

const getRequiredMeasurements = (t: any): Record<string, string[]> => ({
  "dress": [
    t("clothing.measurements.chestCircumference"),
    t("clothing.measurements.waistCircumference"),
    t("clothing.measurements.hipCircumference"),
    t("clothing.measurements.dressLength"),
  ],
  "pants": [
    t("clothing.measurements.waistCircumference"),
    t("clothing.measurements.hipCircumference"),
    t("clothing.measurements.legLength"),
    t("clothing.measurements.thighCircumference"),
  ],
  "t-shirt": [
    t("clothing.measurements.shirtLength"),
    t("clothing.measurements.chestCircumference"),
    t("clothing.measurements.waistCircumference"),
    t("clothing.measurements.shoulderWidth"),
    t("clothing.measurements.sleeveLength"),
  ],
  "formal-shirt": [
    t("clothing.measurements.chestCircumference"),
    t("clothing.measurements.shoulderWidth"),
    t("clothing.measurements.shirtLength"),
    t("clothing.measurements.sleeveLength"),
  ],
  "shorts": [
    t("clothing.measurements.waistCircumference"),
    t("clothing.measurements.hipCircumference"),
    t("clothing.measurements.shortsLength"),
  ],
  "jacket": [
    t("clothing.measurements.chestCircumference"),
    t("clothing.measurements.shoulderWidth"),
    t("clothing.measurements.sleeveLength"),
    t("clothing.measurements.jacketLength"),
  ],
  "skirt": [
    t("clothing.measurements.skirtLength"),
    t("clothing.measurements.waistCircumference"),
    t("clothing.measurements.hipCircumference"),
  ],
});

const getSteps = (t: any) => [
  { id: 1, name: t("profile.createProfile") },
  { id: 2, name: t("clothing.selectClothing") },
  { id: 3, name: t("fabric.selectFabric") },
  { id: 4, name: t("recommendations.recommendations") },
];

export default function ClothingSelection() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  
  const clothingTypes = getClothingTypes(t);
  const steps = getSteps(t);
  const requiredMeasurements = getRequiredMeasurements(t);

  const handleNext = () => {
    if (selectedType) {
      setLocation(`/fabric-upload?type=${selectedType}`);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1920&h=1080&fit=crop&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      >
        <div className="absolute inset-0 bg-white/85 dark:bg-gray-950/85"></div>
      </div>

      {/* Navigation */}
      <Navbar />

      {/* Content */}
      <div className="pt-24 pb-12 px-4 md:px-6 relative">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Progress Stepper */}
          <ProgressStepper steps={steps} currentStep={1} variant="light" />

          {/* Title */}
          <div className="text-center [dir='rtl']:text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-200 mb-3 break-words">
              {t("clothing.selectClothing")}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-base break-words px-4">
              {t("clothing.selectClothingDesc")}
            </p>
          </div>

          {/* Clothing Types Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6" data-testid="grid-clothing-types">
            {clothingTypes.map((type) => (
              <div
                key={type.id}
                className={cn(
                  "p-6 md:p-8 cursor-pointer transition-all duration-200 rounded-xl bg-white dark:bg-gray-900 border-2 shadow-sm min-h-[140px] flex flex-col",
                  selectedType === type.id
                    ? "border-gray-400 dark:border-gray-600 shadow-md scale-[1.02]"
                    : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md"
                )}
                onClick={() => setSelectedType(type.id)}
                data-testid={`card-clothing-${type.id}`}
              >
                <div className="flex flex-col items-center gap-4 md:gap-6 flex-1 justify-center">
                  <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
                    <type.Icon className={cn(
                      "w-12 h-12 transition-colors duration-200",
                      selectedType === type.id 
                        ? "text-gray-800 dark:text-gray-200" 
                        : "text-gray-700 dark:text-gray-300"
                    )} strokeWidth={1.5} />
                  </div>
                  <h3 className={cn(
                    "text-sm md:text-base font-medium text-center transition-colors duration-200 break-words leading-tight",
                    selectedType === type.id
                      ? "text-gray-900 dark:text-gray-100"
                      : "text-gray-800 dark:text-gray-300"
                  )}>
                    {type.name}
                  </h3>
                </div>
              </div>
            ))}
          </div>

          {/* Required Measurements Section */}
          <div 
            className={cn(
              "p-6 rounded-xl bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 transition-all duration-300",
              selectedType ? "opacity-100" : "opacity-60"
            )}
            data-testid="required-measurements-section"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Ruler className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                {t("clothing.requiredMeasurementsTitle")}
              </h3>
            </div>
            
            {selectedType ? (
              <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                {requiredMeasurements[selectedType]?.map((measurement, index) => (
                  <li key={index} className="text-base">
                    {measurement}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                {t("clothing.selectToShowMeasurements")}
              </p>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-4 pt-6">
            <button
              onClick={() => setLocation("/dashboard")}
              className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 whitespace-nowrap"
              data-testid="button-back"
            >
              {t("common.back")}
            </button>
            <GradientButton
              onClick={handleNext}
              disabled={!selectedType}
              className="flex-1 h-12 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              data-testid="button-next"
            >
              {t("common.next")}
            </GradientButton>
          </div>
        </div>
      </div>
    </div>
  );
}
