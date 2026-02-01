import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { GradientButton } from "@/components/GradientButton";
import { useAuth } from "@/hooks/useAuth";
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
import { signInSchema, signUpSchema, type SignInData, type SignUpData } from "@shared/schema";
import { Mail, Lock, User as UserIcon, Eye, EyeOff, Shield, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGuest } from "@/hooks/useGuest";

interface AuthFlipperProps {
  initialMode?: "signin" | "signup";
}

export function AuthFlipper({ initialMode = "signin" }: AuthFlipperProps) {
  const { t } = useTranslation();
  const [isFlipped, setIsFlipped] = useState(initialMode === "signup");
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  // Only check auth status, don't trigger query on signup/signin pages
  // The query will be disabled to prevent unnecessary API calls
  const { isAuthenticated, user } = useAuth();
  const { startGuestSession } = useGuest();
  const queryClient = useQueryClient();

  const handleGuestMode = () => {
    startGuestSession();
    window.location.href = "/guest/profile";
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true);
    });
  }, []);

  useEffect(() => {
    // Only redirect if authenticated - don't cause re-renders
    if (isAuthenticated && user) {
      window.location.href = "/dashboard";
    }
  }, [isAuthenticated, user]);

  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  const signInForm = useForm<SignInData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      role: undefined, // Role will be selected by user
    },
  });

  const signUpForm = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "user", // Default to user for signup
    },
  });

  const signInMutation = useMutation({
    mutationFn: async (data: SignInData) => {
      return await apiRequest("POST", "/api/auth/signin", data);
    },
    onSuccess: async (data: any) => {
      console.log("=== SIGNIN SUCCESS ===");
      console.log("Signin response data:", data);
      
      if (data.token) {
        localStorage.setItem("token", data.token);
        console.log("Token saved to localStorage");
      }
      
      // Set user data in cache immediately if provided in response
      if (data.user) {
        console.log("=== Setting user in cache after signin ===");
        console.log("User data from signin:", data.user);
        console.log("User role:", data.user.role);
        
        // Set the user data in cache
        queryClient.setQueryData(["/api/auth/user"], data.user);
        
        // Verify it was set
        const cachedUser = queryClient.getQueryData(["/api/auth/user"]);
        console.log("Cached user after signin:", cachedUser);
        console.log("Cached user role:", (cachedUser as any)?.role);
      }
      
      toast({
        title: t("auth.welcomeBackToast"),
        description: t("auth.signInSuccess"),
      });
      
      // Refetch in background to get latest data from server
      queryClient.refetchQueries({ 
        queryKey: ["/api/auth/user"],
        type: 'active'
      });
      
      // Wait a moment to ensure cache is set, then redirect to dashboard
      setTimeout(() => {
        // Verify user data is in cache before redirecting
        const userBeforeRedirect = queryClient.getQueryData(["/api/auth/user"]);
        console.log("User data before redirect to dashboard:", userBeforeRedirect);
        console.log("User role before redirect:", (userBeforeRedirect as any)?.role);
        
        window.location.href = "/dashboard";
      }, 200);
    },
    onError: (error: any) => {
      let errorMessage = "Invalid email or password. Please try again.";
      let errorTitle = "Sign In Failed";
      
      // Check if it's a role mismatch error (403 status)
      if (error.status === 403) {
        errorTitle = t("auth.roleMismatch");
        errorMessage = error.message || t("auth.roleMismatchDesc");
      } else if (error.message) {
        // Extract error message from various formats
        errorMessage = error.message.replace(/^\d{3}:\s*/, "");
        errorMessage = errorMessage.replace(/^\{[^}]*"error":\s*"([^"]+)"[^}]*\}$/i, "$1");
        errorMessage = errorMessage.replace(/^[^"]*"error":\s*"([^"]+)"[^}]*$/i, "$1");
        
        // Try to extract message field if it exists
        try {
          const errorText = error.message;
          const messageMatch = errorText.match(/"message":\s*"([^"]+)"/i);
          if (messageMatch && messageMatch[1]) {
            errorMessage = messageMatch[1];
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      toast({
        title: errorTitle || t("auth.signInFailed"),
        description: errorMessage || t("auth.invalidCredentials"),
        variant: "destructive",
      });
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async (data: SignUpData) => {
      return await apiRequest("POST", "/api/auth/signup", data);
    },
    onSuccess: async (data: any) => {
      console.log("=== SIGNUP SUCCESS ===");
      console.log("Signup response data:", data);
      
      if (data.token) {
        localStorage.setItem("token", data.token);
        console.log("Token saved to localStorage");
      }
      
      // Set user data in cache immediately if provided in response
      // This ensures the user data (including role) is available immediately
      if (data.user) {
        console.log("=== Setting user in cache ===");
        console.log("User data from signup:", data.user);
        console.log("User role:", data.user.role);
        
        // Set the user data in cache with a long staleTime to prevent immediate refetch
        queryClient.setQueryData(["/api/auth/user"], data.user, {
          updatedAt: Date.now(),
        });
        
        // Verify it was set
        const cachedUser = queryClient.getQueryData(["/api/auth/user"]);
        console.log("Cached user after setting:", cachedUser);
        console.log("Cached user role:", (cachedUser as any)?.role);
      }
      
      toast({
        title: t("auth.accountCreated"),
        description: t("auth.accountCreatedDesc"),
      });
      
      // Clear any cached user data since we're redirecting to sign-in
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      
      // Redirect to sign-in page after signup (as requested)
      setTimeout(() => {
        window.location.href = "/signin";
      }, 1000);
    },
    onError: (error: any) => {
      let errorMessage = "Failed to create account. Please try again.";
      if (error.message) {
        errorMessage = error.message.replace(/^\d{3}:\s*/, "");
        errorMessage = errorMessage.replace(/^\{[^}]*"error":\s*"([^"]+)"[^}]*\}$/i, "$1");
        errorMessage = errorMessage.replace(/^[^"]*"error":\s*"([^"]+)"[^}]*$/i, "$1");
      }
      toast({
        title: t("auth.signUpFailed"),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSignInSubmit = (data: SignInData) => {
    // Role is optional in schema but required for sign in form
    if (!data.role || (data.role !== 'admin' && data.role !== 'user')) {
      toast({
        title: t("auth.roleRequired"),
        description: t("auth.roleRequiredDesc"),
        variant: "destructive",
      });
      return;
    }
    signInMutation.mutate(data);
  };

  const onSignUpSubmit = (data: SignUpData) => {
    // Role defaults to 'user' for signup, ensure it's set
    const signupData = {
      ...data,
      role: data.role || 'user', // Default to 'user' if not set
    };
    
    console.log("=== FRONTEND SIGNUP DEBUG ===");
    console.log("Form data:", { ...signupData, password: '[HIDDEN]' });
    console.log("Role (defaulting to user):", signupData.role);
    console.log("Submitting signup data:", { ...signupData, password: '[HIDDEN]' });
    console.log("=== END FRONTEND DEBUG ===");
    
    signUpMutation.mutate(signupData);
  };

  return (
    <div className={`w-full max-w-[95vw] mx-auto transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'} h-full max-h-[calc(100vh-5rem)]`}>
      <div className="flip-container relative w-full h-full">
        <div className={`flip-card ${isFlipped ? "flipped" : ""} h-full`}>
          {/* Sign In Card (Front) */}
          <div className="flip-card-front">
            <div className="bg-white/98 dark:bg-gray-950/98 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-gray-100/50 dark:border-gray-800/50 overflow-hidden h-full relative">
              {/* Subtle gradient overlay */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              <div className="grid md:grid-cols-[2.2fr_2.8fr] gap-0 h-full">
                {/* Left Section - Form */}
                <div className="p-6 md:p-10 flex flex-col justify-center relative z-10">
                  <div className="mb-5">
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 dark:from-white dark:via-indigo-200 dark:to-purple-200 bg-clip-text text-transparent mb-1.5">
                      {t("auth.signIn")}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {t("auth.welcomeBack")}
                    </p>
                  </div>

                  <Form {...signInForm}>
                    <form onSubmit={signInForm.handleSubmit(onSignInSubmit)} className="space-y-3.5">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-10 text-sm font-medium border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all duration-200"
                        disabled={signInMutation.isPending}
                        onClick={() => {
                          // Use role from form dropdown or default to user
                          const role = signInForm.getValues("role") || "user";
                          window.location.href = `/api/auth/google?role=${role}`;
                        }}
                      >
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Continue with Google
                      </Button>

                      <div className="relative my-3">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-gray-200 dark:border-gray-700"></span>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white dark:bg-gray-950 px-2 text-gray-500 dark:text-gray-400">Or continue with</span>
                        </div>
                      </div>

                      <FormField
                        control={signInForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-semibold text-gray-700 dark:text-gray-300">Email</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                                  <Mail className="w-4 h-4" />
                                </div>
                                <Input
                                  {...field}
                                  type="email"
                                  placeholder="your@email.com"
                                  className="pl-10 h-10 text-sm border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-900/50"
                                  disabled={signInMutation.isPending}
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={signInForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-semibold text-gray-700 dark:text-gray-300">Password</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                                  <Lock className="w-4 h-4" />
                                </div>
                                <Input
                                  {...field}
                                  type={showPassword ? "text" : "password"}
                                  placeholder={t("auth.passwordPlaceholder")}
                                  className="pl-10 pr-10 h-10 text-sm border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-900/50"
                                  disabled={signInMutation.isPending}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                >
                                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={signInForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              {t("auth.role")} <span className="text-red-500">*</span>
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || undefined}
                              disabled={signInMutation.isPending}
                            >
                              <FormControl>
                                <SelectTrigger className="h-10 text-sm border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-900/50">
                                  <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-gray-400" />
                                    <SelectValue placeholder={t("auth.selectRole")} />
                                  </div>
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="user">{t("auth.user")}</SelectItem>
                                <SelectItem value="admin">{t("auth.admin")}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <GradientButton
                        type="submit"
                        className="w-full h-10 text-sm font-semibold mt-3 shadow-lg hover:shadow-xl transition-all duration-200"
                        disabled={signInMutation.isPending}
                      >
                        {signInMutation.isPending ? t("auth.signingIn") : t("auth.signIn")}
                      </GradientButton>

                      <div className="text-center mt-3">
                        <button
                          type="button"
                          onClick={flipCard}
                          className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          {t("auth.dontHaveAccount")} <span className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">{t("auth.signUp")}</span>
                        </button>
                      </div>
                    </form>
                  </Form>
                </div>

                {/* Right Section - Sign In Image */}
                <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 overflow-hidden hidden md:block">
                  {/* Animated gradient overlay */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                  </div>
                  
                  {/* Decorative elements */}
                  <div className="absolute inset-0">
                    <div className="absolute top-10 right-10 w-32 h-32 border-2 border-white/20 rounded-full"></div>
                    <div className="absolute bottom-20 left-10 w-24 h-24 border-2 border-white/20 rounded-full"></div>
                  </div>
                  
                  <div className="relative z-10 h-full flex items-center justify-center p-10">
                    <div className="relative group">
                      <div className="absolute -inset-4 bg-gradient-to-r from-indigo-400 to-pink-400 rounded-3xl blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                      <img
                        src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&h=800&fit=crop&q=80"
                        alt="Fashion shopping"
                        className="relative w-full max-w-md h-auto rounded-3xl shadow-2xl border-4 border-white/40 object-cover transform group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-40 h-40 bg-purple-300/40 rounded-full blur-3xl"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sign Up Card (Back) */}
          <div className="flip-card-back">
            <div className="bg-white/98 dark:bg-gray-950/98 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-gray-100/50 dark:border-gray-800/50 overflow-hidden h-full relative">
              {/* Subtle gradient overlay */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              <div className="grid md:grid-cols-[2.2fr_2.8fr] gap-0 h-full">
                {/* Left Section - Form */}
                <div className="p-6 md:p-10 flex flex-col justify-center relative z-10">
                  <div className="mb-5">
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 dark:from-white dark:via-indigo-200 dark:to-purple-200 bg-clip-text text-transparent mb-1.5">
                      {t("auth.signUp")}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {t("auth.createAccount")}
                    </p>
                  </div>

                  <Form {...signUpForm}>
                    <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)} className="space-y-3.5">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-10 text-sm font-medium border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all duration-200"
                        disabled={signUpMutation.isPending}
                        onClick={() => {
                          // For signup, go directly to Google OAuth with "user" role (no dialog)
                          window.location.href = "/api/auth/google?role=user";
                        }}
                      >
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        {t("auth.continueWithGoogle")}
                      </Button>

                      <div className="relative my-3">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-gray-200 dark:border-gray-700"></span>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white dark:bg-gray-950 px-2 text-gray-500 dark:text-gray-400">{t("auth.orContinueWith")}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <FormField
                          control={signUpForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t("auth.firstName")}</FormLabel>
                              <FormControl>
                                <div className="relative group">
                                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                                    <UserIcon className="w-4 h-4" />
                                  </div>
                                <Input
                                  {...field}
                                  placeholder="John"
                                  className="pl-10 h-10 text-sm border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-900/50"
                                  disabled={signUpMutation.isPending}
                                />
                                </div>
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={signUpForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t("auth.lastName")}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    {...field}
                                    placeholder="Doe"
                                    className="h-10 text-sm border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-900/50"
                                    disabled={signUpMutation.isPending}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <FormField
                          control={signUpForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t("auth.email")}</FormLabel>
                              <FormControl>
                                <div className="relative group">
                                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                                    <Mail className="w-4 h-4" />
                                  </div>
                                  <Input
                                    {...field}
                                    type="email"
                                    placeholder={t("auth.emailPlaceholder")}
                                    className="pl-10 h-10 text-sm border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-900/50"
                                    disabled={signUpMutation.isPending}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={signUpForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t("auth.password")}</FormLabel>
                              <FormControl>
                                <div className="relative group">
                                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                                    <Lock className="w-4 h-4" />
                                  </div>
                                  <Input
                                    {...field}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="At least 6 characters"
                                    className="pl-10 pr-10 h-10 text-sm border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 bg-gray-50/50 dark:bg-gray-900/50"
                                    disabled={signUpMutation.isPending}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                  >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <GradientButton
                        type="submit"
                        className="w-full h-10 text-sm font-semibold mt-3 shadow-lg hover:shadow-xl transition-all duration-200"
                        disabled={signUpMutation.isPending}
                      >
                        {signUpMutation.isPending ? t("auth.signingUp") : t("auth.signUp")}
                      </GradientButton>

                      <div className="text-center mt-3">
                        <button
                          type="button"
                          onClick={flipCard}
                          className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          {t("auth.alreadyHaveAccount")} <span className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">{t("auth.signIn")}</span>
                        </button>
                      </div>

                      <div className="relative my-3">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-gray-200 dark:border-gray-700"></span>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white dark:bg-gray-950 px-2 text-gray-500 dark:text-gray-400">{t("auth.orTryWithoutAccount")}</span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full h-10 text-sm font-medium border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-200"
                        onClick={handleGuestMode}
                      >
                        <UserX className="w-4 h-4 mr-2" />
                        {t("auth.continueAsGuest")}
                      </Button>
                    </form>
                  </Form>
                </div>

                {/* Right Section - Sign Up Image */}
                <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 overflow-hidden hidden md:block">
                  {/* Animated gradient overlay */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                  </div>
                  
                  {/* Decorative elements */}
                  <div className="absolute inset-0">
                    <div className="absolute top-10 right-10 w-32 h-32 border-2 border-white/20 rounded-full"></div>
                    <div className="absolute bottom-20 left-10 w-24 h-24 border-2 border-white/20 rounded-full"></div>
                  </div>
                  
                  <div className="relative z-10 h-full flex items-center justify-center p-10">
                    <div className="relative group">
                      <div className="absolute -inset-4 bg-gradient-to-r from-indigo-400 to-pink-400 rounded-3xl blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                      <img
                        src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&h=800&fit=crop&q=80"
                        alt="Fashion shopping"
                        className="relative w-full max-w-md h-auto rounded-3xl shadow-2xl border-4 border-white/40 object-cover transform group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-40 h-40 bg-purple-300/40 rounded-full blur-3xl"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
