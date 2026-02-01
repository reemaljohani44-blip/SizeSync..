import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HelpCircle } from "lucide-react";
import { BodyAvatar } from "@/components/BodyAvatar";

export function MeasurementGuideModal() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const isRTL = i18n.language === "ar";

  const primaryMeasurements = [
    {
      number: 1,
      key: "chest",
      label: t("measurementGuide.chest"),
      description: t("measurementGuide.chestDesc"),
    },
    {
      number: 2,
      key: "waist",
      label: t("measurementGuide.waist"),
      description: t("measurementGuide.waistDesc"),
    },
    {
      number: 3,
      key: "hip",
      label: t("measurementGuide.hip"),
      description: t("measurementGuide.hipDesc"),
    },
    {
      number: 4,
      key: "inseam",
      label: t("measurementGuide.inseam"),
      description: t("measurementGuide.inseamDesc"),
    },
  ];

  const additionalMeasurements = [
    {
      key: "shoulder",
      label: t("measurementGuide.shoulder"),
      description: t("measurementGuide.shoulderDesc"),
    },
    {
      key: "armLength",
      label: t("measurementGuide.armLength"),
      description: t("measurementGuide.armLengthDesc"),
    },
    {
      key: "thigh",
      label: t("measurementGuide.thigh"),
      description: t("measurementGuide.thighDesc"),
    },
    {
      key: "legLength",
      label: t("measurementGuide.legLength"),
      description: t("measurementGuide.legLengthDesc"),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
          <span>{t("measurementGuide.howToMeasure")}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white text-center">
            {t("measurementGuide.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
            {t("measurementGuide.instructions")}
          </p>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-6">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 text-center">
                  {t("measurementGuide.primaryMeasurements")}
                </h3>
                <div className="space-y-3">
                  {primaryMeasurements.map((measurement) => (
                    <div key={measurement.key} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {measurement.number}
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {measurement.label}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 mx-1">-</span>
                        <span className="text-gray-600 dark:text-gray-400 text-sm">
                          {measurement.description}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 text-center">
                  {t("measurementGuide.additionalMeasurements")}
                </h3>
                <div className="space-y-3">
                  {additionalMeasurements.map((measurement) => (
                    <div key={measurement.key} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0 mt-2" />
                      <div className="flex-1">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {measurement.label}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 mx-1">-</span>
                        <span className="text-gray-600 dark:text-gray-400 text-sm">
                          {measurement.description}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:w-72 flex justify-center items-start">
              <BodyAvatar
                gender="female"
                showLabels={true}
                showPulse={false}
                size="md"
                overlays={[
                  { type: "chest", fitStatus: "neutral", label: "1 - " + t("measurementGuide.chest") },
                  { type: "waist", fitStatus: "neutral", label: "2 - " + t("measurementGuide.waist") },
                  { type: "hip", fitStatus: "neutral", label: "3 - " + t("measurementGuide.hip") },
                ]}
              />
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
            <h4 className="font-bold text-amber-800 dark:text-amber-200 mb-1">
              {t("measurementGuide.tipTitle")}
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {t("measurementGuide.tipContent")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
