import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { motion } from "framer-motion";
import { Camera, Play, Square, Wifi, WifiOff, Gauge } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const VIDEO_CONSTRAINTS = {
  width: 960,
  height: 540,
  facingMode: "user",
};

/**
 * RealtimeCamera
 * Captures frames from webcam and streams them to a provided sendFrame(base64) function.
 * Displays the processed frame (returned by backend) overlaying the live feed when available.
 *
 * Props:
 *  - active: boolean                -> whether streaming is on
 *  - onToggle: () => void           -> start/stop handler
 *  - wsStatus: "open"|"closed"|...  -> connection indicator
 *  - processedFrame: string|null    -> base64 image (data URI or raw) from backend
 *  - fps: number                    -> display FPS
 *  - sendFrame: (dataUrl: string) => void
 *  - captureIntervalMs: number      -> interval for capture, default 300ms (~3 FPS)
 */
export default function RealtimeCamera({
  active,
  onToggle,
  wsStatus = "closed",
  processedFrame,
  fps = 0,
  sendFrame,
  captureIntervalMs = 300,
}) {
  const webcamRef = useRef(null);
  const intervalRef = useRef(null);
  const [ready, setReady] = useState(false);

  const capture = useCallback(() => {
    if (!webcamRef.current) return;
    const dataUrl = webcamRef.current.getScreenshot();
    if (dataUrl && sendFrame) sendFrame(dataUrl);
  }, [sendFrame]);

  useEffect(() => {
    if (active && ready) {
      intervalRef.current = setInterval(capture, captureIntervalMs);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, ready, capture, captureIntervalMs]);

  const statusColor =
    wsStatus === "open"
      ? "bg-emerald-500"
      : wsStatus === "connecting"
      ? "bg-amber-500"
      : "bg-rose-500";

  const displayedSrc = processedFrame
    ? processedFrame.startsWith("data:")
      ? processedFrame
      : `data:image/jpeg;base64,${processedFrame}`
    : null;

  return (
    <Card className="overflow-hidden">
      <div className="relative">
        {/* Live webcam (hidden behind processed frame when available) */}
        <div className="relative bg-black aspect-video grid place-items-center">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.7}
            videoConstraints={VIDEO_CONSTRAINTS}
            onUserMedia={() => setReady(true)}
            onUserMediaError={() => setReady(false)}
            className={cn(
              "w-full h-full object-contain",
              displayedSrc && active ? "invisible absolute inset-0" : "visible"
            )}
          />
          {displayedSrc && active && (
            <img
              src={displayedSrc}
              alt="processed"
              className="w-full h-full object-contain"
            />
          )}
          {!ready && (
            <div className="absolute inset-0 grid place-items-center bg-black/70 text-white text-sm">
              <div className="text-center">
                <Camera className="h-10 w-10 mx-auto mb-2 opacity-70" />
                <p>Waiting for camera permission…</p>
              </div>
            </div>
          )}

          {/* Top-left overlays */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <Badge
              className={cn(
                "backdrop-blur-md border-0 text-white shadow",
                active ? "bg-rose-500/80" : "bg-zinc-600/70"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full mr-1.5",
                  active ? "bg-white animate-pulse" : "bg-white/60"
                )}
              />
              {active ? "LIVE" : "IDLE"}
            </Badge>
            <Badge className="backdrop-blur-md bg-black/40 border-0 text-white shadow">
              <Gauge className="h-3 w-3 mr-1" /> {fps.toFixed(1)} FPS
            </Badge>
          </div>

          {/* Top-right overlay */}
          <div className="absolute top-3 right-3">
            <Badge className="backdrop-blur-md bg-black/40 border-0 text-white shadow">
              <span className={cn("h-2 w-2 rounded-full mr-1.5", statusColor)} />
              {wsStatus === "open" ? (
                <Wifi className="h-3 w-3 mr-1" />
              ) : (
                <WifiOff className="h-3 w-3 mr-1" />
              )}
              {wsStatus}
            </Badge>
          </div>
        </div>

        {/* Control bar */}
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="text-xs text-muted-foreground">
            Model: <span className="font-mono">best.pt</span>
          </div>
          <button
            onClick={onToggle}
            className={cn(
              "inline-flex items-center gap-2 px-5 h-10 rounded-xl text-sm font-semibold transition-all shadow-lg",
              active
                ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30"
                : "bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-pink-500 text-white shadow-fuchsia-500/30 hover:scale-[1.02]"
            )}
          >
            {active ? (
              <>
                <Square className="h-4 w-4" /> Stop
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> Start
              </>
            )}
          </button>
        </CardContent>
      </div>
    </Card>
  );
}
