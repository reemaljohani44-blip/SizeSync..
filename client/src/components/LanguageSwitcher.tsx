import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    // Update document direction for RTL support
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
    // Save to localStorage
    localStorage.setItem('i18nextLng', lng);
  };

  // Set initial direction on mount
  useEffect(() => {
    const currentLang = i18n.language || localStorage.getItem('i18nextLng') || 'en';
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
  }, [i18n.language]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-2.5 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-950/50 dark:hover:to-purple-950/50 rounded-xl transition-all duration-300 group border border-transparent hover:border-indigo-200/50 dark:hover:border-indigo-800/50 hover:scale-110"
          data-testid="button-language"
        >
          <Globe className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300 group-hover:rotate-12" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white/98 dark:bg-gray-950/98 backdrop-blur-2xl border-2 border-gray-200/80 dark:border-gray-800/80 shadow-2xl rounded-xl p-2 mt-2">
        <DropdownMenuItem 
          data-testid="language-english"
          className="hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer rounded-lg px-3 py-2.5 transition-colors duration-200"
          onClick={() => changeLanguage('en')}
        >
          English
        </DropdownMenuItem>
        <DropdownMenuItem 
          data-testid="language-arabic"
          className="hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer rounded-lg px-3 py-2.5 transition-colors duration-200"
          onClick={() => changeLanguage('ar')}
        >
          العربية (Arabic)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
