import { useLocation } from "wouter";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AuthFlipper } from "@/components/AuthFlipper";

export default function SignIn() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-950 dark:via-indigo-950/30 dark:to-purple-950/30 overflow-hidden relative">
      {/* Enhanced Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-gradient-to-br from-indigo-400/20 via-purple-400/15 to-pink-400/20 rounded-full blur-3xl animate-pulse"
        />
        <div 
          className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-blue-400/20 via-indigo-400/15 to-purple-400/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/98 dark:bg-gray-950/98 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 shadow-lg">
        {/* Purple gradient accent bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        
        <div className="max-w-7xl mx-auto px-4 md:px-6 relative">
          <div className="flex items-center justify-between h-16 md:h-18">
            <div className="relative group">
              <h1
                className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 dark:from-white dark:via-indigo-200 dark:to-purple-200 bg-clip-text text-transparent cursor-pointer transition-all duration-200 group-hover:scale-105"
                onClick={() => setLocation("/")}
              >
                <span className="relative">
                  <span className="text-indigo-800 dark:text-indigo-200">Size</span>
                  <span className="text-purple-700 dark:text-purple-300">Sync</span>
                  {/* Glowing effect on hover */}
                  <span className="absolute inset-0 blur-xl opacity-0 group-hover:opacity-30 bg-gradient-to-r from-indigo-600 to-purple-600 transition-opacity duration-300 -z-10"></span>
                </span>
              </h1>
            </div>
            <div className="relative">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="h-screen pt-16 pb-4 px-4 md:px-6 relative flex items-center justify-center overflow-hidden">
        <AuthFlipper initialMode="signin" />
      </div>
    </div>
  );
}

