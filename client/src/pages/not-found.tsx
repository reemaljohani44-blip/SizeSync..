import { useLocation } from "wouter";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <GlassCard className="p-8 md:p-12 max-w-md text-center relative">
        <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Page Not Found
        </h2>
        <p className="text-white/70 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <GradientButton onClick={() => setLocation("/")} data-testid="button-home">
          Go Home
        </GradientButton>
      </GlassCard>
    </div>
  );
}
