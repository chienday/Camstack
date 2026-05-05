import { motion } from "framer-motion";
import { CheckCircle2, Sparkles, ImageOff } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTime } from "@/lib/utils";

export default function ResultDisplay({ result, loading, mediaType = "image" }) {
  const detections = result?.detections || [];
  let media = result?.result_media; // base64 for image, URL for video

  // Build full video URL if it's a relative path
  if (media && mediaType === "video" && !media.startsWith("http") && !media.startsWith("data:")) {
    const apiBase = import.meta.env.VITE_API_URL || "";
    media = apiBase + media;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-fuchsia-500" />
            Detection Result
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="aspect-video rounded-xl bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/10 to-pink-500/10 grid place-items-center animate-pulse-soft">
              <p className="text-sm text-muted-foreground">Running inference...</p>
            </div>
          )}
          {!loading && !media && (
            <div className="aspect-video rounded-xl bg-white/40 dark:bg-white/5 grid place-items-center border border-dashed border-border">
              <div className="text-center text-muted-foreground">
                <ImageOff className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No result yet. Upload a file and start detection.</p>
              </div>
            </div>
          )}
          {!loading && media && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl overflow-hidden bg-black grid place-items-center"
            >
              {mediaType === "video" ? (
                <video
                  src={media}
                  controls
                  autoPlay
                  loop
                  className="w-full max-h-[60vh] object-contain"
                />
              ) : (
                <img
                  src={media.startsWith("data:") ? media : `data:image/jpeg;base64,${media}`}
                  alt="result"
                  className="w-full max-h-[60vh] object-contain"
                />
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Recognized Students
          </CardTitle>
          <Badge variant="success">{detections.length} detected</Badge>
        </CardHeader>
        <CardContent>
          {detections.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No students recognized yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MSSV</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detections.map((d, idx) => (
                  <motion.tr
                    key={`${d.student_id}-${idx}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="border-b border-border/60"
                  >
                    <TableCell className="font-mono font-semibold">
                      {d.student_id}
                    </TableCell>
                    <TableCell>{d.name || "Unknown"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={d.confidence >= 0.85 ? "success" : "warning"}
                      >
                        {(d.confidence * 100).toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {d.time ? formatTime(d.time) : formatTime(new Date())}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
