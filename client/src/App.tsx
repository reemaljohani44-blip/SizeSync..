import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import Landing from "@/pages/Landing";
import SignUp from "@/pages/SignUp";
import SignIn from "@/pages/SignIn";
import Welcome from "@/pages/Welcome";
import Dashboard from "@/pages/Dashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import ProfileCreation from "@/pages/ProfileCreation";
import ClothingSelection from "@/pages/ClothingSelection";
import FabricAndUpload from "@/pages/FabricAndUpload";
import Recommendations from "@/pages/Recommendations";
import DigitalWallet from "@/pages/DigitalWallet";
import History from "@/pages/History";
import GuestProfile from "@/pages/GuestProfile";
import GuestClothingSelection from "@/pages/GuestClothingSelection";
import GuestFabricUpload from "@/pages/GuestFabricUpload";
import GuestRecommendations from "@/pages/GuestRecommendations";
import NotFound from "@/pages/not-found";

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  "/",
  "/dashboard",
  "/admin",
  "/welcome",
  "/profile/create",
  "/clothing-selection",
  "/fabric-upload",
  "/recommendations",
  "/wallet",
  "/history",
];

function isProtectedRoute(path: string): boolean {
  return PROTECTED_ROUTES.some(route => {
    if (route === "/") {
      return path === "/";
    }
    return path.startsWith(route);
  }) || path.startsWith("/profile/edit/");
}

function Router() {
  const { i18n } = useTranslation();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location, setLocation] = useLocation();

  // Update document direction when language changes
  useEffect(() => {
    const currentLang = i18n.language || localStorage.getItem('i18nextLng') || 'en';
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
  }, [i18n.language]);

  // Role-based redirect logic
  useEffect(() => {
    // Wait for auth to finish loading
    if (isLoading) return;

    // If not authenticated, redirect to landing for protected routes
    if (!isAuthenticated) {
      if (isProtectedRoute(location) && location !== "/") {
        setLocation("/");
      }
      return;
    }

    // If authenticated, handle role-based routing
    if (user) {
      const userRole = user.role ? String(user.role).toLowerCase().trim() : '';
      const isAdmin = userRole === 'admin';
      const isUser = userRole === 'user';

      // Admin trying to access user routes - redirect to admin dashboard
      if (isAdmin && (location === "/" || location === "/dashboard")) {
        setLocation("/admin");
        return;
      }

      // Regular user trying to access admin routes - redirect to dashboard
      if (isUser && location === "/admin") {
        setLocation("/dashboard");
        return;
      }

      // If user is on root path, redirect based on role
      if (location === "/") {
        if (isAdmin) {
          setLocation("/admin");
        } else {
          setLocation("/dashboard");
        }
      }
    }
  }, [location, isAuthenticated, isLoading, user, setLocation]);

  // Prevent access to protected routes via browser back button
  useEffect(() => {
    const handlePopState = () => {
      if (!isLoading && !isAuthenticated && isProtectedRoute(window.location.pathname)) {
        if (window.location.pathname !== "/") {
          setLocation("/");
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    // Show loading state
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-purple-700 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes - always available */}
      <Route path="/signup" component={SignUp} />
      <Route path="/signin" component={SignIn} />
      
      {/* Guest routes - available without authentication */}
      <Route path="/guest/profile" component={GuestProfile} />
      <Route path="/guest/clothing-selection" component={GuestClothingSelection} />
      <Route path="/guest/fabric-upload" component={GuestFabricUpload} />
      <Route path="/guest/recommendations" component={GuestRecommendations} />
      
      {/* Conditional routes based on auth */}
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          {/* Admin routes */}
          <Route path="/admin" component={AdminDashboard} />
          
          {/* User routes */}
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/welcome" component={Welcome} />
          <Route path="/profile/create" component={ProfileCreation} />
          <Route path="/profile/edit/:id" component={ProfileCreation} />
          <Route path="/profile/edit" component={ProfileCreation} />
          <Route path="/clothing-selection" component={ClothingSelection} />
          <Route path="/fabric-upload" component={FabricAndUpload} />
          <Route path="/recommendations" component={Recommendations} />
          <Route path="/wallet" component={DigitalWallet} />
          <Route path="/history" component={History} />
          
          {/* Root path - will be redirected by useEffect */}
          <Route path="/" component={Dashboard} />
        </>
      )}
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
