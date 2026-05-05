import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Download, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/utils";

export default function AttendanceList({ attended = [], total = 0, onExport }) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b border-border/40">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-fuchsia-500" />
            Đã điểm danh
          </CardTitle>
          <Badge variant="success" className="text-sm">
            {attended.length}
            {total > 0 && ` / ${total}`}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[300px] max-h-[600px]">
        {attended.length === 0 ? (
          <div className="h-full min-h-[200px] grid place-items-center text-center text-muted-foreground">
            <div>
              <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Chưa có sinh viên nào điểm danh.</p>
              <p className="text-xs mt-1">Bắt đầu camera để nhận diện.</p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {attended.map((s, idx) => (
              <motion.div
                key={s.student_id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-white/70 to-white/40 dark:from-white/10 dark:to-white/5 border border-white/40 dark:border-white/10 shadow-sm hover:shadow-md transition"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 grid place-items-center text-xs font-bold text-white shadow">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {s.name || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {s.student_id} · {s.time ? formatTime(s.time) : ""}
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </CardContent>

      {onExport && attended.length > 0 && (
        <div className="p-3 border-t border-border/40">
          <Button variant="glass" className="w-full" onClick={onExport}>
            <Download className="h-4 w-4" /> Xuất Excel
          </Button>
        </div>
      )}
    </Card>
  );
}
