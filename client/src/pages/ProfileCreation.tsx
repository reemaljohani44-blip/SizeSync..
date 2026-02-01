import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertProfileSchema, type InsertProfile, type Profile } from "@shared/schema";
import { Ruler, User, ChevronDown, ChevronUp, Info } from "lucide-react";
import { MeasurementGuideModal } from "@/components/MeasurementGuideModal";
import type { ControllerRenderProps } from "react-hook-form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// NumberInput component that allows clearing by using local state - STRICTLY INTEGER ONLY
function NumberInput({
  field,
  className,
  ...props
}: {
  field: ControllerRenderProps<any, any>;
  className?: string;
  [key: string]: any;
}) {
  const [localValue, setLocalValue] = useState<string>(
    field.value === null || field.value === undefined ? "" : String(field.value)
  );
  const [isFocused, setIsFocused] = useState(false);

  // Sync local value when field value changes externally (e.g., form reset), but not while user is typing
  useEffect(() => {
    if (!isFocused) {
      const newValue = field.value === null || field.value === undefined ? "" : String(field.value);
      setLocalValue(newValue);
    }
  }, [field.value, isFocused]);

  return (
    <Input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      name={field.name}
      ref={field.ref}
      value={localValue}
      onFocus={() => setIsFocused(true)}
      onChange={(e) => {
        const rawValue = e.target.value;
        
        // STRICT: Only allow digits (0-9) or empty string - NO other characters
        if (rawValue === "") {
          setLocalValue("");
          field.onChange(undefined);
          return;
        }
        
        // Remove any non-digit characters
        const digitsOnly = rawValue.replace(/[^0-9]/g, '');
        
        // Only update if we have valid digits
        if (digitsOnly === rawValue) {
          setLocalValue(digitsOnly);
          // Convert to integer immediately
          const numValue = parseInt(digitsOnly, 10);
          if (!isNaN(numValue)) {
            field.onChange(numValue);
          }
        } else {
          // If invalid characters were entered, use only the valid digits
          if (digitsOnly !== "") {
            setLocalValue(digitsOnly);
            const numValue = parseInt(digitsOnly, 10);
            if (!isNaN(numValue)) {
              field.onChange(numValue);
            }
          }
        }
      }}
      onBlur={(e) => {
        setIsFocused(false);
        field.onBlur();
        // On blur, ensure we have a valid integer or empty
        const value = e.target.value.trim();
        if (value === "") {
          setLocalValue("");
          field.onChange(undefined);
        } else {
          // Remove any non-digit characters and convert to integer
          const digitsOnly = value.replace(/[^0-9]/g, '');
          if (digitsOnly !== "") {
            const numValue = parseInt(digitsOnly, 10);
            if (!isNaN(numValue)) {
              setLocalValue(String(numValue));
              field.onChange(numValue);
            } else {
              // Reset to form value if invalid
              const formValue = field.value === null || field.value === undefined ? "" : String(field.value);
              setLocalValue(formValue);
            }
          } else {
            // Empty after removing non-digits
            setLocalValue("");
            field.onChange(undefined);
          }
        }
      }}
      onKeyDown={(e) => {
        // Prevent non-numeric keys (except backspace, delete, arrow keys, tab, etc.)
        const allowedKeys = [
          'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
          'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
          'Home', 'End'
        ];
        
        // Allow Ctrl/Cmd + A, C, V, X
        if (e.ctrlKey || e.metaKey) {
          if (['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
            return;
          }
        }
        
        // Allow allowed keys
        if (allowedKeys.includes(e.key)) {
          return;
        }
        
        // Only allow digits (0-9)
        if (!/^[0-9]$/.test(e.key)) {
          e.preventDefault();
        }
      }}
      className={className}
      {...props}
    />
  );
}

export default function ProfileCreation() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = location.startsWith("/profile/edit");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Always fetch profile to check if one exists (for both create and edit modes)
  const { data: existingProfile, isLoading: isLoadingProfile, error: profileError } = useQuery<Profile | null>({
    queryKey: ["/api/profile"],
    retry: false, // Don't retry on 404 - treat as "no profile exists"
    staleTime: 0, // Always fetch fresh data
    queryFn: async () => {
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch("/api/profile", {
          headers,
          credentials: "include",
        });
        if (res.status === 404) {
          // Profile not found - return null instead of throwing
          return null;
        }
        if (!res.ok) {
          throw new Error(`Failed to fetch profile: ${res.statusText}`);
        }
        const profile = await res.json();
        console.log("Profile fetched:", profile);
        return profile;
      } catch (error) {
        // If it's a 404, return null; otherwise throw
        if (error instanceof Error && error.message.includes("404")) {
          return null;
        }
        throw error;
      }
    },
  });

  // Determine if we're actually in edit mode (profile exists) or create mode (no profile)
  const hasProfile = !!existingProfile;
  const actualEditMode = isEditMode && hasProfile;

  const form = useForm<InsertProfile>({
    resolver: zodResolver(insertProfileSchema),
    mode: "onBlur", // Only validate on blur, not on every change - allows clearing fields
    defaultValues: {
      name: "",
      age: undefined, // Optional now
      gender: "male",
      height: undefined,
      weight: undefined,
      chest: undefined,
      waist: undefined,
      hip: undefined,
      shoulder: undefined,
      armLength: undefined,
      legLength: undefined,
      thighCircumference: undefined,
      inseam: undefined,
    },
  });

  // Watch essential fields to determine if form is ready
  const watchedFields = form.watch(["name", "gender", "height", "weight", "chest", "waist", "hip"]);
  const isFormReady = watchedFields[0] && watchedFields[0].length >= 2 && watchedFields[1] && 
    watchedFields[2] && watchedFields[3] && watchedFields[4] && watchedFields[5] && watchedFields[6];

  // Load existing profile data when profile is loaded (for edit mode or when profile exists)
  useEffect(() => {
    if (existingProfile && existingProfile.id) {
      console.log("Loading profile data into form:", existingProfile);
      form.reset({
        name: existingProfile.name,
        age: existingProfile.age,
        gender: existingProfile.gender,
        height: existingProfile.height,
        weight: existingProfile.weight,
        chest: existingProfile.chest,
        waist: existingProfile.waist,
        hip: existingProfile.hip,
        shoulder: existingProfile.shoulder,
        armLength: existingProfile.armLength,
        legLength: existingProfile.legLength,
        thighCircumference: existingProfile.thighCircumference,
        inseam: existingProfile.inseam,
      });
    }
  }, [existingProfile, form]);

  const createProfileMutation = useMutation({
    mutationFn: async (data: InsertProfile) => {
      return await apiRequest(
        "POST",
        "/api/profile",
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: t("profile.profileCreated"),
        description: t("profile.profileCreatedDesc"),
      });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message || t("profile.failedToCreate"),
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ data, profileId }: { data: InsertProfile; profileId: string }) => {
      if (!profileId) {
        throw new Error("Profile ID is required for update");
      }
      console.log("Updating profile with ID:", profileId, "Data:", data);
      try {
        const response = await apiRequest(
          "PUT",
          `/api/profile/${profileId}`,
          data
        );
        console.log("Profile update response:", response);
        return response;
      } catch (error: any) {
        console.error("Profile update error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.refetchQueries({ queryKey: ["/api/profile"] });
      toast({
        title: t("profile.profileUpdated"),
        description: t("profile.profileUpdatedDesc"),
      });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      console.error("Update mutation error:", error);
      let errorMessage = error.message || "Failed to update profile";
      // Extract error message from response if available
      if (errorMessage.includes("Profile not found") || errorMessage.includes("404")) {
        // If profile not found during update, try creating it instead
        console.log("Profile not found during update, attempting to create new profile");
        createProfileMutation.mutate(form.getValues());
        return;
      }
      toast({
        title: t("common.error"),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertProfile) => {
    console.log("Form submitted. Has profile:", hasProfile, "Profile ID:", existingProfile?.id, "Edit mode:", isEditMode);
    
    // If a profile exists, always update it (regardless of route)
    if (existingProfile && existingProfile.id) {
      console.log("Updating existing profile with ID:", existingProfile.id);
      updateProfileMutation.mutate({ data, profileId: existingProfile.id });
    } else {
      // No profile exists, create a new one
      console.log("Creating new profile");
      createProfileMutation.mutate(data);
    }
  };

  // Show loading state when fetching profile
  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-950 dark:via-indigo-950/30 dark:to-purple-950/30 relative overflow-hidden">
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <Navbar />
        <div className="pt-24 pb-12 px-4 md:px-6 relative">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-gray-100/50 dark:border-gray-800/50 p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 font-medium break-words">{t("profile.loading")}</p>
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
      </div>

      {/* Navigation */}
      <Navbar />

      {/* Form */}
      <div className="pt-24 pb-12 px-4 md:px-6 relative">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 dark:from-white dark:via-indigo-200 dark:to-purple-200 bg-clip-text text-transparent mb-3 break-words leading-tight">
              {actualEditMode ? t("profile.editProfile") : t("profile.createProfile")}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base break-words leading-relaxed">
              {actualEditMode ? t("profile.updateMeasurements") : t("profile.enterMeasurements")}
            </p>
            {isEditMode && !isLoadingProfile && !existingProfile && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 break-words">
                  {t("profile.noProfileFound")}
                </p>
              </div>
            )}
          </div>

          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-gray-100/50 dark:border-gray-800/50 p-6 md:p-10 relative overflow-hidden" data-testid="card-profile-form">
            {/* Decorative gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 relative z-10" data-testid="form-create-profile">
                {/* Personal Information */}
                <div className="space-y-5">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
                      <User className="w-5 h-5 text-white" strokeWidth={2} />
                    </div>
                    <span className="bg-gradient-to-r from-gray-900 to-indigo-900 dark:from-white dark:to-indigo-200 bg-clip-text text-transparent break-words leading-tight">
                      {t("profile.personalInformation")}
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2 block break-words leading-tight">{t("profile.name")}</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Input
                                {...field}
                                placeholder={t("profile.namePlaceholder")}
                                className="h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                                data-testid="input-name"
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-red-500 text-xs mt-1" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}  
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2 break-words leading-tight">
                            {t("profile.age")}
                            <span className="text-xs text-gray-400 font-normal">({t("profile.optional")})</span>
                          </FormLabel>
                          <FormControl>
                            <NumberInput
                              field={field}
                              placeholder={t("profile.agePlaceholder")}
                              className="h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-gray-100"
                              data-testid="input-age"
                            />
                          </FormControl>
                          <FormMessage className="text-red-500 text-xs mt-1" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2 block break-words leading-tight">{t("profile.gender")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger
                                className="h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-gray-100"
                                data-testid="select-gender"
                              >
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-xl">
                              <SelectItem value="male" className="hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer break-words">{t("profile.male")}</SelectItem>
                              <SelectItem value="female" className="hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer break-words">{t("profile.female")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-red-500 text-xs mt-1" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Essential Body Measurements */}
                <TooltipProvider>
                  <div className="space-y-5">
                    <div>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg flex-shrink-0">
                            <Ruler className="w-5 h-5 text-white" strokeWidth={2} />
                          </div>
                          <span className="bg-gradient-to-r from-gray-900 to-purple-900 dark:from-white dark:to-purple-200 bg-clip-text text-transparent break-words leading-tight">
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
                            <FormLabel className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
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
                                className="h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-gray-100"
                                data-testid="input-height"
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-xs mt-1" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
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
                                className="h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-gray-100"
                                data-testid="input-weight"
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-xs mt-1" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="chest"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
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
                                className="h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-gray-100"
                                data-testid="input-chest"
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-xs mt-1" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="waist"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
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
                                className="h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-gray-100"
                                data-testid="input-waist"
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-xs mt-1" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hip"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
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
                                className="h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-gray-100"
                                data-testid="input-hip"
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-xs mt-1" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TooltipProvider>

                {/* Advanced Measurements - Collapsible */}
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
                    <TooltipProvider>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-amber-50/50 dark:bg-amber-900/10 border-2 border-amber-200/50 dark:border-amber-800/30 rounded-xl">
                        <FormField
                          control={form.control}
                          name="shoulder"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                <Ruler className="w-4 h-4 text-amber-500" />
                                {t("profile.shoulder")}
                                <span className="text-xs text-gray-400">({t("profile.optional")})</span>
                              </FormLabel>
                              <FormControl>
                                <NumberInput
                                  field={field}
                                  placeholder={t("profile.shoulderPlaceholder")}
                                  className="h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-200 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-gray-100"
                                  data-testid="input-shoulder"
                                />
                              </FormControl>
                              <FormMessage className="text-red-500 text-xs mt-1" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="armLength"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                <Ruler className="w-4 h-4 text-amber-500" />
                                {t("profile.armLength")}
                                <span className="text-xs text-gray-400">({t("profile.optional")})</span>
                              </FormLabel>
                              <FormControl>
                                <NumberInput
                                  field={field}
                                  placeholder={t("profile.armLengthPlaceholder")}
                                  className="h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-200 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-gray-100"
                                  data-testid="input-arm-length"
                                />
                              </FormControl>
                              <FormMessage className="text-red-500 text-xs mt-1" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="inseam"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                <Ruler className="w-4 h-4 text-amber-500" />
                                {t("profile.inseam")}
                                <span className="text-xs text-gray-400">({t("profile.optional")})</span>
                              </FormLabel>
                              <FormControl>
                                <NumberInput
                                  field={field}
                                  placeholder={t("profile.inseamPlaceholder")}
                                  className="h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-200 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-gray-100"
                                  data-testid="input-inseam"
                                />
                              </FormControl>
                              <FormMessage className="text-red-500 text-xs mt-1" />
                            </FormItem>
                          )}
                        />
                      </div>
                    </TooltipProvider>
                  </CollapsibleContent>
                </Collapsible>

                {/* Submit */}
                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setLocation("/dashboard")}
                    className="flex-1 h-14 px-6 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-xl text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                    data-testid="button-cancel"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={createProfileMutation.isPending || updateProfileMutation.isPending || isLoadingProfile}
                    className={`flex-1 h-14 px-6 rounded-xl text-sm sm:text-base font-bold shadow-lg transition-all duration-300 whitespace-nowrap ${
                      isFormReady
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl transform hover:scale-[1.02]"
                        : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                    data-testid="button-submit-profile"
                  >
                    {createProfileMutation.isPending || updateProfileMutation.isPending
                      ? (hasProfile ? t("profile.updating") : t("profile.creating"))
                      : (hasProfile ? t("profile.updateProfile") : t("common.continue"))}
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
