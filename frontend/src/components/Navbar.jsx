import { NavLink, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, LayoutDashboard, Upload, Video, Users, History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";

export default function Navbar() {
  const { t } = useTranslation();

  const navItems = [
    { to: "/", label: t("nav.dashboard"), icon: LayoutDashboard },
    { to: "/upload", label: t("nav.upload"), icon: Upload },
    { to: "/realtime", label: t("nav.realtime"), icon: Video },
    { to: "/students", label: t("nav.students"), icon: Users },
    { to: "/history", label: t("nav.history"), icon: History },
  ];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-40"
    >
      <div className="glass-strong border-b border-white/30 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-pink-500 grid place-items-center shadow-lg shadow-fuchsia-500/30 group-hover:scale-105 transition">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">Camstack</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "relative px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
                    isActive
                      ? "text-white bg-gradient-to-r from-indigo-500 to-fuchsia-500 shadow-md shadow-fuchsia-500/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/5"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex overflow-x-auto gap-1 px-3 pb-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "shrink-0 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5",
                  isActive
                    ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white"
                    : "text-muted-foreground hover:bg-white/40 dark:hover:bg-white/5"
                )
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </NavLink>
          ))}
        </div>
      </div>
    </motion.header>
  );
}
