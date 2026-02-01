import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { Navbar } from "@/components/Navbar";
import { useTranslation } from "react-i18next";
import { 
  Ruler, 
  TrendingDown, 
  Shield, 
  ArrowRight, 
  Sparkles,
  CheckCircle2,
  Users,
  Star,
  Zap,
  Target,
  Award,
  Heart
} from "lucide-react";
import { useEffect, useState } from "react";

export default function Landing() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const features = [
    {
      icon: Ruler,
      title: t("landing.features.smartMeasurements"),
      description: t("landing.features.smartMeasurementsDesc"),
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: TrendingDown,
      title: t("landing.features.reduceReturns"),
      description: t("landing.features.reduceReturnsDesc"),
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Shield,
      title: t("landing.features.securePrivate"),
      description: t("landing.features.securePrivateDesc"),
      gradient: "from-green-500 to-emerald-500"
    }
  ];

  const stats = [
    { value: "95%", label: t("landing.stats.accuracyRate") },
    { value: "50%", label: t("landing.stats.fewerReturns") },
    { value: "10K+", label: t("landing.stats.happyUsers") }
  ];

  const benefits = [
    t("landing.benefits.aiMatching"),
    t("landing.benefits.anyBrand"),
    t("landing.benefits.instant"),
    t("landing.benefits.privacy")
  ];

  const handleGetStarted = () => {
    window.location.href = "/signup";
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Subtle Professional Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Single subtle gradient orb */}
        <div 
          className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-gradient-to-br from-indigo-500/5 via-purple-500/3 to-blue-500/5 rounded-full blur-3xl"
        />
        <div 
          className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-blue-500/5 via-indigo-500/3 to-purple-500/5 rounded-full blur-3xl"
        />
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99, 102, 241, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99, 102, 241, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Navigation */}
        <Navbar />
        
        {/* Hero Section */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-6 lg:p-8 pt-20 sm:pt-24 md:pt-28">
          <div className="max-w-4xl w-full text-center space-y-5 sm:space-y-6">
            <div className={`space-y-5 sm:space-y-6 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              {/* Professional Title */}
              <div className="relative">
                <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold tracking-tight text-gray-900 dark:text-white break-words leading-[1.1]">
                  {t("landing.heroTitle")}
                </h1>
              </div>
              
              <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-gray-800 dark:text-gray-200 font-bold tracking-tight break-words leading-tight">
                {t("landing.heroSubtitle")}
              </p>

              {/* Professional Badge */}
              <div className="inline-flex items-center justify-center gap-2.5 sm:gap-3 px-7 sm:px-9 md:px-10 py-3.5 sm:py-4 md:py-4.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border-2 border-indigo-300/70 dark:border-indigo-700/70 shadow-md hover:shadow-lg transition-all duration-200 max-w-full mt-2">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                <span className="text-base sm:text-lg md:text-xl font-bold text-indigo-800 dark:text-indigo-200 uppercase tracking-wider break-words leading-tight min-w-0">
                  {t("landing.poweredByAI")}
                </span>
              </div>
              
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-normal break-words">
                {t("landing.heroDescription")}
              </p>

              {/* Professional Benefits List */}
              <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 pt-6">
                {benefits.map((benefit, index) => (
                  <div 
                    key={index}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-md bg-green-50/80 dark:bg-green-950/20 border border-green-200/60 dark:border-green-800/40 hover:bg-green-100/80 dark:hover:bg-green-950/30 transition-colors duration-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
                    style={{ transitionDelay: `${index * 80}ms` }}
                  >
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span className="text-sm sm:text-base font-medium text-green-700 dark:text-green-300 break-words leading-tight">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                <GradientButton
                  onClick={handleGetStarted}
                  data-testid="button-get-started"
                  className="text-base sm:text-lg px-8 sm:px-10 py-3 sm:py-4 whitespace-nowrap"
                >
                  {t("landing.getStarted")} <ArrowRight className="ml-2 [dir='rtl']:ml-0 [dir='rtl']:mr-2 [dir='rtl']:rotate-180 w-5 h-5 flex-shrink-0" />
                </GradientButton>
                <GradientButton
                  variant="secondary"
                  onClick={() => window.location.href = "/signin"}
                  data-testid="button-signin"
                  className="text-base sm:text-lg px-8 sm:px-10 py-3 sm:py-4 whitespace-nowrap"
                >
                  {t("landing.signIn")}
                </GradientButton>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Section */}
        <div className="py-16 md:py-24 px-4 md:px-8 relative bg-gray-50 dark:bg-gray-900/50">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className={`bg-white dark:bg-gray-950 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-8 md:p-10 text-center ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-blue-600 dark:text-blue-500 mb-3 break-words leading-tight">
                    {stat.value}
                  </div>
                  <div className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 font-medium break-words leading-relaxed">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features Section - Enhanced Professional Design */}
        <div className="p-4 md:p-8 pb-20 md:pb-32 bg-gradient-to-b from-white via-gray-50/30 to-white dark:from-gray-950 dark:via-gray-900/30 dark:to-gray-950 relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-100/20 dark:bg-indigo-900/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-100/20 dark:bg-purple-900/10 rounded-full blur-3xl" />
          </div>

          <div className="max-w-7xl mx-auto relative z-10">
            <div className={`text-center mb-20 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '300ms' }}>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 dark:from-white dark:via-indigo-200 dark:to-purple-200 bg-clip-text text-transparent mb-6 tracking-tight break-words leading-tight">
                {t("landing.whyChoose")}
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto font-medium leading-relaxed break-words">
                {t("landing.whyChooseDesc")}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`group relative bg-white dark:bg-gray-900 rounded-3xl p-8 md:p-10 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100/50 dark:border-gray-800/50 hover:border-indigo-200 dark:hover:border-indigo-800/50 hover:-translate-y-2 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{ transitionDelay: `${(index + 4) * 100}ms` }}
                  data-testid={`card-feature-${index}`}
                >
                  {/* Subtle gradient overlay on hover */}
                  <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                  
                  <div className="flex flex-col items-center text-center space-y-6 relative z-10">
                    {/* Enhanced Icon with gradient background and glow effect */}
                    <div className={`relative w-24 h-24 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-500`}>
                      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-50 blur-xl group-hover:opacity-75 transition-opacity duration-500`} />
                      <feature.icon className="w-12 h-12 text-white relative z-10" strokeWidth={2.5} />
                    </div>
                    
                    {/* Title with enhanced typography */}
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300 break-words leading-tight">
                      {feature.title}
                    </h3>
                    
                    {/* Description with better readability */}
                    <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-sm font-normal break-words">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Testimonial/Trust Section - Professional Modern Design */}
        <div className="p-4 md:p-8 pb-16 md:pb-24 relative bg-gradient-to-b from-white via-gray-50/50 to-white dark:from-gray-950 dark:via-gray-900/50 dark:to-gray-950">
          <div className="max-w-5xl mx-auto">
            <div 
              className={`bg-white dark:bg-gray-900 rounded-3xl p-10 md:p-14 shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-100/50 dark:border-gray-800/50 relative overflow-hidden ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} 
              style={{ transitionDelay: '600ms' }}
            >
              {/* Decorative gradient accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              
              <div className="space-y-8 relative z-10">
                {/* Star Rating - Enhanced */}
                <div className="flex justify-center gap-2 mb-8">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className="w-7 h-7 fill-yellow-400 text-yellow-400 drop-shadow-sm"
                    />
                  ))}
                </div>
                
                {/* Testimonial Quote - Enhanced Typography */}
                <blockquote className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-white leading-relaxed max-w-4xl mx-auto text-center relative break-words">
                  <span className="absolute -left-4 -top-2 text-5xl sm:text-6xl text-indigo-200 dark:text-indigo-900/30 font-serif leading-none [dir='rtl']:left-auto [dir='rtl']:right-4">"</span>
                  <span className="relative z-10">
                    {t("landing.testimonial")}
                  </span>
                  <span className="absolute -right-4 -bottom-4 text-5xl sm:text-6xl text-indigo-200 dark:text-indigo-900/30 font-serif leading-none [dir='rtl']:right-auto [dir='rtl']:left-4">"</span>
                </blockquote>
                
                {/* Author Information - Enhanced Design */}
                <div className="flex items-center justify-center gap-5 pt-8 border-t border-gray-100 dark:border-gray-800">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg ring-4 ring-indigo-100 dark:ring-indigo-900/30">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    {/* Verified badge */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-md">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-left [dir='rtl']:text-right">
                    <div className="font-bold text-lg sm:text-xl text-gray-900 dark:text-white mb-1 break-words leading-tight">{t("landing.testimonialAuthor")}</div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 font-medium break-words">
                      <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                      <span>{t("landing.verifiedCustomer")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Final CTA Section */}
        <div className="p-4 md:p-8 pb-20 md:pb-32 relative">
          <div className="max-w-5xl mx-auto text-center space-y-10">
            <div className={`space-y-5 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '700ms' }}>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground break-words leading-tight">
                {t("landing.readyToFind")}
              </h2>
              
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed break-words">
                {t("landing.readyToFindDesc")}
              </p>
              
              <div className="pt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
                <GradientButton
                  onClick={handleGetStarted}
                  className="text-base sm:text-lg px-8 sm:px-10 py-3 sm:py-4 whitespace-nowrap"
                >
                  {t("landing.startJourney")} 
                  <ArrowRight className="w-5 h-5 ml-2 [dir='rtl']:ml-0 [dir='rtl']:mr-2 [dir='rtl']:rotate-180 flex-shrink-0" />
                </GradientButton>
                
                <GradientButton
                  variant="secondary"
                  onClick={() => window.location.href = "/signin"}
                  className="text-base sm:text-lg px-8 sm:px-10 py-3 sm:py-4 whitespace-nowrap"
                >
                  {t("landing.signIn")}
                </GradientButton>
              </div>
              
              {/* Trust indicators */}
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-8 text-xs sm:text-sm md:text-base text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
                  <span className="break-words">{t("landing.securePrivate")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
                  <span className="break-words">{t("landing.instantResults")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
                  <span className="break-words">{t("landing.trustedUsers")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
