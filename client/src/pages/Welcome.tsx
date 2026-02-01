import { useLocation } from "wouter";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { Navbar } from "@/components/Navbar";
import { Ruler, TrendingDown, Shield, ArrowRight } from "lucide-react";

export default function Welcome() {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: Ruler,
      title: "Accurate Measurements",
      description:
        "Compare your body measurements with product size charts using AI analysis for perfect fit recommendations",
    },
    {
      icon: TrendingDown,
      title: "Reduce Returns by 70%",
      description:
        "Make confident purchase decisions and avoid the hassle of returning ill-fitting clothes",
    },
    {
      icon: Shield,
      title: "Privacy Respected",
      description:
        "Your measurements are stored securely and never shared without your permission",
    },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <div className="pt-32 pb-12 md:pt-40 md:pb-16 px-4 md:px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-6 md:space-y-8">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Find Your Perfect Size
              <br />
              <span className="text-foreground">Every Single Time</span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Say goodbye to size uncertainty. Our AI-powered platform compares
              your measurements with product size charts to recommend the
              perfect fit.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <GradientButton
                onClick={() => setLocation("/dashboard")}
                data-testid="button-get-started"
              >
                Get Started <ArrowRight className="inline-block ml-2 w-5 h-5" />
              </GradientButton>
              <GradientButton
                variant="secondary"
                onClick={() => setLocation("/dashboard")}
                data-testid="button-view-demo"
              >
                View Demo
              </GradientButton>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 md:py-16 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
            Why Choose SizeSync?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {features.map((feature, index) => (
              <GlassCard
                key={index}
                className="p-6 md:p-8 hover:-translate-y-1 transition-all duration-200 hover:shadow-2xl"
                data-testid={`card-feature-${index}`}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <h4 className="text-xl font-semibold text-foreground">
                    {feature.title}
                  </h4>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-12 md:py-16 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <GlassCard className="p-8 md:p-12 text-center">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Ready to Shop with Confidence?
            </h3>
            <p className="text-muted-foreground mb-6">
              Create your digital measurement profile in just 2 minutes
            </p>
            <GradientButton
              onClick={() => setLocation("/dashboard")}
              data-testid="button-create-profile"
            >
              Create Your Profile
            </GradientButton>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
