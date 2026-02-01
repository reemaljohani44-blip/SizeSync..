import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GradientButton } from "@/components/GradientButton";
import { Navbar } from "@/components/Navbar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useGuest, type GuestProfile as GuestProfileType } from "@/hooks/useGuest";
import { Ruler, User, AlertTriangle, Info, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { MeasurementGuideModal } from "@/components/MeasurementGuideModal";
import { z } from "zod";

const guestProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().min(13).max(120).optional(),
  gender: z.enum(["male", "female", "other"]),
  height: z.number().min(50).max(300),
  weight: z.number().min(20).max(500),
  chest: z.number().min(30).max(200),
  waist: z.number().min(30).max(200),
  hip: z.number().min(30).max(200),
  shoulder: z.number().min(20).max(100).optional(),
  armLength: z.number().min(20).max(120).optional(),
  inseam: z.number().min(30).max(120).optional(),
});

type GuestProfileFormData = z.infer<typeof guestProfileSchema>;

function NumberInput({
  field,
  className,
  ...props
}: {
  field: any;
  className?: string;
  [key: string]: any;
}) {
  const [localValue, setLocalValue] = useState<string>(
    field.value === null || field.value === undefined ? "" : String(field.value)
  );

  useEffect(() => {
    const newValue = field.value === null || field.value === undefined ? "" : String(field.value);
    setLocalValue(newValue);
  }, [field.value]);

  return (
    <Input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={localValue}
      onChange={(e) => {
        const rawValue = e.target.value;
        if (rawValue === "") {
          setLocalValue("");
          field.onChange(undefined);
          return;
        }
        const digitsOnly = rawValue.replace(/[^0-9]/g, '');
        if (digitsOnly) {
          setLocalValue(digitsOnly);
          field.onChange(parseInt(digitsOnly, 10));
        }
      }}
      onBlur={() => {
        field.onBlur();
        if (localValue === "") {
          field.onChange(undefined);
        }
      }}
      className={className}
      {...props}
    />
  );
}

