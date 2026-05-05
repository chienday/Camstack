import { Moon, Sun, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "vi" : "en";
    i18n.changeLanguage(newLang);
    localStorage.setItem("language", newLang);
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="glass"
        size="icon"
        onClick={toggleLanguage}
        aria-label="Toggle language"
        className="rounded-full"
        title={i18n.language === "en" ? "Tiếng Việt" : "English"}
      >
        <motion.div
          key={i18n.language}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          <Globe className="h-5 w-5 text-green-500" />
        </motion.div>
      </Button>
      <Button
        variant="glass"
        size="icon"
        onClick={toggle}
        aria-label="Toggle theme"
        className="rounded-full"
      >
        <motion.div
          key={theme}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5 text-amber-400" />
          ) : (
            <Moon className="h-5 w-5 text-indigo-600" />
          )}
        </motion.div>
      </Button>
    </div>
  );
}
