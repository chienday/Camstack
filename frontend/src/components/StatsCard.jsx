import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StatsCard({ icon: Icon, label, value, trend, gradient = "from-indigo-500 to-fuchsia-500", delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Card className="p-5 relative overflow-hidden group hover:shadow-2xl transition-shadow">
        <div className={cn("absolute -top-8 -right-8 h-28 w-28 rounded-full opacity-20 blur-2xl bg-gradient-to-br", gradient)} />
        <div className="flex items-start justify-between gap-4 relative">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {label}
            </p>
            <p className="mt-2 text-3xl font-bold gradient-text">{value}</p>
            {trend && (
              <p className="mt-1 text-xs text-muted-foreground">{trend}</p>
            )}
          </div>
          {Icon && (
            <div className={cn("h-11 w-11 rounded-xl grid place-items-center text-white shadow-lg bg-gradient-to-br", gradient)}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