export default function GuestProfile() {
  const { t, i18n } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isGuest, guestProfile, setGuestProfile, startGuestSession } = useGuest();
  const isRTL = i18n.language === "ar";
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isGuest) {
      startGuestSession();
    }
  }, [isGuest, startGuestSession]);

  const defaultValues: Partial<GuestProfileFormData> = guestProfile ? {
    name: guestProfile.name,
    age: guestProfile.age,
    gender: guestProfile.gender,
    height: guestProfile.height,
    weight: guestProfile.weight,
    chest: guestProfile.chest,
    waist: guestProfile.waist,
    hip: guestProfile.hip,
    shoulder: guestProfile.shoulder,
    armLength: guestProfile.armLength,
    inseam: guestProfile.inseam,
  } : {
    name: "",
    age: undefined,
    gender: undefined,
    height: undefined,
    weight: undefined,
    chest: undefined,
    waist: undefined,
    hip: undefined,
    shoulder: undefined,
    armLength: undefined,
    inseam: undefined,
  };

  const form = useForm<GuestProfileFormData>({
    resolver: zodResolver(guestProfileSchema),
    mode: "onBlur",
    defaultValues,
  });

  const watchedFields = form.watch(["name", "gender", "height", "weight", "chest", "waist", "hip"]);
  const [watchedName, watchedGender, watchedHeight, watchedWeight, watchedChest, watchedWaist, watchedHip] = watchedFields;
  
  // Check if all required fields have valid values (use !== undefined for numbers since 0 is falsy)
  const isFormReady = 
    watchedName && watchedName.length >= 2 && 
    watchedGender && 
    typeof watchedHeight === 'number' && watchedHeight > 0 &&
    typeof watchedWeight === 'number' && watchedWeight > 0 &&
    typeof watchedChest === 'number' && watchedChest > 0 &&
    typeof watchedWaist === 'number' && watchedWaist > 0 &&
    typeof watchedHip === 'number' && watchedHip > 0;

  const onSubmit = async (data: GuestProfileFormData) => {
    try {
      setIsSubmitting(true);
      
      // Save profile to guest session storage
      setGuestProfile(data as GuestProfileType);
      
      toast({
        title: t("profile.profileCreated"),
        description: t("guest.dataNotSaved"),
      });
      
      // Navigate to next step
      setLocation("/guest/clothing-selection");
    } catch (error) {
      console.error("Guest profile submission error:", error);
      toast({
        title: t("common.error"),
        description: i18n.language === "ar" 
          ? "حدث خطأ أثناء حفظ البيانات، يرجى المحاولة مرة أخرى"
          : "An error occurred while saving your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-950 dark:via-indigo-950/30 dark:to-purple-950/30 relative overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <Navbar />
      
      <div className="pt-24 pb-12 px-4 md:px-6 relative">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl flex items-start gap-3">
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

          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-gray-100/50 dark:border-gray-800/50 p-6 md:p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-purple-900 dark:from-white dark:to-purple-200 bg-clip-text text-transparent mb-2">
                {t("guest.enterMeasurements")}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t("guest.enterMeasurementsDesc")}
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-5">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    {t("profile.personalInformation")}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("profile.name")}</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder={t("profile.namePlaceholder")}
                              className="h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-800/50"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {t("profile.age")} <span className="text-gray-400 font-normal">({t("profile.optional")})</span>
                          </FormLabel>
                          <FormControl>
                            <NumberInput 
                              field={field} 
                              placeholder="25"
                              className="h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-800/50"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("profile.gender")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-800/50">
                                <SelectValue placeholder={t("profile.gender")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">{t("profile.male")}</SelectItem>
                              <SelectItem value="female">{t("profile.female")}</SelectItem>
                              <SelectItem value="other">{t("profile.other")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <TooltipProvider>
                  <div className="space-y-5">
                    <div>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg flex-shrink-0">
                            <Ruler className="w-5 h-5 text-white" strokeWidth={2} />
                          </div>
                          <span className="bg-gradient-to-r from-gray-900 to-purple-900 dark:from-white dark:to-purple-200 bg-clip-text text-transparent">
                            {t("profile.essentialMeasurements")}
                          </span>
                        </h3>
                        <MeasurementGuideModal />
                      </div>
                      <p className="mt-2 ms-13 text-sm text-gray-600 dark:text-gray-400">
                        {t("profile.essentialMeasurementsDesc")}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              <Ruler className="w-4 h-4 text-purple-500" />
                              {t("profile.height")}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t("profile.heightTooltip")}</p>
                                </TooltipContent>
                              </Tooltip>
                            </FormLabel>
                            <FormControl>
                              <NumberInput
                                field={field}
                                placeholder={t("profile.heightPlaceholder")}
                                className="h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-800/50"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              <Ruler className="w-4 h-4 text-purple-500" />
                              {t("profile.weight")}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t("profile.weightTooltip")}</p>
                                </TooltipContent>
                              </Tooltip>
                            </FormLabel>
                            <FormControl>
                              <NumberInput
                                field={field}
                                placeholder={t("profile.weightPlaceholder")}
                                className="h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-800/50"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="chest"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              <Ruler className="w-4 h-4 text-purple-500" />
                              {t("profile.chest")}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t("profile.chestTooltip")}</p>
                                </TooltipContent>
                              </Tooltip>
                            </FormLabel>
                            <FormControl>
                              <NumberInput
                                field={field}
                                placeholder={t("profile.chestPlaceholder")}
                                className="h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-800/50"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="waist"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              <Ruler className="w-4 h-4 text-purple-500" />
                              {t("profile.waist")}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t("profile.waistTooltip")}</p>
                                </TooltipContent>
                              </Tooltip>
                            </FormLabel>
                            <FormControl>
                              <NumberInput
                                field={field}
                                placeholder={t("profile.waistPlaceholder")}
                                className="h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-800/50"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hip"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              <Ruler className="w-4 h-4 text-purple-500" />
                              {t("profile.hip")}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t("profile.hipTooltip")}</p>
                                </TooltipContent>
                              </Tooltip>
                            </FormLabel>
                            <FormControl>
                              <NumberInput
                                field={field}
                                placeholder={t("profile.hipPlaceholder")}
                                className="h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-800/50"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TooltipProvider>

                <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow flex-shrink-0">
                          <Ruler className="w-4 h-4 text-white" strokeWidth={2} />
                        </div>
                        <div className="text-start">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {t("profile.advancedMeasurements")}
                          </span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t("profile.advancedMeasurementsDesc")}
                          </p>
                        </div>
                      </div>
                      {isAdvancedOpen ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="shoulder"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              <Ruler className="w-4 h-4 text-amber-500" />
                              {t("profile.shoulder")}
                            </FormLabel>
                            <FormControl>
                              <NumberInput
                                field={field}
                                placeholder={t("profile.shoulderPlaceholder")}
                                className="h-12 border-2 border-amber-200 dark:border-amber-700/50 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-200 bg-amber-50/30 dark:bg-amber-900/10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="armLength"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              <Ruler className="w-4 h-4 text-amber-500" />
                              {t("profile.armLength")}
                            </FormLabel>
                            <FormControl>
                              <NumberInput
                                field={field}
                                placeholder={t("profile.armLengthPlaceholder")}
                                className="h-12 border-2 border-amber-200 dark:border-amber-700/50 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-200 bg-amber-50/30 dark:bg-amber-900/10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="inseam"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              <Ruler className="w-4 h-4 text-amber-500" />
                              {t("profile.inseam")}
                            </FormLabel>
                            <FormControl>
                              <NumberInput
                                field={field}
                                placeholder={t("profile.inseamPlaceholder")}
                                className="h-12 border-2 border-amber-200 dark:border-amber-700/50 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-200 bg-amber-50/30 dark:bg-amber-900/10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <div className="flex justify-center pt-4">
                  <button
                    type="submit"
                    className="w-full md:w-auto px-12 h-14 text-lg font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 transform bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:via-indigo-700 hover:to-purple-800 text-white shadow-xl hover:shadow-2xl hover:scale-[1.02] cursor-pointer active:scale-[0.98]"
                    disabled={false}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t("common.loading")}
                      </>
                    ) : (
                      t("common.continue")
                    )}
                  </button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
